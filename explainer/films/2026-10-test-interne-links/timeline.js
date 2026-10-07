// TIMELINE: de enige bron voor beats, bewegingen, camera, cues en captions van deze film.
// 96 BPM, 1 beat = 0,625 s, 48 beats = 30 s. Kernacties op het beatraster.
(function (root) {
  const BPM = 96;
  const B = 60 / BPM;
  const b = (n) => +(n * B).toFixed(4);

  const TIMELINE = {
    bpm: BPM,
    beat: B,
    duration: b(48), // 30 s
    fps: 60,
    seed: 20261031,

    scenes: [
      { id: 'S1', name: 'Vraag', t0: 0, t1: b(5) },
      { id: 'S2', name: 'Model', t0: b(5), t1: b(14) },
      { id: 'S3', name: 'Bewijs', t0: b(14), t1: b(31) },
      { id: 'S4', name: 'Turn', t0: b(31), t1: b(40) },
      { id: 'S5', name: 'Payoff', t0: b(40), t1: b(48) },
    ],

    moves: {
      // S1 Vraag: pagina gaat online
      'page.in': [0, 0.35],
      'publish.click': [b(1), b(1.6)],
      'status.on': [b(1.6), b(2.2)],
      'anchor.s1a': [b(2), b(3)],
      'anchor.s1b': [b(3), b(4)],
      // S2 Model: pagina wordt een kaartje in de sitekaart
      'toMap': [b(5), b(7)],
      'pages.in': [b(6), b(8)],
      'google.in': [b(8), b(9)],
      'links.in': [b(10), b(12)],
      // S3 Bewijs: Google volgt de links
      'wave.1': [b(14), b(15.5)],
      'wave.2': [b(16), b(17.5)],
      'dim': [b(20), b(21)],
      'notfound': [b(25), b(26)],
      // S4 Turn: één link erbij
      'undim': [b(31), b(32)],
      'link.new': [b(32), b(33.5)],
      'anchor.s4': [b(33), b(34)],
      'wave.3a': [b(34), b(35)],
      'wave.3b': [b(35), b(36.5)],
      'found': [b(36.5), b(37.5)],
      // S5 Payoff: hetzelfde beeld, nu goed gelezen
      'mapOut': [b(40), b(40.8)],
      'toCard': [b(40.4), b(42.4)],
      'anchor.s5': [b(43), b(44)],
      'sign.in': [b(45), b(46)],
    },

    camera: [
      { t: 0, zoom: 1.03, focus: 'card' },
      { t: b(5), zoom: 1.03, focus: 'card' },
      { t: b(7), zoom: 1.0, focus: 'center' },
      { t: b(31), zoom: 1.0, focus: 'center' },
      { t: b(32.5), zoom: 1.06, focus: 'newLink' },
      { t: b(39), zoom: 1.06, focus: 'newLink' },
      { t: b(41), zoom: 1.0, focus: 'center' },
    ],

    cues: [
      { t: b(1.6), type: 'click', note: 'klik op Publiceren' },
      { t: b(1.6), type: 'pop', note: 'status Online' },
      { t: b(6), type: 'pop', note: 'bestaande pagina\'s verschijnen' },
      { t: b(8), type: 'tick', note: 'Google bij Home' },
      { t: b(10), type: 'tick', note: 'links tekenen' },
      { t: b(15.5), type: 'tick', note: 'golf 1 komt aan' },
      { t: b(17.5), type: 'tick', note: 'golf 2 komt aan' },
      { t: b(17.5), type: 'motif', gain: 0.5, note: 'motief zacht: link gevolgd, pagina gevonden' },
      { t: b(25), type: 'thud', note: 'Niet gevonden' },
      { t: b(32), type: 'switch', note: 'nieuwe link' },
      { t: b(36.5), type: 'pop', note: 'Airco bereikt' },
      { t: b(36.5), type: 'motif', gain: 0.8, note: 'motief: gevonden via de link' },
      { t: b(44), type: 'motif', gain: 1.0, note: 'motief vol: payoff' },
    ],
    bed: {
      chords: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]],
      arpFrom: b(5), arpUntil: b(31), dropFrom: b(31), dropUntil: b(33), arpBackFrom: b(40),
    },

    captions: [
      { t0: 0.3, t1: b(5.5), text: 'Nieuwe pagina online. Staat hij nu in Google?' },
      { t0: b(5.5), t1: b(10), text: 'Google komt binnen via Home.' },
      { t0: b(10), t1: b(14), text: 'Die zijn met links verbonden.' },
      { t0: b(14), t1: b(20), text: 'Google volgt die links, van pagina naar pagina.' },
      { t0: b(20), t1: b(25), text: 'Naar de nieuwe pagina loopt geen link.' },
      { t0: b(25), t1: b(31), text: 'Dus Google komt er zo niet langs.' },
      { t0: b(31), t1: b(36), text: 'Nu één link erbij, vanaf Diensten.' },
      { t0: b(36), t1: b(40), text: 'Google volgt hem en vindt de pagina.' },
      { t0: b(40), t1: b(44.5), text: 'Een nieuwe pagina heeft een link nodig.' },
      { t0: b(44.5), t1: b(48) - 0.1, text: 'Die link leggen wij altijd.' },
    ],

    anchors: {
      s1: ['Online.', 'Dus in Google?'],
      s4: ['Eén link', 'erbij.'],
      s5: ['Online, met een link:', 'zo vindt Google hem.'],
    },

    beats: [
      { id: 'S1-a', t: 1.2 }, { id: 'S1-b', t: b(4.6) },
      { id: 'S2-a', t: b(6) }, { id: 'S2-b', t: b(9.5) }, { id: 'S2-c', t: b(13) },
      { id: 'S3-a', t: b(15) }, { id: 'S3-b', t: b(19) }, { id: 'S3-c', t: b(23) }, { id: 'S3-d', t: b(29) },
      { id: 'S4-a', t: b(33) }, { id: 'S4-b', t: b(35.7) }, { id: 'S4-c', t: b(39) },
      { id: 'S5-a', t: b(41.2) }, { id: 'S5-b', t: b(44) }, { id: 'S5-c', t: b(47.5) },
    ],
  };

  root.TIMELINE = TIMELINE;
  if (typeof module !== 'undefined') module.exports = TIMELINE;
})(typeof window !== 'undefined' ? window : globalThis);
