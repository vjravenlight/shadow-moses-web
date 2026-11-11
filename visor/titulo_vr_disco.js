// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { blit, limpiar, texVacia, texDeImagen, cargarImg, textoMenu, textoChico, rotuloCaja, OPACO, ADD, RESTA } from "./titulo.js";

import { leerFotos } from "./fotos.js";

import { todoDesbloqueado, ponerTodoDesbloqueado } from "./desbloqueo.js";

import { vibrar, vibraActiva, ponerVibra } from "./controles.js";

import { pantallaControles } from "./controles_ui.js";

const W = 320, H = 224;

const VELO = 9;

const PALETA = [ [ 223, 115, 119 ], [ 31, 128, 128 ], [ 55, 142, 121 ], [ 65, 156, 188 ], [ 93, 148, 165 ], [ 40, 128, 171 ], [ 112, 163, 142 ], [ 189, 162, 145 ] ];

const GRIS = [ 128, 128, 128 ];

const VERDE = [ 128, 192, 128 ];

const ITEM = [ 100, 160, 135 ];

const CABEZA = [ 70, 100, 90 ];

const NARANJA = [ 208, 107, 57 ];

const SE = {
  CURSOR: 31,
  ELEGIR: 102,
  CANCELAR: 33,
  NO: 32,
  EXTRA: 125
};

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
  KeyP: "start",
  Space: "o",
  KeyE: "o",
  KeyZ: "o",
  Escape: "x",
  Backspace: "x",
  KeyQ: "x",
  KeyX: "x"
};

const azar = n => Math.floor(Math.random() * n);

const rampa = n => n >= 3 ? VERDE : n < 1 ? [ 0, 0, 0 ] : [ n * 128 / 3 | 0, n * 192 / 3 | 0, n * 128 / 3 | 0 ];

function complemento(c) {
  const n1 = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]), d = [ 255 - c[0], 255 - c[1], 255 - c[2] ];
  const n2 = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
  if (!n2) return [ 255, 255, 255 ];
  return d.map(v => Math.min(255, Math.floor(v * Math.floor(n1) / Math.floor(n2))));
}

const escalar = (c, b) => c.map(v => v * (b & 255) >> 7 & 255);

const leerLS = k => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const guardarLS = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

const nuevoObj = (prio, extra = {}) => ({
  on: false,
  dib: false,
  prio: prio,
  c: 0,
  c2: 0,
  est: 0,
  sub: 0,
  fl: 0,
  sel: 0,
  ...extra
});

function pieza(t, x, y, w, h, c, m = OPACO, extra = null) {
  const p = {
    t: t,
    x: x,
    y: y,
    w: w ?? t?.w,
    h: h ?? t?.h,
    sx: 0,
    sy: 0,
    sw: t?.w ?? 1,
    sh: t?.h ?? 1,
    c: c,
    c2: c,
    m: m
  };
  return extra ? Object.assign(p, extra) : p;
}

function recortar(p) {
  const x0 = Math.max(0, p.x), y0 = Math.max(0, p.y), x1 = Math.min(W, p.x + p.w), y1 = Math.min(H, p.y + p.h);
  if (x1 <= x0 || y1 <= y0 || p.w <= 0 || p.h <= 0) return null;
  const kx = p.sw / p.w, ky = p.sh / p.h;
  const r = {
    ...p,
    x: x0,
    y: y0,
    w: x1 - x0,
    h: y1 - y0,
    sx: p.sx + (x0 - p.x) * kx,
    sy: p.sy + (y0 - p.y) * ky,
    sw: (x1 - x0) * kx,
    sh: (y1 - y0) * ky
  };
  if (p.c2 !== p.c) {
    const k0 = (y0 - p.y) / p.h, k1 = (y1 - p.y) / p.h, mix = k => p.c.map((v, i) => v + (p.c2[i] - v) * k);
    r.c = mix(k0);
    r.c2 = mix(k1);
  }
  return r;
}

export class TituloDisco {
  constructor(op = {}) {
    this.op = op;
    this.base = op.base ?? "assets/";
    this.activo = false;
    this.f = 0;
    this.held = new Set;
    this.pulsadas = [];
    this._listo = null;
    this.datos = null;
    this.fb = null;
    this.cv = null;
  }
  get listo() {
    return this._listo ||= this.cargar();
  }
  get hay() {
    return !!this.datos;
  }
  async cargar() {
    try {
      const r = await fetch(this.base + "vr/disco/titulo/titulo.json");
      if (!r.ok) return this.datos = null;
      this.datos = await r.json();
    } catch {
      return this.datos = null;
    }
    const D = this.datos, ids = Object.keys(D.texturas || {});
    const [imgs, f8, f5] = await Promise.all([ Promise.all(ids.map(n => cargarImg(`${this.base}vr/disco/titulo/${D.texturas[n].png}`))), cargarImg(this.base + "hud/fuente.png"), cargarImg(this.base + "hud/num.png") ]);
    this.T = {};
    ids.forEach((n, i) => {
      if (imgs[i]) {
        this.T[n] = texDeImagen(imgs[i]);
        this.T[n].id = n;
      }
    });
    this.f8 = f8 && texDeImagen(f8);
    this.f5 = f5 && texDeImagen(f5);
    this.N = D.nombres || {};
    this.textos = new Map;
    try {
      const r = await fetch(this.base + "vr/disco/movie/movie.json");
      this.mvDatos = r.ok ? await r.json() : null;
    } catch {
      this.mvDatos = null;
    }
    if (this.mvDatos) {
      const M = this.mvDatos, nom = Object.keys(M.texturas || {});
      const im = await Promise.all(nom.map(n => cargarImg(`${this.base}vr/disco/movie/${M.texturas[n].png}`)));
      this.TM = {};
      nom.forEach((n, i) => {
        if (im[i]) {
          this.TM[n] = texDeImagen(im[i]);
          this.TM[n].id = "mv|" + n;
        }
      });
    }
    try {
      const r = await fetch(this.base + "vr/disco/option/option.json");
      this.optDatos = r.ok ? await r.json() : null;
    } catch {
      this.optDatos = null;
    }
    if (this.optDatos) {
      const M = this.optDatos, nom = Object.keys(M.texturas || {});
      const im = await Promise.all(nom.map(n => cargarImg(`${this.base}vr/disco/option/${M.texturas[n].png}`)));
      this.TO = {};
      nom.forEach((n, i) => {
        if (im[i]) {
          this.TO[n] = texDeImagen(im[i]);
          this.TO[n].id = "op|" + n;
        }
      });
    }
    this.blanco1 = {
      d: new Uint8ClampedArray([ 255, 255, 255, 255 ]),
      w: 1,
      h: 1,
      id: "_blanco1"
    };
    return this;
  }
  tex(nombre) {
    return this.T?.[this.N[nombre] || nombre] || null;
  }
  texMv(nombre) {
    const N = this.mvDatos?.nombres || {};
    return this.TM?.[N[nombre]] || this.TM?.[nombre] || null;
  }
  get hayMovie() {
    return !!this.mvDatos && !!this.op.reproducir;
  }
  get hayVideos() {
    return this.hayMovie && this.mvDatos.con_videos !== false;
  }
  letras(s, caja = false) {
    const k = (caja === "chico" ? "h|" : caja ? "c|" : "t|") + s;
    let t = this.textos.get(k);
    if (!t) {
      t = caja === "chico" ? textoChico(this.f5, s) : caja ? rotuloCaja(this.f8, s) : textoMenu(this.f8, s);
      t.id = k;
      this.textos.set(k, t);
    }
    return t;
  }
  abrir(s = 0) {
    this.activo = true;
    this.held.clear();
    this.pulsadas.length = 0;
    this.aviso = null;
    this.saliendo = null;
    this.pant = "titulo";
    this.sub = null;
    this.velo = 0;
    this.reiniciar(s);
    this.op.sonidoTitulo?.();
  }
  cerrar() {
    this.activo = false;
    this.pant = "titulo";
    this.sub = null;
    if (this.gpu) this.gpu.visible = false;
  }
  banderas() {
    const todo = !!this.op.todo?.() || todoDesbloqueado(), n = todo ? 300 : this.op.cuenta?.() ?? 0;
    let b = 4;
    if (n >= 30) b |= 1;
    if (n >= 255) b |= 32;
    if (todo || n >= 300) b |= 64;
    if (todo || (this.op.fotos?.() || leerFotos()).length > 0) b |= 16;
    this.cuenta = n;
    return b;
  }
  reiniciar(s) {
    this.fl = this.banderas();
    this.t = 0;
    this.ocioso = 0;
    this.E = 0;
    const o = nuevoObj;
    this.o = {
      0: o(1, {
        logo: 0,
        fase: 0
      }),
      1: o(7, {
        d: 0
      }),
      2: o(6),
      3: o(5),
      4: o(1),
      5: o(2),
      6: o(4, {
        waku2: false
      }),
      7: o(1),
      8: o(1),
      9: o(3),
      10: o(1, {
        sel: 3
      }),
      129: o(0, {
        col: GRIS.slice(),
        comp: [ 128, 128, 128 ],
        ori: GRIS.slice(),
        dst: GRIS.slice(),
        lado: 0
      }),
      128: o(0),
      14: o(2, {
        b: 0,
        r: null,
        modo: 1
      })
    };
    s |= 0;
    if (s === 1) this.E = 1; else if (s === 2) {
      this.E = 7;
      this.fl |= 1048576;
    } else if (s === 4 || s === 5) {
      this.E = 8;
      this.fl |= 1048576;
      this.o[8].sel = s === 4 ? 0 : 2;
    } else if (s >= 6 && s <= 9) {
      this.E = 11;
      this.fl |= 1048576;
      this.o[10].fl |= 4096;
      this.o[9].fl |= 4096;
      this.o[8].sel = 1;
      const bit = {
        6: 1,
        7: 2,
        8: 4,
        9: 8
      }[s], vis = this.visiblesExtra();
      this.o[10].sel = vis & bit ? s - 3 : 3;
    } else this.E = 0;
  }
  visiblesExtra() {
    let v = 1;
    if (this.fl & 3) v |= 2;
    if (this.fl & 16) v |= 4;
    if (this.fl & 4) v |= 8;
    return v;
  }
  activar(...ids) {
    for (const i of ids) {
      const q = this.o[i];
      if (q) {
        q.on = true;
      }
    }
  }
  apagar(...ids) {
    for (const i of ids) {
      const q = this.o[i];
      if (q) {
        q.on = false;
        q.dib = false;
      }
    }
  }
  congelar(...ids) {
    for (const i of ids) {
      const q = this.o[i];
      if (q) q.on = false;
    }
  }
  tecla(code, abajo) {
    const b = TECLAS[code];
    if (!b) return false;
    if (abajo) {
      if (!this.held.has(b)) {
        this.held.add(b);
        this.pulsadas.push(b);
      }
    } else this.held.delete(b);
    return true;
  }
  clic(x, y) {
    if (!this.activo || this.saliendo) return;
    if (this.pant === "album") {
      this.sub?.host.pulsadas.push({
        toque: true,
        x: x,
        y: y
      });
      return;
    }
    if (this.pant === "modelo" || this.pant === "opcion") {
      this.clicLista(x, y);
      return;
    }
    if (this.pant === "opcionD") {
      this.clicOpcion(x, y);
      return;
    }
    if (this.pant === "movie") {
      this.clicMovie(x, y);
      return;
    }
    if (this.pant === "video") return;
    const E = this.E;
    if (x < 60 && y < 16 && (E === 7 || E === 8)) {
      this.op.sonar?.(SE.CANCELAR);
      return this.salir();
    }
    if (E === 0) {
      this.pulsadas.push("o");
      return;
    }
    if (E >= 1 && E <= 7) {
      this.pulsadas.push("start");
      return;
    }
    if (E === 8) {
      if (y >= 150 && y < 175) this.pulsadas.push("t_arriba"); else if (y >= 175 && y < 190) this.pulsadas.push("start"); else if (y >= 190 && y < 215) this.pulsadas.push("t_abajo");
      return;
    }
    if (E === 11) {
      const O = this.o[10];
      if (O.est !== 1) return;
      const k = this.itemsExtra().find(it => it.vis && x >= it.x - 8 && x < it.x + it.w + 8 && y >= it.y - 4 && y < it.y + it.h + 4);
      if (!k) return;
      if (k.i === O.sel) this.pulsadas.push("start"); else {
        O.sel = k.i;
        this.op.sonar?.(SE.CURSOR);
      }
    }
  }
  entrada() {
    const P = this.pulsadas.splice(0), tiene = b => P.includes(b);
    if (this.fl & 262144) return;
    const sost = this.held.size > 0 || P.length > 0;
    if (!sost) this.ocioso++; else {
      this.ocioso = 0;
      if (this.E === 0) {
        this.fl |= 1048576;
        this.o[0].fl |= 1;
      }
    }
    const dirSost = this.held.has("arriba") ? "arriba" : this.held.has("abajo") ? "abajo" : null;
    const dirPuls = tiene("arriba") || tiene("t_arriba") ? "arriba" : tiene("abajo") || tiene("t_abajo") ? "abajo" : null;
    if (tiene("start")) return this.botonStart();
    if (dirSost || dirPuls) {
      if (this.E === 8) {
        const d = dirPuls || dirSost;
        this.o[8].fl |= d === "arriba" ? 1 : 2;
      } else if (this.E === 11 && dirPuls) this.o[10].fl |= dirPuls === "arriba" ? 16 : 32;
      return;
    }
    if (tiene("o")) {
      if (this.E === 8) this.elegirMenu(); else if (this.E === 11) this.elegirExtra(); else if (this.E === 7) this.botonStart();
      return;
    }
    if (tiene("x")) {
      if (this.E === 8) {
        this.E = 7;
        this.t = 0;
        this.fl |= 1048576;
        this.apagar(8);
      } else if (this.E === 11) this.o[10].fl |= 256; else if (this.E === 7) {
        this.op.sonar?.(SE.CANCELAR);
        this.salir();
      }
    }
  }
  botonStart() {
    const E = this.E;
    if (E >= 1 && E <= 6) {
      this.E = 7;
      this.t = 0;
      this.fl |= 1048576;
    } else if (E === 7) {
      this.fl |= 1048576;
      this.apagar(7);
      this.E = 8;
      this.t = 0;
    } else if (E === 8) this.elegirMenu(); else if (E === 9) {
      this.E = 7;
      this.t = 0;
      this.apagar(128, 8);
    } else if (E === 11) this.elegirExtra();
  }
  elegirMenu() {
    const O = this.o[8];
    if (O.est !== 0) return;
    this.op.sonar?.(SE.ELEGIR);
    this.pararMusica();
    if (O.sel === 1) {
      this.fl = this.fl & ~4095 | this.banderas() & 4095;
      this.apagar(1, 2, 3, 4, 6, 5, 129, 8);
      this.E = 11;
      this.t = 0;
      this.o[10] = nuevoObj(1, {
        sel: 3
      });
      this.o[9] = nuevoObj(3);
      this.o[14] = nuevoObj(2, {
        b: 0,
        r: null,
        modo: 1
      });
      return;
    }
    this.fl |= 262144;
    this.salirCon(O.sel === 0 ? "entrenamiento" : "opcion");
  }
  elegirExtra() {
    const O = this.o[10];
    if (O.est < 1) return;
    const s = O.sel;
    if (s === 2) {
      O.fl |= 256;
      return;
    }
    if (s === 3 && !this.hayVideos || s === 6 && !this.hayMovie) {
      this.op.sonar?.(SE.NO);
      this.aviso = {
        texto: "NOT AVAILABLE",
        t: 75
      };
      return;
    }
    this.op.sonar?.(SE.ELEGIR);
    this.pararMusica();
    this.fl |= 262144;
    this.salirCon(s === 4 ? "modelo" : s === 5 ? "album" : s === 3 ? "movie" : "creditos");
  }
  cuadro() {
    if (!this.activo || !this.T) return;
    this.f++;
    if (this.aviso && --this.aviso.t <= 0) this.aviso = null;
    if (this.saliendo) {
      if (++this.saliendo.n >= this.saliendo.total) {
        const s = this.saliendo;
        this.saliendo = null;
        this.accion(s.que);
      }
      return;
    }
    if (this.pant === "album") return this.cuadroAlbum();
    if (this.pant === "modelo" || this.pant === "opcion") return this.cuadroLista();
    if (this.pant === "opcionD") return this.cuadroOpcion();
    if (this.pant === "movie") return this.cuadroMovie();
    if (this.pant === "video") {
      this.pulsadas.length = 0;
      return;
    }
    this.entrada();
    this.estados();
    const orden = [ 129, 128, 7, 6, 5, 4, 3, 2, 1, 8, 9, 10, 14, 0 ];
    for (const k of orden) {
      const q = this.o[k];
      if (q?.on) this["act" + k.toString(16)]?.(q);
    }
  }
  estados() {
    const t = this.t;
    if (this.t < 1e6) this.t++;
    switch (this.E) {
     case 0:
      if (t === 0) this.activar(0);
      break;

     case 1:
      if (t === 0) this.activar(1);
      if (t === 31) {
        this.E = 2;
        this.t = 0;
      }
      break;

     case 2:
      if (t === 0) this.activar(1, 2);
      if (t === 95) {
        this.E = 3;
        this.t = 0;
      }
      break;

     case 3:
     case 4:
      if (t === 0) this.activar(1, 2, 3, 4);
      if (t === 31) {
        this.E = 6;
        this.t = 0;
      }
      break;

     case 6:
      if (t === 0) this.activar(1, 2, 3, 4, 6);
      if (t === 32) this.activar(129);
      if (t === 95) {
        this.E = 5;
        this.t = 0;
      }
      break;

     case 5:
      if (t === 0) this.activar(1, 2, 3, 4, 6, 5, 129);
      if (t === 127) {
        this.E = 7;
        this.t = 0;
      }
      break;

     case 7:
      if (t === 0) {
        this.ocioso = 0;
        this.activar(1, 2, 3, 4, 6, 5, 7, 129);
      }
      if (this.ocioso === 1e3) {
        this.E = 9;
        this.t = 0;
      }
      break;

     case 8:
      if (t === 0) {
        this.ocioso = 0;
        this.activar(1, 2, 3, 4, 6, 5, 129, 8);
      }
      if (this.ocioso === 1e3) {
        this.E = 9;
        this.t = 0;
      }
      break;

     case 9:
      if (t === 0) {
        this.ocioso = 0;
        this.op.sonido?.codigo?.(33554188);
        this.congelar(1, 2, 3, 4, 6, 5, 7, 8, 129);
        this.o[128] = {
          ...this.o[128],
          on: true,
          c: 0
        };
        this.o[1].fl &= ~1;
      }
      break;

     case 11:
      if (t === 0) this.activar(10, 14, 9);
      break;
    }
  }
  pararMusica() {
    this.op.sonido?.cancion?.(0);
  }
  act0(o) {
    o.dib = true;
    const s = o.c2;
    o.c2++;
    let col = 0;
    if (o.logo === 2) {
      this.demoTurno = !this.demoTurno;
      if (this.demoTurno && this.hayVideos) {
        this.reproducir({
          tipo: "MOVIE",
          nombre: 21388,
          opts: {
            i: [ 30 ],
            o: [ 30 ]
          }
        }, {}, () => {
          this.pant = "titulo";
          this.reiniciar(1);
          this.op.sonidoTitulo?.();
        });
        return;
      }
      if (!this.demoTurno && this.op.demo?.()) return;
      this.reiniciar(1);
      return;
    }
    if (o.logo >= 3) {
      this.E = 7;
      this.t = 0;
      this.apagar(0);
      return;
    }
    if (o.fase === 0) {
      col = s * 6;
      if (s === 20) {
        o.c2 = 0;
        o.fase = 1;
      }
    } else if (o.fase === 1) {
      const s2 = o.fl & 1 ? 62 : s;
      col = 128;
      if (s2 === 62) {
        o.fase = 2;
        o.c2 = 0;
      }
    } else if (o.fase === 2) {
      col = 120 - 6 * s;
      if (s === 20) {
        o.fase = 3;
        o.c2 = 0;
      }
    } else {
      o.fase = 0;
      o.c2 = 0;
      o.logo++;
      if (o.fl & 1) o.logo = 3;
    }
    o.col = Math.max(0, col);
  }
  act1(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    if (!(o.fl & 1)) {
      this.op.sonido?.cancion?.(2);
      o.fl |= 1;
    }
    if (o.est === 0) {
      o.b = this.fl & 1048576 ? 128 : Math.min(128, c * 2);
      if (c === 64) o.est = 1;
    } else o.b = 128;
    o.d++;
  }
  tiras(d) {
    const L = [], i0 = Math.floor(d / 160);
    for (let i = i0; i <= i0 + 2; i++) L.push([ 160 * i - d, i % 2 ? "fbf7" : "fbf1" ]);
    return L;
  }
  act2(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    const recorte = cual => {
      const T = this.T[cual];
      o.rec = {
        t: cual,
        sx: azar(T.w - 53),
        sy: azar(T.h - 83)
      };
    };
    let b = 0, lim = -1;
    if (o.est === 0) {
      if (c === 0 && !o.rec) {
        recorte("fbf1");
        o.cual = "fbf1";
        o.y = 0;
        o.alto = 500;
      }
      b = c * 2;
      lim = 64;
    } else if (o.est === 1) {
      b = 128;
      lim = 148;
    } else {
      b = 128 - 2 * c & 255;
      if (c === 64) {
        recorte(o.cual);
        o.y = 0;
        o.alto = 485;
        o.cual = o.cual === "fbf1" ? "fbf7" : "fbf1";
        o.c = 1;
        o.est = 0;
      }
    }
    if (lim >= 0 && c === lim) {
      o.c = 1;
      o.est++;
    }
    o.b = b;
    o.y--;
  }
  act3(o) {
    o.dib = true;
    const c = o.c, z = o.c2;
    o.c++;
    o.c2++;
    let b = 0;
    const foto = () => {
      o.foto = this.o[1].d;
    };
    if (o.est === 1) {
      b = 128;
      if (c === 64) {
        o.c = 1;
        o.est = 2;
      }
    } else if (o.est === 2) {
      b = -c - 128 & 255;
      if (c === 128) {
        foto();
        o.c = 1;
        o.est = 0;
        o.c2 = 0;
      }
    } else {
      b = c * 2;
      if (c === 0) {
        foto();
        b = 0;
      }
      if (c === 64) {
        o.c = 1;
        o.est = 1;
      }
    }
    o.b = b;
    o.z = z;
  }
  act4(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    let v = 0;
    if (o.est === 0) {
      v = c;
      if (c === 128) {
        o.c = 1;
        o.est = 1;
      }
    } else if (o.est === 1) {
      v = c * 4 - 128 & 255;
      if (c === 31) {
        o.c = 1;
        o.est = 2;
      }
    } else if (o.est === 2) {
      v = ~(c * 4 / 3 | 0) & 255;
      if (c === 96) {
        o.c = 1;
        o.est = 3;
      }
    } else v = 128;
    o.b = this.fl & 1048576 ? 128 : v;
  }
  act5(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    if (o.est === 0) {
      o.b = c;
      if (c === 128) {
        o.c = 1;
        o.est = 1;
        o.opaco = true;
      }
    } else o.b = 128;
    if (o.est === 0 && this.fl & 1048576) {
      o.b = 128;
      o.opaco = true;
    }
    o.nja = this.fl & 32 ? "d3_title_nja2" : "d3_title_nja1";
  }
  act6(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    if (o.est === 0) {
      o.b = c;
      if (c === 128) {
        o.c = 1;
        o.est = 1;
      }
    } else {
      o.b = 128;
      if (c === 223) o.waku2 = true;
    }
    if (this.fl & 1048576) {
      o.waku2 = true;
      o.b = 128;
    }
  }
  act7(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    if (this.fl & 1048576 && o.est < 1) o.est = 1;
    let r = 0, g = 0, lim = -1;
    if (o.est === 0) {
      r = Math.min(255, c * 8);
      g = c * 2;
      lim = 31;
    } else if (o.est === 1) {
      r = 255;
      g = 64;
      lim = 32;
    } else if (o.est === 2) {
      r = ~(c * 8) & 255;
      g = 64 - 2 * c;
      lim = 24;
    } else {
      r = c * 8 + 63 & 255;
      g = 2 * c + 16;
      if (c === 24) {
        o.c = 1;
        o.est = 1;
      }
    }
    if (lim >= 0 && c === lim) {
      o.c = 1;
      o.est++;
    }
    o.col = [ r, g, g ];
  }
  act8(o) {
    o.dib = true;
    const c2 = o.c2;
    o.c2++;
    if (o.est === 0) {
      let col = null;
      if (o.sub === 1) {
        const g = 64 - 2 * c2 & 255;
        col = [ ~(c2 * 8) & 255, g, g ];
        if (c2 === 24) {
          o.c2 = 1;
          o.sub = 2;
        }
      } else if (o.sub === 0) {
        if (c2 < 2 || !o.pulso) col = [ 255, 64, 64 ];
        if (c2 === 32) {
          o.c2 = 1;
          o.sub = 1;
        }
      } else {
        const g = c2 * 2 + 16 & 255;
        col = [ c2 * 8 + 63 & 255, g, g ];
        if (c2 === 24) {
          o.c2 = 1;
          o.sub = 0;
        }
      }
      if (col) o.pulso = col;
      o.anim = null;
      if (o.fl & 3) {
        o.dir = o.fl & 1 ? -1 : 1;
        o.est = 1;
        o.c2 = 0;
        o.sub = 0;
        o.espera = 0;
        this.op.sonar?.(SE.CURSOR);
      }
    } else {
      if (c2 === 0) {
        o.viejo = o.sel;
        o.sel = (o.sel + o.dir + 3) % 3;
      }
      o.anim = {
        c2: c2,
        dir: o.dir
      };
      if (c2 > 3) {
        if (!(o.fl & 3)) {
          o.est = 0;
          o.sub = 0;
          o.c2 = 1;
          o.anim = null;
          o.pulso = [ 255, 64, 64 ];
        } else if (++o.espera >= 5) {
          o.dir = o.fl & 1 ? -1 : 1;
          o.c2 = 0;
          o.espera = 0;
          this.op.sonar?.(SE.CURSOR);
        }
      }
    }
    o.fl &= ~3;
  }
  act9(o) {
    let c = o.c;
    o.c++;
    o.c2++;
    if (o.fl & 4096) o.c2 = 33;
    if (o.c2 <= 32) return;
    if (o.c2 === 33) {
      o.c = 0;
      c = 0;
    }
    o.dib = true;
    let b = 128;
    if (o.est === 0) {
      b = c * 128 / 10 | 0;
      if (c === 0 && o.fl & 4096) {
        b = 128;
        o.c = 1;
        o.est = 1;
        o.fl &= ~4096;
      }
      if (c === 10) {
        o.c = 1;
        o.est = 1;
      }
    }
    o.b = Math.min(128, b);
  }
  itemsExtra() {
    const vis = this.visiblesExtra(), n = [ 1, 2, 4, 8 ].filter(b => vis & b).length, paso = Math.floor(148 / (n + 1));
    const L = [ {
      i: 2,
      t: this.tex("sp_exit"),
      y: 55,
      vis: true
    } ];
    let y = paso - 93;
    for (const [i, nom, b] of [ [ 3, "d3_sp_movie", 1 ], [ 4, "d3_sp_photo", 2 ], [ 5, "d3_sp_album", 4 ], [ 6, "d3_sp_Pocket", 8 ] ]) {
      L.push({
        i: i,
        t: this.tex(nom),
        y: y,
        vis: !!(vis & b)
      });
      if (vis & b) y += paso;
    }
    for (const it of L) {
      it.w = it.t?.w ?? 0;
      it.h = it.t?.h ?? 0;
      it.x = 160 - (it.w >> 1);
      it.y += 112;
    }
    return L;
  }
  acta(o) {
    o.dib = true;
    const c = o.c;
    o.c++;
    o.c2++;
    const C = this.o[14];
    if (o.est === 0) {
      if (c === 0) {
        o.hx = [ 190, -290 ];
        o.hy = -13;
        o.abre = 0;
        o.colItems = 0;
        if (o.fl & 4096) {
          o.est = 1;
          o.c = 0;
          o.abre = 1;
          o.colItems = 1;
          C.on = true;
          C.dib = true;
          return;
        }
      }
      if (c >= 1 && c <= 8) {
        if (c === 1) this.op.sonar?.(SE.EXTRA);
        o.hx = [ o.hx[0] - 30, o.hx[1] + 30 ];
      } else if (c >= 13 && c <= 16) {
        if (c === 13) {
          C.on = true;
          C.dib = true;
        }
        C.modo = 0;
        C.r = "cabeza";
        C.b = (c - 12) * 255 >> 2;
      } else if (c >= 17 && c <= 24) C.b = 255; else if (c >= 25 && c <= 28) C.b = 255 - ((c - 24) * 255 >> 2); else if (c >= 29 && c <= 32) {
        if (c === 29) C.dib = false;
        o.hy -= 20;
      } else if (c >= 37 && c <= 42) {
        o.colItems = 1;
        o.abre = (c - 36) / 12 * 2;
      } else if (c >= 45 && c <= 48) {
        if (c === 45) C.dib = true;
        C.modo = 1;
        C.r = "item";
        C.b = (c - 44) * 255 >> 2;
        if (c === 48) {
          o.c = 0;
          o.est = 1;
        }
      }
      return;
    }
    if (o.est === 2) {
      this.velo = 1 - (16 - c) / 16;
      if (c === 16) {
        this.velo = 0;
        this.E = 8;
        this.t = 0;
        this.fl |= 1048576;
        this.apagar(9, 14, 10);
        const t = this.o[129];
        t.col = GRIS.slice();
        this.o[8].sel = 1;
      }
      return;
    }
    if (c === 0) {
      o.hx = [ -50, -50 ];
      o.hy = -93;
      o.abre = 1;
      o.colItems = 1;
    }
    const vis = this.visiblesExtra(), ve = i => i === 2 || !!(vis & 1 << i - 3);
    let s = o.sel;
    if (o.fl & 16) {
      do {
        let n = s - 1;
        if (s === 2) n = 6;
        if (n < 3) n = 3;
        s = n;
      } while (!ve(s));
    } else if (o.fl & 32) {
      let k = 0;
      do {
        s = s === 6 || s === 2 ? 2 : s + 1;
        k++;
      } while (!ve(s) && s !== 2 && k < 8);
    } else if (o.fl & 256) {
      this.op.sonar?.(SE.CANCELAR);
      o.est = 2;
      o.c = 0;
      this.ayuda = null;
    }
    if (s !== o.sel) {
      this.op.sonar?.(SE.CURSOR);
      o.sel = s;
    }
    if (o.est === 1) {
      C.on = true;
      C.dib = true;
      C.modo = 1;
      C.r = "item";
      C.b = 255;
      this.ayuda = this.datos.ayuda?.[o.sel] || "";
    }
    o.fl &= ~368;
  }
  acte() {}
  act81(o) {
    const c = o.c;
    o.c++;
    if (this.ocioso < 3) o.est = 0;
    if (o.est === 0) {
      if (c === 0) {
        this.o[1].fl |= 4;
        this.o[2].fl |= 4;
        this.o[3].fl |= 4;
      }
      if (this.ocioso > 2) {
        if (o.col.every(v => v === 128)) {
          o.dst = PALETA[azar(8)].slice();
          o.lado = 1;
        } else {
          o.dst = GRIS.slice();
          o.lado = 0;
        }
        o.est = 1;
        o.c = 0;
        o.ori = o.col.slice();
      }
    } else if (o.est === 1) {
      o.col = o.ori.map((v, i) => v + Math.trunc((o.dst[i] - v) * c / 128));
      if (c === 128) {
        o.est = 2;
        o.c = 0;
        o.col = o.dst.slice();
      }
    } else if (c === 128) {
      o.est = 1;
      o.c = 0;
      o.ori = o.col.slice();
      o.dst = o.lado === 0 ? PALETA[azar(8)].slice() : GRIS.slice();
      o.lado = 1 - o.lado;
    }
    o.comp = complemento(o.col);
  }
  act80(o) {
    const c = o.c;
    o.c++;
    this.velo = Math.min(1, c * 4 / 3 / 128);
    if (c === 96) {
      this.velo = 0;
      this.reiniciar(0);
    }
  }
  salirCon(que) {
    this.saliendo = {
      que: que,
      n: 0,
      total: 10
    };
  }
  accion(que) {
    this.fl &= ~262144;
    if (que === "entrenamiento") {
      this.cerrar();
      this.op.alEntrenamiento?.();
      return;
    }
    if (que === "opcion") return this.TO ? this.abrirOpcion() : this.abrirLista("opcion");
    if (que === "modelo") return this.abrirLista("modelo");
    if (que === "album") return this.abrirAlbum();
    if (que === "movie") return this.abrirMovie(0);
    if (que === "creditos") {
      this.reproducir({
        tipo: "ENDINGROLL",
        nombre: 46985,
        opts: {
          w: [ 0 ],
          v: [ 321 ]
        }
      }, {
        cortable: true
      }, () => {
        this.pant = "titulo";
        this.reiniciar(9);
        this.op.sonidoTitulo?.();
      });
    }
  }
  reproducir(actor, op, alTerminar) {
    this.pant = "video";
    this.velo = 0;
    this.pararMusica();
    const ok = this.op.reproducir?.(actor, {
      ...op,
      alTerminar: () => {
        if (this.activo && this.pant === "video") alTerminar();
      }
    });
    if (!ok) alTerminar();
  }
  salir() {
    this.cerrar();
    this.op.alSalir?.();
  }
  abrirLista(cual) {
    this.pant = cual;
    this.velo = 0;
    this.lista = {
      c: 0,
      sel: 3
    };
    if (cual === "opcion") this.lista.sel = 0;
  }
  filasLista() {
    if (this.pant === "modelo") {
      const n = this.fl & 64 ? 3 : 2, paso = Math.floor(148 / (n + 1)), L = [];
      const noms = [ [ "pal_sp_photo_n1", "photo_n3" ], [ "pal_sp_photo_n2", "photo_n2" ], [ "pal_sp_photo_ml", "photo_m2" ] ].slice(0, n);
      noms.forEach(([t, clave], k) => L.push({
        i: 3 + k,
        t: this.tex(t),
        y: paso - 93 + k * paso + 112,
        clave: clave,
        ayuda: this.datos.ayuda_modelo?.[1] || ""
      }));
      L.push({
        i: 2,
        t: this.tex("sp_exit"),
        y: 55 + 112,
        salir: true,
        ayuda: ""
      });
      for (const it of L) {
        it.w = it.t?.w ?? 0;
        it.h = it.t?.h ?? 0;
        it.x = 160 - (it.w >> 1);
      }
      return L;
    }
    const todoD = leerLS("mgs_vr_disco_todo") === "1", todoG = todoDesbloqueado();
    const L = [ {
      i: 0,
      txt: "ALL OPEN  " + (todoD ? "ON" : "OFF"),
      ayuda: "ALL VR MISSIONS OPEN FOR TESTING",
      cambia: () => this.op.ponerTodo?.(!todoD)
    }, {
      i: 1,
      txt: "ALL UNLOCKED  " + (todoG ? "ON" : "OFF"),
      ayuda: "THE WHOLE GAME UNLOCKED",
      cambia: () => ponerTodoDesbloqueado(!todoG)
    }, {
      i: 2,
      txt: "CLEARED  " + (this.op.cuenta?.() ?? 0) + " OF 300",
      info: true,
      ayuda: "VR MISSIONS CLEARED"
    }, {
      i: 3,
      t: this.tex("sp_exit"),
      salir: true,
      ayuda: "RETURN TO THE TITLE SCREEN"
    } ];
    L.forEach((it, k) => {
      it.t ||= this.letras(it.txt);
      it.w = it.t.ancho ?? it.t.w;
      it.h = it.t.h;
      it.x = 160 - (it.w >> 1);
      it.y = 60 + k * 30;
    });
    return L;
  }
  cuadroLista() {
    const S = this.lista;
    S.c++;
    const P = this.pulsadas.splice(0), tiene = b => P.includes(b);
    const L = this.filasLista(), elegibles = L.filter(it => !it.info), k = elegibles.findIndex(it => it.i === S.sel);
    if (S.fin) {
      this.velo = Math.min(1, S.fin.n++ / 16);
      if (S.fin.n > 16) {
        this.velo = 0;
        const f = S.fin.fn;
        S.fin = null;
        f();
      }
      return;
    }
    if (tiene("arriba") && k > 0) {
      S.sel = elegibles[k - 1].i;
      this.op.sonar?.(SE.CURSOR);
    } else if (tiene("abajo") && k < elegibles.length - 1) {
      S.sel = elegibles[k + 1].i;
      this.op.sonar?.(SE.CURSOR);
    } else if (tiene("start") || tiene("o") || (tiene("izq") || tiene("der")) && elegibles[k]?.cambia) {
      const it = elegibles[k];
      if (!it) return;
      if (it.salir) return this.cerrarLista();
      if (it.cambia) {
        it.cambia();
        this.op.sonar?.(SE.ELEGIR);
        this.fl = this.fl & ~4095 | this.banderas() & 4095;
        return;
      }
      if (it.clave) {
        this.op.sonar?.(SE.ELEGIR);
        this.pararMusica();
        S.fin = {
          n: 0,
          fn: () => {
            this.cerrar();
            this.op.alFoto?.(it.clave, 7);
          }
        };
      }
    } else if (tiene("x")) this.cerrarLista();
  }
  cerrarLista() {
    const s = this.pant === "modelo" ? 7 : 5;
    this.op.sonar?.(SE.CANCELAR);
    this.lista.fin = {
      n: 0,
      fn: () => {
        this.pant = "titulo";
        this.reiniciar(s);
        this.op.sonidoTitulo?.();
      }
    };
  }
  clicLista(x, y) {
    if (this.pant === "album") return;
    const S = this.lista;
    if (!S || S.fin) return;
    const it = this.filasLista().find(q => !q.info && x >= q.x - 10 && x < q.x + q.w + 10 && y >= q.y - 6 && y < q.y + q.h + 6);
    if (!it) return;
    if (it.i === S.sel) this.pulsadas.push("start"); else {
      S.sel = it.i;
      this.op.sonar?.(SE.CURSOR);
    }
  }
  filasOpcion() {
    return [ {
      id: "sonido",
      t: "op_sound",
      y: -28,
      ayuda: 1,
      vals: [ [ "stereo", "stereo_w", -152, 72 ], [ "monaural", "monaural_w", 76, 80 ] ],
      lineas: [ [ -80, -23, 38 ], [ 42, -23, 34 ] ]
    }, {
      id: "vib",
      t: "op_vib",
      y: -12,
      ayuda: 2,
      vals: [ [ "on", "on_w", -136, 40 ], [ "off", "off_w", 92, 48 ] ],
      lineas: [ [ -96, -7, 41 ], [ 55, -7, 37 ] ]
    }, {
      id: "prueba",
      t: "op_vib_test",
      y: 4,
      ayuda: 3,
      vals: [ [ "weak", "weak_w", -144, 56 ], [ "strong", "strong_w", 80, 72 ] ],
      prueba: true
    }, {
      id: "teclas",
      t: "op_keyconfig",
      y: 40,
      ayuda: 5
    }, {
      id: "salir",
      t: "op_exit",
      y: 60,
      ayuda: 6
    } ];
  }
  texO(n) {
    const N = this.optDatos?.nombres || {};
    return this.TO?.[N[n]] || this.TO?.[n] || null;
  }
  abrirOpcion() {
    this.pant = "opcionD";
    this.velo = 0;
    this.opc = {
      f: 0,
      fila: 0,
      vals: {
        sonido: this.op.sonido?.mono ? 1 : 0,
        vib: vibraActiva() ? 0 : 1,
        prueba: 0
      },
      vibT: 0,
      fin: null
    };
  }
  vibrarPrueba(v) {
    try {
      vibrar(v ? {
        m2: [ 255, 10, 0, 0 ]
      } : {
        m1: [ 1, 10, 0, 0 ]
      });
    } catch {}
    this.opc.vibT = 10;
  }
  cuadroOpcion() {
    const S = this.opc;
    S.f++;
    const P = this.pulsadas.splice(0), tiene = b => P.includes(b);
    if (S.f === 1) this.op.sonar?.(125);
    if (S.fin) {
      this.velo = Math.min(1, S.fin.n++ / 16);
      if (S.fin.n > 16) {
        this.velo = 0;
        const f = S.fin.fn;
        S.fin = null;
        f();
      }
      return;
    }
    if (S.vibT > 0) S.vibT--;
    if (S.f < 53) return;
    const F = this.filasOpcion(), it = F[S.fila];
    if (it.prueba && (this.held.has("izq") || this.held.has("der"))) {
      const v = this.held.has("der") ? 1 : 0;
      if (v !== S.vals.prueba) {
        S.vals.prueba = v;
        this.op.sonar?.(127);
      }
      if (!S.vibT) this.vibrarPrueba(v);
      return;
    }
    if (tiene("arriba") && S.fila > 0) {
      S.fila--;
      this.op.sonar?.(31);
    } else if (tiene("abajo") && S.fila < F.length - 1) {
      S.fila++;
      this.op.sonar?.(31);
    } else if ((tiene("izq") || tiene("der")) && it.vals && !it.prueba) {
      const v = tiene("der") ? 1 : 0;
      if (S.vals[it.id] !== v) {
        S.vals[it.id] = v;
        this.op.sonar?.(127);
      }
    } else if ((tiene("o") || tiene("start")) && it.id === "teclas") {
      this.op.sonar?.(32);
      try {
        pantallaControles.abrir();
      } catch (e) {
        console.warn("OPTION: CONTROLES", e);
      }
    } else if ((tiene("o") || tiene("start")) && it.id === "salir" || tiene("x")) this.salirOpcion();
  }
  salirOpcion() {
    const S = this.opc;
    try {
      this.op.sonido?.setMono?.(S.vals.sonido === 1);
    } catch {}
    try {
      ponerVibra(S.vals.vib === 0);
    } catch {}
    this.op.sonar?.(33);
    S.fin = {
      n: 0,
      fn: () => {
        this.pant = "titulo";
        this.reiniciar(5);
        this.op.sonidoTitulo?.();
      }
    };
  }
  clicOpcion(x, y) {
    const S = this.opc;
    if (!S || S.fin || S.f < 53) return;
    this.filasOpcion().forEach((it, k) => {
      const yy = 112 + it.y;
      if (y < yy - 3 || y >= yy + 15) return;
      const v = it.vals ? it.vals.findIndex(([, , vx, vw]) => x >= 160 + vx - 4 && x < 160 + vx + vw + 4) : -1;
      if (v >= 0) {
        S.fila = k;
        if (it.prueba) {
          S.vals.prueba = v;
          this.vibrarPrueba(v);
        } else S.vals[it.id] = v;
        this.op.sonar?.(127);
        return;
      }
      if (S.fila === k && !it.vals) this.pulsadas.push("o"); else if (S.fila !== k) {
        S.fila = k;
        this.op.sonar?.(31);
      }
    });
  }
  armarOpcion(L) {
    const add = p => {
      if (p) L.push(p);
    }, S = this.opc, f = S.f, T = n => this.texO(n);
    const VERDE = [ 100, 160, 135 ], APAG = [ 70, 100, 90 ];
    const sh = f < 33 ? 0 : Math.min(128, Math.floor((f - 32) * 128 / 10));
    if (sh > 0) {
      add(pieza(T("op_back_l"), 0, 0, 160, 224, [ sh, sh, sh ]));
      add(pieza(T("op_back_r"), 160, 0, 160, 224, [ sh, sh, sh ]));
    }
    const tt = T("op_opt");
    if (tt) {
      let xa = -44, xb = -44, y = -12;
      if (f < 9) {
        xa = 196 - f * 30;
        xb = f * 30 - 284;
      } else if (f >= 29) y = -12 - Math.min(4, f - 28) * 20;
      add(pieza(tt, 160 + xa, 112 + y, 88, 12, APAG, ADD));
      add(pieza(tt, 160 + xb, 112 + y, 88, 12, APAG, ADD));
      if (f >= 13 && f < 29) {
        const b = f < 17 ? Math.floor((f - 12) * 255 / 4) : f < 25 ? 255 : 255 - Math.floor((f - 24) * 255 / 4);
        this.piezasCursor(160 - 44, 112 - 12, 88, 12, b, 1, add);
      }
    }
    if (f < 37) return;
    const F = this.filasOpcion();
    F.forEach((it, k) => {
      const t = T(it.t);
      if (!t) return;
      const yy = 112 + it.y;
      if (f < 43) {
        const w = Math.floor((f - 36) * t.w / 6);
        add(pieza(t, 160 - (w >> 1), yy, w, 12, VERDE, ADD));
        return;
      }
      add(pieza(t, 160 - (t.w >> 1), yy, t.w, 12, VERDE, ADD));
      if (!it.vals || f < 44 + Math.min(4, k)) return;
      const v = S.vals[it.id];
      it.vals.forEach(([n, nw, vx, vw], j) => {
        const sel = it.prueba ? S.vibT > 0 && j === v : j === v;
        add(pieza(T(sel ? nw : n) || T(n), 160 + vx, yy, vw, 12, sel ? VERDE : APAG, ADD));
      });
      if (it.lineas) {
        const [lx, ly, lw] = it.lineas[v];
        add(pieza(T("line"), 160 + lx, 112 + ly, lw, 2, VERDE, ADD));
      }
    });
    const it = F[S.fila], t = T(it.t);
    if (t && f >= 49) {
      const b = f < 53 ? Math.floor((f - 48) * 255 / 4) : 255;
      this.piezasCursor(160 - (t.w >> 1), 112 + it.y, t.w, 12, b, 1, add);
      const ay = this.optDatos?.ayuda?.[it.ayuda];
      if (ay && f >= 53) this.armarAyuda(ay, add);
    }
  }
  abrirMovie(sel = 0) {
    const n = this.todoAbierto() ? 300 : this.op.cuenta?.() ?? 0, k = Math.floor(n / 3);
    const vis = 1 | (k > 44 ? 2 : 0) | (k > 74 ? 4 : 0);
    this.pant = "movie";
    this.velo = 1;
    this.mv = {
      c: 0,
      sel: sel,
      cur: 0,
      est: "entra",
      vis: vis,
      n: 0,
      dir: 0,
      nuevo: sel,
      win: null
    };
    this.op.sonidoTitulo?.();
  }
  todoAbierto() {
    return !!this.op.todo?.() || todoDesbloqueado();
  }
  cuadroMovie() {
    const M = this.mv;
    if (!M) return;
    M.c++;
    const P = this.pulsadas.splice(0), tiene = (...b) => b.some(x => P.includes(x));
    if (M.est === "entra") {
      this.velo = Math.max(0, 1 - M.c / 10);
      if (M.c >= 10) {
        M.est = "elige";
        this.velo = 0;
      }
      return;
    }
    if (M.est === "sale") {
      this.velo = Math.min(1, ++M.n / 16);
      if (M.n >= 16) {
        this.velo = 0;
        this.mv = null;
        this.pant = "titulo";
        this.reiniciar(6);
        this.op.sonidoTitulo?.();
      }
      return;
    }
    if (M.est === "desliza") {
      if (++M.n >= 10) {
        M.sel = M.nuevo;
        M.est = "elige";
        M.n = 0;
        M.dir = 0;
        this.op.sonar?.(127);
      }
      return;
    }
    if (M.est === "ventana") return this.cuadroVentanaMovie(P);
    if (M.est === "video") {
      this.velo = Math.min(1, ++M.n / 16);
      if (M.n === 18) {
        const sel = M.sel, id = parseInt(this.mvDatos.videos?.[sel] || "0", 16);
        this.reproducir({
          tipo: "MOVIE",
          nombre: id,
          opts: {
            i: [ 30 ],
            o: [ 30 ]
          }
        }, {}, () => this.abrirMovie(sel));
      }
      return;
    }
    const orden = [ 2, 0, 1 ], i = orden.indexOf(M.sel);
    if (tiene("arriba") && M.cur !== 0) {
      M.cur = 0;
      this.op.sonar?.(SE.CURSOR);
    } else if (tiene("abajo") && M.cur !== 1) {
      M.cur = 1;
      this.op.sonar?.(SE.CURSOR);
    } else if (tiene("izq") && M.cur === 0 && i > 0) {
      M.nuevo = orden[i - 1];
      M.dir = -1;
      M.est = "desliza";
      M.n = 0;
    } else if (tiene("der") && M.cur === 0 && i < 2) {
      M.nuevo = orden[i + 1];
      M.dir = 1;
      M.est = "desliza";
      M.n = 0;
    } else if (tiene("o", "start")) {
      if (M.cur === 1) {
        this.op.sonar?.(SE.CANCELAR);
        M.est = "sale";
        M.n = 0;
      } else if (M.vis & 1 << M.sel) {
        this.op.sonar?.(SE.NO);
        this.abrirVentanaMovie();
      }
    } else if (tiene("x")) {
      this.op.sonar?.(SE.CANCELAR);
      M.est = "sale";
      M.n = 0;
    }
  }
  abrirVentanaMovie() {
    const M = this.mv, V = this.mvDatos.ventanas?.[M.sel];
    const lineas = (V?.lineas || []).map(l => l);
    const [x, y, w, h] = V?.w || [ 32, 53, 256, 118 ];
    M.est = "ventana";
    M.win = {
      st: 1,
      step: 0,
      n: 0,
      lineas: lineas,
      x: x,
      y: y,
      w: w,
      h: h,
      total: lineas.reduce((s, l) => s + l.replace(/[\x01\x02]/g, "").length, 0)
    };
  }
  cuadroVentanaMovie(P) {
    const M = this.mv, W = M.win;
    const cerrar = P.includes("o") || P.includes("x") || P.includes("start");
    if (cerrar && W.st <= 3 || cerrar && W.st === 0) {
      if (W.st === 1) {
        W.st = 5;
        W.step = 4 - W.step;
      } else if (W.st === 2) {
        W.st = 4;
        W.step = 4 - W.step;
      } else {
        W.st = 4;
        W.step = 0;
      }
      this.op.sonar?.(SE.NO);
    }
    if (W.st === 1) {
      if (++W.step === 5) {
        W.st = 2;
        W.step = 0;
      }
    } else if (W.st === 2) {
      if (++W.step === 5) {
        W.st = 3;
        W.step = 0;
      }
    } else if (W.st === 3) {
      const antes = W.n;
      W.n = Math.min(W.total, W.n + 2);
      const plano = W.lineas.join("").replace(/[\x01\x02]/g, "");
      if (W.n > antes && plano[W.n - 1] && plano[W.n - 1] !== " ") this.op.sonar?.(179);
      if (W.n >= W.total) W.st = 0;
    } else if (W.st === 4) {
      if (++W.step === 5) {
        W.st = 5;
        W.step = 0;
      }
    } else if (W.st === 5) {
      if (++W.step === 5) {
        W.st = 6;
        W.step = 0;
      }
    } else if (W.st === 6) {
      M.win = null;
      M.est = "video";
      M.n = 0;
      this.op.sonar?.(SE.CANCELAR);
    }
  }
  clicMovie(x, y) {
    const M = this.mv;
    if (!M) return;
    if (M.est === "ventana") {
      this.pulsadas.push("o");
      return;
    }
    if (M.est !== "elige") return;
    if (y >= 170 && y < 195 && x >= 120 && x < 200) {
      if (M.cur === 1) this.pulsadas.push("o"); else {
        M.cur = 1;
        this.op.sonar?.(SE.CURSOR);
      }
      return;
    }
    if (y >= 80 && y < 145) {
      if (x >= 120 && x < 200) {
        if (M.cur === 0) this.pulsadas.push("o"); else {
          M.cur = 0;
          this.op.sonar?.(SE.CURSOR);
        }
      } else if (x < 120) {
        M.cur = 0;
        this.pulsadas.push("izq");
      } else {
        M.cur = 0;
        this.pulsadas.push("der");
      }
    }
  }
  textoSis(s) {
    const k = "s|" + s;
    let t = this.textos.get(k);
    if (t) return t;
    const cv = this._cvTexto ||= document.createElement("canvas"), g = cv.getContext("2d", {
      willReadFrequently: true
    });
    g.font = "8px MGS, Consolas, monospace";
    const w = Math.max(1, Math.ceil(g.measureText(s).width)), h = 10;
    cv.width = w;
    cv.height = h;
    g.font = "8px MGS, Consolas, monospace";
    g.textBaseline = "top";
    g.fillStyle = "#fff";
    g.clearRect(0, 0, w, h);
    g.fillText(s, 0, 1);
    const src = g.getImageData(0, 0, w, h).data;
    t = texVacia(w, h);
    t.ancho = w;
    for (let i = 0; i < src.length; i += 4) if (src[i + 3] >= 100) {
      t.d[i] = t.d[i + 1] = t.d[i + 2] = 128;
      t.d[i + 3] = 255;
    }
    t.id = k;
    this.textos.set(k, t);
    return t;
  }
  lineaSis(add, s, x, y, c, cRes, quedan = Infinity, centrada = false) {
    const segs = [];
    let res = false, txt = "";
    const limpio = s.replace(/\x02(?=\S)/g, " ");
    for (const ch of limpio) {
      if (ch === "" || ch === "") {
        if (txt) segs.push([ txt, res ]);
        txt = "";
        res = ch === "";
        continue;
      }
      txt += ch;
    }
    if (txt) segs.push([ txt, res ]);
    const anchos = segs.map(([t]) => this.textoSis(t).ancho), total = anchos.reduce((a, b) => a + b, 0);
    let X = centrada ? 160 - (total >> 1) : x;
    segs.forEach(([t, r], i) => {
      if (quedan <= 0) return;
      const parte = t.slice(0, Math.max(0, quedan));
      quedan -= t.length;
      if (parte.trim()) add(pieza(this.textoSis(parte), X, y, null, null, r ? cRes : c, OPACO));
      X += anchos[i];
    });
  }
  armarMovie(L) {
    const add = p => {
      if (p) L.push(p);
    }, M = this.mv;
    if (!M || !this.TM) return;
    const T = n => this.texMv(n), cx = 160, cy = 112;
    add(pieza(T("d3_sp_backl"), 0, 0, 160, 224, GRIS));
    add(pieza(T("d3_sp_backr"), 160, 0, 160, 224, GRIS));
    const cab = T("d3_sp_movie_head");
    if (cab) add(pieza(cab, cx - (cab.w >> 1), cy - 82, cab.w, cab.h, [ 140, 200, 180 ], ADD));
    const ex = T("sp_exit");
    if (ex) add(pieza(ex, cx - (ex.w >> 1), cy + 66, ex.w, ex.h, ITEM, ADD));
    const chica = [ "d3_mv_samtgs_a2", "d3_mv_samtgs_b2", "d3_mv_same3_2" ], grande = [ "d3_mv_samtgs_a1", "d3_mv_samtgs_b1", "d3_mv_same3_1" ];
    const rot = [ "d3_mv_tgs_a", "d3_mv_tgs_b", "d3_mv_e3" ], orden = [ 2, 0, 1 ], abierto = k => !!(M.vis & 1 << k);
    const desl = M.est === "desliza" ? -M.dir * 10 * (M.n + 1) : 0, i0 = orden.indexOf(M.sel);
    for (let k = 0; k < 3; k++) {
      const pos = orden.indexOf(k) - i0;
      if (Math.abs(pos) > 1 || pos === 0 && M.est !== "desliza") continue;
      add(pieza(T(abierto(k) ? chica[k] : "d3_mv_samhatena_2"), cx - 24 + pos * 100 + desl, cy - 17, 48, 36, GRIS));
    }
    if (M.est !== "desliza") {
      add(pieza(T(abierto(M.sel) ? grande[M.sel] : "d3_mv_samhatena_1"), cx - 32, cy - 23, 64, 48, GRIS));
      if (abierto(M.sel)) {
        const r = T(rot[M.sel]);
        if (r) add(pieza(r, cx - 44, cy + 43, r.w, r.h, GRIS));
      }
      if (i0 > 0) add(pieza(T("d3_mv_ya_l"), cx - 60, cy - 3, null, null, GRIS));
      if (i0 < 2) add(pieza(T("d3_mv_ya_r"), cx + 55, cy - 3, null, null, GRIS));
    }
    add(pieza(T("d3_mv_base"), cx - 5, cy - 49, null, null, GRIS));
    if (M.est === "elige" || M.est === "ventana" || M.est === "video") {
      if (M.cur === 0) this.piezasCursor(cx - 32, cy - 23, 64, 48, 96, 1, add); else if (ex) this.piezasCursor(cx - (ex.w >> 1), cy + 66, ex.w, ex.h, 255, 1, add);
    }
    if (M.est === "elige" && M.cur === 0 && abierto(M.sel)) {
      const t = this.mvDatos.titulos || [];
      [ t[M.sel * 2], t[M.sel * 2 + 1] ].forEach((s, j) => {
        if (s) this.lineaSis(add, s, 0, 194 + j * 10, [ 200, 200, 200 ], [ 216, 168, 64 ], Infinity, true);
      });
    }
    const W = M.win;
    if (W && W.st !== 6) {
      let r;
      if (W.st === 1) {
        const w = W.w * W.step / 5;
        r = [ W.x + (W.w - w) / 2, W.y + W.h / 2, w, 1 ];
      } else if (W.st === 2) {
        const h = W.h * W.step / 4;
        r = [ W.x, W.y + (W.h - h) / 2, W.w, h ];
      } else if (W.st === 4) {
        const h = W.h * (4 - W.step) / 4;
        r = [ W.x, W.y + (W.h - h) / 2, W.w, h ];
      } else if (W.st === 5) {
        const w = W.w * (4 - W.step) / 4;
        r = [ W.x + (W.w - w) / 2, W.y + W.h / 2, w, 1 ];
      } else r = [ W.x, W.y, W.w, W.h ];
      r = r.map(Math.round);
      add({
        t: null,
        x: r[0],
        y: r[1],
        w: Math.max(1, r[2]),
        h: Math.max(1, r[3]),
        sx: 0,
        sy: 0,
        sw: 1,
        sh: 1,
        c: [ 0, 0, 0 ],
        c2: [ 0, 0, 0 ],
        m: VELO,
        a: .5
      });
      const b = this.blanco1, g = [ 32, 32, 32 ];
      add(pieza(b, r[0], r[1], r[2], 1, g));
      add(pieza(b, r[0], r[1] + r[3] - 1, r[2], 1, g));
      add(pieza(b, r[0], r[1], 1, r[3], g));
      add(pieza(b, r[0] + r[2] - 1, r[1], 1, r[3], g));
      if (W.st === 3 || W.st === 0) {
        let quedan = W.st === 0 ? W.total : W.n;
        W.lineas.forEach((l, i) => {
          if (quedan <= 0) return;
          this.lineaSis(add, l, W.x + 16, W.y + 12 + i * 18, [ 206, 206, 206 ], [ 216, 168, 64 ], quedan);
          quedan -= l.replace(/[\x01\x02]/g, "").length;
        });
      }
    }
  }
  abrirAlbum() {
    this.pant = "album";
    this.velo = 0;
    const yo = this, host = {
      pulsadas: [],
      R: {
        f8: this.f8,
        f5: this.f5
      },
      sonido: this.op.sonido,
      fotosAlbum: () => leerFotos(),
      se: id => this.op.sonar?.(id),
      pulsado(...cuales) {
        const i = this.pulsadas.findIndex(p => typeof p === "string" && cuales.includes(p));
        return i < 0 ? null : this.pulsadas.splice(i, 1)[0];
      },
      tomarToque() {
        const i = this.pulsadas.findIndex(p => typeof p === "object");
        return i < 0 ? null : this.pulsadas.splice(i, 1)[0];
      },
      _hover: () => null,
      cursor: (fb, x0, y0, w, h, b = 255, modo = 1) => yo.cursorCPU(fb, x0, y0, w, h, b, modo)
    };
    this.sub = {
      host: host,
      p: null
    };
    import("./album.js").then(async m => {
      const p = new m.Pantalla(host);
      await p.cargar();
      if (this.pant === "album" && this.sub?.host === host) this.sub.p = p;
    }).catch(e => {
      console.warn("vr título: el álbum no cargó", e);
      this.volverDeAlbum();
    });
  }
  cuadroAlbum() {
    const S = this.sub;
    if (!S) return;
    const P = this.pulsadas.splice(0);
    for (const b of P) S.host.pulsadas.push(b === "start" ? "o" : b);
    if (!S.p) return;
    S.p.cuadro();
    if (S.p.fin) this.volverDeAlbum();
  }
  volverDeAlbum() {
    this.sub = null;
    this.pant = "titulo";
    this.reiniciar(8);
    this.op.sonidoTitulo?.();
  }
  firmaAlbum() {
    const fb = this.fbAlbum;
    if (!fb) return 0;
    let s = 0;
    const d = fb.d;
    for (let i = 0; i < d.length; i += 52) s = s * 31 + d[i] | 0;
    return s;
  }
  armar() {
    const L = [];
    if (this.pant === "modelo" || this.pant === "opcion") {
      this.armarLista(L);
      this.armarVelo(L);
      return L;
    }
    if (this.pant === "opcionD") {
      this.armarOpcion(L);
      this.armarVelo(L);
      return L;
    }
    if (this.pant === "album" || this.pant === "video") return L;
    if (this.pant === "movie") {
      this.armarMovie(L);
      this.armarVelo(L);
      return L;
    }
    const capas = new Map, add = (prio, p) => {
      if (!p) return;
      if (!capas.has(prio)) capas.set(prio, []);
      capas.get(prio).push(p);
    };
    const O = this.o, T = this.T;
    if (O[1].dib) {
      const col = O[1].fl & 4 ? O[129].col : [ O[1].b, O[1].b, O[1].b ];
      for (const [x, t] of this.tiras(O[1].d)) add(7, pieza(T[t], x, 0, 160, 224, col, OPACO));
    }
    if (O[2].dib && O[2].rec) {
      const b = O[2].b, col = O[2].fl & 4 ? escalar(O[129].comp, b) : [ b, b, b ];
      add(6, pieza(T[O[2].rec.t], 0, O[2].y, 320, O[2].alto, col, RESTA, {
        sx: O[2].rec.sx,
        sy: O[2].rec.sy,
        sw: 53,
        sh: 83
      }));
    }
    if (O[3].dib && O[3].foto != null) {
      const b = O[3].b, col = O[3].fl & 4 ? escalar(O[129].comp, b) : [ b, b, b ], k = (200 + O[3].z) / 200;
      for (const [x, t] of this.tiras(O[3].foto)) {
        const x0 = Math.max(0, x), x1 = Math.min(320, x + 160);
        if (x1 <= x0) continue;
        add(5, pieza(T[t], 160 + (x0 - 160) * k, 112 - 112 * k, (x1 - x0) * k, 224 * k, col, ADD, {
          sx: x0 - x,
          sw: x1 - x0
        }));
      }
    }
    if (O[6].dib) {
      const b = O[6].b;
      add(4, pieza(this.tex(O[6].waku2 ? "op_snake_waku2" : "op_snake_waku"), 82, 13, 156, 214, [ b, b, b ], RESTA));
    }
    if (O[9].dib) {
      const b = O[9].b;
      add(3, pieza(this.tex("d3_sp_backl"), 0, 0, 160, 224, [ b, b, b ]));
      add(3, pieza(this.tex("d3_sp_backr"), 160, 0, 160, 224, [ b, b, b ]));
    }
    if (O[5].dib) {
      const b = O[5].b;
      add(2, pieza(this.tex("d3_title_allrights"), 72, 208, 176, 7, [ b, b, b ], ADD));
      add(2, pieza(this.tex(O[5].nja), 102, 36, 116, 181, [ b, b, b ], O[5].opaco ? OPACO : ADD));
    }
    if (O[14].dib && O[14].b > 0) this.armarCursor(p => add(2, p));
    if (O[0].dib && O[0].logo < 2) {
      const c = O[0].col, n = O[0].logo === 0 ? "op_konami" : "op_kcej";
      add(1, pieza(T[n + "_l"], 0, 0, 160, 224, [ c, c, c ]));
      add(1, pieza(T[n + "_r"], 160, 0, 160, 224, [ c, c, c ]));
    }
    if (O[4].dib) {
      const b = O[4].b;
      add(1, pieza(this.tex("d3_op_title"), 44, 10, 232, 60, [ b, b, b ], ADD));
    }
    if (O[7].dib) add(1, pieza(this.tex("op_p_start"), 80, 182, 160, 8, O[7].col));
    if (O[8].dib) this.armarRueda(p => add(1, p));
    if (O[10].dib) this.armarExtra(p => add(1, p));
    if (this.E === 7 || this.E === 8) add(0, pieza(this.letras("DISC 1", "chico"), 6, 4, null, null, NARANJA, OPACO));
    if (this.ayuda && this.E === 11 && O[10].est === 1) this.armarAyuda(this.ayuda, p => add(0, p));
    if (this.aviso) {
      const t = this.letras(this.aviso.texto);
      add(0, pieza(t, 160 - ((t.ancho ?? t.w) >> 1), 150, null, null, NARANJA, OPACO));
    }
    for (const prio of [ ...capas.keys() ].sort((a, b) => b - a)) L.push(...prio > 0 ? capas.get(prio).reverse() : capas.get(prio));
    this.armarVelo(L);
    return L;
  }
  armarVelo(L) {
    const v = Math.max(this.velo || 0, this.saliendo ? this.saliendo.n / this.saliendo.total : 0);
    if (v > 0) L.push({
      t: null,
      x: 0,
      y: 0,
      w: W,
      h: H,
      sx: 0,
      sy: 0,
      sw: 1,
      sh: 1,
      c: [ 0, 0, 0 ],
      c2: [ 0, 0, 0 ],
      m: VELO,
      a: Math.min(1, v)
    });
  }
  armarAyuda(s, add) {
    const t = this.letras(s), w = t.ancho ?? t.w, x = 160 - (w >> 1), y = 193;
    for (const [dx, dy] of [ [ -1, 0 ], [ 1, 0 ], [ 0, -1 ], [ 0, 1 ] ]) add(pieza(t, x + dx, y + dy, null, null, [ 0, 0, 0 ], OPACO));
    add(pieza(t, x, y, null, null, [ 200, 200, 200 ], OPACO));
  }
  armarRueda(add) {
    const O = this.o[8], noms = [ "d3_title_vr", "d3_title_special", "d3_title_option" ], X = [ 116, 130, 134 ];
    const fila = (i, y, c, c2, m) => {
      const t = this.tex(noms[i]);
      if (t) add(pieza(t, X[i], y, t.w, t.h, c, m, {
        c2: c2
      }));
    };
    const pulso = O.pulso || [ 255, 64, 64 ];
    if (!O.anim) {
      const s = O.sel, p = (s + 2) % 3, n = (s + 1) % 3;
      fila(p, 167, [ 0, 0, 0 ], VERDE, ADD);
      fila(n, 197, VERDE, [ 0, 0, 0 ], ADD);
      fila(s, 182, pulso, pulso, OPACO);
      return;
    }
    const {c2: c2, dir: dir} = O.anim, k = Math.min(5, c2 + 1) * 3, s = O.sel, p = (s + 2) % 3, n = (s + 1) % 3, quieto = c2 > 3;
    const cen = quieto ? [ 255, 64, 64 ] : null;
    if (dir > 0) {
      fila(p, 182 - k, rampa(4 - c2), VERDE, ADD);
      if (cen) fila(s, 197 - k, cen, cen, OPACO); else fila(s, 197 - k, VERDE, rampa(c2 + 1), ADD);
      fila(n, 212 - k, rampa(c2 - 1), [ 0, 0, 0 ], ADD);
      fila(n, 167 - k, [ 0, 0, 0 ], rampa(2 - c2), ADD);
    } else {
      fila(n, 182 + k, VERDE, rampa(4 - c2), ADD);
      if (cen) fila(s, 167 + k, cen, cen, OPACO); else fila(s, 167 + k, rampa(c2 + 1), VERDE, ADD);
      fila(p, 152 + k, [ 0, 0, 0 ], rampa(c2 - 1), ADD);
      fila(p, 197 + k, rampa(2 - c2), [ 0, 0, 0 ], ADD);
    }
  }
  armarExtra(add) {
    const O = this.o[10], cab = this.tex("d3_sp_special_head");
    if (cab && O.hx) for (const hx of O.hx) add(pieza(cab, 160 + hx, 112 + O.hy, cab.w, cab.h, CABEZA, ADD));
    if (!O.colItems) return;
    for (const it of this.itemsExtra()) {
      if (!it.vis || !it.t) continue;
      const w = Math.round(it.w * Math.min(1, O.abre ?? 1));
      add(pieza(it.t, 160 - (w >> 1), it.y, w, it.h, ITEM, ADD));
    }
  }
  rectCursor() {
    const C = this.o[14];
    if (C.r === "cabeza") {
      const t = this.tex("d3_sp_special_head"), O = this.o[10];
      return t && O.hx ? [ 160 + O.hx[0], 112 + O.hy, t.w, t.h ] : null;
    }
    const it = this.itemsExtra().find(q => q.i === this.o[10].sel);
    return it ? [ it.x, it.y, it.w, it.h ] : null;
  }
  piezasCursor(x0, y0, w, h, b, modo, add) {
    const m = modo === 1 ? 6 : 8, i = modo === 1 ? 2 : 0, c = [ b, b, b ], T = this.T;
    add(pieza(T.cur_lu, x0 - m, y0 - m, 8, 8, c, ADD));
    add(pieza(T.cur_ru, x0 + w - i, y0 - m, 8, 8, c, ADD));
    add(pieza(T.cur_ld, x0 - m, y0 + h - i, 8, 8, c, ADD));
    add(pieza(T.cur_rd, x0 + w - i, y0 + h - i, 8, 8, c, ADD));
    add(pieza(T.cur_u, x0 + i, y0 - m, w - 2 * i, 8, c, ADD));
    add(pieza(T.cur_d, x0 + i, y0 + h - i, w - 2 * i, 8, c, ADD));
    add(pieza(T.cur_l, x0 - m, y0 + i, 8, h - 2 * i, c, ADD));
    add(pieza(T.cur_r, x0 + w - i, y0 + i, 8, h - 2 * i, c, ADD));
    add(pieza(T.cur_c, x0 + i, y0 + i, w - 2 * i, h - 2 * i, c, ADD));
  }
  armarCursor(add) {
    const r = this.rectCursor(), C = this.o[14];
    if (r) this.piezasCursor(r[0], r[1], r[2], r[3], C.b, C.modo, add);
  }
  cursorCPU(fb, x0, y0, w, h, b, modo) {
    const L = [];
    this.piezasCursor(x0, y0, w, h, b, modo, p => L.push(p));
    for (const p of L) this.blitPieza(fb, p);
  }
  armarLista(L) {
    const add = p => {
      if (p) L.push(p);
    }, S = this.lista;
    add(pieza(this.tex("d3_sp_backl"), 0, 0, 160, 224, GRIS));
    add(pieza(this.tex("d3_sp_backr"), 160, 0, 160, 224, GRIS));
    const cab = this.pant === "modelo" ? this.tex("d3_sp_special_head") : this.letras("OPTION", true);
    if (cab) add(pieza(cab, 160 - (cab.w >> 1), 19, cab.w, cab.h, CABEZA, ADD));
    const F = this.filasLista();
    for (const it of F) add(pieza(it.t, it.x, it.y, it.w, it.h, it.info ? [ 60, 96, 81 ] : ITEM, ADD));
    const s = F.find(q => q.i === S.sel);
    if (s) {
      this.piezasCursor(s.x, s.y, s.w, s.h, 255, 1, add);
      if (s.ayuda) this.armarAyuda(s.ayuda, add);
    }
  }
  blitPieza(fb, p0) {
    const p = recortar(p0);
    if (!p) return;
    if (p.m === VELO) {
      const k = 1 - p.a, D = fb.d, x0 = Math.round(p.x), x1 = Math.round(p.x + p.w), y0 = Math.round(p.y), y1 = Math.round(p.y + p.h);
      for (let y = y0; y < y1; y++) for (let i = (y * fb.w + x0) * 4, f = (y * fb.w + x1) * 4; i < f; i += 4) {
        D[i] *= k;
        D[i + 1] *= k;
        D[i + 2] *= k;
      }
      return;
    }
    if (!p.t) return;
    const g = p.c2 !== p.c ? [ ...p.c, ...p.c2 ] : null;
    blit(fb, p.t, p.x, p.y, p.w, p.h, p.c[0], p.c[1], p.c[2], p.m, Math.floor(p.sx), Math.floor(p.sy), Math.max(1, Math.round(p.sw)), Math.max(1, Math.round(p.sh)), g);
  }
  lienzo() {
    if (!this.fb) {
      this.fb = texVacia(W, H);
      this.cv = document.createElement("canvas");
      this.cv.width = W;
      this.cv.height = H;
      this.cx = this.cv.getContext("2d");
      this.img = this.cx.createImageData(W, H);
    }
    const clave = this.f + "|" + this.pant;
    if (clave === this._claveCPU) return this.cv;
    this._claveCPU = clave;
    const fb = this.fb;
    if (this.pant === "album") {
      limpiar(fb);
      this.sub?.p?.dibujar(fb);
      this.fbAlbum = fb;
    } else {
      limpiar(fb);
      for (const p of this.armar()) this.blitPieza(fb, p);
    }
    this.img.data.set(fb.d);
    this.cx.putImageData(this.img, 0, 0);
    return this.cv;
  }
  dibujar(x, margen = 0) {
    if (!this.activo) return;
    const m = Math.ceil(margen);
    x.fillStyle = "#000";
    x.fillRect(-m, 0, W + 2 * m, H);
    this._dibGPU = !!this.gpuAparte?.() && this.pant !== "album";
    if (this._dibGPU) {
      x.clearRect(0, 0, W, H);
      return;
    }
    if (!this.T) return;
    x.drawImage(this.lienzo(), 0, 0);
  }
  get firma() {
    if (this.pant === "album") return "a|" + this.firmaAlbum();
    return `${this.pant}|${this._dibGPU ? "g" : this.f}`;
  }
  mallaPanel() {
    if (this.gpu) return this.gpu;
    const g = new THREE.Group;
    g.name = "titulo_vr_disco";
    g.visible = false;
    this.gpu = g;
    this.gpuPool = [];
    this.gpuGeo = new THREE.PlaneGeometry(1, 1);
    this.gpuBlanco = {
      d: new Uint8ClampedArray([ 255, 255, 255, 255 ]),
      w: 1,
      h: 1,
      id: "_blanco"
    };
    return g;
  }
  texGPU(t) {
    if (!t) return null;
    if (t._gpu) return t._gpu;
    const tx = new THREE.DataTexture(new Uint8Array(t.d.buffer.slice(0)), t.w, t.h, THREE.RGBAFormat, THREE.UnsignedByteType);
    tx.magFilter = THREE.NearestFilter;
    tx.minFilter = THREE.NearestFilter;
    tx.generateMipmaps = false;
    tx.flipY = false;
    tx.colorSpace = THREE.NoColorSpace;
    tx.needsUpdate = true;
    return t._gpu = tx;
  }
  quadGPU(i) {
    let q = this.gpuPool[i];
    if (q) return q;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: null
        },
        uRect: {
          value: new THREE.Vector4(0, 0, 1, 1)
        },
        cA: {
          value: new THREE.Vector3(128, 128, 128)
        },
        cB: {
          value: new THREE.Vector3(128, 128, 128)
        },
        uAlfa: {
          value: 1
        }
      },
      vertexShader: "out vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: [ "precision highp float;", "uniform sampler2D map; uniform vec4 uRect; uniform vec3 cA, cB; uniform float uAlfa;", "in vec2 vUv; out vec4 color;", "void main() {", "  vec2 t = vec2(mix(uRect.x, uRect.z, vUv.x), mix(uRect.y, uRect.w, 1.0 - vUv.y));", "  vec4 s = texture(map, t);", "  if (s.a < 0.5) discard;", "  vec3 k = mix(cA, cB, 1.0 - vUv.y) / 128.0;", "  color = vec4(min(s.rgb * k, vec3(1.0)), uAlfa);", "}" ].join("\n"),
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    const m = new THREE.Mesh(this.gpuGeo, mat);
    m.frustumCulled = false;
    m.raycast = () => {};
    m.userData.sinColision = true;
    m.visible = false;
    this.gpu.add(m);
    q = this.gpuPool[i] = {
      m: m,
      modo: -1
    };
    return q;
  }
  modoGPU(mat, m) {
    if (m === OPACO) {
      mat.blending = THREE.NoBlending;
    } else if (m === VELO) {
      mat.blending = THREE.NormalBlending;
    } else {
      mat.blending = THREE.CustomBlending;
      mat.blendSrc = THREE.OneFactor;
      mat.blendDst = THREE.OneFactor;
      mat.blendEquation = m === RESTA ? THREE.ReverseSubtractEquation : THREE.AddEquation;
      mat.blendSrcAlpha = THREE.OneFactor;
      mat.blendDstAlpha = THREE.OneFactor;
      mat.blendEquationAlpha = THREE.AddEquation;
    }
  }
  pintarGPU(base = 79) {
    if (!this.gpu) return;
    const clave = this.f + "|" + this.pant + "|" + (this.aviso?.t ?? "");
    if (clave === this._claveGPU) return;
    this._claveGPU = clave;
    const L = this.pant === "album" ? [] : this.armar();
    const fondo = {
      t: this.gpuBlanco,
      x: 0,
      y: 0,
      w: W,
      h: H,
      sx: 0,
      sy: 0,
      sw: 1,
      sh: 1,
      c: [ 0, 0, 0 ],
      c2: [ 0, 0, 0 ],
      m: OPACO
    };
    let n = 0;
    for (const p0 of [ fondo, ...L ]) {
      const p = recortar(p0);
      if (!p) continue;
      const t = p.m === VELO ? this.gpuBlanco : p.t;
      if (!t) continue;
      const q = this.quadGPU(n), m = q.m, u = m.material.uniforms;
      u.map.value = this.texGPU(t);
      u.uRect.value.set(p.sx / t.w, p.sy / t.h, (p.sx + p.sw) / t.w, (p.sy + p.sh) / t.h);
      u.cA.value.set(p.c[0], p.c[1], p.c[2]);
      u.cB.value.set(p.c2[0], p.c2[1], p.c2[2]);
      u.uAlfa.value = p.m === VELO ? p.a : 1;
      if (q.modo !== p.m) {
        this.modoGPU(m.material, p.m);
        q.modo = p.m;
      }
      m.position.set((p.x + p.w / 2) / W - .5, .5 - (p.y + 8 + p.h / 2) / 240, 0);
      m.scale.set(p.w / W, p.h / 240, 1);
      m.renderOrder = base + .1 + n * .001;
      m.visible = true;
      n++;
    }
    for (let i = n; i < this.gpuPool.length; i++) this.gpuPool[i].m.visible = false;
    this.gpuPiezas = n;
  }
  dispose() {
    this.gpu?.removeFromParent();
    for (const q of this.gpuPool || []) q.m.material.dispose();
    this.gpuGeo?.dispose();
    for (const t of Object.values(this.T || {})) t._gpu?.dispose();
    for (const t of this.textos?.values() || []) t._gpu?.dispose();
  }
}
