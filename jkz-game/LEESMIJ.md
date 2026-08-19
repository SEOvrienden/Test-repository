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

## Op de server zetten (fase 1, stap voor stap)

Je hebt al: het subdomein `jaarverslag.jkz.nl` en een PHP-applicatie in Cloudways.

1. **Zoek je FTP-gegevens op in Cloudways.** Log in op Cloudways, klik op je
   server en dan op de applicatie van jaarverslag.jkz.nl. Bij **Access Details**
   staat een blokje "Application Credentials": daar staan een gebruikersnaam en
   wachtwoord (maak ze aan als ze er nog niet staan, met de knop erbij).
   Het adres (host) is het IP-adres van je server, dat staat bovenaan dezelfde
   pagina.
2. **Verbind met FileZilla.** Bovenin FileZilla vul je in: Host = het IP-adres,
   gebruikersnaam en wachtwoord = de Application Credentials, poort = 22 en zet
   "sftp://" voor het IP-adres (dus bijvoorbeeld `sftp://12.34.56.78`).
   Klik op Snelverbinden.
3. **Ga naar de juiste map.** Rechts in FileZilla zie je de server. Open de map
   `public_html`. Daar staat mogelijk een standaardbestand van Cloudways
   (bijvoorbeeld `index.php`) — die mag je verwijderen.
4. **Sleep de bestanden erin.** Links in FileZilla ga je naar de map `jkz-game`
   op je computer. Selecteer alles wat **in** die map staat (dus `index.html`,
   `spel.html`, de mappen `css`, `js`, `pdf`, enzovoort) en sleep het naar
   rechts, in `public_html`. Niet de map `jkz-game` zelf slepen, anders wordt
   het adres jaarverslag.jkz.nl/jkz-game/.
5. **Controleer.** Open jaarverslag.jkz.nl op je telefoon. Je moet het
   startscherm zien. Klaar.

Bij een update vervang je alleen de gewijzigde bestanden: zelfde stappen,
FileZilla vraagt "overschrijven?" en dan kies je ja.

---

## Wat je nog moet invullen

1. **Quizvragen** — `js/spellen/vragen.js`: vervang de 10 vragen (`// TODO`) door echte JKZ-vragen. Ook de oefenvraag (`oefenvraag`) aanpassen. Formaat:
   ```js
   { vraag: 'Tekst?', opties: ['A','B','C','D'], goed: 0 /* index 0-3 */ }
   // Optioneel: uitleg: 'Dit is het goede antwoord omdat...'
   ```

2. **PDF's** — vervang `pdf/verslag-1.pdf` t/m `pdf/verslag-7.pdf` door de echte verslagen. Dezelfde bestandsnamen aanhouden.

3. **Admin-sleutel** — In `admin.html` staat `const BEHEER_SLEUTEL = 'GEHEIM';` bovenaan het script. Verander dit naar een eigen wachtwoord. In fase 2 staat dit in `config.php`.

**Namen hoef je niet in te vullen:** spelers typen zelf hun naam op het
startscherm en bevestigen die. Er is geen vaste ledenlijst.

**Logo hoef je niet te uploaden:** het gouden "JKZ"-tekstlogo is definitief.

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
1. Bezoeker typt zijn naam op `index.html` en bevestigt ("Zeker weten?").
   Wie later precies dezelfde naam typt, gaat verder waar hij was.
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
- [ ] Naam typen + bevestigen werkt, en dezelfde naam opnieuw typen geeft je voortgang terug
- [ ] Terugkomen na een dag: "Welkom terug" + juist level
- [ ] Twee pogingen per spel: beide pogingen tellen, hoogste in ranglijst
- [ ] Admin: spel sluiten → gesloten-scherm zichtbaar
- [ ] Admin: testmodus → alle levels direct speelbaar

**DevTools-modus (Chrome) is NIET voldoende.** Echte touch en Safari-eigenaardighedentests vereisen echte apparaten.

---

*Learning by doing — JKZ since 1957*
