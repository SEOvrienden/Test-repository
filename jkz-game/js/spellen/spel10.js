// Spel 10 — Hit & Run (genoemd naar de Game Night: snelheid, precisie, timing)
// Sleep je speler onderin heen en weer: ontwijk de vallende blokken en
// vang de gouden munten (Credits & Coins!). Het tempo loopt steeds op.
// Eén blok tegen je hoofd = klaar. Oefenen: 20 sec, botsen mag.
import { speel } from '../geluid.js?v=27';
import { clamp } from '../app.js?v=27';

export const info = {
  naam: 'Hit & Run',
  uitleg: 'Sleep je speler met je vinger naar links en rechts. Ontwijk de '
        + 'vallende blokken en vang de gouden munten. Het regent steeds harder — '
        + 'één blok tegen je hoofd en het is klaar.',
  scoreRegel: 'Zo scoor je: 2 punten per overleefde seconde + 1 per munt. '
            + 'Zo’n 40 seconden overleven én flink munten pakken = 100 punten.',
  demoHTML: `<div class="demo-hitrun">
    <div class="demo-hitrun-blok"></div>
    <div class="demo-hitrun-munt"></div>
    <div class="demo-hitrun-speler"></div>
  </div>`,
};

const SPELER_B      = 42;    // breedte speler (px)
const SPELER_H      = 20;
const VAL_START     = 170;   // px/s valsnelheid
const VAL_RAMP      = 13;    // sneller per seconde
const SPAWN_START   = 0.85;  // seconden tussen blokken
const SPAWN_MIN     = 0.28;
const MUNT_KANS     = 0.25;
const OEFENEN_DUUR  = 20;

function berekenScore(sec, munten) {
  // 100 pas rond 40 seconden overleven mét munten — tegen die tijd is het spervuur
  return clamp(Math.floor(sec) * 2 + munten, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="hitrun-container">
      <div class="hitrun-info">
        <span>⏱ <span id="hr-tijd">0</span>s</span>
        <span>🪙 <span id="hr-munten">0</span></span>
        ${isOefenen ? `<span id="hr-oeftijd">${OEFENEN_DUUR}s</span>` : ''}
      </div>
      <div class="hitrun-veld-wrap"><canvas id="hr-canvas"></canvas></div>
      <p class="klein ta-c" style="color:var(--tekst-zwak);padding:4px 0 8px;">
        Sleep over het veld om te bewegen
      </p>
    </div>`;

  const canvas   = container.querySelector('#hr-canvas');
  const tijdEl   = container.querySelector('#hr-tijd');
  const muntenEl = container.querySelector('#hr-munten');
  const oefTijdEl = container.querySelector('#hr-oeftijd');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  let W = 0, H = 0;
  function resizeCanvas() {
    const wrap = canvas.parentElement;
    W = wrap.clientWidth - 8;
    H = wrap.clientHeight - 8;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();

  let spelerX = W / 2;
  let doelX = W / 2;
  let tijd = 0;
  let munten = 0;
  let objecten = [];         // {x, y, b, h, munt}
  let sindsSpawn = 0;
  let geraaktFlits = 0;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId = null;
  let oefenRestTijd = OEFENEN_DUUR;
  let oefenInterval = null;

  function spawn() {
    const munt = Math.random() < MUNT_KANS;
    const b = munt ? 22 : 26 + Math.random() * 34;
    objecten.push({
      x: Math.random() * (W - b),
      y: -40,
      b,
      h: munt ? 22 : 18 + Math.random() * 16,
      munt,
    });
  }

  function teken() {
    ctx.fillStyle = '#0f333c';
    ctx.fillRect(0, 0, W, H);

    // Grondlijn
    ctx.strokeStyle = '#26616f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 8);
    ctx.lineTo(W, H - 8);
    ctx.stroke();

    // Objecten
    for (const o of objecten) {
      if (o.munt) {
        ctx.fillStyle = '#e8a33d';
        ctx.beginPath();
        ctx.arc(o.x + o.b / 2, o.y + o.h / 2, o.b / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f2c069';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = '#d4541a';
        ctx.fillRect(o.x, o.y, o.b, o.h);
      }
    }

    // Speler (pixel-poppetje met helmpje)
    const sy = H - 8 - SPELER_H;
    ctx.fillStyle = geraaktFlits > 0 ? '#d4541a' : '#f2ecd9';
    ctx.fillRect(spelerX - SPELER_B / 2, sy, SPELER_B, SPELER_H);
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(spelerX - SPELER_B / 2, sy - 7, SPELER_B, 7);
    if (geraaktFlits > 0) geraaktFlits--;
  }

  function eindeSpel() {
    vernietigd = true;
    cancelAnimationFrame(animId);
    clearInterval(oefenInterval);
    onKlaar(`${Math.floor(tijd)}s + ${munten} munten`, berekenScore(tijd, munten));
  }

  let vorigeTs = null;
  function gameLoop(ts) {
    if (vernietigd) return;
    if (gepauzeerd) { vorigeTs = null; animId = requestAnimationFrame(gameLoop); return; }
    if (vorigeTs === null) vorigeTs = ts;
    const delta = Math.min((ts - vorigeTs) / 1000, 0.05);
    vorigeTs = ts;

    tijd += delta;
    tijdEl.textContent = Math.floor(tijd);

    // Speler glijdt soepel naar je vinger toe
    spelerX += (doelX - spelerX) * Math.min(1, delta * 14);
    spelerX = clamp(spelerX, SPELER_B / 2, W - SPELER_B / 2);

    // Spawnen, steeds sneller
    sindsSpawn += delta;
    const interval = Math.max(SPAWN_MIN, SPAWN_START - tijd * 0.02);
    if (sindsSpawn >= interval) { sindsSpawn = 0; spawn(); }

    // Vallen + botsingen
    const val = VAL_START + tijd * VAL_RAMP;
    const sy = H - 8 - SPELER_H;
    for (const o of objecten) o.y += val * delta;
    for (let i = objecten.length - 1; i >= 0; i--) {
      const o = objecten[i];
      const raakt = o.y + o.h >= sy - 7 && o.y <= sy + SPELER_H
        && o.x + o.b >= spelerX - SPELER_B / 2 && o.x <= spelerX + SPELER_B / 2;
      if (raakt) {
        objecten.splice(i, 1);
        if (o.munt) {
          speel('treffer');
          munten++;
          muntenEl.textContent = munten;
        } else if (isOefenen) {
          // Oefenen: je voelt hem wel, maar gaat niet af
          speel('fout');
          geraaktFlits = 12;
        } else {
          speel('gameOver');
          if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
          eindeSpel();
          return;
        }
      } else if (o.y > H) {
        objecten.splice(i, 1);
      }
    }

    teken();
    animId = requestAnimationFrame(gameLoop);
  }

  // Besturing: slepen (of gewoon tikken waar je heen wilt)
  function zetDoel(e) {
    const rect = canvas.getBoundingClientRect();
    doelX = clamp(e.clientX - rect.left, SPELER_B / 2, W - SPELER_B / 2);
  }
  function onDown(e) { e.preventDefault(); canvas.setPointerCapture?.(e.pointerId); zetDoel(e); }
  function onMove(e) { if (e.pressure > 0 || e.buttons > 0) { e.preventDefault(); zetDoel(e); } }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  function onKey(e) {
    if (e.key === 'ArrowLeft')  doelX = clamp(doelX - 40, SPELER_B / 2, W - SPELER_B / 2);
    if (e.key === 'ArrowRight') doelX = clamp(doelX + 40, SPELER_B / 2, W - SPELER_B / 2);
  }
  window.addEventListener('keydown', onKey);

  if (isOefenen) {
    oefenInterval = setInterval(() => {
      if (gepauzeerd) return;
      oefenRestTijd--;
      if (oefTijdEl) oefTijdEl.textContent = `${oefenRestTijd}s`;
      if (oefenRestTijd <= 0) {
        clearInterval(oefenInterval);
        vernietigd = true;
        cancelAnimationFrame(animId);
        onKlaar(`${Math.floor(tijd)}s + ${munten} munten (oefenmodus)`, berekenScore(tijd, munten));
      }
    }, 1000);
  }

  animId = requestAnimationFrame(gameLoop);

  return {
    pauzeer() { gepauzeerd = true; },
    hervat()  { gepauzeerd = false; },
    vernietig() {
      vernietigd = true;
      cancelAnimationFrame(animId);
      clearInterval(oefenInterval);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKey);
    },
  };
}
