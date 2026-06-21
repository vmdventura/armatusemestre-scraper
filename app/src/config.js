// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURA TU IP ANTES DE PROBAR EN EL IPHONE
//
// 1. En tu Mac: abre Terminal y corre → ipconfig getifaddr en0
// 2. Reemplaza "TU_IP_AQUI" con el resultado (ej: "192.168.1.15")
// 3. Tu iPhone y Mac deben estar en el mismo WiFi
// ─────────────────────────────────────────────────────────────────────────────
export const API_BASE = 'http://TU_IP_AQUI:3001';

// Segundos antes de declarar timeout en cada petición
export const FETCH_TIMEOUT = 8000;
