# Arma Tu Semestre — Scraper UASD + WordPress

Scraper que extrae la **Programación Docente de la UASD** y la publica automáticamente en WordPress.com. Incluye un constructor de horario interactivo servido via GitHub Pages.

## Arquitectura

```
GitHub Actions (cron diario 6:00 UTC)
  │
  ├─▶ API UASD (ProgramacionPorAsignatura)
  │     └─ getAsignaturas + getData por campus
  │
  ├─▶ WordPress.com REST API
  │     ├─ Crea/actualiza posts (una sección = un post)
  │     └─ Crea páginas: /horarios, /sobre-el-proyecto
  │
  └─▶ docs/data/horarios.json  →  GitHub Pages
        └─ Frontend interactivo (constructor de horario)
```

## Setup

### 1. Crear sitio en WordPress.com

1. Crear cuenta y sitio en [wordpress.com](https://wordpress.com)
2. Perfil → Seguridad → **Application Passwords** → crear `armatusemestre-scraper`
3. Guardar usuario y contraseña generada

### 2. GitHub Secrets

En el repo: Settings → Secrets → Actions → New repository secret:

| Secret | Valor |
|--------|-------|
| `WP_SITE_URL` | Dominio del sitio (ej: `armatusemestre.wordpress.com`) |
| `WP_USERNAME` | Tu usuario de WordPress.com |
| `WP_APP_PASSWORD` | Application Password generado |
| `WP_FRONTEND_URL` | *(opcional)* URL del frontend si usas dominio custom |

### 3. GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder: `/docs`

El frontend quedará en: `https://vmdventura.github.io/armatusemestre-scraper/`

### 4. Primer scrape

Actions → "Scrape UASD y sync a WordPress" → Run workflow

Opciones del workflow manual:
- `campus`: Limitar a un campus (CSA/CSN/CSSJ/CSS) para pruebas rápidas
- `skip_wp`: Solo generar JSON sin subir a WordPress

## Ejecución local

```bash
# Solo exportar JSON (sin WordPress)
SKIP_WP=1 node index.mjs

# Campus específico para desarrollo
SKIP_WP=1 WP_TEST_CAMPUS=CSA node index.mjs

# Sincronización completa
WP_SITE_URL=tusitio.wordpress.com \
WP_USERNAME=usuario \
WP_APP_PASSWORD=xxxx \
node index.mjs
```

## Sistema de comentarios

Para filtrar comentarios por correo institucional (@uasd.edu.do):

**Plan Business (con Code Snippets plugin):**
- Copiar `wordpress/comment-filter.php` a un nuevo snippet en Code Snippets

**Todos los planes (moderación manual):**
- WordPress Admin → Configuración → Debate
- Activar "Mantener un comentario en la cola de moderación"
- Aprobar solo correos @uasd.edu.do / @est.uasd.edu.do

## Estructura de archivos

```
├── scraper/
│   ├── uasd.mjs         # Cliente API UASD
│   ├── transform.mjs    # UASD → formato WordPress + parseHorario()
│   ├── wp-client.mjs    # Cliente REST API WordPress.com (upsert + tags)
│   ├── wp-pages.mjs     # Crea páginas en WordPress
│   └── export-json.mjs  # Genera docs/data/horarios.json
├── docs/                # GitHub Pages (frontend)
│   ├── index.html       # Constructor de horario interactivo
│   ├── app.js           # Búsqueda, grilla semanal, detección de conflictos
│   ├── style.css        # Estilos responsive + print
│   └── data/
│       └── horarios.json  # Generado por el scraper (auto-committed)
├── wordpress/
│   └── comment-filter.php  # Snippet PHP para Plan Business
├── index.mjs            # Orquestador principal
└── .github/workflows/
    ├── scrape-and-sync.yml  # Cron diario + dispatch manual
    └── test-uasd.yml        # Test de conectividad UASD
```

## Campus

| Código | Nombre |
|--------|--------|
| CSA | Ciudad Universitaria (Santo Domingo) |
| CSN | Campus Norte |
| CSSJ | San Juan de la Maguana |
| CSS | Santiago |
