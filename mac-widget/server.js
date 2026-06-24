#!/usr/bin/env node
/**
 * Claude Usage Widget — servidor puro Node.js, sin dependencias npm.
 * Inicia un servidor en localhost y abre el widget en Chrome (app mode).
 * Usage: node server.js
 */

const http    = require('http');
const os      = require('os');
const path    = require('path');
const fs      = require('fs');
const readline = require('readline');
const { exec } = require('child_process');

const PORT         = 3456;
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/* ── Precios por millón de tokens ── */
const PRICING = {
  opus:    { input: 15.0,  output: 75.0  },
  sonnet:  { input:  3.0,  output: 15.0  },
  haiku:   { input:  0.80, output:  4.0  },
  default: { input:  3.0,  output: 15.0  },
};
const CACHE_READ  = 0.10;
const CACHE_WRITE = 1.25;

function pricing(model) {
  if (!model) return PRICING.default;
  const m = model.toLowerCase();
  if (m.includes('opus'))   return PRICING.opus;
  if (m.includes('haiku'))  return PRICING.haiku;
  if (m.includes('sonnet')) return PRICING.sonnet;
  return PRICING.default;
}

function cost(usage, model) {
  const p = pricing(model), M = 1_000_000;
  return (
    (usage.input_tokens                || 0) * p.input  / M +
    (usage.output_tokens               || 0) * p.output / M +
    (usage.cache_read_input_tokens     || 0) * p.input  * CACHE_READ  / M +
    (usage.cache_creation_input_tokens || 0) * p.input  * CACHE_WRITE / M
  );
}

async function parseJSONL(file) {
  const out = [];
  try {
    const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
    for await (const line of rl) {
      const t = line.trim();
      if (t) try { out.push(JSON.parse(t)); } catch (_) {}
    }
  } catch (_) {}
  return out;
}

function* walkJSONL(dir) {
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isFile() && e.name.endsWith('.jsonl'))      yield p;
      else if (e.isDirectory())                          yield* walkJSONL(p);
    }
  } catch (_) {}
}

async function usageData() {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const zero = () => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUSD: 0, sessions: 0 });
  const stats = { total: zero(), today: zero(), thisMonth: zero(), byModel: {}, byDay: {}, recentSessions: [] };

  if (!fs.existsSync(PROJECTS_DIR)) return stats;

  const projects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name);

  for (const proj of projects) {
    const projDir = path.join(PROJECTS_DIR, proj);

    // archivos directos del proyecto (sesiones principales)
    const mainFiles = fs.readdirSync(projDir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.jsonl'))
      .map(e => path.join(projDir, e.name));

    // archivos en subdirectorios (subagentes)
    const subFiles = [];
    for (const e of fs.readdirSync(projDir, { withFileTypes: true })) {
      if (e.isDirectory()) for (const f of walkJSONL(path.join(projDir, e.name))) subFiles.push(f);
    }

    for (const file of [...mainFiles, ...subFiles]) {
      const entries = await parseJSONL(file);
      let sIn = 0, sOut = 0, sCR = 0, sCW = 0, sCost = 0, sStart = null, sModel = null;

      for (const e of entries) {
        if (e.type !== 'assistant' || !e.message?.usage) continue;
        const u = e.message.usage, m = e.message.model || null, ts = new Date(e.timestamp);
        if (!sStart || ts < sStart) sStart = ts;
        if (!sModel) sModel = m;

        const c = cost(u, m);
        sIn   += u.input_tokens                || 0;
        sOut  += u.output_tokens               || 0;
        sCR   += u.cache_read_input_tokens     || 0;
        sCW   += u.cache_creation_input_tokens || 0;
        sCost += c;

        const mk = m || 'unknown';
        if (!stats.byModel[mk]) stats.byModel[mk] = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUSD: 0, calls: 0 };
        stats.byModel[mk].inputTokens    += u.input_tokens  || 0;
        stats.byModel[mk].outputTokens   += u.output_tokens || 0;
        stats.byModel[mk].cacheReadTokens+= u.cache_read_input_tokens || 0;
        stats.byModel[mk].costUSD        += c;
        stats.byModel[mk].calls++;

        const dk = ts.toISOString().slice(0, 10);
        if (!stats.byDay[dk]) stats.byDay[dk] = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
        stats.byDay[dk].inputTokens  += u.input_tokens  || 0;
        stats.byDay[dk].outputTokens += u.output_tokens || 0;
        stats.byDay[dk].costUSD      += c;
      }

      if (!sIn && !sOut) continue;

      const add = (bucket) => {
        bucket.inputTokens    += sIn;
        bucket.outputTokens   += sOut;
        bucket.cacheReadTokens+= sCR;
        bucket.cacheWriteTokens += sCW;
        bucket.costUSD        += sCost;
        bucket.sessions++;
      };
      add(stats.total);
      if (sStart && sStart >= todayStart) add(stats.today);
      if (sStart && sStart >= monthStart) add(stats.thisMonth);

      stats.recentSessions.push({
        sessionId: path.basename(file, '.jsonl'),
        project: proj.replace(/^-home-[^-]+-/, '~/').replace(/-/g, '/'),
        startTime: sStart?.toISOString() || null,
        model: sModel,
        inputTokens: sIn, outputTokens: sOut, cacheReadTokens: sCR, costUSD: sCost,
      });
    }
  }

  stats.recentSessions.sort((a, b) => (b.startTime || '') > (a.startTime || '') ? 1 : -1);
  stats.recentSessions = stats.recentSessions.slice(0, 10);
  return stats;
}

/* ── HTML del widget (todo inline) ── */
const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Claude Usage</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#12121c;--bg2:rgba(255,255,255,.05);--bg3:rgba(255,255,255,.09);
  --border:rgba(255,255,255,.09);--text:#e8e8f0;--muted:rgba(232,232,240,.45);
  --dim:rgba(232,232,240,.25);--accent:#cc785c;--green:#4ade80;--green-bg:rgba(74,222,128,.12);
}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif;-webkit-font-smoothing:antialiased}
body{overflow-y:auto;padding:12px}
body::-webkit-scrollbar{width:4px}
body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}

/* Header */
.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:2px 0}
.title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#fff}
.icon{width:22px;height:22px;background:linear-gradient(135deg,#cc785c,#e8975a);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px}
.subtitle{font-size:10px;color:var(--muted);font-weight:400}
.refresh-btn{background:var(--bg2);border:1px solid var(--border);color:var(--muted);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all .15s}
.refresh-btn:hover{background:var(--bg3);color:#fff}

/* Section */
.section{margin-bottom:14px}
.section-label{font-size:9px;font-weight:700;letter-spacing:1.1px;color:var(--dim);text-transform:uppercase;margin-bottom:7px;padding-left:1px}

/* Stat grid */
.grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.card.full{grid-column:1/-1}
.val{font-size:21px;font-weight:700;color:#fff;letter-spacing:-.8px;line-height:1.1;font-variant-numeric:tabular-nums}
.lbl{font-size:10px;color:var(--muted);margin-top:3px;font-weight:500}
.cost{color:var(--green)!important}
.token-row{display:flex;gap:12px;margin-top:5px}
.tk{font-size:10px;color:var(--muted)}
.tk span{color:rgba(255,255,255,.7);font-weight:600}

/* KV rows */
.kv{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.kvr{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px}
.kvr:last-child{border-bottom:none}
.kk{color:var(--muted);font-weight:500}
.kv2{color:#fff;font-weight:600;font-variant-numeric:tabular-nums}
.kv2.g{color:var(--green)}

/* Chart */
.chart-bars{display:flex;align-items:flex-end;gap:3px;height:44px;margin-bottom:4px}
.bar{flex:1;background:rgba(204,120,92,.3);border-radius:3px 3px 0 0;min-height:2px;transition:background .15s}
.bar:hover{background:rgba(204,120,92,.6)}
.bar.today{background:rgba(74,222,128,.45)}
.bar.today:hover{background:rgba(74,222,128,.7)}
.chart-labels{display:flex;gap:3px}
.cl{flex:1;font-size:8px;color:var(--dim);text-align:center}

/* Models */
.model-item{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;background:var(--bg2);border:1px solid var(--border);border-radius:9px;margin-bottom:5px;gap:10px}
.model-item:last-child{margin-bottom:0}
.mdot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.mname{font-size:11px;font-weight:600;color:var(--text)}
.mcalls{font-size:10px;color:var(--muted)}
.mcost{font-size:12px;font-weight:700;color:var(--green)}
.mtok{font-size:10px;color:var(--muted)}

/* Sessions */
.sess{padding:9px 11px;background:var(--bg2);border:1px solid var(--border);border-radius:9px;margin-bottom:5px}
.sess:last-child{margin-bottom:0}
.sess-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
.sess-time{font-size:10px;color:var(--muted)}
.sess-badge{font-size:10px;font-weight:700;color:var(--green);background:var(--green-bg);padding:1px 7px;border-radius:20px}
.sess-proj{font-size:11px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
.sess-meta{font-size:10px;color:var(--dim)}
.sess-meta span{color:var(--muted)}

.empty{font-size:11px;color:var(--dim);padding:8px 12px}
.footer{text-align:center;font-size:10px;color:var(--dim);margin-top:8px;padding:4px 0}
@keyframes spin{to{transform:rotate(360deg)}}
.spinning{animation:spin .6s linear infinite;display:inline-block}
</style>
</head>
<body>
<div class="header">
  <div class="title">
    <div class="icon">⬡</div>
    <span>Claude Usage</span>
    <span class="subtitle">Monitor</span>
  </div>
  <button class="refresh-btn" id="refresh-btn" title="Actualizar">↻</button>
</div>

<!-- HOY -->
<div class="section">
  <div class="section-label">Hoy</div>
  <div class="grid">
    <div class="card"><div class="val cost" id="today-cost">—</div><div class="lbl">Costo estimado</div></div>
    <div class="card"><div class="val" id="today-sessions">—</div><div class="lbl">Sesiones</div></div>
    <div class="card full">
      <div class="val" id="today-tokens">—</div>
      <div class="lbl">Tokens totales</div>
      <div class="token-row">
        <div class="tk">Entrada <span id="today-in">0</span></div>
        <div class="tk">Salida <span id="today-out">0</span></div>
        <div class="tk">Cache ↺ <span id="today-cache">0</span></div>
      </div>
    </div>
  </div>
</div>

<!-- ESTE MES -->
<div class="section">
  <div class="section-label">Este mes</div>
  <div class="grid">
    <div class="card"><div class="val cost" id="month-cost">—</div><div class="lbl">Costo estimado</div></div>
    <div class="card"><div class="val" id="month-sessions">—</div><div class="lbl">Sesiones</div></div>
    <div class="card full">
      <div class="val" id="month-tokens">—</div>
      <div class="lbl">Tokens totales</div>
      <div class="token-row">
        <div class="tk">Entrada <span id="month-in">0</span></div>
        <div class="tk">Salida <span id="month-out">0</span></div>
        <div class="tk">Cache ↺ <span id="month-cache">0</span></div>
      </div>
    </div>
  </div>
</div>

<!-- ACTIVIDAD -->
<div class="section">
  <div class="section-label">Actividad — últimos 7 días</div>
  <div class="chart-bars" id="chart-bars"></div>
  <div class="chart-labels" id="chart-labels"></div>
</div>

<!-- HISTÓRICO -->
<div class="section">
  <div class="section-label">Histórico total</div>
  <div class="kv">
    <div class="kvr"><span class="kk">Costo total</span><span class="kv2 g" id="total-cost">—</span></div>
    <div class="kvr"><span class="kk">Sesiones</span><span class="kv2" id="total-sessions">—</span></div>
    <div class="kvr"><span class="kk">Tokens entrada</span><span class="kv2" id="total-in">—</span></div>
    <div class="kvr"><span class="kk">Tokens salida</span><span class="kv2" id="total-out">—</span></div>
    <div class="kvr"><span class="kk">Cache leído</span><span class="kv2" id="total-cr">—</span></div>
    <div class="kvr"><span class="kk">Cache creado</span><span class="kv2" id="total-cw">—</span></div>
  </div>
</div>

<!-- MODELOS -->
<div class="section">
  <div class="section-label">Por modelo</div>
  <div id="models-list"></div>
</div>

<!-- SESIONES RECIENTES -->
<div class="section">
  <div class="section-label">Sesiones recientes</div>
  <div id="sessions-list"></div>
</div>

<div class="footer" id="footer">Cargando...</div>

<script>
const $ = id => document.getElementById(id);
const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };

function fNum(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2)+'M';
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
  return n.toLocaleString();
}
function fCost(n) {
  if (n >= 1)    return '$'+n.toFixed(2);
  if (n >= 0.01) return '$'+n.toFixed(3);
  return '$'+n.toFixed(4);
}
function fRel(iso) {
  if (!iso) return '—';
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000)       return 'Ahora mismo';
  if (d < 3600000)     return 'Hace '+Math.floor(d/60000)+'m';
  if (d < 86400000)    return 'Hace '+Math.floor(d/3600000)+'h';
  if (d < 7*86400000)  return 'Hace '+Math.floor(d/86400000)+'d';
  return new Date(iso).toLocaleDateString('es',{day:'numeric',month:'short'});
}
function shortModel(m) {
  if (!m) return 'Desconocido';
  const s = m.toLowerCase();
  // extrae versión tipo "4", "4.5", "4-6" → "4.6"
  const ver = (s.match(/(\d+[-.]?\d*)/g) || []).join('.').replace(/-/g,'.');
  if (s.includes('opus'))   return ver ? 'Opus '  + ver : 'Opus';
  if (s.includes('sonnet')) return ver ? 'Sonnet '+ ver : 'Sonnet';
  if (s.includes('haiku'))  return ver ? 'Haiku ' + ver : 'Haiku';
  return m;
}
function modelColor(m) {
  if (!m) return '#888';
  const s = m.toLowerCase();
  if (s.includes('opus'))   return '#a78bfa';
  if (s.includes('sonnet')) return '#60a5fa';
  if (s.includes('haiku'))  return '#4ade80';
  return '#cc785c';
}

function render(data) {
  set('today-cost',     fCost(data.today.costUSD));
  set('today-sessions', data.today.sessions);
  set('today-tokens',   fNum(data.today.inputTokens+data.today.outputTokens));
  set('today-in',       fNum(data.today.inputTokens));
  set('today-out',      fNum(data.today.outputTokens));
  set('today-cache',    fNum(data.today.cacheReadTokens));

  set('month-cost',     fCost(data.thisMonth.costUSD));
  set('month-sessions', data.thisMonth.sessions);
  set('month-tokens',   fNum(data.thisMonth.inputTokens+data.thisMonth.outputTokens));
  set('month-in',       fNum(data.thisMonth.inputTokens));
  set('month-out',      fNum(data.thisMonth.outputTokens));
  set('month-cache',    fNum(data.thisMonth.cacheReadTokens));

  set('total-cost',     fCost(data.total.costUSD));
  set('total-sessions', data.total.sessions);
  set('total-in',       fNum(data.total.inputTokens));
  set('total-out',      fNum(data.total.outputTokens));
  set('total-cr',       fNum(data.total.cacheReadTokens));
  set('total-cw',       fNum(data.total.cacheWriteTokens));

  // Chart
  const barsEl = $('chart-bars'), lblsEl = $('chart-labels');
  barsEl.innerHTML = lblsEl.innerHTML = '';
  const today = new Date();
  const days = Array.from({length:7},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()-(6-i));
    return d.toISOString().slice(0,10);
  });
  const vals = days.map(d=>data.byDay[d]?.costUSD||0);
  const mx = Math.max(...vals, 0.0001);
  days.forEach((day,i)=>{
    const pct = Math.max(vals[i]/mx*100, vals[i]>0?4:0);
    const isToday = i===6;
    const bar = document.createElement('div');
    bar.className='bar'+(isToday?' today':'');
    bar.style.height=pct+'%';
    bar.title=day+': '+fCost(vals[i]);
    barsEl.appendChild(bar);
    const lbl=document.createElement('div');
    lbl.className='cl';
    lbl.textContent=isToday?'hoy':new Date(day+'T12:00:00').toLocaleDateString('es',{weekday:'narrow'});
    lblsEl.appendChild(lbl);
  });

  // Models
  const mEl = $('models-list'); mEl.innerHTML='';
  const models = Object.entries(data.byModel).sort((a,b)=>b[1].costUSD-a[1].costUSD);
  if (!models.length) { mEl.innerHTML='<div class="empty">Sin datos de modelos aún</div>'; }
  else models.forEach(([m,s])=>{
    mEl.insertAdjacentHTML('beforeend',
      '<div class="model-item">'+
        '<div style="display:flex;align-items:center;gap:7px">'+
          '<div class="mdot" style="background:'+modelColor(m)+'"></div>'+
          '<div><div class="mname">'+shortModel(m)+'</div><div class="mcalls">'+s.calls+' llamadas</div></div>'+
        '</div>'+
        '<div style="text-align:right"><div class="mcost">'+fCost(s.costUSD)+'</div><div class="mtok">'+fNum(s.inputTokens)+'↓ '+fNum(s.outputTokens)+'↑</div></div>'+
      '</div>');
  });

  // Sessions
  const sEl = $('sessions-list'); sEl.innerHTML='';
  if (!data.recentSessions.length) { sEl.innerHTML='<div class="empty">Sin sesiones registradas</div>'; }
  else data.recentSessions.slice(0,7).forEach(s=>{
    sEl.insertAdjacentHTML('beforeend',
      '<div class="sess">'+
        '<div class="sess-top"><span class="sess-time">'+fRel(s.startTime)+'</span><span class="sess-badge">'+fCost(s.costUSD)+'</span></div>'+
        '<div class="sess-proj">'+s.project+'</div>'+
        '<div class="sess-meta"><span>'+fNum(s.inputTokens)+'↓</span> &nbsp;<span>'+fNum(s.outputTokens)+'↑</span> &nbsp;·&nbsp; <span>'+shortModel(s.model)+'</span></div>'+
      '</div>');
  });

  const now = new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  set('footer','Actualizado: '+now+' — refresco automático cada 30s');
}

let timer;
async function refresh() {
  const btn = $('refresh-btn');
  btn.classList.add('spinning');
  set('footer','Actualizando...');
  try {
    const res = await fetch('/api/usage');
    const data = await res.json();
    render(data);
  } catch(e) {
    set('footer','Error: '+e.message);
  } finally {
    btn.classList.remove('spinning');
    clearTimeout(timer);
    timer = setTimeout(refresh, 30000);
  }
}
$('refresh-btn').addEventListener('click', ()=>{ clearTimeout(timer); refresh(); });
refresh();
</script>
</body>
</html>`;

/* ── Servidor HTTP ── */
const server = http.createServer(async (req, res) => {
  if (req.url === '/api/usage') {
    try {
      const data = await usageData();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  Claude Usage Widget → ${url}\n`);
  console.log('  Presiona Ctrl+C para detener.\n');

  // Intentar abrir en Chrome (modo app = ventana sin barra de navegación)
  const chromePaths = [
    'Google Chrome', 'Google Chrome Canary', 'Chromium', 'Brave Browser', 'Microsoft Edge'
  ];
  const tryChrome = (i) => {
    if (i >= chromePaths.length) {
      // Fallback: abrir en browser por defecto
      exec(`open "${url}"`);
      return;
    }
    exec(
      `open -a "${chromePaths[i]}" --args --app=${url} --window-size=390,680 --window-position=1450,40`,
      (err) => { if (err) tryChrome(i + 1); }
    );
  };
  tryChrome(0);
});
