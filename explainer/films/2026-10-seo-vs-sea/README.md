# Explainer: SEO vs SEA (60 s)

**Vraag van de kijker:** "Als ik met Google Ads al bovenaan sta, waarom dan nog SEO?"
**Idee:** een advertentie huur je per klik en verdwijnt als het budget stopt; een organische positie bouw je op en blijft staan.
**Uitkomst:** de kijker kan uitleggen waarom je Google Ads gebruikt voor nu en SEO voor straks.

Status: **concept**. Zie "Nog na te lopen" onderaan.

## Opgeleverd

| Bestand | Wat |
|---------|-----|
| `out/master_16x9.mp4` | 1920×1080, 60 fps, 60,0 s, H.264 crf 16 yuv420p, AAC 192k |
| `out/cut_9x16.mp4` | 1080×1920, eigen compositie (geen crop) |
| `out/cut_1x1.mp4` | 1080×1080, eigen compositie, compacte kaarten |
| `out/master_16x9_reduced_motion.mp4` | zelfde volgorde van ideeën, geen beweging, camera vast |
| `captions.srt` | 14 captions, zelfde bron als de ingebrande captions |
| `contact.png` | 15 beats uit de echte master-mp4 (ook `contact_9x16.png`, `contact_1x1.png`) |
| `directions.html` | 4 richtingen, winnaar en waarom, plus de reviewvragen |
| `STORYBOARD.md` | scènespecificatie per scène |
| `DECISIONS.md` · `SOURCES.md` | beslislog · bron per bewering |
| `review/` | 18 voor/na-paren, één per fix |
| `VERIFY.md` | uitkomst van `engine/verify.py` |

## Opnieuw renderen

```bash
cd explainer
./engine/build.sh 2026-10-seo-vs-sea          # alles: srt, audio, 4 video's (~10 min op 4 cores)
python3 engine/verify.py 2026-10-seo-vs-sea   # controles, schrijft VERIFY.md
```

Vereist: Node 22, Playwright met Chromium, ffmpeg, Python 3 met Pillow.

Opbouw: `timeline.js` is het enige TIMELINE-object (beats, bewegingen, camera, cues, captions). `scenes.js` tekent elk frame als pure functie van t; de gedeelde engine staat in `../../engine/` en het merk in `../../brand/brand.js`.

Na de verhuizing naar de gedeelde engine is de film opnieuw gerenderd en vergeleken met de originele versie: 75 beat-frames (alle formaten, ook reduced motion) en 48 frames midden in overgangen zijn pixel-identiek; de audio wijkt maximaal -136 dBFS af.

## Getest (en hoe)

| Test | Resultaat |
|------|-----------|
| Zelfde frame twee keer renderen, aparte browsersessies, pixeldiff (t = 15,03 / 27,2 / 44,4 s) | Identiek (sha1 gelijk) |
| Audio twee keer renderen | **Niet bit-identiek**: max verschil 1,7e-7 (-135 dBFS), afrondingsruis in Chromium Web Audio. Onhoorbaar |
| Loudness op de geëxporteerde mp4's (ffmpeg ebur128, na AAC) | Alle 4: -16,2 LUFS geïntegreerd, true peak -3,3 dBTP, LRA 2,8 LU |
| Specs mp4 (ffprobe) | Alle 4: 60,000 s, 3600 frames, 60 fps, yuv420p |
| Still per beat in alle formaten, plus reduced motion voor alle 3 formaten | 15 beats × 3 formaten + 3 × reduced motion bekeken |
| Leesbaarheid op 390 px breed | 9:16: kleinste tekst 12,7 px, captions 16,6 px. 1:1: kleinste 11,3 px, captions 14,7 px. **16:9 niet geschikt voor 390 px** (kleinste 4,9 px); gebruik daar 9:16 |
| Gedempt kijken: staat op elk captionmoment een caption in beeld (frame uit de mp4, donker vak onderin) | 14 captions × 3 formaten, 0 afwijkingen |
| Leessnelheid captions | 8,9 tot 15,7 tekens/s (alle onder 17) |
| Alleen audio: vallen de cues op het moment van de actie (onsetdetectie) | 15 van 18 cues binnen 15 ms; 3 doffe blok-tikken gecontroleerd in het laag (+9 tot +13 dB); de swell is bewust geleidelijk |
| Contrast (WCAG-formule, ook gemengde kleuren) | Alle tekst ≥ 4,5:1; krapste accent op accentSoft (na verdonkeren accent naar #185E44 ruim erboven) |
| Flitsen | Max 1,6 gebeurtenissen per seconde (klikken), kleine oppervlakte; geen knipperende cursor |
| Videoframe tegen bronrender (PSNR) | 35,6 tot 42,8 dB |
| Design review (subagent, vragen Meaghan Choi) en accessibility-pass (subagent) | 8 + 6 bevindingen, alle verwerkt; voor/na in `review/` |

## Niet getest

- Echt luisteren door een mens: het geluid is alleen gemeten, niet beluisterd.
- Afspelen op een echte telefoon of in een social-feed (alleen geschaalde stills op 390 px).
- Reduced-motion versie in 9:16 en 1:1 als video: alleen als stills gecontroleerd, alleen 16:9 is als video gerenderd.

## Nog na te lopen

1. **Merk:** kleuren en fonts zijn een aanname (geen ./brand, site niet bereikbaar). Even naast de huisstijl leggen.
2. **Bronnen:** de Google-pagina's (F1 tot F4 in SOURCES.md) zelf openen en de citaten bevestigen.
3. **Voice-over:** nu alleen captions. Wil je een stem (bijvoorbeeld Jesse of Mike) op `captions.srt`, dan moet het bed onder de stem worden geduckt.
4. **Afzender:** "SEO vrienden" staat als tekst in de laatste seconden, zonder logo of URL. Logo of call-to-action toevoegen?
