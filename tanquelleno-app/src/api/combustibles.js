const REPO_RAW = 'https://raw.githubusercontent.com/vmdventura/armatusemestre-scraper/main/data';

// Fallback seed data (current week) for offline / pre-merge use
const SEED_PRICES = {
  updated_at: '2026-06-23T00:00:00.000Z',
  source: 'Ministerio de Industria, Comercio y Mipymes (MICM)',
  country: 'DO',
  week: { from: '2026-06-16', to: '2026-06-22' },
  prices: {
    gasolina_premium: { name: 'Gasolina Premium', price_gal: 307.40, price_liter: 81.22, unit: 'RD$/galón' },
    gasolina_regular: { name: 'Gasolina Regular', price_gal: 288.60, price_liter: 76.25, unit: 'RD$/galón' },
    gasoil_regular:   { name: 'Gasoil Regular',   price_gal: 230.10, price_liter: 60.79, unit: 'RD$/galón' },
    gasoil_optimo:    { name: 'Gasoil Óptimo',    price_gal: 252.80, price_liter: 66.79, unit: 'RD$/galón' },
    glp:              { name: 'GLP',               price_gal: 154.90, price_liter: 40.92, unit: 'RD$/galón' },
    keroseno:         { name: 'Keroseno',          price_gal: 199.40, price_liter: 52.69, unit: 'RD$/galón' },
    avtur:            { name: 'Avtur',             price_gal: 213.60, price_liter: 56.44, unit: 'RD$/galón' },
  },
};

// Seed history for chart (last 6 months, weekly)
const SEED_HISTORY = [
  { week: { from: '2026-06-16' }, prices: { gasolina_premium: { price_gal: 307.40 }, gasolina_regular: { price_gal: 288.60 }, gasoil_regular: { price_gal: 230.10 }, gasoil_optimo: { price_gal: 252.80 }, glp: { price_gal: 154.90 } } },
  { week: { from: '2026-06-09' }, prices: { gasolina_premium: { price_gal: 304.00 }, gasolina_regular: { price_gal: 286.80 }, gasoil_regular: { price_gal: 232.40 }, gasoil_optimo: { price_gal: 250.10 }, glp: { price_gal: 153.20 } } },
  { week: { from: '2026-06-02' }, prices: { gasolina_premium: { price_gal: 305.80 }, gasolina_regular: { price_gal: 287.50 }, gasoil_regular: { price_gal: 233.10 }, gasoil_optimo: { price_gal: 251.40 }, glp: { price_gal: 153.80 } } },
  { week: { from: '2026-05-26' }, prices: { gasolina_premium: { price_gal: 303.70 }, gasolina_regular: { price_gal: 285.20 }, gasoil_regular: { price_gal: 234.60 }, gasoil_optimo: { price_gal: 249.30 }, glp: { price_gal: 152.50 } } },
  { week: { from: '2026-05-19' }, prices: { gasolina_premium: { price_gal: 306.50 }, gasolina_regular: { price_gal: 287.00 }, gasoil_regular: { price_gal: 235.80 }, gasoil_optimo: { price_gal: 251.90 }, glp: { price_gal: 153.60 } } },
  { week: { from: '2026-05-12' }, prices: { gasolina_premium: { price_gal: 308.90 }, gasolina_regular: { price_gal: 289.40 }, gasoil_regular: { price_gal: 237.20 }, gasoil_optimo: { price_gal: 254.10 }, glp: { price_gal: 155.40 } } },
  { week: { from: '2026-05-05' }, prices: { gasolina_premium: { price_gal: 310.20 }, gasolina_regular: { price_gal: 290.80 }, gasoil_regular: { price_gal: 238.50 }, gasoil_optimo: { price_gal: 255.60 }, glp: { price_gal: 156.20 } } },
  { week: { from: '2026-04-28' }, prices: { gasolina_premium: { price_gal: 309.40 }, gasolina_regular: { price_gal: 290.10 }, gasoil_regular: { price_gal: 237.90 }, gasoil_optimo: { price_gal: 254.80 }, glp: { price_gal: 155.70 } } },
  { week: { from: '2026-04-21' }, prices: { gasolina_premium: { price_gal: 312.50 }, gasolina_regular: { price_gal: 292.60 }, gasoil_regular: { price_gal: 240.20 }, gasoil_optimo: { price_gal: 257.90 }, glp: { price_gal: 157.30 } } },
  { week: { from: '2026-04-14' }, prices: { gasolina_premium: { price_gal: 311.80 }, gasolina_regular: { price_gal: 292.00 }, gasoil_regular: { price_gal: 239.80 }, gasoil_optimo: { price_gal: 257.20 }, glp: { price_gal: 157.00 } } },
  { week: { from: '2026-04-07' }, prices: { gasolina_premium: { price_gal: 308.60 }, gasolina_regular: { price_gal: 289.20 }, gasoil_regular: { price_gal: 237.40 }, gasoil_optimo: { price_gal: 254.50 }, glp: { price_gal: 155.10 } } },
  { week: { from: '2026-03-31' }, prices: { gasolina_premium: { price_gal: 305.30 }, gasolina_regular: { price_gal: 286.40 }, gasoil_regular: { price_gal: 235.10 }, gasoil_optimo: { price_gal: 251.60 }, glp: { price_gal: 153.40 } } },
  { week: { from: '2026-03-24' }, prices: { gasolina_premium: { price_gal: 301.90 }, gasolina_regular: { price_gal: 283.70 }, gasoil_regular: { price_gal: 232.80 }, gasoil_optimo: { price_gal: 248.90 }, glp: { price_gal: 151.80 } } },
  { week: { from: '2026-03-17' }, prices: { gasolina_premium: { price_gal: 298.40 }, gasolina_regular: { price_gal: 280.50 }, gasoil_regular: { price_gal: 230.40 }, gasoil_optimo: { price_gal: 246.10 }, glp: { price_gal: 150.20 } } },
  { week: { from: '2026-02-23' }, prices: { gasolina_premium: { price_gal: 295.80 }, gasolina_regular: { price_gal: 277.90 }, gasoil_regular: { price_gal: 228.10 }, gasoil_optimo: { price_gal: 243.70 }, glp: { price_gal: 148.90 } } },
  { week: { from: '2026-01-26' }, prices: { gasolina_premium: { price_gal: 291.20 }, gasolina_regular: { price_gal: 273.40 }, gasoil_regular: { price_gal: 224.90 }, gasoil_optimo: { price_gal: 240.10 }, glp: { price_gal: 146.50 } } },
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchCurrentPrices() {
  try {
    return await fetchJson(`${REPO_RAW}/combustibles.json`);
  } catch {
    return SEED_PRICES;
  }
}

export async function fetchHistory() {
  try {
    return await fetchJson(`${REPO_RAW}/combustibles-history.json`);
  } catch {
    return SEED_HISTORY;
  }
}

export function formatWeek(week) {
  if (!week?.from || !week?.to) return '';
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const [, fm, fd] = week.from.split('-');
  const [, tm, td] = week.to.split('-');
  const fMonth = months[parseInt(fm, 10) - 1];
  const tMonth = months[parseInt(tm, 10) - 1];
  return fm === tm
    ? `${parseInt(fd,10)} – ${parseInt(td,10)} ${fMonth}`
    : `${parseInt(fd,10)} ${fMonth} – ${parseInt(td,10)} ${tMonth}`;
}

export function priceChange(history, fuelKey) {
  if (!history || history.length < 2) return null;
  const curr = history[0]?.prices?.[fuelKey]?.price_gal;
  const prev = history[1]?.prices?.[fuelKey]?.price_gal;
  if (!curr || !prev) return null;
  return Math.round((curr - prev) * 100) / 100;
}
