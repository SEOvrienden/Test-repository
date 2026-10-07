// TIMELINE: de enige bron voor beats, bewegingen, camera, cues en captions van deze film.
// Tijden in seconden. Zet kernacties op het beatraster: b(n) = n beats.
// Dit sjabloon is een werkende mini-film van 12 s. Vervang alles door je eigen verhaal.
(function (root) {
  const BPM = 96;
  const B = 60 / BPM;
  const b = (n) => +(n * B).toFixed(4);

  const TIMELINE = {
    bpm: BPM,
    beat: B,
    duration: b(20), // 12,5 s; een echte film: 30 tot 90 s
    fps: 60,
    seed: 1, // verander per film; alle "willekeur" komt hieruit

    // Optioneel: schaal en minimale tekstmaat per formaat overschrijven (standaard in engine/core.js)
    // format: { scale: { tall: 1.35 }, min: { tall: 26 } },

    // Verhaalboog: Vraag 0-10%, Model 10-35%, Bewijs 35-75%, Turn 75-90%, Payoff 90-100%
    scenes: [
      { id: 'S1', name: 'Vraag', t0: 0, t1: b(8) },
      { id: 'S2', name: 'Payoff', t0: b(8), t1: b(20) },
    ],

    // Bewegingen [t0, t1]. In scenes.js: E.P(naam, t) voor positie, E.F(naam, t) voor dekking.
    moves: {
      'panel.in': [0, 0.5],
      'query.type': [0.15, 1.2],
      'card.in': [b(3), b(4)],
      'anchor.a': [b(4), b(5)],
      'tag.in': [b(10), b(11)],
      'anchor.b': [b(12), b(13)],
    },

    // Camera: zoom en focus (naam -> punt via SCENE.focus). Beweegt alleen tussen ideeën.
    camera: [
      { t: 0, zoom: 1.03, focus: 'panel' },
      { t: b(8), zoom: 1.03, focus: 'panel' },
      { t: b(9.5), zoom: 1.0, focus: 'center' },
    ],

    // Geluid. Types: typing {t1,n}, pop, click, refill, thud, tick, swell, switch, drop, motif {gain}
    cues: [
      { t: 0.15, t1: 1.2, n: 14, type: 'typing' },
      { t: b(3), type: 'pop' },
      { t: b(10), type: 'tick' },
      { t: b(12), type: 'motif', gain: 1.0, note: 'motief: het kernidee' },
    ],
    bed: {
      chords: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]],
      arpFrom: b(4), arpUntil: b(20), dropFrom: b(9), dropUntil: b(10), arpBackFrom: b(20),
    },

    // Captions = de vertelling (ingebrand + .srt). Max ~15 tekens per seconde.
    captions: [
      { t0: 0.3, t1: b(8), text: 'Dit is het misverstand, als beeld.' },
      { t0: b(8), t1: b(20) - 0.1, text: 'Hetzelfde beeld, nu goed gelezen.' },
    ],

    // Ankers in beeld: max 8 woorden per regel, max 2 regels
    anchors: {
      a: ['Wat denk je dat dit is?'],
      b: ['Nu zie je het verschil.'],
    },

    // Stills voor contact sheet en verificatie: minstens één per beat in het verhaal
    beats: [
      { id: 'S1-a', t: 0.8 }, { id: 'S1-b', t: b(6) },
      { id: 'S2-a', t: b(11) }, { id: 'S2-b', t: b(18) },
    ],
  };

  root.TIMELINE = TIMELINE;
  if (typeof module !== 'undefined') module.exports = TIMELINE;
})(typeof window !== 'undefined' ? window : globalThis);
