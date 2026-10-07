# Lessen uit eerdere films

Elke regel hier kostte bij een eerdere film een fix. Lees ze voor je bouwt; voeg na elke film nieuwe lessen toe.

## Layout en leesbaarheid

| Les | Waarom / wat te doen |
|-----|----------------------|
| Bouw elk formaat apart (16:9, 9:16, 1:1) | Bijsnijden of alleen schalen gaf in 9:16 een halflege opening en in 1:1 captions over de inhoud. Centreer de compositie per formaat verticaal |
| Houd de onderste ~230 virtuele px vrij voor captions | `E.safe.y1`. Captions van 2 regels raakten anders kaarten |
| Test op 390 px breed | 9:16 en 1:1 moeten op een telefoon leesbaar zijn (≥ 11 px). De engine dwingt een minimale tekstmaat af; 16:9 is niet voor telefoons |
| 1:1 is krap | Laat secundaire tekst weg (`compact`), anders past de inhoud niet tussen titel en captions |
| Camerazoom duwt randtekst uit beeld | Reken bij zoom om een punt na of een anker aan de rand nog past |
| Aslabels botsen in smalle grafieken | Laat "start" weg in 9:16 en 1:1; houd labels ≥ 1 labelbreedte uit elkaar |
| Labels op lijnen lopen in elkaar en over de as | `K.separate`, daarna begrenzen boven de as, daarna nogmaals `separate` |
| Rechte verbindingslijnen in een raster lopen over buurobjecten | Controleer elke lijn tegen vinkjes en hoeken van andere kaarten; gebruik `bend` in `K.linkArrow` of kies begin- en eindpunt zelf |
| Een gestippelde rand in een lichte kleur is onzichtbaar | Randen die betekenis dragen in ink2 (≥ 3:1), niet in rule |

## Verhaal en hiërarchie

| Les | Waarom / wat te doen |
|-----|----------------------|
| Oorzaak naast gevolg | De schakelaar "budget uit" stond eerst ver van de lijn die viel; de kijker zag niet waarom. Zet de oorzaak in hetzelfde blikveld, desnoods met een verbindingslijn |
| Eén focale actie per moment | Geen anker laten uitfaden terwijl de turn gebeurt; dim het object dat nog niet aan de beurt is, maar houd tekst leesbaar (zie de regel over dimmen hieronder) |
| Geen dubbele tekst | Een anker dat de caption eronder herhaalt verdunt de grote momenten. Grote tekst alleen in Vraag, Turn en Payoff |
| Eén woordenschat | Elk ding had 4 tot 5 namen. Kies er één per ding, introduceer de koppeling ("Organisch · SEO") één keer, gebruik in de payoff dezelfde woorden |
| Volgorde in beeld = volgorde in de caption | Blokken stonden van boven gelezen in omgekeerde volgorde |
| De data mag niets beweren wat de film niet zegt | Een lijn die een andere kruist suggereert "dit levert meer op". Als dat niet bewezen is: laat ze niet kruisen |
| Overgangen in volgorde: eerst weg, dan erin | Twee beelden tegelijk half doorzichtig leest als een fout. Laat het oude beeld in de eerste ~40% verdwijnen en het nieuwe daarna komen |
| De opening moet meteen het beeld zijn | Niet 2 s een lege pagina: het misverstand staat er binnen ~1,5 s |
| Dimmen naar 30% maakt tekst onleesbaar | 30% dekking gaf 1,9:1 op paginanamen. Gebruik `E.minAlpha(kleur, achtergrond)` als ondergrens voor gedimde tekst, of dim alleen randen en vlakken. `verify.py` ziet gedimde tekst niet: reken het zelf na |
| Caption en beeld moeten hetzelfde zeggen op hetzelfde moment | "Google kent je pagina's" terwijl alleen Home een vinkje had. Schrijf de caption bij wat er op dat moment in beeld staat |
| Paradox-zinnen in de payoff werken niet | "Bovenaan is niet bovenaan" moest de kijker ontcijferen. Beantwoord letterlijk de openingsvraag |

## Captions

| Les | Waarom / wat te doen |
|-----|----------------------|
| ≤ 15 tekens per seconde, hard maximum 17 | `verify.py` controleert het. Verkort de zin of verschuif de grens met de buurcaption |
| Gebalanceerde regels | De engine doet dit (`wrapBalanced`); schrijf zinnen die op een natuurlijke plek breken |
| Captionvak blijft staan tussen aansluitende captions | De engine doet dit; laat geen gaten van < 0,3 s tussen captions |

## Geluid

| Les | Waarom / wat te doen |
|-----|----------------------|
| AAC-codering laat scherpe klikken ~2 dB overschieten | `master_audio.py` heeft een oversampled limiter; meet altijd op de mp4, niet op de wav |
| Audio is niet bit-identiek tussen renders | Afrondingsruis in Chromium Web Audio, ~-135 dBFS. Verwacht en onhoorbaar; beeld is wel bit-identiek |
| Onsetdetectie mist lage tikken | Meet doffe cues (thud) in het laag (< 160 Hz), niet met een hoogdoorlaatdetector |
| Bed weg bij de turn | Een korte drop in het bed maakt de turn hoorbaar zonder extra effect |

## Techniek

| Les | Waarom / wat te doen |
|-----|----------------------|
| `ffmpeg` in een `while read`-lus eet de invoer op | Gebruik `-nostdin` |
| Bestandsnamen op tijd verschillen tussen JS en Python door afronding | Render stills met `--times beats` (namen op beat-ID) |
| Render niets anders zwaars tijdens de export | Stills renderen tegelijk met de export vertraagde alles sterk |
| Netwerk kan geblokkeerd zijn | Merksite en bronnen waren onbereikbaar. Log het in DECISIONS, markeer bronnen als "nalopen", en zeg het in de oplevering. De gebruiker kan domeinen toestaan in de omgevingsinstellingen |
| Lege placeholders in een brief | Een ontbrekend onderwerp of ontbrekende doelgroep verandert het doel: vraag het, met een aanbevolen optie voorop |
