const BASE = "https://app.uasd.edu.do/ProgramacionPorAsignatura/";

const HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
  "Accept": "application/json, text/javascript, */*; q=0.01",
};

const CAMPUS = ["CSA", "CSN", "CSSJ", "CSS"];

const DELAY_MS = 200;

async function apiPost(method, body) {
  const res = await fetch(`${BASE}Default.aspx/${method}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${method}`);
  const json = await res.json();
  // ASP.NET WebMethods envuelve la respuesta en {"d": ...}
  return json.d ?? json;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getAsignaturas(campus) {
  const data = await apiPost("getAsignaturas", { campus, clave: "" });
  // data es un array de strings o de objetos con .Value
  if (!Array.isArray(data)) {
    console.warn(`[uasd] getAsignaturas(${campus}): respuesta inesperada`, data);
    return [];
  }
  return data.map((item) => (typeof item === "string" ? item : item.Value ?? item.Clave ?? String(item)));
}

export async function getSecciones(campus, clave) {
  return apiPost("getData", { campus, clave });
}

export async function scrapeAll({ campuses = CAMPUS, onProgress } = {}) {
  const secciones = [];

  for (const campus of campuses) {
    console.log(`[uasd] Campus ${campus}: obteniendo lista de asignaturas...`);
    let claves;
    try {
      claves = await getAsignaturas(campus);
    } catch (err) {
      console.error(`[uasd] Error en getAsignaturas(${campus}):`, err.message);
      continue;
    }
    console.log(`[uasd] Campus ${campus}: ${claves.length} asignaturas encontradas`);

    for (let i = 0; i < claves.length; i++) {
      const clave = claves[i];
      await sleep(DELAY_MS);
      try {
        const data = await getSecciones(campus, clave);
        const rows = Array.isArray(data) ? data : [];
        for (const row of rows) secciones.push({ ...row, _campus: campus });
        onProgress?.({ campus, clave, index: i, total: claves.length, count: rows.length });
      } catch (err) {
        console.warn(`[uasd] Error en getData(${campus}, ${clave}):`, err.message);
      }
    }
  }

  return secciones;
}
