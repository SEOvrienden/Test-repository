// Spel 2 — Memory
// 12 kaarten (6 paren). Oefenen: 4 kaarten (2 paren).
import { speel } from '../geluid.js?v=4';
import { clamp } from '../app.js?v=4';

export const info = {
  naam: 'Memory',
  uitleg: 'Draai kaarten om en zoek de paren. '
        + 'Onthoud waar welke kaart ligt — hoe minder beurten, hoe meer punten.',
  scoreRegel: 'Zo scoor je: 100 punten bij 6 beurten (de minimum), '
            + 'elke extra beurt kost 4 punten.',
  demoHTML: `<div class="demo-memory">
    <div class="demo-memory-kaart flip1"></div>
    <div class="demo-memory-kaart flip2"></div>
    <div class="demo-memory-kaart flip1" style="animation-delay:0.2s"></div>
    <div class="demo-memory-kaart flip2" style="animation-delay:0.6s"></div>
  </div>`,
};

const SYMBOLEN_GROOT = ['🌟', '⚡', '🎯', '🎮', '🏆', '💎'];
const SYMBOLEN_KLEIN = ['🌟', '⚡'];

function berekenScore(beurten, aantalParen) {
  const minBeurten = aantalParen;
  return clamp(100 - (beurten - minBeurten) * 4, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';
  const symbolen = isOefenen ? SYMBOLEN_KLEIN : SYMBOLEN_GROOT;
  const aantalParen = symbolen.length;
  const cols = isOefenen ? 2 : 4;

  let beurten = 0;
  let omgeklapt = [];   // indices van nu zichtbare (niet-gevonden) kaarten
  let gevonden  = 0;
  let geblokkeerd = false;
  let vernietigd  = false;

  // Schud kaarten
  const kaarten = [...symbolen, ...symbolen]
    .map((symbool, i) => ({ id: i, symbool, open: false, gevonden: false }))
    .sort(() => Math.random() - 0.5);

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;padding:8px;gap:8px;">
      <div class="memory-status">Beurten: <span id="m-beurten">0</span></div>
      <div class="memory-grid ${isOefenen ? 'klein' : 'groot'}" id="m-grid"></div>
    </div>`;

  const grid     = container.querySelector('#m-grid');
  const beurtenEl = container.querySelector('#m-beurten');

  function renderKaarten() {
    grid.innerHTML = '';
    kaarten.forEach((k, idx) => {
      const el = document.createElement('div');
      el.className = 'memory-kaart';
      if (k.open || k.gevonden) el.classList.add('omgeklapt');
      if (k.gevonden) el.classList.add('gevonden');
      el.innerHTML = `<div class="memory-kaart-binnen">
        <div class="memory-achter">?</div>
        <div class="memory-voor">${k.symbool}</div>
      </div>`;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        klikKaart(idx);
      });
      grid.appendChild(el);
    });
  }

  function klikKaart(idx) {
    if (vernietigd || geblokkeerd) return;
    const k = kaarten[idx];
    if (k.open || k.gevonden) return;
    if (omgeklapt.length >= 2) return;

    speel('tik');
    k.open = true;
    omgeklapt.push(idx);
    renderKaarten();

    if (omgeklapt.length === 2) {
      beurten++;
      beurtenEl.textContent = beurten;
      const [a, b] = omgeklapt;
      if (kaarten[a].symbool === kaarten[b].symbool) {
        // Match!
        kaarten[a].gevonden = kaarten[b].gevonden = true;
        kaarten[a].open = kaarten[b].open = false;
        omgeklapt = [];
        gevonden++;
        speel('treffer');
        renderKaarten();
        if (gevonden >= aantalParen) {
          setTimeout(() => {
            speel('levelKlaar');
            const score = berekenScore(beurten, aantalParen);
            onKlaar(`${beurten} beurten, ${aantalParen} paren`, score);
          }, 400);
        }
      } else {
        // Geen match — draai terug
        geblokkeerd = true;
        speel('fout');
        setTimeout(() => {
          if (vernietigd) return;
          kaarten[a].open = kaarten[b].open = false;
          omgeklapt = [];
          geblokkeerd = false;
          renderKaarten();
        }, 1000);
      }
    }
  }

  renderKaarten();

  return {
    pauzeer() { geblokkeerd = true; },
    hervat()  { geblokkeerd = false; },
    vernietig() { vernietigd = true; },
  };
}
