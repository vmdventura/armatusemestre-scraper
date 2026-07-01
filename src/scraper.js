import * as cheerio from 'cheerio';

const TIMEOUT_MS = 10_000;

export async function scrapeArticle(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DeportesDo-Bot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} al acceder a ${url}`);
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, nav, header, footer, aside, .ad, .advertisement, [class*="sidebar"], [id*="sidebar"], [class*="menu"], [class*="related"], [class*="comment"]').remove();

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim();

  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('article img, main img').first().attr('src') ||
    null;

  // Extract main text content
  let textEl = $('article').length ? $('article') :
               $('main').length   ? $('main')    :
               $('[class*="content"], [id*="content"]').first().length
                 ? $('[class*="content"], [id*="content"]').first()
                 : $('body');

  const text = textEl.text().replace(/\s+/g, ' ').trim().slice(0, 8000);

  if (!title || text.length < 100) {
    throw new Error('No se pudo extraer contenido suficiente de la URL proporcionada.');
  }

  return { title, text, imageUrl };
}
