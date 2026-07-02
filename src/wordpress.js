const BASE_URL = () => `${process.env.WORDPRESS_URL}/wp-json/wp/v2`;
const authHeader = () =>
  'Basic ' + Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64');

async function wpFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL()}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      ...options.headers,
    },
  });

  let body;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const message = body?.message || body?.code || JSON.stringify(body);
    throw new Error(`WordPress API error ${res.status}: ${message}`);
  }

  return body;
}

export async function uploadImage(buffer, filename, mimeType = 'image/jpeg') {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), filename);

  const data = await wpFetch('/media', {
    method: 'POST',
    body: form,
  });

  return data.id;
}

export async function getCurrentUser() {
  return wpFetch('/users/me?context=edit');
}

export async function createPost({ title, html, excerpt, slug, focus_keyword, meta_description, mediaId }) {
  const payload = {
    title,
    content: html,
    excerpt,
    slug,
    featured_media: mediaId,
    meta: {
      rank_math_focus_keyword: focus_keyword,
      rank_math_description: meta_description,
      rank_math_title: `${title} | DeportesDo`,
    },
  };

  const post = status =>
    wpFetch('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, status }),
    });

  try {
    const data = await post('publish');
    return { id: data.id, url: data.link, published: true };
  } catch (err) {
    if (!/WordPress API error 40[13]/.test(err.message)) throw err;

    // El usuario no tiene permiso de publicar; intenta guardar como borrador
    // para no perder la noticia ya redactada.
    try {
      const data = await post('draft');
      return { id: data.id, url: data.link, published: false };
    } catch {
      const who = await getCurrentUser().catch(() => null);
      const role = who?.roles?.join(', ') || 'desconocido';
      throw new Error(
        `El usuario de WordPress no tiene permiso para crear entradas (rol actual: ${role}). ` +
        `Verifica en wp-admin > Usuarios que el rol sea Autor o superior.`
      );
    }
  }
}
