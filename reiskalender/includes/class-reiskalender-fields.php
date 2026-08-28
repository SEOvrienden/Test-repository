<?php
/**
 * ACF-veldgroep "Vertrekdata" (repeater) + synchronisatie naar platte meta.
 *
 * De repeater is de kern van de oplossing: één reis (één post) bevat een rij
 * per vertrekdatum. De kalender leest die rijen uit en plaatst dezelfde reis
 * in elke maand waarin een rij valt. Dupliceren is dus niet nodig.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Fields {

	const REPEATER   = 'vertrekdata';
	const F_VERTREK  = 'vertrekdatum';
	const F_TERUG    = 'terugkomstdatum';
	const F_PRIJS    = 'prijs';
	const F_STATUS   = 'status';
	const F_PLAATSEN = 'plaatsen';
	const F_LINK     = 'boekingslink';

	/** Platte meta, handig om elders (bv. Elementor Loop Grid) op te sorteren/filteren. */
	const META_DATUMS = '_reiskalender_datums';
	const META_EERSTE = '_reiskalender_eerstvolgende';

	public static function init() {
		add_action( 'acf/init', array( __CLASS__, 'register_field_group' ) );
		add_action( 'acf/save_post', array( __CLASS__, 'sync_meta' ), 20 );
	}

	/**
	 * Statuslabels voor de select en de weergave.
	 *
	 * @return array<string,string>
	 */
	public static function statussen() {
		return apply_filters(
			'reiskalender/statussen',
			array(
				'beschikbaar'  => __( 'Beschikbaar', 'reiskalender' ),
				'bijna_vol'    => __( 'Bijna vol', 'reiskalender' ),
				'vol'          => __( 'Volgeboekt', 'reiskalender' ),
				'geannuleerd'  => __( 'Geannuleerd', 'reiskalender' ),
			)
		);
	}

	public static function register_field_group() {
		if ( ! function_exists( 'acf_add_local_field_group' ) ) {
			return;
		}

		$location = apply_filters(
			'reiskalender/field_group_location',
			array(
				array(
					array(
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => 'reis',
					),
				),
				array(
					array(
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => 'page',
					),
				),
			)
		);

		acf_add_local_field_group(
			array(
				'key'                   => 'group_reiskalender_vertrekdata',
				'title'                 => __( 'Vertrekdata', 'reiskalender' ),
				'location'              => $location,
				'menu_order'            => 0,
				'position'              => 'normal',
				'style'                 => 'default',
				'label_placement'       => 'top',
				'active'                => true,
				'show_in_rest'          => true,
				'description'           => __( 'Voeg per reis alle vertrekdata toe. Elke rij verschijnt automatisch in de reiskalender bij de bijbehorende maand.', 'reiskalender' ),
				'fields'                => array(
					array(
						'key'          => 'field_reiskalender_vertrekdata',
						'label'        => __( 'Vertrekdata', 'reiskalender' ),
						'name'         => self::REPEATER,
						'type'         => 'repeater',
						'instructions' => __( 'Eén rij per vertrekdatum. Dezelfde reis kan zo in meerdere maanden en jaren in de kalender staan.', 'reiskalender' ),
						'layout'       => 'row',
						'button_label' => __( 'Vertrekdatum toevoegen', 'reiskalender' ),
						'sub_fields'   => array(
							array(
								'key'           => 'field_reiskalender_vertrekdatum',
								'label'         => __( 'Vertrekdatum', 'reiskalender' ),
								'name'          => self::F_VERTREK,
								'type'          => 'date_picker',
								'required'      => 1,
								'display_format' => 'd-m-Y',
								'return_format' => 'Ymd',
								'first_day'     => 1,
								'wrapper'       => array( 'width' => '25' ),
							),
							array(
								'key'           => 'field_reiskalender_terugkomstdatum',
								'label'         => __( 'Terugkomstdatum', 'reiskalender' ),
								'name'          => self::F_TERUG,
								'type'          => 'date_picker',
								'display_format' => 'd-m-Y',
								'return_format' => 'Ymd',
								'first_day'     => 1,
								'wrapper'       => array( 'width' => '25' ),
							),
							array(
								'key'     => 'field_reiskalender_prijs',
								'label'   => __( 'Prijs vanaf (€)', 'reiskalender' ),
								'name'    => self::F_PRIJS,
								'type'    => 'number',
								'min'     => 0,
								'step'    => '1',
								'wrapper' => array( 'width' => '20' ),
							),
							array(
								'key'           => 'field_reiskalender_status',
								'label'         => __( 'Status', 'reiskalender' ),
								'name'          => self::F_STATUS,
								'type'          => 'select',
								'choices'       => self::statussen(),
								'default_value' => 'beschikbaar',
								'wrapper'       => array( 'width' => '15' ),
							),
							array(
								'key'     => 'field_reiskalender_plaatsen',
								'label'   => __( 'Plaatsen vrij', 'reiskalender' ),
								'name'    => self::F_PLAATSEN,
								'type'    => 'number',
								'min'     => 0,
								'wrapper' => array( 'width' => '15' ),
							),
							array(
								'key'          => 'field_reiskalender_boekingslink',
								'label'        => __( 'Boekingslink', 'reiskalender' ),
								'name'         => self::F_LINK,
								'type'         => 'url',
								'instructions' => __( 'Leeg laten = link naar de reispagina zelf.', 'reiskalender' ),
							),
						),
					),
				),
			)
		);
	}

	/**
	 * Schrijft alle vertrekdata en de eerstvolgende datum weg als platte meta.
	 *
	 * Repeater-waarden staan in de database als vertrekdata_0_vertrekdatum,
	 * vertrekdata_1_vertrekdatum, ... en zijn daardoor niet te gebruiken in een
	 * meta_query. Deze twee meta-velden zijn dat wel — handig om bijvoorbeeld een
	 * Elementor Loop Grid te sorteren op "eerstvolgend vertrek".
	 *
	 * @param int|string $post_id ACF post id.
	 */
	public static function sync_meta( $post_id ) {
		if ( ! is_numeric( $post_id ) ) {
			return; // Options page, user, term: niet relevant.
		}

		$post_id = (int) $post_id;

		if ( ! in_array( get_post_type( $post_id ), reiskalender_post_types(), true ) ) {
			return;
		}

		$datums = array();

		foreach ( Reiskalender_Query::get_rows( $post_id ) as $row ) {
			if ( $row['datum'] ) {
				$datums[] = $row['datum'];
			}
		}

		sort( $datums );

		if ( ! $datums ) {
			delete_post_meta( $post_id, self::META_DATUMS );
			delete_post_meta( $post_id, self::META_EERSTE );

			return;
		}

		$vandaag = current_time( 'Ymd' );
		$eerste  = $datums[0];

		foreach ( $datums as $datum ) {
			if ( $datum >= $vandaag ) {
				$eerste = $datum;
				break;
			}
		}

		update_post_meta( $post_id, self::META_DATUMS, implode( ',', $datums ) );
		update_post_meta( $post_id, self::META_EERSTE, $eerste );
	}
}
