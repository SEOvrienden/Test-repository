// Quiz-vragen voor spel 7
// TODO: vervang deze placeholdervragen door de echte 11 JKZ-vragen
// Formaat: { vraag: string, opties: string[4], goed: 0|1|2|3, uitleg?: string }
// 'goed' is de index (0-3) van het juiste antwoord

export const vragen = [
  // Vraag 1
  {
    vraag: 'In welk jaar is Junior Kamer Zaanstreek opgericht?',
    opties: ['1945', '1957', '1963', '1972'],
    goed: 1,
  },
  // Vraag 2
  {
    vraag: 'Wat is de slogan van JKZ?',
    opties: [
      'Samen sterker',
      'Ondernemend Zaanstreek',
      'Learning by doing',
      'Verbinden en groeien',
    ],
    goed: 2,
  },
  // Vraag 3
  {
    vraag: 'Waar staat JCI voor?',
    opties: [
      'Junior Commerce Initiative',
      'Junior Chamber International',
      'Junior Club International',
      'Junior Company Integration',
    ],
    goed: 1,
  },
  // Vraag 4
  {
    vraag: 'Tot welke leeftijdsgroep kun je lid worden van JKZ?',
    opties: ['18 tot 35 jaar', '21 tot 45 jaar', '25 tot 40 jaar', '20 tot 35 jaar'],
    goed: 2,
  },
  // Vraag 5
  {
    vraag: 'Wat voor soort organisatie is JCI?',
    opties: ['Vakbond', 'Politieke partij', 'Serviceclub', 'Sportvereniging'],
    goed: 2,
  },
  // Vraag 6
  {
    vraag: 'In welke regio zijn de leden van JKZ actief?',
    opties: ['Amsterdam', 'Zaanstreek', 'Waterland', 'Haarlem'],
    goed: 1,
  },
  // Vraag 7 — TODO: echte vraag
  {
    vraag: 'TODO: Echte vraag over het jaarverslag invullen.',
    opties: ['Optie A', 'Optie B', 'Optie C', 'Optie D'],
    goed: 0,
  },
  // Vraag 8 — TODO
  {
    vraag: 'TODO: Echte vraag over een activiteit van dit jaar.',
    opties: ['Antwoord 1', 'Antwoord 2', 'Antwoord 3', 'Antwoord 4'],
    goed: 1,
  },
  // Vraag 9 — TODO
  {
    vraag: 'TODO: Echte vraag over een JKZ-prestatie van dit jaar.',
    opties: ['Keuze A', 'Keuze B', 'Keuze C', 'Keuze D'],
    goed: 2,
  },
  // Vraag 10 — TODO
  {
    vraag: 'TODO: Afsluitende vraag over het jaarthema of de vergadering.',
    opties: ['Mogelijkheid 1', 'Mogelijkheid 2', 'Mogelijkheid 3', 'Mogelijkheid 4'],
    goed: 3,
  },
];

// Aparte oefenvraag — wordt alleen in de oefenronde gebruikt
// TODO: vul een echte voorbeeldvraag in met uitleg
export const oefenvraag = {
  vraag: 'Waar staat de afkorting "JCI" voor?',
  opties: [
    'Junior Company Integration',
    'Junior Chamber International',
    'Junior Club Initiatives',
    'Junior Commerce Institute',
  ],
  goed: 1,
  uitleg: 'JCI staat voor Junior Chamber International, de wereldwijde koepelorganisatie '
        + 'van jonge ondernemers en professionals. JKZ is de Zaanstreekse afdeling.',
};
