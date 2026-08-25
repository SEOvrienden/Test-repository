// Spel 2 — JKZ Breakout
// Kaats de bal met je plateau omhoog en speel de letters J K Z leeg.
// - De middelste rij van elke letter is HARD: die stenen moet je 2x raken.
// - Soms valt er een ster: vang hem en je krijgt een EXTRA bal (max 3).
// - Pas als je álle ballen mist, is het voorbij.
// Oefenen: 30 seconden vrij spelen, gemiste bal komt gewoon terug.
import { speel } from '../geluid.js?v=19';
import { clamp } from '../app.js?v=19';

export const info = {
  naam: 'JKZ Breakout',
  uitleg: 'Kaats de bal omhoog en speel de letters JKZ zo snel mogelijk leeg. '
        + 'Lichte stenen moet je 2x raken. Vang de vallende ster voor een extra bal!',
  scoreRegel: 'Zo scoor je: 2 punten per steen. De volle tijdbonus krijg je alleen '
            + 'als je álles leegspeelt binnen 35 seconden.',
  demoHTML: `<div class="demo-breakout">
    <div class="demo-bo-stenen">
      <div></div><div></div><div></div><div></div><div></div><div></div>
    </div>
    <div class="demo-bo-bal"></div>
    <div class="demo-bo-peddel"></div>
  </div>`,
};

// Pixel-letters J, K, Z — 5 kolommen x 5 rijen per letter
const LETTERS = [
  ['..###',
   '...#.',
   '...#.',
   '#..#.',
   '.##..'],
  ['#..#.',
   '#.#..',
   '##...',
   '#.#..',
   '#..#.'],
  ['#####',
   '...#.',
   '..#..',
   '.#...',
   '#####'],
];

const OEFEN_DUUR   = 30;    // seconden
const BAL_SNELHEID = 300;   // px/s startsnelheid
const VERSNELLING  = 1.045; // per 5 stenen
const PEDDEL_B     = 92;
const PEDDEL_H     = 12;
const BAL_R        = 7;
const STER_KANS    = 0.18;  // kans op een ster bij een kapotte steen
const STER_SNELHEID = 150;  // px/s omlaag
const MAX_BALLEN   = 3;

function berekenScore(stenen, seconden, allesWeg) {
  let score = stenen * 2;
  if (allesWeg) {
    // Tijdbonus: alleen de volle 36 punten bij leegspelen binnen 35 s,
    // daarna loopt hij snel terug — 100 halen vergt dus écht tempo
    const bonus = seconden <= 35 ? 36 : Math.max(6, 36 - (seconden - 35));
    score += bonus;
  }
  return clamp(Math.round(score), 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="onebutton-container">
      <div class="onebutton-canvas-wrap">
        <canvas id="bo-canvas"></canvas>
      </div>
      <div class="onebutton-hint">Sleep om je plateau te bewegen &nbsp;🧱&nbsp; Vang ⭐ voor een extra bal</div>
    </div>`;

  const canvas = container.querySelector('#bo-canvas');
  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;

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

  // ── Stenen opbouwen: 3 letters van 5 breed met 1 kolom ruimte = 17 kolommen ──
  const KOLOMMEN = 17;
  let stenen = [];
  function bouwStenen() {
    stenen = [];
    const w = W();
    const rand = 10;
    const steenB = (w - rand * 2) / KOLOMMEN;
    const steenH = Math.min(steenB * 0.72, 20);
    const topY = 12;
    LETTERS.forEach((letter, li) => {
      const startKolom = li * 6; // 5 breed + 1 ruimte
      letter.forEach((rij, ri) => {
        [...rij].forEach((cel, ci) => {
          if (cel === '#') {
            stenen.push({
              x: rand + (startKolom + ci) * steenB,
              y: topY + ri * (steenH + 2),
              b: steenB - 2,
              h: steenH,
              // Middelste rij van elke letter is hard: 2x raken
              hits: ri === 2 ? 2 : 1,
              weg: false,
            });
          }
        });
      });
    });
  }
  bouwStenen();
  const TOTAAL_STENEN = stenen.length;

  // ── Spelstatus ────────────────────────────────────────────────────────────
  let peddelX    = W() / 2;
  let ballen     = [];
  let sterren    = [];
  let kapot      = 0;
  let tijd       = 0;
  let isGestart  = false;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId     = null;
  let vorigeTs   = null;

  function balSnelheid() {
    return BAL_SNELHEID * Math.pow(VERSNELLING, Math.floor(kapot / 5));
  }

  function maakBal(x, y) {
    const hoek = (Math.random() * 0.5 + 0.35) * Math.PI; // 63°–153°
    const s = balSnelheid();
    return { x, y, vx: Math.cos(hoek) * s, vy: -Math.abs(Math.sin(hoek) * s) };
  }

  function resetBallen() {
    ballen = [maakBal(peddelX, H() - 60)];
  }
  resetBallen();

  function start() {
    if (isGestart || vernietigd) return;
    isGestart = true;
    animId = requestAnimationFrame(loop);
  }

  function eindeSpel(allesWeg) {
    vernietigd = true;
    cancelAnimationFrame(animId);
    const sec = Math.round(tijd);
    const score = berekenScore(kapot, sec, allesWeg);
    const ruwe = allesWeg
      ? `alles leeg in ${sec} s`
      : `${kapot} van ${TOTAAL_STENEN} stenen in ${sec} s`;
    onKlaar(ruwe, score);
  }

  function alleBallenWeg() {
    speel('fout');
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if (isOefenen) { resetBallen(); return; }
    eindeSpel(false);
  }

  function raakSteen(bal, s) {
    s.hits--;
    speel('treffer');
    if (s.hits <= 0) {
      s.weg = true;
      kapot++;
      // Soms valt er een ster (alleen als er nog niet te veel ballen zijn)
      if (Math.random() < STER_KANS && ballen.length < MAX_BALLEN) {
        sterren.push({ x: s.x + s.b / 2, y: s.y + s.h });
      }
    }
    // Kaatsrichting: van de kant die het dichtstbij is
    const overlX = Math.min(bal.x + BAL_R - s.x, s.x + s.b - (bal.x - BAL_R));
    const overlY = Math.min(bal.y + BAL_R - s.y, s.y + s.h - (bal.y - BAL_R));
    if (overlX < overlY) bal.vx = -bal.vx; else bal.vy = -bal.vy;
    // Iets sneller per 5 stenen
    if (s.weg && kapot % 5 === 0) {
      for (const b of ballen) { b.vx *= VERSNELLING; b.vy *= VERSNELLING; }
    }
  }

  function update(delta) {
    tijd += delta;
    if (isOefenen && tijd >= OEFEN_DUUR) { eindeSpel(false); return; }

    const w = W(), h = H();
    const peddelY = h - 34;

    // Sterren vallen
    for (let i = sterren.length - 1; i >= 0; i--) {
      const st = sterren[i];
      st.y += STER_SNELHEID * delta;
      // Gevangen met het plateau?
      if (st.y >= peddelY - 6 && st.y <= peddelY + PEDDEL_H + 10 &&
          st.x >= peddelX - PEDDEL_B / 2 - 10 && st.x <= peddelX + PEDDEL_B / 2 + 10) {
        sterren.splice(i, 1);
        if (ballen.length < MAX_BALLEN) {
          ballen.push(maakBal(peddelX, peddelY - 20));
          speel('nieuwRecord');
        }
        continue;
      }
      if (st.y > h + 20) sterren.splice(i, 1);
    }

    // Ballen
    for (let bi = ballen.length - 1; bi >= 0; bi--) {
      const bal = ballen[bi];
      bal.x += bal.vx * delta;
      bal.y += bal.vy * delta;

      // Muren
      if (bal.x - BAL_R < 0)  { bal.x = BAL_R;      bal.vx =  Math.abs(bal.vx); }
      if (bal.x + BAL_R > w)  { bal.x = w - BAL_R;  bal.vx = -Math.abs(bal.vx); }
      if (bal.y - BAL_R < 0)  { bal.y = BAL_R;      bal.vy =  Math.abs(bal.vy); }

      // Plateau
      if (bal.vy > 0 && bal.y + BAL_R >= peddelY && bal.y + BAL_R <= peddelY + PEDDEL_H + 14) {
        if (bal.x >= peddelX - PEDDEL_B / 2 - BAL_R && bal.x <= peddelX + PEDDEL_B / 2 + BAL_R) {
          bal.y = peddelY - BAL_R;
          const rel = (bal.x - peddelX) / (PEDDEL_B / 2);
          const snelheid = Math.hypot(bal.vx, bal.vy);
          const hoek = rel * 0.9;
          bal.vx = Math.sin(hoek) * snelheid;
          bal.vy = -Math.cos(hoek) * snelheid;
          speel('tik');
        }
      }

      // Onder het scherm: deze bal is weg
      if (bal.y - BAL_R > h) {
        ballen.splice(bi, 1);
        if (ballen.length === 0) { alleBallenWeg(); return; }
        continue;
      }

      // Stenen
      for (const s of stenen) {
        if (s.weg) continue;
        if (bal.x + BAL_R > s.x && bal.x - BAL_R < s.x + s.b &&
            bal.y + BAL_R > s.y && bal.y - BAL_R < s.y + s.h) {
          raakSteen(bal, s);
          if (kapot >= TOTAAL_STENEN) { eindeSpel(true); return; }
          break;
        }
      }
    }
  }

  function teken() {
    const w = W(), h = H();
    ctx.fillStyle = '#0f333c';
    ctx.fillRect(0, 0, w, h);

    // Stenen — harde stenen (2 hits over) zijn licht, normale goud
    for (const s of stenen) {
      if (s.weg) continue;
      ctx.fillStyle = s.hits >= 2 ? '#f2c069' : '#e8a33d';
      ctx.fillRect(s.x, s.y, s.b, s.h);
      ctx.strokeStyle = s.hits >= 2 ? 'rgba(255,255,255,0.5)' : 'rgba(15,36,26,0.6)';
      ctx.strokeRect(s.x, s.y, s.b, s.h);
    }

    // Sterren
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const st of sterren) ctx.fillText('⭐', st.x, st.y);

    // Plateau
    const peddelY = h - 34;
    ctx.fillStyle = '#f2c069';
    ctx.fillRect(peddelX - PEDDEL_B / 2, peddelY, PEDDEL_B, PEDDEL_H);

    // Ballen
    ctx.fillStyle = '#ffffff';
    for (const bal of ballen) {
      ctx.beginPath();
      ctx.arc(bal.x, bal.y, BAL_R, 0, Math.PI * 2);
      ctx.fill();
    }

    // Teller
    ctx.fillStyle = 'rgba(232,163,61,0.9)';
    ctx.font = `bold ${Math.round(h * 0.045)}px 'Courier New', monospace`;
    ctx.fillText(`${kapot}/${TOTAAL_STENEN}`, w * 0.5, h * 0.5);
    if (isOefenen) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.round(h * 0.03)}px system-ui, sans-serif`;
      ctx.fillText(`nog ${Math.max(0, Math.ceil(OEFEN_DUUR - tijd))} s`, w * 0.5, h * 0.56);
    }

    if (!isGestart) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = `${Math.round(h * 0.035)}px system-ui, sans-serif`;
      ctx.fillText('Sleep of tik om te beginnen', w * 0.5, h * 0.62);
    }
  }

  function loop(ts) {
    if (vernietigd) return;
    if (gepauzeerd) { animId = requestAnimationFrame(loop); return; }
    if (vorigeTs === null) vorigeTs = ts;
    const delta = Math.min((ts - vorigeTs) / 1000, 0.1);
    vorigeTs = ts;
    update(delta);
    if (!vernietigd) teken();
    animId = requestAnimationFrame(loop);
  }

  teken();

  // ── Besturing: vinger of muis volgt, pijltjes op desktop ──────────────────
  function zetPeddel(clientX) {
    const rect = canvas.getBoundingClientRect();
    peddelX = clamp(clientX - rect.left, PEDDEL_B / 2, W() - PEDDEL_B / 2);
    if (!isGestart) { ballen[0].x = peddelX; teken(); }
  }
  function onPointerDown(e) { e.preventDefault(); zetPeddel(e.clientX); start(); }
  function onPointerMove(e) { if (e.buttons || e.pointerType === 'touch') { e.preventDefault(); zetPeddel(e.clientX); } }
  function onKey(e) {
    if (e.key === 'ArrowLeft')  { peddelX = clamp(peddelX - 28, PEDDEL_B / 2, W() - PEDDEL_B / 2); start(); }
    if (e.key === 'ArrowRight') { peddelX = clamp(peddelX + 28, PEDDEL_B / 2, W() - PEDDEL_B / 2); start(); }
  }
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('keydown', onKey);

  return {
    pauzeer() { gepauzeerd = true; vorigeTs = null; },
    hervat()  { gepauzeerd = false; vorigeTs = null; },
    vernietig() {
      vernietigd = true;
      cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('keydown', onKey);
    },
  };
}
