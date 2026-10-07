// Merk: de enige plek voor kleuren en lettertypes. Elke film leest dit.
// AANNAME: geen officiële merkbestanden aangeleverd. Vervang door de echte huisstijl (zie BRAND.md).
(function (root) {
  const BRAND = {
    name: 'SEO vrienden',
    color: {
      ground: '#F4EFE6',     // warme neutrale achtergrond
      surface: '#FFFCF7',    // kaarten, panelen
      ink: '#1E1C19',        // hoofdtekst
      ink2: '#5A554D',       // secundaire tekst, assen (6,45:1 op ground)
      rule: '#D8D0C2',       // lijnen, randen (decoratief)
      accent: '#185E44',     // het ene accent (6,7:1 op ground)
      accentSoft: '#DCEBE2', // vlak achter accenttekst
      captionBg: '#1E1C19',
      captionInk: '#FFFCF7',
    },
    type: {
      display: 'Caladea', // ankerzinnen, titels
      ui: 'Inter',        // UI, labels, captions
    },
    // Bestanden relatief aan brand/
    fonts: [
      { family: 'Inter', file: 'fonts/Inter-Regular.otf', weight: '400' },
      { family: 'Inter', file: 'fonts/Inter-SemiBold.otf', weight: '600' },
      { family: 'Caladea', file: 'fonts/Caladea-Regular.ttf', weight: '400' },
      { family: 'Caladea', file: 'fonts/Caladea-Bold.ttf', weight: '700' },
    ],
    signature: 'SEO vrienden', // afzender aan het eind, altijd met kleine v
  };
  root.BRAND = BRAND;
  if (typeof module !== 'undefined') module.exports = BRAND;
})(typeof window !== 'undefined' ? window : globalThis);
