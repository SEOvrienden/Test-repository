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
   `spel.html`, de mappen `css`, `js`, `verslag-teksten`, `img`, enzovoort) en sleep het naar
   rechts, in `public_html`. Niet de map `jkz-game` zelf slepen, anders wordt
   het adres jaarverslag.jkz.nl/jkz-game/.
5. **Controleer.** Open jaarverslag.jkz.nl op je telefoon. Je moet het
   startscherm zien. Klaar.

Bij een update vervang je alleen de gewijzigde bestanden: zelfde stappen,
FileZilla vraagt "overschrijven?" en dan kies je ja.

**Over de browsercache:** achter elk bestand staat een versienummer
(zoals `?v=5`). Daardoor kan de browser van een speler nooit oude en nieuwe
bestanden door elkaar gebruiken. Gaat het laden tóch een keer mis (bijv.
door een halve upload), dan verschijnt er automatisch een rode balk met
uitleg in plaats van een pagina die stilletjes niets doet.

---

## Wat je nog moet invullen

1. **Verslagtitels** — `js/titels.js`: vervang "Verslag 1" t/m "Verslag 7"
   door de echte namen, bijv. "Verslag voorzitter", "Verslag penningmeester",
   "Verslag Coco 1 (Kars)". Deze titels verschijnen in het verslagenoverzicht
   en bovenaan elk verslag.

2. **Verslagen** — de verslagen zijn gewone tekstpagina's, geen PDF's meer.
   Open `verslag-teksten/verslag-1.html` t/m `verslag-7.html` in een
   teksteditor (Kladblok kan al) en vervang de voorbeeldtekst. Bovenin elk
   bestand staat precies uitgelegd hoe je koppen, alinea's, opsommingen en
   **foto's** toevoegt. Foto's zet je in de map `/img/` en verwijs je aan met
   `<img src="img/naam.jpg" alt="omschrijving">`. Bestandsnamen van de
   verslagen gelijk houden.

3. **Admin-sleutel** — In `admin.html` staat `const BEHEER_SLEUTEL = 'GEHEIM';` bovenaan het script. Verander dit naar een eigen wachtwoord. In fase 2 staat dit in `config.php`.

**Namen hoef je niet in te vullen:** spelers typen zelf hun naam op het
startscherm en bevestigen die. Er is geen vaste ledenlijst.

**Logo hoef je niet te uploaden:** het gouden "JKZ"-tekstlogo is definitief.

---

## Scores resetten (na de testfase!)

1. Ga naar `jaarverslag.jkz.nl/admin.html?key=GEHEIM` (of jouw eigen sleutel
   als je die veranderd hebt).
2. Scrol naar het blok **"Alles wissen"**.
3. Typ in het veld letterlijk `RESET` (hoofdletters) en klik op
   **Alles wissen**. Bevestig de vraag die verschijnt.
4. Alle spelers en scores zijn nu weg; iedereen begint bij nul.

Eén speler wissen kan ook, in het blok erboven: kies de naam en klik
**Wis deze speler**.

**Let op in fase 1:** de scores staan per apparaat in de browser
(localStorage). Resetten via admin wist dus alleen het apparaat waarop je
de adminpagina opent. Pas in fase 2 (database) wist de reset alles voor
iedereen in één keer — daarom doe je de echte reset ná fase 2, vlak voor
28 augustus.

---

## Bestandsstructuur

```
jkz-game/
  index.html          Startscherm, naam typen + bevestigen
  spel.html           Spel-flow: uitleg, oefenen, spelen, score
  verslag.html        Toont één verslag als tekstpagina
  verslagen.html      Overzicht van alle 7 verslagen (open/op slot)
  ranglijst.html      Scorebord (ververst elke 15 sec)
  eindstand.html      Beamerpagina voor op de vergadering
  admin.html          Beheerpagina (?key=GEHEIM)

  css/stijl.css       Alle stijlen, JKZ-huisstijl + arcade-laagje
  js/
    api.js            Adapterlaag (fase 1: localStorage, fase 2: fetch)
    app.js            Gedeelde hulpfuncties + navigatiebalk
    titels.js         Verslagtitels — TODO: echte namen
    geluid.js         Uitgeschakeld (stille stub)
    spellen/
      spel1.js        Reactietest
      spel2.js        JKZ Breakout (letters JKZ leegspelen)
      spel3.js        Simon
      spel4.js        Mepspel
      spel5.js        Snake
      spel6.js        One-button (Flappy style)
      spel7.js        Pong tegen de computer
  verslag-teksten/
    verslag-1.html ... verslag-7.html   (nu: voorbeeldtekst, zelf invullen)
  img/                Hier zet je foto's voor in de verslagen
```

---

## Hoe het werkt

### Gebruikersflow
1. Bezoeker typt zijn naam op `index.html` en bevestigt ("Zeker weten?").
   Wie later precies dezelfde naam typt, gaat verder waar hij was.
2. Speler-ID wordt opgeslagen in `localStorage`.
3. Bij terugkeer: "Welkom terug" scherm met directe knop naar het volgende level.
4. `spel.html?level=N` regelt: uitleg → oefenen → aftelling → spelen → score.
5. Na spelen: verslag als tekstpagina in `verslag.html`.
6. Onderaan elke pagina staat een vaste navigatiebalk: Spelen, Verslagen,
   Ranglijst. Tijdens het spelen verdwijnt hij even, zodat je hem niet per
   ongeluk aanraakt.

### Score-formules (niet aanpassen zonder backend-update)
| Spel | Ruwe waarde | Formule |
|------|-------------|---------|
| 1 Reactie | gem. ms | `(550 - gem) / 3.5` |
| 2 Breakout | stenen + tijd | `stenen * 2` + tijdbonus (max 38) bij alles leeg |
| 3 Simon | level | `level * 8` |
| 4 Mepspel | treffers | `treffers * 4` |
| 5 Snake | appels | `appels * 5` |
| 6 One-button | palen | `palen * 5` |
| 7 Pong | terugslagen | `terugslagen * 8` |
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
- [ ] Navigatiebalk onderaan valt niet achter de iPhone-homebalk
- [ ] Portretoriëntatie-melding verschijnt bij draaien (tijdens een spel)
- [ ] Spel pauzeert bij binnenkomend telefoontje (`visibilitychange`)
- [ ] Naam typen + bevestigen werkt, en dezelfde naam opnieuw typen geeft je voortgang terug
- [ ] Terugkomen na een dag: "Welkom terug" + juist level
- [ ] Twee pogingen per spel: beide pogingen tellen, hoogste in ranglijst
- [ ] Admin: spel sluiten → gesloten-scherm zichtbaar
- [ ] Admin: testmodus → alle levels direct speelbaar

**DevTools-modus (Chrome) is NIET voldoende.** Echte touch en Safari-eigenaardighedentests vereisen echte apparaten.

---

*Learning by doing — JKZ since 1957*
