# JKZ Jaarverslag Game — LEESMIJ

## Even weten: het spel praat nu met een database

Sinds fase 2 staan alle scores in een MySQL-database op de server. Daardoor
ziet iedereen elkaars scores in de ranglijst, op welk apparaat dan ook.
Het spel werkt dus alleen nog op de server (niet meer door bestanden lokaal
te openen) en de database moet één keer worden ingesteld — zie hieronder.

---

## Op de server zetten (stap voor stap)

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
5. **Database aanmaken (eenmalig).** Zie het blok "Database instellen"
   hieronder — dat is 10 minuten werk en hoeft maar één keer.
6. **Controleer.** Open jaarverslag.jkz.nl op je telefoon. Je moet het
   startscherm zien. Typ een testnaam en speel spel 1: verschijnt je score
   daarna in de ranglijst, dan werkt alles.

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

3. **Scoreteksten** — `js/teksten.js`: vervang de plagerige zinnetjes per
   scoreband door je eigen teksten over de kamer en de leden.

4. **Admin-sleutel** — die verzin je zelf en vul je in bij `config.php`
   (zie "Database instellen" hierboven).

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

De reset werkt op de database en geldt dus in één keer **voor iedereen**,
op alle telefoons. Precies wat je na de testfase nodig hebt, vlak voor
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

  eindkaart.html      Persoonlijke eindkaart na level 7 (screenshotbaar)

  api.php             Server-API: alle database-acties (fase 2)
  controle.php        Zelfcontrole: vertelt of de database goed staat
  config.voorbeeld.php  Voorbeeld-configuratie — invullen en opslaan als config.php
  installatie.sql     Eenmalig plakken in phpMyAdmin

  css/stijl.css       Alle stijlen, JKZ-huisstijl + arcade-laagje
  js/
    api.js            Adapterlaag: praat met api.php op de server
    app.js            Gedeelde hulpfuncties + navigatiebalk
    titels.js         Verslagtitels — TODO: echte namen
    teksten.js        Plagerige scoreteksten — TODO: eigen teksten
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
   Elk spel is onbeperkt opnieuw te spelen; de hoogste score telt. Via de
   blokjes in de voortgangsbalk spring je naar elk eerder gespeeld level.
5. Na spelen: verslag als tekstpagina in `verslag.html`.
6. Onderaan elke pagina staat een vaste navigatiebalk: Spelen, Verslagen,
   Ranglijst. Tijdens het spelen verdwijnt hij even, zodat je hem niet per
   ongeluk aanraakt.

### Score-formules (niet aanpassen zonder backend-update)
| Spel | Ruwe waarde | Formule |
|------|-------------|---------|
| 1 Reactie | gem. ms | `(550 - gem) / 3.5` |
| 2 Breakout | stenen + tijd | `stenen * 2` + tijdbonus (max 36) bij alles leeg |
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

## Database instellen (eenmalig, ± 10 minuten)

**Stap 1 — Zoek je databasegegevens op.**
Log in op Cloudways → klik op je server → klik op de applicatie van
jaarverslag.jkz.nl → **Access Details**. Bij het blok **MySQL Access** zie je:
DB Name, Username en Password. Laat dit tabblad open staan.

**Stap 2 — Maak de tabellen aan in phpMyAdmin.**
Bij datzelfde blok MySQL Access staat een knop **Launch Database Manager**
(dat is phpMyAdmin). Klik erop. Je ziet links de naam van je database —
klik daarop. Klik dan bovenin op het tabblad **SQL**. Open op je computer
het bestand `installatie.sql` in Kladblok, kopieer ALLES, plak het in het
grote vak en klik rechtsonder op **Start** (of "Go"). Je ziet dan drie
nieuwe tabellen verschijnen: spelers, scores en instellingen. Klaar.

**Stap 3 — Vul config.php in.**
Open op je computer het bestand `config.voorbeeld.php` in Kladblok.
Vul in wat er gevraagd wordt:
- de drie databasegegevens uit stap 1 (DB Name, Username, Password),
- een zelfverzonnen ADMIN_SLEUTEL (lange reeks letters en cijfers,
  bijvoorbeeld `jkz2026geheim8171`).
Sla het bestand op als **config.php** (dus zonder "voorbeeld" in de naam)
en upload het met FileZilla naar `public_html`, naast api.php.

**Stap 4 — Controleer met de zelfcontrole-pagina.**
Ga naar `jaarverslag.jkz.nl/controle.php`. Die pagina controleert alles
en vertelt in gewone taal wat er eventueel nog mist én wat je moet doen.
Alles groen? Dan werkt het spel. Ververs de pagina na elke aanpassing.
De beheerpagina vind je op `jaarverslag.jkz.nl/admin.html?key=JOUWSLEUTEL`.

**Bij een update van het spel:** upload gewoon alle nieuwe bestanden en
overschrijf alles — behalve `config.php`, die staat niet in de nieuwe
bestanden en blijft dus vanzelf staan. De database blijft ook gewoon staan.

**Technisch (voor de volledigheid):** api.php gebruikt PDO met prepared
statements, geeft JSON terug en heeft een limiet van 300 verzoeken per
minuut per IP-adres (ruim genoeg voor de hele club op één wifi).

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
