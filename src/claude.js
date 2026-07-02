import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un redactor deportivo senior de DeportesDo.com, el portal de noticias deportivas de República Dominicana. Tu trabajo es reescribir artículos deportivos en español dominicano con estilo periodístico profesional, optimizados para SEO con Rank Math.

Reglas de redacción y SEO que DEBES seguir:
- Título: máximo 60 caracteres, atractivo, incluye la keyword principal
- Contenido: mínimo 400 palabras, escribe con párrafos cortos (3-4 líneas máximo)
- La keyword principal debe aparecer en el primer párrafo y 2-3 veces más en el texto
- Estructura obligatoria: 2 párrafos de introducción → H2 con subtítulo temático → 2-3 párrafos de desarrollo → H2 "Conclusión" → párrafo de cierre
- Meta descripción: exactamente entre 150 y 158 caracteres, incluye keyword, genera curiosidad/deseo de clic
- Excerpt: una sola oración de 20-25 palabras que resuma la noticia
- Slug: URL amigable en minúsculas, sin acentos, palabras separadas por guiones

Devuelve ÚNICAMENTE un objeto JSON válido con este formato exacto, sin texto adicional:
{
  "title": "Título optimizado para SEO",
  "html": "<p>Párrafo intro...</p><p>Segundo párrafo...</p><h2>Subtítulo temático</h2><p>Desarrollo...</p><h2>Conclusión</h2><p>Cierre...</p>",
  "focus_keyword": "keyword principal",
  "meta_description": "Meta descripción de 150-158 caracteres exactos con keyword incluida",
  "excerpt": "Una oración resumen de 20-25 palabras que capture la esencia de la noticia.",
  "slug": "titulo-url-amigable-sin-acentos"
}`;

export async function rewriteArticle({ title, text, sourceUrl }) {
  const userMessage = `Reescribe esta noticia deportiva para DeportesDo.com:

TÍTULO ORIGINAL: ${title}
URL FUENTE: ${sourceUrl}

CONTENIDO:
${text}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = response.content[0].text.trim();

  // Strip markdown code fences if present
  const jsonStr = raw.startsWith('```')
    ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : raw;

  let article;
  try {
    article = JSON.parse(jsonStr);
  } catch {
    throw new Error('Claude no devolvió un JSON válido. Intenta de nuevo.');
  }

  const required = ['title', 'html', 'focus_keyword', 'meta_description', 'excerpt', 'slug'];
  for (const field of required) {
    if (!article[field]) throw new Error(`Falta el campo "${field}" en la respuesta de Claude.`);
  }

  return article;
}
