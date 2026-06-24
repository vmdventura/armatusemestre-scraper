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
    const result = await wpClient.upsertPage(page.slug, page.title, page.content);
    console.log(`[wp-pages] Página "${page.title}": ${result.action}`);
  }
}

function buildHorariosPage(iframeSrc) {
  return `<!-- wp:heading -->
<h2>Consulta los horarios de la UASD</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Busca asignaturas por código, nombre o profesor. Arma tu horario del semestre sin conflictos y verifica la disponibilidad de cupos en tiempo real.</p>
<!-- /wp:paragraph -->

<!-- wp:html -->
<div style="width:100%;min-height:720px;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.10);background:#f8fafc;">
  <iframe
    src="${iframeSrc}"
    width="100%"
    height="720"
    frameborder="0"
    style="display:block;border:none;width:100%;min-height:720px;"
    title="Arma Tu Semestre — Horarios UASD"
    loading="lazy">
  </iframe>
</div>
<!-- /wp:html -->

<!-- wp:paragraph -->
<p><small>Los datos se sincronizan automáticamente cada día desde el sistema oficial de la UASD. Para matrícula oficial usa los canales institucionales.</small></p>
<!-- /wp:paragraph -->`;
}

function buildAboutPage() {
  return `<!-- wp:paragraph -->
<p><strong>Arma Tu Semestre</strong> es una herramienta no oficial para facilitar la consulta de la Programación Docente de la UASD.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>¿Qué puedes hacer?</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list">
  <li>🔍 Buscar asignaturas por código, nombre o profesor</li>
  <li>📍 Filtrar por campus (Ciudad Universitaria, Norte, Santiago, San Juan)</li>
  <li>🗓️ Ver tu horario semanal de forma visual</li>
  <li>⚠️ Detectar conflictos de horario automáticamente</li>
  <li>💺 Ver disponibilidad de cupos en tiempo real</li>
  <li>💬 Comentar y discutir sobre asignaturas con tu correo UASD</li>
  <li>🖨️ Imprimir tu horario armado</li>
</ul>
<!-- /wp:list -->

<!-- wp:heading {"level":3} -->
<h3>Datos y actualización</h3>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Los datos se obtienen automáticamente del sistema <strong>Programación por Asignatura</strong> de la UASD y se actualizan diariamente. Esta herramienta es de carácter informativo.</p>
<!-- /wp:paragraph -->`;
}
