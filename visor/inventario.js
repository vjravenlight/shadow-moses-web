// MGS web — FeniXVOID · Project Ravenlight
import { leerFotos, agregarFoto, recortarFoto } from "./fotos.js";

import * as THREE from "three";

import { integral } from "./integral.js";

import { atlasNum, disposicionHud } from "./hud.js";

import { ducto as ductoSnake } from "./ducto.js";

import * as ctl from "./controles.js";

import { Tablero, fuenteDe } from "./codec.js";

import { idioma } from "./idioma.js";

const FPS = 30, MM = .001;

export const PAD = {
  L2: 1,
  R2: 2,
  L1: 4,
  R1: 8,
  TRI: 16,
  CIR: 32,
  CRU: 64,
  CUA: 128,
  SEL: 256,
  START: 2048,
  ARRIBA: 4096,
  DER: 8192,
  ABAJO: 16384,
  IZQ: 32768
};

export const WP = {
  NINGUNA: -1,
  SOCOM: 0,
  FAMAS: 1,
  GRENADE: 2,
  NIKITA: 3,
  STINGER: 4,
  CLAYMORE: 5,
  C4: 6,
  STUN: 7,
  CHAFF: 8,
  PSG1: 9
};

export const IT = {
  NINGUNO: -1,
  CIGS: 0,
  SCOPE: 1,
  BOX1: 2,
  BOX2: 3,
  BOX3: 4,
  NVG: 5,
  THERMG: 6,
  GASMASK: 7,
  BODYARMOR: 8,
  KETCHUP: 9,
  STEALTH: 10,
  BANDANA: 11,
  CAMERA: 12,
  RATION: 13,
  MEDICINE: 14,
  DIAZEPAM: 15,
  PALKEY: 16,
  CARD: 17,
  TIMERBOMB: 18,
  MINED: 19,
  DISC: 20,
  ROPE: 21,
  SCARF: 22,
  SUPPR: 23
};

export const TIPO_ARMA = [ 36930, 36931, 16716, 8384, 8736, 16656, 16656, 16716, 16716, 37408 ];

export const TIPO_ITEM = [ 32768, 32771, 32769, 32769, 32769, 32768, 32768, 32768, 32768, 32768, 32768, 32768, 32771, 8192, 8192, 8192, 0, 0, 0, 0, 0, 0, 0, 0 ];

export const NOMBRE_ARMA = [ "SOCOM", "FA-MAS", "GRENADE", "NIKITA", "STINGER", "CLAYMORE", "C4", "STUN.G", "CHAFF.G", "PSG1" ];

export const NOMBRE_ITEM = [ "CIGS", "SCOPE", "C.BOX A", "C.BOX B", "C.BOX C", "N.V.G", "THERM.G", "GASMASK", "B.ARMOR", "KETCHUP", "STEALTH", "BANDANA", "CAMERA", "RATION", "MEDICINE", "DIAZEPAM", "PAL KEY", "CARD", "TIMER.B", "MINE.D", "DISC", "ROPE", "SCARF", "SUPPR." ];

const RPK_ARMA = [ 1, 3, 5, 10, 9, 8, 7, 6, 11, 4 ];

const RPK_ITEM = [ 14, 30, 17, 17, 17, 15, 16, 19, 18, 25, 32, 31, 12, 22, 21, 21, 23, 27, 26, 20, 28, 24, 29, 13 ];

const NO_USE = 40, FROZEN = 48;

export const SE = {
  EQUIPAR: 20,
  ABRIR: 21,
  TOMAR: 22,
  ELEGIR: 23,
  LLENO: 11,
  RECUPERA: 12,
  APARECE: 13,
  FOTO: 17,
  MEDICINA: 34,
  ZUMBADOR: 35,
  CURSOR: 54,
  CONGELADA: 115,
  DESCONGELA: 119,
  BOMBA_TIC: 117,
  SALIR: 33
};

export const MAXIMOS = [ null, {
  vida: 256,
  armas: [ 25, 0, 8, 0, 0, 0, 4, 3, 3, 0 ],
  racion: [ 2, 2, 2, 1 ],
  medicina: 0,
  diazepam: 0
}, {
  vida: 320,
  armas: [ 49, 101, 12, 0, 0, 6, 6, 6, 6, 0 ],
  racion: [ 2, 2, 2, 1 ],
  medicina: 0,
  diazepam: 3
}, {
  vida: 384,
  armas: [ 73, 151, 16, 12, 0, 8, 8, 9, 9, 0 ],
  racion: [ 3, 3, 2, 1 ],
  medicina: 0,
  diazepam: 3
}, {
  vida: 448,
  armas: [ 97, 201, 20, 12, 0, 10, 10, 12, 12, 0 ],
  racion: [ 3, 3, 2, 1 ],
  medicina: 0,
  diazepam: 3
}, {
  vida: 512,
  armas: [ 121, 251, 24, 16, 0, 12, 12, 15, 15, 16 ],
  racion: [ 4, 4, 2, 1 ],
  medicina: 1,
  diazepam: 6
}, {
  vida: 576,
  armas: [ 145, 301, 28, 20, 20, 14, 14, 18, 18, 21 ],
  racion: [ 4, 4, 2, 1 ],
  medicina: 1,
  diazepam: 6
}, {
  vida: 640,
  armas: [ 168, 351, 32, 24, 25, 16, 16, 21, 21, 26 ],
  racion: [ 5, 5, 2, 1 ],
  medicina: 1,
  diazepam: 9
}, {
  vida: 704,
  armas: [ 192, 401, 36, 28, 30, 16, 16, 24, 24, 31 ],
  racion: [ 5, 5, 2, 1 ],
  medicina: 1,
  diazepam: 9
}, {
  vida: 768,
  armas: [ 217, 451, 36, 32, 35, 16, 16, 27, 27, 36 ],
  racion: [ 5, 5, 2, 1 ],
  medicina: 1,
  diazepam: 9
} ];

const CONF = [ {
  x: 16,
  y: 184,
  boton: PAD.L2,
  rapido: PAD.L1,
  mas: PAD.DER | PAD.ABAJO,
  menos: PAD.ARRIBA | PAD.IZQ,
  pos: "der",
  neg: "arriba"
}, {
  x: 256,
  y: 184,
  boton: PAD.R2,
  rapido: PAD.R1,
  mas: PAD.ARRIBA | PAD.DER,
  menos: PAD.ABAJO | PAD.IZQ,
  pos: "arriba",
  neg: "izq"
} ];

const SIGNOS = {
  ".": [ 60, 3 ],
  ",": [ 66, 3 ],
  "·": [ 66, 3 ],
  ":": [ 72, 3 ],
  "-": [ 78, 5 ],
  "!": [ 84, 3 ],
  "?": [ 90, 6 ],
  "+": [ 96, 6 ],
  _: [ 102, 6 ],
  "=": [ 108, 6 ],
  "%": [ 114, 6 ],
  "[": [ 120, 4 ],
  "(": [ 120, 4 ],
  "]": [ 126, 4 ],
  ")": [ 126, 4 ],
  "/": [ 256, 6 ],
  "*": [ 262, 6 ]
};

const EXTRA = {
  256: [ "00001", "00010", "00100", "01000", "10000" ],
  262: [ "10101", "01110", "11111", "01110", "10101" ]
};

const TEMAS = {
  juego: {
    marco: "#000",
    ventana: "rgba(0,0,0,0.5)",
    sel: "rgba(0,0,128,0.5)",
    texto: "189,189,189",
    num: "123,123,123",
    cero: "189,41,0",
    bala: "247,41,0",
    mod: {
      texto: [ 128, 128, 128 ],
      num: [ 87, 87, 87 ],
      cero: [ 128, 32, 0 ],
      bala: [ 128, 32, 32 ]
    }
  },
  verde: {
    marco: "rgb(2,12,6)",
    ventana: "rgba(0,22,10,0.5)",
    sel: "rgba(0,110,60,0.55)",
    texto: "180,244,172",
    num: "127,176,140",
    cero: "216,52,42",
    bala: "255,90,70"
  }
};

const TECLAS = {
  KeyZ: PAD.L2,
  KeyX: PAD.R2,
  Digit1: PAD.L1,
  Digit2: PAD.R1,
  ArrowUp: PAD.ARRIBA,
  ArrowDown: PAD.ABAJO,
  ArrowLeft: PAD.IZQ,
  ArrowRight: PAD.DER,
  KeyW: PAD.ARRIBA,
  KeyS: PAD.ABAJO,
  KeyA: PAD.IZQ,
  KeyD: PAD.DER,
  Enter: PAD.CIR,
  Space: PAD.CIR
};

const SOLO_ABIERTO = PAD.ARRIBA | PAD.ABAJO | PAD.IZQ | PAD.DER | PAD.CIR;

const MANDO = [ [ ctl.B.CRUZ, PAD.CRU ], [ ctl.B.CIRCULO, PAD.CIR ], [ ctl.B.CUADRADO, PAD.CUA ], [ ctl.B.TRIANGULO, PAD.TRI ], [ ctl.B.L1, PAD.L1 ], [ ctl.B.R1, PAD.R1 ], [ ctl.B.L2, PAD.L2 ], [ ctl.B.R2, PAD.R2 ], [ ctl.B.ARRIBA, PAD.ARRIBA ], [ ctl.B.ABAJO, PAD.ABAJO ], [ ctl.B.IZQ, PAD.IZQ ], [ ctl.B.DER, PAD.DER ] ];

const POR_NOMBRE = [ [ /^SOCOM\s*\/\s*SUPPRES/i, 1, 23, 1 ], [ /^SOCOM\s*\/\s*BULLET/i, 2, 0, 12 ], [ /^SOCOM/i, 0, 0, 12 ], [ /^FA-?MAS\s*\/\s*BULLET/i, 2, 1, 25 ], [ /^FA-?MAS/i, 0, 1, 26 ], [ /^PSG1\s*\/\s*BULLET/i, 2, 9, 5 ], [ /^PSG1/i, 0, 9, 5 ], [ /^STINGER\s*MISSILE/i, 3, 4, 5 ], [ /^STINGER/i, 0, 4, 1 ], [ /^NIKITA\s*\/?\s*MISSILE/i, 3, 3, 4 ], [ /^NIKITA/i, 0, 3, 4 ], [ /^GRENADE/i, 0, 2, 4 ], [ /^STUN/i, 0, 7, 3 ], [ /^CHAFF/i, 0, 8, 3 ], [ /^C4/i, 0, 6, 2 ], [ /^CLAYMORE/i, 0, 5, 1 ], [ /RATION/i, 4, 13, 1 ], [ /^MEDICINE/i, 5, 14, 1 ], [ /^DIAZEPAM/i, 5, 15, 3 ], [ /BOX\s*\/?\s*A$/i, 1, 2, 1 ], [ /BOX\s*\/?\s*B$/i, 1, 3, 1 ], [ /BOX\s*\/?\s*C$/i, 1, 4, 1 ], [ /NIGHT\s*VISION/i, 1, 5, 1 ], [ /THERMAL/i, 1, 6, 1 ], [ /GAS\s*MASK/i, 1, 7, 1 ], [ /BODY\s*ARMOR/i, 1, 8, 1 ], [ /^CAMERA/i, 1, 12, 1 ], [ /MINE\s*DETECTOR/i, 1, 19, 1 ], [ /^ROPE/i, 1, 21, 1 ], [ /PAL\s*KEY/i, 6, 16, 1 ], [ /^BOMB/i, 8, 18, 15 ], [ /CARD/i, 1, 17, 1 ] ];

const ALT_SNAKE = [ 1100, 496, 136 ];

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function teñir(img, rgb, factor = 1) {
  const c = document.createElement("canvas");
  if (!img) {
    c.width = c.height = 1;
    return c;
  }
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  if (rgb) {
    x.globalCompositeOperation = "source-in";
    x.fillStyle = `rgb(${rgb})`;
    x.fillRect(0, 0, c.width, c.height);
  }
  if (factor !== 1) {
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      p[i] *= factor;
      p[i + 1] *= factor;
      p[i + 2] *= factor;
    }
    x.putImageData(d, 0, 0);
  }
  return c;
}

export class Inventario {
  constructor(opts = {}) {
    this.o = opts;
    this.dificultad = opts.dificultad ?? 2;
    this.se = opts.se || (() => {});
    this.tema = TEMAS[opts.tema] || TEMAS.verde;
    this.tactil = !!opts.tactil;
    this.armas = new Array(10).fill(-1);
    this.armasMax = new Array(10).fill(0);
    this.items = new Array(24).fill(-1);
    this.itemsMax = [ 0, 0, 0 ];
    this.arma = -1;
    this.item = -1;
    this.cargador = 0;
    this.cargadorMax = 0;
    this.vidaMax = 256;
    this._vida = 256;
    this.diazepam = 0;
    this.resfriado = false;
    this.ambiente = 0;
    this.racionTemp = 0;
    this.congeladas = false;
    this.bomba = 0;
    this.palEstado = 0;
    this.palTemp = 0;
    this.palMax = 9e3;
    this.palMin = -9e3;
    this.equipoApagado = false;
    this.deshabilitadas = 0;
    this.deshabilitados = 0;
    this.usoRaciones = 0;
    this.fotos = leerFotos();
    this.misilEnVuelo = false;
    this.chaff = false;
    this.agachado = false;
    this.ducto = false;
    this.padExterno = null;
    this.sinArmas = false;
    this.mascaraPad = 0;
    this.padCrudo = 0;
    this.juego = null;
    this.aplicarMaximos(opts.nivelHistoria ?? 1);
    this.lados = [ 0, 1 ].map(k => ({
      k: k,
      conf: CONF[k],
      estado: 0,
      lista: null,
      sel: 0,
      max: 0,
      min: 0,
      mov: {
        n: 0,
        paso: 0
      },
      rep: -1,
      parpadeo: 0,
      actual: {
        id: -1,
        num: 0,
        pos: 0,
        cur: 1
      },
      ultimo: -1,
      previo: k === 0 ? 0 : -1
    }));
    this.menu = -1;
    this.zoom = 0;
    this.pad = {
      status: 0,
      press: 0,
      prev: 0
    };
    this.teclas = new Set;
    this.toque = 0;
    this.toqueSuelto = 0;
    this.acum = 0;
    this.cuadro = 0;
    this.textos = [];
    this.fijos = new Map;
    this.sueltos = [];
    this.ultPos = null;
    this.cajaMov = false;
    this.alCambiar = opts.alCambiar || null;
    this._prevArma = this.arma;
    this._prevItem = this.item;
    this.listo = false;
    this.cargar();
    this.cargarDescripciones();
    if (typeof addEventListener === "function") addEventListener("mgs:idioma", e => {
      if (e.detail?.clave === "texto") this.cargarDescripciones();
    });
    if (opts.contenedor !== null) this.crearLienzo(opts.contenedor || document.body);
    if (opts.teclado !== false) this.conectarTeclado();
  }
  async cargar() {
    let [num, atlas, meta] = await Promise.all([ cargarImg("assets/hud/num.png"), cargarImg("assets/hud/inventario.png"), fetch("assets/hud/inventario.json").then(r => r.json()).catch(() => ({})) ]);
    this.meta = meta;
    this.atlas = teñir(atlas, null);
    this.atlasOsc = teñir(atlas, null, .5);
    integral.listo.then(async d => {
      const ic = d?.muy_facil?.icono;
      if (!ic) return;
      const im = await cargarImg("assets/" + ic.png);
      if (im) this.mp5 = {
        claro: teñir(im, null),
        osc: teñir(im, null, .5),
        ox: ic.ox,
        oy: ic.oy
      };
    });
    const t = this.tema;
    if (num) {
      const c = document.createElement("canvas");
      c.width = 268;
      c.height = num.height;
      const x = c.getContext("2d");
      x.drawImage(num, 0, 0);
      x.fillStyle = "#fff";
      for (const [x0, filas] of Object.entries(EXTRA)) filas.forEach((f, y) => [ ...f ].forEach((b, i) => {
        if (b === "1") x.fillRect(+x0 + i, y, 1, 1);
      }));
      num = c;
    }
    this.letras = {};
    for (const [k, c] of Object.entries({
      texto: t.texto,
      num: t.num,
      cero: t.cero,
      bala: t.bala,
      blanco: "200,200,200",
      rojo: "255,48,48",
      negro: "1,1,1",
      cian: "0,160,160"
    })) this.letras[k] = teñir(num, c);
    this.listo = true;
  }
  async cargarDescripciones() {
    try {
      await (idioma.listo || idioma.iniciar());
      const T = idioma.texto, bajar = u => fetch(u).then(r => r.ok ? r.json() : null, () => null);
      let d = T !== "en" ? await bajar(`assets/idiomas/${T}/textos.json`) : null, dir = `assets/idiomas/${T}/codec/ui/`;
      if (!d) {
        d = await bajar("assets/hud/descripciones.json");
        dir = "assets/codec/ui/";
      }
      const f = d ? await fuenteDe(dir) : null;
      this.desc = d && f ? {
        d: d,
        tab: new Tablero(f, 200, 80),
        clave: ""
      } : null;
    } catch (e) {
      console.warn("descripciones:", e);
      this.desc = null;
    }
  }
  textoDescripcion(L, p) {
    const D = this.desc?.d;
    if (!D || p.id < 0) return null;
    if (L.k === 1) return D.armas?.[p.id] ?? null;
    let t = D.items?.[p.id] ?? null;
    if (this.congeladas && p.id === IT.RATION) t = D.items?.[24] ?? t;
    if (this.congeladas && p.id === IT.KETCHUP) t = D.items?.[25] ?? t;
    if (t && p.id === IT.CARD && D.carta >= 0) t = t.slice(0, D.carta) + String(Math.max(1, this.tarjeta)) + t.slice(D.carta + 1);
    return t;
  }
  dibujarDescripcion(x, L) {
    const p = L.lista?.[L.sel];
    if (!this.desc || L.estado !== 1 || !p || p.pos !== 0 || L.mov.n > 0) {
      L.descDesde = 0;
      return;
    }
    const ahora = performance.now();
    if (L.descSel !== L.sel || !L.descDesde) {
      L.descSel = L.sel;
      L.descDesde = ahora;
    }
    if (ahora - L.descDesde < 4e3 / 30) return;
    const t = this.textoDescripcion(L, p);
    if (!t) return;
    const D = this.desc, clave = L.k + ":" + t;
    if (D.clave !== clave) {
      D.clave = clave;
      D.tab.imprimir(t);
      D.img = D.tab.volcar();
    }
    const [bx, by] = this.base[L.k], x0 = L.k ? bx - 212 : bx + 70, y0 = Math.max(12, by - 112);
    const rot = L.k ? "WEAPON" : "EQUIP", w = 210, x3 = x0 - 10;
    const xr = this.letra(x, x0 - 8, -100, rot, "texto") + 12 - (x0 - 8);
    x.fillStyle = "rgba(0,0,0,0.75)";
    x.beginPath();
    x.moveTo(x3, y0 - 9);
    x.lineTo(x3 + xr, y0 - 9);
    x.lineTo(x3 + xr + 10, y0);
    x.lineTo(x3, y0);
    x.closePath();
    x.fill();
    x.fillRect(x3, y0, w, 80);
    this.letra(x, x0 - 8, y0 - 7, rot, "texto");
    x.drawImage(D.img, x0, y0);
  }
  get nivelJuego() {
    return this.dificultad - 1;
  }
  get tarjeta() {
    return Math.max(0, this.items[IT.CARD]);
  }
  get silenciador() {
    return this.items[IT.SUPPR];
  }
  get enCaja() {
    return this.item >= IT.BOX1 && this.item <= IT.BOX3 && !this.agachado;
  }
  aplicarMaximos(nivel) {
    this.nivelHistoria = Math.max(1, Math.min(9, nivel | 0));
    const m = MAXIMOS[this.nivelHistoria], d = Math.max(0, Math.min(3, this.nivelJuego));
    this.armasMax = m.armas.slice();
    this.itemsMax = [ m.racion[d], m.medicina, m.diazepam ];
    this.vidaMax = m.vida;
  }
  aplicarEstado(e) {
    if (!e || e.error) return;
    if (e.nivel_historia > 0) this.aplicarMaximos(e.nivel_historia);
    if (Array.isArray(e.armas)) this.armas = e.armas.slice(0, 10);
    if (Array.isArray(e.armas_max) && e.armas_max.some(v => v > 0)) this.armasMax = e.armas_max.slice(0, 10);
    if (Array.isArray(e.items)) this.items = e.items.slice(0, 24);
    if (Array.isArray(e.items_max)) {
      this.itemsMax = e.items_max.slice(0, 3);
      const d = Math.max(0, Math.min(3, this.nivelJuego));
      this.itemsMax[0] = MAXIMOS[this.nivelHistoria].racion[d];
    }
    if (e.vida_max > 0) this.vidaMax = e.vida_max;
    this.arma = this.armas[WP.SOCOM] >= 0 ? WP.SOCOM : -1;
    this.item = -1;
    this.lados[1].ultimo = this.arma;
    this.lados[0].ultimo = -1;
  }
  async cargarPuertas(st, aplicar = true) {
    if (/^(?:vr|vab|vcd|vefgh|vijkl|photo)_/.test(st)) {
      this.puertas = new Map;
      return null;
    }
    try {
      const j = await (await fetch(`assets/niveles/${st}/puertas.json`)).json();
      this.puertas = new Map((j.puertas || []).map(p => [ p.nombre, p ]));
      if (aplicar && j.estado_entrada) this.aplicarEstado(j.estado_entrada);
      return j;
    } catch {
      this.puertas = new Map;
      return null;
    }
  }
  conectarJuego(juego) {
    this.juego = juego;
  }
  getVida() {
    return this.juego ? this.juego.vida * this.vidaMax : this._vida;
  }
  setVida(v) {
    v = Math.max(0, Math.min(this.vidaMax, v));
    if (this.juego) this.juego.vida = v / this.vidaMax; else this._vida = v;
  }
  itemDeshabilitado(id) {
    if (id < 0) return false;
    if (this.arma >= 0 && TIPO_ARMA[this.arma] & 512 && TIPO_ITEM[id] & 1) return true;
    if ((this.agachado || this.ducto || ductoSnake.activo) && id >= IT.BOX1 && id <= IT.BOX3) return true;
    if (this.misilEnVuelo && [ IT.SCOPE, IT.BOX1, IT.BOX2, IT.BOX3, IT.CAMERA ].includes(id)) return true;
    return (this.deshabilitados & 1 << id) !== 0;
  }
  armaDeshabilitada(id) {
    if (id < 0) return false;
    if (this.sinArmas) return true;
    if (this.item >= 0 && TIPO_ITEM[this.item] & 1 && TIPO_ARMA[id] & 512) return true;
    if (this.agachado && id === WP.STINGER) return true;
    if ((this.chaff || this.jamming) && id === WP.NIKITA) return true;
    if (this.misilEnVuelo && (id === WP.STINGER || id === WP.PSG1)) return true;
    return (this.deshabilitadas & 1 << id) !== 0;
  }
  tipoItem(entrada) {
    if (entrada._tipo !== undefined) return entrada._tipo;
    const o = entrada.actor?.opts || entrada.opts || null, num = (k, d) => o && Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    let b, id, n;
    if (o && num("i", null) !== null) {
      b = num("b", 0);
      id = num("i", 0);
      n = num("n", 1);
    } else {
      const nom = String(entrada.nombre || "").trim(), r = POR_NOMBRE.find(x => x[0].test(nom));
      if (!r) return entrada._tipo = null;
      [, b, id, n] = r;
      const m = nom.match(/[*x]\s*(\d+)/i);
      if (m) n = +m[1];
    }
    const h = num("h", 450);
    let t = null;
    if (id === 255) t = {
      modo: 0,
      id: id,
      num: n
    }; else if (b === 2 || b === 3) {
      if (!(this.nivelJuego === -1 && id === WP.FAMAS) && id < 10) t = {
        modo: 2,
        id: id,
        num: n
      };
    } else if (b === 0) {
      if (id < 10) t = {
        modo: 1,
        id: id,
        num: n
      };
    } else if (b === 4) {
      if (id === IT.RATION && this.nivelJuego !== 3) t = {
        modo: 0,
        id: id,
        num: n
      };
    } else if (id < 24) t = {
      modo: 0,
      id: id,
      num: n
    };
    if (t) {
      t.msg = String(entrada.nombre || "").trim() || (t.modo ? NOMBRE_ARMA[t.id] : NOMBRE_ITEM[t.id]);
      t.h = h;
      t.caja = b;
    }
    return entrada._tipo = t;
  }
  darTodo() {
    for (let i = 0; i < 10; i++) this.armas[i] = Math.max(this.armas[i], this.armasMax[i] > 0 ? this.armasMax[i] : 99);
    for (let id = 0; id < 24; id++) {
      if (id === IT.TIMERBOMB) continue;
      if (TIPO_ITEM[id] & 8192) {
        const max = this.itemsMax[id - IT.RATION] || 5;
        this.items[id] = Math.max(this.items[id], max);
      } else if (id === IT.CARD) this.items[id] = Math.max(this.items[id], 7); else if (this.items[id] < 1) this.items[id] = 1;
    }
  }
  agregar(t) {
    const {modo: modo, id: id, num: num} = t;
    if (modo === 1) {
      if (this.armas[id] < 0) this.armas[id] = 0;
      if (this.armas[id] >= this.armasMax[id]) return 0;
      this.armas[id] = Math.min(this.armasMax[id], this.armas[id] + num);
      return 1;
    }
    if (modo === 2) {
      if (this.armas[id] < 0) return 2;
      if (this.armas[id] >= this.armasMax[id]) return 0;
      this.armas[id] = Math.min(this.armasMax[id], this.armas[id] + num);
      return 1;
    }
    if (id === 255) {
      this.equipoApagado = false;
      return 1;
    }
    if (TIPO_ITEM[id] & 8192) {
      const max = this.itemsMax[id - IT.RATION];
      if (this.items[id] >= max) return 0;
      if (this.items[id] < 0) this.items[id] = 0;
      this.items[id] = Math.min(max, this.items[id] + num);
      return 1;
    }
    this.items[id] = num;
    return 1;
  }
  enRango(posItem, h, posSnake) {
    const dy = Math.abs(posItem.y + h * MM - (posSnake.y + ALT_SNAKE[this.postura()] * MM));
    return dy <= 1 && Math.abs(posItem.x - posSnake.x) <= .5 && Math.abs(posItem.z - posSnake.z) <= .5;
  }
  postura() {
    return this.o.postura ? this.o.postura() : 0;
  }
  cuadroItems(items, posSnake, espectador = false) {
    const tomados = [];
    if (this.ultPos) this.cajaMov = this.ultPos.distanceToSquared(posSnake) > 1e-8; else this.cajaMov = false;
    (this.ultPos ||= new THREE.Vector3).copy(posSnake);
    for (const it of [ ...items, ...this.sueltos ]) {
      const t = this.tipoItem(it);
      if (!t) {
        if (it.obj.visible && !it._descartado) {
          it.obj.visible = false;
          it._descartado = true;
        }
        continue;
      }
      const e = it._inv ||= {
        estado: 0,
        cont: 0,
        full: null,
        base: null,
        cartel: 0
      };
      if (it.suelto) this.cuadroSuelto(it);
      if (e.estado === 2 || it._descartado) continue;
      if (!it.obj.visible && !it.suelto) continue;
      const p = it.obj.position;
      if (!e.base) e.base = p.clone();
      const h = it.suelto ? 0 : t.h >= 0 ? t.h : 0;
      if (e.full) {
        const mag = Math.max(0, Math.min(80, (90 - e.cont) * 8)) * MM;
        p.x = e.base.x + (this.cuadro & 1 ? -mag : mag);
        if (e.cont > 90) {
          if (this.enRango(e.base, h, posSnake)) e.cont = 50; else {
            e.full = null;
            p.copy(e.base);
          }
        }
        if (e.full) this.texto(it, e.base, h, e.cont < 45 ? t.msg : e.full, "rojo", e.cont);
        e.cont++;
      }
      if (espectador || it.suelto?.estado === 1) continue;
      if (!this.enRango(e.base, h, posSnake)) {
        e.cartel = 0;
        this.cartelPrimeraPersona(it, t, e, posSnake, h);
        continue;
      }
      const r = this.agregar(t);
      if (r === 1) {
        it.obj.visible = false;
        e.estado = 2;
        e.full = null;
        p.copy(e.base);
        this.fijos.delete(it);
        this.se(SE.TOMAR);
        this.textos.push({
          pos: e.base.clone(),
          h: h,
          msg: t.msg,
          color: "blanco",
          t: 0,
          dur: 90
        });
        tomados.push(it);
        it.alTomar?.(t);
      } else if (!e.full) {
        e.full = r === 0 ? "FULL" : "GET WEAPON FIRST";
        e.cont = 0;
        this.se(SE.LLENO);
      }
    }
    this.sueltos = this.sueltos.filter(s => {
      const queda = s._inv?.estado !== 2 && s.suelto.vida !== 0;
      if (!queda) {
        s.obj.removeFromParent();
        this.fijos.delete(s);
      }
      return queda;
    });
    return tomados;
  }
  cartelPrimeraPersona(it, t, e, posSnake, h) {
    if (!this.o.primeraPersona?.() && !this.ducto && !ductoSnake.activo) return;
    const b = e.base;
    if (Math.abs(b.x - posSnake.x) >= 2 || Math.abs(b.z - posSnake.z) >= 2 || Math.abs(b.y + h * MM - posSnake.y - 1) >= 2) return;
    if (e.cartel++ % 60 <= 20) return;
    this.fijos.set(it, {
      pos: b,
      h: h,
      msg: t.msg,
      color: "blanco",
      sube: 0,
      cartel: true,
      hasta: this.cuadro + 2
    });
  }
  texto(it, pos, h, msg, color, cont) {
    this.fijos.set(it, {
      pos: pos,
      h: h,
      msg: msg,
      color: color,
      sube: cont,
      hasta: this.cuadro + 2
    });
  }
  soltarItem(info, pos) {
    const t = {
      modo: info.modo ?? (info.b === 0 ? 1 : info.b === 2 || info.b === 3 ? 2 : 0),
      id: info.id,
      num: info.num ?? 1,
      h: 0,
      msg: info.msg || (info.b === 2 ? NOMBRE_ARMA[info.id] + "/BULLET" : NOMBRE_ITEM[info.id]),
      caja: info.b ?? 4
    };
    if (t.modo === 2 && this.nivelJuego === -1 && t.id === WP.FAMAS) return null;
    const obj = this.o.crearModelo?.(t.caja) || (() => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.3, .2, .3), new THREE.MeshBasicMaterial({
        color: t.caja === 4 ? 8030810 : 6974074
      }));
      m.userData.propio = m.userData.sinColision = true;
      return m;
    })();
    const g = new THREE.Group;
    g.add(obj);
    g.position.copy(pos);
    g.userData.propio = g.userData.sinColision = true;
    (this.o.escena || this.juego?.ctx?.mundo)?.add(g);
    const it = {
      obj: g,
      nombre: t.msg,
      _tipo: t,
      suelto: {
        estado: 1,
        vy: .16,
        vida: 450,
        giro: 512,
        piso: pos.y
      }
    };
    this.se(SE.APARECE);
    this.sueltos.push(it);
    return it;
  }
  cuadroSuelto(it) {
    const s = it.suelto, o = it.obj;
    if (s.giro > 73) s.giro -= 10;
    o.rotation.y += s.giro * Math.PI * 2 / 4096;
    if (s.estado === 1) {
      o.position.y += s.vy;
      const piso = this.juego?.alturaPiso?.(o.position.x, o.position.z, o.position.y + .5) ?? s.piso;
      if (o.position.y <= piso && s.vy < 0) {
        o.position.y = piso;
        s.vy = -s.vy / 16;
        if (s.vy < .016) {
          s.vy = 0;
          s.estado = 0;
          if (it._inv) it._inv.base = o.position.clone();
        }
      } else s.vy -= .016;
    }
    if (s.vida > 0) {
      s.vida--;
      if (s.vida < 90) o.visible = s.vida % 8 >= 2;
      if (s.vida === 0) {
        o.visible = false;
        o.removeFromParent();
      }
    }
  }
  soltarDeGuardia(g, modoAlerta) {
    if (modoAlerta !== 0) return null;
    const o = g.opts || g.o?.userData?.guardia?.opts || {}, h = Array.isArray(o.h) ? o.h : [ 0 ];
    let k = typeof h[0] === "number" ? h[0] : 0;
    if (k === 0) k = [ 2, 3, 4, 1 ][Math.floor(Math.random() * 32767) & 3];
    if (k === 1) return null;
    let info = k === 2 ? {
      b: 4,
      id: IT.RATION,
      num: 1
    } : k === 3 ? {
      b: 2,
      id: WP.SOCOM,
      num: typeof h[1] === "number" ? h[1] : 12
    } : {
      b: 2,
      id: WP.FAMAS,
      num: 25
    };
    if (info.b === 2 && (this.armas[info.id] < 0 || info.id === WP.FAMAS && this.nivelJuego === -1)) info = {
      b: 4,
      id: IT.RATION,
      num: 1
    };
    const p = g.o.position.clone();
    p.y += .5;
    return this.soltarItem(info, p);
  }
  usar(id) {
    const n = this.items[id];
    if (!(n > 0)) return false;
    switch (id) {
     case IT.KETCHUP:
     case IT.RATION:
      {
        if (this.congeladas) {
          this.se(SE.CONGELADA);
          return false;
        }
        if (this.getVida() >= this.vidaMax) {
          this.se(SE.ZUMBADOR);
          return false;
        }
        const cura = id === IT.KETCHUP ? 64 : this.nivelJuego === -1 ? 1024 : this.nivelJuego === 0 ? 384 : 256;
        this.setVida(this.getVida() + cura);
        this.usoRaciones++;
        this.se(SE.RECUPERA);
        if (id === IT.KETCHUP) {
          this.items[id] = 0;
          return true;
        }
        break;
      }

     case IT.MEDICINE:
      this.resfriado = false;
      this.se(SE.MEDICINA);
      break;

     case IT.DIAZEPAM:
      this.diazepam = Math.max(0, this.diazepam) + 1200;
      this.se(SE.MEDICINA);
      break;

     default:
      return false;
    }
    this.items[id] = n - 1;
    return true;
  }
  racionAuto() {
    if (this.getVida() > 0 || this.item !== IT.RATION || !(this.items[IT.RATION] > 0) || this.congeladas) return false;
    let v = this.nivelJuego > 0 ? 256 : 384;
    if (this.nivelJuego < 0) v = this.vidaMax;
    this.items[IT.RATION]--;
    if (this.items[IT.RATION] === 0) this.item = -1;
    this.usoRaciones++;
    this.setVida(v);
    this.se(SE.RECUPERA);
    return true;
  }
  "dañoBala"(d) {
    return this.item === IT.BODYARMOR ? d - (d >> 1) : d;
  }
  cajaVista(g, b92, posSnake, rotSnake, modoAlerta) {
    if (modoAlerta === 1 || b92 !== 2 || !this.enCaja || this.cajaMov) return {
      ver: b92,
      sospecha: false,
      cerca: false,
      caja: false
    };
    const m = g._caja ||= {
      p: new THREE.Vector3(30, 30, 30),
      r: null
    };
    let sospecha = false, cerca = false;
    if (m.p.distanceTo(posSnake) > .05 || m.r !== rotSnake) {
      m.p.copy(posSnake);
      m.r = rotSnake;
      sospecha = true;
    } else if (g.o.position.distanceTo(posSnake) < 1.5) cerca = true;
    return {
      ver: 0,
      sospecha: sospecha,
      cerca: cerca,
      caja: true
    };
  }
  puedeAbrir(puerta, esSnake = true) {
    const p = typeof puerta === "object" ? puerta : this.puertas?.get(puerta);
    if (!p || p.nivel === 0 || p.nivel === undefined) return {
      abre: true,
      zumbador: false
    };
    if (p.nivel === null) return {
      abre: false,
      zumbador: false,
      evento: true
    };
    if (p.solo_snake && !esSnake) return {
      abre: false,
      zumbador: false
    };
    const abre = this.items[IT.CARD] >= p.nivel && (!esSnake || this.item === IT.CARD);
    return {
      abre: abre,
      zumbador: esSnake && !abre && this.item === IT.CARD
    };
  }
  minasRadar(minas) {
    if (this.item !== IT.MINED || this.nivelJuego >= 2) return [];
    return minas.filter(m => !m.disparada).map(m => ({
      p: m.pos,
      r: m.rot,
      dis: 2,
      ang: Math.PI / 2
    }));
  }
  get filtro() {
    return this.item === IT.NVG ? "nvg" : this.item === IT.THERMG ? "termica" : null;
  }
  aplicarFiltro(el) {
    if (!el) return;
    const f = this.filtro, css = f === "nvg" ? "grayscale(1) brightness(1.8) sepia(1) hue-rotate(52deg) saturate(2.6) contrast(1.05)" : f === "termica" ? "grayscale(1) sepia(1) saturate(7) hue-rotate(-42deg) brightness(0.62) contrast(1.15)" : "";
    if (el.style.filter !== css) el.style.filter = css;
  }
  foto(captura, fantasma = 0) {
    this.se(SE.FOTO);
    return Promise.resolve().then(captura).then(img => img ? agregarFoto(this.fotos, {
      img: recortarFoto(img),
      fantasma: fantasma
    }) : null).catch(e => {
      console.warn("foto: " + e.message);
      return null;
    });
  }
  equiparArma(id) {
    if (id >= 0 && (this.armas[id] < 0 || this.armaDeshabilitada(id))) return false;
    this.arma = id;
    if (id >= 0) this.lados[1].ultimo = id;
    return true;
  }
  equiparItem(id) {
    if (id >= 0 && (!(this.items[id] > 0) || this.itemDeshabilitado(id))) return false;
    this.item = id;
    if (id >= 0) this.lados[0].ultimo = id;
    return true;
  }
  alternar(k) {
    const L = this.lados[k];
    if (k === 0) {
      const antes = this.item;
      if (this.item >= 0) this.item = -1; else if (L.ultimo >= 0 && !this.itemDeshabilitado(L.ultimo) && this.items[L.ultimo] > 0) this.item = L.ultimo;
      if (antes !== this.item) this.se(SE.EQUIPAR);
    } else {
      const antes = this.arma;
      if (this.arma >= 0) this.arma = -1; else if (L.ultimo >= 0 && !this.armaDeshabilitada(L.ultimo) && this.armas[L.ultimo] > -1) this.arma = L.ultimo;
      if (antes !== this.arma) this.se(SE.EQUIPAR);
    }
  }
  get abierto() {
    return this.menu >= 0;
  }
  armarLista(k) {
    const L = this.lados[k], lista = [];
    if (this.equipoApagado) return [ {
      id: -1,
      num: 1,
      pos: 0,
      cur: 0
    } ];
    if (k === 0) {
      if (this.item !== -1 && this.item !== IT.CARD) L.previo = this.item; else if (L.previo < 0) L.previo = 0;
      let tarjeta = this.items[IT.CARD] > 0 ? 0 : -1;
      for (let i = 0; i < 24; i++) {
        if (i === L.previo) {
          lista.push({
            id: -1,
            num: 1
          });
          if (tarjeta === 0) {
            if (this.item === -1) lista.push({
              id: IT.CARD,
              num: this.items[IT.CARD]
            }); else tarjeta = 1;
          }
        }
        if (this.items[i] > 0 && i !== IT.CARD) lista.push({
          id: i,
          num: this.items[i]
        });
        if (tarjeta > 0) {
          lista.push({
            id: IT.CARD,
            num: this.items[IT.CARD]
          });
          tarjeta = 0;
        }
      }
    } else {
      if (this.arma !== -1) L.previo = this.arma; else if (L.previo < 0) L.previo = 0;
      for (let i = 0; i < 10; i++) {
        if (i === L.previo) lista.push({
          id: -1,
          num: 1
        });
        if (this.armas[i] >= 0) lista.push({
          id: i,
          num: this.armas[i]
        });
      }
    }
    for (const p of lista) {
      p.pos = 0;
      p.cur = 0;
    }
    return lista;
  }
  reposicionar(L) {
    const n = L.lista.length, mitad = Math.floor(n / 2);
    L.lista[L.sel].pos = 0;
    L.max = mitad * 256 + 128;
    for (let i = 1; i <= mitad; i++) L.lista[(L.sel + i) % n].pos = i * 256;
    const resto = n - (mitad + 1);
    L.min = -(resto * 256 + 128);
    for (let i = 1; i <= resto; i++) L.lista[(L.sel - i + n) % n].pos = -i * 256;
  }
  abrir(k) {
    if (this.menu >= 0) return false;
    const L = this.lados[k];
    L.lista = this.armarLista(k);
    L.sel = Math.max(0, L.lista.findIndex(p => p.id === L.actual.id));
    L.rep = -1;
    L.mov.n = 0;
    this.reposicionar(L);
    L.estado = 2;
    this.zoom = 0;
    this.menu = k;
    L.desc = 0;
    this.se(SE.ABRIR);
    return true;
  }
  cerrarLado(L) {
    const p = L.lista[L.sel];
    L.estado = 0;
    L.actual = {
      id: p.id,
      num: p.num,
      pos: 0,
      cur: 1
    };
    if (L.k === 0) {
      if (L.actual.num <= 0) L.actual.id = -1;
      const id = L.actual.id;
      if (id >= 0 && !this.itemDeshabilitado(id)) {
        this.item = id;
        L.ultimo = id;
      } else {
        if (id !== -1) L.previo = id;
        this.item = -1;
        L.actual.id = -1;
      }
    } else {
      const id = L.actual.id;
      if (id >= 0 && !this.armaDeshabilitada(id)) {
        this.arma = id;
        L.ultimo = id;
      } else {
        if (id !== -1) {
          L.previo = id;
          L.ultimo = id;
        }
        this.arma = -1;
        L.actual.id = -1;
      }
    }
    L.parpadeo = 10;
    L.lista = null;
    this.menu = -1;
    this.se(SE.EQUIPAR);
  }
  iniciarMov(L, dir, cuadros) {
    const n = L.lista.length;
    L.mov.n = cuadros;
    L.mov.paso = Math.trunc(dir * 256 / cuadros);
    L.sel = (L.sel + (dir > 0 ? n - 1 : n + 1)) % n;
    this.se(SE.ELEGIR);
  }
  pasoMov(L) {
    if (L.mov.n > 0) {
      L.mov.n--;
      if (L.mov.n !== 0) {
        for (const p of L.lista) {
          p.pos += L.mov.paso;
          if (L.mov.paso > 0 && p.pos >= L.max) p.pos = L.min + (p.pos - L.max);
          if (L.mov.paso < 0 && L.min >= p.pos) p.pos = L.max + (p.pos - L.min);
        }
        return true;
      }
      this.reposicionar(L);
    }
    return false;
  }
  navegar(L) {
    const c = L.conf, P = this.pad, moviendo = this.pasoMov(L);
    if (P.press & (c.mas | c.menos)) {
      const d = P.press & c.mas ? 1 : -1;
      if (!moviendo) {
        this.iniciarMov(L, d, 6);
        L.rep = 10;
      } else if (L.rep > 0) L.rep = 0;
    }
    if (L.rep >= 0) {
      if (P.status & (c.mas | c.menos)) {
        const d = P.status & c.mas ? 1 : -1;
        if (!moviendo && --L.rep < 0) {
          this.iniciarMov(L, d, 4);
          L.rep = 0;
        }
      } else L.rep = 10;
    }
  }
  tickMenus() {
    const P = this.pad;
    for (const L of this.lados) {
      const c = L.conf;
      if (this.menu === -1) {
        if (P.status & c.boton) {
          if (this.abrir(L.k)) continue;
        } else if (!this.equipoApagado && P.press & c.rapido) this.alternar(L.k);
      } else if (this.menu === L.k) {
        if (!(P.status & c.boton)) L.estado = 3; else if (this.zoom > 255) {
          this.navegar(L);
          if (L.k === 0 && P.press & PAD.CIR) {
            const p = L.lista[L.sel];
            if (p.num > 0 && this.usar(p.id)) p.num = Math.max(0, this.items[p.id]);
          }
        }
      }
    }
    for (const L of this.lados) {
      if (L.estado === 0) {
        if (L.parpadeo > 0) {
          const f = L.parpadeo--;
          if ((f & 3) === 3 && L.actual.id !== (L.k ? this.arma : this.item) && (L.k ? this.armaDeshabilitada(L.actual.id) : this.itemDeshabilitado(L.actual.id))) this.se(SE.CURSOR);
        } else this.sincronizar(L);
      } else if (L.estado === 2) {
        this.zoom += 64;
        if (this.zoom >= 256) {
          this.zoom = 256;
          L.estado = 1;
        }
      } else if (L.estado === 3) {
        this.zoom -= 64;
        if (this.zoom < 1) {
          this.zoom = 0;
          this.cerrarLado(L);
        }
      }
    }
  }
  sincronizar(L) {
    if (L.k === 0) {
      if (this.itemDeshabilitado(this.item)) {
        L.previo = this.item;
        this.item = -1;
        L.parpadeo = 19;
        return;
      }
      if (L.actual.id !== this.item) {
        if (L.actual.id !== -1 && L.actual.id !== IT.CARD) L.previo = L.actual.id;
        L.actual.id = this.item;
        if (this.item >= 0) L.ultimo = this.item;
      }
      if (this.item >= 0) L.actual.num = this.items[this.item];
    } else {
      if (this.armaDeshabilitada(this.arma)) {
        L.previo = this.arma;
        this.arma = -1;
        L.parpadeo = 19;
        return;
      }
      if (L.actual.id !== this.arma) {
        if (L.actual.id !== -1) L.previo = L.actual.id;
        L.actual.id = this.arma;
        if (this.arma >= 0) L.ultimo = this.arma;
      }
      if (this.arma >= 0) L.actual.num = this.armas[this.arma];
    }
  }
  conectarTeclado() {
    const mapa = this.o.teclas || TECLAS;
    this._kd = e => {
      const b = mapa[e.code];
      if (b === undefined) return;
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "SELECT") return;
      if (b & SOLO_ABIERTO && !this.abierto) return;
      this.teclas.add(e.code);
      if (this.abierto || !(b & SOLO_ABIERTO)) {
        e.preventDefault();
        if (this.abierto) e.stopImmediatePropagation();
      }
    };
    this._ku = e => {
      this.teclas.delete(e.code);
    };
    this._md = e => {
      if (this.abierto) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    addEventListener("keydown", this._kd, {
      capture: true
    });
    addEventListener("keyup", this._ku, {
      capture: true
    });
    addEventListener("mousedown", this._md, {
      capture: true
    });
    this._bl = () => this.teclas.clear();
    addEventListener("blur", this._bl);
  }
  leerPad() {
    const mapa = this.o.teclas || TECLAS;
    let s = 0;
    for (const c of this.teclas) s |= mapa[c] || 0;
    if (this.o.mando !== false && navigator.getGamepads) {
      const gp = ctl.mando();
      if (gp) for (const [i, b] of MANDO) if (gp.buttons[i]?.pressed) s |= b;
    }
    s |= this.toque;
    if (this.padExterno != null) s = this.padExterno;
    this.padCrudo = s;
    s &= ~this.mascaraPad;
    const P = this.pad;
    P.press = s & ~P.prev;
    P.status = s;
    P.prev = s;
    this.toque &= ~this.toqueSuelto;
    this.toqueSuelto = 0;
  }
  botonVR(bit, abajo) {
    if (abajo) {
      this.toque |= bit;
      this.toqueSuelto &= ~bit;
    } else if (this.toque & bit) this.toqueSuelto |= bit;
  }
  casillaEn(x, y) {
    if (!this.abierto) return -1;
    const L = this.lados[this.menu];
    if (!L.lista) return -1;
    const dentro = i => {
      const [px, py] = this.posPanel(L, L.lista[i].pos), ox = L.k ? px + 4 : px;
      return x >= ox - 4 && x < ox + 47 && y >= py && y < py + 29;
    };
    if (dentro(L.sel)) return L.sel;
    for (let i = 0; i < L.lista.length; i++) if (i !== L.sel && dentro(i)) return i;
    return -1;
  }
  tocarVR(x, y) {
    if (!this.abierto) return false;
    const L = this.lados[this.menu], i = this.casillaEn(x, y);
    if (i >= 0 && i !== L.sel && L.estado === 1) {
      L.sel = i;
      L.mov.n = 0;
      this.reposicionar(L);
      this.se(SE.ELEGIR);
      return true;
    }
    if (i >= 0 && i === L.sel) {
      this.toque &= ~CONF[this.menu].boton;
      return true;
    }
    return false;
  }
  update(dt, pausaJuego = false) {
    this.acum += Math.min(dt, .25);
    let n = 0;
    while (this.acum >= 1 / FPS && n < 8) {
      this.acum -= 1 / FPS;
      this.tick(pausaJuego);
      n++;
    }
    this.notificar();
    this.dibujar();
  }
  tick(pausaJuego) {
    this.cuadro++;
    this.leerPad();
    this.tickMenus();
    if (!this.abierto) this.textos = this.textos.filter(t => ++t.t < t.dur);
    if (!this.abierto && !pausaJuego) this.reloj();
  }
  reloj() {
    if (this.diazepam > 0) this.diazepam--;
    const f = this.cuadro % 30;
    if (f === 0 && this.items[IT.RATION] > 0) {
      let v = this.ambiente || 10;
      if (this.item === IT.RATION) v = v > 0 ? v + 360 : 360;
      this.racionTemp += v;
      if (this.racionTemp < -7200) {
        this.congeladas = true;
        this.racionTemp = -7200;
      }
      if (this.racionTemp >= 0) {
        if (this.congeladas) {
          this.congeladas = false;
          if (this.item === IT.RATION) this.se(SE.DESCONGELA);
        }
        this.racionTemp = 0;
      }
    }
    if (f === 1 && this.items[IT.PALKEY] > 0) {
      let v = this.ambiente;
      if (!v) {
        if (this.palEstado === 0) {
          this.palTemp = 0;
          v = null;
        } else v = this.palTemp < 0 ? 10 : -10;
      }
      if (v != null) {
        this.palTemp += v;
        if (this.palTemp > this.palMax) {
          this.palEstado = 1;
          this.palTemp = this.palMax;
        } else if (this.palTemp < this.palMin) {
          this.palEstado = 2;
          this.palTemp = this.palMin;
        } else if (this.palTemp >= 0 && this.palEstado === 2) this.palEstado = 0; else if (this.palTemp <= 0 && this.palEstado === 1) this.palEstado = 0;
      }
    }
    if (f === 2 && this.bomba > 0 && !this.itemDeshabilitado(IT.TIMERBOMB)) {
      if (--this.bomba <= 0) {
        this.item = this.item === IT.TIMERBOMB ? -1 : this.item;
        this.o.alExplotarBomba?.();
      } else if (this.item === IT.TIMERBOMB) this.se(SE.BOMBA_TIC);
    }
  }
  notificar() {
    if (this.arma !== this._prevArma || this.item !== this._prevItem) {
      const a = {
        arma: this.arma,
        item: this.item,
        armaAntes: this._prevArma,
        itemAntes: this._prevItem
      };
      this._prevArma = this.arma;
      this._prevItem = this.item;
      this.alCambiar?.(a);
    }
  }
  crearLienzo(padre) {
    const cv = document.createElement("canvas");
    cv.id = "invcv";
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;image-rendering:pixelated";
    padre.appendChild(cv);
    this.cv = cv;
    this.x = cv.getContext("2d");
    this.zonas = [];
    if (this.tactil) {
      cv.addEventListener("pointerdown", e => this.tocar(e));
      const b = document.createElement("button");
      b.id = "inv-usar";
      b.textContent = "USAR";
      b.hidden = true;
      b.style.cssText = "position:fixed;z-index:6;padding:6px 14px;font:13px MGS,monospace;color:#b4f4ac;background:rgba(0,0,0,.7);border:1px solid #5f8c6c;touch-action:none";
      b.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();
        this.toque |= PAD.CIR;
        this.toqueSuelto |= PAD.CIR;
      });
      padre.appendChild(b);
      this.btnUsar = b;
      this.botones = [ 0, 1 ].map(k => {
        const d = document.createElement("div");
        d.style.cssText = "position:fixed;z-index:5;touch-action:none;display:none";
        d.addEventListener("pointerdown", e => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.abierto) {
            this.toque |= CONF[k].boton;
          }
        });
        padre.appendChild(d);
        return d;
      });
    }
  }
  tocar(e) {
    if (!this.abierto) return;
    e.preventDefault();
    const L = this.lados[this.menu], z = this.zonas.find(r => e.clientX >= r.x && e.clientX < r.x + r.w && e.clientY >= r.y && e.clientY < r.y + r.h);
    if (z && z.i !== L.sel && L.estado === 1) {
      L.sel = z.i;
      L.mov.n = 0;
      this.reposicionar(L);
      this.se(SE.ELEGIR);
    } else this.toque &= ~CONF[this.menu].boton;
  }
  escala() {
    const dpr = Math.min(3, window.devicePixelRatio || 1), iw = innerWidth, ih = innerHeight;
    const D = disposicionHud();
    return {
      dpr: D.dpr,
      k: D.kd,
      iw: iw,
      ih: ih
    };
  }
  dibujar() {
    if (!this.cv || !this.listo) return;
    const {dpr: dpr, k: k, iw: iw, ih: ih} = this.escala(), cv = this.cv;
    if (cv.width !== Math.round(iw * dpr) || cv.height !== Math.round(ih * dpr)) {
      cv.width = Math.round(iw * dpr);
      cv.height = Math.round(ih * dpr);
    }
    const x = this.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, cv.width, cv.height);
    x.imageSmoothingEnabled = false;
    x.setTransform(k, 0, 0, k, 0, 0);
    const W = Math.floor(cv.width / k), H = Math.floor(cv.height / k);
    this.W = W;
    this.H = H;
    this.k = k;
    this.dpr = dpr;
    this.zonas = [];
    if (this.filtro === "nvg") {
      x.fillStyle = "rgba(0,16,0,0.22)";
      for (let y = 0; y < H; y += 2) x.fillRect(0, y, W, 1);
    }
    {
      const D = disposicionHud();
      this.base = [ D.item.slice(), D.arma.slice() ];
    }
    this.dibujarTextos(x, k / dpr);
    for (const L of this.lados) {
      if (L.estado === 0) {
        if (this.menu >= 0 && this.menu !== L.k) {
          if ((L.k ? this.arma : this.item) >= 0 && this.zoom < 255) this.panel(x, L, L.actual, this.base[L.k][0] + (L.k ? this.zoom >> 2 : -(this.zoom >> 2)), this.base[L.k][1]);
          continue;
        }
        if (L.parpadeo > 0) {
          if ((L.parpadeo & 3) > 1) this.panel(x, L, L.actual, ...this.base[L.k]);
        } else if ((L.k ? this.arma : this.item) >= 0) this.panel(x, L, L.actual, ...this.base[L.k]);
      } else {
        this.dibujarLista(x, L);
        this.dibujarDescripcion(x, L);
      }
    }
    for (const f of this.extras || []) f(x, W, H);
    this.acomodarTactil(W, H, k / dpr);
  }
  posPanel(L, pos) {
    const [bx, by] = this.base[L.k];
    if (pos === 0) return [ bx, by ];
    const p = Math.abs(pos), eje = pos > 0 ? L.conf.pos : L.conf.neg;
    if (eje === "der") return [ bx + Math.trunc(p * this.zoom * 56 / 65536), by ];
    if (eje === "izq") return [ bx - Math.trunc(p * this.zoom * 56 / 65536), by ];
    const dv = Math.trunc(p * this.zoom * 40 / 65536);
    return [ bx, disposicionHud().abreAbajo ? by + dv : by - dv ];
  }
  dibujarLista(x, L) {
    const n = L.lista.length, sel = L.lista[L.sel];
    const dib = (p, i) => {
      const [px, py] = this.posPanel(L, p.pos);
      this.panel(x, L, p, px, py, i);
    };
    let tope = L.max;
    if (tope > 1024) tope = 1152;
    let suelo = L.min;
    if (-suelo > 1024) suelo = -1152;
    const orden = [];
    let cuenta = n - 1;
    for (let i = 1; cuenta > 0; i++, cuenta--) {
      const j = (L.sel + i) % n, p = L.lista[j];
      if (p.pos < 0 || p.pos > tope) break;
      orden.push([ p, j ]);
    }
    for (let i = -1; cuenta > 0; i--, cuenta--) {
      const j = (L.sel + i + n * 4) % n, p = L.lista[j];
      if (p.pos > 0 || p.pos < suelo) break;
      orden.push([ p, j ]);
    }
    for (const [p, j] of orden.reverse()) dib(p, j);
    dib(sel, L.sel);
  }
  panel(x, L, p, px, py, indice = -1) {
    const arma = L.k === 1, ox = arma ? px + 4 : px, T = this.tema;
    x.fillStyle = T.marco;
    x.fillRect(ox, py, 47, 1);
    x.fillRect(ox - 4, py, 14, 20);
    x.fillRect(ox + 45, py + 1, 2, 19);
    x.fillRect(ox - 4, py + 20, 51, 9);
    x.fillStyle = p.pos === 0 && p.cur === 0 ? T.sel : T.ventana;
    x.fillRect(ox + 10, py + 1, 35, 19);
    if (indice >= 0 && this.tactil) this.zonas.push({
      i: indice,
      x: (ox - 4) * this.k / this.dpr,
      y: py * this.k / this.dpr,
      w: 51 * this.k / this.dpr,
      h: 29 * this.k / this.dpr
    });
    if (p.id < 0) {
      this.letra(x, ox + 46, py + 22, "NO ITEM", "texto", 1);
      return;
    }
    const mp5 = arma && p.id === WP.FAMAS && this.mp5 && integral.esMp5(this.nivelJuego) ? this.mp5 : null;
    if (arma && p.cur && this.cargadorMax > 0) this.cargadorBalas(x, ox + 45, py + 20); else this.letra(x, ox + 46, py + 22, mp5 ? integral.muyFacil.nombre : arma ? NOMBRE_ARMA[p.id] : NOMBRE_ITEM[p.id], "texto", 1);
    const rpk = arma ? p.id === WP.SOCOM && this.silenciador === 0 ? 2 : RPK_ARMA[p.id] : RPK_ITEM[p.id];
    if (mp5) x.drawImage(p.pos === 0 ? mp5.claro : mp5.osc, ox + mp5.ox, py + mp5.oy); else this.icono(x, rpk, ox, py, p.pos === 0);
    if (arma) {
      if (p.num >= 0 && p.num < 1e4) this.numero2(x, ox, py + 11, p.num, this.armasMax[p.id]);
    } else if (TIPO_ITEM[p.id] & 8192) this.numero2(x, ox, py + 11, p.num, this.itemsMax[p.id - IT.RATION]); else if (p.id === IT.CARD) {
      const fx = this.letra(x, ox, py + 14, "LV.", "texto", 0);
      this.numero(x, fx, py + 12, this.items[IT.CARD], "texto");
    } else if (p.id === IT.TIMERBOMB) this.numero(x, ox + 10, py + 10, this.bomba, "texto");
    if (!arma && this.congeladas && (p.id === IT.RATION || p.id === IT.KETCHUP)) this.icono(x, FROZEN, ox - 2, py + 6, true);
    if (arma ? this.armaDeshabilitada(p.id) : this.itemDeshabilitado(p.id)) this.icono(x, NO_USE, ox - 2, py + 6, true);
  }
  icono(x, i, px, py, claro) {
    const m = this.meta?.[i];
    if (!m) return;
    x.drawImage(claro ? this.atlas : this.atlasOsc, m.u, m.v, m.w, m.h, px + m.ox, py + m.oy, m.w, m.h);
  }
  numero(x, px, py, n, color, alinear = 0) {
    const s = String(Math.max(0, n | 0)), w = s.length * 6, x0 = alinear === 1 ? px - w : px, mm = this.tema.mod?.[color], img = mm && atlasNum(mm) || this.letras[color];
    for (let i = 0; i < s.length; i++) x.drawImage(img, 156 + +s[i] * 6, 0, 6, 7, x0 + i * 6, py, 6, 7);
    return alinear === 1 ? x0 : x0 + w;
  }
  numero2(x, px, py, cur, total) {
    const c = cur === 0 ? "cero" : "num", fx = this.numero(x, px, py, cur, c);
    x.drawImage(this.tema.mod && atlasNum(this.tema.mod[c]) || this.letras[c], 224, 0, 6, 7, fx, py, 6, 7);
    return this.numero(x, fx + 6, py, total, c);
  }
  letra(x, px, py, s, color, alinear = 0) {
    const g = [];
    let w = 0;
    for (const ch of String(s)) {
      const lc = ch.toLowerCase(), cc = lc.charCodeAt(0);
      let tx, ty, salto;
      if (cc >= 48 && cc <= 57) {
        tx = (cc - 48) * 6;
        ty = 0;
        salto = 6;
      } else if (cc >= 97 && cc <= 122) {
        tx = (cc - 97) * 6;
        ty = 5;
        salto = 6;
        if (lc === "i") {
          salto = 3;
          w += 1;
        }
      } else if (lc === " ") {
        w += 4;
        continue;
      } else if (lc === "#") {
        w += 6;
        continue;
      } else {
        const sg = SIGNOS[lc];
        if (!sg) continue;
        [tx, salto] = sg;
        ty = 0;
      }
      g.push([ tx, ty, w ]);
      w += salto;
    }
    const x0 = alinear === 1 ? px - w : alinear === 2 ? px - (w >> 1) : px, img = this.letras[color];
    for (const [tx, ty, gx] of g) x.drawImage(img, tx, ty, 6, 5, x0 + gx, py, 6, 5);
    return alinear === 1 ? x0 : x0 + w;
  }
  cargadorBalas(x, px, py) {
    const rojas = this.arma === WP.FAMAS ? 3 : 0;
    for (let i = 0; i < this.cargadorMax; i++) {
      px -= 3;
      const llena = i < this.cargador, roja = llena && i < rojas, img = this.tema.mod && atlasNum(roja ? this.tema.mod.bala : [ 128, 128, 128 ]) || (roja ? this.letras.bala : this.letras.texto);
      x.drawImage(img, llena ? 216 : 220, 0, 4, 9, px, py, 4, 9);
    }
  }
  dibujarTextos(x, escala) {
    const lista = this.textos.map(t => ({
      ...t,
      sube: t.t
    }));
    for (const [k, t] of this.fijos) {
      if (t.hasta < this.cuadro) this.fijos.delete(k); else lista.push(t);
    }
    for (const t of lista) {
      const q = this.o.proyectar?.(new THREE.Vector3(t.pos.x, t.pos.y + t.h * MM, t.pos.z));
      if (!q || !q.visible) continue;
      const px = Math.round(q.x / escala), py = Math.round(q.y / escala) - Math.min(16, Math.floor(t.sube));
      if (t.cartel) {
        x.fillStyle = "rgb(255,255,255)";
        for (let i = 0; i < 16; i++) x.fillRect(px + i, py - i, 1, 1);
        x.fillRect(px + 16, py - 16, 40, 1);
        this.letra(x, px + 22, py - 23, t.msg, "negro");
        this.letra(x, px + 21, py - 24, t.msg, "blanco");
      } else {
        this.letra(x, px + 1, py + 1, t.msg, "negro", 2);
        this.letra(x, px, py, t.msg, t.color, 2);
      }
    }
  }
  acomodarTactil(W, H, escala) {
    if (!this.tactil) return;
    const L = this.abierto ? this.lados[this.menu] : null;
    this.cv.style.pointerEvents = this.abierto ? "auto" : "none";
    this.botones?.forEach((d, k) => {
      const [bx, by] = this.base[k], ox = k ? bx + 4 : bx;
      d.style.display = this.abierto ? "none" : "block";
      d.style.left = `${(ox - 4) * escala}px`;
      d.style.top = `${by * escala}px`;
      d.style.width = `${51 * escala}px`;
      d.style.height = `${29 * escala}px`;
    });
    const p = L && L.k === 0 && L.estado === 1 ? L.lista[L.sel] : null, usar = !!(p && p.id >= IT.RATION && p.id <= IT.DIAZEPAM && p.num > 0);
    if (this.btnUsar) {
      this.btnUsar.hidden = !usar;
      if (usar) {
        const [bx, by] = this.base[0];
        this.btnUsar.style.left = `${(bx + 52) * escala}px`;
        this.btnUsar.style.top = `${(by + 4) * escala}px`;
      }
    }
  }
  destruir() {
    removeEventListener("keydown", this._kd, {
      capture: true
    });
    removeEventListener("keyup", this._ku, {
      capture: true
    });
    removeEventListener("mousedown", this._md, {
      capture: true
    });
    removeEventListener("blur", this._bl);
    this.cv?.remove();
    this.btnUsar?.remove();
    this.botones?.forEach(d => d.remove());
    for (const s of this.sueltos) s.obj.removeFromParent();
  }
}
