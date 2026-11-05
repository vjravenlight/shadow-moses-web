// Service worker de /casco/: le sirve al juego los assets desde el .mgs guardado en este navegador (OPFS), con rangos para
// voces y videos. El código se guarda al instalar: después de la primera vez se juega sin señal. No sube nada a ningún lado.
// FeniXVOID · Project Ravenlight
importScripts('mgs_zip.js');
const VERSION = '__VERSION__';
const C_CODIGO = 'casco-codigo-' + VERSION, ARCHIVO = 'MGSweb_datos.mgs';
const ALCANCE = new URL(self.registration.scope).pathname, RUTA_ASSETS = ALCANCE + 'assets/';
const TIPOS = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', mp4: 'video/mp4', m4a: 'audio/mp4', woff: 'font/woff', woff2: 'font/woff2', glb: 'model/gltf-binary',
  webmanifest: 'application/manifest+json' };
const tipo = (r) => TIPOS[r.split('.').pop().toLowerCase()] || 'application/octet-stream';

let datos = null;   // promesa de { archivo, ind }
function abrir() {
  if (!datos) datos = (async () => {
    const raiz = await navigator.storage.getDirectory();
    const archivo = await (await raiz.getFileHandle(ARCHIVO)).getFile();
    const ind = await self.mgsIndice(archivo);
    if (!ind?.has('discos.json')) throw new Error('archivo inválido');
    return { archivo, ind };
  })().catch((e) => { datos = null; throw e; });
  return datos;
}

async function asset(req, rel) {
  let d = null;
  try { d = await abrir(); } catch {}
  const e = d?.ind.get(rel);
  if (!e) return fetch(req);   // los íconos de instalar la app están en el hosting; lo demás da 404
  const ini = await self.mgsInicio(d.archivo, e), tam = e.tamano;
  const enc = { 'Content-Type': tipo(rel), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    let a = m[1] ? +m[1] : Math.max(0, tam - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], tam - 1) : tam - 1;
    if (a > b || a >= tam) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${tam}` } });
    return new Response(d.archivo.slice(ini + a, ini + b + 1), { status: 206, headers: { ...enc, 'Content-Length': String(b - a + 1), 'Content-Range': `bytes ${a}-${b}/${tam}` } });
  }
  return new Response(d.archivo.slice(ini, ini + tam), { status: 200, headers: { ...enc, 'Content-Length': String(tam) } });
}

// Código: primero la red, para recibir arreglos; sin señal o si tarda más de 4 s, la copia.
async function codigo(req) {
  const c = await caches.open(C_CODIGO);
  const copia = await c.match(req, { ignoreSearch: true });
  const red = fetch(req).then((r) => { if (r.ok && r.status === 200 && r.type === 'basic') c.put(req, r.clone()).catch(() => {}); return r; });
  if (!copia) return red;
  red.catch(() => {});
  return Promise.race([red.catch(() => copia), new Promise((ok) => setTimeout(() => ok(copia), 4000))]);
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const lista = await (await fetch('lista.json', { cache: 'no-cache' })).json();
    const c = await caches.open(C_CODIGO);
    // de a pocos y sin addAll: un archivo que falle no tiene que tirar la instalación entera (lo pide de nuevo al usarlo)
    for (let i = 0; i < lista.length; i += 6) await Promise.allSettled(lista.slice(i, i + 6).map((r) => c.add(new Request(r, { cache: 'no-cache' }))));
  })());
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('casco-codigo-') && k !== C_CODIGO) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', (e) => { if (e.data === 'casco-datos-cambiaron') datos = null; });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(ALCANCE)) return;
  if (u.pathname.startsWith(RUTA_ASSETS)) { e.respondWith(asset(e.request, decodeURIComponent(u.pathname.slice(RUTA_ASSETS.length)))); return; }
  e.respondWith(codigo(e.request));
});
