// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, cargarAnim } from "./base.js";

import { cargarAnims } from "../anim.js";

import * as ctl from "../controles.js";

export const CENTRO_REX = [ 2500, 1e4, 500 ];

export function zonaBorde(x, z) {
  if (z >= 4751) return {
    zona: 0,
    dir: 2048
  };
  if (z < -1250) return {
    zona: 4,
    dir: 4072
  };
  if (x < -750) return {
    zona: 3,
    dir: 1024
  };
  if (x < 1250) return {
    zona: 2,
    dir: 1746
  };
  if (x < 2500) return {
    zona: 1,
    dir: 1152
  };
  if (x < 3250) return {
    zona: 7,
    dir: 2882
  };
  if (x >= 5500) return {
    zona: 5,
    dir: 3048
  };
  return {
    zona: 6,
    dir: 2321
  };
}

export const grupoZona = z => z === 0 || z === 1 || z === 3 ? 1 : z === 4 ? 2 : 0;

export class BordeREX {
  constructor(J) {
    this.J = J;
    const hz = J.ctx.hz;
    this.paredes = [];
    this.pisos = [];
    if (hz) for (const g of hz.grupos) {
      for (const w of g.paredes) this.paredes.push({
        a: w.a,
        b: w.b,
        y0: Math.min(w.a[1], w.b[1]),
        y1: Math.max(w.a[1], w.b[1]) + w.alto,
        flags: w.flags | 0
      });
      for (const f of g.pisos) this.pisos.push({
        q: f.puntos,
        atr: f.atr | 0
      });
    }
  }
  online(desde, hasta, segFlag) {
    const px = desde[0], pz = desde[2], qx = hasta[0], qz = hasta[2];
    let mejor = null;
    for (const w of this.paredes) {
      if (w.flags & segFlag) continue;
      const ax = w.a[0], az = w.a[2], bx = w.b[0], bz = w.b[2];
      const rx = qx - px, rz = qz - pz, sx = bx - ax, sz = bz - az, den = rx * sz - rz * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((ax - px) * sz - (az - pz) * sx) / den, u = ((ax - px) * rz - (az - pz) * rx) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const y = desde[1] + (hasta[1] - desde[1]) * t;
      if (y < w.y0 || y > w.y1) continue;
      if (!mejor || t < mejor.t) mejor = {
        t: t,
        pared: w,
        punto: [ px + rx * t, y, pz + rz * t ]
      };
    }
    return mejor;
  }
  cercano(p, radio, segFlag) {
    let mejor = null;
    for (const w of this.paredes) {
      if (w.flags & segFlag) continue;
      if (p[1] < w.y0 || p[1] > w.y1) continue;
      const ax = w.a[0], az = w.a[2], dx = w.b[0] - ax, dz = w.b[2] - az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[2] - az) * dz) / L2));
      const cx = ax + dx * t, cz = az + dz * t, d = Math.hypot(cx - p[0], cz - p[2]);
      if (d > radio) continue;
      if (!mejor || d < mejor.d) mejor = {
        d: d,
        v: [ Math.round(cx - p[0]), 0, Math.round(cz - p[2]) ],
        pared: w
      };
    }
    return mejor;
  }
  piso(x, z, y) {
    let mejor = null;
    const tri = (a, b, c) => {
      const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      if (Math.abs(d) < 1e-9) return null;
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d, v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d, w = 1 - u - v;
      if (u < -1e-4 || v < -1e-4 || w < -1e-4) return null;
      return u * a[1] + v * b[1] + w * c[1];
    };
    for (const f of this.pisos) {
      const q = f.q;
      let h = tri(q[0], q[1], q[2]);
      if (h === null) h = tri(q[0], q[2], q[3]);
      if (h !== null && h <= y + 600 && (!mejor || h > mejor.y)) mejor = {
        y: Math.round(h),
        atr: f.atr
      };
    }
    return mejor;
  }
  enElBorde(p, atrPiso) {
    if (atrPiso === 1) return true;
    return !!this.online(p, CENTRO_REX, 4);
  }
}

const ALTURA_POSTURA = [ 1100, 496, 136 ];

const TAM_BLANCO = [ 300, 750, 300 ];

const TECLAS_ARRIBA = new Set([ "ArrowUp", "KeyW" ]);

export class Snake18 extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "SNAKE18";
    this.registro = [];
    this.blanco = false;
    this.colgado = false;
    this.ej = null;
    this.ej_t = 0;
    this.lista = [];
    this.dirs = [];
    this.idx = 0;
    this.grupo = 0;
    this.zona = 0;
    this.piso0 = 0;
    this.reColgar = 0;
    this.invencible = 0;
    this.accionColgado = -1;
    this.frameAnim = 0;
    this.alturaAnim = 1100;
    this.cayendo = 0;
    this.teclas = {
      arriba: false,
      boton: false
    };
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 800) this.registro.shift();
  }
  async iniciar() {
    const [a18, datos] = await Promise.all([ cargarAnim("sne_18a"), cargarAnims("snake").catch(() => null) ]);
    this.anim = a18;
    this.claves = Object.keys(a18.clips);
    if (datos?.clips) for (const k of this.claves) {
      const c = a18.clips[k];
      datos.clips["sne_18a " + c.n] = c;
    }
    this.borde = new BordeREX(this.J);
    this.mgr.snake18 = this;
    const p = this.actor.p || this.opts.p, d = this.actor.d || this.opts.d;
    if (Array.isArray(p) && typeof p[0] === "number" && this.opts.sinUbicar !== true && !this.actor.sinUbicar) {
      const yaw = (Array.isArray(d) && typeof d[1] === "number" ? d[1] : 0) * ANG + Math.PI;
      const piso = this.borde.piso(p[0], p[2], p[1] + 1e3);
      const y = piso ? piso.y : p[1];
      if (this.ctx.ubicar) this.ctx.ubicar(p[0] * MM, y * MM, p[2] * MM, yaw); else this.J.ctx.rig.position.set(p[0] * MM, y * MM, p[2] * MM);
    }
    this.sinEquipo(true);
    this.instalar();
    this.log("aparece", {
      p: p ? p.slice(0, 3) : null
    });
  }
  sinEquipo(si) {
    const inv = this.J.ctx.inventario || this.ctx.inventario;
    if (!inv) return;
    if (si) {
      if (this.equipo) return;
      this.equipo = {
        dA: inv.deshabilitadas,
        dI: inv.deshabilitados,
        arma: inv.arma,
        item: inv.item
      };
      inv.deshabilitadas = 65535;
      inv.deshabilitados = 65535;
      inv.arma = -1;
      inv.item = -1;
    } else if (this.equipo) {
      const e = this.equipo;
      this.equipo = null;
      inv.deshabilitadas = e.dA;
      inv.deshabilitados = e.dI;
      if (inv.arma === -1) inv.arma = e.arma;
      if (inv.item === -1) inv.item = e.item;
    }
  }
  instalar() {
    const J = this.J, yo = this;
    if (typeof J.reaccionSnake === "function") {
      const r0 = J.reaccionSnake.bind(J);
      this._reac = r0;
      J.reaccionSnake = () => yo.vivo && yo.colgado && yo.accionColgado >= 0 ? {
        clip: "sne_18a " + yo.accionColgado,
        unaVez: yo.accionColgado % 3 !== 1,
        tipo: "colgado"
      } : r0();
    }
    if (typeof J.dañoSnake === "function") {
      const d0 = J.dañoSnake.bind(J);
      this._daño = d0;
      J.dañoSnake = (daño, aMode = 1, fuerza = null, punto = null) => {
        if (!yo.vivo) return d0(daño, aMode, fuerza, punto);
        if (yo.invencible || yo.cayendo) return false;
        if (yo.colgado) return yo.golpeColgado(daño, aMode, punto);
        return d0(daño, aMode, fuerza, punto);
      };
    }
    this._tecla = e => {
      if (TECLAS_ARRIBA.has(e.code)) this.teclas.arriba = true; else this.teclas.boton = true;
    };
    this._toque = () => {
      this.teclas.boton = true;
    };
    if (typeof addEventListener === "function") {
      addEventListener("keydown", this._tecla);
      addEventListener("pointerdown", this._toque);
    }
  }
  posicion() {
    const r = this.J.ctx.rig.position;
    if (this.colgado) return [ Math.round(r.x * 1e3), this.piso0 + this.alturaAnim, Math.round(r.z * 1e3) ];
    const p = this.J.postura?.() ?? 0;
    return [ Math.round(r.x * 1e3), Math.round(r.y * 1e3) + ALTURA_POSTURA[p], Math.round(r.z * 1e3) ];
  }
  status() {
    const J = this.J, S = J.sn || {}, p = J.postura?.() ?? 0;
    let s = 0;
    if (this.colgado) s |= 4; else {
      if (p === 1) s |= 32;
      if (p === 2) s |= 64;
    }
    const r = S.reac?.tipo;
    if (r === "sacudon" || r === "derribo" || this.golpeado > 0) s |= 256;
    if (r === "derribo" || r === "piso" || r === "levanta") s |= 512;
    if (S.combo || S.accion && S.accion.dur > 0 && !this.colgado) s |= 2048;
    return s;
  }
  vitality() {
    const inv = this.J.ctx.inventario;
    return Math.round(this.J.vida * (inv?.vidaMax || 256));
  }
  cuadro() {
    if (this.J.muerto && !this.cayendo) {
      this.teclas.arriba = this.teclas.boton = false;
      return;
    }
    if (this.golpeado > 0) this.golpeado--;
    if (this.invencible > 0) this.invencible--;
    this.leerMando();
    if (!this.colgado && !this.cayendo) this.Engancharse();
    if (this.accionColgado >= 0) this.avanzarAnim();
    if (this.ej) {
      const t = this.ej_t++;
      this.ej.call(this, t);
    }
    if (this.colgado || this.cayendo) this.ubicarColgado();
    this.teclas.arriba = this.teclas.boton = false;
  }
  leerMando() {
    let arriba = false, boton = false;
    try {
      const m = ctl.mando();
      if (m) {
        if (m.buttons[ctl.B.ARRIBA]?.pressed || (m.axes[1] ?? 0) < -.6) arriba = true;
        for (const i of [ ctl.B.CRUZ, ctl.B.CIRCULO, ctl.B.CUADRADO, ctl.B.TRIANGULO ]) if (m.buttons[i]?.pressed) boton = true;
      }
    } catch {}
    const ant = this._mandoAnt || {};
    if (arriba && !ant.arriba) this.teclas.arriba = true;
    if (boton && !ant.boton) this.teclas.boton = true;
    this._mandoAnt = {
      arriba: arriba,
      boton: boton
    };
  }
  nivel() {
    return this.dificultad();
  }
  Engancharse() {
    if (this.J.ctx.vuelo?.() || this.mgr.gameOverTimer() !== 0) return;
    const r = this.J.ctx.rig.position, x = Math.round(r.x * 1e3), z = Math.round(r.z * 1e3), yPies = Math.round(r.y * 1e3);
    const mov = [ x, yPies + ALTURA_POSTURA[this.J.postura?.() ?? 0], z ];
    const piso = this.borde.piso(x, z, yPies + 100);
    if (!this.borde.enElBorde(mov, piso?.atr ?? 0)) return;
    const {zona: zona, dir: dir} = zonaBorde(x, z);
    this.zona = zona;
    this.grupo = grupoZona(zona);
    const cerca = this.borde.cercano(mov, 5e3, zona & 1 ? 32 : 16);
    if (cerca) {
      mov[0] += cerca.v[0];
      mov[2] += cerca.v[2];
    } else this.log("borde: sin línea cercana");
    const abajo = this.borde.piso(mov[0], mov[2], yPies + 100);
    let levels0 = abajo ? abajo.y : yPies;
    if (levels0 < 5e3) {
      mov[0] = 2500;
      mov[2] = -1500;
      levels0 = 9600;
    }
    this.piso0 = levels0;
    this.pos0 = [ mov[0], mov[2] ];
    const g = this.grupo;
    this.lista = [ g * 3, g * 3 + 1, g * 3 + 2 ];
    this.dirs = [ dir, dir, dir ];
    this.log("se cuelga", {
      zona: zona,
      grupo: g,
      pos: [ mov[0], mov[2] ],
      piso: levels0,
      linea: cerca ? cerca.pared.flags : null
    });
    this.Colgarse();
  }
  Colgarse() {
    this.colgado = true;
    this.ej = this.E_Colgado;
    this.ej_t = 0;
    this.idx = 0;
    this.reColgar = 0;
    actualizarCongelado(this.mgr);
  }
  E_Colgado(t) {
    const g = this.grupo, nivel = this.nivel();
    if (nivel === 3) {
      if (t === 0 && this.mgr.gameOverTimer() === 0) {
        this.se(26, this.vec());
        this.cayendo = 1;
        this.log("cae (extremo)");
        this.mgr.gameOver();
      }
      if (t < 60) this.piso0 -= t * 16;
    }
    if (t === 0) {
      if (this.reColgar) {
        this.accion(this.lista[1]);
        this.ej_t = 120;
        this.idx = 1;
        this.quedan = 2;
      } else {
        this.accion(this.lista[0]);
        this.quedan = 3;
      }
      this.rumbo = this.dirs[this.idx];
      this.ponerInvencible(true);
    }
    const a = this.accionColgado, f = this.frameAnim;
    if (a % 3 === 0) {
      if (f === 1 && nivel !== 3) this.se(178, this.vec());
      if (f === 15 && nivel !== 3) this.se(24, this.vec());
      if (f === 2) this.vibrar([ [ 200, 4 ] ]);
    } else if (a % 3 === 2) {
      if (f === 1) this.vibrar([ [ 200, 3 ] ]);
      if (f === 12) this.se(179, this.vec());
    }
    let sigue = false;
    if (a === g * 3 + 1) {
      if (this.teclas.arriba && t >= 31 && t < 119) {
        this.ej_t = 120;
        this.log("arriba");
      }
      if (this.teclas.boton) this.ej_t++;
      if (nivel !== 3 && t >= 126) sigue = true;
    } else if (this.finAnim) sigue = true;
    if (!sigue) return;
    this.quedan--;
    if (this.quedan > 0) {
      this.idx++;
      this.rumbo = this.dirs[this.idx] ?? this.rumbo;
      this.accion(this.lista[this.idx]);
      if (this.lista[this.idx] === g * 3 + 1) this.ponerInvencible(false); else this.ponerInvencible(true);
      this.log("acción", {
        a: this.lista[this.idx]
      });
      return;
    }
    this.colgado = false;
    this.ej = null;
    this.accionColgado = -1;
    this.ponerInvencible(false);
    this.invencible = 24;
    const r = this.J.ctx.rig.position, piso = this.borde.piso(Math.round(r.x * 1e3), Math.round(r.z * 1e3), this.piso0 + 2600);
    r.y = (piso ? piso.y : this.piso0 + 1836) * MM;
    if (this.mgr.congelado) this.mgr.congelado.copy(r);
    actualizarCongelado(this.mgr);
    this.log("sube", {
      pos: [ Math.round(r.x * 1e3), Math.round(r.y * 1e3), Math.round(r.z * 1e3) ]
    });
  }
  golpeColgado(daño, aMode, punto) {
    const J = this.J, inv = J.ctx.inventario;
    J.vida -= daño / (inv?.vidaMax || 256);
    J.ctx.daño?.();
    this.se(38, this.vec());
    this.vibrar([ [ 225, 1 ], [ 255, 4 ] ]);
    this.golpeado = 15;
    const p = punto || new THREE.Vector3(...this.posicion().map(v => v * MM));
    J.sangre?.(p, 3);
    this.log("golpe colgado", {
      "daño": daño,
      vida: this.vitality()
    });
    if (J.vida <= 0 && !J.muerto) {
      this.colgado = false;
      this.ej = null;
      this.accionColgado = -1;
      actualizarCongelado(this.mgr);
      return true;
    }
    this.ej = this.E_GolpeColgado;
    this.ej_t = 0;
    this.ponerInvencible(true);
    return true;
  }
  E_GolpeColgado(t) {
    if (t === 0) this.accion(this.grupo + 9);
    if (this.finAnim) {
      this.ej = this.E_Colgado;
      this.ej_t = 0;
      this.reColgar = 1;
    }
  }
  ponerInvencible(si) {
    this.invencible = si ? -1 : 0;
  }
  accion(n) {
    this.accionColgado = n;
    this.frameAnim = 0;
    this.finAnim = false;
    this.tAnim = 0;
  }
  avanzarAnim() {
    const c = this.anim?.clips["anim " + this.accionColgado];
    if (!c) {
      this.finAnim = true;
      return;
    }
    const N = c.cuadros, loop = this.accionColgado % 3 === 1;
    const k = Math.min(this.frameAnim, N - 1);
    this.alturaAnim = c.altura[k] ?? 1100;
    const px = c.paso?.[k * 2] || 0, pz = c.paso?.[k * 2 + 1] || 0;
    if (px || pz) {
      const a = (this.rumbo || 0) * ANG, s = Math.sin(a), co = Math.cos(a);
      this.pos0[0] += px * co + pz * s;
      this.pos0[1] += -px * s + pz * co;
    }
    this.frameAnim++;
    this.finAnim = false;
    if (this.frameAnim >= N) {
      if (loop) this.frameAnim = 0; else {
        this.frameAnim = N - 1;
        this.finAnim = true;
      }
    }
  }
  ubicarColgado() {
    const r = this.J.ctx.rig.position;
    if (this.pos0) {
      r.x = this.pos0[0] * MM;
      r.z = this.pos0[1] * MM;
    }
    r.y = this.piso0 * MM;
    if (this.mgr.congelado) this.mgr.congelado.copy(r);
    if (this.rumbo != null && globalThis.__mgs && this.colgado) globalThis.__mgs.yaw = this.rumbo * ANG + Math.PI;
  }
  vec() {
    const p = this.posicion();
    return new THREE.Vector3(p[0], p[1], p[2]);
  }
  vibrar(patron) {
    try {
      this.J.vibrar?.(patron);
    } catch {}
  }
  estadoPrueba() {
    return {
      colgado: this.colgado,
      accion: this.accionColgado,
      frame: this.frameAnim,
      t: this.ej_t,
      grupo: this.grupo,
      zona: this.zona,
      piso0: this.piso0,
      altura: this.alturaAnim,
      invencible: this.invencible,
      status: this.status(),
      pos: this.posicion(),
      cayendo: this.cayendo
    };
  }
  destruir() {
    this.vivo = false;
    const J = this.J;
    if (this._reac) J.reaccionSnake = this._reac;
    if (this._daño) J.dañoSnake = this._daño;
    if (typeof removeEventListener === "function") {
      removeEventListener("keydown", this._tecla);
      removeEventListener("pointerdown", this._toque);
    }
    this.colgado = false;
    this.cayendo = 0;
    this.sinEquipo(false);
    if (this.mgr.snake18 === this) this.mgr.snake18 = null;
    actualizarCongelado(this.mgr);
  }
}

export function actualizarCongelado(mgr) {
  const si = !!(mgr.liquid?.vivo && mgr.liquid.padRelease || mgr.snake18?.vivo && (mgr.snake18.colgado || mgr.snake18.cayendo));
  if (mgr.__congeladoS18 === si) return;
  mgr.__congeladoS18 = si;
  mgr.congelar(si);
}
