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
3. Pas bovenin het `CONFIG`-blok één ding aan:
   - `brand.agencyLogoUrl` → **directe URL** van het SEO Vrienden-logo
     (publiek bereikbare afbeelding; bv. een bestand op seovrienden.nl).
4. **Voorbeeld** → bekijk het logboek en de testmail.
5. **Opslaan** → bij **Frequentie** stel je zelf in hoe vaak het draait
   (bv. maandelijks, de 1e rond 08:00).

### Nog in te vullen

- [ ] `brand.agencyLogoUrl`: directe link naar het SEO Vrienden-logo.
      Een logo in een mail moet een gehoste afbeelding (URL) zijn; de afbeelding
      uit de chat kan niet rechtstreeks worden ingesloten. Het Sminia-logo zit er
      al in via een publieke URL.

## Opmerkingen

- Bedragen in de **accountvaluta** (symbool automatisch bepaald, valt terug op €).
- Getallen in **Nederlandse notatie** (1.234,56).
- Alle cijfers zijn **echte, door Google Ads gerapporteerde data** voor de periode;
  afgeleide metrics (CTR, CPC, etc.) worden per campagne uit de eigen totalen berekend.
