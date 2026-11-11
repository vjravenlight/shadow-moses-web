// MGS web — FeniXVOID · Project Ravenlight
import { ESCENARIOS_ES } from "./nombres.js";

import { idioma } from "./idioma.js";

import * as ctl from "./controles.js";

const jsonDe = url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);

const sinTildes = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¡¿]/g, "");

const lugarDe = st => String(ESCENARIOS_ES[st] || ESCENARIOS_ES[String(st).replace(/r$/, "")] || st).replace(/\s*\(cinem[aá]tica\)/i, "");

const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const primeraLinea = t => String(t || "").split("\n").join(" ").replace(/\s+/g, " ").trim();

const VIDEO_TRAS = {
  "38d0": 34177,
  6137: 55363,
  2302: 55363,
  "97ed": 55363,
  "9cd7": 252256,
  e80c: 255286,
  ee52: 285691,
  "22b4": 290100
};

const VIDEO_ST = {
  "38d0": "s04b",
  6137: "s08b",
  2302: "s08b",
  "97ed": "s08b",
  "9cd7": "d18a",
  e80c: "d18a",
  ee52: "ending",
  "22b4": "ending"
};

const VIDEO_ORDEN = [ "38d0", "6137", "2302", "97ed", "9cd7", "e80c", "ee52", "22b4" ];

const CSS = `\n.gal-capa{position:fixed;inset:0;z-index:46;background:#000;color:#b4f4ac;font-family:'MGS8',Consolas,monospace;display:flex;flex-direction:column;\n  user-select:none;-webkit-user-select:none;text-transform:none;letter-spacing:normal}\n.gal-cab{padding:14px 16px 8px;border-bottom:1px solid #2f4a39;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}\n.gal-cab h2{margin:0;font-size:20px;font-weight:normal;color:#b4f4ac;flex:1 1 auto}\n.gal-cab button,.gal-pie button{background:#041008;color:#9fd8a0;border:1px solid #2f4a39;font:inherit;font-size:13px;padding:6px 10px;cursor:pointer}\n.gal-cab button:hover,.gal-pie button:hover{border-color:#b4f4ac;color:#b4f4ac}\n.gal-lista{flex:1 1 auto;overflow-y:auto;padding:6px 10px 12px;-webkit-overflow-scrolling:touch}\n.gal-fila{display:flex;gap:10px;align-items:baseline;padding:7px 8px;border:1px solid transparent;cursor:pointer;font-size:14px}\n.gal-fila .n{color:#7fb08c;min-width:2.6em;text-align:right}\n.gal-fila .t{flex:1 1 auto;min-width:0}\n.gal-fila .t b{font-weight:normal;color:#b4f4ac}\n.gal-fila .t i{display:block;font-style:normal;color:#7fb08c;font-family:"Trebuchet MS",Verdana,Arial,sans-serif;font-size:13px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.gal-fila .d{color:#7fb08c;font-size:12px;white-space:nowrap}\n.gal-fila.sel{border-color:#b4f4ac;background:rgba(0,110,60,.38)}\n.gal-fila.suena .n::before{content:'\\25B6 ';color:#b4f4ac}\n.gal-sep{color:#7fb08c;font-size:12px;padding:12px 8px 4px;border-bottom:1px solid #1c2e22}\n.gal-pie{padding:8px 16px 14px;border-top:1px solid #2f4a39;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:12px;color:#7fb08c}\n.gal-pie .sp{flex:1 1 auto}\n@media (max-width:600px){.gal-fila{font-size:13px}.gal-cab h2{font-size:17px}}\n`;

let cssPuesto = false;

function ponerCSS() {
  if (cssPuesto || typeof document === "undefined") return;
  cssPuesto = true;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
}

export class PantallaLista {
  constructor(def) {
    this.def = def;
    this.sel = 0;
    this.raiz = null;
    this._mando = {};
  }
  get abierta() {
    return !!this.raiz;
  }
  abrir(sel = this.sel) {
    ponerCSS();
    this.cerrar();
    this.sel = sel;
    const r = this.raiz = document.createElement("div");
    r.className = "gal-capa";
    r.innerHTML = `<div class="gal-cab"><h2></h2></div><div class="gal-lista"></div><div class="gal-pie"></div>`;
    r.querySelector("h2").textContent = this.def.titulo;
    const cab = r.querySelector(".gal-cab"), pie = r.querySelector(".gal-pie");
    for (const b of this.def.botones || []) {
      const el = document.createElement("button");
      el.dataset.id = b.id;
      el.onclick = e => {
        e.stopPropagation();
        b.accion();
        this.refrescar();
      };
      (b.pie ? pie : cab).appendChild(el);
    }
    const vol = document.createElement("button");
    vol.textContent = "✕ VOLVER";
    vol.onclick = e => {
      e.stopPropagation();
      this.def.alSalir?.();
    };
    cab.appendChild(vol);
    const sp = document.createElement("span");
    sp.className = "sp";
    pie.prepend(sp);
    document.body.appendChild(r);
    this._teclas = e => this._tecla(e);
    addEventListener("keydown", this._teclas, true);
    this._bucle = () => {
      if (!this.raiz) return;
      this._leerMando();
      requestAnimationFrame(this._bucle);
    };
    this._mando = {
      primero: true
    };
    requestAnimationFrame(this._bucle);
    this.refrescar(true);
  }
  cerrar() {
    if (this._teclas) removeEventListener("keydown", this._teclas, true);
    this._teclas = null;
    this.raiz?.remove();
    this.raiz = null;
  }
  refrescar(centrar = false) {
    const r = this.raiz;
    if (!r) return;
    for (const b of this.def.botones || []) {
      const el = r.querySelector(`button[data-id="${b.id}"]`);
      if (el) el.textContent = typeof b.texto === "function" ? b.texto() : b.texto;
    }
    const sp = r.querySelector(".gal-pie .sp");
    if (sp) sp.textContent = this.def.pie?.() || "";
    const L = r.querySelector(".gal-lista"), filas = this.def.filas();
    this.n = filas.length;
    this.sel = Math.max(0, Math.min(this.sel, this.n - 1));
    L.textContent = "";
    filas.forEach((f, i) => {
      if (f.sep) {
        const s = document.createElement("div");
        s.className = "gal-sep";
        s.textContent = f.sep;
        L.appendChild(s);
      }
      const d = document.createElement("div");
      d.className = "gal-fila" + (i === this.sel ? " sel" : "") + (f.suena ? " suena" : "");
      d.dataset.i = i;
      const n = document.createElement("span");
      n.className = "n";
      n.textContent = f.n ?? i + 1;
      const t = document.createElement("span");
      t.className = "t";
      const b = document.createElement("b");
      b.textContent = f.texto;
      t.appendChild(b);
      if (f.sub) {
        const s = document.createElement("i");
        s.textContent = f.sub;
        t.appendChild(s);
      }
      const du = document.createElement("span");
      du.className = "d";
      du.textContent = f.dur || "";
      d.append(n, t, du);
      d.onclick = () => {
        if (this.sel === i || matchMedia("(pointer:coarse)").matches || true) {
          this.sel = i;
          this.def.alElegir(i);
        }
      };
      d.onmouseenter = () => {
        if (this.sel !== i) {
          this.sel = i;
          this._marcar(false);
        }
      };
      L.appendChild(d);
    });
    this._marcar(centrar);
  }
  _marcar(centrar) {
    const L = this.raiz?.querySelector(".gal-lista");
    if (!L) return;
    for (const el of L.querySelectorAll(".gal-fila")) el.classList.toggle("sel", +el.dataset.i === this.sel);
    const el = L.querySelector(`.gal-fila[data-i="${this.sel}"]`);
    if (el && centrar) el.scrollIntoView({
      block: "nearest"
    });
  }
  mover(d) {
    if (!this.n) return;
    this.sel = (this.sel + d + this.n) % this.n;
    this._marcar(true);
  }
  _tecla(e) {
    if (!this.raiz) return;
    const k = e.code;
    let usada = true;
    if (k === "ArrowDown" || k === "KeyS") this.mover(1); else if (k === "ArrowUp" || k === "KeyW") this.mover(-1); else if (k === "PageDown") this.mover(8); else if (k === "PageUp") this.mover(-8); else if (k === "Enter" || k === "Space" || k === "NumpadEnter") this.def.alElegir(this.sel); else if (k === "Escape" || k === "Backspace") this.def.alSalir?.(); else if (this.def.tecla?.(k)) this.refrescar(); else usada = false;
    if (usada) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  _leerMando() {
    const g = ctl.mando(), M = this._mando;
    const b = i => !!g?.buttons?.[i]?.pressed, ax = g?.axes?.[1] || 0;
    const ahora = {
      ab: b(ctl.B.ABAJO) || ax > .6,
      ar: b(ctl.B.ARRIBA) || ax < -.6,
      o: b(ctl.B.CIRCULO),
      x: b(ctl.B.CRUZ),
      izq: b(ctl.B.IZQ),
      der: b(ctl.B.DER),
      l1: b(ctl.B.L1),
      r1: b(ctl.B.R1)
    };
    if (M.primero) {
      M.primero = false;
      M.antes = ahora;
      return;
    }
    const flanco = k => ahora[k] && !M.antes?.[k];
    const t = performance.now();
    for (const [k, d] of [ [ "ab", 1 ], [ "ar", -1 ] ]) {
      if (flanco(k)) {
        this.mover(d);
        M.rep = t + 400;
      } else if (ahora[k] && t > (M.rep || 0)) {
        this.mover(d);
        M.rep = t + 90;
      }
    }
    if (flanco("o")) this.def.alElegir(this.sel); else if (flanco("x")) this.def.alSalir?.(); else for (const k of [ "izq", "der", "l1", "r1" ]) if (flanco(k) && this.def.boton?.(k)) this.refrescar();
    M.antes = ahora;
  }
}

export class Galeria {
  constructor(op = {}) {
    this.op = op;
    this.base = op.base || "assets/";
    this.items = null;
    this.textos = {};
    this.sel = 0;
    this.activa = false;
    this.jugando = null;
  }
  async cargar() {
    if (this.items) return this.items;
    const [d, v] = await Promise.all([ jsonDe(this.base + "demos/indice.json"), jsonDe(this.base + "demos/movie/indice.json") ]);
    const demos = (d?.demos || []).map(x => ({
      tipo: "demo",
      id: x.id,
      st: x.contexto || x.stages?.[0],
      disco: x.disco,
      dur: x.duracion,
      en: primeraLinea(x.primer_subtitulo)
    })).sort((a, b) => a.id - b.id);
    const videos = new Map((v?.videos || []).map(x => [ x.id, {
      tipo: "video",
      id: x.id,
      st: VIDEO_ST[x.id] || null,
      disco: x.disco,
      dur: x.duracion,
      en: primeraLinea(x.primer_subtitulo)
    } ]));
    const lista = [];
    for (const it of demos) {
      lista.push(it);
      for (const k of VIDEO_ORDEN) if (VIDEO_TRAS[k] === it.id && videos.has(k)) {
        lista.push(videos.get(k));
        videos.delete(k);
      }
    }
    for (const it of videos.values()) lista.push(it);
    lista.forEach((it, i) => {
      it.n = i + 1;
    });
    this.items = lista;
    return lista;
  }
  async cargarTextos() {
    const k = idioma.texto;
    if (k === "en" || k === "ja" || this.textos[k]) return;
    const t = this.textos[k] = {};
    const dir = idioma.carpeta(k) + "demos/";
    await Promise.all(this.items.map(async it => {
      const j = await jsonDe(it.tipo === "video" ? `${dir}movie/${it.id}.json` : `${dir}${it.id}.json`);
      const l = it.tipo === "video" ? j?.sub?.[0]?.[2] : j?.subtitulos?.find(s => s.texto)?.texto;
      if (l) t[it.id] = primeraLinea(l);
    }));
  }
  linea(it) {
    const k = idioma.texto;
    return k !== "en" && this.textos[k]?.[it.id] || it.en;
  }
  nombre(it) {
    return (it.tipo === "video" ? "VIDEO · " : "") + lugarDe(it.st) + (it.disco === 2 ? " (disco 2)" : "");
  }
  abrir() {
    this.activa = true;
    return new Promise(fin => {
      this._fin = fin;
      this.pant = new PantallaLista({
        titulo: "CINEMATICAS",
        filas: () => this.items.map(it => ({
          n: it.n,
          texto: this.nombre(it),
          sub: this.linea(it) ? `“${this.linea(it)}”` : it.tipo === "video" ? "" : "(sin diálogo)",
          dur: mmss(it.dur || 0)
        })),
        alElegir: i => this.ver(i),
        alSalir: () => this.salir(),
        botones: [ {
          id: "texto",
          texto: () => "TEXTO: " + idioma.nombre(idioma.texto),
          accion: () => this.rotar("texto")
        }, {
          id: "voz",
          texto: () => "VOZ: " + idioma.nombre(idioma.voz),
          accion: () => this.rotar("voz")
        }, ...this.op.grabar ? [ {
          id: "grabar",
          texto: () => "GRABAR VIDEO: " + (this.op.grabar.get() ? "SI" : "NO"),
          accion: () => this.op.grabar.poner()
        } ] : [] ],
        pie: () => `${this.items.length} CINEMATICAS · ○ / ENTER VER · ✕ / ESC VOLVER · DURANTE LA CINEMATICA ✕ LA CORTA`
      });
      this.pant.abrir(this.sel);
      this.cargarTextos().then(() => this.pant?.refrescar());
    });
  }
  rotar(clave) {
    idioma.rotar(clave, 1);
    this.cargarTextos().then(() => this.pant?.refrescar());
  }
  async ver(i) {
    const it = this.items[i];
    if (!it || this.jugando) return;
    this.sel = i;
    this.jugando = it;
    this.pant?.cerrar();
    try {
      await (this.op.jugar?.(it));
    } catch (e) {
      console.warn("galería", e);
    }
    this.jugando = null;
    if (!this.activa) return;
    if (this.op.enVR?.()) this.op.reabrirVR?.(); else this.pant?.abrir(this.sel);
  }
  salir() {
    if (!this.activa) return;
    this.activa = false;
    this.pant?.cerrar();
    this.pant = null;
    const f = this._fin;
    this._fin = null;
    f?.();
  }
  entradasVR() {
    const out = [ {
      texto: "< VOLVER AL TITULO",
      volver: true,
      accion: () => this.salir(),
      cierra: true
    }, {
      texto: () => "TEXTO: " + idioma.nombre(idioma.texto),
      izq: () => idioma.rotar("texto", -1),
      der: () => idioma.rotar("texto", 1),
      accion: () => idioma.rotar("texto", 1),
      cierra: false
    }, {
      texto: () => "IDIOMA DE VOZ: " + idioma.nombre(idioma.voz),
      izq: () => idioma.rotar("voz", -1),
      der: () => idioma.rotar("voz", 1),
      accion: () => idioma.rotar("voz", 1),
      cierra: false
    } ];
    this.items.forEach((it, i) => out.push({
      texto: () => sinTildes(`${it.n} ${it.tipo === "video" ? "VIDEO " : ""}${lugarDe(it.st)} ${this.linea(it) ? "- " + this.linea(it) : ""}`).toUpperCase().slice(0, 60),
      accion: () => {
        this.ver(i);
      }
    }));
    return out;
  }
}

const VR_MUSICA = [ {
  nombre: "VR MISSIONS · TITULO",
  mdx: "ed8e_9da66d",
  bancos: [ "ada4_69038e" ],
  efx: "6d80_47e51f"
}, {
  nombre: "VR MISSIONS · SALAS",
  mdx: "ed8c_607c96",
  bancos: [ "ad5e_b271f2", "ad9e_ff9dff" ],
  efx: "6d7a_f97750"
}, {
  nombre: "VR MISSIONS · PHOTOGRAPH",
  mdx: "ed7a_f7851a",
  bancos: [ "ada3_8adcf2" ],
  efx: "6d7f_202a9b"
}, {
  nombre: "VR MISSIONS · NINJA",
  mdx: "ed7e_a0e95f",
  bancos: [ "ad5e_b271f2", "ada2_2ab6ac" ],
  efx: "6d7e_908d4b"
}, {
  nombre: "VR MISSIONS · SALA N04",
  mdx: "ed7d_735722",
  bancos: [ "ad5e_b271f2", "ad9e_ff9dff" ],
  efx: "6d7a_f97750"
}, {
  nombre: "VR MISSIONS · SALA N05",
  mdx: "ed7c_3e58df",
  bancos: [ "ad9f_6f3b2c", "ada0_d288b0" ],
  efx: "6d7b_3048fd"
}, {
  nombre: "VR MISSIONS · VARIETY",
  mdx: "ed7b_9b7793",
  bancos: [ "ad5e_b271f2", "ad9e_ff9dff" ],
  efx: "6d7a_f97750"
} ];

const BANCOS_DE = {
  "ed8f:3": "d18a"
};

const leer16 = (d, i) => d[i] | d[i + 1] << 8, leer24 = (d, i) => d[i] | d[i + 1] << 8 | d[i + 2] << 16;

export function cancionesMdx(d) {
  const out = [];
  for (let n = 1; n < 16; n++) {
    const a = leer16(d, n * 4);
    if (!a || a + 52 > d.length) continue;
    const pistas = [];
    for (let k = 0; k < 13; k++) pistas.push(leer24(d, a + k * 4));
    if (!pistas.some(Boolean) || pistas.some(p => p >= d.length)) continue;
    const ord = [ ...new Set(pistas.filter(Boolean)) ].sort((x, y) => x - y);
    let h = 2166136261;
    for (const p of pistas) {
      if (!p) {
        h = Math.imul(h ^ 45, 16777619);
        continue;
      }
      const fin = Math.min(ord[ord.indexOf(p) + 1] ?? d.length, p + 4e3);
      for (let i = p; i < fin; i++) h = Math.imul(h ^ d[i], 16777619);
    }
    out.push({
      n: n,
      firma: (h >>> 0).toString(16)
    });
  }
  return out;
}

export class Reproductor {
  constructor(op = {}) {
    this.op = op;
    this.base = op.base || "assets/";
    this.temas = null;
    this.sel = 0;
    this.actual = -1;
    this.pausado = false;
    this.activa = false;
  }
  get s() {
    return this.op.sonido;
  }
  async cargar() {
    if (this.temas) return this.temas;
    const esc = await jsonDe(this.base + "sonido/escenarios.json") || {};
    const orden = Object.keys(ESCENARIOS_ES), pos = st => {
      const i = orden.indexOf(st.replace(/r$/, ""));
      return i < 0 ? 999 : i;
    };
    const porMdx = new Map;
    for (const st of Object.keys(esc).sort((a, b) => pos(a) - pos(b) || a.localeCompare(b))) {
      const e = esc[st];
      if (!e?.mdx) continue;
      const m = porMdx.get(e.mdx) || {
        mdx: e.mdx,
        st: st,
        sts: [],
        canciones: null
      };
      m.sts.push(st);
      if (!m.canciones && e.canciones) m.canciones = e.canciones;
      porMdx.set(e.mdx, m);
    }
    const temas = [], vistas = new Set;
    const datos = await Promise.all([ ...porMdx.values() ].map(async m => {
      const b = await fetch(`${this.base}sonido/mdx/${m.mdx}.mdx`).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
      return {
        m: m,
        c: b ? cancionesMdx(new Uint8Array(b)) : []
      };
    }));
    for (const {m: m, c: c} of datos) {
      for (const k of c) {
        if (vistas.has(k.firma)) continue;
        vistas.add(k.firma);
        const uso = m.canciones?.[0] === k.n ? "TEMA DEL LUGAR" : m.canciones?.[1] === k.n ? "ALERTA" : "TEMA " + k.n;
        const st = BANCOS_DE[`${m.mdx}:${k.n}`] || m.st;
        temas.push({
          mdx: m.mdx,
          st: st,
          n: k.n,
          lugar: lugarDe(st),
          uso: uso,
          sts: m.sts
        });
      }
    }
    const datosVR = await Promise.all(VR_MUSICA.map(async g => {
      const b = await fetch(`${this.base}vr/disco/sonido/${g.mdx}.mdx`).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
      return {
        g: g,
        c: b ? cancionesMdx(new Uint8Array(b)) : []
      };
    }));
    for (const {g: g, c: c} of datosVR) {
      const r = n => "../../vr/disco/sonido/" + n, k = "vrm:" + g.mdx + g.bancos.join();
      for (const x of c) {
        if (vistas.has(x.firma)) continue;
        vistas.add(x.firma);
        temas.push({
          mdx: g.mdx.replace(/_.*/, ""),
          st: k,
          n: x.n,
          lugar: g.nombre,
          uso: "TEMA " + x.n,
          tabla: {
            bancos: g.bancos.map(r),
            mdx: r(g.mdx),
            efx: r(g.efx),
            canciones: [ x.n, x.n ]
          }
        });
      }
    }
    temas.forEach((t, i) => {
      t.i = i + 1;
    });
    this.temas = temas;
    return temas;
  }
  nombre(t) {
    return `${t.lugar} · ${t.uso}`;
  }
  async tocar(i) {
    const t = this.temas[i];
    if (!t || !this.s) return;
    this.actual = i;
    this.sel = i;
    this.pausado = false;
    try {
      await (this.s.iniciar?.());
    } catch {}
    if (t.tabla) {
      this.s.tabla ||= {};
      this.s.tabla[t.st] = t.tabla;
    }
    if (this.s.escenario !== t.st) await this.s.cargarEscenario(t.st);
    if (this.actual !== i) return;
    this.s.codigo(33554178);
    this.s.cancion(0);
    this.s.cancion(t.n);
    this.pant?.refrescar();
  }
  pausa() {
    if (this.actual < 0) return this.tocar(this.sel);
    this.pausado = !this.pausado;
    this.s?.codigo(this.pausado ? 33554177 : 33554178);
    this.pant?.refrescar();
  }
  siguiente(d = 1) {
    const n = this.temas.length;
    return this.tocar(((this.actual < 0 ? this.sel : this.actual) + d + n) % n);
  }
  parar() {
    this.actual = -1;
    this.pausado = false;
    try {
      this.s?.cancion(0);
    } catch {}
  }
  abrir() {
    this.activa = true;
    return new Promise(fin => {
      this._fin = fin;
      this.pant = new PantallaLista({
        titulo: "MUSICA",
        filas: () => this.temas.map((t, i) => ({
          n: t.i,
          texto: this.nombre(t),
          sub: `${t.mdx}.mdx · canción ${t.n}`,
          suena: i === this.actual
        })),
        alElegir: i => {
          if (i === this.actual) this.pausa(); else this.tocar(i);
        },
        alSalir: () => this.salir(),
        tecla: k => {
          if (k === "KeyP" || k === "KeyK") {
            this.pausa();
            return true;
          }
          if (k === "KeyN" || k === "ArrowRight") {
            this.siguiente(1);
            return true;
          }
          if (k === "KeyB" || k === "ArrowLeft") {
            this.siguiente(-1);
            return true;
          }
          return false;
        },
        boton: b => {
          if (b === "der" || b === "r1") {
            this.siguiente(1);
            return true;
          }
          if (b === "izq" || b === "l1") {
            this.siguiente(-1);
            return true;
          }
          return false;
        },
        botones: [ {
          id: "ant",
          pie: true,
          texto: "⏮ ANTERIOR",
          accion: () => this.siguiente(-1)
        }, {
          id: "play",
          pie: true,
          texto: () => this.actual < 0 || this.pausado ? "▶ PLAY" : "❚❚ PAUSA",
          accion: () => this.pausa()
        }, {
          id: "sig",
          pie: true,
          texto: "SIGUIENTE ⏭",
          accion: () => this.siguiente(1)
        } ],
        pie: () => this.actual >= 0 ? `${this.pausado ? "EN PAUSA" : "SONANDO"}: ${this.nombre(this.temas[this.actual])}` : `${this.temas.length} TEMAS · ○ / ENTER TOCAR · P PAUSA · ← → ANTERIOR / SIGUIENTE`
      });
      this.pant.abrir(this.sel);
    });
  }
  salir() {
    if (!this.activa) return;
    this.activa = false;
    this.parar();
    this.pant?.cerrar();
    this.pant = null;
    const f = this._fin;
    this._fin = null;
    f?.();
  }
  entradasVR() {
    const out = [ {
      texto: "< VOLVER AL TITULO",
      volver: true,
      accion: () => this.salir(),
      cierra: true
    }, {
      texto: () => this.actual < 0 ? "ELEGI UN TEMA" : (this.pausado ? "EN PAUSA: " : "SONANDO: ") + sinTildes(this.nombre(this.temas[this.actual])).toUpperCase(),
      izq: () => this.siguiente(-1),
      der: () => this.siguiente(1),
      accion: () => this.pausa(),
      cierra: false
    } ];
    this.temas.forEach((t, i) => out.push({
      texto: () => (i === this.actual ? "> " : "") + sinTildes(`${t.i} ${this.nombre(t)}`).toUpperCase(),
      accion: () => i === this.actual ? this.pausa() : this.tocar(i),
      cierra: false
    }));
    return out;
  }
}
