// Spel 7 — Pong tegen de computer
// Jij onderin, de computer bovenin. De bal wordt steeds sneller.
// Hoe vaker jij hem terugslaat, hoe hoger je score. Mis = einde.
// Oefenen: 20 seconden vrij spelen, gemiste bal komt gewoon terug.
import { speel } from '../geluid.js?v=6';
import { clamp } from '../app.js?v=6';

export const info = {
  naam: 'Pong',
  uitleg: 'Sleep je peddel onderin heen en weer en sla de bal terug. '
        + 'De bal wordt steeds sneller én je peddel krimpt — hoe lang hou jij het vol?',
  scoreRegel: 'Zo scoor je: 8 punten per keer dat jij de bal terugslaat. 13 keer = 100 punten.',
  demoHTML: `<div class="demo-pong">
    <div class="demo-pong-cpu"></div>
    <div class="demo-pong-bal"></div>
    <div class="demo-pong-speler"></div>
  </div>`,
};

const OEFEN_DUUR    = 20;    // seconden
const BAL_SNELHEID  = 260;   // px/s start
const VERSNELLING   = 1.06;  // per terugslag van de speler
const PEDDEL_B      = 92;
const PEDDEL_H      = 12;
const BAL_R         = 7;
const CPU_MAX       = 210;   // px/s — haalbaar te verslaan zodra de bal sneller wordt

function berekenScore(terugslagen) {
  return clamp(terugslagen * 8, 0, 100);
}

export function maakSpel(container, { modus, onKlaar }) {
  const isOefenen = modus === 'oefenen';

  container.innerHTML = `
    <div class="onebutton-container">
      <div class="onebutton-canvas-wrap">
        <canvas id="pong-canvas"></canvas>
      </div>
      <div class="onebutton-hint">Sleep om je peddel te bewegen &nbsp;🏓</div>
    </div>`;

  const canvas = container.querySelector('#pong-canvas');
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

  // ── Spelstatus ────────────────────────────────────────────────────────────
  let spelerX = W() / 2;
  let spelerB = PEDDEL_B; // krimpt elke 3 terugslagen iets
  let cpuX    = W() / 2;
  let balX = 0, balY = 0, balVX = 0, balVY = 0;
  let terugslagen = 0;
  let tijd        = 0;
  let isGestart   = false;
  let vernietigd  = false;
  let gepauzeerd  = false;
  let animId      = null;
  let vorigeTs    = null;

  function resetBal(richtingOmlaag) {
    balX = W() / 2;
    balY = H() / 2;
    const snelheid = BAL_SNELHEID * Math.pow(VERSNELLING, terugslagen);
    const hoek = (Math.random() * 0.6 - 0.3); // licht schuin
    balVX = Math.sin(hoek) * snelheid;
    balVY = (richtingOmlaag ? 1 : -1) * Math.cos(hoek) * snelheid;
  }
  resetBal(true);

  function start() {
    if (isGestart || vernietigd) return;
    isGestart = true;
    animId = requestAnimationFrame(loop);
  }

  function eindeSpel() {
    vernietigd = true;
    cancelAnimationFrame(animId);
    onKlaar(`${terugslagen} keer teruggeslagen`, berekenScore(terugslagen));
  }

  function gemist() {
    speel('fout');
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    if (isOefenen) { resetBal(true); return; }
    eindeSpel();
  }

  function update(delta) {
    tijd += delta;
    if (isOefenen && tijd >= OEFEN_DUUR) { eindeSpel(); return; }

    const w = W(), h = H();
    balX += balVX * delta;
    balY += balVY * delta;

    // Zijmuren
    if (balX - BAL_R < 0) { balX = BAL_R;     balVX =  Math.abs(balVX); }
    if (balX + BAL_R > w) { balX = w - BAL_R; balVX = -Math.abs(balVX); }

    // Computer beweegt naar de bal, met een maximum snelheid
    const doel = balX;
    const diff = doel - cpuX;
    const stap = clamp(diff, -CPU_MAX * delta, CPU_MAX * delta);
    cpuX = clamp(cpuX + stap, PEDDEL_B / 2, w - PEDDEL_B / 2);

    // Computerpeddel bovenin
    const cpuY = 22;
    if (balVY < 0 && balY - BAL_R <= cpuY + PEDDEL_H && balY - BAL_R >= cpuY - 14) {
      if (balX >= cpuX - PEDDEL_B / 2 - BAL_R && balX <= cpuX + PEDDEL_B / 2 + BAL_R) {
        balY = cpuY + PEDDEL_H + BAL_R;
        const rel = (balX - cpuX) / (PEDDEL_B / 2);
        const snelheid = Math.hypot(balVX, balVY);
        const hoek = rel * 0.85;
        balVX = Math.sin(hoek) * snelheid;
        balVY = Math.cos(hoek) * snelheid;
        speel('tik');
      }
    }

    // Spelerpeddel onderin
    const spelerY = h - 34;
    if (balVY > 0 && balY + BAL_R >= spelerY && balY + BAL_R <= spelerY + PEDDEL_H + 14) {
      if (balX >= spelerX - spelerB / 2 - BAL_R && balX <= spelerX + spelerB / 2 + BAL_R) {
        balY = spelerY - BAL_R;
        terugslagen++;
        speel('treffer');
        // Elke 3 terugslagen krimpt je peddel een stukje (minimaal 56 px)
        if (terugslagen % 3 === 0) spelerB = Math.max(56, spelerB - 7);
        const rel = (balX - spelerX) / (spelerB / 2);
        const snelheid = Math.hypot(balVX, balVY) * VERSNELLING;
        const hoek = rel * 0.85;
        balVX = Math.sin(hoek) * snelheid;
        balVY = -Math.cos(hoek) * snelheid;
      }
    }

    // Bal voorbij de computer (bovenkant): punt voor jou, bal komt terug
    if (balY + BAL_R < -20) { resetBal(true); return; }

    // Bal voorbij jou (onderkant): gemist
    if (balY - BAL_R > h) { gemist(); return; }
  }

  function teken() {
    const w = W(), h = H();
    ctx.fillStyle = '#0f241a';
    ctx.fillRect(0, 0, w, h);

    // Middenlijn
    ctx.strokeStyle = 'rgba(204,171,55,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Computerpeddel
    ctx.fillStyle = '#8fa79a';
    ctx.fillRect(cpuX - PEDDEL_B / 2, 22, PEDDEL_B, PEDDEL_H);

    // Spelerpeddel
    ctx.fillStyle = '#e0c766';
    ctx.fillRect(spelerX - spelerB / 2, h - 34, spelerB, PEDDEL_H);

    // Bal
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(balX, balY, BAL_R, 0, Math.PI * 2);
    ctx.fill();

    // Teller
    ctx.fillStyle = 'rgba(204,171,55,0.9)';
    ctx.font = `bold ${Math.round(h * 0.05)}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(terugslagen, w * 0.5, h * 0.60);
    if (isOefenen) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.round(h * 0.03)}px system-ui, sans-serif`;
      ctx.fillText(`nog ${Math.max(0, Math.ceil(OEFEN_DUUR - tijd))} s`, w * 0.5, h * 0.66);
    }

    if (!isGestart) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = `${Math.round(h * 0.035)}px system-ui, sans-serif`;
      ctx.fillText('Sleep of tik om te beginnen', w * 0.5, h * 0.70);
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

  // ── Besturing ─────────────────────────────────────────────────────────────
  function zetPeddel(clientX) {
    const rect = canvas.getBoundingClientRect();
    spelerX = clamp(clientX - rect.left, spelerB / 2, W() - spelerB / 2);
  }
  function onPointerDown(e) { e.preventDefault(); zetPeddel(e.clientX); start(); }
  function onPointerMove(e) { if (e.buttons || e.pointerType === 'touch') { e.preventDefault(); zetPeddel(e.clientX); } }
  function onKey(e) {
    if (e.key === 'ArrowLeft')  { spelerX = clamp(spelerX - 28, spelerB / 2, W() - spelerB / 2); start(); }
    if (e.key === 'ArrowRight') { spelerX = clamp(spelerX + 28, spelerB / 2, W() - spelerB / 2); start(); }
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
