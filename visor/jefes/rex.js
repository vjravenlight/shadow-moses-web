// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, ratan2, randU, randS, cargarModelo, cargarAnim, Motor, aplicarPose, nearSpeed, nearExp8 } from "./base.js";

import { apoyo, isqrt, rsin, rcos, HASH } from "./apoyo3.js";

import { ArmasRex } from "./rex_armas.js";

import * as ctl from "../controles.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const ALT_SNAKE = [ 1100, 496, 136 ];

const wrap = a => {
  a = (a % 4096 + 4096) % 4096;
  return a >= 2048 ? a - 4096 : a;
};

const s16 = a => (a & 65535 ^ 32768) - 32768;

const trunc = Math.trunc;

const PIES_HANGAR = [ [ 6e3, 0, 6e3 ], [ -6e3, 0, 6e3 ], [ -5e3, 0, 0 ], [ 0, 0, -5e3 ], [ -2e3, 0, -5e3 ], [ 2e3, 0, -5e3 ] ];

const RADOMO = {
  tam: [ 1500, 1500, 1500 ],
  off: [ 750, 70, 2932 ],
  humo: [ 750, 70, 3432 ]
};

const LIQUID = {
  tam: [ 400, 600, 400 ],
  humo: [ 0, -500, 1e3 ]
};

const POLVO_PIE = {
  a: [ 0, -2990, 500 ],
  b: [ 0, -600, 300 ]
};

const PUNTA_PIE = [ 0, -2459, 907 ];

const GIROS = {
  20: [ -320, -780, 113 ],
  21: [ -780, -1490, 227 ],
  22: [ -1360, -1970, 341 ],
  23: [ -2040, -1960, 455 ],
  24: [ -2100, -1550, 568 ],
  25: [ -1910, -1200, 682 ],
  26: [ 320, -860, -113 ],
  27: [ 790, -1530, -227 ],
  28: [ 1380, -1970, -341 ],
  29: [ 2050, -1960, -455 ],
  30: [ 1620, -1610, -568 ],
  31: [ 2430, -1460, -682 ]
};

const ADELANTE = [ 0, 0, 5e3, 0 ], ATRAS = [ 0, 0, -5e3, 0 ];

const PUNTOS_GIRO = [ [ 0, 0, 8e3 ], [ 5e3, 0, 0 ], [ -5e3, 0, 0 ], [ 2e3, 0, -5e3 ], [ -2e3, 0, -5e3 ] ];

const PIES_PISOTON = [ [ 4e3, 0, 6500 ], [ -4e3, 0, 6500 ] ];

const ONDA_TAM = [ 4e3, 1e3, 4e3 ];

const TAPA_ANG = {
  L: [ -512, 200, 0 ],
  R: [ -512, -200, 0 ]
};

const TUBOS = {
  L: [ [ 400, -434, 5098 ], [ -400, -878, 5450 ], [ 400, -1322, 5802 ] ],
  R: [ [ -400, -434, 5098 ], [ 400, -878, 5450 ], [ -400, -1322, 5802 ] ]
};

const RAYOS = [ [ 0, 0, 2e4 ], [ 2e4, 0, 0 ], [ -2e4, 0, 0 ] ];

const CAJAS_NIKITA = [ [ "L", [ 0, -550, 1900 ], [ 1e3, 1e3, 3500 ], 135, 1 ], [ "L", [ -63, -1700, 1900 ], [ 1e3, 1e3, 3500 ], 210, 4 ], [ "R", [ 0, -550, 1900 ], [ 1e3, 1e3, 3500 ], 135, 1 ], [ "R", [ 63, -1700, 1900 ], [ 1e3, 1e3, 3500 ], 210, 4 ], [ "C", [ 0, 6700, -700 ], [ 1e3, 1e3, 3100 ], 230, 0 ], [ "C", [ 0, 750, -2300 ], [ 3200, 1350, 2e3 ], 125, 2 ], [ "C", [ 0, 1200, 1e3 ], [ 700, 500, 2e3 ], 125, 2 ], [ "C", [ 0, -425, 1900 ], [ 650, 550, 2400 ], 150, 3 ], [ "C", [ 0, 800, -1e3 ], [ 2500, 1e3, 2500 ], 0, 4 ], [ "C", [ 640, 0, 900 ], [ 1e3, 1e3, 2200 ], 0, 6 ], [ "C", [ 0, 0, 5400 ], [ 1e3, 1e3, 7750 ], 0, 8 ] ];

const SEGS = [ [ "C", 2, [ [ -3500, 0, -3600, 3e3 ], [ -3500, 0, -600, 3e3 ], [ -1e3, 0, 400, 3e3 ], [ -500, 0, 3900, 3e3 ], [ 500, 0, 3900, 3e3 ], [ 1e3, 0, 400, 3e3 ], [ 3500, 0, -600, 3e3 ], [ 3200, 0, -3600, 3e3 ] ] ], [ "C", 4, [ [ -2e3, 0, -3700, 3e3 ], [ -2e3, 0, 2300, 3e3 ], [ 2e3, 0, 2300, 3e3 ], [ 2e3, 0, -3700, 3e3 ] ] ], [ "C", 6, [ [ -500, 0, -1e3, 3e3 ], [ -500, 0, 3500, 3e3 ], [ 2e3, 0, 3500, 3e3 ], [ 2500, 0, 2500, 3e3 ], [ 1e3, 0, -1e3, 3e3 ] ] ], [ "C", 8, [ [ -850, 0, -3e3, 3e3 ], [ -350, 0, 14e3, 3e3 ], [ 150, 0, 14e3, 3e3 ], [ 650, 0, -3e3, 3e3 ] ] ], [ "L", 1, [ [ -1050, 0, -1500, 3e3 ], [ -1050, -2e3, 6e3, 3e3 ], [ 950, -2e3, 6e3, 3e3 ], [ 950, 0, -1500, 3e3 ] ] ], [ "L", 7, [ [ -1050, -2e3, -3500, 1e3 ], [ -1050, -3e3, 4e3, 1e3 ], [ 950, -3e3, 4e3, 1e3 ], [ 950, -2e3, -3500, 1e3 ] ] ], [ "R", 1, [ [ 1050, 1e3, -1500, 3e3 ], [ 1050, -2e3, 6e3, 3e3 ], [ -950, -2e3, 6e3, 3e3 ], [ -950, 1e3, -1500, 3e3 ] ] ], [ "R", 7, [ [ 1050, -2e3, -3500, 1e3 ], [ 1050, -3e3, 4e3, 1e3 ], [ -950, -3e3, 4e3, 1e3 ], [ -950, -2e3, -3500, 1e3 ] ] ] ];

const SEGS_PIES = [ [ "L", 8, [ [ 500, -200, 500 ], [ -500, -200, 500 ], [ -500, -200, -1500 ], [ 500, -200, -1500 ] ] ], [ "R", 8, [ [ 500, -200, 500 ], [ -500, -200, 500 ], [ -500, -200, -1500 ], [ 500, -200, -1500 ] ] ] ];

const RONDA = [ [ 16500, 27e3 ], [ 16500, 18e3 ], [ 16500, 7500 ], [ 16500, -1500 ], [ 16500, -12e3 ], [ 16500, -21e3 ], [ 9e3, -27e3 ], [ -9e3, -27e3 ], [ -16500, -21e3 ], [ -16500, -12e3 ], [ -16500, -1500 ], [ -16500, 7500 ], [ -16500, 18e3 ], [ -16500, 27e3 ] ];

const HANGAR = {
  x: 13e3,
  z: 25e3
};

const SEMI_PIE = 899, BOCA_L = [ 2227, 691, 0 ], BOCA_R = [ -2227, 691, 0 ];

const POR_DIF = {
  G042e: [ 1500, 1800, 1950, 2100 ],
  G0430: [ 64, 64, 80, 100 ],
  G0432: [ 160, 160, 180, 200 ]
};

const SE = {
  RADOMO: 176,
  ENTRADA2: 177,
  ENTRADA1: 179,
  POSE_B4: 180,
  PASO: 184,
  PASO_FUERTE: 192,
  GIRO: 188,
  MISIL_POSE: 189,
  FIN_POSE: 191,
  AMETRALLADORA: 196,
  PISA: 198,
  SERVO: 199,
  LIQUID_GOLPE: 190,
  LIQUID_AY: 130,
  LIQUID_VE1: 128,
  LIQUID_VE2: 129
};

const CLASE = {
  AVAIL: 1,
  POWER: 4,
  PUSH: 8,
  SEEK: 16
};

export const PASO_GIRADO = false;

let guardado = null;

export function buferRex() {
  return guardado;
}

export function borrarBuferRex() {
  guardado = null;
}

let actualR = null;

function engancharGuion(g) {
  if (!g?.op || g.op.__rex) return;
  g.op.__rex = true;
  const reinicio = g.op.reinicio, destruir = g.op.destruirActor;
  g.op.reinicio = function(...x) {
    destruirRex(actualR, "restart");
    return reinicio ? reinicio.apply(this, x) : undefined;
  };
  g.op.destruirActor = function(a) {
    try {
      for (const j of actualR?.lista || []) if (j.vivo && j.actor === a && typeof j.morir === "function") j.morir("script");
    } catch (e) {
      console.warn("[rex] destruir", e);
    }
    return destruir ? destruir.call(this, a) : undefined;
  };
}

function destruirRex(mgr, motivo) {
  try {
    for (const j of mgr?.lista || []) if (j.vivo && (j instanceof MetalGearRex || j instanceof MgDemo1)) j.morir(motivo);
  } catch (e) {
    console.warn("[rex]", motivo, e);
  }
}

const _m = new THREE.Matrix4, _q = new THREE.Quaternion, _v = new THREE.Vector3, _e = new THREE.Euler;

function aMundo(h, p) {
  return h.localToWorld(V(p[0] * MM, p[1] * MM, p[2] * MM)).multiplyScalar(1e3);
}

function aLocal(h, pmm) {
  return h.worldToLocal(pmm.clone().multiplyScalar(MM)).multiplyScalar(1e3);
}

function ejeZ(h) {
  h.updateWorldMatrix(true, false);
  const e = h.matrixWorld.elements;
  return {
    x: e[8],
    y: e[9],
    z: e[10]
  };
}

function rotDe(ang) {
  _e.set(ang[0] * ANG, ang[1] * ANG, ang[2] * ANG, "XYZ");
  return (new THREE.Matrix4).makeRotationFromEuler(_e);
}

function rotZYX(ang) {
  _e.set(ang[0] * ANG, ang[1] * ANG, ang[2] * ANG, "ZYX");
  return (new THREE.Matrix4).makeRotationFromEuler(_e);
}

function matrizHueso(h, off = [ 0, 0, 0 ]) {
  h.updateWorldMatrix(true, false);
  const m = h.matrixWorld.clone();
  const p = aMundo(h, off);
  m.elements[12] = p.x;
  m.elements[13] = p.y;
  m.elements[14] = p.z;
  return m;
}

export class MetalGearRex extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "MGREX";
    this.registro = [];
    this.A = apoyo(mgr);
    actualR = mgr;
    engancharGuion(this.A.guion);
    this.alto = 12;
    this.radio = 6;
    this.tiros = 0;
    this.misilesTirados = 0;
    this.laseres = 0;
    this.pisotones = 0;
    this.impactos = 0;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 1200) this.registro.shift();
  }
  get st() {
    return this.ctx.nivel?.id || this.A.guion?.st || new URLSearchParams(globalThis.location?.search || "").get("esc") || "";
  }
  nivel() {
    const d = this.dificultad();
    return d < 0 ? 0 : Math.min(3, d);
  }
  num(v, d = 0) {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && v.var) {
      const x = this.A.guion?.vars?.get?.(v.var);
      if (typeof x === "number" && x !== 0) return x;
      for (const [k, t] of Object.entries(POR_DIF)) if (v.var.toUpperCase().includes(k.toUpperCase())) return t[this.nivel()];
    }
    return d;
  }
  vals(k) {
    const o = this.opts[k];
    return Array.isArray(o) ? o.map(x => x && typeof x === "object" && "proc" in x ? x.proc : this.num(x, 0)) : null;
  }
  leerOpciones() {
    const G = guardado && guardado.st === this.st ? guardado.w : null;
    const d = (k, x) => G && G[k] !== undefined ? Array.isArray(G[k]) ? G[k].slice() : G[k] : x;
    const w = this.w = {};
    const o = k => this.vals(k);
    const g10 = v => v * 4096 / 360 | 0, x1000 = v => v * 1e3, vel = v => v * 1e6 / 108e3 | 0;
    let a;
    w.color = d("color", [ 0, 0, 0 ]);
    if (a = o("a")) {
      w.color = [ 16, 16, 16 ];
      a.slice(0, 3).forEach((v, i) => {
        w.color[i] = v;
      });
    }
    w.e = d("e", [ 0, 0, 0, 0 ]);
    if (a = o("e")) [ x1000, g10, g10, v => v ].forEach((f, i) => {
      if (a[i] !== undefined) w.e[i] = f(a[i]);
    });
    w.c = d("c", [ 0, 0, 0, 0 ]);
    if (a = o("c")) a.slice(0, 4).forEach((v, i) => {
      w.c[i] = x1000(v);
    });
    w.d = d("d", [ 0, 0, 0, 0, 0, 0 ]);
    if (a = o("d")) a.slice(0, 6).forEach((v, i) => {
      w.d[i] = v;
    });
    w.s = d("s", [ 0, 0, 0 ]);
    if (a = o("s")) [ v => v, g10, g10 ].forEach((f, i) => {
      if (a[i] !== undefined) w.s[i] = f(a[i]);
    });
    w.g = d("g", new Array(13).fill(0));
    if (a = o("g")) [ v => v, v => v, v => v + 1, g10, g10, g10, g10, g10, g10, v => v, v => v, x1000, vel ].forEach((f, i) => {
      if (a[i] !== undefined) w.g[i] = f(a[i]);
    });
    w.l = d("l", new Array(15).fill(0));
    if (a = o("l")) [ v => v, v => v, g10, g10, g10, g10, g10, v => v, v => v, x1000, vel, g10, v => Math.max(0, Math.min(255, v)), v => Math.max(0, Math.min(255, v)), v => Math.max(0, Math.min(255, v)) ].forEach((f, i) => {
      if (a[i] !== undefined) w.l[i] = f(a[i]);
    });
    w.m = d("m", new Array(10).fill(0));
    if (a = o("m")) {
      w.m[9] = 0;
      [ v => v, v => v, v => v + 1, g10, g10, v => v, v => v, x1000, vel, v => v === 1 ? 1 : 0 ].forEach((f, i) => {
        if (a[i] !== undefined) w.m[i] = f(a[i]);
      });
    }
    w.mov = d("mov", [ 0, 0, 0 ]);
    w.turn = d("turn", [ 0, 0, 0 ]);
    w.puntos = d("puntos", [ 0, 1, 2, 3 ].map(() => ({
      hayP: 0,
      p: [ 0, 0, 0 ],
      hayR: 0,
      r: [ 0, 0, 0 ]
    })));
    if (a = o("p")) {
      if (a[0] !== undefined) w.mov[0] = x1000(a[0]);
      if (a[1] !== undefined) w.mov[1] = x1000(a[1]);
      if (a[2] !== undefined) w.mov[2] = x1000(a[2]);
      for (let i = 3; i < 6; i++) if (a[i] !== undefined) w.turn[i - 3] = g10(a[i]);
      for (let k = 0; k < 4; k++) {
        const b = 6 + k * 8, P = w.puntos[k];
        if (a[b] !== undefined) P.hayP = a[b];
        for (let i = 0; i < 3; i++) if (a[b + 1 + i] !== undefined) P.p[i] = x1000(a[b + 1 + i]);
        if (a[b + 4] !== undefined) P.hayR = a[b + 4];
        for (let i = 0; i < 3; i++) if (a[b + 5 + i] !== undefined) P.r[i] = g10(a[b + 5 + i]);
      }
    } else {
      if (w.puntos[1].hayP) w.mov = w.puntos[1].p.slice();
      if (w.puntos[1].hayR) w.turn = w.puntos[1].r.slice();
    }
    w.procZ1 = d("procZ1", -1);
    w.procZ2 = d("procZ2", -1);
    if (a = this.opts.z) {
      w.procZ1 = w.procZ2 = -1;
      const z = this.vals("z");
      if (z[0] !== undefined) w.procZ1 = z[0];
      if (z[1] !== undefined) w.procZ2 = z[1];
    }
    this.estado = w.d[0] > 0 ? 0 : 3;
    if (a = o("b")) {
      const b = a[0];
      if (b === 0) this.estado = 0; else if (b === 1) this.estado = 3; else if (b === 2) this.estado = 5;
    }
    if (this.estado === 0) {
      this.tapasL = this.tapasR = this.tuboL = this.tuboR = 0;
    } else {
      this.tapasL = d("tapasL", 0);
      this.tapasR = d("tapasR", 0);
      this.tuboL = d("tuboL", 0);
      this.tuboR = d("tuboR", 0);
    }
  }
  guardar() {
    const w = this.w;
    if (!w) return;
    guardado = {
      st: this.st,
      w: {
        ...w,
        mov: [ this.mov.x, this.mov.y, this.mov.z ],
        turn: [ 0, this.turn & 4095, 0 ],
        d: [ this.vidaRadomo, w.d[1], this.vidaLiquid, w.d[3], w.d[4], w.d[5] ],
        tapasL: this.tapasL,
        tapasR: this.tapasR,
        tuboL: this.tuboL,
        tuboR: this.tuboR
      }
    };
  }
  async iniciar() {
    this.leerOpciones();
    const w = this.w;
    this.mov.set(w.mov[0], w.mov[1], w.mov[2]);
    this.rot = this.turn = w.turn[1] & 4095;
    this.vidaRadomo = w.d[0];
    this.vidaLiquid = w.d[2];
    const R = "jefes/rex/";
    const [cuerpo, pL, pR, aC, aL, aR, pitT, pitU, pitLiq, r1, r2, r3, tapas, misil, tapaV] = await Promise.all([ cargarModelo(this.ctx, R + "mgrexw.glb"), cargarModelo(this.ctx, R + "mgrexll.glb"), cargarModelo(this.ctx, R + "mgrexrl.glb"), cargarAnim("mgrexw"), cargarAnim("mgrexll"), cargarAnim("mgrexrl"), cargarModelo(this.ctx, R + "pit_t.glb"), cargarModelo(this.ctx, R + "pit_u.glb"), cargarModelo(this.ctx, R + "pit_liq.glb"), cargarModelo(this.ctx, R + "radar_f1.glb"), cargarModelo(this.ctx, R + "radar_f2.glb"), cargarModelo(this.ctx, R + "radar_f3.glb"), Promise.all([ "l_hatch1", "l_hatch2", "l_hatch3", "l_hatch4", "r_hatch1" ].map(n => cargarModelo(this.ctx, R + n + ".glb"))), cargarModelo(this.ctx, R + "rex_mis.glb"), cargarModelo(this.ctx, R + "rex_mhat.glb") ]);
    if (!this.vivo) return;
    this.montarCuerpo(cuerpo, aC);
    const pierna = (o, datos) => {
      const huesos = [];
      for (let i = 0; i < datos.huesos; i++) huesos.push(o.getObjectByName("hueso_" + i));
      const padres = huesos.map(h => {
        const m = /^hueso_(\d+)$/.exec(h?.parent?.name || "");
        return m ? +m[1] : -1;
      });
      this.huesos[0].add(o);
      this.ctx.teñir?.(o);
      o.traverse(m => {
        if (m.isMesh) m.castShadow = true;
      });
      return {
        o: o,
        huesos: huesos,
        padres: padres,
        motor: new Motor(datos, datos.huesos),
        adjust: Array.from({
          length: datos.huesos
        }, () => [ 0, 0, 0 ])
      };
    };
    this.L = pierna(pL, aL);
    this.R = pierna(pR, aR);
    const pieza = (o, hueso) => {
      hueso.add(o);
      this.ctx.teñir?.(o);
      o.traverse(m => {
        if (m.isMesh) m.castShadow = true;
      });
      return o;
    };
    this.pitT = pieza(pitT, this.huesos[2]);
    this.pitU = pieza(pitU, this.huesos[3]);
    this.pitLiq = pieza(pitLiq, this.huesos[3]);
    this.pitLiqH = [ 0, 1 ].map(i => pitLiq.getObjectByName("hueso_" + i));
    this.pitLiqRots = [ [ 0, 0, 0 ], [ 0, 0, 0 ] ];
    this.radomos = [ r1, r2, r3 ].map(o => {
      pieza(o, this.huesos[6]);
      o.visible = false;
      return o;
    });
    this.tapaModelos = tapas;
    this.tapaL = null;
    this.tapaR = null;
    this.modeloMisil = misil;
    this.modeloTapa = tapaV;
    this.ponerTapa("L", this.tapasL ? "l_hatch" + (this.tapasL + 1) : "l_hatch1");
    this.ponerTapa("R", this.tapasR ? "l_hatch" + (this.tapasR + 1) : "r_hatch1");
    if (this.estado === 0) {
      this.radomo = 0;
      this.pitT.visible = this.pitU.visible = this.pitLiq.visible = false;
      this.ojoEs = "radomo";
    } else if (this.estado === 3 || this.estado === 5) {
      this.radomo = 2;
      this.ojoEs = "liquid";
    } else this.radomo = -1;
    this.radomos.forEach((o, i) => {
      o.visible = i === this.radomo;
    });
    this.pose = 0;
    this.posePedida = 0;
    this.poseArg = 0;
    this.posePaso = 0;
    this.poseLista = 0;
    if (this.estado === 0) {
      this.poseLista = 1;
      this.posePedida = -1;
      this.PedirPose(12, 0);
      this.accionTodas(47, 0);
      this.barraMax = this.barraRest = this.barraNow = w.d[0];
    } else if (this.estado === 3) {
      this.PedirPose(0, 0);
      this.accionTodas(0, 0);
      this.barraMax = this.barraRest = this.barraNow = w.d[2];
      this.posePedida = 0;
    } else {
      this.poseLista = 1;
      this.posePedida = -1;
      this.PedirPose(13, 0);
      this.accionTodas(49, 0);
      this.barraMax = this.barraRest = this.barraNow = w.d[2];
    }
    if ((this.estado === 3 || this.estado === 5) && this.huesos[3]) this.huesos[3].position.y -= 500 * MM;
    this.tBarra = 10;
    this.ataque = 2;
    this.ataqueTipo = 0;
    this.finFase = 0;
    this.f724 = 0;
    this.t = {
      t758: 0,
      ame: w.g[2] / 2 | 0,
      t760: w.g[2] / 2 | 0,
      laser: 0,
      misil: 0,
      radomo: 0,
      liquid: 0,
      t774: 0
    };
    this.cuadroN = 0;
    this.tGolpe = 0;
    this.tFin = 0;
    this.alerta = 1;
    this.tAlerta = 255;
    this.ciego = 0;
    this.cabeza = [ 0, 0, 0 ];
    this.laserAng = [ 0, 0, 0 ];
    this.laserMira = [ 0, 0, 0 ];
    this.laserMiraYa = 0;
    this.canon = [ 0, 0 ];
    this.brazo8 = [ 0, 0, 0 ];
    this.meta = this.snake();
    this.metaDist = 0;
    this.metaAng = 0;
    this.rumbo = this.rot;
    this.mirada = [ 0, this.rot, 0 ];
    this.tBarrido = 0;
    this.rondaI = -1;
    this.rondaPaso = 1;
    this.giroCorto = 0;
    this.cubierto = 0;
    this.atkPaso = 0;
    this.atkT = 0;
    this.atkP = V();
    this.atkVel = 0;
    this.atkDir = 0;
    this.laserActor = null;
    this.giroCorto2 = 0;
    this.sonidos = 3;
    this.servo = 0;
    this.camaraCerca = 0;
    this.empuje = {
      L: true,
      R: true
    };
    this.radomoClase = 0;
    this.liquidClase = 0;
    this.semiPie = SEMI_PIE;
    this.bocaL = BOCA_L;
    this.bocaR = BOCA_R;
    this.armas = new ArmasRex(this);
    await (this.armas.iniciar?.());
    if (!this.vivo) {
      this.armas?.destruir?.();
      this.o?.removeFromParent();
      return;
    }
    this.crearParedes();
    this.barras = [ {
      y: 28,
      rest: 1500,
      now: 1500,
      max: 1500,
      visible: this.estado >= 1 && this.estado <= 4,
      conf: {
        nombre: "MG-REX",
        izq: [ 16, 111, 159 ],
        der: [ 26, 187, 138 ]
      }
    } ];
    this.grande = this.A.agregarGrande({
      nombre: "MGREX",
      jefe: this,
      activo: () => this.vivo && this.listo,
      blancos: () => this.blancosStinger(),
      alPegar: (i, p) => this.log("stinger", {
        i: i,
        p: [ p.x | 0, p.y | 0, p.z | 0 ]
      }),
      golpeNinja: (i, p, daño) => {
        const t = this.blancosStinger()[i];
        if (!t) return false;
        const clase = t.cual === "radomo" ? this.radomoClase : this.liquidClase;
        if (!(clase & CLASE.POWER)) return false;
        this.golpeBlanco(t.cual, daño);
        return true;
      }
    });
    this.blanco = false;
    this.A.escuchar(18260, v => {
      if ((v[0] & 65535) === HASH.KILL) {
        this.log("mesg kill");
        this.morir("kill");
        return true;
      }
      return false;
    });
    this.dibujar();
    this.guardar();
    this.log("inicio", {
      st: this.st,
      estado: this.estado,
      vidaRadomo: this.vidaRadomo,
      vidaLiquid: this.vidaLiquid,
      mov: [ this.mov.x, this.mov.y, this.mov.z ],
      rot: this.rot,
      z: [ w.procZ1, w.procZ2 ]
    });
  }
  ponerTapa(lado, nombre) {
    const idx = {
      l_hatch1: 0,
      l_hatch2: 1,
      l_hatch3: 2,
      l_hatch4: 3,
      r_hatch1: 4
    }[nombre] ?? 0;
    const pierna = lado === "L" ? this.L : this.R, actual = lado === "L" ? this.tapaL : this.tapaR;
    actual?.removeFromParent();
    const o = this.tapaModelos[idx].clone(true);
    pierna.huesos[1].add(o);
    this.ctx.teñir?.(o);
    if (lado === "L") this.tapaL = o; else this.tapaR = o;
  }
  motores() {
    return [ this.motor, this.L.motor, this.R.motor ];
  }
  accionTodas(a, interp) {
    for (const m of this.motores()) m.accion(a, interp);
  }
  Accion(a, interp) {
    if (this.motor.action === a) return;
    this.accionActual = a;
    this.accionTodas(a, interp);
  }
  Congelar() {
    if (this.motor.info1.f14 !== 1) return;
    for (const m of this.motores()) m.info1.f14 = 0;
  }
  Soltar() {
    if (this.motor.info1.quedan === 1) return;
    for (const m of this.motores()) m.info1.f14 = 1;
  }
  PedirPose(p, arg) {
    if (this.poseLista !== 1) return;
    if (this.posePedida === p) return;
    this.posePedida = p;
    this.poseArg = arg;
    this.poseLista = 0;
  }
  cuadro() {
    if (!this.vivo) return;
    this.cuadroN++;
    for (const m of this.motores()) m.tick();
    this.L.motor.rots[0] = [ 0, 0, 0 ];
    this.R.motor.rots[0] = [ 0, 0, 0 ];
    const pa = this.motor.paso;
    if (PASO_GIRADO) {
      const r = this.rot * ANG, c = Math.cos(r), sn = Math.sin(r);
      this.mov.x += (pa[0] * c + pa[1] * sn) * 10;
      this.mov.z += (-pa[0] * sn + pa[1] * c) * 10;
    } else {
      this.mov.x += pa[0] * 10;
      this.mov.z += pa[1] * 10;
    }
    this.mov.y = this.motor.altura * 10;
    this.rot = this.turn & 4095;
    this.motor.rots[7] = [ 0, 0, 0 ];
    this.motor.rots[8] = [ this.brazo8[0] & 4095, this.brazo8[1] & 4095, this.brazo8[2] & 4095 ];
    if (this.estado >= 3) this.motor.rots[3] = [ 170, 0, 0 ];
    const z4 = ejeZ(this.huesos[4]);
    this.rumbo = ratan2(z4.x, z4.z) & 4095;
    switch (this.estado) {
     case 0:
      this.Entrada();
      break;

     case 1:
      this.Pelea();
      break;

     case 2:
      this.FinRadomo();
      break;

     case 3:
      this.Pelea2();
      break;

     case 4:
      this.FinLiquid();
      break;

     case 5:
      this.Quieto();
      break;

     default:
      break;
    }
    if (!this.vivo) return;
    this.Poses();
    this.Apuntar();
    this.armas.polvo();
    if (this.barraNow === this.barraRest) this.tBarra = 10; else if (--this.tBarra < 0) this.barraRest = nearSpeed(this.barraRest, this.barraNow, 64);
    const b = this.barras[0];
    b.rest = trunc(this.barraRest * 1500 / Math.max(1, this.barraMax));
    b.now = trunc(this.barraNow * 1500 / Math.max(1, this.barraMax));
    this.empujarSnake();
    this.Pasos();
    this.actualizarParedes();
    this.Nikita();
    this.dentroHangar();
  }
  Entrada() {
    if (this.cuadroN >= 301) {
      this.meta = this.snake();
      this.estado = 1;
      this.barras[0].visible = true;
      this.log("pelea");
    }
    if (this.cuadroN === 180) this.PedirPose(0, 0); else if (this.cuadroN === 270) this.se(SE.ENTRADA2, this.puntoHueso3mm());
    if (this.cuadroN === 120) this.se(SE.ENTRADA1, this.mov.clone());
  }
  puntoHueso3mm() {
    return aMundo(this.huesos[3], [ 0, 0, 0 ]);
  }
  Pelea2() {
    if (this.cuadroN < 5) this.meta = this.snake();
    this.Pelea();
  }
  Pelea() {
    for (const k of Object.keys(this.t)) if (this.t[k] > 0) this.t[k]--;
    this.Ver();
    const a = this.alerta;
    if (a === 0) {
      this.ataque = 1;
      this.Caminar();
    } else if (a === 1 && (this.ciego === 0 || this.nivel() === 0)) {
      this.ataque = a;
      this.Caminar();
    } else if (a === 1 || a === 2) {
      this.ElegirAtaque();
      switch (this.ataque) {
       case 2:
        this.Caminar();
        break;

       case 3:
        this.Misiles();
        break;

       case 4:
        this.Laser();
        break;

       case 5:
        this.Ametralladoras();
        break;

       case 6:
        this.Pisoton();
        break;

       case 7:
        break;

       default:
        this.ataque = 2;
        break;
      }
    }
    this.blancosFase();
    if (this.finFase === 1 || this.finFase === 2) {
      this.f724 = 0;
      this.tFin = 0;
      this.estado++;
      this.log("fin de fase", {
        finFase: this.finFase,
        estado: this.estado
      });
      this.A.mensaje?.(15177, [ 24203 ]);
      this.fundido = 30;
      this.armas.fundido?.(30);
    }
  }
  blancosFase() {
    const w = this.w;
    if (this.finFase === 0 && this.vidaRadomo > 0 && this.radomoClase === 0) this.radomoClase = 148;
    if (this.finFase === 0 && this.vidaRadomo <= 0 && this.liquidClase === 0 && this.vidaLiquid > 0) this.liquidClase = 148;
    if (this.radomoClase) {
      this.barraNow = Math.max(0, this.vidaRadomo);
      if (this.vidaRadomo <= 0) {
        this.radomoClase = 0;
        this.radomo = 1;
        this.radomos.forEach((o, i) => {
          o.visible = i === 1;
        });
        this.finFase = 2;
        this.log("radomo roto");
      } else if (this.tGolpe) {
        this.radomoClase = CLASE.AVAIL;
        this.tGolpe--;
      } else this.radomoClase = 20;
    }
    if (this.liquidClase) {
      this.barraNow = Math.max(0, this.vidaLiquid);
      if (this.vidaLiquid <= 0) {
        this.liquidClase = 0;
        this.finFase = 1;
        this.log("liquid vencido");
      } else if (this.tGolpe) {
        this.liquidClase = CLASE.AVAIL;
        this.tGolpe--;
      } else this.liquidClase = 20;
    }
  }
  centroRadomo() {
    return aMundo(this.huesos[6], RADOMO.off);
  }
  centroLiquid() {
    return this.pitLiqH[1] ? aMundo(this.pitLiqH[1], [ 0, 0, 0 ]) : this.mov.clone();
  }
  blancosStinger() {
    const r = [];
    if (this.radomoClase) r.push({
      c: this.centroRadomo(),
      s: RADOMO.tam[0],
      fijable: !!(this.radomoClase & CLASE.SEEK),
      tam: RADOMO.tam,
      cual: "radomo"
    });
    if (this.liquidClase) r.push({
      c: this.centroLiquid(),
      s: LIQUID.tam[1],
      fijable: !!(this.liquidClase & CLASE.SEEK),
      tam: LIQUID.tam,
      cual: "liquid"
    });
    return r;
  }
  alExplotar(p) {
    if (!this.vivo || !this.listo) return;
    const pmm = p.clone().multiplyScalar(1e3);
    for (const t of this.blancosStinger()) {
      const clase = t.cual === "radomo" ? this.radomoClase : this.liquidClase;
      if (!(clase & CLASE.POWER)) continue;
      let daño = 0;
      for (const s of [ 1e3, 2e3 ]) if (Math.abs(pmm.x - t.c.x) < s + t.tam[0] && Math.abs(pmm.y - t.c.y) < s + t.tam[1] && Math.abs(pmm.z - t.c.z) < s + t.tam[2]) daño += 128;
      if (daño) this.golpeBlanco(t.cual, daño);
    }
  }
  golpeBlanco(cual, daño) {
    this.impactos++;
    const snk = this.snake();
    if (cual === "radomo") {
      this.vidaRadomo -= daño;
      this.t.radomo = this.w.d[1];
      this.Alerta(2);
      this.meta = snk.clone();
      this.se(SE.RADOMO, this.centroRadomo());
      this.tGolpe = 60;
      this.radomoClase = CLASE.AVAIL;
      this.armas.humo1(this.huesos[6], RADOMO.humo, 1, 90);
    } else {
      this.vidaLiquid -= daño;
      this.t.liquid = this.w.d[3];
      this.Alerta(2);
      this.meta = snk.clone();
      const c = this.centroLiquid();
      this.se(SE.LIQUID_GOLPE, c);
      this.se(SE.LIQUID_AY, c);
      this.tGolpe = 60;
      this.liquidClase = CLASE.AVAIL;
      this.armas.humo1(this.pitLiqH[1] || this.huesos[3], LIQUID.humo, 1, 90);
    }
    this.log("golpe", {
      cual: cual,
      "daño": daño,
      radomo: this.vidaRadomo,
      liquid: this.vidaLiquid
    });
  }
  FinRadomo() {
    this.f724 = -1;
    if (this.poseLista) this.PedirPose(2, 0);
    this.cabeza[0] = nearExp8(this.cabeza[0], randS(128));
    this.cabeza[1] = nearExp8(this.cabeza[1], randS(128));
    if (++this.tFin < 33) return;
    if (this.mgr.gameOverTimer() !== 0) {
      this.PedirPose(0, 0);
      return;
    }
    this.finDeFase(this.w.procZ2, "radomo");
  }
  FinLiquid() {
    this.f724 = -1;
    if (this.poseLista) this.PedirPose(11, 0);
    if (++this.tFin < 40) return;
    if (this.mgr.gameOverTimer() !== 0) {
      this.PedirPose(0, 0);
      return;
    }
    this.finDeFase(this.w.procZ1, "liquid");
  }
  finDeFase(proc, cual) {
    this.A.mensaje?.(25342, [ 29169 ]);
    this.A.mensaje?.(29033, [ HASH.KILL ]);
    this.finFase = 0;
    this.guardar();
    this.log("proc -z", {
      cual: cual,
      proc: proc
    });
    const yo = this.actor;
    this.destruir(true);
    if (this.mgr.correrProc(proc, [])) return;
    if (cual === "radomo") respaldoFase2(this.mgr, this.ctx, yo); else this.mgr.victoria(this, {
      jefe: "MGREX",
      proc: proc,
      demos: [],
      siguiente: "d18a"
    }, {
      sinProc: true
    });
  }
  Quieto() {
    if (!this.liquidClase) this.liquidClase = 148;
  }
  ojo() {
    return this.ojoEs === "liquid" ? this.pitLiqH[1] || this.huesos[3] : this.huesos[6];
  }
  Ver() {
    let vio = 0;
    if (this.ciego) {
      this.ciego--;
      this.alerta = 1;
      this.tAlerta = 255;
    }
    const ojo = this.ojo(), pOjo = aMundo(ojo, [ 0, 0, 0 ]);
    const A = this.ctx.armas || this.J.ctx.armas;
    if (this.estado < 3) {
      if (A?.chaff > 0) this.ciego = 1;
    } else if (this.mgr.stun) this.ciego = 90;
    const snk = this.snake();
    if (this.ciego === 0) {
      const l = aLocal(ojo, snk);
      const lx = trunc(l.x / 4), ly = trunc(l.y / 4), lz = trunc(l.z / 4);
      let yaw = ratan2(lx, lz) & 4095, pitch = ratan2(-ly, isqrt(lx * lx + lz * lz)) & 4095;
      const dist = isqrt(lx * lx + ly * ly + lz * lz) * 4;
      if (yaw >= 2048) yaw -= 4096;
      if (pitch >= 2048) pitch -= 4096;
      this.cubierto = 0;
      if (Math.abs(yaw) < this.w.e[1] >> 1 && Math.abs(pitch) < this.w.e[2] >> 1 && dist < 3e4) {
        const corte = this.LineaLibre(pOjo, snk);
        if (!corte) {
          this.meta = snk.clone();
          vio = 1;
          this.Alerta(2);
        } else if (this.estado < 3) {
          const d = corte.clone().sub(snk);
          const dx = trunc(d.x / 4), dy = trunc(d.y / 4), dz = trunc(d.z / 4);
          if (dx * dx + dy * dy + dz * dz <= 140624) {
            this.meta = snk.clone();
            this.Alerta(2);
            vio = 1;
            this.cubierto = 1;
          }
        }
      }
    }
    this.vioEste = vio;
    const c4 = aMundo(this.huesos[4], [ 0, 0, 0 ]);
    const dx = trunc((this.meta.x - c4.x) / 4), dz = trunc((this.meta.z - c4.z) / 4);
    this.metaDist = isqrt(dx * dx + dz * dz) * 4;
    this.metaAng = wrap((ratan2(dx, dz) & 4095) - this.rumbo & 4095);
    if (this.alerta === 0) {
      if (this.pose !== 0) this.mirada[1] = this.rumbo; else {
        this.mirada[1] = nearSpeed(this.mirada[1], this.rumbo + (this.tBarrido >= 129 ? 300 : -300), 5);
        const e = this.meta.clone().sub(pOjo);
        const ex = trunc(e.x / 4), ey = trunc(e.y / 4), ez = trunc(e.z / 4);
        this.mirada[0] = ratan2(-ey, isqrt(ex * ex + ez * ez));
        this.mirada[2] = 0;
        if (--this.tBarrido <= 0) {
          if (this.rondaI === -1) this.RondaCercana(this.meta); else {
            this.rondaI += this.rondaPaso;
            if (this.rondaI < 0) this.rondaI = 13; else if (this.rondaI >= 14) this.rondaI = 0;
          }
          const p = RONDA[this.rondaI];
          this.meta = V(p[0], 0, p[1]);
          this.tBarrido = 256;
        }
      }
    } else if (this.alerta === 1) {
      if (this.pose !== 0) this.mirada[1] = this.rumbo; else {
        this.mirada[1] = nearSpeed(this.mirada[1], this.rumbo + (this.tBarrido >= 129 ? 300 : -300), 5);
        this.mirada[0] = 300;
        if (--this.tBarrido <= 0) this.tBarrido = 255;
      }
      if (--this.tAlerta < 0) {
        this.alerta = 0;
        this.tAlerta = 0;
      }
    } else if (this.alerta === 2) {
      const e = this.meta.clone().sub(pOjo);
      const ex = trunc(e.x / 4), ey = trunc(e.y / 4), ez = trunc(e.z / 4);
      this.mirada[1] = ratan2(ex, ez);
      this.mirada[0] = ratan2(-ey, isqrt(ex * ex + ez * ez));
      this.mirada[2] = 0;
      this.meta = snk.clone();
      if (!vio) this.tAlerta--;
      if (--this.tAlerta < 0 && this.ataque === 2) this.Alerta(1);
      this.rondaI = -1;
    }
    this.Cabeza();
  }
  LineaLibre(a, b) {
    const d = b.clone().sub(a), L = d.length();
    if (L < 1) return null;
    const h = this.mgr.pared(a, d.normalize(), L, -1, 0);
    return h ? h.punto : null;
  }
  RondaCercana(p) {
    let mejor = 0, md = Infinity;
    RONDA.forEach((q, i) => {
      const dx = trunc((p.x - q[0]) / 4), dz = trunc((p.z - q[1]) / 4), d = dx * dx + dz * dz;
      if (d <= md) {
        md = d;
        mejor = i;
      }
    });
    this.rondaI = mejor;
    this.rondaPaso = randU(2) & 1 ? 1 : -1;
  }
  Alerta(n) {
    if (n === 2 && this.alerta !== 2 && this.estado >= 3) this.se(randU(2) ? SE.LIQUID_VE1 : SE.LIQUID_VE2, this.centroLiquid());
    this.alerta = n;
    this.tAlerta = 255;
    if (this.ciego && this.alerta === 2) {
      this.alerta = 1;
      this.tAlerta = 255;
    }
  }
  Cabeza() {
    const base = this.estado >= 3 ? this.pitLiqH[0] || this.huesos[3] : this.huesos[5];
    base.updateWorldMatrix(true, false);
    const dir = new THREE.Vector3(0, 0, 1).applyMatrix4(rotZYX([ this.mirada[0], this.mirada[1], this.mirada[2] ]));
    const inv = (new THREE.Matrix4).extractRotation(base.matrixWorld).invert();
    dir.applyMatrix4(inv);
    let yaw = ratan2(dir.x * 4096, dir.z * 4096) & 4095, pitch = ratan2(-dir.y * 4096, Math.hypot(dir.x, dir.z) * 4096) & 4095;
    if (pitch >= 2049) pitch -= 4096;
    if (yaw >= 2049) yaw -= 4096;
    yaw = Math.max(-300, Math.min(300, yaw));
    pitch = Math.max(-300, Math.min(300, pitch));
    if (this.cabeza[1] !== yaw) this.sonidos |= 4;
    this.cabeza[0] = this.GirarHacia(this.cabeza[0], pitch, 30);
    this.cabeza[1] = this.GirarHacia(this.cabeza[1], yaw, 30);
    this.cabeza[2] = this.GirarHacia(this.cabeza[2], 0, 30);
    const o1 = aMundo(this.huesos[1], [ 0, 0, 0 ]), d = this.meta.clone().sub(o1);
    const r = -this.rumbo * ANG, lx = d.x * Math.cos(r) + d.z * Math.sin(r), lz = -d.x * Math.sin(r) + d.z * Math.cos(r);
    let cy = ratan2(lx, lz) & 4095, cp = ratan2(-d.y, Math.hypot(lx, lz)) & 4095;
    if (cp >= 2049) cp -= 4096;
    if (cy >= 2049) cy -= 4096;
    cy = Math.max(-300, Math.min(300, cy));
    cp = Math.max(0, Math.min(150, cp));
    this.canon[0] = this.GirarHacia(this.canon[0], cp, 30);
    this.canon[1] = this.GirarHacia(this.canon[1], cy, 30);
  }
  GirarHacia(a, b, v) {
    let d = b - a & 4095;
    if (d >= 2048) d -= 4096;
    const t = a + d;
    return a < t ? Math.min(a + v, t) : Math.max(a - v, t);
  }
  Apuntar() {
    if (!this.laserMiraYa) for (let i = 0; i < 3; i++) this.laserAng[i] = this.GirarHacia(this.laserAng[i], this.laserMira[i], 40); else this.laserAng = this.laserMira.slice();
    this.motor.rots[9] = [ this.laserAng[0] - 170 & 4095, this.motor.rots[9][1], this.motor.rots[9][2] ];
    if (this.estado >= 3) this.pitLiqRots[1] = [ this.cabeza[0] & 4095, this.cabeza[1] & 4095, 0 ]; else this.motor.rots[6] = [ this.cabeza[0] & 4095, this.motor.rots[6][1], this.motor.rots[6][2] ];
    this.adjust[2] = [ this.canon[0], this.canon[1], 0 ];
    if (this.estado !== 0) {
      const h7 = this.huesos[7], o = aMundo(h7, [ 0, 0, 0 ]), p = aMundo(h7, [ -4788, 0, 13155 ]);
      const s = this.RayoHangar(o, p, 14e3);
      const ang = ratan2(isqrt(Math.max(0, 173054025 - s * s)), s);
      this.brazo8[0] = this.GirarHacia(this.brazo8[0], -ang, 40);
      this.brazo8[1] = this.GirarHacia(this.brazo8[1], -228, 5);
      this.brazo8[2] = 0;
    }
  }
  RayoHangar(a, b, lim) {
    let x = b.x, y = b.y, z = b.z, corta = false;
    if (x < -HANGAR.x || x > HANGAR.x) {
      const lx = x < 0 ? -HANGAR.x : HANGAR.x, k = (lx - a.x) / (x - a.x || 1);
      y = a.y + (y - a.y) * k;
      z = a.z + (z - a.z) * k;
      x = lx;
      corta = true;
    }
    if (z < -HANGAR.z || z > HANGAR.z) {
      const lz = z < 0 ? -HANGAR.z : HANGAR.z, k = (lz - a.z) / (z - a.z || 1);
      y = a.y + (y - a.y) * k;
      x = a.x + (x - a.x) * k;
      z = lz;
      corta = true;
    }
    this._rayoPunto = V(x, y, z);
    if (corta || lim === -1) return Math.round(Math.hypot(x - a.x, y - a.y, z - a.z));
    return lim;
  }
  GiroChoca(dx, dz, ang) {
    const r = (this.rot + ang) * ANG, c = Math.cos(r), s = Math.sin(r);
    const tx = this.mov.x + dx * c + dz * s, tz = this.mov.z - dx * s + dz * c;
    for (const p of PUNTOS_GIRO) {
      const x = tx + p[0] * c + p[2] * s, z = tz - p[0] * s + p[2] * c;
      if (x > 13e3 || x < -13e3 || z > 25e3 || z < -25e3) return true;
    }
    return false;
  }
  Caminar() {
    if (!this.poseLista) return;
    const ang = this.metaAng, d = this.metaDist, abs = Math.abs(ang);
    const pedir = (p, a = 0) => this.PedirPose(p, a);
    if (abs >= (this.giroCorto ? 568 : 113)) {
      this.giroCorto = 0;
      let accion;
      if (ang > 0) accion = ang >= 683 ? 25 : ang >= 569 ? 24 : ang >= 456 ? 23 : ang >= 342 ? 22 : ang >= 228 ? 21 : 20; else accion = ang < -682 ? 31 : ang < -568 ? 30 : ang < -455 ? 29 : ang < -341 ? 28 : ang < -227 ? 27 : 26;
      const g = accion === 26 ? [ 0, 5e3, 0 ] : GIROS[accion];
      if (!this.GiroChoca(g[0], g[1], g[2]) || d >= 17001) {
        pedir(3, accion);
        return;
      }
      if (ang >= 1025 && !this.giroCorto2 && !this.GiroChoca(GIROS[31][0], GIROS[31][1], GIROS[31][2])) {
        pedir(3, 31);
        this.giroCorto2 = 1;
        return;
      }
      if (ang < 1024 && !this.giroCorto2 && !this.GiroChoca(GIROS[25][0], GIROS[25][1], GIROS[25][2])) {
        pedir(3, 25);
        this.giroCorto2 = 1;
        return;
      }
      this.giroCorto2 = 0;
      if (!this.GiroChoca(ADELANTE[0], ADELANTE[2], 0)) pedir(1); else pedir(this.pose === 2 ? 1 : 2);
      return;
    }
    if (d < 1e4 && !(this.alerta === 1 && this.pose === 1)) {
      this.giroCorto = 0;
      if (!this.GiroChoca(ATRAS[0], ATRAS[2], 0)) {
        pedir(2);
        return;
      }
      const [fr, de, iz] = RAYOS.map(v => this.RayoHangar(this.mov, this.puntoLocal(v), 8e4));
      let s6 = false, s7 = false;
      if (iz < de) s6 = fr < de; else if (fr < iz) s7 = true;
      if (s6) pedir(3, 22); else if (s7) pedir(3, 28); else pedir(this.pose === 1 ? 2 : 1);
      return;
    }
    if (d < 25001) {
      this.giroCorto = 0;
      pedir(0);
      return;
    }
    if (!this.GiroChoca(ADELANTE[0], ADELANTE[2], 0)) {
      pedir(1);
      return;
    }
    this.giroCorto = 1;
    const de = this.RayoHangar(this.mov, this.puntoLocal(RAYOS[1]), 8e4), iz = this.RayoHangar(this.mov, this.puntoLocal(RAYOS[2]), 8e4);
    pedir(3, iz < de ? 22 : 28);
  }
  puntoLocal(p) {
    const r = this.rot * ANG, c = Math.cos(r), s = Math.sin(r);
    return V(this.mov.x + p[0] * c + p[2] * s, this.mov.y + p[1], this.mov.z - p[0] * s + p[2] * c);
  }
  Poses() {
    const a = this.motor.action, fr = this.motor.info1.frame;
    const corre = a === 0 || a === 47 || a === 49 || a === 13 && fr === 24 || a === 14 && fr === 23 || this.motor.isEnd !== 0;
    if (!corre) return;
    const P = this.posePedida;
    const salir = (acc, se) => {
      this.Accion(acc, 2);
      if (se) this.se(se, this.mov.clone());
      this.posePaso = 0;
      this.poseLista = 0;
      this.pose = P;
    };
    const fin = (acc, interp, lista) => {
      this.Accion(acc, interp);
      this.poseLista = lista;
    };
    switch (this.pose) {
     case 0:
      this.Accion(0, 2);
      if (P !== 0) {
        this.pose = P;
        this.posePaso = 0;
        this.poseLista = 0;
      } else {
        this.posePaso = 1;
        this.poseLista = 1;
      }
      break;

     case 1:
      if (P !== 1) {
        salir(a === 1 || a === 2 ? 5 : 4);
        break;
      }
      if (this.posePaso !== 1) {
        this.Accion(1, 2);
        this.posePaso = 1;
        this.poseLista = 1;
        break;
      }
      fin(a === 1 || a === 2 ? 3 : 2, 2, this.poseLista);
      break;

     case 2:
      if (P !== 2) {
        salir(a === 15 || a === 17 ? 18 : 19);
        break;
      }
      if (this.posePaso !== 1) {
        this.Accion(15, 2);
        this.posePaso = 1;
        this.poseLista = 1;
        break;
      }
      this.Accion(a === 15 || a === 17 ? 16 : 17, 0);
      this.poseLista = 1;
      break;

     case 3:
      if (this.posePaso !== 1) {
        this.Accion(this.poseArg, 2);
        this.se(SE.GIRO, this.mov.clone());
        this.posePaso = 1;
        this.poseLista = 0;
        this.giros = (this.giros || 0) + 1;
        break;
      }
      {
        const g = s16(this.motor.rots[0][1]);
        this.rot = wrap(this.rot + g) & 4095;
        this.turn = wrap(this.turn + g) & 4095;
        this.motor.rots[0][1] = 0;
        this.Accion(0, 0);
        this.posePedida = 0;
        this.pose = 0;
        this.posePaso = 0;
      }
      break;

     case 4:
      if (P !== 4) {
        this.Accion(9, 2);
        this.se(SE.FIN_POSE, this.mov.clone());
        this.posePaso = 0;
        this.poseLista = 0;
        this.pose = P;
        break;
      }
      if (this.posePaso !== 1) {
        this.Accion(6, 2);
        this.se(SE.MISIL_POSE, this.mov.clone());
        this.posePaso = 1;
        break;
      }
      this.Accion(8, 2);
      this.poseLista = 1;
      break;

     case 5:
      if (P !== 5) {
        salir(12);
        break;
      }
      if (this.posePaso !== 1) {
        this.Accion(10, 2);
        this.posePaso = 1;
        break;
      }
      this.Accion(11, 2);
      this.poseLista = 1;
      break;

     case 6:
      if (P !== 6) {
        salir(0);
        break;
      }
      if (this.posePaso !== 1) {
        this.Accion(0, 2);
        this.posePaso = 1;
        break;
      }
      this.Accion(0, 2);
      this.poseLista = 1;
      break;

     case 7:
     case 8:
      if (P !== this.pose) {
        this.Soltar();
        salir(this.motor.action);
        break;
      }
      if (this.posePaso !== 1) {
        this.Accion(this.pose === 7 ? 13 : 14, 2);
        this.posePaso = 1;
        break;
      }
      this.Congelar();
      this.poseLista = 1;
      break;

     case 9:
      if (this.posePaso !== 1) {
        this.Accion(44, 2);
        this.posePaso = 1;
        this.poseLista = 0;
        this.posePedida = 0;
        break;
      }
      this.Accion(0, 2);
      this.posePaso = 0;
      this.poseLista = 0;
      this.pose = this.posePedida;
      break;

     case 10:
      if (P !== 10) {
        salir(a === 32 || a === 33 ? 36 : 35);
        break;
      }
      this.se(SE.POSE_B4, this.mov.clone());
      if (this.posePaso !== 1) {
        this.Accion(32, 2);
        this.posePaso = 1;
        this.poseLista = 1;
        break;
      }
      this.Accion(a === 32 || a === 33 ? 34 : 33, 2);
      break;

     case 11:
      if (P !== 11) {
        salir(a === 37 || a === 39 ? 40 : 41);
        break;
      }
      this.se(SE.POSE_B4, this.mov.clone());
      if (this.posePaso !== 1) {
        this.Accion(37, 2);
        this.posePaso = 1;
        this.poseLista = 1;
        break;
      }
      this.Accion(a === 37 || a === 39 ? 38 : 39, 0);
      break;

     case 12:
      if (P !== 12) {
        this.Accion(48, 2);
        this.se(SE.FIN_POSE, this.mov.clone());
        this.posePaso = 0;
        this.poseLista = 0;
        this.pose = P;
        break;
      }
      if (this.posePaso !== 1) this.posePaso = 1;
      this.Accion(47, 0);
      this.poseLista = 1;
      break;

     case 13:
      if (P !== 13) {
        this.Accion(0, 2);
        this.se(SE.FIN_POSE, this.mov.clone());
        this.posePaso = 0;
        this.poseLista = 0;
        this.pose = P;
        break;
      }
      if (this.posePaso !== 1) this.posePaso = 1;
      this.Accion(49, 0);
      this.poseLista = 1;
      break;

     default:
      break;
    }
  }
  ElegirAtaque() {
    const p = this.ciego ? this.meta : this.snake();
    if (this.poseLista !== 1) return;
    if (this.ataque >= 3 && this.ataque <= 6) return;
    const pa = this.puntoLocal(PIES_PISOTON[0]), pb = this.puntoLocal(PIES_PISOTON[1]);
    const d0 = isqrt(trunc((p.x - pa.x) / 4) ** 2 + trunc((p.z - pa.z) / 4) ** 2) * 4, d1 = isqrt(trunc((p.x - pb.x) / 4) ** 2 + trunc((p.z - pb.z) / 4) ** 2) * 4;
    const ang = Math.abs(this.metaAng), d = this.metaDist;
    if (d0 < 2500 || d1 < 2500) {
      this.PedirPose(d0 < d1 ? 7 : 8, 0);
      this.atkT = 26;
      this.ataqueTipo = 4;
      this.atkPaso = 0;
      this.ataque = 6;
      this.log("pisotón", {
        pie: d0 < d1 ? "L" : "R"
      });
      return;
    }
    if (!this.t.laser && !this.cubierto && d >= 3001 && d < 15e3 && ang < 113) {
      this.PedirPose(5, 0);
      this.atkPaso = 0;
      this.atkT = this.nivel() === 0 ? 40 : 25;
      this.ataqueTipo = 2;
      this.ataque = 4;
      this.log("láser", {
        d: d
      });
      return;
    }
    if (!this.t.ame && !this.cubierto && d >= 13001 && d < 2e4 && ang < 113) {
      this.PedirPose(6, 0);
      this.ataqueTipo = 1;
      this.atkPaso = 0;
      this.ataque = 5;
      this.atkT = this.w.g[0] * 2;
      this.log("ametralladoras", {
        d: d
      });
      return;
    }
    if ((!this.t.misil || this.cubierto) && d >= 15001 && d < 25e3 && ang < 227) {
      this.PedirPose(4, 0);
      this.atkT = 120;
      this.atkPaso = 0;
      this.ataqueTipo = 3;
      this.ataque = 3;
      this.log("misiles", {
        d: d
      });
      return;
    }
    this.ataque = 2;
  }
  Pisoton() {
    if (this.atkT === 0) {
      this.ataque = 2;
      this.PedirPose(0, 0);
      return;
    }
    const lado = this.pose === 7 ? "L" : "R";
    if (!((this.pose === 7 || this.pose === 8) && this.poseLista === 1)) {
      if (this.atkPaso !== 0) {
        this.ataque = 2;
        this.PedirPose(0, 0);
        return;
      }
      if (this.motor.action === 13) this.empuje.L = false; else if (this.motor.action === 14) this.empuje.R = false;
      return;
    }
    const pierna = lado === "L" ? this.L : this.R;
    if (this.atkPaso === 0) this.atkPaso = 1;
    this.atkT--;
    let pego = false;
    if (this.atkT >= 25) {
      const pie = aMundo(pierna.huesos[8], [ 0, 0, 0 ]), w = this.semiPie || 1300;
      pego = this.cajaSnake(pie, [ w, w + 500, w ]) && this.dañarSnake(this.w.s[0], 2, pie);
      this.pisotones++;
      this.log("pisa", {
        lado: lado,
        pego: pego,
        pie: [ pie.x | 0, pie.y | 0, pie.z | 0 ]
      });
    }
    if (pego && this.mgr.gameOverTimer() === 0) this.atkPaso = 2;
    if (this.atkT === 25) {
      this.armas.anillo(pierna.huesos[8], 4e3);
      return;
    }
    if (this.atkT === 24) {
      this.empuje.L = this.empuje.R = true;
      if (this.atkPaso === 2) this.atkT = -1;
      if (this.nivel() !== 0) {
        const pie = aMundo(pierna.huesos[8], [ 0, 0, 0 ]);
        if (this.cajaSnake(pie, ONDA_TAM)) this.dañarSnake(0, 2, pie);
      }
      return;
    }
    if (this.atkT === -20 || this.atkT === -60 || this.atkT === -70) {
      const m = pierna.motor, ov = lado === "L" ? 45 : 46;
      if (m.action2 !== ov) m.override(ov, 4, 3840);
      return;
    }
    if (this.atkT === -100) {
      if (this.mgr.gameOverTimer() === 0) this.atkT = 3;
      return;
    }
    const m = pierna.motor;
    if (m.time2) {
      m.action2 = 0;
      m.info1.mask = 0;
      m.info2.mask = 65535;
    }
  }
  Laser() {
    const meta = V(this.meta.x, 0, this.meta.z);
    if (this.atkPaso === 0) {
      const r = this.rot * ANG, lado = this.metaAng > 0 ? -6e3 : 6e3;
      this.atkP.set(meta.x + lado * Math.cos(r), 0, meta.z - lado * Math.sin(r));
      this.atkVel = 200;
      this.atkDir = this.rumbo + (this.metaAng > 0 ? 1024 : -1024) & 4095;
      this.laserActor = null;
      this.atkPaso = 1;
    }
    const h9 = this.huesos[9];
    h9.updateWorldMatrix(true, false);
    const l = aLocal(this.huesos[0], this.atkP), o = aLocal(this.huesos[0], aMundo(h9, [ 0, 0, 0 ]));
    const dx = l.x - o.x, dy = l.y - o.y, dz = l.z - o.z;
    let yaw = ratan2(dx, dz) & 4095, pitch = ratan2(-dy, Math.hypot(dx, dz)) & 4095;
    if (pitch >= 2049) pitch -= 4096;
    if (yaw >= 2049) yaw -= 4096;
    this.laserMira = [ pitch, yaw, 0 ];
    if (this.atkT === 0 || !(this.pose === 5 && this.poseLista === 1)) {
      if (this.atkT !== 0 && this.atkPaso === 1) {
        this.atkDir = ratan2(this.meta.x - this.atkP.x, this.meta.z - this.atkP.z);
        return;
      }
      this.ataque = 2;
      this.laserMira = [ 0, 0, 0 ];
      this.laserMiraYa = 0;
      this.t.laser = this.w.l[1];
      this.laserActor = null;
      return;
    }
    this.atkPaso = 2;
    this.laserMiraYa = 1;
    this.atkP.x += trunc(rsin(this.atkDir) * this.atkVel / 4096);
    this.atkP.z += trunc(rcos(this.atkDir) * this.atkVel / 4096);
    this.atkVel = this.nivel() !== 0 ? nearSpeed(this.atkVel, 600, 40) : nearSpeed(this.atkVel, 300, 20);
    if (!this.laserActor) {
      this.laserActor = this.armas.laser(h9, 2, this.w.l[8], this.atkT - 1);
      this.laseres++;
      this.log("láser sale", {
        "daño": this.w.l[8],
        cuadros: this.atkT - 1
      });
    }
    this.atkT--;
  }
  Ametralladoras() {
    if (this.atkT === 0 || !(this.pose === 6 && this.poseLista === 1) && this.atkPaso !== 0) {
      this.ataque = 2;
      this.t.ame = this.w.g[1];
      return;
    }
    if (!(this.pose === 6 && this.poseLista === 1)) return;
    if (this.atkPaso === 0) {
      const a = this.metaAng + this.rumbo & 4095, r = a * ANG, k = this.metaDist - 5e3;
      this.atkP.set(this.mov.x + k * Math.sin(r), this.meta.y, this.mov.z + k * Math.cos(r));
      this.atkVel = this.nivel() === 0 ? 200 : 400;
      this.atkPaso = 1;
      this.atkDir = a;
      this.canonBase = this.canon[1];
    }
    if (this.atkPaso === 1) {
      const izq = (this.atkT & 1) === 1;
      const boca = aMundo(this.huesos[2], izq ? this.bocaL : this.bocaR);
      const xE = this.nivel() === 0 ? izq ? 800 : -800 : 0;
      const mira = this.puntoEnRot(this.atkP, [ xE, 0, 0 ]);
      const dir = mira.clone().sub(boca);
      const giro = (this.canon[1] - this.canonBase) * ANG;
      dir.applyAxisAngle(V(0, 1, 0), giro);
      this.se(SE.AMETRALLADORA, boca);
      this.A.bala({
        origen: boca,
        dir: dir,
        "daño": this.w.g[10],
        largo: this.w.g[11],
        vel: this.w.g[12],
        tam: this.w.g[9]
      });
      this.armas.fogonazo?.(boca, dir);
      this.tiros++;
      this.atkT--;
      this.atkP.x += trunc(rsin(this.atkDir) * this.atkVel / 4096);
      this.atkP.z += trunc(rcos(this.atkDir) * this.atkVel / 4096);
      const s = this.snake();
      if (Math.abs(s.x - this.atkP.x) < 5e3 && Math.abs(s.z - this.atkP.z) < 5e3) this.camaraForzada = 45;
    }
    if (++this.atkPaso >= this.w.g[2] + 1 >> 1) this.atkPaso = 1;
  }
  puntoEnRot(p, off) {
    const r = this.rot * ANG;
    return V(p.x + off[0] * Math.cos(r) + off[2] * Math.sin(r), p.y + off[1], p.z - off[0] * Math.sin(r) + off[2] * Math.cos(r));
  }
  Misiles() {
    if (this.atkT === 0 || !(this.pose === 4 && this.poseLista === 1)) {
      if (this.atkT !== 0 && this.atkPaso === 0) return;
      this.ataque = 2;
      this.t.misil = 60;
      return;
    }
    if (this.atkPaso === 0) {
      this.atkP.copy(this.meta);
      if (this.metaAng > 0) {
        this.atkPaso = 1;
        if (++this.tuboL >= 3) this.tuboL = 0;
      } else {
        this.atkPaso = 2;
        if (++this.tuboR >= 3) this.tuboR = 0;
      }
    }
    const t = this.atkT;
    if (t === 110 || t === 100 || t === 80 || t === 60) {
      const L = this.atkPaso === 1, pierna = L ? this.L : this.R, tubo = (L ? TUBOS.L : TUBOS.R)[L ? this.tuboL : this.tuboR];
      const base = matrizHueso(pierna.huesos[1], tubo);
      if (t === 110) {
        const n = L ? this.tapasL : this.tapasR;
        if (n < 3) {
          this.ponerTapa(L ? "L" : "R", "l_hatch" + (n + 2));
          const ang = (L ? TAPA_ANG.L : TAPA_ANG.R).slice();
          ang[1] = L ? n ? 400 : -400 : n ? -400 : 400;
          this.armas.tapa(base.clone().multiply(rotDe(ang)));
          if (L) this.tapasL++; else this.tapasR++;
          this.log("tapa", {
            lado: L ? "L" : "R",
            n: n + 1
          });
        }
      } else {
        const m = base.clone().multiply(rotDe(L ? TAPA_ANG.L : TAPA_ANG.R));
        this.armas.misil(m, () => this.meta, 2);
        this.misilesTirados++;
        this.log("misil", {
          lado: L ? "L" : "R",
          atk: t
        });
      }
    }
    this.atkT--;
  }
  cajaSnake(c, s) {
    const sn = this.snake(), hy = [ 700, 500, 500 ][this.J.postura?.() ?? 0];
    return Math.abs(sn.x - c.x) < s[0] + 300 && Math.abs(sn.z - c.z) < s[2] + 300 && Math.abs(sn.y - c.y) < s[1] + hy;
  }
  "dañarSnake"(daño, aMode, origen) {
    const J = this.J;
    if (J.muerto || this.mgr.gameOverTimer() !== 0) return false;
    const sn = this.snake(), f = sn.clone().sub(origen);
    f.y = 0;
    if (f.lengthSq() < 1) f.set(0, 0, 1);
    f.normalize().multiplyScalar(60);
    if (typeof J.dañoSnake === "function") return J.dañoSnake(daño, aMode, {
      x: f.x,
      z: f.z
    }, sn.clone().multiplyScalar(MM));
    this.A.dañarSnake(daño, "blast");
    return true;
  }
  empujarSnake() {
    const rig = this.J.ctx.rig?.position;
    if (!rig || this.J.muerto) return;
    const w = this.semiPie || 1300, sn = this.snake();
    for (const [lado, pierna] of [ [ "L", this.L ], [ "R", this.R ] ]) {
      if (!this.empuje[lado]) continue;
      const c = aMundo(pierna.huesos[8], [ 0, 0, 0 ]);
      if (Math.abs(sn.y - c.y) > 2 * w + 700) continue;
      const push = (cd, sd, co, so) => {
        const s = sd + so, d = co - cd;
        if (d >= 0) return Math.max(0, s - d);
        return -Math.max(0, d + s);
      };
      const x = push(c.x, w, sn.x, 300);
      if (!x) continue;
      const z = push(c.z, w, sn.z, 300);
      if (!z) continue;
      if (Math.abs(x) <= Math.abs(z)) rig.x += x / 2 * MM; else rig.z += z / 2 * MM;
    }
  }
  Pasos() {
    for (const [bit, pierna] of [ [ 1, this.L ], [ 2, this.R ] ]) {
      const pie = aMundo(pierna.huesos[8], [ 0, 0, 0 ]);
      if (this.sonidos & bit) {
        if (pie.y >= 751) this.sonidos &= ~bit;
        continue;
      }
      if (pie.y >= 751) continue;
      this.sonidos |= bit;
      const fuerte = bit === 1 ? this.pose === 7 || this.pose === 9 : this.pose === 8 || this.pose === 9;
      this.se(fuerte ? SE.PASO_FUERTE : SE.PASO, pie);
      this.J.setRuido?.(255, 16, pie.clone().setY(-32e3).multiplyScalar(MM));
    }
    for (const [pierna, ov] of [ [ this.L, 45 ], [ this.R, 46 ] ]) {
      const m = pierna.motor;
      if (m.action2 !== ov) continue;
      const fr = m.info2.frame;
      if (fr === 0 || fr === 5) this.se(SE.PISA, aMundo(pierna.huesos[fr === 0 ? 12 : 10], [ 0, 0, 0 ]));
    }
    if (this.estado < 3 && this.sonidos & 4 && this.alerta !== 2) {
      this.sonidos &= ~4;
      this.servo += this.mgr.frame & 1 ? 1 : 2;
      if (this.servo >= 6) {
        this.servo = 0;
        this.se(SE.SERVO, aMundo(this.huesos[6], [ 0, 0, 0 ]));
      }
    }
  }
  Nikita() {
    const n = this.A.nikita();
    if (!n) return;
    for (const [obj, off, semi, , hueso] of CAJAS_NIKITA) {
      const h = (obj === "L" ? this.L.huesos : obj === "R" ? this.R.huesos : this.huesos)[hueso];
      if (!h) continue;
      const c = aMundo(h, off), l = aLocal(h, n.p).sub(aLocal(h, c));
      if (Math.abs(l.x) < semi[0] && Math.abs(l.y) < semi[1] && Math.abs(l.z) < semi[2]) {
        this.log("nikita choca", {
          hueso: hueso,
          obj: obj
        });
        const Ar = this.ctx.armas || this.J.ctx.armas;
        if (Ar?.misil) {
          const p = Ar.misil.p.clone();
          Ar.terminarNikita?.(true);
          Ar.explosion?.(p, 128);
        }
        if (this.nivel() !== 0) {
          this.Alerta(2);
          this.meta = this.snake();
        }
        return;
      }
    }
  }
  dentroHangar() {
    const r = this.rot * ANG, c = Math.cos(r), s = Math.sin(r);
    let minX = 32e3, minZ = 32e3, maxX = -32e3, maxZ = -32e3;
    for (const p of PIES_HANGAR) {
      const x = this.mov.x + p[0] * c + p[2] * s, z = this.mov.z - p[0] * s + p[2] * c;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    if (minX < -13e3) this.mov.x += -13e3 - minX;
    if (minZ < -25e3) this.mov.z += -25e3 - minZ;
    if (maxX > 13e3) this.mov.x += 13e3 - maxX;
    if (maxZ > 25e3) this.mov.z += 25e3 - maxZ;
  }
  crearParedes() {
    const n = SEGS.reduce((s, x) => s + x[2].length, 0) + SEGS_PIES.reduce((s, x) => s + x[2].length, 0);
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 18), 3));
    this.paredes = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    }));
    this.paredes.userData.propio = this.paredes.userData.sinColision = true;
    this.paredes.frustumCulled = false;
    this.mgr.mundo.add(this.paredes);
    const P = this.ctx.paredes || this.J.ctx.colParedes?.();
    if (Array.isArray(P)) {
      P.push(this.paredes);
      this.listaParedes = P;
    }
  }
  actualizarParedes() {
    if (!this.paredes) return;
    const a = this.paredes.geometry.attributes.position.array;
    let k = 0;
    const quad = (p, q, y0, y1) => {
      a.set([ p.x, y0, p.z, q.x, y0, q.z, q.x, y1, q.z, p.x, y0, p.z, q.x, y1, q.z, p.x, y1, p.z ].map(v => v * MM), k);
      k += 18;
    };
    for (const [obj, hueso, pts] of SEGS) {
      const h = (obj === "L" ? this.L.huesos : obj === "R" ? this.R.huesos : this.huesos)[hueso];
      if (!h) {
        k += pts.length * 18;
        continue;
      }
      const w = pts.map(p => aMundo(h, p));
      pts.forEach((p, i) => {
        const j = (i + 1) % pts.length;
        quad(w[i], w[j], p[3], p[3] + 2e3);
      });
    }
    for (const [obj, hueso, pts] of SEGS_PIES) {
      const h = (obj === "L" ? this.L.huesos : this.R.huesos)[hueso];
      if (!h) {
        k += pts.length * 18;
        continue;
      }
      const w = pts.map(p => aMundo(h, p));
      pts.forEach((p, i) => {
        const j = (i + 1) % pts.length;
        quad(w[i], w[j], w[i].y, w[i].y + 3e3);
      });
    }
    this.paredes.geometry.attributes.position.needsUpdate = true;
    this.paredes.geometry.computeBoundingSphere();
    this.paredes.geometry.computeBoundingBox();
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, 0, this.mov.z * MM);
    this.o.rotation.y = this.rot * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.mov.y * MM);
    if (this.huesos[0]) this.huesos[0].position.set(0, this.mov.y * MM, 0);
    for (const p of [ this.L, this.R ]) aplicarPose(p.huesos, p.padres, p.motor.rots, p.adjust, null);
    if (this.pitLiqH[0]) aplicarPose(this.pitLiqH, [ -1, 0 ], this.pitLiqRots, null, null);
    if (this.estado >= 3 || this.estado === 5) {
      this.pitT.visible = this.pitU.visible = this.pitLiq.visible = true;
    }
    this.o.updateMatrixWorld(true);
    this.armas.cuadroDibujo?.();
  }
  estadoPrueba() {
    if (!this.listo) return {
      estado: this.estado,
      cargando: true
    };
    return {
      estado: this.estado,
      pose: this.pose,
      pedida: this.posePedida,
      lista: this.poseLista,
      accion: this.motor?.action,
      cuadroAcc: this.motor?.info1.frame,
      mov: [ this.mov.x | 0, this.mov.y | 0, this.mov.z | 0 ],
      rot: this.rot,
      rumbo: this.rumbo,
      alerta: this.alerta,
      tAlerta: this.tAlerta,
      ciego: this.ciego,
      ataque: this.ataque,
      atkT: this.atkT,
      meta: [ this.meta.x | 0, this.meta.z | 0 ],
      metaDist: this.metaDist,
      metaAng: this.metaAng,
      vidaRadomo: this.vidaRadomo,
      vidaLiquid: this.vidaLiquid,
      tGolpe: this.tGolpe,
      radomoClase: this.radomoClase,
      liquidClase: this.liquidClase,
      t: {
        ...this.t
      },
      tiros: this.tiros,
      misiles: this.misilesTirados,
      laseres: this.laseres,
      pisotones: this.pisotones,
      impactos: this.impactos,
      tapas: [ this.tapasL, this.tapasR ],
      barra: this.barras[0] ? [ this.barras[0].rest, this.barras[0].now ] : null
    };
  }
  morir(motivo) {
    if (!this.vivo) return;
    this.log("die", {
      motivo: motivo
    });
    this.guardar();
    this.destruir(true);
  }
  destruir(yaGuardado = false) {
    if (!this.vivo) {
      return;
    }
    if (!yaGuardado) this.guardar();
    this.vivo = false;
    this.blanco = false;
    this.armas?.destruir?.();
    if (this.paredes) {
      this.paredes.removeFromParent();
      this.paredes.geometry.dispose();
      const i = this.listaParedes?.indexOf(this.paredes) ?? -1;
      if (i >= 0) this.listaParedes.splice(i, 1);
      this.paredes = null;
    }
    if (this.grande) {
      const i = this.A.grandes.indexOf(this.grande);
      if (i >= 0) this.A.grandes.splice(i, 1);
      if (this.A.fijado === this.grande.pseudo) this.A.fijado = null;
      this.grande = null;
    }
    this.o?.removeFromParent();
  }
}

function respaldoFase2(mgr, ctx, actorPrevio) {
  const a = {
    tipo: "MGREX",
    nombre: 18260,
    opts: {},
    _respaldo: true,
    mapa: actorPrevio?.mapa
  };
  const j = new MetalGearRex(a, mgr);
  mgr.agregar(j);
  j.cargando = j.iniciar().then(() => {
    j.listo = true;
    return j;
  }).catch(e => {
    console.warn("[rex] fase 2", e);
    j.vivo = false;
  });
  if (ctx.ubicar) ctx.ubicar(10675 * MM, 1080 * MM, -8555 * MM, 2430 * ANG + Math.PI);
  ctx.musica?.(16777219);
}

const QUEJIDOS = [ [ 136, 137, 138, 0 ], [ 132, 133, 135, 0 ] ];

const MG_DEMO1_CUADROS = 240;

const VOZ_GRAY_FOX = 222267;

const MG_DEMO1_ESPERA_VOZ = 240;

export class MgDemo1 extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.A = apoyo(mgr);
    actualR = mgr;
    engancharGuion(this.A.guion);
    this.t = 0;
    this.registro = [];
    this.pedida = false;
    this.sono = false;
    this.tPedida = 0;
    this.espera = 0;
    this.soltoCuadrado = false;
    this.tablas = QUEJIDOS.map(x => x.slice());
    this.cuadAnt = false;
    this._suelta = e => {
      if (e.type === "pointerup" || e.code === "KeyJ") this.soltoCuadrado = true;
    };
    if (typeof addEventListener === "function") {
      addEventListener("keyup", this._suelta);
      addEventListener("pointerup", this._suelta);
    }
  }
  quejido(sonando) {
    let suelta = this.soltoCuadrado;
    this.soltoCuadrado = false;
    const g = ctl.mando(), cuad = !!g?.buttons[ctl.B.CUADRADO]?.pressed;
    if (this.cuadAnt && !cuad) suelta = true;
    this.cuadAnt = cuad;
    if (sonando && suelta && this.espera === 0) {
      const stinger = globalThis.__mgs?.partida?.getL?.(21) ?? 0;
      const tb = this.tablas[stinger > 0 ? 1 : 0], i = randU(2), se = tb[i];
      tb[i] = tb[3];
      tb[3] = se;
      if (se) this.se2(se);
      this.registro.push({
        f: this.mgr.frame,
        t: "quejido",
        se: se
      });
      this.espera = 60;
      return;
    }
    if (this.espera > 0) this.espera--;
  }
  async iniciar() {
    const inv = this.J.ctx.inventario;
    this.armaPrevia = inv?.arma;
    this.itemPrevio = inv?.item;
    if (inv && typeof inv.equiparArma === "function") try {
      inv.equiparArma(4);
    } catch {}
    this.mgr.congelar(true);
    this.A.cine(1e5);
    this.procE = this.procId("e");
    this.registro.push({
      f: this.mgr.frame,
      t: "inicio",
      e: this.procE
    });
  }
  cuadro() {
    this.t++;
    const vs = this.mgr.voicesys, f = this.mgr.flujo;
    if (vs && !this.pedida && vs.code(0) === 0 && vs.g.index1 === 0 && this.mgr.flujo?.estado === -1) {
      vs.g.voxCodes[0] = VOZ_GRAY_FOX;
      vs.g.voxCode2 = VOZ_GRAY_FOX;
      this.mgr.flujo.precargar([ VOZ_GRAY_FOX ]);
    }
    if (vs && !this.pedida && vs.code(0) > 0) {
      this.pedida = true;
      this.tPedida = this.t;
      vs.CE2D0();
      this.registro.push({
        f: this.mgr.frame,
        t: "voz",
        code: vs.code(0)
      });
    }
    if (f && f.estado === 2 && !this.sono) {
      this.sono = true;
      this.registro.push({
        f: this.mgr.frame,
        t: "suena",
        code: f.codigo
      });
    }
    this.quejido(!!f && f.estado === 2);
    if (this.sono) {
      if (f && f.estado !== -1) return;
    } else if (this.pedida ? this.t - this.tPedida < MG_DEMO1_ESPERA_VOZ : this.t < MG_DEMO1_CUADROS) return;
    this.registro.push({
      f: this.mgr.frame,
      t: "fin",
      conVoz: this.sono
    });
    this.mgr.congelar(false);
    const inv = this.J.ctx.inventario;
    if (inv && this.armaPrevia != null && typeof inv.equiparArma === "function") try {
      inv.equiparArma(this.armaPrevia);
    } catch {}
    const p = this.procE;
    this.destruir();
    if (!this.mgr.correrProc(p, [])) respaldoFase2(this.mgr, this.ctx, null);
  }
  morir() {
    this.destruir();
  }
  destruir() {
    if (typeof removeEventListener === "function") {
      removeEventListener("keyup", this._suelta);
      removeEventListener("pointerup", this._suelta);
    }
    if (!this.vivo) return;
    this.vivo = false;
    this.mgr.congelar(false);
    this.A.finCine?.();
  }
}

export const TIPOS_REX = {
  MGREX: MetalGearRex,
  MG_DEMO1: MgDemo1
};

const sel = () => {
  try {
    return new URLSearchParams(globalThis.location?.search || "").get("jefes") || "";
  } catch {
    return "";
  }
};

function sembrarFase2(nv, mgr) {
  const a = nv.actores.find(x => x.tipo === "MGREX" && x.opts?.d);
  if (!a) return;
  const tmp = new MetalGearRex({
    ...a,
    opts: a.opts
  }, mgr);
  tmp.vivo = false;
  tmp.leerOpciones();
  const w = tmp.w;
  guardado = {
    st: nv.id,
    w: {
      ...w,
      d: [ 0, w.d[1], w.d[2], w.d[3], w.d[4], w.d[5] ],
      mov: w.puntos[1].p.slice(),
      turn: w.puntos[1].r.slice(),
      tapasL: 0,
      tapasR: 0,
      tuboL: 0,
      tuboR: 0
    }
  };
}

function crearRex(actor, mgr) {
  const j = new MetalGearRex(actor, mgr);
  mgr.agregar(j);
  j.cargando = j.iniciar().then(() => {
    j.listo = true;
    return j;
  }).catch(e => {
    console.warn("[rex]", e);
    j.vivo = false;
    return null;
  });
  return j;
}

const hayRex = mgr => (mgr?.lista || []).some(j => j.vivo && j instanceof MetalGearRex);

function guionApp(ctx) {
  if (ctx && "guion" in ctx) return null;
  const g = globalThis.__mgs?.guion;
  if (!g || g.__pausado || g.__actualizarOriginal) return null;
  return typeof g.correrProc === "function" && typeof g.cargarEscenario === "function" && g.vars ? g : null;
}

function trasEntrada(g, nv, f, n = 0) {
  const listo = g.st === nv.id && g.fase === "juego" && (g.vars.get("$w:G040e") | 0) >= 1;
  if (listo || n >= 150) {
    if (g.st === nv.id) f(listo);
    return;
  }
  setTimeout(() => trasEntrada(g, nv, f, n + 1), 100);
}

export const PELEA_S17A = {
  elegir: (nv, ctx) => {
    const mgr = ctx.juego.__jefes;
    destruirRex(mgr, "pelea forzada");
    const g = guionApp(ctx);
    if (g) {
      actualR = mgr;
      engancharGuion(g);
      if (sel() === "2") {
        trasEntrada(g, nv, () => {
          destruirRex(mgr, "pelea forzada");
          sembrarFase2(nv, mgr);
          try {
            g.vars.set("$w:G040e", 4);
            g.correrProc(7684);
          } catch (e) {
            console.warn("[rex] ?jefes=2", e);
          }
          setTimeout(() => {
            if (!hayRex(mgr) && g.st === nv.id) respaldoFase2(mgr, ctx, null);
          }, 1500);
        });
      } else {
        guardado = null;
        trasEntrada(g, nv, () => setTimeout(() => {
          if (hayRex(mgr) || g.st !== nv.id) return;
          const a = nv.actores.find(x => x.tipo === "MGREX" && x.opts?.d);
          if (!a) return;
          try {
            if (g.vars.get("$w:G000a") < 255) g.vars.set("$w:G000a", 255);
            g.vars.set("$w:G040e", 1);
          } catch {}
          crearRex({
            ...a,
            forzado: true
          }, mgr);
        }, 2e3));
      }
      return [];
    }
    if (sel() === "2") {
      sembrarFase2(nv, mgr);
      return [ {
        tipo: "MGREX",
        nombre: 18260,
        opts: {},
        forzado: true
      } ];
    }
    guardado = null;
    return nv.actores.filter(a => a.tipo === "MGREX" && a.opts?.d).slice(0, 1).map(a => ({
      ...a,
      forzado: true
    }));
  },
  snake: {
    p: [ 0, 0, 5e3 ],
    rot: 0
  },
  cancion: 1,
  armas: {
    4: 15,
    8: 3
  }
};
