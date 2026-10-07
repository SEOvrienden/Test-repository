// Engine-runtime. Geeft elke film hetzelfde fundament:
// formaat en schaal, tijd en easing, tekst, camera, captions en window.seek(t).
// Een film levert window.SCENE = { focus(name) -> {x,y}, draw(t) }.
// Regel: elk frame is een pure functie van t (+ formaat + reduced-motion). Geen state tussen frames.
(function () {
  const T = window.TIMELINE;
  const BR = window.BRAND;
  const q = new URLSearchParams(location.search);
  const FORMAT = q.get('f') || 'wide';
  const RM = q.get('rm') === '1';
  const SIZES = { wide: [1920, 1080], tall: [1080, 1920], square: [1080, 1080] };
  const [PW, PH] = SIZES[FORMAT];
  // Schaal per formaat: layout op een virtueel canvas, daarna opgeschaald. Groter type op telefoon.
  const SCALE = Object.assign({ wide: 1.1, tall: 1.35, square: 1.2 }, (T.format && T.format.scale) || {});
  // Kleinste tekstmaat per formaat (virtueel). Tall en square: ≥ 11 px op een telefoon van 390 px breed.
  const MINS = Object.assign({ wide: 22, tall: 26, square: 26 }, (T.format && T.format.min) || {});
  const S = SCALE[FORMAT], MIN = MINS[FORMAT];
  const W = PW / S, H = PH / S;
  const C = BR.color;
  const UI = BR.type.ui, DISPLAY = BR.type.display;

  const canvas = document.getElementById('c');
  canvas.width = PW; canvas.height = PH;
  const ctx = canvas.getContext('2d');

  // ---------- tijd en easing ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) { const e = sx(t) - x; const d = dx(t); if (Math.abs(e) < 1e-7 || !d) break; t -= e / d; }
      let lo = 0, hi = 1;
      for (let i = 0; i < 30 && Math.abs(sx(t) - x) > 1e-7; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  const ease = bezier(0.3, 0.0, 0.12, 1.0); // komt tot rust zonder doorschieten
  const M = T.moves;
  const raw = (n, t) => { const [a, b] = M[n]; return clamp((t - a) / (b - a)); };
  // P: positie. In reduced motion een harde overgang op het midden, geen beweging.
  const P = (n, t) => { if (RM) { const [a, b] = M[n]; return t >= (a + b) / 2 ? 1 : 0; } return ease(raw(n, t)); };
  // F: dekking. In reduced motion een korte lineaire fade.
  const F = (n, t) => { if (RM) { const [a] = M[n]; return clamp((t - a) / 0.3); } return ease(raw(n, t)); };

  // seeded random: alleen deze, nooit Math.random()
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- tekst en vormen ----------
  const font = (size, weight = 400, fam = UI) => `${weight} ${Math.max(size, MIN)}px ${fam}`;
  function text(str, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 24, o.weight || 400, o.fam || UI);
    ctx.fillStyle = o.color || C.ink;
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function measure(str, size, weight = 400, fam = UI) { ctx.save(); ctx.font = font(size, weight, fam); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  function wrap(str, maxW, size, weight = 400, fam = UI) {
    const words = str.split(' '); const lines = []; let cur = '';
    for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (measure(tryS, size, weight, fam) > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS; }
    if (cur) lines.push(cur); return lines;
  }
  // gebalanceerd: zelfde aantal regels, zo gelijk mogelijk verdeeld (geen weesjes)
  function wrapBalanced(str, maxW, size, weight = 400, fam = UI) {
    const base = wrap(str, maxW, size, weight, fam);
    if (base.length < 2) return base;
    let lo = 0, hi = maxW;
    for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (wrap(str, mid, size, weight, fam).length > base.length) lo = mid; else hi = mid; }
    return wrap(str, hi + 1, size, weight, fam);
  }
  function rrect(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

  // ---------- camera ----------
  // T.camera: [{ t, zoom, focus }]. De film vertaalt focus-namen naar punten (SCENE.focus).
  // Beweegt alleen tussen sleutels; staat stil zolang twee sleutels gelijk zijn.
  function cameraAt(t, focusOf) {
    const K = T.camera; let i = 0;
    while (i < K.length - 1 && t >= K[i + 1].t) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
    const p = (b.t > a.t && !RM) ? ease(clamp((t - a.t) / (b.t - a.t))) : (t >= b.t ? 1 : 0);
    const fp = (f) => focusOf(f) || { x: W / 2, y: H / 2 };
    const fa = fp(a.focus), fb = fp(b.focus);
    let z = lerp(a.zoom, b.zoom, p);
    if (RM) z = 1;
    return { z, fx: lerp(fa.x, fb.x, p), fy: lerp(fa.y, fb.y, p) };
  }

  // ---------- captions ----------
  // Ingebrand, buiten de camera, max 2 regels, gebalanceerd. Zelfde bron als captions.srt.
  function drawCaption(t) {
    const pad = E.pad;
    const cap = T.captions.find((c) => t >= c.t0 && t < c.t1);
    if (!cap) return;
    const fa = Math.min(clamp((t - cap.t0) / 0.15), clamp((cap.t1 - t) / 0.15));
    // het vak blijft staan als de volgende caption direct aansluit; alleen de tekst wisselt
    const prevJoin = T.captions.some((c) => Math.abs(c.t1 - cap.t0) < 1e-3);
    const nextJoin = T.captions.some((c) => Math.abs(c.t0 - cap.t1) < 1e-3);
    const fb = Math.min(prevJoin ? 1 : clamp((t - cap.t0) / 0.15), nextJoin ? 1 : clamp((cap.t1 - t) / 0.15));
    const size = 34, maxW = W - pad * 2 - 56;
    const lines = wrapBalanced(cap.text, maxW, size, 400);
    const lw = Math.max(...lines.map((l) => measure(l, size)));
    const bh = lines.length * 46 + 30, bw = lw + 56;
    const bx = W / 2 - bw / 2, by = H - 52 - bh;
    ctx.save(); ctx.globalAlpha = 0.94 * fb;
    rrect(bx, by, bw, bh, 12); ctx.fillStyle = C.captionBg; ctx.fill(); ctx.restore();
    lines.forEach((l, i) => text(l, W / 2, by + 15 + 34 + i * 46 - 4, { size, color: C.captionInk, align: 'center', alpha: fa }));
  }

  // ---------- frame ----------
  function seek(t) {
    t = clamp(t, 0, T.duration);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.ground; ctx.fillRect(0, 0, PW, PH);
    const SC = window.SCENE;
    const cam = cameraAt(t, SC.focus || (() => null));
    ctx.setTransform(S * cam.z, 0, 0, S * cam.z, S * (cam.fx - cam.fx * cam.z), S * (cam.fy - cam.fy * cam.z));
    SC.draw(t);
    // captions buiten de camera
    ctx.setTransform(S, 0, 0, S, 0, 0);
    drawCaption(t);
  }

  // Laagste dekking waarbij tekst in kleur fg op achtergrond bg nog contrast `target` haalt (WCAG).
  // Gebruik bij dimmen: alpha = Math.max(gewenst, E.minAlpha(C.ink, C.surface)).
  function minAlpha(fg, bg, target = 4.5) {
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const f = rgb(fg), g = rgb(bg);
    for (let a = 0; a <= 1.0001; a += 0.01) { const m = f.map((v, i) => Math.round(v * a + g[i] * (1 - a))); if (ratio(m, g) >= target) return Math.min(1, a); }
    return 1;
  }

  const E = {
    T, BRAND: BR, C, UI, DISPLAY, FORMAT, RM, PW, PH, S, MIN, W, H, ctx,
    pad: 72, // vaste marge (virtuele px)
    // safe area voor inhoud: boven pad, onder ruimte voor 2-regelige captions
    safe: { y0: 72, y1: H - 230 },
    clamp, lerp, bezier, ease, M, raw, P, F, mulberry32,
    font, text, measure, wrap, wrapBalanced, rrect, lerpRect, cameraAt, drawCaption, minAlpha,
  };
  window.E = E;
  window.seek = seek;
})();
