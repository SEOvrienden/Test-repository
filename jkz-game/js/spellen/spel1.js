// Spel 1 — Reactietest
// Tik zodra het vlak groen wordt. 5 rondes (oefenen: 2).
import { speel } from '../geluid.js?v=21';
import { clamp } from '../app.js?v=21';

export const info = {
  naam: 'Reactietest',
  uitleg: 'Wacht tot het vlak groen kleurt en tik dan zo snel mogelijk. '
        + 'Tik je te vroeg, dan telt die ronde als 600 ms.',
  scoreRegel: 'Zo scoor je: hoe sneller je gemiddelde, hoe meer punten. '
            + 'De volle 100 haal je pas rond een gemiddelde van 180 ms — bloedsnel dus.',
  demoHTML: `<div class="demo-reactie-vlak"></div>`,
};

const RONDES_ECHT    = 5;
const RONDES_OEFENEN = 2;
const VALSE_START_MS = 600;
const MIN_WACHT = 1000;
const MAX_WACHT = 4000;

function berekenScore(tijden) {
  const gem = tijden.reduce((s, t) => s + t, 0) / tijden.length;
  // 100 punten pas bij een gemiddelde van 180 ms; 250 ms ≈ 77, 300 ms ≈ 60
  return { score: clamp(Math.round((480 - gem) / 3), 0, 100), gem: Math.round(gem) };
}

export function maakSpel(container, { modus, onKlaar }) {
  const totaalRondes = modus === 'oefenen' ? RONDES_OEFENEN : RONDES_ECHT;
  const tijden = [];
  let huidigeRonde = 0;
  let staat = 'klaar'; // 'klaar' | 'wachten' | 'groen' | 'resultaat'
  let groenTimer = null;
  let groenTijd  = null;
  let vernietigd = false;
  let gepauzeerd = false;
  let pauzeMoment = null;

  // Bouw UI
  container.innerHTML = `
    <div class="reactie-container">
      <div class="reactie-rondes" id="r-rondes"></div>
      <div class="reactie-vlak wachten" id="r-vlak">Tik om te beginnen</div>
      <div class="reactie-tijd" id="r-tijd">&nbsp;</div>
    </div>`;

  const vlak    = container.querySelector('#r-vlak');
  const tijdEl  = container.querySelector('#r-tijd');
  const rondesEl = container.querySelector('#r-rondes');

  function renderRondes() {
    rondesEl.innerHTML = '';
    for (let i = 0; i < totaalRondes; i++) {
      const dot = document.createElement('div');
      dot.className = 'reactie-ronde-dot';
      if (i < tijden.length)  dot.classList.add('gedaan');
      if (i === huidigeRonde) dot.classList.add('actief');
      rondesEl.appendChild(dot);
    }
  }

  function startRonde() {
    staat = 'wachten';
    vlak.className = 'reactie-vlak wachten';
    vlak.textContent = 'Klaar…';
    tijdEl.textContent = ' ';
    renderRondes();

    const vertraging = MIN_WACHT + Math.random() * (MAX_WACHT - MIN_WACHT);
    groenTimer = setTimeout(() => {
      if (vernietigd || gepauzeerd) return;
      staat = 'groen';
      groenTijd = performance.now();
      vlak.className = 'reactie-vlak groen';
      vlak.textContent = 'TIK!';
      speel('tik');
    }, vertraging);
  }

  function verwerkTik() {
    if (vernietigd || gepauzeerd) return;

    if (staat === 'klaar') {
      startRonde();
      return;
    }

    if (staat === 'wachten') {
      // Valse start
      clearTimeout(groenTimer);
      speel('fout');
      if (navigator.vibrate) navigator.vibrate(150);
      tijden.push(VALSE_START_MS);
      vlak.className = 'reactie-vlak gedaan';
      vlak.textContent = `Valse start! (${VALSE_START_MS} ms)`;
      tijdEl.textContent = `Ronde ${huidigeRonde + 1}: ${VALSE_START_MS} ms`;
      staat = 'resultaat';
      huidigeRonde++;
      setTimeout(() => volgende(), 1200);
      return;
    }

    if (staat === 'groen') {
      const reactieTijd = Math.round(performance.now() - groenTijd);
      tijden.push(reactieTijd);
      speel('treffer');
      vlak.className = 'reactie-vlak gedaan';
      vlak.textContent = `${reactieTijd} ms`;
      tijdEl.textContent = `Ronde ${huidigeRonde + 1}: ${reactieTijd} ms`;
      staat = 'resultaat';
      huidigeRonde++;
      setTimeout(() => volgende(), 1000);
    }
  }

  function volgende() {
    if (vernietigd) return;
    renderRondes();
    if (huidigeRonde >= totaalRondes) {
      eindeSpel();
    } else {
      startRonde();
    }
  }

  function eindeSpel() {
    const { score, gem } = berekenScore(tijden);
    speel('levelKlaar');
    vlak.className = 'reactie-vlak gedaan';
    vlak.textContent = `Gem: ${gem} ms`;
    tijdEl.textContent = '';
    const ruwe = `gem. ${gem} ms (${tijden.join(', ')} ms)`;
    onKlaar(ruwe, score);
  }

  // Touch & click op het vlak
  function onInteractie(e) {
    e.preventDefault();
    verwerkTik();
  }

  vlak.addEventListener('pointerdown', onInteractie);

  renderRondes();
  vlak.textContent = 'Tik om te beginnen';
  staat = 'klaar';

  return {
    pauzeer() {
      if (staat === 'wachten') {
        gepauzeerd = true;
        pauzeMoment = Date.now();
        clearTimeout(groenTimer);
      } else if (staat === 'groen') {
        gepauzeerd = true;
        // Valse start afhandelen bij hervatten
      }
    },
    hervat() {
      if (!gepauzeerd) return;
      gepauzeerd = false;
      if (staat === 'wachten') {
        // Herstart de wachttijd
        const vertraging = MIN_WACHT + Math.random() * (MAX_WACHT - MIN_WACHT);
        groenTimer = setTimeout(() => {
          if (vernietigd || gepauzeerd) return;
          staat = 'groen';
          groenTijd = performance.now();
          vlak.className = 'reactie-vlak groen';
          vlak.textContent = 'TIK!';
          speel('tik');
        }, vertraging);
      } else if (staat === 'groen') {
        // Pauzeren tijdens groen — reset als 'wachten' om eerlijkheid te bewaren
        staat = 'klaar';
        vlak.className = 'reactie-vlak wachten';
        vlak.textContent = 'Tik om door te gaan';
      }
    },
    vernietig() {
      vernietigd = true;
      clearTimeout(groenTimer);
      vlak.removeEventListener('pointerdown', onInteractie);
    },
  };
}
