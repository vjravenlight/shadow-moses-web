// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, ratan2, dir4096, randU, nearExp, nearExp4P, nearExp8, nearSpeed, fase, rotY, cargarModelo } from "./base.js";

const PUNTOS = [ [ -500, 9500 ], [ 750, 8250 ], [ 1e3, 4e3 ], [ -250, 2750 ], [ -4500, 2500 ], [ -5750, 3750 ], [ -6e3, 8e3 ], [ -4750, 9250 ] ];

const BOCA = {
  x: 20,
  y: 0,
  z: 60
};

const M34A8 = {
  m: [ [ 4094, -13, -23 ], [ 16, -54, 4091 ], [ -16, -4095, -59 ] ],
  t: [ -155, 62, 469 ]
};

const T34D8 = [ [ 0, 3 ], [ 2, 1 ], [ 3, 1 ], [ 0, 2 ], [ 1, 2 ], [ 3, 0 ], [ 2, 0 ], [ 1, 3 ] ];

const T34F8 = [ 3, 1, 1, 2, 2, 0, 0, 3 ];

const T3508 = [ 5, 4, 7, 6, 1, 0, 3, 2 ];

const T3558 = [ 4, 5, 6, 7, 0, 1, 2, 3 ];

const T3578 = [ 96, 24, 129, 96, 6, 129, 24, 6 ];

const PASOS_ATR2 = [ [ 3, 0, 186 ], [ 3, 8, 187 ], [ 14, 8, 187 ], [ 14, 19, 186 ] ];

const PASOS = [ [ 3, 0, 160 ], [ 3, 8, 161 ], [ 14, 8, 161 ], [ 14, 19, 160 ] ];

const VIDA_DIF = [ 512, 614, 665, 716 ];

const MASK_PIERNAS = 129025;

export function sector(x, z) {
  x += 2500;
  z -= 6e3;
  const v1 = Math.abs(x) > Math.abs(z) ? 0 : 1;
  if (x > 0) return z > 0 ? 1 - v1 : 2 + v1;
  return z > 0 ? 6 + v1 : 5 - v1;
}

function reflejar(p, pared) {
  if (pared === 0) p.x = -15e3 - p.x; else if (pared === 1) p.x = 5e3 - p.x; else if (pared === 2) p.z = 2e3 - p.z; else if (pared === 3) p.z = 22e3 - p.z;
}

const isqrt = v => Math.floor(Math.sqrt(Math.max(0, v)));

export class Ocelot extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "OCELOT";
    this.st = {
      state: 6,
      time: 0,
      field_8: 0,
      field_C: 0,
      field_18: 0
    };
    this.route = {
      pos: new THREE.Vector3,
      sectors: [ 0, 0, 0, 0 ],
      dir: new THREE.Vector3,
      count: 0
    };
    this.param = {
      x940: 0,
      z940: 0,
      i948: 0,
      s94C: 0,
      c950: 0
    };
    this.tabla = T3508;
    this.DBE18 = new THREE.Vector3;
    this.f868 = new THREE.Vector3;
    this.registro = [];
  }
  async iniciar() {
    await this.cargarCuerpo("jefes/ocelot.glb", "revolver");
    const p = this.actor.p || this.opts.p || [ -5500, 1e3, 3750 ], d = this.actor.d || this.opts.d || [ 0, 0, 0 ];
    this.mov.set(p[0], p[1], p[2]);
    this.rot = this.turn = d[1] & 4095;
    this.interpCtrl = 1;
    this.motor.accion(1, 0);
    this.proc_id = this.procId("e");
    this.motor.accion(1, 1);
    this.motor.override(8, 0, 0);
    this.field_8A0 = 5;
    this.mov.x = -5750;
    this.mov.z = 3750;
    this.f868.copy(this.mov);
    this.f874 = 6;
    this.f880 = 0;
    this.llego = 0;
    this.f8A4 = 0;
    this.f8AC = 0;
    this.f87C = 0;
    this.f878 = 0;
    this.f884 = 0;
    this.f888 = 0;
    this.f890 = 0;
    this.f894 = 0;
    this.f898 = 0;
    this.f89C = 0;
    this.f8D0 = 0;
    this.f8D4 = 0;
    this.f8EC = 0;
    this.f8F0 = 0;
    this.f8F8 = 0;
    this.f964 = 4e3;
    this.f968 = 3e3;
    this.life_now = 1024;
    this.life_rest = 1024;
    this.life_delay = 0;
    const h = this.opts.h?.[0];
    this.hp = typeof h === "number" ? h : VIDA_DIF[Math.max(0, Math.min(3, this.dificultad()))];
    this.vital = this.hp;
    this.st.state = 6;
    this.st.time = 0;
    this.blanco = true;
    if ((this.J.ctx.hz?.grupos?.length || 0) > 1 && this.mgr.grupoHzd == null) this.mgr.grupoHzd = 1;
    this.barras = [ {
      y: 28,
      rest: 1024,
      now: 1024,
      max: 1024,
      conf: {
        nombre: "OCELOT",
        izq: [ 16, 111, 159 ],
        der: [ 31, 223, 127 ]
      },
      extra: x => this.dibujarTambor(x)
    } ];
    const c = this.motor.clip(1);
    for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c.rot.slice(j * 3, j * 3 + 3);
    this.motor.altura = c.altura[0];
    this.apoyar();
    this.dibujar();
  }
  vitalBlanco() {
    return this.vital;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  get vs() {
    return this.mgr.voicesys;
  }
  seVoz(id) {
    if ((this.mgr.flujo?.estado ?? -1) !== 2) this.se2(id);
  }
  CF420() {
    const M = this.motor;
    if (M.action2 !== 14) {
      this.f888 = 1;
      this.rot = this.rot + 2048 & 4095;
      M.override(14, 4, -1);
      M.info2.accion = 3;
      M.info1.f14 = 0;
    }
  }
  CF4A0() {
    if (this.f890 !== 0) {
      this.f890 = 0;
      this.CF420();
    } else if (this.f888 === 0) {
      this.f888 = 1;
      this.motor.override(3, 4, this.f880 ? MASK_PIERNAS : -1);
    }
  }
  CF518() {
    this.f888 = 0;
    this.motor.override(3, 4, 0);
    this.motor.info2.f14 = 0;
    if (this.f880 === 0) this.motor.accion(0, 4);
  }
  CF584() {
    if (this.motor.action2 !== 9) this.motor.override(9, 4, -1);
    this.motor.info1.f14 = 0;
  }
  CF5D0() {
    this.motor.override(3, 4, this.f888 !== 0 ? MASK_PIERNAS : 0);
    if (this.f880 !== 0) this.motor.info1.f14 = 1; else this.motor.accion(0, 4);
  }
  CF650() {
    if (this.motor.action2 !== 13) this.motor.override(13, 4, -1);
    this.motor.info1.f14 = 0;
  }
  CF71C() {
    this.motor.accion(0, 4);
  }
  CF748() {
    this.f880 = 1;
    this.f884 = 0;
    this.motor.accion(8, 4);
    if (this.f888 !== 0) {
      this.motor.info1.mask = MASK_PIERNAS;
      this.motor.info2.mask = ~MASK_PIERNAS;
    }
    this.log("recarga");
  }
  CF7AC() {
    this.f880 = 0;
    this.motor.accion(0, 4);
    if (this.f888 !== 0) {
      this.motor.info1.mask = -1;
      this.motor.info2.mask = 0;
    }
  }
  CF7FC() {
    const a = this.adjust;
    a[1][1] = nearExp4P(a[1][1], this.f8D0);
    const m = nearExp4P(a[2][0], this.f8D4);
    a[2][0] = m;
    a[7][0] = m;
    a[8][0] = m;
  }
  CF8D8() {
    const d = this.tomarDaño();
    if (!d) return;
    this.f894 = 1;
    this.vs?.CE300();
    if (d.a_mode === 1 || d.a_mode === 2) this.vital -= d.daño;
    switch (d.a_mode) {
     case 3:
      this.vital--;
      this.se(52, this.mov);
      break;

     case 4:
      this.vital -= 3;
      this.se(53, this.mov);
      break;

     default:
      this.sangre(this.puntoHueso(2, {
        x: 0,
        y: 0,
        z: 100
      }));
    }
    if (this.gameOverTimer() !== 0 && this.vital <= 0) this.vital = 1;
    const life = this.vital;
    this.life_now = Math.trunc(life * 1024 / this.hp);
    if (life > 0) {
      this.CF584();
      this.blanco = false;
      this.se2(137);
    } else {
      this.st.state = 4;
      this.st.time = 0;
      this.CF584();
      this.life_now = 0;
      this.se2(136);
    }
    this.f868.copy(this.mov);
    this.log("daño", {
      a_mode: d.a_mode,
      "daño": d.daño,
      vital: this.vital
    });
  }
  CFAF0(turn) {
    const M = M34A8, ap = v => ({
      x: (M.m[0][0] * v.x + M.m[0][1] * v.y + M.m[0][2] * v.z) / 4096 + M.t[0],
      y: (M.m[1][0] * v.x + M.m[1][1] * v.y + M.m[1][2] * v.z) / 4096 + M.t[1],
      z: (M.m[2][0] * v.x + M.m[2][1] * v.y + M.m[2][2] * v.z) / 4096 + M.t[2]
    });
    const a = rotY(turn, ap({
      x: 0,
      y: 0,
      z: 60
    })), b = rotY(turn, ap({
      x: 0,
      y: -15e3,
      z: 60
    }));
    const p0 = new THREE.Vector3(this.mov.x + a.x, this.mov.y + a.y, this.mov.z + a.z);
    let p1 = new THREE.Vector3(this.mov.x + b.x, this.mov.y + b.y, this.mov.z + b.z);
    const dir = p1.clone().sub(p0), L = dir.length();
    const h = this.mgr.pared(p0, dir, L, this.mgr.grupoHzd ?? -1, 0);
    if (h) p1 = h.punto;
    return this.DBE18.distanceTo(p0) <= p1.distanceTo(p0);
  }
  CFC3C() {
    const s = this.snake();
    return sector(s.x, s.z);
  }
  CFC6C(flag) {
    const r = this.route;
    r.count = 0;
    const f8A4 = this.f8A4, f8A0 = this.field_8A0, a = T34F8[f8A4];
    if (f8A4 === T3508[f8A0]) {
      r.count = 1;
      r.sectors[0] = a;
      return;
    }
    let m = T34D8[f8A0][0];
    if (a === m) m = T34D8[f8A0][1];
    if (flag === 0) {
      r.count = 1;
      r.sectors[0] = m;
    } else {
      r.count = 2;
      r.sectors[0] = a;
      r.sectors[1] = m;
    }
  }
  CFD84() {
    const r = this.route;
    r.pos.copy(this.DBE18);
    for (let i = 0; i < r.count; i++) reflejar(r.pos, r.sectors[i]);
    r.dir.copy(r.pos).sub(this.mov);
    return ratan2(r.dir.x, r.dir.z) & 4095;
  }
  CFE44(a0, a1) {
    const s = this.snake(), side = sector(s.x, s.z) - a0 & 7;
    if (side < 2 || side > 5) return side < 4 ? a0 - 1 & 7 : a0 + 1 & 7;
    return (a1 - a0 & 7) < 4 ? a0 + 1 & 7 : a0 - 1 & 7;
  }
  CFED4(arg1) {
    const P = this.param, s0 = this.field_8A0;
    if (s0 === arg1) return -1;
    P.c950 = 0;
    P.s94C = arg1;
    const s1 = this.CFE44(s0, arg1);
    if (s0 >> 1 !== s1 >> 1) P.i948 = s1; else {
      const x = PUNTOS[s0][0] - this.mov.x, z = PUNTOS[s0][1] - this.mov.z;
      this.turn = dir4096(x, z);
      const len = isqrt(x * x + z * z);
      P.i948 = len < 1e3 || len < 1800 ? s1 : s0;
    }
    P.x940 = PUNTOS[P.i948][0];
    P.z940 = PUNTOS[P.i948][1];
    this.turn = dir4096(P.x940 - this.mov.x, P.z940 - this.mov.z);
    this.interpCtrl = 1;
    const diff = Math.abs((this.rot & 4095) - (this.turn & 4095)) - 1536;
    if (diff > 0 && diff < 1024) this.f890 = 1;
    return 0;
  }
  D00B4() {
    if (this.llego !== 0) return -1;
    const P = this.param;
    let x = P.x940 - this.mov.x, z = P.z940 - this.mov.z;
    if (isqrt(x * x + z * z) < 300) {
      const s = this.snake();
      P.s94C = this.tabla[sector(s.x, s.z)];
      let i = P.i948;
      if (P.s94C === i) {
        this.f868.x = PUNTOS[i][0];
        this.f868.z = PUNTOS[i][1];
        return -1;
      }
      P.i948 = i = this.CFE44(i, P.s94C);
      P.x940 = PUNTOS[i][0];
      P.z940 = PUNTOS[i][1];
      x = P.x940 - this.mov.x;
      z = P.z940 - this.mov.z;
    }
    this.turn = dir4096(x, z);
    if (isqrt(x * x + z * z) < 1e3) this.rot = nearExp(fase(this.rot, this.turn), this.turn, 2) & 4095; else {
      const diff = Math.abs((this.rot & 4095) - (this.turn & 4095)) - 1536;
      if (diff > 0 && diff < 1024) {
        this.f890 = 1;
        this.CF4A0();
      }
    }
    if (this.f880 === 0) P.c950++; else P.c950 = 0;
    return 0;
  }
  D02C8(t1, t2) {
    const s = this.snake(), side1 = sector(this.mov.x, this.mov.z), side2 = sector(s.x, s.z);
    this.tabla = t1;
    let index = t1[side2];
    const v1 = (side2 - side1 & 7) >= 4 ? 1 : 0;
    if (index === side1) {
      this.f868.x = PUNTOS[side1][0];
      this.f868.z = PUNTOS[side1][1];
      return -1;
    }
    if ((index - side1 & 7) < 4) {
      if (v1 === 0) {
        index = t2[side2];
        this.tabla = t2;
      }
    } else if (v1 === 1) {
      index = t2[side2];
      this.tabla = t2;
    }
    this.field_8A0 = side1;
    return this.CFED4(index);
  }
  D03C0() {
    return this.D02C8(T3508, T3508);
  }
  D03EC() {
    return this.D02C8(T3508, T3508);
  }
  D0418() {
    return this.D02C8(T3558, T3558);
  }
  D0444() {
    const s = this.snake();
    return T3578[sector(this.mov.x, this.mov.z)] >> sector(s.x, s.z) & 1 ? -1 : 0;
  }
  estado(st, v) {
    st.state = v;
    st.time = 0;
  }
  apuntar(len) {
    this.f8D4 = -ratan2(this.route.dir.y, len ?? Math.round(Math.hypot(this.route.dir.x, this.route.dir.z)));
  }
  D04C4(st) {
    const diff = this.DBE18.clone().sub(this.mov);
    if (this.gameOverTimer() !== 0) {
      this.turn = dir4096(diff.x, diff.z);
      this.CF71C();
      return;
    }
    if (this.f874 <= 0) {
      this.estado(st, 3);
      this.CF748();
      if (this.f8EC === 0 && this.f8F0 < 3) {
        if (this.f8F8 === 0) {
          this.vs?.CE2D0();
          this.f8F8 = 1;
        }
        return;
      }
      this.seVoz(132);
      return;
    }
    let ok;
    if (this.f964 < diff.length()) {
      if (this.D0444()) {
        st.field_C++;
        const dir = ratan2(diff.x, diff.z), ds = dir;
        let extra;
        this.turn = dir & 4095;
        if (this.CFAF0(ds)) {
          if (st.field_C < 0) st.field_C = 0;
          if (st.field_C < 5) return;
          st.field_C = 0;
          this.route.count = 0;
          this.route.dir.copy(diff);
          extra = ds;
        } else {
          if (st.field_C < 5) return;
          st.field_C = -60;
          if (st.field_8 === 0) {
            this.route.count = 0;
            this.route.dir.copy(diff);
            st.field_8++;
            this.vs?.CE5F8(8, 1);
            this.estado(st, 5);
            this.log("escondido");
            return;
          }
          this.f8A4 = this.CFC3C();
          this.CFC6C(1);
          extra = this.CFD84();
          if (randU(32) < 8) this.seVoz(130);
        }
        this.estado(st, 2);
        this.interpCtrl = 1;
        this.f870 = 0;
        this.turn = ds & 4095;
        this.f8D0 = extra - ds;
        if (this.f8D0 > 2048) this.f8D0 -= 4096;
        if (this.f8D0 < -2048) this.f8D0 += 4096;
        this.motor.accion(6, 4);
        this.apuntar();
        return;
      }
      ok = this.D03C0();
    } else {
      ok = this.D03C0();
      this.seVoz(131);
    }
    this.estado(st, 1);
    if (!ok) this.CF4A0();
  }
  D07F4(st) {
    const diff = this.DBE18.clone().sub(this.mov), len = diff.length();
    if (this.param.c950 > 90) {
      this.f898 = 1;
      this.f868.copy(this.mov);
    }
    if (this.f898 !== 0) {
      const dir = ratan2(diff.x, diff.z);
      if (this.CFAF0(dir) && this.f874 > 0) {
        this.field_8A0 = this.param.s94C;
        this.CF518();
        this.llego = 0;
        this.route.count = 0;
        this.route.dir.copy(diff);
        this.estado(st, 2);
        this.f870 = 0;
        st.field_C = 0;
        this.turn = dir & 4095;
        this.interpCtrl = 1;
        this.f8D0 = 0;
        this.motor.accion(6, 4);
        st.field_18 = 1;
        this.apuntar();
        return;
      }
      if (this.f874 <= 0) {
        this.estado(st, 3);
        this.CF748();
        if (!this.D0418()) this.CF4A0();
        if (this.f8EC === 0 && this.f8F0 < 3) {
          if (this.f8F8 === 0) {
            this.vs?.CE2D0();
            this.f8F8 = 1;
          }
        }
        return;
      }
      if (!this.D03C0()) this.CF4A0();
    }
    this.llego |= this.D00B4();
    if (this.llego !== 0) {
      if (len < 3e3) {
        if (!this.D03EC()) this.CF4A0();
      } else {
        this.estado(st, 0);
        this.field_8A0 = this.param.s94C;
        this.CF518();
        this.llego = 0;
      }
    }
  }
  D0A94(st) {
    const diff = this.DBE18.clone().sub(this.mov), len = isqrt(diff.x * diff.x + diff.z * diff.z), dir = ratan2(diff.x, diff.z);
    if (this.f898 !== 0) {
      if (len < 4e3 || !this.CFAF0(dir) || this.f874 <= 0) {
        if (!this.D0418()) {
          this.CF4A0();
          this.estado(st, 1);
        } else {
          this.estado(st, 0);
          this.CF71C();
          this.f8D0 = 0;
          this.f8D4 = 0;
        }
        return;
      }
      this.route.count = 0;
      this.route.dir.copy(diff);
      this.estado(st, 2);
      this.f870 = 0;
      st.field_C = 0;
      this.turn = dir & 4095;
      this.interpCtrl = 1;
      this.f8D0 = 0;
      this.motor.accion(6, 4);
      this.apuntar(len);
    }
    this.f870++;
    switch (st.time) {
     case 0:
      if (st.field_18 !== 0) this.turn = dir & 4095;
      if (this.f870 === 10) {
        const a = this.adjust;
        a[2][0] = a[7][0] = a[8][0] = this.f8D4;
        a[1][1] = this.f8D0;
        this.motor.accion(6, 1);
        st.time = 1;
      }
      break;

     case 1:
      this.disparar();
      st.time = 2;
      break;

     case 2:
      this.mov.x = nearExp8(this.mov.x, this.f868.x);
      this.mov.z = nearExp8(this.mov.z, this.f868.z);
      if (this.motor.isEnd) {
        if (st.field_18 === 0) {
          this.estado(st, 0);
          this.CF71C();
          this.f8D0 = 0;
          this.f8D4 = 0;
        } else {
          this.estado(st, 1);
          if (!this.D0418()) this.CF4A0();
          st.field_18 = 0;
        }
      }
      break;
    }
  }
  disparar() {
    this.f874--;
    this.dibujar();
    const o = this.puntoHueso(5, BOCA).multiplyScalar(1e3);
    let d = this.ejeHueso(5, new THREE.Vector3(0, -1, 0));
    if (this.mgr.balaAnalitica) {
      const yaw = (this.rot + this.adjust[1][1]) * ANG, pitch = -this.f8D4 * ANG;
      d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    }
    const lv = this.dificultad(), daño = lv > 0 ? lv * 6 + 48 : 48;
    this.mgr.balas.nueva(o, d, this.route.count, daño);
    this.se(178, this.mov);
    this.chispa(o.clone().multiplyScalar(MM), .45, 3);
    this.f87C = 1;
    this.log("disparo", {
      rebotes: this.route.count,
      balas: this.f874,
      dir: [ +d.x.toFixed(3), +d.y.toFixed(3), +d.z.toFixed(3) ]
    });
  }
  D0DE0(st) {
    const diff = this.snake().sub(this.mov);
    if (this.f898 !== 0) {
      if (this.f874 === 6) {
        this.CF7AC();
        if (this.f888 !== 0) {
          this.llego |= this.D00B4();
          if (this.llego === 0) {
            this.estado(st, 1);
            return;
          }
          this.field_8A0 = this.param.s94C;
          this.CF518();
          this.llego = 0;
        }
        this.estado(st, 0);
        return;
      }
      if (!this.D0418()) this.CF4A0();
    }
    if (this.f888 !== 0) {
      this.llego |= this.D00B4();
      if (this.llego !== 0) {
        this.field_8A0 = this.param.s94C;
        this.CF518();
        this.llego = 0;
      }
    } else if (diff.length() < this.f968 && !this.D0418()) {
      this.marca("!");
      this.CF4A0();
    }
    if (this.motor.isEnd) {
      this.CF7AC();
      if (this.f888 !== 0) {
        this.llego |= this.D00B4();
        if (this.llego === 0) {
          this.estado(st, 1);
          return;
        }
        this.field_8A0 = this.param.s94C;
        this.CF518();
        this.llego = 0;
      }
      this.estado(st, 0);
      return;
    }
    const frame = this.motor.info1.frame;
    let se = -1;
    if (this.f884 !== frame) {
      if ([ 17, 30, 43, 56, 69, 82 ].includes(frame)) se = 181; else if ([ 32, 58, 84 ].includes(frame)) se = 183; else if ([ 120, 134, 148, 162, 176, 190 ].includes(frame)) {
        se = 179;
        this.f878++;
      } else if (frame === 123 || frame === 165) se = 133; else if (frame === 137 || frame === 179) se = 134; else if (frame === 151 || frame === 193) se = 135; else if (frame === 208) se = 177; else if (frame === 230) se = 180;
    }
    this.f884 = frame;
    if (se !== -1) this.se(se, this.mov);
    if (frame === 220) {
      if (this.f8EC === 0) {
        if (this.f8F8 === 1) {
          this.vs?.CE2D0();
          this.f8F8 = 0;
        }
        if (++this.f8F0 === 3) this.f8EC = 1;
      }
      this.f874 = 6;
      this.f878 = 0;
      this.log("cargado");
    }
  }
  D1120(st) {
    if (st.time === 0) {
      if (this.f888 !== 0) this.CF518();
      this.CF71C();
      if (this.proc_id !== 0 && this.gameOverTimer() === 0) {
        this.mgr.victoria(this, {
          jefe: "OCELOT",
          proc: this.proc_id,
          demos: [ 30290, 32237 ],
          siguiente: "s04c"
        });
        this.proc_id = 0;
      }
      st.time = 1;
      this.log("muerto");
    }
  }
  D11C8(st) {
    const diff = this.snake().sub(this.mov);
    this.turn = dir4096(diff.x, diff.z);
    if (this.f898 !== 0) {
      if (!this.D0418()) {
        this.CF4A0();
        this.estado(st, 1);
      } else {
        this.estado(st, 0);
        this.CF71C();
        this.f8D0 = 0;
        this.f8D4 = 0;
      }
      return;
    }
    if (this.f888 === 0) {
      if (diff.length() < this.f964) {
        if (this.D03EC() === 0) this.CF4A0();
        return;
      }
    } else {
      this.llego |= this.D00B4();
      if (this.llego !== 0) {
        this.field_8A0 = this.param.s94C;
        this.CF518();
        this.llego = 0;
      }
    }
    if (!(this.vs?.CE694() ?? false)) this.estado(st, this.f888 !== 0 ? 1 : 0);
  }
  D1318(st) {
    if (++st.time > 50) {
      this.vs?.CE2D0();
      this.estado(st, 0);
    }
  }
  D1364() {
    this.CF8D8();
    if (this.f894 !== 0) {
      if (this.motor.time2 !== 0) {
        this.f8AC = 30;
        this.f894 = 0;
        this.f898 = 1;
        this.CF5D0();
        this.blanco = false;
      }
      if (this.f89C !== 0 && --this.f89C === 0) this.f898 = 1;
    } else if (this.f89C !== 0) {
      this.CF650();
      if (--this.f89C === 0) {
        this.CF5D0();
        this.f898 = 1;
      }
    }
    if (this.mgr.stun) {
      this.f89C = 60;
      this.seVoz(138);
      this.f868.copy(this.mov);
      this.log("aturdido");
    }
    return this.f89C !== 0 || this.f894 !== 0 ? -1 : 0;
  }
  D149C() {
    const st = this.st;
    if (this.D1364()) return;
    switch (st.state) {
     case 0:
      this.D04C4(st);
      break;

     case 1:
      this.D07F4(st);
      break;

     case 2:
      this.D0A94(st);
      break;

     case 3:
      this.D0DE0(st);
      break;

     case 4:
      this.D1120(st);
      break;

     case 5:
      this.D11C8(st);
      break;

     case 6:
      this.D1318(st);
      break;
    }
  }
  D158C() {
    this.D149C();
    this.f898 = 0;
    if (this.gameOverTimer() < 0) {
      this.vs?.CE310();
      this.vs?.CE734();
    }
  }
  D15D4() {
    if (this.f8AC > 1) this.o.visible = (--this.f8AC & 3) !== 0; else if (this.f8AC === 1) {
      this.f8AC = 0;
      this.blanco = true;
      this.o.visible = true;
    }
    if (this.gameOverTimer() !== 0) this.blanco = false;
  }
  D168C() {
    if (this.f87C !== 0) {
      if (this.f87C < 10) {
        const p = this.puntoHueso(5, BOCA);
        p.y += this.f87C * .015;
        this.chispa(p, .12 + this.f87C * .01, 6, 7829367);
        this.f87C++;
      } else this.f87C = 0;
    }
  }
  D1760() {
    const M = this.motor, act = M.info2.mask !== -1 ? M.action2 : -1, frame = M.info2.frame;
    const tabla = this.atrPiso() === 2 ? PASOS_ATR2 : PASOS;
    for (const [a, f, se] of tabla) if (act === a && frame === f) {
      this.se(se, this.mov, tabla === PASOS_ATR2 ? "bomba" : null);
      break;
    }
  }
  atrPiso() {
    const hz = this.J.ctx.hz, g = hz?.grupos?.[this.mgr.grupoHzd ?? 0];
    if (!g) return 0;
    for (const f of g.pisos) {
      const xs = f.puntos.map(p => p[0]), zs = f.puntos.map(p => p[2]);
      if (this.mov.x >= Math.min(...xs) && this.mov.x <= Math.max(...xs) && this.mov.z >= Math.min(...zs) && this.mov.z <= Math.max(...zs) && Math.abs(f.puntos[0][1] - this.piso) < 300) return f.atr || 0;
    }
    return 0;
  }
  cuadro() {
    const sn = this.snake();
    this.DBE18.copy(sn);
    const M = this.motor;
    if (M.action2 === 14) {
      if (M.info2.frame === 0) M.rots[0][1] = M.rots[0][1] + 2048 & 4095;
      if (M.time2 !== 0) {
        if (this.f888 !== 0) {
          M.action2 = 3;
          M.interp = 4;
          if (this.f880 !== 0) {
            M.info1.mask = MASK_PIERNAS;
            M.info2.mask = ~MASK_PIERNAS;
            M.info1.f14 = 1;
          }
        } else M.action2 = 0;
      }
    }
    M.tick();
    const paso = rotY(this.rot, {
      x: M.paso[0],
      y: 0,
      z: M.paso[1]
    });
    if (M.action2 === 3 && this.f888 !== 0) {
      const lv = Math.max(0, this.dificultad());
      paso.x = Math.trunc(paso.x * (lv * 40 + 256) / 256);
      paso.z = Math.trunc(paso.z * (lv * 40 + 256) / 256);
    }
    this.control(paso);
    const s = sector(this.mov.x, this.mov.z);
    if ((s === 0 || s === 7) && this.mov.z < 8800) this.mov.z = 8800;
    if ((s === 3 || s === 4) && this.mov.z > 3200) this.mov.z = 3200;
    if ((s === 1 || s === 2) && this.mov.x < 300) this.mov.x = 300;
    if ((s === 5 || s === 6) && this.mov.x > -5300) this.mov.x = -5300;
    this.D158C();
    this.CF7FC();
    this.D15D4();
    const b = this.barras[0];
    b.rest = this.life_rest;
    b.now = this.life_now;
    if (this.life_now === this.life_rest) this.life_delay = 10; else if (--this.life_delay < 0) this.life_rest = nearSpeed(this.life_rest, this.life_now, 64);
    this.D168C();
    this.D1760();
  }
  dibujarTambor(x) {
    const t = this.mgr.hud.img.tama;
    if (!t || !t[0]) return;
    let X = 148;
    const Y = 28, cargando = this.f874 === 0, n = cargando ? this.f878 : this.f874, lleno = cargando ? t[1] : t[2];
    for (let i = 0; i < 6; i++, X += 6) x.drawImage(i < n ? lleno : t[0], 0, 0, 6, 12, X, Y, 6, 12);
  }
  estadoPrueba() {
    return {
      estado: this.st.state,
      sub: this.st.time,
      pos: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      rot: this.rot,
      sector: sector(this.mov.x, this.mov.z),
      balas: this.f874,
      recargas: this.f8F0,
      vital: this.vital,
      hp: this.hp,
      life_now: this.life_now,
      blanco: this.blanco,
      accion: this.motor.action,
      accion2: this.motor.action2,
      corriendo: this.f888,
      destino: this.param.i948,
      altura: this.motor.altura
    };
  }
}

export class Baker extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "BAKER";
    this.estadoAT = 0;
    this.anim_timer = 0;
    this.registro = [];
  }
  async iniciar() {
    await this.cargarCuerpo("jefes/baker.glb", "shacho");
    const p = this.actor.p || this.opts.p || [ -2500, 1e3, 6700 ], d = this.actor.d || this.opts.d || [ 0, 0, 0 ];
    this.mov.set(p[0], p[1], p[2]);
    this.rot = this.turn = d[1] & 4095;
    this.motor.accion(0, 0);
    const h = this.opts.h;
    if (Array.isArray(h) && typeof h[0] === "number") {
      this.frac_hp = h[0];
      this.max_hp = h[1];
    } else {
      this.max_hp = 192;
      this.frac_hp = 1024;
    }
    this.hp = Math.trunc(this.max_hp * 1024 / this.frac_hp);
    this.last_hp = this.hp;
    this.draw_lifebar = this.opt("l", 0);
    this.update = this.opt("u", 1);
    this.end_proc = this.procId("e") || -1;
    this.vital = this.max_hp;
    this.blanco = true;
    if (this.draw_lifebar) this.barras = [ {
      y: 40,
      rest: this.last_hp,
      now: this.hp,
      max: this.max_hp,
      conf: {
        nombre: "BAKER",
        izq: [ 31, 191, 95 ],
        der: [ 31, 191, 95 ],
        alto: 1
      }
    } ];
    const c = this.motor.clip(0);
    for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c.rot.slice(j * 3, j * 3 + 3);
    this.motor.altura = c.altura[0];
    this.piso = 0;
    const hp = this.J.alturaPiso?.(this.mov.x * MM, this.mov.z * MM, 1);
    if (hp != null) this.piso = Math.round(hp * 1e3);
    this.dibujar();
  }
  vitalBlanco() {
    return this.vital;
  }
  golpe(a_mode, daño = 0) {
    this.golpes.push({
      cuanto: daño,
      modo: a_mode === 2 ? 1 : a_mode,
      explosion: a_mode === 2 ? new THREE.Vector3 : null,
      frame: this.mgr.frame
    });
  }
  UpdateTarget() {
    const d = this.tomarDaño();
    if (!d) return;
    if (d.a_mode === 1) this.vital -= d.daño;
    if (this.estadoAT > -1 && this.estadoAT < 2) {
      this.sangre(this.puntoHueso(2, {
        x: 0,
        y: 0,
        z: 100
      }));
      if (d.a_mode === 2) this.vital = 0; else if (d.a_mode === 3) this.vital -= 10; else if (d.a_mode === 4) this.vital -= 20;
      const hp = Math.max(0, this.vital);
      this.hp = Math.trunc(hp * 1024 / this.frac_hp);
      if (hp <= 0) {
        this.estadoAT = 3;
        this.anim_timer = 0;
        this.motor.accion(3, 0);
        this.se2(129);
      } else {
        this.estadoAT = 2;
        this.anim_timer = 0;
        this.motor.accion(2, 0);
        this.se2(128);
        this.se2(139);
      }
      this.registro.push({
        f: this.mgr.frame,
        t: "daño",
        a_mode: d.a_mode,
        vital: this.vital
      });
    }
  }
  cuadro() {
    this.motor.tick();
    this.UpdateTarget();
    switch (this.estadoAT) {
     case 0:
      if (++this.anim_timer >= 60) {
        this.anim_timer = 0;
        if (this.update !== 0) {
          this.se(141, this.mov);
          this.estadoAT = 1;
          this.motor.accion(1, 0);
        }
      }
      break;

     case 1:
      if (this.motor.isEnd) {
        this.estadoAT = 0;
        this.motor.accion(0, 0);
      }
      break;

     case 2:
      if (++this.anim_timer >= 20) {
        this.anim_timer = 0;
        this.estadoAT = 0;
        this.motor.accion(0, 0);
      }
      break;

     case 3:
      if (this.motor.isEnd) {
        this.estadoAT = 4;
        this.motor.accion(4, 0);
        if (!this.J.muerto) {
          this.registro.push({
            f: this.mgr.frame,
            t: "GAME OVER"
          });
          if (this.end_proc > 0) this.ctx.alProc?.(this.actor, "e", this.end_proc);
          this.mgr.timerGO = 0;
          this.mgr.gameOver();
        }
      }
      break;
    }
    if (this.draw_lifebar) {
      const b = this.barras[0];
      b.rest = this.last_hp;
      b.now = this.hp;
      this.last_hp = nearSpeed(this.last_hp, this.hp, 4);
    }
  }
}

const C4 = [ [ 0, -20, 0, -100, 2048 ], [ 1, 530, 100, -50, 1024 ], [ 2, 530, 1200, -50, 1024 ], [ 3, 530, 2e3, -50, 1024 ], [ 13, 500, 100, 520, 512 ], [ 14, 500, 1200, 520, 512 ], [ 15, 500, 2e3, 520, 512 ], [ 4, -20, 100, 510, 0 ], [ 5, -20, 1200, 510, 0 ], [ 6, -20, 2e3, 510, 0 ], [ 19, -520, 100, 520, 3584 ], [ 20, -520, 1200, 520, 3584 ], [ 21, -520, 2e3, 520, 3584 ], [ 7, -540, 100, -100, 3072 ], [ 8, -540, 1200, -100, 3072 ], [ 9, -540, 2e3, -100, 3072 ], [ 22, -520, 100, -540, 2560 ], [ 23, -520, 1200, -540, 2560 ], [ 24, -520, 2e3, -540, 2560 ], [ 10, -20, 100, -550, 2048 ], [ 11, -20, 1200, -550, 2048 ], [ 12, -20, 2e3, -550, 2048 ], [ 16, 540, 100, -540, 1536 ], [ 17, 540, 1200, -540, 1536 ], [ 18, 540, 2e3, -540, 1536 ] ];

const ORDEN_EXPLOSION = [ 0, 3, 2, 1, 15, 14, 13, 6, 5, 4, 21, 20, 19, 9, 8, 7, 24, 23, 22, 12, 11, 10, 18, 17, 16 ];

const VERDE = [ 128, 175, 128 ], OSCURO = [ 32, 40, 32 ];

export class Cables extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "C4WIRE";
    this.registro = [];
  }
  async iniciar() {
    const p = this.opts.p || this.actor.p || [ -2500, 0, 6e3 ], d = this.opts.d || this.actor.d || [ 0, 0, 0 ];
    this.pos = new THREE.Vector3(p[0], p[1], p[2]);
    this.dirArg = d;
    this.f20D0 = this.opt("w", 0);
    this.o = new THREE.Group;
    this.o.name = "jefe_C4WIRE";
    this.mgr.mundo.add(this.o);
    const P = (x, y, z) => [ p[0] + x, y, p[2] + z ];
    const pt = [ P(1750, 2500, -2375), P(2375, 2500, -2375), P(2375, 2500, -1750), P(2375, 2500, 1750), P(2375, 2500, 2375), P(1750, 2500, 2375), P(-1750, 2500, 2375), P(-2375, 2500, 2375), P(-2375, 2500, 1750), P(-2375, 2500, -1750), P(-2375, 2500, -2375), P(-1750, 2500, -2375), P(-500, 1200, -500), P(500, 1200, -500), P(500, 1200, 500), P(-500, 1200, 500), P(1625, 1e3, -2500), P(2500, 1e3, -2500), P(2500, 1e3, -1625), P(2500, 1e3, 1625), P(2500, 1e3, 2500), P(1625, 1e3, 2500), P(-1625, 1e3, 2500), P(-2500, 1e3, 2500), P(-2500, 1e3, 1625), P(-2500, 1e3, -1625), P(-2500, 1e3, -2500), P(-1625, 1e3, -2500), P(-500, 600, -500), P(500, 600, -500), P(500, 600, 500), P(-500, 600, 500) ];
    const w = this.f20D0;
    const idx = [ 0, 1, 1, 2, 3, 4, 4, 5, 6, 7, 7, 8, 9, 10, 10, 11, 12, 13, 13, 14, 14, 15, 15, 12, 0, 12, 0, 14, 2, 12, 2, 14, 3, 13, 3, 15, 5, 13, 5, 5, 6, w ? 6 : 14, 6, 12, 8, 14, 8, 12, 9, 15, 9, 13, 11, 13, 11, 15, 16, 17, 17, 18, 19, 20, 20, 21, 22, 23, 23, 24, 25, 26, 26, 27, 28, 29, 29, 30, 30, 31, 31, 28, 16, 28, 16, 30, 18, 28, 18, 30, 19, 29, 19, 31, 21, 29, 21, w ? 21 : 31, 22, w ? 22 : 30, 22, 28, 24, 30, 24, 28, 25, 31, 25, 29, 27, 29, 27, 31 ];
    const col = [];
    const grupo = (n, a, b) => {
      for (let i = 0; i < n; i++) col.push(a, b);
    };
    grupo(8, VERDE, VERDE);
    grupo(4, OSCURO, OSCURO);
    grupo(16, VERDE, OSCURO);
    grupo(8, VERDE, VERDE);
    grupo(4, OSCURO, OSCURO);
    grupo(16, VERDE, OSCURO);
    const pos = [], cols = [];
    idx.forEach((k, i) => {
      pos.push(pt[k][0] * MM, pt[k][1] * MM, pt[k][2] * MM);
      const c = col[i] || VERDE;
      cols.push(c[0] / 255, c[1] / 255, c[2] / 255);
    });
    this.verts = idx.map(k => pt[k]);
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    this.lineas = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.lineas.userData.sinColision = true;
    this.o.add(this.lineas);
    this.c4 = [];
    const base = await cargarModelo(this.ctx, "jefes/c4.glb");
    for (const [k, dx, dy, dz, ry] of C4) {
      const m = base.clone(true);
      m.position.set((p[0] + dx) * MM, (p[1] + dy) * MM, (p[2] + dz) * MM);
      m.rotation.set(d[0] * ANG, ry * ANG, d[2] * ANG, "YXZ");
      this.o.add(m);
      this.c4[k] = m;
    }
    for (const m of this.c4) if (m) this.ctx.teñir?.(m);
    this.f166C = 0;
    this.wire_cut = 0;
    this.f20C4 = new THREE.Vector3(p[0], p[1] + 3e3, p[2]);
    this.f20BC = this.f20C4.clone();
    this.f20CC = 0;
    this.empuje = true;
  }
  cortar(motivo) {
    this.se2(182);
    this.wire_cut = 1;
    this.f166C++;
    if (this.mgr.gameOverTimer() === 0) {
      this.mgr.timerGO = -2;
      this.mgr.congelar(true);
    }
    this.empuje = false;
    this.registro.push({
      f: this.mgr.frame,
      t: motivo
    });
    this.mgr.alCortarCables?.(motivo);
  }
  CheckWireCut() {
    if (this.J.ctx.vuelo?.()) return;
    const s = this.snake(), px = s.x, pz = s.z;
    if (s.y - this.pisoSnake() > 300) {
      if (px <= 0 && px >= -5e3 && pz <= 8500 && pz >= 3500) {
        let toca = false;
        if (px >= -5e3 && px <= -4e3) toca = pz >= -px + 2500 || pz <= px + 9500; else if (px >= -4e3 && px <= -3500) toca = pz >= -px + 2500 && pz <= -px + 4500 || pz <= px + 9500 && pz >= px + 7500; else if (px >= -3500 && px <= -2500) toca = pz <= -px + 4500 && pz >= px + 7500; else if (px >= -2500 && px <= -1500) toca = pz >= -px + 2500 && pz <= px + 9500; else if (px >= -1500 && px <= -1e3) toca = pz <= px + 9500 && pz >= px + 7500 || pz <= -px + 4500 && pz >= -px + 2500; else if (px >= -1e3 && px <= 0) toca = pz >= px + 7500 && pz <= -px + 4500;
        if (toca) {
          this.cortar("Wire Cut!!");
          return;
        }
      }
    } else if (px <= -1500 && px >= -3500 && pz <= 7e3 && pz >= 5e3) {
      this.cortar("Wire Cut by HOFUKU!!");
      return;
    }
    if (this.f20CC === 1 && (px > -500 || px < -4500 || pz > 8e3 || pz < 4e3)) {
      this.f20CC = 0;
      this.f20BC.copy(this.f20C4);
    }
    this.empujar(s);
  }
  pisoSnake() {
    return Math.round(this.J.ctx.rig.position.y * 1e3);
  }
  empujar(s) {
    if (!this.empuje) return;
    const alt = [ 1100, 496, 136 ][this.J.postura?.() ?? 0], h = Math.max(500, Math.min(700, alt));
    if (s.y + h < this.f20BC.y - 2e3 || s.y - h > this.f20BC.y + 2e3) return;
    const push = (c1, s1, c2, s2) => {
      s1 += s2;
      const d = c2 - c1;
      if (d >= 0) return Math.max(0, s1 - d);
      return -Math.max(0, d + s1);
    };
    const x = push(this.f20BC.x, 2e3, s.x, 300), z = push(this.f20BC.z, 2e3, s.z, 300);
    if (x === 0 || z === 0) return;
    const rig = this.J.ctx.rig.position;
    if (Math.abs(x) <= Math.abs(z)) {
      rig.x += x / 2 * MM;
      this.f20BC.x += -Math.sign(x) * 150;
    } else {
      rig.z += z / 2 * MM;
      this.f20BC.z += -Math.sign(z) * 150;
    }
    this.f20CC = 1;
  }
  alExplotar(p) {
    if (this.wire_cut) return;
    const q = p.clone().multiplyScalar(1e3), B = 2e3;
    if (Math.abs(q.x - -2500) <= 2500 + B && Math.abs(q.z - 6e3) <= 2500 + B && q.y >= -B && q.y <= 2e4 + B) {
      this.cortar("Wire Cut by BAKUFUU!!");
      this.f166C = 15;
    }
  }
  TriggerDetonation() {
    const k = this.f166C - 30;
    if (k >= 0 && k < ORDEN_EXPLOSION.length) {
      const m = this.c4[ORDEN_EXPLOSION[k]];
      if (m) {
        const p = m.getWorldPosition(new THREE.Vector3);
        if (this.ctx.armas?.visualExplosion) this.ctx.armas.visualExplosion(p); else this.chispa(p, 2, 20);
        this.se(41, p.clone().multiplyScalar(1e3), "bomba");
        m.visible = false;
        for (const j of this.mgr.lista) if (j instanceof Baker && j.vivo) {
          const b = j.mov;
          if (Math.abs(b.x - p.x * 1e3) < 2400 && Math.abs(b.z - p.z * 1e3) < 2400) j.golpe(2, 256);
        }
      }
    }
    if (this.f166C === 55) {
      this.lineas.visible = false;
      this.registro.push({
        f: this.mgr.frame,
        t: "fin detonación"
      });
    }
    this.f166C++;
  }
  cuadro() {
    if (this.wire_cut === 0) this.CheckWireCut(); else if (this.f166C <= 55) this.TriggerDetonation();
  }
  dibujar() {}
}
