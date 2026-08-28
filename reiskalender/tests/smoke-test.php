<?php
/**
 * Smoke-test zonder WordPress: controleert de kern van de oplossing, namelijk dat
 * één reis met meerdere vertrekdata in meerdere maandgroepen terechtkomt.
 *
 * Draaien: php reiskalender/tests/smoke-test.php
 */

define( 'ABSPATH', __DIR__ );

// --- Minimale WordPress-stubs --------------------------------------------------
function __( $tekst, $domein = null ) { return $tekst; }
function apply_filters( $hook, $waarde ) { return $waarde; }
function absint( $waarde ) { return abs( (int) $waarde ); }
function current_time( $format ) { return gmdate( $format ); }
function wp_date( $format, $timestamp ) { return gmdate( $format, $timestamp ); }
function post_type_exists( $type ) { return in_array( $type, array( 'reis', 'page' ), true ); }
function reiskalender_post_types() { return array( 'reis' ); }
function get_post_meta( $post_id, $key, $single = false ) { return ''; }
function wp_parse_args( $args, $defaults ) { return array_merge( $defaults, (array) $args ); }

$GLOBALS['reizen'] = array();

function get_posts( $args ) {
	return array_map(
		static function ( $id ) {
			return (object) array( 'ID' => $id );
		},
		array_keys( $GLOBALS['reizen'] )
	);
}

function get_the_title( $post ) { return $GLOBALS['reizen'][ $post->ID ]['titel']; }
function get_permalink( $post ) { return 'https://voorbeeld.nl/?p=' . $post->ID; }
function get_post_thumbnail_id( $post ) { return 0; }
function get_the_excerpt( $post ) { return ''; }

require_once __DIR__ . '/../includes/class-reiskalender-fields.php';
require_once __DIR__ . '/../includes/class-reiskalender-query.php';

// ACF-vervanger: levert de repeaterrijen van een reis.
function get_field( $veld, $post_id ) {
	return $GLOBALS['reizen'][ $post_id ]['vertrekdata'] ?? array();
}

// --- Testdata: 5 reizen, elk 3 vertrekdata ------------------------------------
$GLOBALS['reizen'] = array(
	101 => array(
		'titel'       => 'Rondreis IJsland',
		'vertrekdata' => array(
			array( 'vertrekdatum' => '20260112', 'terugkomstdatum' => '20260126', 'prijs' => 2450, 'status' => 'beschikbaar' ),
			array( 'vertrekdatum' => '20260309', 'terugkomstdatum' => '20260323', 'prijs' => 2295, 'status' => 'bijna_vol' ),
			array( 'vertrekdatum' => '20271004', 'terugkomstdatum' => '20271018', 'prijs' => 2550, 'status' => 'beschikbaar' ),
		),
	),
	102 => array(
		'titel'       => 'Wandelen in Noorwegen',
		'vertrekdata' => array(
			array( 'vertrekdatum' => '20260118', 'status' => 'beschikbaar' ),
			array( 'vertrekdatum' => '20260615', 'status' => 'vol' ),
			array( 'vertrekdatum' => '20270302', 'status' => 'beschikbaar' ),
		),
	),
	103 => array(
		'titel'       => 'Marokko woestijn',
		'vertrekdata' => array(
			array( 'vertrekdatum' => '20260105', 'status' => 'beschikbaar' ),
			array( 'vertrekdatum' => '20260321', 'status' => 'beschikbaar' ),
			array( 'vertrekdatum' => '20271011', 'status' => 'beschikbaar' ),
		),
	),
	104 => array(
		'titel'       => 'Japan in bloei',
		'vertrekdata' => array(
			array( 'vertrekdatum' => '2026-03-28', 'status' => 'beschikbaar' ), // Ander datumformaat.
			array( 'vertrekdatum' => '20270405', 'status' => 'beschikbaar' ),
			array( 'vertrekdatum' => '20271020', 'status' => 'beschikbaar' ),
		),
	),
	105 => array(
		'titel'       => 'Toscane culinair',
		'vertrekdata' => array(
			array( 'vertrekdatum' => '20250510', 'status' => 'beschikbaar' ), // Verleden.
			array( 'vertrekdatum' => '20260110', 'status' => 'beschikbaar' ),
			array( 'vertrekdatum' => '20261005', 'status' => 'beschikbaar' ),
		),
	),
);

// --- Testrunner ---------------------------------------------------------------
$fouten = 0;

function check( $omschrijving, $verwacht, $werkelijk ) {
	global $fouten;

	$ok = $verwacht === $werkelijk;

	if ( ! $ok ) {
		$fouten++;
	}

	printf(
		"%s %s%s\n",
		$ok ? '  OK  ' : ' FOUT ',
		$omschrijving,
		$ok ? '' : sprintf( "\n        verwacht: %s\n        gekregen: %s", var_export( $verwacht, true ), var_export( $werkelijk, true ) )
	);
}

echo "Reiskalender smoke-test\n-----------------------\n";

$alles   = Reiskalender_Query::get_departures( array( 'include_past' => true ) );
$groepen = Reiskalender_Query::group_by_month( $alles );

check( '5 reizen x 3 data = 15 vertrekken', 15, count( $alles ) );
check( 'Vertrekken staan chronologisch', true, $alles[0]['datum'] === '20250510' && $alles[1]['datum'] === '20260105' );

// De kern: dezelfde reis (101) in drie verschillende maandgroepen.
$maanden_101 = array();

foreach ( $groepen as $key => $groep ) {
	foreach ( $groep['items'] as $item ) {
		if ( 101 === $item['post_id'] ) {
			$maanden_101[] = $key;
		}
	}
}

check( 'Reis 101 staat in januari 2026, maart 2026 en oktober 2027', array( '2026-01', '2026-03', '2027-10' ), $maanden_101 );
check( 'Januari 2026 bevat 4 vertrekken (reizen 101, 102, 103, 105)', 4, count( $groepen['2026-01']['items'] ) );
check( 'Maandgroepen zijn chronologisch gesorteerd', array( '2025-05', '2026-01', '2026-03' ), array_slice( array_keys( $groepen ), 0, 3 ) );

// Filters.
$venster = Reiskalender_Query::get_departures( array( 'include_past' => true, 'van' => '2026-01', 'tot' => '2026-03' ) );
check( 'Filter van 2026-01 t/m 2026-03 geeft 7 vertrekken', 7, count( $venster ) );

$vanaf_2027 = Reiskalender_Query::get_departures( array( 'include_past' => true, 'van' => '20271001' ) );
check( 'Filter vanaf 20271001 geeft 3 vertrekken', 3, count( $vanaf_2027 ) );

$beschikbaar = Reiskalender_Query::get_departures( array( 'include_past' => true, 'statussen' => array( 'vol' ) ) );
check( 'Statusfilter "vol" geeft 1 vertrek', 1, count( $beschikbaar ) );

$max2 = Reiskalender_Query::group_by_month( $alles, 2 );
check( 'Max 2 maandgroepen', 2, count( $max2 ) );

// Datumnormalisatie.
check( 'Datum 2026-03-28 wordt genormaliseerd naar Ymd', '20260328', Reiskalender_Query::normalize_date( '2026-03-28' ) );
check( 'Datum 28-03-2026 wordt genormaliseerd naar Ymd', '20260328', Reiskalender_Query::normalize_date( '28-03-2026' ) );
check( 'Lege datum blijft leeg', '', Reiskalender_Query::normalize_date( '' ) );
check( 'Ongeldige datum blijft leeg', '', Reiskalender_Query::normalize_date( 'binnenkort' ) );

echo "-----------------------\n";
echo $fouten ? sprintf( "%d test(s) mislukt\n", $fouten ) : "Alle tests geslaagd\n";

exit( $fouten ? 1 : 0 );
