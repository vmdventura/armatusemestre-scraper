import { API_BASE, FETCH_TIMEOUT } from './config';

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Error desconocido');
  return json.data;
}

// ── Divisas (directa — sin backend) ──────────────────────────────────────────
export async function fetchDivisas() {
  try {
    const json = await (await fetch('https://open.er-api.com/v6/latest/USD',
      { signal: AbortSignal.timeout(FETCH_TIMEOUT) })).json();
    const DOP = json.rates.DOP;
    const EUR = json.rates.EUR;
    const eurDOP = DOP / EUR;
    return {
      fuente: 'Banco Central RD / ExchangeRate-API',
      usd: { compra: +(DOP * 0.990).toFixed(2), venta: +(DOP * 1.010).toFixed(2) },
      eur: { compra: +(eurDOP * 0.990).toFixed(2), venta: +(eurDOP * 1.010).toFixed(2) },
    };
  } catch {
    return MOCK.divisas;
  }
}

// ── Clima (directa — sin backend) ────────────────────────────────────────────
const WMO = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',61:'🌦',63:'🌧',65:'🌧',
  80:'🌦',81:'🌧',82:'⛈',95:'⛈',96:'⛈',99:'⛈',
};
const WMO_DESC = {
  0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',
  45:'Neblina',51:'Llovizna',61:'Lluvia ligera',63:'Lluvia',65:'Lluvia fuerte',
  80:'Chubascos',82:'Chubascos fuertes',95:'Tormenta',
};
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export async function fetchClima() {
  try {
    const p = new URLSearchParams({
      latitude:'18.4861', longitude:'-69.9312',
      current:'temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature,uv_index',
      daily:'weathercode,temperature_2m_max,temperature_2m_min',
      temperature_unit:'celsius', wind_speed_unit:'kmh',
      timezone:'America/Santo_Domingo', forecast_days:'6',
    });
    const json = await (await fetch(`https://api.open-meteo.com/v1/forecast?${p}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT) })).json();
    const c = json.current;
    const d = json.daily;
    return {
      ciudad: 'Santo Domingo',
      actual: {
        temp:      Math.round(c.temperature_2m),
        sensacion: Math.round(c.apparent_temperature),
        humedad:   c.relative_humidity_2m,
        viento:    Math.round(c.wind_speed_10m),
        uv:        Math.round(c.uv_index ?? 0),
        emoji:     WMO[c.weathercode] ?? '🌡',
        desc:      WMO_DESC[c.weathercode] ?? 'Variable',
      },
      pronostico: d.time.slice(1,6).map((fecha, i) => ({
        dia:     DIAS[new Date(fecha + 'T12:00:00').getDay()],
        maxTemp: Math.round(d.temperature_2m_max[i+1]),
        emoji:   WMO[d.weathercode[i+1]] ?? '🌡',
      })),
    };
  } catch {
    return MOCK.clima;
  }
}

// ── Endpoints del backend ─────────────────────────────────────────────────────
export async function fetchCombustibles() {
  try   { return await get(`${API_BASE}/api/combustibles`); }
  catch { return MOCK.combustibles; }
}

export async function fetchApagones(sector = 'Piantini') {
  try   { return await get(`${API_BASE}/api/apagones/${encodeURIComponent(sector)}`); }
  catch { return MOCK.apagones(sector); }
}

export async function fetchSectores() {
  try   { return await get(`${API_BASE}/api/apagones/sectores`); }
  catch { return MOCK.sectores; }
}

export async function fetchLoteria() {
  try   { return await get(`${API_BASE}/api/loteria`); }
  catch { return MOCK.loteria; }
}

export async function fetchUASD(campus, clave) {
  return get(`${API_BASE}/api/uasd?campus=${campus}&clave=${clave}`);
}

// ── Mock data (fallback cuando el backend no está corriendo) ──────────────────
const MOCK = {
  divisas: {
    fuente: 'Datos de ejemplo',
    usd: { compra: 58.10, venta: 59.30 },
    eur: { compra: 62.80, venta: 64.20 },
  },
  clima: {
    ciudad: 'Santo Domingo',
    actual: { temp: 34, sensacion: 38, humedad: 78, viento: 18, uv: 8, emoji: '⛅', desc: 'Parcialmente nublado' },
    pronostico: [
      { dia: 'Dom', maxTemp: 33, emoji: '🌧' },
      { dia: 'Lun', maxTemp: 35, emoji: '⛅' },
      { dia: 'Mar', maxTemp: 36, emoji: '☀️' },
      { dia: 'Mié', maxTemp: 33, emoji: '🌦' },
      { dia: 'Jue', maxTemp: 37, emoji: '☀️' },
    ],
  },
  combustibles: {
    semana: '20–26 jun 2025',
    fuente: 'MICM (datos de ejemplo)',
    precios: [
      { nombre: 'Gasolina Premium',  precio: 293.10, cambio: +2.30, color: '#E53935' },
      { nombre: 'Gasolina Regular',  precio: 274.50, cambio: +1.80, color: '#FB8C00' },
      { nombre: 'Gasoil Óptimo',     precio: 236.80, cambio: -0.50, color: '#1565C0' },
      { nombre: 'Gasoil Regular',    precio: 221.60, cambio: -1.10, color: '#546E7A' },
      { nombre: 'Gas Natural (GLP)', precio: 130.40, cambio:  0.00, color: '#00897B' },
    ],
  },
  sectores: ['Piantini','Naco','Los Prados','Bella Vista','Gazcue','Villa Consuelo','Cristo Rey','Herrera'],
  apagones: (sector) => ({
    sector,
    empresa: 'EDESUR',
    circuito: 'SD-00',
    estadoActual: 'on',
    horario: [
      { inicio:'06:00', fin:'10:00', estado:'on'  },
      { inicio:'10:00', fin:'14:00', estado:'off' },
      { inicio:'14:00', fin:'18:00', estado:'on'  },
      { inicio:'18:00', fin:'22:00', estado:'off' },
      { inicio:'22:00', fin:'06:00', estado:'on'  },
    ],
    sectoresDisponibles: ['Piantini','Naco','Los Prados','Bella Vista','Gazcue'],
    nota: 'Backend no disponible — datos de ejemplo',
  }),
  loteria: {
    fecha: 'hoy',
    fuente: 'Datos de ejemplo',
    juegos: [
      { nombre: 'Lotería Nacional', sorteo: '6:00 PM', numeros: ['14','27','03'], color: '#C8102E', bg: '#FFF3E0', emoji: '🏆' },
      { nombre: 'Loteka',           sorteo: '8:55 PM', numeros: ['31','08','42'], color: '#2E7D32', bg: '#E8F5E9', emoji: '🟢' },
      { nombre: 'Real',             sorteo: '3:00 PM', numeros: ['56','19','33'], color: '#4527A0', bg: '#EDE7F6', emoji: '👑' },
    ],
  },
};
