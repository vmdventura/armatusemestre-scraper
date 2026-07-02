import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un redactor deportivo senior de DeportesDo.com, el portal de noticias deportivas de República Dominicana. Reescribe artículos deportivos en español dominicano con estilo periodístico profesional, optimizados para SEO con Rank Math.

Reglas:
- Título: máximo 60 caracteres, incluye la keyword principal
- Contenido HTML: mínimo 400 palabras, párrafos cortos
- Estructura: 2 párrafos intro → <h2>subtítulo</h2> → 2-3 párrafos → <h2>Conclusión</h2> → cierre
- Keyword en el primer párrafo y 2-3 veces más
- Meta descripción: entre 150 y 158 caracteres, incluye keyword
- Excerpt: una oración de 20-25 palabras
- Slug: minúsculas, sin acentos, guiones`;

const ARTICLE_TOOL = {
  name: 'publicar_noticia',
  description: 'Publica la noticia reescrita con SEO en WordPress',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Título SEO, máximo 60 caracteres' },
      html: { type: 'string', description: 'Contenido HTML completo con etiquetas p y h2' },
      focus_keyword: { type: 'string', description: 'Keyword principal para Rank Math' },
      meta_description: { type: 'string', description: 'Meta descripción de 150-158 caracteres' },
      excerpt: { type: 'string', description: 'Resumen en una oración de 20-25 palabras' },
      slug: { type: 'string', description: 'URL amigable en minúsculas sin acentos' },
    },
    required: ['title', 'html', 'focus_keyword', 'meta_description', 'excerpt', 'slug'],
  },
};

export async function rewriteArticle({ title, text, sourceUrl }) {
  const userMessage = `Reescribe esta noticia deportiva para DeportesDo.com:

TÍTULO ORIGINAL: ${title}
URL FUENTE: ${sourceUrl}

CONTENIDO:
${text}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [ARTICLE_TOOL],
    tool_choice: { type: 'tool', name: 'publicar_noticia' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const toolBlock = response.content.find(b => b.type === 'tool_use' && b.name === 'publicar_noticia');
  if (!toolBlock?.input) throw new Error('Claude no generó la noticia. Intenta de nuevo.');

  return toolBlock.input;
}
