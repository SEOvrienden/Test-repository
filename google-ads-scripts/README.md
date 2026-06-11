# Google Ads maandrapportage – Fysio Sminia

Een Google Ads **Script** dat maandelijks automatisch een korte, overzichtelijke
HTML-mail in de huisstijl van SEO Vrienden stuurt met de accountprestaties.

## Waarom een Google Ads Script (en geen andere vorm)?

Voor "kort, duidelijk en geautomatiseerd naar de klant" is een Google Ads Script
de beste vorm:

- **Draait in het account zelf** – geen externe server, API-koppeling of tussenstap nodig.
- **Ingebouwde planner** – stel één keer in op "maandelijks" en het loopt vanzelf.
- **Verstuurt zelf e-mail** (`MailApp`) – direct naar klant + CC naar jullie.
- **Branded HTML** – logo, kleuren en mobielvriendelijke opmaak in de mail zelf.

Alternatieven zoals een Google Sheet of PDF zijn prima als *archief*, maar minder
geschikt als de klant gewoon een nette mail wil openen. Die kunnen later eenvoudig
worden toegevoegd.

## Wat zit erin

**Accountoverzicht** (afgelopen kalendermaand vs. de maand ervoor, met % verschil
in groen/rood):

| Statistiek | Toelichting |
|---|---|
| Kosten | Totale advertentiekosten |
| Vertoningen | Aantal keer dat advertenties zijn getoond |
| Klikken | Aantal klikken |
| CTR | Klikfrequentie (klikken ÷ vertoningen) |
| Gem. CPC | Gemiddelde kosten per klik |
| Alle conversies | Alle conversies (incl. niet-primaire) |
| Conversies | Primaire conversies |
| Kosten/conv. | Kosten per conversie |
| Conversiepercentage | Conversies ÷ klikken |
| Zoekvertoningspercentage | Search Impr. Share (impressie-gewogen over zoekcampagnes) |

**Top 20 zoekwoorden** (gesorteerd op klikken, alleen actieve zoekwoorden):
zoekwoord + matchtype, vertoningen, klikken, CTR, gem. CPC, alle conversies, conversies.

> Let op: dit zijn **zoekwoorden** (keyword_view), geen zoektermen.

## Gemaakte keuzes (afgestemd)

- **Periode:** afgelopen kalendermaand mét vergelijking met de maand ervoor.
- **Ontvangers:** klant én CC naar `support@seovrienden.nl`.
- **Zoekwoorden:** top 20 op klikken.
- **Vorm:** branded HTML-mail.

## Installeren

1. Google Ads → **Extra & instellingen → Bulkacties → Scripts** → **+**.
2. Plak de inhoud van `fysiosminia-maandrapportage.js`.
3. Pas bovenin het `CONFIG`-blok aan:
   - `recipient` → **mailadres van de klant invullen** (verplicht).
   - `brand.logoUrl` → **directe URL** van jullie logo (publiek bereikbare afbeelding).
   - eventueel `brand.primary` / `brand.primaryDark` → exacte huisstijl-hexcodes.
4. **Voorbeeld** → bekijk het logboek en de testmail.
5. **Opslaan** → **Frequentie** → *Maandelijks* (bv. de 1e rond 08:00).

### Nog in te vullen / te controleren

- [ ] `recipient`: mailadres van Fysio Sminia.
- [ ] `brand.logoUrl`: directe link naar het SEO Vrienden-logo (de site blokkeert
      automatisch uitlezen, dus de exacte URL + hexkleuren konden niet automatisch
      worden opgehaald). De huidige waarden zijn nette standaarden — vervang ze door
      jullie officiële huisstijlwaarden.

## Opmerkingen

- Bedragen staan in de **accountvaluta** (symbool wordt automatisch bepaald, valt
  terug op €).
- Getallen in **Nederlandse notatie** (1.234,56).
- Zoekvertoningspercentage is op accountniveau niet rechtstreeks beschikbaar; het
  wordt **impressie-gewogen** berekend over de zoekcampagnes (gangbare benadering).
- Eerste verzending na de planning bevat de eerstvolgende afgeronde maand.
