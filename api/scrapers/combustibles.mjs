// Precios vigentes semana 20-26 junio 2025 (fuente: MICM)
// Se actualiza cada viernes. El scraper intenta el sitio oficial primero.
const PRECIOS_CACHE = {
  semana: '20–26 jun 2025',
  fuente: 'MICM — Ministerio de Industria, Comercio y MiPymes',
  precios: [
    { nombre: 'Gasolina Premium',  tipo: 'premium',    precio: 293.10, cambio: +2.30, color: '#E53935' },
    { nombre: 'Gasolina Regular',  tipo: 'regular',    precio: 274.50, cambio: +1.80, color: '#FB8C00' },
    { nombre: 'Gasoil Óptimo',     tipo: 'diesel_opt', precio: 236.80, cambio: -0.50, color: '#1565C0' },
    { nombre: 'Gasoil Regular',    tipo: 'diesel_reg', precio: 221.60, cambio: -1.10, color: '#546E7A' },
    { nombre: 'Gas Natural (GLP)', tipo: 'glp',        precio: 130.40, cambio:  0.00, color: '#00897B' },
    { nombre: 'Kerosene',          tipo: 'kerosene',   precio: 197.20, cambio: +0.80, color: '#7B1FA2' },
    { nombre: 'Fuel Oil',          tipo: 'fuel_oil',   precio: 159.40, cambio: -2.10, color: '#4E342E' },
    { nombre: 'Avtur',             tipo: 'avtur',      precio: 278.50, cambio: +1.40, color: '#37474F' },
  ],
};

export async function getCombustibles() {
  try {
    const res = await fetch('https://micm.gob.do/combustibles', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CiudadanoRD/1.0; +https://github.com/vmdventura/armatusemestre-scraper)' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const parsed = parseMicm(html);
    if (parsed) return parsed;
  } catch {
    // Sitio no disponible o formato cambió → usar caché
  }
  return PRECIOS_CACHE;
}

function parseMicm(html) {
  // Busca patrones como "293.10" precedidos por nombre de combustible
  // MICM usa tablas HTML — extrae pares (nombre, precio)
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const results = [];
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(([, c]) => c.replace(/<[^>]+>/g, '').trim());
    if (cells.length >= 2) {
      const price = parseFloat(cells[cells.length - 1].replace(',', '.'));
      if (!isNaN(price) && price > 50 && price < 500) {
        results.push({ nombre: cells[0], precio: price });
      }
    }
  }
  if (results.length < 3) return null;

  return {
    semana: 'Actual',
    fuente: 'MICM (scrapeado)',
    precios: results.map((r, i) => ({
      ...r,
      tipo: PRECIOS_CACHE.precios[i]?.tipo ?? 'otro',
      cambio: 0,
      color: PRECIOS_CACHE.precios[i]?.color ?? '#607D8B',
    })),
  };
}
