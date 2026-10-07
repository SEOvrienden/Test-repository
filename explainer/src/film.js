// Explainer "SEO vs SEA". window.seek(t) tekent het frame op tijd t.
// Elk frame is een pure functie van t (+ formaat + reduced-motion vlag).
(function () {
  const T = window.TIMELINE;
  const q = new URLSearchParams(location.search);
  const FORMAT = q.get('f') || 'wide';
  const RM = q.get('rm') === '1';
  const SIZES = { wide: [1920, 1080], tall: [1080, 1920], square: [1080, 1080] };
  const [PW, PH] = SIZES[FORMAT];
  // Schaal per formaat: layout op een virtueel canvas, daarna opgeschaald. Groter type op telefoon.
  const S = { wide: 1.1, tall: 1.35, square: 1.2 }[FORMAT];
  // Kleinste tekstmaat per formaat (virtueel). Tall en square: ≥ 11 px op een telefoon van 390 px breed.
  const MIN = { wide: 22, tall: 26, square: 26 }[FORMAT];
  const COMPACT = FORMAT === 'square'; // 1:1 laat de omschrijving op de kaart weg
  const W = PW / S, H = PH / S;

  const C = {
    ground: '#F4EFE6', surface: '#FFFCF7', ink: '#1E1C19', ink2: '#5A554D',
    rule: '#D8D0C2', accent: '#185E44', accentSoft: '#DCEBE2',
    captionBg: '#1E1C19', captionInk: '#FFFCF7',
  };

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

  // seeded random
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rnd = mulberry32(T.seed);
  const CLICK_JIT = Array.from({ length: 6 }, () => rnd());

  // ---------- tekst ----------
  const font = (size, weight = 400, fam = 'Inter') => `${weight} ${Math.max(size, MIN)}px ${fam}`;
  function text(str, x, y, o = {}) {
    ctx.save();
    ctx.font = font(o.size || 24, o.weight || 400, o.fam || 'Inter');
    ctx.fillStyle = o.color || C.ink;
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function measure(str, size, weight = 400, fam = 'Inter') { ctx.save(); ctx.font = font(size, weight, fam); const w = ctx.measureText(str).width; ctx.restore(); return w; }
  function wrap(str, maxW, size, weight = 400, fam = 'Inter') {
    const words = str.split(' '); const lines = []; let cur = '';
    for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (measure(tryS, size, weight, fam) > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS; }
    if (cur) lines.push(cur); return lines;
  }
  // gebalanceerd: zelfde aantal regels, zo gelijk mogelijk verdeeld (geen weesjes)
  function wrapBalanced(str, maxW, size, weight = 400, fam = 'Inter') {
    const base = wrap(str, maxW, size, weight, fam);
    if (base.length < 2) return base;
    let lo = 0, hi = maxW;
    for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (wrap(str, mid, size, weight, fam).length > base.length) lo = mid; else hi = mid; }
    return wrap(str, hi + 1, size, weight, fam);
  }
  function rrect(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const lerpRect = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

  // ---------- inhoud ----------
  const QUERY = 'loodgieter zaandam';
  const SITE = 'jouwbedrijf.nl';
  const CARD = {
    A: { sponsored: true, title: 'Loodgieter Zaandam, vandaag nog geholpen', desc: 'Snel ter plaatse. Bel of plan direct online.' },
    B: { sponsored: false, title: 'Loodgieter in Zaandam | Lekkage, cv en afvoer', desc: 'Lekkage of verstopping? Wij helpen in Zaandam en omgeving.' },
  };
  const BLOCKS = ['content', 'techniek', 'links'];

  // ---------- layout per formaat ----------
  const pad = 72;
  const kind = FORMAT;
  const cy0 = pad, cy1 = H - 230;
  const anchorSize = kind === 'wide' ? 62 : 58;

  function cardMetrics(key, w) {
    const c = CARD[key]; const cp = 28; const iw = w - cp * 2;
    const tl = wrap(c.title, iw, 32, 600);
    const dl = COMPACT ? [] : wrap(c.desc, iw, 24, 400);
    const h = cp + (c.sponsored ? 34 : 0) + 34 + 14 + tl.length * 40 + (dl.length ? 6 + dl.length * 33 : 0) + cp - 6;
    return { tl, dl, h, cp };
  }

  const L = (function () {
    const o = {};
    // SERP
    const serpW = kind === 'wide' ? 880 : W - pad * 2;
    const cw = serpW - 8; // kaart = paneelbreedte min rand; tekst staat 28 px binnen de kaart
    const hA = cardMetrics('A', cw).h, hB = cardMetrics('B', cw).h;
    const serpH = 32 + 72 + 24 + hA + 8 + hB + 20;
    let serpX, serpY;
    if (kind === 'wide') { serpX = pad + 24; serpY = (cy0 + cy1) / 2 - serpH / 2 + 10; o.anchor = { x: serpX + serpW + 72, y: (cy0 + cy1) / 2 - anchorSize * 0.6, align: 'left' }; }
    else if (kind === 'tall') { const top = (cy0 + cy1) / 2 - (serpH + 230) / 2; serpX = pad; serpY = top + 230; o.anchor = { x: W / 2, y: top + 62, align: 'center' }; }
    else { const capTop = H - 52 - 122 - 24; const top = (cy0 + capTop) / 2 - (serpH + 150) / 2 + 10; serpX = pad; serpY = top + 150; o.anchor = { x: W / 2, y: top + 52, align: 'center' }; }
    o.serp = { x: serpX, y: serpY, w: serpW, h: serpH };
    o.query = { x: serpX + 32, y: serpY + 32, w: serpW - 64, h: 72 };
    o.slotA = { x: serpX + 4, y: serpY + 32 + 72 + 24, w: cw, h: hA, lw: cw };
    o.slotB = { x: serpX + 4, y: o.slotA.y + hA + 8, w: cw, h: hB, lw: cw };

    // Lanen
    if (kind === 'tall') {
      const aH = 124 + cardMetrics('A', W - pad * 2).h + 76 + 48 + 24;
      o.laneA = { x: pad, y0: cy0, y1: cy0 + aH, w: W - pad * 2 };
      o.laneB = { x: pad, y0: cy0 + aH + 40, y1: cy1, w: W - pad * 2 };
    } else {
      const gut = kind === 'wide' ? 96 : 48;
      const lw = (W - pad * 2 - gut) / 2;
      o.laneA = { x: pad, y0: cy0, y1: cy1, w: lw };
      o.laneB = { x: pad + lw + gut, y0: cy0, y1: cy1, w: lw };
    }
    const lhA = cardMetrics('A', o.laneA.w).h, lhB = cardMetrics('B', o.laneB.w).h;
    o.laneCardA = { x: o.laneA.x, y: o.laneA.y0 + 124, w: o.laneA.w, h: lhA, lw: o.laneA.w };
    o.blockH = kind === 'wide' ? 72 : 58; o.blockGap = kind === 'wide' ? 12 : 8;
    o.laneCardB0 = { x: o.laneB.x, y: o.laneB.y1 - lhB, w: o.laneB.w, h: lhB, lw: o.laneB.w };
    o.budget = { x: o.laneA.x, y: o.laneCardA.y + lhA + 76, w: o.laneA.w, h: 48 };

    // Grafiek
    const rightRoom = kind === 'wide' ? 240 : 210;
    if (kind === 'wide') { o.plot = { x0: pad + 70, x1: W - pad - rightRoom, y0: cy0 + 170, y1: cy1 - 110 }; }
    else if (kind === 'tall') { o.plot = { x0: pad + 40, x1: W - pad - rightRoom, y0: cy0 + 400, y1: cy1 - 120 }; }
    else { o.plot = { x0: pad + 40, x1: W - pad - rightRoom, y0: cy0 + 230, y1: cy1 - 100 }; }
    o.chartTitle = { x: kind === 'wide' ? pad : pad, y: cy0 + 36 };
    // schakelaar boven het omslagpunt: oorzaak en gevolg in één blikveld
    { const pw = 300, ph = 70; const sx = lerp(o.plot.x0, o.plot.x1, T.chart.switchMonth / T.chart.months);
      o.pill = { x: clamp(sx - pw / 2, pad, W - pad - pw), y: o.plot.y0 - ph - 30, w: pw, h: ph, sx }; }
    o.plotAnchor = { x: o.plot.x0 + 32, y: o.plot.y0 + 58 };
    return o;
  })();

  // ---------- grafiekmodel ----------
  const CH = T.chart;
  const xOf = (m) => lerp(L.plot.x0, L.plot.x1, m / CH.months);
  const yOf = (v) => L.plot.y1 - v * 1.1 * (L.plot.y1 - L.plot.y0);
  const logistic = (z) => 1 / (1 + Math.exp(-z));
  const org = (m) => {
    const l0 = logistic((0 - CH.orgMid) / CH.orgWidth);
    const l = logistic((m - CH.orgMid) / CH.orgWidth);
    return CH.orgFloor + (CH.orgTop - CH.orgFloor) * (l - l0) / (1 - l0);
  };
  function monthAt(t) {
    const [a1, b1] = M.run1, [a2, b2] = M.run2;
    let m;
    if (t < a1) m = 0;
    else if (t < b1) m = CH.switchMonth * (t - a1) / (b1 - a1);
    else if (t < a2) m = CH.switchMonth;
    else if (t < b2) m = CH.switchMonth + (CH.months - CH.switchMonth) * (t - a2) / (b2 - a2);
    else m = CH.months;
    if (RM) { // stapsgewijs in plaats van een bewegende afspeelkop
      const steps = t < b1 + 0.01 ? CH.switchMonth / 6 : (CH.months - CH.switchMonth) / 2;
      const base = t < b1 + 0.01 ? 0 : CH.switchMonth;
      m = base + Math.floor((m - base) / steps + 1e-6) * steps;
    }
    return m;
  }
  // advertentiewaarde op maand m, gegeven hoe ver de val is (dropP)
  const adsAt = (m, dropP) => (m <= CH.switchMonth ? CH.adsLevel : CH.adsLevel * (1 - dropP));

  // ---------- camera ----------
  function cameraAt(t) {
    const K = T.camera; let i = 0;
    while (i < K.length - 1 && t >= K[i + 1].t) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
    const p = (b.t > a.t && !RM) ? ease(clamp((t - a.t) / (b.t - a.t))) : (t >= b.t ? 1 : 0);
    const fp = (f) => f === 'serp' ? { x: L.serp.x + L.serp.w / 2, y: L.serp.y + L.serp.h / 2 }
      : f === 'switchPoint' ? { x: xOf(CH.switchMonth), y: (L.pill.y + yOf(0)) / 2 } : { x: W / 2, y: H / 2 };
    const fa = fp(a.focus), fb = fp(b.focus);
    let z = lerp(a.zoom, b.zoom, p);
    if (RM) z = 1;
    return { z, fx: lerp(fa.x, fb.x, p), fy: lerp(fa.y, fb.y, p) };
  }

  // ---------- onderdelen ----------
  function favicon(x, y, r, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = C.accentSoft; ctx.fill();
    ctx.restore();
    text('J', x, y + 7, { size: 19, weight: 600, color: C.accent, align: 'center', alpha: a });
  }

  // Kaart: één object dat als zoekresultaat, als laan-kop en als label leeft.
  function drawCard(key, r, o) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    const c = CARD[key];
    ctx.save();
    ctx.globalAlpha = a;
    if (o.box > 0) {
      rrect(r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = C.surface; ctx.fill();
      ctx.globalAlpha = a * o.box; ctx.lineWidth = 2;
      ctx.strokeStyle = key === 'B' ? C.accent : C.ink2;
      if (key === 'A') ctx.setLineDash([10, 7]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = a;
    }
    const ta = o.textAlpha == null ? 1 : o.textAlpha;
    if (ta > 0) {
      const m = cardMetrics(key, o.lw);
      const x = r.x + m.cp; let y = r.y + m.cp;
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      if (c.sponsored) { text('Gesponsord', x, y + 22, { size: 26, weight: 600, color: C.ink, alpha: ta }); y += 34; }
      favicon(x + 15, y + 15, 15, ta);
      text(SITE, x + 42, y + 23, { size: 23, color: C.ink2, alpha: ta });
      y += 34 + 14;
      for (const ln of m.tl) { y += 32; text(ln, x, y, { size: 32, weight: 600, color: C.ink, alpha: ta }); y += 8; }
      y += 6;
      for (const ln of m.dl) { y += 25; text(ln, x, y, { size: 24, color: C.ink2, alpha: ta }); y += 8; }
      ctx.restore();
    }
    ctx.restore();
  }

  function chipRect(key, x, y) {
    const label = key === 'A' ? 'Advertentie' : 'Organisch';
    const w = 16 + 18 + 12 + measure(label, 24, 600) + 18; const h = 46;
    return { x: x + 16, y: y - h / 2, w, h, label };
  }
  function drawChipContent(key, r, a) {
    if (a <= 0) return;
    const cx = r.x + 16 + 9, cy = r.y + r.h / 2;
    ctx.save(); ctx.globalAlpha *= a;
    if (key === 'A') { ctx.fillStyle = C.ink2; ctx.fillRect(cx - 8, cy - 8, 16, 16); }
    else { ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill(); }
    ctx.restore();
    text(key === 'A' ? 'Advertentie' : 'Organisch', r.x + 16 + 18 + 12, cy + 8, { size: 24, weight: 600, color: key === 'A' ? C.ink : C.accent, alpha: a });
  }

  // Twee labels mogen elkaar niet overlappen
  function separate(ra, rb, gap = 8) {
    const top = ra.y < rb.y ? ra : rb, bot = top === ra ? rb : ra;
    const ov = top.y + top.h + gap - bot.y;
    if (ov > 0) { top.y -= ov / 2; bot.y += ov / 2; }
  }

  function drawQuery(t, a) {
    const r = L.query;
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, 36); ctx.fillStyle = C.surface; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    // vergrootglas
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x + 40, r.y + 33, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x + 48, r.y + 41); ctx.lineTo(r.x + 57, r.y + 50); ctx.stroke();
    ctx.restore();
    const n = Math.ceil(QUERY.length * (RM ? (t >= M['query.type'][0] ? 1 : 0) : raw('query.type', t)));
    const s = QUERY.slice(0, n);
    text(s, r.x + 78, r.y + 46, { size: 28, color: C.ink, alpha: a });
    const typing = t > M['query.type'][0] && t < M['query.type'][1] + 0.4;
    if (typing && !RM) { const cw = measure(s, 28); ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.ink; ctx.fillRect(r.x + 80 + cw, r.y + 20, 2, 34); ctx.restore(); }
  }

  function drawAnchor(lines, x, y, align, a, size, color) {
    if (a <= 0) return;
    lines.forEach((ln, i) => {
      if (!ln) return;
      const la = Array.isArray(a) ? a[i] : a;
      text(ln, x, y + i * size * 1.15, { size, weight: 700, fam: 'Caladea', color: color || C.ink, align, alpha: la });
    });
  }

  function drawBudget(r, t, a) {
    if (a <= 0) return;
    text('Budget', r.x, r.y - 14, { size: 23, weight: 600, color: C.ink2, alpha: a });
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    const n = 6, g = 6, sw = (r.w - 12 - g * (n - 1)) / n;
    const refill = P('budget.refill', t);
    for (let i = 0; i < n; i++) {
      const ci = n - i; // klik 1 haalt het laatste segment weg
      const [, ce] = M['click.' + ci];
      const gone = clamp((t - ce) / 0.3);
      const goneE = RM ? (t >= ce ? 1 : 0) : ease(gone);
      const sx = r.x + 6 + i * (sw + g);
      // terugvullen van links naar rechts
      const back = clamp(refill * n - i);
      const vis = Math.max(1 - goneE, back);
      const dy = (1 - back) * goneE * (RM ? 0 : 18);
      ctx.globalAlpha = a * vis;
      ctx.fillStyle = C.ink2;
      rrect(sx, r.y + 6 + dy, sw, r.h - 12, 6); ctx.fill();
    }
    ctx.restore();
  }

  function drawPill(r, t, a, offP) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, r.h / 2); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    // schakelaar
    const tw = 76, th = 40, tx = r.x + r.w - tw - 18, ty = r.y + (r.h - th) / 2;
    rrect(tx, ty, tw, th, th / 2); ctx.fillStyle = offP > 0.5 ? C.rule : C.ink; ctx.fill();
    if (offP > 0.5) { ctx.lineWidth = 2; ctx.strokeStyle = C.ink2; ctx.stroke(); }
    const kx = lerp(tx + tw - th / 2, tx + th / 2, offP);
    ctx.beginPath(); ctx.arc(kx, ty + th / 2, th / 2 - 4, 0, Math.PI * 2); ctx.fillStyle = C.surface; ctx.fill();
    ctx.restore();
    text('Budget', r.x + 26, r.y + r.h / 2 + 10, { size: 30, weight: 600, color: C.ink, alpha: a });
    text(offP > 0.5 ? 'uit' : 'aan', r.x + 26 + measure('Budget ', 30, 600), r.y + r.h / 2 + 10, { size: 30, weight: 400, color: C.ink2, alpha: a });
  }

  function drawLaneTitle(lane, title, sub, a, color) {
    if (a <= 0) return;
    text(title, lane.x, lane.y0 + 50, { size: 48, weight: 700, fam: 'Caladea', color, alpha: a });
    text(sub, lane.x, lane.y0 + 92, { size: 24, color: C.ink2, alpha: a });
  }

  function blockRect(i, t) {
    const p = P('block.' + (i + 1), t);
    // een nieuw blok schuift onderin en tilt alles erboven op: van boven gelezen content, techniek, links
    let above = 0; for (let j = i + 1; j < 3; j++) above += P('block.' + (j + 1), t) * (L.blockH + L.blockGap);
    const r = { x: L.laneB.x, y: L.laneB.y1 - L.blockH - above, w: L.laneB.w, h: L.blockH };
    return { r: { ...r, x: r.x - (1 - p) * 60 }, p, a: F('block.' + (i + 1), t) };
  }
  function cardBLaneRect(t) {
    let lift = 0; for (let i = 0; i < 3; i++) lift += P('block.' + (i + 1), t) * (L.blockH + L.blockGap);
    return { ...L.laneCardB0, y: L.laneCardB0.y - lift };
  }

  function drawCaption(t) {
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

    const cam = cameraAt(t);
    ctx.setTransform(S * cam.z, 0, 0, S * cam.z, S * (cam.fx - cam.fx * cam.z), S * (cam.fy - cam.fy * cam.z));

    const split = P('split', t), splitF = F('serp.out', t);
    const toChart = P('toChart', t), toChartF = F('toChart', t);
    const toSerp = P('toSerp', t);
    // eerst de grafiek weg, dan de zoekpagina erin: nooit twee beelden over elkaar
    const toSerpF = RM ? F('toSerp', t) : ease(clamp(raw('toSerp', t) * 2.5));
    const serpIn = RM ? F('toSerp', t) : ease(clamp((raw('toSerp', t) - 0.4) / 0.6));
    const inS1 = t < M.split[1] + 0.01;
    const inChart = t >= M.toChart[0] && t < M.toSerp[1];
    const m = monthAt(t);
    const offP = P('switch.off', t);
    const dropP = P('ads.drop', t);

    // --- SERP-paneel (S1 en S5)
    const serpA = Math.max(F('serp.in', t) * (1 - splitF), serpIn);
    if (serpA > 0) {
      ctx.save(); ctx.globalAlpha = serpA;
      rrect(L.serp.x, L.serp.y, L.serp.w, L.serp.h, 20); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
      ctx.restore();
      drawQuery(t >= M.toSerp[0] ? T.duration : t, serpA);
    }

    // --- lanen (S2)
    const laneOut = 1 - clamp(toChartF * 2.5);
    const laneA = F('laneA.title', t) * laneOut;
    const laneB = F('laneB.title', t) * laneOut;
    drawLaneTitle(L.laneA, 'Advertentie', 'Google Ads · huur je per klik', laneA, C.ink);
    drawLaneTitle(L.laneB, 'Organisch', 'SEO · bouw je op', laneB, C.accent);

    // budgetbalk wordt de schakelaar
    const budgetA = F('budget.in', t);
    if (t < M.toSerp[0]) {
      if (toChart <= 0) drawBudget(L.budget, t, budgetA);
      else {
        const r = lerpRect({ ...L.budget }, L.pill, toChart);
        if (toChart < 1) {
          ctx.save(); ctx.globalAlpha = 1 - clamp(toChart * 2);
          drawBudget({ ...r, w: Math.max(r.w, 1) }, t, 1); ctx.restore();
        }
        drawPill(L.pill, t, clamp(toChart * 2 - 1), offP);
      }
    }
    if (t >= M.toSerp[0]) drawPill(L.pill, t, 1 - toSerpF, offP);

    // blokken (worden de tijdas)
    if (t < M.toSerp[0]) {
      for (let i = 0; i < 3; i++) {
        const { r, a } = blockRect(i, t);
        if (a <= 0) continue;
        const axisR = { x: lerp(L.plot.x0, L.plot.x1, i / 3), y: L.plot.y1 - 1.5, w: (L.plot.x1 - L.plot.x0) / 3, h: 3 };
        const rr = lerpRect(r, axisR, toChart);
        ctx.save(); ctx.globalAlpha = a * (1 - (toChart >= 1 ? 1 : 0));
        rrect(rr.x, rr.y, rr.w, rr.h, lerp(10, 1, toChart)); ctx.fillStyle = toChart > 0.5 ? C.ink2 : C.accentSoft; ctx.fill();
        ctx.restore();
        text(BLOCKS[i], rr.x + 24, rr.y + rr.h / 2 + 9, { size: 25, weight: 600, color: C.accent, alpha: a * (1 - clamp(toChart * 3)) });
      }
    }

    // --- grafiek (S3, S4)
    let chipA = null, chipB = null;
    if (inChart) {
      const axA = F('axes.in', t) * (1 - toSerpF);
      const P0 = L.plot;
      // titel + label
      text('Bezoekers via Google, over tijd', L.chartTitle.x, L.chartTitle.y + 24, { size: 32, weight: 600, color: C.ink, alpha: axA });
      text('Schematisch, geen echte cijfers', L.chartTitle.x, L.chartTitle.y + 64, { size: 23, color: C.ink2, alpha: axA });
      // band 4 mnd tot 1 jaar
      const bandA = F('band.in', t) * (1 - toSerpF);
      if (bandA > 0) {
        ctx.save(); ctx.globalAlpha = bandA * 0.75; ctx.fillStyle = C.accentSoft;
        const bx0 = xOf(CH.band[0]), bx1 = xOf(CH.band[1]);
        ctx.fillRect(bx0, P0.y0, (bx1 - bx0) * (RM ? 1 : clamp(raw('band.in', t) * 1.6)), P0.y1 - P0.y0);
        ctx.restore();
        const bl = '4 mnd tot 1 jaar · bron: Google', bw2 = measure(bl, 24, 600);
        const bcx = clamp((xOf(CH.band[0]) + xOf(CH.band[1])) / 2, pad + bw2 / 2, W - pad - bw2 / 2);
        text(bl, bcx, P0.y1 + 78, { size: 24, weight: 600, color: C.accent, align: 'center', alpha: bandA });
      }
      // assen
      ctx.save(); ctx.globalAlpha = axA; ctx.strokeStyle = C.ink2; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(P0.x0, P0.y1); ctx.lineTo(P0.x1, P0.y1); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P0.x0, P0.y0); ctx.lineTo(P0.x0, P0.y1); ctx.stroke();
      ctx.restore();
      text('bezoekers', P0.x0 + 14, P0.y0 + 6, { size: 23, color: C.ink2, alpha: axA });
      const ticks = [[0, kind === 'wide' ? 'start' : ''], [4, '4 mnd'], [12, '1 jaar'], [24, '2 jaar']];
      for (const [mm, lab] of ticks) {
        ctx.save(); ctx.globalAlpha = axA; ctx.strokeStyle = C.ink2; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xOf(mm), P0.y1); ctx.lineTo(xOf(mm), P0.y1 + 12); ctx.stroke(); ctx.restore();
        text(lab, xOf(mm), P0.y1 + 42, { size: 23, color: C.ink2, align: mm === 0 ? 'left' : mm === 24 ? 'right' : 'center', alpha: axA });
      }
      // afspeelkop
      const lineA = (t >= M.run1[0] ? 1 : 0) * (1 - toSerpF);
      if (lineA > 0 && m > 0) {
        ctx.save(); ctx.globalAlpha = lineA * 0.9; ctx.strokeStyle = C.rule; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(xOf(m), P0.y0); ctx.lineTo(xOf(m), P0.y1); ctx.stroke(); ctx.restore();
      }
      // lijnen
      if (lineA > 0) {
        const step = 0.05;
        // organisch: doorgetrokken, accent
        ctx.save(); ctx.globalAlpha = lineA; ctx.strokeStyle = C.accent; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); for (let mm = 0; mm <= m + 1e-9; mm += step) { const x = xOf(mm), y = yOf(org(mm)); mm === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.lineTo(xOf(m), yOf(org(m))); ctx.stroke(); ctx.restore();
        // advertentie: gestreept, ink2
        ctx.save(); ctx.globalAlpha = lineA; ctx.strokeStyle = C.ink2; ctx.lineWidth = 6; ctx.setLineDash([16, 12]); ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(xOf(0), yOf(0)); ctx.lineTo(xOf(0), yOf(CH.adsLevel));
        const mEnd = Math.min(m, CH.switchMonth);
        ctx.lineTo(xOf(mEnd), yOf(CH.adsLevel));
        if (t >= M['ads.drop'][0]) {
          const v = adsAt(CH.switchMonth + 0.001, dropP);
          ctx.lineTo(xOf(CH.switchMonth), yOf(Math.max(v, 0.006)));
          if (m > CH.switchMonth) ctx.lineTo(xOf(m), yOf(0.006));
        }
        ctx.stroke(); ctx.restore();
        // markeringen
        const ya = t >= M['ads.drop'][0] ? yOf(Math.max(adsAt(m + 0.001, dropP), 0.006)) : yOf(CH.adsLevel);
        ctx.save(); ctx.globalAlpha = lineA; ctx.fillStyle = C.ink2; ctx.fillRect(xOf(m) - 10, ya - 10, 20, 20);
        ctx.beginPath(); ctx.arc(xOf(m), yOf(org(m)), 11, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = C.surface; ctx.stroke(); ctx.restore();
        chipA = chipRect('A', xOf(m), ya); chipB = chipRect('B', xOf(m), yOf(org(m)));
        separate(chipA, chipB);
        for (const c of [chipA, chipB]) c.y = Math.min(c.y, P0.y1 - c.h - 6); // label blijft boven de as
        separate(chipA, chipB);
      }
      // verbinding schakelaar -> advertentielijn op het omslagpunt
      if (axA > 0) {
        const sx = xOf(CH.switchMonth), ya0 = L.pill.y + L.pill.h, ya1 = L.plot.y0 + 4; // alleen tot de plotrand, nooit door ankertekst
        const hi = Math.min(1, offP * 2 + 0.35);
        ctx.save(); ctx.globalAlpha = axA * hi; ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(sx, ya0); ctx.lineTo(sx, ya1); ctx.stroke(); ctx.restore();
      }
      // ankers in de grafiek
      const s4a = F('anchor.s4a', t) * (1 - toSerpF), s4b = F('anchor.s4b', t) * (1 - toSerpF);
      drawAnchor(T.anchors.s4, L.plotAnchor.x, L.plotAnchor.y, 'left', [s4a, s4b], kind === 'wide' ? 56 : 46);
    }

    // --- kaarten: zoekresultaat -> laan -> label -> zoekresultaat
    for (const key of ['A', 'B']) {
      const slot = key === 'A' ? L.slotA : L.slotB;
      const lane = key === 'A' ? L.laneCardA : cardBLaneRect(t);
      const inA = F(key === 'A' ? 'cardA.in' : 'cardB.in', t);
      const inP = P(key === 'A' ? 'cardA.in' : 'cardB.in', t);
      if (t < M.toChart[0]) {
        const r = lerpRect({ ...slot, y: slot.y + (1 - inP) * 16 }, lane, split);
        const swap = split < 0.5;
        const ta = RM ? 1 : (split > 0 && split < 1 ? Math.abs(1 - 2 * split) : 1);
        // tijdens de uitleg van de advertentie staat kaart B op de achtergrond
        const dim = key === 'B' ? Math.max(lerp(1, 0.3, split), F('laneB.title', t)) : 1;
        drawCard(key, r, { alpha: inA * dim, box: split, lw: swap ? slot.lw : lane.lw, textAlpha: ta });
        if (key === 'A' && !inS1) drawClicks(r, t);
      } else if (t < M.toSerp[0]) {
        const target = (key === 'A' ? chipA : chipB) || chipRect(key, xOf(0), key === 'A' ? yOf(CH.adsLevel) : yOf(org(0)));
        const r = lerpRect(lane, target, toChart);
        ctx.save(); ctx.globalAlpha = 1;
        rrect(r.x, r.y, r.w, r.h, lerp(16, r.h / 2, toChart)); ctx.fillStyle = C.surface; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = key === 'B' ? C.accent : C.ink2; if (key === 'A') ctx.setLineDash([10, 7]); ctx.stroke(); ctx.restore();
        if (toChart < 0.5) drawCard(key, r, { alpha: 1, box: 0, lw: lane.lw, textAlpha: 1 - toChart * 2 });
        drawChipContent(key, r, clamp(toChart * 2 - 1));
      } else {
        const from = (key === 'A' ? chipA : chipB) || chipRect(key, xOf(CH.months), key === 'A' ? yOf(0.006) : yOf(org(CH.months)));
        const r = lerpRect(from, slot, toSerp);
        if (toSerp < 1) {
          ctx.save(); rrect(r.x, r.y, r.w, r.h, lerp(r.h / 2, 16, toSerp)); ctx.fillStyle = C.surface; ctx.globalAlpha = 1 - toSerp; ctx.fill(); ctx.restore();
          drawChipContent(key, r, 1 - clamp(toSerp * 2));
        }
        drawCard(key, r, { alpha: 1, box: 0, lw: slot.lw, textAlpha: clamp(toSerp * 2 - 1) });
      }
    }

    // --- ankers S1 en S5 (zelfde plek: hetzelfde beeld, nu goed gelezen)
    const an = L.anchor;
    const s1a = F('anchor.s1a', t) * (1 - splitF), s1b = F('anchor.s1b', t) * (1 - splitF);
    drawAnchor(T.anchors.s1, an.x, an.y, an.align, [s1a, s1b], anchorSize);
    const s5 = F('anchor.s5', t);
    // tweede regel in accent: organisch = SEO (kleur is extra, de woorden dragen de betekenis)
    drawAnchor([T.anchors.s5[0], ''], an.x, an.y, an.align, [s5, 0], anchorSize);
    drawAnchor(['', T.anchors.s5[1]], an.x, an.y, an.align, [0, s5], anchorSize, C.accent);
    // tags op de kaarten in de payoff
    drawTag(L.slotA, 'Google Ads · huur je per klik', F('tagA.in', t), 'A');
    drawTag(L.slotB, 'SEO · bouw je op', F('tagB.in', t), 'B');
    const sg = F('sign.in', t);
    if (sg > 0) {
      const sy = kind === 'wide' ? an.y + anchorSize * 2.6 : kind === 'square' ? an.y - anchorSize - 6 : L.serp.y + L.serp.h + 70;
      text('SEO vrienden', an.align === 'center' ? W / 2 : an.x, sy, { size: 28, weight: 600, color: C.ink2, align: an.align, alpha: sg });
    }

    // captions buiten de camera
    ctx.setTransform(S, 0, 0, S, 0, 0);
    drawCaption(t);
  }

  function drawTag(slot, label, a, key) {
    if (a <= 0) return;
    const w = measure(label, 28, 600) + 40, h = 50;
    const x = slot.x + slot.w - w - 14, y = slot.y + 10 + (RM ? 0 : (1 - a) * 8);
    ctx.save(); ctx.globalAlpha = a;
    rrect(x, y, w, h, h / 2); ctx.fillStyle = key === 'B' ? C.accentSoft : C.surface; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = key === 'B' ? C.accent : C.ink2; if (key === 'A') ctx.setLineDash([8, 6]); ctx.stroke();
    ctx.restore();
    text(label, x + 20, y + 34, { size: 28, weight: 600, color: key === 'B' ? C.accent : C.ink, alpha: a });
  }

  function drawClicks(card, t) {
    for (let i = 1; i <= 6; i++) {
      const [c0, c1] = M['click.' + i];
      if (t < c0 || t > c1 + 0.5) continue;
      const p = P('click.' + i, t);
      const x = card.x + card.w * (0.55 + 0.35 * CLICK_JIT[i - 1]);
      const yEnd = card.y + card.h * 0.55;
      const y = lerp(card.y - 90, yEnd, p);
      const after = clamp((t - c1) / 0.4);
      ctx.save();
      ctx.globalAlpha = (RM ? 1 : clamp((t - c0) / 0.12)) * (1 - after);
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
      if (t >= c1 && !RM) { ctx.globalAlpha = 1 - after; ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(x, yEnd, 12 + after * 26, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      // "€" bij het geraakte punt: elke klik kost geld
      text('€', x + 22, yEnd - 14, { size: 26, weight: 600, color: C.ink, alpha: (t >= c1 ? 1 : 0) * (1 - after) });
    }
  }

  window.FILM = { W: PW, H: PH, S, FORMAT, RM, duration: T.duration, fps: T.fps };
  window.seek = seek;
})();
