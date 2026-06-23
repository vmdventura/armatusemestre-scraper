export function createWpClient({ siteUrl, username, appPassword }) {
  const base = `https://public-api.wordpress.com/wp/v2/sites/${siteUrl}`;
  const auth = `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;

  const categoryCache = new Map();

  async function apiFetch(path, options = {}) {
    const url = `${base}${path}`;
    const res = await fetchWithRetry(url, {
      ...options,
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`WP API ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  async function fetchWithRetry(url, options, attempt = 1) {
    const res = await fetch(url, options);
    if (res.status === 429 && attempt <= 4) {
      const delay = attempt * 2000;
      console.warn(`[wp] Rate limited, reintentando en ${delay}ms (intento ${attempt})...`);
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    return res;
  }

  async function getOrCreateCategory(name) {
    if (categoryCache.has(name)) return categoryCache.get(name);

    const existing = await apiFetch(`/categories?search=${encodeURIComponent(name)}&per_page=1`);
    if (existing.length > 0) {
      categoryCache.set(name, existing[0].id);
      return existing[0].id;
    }

    const created = await apiFetch("/categories", {
      method: "POST",
      body: JSON.stringify({ name, slug: name.toLowerCase() }),
    });
    categoryCache.set(name, created.id);
    return created.id;
  }

  async function findPostBySlug(slug) {
    const results = await apiFetch(`/posts?slug=${encodeURIComponent(slug)}&per_page=1&status=any`);
    return results[0] ?? null;
  }

  async function upsert(wpPost) {
    const categoryId = await getOrCreateCategory(wpPost.campus);

    const payload = {
      title: wpPost.title,
      slug: wpPost.slug,
      status: wpPost.status,
      content: wpPost.content,
      categories: [categoryId],
      tags: wpPost.tags,
      meta: wpPost.meta,
    };

    const existing = await findPostBySlug(wpPost.slug);
    if (existing) {
      await apiFetch(`/posts/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return { action: "updated", slug: wpPost.slug };
    } else {
      await apiFetch("/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { action: "created", slug: wpPost.slug };
    }
  }

  async function deleteStalePosts(activeSlugs) {
    const activeSet = new Set(activeSlugs);
    let deleted = 0;
    let page = 1;

    while (true) {
      const posts = await apiFetch(`/posts?per_page=100&page=${page}&status=publish`);
      if (posts.length === 0) break;

      for (const post of posts) {
        if (post.slug && !activeSet.has(post.slug) && isUasdSlug(post.slug)) {
          await apiFetch(`/posts/${post.id}?force=true`, { method: "DELETE" });
          deleted++;
        }
      }

      if (posts.length < 100) break;
      page++;
    }

    return deleted;
  }

  // Identifica slugs generados por este scraper (patrón: "XXX0000-sec-NNN-CAMPUS")
  function isUasdSlug(slug) {
    return /^[a-z]{3}\d{4}-sec-\d+-[a-z]+$/.test(slug);
  }

  return { upsert, deleteStalePosts, getOrCreateCategory };
}
