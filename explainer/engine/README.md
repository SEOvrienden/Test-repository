# Engine

Gedeelde code voor alle explainerfilms. Een film levert alleen `timeline.js` en `scenes.js`; de rest komt hier vandaan.

## Bestanden

| Bestand | Doet |
|---------|------|
| `film.html` | Laadt merk, tijdlijn, fonts, engine en scènes. URL: `film.html?film=<slug>&f=wide\|tall\|square[&rm=1][&t=sec]` |
| `core.js` | Runtime `window.E`: formaat en schaal, tijd en easing, tekst, camera, captions, `window.seek(t)` |
| `components.js` | Onderdelen `window.K` (zie hieronder) |
| `audio.js` | Procedureel geluid uit `TIMELINE.bed` en `TIMELINE.cues`, offline gerenderd |
| `render.js` | Headless Chrome, t = n/60, PNG-frames naar ffmpeg (libx264, crf 16, yuv420p) |
| `master_audio.py` | Loudnorm naar -16 LUFS + oversampled limiter (true peak ≤ -1,5 dBTP na AAC) |
| `build.sh <slug>` | Volledige export: srt, audio, 4 video's |
| `verify.py <slug> [--quick]` | Alle controles, schrijft `films/<slug>/VERIFY.md` |
| `new-film.sh <slug>` | Nieuwe film vanuit `films/_template` |
| `contact.py`, `pair.py`, `srt.js` | Contact sheet, voor/na-paar, ondertitels |

## Commando's (vanuit `explainer/`)

```bash
./engine/new-film.sh 2026-11-onderwerp
node engine/render.js stills --film 2026-11-onderwerp --f wide --times beats --out films/2026-11-onderwerp/build/v1
python3 engine/contact.py films/2026-11-onderwerp/build/v1 wide films/2026-11-onderwerp/build/v1_wide.png 5 380
python3 engine/verify.py 2026-11-onderwerp --quick     # tijdens het bouwen, zonder video
./engine/build.sh 2026-11-onderwerp                   # export (~10 min voor 60 s op 4 cores)
python3 engine/verify.py 2026-11-onderwerp            # na de export
python3 engine/pair.py voor.png na.png films/<slug>/review/01_wat.png "wat er mis was"
```

## Runtime `E` (core.js)

| Naam | Betekenis |
|------|-----------|
| `W`, `H` | Virtueel canvas (echte px gedeeld door schaal `S`). Teken altijd in virtuele px |
| `FORMAT`, `RM` | `'wide' \| 'tall' \| 'square'`, reduced motion aan/uit |
| `pad`, `safe.y0`, `safe.y1` | Marge 72; inhoud tussen `safe.y0` en `safe.y1` (onder is ruimte voor captions) |
| `C`, `UI`, `DISPLAY`, `BRAND` | Merkkleuren, UI-font, display-font, heel merkobject |
| `P(naam, t)` | Positievoortgang 0..1 van een move. Reduced motion: harde sprong op het midden |
| `F(naam, t)` | Dekking 0..1. Reduced motion: korte lineaire fade |
| `raw(naam, t)`, `ease`, `clamp`, `lerp`, `lerpRect` | Basis |
| `text(str, x, y, {size, weight, fam, color, align, alpha})` | Tekst; maat wordt nooit kleiner dan de minimale maat van het formaat |
| `measure`, `wrap`, `wrapBalanced`, `rrect` | Tekstmaat, regels, afgeronde rechthoek |
| `mulberry32(seed)` | De enige toegestane willekeur |
| `ctx` | Canvas 2D-context voor eigen tekenwerk |

Schaal en minimale tekstmaat per formaat: standaard `{wide: 1.1, tall: 1.35, square: 1.2}` en `{wide: 22, tall: 26, square: 26}`; overschrijfbaar via `TIMELINE.format`.

## Onderdelen `K` (components.js)

Stijlen: `'paid'` = gestreepte rand in ink2, `'organic'` = doorgetrokken in accent. Kleur is nooit het enige verschil.

| Onderdeel | Gebruik |
|-----------|---------|
| `panel(rect, a)` | Paneel (browservlak) |
| `searchBar(rect, query, shown, caret, a)` | Zoekbalk met typen; cursor knippert nooit |
| `cardMetrics(content, w, compact)` / `resultCard(content, rect, {alpha, box, lw, textAlpha, style, compact})` | Zoekresultaat. `content = {sponsored, site, favicon, title, desc}` |
| `morphShell(rect, radius, style)` | Leeg kaartvlak tijdens kaart-naar-label-morph |
| `chipRect(label, x, y)` / `chipContent(label, 'square'\|'circle', rect, a)` / `separate(ra, rb)` | Label op een lijn, zonder overlap |
| `anchor(lines, x, y, align, a, size, color)` | Ankerzin in display-font |
| `segmentBar(rect, label, n, i => ({vis, dy}), a)` | Gesegmenteerde balk (budget, voorraad) |
| `toggle(rect, label, aanTekst, uitTekst, a, offP)` | Schakelaar; de stand staat ook in woorden |
| `laneTitle(lane, titel, sub, a, kleur)` | Kolomtitel |
| `tag(slot, label, a, style)` | Label rechtsboven op een kaart |
| `axes(plot, yLabel, [[x, label, align]], a)` | Grafiekassen met ticks |
| `click(x, yStart, yEnd, t, t0, t1, teken)` | Klik: stip valt, ring, teken (bijv. €) |

Nieuw onderdeel nodig dat ook in een volgende film past? Zet het hier, niet in de film.

## Geluid

`TIMELINE.bed`: `chords` (MIDI-noten per 2 maten), `arpFrom`, `arpUntil`, `dropFrom`, `dropUntil`, `arpBackFrom`.
Cue-types: `typing {t1, n}`, `pop`, `click`, `refill`, `thud`, `tick`, `swell`, `switch`, `drop`, `motif {gain}`. Het motief hoort bij het kernidee en komt 2 à 3 keer terug.
