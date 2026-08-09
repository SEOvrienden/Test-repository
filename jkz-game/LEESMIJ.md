# JKZ Jaarverslag Game — LEESMIJ

## Snel starten (fase 1, lokaal testen)

ES-modules werken **niet** met een `file://`-URL in Chrome. Gebruik één van:

**Python (snelst):**
```bash
cd jkz-game
python3 -m http.server 8080
# Open http://localhost:8080
```

**Firefox of Safari** openen het bestand direct via `file://` wél correct.

---

## Wat je nog moet invullen

1. **Namen** — `js/leden.js`: vervang de 21 dummy-namen door de echte ledenlijst.

2. **Quizvragen** — `js/spellen/vragen.js`: vervang de 10 vragen (`// TODO`) door echte JKZ-vragen. Ook de oefenvraag (`oefenvraag`) aanpassen. Formaat:
   ```js
   { vraag: 'Tekst?', opties: ['A','B','C','D'], goed: 0 /* index 0-3 */ }
   // Optioneel: uitleg: 'Dit is het goede antwoord omdat...'
   ```

3. **Logo** — verwijder de `<div class="logo-placeholder">` in de drie HTML-bestanden en vervang door:
   ```html
   <img src="img/jkz-logo.png" alt="JKZ" class="logo-img" style="height:36px">
   ```
   Sla het logo op als `img/jkz-logo.png`.

4. **PDF's** — vervang `pdf/verslag-1.pdf` t/m `pdf/verslag-7.pdf` door de echte verslagen. Dezelfde bestandsnamen aanhouden.

5. **Admin-sleutel** — In `admin.html` staat `const BEHEER_SLEUTEL = 'GEHEIM';` bovenaan het script. Verander dit naar een eigen wachtwoord. In fase 2 staat dit in `config.php`.

---

## Bestandsstructuur

```
jkz-game/
  index.html          Startscherm, naam kiezen
  spel.html           Spel-flow: uitleg, oefenen, spelen, score
  verslag.html        PDF-viewer + knop naar volgend level
  ranglijst.html      Scorebord (ververst elke 15 sec)
  eindstand.html      Beamerpagina voor op de vergadering
  admin.html          Beheerpagina (?key=GEHEIM)

  css/stijl.css       Alle stijlen, JKZ-huisstijl + arcade-laagje
  js/
    api.js            Adapterlaag (fase 1: localStorage, fase 2: fetch)
    app.js            Gedeelde hulpfuncties
    leden.js          Namenlijst — TODO: echte namen
    geluid.js         WebAudio-geluidseffecten
    spellen/
      spel1.js        Reactietest
      spel2.js        Memory
      spel3.js        Simon
      spel4.js        Mepspel
      spel5.js        Snake
      spel6.js        One-button (Flappy style)
      spel7.js        Quiz
      vragen.js       Quiz-vragen — TODO: echte vragen
  pdf/
    verslag-1.pdf ... verslag-7.pdf   (nu: dummy's)
```

---

## Hoe het werkt

### Gebruikersflow
1. Bezoeker kiest naam op `index.html`.
2. Speler-ID wordt opgeslagen in `localStorage`.
3. Bij terugkeer: "Welkom terug" scherm met directe knop naar het volgende level.
4. `spel.html?level=N` regelt: uitleg → oefenen → aftelling → spelen → score.
5. Na spelen: verslag als PDF in `verslag.html`.
6. Ranglijst is altijd zichtbaar.

### Score-formules (niet aanpassen zonder backend-update)
| Spel | Ruwe waarde | Formule |
|------|-------------|---------|
| 1 Reactie | gem. ms | `(550 - gem) / 3.5` |
| 2 Memory | beurten | `100 - (beurten - 6) * 4` |
| 3 Simon | level | `level * 8` |
| 4 Mepspel | treffers | `treffers * 4` |
| 5 Snake | appels | `appels * 5` |
| 6 One-button | palen | `palen * 5` |
| 7 Quiz | goed | `goed * 10` |
Alle scores worden begrensd op 0–100.

### Beheerpagina
`admin.html?key=GEHEIM`
- Spel openen/sluiten
- Testmodus (alle levels direct open)
- Speler of alles wissen

### Beamerpagina
`eindstand.html` — fullscreen, ververst elke 15 seconden, bedoeld voor laptop op beamer.

---

## Fase 2: PHP-backend (nog niet uitvoeren)

Na akkoord op fase 1:
- `api.php` met de zes endpoints
- `config.php` met databasegegevens
- `installatie.sql` voor phpMyAdmin
- `js/api.js` omzetten naar fetch-aanroepen
- Rate limiting (60 req/min/IP)

Upload-volgorde voor FileZilla:
1. Upload alle bestanden naar de Cloudways-applicatiemap
2. Draai `installatie.sql` in phpMyAdmin
3. Stel `config.php` in met databasegegevens
4. Test met `admin.html?key=<jouwsleutel>`
5. Open het spel via `admin.html`

---

## Testen — belangrijk!

**Dit zijn zaken die je zelf moet testen op echte apparaten:**

- [ ] iPhone (Safari) — met name: dvh-hoogte, safe-area-inset-bottom, touch events
- [ ] Android Chrome — canvas rendering, touch events
- [ ] Geluid werkt (iOS: mute-schakelaar naast het scherm maakt dit soms stil)
- [ ] Portretoriëntatie-melding verschijnt bij draaien
- [ ] Spel pauzeert bij binnenkomend telefoontje (`visibilitychange`)
- [ ] Naam kiezen werkt (eigen naam invullen + namenlijst)
- [ ] Terugkomen na een dag: "Welkom terug" + juist level
- [ ] Twee pogingen per spel: beide pogingen tellen, hoogste in ranglijst
- [ ] Admin: spel sluiten → gesloten-scherm zichtbaar
- [ ] Admin: testmodus → alle levels direct speelbaar

**DevTools-modus (Chrome) is NIET voldoende.** Echte touch en Safari-eigenaardighedentests vereisen echte apparaten.

---

*Learning by doing — JKZ since 1957*
