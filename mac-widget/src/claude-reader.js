const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

// Precios por millón de tokens (MTok) según modelo
const MODEL_PRICING = {
  'claude-opus-4':    { input: 15.0, output: 75.0 },
  'claude-opus-3-5':  { input: 15.0, output: 75.0 },
  'claude-sonnet-4':  { input: 3.0,  output: 15.0 },
  'claude-sonnet-3-7':{ input: 3.0,  output: 15.0 },
  'claude-sonnet-3-5':{ input: 3.0,  output: 15.0 },
  'claude-haiku-4':   { input: 0.80, output: 4.0 },
  'claude-haiku-3-5': { input: 0.80, output: 4.0 },
  'default':          { input: 3.0,  output: 15.0 },
};

const CACHE_READ_FACTOR = 0.1;    // 10% del precio de entrada
const CACHE_WRITE_FACTOR = 1.25;  // 125% del precio de entrada

function getPricing(model) {
  if (!model) return MODEL_PRICING['default'];
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (key === 'default') continue;
    if (model.startsWith(key) || model.includes(key)) return pricing;
  }
  return MODEL_PRICING['default'];
}

function calcCost(usage, model) {
  const p = getPricing(model);
  const M = 1_000_000;
  return (
    ((usage.input_tokens || 0) * p.input / M) +
    ((usage.output_tokens || 0) * p.output / M) +
    ((usage.cache_read_input_tokens || 0) * p.input * CACHE_READ_FACTOR / M) +
    ((usage.cache_creation_input_tokens || 0) * p.input * CACHE_WRITE_FACTOR / M)
  );
}

async function parseJSONL(filePath) {
  const entries = [];
  try {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try { entries.push(JSON.parse(trimmed)); } catch (_) { /* skip malformed */ }
    }
  } catch (_) { /* file unreadable */ }
  return entries;
}

// Recorre proyectos y recoge todos los archivos .jsonl (incluye subagentes)
function collectJSONLFiles(projectDir) {
  const files = [];
  try {
    for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        files.push(path.join(projectDir, entry.name));
      } else if (entry.isDirectory()) {
        for (const sub of collectJSONLFiles(path.join(projectDir, entry.name))) {
          files.push(sub);
        }
      }
    }
  } catch (_) {}
  return files;
}

async function readAllUsageData() {
  const now = new Date();
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    total:        { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUSD: 0, sessions: 0 },
    today:        { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUSD: 0, sessions: 0 },
    thisMonth:    { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUSD: 0, sessions: 0 },
    byModel:      {},
    byDay:        {},
    recentSessions: [],
  };

  if (!fs.existsSync(PROJECTS_DIR)) return stats;

  const projects = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  for (const project of projects) {
    const projectDir = path.join(PROJECTS_DIR, project);

    // Archivos directamente en el directorio de proyecto (sesiones principales)
    const mainFiles = fs.readdirSync(projectDir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.jsonl'))
      .map(e => ({ filePath: path.join(projectDir, e.name), isSubagent: false, sessionId: e.name.replace('.jsonl', '') }));

    // Archivos en subdirectorios (subagentes)
    const subFiles = [];
    for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        for (const f of collectJSONLFiles(path.join(projectDir, entry.name))) {
          subFiles.push({ filePath: f, isSubagent: true, sessionId: path.basename(f, '.jsonl') });
        }
      }
    }

    for (const { filePath, sessionId } of [...mainFiles, ...subFiles]) {
      const entries = await parseJSONL(filePath);

      let sInput = 0, sOutput = 0, sCacheRead = 0, sCacheWrite = 0, sCost = 0;
      let sStart = null, sModel = null;

      for (const entry of entries) {
        if (entry.type !== 'assistant' || !entry.message?.usage) continue;
        const usage = entry.message.usage;
        const model = entry.message.model || null;
        const ts    = new Date(entry.timestamp);

        if (!sStart || ts < sStart) sStart = ts;
        if (!sModel) sModel = model;

        const cost = calcCost(usage, model);
        sInput      += usage.input_tokens                 || 0;
        sOutput     += usage.output_tokens                || 0;
        sCacheRead  += usage.cache_read_input_tokens      || 0;
        sCacheWrite += usage.cache_creation_input_tokens  || 0;
        sCost       += cost;

        // Acumular por modelo
        const mk = model || 'unknown';
        if (!stats.byModel[mk]) stats.byModel[mk] = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, costUSD: 0, calls: 0 };
        stats.byModel[mk].inputTokens  += usage.input_tokens || 0;
        stats.byModel[mk].outputTokens += usage.output_tokens || 0;
        stats.byModel[mk].cacheReadTokens += usage.cache_read_input_tokens || 0;
        stats.byModel[mk].costUSD      += cost;
        stats.byModel[mk].calls++;

        // Acumular por día
        const dayKey = ts.toISOString().slice(0, 10);
        if (!stats.byDay[dayKey]) stats.byDay[dayKey] = { inputTokens: 0, outputTokens: 0, costUSD: 0 };
        stats.byDay[dayKey].inputTokens  += usage.input_tokens || 0;
        stats.byDay[dayKey].outputTokens += usage.output_tokens || 0;
        stats.byDay[dayKey].costUSD      += cost;
      }

      if (sInput === 0 && sOutput === 0) continue;

      // Acumular totales
      stats.total.inputTokens   += sInput;
      stats.total.outputTokens  += sOutput;
      stats.total.cacheReadTokens += sCacheRead;
      stats.total.cacheWriteTokens += sCacheWrite;
      stats.total.costUSD       += sCost;
      stats.total.sessions++;

      if (sStart && sStart >= todayStart) {
        stats.today.inputTokens   += sInput;
        stats.today.outputTokens  += sOutput;
        stats.today.cacheReadTokens += sCacheRead;
        stats.today.cacheWriteTokens += sCacheWrite;
        stats.today.costUSD       += sCost;
        stats.today.sessions++;
      }
      if (sStart && sStart >= monthStart) {
        stats.thisMonth.inputTokens   += sInput;
        stats.thisMonth.outputTokens  += sOutput;
        stats.thisMonth.cacheReadTokens += sCacheRead;
        stats.thisMonth.cacheWriteTokens += sCacheWrite;
        stats.thisMonth.costUSD       += sCost;
        stats.thisMonth.sessions++;
      }

      stats.recentSessions.push({
        sessionId,
        project: project.replace(/^-/, '').replace(/-home-[^-]+-/, '~/').replace(/-/g, '/'),
        startTime: sStart ? sStart.toISOString() : null,
        model: sModel,
        inputTokens: sInput,
        outputTokens: sOutput,
        cacheReadTokens: sCacheRead,
        costUSD: sCost,
      });
    }
  }

  stats.recentSessions.sort((a, b) => (b.startTime || '') > (a.startTime || '') ? 1 : -1);
  stats.recentSessions = stats.recentSessions.slice(0, 10);

  return stats;
}

module.exports = { readAllUsageData };
