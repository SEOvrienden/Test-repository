// Spel 7 — Quiz
// 10 meerkeuzevragen over JKZ. Oefenen: 1 voorbeeldvraag met uitleg.
import { speel } from '../geluid.js?v=3';
import { clamp } from '../app.js?v=3';
import { vragen, oefenvraag } from './vragen.js?v=3';

export const info = {
  naam: 'Quiz',
  uitleg: 'Beantwoord 10 vragen over JKZ. Lees elke vraag goed voor je tikt. '
        + 'Je ziet meteen of je goed zat.',
  scoreRegel: 'Zo scoor je: 10 punten per goed antwoord. '
            + 'Alle 10 goed is 100 punten.',
  demoHTML: `<div class="demo-quiz">
    <div class="demo-quiz-v" style="width:90%"></div>
    <div class="demo-quiz-v" style="width:70%;margin-bottom:4px"></div>
    <div class="demo-quiz-o"></div>
    <div class="demo-quiz-o"></div>
    <div class="demo-quiz-o"></div>
    <div class="demo-quiz-o"></div>
  </div>`,
};

function berekenScore(goed) {
  return clamp(goed * 10, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';
  const spelVragen = isOefenen ? [oefenvraag] : vragen;
  let vraagIdx = 0;
  let goedAntwoorden = 0;
  let antwoordGegeven = false;
  let vernietigd = false;

  container.innerHTML = `
    <div class="quiz-container">
      <div class="quiz-voortgang" id="qz-voortgang">Vraag 1 van ${spelVragen.length}</div>
      <div class="quiz-score-rij" id="qz-score-rij"></div>
      <div class="quiz-vraag-tekst" id="qz-vraag"></div>
      <div class="quiz-opties" id="qz-opties"></div>
      <div class="quiz-uitleg verborgen" id="qz-uitleg"></div>
    </div>`;

  const voortgangEl = container.querySelector('#qz-voortgang');
  const scoreRijEl  = container.querySelector('#qz-score-rij');
  const vraagEl     = container.querySelector('#qz-vraag');
  const optiesEl    = container.querySelector('#qz-opties');
  const uitlegEl    = container.querySelector('#qz-uitleg');

  function renderScoreRij() {
    scoreRijEl.innerHTML = '';
    spelVragen.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'quiz-score-dot';
      // Gevulde dots voor al beantwoorde vragen
      scoreRijEl.appendChild(dot);
    });
  }

  function updateScoreRij(idx, goed) {
    const dots = scoreRijEl.querySelectorAll('.quiz-score-dot');
    if (dots[idx]) dots[idx].classList.add(goed ? 'goed' : 'fout');
  }

  function toonVraag(idx) {
    if (vernietigd) return;
    antwoordGegeven = false;
    const q = spelVragen[idx];
    voortgangEl.textContent = `Vraag ${idx + 1} van ${spelVragen.length}`;
    vraagEl.textContent = q.vraag;
    uitlegEl.classList.add('verborgen');
    uitlegEl.textContent = '';

    optiesEl.innerHTML = '';
    q.opties.forEach((optie, i) => {
      const knop = document.createElement('button');
      knop.className = 'quiz-optie';
      knop.textContent = optie;
      knop.addEventListener('click', () => {
        if (antwoordGegeven || vernietigd) return;
        verwerkAntwoord(idx, i, knop);
      });
      optiesEl.appendChild(knop);
    });
  }

  function verwerkAntwoord(qIdx, gekozen, gekozenKnop) {
    antwoordGegeven = true;
    const q = spelVragen[qIdx];
    const isGoed = gekozen === q.goed;

    if (isGoed) {
      speel('treffer');
      goedAntwoorden++;
      gekozenKnop.classList.add('goed');
    } else {
      speel('fout');
      if (navigator.vibrate) navigator.vibrate(80);
      gekozenKnop.classList.add('fout');
      // Markeer het juiste antwoord
      const alleKnoppen = optiesEl.querySelectorAll('.quiz-optie');
      alleKnoppen[q.goed].classList.add('goed-antwoord-gemarkeerd');
    }

    updateScoreRij(qIdx, isGoed);

    // Toon uitleg als aanwezig (altijd bij oefenen)
    if (isOefenen && q.uitleg) {
      uitlegEl.textContent = q.uitleg;
      uitlegEl.classList.remove('verborgen');
    }

    // Volgende vraag of einde
    const wacht = (isOefenen && q.uitleg) ? 3000 : 1500;
    setTimeout(() => {
      if (vernietigd) return;
      vraagIdx++;
      if (vraagIdx >= spelVragen.length) {
        eindeSpel();
      } else {
        toonVraag(vraagIdx);
      }
    }, wacht);
  }

  function eindeSpel() {
    speel('levelKlaar');
    const score = berekenScore(goedAntwoorden);
    onKlaar(`${goedAntwoorden} van ${spelVragen.length} goed`, score);
  }

  renderScoreRij();
  toonVraag(0);

  return {
    pauzeer() { antwoordGegeven = true; },
    hervat()  { antwoordGegeven = false; },
    vernietig() { vernietigd = true; },
  };
}
