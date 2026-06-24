const DAY_ORDER = ["L", "M", "X", "J", "V", "S", "D"];

export function parseHorario(horarioStr) {
  if (!horarioStr) return null;
  const str = String(horarioStr).trim();
  const match = str.match(/^([LMXJVSDlmxjvsd]+)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
  if (!match) return null;
  const [, daysStr, inicio, fin] = match;
  const dias = [...new Set([...daysStr.toUpperCase()].filter((c) => DAY_ORDER.includes(c)))];
  return { dias, inicio, fin };
}

function buildHtmlContent(s) {
  const clave = s.Clave ?? s.Asignatura ?? "";
  const cupo = Number(s.Cupo ?? 0);
  const matriculados = Number(s.Matriculados ?? 0);
  const disponibles = cupo > 0 ? Math.max(0, cupo - matriculados) : null;

  const rows = [
    ["Asignatura", `${clave} - ${s.Nombre ?? s.NombreAsignatura ?? ""}`],
    ["Sección", s.Seccion ?? s.Sección ?? ""],
    ["Profesor", s.Profesor ?? s.NombreProfesor ?? ""],
    ["Horario", s.Horario ?? s.HorarioDesc ?? ""],
    ["Aula", s.Aula ?? ""],
    ["Campus", s._campus ?? s.Campus ?? ""],
    ["Créditos", s.Creditos ?? s.Créditos ?? ""],
    cupo > 0 ? ["Cupo / Matriculados", `${matriculados} / ${cupo}`] : null,
    disponibles !== null ? ["Disponibles", `${disponibles} cupos`] : null,
  ]
    .filter(Boolean)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `    <tr><th>${k}</th><td>${v}</td></tr>`)
    .join("\n");

  return `<!-- wp:html -->
<div class="uasd-seccion" data-clave="${clave}" data-seccion="${s.Seccion ?? s.Sección ?? ""}">
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
  const profesor = (s.Profesor ?? s.NombreProfesor ?? "").trim();
  const horarioRaw = String(s.Horario ?? s.HorarioDesc ?? "").trim();
  const cupo = Number(s.Cupo ?? 0);
  const matriculados = Number(s.Matriculados ?? 0);

  const slug = `${clave}-sec-${seccion}-${campus}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return {
    title: `${clave} - Sec ${seccion} - ${nombre}`,
    slug,
    status: "publish",
    content: buildHtmlContent(s),
    campus,
    tags: [clave].filter(Boolean),
    meta: {
      asignatura_code: clave,
      asignatura_nombre: nombre,
      seccion,
      profesor,
      horario: horarioRaw,
      aula: String(s.Aula ?? ""),
      campus,
      creditos: String(s.Creditos ?? s.Créditos ?? ""),
      cupo: String(cupo),
      matriculados: String(matriculados),
      disponibles: String(cupo > 0 ? Math.max(0, cupo - matriculados) : 0),
    },
  };
}
