<?php
/**
 * Optioneel CPT 'reis'. Wordt alleen geregistreerd als het nog niet bestaat.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Post_Type {

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ), 5 );
	}

	public static function register() {
		// Werk je met gewone Elementor-pagina's? Zet dit uit met:
		// add_filter( 'reiskalender/register_cpt', '__return_false' );
		if ( ! apply_filters( 'reiskalender/register_cpt', true ) ) {
			return;
		}

		if ( post_type_exists( 'reis' ) ) {
			return;
		}

		register_post_type(
			'reis',
			array(
				'labels'       => array(
					'name'          => __( 'Reizen', 'reiskalender' ),
					'singular_name' => __( 'Reis', 'reiskalender' ),
					'add_new_item'  => __( 'Nieuwe reis toevoegen', 'reiskalender' ),
					'edit_item'     => __( 'Reis bewerken', 'reiskalender' ),
					'search_items'  => __( 'Reizen zoeken', 'reiskalender' ),
				),
				'public'       => true,
				'has_archive'  => true,
				'menu_icon'    => 'dashicons-palmtree',
				'rewrite'      => array( 'slug' => 'reizen' ),
				'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields', 'page-attributes' ),
				'show_in_rest' => true,
			)
		);
	}
}
