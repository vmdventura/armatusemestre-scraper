<?php
/**
 * Filtro de comentarios — solo correo institucional UASD
 *
 * INSTALACIÓN (Plan Business de WordPress.com):
 *   1. Plugins → Code Snippets → Add New
 *   2. Pegar este código, activar como "Run snippet everywhere"
 *
 * Para plans Starter / Explorer (sin plugins):
 *   Configuración → Debate → marcar "Mantener comentarios en cola"
 *   y aprobar manualmente solo los correos @uasd.edu.do
 */

// ---- 1. Bloquear comentarios de dominios no institucionales ----
add_filter( 'preprocess_comment', function ( $commentdata ) {
    $email   = strtolower( trim( $commentdata['comment_author_email'] ?? '' ) );
    $allowed = [ '@uasd.edu.do', '@est.uasd.edu.do' ];

    $valid = false;
    foreach ( $allowed as $domain ) {
        if ( str_ends_with( $email, $domain ) ) {
            $valid = true;
            break;
        }
    }

    if ( ! $valid ) {
        wp_die(
            '<p><strong>Comentario no permitido.</strong></p>'
            . '<p>Solo se aceptan comentarios con correo institucional de la UASD '
            . '(<em>@uasd.edu.do</em> o <em>@est.uasd.edu.do</em>).</p>'
            . '<p><a href="javascript:history.back()">← Volver</a></p>',
            'Correo institucional requerido',
            [ 'response' => 403 ]
        );
    }

    return $commentdata;
} );

// ---- 2. Aviso en el formulario de comentarios ----
add_filter( 'comment_form_defaults', function ( $defaults ) {
    $defaults['comment_notes_before'] =
        '<p class="uasd-comment-notice" style="background:#eff6ff;border-left:4px solid #2563eb;padding:8px 12px;border-radius:4px;font-size:13px;margin-bottom:12px;">'
        . '📧 <strong>Nota:</strong> Solo se aceptan comentarios con correo institucional de la UASD '
        . '(<strong>@uasd.edu.do</strong> o <strong>@est.uasd.edu.do</strong>).'
        . '</p>';
    return $defaults;
} );

// ---- 3. Mantener comentarios en cola para moderación ----
// Incluso correos válidos quedan pendientes hasta que el admin los apruebe.
// Eliminar este bloque si prefieres publicación automática.
add_filter( 'pre_comment_approved', function ( $approved, $commentdata ) {
    return 0; // 0 = en espera | 1 = aprobado | 'spam' = spam
}, 10, 2 );
