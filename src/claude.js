import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un redactor deportivo senior de DeportesDo.com, el portal de noticias deportivas de República Dominicana. Reescribe artículos deportivos en español dominicano con estilo periodístico profesional, optimizados para SEO con Rank Math. El objetivo es que cada artículo puntúe 80+ en Rank Math.

Reglas del título:
- Máximo 60 caracteres, DEBE incluir la keyword principal
- Incluye un número cuando sea natural (años, cifras, cantidad de jugadores)
- Incluye una palabra de impacto cuando sea natural (histórico, clave, brilla, sorprende, imperdible, confirmado)

Reglas del contenido (HTML con <p> y <h2>):
- Entre 650 y 800 palabras. NUNCA menos de 650. Expande con contexto: historial del atleta/equipo, cifras, qué significa para el deporte dominicano, próximos pasos.
- Estructura: 2 párrafos intro → <h2> → 2-3 párrafos → <h2> → 2-3 párrafos → <h2>Conclusión</h2> → cierre
- La keyword DEBE aparecer: en el primer párrafo, en al menos un <h2>, y de forma natural ~1 vez cada 150 palabras (densidad ~1%). No la fuerces hasta sonar robótico.
- Párrafos cortos (2-4 oraciones)

Reglas de metadatos:
- Keyword principal: 3-5 palabras, específica de la noticia (no genérica como "béisbol")
- Meta descripción: entre 150 y 158 caracteres, incluye la keyword
- Excerpt: una oración de 20-25 palabras
- Slug: minúsculas, sin acentos, con guiones, y DEBE contener la keyword normalizada (ej: keyword "Futures Game 2026" → slug que incluya "futures-game-2026")
- image_alt: describe la foto en una frase corta que incluya la keyword
- Etiquetas: 3 a 6, específicas (nombres de atletas, equipos, torneos, la liga). Capitalización natural.`;

// deporteSlugs: slugs válidos de la taxonomía 'deporte' del sitio (taxonomy-map).
// Se pasa como enum para que Claude solo pueda elegir un deporte que existe.
function buildArticleTool(deporteSlugs) {
  return {
    name: 'publicar_noticia',
    description: 'Publica la noticia reescrita con SEO en WordPress',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título SEO, máximo 60 caracteres, con la keyword, un número y una palabra de impacto cuando sea natural' },
        html: { type: 'string', description: 'Contenido HTML de 650-800 palabras con etiquetas p y h2; keyword en el primer párrafo y en al menos un h2' },
        focus_keyword: { type: 'string', description: 'Keyword principal para Rank Math, 3-5 palabras específicas de la noticia' },
        meta_description: { type: 'string', description: 'Meta descripción de 150-158 caracteres con la keyword' },
        excerpt: { type: 'string', description: 'Resumen en una oración de 20-25 palabras' },
        slug: { type: 'string', description: 'URL amigable en minúsculas sin acentos; DEBE contener la keyword normalizada' },
        image_alt: { type: 'string', description: 'Texto alternativo de la foto: frase corta que incluye la keyword' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '3 a 6 etiquetas específicas: atletas, equipos, torneos, liga',
        },
        deporte_slug: {
          type: 'string',
          description: 'Deporte/federación del artículo. Elige el slug que mejor corresponda.',
          ...(deporteSlugs?.length ? { enum: deporteSlugs } : {}),
        },
      },
      required: ['title', 'html', 'focus_keyword', 'meta_description', 'excerpt', 'slug', 'image_alt', 'tags', 'deporte_slug'],
    },
  };
}

export async function rewriteArticle({ title, text, sourceUrl, deporteSlugs }) {
  const userMessage = `Reescribe esta noticia deportiva para DeportesDo.com:

TÍTULO ORIGINAL: ${title}
URL FUENTE: ${sourceUrl}

CONTENIDO:
${text}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [buildArticleTool(deporteSlugs)],
    tool_choice: { type: 'tool', name: 'publicar_noticia' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolBlock = response.content.find(b => b.type === 'tool_use' && b.name === 'publicar_noticia');
  if (!toolBlock?.input) throw new Error('Claude no generó la noticia. Intenta de nuevo.');

  return toolBlock.input;
}
