# armatusemestre-scraper

Scrapers automatizados para RDparty.com.

## Cartelera de Cine — Caribbean Cinemas RD

Extrae automáticamente la cartelera actual de [Caribbean Cinemas](https://caribbeancinemas.com) y la guarda en `data/billboard.json`. El workflow de GitHub Actions la actualiza 3 veces al día.

### Datos disponibles

`data/billboard.json` — actualizado automáticamente, listo para consumir desde RDparty.com:

```json
{
  "updated_at": "2025-01-15T10:00:00Z",
  "source": "caribbeancinemas.com",
  "country": "DO",
  "total": 12,
  "movies": [
    {
      "title": "Nombre de la Película",
      "poster": "https://...",
      "link": "https://caribbeancinemas.com/...",
      "rating": "PG-13",
      "synopsis": "...",
      "duration": 120,
      "formats": ["2D", "3D"],
      "theaters": [
        {
          "name": "Caribbean Cinemas Acropolis",
          "showtimes": [
            { "date": "2025-01-15", "format": "3D", "times": ["13:00", "15:30", "18:00"] }
          ]
        }
      ]
    }
  ]
}
```

### URL para consumir desde RDparty.com

```
https://raw.githubusercontent.com/vmdventura/armatusemestre-scraper/main/data/billboard.json
```

### Ejecutar localmente

```bash
npm install
npx playwright install chromium

# Scraping normal
npm run scrape:cine

# Modo descubrimiento (guarda screenshot + HTML para depurar selectores)
npm run descubrir:cine
```

### Ajustar selectores

Si la cartelera queda vacía, ejecuta en modo descubrimiento:

```bash
npm run descubrir:cine
```

Esto genera `debug-screenshot.png` y `debug-page.html`. Abre el HTML en el navegador, inspecciona los elementos de las tarjetas de películas con DevTools y actualiza los selectores en `scrapers/caribbean-cinemas.mjs` → `MOVIE_CARD_SELECTORS`.

### GitHub Actions

- **Automático**: corre a las 2AM, 8AM y 3PM hora RD (UTC-4)
- **Manual**: `Actions → Actualizar Cartelera de Cine → Run workflow`
- **Debug**: activar la opción "debug" en el trigger manual para descargar screenshot

---

## UASD Scraper

Test de conectividad con la API de UASD para datos de asignaturas.

```bash
npm run test:uasd
```
