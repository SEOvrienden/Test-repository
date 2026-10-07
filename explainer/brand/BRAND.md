# Merk

**Status: aanname.** Er waren geen officiële merkbestanden en seovrienden.nl was niet bereikbaar vanuit de werkomgeving. Kleuren en fonts zijn gekozen op leesbaarheid en contrast, niet op de huisstijl.

## Vervangen door de echte huisstijl

1. Zet de fontbestanden in `fonts/` (OTF, TTF of WOFF2; let op de licentie: het font moet ingebed mogen worden).
2. Pas `brand.js` aan: `color`, `type` en `fonts`.
3. Controleer de contrasten opnieuw: elke tekstkleur minimaal 4,5:1 op de achtergrond waar hij op staat (`python3 engine/verify.py` doet dat voor de vaste paren).
4. Render één bestaande film opnieuw en vergelijk de contact sheet.

## Regels die blijven

- Warme neutrale achtergrond, één accent, twee lettertypes.
- Kleur is nooit het enige signaal: vorm, lijnstijl of tekst zegt hetzelfde.
- "SEO vrienden" altijd met kleine v.

## Huidige fonts

| Font | Licentie |
|------|----------|
| Inter | SIL Open Font License 1.1 |
| Caladea | Apache License 2.0 |
