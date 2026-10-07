// Procedureel geluid: tempo-vast bed (96 BPM) + één motief + betekenisvolle UI-cues.
// Offline gerenderd met Web Audio, dus elke render is identiek.
(function () {
  const T = window.TIMELINE;
  const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  async function renderAudio() {
    const sr = 48000, dur = T.duration + 0.6;
    const ac = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    const rnd = mulberry32(T.seed + 7);
    const noise = ac.createBuffer(1, sr * 2, sr);
    { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }

    const master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp).connect(ac.destination);
    const bed = ac.createGain(); bed.connect(master);
    const sfx = ac.createGain(); sfx.gain.value = 1; sfx.connect(master);

    // bed-automatisering: stilte rond de turn, zodat de val hoorbaar is
    const BD = T.bed;
    bed.gain.setValueAtTime(0, 0);
    bed.gain.linearRampToValueAtTime(1, 1.2);
    bed.gain.setValueAtTime(1, BD.dropFrom - 0.02);
    bed.gain.linearRampToValueAtTime(0.3, BD.dropFrom + 0.05);
    bed.gain.setValueAtTime(0.3, BD.dropUntil);
    bed.gain.linearRampToValueAtTime(1, BD.dropUntil + 1.5);
    bed.gain.setValueAtTime(1, T.duration - 2.2);
    bed.gain.linearRampToValueAtTime(0, T.duration);

    const env = (g, t0, a, peak, d) => { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); };

    // pad
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 950; lp.Q.value = 0.4; lp.connect(bed);
    const chordLen = T.beat * 8;
    for (let k = 0; k * chordLen < T.duration; k++) {
      const t0 = k * chordLen; const notes = BD.chords[k % BD.chords.length];
      notes.slice(1).forEach((n, j) => {
        for (const det of [-7, 7]) {
          const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(n); o.detune.value = det;
          const g = ac.createGain(); const pan = ac.createStereoPanner(); pan.pan.value = (j % 2 ? 0.35 : -0.35) * (det > 0 ? 1 : 0.6);
          g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.022, t0 + 1.0);
          g.gain.setValueAtTime(0.022, t0 + chordLen - 0.4); g.gain.linearRampToValueAtTime(0, t0 + chordLen + 0.6);
          o.connect(g).connect(pan).connect(lp); o.start(t0); o.stop(t0 + chordLen + 0.7);
        }
      });
      // bas op tel 1 en 3 van elke maat
      for (let beat = 0; beat < 8; beat += 2) {
        const tb = t0 + beat * T.beat; if (tb >= T.duration) break;
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(notes[0] - 12);
        const g = ac.createGain(); env(g, tb, 0.02, 0.16, 1.0); o.connect(g).connect(bed); o.start(tb); o.stop(tb + 1.2);
      }
      // arpeggio op achtsten: draagt het tempo in model en bewijs
      for (let s = 0; s < 16; s++) {
        const ts = t0 + s * T.beat / 2;
        const on = (ts >= BD.arpFrom && ts < BD.arpUntil) || ts >= BD.arpBackFrom;
        if (!on || ts >= T.duration - 1) continue;
        const n = notes[1 + (s % 4)] + 12;
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(n);
        const g = ac.createGain(); env(g, ts, 0.004, s % 4 === 0 ? 0.05 : 0.032, 0.32);
        const pan = ac.createStereoPanner(); pan.pan.value = ((s % 4) - 1.5) * 0.18;
        o.connect(g).connect(pan).connect(bed); o.start(ts); o.stop(ts + 0.4);
      }
    }

    // helpers voor cues
    function tone(t, f, f2, a, peak, d, type = 'sine', bus = sfx) {
      const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
      const g = ac.createGain(); env(g, t, a, peak, d); o.connect(g).connect(bus); o.start(t); o.stop(t + a + d + 0.05);
    }
    function burst(t, dur, ftype, freq, peak) {
      const s = ac.createBufferSource(); s.buffer = noise;
      const f = ac.createBiquadFilter(); f.type = ftype; f.frequency.value = freq; f.Q.value = 0.8;
      const g = ac.createGain(); env(g, t, 0.002, peak, dur);
      s.connect(f).connect(g).connect(sfx); s.start(t, rnd() * 1.5, dur + 0.05);
    }
    function motif(t, gain) {
      [69, 74, 78].forEach((n, i) => {
        const tn = t + i * T.beat / 2;
        tone(tn, mtof(n), 0, 0.01, 0.15 * gain, 1.6);
        tone(tn, mtof(n) * 2, 0, 0.01, 0.035 * gain, 0.9);
      });
    }

    // typen van de zoekopdracht
    const [q0, q1] = T.moves['query.type'];
    for (let i = 0; i < 18; i++) burst(q0 + (q1 - q0) * (i + 0.5) / 18, 0.012, 'highpass', 3500, 0.05);

    for (const c of T.cues) {
      const t = c.t;
      switch (c.type) {
        case 'pop': tone(t, 880, 660, 0.004, 0.11, 0.12); break;
        case 'click': burst(t, 0.006, 'highpass', 3000, 0.2); tone(t, 2200, 0, 0.002, 0.05, 0.03); break;
        case 'refill': [86, 90, 93].forEach((n, i) => tone(t + i * 0.07, mtof(n), 0, 0.004, 0.06, 0.25)); break;
        case 'thud': tone(t, 120, 60, 0.004, 0.42, 0.22); burst(t, 0.03, 'lowpass', 600, 0.12); break;
        case 'tick': tone(t, 1500, 0, 0.002, 0.07, 0.04); break;
        case 'swell': {
          const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
          const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.2;
          const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.6); g.gain.linearRampToValueAtTime(0, t + 1.5);
          s.connect(f).connect(g).connect(sfx); s.start(t); s.stop(t + 1.6); break;
        }
        case 'switch': burst(t, 0.01, 'bandpass', 2200, 0.3); burst(t + 0.06, 0.012, 'bandpass', 1600, 0.25); break;
        case 'drop': tone(t, 440, 110, 0.01, 0.12, 0.5, 'triangle'); break;
        case 'motif': motif(t, c.gain || 1); break;
      }
    }

    const buf = await ac.startRendering();
    return { sr, L: buf.getChannelData(0), R: buf.getChannelData(1) };
  }

  // als base64 van interleaved float32 terug naar node
  window.renderAudioB64 = async function () {
    const { sr, L, R } = await renderAudio();
    const n = Math.round(T.duration * sr);
    const inter = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { inter[2 * i] = L[i]; inter[2 * i + 1] = R[i]; }
    const bytes = new Uint8Array(inter.buffer);
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return { sr, b64: btoa(s) };
  };
})();
