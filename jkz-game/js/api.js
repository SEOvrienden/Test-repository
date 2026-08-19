// Adapterlaag — fase 2: alles via de server (api.php + MySQL)
// De interface is gelijk aan fase 1, dus de rest van de app merkt
// alleen dat scores nu voor iedereen gedeeld zijn.
//
// localStorage wordt alleen nog gebruikt voor gemak:
// - wie je bent op dit apparaat (jkz_speler)
// - de laatst bekende spelstatus (jkz_status), zodat pagina's direct laden
// - een wachtrij voor scores die niet verstuurd konden worden (jkz_wachtrij)

const API = 'api.php';

const SLEUTEL_SPELER   = 'jkz_speler';
const SLEUTEL_STATUS   = 'jkz_status';
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

async function roep(actie, data = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actie, ...data }),
  });
  let json = null;
  try { json = await res.json(); } catch { /* geen JSON */ }
  if (!json || json.ok !== true) {
    const melding = json && json.fout ? json.fout : `Serverfout (${res.status})`;
    const err = new Error(melding);
    err.serverFout = true;
    throw err;
  }
  return json;
}

// ── Spelers ──────────────────────────────────────────────────────────────────

export async function registreerSpeler(naam) {
  const r = await roep('registreerSpeler', { naam });
  sla(SLEUTEL_SPELER, { spelerId: r.spelerId, naam: r.naam });
  return { spelerId: r.spelerId, naam: r.naam };
}

export function haalSpelerUitStorage() {
  const s = laad(SLEUTEL_SPELER, null);
  return s && s.spelerId ? s : null;
}

export function slaHuidigeSpelerOp(spelerId) {
  const s = laad(SLEUTEL_SPELER, {});
  s.spelerId = spelerId;
  sla(SLEUTEL_SPELER, s);
}

export function verwijderHuidigeSpeler() {
  localStorage.removeItem(SLEUTEL_SPELER);
}

// ── Voortgang & scores ────────────────────────────────────────────────────────

export async function haalVoortgang(spelerId) {
  const r = await roep('haalVoortgang', { spelerId });
  return { level: r.level, scores: r.scores };
}

export async function slaScoreOp(spelerId, spel, score, ruweWaarde, poging) {
  try {
    await roep('slaScoreOp', { spelerId, spel, score, ruweWaarde, poging });
    verwijderUitWachtrij(spelerId, spel, poging);
    return { ok: true };
  } catch (err) {
    // Netwerk weg? Zet de score in de wachtrij; die wordt bij de volgende
    // paginalading opnieuw geprobeerd.
    voegToeAanWachtrij(spelerId, spel, score, ruweWaarde, poging);
    throw err;
  }
}

// ── Ranglijst ─────────────────────────────────────────────────────────────────

export async function haalRanglijst() {
  const r = await roep('haalRanglijst');
  return r.ranglijst;
}

// ── Spelstatus (open/dicht + testmodus) ───────────────────────────────────────
// haalConfig() is bewust synchroon (pagina's lezen hem direct bij het laden):
// hij geeft de laatst bekende status terug. verversStatus() haalt op de
// achtergrond de actuele status op; bij de volgende paginalading geldt die.

export function haalConfig() {
  const s = laad(SLEUTEL_STATUS, null);
  return {
    gesloten:  s ? !s.open : false,
    testmodus: s ? !!s.testmodus : false,
  };
}

export async function verversStatus() {
  try {
    const r = await roep('haalSpelStatus');
    sla(SLEUTEL_STATUS, { open: r.open, testmodus: r.testmodus });
    return r;
  } catch { return null; }
}

export async function haalSpelStatus() {
  return verversStatus();
}

// ── Beheer (alle acties vereisen de adminsleutel) ─────────────────────────────

export async function resetAlles(sleutel) {
  await roep('resetAlles', { sleutel });
}

export async function resetSpeler(sleutel, spelerId) {
  await roep('resetSpeler', { sleutel, spelerId });
}

export async function zetSpelStatus(sleutel, open) {
  await roep('zetSpelStatus', { sleutel, open });
  await verversStatus();
}

export async function zetTestmodus(sleutel, testmodus) {
  await roep('zetTestmodus', { sleutel, testmodus });
  await verversStatus();
}

export async function haalSpelersOverzicht(sleutel) {
  const r = await roep('spelersOverzicht', { sleutel });
  return r.spelers;
}

// ── Wachtrij voor scores die niet verstuurd konden worden ─────────────────────

function voegToeAanWachtrij(spelerId, spel, score, ruweWaarde, poging) {
  const wachtrij = laad(SLEUTEL_WACHTRIJ, []).filter(
    w => !(w.spelerId === spelerId && w.spel === spel && w.poging === poging)
  );
  wachtrij.push({ spelerId, spel, score, ruweWaarde, poging });
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
  for (const item of wachtrij) {
    try {
      await slaScoreOp(item.spelerId, item.spel, item.score, item.ruweWaarde, item.poging);
    } catch { /* volgende keer opnieuw */ }
  }
}

// Bij elke paginalading: status verversen en wachtrij opnieuw proberen
verversStatus();
verwerkWachtrij().catch(() => {});
