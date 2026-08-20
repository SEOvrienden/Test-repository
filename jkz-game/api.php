<?php
// ════════════════════════════════════════════════════════════════════
// JKZ Jaarverslag Game — server-API (fase 2)
// Alle lees- en schrijfacties op de database lopen via dit ene bestand.
// JSON in, JSON uit. Uitsluitend PDO met prepared statements.
// ════════════════════════════════════════════════════════════════════

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function antwoord(array $data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fout(string $melding, int $status = 400) {
    antwoord(['ok' => false, 'fout' => $melding], $status);
}

// ── Config laden ──────────────────────────────────────────────────────
if (!file_exists(__DIR__ . '/config.php')) {
    fout('De database is nog niet ingesteld: config.php ontbreekt op de server. '
       . 'Volg de stappen in LEESMIJ.md.', 500);
}
require __DIR__ . '/config.php';

// ── Rate limit: max 300 verzoeken per minuut per IP ───────────────────
// Bewust ruim: op de jaarvergadering zitten alle leden op dezelfde wifi
// (= hetzelfde IP), en alleen al de ranglijst ververst elke 15 seconden.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'onbekend';
$rlBestand = sys_get_temp_dir() . '/jkz_rl_' . md5($ip) . '_' . date('YmdHi');
$teller = (int) @file_get_contents($rlBestand);
if ($teller >= 300) {
    fout('Te veel verzoeken. Wacht heel even en probeer het opnieuw.', 429);
}
@file_put_contents($rlBestand, (string) ($teller + 1));
// Oude tellerbestanden af en toe opruimen (1% van de verzoeken)
if (random_int(1, 100) === 1) {
    foreach (glob(sys_get_temp_dir() . '/jkz_rl_*') ?: [] as $oud) {
        if (filemtime($oud) < time() - 300) @unlink($oud);
    }
}

// ── Database verbinden ────────────────────────────────────────────────
try {
    $db = new PDO(DB_DSN, defined('DB_GEBRUIKER') ? DB_GEBRUIKER : null,
                  defined('DB_WACHTWOORD') ? DB_WACHTWOORD : null, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    fout('Kan geen verbinding maken met de database. Controleer de gegevens in config.php.', 500);
}

// ── Invoer lezen (JSON-body of query-parameters) ──────────────────────
$invoer = [];
$body = file_get_contents('php://input');
if ($body !== '' && $body !== false) {
    $json = json_decode($body, true);
    if (is_array($json)) $invoer = $json;
}
$invoer = array_merge($_GET, $invoer);
$actie = (string) ($invoer['actie'] ?? '');

function eis_admin(array $invoer): void {
    $sleutel = (string) ($invoer['sleutel'] ?? '');
    if ($sleutel === '' || !hash_equals(ADMIN_SLEUTEL, $sleutel)) {
        fout('Geen toegang: verkeerde sleutel.', 403);
    }
}

function naar_slug(string $naam): string {
    $s = strtolower(trim($naam));
    $s = preg_replace('/\s+/', '-', $s);
    $s = preg_replace('/[^a-z0-9-]/', '', $s);
    return $s;
}

$nu = date('Y-m-d H:i:s');

try {
switch ($actie) {

// ── Speler registreren (of bestaande speler terugvinden) ─────────────
case 'registreerSpeler': {
    $naam = trim(preg_replace('/\s+/', ' ', (string) ($invoer['naam'] ?? '')));
    if (mb_strlen($naam) < 2 || mb_strlen($naam) > 80) {
        fout('Vul een naam in van 2 tot 80 tekens.');
    }
    $slug = naar_slug($naam);
    if ($slug === '') fout('Gebruik letters of cijfers in je naam.');

    $q = $db->prepare('SELECT id, naam FROM spelers WHERE slug = ?');
    $q->execute([$slug]);
    if ($rij = $q->fetch()) {
        antwoord(['ok' => true, 'spelerId' => (string) $rij['id'], 'naam' => $rij['naam']]);
    }
    $q = $db->prepare('INSERT INTO spelers (naam, slug, aangemaakt_op) VALUES (?, ?, ?)');
    $q->execute([$naam, $slug, $nu]);
    antwoord(['ok' => true, 'spelerId' => (string) $db->lastInsertId(), 'naam' => $naam]);
}

// ── Voortgang van één speler ──────────────────────────────────────────
case 'haalVoortgang': {
    $spelerId = (int) ($invoer['spelerId'] ?? 0);
    if ($spelerId <= 0) fout('Ongeldige speler.');

    $q = $db->prepare('SELECT spel, poging, score, ruwe_waarde, gespeeld_op
                       FROM scores WHERE speler_id = ? ORDER BY spel, poging');
    $q->execute([$spelerId]);

    $perSpel = [];
    foreach ($q->fetchAll() as $r) {
        $perSpel[(int) $r['spel']][] = $r;
    }
    $hoogsteGespeeld = $perSpel ? max(array_keys($perSpel)) : 0;

    $scores = [];
    foreach ($perSpel as $spel => $pogingen) {
        $beste = null;
        foreach ($pogingen as $p) {
            if ($beste === null || (int) $p['score'] > (int) $beste['score']) $beste = $p;
        }
        $scores[] = [
            'spel'        => $spel,
            'score'       => (int) $beste['score'],
            'ruwe_waarde' => $beste['ruwe_waarde'],
            'pogingen'    => array_map(fn($p) => [
                'poging'      => (int) $p['poging'],
                'score'       => (int) $p['score'],
                'ruwe_waarde' => $p['ruwe_waarde'],
                'gespeeld_op' => $p['gespeeld_op'],
            ], $pogingen),
        ];
    }
    antwoord(['ok' => true, 'level' => $hoogsteGespeeld + 1, 'scores' => $scores]);
}

// ── Score opslaan ─────────────────────────────────────────────────────
case 'slaScoreOp': {
    $spelerId = (int) ($invoer['spelerId'] ?? 0);
    $spel     = (int) ($invoer['spel'] ?? 0);
    $score    = (int) ($invoer['score'] ?? -1);
    $poging   = (int) ($invoer['poging'] ?? 0);
    $ruwe     = mb_substr(trim((string) ($invoer['ruweWaarde'] ?? '')), 0, 80);

    if ($spelerId <= 0)                    fout('Ongeldige speler.');
    if ($spel < 1 || $spel > 7)            fout('Ongeldig spelnummer.');
    if ($score < 0 || $score > 100)        fout('Ongeldige score.');
    if ($poging < 1 || $poging > 999)      fout('Ongeldige poging.');

    // Bestaat de speler?
    $q = $db->prepare('SELECT id FROM spelers WHERE id = ?');
    $q->execute([$spelerId]);
    if (!$q->fetch()) fout('Speler onbekend. Kies opnieuw je naam op het startscherm.');

    // Zelfde (speler, spel, poging) → bijwerken, anders toevoegen
    $q = $db->prepare('UPDATE scores SET score = ?, ruwe_waarde = ?, gespeeld_op = ?
                       WHERE speler_id = ? AND spel = ? AND poging = ?');
    $q->execute([$score, $ruwe, $nu, $spelerId, $spel, $poging]);
    if ($q->rowCount() === 0) {
        try {
            $q = $db->prepare('INSERT INTO scores (speler_id, spel, poging, score, ruwe_waarde, gespeeld_op)
                               VALUES (?, ?, ?, ?, ?, ?)');
            $q->execute([$spelerId, $spel, $poging, $score, $ruwe, $nu]);
        } catch (PDOException $e) {
            // Race: iemand anders was ons net voor — dan alsnog bijwerken
            $q = $db->prepare('UPDATE scores SET score = ?, ruwe_waarde = ?, gespeeld_op = ?
                               WHERE speler_id = ? AND spel = ? AND poging = ?');
            $q->execute([$score, $ruwe, $nu, $spelerId, $spel, $poging]);
        }
    }
    antwoord(['ok' => true]);
}

// ── Ranglijst (voor iedereen zichtbaar) ───────────────────────────────
case 'haalRanglijst': {
    $spelers = $db->query('SELECT id, naam FROM spelers')->fetchAll();
    $q = $db->query('SELECT speler_id, spel, MAX(score) AS beste
                     FROM scores GROUP BY speler_id, spel');
    $beste = [];
    foreach ($q->fetchAll() as $r) {
        $beste[(int) $r['speler_id']][(int) $r['spel']] = (int) $r['beste'];
    }
    $uit = [];
    foreach ($spelers as $s) {
        $scores = $beste[(int) $s['id']] ?? [];
        $uit[] = [
            'spelerId' => (string) $s['id'],
            'naam'     => $s['naam'],
            'scores'   => $scores ? $scores : new stdClass(),
            'totaal'   => array_sum($scores),
        ];
    }
    usort($uit, fn($a, $b) => $b['totaal'] <=> $a['totaal']);
    antwoord(['ok' => true, 'ranglijst' => $uit]);
}

// ── Spelstatus (open/dicht + testmodus) ───────────────────────────────
case 'haalSpelStatus': {
    $q = $db->query('SELECT sleutel, waarde FROM instellingen');
    $inst = [];
    foreach ($q->fetchAll() as $r) $inst[$r['sleutel']] = $r['waarde'];
    antwoord([
        'ok'        => true,
        'open'      => ($inst['spel_open'] ?? '1') === '1',
        'testmodus' => ($inst['testmodus'] ?? '0') === '1',
    ]);
}

// ── Beheer: spel open/dicht ───────────────────────────────────────────
case 'zetSpelStatus': {
    eis_admin($invoer);
    zet_instelling($db, 'spel_open', !empty($invoer['open']) ? '1' : '0');
    antwoord(['ok' => true]);
}

// ── Beheer: testmodus aan/uit ─────────────────────────────────────────
case 'zetTestmodus': {
    eis_admin($invoer);
    zet_instelling($db, 'testmodus', !empty($invoer['testmodus']) ? '1' : '0');
    antwoord(['ok' => true]);
}

// ── Beheer: één speler wissen ─────────────────────────────────────────
case 'resetSpeler': {
    eis_admin($invoer);
    $spelerId = (int) ($invoer['spelerId'] ?? 0);
    if ($spelerId <= 0) fout('Ongeldige speler.');
    $db->prepare('DELETE FROM scores WHERE speler_id = ?')->execute([$spelerId]);
    $db->prepare('DELETE FROM spelers WHERE id = ?')->execute([$spelerId]);
    antwoord(['ok' => true]);
}

// ── Beheer: alles op nul ──────────────────────────────────────────────
case 'resetAlles': {
    eis_admin($invoer);
    $db->exec('DELETE FROM scores');
    $db->exec('DELETE FROM spelers');
    antwoord(['ok' => true]);
}

// ── Beheer: overzicht van alle spelers met voortgang ──────────────────
case 'spelersOverzicht': {
    eis_admin($invoer);
    $spelers = $db->query('SELECT id, naam, aangemaakt_op FROM spelers ORDER BY naam')->fetchAll();
    $q = $db->query('SELECT speler_id, spel, MAX(score) AS beste, MAX(gespeeld_op) AS laatst
                     FROM scores GROUP BY speler_id, spel');
    $per = [];
    foreach ($q->fetchAll() as $r) {
        $sid = (int) $r['speler_id'];
        $per[$sid]['scores'][(int) $r['spel']] = (int) $r['beste'];
        $per[$sid]['laatst'] = max($per[$sid]['laatst'] ?? '', $r['laatst']);
    }
    $uit = [];
    foreach ($spelers as $s) {
        $sid = (int) $s['id'];
        $scores = $per[$sid]['scores'] ?? [];
        $uit[] = [
            'id'            => (string) $sid,
            'naam'          => $s['naam'],
            'level'         => ($scores ? max(array_keys($scores)) : 0) + 1,
            'gespeeld'      => count($scores),
            'totaal'        => array_sum($scores),
            'laatste_actie' => $per[$sid]['laatst'] ?? $s['aangemaakt_op'],
        ];
    }
    antwoord(['ok' => true, 'spelers' => $uit]);
}

default:
    fout('Onbekende actie.', 404);
}
} catch (PDOException $e) {
    // Meestal: de tabellen zijn nog niet aangemaakt met installatie.sql
    fout('Databaseprobleem: waarschijnlijk zijn de tabellen nog niet aangemaakt. '
       . 'Open controle.php in je browser — die vertelt precies wat er mist.', 500);
}

// ── Hulpfunctie: instelling opslaan (werkt op MySQL én SQLite) ────────
function zet_instelling(PDO $db, string $sleutel, string $waarde): void {
    $q = $db->prepare('UPDATE instellingen SET waarde = ? WHERE sleutel = ?');
    $q->execute([$waarde, $sleutel]);
    if ($q->rowCount() === 0) {
        try {
            $db->prepare('INSERT INTO instellingen (sleutel, waarde) VALUES (?, ?)')
               ->execute([$sleutel, $waarde]);
        } catch (PDOException $e) { /* bestond al */ }
    }
}
