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
| Conv. | Google Ads-conversies |
| Kosten/conv. | Kosten per conversie |
| Conv.% | Conversiepercentage |
| Zoekvert.% | Zoekvertoningspercentage – **werkelijke waarde per zoekcampagne** |

Onderaan een **Totaal**-regel met de vergelijking t.o.v. **dezelfde maand vorig jaar**
(▲/▼ in groen/rood). Deze jaar-op-jaar-vergelijking corrigeert voor seizoensinvloeden.
Het zoekvertoningspercentage staat bewust alléén per campagne (geen account-totaal),
omdat dat de enige echte, niet-benaderde waarde is.

Er worden **alleen Google Ads-conversies** (`metrics.conversions`) getoond, geen GA4-
totaal. Wil je specifieke acties (bv. GA4-acties) uitsluiten, zet hun exacte naam in
`CONFIG.excludeConversionActions`.

**Top 20 zoekwoorden** (op klikken, alleen actieve zoekwoorden), kolommen: zoekwoord +
matchtype, vertoningen, klikken, CTR, gem. CPC, conversies.

> Let op: dit zijn **zoekwoorden** (keyword_view), geen zoektermen.

**Extra onderdelen** (aan/uit via `CONFIG.show`):

- **Samenvatting in gewone taal** bovenaan (conversies, kosten/conversie, jaar-op-jaar).
- **Analyse & toelichting**: verklaart verschuivingen uit de KPI-verbanden, bv. een daling
  in conversies herleid naar minder klikken of een lager conversiepercentage, en minder
  vertoningen herleid naar verloren vertoningen door budget/rangschikking. Drempel instelbaar
  via `CONFIG.insightThreshold`. Het verklaart het *mechanisme*, niet de externe oorzaak.
- **Conversies per actie** (bv. telefoongesprekken, formulieren, routebeschrijving).
- **Trend laatste 6 maanden** als visuele verticale staafgrafiek (conversies + kosten).

## Verzendmodus (test / live / draft)

Een Google Ads-script draait onder het **Google-account** waarmee je bij Google Ads
inlogt (niet vanuit je Microsoft 365 / Outlook-mailbox). Daarop is `mode` afgestemd.

In `CONFIG` staat bovenaan `mode`:

- `mode: 'test'` (standaard, aanrader bij Microsoft 365 / geen Gmail) → stuurt de
  complete rapportage naar `testRecipient` (`support@seovrienden.nl`), met `[TEST]`
  in de onderwerpregel. Je controleert 'm in je eigen inbox; de klant ontvangt niets.
  Naar de klant sturen: zet `mode: 'live'`, of stuur 'm handmatig door vanuit Outlook.
- `mode: 'live'` → stuurt volledig automatisch naar `recipient` + `cc` + `bcc`.
- `mode: 'draft'` → maakt een **concept in Gmail**, al geadresseerd aan de klant.
  Alleen bruikbaar als je met een **Gmail/Google Workspace-account** bij Google Ads
  inlogt (het concept verschijnt dan in die Gmail-inbox).

`replyTo` staat op `support@seovrienden.nl`, zodat antwoorden van de klant altijd
bij jullie binnenkomen — ongeacht welk afzenderadres Google gebruikt.

> Let op: Google Ads verstuurt/maakt e-mail óók tijdens een "Voorbeeld"-run. Bij de
> eerste run vraagt Google Ads eenmalig **autorisatie** voor e-mail.

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
