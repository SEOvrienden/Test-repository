// Spel 6 — One-button (Flappy style)
// Tik om te fladderen, ontwijkt palen. Canvas + delta-tijd.
// Oefenen: eindigt na 3 palen, botsen herstart meteen.
import { speel } from '../geluid.js?v=8';
import { clamp } from '../app.js?v=8';

export const info = {
  naam: 'One-button',
  uitleg: 'Tik om omhoog te fladderen. Zwaartekracht trekt je naar beneden. '
        + 'Ontwijkt de palen.',
  scoreRegel: 'Zo scoor je: 5 punten per doorgekomen paal. 20 palen = 100 punten.',
  demoHTML: `<div class="demo-onebutton">
    <div class="demo-ob-vogel"></div>
    <div class="demo-ob-paal boven"></div>
    <div class="demo-ob-paal onder"></div>
  </div>`,
};

const ZWAARTEKRACHT   = 900;   // px/s²
const FLAP_KRACHT     = -340;  // px/s (omhoog)
const PAAL_SNELHEID   = 160;   // px/s
const PAAL_BREEDTE    = 50;    // px
const GAP_FRACTIE     = 0.38;  // gat als fractie van schermbreedte
const PAAL_INTERVAL   = 2.2;   // seconden tussen palen
const OEFENEN_PALEN   = 3;

function berekenScore(palen) {
  return clamp(palen * 5, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="onebutton-container">
      <div class="onebutton-canvas-wrap">
        <canvas id="ob-canvas"></canvas>
      </div>
      <div class="onebutton-hint">TAP of klik om te fladderen &nbsp;🐦</div>
    </div>`;

  const canvas = container.querySelector('#ob-canvas');
  const ctx    = canvas.getContext('2d');
  let dpr = window.devicePixelRatio || 1;

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
  }
  resize();

  const W = () => parseInt(canvas.style.width);
  const H = () => parseInt(canvas.style.height);

  // Spelstatus
  let vogelY  = 0;
  let vogelVY = 0;
  let palen   = [];
  let palen_count = 0;
  let volgende_paal = PAAL_INTERVAL;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId = null;
  let vorigeTs = null;
  let isGestart = false;

  function resetVogel() {
    vogelY  = H() * 0.45;
    vogelVY = 0;
  }
  resetVogel();

  const VOGEL_R = 14;

  function maakPaal(x) {
    const h = H();
    const gat = h * GAP_FRACTIE;
    const minTop = h * 0.15;
    const maxTop = h - gat - h * 0.15;
    const topHoogte = minTop + Math.random() * (maxTop - minTop);
    return { x, topHoogte, gat, geteld: false };
  }

  function flap() {
    if (vernietigd) return;
    speel('tik');
    if (!isGestart) {
      isGestart = true;
      animId = requestAnimationFrame(loop);
    }
    vogelVY = FLAP_KRACHT;
  }

  function gameOver() {
    speel('gameOver');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    if (isOefenen) {
      // Herstart meteen in oefenmodus
      resetVogel();
      palen = [];
      volgende_paal = PAAL_INTERVAL;
      return;
    }
    eindeSpel();
  }

  function eindeSpel() {
    vernietigd = true;
    cancelAnimationFrame(animId);
    const score = berekenScore(palen_count);
    onKlaar(`${palen_count} palen`, score);
  }

  function update(delta) {
    if (!isGestart) return;
    const h = H();
    const w = W();

    // Vogel
    vogelVY += ZWAARTEKRACHT * delta;
    vogelY  += vogelVY * delta;

    // Buiten beeld (boven of onder)
    if (vogelY - VOGEL_R < 0 || vogelY + VOGEL_R > h) {
      gameOver();
      return;
    }

    // Nieuwe paal
    volgende_paal -= delta;
    if (volgende_paal <= 0) {
      palen.push(maakPaal(w + PAAL_BREEDTE));
      volgende_paal = PAAL_INTERVAL;
    }

    // Palen bewegen + botsing
    const vogelX = w * 0.25;
    for (let i = palen.length - 1; i >= 0; i--) {
      const p = palen[i];
      p.x -= PAAL_SNELHEID * delta;

      // Score tellen
      if (!p.geteld && p.x + PAAL_BREEDTE < vogelX) {
        p.geteld = true;
        palen_count++;
        speel('treffer');
        if (isOefenen && palen_count >= OEFENEN_PALEN) {
          setTimeout(() => {
            if (!vernietigd) eindeSpel();
          }, 300);
        }
      }

      // Botsing
      if (
        vogelX + VOGEL_R > p.x &&
        vogelX - VOGEL_R < p.x + PAAL_BREEDTE
      ) {
        if (vogelY - VOGEL_R < p.topHoogte || vogelY + VOGEL_R > p.topHoogte + p.gat) {
          gameOver();
          return;
        }
      }

      if (p.x + PAAL_BREEDTE < 0) palen.splice(i, 1);
    }
  }

  function teken() {
    const w = W();
    const h = H();

    // Achtergrond
    ctx.fillStyle = '#0f241a';
    ctx.fillRect(0, 0, w, h);

    // Palen
    ctx.fillStyle = '#204634';
    ctx.strokeStyle = 'rgba(204,171,55,0.3)';
    ctx.lineWidth = 1.5;
    for (const p of palen) {
      // Bovenpaal
      ctx.fillRect(p.x, 0, PAAL_BREEDTE, p.topHoogte);
      ctx.strokeRect(p.x, 0, PAAL_BREEDTE, p.topHoogte);
      // Onderpaal
      const onderY = p.topHoogte + p.gat;
      ctx.fillRect(p.x, onderY, PAAL_BREEDTE, h - onderY);
      ctx.strokeRect(p.x, onderY, PAAL_BREEDTE, h - onderY);
    }

    // Vogel (gouden bol)
    const vogelX = w * 0.25;
    ctx.fillStyle = '#ccab37';
    ctx.beginPath();
    ctx.arc(vogelX, vogelY, VOGEL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0c766';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Oog
    ctx.fillStyle = '#0f241a';
    ctx.beginPath();
    ctx.arc(vogelX + 5, vogelY - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Score overlay
    ctx.fillStyle = 'rgba(204,171,55,0.9)';
    ctx.font = `bold ${Math.round(h * 0.055)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(palen_count, w * 0.5, h * 0.08);

    // Start-hint
    if (!isGestart) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `${Math.round(h * 0.04)}px system-ui, sans-serif`;
      ctx.fillText('Tik om te beginnen', w * 0.5, h * 0.55);
    }
  }

  function loop(ts) {
    if (vernietigd) return;
    if (gepauzeerd) { animId = requestAnimationFrame(loop); return; }
    if (vorigeTs === null) vorigeTs = ts;
    const delta = Math.min((ts - vorigeTs) / 1000, 0.1);
    vorigeTs = ts;
    update(delta);
    teken();
    animId = requestAnimationFrame(loop);
  }

  // Eerste frame om het scherm te tekenen (voor de start)
  teken();

  // Besturing
  function onTap(e) { e.preventDefault(); flap(); }
  canvas.addEventListener('pointerdown', onTap);
  window.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); flap(); } });

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
      canvas.removeEventListener('pointerdown', onTap);
    },
  };
}
