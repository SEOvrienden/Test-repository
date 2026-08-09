// Adapterlaag — fase 1: alles via localStorage
// In fase 2 vervang je ALLEEN dit bestand door fetch-aanroepen naar api.php
// Interface is bewust identiek aan de server-API

const SLEUTEL_SPELERS = 'jkz_spelers';
const SLEUTEL_SCORES  = 'jkz_scores';
const SLEUTEL_CONFIG  = 'jkz_config';
const SLEUTEL_WACHTRIJ = 'jkz_wachtrij';

function laad(sleutel, standaard) {
  try {
    const raw = localStorage.getItem(sleutel);
    return raw ? JSON.parse(raw) : standaard;
  } catch { return standaard; }
}

function sla(sleutel, waarde) {
  localStorage.setItem(sleutel, JSON.stringify(waarde));
}

function naarSlug(naam) {
  return naam.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Spelers ──────────────────────────────────────────────────────────────────

export async function registreerSpeler(naam) {
  const spelers = laad(SLEUTEL_SPELERS, []);
  const slug = naarSlug(naam);

  const bestaand = spelers.find(s => s.slug === slug);
  if (bestaand) return { spelerId: String(bestaand.id), naam: bestaand.naam };

  const id = String(Date.now());
  const nieuw = { id, naam: naam.trim(), slug, aangemaakt_op: new Date().toISOString() };
  spelers.push(nieuw);
  sla(SLEUTEL_SPELERS, spelers);
  return { spelerId: id, naam: naam.trim() };
}

// ── Voortgang ─────────────────────────────────────────────────────────────────

export async function haalVoortgang(spelerId) {
  const scores = laad(SLEUTEL_SCORES, []);
  const mijnScores = scores.filter(s => s.speler_id === spelerId);

  // Groepeer per spel
  const perSpel = {};
  for (const s of mijnScores) {
    if (!perSpel[s.spel]) perSpel[s.spel] = [];
    perSpel[s.spel].push(s);
  }

  // Hoogste spel met minstens 1 poging
  const gespeldeLevels = Object.keys(perSpel).map(Number).filter(n => perSpel[n].length > 0);
  const hoogsteGespeeld = gespeldeLevels.length ? Math.max(...gespeldeLevels) : 0;
  const level = hoogsteGespeeld + 1;

  const scoresUitvoer = Object.entries(perSpel).map(([spel, pogingen]) => {
    const bestePoging = pogingen.reduce((best, p) => p.score > best.score ? p : best, pogingen[0]);
    return {
      spel: Number(spel),
      score: bestePoging.score,
      ruwe_waarde: bestePoging.ruwe_waarde,
      pogingen: pogingen.map(p => ({
        poging: p.poging,
        score: p.score,
        ruwe_waarde: p.ruwe_waarde,
        gespeeld_op: p.gespeeld_op,
      })),
    };
  });

  return { level, scores: scoresUitvoer };
}

// ── Score opslaan ─────────────────────────────────────────────────────────────

export async function slaScoreOp(spelerId, spel, score, ruweWaarde, poging) {
  try {
    const scores = laad(SLEUTEL_SCORES, []);

    // Uniek (speler_id, spel, poging) — update als al bestaat
    const idx = scores.findIndex(
      s => s.speler_id === spelerId && s.spel === spel && s.poging === poging
    );
    const nieuw = {
      speler_id: spelerId,
      spel,
      poging,
      score,
      ruwe_waarde: ruweWaarde,
      gespeeld_op: new Date().toISOString(),
    };

    if (idx >= 0) scores[idx] = nieuw;
    else scores.push(nieuw);

    sla(SLEUTEL_SCORES, scores);
    verwijderUitWachtrij(spelerId, spel, poging);
    return { ok: true };
  } catch (err) {
    voegToeAanWachtrij(spelerId, spel, score, ruweWaarde, poging);
    throw err;
  }
}

// ── Ranglijst ─────────────────────────────────────────────────────────────────

export async function haalRanglijst() {
  const spelers = laad(SLEUTEL_SPELERS, []);
  const scores  = laad(SLEUTEL_SCORES, []);

  return spelers.map(speler => {
    const mijnScores = scores.filter(s => s.speler_id === speler.id);

    const perSpel = {};
    for (const s of mijnScores) {
      if (!perSpel[s.spel] || s.score > perSpel[s.spel]) {
        perSpel[s.spel] = s.score;
      }
    }

    const totaal = Object.values(perSpel).reduce((som, sc) => som + sc, 0);

    return {
      spelerId: speler.id,
      naam: speler.naam,
      scores: perSpel,
      totaal,
    };
  }).sort((a, b) => b.totaal - a.totaal);
}

// ── Reset ─────────────────────────────────────────────────────────────────────

export async function resetAlles(sleutel) {
  controleerSleutel(sleutel);
  sla(SLEUTEL_SPELERS, []);
  sla(SLEUTEL_SCORES, []);
  sla(SLEUTEL_WACHTRIJ, []);
  localStorage.removeItem('jkz_huidig_id');
}

export async function resetSpeler(sleutel, spelerId) {
  controleerSleutel(sleutel);
  const spelers = laad(SLEUTEL_SPELERS, []).filter(s => s.id !== spelerId);
  const scores  = laad(SLEUTEL_SCORES, []).filter(s => s.speler_id !== spelerId);
  sla(SLEUTEL_SPELERS, spelers);
  sla(SLEUTEL_SCORES, scores);
}

// ── Config (admin) ────────────────────────────────────────────────────────────

export function haalConfig() {
  return laad(SLEUTEL_CONFIG, { gesloten: false, testmodus: false });
}

export function slaConfigOp(config) {
  sla(SLEUTEL_CONFIG, config);
}

// ── Wachtrij voor offline scores ──────────────────────────────────────────────

function voegToeAanWachtrij(spelerId, spel, score, ruweWaarde, poging) {
  const wachtrij = laad(SLEUTEL_WACHTRIJ, []);
  wachtrij.push({ spelerId, spel, score, ruweWaarde, poging, ts: Date.now() });
  sla(SLEUTEL_WACHTRIJ, wachtrij);
}

function verwijderUitWachtrij(spelerId, spel, poging) {
  const wachtrij = laad(SLEUTEL_WACHTRIJ, []).filter(
    w => !(w.spelerId === spelerId && w.spel === spel && w.poging === poging)
  );
  sla(SLEUTEL_WACHTRIJ, wachtrij);
}

export async function verwerkWachtrij() {
  const wachtrij = laad(SLEUTEL_WACHTRIJ, []);
  if (!wachtrij.length) return;
  for (const item of wachtrij) {
    try {
      await slaScoreOp(item.spelerId, item.spel, item.score, item.ruweWaarde, item.poging);
    } catch { /* volgende keer */ }
  }
}

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

function controleerSleutel(sleutel) {
  // In fase 2: controle op server. In fase 1 accepteren we elke niet-lege sleutel.
  if (!sleutel) throw new Error('Geen sleutel opgegeven');
}

export function haalSpelerUitStorage() {
  const id = localStorage.getItem('jkz_huidig_id');
  if (!id) return null;
  const spelers = laad(SLEUTEL_SPELERS, []);
  const speler = spelers.find(s => s.id === id);
  return speler ? { spelerId: speler.id, naam: speler.naam } : null;
}

export function slaHuidigeSpelerOp(spelerId) {
  localStorage.setItem('jkz_huidig_id', spelerId);
}

export function verwijderHuidigeSpeler() {
  localStorage.removeItem('jkz_huidig_id');
}

export function haalAllSpelers() {
  return laad(SLEUTEL_SPELERS, []);
}
