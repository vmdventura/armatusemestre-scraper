# CiudadanoRD

App móvil para el ciudadano dominicano: combustibles, apagones, clima, divisas, UASD y lotería.

## Estructura

```
api/    → Backend Express.js (scrapers + endpoints REST)
app/    → App móvil React Native (Expo)
```

---

## Probar en tu iPhone (5 minutos)

### Requisitos
- Node.js 18+ en tu Mac
- iPhone con **Expo Go** instalado (App Store, gratis)
- Mac y iPhone en el **mismo WiFi**

### Paso 1 — Levantar el backend

```bash
cd api
npm install
npm start
# → 🇩🇴  CiudadanoRD API lista en http://0.0.0.0:3001
```

### Paso 2 — Configurar tu IP

```bash
ipconfig getifaddr en0   # en la Mac → ej: 192.168.1.15
```

Edita `app/src/config.js`:
```js
export const API_BASE = 'http://192.168.1.15:3001';
```

### Paso 3 — Levantar Expo

```bash
cd app
npm install
npx expo start
```

Escanea el QR con la app **Expo Go** en tu iPhone. ¡Listo!

---

## Módulos

| Módulo | Fuente | Real |
|---|---|---|
| Divisas USD/EUR | open.er-api.com | ✅ |
| Clima | Open-Meteo / ONAMET | ✅ |
| Combustibles | MICM | ⚠️ scraper + fallback |
| Apagones | EDESUR/EDENORTE | 🔶 simulado |
| Lotería | Nacional/Loteka/Real | 🔶 simulado |
| UASD | app.uasd.edu.do | ✅ |

## Endpoints API

```
GET /api/health
GET /api/divisas
GET /api/clima
GET /api/combustibles
GET /api/apagones/sectores
GET /api/apagones/:sector
GET /api/loteria
GET /api/uasd?campus=CSA&clave=CIV2440
```