import express from 'express';
import cors from 'cors';
import { getCombustibles } from './scrapers/combustibles.mjs';
import { getDivisas }      from './scrapers/divisas.mjs';
import { getClima }        from './scrapers/clima.mjs';
import { getApagones, SECTORES_DISPONIBLES } from './scrapers/apagones.mjs';
import { getUASD }         from './scrapers/uasd.mjs';
import { getLoteria }      from './scrapers/loteria.mjs';

const app = express();
app.use(cors());
app.use(express.json());

// ── Caché en memoria ──────────────────────────────────────────────────────────
const cache  = new Map();
const TTL_MS = {
  combustibles: 60 * 60 * 1000,   // 1 h  (precios semanales)
  divisas:      15 * 60 * 1000,   // 15 min
  clima:        30 * 60 * 1000,   // 30 min
  loteria:       5 * 60 * 1000,   // 5 min
};

function withCache(key, ttl, fetcher) {
  return async (req, res) => {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < ttl) {
      return res.json({ ok: true, cached: true, data: hit.data });
    }
    try {
      const data = await fetcher(req);
      cache.set(key, { ts: Date.now(), data });
      res.json({ ok: true, cached: false, data });
    } catch (err) {
      const stale = cache.get(key);
      if (stale) return res.json({ ok: true, cached: true, stale: true, data: stale.data });
      res.status(500).json({ ok: false, error: err.message });
    }
  };
}

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.get('/api/combustibles', withCache('combustibles', TTL_MS.combustibles, getCombustibles));
app.get('/api/divisas',      withCache('divisas',      TTL_MS.divisas,      getDivisas));
app.get('/api/clima',        withCache('clima',        TTL_MS.clima,        getClima));
app.get('/api/loteria',      withCache('loteria',      TTL_MS.loteria,      getLoteria));

app.get('/api/apagones/sectores', (_req, res) => {
  res.json({ ok: true, data: SECTORES_DISPONIBLES });
});

app.get('/api/apagones/:sector', async (req, res) => {
  try {
    const data = await getApagones(decodeURIComponent(req.params.sector));
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/uasd', async (req, res) => {
  const { campus = 'CSA', clave } = req.query;
  if (!clave) return res.status(400).json({ ok: false, error: 'Parámetro "clave" requerido' });
  try {
    const data = await getUASD(campus, clave);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), version: '1.0.0' });
});

// ── Arranque ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🇩🇴  CiudadanoRD API lista en http://0.0.0.0:${PORT}`);
  console.log(`     Health check → http://localhost:${PORT}/api/health\n`);
});
