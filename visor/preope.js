// MGS web — FeniXVOID · Project Ravenlight
import { blit, limpiar, cargarImg, texDeImagen, textoMenu, texVacia, OPACO, ADD } from "./titulo.js";

const BASE = new URL("./assets/", import.meta.url).href;

const CX = 160, CY = 112;

const VERDE = [ 86, 137, 116 ], GRIS = [ 128, 128, 128 ];

const SE = {
  CURSOR: 31,
  ELEGIR: 32,
  SALIR: 33,
  PAGINA: 176
};

const RENGLONES = 8, PAGS = [ 9, 14 ];

const OPCIONES = [ {
  x: -42,
  y: -42,
  w: 84,
  h: 6,
  modo: 0
}, {
  x: -90,
  y: 6,
  w: 180,
  h: 6,
  modo: 0
}, {
  x: -28,
  y: 46,
  w: 56,
  h: 12,
  modo: 1
} ];

const CUR = {
  izq: [ -46, 86, 16, 14 ],
  der: [ 30, 86, 16, 14 ],
  salir: [ 90, 87, 54, 12 ]
};

const X_TEXTO = 16, Y_TEXTO = 35, PASO_TEXTO = 19;

const CONTORNO = [ [ -1, 0 ], [ 1, 0 ], [ 0, 1 ], [ 0, -1 ] ];

export class Pantalla {
  constructor(t) {
    this.t = t;
    this.fin = false;
    this.f = 0;
    this.estado = "menu";
    this.sel = 0;
    this.lineas = new Map;
  }
  async cargar() {
    const [ri, rn, fp, fj] = await Promise.all([ fetch(BASE + "extras/extras.json"), fetch(BASE + "niveles/preope/nivel.json"), cargarImg(BASE + "codec/ui/fuente.png"), fetch(BASE + "codec/ui/fuente.json") ]);
    if (!ri.ok || !rn.ok || !fp || !fj.ok) throw new Error("faltan datos de PREVIOUS OPERATIONS");
    const nombres = Object.keys((await ri.json()).preope || {});
    const imgs = await Promise.all(nombres.map(n => cargarImg(BASE + "extras/preope/" + n + ".png")));
    this.tex = {};
    nombres.forEach((n, i) => {
      if (imgs[i]) this.tex[n] = texDeImagen(imgs[i]);
    });
    const actor = (await rn.json()).actores.find(a => a.tipo === "PREOPE");
    const textos = actor.opts.e.slice(5);
    this.paginas = [ textos.slice(0, PAGS[0] * RENGLONES), textos.slice(PAGS[0] * RENGLONES, (PAGS[0] + PAGS[1]) * RENGLONES) ];
    const c = document.createElement("canvas");
    c.width = fp.width;
    c.height = fp.height;
    const x = c.getContext("2d");
    x.drawImage(fp, 0, 0);
    const d = x.getImageData(0, 0, fp.width, fp.height).data, niv = new Uint8Array(fp.width * fp.height);
    for (let k = 0; k < niv.length; k++) niv[k] = d[k * 4 + 3] ? Math.round(d[k * 4] / 85) : 0;
    this.fuente = {
      ascii: (await fj.json()).ascii,
      niv: niv,
      aw: fp.width
    };
    await (this.t.sonido?.cargarEscenario?.("preope"));
  }
  linea(txt) {
    let l = this.lineas.get(txt);
    if (l) return l;
    const F = this.fuente;
    let w = 0;
    for (const ch of txt) {
      const g = F.ascii[ch.charCodeAt(0) - 32];
      if (g) w += g[2];
    }
    const t = texVacia(Math.max(1, w), 13);
    let x = 0;
    for (const ch of txt) {
      const g = F.ascii[ch.charCodeAt(0) - 32];
      if (!g) continue;
      for (let r = 0; r < 12; r++) for (let i = 0; i < g[2]; i++) {
        const v = F.niv[r * F.aw + g[0] + i], yy = r + g[1];
        if (v && yy < 13) {
          const o = (yy * t.w + x + i) * 4;
          t.d[o] = t.d[o + 1] = t.d[o + 2] = v * 85;
          t.d[o + 3] = 255;
        }
      }
      x += g[2];
    }
    this.lineas.set(txt, t);
    return t;
  }
  se(id) {
    this.t.se(id);
  }
  cuadro() {
    this.f++;
    const m = this["c_" + this.estado];
    if (m) m.call(this);
  }
  c_menu() {
    const t = this.t;
    if (this.f <= 16) {
      t.pulsadas.length = 0;
      return;
    }
    const hit = p => OPCIONES.findIndex(o => p.x >= CX + o.x - 8 && p.x < CX + o.x + o.w + 8 && p.y >= CY + o.y - 8 && p.y < CY + o.y + o.h + 8);
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
        }
        this._elegir();
      }
      return;
    }
    if (t.pulsado("abajo")) {
      if (this.sel < 2) {
        this.sel++;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("arriba")) {
      if (this.sel > 0) {
        this.sel--;
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("o", "start")) this._elegir(); else if (t.pulsado("x")) this._salir();
  }
  _elegir() {
    if (this.sel === 2) return this._salir();
    this.se(SE.ELEGIR);
    this.cual = this.sel;
    this.estado = "menu_a_pag";
    this.f = 0;
  }
  _salir() {
    this.se(SE.SALIR);
    this.estado = "saliendo";
    this.f = 0;
  }
  c_saliendo() {
    if (this.f > 16) this.fin = true;
  }
  c_menu_a_pag() {
    if (this.f >= 16) {
      this.estado = "pag_abre";
      this.f = 0;
      this.pag = 1;
      this.modo = "der";
      this.despl = 0;
      this.oculto = false;
    }
  }
  c_pag_abre() {
    if (this.f >= 16) {
      this.estado = "pag";
      this.f = 0;
    }
  }
  c_pag() {
    const t = this.t, tot = PAGS[this.cual];
    const adelante = () => {
      if (this.pag < tot) {
        this.modo = "der";
        this.se(SE.PAGINA);
        this.estado = "pasa";
        this.dir = 1;
        this.f = 0;
      }
    };
    const atras = () => {
      if (this.pag > 1) {
        this.modo = "izq";
        this.se(SE.PAGINA);
        this.estado = "pasa";
        this.dir = -1;
        this.f = 0;
      }
    };
    const salir = () => {
      this.se(SE.SALIR);
      this.estado = "pag_cierra";
      this.f = 0;
    };
    const toque = t.tomarToque();
    if (toque) {
      const x = toque.x - CX, y = toque.y - CY;
      if (y >= 80) {
        if (x < -14) atras(); else if (x < 70) adelante(); else salir();
      }
      return;
    }
    if (t.pulsado("izq")) {
      if (this.modo === "der") {
        this.modo = "izq";
        this.se(SE.CURSOR);
      } else if (this.modo === "salir") {
        this.modo = "der";
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("der")) {
      if (this.modo === "izq") {
        this.modo = "der";
        this.se(SE.CURSOR);
      } else if (this.modo === "der") {
        this.modo = "salir";
        this.se(SE.CURSOR);
      }
    } else if (t.pulsado("o", "start")) {
      if (this.modo === "der") adelante(); else if (this.modo === "izq") atras(); else salir();
    } else if (t.pulsado("x")) salir();
  }
  c_pasa() {
    const f = this.f, d = this.dir;
    if (f < 9) this.despl = -d * f * 40; else if (f === 9) this.oculto = true; else if (f === 10) this.pag += d; else if (f === 11) this.oculto = false;
    if (f >= 11 && f <= 19) this.despl = d * (19 - f) * 40;
    if (f > 19) {
      this.despl = 0;
      this.estado = "pag";
      this.f = 0;
    }
  }
  c_pag_cierra() {
    if (this.f >= 16) {
      this.estado = "pag_a_menu";
      this.f = 0;
    }
  }
  c_pag_a_menu() {
    if (this.f >= 16) {
      this.estado = "menu";
      this.f = 17;
    }
  }
  dibujar(fb) {
    limpiar(fb);
    const E = this.estado, f = this.f;
    if (E === "menu" || E === "saliendo" || E === "menu_a_pag" || E === "pag_a_menu") {
      const k = E === "menu" ? Math.min(1, f / 16) : E === "pag_a_menu" ? Math.min(1, f / 16) : Math.max(0, 1 - f / 16);
      this.dibujarMenu(fb, k, E === "menu" && f > 16);
    } else {
      const k = E === "pag_abre" ? Math.min(1, f / 16) : E === "pag_cierra" ? Math.max(0, 1 - f / 16) : 1;
      this.dibujarPagina(fb, k);
    }
  }
  _p(fb, n, x0, y0, x1, y1, modo, c, k) {
    const t = this.tex[n];
    if (t) blit(fb, t, CX + x0, CY + y0, x1 - x0, y1 - y0, c[0] * k, c[1] * k, c[2] * k, modo);
  }
  dibujarMenu(fb, k, conCursor) {
    this._p(fb, "pre_back_l", -160, -112, 0, 112, OPACO, GRIS, k);
    this._p(fb, "pre_back_r", 0, -112, 160, 112, OPACO, GRIS, k);
    this._p(fb, "pre_pre", -82, -94, 82, -82, ADD, VERDE, k);
    this._p(fb, "pre_met", -42, -42, 42, -36, ADD, VERDE, k);
    this._p(fb, "pre_met2", -90, 6, 90, 12, ADD, VERDE, k);
    this._p(fb, "pre_exit", -28, 46, 28, 58, ADD, VERDE, k);
    if (conCursor) {
      const o = OPCIONES[this.sel];
      this.t.cursor(fb, CX + o.x, CY + o.y, o.w, o.h, 255, 1);
    }
  }
  dibujarPagina(fb, k) {
    const met = this.cual === 0 ? 1 : 2, up = met === 1 ? "pre_up1_l" : "pre_up2_l", tot = PAGS[this.cual];
    this._p(fb, up, -160, -112, 0, -82, OPACO, VERDE, k);
    this._p(fb, "pre_up_r", 0, -112, 160, -82, OPACO, VERDE, k);
    this._p(fb, `pre_met${met}_l`, -160, -82, 0, 82, OPACO, VERDE, k);
    this._p(fb, `pre_met${met}_r`, 0, -82, 160, 82, OPACO, VERDE, k);
    this._p(fb, "pre_down_l", -160, 82, 0, 112, OPACO, VERDE, k);
    this._p(fb, "pre_down_r", 0, 82, 160, 112, OPACO, VERDE, k);
    if (!this.oculto) {
      const ini = (this.pag - 1) * RENGLONES, L = this.paginas[this.cual], g = 205 * k;
      for (let i = 0; i < RENGLONES; i++) {
        const txt = L[ini + i];
        if (!txt) continue;
        const t = this.linea(txt), x = X_TEXTO + (this.despl || 0), y = Y_TEXTO + i * PASO_TEXTO;
        for (const [dx, dy] of CONTORNO) blit(fb, t, x + dx, y + dy, t.w, t.h, 0, 0, 0, OPACO);
        blit(fb, t, x, y, t.w, t.h, g * 128 / 255, g * 128 / 255, g * 128 / 255, OPACO);
      }
    }
    const num = (s, x) => {
      const t = textoMenu(this.t.R.f8, s);
      blit(fb, t, x, 202, t.w, t.h, VERDE[0] * k, VERDE[1] * k, VERDE[2] * k, ADD);
    };
    num(String(this.pag).padStart(2, " "), this.pag < 10 ? 138 : 134);
    this._barra(fb, 156, 202, k);
    num(String(tot), 167);
    if (this.estado === "pag") {
      const c = CUR[this.modo];
      this.t.cursor(fb, CX + c[0], CY + c[1], c[2], c[3], 255, 1);
    }
  }
  _barra(fb, x, y, k) {
    const D = fb.d, W = fb.w;
    for (let i = 0; i < 6; i++) {
      const o = ((y + i) * W + x + 5 - i) * 4;
      D[o] = VERDE[0] * k;
      D[o + 1] = VERDE[1] * k;
      D[o + 2] = VERDE[2] * k;
    }
  }
}
