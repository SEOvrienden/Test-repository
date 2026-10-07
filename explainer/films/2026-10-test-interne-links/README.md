# Explainer: interne links (30 s)

**Vraag van de kijker:** "Mijn nieuwe pagina staat online. Staat hij nu ook in Google?"
**Idee:** Google vindt een nieuwe pagina vooral door een link te volgen vanaf een pagina die het al kent. Zonder die link komt Google er zo niet langs.
**Uitkomst:** de kijker kan uitleggen waarom wij elke nieuwe pagina vanaf een bestaande pagina linken.

Status: **concept** (testrun). Zie "Nog na te lopen".

## Opgeleverd

| Bestand | Wat |
|---------|-----|
| `out/master_16x9.mp4` | 1920×1080, 60 fps, 30,0 s, AAC |
| `out/cut_9x16.mp4` | 1080×1920, eigen compositie |
| `out/cut_1x1.mp4` | 1080×1080, eigen compositie (pagina smaller in de payoff) |
| `out/master_16x9_reduced_motion.mp4` | zelfde volgorde van ideeën, geen beweging, camera vast |
| `captions.srt` | 10 captions, zelfde bron als de ingebrande captions |
| `contact.png` | 15 beats uit de echte master-mp4 |
| `directions.html` | 4 richtingen, winnaar (sitekaart) en waarom, plus de reviewvragen |
| `BRIEF.md` · `STORYBOARD.md` · `DECISIONS.md` · `SOURCES.md` | brief, scènes, beslislog, bronnen |
| `review/` | 5 voor/na-paren, één per fix |
| `VERIFY.md` | uitkomst van `engine/verify.py` |

## Opnieuw renderen

```bash
cd explainer
./engine/build.sh 2026-10-test-interne-links          # ~5 min op 4 cores
python3 engine/verify.py 2026-10-test-interne-links
```

## Getest (uit VERIFY.md)

| Controle | Resultaat | Status |
|---|---|---|
| Leessnelheid captions (max 17 tekens/s) | max 14,4 t/s | ok |
| Captions overlappen niet / binnen de duur | laatste eindigt 29,90 s | ok |
| Ankers max 8 woorden/regel, max 2 regels | ok | ok |
| Cues binnen de duur | ok | ok |
| Teksten met getallen | geen getallen in de film | nalopen |
| Contrast tekstparen merk | krapste 6,25:1 · captions 14,18:1 | ok |
| Kleinste tekst op 390 px | 9:16 12,7 px · 1:1 11,3 px · 16:9 4,9 px (niet voor telefoon) | ok |
| Zelfde frame twee keer renderen | identiek | ok |
| Still per beat, 4 varianten | 15 × 4, bekeken | nalopen |
| Specs 4 mp4's | 30,000 s, 60 fps, yuv420p, audio | ok |
| Loudness na AAC, 4 mp4's | -16,2 LUFS, true peak -4,3 dBTP | ok |
| Gedempt: caption in beeld op elk captionmoment | ok | ok |
| contact.png uit de echte master | ok | ok |

Daarnaast met de hand: frames midden in de overgangen S1→S2, S3→S4 en S4→S5 (16:9), alle beats in 9:16 reduced motion, en een contrastberekening voor gedimde tekst (65% dekking: titels 5,1:1, paden 3,1:1).

## Review

De skill vraagt twee aparte review-agents. In deze sessie was geen tool beschikbaar om subagents te starten, dus de design review (vragen van Meaghan Choi) en de toegankelijkheidscheck zijn door dezelfde agent gedaan, als twee aparte passes met de prompts uit `references/review-prompts.md`. Dat is minder onafhankelijk dan bedoeld. Verwerkt: review/01 t/m 05.

## Niet getest

- Beluisteren door een mens; geluid is alleen gemeten.
- Afspelen op een echte telefoon.
- Reduced motion in 9:16 en 1:1 als video (alleen stills; alleen 16:9 is als video gerenderd).

## Nog na te lopen

1. **Merk:** kleuren en fonts zijn nog een aanname (`brand/BRAND.md`); seovrienden.nl was niet bereikbaar.
2. **Bronnen:** developers.google.com was geblokkeerd. F1 en F2 in `SOURCES.md` zelf openen en bevestigen.
3. **Juistheid:** de film zegt "vooral via links" en "zo niet langs" omdat een sitemap een tweede route is. Akkoord met deze vereenvoudiging?
4. **Voice-over:** nu alleen captions.
5. **Afzender en kanaal:** "SEO vrienden" als tekst aan het eind, geen logo of URL; kanaal is een aanname.
6. **Onafhankelijke review:** laat een collega (of twee echte review-agents) de contact sheets nog eens bekijken.
