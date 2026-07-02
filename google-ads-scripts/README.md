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

## Verzendmodus (concept / test / live)

In `CONFIG` staat bovenaan `mode`:

- `mode: 'draft'` (standaard, aanrader) → maakt maandelijks een **concept in Gmail**,
  al geadresseerd aan de klant (+ `cc`/`bcc`). Jij opent het concept, controleert,
  past evt. tekst aan en klikt zelf op **Verzenden**. Zo houd je de eindcontrole en
  kun je nog aanpassen. De klant ontvangt niets totdat jij verzendt.
- `mode: 'test'` → stuurt direct, maar **uitsluitend** naar `testRecipient`
  (`support@seovrienden.nl`), met `[TEST]` in de onderwerpregel. Handig om de opmaak
  te checken.
- `mode: 'live'` → stuurt volledig automatisch naar `recipient` + `cc` + `bcc`.

> Let op: Google Ads verstuurt/aanmaakt e-mail óók tijdens een "Voorbeeld"-run.
> In `'draft'`-modus wordt er dus een concept aangemaakt (geen verzending naar de klant),
> in `'test'` gaat er een testmail naar jezelf. Bij de eerste run vraagt Google Ads
> eenmalig **autorisatie** voor Gmail/e-mail.

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
