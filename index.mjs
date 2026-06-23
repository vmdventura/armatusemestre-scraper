import { scrapeAll } from "./scraper/uasd.mjs";
import { toWpPost } from "./scraper/transform.mjs";
import { createWpClient } from "./scraper/wp-client.mjs";

const {
  WP_SITE_URL,
  WP_USERNAME,
  WP_APP_PASSWORD,
  WP_TEST_CAMPUS,
} = process.env;

if (!WP_SITE_URL || !WP_USERNAME || !WP_APP_PASSWORD) {
  console.error("Faltan variables de entorno: WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD");
  process.exit(1);
}

const campuses = WP_TEST_CAMPUS ? [WP_TEST_CAMPUS] : undefined;

console.log(`[index] Iniciando scrape${campuses ? ` (solo ${campuses.join(", ")})` : " (todos los campus)"}...`);

const secciones = await scrapeAll({
  campuses,
  onProgress({ campus, clave, index, total }) {
    if (index % 50 === 0) console.log(`[index] ${campus}: ${index}/${total} asignaturas procesadas`);
  },
});

console.log(`[index] Scrape completado: ${secciones.length} secciones totales`);

if (secciones.length === 0) {
  console.warn("[index] No se encontraron secciones. Verificar conectividad con la UASD.");
  process.exit(1);
}

// Mostrar muestra de la respuesta real para debugging
console.log("[index] Muestra de datos (primera sección):", JSON.stringify(secciones[0], null, 2));

const wpClient = createWpClient({
  siteUrl: WP_SITE_URL,
  username: WP_USERNAME,
  appPassword: WP_APP_PASSWORD,
});

const wpPosts = secciones.map(toWpPost).filter((p) => p.slug);
const activeSlugs = wpPosts.map((p) => p.slug);

console.log(`[index] Subiendo ${wpPosts.length} posts a WordPress...`);

let created = 0;
let updated = 0;
let errors = 0;

for (let i = 0; i < wpPosts.length; i++) {
  try {
    const result = await wpClient.upsert(wpPosts[i]);
    if (result.action === "created") created++;
    else updated++;
  } catch (err) {
    errors++;
    console.error(`[index] Error en post ${wpPosts[i].slug}:`, err.message);
  }

  if ((i + 1) % 100 === 0) {
    console.log(`[index] Progreso: ${i + 1}/${wpPosts.length} (${created} creados, ${updated} actualizados, ${errors} errores)`);
  }
}

console.log(`[index] Upload completo: ${created} creados, ${updated} actualizados, ${errors} errores`);

console.log("[index] Eliminando posts obsoletos...");
const deleted = await wpClient.deleteStalePosts(activeSlugs);
console.log(`[index] ${deleted} posts obsoletos eliminados`);

console.log(`[index] Finalizado. Resumen: ${created} creados, ${updated} actualizados, ${deleted} eliminados, ${errors} errores`);
