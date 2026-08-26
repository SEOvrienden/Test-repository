// Spel 6 — One-button (Flappy style)
// Tik om te fladderen, ontwijkt palen. Canvas + delta-tijd.
// Oefenen: eindigt na 3 palen, botsen herstart meteen.
import { speel } from '../geluid.js?v=24';
import { clamp } from '../app.js?v=24';

export const info = {
  naam: 'One-button',
  uitleg: 'Tik om omhoog te fladderen. Zwaartekracht trekt je naar beneden. '
        + 'Ontwijk de palen en pak onderweg de sterretjes — die hangen wel op '
        + 'gevaarlijke plekken. De gaten worden steeds smaller, het tempo '
        + 'loopt op en verderop beginnen palen te bewegen…',
  scoreRegel: 'Zo scoor je: 1 punt per doorgekomen paal en 1 punt per gepakt '
            + 'sterretje. Veel succes.',
  demoHTML: `<div class="demo-onebutton">
    <div class="demo-ob-vogel"></div>
    <div class="demo-ob-paal boven"></div>
    <div class="demo-ob-paal onder"></div>
  </div>`,
};

const ZWAARTEKRACHT   = 900;   // px/s²
const FLAP_KRACHT     = -340;  // px/s (omhoog)
const PAAL_SNELHEID   = 160;   // px/s aan het begin
const SNELHEID_PER_PAAL = 1.4; // px/s erbij per gehaalde paal (max +120)
const PAAL_BREEDTE    = 50;    // px
const GAP_FRACTIE     = 0.38;  // gat aan het begin (fractie van schermhoogte)
const GAP_MIN         = 0.25;  // smalste gat (bereikt rond paal 40)
const PAAL_INTERVAL   = 2.2;   // seconden tussen palen aan het begin
const INTERVAL_MIN    = 1.5;
const BEWEEG_VANAF    = 15;    // vanaf deze paal kunnen palen gaan bewegen
const STER_KANS       = 0.45;  // kans dat er een ster in het gat hangt
const OEFENEN_PALEN   = 3;

function berekenScore(palen, sterren) {
  return clamp(palen + sterren, 0, 100);
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
  let sterren = 0;
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

  // Moeilijkheid loopt op met het aantal gehaalde palen (niet in oefenmodus)
  function moeilijkheid() { return isOefenen ? 0 : palen_count; }
  function gapNu() {
    const f = GAP_FRACTIE - (GAP_FRACTIE - GAP_MIN) * Math.min(1, moeilijkheid() / 40);
    return H() * f;
  }
  function snelheidNu() {
    return PAAL_SNELHEID + Math.min(120, moeilijkheid() * SNELHEID_PER_PAAL);
  }
  function intervalNu() {
    // Iets korter naarmate het sneller gaat, zodat de afstand gelijk aanvoelt
    return Math.max(INTERVAL_MIN, PAAL_INTERVAL * (PAAL_SNELHEID / snelheidNu()));
  }

  function maakPaal(x) {
    const h = H();
    const gat = gapNu();
    const minTop = h * 0.12;
    const maxTop = h - gat - h * 0.12;
    const topHoogte = minTop + Math.random() * (maxTop - minTop);
    // Verderop in het spel gaan sommige palen op en neer bewegen
    const kans = Math.min(0.55, Math.max(0, (moeilijkheid() - BEWEEG_VANAF) * 0.03));
    const beweegt = Math.random() < kans;
    // Soms hangt er een ster in het gat — expres vlak bij de rand,
    // dus een ster pakken is altijd een klein risico
    const ster = !isOefenen && palen_count >= 2 && Math.random() < STER_KANS
      ? { dy: Math.random() < 0.5 ? gat * 0.18 : gat * 0.82, gepakt: false }
      : null;
    return {
      x, topHoogte, gat, geteld: false,
      beweegt, ster,
      basisTop: topHoogte,
      fase: Math.random() * Math.PI * 2,
      amplitude: h * 0.055,
    };
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
    const score = berekenScore(palen_count, sterren);
    onKlaar(`${palen_count} palen + ${sterren} sterren`, score);
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
      volgende_paal = intervalNu();
    }

    // Palen bewegen + botsing
    const vogelX = w * 0.25;
    const snelheid = snelheidNu();
    for (let i = palen.length - 1; i >= 0; i--) {
      const p = palen[i];
      p.x -= snelheid * delta;

      // Bewegende palen schuiven langzaam op en neer
      if (p.beweegt) {
        p.fase += delta * 1.6;
        const minTop = h * 0.08;
        const maxTop = h - p.gat - h * 0.08;
        p.topHoogte = clamp(p.basisTop + Math.sin(p.fase) * p.amplitude, minTop, maxTop);
      }

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

      // Ster pakken (hangt midden in de paalopening)
      if (p.ster && !p.ster.gepakt) {
        const sx = p.x + PAAL_BREEDTE / 2;
        const sy = p.topHoogte + p.ster.dy;
        if (Math.hypot(vogelX - sx, vogelY - sy) < VOGEL_R + 10) {
          p.ster.gepakt = true;
          sterren++;
          speel('nieuwRecord');
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
    ctx.fillStyle = '#0f333c';
    ctx.fillRect(0, 0, w, h);

    // Palen (bewegende palen krijgen een roze rand, dan zie je ze aankomen)
    ctx.lineWidth = 1.5;
    for (const p of palen) {
      ctx.fillStyle = p.beweegt ? '#28454f' : '#1c525f';
      ctx.strokeStyle = p.beweegt ? 'rgba(216,84,143,0.8)' : 'rgba(232,163,61,0.3)';
      // Bovenpaal
      ctx.fillRect(p.x, 0, PAAL_BREEDTE, p.topHoogte);
      ctx.strokeRect(p.x, 0, PAAL_BREEDTE, p.topHoogte);
      // Onderpaal
      const onderY = p.topHoogte + p.gat;
      ctx.fillRect(p.x, onderY, PAAL_BREEDTE, h - onderY);
      ctx.strokeRect(p.x, onderY, PAAL_BREEDTE, h - onderY);
      // Ster in het gat
      if (p.ster && !p.ster.gepakt) {
        ctx.font = '18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⭐', p.x + PAAL_BREEDTE / 2, p.topHoogte + p.ster.dy + 6);
      }
    }

    // Vogel (gouden bol)
    const vogelX = w * 0.25;
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(vogelX, vogelY, VOGEL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2c069';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Oog
    ctx.fillStyle = '#0f333c';
    ctx.beginPath();
    ctx.arc(vogelX + 5, vogelY - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Score overlay (palen + sterren)
    ctx.fillStyle = 'rgba(232,163,61,0.9)';
    ctx.font = `bold ${Math.round(h * 0.055)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(sterren > 0 ? `${palen_count} +${sterren}⭐` : palen_count, w * 0.5, h * 0.08);

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
