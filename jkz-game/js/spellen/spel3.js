// Spel 3 — Simon
// Herhaal de kleurenreeks. Score = level * 8. Oefenen stopt na level 3.
import { speel, speelSimon } from '../geluid.js?v=19';
import { clamp } from '../app.js?v=19';

export const info = {
  naam: 'Simon',
  uitleg: 'Onthoud de kleurenreeks en tik hem na. '
        + 'Elke ronde wordt de reeks één kleur langer.',
  scoreRegel: 'Zo scoor je: 7 punten per level dat je haalt. '
            + 'Pas bij level 15 heb je de volle 100 punten.',
  demoHTML: `<div class="demo-simon">
    <div></div><div></div><div></div><div></div>
  </div>`,
};

const OEFENEN_MAX_LEVEL = 3;
const FLASH_DUUR = 500;
const FLASH_PAUZE = 150;

function berekenScore(level) {
  // 100 pas bij 15 onthouden levels — dat is een reeks van 15 kleuren
  return clamp(level * 7, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';
  let reeks = [];
  let inputIdx = 0;
  let level = 0;
  let staat = 'tonen'; // 'tonen' | 'input' | 'klaar'
  let vernietigd = false;
  let gepauzeerd = false;
  let flashTimers = [];

  container.innerHTML = `
    <div class="simon-container">
      <div class="simon-rij" id="s-status">Level <span id="s-level">0</span></div>
      <div class="simon-grid" id="s-grid">
        <div class="simon-knop" data-kleur="0"></div>
        <div class="simon-knop" data-kleur="1"></div>
        <div class="simon-knop" data-kleur="2"></div>
        <div class="simon-knop" data-kleur="3"></div>
      </div>
    </div>`;

  const statusEl = container.querySelector('#s-status');
  const levelEl  = container.querySelector('#s-level');
  const knoppen  = container.querySelectorAll('.simon-knop');

  function setBlokkeer(geblokkeerd) {
    knoppen.forEach(k => {
      k.style.pointerEvents = geblokkeerd ? 'none' : 'auto';
    });
  }

  function flashKnop(kleur, duur) {
    return new Promise(res => {
      const knop = knoppen[kleur];
      knop.classList.add('actief');
      speelSimon(kleur);
      const t = setTimeout(() => {
        knop.classList.remove('actief');
        res();
      }, duur);
      flashTimers.push(t);
    });
  }

  async function toonReeks() {
    if (vernietigd || gepauzeerd) return;
    staat = 'tonen';
    setBlokkeer(true);
    statusEl.innerHTML = `Kijk goed… <span id="s-level">${level}</span>`;

    for (const kleur of reeks) {
      if (vernietigd || gepauzeerd) return;
      await new Promise(res => { const t = setTimeout(res, FLASH_PAUZE); flashTimers.push(t); });
      await flashKnop(kleur, FLASH_DUUR);
    }

    if (vernietigd || gepauzeerd) return;
    staat = 'input';
    inputIdx = 0;
    setBlokkeer(false);
    statusEl.innerHTML = `Jouw beurt — level <span id="s-level">${level}</span>`;
  }

  function volgendeLevel() {
    if (vernietigd) return;
    level++;

    if (isOefenen && level > OEFENEN_MAX_LEVEL) {
      staat = 'klaar';
      const score = berekenScore(level - 1);
      onKlaar(`level ${level - 1}`, score);
      return;
    }

    reeks.push(Math.floor(Math.random() * 4));
    levelEl && (levelEl.textContent = level);
    setTimeout(() => toonReeks(), 600);
  }

  function verwerkInput(kleur) {
    if (vernietigd || staat !== 'input' || gepauzeerd) return;
    speel('tik');
    flashKnop(kleur, 200);

    if (kleur !== reeks[inputIdx]) {
      // Fout!
      speel('gameOver');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      staat = 'klaar';
      setBlokkeer(true);
      const eindeLevel = level - 1;
      statusEl.innerHTML = `Helaas! Je haalde level ${eindeLevel}.`;
      const score = berekenScore(eindeLevel);
      setTimeout(() => {
        if (!vernietigd) onKlaar(`level ${eindeLevel}`, score);
      }, 1000);
      return;
    }

    inputIdx++;
    if (inputIdx >= reeks.length) {
      // Reeks correct!
      speel('treffer');
      setBlokkeer(true);
      setTimeout(() => volgendeLevel(), 500);
    }
  }

  knoppen.forEach(knop => {
    knop.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      verwerkInput(Number(knop.dataset.kleur));
    });
  });

  // Start
  setTimeout(() => volgendeLevel(), 500);

  return {
    pauzeer() {
      gepauzeerd = true;
      setBlokkeer(true);
      flashTimers.forEach(t => clearTimeout(t));
      flashTimers = [];
      knoppen.forEach(k => k.classList.remove('actief'));
    },
    hervat() {
      gepauzeerd = false;
      // Herstart de huidige reeks zodat niemand zijn beurt kwijtraakt
      if (staat === 'tonen' || staat === 'input') {
        inputIdx = 0;
        setBlokkeer(true);
        setTimeout(() => toonReeks(), 500);
      } else {
        setBlokkeer(false);
      }
    },
    vernietig() {
      vernietigd = true;
      flashTimers.forEach(t => clearTimeout(t));
      setBlokkeer(true);
    },
  };
}
