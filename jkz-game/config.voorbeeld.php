<?php
// ════════════════════════════════════════════════════════════════════
// JKZ Jaarverslag Game — configuratie (VOORBEELD)
//
// WAT JE DOET (staat ook in LEESMIJ.md):
// 1. Maak een kopie van dit bestand en noem die:  config.php
// 2. Vul hieronder de vier waarden in (vind je in Cloudways bij je
//    applicatie onder "Access Details" → "MySQL Access").
// 3. Verzin zelf een lange adminsleutel (letters en cijfers).
// 4. Upload alleen config.php naar de server, naast api.php.
//
// Bij updates van het spel upload je config.php NIET opnieuw —
// jouw ingevulde versie blijft dan gewoon staan.
// ════════════════════════════════════════════════════════════════════

// Databasegegevens uit Cloudways (Access Details → MySQL Access):
define('DB_NAAM',       'HIER_DE_DATABASE_NAAM');
define('DB_GEBRUIKER',  'HIER_DE_GEBRUIKERSNAAM');
define('DB_WACHTWOORD', 'HIER_HET_WACHTWOORD');
define('DB_HOST',       'localhost'); // bij Cloudways vrijwel altijd localhost

// Verzin zelf een geheime sleutel voor de beheerpagina.
// Je gebruikt hem zo: jaarverslag.jkz.nl/admin.html?key=JOUWSLEUTEL
define('ADMIN_SLEUTEL', 'VERZIN_HIER_ZELF_IETS_GEHEIMS');

// Niet aanpassen (verbindingsregel voor de database):
define('DB_DSN', 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAAM . ';charset=utf8mb4');
