/* RDparty Cartelera de Cine — JavaScript */
(function () {
  const ROOT = document.getElementById('rdparty-cartelera');
  if (!ROOT) return;

  const JSON_URL      = 'https://raw.githubusercontent.com/vmdventura/armatusemestre-scraper/main/data/billboard.json';
  const JSON_FALLBACK = 'https://cdn.jsdelivr.net/gh/vmdventura/armatusemestre-scraper@main/data/billboard.json';

  let allMovies   = [];
  let activeTheater = 'all';
  let activeFormat  = 'all';

  ROOT.innerHTML = '<div class="cc-loading">🎬 Cargando cartelera…</div>';

  // ── Fetch con fallback ──────────────────────────────────────────────────────
  async function fetchBillboard() {
    try {
      const res = await fetch(JSON_URL);
      if (res.ok) return res.json();
    } catch {}
    try {
      const res = await fetch(JSON_FALLBACK);
      if (res.ok) return res.json();
    } catch {}
    return null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getTheaters(movies) {
    const set = new Set();
    movies.forEach(m => (m.theaters || []).forEach(t => { if (t.name) set.add(t.name); }));
    return [...set];
  }

  function getFormats(movies) {
    const set = new Set();
    movies.forEach(m => (m.formats || []).forEach(f => { if (f) set.add(f.toUpperCase()); }));
    return [...set];
  }

  function firstShowtimes(movie, theaterFilter) {
    for (const t of (movie.theaters || [])) {
      if (theaterFilter !== 'all' && t.name !== theaterFilter) continue;
      for (const s of (t.showtimes || [])) {
        if (s.times && s.times.length) return s.times;
      }
    }
    return [];
  }

  function fmtClass(f) {
    f = f.toUpperCase();
    if (f.includes('IMAX'))   return 'imax';
    if (f.includes('4DX') || f.includes('SCREENX') || f.includes('MX4D')) return 'fdx';
    if (f === '3D')           return 'd3';
    return '';
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Renderizado de tarjeta ──────────────────────────────────────────────────
  function buildCard(m) {
    const times  = firstShowtimes(m, activeTheater);
    const shown  = times.slice(0, 3);
    const extra  = times.length - 3;
    const fmts   = (m.formats || []).filter(f => f && f !== '2D').slice(0, 2);
    const link   = escHtml(m.link || 'https://caribbeancinemas.com');
    const title  = escHtml(m.title || 'Sin título');
    const poster = escHtml(m.poster || '');

    return `
      <div class="cc-card" role="button" tabindex="0" aria-label="${title}"
           onclick="window.open('${link}','_blank')"
           onkeydown="if(event.key==='Enter')window.open('${link}','_blank')">
        <div class="cc-poster">
          ${poster
            ? `<img src="${poster}" alt="${title}" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="cc-poster-placeholder"${poster ? ' style="display:none"' : ''}>🎬</div>
          ${m.rating ? `<div class="cc-rating">${escHtml(m.rating)}</div>` : ''}
          ${fmts.length
            ? `<div class="cc-fmts">${fmts.map(f => `<span class="cc-fmt ${fmtClass(f)}">${escHtml(f)}</span>`).join('')}</div>`
            : ''}
          <div class="cc-poster-overlay">
            <button class="cc-btn-tickets"
                    onclick="event.stopPropagation();window.open('${link}','_blank')">
              🎟 Comprar tickets
            </button>
          </div>
        </div>
        <div class="cc-body">
          <div class="cc-card-title">${title}</div>
          <div class="cc-meta">${[m.duration ? m.duration + ' min' : null, (m.genres || [])[0]].filter(Boolean).join(' · ') || '&nbsp;'}</div>
          <div class="cc-times">
            ${shown.map(t => `<span class="cc-time">${escHtml(t)}</span>`).join('')}
            ${extra > 0 ? `<span class="cc-more">+${extra}</span>` : ''}
            ${!times.length ? `<span class="cc-more">Ver horarios ›</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  // ── Render principal ────────────────────────────────────────────────────────
  function render(movies, updatedAt, theaters, formats) {
    const dateStr = updatedAt
      ? new Date(updatedAt).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })
      : 'hoy';

    // Filtrar películas
    let filtered = movies;
    if (activeTheater !== 'all') {
      filtered = filtered.filter(m => (m.theaters || []).some(t => t.name === activeTheater));
    }
    if (activeFormat !== 'all') {
      filtered = filtered.filter(m => (m.formats || []).map(f => f.toUpperCase()).includes(activeFormat));
    }

    const theaterChips = theaters.map(t =>
      `<div class="cc-chip${t === activeTheater ? ' on' : ''}" data-theater="${escHtml(t)}">${escHtml(t.replace('Caribbean Cinemas ', ''))}</div>`
    ).join('');

    const formatChips = formats.map(f =>
      `<div class="cc-chip${f === activeFormat ? ' on' : ''}" data-format="${escHtml(f)}">${escHtml(f)}</div>`
    ).join('');

    ROOT.innerHTML = `
      <div class="cc-header">
        <div class="cc-title">🎬 Cartelera <span>RD</span></div>
        <div class="cc-badge"><span class="cc-dot"></span>Actualizado ${dateStr}</div>
      </div>

      ${theaters.length ? `
      <div class="cc-filter-group" style="margin-bottom:8px">
        <div class="cc-filters">
          <div class="cc-chip${activeTheater === 'all' ? ' on' : ''}" data-theater="all">Todos los teatros</div>
          ${theaterChips}
        </div>
      </div>` : ''}

      ${formats.length > 1 ? `
      <div class="cc-filter-group" style="margin-bottom:18px">
        <div class="cc-filters">
          <div class="cc-chip${activeFormat === 'all' ? ' on' : ''}" data-format="all">Todos los formatos</div>
          ${formatChips}
        </div>
      </div>` : ''}

      <div class="cc-grid">
        ${filtered.length
          ? filtered.map(buildCard).join('')
          : '<div class="cc-empty">No hay películas disponibles con este filtro.</div>'}
      </div>

      <div class="cc-footer">
        Fuente: <a href="https://caribbeancinemas.com" target="_blank" rel="noopener">caribbeancinemas.com</a>
        &nbsp;·&nbsp; ${movies.length} películas en cartelera
      </div>`;

    // Eventos de filtros
    ROOT.querySelectorAll('[data-theater]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeTheater = chip.dataset.theater;
        render(allMovies, updatedAt, theaters, formats);
      });
    });
    ROOT.querySelectorAll('[data-format]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeFormat = chip.dataset.format;
        render(allMovies, updatedAt, theaters, formats);
      });
    });
  }

  // ── Inicio ──────────────────────────────────────────────────────────────────
  fetchBillboard().then(data => {
    if (!data || !data.movies || !data.movies.length) {
      ROOT.innerHTML = `<div class="cc-empty">
        ⚠️ No se pudo cargar la cartelera.<br>
        <a href="https://caribbeancinemas.com" style="color:#e63946">Ver en caribbeancinemas.com →</a>
      </div>`;
      return;
    }

    allMovies = data.movies;
    render(allMovies, data.updated_at, getTheaters(allMovies), getFormats(allMovies));
  }).catch(() => {
    ROOT.innerHTML = `<div class="cc-empty">
      ⚠️ Sin conexión a internet.<br>
      <a href="https://caribbeancinemas.com" style="color:#e63946">Ver en caribbeancinemas.com →</a>
    </div>`;
  });
})();
