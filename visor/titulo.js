// MGS web — FeniXVOID · Project Ravenlight
import * as ctl from "./controles.js";

const W = 320, H = 224, HT = 240;

const BASE = new URL("./assets/", import.meta.url).href;

const OPACO = 0, ADD = 1, RESTA = 2, MITAD = 3;

const PALETA = [ [ 223, 115, 119 ], [ 31, 128, 128 ], [ 55, 142, 121 ], [ 65, 156, 188 ], [ 93, 148, 165 ], [ 40, 128, 171 ], [ 112, 163, 142 ], [ 189, 162, 145 ] ];

const GRIS = [ 128, 128, 128 ];

const VERDE = [ 128, 192, 128 ];

const ITEM = [ 100, 160, 135 ];

const TIT = [ 70, 100, 90 ];

const SEL = [ 180, 244, 172 ];

const RADAR = [ 150, 214, 160 ];

const BLOQ = [ 44, 72, 54 ];

export const ENTRADAS = [ {
  id: "jugar",
  texto: "JUGAR",
  nivelEnPartida: true
}, {
  id: "vr",
  texto: "VR MISSIONS"
}, {
  id: "museo",
  texto: "MUSEO"
}, {
  id: "objetos",
  texto: "OBJETOS"
}, {
  id: "escenarios",
  texto: "ESCENARIOS"
}, {
  id: "opciones",
  texto: "OPCIONES",
  interna: true
} ];

export const NIVELES = [ {
  texto: "VERY EASY",
  x: 124,
  y: 60,
  cur: [ 120, 58, 82, 9 ],
  valor: -1,
  extra: true
}, {
  texto: "EASY",
  x: 144,
  y: 86,
  cur: [ 140, 84, 42, 9 ],
  valor: 0
}, {
  texto: "NORMAL",
  x: 136,
  y: 112,
  cur: [ 132, 110, 58, 9 ],
  valor: 1
}, {
  texto: "HARD",
  x: 144,
  y: 138,
  cur: [ 140, 136, 42, 9 ],
  valor: 2
}, {
  texto: "EXTREME",
  x: 132,
  y: 164,
  cur: [ 128, 162, 70, 9 ],
  valor: 3
} ];

const VISTAS = [ "primera", "hombro", "arriba" ];

export const PASOS_INICIO = [ "modo" ];

let inicioHecho = false;

export const MODOS = [ {
  valor: "arriba",
  texto: "ORIGINAL",
  lineas: [ "LA CAMARA DEL JUEGO DE LA PLAYSTATION", "PRIMERA PERSONA SOLO CON TRIANGULO O LA MIRA" ],
  vr: "EN VR EL JUEGO EN UNA PANTALLA GRANDE"
}, {
  valor: "hombro",
  texto: "TERCERA PERSONA",
  lineas: [ "CAMARA DETRAS DE SNAKE COMO EN MGS3 Y MGS4", "SE GIRA CON EL STICK DERECHO EL MOUSE O EL DEDO" ],
  vr: "EN VR SNAKE ADELANTE Y VOS DETRAS Y ARRIBA"
}, {
  valor: "primera",
  texto: "PRIMERA PERSONA",
  lineas: [ "VES CON LOS OJOS DE SNAKE", "SE MIRA CON EL STICK DERECHO EL MOUSE O EL DEDO" ],
  vr: "EN VR LA DE SIEMPRE"
} ];

const Y_MODOS = [ 50, 96, 142 ], Y_MODO_OK = 204, Y_MODO_PIE = 188;

export const FILTROS = [ "ninguno", "ps1", "crt", "tv" ];

const FILTROS_NOMBRES = [ "NINGUNO", "PS1", "CRT", "TV VIEJA" ];

const FILAS = [ {
  clave: "vista",
  texto: "CAMARA",
  valores: VISTAS,
  nombres: [ "PRIMERA PERSONA", "TERCERA PERSONA", "ORIGINAL" ]
}, {
  clave: "dificultad",
  texto: "DIFICULTAD",
  valores: [ 0, 1, 2, 3, 4 ],
  nombres: [ "MUY FACIL", "FACIL", "NORMAL", "DIFICIL", "EXTREMO" ]
}, {
  clave: "sombras",
  texto: "SOMBRAS",
  valores: [ true, false ],
  nombres: [ "SI", "NO" ]
}, {
  clave: "pixel",
  texto: "TEXTURAS",
  valores: [ true, false ],
  nombres: [ "PIXELADAS", "SUAVIZADAS" ]
}, {
  clave: "filtro",
  texto: "FILTRO",
  valores: FILTROS,
  nombres: FILTROS_NOMBRES
}, {
  clave: "sonido",
  texto: "SONIDO",
  valores: [ true, false ],
  nombres: [ "SI", "NO" ]
}, {
  clave: "vr",
  texto: "VR",
  valores: [ false, true ],
  nombres: [ "NO", "SI" ]
}, {
  clave: "vrcine",
  texto: "CINEMATICAS VR",
  valores: [ true, false ],
  nombres: [ "ADENTRO", "PANTALLA" ]
}, {
  clave: "pantallaCompleta",
  texto: "PANTALLA",
  valores: [ false, true ],
  nombres: [ "VENTANA", "COMPLETA" ]
}, {
  clave: "todo",
  texto: "ARMAS E ITEMS",
  valores: [ false, true ],
  nombres: [ "NORMAL", "TODAS" ]
}, {
  clave: "vibra",
  texto: "VIBRACION",
  valores: [ true, false ],
  nombres: [ "SI", "NO" ]
}, {
  clave: "controles",
  texto: "CONTROLES",
  valores: [ "configurar" ],
  nombres: [ "CONFIGURAR" ],
  accion: true
}, {
  clave: "offline",
  texto: "JUGAR SIN SENAL",
  valores: [ "descargar" ],
  get nombres() {
    return [ globalThis.mgsOffline?.rotulo?.() || "NO DISPONIBLE" ];
  },
  accion: true
}, {
  clave: "debug",
  texto: "MODO DEBUG",
  valores: [ false, true ],
  nombres: [ "NO", "SI" ]
}, {
  clave: "salir"
} ];

const Y_FILAS = 34, PASO_FILAS = 10, X_ROTULO = 34, X_VALOR = 228, Y_EXIT = 186;

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

export function leerOpciones() {
  const v = leer("sm_vista"), d = leer("sm_dif");
  return {
    vista: VISTAS.includes(v) ? v : "primera",
    dificultad: d !== null && +d >= 0 && +d <= 4 ? +d : 2,
    sombras: leer("sm_sombras") !== "0",
    sonido: leer("sm_sonido") !== "0",
    vr: leer("sm_vr") === "1",
    pantallaCompleta: !!document.fullscreenElement || leer("sm_pantalla") !== "0",
    todo: leer("sm_todo") === "1",
    vibra: leer("sm_vibra") !== "0",
    controles: "configurar",
    debug: leer("sm_debug") === "1",
    pixel: leer("sm_pixel") !== "0",
    filtro: FILTROS.includes(leer("sm_filtro")) ? leer("sm_filtro") : "ninguno",
    vrcine: leer("sm_vrcine") !== "0"
  };
}

export function guardarOpciones(o) {
  escribir("sm_vista", o.vista);
  escribir("sm_dif", o.dificultad);
  escribir("sm_sombras", o.sombras ? "1" : "0");
  escribir("sm_sonido", o.sonido ? "1" : "0");
  escribir("sm_vr", o.vr ? "1" : "0");
  escribir("sm_pantalla", o.pantallaCompleta ? "1" : "0");
  escribir("sm_todo", o.todo ? "1" : "0");
  escribir("sm_debug", o.debug ? "1" : "0");
  escribir("sm_pixel", o.pixel ? "1" : "0");
  escribir("sm_filtro", o.filtro || "ninguno");
  escribir("sm_vrcine", o.vrcine ? "1" : "0");
}

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function texDeImagen(img) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d", {
    willReadFrequently: true
  });
  x.drawImage(img, 0, 0);
  return {
    d: x.getImageData(0, 0, c.width, c.height).data,
    w: c.width,
    h: c.height
  };
}

function texVacia(w, h) {
  return {
    d: new Uint8ClampedArray(w * h * 4),
    w: w,
    h: h
  };
}

function pixel(t, x, y, v, a = 255) {
  const o = (y * t.w + x) * 4;
  t.d[o] = t.d[o + 1] = t.d[o + 2] = v;
  t.d[o + 3] = a;
}

function blit(dst, tex, dx, dy, dw, dh, tr, tg, tb, modo = OPACO, sx = 0, sy = 0, sw = tex.w, sh = tex.h, grad = null) {
  if (!tex) return;
  dx = Math.round(dx);
  dy = Math.round(dy);
  dw = Math.round(dw);
  dh = Math.round(dh);
  const x0 = Math.max(0, dx), x1 = Math.min(dst.w, dx + dw), y0 = Math.max(0, dy), y1 = Math.min(dst.h, dy + dh);
  if (x0 >= x1 || y0 >= y1 || dw <= 0 || dh <= 0) return;
  const n = x1 - x0, cols = new Int32Array(n);
  for (let x = x0; x < x1; x++) cols[x - x0] = (sx + Math.floor((x - dx) * sw / dw)) * 4;
  const D = dst.d, S = tex.d, tw4 = tex.w * 4;
  for (let y = y0; y < y1; y++) {
    const fila = (sy + Math.floor((y - dy) * sh / dh)) * tw4;
    let r = tr, g = tg, b = tb;
    if (grad) {
      const k = dh > 1 ? (y - dy) / (dh - 1) : 0;
      r = grad[0] + (grad[3] - grad[0]) * k;
      g = grad[1] + (grad[4] - grad[1]) * k;
      b = grad[2] + (grad[5] - grad[2]) * k;
    }
    const kr = r / 128, kg = g / 128, kb = b / 128;
    let o = (y * dst.w + x0) * 4;
    for (let i = 0; i < n; i++, o += 4) {
      const p = fila + cols[i];
      if (S[p + 3] < 128) continue;
      const cr = Math.min(255, S[p] * kr), cg = Math.min(255, S[p + 1] * kg), cb = Math.min(255, S[p + 2] * kb);
      if (modo === OPACO) {
        D[o] = cr;
        D[o + 1] = cg;
        D[o + 2] = cb;
      } else if (modo === ADD) {
        D[o] += cr;
        D[o + 1] += cg;
        D[o + 2] += cb;
      } else if (modo === RESTA) {
        D[o] -= cr;
        D[o + 1] -= cg;
        D[o + 2] -= cb;
      } else if (modo === MITAD) {
        D[o] = (D[o] + cr) / 2;
        D[o + 1] = (D[o + 1] + cg) / 2;
        D[o + 2] = (D[o + 2] + cb) / 2;
      } else {
        D[o] += cr / 4;
        D[o + 1] += cg / 4;
        D[o + 2] += cb / 4;
      }
    }
  }
}

function limpiar(dst) {
  const D = dst.d;
  for (let i = 0; i < D.length; i += 4) {
    D[i] = D[i + 1] = D[i + 2] = 0;
    D[i + 3] = 255;
  }
}

function atenuar(dst, k) {
  if (k >= 1) return;
  const D = dst.d;
  for (let i = 0; i < D.length; i += 4) {
    D[i] *= k;
    D[i + 1] *= k;
    D[i + 2] *= k;
  }
}

const mezclar = (a, b, k) => [ a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k ];

const escalar = (c, k) => [ c[0] * k, c[1] * k, c[2] * k ];

function complemento(c) {
  const cc = [ 255 - c[0], 255 - c[1], 255 - c[2] ];
  const s = c[0] + c[1] + c[2], t = cc[0] + cc[1] + cc[2] || 1;
  return escalar(cc, s / t);
}

const azar = n => Math.floor(Math.random() * n);

const normalizar = t => String(t ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function glifo(c) {
  if (c >= "A" && c <= "Z") {
    const k = c.charCodeAt(0) - 65;
    return {
      sx: k * 8,
      sy: 0,
      w: c === "I" ? 3 : 8
    };
  }
  if (c >= "0" && c <= "9") return {
    sx: (c.charCodeAt(0) - 48) * 8,
    sy: 6,
    w: 8
  };
  return null;
}

function mascara(f8, txt, esp) {
  const pos = [];
  let x = 0, fin = 1;
  for (const c of normalizar(txt)) {
    const g = glifo(c);
    if (!g) {
      x += esp;
      continue;
    }
    pos.push([ g, x ]);
    x += g.w + 1;
    fin = x - 1;
  }
  const w = fin, m = new Uint8Array(w * 6);
  if (f8) for (const [g, x0] of pos) for (let y = 0; y < 6; y++) for (let i = 0; i < g.w; i++) if (f8.d[((g.sy + y) * f8.w + g.sx + i) * 4 + 3] >= 128) m[y * w + x0 + i] = 1;
  return {
    m: m,
    w: w
  };
}

export function rotuloBorde(f8, txt) {
  const {m: m, w: w} = mascara(f8, txt, 7), tw = w + 2, t = texVacia(tw, 8);
  const en = (x, y) => x >= 0 && y >= 0 && x < w && y < 6 && m[y * w + x] === 1;
  for (let y = 0; y < 8; y++) for (let x = 0; x < tw; x++) {
    if (en(x - 1, y - 1)) {
      pixel(t, x, y, 103);
      continue;
    }
    let borde = false;
    for (let dy = -1; dy <= 1 && !borde; dy++) for (let dx = -1; dx <= 1; dx++) if (en(x - 1 + dx, y - 1 + dy)) {
      borde = true;
      break;
    }
    if (borde) pixel(t, x, y, 31);
  }
  return t;
}

export function rotuloPlano(f8, txt) {
  const {m: m, w: w} = mascara(f8, txt, 5), t = texVacia(w + 4, 8);
  for (let y = 0; y < 6; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) pixel(t, x + 2, y + 1, 127);
  return t;
}

export function rotuloCaja(f8, txt, margen = 12) {
  const {m: m, w: w} = mascara(f8, txt, 7), tw = w + 2 * margen, t = texVacia(tw, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < tw; x++) {
    const lx = x - margen, ly = y - 3;
    if (lx >= 0 && ly >= 0 && lx < w && ly < 6 && m[ly * w + lx]) continue;
    pixel(t, x, y, 127);
  }
  return t;
}

export function textoMenu(f8, txt) {
  const spr = [];
  let x = 0;
  for (const c of normalizar(txt)) {
    const g = glifo(c);
    if (!g) {
      if (c === " ") x += 4;
      continue;
    }
    if (c === "I") {
      spr.push([ g, x + 1 ]);
      x += 5;
    } else {
      spr.push([ g, x ]);
      x += 9;
    }
  }
  const t = texVacia(Math.max(1, x + 8), 6);
  if (f8) for (const [g, x0] of spr) for (let y = 0; y < 6; y++) for (let i = 0; i < 8; i++) if (f8.d[((g.sy + y) * f8.w + g.sx + i) * 4 + 3] >= 128) pixel(t, x0 + i, y, 128);
  t.ancho = x;
  return t;
}

export function textoChico(f5, txt) {
  const spr = [];
  let x = 0;
  for (const c of normalizar(txt)) {
    let sx = -1, sy = 0;
    if (c >= "A" && c <= "Z") {
      sx = (c.charCodeAt(0) - 65) * 6;
      sy = 5;
    } else if (c >= "0" && c <= "9") sx = (c.charCodeAt(0) - 48) * 6;
    if (sx < 0) {
      x += 4;
      continue;
    }
    spr.push([ sx, sy, x ]);
    x += c === "I" ? 4 : 6;
  }
  const t = texVacia(Math.max(1, x - 1), 5);
  if (f5) for (const [sx, sy, x0] of spr) for (let y = 0; y < 5; y++) for (let i = 0; i < 5; i++) {
    if (x0 + i < t.w && f5.d[((sy + y) * f5.w + sx + i) * 4 + 3] >= 128) pixel(t, x0 + i, y, 128);
  }
  return t;
}

let recursos = null;

function cargarRecursos() {
  recursos ||= (async () => {
    const r = await fetch(BASE + "titulo/titulo.json");
    if (!r.ok) throw new Error("titulo.json " + r.status);
    const info = (await r.json()).texturas, nombres = Object.keys(info);
    const [imgs, f8, f5] = await Promise.all([ Promise.all(nombres.map(n => cargarImg(BASE + "titulo/" + info[n].png))), cargarImg(BASE + "hud/fuente.png"), cargarImg(BASE + "hud/num.png") ]);
    const tex = {};
    nombres.forEach((n, i) => {
      if (imgs[i]) tex[n] = texDeImagen(imgs[i]);
    });
    return {
      tex: tex,
      info: info,
      f8: f8 && texDeImagen(f8),
      f5: f5 && texDeImagen(f5)
    };
  })();
  recursos.catch(() => {
    recursos = null;
  });
  return recursos;
}

const TECLAS = {
  ArrowUp: "arriba",
  KeyW: "arriba",
  ArrowDown: "abajo",
  KeyS: "abajo",
  ArrowLeft: "izq",
  KeyA: "izq",
  ArrowRight: "der",
  KeyD: "der",
  Enter: "start",
  NumpadEnter: "start",
  Space: "o",
  KeyZ: "o",
  KeyE: "o",
  Escape: "x",
  KeyX: "x",
  Backspace: "x",
  KeyQ: "x"
};

const DIRS = [ "arriba", "abajo", "izq", "der" ];

const MUDO = {
  se() {},
  cancion() {},
  codigo() {}
};

export class Titulo {
  constructor({contenedor: contenedor = null, sonido: sonido = null, entradas: entradas = ENTRADAS, alElegir: alElegir = null, alDemo: alDemo = null, extremo: extremo = true, reloj: reloj = true, capa: capa = 40, inicio: inicio = true} = {}) {
    this.contenedor = contenedor || document.body;
    this.conInicio = inicio && !/[?&]inicio=0\b/.test(globalThis.location?.search || "");
    this.sonido = sonido || MUDO;
    this.entradas = entradas.map(e => ({
      ...e
    }));
    this.alElegir = alElegir;
    this.alDemo = alDemo;
    this.extremo = extremo;
    this.conReloj = reloj;
    this.capa = capa;
    this.visible = false;
    this.estado = "cerrado";
    this.registro = [];
    this.hayVR = false;
    navigator.xr?.isSessionSupported?.("immersive-vr").then(ok => {
      this.hayVR = !!ok;
    }).catch(() => {});
  }
  async mostrar({desde: desde = "logos", cursor: cursor = null} = {}) {
    if (this.visible) this.cerrar();
    this.visible = true;
    this.estado = "carga";
    const promesa = new Promise(ok => {
      this._resolver = ok;
    });
    this._montar();
    try {
      this.R = await cargarRecursos();
    } catch (e) {
      console.error("título: no cargaron las texturas", e);
      this.cerrar();
      return promesa;
    }
    if (!this.visible) return promesa;
    this._prepararRotulos();
    this.opc = leerOpciones();
    this.sel = Math.max(0, this.entradas.findIndex(e => e.id === cursor));
    this.n = 0;
    this.f = 0;
    this.acum = 0;
    this.quieto = 0;
    this.pulso = 0;
    this.ojo = 0;
    this.musica = false;
    this.fondo = null;
    this.anim = null;
    this.espera = 0;
    this.eleccion = null;
    this.puntero = false;
    this.pantalla = "titulo";
    this.tPantalla = -99;
    this.registro = [];
    if (!this.opc.sonido) {
      try {
        this.sonido.setVolumen?.(0);
      } catch {}
    }
    const destino = {
      logos: "konami",
      titulo: "start",
      start: "start",
      entrada: "entrada",
      menu: "menu"
    }[desde] || "konami";
    let primero = destino === "konami" && this.sonido?.ctx?.state !== "running" ? "tocar" : destino;
    if (primero === "konami" && this.pasoInicio()) primero = this.pasoInicio();
    this.ir(primero);
    if (this.estado === "start" || this.estado === "menu") this.todoA128();
    this.presentar();
    if (this.conReloj) {
      this._tPrev = performance.now();
      this._raf = requestAnimationFrame(this._bucle);
    }
    return promesa;
  }
  cerrar() {
    if (!this.visible && !this.capaEl) return;
    this.visible = false;
    this.estado = "cerrado";
    this._musicaLogos(false);
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._pararDemo?.();
    this._pararDemo = null;
    if (this.musica) this.pararMusica();
    this._desmontar();
    const r = this._resolver;
    this._resolver = null;
    r?.(null);
  }
  destruir() {
    this.cerrar();
    this.rotulos = null;
    this.textos = null;
    this.fb = null;
    this.R = null;
  }
  _montar() {
    const fijo = this.contenedor === document.body || this.contenedor === document.documentElement;
    const capa = this.capaEl = document.createElement("div");
    Object.assign(capa.style, {
      position: fijo ? "fixed" : "absolute",
      inset: "0",
      zIndex: String(this.capa),
      background: "#000",
      touchAction: "none",
      userSelect: "none",
      webkitUserSelect: "none",
      cursor: "default",
      overflow: "hidden"
    });
    capa.setAttribute("aria-label", "Metal Gear Solid: título");
    if (!fijo && getComputedStyle(this.contenedor).position === "static") this.contenedor.style.position = "relative";
    const cv = this.cv = document.createElement("canvas");
    Object.assign(cv.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block"
    });
    capa.appendChild(cv);
    this.contenedor.appendChild(capa);
    this.ctx = cv.getContext("2d");
    this.fb ||= texVacia(W, H);
    limpiar(this.fb);
    this.img = new ImageData(this.fb.d, W, H);
    this.buf = document.createElement("canvas");
    this.buf.width = W;
    this.buf.height = HT;
    this.bctx = this.buf.getContext("2d");
    this.bctx.fillStyle = "#000";
    this.bctx.fillRect(0, 0, W, HT);
    this.grande = null;
    this.geo = {
      s: 1,
      ox: 0,
      oy: 0
    };
    this.tamaño = "";
    this.teclas = new Set;
    this.padBotones = new Set;
    this.pulsadas = [];
    this.rep = {};
    this.raton = null;
    this.dedo = null;
    this.tRueda = 0;
    this._L = [ [ window, "keydown", e => this._tecla(e, true), true ], [ window, "keyup", e => this._tecla(e, false), true ], [ window, "blur", () => {
      this.teclas.clear();
    }, false ], [ capa, "pointerdown", e => this._ptrAbajo(e), false ], [ capa, "pointermove", e => this._ptrMueve(e), false ], [ capa, "pointerup", e => this._ptrArriba(e), false ], [ capa, "pointercancel", () => {
      this.dedo = null;
    }, false ], [ capa, "wheel", e => this._rueda(e), {
      passive: false
    } ], [ capa, "contextmenu", e => e.preventDefault(), false ] ];
    for (const [o, ev, fn, op] of this._L) o.addEventListener(ev, fn, op);
  }
  _desmontar() {
    for (const [o, ev, fn, op] of this._L || []) o.removeEventListener(ev, fn, op);
    this._L = null;
    this.capaEl?.remove();
    this.capaEl = null;
    this.cv = null;
    this.ctx = null;
    this.buf = null;
    this.bctx = null;
    this.grande = null;
    this.img = null;
  }
  _bucle=ahora => {
    if (!this.visible) return;
    this._raf = requestAnimationFrame(this._bucle);
    const dt = (ahora - this._tPrev) / 1e3;
    this._tPrev = ahora;
    this.update(dt);
  };
  update(dt) {
    if (!this.visible || this.estado === "carga" || this.estado === "cerrado") return;
    this.acum += Math.min(Math.max(dt, 0), .25);
    let n = 0;
    while (this.acum >= 1 / 30 && n < 8 && this.visible) {
      this.acum -= 1 / 30;
      this.cuadro();
      n++;
    }
    if (this.visible && (n || this._cambioTamaño())) this.presentar();
  }
  avanzar(n = 1) {
    for (let i = 0; i < n && this.visible; i++) this.cuadro();
    if (this.visible) this.presentar();
    return {
      estado: this.estado,
      f: this.f,
      g: this.fondo?.g ?? null,
      sel: this.sel
    };
  }
  boton(b) {
    this.pulsadas.push(b);
    this.quieto = 0;
  }
  toque(x, y) {
    this.pulsadas.push({
      toque: true,
      x: x,
      y: y
    });
    this.puntero = true;
  }
  get lienzoVR() {
    return this.buf;
  }
  botonVR(b, abajo) {
    if (!this.visible || !this.teclas) return;
    if (abajo) {
      this._audio();
      if (!this.teclas.has(b)) {
        this.teclas.add(b);
        this.pulsadas.push(b);
      }
    } else this.teclas.delete(b);
  }
  apuntarVR(x, y) {
    if (this.visible) {
      this.raton = {
        x: x,
        y: y,
        nuevo: true
      };
      this.puntero = true;
    }
  }
  tocarVR(x, y) {
    if (this.visible) {
      this._audio();
      this.toque(x, y);
    }
  }
  _audio() {
    try {
      this.sonido.iniciar?.();
    } catch {}
  }
  _tecla(e, abajo) {
    if (!this.visible || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^F\d+$/.test(e.code)) return;
    e.stopPropagation();
    const b = TECLAS[e.code];
    if (b || e.code === "Tab") e.preventDefault();
    if (!b) return;
    if (abajo) {
      this._audio();
      if (!e.repeat && !this.teclas.has(b)) {
        this.teclas.add(b);
        this.pulsadas.push(b);
      }
    } else this.teclas.delete(b);
  }
  _logica(e) {
    const r = this.cv.getBoundingClientRect(), k = this.cv.width / Math.max(1, r.width), {s: s, ox: ox, oy: oy} = this.geo;
    return {
      x: ((e.clientX - r.left) * k - ox) / s,
      y: ((e.clientY - r.top) * k - oy) / s
    };
  }
  _ptrAbajo(e) {
    if (!this.visible) return;
    e.preventDefault();
    this._audio();
    this.puntero = true;
    if (e.button === 2) {
      this.pulsadas.push("x");
      return;
    }
    this.dedo = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      p: this._logica(e)
    };
    try {
      this.capaEl.setPointerCapture(e.pointerId);
    } catch {}
  }
  _ptrMueve(e) {
    if (e.pointerType === "mouse" && !this.dedo) {
      this.raton = {
        ...this._logica(e),
        nuevo: true
      };
      this.puntero = true;
    }
  }
  _ptrArriba(e) {
    const d = this.dedo;
    if (!d || d.id !== e.pointerId) return;
    this.dedo = null;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 1.2) {
      this.pulsadas.push(dy < 0 ? "abajo" : "arriba");
      return;
    }
    this.pulsadas.push({
      toque: true,
      x: d.p.x,
      y: d.p.y
    });
  }
  _rueda(e) {
    e.preventDefault();
    const t = performance.now();
    if (t - this.tRueda < 140 || Math.abs(e.deltaY) < 4) return;
    this.tRueda = t;
    this.puntero = true;
    this.pulsadas.push(e.deltaY > 0 ? "abajo" : "arriba");
  }
  _gamepad() {
    const gp = ctl.mando();
    if (!gp) return;
    const ax = gp.axes || [], bt = gp.buttons || [], B = ctl.B;
    const on = {
      start: bt[B.START]?.pressed,
      o: bt[B.CIRCULO]?.pressed,
      x: bt[B.CRUZ]?.pressed,
      arriba: bt[B.ARRIBA]?.pressed || ax[1] < -.55,
      abajo: bt[B.ABAJO]?.pressed || ax[1] > .55,
      izq: bt[B.IZQ]?.pressed || ax[0] < -.55,
      der: bt[B.DER]?.pressed || ax[0] > .55
    };
    for (const [b, v] of Object.entries(on)) {
      if (v && !this.padBotones.has(b)) {
        this.padBotones.add(b);
        this.pulsadas.push(b);
        this._audio();
      } else if (!v) this.padBotones.delete(b);
    }
  }
  sostenido(b) {
    return this.teclas.has(b) || this.padBotones.has(b);
  }
  pulsado(...cuales) {
    const i = this.pulsadas.findIndex(p => typeof p === "string" && cuales.includes(p));
    return i < 0 ? null : this.pulsadas.splice(i, 1)[0];
  }
  tomarToque() {
    const i = this.pulsadas.findIndex(p => typeof p === "object");
    return i < 0 ? null : this.pulsadas.splice(i, 1)[0];
  }
  hayAlgo() {
    return this.pulsadas.length > 0;
  }
  _repetir() {
    for (const d of DIRS) {
      if (!this.sostenido(d)) {
        this.rep[d] = 0;
        continue;
      }
      const r = this.rep[d] = (this.rep[d] || 0) + 1;
      if (r >= 12 && (r - 12) % 4 === 0) this.pulsadas.push(d);
    }
  }
  _hover() {
    const r = this.raton;
    if (!r?.nuevo) return null;
    r.nuevo = false;
    return r;
  }
  ir(estado, f = 0) {
    this.estado = estado;
    this.f = f;
    this.quieto = 0;
    this.registro.push({
      estado: estado,
      cuadro: this.n,
      ms: Math.round(performance.now())
    });
    if (estado === "konami") {
      this.fondo = null;
      this.saltar = false;
      this._musicaLogos(true);
    }
    if ([ "start", "menu", "demo", "tocar" ].includes(estado)) this._musicaLogos(false);
    if ([ "entrada", "start", "menu" ].includes(estado)) {
      if (!this.fondo) this.armarFondo();
      this.ponerMusica();
      this.pantalla = "titulo";
    }
    if (estado === "menu") {
      this.anim = null;
      this.espera = 0;
      this.pendiente = 0;
    }
    if (estado === "nivel") this.pantalla = "nivel";
    if (estado === "opc_abre") {
      this.pantalla = "opciones";
      this.selOpc = 0;
    }
    if (estado === "modo") {
      this.pantalla = "modo";
      if (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches) this.puntero = true;
      const i = MODOS.findIndex(m => m.valor === this.opc?.vista), hay = leer("sm_vista") !== null;
      this.selModo = hay && i >= 0 ? i : 0;
      this.modoGuardado = hay ? i : -1;
    }
    if (this.capaEl) this.capaEl.style.background = estado === "demo" ? "transparent" : "#000";
    if (this.cv) this.cv.style.visibility = estado === "demo" ? "hidden" : "visible";
  }
  todoA128() {
    if (!this.fondo) this.armarFondo();
    this.fondo.g = Math.max(this.fondo.g, 408);
  }
  ponerMusica() {
    if (this.musica) return;
    this.musica = true;
    const s = this.sonido;
    try {
      if (s.cargarEscenario && s.escenario !== "title") s.cargarEscenario("title"); else s.cancion?.(1);
    } catch {}
  }
  pararMusica(codigo = 33554431) {
    if (!this.musica) return;
    this.musica = false;
    const s = this.sonido;
    try {
      if (s.listo === false && s.escenario === "title") s.escenario = null;
      if (s.codigo) s.codigo(codigo); else s.cancion?.(0);
    } catch {}
  }
  se(id) {
    try {
      this.sonido.se?.(id);
    } catch {}
  }
  _musicaLogos(si) {
    try {
      if (si) {
        if (this.opc?.sonido === false) return;
        if (!this._vozLogos) {
          this._vozLogos = new Audio("assets/codec/vox/94672.m4a");
          this._vozLogos.preload = "auto";
        }
        const a = this._vozLogos;
        a.currentTime = 0;
        a.volume = .9;
        a.play()?.catch?.(() => {});
      } else if (this._vozLogos && !this._vozLogos.paused) this._vozLogos.pause();
    } catch {}
  }
  cuadro() {
    this.n++;
    this._gamepad();
    const E = this.estado;
    if (E === "nivel" || E === "opciones" || E === "modo") this._repetir();
    this.pulso = (this.pulso + 1) % 80;
    const algo = this.hayAlgo() || DIRS.some(d => this.sostenido(d));
    this.quieto = algo ? 0 : this.quieto + 1;
    if (this.fondo && (this.pantalla === "titulo" || E === "konami" || E === "kcej")) this.cuadroFondo();
    if (E === "tocar") {
      if (this.hayAlgo() || this.tomarToque()) {
        this.pulsadas.length = 0;
        this.ir(this.pasoInicio() || "konami");
      }
      return;
    }
    if (E === "modo") {
      this.f++;
      this.cuadroModo();
      this.pulsadas.length = 0;
      return;
    }
    if (E === "modo_sale") {
      if (++this.f >= 8) this.finPasoInicio("modo");
      this.pulsadas.length = 0;
      return;
    }
    if (E === "konami" || E === "kcej") {
      if (this.hayAlgo()) {
        if (this.f < 82) this.f = 82;
        this.saltar = true;
      }
      if (++this.f >= 103) {
        if (this.saltar) {
          this.ir("start");
          this.todoA128();
        } else if (E === "konami") this.ir("kcej"); else if (this.alDemo) this.ir("demo"); else this.ir("negro");
      }
    } else if (E === "negro") {
      if (this.hayAlgo()) {
        this.ir("start");
        this.todoA128();
      } else if (++this.f >= 15) this.ir("entrada");
    } else if (E === "demo") {
      if (this.f++ === 0) {
        try {
          this._pararDemo = this.alDemo(cancelada => {
            this._pararDemo = null;
            if (this.visible && this.estado === "demo") {
              this.ir(cancelada ? "start" : "entrada");
              if (cancelada) this.todoA128();
            }
          }) || null;
        } catch (e) {
          console.error(e);
          this.ir("entrada");
        }
      } else if (this.hayAlgo()) {
        const p = this._pararDemo;
        this._pararDemo = null;
        try {
          p?.();
        } catch {}
        this.ir("start");
        this.todoA128();
      }
    } else if (E === "entrada") {
      if (this.pulsado("start", "o") || this.tomarToque()) {
        this.ir("start");
        this.todoA128();
      } else if (++this.f >= 408) this.ir("start");
      this.inactividad();
    } else if (E === "start") {
      this.f++;
      this.parpadeo();
      if (this.pulsado("start", "o") || this.tomarToque()) this.ir("menu"); else this.inactividad();
    } else if (E === "menu") {
      this.f++;
      this.parpadeo();
      this.cuadroMenu();
      if (this.estado === "menu") this.inactividad();
    } else if (E === "nivel") {
      this.f++;
      this.cuadroNivel();
    } else if (E === "opc_abre") {
      if (++this.f === 1) this.se(125);
      if (this.f >= 48) this.ir("opciones");
    } else if (E === "opciones") {
      this.f++;
      this.cuadroOpciones();
    } else if (E === "opc_cierra") {
      if (++this.f >= 17) {
        guardarOpciones(this.opc);
        this.ir("menu");
        this.todoA128();
        this.avisar({
          entrada: "opciones",
          dificultad: this.opc.dificultad,
          nivel: null,
          opciones: {
            ...this.opc
          }
        });
      }
    } else if (E === "fundido") {
      if (this.pulsado("start", "o") || this.tomarToque()) {
        this.ir("start");
        this.todoA128();
      } else if (++this.f >= 96) {
        this.musica = false;
        this.ir("konami");
      }
    } else if (E === "saliendo") {
      if (++this.f >= 20) this._finalizar();
    }
    this.pulsadas.length = 0;
  }
  inactividad() {
    if (this.quieto < 1e3) return;
    this.quieto = 0;
    if (this.musica) {
      this.pararMusica(33554188);
    }
    this.ir("fundido");
  }
  parpadeo() {
    if (this.ojo > 0) this.ojo--; else if (Math.random() < 1 / 150) this.ojo = 3;
  }
  avisar(el) {
    try {
      this.alElegir?.(el, this);
    } catch (e) {
      console.error(e);
    }
  }
  terminar(entrada, nivel = null) {
    this.eleccion = {
      entrada: entrada.id,
      dificultad: entrada.nivelEnPartida ? undefined : this.opc.dificultad,
      nivel: nivel,
      opciones: {
        ...this.opc
      }
    };
    this._entradaElegida = entrada;
    this.ir("saliendo");
  }
  _finalizar() {
    const el = this.eleccion, ent = this._entradaElegida;
    guardarOpciones(this.opc);
    const r = this._resolver;
    this._resolver = null;
    this.cerrar();
    try {
      ent?.accion?.(el, this);
    } catch (e) {
      console.error(e);
    }
    this.avisar(el);
    r?.(el);
  }
  armarFondo() {
    this.fondo = {
      g: 0,
      desp: 0,
      brillo: 0,
      franja: {
        t: -32,
        brillo: 0,
        y: 0,
        cual: 0,
        rec: null
      },
      eco: {
        t: -128,
        brillo: 0,
        k: 1,
        activo: false
      },
      tinte: {
        color: GRIS.slice(),
        fase: -3,
        destino: null,
        origen: GRIS.slice(),
        t: 0,
        manual: false
      }
    };
    this.foto ||= texVacia(W, H);
    this.nuevoRecorte();
  }
  nuevoRecorte() {
    const fr = this.fondo.franja;
    fr.cual ^= 1;
    fr.rec = {
      tex: fr.cual ? "op_back_r" : "op_back_l",
      sx: azar(160 - 53),
      sy: azar(224 - 83)
    };
  }
  cuadroFondo() {
    const F = this.fondo, g = F.g;
    F.desp = (F.desp + 1) % 320;
    F.brillo = Math.min(128, g * 2);
    const fr = F.franja;
    if (++fr.t >= 0) {
      const c = fr.t % 276;
      if (c === 0 && fr.t > 0) this.nuevoRecorte();
      fr.brillo = c < 64 ? c * 2 : c < 212 ? 128 : (276 - c) * 2;
      fr.y = -c;
    }
    const ec = F.eco;
    if (++ec.t >= 0) {
      const c = ec.t % 256;
      if (c === 0) {
        this.sacarFoto();
        ec.activo = true;
      }
      if (c < 64) {
        ec.k = 1 + .32 * c / 64;
        ec.brillo = c * 2;
      } else if (c < 128) {
        ec.k = 1.32 + .32 * (c - 64) / 64;
        ec.brillo = 128;
      } else {
        ec.k = 1.64 + .64 * (c - 128) / 128;
        ec.brillo = 128 - (c - 128);
      }
    }
    const T = F.tinte;
    if (g >= 192) {
      const cruz = DIRS.filter(b => this.sostenido(b));
      if (cruz.length && this.estado !== "fundido") {
        const u = cruz.includes("arriba"), d = cruz.includes("abajo"), l = cruz.includes("izq"), r = cruz.includes("der");
        let dd = [ 0, 0, 0 ];
        if (u && r) dd = [ -5, 0, 10 ]; else if (d && r) dd = [ 5, -10, 0 ]; else if (d && l) dd = [ 5, 0, -10 ]; else if (u && l) dd = [ -5, 10, 0 ]; else if (u) dd = [ -10, 5, 5 ]; else if (r) dd = [ 0, -5, 5 ]; else if (d) dd = [ 10, -5, -5 ]; else if (l) dd = [ 0, 5, -5 ];
        T.color = T.color.map((v, i) => Math.max(0, Math.min(254, v + dd[i])));
        T.manual = true;
      } else {
        if (T.manual) {
          T.manual = false;
          T.origen = T.color.slice();
          T.destino = T.color.every(v => v === 128) ? PALETA[azar(8)].slice() : GRIS.slice();
          T.fase = 0;
          T.t = 0;
        }
        if (T.fase < 0) {
          if (++T.fase === 0) {
            T.origen = T.color.slice();
            T.destino = PALETA[azar(8)].slice();
            T.t = 0;
          }
        } else {
          if (T.fase === 0) T.color = mezclar(T.origen, T.destino, T.t / 128); else if (T.fase === 2) T.color = mezclar(T.destino, T.origen, T.t / 128);
          if (++T.t >= 128) {
            T.t = 0;
            T.fase = (T.fase + 1) % 4;
            if (T.fase === 0) {
              T.origen = T.color.slice();
              T.destino = T.color.every(v => Math.round(v) === 128) ? PALETA[azar(8)].slice() : GRIS.slice();
            }
          }
        }
      }
    }
    F.g++;
  }
  sacarFoto() {
    limpiar(this.foto);
    this.dibujarBaldosas(this.foto, GRIS);
  }
  dibujarBaldosas(dst, tinte) {
    const F = this.fondo, T = this.R.tex;
    for (let x = -F.desp; x < W; x += 160) {
      const i = Math.round((x + F.desp) / 160);
      blit(dst, T[i % 2 ? "op_back_r" : "op_back_l"], x, 0, 160, 224, tinte[0], tinte[1], tinte[2], OPACO);
    }
  }
  cuadroMenu() {
    const N = this.entradas.length;
    const pd = this.pulsado("arriba", "abajo");
    if (pd) this.pendiente = pd === "arriba" ? -1 : 1;
    if (this.anim) {
      if (++this.anim.f >= 5) {
        this.sel = (this.sel + this.anim.dir + N) % N;
        this.anim = null;
        this.espera = 6;
      }
      return;
    }
    const t = this.tomarToque();
    if (t) {
      if (t.y < 177 && t.y >= 150) return this.moverMenu(-1);
      if (t.y >= 177 && t.y < 192) return this.elegirMenu();
      if (t.y >= 192 && t.y < 230) return this.moverMenu(1);
    }
    if (this.pulsado("o", "start")) return this.elegirMenu();
    if (this.pulsado("x")) {
      this.ir("start");
      return;
    }
    if (this.espera > 0) {
      this.espera--;
      return;
    }
    if (this.pendiente) return this.moverMenu(this.pendiente);
    if (this.sostenido("arriba")) return this.moverMenu(-1);
    if (this.sostenido("abajo")) return this.moverMenu(1);
  }
  moverMenu(dir) {
    this.se(31);
    this.anim = {
      dir: dir,
      f: 0
    };
    this.pendiente = 0;
    this.quieto = 0;
  }
  elegirMenu() {
    const e = this.entradas[this.sel];
    this.se(102);
    if (e.nivel) {
      this.pararMusica();
      this.selNivel = Math.min(this.opc.dificultad, this.extremo ? 4 : 3);
      this.ir("nivel");
      return;
    }
    if (e.interna && e.id === "opciones") {
      this.pararMusica(33554187);
      this.ir("opc_abre");
      return;
    }
    this.pararMusica();
    this.terminar(e);
  }
  pasoInicio() {
    return !inicioHecho && this.conInicio ? PASOS_INICIO[0] || null : null;
  }
  finPasoInicio(paso) {
    const sig = PASOS_INICIO[PASOS_INICIO.indexOf(paso) + 1];
    if (sig) return this.ir(sig);
    inicioHecho = true;
    this.pantalla = "titulo";
    this.ir("konami");
  }
  cuadroModo() {
    const enItem = p => Y_MODOS.findIndex(y => p.y >= y - 8 && p.y < y + 36 && p.x >= 12 && p.x < 308);
    const enOk = p => p.y >= Y_MODO_OK - 8 && p.y < Y_MODO_OK + 14 && p.x >= 100 && p.x < 220;
    const h = this._hover();
    if (h) {
      const i = enItem(h);
      if (i >= 0 && i !== this.selModo) {
        this.selModo = i;
        this.se(31);
      }
    }
    const t = this.tomarToque();
    if (t) {
      const i = enOk(t) ? -1 : enItem(t);
      if (i >= 0 && i !== this.selModo) {
        this.selModo = i;
        this.se(31);
        return;
      }
      return this.confirmarModo();
    }
    if (this.pulsado("arriba")) {
      if (this.selModo > 0) {
        this.selModo--;
        this.se(31);
      }
    } else if (this.pulsado("abajo")) {
      if (this.selModo < MODOS.length - 1) {
        this.selModo++;
        this.se(31);
      }
    } else if (this.pulsado("o", "start", "x")) this.confirmarModo();
  }
  confirmarModo() {
    this.se(32);
    this.opc.vista = MODOS[this.selModo].valor;
    escribir("sm_vista", this.opc.vista);
    this.avisar({
      entrada: "modo",
      dificultad: this.opc.dificultad,
      nivel: null,
      opciones: {
        ...this.opc
      }
    });
    this.ir("modo_sale");
  }
  cuadroNivel() {
    const max = this.extremo ? 4 : 3;
    const enItem = p => NIVELES.findIndex(n => p.y >= n.y - 10 && p.y < n.y + 16 && p.x >= n.cur[0] - 24 && p.x < n.cur[0] + n.cur[2] + 24);
    const h = this._hover();
    if (h) {
      const i = enItem(h);
      if (i >= 0 && i <= max && i !== this.selNivel) {
        this.selNivel = i;
        this.se(31);
      }
    }
    const t = this.tomarToque();
    if (t) {
      if (this.puntero && t.x >= 126 && t.x < 194 && t.y >= 204 && t.y < 224) return this.volverDeNivel();
      const i = enItem(t);
      if (i >= 0 && i <= max) {
        if (i === this.selNivel) return this.confirmarNivel();
        this.selNivel = i;
        this.se(31);
      }
      return;
    }
    if (this.pulsado("arriba")) {
      if (this.selNivel > 0) {
        this.selNivel--;
        this.se(31);
      }
    } else if (this.pulsado("abajo")) {
      if (this.selNivel < max) {
        this.selNivel++;
        this.se(31);
      }
    } else if (this.pulsado("o", "start")) this.confirmarNivel(); else if (this.pulsado("x")) this.volverDeNivel();
  }
  volverDeNivel() {
    this.se(33);
    this.ir("menu");
    this.todoA128();
  }
  confirmarNivel() {
    this.se(32);
    this.opc.dificultad = this.selNivel;
    this.terminar(this.entradas[this.sel], NIVELES[this.selNivel].valor);
  }
  filaDisponible(i) {
    const c = FILAS[i].clave;
    if (c === "vr" || c === "vrcine") return this.hayVR;
    if (c === "pantallaCompleta") return !!document.documentElement.requestFullscreen;
    if (c === "offline") return !!globalThis.mgsOffline && !globalThis.__mgs?.enVR;
    return true;
  }
  moverOpc(dir) {
    let i = this.selOpc;
    for (let k = 0; k < FILAS.length; k++) {
      i += dir;
      if (i < 0 || i >= FILAS.length) return;
      if (this.filaDisponible(i)) break;
    }
    if (i !== this.selOpc) {
      this.selOpc = i;
      this.se(31);
    }
  }
  cambiarOpc(i, dir = 1) {
    const fila = FILAS[i];
    if (!fila.valores || !this.filaDisponible(i)) return;
    if (fila.accion) {
      if (dir === 1) {
        this.se(32);
        dispatchEvent(new CustomEvent("mgs:" + fila.clave));
      }
      return;
    }
    if (fila.clave === "pantallaCompleta" && this.n - this.tPantalla > 30) this.opc.pantallaCompleta = !!document.fullscreenElement;
    const vs = fila.valores, j = (vs.indexOf(this.opc[fila.clave]) + dir + vs.length) % vs.length;
    const v = this.opc[fila.clave] = vs[j];
    this.se(32);
    if (fila.clave === "sonido") {
      try {
        this.sonido.setVolumen?.(v ? .9 : 0);
      } catch {}
    }
    if (fila.clave === "vibra") {
      escribir("sm_vibra", v ? "1" : "0");
      if (v) try {
        navigator.vibrate?.(120);
      } catch {}
    }
    if (fila.clave === "pantallaCompleta") {
      this.tPantalla = this.n;
      try {
        if (v && !document.fullscreenElement) document.documentElement.requestFullscreen?.({
          navigationUI: "hide"
        })?.catch?.(() => {});
        if (!v && document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
      } catch {}
    }
    guardarOpciones(this.opc);
    if (fila.clave === "pixel" || fila.clave === "filtro" || fila.clave === "vrcine") dispatchEvent(new CustomEvent("mgs:opcion", {
      detail: {
        clave: fila.clave,
        valor: v
      }
    }));
  }
  cerrarOpc() {
    this.se(33);
    this.ir("opc_cierra");
  }
  cuadroOpciones() {
    if (this.n - this.tPantalla > 30) this.opc.pantallaCompleta = !!document.fullscreenElement;
    this.opc.vibra = leer("sm_vibra") !== "0";
    const enFila = p => {
      if (p.y >= Y_EXIT - 4 && p.y < Y_EXIT + 16 && p.x >= 110 && p.x < 210) return FILAS.length - 1;
      const i = Math.floor((p.y - Y_FILAS + 7) / PASO_FILAS);
      return i >= 0 && i < FILAS.length - 1 && p.x >= 16 && p.x < 312 ? i : -1;
    };
    const h = this._hover();
    if (h) {
      const i = enFila(h);
      if (i >= 0 && i !== this.selOpc && this.filaDisponible(i)) {
        this.selOpc = i;
        this.se(31);
      }
    }
    const t = this.tomarToque();
    if (t) {
      const i = enFila(t);
      if (i < 0 || !this.filaDisponible(i)) return;
      if (FILAS[i].clave === "salir") return this.cerrarOpc();
      if (i !== this.selOpc) {
        this.selOpc = i;
        this.se(31);
        if (t.x < X_VALOR - 80) return;
      }
      return this.cambiarOpc(i, 1);
    }
    if (this.pulsado("x")) return this.cerrarOpc();
    if (this.pulsado("arriba")) return this.moverOpc(-1);
    if (this.pulsado("abajo")) return this.moverOpc(1);
    const esSalir = FILAS[this.selOpc].clave === "salir";
    if (this.pulsado("o", "start")) return esSalir ? this.cerrarOpc() : this.cambiarOpc(this.selOpc, 1);
    if (!esSalir && this.pulsado("der")) return this.cambiarOpc(this.selOpc, 1);
    if (!esSalir && this.pulsado("izq")) return this.cambiarOpc(this.selOpc, -1);
  }
  _prepararRotulos() {
    const {tex: tex, f8: f8, f5: f5} = this.R;
    this.rotulos = this.entradas.map(e => e.etiqueta && tex[e.etiqueta] || rotuloBorde(f8, e.texto || e.id));
    this.textos = new Map;
    this.cajaOpc = rotuloCaja(f8, "OPCIONES", 20);
    this.radarOff = textoChico(f5, "RADAR OFF");
  }
  texto(tipo, cad) {
    const k = tipo + "|" + cad;
    let t = this.textos.get(k);
    if (!t) {
      t = tipo === "menu" ? textoMenu(this.R.f8, cad) : rotuloPlano(this.R.f8, cad);
      this.textos.set(k, t);
    }
    return t;
  }
  presentar() {
    if (!this.cv || !this.R) return;
    const fb = this.fb, E = this.estado, f = this.f, T = this.R.tex;
    limpiar(fb);
    if (E === "konami" || E === "kcej") {
      const b = f <= 20 ? f * 6 : f <= 82 ? 128 : Math.max(0, 120 - (f - 82) * 6);
      const n = E === "konami" ? "op_konami_" : "op_kcej_";
      blit(fb, T[n + "l"], 0, 0, 160, 224, b, b, b);
      blit(fb, T[n + "r"], 160, 0, 160, 224, b, b, b);
    } else if (E === "tocar") {
      const tactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
      const t = this.texto("menu", tactil ? "TOUCH THE SCREEN" : "PRESS ANY BUTTON");
      if (this.pulso < 52 && t) blit(fb, t, Math.round((W - t.w) / 2), 104, t.w, t.h, ITEM[0], ITEM[1], ITEM[2], ADD);
    } else if (E === "negro" || E === "demo" || E === "carga") {} else if (E === "modo" || E === "modo_sale") this.dibujarModo(fb); else if (this.pantalla === "nivel") this.dibujarNivel(fb); else if (this.pantalla === "opciones") this.dibujarOpciones(fb); else if (this.fondo) this.dibujarTitulo(fb);
    if (E === "fundido") atenuar(fb, Math.max(0, 128 - f * 4 / 3) / 128);
    if (E === "saliendo") atenuar(fb, f < 8 ? 1 : Math.max(0, 1 - (f - 8) / 12));
    if (E === "modo" && f < 8) atenuar(fb, f / 8);
    if (E === "modo_sale") atenuar(fb, Math.max(0, 1 - f / 8));
    this.bctx.putImageData(this.img, 0, 0);
    this._aPantalla();
  }
  "_cambioTamaño"() {
    const c = this.capaEl;
    if (!c) return false;
    const dpr = Math.min(devicePixelRatio || 1, 3);
    const k = Math.round(c.clientWidth * dpr) + "x" + Math.round(c.clientHeight * dpr);
    return k !== this.tamaño;
  }
  _aPantalla() {
    const cv = this.cv, capa = this.capaEl, dpr = Math.min(devicePixelRatio || 1, 3);
    const Wc = Math.max(1, Math.round(capa.clientWidth * dpr)), Hc = Math.max(1, Math.round(capa.clientHeight * dpr));
    this.tamaño = Wc + "x" + Hc;
    if (cv.width !== Wc || cv.height !== Hc) {
      cv.width = Wc;
      cv.height = Hc;
    }
    let s = Math.min(Wc / W, Hc / HT);
    const ent = Math.floor(s + 1e-6);
    const entero = ent >= 1 && (s - ent) / s < .015;
    if (entero) s = ent;
    const ox = Math.round((Wc - W * s) / 2), oy = Math.round((Hc - HT * s) / 2), dw = Math.round(W * s), dh = Math.round(HT * s);
    this.geo = {
      s: s,
      ox: ox,
      oy: oy
    };
    const x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = "#000";
    x.fillRect(0, 0, Wc, Hc);
    if (entero || s < 1) {
      x.imageSmoothingEnabled = s < 1;
      x.drawImage(this.buf, ox, oy, dw, dh);
      return;
    }
    const k = Math.ceil(s);
    if (!this.grande || this.grande.width !== W * k) {
      this.grande = document.createElement("canvas");
      this.grande.width = W * k;
      this.grande.height = HT * k;
      this.gctx = this.grande.getContext("2d");
    }
    this.gctx.imageSmoothingEnabled = false;
    this.gctx.drawImage(this.buf, 0, 0, W * k, HT * k);
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(this.grande, ox, oy, dw, dh);
  }
  colorPulso() {
    const p = this.pulso;
    if (p < 32) return [ 255, 64, 64 ];
    if (p < 56) return [ 255 - 8 * (p - 31), 64 - 2 * (p - 31), 64 - 2 * (p - 31) ];
    return [ 63 + 8 * (p - 55), 16 + 2 * (p - 55), 16 + 2 * (p - 55) ];
  }
  dibujarTitulo(fb) {
    const T = this.R.tex, F = this.fondo, g = F.g, E = this.estado;
    const col = F.tinte.color, bf = F.brillo / 128;
    this.dibujarBaldosas(fb, escalar(col, bf));
    const fr = F.franja;
    if (fr.t >= 0 && fr.brillo > 0) {
      const c = escalar(complemento(col), fr.brillo / 128 * bf);
      blit(fb, T[fr.rec.tex], 0, fr.y, 320, 500, c[0], c[1], c[2], RESTA, fr.rec.sx, fr.rec.sy, 53, 83);
    }
    const ec = F.eco;
    if (ec.activo) {
      const c = escalar(complemento(col), ec.brillo / 128 * bf), k = ec.k;
      blit(fb, this.foto, 160 - 160 * k, 112 - 112 * k, 320 * k, 224 * k, c[0], c[1], c[2], MITAD);
    }
    const bTitulo = g < 128 ? 0 : g < 256 ? g - 128 : g < 287 ? Math.min(252, 128 + 4 * (g - 256)) : g < 384 ? 255 - (g - 287) * 4 / 3 : 128;
    const bWaku = g < 192 ? 0 : Math.min(128, g - 192);
    const bCara = g < 256 ? 0 : Math.min(128, g - 256);
    if (bWaku > 0) blit(fb, T.op_snake_waku, 82, 13, 156, 214, bWaku, bWaku, bWaku, RESTA);
    if (bCara > 0) {
      blit(fb, T.op_snake_cut, 102, 36, 116, 181, bCara, bCara, bCara, ADD);
      blit(fb, T[this.ojo > 0 ? "op_eye_close" : "op_eye_open"], 130, 115, 50, 12, bCara, bCara, bCara, ADD);
    }
    if (bTitulo > 0) blit(fb, T.op_title, 48, 10, 230, 60, bTitulo, bTitulo, bTitulo, ADD);
    if (bCara > 0) blit(fb, T.op_copy, 72, 208, 176, 7, bCara, bCara, bCara, ADD);
    if (E === "menu" || E === "saliendo" && this.pantalla === "titulo") this.dibujarMenu(fb); else if (g >= 376) {
      const c = g < 408 ? [ Math.min(255, (g - 376) * 8), (g - 376) * 2, (g - 376) * 2 ] : this.colorPulso();
      blit(fb, T.op_p_start, 80, 182, 160, 8, c[0], c[1], c[2], ADD);
    }
  }
  colorVertice(y) {
    const rojo = this.colorPulso();
    if (y <= 167 || y >= 205) return [ 0, 0, 0 ];
    if (y < 175) return escalar(VERDE, (y - 167) / 8);
    if (y < 182) return mezclar(VERDE, rojo, (y - 175) / 7);
    if (y <= 190) return rojo;
    if (y < 197) return mezclar(rojo, VERDE, (y - 190) / 7);
    return escalar(VERDE, (205 - y) / 8);
  }
  dibujarMenu(fb) {
    const N = this.entradas.length, d = this.anim ? this.anim.dir * this.anim.f * 3 : 0;
    for (let k = -2; k <= 2; k++) {
      const i = ((this.sel + k) % N + N) % N, y = 182 + k * 15 - d;
      if (y <= 160 || y >= 205) continue;
      const t = this.rotulos[i], x = 160 - Math.floor(t.w / 2);
      const a = this.colorVertice(y), b = this.colorVertice(y + 8);
      blit(fb, t, x, y, t.w, 8, 128, 128, 128, ADD, 0, 0, t.w, t.h, [ a[0], a[1], a[2], b[0], b[1], b[2] ]);
    }
  }
  cursor(fb, x0, y0, w, h, brillo = 255, modo = 1) {
    const T = this.R.tex, m = modo === 1 ? 6 : 8, i = modo === 1 ? 2 : 0, b = brillo;
    if (b <= 0) return;
    blit(fb, T.cur_lu, x0 - m, y0 - m, 8, 8, b, b, b, ADD);
    blit(fb, T.cur_ru, x0 + w - i, y0 - m, 8, 8, b, b, b, ADD);
    blit(fb, T.cur_ld, x0 - m, y0 + h - i, 8, 8, b, b, b, ADD);
    blit(fb, T.cur_rd, x0 + w - i, y0 + h - i, 8, 8, b, b, b, ADD);
    blit(fb, T.cur_u, x0 + i, y0 - m, w - 2 * i, 8, b, b, b, ADD);
    blit(fb, T.cur_d, x0 + i, y0 + h - i, w - 2 * i, 8, b, b, b, ADD);
    blit(fb, T.cur_l, x0 - m, y0 + i, 8, h - 2 * i, b, b, b, ADD);
    blit(fb, T.cur_r, x0 + w - i, y0 + i, 8, h - 2 * i, b, b, b, ADD);
    blit(fb, T.cur_c, x0 + i, y0 + i, w - 2 * i, h - 2 * i, b, b, b, ADD);
  }
  dibujarNivel(fb) {
    const T = this.R.tex;
    blit(fb, T.sp_back_l, 0, 0, 160, 224, 128, 128, 128);
    blit(fb, T.sp_back_r, 160, 0, 160, 224, 128, 128, 128);
    blit(fb, T.op_sellevel, 74, 27, 172, 12, ITEM[0], ITEM[1], ITEM[2], ADD);
    NIVELES.forEach((n, i) => {
      const c = i === this.selNivel ? SEL : i === 4 && !this.extremo ? BLOQ : ITEM;
      const t = this.texto("menu", n.texto);
      blit(fb, t, n.x, n.y, t.w, t.h, c[0], c[1], c[2], ADD);
      if (n.extra) {
        let e = this.textos.get("c|EXTRA");
        if (!e) {
          e = textoChico(this.R.f5, "EXTRA");
          this.textos.set("c|EXTRA", e);
        }
        blit(fb, e, n.cur[0] + n.cur[2] + 10, n.y, e.w, e.h, TIT[0], TIT[1], TIT[2], ADD);
      }
    });
    const r = NIVELES[this.selNivel].cur;
    this.cursor(fb, r[0], r[1], r[2], r[3], 255, 1);
    if (this.selNivel >= 3) {
      const t = this.radarOff;
      blit(fb, t, 162 - t.w, 196 - 5, t.w * 2, 10, RADAR[0], RADAR[1], RADAR[2], ADD);
    }
    if (this.puntero) blit(fb, T.sp_exit, 132, 208, 56, 12, ITEM[0], ITEM[1], ITEM[2], ADD);
  }
  dibujarModo(fb) {
    const T = this.R.tex;
    blit(fb, T.sp_back_l, 0, 0, 160, 224, 128, 128, 128);
    blit(fb, T.sp_back_r, 160, 0, 160, 224, 128, 128, 128);
    const caja = this.cajaModo ||= rotuloCaja(this.R.f8, "MODO DE CAMARA", 20);
    blit(fb, caja, 160 - Math.floor(caja.w / 2), 22, caja.w, 12, ITEM[0], ITEM[1], ITEM[2], ADD);
    const chico = (txt, y, c) => {
      let t = this.textos.get("c|" + txt);
      if (!t) {
        t = textoChico(this.R.f5, txt);
        this.textos.set("c|" + txt, t);
      }
      blit(fb, t, 160 - Math.floor(t.w / 2), y, t.w, t.h, c[0], c[1], c[2], ADD);
    };
    MODOS.forEach((m, i) => {
      const y = Y_MODOS[i], elegido = i === this.selModo, c = elegido ? SEL : ITEM;
      const t = this.texto("menu", m.texto), x = 160 - Math.floor(t.ancho / 2);
      blit(fb, t, x, y, t.w, t.h, c[0], c[1], c[2], ADD);
      if (elegido) this.cursor(fb, x - 4, y - 2, t.ancho + 6, 9, 255, 1);
      const cl = elegido ? ITEM : TIT;
      m.lineas.forEach((l, k) => chico(l, y + 13 + k * 8, cl));
      if (this.hayVR) chico(m.vr, y + 13 + m.lineas.length * 8, elegido ? RADAR : TIT);
    });
    chico("SE PUEDE CAMBIAR DESPUES EN OPCIONES", Y_MODO_PIE, TIT);
    const ok = this.texto("menu", "CONTINUAR"), c = this.colorPulso();
    blit(fb, ok, 160 - Math.floor(ok.ancho / 2), Y_MODO_OK, ok.w, ok.h, c[0], c[1], c[2], ADD);
  }
  dibujarOpciones(fb) {
    const T = this.R.tex, E = this.estado, f = E === "opc_abre" ? this.f : 48, caja = this.cajaOpc;
    const k = E === "opc_cierra" ? Math.max(0, 1 - this.f / 16) : 1;
    const xF = 160 - Math.floor(caja.w / 2), tit = escalar(TIT, k);
    const bF = (f < 33 ? 0 : f <= 36 ? Math.round(12.75 * (f - 32)) : f <= 42 ? Math.round(64 + (f - 37) * 12.8) : 128) * k;
    if (bF > 0) {
      blit(fb, T.sp_back_l, 0, 0, 160, 224, bF, bF, bF);
      blit(fb, T.sp_back_r, 160, 0, 160, 224, bF, bF, bF);
    }
    const yT = f <= 28 ? 99 : f <= 32 ? 99 - 20 * (f - 28) : 19;
    if (f < 8) {
      blit(fb, caja, xF + 240 - 30 * f, 99, caja.w, 12, tit[0], tit[1], tit[2], ADD);
      blit(fb, caja, xF - 240 + 30 * f, 99, caja.w, 12, tit[0], tit[1], tit[2], ADD);
    } else blit(fb, caja, xF, yT, caja.w, 12, tit[0], tit[1], tit[2], ADD);
    const bM = f < 13 ? 0 : f <= 16 ? 64 * (f - 12) - 1 : f <= 24 ? 255 : Math.max(0, 255 - 64 * (f - 24));
    if (bM > 0 && f <= 28) this.cursor(fb, xF, 99, caja.w, 13, bM, 0);
    if (f < 37) return;
    const abre = f >= 43 ? 1 : (f - 36) / 6;
    const item = (t, x, y, c) => {
      const w = Math.max(1, Math.round(t.w * abre)), cx = x + t.w / 2;
      blit(fb, t, cx - w / 2, y, w, t.h, c[0] * k, c[1] * k, c[2] * k, ADD);
    };
    FILAS.forEach((fila, i) => {
      const disp = this.filaDisponible(i), elegida = i === this.selOpc && f >= 45;
      const c = !disp ? BLOQ : elegida ? SEL : ITEM;
      if (fila.clave === "salir") {
        item(T.sp_exit, 132, Y_EXIT, c);
        if (elegida && E !== "opc_cierra") this.cursor(fb, 132, Y_EXIT, 56, 12, 255, 1);
        return;
      }
      const y = Y_FILAS + i * PASO_FILAS;
      item(this.texto("plano", fila.texto), X_ROTULO, y, c);
      const nombre = disp ? fila.nombres[Math.max(0, fila.valores.indexOf(this.opc[fila.clave]))] : "NO DISPONIBLE";
      const tv = this.texto("plano", nombre), xv = X_VALOR - Math.floor(tv.w / 2);
      item(tv, xv, y, c);
      if (elegida && E !== "opc_cierra") this.cursor(fb, xv, y, tv.w, 8, 255, 1);
    });
  }
}
