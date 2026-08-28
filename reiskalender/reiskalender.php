<?php
/**
 * Plugin Name: Reiskalender (ACF vertrekdata)
 * Description: Eén reis, meerdere vertrekdata. Toont dezelfde reis in de kalender bij elke maand waarin hij vertrekt, zonder pagina's te dupliceren.
 * Version:     1.0.0
 * Author:      SEO vrienden
 * Text Domain: reiskalender
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'REISKALENDER_VERSION', '1.0.0' );
define( 'REISKALENDER_FILE', __FILE__ );
define( 'REISKALENDER_PATH', plugin_dir_path( __FILE__ ) );
define( 'REISKALENDER_URL', plugin_dir_url( __FILE__ ) );

require_once REISKALENDER_PATH . 'includes/class-reiskalender-post-type.php';
require_once REISKALENDER_PATH . 'includes/class-reiskalender-fields.php';
require_once REISKALENDER_PATH . 'includes/class-reiskalender-query.php';
require_once REISKALENDER_PATH . 'includes/class-reiskalender-render.php';
require_once REISKALENDER_PATH . 'includes/class-reiskalender-shortcode.php';
require_once REISKALENDER_PATH . 'includes/class-reiskalender-elementor.php';

/**
 * Post types waarin naar vertrekdata gezocht wordt.
 *
 * Standaard: het CPT 'reis' plus gewone pagina's, zodat het ook werkt als de
 * 5 reizen als losse Elementor-pagina's zijn opgezet. Pagina's zonder
 * vertrekdata worden nooit meegenomen, dus dit is veilig.
 *
 * @return string[]
 */
function reiskalender_post_types() {
	$types = apply_filters( 'reiskalender/post_types', array( 'reis', 'page' ) );

	return array_values( array_filter( (array) $types, 'post_type_exists' ) );
}

add_action( 'plugins_loaded', function () {
	Reiskalender_Post_Type::init();
	Reiskalender_Fields::init();
	Reiskalender_Shortcode::init();
	Reiskalender_Elementor::init();
} );

add_action( 'wp_enqueue_scripts', function () {
	wp_register_style(
		'reiskalender',
		REISKALENDER_URL . 'assets/reiskalender.css',
		array(),
		REISKALENDER_VERSION
	);
} );

/**
 * ACF is verplicht: zonder ACF is er niets om uit te lezen.
 */
add_action( 'admin_notices', function () {
	if ( function_exists( 'get_field' ) ) {
		return;
	}

	echo '<div class="notice notice-error"><p>';
	echo esc_html__( 'Reiskalender: Advanced Custom Fields (ACF) is niet actief. De vertrekdata kunnen niet worden uitgelezen.', 'reiskalender' );
	echo '</p></div>';
} );

add_action( 'init', function () {
	load_plugin_textdomain( 'reiskalender', false, dirname( plugin_basename( REISKALENDER_FILE ) ) . '/languages' );
} );
