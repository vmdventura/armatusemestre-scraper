const BASE = 'https://app.uasd.edu.do/ProgramacionPorAsignatura/Default.aspx';

const HEADERS = {
  'User-Agent':       'Mozilla/5.0 (compatible; CiudadanoRD/1.0)',
  'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept':           'application/json, text/javascript, */*; q=0.01',
};

export async function getUASD(campus, clave) {
  const resAsig = await fetch(BASE, {
    method: 'POST',
    headers: HEADERS,
    body: new URLSearchParams({ metodo: 'getAsignaturas', campus, clave }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resAsig.ok) throw new Error(`UASD HTTP ${resAsig.status}`);
  const asignaturas = await resAsig.json();

  const datos = await Promise.all(
    (Array.isArray(asignaturas) ? asignaturas : [asignaturas]).slice(0, 10).map(async a => {
      try {
        const r = await fetch(BASE, {
          method: 'POST',
          headers: HEADERS,
          body: new URLSearchParams({ metodo: 'getData', campus, clave: a.clave ?? a.codigo ?? clave }),
          signal: AbortSignal.timeout(8000),
        });
        return { asignatura: a, horarios: r.ok ? await r.json() : [] };
      } catch {
        return { asignatura: a, horarios: [] };
      }
    })
  );

  return { campus, clave, datos };
}
