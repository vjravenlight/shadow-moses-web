// MGS web — FeniXVOID · Project Ravenlight
import { blit, limpiar, cargarImg, texDeImagen, textoMenu, textoChico, OPACO, ADD } from "./titulo.js";

import { guardarFotos, leerFotos } from "./fotos.js";

const BASE = new URL("./assets/extras/", import.meta.url).href;

const CX = 160, CY = 112;

const VERDE = [ 86, 137, 116 ];

const TITULO_CHICO = [ 58, 92, 78 ];

const SE = {
  CURSOR: 31,
  ELEGIR: 32,
  SALIR: 33,
  EXOR: 177
};

const BOTONES = [ {
  id: "nombre",
  tex: "cam_name",
  x: -144,
  w: 112
}, {
  id: "color",
  tex: "cam_color",
  x: -5,
  w: 68
}, {
  id: "salir",
  tex: "cam_exit",
  x: 90,
  w: 54
} ];

const BOTONES_EX = [ {
  id: "nombre",
  tex: "cam_ex_name",
  x: -144,
  w: 104
}, {
  id: "color",
  tex: "cam_ex_color",
  x: -42,
  w: 60
}, {
  id: "exor",
  tex: "cam_ex_exor",
  x: 17,
  w: 84
}, {
  id: "salir",
  tex: "cam_ex_exit",
  x: 100,
  w: 44
} ];

const TECLADO = [ [ "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "!", "<", ">" ], [ "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "?", "ENTRY" ], [ "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", "[", "]", "CANCEL" ] ];

const TEC_X = -104 + 7, TEC_Y = 32 + 19, TEC_PASO = 14, TEC_FILA = 11;

const teclaX = (f, c) => f === 0 && c >= 14 ? 121 + (c - 14) * 14 : f === 2 && c === 13 ? 90 : TEC_X + c * TEC_PASO;

const teclaW = k => k === "ENTRY" ? 44 : k === "CANCEL" ? 54 : 10;

const MAX_NOMBRE = 16;

const FILAS_LISTA = 8;

const tinte = a => [ 0, 1, 2 ].map(i => Math.trunc((a[i] + 100) * 255 / 200));

const dos = n => String(n).padStart(2, "0");

export class Pantalla {
  constructor(t) {
    this.t = t;
    this.fin = false;
    this.estado = "lista";
    this.f = 0;
    this.lista = t.fotosAlbum?.() || leerFotos();
    this.sel = 0;
    this.tope = 0;
    this.imgs = new Map;
    this.fantasmas = new Map;
    this.boton = 0;
    this.textos = new Map;
    this.cambiada = false;
  }
  async cargar() {
    const r = await fetch(BASE + "extras.json");
    if (!r.ok) throw new Error("extras.json " + r.status);
    const info = await r.json(), nombres = Object.keys(info.camera || {});
    const imgs = await Promise.all(nombres.map(n => cargarImg(BASE + "camera/" + n + ".png")));
    this.tex = {};
    nombres.forEach((n, i) => {
      if (imgs[i]) this.tex[n] = texDeImagen(imgs[i]);
    });
    await (this.t.sonido?.cargarEscenario?.("camera"));
  }
  se(id) {
    this.t.se(id);
  }
  texto(tipo, cad) {
    const k = tipo + "|" + cad;
    let v = this.textos.get(k);
    if (!v) {
      v = tipo === "menu" ? textoMenu(this.t.R.f8, cad) : textoChico(this.t.R.f5, cad);
      this.textos.set(k, v);
    }
    return v;
  }
  actual() {
    return this.lista[this.sel];
  }
  botones() {
    return this.actual()?.fantasma ? BOTONES_EX : BOTONES;
  }
  async _imagen(f) {
    if (this.imgs.has(f)) return this.imgs.get(f);
    const i = await cargarImg(f.img), t = i ? texDeImagen(i) : null;
    this.imgs.set(f, t);
    return t;
  }
  async _fantasma(n) {
    if (!n) return null;
    if (this.fantasmas.has(n)) return this.fantasmas.get(n);
    const i = await cargarImg(BASE + "fantasmas/" + dos(n) + ".png"), t = i ? texDeImagen(i) : null;
    this.fantasmas.set(n, t);
    return t;
  }
  _guardar() {
    guardarFotos(this.lista);
  }
  cuadro() {
    this.f++;
    const m = this["c_" + this.estado];
    if (m) m.call(this);
  }
  c_lista() {
    const t = this.t, N = this.lista.length;
    if (this.f <= 8) {
      t.pulsadas.length = 0;
      return;
    }
    const hit = p => {
      const i = Math.floor((p.y - 52) / 16) + this.tope;
      return i >= this.tope && i < Math.min(N, this.tope + FILAS_LISTA) ? i : -1;
    };
    const h = t._hover();
    if (h) {
      const i = hit(h);
      if (i >= 0 && i !== this.sel) {
        this.sel = i;
        this.se(SE.CURSOR);
      }
    }
    const toque = t.tomarToque();
    if (toque) {
      const i = hit(toque);
      if (i >= 0) {
        if (i !== this.sel) {
          this.sel = i;
          this.se(SE.CURSOR);
        } else this._abrirFoto();
      } else if (toque.y >= 196) this._salir();
      return;
    }
    if (t.pulsado("arriba")) {
      if (this.sel > 0) {
        this.sel--;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("abajo")) {
      if (this.sel < N - 1) {
        this.sel++;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("o", "start")) {
      if (N) this._abrirFoto();
    } else if (t.pulsado("x")) this._salir();
    if (this.sel < this.tope) this.tope = this.sel;
    if (this.sel >= this.tope + FILAS_LISTA) this.tope = this.sel - FILAS_LISTA + 1;
  }
  _salir() {
    this.se(SE.SALIR);
    this.estado = "saliendo";
    this.f = 0;
  }
  c_saliendo() {
    if (this.f >= 16) this.fin = true;
  }
  async _abrirFoto() {
    this.se(SE.ELEGIR);
    this.estado = "cargando";
    this.f = 0;
    const f = this.actual();
    [this.img, this.imgF] = await Promise.all([ this._imagen(f), this._fantasma(f.fantasma) ]);
    this.boton = 0;
    this.cambiada = false;
    this.estado = "foto";
    this.f = 0;
  }
  c_foto() {
    const t = this.t, B = this.botones();
    const toque = t.tomarToque();
    if (toque) {
      const i = toque.y >= CY + 84 ? B.findIndex(b => toque.x >= CX + b.x && toque.x < CX + b.x + b.w) : -1;
      if (i >= 0) {
        if (i !== this.boton) {
          this.boton = i;
          this.se(SE.CURSOR);
        } else this._accion(B[i].id);
      }
      return;
    }
    if (t.pulsado("izq")) {
      if (this.boton > 0) {
        this.boton--;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("der")) {
      if (this.boton < B.length - 1) {
        this.boton++;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("o", "start")) this._accion(B[this.boton].id); else if (t.pulsado("x")) this._accion("salir");
  }
  _accion(id) {
    this.f = 0;
    if (id === "salir") {
      this.se(SE.SALIR);
      if (this.cambiada) this._guardar();
      this.estado = "lista";
      this.f = 9;
      return;
    }
    this.se(SE.ELEGIR);
    const foto = this.actual();
    if (id === "nombre") {
      this.estado = "nombre";
      this.nombreTmp = foto.nombre || "";
      this.tec = {
        fila: 0,
        col: 0
      };
    }
    if (id === "color") {
      this.estado = "color";
      this.adj = foto.ajuste.slice();
      this.colF = 0;
      this.colB = 0;
    }
    if (id === "exor") {
      this.estado = "exor";
      this.exFase = 0;
      this.exSel = 0;
    }
  }
  c_nombre() {
    const t = this.t, T = this.tec, fila = TECLADO[T.fila];
    const mover = (df, dc) => {
      T.fila = (T.fila + df + 3) % 3;
      T.col = (T.col + dc + TECLADO[T.fila].length) % TECLADO[T.fila].length;
      if (T.col >= TECLADO[T.fila].length) T.col = TECLADO[T.fila].length - 1;
      this.se(SE.CURSOR);
    };
    const toque = t.tomarToque();
    if (toque) {
      const r = Math.floor((toque.y - CY - TEC_Y + 2) / TEC_FILA), x = toque.x - CX;
      const c = r >= 0 && r < 3 ? TECLADO[r].findIndex((k, i) => x >= teclaX(r, i) - 2 && x < teclaX(r, i) + teclaW(k) + 2) : -1;
      if (c >= 0) {
        T.fila = r;
        T.col = c;
        this._tecla();
      }
      return;
    }
    if (t.pulsado("arriba")) mover(-1, 0); else if (t.pulsado("abajo")) mover(1, 0); else if (t.pulsado("izq")) mover(0, -1); else if (t.pulsado("der")) mover(0, 1); else if (t.pulsado("o")) this._tecla(fila[T.col]); else if (t.pulsado("start")) this._terminaNombre(true); else if (t.pulsado("x")) {
      this.se(SE.SALIR);
      this.nombreTmp = this.nombreTmp.slice(0, -1);
    }
  }
  _tecla() {
    const k = TECLADO[this.tec.fila][this.tec.col];
    if (k === "ENTRY") return this._terminaNombre(true);
    if (k === "CANCEL") return this._terminaNombre(false);
    if (k === "<") {
      this.se(SE.ELEGIR);
      this.nombreTmp = this.nombreTmp.slice(0, -1);
      return;
    }
    if (k === ">") {
      this.se(SE.ELEGIR);
      if (this.nombreTmp.length < MAX_NOMBRE) this.nombreTmp += " ";
      return;
    }
    if (this.nombreTmp.length < MAX_NOMBRE) {
      this.se(SE.ELEGIR);
      this.nombreTmp += k;
    }
  }
  _terminaNombre(ok) {
    this.se(ok ? SE.ELEGIR : SE.SALIR);
    if (ok) {
      this.actual().nombre = this.nombreTmp.trimEnd();
      this.cambiada = true;
    }
    this.estado = "foto";
    this.f = 0;
  }
  c_color() {
    const t = this.t, foto = this.actual();
    const fin = ok => {
      this.se(ok ? SE.ELEGIR : SE.SALIR);
      if (ok) {
        foto.ajuste = this.adj.slice();
        this.cambiada = true;
      }
      this.estado = "foto";
      this.f = 0;
    };
    const accion = () => {
      if (this.colB === 0) return fin(true);
      if (this.colB === 1) {
        this.adj = [ 0, 0, 0 ];
        this.se(SE.ELEGIR);
        return;
      }
      fin(false);
    };
    const toque = t.tomarToque();
    if (toque) {
      const x = toque.x - CX, y = toque.y - CY;
      if (y >= 70 && y < 86) {
        this.colF = 3;
        this.colB = x < -80 ? 0 : x < -10 ? 1 : 2;
        return accion();
      }
      const f = Math.floor((y - 36) / 12);
      if (f >= 0 && f < 3 && x >= -60 && x < 34) {
        this.colF = f;
        this.adj[f] = Math.max(-100, Math.min(100, Math.round((x + 13) * 200 / 80)));
      }
      return;
    }
    if (t.pulsado("arriba")) {
      if (this.colF > 0) {
        this.colF--;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("abajo")) {
      if (this.colF < 3) {
        this.colF++;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("izq")) {
      if (this.colF < 3) this.adj[this.colF] = Math.max(-100, this.adj[this.colF] - 2); else if (this.colB > 0) {
        this.colB--;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("der")) {
      if (this.colF < 3) this.adj[this.colF] = Math.min(100, this.adj[this.colF] + 2); else if (this.colB < 2) {
        this.colB++;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("o", "start")) {
      if (this.colF === 3) accion(); else {
        this.colF = 3;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("x")) fin(false);
  }
  c_exor() {
    const t = this.t;
    if (this.exFase === 0) {
      if (this.f > 8 && (t.pulsado("o", "x", "start") || t.tomarToque())) {
        this.exFase = 1;
        this.f = 0;
      }
    } else if (this.exFase === 1) {
      const toque = t.tomarToque();
      if (toque) {
        const x = toque.x - CX;
        if (x >= 70 && x < 100) {
          if (this.exSel !== 0) {
            this.exSel = 0;
            this.se(SE.CURSOR);
            return;
          }
          return this._exorcizar();
        }
        if (x >= 108 && x < 136) {
          if (this.exSel !== 1) {
            this.exSel = 1;
            this.se(SE.CURSOR);
            return;
          }
          return this._noExor();
        }
        return;
      }
      if (this.exSel === 0) {
        if (t.pulsado("der")) {
          this.exSel = 1;
          this.se(SE.CURSOR);
        } else if (t.pulsado("o", "start")) this._exorcizar(); else if (t.pulsado("x")) this._noExor();
      } else if (t.pulsado("izq")) {
        this.exSel = 0;
        this.se(SE.CURSOR);
      } else if (t.pulsado("o", "start", "x")) this._noExor();
    } else if (this.exFase === 2) {
      if (this.f === 47) {
        const foto = this.actual();
        foto.fantasma = 0;
        this.imgF = null;
        this.cambiada = true;
        this._guardar();
      }
      if (this.f >= 91) {
        this.boton = 0;
        this.estado = "foto";
        this.f = 0;
      }
    }
  }
  _noExor() {
    this.se(SE.SALIR);
    this.estado = "foto";
    this.f = 0;
  }
  _exorcizar() {
    this.se(SE.EXOR);
    this.exFase = 2;
    this.f = 0;
  }
  dibujar(fb) {
    limpiar(fb);
    if (this.estado === "lista" || this.estado === "saliendo" || this.estado === "cargando") return this.dibujarLista(fb);
    this.dibujarFoto(fb);
  }
  _pieza(fb, n, x0, y0, x1, y1, modo = OPACO, c = VERDE) {
    const t = this.tex[n];
    if (t) blit(fb, t, CX + x0, CY + y0, x1 - x0, y1 - y0, c[0], c[1], c[2], modo);
  }
  dibujarLista(fb) {
    const t = this.t, k = this.estado === "saliendo" ? Math.max(0, 1 - this.f / 16) : Math.min(1, this.f / 8), v = VERDE.map(c => c * k);
    this._pieza(fb, "cam_album", -42, -102, 42, -90, OPACO, v);
    this._pieza(fb, "cam_line1", -144, -86, 144, -84, OPACO, v);
    if (!this.lista.length) {
      const m = this.texto("menu", "NO PHOTO");
      blit(fb, m, 160 - m.ancho / 2, 100, m.w, m.h, v[0], v[1], v[2], ADD);
    }
    for (let i = this.tope; i < Math.min(this.lista.length, this.tope + FILAS_LISTA); i++) {
      const f = this.lista[i], y = 52 + (i - this.tope) * 16, s = i === this.sel, c = s ? [ 192, 192, 192 ].map(x => x * k) : v;
      const r = this.texto("menu", "PHOTO " + dos(f.n));
      blit(fb, r, 48, y, r.w, r.h, c[0], c[1], c[2], ADD);
      if (f.nombre) {
        const n = this.texto("menu", f.nombre);
        blit(fb, n, 128, y, n.w, n.h, c[0], c[1], c[2], ADD);
      }
      if (s && this.estado === "lista") t.cursor(fb, 44, y - 2, 268 - 44, 9, Math.round(255 * k), 1);
    }
    if (this.lista.length > FILAS_LISTA) {
      const p = this.texto("chico", `${this.sel + 1} ${this.lista.length}`);
      blit(fb, p, 160 - p.w / 2, 192, p.w, p.h, v[0], v[1], v[2], ADD);
    }
  }
  dibujarFoto(fb) {
    const foto = this.actual(), c = tinte(this.estado === "color" ? this.adj : foto.ajuste);
    if (this.img) blit(fb, this.img, CX - 144, CY - 90, 288, 176, c[0], c[1], c[2], OPACO);
    if (this.imgF) blit(fb, this.imgF, CX - 127, CY - 82, 254, 160, c[0], c[1], c[2], ADD);
    this._pieza(fb, "cam_frame", -144, -102, 60, -90);
    this._pieza(fb, "cam_album", 60, -102, 144, -90);
    this._pieza(fb, "cam_line1", -144, 84, 144, 86);
    this._pieza(fb, "cam_line2", 142, -90, 146, 86);
    this._pieza(fb, "cam_line3", -146, -90, -142, 86);
    const fil = this.texto("chico", "PHOTO " + dos(foto.n));
    blit(fb, fil, 26, 14, fil.w, fil.h, TITULO_CHICO[0], TITULO_CHICO[1], TITULO_CHICO[2], ADD);
    const nom = this.estado === "nombre" ? this.nombreTmp : foto.nombre;
    if (nom) {
      const n = this.texto("menu", nom);
      blit(fb, n, 83, 13, n.w, n.h, VERDE[0], VERDE[1], VERDE[2], ADD);
    }
    if (this.estado === "foto") this.dibujarBotones(fb); else if (this.estado === "nombre") this.dibujarNombre(fb); else if (this.estado === "color") this.dibujarColor(fb); else if (this.estado === "exor") this.dibujarExor(fb);
  }
  dibujarBotones(fb) {
    this.botones().forEach(b => this._pieza(fb, b.tex, b.x, 90, b.x + b.w, 102, ADD));
    const b = this.botones()[this.boton];
    this.t.cursor(fb, CX + b.x, CY + 90, b.w, 12, 255, 1);
  }
  dibujarNombre(fb) {
    const conF = !!this.actual().fantasma;
    this._pieza(fb, conF ? "cam_ex_name_b" : "cam_name_b", 39, 20, conF ? 143 : 151, 32);
    this._pieza(fb, "cam_name_entry_l", -104, 32, 24, 86);
    this._pieza(fb, "cam_name_entry_r", 24, 32, 152, 86);
    const T = this.tec, k = TECLADO[T.fila][T.col], x = CX + teclaX(T.fila, T.col), y = CY + TEC_Y + T.fila * TEC_FILA;
    this.t.cursor(fb, x - 1, y - 2, teclaW(k), 10, 255, 1);
    if (this.nombreTmp.length < MAX_NOMBRE && this.f % 20 < 12) {
      const n = this.texto("menu", this.nombreTmp || " ");
      const c = this.texto("menu", "[");
      blit(fb, c, 83 + (this.nombreTmp ? n.ancho : 0), 13, c.w, c.h, VERDE[0], VERDE[1], VERDE[2], ADD);
    }
  }
  dibujarColor(fb) {
    const conF = !!this.actual().fantasma;
    this._pieza(fb, conF ? "cam_ex_color_b" : "cam_color_b", -150, 8, conF ? -90 : -82, 20);
    this._pieza(fb, "cam_color_ad", -150, 20, 38, 86);
    const X0 = -150 + 77, ANCHO = 92;
    for (let i = 0; i < 3; i++) {
      const y = 20 + 15 + i * 12, cx = X0 + Math.round((this.adj[i] + 100) * ANCHO / 200);
      this._pieza(fb, "cam_color_cur", cx - 2, y - 2, cx + 2, y + 8, OPACO, this.colF === i ? [ 192, 192, 192 ] : VERDE);
      const v = this.texto("menu", String(Math.abs(this.adj[i])));
      blit(fb, v, CX - 150 + 28 + 2, CY + y + 3, v.w, v.h, VERDE[0], VERDE[1], VERDE[2], ADD);
      if (this.colF === i) this.t.cursor(fb, CX + X0 - 18, CY + y - 2, ANCHO + 36, 9, 255, 1);
    }
    if (this.colF === 3) {
      const R = [ [ -128, 28 ], [ -92, 52 ], [ -30, 56 ] ][this.colB];
      this.t.cursor(fb, CX + R[0], CY + 72, R[1], 9, 255, 1);
    }
  }
  dibujarExor(fb) {
    const G = [ 192, 192, 192 ];
    if (this.exFase === 0) {
      this._pieza(fb, "cam_ex_ji1_l", -150, 87, -6, 100, ADD, G);
      this._pieza(fb, "cam_ex_ji1_r", -6, 87, 138, 100, ADD, G);
      this._pieza(fb, "4e7a", -150, 99, -6, 112, ADD, G);
      this._pieza(fb, "4e80", -6, 99, 138, 112, ADD, G);
      if (this.f > 8 && this.f % 32 >= 11) this._flecha(fb, CX + 136, CY + 104);
    } else if (this.exFase === 1) {
      this._pieza(fb, "527a", -140, 88, 4, 102, ADD, G);
      this._pieza(fb, "5280", 4, 88, 148, 102, ADD, G);
      const R = this.exSel === 0 ? [ 74, 24 ] : [ 111, 22 ];
      this.t.cursor(fb, CX + R[0], CY + 90, R[1], 12, 255, 1);
    } else {
      this.botones().forEach(b => this._pieza(fb, b.tex, b.x, 90, b.x + b.w, 102, ADD));
      const f = this.f, nivel = f < 31 ? 0 : f < 47 ? (f - 30) * 255 / 16 : f < 75 ? 255 : Math.max(0, 255 - (f - 74) * 255 / 16);
      if (nivel > 0) {
        const D = fb.d;
        for (let i = 0; i < D.length; i += 4) {
          D[i] += nivel;
          D[i + 1] += nivel;
          D[i + 2] += nivel;
        }
      }
    }
  }
  _flecha(fb, x, y) {
    const D = fb.d, W = fb.w;
    for (let dy = 0; dy < 4; dy++) for (let dx = -(3 - dy); dx <= 3 - dy; dx++) {
      const o = ((y + dy) * W + x + dx) * 4;
      D[o] = 116;
      D[o + 1] = 137;
      D[o + 2] = 86;
    }
  }
}
