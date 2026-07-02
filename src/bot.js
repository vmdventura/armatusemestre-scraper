import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { scrapeArticle } from './scraper.js';
import { rewriteArticle } from './claude.js';
import { uploadImage, createPost, getTaxonomyMap, getCategoryIdBySlug, ensureTags } from './wordpress.js';

function escapeAttr(s = '') {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Inserta la foto (con alt = keyword) tras el primer párrafo, y añade al
// final el enlace a la fuente (externo) y al archivo del deporte (interno).
// Rank Math puntúa: imagen con keyword en alt, enlace externo y enlace interno.
function buildContent({ html, imageAlt, mediaUrl, sourceUrl, deporteNombre, deporteSlug }) {
  let out = html;
  const figure = `<figure class="wp-block-image size-large"><img src="${escapeAttr(mediaUrl)}" alt="${escapeAttr(imageAlt)}"/></figure>`;
  const firstP = out.indexOf('</p>');
  out = firstP >= 0
    ? `${out.slice(0, firstP + 4)}\n${figure}\n${out.slice(firstP + 4)}`
    : `${figure}\n${out}`;

  const host = new URL(sourceUrl).hostname.replace(/^www\./, '');
  const siteUrl = (process.env.WORDPRESS_URL || '').replace(/\/$/, '');
  out += `\n<p><em>Fuente: <a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener">${escapeAttr(host)}</a>. ` +
    `Más noticias de ${escapeAttr(deporteNombre)} en <a href="${siteUrl}/deporte/${escapeAttr(deporteSlug)}/">DeportesDO</a>.</em></p>`;
  return out;
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const ALLOWED_USERS = new Set(
  (process.env.TELEGRAM_ALLOWED_USERS || '').split(',').map(id => id.trim()).filter(Boolean)
);

// In-memory session store: userId → { state, url }
const sessions = new Map();

const URL_REGEX = /https?:\/\/[^\s]+/i;

function isAllowed(ctx) {
  return ALLOWED_USERS.size === 0 || ALLOWED_USERS.has(String(ctx.from.id));
}

function getSession(userId) {
  if (!sessions.has(userId)) sessions.set(userId, { state: 'IDLE', url: null });
  return sessions.get(userId);
}

async function processArticle(ctx, url, photoFileId) {
  const userId = String(ctx.from.id);
  const session = getSession(userId);
  session.state = 'PROCESSING';

  const status = await ctx.reply('Procesando noticia... esto puede tardar unos segundos.');

  try {
    // 1. Scrape article content
    const { title, text, imageUrl } = await scrapeArticle(url);

    // 2. Rewrite with Claude Sonnet — con la lista real de deportes del sitio
    // (deportesdo-core exige la taxonomía 'deporte' para publicar; sin ella → 422)
    const taxonomyMap = await getTaxonomyMap().catch(() => ({}));
    const deporteSlugs = Object.keys(taxonomyMap);
    const article = await rewriteArticle({ title, text, sourceUrl: url, deporteSlugs });
    const deporteId = taxonomyMap[article.deporte_slug]?.id;

    // Categoría nativa de WP con el mismo slug del deporte; si no existe, Multideporte
    const categoryId =
      (await getCategoryIdBySlug(article.deporte_slug).catch(() => null)) ||
      (await getCategoryIdBySlug('multideporte').catch(() => null));

    // 3. Download photo from Telegram
    const fileLink = await ctx.telegram.getFileLink(photoFileId);
    const imgRes = await fetch(fileLink.href);
    if (!imgRes.ok) throw new Error('No se pudo descargar la foto de Telegram.');
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = mimeType.includes('png') ? 'png' : 'jpg';

    // 4. Upload image to WordPress (con alt = keyword para Rank Math)
    const imageAlt = article.image_alt || article.focus_keyword;
    const media = await uploadImage(imgBuffer, `noticia-${Date.now()}.${ext}`, mimeType, imageAlt);

    // 5. Etiquetas: buscar o crear cada una
    const tagIds = await ensureTags(article.tags || []).catch(() => []);

    // 6. Contenido final: foto dentro del artículo + enlaces fuente/interno
    const deporteNombre = taxonomyMap[article.deporte_slug]?.name || article.deporte_slug;
    const finalHtml = buildContent({
      html: article.html,
      imageAlt,
      mediaUrl: media.url,
      sourceUrl: url,
      deporteNombre,
      deporteSlug: article.deporte_slug,
    });

    // 7. Create and publish post
    const { url: postUrl, published } = await createPost({
      ...article,
      html: finalHtml,
      mediaId: media.id,
      deporteId,
      categoryId,
      tagIds,
    });

    await ctx.telegram.deleteMessage(ctx.chat.id, status.message_id).catch(() => {});
    if (published) {
      const tagsInfo = article.tags?.length ? ` · ${article.tags.length} etiquetas` : '';
      await ctx.reply(`Noticia publicada exitosamente (${deporteNombre}${tagsInfo}):\n${postUrl}`);
    } else {
      await ctx.reply(
        `La noticia se guardó como borrador (WordPress rechazó la publicación directa):\n${postUrl}\n\n` +
        `Revísala y publícala desde wp-admin. Si esto pasa siempre, verifica el rol del usuario y que el post tenga deporte e imagen destacada.`
      );
    }
  } catch (err) {
    await ctx.telegram.deleteMessage(ctx.chat.id, status.message_id).catch(() => {});
    await ctx.reply(`Error al procesar la noticia:\n${err.message}`);
  } finally {
    session.state = 'IDLE';
    session.url = null;
  }
}

// Auth middleware
bot.use((ctx, next) => {
  if (!isAllowed(ctx)) return ctx.reply('No autorizado.');
  return next();
});

bot.command('start', ctx => {
  ctx.reply(
    'Bienvenido al bot de noticias de DeportesDo.com.\n\n' +
    'Uso:\n' +
    '1. Envia /noticia [URL] o simplemente pega una URL\n' +
    '2. Luego envia la foto para la noticia\n' +
    '   (o envia la foto con la URL en el caption)\n\n' +
    '/cancelar — cancela la operacion actual'
  );
});

bot.command('cancelar', ctx => {
  const session = getSession(String(ctx.from.id));
  session.state = 'IDLE';
  session.url = null;
  ctx.reply('Operacion cancelada.');
});

bot.command('noticia', ctx => {
  const session = getSession(String(ctx.from.id));
  if (session.state === 'PROCESSING') return ctx.reply('Ya estoy procesando una noticia. Espera un momento.');

  const urlMatch = ctx.message.text.match(URL_REGEX);
  if (!urlMatch) return ctx.reply('Uso: /noticia [URL]\nEjemplo: /noticia https://espn.com/deportes/...');

  session.url = urlMatch[0];
  session.state = 'WAITING_PHOTO';
  ctx.reply('URL guardada. Ahora envia la foto para la noticia.');
});

// Handle plain text messages — detect URLs
bot.on('text', ctx => {
  const session = getSession(String(ctx.from.id));
  if (session.state === 'PROCESSING') return ctx.reply('Ya estoy procesando una noticia. Espera.');

  const urlMatch = ctx.message.text.match(URL_REGEX);
  if (!urlMatch) {
    if (session.state === 'WAITING_PHOTO') return ctx.reply('Envia la foto para continuar, o /cancelar para salir.');
    return;
  }

  session.url = urlMatch[0];
  session.state = 'WAITING_PHOTO';
  ctx.reply('URL guardada. Ahora envia la foto para la noticia.');
});

// Handle photos
bot.on('photo', async ctx => {
  const session = getSession(String(ctx.from.id));
  if (session.state === 'PROCESSING') return ctx.reply('Ya estoy procesando una noticia. Espera.');

  // Photo with URL in caption counts as a single-message submission
  const caption = ctx.message.caption || '';
  const captionUrl = caption.match(URL_REGEX)?.[0];

  const url = captionUrl || session.url;
  if (!url) return ctx.reply('Primero envia la URL del articulo, luego la foto.');

  // Highest resolution photo
  const photos = ctx.message.photo;
  const best = photos[photos.length - 1];

  await processArticle(ctx, url, best.file_id);
});

bot.launch();
console.log('Bot iniciado correctamente.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
