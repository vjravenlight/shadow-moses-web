// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, ratan2, randU, nearSpeed, fase, nearExp4P, cargarModelo, cargarAnim, aplicarPose } from "./base.js";

const SE_REBOTE_GRANADA = 43;

const idiv = (a, b) => Math.trunc(a / b);

const isqrt = v => Math.floor(Math.sqrt(Math.max(0, v)));

const nsp = (a, b, v) => nearSpeed(fase(a, b), b, v);

const norm2048 = a => {
  while (a < -2048) a += 4096;
  while (a >= 2049) a -= 4096;
  return a;
};

const s16 = v => (v + 32768 & 65535) - 32768;

const rnd = () => Math.floor(Math.random() * 32768);

const PZ = [ {
  p: -1,
  t: [ 0, 0, 0 ],
  l: [ -1776, 446, -3754 ],
  u: [ 1776, 1317, 3826 ]
}, {
  p: 0,
  t: [ 0, 0, 0 ],
  l: [ -1776, 446, -1265 ],
  u: [ 1776, 1417, 3826 ]
}, {
  p: 0,
  t: [ 0, 0, 0 ],
  l: [ -1681, 446, -4028 ],
  u: [ 1681, 1634, -1092 ]
}, {
  p: 0,
  t: [ 0, 1300, 0 ],
  l: [ -1716, 278, -3256 ],
  u: [ 1711, 1551, 577 ]
}, {
  p: 3,
  t: [ 0, 0, 0 ],
  l: [ -1609, -23, -2681 ],
  u: [ 1608, 939, 2083 ]
}, {
  p: 3,
  t: [ 0, 500, 1600 ],
  l: [ -354, -370, -578 ],
  u: [ 219, 354, 4109 ]
}, {
  p: 3,
  t: [ -430, 900, -550 ],
  l: [ -365, -9, -321 ],
  u: [ 323, 167, 259 ]
}, {
  p: 6,
  t: [ 0, 0, 0 ],
  l: [ 74, 48, 109 ],
  u: [ 74, 503, 595 ]
}, {
  p: 6,
  t: [ 0, 160, -260 ],
  l: [ -365, 7, -61 ],
  u: [ 323, 7, 519 ]
}, {
  p: 6,
  t: [ 0, 500, 500 ],
  l: [ -67, -98, -142 ],
  u: [ 412, 117, 1383 ]
}, {
  p: 3,
  t: [ 450, 950, -600 ],
  l: [ -475, -521, -442 ],
  u: [ 454, -22, 487 ]
}, {
  p: 10,
  t: [ -90, 0, -280 ],
  l: [ -387, 0, -151 ],
  u: [ 246, 0, 778 ]
}, {
  p: 3,
  t: [ 440, 1029, -569 ],
  l: [ -76, -90, 307 ],
  u: [ 54, 273, 627 ]
}, {
  p: 12,
  t: [ 0, 250, 500 ],
  l: [ -55, -25, -90 ],
  u: [ 32, 157, 1035 ]
}, {
  p: 3,
  t: [ 0, 0, 0 ],
  l: [ -1483, 458, -2888 ],
  u: [ 1483, 458, -2374 ]
} ];

const ORUGA_I = {
  l: [ 1030, 0, -3601 ],
  u: [ 1653, 1419, 3334 ]
};

const ORUGA_D = {
  l: [ -1658, 0, -3601 ],
  u: [ -1035, 1419, 3334 ]
};

const DEF_UY = 2851;

const ATR_ESCOTILLA = PZ[10].u[0] - PZ[10].l[0] + (PZ[10].u[2] - PZ[10].l[2]) >> 2;

export const VARS_TANQUE = {
  "$w:G0050": 9216,
  "$w:G0052": 32720,
  "$w:G0054": 2,
  "$w:G0056": 640,
  "$w:G0058": 0
};

const _E = new THREE.Euler, _M = new THREE.Matrix4, _V = new THREE.Vector3;

function rotYXZ(r, m = new THREE.Matrix4) {
  return m.makeRotationFromEuler(_E.set(r[0] * ANG, r[1] * ANG, r[2] * ANG, "YXZ"));
}

function rotZYX(r, m = new THREE.Matrix4) {
  return m.makeRotationFromEuler(_E.set(r[0] * ANG, r[1] * ANG, r[2] * ANG, "ZYX"));
}

function setPos2(mov, rot) {
  const m = rotYXZ(rot);
  m.setPosition(mov[0], mov[1], mov[2]);
  return m;
}

const put = (m, v) => {
  const p = _V.set(v[0], v[1], v[2]).applyMatrix4(m);
  return [ Math.trunc(p.x), Math.trunc(p.y), Math.trunc(p.z) ];
};

function movePos(m, v) {
  const p = put(m, v);
  const r = m.clone();
  r.setPosition(p[0], p[1], p[2]);
  return r;
}

function rotatePos(m, r) {
  const t = (new THREE.Vector3).setFromMatrixPosition(m);
  const q = m.clone().setPosition(0, 0, 0).multiply(rotYXZ(r));
  q.setPosition(t);
  return q;
}

const posDe = m => {
  const e = m.elements;
  return [ Math.trunc(e[12]), Math.trunc(e[13]), Math.trunc(e[14]) ];
};

export class Tanque extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "M1E1";
    this.registro = [];
    this.blanco = false;
    this.rots = Array.from({
      length: 15
    }, () => [ 0, 0, 0 ]);
    this.c = {
      mov: [ 0, 0, 0 ],
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ]
    };
    this.E34 = [ 0, 0, 0 ];
    this.E44 = [ 0, 0, 0 ];
    this.E54 = [ 0, 0, 0 ];
    this.EA8 = [ 0, 0, 0 ];
    this.EE0 = [ 0, 0, 0 ];
    this.EE8 = [ 0, 0, 0 ];
    this.EF0 = Array.from({
      length: 10
    }, () => [ 0, 0, 0 ]);
    for (const k of [ "D54", "D58", "E30", "E2C", "E5C", "E60", "E64", "E68", "E6C", "E70", "E74", "E78", "E88", "E9C", "E9E", "EA0", "EA4", "EC0", "EC4", "EC8", "ECC", "ED0", "ED4", "ED8", "F40", "F44", "F48", "F4C", "F50", "F54", "F58", "F5C", "F60", "F64", "F68", "F6C", "F70", "F74", "F78", "F7C", "F80", "F84", "F88" ]) this[k] = 0;
    this.f740 = 1;
    this.EB0 = null;
    this.EBC = null;
    this.r3644 = 0;
    this.r3648 = 0;
    this.dirCatI = 0;
    this.dirCatD = 0;
    this.catYaw = 0;
    this.proyectiles = [];
    this.efectos3d = [];
    this.ultimaPosSnake = null;
  }
  leerOpciones() {
    const o = this.opts, vars = {
      ...VARS_TANQUE,
      ...this.ctx.varsTanque || {}
    };
    const v = (k, i, d = 0) => {
      const a = o[k];
      if (!Array.isArray(a) || i >= a.length) return null;
      let x = a[i];
      if (x && typeof x === "object") x = "var" in x ? vars[x.var] ?? d : "proc" in x ? x.proc : d;
      return typeof x === "number" ? x : null;
    };
    const kmh = x => idiv(idiv(idiv(x * 1e3, 60) * 100, 1), 180);
    const f = x => idiv(idiv(x * 1e3, 60) * 100, 180);
    const g = x => idiv(idiv(x * 1e3, 60) * 100, 23040);
    let x;
    if (o.e) {
      if ((x = v("e", 0)) != null) this.D5C = f(x);
      if ((x = v("e", 1)) != null) this.D60 = idiv(x, 30);
      if ((x = v("e", 2)) != null) this.D64 = f(x);
      if ((x = v("e", 3)) != null) this.D68 = idiv(x, 30);
      if ((x = v("e", 4)) != null) this.D6C = idiv(x, 30);
      if (this.D64 > this.D5C) this.D64 = this.D5C;
      if (this.D68 > this.D60) this.D68 = this.D60;
    }
    if (o.d) {
      this.D84 = 1;
      if ((x = v("d", 0)) != null) this.D70 = x;
      if ((x = v("d", 1)) != null) this.D74 = x;
      if ((x = v("d", 2)) != null) this.D78 = x;
      if ((x = v("d", 3)) != null) this.D7C = f(x);
      if ((x = v("d", 4)) != null) this.D80 = idiv(x, 30);
      if ((x = v("d", 5)) != null) this.D84 = x;
      if (this.D84 <= 0) this.D84 = 1;
      if ((x = v("d", 6)) != null) this.D88 = f(x);
      if ((x = v("d", 7)) != null) this.D8C = idiv(x, 30);
    }
    if (o.s) {
      if ((x = v("s", 0)) != null) this.D94 = x;
      if ((x = v("s", 1)) != null) this.D90 = x;
      if ((x = v("s", 2)) != null) this.D98 = g(x);
      if ((x = v("s", 3)) != null) this.D9C = g(x);
      if ((x = v("s", 4)) != null) this.DA0 = x;
      this.E24 = this.D94 - this.D90;
      this.E28 = this.D98 - this.D9C;
      if (this.E28 <= 0) this.E28 = 1;
    }
    if (o.g) {
      if ((x = v("g", 0)) != null) this.DA4 = x;
      if ((x = v("g", 1)) != null) this.DA8 = x;
      if ((x = v("g", 2)) != null) this.DAC = x;
      if ((x = v("g", 3)) != null) this.DB0 = x;
      if ((x = v("g", 4)) != null) this.DB4 = idiv(x * 1e6, 108e3);
    }
    if (o.c) {
      if ((x = v("c", 0)) != null) this.DB8 = x;
      if ((x = v("c", 1)) != null) this.DBC = x;
      if ((x = v("c", 2)) != null) this.DC0 = x;
      if ((x = v("c", 3)) != null) this.DC4 = x;
      if ((x = v("c", 4)) != null) this.DC8 = idiv(x * 1e6, 108e3);
    }
    const p = this.actor.p || [ 0, 0, 0 ];
    this.c.mov = [ p[0], p[1], p[2] ];
    if (o.p) {
      for (let i = 0; i < 3; i++) if ((x = v("p", i)) != null) this.c.mov[i] = x;
      for (let i = 0; i < 3; i++) if ((x = v("p", 3 + i)) != null) this.c.turn[i] = idiv(x * 4096, 360);
      if ((x = v("p", 6)) != null) {
        const s = put(rotYXZ(this.c.turn), [ 0, 0, idiv(x * 1e6, 108e3) * 16 ]);
        this.E34 = s;
      }
      this.DCC = [ v("p", 8) ?? 0, v("p", 9) ?? 0, v("p", 10) ?? 0 ];
      this.DCCpad = v("p", 7) ?? 0;
      this.DD4 = [ idiv((v("p", 12) ?? 0) * 4096, 360), idiv((v("p", 13) ?? 0) * 4096, 360), idiv((v("p", 14) ?? 0) * 4096, 360) ];
      this.DD4pad = v("p", 11) ?? 0;
      this.DE2 = v("p", 15) ?? 0;
      this.DDC = idiv((v("p", 16) ?? 0) * 4096, 360);
      this.DDE = idiv((v("p", 17) ?? 0) * 4096, 360);
      this.DE0 = idiv((v("p", 18) ?? 0) * 4096, 360);
      this.DEA = v("p", 19) ?? 0;
      this.DE4 = idiv((v("p", 20) ?? 0) * 4096, 360);
      this.DE6 = idiv((v("p", 21) ?? 0) * 4096, 360);
      this.DE8 = idiv((v("p", 22) ?? 0) * 4096, 360);
    }
    if (o.w) {
      if ((x = v("w", 0)) != null) this.E04 = idiv(x * 1e6, 108e3);
      if ((x = v("w", 1)) != null) this.E08 = x;
      if ((x = v("w", 2)) != null) this.E0C = x;
      if ((x = v("w", 3)) != null) this.E10 = x;
      if ((x = v("w", 4)) != null) this.E14 = x;
      if ((x = v("w", 5)) != null) this.E18 = x;
    }
    if (o.o) {
      this.DEC = v("o", 0) ?? 0;
      this.DF0 = v("o", 1) ?? 0;
      this.DF4 = idiv((v("o", 2) ?? 0) * 4096, 720);
      this.DF8 = v("o", 3) ?? 0;
      this.DFC = v("o", 4) ?? 0;
      this.E00 = v("o", 5) ?? 0;
    } else {
      this.DEC = 2;
      this.DF0 = 4;
      this.DF4 = 796;
      this.DF8 = 12e3;
      this.DFC = 2;
      this.E00 = 1;
    }
    this.E1C = -1;
    this.E20 = -1;
    if (o.z) {
      this.E1C = v("z", 0) ?? -1;
      this.E20 = v("z", 1) ?? -1;
    }
    void kmh;
  }
  async iniciar() {
    for (const k of [ "D5C", "D60", "D64", "D68", "D6C", "D70", "D74", "D78", "D7C", "D80", "D84", "D88", "D8C", "D90", "D94", "D98", "D9C", "DA0", "DA4", "DA8", "DAC", "DB0", "DB4", "DB8", "DBC", "DC0", "DC4", "DC8", "E04", "E08", "E0C", "E10", "E14", "E18", "E24", "E28" ]) this[k] = this[k] || 0;
    this.leerOpciones();
    const [cuerpo, ...orugas] = await Promise.all([ "jefes/m1e1.glb", "jefes/m1e1cl1.glb", "jefes/m1e1cl2.glb", "jefes/m1e1cl3.glb", "jefes/m1e1cr1.glb", "jefes/m1e1cr2.glb", "jefes/m1e1cr3.glb" ].map(u => cargarModelo(this.ctx, u)));
    this.o = new THREE.Group;
    this.o.name = "jefe_M1E1";
    this.o.add(cuerpo);
    this.modelo = cuerpo;
    this.huesos = [];
    for (let i = 0; i < 15; i++) this.huesos.push(cuerpo.getObjectByName("hueso_" + i));
    this.padres = PZ.map(z => z.p);
    this.orugas = new THREE.Group;
    this.orugas.name = "jefe_M1E1_orugas";
    this.catI = orugas.slice(0, 3);
    this.catD = orugas.slice(3, 6);
    for (const m of orugas) {
      this.orugas.add(m);
      m.visible = false;
    }
    this.mgr.mundo.add(this.o);
    this.mgr.mundo.add(this.orugas);
    this.ctx.teñir?.(cuerpo);
    for (const m of orugas) this.ctx.teñir?.(m);
    const nombres = [ "artillero", "artillero", "artillero", "artillero_muerto", "artillero_muerto", "raven_tanque" ];
    const [datos, ...mods] = await Promise.all([ cargarAnim("tankman"), ...nombres.map(n => cargarModelo(this.ctx, `jefes/${n}.glb`)) ]);
    this.datosTankman = datos;
    this.pool = {
      artillero: [],
      artillero_muerto: [],
      raven_tanque: []
    };
    mods.forEach((m, i) => {
      this.ctx.teñir?.(m);
      this.pool[nombres[i]].push(m);
    });
    this.o.traverse(m => {
      if (m.isMesh) m.castShadow = true;
    });
    this.orugas.traverse(m => {
      if (m.isMesh) m.castShadow = true;
    });
    if ((this.J.ctx.hz?.grupos?.length || 0) > 1 && this.mgr.grupoHzd == null) this.mgr.grupoHzd = 1;
    this.E84 = 83;
    this.F44 = this.DA8 >> 1;
    this.F48 = this.DB8 >> 1;
    const cx = z => z.l[0] + idiv(z.u[0] - z.l[0], 2);
    const M0 = setPos2(this.c.mov, this.c.rot);
    this.catIprev = put(M0, [ cx(ORUGA_I), 0, 0 ]);
    this.catDprev = put(M0, [ cx(ORUGA_D), 0, 0 ]);
    this.catI[this.E74].visible = true;
    this.catD[this.E78].visible = true;
    if (this.E08 > 0) {
      this.D54 = 1;
      this.ganchos = true;
    } else {
      this.D54 = 6;
      if (this.DCCpad) this.c.mov = this.DCC.slice();
      if (this.DD4pad) this.c.turn = this.DD4.slice();
      if (this.DE2) {
        this.rots[3][1] = this.DDE;
        this.rots[5][0] = this.DDC;
        this.rots[11][0] = this.DE8;
      }
      if (this.DEA) {
        let t = this.DE6;
        t = Math.max(-227, Math.min(227, t));
        this.rots[13][1] = t;
        t = this.DE6 - t;
        t = Math.max(-341, Math.min(1820, t));
        this.rots[12][1] = t;
        this.rots[13][0] = this.DE4;
      }
    }
    const L = (z, k) => z.l[k], U = (z, k) => z.u[k];
    const cajas = [ {
      m: 1,
      l: [ L(PZ[0], 0), Math.max(600, L(PZ[0], 1)), L(PZ[0], 2) ],
      u: [ U(PZ[0], 0), Math.max(U(PZ[0], 1), Math.max(600, L(PZ[0], 1))), U(PZ[0], 2) ]
    }, {
      m: 2,
      l: [ L(PZ[2], 0), Math.max(600, L(PZ[2], 1)), L(PZ[2], 2) ],
      u: [ U(PZ[2], 0), Math.max(U(PZ[2], 1), 600), U(PZ[2], 2) ]
    }, {
      m: "catI",
      l: [ ORUGA_I.l[0], 600, ORUGA_I.l[2] ],
      u: [ ORUGA_I.u[0], Math.max(ORUGA_I.u[1], 600), ORUGA_I.u[2] ]
    }, {
      m: "catD",
      l: [ ORUGA_D.l[0], 600, ORUGA_D.l[2] ],
      u: [ ORUGA_D.u[0], Math.max(ORUGA_D.u[1], 600), ORUGA_D.u[2] ]
    }, {
      m: 3,
      l: [ PZ[4].l[0] + 200, PZ[4].l[1], PZ[4].l[2] ],
      u: [ PZ[4].u[0] - 200, PZ[4].u[1], PZ[4].u[2] - 700 ]
    } ];
    if (this.D54 === 6) for (const c of cajas) c.l[1] = 0;
    this.cajas = cajas;
    this.crearParedes();
    this.c.rot = this.c.turn.slice();
    if (this.D54 !== 6) {
      this.E7C = this.E80 = 999;
      this.A80 = idiv(ORUGA_I.u[0] - ORUGA_I.l[0], 3);
      this.f8C8 = idiv(PZ[0].u[0] - PZ[0].l[0], 3);
      this.f95C = PZ[0].u[0] - PZ[0].l[0] >> 2;
      this.altoCuerpo = idiv(PZ[0].u[1] - PZ[0].l[1], 6);
      this.orugaDaño = new Array(10).fill(0);
      this.orugaArma = new Array(10).fill(-1);
      this.barras = [ {
        y: 28,
        rest: 0,
        now: 0,
        max: 1024,
        visible: false,
        conf: {
          nombre: "GUNNER",
          izq: [ 16, 111, 159 ],
          der: [ 31, 223, 127 ]
        }
      } ];
    }
    this.blancosOrugas = this.puntosOrugas(1, 600);
    this.blancosAplasta = this.puntosOrugas(0, 300);
    this.dibujar();
    this.log("aparece", {
      D54: this.D54,
      E08: this.E08,
      mov: this.c.mov.slice()
    });
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 600) this.registro.shift();
  }
  mundo(rots = this.rots, mov = this.c.mov, rot = this.c.rot) {
    const W = [];
    const base = setPos2(mov, rot);
    for (let i = 0; i < 15; i++) {
      const z = PZ[i], m = rotZYX(rots[i]);
      m.setPosition(z.t[0], z.t[1], z.t[2]);
      W.push((z.p < 0 ? base.clone() : W[z.p].clone()).multiply(m));
    }
    return W;
  }
  verticesOrugas(a4) {
    const v = [], I = ORUGA_I, D = ORUGA_D;
    let x = I.l[0];
    if (a4 === 1) x += I.u[0] - x >> 1;
    v.push([ x, I.l[1], idiv(2 * I.u[2], 3) ], [ x, I.l[1], idiv(I.u[2], 3) ], [ x, I.l[1], 0 ], [ x, I.l[1], idiv(I.l[2], 3) ], [ x, I.l[1], idiv(2 * I.l[2], 3) ]);
    x = D.u[0];
    if (a4 === 1) x += D.l[0] - x >> 1;
    v.push([ x, D.l[1], idiv(2 * D.u[2], 3) ], [ x, D.l[1], idiv(D.u[2], 3) ], [ x, D.l[1], 0 ], [ x, D.l[1], idiv(D.l[2], 3) ], [ x, D.l[1], idiv(2 * D.l[2], 3) ]);
    return v;
  }
  puntosOrugas(a4, dy) {
    const M = setPos2(this.c.mov, this.c.turn);
    return this.verticesOrugas(a4).map(p => put(M, [ p[0], p[1] + dy, p[2] ]));
  }
  trampa(nombre, p) {
    const g = this.J.ctx.hz?.grupos?.[this.mgr.grupoHzd ?? 0];
    if (!g) return null;
    return g.triggers.find(t => t.tipo === "trap" && t.nombre === nombre && t.caja[0][0] <= p[0] && p[0] <= t.caja[1][0] && t.caja[0][1] <= p[1] && p[1] <= t.caja[1][1] && t.caja[0][2] <= p[2] && p[2] <= t.caja[1][2]) || null;
  }
  piso(x, z, y) {
    const h = this.J.alturaPiso?.(x * MM, z * MM, y * MM);
    return h == null ? null : Math.round(h * 1e3);
  }
  zona(p) {
    const J = this.J;
    const i = J.zonaCercana?.(new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM)) ?? -1;
    const z = this.J.ctx.hz?.zonas?.[i];
    if (!z) return null;
    return {
      i: i,
      x: z.p[0],
      y: z.p[1],
      z: z.p[2],
      w: z.w,
      h: z.h,
      nears: z.vecinas
    };
  }
  cuadro() {
    const S = this.snake(), J = this.J, frame = this.mgr.frame;
    this.snapMov = this.c.mov.slice();
    this.snapRot = this.c.rot.slice();
    this.snapRots3 = this.rots[3][1];
    this.rots[10][1] = 284;
    this.c.turn[0] += this.E9C;
    this.c.turn[1] += this.E9E;
    this.c.turn[2] += this.EA0;
    for (let k = 0; k < 3; k++) this.c.mov[k] += this.c.step[k];
    for (let k = 0; k < 3; k++) this.c.rot[k] = s16(nearExp4P(this.c.rot[k], this.c.turn[k]));
    this.W = this.mundo();
    this.posOrugas = {
      mov: [ this.c.mov[0], this.c.mov[1] - this.EA4, this.c.mov[2] ],
      rot: [ this.c.rot[0] - this.E9C, this.c.rot[1] - this.E9E, this.c.rot[2] - this.EA0 ]
    };
    for (const k of [ "F40", "F44", "F48", "F4C", "F50", "F54", "F58", "F60", "F64", "F5C", "F68", "F6C", "F70", "F74", "F78", "F80" ]) if (--this[k] < 0) this[k] = 0;
    if (this.EC0 === 1) {
      this.EC4++;
      this.EC8 = 0;
    } else if (this.EC0 === 2) {
      if (++this.EC8 >= 3) {
        this.EC8 = 0;
        if (rnd() & 3) this.se(134, this.c.mov);
      }
    } else if (this.EC0 === 3) this.EC8 = 0;
    if (this.ED0 === 0) {
      this.E44 = [ S.x, S.y, S.z ];
    }
    const va = [ this.c.mov[0] - this.E44[0] >> 2, this.c.mov[1] - this.E44[1] >> 2, this.c.mov[2] - this.E44[2] >> 2 ];
    this.E5C = isqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]) << 2;
    this.E60 = this.E5C < 8001 ? 63 : this.E5C < 30001 ? 63 - idiv(this.E5C - 8e3 << 5, 22e3) : 31;
    if (this.D54 === 1 && this.f740 === 0 && this.E5C < this.DC4) {
      this.D54 = 2;
      this.log("pelea");
    }
    if (this.EB0 && this.EB0.f1F0 === 1) {
      if (--this.E08 <= 0) {
        this.D54 = 5;
        this.F80 = 30;
        const hud = this.mgr.hud;
        this.mgr.fx.push({
          t: 0,
          dur: 30,
          fn: t => {
            hud.blanco = Math.min(1, t / 30);
          }
        });
        this.log("último artillero", {
          E08: this.E08
        });
      } else {
        this.D54 = 4;
        this.F4C = this.D78;
        this.log("artillero muerto", {
          E08: this.E08
        });
      }
    }
    if (this.E08 <= 0 && this.D54 === 5 && this.F80 <= 0) {
      this.morir();
      return;
    }
    if (this.F4C <= 0 && this.D54 === 4 && !this.EB0 && this.ED0 === 0) {
      this.D54 = this.D58 ? 7 : 2;
      this.F5C = this.E14;
    }
    const b = this.barras[0];
    if (b) {
      b.visible = this.D54 !== 1 && this.D54 !== 6;
      if (b.visible) {
        let s0 = idiv(this.E0C + this.D74 * (this.E08 - 1) << 10, this.D74 * this.D70);
        if (s0 < 0) s0 = 0;
        b.rest = this.ED8;
        b.now = s0;
        this.ED8 = s0;
      }
    }
    this.E9C = this.E9E = this.EA0 = 0;
    this.EA4 = 0;
    this.D797C();
    this.D863C();
    this.D627C();
    this.DA02C();
    this.DA62C();
    this.D9754();
    this.c.mov[1] += this.EA4;
    this.DA940();
    this.caterpiller();
    this.DACF0();
    this.DD1C8();
    if (this.ED0 === 1) this.ED0 = 0;
    this.EC0 = 0;
    this.f740 = 0;
    this.E2C = this.E30;
    this.proyectilesCuadro();
    this.controlSnake();
    if (this.D54 === 6) return;
    this.poderes(S);
    if (this.F4C > 0 && (this.F4C & 15) === 0) {
      const p = posDe(this.W[10]);
      this.humo([ p[0], p[1] - 500, p[2] ], 1e3);
    }
    this.dañoOrugas();
    if (this.F50 > 0 && (this.F50 & 15) === 0) {
      const p = this.blancosOrugas[this.E88];
      this.humo(p, 1e3);
    }
  }
  poderes(S) {
    if (this.ED0 !== 0 || this.J.muerto || this.J.ctx.vuelo?.()) return;
    const post = this.J.postura?.() ?? 0, hy = [ 700, 500, 500 ][post];
    const toca = (c, h) => Math.abs(c[0] - S.x) <= h[0] + 300 && Math.abs(c[1] - S.y) <= h[1] + hy && Math.abs(c[2] - S.z) <= h[2] + 300;
    if (this.F78 <= 0) {
      for (let i = 0; i < 10; i++) if (toca(this.blancosAplasta[i], [ this.A80, 50, this.A80 ])) {
        this.golpearSnake(this.DA0, "orugas");
        break;
      }
    }
    const s0 = this.E68 - this.D9C;
    const v = s0 >= 0 ? idiv(this.E24 * s0, this.E28) + this.D90 : 0;
    this.vitalCuerpo = v;
    if (this.F78 <= 0 && v > 0) {
      const t = norm2048(this.c.turn[1]), r = ratan2(this.E34[0], this.E34[2]);
      const adelante = Math.abs(t - r) < 1024;
      const M = setPos2(this.c.mov, this.c.turn), s0b = this.f8C8 * 3 >> 2, s1 = this.f95C * 3 >> 2, z = PZ[0];
      const pts = adelante ? [ [ [ 0, z.u[1], z.u[2] - s0b ], this.f8C8 ], [ [ z.l[0] + s1, z.u[1], z.u[2] - s1 ], this.f95C ], [ [ z.u[0] - s1, z.u[1], z.u[2] - s1 ], this.f95C ] ] : [ [ [ 0, z.u[1], z.l[2] + s0b ], this.f8C8 ], [ [ z.l[0] + s1, z.u[1], z.l[2] + s1 ], this.f95C ], [ [ z.u[0] - s1, z.u[1], z.l[2] + s1 ], this.f95C ] ];
      for (const [p, h] of pts) if (toca(put(M, p), [ h, this.altoCuerpo, h ])) {
        this.golpearSnake(v, "embestida");
        break;
      }
    }
  }
  golpearSnake(n, motivo) {
    const J = this.J, inv = J.ctx.inventario;
    J.vida -= n / (inv?.vidaMax || 256);
    J.ctx.daño?.();
    this.F78 = 90;
    this.se(189, null);
    this.derribarSnake();
    this.log("aplasta", {
      motivo: motivo,
      "daño": n
    });
  }
  derribarSnake() {
    if (this.tDerribo > 0) return;
    this.tDerribo = 30;
    this.mgr.congelar(true);
  }
  D627C() {
    let spd_max = this.D68, accel = this.D64, turn = 0, snd = 0;
    const c = this.c;
    c.step[0] = 0;
    c.step[2] = 0;
    const mv = [ 0, 0, 0 ];
    const hacia = p => {
      mv[0] = p[0] - c.mov[0] >> 2;
      mv[2] = p[2] - c.mov[2] >> 2;
    };
    if (this.E30 === 7) hacia(this.EA8); else if (this.E30 >= 8 && this.E30 <= 10) hacia(this.E54); else if (this.E30 >= 11 && this.E30 <= 14) {
      spd_max = this.D60;
      accel = this.D5C;
      hacia(this.E54);
    } else hacia(this.E44);
    const E = this.E34;
    let len = isqrt((E[0] >> 2) * (E[0] >> 2) + (E[1] >> 2) * (E[1] >> 2) + (E[2] >> 2) * (E[2] >> 2));
    const quarter = spd_max >> 2;
    let dir = [ 0, 0, 0 ];
    if (len !== 0) {
      len = idiv(this.D6C << 8, len << 2);
      dir = [ E[0] * len >> 8, E[1] * len >> 8, E[2] * len >> 8 ];
    }
    const acc = [ 0, 0, 0 ];
    if (Math.abs(E[0]) + Math.abs(E[2]) !== 0 && Math.abs(dir[0]) + Math.abs(dir[2]) !== 0) {
      const tmp = E.slice();
      let i = idiv(Math.abs(E[0]) + Math.abs(E[2]), Math.abs(dir[0]) + Math.abs(dir[2]));
      while (i > 0) {
        i--;
        acc[0] += tmp[0] >> 8;
        tmp[0] -= dir[0];
        acc[2] += tmp[2] >> 8;
        tmp[2] -= dir[2];
      }
    }
    len = isqrt(mv[0] * mv[0] + mv[1] * mv[1] + mv[2] * mv[2]);
    if (len !== 0) {
      const i = idiv(spd_max << 8, len);
      mv[0] = mv[0] * i >> 8;
      mv[1] = mv[1] * i >> 8;
      mv[2] = mv[2] * i >> 8;
    }
    const girarA = objetivo => {
      let st = norm2048(objetivo);
      st = Math.max(-spd_max >> 4, Math.min(spd_max >> 4, st));
      turn = st;
      c.turn[1] = norm2048(c.turn[1] - st);
    };
    switch (this.D54) {
     case 6:
      this.E30 = 0;
      return;

     case 1:
     case 3:
     case 4:
     case 5:
      this.E30 = 0;
      break;

     case 2:
      if (this.E30 === 5) {
        if (this.E68 !== 0) this.E30 = 0; else {
          mv.fill(0);
          this.E34 = [ 0, 0, 0 ];
          const v = [ this.E44[0] - c.mov[0] >> 2, 0, this.E44[2] - c.mov[2] >> 2 ], t = ratan2(v[0], v[2]);
          let a = norm2048(s16(c.rot[1] + 1024) - t), b2 = norm2048(s16(c.rot[1] - 1024) - t);
          if (Math.abs(b2) < Math.abs(a)) a = b2;
          girarA(a);
        }
      } else if (this.E30 === 6) {
        if (this.E68 !== 0) this.E30 = 0; else {
          mv.fill(0);
          this.E34 = [ 0, 0, 0 ];
          const v = [ this.E44[0] - c.mov[0] >> 2, 0, this.E44[2] - c.mov[2] >> 2 ], t = ratan2(v[0], v[2]);
          girarA(s16(c.rot[1] + this.rots[3][1] + 682) - t);
        }
      } else if (this.E30 >= 8 && this.E30 <= 10 || this.E30 === 12 || this.E30 === 13 || this.E30 === 14) {
        if (len << 2 < 2e3) this.E30 = 0;
      } else if (this.E30 === 11) {
        if (len << 2 < 2e3) {
          mv.fill(0);
          this.E34 = [ 0, 0, 0 ];
          const v = [ this.E44[0] - c.mov[0] >> 2, 0, this.E44[2] - c.mov[2] >> 2 ], t = ratan2(v[0], v[2]);
          girarA(s16(c.rot[1] + 1024) - t);
        }
      } else if (this.E30 === 1) this.E30 = 0; else if (this.E30 === 2) {
        if (quarter < this.E68 && mv[0] * this.E34[0] + mv[1] * this.E34[1] + mv[2] * this.E34[2] <= 0) this.E30 = 0;
      }
      break;

     default:
      break;
    }
    if (this.E30 === 0) {
      if (quarter >= this.E68) {
        mv.fill(0);
        this.E34 = [ 0, 0, 0 ];
      } else {
        mv[0] = -dir[0];
        mv[1] = -dir[1];
        mv[2] = -dir[2];
      }
    } else {
      if (this.E30 === 3) {
        mv[0] = -mv[0];
        mv[1] = -mv[1];
        mv[2] = -mv[2];
      }
      const vec = [ c.mov[0] + acc[0], 0, c.mov[2] + acc[2] ];
      const h = this.piso(vec[0], vec[2], c.mov[1] + 2e3);
      vec[1] = (h ?? 0) + 750;
      const zone = this.zona(vec);
      if (zone && (this.E30 < 7 || this.E30 > 14)) {
        const st = [ 0, 0, 0 ];
        if (c.mov[0] <= zone.x + zone.w && c.mov[0] >= zone.x - zone.w && (vec[0] > zone.x + zone.w || vec[0] < zone.x - zone.w)) {
          st[0] = mv[0];
          mv[0] = -dir[0];
        }
        if (c.mov[2] <= zone.z + zone.h && c.mov[2] >= zone.z - zone.h && (vec[2] > zone.z + zone.h || vec[2] < zone.z - zone.h)) {
          st[2] = mv[2];
          mv[2] = -dir[2];
        }
        mv[0] += st[2];
        mv[2] += st[0];
      }
    }
    this.E34 = [ this.E34[0] + mv[0], this.E34[1] + mv[1], this.E34[2] + mv[2] ];
    const E2 = this.E34;
    len = isqrt((E2[0] >> 2) * (E2[0] >> 2) + (E2[1] >> 2) * (E2[1] >> 2) + (E2[2] >> 2) * (E2[2] >> 2));
    if (len === 0) len = 1;
    len = idiv(accel << 8, len << 2);
    if (len < 256) this.E34 = [ E2[0] * len >> 8, E2[1] * len >> 8, E2[2] * len >> 8 ];
    const vec = [ c.mov[0] + (this.E34[0] >> 8), c.mov[1] + 500, c.mov[2] + (this.E34[2] >> 8) ];
    const zone = this.zona(vec);
    if (!zone) return;
    if (this.E30 === 3) {
      if (c.mov[0] <= zone.x + zone.w && c.mov[0] >= zone.x - zone.w && (vec[0] > zone.x + zone.w || vec[0] < zone.x - zone.w) && c.mov[2] <= zone.z + zone.h && c.mov[2] >= zone.z - zone.h && (vec[2] > zone.z + zone.h || vec[2] < zone.z - zone.h)) {
        this.E30 = 7;
        const n = (zone.nears || []).filter(k => k !== 255 && k < (this.J.ctx.hz?.zonas?.length || 0));
        if (n.length) {
          const z = this.J.ctx.hz.zonas[n[randU(4096) % n.length]];
          this.EA8 = [ z.p[0], z.p[1], z.p[2] ];
        }
      }
    } else if (this.E30 === 7) {
      if (c.mov[0] >= this.EA8[0] - 500 && c.mov[0] <= this.EA8[0] + 500 && c.mov[2] >= this.EA8[2] - 500 && c.mov[2] <= this.EA8[2] + 500) this.E30 = 0;
    }
    const st = [ Math.max(zone.x - zone.w, Math.min(zone.x + zone.w, vec[0])), 0, Math.max(zone.z - zone.h, Math.min(zone.z + zone.h, vec[2])) ];
    if (st[0] !== vec[0]) this.E34[0] = 0;
    if (st[2] !== vec[2]) this.E34[2] = 0;
    if (this.D54 === 2 && (st[0] !== c.mov[0] || st[2] !== c.mov[2])) {
      const i = ratan2(st[0] - c.mov[0], st[2] - c.mov[2]);
      c.turn[1] = s16(nsp(c.turn[1], i, spd_max >> 4));
    }
    st[0] -= c.mov[0];
    st[2] -= c.mov[2];
    c.step[0] = st[0];
    c.step[2] = st[2];
    len = isqrt(st[0] * st[0] + st[2] * st[2]);
    if (this.E68 <= 0) {
      if (len > 0 || this.E30 === 0 && this.E2C !== 0) this.F54 = 15;
    } else if (len <= 0 || this.E30 === 0 && this.E2C !== 0) this.F54 = 15;
    if (this.E6C === 0) {
      if (turn !== 0) snd = 1;
    } else if (turn === 0) snd = 2;
    this.E6C = turn;
    if (this.E68 === 0) {
      if (len !== 0) snd = 1;
    } else if (len === 0) snd = 2;
    this.E68 = len;
    if (len > 0 || this.E30 !== this.E2C) this.F7C = 0; else this.F7C++;
    const T = this.mgr.frame;
    if (snd === 0) {
      if (this.F6C < 2) {
        if (this.E68 === 0 && this.E6C === 0) {
          if (T % 5 === 0 || this.F6C === 1) this.se(176, c.mov);
        } else {
          const rate = spd_max >> 4;
          let n;
          if (this.E6C !== 0) n = idiv(Math.abs(rate - Math.abs(this.E6C)) * 4, rate || 1) + 2; else {
            n = idiv(Math.abs((spd_max - isqrt(mv[0] * mv[0] + mv[2] * mv[2])) * 2), spd_max || 1) + 2;
            n += idiv(((accel >> 8) - this.E68) * 2, accel >> 8 || 1);
          }
          if (n >= 6) n = 5;
          if (n < 1) n = 1;
          if (T % n === 0 || this.F6C === 1) this.se(180, c.mov);
        }
      }
    } else {
      this.F6C = 6;
      this.se(179, c.mov);
    }
  }
  D797C() {
    const W = this.W;
    let found = 0, fire = 0, vec;
    if (!(this.mgr.frame & 1)) vec = this.EE0.slice(); else {
      const pos = [ this.E44[0], this.E44[1] - 400, this.E44[2] ];
      let m = movePos(W[0], PZ[3].t);
      const mtx = m.clone();
      let v0 = posDe(m);
      let v1 = [ v0[0] - pos[0] >> 2, v0[1] - pos[1] >> 2, v0[2] - pos[2] >> 2 ];
      const tgtY = ratan2(v1[0], v1[2]);
      const lz = PZ[5].u[2] - PZ[5].l[2];
      let q = posDe(movePos(m, [ 0, 0, lz ]));
      const curY = ratan2(v0[0] - q[0], v0[2] - q[2]);
      vec = [ 0, norm2048(tgtY - curY), 0 ];
      m = rotatePos(mtx, vec);
      m = movePos(m, PZ[5].t);
      v0 = posDe(m);
      v1 = [ v0[0] - pos[0] >> 2, v0[1] - pos[1] >> 2, v0[2] - pos[2] >> 2 ];
      const tgtX = ratan2(v1[1], isqrt(v1[0] * v1[0] + v1[2] * v1[2]));
      q = posDe(movePos(m, [ 0, 0, lz ]));
      const d = [ v0[0] - q[0], v0[1] - q[1], v0[2] - q[2] ];
      const curX = ratan2(d[1], isqrt(d[0] * d[0] + d[2] * d[2]));
      vec[0] = tgtX - curX;
      const chaff = this.chaff();
      if ([ 1, 3, 4, 5, 6 ].includes(this.D54) || chaff) {
        vec[1] = this.rots[3][1];
        vec[0] = this.rots[5][0];
      } else if (this.E30 === 11) {
        vec[1] = 0;
        vec[0] = 0;
        this.E30 = 0;
        this.D9A14();
      } else if (vec[0] < -284 || Math.abs(vec[1]) < 569 && vec[0] >= 58 || Math.abs(vec[1]) >= 569 && Math.abs(vec[1]) < 1479 && vec[0] >= 228 || Math.abs(vec[1]) >= 1479 && vec[0] > 0) {
        if (vec[0] <= 0) vec[0] = Math.max(-284, vec[0]); else if (Math.abs(vec[1]) < 569) {
          if (vec[0] >= 2) {
            vec[0] = 57;
            if (this.E30 === 0 || this.E30 === 5) fire = 1;
          }
        } else if (Math.abs(vec[1]) < 1479) vec[0] = Math.min(vec[0], 227); else if (vec[0] >= -74) {
          vec[0] = 0;
          if (this.E30 === 0 || this.E30 === 5) fire = 1;
        }
        if (this.E30 < 7 || this.E30 > 11) {
          if (fire === 1) this.E30 = 5; else if (this.E30 === 2 && this.F7C >= 16) this.E30 = 5; else if (this.E30 === 2 && this.E5C >= idiv(this.DC4 * 4, 5)) this.E30 = 2; else if (this.E5C >= this.DC4) this.E30 = 2; else if (this.E30 === 5) this.E30 = 0;
          this.D9A14();
        }
        fire = 0;
      } else if (this.D54 === 2) {
        if (Math.abs(this.rots[3][1] - vec[1]) < 11 && Math.abs(this.rots[5][0] - vec[0]) < 11) {
          if (this.E30 < 7 || this.E30 > 11) {
            if (this.E5C < this.DC4 >> 1) this.E30 = 3; else if (this.E5C >= this.DC4) this.E30 = 2; else this.E30 = 0;
            this.D9A14();
          }
          found = this.trampa("nocannon", this.E44) ? 1 : 0;
          if (found === 0 && this.F48 <= 0 && this.E5C > this.DBC && this.E5C < this.DC4) {
            fire = 1;
            this.F58 = 15;
            this.F48 = this.DB8;
          }
        }
      }
      this.EE0 = vec.slice();
    }
    const k = this.E00 === 1 && this.E5C < this.DBC ? 6 : 10;
    this.rots[3][1] = s16(nsp(this.rots[3][1], vec[1], k));
    this.rots[5][0] = s16(nsp(this.rots[5][0], vec[0], k));
    this.rots[3][1] = norm2048(this.rots[3][1]);
    const r3 = this.rots[3][1], r5 = () => this.rots[5][0];
    if (r5() < -284) this.rots[5][0] = nsp(r5(), -284, 10);
    if (Math.abs(r3) < 569) {
      if (r5() >= 58) this.rots[5][0] = nsp(r5(), 57, 10);
    } else if (Math.abs(r3) < 1479) {
      if (r5() >= 228) this.rots[5][0] = nsp(r5(), 227, 10);
    } else if (r5() > 0) this.rots[5][0] = nsp(r5(), 0, 10);
    if (fire === 1) {
      this.ECC++;
      this.se(184, this.c.mov);
      const boca = movePos(W[5], [ 0, 0, PZ[5].u[2] - PZ[5].l[2] ]);
      this.disparoCañon(boca);
    } else {
      if (this.mgr.stun) this.F68 = 240;
      const nocan = this.trampa("nocannon", this.E44);
      this.E64 = !nocan && (this.F68 > 0 || !this.chaff() && this.E5C > this.DBC) ? 1 : 0;
    }
  }
  chaff() {
    return (this.ctx.armas?.chaff ?? 0) > 0 || !!this.J.ctx.inventario?.chaff;
  }
  D863C() {
    const W = this.W;
    let fire = 0, vec;
    const k = this.E08 < 2 ? 1 : 3;
    const G = this.EB0;
    if (this.mgr.frame & 1) vec = this.EE8.slice(); else {
      const pos = this.E44;
      let m = movePos(W[0], PZ[3].t);
      m = m.clone().multiply(rotYXZ(this.rots[3]));
      m = movePos(m, PZ[12].t);
      const mtx = m.clone();
      let v0 = posDe(m);
      let v1 = [ v0[0] - pos[0] >> 2, v0[1] - pos[1] >> 2, v0[2] - pos[2] >> 2 ];
      const tgtY = ratan2(v1[0], v1[2]);
      const lz = PZ[13].u[2] - PZ[13].l[2];
      let q = posDe(movePos(m, [ 0, 0, lz ]));
      const curY = ratan2(v0[0] - q[0], v0[2] - q[2]);
      vec = [ 0, norm2048(tgtY - curY), 0 ];
      if (vec[1] < -1195) vec[1] = 4096 - vec[1];
      m = rotatePos(mtx, vec);
      m = movePos(m, [ 0, PZ[13].t[1], 0 ]);
      v0 = posDe(m);
      v1 = [ v0[0] - pos[0] >> 2, v0[1] - pos[1] >> 2, v0[2] - pos[2] >> 2 ];
      const tgtX = ratan2(v1[1], isqrt(v1[0] * v1[0] + v1[2] * v1[2]));
      q = posDe(movePos(m, [ 0, 0, lz ]));
      const d = [ v0[0] - q[0], v0[1] - q[1], v0[2] - q[2] ];
      vec[0] = tgtX - ratan2(d[1], isqrt(d[0] * d[0] + d[2] * d[2]));
      const mira = () => [ this.rots[13][0], this.rots[12][1] + this.rots[13][1], 0 ];
      const fuera = () => {
        if (this.E30 < 7 || this.E30 > 11) this.E30 = 3;
      };
      if ([ 1, 3, 4, 5, 6 ].includes(this.D54)) {
        this.F40 = 0;
        vec = mira();
        if (this.D54 === 1) this.F84 = idiv(this.DA4, k); else if (this.D54 === 4) this.E10 = 1;
      } else if (G && G.motor.action === 6) {
        vec = mira();
        if (G.motor.isEnd) G.accion(0);
      } else if (this.E64 !== 0) {
        this.F40 = 0;
        vec = mira();
        this.rots[11][0] = nearSpeed(this.rots[11][0], 0, 45);
        if (this.rots[11][0] >= -180 && this.rots[11][0] < -135) this.se(187, this.c.mov);
        if (G) {
          if (this.rots[11][0] === 0) {
            G.destruir();
            this.EB0 = null;
          } else if (G.vivoBlanco && G.motor.action !== 5) G.accion(5);
        }
        if (this.E30 === 6) this.E30 = 0;
      } else if (this.rots[11][0] !== -1820 || !G || G.motor.action === 2) {
        fuera();
        this.F40 = 0;
        vec = mira();
        this.rots[11][0] = nearSpeed(this.rots[11][0], -1820, 45);
        if (this.rots[11][0] >= -1685 && this.rots[11][0] < -1640) this.se(188, this.c.mov);
        if (!this.EB0 && this.E08 > 0) {
          this.EB0 = this.nuevoActor(Artillero, "artillero");
          if (this.EB0) {
            this.EB0.accion(2);
            this.log("sale artillero");
          }
        }
      } else if (this.F84 <= 0 || this.DA8 * k < this.F44) {
        if (this.E30 < 7 || this.E30 > 11) {
          this.E30 = 3;
          this.D9A14();
        }
        this.F40 = 0;
        vec = mira();
        if (this.F84 <= 0) {
          this.F84 = idiv(this.DA4, k);
          this.F44 = 0;
          G?.accion(6);
        }
      } else if (vec[0] < -455 || !(vec[1] >= 569 && vec[1] <= 1479 ? vec[0] < 285 : vec[0] < 114) || vec[1] < -568 || vec[1] >= 2048) {
        if (this.E30 < 7 || this.E30 > 11) {
          if (this.F40 === 0) this.F40 = 1010;
          if (this.F78 > 0) this.E30 = 3; else if (this.F40 >= 711) this.E30 = 4; else if (this.F40 < 211) this.E30 = 1; else this.E30 = 3;
          if (this.chaff() && this.F84 > 0 && this.E30 !== 1) this.E30 = 6;
          this.D9A14();
        }
        vec[1] = Math.max(-568, Math.min(2047, vec[1]));
        if (vec[0] <= 0) vec[0] = Math.max(-455, vec[0]); else if (vec[1] >= 569 && vec[1] <= 1479) vec[0] = Math.min(vec[0], 284); else vec[0] = Math.min(vec[0], 113);
        G?.accion(0);
      } else if (this.E64 === 0 && this.D54 === 2) {
        if (Math.abs(this.rots[12][1] + this.rots[13][1] - vec[1]) < 796 * k && Math.abs(this.rots[13][0] - vec[0]) < 341 * k) {
          if ((this.E30 < 7 || this.E30 > 11) && this.F40 <= 0) {
            if (this.F78 > 0) this.E30 = 3; else if (this.E5C < this.DC4 >> 1) this.E30 = 3; else if (this.E5C >= this.DB0) this.E30 = 2; else this.E30 = 1;
            if (this.chaff()) {
              if (this.E30 !== 1) this.E30 = 6; else this.F40 = 210;
            } else if (this.E30 === 1) this.F40 = 210;
            this.D9A14();
          }
          if (this.F44 <= 0 && this.E5C < this.DB0) {
            fire = 1;
            this.F44 = this.DA8;
            this.F84--;
            G?.accion(1);
          }
          if (G?.motor.isEnd) G.accion(0);
        }
      }
      this.EE8 = vec.slice();
    }
    if (this.EB0 && this.EB0.motor.action === 6 && this.EB0.motor.isEnd) this.EB0.accion(0);
    let y1 = Math.max(-227, Math.min(227, vec[1]));
    let y0 = Math.max(-341, Math.min(1820, vec[1] - y1));
    this.rots[12][1] = nearSpeed(this.rots[12][1], y0, idiv(23, k));
    this.rots[13][1] = s16(nsp(this.rots[13][1], y1, idiv(46, k)));
    this.rots[13][0] = s16(nsp(this.rots[13][0], vec[0], idiv(46, k)));
    if (this.rots[12][1] < -341) this.rots[12][1] = nsp(this.rots[12][1], -341, 23);
    if (this.rots[12][1] >= 1821) this.rots[12][1] = nsp(this.rots[12][1], 1820, 23);
    if (this.rots[13][1] < -227) this.rots[13][1] = nsp(this.rots[13][1], -227, 46);
    if (this.rots[13][1] >= 228) this.rots[13][1] = nsp(this.rots[13][1], 227, 46);
    if (this.rots[13][0] < -455) this.rots[13][0] = nsp(this.rots[13][0], -455, 46);
    if (this.rots[12][1] >= 569 && this.rots[12][1] <= 1479) {
      if (this.rots[13][0] >= 285) this.rots[13][0] = nsp(this.rots[13][0], 284, 46);
    } else if (this.rots[13][0] >= 114) this.rots[13][0] = nsp(this.rots[13][0], 113, 46);
    if (fire === 0) this.ED4++; else {
      this.ED4 = 0;
      this.se(185, this.c.mov);
      const boca = movePos(W[13], [ 0, 0, PZ[13].u[2] - PZ[13].l[2] ]);
      const o = new THREE.Vector3(...posDe(boca));
      const d = new THREE.Vector3(0, 0, 1).transformDirection(boca);
      this.mgr.balas.nueva(o, d, 0, this.DAC, {
        vel: this.DB4,
        largo: this.DB0,
        rebota: false
      });
      this.mgr.chispa(o.clone().multiplyScalar(MM), .3, 2);
      this.disparosAmetralladora = (this.disparosAmetralladora || 0) + 1;
    }
  }
  D9754() {
    if (this.F58 <= 0) return;
    if (this.F58 >= 15) {
      const M = setPos2(this.c.mov, this.c.turn), b = this.cajas[0];
      this.humo(put(M, [ 0, b.u[1], b.l[2] >> 1 ]), 400);
      this.humo(put(M, [ 0, b.u[1], b.u[2] >> 1 ]), 400);
    }
    let s0 = this.F58 - 10, d;
    if (s0 >= 0) {
      d = 5;
      s0 = 5 - s0;
    } else {
      d = 10;
      s0 = this.F58;
    }
    s0 = idiv(s0 * 34, d);
    const m = rotYXZ([ s0, 0, 0 ]).multiply(rotYXZ(this.rots[3]));
    const v = put(m, [ 0, 0, 100 ]);
    const dist = isqrt(v[0] * v[0] + v[2] * v[2]);
    const r = ratan2(v[1], dist);
    let pv2 = s0 - Math.abs(s16(r));
    let t = this.rots[3][1];
    while (t < 0) t += 4096;
    while (t >= 4097) t -= 4096;
    if (t >= 2049) pv2 = -pv2;
    this.E9C += r;
    this.EA0 += pv2;
  }
  D9A14() {
    const hz = this.J.ctx.hz, g = hz?.grupos?.[this.mgr.grupoHzd ?? 0];
    if (!g) return;
    const traps = g.triggers.filter(t => t.tipo === "trap");
    const dentro = (t, p) => t.caja[0][0] <= p[0] && p[0] <= t.caja[1][0] && t.caja[0][1] <= p[1] && p[1] <= t.caja[1][1] && t.caja[0][2] <= p[2] && p[2] <= t.caja[1][2];
    let trap = null;
    for (const t of traps) {
      if (t.nombre === "drive4" && dentro(t, this.E44)) {
        trap = t;
        break;
      }
      if (this.F78 > 0 && [ "drive5", "drive6", "drive7" ].includes(t.nombre) && dentro(t, this.E44)) {
        trap = t;
        break;
      }
    }
    if (!trap) {
      for (const t of traps) if (this.E08 < 2 && this.E64 === 0 && [ "drive1", "drive2", "drive3" ].includes(t.nombre) && dentro(t, this.c.mov)) {
        trap = t;
        break;
      }
      if (!trap) return;
    }
    const tabla = {
      drive1: [ 8, 0 ],
      drive2: [ 9, 1 ],
      drive3: [ 10, 2 ],
      drive4: [ 11, 3 ],
      drive5: [ 12, 4 ],
      drive6: [ 13, 5 ],
      drive7: [ 14, 6 ]
    }[trap.nombre];
    const ruta = hz.rutas?.[tabla[1]];
    if (!ruta?.puntos?.length) return;
    this.E30 = tabla[0];
    const P = ruta.puntos.map(x => x.p), c = this.c.mov;
    let d = [ c[0] - P[0][0] >> 2, c[1] - P[0][1] >> 2, c[2] - P[0][2] >> 2 ];
    let dist = isqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]), cnt = 1;
    const thr = (dist << 2) - 2e3, s5 = 3e3;
    while (cnt < P.length) {
      const cur = P[cnt];
      d = [ P[0][0] - cur[0] >> 2, P[0][1] - cur[1] >> 2, P[0][2] - cur[2] >> 2 ];
      dist = isqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      if (dist << 2 >= thr) break;
      if (cur[0] - s5 <= c[0] && c[0] <= cur[0] + s5 && cur[2] - s5 <= c[2] && c[2] <= cur[2] + s5) break;
      cnt++;
    }
    cnt--;
    this.E54 = P[cnt].slice();
    this.log("ruta", {
      nombre: trap.nombre,
      E30: this.E30,
      punto: this.E54
    });
  }
  DA02C() {
    const c = this.c, M = setPos2([ c.mov[0], c.mov[1] + DEF_UY, c.mov[2] ], [ 0, c.turn[1], 0 ]);
    const v = this.verticesOrugas(1).map(p => put(M, p));
    const alto = p => {
      const h = this.piso(p[0], p[2], p[1]);
      return h == null ? 0 : h;
    };
    const par = this.mgr.frame & 1;
    for (let i = 0; i < 5; i++) {
      if (!par) v[i][1] = this.EF0[i][1]; else if (i !== 2) v[i][1] = alto(v[i]);
    }
    if (par) for (let i = 0; i < 5; i++) this.EF0[i][1] = v[i][1];
    for (let i = 5; i < 10; i++) {
      if (par) v[i][1] = this.EF0[i][1]; else if (i !== 7) v[i][1] = alto(v[i]);
    }
    if (!par) for (let i = 5; i < 10; i++) this.EF0[i][1] = v[i][1];
    const mid = (a, b) => [ v[a][0] + v[b][0] >> 1, v[a][1] + v[b][1] >> 1, v[a][2] + v[b][2] >> 1 ];
    const m = [ mid(0, 1), mid(3, 4), mid(5, 6), mid(8, 9) ];
    c.mov[1] = s16(m[0][1] + m[1][1] + m[2][1] + m[3][1]) >> 2;
    let d = [ m[1][0] + m[3][0] - m[0][0] - m[2][0], m[1][1] + m[3][1] - m[0][1] - m[2][1], m[1][2] + m[3][2] - m[0][2] - m[2][2] ];
    c.turn[0] = ratan2(d[1], isqrt(d[0] * d[0] + d[2] * d[2]));
    d = [ m[0][0] + m[1][0] - m[2][0] - m[3][0], m[0][1] + m[1][1] - m[2][1] - m[3][1], m[0][2] + m[1][2] - m[2][2] - m[3][2] ];
    c.turn[2] = ratan2(d[1], isqrt(d[0] * d[0] + d[2] * d[2]));
  }
  DA62C() {
    let s0, d, v;
    if (this.E30 === 0) {
      if (this.E68 > 0) {
        s0 = this.F54 - 10;
        d = 5;
        if (s0 < 0) {
          if (s0 >= -5) this.E70 = idiv(s0 * 17, d);
        } else {
          v = this.E70 * s0;
          this.E70 = idiv(v, d);
        }
      } else {
        s0 = this.F54 - 5;
        d = 10;
        if (s0 >= 0) this.E70 = idiv(this.E70 * s0, d);
      }
    } else if (this.E68 > 0) {
      s0 = this.F54 - 10;
      d = 5;
      if (s0 >= 0) this.E70 = idiv((d - s0) * 17, d);
    } else {
      s0 = this.F54 - 5;
      d = 10;
      if (s0 >= 0) this.E70 = idiv(this.E70 * s0, d);
    }
    const rot = [ 0, s16(ratan2(this.E34[0], this.E34[2]) - this.c.turn[1]), 0 ];
    const m = rotYXZ([ this.E70, 0, 0 ]).multiply(rotYXZ(rot));
    const vec = put(m, [ 0, 0, 100 ]);
    const r = ratan2(vec[1], isqrt(vec[0] * vec[0] + vec[2] * vec[2]));
    rot[0] = r;
    let rz = Math.abs(this.E70) - Math.abs(s16(r));
    let t = rot[1];
    while (t < 0) t += 4096;
    while (t >= 4097) t -= 4096;
    if (t >= 2049) rz = -rz;
    this.E9C += rot[0];
    this.EA0 += rz;
    const v2 = put(rotYXZ([ rot[0], rot[1], rz ]), [ 0, 0, this.cajas[0].u[2] ]);
    this.EA4 -= Math.abs(v2[1]) >> 1;
  }
  DA940() {
    if (this.D54 === 6) return;
    this.blancosOrugas = this.puntosOrugas(1, 600);
    this.blancosAplasta = this.puntosOrugas(0, 300);
    this.pisarMinas();
  }
  caterpiller() {
    const diff = this.D60 - this.D8C;
    let nSound = 2;
    if (diff > 0) nSound += idiv((diff - (this.D68 - this.D8C)) * 5, diff);
    const M = setPos2(this.c.mov, this.c.turn), cx = z => z.l[0] + idiv(z.u[0] - z.l[0], 2);
    const par = (this.mgr.frame & 1) === 0;
    const lado = par ? {
      z: ORUGA_I,
      prev: "catIprev",
      dir: "dirCatI",
      humo: "F60",
      blancos: [ 4, 0 ],
      lista: this.catI,
      idx: "E74",
      r: [ 0, 5 ]
    } : {
      z: ORUGA_D,
      prev: "catDprev",
      dir: "dirCatD",
      humo: "F64",
      blancos: [ 9, 5 ],
      lista: this.catD,
      idx: "E78",
      r: [ 5, 10 ]
    };
    if (par) {
      let y = this.c.turn[1];
      while (y < -2048) y += 4096;
      while (y > 2048) y -= 4096;
      this.catYaw = y;
    }
    const s1 = put(M, [ cx(lado.z), 0, 0 ]);
    if (this.f740 === 1) this[lado.prev] = s1;
    const p = this[lado.prev], s2 = [ s1[0] - p[0], s1[1] - p[1], s1[2] - p[2] ];
    let n = isqrt(s2[0] * s2[0] + s2[1] * s2[1] + s2[2] * s2[2]);
    n = n * (1024 - Math.abs(ratan2(s2[0], s2[2]) - this.catYaw)) >> 10;
    if (Math.abs(n) < this.E84) return;
    if (n > 0) {
      if (this[lado.dir] !== 1 && this[lado.humo] === 0) {
        this[lado.humo] = 6;
        this.humo(this.blancosOrugas[lado.blancos[0]], 300);
      }
      this[lado.dir] = 1;
    } else {
      if (this[lado.dir] !== -1 && this[lado.humo] === 0) {
        this[lado.humo] = 6;
        this.humo(this.blancosOrugas[lado.blancos[1]], 300);
      }
      this[lado.dir] = -1;
    }
    this.humo(this.blancosOrugas[lado.r[0] + rnd() % 5], 200, 10132122);
    lado.lista[this[lado.idx]].visible = false;
    this[lado.idx] += this.dirCatI;
    if (this[lado.idx] < 0) this[lado.idx] = 2;
    if (this[lado.idx] > 2) this[lado.idx] = 0;
    lado.lista[this[lado.idx]].visible = true;
    this[lado.prev] = s1;
    if (nSound >= 3 && this.F70 <= 0) {
      this.se(this.F74 === 0 ? 182 : 190, this.c.mov);
      this.F70 = nSound;
      this.F74 = 30;
    }
  }
  crearParedes() {
    this.paredes = [];
    const lista = this.ctx.paredes || this.J.ctx.paredes;
    for (const c of this.cajas) {
      const g = new THREE.BoxGeometry((c.u[0] - c.l[0]) * MM, Math.max(.01, (c.u[1] - c.l[1]) * MM), (c.u[2] - c.l[2]) * MM);
      g.translate((c.l[0] + c.u[0]) / 2 * MM, (c.l[1] + c.u[1]) / 2 * MM, (c.l[2] + c.u[2]) / 2 * MM);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = true;
      m.matrixAutoUpdate = false;
      this.mgr.mundo.add(m);
      lista?.push(m);
      this.paredes.push(m);
    }
    this.listaParedes = lista;
  }
  matrizCaja(c) {
    if (c.m === "catI" || c.m === "catD") return setPos2(this.posOrugas?.mov || this.c.mov, this.posOrugas?.rot || this.c.rot);
    return (this.W || this.mundo())[c.m];
  }
  DACF0() {
    this.cajas.forEach((c, i) => {
      const M = this.matrizCaja(c).clone(), m = this.paredes[i];
      M.elements[12] *= MM;
      M.elements[13] *= MM;
      M.elements[14] *= MM;
      m.matrix.copy(M);
      m.matrixWorldNeedsUpdate = true;
      m.updateMatrixWorld(true);
    });
  }
  controlSnake() {
    const J = this.J, rig = J.ctx.rig.position;
    if (this.tDerribo > 0 && --this.tDerribo === 0) this.mgr.congelar(this.ED0 >= 2);
    if (this.ED0 === 1) {
      this.mgr.congelar(false);
      return;
    }
    if (this.ED0 !== 0) return;
    if (this.D54 === 1 || this.D54 === 6) {
      this.ultimaPosSnake = rig.clone();
      return;
    }
    const c = this.cajas[0], inv = (new THREE.Matrix4).copy(this.matrizCaja(c)).invert();
    const p = new THREE.Vector3(rig.x * 1e3, rig.y * 1e3 + 100, rig.z * 1e3).applyMatrix4(inv);
    const dentro = p.x >= c.l[0] && p.x <= c.u[0] && p.z >= c.l[2] && p.z <= c.u[2] && p.y <= c.u[1];
    if (dentro) {
      if (this.F78 > 0) this.F78 = 90;
      if (this.ultimaPosSnake) {
        rig.x = this.ultimaPosSnake.x;
        rig.z = this.ultimaPosSnake.z;
      }
      if (!J.muerto && this.F78 <= 0 && this.tDerribo <= 0) this.golpearSnake(this.DA0, "atropello");
      return;
    }
    this.ultimaPosSnake = rig.clone();
  }
  alExplotar(p) {
    if (this.D54 === 6 || !this.vivo) return;
    const q = [ p.x * 1e3, p.y * 1e3, p.z * 1e3 ], flags = this.mgr.flagsBomba || 0;
    const G = this.EB0;
    if (this.ED0 !== 0) return;
    if (G && G.target) {
      if (flags & 4) {
        this.orugaDaño.fill(0);
        if (this.F5C > 0) return;
        G.dañoExplosion = this.D74;
        this.log("granada en la escotilla");
        return;
      }
      const c = G.centroBlanco, d = [ c[0] - q[0], c[1] - q[1], c[2] - q[2] ];
      this.log("explosión", {
        en: q.map(Math.round),
        artillero: c,
        dist: isqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]),
        flags: flags
      });
      const toca = Math.abs(d[0]) <= 2300 && Math.abs(d[1]) <= 2300 && Math.abs(d[2]) <= 2300;
      if (toca && isqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) < ATR_ESCOTILLA * this.DFC * 3 && q[1] >= c[1] - 1e3) {
        this.orugaDaño.fill(0);
        if (this.F5C > 0) return;
        G.dañoExplosion = idiv(this.D74, this.DEC);
        this.log("explosión en la escotilla", {
          "daño": G.dañoExplosion
        });
        return;
      }
    }
    if (this.F4C > 0 || this.F50 > 0 || this.sobreTanque(q)) return;
    let n = 0;
    for (let i = 0; i < 10; i++) {
      const c = this.blancosOrugas[i];
      const a = Math.abs(c[0] - q[0]) <= this.A80 + 1e3 && Math.abs(c[1] - q[1]) <= 600 + 1e3 && Math.abs(c[2] - q[2]) <= this.A80 + 1e3;
      const b = Math.abs(c[0] - q[0]) <= this.A80 + 2e3 && Math.abs(c[1] - q[1]) <= 600 + 2e3 && Math.abs(c[2] - q[2]) <= this.A80 + 2e3;
      if (!a && !b) continue;
      const dist = isqrt((c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2);
      if (dist >= 2501) continue;
      this.orugaDaño[i] = 4;
      this.orugaArma[i] = 2;
      n++;
    }
    if (n) this.log("explosión en la oruga", {
      orugas: this.orugaDaño.map((x, i) => x ? i : -1).filter(i => i >= 0)
    });
  }
  sobreTanque(q) {
    for (const i of [ 0, 1, 4 ]) {
      const c = this.cajas[i], P = new THREE.Vector3(q[0], q[1], q[2]).applyMatrix4((new THREE.Matrix4).copy(this.matrizCaja(c)).invert());
      if (P.x >= c.l[0] && P.x <= c.u[0] && P.z >= c.l[2] && P.z <= c.u[2] && P.y >= c.u[1] - 150 && P.y <= c.u[1] + 300) return true;
    }
    return false;
  }
  "dañoOrugas"() {
    if (this.F4C > 0) {
      this.orugaDaño.fill(0);
      return;
    }
    if (this.F50 <= 0 && (this.D64 > this.D88 || this.D68 > this.D8C)) {
      let s0 = 0;
      for (let i = 0; i < 10; i++) if (this.orugaDaño[i] && this.orugaDaño[i] >= s0 && this.orugaArma[i] - 2 >= 0 && this.orugaArma[i] - 2 < 5) {
        s0 = this.orugaDaño[i];
        this.E88 = i;
        this.F50 = this.D78 >> 1;
      }
      if (s0) {
        this.D64 -= idiv(this.D7C * s0, this.D84);
        this.D68 -= idiv(this.D80 * s0, this.D84);
        this.D64 = Math.max(this.D88, this.D64);
        this.D68 = Math.max(this.D8C, this.D68);
        const c = this.blancosOrugas[this.E88];
        this.estallido(c, .8);
        this.se(177, this.c.mov);
        this.log("oruga dañada", {
          oruga: this.E88,
          "daño": s0,
          D64: this.D64,
          D68: this.D68
        });
      }
    }
    this.orugaDaño.fill(0);
    this.orugaArma.fill(-1);
  }
  pisarMinas() {
    const S = this.ctx.sensores || (typeof window !== "undefined" ? window.__mgs?.sensores : null);
    const cajaOruga = (c, h) => this.blancosOrugas.some(b => Math.abs(b[0] - c[0]) <= this.A80 + h[0] && Math.abs(b[1] - c[1]) <= 600 + h[1] && Math.abs(b[2] - c[2]) <= this.A80 + h[2]);
    for (const m of S?.lista || []) {
      if (m.tipo !== "CLAYMORE" || m.explota || m.muerta || m.estado >= 2) continue;
      if (!cajaOruga([ m.centro.x, m.centro.y, m.centro.z ], [ m.tam.x, m.tam.y, m.tam.z ])) continue;
      if (S.claymoreExplotando) continue;
      S.claymoreExplotando = m;
      m.explota = true;
      m.visible = true;
      S.poder?.(m.centro, m.tam, 128, 2);
      this.minaPisada(m.mov.x, m.mov.y, m.mov.z);
    }
    const A = this.ctx.armas;
    for (const m of A?.minas || []) {
      if (m.disparada) continue;
      const c = [ m.pos.x * 1e3, m.pos.y * 1e3, m.pos.z * 1e3 ];
      if (!cajaOruga(c, [ 500, 450, 500 ])) continue;
      A.dispararMina(m);
      this.minaPisada(c[0], c[1], c[2]);
    }
  }
  minaPisada(x, y, z) {
    if (this.F4C > 0 || this.F50 > 0) return;
    let mejor = -1, md = 1e9;
    this.blancosOrugas.forEach((b, i) => {
      const d = Math.hypot(b[0] - x, b[2] - z);
      if (d < md) {
        md = d;
        mejor = i;
      }
    });
    if (mejor >= 0) {
      this.orugaDaño[mejor] = 4;
      this.orugaArma[mejor] = 5;
      this.log("claymore", {
        oruga: mejor
      });
    }
  }
  DD1C8() {
    const pos = this.ED0 === 2 ? null : this.c.mov;
    if (this.r3648 <= 0 && !this.EBC) {
      if (this.EC0 === 1) this.r3644 = this.EC4 < 2 ? 50 : 1;
      if (this.r3644 === 1) {
        if (this.EC4 < 2 || !(rnd() & 1)) {
          this.EBC = this.nuevoActor(RavenTanque, "raven_tanque");
          if (this.EBC) {
            this.EBC.accion(2);
            this.log("Raven", {
              EC4: this.EC4
            });
          }
        } else {
          this.r3648 = idiv(this.DB8 * 2, 3);
          this.se(133, pos);
        }
      }
    }
    if (--this.r3644 < 0) this.r3644 = 0;
    if (--this.r3648 < 0) this.r3648 = 0;
    if (this.r3648 <= 0) {
      const R = this.EBC;
      if (R && R.motor.action !== 5 && R.f214 === 0) {
        this.rots[8][0] = nearSpeed(this.rots[8][0], -1592, 45);
        if (this.rots[8][0] >= -1457 && this.rots[8][0] < -1412) this.se(188, pos);
      }
      if (!R || R.motor.action === 5) {
        this.rots[8][0] = nearSpeed(this.rots[8][0], 0, 45);
        if (this.rots[8][0] >= -180 && this.rots[8][0] < -135) this.se(187, pos);
      }
    }
  }
  sacarModelo(tipo) {
    const l = this.pool?.[tipo];
    if (!l) return null;
    if (l.length) return l.pop();
    cargarModelo(this.ctx, `jefes/${tipo}.glb`).then(m => {
      this.ctx.teñir?.(m);
      l.push(m);
    }).catch(() => {});
    return null;
  }
  devolverModelo(tipo, m) {
    if (m && this.pool?.[tipo] && !this.pool[tipo].includes(m)) {
      m.removeFromParent();
      this.pool[tipo].push(m);
    }
  }
  nuevoActor(Clase, tipo) {
    if (!this.vivo) return null;
    const m = this.sacarModelo(tipo);
    if (!m) return null;
    const a = new Clase(this, m, this.datosTankman);
    this.mgr.agregar(a);
    a.listo = true;
    return a;
  }
  quitarActor(a) {
    const i = this.mgr.lista.indexOf(a);
    if (i >= 0) this.mgr.lista.splice(i, 1);
  }
  dirSnake() {
    const y = this.J.ctx.yawSnake?.() ?? 0;
    return (Math.round((y + Math.PI) / ANG) % 4096 + 4096) % 4096;
  }
  alLanzarGranada(g, A) {
    if (!this.ganchos || this.D54 === 6) return;
    g.m1 = 0;
    if ((A.postura?.() ?? 0) !== 0) return;
    const vs = A.velSnake || new THREE.Vector3, f = new THREE.Vector3(g.paso.x - vs.x, 0, g.paso.z - vs.z);
    if (f.lengthSq() < 1e-12) return;
    f.normalize();
    g.paso.set(f.x * 80 * MM + vs.x, 280 * MM, f.z * 80 * MM + vs.z);
    this.log("granada", {
      de: "pie",
      paso: [ 280, 80 ]
    });
  }
  antesGranadas(lista) {
    if (this.ganchos && this.D54 !== 6) for (const g of lista) this.bombHoming(g);
  }
  matrizCajaEn(c, mov, rot, rots3) {
    if (c.m === 3) {
      const W = this.mundo(this.rots.map((r, i) => i === 3 ? [ r[0], rots3, r[2] ] : r), mov, rot);
      return W[3];
    }
    return this.mundo(this.rots, mov, rot)[c.m];
  }
  sobreTecho(p) {
    const prevMov = this.snapMov || this.c.mov, prevRot = this.snapRot || this.c.rot, prev3 = this.snapRots3 ?? this.rots[3][1];
    for (const i of [ 4, 0, 1 ]) {
      const c = this.cajas[i], Mp = this.matrizCajaEn(c, prevMov, prevRot, prev3);
      const L = new THREE.Vector3(p[0], p[1] + 75, p[2]).applyMatrix4(Mp.clone().invert());
      if (L.x < c.l[0] || L.x > c.u[0] || L.z < c.l[2] || L.z > c.u[2]) continue;
      const techo = new THREE.Vector3(L.x, c.u[1], L.z).applyMatrix4(Mp);
      if (p[1] - techo.y >= 150 || p[1] - techo.y < -300) continue;
      const Mc = this.matrizCajaEn(c, this.c.mov, this.c.rot, this.rots[3][1]);
      const n = new THREE.Vector3(L.x, c.u[1], L.z).applyMatrix4(Mc);
      return {
        caja: i,
        pos: [ n.x, n.y, n.z ]
      };
    }
    return null;
  }
  bombHoming(g) {
    if (g.m1 === undefined) g.m1 = 0;
    const p = [ g.p.x * 1e3, g.p.y * 1e3, g.p.z * 1e3 ], st = [ g.paso.x * 1e3, g.paso.y * 1e3, g.paso.z * 1e3 ];
    const s = this.sobreTecho(p);
    if (s) {
      const nueva = g.marcoTanque !== this.mgr.frame ? s.pos : [ p[0], s.pos[1], p[2] ];
      g.marcoTanque = this.mgr.frame;
      if (!g.sobreTanque) {
        g.sobreTanque = true;
        if (!(g.m1 & 4) && this.EB0) {
          const t = posDe(this.W[12]), d = Math.hypot(t[0] - nueva[0], t[1] - nueva[1], t[2] - nueva[2]);
          if (d < ATR_ESCOTILLA * this.DFC) {
            this.se(178, t);
            g.m1 |= 4;
            this.log("granada adentro", {
              dist: Math.round(d)
            });
          } else this.ctx.armas?.se?.(SE_REBOTE_GRANADA, new THREE.Vector3(nueva[0] * MM, nueva[1] * MM, nueva[2] * MM));
        }
      }
      g.p.set(nueva[0] * MM, nueva[1] * MM + .05, nueva[2] * MM);
      g.paso.set(0, 0, 0);
      g.obj?.position.copy(g.p);
      return;
    }
    g.sobreTanque = false;
    if (g.m1 & 4) return;
    if (this.chocarCostados(g, p, st)) return;
    const tgt = posDe(this.W[12]), S = this.snake();
    const v = [ tgt[0] - S.x >> 2, tgt[1] - S.y >> 2, tgt[2] - S.z >> 2 ];
    const rotY = norm2048(ratan2(v[0], v[2])), hit = isqrt(v[0] * v[0] + v[2] * v[2]) * 4;
    const post = this.J.postura?.() ?? 0, caido = post === 2 || this.tDerribo > 0;
    if (!(g.m1 & 1)) {
      g.m1 |= 1;
      const dy = norm2048(rotY - this.dirSnake());
      if (caido || this.DF8 < hit || dy < -this.DF4 || dy > this.DF4) {
        this.log("granada sin homing", {
          caido: caido,
          dist: hit,
          angulo: dy
        });
        return;
      }
      st[0] = 0;
      st[2] = hit <= idiv(this.DF8 * 2, 3) ? 120 : 170;
      const frames = idiv(idiv(hit, st[2]) * 3, 4);
      const apex = Math.max(p[1], tgt[1]) + 1e3;
      let d1 = apex - p[1];
      const d2 = apex - tgt[1];
      let w = d1 + d2;
      d1 = w === 0 ? 0 : idiv(frames * d1, w);
      w = d1 !== 0 ? idiv(idiv((apex - p[1]) * 2, d1), d1) : 0;
      st[1] = w * d1;
      g.m1 |= (w & 255) << 8 | 2;
      this.log("granada al tanque", {
        dist: hit,
        vel: st[2],
        cuadros: frames,
        gravedad: w,
        vy: st[1]
      });
    } else {
      if (!(g.m1 & 2)) return;
      if (caido) return;
      if (p[1] < tgt[1]) return;
    }
    const spd = isqrt(st[0] * st[0] + st[2] * st[2]), q = idiv(hit, Math.max(1, g.espoleta));
    const r = put(rotYXZ([ 0, rotY, 0 ]), [ 0, 0, Math.max(spd, q) ]);
    st[0] = r[0];
    st[2] = r[2];
    st[1] += 16;
    st[1] -= g.m1 >> 8 & 255;
    g.paso.set(st[0] * MM, st[1] * MM, st[2] * MM);
  }
  chocarCostados(g, p, st) {
    const L = Math.hypot(st[0], st[1], st[2]);
    if (L < 1) return false;
    const ray = this._ray || (this._ray = new THREE.Raycaster);
    ray.set(new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM), new THREE.Vector3(st[0] / L, st[1] / L, st[2] / L));
    ray.far = L * MM + .05;
    const h = ray.intersectObjects(this.paredes || [], false)[0];
    if (!h?.face) return false;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (Math.abs(n.y) > .7) return false;
    n.y = 0;
    n.normalize();
    g.paso.reflect(n);
    g.paso.x /= 4;
    g.paso.z /= 4;
    g.rebotes = (g.rebotes || 0) + 1;
    if (g.rebotes < 3) this.ctx.armas?.se?.(SE_REBOTE_GRANADA, h.point);
    return true;
  }
  sacarArmas(quien) {
    const inv = this.J.ctx.inventario;
    if (!inv) return;
    quien.armaPrevia = inv.arma;
    quien.itemPrevio = inv.item;
    inv.arma = -1;
    if (inv.item !== 5 && inv.item !== 6) inv.item = -1;
    this.mgr.congelar(true);
  }
  devolverArmas(quien) {
    const inv = this.J.ctx.inventario;
    if (inv && quien.armaPrevia !== undefined) {
      inv.arma = quien.armaPrevia;
      inv.item = quien.itemPrevio;
    }
  }
  "disparoCañon"(boca) {
    const o = posDe(boca), d = new THREE.Vector3(0, 0, 100).transformDirection(boca).normalize();
    const mesh = new THREE.Group;
    mesh.name = "proyectil_m1e1";
    cargarModelo(this.ctx, "jefes/m1e1shel.glb").then(m => {
      mesh.add(m);
      this.ctx.teñir?.(m);
    }).catch(() => {});
    this.mgr.mundo.add(mesh);
    const tamaño = Math.trunc(Math.max(this.DC8, 394) * 3 / 5);
    const P = {
      pos: new THREE.Vector3(...o),
      dir: d,
      vel: this.DC8,
      t: 0,
      tmax: idiv(this.DC4 * 2, this.DC8),
      "daño": this.DC0,
      tam: tamaño,
      mesh: mesh
    };
    this.proyectiles.push(P);
    this.humo(o, 600);
    this.mgr.chispa(P.pos.clone().multiplyScalar(MM), 1.2, 4, 16764040);
    this.log("cañonazo", {
      ECC: this.ECC,
      desde: o,
      dir: [ +d.x.toFixed(3), +d.y.toFixed(3), +d.z.toFixed(3) ],
      E5C: this.E5C
    });
  }
  proyectilesCuadro() {
    const J = this.J, rig = J.ctx.rig.position;
    for (const P of this.proyectiles.slice()) {
      const ant = P.pos.clone();
      P.pos.addScaledVector(P.dir, P.vel);
      P.t++;
      P.mesh.position.copy(P.pos).multiplyScalar(MM);
      P.mesh.lookAt(P.mesh.position.clone().add(P.dir));
      let res = 0;
      const h = this.mgr.pared(ant, P.dir, P.vel, this.mgr.grupoHzd ?? -1, 0);
      const post = J.postura?.() ?? 0, sy = rig.y * 1e3 + [ 1100, 496, 136 ][post], hy = [ 700, 500, 500 ][post];
      const golpe = !J.muerto && !J.ctx.vuelo?.() && this.ED0 === 0 && Math.abs(P.pos.x - rig.x * 1e3) <= P.tam + 300 && Math.abs(P.pos.y - sy) <= P.tam + hy && Math.abs(P.pos.z - rig.z * 1e3) <= P.tam + 300;
      if (golpe) {
        res = 1;
        J.vida -= P.daño / (J.ctx.inventario?.vidaMax || 256);
        J.ctx.daño?.();
        this.derribarSnake();
      } else if (h) {
        res = 2;
        P.pos.copy(h.punto);
      } else if (P.t >= P.tmax || Math.abs(P.pos.x) > 27e3 || Math.abs(P.pos.y) > 27e3 || Math.abs(P.pos.z) > 27e3) res = 3;
      if (res) {
        this.EC0 = res;
        this.se(183, P.pos.clone());
        this.estallido(P.pos.toArray(), 1.6);
        const dx = Math.abs(P.pos.x - rig.x * 1e3), dy = Math.abs(P.pos.y - sy), dz = Math.abs(P.pos.z - rig.z * 1e3);
        if (!golpe && !J.muerto && this.ED0 === 0) {
          let n = 0;
          if (dx <= 1300 && dy <= 1e3 + hy && dz <= 1300) n += 5;
          if (dx <= 2300 && dy <= 2e3 + hy && dz <= 2300) n += 1;
          if (n) {
            J.vida -= n / (J.ctx.inventario?.vidaMax || 256);
            J.ctx.daño?.();
          }
        }
        J.ctx.vibrar?.(8);
        P.mesh.removeFromParent();
        this.proyectiles.splice(this.proyectiles.indexOf(P), 1);
        this.log("impacto", {
          res: res,
          pos: P.pos.toArray().map(Math.round),
          tiempo: P.t
        });
      }
    }
  }
  humo(p, tam = 500, color = 7829367) {
    this.mgr.chispa(new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM), tam * MM, 14, color);
  }
  estallido(p, escala = 1) {
    const v = new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);
    if (this.ctx.armas?.visualExplosion) this.ctx.armas.visualExplosion(v, escala); else this.mgr.chispa(v, escala * 2, 16, 16755285);
  }
  se(id, pos) {
    this.mgr.se(id, pos ? pos.isVector3 ? pos.clone().multiplyScalar(MM) : new THREE.Vector3(pos[0] * MM, pos[1] * MM, pos[2] * MM) : null, null);
  }
  dibujar() {
    if (!this.o) return;
    const c = this.c;
    this.o.position.set(c.mov[0] * MM, c.mov[1] * MM, c.mov[2] * MM);
    this.o.rotation.set(c.rot[0] * ANG, c.rot[1] * ANG, c.rot[2] * ANG, "YXZ");
    const po = this.posOrugas || {
      mov: c.mov,
      rot: c.rot
    };
    this.orugas.position.set(po.mov[0] * MM, po.mov[1] * MM, po.mov[2] * MM);
    this.orugas.rotation.set(po.rot[0] * ANG, po.rot[1] * ANG, po.rot[2] * ANG, "YXZ");
    aplicarPose(this.huesos, this.padres, this.rots, null, null);
  }
  morir() {
    if (!this.vivo) return;
    this.log("destruido", {
      D54: this.D54
    });
    const args = [ idiv(idiv(idiv(this.D64, 10) * 30, 100) * 60, 1e3) * 60, this.D68 * 30, this.E08, this.E0C, this.E10 ];
    const gano = this.D54 === 5;
    this.destruir();
    if (this.E1C >= 0) this.mgr.correrProc(this.E1C, args);
    if (gano) this.mgr.victoriaProc(this, {
      jefe: "M1E1",
      proc: this.E20,
      demos: [ 46069 ],
      cadena: [ 46069, 46358 ],
      siguiente: "s06a"
    });
  }
  destruir() {
    super.destruir();
    this.orugas?.removeFromParent();
    for (const m of this.paredes || []) {
      m.removeFromParent();
      const i = this.listaParedes?.indexOf(m) ?? -1;
      if (i >= 0) this.listaParedes.splice(i, 1);
    }
    for (const P of this.proyectiles) P.mesh.removeFromParent();
    this.proyectiles = [];
    this.EB0?.destruir();
    this.EB0 = null;
    this.EBC?.destruir();
    this.EBC = null;
    if (this.tDerribo > 0) {
      this.tDerribo = 0;
      this.mgr.congelar(false);
    }
  }
  estadoPrueba() {
    return {
      D54: this.D54,
      E30: this.E30,
      ED0: this.ED0,
      mov: this.c.mov.slice(),
      rot: this.c.rot.slice(),
      vel: this.E68,
      E5C: this.E5C,
      E08: this.E08,
      E0C: this.E0C,
      torreta: this.rots[3][1],
      "cañon": this.rots[5][0],
      escotilla: this.rots[11][0],
      tapaRaven: this.rots[8][0],
      ametralladora: [ this.rots[12][1], this.rots[13][1], this.rots[13][0] ],
      E64: this.E64,
      F44: this.F44,
      F48: this.F48,
      F84: this.F84,
      F5C: this.F5C,
      F78: this.F78,
      D64: this.D64,
      D68: this.D68,
      ECC: this.ECC,
      EC4: this.EC4,
      artillero: this.EB0 ? {
        accion: this.EB0.motor.action,
        blanco: !!this.EB0.target
      } : null,
      raven: this.EBC ? {
        accion: this.EBC.motor.action,
        f214: this.EBC.f214
      } : null,
      barra: this.barras[0] ? [ this.barras[0].now, this.barras[0].visible ] : null
    };
  }
}

export class Artillero extends Jefe {
  constructor(tanque, modelo, datos) {
    super({
      tipo: "M1E1SOLD",
      opts: {}
    }, tanque.mgr);
    this.T = tanque;
    this.nombre = "GUNNER";
    this.blanco = false;
    this.vivoBlanco = true;
    this.tipoModelo = "artillero";
    this.c = {
      mov: tanque.c.mov.slice(),
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ]
    };
    this.f1E8 = 1;
    this.f1F0 = 0;
    this.f1F4 = 0;
    this.f200 = 0;
    this.f204 = 0;
    this.f208 = 0;
    this.f20C = 0;
    this.f218 = 0;
    this.f21C = 0;
    this.target = true;
    this.centroBlanco = posDe((tanque.W || tanque.mundo())[12]);
    this.dañoExplosion = 0;
    this.blancoObj = new THREE.Object3D;
    this.radio = .33;
    this.montarCuerpo(modelo, datos, false);
    this.o.visible = false;
    this.poseInicial(2);
  }
  async iniciar() {}
  poseInicial(a) {
    const c = this.motor.clip(a);
    if (!c) return;
    for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c.rot.slice(j * 3, j * 3 + 3);
    this.motor.altura = c.altura[0];
  }
  vitalBlanco() {
    return 1;
  }
  get proxy() {
    if (!this._proxy) {
      const j = this;
      this._proxy = {
        __jefe: j,
        think: {
          t1: 1
        },
        combo: 0,
        tCombo: 0,
        faint: 1,
        faintMax: 1,
        get o() {
          return j.blancoObj;
        },
        get accion() {
          return j.blanco ? "jefe" : "muerto";
        },
        get vital() {
          return 1;
        },
        get rot() {
          return j.c.rot[1];
        },
        set vital(v) {}
      };
    }
    return this._proxy;
  }
  recibirGolpe(cuanto, modo, origen) {
    if (this.blanco && this.vivo && !origen.aturdidora && !origen.explosion && modo === 1) this.golpes.push({
      cuanto: cuanto,
      modo: modo,
      frame: this.mgr.frame
    });
  }
  accion(a) {
    if (this.motor) this.motor.accion(a, 5);
  }
  cuadro() {
    const T = this.T, M = this.motor, c = this.c;
    M.tick();
    for (let k = 0; k < 3; k++) c.mov[k] += c.step[k];
    for (let k = 0; k < 3; k++) c.rot[k] = s16(nearExp4P(c.rot[k], c.turn[k]));
    const vstep = [ 0, 0, 0 ];
    if (this.f1E8 === 0) this.o.visible = true;
    if (--this.f20C < 0) this.f20C = 0;
    if (--this.f218 < 0) this.f218 = 0;
    if (--this.f21C < 0) this.f21C = 0;
    if (this.f21C === 0 && T.ED0 === 3) {
      T.D54 = T.D58 ? 7 : 2;
      T.ED0 = 1;
      T.devolverArmas(this);
    }
    this.f1F0 = 0;
    if (M.info1.frame === 1) this.f200 = M.altura;
    c.step[0] = 0;
    c.step[2] = 0;
    vstep[1] = M.altura - this.f200;
    vstep[0] = M.paso[0];
    vstep[2] = M.paso[1];
    const W = T.W || T.mundo();
    switch (M.action) {
     case 0:
     case 1:
     case 2:
     case 5:
     case 6:
      {
        if (M.action === 2 && T.E10 === 1) {
          T.E10 = 0;
          if (!this.J.muerto && this.mgr.gameOverTimer() === 0) {
            this.f218 = 150;
            this.f21C = 60;
            T.se(130, null);
            T.D54 = 3;
            T.ED0 = 3;
            T.sacarArmas(this);
            T.log("escenita artillero");
          }
        } else if (M.action === 1) {
          if (T.E10 === 0 && this.f218 <= 0 && T.ED4 >= 30 && rnd() % 3 !== 0) {
            this.f218 = 150;
            T.se(128, c.mov);
          }
        }
        const m = W[12], o = posDe(m), f = put(m, [ 0, 0, 100 ]);
        const d = [ f[0] - o[0], f[1] - o[1], f[2] - o[2] ];
        c.turn = [ -ratan2(d[1], isqrt(d[0] * d[0] + d[2] * d[2])), ratan2(d[0], d[2]), 0 ];
        c.mov[1] = M.altura + T.c.mov[1] - 200;
        c.step[0] = o[0] - c.mov[0];
        c.step[2] = o[2] - c.mov[2];
        this.centroBlanco = put(m, [ 0, 300, 0 ]);
        this.piso = T.c.mov[1] - 200;
        break;
      }

     case 3:
      {
        const v = put(rotYXZ(c.rot), [ 0, vstep[1], isqrt(vstep[0] * vstep[0] + vstep[2] * vstep[2]) ]);
        c.mov[1] = this.DEC18(c.mov, c.mov[1] + v[1]);
        c.step[0] = v[0];
        c.step[2] = v[2];
        const h = T.piso(c.mov[0], c.mov[2], c.mov[1]) ?? 0;
        if (this.f1F4 === 0 && c.mov[1] - h < 300) {
          this.f1F4 = 1;
          T.se(51, c.mov);
        }
        this.piso = c.mov[1] - M.altura;
        break;
      }

     case 4:
      if (!(this.mgr.frame >> 2 & 1)) this.o.visible = false; else this.o.visible = true;
      if (this.f20C <= 0) {
        this.destruir();
        return;
      }
      break;
    }
    if (M.isEnd) {
      switch (M.action) {
       case 2:
        this.accion(0);
        break;

       case 5:
        this.destruir();
        if (T.EB0 === this) T.EB0 = null;
        return;

       case 3:
        this.f20C = 60;
        this.accion(4);
        if (this.f1F4 === 0) {
          this.f1F4 = 1;
          T.se(51, c.mov);
        }
        break;
      }
    }
    if (this.target) {
      const g = this.tomarDaño();
      let dam = this.dañoExplosion || (g && g.a_mode === 1 ? 4 : 0);
      this.dañoExplosion = 0;
      if (T.F5C > 0) {
        if (T.ED0 === 0 && !(this.mgr.frame >> 2 & 1)) this.o.visible = false;
        dam = 0;
      }
      if (dam && dam < idiv(T.D74, T.DEC) && idiv(T.D74, T.DF0) >= T.E0C) dam = 0;
      if (dam) {
        if (dam >= idiv(T.D74, T.DEC)) T.F5C = T.E14; else {
          dam = idiv(T.D74, T.DF0);
          T.F5C = T.E18;
        }
        T.E0C -= dam;
        if (T.E0C < 0) T.E0C = 0;
        if (T.E0C > 0) T.se(136, c.mov);
        T.log("artillero herido", {
          "daño": dam,
          E0C: T.E0C,
          F5C: T.F5C
        });
      }
    }
    if (!this.J.muerto && this.mgr.gameOverTimer() === 0 && this.target && T.E0C <= 0) this.morir();
    this.f200 = M.altura;
    T.EB4 = c.mov.slice();
    this.f1E8 = 0;
    this.blanco = !!this.target && T.F5C <= 0 && T.ED0 === 0;
    this.blancoObj.position.set(this.centroBlanco[0] * MM, this.centroBlanco[1] * MM - .9, this.centroBlanco[2] * MM);
  }
  morir() {
    const T = this.T, c = this.c;
    T.E0C = T.D74;
    this.f1F0 = 1;
    this.target = false;
    this.blanco = false;
    this.vivoBlanco = false;
    T.estallido(c.mov, 1.2);
    T.se(177, c.mov);
    const o = T.sacarModelo("artillero_muerto");
    if (o) {
      T.devolverModelo(this.tipoModelo, this.modelo);
      this.modelo = o;
      this.tipoModelo = "artillero_muerto";
      this.o.add(o);
      this.huesos = [];
      for (let i = 0; i < this.datos.huesos; i++) this.huesos.push(o.getObjectByName("hueso_" + i));
      o.traverse(m => {
        if (m.isMesh) m.castShadow = true;
      });
    }
    T.se(T.E08 >= 2 ? 129 : 132, c.mov);
    this.accion(3);
    c.turn = [ 0, ratan2(-c.mov[0], -c.mov[2]), 0 ];
    this.f204 = 0;
    T.log("muere el artillero", {
      E08: T.E08
    });
  }
  DEC18(s2, a2) {
    let v = 1;
    if (this.f204 === 0) this.f208 = 0;
    if (a2 - s2[1] <= 0) this.f204 += s2[1] - a2;
    if (this.f204 < 400) return a2;
    if (this.f208 === 0) {
      v = this.motor.info1.quedan;
      if (v <= 0) v = 1;
    }
    const h = (this.T.piso(s2[0], s2[2], s2[1] + 1e4) ?? 0) + 100;
    if (this.f208 === 0) this.f208 = idiv(s2[1] - h, v);
    let r = s2[1] - this.f208;
    if (r < h) r = h;
    this.f208 = idiv(this.f208 * 15, 14);
    if (this.f208 >= 1001) this.f208 = 1e3;
    return r;
  }
  dibujar() {
    if (!this.o) return;
    const c = this.c;
    this.o.position.set(c.mov[0] * MM, (this.piso ?? 0) * MM, c.mov[2] * MM);
    this.o.rotation.set(c.rot[0] * ANG, c.rot[1] * ANG, c.rot[2] * ANG, "YXZ");
    if (this.motor) aplicarPose(this.huesos, this.padres, this.motor.rots, null, this.motor.altura * MM);
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    this.blanco = false;
    this.target = false;
    if (this.T.EB0 === this) this.T.EB0 = null;
    this.T.devolverModelo(this.tipoModelo, this.modelo);
    this.T.quitarActor(this);
  }
}

export class RavenTanque extends Jefe {
  constructor(tanque, modelo, datos) {
    super({
      tipo: "M1E1VALC",
      opts: {}
    }, tanque.mgr);
    this.T = tanque;
    this.nombre = "RAVEN";
    this.blanco = false;
    this.c = {
      mov: tanque.c.mov.slice(),
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ]
    };
    this.f1E8 = 1;
    this.f214 = 30;
    this.f220 = 0;
    this.f224 = 0;
    this.montarCuerpo(modelo, datos, false);
    this.o.visible = false;
    const c = this.motor.clip(2);
    if (c) {
      for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c.rot.slice(j * 3, j * 3 + 3);
      this.motor.altura = c.altura[0];
    }
    const T = this.T;
    if (!this.J.muerto && this.mgr.gameOverTimer() === 0 && T.EC4 < 2) {
      T.D54 = 3;
      T.ED0 = 2;
      T.sacarArmas(this);
      T.log("escenita Raven");
    }
  }
  async iniciar() {}
  accion(a) {
    if (this.motor) this.motor.accion(a, 5);
  }
  cuadro() {
    const T = this.T, M = this.motor, c = this.c;
    if (M.action === 5 && this.f214 === 1) {
      this.destruir();
      return;
    }
    if (--this.f214 < 0) this.f214 = 0;
    if (this.f214 > 0) return;
    M.tick();
    for (let k = 0; k < 3; k++) c.mov[k] += c.step[k];
    for (let k = 0; k < 3; k++) c.rot[k] = s16(nearExp4P(c.rot[k], c.turn[k]));
    if (this.f1E8 === 0) this.o.visible = true;
    c.step[0] = 0;
    c.step[2] = 0;
    const pos = T.ED0 === 2 ? null : c.mov;
    switch (M.action) {
     case 11:
     case 12:
      if (this.f224 === 0) T.se(131, pos);
      if (M.action === 12 && [ 17, 24, 31, 38, 45, 52, 59, 66 ].includes(this.f224)) T.se(52, pos);
      if (M.action === 12 && [ 78, 85, 92, 99, 105, 112 ].includes(this.f224)) T.se(186, pos);
      this.f224++;
      break;

     case 13:
      if (this.f224 === 23 || this.f224 === 80) T.se(135, pos);
      this.f224++;
      break;
    }
    const W = T.W || T.mundo(), m = W[6], o = posDe(m), f = put(m, [ 0, 0, 100 ]), d = [ f[0] - o[0], f[1] - o[1], f[2] - o[2] ];
    c.turn = [ -ratan2(d[1], isqrt(d[0] * d[0] + d[2] * d[2])), ratan2(d[0], d[2]), 0 ];
    c.mov[1] = M.altura + T.c.mov[1];
    this.piso = T.c.mov[1];
    c.step[0] = o[0] - c.mov[0];
    c.step[2] = o[2] - c.mov[2];
    if (!M.isEnd) this.f1E8 = 0; else {
      switch (M.action) {
       case 2:
        this.f220 = 0;
        this.f224 = 0;
        if (T.ED0 === 2) this.accion(T.ECC === 7 ? 13 : T.ECC < 4 ? 11 : 12); else this.accion((rnd() & 1) === 0 ? 11 : 12);
        this.f1E8 = 0;
        T.log("Raven se burla", {
          accion: this.motor.action
        });
        break;

       case 11:
       case 12:
       case 13:
        this.accion(5);
        this.f1E8 = 0;
        break;

       case 5:
        this.f214 = 30;
        this.o.visible = false;
        break;

       default:
        this.f1E8 = 0;
      }
    }
  }
  dibujar() {
    if (!this.o) return;
    const c = this.c;
    this.o.position.set(c.mov[0] * MM, (this.piso ?? 0) * MM, c.mov[2] * MM);
    this.o.rotation.set(c.rot[0] * ANG, c.rot[1] * ANG, c.rot[2] * ANG, "YXZ");
    if (this.motor) aplicarPose(this.huesos, this.padres, this.motor.rots, null, this.motor.altura * MM);
  }
  destruir() {
    if (!this.vivo) return;
    const T = this.T;
    if (T.ED0 === 2) {
      T.D54 = T.D58 ? 7 : T.ED0;
      T.ED0 = 1;
      T.F48 = T.DB8;
      T.devolverArmas(this);
    }
    if (T.EBC === this) T.EBC = null;
    super.destruir();
    T.devolverModelo("raven_tanque", this.modelo);
    T.quitarActor(this);
  }
}

export class CamaraTanque extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "M1E1CAME";
    this.blanco = false;
  }
  async iniciar() {}
  cuadro() {
    const T = this.mgr.lista.find(j => j instanceof Tanque && j.vivo);
    if (!T || T.D54 === 6) {
      this.mgr.hud.cine = 0;
      this.destruir();
      return;
    }
    const objetivo = T.ED0 === 2 || T.ED0 === 3 ? 1 : 0;
    this.mgr.hud.cine = nearSpeed(this.mgr.hud.cine || 0, objetivo, 1 / 8);
  }
  dibujar() {}
}
