<?php
/**
 * Shortcodes:
 *   [reiskalender]        - de kalender met alle reizen, gegroepeerd per maand
 *   [reis_vertrekdata]    - de vertrekdata van één reis (op de reispagina zelf)
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Shortcode {

	public static function init() {
		add_shortcode( 'reiskalender', array( __CLASS__, 'kalender' ) );
		add_shortcode( 'reis_vertrekdata', array( __CLASS__, 'reis_data' ) );
	}

	/**
	 * Standaardwaarden, gedeeld door shortcode en Elementor-widget.
	 *
	 * @return array<string,mixed>
	 */
	public static function defaults() {
		return array(
			'maanden'         => 0,        // Max aantal maandblokken, 0 = alle.
			'limiet'          => 0,        // Max aantal vertrekken, 0 = alle.
			'van'             => '',       // 2026-01 of 2026-01-15.
			'tot'             => '',       // 2027-12 of 2027-10-31.
			'reizen'          => '',       // Post-ID's, komma-gescheiden.
			'post_type'       => '',       // Komma-gescheiden, leeg = standaard.
			'status'          => '',       // beschikbaar,bijna_vol,...
			'verleden'        => 'nee',    // ja = ook data uit het verleden.
			'layout'          => 'lijst',  // lijst of grid.
			'afbeelding'      => 'ja',
			'excerpt'         => 'nee',
			'knop'            => __( 'Bekijk reis', 'reiskalender' ),
			'kop_niveau'      => 2,
			'leeg'            => __( 'Er staan op dit moment geen vertrekdata gepland.', 'reiskalender' ),
		);
	}

	/**
	 * Zet shortcode-attributen om naar interne argumenten.
	 *
	 * @param array<string,mixed> $atts Attributen.
	 * @return array<string,mixed>
	 */
	public static function parse_args( $atts ) {
		$atts = shortcode_atts( self::defaults(), array_change_key_case( (array) $atts, CASE_LOWER ), 'reiskalender' );

		$post_types = array_filter( array_map( 'trim', explode( ',', (string) $atts['post_type'] ) ) );
		$post_types = array_values( array_filter( $post_types, 'post_type_exists' ) );

		$kop = (int) $atts['kop_niveau'];
		$kop = min( 5, max( 1, $kop ) );

		return array(
			'post_types'      => $post_types ? $post_types : reiskalender_post_types(),
			'post__in'        => array_filter( array_map( 'absint', explode( ',', (string) $atts['reizen'] ) ) ),
			'van'             => (string) $atts['van'],
			'tot'             => (string) $atts['tot'],
			'statussen'       => array_filter( array_map( 'trim', explode( ',', (string) $atts['status'] ) ) ),
			'maanden'         => absint( $atts['maanden'] ),
			'limiet'          => absint( $atts['limiet'] ),
			'verleden'        => self::is_ja( $atts['verleden'] ),
			'layout'          => in_array( $atts['layout'], array( 'lijst', 'grid' ), true ) ? $atts['layout'] : 'lijst',
			'toon_afbeelding' => self::is_ja( $atts['afbeelding'] ),
			'toon_excerpt'    => self::is_ja( $atts['excerpt'] ),
			'knop_tekst'      => (string) $atts['knop'],
			'kop_niveau'      => $kop,
			'leeg_tekst'      => (string) $atts['leeg'],
		);
	}

	/**
	 * @param array<string,mixed> $atts Attributen.
	 * @return string
	 */
	public static function kalender( $atts = array() ) {
		return Reiskalender_Render::kalender( self::parse_args( $atts ) );
	}

	/**
	 * @param array<string,mixed> $atts Attributen.
	 * @return string
	 */
	public static function reis_data( $atts = array() ) {
		$atts    = (array) $atts;
		$args    = self::parse_args( $atts );
		$post_id = isset( $atts['reis'] ) ? absint( $atts['reis'] ) : get_the_ID();

		if ( ! $post_id ) {
			return '';
		}

		return Reiskalender_Render::reis_data( $post_id, $args );
	}

	/**
	 * @param mixed $waarde Waarde.
	 * @return bool
	 */
	protected static function is_ja( $waarde ) {
		if ( is_bool( $waarde ) ) {
			return $waarde;
		}

		return in_array( strtolower( (string) $waarde ), array( 'ja', 'yes', 'true', '1', 'on' ), true );
	}
}
