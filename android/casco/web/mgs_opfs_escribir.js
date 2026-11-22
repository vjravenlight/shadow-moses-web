// Escribe un .mgs en el almacenamiento privado del navegador (OPFS) desde un worker, con createSyncAccessHandle: lo que
// tiene Safari de iPhone antes de createWritable. Lo llama mgs_zip.js (mgsGuardar). Recibe { nombre, archivo } y contesta
// { avance } varias veces y al final { listo } o { error, mensaje }. FeniXVOID · Project Ravenlight
self.onmessage = async (e) => {
  const { nombre, archivo } = e.data || {};
  let acceso = null;
  try {
    const raiz = await navigator.storage.getDirectory();
    const h = await raiz.getFileHandle(nombre, { create: true });
    acceso = await h.createSyncAccessHandle();
    // en Safari 15.2 a 16.x truncate/flush/close devolvían una promesa (la especificación cambió después): con await sirven las dos
    await acceso.truncate(0);
    const TROZO = 8 * 1048576;
    let pos = 0;
    while (pos < archivo.size) {
      const buf = new Uint8Array(await archivo.slice(pos, pos + TROZO).arrayBuffer());
      let hecho = 0;
      while (hecho < buf.length) {
        const n = await acceso.write(buf.subarray(hecho), { at: pos + hecho });
        if (!(n > 0)) throw Object.assign(new Error('no se pudo escribir'), { name: 'QuotaExceededError' });
        hecho += n;
      }
      pos += buf.length;
      self.postMessage({ avance: pos / archivo.size });
    }
    await acceso.flush();
    await acceso.close(); acceso = null;
    self.postMessage({ listo: true });
  } catch (err) {
    try { if (acceso) await acceso.close(); } catch {}
    self.postMessage({ error: err?.name || 'Error', mensaje: String(err?.message || err) });
  }
};
