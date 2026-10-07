# Explainerstudio SEO vrienden

Korte explainerfilms (30 tot 90 s) met één nieuw inzicht per film, in 16:9, 9:16 en 1:1, met geluid en captions. Alles wordt als code gerenderd, dus elke film is reproduceerbaar en aanpasbaar.

## Zo maak je een film

Vraag in Claude Code (in deze repo): **"maak een explainer over [onderwerp] voor [doelgroep]"**. De skill `explainerfilm` (`.claude/skills/explainerfilm/`) neemt het proces over: brief, richtingen, storyboard, bouw, geluid, review, verificatie, export.

Handmatig kan ook:

```bash
cd explainer
./engine/new-film.sh 2026-11-onderwerp      # kopie van films/_template
# vul BRIEF.md, STORYBOARD.md, timeline.js, scenes.js
./engine/build.sh 2026-11-onderwerp          # export naar films/<slug>/out/
python3 engine/verify.py 2026-11-onderwerp   # controles, schrijft VERIFY.md
```

## Mappen

| Map | Wat |
|-----|-----|
| `engine/` | Gedeelde code: runtime, onderdelen, geluid, render, verificatie. Zie `engine/README.md` |
| `brand/` | Kleuren en fonts, de enige plek. **Nu nog een aanname**, zie `brand/BRAND.md` |
| `films/_template/` | Startpunt voor een nieuwe film (werkende mini-film van 12 s) |
| `films/2026-10-seo-vs-sea/` | Eerste film: SEO vs SEA, 60 s |

## Per film

`films/<slug>/` bevat `BRIEF.md`, `STORYBOARD.md`, `DECISIONS.md`, `SOURCES.md`, `directions.html`, `timeline.js`, `scenes.js`, `out/*.mp4`, `captions.srt`, `contact.png`, `review/` (voor/na-paren) en `VERIFY.md`. `build/` is tijdelijk en staat niet in git.

## Vereisten

Node 22, Playwright met Chromium, ffmpeg, Python 3 met Pillow en numpy. Een export van 60 s duurt ongeveer 10 minuten op 4 cores.
