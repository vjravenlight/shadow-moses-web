// MGS web — FeniXVOID · Project Ravenlight
import { PAD } from "./inventario.js";

import { disposicionHud } from "./hud.js";

import { tactil as cfg, alCambiar } from "./controles.js";

const $ = s => document.querySelector(s);

const ZONA_MUERTA = .12;

const CORRER_DESDE = .72;

const CORRER_HASTA = .62;

const TOQUE_CORTO = 300;

const DIRS = [ PAD.ARRIBA, PAD.ABAJO, PAD.IZQ, PAD.DER ];

export class Tactil {
  constructor(c) {
    this.c = c;
    this.tac = c.tac;
    this.raiz = $("#tactil");
    this.joy = $("#joy");
    this.perilla = $("#joy i");
    this.cam = $("#btn-cam");
    this.gat = [ {
      k: 0,
      bit: PAD.L2
    }, {
      k: 1,
      bit: PAD.R2
    } ];
    this.dirs = 0;
    this.vibraciones = 0;
    this._clave = "";
    this._modo = "";
    this._oculto = null;
    document.body.classList.add("tactil");
    this._seguras();
    this._palanca();
    for (const b of this.raiz.querySelectorAll("[data-b]")) this._boton(b);
    if (this.cam) {
      this.cam.addEventListener("pointerdown", () => {
        this.vibrar();
        this.cam.classList.add("on");
      });
      for (const ev of [ "pointerup", "pointercancel", "pointerleave" ]) this.cam.addEventListener(ev, () => this.cam.classList.remove("on"));
    }
    addEventListener("resize", () => {
      this._clave = "";
      this._seguras();
    });
    addEventListener("hud-modo", () => {
      this._clave = "";
    });
    this.aplicarConfig();
    alCambiar(() => this.aplicarConfig());
    globalThis.__tactil = this;
  }
  aplicarConfig() {
    const k = Math.max(.5, Math.min(2, +cfg.tam || 1)), op = Math.max(.2, Math.min(1, +cfg.opacidad || 1));
    document.documentElement.style.setProperty("--tk", String(k));
    this.raiz.style.setProperty("--top", String(op));
    this.raiz.classList.toggle("zurdo", !!cfg.zurdo);
    document.body.classList.toggle("tac-zurdo", !!cfg.zurdo);
    this._clave = "";
  }
  vibrar(ms = 12) {
    if (!cfg.vibraToque) return;
    try {
      if (localStorage.getItem("sm_vibra") === "0") return;
    } catch {}
    try {
      if (navigator.vibrate?.(ms) !== undefined) this.vibraciones++;
    } catch {}
  }
  _palanca() {
    const base = this.joy, tac = this.tac;
    const mover = e => {
      const r = base.getBoundingClientRect(), radio = r.width / 2;
      const sens = Math.max(.3, Math.min(3, +cfg.sensPalanca || 1));
      let dx = (e.clientX - (r.left + radio)) / radio * sens, dy = (e.clientY - (r.top + radio)) / radio * sens;
      const L = Math.hypot(dx, dy);
      if (L > 1) {
        dx /= L;
        dy /= L;
      }
      const m = Math.min(1, L);
      tac.x = Math.abs(dx) > ZONA_MUERTA ? dx : 0;
      tac.y = Math.abs(dy) > ZONA_MUERTA ? -dy : 0;
      tac.correr = false;
      base.classList.toggle("corre", m > ZONA_MUERTA);
      const v = radio * .62;
      this.perilla.style.transform = `translate(-50%, -50%) translate(${(dx * v).toFixed(1)}px, ${(dy * v).toFixed(1)}px)`;
    };
    base.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (tac.joy != null) return;
      tac.joy = e.pointerId;
      try {
        base.setPointerCapture(e.pointerId);
      } catch {}
      base.classList.add("on");
      this.vibrar(8);
      mover(e);
    });
    base.addEventListener("pointermove", e => {
      if (e.pointerId === tac.joy) mover(e);
    });
    const soltar = e => {
      if (e.pointerId !== tac.joy) return;
      tac.joy = null;
      tac.x = tac.y = 0;
      tac.correr = false;
      base.classList.remove("on", "corre");
      this.perilla.style.transform = "";
    };
    base.addEventListener("pointerup", soltar);
    base.addEventListener("pointercancel", soltar);
    base.addEventListener("lostpointercapture", soltar);
  }
  _boton(b) {
    const que = b.dataset.b, c = this.c;
    let id = null;
    const abajo = e => {
      e.preventDefault();
      e.stopPropagation();
      if (id != null) return;
      id = e.pointerId;
      try {
        b.setPointerCapture(e.pointerId);
      } catch {}
      b.classList.add("on");
      if (que !== "cuadrado") this.vibrar();
      this._apretar(que, true, e.timeStamp);
    };
    const arriba = e => {
      if (e.pointerId !== id) return;
      id = null;
      b.classList.remove("on");
      this._apretar(que, false, e.timeStamp);
    };
    b.addEventListener("pointerdown", abajo);
    for (const ev of [ "pointerup", "pointercancel", "lostpointercapture" ]) b.addEventListener(ev, arriba);
    b.addEventListener("contextmenu", e => e.preventDefault());
  }
  _apretar(que, abajo, t = performance.now()) {
    const c = this.c, inv = c.inventario, teclas = c.teclas;
    switch (que) {
     case "circulo":
      if (inv?.abierto) {
        inv.botonVR(PAD.CIR, abajo);
        return;
      }
      teclas.KeyG = abajo;
      if (abajo && c.jugando()) c.golpe();
      return;

     case "cruz":
      teclas.KeyC = abajo;
      if (abajo && !inv?.abierto) c.agachar();
      return;

     case "cuadrado":
      if (abajo) {
        if (c.jugando() && !inv?.abierto) {
          this._gatillo = true;
          c.disparar();
        }
      } else if (this._gatillo) {
        this._gatillo = false;
        c.soltar();
      }
      return;

     case "triangulo":
      teclas.KeyE = abajo;
      return;

     case "l2":
     case "r2":
      this._menu(que === "r2" ? 1 : 0, abajo, t);
      return;

     case "r1":
     case "l1":
      inv?.botonVR(que === "r1" ? PAD.R1 : PAD.L1, abajo);
      return;

     case "saltar":
      if (abajo) c.saltar();
      return;

     case "vuelo":
      if (abajo) this.raiz.querySelector('[data-b="vuelo"]')?.classList.toggle("fijo", !!c.vuelo());
      return;
    }
  }
  _menu(k, abajo, t = performance.now()) {
    const inv = this.c.inventario, g = this.gat[k];
    if (!inv) return;
    if (abajo) {
      if (g.fijo) {
        g.cerrar = true;
        return;
      }
      if (inv.abierto && inv.menu !== k) return;
      g.t0 = t;
      g.cuadros = 0;
      g.mant = true;
      inv.botonVR(g.bit, true);
    } else {
      if (g.cerrar) {
        g.cerrar = false;
        g.fijo = false;
        inv.botonVR(g.bit, false);
        return;
      }
      if (!g.mant) return;
      g.mant = false;
      if (t - g.t0 < TOQUE_CORTO && !(inv.mascaraPad & g.bit)) {
        g.fijo = true;
        return;
      }
      inv.botonVR(g.bit, false);
    }
  }
  cuadro(e) {
    const oculto = !!(e.titulo || e.partida || e.xr || e.codec || e.gameOver || e.menu || e.catalogo || e.cine && !e.camara);
    const modo = e.camara ? "camara" : e.juego ? "juego" : e.museo ? "museo" : "explorar";
    if (oculto !== this._oculto) {
      this._oculto = oculto;
      this.raiz.hidden = oculto;
      if (oculto) this._soltarTodo();
    }
    if (modo !== this._modo) {
      this._modo = modo;
      this.raiz.dataset.modo = modo;
      document.body.classList.toggle("tac-juego", modo === "juego");
      if (modo !== "juego") this._soltarTodo(true);
    }
    const sinCam = e.xr || e.titulo || e.partida || !(e.camara || e.cine || e.juego) || !e.camara && (e.codec || e.radio || e.gameOver);
    if (this.cam && this.cam.hidden !== !!sinCam) this.cam.hidden = !!sinCam;
    if (oculto) return;
    const inv = this.c.inventario;
    for (const g of this.gat) {
      if (!g.fijo || !inv) continue;
      if (!(inv.toque & g.bit)) {
        g.fijo = false;
        g.cerrar = false;
      } else if (!inv.abierto && ++g.cuadros > 15) {
        g.fijo = false;
        inv.botonVR(g.bit, false);
      }
    }
    let d = 0;
    if (inv?.abierto && this.tac.joy != null) {
      const x = this.tac.x, y = this.tac.y;
      if (Math.max(Math.abs(x), Math.abs(y)) > .5) d = Math.abs(x) > Math.abs(y) ? x > 0 ? PAD.DER : PAD.IZQ : y > 0 ? PAD.ARRIBA : PAD.ABAJO;
    }
    if (d !== this.dirs && inv) {
      for (const b of DIRS) if ((d & b) !== (this.dirs & b)) inv.botonVR(b, !!(d & b));
      this.dirs = d;
    }
    const cruz = this._cruz || (this._cruz = this.raiz.querySelector('[data-b="cruz"]'));
    const p = this.c.postura?.() || 0;
    if (cruz && cruz._p !== p) {
      cruz._p = p;
      cruz.classList.toggle("fijo", p > 0);
      const s = cruz.querySelector("small");
      if (s) s.textContent = p ? "PARAR" : "AGACHAR";
    }
    const nj = !!inv?.sinArmas;
    if (nj !== this._ninja) {
      this._ninja = nj;
      this.raiz.classList.toggle("ninja", nj);
      const cu = this.raiz.querySelector('[data-b="cuadrado"] small');
      if (cu) cu.textContent = nj ? "ESPADA" : "ARMA";
      const r2 = this.raiz.querySelector('[data-b="r2"]');
      if (r2) r2.innerHTML = (nj ? "RAYO" : "ARMAS") + "<i>R2</i>";
    }
    this.ubicar();
  }
  _soltarTodo(menosPalanca = false) {
    const c = this.c, teclas = c.teclas;
    teclas.KeyE = false;
    teclas.KeyG = false;
    teclas.KeyC = false;
    if (this._gatillo) {
      this._gatillo = false;
      try {
        c.soltar();
      } catch {}
    }
    for (const g of this.gat) {
      if ((g.mant || g.fijo) && c.inventario) c.inventario.botonVR(g.bit, false);
      g.mant = g.fijo = g.cerrar = false;
    }
    if (this.dirs && c.inventario) {
      for (const b of DIRS) if (this.dirs & b) c.inventario.botonVR(b, false);
      this.dirs = 0;
    }
    for (const b of this.raiz.querySelectorAll("[data-b].on")) b.classList.remove("on");
    if (!menosPalanca) {
      this.tac.joy = null;
      this.tac.x = this.tac.y = 0;
      this.tac.correr = false;
      this.joy.classList.remove("on", "corre");
      this.perilla.style.transform = "";
    }
  }
  _seguras() {
    let s = this._sonda;
    if (!s) {
      s = this._sonda = document.createElement("div");
      s.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
      document.body.appendChild(s);
    }
    const cs = getComputedStyle(s);
    this.seg = {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0
    };
  }
  rectsHud() {
    const D = disposicionHud(), k = D.kcss, r = {};
    r.life = {
      x: (D.vida[0] - 1) * k,
      y: (D.vida[1] - 1) * k,
      w: 131 * k,
      h: 24 * k
    };
    r.radar = {
      x: (D.radar[0] - 1) * k,
      y: (D.radar[1] - 1) * k,
      w: 71 * k,
      h: 54 * k
    };
    r.item = {
      x: (D.item[0] - 4) * k,
      y: D.item[1] * k,
      w: 55 * k,
      h: 29 * k
    };
    r.arma = {
      x: D.arma[0] * k,
      y: D.arma[1] * k,
      w: 55 * k,
      h: 29 * k
    };
    for (const [n, sel] of [ [ "menu", "#mostrar" ], [ "codec", ".codec-boton" ] ]) {
      const el = $(sel);
      if (!el || !el.offsetParent) continue;
      const b = el.getBoundingClientRect();
      if (b.width) r[n] = {
        x: b.left,
        y: b.top,
        w: b.width,
        h: b.height
      };
    }
    return r;
  }
  ubicar() {
    const D = disposicionHud(), iw = innerWidth, ih = innerHeight, horizontal = iw > ih;
    const clave = `${D.clave}|${iw}x${ih}|${this.seg.t},${this.seg.r},${this.seg.b},${this.seg.l}|${!!$(".codec-boton")?.offsetParent}|${this._modo}`;
    if (clave === this._clave) return;
    this._clave = clave;
    if (horizontal && (!this.joy.getBoundingClientRect().width || !$("#rombo").getBoundingClientRect().width)) {
      this._clave = "";
      return;
    }
    for (const g of this.gat) {
      const b = this.raiz.querySelector(`[data-b="${g.k ? "r2" : "l2"}"]`);
      if (!b) continue;
      b.style.left = b.style.right = b.style.top = b.style.bottom = "";
      if (!horizontal) continue;
      const w = b.offsetWidth || 112, h = b.offsetHeight || 48, S = this.seg, m = 14;
      const x = g.k ? iw - S.r - m - w : S.l + m;
      const abajo = ((g.k ? 1 : 0) ^ (cfg.zurdo ? 1 : 0) ? $("#rombo") : this.joy).getBoundingClientRect();
      let y = S.t + 10;
      const hud = this.rectsHud();
      for (const r of Object.values(hud)) if (r.x < x + w && x < r.x + r.w && r.y < ih * .6) y = Math.max(y, r.y + r.h + 6);
      if (y + h > abajo.top - 2) {
        b.style.left = (g.k ? abajo.left - 10 - w : abajo.right + 10) + "px";
        b.style.top = Math.max(S.t + 10, abajo.top) + "px";
        b.style.bottom = "auto";
        continue;
      }
      b.style.left = x + "px";
      b.style.top = y + "px";
      b.style.bottom = "auto";
      b.style.right = "auto";
    }
  }
  estado() {
    return {
      x: +this.tac.x.toFixed(2),
      y: +this.tac.y.toFixed(2),
      correr: !!this.tac.correr,
      joy: this.tac.joy != null
    };
  }
  teclaE() {
    return !!this.c.teclas.KeyE;
  }
}
