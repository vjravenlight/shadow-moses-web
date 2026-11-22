// Service worker de /casco/ (y de /iphone/, 2.12): le sirve al juego los assets desde los .mgs guardados en este navegador
// (OPFS), con rangos para voces y videos. El código se guarda al instalar: después de la primera vez se juega sin señal.
// No sube nada a ningún lado.
// 2.12: junta varios .mgs (el entero de siempre o las partes: disco 1, disco 2, VR Missions, Integral, idiomas; mgs_zip.js)
// y contesta assets/_partes_cargadas.json con lo que hay, para que visor/partes.js pida lo que falta. Si este navegador no
// deja abrir el almacenamiento privado desde el service worker (algunos Safari), le pide los archivos a la página.
// FeniXVOID · Project Ravenlight
importScripts('mgs_zip.js');
const VERSION = '__VERSION__';
const C_CODIGO = 'casco-codigo-' + VERSION;
const ALCANCE = new URL(self.registration.scope).pathname, RUTA_ASSETS = ALCANCE + 'assets/';
// prueba: como un Safari sin OPFS en el service worker
const SIN_OPFS = new URL(location.href).searchParams.get('prueba') === 'sinopfs';
const TIPOS = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', mp4: 'video/mp4', m4a: 'audio/mp4', woff: 'font/woff', woff2: 'font/woff2', glb: 'model/gltf-binary',
  webmanifest: 'application/manifest+json' };
const tipo = (r) => TIPOS[r.split('.').pop().toLowerCase()] || 'application/octet-stream';

async function pedirALaPagina() {
  const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of cs) {
    const r = await new Promise((ok) => {
      const ch = new MessageChannel(), t = setTimeout(() => ok(null), 3000);
      ch.port1.onmessage = (e) => { clearTimeout(t); ok(e.data); };
      c.postMessage({ tipo: 'mgs-pedir-archivos' }, [ch.port2]);
    });
    if (r?.archivos?.length) return r.archivos;
  }
  return [];
}
async function listado() {
  if (!SIN_OPFS) { try { const l = await self.mgsListar(); if (l.length) return l; } catch {} }
  return pedirALaPagina();
}

// promesa de { mapa, cargadas, partes }
let datos = null;
function abrir() {
  if (!datos) datos = (async () => {
    const d = await self.mgsJuntar(await listado());
    if (!d.mapa.has('discos.json')) throw new Error('sin datos');
    return d;
  })().catch((e) => { datos = null; throw e; });
  return datos;
}

async function asset(req, rel) {
  let d = null;
  try { d = await abrir(); } catch {}
  // lo lee visor/partes.js: qué partes hay en este aparato
  if (rel === '_partes_cargadas.json') {
    const cuerpo = JSON.stringify({ formato: 1, cargadas: d ? d.cargadas : [] });
    return new Response(cuerpo, { headers: { 'Content-Type': tipo(rel), 'Cache-Control': 'no-store' } });
  }
  const x = d?.mapa.get(rel);
  // los íconos de instalar la app están en el hosting; lo demás da 404
  if (!x) return fetch(req);
  const { archivo, e } = x;
  const ini = await self.mgsInicio(archivo, e), tam = e.tamano;
  const enc = { 'Content-Type': tipo(rel), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    let a = m[1] ? +m[1] : Math.max(0, tam - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], tam - 1) : tam - 1;
    if (a > b || a >= tam) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${tam}` } });
    return new Response(archivo.slice(ini + a, ini + b + 1), { status: 206, headers: { ...enc, 'Content-Length': String(b - a + 1), 'Content-Range': `bytes ${a}-${b}/${tam}` } });
  }
  return new Response(archivo.slice(ini, ini + tam), { status: 200, headers: { ...enc, 'Content-Length': String(tam) } });
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
