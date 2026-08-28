<?php
/**
 * Weergave: maandkoppen met daaronder de vertrekken van die maand.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Render {

	/**
	 * Rendert de volledige kalender.
	 *
	 * @param array<string,mixed> $args Zie Reiskalender_Shortcode::render().
	 * @return string
	 */
	public static function kalender( $args ) {
		$departures = Reiskalender_Query::get_departures(
			array(
				'post_types'   => $args['post_types'],
				'post__in'     => $args['post__in'],
				'van'          => $args['van'],
				'tot'          => $args['tot'],
				'include_past' => $args['verleden'],
				'statussen'    => $args['statussen'],
				'limit'        => $args['limiet'],
			)
		);

		$groepen = Reiskalender_Query::group_by_month( $departures, $args['maanden'] );

		wp_enqueue_style( 'reiskalender' );

		if ( ! $groepen ) {
			return '<div class="reiskalender reiskalender--leeg"><p>' . esc_html( $args['leeg_tekst'] ) . '</p></div>';
		}

		$classes = array( 'reiskalender', 'reiskalender--' . sanitize_html_class( $args['layout'] ) );

		ob_start();
		?>
		<div class="<?php echo esc_attr( implode( ' ', $classes ) ); ?>">
			<?php foreach ( $groepen as $groep ) : ?>
				<section class="reiskalender__maand" id="reiskalender-<?php echo esc_attr( $groep['key'] ); ?>">
					<h<?php echo (int) $args['kop_niveau']; ?> class="reiskalender__maand-titel">
						<?php echo esc_html( self::ucfirst( $groep['label'] ) ); ?>
						<span class="reiskalender__maand-aantal"><?php echo esc_html( self::aantal_label( count( $groep['items'] ) ) ); ?></span>
					</h<?php echo (int) $args['kop_niveau']; ?>>

					<ul class="reiskalender__lijst">
						<?php foreach ( $groep['items'] as $item ) : ?>
							<?php echo self::item( $item, $args ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php endforeach; ?>
					</ul>
				</section>
			<?php endforeach; ?>
		</div>
		<?php

		return trim( ob_get_clean() );
	}

	/**
	 * Eén vertrek (reis + datum) in de kalender.
	 *
	 * @param array<string,mixed> $item Vertrek.
	 * @param array<string,mixed> $args Instellingen.
	 * @return string
	 */
	protected static function item( $item, $args ) {
		$statussen = Reiskalender_Fields::statussen();
		$link      = $item['link'] ? $item['link'] : $item['permalink'];

		ob_start();
		?>
		<li class="reiskalender__item reiskalender__item--<?php echo esc_attr( sanitize_html_class( $item['status'] ) ); ?>">
			<div class="reiskalender__datum">
				<span class="reiskalender__dag"><?php echo esc_html( wp_date( 'j', $item['timestamp'] ) ); ?></span>
				<span class="reiskalender__maand-kort"><?php echo esc_html( wp_date( 'M', $item['timestamp'] ) ); ?></span>
				<span class="reiskalender__jaar"><?php echo esc_html( wp_date( 'Y', $item['timestamp'] ) ); ?></span>
			</div>

			<?php if ( $args['toon_afbeelding'] && $item['thumb_id'] ) : ?>
				<div class="reiskalender__media">
					<a href="<?php echo esc_url( $item['permalink'] ); ?>" tabindex="-1" aria-hidden="true">
						<?php echo wp_get_attachment_image( $item['thumb_id'], 'medium', false, array( 'loading' => 'lazy', 'alt' => '' ) ); ?>
					</a>
				</div>
			<?php endif; ?>

			<div class="reiskalender__body">
				<h<?php echo (int) $args['kop_niveau'] + 1; ?> class="reiskalender__titel">
					<a href="<?php echo esc_url( $item['permalink'] ); ?>"><?php echo esc_html( $item['titel'] ); ?></a>
				</h<?php echo (int) $args['kop_niveau'] + 1; ?>>

				<p class="reiskalender__periode"><?php echo esc_html( self::periode( $item ) ); ?></p>

				<?php if ( $args['toon_excerpt'] && $item['excerpt'] ) : ?>
					<p class="reiskalender__excerpt"><?php echo esc_html( wp_trim_words( $item['excerpt'], 22 ) ); ?></p>
				<?php endif; ?>
			</div>

			<div class="reiskalender__meta">
				<?php if ( null !== $item['prijs'] ) : ?>
					<span class="reiskalender__prijs">
						<?php
						printf(
							/* translators: %s: prijs. */
							esc_html__( 'vanaf %s', 'reiskalender' ),
							esc_html( self::prijs( $item['prijs'] ) )
						);
						?>
					</span>
				<?php endif; ?>

				<?php if ( isset( $statussen[ $item['status'] ] ) ) : ?>
					<span class="reiskalender__status reiskalender__status--<?php echo esc_attr( sanitize_html_class( $item['status'] ) ); ?>">
						<?php echo esc_html( $statussen[ $item['status'] ] ); ?>
						<?php if ( null !== $item['plaatsen'] && 'vol' !== $item['status'] ) : ?>
							<?php
							printf(
								/* translators: %d: aantal vrije plaatsen. */
								esc_html__( '(%d plaatsen)', 'reiskalender' ),
								(int) $item['plaatsen']
							);
							?>
						<?php endif; ?>
					</span>
				<?php endif; ?>

				<?php if ( $args['knop_tekst'] && 'geannuleerd' !== $item['status'] ) : ?>
					<a class="reiskalender__knop" href="<?php echo esc_url( $link ); ?>">
						<?php echo esc_html( $args['knop_tekst'] ); ?>
					</a>
				<?php endif; ?>
			</div>
		</li>
		<?php

		return ob_get_clean();
	}

	/**
	 * Losse datatabel voor op de reispagina zelf.
	 *
	 * @param int                 $post_id Reis.
	 * @param array<string,mixed> $args    Instellingen.
	 * @return string
	 */
	public static function reis_data( $post_id, $args ) {
		$rows      = Reiskalender_Query::get_rows( $post_id );
		$statussen = Reiskalender_Fields::statussen();
		$vandaag   = current_time( 'Ymd' );

		$rows = array_filter(
			$rows,
			static function ( $row ) use ( $args, $vandaag ) {
				return $args['verleden'] || $row['datum'] >= $vandaag;
			}
		);

		usort(
			$rows,
			static function ( $a, $b ) {
				return strcmp( $a['datum'], $b['datum'] );
			}
		);

		wp_enqueue_style( 'reiskalender' );

		if ( ! $rows ) {
			return '<div class="reiskalender reiskalender--leeg"><p>' . esc_html( $args['leeg_tekst'] ) . '</p></div>';
		}

		ob_start();
		?>
		<table class="reiskalender-data">
			<thead>
				<tr>
					<th scope="col"><?php esc_html_e( 'Vertrek', 'reiskalender' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Terug', 'reiskalender' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Prijs', 'reiskalender' ); ?></th>
					<th scope="col"><?php esc_html_e( 'Beschikbaarheid', 'reiskalender' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $rows as $row ) : ?>
					<tr>
						<td><?php echo esc_html( wp_date( 'j F Y', Reiskalender_Query::timestamp( $row['datum'] ) ) ); ?></td>
						<td><?php echo $row['terug'] ? esc_html( wp_date( 'j F Y', Reiskalender_Query::timestamp( $row['terug'] ) ) ) : '&mdash;'; ?></td>
						<td><?php echo null !== $row['prijs'] ? esc_html( self::prijs( $row['prijs'] ) ) : '&mdash;'; ?></td>
						<td>
							<span class="reiskalender__status reiskalender__status--<?php echo esc_attr( sanitize_html_class( $row['status'] ) ); ?>">
								<?php echo esc_html( $statussen[ $row['status'] ] ?? $row['status'] ); ?>
							</span>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php

		return trim( ob_get_clean() );
	}

	/**
	 * "12 t/m 26 januari 2026" of "12 januari 2026".
	 *
	 * @param array<string,mixed> $item Vertrek.
	 * @return string
	 */
	protected static function periode( $item ) {
		$vertrek = wp_date( 'j F Y', $item['timestamp'] );

		if ( ! $item['terug'] ) {
			return $vertrek;
		}

		$terug_ts = Reiskalender_Query::timestamp( $item['terug'] );
		$zelfde   = gmdate( 'Ym', $item['timestamp'] ) === gmdate( 'Ym', $terug_ts );

		return sprintf(
			/* translators: 1: vertrekdatum, 2: terugkomstdatum. */
			__( '%1$s t/m %2$s', 'reiskalender' ),
			$zelfde ? wp_date( 'j', $item['timestamp'] ) : $vertrek,
			wp_date( 'j F Y', $terug_ts )
		);
	}

	/**
	 * @param float $bedrag Prijs.
	 * @return string
	 */
	protected static function prijs( $bedrag ) {
		$decimalen = fmod( $bedrag, 1 ) > 0 ? 2 : 0;

		return '€ ' . number_format_i18n( $bedrag, $decimalen );
	}

	/**
	 * @param int $aantal Aantal vertrekken.
	 * @return string
	 */
	protected static function aantal_label( $aantal ) {
		return sprintf(
			/* translators: %d: aantal vertrekken. */
			_n( '%d vertrek', '%d vertrekken', $aantal, 'reiskalender' ),
			$aantal
		);
	}

	/**
	 * Hoofdletter op de eerste letter, multibyte-veilig.
	 *
	 * @param string $tekst Tekst.
	 * @return string
	 */
	protected static function ucfirst( $tekst ) {
		if ( function_exists( 'mb_strtoupper' ) ) {
			return mb_strtoupper( mb_substr( $tekst, 0, 1 ) ) . mb_substr( $tekst, 1 );
		}

		return ucfirst( $tekst );
	}
}
