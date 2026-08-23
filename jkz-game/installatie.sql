-- ════════════════════════════════════════════════════════════════════
-- JKZ Jaarverslag Game — database-installatie
-- Plak dit bestand ÉÉN KEER in phpMyAdmin (tabblad SQL) en klik Start.
-- Hoe je daar komt staat stap voor stap in LEESMIJ.md.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS spelers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  naam VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  aangemaakt_op DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  speler_id INT NOT NULL,
  spel TINYINT NOT NULL,              -- 1 t/m 7
  poging SMALLINT NOT NULL,           -- 1, 2, 3, ... (onbeperkt spelen)
  score SMALLINT NOT NULL,            -- 0 t/m 100
  ruwe_waarde VARCHAR(80) NOT NULL,
  gespeeld_op DATETIME NOT NULL,
  UNIQUE KEY uniek (speler_id, spel, poging),
  KEY idx_speler (speler_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS instellingen (
  sleutel VARCHAR(40) PRIMARY KEY,
  waarde VARCHAR(200) NOT NULL       -- ruim genoeg voor een Tikkie-link
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bonuspunten uit de clubkas-Tikkie (1 euro = 1 punt, decimalen mogen)
CREATE TABLE IF NOT EXISTS bonuspunten (
  speler_id INT PRIMARY KEY,
  punten DECIMAL(6,2) NOT NULL,
  toegekend_op DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Standaardinstellingen: spel open, testmodus uit
INSERT INTO instellingen (sleutel, waarde) VALUES ('spel_open', '1')
  ON DUPLICATE KEY UPDATE sleutel = sleutel;
INSERT INTO instellingen (sleutel, waarde) VALUES ('testmodus', '0')
  ON DUPLICATE KEY UPDATE sleutel = sleutel;
