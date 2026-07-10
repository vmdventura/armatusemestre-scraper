# CiudadanoRD API — versión PHP (BanaHosting / cPanel)

Versión del backend en un solo archivo PHP, lista para hosting compartido.

## Instalación en BanaHosting (5 minutos)

1. Entra a **cPanel → Administrador de archivos**
2. Ve a `public_html` y crea una carpeta llamada `api`
3. Sube estos 2 archivos dentro de `public_html/api/`:
   - `api.php`
   - `.htaccess`
4. Listo. Prueba en tu navegador:

```
https://TUDOMINIO.com/api/health
https://TUDOMINIO.com/api/combustibles
https://TUDOMINIO.com/api/divisas
https://TUDOMINIO.com/api/clima
https://TUDOMINIO.com/api/apagones/sectores
https://TUDOMINIO.com/api/apagones/Piantini
https://TUDOMINIO.com/api/loteria
```

> Si las rutas limpias no funcionan, usa el formato directo:
> `https://TUDOMINIO.com/api/api.php?r=combustibles`

## Conectar la app móvil

Edita `app/src/config.js`:

```js
export const API_BASE = 'https://TUDOMINIO.com';
```

Con HTTPS del hosting ya no necesitas la excepción de App Transport Security
ni tener la Mac encendida — la app funciona desde cualquier red.

## Características

- **Caché en archivos** (carpeta `cache/` autocreada): divisas 15 min,
  clima 30 min, combustibles 1 h
- **CORS abierto** para la app móvil
- **Datos deterministas**: apagones y lotería generan los mismos valores
  durante todo el día (semilla por fecha)
- Requiere PHP 7.4+ con cURL (estándar en BanaHosting)
