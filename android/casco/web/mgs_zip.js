// Lee los archivos .mgs (tools/archivo_celular.py): zips clásicos SIN comprimir, para saltar a cualquier archivo. Es lo
// mismo que leerIndice() de la app de celular. Lo usan index.html, juego.html (visor/partes.js) y sw.js.
// 2.12: el .mgs puede venir ENTERO (MGSweb_datos.mgs, también los viejos) o EN PARTES (MGS_disco1.mgs, MGS_disco2.mgs,
// MGS_vr_missions.mgs, MGS_integral.mgs, MGS_idioma_xx.mgs): cada parte trae mgs_parte.json. Todas se guardan en el
// almacenamiento privado del navegador (OPFS) y sw.js las junta. En Safari viejo (sin createWritable) se escribe desde
// un worker (mgs_opfs_escribir.js). FeniXVOID · Project Ravenlight
self.mgsIndice = async function (archivo) {
  const tam = archivo.size;
  if (tam < 22) return null;
  const cola = Math.min(tam, 65557), iniCola = tam - cola;
  const fin = new DataView(await archivo.slice(iniCola, tam).arrayBuffer());
  let p = -1;
  for (let i = cola - 22; i >= 0; i--) if (fin.getUint32(i, true) === 0x06054b50) { p = i; break; }
  if (p < 0) return null;
  const total = fin.getUint16(p + 10, true), tamDir = fin.getUint32(p + 12, true), iniDir = fin.getUint32(p + 16, true);
  if (iniDir + tamDir > tam) return null;
  const crudo = new Uint8Array(await archivo.slice(iniDir, iniDir + tamDir).arrayBuffer()), d = new DataView(crudo.buffer);
  const texto = new TextDecoder(), ind = new Map();
  let q = 0;
  for (let i = 0; i < total; i++) {
    if (q + 46 > crudo.length || d.getUint32(q, true) !== 0x02014b50) return null;
    // sólo sin comprimir
    if (d.getUint16(q + 10, true) !== 0) return null;
    const tamano = d.getUint32(q + 24, true), local = d.getUint32(q + 42, true);
    const n = d.getUint16(q + 28, true), x = d.getUint16(q + 30, true), k = d.getUint16(q + 32, true);
    ind.set(texto.decode(crudo.subarray(q + 46, q + 46 + n)), { local, tamano });
    q += 46 + n + x + k;
  }
  return ind;
};
/** Dónde empiezan los datos de una entrada: el encabezado local tiene su propio largo de nombre y de extra. */
self.mgsInicio = async function (archivo, e) {
  if (e.datos == null) {
    const h = new DataView(await archivo.slice(e.local, e.local + 30).arrayBuffer());
    if (h.getUint32(0, true) !== 0x04034b50) throw new Error('encabezado local roto');
    e.datos = e.local + 30 + h.getUint16(26, true) + h.getUint16(28, true);
  }
  return e.datos;
};
/** Un .json de adentro del .mgs, o null. */
self.mgsJSON = async function (archivo, ind, nombre) {
  const e = ind.get(nombre);
  if (!e) return null;
  try { const a = await self.mgsInicio(archivo, e); return JSON.parse(await archivo.slice(a, a + e.tamano).text()); } catch { return null; }
};
/**
 * Qué es un .mgs: { ind, parte, info, partes } o null si no sirve. parte = 'entero' (todo junto, también los viejos sin
 * mgs_parte.json) o 'disco1', 'disco2', 'vr_missions', 'integral', 'idioma_es'… partes = partes.json (qué hay en cada parte).
 */
self.mgsParte = async function (archivo) {
  const ind = await self.mgsIndice(archivo).catch(() => null);
  if (!ind) return null;
  const info = await self.mgsJSON(archivo, ind, 'mgs_parte.json');
  const parte = info?.parte || (ind.has('discos.json') ? 'entero' : null);
  if (!parte || !/^[a-z0-9_]+$/.test(parte)) return null;
  if ((parte === 'entero' || parte === 'disco1') && !ind.has('discos.json')) return null;
  return { ind, parte, info, partes: await self.mgsJSON(archivo, ind, 'partes.json') };
};
/** El nombre con que se guarda cada parte en el aparato (el entero conserva el de siempre: los cascos que ya lo tienen siguen igual). */
self.mgsNombre = (parte) => (parte === 'entero' ? 'MGSweb_datos.mgs' : 'MGS_' + parte + '.mgs');
const MGS_CONOCIDOS = ['MGSweb_datos.mgs', ...['disco1', 'disco2', 'vr_missions', 'integral', 'idioma_es', 'idioma_de', 'idioma_it', 'idioma_ja', 'idioma_fr'].map((p) => 'MGS_' + p + '.mgs')];
/** Los .mgs guardados en este navegador: [{ nombre, archivo }]. */
self.mgsListar = async function () {
  const raiz = await navigator.storage.getDirectory();
  const lista = [];
  try {
    for await (const [nombre, h] of raiz.entries()) if (h.kind === 'file' && /\.mgs$/i.test(nombre)) lista.push({ nombre, archivo: await h.getFile() });
  // sin entries(): los nombres que puede haber
  } catch {
    for (const nombre of MGS_CONOCIDOS) { try { lista.push({ nombre, archivo: await (await raiz.getFileHandle(nombre)).getFile() }); } catch {} }
  }
  return lista;
};
self.mgsBorrar = async function (nombre) { await (await navigator.storage.getDirectory()).removeEntry(nombre).catch(() => {}); };
/**
 * Junta los .mgs guardados: { mapa: Map(ruta -> { archivo, e }), cargadas: [{ parte, archivo, bytes }], partes }.
 * Si hay un entero y partes a la vez, gana el entero (index.html no deja que pase).
 */
self.mgsJuntar = async function (lista) {
  const ORDEN = ['entero', 'disco1', 'disco2', 'vr_missions', 'integral'];
  const abiertos = [];
  for (const { nombre, archivo } of lista) { const p = await self.mgsParte(archivo); if (p) abiertos.push({ nombre, archivo, ...p }); }
  const pos = (p) => { const i = ORDEN.indexOf(p); return i < 0 ? ORDEN.length : i; };
  abiertos.sort((a, b) => pos(a.parte) - pos(b.parte) || a.parte.localeCompare(b.parte));
  const mapa = new Map(), cargadas = [], vistas = new Set();
  let partes = null;
  for (const a of abiertos) {
    if (vistas.has(a.parte)) continue;
    vistas.add(a.parte);
    cargadas.push({ parte: a.parte, archivo: a.nombre, bytes: a.archivo.size });
    if (!partes && a.partes) partes = a.partes;
    for (const [rel, e] of a.ind) if (!mapa.has(rel)) mapa.set(rel, { archivo: a.archivo, e });
  }
  return { mapa, cargadas, partes };
};
/**
 * Guarda un archivo elegido por el jugador en este navegador, en trozos y con avance (0..1). Con createWritable donde
 * está (Chrome, el navegador del Quest, Safari nuevo); si no, desde un worker con createSyncAccessHandle (Safari de iPhone
 * desde 15.2). ?opfs=worker en la dirección fuerza el worker (para probarlo en la PC).
 */
self.mgsGuardar = async function (archivo, nombre, alAvance = () => {}) {
  const raiz = await navigator.storage.getDirectory();
  const forzarWorker = typeof location !== 'undefined' && /[?&]opfs=worker\b/.test(location.search);
  if (!forzarWorker && self.FileSystemFileHandle?.prototype.createWritable) {
    const h = await raiz.getFileHandle(nombre, { create: true });
    const w = await h.createWritable();
    try {
      const TROZO = 16 * 1048576;
      for (let a = 0; a < archivo.size; a += TROZO) { await w.write(archivo.slice(a, a + TROZO)); alAvance(Math.min(1, (a + TROZO) / archivo.size)); }
      await w.close();
    } catch (e) { await w.abort?.().catch(() => {}); throw e; }
    return;
  }
  if (typeof Worker === 'undefined') throw Object.assign(new Error('sin worker'), { name: 'NotSupportedError' });
  await new Promise((ok, mal) => {
    const w = new Worker(new URL('mgs_opfs_escribir.js', location.href));
    w.onmessage = (e) => {
      const d = e.data || {};
      if (d.avance != null) alAvance(d.avance);
      if (d.listo) { w.terminate(); ok(); }
      if (d.error) { w.terminate(); mal(Object.assign(new Error(d.mensaje || d.error), { name: d.error })); }
    };
    w.onerror = (e) => { w.terminate(); mal(new Error(e.message || 'worker')); };
    w.postMessage({ nombre, archivo });
  });
};
/** ¿Puede este navegador guardar los .mgs? */
self.mgsPuedeGuardar = () => !!(self.navigator?.storage?.getDirectory && (self.FileSystemFileHandle?.prototype.createWritable || self.FileSystemFileHandle?.prototype.createSyncAccessHandle || typeof Worker !== 'undefined'));
// En la página: si el service worker no puede abrir el almacenamiento privado (pasa en algunos Safari), le pasa los
// archivos guardados cuando los pide. Un File se copia entre la página y el worker sin leerlo entero.
if (typeof window !== 'undefined' && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.tipo !== 'mgs-pedir-archivos' || !e.ports?.[0]) return;
    self.mgsListar().then((archivos) => e.ports[0].postMessage({ archivos }), () => e.ports[0].postMessage({ archivos: [] }));
  });
  try { navigator.serviceWorker.startMessages?.(); } catch {}
}
