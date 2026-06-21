<?php
/**
 * Plugin Name: RDparty Cartelera de Cine
 * Plugin URI:  https://rdparty.com
 * Description: Muestra la cartelera de cine de Caribbean Cinemas RD, actualizada automáticamente. Usa el shortcode [cartelera_cine] en cualquier página o post.
 * Version:     1.0.0
 * Author:      RDparty.com
 * License:     GPL-2.0+
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'RDPARTY_CINE_VERSION', '1.0.0' );
define( 'RDPARTY_CINE_URL',     plugin_dir_url( __FILE__ ) );
define( 'RDPARTY_CINE_DIR',     plugin_dir_path( __FILE__ ) );

// ── Shortcode [cartelera_cine] ────────────────────────────────────────────────
add_shortcode( 'cartelera_cine', 'rdparty_cine_shortcode' );

function rdparty_cine_shortcode( $atts ) {
    $atts = shortcode_atts( [
        'pais'   => 'DO',
        'altura' => 'auto',
    ], $atts, 'cartelera_cine' );

    wp_enqueue_style(  'rdparty-cine', RDPARTY_CINE_URL . 'assets/cartelera.css', [], RDPARTY_CINE_VERSION );
    wp_enqueue_script( 'rdparty-cine', RDPARTY_CINE_URL . 'assets/cartelera.js',  [], RDPARTY_CINE_VERSION, true );

    ob_start(); ?>
    <div id="rdparty-cartelera"
         data-pais="<?php echo esc_attr( $atts['pais'] ); ?>"
         style="min-height:200px">
    </div>
    <?php
    return ob_get_clean();
}

// ── Bloque Gutenberg (opcional) ───────────────────────────────────────────────
add_action( 'init', 'rdparty_cine_register_block' );

function rdparty_cine_register_block() {
    if ( ! function_exists( 'register_block_type' ) ) return;

    register_block_type( 'rdparty/cartelera-cine', [
        'editor_script'   => 'rdparty-cine-block',
        'render_callback' => 'rdparty_cine_shortcode',
        'attributes'      => [
            'pais' => [ 'type' => 'string', 'default' => 'DO' ],
        ],
    ] );
}

// ── Crear página al activar el plugin ────────────────────────────────────────
register_activation_hook( __FILE__, 'rdparty_cine_activar' );

function rdparty_cine_activar() {
    // Solo crear si no existe ya
    $existe = get_posts( [
        'post_type'      => 'page',
        'post_status'    => 'any',
        'posts_per_page' => 1,
        'meta_key'       => '_rdparty_cine_page',
        'meta_value'     => '1',
    ] );

    if ( ! empty( $existe ) ) return;

    $page_id = wp_insert_post( [
        'post_title'   => 'Cartelera de Cine',
        'post_name'    => 'cartelera-de-cine',
        'post_content' => '<!-- wp:shortcode -->[cartelera_cine]<!-- /wp:shortcode -->',
        'post_status'  => 'draft',
        'post_type'    => 'page',
        'post_author'  => 1,
    ] );

    if ( $page_id && ! is_wp_error( $page_id ) ) {
        update_post_meta( $page_id, '_rdparty_cine_page', '1' );
        update_option( 'rdparty_cine_page_id', $page_id );
    }
}

// ── Aviso en el admin tras activar ───────────────────────────────────────────
add_action( 'admin_notices', 'rdparty_cine_admin_notice' );

function rdparty_cine_admin_notice() {
    $page_id = get_option( 'rdparty_cine_page_id' );
    if ( ! $page_id ) return;

    $screen = get_current_screen();
    if ( $screen && $screen->id !== 'plugins' ) return;

    $edit_url    = admin_url( 'post.php?post=' . $page_id . '&action=edit' );
    $preview_url = get_preview_post_link( $page_id );

    echo '<div class="notice notice-success is-dismissible">
        <p><strong>🎬 RDparty Cartelera de Cine</strong> está activo.
        Se creó la página <em>Cartelera de Cine</em> como borrador.
        <a href="' . esc_url( $edit_url ) . '">Editar y publicar</a> |
        <a href="' . esc_url( $preview_url ) . '" target="_blank">Vista previa</a></p>
    </div>';
}

// ── Menú de ajustes ───────────────────────────────────────────────────────────
add_action( 'admin_menu', 'rdparty_cine_menu' );

function rdparty_cine_menu() {
    add_options_page(
        'Cartelera de Cine',
        '🎬 Cartelera Cine',
        'manage_options',
        'rdparty-cartelera',
        'rdparty_cine_settings_page'
    );
}

function rdparty_cine_settings_page() {
    $page_id = get_option( 'rdparty_cine_page_id' );
    ?>
    <div class="wrap">
        <h1>🎬 RDparty Cartelera de Cine</h1>
        <p>Muestra la cartelera de <strong>Caribbean Cinemas RD</strong>, actualizada automáticamente desde GitHub.</p>

        <table class="form-table">
            <tr>
                <th>Shortcode</th>
                <td><code>[cartelera_cine]</code> — Pégalo en cualquier página o post</td>
            </tr>
            <tr>
                <th>Fuente de datos</th>
                <td>
                    <a href="https://raw.githubusercontent.com/vmdventura/armatusemestre-scraper/main/data/billboard.json" target="_blank">
                        billboard.json en GitHub
                    </a><br>
                    <small>Se actualiza automáticamente 3 veces al día (2AM, 8AM, 3PM hora RD)</small>
                </td>
            </tr>
            <?php if ( $page_id ) : ?>
            <tr>
                <th>Página creada</th>
                <td>
                    <a href="<?php echo esc_url( admin_url( 'post.php?post=' . $page_id . '&action=edit' ) ); ?>">
                        Editar "Cartelera de Cine"
                    </a>
                    &nbsp;|&nbsp;
                    <a href="<?php echo esc_url( get_permalink( $page_id ) ); ?>" target="_blank">
                        Ver página
                    </a>
                </td>
            </tr>
            <?php endif; ?>
        </table>

        <hr>
        <h2>Uso avanzado</h2>
        <p>Puedes usar el shortcode con atributos adicionales:</p>
        <code>[cartelera_cine pais="DO"]</code>
    </div>
    <?php
}
