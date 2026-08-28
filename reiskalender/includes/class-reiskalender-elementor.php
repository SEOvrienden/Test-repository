<?php
/**
 * Elementor-widget "Reiskalender", zodat de kalender gewoon op een pagina te
 * slepen is in plaats van via een shortcode-widget.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Elementor {

	public static function init() {
		add_action( 'elementor/widgets/register', array( __CLASS__, 'register' ) );
	}

	/**
	 * @param mixed $widgets_manager Elementor widgets manager.
	 */
	public static function register( $widgets_manager ) {
		if ( ! did_action( 'elementor/loaded' ) || ! class_exists( '\Elementor\Widget_Base' ) ) {
			return;
		}

		require_once REISKALENDER_PATH . 'includes/widget-reiskalender.php';

		$widgets_manager->register( new Reiskalender_Widget() );
	}
}
