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

export async function createPost({ title, html, excerpt, slug, focus_keyword, meta_description, mediaId }) {
  const data = await wpFetch('/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      content: html,
      excerpt,
      slug,
      status: 'publish',
      featured_media: mediaId,
      meta: {
        rank_math_focus_keyword: focus_keyword,
        rank_math_description: meta_description,
        rank_math_title: `${title} | DeportesDo`,
      },
    }),
  });

  return { id: data.id, url: data.link };
}
