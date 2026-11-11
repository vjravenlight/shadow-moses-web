// MGS web — FeniXVOID · Project Ravenlight
import { idioma } from "./idioma.js";

const GRIS = [ 206, 206, 206 ];

const _json = new Map;

const _listo = new Map;

let base = "assets/";

let nArmados = 0;

const avisar = () => {
  nArmados++;
};

export const armados = () => nArmados;

export function iniciar(b) {
  if (b) base = b;
  precargar();
}

function cargar(k) {
  if (!_json.has(k)) {
    _json.set(k, fetch(`${base}vr/disco/idiomas/${k}.json`).then(r => r.ok ? r.json() : null, () => null).then(j => {
      if (j) _listo.set(k, j);
      return j;
    }).catch(() => null));
  }
  return _json.get(k);
}

export function precargar() {
  try {
    const k = idioma.texto;
    if (k && k !== "en") cargar(k);
  } catch {}
}

if (typeof window !== "undefined") {
  addEventListener("mgs:idioma", e => {
    if (e.detail?.clave === "texto") (idioma.listo || Promise.resolve()).then(precargar);
  });
  (idioma.listo || idioma.iniciar?.())?.then?.(precargar);
}

const clave = cuerpo => (cuerpo || []).join("\n");

export function traduccion(cuerpo) {
  let k;
  try {
    k = idioma.texto;
  } catch {
    return null;
  }
  if (!k || k === "en" || !cuerpo?.length) return null;
  const j = _listo.get(k);
  if (!j) {
    cargar(k);
    return null;
  }
  const e = j.ventanas?.[clave(cuerpo)];
  return e ? {
    k: k,
    e: e,
    fuente: `${base}vr/disco/idiomas/${j.fuente || (k === "ja" ? "ja/ui/" : "eu/ui/")}`
  } : null;
}

export function sinAcentos(s) {
  return String(s || "").replace(/ß/g, "ss").replace(/[¿¡]/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function lienzo(fuente, t, glifos, ancho) {
  return import("./codec.js").then(m => m.lienzoTexto(t, fuente, {
    2: glifos || {}
  }, GRIS, ancho)).catch(() => null);
}

export function ventana(W) {
  if (!W?.lineas || W.lineas.length <= 3) return null;
  const T = traduccion(W.lineas.slice(3));
  if (!T) return null;
  const {e: e, fuente: fuente} = T;
  const lineas = [ ...W.lineas.slice(0, 3), ...e.tj ];
  const n = Math.max(lineas.length, e.n || 0);
  const ancho = (e.w || W.cuadro_ps1?.ancho || 256) + 3 >> 2 << 2, alto = n * 18 + 18;
  const lienzos = lineas.map(() => null);
  lineas.forEach((t, i) => {
    if (!t || !t.trim()) return;
    lienzo(fuente, t, i >= 3 ? e.g : null).then(cv => {
      if (cv) {
        lienzos[i] = cv;
        avisar();
      }
    });
  });
  return {
    lineas: lineas,
    ancho: ancho,
    alto: alto,
    lienzos: lienzos,
    idioma: T.k
  };
}

export function dibujarVentana(x, V, X, Y, quedan) {
  V.lineas.forEach((l, i) => {
    if (quedan <= 0) return;
    const cv = V.lienzos[i], n = l.length || 1;
    if (cv) {
      const w = Math.min(cv.width, Math.ceil(cv.width * Math.min(quedan, n) / n));
      if (w > 0) x.drawImage(cv, 0, 0, w, cv.height, X + 16, Y + 12 + i * 18, w, cv.height);
    }
    quedan -= l.length;
  });
}

const _panel = new Map;

export function panel(e, anchoPanel = 108) {
  if (!e?.texto?.length) return null;
  const T = traduccion(e.texto);
  if (!T) return null;
  if (T.e.l) {
    const l = T.e.l.map(sinAcentos);
    return {
      texto: l,
      sub: /^"/.test(e.sub || "") && /^"/.test(l[0] || "") ? l[0] : null
    };
  }
  const id = `${T.k}|${e.clave}`;
  let p = _panel.get(id);
  if (!p) {
    p = {
      lienzos: []
    };
    _panel.set(id, p);
    T.e.tj.forEach((t, i) => {
      const s = t.replace(/ {2,}/g, " ").trim();
      if (!s) return;
      lienzo(T.fuente, s, T.e.g, anchoPanel).then(cv => {
        if (cv) {
          p.lienzos[i] = cv;
          avisar();
        }
      });
    });
  }
  return {
    lienzos: p.lienzos
  };
}
