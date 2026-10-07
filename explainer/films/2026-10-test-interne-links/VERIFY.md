# Verificatie: 2026-10-test-interne-links

Gedraaid met `python3 engine/verify.py 2026-10-test-interne-links --quick`. Alleen wat hier staat is getest.

| Controle | Resultaat | Status |
|---|---|---|
| Leessnelheid captions (max 17 tekens/s) | max 14.4 t/s (Google volgt hem en vindt de pagina.…) | ok |
| Captions overlappen niet | ok | ok |
| Ankers max 8 woorden/regel, max 2 regels | ok | ok |
| Captions binnen de duur | laatste eindigt 29.90 s / duur 30.00 s | ok |
| Cues binnen de duur | ok | ok |
| Teksten met getallen: elk een bron in SOURCES.md (handmatig nalopen) | geen | nalopen |
| Contrast tekstparen merk (min 4,5:1) | krapste accent op accentSoft 6.25:1 · captions 14.18:1 | ok |
| Kleinste tekst op 390 px breed (9:16 en 1:1 min 11 px) | 9:16 12.7 px · 1:1 11.3 px · 16:9 4.9 px (niet voor telefoon) | ok |
| Zelfde frame twee keer renderen (3 tijden, aparte sessies) | identiek | ok |
| Still per beat (16:9, 9:16, 1:1, reduced motion 9:16) | 15 beats × 4 → films/2026-10-test-interne-links/build/contact_*.png (bekijken!) | nalopen |

Niet automatisch te testen: of het verhaal klopt, beluisteren door een mens, afspelen op een echte telefoon. Zie de design review.
