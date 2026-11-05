// MGS web — FeniXVOID · Project Ravenlight
const VERSION = "65b9d0479e42";

const C_CODIGO = "mgs-codigo-" + VERSION, C_ASSETS = "mgs-assets", C_META = "mgs-meta";

const ALCANCE = self.registration.scope;

const RUTA = new URL(ALCANCE).pathname;

const MANIFIESTO = ALCANCE + "assets/offline.json";

const K_ACTIVO = ALCANCE + "__mgs/manifiesto-activo.json", K_CLIENTES = ALCANCE + "__mgs/clientes.json";

const kManifiesto = v => ALCANCE + "__mgs/manifiesto-" + v + ".json";

const ESPERA_RED = 4e3;

const TIPOS = {
  m4a: "audio/mp4",
  mp4: "video/mp4",
  wav: "audio/wav",
  png: "image/png",
  json: "application/json",
  glb: "model/gltf-binary",
  woff: "font/woff"
};

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const r = await fetch(MANIFIESTO, {
      cache: "reload"
    });
    if (!r.ok) throw new Error("sin offline.json");
    const m = await r.clone().json();
    const c = await caches.open(C_CODIGO);
    const lista = (m.codigo || []).map(x => x[0]);
    await enParalelo(lista, 4, async p => {
      for (let k = 0; ;k++) {
        try {
          const q = await fetch(new Request(ALCANCE + p, {
            cache: "reload"
          }));
          if (q.ok) {
            await c.put(ALCANCE + p, q);
            return;
          }
          if (q.status === 404) return;
          throw new Error(`${p}: ${q.status}`);
        } catch (err) {
          if (k >= 3) throw err;
          await new Promise(r => setTimeout(r, 1500 * (k + 1)));
        }
      }
    });
    await (await caches.open(C_META)).put(kManifiesto(VERSION), r);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const meta = await caches.open(C_META);
    const nuevoR = await meta.match(kManifiesto(VERSION));
    const nuevo = nuevoR ? await nuevoR.clone().json() : null;
    const viejoR = await meta.match(K_ACTIVO);
    const viejo = viejoR ? await viejoR.json().catch(() => null) : null;
    if (nuevo && viejo && viejo.version !== nuevo.version) {
      const ahora = new Map(nuevo.assets.map(x => [ x[0], x[2] ]));
      const c = await caches.open(C_ASSETS);
      let n = 0;
      for (const [a, , h] of viejo.assets || []) if (ahora.get(a) !== h && await c.delete(new URL(a, ALCANCE).href)) n++;
      if (n) console.log(`[sw] ${n} assets cambiaron en la versión ${VERSION}: se vuelven a bajar`);
    }
    if (nuevoR) await meta.put(K_ACTIVO, nuevoR);
    await self.clients.claim();
    await limpiarVersiones();
    for (const cl of await self.clients.matchAll({
      type: "window"
    })) cl.postMessage({
      tipo: "mgs-version",
      version: VERSION
    });
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(ALCANCE)) return;
  if (req.headers.get("X-MGS-Descarga")) return;
  const rel = new URL(req.url).pathname.slice(RUTA.length);
  if (rel === "sw.js" || rel.endsWith(".php") || rel.startsWith("__mgs/")) return;
  if (rel === "assets/offline.json") {
    e.respondWith(manifiesto(req));
    return;
  }
  if (rel.startsWith("assets/")) {
    e.respondWith(asset(e, req, rel));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(navegacion(e, req, rel));
    return;
  }
  e.respondWith(codigo(e, req, rel));
});

self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.tipo === "mgs-version") e.source?.postMessage({
    tipo: "mgs-version",
    version: VERSION
  });
});

async function asset(e, req, rel) {
  const clave = ALCANCE + rel;
  const c = await caches.open(C_ASSETS);
  let r = await c.match(clave, {
    ignoreSearch: true,
    ignoreVary: true
  });
  if (!r) {
    let red;
    try {
      red = await fetch(clave, {
        cache: "no-cache"
      });
    } catch {
      avisarFalta(e, rel);
      return sinSenal(rel);
    }
    if (!(red.ok && red.status === 200)) return red;
    e.waitUntil(c.put(clave, red.clone()).catch(err => console.warn("[sw] no se pudo guardar", rel, err?.name)));
    r = red;
  }
  const rango = req.headers.get("Range");
  return rango ? recortar(r, rango, rel) : r;
}

async function recortar(r, rango, rel) {
  const b = await r.blob(), m = /bytes=(\d*)-(\d*)/.exec(rango), n = b.size;
  let a = m && m[1] !== "" ? +m[1] : null, z = m && m[2] !== "" ? +m[2] : null;
  if (a == null && z != null) {
    a = Math.max(0, n - z);
    z = n - 1;
  }
  if (a == null) a = 0;
  if (z == null || z >= n) z = n - 1;
  if (a >= n || a > z) return new Response("", {
    status: 416,
    headers: {
      "Content-Range": `bytes */${n}`
    }
  });
  const tipo = (r.headers.get("Content-Type") || "").replace(/^application\/octet-stream.*$/, "") || TIPOS[rel.split(".").pop()] || "application/octet-stream";
  return new Response(b.slice(a, z + 1, tipo), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": tipo,
      "Content-Range": `bytes ${a}-${z}/${n}`,
      "Content-Length": String(z - a + 1),
      "Accept-Ranges": "bytes"
    }
  });
}

async function manifiesto(req) {
  const red = fetch(req);
  return redPrimero(red, async () => (await caches.open(C_META)).match(K_ACTIVO), ESPERA_RED).catch(() => sinSenal("assets/offline.json"));
}

async function navegacion(e, req, rel) {
  const id = e.resultingClientId;
  const red = fetch(req);
  let deCache = false;
  const copia = async () => {
    const c = await caches.open(C_CODIGO);
    const r = rel && await c.match(ALCANCE + rel, {
      ignoreSearch: true
    }) || await c.match(ALCANCE + "index.html");
    if (r) deCache = true;
    return r;
  };
  try {
    const r = await redPrimero(red, copia, ESPERA_RED);
    await anotar(id, deCache ? VERSION : "red");
    return r;
  } catch {
    return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Sin señal</title><body style="background:#000;color:#b4f4ac;font:16px monospace;padding:24px;text-transform:uppercase">\n<h1 style="font-size:20px">Sin señal</h1><p>El juego todavía no quedó guardado en este equipo. Abrilo una vez con señal y usá\nOPCIONES &gt; JUGAR SIN SEÑAL &gt; DESCARGAR.</p><p><a style="color:#7fb08c" href="">Reintentar</a></p></body>`, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-MGS-Sin-Senal": "1"
      }
    });
  }
}

async function codigo(e, req, rel) {
  const modo = await modoDe(e.clientId);
  const clave = ALCANCE + rel;
  if (modo && modo !== "red") {
    const r = await (await caches.open("mgs-codigo-" + modo)).match(clave, {
      ignoreSearch: true
    });
    if (r) return r;
  }
  const copia = async () => {
    const r = await (await caches.open(C_CODIGO)).match(clave, {
      ignoreSearch: true
    });
    return r || caches.match(clave, {
      ignoreSearch: true
    });
  };
  try {
    const r = await redPrimero(fetch(req), copia, ESPERA_RED * 2);
    if (r.ok && r.status === 200 && r.type === "basic" && /\.(js|html|webmanifest)$/.test(rel)) {
      const otra = r.clone();
      e.waitUntil(caches.open(C_CODIGO).then(async c => {
        if (!await c.match(clave)) await c.put(clave, otra);
      }).catch(() => {}));
    }
    return r;
  } catch {
    avisarFalta(e, rel);
    return sinSenal(rel);
  }
}

async function redPrimero(red, respaldo, ms) {
  red.catch(() => {});
  let t;
  const tarde = new Promise(ok => {
    t = setTimeout(() => ok("tarde"), ms);
  });
  try {
    const g = await Promise.race([ red, tarde ]);
    if (g !== "tarde") return g;
    const c = await respaldo();
    return c || await red;
  } catch {
    const c = await respaldo();
    if (c) return c;
    throw new Error("sin red ni copia");
  } finally {
    clearTimeout(t);
  }
}

function sinSenal(rel) {
  return new Response("Sin señal y sin copia guardada: " + rel, {
    status: 504,
    statusText: "Sin senal",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-MGS-Sin-Senal": "1",
      "Cache-Control": "no-store"
    }
  });
}

async function avisarFalta(e, rel) {
  try {
    const c = e.clientId && await self.clients.get(e.clientId);
    const destinos = c ? [ c ] : await self.clients.matchAll({
      type: "window"
    });
    for (const d of destinos) d.postMessage({
      tipo: "mgs-falta",
      archivo: rel
    });
  } catch {}
}

async function enParalelo(lista, n, fn) {
  let i = 0;
  await Promise.all(Array.from({
    length: Math.min(n, lista.length)
  }, async () => {
    while (i < lista.length) await fn(lista[i++]);
  }));
}

let mapa = null;

async function leerMapa() {
  if (mapa) return mapa;
  try {
    const r = await (await caches.open(C_META)).match(K_CLIENTES);
    mapa = r ? await r.json() : {};
  } catch {
    mapa = {};
  }
  return mapa;
}

async function modoDe(id) {
  if (!id) return null;
  return (await leerMapa())[id] || null;
}

async function anotar(id, modo) {
  if (!id) return;
  const m = await leerMapa();
  m[id] = modo;
  await limpiarVersiones(id);
}

async function limpiarVersiones(nueva = null) {
  const m = await leerMapa();
  const vivas = new Set((await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window"
  })).map(c => c.id));
  if (nueva) vivas.add(nueva);
  for (const id of Object.keys(m)) if (!vivas.has(id)) delete m[id];
  try {
    await (await caches.open(C_META)).put(K_CLIENTES, new Response(JSON.stringify(m), {
      headers: {
        "Content-Type": "application/json"
      }
    }));
  } catch {}
  const usadas = new Set([ C_CODIGO, ...Object.values(m).filter(v => v !== "red").map(v => "mgs-codigo-" + v) ]);
  for (const k of await caches.keys()) {
    if (k.startsWith("mgs-codigo-") && !usadas.has(k)) await caches.delete(k);
  }
  const meta = await caches.open(C_META);
  for (const q of await meta.keys()) if (/manifiesto-(?!activo)/.test(q.url) && q.url !== kManifiesto(VERSION)) await meta.delete(q);
}
