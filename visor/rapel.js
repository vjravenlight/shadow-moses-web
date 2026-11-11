// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { sonido } from "./juego.js";

import * as ctl from "./controles.js";

import { cargarAnims } from "./anim.js";

import { agregarPiso, alturaEn, techoEn } from "./torres.js";

const MM = .001, ANG = Math.PI * 2 / 4096;

const and12 = a => (a % 4096 + 4096) % 4096;

const s16 = v => ((v | 0) & 65535 ^ 32768) - 32768;

const rsin = a => Math.trunc(4096 * Math.sin(a * ANG));

const rcos = a => Math.trunc(4096 * Math.cos(a * ANG));

const ratan2 = (y, x) => Math.round(Math.atan2(y, x) / ANG);

const isqrt = n => n > 0 ? Math.floor(Math.sqrt(n)) : 0;

const t12 = v => Math.trunc(v / 4096);

const TIME_INV = [ 0, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256 ];

const nearTime = (f, t, i) => {
  const k = TIME_INV[Math.min(15, Math.max(0, i))];
  return k === 0 ? t : Math.trunc((t - f) * k / 4096) + f;
};

const nearExp = (f, t, n) => {
  const d = t - f;
  return d > -n && d < n ? t : f + Math.trunc(d / n);
};

const nearPhase = (f, t) => {
  let d = f - t & 4095;
  if (d > 2048) d -= 4096;
  return t + d;
};

const diffDirS = (f, t) => {
  const d = t - f & 4095;
  return d <= 2048 ? d : d - 4096;
};

const vecDir2 = (x, z) => ratan2(x, z) & 4095;

const vecLen3 = v => isqrt(v.x * v.x + v.y * v.y + v.z * v.z);

const lenVec3 = (v, l1, l2) => {
  const k = Math.trunc(l2 * 4096 / (l1 || 1));
  return {
    x: Math.trunc(v.x * k / 4096),
    y: Math.trunc(v.y * k / 4096),
    z: Math.trunc(v.z * k / 4096)
  };
};

const randU = n => Math.floor(Math.random() * n);

const randS = n => Math.floor(Math.random() * n * 2) - n;

const clampAbs = (v, m) => v > m ? m : v < -m ? -m : v;

const V3 = (x = 0, y = 0, z = 0) => ({
  x: x,
  y: y,
  z: z
});

const acercar = (o, k, t, paso) => {
  const v = o[k], d = t - v;
  o[k] = d < -paso ? v - paso : d > paso ? v + paso : t;
  return o[k] === t;
};

const hashDe = x => x && typeof x === "object" && "id" in x ? x.id : typeof x === "number" ? x : null;

const procDe = x => x && typeof x === "object" && "proc" in x ? x.proc : typeof x === "number" ? x : 0;

const strcode = t => {
  let id = 0;
  for (const c of (new TextEncoder).encode(t || "")) id = (id << 5 | id >> 11) + c & 65535;
  return id;
};

const P = {
  L2: 1,
  R2: 2,
  L1: 4,
  R1: 8,
  TRI: 16,
  CIR: 32,
  CRO: 64,
  SQU: 128,
  UP: 4096,
  RIGHT: 8192,
  DOWN: 16384,
  LEFT: 32768
};

const TECLAS = {
  ArrowUp: P.UP,
  KeyW: P.UP,
  ArrowDown: P.DOWN,
  KeyS: P.DOWN,
  ArrowLeft: P.LEFT,
  KeyA: P.LEFT,
  ArrowRight: P.RIGHT,
  KeyD: P.RIGHT,
  KeyG: P.CIR,
  Enter: P.CIR,
  KeyC: P.CRO,
  Space: P.CRO,
  KeyX: P.CRO
};

class Pad {
  constructor() {
    this.status = 0;
    this.press = 0;
    this.release = 0;
    this.teclas = 0;
    this.mando = 0;
    this.ant = 0;
    this.extra = 0;
    this.activo = false;
  }
  escuchar(si) {
    if (typeof window === "undefined") return;
    if (si && !this._kd) {
      this._kd = e => {
        const b = TECLAS[e.code];
        if (b === undefined || !this.activo) return;
        e.preventDefault();
        this.teclas |= b;
        e.stopImmediatePropagation();
      };
      this._ku = e => {
        const b = TECLAS[e.code];
        if (b !== undefined) this.teclas &= ~b;
      };
      addEventListener("keydown", this._kd, true);
      addEventListener("keyup", this._ku, true);
    } else if (!si && this._kd) {
      removeEventListener("keydown", this._kd, true);
      removeEventListener("keyup", this._ku, true);
      this._kd = this._ku = null;
      this.teclas = 0;
    }
  }
  leer() {
    let m = 0;
    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      const gp = ctl.mando();
      if (gp) {
        const b = i => !!gp.buttons[i]?.pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (b(ctl.B.ARRIBA) || ay < -.5) m |= P.UP;
        if (b(ctl.B.ABAJO) || ay > .5) m |= P.DOWN;
        if (b(ctl.B.IZQ) || ax < -.5) m |= P.LEFT;
        if (b(ctl.B.DER) || ax > .5) m |= P.RIGHT;
        if (b(ctl.B.CIRCULO)) m |= P.CIR;
        if (b(ctl.B.CRUZ)) m |= P.CRO;
        if (b(ctl.B.TRIANGULO)) m |= P.TRI;
      }
    }
    const s = this.teclas | m | this.extra;
    this.press = s & ~this.ant;
    this.release = this.ant & ~s;
    this.status = s;
    this.ant = s;
    return this;
  }
}

class MapaHzd {
  constructor(hz) {
    this.suelo = {
      pisos: [],
      grilla: new Map
    };
    this.paredes = [];
    for (const g of hz?.grupos || []) {
      for (const f of g.pisos) agregarPiso(this.suelo, f.puntos.map(p => [ p[0] * MM, p[1] * MM, p[2] * MM ]));
      for (const w of g.paredes) this.paredes.push({
        ax: w.a[0],
        ay: w.a[1],
        az: w.a[2],
        bx: w.b[0],
        by: w.b[1],
        bz: w.b[2],
        alto: w.alto,
        flags: w.flags | 0
      });
    }
  }
  niveles(x, z, y) {
    const p = alturaEn(this.suelo, x * MM, z * MM, y * MM - .6), t = techoEn(this.suelo, x * MM, z * MM, y * MM);
    return {
      f: (p != null ? 1 : 0) | (t != null ? 2 : 0),
      piso: p != null ? Math.round(p * 1e3) : 0,
      techo: t != null ? Math.round(t * 1e3) : 0
    };
  }
  cerca(x, y, z, dist, segFlag) {
    const out = [];
    for (const w of this.paredes) {
      if (w.flags & segFlag) continue;
      const dx = w.bx - w.ax, dz = w.bz - w.az, L = dx * dx + dz * dz;
      let t = L ? ((x - w.ax) * dx + (z - w.az) * dz) / L : 0;
      t = Math.max(0, Math.min(1, t));
      const yb = w.ay + (w.by - w.ay) * t;
      if (y < yb || y > yb + w.alto) continue;
      const cx = w.ax + dx * t, cz = w.az + dz * t, nx = x - cx, nz = z - cz, d = Math.hypot(nx, nz);
      if (d <= dist) out.push({
        w: w,
        d: d,
        nx: nx,
        nz: nz
      });
      if (out.length >= 2) break;
    }
    return out;
  }
  reaccion(toques, r) {
    let x = 0, z = 0;
    for (const t of toques) {
      if (t.d >= r) continue;
      const k = t.d > 1e-6 ? (r - t.d) / t.d : 0;
      x += t.nx * k;
      z += t.nz * k;
    }
    return {
      x: Math.round(x),
      z: Math.round(z)
    };
  }
  corte(a, b, segFlag = 0) {
    let mejor = null;
    for (const w of this.paredes) {
      if (w.flags & segFlag) continue;
      const rx = b.x - a.x, rz = b.z - a.z, sx = w.bx - w.ax, sz = w.bz - w.az, den = rx * sz - rz * sx;
      if (Math.abs(den) < 1e-9) continue;
      const qx = w.ax - a.x, qz = w.az - a.z, t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const y = a.y + (b.y - a.y) * t, yb = w.ay + (w.by - w.ay) * u;
      if (y < yb || y > yb + w.alto) continue;
      if (!mejor || t < mejor.t) mejor = {
        t: t,
        p: V3(Math.round(a.x + rx * t), Math.round(y), Math.round(a.z + rz * t))
      };
    }
    return mejor;
  }
}

function segmentoCaja(a, b, c, t) {
  let t0 = 0, t1 = 1;
  for (const k of [ "x", "y", "z" ]) {
    const d = b[k] - a[k], lo = c[k] - t[k], hi = c[k] + t[k];
    if (Math.abs(d) < 1e-9) {
      if (a[k] < lo || a[k] > hi) return false;
      continue;
    }
    let u0 = (lo - a[k]) / d, u1 = (hi - a[k]) / d;
    if (u0 > u1) [u0, u1] = [ u1, u0 ];
    t0 = Math.max(t0, u0);
    t1 = Math.min(t1, u1);
    if (t0 > t1) return false;
  }
  return true;
}

class Pendulo {
  constructor(g, ancla, eje) {
    this.A = 0;
    this.th0 = 0;
    this.dir = 0;
    this.g = g;
    this.v = 0;
    this.d = 0;
    this.dy = 0;
    this.ang = 0;
    this.ant = 0;
    this.At = 0;
    this.th0t = 0;
    this.n = 0;
    this.ancla = ancla;
    this.eje = eje;
  }
  cero() {
    this.n = 0;
    this.A = 0;
    this.dir = 0;
    this.v = 0;
    this.ant = 0;
    this.th0 = 0;
    this.At = 0;
    this.th0t = 0;
  }
}

const ALTO_CONTROL = 1086;

const ACCION_UNA_VEZ = new Set([ 5, 7, 9, 13, 14, 15 ]);

export class Cuerda {
  constructor(actor, rap) {
    this.actor = actor;
    this.rap = rap;
    this.J = rap.J;
    this.ctx = rap.ctx;
    this.hzd = rap.hzd;
    this.registro = [];
    const o = actor.opts || {}, n3 = (k, d) => {
      const v = (o[k] || []).filter(x => typeof x === "number");
      return v.length >= 3 ? v.slice(0, 3) : d;
    };
    const p = n3("p", [ -3e3, 23e3, -13500 ]), d = n3("d", [ 0, 2048, 0 ]);
    this.mov = V3(...p);
    this.rot = V3(...d);
    this.turn = V3(...d);
    this.step = V3();
    this.interp = 0;
    this.height = ALTO_CONTROL;
    this.rSphere = 450;
    this.segFlag = 1;
    this.skipTrap = false;
    this.grounded = 0;
    this.nTouch = 0;
    this.levels = [ 0, 0 ];
    const i = n3("i", [ -7e3, -15e3, 0 ]), a = (o.a || []).filter(x => typeof x === "number"), r = n3("r", [ -3e3, 3e4, 600 ]);
    this.F84 = i[0];
    this.F86 = i[1];
    this.F88 = i[2];
    this.F8C = a[0] ?? 6e3;
    this.F8E = a[1] ?? 26e3;
    this.F94 = r[0];
    this.F96 = r[1];
    this.F98 = r[2];
    this.ymax = this.F8E;
    this.ymin = this.F86;
    this.xmax = this.F8C;
    this.xmin = this.F84;
    this.alturas = (o.h || []).filter(x => typeof x === "number").slice(0, 16);
    const cc = (o.c || []).filter(x => typeof x === "number");
    this.camaras = [];
    for (let k = 0; k + 2 < cc.length && this.camaras.length < 16; k += 3) this.camaras.push(V3(cc[k], cc[k + 1], cc[k + 2]));
    this.FA0 = 0;
    this.procsW = (o.w || []).map(procDe);
    this.voces = (o.v || []).filter(x => typeof x === "number");
    this.procE = procDe((o.e || [])[0]) || -1;
    this.nombreHind = hashDe((o.n || [])[0]) || 0;
    this.blanco = {
      lado: "jugador",
      centro: V3(),
      tam: V3(300, 900, 300),
      power: true,
      damaged: 0,
      aMode: 0,
      "daño": 0
    };
    this.c1 = new Pendulo(24, this.F94, "x");
    this.c2 = new Pendulo(64, this.F98, "z");
    this.F40 = 1e4;
    this.F44 = 450;
    this.F46 = 0;
    this.F50 = V3();
    this.F58 = V3();
    this.F60 = 0;
    this.F64 = 0;
    this.F68 = 0;
    this.F6C = 0;
    this.F70 = 0;
    this.F74 = 0;
    this.F78 = 0;
    this.F7C = 0;
    this.EB4 = 0;
    this.EB8 = 0;
    this.EBC = 0;
    this.EBE = 0;
    this.EC2 = 0;
    this.EC4 = 0;
    this.f1074 = 0;
    this.f1076 = 0;
    this.E9C = 0;
    this.ant808 = V3(...p);
    this.estado = this.s6544;
    this.EB0 = 0;
    this.accion = 0;
    this.accionCambio = 0;
    this.tAccion = 0;
    this.isEnd = 0;
    this.frame = 0;
    this.pad = new Pad;
    this.vivo = true;
    this.muriendo = false;
    this.voxCola = [];
    this.voxDemora = 0;
    this.voxSig = 0;
  }
  log(t, d = {}) {
    this.registro.push({
      t: t,
      f: this.rap.frame,
      y: this.mov.y,
      ...d
    });
    if (this.registro.length > 300) this.registro.shift();
  }
  ir(fn) {
    this.estado = fn;
    this.EB0 = 0;
    this.EBE = 0;
    this.EBC = 0;
    this.log("estado", {
      fn: fn.name
    });
  }
  ponerAccion(n) {
    if (this.accion !== n) {
      this.accion = n;
      this.accionCambio++;
      this.tAccion = 0;
      this.isEnd = 0;
    }
  }
  clipDatos() {
    return this.rap.anim11d?.clips?.["anim " + this.accion] || null;
  }
  avanzarMotion() {
    const c = this.clipDatos(), n = c?.cuadros || 1;
    this.isEnd = 0;
    if (this.tAccion >= n - 1) {
      this.isEnd = 1;
      if (!ACCION_UNA_VEZ.has(this.accion)) this.tAccion = 0;
    } else this.tAccion++;
    this.frame = Math.min(n - 1, this.tAccion);
    this.bodyHeight = c?.altura?.[this.frame] ?? ALTO_CONTROL;
  }
  vidaMax() {
    return this.J.ctx.inventario?.vidaMax || 256;
  }
  vital() {
    return Math.round(this.J.vida * this.vidaMax());
  }
  cuadro() {
    if (!this.vivo) return;
    const J = this.J;
    this.pad.activo = true;
    this.pad.leer();
    this.avanzarMotion();
    if (this.vital() <= 0) this.skipTrap = true;
    this.height = this.F74 & 33554432 ? this.bodyHeight : ALTO_CONTROL;
    this.control();
    this.f4274();
    if (this.F44 > 0 || this.F46 > 0) this.F46 = nearExp(this.F46, this.F44, 4);
    this.blanco.centro = {
      ...this.mov
    };
    this.f4404();
    this.step = V3();
    this.f44A4();
    this.f4648();
    this.f481C();
    this.f44F0();
    this.f5348();
    this.f48EC();
    this.f4B78();
    this.f4ECC();
    this.f6478();
    this.estado(this.EB0++);
    this.f5E74();
    this.f502C();
    this.f5410();
    this.voxTick();
    this.ubicarRig();
  }
  control() {
    const m = this.mov, s = this.step, H = this.hzd;
    m.x += s.x;
    m.z += s.z;
    this.nTouch = 0;
    if (this.rSphere > 0 && H) {
      let t = H.cerca(m.x, m.y - 496, m.z, 500, this.segFlag);
      if (!t.length) t = H.cerca(m.x, m.y, m.z, 500, this.segFlag);
      if (!t.length) t = H.cerca(m.x, m.y + 496, m.z, 500, this.segFlag);
      if (t.length) {
        this.nTouch = t.length;
        const r = H.reaccion(t, this.rSphere);
        m.x += r.x;
        if (r.z > 0) m.z += r.z;
      }
    }
    if (m.x < this.xmin) m.x = this.xmin; else if (m.x > this.xmax) m.x = this.xmax;
    if (this.interp === 0) {
      for (const k of [ "x", "y", "z" ]) this.rot[k] = s16(nearExp(nearPhase(this.rot[k], this.turn[k]), this.turn[k], 4));
    } else {
      for (const k of [ "x", "y", "z" ]) this.rot[k] = s16(nearTime(nearPhase(this.rot[k], this.turn[k]), this.turn[k], this.interp));
      this.interp--;
    }
    if (this.rSphere < -1 || !H) {
      m.y += s.y;
      return;
    }
    let y = m.y + s.y, g4 = 0;
    const h = this.height;
    this.grounded = 0;
    const L = H.niveles(m.x, m.z, m.y);
    const piso = L.f & 1 ? L.piso : this.ymin, techo = L.f & 2 ? L.techo : this.ymax;
    const lim = L.f & 1 ? h + piso : h;
    if (y < lim) {
      y = lim;
      this.grounded |= 1;
      g4 = 1;
    }
    if (L.f & 2) {
      const v = techo - Math.trunc(3 * h / 4);
      if (v < y) {
        y = v;
        this.grounded |= 2;
        g4 |= 2;
      }
    }
    this.levels = [ piso, techo ];
    if (this.ymax < y) {
      y = this.ymax;
      this.grounded |= 2;
      g4 |= 2;
    } else if (y < this.ymin) y = this.ymin;
    if (g4 === 3) m.x -= s.x;
    m.y = y;
  }
  f4274() {
    if (this.F70 & 128) {
      const t = V3(0, this.turn.y, 0);
      for (const k of [ "x", "y", "z" ]) this.F58[k] = s16(nearExp(nearPhase(this.F58[k], t[k]), t[k], 4));
      this.rotCuerpo = {
        ...this.F58
      };
    } else this.rotCuerpo = {
      ...this.rot
    };
  }
  f4404() {
    if (this.F60 < 0 || this.estado === this.s7138) return;
    const objetivo = this.blanco.tam.y === 200 ? this.mov.y - 250 : this.mov.y - 950, d = objetivo - this.levels[0];
    if (d > 0 && d < 500) this.mov.y -= d; else if (d < 0 && d >= -499) this.mov.y += d;
  }
  f44A4() {
    this.F74 &= ~2;
    if (this.F70 & 8192) return;
    const H = this.rap.hind;
    if (H && H.vivo && H.mov.z > this.F88) this.F74 |= 2;
  }
  f4648() {
    if (this.estado === this.s6544 || this.F70 & 4096) return;
    const cam = this.rap.cam();
    if (!cam || !this.camaras.length) return;
    let i = this.FA0;
    const n = this.camaras.length;
    if ((this.alturas[i] ?? -1e9) < this.mov.y) {
      if (i > 0) i--;
    } else if (i !== n - 1 && this.mov.y < (this.alturas[i + 1] ?? -1e9)) i++;
    this.FA0 = i;
    const t = this.camaras[i], S = cam.S;
    const dz = clampAbs(t.z - S.track, 64);
    S.track += dz;
    this.rap.camTrack(cam, S.track);
    const dx = Math.abs(t.x - S.rot.x) >= 9 ? Math.sign(t.x - S.rot.x) * 8 : t.x - S.rot.x, dy = Math.abs(t.y - S.rot.y) >= 9 ? Math.sign(t.y - S.rot.y) * 8 : t.y - S.rot.y;
    this.rap.camRot(cam, V3(S.rot.x + dx, S.rot.y + dy, S.rot.z));
  }
  f481C() {
    const cam = this.rap.cam();
    if (!cam) return;
    this.rap.camRot(cam, V3(cam.S.rot.x, Math.trunc(this.c1.d / 48) + 2048, cam.S.rot.z));
  }
  f44F0() {
    const fp = this.rap.primeraPersona();
    if (fp) this.F70 |= 4096; else this.F70 &= ~4096;
  }
  f5348() {
    if (!this.rap.adentroDe(strcode("to_s11i"))) return;
    this.invulnerable(0);
    if (this.blanco.damaged & 4) {
      this.blanco.damaged = 0;
      this.blanco.daño = 0;
    }
  }
  invulnerable(n) {
    this.F7C = n;
    this.F70 |= 32768;
    this.blanco.power = false;
  }
  invulnerable32() {
    this.invulnerable(32);
  }
  vulnerable() {
    this.F70 &= ~32768;
    this.blanco.power = true;
  }
  f48EC() {
    if (this.F70 & 8448) return;
    const T = this.blanco;
    if (this.F70 & 32768) {
      if (this.F7C > 0) {
        this.F7C--;
        if (this.F7C > 0) {
          if (!(this.F70 & 4096)) this.parpadeo = (this.F7C & 3) !== 0; else this.rap.temblorCam(randU(16) * this.F7C);
        } else {
          this.parpadeo = false;
          this.vulnerable();
        }
      }
    }
    if (!(T.damaged & 4)) return;
    if (T.aMode === 2) {
      this.rap.vibrar([ 130, 2 ], 1);
      this.F44 = 0;
    } else {
      this.rap.vibrar([ 127, 2 ], 1);
      this.rap.sangre(this.mov);
      this.F44 = 0;
    }
    this.J.vida -= T.daño / this.vidaMax();
    this.J.ctx.daño?.();
    T.damaged = 0;
    T.daño = 0;
    T.aMode = 0;
    this.log("golpe", {
      vida: this.vital()
    });
    if (this.vital() <= 0) {
      this.J.vida = Math.max(this.J.vida, 1e-6);
      this.muriendo = true;
      this.ir(this.s7F8C);
      return;
    }
    if (this.F70 & 4096) {
      this.invulnerable32();
      sonido(25, this.posM());
      return;
    }
    this.ir(this.F74 & 8192 ? this.s7A4C : this.s7B2C);
    T.tam.y = 900;
  }
  f4B78() {
    this.F74 &= 4293890047;
    if (this.F60 < 0) this.F60++;
    if (this.grounded & 1 && this.F60 === 0) this.F74 |= 8192;
    if (this.F64 < 0) this.F64++;
    if (this.grounded & 2 && this.F64 === 0) this.F74 |= 4096;
    if (this.F68 < 0) this.F68++;
    if (this.nTouch && this.F68 === 0) this.F74 |= 16384;
    this.F74 |= 48;
    const dy = this.F96 - this.mov.y;
    const dx = this.mov.x - this.c1.ancla, a1 = ratan2(dx, dy);
    if (!(this.F74 & 16384)) this.F74 &= ~32;
    this.c1.ang = a1;
    this.c1.d = dx;
    this.c1.dy = dy;
    this.turn.z = s16(-a1);
    const dz = this.mov.z - this.c2.ancla, a2 = ratan2(dz, dy);
    if (!(this.F74 & 16384)) this.F74 &= ~16;
    this.c2.ang = a2;
    this.c2.d = dz;
    this.c2.dy = dy;
    this.turn.x = s16(a2);
    this.F40 = isqrt((dx >> 2) ** 2 + (dy >> 2) ** 2 + (dz >> 2) ** 2) * 4;
  }
  f4ECC() {}
  f6478() {
    const p = this.pad;
    if (p.press & P.CRO) this.F6C = -8;
    if (this.F6C < 0) this.F6C++;
    if (!(p.status & P.CRO)) this.F74 &= ~2097152;
    if (!(p.status & P.CIR)) this.F74 &= ~4194304;
  }
  f4DE0() {
    const fl = this.F74;
    this.F74 = fl & ~16908288;
    if (!(fl & 16) || this.F74 & 2097152 || this.F6C >= 0) return false;
    this.F74 |= 2097152;
    this.EB4 = 0;
    const s = this.pad.status;
    if (s & P.RIGHT) this.EB4 = 1; else if (s & P.LEFT) this.EB4 = -1;
    if (s & P.DOWN) this.F74 |= 131072; else if (s & P.UP) this.F74 |= 16777216;
    if (this.F7C === 0) this.invulnerable(0);
    return true;
  }
  f4F84() {
    const s = this.pad.status;
    if (!(s & (P.LEFT | P.RIGHT))) return false;
    this.EB4 = s & P.RIGHT ? 1 : -1;
    return true;
  }
  f4FC8() {
    const s = this.pad.status;
    return !(s & P.RIGHT) && this.EB4 === 1 || !(s & P.LEFT) && this.EB4 === -1;
  }
  f5298() {
    if (!(this.F74 & 16384) || this.F74 & 4096 || this.F74 & 4194304) return false;
    if (this.pad.status & P.CIR) {
      this.F74 |= 4194304;
      return true;
    }
    return false;
  }
  f52F0() {
    if (this.F74 & P.RIGHT) return false;
    const s = this.pad.status;
    if (!(s & (P.LEFT | P.RIGHT))) return false;
    this.EB4 = s & P.RIGHT ? 1 : -1;
    return true;
  }
  f6240() {
    this.turn.y = 2048;
    this.rot.z = 0;
    this.rot.x = 0;
    this.F70 &= ~128;
  }
  pegarPared() {
    this.mov.z = nearExp(this.mov.z, this.F98, 4);
  }
  vibracionAterrizaje() {
    this.rap.vibrar([ 127, 1 ], 1);
    this.rap.vibrar([ 210, 2 ], 2);
  }
  aterrizar() {
    this.rap.se(178, this.mov);
    this.vibracionAterrizaje();
  }
  s6544(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.rap.cine(true);
      this.rap.camRot(this.rap.cam(), V3(-680, 2048, 0));
      this.rap.camTrack(this.rap.cam(), 2300);
      this.F70 |= 2;
      this.ponerAccion(17);
      this.EBE = 2300;
      this.invulnerable(0);
      this.voxInit();
      this.voxDemorada(this.voces[1], 4);
    }
    this.voxTick0 = true;
    if (this.EBC === 0) {
      if (this.EBE < 16e3) {
        this.EBE += 96;
        this.rap.camTrack(this.rap.cam(), this.EBE);
      }
      if (this.F74 & 8192) {
        this.vibracionAterrizaje();
        this.rap.se(178, this.mov);
        this.ponerAccion(11);
        this.EBE = 0;
        this.F44 = 0;
        this.EBC = 1;
      }
      this.step.y -= 12;
    } else if (this.EBC === 1) {
      this.pegarPared();
      if (++this.EBE === 60) {
        this.rap.proc(this.procsW[0]);
        this.EBC = 2;
      }
    } else if (this.EBC === 2) {
      this.EBE++;
      if (this.EBE === 190) this.rap.proc(this.procsW[1]);
      if (this.EBE === 196) {
        const H = this.rap.hind;
        if (H) this.rap.se(188, H.mov);
      }
      if (this.EBE === 100) this.voxCola.push(this.voces[3]);
      if (this.EBE === 280) {
        this.rap.proc(this.procsW[2]);
        this.ir(this.s6834);
        this.rap.cine(false);
        this.vulnerable();
        this.log("control");
      }
    }
  }
  s6834(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.F58 = {
        ...this.rot
      };
      this.F70 = this.F70 & ~255 | 128;
      this.F74 &= ~3840;
      this.c1.cero();
      this.c2.cero();
      this.ponerAccion(11);
      this.F44 = 0;
    }
    this.pegarPared();
    if (this.f5298()) {
      this.f6240();
      this.rap.se(183, this.mov);
      this.ir(this.s6B18);
      return;
    }
    if (this.f4DE0()) {
      this.f6240();
      this.ir(this.s766C);
      return;
    }
    if (this.f4F84()) {
      this.ir(this.s697C);
      return;
    }
    this.step.y -= 128;
  }
  s697C(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.F70 = this.F70 & ~255 | 128;
      this.ponerAccion(12);
      this.turn.y = this.EB4 === 1 ? 1024 : -1024;
      this.F44 = 0;
    }
    this.pegarPared();
    if (this.f4DE0()) {
      this.f6240();
      this.ir(this.s766C);
      return;
    }
    if (this.f4FC8()) {
      this.ir(this.s6834);
      return;
    }
    if (this.f5298()) {
      this.f6240();
      this.rap.se(183, this.mov);
      this.ir(this.s6B18);
      return;
    }
    this.step.y -= 128;
    const x = this.mov.x + this.EB4 * 80;
    if (!(x < this.F84 || this.F8C < x)) this.step.x += this.EB4 * 80;
  }
  s6B18(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.F70 = this.F70 & ~255 | 1;
      this.ponerAccion(7);
      this.EB8 = 0;
      this.EB4 = 0;
      this.blanco.tam.y = 200;
      this.turn.y = 2048;
      this.F44 = 450;
    }
    if (t < 4) {
      this.EBC++;
      this.step.y += 80;
    }
    if (this.isEnd) {
      this.ir(this.s6CD4);
      return;
    }
    if (!(this.pad.status & P.CIR)) {
      this.F68 = -4;
      if (this.EBC >= 5) this.EBC = 4;
      this.EBE = 1;
    }
    if (this.EBE === 1) {
      this.step.y -= 80;
      if (--this.EBC === 0) {
        this.blanco.tam.y = 900;
        if (this.F74 & 8192) {
          this.rap.se(178, this.mov);
          this.vibracionAterrizaje();
          this.ir(this.s6834);
        } else this.ir(this.s7530);
      }
    }
    this.step.z -= 108;
  }
  s6CD4(t) {
    if (t === 0) {
      this.ponerAccion(8);
      this.F74 |= 65536;
      this.EB8 = 0;
      this.EB4 = 0;
      this.blanco.tam.y = 200;
      this.turn.y = 2048;
      this.EBC = 4;
      this.F44 = 450;
    }
    if (this.f4DE0()) {
      this.blanco.tam.y = 900;
      this.ir(this.s766C);
      this.F74 &= ~4194304;
      return;
    }
    const s = this.pad.status;
    if (!(this.F74 & 4096) && s & P.UP) {
      this.blanco.tam.y = 900;
      this.ir(this.s7138);
      return;
    }
    if (!(this.F74 & 8192) && s & P.DOWN) {
      this.blanco.tam.y = 900;
      this.ir(this.s7320);
      return;
    }
    if (this.f52F0()) {
      this.blanco.tam.y = 900;
      this.ir(this.s6F28);
      return;
    }
    if (!(s & P.CIR)) {
      this.F68 = -4;
      this.EBE = 1;
    }
    if (this.EBE === 1 && --this.EBC === 0) {
      this.blanco.tam.y = 900;
      if (this.F74 & 8192) {
        this.rap.se(178, this.mov);
        this.vibracionAterrizaje();
        this.ir(this.s6834);
      } else this.ir(this.s7530);
    }
    this.step.z -= 108;
  }
  s6F28(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.F70 = this.F70 & ~255 | 16;
      this.ponerAccion(this.EB4 === 1 ? 2 : 3);
      this.F44 = 450;
    }
    if (this.f4DE0()) {
      this.ir(this.s766C);
      return;
    }
    if (!this.f52F0()) {
      if (this.F74 & 8192) {
        this.rap.se(178, this.mov);
        this.vibracionAterrizaje();
        this.ir(this.s6834);
      } else this.ir(this.s6CD4);
      return;
    }
    this.ponerAccion(this.EB4 === 1 ? 2 : 3);
    if (!(this.pad.status & P.CIR)) {
      this.ir(this.s7530);
      return;
    }
    if (this.F74 & 4096) return;
    const dx = this.EB4 * 64, x = this.mov.x + dx;
    if (x < this.F84 || this.F8C < x) return;
    this.step.x += dx;
    this.step.z -= 108;
    if (this.pad.status & P.UP) this.step.y += 12; else if (this.pad.status & P.DOWN) this.step.y -= 12;
  }
  s7138(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.F70 = this.F70 & ~255 | 32;
      this.ponerAccion(16);
      this.F44 = 0;
    }
    if (this.f4DE0()) {
      this.ir(this.s766C);
      return;
    }
    if (this.f52F0()) {
      this.ir(this.s6F28);
      return;
    }
    if (this.F74 & 4096 || !(this.pad.status & P.UP)) {
      this.ir(this.s6CD4);
      return;
    }
    if (!(this.pad.status & P.CIR)) {
      if (this.F74 & 8192) {
        this.rap.se(178, this.mov);
        this.vibracionAterrizaje();
        this.ir(this.s6834);
      } else this.ir(this.s7530);
      return;
    }
    if (this.F40 > 1e4) {
      this.step.x += t12(this.c1.dir * 12 * rsin(this.c1.ang));
      this.step.y += t12(rcos(this.c1.ang) * 12);
    }
    this.step.z -= 108;
  }
  s7320(t) {
    if (t === 0) {
      this.F74 |= 65536;
      this.F70 = this.F70 & ~255 | 32;
      this.ponerAccion(17);
      this.F44 = 0;
    }
    if (this.f4DE0()) {
      this.ir(this.s766C);
      return;
    }
    if (this.f52F0()) {
      this.ir(this.s6F28);
      return;
    }
    if (this.F74 & 8192 || !(this.pad.status & P.DOWN)) {
      if (this.F74 & 8192) {
        this.rap.se(178, this.mov);
        this.vibracionAterrizaje();
        this.ir(this.s6834);
      } else this.ir(this.s6CD4);
      return;
    }
    if (!(this.pad.status & P.CIR)) {
      if (this.f4DE0()) {
        this.blanco.tam.y = 900;
        this.ir(this.s766C);
      } else this.ir(this.s7530);
      return;
    }
    const a = Math.trunc(this.c1.ang / 2);
    this.step.x += t12(this.c1.dir * 12 * rsin(a));
    this.step.y -= t12(rcos(a) * 12);
    this.step.z -= 108;
  }
  s7530(t) {
    if (t === 0) {
      this.F74 &= ~65536;
      this.F70 &= ~255;
      this.ponerAccion(1);
      this.F44 = 0;
    }
    if (!(this.F74 & 768)) {
      this.ponerAccion(1);
      if (this.pad.status & P.LEFT) this.turn.y = 1536; else if (this.pad.status & P.RIGHT) this.turn.y = s16(-1536);
    }
    if (this.F74 & 8192) {
      this.rap.se(178, this.mov);
      this.vibracionAterrizaje();
      this.ir(this.s6834);
      return;
    }
    if (this.f5298()) {
      this.ir(this.s6B18);
      return;
    }
    if (this.f4DE0()) {
      this.ir(this.s766C);
      return;
    }
  }
  s766C(t) {
    if (t === 0) {
      this.F74 &= ~65536;
      this.F70 &= ~255;
      this.ponerAccion(5);
      this.F60 = -8;
      this.F68 = -8;
      this.F64 = -8;
      this.EC4 = 0;
      this.F44 = 450;
      this.f1076 = 0;
      this.f1074 = 0;
      this.rap.vibrar([ 200, 10 ], 1);
      this.rap.vibrar([ 0, 0 ], 2);
    }
    if (t === 1) {
      this.f634C();
      this.rap.se(128, this.mov);
      this.rap.se(178, this.mov);
    }
    if (t === 16 && this.F7C === 0) this.vulnerable();
    if (this.isEnd && this.accion === 5) this.ponerAccion(1);
    if (t !== 0 && this.F74 & 8192) {
      this.rap.se(178, this.mov);
      this.rap.se2(128);
      this.vibracionAterrizaje();
      this.ir(this.s6834);
      return;
    }
    if (this.f5298()) {
      this.ir(this.s6B18);
      return;
    }
    if (t < 4) return;
    const s0 = this.f1076, s2 = this.f1074;
    if (s0 > 0) this.f1076++;
    if (s0 < 32) {
      if (this.pad.status & P.DOWN && s2 >= 0) {
        if (s0 === 0) {
          this.rap.se(185, this.mov);
          this.f1076 = 1;
          this.f1074 = 1;
        }
        this.EBC += 4;
        if (this.EBC > 42) this.EBC = 42;
      } else {
        this.EBC -= 4;
        if (this.EBC < 0) this.EBC = 0;
      }
      if (this.pad.status & P.UP && s2 <= 0) {
        if (s0 === 0) {
          this.rap.se(185, this.mov);
          this.f1076 = 1;
          this.f1074 = -1;
        }
        this.EBE += 4;
        if (this.EBE > 24) this.EBE = 24;
      } else {
        this.EBE -= 4;
        if (this.EBE < 0) this.EBE = 0;
      }
    } else {
      this.EBC -= 4;
      if (this.EBC < 0) this.EBC = 0;
      this.EBE -= 4;
      if (this.EBE < 0) this.EBE = 0;
    }
    const a = Math.trunc(this.c1.ang / 2), k = this.EBC - this.EBE;
    this.step.x += t12(this.c1.dir * k * rsin(a));
    this.step.y -= t12(k * rcos(a));
    if (t === 56) {
      this.f1076 = 0;
      this.f1074 = 0;
      this.ir(this.s7530);
    }
  }
  s7A4C(t) {
    if (t === 0) {
      this.F74 = this.F74 & 4288675839 | 65536;
      this.rap.se(25, this.mov);
      this.F70 |= 256;
      this.ponerAccion(9);
      this.turn.y = 2048;
      this.invulnerable(0);
    }
    if (this.isEnd) {
      this.invulnerable32();
      this.F70 &= ~256;
      this.ir(this.s6834);
    }
    this.step.y -= 128;
  }
  s7B2C(t) {
    if (t === 0) {
      this.F74 &= 4288675839 & ~65536;
      this.rap.se(25, this.mov);
      this.F70 |= 256;
      this.ponerAccion(9);
      this.turn.y = 2048;
      this.invulnerable(0);
    }
    if (this.F74 & 8192 && this.EBC === 0) this.EBC = 1;
    if (this.EBC === 1) {
      this.EBC = 2;
      this.F74 |= 65536;
      this.step.y -= 128;
    }
    if (this.F74 & 8192) {
      this.invulnerable32();
      this.F70 &= ~256;
      this.rap.se(178, this.mov);
      this.vibracionAterrizaje();
      this.ir(this.s6834);
      return;
    }
    if (this.f5298()) {
      this.invulnerable32();
      this.F70 &= ~256;
      this.rap.se(183, this.mov);
      this.ir(this.s6B18);
      return;
    }
    if (this.f4DE0()) {
      this.invulnerable32();
      this.F70 &= ~256;
      this.ir(this.s766C);
      return;
    }
    if (this.isEnd) {
      this.invulnerable32();
      this.F70 &= ~256;
      this.ir(this.s7530);
    }
  }
  s7F8C(t) {
    if (t === 0) {
      this.ymin = -3e4;
      this.rSphere = -1;
      this.skipTrap = true;
      this.F74 |= 65536;
      const yaMuerto = this.F70 & 8192;
      this.F70 = this.F70 & ~255 | 8192;
      if (!yaMuerto) {
        this.rap.vibrar([ 255, 16 ], 1);
        this.rap.vibrar([ 255, 16 ], 2);
        this.rap.se2(26);
      }
      this.blanco.power = false;
      this.ponerAccion(10);
      if (this.nombreHind) this.rap.mensajeHind([ 38975, 0 ]);
    }
    if (!(this.mov.x < this.F84 || this.F8C < this.mov.x)) {
      this.EB4 = nearExp(this.EB4, 0, 8);
      this.step.x = this.EB4;
    }
    if (this.grounded & 1) {
      this.step.y = 0;
      this.ir(this.s7D20);
      return;
    }
    if (this.mov.y <= this.ymin) {
      this.ir(this.s8200);
      return;
    }
    this.turn.x = s16(this.turn.x + 64);
    this.turn.y = s16(this.turn.y + 64);
    this.turn.z = s16(this.turn.z + 64);
    let vy = this.step.y - 128 - 6 * t;
    if (vy < -1078) vy = -1078;
    this.step.y = Math.trunc(vy / 2);
  }
  s7D20(t) {
    if (t === 0) {
      this.ponerAccion(13);
      this.F44 = 450;
      this.rap.se(this.mov.y < -6e3 ? 179 : 177, this.mov);
      this.rap.vibrar([ 255, 8 ], 1);
      this.rap.vibrar([ 255, 8 ], 2);
      this.F74 |= 33554432;
    }
    this.step.z = this.mov.y < -13999 ? 0 : 48;
    let vy = t < 10 ? -32 : -128;
    if (!(this.grounded & 1)) this.turn.x = s16(-1024);
    if (this.bodyHeight < -vy) vy = 8 - this.bodyHeight;
    if (t === 16) {
      if (this.mov.y < -16e3) {
        this.ir(this.s7EC4);
      } else {
        this.ir(this.s7F8C);
        this.F74 &= ~33554432;
      }
    }
    this.step.y = Math.trunc(vy / 2);
  }
  s7EC4(t) {
    if (t === 0) {
      this.F74 |= 33554432;
      this.turn.z = 0;
      this.turn.x = 0;
      this.J.vida = Math.max(this.J.vida, 1e-6);
      this.ponerAccion(14);
    }
    this.step.y -= 32;
    if (t === 24) this.gameOver();
  }
  s8200(t) {
    if (t === 0) {
      this.ocultoMuerto = true;
      this.gameOver();
    }
  }
  gameOver() {
    this.log("game over");
    this.J.vida = 0;
  }
  f634C() {
    const c1 = this.c1, c2 = this.c2, e = this.EB4;
    if (e !== 0) {
      if (c1.dir === 0) c1.dir = e;
      let v = (c1.dir * e >= 0 ? 128 : -128) + c1.A;
      if (v < 0) {
        c1.dir = -c1.dir;
        v = -v;
      }
      if (v < 16) v = 16;
      if (v > 180) v = 180;
      c1.A = v;
      this.F74 |= 256;
      c1.th0 = c1.ang;
      this.turn.y = s16(-(e * 3 * 512));
      this.EC0 = 0;
    } else if (c1.ang) this.turn.y = 2048;
    this.F74 |= 512;
    c2.A = 128;
    c2.dir = 1;
    c2.th0 = c2.ang;
    this.F60 = -8;
    if (this.F74 & 16384) this.F68 = -8;
    if (this.F74 & 4096) this.F64 = -8;
  }
  f6264() {
    const c = this.c1;
    if (Math.abs(c.ang) < 33) return;
    c.dir = c.d > 0 ? -1 : 1;
    c.A = 24;
    c.th0 = c.ang;
    this.F60 = -8;
    this.F74 |= 256;
    if (this.F74 & 4096) this.F64 = -8;
  }
  f62E0() {
    if (this.F74 & 16384) return;
    const c = this.c2;
    c.dir = this.F74 & 16 ? 1 : -1;
    c.A = 48;
    this.F74 |= 512;
    c.th0 = c.ang;
    this.F60 = -8;
    this.F68 = -8;
    if (this.F74 & 4096) this.F64 = -8;
  }
  f502C() {
    if (this.F74 & 65536) {
      this.F74 &= ~8388608;
      this.EC2 = 0;
    }
    if (this.F74 & 8388608) {
      this.ponerAccion(15);
      if (--this.EC2 === 0) {
        this.F74 = this.F74 & ~8388608 | 256;
        if (this.c1.dir) this.turn.y = s16(-(this.c1.dir * 3 * 512));
      }
    }
    if (this.F74 & 8454144) {
      if (this.F74 & 65536) {
        this.F74 &= ~3840;
        this.c1.A = 0;
        this.c1.dir = 0;
      } else {
        this.F74 &= ~1280;
        this.c2.A = 0;
        this.c2.dir = 0;
      }
    } else {
      if (!(this.F74 & 256)) this.f6264();
      if (!(this.F74 & 512)) this.f62E0();
    }
    if (this.F74 & 768 && ![ 5, 7, 9 ].includes(this.accion)) {
      this.ponerAccion(1);
      const s = this.pad.status;
      if (s & 40960) this.turn.y = s & P.LEFT ? 1536 : -1536;
    }
    if (this.F74 & 256) this.f5584(this.c1, 0);
    if (this.F74 & 512) this.f5584(this.c2, 1);
    if (this.F74 & 1024) {
      this.c1.dir = 0;
      this.c1.A = 0;
      this.F74 &= ~1024;
    }
    if (this.F74 & 2048) {
      this.c2.dir = 0;
      this.c2.A = 0;
      this.F74 &= ~2048;
    }
  }
  f5584(c, eje) {
    let ang = c.ang;
    const A = c.A, th0 = c.th0;
    let s0 = t12(c.g * (this.F40 * 2) * (rcos(ang) - rcos(th0))) + A * A;
    if (s0 < 0) s0 = 0;
    s0 = isqrt(s0);
    if (eje === 0) {
      if (ang * c.ant <= 0 && c.ant !== 0) {
        c.n = 8;
        c.At = Math.trunc(A * 700 / 1e3);
        c.th0t = Math.trunc(th0 * 850 / 1e3);
      }
      if (c.n) {
        c.A = nearTime(c.A, c.At, c.n);
        c.th0 = nearTime(c.th0, c.th0t, c.n);
        if (c.A < 16 && Math.abs(c.th0) < 32) {
          this.F74 = (this.F74 | 1024) & ~256;
          c.n = 0;
          return;
        }
        c.n--;
      }
    } else if (c.dir === -1 && this.F74 & 16384) {
      this.turn.y = 2048;
      sonido(183, this.posM());
      this.EC2 = 2;
      this.F74 = (this.F74 | 8390656) & ~512;
    }
    let v = s0 * c.dir, hx = t12(v * rcos(ang)), hy = t12(v * rsin(ang)), tipo = 0;
    if (Math.abs(hx) + Math.abs(hy) < 16) tipo = 1; else if (eje === 0 && this.F74 & 4096) {
      if (this.mov.y !== this.ymax) sonido(183, this.posM());
      tipo = 2;
    } else if (eje === 0) {
      const x = this.mov.x + c.dir * 225;
      if (x < this.F84 || this.F8C < x) {
        sonido(183, this.posM());
        tipo = 2;
      }
    }
    if (tipo) {
      const sp = Math.abs(c.v);
      ang = c.ant;
      if (tipo === 1) c.dir = eje === 0 ? c.d > 0 ? -1 : 1 : -1; else {
        if (this.mov.y !== this.ymax) sonido(184, this.posM());
        c.A = Math.trunc(A * 750 / 1e3);
        c.th0 = Math.trunc(th0 * 850 / 1e3);
        c.ant = ang;
        c.dir = -c.dir;
        c.v = -sp;
        if (sp > 64) this.rap.vibrar([ 128, 3 ], 2);
      }
      v = sp * c.dir;
      hx = t12(v * rcos(ang));
      hy = t12(v * rsin(ang));
    } else {
      c.ant = ang;
      c.v = s0;
    }
    if (eje === 0) this.step.x += hx; else this.step.z += hx;
    this.step.y += hy;
  }
  f5410() {
    const a = this.accion, f = this.frame;
    let id = 0;
    if (a === 2 || a === 3) {
      if (f === 9) id = 2;
      if (f === 17) id = 3;
    } else if (a === 12) {
      if (f === 8) id = 3;
      if (f === 16) id = 2;
    } else if (a === 16 || a === 17) {
      if (f === 14) id = 3;
      if (f === 27) id = 2;
    }
    if (id) this.rap.se(id, this.mov);
  }
  f5E74() {
    let s1 = this.mov.x - this.ant808.x;
    if (!(Math.abs(this.E9C) < Math.abs(s1))) s1 = Math.trunc(this.E9C * 80 / 100);
    if (s1 === 0) {
      s1 = this.E9C;
      const v = Math.abs(s1) >= 5 ? Math.sign(s1) * 4 : s1;
      s1 = this.E9C - v;
    }
    this.E9C = s1;
    this.ant808 = {
      ...this.mov
    };
    const a = new Array(32);
    a[0] = -s1;
    for (let i = 1; i < 32; i++) a[i] = Math.trunc(a[i - 1] * (i < 8 ? 108 : 96) / 100);
    this.latigo = a;
  }
  voxInit() {
    this.voxCola = [];
    this.voxDemora = 0;
  }
  voxDemorada(id, n) {
    this.voxSig = id;
    this.voxDemora = n;
  }
  voxTick() {
    if (this.voxDemora && --this.voxDemora <= 0) {
      this.voxCola.push(this.voxSig);
      this.voxDemora = 0;
    }
    if (this.voxCola.length) {
      const id = this.voxCola.shift();
      if (id) this.rap.voz(id);
    }
  }
  posM() {
    return new THREE.Vector3(this.mov.x * MM, this.mov.y * MM, this.mov.z * MM);
  }
  ubicarRig() {
    const r = this.J.ctx.rig.position;
    r.set(this.mov.x * MM, (this.mov.y - 750) * MM, this.mov.z * MM);
  }
  ponerCuerpo(C) {
    if (!C?.obj) return;
    const r = this.rotCuerpo || this.rot, e = new THREE.Euler(r.x * ANG, r.y * ANG, r.z * ANG, "YXZ");
    const alt = (this.bodyHeight ?? ALTO_CONTROL) * MM, off = new THREE.Vector3(0, -alt, 0).applyEuler(e);
    C.obj.rotation.copy(e);
    C.obj.position.set(this.mov.x * MM + off.x, (this.mov.y + this.F46) * MM + off.y, this.mov.z * MM + off.z);
    C.obj.visible = !this.parpadeo && !this.ocultoMuerto;
    C.obj.updateMatrixWorld(true);
    this.dibujarSoga(C);
  }
  dibujarSoga(C) {
    if (!this.soga) {
      const geo = new THREE.BufferGeometry, N = 48, pos = new Float32Array(N * 4 * 3), idx = [];
      for (let i = 0; i < N; i++) {
        const b = i * 4;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setIndex(idx);
      this.soga = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 3158064,
        side: THREE.DoubleSide
      }));
      this.soga.frustumCulled = false;
      this.soga.userData.sinColision = true;
      this.rap.ctx.mundo?.add(this.soga);
    }
    const S = this.soga, P = S.geometry.attributes.position.array, h = C?.obj?.getObjectByName?.("hueso_4");
    S.visible = !(this.F70 & 8192) && !this.ocultoMuerto;
    if (!S.visible) return;
    const v = new THREE.Vector3;
    if (h) h.getWorldPosition(v); else v.set(this.mov.x * MM, (this.mov.y + 300) * MM, this.mov.z * MM);
    const hx = v.x * 1e3, hy = v.y * 1e3, hz = v.z * 1e3;
    let k = 0;
    const quad = (x0, y0, x1, y1) => {
      for (const [x, y] of [ [ x0 - 34, y0 ], [ x0 + 34, y0 ], [ x1 - 34, y1 ], [ x1 + 34, y1 ] ]) {
        P[k++] = (hx + x) * MM;
        P[k++] = (hy + y) * MM;
        P[k++] = hz * MM;
      }
    };
    for (let i = 0; i < 16; i++) quad(0, i * 500, 0, (i + 1) * 500);
    const n = this.mov.y >= 3e3 ? 32 : Math.max(0, 32 - Math.trunc((3e3 - this.mov.y) / 500));
    let x = 0, y = 0;
    for (let i = 0; i < 32; i++) {
      const a = this.latigo?.[i] || 0, x1 = x + t12(rsin(a) * 500), y1 = y - t12(rcos(a) * 500);
      if (i < n) quad(x, y, x1, y1); else quad(x, y, x, y);
      x = x1;
      y = y1;
    }
    S.geometry.attributes.position.needsUpdate = true;
  }
  destruir() {
    this.vivo = false;
    this.pad.escuchar(false);
    this.soga?.removeFromParent();
  }
}

export class HindRapel {
  constructor(actor, rap) {
    this.actor = actor;
    this.rap = rap;
    this.nombre = actor.nombre ?? 31580;
    this.registro = [];
    const o = actor.opts || {}, num = k => (o[k] || []).filter(x => typeof x === "number");
    const p = num("p"), d = num("d");
    this.mov = V3(p[0] ?? -9e3, p[1] ?? 27e3, p[2] ?? -4500);
    this.rot = V3(d[0] ?? 0, d[1] ?? 1024, d[2] ?? 0);
    this.turn = {
      ...this.rot
    };
    this.step = V3();
    this.interp = 0;
    this.f1C8 = num("s")[0] ? 1 : 0;
    this.f1CC = 0;
    this.f1CE = 1;
    this.f1C4 = 0;
    this.f1D0 = V3();
    this.f1D8 = V3(...num("g").length >= 3 ? num("g") : [ 0, 0, 0 ]);
    this.f1E0 = 0;
    this.f1E2 = 0;
    this.f1E4 = 0;
    this.f1E8 = 0;
    this.f1EA = 0;
    this.f1EC = 0;
    this.f1EE = 0;
    this.f1F0 = 32;
    const w = num("w");
    this.f1F4 = w[0] ?? 0;
    this.f1F6 = w[1] ?? 0;
    const x = num("x")[0];
    if (x != null) {
      this.turn.x = x;
      this.f95C = x;
    } else this.f95C = 0;
    this.f1F2 = num("z")[0] ?? 0;
    const b = num("b");
    this.f1F8 = b.length >= 3 ? b : [ 0, 0, 0 ];
    this.f920 = procDe((o.e || [])[0]) || -1;
    this.f91C = num("a")[0] ?? 0;
    this.h = num("h").slice(0, 7);
    if (this.h.length) this.f1C8 |= 16;
    const y = num("y"), lv = Math.max(0, rap.nivelJuego());
    this.daño = y.length ? y[Math.min(lv, y.length - 1)] ?? y[0] : 96;
    this.f958 = 0;
    this.f960 = 0;
    this.f964 = 0;
    this.f968 = V3();
    this.f978 = 0;
    this.f97A = 0;
    this.rotor = [ 0, 0 ];
    this.rutas = rap.rutas || [];
    this.ruta = 0;
    this.punto = 0;
    this.f918 = 0;
    this.vivo = true;
    this.balas = [];
    const r = num("r")[0];
    if (r != null && this.rutas.length) {
      this.f9908(r);
      const q = this.pt();
      this.mov.x = q.x;
      this.mov.z = q.z;
      this.f918 = 0;
      this.f1C8 &= ~32;
    }
  }
  log(t, d = {}) {
    this.registro.push({
      t: t,
      f: this.rap.frame,
      ...d
    });
    if (this.registro.length > 200) this.registro.shift();
  }
  pt(k = 0) {
    const R = this.rutas[this.ruta];
    const q = R?.puntos?.[Math.min(R.puntos.length - 1, this.punto + k)];
    return q ? {
      x: q.p[0],
      y: q.p[1],
      z: q.p[2],
      cmd: q.cmd | 0
    } : {
      x: this.mov.x,
      y: 0,
      z: this.mov.z,
      cmd: 0
    };
  }
  async armar() {
    const ctx = this.rap.ctx;
    const g = new THREE.Group;
    g.name = "hind_s11d";
    this.o = g;
    try {
      const m = await ctx.cargar(this.actor.modelo || "niveles/s11d/924a.glb");
      m.traverse(x => {
        if (x.isMesh) x.userData.sinColision = true;
      });
      g.add(m);
      ctx.teñir?.(m);
      this.modelo = m;
    } catch (e) {
      console.warn("[rapel] hind", e);
    }
    this.huesos = [ 1, 2 ].map(i => this.modelo?.getObjectByName("hueso_" + i) || null);
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(.8, .8), new THREE.MeshBasicMaterial({
      color: 16765056,
      transparent: true,
      opacity: .85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    fm.visible = false;
    fm.userData.sinColision = true;
    this.fogonazo = fm;
    ctx.mundo?.add(g);
    ctx.mundo?.add(fm);
    this.ubicar();
    return this;
  }
  f9908(n) {
    const i = n - 1;
    if (i < 0 || i >= this.rutas.length) {
      this.log("ruta mala", {
        n: n
      });
      return;
    }
    this.ruta = i;
    this.punto = 0;
    this.f916 = 1;
    const q = this.pt();
    if ((q.cmd & 31) << 5) this.f1F0 = (q.cmd & 31) << 5;
    if (this.f1C8 & 16) {
      this.f1C8 |= 32;
      this.f958 = 0;
      this.f1EA = 0;
      this.f1E8 = 0;
      this.f1EC = this.mov.y;
    }
    this.f1C8 &= ~128;
    if ((q.cmd & 255) >> 5 === 4) this.f1C8 |= 128;
    this.log("ruta", {
      ruta: i
    });
  }
  f99A8() {
    const q = this.pt();
    let a = (q.cmd & 7168) >> 10;
    if (a === 0) a = this.ruta + 1;
    this.f9908(a);
  }
  f9870() {
    const q = this.pt(), m = (q.cmd & 768) >> 8;
    if (m === 3) {
      this.destruir();
      return;
    }
    if (m === 1) {
      if (this.f1C8 & 2) {
        this.f1CC = 1;
        this.f1CE = (q.cmd & 255) >> 5;
        this.log("tira", {
          modo: this.f1CE
        });
      }
      return;
    }
    if (m !== 2) return;
    this.f1CC = 0;
    this.f1CE = 65535;
    this.f1C4 = 0;
  }
  f99F4() {
    this.f918 = 0;
    const q = this.pt(), a = {
      ...this.mov
    }, t = V3(q.x, q.y, q.z);
    if (this.f1C8 & 1) {
      t.y = 0;
      a.y = 0;
    }
    const d = V3(t.x - a.x, t.y - a.y, t.z - a.z), L = vecLen3(d);
    if (L < this.f1F0) this.f918 = 1;
    let dd = diffDirS(this.turn.y, vecDir2(d.x, d.z));
    dd = clampAbs(dd, 24);
    this.interp = 15;
    this.turn.y = s16(this.turn.y + dd);
    const v = lenVec3(d, L, this.f1F0), k = Math.trunc(this.f1F0 / 8);
    acercar(this.step, "x", v.x, k);
    acercar(this.step, "z", v.z, k);
    if (this.f1C8 & 1) this.step.y = clampAbs(this.rap.jugador().y - (this.mov.y + this.f1D8.y), 128); else this.step.y = 0;
  }
  fAD9C() {
    this.f99F4();
    if (!this.f918) return;
    this.f9870();
    if (!this.vivo) return;
    const R = this.rutas[this.ruta];
    if (this.f916 === (R?.puntos?.length || 1)) {
      this.f99A8();
      return;
    }
    this.interp = 15;
    this.punto++;
    this.f916++;
    const q = this.pt();
    if ((q.cmd & 31) << 5) this.f1F0 = (q.cmd & 31) << 5;
    this.f1C8 &= ~128;
    if ((q.cmd & 255) >> 5 === 4) this.f1C8 |= 128;
  }
  fC9C7C() {
    const t = this.rap.frame % 64, s1 = t * 64;
    this.step.y += Math.trunc((rsin(s1) - rsin((t - 1) * 64)) / 8);
    this.turn.x = s16(this.f95C + t12(rsin(s1) * 48));
    this.turn.z = s16(t12(rsin(s1) * 80));
  }
  fC9B94() {
    const d = diffDirS(this.turn.y, this.rot.y);
    if (d === 0) this.f964 = this.f964 < -4 ? this.f964 + 4 : this.f964 > 4 ? this.f964 - 4 : 0; else {
      const obj = d > 0 ? this.f1F2 : -this.f1F2, dd = obj - this.f964;
      this.f964 += dd < -16 ? -16 : dd > 16 ? 16 : dd;
    }
    this.turn.z = s16(this.turn.z + this.f964);
  }
  fC9D60() {
    const P7 = this.h, T = this.rap.frame;
    if (this.f1E8 > 0) this.turn.z = s16(t12(P7[6] * rsin(Math.trunc(4096 / P7[3]) * (T % P7[3]))));
    if (this.f1E8 < 2) {
      const k = Math.trunc(4096 / P7[1]), u = T % P7[1];
      this.step.y = t12(P7[4] * (rsin(k * u) - rsin(k * (u - 1))));
    }
    const apuntar = pt => {
      const a = {
        ...this.mov
      }, t = this.f1C8 & 1 ? {
        ...this.rap.jugador()
      } : pt;
      if (this.f1C8 & 1) {
        t.y = 0;
        a.y = 0;
      }
      const d = V3(t.x - a.x, t.y - a.y, t.z - a.z);
      this.f960 = this.turn.y + diffDirS(this.turn.y, vecDir2(d.x, d.z));
      this.f968 = lenVec3(d, vecLen3(d), this.f1F0);
    };
    if (this.f1E8 === 0) {
      if (!this.f1EA) {
        apuntar(this.pt(1));
        this.f1EA = 1;
      }
      const k = Math.trunc(this.f1F0 / 8);
      let n = acercar(this.step, "x", 0, k) + acercar(this.step, "z", 0, k) + acercar(this.turn, "x", 0, 8);
      const ty = {
        y: this.turn.y
      };
      n += acercar(ty, "y", this.f960, 24);
      this.turn.y = ty.y;
      n += acercar(this.turn, "z", 0, 8);
      if (n === 5) {
        this.f1E8 = 1;
        this.f1EA = 0;
      }
    } else if (this.f1E8 === 1) {
      if (!this.f1EA) {
        this.f9870();
        this.f1EA = 1;
        if (!this.vivo) return;
      }
      if (++this.f958 === P7[0]) {
        this.f958 = 0;
        this.f1EA = 0;
        this.f1E8 = 2;
      }
      this.turn.x = s16(this.f95C + t12(P7[5] * rsin(Math.trunc(4096 / P7[2]) * (T % P7[2]))));
    } else if (this.f1E8 === 2) {
      if (!this.f1EA) {
        apuntar(this.pt(1));
        this.f1EA = 1;
      }
      const tx = {
        x: this.turn.x,
        y: this.turn.y
      };
      let n = acercar(tx, "x", this.f95C, 8) + acercar(tx, "y", this.f960, 16);
      this.turn.x = tx.x;
      this.turn.y = tx.y;
      if (n === 2) {
        this.interp = 15;
        this.punto++;
        this.f916++;
        const q = this.pt();
        if ((q.cmd & 31) << 5) this.f1F0 = (q.cmd & 31) << 5;
        this.f1C8 &= ~128;
        if ((q.cmd & 255) >> 5 === 4) this.f1C8 |= 128;
        this.f1C8 &= ~32;
        if (this.f1C8 & 512) {
          this.f97A = this.mov.x < 0 ? 187 : 188;
          this.f978 = 16;
        }
        this.f1C8 |= 512;
      }
    }
    if (this.f1C8 & 1) {
      const dy = clampAbs(this.rap.jugador().y - (this.f1EC + this.f1D8.y), 128);
      this.step.y += dy;
      this.f1EC += dy;
    }
  }
  fCA424() {
    if (!(this.f1C8 & 128)) return;
    const j = this.rap.jugador();
    this.turn.y = vecDir2(0 - this.mov.x, j.z - this.mov.z);
  }
  mensaje(v) {
    const h = v[0] & 65535, a = v[1] ?? 0;
    if (this.f1C8 & 4) return true;
    if (h === 23111) {
      if (a) this.f1C8 |= 2; else this.f1C8 &= ~2;
    } else if (h === 38975) {
      if (a) this.f1C8 |= 1; else this.f1C8 &= ~17;
    } else if (h === 27198) {
      this.f1CC = 0;
      this.f9908(a);
    } else if (h === 65530) {
      this.f1E0 = a << 16 >> 16;
      this.f1E2 = (v[2] ?? 0) << 16 >> 16;
      this.f1C8 |= 256;
    } else return false;
    this.log("mesg", {
      h: h.toString(16),
      a: a
    });
    return true;
  }
  fCA6D8(a1) {
    const j = this.rap.jugador(), B = this.f1F8;
    if (this.f1CE === 0) {
      this.f1C8 &= ~8;
      const p = this.local(V3(0, 0, 3e4));
      this.f1D0 = p;
      return;
    }
    if (this.f1CE === 1) {
      if (a1 === 0) {
        this.f1C8 &= ~8;
        if ((this.rot.y & 4095) < 2048) {
          this.f1D0.x = B[0];
          this.f1EE = 160;
        } else {
          this.f1D0.x = B[1];
          this.f1EE = -160;
        }
        this.f1C8 &= ~64;
        if (this.f1C8 & 256) {
          this.f1D0.y = this.f1E0;
          const dy = this.f1E2 - this.f1E0;
          if (dy !== 0) {
            this.f1C8 |= 64;
            this.f1E4 = Math.trunc(-dy / (Math.trunc(Math.abs(B[1] - B[0]) / 160) || 1));
          }
        } else this.f1D0.y = j.y - 450;
        this.f1D0.z = B[2];
        if (this.rap.frame & 1 && !(this.f1C8 & 256)) {
          this.f1C8 |= 64;
          this.f1E4 = 64;
          this.f1D0.y += Math.trunc(Math.abs(this.f1D0.x - j.x) / 160) * 64;
        }
        this.f1C8 &= ~256;
      } else {
        if (this.f1C8 & 64) this.f1D0.y -= this.f1E4;
        this.f1D0.x += this.f1EE;
      }
      return;
    }
    if (this.f1CE === 2 || this.f1CE === 3) {
      if (a1 === 0) {
        this.f1C8 |= 8;
        const t = {
          ...j
        };
        t.y = this.rap.pisoJugador() - 2e3;
        if (this.f1CE === 2) {
          t.z += j.z - this.mov.z > 0 ? -2400 : 2400;
          t.x -= this.step.x * 4;
        } else {
          t.x += j.x - this.mov.x > 0 ? -2400 : 2400;
          t.z -= this.step.z * 4;
        }
        this.f1D0 = t;
      } else if (this.f1CE === 2) this.f1D0.x += Math.trunc(this.step.x / 2); else this.f1D0.z += Math.trunc(this.step.z / 2);
    }
  }
  local(v) {
    const e = new THREE.Euler(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ"), p = new THREE.Vector3(v.x, v.y, v.z).applyEuler(e);
    return V3(Math.round(this.mov.x + p.x), Math.round(this.mov.y + p.y), Math.round(this.mov.z + p.z));
  }
  fCABA8(a1) {
    this.fCA6D8(a1);
    this.fogonazo.visible = false;
    if (!(this.rap.frame & 1)) return;
    const B = this.f1F8;
    if (this.f1D0.x < B[0] || B[1] < this.f1D0.x) return;
    const boca = this.local(this.f1D8);
    this.fogonazo.position.set(boca.x * MM, boca.y * MM, boca.z * MM);
    this.fogonazo.visible = true;
    this.fogonazo.rotation.z = Math.random() * Math.PI;
    this.rap.bala(boca, {
      ...this.f1D0
    }, !(this.f1C8 & 8), this.daño);
    this.rap.se(180, this.mov);
  }
  cuadro() {
    if (!this.vivo || !this.fogonazo) return;
    if (this.interp === 0) {
      for (const k of [ "x", "y", "z" ]) this.rot[k] = s16(nearExp(nearPhase(this.rot[k], this.turn[k]), this.turn[k], 4));
    } else {
      for (const k of [ "x", "y", "z" ]) this.rot[k] = s16(nearTime(nearPhase(this.rot[k], this.turn[k]), this.turn[k], this.interp));
      this.interp--;
    }
    this.mov.x += this.step.x;
    this.mov.z += this.step.z;
    this.mov.y += this.step.y;
    this.rotor[0] = and12(this.rotor[0] + this.f1F4);
    this.rotor[1] = and12(this.rotor[1] + this.f1F6);
    if ((this.rap.frame & 3) === 0) this.rap.se(182, this.mov, true);
    this.oculto = this.mov.z < -14e3 && this.mov.x >= -3999 && this.mov.x < 3e3;
    if (this.f1C8 & 32) this.fC9D60(); else {
      this.fAD9C();
      if (!this.vivo) return;
      this.fC9C7C();
      this.fC9B94();
    }
    if (!this.vivo) return;
    this.fCA424();
    this.fogonazo.visible = false;
    if (this.f1CC === 1) {
      const a1 = this.f1C4++;
      this.fCABA8(a1);
    }
    if (this.f978 > 0 && --this.f978 === 0) this.rap.se(this.f97A, this.mov, true);
    this.ubicar();
  }
  ubicar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, this.mov.y * MM, this.mov.z * MM);
    this.o.rotation.set(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ");
    this.o.visible = !this.oculto;
    if (this.huesos[0]) this.huesos[0].rotation.y = this.rotor[0] * ANG;
    if (this.huesos[1]) this.huesos[1].rotation.x = this.rotor[1] * ANG;
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.o?.removeFromParent();
    this.fogonazo?.removeFromParent();
    this.log("fin");
  }
}

class Vapor {
  constructor(actor, rap) {
    this.actor = actor;
    this.rap = rap;
    const o = actor.opts || {}, num = k => (o[k] || []).filter(x => typeof x === "number");
    const s = num("s"), e = num("e"), i = num("i");
    this.mov = V3(...s.length >= 3 ? s : [ 0, 0, 0 ]);
    this.end = V3(...e.length >= 3 ? e : s);
    this.interval = i[0] << 16 >> 16;
    this.interval2 = i[1] ?? 0;
    this.delay = num("d")[0] ?? 0;
    this.time = 0;
    this.time2 = 0;
    this.fB2 = 0;
    this.fBE = 0;
    this.diff = V3(this.end.x - this.mov.x, this.end.y - this.mov.y, this.end.z - this.mov.z);
    this.speed = V3(Math.trunc(this.diff.x / 16), Math.trunc(this.diff.y / 16), Math.trunc(this.diff.z / 16));
    const x = num("x"), lv = Math.max(0, rap.nivelJuego());
    if (x.length) rap.vidaVapor = x[Math.min(lv, x.length - 1)] ?? 36;
    this.vida = rap.vidaVapor ?? 36;
    const b = num("b");
    this.vecs = [];
    for (let k = 0; k + 2 < b.length && this.vecs.length < 3; k += 3) this.vecs.push(V3(b[k] - this.mov.x, b[k + 1] - this.mov.y, b[k + 2] - this.mov.z));
    this.g = new THREE.Group;
    this.g.name = "vapor";
    this.bocanadas = [];
    const mat = new THREE.SpriteMaterial({
      map: rap.texHumo(),
      color: 11579568,
      transparent: true,
      opacity: .55,
      depthWrite: false
    });
    for (let k = 0; k < 16; k++) {
      const sp = new THREE.Sprite(mat.clone());
      const h = k < 8 ? k * 30 + 750 : (k - 8) * 120 + 1e3, rad = Math.trunc(vecLen3(this.speed) / 2) * 3 * 2;
      sp.scale.set(Math.max(.3, rad * MM), h * MM, 1);
      sp.position.set((this.mov.x + this.speed.x * k + randS(64)) * MM, (this.mov.y + this.speed.y * k + randS(64)) * MM, (this.mov.z + this.speed.z * k + randS(64)) * MM);
      sp.material.color.setScalar((96 - 5 * (k + 1)) / 128);
      sp.visible = false;
      sp.userData.sinColision = true;
      this.g.add(sp);
      this.bocanadas.push(sp);
    }
    rap.ctx.mundo?.add(this.g);
  }
  enRango(p) {
    const yh = Math.max(this.mov.y, this.end.y) + 2e3, yl = Math.min(this.mov.y, this.end.y) - 2e3;
    return !(p.y > yh || p.y < yl);
  }
  tocar(desde, tam) {
    const C = this.rap.cuerda;
    if (!C?.blanco.power) return;
    for (const v of this.vecs.length ? this.vecs : [ V3() ]) {
      const a = V3(this.mov.x + v.x + desde.x, this.mov.y + v.y + desde.y, this.mov.z + v.z + desde.z), b = V3(a.x + tam.x, a.y + tam.y, a.z + tam.z);
      if (segmentoCaja(a, b, C.blanco.centro, C.blanco.tam)) {
        this.rap.golpear(C, this.vida, 2);
        return;
      }
    }
  }
  cuadro() {
    if (this.delay) {
      this.delay--;
      return;
    }
    const pj = this.rap.jugador();
    if (this.interval >= 0) {
      if (this.fB2 === 0) {
        if (this.time === this.interval2) this.fB2 = 1;
        if (this.time >= this.interval2 - 24 && this.time < this.interval2 - 18) {
          if (this.time === this.interval2 - 24) this.rap.se(176, this.mov);
        }
        this.time++;
      } else {
        const i3 = this.interval, i2 = this.time2;
        if (++this.time2 > i3) {
          this.time2 = 0;
          this.time = 0;
          this.fB2 = 0;
          for (const b of this.bocanadas) b.visible = false;
          return;
        }
        if (i2 === 0) this.rap.se(186, this.mov);
        if (i2 < 16) this.bocanadas[i2].visible = true;
        if (i2 >= i3 - 16) this.bocanadas[i2 - (i3 - 16)].visible = false;
        if (this.enRango(pj)) {
          let tam = i2 < 16 ? V3(i2 * this.speed.x, i2 * this.speed.y, i2 * this.speed.z) : {
            ...this.diff
          }, desde = V3();
          if (i2 >= i3 - 16) {
            const k = i2 - (i3 - 16);
            desde = V3(k * this.speed.x, k * this.speed.y, k * this.speed.z);
          }
          tam = V3(tam.x - desde.x, tam.y - desde.y, tam.z - desde.z);
          this.tocar(desde, tam);
        }
      }
    } else {
      if (this.time < 16) this.bocanadas[this.time].visible = true;
      this.time++;
      if (this.enRango(pj)) this.tocar(V3(), this.diff);
    }
  }
  destruir() {
    this.g.removeFromParent();
  }
}

class Cano {
  constructor(actor, rap, obj) {
    this.actor = actor;
    this.rap = rap;
    this.obj = obj;
    const o = actor.opts || {}, t = (o.t || []).filter(x => typeof x === "number");
    this.pos = V3(...t.length >= 3 ? t : [ 0, 0, 0 ]);
    this.modelos = (o.m || []).map(hashDe).filter(x => x != null);
    this.blanco = {
      lado: "jugador",
      centro: {
        ...this.pos
      },
      tam: V3(1500, 750, 4e3),
      power: true,
      damaged: 0
    };
    this.c2 = 0;
  }
  cuadro() {
    if (this.c2 === 0) {
      if (!(this.blanco.damaged & 4)) return;
      this.rap.explosion(this.pos);
      this.rap.vibrar([ 127, 2 ], 1);
      this.rap.vibrar([ 175, 4, 65, 4 ], 2);
      this.blanco = null;
      this.c2 = 1;
      this.cambiarModelo();
    } else if (this.c2 < 16) {
      this.c2++;
      if (this.c2 === 8 || this.c2 === 16) {
        this.rap.explosion(V3(this.pos.x + randS(2048), this.pos.y + randS(2048), this.pos.z + randS(2048)));
        this.rap.vibrar([ 127, 2 ], 1);
      }
    }
  }
  async cambiarModelo() {
    const h = this.modelos[1];
    if (h == null || !this.obj) return;
    try {
      const url = `niveles/${this.rap.st}/${h.toString(16).padStart(4, "0")}.glb`, m = await this.rap.ctx.cargar(url);
      m.position.copy(this.obj.position);
      m.rotation.copy(this.obj.rotation);
      m.userData = {
        ...this.obj.userData
      };
      this.rap.ctx.teñir?.(m);
      this.obj.visible = false;
      this.obj.parent?.add(m);
      this.roto = m;
    } catch {}
  }
}

class Aterrizaje {
  constructor(actor, rap) {
    this.actor = actor;
    this.rap = rap;
    this.J = rap.J;
    const o = actor.opts || {}, num = k => (o[k] || []).filter(x => typeof x === "number");
    const p = num("p"), d = num("d");
    this.mov = V3(p[0] ?? -4500, p[1] ?? -12e3, p[2] ?? -14e3);
    this.rot = V3(d[0] ?? 0, d[1] ?? 2048, d[2] ?? 0);
    this.procE = procDe((o.e || [])[0]) || -1;
    this.procC = procDe((o.c || [])[0]) || -1;
    this.nivel = num("l")[0] ?? -16500;
    this.estado = 0;
    this.t = 0;
    this.vivo = true;
    this.accion = 0;
  }
  clip() {
    return this.rap.anim11d2?.clips?.["anim 0"] || null;
  }
  cuadro() {
    if (!this.vivo) return;
    const c = this.clip(), n = c?.cuadros || 1;
    this.frame = Math.min(n - 1, this.t);
    const isEnd = this.t >= n - 1;
    this.t++;
    this.bodyHeight = c?.altura?.[this.frame] ?? 1e3;
    this.mov.y = this.bodyHeight + this.nivel;
    const s = this.estado;
    if (s >= 0) {
      this.estado++;
      if (s === 0) {
        this.rap.cine(true);
        this.rap.padSuelto(true);
        if (this.procC > 0) this.rap.proc(this.procC);
      }
      if (s === 8) this.rap.se2(128);
      if (s === 24) {
        this.rap.se2(129);
        this.rap.vibrar([ 127, 2 ], 1);
        this.rap.vibrar([ 255, 2 ], 2);
      }
      if (isEnd) {
        if (this.procE > 0) this.rap.proc(this.procE);
        this.estado = -1;
      }
    }
    const r = this.J.ctx.rig.position;
    r.set(this.mov.x * MM, this.nivel * MM, this.mov.z * MM);
  }
  ponerCuerpo(C) {
    if (!C?.obj) return;
    const e = new THREE.Euler(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ");
    C.obj.rotation.copy(e);
    C.obj.position.set(this.mov.x * MM, this.nivel * MM, this.mov.z * MM);
    C.obj.visible = true;
    C.obj.updateMatrixWorld(true);
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.rap.cine(false);
    this.rap.padSuelto(false);
  }
}

export const TIPOS_RAPEL = new Set([ "ROPE", "11E9_HIND", "PIPE", "DAMAGESMOKE2", "LANDING" ]);

export class Rapel {
  constructor(mgr, ctx) {
    this.mgr = mgr;
    this.ctx = ctx;
    this.J = mgr.J;
    this.st = ctx.st || ctx.nivel?.id;
    this.frame = 0;
    this.registro = [];
    this.cuerda = null;
    this.hind = null;
    this.vapores = [];
    this.canos = [];
    this.landing = null;
    this.balas = [];
    this.efectos = [];
  }
  log(t, d = {}) {
    this.registro.push({
      t: t,
      f: this.frame,
      ...d
    });
    if (this.registro.length > 300) this.registro.shift();
  }
  async preparar() {
    const nv = this.ctx.nivel, m = nv?.mapas?.find(x => x.id === nv.principal) || nv?.mapas?.[0], f = m?.hzm_json?.[0];
    let hz = f ? this.ctx.hzm?.(f) : null;
    if (!hz && f) {
      try {
        hz = await (await fetch("assets/" + f)).json();
      } catch {
        hz = null;
      }
    }
    this.hzd = hz ? new MapaHzd(hz) : null;
    this.rutas = hz?.rutas || [];
    const [a1, a2, sn] = await Promise.all([ cargarAnims("sne_11d").catch(() => null), cargarAnims("sne_11d2").catch(() => null), cargarAnims("snake").catch(() => null) ]);
    this.anim11d = a1;
    this.anim11d2 = a2;
    if (sn?.clips) {
      for (const [k, c] of Object.entries(a1?.clips || {})) sn.clips["sne_11d " + c.n] = c;
      for (const [k, c] of Object.entries(a2?.clips || {})) sn.clips["sne_11d2 " + c.n] = c;
    }
  }
  async crear(a) {
    if (!this.hzd && !this._prep) this._prep = this.preparar();
    await this._prep;
    switch (a.tipo) {
     case "ROPE":
      {
        this.landing?.destruir();
        this.landing = null;
        this.cuerda?.destruir();
        this.cuerda = new Cuerda(a, this);
        this.cuerda.pad.escuchar(true);
        this.enganchar();
        this.log("rope", {
          p: [ this.cuerda.mov.x, this.cuerda.mov.y, this.cuerda.mov.z ]
        });
        return true;
      }

     case "11E9_HIND":
      {
        this.hind?.destruir();
        this.hind = new HindRapel(a, this);
        await this.hind.armar();
        for (const o of this.objetosDe(a)) o.visible = false;
        this.log("hind", {
          ruta: this.hind.ruta,
          "daño": this.hind.daño
        });
        return true;
      }

     case "DAMAGESMOKE2":
      this.vapores.push(new Vapor(a, this));
      return true;

     case "PIPE":
      {
        const o = this.objetosDe(a)[0] || null;
        if (!this.canos.some(c => c.actor === a)) this.canos.push(new Cano(a, this, o));
        return true;
      }

     case "LANDING":
      {
        this.cuerda?.destruir();
        this.cuerda = null;
        this.hind?.destruir();
        this.hind = null;
        this.landing?.destruir();
        this.landing = new Aterrizaje(a, this);
        this.enganchar();
        this.log("landing");
        return true;
      }
    }
    return false;
  }
  objetosDe(a) {
    const out = [];
    this.ctx.mundo?.traverse(o => {
      const x = o.userData?.actor;
      if (x && x.tipo === a.tipo && (x.nombre === a.nombre || x === a) && !(o.parent?.userData?.actor === x)) out.push(o);
    });
    return out;
  }
  enganchar() {
    if (this._enganchado) return;
    this._enganchado = true;
    const J = this.J, R = this;
    this.ctx.congelar?.(true);
    if (typeof J.reaccionSnake === "function") {
      const r0 = J.reaccionSnake.bind(J);
      this._reac = r0;
      J.reaccionSnake = () => {
        const C = R.cuerda?.vivo ? R.cuerda : null;
        if (C) return {
          clip: "sne_11d " + C.accion,
          unaVez: ACCION_UNA_VEZ.has(C.accion),
          tipo: "rapel",
          k: C.accionCambio
        };
        if (R.landing?.vivo) return {
          clip: "sne_11d2 0",
          unaVez: true,
          tipo: "rapel"
        };
        return r0();
      };
    }
    let esc = this.ctx.mundo;
    while (esc?.parent) esc = esc.parent;
    if (esc) {
      const b0 = esc.onBeforeRender;
      this._esc = {
        esc: esc,
        b0: b0
      };
      esc.onBeforeRender = function(...args) {
        try {
          R.alDibujar();
        } catch (e) {
          console.warn("[rapel]", e);
        }
        return b0?.apply(this, args);
      };
    }
  }
  desenganchar() {
    if (!this._enganchado) return;
    this._enganchado = false;
    this.ctx.congelar?.(false);
    if (this._reac) {
      this.J.reaccionSnake = this._reac;
      this._reac = null;
    }
    if (this._esc) {
      this._esc.esc.onBeforeRender = this._esc.b0 || (() => {});
      this._esc = null;
    }
    this.desinstalarCamara();
  }
  alDibujar() {
    this.dibujos = (this.dibujos | 0) + 1;
    const C = this.cuerpo();
    if (this.cuerda?.vivo) this.cuerda.ponerCuerpo(C); else if (this.landing?.vivo) this.landing.ponerCuerpo(C);
  }
  cuerpo() {
    return this.ctx.cuerpo?.() ?? (typeof window !== "undefined" ? window.__mgs?.cuerpo : null) ?? null;
  }
  cam() {
    return this.mgr.camJuego?.() ?? null;
  }
  primeraPersona() {
    return !!this.cam()?.primeraPersona;
  }
  camRot(cam, r) {
    if (!cam) return;
    cam.rotSave = {
      x: r.x,
      y: r.y,
      z: r.z
    };
    cam.sobreescribir?.();
  }
  camTrack(cam, t) {
    if (!cam) return;
    cam.trackSave = t;
    cam.sobreescribir?.();
  }
  temblorCam(n) {
    const c = this.cam();
    if (c?.S) c.S.pos.y += n;
  }
  instalarCamara(cam) {
    if (!cam || this._cam?.cam === cam) return;
    this.desinstalarCamara();
    const R = this, h3 = cam.helper3, propio = Object.prototype.hasOwnProperty.call(cam, "helper3");
    this._cam = {
      cam: cam,
      h3: h3,
      propio: propio
    };
    cam.helper3 = function() {
      const p = R.posCamara();
      if (p) {
        this.S.pos.x = p.x;
        this.S.pos.y = p.y;
        this.S.pos.z = p.z;
      }
      return h3.call(this);
    };
  }
  desinstalarCamara() {
    const c = this._cam;
    if (!c) return;
    if (c.propio) c.cam.helper3 = c.h3; else delete c.cam.helper3;
    this._cam = null;
  }
  posCamara() {
    const C = this.cuerda;
    if (C?.vivo) {
      const h = this.cuerpo()?.obj?.getObjectByName?.("hueso_6");
      const v = new THREE.Vector3;
      const cab = h ? h.getWorldPosition(v) : v.set(C.mov.x * MM, (C.mov.y + 600) * MM, C.mov.z * MM);
      return V3(Math.round(cab.x * 1e3), Math.round(cab.y * 1e3) - C.blanco.tam.y, Math.round(cab.z * 1e3) + 500);
    }
    if (this.landing?.vivo) {
      const c = this.cam();
      if (c?.S) c.S.track = 4e3;
      return {
        ...this.landing.mov
      };
    }
    return null;
  }
  jugador() {
    const C = this.cuerda;
    if (C?.vivo) return {
      ...C.mov
    };
    const r = this.J.ctx.rig.position;
    return V3(Math.round(r.x * 1e3), Math.round(r.y * 1e3) + 750, Math.round(r.z * 1e3));
  }
  pisoJugador() {
    return this.cuerda?.vivo ? this.cuerda.levels[0] : Math.round(this.J.ctx.rig.position.y * 1e3);
  }
  nivelJuego() {
    const v = this.ctx.guion?.vars?.get?.("$w:L0002");
    return typeof v === "number" ? v : 1;
  }
  adentroDe(h) {
    const g = this.ctx.guion;
    const s = g?.adentro?.get?.(8650);
    return !!s && s.has(h);
  }
  proc(pid) {
    if (!(pid > 0)) return;
    this.log("proc", {
      pid: pid.toString(16)
    });
    try {
      this.ctx.guion?.correrProc?.(pid);
    } catch (e) {
      console.warn("[rapel] proc", e);
    }
  }
  voz(id) {
    this.log("voz", {
      id: id
    });
    try {
      this.ctx.voz?.(id);
    } catch {}
  }
  se(id, p, bomba = false) {
    sonido(id, p ? new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM) : null);
  }
  se2(id) {
    sonido(id, null);
  }
  vibrar(dat, n) {
    try {
      this.J.vibrar?.(Math.min(30, (dat[1] || 2) * 2));
    } catch {}
  }
  sangre(m) {
    try {
      this.J.sangre?.(new THREE.Vector3(m.x * MM, (m.y + 300) * MM, m.z * MM), 1);
    } catch {}
  }
  explosion(p) {
    try {
      const A = this.ctx.armas;
      if (A?.explosion) A.explosion(new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM)); else this.se2(46);
    } catch {}
  }
  cine(si) {
    const op = this.ctx.guion?.op;
    if (!op) return;
    try {
      if (si) op.efecto?.({
        tipo: "CINEMA",
        nombre: 49639,
        opts: {
          t: [ 3e4 ]
        }
      }); else op.mensaje?.(49639, [ 54304 ], {});
    } catch {}
  }
  padSuelto(si) {
    this.ctx.congelar?.(si || !!this.cuerda?.vivo || !!this.landing?.vivo);
  }
  mensajeHind(v) {
    this.hind?.mensaje(v);
  }
  texHumo() {
    if (this._tex) return this._tex;
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(.6, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    this._tex = new THREE.CanvasTexture(c);
    return this._tex;
  }
  golpear(b, daño, aMode = 1) {
    if (!b || !b.power) return;
    b.damaged |= 4;
    b.daño = (b.daño || 0) + daño;
    b.aMode = aMode;
  }
  bala(desde, hacia, lastima, daño) {
    const d = V3(hacia.x - desde.x, hacia.y - desde.y, hacia.z - desde.z), L = vecLen3(d) || 1;
    const corte = this.hzd?.corte(desde, hacia, 0);
    const fin = corte ? corte.p : {
      ...hacia
    }, dist = corte ? vecLen3(V3(fin.x - desde.x, fin.y - desde.y, fin.z - desde.z)) : L;
    const paso = lenVec3(d, L, 2e3);
    const m = new THREE.Mesh(this._geoBala ||= new THREE.BoxGeometry(.032, .032, 1.25), this._matBala ||= new THREE.MeshBasicMaterial({
      color: 16769152,
      transparent: true,
      opacity: .8
    }));
    m.userData.sinColision = true;
    m.position.set(desde.x * MM, desde.y * MM, desde.z * MM);
    m.lookAt(hacia.x * MM, hacia.y * MM, hacia.z * MM);
    this.ctx.mundo?.add(m);
    this.balas.push({
      p: {
        ...desde
      },
      paso: paso,
      dist: dist,
      fin: fin,
      lastima: lastima,
      "daño": daño,
      m: m
    });
  }
  cuadroBalas() {
    for (const b of this.balas.slice()) {
      b.dist -= 2e3;
      const a = {
        ...b.p
      };
      b.p.x += b.paso.x;
      b.p.y += b.paso.y;
      b.p.z += b.paso.z;
      b.m.position.set(b.p.x * MM, b.p.y * MM, b.p.z * MM);
      let pego = false;
      if (b.lastima) {
        const fin = {
          x: a.x + b.paso.x,
          y: a.y + b.paso.y,
          z: a.z + b.paso.z
        };
        const blancos = [ this.cuerda?.vivo ? this.cuerda.blanco : null, ...this.canos.map(c => c.blanco) ].filter(x => x && x.power);
        for (const T of blancos) if (segmentoCaja(a, fin, T.centro, T.tam)) {
          this.golpear(T, b.daño, 1);
          pego = true;
          break;
        }
      }
      if (pego || b.dist <= 0) {
        if (!pego) {
          this.se(181, b.fin);
          this.chispa(b.fin);
        }
        b.m.removeFromParent();
        this.balas.splice(this.balas.indexOf(b), 1);
      }
    }
  }
  chispa(p) {
    const g = new THREE.Mesh(this._geoChispa ||= new THREE.SphereGeometry(.12, 6, 4), new THREE.MeshBasicMaterial({
      color: 16765024,
      transparent: true,
      opacity: 1
    }));
    g.userData.sinColision = true;
    g.position.set(p.x * MM, p.y * MM, p.z * MM);
    this.ctx.mundo?.add(g);
    this.efectos.push({
      o: g,
      t: 6
    });
  }
  cuadro() {
    this.frame++;
    const cam = this.cam();
    if ((this.cuerda?.vivo || this.landing?.vivo) && cam) this.instalarCamara(cam);
    if (this.cuerda?.vivo) this.cuerda.cuadro();
    if (this.hind?.vivo) this.hind.cuadro();
    for (const v of this.vapores) v.cuadro();
    for (const c of this.canos) c.cuadro();
    this.cuadroBalas();
    if (this.landing?.vivo) this.landing.cuadro();
    for (const e of this.efectos.slice()) {
      if (--e.t <= 0) {
        e.o.removeFromParent();
        this.efectos.splice(this.efectos.indexOf(e), 1);
      } else e.o.material.opacity = e.t / 6;
    }
    if (!this.cuerda?.vivo && !this.landing?.vivo && this._enganchado) this.desenganchar();
  }
  mensaje(dest, v) {
    if (this.hind?.vivo && this.hind.nombre === dest) return this.hind.mensaje(v);
    return false;
  }
  destruir() {
    this.cuerda?.destruir();
    this.hind?.destruir();
    this.landing?.destruir();
    for (const v of this.vapores) v.destruir();
    for (const b of this.balas) b.m.removeFromParent();
    for (const e of this.efectos) e.o.removeFromParent();
    this.vapores = [];
    this.balas = [];
    this.efectos = [];
    this.cuerda = null;
    this.hind = null;
    this.landing = null;
    this.desenganchar();
  }
}
