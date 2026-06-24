/* ── Helpers ── */

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtCost(n) {
  if (n >= 1)    return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(3);
  return '$' + n.toFixed(4);
}

function fmtRelTime(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60_000)        return 'Ahora mismo';
  if (diff < 3_600_000)     return `Hace ${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)    return `Hace ${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `Hace ${Math.floor(diff / 86_400_000)}d`;
  return new Date(isoStr).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function shortModel(model) {
  if (!model) return 'Desconocido';
  const m = model.toLowerCase();
  if (m.includes('opus'))   return m.includes('4-8') ? 'Opus 4.8' : m.includes('4-7') ? 'Opus 4.7' : m.includes('4') ? 'Opus 4' : 'Opus';
  if (m.includes('sonnet')) return m.includes('4-6') ? 'Sonnet 4.6' : m.includes('4-5') ? 'Sonnet 4.5' : m.includes('4') ? 'Sonnet 4' : 'Sonnet';
  if (m.includes('haiku'))  return m.includes('4') ? 'Haiku 4' : 'Haiku';
  return model.split('-').slice(-2).join('-');
}

function modelColor(model) {
  if (!model) return '#888';
  const m = model.toLowerCase();
  if (m.includes('opus'))   return '#a78bfa'; // purple
  if (m.includes('sonnet')) return '#60a5fa'; // blue
  if (m.includes('haiku'))  return '#4ade80'; // green
  return '#cc785c';
}

function shortProject(p) {
  if (!p) return 'proyecto';
  return p.replace(/^\/+/, '').replace(/^home\/[^/]+\//, '~/');
}

/* ── DOM update ── */

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function updateUI(data) {
  // HOY
  setText('today-cost',         fmtCost(data.today.costUSD));
  setText('today-sessions',     data.today.sessions);
  setText('today-total-tokens', fmtNum(data.today.inputTokens + data.today.outputTokens));
  setText('today-input',        fmtNum(data.today.inputTokens));
  setText('today-output',       fmtNum(data.today.outputTokens));
  setText('today-cache',        fmtNum(data.today.cacheReadTokens));

  // ESTE MES
  setText('month-cost',         fmtCost(data.thisMonth.costUSD));
  setText('month-sessions',     data.thisMonth.sessions);
  setText('month-total-tokens', fmtNum(data.thisMonth.inputTokens + data.thisMonth.outputTokens));
  setText('month-input',        fmtNum(data.thisMonth.inputTokens));
  setText('month-output',       fmtNum(data.thisMonth.outputTokens));
  setText('month-cache',        fmtNum(data.thisMonth.cacheReadTokens));

  // HISTÓRICO
  setText('total-cost',        fmtCost(data.total.costUSD));
  setText('total-sessions',    data.total.sessions);
  setText('total-input',       fmtNum(data.total.inputTokens));
  setText('total-output',      fmtNum(data.total.outputTokens));
  setText('total-cache-read',  fmtNum(data.total.cacheReadTokens));
  setText('total-cache-write', fmtNum(data.total.cacheWriteTokens));

  // GRÁFICO (últimos 7 días)
  renderChart(data.byDay);

  // MODELOS
  renderModels(data.byModel);

  // SESIONES RECIENTES
  renderSessions(data.recentSessions);
}

function renderChart(byDay) {
  const barsEl  = document.getElementById('chart-bars');
  const datesEl = document.getElementById('chart-dates');
  barsEl.innerHTML  = '';
  datesEl.innerHTML = '';

  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const values = days.map(d => (byDay[d]?.costUSD || 0));
  const max = Math.max(...values, 0.0001);

  days.forEach((day, i) => {
    const pct = Math.max((values[i] / max) * 100, values[i] > 0 ? 4 : 0);
    const isToday = i === 6;

    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (isToday ? ' today' : '');
    bar.style.height = pct + '%';
    bar.title = `${day}: ${fmtCost(values[i])}`;
    barsEl.appendChild(bar);

    const lbl = document.createElement('div');
    lbl.className = 'chart-date';
    lbl.textContent = isToday ? 'hoy' : new Date(day + 'T12:00:00').toLocaleDateString('es', { weekday: 'narrow' });
    datesEl.appendChild(lbl);
  });
}

function renderModels(byModel) {
  const el = document.getElementById('models-list');
  el.innerHTML = '';

  const entries = Object.entries(byModel).sort((a, b) => b[1].costUSD - a[1].costUSD);
  if (!entries.length) {
    el.innerHTML = '<div class="empty">Sin datos de modelos aún</div>';
    return;
  }

  entries.forEach(([model, stats]) => {
    const item = document.createElement('div');
    item.className = 'model-item';
    item.innerHTML = `
      <div class="model-badge">
        <div class="model-dot" style="background:${modelColor(model)}"></div>
        <div>
          <div class="model-name">${shortModel(model)}</div>
          <div class="model-calls">${stats.calls} llamadas</div>
        </div>
      </div>
      <div class="model-right">
        <div class="model-cost">${fmtCost(stats.costUSD)}</div>
        <div class="model-tokens">${fmtNum(stats.inputTokens)}↓ ${fmtNum(stats.outputTokens)}↑</div>
      </div>
    `;
    el.appendChild(item);
  });
}

function renderSessions(sessions) {
  const el = document.getElementById('sessions-list');
  el.innerHTML = '';

  if (!sessions.length) {
    el.innerHTML = '<div class="empty">Sin sesiones registradas</div>';
    return;
  }

  sessions.slice(0, 7).forEach(s => {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `
      <div class="session-top">
        <span class="session-time">${fmtRelTime(s.startTime)}</span>
        <span class="session-badge">${fmtCost(s.costUSD)}</span>
      </div>
      <div class="session-project">${shortProject(s.project)}</div>
      <div class="session-meta">
        <span>${fmtNum(s.inputTokens)}↓</span> &nbsp;
        <span>${fmtNum(s.outputTokens)}↑</span> &nbsp;·&nbsp;
        <span>${shortModel(s.model)}</span>
      </div>
    `;
    el.appendChild(item);
  });
}

/* ── Refresh logic ── */

let refreshTimeout = null;

async function refresh() {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  setText('footer', 'Actualizando...');

  try {
    const data = await window.claudeAPI.getUsageData();
    updateUI(data);
    const now = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setText('footer', `Actualizado: ${now} — se refresca cada 30s`);
  } catch (err) {
    setText('footer', `Error: ${err.message}`);
  } finally {
    btn.classList.remove('spinning');
    scheduleNext();
  }
}

function scheduleNext() {
  clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(refresh, 30_000);
}

/* ── Controls ── */

document.getElementById('close-btn').addEventListener('click',    () => window.claudeAPI.closeWindow());
document.getElementById('minimize-btn').addEventListener('click', () => window.claudeAPI.minimizeWindow());
document.getElementById('refresh-btn').addEventListener('click',  () => { clearTimeout(refreshTimeout); refresh(); });

/* ── Boot ── */
refresh();
