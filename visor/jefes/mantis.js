// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { ArcoPlasma } from "../plasma.js";

import { Jefe, Flujo, MM, ANG, ratan2, randU, randS, nearExp4, nearExp8, nearExp4P, cargarModelo, aplicarPose, rotY } from "./base.js";

import { WP, IT, TIPO_ARMA, TIPO_ITEM } from "../inventario.js";

import * as ctl from "../controles.js";

const idiv = (a, b) => Math.trunc(a / b);

const s16 = v => (v + 32768 & 65535) - 32768;

const rsin = a => Math.round(Math.sin((a & 4095) * ANG) * 4096);

const rcos = a => Math.round(Math.cos((a & 4095) * ANG) * 4096);

const vecDir2 = v => ratan2(v[0], v[2]) & 4095;

const sub3 = (a, b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];

const add3 = (a, b) => [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];

const len3 = v => Math.trunc(Math.hypot(v[0], v[1], v[2]));

const lenVec3 = (v, len, nuevo) => len ? v.map(c => idiv(c * nuevo, len)) : [ 0, 0, 0 ];

const difDirS = (a, b) => {
  let d = b - a & 4095;
  if (d > 2048) d -= 4096;
  return d;
};

const nearExp8V = (from, to, n = 3) => {
  for (let i = 0; i < n; i++) from[i] = nearExp8(from[i], to[i]);
};

const nearExp4V = (from, to, n = 3) => {
  for (let i = 0; i < n; i++) from[i] = nearExp4(from[i], to[i]);
};

const ZERO = () => [ 0, 0, 0 ];

function varGuion(ctx, n) {
  if (ctx.varGuion) return ctx.varGuion(n) ?? 0;
  const g = ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
  try {
    return g?.vars?.get?.(n) ?? 0;
  } catch {
    return 0;
  }
}

const _e = new THREE.Euler, _m = new THREE.Matrix4, _v = new THREE.Vector3;

function rotVec(rot, v) {
  _m.makeRotationFromEuler(_e.set(rot[0] * ANG, rot[1] * ANG, rot[2] * ANG, "YXZ"));
  _v.set(v[0], v[1], v[2]).applyMatrix4(_m);
  return [ Math.trunc(_v.x), Math.trunc(_v.y), Math.trunc(_v.z) ];
}

const putVec = (pos, rot, v) => add3(pos, rotVec(rot, v));

const aV3 = a => new THREE.Vector3(a[0] * MM, a[1] * MM, a[2] * MM);

function alturaEnPlano(q, x, z) {
  const [a, b, c] = q, ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return ny ? a[1] - (nx * (x - a[0]) + nz * (z - a[2])) / ny : a[1];
}

function seMM(j, id, p, modo) {
  j.mgr.se(id, p ? Array.isArray(p) ? aV3(p) : p.clone().multiplyScalar(MM) : null, modo);
}

const deV3 = v => [ Math.round(v.x * 1e3), Math.round(v.y * 1e3), Math.round(v.z * 1e3) ];

export const PSY = {
  SILLA: 19187,
  TORO: 18799,
  LIBRO: 1402,
  LIBRO_A: 1418,
  BUSTO: 64806,
  CUADRO: 33303,
  VASIJA: 55719,
  MERYL: 38386,
  SNAKE: 8650,
  MANTIS: 48009,
  GASEFFECT: 50371
};

const HOVER = [ 1500, 750, 250 ];

export class SalaPsy {
  static de(mgr) {
    if (!mgr.__psy) mgr.__psy = new SalaPsy(mgr);
    return mgr.__psy;
  }
  constructor(mgr) {
    this.mgr = mgr;
    this.objs = [];
    this.alive = {
      silla: 0,
      vasija: 0,
      busto: 0,
      toro: 0,
      cuadro: 0,
      libro: 0
    };
    this.posMantis = [ 0, 0, 0 ];
    this.flagsMantis = 0;
    this.meryl = null;
    this.pausa = false;
    this.padMask = 0;
    this.targetVital = 36;
    mgr.camaraEspecial = () => this.mantis?.vivo && this.mantis.cam || this.meryl?.vivo && this.meryl.cam || null;
  }
  buscar(name) {
    return this.objs.find(o => o.name === name && o.control) || null;
  }
  niveles(p) {
    const hz = this.mgr.J.ctx.hz, g = hz?.grupos?.[this.mgr.grupoHzd ?? 0];
    if (!g) return null;
    let piso = null, techo = null;
    for (const f of g.pisos) {
      const c = f.caja;
      if (p[0] < c[0][0] || p[0] > c[1][0] || p[2] < c[0][2] || p[2] > c[1][2]) continue;
      const q = f.puntos, y = c[0][1] === c[1][1] ? c[0][1] : alturaEnPlano(q, p[0], p[2]);
      if (y <= p[1]) {
        if (piso === null || y > piso) piso = y;
      } else if (techo === null || y < techo) techo = y;
    }
    return {
      piso: piso ?? 0,
      techo: techo
    };
  }
  get flagsMeryl() {
    return this.meryl?.flags ?? 0;
  }
  set flagsMeryl(v) {
    if (this.meryl) this.meryl.flags = v;
  }
  get posMeryl() {
    return this.meryl?.posMeryl || [ -400, 0, 1500 ];
  }
  mensajeMeryl(n) {
    this.meryl?.mensaje?.(18717, n);
  }
  reiniciar() {
    const L = this.mgr.lista;
    for (let i = L.length - 1; i >= 0; i--) {
      const j = L[i], t = j.actor?.tipo || "";
      if (t === "PSYCHOMANTIS" || t === "MEMPSY" || t === "PSYOBJ" || t === "PSYSONIC" || t.startsWith("PSYATAQUE_")) {
        try {
          j.destruir();
        } catch (e) {
          console.warn("[mantis] reiniciar", e);
        }
        L.splice(i, 1);
      }
    }
    this.objs.length = 0;
    this._objs = null;
    for (const k of Object.keys(this.alive)) this.alive[k] = 0;
    this.pausa = false;
    this.pantalla?.apagar();
    this.mantis = null;
    this.padReleaseMeryl = false;
  }
  async precargar(ctx) {
    if (this.modelos) return this.modelos;
    this.modelos = {};
    const carga = async (k, url, f) => {
      try {
        const m = await cargarModelo(ctx, url);
        f?.(m);
        this.modelos[k] = m;
      } catch (e) {
        console.warn("[mantis] modelo", url, e.message);
      }
    };
    await Promise.all([ carga("sonic", "jefes/psysonic.glb", m => m.traverse(x => {
      if (x.isMesh) {
        x.material = x.material.clone();
        x.material.transparent = true;
        x.material.opacity = .55;
        x.material.depthWrite = false;
        x.material.blending = THREE.AdditiveBlending;
      }
    })), carga("bustoRoto", "jefes/busto_roto.glb", m => ctx.teñir?.(m)) ]);
    return this.modelos;
  }
  async asegurarObjs(ctx) {
    if (this._objs) return this._objs;
    this._objs = (async () => {
      await this.precargar(ctx);
      const g = ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
      let nv = ctx.nivel || g?.nivel;
      if (!nv?.actores) {
        try {
          nv = await (await fetch("assets/niveles/s07b/nivel.json")).json();
        } catch {
          nv = null;
        }
      }
      const lista = (nv?.actores || []).filter(a => a.tipo === "PSYOBJ" && !a.evento && !(a.t > 0));
      const nuevos = [];
      for (const a of lista) {
        if (this.objs.some(o => o.name === a.nombre && o.control)) continue;
        const j = new PsyObj(a, this.mgr);
        this.mgr.agregar(j);
        j.cargando = j.iniciar().then(() => {
          j.listo = true;
        }).catch(e => {
          console.warn("[mantis] psyobj", e);
          j.vivo = false;
        });
        nuevos.push(j.cargando);
      }
      await Promise.all(nuevos);
      return this.objs;
    })();
    return this._objs;
  }
}

export class PsyObj extends Jefe {
  se(id, p = null, modo = null) {
    seMM(this, id, p, modo);
  }
  constructor(actor, mgr) {
    super(actor, mgr);
    this.sala = SalaPsy.de(mgr);
    this.nombre = "PSYOBJ";
    this.blanco = false;
    this.c = {
      mov: [ 0, 0, 0 ],
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ],
      height: 0
    };
    this.vivo = true;
    this.cuenta = 0;
    this.radio = -2;
    this.vital = 0;
    this.flagF = 0;
    this.procE = -1;
    this.sizeT = [ 0, 0, 0 ];
    this.sizeA = [ 0, 0, 0 ];
    this.hit = 0;
    this.blancoObj = new THREE.Object3D;
    this.golpeSnake = 0;
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    const v = (k, i = 0, d = 0) => {
      const x = o[k]?.[i];
      return typeof x === "number" ? x : d;
    };
    if (o.c && v("c") !== 0) {
      this.sala.objs.length = 0;
      this.vivo = false;
      return;
    }
    const p = a.p || o.p || [ 0, 0, 0 ], d = a.d || o.d || [ 0, 0, 0 ];
    this.c.mov = [ p[0], p[1], p[2] ].map(x => typeof x === "number" ? x : 0);
    this.c.rot = [ d[0] | 0, d[1] | 0, d[2] | 0 ];
    this.c.turn = this.c.rot.slice();
    const viejo = this.sala.objs.find(x => x.name === a.nombre);
    if (viejo) {
      this.sala.objs.splice(this.sala.objs.indexOf(viejo), 1);
      const va = viejo.actor;
      if (va && va !== this) {
        va.vivo = false;
        va.blanco = false;
        if (va.propio === false) {
          if (va.o) va.o.visible = false;
        } else va.o?.removeFromParent();
      }
    }
    this.obj = {
      name: a.nombre,
      flag: 0,
      pos: this.c.mov.slice(),
      rot: this.c.rot.slice(),
      control: this.c,
      actor: this
    };
    this.sala.objs.push(this.obj);
    if (o.h) {
      this.radio = v("h", 0);
      this.c.height = v("h", 2);
    } else {
      this.radio = -2;
      this.c.height = 0;
    }
    this.obj.flag |= 8;
    if (o.f) {
      const f = i => {
        const x = o.f[i];
        return typeof x === "number" ? x : x && typeof x === "object" && "var" in x ? varGuion(this.ctx, x.var) : 0;
      };
      for (let i = 0; i < 3; i++) {
        const x = f(i);
        if (x) {
          this.flagF |= 1 << i;
          if (i === 0) {
            if (x >= 2) this.obj.flag |= 32768;
            if (x === 3) this.obj.flag |= 256;
          }
        }
      }
      this.vital = f(3);
      if (!f(4)) this.obj.flag &= ~8;
      if (f(5)) this.obj.flag |= 8192;
    }
    if (this.flagF & 1) this.obj.flag |= 32;
    this.sizeT = (o.t || [ 0, 0, 0 ]).map(x => typeof x === "number" ? x : 0);
    this.sizeA = (o.a || [ 0, 0, 0 ]).map(x => typeof x === "number" ? x : 0);
    if (o.x) {
      const n = Math.max(0, this.dificultad());
      this.sala.targetVital = v("x", Math.min(n, o.x.length - 1), 36);
    }
    this.procE = this.procId("e") || -1;
    this.o = this.modeloDelVisor();
    if (!this.o) {
      const url = a.modelo || this.urlModelo();
      if (!url) {
        this.vivo = false;
        return;
      }
      const m = await cargarModelo(this.ctx, url);
      this.o = new THREE.Group;
      this.o.add(m);
      this.mgr.mundo.add(this.o);
      this.ctx.teñir?.(m);
    } else this.propio = false;
    if (this.obj.flag & 256) await this.romperModelo(false);
    this.dibujar();
  }
  urlModelo() {
    const m = this.opts.m?.[0];
    let id = typeof m === "object" && m ? m.id ?? (m.var ? varGuion(this.ctx, m.var) : null) : m;
    if (typeof id !== "number" || !id) id = 60854;
    return (id & 65535) === 46766 ? "jefes/busto_roto.glb" : `niveles/s07b/${(id & 65535).toString(16).padStart(4, "0")}.glb`;
  }
  modeloDelVisor() {
    let hallado = null;
    const a = this.actor, otros = [];
    this.mgr.mundo.traverse(o => {
      const b = o.userData?.actor;
      if (!b || b.tipo !== "PSYOBJ" || b.nombre !== a.nombre) return;
      const p = b.p || [], q = a.p || [];
      if (!hallado && p[0] === q[0] && p[1] === q[1] && p[2] === q[2]) hallado = o; else otros.push(o);
    });
    for (const o of otros) o.visible = false;
    if (hallado) {
      hallado.visible = true;
      hallado.traverse(m => {
        if (m.isMesh) m.userData.psyobj = true;
      });
    }
    return hallado;
  }
  async romperModelo(sonido = true) {
    try {
      let m = this.sala.modelos?.bustoRoto?.clone(true);
      if (!m) {
        m = await cargarModelo(this.ctx, "jefes/busto_roto.glb");
        this.ctx.teñir?.(m);
      }
      const g = new THREE.Group;
      g.add(m);
      this.mgr.mundo.add(g);
      if (this.o) {
        if (this.propio === false) this.o.visible = false; else this.o.removeFromParent();
      }
      this.o = g;
      this.propio = true;
      this.dibujar();
    } catch (e) {
      console.warn("[mantis] busto roto", e.message);
    }
    if (sonido) this.se(184, this.c.mov);
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
          return 0;
        },
        set vital(v) {}
      };
    }
    return this._proxy;
  }
  cuadro() {
    if (!this.o || this.sala.pausa) return;
    const c = this.c, f = this.obj.flag;
    const quieto = !c.step[0] && !c.step[1] && !c.step[2];
    const r = f & 65536 || quieto ? -2 : this.radio;
    c.mov[0] += c.step[0];
    c.mov[2] += c.step[2];
    for (let i = 0; i < 3; i++) c.rot[i] = s16(nearExp4P(c.rot[i], c.turn[i]));
    if (r >= -1) {
      let vy = c.mov[1] + c.step[1];
      const piso = this.J.alturaPiso?.(c.mov[0] * MM, c.mov[2] * MM, (c.mov[1] + 300) * MM);
      if (piso != null && Math.round(piso * 1e3) + c.height > vy) vy = Math.round(piso * 1e3) + c.height;
      c.mov[1] = vy;
    }
    this.cuenta++;
    this.contactoSnake();
    this.recibirTiros();
    this.empuje();
  }
  contactoSnake() {
    const o = this.obj;
    o.flag &= ~128;
    if (this.golpeSnake > 0) this.golpeSnake--;
    if (!(o.flag & 16) || this.J.muerto || this.mgr.gameOverTimer() !== 0 || this.sala.mantis?.padRelease) return;
    const s = this.snakePos(), d = sub3(this.c.mov, s);
    if (len3(d) > 1e3) return;
    const A = this.sizeA;
    if (Math.abs(d[0]) > A[0] + 300 || Math.abs(d[2]) > A[2] + 300 || Math.abs(d[1]) > A[1] + 700) return;
    if (this.golpeSnake > 0) return;
    const explosion = !!(o.flag & 8192);
    this.sala.mantis?.dañarSnake(this.sala.targetVital, explosion);
    this.golpeSnake = 30;
    this.se(37, this.c.mov, "bomba");
    o.flag |= 128;
  }
  snakePos() {
    const s = this.snake();
    return [ s.x, s.y, s.z ];
  }
  recibirTiros() {
    const o = this.obj;
    o.flag &= ~64;
    this.blanco = !!(o.flag & 32);
    const g = this.tomarDaño();
    if (!g || !this.blanco) return;
    const indes = !!(o.flag & 32768);
    if (g.a_mode === 1) {
      this.se(40, this.c.mov);
      this.chispa(aV3(this.c.mov));
      this.se(39, this.c.mov);
      if (!indes) this.vital--;
    } else if (g.a_mode === 2) {
      if (!indes) this.vital -= 255;
    }
    o.flag |= 64;
    if (this.vital > 0 || indes) return;
    o.flag |= 33024;
    this.romperModelo(true);
    this.mgr.chispa(aV3(add3(this.c.mov, [ 0, 500, 0 ])), .8, 10);
    this.registro?.push?.({
      f: this.mgr.frame,
      t: "roto",
      name: o.name
    });
    if (this.procE >= 0) this.mgr.correrProc(this.procE, [ o.flag & 256 ? 1 : 0 ]);
  }
  tiroDeLargo() {
    this.golpes.push({
      cuanto: 64,
      modo: 1,
      frame: this.mgr.frame
    });
  }
  empuje() {
    if (!(this.obj.flag & 2048)) {
      this.hit = 0;
      return;
    }
    this.hit = 0;
  }
  dibujar() {
    if (!this.o) return;
    const c = this.c;
    this.o.position.set(c.mov[0] * MM, c.mov[1] * MM, c.mov[2] * MM);
    this.o.rotation.set(c.rot[0] * ANG, c.rot[1] * ANG, c.rot[2] * ANG, "YXZ");
    this.blancoObj.position.set(c.mov[0] * MM, c.mov[1] * MM - .9, c.mov[2] * MM);
  }
  destruir() {
    if (this.obj) {
      this.obj.pos = this.c.mov.slice();
      this.obj.rot = this.c.rot.slice();
      this.obj.control = null;
    }
    this.vivo = false;
    this.blanco = false;
    if (this.propio === false) {
      const p = this.actor.p || [ 0, 0, 0 ], d = this.actor.d || [ 0, 0, 0 ];
      this.o?.position.set(p[0] * MM, p[1] * MM, p[2] * MM);
      this.o?.rotation.set(d[0] * ANG, d[1] * ANG, d[2] * ANG, "YXZ");
    } else this.o?.removeFromParent();
  }
}

class Ataque {
  constructor(sala, clave) {
    this.sala = sala;
    this.mgr = sala.mgr;
    this.clave = clave;
    this.vivo = true;
    this.listo = true;
    this.barras = [];
    this.actor = {
      tipo: "PSYATAQUE_" + clave
    };
  }
  get alive() {
    return this.sala.alive[this.clave];
  }
  set alive(v) {
    this.sala.alive[this.clave] = v;
  }
  tomar(nombres, quitar, poner) {
    this.obj = [];
    for (const n of nombres) {
      const o = this.sala.buscar(n);
      if (!o) {
        console.warn("[mantis] psyobj no encontrado", n.toString(16));
        return false;
      }
      o.flag &= ~quitar;
      o.flag |= poner;
      this.obj.push(o);
    }
    return true;
  }
  se(id, c) {
    this.mgr.se(id, aV3(c.mov), "bomba");
  }
  cuadro() {
    if (this.alive < 0) {
      this.destruir();
      return;
    }
    if (this.sala.pausa) return;
    this.act();
  }
  destruir(quitar = 24) {
    if (!this.vivo) return;
    this.vivo = false;
    for (const o of this.obj || []) {
      if (!o.control) continue;
      o.flag &= ~(this.quitarAlMorir ?? quitar);
      o.control.step = ZERO();
      o.control.mov = o.pos.slice();
      o.control.turn = o.rot.slice();
    }
    this.alive = 0;
  }
  dibujar() {}
}

const randS16 = () => [ randS(16), randS(16), randS(16) ];

class Sillas extends Ataque {
  constructor(sala) {
    super(sala, "silla");
    this.quitarAlMorir = 98360;
    if (!this.tomar([ 0, 1, 2 ].map(i => PSY.SILLA + i), 3072, 98360)) {
      this.vivo = false;
      return;
    }
    this.think1 = [ 0, 0, 0 ];
    this.think2 = [ 0, 0, 0 ];
    this.time = [ 0, -16, -32 ];
    this.dir = [ 0, 1365, 2730 ];
    this.target = [ ZERO(), ZERO(), ZERO() ];
    this.dist = 960;
    this.alive = 1;
  }
  t() {
    return this.mgr.J.gvTime ?? this.mgr.frame;
  }
  subeBaja(p) {
    const t = this.t() % 64;
    p[1] += idiv((rsin(t * 32) - rsin((t - 1) * 32)) * 240, 4096);
  }
  apuntar(i) {
    const pos = this.sala.posMantis.slice();
    pos[1] = 0;
    this.target[i] = putVec(pos, [ 0, this.dir[i], 0 ], [ 0, 0, this.dist ]);
  }
  act() {
    for (let i = 0; i < 3; i++) {
      const o = this.obj[i], c = o.control, time = this.time[i]++;
      if (this.think1[i] === 0) {
        if (time >= 0) this.think0(o, c, time, i);
      } else if (this.think1[i] === 1) this.think1f(o, c, time, i); else this.think2f(o, c, time, i);
      if (!this.vivo) return;
    }
  }
  think0(o, c, time, i) {
    switch (this.think2[i]) {
     case 0:
      c.mov = o.pos.slice();
      if (time === 48) {
        c.step = ZERO();
        this.think2[i]++;
        break;
      }
      if (time === 0) this.se(178, c);
      c.step = randS16();
      break;

     case 1:
      c.mov[1] = nearExp8(c.mov[1], 2800);
      if (Math.abs(c.mov[1] - 2800) <= 96) {
        c.turn[1] = this.dir[i];
        this.se(186, c);
        this.think2[i]++;
      }
      break;

     case 2:
      {
        this.apuntar(i);
        const vy = c.mov[1];
        nearExp8V(c.mov, this.target[i]);
        c.mov[1] = vy;
        if (Math.abs(c.mov[0] - this.target[i][0]) <= 60 && Math.abs(c.mov[2] - this.target[i][2]) <= 60) this.think2[i]++;
        break;
      }

     case 3:
      this.apuntar(i);
      c.mov[1] = nearExp8(c.mov[1], 1600);
      if (Math.abs(c.mov[1] - 1600) <= 60) {
        this.think2[i] = 0;
        this.think1[i] = 1;
      }
      c.mov[0] = nearExp4(c.mov[0], this.target[i][0]);
      c.mov[2] = nearExp4(c.mov[2], this.target[i][2]);
      this.subeBaja(c.mov);
      break;
    }
  }
  think1f(o, c, time, i) {
    if (i === 0 && this.alive === 2) {
      if (this.think2[0] === 0) {
        this.dist += 36;
        if (this.dist > 3500) this.think2[0] = 1;
      } else {
        this.dist -= 36;
        if (this.dist < 960) this.think2[0] = 0;
      }
    }
    this.subeBaja(c.mov);
    this.apuntar(i);
    c.mov[0] = this.target[i][0];
    c.mov[2] = this.target[i][2];
    if (this.think2[1] + this.think2[2] === 0) {
      this.alive = 2;
      if (i === 0 && this.t() % 16 === 0) this.se(186, c);
      this.dir[i] = this.dir[i] + 64 & 4095;
      c.turn[1] = this.dir[i];
      if (time === 420) {
        this.think2[0] = 0;
        this.think1[0] = this.think1[1] = this.think1[2] = 2;
      }
    }
  }
  think2f(o, c, time, i) {
    this.alive = 1;
    switch (this.think2[i]) {
     case 0:
      c.mov[1] = nearExp8(c.mov[1], 2800);
      if (Math.abs(c.mov[1] - 2800) <= 96) {
        c.turn[1] = o.rot[1];
        this.think2[i]++;
        this.se(186, c);
      }
      break;

     case 1:
      {
        const vy = c.mov[1];
        nearExp8V(c.mov, o.pos);
        c.mov[1] = vy;
        if (Math.abs(c.mov[0] - o.pos[0]) <= 60 && Math.abs(c.mov[2] - o.pos[2]) <= 60) this.think2[i]++;
        break;
      }

     case 2:
      c.mov[1] = nearExp8(c.mov[1], 600);
      if (Math.abs(c.mov[1] - 600) <= 60) {
        c.mov[1] = o.pos[1];
        if (i === 2) this.destruir();
      }
      break;
    }
  }
}

class Vasijas extends Ataque {
  constructor(sala) {
    super(sala, "vasija");
    this.quitarAlMorir = 24;
    if (!this.tomar([ 0, 1 ].map(i => PSY.VASIJA + i), 2048, 24)) {
      this.vivo = false;
      return;
    }
    this.think = [ 0, 0 ];
    this.time = [ 0, 0 ];
    this.step1 = [ 0, 0 ];
    this.step2 = [ 0, 0 ];
    this.which = 0;
    this.count = 0;
    for (const o of this.obj) this.se(188, o.control);
    this.alive = 1;
  }
  hastaPared(o, dir) {
    const from = o.control.mov, to = add3(from, lenVec3(dir, len3(dir), 6e3));
    const h = this.mgr.pared(aV3(from).multiplyScalar(1e3), new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize(), 6e3);
    return h ? Math.trunc(h.dist) : 6e3;
  }
  baja(c, i) {
    const step = this.step2[i] % 16;
    if (++this.step2[i] === 16) {
      c.step[1] = 0;
      c.turn = this.objDe(c).rot.slice();
      return true;
    }
    c.step[1] = idiv((-rcos(step * 256) + rcos((step - 1) * 256)) * 224, 4096);
    if (c.turn[0] > 0) c.turn[0] -= 128;
    return false;
  }
  objDe(c) {
    return this.obj.find(o => o.control === c);
  }
  think0(o, c, time) {
    if (time === 0) c.mov[1] = o.pos[1];
    const ph = time % 16;
    c.step[1] = idiv((-rcos(ph * 256) + rcos((ph - 1) * 256)) * 224, 4096) + 32;
    if (c.turn[0] < 1024) c.turn[0] += 128;
    const s = this.sala.mantis?.snakeMM() || [ 0, 0, 0 ], tmp = sub3(s, c.mov);
    const diff = difDirS(c.rot[1], vecDir2(tmp));
    c.turn[1] += diff > 0 ? Math.min(diff, 96) : Math.max(diff, -96);
    if (time === 16) {
      tmp[1] = 0;
      const len = idiv(this.hastaPared(o, tmp), 384);
      this.step1[this.which & 1] = len;
      c.step = lenVec3(tmp, len3(tmp), 384);
      if (len === 0) {
        c.step = ZERO();
        this.step2[this.which & 1] = 0;
      }
      c.turn[1] = vecDir2(tmp);
      this.se(187, c);
      return true;
    }
    return false;
  }
  think1(o, c) {
    const i = this.which & 1;
    if (this.step1[i] <= 0) {
      if (this.baja(c, i)) return true;
    } else if (--this.step1[i] === 0) {
      this.step2[i] = 0;
      c.step = ZERO();
    }
    if (this.step1[i] < 24 && c.turn[0] > 0) c.turn[0] -= 42;
    if (this.step1[i] < 8) nearExp8V(c.step, [ 0, 0, 0 ]);
    const ph = this.step2[i] % 16;
    c.step[1] = idiv(-rcos(ph * 256) + rcos((ph - 1) * 256), 32);
    return false;
  }
  think3(o, c, time) {
    const diff = sub3(o.pos, c.mov);
    diff[1] = 0;
    const len = len3(diff), i = this.which & 1;
    if (time === 0) {
      this.se(187, c);
      c.turn[1] = vecDir2(diff);
      c.turn[0] = 1024;
      c.step = lenVec3(diff, len, 384);
      this.step1[i] = 0;
    }
    if (this.step1[i] === 0) {
      if (len < 384) {
        c.step = ZERO();
        c.mov = o.pos.slice();
        this.step2[i] = 0;
        this.step1[i]++;
      }
    } else if (this.step1[i] === 1) {
      if (this.baja(c, i)) {
        this.se(188, c);
        c.mov = o.pos.slice();
        return true;
      }
    }
    return false;
  }
  act() {
    const which = this.which & 1;
    for (let i = 0; i < 2; i++) {
      const time = this.time[i], think = this.think[i], o = this.obj[i], c = o.control;
      if (which === i) {
        this.time[i]++;
        switch (think) {
         case 0:
          if (this.think0(o, c, time)) {
            this.time[which] = 0;
            this.think[which]++;
          }
          break;

         case 1:
          if (this.think1(o, c, time)) {
            c.step = ZERO();
            this.time[which] = 0;
            this.think[which]++;
          }
          break;

         case 2:
          if (++this.which >= 5) this.think[which]++; else this.think[which] = 0;
          this.time[which] = 0;
          break;

         case 3:
          if (this.think3(o, c, time)) {
            this.time[which] = 0;
            this.think[which]++;
            this.which++;
          }
          break;

         default:
          if (which === 0) {
            this.destruir();
            return;
          }
        }
      } else if (this.which !== 0 && this.which < 7) {
        const ph = this.count % 32;
        c.step[1] = idiv((-rcos(ph * 128) + rcos((ph - 1) * 128)) * 224, 4096);
      }
    }
    this.count++;
  }
}

class Bustos extends Ataque {
  constructor(sala) {
    super(sala, "busto");
    this.quitarAlMorir = 24;
    if (!this.tomar([ 0, 1 ].map(i => PSY.BUSTO + i), 2048, 24)) {
      this.vivo = false;
      return;
    }
    this.think = [ 0, 0 ];
    this.time = [ 0, 0 ];
    this.step1 = [ 0, 0 ];
    this.step2 = [ 0, 0 ];
    this.count = 0;
    this.alive = 1;
  }
  t0(o, c, time) {
    c.mov = o.pos.slice();
    if (time === 24) {
      c.step = ZERO();
      return true;
    }
    if (time === 0) this.se(188, c);
    c.step = randS16();
    return false;
  }
  t1(o, c, time) {
    const ph = time % 32;
    c.step[1] = idiv(-rcos(ph * 128) + rcos((ph - 1) * 128), 32);
    c.turn[1] = 0;
    if (time >= 16) {
      if (c.turn[0] >= 1024) return true;
      c.turn[0] += 48;
    }
    return false;
  }
  t2(o, c, time, i) {
    if (time === 0) {
      this.se(186, c);
      const x = this.step1[i] = i !== 0 ? 64 : 96;
      const vx = idiv(11522, x >> 1);
      c.step[0] = i !== 0 ? -vx : vx;
    }
    const z = i !== 0 ? 3500 : 5500, step = this.step1[i], mod = time % step, div = idiv(4096, step);
    const ang = rsin(div * mod) - rsin(div * (mod - 1));
    c.step[2] = idiv(z * ang, 4096) + (i !== 0 ? idiv(775, step >> 1) : -idiv(775, step >> 1));
    if (time === step >> 1) {
      c.step = ZERO();
      return true;
    }
    c.turn[1] = vecDir2(c.step);
    return false;
  }
  t3fase0(o, c, time, i) {
    if (time === 0) this.step2[i] = 0;
    const ph = this.step2[i] % 32;
    if (++this.step2[i] === 16) {
      c.step[1] = 0;
      c.turn = o.rot.slice();
      return true;
    }
    c.step[1] = idiv(-rcos(ph * 128) + rcos((ph - 1) * 128), 32);
    if (c.turn[0] > 0) c.turn[0] -= 128;
    return false;
  }
  t3(o, c, time, i) {
    const pos = this.obj[1 - i].pos, to = [ pos[0], 0, pos[2] ], from = [ c.mov[0], 0, c.mov[2] ], dir = sub3(to, from), len = len3(dir);
    if (time === 0) {
      c.step = lenVec3(dir, len, 128);
      this.step1[i] = 0;
    }
    if (this.step1[i] === 0) {
      if (len < 128) {
        c.step[0] = c.step[2] = 0;
      }
      const r = this.t3fase0(o, c, time, i);
      if (len < 128 && r) {
        c.turn = o.rot.slice();
        c.step = ZERO();
        this.step1[i] = 1;
      }
    } else {
      nearExp4V(c.mov, pos);
      if (len3(sub3(pos, c.mov)) < 64) {
        c.mov = pos.slice();
        this.se(188, c);
        return true;
      }
    }
    return false;
  }
  t4() {
    if (this.think[0] !== 4 || this.think[1] !== 4) return false;
    const [a, b] = this.obj;
    this.obj = [ b, a ];
    for (const o of this.obj) {
      o.pos = o.control.mov.slice();
      o.rot = o.control.turn.slice();
    }
    this.obj[0].name = PSY.BUSTO;
    this.obj[1].name = PSY.BUSTO + 1;
    this.time[0] = 0;
    this.think[0]++;
    return true;
  }
  act() {
    for (let i = 0; i < 2; i++) {
      const think = this.think[i], time = this.time[i]++, o = this.obj[i], c = o.control;
      let r = false;
      switch (think) {
       case 0:
        r = this.t0(o, c, time, i);
        break;

       case 1:
        r = this.t1(o, c, time, i);
        break;

       case 2:
        r = this.t2(o, c, time, i);
        break;

       case 3:
        r = this.t3(o, c, time, i);
        break;

       case 4:
        r = this.t4();
        break;

       default:
        if (i === 1) {
          this.destruir();
          return;
        }
      }
      if (r) {
        this.think[i]++;
        this.time[i] = 0;
      }
    }
    this.count++;
  }
}

class Toros extends Ataque {
  constructor(sala) {
    super(sala, "toro");
    this.quitarAlMorir = 100408;
    if (!this.tomar([ 0, 1, 2 ].map(i => PSY.TORO + i), 3072, 98360)) {
      this.vivo = false;
      return;
    }
    this.think1 = [ 0, 0, 0 ];
    this.think2 = [ 0, 0, 0 ];
    this.time = [ 0, -16, -32 ];
    this.dir = [ -256, 0, 256 ];
    this.target = [ ZERO(), ZERO(), ZERO() ];
    this.dist = 960;
    this.turn = 0;
    this.prevTurn = 0;
    this.alive = 1;
  }
  t() {
    return this.mgr.J.gvTime ?? this.mgr.frame;
  }
  subeBaja(p) {
    const t = this.t() % 64;
    p[1] += idiv((rsin(t * 32) - rsin((t - 1) * 32)) * 240, 4096);
  }
  apuntar(i) {
    const pos = this.sala.posMantis.slice();
    pos[1] = 0;
    this.target[i] = putVec(pos, [ 0, this.dir[i] + this.turn, 0 ], [ 0, 0, this.dist ]);
  }
  alto(c, val) {
    c.mov[1] = nearExp8(c.mov[1], val);
    return Math.abs(c.mov[1] - val) <= 60;
  }
  hacia(c, t) {
    const vy = c.mov[1];
    nearExp8V(c.mov, t);
    c.mov[1] = vy;
    return Math.abs(c.mov[0] - t[0]) <= 60 && Math.abs(c.mov[2] - t[2]) <= 60;
  }
  act() {
    for (let i = 0; i < 3; i++) {
      const think = this.think1[i], time = this.time[i]++, o = this.obj[i], c = o.control;
      if (think === 0) {
        if (time >= 0) this.t0(o, c, time, i);
      } else if (think === 1) this.t1(o, c, time, i); else this.t2(o, c, time, i);
      if (!this.vivo) return;
    }
  }
  t0(o, c, time, i) {
    switch (this.think2[i]) {
     case 0:
      c.mov = o.pos.slice();
      if (time === 48) {
        c.step = ZERO();
        this.think2[i]++;
        break;
      }
      if (time === 0) this.se(185, c);
      c.step = randS16();
      break;

     case 1:
      if (this.alto(c, 2e3)) {
        c.turn[1] = this.dir[i] + this.turn;
        this.think2[i]++;
        this.se(186, c);
      }
      break;

     case 2:
      this.apuntar(i);
      if (this.hacia(c, this.target[i])) this.think2[i]++;
      break;

     case 3:
      this.apuntar(i);
      if (this.alto(c, 1600)) {
        this.think2[i] = 0;
        this.think1[i] = 1;
      }
      c.mov[0] = nearExp4(c.mov[0], this.target[i][0]);
      c.mov[2] = nearExp4(c.mov[2], this.target[i][2]);
      break;
    }
  }
  t1(o, c, time, i) {
    if (i === 0 && this.alive === 3) {
      this.dist += 200;
      if (this.dist > 5500) this.think2[0] = 1;
    }
    this.subeBaja(c.mov);
    this.apuntar(i);
    c.mov[0] = this.target[i][0];
    c.mov[2] = this.target[i][2];
    if (this.think2[1] + this.think2[2] !== 0) return;
    if (this.alive < 2) {
      this.alive = 2;
      const s = this.sala.mantis?.snakeMM() || [ 0, 0, 0 ];
      this.turn = vecDir2(sub3(s, this.sala.posMantis));
      this.prevTurn = this.turn;
      this.turn = 0;
      this.se(186, c);
    }
    let diff = difDirS(this.turn, this.prevTurn);
    diff = Math.max(-48, Math.min(48, diff));
    this.turn += diff;
    if ((this.turn & 4095) === (this.prevTurn & 4095)) this.alive = 3;
    if (this.think2[0] === 1) {
      this.think2[0] = 0;
      this.think1[0] = this.think1[1] = this.think1[2] = 2;
    }
  }
  t2(o, c, time, i) {
    this.alive = 1;
    switch (this.think2[i]) {
     case 0:
      if (this.alto(c, 2200)) {
        this.think2[i]++;
        this.se(186, c);
      }
      break;

     case 1:
      if (this.hacia(c, o.pos)) {
        c.turn[1] = o.rot[1];
        this.think2[i]++;
      }
      break;

     case 2:
      if (this.alto(c, o.pos[1])) {
        this.se(185, c);
        c.mov[1] = o.pos[1];
        if (i === 2) this.destruir();
      }
      break;
    }
  }
}

class Cuadros extends Ataque {
  constructor(sala, lado) {
    super(sala, "cuadro");
    this.quitarAlMorir = 32824;
    this.lado = lado;
    if (!this.tomar([ 0, 1, 2 ].map(i => PSY.CUADRO + i), 2048, 32824)) {
      this.vivo = false;
      return;
    }
    this.think = [ 0, 0, 0 ];
    this.time = [ 0, 0, 0 ];
    this.count = 0;
    this.alive = 1;
  }
  gira(c, i) {
    const vx = c.turn[0];
    c.turn[0] = c.turn[0] + 128 + i * 32 & 4095;
    if (c.turn[0] < vx) this.se(181, c);
  }
  act() {
    let total = 0;
    for (let i = 0; i < 3; i++) {
      let think = this.think[i];
      const time = this.time[i], o = this.obj[i], c = o.control;
      if (this.lado === 1 && i === 1) think = 3; else {
        this.time[i]++;
        let r = false;
        if (think === 0) {
          c.mov = o.pos.slice();
          if (time === 0) this.se(180, c);
          if (time === 48) {
            c.step = ZERO();
            r = true;
          } else c.step = randS16();
        } else if (think === 1) {
          if (time === 0) {
            const pos = [ o.pos[0], 750, 3500 ], d = sub3(pos, o.pos);
            c.step = lenVec3(d, len3(d), 128);
            this.se(181, c);
          }
          this.gira(c, i);
          if (time === 68) {
            c.step = ZERO();
            r = true;
          }
        } else if (think === 2) {
          if (time === 0) {
            const d = sub3(o.pos, c.mov);
            c.step = lenVec3(d, len3(d), 128);
          }
          this.gira(c, i);
          if (time === 68) {
            c.mov = o.pos.slice();
            c.turn = o.rot.slice();
            c.step = ZERO();
            this.se(180, c);
            r = true;
          }
        }
        if (r) {
          this.time[i] = 0;
          this.think[i]++;
        }
      }
      total += think;
      if (total === 9) {
        this.destruir();
        return;
      }
    }
    this.count++;
  }
}

class Libros extends Ataque {
  constructor(sala, lado) {
    super(sala, "libro");
    this.quitarAlMorir = 24;
    this.lado = lado;
    const nombres = [];
    for (let i = 0; i < 11; i++) nombres.push(i < 9 ? PSY.LIBRO + i : PSY.LIBRO_A + i - 9);
    if (!this.tomar(nombres, 2048, 24)) {
      this.vivo = false;
      return;
    }
    this.think = new Array(11).fill(0);
    this.time = new Array(11).fill(0);
    this.count = 0;
    this.alive = 1;
  }
  act() {
    let total = 0;
    for (let i = 0; i < 11; i++) {
      let think = this.think[i];
      const time = this.time[i], o = this.obj[i], c = o.control;
      if (this.lado === 0 && c.mov[0] < -4e3 || this.lado === 2 && c.mov[0] > 4e3) think = 3; else {
        this.time[i]++;
        let r = false;
        if (think === 0) {
          c.mov = o.pos.slice();
          if (time === 48) {
            c.step = ZERO();
            r = true;
          } else {
            if (time === 0) this.se(177, c);
            c.step = randS16();
          }
        } else if (think === 1) {
          if (time === 0) {
            this.se(187, c);
            c.step[2] = 256;
          }
          if (time === 32) {
            c.step = ZERO();
            r = true;
          }
        } else if (think === 2) {
          if (time === 0) c.step[2] = -256;
          c.turn[0] += 160;
          if (time === 32) {
            c.mov = o.pos.slice();
            c.turn = o.rot.slice();
            c.step = ZERO();
            this.se(177, c);
            r = true;
          }
        }
        if (r) {
          this.time[i] = 0;
          this.think[i]++;
        }
      }
      total += think;
      if (total === 33) {
        this.destruir();
        return;
      }
    }
    this.count++;
  }
}

const ATAQUES = {
  silla: Sillas,
  vasija: Vasijas,
  busto: Bustos,
  toro: Toros,
  cuadro: Cuadros,
  libro: Libros
};

function nuevoAtaque(sala, clave, arg) {
  if (sala.alive[clave] > 0) return null;
  const a = new ATAQUES[clave](sala, arg);
  if (!a.vivo) return null;
  sala.mgr.agregar(a);
  return a;
}

class Sonic extends Jefe {
  se(id, p = null, modo = null) {
    seMM(this, id, p, modo);
  }
  destruir(...a) {
    for (const p of this.plasmas || []) p.arco.quitar();
    this.plasmas = [];
    return super.destruir(...a);
  }
  constructor(mantis, dir, speed, vital) {
    super({
      tipo: "PSYSONIC",
      opts: {}
    }, mantis.mgr);
    this.mantis = mantis;
    this.sala = mantis.sala;
    this.dir = dir;
    this.speed = speed;
    this.vitalDaño = vital;
    this.state = 0;
    this.time = 0;
    this.count = 128;
    this.size = [ 4096, 4096, 4096 ];
    this.plasmas = [];
    this.c = {
      mov: mantis.manoMM(),
      step: [ 0, 0, 0 ]
    };
    const m = this.sala.modelos?.sonic?.clone(true);
    this.o = new THREE.Group;
    if (m) this.o.add(m);
    this.mgr.mundo.add(this.o);
    this.listo = true;
  }
  cuadro() {
    if (this.sala.pausa) return;
    if (--this.count === 0) {
      this.destruir();
      return;
    }
    const t = this.time++;
    if (this.state === 0) this.fase0(t); else if (this.state === 1) this.fase1(t); else {
      this.destruir();
      return;
    }
    if (t % 4 === 0) this.plasmas.push({
      arco: new ArcoPlasma(this.mgr.mundo, {
        color: 5263440,
        tam: .16,
        ruido: .09
      }),
      t: 0,
      d: (new THREE.Vector3).randomDirection().multiplyScalar(.4)
    });
    const c = aV3(this.c.mov);
    this.plasmas = this.plasmas.filter(p => {
      if (++p.t > 8) {
        p.arco.quitar();
        return false;
      }
      p.arco.actualizar(c, c.clone().add(p.d));
      return true;
    });
  }
  fase0(t) {
    if (this.sala.flagsMantis & 4) {
      this.destruir();
      return;
    }
    if (t === 0) this.se(182, this.c.mov, "bomba");
    this.c.mov = this.mantis.manoMM();
    this.size[0] += 1500;
    this.size[1] += 512;
    this.size[2] += 1500;
    if (t === 23) {
      this.time = 0;
      this.state++;
    }
  }
  fase1(t) {
    if (t === 0) {
      this.se(183, this.c.mov, "bomba");
      const to = this.mantis.cabezaSnakeMM(), d = sub3(to, this.c.mov), v = lenVec3(d, len3(d), this.speed);
      const len = Math.trunc(Math.hypot(v[0], v[2]));
      this.c.step = [ idiv(len * rsin(this.dir), 4096), v[1], idiv(len * rcos(this.dir), 4096) ];
    }
    const ant = this.c.mov.slice();
    this.c.mov = add3(this.c.mov, this.c.step);
    const d = this.c.step, L = len3(d);
    const pared = L ? this.mgr.pared(new THREE.Vector3(...ant), new THREE.Vector3(d[0], d[1], d[2]).normalize(), L, this.mgr.grupoHzd ?? 0, 2) : null;
    const pego = this.pega();
    if (pego || pared) {
      this.mantis.log(pego ? "sonic pega" : "sonic choca", {
        cuadroOnda: t,
        mov: this.c.mov.slice(),
        d: len3(sub3(this.mantis.snakeMM(), this.c.mov))
      });
      this.se(198, this.c.mov, "bomba");
      this.mgr.chispa(aV3(this.c.mov), 1.2, 10, 11197951);
      this.time = 0;
      this.state++;
    }
  }
  pega() {
    const s = this.mantis.snakeMM();
    if (len3(sub3(s, this.c.mov)) > 1e3 || this.sala.flagsMantis & 16 || this.mantis.padRelease || this.J.muerto) return false;
    this.mantis.dañarSnake(this.vitalDaño, true);
    return true;
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.copy(aV3(this.c.mov));
    this.o.rotation.y = this.dir * ANG;
    this.o.scale.set(this.size[0] / 4096, this.size[1] / 4096, this.size[2] / 4096);
  }
}

class PantallaPsy {
  constructor() {
    this.sepia = false;
    this.gas = false;
    this.hideo = null;
    this.cv = null;
    this.t = 0;
    this.img = {};
    this.filtroPrevio = null;
  }
  canvasJuego() {
    return typeof window !== "undefined" && window.__mgs?.R?.domElement || null;
  }
  cargar() {
    for (const n of [ "hideo_b", "hideo_s" ]) {
      const i = new Image;
      i.src = `assets/jefes/${n}.png`;
      this.img[n] = i;
    }
  }
  cuadro(frame) {
    if (frame != null) {
      if (frame === this.ultimo) return;
      this.ultimo = frame;
    }
    this.t++;
    const cv = this.canvasJuego();
    if (cv) {
      let f = "";
      if (this.sepia) f += "sepia(1) ";
      if (this.gas) {
        const k = Math.sin(this.t / 7);
        f += `blur(${(.6 + .4 * k).toFixed(2)}px) hue-rotate(${Math.round(10 * k)}deg) contrast(1.1) `;
      }
      f = f.trim();
      if (this.filtroPrevio === null) this.filtroPrevio = cv.style.filter || "";
      if (cv.style.filter !== (f || this.filtroPrevio)) cv.style.filter = f || this.filtroPrevio;
    }
    this.dibujarHideo();
  }
  dibujarHideo() {
    const h = this.hideo;
    if (!h) {
      if (this.cv) this.cv.style.display = "none";
      return;
    }
    if (!this.cv) {
      this.cv = document.createElement("canvas");
      Object.assign(this.cv.style, {
        position: "fixed",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: "6",
        imageRendering: "pixelated"
      });
      document.body.appendChild(this.cv);
    }
    const cv = this.cv, iw = innerWidth, ih = innerHeight;
    cv.style.display = "";
    if (cv.width !== iw || cv.height !== ih) {
      cv.width = iw;
      cv.height = ih;
    }
    const x = cv.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (h.blanco) {
      x.fillStyle = "#fff";
      x.fillRect(0, 0, iw, ih);
      return;
    }
    x.fillStyle = "#000";
    x.fillRect(0, 0, iw, ih);
    const s = Math.min(iw / 320, ih / 224), ox = (iw - 320 * s) / 2, oy = (ih - 224 * s) / 2;
    const [img, X0, X1, Y0, Y1] = h.t < 64 ? [ this.img.hideo_s, 252, 312, 8, 22 ] : [ this.img.hideo_b, 192, 312, 8, 36 ];
    x.imageSmoothingEnabled = false;
    if (img?.complete && img.naturalWidth) x.drawImage(img, ox + X0 * s, oy + Y0 * s, (X1 - X0) * s, (Y1 - Y0) * s);
  }
  apagar() {
    this.sepia = this.gas = false;
    this.hideo = null;
    const cv = this.canvasJuego();
    if (cv && this.filtroPrevio !== null) cv.style.filter = this.filtroPrevio;
    this.cv?.remove();
    this.cv = null;
  }
}

SalaPsy.prototype.pantallaPsy = function pantallaPsy() {
  if (!this.pantalla) {
    this.pantalla = new PantallaPsy;
    this.pantalla.cargar();
  }
  return this.pantalla;
};

export class Mantis extends Jefe {
  se(id, p = null, modo = null) {
    seMM(this, id, p, modo);
  }
  constructor(actor, mgr) {
    super(actor, mgr);
    this.sala = SalaPsy.de(mgr);
    this.sala.mantis = this;
    this.nombre = "PSYCHOMANTIS";
    this.registro = [];
    this.blanco = false;
    this.c = {
      mov: [ 0, 0, 0 ],
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ],
      height: 0,
      nTouches: 0
    };
    this.pos = [ 0, 0, 0 ];
    this.rotDib = 0;
    this.phase = 0;
    this.nextPhase = -1;
    this.phaseTime = 0;
    this.flagsA = 0;
    this.flagsB = 0;
    this.action = null;
    this.actionTime = 0;
    this.react = null;
    this.reactTime = 0;
    this.sub = 0;
    this.subtime = 0;
    this.tmp = 0;
    this.variant = 0;
    this.shukanCount = 0;
    this.arrived = 0;
    this.moveDir = 1;
    this.speed = 0;
    this.goal = [ 0, 0, 0 ];
    this.hover = 0;
    this.points = [];
    this.attack = 0;
    this.attackAlive = null;
    this.barVital = 0;
    this.hideoOn = 0;
    this.hideoCount = 0;
    this.invuln = 0;
    this.blink = 0;
    this.save = [ 0, 0, 0 ];
    this.saveSpeed = 0;
    this.save2 = [ 0, 0, 0 ];
    this.det = {
      c4: 0,
      claymore: 0,
      granada: 0,
      nikita: 0,
      stinger: 0
    };
    this.detFlag = {
      c4: 0,
      claymore: 0,
      granada: 0,
      nikita: 0,
      stinger: 0
    };
    this.missCount = 0;
    this.kogakuMode = -1;
    this.claseOn = true;
    this.voice = [ 0, 0, 0, 0 ];
    this.proc = [ 0, 0, 0, 0, 0, 0 ];
    this.optF = [ 0, 0, 0, 0 ];
    this.procId = -1;
    this.homing = 1;
    this.oculto = false;
    this.padRelease = false;
    this.cam = null;
    this.blancoObj = new THREE.Object3D;
    this.radio = .33;
    this.alto = 1.85;
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    const val = (x, d = 0) => typeof x === "number" ? x : x && typeof x === "object" && "var" in x ? varGuion(this.ctx, x.var) : x && typeof x === "object" && "id" in x ? x.id : x && typeof x === "object" && "proc" in x ? x.proc : d;
    const lista = k => Array.isArray(o[k]) ? o[k].map(x => val(x)) : null;
    const p = lista("p") || a.p || [ -750, 1500, -1800 ], d = lista("d") || a.d || [ 0, 0, 0 ];
    this.c.mov = [ p[0], p[1], p[2] ];
    this.c.rot = [ d[0], d[1], d[2] ];
    this.c.turn = this.c.rot.slice();
    const lvl = Math.max(0, this.dificultad());
    const X = lista("x") || [ 904, 400, 320, 240, 120 ], Y = lista("y") || [ 24, 36, 48, 72, 44, 224, 64 ];
    const xs = X.length >= 5 * (lvl + 1) ? X.slice(lvl * 5, lvl * 5 + 5) : X.slice(0, 5);
    const ys = Y.length >= 7 * (lvl + 1) ? Y.slice(lvl * 7, lvl * 7 + 7) : Y.slice(0, 7);
    [this.vitalMax, this.u1, this.u2, this.u3, this.u4] = xs;
    [this.dPuño, this.dPatada, this.dBala, this.dOtros, this.dSonic, this.velSonic, this.espera] = ys;
    this.vital = this.vitalMax;
    this.procId = val(o.e?.[0], -1) || -1;
    const ruta = val(o.r?.[0], 0), rt = this.J.ctx.hz?.rutas?.[ruta];
    this.points = rt ? rt.puntos.map(q => [ q.p[0], q.p[1], q.p[2] ]) : [ [ -1e3, 0, -1500 ], [ -5500, 0, -2500 ], [ -7e3, 0, 500 ], [ -3500, 0, 3e3 ], [ 1e3, 0, 3e3 ], [ 4e3, 0, -1500 ], [ 2500, 0, -2500 ], [ -1e3, 0, 0 ] ];
    this.phase = val(o.m?.[0], 0);
    this.phaseTime = 0;
    this.nextPhase = -1;
    this.merylName = val(o.n?.[0], PSY.MERYL);
    if (o.k && val(o.k[0], 0)) this.camuflajeOn();
    if (o.g && val(o.g[0], 0)) this.flagsB |= 32;
    (lista("c") || []).slice(0, 6).forEach((x, i) => {
      this.proc[i] = x;
    });
    (lista("t") || []).slice(0, 4).forEach((x, i) => {
      this.voice[i] = x;
    });
    (lista("f") || []).slice(0, 4).forEach((x, i) => {
      this.optF[i] = x;
    });
    const der = this.vitalMax > 1024 ? [ idiv(15360, this.vitalMax) + 16, idiv(114688, this.vitalMax) + 63, idiv(-32768, this.vitalMax) - 64 & 255 ] : [ 31, 223, 127 ];
    this.barVital = this.vital;
    this.barras = [ {
      y: 28,
      rest: this.vital,
      now: this.vital,
      max: this.vitalMax,
      visible: false,
      conf: {
        nombre: "MANTIS",
        izq: [ 16, 111, 159 ],
        der: der
      }
    } ];
    this.vox = this.sala.voces(this.ctx);
    this.vox.f.precargar(this.voice.filter(v => v > 0));
    await this.sala.asegurarObjs(this.ctx);
    if (this.phase >= 2) SalaPsy.crearMeryl?.(this.mgr);
    await this.cargarCuerpo("jefes/mantis.glb", "psycho");
    this.motor.accion(0, 0);
    this.materiales = [];
    this.modelo.traverse(m => {
      if (m.isMesh) this.materiales.push([ m, m.material ]);
    });
    if (this.mgr.grupoHzd == null) this.mgr.grupoHzd = 0;
    this.piso = this.sala.niveles(this.c.mov)?.piso ?? this.pisoEn(this.c.mov);
    this.c.mov[1] = Math.max(this.c.mov[1], this.piso);
    this.pos = this.c.mov.slice();
    this.rotDib = this.c.rot[1];
    this.camTrack = 7e3;
    this.sala.posMantis = this.c.mov.slice();
    this.ppAntes = this.primeraPersona();
    if (this.kogakuMode === 10) this.aplicarKogaku(true);
    this.log("aparece", {
      fase: this.phase,
      vida: this.vital,
      mov: this.c.mov.slice(),
      dif: lvl
    });
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 800) this.registro.shift();
  }
  get pantalla() {
    return this.sala.pantallaPsy();
  }
  pisoEn(p) {
    const h = this.J.alturaPiso?.(p[0] * MM, p[2] * MM, (p[1] + 500) * MM);
    return h == null ? 0 : Math.round(h * 1e3);
  }
  modo(fn) {
    this.action = fn;
    this.actionTime = 0;
    this.subtime = 0;
    this.sub = 0;
    this.c.turn[0] = 0;
    this.c.turn[2] = 0;
  }
  reaccion(fn) {
    this.react = fn;
    this.reactTime = 0;
    this.subtime = 0;
    this.sub = 0;
    this.c.turn[0] = 0;
    this.c.turn[2] = 0;
    this.flagsA |= 4;
  }
  accion(a) {
    if (this.motor.action !== a) this.motor.accion(a, 4);
  }
  override(a, mask) {
    this.motor.override(a, 4, mask);
  }
  sinOverride() {
    if (this.motor.action2 !== 0) this.motor.override(0, 4, 0);
  }
  snakeMM() {
    const s = this.snake();
    return [ s.x, s.y, s.z ];
  }
  cabezaSnakeMM() {
    const v = new THREE.Vector3;
    if (this.J.ctx.cabeza) {
      this.J.ctx.cabeza(v);
      return deV3(v);
    }
    const s = this.snakeMM();
    return [ s[0], s[1] + 500, s[2] ];
  }
  huesoMM(i) {
    return this.o ? deV3(this.puntoHueso(i)) : this.c.mov.slice();
  }
  manoMM() {
    return this.huesoMM(4);
  }
  cabezaMM() {
    return this.huesoMM(6);
  }
  sePan(id) {
    this.se2(id);
  }
  seMode(id) {
    this.se(id, this.c.mov, "bomba");
  }
  procProgreso(n) {
    if (this.proc[5]) this.mgr.correrProc(this.proc[5], [ n ]);
  }
  mensajeMeryl(n) {
    this.log("mensaje Meryl", {
      n: n
    });
    this.sala.mensajeMeryl(n);
  }
  get flagsMeryl() {
    return this.sala.flagsMeryl;
  }
  set flagsMeryl(v) {
    this.sala.flagsMeryl = v;
  }
  snakeMuerto() {
    return this.J.muerto || this.J.vida <= 0;
  }
  inv() {
    return this.J.ctx.inventario;
  }
  "dañarSnake"(n, explosion) {
    const J = this.J, inv = this.inv();
    if (J.muerto) return;
    J.vida -= n / (inv?.vidaMax || 256);
    J.ctx.daño?.();
    this.log("daño a Snake", {
      n: n,
      explosion: explosion
    });
    if (explosion && !this.tDerribo) {
      this.tDerribo = 30;
      this.mgr.congelar(true);
    }
  }
  congelar(si) {
    this.congelado = si;
    this.mgr.congelar(si || this.tDerribo > 0);
  }
  puerto2() {
    if (this.ctx.puerto2) return !!this.ctx.puerto2();
    try {
      if (localStorage.getItem("sm_puerto2") === "1") return true;
    } catch {}
    const g = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads()[1] : null;
    if (g?.connected) {
      if (g.buttons.some(b => b.pressed) || g.axes.some(x => Math.abs(x) > .5)) this.tPuerto2 = 300;
    }
    if (this.tPuerto2 > 0) {
      this.tPuerto2--;
      return true;
    }
    return false;
  }
  primeraPersona() {
    return !!(this.ctx.primeraPersona?.() ?? this.J.ctx.primeraPersona?.() ?? this.ctx.armas?.ctx?.primeraPersona?.());
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
          return Math.max(1, j.vital);
        },
        get rot() {
          return j.rotDib;
        },
        set vital(v) {}
      };
    }
    return this._proxy;
  }
  actualizarBlanco() {
    this.blanco = this.claseOn && this.blink === 0 && this.vivo && this.phase !== 10;
  }
  cuadro() {
    if (this.sala.pausa && !(this.flagsB & 128)) return;
    this.vox.tick(this.mgr.frame);
    if (this.tDerribo > 0 && --this.tDerribo === 0) this.mgr.congelar(!!this.congelado);
    const m = this.motor;
    m.tick();
    this.actControl();
    this.suavizarPos();
    this.c.height = m.altura;
    this.c.turn[2] = 0;
    this.logica();
    this.golpes.length = 0;
    this.barraVida();
    this.sala.posMantis = this.c.mov.slice();
    this.sala.flagsMantis = this.flagsA;
    this.pantalla.cuadro(this.mgr.frame);
    this.cuadroFundido();
    this.actualizarBlanco();
    const L = this.mgr.lista;
    for (let i = L.length - 1; i >= 0; i--) if (!L[i].vivo && (L[i] instanceof Ataque || L[i] instanceof Sonic)) L.splice(i, 1);
  }
  actControl() {
    const c = this.c;
    c.nTouches = 0;
    const pa = this.motor.paso;
    if (pa[0] || pa[1]) {
      const r = rotY(c.rot[1], {
        x: pa[0],
        y: 0,
        z: pa[1]
      });
      c.step[0] = Math.trunc(r.x);
      c.step[2] = Math.trunc(r.z);
    }
    const L = Math.hypot(c.step[0], c.step[2]);
    if (L > 0) {
      const alt = (this.sala.niveles(c.mov)?.piso ?? this.pisoEn(c.mov)) + HOVER[this.hover];
      const o = new THREE.Vector3(c.mov[0], alt, c.mov[2]);
      const h = this.mgr.pared(o, new THREE.Vector3(c.step[0], 0, c.step[2]).normalize(), L + 300, this.mgr.grupoHzd ?? 0, 2);
      if (h) {
        c.nTouches = 1;
        const k = Math.max(0, h.dist - 300) / L;
        c.step[0] = Math.trunc(c.step[0] * k);
        c.step[2] = Math.trunc(c.step[2] * k);
      }
    }
    c.mov[0] += c.step[0];
    c.mov[2] += c.step[2];
    c.step[0] = c.step[2] = 0;
    for (let i = 0; i < 3; i++) c.rot[i] = s16(nearExp4P(c.rot[i], c.turn[i]));
    let vy = c.mov[1] + c.step[1];
    const n = this.sala.niveles(c.mov);
    this.piso = n ? n.piso : this.pisoEn(c.mov);
    if (this.piso + c.height > vy) vy = this.piso + c.height; else if (n?.techo != null && n.techo - c.height < vy) vy = n.techo - c.height;
    c.mov[1] = vy;
  }
  suavizarPos() {
    const c = this.c;
    if (c.mov[1] < this.piso + c.height) c.mov[1] = this.piso + c.height;
    const scale = this.speed || 96, d = sub3(c.mov, this.pos), len = len3(d);
    if (scale < len) this.pos = add3(this.pos, lenVec3(d, len, scale)); else this.pos = c.mov.slice();
    const diff = difDirS(this.rotDib, c.rot[1]);
    if (Math.abs(diff) > 128) this.rotDib = this.rotDib + (diff > 0 ? 128 : -128) & 4095; else this.rotDib = c.rot[1] & 4095;
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.pos[0] * MM, (this.pos[1] - this.motor.altura) * MM, this.pos[2] * MM);
    this.o.rotation.y = this.rotDib * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.motor.altura * MM);
    this.o.visible = !this.oculto;
    this.blancoObj.position.set(this.c.mov[0] * MM, this.c.mov[1] * MM - .925, this.c.mov[2] * MM);
  }
  logica() {
    this.cambioDeFase();
    if (!this.vivo) return;
    const pt = this.phaseTime;
    if (pt <= 159999) this.phaseTime++;
    const F = [ this.F0_Meryl, this.F1, this.F2_Pelea1, null, this.F4_Pelea2, null, this.F6_Pelea3, null, this.F8_Pelea4, this.F9_Final, this.F10_SnakeMuerto ][this.phase];
    F?.call(this, pt);
    if ((this.mgr.gameOverTimer() !== 0 || this.snakeMuerto() || this.flagsMeryl & 8) && this.phase !== 10) {
      this.phase = 10;
      this.phaseTime = 1;
      this.F10_SnakeMuerto(0);
    }
    this.finDeAtaque();
    if (!(this.flagsB & 4)) this.c.step[1] = Math.max(-32768, this.c.step[1] - 32);
    if (this.flagsA & 4) {
      const t = this.reactTime;
      if (t < 16e3) this.reactTime++;
      this.react?.call(this, t);
    } else {
      const t = this.actionTime;
      if (t < 16e3) this.actionTime++;
      this.action?.call(this, t);
    }
    this.flotar();
    this.leerExplosivos();
  }
  cambioDeFase() {
    if (!(this.flagsB & 16)) return;
    this.flagsB &= ~16;
    if (this.nextPhase < 0) {
      if (this.procId > 0) this.mgr.correrProc(this.procId, [ this.vital ]);
      this.log("se destruye");
      this.alMorir();
      return;
    }
    this.log("fase", {
      de: this.phase,
      a: this.nextPhase,
      vida: this.vital
    });
    this.phase = this.nextPhase;
    this.phaseTime = 0;
  }
  pasarAFase(n) {
    this.nextPhase = n;
    this.flagsB |= 16;
  }
  finDeAtaque() {
    if (this.attackAlive && this.sala.alive[this.attackAlive] <= 0) {
      this.log("fin de ataque", {
        a: this.attackAlive
      });
      this.attackAlive = null;
    }
  }
  flotar() {
    const t = ((this.J.gvTime ?? this.mgr.frame) % 128 + 128) % 128;
    this.c.step[1] += idiv((rsin(t << 5) - rsin(t - 1 << 5)) * 160, 4096);
  }
  invulnOn(n) {
    this.invuln = n & 255;
    this.flagsA |= 2;
    this.claseOn = false;
  }
  invulnOff() {
    this.invuln = 0;
    this.flagsA &= ~2;
    this.flagsB &= ~512;
    this.claseOn = true;
    if (!(this.flagsB & 1)) this.oculto = false;
  }
  invulnTick() {
    if (this.invuln) {
      if (!(this.flagsB & 512)) this.oculto = (this.invuln & 3) === 0;
      this.invuln = this.invuln - 1 & 255;
      if (this.invuln === 0) {
        if (!(this.flagsB & 512)) this.oculto = false;
        this.invulnOff();
      }
    }
    if (this.blink) {
      this.blink--;
      if (this.blink === 0 && !(this.flagsA & 2)) this.claseOn = true;
    }
  }
  camuflajeOn() {
    if (this.kogakuMode === 10) return;
    this.kogakuMode = 10;
    this.aplicarKogaku(true);
  }
  camuflajeOff() {
    if (this.kogakuMode === -1) return;
    this.kogakuMode = -1;
    this.aplicarKogaku(false);
  }
  aplicarKogaku(si) {
    if (!this.materiales) return;
    for (const [m, mat] of this.materiales) {
      if (!si) {
        m.material = mat;
        continue;
      }
      const k = mat.clone();
      k.transparent = true;
      k.opacity = .22;
      k.depthWrite = false;
      if (k.color) k.color = k.color.clone().multiplyScalar(.6);
      m.material = k;
    }
  }
  visibleConTermicos() {
    if (this.kogakuMode === 10) this.oculto = this.inv()?.item !== IT.THERMG;
  }
  mirarASnake() {
    this.c.turn[1] = vecDir2(sub3(this.snakeMM(), this.c.mov));
  }
  mirarAMeryl() {
    this.c.turn[1] = vecDir2(sub3(this.sala.posMeryl, this.c.mov));
  }
  sepia(si) {
    this.pantalla.sepia = si && ![ IT.NVG, IT.THERMG ].includes(this.inv()?.item);
  }
  gasEffect(si) {
    this.pantalla.gas = !!si;
  }
  irA(x, z, s) {
    this.goal = [ x, 0, z ];
    if (s > 0) this.speed = s;
    this.naviNext = this.siguienteNavi();
    this.c.turn[1] = vecDir2(sub3(this.naviNext, this.c.mov));
  }
  siguienteNavi() {
    const J = this.J, goal = this.goal;
    if (!J.zonas?.length || !J.direccion) return goal.slice();
    const pa = aV3(this.c.mov), pb = aV3([ goal[0], this.piso, goal[2] ]);
    pa.y = pb.y = this.piso * MM;
    const za = J.zonaOCercana(pa), zb = J.zonaOCercana(pb);
    if (za < 0 || zb < 0 || za === zb) return goal.slice();
    const n = J.navegar(za, zb, false);
    if (n < 0 || n === zb) return goal.slice();
    const z = J.zonas[n];
    return [ Math.round(z.p.x * 1e3), 0, Math.round(z.p.z * 1e3) ];
  }
  moverNavi() {
    this.naviNext = this.siguienteNavi();
    const d = sub3(this.naviNext, [ this.c.mov[0], 0, this.c.mov[2] ]);
    d[1] = 0;
    const g = sub3(this.goal, [ this.c.mov[0], 0, this.c.mov[2] ]);
    g[1] = 0;
    const s0 = len3(g), len = len3(d);
    this.c.turn[1] = vecDir2(d);
    this.arrived = 0;
    if (s0 < this.speed) {
      this.c.step = g;
      this.arrived = 1;
    } else this.c.step = lenVec3(d, len, this.speed);
    if (this.action === this.A_Desplazar) this.c.turn[1] = this.c.turn[1] + (this.moveDir - 1 << 10) & 4095;
  }
  moverDirecto() {
    const d = sub3([ this.goal[0], 0, this.goal[2] ], [ this.c.mov[0], 0, this.c.mov[2] ]), len = len3(d);
    this.arrived = this.c.nTouches ? 1 : 0;
    if (len < this.speed) {
      this.c.step = d;
      this.arrived = 1;
    } else this.c.step = lenVec3(d, len, this.speed);
    if (this.action === this.A_Desplazar) this.c.turn[1] = this.c.turn[1] + (this.moveDir - 1 << 10) & 4095;
  }
  irAPuntoAlAzar(s) {
    const n = this.points.length;
    if (!n) return;
    let p;
    for (let k = 0; k < 64; k++) {
      p = this.points[randU(32) % n];
      if (p[0] !== this.goal[0] || p[2] !== this.goal[2]) break;
    }
    this.irA(p[0], p[2], s);
  }
  ladoDelDestino() {
    const v = vecDir2(sub3(this.naviNext || this.goal, this.c.mov)) - (this.c.turn[1] & 4095) & 4095;
    if (v < 2048) return v < 256 ? 1 : v < 1281 ? 4 : 3;
    return v < 2816 ? 3 : v < 3841 ? 2 : 1;
  }
  flotarJuntoAMeryl() {
    const pm = this.sala.posMeryl, dir = vecDir2(sub3(this.snakeMM(), pm));
    const p = putVec(pm, [ 0, dir, 0 ], [ 0, 0, -1500 ]);
    this.irA(p[0], p[2], 96);
    this.moverDirecto();
    this.mirarASnake();
  }
  poseLevitar() {
    this.hover = 0;
    this.accion(1);
    if (this.motor.action2 !== 19) this.override(19, 1022);
  }
  siguienteAtaque() {
    const ph = this.phase;
    if (ph === 3) {
      this.modo(this.A_MirarMeryl);
      return;
    }
    if (ph === 8) {
      this.modo(this.A_Invisible);
      return;
    }
    if (ph !== 2 && ph !== 9) return;
    let a = this.attack;
    if (a === 5 && !this.attackAlive) a = 6; else if (a === 6 && !this.attackAlive) a = 7;
    this.attack = a;
    this.modo(this.tablaAtaques()[a]);
  }
  tablaAtaques() {
    return [ this.A_Hideo, this.A_Invisible, this.A_Invisible, this.A_Invisible, this.A_Sillas, this.A_Bustos, this.A_Vasijas, this.A_Toro, this.A_CuadroYLibros, this.A_VasijaBustoToro, this.A_SillaCuadroLibros ];
  }
  abortarObjetos() {
    for (const k of Object.keys(this.sala.alive)) this.sala.alive[k] = -1;
    this.log("aborta objetos");
  }
  ataque(clave, arg) {
    const a = nuevoAtaque(this.sala, clave, arg);
    if (a) this.log("ataque", {
      clave: clave
    });
    return a;
  }
  danio() {
    if (this.flagsA & 2 || this.blink || this.flagsMeryl & 8 || this.snakeMuerto()) {
      this.invulnTick();
      return;
    }
    const g = this.tomarDaño();
    if (!g) return;
    let entra;
    if (this.puerto2()) {
      entra = g.a_mode !== 2;
      if (!entra) this.flagsB |= 4096;
    } else {
      this.missCount++;
      entra = this.missCount === 8;
      if (entra) this.missCount = 0;
    }
    if (!entra && this.optF[0] && g.a_mode !== 2) {
      const b1 = this.sala.objs.find(o => o.name === PSY.BUSTO), b2 = this.sala.objs.find(o => o.name === PSY.BUSTO + 1);
      if (b1 && b2 && b1.flag & 256 && b2.flag & 256) {
        entra = true;
        this.flagsB |= 1024;
      }
    }
    this.sinOverride();
    if (entra) {
      let fn;
      if (g.a_mode === 3) {
        this.seMode(52);
        this.vital -= this.dPuño;
        fn = this.R_Golpe;
      } else if (g.a_mode === 4) {
        this.seMode(53);
        this.vital -= this.dPatada;
        fn = this.R_Patada;
      } else if (g.a_mode === 1) {
        this.vital -= this.dBala;
        fn = this.R_Golpe;
      } else {
        this.vital -= this.dOtros;
        fn = this.R_Patada;
      }
      if (!(this.flagsB & 2)) this.reaccion(fn);
      this.invulnOn(8);
      this.sangre(aV3(this.cabezaMM()));
      this.sePan(136);
      this.log("golpe", {
        a_mode: g.a_mode,
        vida: this.vital,
        puerto2: this.puerto2()
      });
      if (this.vital <= 0 && !this.snakeMuerto() && this.mgr.gameOverTimer() === 0) {
        this.modo(this.A_Muerte);
        this.flagsA &= ~4;
      }
    } else {
      this.invulnOff();
      this.invulnOn(0);
      this.reaccion(this.R_Esquive);
      this.tmp = g.a_mode;
      this.log("esquiva", {
        a_mode: g.a_mode,
        fallos: this.missCount
      });
    }
  }
  elegirAccion() {
    this.flagsB &= ~8192;
    const ph = this.phase;
    let s0 = null;
    const T = this.tablaAtaques();
    if (ph === 2) {
      const a = this.attack;
      if (a === 0) s0 = this.A_Hideo; else if (a >= 1 && a <= 3) {
        this.attack++;
        if (this.attack !== 4) s0 = this.A_Reaparecer; else {
          this.irA(-1e3, -1500, 160);
          s0 = this.A_Desplazar;
          this.camuflajeOff();
          if (!(this.flagsA & 1)) this.shukanCount = 1;
        }
      } else if (a === 5 || a === 6) {
        this.irAPuntoAlAzar(160);
        s0 = this.A_Desplazar;
      } else s0 = this.porDefecto(T);
    } else if (ph === 4 || ph === 6) s0 = this.A_EsperarMeryl0; else if (ph === 8) s0 = this.A_Reaparecer; else {
      if (this.attackAlive) {
        s0 = this.action;
        this.flagsB |= 8192;
      } else {
        this.attack = this.attack === 9 ? 10 : 9;
        s0 = T[this.attack];
      }
    }
    this.modo(s0);
    if (s0 === this.A_Reaparecer) this.flagsB |= 512;
    this.invulnOn(32);
  }
  porDefecto(T) {
    if (this.action === this.A_Desplazar) return this.A_Desplazar;
    if (this.attackAlive) {
      this.flagsB |= 8192;
      return T[this.attack];
    }
    let a = this.attack + 1;
    if (a === 9) a = this.hideoCount < 2 ? 0 : 1;
    if (a === 5 && this.optF[0]) a = 6;
    this.attack = a;
    return a === 1 ? this.A_Reaparecer : T[a];
  }
  quejido(umbral) {
    const ph = this.phase;
    if (ph === 2 && this.u1 >= this.vital) return;
    if (ph === 4 && this.u2 >= this.vital) return;
    this.sePan((this.J.gvTime ?? this.mgr.frame) & 1 ? 134 : 135);
  }
  R_Golpe(t) {
    if (t === 0) {
      this.oculto = false;
      if (this.kogakuMode === 10) this.sub = 1;
      this.camuflajeOff();
      this.flagsB &= ~1;
      this.motor.action = -1;
      this.accion((this.J.gvTime ?? this.mgr.frame) & 1 ? 20 : 21);
      this.invulnOn(0);
      this.c.step = ZERO();
    }
    if (this.motor.isEnd) {
      this.elegirAccion();
      this.flagsA &= ~4;
      if ((this.puerto2() || this.flagsB & 1024) && randS(64) > 0) this.quejido();
    }
  }
  R_Patada(t) {
    if (t === 0) {
      if (this.kogakuMode === 10) this.sub = 1;
      this.camuflajeOff();
      this.oculto = false;
      this.flagsB &= ~1;
      this.accion(24);
      this.invulnOn(0);
      this.c.step = ZERO();
    }
    if (this.motor.isEnd) {
      this.elegirAccion();
      this.flagsA &= ~4;
      if (this.puerto2() && randS(64) >= -15) this.quejido();
    }
  }
  R_Esquive(t) {
    if (t === 0) {
      this.hover = 0;
      this.seMode(199);
      if (!(this.flagsB & 4096)) {
        if (this.missCount === 1 || this.missCount === 3) this.sePan(132); else if (this.missCount === 5) this.sePan(133);
      }
      const lado = ((this.J.gvTime ?? this.mgr.frame) ^ 1) & 1;
      this.sub = lado;
      this.flagsB &= ~4096;
      this.mirarASnake();
      this.c.rot = this.c.turn.slice();
      if (this.tmp === 1) this.balaDeLargo();
      this.tmp = 0;
      this.save = this.goal.slice();
      this.saveSpeed = this.speed;
      this.goal = putVec(this.c.mov, this.c.rot, [ lado ? 1400 : -1400, 0, 0 ]);
      this.speed = 224;
      this.accion(lado ? 10 : 13);
      this.oculto = false;
      this.flagsB &= ~1;
      if (this.kogakuMode === 10) this.subtime = 1;
      this.camuflajeOff();
    }
    this.moverDirecto();
    if (this.arrived) {
      this.goal = this.save.slice();
      this.speed = this.saveSpeed;
      this.elegirAccion();
      this.flagsA &= ~4;
      this.invulnOff();
      this.invulnOn(8);
      this.flagsB |= 512;
    }
  }
  balaDeLargo() {
    const o = aV3(this.c.mov), s = aV3(this.snakeMM()), d = o.clone().sub(s);
    d.y = 0;
    if (d.lengthSq() < 1e-6) return;
    d.normalize();
    const arma = this.inv()?.arma, largo = arma === WP.PSG1 ? 100 : 10;
    let mejor = null, md = largo;
    for (const j of this.mgr.lista) {
      if (!(j instanceof PsyObj) || !j.blanco || !j.vivo) continue;
      const p = aV3(j.c.mov), q = p.clone().sub(o), t = q.dot(d);
      if (t <= 0 || t >= md) continue;
      const lat = q.clone().addScaledVector(d, -t);
      lat.y = 0;
      if (lat.length() > .45) continue;
      mejor = j;
      md = t;
    }
    const mesh = this.J.ctx.balaVisual?.(o.clone(), d.clone());
    if (mesh) {
      let k = 0;
      this.mgr.fx.push({
        t: 0,
        dur: Math.min(20, Math.ceil(md / .75)),
        fn: () => {
          k++;
          mesh.position.copy(o).addScaledVector(d, Math.min(md, k * .75));
        },
        fin: () => mesh.removeFromParent()
      });
    }
    if (mejor) mejor.tiroDeLargo();
    this.log("bala de largo", {
      pega: !!mejor
    });
  }
  barraVida() {
    const b = this.barras[0];
    if (!b) return;
    b.visible = !!(this.flagsB & 32);
    const now = Math.max(0, this.vital);
    let rest = this.barVital;
    if (rest < now) rest = now;
    b.rest = rest;
    b.now = now;
    b.max = this.vitalMax;
    const d = rest - now;
    if (d > 0) this.barVital = d < 64 ? this.barVital - d : this.barVital - 64;
  }
  alLanzarGranada(g) {
    this.granadaPendiente = g;
  }
  leerExplosivos() {
    const A = this.ctx.armas;
    if (!A) return;
    const disparos = {
      c4: false,
      claymore: false,
      granada: false,
      nikita: false,
      stinger: false
    };
    const nC4 = A.c4?.length || 0, nMinas = (A.minas || []).filter(m => m.propia).length;
    if (nC4 > (this.ultC4 ?? nC4)) disparos.c4 = true;
    if (nMinas > (this.ultMinas ?? nMinas)) disparos.claymore = true;
    if (this.granadaPendiente) {
      disparos.granada = true;
      this.granadaPendiente = null;
    }
    if (A.misil && !this.ultNikita) disparos.nikita = true;
    if (A.misilS?.length) disparos.stinger = true;
    this.ultC4 = nC4;
    this.ultMinas = nMinas;
    this.ultNikita = !!A.misil;
    if (this.sala.pausa || this.flagsA & 16 || this.padRelease) return;
    if (this.phase === 0) {
      for (const k in this.detFlag) this.detFlag[k] = 0;
      return;
    }
    for (const k of Object.keys(this.det)) {
      if (disparos[k] && this.det[k] === 0) {
        this.det[k] = 1;
        this.sePan(132);
      }
      if (this.det[k] !== 0 && ++this.det[k] === 20) {
        this.det[k] = 0;
        this.blink = 8;
        this.claseOn = false;
        this.detonar(k, A);
      }
    }
  }
  detonar(k, A) {
    this.log("lee la mente", {
      arma: k
    });
    if (k === "c4" && A.c4?.length) A.detonando = 1; else if (k === "claymore") {
      for (const m of (A.minas || []).filter(x => x.propia && !x.disparada)) A.dispararMina(m);
    } else if (k === "granada") {
      for (const g of A.granadas || []) g.espoleta = 1;
    } else if (k === "nikita" && A.misil) A.terminarNikita(true); else if (k === "stinger") this.explotarStingers(A);
  }
  explotarStingers(A) {
    for (const m of (A.misilS || []).splice(0)) {
      m.obj?.removeFromParent();
      A.explosion(m.p.clone());
    }
  }
  matarMisiles() {
    const A = this.ctx.armas;
    if (!A) return;
    if (A.misil) A.terminarNikita(false);
    if (A.misilS?.length) this.explotarStingers(A);
  }
  sacarArmas() {
    const inv = this.inv();
    if (!inv) return;
    if (inv.item >= 0 && TIPO_ITEM[inv.item] & 2) inv.item = -1;
    if (inv.arma >= 0 && TIPO_ARMA[inv.arma] & 512) inv.arma = -1;
  }
  shukanCuenta() {
    const n = this.shukanCount;
    if (n === 0) return;
    if (n > 0) {
      this.shukanCount--;
      if (this.shukanCount !== 0 || this.flagsA & 1) return;
      if (!(this.flagsB & 1)) this.oculto = false;
      this.sepia(false);
      this.gasEffect(false);
      this.log("shukan off");
    } else {
      this.shukanCount++;
      if (this.shukanCount !== 0 || !(this.flagsA & 1)) return;
      this.oculto = true;
      this.sepia(true);
      this.gasEffect(true);
      this.log("shukan on");
    }
  }
  psyShukan() {
    this.shukanCuenta();
    const pp = this.primeraPersona(), apreto = pp && !this.ppAntes;
    this.ppAntes = pp;
    if (!(this.flagsA & 1)) {
      const A = this.ctx.armas, inv = this.inv();
      const arma = inv?.arma ?? -1, item = inv?.item ?? -1;
      if (apreto && !A?.misil && !(arma >= 0 && TIPO_ARMA[arma] & 512) && !(item >= 0 && TIPO_ITEM[item] & 2)) {
        this.flagsA |= 1;
        this.sala.padMask |= 65519;
        this.shukanCount = -1;
        this.congelar(true);
        this.log("psy shukan on");
      }
      if (this.shukanCount === 0) this.oculto = !!(this.flagsB & 1);
      return;
    }
    if ((this.J.gvTime ?? this.mgr.frame) % 45 === 0) this.se2(114);
    const cab = this.cabezaMM();
    cab[1] += 480;
    const yaw = vecDir2(sub3(this.snakeMM(), this.c.mov));
    this.cam = this.camaraAngulos(cab, yaw, 360, true);
    if (!pp) {
      this.flagsA &= ~1;
      this.sala.padMask &= ~65519;
      this.cam = null;
      this.shukanCount = 1;
      this.congelar(false);
      this.log("psy shukan off");
    }
    if (this.shukanCount === 0) this.oculto = true;
  }
  camaraAngulos(pos, vy, vx, verSnake = true) {
    const p = aV3(pos), a = vy * ANG, b = vx * ANG;
    const d = new THREE.Vector3(Math.sin(a) * Math.cos(b), -Math.sin(b), Math.cos(a) * Math.cos(b));
    return {
      pos: p,
      mira: p.clone().add(d),
      verSnake: verSnake
    };
  }
  camaraEntre(A, B, dist, dy = 0, vx = 0) {
    const a = [ A[0], B[1], A[2] ], d = sub3(a, B), off = lenVec3(d, len3(d), dist), pos = sub3(a, off);
    pos[1] += dy;
    this.cam = this.camaraAngulos(pos, vecDir2(d), vx);
  }
  camaraDesde(B, dist, y, vx = 0) {
    const d = sub3([ 0, 0, 0 ], B), off = lenVec3([ d[0], 0, d[2] ], len3([ d[0], 0, d[2] ]), dist), pos = [ B[0] + off[0], y, B[2] + off[2] ];
    this.cam = this.camaraAngulos(pos, vecDir2(sub3(B, pos)), vx);
  }
  camaraSeguir(p, dist) {
    const s = this.snakeMM(), d = sub3([ s[0], p[1], s[2] ], p), off = lenVec3(d, len3(d) || 1, dist), pos = add3(p, off);
    pos[1] = p[1] + 600;
    this.cam = {
      pos: aV3(pos),
      mira: aV3(p),
      verSnake: true
    };
  }
  cine(si) {
    this.mgr.hud.cine = si ? 1 : 0;
  }
  F0_Meryl(t) {
    if (t === 0) {
      this.modo(this.A_EsperarMeryl);
      this.procProgreso(1);
    }
    this.psyShukan();
    if ((this.flagsMeryl & 4104) === 4096 && this.mgr.gameOverTimer() === 0) {
      this.pasarAFase(1);
      this.modo(this.A_FinMeryl);
      this.flagsA |= 16;
    }
  }
  F1() {
    this.psyShukan();
  }
  F2_Pelea1(t) {
    if (t === 0) this.modo(this.A_Hideo);
    this.psyShukan();
    this.danio();
    if (this.u1 < this.vital) return;
    this.padRelease = true;
    if (this.flagsA & 4) return;
    this.pasarAFase(3);
    this.abortarObjetos();
    this.modo(this.A_Escena3);
    this.flagsA |= 16;
  }
  F4_Pelea2(t) {
    if (t === 0) {
      this.mensajeMeryl(4);
      this.modo(this.A_EsperarMeryl);
      this.procProgreso(1);
    }
    this.danio();
    this.psyShukan();
    if (!(this.flagsMeryl & 4096) && this.u2 < this.vital) return;
    this.padRelease = true;
    if (this.flagsA & 4) return;
    if (!(this.flagsMeryl & 2048)) this.mensajeMeryl(8);
    if (this.vital < this.u2) this.vital = this.u2;
    this.pasarAFase(5);
    this.modo(this.A_Escena5);
    this.flagsA |= 16;
  }
  F6_Pelea3(t) {
    if (t === 0) {
      this.modo(this.A_EsperarMeryl);
      this.procProgreso(2);
    }
    this.psyShukan();
    this.danio();
    if (!(this.flagsMeryl & 2048) && this.u3 < this.vital) return;
    this.padRelease = true;
    if (this.flagsA & 4) return;
    if (!(this.flagsMeryl & 2048)) this.mensajeMeryl(8);
    if (this.vital < this.u3) this.vital = this.u3;
    this.pasarAFase(7);
    this.modo(this.A_Escena7);
    this.flagsA |= 16;
  }
  F8_Pelea4(t) {
    if (t === 0) {
      if (this.u3 < this.vital) {
        this.vital = this.u3;
        this.barVital = this.u3;
      }
      this.modo(this.A_Reaparecer);
      this.invulnOff();
      this.attack = 1;
      this.procProgreso(3);
    }
    this.psyShukan();
    this.danio();
    if (t < 32 && !(this.flagsA & 1)) this.camaraSeguir(this.c.mov, 3200); else if (t === 32 && !(this.flagsA & 1)) this.cam = null;
    if (this.u4 >= this.vital && !(this.flagsA & 4)) {
      this.pasarAFase(9);
      this.camuflajeOff();
      if (!(this.flagsA & 1)) {
        this.oculto = false;
        this.shukanCount = 1;
      }
      this.irA(-500, -1250, 160);
      this.invulnOff();
      this.modo(this.A_Desplazar);
      this.attack = 9;
      this.procProgreso(4);
    }
    this.psyShukan();
  }
  F9_Final() {
    this.psyShukan();
    this.danio();
  }
  F10_SnakeMuerto(t) {
    if (t !== 0) return;
    this.cine(false);
    this.cam = null;
    this.shukanCount = 1;
    this.flagsA &= ~4;
    this.modo(this.A_Quieto);
    this.sepia(false);
    this.gasEffect(false);
    this.congelar(false);
    this.log("fase 10 (Snake muerto / Meryl muerta)");
  }
  A_Quieto(t) {
    if (t === 0) {
      this.sinOverride();
      this.accion(1);
      this.hover = 0;
    }
  }
  A_FinMeryl(t) {
    if (t === 0) {
      this.padRelease = true;
      this.congelar(true);
    }
    if (t === 48 && !this.snakeMuerto() && this.mgr.gameOverTimer() === 0) {
      this.flagsA &= ~16;
      this.mensajeMeryl(-1);
    }
  }
  A_EsperarMeryl0(t) {
    if (t === 0) {
      this.poseLevitar();
      this.flagsB &= ~1;
    }
    this.flotarJuntoAMeryl();
    if (this.flagsMeryl & 4) return;
    this.sinOverride();
    this.modo(this.A_EsperarMeryl);
  }
  A_EsperarMeryl(t) {
    if (t === 0) {
      this.hover = 0;
      this.accion(1);
      this.flagsB &= ~1;
    }
    this.flotarJuntoAMeryl();
    if (!(this.flagsMeryl & 4)) return;
    const ph = this.phase;
    if (ph === 0) this.modo(this.A_EsperarMeryl0); else if (ph === 4 || ph === 6) {
      this.attack = 1;
      this.modo(this.A_Sonic);
    } else {
      this.irAPuntoAlAzar(160);
      this.modo(this.A_Desplazar);
    }
  }
  A_Desplazar(t) {
    if (t === 0) {
      this.hover = 0;
      this.sinOverride();
      this.moveDir = this.ladoDelDestino();
      this.accion({
        1: 2,
        2: 11,
        3: 5,
        4: 8
      }[this.moveDir] ?? 11);
      this.sub = 0;
      if (!(this.flagsB & 1)) this.seMode(200);
    }
    if (t >= 25) this.speed += 4;
    if (this.phase === 8) this.oculto = true;
    if (this.sub === 0) {
      if (this.motor.isEnd) {
        this.accion(this.motor.action + 2);
        this.sub = 1;
      }
    } else {
      if (this.sub === 1) {
        this.moverNavi();
        if (this.arrived || this.actionTime >= 180) {
          this.accion(this.motor.action - 1);
          this.sub = 2;
        }
      }
      if (this.motor.isEnd) this.siguienteAtaque();
    }
    this.c.step[1] += this.flagsB & 4 ? 2 : 34;
    if (this.phase === 3) this.camaraSeguir(this.c.mov, 3200);
    this.visibleConTermicos();
  }
  inicioAtaque(t, crear, destino, vel, girar = false) {
    if (t !== 0) return;
    if (!this.attackAlive && !(this.flagsB & 8192)) {
      this.sePan(129);
      crear();
    }
    this.arrived = 0;
    if (destino) this.irA(destino[0], destino[1], vel);
    this.poseLevitar();
    if (girar) this.c.turn[1] = 0;
    this.procProgreso(4);
    this.flagsB &= ~1;
  }
  llegarYLanzar(mover = "directo", hover1 = false) {
    if (this.sub !== 0 || this.arrived) return;
    if (mover === "navi") this.moverNavi(); else this.moverDirecto();
    if (!this.arrived) return;
    if (hover1) this.hover = 1;
    this.sinOverride();
    this.accion(18);
    this.sub = 1;
  }
  A_Sillas(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.flagsB & 8192)) {
        this.tmp = 0;
        this.sePan(129);
        if (this.ataque("silla")) this.attackAlive = "silla";
      }
      this.poseLevitar();
      this.procProgreso(4);
      this.flagsB &= ~1;
    }
    this.mirarASnake();
    const giran = this.sala.alive.silla === 2;
    if (this.tmp === 0) {
      if (giran) {
        this.irA(-1e3, 2e3, 32);
        this.tmp++;
      }
    } else if (this.tmp === 1) {
      this.moverDirecto();
      if (this.arrived) {
        this.irA(-1e3, -1500, 32);
        this.tmp++;
      }
    } else if (this.tmp === 2) {
      this.moverDirecto();
      if (this.arrived) {
        this.irA(-1e3, 2e3, 32);
        this.tmp = 1;
      }
    }
    if (!this.attackAlive) {
      this.tmp = 0;
      this.flagsB &= ~8192;
      if (!this.optF[0]) {
        this.attack = 5;
        this.modo(this.A_Bustos);
      } else {
        this.attack = 6;
        this.modo(this.A_Vasijas);
      }
    }
    if (!giran) this.c.step = ZERO();
  }
  A_Bustos(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.flagsB & 8192)) {
        this.sePan(129);
        if (this.ataque("busto")) this.attackAlive = "busto";
        this.irA(-1e3, -1500, 96);
      }
      this.procProgreso(4);
      this.arrived = 0;
      this.poseLevitar();
      this.flagsB &= ~1;
    }
    this.llegarYLanzar();
    this.mirarASnake();
    if (!this.attackAlive) {
      this.attack = 6;
      this.modo(this.A_Vasijas);
      this.attackAlive = null;
      this.flagsB &= ~8192;
    }
  }
  A_Vasijas(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.flagsB & 8192)) {
        this.sePan(129);
        if (this.ataque("vasija")) this.attackAlive = "vasija";
        this.irA(-1e3, -1500, 96);
      }
      this.arrived = 0;
      this.poseLevitar();
      this.procProgreso(4);
      this.flagsB &= ~1;
    }
    this.mirarASnake();
    this.llegarYLanzar();
    if (!this.attackAlive) {
      this.attack = 7;
      this.flagsB &= ~8192;
      this.sinOverride();
      this.modo(this.A_Toro);
      this.attackAlive = null;
    }
  }
  A_Toro(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.flagsB & 8192)) {
        this.sePan(129);
        if (this.ataque("toro")) this.attackAlive = "toro";
      }
      this.arrived = 0;
      this.irA(0, 500, 96);
      this.poseLevitar();
      this.c.turn[1] = 0;
      this.procProgreso(4);
      this.flagsB &= ~1;
    }
    this.mirarASnake();
    this.llegarYLanzar("navi", true);
    if (!this.attackAlive) {
      this.attack = 8;
      this.attackAlive = null;
      this.flagsB &= ~8192;
      this.sinOverride();
      this.variant = randU(64) % 3;
      this.irA([ -5e3, 4e3, -500 ][this.variant], -1250, 160);
      this.modo(this.A_Desplazar);
      this.sinOverride();
    }
  }
  A_CuadroYLibros(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.sala.alive.libro > 0) && !(this.flagsB & 8192)) {
        this.sePan(129);
        const c = this.ataque("cuadro", this.variant);
        this.ataque("libro", this.variant);
        if (c) this.attackAlive = "cuadro";
      }
      this.arrived = 0;
      this.irA([ -5e3, 4e3, -500 ][this.variant] ?? -500, -1250, 96);
      this.poseLevitar();
      this.c.turn[1] = 0;
      this.procProgreso(4);
      this.flagsB &= ~1;
    }
    this.mirarASnake();
    this.llegarYLanzar("directo", true);
    if (!this.attackAlive) {
      this.variant = 0;
      this.flagsB &= ~8192;
      this.sinOverride();
      this.attackAlive = null;
      if (this.hideoCount < 2) {
        this.attack = 0;
        this.modo(this.A_Hideo);
      } else {
        this.attack = 1;
        this.modo(this.A_Reaparecer);
      }
    }
  }
  A_VasijaBustoToro(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.flagsB & 8192)) {
        this.sePan(129);
        const v = this.ataque("vasija");
        if (!this.optF[0]) this.ataque("busto");
        this.ataque("toro");
        if (v) this.attackAlive = "vasija";
      }
      this.arrived = 0;
      this.flagsB &= ~1;
      this.irA(-500, -1250, 96);
      this.poseLevitar();
      this.oculto = false;
    }
    this.mirarASnake();
    this.llegarYLanzar();
    if (!this.attackAlive) {
      this.attack = 10;
      this.flagsB &= ~8192;
      this.sinOverride();
      this.modo(this.A_SillaCuadroLibros);
    }
  }
  A_SillaCuadroLibros(t) {
    if (t === 0) {
      if (!this.attackAlive && !(this.flagsB & 8192)) {
        this.sePan(129);
        const s = this.ataque("silla");
        this.ataque("cuadro", 1);
        this.ataque("libro", 1);
        if (s) this.attackAlive = "silla";
      }
      this.arrived = 0;
      this.flagsB &= ~1;
      this.irA(-500, -1250, 96);
      this.poseLevitar();
    }
    this.mirarASnake();
    this.llegarYLanzar();
    if (!this.attackAlive) {
      this.attack = 9;
      this.flagsB &= ~8192;
      this.sinOverride();
      this.modo(this.A_VasijaBustoToro);
    }
  }
  A_Sonic(t) {
    if (t === 0) {
      this.accion(15);
      this.mirarASnake();
      this.mgr.agregar(new Sonic(this, this.c.turn[1], this.velSonic, this.dSonic));
      this.procProgreso(3);
      this.flagsB &= ~1;
      this.log("sonic");
    }
    if (t === 23) this.sePan(130);
    if (!this.motor.isEnd) return;
    const ph = this.phase;
    this.attack++;
    if (ph === 2) {
      if (this.attack === 4) {
        this.irA(-1e3, -1500, 160);
        this.modo(this.A_Desplazar);
      } else this.modo(this.A_Reaparecer);
    } else if (ph === 4 || ph === 6) this.modo(this.A_EsperarMeryl0); else if (ph === 8) this.modo(this.A_Reaparecer);
  }
  A_Invisible(t) {
    if (t === 0) {
      this.homing = 1;
      this.accion(1);
      this.flagsB |= 1;
      if (this.phase === 2) this.sePan(128);
      this.procProgreso(3);
    }
    this.visibleConTermicos();
    this.mirarASnake();
    if (t === this.espera) this.modo(this.A_Parpadeo);
  }
  A_Parpadeo(t) {
    if (t === 0) {
      this.accion(1);
      this.procProgreso(3);
    }
    this.oculto = !((this.J.gvTime ?? this.mgr.frame) & 1);
    if (t === 16) {
      this.flagsB &= ~1;
      this.camuflajeOff();
      if (!(this.flagsA & 1)) this.shukanCount = 1;
      this.oculto = false;
      this.modo(this.A_Sonic);
    }
  }
  A_Reaparecer(t) {
    if (t === 0) {
      this.accion(1);
      this.camuflajeOn();
      this.flagsB |= 1;
      this.invulnOn(0);
      this.procProgreso(3);
    }
    this.oculto = !((this.J.gvTime ?? this.mgr.frame) & 1);
    if (t === 16) {
      this.seMode(179);
      this.oculto = true;
      this.irAPuntoAlAzar(160);
      this.modo(this.A_Desplazar);
      this.flagsB |= 512;
      this.invulnOn(24);
      this.homing = 0;
    }
  }
  A_Hideo(t) {
    if (t === 0) {
      this.accion((this.J.gvTime ?? this.mgr.frame) & 1 ? 16 : 17);
      this.flagsB &= ~1;
      this.invulnOff();
      this.invulnOn(0);
      this.sePan(141);
      this.log("hideo", {
        n: this.hideoCount
      });
    }
    this.mirarASnake();
    if (this.sub === 0) {
      if (!this.motor.isEnd) return;
      this.accion(1);
      this.irAPuntoAlAzar(160);
      this.hideoOn = 1;
      this.sub = 1;
      this.c.mov[0] = this.goal[0];
      this.c.mov[2] = this.goal[2];
      this.pos = this.c.mov.slice();
      this.sala.pausa = true;
      this.flagsB |= 128;
      this.congelar(true);
      this.ctx.musica?.(33554182);
      return;
    }
    if (this.sub !== 1) return;
    const dur = this.hideoCount ? 128 : 256, fin = this.hideoCount ? 127 : 255;
    this.pantalla.hideo = {
      t: this.subtime,
      blanco: this.subtime === 0 || this.subtime === fin
    };
    if (this.subtime === 0) this.abortarObjetos();
    if (++this.subtime !== dur) return;
    this.invulnOff();
    this.hideoOn = 0;
    this.attack = 1;
    this.hideoCount++;
    this.camuflajeOn();
    this.flagsB |= 1;
    this.oculto = true;
    this.sala.pausa = false;
    this.pantalla.hideo = null;
    this.congelar(false);
    this.modo(this.A_Invisible);
    this.ctx.musica?.(33554179);
    this.flagsB &= ~128;
  }
  A_Muerte(t) {
    if (t === 0) {
      this.abortarObjetos();
      this.ctx.musica?.(33554182);
      for (const k in this.detFlag) this.detFlag[k] = 0;
      this.flagsA |= 16;
      this.padRelease = true;
      this.congelar(true);
      this.flagsB &= ~8;
      this.invulnOn(0);
      this.camuflajeOff();
      this.gasEffect(false);
      this.sepia(false);
      this.oculto = false;
      this.accion(22);
      this.sePan(137);
      const a = [ this.c.mov[0], 1500, this.c.mov[2] ], s = this.snakeMM(), b = [ s[0], 1500, s[2] ], d = sub3(a, b);
      this.save = sub3(a, lenVec3(d, len3(d), 1500));
      this.c.step = ZERO();
      this.log("muere");
    }
    if (this.motor.altura < 1e3) this.hover = 1;
    if (this.motor.altura < 500) this.hover = 2;
    if (t === 33 || t === 43 || t === 55) this.seMode(51);
    this.cam = this.camaraAngulos(this.save, vecDir2(sub3(this.c.mov, this.save)), 0, true);
    if (this.sub === 0) {
      if (this.motor.isEnd) {
        this.accion(23);
        this.sub++;
      }
      return;
    }
    if (this.sub === 32) this.fundido = {
      t: 0,
      dur: 48
    };
    if (++this.sub !== 96) return;
    this.pasarAFase(-1);
    this.mensajeMeryl(-1);
  }
  A_Escena3(t) {
    if (t === 0) {
      this.sacarArmas();
      this.matarMisiles();
      this.hover = 0;
      this.cine(true);
      this.congelar(true);
      this.sinOverride();
      this.accion(1);
      this.voz(this.voice[3]);
      this.camuflajeOff();
      this.gasEffect(false);
      this.sepia(false);
      this.flagsB &= ~1;
      this.mirarASnake();
      this.invulnOn(0);
      this.arrived = 0;
    }
    this.oculto = false;
    if (this.sub === 0) {
      this.camaraSeguir(this.c.mov, 3200);
      if (this.voxEnd()) this.sub++;
    } else if (this.sub === 1) {
      this.cam = null;
      this.flotarJuntoAMeryl();
      this.modo(this.A_Desplazar);
    }
  }
  A_MirarMeryl(t) {
    if (t === 0) {
      this.seMode(129);
      this.accion(1);
      if (this.motor.action2 !== 19) this.override(19, 1022);
      this.mensajeMeryl(7);
    }
    if (this.sub === 0) {
      this.camaraEntre(this.c.mov, this.cabezaSnakeMM(), 4e3);
      this.c.turn[1] = vecDir2(sub3([ this.c.mov[0], 0, this.c.mov[2] ], [ this.snakeMM()[0], 0, this.snakeMM()[2] ])) + 2048 & 4095;
      if (++this.subtime !== 120) return;
      this.cine(false);
      this.cam = null;
      this.sinOverride();
      this.subtime = 0;
      this.sub++;
      return;
    }
    if (this.sub === 1 && ++this.subtime === 6) {
      this.congelar(false);
      this.padRelease = false;
      this.invulnOff();
      this.pasarAFase(4);
      this.flagsA &= ~16;
    }
  }
  sectorCuarto(p) {
    return p[0] < -5500 ? 1 : p[0] >= 4001 ? 2 : p[2] < -3250 ? 3 : p[2] >= 3251 ? 4 : 0;
  }
  A_Escena5(t) {
    if (t === 0) {
      this.sacarArmas();
      this.congelar(true);
      this.invulnOff();
      this.invulnOn(0);
      this.sinOverride();
      this.accion(1);
      this.c.step = ZERO();
      this.gasEffect(false);
      this.sepia(false);
      this.cine(true);
      this.matarMisiles();
      const s = this.snakeMM(), m = this.sala.posMeryl;
      if (len3(sub3([ s[0], 0, s[2] ], [ m[0], 0, m[2] ])) < 2501) {
        const a = this.sectorCuarto(m), b = this.sectorCuarto(s);
        if (a === b && a !== 0) this.flagsB |= 2048;
      }
    }
    if (t < 64) return;
    if (t === 64) {
      this.log("stance a Snake");
      this.flagsB &= ~32;
    }
    const centro = !!(this.flagsB & 2048), M = this.sala.posMeryl;
    switch (this.sub) {
     case 0:
      if (this.subtime === 0) {
        this.accion(0);
        this.voz(this.voice[0]);
        this.subtime = 1;
        break;
      }
      if (this.vox.status() !== 2) break;
      this.mensajeMeryl(5);
      this.sub = 1;
      this.subtime = 0;
      this.save = this.cabezaMM();
      this.save2 = this.cabezaSnakeMM();
      break;

     case 1:
      if (!centro) this.camaraEntre(this.save, this.save2, 2e3, -750, -160); else this.camaraDesde(this.c.mov, 2e3, 1500);
      if (++this.subtime === 194) this.accion(19);
      if (this.subtime >= 195) this.mirarAMeryl();
      if (this.subtime === 245) this.sub = 2;
      break;

     case 2:
      {
        if (!centro) {
          const cs = this.cabezaSnakeMM(), p = putVec(cs, [ 0, vecDir2(sub3(M, cs)), 0 ], [ 0, 0, 2e3 ]);
          this.camaraEntre(M, p, 2e3, 750, 300);
        } else this.camaraDesde(M, 1e3, 1500, 720);
        if (++this.subtime === 294) this.flagsMeryl |= 512;
        if (this.subtime === 354) {
          this.save = M.slice();
          this.sub = 3;
        }
        break;
      }

     case 3:
     case 4:
      {
        if (!centro) {
          const cs = this.cabezaSnakeMM(), p = putVec(cs, [ 0, vecDir2(sub3(this.save, cs)), 0 ], [ 0, 0, 2e3 ]);
          this.camaraEntre(this.save, p, 1e3, -300, -420);
        } else this.camaraDesde(M, 750, 1500);
        if (this.sub === 3) {
          if (this.flagsMeryl & 512) break;
          this.voz(this.voice[1]);
          this.sub = 4;
          this.subtime = 0;
        } else if (++this.subtime === 58) {
          this.sub = 5;
          this.subtime = 0;
        }
        break;
      }

     case 5:
      if (!centro) {
        this.flagsMeryl |= 8192;
        const cs = this.cabezaSnakeMM();
        this.camaraEntre(cs, putVec(cs, [ 0, vecDir2(sub3(M, cs)), 0 ], [ 0, 0, 1e3 ]), 1500);
      } else this.camaraDesde(this.snakeMM(), 750, 1500);
      if (!this.voxCodeEnd(this.voice[1])) break;
      this.invulnOff();
      this.pasarAFase(6);
      this.flagsB |= 48;
      if (this.proc[4]) this.mgr.correrProc(this.proc[4], []);
      this.flagsMeryl |= 1024;
      this.congelar(false);
      this.padRelease = false;
      this.cine(false);
      this.cam = null;
      this.oculto = false;
      this.flagsA &= ~16;
      break;
    }
  }
  A_Escena7(t) {
    if (t === 0) {
      this.sacarArmas();
      this.congelar(true);
      this.invulnOff();
      this.invulnOn(0);
      this.accion(1);
      this.sinOverride();
      this.flagsB &= ~32;
      this.cine(true);
      this.c.step = ZERO();
      this.oculto = false;
      this.gasEffect(false);
      this.sepia(false);
      this.voz(this.voice[2]);
      this.matarMisiles();
    }
    this.camaraSeguir(this.c.mov, 3200);
    if (!this.voxEnd()) return;
    this.congelar(false);
    this.padRelease = false;
    this.invulnOff();
    this.cine(false);
    this.cam = null;
    this.pasarAFase(8);
    this.flagsB |= 32;
    this.flagsA &= ~16;
  }
  voz(id) {
    if (!(id > 0)) return;
    this.vox.queue(id);
    this.log("voz", {
      id: id
    });
  }
  voxEnd() {
    return !!this.vox.end();
  }
  voxCodeEnd(id) {
    return !!this.vox.codeEnd(id);
  }
  alMorir() {
    this.vivo = false;
    const hud = this.mgr.hud;
    this.mgr.fx.push({
      t: 0,
      dur: 90,
      fn: () => {},
      fin: () => {
        hud.negro = 0;
      }
    });
    if (!this.sala.meryl && this.phase >= 2) {
      const pe = this.mgr.J.ctx?.nivel?.actores?.find?.(a => a.tipo === "PSYCHOMERYL")?.opts?.e?.[0]?.proc || 2960;
      this.mgr.victoriaProc(this, {
        jefe: "PSYCHOMANTIS",
        proc: pe,
        args: [ varGuion(this.ctx, "$w:G005a") || 1024 ],
        demos: [ 77474, 79038, 82900 ],
        siguiente: null
      });
    }
    this.destruir();
  }
  destruir() {
    this.vivo = false;
    this.blanco = false;
    this.pantalla.apagar();
    this.cam = null;
    if (this.sala.pausa) this.sala.pausa = false;
    this.vox?.init();
    if (this.congelado || this.tDerribo) this.mgr.congelar(false);
    if (this.sala.mantis === this) this.sala.mantis = null;
    this.o?.removeFromParent();
  }
  cuadroFundido() {
    const f = this.fundido;
    if (!f) return;
    f.t++;
    this.mgr.hud.negro = Math.min(1, f.t / f.dur);
  }
  estadoPrueba() {
    return {
      fase: this.phase,
      accion: this.nombreAccion(),
      react: this.flagsA & 4 ? this.react?.name : null,
      vida: this.vital,
      max: this.vitalMax,
      u: [ this.u1, this.u2, this.u3, this.u4 ],
      attack: this.attack,
      alive: {
        ...this.sala.alive
      },
      mov: this.c.mov.slice(),
      oculto: this.oculto,
      kogaku: this.kogakuMode === 10,
      flagsA: this.flagsA,
      flagsB: this.flagsB,
      invuln: this.invuln,
      blink: this.blink,
      blanco: this.blanco,
      hideo: this.hideoCount,
      fallos: this.missCount,
      anim: this.motor?.action,
      anim2: this.motor?.action2,
      cam: !!this.cam,
      pausa: this.sala.pausa
    };
  }
  nombreAccion() {
    return this.action?.name || null;
  }
}

export class Vox {
  constructor(flujo) {
    this.f = flujo;
    this.init();
    this.ultimoCuadro = -1;
  }
  init() {
    this.cola = [];
    this.lastStatus = -1;
    this.voxcode = -1;
    this.lastVoxcode = -1;
    this.voxEnd = 0;
    this.playing = 0;
    this.playtime = -1;
    this.time = -1;
    this.nextDelay = 0;
    this.nextCode = 0;
    if (this.f.estado !== -1) this.f.parar();
  }
  queue(code) {
    if (this.cola.length === 6) return -1;
    this.cola.push(code);
    return 0;
  }
  tick(frame) {
    if (frame != null) {
      if (frame === this.ultimoCuadro) return;
      this.ultimoCuadro = frame;
    }
    this.f.tick();
    if (this.f.estado === 1) this.f.empezar();
    if (this.nextDelay !== 0 && --this.nextDelay <= 0) {
      this.queue(this.nextCode);
      this.nextDelay = 0;
    }
    const prev = this.lastStatus, curr = this.lastStatus = this.f.estado;
    this.voxEnd = 0;
    this.playing = 0;
    if (this.playtime >= 0 && this.cola.length && prev !== -1) {
      if (prev === 2) this.playtime++;
      const timeout = ++this.time > 5400;
      if (timeout) this.f.parar();
      if (curr === -1 || timeout) {
        this.voxcode = -1;
        this.lastVoxcode = this.cola.shift();
        this.voxEnd = 1;
        this.time = -1;
        this.playtime = -1;
      }
    }
    if (this.f.estado === -1 && this.cola.length) {
      this.time = 0;
      this.playtime = 0;
      this.voxcode = this.cola[0];
      this.playing = 1;
      this.f.vox(this.voxcode);
      this.lastStatus = this.f.estado;
    }
  }
  end() {
    return this.voxEnd;
  }
  codeEnd(code) {
    if (this.voxEnd === 1 && this.lastVoxcode === code) {
      this.lastVoxcode = -1;
      return 1;
    }
    return 0;
  }
  status() {
    return this.f.estado;
  }
}

SalaPsy.prototype.voces = function voces(ctx) {
  const sim = !!ctx.vocesSimuladas;
  if (!this.vox) {
    const f = new Flujo({
      voces: ctx.voces,
      simulado: sim
    });
    this.vox = new Vox(f);
    if (!this.mgr.flujo) this.mgr.flujo = f;
  } else if (!!this.vox.f.op.simulado !== sim) {
    const viejo = this.vox.f;
    viejo.parar();
    this.vox.f = new Flujo({
      voces: ctx.voces,
      simulado: sim
    });
    this.vox.init();
    if (this.mgr.flujo === viejo || !this.mgr.flujo) this.mgr.flujo = this.vox.f;
  }
  return this.vox;
};

const MEMPSY_ACC = [ [ [ 0, 6 ], [ 16, 5 ], [ 100, 3 ] ], [ [ 0, 4 ] ], [ [ 0, 5 ] ], [ [ 0, 6 ] ], [ [ 0, 7 ] ], [ [ 0, 4 ], [ 110, 5 ] ], [ [ 0, 6 ] ], [ [ 0, 7 ] ], [ [ 0, 4 ], [ 115, 5 ] ], [ [ 0, 6 ] ], [ [ 0, 7 ] ], [ [ 0, 4 ] ], [ [ 0, 5 ], [ 110, 6 ] ], [ [ 0, 7 ] ], [ [ 0, 4 ], [ 190, 1 ] ], [ [ 0, 1 ], [ 142, 2 ] ], [ [ 0, 8 ], [ 51, 9 ] ], [ [ 0, 2 ] ], [ [ 0, 1 ] ], [ [ 0, 4 ] ], [ [ 0, 1 ] ], [ [ 0, 5 ] ], [ [ 0, 6 ] ], [ [ 0, 7 ] ], [ [ 0, 4 ] ], [ [ 0, 5 ] ], [ [ 0, 2 ] ], [ [ 0, 2 ] ], [ [ 0, 9 ], [ 65, 4 ], [ 120, 5 ] ], [ [ 0, 9 ], [ 60, 6 ], [ 130, 7 ] ], [ [ 0, 9 ], [ 61, 4 ], [ 119, 5 ] ], [ [ 0, 1 ], [ 121, 2 ] ], [ [ 0, 10 ], [ 84, 2 ], [ 194, 3 ], [ 340, 13 ] ], [ [ 0, 4 ], [ 74, 5 ] ], [ [ 0, 7 ], [ 71, 2 ] ], [ [ 0, 7 ], [ 64, 12 ] ], [ [ 0, 11 ] ], [ [ 0, 11 ] ], [ [ 0, 11 ] ], [ [ 0, 2 ] ] ];

const MEMPSY_PROC = [ 1, 5, 4, 3, 3, 4, 3, 3, 5, 4, 3, 3, 4, 5, 5, 1, 1, 2, 2, 1, 2, 1, 3, 3, 4, 2, 5, 1, 5, 5, 1, 5, 1, 2, 1, 1, 1, 1, 1, 1 ];

const MEMPSY_UMBRAL = [ 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 1, 3 ];

const MEMPSY_VOZ_GENERO = [ 17, 18, -1, -1, 39, 26, -1, -1, 22, 19, 21, 20, 24, 23, -1, 25 ];

export class MemPsy extends Jefe {
  se(id, p = null, modo = null) {
    seMM(this, id, p, modo);
  }
  constructor(actor, mgr) {
    super(actor, mgr);
    this.sala = SalaPsy.de(mgr);
    this.nombre = "MEMPSY";
    this.registro = [];
    this.blanco = false;
    this.flag = 0;
    this.time = 0;
    this.time2 = 0;
    this.lista = null;
    this.li = 0;
    this.f810 = -1;
    this.f800 = 0;
    this.f802 = 0;
    this.f804 = 0;
    this.f806 = 0;
    this.c = {
      mov: [ -750, 2e3, -1800 ],
      rot: [ 0, 0, 0 ]
    };
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    const num = x => typeof x === "number" ? x : x && typeof x === "object" ? x.proc ?? x.id ?? (x.var ? varGuion(this.ctx, x.var) : 0) : 0;
    const p = (o.p || a.p || [ -750, 2e3, -1800 ]).map(num);
    this.c.mov = p.slice();
    this.c.rot = (o.d || a.d || [ 0, 0, 0 ]).map(num);
    this.voces = (o.t || []).map(num);
    while (this.voces.length < 40) this.voces.push(0);
    this.procs = (o.f || []).map(num);
    this.vox = this.sala.voces(this.ctx);
    this.vox.f.precargar(this.voces.filter(v => v > 0));
    const anim = o.o?.[0]?.n || "psy_07b2";
    await this.cargarCuerpo("jefes/mantis.glb", anim);
    this.motor.accion(0, 0);
    const inv = this.J.ctx.inventario;
    if (inv) {
      if (inv.item >= 0 && TIPO_ITEM[inv.item] & 2) inv.item = -1;
      if (inv.arma >= 0 && TIPO_ARMA[inv.arma] & 512) inv.arma = -1;
      if (inv.item === IT.NVG || inv.item === IT.THERMG) inv.item = -1;
    }
    this.mgr.congelar(true);
    this.modo(this.intro);
    this.teclas = e => {
      if ([ "Escape", "Enter", "Space" ].includes(e.code)) this.saltar = true;
    };
    if (typeof addEventListener === "function") addEventListener("keydown", this.teclas);
    this.log("aparece", {
      voces: this.voces.length
    });
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
  }
  modo(fn) {
    this.accionFn = fn;
    this.time = 0;
    this.f802 = 0;
    this.f800 = 0;
  }
  proc(i) {
    const p = this.procs[i];
    if (p) this.mgr.correrProc(p, []);
  }
  cuenta(n) {
    const P = typeof window !== "undefined" ? window.__mgs?.partida : null;
    try {
      return P?.getL?.(n) ?? 0;
    } catch {
      return 0;
    }
  }
  decir(i) {
    this.flag |= 1;
    this.time2 = 0;
    this.lista = MEMPSY_ACC[i] || [ [ 0, 0 ] ];
    this.li = 0;
    this.f810 = this.voces[i] ?? -1;
    this.proc(MEMPSY_PROC[i] ?? 1);
    this.log("voz", {
      i: i,
      id: this.f810
    });
  }
  acciones() {
    if (this.flag & 4) return;
    const m = this.motor;
    if (this.flag & 2) {
      this.flag &= ~1;
      if (m.isEnd) {
        this.flag |= 1;
        this.flag &= ~2;
      }
    }
    if (!(this.flag & 1)) return;
    const time = this.time2++, e = this.lista?.[this.li];
    if (time === 0 && this.f810 >= 0) this.vox.queue(this.f810);
    if (e && time === e[0]) {
      if (m.action !== e[1]) m.accion(e[1], 4);
      this.li++;
    }
    if (m.isEnd) {
      if (!e || e[0] === 0) this.flag &= ~1;
      if (m.action !== 0 && m.action !== 9) m.accion(0, 4);
    }
  }
  sonidos() {
    const f = this.motor.info1.frame - 1, a = this.motor.action;
    let id = 0;
    if (a === 8 && (f === 0 || f === 50)) id = f === 0 ? 195 : 196; else if (a === 11 && [ 26, 66, 128, 158 ].includes(f)) id = 197; else if (a === 12 && f === 37) id = 56;
    if (id) this.se(id, null, "bomba");
  }
  cuadro() {
    this.motor.tick();
    const ang = (this.J.gvTime ?? this.mgr.frame) % 128;
    this.c.mov[1] += idiv((rsin(ang * 32) - rsin((ang - 1) * 32)) * 80, 4096);
    this.vox.tick(this.mgr.frame);
    const t = this.time;
    if (t < 16e3) this.time++;
    if (this.saltear()) return;
    this.accionFn.call(this, t);
    this.acciones();
    this.sonidos();
  }
  saltear() {
    let x = this.saltar;
    this.saltar = false;
    if (!x && typeof navigator !== "undefined" && navigator.getGamepads) for (const g of navigator.getGamepads()) if (g?.buttons?.[ctl.B.CRUZ]?.pressed) x = true;
    if (!x) return false;
    this.log("salteada");
    this.vox.init();
    this.mgr.hud.cine = 0;
    this.terminar();
    return true;
  }
  intro(t) {
    if (t === 0) {
      this.mgr.hud.cine = 1;
      this.decir(0);
      this.proc(1);
    }
    let v = this.f800, i;
    switch (this.f802) {
     case 0:
      if (!this.vox.end()) break;
      i = 8;
      if (this.cuenta(78) > 8) {
        i = 1;
        v = 1;
      }
      this.decir(i);
      this.f800 = v;
      this.f802++;
      break;

     case 1:
      if (!this.vox.end()) break;
      if (this.cuenta(87) > 8) {
        i = v === 1 ? 2 : 9;
        v |= 2;
      } else i = v === 1 ? 5 : 12;
      this.decir(i);
      this.f800 = v;
      this.f802++;
      break;

     case 2:
      if (!this.vox.end()) break;
      i = this.cuenta(80) > 4 ? [ 13, 6, 10, 3 ][v] : [ 14, 7, 11, 4 ][v];
      this.decir(i);
      this.f802++;
      break;

     case 3:
      if (this.vox.end()) this.modo(this.tarjeta);
      break;
    }
  }
  tarjetas() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (/mgs_codec_save_|mgs_partida_auto/.test(k)) return [ k ];
      }
    } catch {}
    return null;
  }
  tarjeta(t) {
    if (t === 0) {
      if (!this.tarjetas()) {
        this.log("sin tarjeta");
        this.modo(this.vibracion);
        return;
      }
      this.f804 = 1;
      this.decir(15);
      this.f800 = 0;
    }
    if (this.f806 === 0) {
      if (this.vox.codeEnd(this.voces[15])) {
        this.f804 = 0;
        if (this.f800 !== 0) {
          this.f804 = 1;
          this.decir(16);
        }
        this.f806 = 1;
      }
      return;
    }
    if (this.f800 === 0) {
      if (this.f804 === 0) {
        this.decir(30);
        if (this.motor.action !== 8) this.motor.accion(8, 4);
        this.f802 = 16;
        this.f804 = 1;
        this.flag |= 2;
      } else if (this.vox.end()) {
        this.f800 = 1;
        this.f804--;
      }
    } else if (this.f804 === 0) {
      let i = this.f802;
      for (;i < 16; i++) if (this.f800 >> i & 1) break;
      if (i === 16) {
        this.f802 = 17;
        if (this.cuenta(88) > 8) {
          if (this.f800 !== 0) {
            this.decir(28);
            if (this.motor.action !== 8) this.motor.accion(8, 4);
            this.f804 = 1;
            this.flag |= 2;
          }
        } else {
          if (this.f800 !== 0) {
            this.decir(29);
            if (this.motor.action !== 8) this.motor.accion(8, 4);
            this.flag |= 2;
          } else this.decir(31);
          this.f804 = 1;
        }
      } else {
        this.f802 = i + 1;
        this.decir(MEMPSY_VOZ_GENERO[i]);
        this.f804 = 1;
      }
    } else if (this.vox.end()) this.f804--;
    if (this.f802 === 17 && this.f804 === 0) {
      this.f802 = 18;
      this.decir(27);
      this.f804 = 1;
    } else if (this.f802 === 18 && (this.f804 === 0 || this.vox.end())) this.modo(this.vibracion);
  }
  mandoVibra() {
    if (!ctl.vibraActiva()) return false;
    const g = typeof navigator !== "undefined" && navigator.getGamepads ? [ ...navigator.getGamepads() ].find(x => x?.connected && x.vibrationActuator) : null;
    if (g) {
      this.mando = g;
      return true;
    }
    return typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && matchMedia?.("(pointer: coarse)").matches;
  }
  vibrar(fuerza) {
    try {
      ctl.vibrar({
        m1: [ 127, 2 ],
        m2: [ Math.max(0, Math.min(255, fuerza | 0)), 2 ]
      });
    } catch {}
  }
  vibracion(t) {
    if (t === 0) {
      if (!this.mandoVibra()) {
        this.modo(this.fin);
        return;
      }
      this.decir(32);
    }
    switch (this.f800) {
     case 0:
      if (this.vox.end()) {
        this.decir(33);
        this.f800++;
      }
      break;

     case 1:
      if (this.vox.codeEnd(this.voces[33])) this.f800++;
      break;

     case 2:
      {
        if (this.f802 === 0) this.decir(36);
        if (this.vox.codeEnd(this.voces[36])) this.decir(37);
        if (this.vox.codeEnd(this.voces[37])) this.decir(38);
        if ([ 30, 75, 122 ].includes(this.f802) && this.motor.action !== 11) this.motor.accion(11, 4);
        const k = this.f802;
        if (k > 38) {
          if (k < 48) this.vibrar(k + 70); else if (k > 70 && k < 112) this.vibrar(k + 75); else if (k > 132) this.vibrar(k + 74);
        }
        if (++this.f802 > 179) {
          this.decir(34);
          this.f800++;
        }
        break;
      }

     case 3:
      if (this.vox.codeEnd(this.voces[34])) this.modo(this.fin);
      break;
    }
  }
  fin(t) {
    if (t === 0) this.decir(35);
    if (!(this.flag & 4) && this.motor.isEnd && this.motor.action === 12) this.flag |= 4;
    if (t === 148) this.proc(6);
    if (this.vox.end()) {
      this.mgr.hud.cine = 0;
      this.terminar();
    }
  }
  terminar() {
    this.log("fin");
    if (!this.procs[0] || !this.mgr.correrProc(this.procs[0], [])) this.mgr.congelar(false);
    this.destruir();
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.c.mov[0] * MM, (this.c.mov[1] - this.motor.altura) * MM, this.c.mov[2] * MM);
    this.o.rotation.y = this.c.rot[1] * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.motor.altura * MM);
  }
  destruir() {
    if (this.teclas && typeof removeEventListener === "function") removeEventListener("keydown", this.teclas);
    this.vivo = false;
    this.o?.removeFromParent();
    this.mgr.congelar(false);
  }
  estadoPrueba() {
    return {
      modo: this.accionFn?.name,
      t: this.time,
      f800: this.f800,
      f802: this.f802,
      f804: this.f804,
      f806: this.f806,
      anim: this.motor?.action,
      cola: this.vox?.cola.slice(),
      sonando: this.vox?.voxcode
    };
  }
}

export const TIPOS_MANTIS = {
  PSYCHOMANTIS: Mantis,
  PSYOBJ: PsyObj,
  MEMPSY: MemPsy
};

const MANTIS_PELEA = {
  p: [ -750, 1500, -1800 ],
  d: [ 0, 0, 0 ],
  g: [ 1 ],
  k: [ 0 ],
  m: [ 2 ],
  f: [ 0 ],
  n: [ {
    id: PSY.MERYL,
    n: null
  } ]
};

export const PELEA_S07B = {
  elegir: nv => {
    const m = nv.actores.find(a => a.tipo === "PSYCHOMANTIS");
    if (!m) return [];
    const opts = {
      ...m.opts,
      ...MANTIS_PELEA
    };
    const r = [ {
      ...m,
      p: MANTIS_PELEA.p.slice(),
      d: [ 0, 0, 0 ],
      opts: opts,
      forzado: true
    } ];
    const y = nv.actores.find(a => a.tipo === "PSYCHOMERYL");
    if (y) r.push({
      ...y,
      p: [ -400, 0, 1500 ],
      d: [ 0, 0, 0 ],
      opts: {
        ...y.opts,
        m: [ 8 ],
        p: [ -400, 0, 1500 ],
        d: [ 0, 0, 0 ],
        v: [ 0, 0, 2500 ],
        s: [ 3 ],
        g: [ 1 ],
        h: [ 16, 40 ],
        l: [ 0 ]
      },
      forzado: true
    });
    return r;
  },
  snake: {
    p: [ -670, 0, 875 ],
    rot: 2048
  },
  cancion: 2,
  grupoHzd: 0,
  guion: g => {
    const s = (n, v) => {
      try {
        g.vars.set(n, v);
      } catch {}
    };
    s("$w:G000a", 129);
    s("$b:G0046", 3);
    s("$f:G0128.1", 0);
    s("$w:L0010", -670);
    s("$w:L0012", 0);
    s("$w:L0014", 875);
    s("$w:G0002", 2048);
    g.correrProc(7684);
  },
  tipos: [ "PSYCHOMANTIS" ]
};

export const U = {
  idiv: idiv,
  s16: s16,
  rsin: rsin,
  rcos: rcos,
  vecDir2: vecDir2,
  sub3: sub3,
  add3: add3,
  len3: len3,
  lenVec3: lenVec3,
  difDirS: difDirS,
  putVec: putVec,
  rotVec: rotVec,
  aV3: aV3,
  deV3: deV3,
  seMM: seMM,
  varGuion: varGuion,
  ZERO: ZERO,
  PantallaPsy: PantallaPsy
};
