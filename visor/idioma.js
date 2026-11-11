// MGS web — FeniXVOID · Project Ravenlight
const leer = k => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const escribir = (k, v) => {
  try {
    localStorage.setItem(k, String(v));
  } catch {}
};

const CLAVES = {
  texto: "sm_idioma_texto",
  voz: "sm_idioma_voz"
};

const VOZ_INTEGRAL = 5e5;

const NOMBRES = {
  en: "ENGLISH",
  es: "CASTELLANO",
  de: "DEUTSCH",
  it: "ITALIANO",
  ja: "JAPONES"
};

class Idioma {
  constructor() {
    this.base = "assets/";
    this.lista = {
      en: {
        nombre: "ENGLISH",
        texto: true,
        voz: true
      }
    };
    this.elegido = {
      texto: leer(CLAVES.texto) || "en",
      voz: leer(CLAVES.voz) || "en"
    };
    this._mapas = new Map;
    this.listo = null;
  }
  iniciar(base) {
    if (base) this.base = base;
    if (!this.listo) {
      this.listo = fetch(this.base + "idiomas/indice.json").then(r => r.ok ? r.json() : null, () => null).then(j => {
        if (j?.idiomas) for (const [k, v] of Object.entries(j.idiomas)) this.lista[k] = {
          ...v,
          nombre: v.nombre || NOMBRES[k] || k.toUpperCase()
        };
        return this;
      });
    }
    return this.listo;
  }
  opciones(clave) {
    return Object.keys(this.lista).filter(k => k === "en" || this.lista[k]?.[clave]);
  }
  nombre(k) {
    return this.lista[k]?.nombre || NOMBRES[k] || String(k).toUpperCase();
  }
  get texto() {
    const k = this.elegido.texto;
    return k !== "en" && this.lista[k]?.texto ? k : "en";
  }
  get voz() {
    const k = this.elegido.voz;
    return k !== "en" && this.lista[k]?.voz ? k : "en";
  }
  poner(clave, valor) {
    if (!(clave in CLAVES)) return;
    this.elegido[clave] = valor;
    escribir(CLAVES[clave], valor);
    try {
      dispatchEvent(new CustomEvent("mgs:idioma", {
        detail: {
          clave: clave,
          valor: valor
        }
      }));
    } catch {}
  }
  rotar(clave, dir = 1) {
    const ops = this.opciones(clave);
    if (!ops.length) return "en";
    const i = ops.indexOf(this.elegido[clave]), j = ((i < 0 ? 0 : i) + dir + ops.length) % ops.length;
    this.poner(clave, ops[j]);
    return ops[j];
  }
  carpeta(k) {
    return k === "en" ? this.base : `${this.base}idiomas/${k}/`;
  }
  mapa(k, raiz = this.base) {
    if (k === "en") return Promise.resolve(null);
    const clave = raiz + k;
    if (!this._mapas.has(clave)) {
      this._mapas.set(clave, fetch(`${raiz}idiomas/${k}/vox/mapa.json`).then(r => r.ok ? r.json() : {}, () => ({})).then(j => {
        const directo = new Map, inverso = new Map;
        for (const [u, v] of Object.entries(j || {})) {
          directo.set(+u, v);
          if (!inverso.has(v)) inverso.set(v, +u);
        }
        return {
          directo: directo,
          inverso: inverso
        };
      }));
    }
    return this._mapas.get(clave);
  }
  async resolverVoz(id, desde = "en", voz = this.voz, raiz = this.base) {
    const vox = k => k === "en" ? `${raiz}codec/vox/` : `${raiz}idiomas/${k}/vox/`;
    if (id >= VOZ_INTEGRAL && id < VOZ_INTEGRAL + 2e5) return [ [ `${raiz}integral/vox/`, id - VOZ_INTEGRAL ] ];
    if (desde === "en" && voz === "en") return [ [ vox("en"), id ] ];
    const out = [];
    let usa = desde === "en" ? id : (await this.mapa(desde, raiz))?.inverso.get(id);
    if (desde === voz) out.push([ vox(voz), id ]); else if (voz !== "en" && usa != null) {
      const m = (await this.mapa(voz, raiz))?.directo.get(usa);
      if (m != null) out.push([ vox(voz), m ]);
    }
    if (usa != null) out.push([ vox("en"), usa ]);
    if (desde !== "en" && desde !== voz) out.push([ vox(desde), id ]);
    return out;
  }
}

export const idioma = new Idioma;

if (typeof globalThis !== "undefined") globalThis.mgsIdioma = idioma;

if (typeof window !== "undefined") idioma.iniciar();
