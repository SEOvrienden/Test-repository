// Spel 9 — Lucky Shot (genoemd naar de Game Night: alles draait om timing)
// Een wijzer draait rond; tik precies wanneer hij door het gouden vak gaat.
// Elke treffer: vak wordt kleiner, wijzer sneller én wisselt van plek.
// 3 levens. Oefenen: groot vak, vaste snelheid, 20 sec.
import { speel } from '../geluid.js?v=18';
import { clamp } from '../app.js?v=18';

export const info = {
  naam: 'Lucky Shot',
  uitleg: 'De wijzer draait rond. Tik precies wanneer hij door het gouden vak '
        + 'gaat! Elke treffer wordt het vak kleiner en de wijzer sneller. '
        + 'Drie keer missen = klaar.',
  scoreRegel: 'Zo scoor je: 7 punten per rake shot. 15 raak = 100 punten.',
  demoHTML: `<div class="demo-lucky"><div class="demo-lucky-vak"></div><div class="demo-lucky-wijzer"></div></div>`,
};

const LEVENS_START   = 3;
const VAK_START      = 0.75;  // radialen (breed)
const VAK_MIN        = 0.22;
const VAK_KRIMP      = 0.045;
const SNELHEID_START = 2.6;   // radialen per seconde
const SNELHEID_STAP  = 0.35;
const OEFENEN_DUUR   = 20;

function berekenScore(raak) {
  return clamp(raak * 7, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="lucky-container">
      <div class="lucky-info">
        <span>🎯 <span id="lk-raak">0</span></span>
        <span id="lk-levens">${isOefenen ? `${OEFENEN_DUUR}s` : '❤️❤️❤️'}</span>
      </div>
      <div class="lucky-veld-wrap"><canvas id="lk-canvas"></canvas></div>
      <p class="klein ta-c" style="color:var(--tekst-zwak);padding:4px 0 8px;">
        Tik als de wijzer door het gouden vak gaat
      </p>
    </div>`;

  const canvas   = container.querySelector('#lk-canvas');
  const raakEl   = container.querySelector('#lk-raak');
  const levensEl = container.querySelector('#lk-levens');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  let W = 0, H = 0;
  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const size = Math.min(wrap.clientWidth - 8, wrap.clientHeight - 8);
    W = H = size;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();

  let raak = 0;
  let levens = LEVENS_START;
  let hoek = 0;                        // huidige wijzerhoek
  let snelheid = isOefenen ? SNELHEID_START * 0.8 : SNELHEID_START;
  let draairichting = 1;
  let vakBreedte = isOefenen ? VAK_START * 1.3 : VAK_START;
  let vakStart = Math.random() * Math.PI * 2;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId = null;
  let flits = null;                    // {kleur, tot}
  let oefenRestTijd = OEFENEN_DUUR;
  let oefenInterval = null;

  function inVak(h) {
    const a = ((h - vakStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return a <= vakBreedte;
  }

  function teken() {
    ctx.fillStyle = '#0f333c';
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const r = W * 0.38;

    // Ring
    ctx.strokeStyle = '#26616f';
    ctx.lineWidth = W * 0.09;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Gouden vak
    ctx.strokeStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(cx, cy, r, vakStart, vakStart + vakBreedte);
    ctx.stroke();

    // Wijzer
    ctx.strokeStyle = flits && performance.now() < flits.tot ? flits.kleur : '#f2ecd9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hoek) * (r + W * 0.055), cy + Math.sin(hoek) * (r + W * 0.055));
    ctx.stroke();

    // Middenstip met teller
    ctx.fillStyle = '#26616f';
    ctx.beginPath();
    ctx.arc(cx, cy, W * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2ecd9';
    ctx.font = `${Math.round(W * 0.09)}px 'Bebas Neue','Arial Narrow',sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(raak), cx, cy + 1);
  }

  function schiet(e) {
    if (e) e.preventDefault();
    if (vernietigd || gepauzeerd) return;
    if (inVak(hoek)) {
      speel('treffer');
      raak++;
      raakEl.textContent = raak;
      flits = { kleur: '#e8a33d', tot: performance.now() + 150 };
      if (!isOefenen) {
        vakBreedte = Math.max(VAK_MIN, vakBreedte - VAK_KRIMP);
        snelheid += SNELHEID_STAP;
        // Af en toe draait de wijzer ineens de andere kant op
        if (raak >= 5 && Math.random() < 0.35) draairichting *= -1;
      }
      vakStart = Math.random() * Math.PI * 2;
    } else {
      speel('fout');
      if (navigator.vibrate) navigator.vibrate(80);
      flits = { kleur: '#d4541a', tot: performance.now() + 200 };
      if (!isOefenen) {
        levens--;
        levensEl.textContent = '❤️'.repeat(Math.max(0, levens)) || '💔';
        if (levens <= 0) { eindeSpel(); return; }
      }
    }
  }

  function eindeSpel() {
    vernietigd = true;
    cancelAnimationFrame(animId);
    clearInterval(oefenInterval);
    onKlaar(`${raak} raak`, berekenScore(raak));
  }

  let vorigeTs = null;
  function gameLoop(ts) {
    if (vernietigd) return;
    if (gepauzeerd) { vorigeTs = null; animId = requestAnimationFrame(gameLoop); return; }
    if (vorigeTs === null) vorigeTs = ts;
    const delta = Math.min((ts - vorigeTs) / 1000, 0.05);
    vorigeTs = ts;
    hoek = (hoek + draairichting * snelheid * delta) % (Math.PI * 2);
    teken();
    animId = requestAnimationFrame(gameLoop);
  }

  canvas.addEventListener('pointerdown', schiet);
  function onKey(e) { if (e.key === ' ' || e.key === 'Enter') schiet(); }
  window.addEventListener('keydown', onKey);

  if (isOefenen) {
    oefenInterval = setInterval(() => {
      if (gepauzeerd) return;
      oefenRestTijd--;
      levensEl.textContent = `${oefenRestTijd}s`;
      if (oefenRestTijd <= 0) {
        clearInterval(oefenInterval);
        vernietigd = true;
        cancelAnimationFrame(animId);
        onKlaar(`${raak} raak (oefenmodus)`, berekenScore(raak));
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
      canvas.removeEventListener('pointerdown', schiet);
      window.removeEventListener('keydown', onKey);
    },
  };
}
