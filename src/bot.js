import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { scrapeArticle } from './scraper.js';
import { rewriteArticle } from './claude.js';
import { uploadImage, createPost } from './wordpress.js';

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

    // 2. Rewrite with Claude Sonnet
    const article = await rewriteArticle({ title, text, sourceUrl: url });

    // 3. Download photo from Telegram
    const fileLink = await ctx.telegram.getFileLink(photoFileId);
    const imgRes = await fetch(fileLink.href);
    if (!imgRes.ok) throw new Error('No se pudo descargar la foto de Telegram.');
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = mimeType.includes('png') ? 'png' : 'jpg';

    // 4. Upload image to WordPress
    const mediaId = await uploadImage(imgBuffer, `noticia-${Date.now()}.${ext}`, mimeType);

    // 5. Create and publish post
    const { url: postUrl } = await createPost({ ...article, mediaId });

    await ctx.telegram.deleteMessage(ctx.chat.id, status.message_id).catch(() => {});
    await ctx.reply(`Noticia publicada exitosamente:\n${postUrl}`);
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
