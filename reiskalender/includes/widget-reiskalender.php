<?php
/**
 * De Elementor-widget zelf. Wordt pas ingeladen als Elementor actief is.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'reiskalender';
	}

	public function get_title() {
		return __( 'Reiskalender', 'reiskalender' );
	}

	public function get_icon() {
		return 'eicon-calendar';
	}

	public function get_categories() {
		return array( 'general' );
	}

	public function get_keywords() {
		return array( 'reis', 'reizen', 'kalender', 'vertrekdata', 'acf' );
	}

	public function get_style_depends() {
		return array( 'reiskalender' );
	}

	protected function register_controls() {
		$this->start_controls_section(
			'sectie_inhoud',
			array( 'label' => __( 'Inhoud', 'reiskalender' ) )
		);

		$this->add_control(
			'layout',
			array(
				'label'   => __( 'Layout', 'reiskalender' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'default' => 'lijst',
				'options' => array(
					'lijst' => __( 'Lijst', 'reiskalender' ),
					'grid'  => __( 'Grid', 'reiskalender' ),
				),
			)
		);

		$this->add_control(
			'reizen',
			array(
				'label'       => __( 'Alleen deze reizen (post-ID’s)', 'reiskalender' ),
				'type'        => \Elementor\Controls_Manager::TEXT,
				'placeholder' => '12, 34, 56',
				'description' => __( 'Leeg laten = alle reizen.', 'reiskalender' ),
			)
		);

		$this->add_control(
			'van',
			array(
				'label'       => __( 'Vanaf maand', 'reiskalender' ),
				'type'        => \Elementor\Controls_Manager::TEXT,
				'placeholder' => '2026-01',
			)
		);

		$this->add_control(
			'tot',
			array(
				'label'       => __( 'Tot en met maand', 'reiskalender' ),
				'type'        => \Elementor\Controls_Manager::TEXT,
				'placeholder' => '2027-10',
			)
		);

		$this->add_control(
			'maanden',
			array(
				'label'       => __( 'Max. aantal maanden', 'reiskalender' ),
				'type'        => \Elementor\Controls_Manager::NUMBER,
				'min'         => 0,
				'default'     => 0,
				'description' => __( '0 = alle maanden tonen.', 'reiskalender' ),
			)
		);

		$this->add_control(
			'limiet',
			array(
				'label'   => __( 'Max. aantal vertrekken', 'reiskalender' ),
				'type'    => \Elementor\Controls_Manager::NUMBER,
				'min'     => 0,
				'default' => 0,
			)
		);

		$this->add_control(
			'status',
			array(
				'label'       => __( 'Alleen deze statussen', 'reiskalender' ),
				'type'        => \Elementor\Controls_Manager::SELECT2,
				'multiple'    => true,
				'options'     => Reiskalender_Fields::statussen(),
				'label_block' => true,
			)
		);

		$this->add_control(
			'verleden',
			array(
				'label'        => __( 'Data uit het verleden tonen', 'reiskalender' ),
				'type'         => \Elementor\Controls_Manager::SWITCHER,
				'return_value' => 'ja',
				'default'      => '',
			)
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'sectie_weergave',
			array( 'label' => __( 'Weergave', 'reiskalender' ) )
		);

		$this->add_control(
			'afbeelding',
			array(
				'label'        => __( 'Uitgelichte afbeelding tonen', 'reiskalender' ),
				'type'         => \Elementor\Controls_Manager::SWITCHER,
				'return_value' => 'ja',
				'default'      => 'ja',
			)
		);

		$this->add_control(
			'excerpt',
			array(
				'label'        => __( 'Samenvatting tonen', 'reiskalender' ),
				'type'         => \Elementor\Controls_Manager::SWITCHER,
				'return_value' => 'ja',
				'default'      => '',
			)
		);

		$this->add_control(
			'knop',
			array(
				'label'   => __( 'Knoptekst', 'reiskalender' ),
				'type'    => \Elementor\Controls_Manager::TEXT,
				'default' => __( 'Bekijk reis', 'reiskalender' ),
			)
		);

		$this->add_control(
			'kop_niveau',
			array(
				'label'   => __( 'Kopniveau maand', 'reiskalender' ),
				'type'    => \Elementor\Controls_Manager::SELECT,
				'default' => '2',
				'options' => array(
					'2' => 'H2',
					'3' => 'H3',
					'4' => 'H4',
				),
			)
		);

		$this->add_control(
			'leeg',
			array(
				'label'   => __( 'Tekst als er niets gepland staat', 'reiskalender' ),
				'type'    => \Elementor\Controls_Manager::TEXTAREA,
				'default' => __( 'Er staan op dit moment geen vertrekdata gepland.', 'reiskalender' ),
			)
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'sectie_stijl',
			array(
				'label' => __( 'Stijl', 'reiskalender' ),
				'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
			)
		);

		$this->add_control(
			'accent',
			array(
				'label'     => __( 'Accentkleur', 'reiskalender' ),
				'type'      => \Elementor\Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .reiskalender' => '--reiskalender-accent: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'randkleur',
			array(
				'label'     => __( 'Randkleur', 'reiskalender' ),
				'type'      => \Elementor\Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .reiskalender' => '--reiskalender-rand: {{VALUE}};',
				),
			)
		);

		$this->add_control(
			'tekstkleur',
			array(
				'label'     => __( 'Tekstkleur', 'reiskalender' ),
				'type'      => \Elementor\Controls_Manager::COLOR,
				'selectors' => array(
					'{{WRAPPER}} .reiskalender' => '--reiskalender-tekst: {{VALUE}};',
				),
			)
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();

		$status = $settings['status'];
		$status = is_array( $status ) ? implode( ',', $status ) : (string) $status;

		echo Reiskalender_Shortcode::kalender( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			array(
				'layout'     => $settings['layout'],
				'reizen'     => $settings['reizen'],
				'van'        => $settings['van'],
				'tot'        => $settings['tot'],
				'maanden'    => $settings['maanden'],
				'limiet'     => $settings['limiet'],
				'status'     => $status,
				'verleden'   => $settings['verleden'],
				'afbeelding' => $settings['afbeelding'],
				'excerpt'    => $settings['excerpt'],
				'knop'       => $settings['knop'],
				'kop_niveau' => $settings['kop_niveau'],
				'leeg'       => $settings['leeg'],
			)
		);
	}
}
