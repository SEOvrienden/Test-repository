// Film "Interne links": een nieuwe pagina vindt Google via een link vanaf een bestaande pagina.
// Engine: window.E (runtime) en window.K (onderdelen). Elk frame is een pure functie van t.
(function () {
  const E = window.E, K = window.K, T = E.T, C = E.C, M = E.M;
  const { W, H, RM, clamp, lerp, ease, raw, P, F, text, lerpRect } = E;
  const kind = E.FORMAT;
  const pad = E.pad;

  // ---------- inhoud ----------
  const PAGE = { url: 'jouwbedrijf.nl/airco', title: 'Airco laten installeren' };
  const NODES = {
    home: { title: 'Home', sub: '/', cell: [1, 0] },
    diensten: { title: 'Diensten', sub: '/diensten', cell: [0, 1] },
    blog: { title: 'Blog', sub: '/blog', cell: [1, 1] },
    contact: { title: 'Contact', sub: '/contact', cell: [2, 1] },
    lekkage: { title: 'Lekkage', sub: '/lekkage', cell: [0, 2] },
    cvketel: { title: 'Cv-ketel', sub: '/cv-ketel', cell: [1, 2] },
    airco: { title: 'Airco', sub: 'Online', cell: [2, 2] },
  };
  const EXISTING = ['home', 'diensten', 'blog', 'contact', 'lekkage', 'cvketel'];
  const EDGES = [
    ['home', 'diensten', 'wave.1'], ['home', 'blog', 'wave.1'], ['home', 'contact', 'wave.1'],
    ['diensten', 'lekkage', 'wave.2'], ['diensten', 'cvketel', 'wave.2'],
  ];
  const VISIT = { home: 'google.in', diensten: 'wave.1', blog: 'wave.1', contact: 'wave.1', lekkage: 'wave.2', cvketel: 'wave.2' };

  // ---------- layout per formaat (pure functie van het formaat) ----------
  const L = (function () {
    const o = {};
    let colW, x0, nw, nh, rows;
    if (kind === 'wide') {
      colW = 400; x0 = pad; nw = 300; nh = 104; rows = [110, 340, 570];
      o.card = { x: 360, y: 187, w: 640, h: 450 };
      o.card5 = o.card;
      o.anchor = { x: 1070, y: 382, align: 'left', size: 58 };
      o.anchor4 = { x: 1340, y: 330, align: 'left', size: 56 };
      o.dienst5 = { x: pad, y: o.card.y + o.card.h / 2 - 48, w: 220, h: 96 };
      o.sign = { x: o.anchor.x, y: o.anchor.y + 58 * 2.7, align: 'left' };
    } else if (kind === 'tall') {
      colW = (W - pad * 2) / 3; x0 = pad; nw = 200; nh = 100; rows = [410, 680, 950];
      o.card = { x: pad, y: 600, w: W - pad * 2, h: 480 };
      o.card5 = o.card;
      o.anchor = { x: W / 2, y: 280, align: 'center', size: 58 };
      o.anchor4 = { x: W / 2, y: 240, align: 'center', size: 58 };
      o.dienst5 = { x: pad, y: 410, w: 220, h: 96 };
      o.sign = { x: W / 2, y: o.card.y + o.card.h + 70, align: 'center' };
    } else {
      colW = (W - pad * 2) / 3; x0 = pad; nw = 220; nh = 80; rows = [120, 290, 470];
      o.card = { x: pad, y: 300, w: W - pad * 2, h: 330 };
      o.card5 = { x: 362, y: 300, w: W - pad - 362, h: 330 };
      o.anchor = { x: W / 2, y: 178, align: 'center', size: 50 };
      o.anchor4 = { x: 625, y: 166, align: 'left', size: 44 };
      o.dienst5 = { x: pad, y: o.card5.y + o.card5.h / 2 - 40, w: 200, h: 80 };
      o.sign = { x: W - pad, y: o.card5.y + o.card5.h + 46, align: 'right' };
    }
    o.node = {};
    for (const [k, n] of Object.entries(NODES)) {
      const [c, r] = n.cell;
      o.node[k] = { x: x0 + c * colW + (colW - nw) / 2, y: rows[r], w: nw, h: nh };
    }
    o.statusPill = kind === 'wide' ? { x: o.node.airco.x, y: o.node.airco.y + nh + 12, align: 'left' } : { x: o.node.airco.x + nw / 2, y: o.node.airco.y + nh + 12, align: 'center' };
    return o;
  })();
  const BEND = 0.08; // nieuwe link buigt door de ruimte tussen de rijen, niet over Cv-ketel
  const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  function focus(name) {
    if (name === 'card') return center(L.card);
    if (name === 'newLink') { const a = center(L.node.diensten), b = center(L.node.airco); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    return null;
  }

  // check (vinkje) verschijnt kort na het einde van een move
  const after = (name, t, d = 0.25) => (RM ? (t >= M[name][1] ? 1 : 0) : ease(clamp((t - M[name][1]) / d)));
  // dot-voortgang: lineair-geëased langs de link
  const along = (name, t) => (RM ? 0 : ease(raw(name, t)));

  // voetlabels van de pagina: Online (en later Gevonden) naast elkaar
  function footPills(foot, card, t, a, statusP, foundA) {
    // knop Publiceren wordt status Online
    if (statusP < 1) K.labelPill('Publiceren', foot.x, foot.y, a * (1 - statusP), { style: 'dark' });
    const on = K.labelPill('Online', foot.x, foot.y, a * statusP, { style: 'organic', check: true });
    if (foundA > 0) {
      const fr = K.pillRect('Gevonden', 0, 0, { check: true });
      const fits = on.x + on.w + 14 + fr.w <= card.x + card.w - 24;
      const fx = fits ? on.x + on.w + 14 : foot.x, fy = fits ? foot.y : foot.y - fr.h - 10;
      K.labelPill('Gevonden', fx, fy, a * foundA, { style: 'organic', check: true });
      return { x: fx, y: fy };
    }
    return null;
  }

  // ---------- frame ----------
  function draw(t) {
    const toMap = P('toMap', t);
    const toCard = P('toCard', t);
    const inMap = t >= M.toMap[0];
    const out5 = F('mapOut', t); // S5: eerst alles weg behalve de link en de twee pagina's
    const dimA = F('dim', t) * (1 - F('undim', t));
    const rest = (1 - 0.35 * dimA) * (1 - out5); // dimmen naar 65%: paginanamen houden 5,1:1
    const pagesRaw = raw('pages.in', t);

    // --- links (bestaand)
    const linksP = RM ? (t >= M['links.in'][0] ? 1 : 0) : ease(raw('links.in', t));
    if (inMap && t < M.toCard[1]) {
      for (const [a, b, wave] of EDGES) {
        const pts = K.linkPoints(L.node[a], L.node[b], 8);
        const active = t > M[wave][0] && t < M[wave][1] + 0.4;
        K.linkArrow(pts.a, pts.b, linksP, { a: rest, color: active ? C.ink : C.ink2, lw: active ? 5 : 3 });
        K.travelDot(pts.a, pts.b, along(wave, t), rest);
      }
    }

    // --- nieuwe link (turn) en de stip van Google erlangs
    const dR = lerpRect(L.node.diensten, L.dienst5, toCard);
    const aR = t < M.toCard[0] ? lerpRect(L.card, L.node.airco, toMap) : lerpRect(L.node.airco, L.card5, toCard);
    const newP = RM ? (t >= M['link.new'][0] ? 1 : 0) : ease(raw('link.new', t));
    if (newP > 0) {
      const pts = K.linkPoints(dR, aR, 8);
      // in de kaart eindigt de nieuwe link boven op Airco (niet bij het vinkje van Cv-ketel)
      const top = { x: aR.x + aR.w / 2, y: aR.y - 8 }, bot = { x: dR.x + dR.w * 0.8, y: dR.y + dR.h + 8 };
      pts.a = { x: lerp(bot.x, pts.a.x, toCard), y: lerp(bot.y, pts.a.y, toCard) };
      pts.b = { x: lerp(top.x, pts.b.x, toCard), y: lerp(top.y, pts.b.y, toCard) };
      const active = t > M['wave.3b'][0] && t < M['wave.3b'][1] + 0.4;
      K.linkArrow(pts.a, pts.b, newP, { color: C.accent, lw: active ? 7 : 5, head: 20, bend: BEND * (1 - toCard) });
      // eerst Home -> Diensten, dan Diensten -> Airco
      const hp = K.linkPoints(L.node.home, L.node.diensten, 8);
      const h3 = t > M['wave.3a'][0] && t < M['wave.3a'][1] + 0.4;
      if (h3) K.linkArrow(hp.a, hp.b, 1, { color: C.ink, lw: 5 });
      K.travelDot(hp.a, hp.b, along('wave.3a', t), 1);
      K.travelDot(pts.a, pts.b, along('wave.3b', t), 1, null, BEND * (1 - toCard));
    }

    // --- bestaande pagina's
    if (inMap) {
      EXISTING.forEach((k, i) => {
        if (k === 'diensten') return;
        const a = (RM ? F('pages.in', t) : ease(clamp(pagesRaw * 2 - i * 0.18))) * rest;
        const ck = after(VISIT[k], t);
        K.pageNode(L.node[k], { a, title: NODES[k].title, sub: NODES[k].sub, state: ck > 0 ? 'visited' : 'plain', check: ck });
      });
      // Diensten leeft door tot in de payoff
      {
        const i = 1;
        const a0 = (RM ? F('pages.in', t) : ease(clamp(pagesRaw * 2 - i * 0.18)));
        const a = t >= M.toCard[0] ? 1 : a0 * (1 - 0.35 * dimA);
        const ck = after('wave.1', t);
        K.pageNode(dR, { a, title: 'Diensten', sub: '/diensten', state: ck > 0 ? 'visited' : 'plain', check: ck });
      }
      // Google: label bij Home
      const g = F('google.in', t) * rest;
      const hr = L.node.home;
      const gp = K.pillRect('Google', 0, 0, {});
      K.labelPill('Google', hr.x - 18 - (RM ? 0 : (1 - P('google.in', t)) * 24), hr.y + (hr.h - gp.h) / 2, g, { style: 'dark', align: 'right' });
    }

    // --- de nieuwe pagina: grote pagina <-> kaartje
    const foundCk = after('wave.3b', t);
    const statusP = RM ? (t >= M['status.on'][0] ? 1 : 0) : ease(raw('status.on', t));
    if (t < M.toCard[0]) {
      if (toMap < 0.5) {
        const ta = 1 - toMap * 2;
        const pc = K.pageCard(aR, PAGE, { a: F('page.in', t), textAlpha: ta, compact: kind === 'square' });
        footPills(pc.foot, aR, t, F('page.in', t) * ta, statusP, 0);
        if (!RM || t >= M['publish.click'][0]) {
          const bx = pc.foot.x + K.pillRect('Publiceren', 0, 0, {}).w / 2, by = pc.foot.y + 22;
          K.click(bx, by - 110, by, t, M['publish.click'][0], M['publish.click'][1]);
        }
      } else {
        const ta = clamp(toMap * 2 - 1);
        K.pageNode(aR, { a: 1, ta, title: 'Airco', sub: 'Online', subColor: C.accent, state: foundCk > 0 ? 'visited' : 'missing', check: foundCk });
      }
      // label onder het kaartje: Niet gevonden -> Gevonden
      const nf = F('notfound', t) * (1 - after('wave.3b', t, 0.2));
      const fd = F('found', t);
      const sp = L.statusPill;
      K.labelPill('Niet gevonden', sp.x, sp.y, nf, { style: 'muted', align: sp.align });
      if (fd > 0) K.labelPill('Gevonden', sp.x, sp.y, fd, { style: 'organic', check: true, align: sp.align });
    } else {
      // payoff: kaartje groeit terug tot de pagina
      if (toCard < 0.5) {
        K.pageNode(aR, { a: 1, ta: 1 - toCard * 2, title: 'Airco', sub: 'Online', subColor: C.accent, state: 'visited', check: 1 - toCard * 2 });
        K.labelPill('Gevonden', lerp(L.statusPill.x, L.card5.x + 28, toCard), lerp(L.statusPill.y, L.card5.y + L.card5.h - 74, toCard), 1 - toCard * 2, { style: 'organic', check: true, align: L.statusPill.align });
      } else {
        const ta = clamp(toCard * 2 - 1);
        const pc = K.pageCard(aR, PAGE, { a: 1, textAlpha: ta, compact: kind === 'square' });
        footPills(pc.foot, aR, t, ta, 1, 1);
      }
    }

    // --- ankers: S1 en S5 op dezelfde plek
    const an = L.anchor;
    const outS1 = RM ? F('toMap', t) : ease(clamp(raw('toMap', t) * 2.5));
    K.anchor(T.anchors.s1, an.x, an.y, an.align, [F('anchor.s1a', t) * (1 - outS1), F('anchor.s1b', t) * (1 - outS1)], an.size);
    const s5 = F('anchor.s5', t);
    K.anchor([T.anchors.s5[0], ''], an.x, an.y, an.align, [s5, 0], an.size);
    K.anchor(['', T.anchors.s5[1]], an.x, an.y, an.align, [0, s5], an.size, C.accent);
    const a4 = L.anchor4;
    K.anchor(T.anchors.s4, a4.x, a4.y, a4.align, F('anchor.s4', t) * (1 - out5), a4.size, C.accent);
    const sg = F('sign.in', t);
    if (sg > 0) text(E.BRAND.signature, L.sign.x, L.sign.y, { size: 28, weight: 600, color: C.ink2, align: L.sign.align, alpha: sg });
  }

  window.SCENE = { focus, draw };
})();
