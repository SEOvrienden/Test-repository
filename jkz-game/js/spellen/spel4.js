// Spel 4 — Mepspel
// Tik het opduikende vakje in 30 seconden. Oefenen: 10 seconden.
import { speel } from '../geluid.js?v=21';
import { clamp } from '../app.js?v=21';

export const info = {
  naam: 'Mepspel',
  uitleg: 'Tik de gouden vakjes zo snel mogelijk weg — maar blijf van de bommen af! '
        + 'Zie je een ⭐? Die telt voor 3, maar is snel weer weg. Je hebt 30 seconden.',
  scoreRegel: 'Zo scoor je: 3 punten per treffer, een ⭐ telt voor 3 treffers, '
            + 'een bom kost je er 2. 34 treffers = 100 punten.',
  demoHTML: `<div class="demo-mep">
    <div></div><div></div><div></div><div></div>
  </div>`,
};

const DUUR_ECHT    = 30;
const DUUR_OEFENEN = 10;
const MEP_ZICHTBAAR_START = 1200; // ms zichtbaar aan het begin
const MEP_ZICHTBAAR_EIND  = 550;  // ms zichtbaar aan het einde (tempo loopt op)
const MEP_PAUZE     = 300;  // ms pauze na verdwijnen
const BOM_KANS      = 0.22; // kans dat het vakje een bom is
const STER_KANS     = 0.10; // kans op een ⭐ (telt voor 3, maar korter zichtbaar)

function berekenScore(treffers) {
  // 100 pas bij 34 treffers in 30 seconden — sterren meepakken is verplicht
  return clamp(treffers * 3, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const totaleTijd = modus === 'oefenen' ? DUUR_OEFENEN : DUUR_ECHT;
  let treffers = 0;
  let huidigeCel = -1;
  let huidigeIsBom = false;
  let huidigeIsSter = false;
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
    const wasBom = huidigeIsBom;
    const wasSter = huidigeIsSter;
    cellen[idx].classList.remove('actief', 'bom', 'ster');
    cellen[idx].textContent = '';
    huidigeCel = -1;
    if (wasBom) {
      // Au! Bom geraakt: kost 2 treffers
      speel('fout');
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      treffers = Math.max(0, treffers - 2);
      cellen[idx].classList.add('bom-geraakt');
      setTimeout(() => {
        if (!vernietigd && cellen[idx]) cellen[idx].classList.remove('bom-geraakt');
      }, 350);
    } else {
      speel('treffer');
      treffers += wasSter ? 3 : 1;
      cellen[idx].classList.add('geraakt');
      setTimeout(() => {
        if (!vernietigd && cellen[idx]) cellen[idx].classList.remove('geraakt');
      }, 300);
    }
    trefffersEl.textContent = treffers;
    setTimeout(() => verschijnMol(), MEP_PAUZE);
  }

  // Tempo loopt op: hoe minder tijd over, hoe korter het vakje blijft staan
  function zichtbaarNu() {
    const voortgang = 1 - restTijd / totaleTijd; // 0 → 1
    return MEP_ZICHTBAAR_START - (MEP_ZICHTBAAR_START - MEP_ZICHTBAAR_EIND) * voortgang;
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
    huidigeIsBom = treffers > 0 && Math.random() < BOM_KANS;
    huidigeIsSter = !huidigeIsBom && Math.random() < STER_KANS;
    cellen[huidigeCel].classList.add('actief');
    if (huidigeIsBom) {
      cellen[huidigeCel].classList.add('bom');
      cellen[huidigeCel].textContent = '💣';
    } else if (huidigeIsSter) {
      cellen[huidigeCel].classList.add('ster');
      cellen[huidigeCel].textContent = '⭐';
    }

    const dezeCel = huidigeCel;
    // Een ster is extra veel waard, maar verdwijnt sneller
    molTimer = setTimeout(() => {
      if (!vernietigd && cellen[dezeCel]) {
        cellen[dezeCel].classList.remove('actief', 'bom', 'ster');
        cellen[dezeCel].textContent = '';
      }
      huidigeCel = -1;
      if (!vernietigd && !gepauzeerd) setTimeout(() => verschijnMol(), MEP_PAUZE);
    }, huidigeIsSter ? zichtbaarNu() * 0.65 : zichtbaarNu());
  }

  function eindeSpel() {
    clearInterval(timerInterval);
    clearTimeout(molTimer);
    if (huidigeCel >= 0 && cellen[huidigeCel]) {
      cellen[huidigeCel].classList.remove('actief', 'bom', 'ster');
      cellen[huidigeCel].textContent = '';
    }
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
      if (huidigeCel >= 0 && cellen[huidigeCel]) {
        cellen[huidigeCel].classList.remove('actief', 'bom', 'ster');
        cellen[huidigeCel].textContent = '';
      }
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
