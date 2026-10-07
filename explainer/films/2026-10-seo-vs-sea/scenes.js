// Film "SEO vs SEA": layout, model en tekenvolgorde. Alles wat herbruikbaar is staat in engine/.
(function () {
  const E = window.E, K = window.K, T = E.T, C = E.C, M = E.M;
  const { ctx, W, H, RM, clamp, lerp, ease, raw, P, F, text, measure, rrect, lerpRect } = E;
  const kind = E.FORMAT;
  const pad = E.pad;
  const COMPACT = kind === 'square'; // 1:1 laat de omschrijving op de kaart weg

  const rnd = E.mulberry32(T.seed);
  const CLICK_JIT = Array.from({ length: 6 }, () => rnd());

  // ---------- inhoud ----------
  const QUERY = 'loodgieter zaandam';
  const CARD = {
    A: { sponsored: true, site: 'jouwbedrijf.nl', favicon: 'J', title: 'Loodgieter Zaandam, vandaag nog geholpen', desc: 'Snel ter plaatse. Bel of plan direct online.' },
    B: { sponsored: false, site: 'jouwbedrijf.nl', favicon: 'J', title: 'Loodgieter in Zaandam | Lekkage, cv en afvoer', desc: 'Lekkage of verstopping? Wij helpen in Zaandam en omgeving.' },
  };
  const STYLE = { A: 'paid', B: 'organic' };
  const CHIP = { A: ['Advertentie', 'square'], B: ['Organisch', 'circle'] };
  const BLOCKS = ['content', 'techniek', 'links'];
  const cardH = (key, w) => K.cardMetrics(CARD[key], w, COMPACT).h;

  // ---------- layout per formaat ----------
  const cy0 = E.safe.y0, cy1 = E.safe.y1;
  const anchorSize = kind === 'wide' ? 62 : 58;

  const L = (function () {
    const o = {};
    // SERP
    const serpW = kind === 'wide' ? 880 : W - pad * 2;
    const cw = serpW - 8; // kaart = paneelbreedte min rand; tekst staat 28 px binnen de kaart
    const hA = cardH('A', cw), hB = cardH('B', cw);
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
      const aH = 124 + cardH('A', W - pad * 2) + 76 + 48 + 24;
      o.laneA = { x: pad, y0: cy0, y1: cy0 + aH, w: W - pad * 2 };
      o.laneB = { x: pad, y0: cy0 + aH + 40, y1: cy1, w: W - pad * 2 };
    } else {
      const gut = kind === 'wide' ? 96 : 48;
      const lw = (W - pad * 2 - gut) / 2;
      o.laneA = { x: pad, y0: cy0, y1: cy1, w: lw };
      o.laneB = { x: pad + lw + gut, y0: cy0, y1: cy1, w: lw };
    }
    const lhA = cardH('A', o.laneA.w), lhB = cardH('B', o.laneB.w);
    o.laneCardA = { x: o.laneA.x, y: o.laneA.y0 + 124, w: o.laneA.w, h: lhA, lw: o.laneA.w };
    o.blockH = kind === 'wide' ? 72 : 58; o.blockGap = kind === 'wide' ? 12 : 8;
    o.laneCardB0 = { x: o.laneB.x, y: o.laneB.y1 - lhB, w: o.laneB.w, h: lhB, lw: o.laneB.w };
    o.budget = { x: o.laneA.x, y: o.laneCardA.y + lhA + 76, w: o.laneA.w, h: 48 };

    // Grafiek
    const rightRoom = kind === 'wide' ? 240 : 210;
    if (kind === 'wide') { o.plot = { x0: pad + 70, x1: W - pad - rightRoom, y0: cy0 + 170, y1: cy1 - 110 }; }
    else if (kind === 'tall') { o.plot = { x0: pad + 40, x1: W - pad - rightRoom, y0: cy0 + 400, y1: cy1 - 120 }; }
    else { o.plot = { x0: pad + 40, x1: W - pad - rightRoom, y0: cy0 + 230, y1: cy1 - 100 }; }
    o.chartTitle = { x: pad, y: cy0 + 36 };
    // schakelaar boven het omslagpunt: oorzaak en gevolg in één blikveld
    { const pw = 300, ph = 70; const sx = lerp(o.plot.x0, o.plot.x1, T.chart.switchMonth / T.chart.months);
      o.pill = { x: clamp(sx - pw / 2, pad, W - pad - pw), y: o.plot.y0 - ph - 30, w: pw, h: ph, sx }; }
    o.plotAnchor = { x: o.plot.x0 + 32, y: o.plot.y0 + 58 };
    return o;
  })();

  // ---------- grafiekmodel (schematisch) ----------
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
  const adsAt = (m, dropP) => (m <= CH.switchMonth ? CH.adsLevel : CH.adsLevel * (1 - dropP));

  // ---------- camerapunten ----------
  function focus(f) {
    if (f === 'serp') return { x: L.serp.x + L.serp.w / 2, y: L.serp.y + L.serp.h / 2 };
    if (f === 'switchPoint') return { x: xOf(CH.switchMonth), y: (L.pill.y + yOf(0)) / 2 };
    return null; // midden
  }

  // ---------- filmspecifieke onderdelen ----------
  function drawQuery(t, a) {
    const shown = Math.ceil(QUERY.length * (RM ? (t >= M['query.type'][0] ? 1 : 0) : raw('query.type', t)));
    const typing = t > M['query.type'][0] && t < M['query.type'][1] + 0.4;
    K.searchBar(L.query, QUERY, shown, typing && !RM, a);
  }

  // budget: klik i haalt een segment weg, daarna vult het van links weer aan
  function drawBudget(r, t, a) {
    const n = 6, refill = P('budget.refill', t);
    K.segmentBar(r, 'Budget', n, (i) => {
      const ci = n - i; // klik 1 haalt het laatste segment weg
      const [, ce] = M['click.' + ci];
      const goneE = RM ? (t >= ce ? 1 : 0) : ease(clamp((t - ce) / 0.3));
      const back = clamp(refill * n - i);
      return { vis: Math.max(1 - goneE, back), dy: (1 - back) * goneE * (RM ? 0 : 18) };
    }, a);
  }
  const drawPill = (r, t, a, offP) => K.toggle(r, 'Budget', 'aan', 'uit', a, offP);

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
  function drawClicks(card, t) {
    for (let i = 1; i <= 6; i++) {
      const [c0, c1] = M['click.' + i];
      const x = card.x + card.w * (0.55 + 0.35 * CLICK_JIT[i - 1]);
      K.click(x, card.y - 90, card.y + card.h * 0.55, t, c0, c1, '€');
    }
  }
  const chipRect = (key, x, y) => K.chipRect(CHIP[key][0], x, y);
  const chipContent = (key, r, a) => K.chipContent(CHIP[key][0], CHIP[key][1], r, a);
  const drawCard = (key, r, o) => K.resultCard(CARD[key], r, { ...o, style: STYLE[key], compact: COMPACT });

  // ---------- frame ----------
  function draw(t) {
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
      K.panel(L.serp, serpA);
      drawQuery(t >= M.toSerp[0] ? T.duration : t, serpA);
    }

    // --- lanen (S2)
    const laneOut = 1 - clamp(toChartF * 2.5);
    K.laneTitle(L.laneA, 'Advertentie', 'Google Ads · huur je per klik', F('laneA.title', t) * laneOut, C.ink);
    K.laneTitle(L.laneB, 'Organisch', 'SEO · bouw je op', F('laneB.title', t) * laneOut, C.accent);

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
      const ticks = [[0, kind === 'wide' ? 'start' : ''], [4, '4 mnd'], [12, '1 jaar'], [24, '2 jaar']]
        .map(([mm, lab]) => [xOf(mm), lab, mm === 0 ? 'left' : mm === 24 ? 'right' : 'center']);
      K.axes(P0, 'bezoekers', ticks, axA);
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
        K.separate(chipA, chipB);
        for (const c of [chipA, chipB]) c.y = Math.min(c.y, P0.y1 - c.h - 6); // label blijft boven de as
        K.separate(chipA, chipB);
      }
      // verbinding schakelaar -> omslagpunt (alleen tot de plotrand, nooit door ankertekst)
      if (axA > 0) {
        const sx = xOf(CH.switchMonth), ya0 = L.pill.y + L.pill.h, ya1 = L.plot.y0 + 4;
        const hi = Math.min(1, offP * 2 + 0.35);
        ctx.save(); ctx.globalAlpha = axA * hi; ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(sx, ya0); ctx.lineTo(sx, ya1); ctx.stroke(); ctx.restore();
      }
      const s4a = F('anchor.s4a', t) * (1 - toSerpF), s4b = F('anchor.s4b', t) * (1 - toSerpF);
      K.anchor(T.anchors.s4, L.plotAnchor.x, L.plotAnchor.y, 'left', [s4a, s4b], kind === 'wide' ? 56 : 46);
    }

    // --- kaarten: zoekresultaat -> laan -> label -> zoekresultaat (één object, verandert van vorm)
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
        K.morphShell(r, lerp(16, r.h / 2, toChart), STYLE[key]);
        if (toChart < 0.5) drawCard(key, r, { alpha: 1, box: 0, lw: lane.lw, textAlpha: 1 - toChart * 2 });
        chipContent(key, r, clamp(toChart * 2 - 1));
      } else {
        const from = (key === 'A' ? chipA : chipB) || chipRect(key, xOf(CH.months), key === 'A' ? yOf(0.006) : yOf(org(CH.months)));
        const r = lerpRect(from, slot, toSerp);
        if (toSerp < 1) {
          ctx.save(); rrect(r.x, r.y, r.w, r.h, lerp(r.h / 2, 16, toSerp)); ctx.fillStyle = C.surface; ctx.globalAlpha = 1 - toSerp; ctx.fill(); ctx.restore();
          chipContent(key, r, 1 - clamp(toSerp * 2));
        }
        drawCard(key, r, { alpha: 1, box: 0, lw: slot.lw, textAlpha: clamp(toSerp * 2 - 1) });
      }
    }

    // --- ankers S1 en S5 (zelfde plek: hetzelfde beeld, nu goed gelezen)
    const an = L.anchor;
    const s1a = F('anchor.s1a', t) * (1 - splitF), s1b = F('anchor.s1b', t) * (1 - splitF);
    K.anchor(T.anchors.s1, an.x, an.y, an.align, [s1a, s1b], anchorSize);
    const s5 = F('anchor.s5', t);
    // tweede regel in accent: organisch = SEO (kleur is extra, de woorden dragen de betekenis)
    K.anchor([T.anchors.s5[0], ''], an.x, an.y, an.align, [s5, 0], anchorSize);
    K.anchor(['', T.anchors.s5[1]], an.x, an.y, an.align, [0, s5], anchorSize, C.accent);
    // tags op de kaarten in de payoff
    K.tag(L.slotA, 'Google Ads · huur je per klik', F('tagA.in', t), 'paid');
    K.tag(L.slotB, 'SEO · bouw je op', F('tagB.in', t), 'organic');
    const sg = F('sign.in', t);
    if (sg > 0) {
      const sy = kind === 'wide' ? an.y + anchorSize * 2.6 : kind === 'square' ? an.y - anchorSize - 6 : L.serp.y + L.serp.h + 70;
      text(E.BRAND.signature, an.align === 'center' ? W / 2 : an.x, sy, { size: 28, weight: 600, color: C.ink2, align: an.align, alpha: sg });
    }
  }

  window.SCENE = { focus, draw };
})();
