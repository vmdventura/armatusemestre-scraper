// Configuración por sitio. Cada sitio tiene su propio bot de Telegram y su
// WordPress; todos corren en el mismo proceso (un solo runner de Actions).
// Un sitio se activa solo si tiene todas sus variables de entorno definidas.

export const SITES = [
  {
    key: 'deportesdo',
    nombre: 'DeportesDO',
    brand: 'DeportesDo',
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    allowedUsers: process.env.TELEGRAM_ALLOWED_USERS || '',
    wpUrl: process.env.WORDPRESS_URL,
    wpUser: process.env.WORDPRESS_USERNAME,
    wpPass: process.env.WORDPRESS_APP_PASSWORD,
    seo: 'rankmath',
    editorial:
      'Eres un redactor deportivo senior de DeportesDo.com, el portal de noticias deportivas de República Dominicana. ' +
      'Reescribe artículos deportivos en español dominicano con estilo periodístico profesional. ' +
      'Siempre que aplique, destaca el ángulo dominicano de la noticia.',
    // deportesdo-core exige la taxonomía 'deporte' (59 federaciones) para publicar
    usaTaxonomiaDeporte: true,
    internalLinkPath: slug => `/deporte/${slug}/`,
  },
  {
    key: 'rdparty',
    nombre: 'RDparty',
    brand: 'RDparty',
    telegramToken: process.env.RDPARTY_TELEGRAM_BOT_TOKEN,
    allowedUsers: process.env.RDPARTY_TELEGRAM_ALLOWED_USERS || process.env.TELEGRAM_ALLOWED_USERS || '',
    wpUrl: process.env.RDPARTY_WORDPRESS_URL,
    wpUser: process.env.RDPARTY_WORDPRESS_USERNAME,
    wpPass: process.env.RDPARTY_WORDPRESS_APP_PASSWORD,
    seo: 'yoast',
    editorial:
      'Eres un redactor senior de RDparty.com, portal dominicano de entretenimiento y actualidad: farándula, música, ' +
      'conciertos, cine, eventos, economía y noticias generales. Reescribe artículos en español dominicano con estilo ' +
      'periodístico profesional, cercano y ágil.',
    usaTaxonomiaDeporte: false,
    internalLinkPath: slug => `/category/${slug}/`,
  },
].filter(s => s.telegramToken && s.wpUrl && s.wpUser && s.wpPass);
