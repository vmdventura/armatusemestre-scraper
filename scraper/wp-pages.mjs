export async function setupWpPages(wpClient, { frontendUrl = "" } = {}) {
  const iframeSrc =
    frontendUrl || "https://vmdventura.github.io/armatusemestre-scraper/";

  const pages = [
    {
      slug: "horarios",
      title: "Horarios UASD",
      content: buildHorariosPage(iframeSrc),
    },
    {
      slug: "sobre-el-proyecto",
      title: "Sobre el Proyecto",
      content: buildAboutPage(),
    },
  ];

  for (const page of pages) {
    try {
      const result = await wpClient.upsertPage(page.slug, page.title, page.content);
      console.log(`[wp-pages] "${page.title}": ${result.action}`);
    } catch (err) {
      console.warn(`[wp-pages] Error en página "${page.title}":`, err.message);
    }
  }
}

function buildHorariosPage(iframeSrc) {
  return `<!-- wp:heading -->
<h2>Consulta los horarios de la UASD</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Busca asignaturas por código, nombre o profesor. Arma tu horario del semestre y detecta conflictos automáticamente.</p>
<!-- /wp:paragraph -->

<!-- wp:html -->
<div style="width:100%;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">
  <iframe
    src="${iframeSrc}"
    width="100%"
    height="720"
    frameborder="0"
    style="display:block;border:none;"
    title="Arma Tu Semestre — Buscador de Horarios UASD"
    loading="lazy">
  </iframe>
</div>
<!-- /wp:html -->

<!-- wp:paragraph -->
<p><small>Los datos se actualizan automáticamente cada día desde el sistema oficial de la UASD.</small></p>
<!-- /wp:paragraph -->`;
}

function buildAboutPage() {
  return `<!-- wp:paragraph -->
<p><strong>Arma Tu Semestre</strong> es una herramienta no oficial que facilita la consulta de horarios y la planificación del semestre en la UASD.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>Funcionalidades</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
  <li>Búsqueda de asignaturas por código, nombre o profesor</li>
  <li>Filtro por campus (Ciudad Universitaria, Norte, San Juan, Santiago)</li>
  <li>Constructor de horario semanal interactivo</li>
  <li>Detección automática de conflictos de horario</li>
  <li>Indicador de cupos disponibles en tiempo real</li>
  <li>Comentarios con verificación de correo institucional (@uasd.edu.do)</li>
</ul>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>Fuente de datos</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Los datos se obtienen automáticamente del sistema de <strong>Programación por Asignatura</strong> de la UASD y se sincronizan diariamente vía GitHub Actions.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><em>Esta herramienta es de carácter informativo. Para matrícula oficial, usa siempre los canales de la UASD.</em></p>
<!-- /wp:paragraph -->`;
}
