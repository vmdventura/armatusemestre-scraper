function buildHtmlContent(s) {
  const rows = [
    ["Asignatura", `${s.Clave ?? s.Asignatura ?? ""} - ${s.Nombre ?? s.NombreAsignatura ?? ""}`],
    ["Sección", s.Seccion ?? s.Sección ?? ""],
    ["Profesor", s.Profesor ?? s.NombreProfesor ?? ""],
    ["Horario", s.Horario ?? s.HorarioDesc ?? ""],
    ["Aula", s.Aula ?? ""],
    ["Campus", s._campus ?? s.Campus ?? ""],
    ["Créditos", s.Creditos ?? s.Créditos ?? ""],
    ["Cupo", s.Cupo ?? ""],
    ["Matriculados", s.Matriculados ?? ""],
  ]
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `    <tr><th>${k}</th><td>${v}</td></tr>`)
    .join("\n");

  return `<!-- wp:html -->
<div class="uasd-seccion">
  <table class="uasd-horario-table">
${rows}
  </table>
</div>
<!-- /wp:html -->`;
}

export function toWpPost(s) {
  const clave = (s.Clave ?? s.Asignatura ?? "").trim();
  const seccion = (s.Seccion ?? s.Sección ?? "").trim();
  const campus = (s._campus ?? s.Campus ?? "").trim().toUpperCase();
  const nombre = (s.Nombre ?? s.NombreAsignatura ?? "").trim();

  const slug = `${clave}-sec-${seccion}-${campus}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return {
    title: `${clave} - Sec ${seccion} - ${nombre}`,
    slug,
    status: "publish",
    content: buildHtmlContent(s),
    campus,
    tags: [clave, nombre].filter(Boolean),
    meta: {
      asignatura_code: clave,
      asignatura_nombre: nombre,
      seccion,
      profesor: String(s.Profesor ?? s.NombreProfesor ?? ""),
      horario: String(s.Horario ?? s.HorarioDesc ?? ""),
      aula: String(s.Aula ?? ""),
      campus,
      creditos: String(s.Creditos ?? s.Créditos ?? ""),
      cupo: String(s.Cupo ?? ""),
      matriculados: String(s.Matriculados ?? ""),
    },
  };
}
