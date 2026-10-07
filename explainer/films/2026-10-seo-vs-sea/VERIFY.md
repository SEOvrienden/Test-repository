# Verificatie: 2026-10-seo-vs-sea

Gedraaid met `python3 engine/verify.py 2026-10-seo-vs-sea`. Alleen wat hier staat is getest.

| Controle | Resultaat | Status |
|---|---|---|
| Leessnelheid captions (max 17 tekens/s) | max 15.7 t/s (De tweede is organisch. Die positie koop…) | ok |
| Captions overlappen niet | ok | ok |
| Ankers max 8 woorden/regel, max 2 regels | ok | ok |
| Captions binnen de duur | laatste eindigt 59.90 s / duur 60.00 s | ok |
| Cues binnen de duur | ok | ok |
| Teksten met getallen: elk een bron in SOURCES.md (handmatig nalopen) | Organisch start langzaam. Google zelf noemt vier maanden tot een jaar. | ok |
| Contrast tekstparen merk (min 4,5:1) | krapste accent op accentSoft 6.25:1 · captions 14.18:1 | ok |
| Kleinste tekst op 390 px breed (9:16 en 1:1 min 11 px) | 9:16 12.7 px · 1:1 11.3 px · 16:9 4.9 px (niet voor telefoon) | ok |
| Zelfde frame twee keer renderen (3 tijden, aparte sessies) | identiek | ok |
| Still per beat (16:9, 9:16, 1:1, reduced motion 9:16) | 15 beats × 4 → films/2026-10-seo-vs-sea/build/contact_*.png (bekijken!) | nalopen |
| master_16x9: specs | 1920×1080, 60/1 fps, yuv420p, 60.000 s, audio ja | ok |
| master_16x9: loudness na AAC (-16 ±1 LUFS, TP ≤ -1,5) | -16.2 LUFS, true peak -3.3 dBTP | ok |
| cut_9x16: specs | 1080×1920, 60/1 fps, yuv420p, 60.000 s, audio ja | ok |
| cut_9x16: loudness na AAC (-16 ±1 LUFS, TP ≤ -1,5) | -16.2 LUFS, true peak -3.3 dBTP | ok |
| cut_1x1: specs | 1080×1080, 60/1 fps, yuv420p, 60.000 s, audio ja | ok |
| cut_1x1: loudness na AAC (-16 ±1 LUFS, TP ≤ -1,5) | -16.2 LUFS, true peak -3.3 dBTP | ok |
| master_16x9_reduced_motion: specs | 1920×1080, 60/1 fps, yuv420p, 60.000 s, audio ja | ok |
| master_16x9_reduced_motion: loudness na AAC (-16 ±1 LUFS, TP ≤ -1,5) | -16.2 LUFS, true peak -3.3 dBTP | ok |
| Gedempt: caption in beeld op elk captionmoment | ok | ok |
| contact.png uit de echte master-mp4 | films/2026-10-seo-vs-sea/contact.png | ok |

Niet automatisch te testen: of het verhaal klopt, beluisteren door een mens, afspelen op een echte telefoon. Zie de design review.
