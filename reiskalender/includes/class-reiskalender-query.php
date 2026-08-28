<?php
/**
 * Datalaag: haalt alle vertrekdata van alle reizen op en zet ze om naar één
 * platte lijst met "vertrekken" (reis + datum), gesorteerd en gegroepeerd per maand.
 *
 * Dit is de plek waar één reis met drie data drie keer in de kalender belandt.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Reiskalender_Query {

	/**
	 * Leest de repeaterrijen van één reis uit en normaliseert ze.
	 *
	 * @param int $post_id Reis.
	 * @return array<int,array<string,mixed>>
	 */
	public static function get_rows( $post_id ) {
		$rows = array();
		$raw  = array();

		if ( function_exists( 'get_field' ) ) {
			$raw = get_field( Reiskalender_Fields::REPEATER, $post_id );
			$raw = is_array( $raw ) ? $raw : array();
		} else {
			$raw = self::get_rows_from_meta( $post_id );
		}

		foreach ( $raw as $row ) {
			$datum = self::normalize_date( $row[ Reiskalender_Fields::F_VERTREK ] ?? '' );

			if ( ! $datum ) {
				continue;
			}

			$rows[] = array(
				'datum'    => $datum,
				'terug'    => self::normalize_date( $row[ Reiskalender_Fields::F_TERUG ] ?? '' ),
				'prijs'    => isset( $row[ Reiskalender_Fields::F_PRIJS ] ) && '' !== $row[ Reiskalender_Fields::F_PRIJS ] ? (float) $row[ Reiskalender_Fields::F_PRIJS ] : null,
				'status'   => $row[ Reiskalender_Fields::F_STATUS ] ?? 'beschikbaar',
				'plaatsen' => isset( $row[ Reiskalender_Fields::F_PLAATSEN ] ) && '' !== $row[ Reiskalender_Fields::F_PLAATSEN ] ? (int) $row[ Reiskalender_Fields::F_PLAATSEN ] : null,
				'link'     => $row[ Reiskalender_Fields::F_LINK ] ?? '',
			);
		}

		return $rows;
	}

	/**
	 * Fallback zonder ACF-functies: repeaterrijen rechtstreeks uit postmeta.
	 *
	 * @param int $post_id Reis.
	 * @return array<int,array<string,mixed>>
	 */
	protected static function get_rows_from_meta( $post_id ) {
		$count = (int) get_post_meta( $post_id, Reiskalender_Fields::REPEATER, true );
		$rows  = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$prefix = Reiskalender_Fields::REPEATER . '_' . $i . '_';

			$rows[] = array(
				Reiskalender_Fields::F_VERTREK  => get_post_meta( $post_id, $prefix . Reiskalender_Fields::F_VERTREK, true ),
				Reiskalender_Fields::F_TERUG    => get_post_meta( $post_id, $prefix . Reiskalender_Fields::F_TERUG, true ),
				Reiskalender_Fields::F_PRIJS    => get_post_meta( $post_id, $prefix . Reiskalender_Fields::F_PRIJS, true ),
				Reiskalender_Fields::F_STATUS   => get_post_meta( $post_id, $prefix . Reiskalender_Fields::F_STATUS, true ),
				Reiskalender_Fields::F_PLAATSEN => get_post_meta( $post_id, $prefix . Reiskalender_Fields::F_PLAATSEN, true ),
				Reiskalender_Fields::F_LINK     => get_post_meta( $post_id, $prefix . Reiskalender_Fields::F_LINK, true ),
			);
		}

		return $rows;
	}

	/**
	 * Alle vertrekken van alle reizen, plat en op datum gesorteerd.
	 *
	 * @param array<string,mixed> $args Zie defaults.
	 * @return array<int,array<string,mixed>>
	 */
	public static function get_departures( $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'post_types'   => reiskalender_post_types(),
				'post__in'     => array(),
				'van'          => '',      // Ymd of Y-m; leeg = vandaag (of alles bij include_past).
				'tot'          => '',      // Ymd of Y-m.
				'include_past' => false,
				'statussen'    => array(), // Filter op status, leeg = alle.
				'limit'        => 0,       // Max aantal vertrekken, 0 = alles.
			)
		);

		if ( ! $args['post_types'] ) {
			return array();
		}

		$query_args = array(
			'post_type'              => $args['post_types'],
			'post_status'            => 'publish',
			'posts_per_page'         => -1,
			'ignore_sticky_posts'    => true,
			'no_found_rows'          => true,
			'update_post_term_cache' => false,
			'meta_query'             => array(
				array(
					'key'     => Reiskalender_Fields::REPEATER,
					'compare' => 'EXISTS',
				),
			),
		);

		if ( $args['post__in'] ) {
			$query_args['post__in'] = array_map( 'absint', (array) $args['post__in'] );
		}

		$query_args = apply_filters( 'reiskalender/query_args', $query_args, $args );

		$van = self::boundary( $args['van'], 'start' );
		$tot = self::boundary( $args['tot'], 'eind' );

		if ( ! $van && ! $args['include_past'] ) {
			$van = current_time( 'Ymd' );
		}

		$departures = array();

		foreach ( get_posts( $query_args ) as $post ) {
			foreach ( self::get_rows( $post->ID ) as $index => $row ) {
				if ( $van && $row['datum'] < $van ) {
					continue;
				}

				if ( $tot && $row['datum'] > $tot ) {
					continue;
				}

				if ( $args['statussen'] && ! in_array( $row['status'], (array) $args['statussen'], true ) ) {
					continue;
				}

				$timestamp = self::timestamp( $row['datum'] );

				$departures[] = array_merge(
					$row,
					array(
						'post_id'   => $post->ID,
						'titel'     => get_the_title( $post ),
						'permalink' => get_permalink( $post ),
						'thumb_id'  => get_post_thumbnail_id( $post ),
						'excerpt'   => get_the_excerpt( $post ),
						'rij'       => $index,
						'timestamp' => $timestamp,
						'maand'     => gmdate( 'Y-m', $timestamp ),
					)
				);
			}
		}

		usort(
			$departures,
			static function ( $a, $b ) {
				if ( $a['datum'] === $b['datum'] ) {
					return strcasecmp( $a['titel'], $b['titel'] );
				}

				return strcmp( $a['datum'], $b['datum'] );
			}
		);

		if ( $args['limit'] > 0 ) {
			$departures = array_slice( $departures, 0, (int) $args['limit'] );
		}

		return apply_filters( 'reiskalender/departures', $departures, $args );
	}

	/**
	 * Groepeert vertrekken per maand: hier ontstaan de kopjes "januari 2026",
	 * "maart 2026", "oktober 2027" met dezelfde reis in meerdere groepen.
	 *
	 * @param array<int,array<string,mixed>> $departures Vertrekken.
	 * @param int                            $max_maanden Max aantal maandgroepen, 0 = alle.
	 * @return array<string,array<string,mixed>>
	 */
	public static function group_by_month( $departures, $max_maanden = 0 ) {
		$groepen = array();

		foreach ( $departures as $departure ) {
			$key = $departure['maand'];

			if ( ! isset( $groepen[ $key ] ) ) {
				$groepen[ $key ] = array(
					'key'       => $key,
					'timestamp' => self::timestamp( str_replace( '-', '', $key ) . '01' ),
					'label'     => wp_date( 'F Y', $departure['timestamp'] ),
					'items'     => array(),
				);
			}

			$groepen[ $key ]['items'][] = $departure;
		}

		ksort( $groepen );

		if ( $max_maanden > 0 ) {
			$groepen = array_slice( $groepen, 0, (int) $max_maanden, true );
		}

		return $groepen;
	}

	/**
	 * Zet 2026-01, 202601 of 20260115 om naar een harde Ymd-grens.
	 *
	 * @param string $waarde Invoer.
	 * @param string $kant   start|eind.
	 * @return string Ymd of lege string.
	 */
	protected static function boundary( $waarde, $kant = 'start' ) {
		$waarde = preg_replace( '/[^0-9]/', '', (string) $waarde );

		if ( ! $waarde ) {
			return '';
		}

		if ( 8 === strlen( $waarde ) ) {
			return $waarde;
		}

		if ( 6 === strlen( $waarde ) ) {
			if ( 'start' === $kant ) {
				return $waarde . '01';
			}

			$jaar  = (int) substr( $waarde, 0, 4 );
			$maand = (int) substr( $waarde, 4, 2 );

			return $waarde . sprintf( '%02d', (int) gmdate( 't', gmmktime( 0, 0, 0, $maand, 1, $jaar ) ) );
		}

		if ( 4 === strlen( $waarde ) ) {
			return 'start' === $kant ? $waarde . '0101' : $waarde . '1231';
		}

		return '';
	}

	/**
	 * Normaliseert een datum naar Ymd, ongeacht het ACF-returnformaat.
	 *
	 * @param string $waarde Datum.
	 * @return string Ymd of lege string.
	 */
	public static function normalize_date( $waarde ) {
		$waarde = trim( (string) $waarde );

		if ( '' === $waarde ) {
			return '';
		}

		if ( preg_match( '/^\d{8}$/', $waarde ) ) {
			return $waarde;
		}

		foreach ( array( 'Y-m-d', 'd-m-Y', 'd/m/Y', 'Y/m/d', 'Y-m-d H:i:s' ) as $format ) {
			$date = DateTime::createFromFormat( $format, $waarde );

			if ( $date && $date->format( $format ) === $waarde ) {
				return $date->format( 'Ymd' );
			}
		}

		$ts = strtotime( $waarde );

		return $ts ? gmdate( 'Ymd', $ts ) : '';
	}

	/**
	 * Ymd naar timestamp (UTC-middag, zodat tijdzones nooit een dag verschuiven).
	 *
	 * @param string $ymd Datum.
	 * @return int
	 */
	public static function timestamp( $ymd ) {
		return gmmktime(
			12,
			0,
			0,
			(int) substr( $ymd, 4, 2 ),
			(int) substr( $ymd, 6, 2 ),
			(int) substr( $ymd, 0, 4 )
		);
	}
}
