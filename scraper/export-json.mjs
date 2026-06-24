import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { parseHorario } from "./transform.mjs";

export async function exportJson(secciones, outputPath = "docs/data/horarios.json") {
  const processed = secciones
    .map((s) => {
      const clave = (s.Clave ?? s.Asignatura ?? "").trim();
      const seccion = (s.Seccion ?? s.Sección ?? "").trim();
      const campus = (s._campus ?? s.Campus ?? "").trim();
      const horarioRaw = String(s.Horario ?? s.HorarioDesc ?? "").trim();
      const cupo = Number(s.Cupo ?? 0);
      const matriculados = Number(s.Matriculados ?? 0);

      if (!clave) return null;

      return {
        id: `${clave}-${seccion}-${campus}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, ""),
        clave,
        nombre: (s.Nombre ?? s.NombreAsignatura ?? "").trim(),
        seccion,
        profesor: (s.Profesor ?? s.NombreProfesor ?? "").trim(),
        horario_raw: horarioRaw,
        horario: parseHorario(horarioRaw),
        aula: (s.Aula ?? "").trim(),
        campus,
        creditos: Number(s.Creditos ?? s.Créditos ?? 0),
        cupo,
        matriculados,
        disponibles: cupo > 0 ? Math.max(0, cupo - matriculados) : 0,
      };
    })
    .filter(Boolean);

  const data = {
    meta: {
      generated_at: new Date().toISOString(),
      total: processed.length,
      campus: ["CSA", "CSN", "CSSJ", "CSS"],
    },
    secciones: processed,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(data), "utf-8");

  const kb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`[export] Generado: ${outputPath} (${processed.length} secciones, ${kb} KB)`);
}
