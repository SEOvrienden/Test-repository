// Herbruikbare onderdelen. Alles in virtuele px, kleuren uit het merk.
// Elk onderdeel is een pure tekenfunctie: (geometrie, tekst, dekking, voortgang) in, pixels uit.
// Stijlen: 'paid' = gestreept, ink2 (advertentie-achtig); 'organic' = doorgetrokken, accent.
// Kleur is nooit het enige signaal: elke stijl verschilt ook in lijn of vorm.
(function () {
  const E = window.E;
  const { ctx, C } = E;
  const { text, measure, wrap, rrect, clamp, lerp } = E;

  // ---- zoekresultaat (echte UI als anker) ----
  // content: { sponsored, site, favicon, title, desc }
  function cardMetrics(content, w, compact = false) {
    const cp = 28; const iw = w - cp * 2;
    const tl = wrap(content.title, iw, 32, 600);
    const dl = compact || !content.desc ? [] : wrap(content.desc, iw, 24, 400);
    const h = cp + (content.sponsored ? 34 : 0) + 34 + 14 + tl.length * 40 + (dl.length ? 6 + dl.length * 33 : 0) + cp - 6;
    return { tl, dl, h, cp };
  }

  function favicon(letter, x, y, r, a) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = C.accentSoft; ctx.fill();
    ctx.restore();
    text(letter, x, y + 7, { size: 19, weight: 600, color: C.accent, align: 'center', alpha: a });
  }

  function strokeStyleFor(style) { return style === 'organic' ? C.accent : C.ink2; }
  function dashFor(style, dash) { if (style === 'paid') ctx.setLineDash(dash); }

  // o: { alpha, box (0..1 rand+vlak), lw (breedte voor tekstlayout), textAlpha, style, compact, sponsoredLabel }
  function resultCard(content, r, o) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    if (o.box > 0) {
      rrect(r.x, r.y, r.w, r.h, 16);
      ctx.fillStyle = C.surface; ctx.fill();
      ctx.globalAlpha = a * o.box; ctx.lineWidth = 2;
      ctx.strokeStyle = strokeStyleFor(o.style);
      dashFor(o.style, [10, 7]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = a;
    }
    const ta = o.textAlpha == null ? 1 : o.textAlpha;
    if (ta > 0) {
      const m = cardMetrics(content, o.lw, o.compact);
      const x = r.x + m.cp; let y = r.y + m.cp;
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      if (content.sponsored) { text(o.sponsoredLabel || 'Gesponsord', x, y + 22, { size: 26, weight: 600, color: C.ink, alpha: ta }); y += 34; }
      favicon(content.favicon || content.site[0].toUpperCase(), x + 15, y + 15, 15, ta);
      text(content.site, x + 42, y + 23, { size: 23, color: C.ink2, alpha: ta });
      y += 34 + 14;
      for (const ln of m.tl) { y += 32; text(ln, x, y, { size: 32, weight: 600, color: C.ink, alpha: ta }); y += 8; }
      y += 6;
      for (const ln of m.dl) { y += 25; text(ln, x, y, { size: 24, color: C.ink2, alpha: ta }); y += 8; }
      ctx.restore();
    }
    ctx.restore();
  }

  // Leeg kaartvlak met rand (gebruikt tijdens het morphen kaart <-> label)
  function morphShell(r, radius, style, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    rrect(r.x, r.y, r.w, r.h, radius); ctx.fillStyle = C.surface; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = strokeStyleFor(style); dashFor(style, [10, 7]); ctx.stroke(); ctx.restore();
  }

  // ---- zoekpaneel en zoekbalk ----
  function panel(r, a, radius = 20) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    rrect(r.x, r.y, r.w, r.h, radius); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    ctx.restore();
  }
  // shown: aantal zichtbare tekens; caret: typcursor tonen (knippert nooit)
  function searchBar(r, query, shown, caret, a) {
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, 36); ctx.fillStyle = C.surface; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x + 40, r.y + 33, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x + 48, r.y + 41); ctx.lineTo(r.x + 57, r.y + 50); ctx.stroke();
    ctx.restore();
    const s = query.slice(0, shown);
    text(s, r.x + 78, r.y + 46, { size: 28, color: C.ink, alpha: a });
    if (caret) { const cw = measure(s, 28); ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = C.ink; ctx.fillRect(r.x + 80 + cw, r.y + 20, 2, 34); ctx.restore(); }
  }

  // ---- label met marker (legenda op een lijn) ----
  // marker: 'square' | 'circle'
  function chipRect(label, x, y) {
    const w = 16 + 18 + 12 + measure(label, 24, 600) + 18; const h = 46;
    return { x: x + 16, y: y - h / 2, w, h, label };
  }
  function chipContent(label, marker, r, a, color) {
    if (a <= 0) return;
    const cx = r.x + 16 + 9, cy = r.y + r.h / 2;
    ctx.save(); ctx.globalAlpha *= a;
    if (marker === 'square') { ctx.fillStyle = C.ink2; ctx.fillRect(cx - 8, cy - 8, 16, 16); }
    else { ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = C.accent; ctx.fill(); }
    ctx.restore();
    text(label, r.x + 16 + 18 + 12, cy + 8, { size: 24, weight: 600, color: color || (marker === 'square' ? C.ink : C.accent), alpha: a });
  }
  // Twee labels mogen elkaar niet overlappen
  function separate(ra, rb, gap = 8) {
    const top = ra.y < rb.y ? ra : rb, bot = top === ra ? rb : ra;
    const ov = top.y + top.h + gap - bot.y;
    if (ov > 0) { top.y -= ov / 2; bot.y += ov / 2; }
  }

  // ---- ankerzin (grote serif, max 8 woorden per regel, max 2 regels) ----
  // a: getal of array per regel
  function anchor(lines, x, y, align, a, size, color) {
    if (a <= 0) return;
    lines.forEach((ln, i) => {
      if (!ln) return;
      const la = Array.isArray(a) ? a[i] : a;
      text(ln, x, y + i * size * 1.15, { size, weight: 700, fam: E.DISPLAY, color: color || C.ink, align, alpha: la });
    });
  }

  // ---- gesegmenteerde balk (budget, voorraad, tijd) ----
  // seg(i) -> { vis 0..1, dy }
  function segmentBar(r, label, n, seg, a) {
    if (a <= 0) return;
    text(label, r.x, r.y - 14, { size: 23, weight: 600, color: C.ink2, alpha: a });
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    const g = 6, sw = (r.w - 12 - g * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const { vis, dy } = seg(i);
      const sx = r.x + 6 + i * (sw + g);
      ctx.globalAlpha = a * vis;
      ctx.fillStyle = C.ink2;
      rrect(sx, r.y + 6 + dy, sw, r.h - 12, 6); ctx.fill();
    }
    ctx.restore();
  }

  // ---- schakelaar met tekst (aan/uit staat ook in woorden) ----
  function toggle(r, label, onText, offText, a, offP) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, r.h / 2); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.rule; ctx.stroke();
    const tw = 76, th = 40, tx = r.x + r.w - tw - 18, ty = r.y + (r.h - th) / 2;
    rrect(tx, ty, tw, th, th / 2); ctx.fillStyle = offP > 0.5 ? C.rule : C.ink; ctx.fill();
    if (offP > 0.5) { ctx.lineWidth = 2; ctx.strokeStyle = C.ink2; ctx.stroke(); }
    const kx = lerp(tx + tw - th / 2, tx + th / 2, offP);
    ctx.beginPath(); ctx.arc(kx, ty + th / 2, th / 2 - 4, 0, Math.PI * 2); ctx.fillStyle = C.surface; ctx.fill();
    ctx.restore();
    text(label, r.x + 26, r.y + r.h / 2 + 10, { size: 30, weight: 600, color: C.ink, alpha: a });
    text(offP > 0.5 ? offText : onText, r.x + 26 + measure(label + ' ', 30, 600), r.y + r.h / 2 + 10, { size: 30, weight: 400, color: C.ink2, alpha: a });
  }

  // ---- titel boven een kolom ----
  function laneTitle(lane, title, sub, a, color) {
    if (a <= 0) return;
    text(title, lane.x, lane.y0 + 50, { size: 48, weight: 700, fam: E.DISPLAY, color, alpha: a });
    text(sub, lane.x, lane.y0 + 92, { size: 24, color: C.ink2, alpha: a });
  }

  // ---- tag rechtsboven op een kaart ----
  function tag(slot, label, a, style) {
    if (a <= 0) return;
    const w = measure(label, 28, 600) + 40, h = 50;
    const x = slot.x + slot.w - w - 14, y = slot.y + 10 + (E.RM ? 0 : (1 - a) * 8);
    ctx.save(); ctx.globalAlpha = a;
    rrect(x, y, w, h, h / 2); ctx.fillStyle = style === 'organic' ? C.accentSoft : C.surface; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = style === 'organic' ? C.accent : C.ink2; if (style === 'paid') ctx.setLineDash([8, 6]); ctx.stroke();
    ctx.restore();
    text(label, x + 20, y + 34, { size: 28, weight: 600, color: style === 'organic' ? C.accent : C.ink, alpha: a });
  }

  // ---- grafiekbasis: assen, ticks, aslabel ----
  // plot: {x0,x1,y0,y1}; ticks: [[x, label, align]]
  function axes(plot, yLabel, ticks, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.ink2; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(plot.x0, plot.y1); ctx.lineTo(plot.x1, plot.y1); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(plot.x0, plot.y0); ctx.lineTo(plot.x0, plot.y1); ctx.stroke();
    ctx.restore();
    text(yLabel, plot.x0 + 14, plot.y0 + 6, { size: 23, color: C.ink2, alpha: a });
    for (const [x, lab, align] of ticks) {
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.ink2; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, plot.y1); ctx.lineTo(x, plot.y1 + 12); ctx.stroke(); ctx.restore();
      text(lab, x, plot.y1 + 42, { size: 23, color: C.ink2, align, alpha: a });
    }
  }

  // ---- klik: stip valt op een punt, ring, en een teken (bijv. €) ----
  function click(x, yStart, yEnd, t, t0, t1, mark) {
    if (t < t0 || t > t1 + 0.5) return;
    const p = E.RM ? (t >= (t0 + t1) / 2 ? 1 : 0) : E.ease(clamp((t - t0) / (t1 - t0)));
    const y = lerp(yStart, yEnd, p);
    const after = clamp((t - t1) / 0.4);
    ctx.save();
    ctx.globalAlpha = (E.RM ? 1 : clamp((t - t0) / 0.12)) * (1 - after);
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fillStyle = C.ink; ctx.fill();
    if (t >= t1 && !E.RM) { ctx.globalAlpha = 1 - after; ctx.lineWidth = 3; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.arc(x, yEnd, 12 + after * 26, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    if (mark) text(mark, x + 22, yEnd - 14, { size: 26, weight: 600, color: C.ink, alpha: (t >= t1 ? 1 : 0) * (1 - after) });
  }


  // ======== sitestructuur: pagina's, links, bezoeken (o.a. film interne links) ========

  // Punt op de rand van rechthoek r, op de lijn van het midden naar punt p
  function rectEdge(r, p) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = p.x - cx, dy = p.y - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const s = Math.min(dx ? (r.w / 2) / Math.abs(dx) : Infinity, dy ? (r.h / 2) / Math.abs(dy) : Infinity);
    return { x: cx + dx * s, y: cy + dy * s };
  }
  // Begin- en eindpunt van een link tussen twee rechthoeken (rand tot rand, met marge)
  function linkPoints(ra, rb, gap = 6) {
    const ca = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 }, cb = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
    const a = rectEdge(ra, cb), b = rectEdge(rb, ca);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    return { a: { x: a.x + ux * gap, y: a.y + uy * gap }, b: { x: b.x - ux * gap, y: b.y - uy * gap } };
  }

  // Vinkje in een cirkel (bezocht, gevonden). Vorm draagt de betekenis, niet alleen de kleur.
  function checkBadge(x, y, r, a, color) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color || C.accent; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = C.surface; ctx.stroke();
    ctx.lineWidth = Math.max(2.5, r * 0.22); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.surface;
    ctx.beginPath(); ctx.moveTo(x - r * 0.42, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.34); ctx.lineTo(x + r * 0.45, y - r * 0.3); ctx.stroke();
    ctx.restore();
  }

  // Pagina in een sitekaart. o: { a, ta (tekstdekking), state: 'plain'|'visited'|'missing', sub, subColor, title, size, check 0..1 }
  // plain = dunne doorgetrokken rand (ink2) · visited = dikke accentrand + vinkje · missing = gestreepte rand (ink2)
  function pageNode(r, o) {
    const a = o.a == null ? 1 : o.a;
    if (a <= 0) return;
    const st = o.state || 'plain';
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = C.surface; ctx.fill();
    ctx.lineWidth = st === 'visited' ? 4 : 2; ctx.strokeStyle = st === 'visited' ? C.accent : C.ink2;
    if (st === 'missing') ctx.setLineDash([10, 7]);
    ctx.stroke(); ctx.setLineDash([]);
    const ta = a * (o.ta == null ? 1 : o.ta);
    ctx.globalAlpha = ta;
    // documentje links
    const ix = r.x + 22, iy = r.y + r.h / 2 - 17, iw = 26, ih = 34;
    ctx.lineWidth = 2; ctx.strokeStyle = C.ink2;
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + iw - 8, iy); ctx.lineTo(ix + iw, iy + 8); ctx.lineTo(ix + iw, iy + ih); ctx.lineTo(ix, iy + ih); ctx.closePath(); ctx.stroke();
    ctx.restore();
    const size = o.size || 26, tx = r.x + 62;
    if (o.sub) {
      text(o.title, tx, r.y + r.h / 2 - 4, { size, weight: 600, color: C.ink, alpha: ta });
      text(o.sub, tx, r.y + r.h / 2 + 26, { size: 22, color: o.subColor || C.ink2, alpha: ta, weight: o.subColor ? 600 : 400 });
    } else text(o.title, tx, r.y + r.h / 2 + 9, { size, weight: 600, color: C.ink, alpha: ta });
    if (o.check > 0) checkBadge(r.x + r.w - 6, r.y + 6, 17, a * o.check);
  }

  // Punt op een (optioneel gebogen) link. bend: uitbuiging als fractie van de lengte, naar links van de looprichting
  function linkAt(pa, pb, p, bend = 0) {
    if (!bend) return { x: lerp(pa.x, pb.x, p), y: lerp(pa.y, pb.y, p) };
    const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2, dx = pb.x - pa.x, dy = pb.y - pa.y;
    const cx = mx + dy * bend, cy = my - dx * bend, q = 1 - p;
    return { x: q * q * pa.x + 2 * q * p * cx + p * p * pb.x, y: q * q * pa.y + 2 * q * p * cy + p * p * pb.y };
  }

  // Link als pijl van a naar b, getekend tot voortgang p. o: { a, color, lw, dash, head, bend }
  function linkArrow(pa, pb, p, o = {}) {
    const al = o.a == null ? 1 : o.a;
    if (al <= 0 || p <= 0) return;
    const bend = o.bend || 0, hl = o.head || 16;
    const tip = linkAt(pa, pb, p, bend), pre = linkAt(pa, pb, Math.max(0, p - 0.02), bend);
    const ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
    ctx.save(); ctx.globalAlpha *= al;
    ctx.strokeStyle = o.color || C.ink2; ctx.fillStyle = o.color || C.ink2; ctx.lineWidth = o.lw || 3; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y);
    const n = bend ? 40 : 1;
    for (let i = 1; i <= n; i++) { const q = linkAt(pa, pb, p * i / n, bend); if (i === n) { ctx.lineTo(q.x - Math.cos(ang) * hl * 0.6, q.y - Math.sin(ang) * hl * 0.6); } else ctx.lineTo(q.x, q.y); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - Math.cos(ang - 0.45) * hl, tip.y - Math.sin(ang - 0.45) * hl);
    ctx.lineTo(tip.x - Math.cos(ang + 0.45) * hl, tip.y - Math.sin(ang + 0.45) * hl); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Stip die een link volgt (bezoek). p 0..1 langs de lijn; in reduced motion niet tekenen (de film markeert dan de link)
  function travelDot(pa, pb, p, a, color, bend = 0) {
    if (E.RM || a <= 0 || p <= 0 || p >= 1) return;
    const q = linkAt(pa, pb, p, bend);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.beginPath(); ctx.arc(q.x, q.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = color || C.ink; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C.surface; ctx.stroke();
    ctx.restore();
  }

  // Label als pil. style: 'dark' (ink, lichte tekst), 'organic' (accentSoft, accentrand), 'muted' (gestreept ink2), 'plain'
  // align: 'left' | 'center' | 'right' t.o.v. x; y = bovenkant. check: vinkje voor de tekst. Geeft de rechthoek terug.
  function pillRect(label, x, y, o = {}) {
    const size = o.size || 26, h = Math.round(size * 1.75), cw = o.check ? size * 0.95 : 0;
    const w = measure(label, size, 600) + 36 + cw;
    const al = o.align || 'left';
    return { x: al === 'left' ? x : al === 'center' ? x - w / 2 : x - w, y, w, h, size, cw };
  }
  function labelPill(label, x, y, a, o = {}) {
    const r = pillRect(label, x, y, o);
    if (a <= 0) return r;
    const st = o.style || 'plain';
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, r.h / 2);
    ctx.fillStyle = st === 'dark' ? C.ink : st === 'organic' ? C.accentSoft : C.surface; ctx.fill();
    if (st !== 'dark') { ctx.lineWidth = 2; ctx.strokeStyle = st === 'organic' ? C.accent : C.ink2; if (st === 'muted') ctx.setLineDash([8, 6]); ctx.stroke(); }
    ctx.restore();
    const col = st === 'dark' ? C.surface : st === 'organic' ? C.accent : C.ink;
    if (o.check) checkBadge(r.x + 18 + r.size * 0.38, r.y + r.h / 2, r.size * 0.42, a);
    text(label, r.x + 18 + r.cw, r.y + r.h / 2 + r.size * 0.36, { size: r.size, weight: 600, color: col, alpha: a });
    return r;
  }

  // Webpagina (echte UI als anker): adresbalk, titel, tekstregels. Geeft { foot: {x, y} } terug voor knoppen/labels.
  // c: { url, title }; o: { a, textAlpha, compact }
  function pageCard(r, c, o = {}) {
    const a = o.a == null ? 1 : o.a;
    if (a <= 0) return { foot: { x: r.x + 28, y: r.y + r.h - 74 } };
    ctx.save(); ctx.globalAlpha *= a;
    rrect(r.x, r.y, r.w, r.h, 18); ctx.fillStyle = C.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.ink2; ctx.stroke();
    // adresbalk
    ctx.save(); ctx.beginPath(); rrect(r.x, r.y, r.w, r.h, 18); ctx.clip();
    ctx.fillStyle = C.ground; ctx.fillRect(r.x, r.y, r.w, 56);
    ctx.strokeStyle = C.rule; ctx.beginPath(); ctx.moveTo(r.x, r.y + 56); ctx.lineTo(r.x + r.w, r.y + 56); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r.x + 26 + i * 20, r.y + 28, 6, 0, Math.PI * 2); ctx.fillStyle = C.rule; ctx.fill(); }
    ctx.restore();
    const ta = (o.textAlpha == null ? 1 : o.textAlpha) * a;
    if (ta > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
      text(c.url, r.x + 98, r.y + 36, { size: 22, color: C.ink2, alpha: ta });
      const tl = wrap(c.title, r.w - 56, 34, 600);
      let y = r.y + 56 + 54;
      for (const ln of tl) { text(ln, r.x + 28, y, { size: 34, weight: 600, color: C.ink, alpha: ta }); y += 44; }
      // tekstregels (decoratief, geen inhoud)
      const room = r.y + r.h - 96 - y; const n = Math.max(0, Math.min(o.compact ? 2 : 3, Math.floor(room / 30)));
      ctx.globalAlpha = ta;
      for (let i = 0; i < n; i++) { rrect(r.x + 28, y + 4 + i * 30, (r.w - 56) * (i === n - 1 ? 0.6 : 1), 12, 6); ctx.fillStyle = C.rule; ctx.fill(); }
      ctx.restore();
    }
    return { foot: { x: r.x + 28, y: r.y + r.h - 74 } };
  }

  window.K = { cardMetrics, favicon, resultCard, morphShell, panel, searchBar, chipRect, chipContent, separate, anchor, segmentBar, toggle, laneTitle, tag, axes, click,
    rectEdge, linkPoints, linkAt, checkBadge, pageNode, linkArrow, travelDot, pillRect, labelPill, pageCard };
})();
