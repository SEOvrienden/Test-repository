# Beslislog

Eén regel per beslissing. Aanname = gemarkeerd.

| # | Beslissing | Waarom |
|---|-----------|--------|
| D1 | Onderwerp SEO vs SEA, 60 s, doelgroep MKB-ondernemer met (overweging van) Google Ads | Gekozen door gebruiker; placeholders in de brief waren leeg |
| D2 | Uitkomst: "Google Ads voor nu, SEO voor straks" kunnen uitleggen | Eén begrip, toepasbaar in een klantgesprek |
| D3 | **Aanname:** merkkleuren en typografie zelf gekozen (warm neutraal + diepgroen accent, Caladea + Inter) | Geen ./brand, ./refs, ./screens in de repo; seovrienden.nl geblokkeerd door netwerkproxy. Vervangen zodra merkbestanden er zijn: alleen object `C` in `src/film.js` en `tokens.json` |
| D4 | Echte UI als anker: nagebouwd zoekresultaat, zonder Google-logo of -huisstijl | Kijker herkent het misverstand; geen merkimitatie |
| D5 | Fictief bedrijf "jouwbedrijf.nl", zoekterm "loodgieter zaandam" | Geen echte klant zonder toestemming; regio past bij SEO vrienden (Wormer) |
| D6 | Richting A "Twee lanen" gekozen uit 4 (zie directions.html) | Geen metafoor nodig; objecten kunnen doorleven |
| D7 | Geen voice-over; de vertelling staat in de captions | Geen bruikbare Nederlandse TTS offline; een robotstem kost meer dan hij oplevert. Daardoor geen ducking nodig. Aanbeveling: later Jesse of Mike inspreken op `captions.srt` |
| D8 | Grafiek is schematisch, zonder bezoekersaantallen, en zegt dat in beeld | Geen echte data beschikbaar; nepcijfers verboden |
| D9 | Organische lijn eindigt net onder het advertentieniveau, niet erboven | Bewering "SEO levert meer op" is niet gedekt door een bron |
| D10 | Eén getal in de film: 4 mnd tot 1 jaar (Google) | Enige getal met bron (F4) |
| D11 | Namen: "Advertentie" (= Google Ads) en "Organisch" (= SEO), elk één keer gekoppeld in de laankop, daarna consequent | Eén naam per ding; "SEA" komt niet in beeld omdat de doelgroep "Google Ads" zegt |
| D12 | 96 BPM, alle kernacties op het beatraster | Bed en beeld lopen synchroon zonder handwerk |
| D13 | Motief (A4-D5-F#5) bij "organisch opgebouwd", "positie blijft" en de payoff | Het motief hoort bij het kernidee, niet bij de advertentie |
| D14 | Formaten met eigen compositie en schaal (16:9 ×1,1, 9:16 ×1,35, 1:1 ×1,2), geen bijsnijden | Leesbaarheid op telefoon |
| D15 | Reduced-motion: posities springen (geen beweging), alleen korte fades; afspeelkop in stappen; camera vast | Zelfde volgorde van ideeën, geen beweging |
| D16 | Captions branden in en gaan mee als .srt uit dezelfde bron (TIMELINE.captions) | Eén bron, geen afwijkingen |
| D17 | Loudness via twee-pass loudnorm naar -16 LUFS, doel TP -2,0 (marge voor AAC) | Eis: TP max -1,5 dBTP na codering |
| D18 | Primaire Google-bronnen niet live geopend (proxy), wel via zoekresultaten gecontroleerd | Gemarkeerd in SOURCES.md als nalopen |
| D19 | Design review verwerkt: schakelaar boven het omslagpunt, één woordenschat (huur je per klik / bouw je op, "positie"), organische lijn onder advertentie, dubbele ankers in S3 weg, kaart B gedimd in S2, blokvolgorde gelijk aan caption | Zie review/pairs/11 t/m 15 |
| D20 | Accessibility verwerkt: minimale tekstmaat per formaat, 1:1 op schaal 1,2 met compacte kaarten, gestreepte rand in ink2, accent #185E44, gebalanceerde captions, caption 13 trager | Zie review/pairs/16 en 17 |
| D21 | Oversampled limiter (0,6) na loudnorm | Na AAC was true peak +0,2 dBTP; nu -3,3 dBTP bij -16,2 LUFS |
| D22 | 16:9 is niet bedoeld voor 390 px; 9:16 is de telefoonversie | Kleinste tekst 16:9 op 390 px is 4,9 px |
