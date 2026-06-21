#!/usr/bin/env node
/**
 * Scraper de cartelera para Caribbean Cinemas República Dominicana
 * Extrae películas en cartelera y las guarda en data/billboard.json
 *
 * Uso:
 *   node scrapers/caribbean-cinemas.mjs              # scraping normal
 *   node scrapers/caribbean-cinemas.mjs --discover   # modo descubrimiento (guarda HTML/screenshot)
 *   DEBUG=1 node scrapers/caribbean-cinemas.mjs      # igual que --discover
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../data/billboard.json');

const DISCOVER_MODE = process.argv.includes('--discover') || !!process.env.DEBUG;

// URLs a intentar para la cartelera de RD
const CANDIDATE_URLS = [
  'https://caribbeancinemas.com/rd/now-showing',
  'https://caribbeancinemas.com/now-showing',
  'https://caribbeancinemas.com/en/movies',
  'https://caribbeancinemas.com/es/movies',
  'https://caribbeancinemas.com',
];

// Selectores CSS probables para tarjetas de película (en orden de prioridad)
const MOVIE_CARD_SELECTORS = [
  '[class*="MovieCard"]',
  '[class*="movie-card"]',
  '[class*="film-card"]',
  '[class*="movie_card"]',
  '[data-movie-id]',
  '[data-film-id]',
  '.now-showing .movie',
  '.now-showing-movie',
  '.movie-item',
  '.film-item',
  'article[class*="movie"]',
  'article[class*="film"]',
  '.swiper-slide article',
  '.carousel-item article',
];

// Selectores para el título dentro de una tarjeta
const TITLE_SELECTORS = [
  '[class*="MovieTitle"]',
  '[class*="movie-title"]',
  '[class*="film-title"]',
  'h2',
  'h3',
  'h4',
  '[class*="Title"]',
  '[class*="title"]',
  'figcaption',
];

async function main() {
  log('🎬 Scraper Caribbean Cinemas RD iniciado');
  log(`📅 ${new Date().toISOString()}`);
  if (DISCOVER_MODE) log('🔍 MODO DESCUBRIMIENTO activado');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
  });

  // Interceptar respuestas JSON que puedan contener datos de películas
  const capturedApis = [];
  context.on('response', async (response) => {
    try {
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('application/json')) return;
      if (response.status() !== 200) return;

      const body = await response.json();
      const str = JSON.stringify(body).toLowerCase();

      if (
        str.includes('movie') || str.includes('film') || str.includes('pelicula') ||
        str.includes('showtime') || str.includes('schedule') || str.includes('cartelera') ||
        str.includes('poster') || str.includes('synopsis')
      ) {
        log(`📡 API JSON detectada: ${response.url()}`);
        capturedApis.push({ url: response.url(), data: body });
      }
    } catch {}
  });

  const page = await context.newPage();
  let movies = [];

  try {
    // Intentar URLs candidatas hasta que una responda con contenido
    const targetUrl = await findWorkingUrl(page);
    if (!targetUrl) {
      throw new Error('No se pudo cargar ninguna URL de Caribbean Cinemas');
    }

    log(`🌐 URL activa: ${targetUrl}`);

    // Esperar que el contenido principal cargue
    await waitForContent(page);

    if (DISCOVER_MODE) {
      await saveDebugFiles(page, targetUrl);
    }

    // ESTRATEGIA 1: Usar datos de API JSON capturados (más confiable)
    if (capturedApis.length > 0) {
      log(`✅ Usando ${capturedApis.length} endpoint(s) de API`);
      movies = parseApiResponses(capturedApis);
    }

    // ESTRATEGIA 2: Parsear HTML con selectores CSS
    if (movies.length === 0) {
      log('🔍 Parseando HTML con selectores CSS...');
      movies = await extractFromHtml(page);
    }

    // ESTRATEGIA 3: Detección automática por patrones visuales
    if (movies.length === 0) {
      log('🤖 Detección automática por patrones visuales...');
      movies = await autoDetect(page);
    }

    if (movies.length === 0) {
      log('⚠️  No se encontraron películas.');
      if (!DISCOVER_MODE) {
        log('   Ejecuta con --discover para guardar el HTML y screenshot para depuración.');
      }
      await dumpPageInfo(page);
      process.exit(1);
    }

    log(`🎞  ${movies.length} película(s) encontrada(s)`);

    // Si estamos en modo descubrimiento, mostrar muestra de datos
    if (DISCOVER_MODE) {
      log('\n📊 Muestra de datos extraídos:');
      console.log(JSON.stringify(movies.slice(0, 2), null, 2));
    }

    // Intentar obtener horarios por teatro para cada película
    log('🏛  Obteniendo horarios por teatro...');
    movies = await enrichWithShowtimes(page, movies, context);

  } finally {
    await browser.close();
  }

  // Guardar resultado
  const billboard = buildBillboard(movies);
  await saveBillboard(billboard);
  log(`\n✅ Cartelera guardada: ${OUTPUT_FILE}`);
}

// ─── Navegación ───────────────────────────────────────────────────────────────

async function findWorkingUrl(page) {
  for (const url of CANDIDATE_URLS) {
    try {
      log(`  Probando ${url}...`);
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      if (response && response.status() < 400) {
        return url;
      }
    } catch (e) {
      log(`  ✗ ${url}: ${e.message.substring(0, 60)}`);
    }
  }
  return null;
}

async function waitForContent(page) {
  // Esperar que desaparezcan spinners de carga comunes
  try {
    await page.waitForFunction(() => {
      const loaders = document.querySelectorAll(
        '[class*="loading"], [class*="spinner"], [class*="skeleton"]'
      );
      return loaders.length === 0 || Array.from(loaders).every(el => {
        const style = getComputedStyle(el);
        return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
      });
    }, { timeout: 10000 });
  } catch {}

  // Espera adicional para renderizado de JS
  await page.waitForTimeout(2500);

  // Scroll para activar lazy loading
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

// ─── Extracción de películas ───────────────────────────────────────────────────

async function extractFromHtml(page) {
  for (const selector of MOVIE_CARD_SELECTORS) {
    const count = await page.locator(selector).count();
    if (count >= 1) {
      log(`  Selector activo: "${selector}" (${count} elementos)`);
      return await extractCards(page, selector);
    }
  }
  return [];
}

async function extractCards(page, selector) {
  const cards = page.locator(selector);
  const count = await cards.count();
  const movies = [];

  for (let i = 0; i < count; i++) {
    try {
      const card = cards.nth(i);
      const movie = await extractCardData(card);
      if (movie.title) movies.push(movie);
    } catch (e) {
      log(`  ⚠️  Error en tarjeta ${i}: ${e.message}`);
    }
  }
  return movies;
}

async function extractCardData(card) {
  // Título
  let title = null;
  for (const sel of TITLE_SELECTORS) {
    try {
      const el = card.locator(sel).first();
      if (await el.count() > 0) {
        title = (await el.textContent())?.trim();
        if (title && title.length > 1) break;
      }
    } catch {}
  }

  // Imagen / poster
  let poster = null;
  try {
    const img = card.locator('img').first();
    if (await img.count() > 0) {
      poster =
        await img.getAttribute('src') ||
        await img.getAttribute('data-src') ||
        await img.getAttribute('data-lazy') ||
        await img.getAttribute('data-original');
      // Convertir URL relativa a absoluta
      if (poster && poster.startsWith('/')) {
        poster = `https://caribbeancinemas.com${poster}`;
      }
    }
  } catch {}

  // Link a la página de la película
  let link = null;
  try {
    const a = card.locator('a').first();
    if (await a.count() > 0) {
      link = await a.getAttribute('href');
      if (link && link.startsWith('/')) {
        link = `https://caribbeancinemas.com${link}`;
      }
    }
  } catch {}

  // Clasificación / rating
  let rating = null;
  try {
    const el = card.locator('[class*="rating"],[class*="Rating"],[class*="classification"],[class*="mpaa"]').first();
    if (await el.count() > 0) {
      rating = (await el.textContent())?.trim();
    }
  } catch {}

  // Formatos (3D, IMAX, 4DX, etc.)
  const formats = [];
  try {
    const badges = card.locator('[class*="format"],[class*="badge"],[class*="tag"],[class*="label"]');
    const cnt = await badges.count();
    for (let i = 0; i < cnt; i++) {
      const txt = (await badges.nth(i).textContent())?.trim().toUpperCase();
      if (txt && /^(2D|3D|IMAX|4DX|SCREENX|MX4D|PREMIUM|DOLBY|ATMOS|VIP)$/.test(txt)) {
        formats.push(txt);
      }
    }
  } catch {}

  return { title, poster, link, rating, formats, theaters: [] };
}

async function autoDetect(page) {
  return page.evaluate(() => {
    const movies = [];
    const seen = new Set();

    // Buscar imágenes con proporciones de poster (más altas que anchas)
    document.querySelectorAll('img').forEach(img => {
      const rect = img.getBoundingClientRect();
      const ratio = rect.height / rect.width;
      if (rect.height < 100 || ratio < 0.9) return;

      let container = img.parentElement;
      for (let depth = 0; depth < 6; depth++) {
        if (!container) break;
        const titleEl = container.querySelector(
          'h1,h2,h3,h4,h5,[class*="title"],[class*="name"],[class*="Title"]'
        );
        if (titleEl) {
          const title = titleEl.textContent?.trim();
          if (title && !seen.has(title)) {
            seen.add(title);
            movies.push({
              title,
              poster: img.src || img.dataset?.src || null,
              link: container.querySelector('a')?.href || null,
              rating: null,
              formats: [],
              theaters: [],
            });
          }
          break;
        }
        container = container.parentElement;
      }
    });

    return movies;
  });
}

// ─── Enriquecimiento con horarios ──────────────────────────────────────────────

async function enrichWithShowtimes(page, movies, context) {
  const enriched = [];

  for (const movie of movies) {
    if (!movie.link) {
      enriched.push(movie);
      continue;
    }

    try {
      const detailPage = await context.newPage();
      const showtimeApis = [];

      detailPage.on('response', async (res) => {
        try {
          const ct = res.headers()['content-type'] || '';
          if (!ct.includes('application/json')) return;
          if (res.status() !== 200) return;
          const body = await res.json();
          const str = JSON.stringify(body).toLowerCase();
          if (str.includes('showtime') || str.includes('schedule') || str.includes('session')) {
            showtimeApis.push({ url: res.url(), data: body });
          }
        } catch {}
      });

      await detailPage.goto(movie.link, { waitUntil: 'networkidle', timeout: 20000 });
      await detailPage.waitForTimeout(2000);

      // Enriquecer con datos del detalle (synopsis, rating, duration)
      const extra = await detailPage.evaluate(() => {
        const getText = (selectors) => {
          for (const s of selectors) {
            const el = document.querySelector(s);
            if (el?.textContent?.trim()) return el.textContent.trim();
          }
          return null;
        };

        return {
          synopsis: getText([
            '[class*="synopsis"]', '[class*="description"]', '[class*="overview"]',
            '[class*="sinopsis"]', 'p.lead', '.movie-desc p', '.film-desc p',
          ]),
          duration: getText([
            '[class*="duration"]', '[class*="runtime"]', '[class*="length"]',
            '[class*="minutos"]', '[class*="minutes"]',
          ]),
          rating: getText([
            '[class*="mpaa"]', '[class*="classification"]', '[class*="rating"]',
            '[class*="clasificacion"]',
          ]),
        };
      });

      // Extraer horarios del HTML
      const theaters = await extractShowtimesFromPage(detailPage);

      // Si encontramos APIs de horarios, usarlas en lugar del HTML
      if (showtimeApis.length > 0) {
        const apiTheaters = parseShowtimeApis(showtimeApis);
        if (apiTheaters.length > 0) {
          movie.theaters = apiTheaters;
        } else {
          movie.theaters = theaters;
        }
      } else {
        movie.theaters = theaters;
      }

      // Fusionar datos extra
      if (!movie.synopsis && extra.synopsis) movie.synopsis = extra.synopsis;
      if (!movie.duration && extra.duration) movie.duration = parseDuration(extra.duration);
      if (!movie.rating && extra.rating) movie.rating = extra.rating;

      await detailPage.close();
    } catch (e) {
      log(`  ⚠️  No se pudieron obtener horarios de: ${movie.title} (${e.message})`);
    }

    enriched.push(movie);
  }

  return enriched;
}

async function extractShowtimesFromPage(page) {
  return page.evaluate(() => {
    const theaters = [];

    // Buscar secciones de teatro/cine
    const theaterSections = document.querySelectorAll(
      '[class*="theater"],[class*="cinema"],[class*="location"],[class*="venue"]'
    );

    theaterSections.forEach(section => {
      const nameEl = section.querySelector(
        'h2,h3,h4,[class*="name"],[class*="title"],[class*="theater-name"]'
      );
      const name = nameEl?.textContent?.trim();
      if (!name) return;

      const showtimes = [];
      const timeEls = section.querySelectorAll(
        '[class*="time"],[class*="showtime"],[class*="horario"],[class*="schedule"] a,' +
        'a[class*="time"],button[class*="time"]'
      );

      const times = Array.from(timeEls)
        .map(el => el.textContent?.trim())
        .filter(t => t && /\d{1,2}:\d{2}/.test(t));

      if (times.length > 0) {
        showtimes.push({
          date: new Date().toISOString().split('T')[0],
          format: '2D',
          language: 'Español',
          times,
        });
      }

      if (name) {
        theaters.push({
          name,
          location: null,
          showtimes,
        });
      }
    });

    return theaters;
  });
}

// ─── Parseo de APIs ───────────────────────────────────────────────────────────

function parseApiResponses(apis) {
  const movies = [];
  const seen = new Set();

  for (const { url, data } of apis) {
    const items = Array.isArray(data)
      ? data
      : data.movies || data.films || data.data?.movies || data.results || data.items || [];

    if (!Array.isArray(items)) continue;

    log(`  API: ${url} → ${items.length} item(s)`);

    for (const item of items) {
      const movie = normalizeMovie(item);
      if (movie.title && !seen.has(movie.title)) {
        seen.add(movie.title);
        movies.push(movie);
      }
    }
  }

  return movies;
}

function parseShowtimeApis(apis) {
  for (const { data } of apis) {
    const theaters = data.theaters || data.cinemas || data.locations || data.venues || [];
    if (Array.isArray(theaters) && theaters.length > 0) {
      return theaters.map(t => ({
        id: t.id || t.cinema_id || t.theaterId || null,
        name: t.name || t.cinema_name || t.theaterName || null,
        location: t.location || t.city || t.address || null,
        showtimes: normalizeShowtimes(
          t.showtimes || t.sessions || t.schedule || t.screenings || []
        ),
      }));
    }
  }
  return [];
}

function normalizeMovie(item) {
  return {
    title: item.title || item.name || item.movieTitle || item.filmName || item.movie_title || null,
    title_es: item.title_es || item.titulo || item.spanish_title || null,
    synopsis: item.synopsis || item.description || item.overview || item.sinopsis || item.plot || null,
    duration: parseDuration(item.duration || item.runtime || item.length || item.minutes),
    rating: item.rating || item.classification || item.mpaa_rating || item.mpaa || null,
    genres: asArray(item.genres || item.categories || item.genre),
    language: item.language || item.idioma || 'Español',
    poster: item.poster || item.poster_url || item.image || item.posterUrl || item.image_url || null,
    trailer: item.trailer || item.trailer_url || item.trailerUrl || item.youtube_url || null,
    formats: asArray(item.formats || item.screening_types || item.available_formats),
    theaters: normalizeTheaters(
      item.theaters || item.cinemas || item.locations || item.screenings || []
    ),
    opening_date: item.opening_date || item.release_date || item.releaseDate || item.estreno || null,
    is_now_showing: item.is_now_showing ?? item.nowShowing ?? item.now_showing ?? true,
    is_coming_soon: item.is_coming_soon ?? item.comingSoon ?? item.coming_soon ?? false,
  };
}

function normalizeTheaters(list) {
  if (!Array.isArray(list)) return [];
  return list.map(t => ({
    id: t.id || t.cinema_id || t.theaterId || null,
    name: t.name || t.cinema_name || t.theaterName || null,
    location: t.location || t.city || t.address || null,
    showtimes: normalizeShowtimes(t.showtimes || t.sessions || t.schedule || []),
  }));
}

function normalizeShowtimes(list) {
  if (!Array.isArray(list)) return [];
  return list.map(s => ({
    date: s.date || s.show_date || s.showDate || null,
    format: (s.format || s.type || s.screening_type || s.screeningType || '2D').toUpperCase(),
    language: s.language || s.dubbed || 'Español',
    times: asArray(s.times || s.time || s.start_time || s.startTime)
      .map(t => (typeof t === 'string' ? t : String(t)).trim())
      .filter(Boolean),
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [value];
}

function parseDuration(value) {
  if (!value) return null;
  if (typeof value === 'number') return value;
  const match = String(value).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function buildBillboard(movies) {
  return {
    updated_at: new Date().toISOString(),
    source: 'caribbeancinemas.com',
    country: 'DO',
    total: movies.length,
    movies,
  };
}

async function saveBillboard(billboard) {
  // Nunca sobreescribir con datos vacíos
  if (billboard.total === 0) {
    log('⚠️  Cartelera vacía — no se guardaron cambios para proteger datos anteriores');
    process.exit(1);
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(billboard, null, 2), 'utf-8');
}

async function saveDebugFiles(page, url) {
  log('💾 Guardando archivos de debug...');
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  const html = await page.content();
  await fs.writeFile('debug-page.html', html, 'utf-8');
  log('   → debug-screenshot.png');
  log('   → debug-page.html');
}

async function dumpPageInfo(page) {
  const info = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyClasses: document.body.className.substring(0, 200),
    h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim()).slice(0, 5),
    h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()).slice(0, 10),
    imageCount: document.querySelectorAll('img').length,
    linkCount: document.querySelectorAll('a').length,
  }));
  log('\n📊 Info de la página:');
  console.log(JSON.stringify(info, null, 2));
}

function log(msg) {
  console.log(msg);
}

main().catch(err => {
  console.error('\n💥 Error fatal:', err.message);
  if (DISCOVER_MODE) console.error(err.stack);
  process.exit(1);
});
