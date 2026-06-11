# Google Ads maandrapportage – Fysiotherapie Sminia

Een Google Ads **Script** dat maandelijks automatisch een korte, overzichtelijke
HTML-mail in de huisstijl van SEO Vrienden stuurt met de accountprestaties,
**per campagne** en met **echte data**.

## Waarom een Google Ads Script (en geen andere vorm)?

Voor "kort, duidelijk en geautomatiseerd naar de klant" is een Google Ads Script
de beste vorm:

- **Draait in het account zelf** – geen externe server of API-koppeling nodig.
- **Ingebouwde planner** – frequentie stel je zelf in bij het inplannen.
- **Verstuurt zelf e-mail** (`MailApp`) – naar klant + CC naar SEO Vrienden.
- **Branded HTML** – logo's, kleuren en mobielvriendelijke opmaak in de mail zelf.

## Wat zit erin

**Resultaten per campagne** (huidige maand, echte data per campagne):

| Kolom | Toelichting |
|---|---|
| Campagne | Campagnenaam |
| Kosten | Advertentiekosten |
| Vert. | Vertoningen |
| Klikken | Klikken |
| CTR | Klikfrequentie |
| Gem. CPC | Gemiddelde kosten per klik |
| Alle conv. | Alle conversies |
| Conv. | Conversies |
| Kosten/conv. | Kosten per conversie |
| Conv.% | Conversiepercentage |
| Zoekvert.% | Zoekvertoningspercentage – **werkelijke waarde per zoekcampagne** |

Onderaan een **Totaal**-regel met de vergelijking t.o.v. de vorige maand
(▲/▼ in groen/rood). Het zoekvertoningspercentage staat bewust alléén per
campagne (geen account-totaal), omdat dat de enige echte, niet-benaderde waarde is.

**Top 20 zoekwoorden** (op klikken, alleen actieve zoekwoorden), in de
kolomvolgorde van het Google Ads-rapport: zoekwoord + matchtype, vertoningen,
klikken, CTR, gem. CPC, conversies, alle conversies.

> Let op: dit zijn **zoekwoorden** (keyword_view), geen zoektermen.

**Extra onderdelen** (aan/uit via `CONFIG.show`):

- **Samenvatting in gewone taal** bovenaan (conversies, kosten/conversie, trend t.o.v. vorige maand).
- **Conversies per actie** (bv. telefoongesprekken, formulieren, routebeschrijving).
- **Trend laatste 6 maanden** als mini-staafgrafiek (kosten + conversies).

## Test vs. live

In `CONFIG` staat bovenaan een `testMode`:

- `testMode: true` (standaard) → de mail gaat **uitsluitend** naar `testRecipient`
  (`support@seovrienden.nl`), met `[TEST]` in de onderwerpregel. Ook bij **Voorbeeld**.
  De klant ontvangt dus niets.
- `testMode: false` → live: de mail gaat naar `recipient` + `cc` + `bcc`.

> Let op: Google Ads verstuurt e-mail óók tijdens een "Voorbeeld"-run (er is geen
> droogloop voor e-mail). De `testMode`-vlag is dus je beveiliging: laat 'm op
> `true` staan tot je echt live wilt.

## Gemaakte keuzes (afgestemd)

- **Periode:** afgelopen kalendermaand, vergelijking met de maand ervoor op de totaalregel.
- **Niveau:** per campagne, echte data (geen account-rollup/benadering).
- **Ontvangers:** `terry.bosma@fysiosminia.nl` + CC `support@seovrienden.nl`.
- **Zoekwoorden:** top 20 op klikken.
- **Vorm:** branded HTML-mail (SEO Vrienden-huisstijl, co-branded met Sminia-logo).
- **Huisstijl:** oranje `#E94F1C`, donkergroen `#004744`, crème `#F8EED3`.

## Installeren

1. Google Ads → **Extra & instellingen → Bulkacties → Scripts** → **+**.
2. Plak de inhoud van `fysiosminia-maandrapportage.js`.
3. **Voorbeeld** → bekijk het logboek en de testmail.
4. **Opslaan** → bij **Frequentie** stel je zelf in hoe vaak het draait
   (bv. maandelijks, de 1e rond 08:00).

Niets meer in te vullen: ontvangers, huisstijl en logo's staan al goed.
Het SEO Vrienden-logo wordt als tekst-wordmark ("seovrienden", font Coconat met
fallback, crème op donkergroen) getoond, dus er is geen gehoste afbeelding nodig.
Het Sminia-logo zit erin via een publieke URL.

## Opmerkingen

- Bedragen in de **accountvaluta** (symbool automatisch bepaald, valt terug op €).
- Getallen in **Nederlandse notatie** (1.234,56).
- Alle cijfers zijn **echte, door Google Ads gerapporteerde data** voor de periode;
  afgeleide metrics (CTR, CPC, etc.) worden per campagne uit de eigen totalen berekend.
