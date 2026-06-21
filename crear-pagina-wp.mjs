#!/usr/bin/env node
/**
 * Crea la página "Cartelera de Cine" en rdparty.com via WordPress REST API
 * Uso: node crear-pagina-wp.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE     = 'https://rdparty.com/home';
const USER     = 'Claude';
const APP_PASS = 'VGJr UfIb QFbe ilqu 87M1 GjWV';

const widget = fs.readFileSync(path.join(__dirname, 'wordpress-widget.html'), 'utf-8');
const content = `<!-- wp:html -->\n${widget}\n<!-- /wp:html -->`;

const credentials = Buffer.from(`${USER}:${APP_PASS}`).toString('base64');

const res = await fetch(`${SITE}/wp-json/wp/v2/pages`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Cartelera de Cine',
    content,
    status: 'draft',
    slug: 'cartelera-de-cine',
  }),
});

const data = await res.json();

if (res.ok) {
  console.log('✅ Página creada en borrador!');
  console.log(`   Ver:   ${data.link}`);
  console.log(`   Editar: ${SITE}/wp-admin/post.php?post=${data.id}&action=edit`);
} else {
  console.error('❌ Error:', data.code, data.message);
}
