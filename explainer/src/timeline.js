// Eén bron van waarheid: elke beat, beweging, cue en caption.
// Tijden in seconden. Kernacties liggen op het beat-raster (96 BPM, 1 beat = 0,625 s).
(function (root) {
  const BPM = 96;
  const B = 60 / BPM; // 0.625
  const b = (n) => +(n * B).toFixed(4);

  const TIMELINE = {
    bpm: BPM,
    beat: B,
    duration: b(96), // 60 s
    fps: 60,
    seed: 20261007,

    scenes: [
      { id: 'S1', name: 'Vraag', t0: 0, t1: b(10) },
      { id: 'S2', name: 'Model', t0: b(10), t1: b(34) },
      { id: 'S3', name: 'Bewijs', t0: b(34), t1: b(68) },
      { id: 'S4', name: 'Turn', t0: b(68), t1: b(84) },
      { id: 'S5', name: 'Payoff', t0: b(84), t1: b(96) },
    ],

    // Bewegingen: [t0, t1]. Elk object leeft door en verandert van vorm.
    moves: {
      // S1 Vraag
      'serp.in': [0, 0.5],
      'query.type': [0.15, 1.0],
      'cardA.in': [b(2), b(3)],
      'cardB.in': [b(3), b(4)],
      'anchor.s1a': [b(4), b(5)],
      'anchor.s1b': [b(6), b(7)],
      // S2 Model: resultaten worden twee lanen
      'serp.out': [b(10), b(11)],
      'split': [b(10), b(12)],
      'laneA.title': [b(12), b(13)],
      'budget.in': [b(12), b(13)],
      'click.1': [b(14) - 0.35, b(14)],
      'click.2': [b(15) - 0.35, b(15)],
      'click.3': [b(16) - 0.35, b(16)],
      'click.4': [b(17) - 0.35, b(17)],
      'click.5': [b(18) - 0.35, b(18)],
      'click.6': [b(19) - 0.35, b(19)],
      'budget.refill': [b(21), b(22)],
      'laneB.title': [b(24), b(25)],
      'block.1': [b(26), b(27)],
      'block.2': [b(28), b(29)],
      'block.3': [b(30), b(31)],
      // S3 Bewijs: lanen worden grafiek
      'toChart': [b(34), b(36)],
      'axes.in': [b(35), b(36.5)],
      'run1': [b(38), b(66)],
      'band.in': [b(50), b(51)],
      // S4 Turn: budget uit
      'switch.off': [b(70), b(70.6)],
      'ads.drop': [b(70.6), b(71.6)],
      'anchor.s4a': [b(71.6), b(72.6)],
      'run2': [b(72), b(82)],
      'anchor.s4b': [b(75), b(76)],
      // S5 Payoff: hetzelfde beeld, nu goed gelezen
      'toSerp': [b(84), b(86)],
      'tagA.in': [b(86), b(87)],
      'tagB.in': [b(87.5), b(88.5)],
      'anchor.s5': [b(89), b(90)],
      'sign.in': [b(92), b(93)],
    },

    // Grafiek (schematisch): maanden 0..24
    chart: {
      months: 24,
      switchMonth: 17,
      adsLevel: 0.5,
      orgFloor: 0.04,
      orgTop: 0.38,
      orgMid: 8,
      orgWidth: 2.2,
      band: [4, 12],
    },

    // Camera: alleen tussen ideeën. Stil zolang er tekst gelezen wordt.
    camera: [
      { t: 0, zoom: 1.03, focus: 'serp' },
      { t: b(10), zoom: 1.03, focus: 'serp' },
      { t: b(12), zoom: 1.0, focus: 'center' },
      { t: b(68), zoom: 1.0, focus: 'center' },
      { t: b(69.6), zoom: 1.06, focus: 'switchPoint' },
      { t: b(82), zoom: 1.06, focus: 'switchPoint' },
      { t: b(84), zoom: 1.0, focus: 'center' },
    ],

    // Geluid: elk cue hoort bij een actie die betekenis draagt.
    cues: [
      { t: b(2), type: 'pop', note: 'kaart A verschijnt' },
      { t: b(3), type: 'pop', note: 'kaart B verschijnt' },
      { t: b(14), type: 'click' }, { t: b(15), type: 'click' }, { t: b(16), type: 'click' },
      { t: b(17), type: 'click' }, { t: b(18), type: 'click' }, { t: b(19), type: 'click' },
      { t: b(21), type: 'refill', note: 'nieuw budget' },
      { t: b(27), type: 'thud', note: 'content' },
      { t: b(29), type: 'thud', note: 'techniek' },
      { t: b(31), type: 'thud', note: 'links' },
      { t: b(31), type: 'motif', gain: 0.55, note: 'motief, eerste keer: organisch opgebouwd' },
      { t: b(38), type: 'tick', note: 'tijd loopt' },
      { t: b(50), type: 'swell', note: 'band 4 mnd tot 1 jaar' },
      { t: b(70), type: 'switch', note: 'budget uit' },
      { t: b(70.6), type: 'drop', note: 'advertentie valt weg' },
      { t: b(72), type: 'motif', gain: 0.8, note: 'motief: positie blijft' },
      { t: b(89), type: 'motif', gain: 1.0, note: 'motief: payoff' },
    ],

    // Bed-arrangement: welke lagen spelen wanneer
    bed: {
      chords: [ // per 2 maten (8 beats)
        [50, 57, 62, 66, 69], // Dmaj7-ish
        [47, 54, 59, 62, 66], // Bm7
        [43, 50, 55, 59, 62], // Gmaj7
        [45, 52, 57, 61, 64], // A
      ],
      arpFrom: b(10),
      arpUntil: b(70),
      dropFrom: b(70), dropUntil: b(72),
      arpBackFrom: b(84),
    },

    // Captions = de vertelling. Brandt in en gaat mee als .srt.
    captions: [
      { t0: 0.3, t1: b(5.5), text: 'Hetzelfde bedrijf, twee keer bovenaan in Google.' },
      { t0: b(5.5), t1: b(10), text: 'Lijkt hetzelfde. Het werkt totaal anders.' },
      { t0: b(10), t1: b(17), text: 'De bovenste is een advertentie. Die herken je aan "Gesponsord".' },
      { t0: b(17), t1: b(24), text: 'Elke klik kost geld. Dus elke maand nieuw budget.' },
      { t0: b(24), t1: b(29), text: 'De tweede is organisch. Die positie koop je niet.' },
      { t0: b(29), t1: b(34), text: 'Je bouwt hem op: content, techniek en links.' },
      { t0: b(34), t1: b(42), text: 'Zet ze naast elkaar, twee jaar lang. Budget staat aan.' },
      { t0: b(42), t1: b(50), text: 'Een advertentie levert vanaf dag één bezoekers op.' },
      { t0: b(50), t1: b(60), text: 'Organisch start langzaam. Google zelf noemt vier maanden tot een jaar.' },
      { t0: b(60), t1: b(68), text: 'Daarna levert het bezoekers op, zonder kosten per klik.' },
      { t0: b(68), t1: b(75), text: 'Verander nu één ding: het budget stopt.' },
      { t0: b(75), t1: b(83), text: 'De advertentie verdwijnt meteen. De organische positie blijft staan.' },
      { t0: b(83), t1: b(89), text: 'Twee keer bovenaan, niet hetzelfde. Huren of opbouwen.' },
      { t0: b(89), t1: b(96) - 0.1, text: 'Gebruik Google Ads voor nu, en bouw SEO voor straks.' },
    ],

    // Ankerwoorden in beeld (max 8 woorden per regel, max 2 regels)
    anchors: {
      's1': ['Twee keer bovenaan.', 'Hetzelfde?'],
      's4': ['Advertentie weg.', 'Positie blijft.'],
      's5': ['Google Ads voor nu.', 'SEO voor straks.'],
    },

    // Stills voor contact sheet en verificatie: één per beat in het verhaal
    beats: [
      { id: 'S1-a', t: 1.0 }, { id: 'S1-b', t: b(8) },
      { id: 'S2-a', t: b(13.5) }, { id: 'S2-b', t: b(20) }, { id: 'S2-c', t: b(22.5) }, { id: 'S2-d', t: b(33) },
      { id: 'S3-a', t: b(37) }, { id: 'S3-b', t: b(46) }, { id: 'S3-c', t: b(56) }, { id: 'S3-d', t: b(65) },
      { id: 'S4-a', t: b(70.3) }, { id: 'S4-b', t: b(73.5) }, { id: 'S4-c', t: b(81) },
      { id: 'S5-a', t: b(88) }, { id: 'S5-b', t: b(95) },
    ],
  };

  root.TIMELINE = TIMELINE;
  if (typeof module !== 'undefined') module.exports = TIMELINE;
})(typeof window !== 'undefined' ? window : globalThis);
