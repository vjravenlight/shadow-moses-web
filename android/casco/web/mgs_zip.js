// Lee el índice del archivo .mgs (tools/archivo_celular.py): un zip clásico SIN comprimir, para saltar a cualquier archivo.
// Es lo mismo que leerIndice() de la app de celular. Lo usan index.html y sw.js. FeniXVOID · Project Ravenlight
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
    if (d.getUint16(q + 10, true) !== 0) return null;   // sólo sin comprimir
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
