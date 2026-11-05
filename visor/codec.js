// MGS web — FeniXVOID · Project Ravenlight
import { Guion, valorGCL } from "./codec_gcl.js";

import { B } from "./controles.js";

import { cargarVoz } from "./audio_ps1.js";

export const W = 320, H = 224;

const FPS = 30, SNAKE = 8650;

export const SE = {
  CALL: 16,
  CURSOR: 31,
  FACECHG: 74,
  CONNECT: 84,
  SELECT: 85,
  SEND: 86,
  DISCONNECT: 87,
  TUNING: 103,
  CANCEL: 104,
  RCURSOR: 105,
  STATIC: 108
};

const P = {
  UP: 1,
  DOWN: 2,
  LEFT: 4,
  RIGHT: 8,
  CIRCLE: 16,
  CROSS: 32,
  TRIANGLE: 64,
  SQUARE: 128,
  SELECT: 256,
  START: 512
};

const UDLR = 15, ABXY = 240;

const ACC = {
  PTT: 1,
  MEMORY: 2,
  RIGHT: 4,
  LEFT: 8
};

const BASE = [ 46, 71, 61 ];

const PANEL = [ 19, 31, 26 ];

const PANEL2 = [ 32, 48, 41 ];

const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;

const mod = (c, texel) => c.map(v => Math.min(255, Math.round(v * texel / 128)));

const hex4 = n => (n & 65535).toString(16).padStart(4, "0");

const TILES = [ [ 120, 58, 80, 48, PANEL ], [ 116, 55, 5, 2, PANEL2 ], [ 199, 55, 5, 2, PANEL2 ], [ 116, 107, 5, 2, PANEL2 ], [ 199, 107, 5, 2, PANEL2 ], [ 121, 55, 78, 1, PANEL2 ], [ 121, 108, 78, 1, PANEL2 ], [ 129, 38, 62, 10, PANEL ], [ 129, 117, 62, 10, PANEL ], [ 90, 76, 25, 11, PANEL ], [ 205, 76, 25, 11, PANEL ], [ 84, 38, 43, 1, PANEL ], [ 193, 38, 43, 1, PANEL ], [ 84, 126, 43, 1, PANEL ], [ 193, 126, 43, 1, PANEL ], [ 91, 46, 36, 1, PANEL ], [ 193, 46, 36, 1, PANEL ], [ 91, 118, 36, 1, PANEL ], [ 193, 118, 36, 1, PANEL ] ];

const DIG7 = [ 119, 36, 93, 109, 46, 107, 123, 37, 127, 111 ];

const SEG_G = [ [ 1, 0, 7, 2 ], [ 0, 1, 2, 7 ], [ 7, 1, 2, 7 ], [ 1, 7, 7, 2 ], [ 0, 9, 2, 7 ], [ 7, 9, 2, 7 ], [ 1, 15, 7, 2 ] ];

const SEG_C = [ [ 1, 0, 5, 2 ], [ 0, 1, 2, 6 ], [ 5, 1, 2, 6 ], [ 1, 6, 5, 2 ], [ 0, 8, 2, 6 ], [ 5, 8, 2, 6 ], [ 1, 13, 5, 2 ] ];

const SEG_T = [ 2, 4, 3, 1, 4, 3, 1 ];

const PASO_DIG = [ 10, 10, 15, 12, 0 ];

const FLECHAS = [ [ 222, 81, 214, 77, 214, 85 ], [ 98, 81, 106, 77, 106, 85 ] ];

const ESPECIALES = [ ".", 2, "@", 2, ":", 2, "_", 4, "!", 2, "?", 6, "+", 6, "-", 6, "/", 6, "*", 6, "{", 3, "}", 3 ];

function clutColor(fore) {
  const fr = fore & 31, fg = fore >> 5 & 31, fb = fore >> 10 & 31;
  const a = [ [ 0, 0, 0 ], [ fr / 3 | 0, fg / 3 | 0, fb / 3 | 0 ], [ fr * 2 / 3 | 0, fg * 2 / 3 | 0, fb * 2 / 3 | 0 ], [ fr, fg, fb ] ];
  return a.map(([r, g, b], i) => i === 0 ? null : [ r << 3 | r >> 2, g << 3 | g >> 2, b << 3 | b >> 2 ]);
}

const COLORES_TEXTO = [ 26425, 15343, 14923, 4244 ];

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function lienzo(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function teñir(img, c) {
  const cv = lienzo(img.width, img.height), x = cv.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = rgb(c);
  x.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

function linea(x, x0, y0, x1, y1) {
  x0 |= 0;
  y0 |= 0;
  x1 |= 0;
  y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let n = 0; n < 2e3; n++) {
    x.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) {
      e += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      e += dx;
      y0 += sy;
    }
  }
}

function polilinea(x, pts) {
  for (let i = 0; i + 3 < pts.length; i += 2) linea(x, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
}

function triangulo(x, a) {
  x.beginPath();
  x.moveTo(a[0] + .5, a[1] + .5);
  x.lineTo(a[2] + .5, a[3] + .5);
  x.lineTo(a[4] + .5, a[5] + .5);
  x.closePath();
  x.fill();
}

class Tablero {
  constructor(fuente, w = 252, h = 76) {
    this.f = fuente;
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h);
    this.maxW = 0;
    this.lSkip = 6;
    this.cH = 4;
    this.alto = (this.lSkip + 12) * this.cH + 2;
    this.zen1 = null;
    this.cv = lienzo(w, h);
    this.img = this.cv.getContext("2d").createImageData(w, h);
    this.clut = COLORES_TEXTO.map(clutColor);
  }
  limpiar() {
    this.px.fill(0);
    this.maxW = 0;
  }
  ancho(c) {
    if (c === 32768) return 0;
    if ((c & 65280) === 32768 && c !== 32803 && (c < 32784 || c >= 32800)) {
      const g = this.f.ascii[(c & 255) - 32];
      return g ? g[2] : 0;
    }
    return 12;
  }
  hankaku(x, y, code, color) {
    if (code === 0) {
      const yy = y + 5;
      if (yy >= 0 && yy < this.h) for (let i = 0; i < 18 && x + i < this.w; i++) this.px[yy * this.w + x + i] |= color << 2 | 3;
      return 18;
    }
    let c = code;
    if (c > 128) c -= 34;
    c -= 32;
    const g = this.f.ascii[c];
    if (!g) return 0;
    const [gx, yo, gw] = g, niv = this.f.niv, AW = this.f.aw;
    for (let r = 0; r < 12; r++) {
      const yy = y + yo + r;
      if (yy < 0 || yy >= this.h) continue;
      for (let i = 0; i < gw; i++) {
        const v = niv[r * AW + gx + i];
        if (v && x + i < this.w) this.px[yy * this.w + x + i] |= color << 2 | v;
      }
    }
    return gw;
  }
  zenkaku(x, y, code, color) {
    y += 1;
    const glifo = this.glifoZen(code);
    for (let r = 0; r < 12; r++) {
      const yy = y + r;
      if (yy < 0 || yy >= this.h) continue;
      for (let i = 0; i < 12; i++) {
        if (x + i >= this.w) break;
        const k = yy * this.w + x + i;
        if (!glifo) this.px[k] = color << 2; else {
          const v = glifo(r, i);
          if (v) this.px[k] |= color << 2 | v;
        }
      }
    }
  }
  glifoZen(code) {
    code &= ~24576;
    let i;
    if (code < 33280) i = code - 33025; else if (code < 33536) i = code - 33198; else if (code < 38400) i = code - 36721 - (code >> 8) + 169; else if (code < 39424) i = code - 38251 - (code >> 8) | 4096; else return null;
    const tabla = i >> 12, n = i & 4095;
    if (tabla === 0) {
      if (n < 0 || n >= this.f.zen) return null;
      const niv = this.f.niv, AW = this.f.aw, ox = n * this.f.zenPaso, oy = this.f.zenY;
      return (r, c) => niv[(oy + r) * AW + ox + c];
    }
    if (tabla === 1 && this.zen1 && n < this.zen1.length) {
      const g = this.zen1[n];
      return (r, c) => {
        const v = g[r * 3] << 16 | g[r * 3 + 1] << 8 | g[r * 3 + 2];
        return v >> 22 - 2 * c & 3;
      };
    }
    return null;
  }
  dibujar(texto, xtop, ytop, color0 = 0) {
    const cod = [];
    for (const ch of texto) {
      const c = ch.charCodeAt(0);
      cod.push(c < 256 ? 32768 | c : c);
    }
    const n = cod.length, bufW = this.w - 12, mask = 40959, CODE = ch => 32768 | ch.charCodeAt(0);
    let i = 0, x = xtop, y = ytop, counter = 0, flag1 = 0, cr = 0, result = 0, color = color0, mdata, next, dx, m2 = 0;
    const peek = k => k < n ? cod[k] : 32768;
    this.maxW = 0;
    const OVER = () => {
      if (this.maxW < x) this.maxW = x;
      return 2147483648 | i;
    };
    while (i < n) {
      mdata = cod[i];
      next = mdata & mask;
      let saltar136 = false, saltar155 = false;
      if (mdata < 32800) {
        i++;
      } else if (next === CODE("#")) {
        i++;
        const d = peek(i++) & mask;
        if (d === CODE("1")) {
          next = CODE("@");
          saltar136 = true;
        } else if (d === CODE("N")) mdata = 32778; else if (d === CODE("-") || d === 36870) {
          dx = this.hankaku(x, y, 0, color);
          saltar155 = true;
        } else if (d === CODE("S")) mdata = 32777; else if (d === CODE("W")) {
          if (this.maxW < x) this.maxW = x;
          dx = 0;
          if (flag1) return OVER();
          saltar155 = true;
        } else if (d === CODE("2")) {
          next = CODE("~");
          saltar136 = true;
        } else if (d === 36893 || d === 36894 || d === 36900) {
          next = d;
          saltar136 = true;
        } else if (d === CODE("R") || d === CODE("{") || d === CODE("T")) {
          continue;
        } else continue;
      } else if (next === CODE("|")) {
        i++;
        mdata = 32778;
      }
      if (!saltar136 && !saltar155) {
        if (mdata < 32800) {
          if (mdata === 32778) {
            if (!cr) {
              if (this.maxW < x) this.maxW = x;
              x = xtop;
              y += this.lSkip + 12;
              counter++;
              if (this.alto <= y + 11 || counter >= this.cH) return OVER();
            } else cr = 0;
          } else if (mdata === 32777) {
            const nw = 12 * 2;
            x = (Math.floor(x / nw) + 1) * nw;
          } else if (mdata === 32780) {
            const d = peek(i++);
            color = (d & 255) - 48 & 3;
          }
          continue;
        }
        m2 = i;
        mdata = cod[i++];
        next = mdata & mask;
      }
      if (!saltar155) {
        if (next <= 33023) {
          dx = this.hankaku(x, y, next & 255, color);
          if (next === CODE("!") || next === CODE("?")) {
            const s = peek(i) & mask;
            if (s !== CODE("!") && s !== CODE("?")) dx += s !== CODE("(") && s !== CODE(")") && (s < 36873 || s > 36878) && s !== 36885 ? 8 : 2;
          }
        } else {
          this.zenkaku(x, y, next, color);
          dx = 12;
        }
        flag1 = 1;
      }
      const nm = peek(i), nc = nm & mask, nw = this.ancho(nc);
      if (nw > 0 && x + dx + nw - 1 >= bufW) {
        if (mdata & 8192) {
          this.zenkaku(x, y, 0, color);
          i = m2;
          dx = 0;
        } else if (nm & 16384) {
          const d2 = peek(i + 1);
          if (nc === 36867 || !(d2 & 16384) || (d2 & mask) === 33059) {
            const c2 = cod[i++] & mask;
            if ((c2 & 65280) === 32768) dx += this.hankaku(x + dx, y, c2 & 255, color); else {
              this.zenkaku(x + dx, y, c2, color);
              dx += 12;
            }
          }
        }
        result = 1;
        cr = 1;
        if (x + dx > this.maxW) this.maxW = x + dx;
        x = xtop;
        y += this.lSkip + 12;
        counter++;
        if (y + 12 - 1 >= this.alto || counter >= this.cH) {
          if (i < n) return OVER();
          return 0;
        }
      } else {
        x += dx;
        cr = 0;
      }
      if (this.maxW < x) this.maxW = x;
    }
    return result;
  }
  imprimir(texto, color = 0) {
    this.limpiar();
    return this.dibujar(texto, 0, this.lSkip, color);
  }
  volcar() {
    const d = this.img.data, px = this.px;
    for (let k = 0; k < px.length; k++) {
      const v = px[k], c = v & 3 ? this.clut[v >> 2][v & 3] : null, o = k * 4;
      if (c) {
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
      } else d[o + 3] = 0;
    }
    this.cv.getContext("2d").putImageData(this.img, 0, 0);
    return this.cv;
  }
}

class Voces {
  constructor(codec) {
    this.c = codec;
    this.cache = new Map;
    this.orden = [];
  }
  ctx() {
    if (!this._ctx) {
      const dado = typeof this.c.op.audioCtx === "function" ? this.c.op.audioCtx() : this.c.op.audioCtx;
      this._ctx = dado || new (window.AudioContext || window.webkitAudioContext);
      this.salida = this._ctx.createGain();
      this.salida.gain.value = this.c.op.volumenVoz ?? 1;
      this.salida.connect(this._ctx.destination);
    }
    return this._ctx;
  }
  cargar(id) {
    if (!(id > 0) && id !== 0) return Promise.resolve(null);
    if (this.cache.has(id)) return this.cache.get(id);
    const p = cargarVoz(this.c.base + "vox/", id, this.ctx()).catch(e => {
      console.warn("voz", id, e);
      return null;
    });
    this.cache.set(id, p);
    this.orden.push(id);
    while (this.orden.length > 24) this.cache.delete(this.orden.shift());
    return p;
  }
}

export class Codec {
  constructor(op = {}) {
    this.op = op;
    this.base = op.base || "assets/codec/";
    this.guion = op.guion || new Guion({
      base: this.base
    });
    this.guion.codec = this;
    this.voces = new Voces(this);
    this.abierto = false;
    this.listo = false;
    this.freq = 14e3;
    this.estado = 0;
    this.cont = 0;
    this.accion = 0;
    this.tiempo = 0;
    this.fadeCount = 0;
    this.fadeStep = 0;
    this.señal = 0;
    this.señalDir = -1;
    this.repDir = 0;
    this.repCont = 0;
    this.cb = {
      tipo: 15,
      freq: 0
    };
    this.entrante = {
      freq: 0,
      timer: 0,
      code: 0,
      forzada: 0
    };
    this.mensaje = null;
    this.voz = null;
    this.vozAnterior = -1;
    this.pad = {
      estado: 0,
      press: 0,
      release: 0,
      latchP: 0,
      latchR: 0,
      ant: 0
    };
    this.acum = 0;
    this.timers = [];
    this.cs = this.nuevoCS();
    this.pedidos = [ {}, {} ];
    this.mem = null;
    this.guardado = null;
    this.textura = null;
    this.cv = lienzo(W, H);
    this.x = this.cv.getContext("2d");
    this.luz = lienzo(W, H);
    this.xl = this.luz.getContext("2d");
    this.tmp = lienzo(W, 8);
    this.crearDOM();
  }
  async cargar() {
    const b = this.base, hud = this.op.rutaHud || b + "../hud/";
    const [fp, fj, marco, call, num, grande] = await Promise.all([ cargarImg(b + "ui/fuente.png"), fetch(b + "ui/fuente.json").then(r => r.json()), cargarImg(b + "ui/marco.png"), cargarImg(b + "ui/call.png"), cargarImg(hud + "num.png"), cargarImg(hud + "fuente.png") ]);
    const c = lienzo(fp.width, fp.height), x = c.getContext("2d");
    x.drawImage(fp, 0, 0);
    const d = x.getImageData(0, 0, fp.width, fp.height).data, niv = new Uint8Array(fp.width * fp.height);
    for (let k = 0; k < niv.length; k++) niv[k] = d[k * 4 + 3] ? Math.round(d[k * 4] / 85) : 0;
    this.fuente = {
      ascii: fj.ascii,
      zen: fj.zen,
      zenY: fj.zen_y,
      zenPaso: fj.zen_paso,
      niv: niv,
      aw: fp.width
    };
    this.tablero = new Tablero(this.fuente);
    this.tabMem = new Tablero(this.fuente);
    this.tabMem.clut[2] = clutColor(7429);
    this.img = {
      marco: marco,
      call: call,
      num: {
        base: teñir(num, mod(BASE, 189)),
        blanco: teñir(num, mod([ 255, 255, 255 ], 189))
      },
      grande: {
        base: teñir(grande, mod(BASE, 132))
      }
    };
    this.digitos = {};
    this.listo = true;
  }
  abrir() {
    if (this.abierto || !this.listo || this.guion.radioOff || this.vozJuego) return false;
    this.pasoCerrado(true);
    return this.abierto;
  }
  llamadaEntrante(freq, code, tiempo = 0) {
    const e = this.entrante;
    e.freq = freq;
    e.code = code;
    if (tiempo === 0) {
      e.timer = 360;
      e.forzada = 0;
    } else if (tiempo >= 5) {
      e.forzada = 1;
      e.timer = 40;
    } else {
      e.timer = -tiempo;
      e.forzada = 0;
    }
    this.mostrarBoton();
  }
  resetLlamada() {
    Object.assign(this.entrante, {
      freq: 0,
      code: 0,
      timer: 0,
      forzada: 0
    });
    this.avisoVisible = false;
    this.mostrarBoton();
  }
  get sonando() {
    return this.entrante.freq > 0 && !this.abierto;
  }
  get padTrabado() {
    return this.entrante.forzada && this.entrante.freq > 0 && !this.abierto;
  }
  leerXR(fuentes) {
    let s = 0;
    for (const src of fuentes || []) {
      const g = src.gamepad;
      if (!g) continue;
      const ax = g.axes.length >= 4 ? [ g.axes[2], g.axes[3] ] : [ g.axes[0] || 0, g.axes[1] || 0 ];
      if (ax[1] < -.6) s |= P.UP;
      if (ax[1] > .6) s |= P.DOWN;
      if (ax[0] < -.6) s |= P.LEFT;
      if (ax[0] > .6) s |= P.RIGHT;
      if (g.buttons[0]?.pressed || g.buttons[4]?.pressed) s |= P.CIRCLE;
      if (g.buttons[5]?.pressed) s |= P.CROSS;
      if (g.buttons[3]?.pressed) s |= P.SELECT;
    }
    const cambio = s ^ (this.xrAnt || 0);
    if (cambio) for (let k = 1; k <= 512; k <<= 1) if (cambio & k) this.tecla(k, !!(s & k));
    this.xrAnt = s;
  }
  update(dt) {
    if (!this.listo) return;
    if (this.btn) {
      const v = !this.abierto && (this.op.puedeAbrir?.() ?? true);
      if (this.btn.hidden === v) this.btn.hidden = !v;
    }
    if (this.congelado) {
      const v = this.voz;
      if (v) {
        if (v.mudo) v.t0w += Math.min(dt, .25);
        v.wallAnt = performance.now();
      }
      this.presentar();
      return;
    }
    this.leerGamepad();
    this.acum += Math.min(dt, .25) * FPS;
    let n = 0;
    while (this.acum >= 1 && n++ < 8 && !this.congelado) {
      this.acum -= 1;
      this.paso();
      this.op.alPaso?.(this);
    }
    if (this.acum > 2) this.acum = 2;
    if (n) this.presentar();
  }
  boton(nombre, abajo) {
    const b = {
      arriba: P.UP,
      abajo: P.DOWN,
      izq: P.LEFT,
      der: P.RIGHT,
      circulo: P.CIRCLE,
      cruz: P.CROSS,
      triangulo: P.TRIANGLE,
      cuadrado: P.SQUARE,
      select: P.SELECT
    }[nombre];
    if (b) this.tecla(b, abajo);
  }
  get canvas() {
    return this.cv;
  }
  usarTextura(tex) {
    this.textura = tex;
    return tex;
  }
  panelVR(THREE, ancho = .9) {
    const tex = this.usarTextura(new THREE.CanvasTexture(this.cv));
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * H / W), new THREE.MeshBasicMaterial({
      map: tex,
      toneMapped: false
    }));
    m.name = "codec";
    m.visible = false;
    this.malla = m;
    return m;
  }
  async reproducirVoz(id, {retraso: retraso = 0, subtitulos: subtitulos = true} = {}) {
    const r = await this.voces.cargar(id);
    if (!r) return false;
    const ctx = this.voces.ctx();
    if (ctx.state !== "running") try {
      await ctx.resume();
    } catch {}
    return new Promise(ok => {
      const s = ctx.createBufferSource();
      s.buffer = r.buffer;
      s.connect(this.voces.salida);
      s.onended = () => {
        if (this.vozJuego === s) this.vozJuego = null;
        ok(true);
      };
      this.vozJuego = s;
      s.start(ctx.currentTime + retraso, r.offset);
      if (subtitulos && r.datos?.sub?.length) this.subtitularVozJuego(s, r.datos.sub, ctx.currentTime + retraso);
    });
  }
  subtitularVozJuego(s, S, t0) {
    if (typeof document === "undefined") return;
    let el = this.subVozEl;
    if (!el) {
      el = this.subVozEl = document.createElement("div");
      el.className = "codec-voz-sub";
      el.style.cssText = "position:fixed;left:6%;right:6%;bottom:calc(7% + env(safe-area-inset-bottom));z-index:8;pointer-events:none;text-align:center;" + 'color:#e8e8e8;font-family:"Trebuchet MS",Verdana,Arial,sans-serif;font-size:clamp(13px,2.4vmin + 4px,26px);text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;' + "white-space:pre-line;line-height:1.25;display:none;text-transform:none;letter-spacing:normal;";
      (document.getElementById("hud")?.parentNode || document.body).appendChild(el);
    }
    const ctx = this.voces.ctx(), w0 = performance.now() / 1e3;
    let cAnt = ctx.currentTime, wAnt = w0, mudo = false, dw = 0;
    const texto = () => {
      const c = ctx.currentTime, w = performance.now() / 1e3;
      if (c !== cAnt) {
        cAnt = c;
        wAnt = w;
      } else if (!mudo && w - wAnt > .6) {
        mudo = true;
        dw = c - t0 - wAnt;
      }
      const t = mudo ? w + dw : c - t0;
      const l = S.find(x => t >= x[0] && t < x[1]);
      return l ? l[2] : "";
    };
    this._subVoz = {
      s: s,
      texto: texto
    };
    const paso = () => {
      if (this.vozJuego !== s) {
        el.style.display = "none";
        return;
      }
      const txt = texto();
      if (el.textContent !== txt) el.textContent = txt;
      el.style.display = txt ? "block" : "none";
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  textoVozJuego() {
    const v = this._subVoz;
    if (!v || !this.vozJuego || this.vozJuego !== v.s) return "";
    try {
      return v.texto();
    } catch {
      return "";
    }
  }
  pararVozJuego() {
    try {
      this.vozJuego?.stop();
    } catch {}
    this.vozJuego = null;
    if (this.subVozEl) this.subVozEl.style.display = "none";
  }
  estadoVoz() {
    return this.voz ? this.voz.estado : this.vozJuego ? 2 : -1;
  }
  static partidas() {
    const r = [];
    for (let i = 0; i < 3; i++) {
      try {
        r.push(JSON.parse(localStorage.getItem("mgs_codec_save_" + i) || "null"));
      } catch {
        r.push(null);
      }
    }
    return r;
  }
  tecla(b, abajo) {
    const p = this.pad;
    if (abajo) {
      if (!(p.estado & b)) p.latchP |= b;
      p.estado |= b;
    } else {
      if (p.estado & b) p.latchR |= b;
      p.estado &= ~b;
    }
  }
  leerPad() {
    const p = this.pad;
    p.press = p.latchP;
    p.release = p.latchR;
    p.latchP = 0;
    p.latchR = 0;
    return {
      press: p.press,
      release: p.release,
      status: p.estado | p.press
    };
  }
  leerGamepad() {
    const gps = navigator.getGamepads?.();
    if (!gps) return;
    let s = 0;
    for (const g of gps) {
      if (!g || !g.connected) continue;
      const b = i => g.buttons[i]?.pressed;
      if (b(12) || g.axes[1] < -.6) s |= P.UP;
      if (b(13) || g.axes[1] > .6) s |= P.DOWN;
      if (b(14) || g.axes[0] < -.6) s |= P.LEFT;
      if (b(15) || g.axes[0] > .6) s |= P.RIGHT;
      if (b(B.CIRCULO)) s |= P.CIRCLE;
      if (b(B.CRUZ)) s |= P.CROSS;
      if (b(B.CUADRADO)) s |= P.SQUARE;
      if (b(B.TRIANGULO)) s |= P.TRIANGLE;
      if (b(B.SELECT)) s |= P.SELECT;
      if (b(B.START)) s |= P.START;
    }
    const cambio = s ^ (this.gpAnt || 0);
    if (cambio) for (let k = 1; k <= 512; k <<= 1) if (cambio & k) this.tecla(k, !!(s & k));
    this.gpAnt = s;
  }
  crearDOM() {
    if (typeof document === "undefined") return;
    const raiz = this.raiz = document.createElement("div");
    raiz.className = "codec-capa";
    raiz.hidden = true;
    const css = document.createElement("style");
    css.textContent = `\n.codec-capa{position:fixed;inset:0;z-index:40;background:#000;display:flex;align-items:center;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none}\n.codec-capa[hidden]{display:none}\n.codec-capa canvas{image-rendering:pixelated;image-rendering:crisp-edges;display:block}\n.codec-mandos{position:absolute;display:none;gap:8px;pointer-events:auto;font:14px 'MGS8','MGS',monospace}\n.codec-capa.tactil .codec-mandos{display:grid}\n.codec-mandos button{background:rgba(19,31,26,.85);color:#9fe0c4;border:1px solid #2e473d;border-radius:6px;min-width:52px;min-height:46px;font:inherit;touch-action:none}\n.codec-mandos button:active,.codec-mandos button.on{background:#2e473d;color:#e8fff4}\n.codec-boton{position:fixed;left:calc(16px + env(safe-area-inset-left));top:calc(84px + env(safe-area-inset-top));z-index:6;padding:6px 10px;background:rgba(0,0,0,.55);color:#9fe0c4;border:1px solid #2e473d;font:12px 'MGS8','MGS',monospace;letter-spacing:1px;touch-action:none}\n.codec-boton.llama{animation:codecLlama .66s steps(2) infinite;border-color:#e0f0e8}\n@keyframes codecLlama{50%{background:#2e473d;color:#fff}}\n.codec-aviso{position:fixed;inset:0;z-index:7;pointer-events:none;image-rendering:pixelated}`;
    document.head.appendChild(css);
    this.cvDom = lienzo(W, H);
    raiz.appendChild(this.cvDom);
    this.xd = this.cvDom.getContext("2d");
    const m = this.mandos = document.createElement("div");
    m.className = "codec-mandos";
    const def = [ [ "izq", "◀", P.LEFT ], [ "arriba", "▲", P.UP ], [ "der", "▶", P.RIGHT ], [ "abajo", "▼", P.DOWN ], [ "circulo", "CALL ○", P.CIRCLE ], [ "cruz", "×", P.CROSS ], [ "select", "EXIT", P.SELECT ] ];
    for (const [k, t, bit] of def) {
      const bt = document.createElement("button");
      bt.textContent = t;
      bt.dataset.k = k;
      bt.style.gridArea = k;
      bt.addEventListener("pointerdown", e => {
        e.preventDefault();
        bt.setPointerCapture?.(e.pointerId);
        bt.classList.add("on");
        this.tecla(bit, true);
      });
      for (const ev of [ "pointerup", "pointercancel", "lostpointercapture" ]) bt.addEventListener(ev, () => {
        if (bt.classList.contains("on")) {
          bt.classList.remove("on");
          this.tecla(bit, false);
        }
      });
      m.appendChild(bt);
    }
    raiz.appendChild(m);
    this.cvDom.addEventListener("pointerdown", e => {
      const r = this.cvDom.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      let bit = P.CIRCLE;
      if (this.estado === 1) {
        if (y > 60 && y < 95 && x > 80 && x < 120) bit = P.LEFT; else if (y > 60 && y < 95 && x > 200 && x < 240) bit = P.RIGHT; else if (y > 100 && y < 125 && x > 120 && x < 200) bit = P.DOWN;
      }
      this.toque = bit;
      this.tecla(bit, true);
    });
    for (const ev of [ "pointerup", "pointercancel", "pointerleave" ]) this.cvDom.addEventListener(ev, () => {
      if (this.toque) {
        this.tecla(this.toque, false);
        this.toque = 0;
      }
    });
    (this.op.contenedor || document.body).appendChild(raiz);
    const mapa = {
      ArrowUp: P.UP,
      KeyW: P.UP,
      ArrowDown: P.DOWN,
      KeyS: P.DOWN,
      ArrowLeft: P.LEFT,
      KeyA: P.LEFT,
      ArrowRight: P.RIGHT,
      KeyD: P.RIGHT,
      Enter: P.CIRCLE,
      Space: P.CIRCLE,
      KeyE: P.CIRCLE,
      Escape: P.CROSS,
      KeyX: P.CROSS,
      KeyQ: P.CROSS,
      Backspace: P.SELECT,
      KeyT: P.SELECT,
      Tab: P.SELECT,
      KeyZ: P.TRIANGLE,
      KeyC: P.SQUARE
    };
    this.mapaTeclas = mapa;
    addEventListener("keydown", e => {
      if (!this.abierto) return;
      const b = mapa[e.code];
      if (b) {
        e.preventDefault();
        if (!e.repeat) this.tecla(b, true);
      }
      e.stopImmediatePropagation();
    }, true);
    addEventListener("keyup", e => {
      const b = mapa[e.code];
      if (b) this.tecla(b, false);
      if (this.abierto) {
        if (b) e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    addEventListener("resize", () => this.acomodar());
    this.cvAviso = lienzo(W, H);
    this.cvAviso.className = "codec-aviso";
    this.xa = this.cvAviso.getContext("2d");
    this.cvAviso.style.display = "none";
    document.body.appendChild(this.cvAviso);
    if (this.op.botonTactil) {
      const b = this.btn = document.createElement("button");
      b.className = "codec-boton";
      b.textContent = "CODEC";
      b.addEventListener("pointerdown", e => {
        e.preventDefault();
        this.abrir();
      });
      document.body.appendChild(b);
    }
    this.acomodar();
  }
  mostrarBoton() {
    if (this.btn) this.btn.classList.toggle("llama", this.entrante.freq > 0);
  }
  acomodar() {
    if (!this.raiz) return;
    const vw = innerWidth, vh = innerHeight, tactil = matchMedia?.("(pointer:coarse)").matches || this.op.tactil;
    this.raiz.classList.toggle("tactil", !!tactil);
    const vertical = vh > vw;
    let aw = vw, ah = vh;
    if (tactil && vertical) ah = vh * .62;
    if (tactil && !vertical) aw = vw - 2 * Math.min(200, vw * .24);
    let s = Math.min(aw / W, ah / H);
    const si = Math.floor(s);
    if (si >= 2 && si / s > .82) s = si;
    this.cvDom.style.width = Math.round(W * s) + "px";
    this.cvDom.style.height = Math.round(H * s) + "px";
    this.raiz.style.alignItems = tactil && vertical ? "flex-start" : "center";
    this.cvDom.style.marginTop = tactil && vertical ? `calc(${Math.max(8, (ah - H * s) / 2)}px + env(safe-area-inset-top))` : "0";
    const m = this.mandos.style;
    if (tactil && vertical) {
      Object.assign(m, {
        left: "50%",
        right: "auto",
        top: "auto",
        bottom: "calc(24px + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        gridTemplateAreas: '". arriba . circulo" "izq abajo der circulo" "select . . cruz"',
        gridTemplateColumns: "repeat(4, 68px)"
      });
    } else {
      Object.assign(m, {
        left: "0",
        right: "0",
        top: "auto",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        transform: "none",
        gridTemplateAreas: '". arriba . . . . . circulo" "izq abajo der . . . cruz circulo" "select . . . . . . ."',
        gridTemplateColumns: "52px 52px 52px 1fr 1fr 1fr 52px 64px",
        padding: "0 calc(12px + env(safe-area-inset-right)) 0 calc(12px + env(safe-area-inset-left))"
      });
    }
    this.escAviso = Math.max(1, Math.min(vw / 320, vh / 240)) * (tactil ? 1.25 : 1);
  }
  paso() {
    this.tiempo++;
    for (let i = this.timers.length - 1; i >= 0; i--) if (--this.timers[i].n <= 0) {
      const t = this.timers.splice(i, 1)[0];
      t.ok();
    }
    const pad = this.leerPad();
    if (!this.abierto) {
      this.pasoCerrado(false, pad);
      this.dibujarAviso();
      return;
    }
    this.actualizarVoz();
    if (this.estado === 20 && this.estadoVoz() !== 0) {
      this.cerrarDelTodo();
      return;
    }
    this.estadoCodec(pad);
    this.dibujar(pad);
  }
  cuadros(n) {
    return new Promise(ok => this.timers.push({
      n: n,
      ok: ok
    }));
  }
  pasoCerrado(forzarSelect, pad = null) {
    const e = this.entrante;
    if (this.guion.radioOff || this.vozJuego) return;
    if (this.op.puedeAbrir && !this.op.puedeAbrir()) {
      this.avisoVisible = false;
      return;
    }
    const select = forzarSelect || pad && pad.press & P.SELECT;
    if (e.freq > 0 && e.timer < 0 || select) {
      this.cb.tipo = 15;
      this.abierto = true;
      this.estado = 0;
      this.cont = 8;
      this.repCont = 0;
      this.repDir = 0;
      this.cs = this.nuevoCS();
      this.mensaje = null;
      this.fadeStep = -32;
      this.fadeCount = 255;
      if (e.freq > 0) {
        this.freq = e.freq;
        if (e.timer === -2 || e.timer === -4) {
          this.fadeStep = 0;
          this.fadeCount = 0;
          this.estado = 1;
        }
      }
      if (e.forzada) e.timer = -1;
      this.vozAnterior = -1;
      this.op.musica?.(33554208);
      this.cvAviso.style.display = "none";
      this.raiz.hidden = false;
      if (this.malla) this.malla.visible = true;
      this.acomodar();
      this.op.alAbrir?.();
      return;
    }
    if (e.freq > 0 && e.timer > 0) {
      if (--e.timer === 0) {
        if (e.forzada) {
          e.timer = -1;
          return;
        }
        e.freq = 0;
        this.mostrarBoton();
        return;
      }
      if (e.forzada || e.timer > 80) {
        const t = (399 - e.timer) % 40;
        this.avisoVisible = t < 26 && t % 13 < 8;
        if (t === 0 && (e.timer > 240 || e.forzada)) this.op.se?.(SE.CALL);
      } else this.avisoVisible = false;
    } else this.avisoVisible = false;
  }
  dibujarAviso() {
    const c = this.cvAviso, vis = this.avisoVisible && this.entrante.freq > 0;
    if (!vis) {
      if (c.style.display !== "none") c.style.display = "none";
      return;
    }
    const s = this.escAviso || 1, vw = innerWidth;
    c.style.display = "block";
    c.style.width = W * s + "px";
    c.style.height = H * s + "px";
    c.style.left = (vw - W * s) / 2 + "px";
    c.style.top = "0";
    c.style.inset = "auto";
    c.style.position = "fixed";
    const x = this.xa;
    x.clearRect(0, 0, W, H);
    x.imageSmoothingEnabled = false;
    x.globalCompositeOperation = "lighter";
    x.drawImage(this.img.call, 130, 49);
    x.globalCompositeOperation = "source-over";
    this.textoChico(x, 160, 63, "PUSH SELECT", "blanco", 2);
  }
  cerrarDelTodo() {
    this.abierto = false;
    this.estado = 0;
    this.raiz.hidden = true;
    if (this.malla) this.malla.visible = false;
    this.tareaId = (this.tareaId || 0) + 1;
    this._desp = null;
    this._pend = false;
    this.entrante.freq = 0;
    this.mostrarBoton();
    this.pararVoz();
    const info = {
      tipo: this.cb.tipo,
      freq: this.cb.freq
    };
    this.guion.alCerrarCodec(info.tipo, info.freq);
    this.op.alCerrar?.(info);
  }
  nuevoCS() {
    const lado = () => ({
      anim: 0,
      chara: 0,
      abre: 0,
      vel: 0,
      cuadro: 0,
      fundido: 0,
      fundidoTot: 0,
      ojos: 0,
      boca: 0,
      cara: null,
      img: lienzo(52, 89),
      vieja: lienzo(52, 89)
    });
    return {
      estado: 0,
      texto: null,
      subtitulos: null,
      enBloque: 0,
      flags: 0,
      indice: 0,
      llamada: null,
      listas: 0,
      lados: [ lado(), lado() ],
      opciones: null,
      sinVoz: 0
    };
  }
  estadoCodec(pad) {
    if (this.fadeStep !== 0) {
      this.fadeCount += this.fadeStep;
      if (this.fadeCount >= 255) {
        this.fadeCount = 255;
        this.fadeStep = 0;
      } else if (this.fadeCount <= 0) {
        this.fadeCount = 0;
        this.fadeStep = 0;
      }
    }
    const cs = this.cs, e = this.entrante;
    switch (this.estado) {
     case 0:
      if (this.fadeStep === 0) this.estado = 1;
      break;

     case 1:
      if (e.freq > 0) {
        this.cb.tipo = e.timer < 0 ? ~e.timer << 4 | 2 : 1;
        this.cb.freq = e.freq;
        this.freq = e.freq;
        this.iniciarLlamada(e.freq, e.code);
        this.estado = 2;
        e.freq = 0;
        this.mostrarBoton();
      } else {
        this.accion = 0;
        if (pad.press & (P.SELECT | P.CROSS)) {
          this.cont = 0;
          this.estado = 18;
        } else if (pad.press & P.DOWN) {
          this.accion = ACC.MEMORY;
          this.abrirMemoria();
          this.estado = 10;
          this.op.se?.(SE.SELECT);
        } else if (pad.press & (P.UP | P.CIRCLE)) {
          this.accion = ACC.PTT;
          this.llamar();
        } else if (pad.status & (P.LEFT | P.RIGHT)) {
          const dir = pad.status & P.LEFT ? -1 : 1;
          this.accion = dir < 0 ? ACC.LEFT : ACC.RIGHT;
          if (this.repDir === dir) {
            if (this.repCont < 10) this.repCont++; else {
              this.freq += dir;
              this.op.se?.(SE.TUNING);
              this.repCont++;
            }
          } else {
            this.repCont = 0;
            this.repDir = dir;
            this.freq += dir;
            this.op.se?.(SE.TUNING);
          }
          if (this.freq >= 14200) this.freq = 14e3; else if (this.freq < 14e3) this.freq = 14199;
        } else {
          this.repDir = 0;
          this.repCont = 0;
        }
      }
      break;

     case 10:
      {
        const r = this.pasoMemoria(pad);
        if (pad.press & P.SELECT) {
          this.cont = 0;
          this.estado = 18;
          this.mem = null;
        } else if (r !== 0) {
          this.mem = null;
          if (r >= 0) {
            this.freq = r;
            this.llamar();
          } else this.estado = 1;
        }
        break;
      }

     case 2:
      this.cont--;
      if (this.cont <= 0 && this.cargaLista()) {
        this.señal = 0;
        this.estado = 3;
        this.arrancarTarea();
        this.cont = 16;
        if (!(this.cb.tipo & 16)) this.op.se?.(SE.STATIC);
      }
      break;

     case 3:
      if (cs.estado === 5) break;
      if (this.cont > 0) {
        if (this.cont === 8) {
          if (this.cb.tipo & 16) {
            this.abrirCaras(10);
            this.fadeStep = -32;
          } else this.abrirCaras(1);
        }
        this.cont--;
        this.señal = (16 - this.cont) / 2 | 0;
        break;
      }
      switch (cs.estado) {
       case 1:
        if (!cs.enBloque) {
          this.imprimir(cs.texto);
          this.estado = 4;
          this.cont = pad.status;
        } else {
          this.estado = 5;
          cs.subtitulos = null;
          this.cont = 0;
        }
        break;

       case 2:
        this.guion.memoria.marcar(this.freq);
        this.estado = 6;
        break;

       case 3:
        this.iniciarGuardado();
        this.estado = 11;
        this.fadeStep = 32;
        break;

       case 4:
        this.estado = 16;
        break;
      }
      break;

     case 4:
      if (pad.release & (UDLR | ABXY) && this.cont === 0) {
        this.despertarTarea(true);
        this.limpiarMensaje();
        this.estado = 3;
      }
      this.cont = pad.status & this.cont ? pad.status : 0;
      break;

     case 5:
      {
        if (!(this.tiempo & 3)) {
          if (Math.random() * 4 < 1) {
            if (this.señal < 7) this.señalDir = 1;
          } else if (this.señal >= 7) this.señalDir = -1;
          if (Math.random() < 1 / 8) this.señalDir = -this.señalDir;
          this.señal += this.señalDir;
          if (this.señal >= 10) this.señal = 9; else if (this.señal < 6) this.señal = 6;
        }
        if (!cs.enBloque) {
          this.estado = 3;
          break;
        }
        const falta = this.voz && this.voz.falta;
        if (!(cs.flags & 1) && pad.release & P.CROSS || falta) {
          this.imprimir(cs.texto);
          this.señal = 8;
          cs.enBloque = 0;
          if (!falta) {
            cs.flags |= 256;
            this.pararVoz();
          }
          this.estado = cs.estado === 1 ? 4 : 3;
        } else {
          if (cs.estado === 2) this.estado = 6; else if (cs.estado === 1) {
            const sub = this.subActual();
            if (cs.subtitulos !== sub) {
              if (sub === null) {
                this.limpiarMensaje();
                this.despertarTarea(true);
              } else this.imprimir(cs.texto);
              cs.subtitulos = sub;
              cs.sinVoz = 0;
            } else if (sub === null && this.estadoVoz() === -1 && ++cs.sinVoz > 30) {
              cs.sinVoz = 0;
              this.limpiarMensaje();
              this.despertarTarea(true);
            }
          }
        }
        break;
      }

     case 9:
      if (this.cont > 0) {
        if (--this.cont === 0) this.imprimir("NO RESPONSE");
      } else if (pad.press & (UDLR | ABXY)) this.estado = 7;
      break;

     case 6:
      if (!(this.cb.tipo & 32)) this.cerrarCaras(true);
      this.estado = 7;

     case 7:
      this.señal = 0;
      if (this.cb.tipo & 32) {
        this.limpiarMensaje();
        this.fadeStep = 16;
        this.cont = 0;
        this.estado = 19;
      } else if (cs.llamada) {
        if (this.carasCerradas()) {
          cs.llamada = null;
          this.cs = this.nuevoCS();
        }
      } else {
        this.limpiarMensaje();
        if ((this.cb.tipo & 15) === 2) {
          this.cont = 0;
          this.estado = 18;
        } else this.estado = 1;
      }
      break;

     case 18:
      this.op.musica?.(33554209);
      this.fadeStep = 16;
      this.cont = 0;
      this.estado = 19;
      break;

     case 19:
      if (this.fadeStep === 0) {
        if (this.cont === 0 && this.cb.tipo & 32) this.cs = this.nuevoCS();
        if (++this.cont >= 3) this.estado = 20;
      }
      break;

     case 11:
      if (this.fadeCount >= 255) {
        this.fadeCount = 0;
        this.fadeStep = 0;
        this.estado = 12;
      }
      break;

     case 12:
      if (this.pasoGuardado(pad)) {
        this.estado = 13;
        this.fadeCount = 255;
        this.fadeStep = -32;
      }
      break;

     case 13:
      if (this.fadeCount <= 0 && pad.status === 0) {
        this.estado = 3;
        this.despertarTarea(true);
      }
      break;

     case 16:
      if (this.pasoPregunta(pad)) {
        this.estado = 3;
        this.despertarTarea(true);
      }
      break;
    }
  }
  llamar() {
    this.cont = 30;
    this.op.se?.(SE.SEND);
    const code = this.guion.codigoDe(this.freq);
    if (code >= 0) {
      this.iniciarLlamada(this.freq, code);
      this.estado = 2;
      this.cb.tipo = 0;
      this.cb.freq = this.freq;
      return;
    }
    this.op.sinRespuesta?.(this.freq);
    this.estado = 9;
  }
  iniciarLlamada(freq, code) {
    const cs = this.cs = this.nuevoCS();
    cs.llamada = {
      cargando: true,
      freq: freq,
      code: code
    };
    this.pedidos = [ {}, {} ];
    const off = code & 16777215;
    cs.llamada.promesa = (async () => {
      try {
        const r = await fetch(`${this.base}llamadas/${off}.json`);
        if (!r.ok) throw new Error("llamada " + off + ": " + r.status);
        const d = await r.json();
        const caras = new Set, voces = [];
        const rec = evs => {
          for (const ev of evs || []) {
            if ((ev.tipo === "hablar" || ev.tipo === "cara") && ev.cara) caras.add(hex4(ev.cara));
            if (ev.tipo === "voz" && ev.vox > 0) voces.push(ev.vox);
            rec(ev.eventos);
            for (const x of ev.ramas || []) rec(x.eventos);
            for (const x of ev.casos || []) rec(x.eventos);
          }
        };
        rec(d.eventos);
        d.vocesOrden = voces;
        d.imgs = {};
        await Promise.all([ ...caras ].map(k => this.cargarCara(d, k)));
        voces.slice(0, 2).forEach(v => this.voces.cargar(v));
        d.glifosBytes = (d.glifos || []).map(h => {
          const a = new Uint8Array(36);
          for (let i = 0; i < 36; i++) a[i] = parseInt(h.substr(i * 2, 2), 16);
          return a;
        });
        cs.llamada.datos = d;
      } catch (e) {
        console.error("códec:", e);
        cs.llamada.error = e;
      }
      cs.llamada.cargando = false;
    })();
  }
  async cargarCara(d, k) {
    const def = d.caras?.[k];
    if (!def) return;
    const b = `${this.base}caras/${def.carpeta}/`;
    const im = d.imgs[k] = {};
    if (def.tipo === "simple") {
      const tareas = [ cargarImg(b + "base.png").then(i => im.base = i) ];
      (def.ojos || []).forEach((o, n) => o && tareas.push(cargarImg(b + `ojos_${n}.png`).then(i => (im.ojos ||= [])[n] = i)));
      (def.boca || []).forEach((o, n) => o && tareas.push(cargarImg(b + `boca_${n}.png`).then(i => (im.boca ||= [])[n] = i)));
      await Promise.all(tareas);
    } else if (def.tipo === "completa") {
      im.cuadros = await Promise.all(def.cuadros.map(q => q.img ? cargarImg(b + q.img) : null));
    }
  }
  cargaLista() {
    const l = this.cs.llamada;
    return l && !l.cargando;
  }
  dormir() {
    if (this._pend) {
      this._pend = false;
      return Promise.resolve();
    }
    return new Promise(ok => {
      this._desp = ok;
    });
  }
  despertarTarea(resetEstado) {
    if (!this.cs.tareaViva) return;
    if (resetEstado) this.cs.estado = 0;
    const f = this._desp;
    this._desp = null;
    if (f) f(); else this._pend = true;
  }
  arrancarTarea() {
    const cs = this.cs, l = cs.llamada;
    this._desp = null;
    this._pend = false;
    if (!l || !l.datos) {
      cs.estado = 2;
      return;
    }
    cs.estado = 5;
    cs.tareaViva = true;
    const id = this.tareaId = (this.tareaId || 0) + 1;
    this.tablero.zen1 = l.datos.glifosBytes;
    (async () => {
      cs.enBloque = 0;
      cs.flags = (l.datos.flags || 0) & ~1;
      cs.estado = 0;
      try {
        await this.ejecutarBloque(l.datos.eventos, id);
      } catch (e) {
        console.error("códec: guion", e);
      }
      if (this.tareaId !== id) return;
      cs.estado = 2;
      cs.tareaViva = false;
    })();
  }
  async ejecutarBloque(evs, id) {
    for (const ev of evs || []) {
      if (this.tareaId !== id || !this.abierto) return;
      await this.comando(ev, id);
    }
  }
  valor(v) {
    return valorGCL(this.guion.vars, v, []);
  }
  async comando(ev, id) {
    const cs = this.cs;
    switch (ev.tipo) {
     case "hablar":
      {
        const lado = ev.personaje === SNAKE ? 1 : 0;
        cs.texto = ev.t ?? ev.texto;
        if (ev.frames >= 1) {
          this.pedirCara(lado, ev.personaje, ev.cara, ev.frames, true);
          await this.dormir();
        } else this.pedirCara(lado, ev.personaje, ev.cara, ev.frames, false);
        cs.estado = 1;
        await this.dormir();
        break;
      }

     case "cara":
      {
        this.pedirCara(ev.personaje === SNAKE ? 1 : 0, ev.personaje, ev.cara, ev.frames, !!ev.espera);
        if (ev.espera) await this.dormir();
        break;
      }

     case "voz":
      {
        if (!(cs.flags & 256)) {
          this.iniciarVoz(ev.vox);
          cs.enBloque = 1;
          await this.ejecutarBloque(ev.eventos, id);
          cs.enBloque = 0;
          while (this.estadoVoz() !== -1 && this.tareaId === id && this.abierto) await this.cuadros(2);
        } else await this.ejecutarBloque(ev.eventos, id);
        break;
      }

     case "contacto":
      this.guion.memoria.poner(ev.freq, ev.nombre);
      break;

     case "guardar":
      cs.estado = 3;
      cs.guardar = {
        area: this.valor(ev.area),
        nombres: ev.nombres || []
      };
      await this.dormir();
      cs.flags &= ~256;
      break;

     case "sonido":
      if (ev.sub === "se") {
        const c = ev.codigo >>> 0;
        if (c >>> 24 === 1) this.op.musica?.(c); else if (c < 256) this.op.se?.(c); else this.op.sonido?.(c);
      } else if (ev.sub === "vibracion") {
        if (ev.fuerza > 0) this.op.vibrar?.(ev.frames * 33);
        await this.cuadros(Math.ceil(Math.max(0, ev.frames) / 2));
      }
      break;

     case "pregunta":
      cs.estado = 4;
      cs.opciones = ev.opciones || [];
      cs.indice = 0;
      this.preguntaDibujada = -1;
      await this.dormir();
      break;

     case "varsave":
      break;

     case "if":
      for (const r of ev.ramas || []) if (r.cond === null || r.cond === undefined || this.valor(r.cond)) {
        await this.ejecutarBloque(r.eventos, id);
        break;
      }
      break;

     case "switch":
      {
        const v = this.valor(ev.valor);
        const c = (ev.casos || []).find(x => x.caso === v) || (ev.casos || []).find(x => x.caso === null);
        if (c) await this.ejecutarBloque(c.eventos, id);
        break;
      }

     case "randswitch":
      {
        let v = Math.floor(Math.random() * 32768) % (ev.total || 1);
        for (const c of ev.casos || []) {
          v -= c.peso;
          if (v < 1) {
            await this.ejecutarBloque(c.eventos, id);
            break;
          }
        }
        break;
      }

     case "eval":
      this.valor(ev.expr);
      break;
    }
  }
  pedirCara(lado, chara, code, frames, despertar) {
    this.pedidos[lado] = {
      activo: true,
      chara: chara,
      code: code,
      frames: frames,
      despertar: despertar
    };
  }
  aplicarPedido(i) {
    const p = this.pedidos[i];
    if (!p.activo) return;
    const s = this.cs.lados[i], d = this.cs.llamada?.datos;
    if (!p.code) {
      s.anim = 3;
      s.cara = null;
      s.chara = p.chara;
    } else {
      const k = hex4(p.code), def = d?.caras?.[k], im = d?.imgs?.[k];
      if (!def || !im) console.warn("NO_FACE_DATA", k); else {
        s.chara = p.chara;
        if (def.tipo === "simple") {
          if (p.frames >= 0) this.copiar(s.img, s.vieja);
          s.cara = {
            def: def,
            im: im
          };
          s.anim = 1;
          s.fundido = s.fundidoTot = p.frames;
          s.boca = 0;
          s.ojos = 0;
          this.componer(s);
        } else if (def.tipo === "completa") {
          s.cara = {
            def: def,
            im: im
          };
          s.cuadro = 0;
          s.boca = 0;
          this.animCompleta(s, 0);
          s.anim = 2;
        }
      }
    }
    if (!p.code && p.despertar) {
      this.despertarTarea(false);
      p.despertar = false;
    }
    p.activo = false;
  }
  copiar(de, a) {
    const x = a.getContext("2d");
    x.clearRect(0, 0, 52, 89);
    x.drawImage(de, 0, 0);
  }
  componer(s, boca = 0, ojo = null) {
    const x = s.img.getContext("2d"), {def: def, im: im} = s.cara;
    x.clearRect(0, 0, 52, 89);
    if (im.base) x.drawImage(im.base, 0, 0);
    const parche = (g, img) => {
      if (!g || !img) return;
      x.clearRect(g[0], g[1], g[2], g[3]);
      x.drawImage(img, g[0], g[1]);
    };
    if (boca > 0) parche(def.boca?.[boca - 1], im.boca?.[boca - 1]);
    if (ojo !== null) parche(def.ojos?.[ojo], im.ojos?.[ojo]);
  }
  animCompleta(s, n) {
    const {def: def, im: im} = s.cara, cs = def.cuadros;
    for (;;) {
      if (n >= cs.length) return 0;
      const q = cs[n];
      if (!q.img) {
        if (q.comando === "sonido_se") {
          this.op.se?.(q.arg);
          n++;
        } else if (q.comando === "repetir") {
          if (s.boca === 0) s.boca = q.arg;
          if (s.boca < 255) {
            if (s.boca === 1) return 0;
            s.boca--;
          }
          n = 0;
        } else n++;
      } else {
        if (q.fundido > 0) this.copiar(s.img, s.vieja);
        const x = s.img.getContext("2d");
        x.clearRect(0, 0, 52, 89);
        if (im.cuadros[n]) x.drawImage(im.cuadros[n], 0, 0);
        s.ojos = q.espera;
        s.cuadro = n;
        s.fundido = s.fundidoTot = q.fundido;
        return 1;
      }
    }
  }
  abrirCaras(vel) {
    this.cs.listas = 1;
    for (const s of this.cs.lados) s.vel = vel;
  }
  cerrarCaras(anim) {
    for (const s of this.cs.lados) if (s.anim !== 0) {
      s.anim = 4;
      if (anim) {
        s.vel = -1;
        this.op.se?.(SE.DISCONNECT);
      } else s.abre = 0;
    }
  }
  carasCerradas() {
    for (const s of this.cs.lados) {
      if (s.abre) return false;
      s.anim = 0;
    }
    return true;
  }
  paku(chara) {
    const v = this.voz;
    if (!v || !v.paku) return 0;
    const q = v.paku.get(chara);
    if (!q) return 0;
    const e = q.ojo;
    q.ojo = 0;
    return e << 8 | q.boca;
  }
  logicaCara(s, i) {
    const p = this.pedidos[i];
    switch (s.anim) {
     case 1:
      if (s.fundido > 0) s.fundido--; else {
        if (p.despertar) {
          this.despertarTarea(false);
          p.despertar = false;
        }
        const r = this.paku(s.chara);
        if (s.ojos === 0 && r >> 8) s.ojos = 1;
        s.boca = r & 255;
        let ojo = null;
        if (s.ojos > 0) {
          ojo = (s.ojos + 1 >> 1) - 1;
          if (++s.ojos > 6) s.ojos = 0;
        }
        this.componer(s, s.boca, ojo);
      }
      break;

     case 2:
      if (s.fundido > 0) s.fundido--; else if (s.ojos < 1) {
        if (!this.animCompleta(s, s.cuadro + 1)) {
          s.ojos = 28672;
          if (p.despertar) {
            this.despertarTarea(false);
            p.despertar = false;
          }
        }
      } else s.ojos--;
      break;

     case 3:
      this.ruido(s);
      break;
    }
  }
  ruido(s) {
    if (!this._pal) {
      this._pal = [];
      for (let i = 0; i < 6; i++) {
        const t = i * 4 + 2, g = (t * 48 & 992) >> 5, c = v => v << 3 | v >> 2;
        this._pal.push([ c(t), c(g), c(t) ]);
      }
      this._ruido = s.img.getContext("2d").createImageData(52, 89);
    }
    const d = this._ruido.data;
    const acum = [ .431, .509, .691, .795, .938, 1 ];
    for (let k = 0; k < 52 * 89; k++) {
      const r = Math.random();
      let i = 0;
      while (r > acum[i]) i++;
      const c = this._pal[i], o = k * 4;
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = 255;
    }
    s.img.getContext("2d").putImageData(this._ruido, 0, 0);
  }
  iniciarVoz(id) {
    this.pararVoz();
    const v = this.voz = {
      id: id,
      estado: 0,
      paku: new Map,
      subI: 0,
      subVis: false,
      lipI: 0
    };
    const l = this.cs.llamada?.datos;
    if (l) {
      const k = l.vocesOrden.indexOf(id);
      l.vocesOrden.slice(k + 1, k + 3).forEach(x => this.voces.cargar(x));
    }
    if (!(id > 0)) {
      v.estado = -1;
      v.falta = true;
      return;
    }
    this.voces.cargar(id).then(async r => {
      if (this.voz !== v) return;
      if (!r) {
        v.estado = -1;
        v.falta = true;
        return;
      }
      const ctx = this.voces.ctx();
      if (ctx.state !== "running") try {
        await Promise.race([ ctx.resume(), new Promise(ok => setTimeout(ok, 400)) ]);
      } catch {}
      if (this.voz !== v) return;
      v.datos = r.datos;
      if (ctx.state !== "running") {
        this.vozMuda(v, 0);
        v.estado = 2;
        return;
      }
      const src = ctx.createBufferSource();
      src.buffer = r.buffer;
      src.connect(this.voces.salida);
      src.onended = () => {
        if (this.voz === v && v.estado === 2 && !v.mudo) this.finVoz(v);
      };
      v.src = src;
      v.t0 = ctx.currentTime + .02 + (ctx.outputLatency || 0);
      src.start(ctx.currentTime + .02, r.offset);
      v.ctxAnt = ctx.currentTime;
      v.wallAnt = performance.now();
      v.estado = 2;
    });
  }
  finVoz(v) {
    v.estado = -1;
    if (v.paku) for (const q of v.paku.values()) {
      q.boca = 0;
      q.ojo = 0;
    }
  }
  pararVoz() {
    const v = this.voz;
    if (v) {
      try {
        v.src?.stop();
      } catch {}
      v.estado = -1;
    }
    this.voz = null;
  }
  vozMuda(v, desde) {
    v.mudo = true;
    v.t0w = performance.now() / 1e3 - desde;
    try {
      v.src?.stop();
    } catch {}
  }
  tiempoVoz() {
    const v = this.voz;
    if (!v || v.estado !== 2) return -1;
    return v.mudo ? performance.now() / 1e3 - v.t0w : this.voces.ctx().currentTime - v.t0;
  }
  actualizarVoz() {
    const v = this.voz;
    if (!v || v.estado !== 2 || !v.datos) return;
    if (!v.mudo) {
      const c = this.voces.ctx().currentTime, w = performance.now();
      if (c !== v.ctxAnt) {
        v.ctxAnt = c;
        v.wallAnt = w;
      } else if (w - v.wallAnt > 600) this.vozMuda(v, Math.max(0, this.tiempoVoz()));
    }
    const t = this.tiempoVoz(), L = v.datos.lip;
    if (v.mudo && t >= v.datos.seg) {
      this.finVoz(v);
      return;
    }
    while (v.lipI < L.length && L[v.lipI][0] <= t) {
      const [, id, val] = L[v.lipI++];
      const ch = parseInt(id, 16);
      let q = v.paku.get(ch);
      if (!q) v.paku.set(ch, q = {
        boca: 0,
        ojo: 0
      });
      if (val === 4) q.ojo = 1; else if (val < 4) q.boca = val;
    }
    const S = v.datos.sub;
    if (!v.subVis) {
      if (v.subI < S.length && t >= S[v.subI][0]) v.subVis = true;
    } else if (t >= S[v.subI][1]) {
      v.subVis = false;
      v.subI++;
    }
  }
  subActual() {
    const v = this.voz;
    return v && v.estado === 2 && v.subVis ? v.subI : null;
  }
  imprimir(t) {
    this.mensaje = t;
    this.tablero.imprimir(t || "", 0);
    this.tablero.volcar();
  }
  limpiarMensaje() {
    this.mensaje = null;
  }
  abrirMemoria() {
    const lista = this.guion.memoria.lista.slice(0, 16);
    this.mem = {
      lista: lista,
      idx: Math.min(this.guion.memoria.actual, Math.max(0, lista.length - 1)),
      top: 0,
      rep: 2,
      repN: 14,
      anim: -1,
      cont: 4,
      sel: 0
    };
    this.moverMemoria(0);
  }
  moverMemoria(d) {
    const m = this.mem;
    if (d) this.op.se?.(SE.RCURSOR);
    m.idx += d;
    if (m.idx < 0 || m.idx >= m.lista.length) m.idx -= d; else if (m.idx < m.top) m.top -= 2; else if (m.top + 8 <= m.idx) m.top += 2;
    const t = this.tabMem;
    t.limpiar();
    const n = Math.min(8, m.lista.length - m.top);
    let px = 0, py = 0;
    for (let i = 0; i < n; i++) {
      t.dibujar(m.lista[i + m.top].nombre, px, py, 2);
      px = 96;
      if (i % 2) {
        px = 0;
        py += 12;
      }
    }
    t.volcar();
  }
  pasoMemoria(pad) {
    const m = this.mem;
    let st = 0;
    if (pad.status & (P.UP | P.DOWN)) st = pad.status & P.UP ? -2 : 2; else if (pad.status & (P.LEFT | P.RIGHT)) st = pad.status & P.LEFT ? -1 : 1;
    if (st) {
      if (m.rep === st) {
        if (--m.repN < 0) {
          this.moverMemoria(st);
          m.repN = 2;
        }
      } else {
        this.moverMemoria(st);
        m.repN = 10;
        m.rep = st;
      }
    } else m.rep = 0;
    if (pad.press & P.CIRCLE && m.lista.length) {
      this.guion.memoria.actual = m.idx;
      this.guion.memoria.guardar();
      m.sel = m.lista[m.idx].freq;
      m.anim = 1;
      this.op.se?.(SE.SELECT);
    }
    if (pad.press & P.CROSS) {
      m.sel = -1;
      m.anim = 1;
      this.op.se?.(SE.CANCEL);
    }
    if (m.anim === 0 && m.cont > 4) return m.sel;
    return 0;
  }
  dibujarMemoria(x) {
    const m = this.mem;
    if (!m) return;
    if (m.cont === 0 && this.tiempo % 16 >= 5) {
      x.fillStyle = "rgb(128,128,128)";
      if (m.top > 0) triangulo(x, [ 155, 125, 160, 120, 165, 125 ]);
      if (m.top + 8 < m.lista.length) triangulo(x, [ 156, 212, 160, 216, 164, 212 ]);
    }
    const n = Math.min(8, m.lista.length - m.top);
    let px = 0, py = 0;
    for (let i = 0; i < 8; i++) {
      x.fillStyle = "#000";
      x.fillRect(px + 22, py + 133, 138, 16);
      x.fillStyle = rgb(PANEL);
      x.fillRect(px + 25, py + 134, 35, 9);
      linea(x, px + 23, py + 145, px + 159, py + 145);
      if (i < n) {
        const c = m.lista[m.top + i];
        this.textoChico(x, px + 26, py + 136, String(Math.floor(c.freq / 100)).padStart(3, "0"), "base");
        this.textoChico(x, px + 46, py + 136, String(c.freq % 100).padStart(2, "0"), "base");
        x.fillStyle = rgb(BASE);
        x.fillRect(px + 44, py + 139, 1, 2);
        const u = i & 1 ? 96 : 0, v = (i >> 1) * 12, src = this.tabMem.cv;
        if (m.top + i === m.idx) {
          x.globalCompositeOperation = "lighter";
          for (let a = -1; a < 2; a++) for (let b = -1; b < 2; b++) {
            x.globalAlpha = a || b ? .75 : 1;
            x.drawImage(src, u, v, 96, 12, px + 64 + b, py + 133 + a, 96, 12);
          }
          x.globalAlpha = .5;
          x.drawImage(src, u, v, 96, 12, px + 64, py + 133, 96, 12);
          x.globalAlpha = 1;
          x.globalCompositeOperation = "source-over";
        } else {
          x.globalCompositeOperation = "lighter";
          x.drawImage(src, u, v, 96, 12, px + 64, py + 133, 96, 12);
          x.globalCompositeOperation = "source-over";
        }
      }
      px = 138;
      if (i & 1) {
        px = 0;
        py = m.cont > 0 ? py + 20 - m.cont * 5 : py + 20;
      }
    }
    const yend = py + 136;
    x.fillStyle = rgb(PANEL);
    polilinea(x, [ 75, 114, 16, 114, 16, yend, 160, yend ]);
    polilinea(x, [ 244, 114, 304, 114, 304, yend, 160, yend ]);
    if (m.anim !== 0) {
      m.cont += m.anim;
      if (m.cont < 1 || m.cont > 4) m.anim = 0;
    }
  }
  pasoPregunta(pad) {
    const cs = this.cs, ant = cs.indice;
    if (pad.press & P.UP && cs.indice > 0) cs.indice--;
    if (pad.press & P.DOWN) cs.indice++;
    if (cs.indice >= cs.opciones.length) cs.indice = cs.opciones.length - 1;
    if (ant !== cs.indice) this.op.se?.(SE.CURSOR);
    const t = this.tablero;
    t.limpiar();
    let maxW = 0, y = t.lSkip;
    cs.opciones.forEach((o, i) => {
      t.dibujar(String(o), 0, y, i === cs.indice ? 1 : 0);
      maxW = Math.max(maxW, t.maxW);
      y += 18;
    });
    t.maxW = maxW;
    t.volcar();
    this.mensaje = "";
    if (pad.press & P.CIRCLE) {
      this.guion.vars.resultado = cs.indice;
      this.mensaje = null;
      return true;
    }
    return false;
  }
  iniciarGuardado() {
    const g = this.cs.guardar || {
      area: 0,
      nombres: []
    };
    const area = g.area > 0 ? g.nombres[(g.area - 1) * 2] || "NO PLACE" : "NO PLACE";
    this.guardado = {
      area: area,
      areaIdx: g.area,
      sel: 0,
      fase: 0,
      t: 0,
      partidas: Codec.partidas()
    };
  }
  pasoGuardado(pad) {
    const g = this.guardado;
    g.t++;
    if (g.fase === 0) {
      if (pad.press & P.UP) {
        g.sel = (g.sel + 2) % 3;
        this.op.se?.(SE.CURSOR);
      }
      if (pad.press & P.DOWN) {
        g.sel = (g.sel + 1) % 3;
        this.op.se?.(SE.CURSOR);
      }
      if (pad.press & P.CIRCLE) {
        let datos = {
          version: 1,
          fecha: (new Date).toISOString(),
          area: g.area,
          areaIdx: g.areaIdx,
          st: this.guion.st,
          vars: this.guion.vars.exportar(),
          memoria: this.guion.memoria.lista,
          freq: this.freq
        };
        try {
          const r = this.op.alGuardar?.(datos);
          if (r && typeof r === "object") datos = r;
        } catch (e) {
          console.warn(e);
        }
        let ok = true;
        try {
          localStorage.setItem("mgs_codec_save_" + g.sel, JSON.stringify(datos));
        } catch {
          ok = false;
        }
        g.partidas = Codec.partidas();
        g.fase = ok ? 1 : 2;
        g.t = 0;
        this.op.se?.(ok ? 32 : 35);
      }
      if (pad.press & P.CROSS) {
        this.op.se?.(SE.CANCEL);
        return true;
      }
    } else if (g.t > 45 || g.t > 8 && pad.press & (P.CIRCLE | P.CROSS)) return true;
    return false;
  }
  dibujarGuardado(x) {
    const g = this.guardado;
    if (!g) return;
    x.fillStyle = "#000";
    x.fillRect(0, 0, W, H);
    this.textoGrande(x, 160, 24, "SAVE DATA", "base", 2);
    this.textoChico(x, 160, 42, g.area.toUpperCase(), "blanco", 2);
    for (let i = 0; i < 3; i++) {
      const y = 62 + i * 34, p = g.partidas[i], sel = i === g.sel;
      x.fillStyle = rgb(sel ? PANEL2 : PANEL);
      x.fillRect(40, y, 240, 26);
      x.fillStyle = rgb(sel ? [ 120, 200, 170 ] : BASE);
      polilinea(x, [ 40, y, 279, y, 279, y + 25, 40, y + 25, 40, y ]);
      this.textoGrande(x, 50, y + 10, String(i + 1), "base");
      if (p) {
        this.textoChico(x, 70, y + 6, String(p.area || "").toUpperCase().slice(0, 24), sel ? "blanco" : "base");
        const f = p.fecha ? new Date(p.fecha) : null, dd = n => String(n).padStart(2, "0");
        this.textoChico(x, 70, y + 15, f ? `${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())} ${dd(f.getHours())}:${dd(f.getMinutes())}` : "", "base");
      } else this.textoChico(x, 70, y + 10, "NO DATA", "base");
    }
    const msg = g.fase === 1 ? "SAVE COMPLETE" : g.fase === 2 ? "SAVE FAILED" : this.tiempo % 64 < 52 ? "SELECT SLOT    O SAVE    X CANCEL" : "";
    this.textoChico(x, 160, 176, msg, g.fase ? "blanco" : "base", 2);
  }
  textoChico(x, X, Y, s, color = "base", alinear = 0) {
    const img = this.img.num[color] || this.img.num.base;
    const glifos = [];
    let w = 0;
    for (const ch of s) {
      const lc = ch.toLowerCase();
      let tx, ty, skip;
      if (lc >= "0" && lc <= "9") {
        tx = +lc * 6;
        ty = 0;
        skip = 6;
      } else if (lc >= "a" && lc <= "z") {
        tx = (lc.charCodeAt(0) - 97) * 6;
        ty = 5;
        if (lc === "i") {
          skip = 3;
          w += 1;
        } else skip = 6;
      } else if (lc === " ") {
        w += 4;
        continue;
      } else if (lc === "#") {
        w += 6;
        continue;
      } else {
        const k = ESPECIALES.indexOf(lc);
        if (k < 0 || k % 2) continue;
        tx = 60 + k / 2 * 6;
        ty = 0;
        skip = ESPECIALES[k + 1];
        if (skip < 3) {
          w += 1;
          skip += 1;
        }
      }
      glifos.push([ tx, ty, w ]);
      w += skip;
    }
    const ox = alinear === 2 ? X - (w >> 1) : alinear === 1 ? X - w : X;
    for (const [tx, ty, gx] of glifos) x.drawImage(img, tx, ty, 6, 5, ox + gx, Y, 6, 5);
  }
  textoGrande(x, X, Y, s, color = "base", alinear = 0) {
    const img = this.img.grande[color] || this.img.grande.base;
    const glifos = [];
    let w = 0;
    for (let i = 0; i < s.length; i++) {
      const lc = s[i].toLowerCase();
      let tx, ty, skip;
      if (lc >= "0" && lc <= "9") {
        tx = +lc * 8;
        ty = 6;
        skip = 9;
      } else if (lc >= "a" && lc <= "z") {
        tx = (lc.charCodeAt(0) - 97) * 8;
        ty = 0;
        if (lc === "i") {
          skip = 4;
          w += 1;
        } else skip = 9;
      } else if (lc === " ") {
        w += 4;
        continue;
      } else if (lc === "#") {
        w += s.charCodeAt(i + 1) - 48 | 0;
        i++;
        continue;
      } else {
        const k = ESPECIALES.indexOf(lc);
        if (k < 0 || k % 2) continue;
        tx = 80 + k / 2 * 8;
        ty = 6;
        skip = ESPECIALES[k + 1];
        if (skip < 3) {
          w += 1;
          skip += 1;
        } else if (skip === 6) skip = 9;
      }
      glifos.push([ tx, ty, w ]);
      w += skip;
    }
    const ox = alinear === 2 ? X - (w >> 1) : alinear === 1 ? X - w : X;
    for (const [tx, ty, gx] of glifos) x.drawImage(img, tx, ty, 8, 6, ox + gx, Y, 8, 6);
  }
  digito(x, X, Y, d, grande, color) {
    const k = `${grande ? "g" : "c"}${d}${color}`;
    let c = this.digitos[k];
    if (!c) {
      c = this.digitos[k] = lienzo(10, 18);
      const g = c.getContext("2d");
      g.fillStyle = color;
      const segs = grande ? SEG_G : SEG_C, bits = DIG7[d];
      for (let i = 0; i < 7; i++) {
        if (!(bits & 1 << i)) continue;
        const [sx, sy, sw, sh] = segs[i], t = SEG_T[i];
        let p;
        if (t < 3) {
          p = [ sx, sy, sx + sw - 1, sy, sx + sw - 1, sy + sh - 1, sx, sy + sh - 1 ];
          if (t === 1) {
            p[0]++;
            p[2]--;
          } else {
            p[4]--;
            p[6]++;
          }
        } else {
          p = [ sx, sy, sx, sy + sh - 1, sx + sw - 1, sy + sh - 1, sx + sw - 1, sy ];
          if (t === 3) {
            p[1]++;
            p[3]--;
          } else {
            p[5]--;
            p[7]++;
          }
        }
        polilinea(g, p);
      }
    }
    x.drawImage(c, X, Y);
  }
  frecuencia(x, X, Y, valor, color) {
    let grande = false, cuenta = 1e4, k = 0;
    while (cuenta > 0) {
      const d = valor === null ? 8 : (valor / cuenta | 0) % 10;
      this.digito(x, X, Y, d, grande, color);
      if (cuenta === 100) {
        x.fillStyle = color;
        x.fillRect(X + 11, Y + 15, 2, 2);
      } else if (cuenta === 1e3) {
        grande = true;
        Y -= 2;
      }
      cuenta = cuenta / 10 | 0;
      X += PASO_DIG[k++];
    }
  }
  barras(x, X, Y, p) {
    const todas = p < 0;
    p *= 5;
    x.fillStyle = rgb(BASE);
    for (let i = 1; i < 44; i++) {
      if (i % 5 === 0) continue;
      if (!(p > 44 - i) && !todas) continue;
      x.fillRect(X, Y + i, Math.min(76, (300 / i | 0) + 3), 1);
    }
  }
  resaltes(x, flags) {
    if (flags < 0) flags = 15;
    if (flags & ACC.PTT) this.textoGrande(x, 144, 32, "P#3T#3T", "base");
    if (flags & ACC.MEMORY) this.textoGrande(x, 134, 111, "MEMORY", "base");
    x.fillStyle = rgb(BASE);
    for (const [bit, k] of [ [ ACC.RIGHT, 0 ], [ ACC.LEFT, 1 ] ]) {
      if (!(flags & bit)) continue;
      const c = FLECHAS[k], p = [ c[0], c[1] - 8, c[2], c[3] - 8, c[4], c[5] - 8 ];
      triangulo(x, p);
      polilinea(x, [ p[0], p[1], p[2], p[3], p[4], p[5], p[0], p[1] ]);
    }
  }
  panel(x) {
    if (this.estado === 11 || this.estado === 14) return;
    for (const [tx, ty, tw, th, c] of TILES) {
      x.fillStyle = rgb(c);
      x.fillRect(tx, ty - 8, tw, th);
    }
    this.barras(x, 122, 51, -1);
    this.frecuencia(x, 141, 80, null, rgb(BASE));
    this.resaltes(x, -1);
    const l = this.xl;
    l.clearRect(0, 0, W, H);
    this.barras(l, 122, 51, this.señal);
    this.frecuencia(l, 141, 80, this.freq, rgb(BASE));
    this.resaltes(l, this.accion);
    x.save();
    x.beginPath();
    x.rect(90, 30, 140, 89);
    x.clip();
    x.globalCompositeOperation = "lighter";
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      x.globalAlpha = i === 0 && j === 0 ? 1 : Math.abs(i) + Math.abs(j) === 2 ? .25 : .5;
      x.drawImage(this.luz, j, i);
    }
    x.restore();
  }
  marco(x, X, Y, w, h) {
    X += 3;
    Y += 3;
    w -= 7;
    h -= 7;
    if (w < 0) return;
    const m = this.img.marco, s = 9, xe = X + w, ye = Y + h;
    x.globalCompositeOperation = "lighter";
    x.drawImage(m, 0, 0, 9, 9, X - s, Y - s, 9, 9);
    x.drawImage(m, 10, 0, 9, 9, xe, Y - s, 9, 9);
    x.drawImage(m, 0, 10, 9, 9, X - s, ye, 9, 9);
    x.drawImage(m, 10, 10, 9, 9, xe, ye, 9, 9);
    if (w > 0) {
      x.drawImage(m, 9, 0, 1, 9, X, Y - s, w, 9);
      x.drawImage(m, 9, 10, 1, 9, X, ye, w, 9);
    }
    if (h > 0) {
      x.drawImage(m, 0, 9, 9, 1, X - s, Y, 9, h);
      x.drawImage(m, 10, 9, 9, 1, xe, Y, 9, h);
    }
    x.globalCompositeOperation = "source-over";
  }
  cara(x, s, i) {
    let X = i === 0 ? 31 : 237, Y = 30, w = 52, h = 89;
    if (s.vel !== 0) {
      if (i === 0 && s.abre === 0 && s.vel === 1) this.op.se?.(SE.CONNECT);
      s.abre += s.vel;
      if (s.abre <= 0) {
        s.abre = 0;
        s.vel = 0;
      }
      if (s.abre < 5) return;
      h = (s.abre - 4) * 15;
      if (h > 89) {
        h = 89;
        s.vel = 0;
      } else Y += (89 - h) / 2 | 0;
    }
    this.marco(x, X, Y, w, h);
    x.globalCompositeOperation = "lighter";
    if (this.barrido >= 0 && this.barrido < h) {
      x.fillStyle = this.tiempo & 1 ? "rgb(4,4,4)" : "rgb(16,16,16)";
      x.fillRect(X, this.barrido + Y, w + 1, 1);
    }
    if (s.fundido > 0 && s.fundidoTot > 0) {
      const sh = s.fundido * 128 / s.fundidoTot | 0;
      x.globalAlpha = sh / 128;
      x.drawImage(s.vieja, 0, 0, 52, 89, X, Y, w, h);
      x.globalAlpha = (128 - sh) / 128;
    }
    x.drawImage(s.img, 0, 0, 52, 89, X, Y, w, h);
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
  }
  corchete(x, s, i) {
    const c = s.abre < 5 ? s.abre * 14 : 54;
    x.fillStyle = rgb(PANEL);
    if (i === 0) polilinea(x, [ 83 - c, 30, 78 - c, 30, 78 - c, 118, 83 - c, 118 ]); else polilinea(x, [ c + 236, 30, c + 241, 30, c + 241, 118, c + 236, 118 ]);
  }
  caras(x) {
    const cs = this.cs;
    if (!cs.llamada) {
      cs.lados[0].anim = 0;
      cs.lados[1].anim = 0;
    }
    this.barrido = (this.barrido ?? 0) + 1;
    if (this.barrido > 109) this.barrido = 0;
    for (let i = 0; i < 2; i++) {
      const s = cs.lados[i];
      if (cs.llamada?.datos) this.aplicarPedido(i);
      if (cs.listas && s.anim !== 0) {
        this.logicaCara(s, i);
        this.cara(x, s, i);
      }
      this.corchete(x, s, i);
    }
  }
  banda(x) {
    const t = (this.tiempo / 2 | 0) % 128, b = this.tmp.getContext("2d");
    b.clearRect(0, 0, W, 8);
    b.drawImage(this.cv, 0, t, W, 8, 0, 0, W, 8);
    x.globalCompositeOperation = "lighter";
    x.globalAlpha = 24 / 128;
    x.drawImage(this.tmp, 0, t);
    x.globalAlpha = 1;
    x.globalCompositeOperation = "source-over";
  }
  marcaEspera(x) {
    if (this.tiempo % 16 >= 4) {
      x.fillStyle = "rgb(128,128,128)";
      triangulo(x, [ 284, 206, 288, 210, 292, 206 ]);
    }
  }
  fundido(x) {
    const o = Math.max(0, Math.min(255, this.fadeCount));
    if (!o) return;
    if (o >= 255) {
      x.fillStyle = "#000";
      x.fillRect(0, 0, W, H);
      return;
    }
    const im = x.getImageData(0, 0, W, H), d = im.data;
    for (let k = 0; k < d.length; k += 4) {
      d[k] = Math.max(0, d[k] - o);
      d[k + 1] = Math.max(0, d[k + 1] - o);
      d[k + 2] = Math.max(0, d[k + 2] - o);
    }
    x.putImageData(im, 0, 0);
  }
  dibujar(pad) {
    const x = this.x;
    x.imageSmoothingEnabled = false;
    x.globalCompositeOperation = "source-over";
    x.globalAlpha = 1;
    x.fillStyle = "#000";
    x.fillRect(0, 0, W, H);
    if (this.estado >= 11 && this.estado <= 14 && this.estado !== 11 && this.estado !== 13) {
      this.dibujarGuardado(x);
      this.fundido(x);
      return;
    }
    this.panel(x);
    this.caras(x);
    this.banda(x);
    if (this.mensaje && this.estado !== 10) {
      const t = this.tablero;
      x.drawImage(t.cv, (W - t.maxW) / 2 | 0, 132);
    }
    if (this.estado === 1 && this.tiempo % 64 < 52) this.textoChico(x, 160, 130, this.op.textoSalir || "PRESS SELECT TO EXIT", "base", 2);
    if (this.estado === 4 || this.estado === 9 && this.cont <= 0) this.marcaEspera(x);
    if (this.estado === 10) this.dibujarMemoria(x);
    this.fundido(x);
  }
  presentar() {
    if (!this.abierto) return;
    this.xd.imageSmoothingEnabled = false;
    this.xd.drawImage(this.cv, 0, 0);
    if (this.textura) this.textura.needsUpdate = true;
  }
}
