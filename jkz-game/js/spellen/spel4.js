// Spel 4 — Mepspel
// Tik het opduikende vakje in 30 seconden. Oefenen: 10 seconden.
import { speel } from '../geluid.js?v=3';
import { clamp } from '../app.js?v=3';

export const info = {
  naam: 'Mepspel',
  uitleg: 'Er duikt steeds een vakje op in het raster. Tik het zo snel mogelijk weg! '
        + 'Je hebt 30 seconden.',
  scoreRegel: 'Zo scoor je: 4 punten per treffer. '
            + '25 treffers = 100 punten.',
  demoHTML: `<div class="demo-mep">
    <div></div><div></div><div></div><div></div>
  </div>`,
};

const DUUR_ECHT    = 30;
const DUUR_OEFENEN = 10;
const MEP_ZICHTBAAR = 1200; // ms dat een mol zichtbaar blijft
const MEP_PAUZE     = 300;  // ms pauze na verdwijnen

function berekenScore(treffers) {
  return clamp(treffers * 4, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const totaleTijd = modus === 'oefenen' ? DUUR_OEFENEN : DUUR_ECHT;
  let treffers = 0;
  let huidigeCel = -1;
  let restTijd = totaleTijd;
  let timerInterval = null;
  let molTimer = null;
  let vernietigd = false;
  let gepauzeerd = false;

  container.innerHTML = `
    <div class="mep-container">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px;">
        <div class="mep-timer">⏱ <span id="mep-tijd">${totaleTijd}</span>s</div>
        <div class="mep-score">Treffers: <span id="mep-treffers">0</span></div>
      </div>
      <div class="mep-grid" id="mep-grid"></div>
    </div>`;

  const tijdEl     = container.querySelector('#mep-tijd');
  const trefffersEl = container.querySelector('#mep-treffers');
  const grid       = container.querySelector('#mep-grid');

  // Bouw 3x3 grid
  for (let i = 0; i < 9; i++) {
    const cel = document.createElement('div');
    cel.className = 'mep-cel';
    cel.dataset.idx = i;
    cel.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      mepCel(i);
    });
    grid.appendChild(cel);
  }

  const cellen = grid.querySelectorAll('.mep-cel');

  function mepCel(idx) {
    if (vernietigd || gepauzeerd || idx !== huidigeCel) return;
    clearTimeout(molTimer);
    speel('treffer');
    treffers++;
    trefffersEl.textContent = treffers;
    cellen[idx].classList.remove('actief');
    cellen[idx].classList.add('geraakt');
    huidigeCel = -1;
    setTimeout(() => {
      if (!vernietigd && cellen[idx]) cellen[idx].classList.remove('geraakt');
    }, 300);
    setTimeout(() => verschijnMol(), MEP_PAUZE);
  }

  function verschijnMol() {
    if (vernietigd || gepauzeerd) return;
    // Verberg vorige
    if (huidigeCel >= 0 && cellen[huidigeCel]) {
      cellen[huidigeCel].classList.remove('actief');
    }
    // Kies willekeurige cel (niet dezelfde)
    let nieuw;
    do { nieuw = Math.floor(Math.random() * 9); } while (nieuw === huidigeCel);
    huidigeCel = nieuw;
    cellen[huidigeCel].classList.add('actief');

    molTimer = setTimeout(() => {
      if (!vernietigd && cellen[huidigeCel]) {
        cellen[huidigeCel].classList.remove('actief');
      }
      huidigeCel = -1;
      if (!vernietigd && !gepauzeerd) setTimeout(() => verschijnMol(), MEP_PAUZE);
    }, MEP_ZICHTBAAR);
  }

  function eindeSpel() {
    clearInterval(timerInterval);
    clearTimeout(molTimer);
    if (huidigeCel >= 0 && cellen[huidigeCel]) cellen[huidigeCel].classList.remove('actief');
    speel('levelKlaar');
    const score = berekenScore(treffers);
    onKlaar(`${treffers} treffers`, score);
  }

  // Timer
  timerInterval = setInterval(() => {
    if (gepauzeerd) return;
    restTijd--;
    tijdEl.textContent = restTijd;
    if (restTijd <= 0) eindeSpel();
  }, 1000);

  setTimeout(() => verschijnMol(), 500);

  return {
    pauzeer() {
      gepauzeerd = true;
      clearTimeout(molTimer);
      if (huidigeCel >= 0 && cellen[huidigeCel]) cellen[huidigeCel].classList.remove('actief');
      huidigeCel = -1;
    },
    hervat() {
      gepauzeerd = false;
      setTimeout(() => verschijnMol(), 500);
    },
    vernietig() {
      vernietigd = true;
      clearInterval(timerInterval);
      clearTimeout(molTimer);
    },
  };
}
