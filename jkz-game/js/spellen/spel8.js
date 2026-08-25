// Spel 8 — Stapelen (stacker)
// Een blok schuift heen en weer; tik om hem op de toren te laten vallen.
// Wat oversteekt wordt afgezaagd, dus de toren wordt steeds smaller.
// Het tempo loopt per laag op. Oefenen: 20 sec, zonder afzagen.
import { speel } from '../geluid.js?v=23';
import { clamp } from '../app.js?v=23';

export const info = {
  naam: 'Stapelen',
  uitleg: 'Tik om het schuivende blok op de toren te laten vallen. Alles wat '
        + 'oversteekt, wordt afgezaagd — dus mik precies! Elke laag gaat sneller. '
        + 'Mis je de toren helemaal, dan is het klaar.',
  scoreRegel: 'Zo scoor je: 4 punten per gestapelde laag. 25 lagen = 100 punten.',
  demoHTML: `<div class="demo-stapel">
    <div class="demo-stapel-blok b1"></div>
    <div class="demo-stapel-blok b2"></div>
    <div class="demo-stapel-blok b3"></div>
  </div>`,
};

const START_BREEDTE = 0.5;   // deel van de veldbreedte
const BLOK_HOOGTE   = 26;    // px (css-pixels)
const SNELHEID_START = 160;  // px per seconde
const SNELHEID_STAP  = 19;   // sneller per laag
const OEFENEN_DUUR   = 20;

function berekenScore(lagen) {
  // 100 pas bij 25 lagen — tegen die tijd vliegt het blok over het scherm
  return clamp(lagen * 4, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="stapel-container">
      <div class="stapel-info">
        <span>🧱 <span id="st-lagen">0</span> lagen</span>
        ${isOefenen ? `<span id="st-oeftijd">${OEFENEN_DUUR}s</span>` : ''}
      </div>
      <div class="stapel-veld-wrap"><canvas id="st-canvas"></canvas></div>
      <p class="klein ta-c" style="color:var(--tekst-zwak);padding:4px 0 8px;">
        Tik op het veld om het blok te laten vallen
      </p>
    </div>`;

  const canvas   = container.querySelector('#st-canvas');
  const lagenEl  = container.querySelector('#st-lagen');
  const oefTijdEl = container.querySelector('#st-oeftijd');
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

  // Toren: array van {x, breedte}; onderste laag ligt vast
  const KLEUREN = ['#e8a33d', '#f2c069', '#d8548f', '#4a99a8', '#f2ecd9'];
  let toren = [{ x: (W - W * START_BREEDTE) / 2, b: W * START_BREEDTE }];
  let lagen = 0;
  let blokX = 0;
  let richting = 1;
  let snelheid = SNELHEID_START;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId = null;
  let oefenRestTijd = OEFENEN_DUUR;
  let oefenInterval = null;
  let flitsTot = 0;

  function huidigeBreedte() { return toren[toren.length - 1].b; }

  function teken() {
    ctx.fillStyle = '#0f333c';
    ctx.fillRect(0, 0, W, H);

    // Camera: houd de bovenste ~10 lagen in beeld
    const zichtbaar = Math.min(toren.length, Math.floor(H / BLOK_HOOGTE) - 3);
    const eerste = toren.length - zichtbaar;

    for (let i = eerste; i < toren.length; i++) {
      const laag = toren[i];
      const y = H - (i - eerste + 1) * BLOK_HOOGTE;
      ctx.fillStyle = KLEUREN[i % KLEUREN.length];
      ctx.globalAlpha = i === toren.length - 1 ? 1 : 0.85;
      ctx.fillRect(laag.x, y, laag.b, BLOK_HOOGTE - 3);
    }
    ctx.globalAlpha = 1;

    // Schuivend blok bovenop
    if (!vernietigd) {
      const y = H - (toren.length - eerste + 1) * BLOK_HOOGTE;
      ctx.fillStyle = KLEUREN[toren.length % KLEUREN.length];
      ctx.fillRect(blokX, y, huidigeBreedte(), BLOK_HOOGTE - 3);
      // Hulplijnen: randen van de toren
      const top = toren[toren.length - 1];
      ctx.strokeStyle = 'rgba(242,236,217,0.25)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(top.x, 0); ctx.lineTo(top.x, y + BLOK_HOOGTE);
      ctx.moveTo(top.x + top.b, 0); ctx.lineTo(top.x + top.b, y + BLOK_HOOGTE);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (performance.now() < flitsTot) {
      ctx.fillStyle = 'rgba(212,84,26,0.25)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function laatVallen() {
    if (vernietigd || gepauzeerd) return;
    const top = toren[toren.length - 1];
    const b = huidigeBreedte();
    const links = Math.max(blokX, top.x);
    const rechts = Math.min(blokX + b, top.x + top.b);
    const overlap = rechts - links;

    if (overlap <= 4) {
      // Volledig misgestapeld
      speel('gameOver');
      if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
      eindeSpel();
      return;
    }

    speel('treffer');
    // In oefenmodus zagen we niet af, in het echt wel
    const nieuweBreedte = isOefenen ? b : overlap;
    const nieuweX = isOefenen ? clamp(blokX, top.x - b + 8, top.x + top.b - 8) : links;
    if (!isOefenen && overlap < b) flitsTot = performance.now() + 120;
    toren.push({ x: nieuweX, b: nieuweBreedte });
    lagen++;
    lagenEl.textContent = lagen;
    snelheid = SNELHEID_START + lagen * SNELHEID_STAP;
    // Nieuw blok start afwisselend links of rechts
    richting = lagen % 2 === 0 ? 1 : -1;
    blokX = richting === 1 ? -nieuweBreedte * 0.5 : W - nieuweBreedte * 0.5;
  }

  function eindeSpel() {
    vernietigd = true;
    cancelAnimationFrame(animId);
    clearInterval(oefenInterval);
    onKlaar(`${lagen} lagen`, berekenScore(lagen));
  }

  let vorigeTs = null;
  function gameLoop(ts) {
    if (vernietigd) return;
    if (gepauzeerd) { vorigeTs = null; animId = requestAnimationFrame(gameLoop); return; }
    if (vorigeTs === null) vorigeTs = ts;
    const delta = Math.min((ts - vorigeTs) / 1000, 0.05);
    vorigeTs = ts;

    blokX += richting * snelheid * delta;
    const b = huidigeBreedte();
    if (blokX < -b * 0.6) { blokX = -b * 0.6; richting = 1; }
    if (blokX > W - b * 0.4) { blokX = W - b * 0.4; richting = -1; }

    teken();
    animId = requestAnimationFrame(gameLoop);
  }

  function onTik(e) { e.preventDefault(); laatVallen(); }
  canvas.addEventListener('pointerdown', onTik);
  function onKey(e) { if (e.key === ' ' || e.key === 'Enter') laatVallen(); }
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
        onKlaar(`${lagen} lagen (oefenmodus)`, berekenScore(lagen));
      }
    }, 1000);
  }

  blokX = -W * START_BREEDTE * 0.5;
  animId = requestAnimationFrame(gameLoop);

  return {
    pauzeer() { gepauzeerd = true; },
    hervat()  { gepauzeerd = false; },
    vernietig() {
      vernietigd = true;
      cancelAnimationFrame(animId);
      clearInterval(oefenInterval);
      canvas.removeEventListener('pointerdown', onTik);
      window.removeEventListener('keydown', onKey);
    },
  };
}
