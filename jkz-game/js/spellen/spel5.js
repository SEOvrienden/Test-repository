// Spel 5 — Snake
// Vloeiend: de slang glijdt tussen de vakjes (interpolatie) en je tikjes
// komen in een rijtje te staan — draaien gebeurt netjes op de volgende stap,
// dus je hoeft nooit "op precies het juiste moment" te klikken.
// Sturen kan met de knoppen én door links/rechts op het veld te tikken.
// Oefenen: 30 sec, botsen = waarschuwing (snake wrapt door muren).
import { speel } from '../geluid.js?v=25';
import { clamp } from '../app.js?v=25';

export const info = {
  naam: 'Snake',
  uitleg: 'Stuur de slang linksom of rechtsom: met de knoppen, of door links '
        + 'of rechts op het veld te tikken. Tik gerust vooruit — je bochten '
        + 'worden onthouden en netjes na elkaar genomen. Eet de appels, '
        + 'elke 5e is goud en telt dubbel!',
  scoreRegel: 'Zo scoor je: 4 punten per appel, een gouden appel telt voor 2. '
            + '25 appels = 100 punten.',
  demoHTML: `<div class="demo-snake"><div class="demo-snake-lichaam"></div></div>`,
};

const RASTER = 15;
const SNELHEID_BASIS  = 2.5; // cellen per seconde
const SNELHEID_STAP   = 0.5; // sneller per 5 appels
const OEFENEN_DUUR    = 30;  // seconden
const MAX_WACHTRIJ    = 3;   // zoveel bochten mag je vooruit tikken

function berekenScore(appels) {
  // 100 pas bij 25 appelpunten (≈ 21 gegeten appels) — dan is de slang al lang
  return clamp(appels * 4, 0, 100);
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
  let vorigeSlang = slang.map(s => ({ ...s })); // voor de vloeiende animatie
  let richting = 'O';
  let wachtrij = [];     // 'L' / 'R' — bochten die nog genomen moeten worden
  let appel = plaatsAppel();
  let appels = 0;        // telt mee voor de score (gouden appel = +2)
  let aantalAppels = 0;  // aantal gegeten appels; elke 5e is goud
  let appelIsGoud = false;
  let tijdSindsStap = 0;
  let snelheid = SNELHEID_BASIS;
  let vernietigd = false;
  let gepauzeerd = false;
  let animId = null;
  let oefenRestTijd = OEFENEN_DUUR;
  let oefenInterval = null;

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
    ctx.fillStyle = '#0f333c';
    ctx.fillRect(0, 0, w, h);

    // Grid (subtiel)
    ctx.strokeStyle = 'rgba(31,77,88,0.35)';
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

    // Appel (elke 5e is goud, met een pulserend randje, en telt dubbel)
    const ax = appel.x * cel + cel * 0.5;
    const ay = appel.y * cel + cel * 0.5;
    if (appelIsGoud) {
      const puls = 1 + Math.sin(performance.now() / 180) * 0.12;
      ctx.fillStyle = '#f2c069';
      ctx.beginPath();
      ctx.arc(ax, ay, cel * 0.42 * puls, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff2c4';
      ctx.lineWidth = cel * 0.08;
      ctx.stroke();
    } else {
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
    }

    // Slang: vloeiend getekend als één lijn door de tussen-de-vakjes-posities
    const t = clamp(tijdSindsStap * snelheid, 0, 1); // hoe ver in de huidige stap
    const punten = slang.map((seg, idx) => {
      const oud = vorigeSlang[idx] || vorigeSlang[vorigeSlang.length - 1] || seg;
      // Geen rare veeg over het veld bij een wrap (alleen in oefenmodus)
      const spring = Math.abs(seg.x - oud.x) > 1 || Math.abs(seg.y - oud.y) > 1;
      const lx = spring ? seg.x : oud.x + (seg.x - oud.x) * t;
      const ly = spring ? seg.y : oud.y + (seg.y - oud.y) * t;
      return { x: lx * cel + cel * 0.5, y: ly * cel + cel * 0.5 };
    });

    if (punten.length === 1) {
      ctx.fillStyle = '#e8a33d';
      ctx.beginPath();
      ctx.arc(punten[0].x, punten[0].y, cel * 0.44, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#b5812e';
      ctx.lineWidth = cel * 0.78;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(punten[0].x, punten[0].y);
      for (let i = 1; i < punten.length; i++) {
        // Sprong (wrap in oefenmodus): lijn onderbreken i.p.v. dwars over het veld
        const afstand = Math.hypot(punten[i].x - punten[i - 1].x, punten[i].y - punten[i - 1].y);
        if (afstand > cel * 2.5) { ctx.moveTo(punten[i].x, punten[i].y); continue; }
        ctx.lineTo(punten[i].x, punten[i].y);
      }
      ctx.stroke();
    }

    // Kop (goud, met oogjes zodat je de richting ziet)
    const kop = punten[0];
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(kop.x, kop.y, cel * 0.46, 0, Math.PI * 2);
    ctx.fill();
    const dir = RICHTINGEN[richting];
    ctx.fillStyle = '#0f333c';
    ctx.beginPath();
    ctx.arc(kop.x + dir.x * cel * 0.18 - dir.y * cel * 0.14,
            kop.y + dir.y * cel * 0.18 - dir.x * cel * 0.14, cel * 0.07, 0, Math.PI * 2);
    ctx.arc(kop.x + dir.x * cel * 0.18 + dir.y * cel * 0.14,
            kop.y + dir.y * cel * 0.18 + dir.x * cel * 0.14, cel * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  function stap(delta) {
    tijdSindsStap += delta;
    const stapInterval = 1 / snelheid;

    while (tijdSindsStap >= stapInterval) {
      tijdSindsStap -= stapInterval;
      beweeg();
      if (vernietigd) return;
    }
  }

  function beweeg() {
    // Neem de volgende bocht uit de wachtrij (één per stap)
    if (wachtrij.length) {
      const b = wachtrij.shift();
      richting = b === 'L' ? LINKS_VAN[richting] : RECHTS_VAN[richting];
    }
    vorigeSlang = slang.map(s => ({ ...s }));
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
      appels += appelIsGoud ? 2 : 1;
      aantalAppels++;
      appelsEl.textContent = appels;
      appel = plaatsAppel();
      appelIsGoud = (aantalAppels + 1) % 5 === 0;
      // Versnellen per 5 punten
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
    if (!vernietigd) tekenAlles();
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

  // Besturing: bochten komen in een wachtrij, dus tikken kan nooit "te vroeg"
  function draai(kant) {
    if (wachtrij.length >= MAX_WACHTRIJ) return;
    speel('tik');
    wachtrij.push(kant);
  }
  function draaiLinks(e)  { e.preventDefault(); draai('L'); }
  function draaiRechts(e) { e.preventDefault(); draai('R'); }

  linksKnop.addEventListener('pointerdown', draaiLinks);
  rechtsKnop.addEventListener('pointerdown', draaiRechts);

  // Extra: tik links of rechts op het speelveld zelf
  function onVeldTik(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    draai(e.clientX - rect.left < rect.width / 2 ? 'L' : 'R');
  }
  canvas.addEventListener('pointerdown', onVeldTik);

  // Keyboard fallback (desktop)
  function onKey(e) {
    if (e.key === 'ArrowLeft')  draai('L');
    if (e.key === 'ArrowRight') draai('R');
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
      canvas.removeEventListener('pointerdown', onVeldTik);
      window.removeEventListener('keydown', onKey);
    },
  };
}
