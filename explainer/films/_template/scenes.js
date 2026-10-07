// Scènes van deze film. Engine: window.E (runtime) en window.K (onderdelen), zie engine/README.md.
// Regels: elk frame is een pure functie van t; geen state tussen frames; alleen E.mulberry32 voor willekeur.
(function () {
  const E = window.E, K = window.K, T = E.T, C = E.C, M = E.M;
  const { W, H, RM, raw, P, F } = E;
  const kind = E.FORMAT; // 'wide' | 'tall' | 'square': geef elk formaat een eigen compositie
  const pad = E.pad, cy0 = E.safe.y0, cy1 = E.safe.y1;

  const QUERY = 'voorbeeld zoekterm';
  const CARD = { sponsored: false, site: 'jouwbedrijf.nl', favicon: 'J', title: 'Een echt ogend zoekresultaat', desc: 'Echte UI als anker: de kijker herkent wat hij elke dag ziet.' };
  const compact = kind === 'square';
  const anchorSize = kind === 'wide' ? 62 : 58;

  // ---------- layout (eenmalig, pure functie van het formaat) ----------
  const L = (function () {
    const o = {};
    const pw = kind === 'wide' ? 880 : W - pad * 2;
    const cw = pw - 8, ch = K.cardMetrics(CARD, cw, compact).h;
    const ph = 32 + 72 + 24 + ch + 20;
    if (kind === 'wide') { o.panel = { x: pad + 24, y: (cy0 + cy1) / 2 - ph / 2, w: pw, h: ph }; o.anchor = { x: pad + 24 + pw + 72, y: (cy0 + cy1) / 2 - 20, align: 'left' }; }
    else { const top = (cy0 + cy1) / 2 - (ph + 200) / 2; o.panel = { x: pad, y: top + 200, w: pw, h: ph }; o.anchor = { x: W / 2, y: top + 60, align: 'center' }; }
    o.query = { x: o.panel.x + 32, y: o.panel.y + 32, w: pw - 64, h: 72 };
    o.card = { x: o.panel.x + 4, y: o.panel.y + 32 + 72 + 24, w: cw, h: ch, lw: cw };
    return o;
  })();

  function focus(name) {
    if (name === 'panel') return { x: L.panel.x + L.panel.w / 2, y: L.panel.y + L.panel.h / 2 };
    return null; // midden
  }

  function draw(t) {
    K.panel(L.panel, F('panel.in', t));
    const shown = Math.ceil(QUERY.length * (RM ? (t >= M['query.type'][0] ? 1 : 0) : raw('query.type', t)));
    const typing = t > M['query.type'][0] && t < M['query.type'][1] + 0.4;
    K.searchBar(L.query, QUERY, shown, typing && !RM, F('panel.in', t));
    const inP = P('card.in', t);
    K.resultCard(CARD, { ...L.card, y: L.card.y + (1 - inP) * 16 }, { alpha: F('card.in', t), box: 0, lw: L.card.lw, style: 'organic', compact });
    K.tag(L.card, 'label op de kaart', F('tag.in', t), 'organic');
    const a = F('anchor.a', t) * (1 - F('anchor.b', t));
    K.anchor(T.anchors.a, L.anchor.x, L.anchor.y, L.anchor.align, a, anchorSize);
    K.anchor(T.anchors.b, L.anchor.x, L.anchor.y, L.anchor.align, F('anchor.b', t), anchorSize, C.accent);
  }

  window.SCENE = { focus, draw };
})();
