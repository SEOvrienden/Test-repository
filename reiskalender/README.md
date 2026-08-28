# Reiskalender — één reis, meerdere vertrekdata

Kort antwoord op de vraag: **ja, dit kan met ACF en zonder pagina's te dupliceren.**
5 reizen = 5 pagina's. De vertrekdata zet je als **repeater** op de reis zelf, en de
kalender leest alle reizen uit, klapt hun data open tot één platte lijst met
"vertrekken" en groepeert die per maand. Eén reis met drie data verschijnt dus
automatisch drie keer in de kalender — in januari 2026, maart 2026 én oktober 2027 —
terwijl je maar op één plek iets beheert.

Het denkfoutje dat dupliceren veroorzaakt: een reis is niet één regel in de kalender.
De kalender toont geen *reizen* maar *vertrekken* (reis × datum). Zodra je dat scheidt,
is dupliceren nergens meer voor nodig.

## Wat zit erin

| Bestand | Doel |
| --- | --- |
| `reiskalender.php` | Plugin-bootstrap |
| `includes/class-reiskalender-fields.php` | ACF-veldgroep "Vertrekdata" (repeater), in code geregistreerd |
| `includes/class-reiskalender-query.php` | Alle vertrekdata ophalen, platslaan, sorteren, groeperen per maand |
| `includes/class-reiskalender-render.php` | HTML-output |
| `includes/class-reiskalender-shortcode.php` | `[reiskalender]` en `[reis_vertrekdata]` |
| `includes/widget-reiskalender.php` | Elementor-widget "Reiskalender" (drag & drop) |
| `assets/reiskalender.css` | Basisstijl, met CSS-variabelen die Elementor overschrijft |
| `tests/smoke-test.php` | Test zonder WordPress: `php reiskalender/tests/smoke-test.php` |

## Installeren

1. Map `reiskalender` uploaden naar `wp-content/plugins/` en activeren.
2. ACF (Pro, of ACF 6.3+ met repeater) moet actief zijn.
3. Klaar — de veldgroep **Vertrekdata** staat meteen op reizen en pagina's. Je hoeft in
   ACF zelf niets aan te klikken; de velden worden in code geregistreerd (`acf_add_local_field_group`),
   zodat ze mee gaan in git en op staging én live identiek zijn.

## Invullen

Op elke reispagina staat het blok **Vertrekdata**. Per vertrek één rij:

- Vertrekdatum (verplicht)
- Terugkomstdatum
- Prijs vanaf
- Status: beschikbaar / bijna vol / volgeboekt / geannuleerd
- Plaatsen vrij
- Boekingslink (leeg = link naar de reispagina)

Rijen hoef je niet op volgorde te zetten; de kalender sorteert zelf.

## Plaatsen in Elementor

**Optie A — de widget.** Zoek in Elementor op *Reiskalender* en sleep hem op de
kalenderpagina. In de widget kun je instellen: layout, periode (van/tot), maximaal aantal
maanden, alleen bepaalde reizen, statussen, knoptekst en de accent-/rand-/tekstkleur.

**Optie B — shortcode.** In een Shortcode-widget:

```
[reiskalender]
[reiskalender van="2026-01" tot="2026-12" layout="grid"]
[reiskalender maanden="3" knop="Bekijk data"]
[reiskalender reizen="101,103" afbeelding="nee"]
[reiskalender status="beschikbaar,bijna_vol"]
```

Alle attributen: `van`, `tot` (`2026-01` of `2026-01-15`), `maanden`, `limiet`, `reizen`
(post-ID's), `post_type`, `status`, `verleden` (`ja`/`nee`), `layout` (`lijst`/`grid`),
`afbeelding`, `excerpt`, `knop`, `kop_niveau`, `leeg`.

Op de reispagina zelf, voor het datablokje van díe ene reis:

```
[reis_vertrekdata]
```

## Post type

Standaard wordt een CPT `reis` geregistreerd, en worden gewone pagina's óók doorzocht —
zodat het werkt als je de 5 reizen al als Elementor-pagina's hebt staan. Pagina's zonder
vertrekdata verschijnen nooit in de kalender.

Alleen pagina's gebruiken, geen CPT:

```php
add_filter( 'reiskalender/register_cpt', '__return_false' );
add_filter( 'reiskalender/post_types', fn() => array( 'page' ) );
```

Alleen het CPT:

```php
add_filter( 'reiskalender/post_types', fn() => array( 'reis' ) );
```

## Sorteren op eerstvolgend vertrek (bijv. in een Loop Grid)

Repeater-waarden staan in de database als `vertrekdata_0_vertrekdatum`,
`vertrekdata_1_vertrekdatum`, … en zijn daardoor niet direct te gebruiken in een
`meta_query`. Bij elke opslag schrijft de plugin daarom twee platte velden weg:

- `_reiskalender_eerstvolgende` — de eerstvolgende vertrekdatum (`Ymd`)
- `_reiskalender_datums` — alle data, komma-gescheiden

Een Elementor Loop Grid of `WP_Query` kan daar wél op sorteren en filteren:

```php
$q = new WP_Query( array(
	'post_type'  => 'reis',
	'meta_key'   => '_reiskalender_eerstvolgende',
	'orderby'    => 'meta_value',
	'order'      => 'ASC',
	'meta_query' => array(
		array( 'key' => '_reiskalender_eerstvolgende', 'value' => gmdate( 'Ymd' ), 'compare' => '>=' ),
	),
) );
```

Bestaande reizen die je nog niet opnieuw hebt opgeslagen, hebben deze velden nog niet.
Even opslaan (of een bulk-update) volstaat.

## Wanneer kies je iets anders dan een repeater?

Een repeater is de juiste keuze bij deze schaal (5 reizen × ~3 data). Stap over op een
apart post type `vertrekdatum` met een relatieveld naar de reis zodra je:

- per vertrek een eigen URL, eigen SEO of een eigen boekingsflow wilt;
- honderden vertrekken krijgt en op datum wilt filteren/pagineren in de database;
- per vertrek voorraad wilt bijhouden vanuit een extern systeem.

De weergavelogica in deze plugin (platslaan → sorteren → groeperen per maand) blijft dan
één op één hetzelfde; alleen `Reiskalender_Query::get_rows()` wijzigt.

## Hooks

| Hook | Doel |
| --- | --- |
| `reiskalender/post_types` | Welke post types worden doorzocht |
| `reiskalender/register_cpt` | CPT `reis` wel/niet registreren |
| `reiskalender/field_group_location` | Waar de veldgroep verschijnt |
| `reiskalender/query_args` | `WP_Query`-argumenten aanpassen |
| `reiskalender/departures` | De platte vertrekkenlijst aanpassen |
| `reiskalender/statussen` | Eigen statuslabels |

## Testen

```bash
php reiskalender/tests/smoke-test.php
```

Draait zonder WordPress en controleert onder andere dat één reis met drie data in drie
verschillende maandgroepen terechtkomt.
