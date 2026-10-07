# Review-prompts

Start beide agents parallel in de achtergrond zodra de stills van alle formaten kloppen, vóór de export. Vul `<slug>`, de doelgroep en het idee in. Ze wijzigen niets; jij verwerkt de bevindingen.

## Design review

```
Je bent design reviewer voor een explainerfilm (Nederlands) van <duur> s: "<titel>", voor <doelgroep, en wat ze nu geloven>.
Idee: <één zin>. Uitkomst: <wat de kijker daarna kan>.

Bekijk met de Read tool (het zijn afbeeldingen):
- explainer/films/<slug>/build/contact_wide.png, contact_tall.png, contact_square.png
- losse frames in explainer/films/<slug>/build/stills/
- teksten en tijden: explainer/films/<slug>/timeline.js; logica alleen indien nodig: scenes.js

Review met de vragen van Meaghan Choi:
1. Voor wie is dit? Klopt de film voor die persoon?
2. Wat communiceren we? Is er precies één idee, en landt het in de Turn?
3. Heeft iets een naam nodig of kan het onzichtbaar blijven? Heeft elk ding steeds dezelfde naam, ook in de payoff?
Plus: restraint (wat moet eruit?), één focale actie per frame, staat oorzaak naast gevolg, is de opening het beeld van het misverstand, is de payoff hetzelfde beeld nu goed gelezen, beweert de data niets wat de film niet zegt, leesbaarheid op een telefoon van 390 px breed.

Wees streng en concreet. Maximaal 8 bevindingen, ernstigste eerst, elk met beat-ID, probleem en concrete fix (wat in code of tekst verandert). Zeg ook wat goed is en moet blijven. Wijzig geen bestanden.
```

## Toegankelijkheid

```
Accessibility-pass op een explainerfilm (canvas-render, Nederlands). Wijzig geen bestanden; lever een rapport.

Bestanden:
- explainer/brand/brand.js (kleuren), explainer/engine/core.js (schaal per formaat en minimale tekstmaat), explainer/engine/components.js
- explainer/films/<slug>/timeline.js (captions, moves), scenes.js
- stills in explainer/films/<slug>/build/stills/ (wide, tall, square, rmtall = reduced motion)

Reken (python3 met PIL is beschikbaar):
1. Contrast (WCAG 2.x) voor elk tekst/achtergrond-paar dat in de code voorkomt, ook gemengde kleuren bij gedeeltelijke dekking. Drempel 4,5:1 voor tekst, 3:1 voor betekenisvolle randen en vormen.
2. Kleinste tekst per formaat in echte px, en op 390 px breed voor 9:16 en 1:1. Noem alles onder 11 px.
3. Is kleur ooit het enige signaal?
4. Flitsen: ergens meer dan 3 per seconde?
5. Captions: max 2 regels, tekens per seconde per caption (drempel ~15, max 17).
6. Reduced motion: zelfde volgorde van ideeën als de gewone versie?

Lever een contrasttabel, de kleinste maten, en per probleem een concrete fix. Kort en feitelijk.
```
