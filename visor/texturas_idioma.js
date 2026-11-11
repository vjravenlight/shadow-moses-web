// MGS web — FeniXVOID · Project Ravenlight
import { idioma } from "./idioma.js";

const indices = new Map;

const imagenes = new Map;

let actual = {
  texto: null,
  voz: null
};

function indice(k) {
  if (k === "en") return Promise.resolve(null);
  if (!indices.has(k)) indices.set(k, fetch(`${idioma.carpeta(k)}texturas/indice.json`).then(r => r.ok ? r.json() : null, () => null));
  return indices.get(k);
}

function imagen(url) {
  let i = imagenes.get(url);
  if (!i && typeof Image !== "undefined") {
    i = new Image;
    i.decoding = "async";
    i.src = url;
    imagenes.set(url, i);
  }
  return i || null;
}

async function preparar() {
  await (idioma.listo || idioma.iniciar());
  const kt = idioma.texto, kv = idioma.voz;
  const [it, iv] = await Promise.all([ indice(kt), indice(kv) ]);
  actual = {
    texto: it ? {
      k: kt,
      t: it.texturas || {}
    } : null,
    voz: iv ? {
      k: kv,
      t: iv.texturas || {},
      muelle: iv.muelle || null
    } : null
  };
  for (const a of [ actual.texto, actual.voz ]) if (a) for (const e of Object.values(a.t)) imagen(`${idioma.carpeta(a.k)}texturas/${e.png}`);
  return actual;
}

export let listo = typeof window !== "undefined" ? preparar() : Promise.resolve(actual);

if (typeof addEventListener === "function") addEventListener("mgs:idioma", () => {
  listo = preparar();
});

export function reemplazo(nombre) {
  if (!nombre) return null;
  const n = String(nombre).replace(/\.pcx$/i, "").replace(/^tex_/, "");
  for (const a of [ actual.voz, actual.texto ]) {
    const e = a?.t?.[n];
    if (!e?.png) continue;
    if (!!e.voz !== (a === actual.voz)) continue;
    const url = `${idioma.carpeta(a.k)}texturas/${e.png}`, img = imagen(url);
    return {
      url: url,
      img: img,
      w: e.w,
      h: e.h,
      listo: !!(img && img.complete && img.naturalWidth)
    };
  }
  return null;
}

export function telopsGuion(lineas) {
  const marcar = ls => ls.map(l => ({
    ...l,
    sinIdioma: true
  }));
  const m = actual.voz?.muelle;
  if (!m?.usa || !m.lista) return marcar(lineas);
  const t = m.usa[lineas.map(l => l.img).join("|")];
  if (t == null) return marcar(lineas);
  return marcar(m.lista[String(t)] || []);
}

export function hashDeRuta(png) {
  return /tex_([0-9a-f]{4})\.png$/.exec(png || "")?.[1] || null;
}

export function desplazamiento(png) {
  const m = /^demos\/(\d+)\/tex_([0-9a-f]{4})\.png$/.exec(png || "");
  if (!m) return null;
  for (const a of [ actual.voz, actual.texto ]) {
    const e = a?.t?.[m[2]];
    if (!e || !!e.voz !== (a === actual.voz)) continue;
    return e.desp?.[m[1]] || null;
  }
  return null;
}
