// WebAudio-geluiden — geen externe bestanden
let ctx = null;
let gemuted = localStorage.getItem('jkz_mute') === 'true';

function zorgVoorCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function toon(freq, duur, type = 'sine', volume = 0.3) {
  if (gemuted || !ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duur);
  } catch (e) { /* stil falen */ }
}

const geluiden = {
  tik() {
    toon(660, 0.06, 'sine', 0.2);
  },
  treffer() {
    toon(880, 0.08, 'sine', 0.25);
    setTimeout(() => toon(1100, 0.06, 'sine', 0.2), 80);
  },
  fout() {
    toon(220, 0.15, 'square', 0.2);
    setTimeout(() => toon(180, 0.2, 'square', 0.15), 100);
  },
  gameOver() {
    toon(440, 0.12, 'sawtooth', 0.2);
    setTimeout(() => toon(330, 0.12, 'sawtooth', 0.18), 120);
    setTimeout(() => toon(220, 0.3, 'sawtooth', 0.15), 240);
  },
  nieuwRecord() {
    const noten = [523, 659, 784, 1047];
    noten.forEach((n, i) => setTimeout(() => toon(n, 0.12, 'sine', 0.25), i * 80));
  },
  levelKlaar() {
    const noten = [523, 659, 784, 659, 784, 1047];
    noten.forEach((n, i) => setTimeout(() => toon(n, 0.1, 'sine', 0.22), i * 70));
  },
  simon(kleur) {
    const freqs = [440, 550, 660, 330];
    toon(freqs[kleur] || 440, 0.3, 'sine', 0.3);
  },
  aftelling() {
    toon(440, 0.1, 'sine', 0.2);
  },
  start() {
    toon(880, 0.15, 'sine', 0.3);
  },
};

export function speel(type) {
  zorgVoorCtx();
  if (gemuted) return;
  const fn = geluiden[type];
  if (fn) fn();
}

// Simon-specifieke versie met kleurindex
export function speelSimon(kleur) {
  zorgVoorCtx();
  if (gemuted) return;
  geluiden.simon(kleur);
}

export function startAudioContext() {
  zorgVoorCtx();
}

export function setMute(muted) {
  gemuted = muted;
  localStorage.setItem('jkz_mute', muted ? 'true' : 'false');
}

export function isMuted() {
  return gemuted;
}
