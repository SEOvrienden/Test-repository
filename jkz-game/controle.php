<?php
// ════════════════════════════════════════════════════════════════════
// JKZ Jaarverslag Game — zelfcontrole
// Open deze pagina in je browser: jaarverslag.jkz.nl/controle.php
// Hij vertelt in gewone taal of alles goed staat, en zo niet: wat je
// moet doen. Deze pagina kan niets kapotmaken en toont geen wachtwoorden.
// ════════════════════════════════════════════════════════════════════

$stappen = [];

function stap(string $naam, bool $ok, string $uitleg) {
    global $stappen;
    $stappen[] = ['naam' => $naam, 'ok' => $ok, 'uitleg' => $uitleg];
    return $ok;
}

// ── 1. PHP-versie ─────────────────────────────────────────────────────
stap('PHP werkt', true, 'Versie ' . PHP_VERSION . ' — prima.');

// ── 2. config.php aanwezig? ──────────────────────────────────────────
$configOk = false;
if (!file_exists(__DIR__ . '/config.php')) {
    stap('config.php aanwezig', false,
        'Het bestand config.php staat NIET op de server. Open config.voorbeeld.php '
      . 'in Kladblok, vul je databasegegevens in, sla het op als config.php en '
      . 'upload het met FileZilla naar dezelfde map als api.php. (LEESMIJ, stap 3)');
} else {
    require __DIR__ . '/config.php';
    // Staan er nog voorbeeldwaarden in?
    $placeholders = [];
    if (defined('DB_NAAM')       && str_starts_with((string) DB_NAAM, 'HIER_'))       $placeholders[] = 'DB_NAAM';
    if (defined('DB_GEBRUIKER')  && str_starts_with((string) DB_GEBRUIKER, 'HIER_'))  $placeholders[] = 'DB_GEBRUIKER';
    if (defined('DB_WACHTWOORD') && str_starts_with((string) DB_WACHTWOORD, 'HIER_')) $placeholders[] = 'DB_WACHTWOORD';
    if (defined('ADMIN_SLEUTEL') && str_starts_with((string) ADMIN_SLEUTEL, 'VERZIN_')) $placeholders[] = 'ADMIN_SLEUTEL';

    if (!defined('DB_DSN')) {
        stap('config.php ingevuld', false,
            'config.php staat er, maar mist de regel met DB_DSN. Begin opnieuw '
          . 'vanaf config.voorbeeld.php en pas ALLEEN de teksten tussen de '
          . 'aanhalingstekens aan.');
    } elseif ($placeholders) {
        stap('config.php ingevuld', false,
            'config.php staat op de server, maar deze velden zijn nog niet ingevuld: '
          . implode(', ', $placeholders) . '. Open het bestand in Kladblok, vul de '
          . 'echte waarden in (Cloudways → Access Details → MySQL Access) en upload opnieuw.');
    } else {
        $configOk = stap('config.php ingevuld', true, 'Het bestand staat er en alle velden zijn ingevuld.');
    }
}

// ── 3. Databaseverbinding ────────────────────────────────────────────
$db = null;
if ($configOk) {
    try {
        $db = new PDO(DB_DSN, defined('DB_GEBRUIKER') ? DB_GEBRUIKER : null,
                      defined('DB_WACHTWOORD') ? DB_WACHTWOORD : null,
                      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        stap('Verbinding met de database', true, 'De databasegegevens kloppen.');
    } catch (PDOException $e) {
        stap('Verbinding met de database', false,
            'Verbinden lukt niet. Meestal betekent dit dat DB_NAAM, DB_GEBRUIKER of '
          . 'DB_WACHTWOORD in config.php niet precies overeenkomen met wat er in '
          . 'Cloudways bij MySQL Access staat. Kopieer ze letterlijk (let op '
          . 'hoofdletters) en upload config.php opnieuw.');
    }
}

// ── 4. Tabellen aanwezig? ────────────────────────────────────────────
if ($db) {
    $nodig = ['spelers', 'scores', 'instellingen'];
    $missend = [];
    foreach ($nodig as $tabel) {
        try {
            $db->query("SELECT 1 FROM `$tabel` LIMIT 1");
        } catch (PDOException $e) {
            $missend[] = $tabel;
        }
    }
    if ($missend) {
        stap('Databasetabellen', false,
            'Deze tabellen ontbreken nog: ' . implode(', ', $missend) . '. '
          . 'Open de databasebeheerder in Cloudways (MySQL Access → Launch Database '
          . 'Manager), klik links op "SQL opdracht", plak daar de volledige inhoud '
          . 'van installatie.sql en klik op Uitvoeren. (LEESMIJ, stap 2)');
    } else {
        stap('Databasetabellen', true, 'De tabellen spelers, scores en instellingen staan klaar.');

        // ── 5. Teller ter info ────────────────────────────────────────
        try {
            $aantal = (int) $db->query('SELECT COUNT(*) FROM spelers')->fetchColumn();
            $open   = $db->query("SELECT waarde FROM instellingen WHERE sleutel = 'spel_open'")->fetchColumn();
            stap('Spel klaar voor gebruik', true,
                "Er zijn nu $aantal spelers geregistreerd. Het spel staat "
              . ($open === '0' ? 'DICHT (open het via admin.html)' : 'open') . '.');
        } catch (PDOException $e) {
            stap('Spel klaar voor gebruik', false, 'De tabellen zijn er, maar uitlezen lukte niet: probeer installatie.sql nogmaals.');
        }
    }
}

$allesOk = !in_array(false, array_column($stappen, 'ok'), true);
?><!doctype html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JKZ — Zelfcontrole</title>
  <style>
    body { background:#0f241a; color:#fff; font-family:system-ui,-apple-system,sans-serif;
           margin:0; padding:1.5rem 1rem; line-height:1.5; }
    .kader { max-width:560px; margin:0 auto; }
    h1 { color:#ccab37; font-family:'Courier New',monospace; font-size:1.5rem; }
    .stap { background:#204634; border:1px solid rgba(204,171,55,0.25); border-radius:10px;
            padding:0.9rem 1rem; margin-bottom:0.7rem; }
    .stap.fout { border-color:#d4541a; }
    .kop { font-weight:bold; margin-bottom:0.25rem; }
    .uitleg { font-size:0.9rem; color:#c9d6cf; }
    .balk { border-radius:10px; padding:1rem; margin:1rem 0; font-weight:bold; text-align:center; }
    .balk.goed { background:rgba(39,174,96,0.2); border:1px solid #27ae60; }
    .balk.slecht { background:rgba(212,84,26,0.2); border:1px solid #d4541a; }
    a { color:#ccab37; }
  </style>
</head>
<body>
<div class="kader">
  <h1>JKZ — Zelfcontrole</h1>

  <?php if ($allesOk): ?>
    <div class="balk goed">✅ Alles staat goed! Het spel werkt.<br>
    <a href="index.html">→ Naar het spel</a></div>
  <?php else: ?>
    <div class="balk slecht">⚠️ Nog niet alles staat goed.<br>
    Kijk hieronder bij het eerste rode blok wat je moet doen.</div>
  <?php endif; ?>

  <?php foreach ($stappen as $s): ?>
    <div class="stap <?= $s['ok'] ? '' : 'fout' ?>">
      <div class="kop"><?= $s['ok'] ? '✅' : '❌' ?> <?= htmlspecialchars($s['naam']) ?></div>
      <div class="uitleg"><?= htmlspecialchars($s['uitleg']) ?></div>
    </div>
  <?php endforeach; ?>

  <p class="uitleg" style="margin-top:1.5rem;">Ververs deze pagina na elke
  aanpassing om opnieuw te controleren. Als alles groen is, kun je deze
  pagina vergeten.</p>
</div>
</body>
</html>
