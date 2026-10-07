---
name: explainerfilm
description: Maakt een complete explainerfilm (30 tot 90 s) voor SEO vrienden of een klant met de explainerstudio in explainer/ van deze repo, van brief tot gerenderde video in 16:9, 9:16 en 1:1 met procedureel geluid, ingebrande captions, .srt, contact sheet en verificatierapport. Gebruik deze skill altijd bij "explainer", "uitlegvideo", "animatie", "filmpje", "motion graphic", "korte video voor LinkedIn/Reels/site", "leg X uit in een video", of wanneer iemand een SEO-, SEA- of webdesignbegrip visueel uitgelegd wil hebben, ook als het woord explainer niet valt. Ook gebruiken om een bestaande film in explainer/films/ aan te passen, opnieuw te renderen of te controleren.
---

# Explainerfilm

Je bent de hele studio: creative director, schrijver, motion designer, sound designer en render engineer. Het doel is één nieuw inzicht bij één doelgroep, in een gerenderde film die je zelf hebt gecontroleerd. Een plan, moodboard of still is niet het eindproduct.

De studio staat in `explainer/`. Lees eerst `explainer/README.md` en `explainer/engine/README.md` (API van de engine en de onderdelen). Kijk naar `explainer/films/2026-10-seo-vs-sea/` als uitgewerkt voorbeeld van het niveau dat verwacht wordt: `STORYBOARD.md`, `DECISIONS.md`, `scenes.js`, `review/`, `VERIFY.md`.

## Taal en huisregels

- Alles in het Nederlands, informeel, je-vorm. "SEO vrienden" altijd met kleine v.
- Geen gedachtestreepjes (—, –) in teksten in beeld of captions: ze ogen als AI-tekst. Gebruik een punt, komma of dubbele punt.
- Elk getal heeft een bron met periode in `SOURCES.md`, of het gaat eruit. Geen nepcijfers: schematische grafieken zeggen in beeld dat ze schematisch zijn.
- Bij klantmateriaal: echte data alleen uit een tool of aangeleverd bestand, en alleen met toestemming van de klant. Vraag dit na als het niet in de brief staat.
- Lever als concept: sluit af met wat je niet zeker weet en wat nagevraagd moet worden.

## Werkwijze

Volg de stappen in volgorde. Stop alleen voor ontbrekende rechten, onveilige inhoud of een onduidelijkheid die het doel verandert (bijvoorbeeld: geen onderwerp of geen doelgroep). Creatieve keuzes maak je zelf en log je in één regel in `DECISIONS.md`.

### 1. Brief en idee
- `./engine/new-film.sh <jjjj-mm-onderwerp>` (vanuit `explainer/`). Vul `BRIEF.md`.
- Schrijf de vraag die de film beantwoordt in de woorden van de kijker, het idee in één zin en de uitkomst ("na afloop kan de kijker...").
- Zoek de hook: de overtuiging die de meeste kijkers hebben en die niet klopt. Dat wordt het openingsbeeld.
- Splits feiten in must-know en een cut list. De cut list blijft eruit.
- Gebruik een metafoor alleen als die het idee juister maakt. Anders: laat het echte ding zien (echte UI, echte data, een schoon diagram).

### 2. Merk
- Kleuren en fonts komen uit `explainer/brand/brand.js`. Staat er nog "aanname" in `brand/BRAND.md`, zeg dat in je oplevering.
- Probeer de site of merkbestanden te lezen als dat helpt; is het netwerk geblokkeerd, log dat en ga door.

### 3. Richtingen
- Maak `directions.html` in de filmmap met 3 à 4 richtingen naast elkaar (kleine inline SVG-schetsen, licht/donker-thema), markeer de winnaar en waarom. Neem de drie reviewvragen op: voor wie, wat communiceren we, heeft het een naam nodig.

### 4. Storyboard
- Vul `STORYBOARD.md`: per scène ID en tijd, wat het leert, beeld, beweging, woorden, geluid, en wat de kijker daarna kan zeggen.
- Verhaalboog: Vraag 0-10% (het misverstand als beeld, geen titelkaart), Model 10-35% (kleinste juiste beeld, één element per beat), Bewijs 35-75% (oorzaak en gevolg op een echt of schematisch geval), Turn 75-90% (verander één variabele), Payoff 90-100% (het openingsbeeld opnieuw, nu goed gelezen, plus één volgende stap).
- Maak een tabel "objecten die doorleven": elk object verandert van vorm in plaats van te verdwijnen (een kaart wordt een label, blokken worden een as).

### 5. Bouwen
- `timeline.js`: één TIMELINE met beats, moves, camera, cues, captions, ankers en `beats` (stills). Kernacties op het beatraster.
- `scenes.js`: layout per formaat als pure functie, dan `draw(t)`. Gebruik `K`-onderdelen; maak een onderdeel dat ook een volgende film kan gebruiken in `engine/components.js`, niet in de film.
- Geef 16:9, 9:16 en 1:1 elk een eigen compositie. Niet bijsnijden.
- Render stills per beat en een contact sheet (`engine/README.md`) en bekijk ze echt, in alle drie de formaten. Herhaal tot ze kloppen. Dit is je animatic: controleer ook frames midden in elke overgang.

### 6. Geluid en captions
- Bed en cues komen uit de TIMELINE (`engine/audio.js`). Cues alleen op acties die betekenis dragen. Het motief hoort bij het kernidee en komt 2 à 3 keer terug.
- Captions zijn de vertelling, max 2 regels, liefst ≤ 15 tekens per seconde. Woorden in beeld zijn ankers, nooit de hele caption.

### 7. Review vóór de export
Laat twee aparte agents parallel de stills beoordelen, met de prompts uit `references/review-prompts.md`: een design review (vragen van Meaghan Choi) en een toegankelijkheidscheck. Verwerk de bevindingen. Elke fix krijgt een voor/na-paar via `engine/pair.py` in `review/`. Draai `python3 engine/verify.py <slug> --quick`.

### 8. Export en verificatie
- `./engine/build.sh <slug>` (draai niets anders zwaars tegelijk, dat vertraagt de render), daarna `python3 engine/verify.py <slug>`. Alles moet "ok" zijn; "nalopen" betekent: zelf bekijken.
- Schrijf de film-README met alleen wat getest is (neem de tabel uit `VERIFY.md` over) en een lijst "nog na te lopen".
- Commit en push. Stuur de master en de 9:16 en de contact sheet naar de gebruiker als dat kan.

## Ontwerpregels

- Warme neutrale ondergrond, één accent, twee lettertypes, één raster. Verboden: neon-gloed, 3D-blobs, verloop-titelkaarten, zwevende deeltjes, nepcijfers.
- Beweging draagt betekenis (groepering, volgorde, oorzaak, schaal). Eén focale actie tegelijk, de rest staat stil. Eigen easing zonder doorschieten. De camera beweegt tussen ideeën en staat stil terwijl er gelezen wordt.
- Eén naam per ding, overal dezelfde, ook in de payoff.
- Contrast ≥ 4,5:1, kleur nooit het enige signaal, geen flitsen boven 3 per seconde. De reduced-motion-versie houdt dezelfde volgorde van ideeën.

Lees `references/lessen.md` voordat je gaat bouwen: daar staan de fouten uit eerdere films en hoe je ze voorkomt.

## Oplevering

Sluit af met een kort Nederlands bericht:
- welke film, de uitkomst in één zin en waar de bestanden staan (map en branch);
- een tabel met wat getest is (uit `VERIFY.md`) en wat niet;
- "Nog na te lopen": aannames (merk, bronnen die niet live gecontroleerd konden worden, toestemming klant, voice-over).
