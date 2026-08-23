// Gedeelde hulpfuncties voor alle pagina's
import { haalConfig } from './api.js?v=11';
import { PLAAGTEKSTEN } from './teksten.js?v=11';

// ── Voortgangsbalk ────────────────────────────────────────────────────────────

export function renderVoortgang(container, huidigLevel, gespeeldTm) {
  container.innerHTML = '';
  for (let i = 1; i <= 7; i++) {
    // Gespeelde levels en het actieve level zijn klikbaar: opnieuw spelen
    // mag altijd, want je hoogste score telt.
    const klikbaar = i <= Math.max(gespeeldTm + 1, huidigLevel);
    const blok = document.createElement(klikbaar ? 'a' : 'div');
    if (klikbaar) blok.href = `spel.html?level=${i}`;
    blok.className = 'voortgang-blokje';
    blok.textContent = i;
    if (i < huidigLevel || i <= gespeeldTm) blok.classList.add('gespeeld');
    if (i === huidigLevel) blok.classList.add('actief');
    container.appendChild(blok);
  }
}

// ── Navigatiebalk onderaan ────────────────────────────────────────────────────
// Vaste balk op elke pagina zodat spelers altijd kunnen wisselen tussen
// spelen, verslagen en de ranglijst.

export function renderNav(actief) {
  const nav = document.createElement('nav');
  nav.className = 'onder-nav';
  nav.innerHTML = [
    ['spelen',    'index.html',     '🎮', 'Spelen'],
    ['verslagen', 'verslagen.html', '📖', 'Verslagen'],
    ['ranglijst', 'ranglijst.html', '🏆', 'Ranglijst'],
  ].map(([key, url, icoon, label]) =>
    `<a href="${url}" class="onder-nav-item${key === actief ? ' actief' : ''}">
       <span class="onder-nav-icoon">${icoon}</span><span>${label}</span>
     </a>`
  ).join('');
  document.body.appendChild(nav);
  document.body.classList.add('met-nav');
  return nav;
}

// ── Landschapswaarschuwing ────────────────────────────────────────────────────

export function initLandschapswaarschuwing(element) {
  const controleer = () => {
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    element.style.display = landscape ? 'flex' : 'none';
  };
  window.addEventListener('orientationchange', controleer);
  window.addEventListener('resize', controleer);
  controleer();
}

// ── Score-tekst (plagerig) ────────────────────────────────────────────────────
// De teksten zelf staan in js/teksten.js (makkelijk zelf aan te passen);
// er wordt per keer willekeurig één gekozen uit de juiste scoreband.

export function plaatsTekst(score) {
  const band = PLAAGTEKSTEN.find(b => score >= b.vanaf) || PLAAGTEKSTEN[PLAAGTEKSTEN.length - 1];
  return band.teksten[Math.floor(Math.random() * band.teksten.length)];
}

// ── Clamp ────────────────────────────────────────────────────────────────────

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ── Navigatie ─────────────────────────────────────────────────────────────────

export function navigeerNaar(url) {
  window.location.href = url;
}

// ── Gesloten-check ────────────────────────────────────────────────────────────

export function checkGesloten() {
  const config = haalConfig();
  if (config.gesloten) {
    // Beheerpagina en eindstand blijven altijd bereikbaar
    const pad = window.location.pathname;
    if (pad.includes('admin.html') || pad.includes('eindstand.html')) return false;
    document.body.innerHTML = `
      <div class="gesloten-scherm">
        <div class="groot-icoon">🎮</div>
        <h1>Even geduld</h1>
        <p>Het spel is nog niet geopend,<br>of de vergadering is al begonnen.</p>
        <p class="klein">De eindstand wordt vanavond op de vergadering getoond.</p>
        <a href="eindstand.html" class="knop secundair" style="width:auto;margin-top:1rem;">
          Bekijk eindstand
        </a>
      </div>`;
    return true;
  }
  return false;
}

// ── Confetti ──────────────────────────────────────────────────────────────────

export function toonConfetti(canvasEl) {
  const w = canvasEl.width  = window.innerWidth;
  const h = canvasEl.height = window.innerHeight;
  const ctx = canvasEl.getContext('2d');
  const kleuren = ['#ccab37', '#e0c766', '#ffffff', '#4a8a6a', '#ccab37'];
  const deeltjes = Array.from({ length: 90 }, (_, i) => ({
    x: Math.random() * w,
    y: -20 - Math.random() * 80,
    dx: (Math.random() - 0.5) * 180,
    dy: 120 + Math.random() * 180,
    r: 4 + Math.random() * 5,
    kleur: kleuren[i % kleuren.length],
    rot: Math.random() * Math.PI * 2,
    drot: (Math.random() - 0.5) * 6,
  }));

  let begin = null;
  const looptijd = 2800;

  function stap(ts) {
    if (!begin) begin = ts;
    const dt = (ts - begin) / 1000;
    if (dt > looptijd / 1000) { ctx.clearRect(0, 0, w, h); return; }
    const alpha = Math.max(0, 1 - dt * 0.55);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const d of deeltjes) {
      d.x   += d.dx  * (1 / 60);
      d.y   += d.dy  * (1 / 60);
      d.rot += d.drot * (1 / 60);
      ctx.fillStyle = d.kleur;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillRect(-d.r, -d.r * 0.4, d.r * 2, d.r * 0.8);
      ctx.restore();
    }
    ctx.restore();
    requestAnimationFrame(stap);
  }
  requestAnimationFrame(stap);
}

// ── URL-params ────────────────────────────────────────────────────────────────

export function urlParam(naam) {
  return new URLSearchParams(window.location.search).get(naam);
}
