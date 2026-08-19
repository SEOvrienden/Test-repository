// Spel 5 — Snake
// Twee draaiknoppen. Canvas met requestAnimationFrame + delta-tijd.
// Oefenen: 30 sec, botsen = waarschuwing (snake wrapt door muren).
import { speel } from '../geluid.js?v=6';
import { clamp } from '../app.js?v=6';

export const info = {
  naam: 'Snake',
  uitleg: 'Stuur de slang met de knoppen Linksom en Rechtsom. Eet de appels. '
        + 'Loop niet in jezelf of tegen de muur.',
  scoreRegel: 'Zo scoor je: 5 punten per appel. 20 appels = 100 punten.',
  demoHTML: `<div class="demo-snake"><div class="demo-snake-lichaam"></div></div>`,
};

const RASTER = 15;
const SNELHEID_BASIS  = 2.5; // cellen per seconde
const SNELHEID_STAP   = 0.4; // sneller per 5 appels
const OEFENEN_DUUR    = 30;  // seconden

function berekenScore(appels) {
  return clamp(appels * 5, 0, 100);
}

const RICHTINGEN = {
  N: { x:  0, y: -1 },
  O: { x:  1, y:  0 },
  Z: { x:  0, y:  1 },
  W: { x: -1, y:  0 },
};

const LINKS_VAN  = { N: 'W', W: 'Z', Z: 'O', O: 'N' };
const RECHTS_VAN = { N: 'O', O: 'Z', Z: 'W', W: 'N' };

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="snake-container">
      <div class="snake-info">
        <span>🍎 <span id="sn-appels">0</span></span>
        ${isOefenen ? `<span id="sn-oeftijd">${OEFENEN_DUUR}s</span>` : ''}
      </div>
      <div class="snake-speelveld-wrap">
        <canvas id="sn-canvas"></canvas>
      </div>
      <div class="snake-controls">
        <button class="knop snake-knop" id="sn-links" aria-label="Linksom">↺ Linksom</button>
        <button class="knop snake-knop" id="sn-rechts" aria-label="Rechtsom">Rechtsom ↻</button>
      </div>
    </div>`;

  const canvas    = container.querySelector('#sn-canvas');
  const appelsEl  = container.querySelector('#sn-appels');
  const linksKnop = container.querySelector('#sn-links');
  const rechtsKnop = container.querySelector('#sn-rechts');
  const oefTijdEl = container.querySelector('#sn-oeftijd');

  const ctx = canvas.getContext('2d');
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const size = Math.min(wrap.clientWidth - 16, wrap.clientHeight - 8);
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();

  const celGrootte = () => parseInt(canvas.style.width) / RASTER;

  // Spelstatus
  let slang = [{ x: 7, y: 7 }];
  let richting = 'O';
  let volgendeRichting = 'O';
  let appel = plaatsAppel();
  let appels = 0;
  let aantalAppels = 0;
  let tijdSindsStap = 0;
  let snelheid = SNELHEID_BASIS;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId = null;
  let oefenRestTijd = OEFENEN_DUUR;
  let oefenInterval = null;
  let inHerstart = false;

  function plaatsAppel() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * RASTER), y: Math.floor(Math.random() * RASTER) };
    } while (slang.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  function tekenAlles() {
    const cel = celGrootte();
    const w = parseInt(canvas.style.width);
    const h = parseInt(canvas.style.height);

    // Achtergrond
    ctx.fillStyle = '#0f241a';
    ctx.fillRect(0, 0, w, h);

    // Grid (subtiel)
    ctx.strokeStyle = 'rgba(32,70,52,0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= RASTER; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cel, 0);
      ctx.lineTo(i * cel, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cel);
      ctx.lineTo(w, i * cel);
      ctx.stroke();
    }

    // Appel
    const ax = appel.x * cel + cel * 0.5;
    const ay = appel.y * cel + cel * 0.5;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(ax, ay, cel * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Steeltje
    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = cel * 0.12;
    ctx.beginPath();
    ctx.moveTo(ax, ay - cel * 0.4);
    ctx.lineTo(ax + cel * 0.15, ay - cel * 0.55);
    ctx.stroke();

    // Slang
    slang.forEach((seg, idx) => {
      const x = seg.x * cel + 1;
      const y = seg.y * cel + 1;
      const s = cel - 2;
      const alpha = idx === 0 ? 1 : 1 - (idx / slang.length) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = idx === 0 ? '#ccab37' : '#a08020';
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(x, y, s, s, cel * 0.25)
        : ctx.rect(x, y, s, s);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function stap(delta) {
    tijdSindsStap += delta;
    const stapInterval = 1 / snelheid;

    while (tijdSindsStap >= stapInterval) {
      tijdSindsStap -= stapInterval;
      beweeg();
    }
  }

  function beweeg() {
    richting = volgendeRichting;
    const dir = RICHTINGEN[richting];
    const hoofd = slang[0];
    let nx = hoofd.x + dir.x;
    let ny = hoofd.y + dir.y;

    // Muurbotsting
    if (nx < 0 || nx >= RASTER || ny < 0 || ny >= RASTER) {
      if (isOefenen) {
        // Wraparound in oefenmodus
        nx = (nx + RASTER) % RASTER;
        ny = (ny + RASTER) % RASTER;
      } else {
        gameOver();
        return;
      }
    }

    // Zelf-botsting
    if (slang.some(s => s.x === nx && s.y === ny)) {
      if (isOefenen) {
        // Negeer in oefenmodus
        return;
      } else {
        gameOver();
        return;
      }
    }

    slang.unshift({ x: nx, y: ny });

    // Appel gegeten?
    if (nx === appel.x && ny === appel.y) {
      speel('treffer');
      appels++;
      aantalAppels++;
      appelsEl.textContent = appels;
      appel = plaatsAppel();
      // Versnellen per 5 appels
      snelheid = SNELHEID_BASIS + Math.floor(appels / 5) * SNELHEID_STAP;
    } else {
      slang.pop();
    }
  }

  function gameOver() {
    speel('gameOver');
    if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
    eindeSpel();
  }

  function eindeSpel() {
    vernietigd = true;
    cancelAnimationFrame(animId);
    clearInterval(oefenInterval);
    const score = berekenScore(appels);
    onKlaar(`${appels} appels`, score);
  }

  let vorigeTs = null;
  function gameLoop(ts) {
    if (vernietigd) return;
    if (gepauzeerd) { animId = requestAnimationFrame(gameLoop); return; }
    if (vorigeTs === null) vorigeTs = ts;
    const delta = Math.min((ts - vorigeTs) / 1000, 0.1);
    vorigeTs = ts;
    stap(delta);
    tekenAlles();
    animId = requestAnimationFrame(gameLoop);
  }

  // Oefenmodus timer
  if (isOefenen) {
    oefenInterval = setInterval(() => {
      if (gepauzeerd) return;
      oefenRestTijd--;
      if (oefTijdEl) oefTijdEl.textContent = `${oefenRestTijd}s`;
      if (oefenRestTijd <= 0) {
        clearInterval(oefenInterval);
        vernietigd = true;
        cancelAnimationFrame(animId);
        const score = berekenScore(appels);
        onKlaar(`${appels} appels (oefenmodus)`, score);
      }
    }, 1000);
  }

  // Besturing
  function draaiLinks(e) { e.preventDefault(); speel('tik'); volgendeRichting = LINKS_VAN[richting]; }
  function draaiRechts(e) { e.preventDefault(); speel('tik'); volgendeRichting = RECHTS_VAN[richting]; }

  linksKnop.addEventListener('pointerdown', draaiLinks);
  rechtsKnop.addEventListener('pointerdown', draaiRechts);

  // Keyboard fallback (desktop)
  function onKey(e) {
    if (e.key === 'ArrowLeft')  { volgendeRichting = LINKS_VAN[richting];  }
    if (e.key === 'ArrowRight') { volgendeRichting = RECHTS_VAN[richting]; }
  }
  window.addEventListener('keydown', onKey);

  animId = requestAnimationFrame(gameLoop);

  return {
    pauzeer() {
      gepauzeerd = true;
      vorigeTs = null;
    },
    hervat() {
      gepauzeerd = false;
      vorigeTs = null;
    },
    vernietig() {
      vernietigd = true;
      cancelAnimationFrame(animId);
      clearInterval(oefenInterval);
      linksKnop.removeEventListener('pointerdown', draaiLinks);
      rechtsKnop.removeEventListener('pointerdown', draaiRechts);
      window.removeEventListener('keydown', onKey);
    },
  };
}
