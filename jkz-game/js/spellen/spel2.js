// Spel 2 — JKZ Breakout
// Kaats de bal met je plateau omhoog en speel de letters J K Z leeg.
// Valt de bal naast je plateau, dan is het voorbij. Canvas + delta-tijd.
// Oefenen: 30 seconden vrij spelen, gemiste bal komt gewoon terug.
import { speel } from '../geluid.js?v=5';
import { clamp } from '../app.js?v=5';

export const info = {
  naam: 'JKZ Breakout',
  uitleg: 'Sleep je plateau onderin heen en weer en kaats de bal omhoog. '
        + 'Speel de letters JKZ zo snel mogelijk leeg. Mis je de bal, dan is het voorbij.',
  scoreRegel: 'Zo scoor je: 2 punten per steen, plus een dikke tijdbonus als je alles leegspeelt.',
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
const PEDDEL_B     = 92;    // px breedte
const PEDDEL_H     = 12;
const BAL_R        = 7;

function berekenScore(stenen, totaal, seconden, allesWeg) {
  let score = stenen * 2;
  if (allesWeg) {
    // Tijdbonus: binnen 45 s de volle 38 punten, daarna langzaam minder
    const bonus = seconden <= 45 ? 38 : Math.max(10, 38 - (seconden - 45) * 0.5);
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
      <div class="onebutton-hint">Sleep om je plateau te bewegen &nbsp;🧱</div>
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
  let peddelX   = W() / 2;
  let balX = 0, balY = 0, balVX = 0, balVY = 0;
  let kapot      = 0;
  let tijd       = 0;
  let isGestart  = false;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId     = null;
  let vorigeTs   = null;

  function resetBal() {
    balX = peddelX;
    balY = H() - 60;
    // Schuin omhoog, willekeurig links of rechts
    const hoek = (Math.random() * 0.5 + 0.35) * Math.PI; // 63°–153°
    const snelheid = BAL_SNELHEID * Math.pow(VERSNELLING, Math.floor(kapot / 5));
    balVX = Math.cos(hoek) * snelheid;
    balVY = -Math.abs(Math.sin(hoek) * snelheid);
  }
  resetBal();

  function start() {
    if (isGestart || vernietigd) return;
    isGestart = true;
    animId = requestAnimationFrame(loop);
  }

  function eindeSpel(allesWeg) {
    vernietigd = true;
    cancelAnimationFrame(animId);
    const sec = Math.round(tijd);
    const score = berekenScore(kapot, TOTAAL_STENEN, sec, allesWeg);
    const ruwe = allesWeg
      ? `alles leeg in ${sec} s`
      : `${kapot} van ${TOTAAL_STENEN} stenen in ${sec} s`;
    onKlaar(ruwe, score);
  }

  function balGemist() {
    speel('fout');
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if (isOefenen) { resetBal(); return; }
    eindeSpel(false);
  }

  function update(delta) {
    tijd += delta;
    if (isOefenen && tijd >= OEFEN_DUUR) { eindeSpel(false); return; }

    const w = W(), h = H();
    balX += balVX * delta;
    balY += balVY * delta;

    // Muren
    if (balX - BAL_R < 0)  { balX = BAL_R;      balVX =  Math.abs(balVX); }
    if (balX + BAL_R > w)  { balX = w - BAL_R;  balVX = -Math.abs(balVX); }
    if (balY - BAL_R < 0)  { balY = BAL_R;      balVY =  Math.abs(balVY); }

    // Peddel
    const peddelY = h - 34;
    if (balVY > 0 && balY + BAL_R >= peddelY && balY + BAL_R <= peddelY + PEDDEL_H + 14) {
      if (balX >= peddelX - PEDDEL_B / 2 - BAL_R && balX <= peddelX + PEDDEL_B / 2 + BAL_R) {
        balY = peddelY - BAL_R;
        balVY = -Math.abs(balVY);
        // Hoek afhankelijk van waar je raakt, zodat je kunt mikken
        const rel = (balX - peddelX) / (PEDDEL_B / 2);
        const snelheid = Math.hypot(balVX, balVY);
        const hoek = rel * 0.9; // max ~52 graden opzij
        balVX = Math.sin(hoek) * snelheid;
        balVY = -Math.cos(hoek) * snelheid;
        speel('tik');
      }
    }

    // Onder het scherm
    if (balY - BAL_R > h) { balGemist(); return; }

    // Stenen
    for (const s of stenen) {
      if (s.weg) continue;
      if (balX + BAL_R > s.x && balX - BAL_R < s.x + s.b &&
          balY + BAL_R > s.y && balY - BAL_R < s.y + s.h) {
        s.weg = true;
        kapot++;
        speel('treffer');
        // Kaatsrichting: van de kant die het dichtstbij is
        const overlX = Math.min(balX + BAL_R - s.x, s.x + s.b - (balX - BAL_R));
        const overlY = Math.min(balY + BAL_R - s.y, s.y + s.h - (balY - BAL_R));
        if (overlX < overlY) balVX = -balVX; else balVY = -balVY;
        // Iets sneller per 5 stenen
        if (kapot % 5 === 0) { balVX *= VERSNELLING; balVY *= VERSNELLING; }
        if (kapot >= TOTAAL_STENEN) { eindeSpel(true); return; }
        break;
      }
    }
  }

  function teken() {
    const w = W(), h = H();
    ctx.fillStyle = '#0f241a';
    ctx.fillRect(0, 0, w, h);

    // Stenen
    for (const s of stenen) {
      if (s.weg) continue;
      ctx.fillStyle = '#ccab37';
      ctx.fillRect(s.x, s.y, s.b, s.h);
      ctx.strokeStyle = 'rgba(15,36,26,0.6)';
      ctx.strokeRect(s.x, s.y, s.b, s.h);
    }

    // Peddel
    const peddelY = h - 34;
    ctx.fillStyle = '#e0c766';
    ctx.fillRect(peddelX - PEDDEL_B / 2, peddelY, PEDDEL_B, PEDDEL_H);

    // Bal
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(balX, balY, BAL_R, 0, Math.PI * 2);
    ctx.fill();

    // Teller
    ctx.fillStyle = 'rgba(204,171,55,0.9)';
    ctx.font = `bold ${Math.round(h * 0.045)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
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
    if (!isGestart) { balX = peddelX; teken(); }
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
