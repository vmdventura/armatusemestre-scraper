import { load } from 'cheerio';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const OUT_FILE = join(DATA_DIR, 'combustibles.json');
const HISTORY_FILE = join(DATA_DIR, 'combustibles-history.json');

const MICM_URL = 'https://micm.gob.do/combustibles';

const FUEL_KEYS = {
  'gasolina premium':  'gasolina_premium',
  'gasolina regular':  'gasolina_regular',
  'gasoil regular':    'gasoil_regular',
  'gasoil optimo':     'gasoil_optimo',
  'gasoil óptimo':     'gasoil_optimo',
  'glp':               'glp',
  'gas licuado':       'glp',
  'kerosene':          'keroseno',
  'keroseno':          'keroseno',
  'avtur':             'avtur',
  'fuel oil':          'fuel_oil',
};

const FUEL_NAMES = {
  gasolina_premium: 'Gasolina Premium',
  gasolina_regular: 'Gasolina Regular',
  gasoil_regular:   'Gasoil Regular',
  gasoil_optimo:    'Gasoil Óptimo',
  glp:              'GLP',
  keroseno:         'Keroseno',
  avtur:            'Avtur',
  fuel_oil:         'Fuel Oil',
};

const GALLON_TO_LITER = 3.785411784;

function parsePrice(str) {
  if (!str) return null;
  const clean = str.replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function matchFuelKey(label) {
  const l = label.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');  // remove accents
  for (const [pattern, key] of Object.entries(FUEL_KEYS)) {
    const p = pattern.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (l.includes(p)) return key;
  }
  return null;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-DO,es;q=0.9,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parsePricesFromHtml(html) {
  const $ = load(html);
  const prices = {};

  // Strategy 1: look for tables
  $('table').each((_, table) => {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td, th')
        .map((_, cell) => $(cell).text().trim())
        .get();

      if (cells.length < 2) return;

      const key = matchFuelKey(cells[0]);
      if (!key) return;

      // Find the first cell that looks like a price (RD$ number)
      for (let i = 1; i < cells.length; i++) {
        if (/[\d,.]+/.test(cells[i])) {
          const price = parsePrice(cells[i]);
          if (price && price > 50 && price < 1000) {
            prices[key] = {
              name: FUEL_NAMES[key],
              price_gal: price,
              price_liter: Math.round((price / GALLON_TO_LITER) * 100) / 100,
              unit: 'RD$/galón',
            };
            break;
          }
        }
      }
    });
  });

  // Strategy 2: look for list items / definition lists if table yielded nothing
  if (Object.keys(prices).length === 0) {
    $('li, dt, dd, p, div').each((_, el) => {
      const text = $(el).text().trim();
      const key = matchFuelKey(text);
      if (!key) return;

      // Try sibling or next element for price
      const next = $(el).next().text().trim();
      const price = parsePrice(next) || parsePrice(text.split(/\s+/).pop());
      if (price && price > 50 && price < 1000) {
        prices[key] = {
          name: FUEL_NAMES[key],
          price_gal: price,
          price_liter: Math.round((price / GALLON_TO_LITER) * 100) / 100,
          unit: 'RD$/galón',
        };
      }
    });
  }

  return prices;
}

function extractWeekRange(html) {
  const $ = load(html);
  const text = $('body').text();
  const months = {
    enero:'01', febrero:'02', marzo:'03', abril:'04',
    mayo:'05', junio:'06', julio:'07', agosto:'08',
    septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12',
  };

  const match = text.toLowerCase().match(
    /(\d{1,2})\s+(?:al|a)\s+(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})/
  );
  if (!match) return null;

  const [, d1, d2, monthName, year] = match;
  const month = months[monthName];
  if (!month) return null;

  return {
    from: `${year}-${month}-${d1.padStart(2, '0')}`,
    to:   `${year}-${month}-${d2.padStart(2, '0')}`,
  };
}

async function appendToHistory(entry) {
  let history = [];
  try {
    const raw = await readFile(HISTORY_FILE, 'utf8');
    history = JSON.parse(raw);
  } catch {
    // file doesn't exist yet
  }

  const weekKey = entry.week?.from;
  if (weekKey && history.some(h => h.week?.from === weekKey)) {
    console.log(`Week ${weekKey} already in history — updating.`);
    history = history.map(h => h.week?.from === weekKey ? entry : h);
  } else {
    history.unshift(entry);
  }

  // Keep last 2 years (~104 weeks)
  history = history.slice(0, 104);
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function main() {
  console.log('Fetching MICM fuel prices...');

  let html;
  try {
    html = await fetchHtml(MICM_URL);
  } catch (err) {
    console.error(`Failed to fetch MICM: ${err.message}`);
    process.exit(1);
  }

  const prices = parsePricesFromHtml(html);
  const week   = extractWeekRange(html);

  if (Object.keys(prices).length === 0) {
    console.error('No prices parsed — page structure may have changed.');
    console.error('HTML snippet:', html.slice(0, 1000));
    process.exit(1);
  }

  const output = {
    updated_at:  new Date().toISOString(),
    source:      'Ministerio de Industria, Comercio y Mipymes (MICM)',
    source_url:  MICM_URL,
    country:     'DO',
    week,
    prices,
  };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(output, null, 2));
  await appendToHistory(output);

  console.log(`✓ ${Object.keys(prices).length} precios guardados`);
  if (week) console.log(`  Semana: ${week.from} → ${week.to}`);
  for (const [k, v] of Object.entries(prices)) {
    console.log(`  ${v.name.padEnd(20)} RD$ ${v.price_gal}/gal`);
  }
}

main();
