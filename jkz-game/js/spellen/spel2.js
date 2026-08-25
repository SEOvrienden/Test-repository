// Spel 2 — JKZ Breakout
// Kaats de bal met je plateau omhoog en speel de letters J K Z leeg.
// - De middelste rij van elke letter is HARD: die stenen moet je 2x raken.
// - Soms valt er een ster: vang hem en je krijgt een EXTRA bal (max 3).
// - Soms valt er een roze bol: vang hem en elke bal splitst tijdelijk in 3!
// - LET OP: zodra je 2 of meer ballen hebt, vallen er bommen. Raakt een bom
//   je plateau, dan ben je al je extra ballen in één klap kwijt.
// - Pas als je álle (grote) ballen mist, is het voorbij.
// Oefenen: 30 seconden vrij spelen, gemiste bal komt gewoon terug.
import { speel } from '../geluid.js?v=23';
import { clamp } from '../app.js?v=23';

export const info = {
  naam: 'JKZ Breakout',
  uitleg: 'Kaats de bal omhoog en speel de letters JKZ zo snel mogelijk leeg. '
        + 'Lichte stenen moet je 2x raken. Vang ⭐ voor een extra bal en de '
        + 'roze bol om elke bal tijdelijk in 3 te splitsen. Maar pas op: met '
        + '2 of meer ballen vallen er bommen — raakt een bom je plateau, dan '
        + 'ben je je extra ballen kwijt!',
  scoreRegel: 'Zo scoor je: 2 punten per steen. De volle tijdbonus krijg je alleen '
            + 'als je álles leegspeelt binnen 30 seconden.',
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
const VERSNELLING  = 1.05;  // per 5 stenen
const PEDDEL_B     = 92;
const PEDDEL_H     = 12;
const BAL_R        = 7;
const MINI_R       = 4;     // straal van de tijdelijke splitballetjes
const MINI_DUUR    = 6;     // seconden dat splitballetjes bestaan
const STER_KANS    = 0.13;  // kans op een ster bij een kapotte steen
const SPLIT_KANS   = 0.10;  // kans op een split-bol bij een kapotte steen
const VAL_SNELHEID = 150;   // px/s omlaag (sterren en bollen)
const BOM_SNELHEID = 200;   // px/s omlaag (bommen)
const MAX_BALLEN   = 3;     // maximum aantal GROTE ballen

function berekenScore(stenen, seconden, allesWeg) {
  let score = stenen * 2;
  if (allesWeg) {
    // Tijdbonus: alleen de volle 36 punten bij leegspelen binnen 30 s,
    // daarna loopt hij snel terug — 100 halen vergt dus écht tempo
    const bonus = seconden <= 30 ? 36 : Math.max(4, Math.round(36 - (seconden - 30) * 1.5));
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
      <div class="onebutton-hint">Sleep om te bewegen &nbsp;🧱&nbsp; Vang ⭐ en de roze bol, ontwijk 💣</div>
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
  let ballen     = [];      // {x, y, vx, vy, mini, tot?}
  let bonussen   = [];      // vallende power-ups: {x, y, type: 'ster'|'split'}
  let bommen     = [];      // vallende bommen: {x, y}
  let bomTimer   = 0;
  let kapot      = 0;
  let tijd       = 0;
  let flitsTot   = 0;       // rood flitsje na een bominslag
  let isGestart  = false;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId     = null;
  let vorigeTs   = null;

  function balSnelheid() {
    return BAL_SNELHEID * Math.pow(VERSNELLING, Math.floor(kapot / 5));
  }

  function maakBal(x, y, mini) {
    const hoek = (Math.random() * 0.5 + 0.35) * Math.PI; // 63°–153°
    const s = balSnelheid();
    const bal = { x, y, vx: Math.cos(hoek) * s, vy: -Math.abs(Math.sin(hoek) * s), mini: !!mini };
    if (mini) bal.tot = tijd + MINI_DUUR;
    return bal;
  }

  function groteBallen() { return ballen.filter(b => !b.mini); }

  function resetBallen() {
    ballen = [maakBal(peddelX, H() - 60, false)];
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

  function bomInslag() {
    // Een bom op je plateau: alle ballen weg behalve één grote —
    // je bent dus in één klap al je extra's kwijt.
    speel('fout');
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    flitsTot = performance.now() + 260;
    const groot = groteBallen();
    ballen = groot.length ? [groot[0]] : [ballen[0]];
    ballen[0].mini = false;
    delete ballen[0].tot;
  }

  function raakSteen(bal, s) {
    s.hits--;
    speel('treffer');
    if (s.hits <= 0) {
      s.weg = true;
      kapot++;
      // Soms valt er een power-up uit de kapotte steen
      const r = Math.random();
      if (r < SPLIT_KANS) {
        bonussen.push({ x: s.x + s.b / 2, y: s.y + s.h, type: 'split' });
      } else if (r < SPLIT_KANS + STER_KANS && groteBallen().length < MAX_BALLEN) {
        bonussen.push({ x: s.x + s.b / 2, y: s.y + s.h, type: 'ster' });
      }
    }
    // Kaatsrichting: van de kant die het dichtstbij is
    const r2 = bal.mini ? MINI_R : BAL_R;
    const overlX = Math.min(bal.x + r2 - s.x, s.x + s.b - (bal.x - r2));
    const overlY = Math.min(bal.y + r2 - s.y, s.y + s.h - (bal.y - r2));
    if (overlX < overlY) bal.vx = -bal.vx; else bal.vy = -bal.vy;
    // Iets sneller per 5 stenen
    if (s.weg && kapot % 5 === 0) {
      for (const b of ballen) { b.vx *= VERSNELLING; b.vy *= VERSNELLING; }
    }
  }

  function splits() {
    // Elke huidige grote bal krijgt er 2 tijdelijke mini-balletjes bij.
    // Mini's breken stenen mee, maar mogen missen zonder straf.
    speel('nieuwRecord');
    for (const b of groteBallen()) {
      for (let i = 0; i < 2; i++) {
        const mini = maakBal(b.x, b.y, true);
        const hoek = Math.atan2(b.vy, b.vx) + (i === 0 ? -0.55 : 0.55);
        const s = Math.hypot(b.vx, b.vy);
        mini.vx = Math.cos(hoek) * s;
        mini.vy = Math.sin(hoek) * s;
        ballen.push(mini);
      }
    }
  }

  function update(delta) {
    tijd += delta;
    if (isOefenen && tijd >= OEFEN_DUUR) { eindeSpel(false); return; }

    const w = W(), h = H();
    const peddelY = h - 34;

    // Verlopen mini-balletjes opruimen
    ballen = ballen.filter(b => !b.mini || tijd < b.tot);

    // Power-ups vallen
    for (let i = bonussen.length - 1; i >= 0; i--) {
      const st = bonussen[i];
      st.y += VAL_SNELHEID * delta;
      // Gevangen met het plateau?
      if (st.y >= peddelY - 6 && st.y <= peddelY + PEDDEL_H + 10 &&
          st.x >= peddelX - PEDDEL_B / 2 - 10 && st.x <= peddelX + PEDDEL_B / 2 + 10) {
        bonussen.splice(i, 1);
        if (st.type === 'split') {
          splits();
        } else if (groteBallen().length < MAX_BALLEN) {
          ballen.push(maakBal(peddelX, peddelY - 20, false));
          speel('nieuwRecord');
        }
        continue;
      }
      if (st.y > h + 20) bonussen.splice(i, 1);
    }

    // Bommen: alleen zodra je 2 of meer ballen in de lucht hebt
    if (!isOefenen && ballen.length >= 2) {
      bomTimer -= delta;
      if (bomTimer <= 0) {
        bommen.push({ x: 24 + Math.random() * (w - 48), y: -14 });
        bomTimer = 2.0 + Math.random() * 1.4;
      }
    } else {
      bomTimer = Math.max(bomTimer, 0.8);
    }
    for (let i = bommen.length - 1; i >= 0; i--) {
      const bm = bommen[i];
      bm.y += BOM_SNELHEID * delta;
      if (bm.y >= peddelY - 6 && bm.y <= peddelY + PEDDEL_H + 10 &&
          bm.x >= peddelX - PEDDEL_B / 2 - 8 && bm.x <= peddelX + PEDDEL_B / 2 + 8) {
        bommen.splice(i, 1);
        bomInslag();
        continue;
      }
      if (bm.y > h + 20) bommen.splice(i, 1);
    }

    // Ballen
    for (let bi = ballen.length - 1; bi >= 0; bi--) {
      const bal = ballen[bi];
      const r = bal.mini ? MINI_R : BAL_R;
      bal.x += bal.vx * delta;
      bal.y += bal.vy * delta;

      // Muren
      if (bal.x - r < 0)  { bal.x = r;      bal.vx =  Math.abs(bal.vx); }
      if (bal.x + r > w)  { bal.x = w - r;  bal.vx = -Math.abs(bal.vx); }
      if (bal.y - r < 0)  { bal.y = r;      bal.vy =  Math.abs(bal.vy); }

      // Plateau
      if (bal.vy > 0 && bal.y + r >= peddelY && bal.y + r <= peddelY + PEDDEL_H + 14) {
        if (bal.x >= peddelX - PEDDEL_B / 2 - r && bal.x <= peddelX + PEDDEL_B / 2 + r) {
          bal.y = peddelY - r;
          const rel = (bal.x - peddelX) / (PEDDEL_B / 2);
          const snelheid = Math.hypot(bal.vx, bal.vy);
          const hoek = rel * 0.9;
          bal.vx = Math.sin(hoek) * snelheid;
          bal.vy = -Math.cos(hoek) * snelheid;
          speel('tik');
        }
      }

      // Onder het scherm: deze bal is weg (een mini kost je niets)
      if (bal.y - r > h) {
        ballen.splice(bi, 1);
        if (groteBallen().length === 0) { alleBallenWeg(); return; }
        continue;
      }

      // Stenen
      for (const s of stenen) {
        if (s.weg) continue;
        if (bal.x + r > s.x && bal.x - r < s.x + s.b &&
            bal.y + r > s.y && bal.y - r < s.y + s.h) {
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

    // Power-ups: ster of roze split-bol
    ctx.textAlign = 'center';
    for (const st of bonussen) {
      if (st.type === 'ster') {
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText('⭐', st.x, st.y);
      } else {
        ctx.fillStyle = '#d8548f';
        ctx.beginPath();
        ctx.arc(st.x, st.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText('3', st.x, st.y - 1.5);
      }
    }

    // Bommen
    ctx.font = '16px system-ui, sans-serif';
    for (const bm of bommen) ctx.fillText('💣', bm.x, bm.y);

    // Plateau (flitst rood na een bominslag)
    const peddelY = h - 34;
    ctx.fillStyle = performance.now() < flitsTot ? '#d4541a' : '#f2c069';
    ctx.fillRect(peddelX - PEDDEL_B / 2, peddelY, PEDDEL_B, PEDDEL_H);

    // Ballen (mini's zijn kleiner en roze)
    for (const bal of ballen) {
      ctx.fillStyle = bal.mini ? '#d8548f' : '#ffffff';
      ctx.beginPath();
      ctx.arc(bal.x, bal.y, bal.mini ? MINI_R : BAL_R, 0, Math.PI * 2);
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
