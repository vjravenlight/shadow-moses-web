// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Sistema, Personaje, PLAYER, STATE, MM, ANG, ratan2, difS, difAbs, vecDir, tomarPendientes, asentir } from "./comun.js";

import { cargarModelo } from "../jefes/base.js";

export const MOV_DOLL = new Set([ "0f27", "0f47", "1eca", "2a3a", "2f4f", "2f50", "3469", "3d38", "4d39", "4d79", "54f9", "57cd", "773b", "9ac9", "af5d", "b65a", "c118", "c3b6", "d669", "e978" ]);

const idDe = v => {
  const x = Array.isArray(v) ? v[0] : null;
  return typeof x === "number" ? x : x && typeof x === "object" ? x.id ?? x.proc ?? null : null;
};

const hex4 = n => (n & 65535).toString(16).padStart(4, "0");

export const esMuneco = a => {
  if (!a) return false;
  if (a.tipo === "FINDTRAP") return true;
  if (a.tipo !== "DEMODOLL" || !a.modelo) return false;
  const o = idDe(a.opts?.o);
  return o != null && MOV_DOLL.has(hex4(o));
};

const H = {
  KILL: 12835,
  SOUND_ON: 10081,
  SOUND_OFF: 60799,
  ENTER: 3538,
  LEAVE: 54732,
  FIND2: 17116
};

const BITS = [ 0, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 29, 30, 31 ];

const ESPERAS = [ 31e3, 15, 30, 60, 90, 32e3, 32001, 3e4 ];

const nums = v => Array.isArray(v) ? v.filter(x => typeof x === "number") : [];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const bitIndice = b => {
  for (let i = 0; i < 13; i++) if (b & 1 << i) return i + 2;
  return -1;
};

class Muneco extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = actor.nombre;
    this.lado = "jugador";
    this.blanco = false;
    this.msgs = [];
  }
  log(t, extra = {}) {
    this.sis.log("doll " + t, {
      nombre: this.nombre,
      ...extra
    });
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    const w = Array.isArray(o.w) ? o.w[0] : null, arma = w && (w.n === "famas" || w.id === 18213) ? "armas/famas.glb" : null;
    await this.cargarCon(a.modelo, "doll_" + hex4(idDe(o.o)), arma);
    if (!this.vivo) return;
    this.o.userData.actor = a;
    this.o.userData.muñeco = true;
    this.adjOn = true;
    const r = nums(o.r)[0] ?? 0;
    this.pts = a.puntos?.length ? a.puntos.map(q => ({
      p: V(q.p[0], q.p[1], q.p[2]),
      cmd: q.cmd | 0
    })) : this.ruta(r).map(q => ({
      p: q.p.clone(),
      cmd: q.cmd | 0
    }));
    if (!this.pts.length) {
      const p = a.p || [ 0, 0, 0 ];
      this.pts = [ {
        p: V(p[0], p[1], p[2]),
        cmd: 0
      } ];
    }
    this.fC30 = ESPERAS.slice();
    nums(o.f).slice(0, 4).forEach((v, i) => {
      this.fC30[i + 1] = v;
    });
    this.fC40 = [ 0, 1024, 2048, 3072 ];
    nums(o.v).slice(0, 4).forEach((v, i) => {
      this.fC40[i] = v;
    });
    this.fC48 = Array.from({
      length: 15
    }, () => []);
    const x = nums(o.x);
    for (let i = 0; i + 2 < x.length; i += 3) {
      const m = x[i];
      if (this.fC48[m] && this.fC48[m].length < 4) this.fC48[m].push({
        cuadro: x[i + 1],
        se: x[i + 2] & 255,
        modo: x[i + 2] >> 8 & 3,
        pie: x[i + 2] >> 10 & 3
      });
    }
    this.fE18 = nums(o.s).slice(0, 8);
    while (this.fE18.length < 9) this.fE18.push(0);
    this.fE38 = -1;
    this.fDF8 = nums(o.b)[0] ?? 1;
    this.fE60 = (o.a || []).slice(0, 8).map(p => p && typeof p === "object" && "proc" in p ? p.proc : typeof p === "number" ? p : -1);
    while (this.fE60.length < 8) this.fE60.push(-1);
    this.fE48 = nums(o.n).slice(0, 16);
    this.fE5C = this.procDe("e");
    this.fE80 = nums(o.z)[0] ?? 0;
    this.fE3C = nums(o.k)[0] ?? 6;
    this.fE3E = nums(o.h)[0] ?? 0;
    this.fDFE = nums(o.i)[0] ?? -1;
    this.fE00 = [ 0, 1 ];
    this.fE44 = 0;
    this.fE40 = 0;
    this.fDFC = 0;
    this.fC10 = 0;
    this.fC14 = 0;
    this.fC18 = 0;
    this.fB94 = 0;
    this.fC0A = -1;
    this.fBFC = 0;
    this.fC08 = 0;
    this.fC04 = 0;
    this.fC0E = 0;
    this.fC1C = 0;
    this.fC20 = 0;
    this.fBE0 = 0;
    this.fBE4 = 0;
    this.fBD0 = null;
    this.fBD8 = 0;
    this.fA78 = 0;
    this.fBA0 = this.pts[0];
    this.mov.copy(this.pts[0].p);
    this.rot = this.turn = this.fC40[(this.pts[0].cmd & 768) >> 8] & 4095;
    this.interpCtrl = 4;
    await this.sis.flujo.precargar(this.fE18.filter(v => v > 0));
    const act = this.pts[0].cmd & 31;
    if (act > 0 && act < 16) {
      this.pose0(act + 1);
      this.motor.accion(act + 1, 0);
      this.fBE0 = act + 1;
      this.fC04 = act;
      this.fC08 = 1;
      this.fBD0 = this.aDDB18;
      this.fBD8 = 0;
    } else {
      this.pose0(0);
      this.motor.accion(0, 0);
    }
    this.mov.y += this.motor.altura;
    this.rSphere = -1;
    this.actControl();
    this.dibujar();
    this.log("inicio", {
      mov: hex4(idDe(o.o)),
      puntos: this.pts.length,
      voces: this.fE18.filter(Boolean)
    });
  }
  recibir(v) {
    this.msgs.push(v[0]);
    return true;
  }
  cuadro() {
    if (this.msgs.includes(H.KILL)) {
      this.morir();
      return;
    }
    for (const m of this.msgs) {
      if (m === H.SOUND_ON) this.fE00[1] = 1; else if (m === H.SOUND_OFF) this.fE00[1] = 0;
    }
    this.actControl();
    this.actMotion();
    this.aDDF18();
    this.msgs = [];
  }
  morir() {
    if (!this.vivo) return;
    this.log("fin");
    if (this.fE5C > 0) this.execProc(this.fE5C, []);
    this.destruir();
  }
  aDDEC8() {
    const sn = this.snake(), dx = sn.x - this.mov.x, dz = sn.z - this.mov.z;
    this.fE08 = vecDir(dx, dz);
    this.fE0C = Math.round(Math.hypot(dx, dz));
  }
  aDDF18() {
    this.aDDEC8();
    this.aDEA04();
    if (this.vivo) this.aDDD84();
  }
  aDDD84() {
    const cb0 = this.fBD0, arg = this.fBD8++;
    this.fBE4 = 0;
    this.fE00[0] = 0;
    const cb = cb0 || (this.fBD0 = this.aDD798);
    cb(arg);
    this.cabeza();
    if (this.fE3E !== 0 && this.J.gvTime % 64 === this.fE3E * 16) this.chispa(this.puntoHueso(this.fE3C, {
      x: 0,
      y: 0,
      z: 100
    }), .16, 20, 14540253);
    this.rSphere = -1;
    if (this.fA78 < 0 && this.grounded) this.fA78 = 0;
    this.fA78 -= 16;
    this.step.y = this.fA78;
  }
  cabeza() {
    asentir(this.adjust?.[this.fE3C], this.sis.boca(this.nombre));
  }
  sonidos(m) {
    for (const e of this.fC48[m] || []) if (e.cuadro === this.motor.info1.frame) {
      if (this.fE00[1] !== 0) this.se(e.se, this.mov, e.modo === 1 ? "bomba" : null);
      if (e.pie !== 0) this.fE00[0] = e.pie;
    }
  }
  accionDoll(a, interp = 4) {
    this.motor.accion(a, interp);
  }
  aDD6A8() {
    if (this.fBFC & 8191) {
      this.fBD0 = this.aDDB18;
      this.fBD8 = 0;
      return 1;
    }
    return 0;
  }
  aDD798=arg => {
    if (arg === 0) {
      this.fBE0 = 0;
      this.accionDoll(0);
    }
    if (this.aDD6A8()) {
      if (this.fC0A >= 0) this.turn = this.fC0A;
    } else {
      if (this.fC0A >= 0) {
        this.fBD0 = this.aDD860;
        this.fBD8 = 0;
        this.turn = this.fC0A;
      }
      this.step.set(0, this.step.y, 0);
    }
  };
  aDD860=arg => {
    const vy = this.fC0A;
    if (arg === 0) {
      this.fBE0 = this.fDFC === 0 || this.fDFE < 0 ? 1 : this.fDFE + 1;
      this.accionDoll(this.fBE0);
    }
    if (this.fBE0 === 1) {
      if (this.fDFC !== 0) {
        this.fBE0 = this.fDFE + 1;
        this.accionDoll(this.fBE0);
      }
    } else if (this.fDFC === 0) {
      this.fBE0 = 1;
      this.accionDoll(1);
    }
    if (vy < 0) {
      this.fBD0 = this.aDD798;
      this.fBD8 = 0;
      return;
    }
    this.turn = vy;
    this.sonidos(this.fBE0);
  };
  aDDB18=() => {
    const b = this.fBFC, i = bitIndice(b);
    if (i > 0 && i !== this.fBE0) {
      this.fBE0 = i;
      this.accionDoll(i);
    }
    if ((b & 8191) === 0) {
      this.fBE0 = 0;
      this.accionDoll(0);
      this.fBD0 = this.aDD798;
      this.fBD8 = 0;
    }
    if (this.motor.isEnd !== 0) {
      this.fBE4 = 1;
      return;
    }
    this.sonidos(this.fBE0);
  };
  aDDF84() {
    this.fB94++;
    if (this.fB94 >= this.pts.length) this.fB94 = 0;
    this.fBA0 = this.pts[this.fB94];
    if ((this.fBA0.cmd & 31) === 31) this.morir();
  }
  aDE024(size) {
    const dx = this.fBA0.p.x - this.mov.x, dz = this.fBA0.p.z - this.mov.z;
    if (dx > -size && dx < size && dz > -size && dz < size) return 1;
    this.fC0A = vecDir(dx, dz);
    this.fC1C++;
    return 0;
  }
  aDE0AC() {
    const dx = this.fBA0.p.x - this.mov.x, dz = this.fBA0.p.z - this.mov.z, yaw = vecDir(dx, dz);
    if (dx > -250 && dx < 250 && dz > -250 && dz < 250) {
      const dist = Math.hypot(dx, dz), paso = Math.hypot(this.step.x, this.step.z);
      if (dist < paso) {
        this.mov.x = this.fBA0.p.x;
        this.mov.z = this.fBA0.p.z;
        this.step.set(0, this.step.y, 0);
        return 1;
      }
    }
    if (difAbs(yaw, this.rot) > 64) this.turn = yaw; else this.fC0A = yaw;
    this.fC1C++;
    return 0;
  }
  aDE264(i) {
    if (this.sis.streamStatus() === -1) {
      this.fE38++;
      const c = this.fE18[this.fE38];
      if (c > 0) this.sis.voxStream(c, 0);
      this.log("voz", {
        c: c
      });
    } else this.sis.streamPlayStart();
  }
  aDE2E8(i) {
    const p = this.fE60[i];
    if (p >= 0) {
      this.log("proc", {
        proc: p
      });
      this.execProc(p, []);
    }
  }
  aDE320() {
    return this.msgs.includes(this.fC0E) ? 1 : 0;
  }
  aDE390() {
    for (let vueltas = 0; vueltas < 64; vueltas++) {
      const c = this.fBA0.cmd, voz = c & 31, dir = (c & 768) >> 8, k = (c & 64512) >> 10;
      this.fC08 = this.fC30[(c & 224) >> 5];
      if (this.fC08 === 32001) this.fC0E = k; else if (this.fC08 === 32e3) {
        this.fC0E = k;
        this.fE44 = 0;
        this.fE40 = 0;
      }
      if (voz >= 16 && voz <= 25 || voz === 30) {
        if (voz === 30) this.aDE2E8(k); else this.aDE264(voz);
        this.fC08 = 0;
        this.fC0A = this.rot;
        this.aDDF84();
        if (!this.vivo || !this.aDE024(350)) return 0;
        continue;
      }
      this.fC04 = BITS[voz];
      if (this.fC04 === 29) {
        this.fDFC = this.fDFC === 0 ? 1 : 0;
        this.fC08 = 0;
        this.aDDF84();
        return 0;
      }
      if (this.fC04 === 0 && this.fC08 === 31e3) {
        this.fC08 = 0;
        this.fC0A = this.rot;
        this.aDDF84();
        return 0;
      }
      if (this.fC04 === 15) {
        this.fC08 = 0;
        this.fC0A = this.rot;
        return 0;
      }
      this.fC0A = this.fC40[dir];
      return 1;
    }
    return 0;
  }
  lineas() {
    const f = this.sis.flujo;
    if (f.estado !== 2 || !f.listo?.datos?.sub) return 0;
    const s = f.segundos();
    return f.listo.datos.sub.filter(x => s >= x[0]).length;
  }
  aDE550() {
    const ag = () => {
      this.fBFC |= this.fC04;
      return 0;
    };
    if (this.fC08 === 32001) {
      if (this.aDE320()) {
        this.fC0E = 0;
        this.fC08 = 0;
        return 1;
      }
      return ag();
    }
    if (this.fC08 === 31e3) {
      if (this.fBE4 !== 0) {
        this.fC08 = 0;
        return 1;
      }
      return ag();
    }
    if (this.fC08 === 32e3) {
      if (this.fC0E === 0) {
        if (this.sis.streamStatus() === -1) {
          this.fC08 = 0;
          return 1;
        }
        return ag();
      }
      if ((this.fE48[this.fC0E - 1] ?? 0) <= this.lineas() || this.sis.streamStatus() === -1) {
        this.fC08 = 0;
        return 1;
      }
      return ag();
    }
    if (this.fC08 > 0) {
      this.fBFC |= this.fC04;
      this.fC08--;
      return 0;
    }
    return 1;
  }
  aDE670() {
    if (this.fC08 > 0) {
      this.fBFC |= this.fC04;
      this.fC08--;
    }
    return this.aDE024(350) !== 0;
  }
  aDE6C4() {
    if (this.aDE0AC()) return 1;
    this.fC1C++;
    return 0;
  }
  hacer() {
    this.fBFC |= this.fC04;
    if (this.fC0A >= 0) this.turn = this.fC0A;
  }
  aDE784() {
    switch (this.fC18) {
     case 0:
      if (!this.aDE670()) break;
      if (this.aDE390()) {
        this.hacer();
        this.fC18 = 2;
      } else if (this.fC04 === 15) this.fC18 = 1;
      this.fC1C = 0;
      break;

     case 1:
      if (!this.aDE6C4()) break;
      this.aDDF84();
      if (!this.vivo) return;
      if (!this.aDE024(350)) {
        this.fC18 = 0;
        this.fC1C = 0;
        break;
      }
      if (this.aDE390()) {
        this.hacer();
        this.fC18 = 2;
      } else if (this.fC04 !== 15) this.fC18 = 0;
      this.fC1C = 0;
      break;

     case 2:
      if (!this.aDE550()) break;
      this.aDDF84();
      if (!this.vivo) return;
      if (this.aDE024(350)) {
        if (this.aDE390()) {
          this.fBFC |= this.fC04;
          if (this.fC0A >= 0) {
            this.turn = this.fC0A;
            this.fC0A = -1;
          }
        } else this.fC18 = this.fC04 !== 15 ? 0 : 1;
      } else this.fC18 = 0;
      this.fC1C = 0;
      break;
    }
  }
  aDEA04() {
    this.fC0A = -1;
    this.fBFC = 0;
    if (this.fC10 === 0 && this.fC14 === 0) this.aDE784();
    this.fC20++;
    if (this.vivo && this.fDF8 !== 0 && this.sis.streamStatus() === -1 && this.fE18[this.fE38 + 1] > 0) {
      this.fE38++;
      this.sis.voxStream(this.fE18[this.fE38], 1073741824);
    }
  }
  estadoPrueba() {
    return {
      nombre: this.nombre,
      pos: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      rot: this.rot,
      punto: this.fB94,
      cmd: this.fBA0?.cmd,
      fC18: this.fC18,
      fC08: this.fC08,
      fC04: this.fC04,
      fC0E: this.fC0E,
      mov: this.fBE0,
      anim: this.motor?.action,
      cuadroAnim: this.motor?.info1.frame,
      voz: this.fE38,
      sonido: this.fE00[1]
    };
  }
}

class TrampaMirada {
  constructor(actor, mgr, sis) {
    this.actor = actor;
    this.mgr = mgr;
    this.sis = sis;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    this.nombre = actor.nombre;
    this.vivo = true;
    this.listo = true;
    this.blanco = false;
    this.barras = [];
    this.o = null;
    this.msgs = [];
    const o = actor.opts || {}, p = nums(o.p), s = nums(o.s);
    this.pos = V(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    const e = Array.isArray(o.e) ? o.e[0] : null;
    this.proc = e && typeof e === "object" && "proc" in e ? e.proc : typeof e === "number" ? e : -1;
    this.tam = [ s[0] ?? 160, s[1] ?? 112 ];
    this.wait = nums(o.w)[0] ?? 0;
    this.flag = 0;
    this.ev = null;
    this.listoEv = 0;
  }
  recibir(v) {
    this.msgs.push(v[0]);
    return true;
  }
  log(t, extra = {}) {
    this.sis.log("findtrap " + t, {
      nombre: this.nombre,
      ...extra
    });
  }
  primeraPersona() {
    return !!(this.sis.estadoSnake() & PLAYER.WATCH) && !this.J.sn?.mov;
  }
  enCentro() {
    const cam = typeof window !== "undefined" ? window.__mgs?.cam : null;
    if (!cam) return false;
    const q = V(this.pos.x * MM, this.pos.y * MM, this.pos.z * MM).project(cam);
    if (q.z > 1 || q.z < -1) return false;
    const x = q.x * 160, y = q.y * 120;
    return x < this.tam[0] && -this.tam[0] < x && y < this.tam[1] && -this.tam[1] < y;
  }
  cuadro() {
    let k = -1;
    for (const m of this.msgs) {
      const i = [ H.ENTER, H.LEAVE, H.FIND2, H.KILL ].indexOf(m);
      if (i >= 0) k = i;
    }
    this.msgs = [];
    if (k === 3) {
      this.destruir();
      return;
    }
    if (k === 0) {
      if (this.flag === 0) this.flag = 1;
    } else if (k === 1) this.flag = 0; else if (k === 2) {
      this.flag = 8;
      this.ev = {
        tipo: 2,
        t: this.wait
      };
      this.log("vuelve");
    }
    if (this.flag & 1) {
      if (this.flag === 1 && this.primeraPersona() && this.enCentro()) {
        this.flag |= 2;
        this.sis.ponerEstado(STATE.PADRELEASE);
        const r = this.J.ctx.rig.position, dx = this.pos.x * MM - r.x, dz = this.pos.z * MM - r.z, ojoY = r.y + 1.6;
        this.ev = {
          tipo: 1,
          t: this.wait,
          yaw: Math.atan2(-dx, -dz),
          pitch: Math.atan2(this.pos.y * MM - ojoY, Math.hypot(dx, dz))
        };
        this.listoEv = 0;
        this.log("mira", {
          wait: this.wait
        });
      }
      if (this.flag & 2 && this.listoEv) {
        this.flag &= ~2;
        this.flag |= 4;
        this.log("proc", {
          proc: this.proc
        });
        if (this.ctx.proc && this.proc > 0) this.ctx.proc(this.proc, []); else this.mgr.correrProc(this.proc, []);
      }
    }
    this.camara();
  }
  camara() {
    const e = this.ev;
    if (!e) return;
    const M = typeof window !== "undefined" ? window.__mgs : null;
    if (e.tipo === 1) {
      if (e.t >= 0) {
        if (e.t < 16 && M) {
          const k = 1 / Math.max(1, e.t + 1);
          M.yaw = (this.yaw0 ?? e.yaw) + (e.yaw - (this.yaw0 ?? e.yaw)) * k;
          M.pitch = e.pitch;
          this.yaw0 = e.yaw;
        }
        if (--e.t < 0) this.listoEv = 1;
      }
    } else if (e.tipo === 2) {
      if (--e.t < 0) {
        this.listoEv = 0;
        this.ev = null;
        this.sis.sacarEstado(STATE.PADRELEASE);
        this.log("fin");
      }
    }
  }
  dibujar() {}
  destruir() {
    this.vivo = false;
    if (this.ev) this.sis.sacarEstado(STATE.PADRELEASE);
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

export function crearMuneco(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esMuneco(actor)) return null;
  const sis = Sistema.de(J, ctx), mgr = sis.mgr;
  for (const j of mgr.lista.slice()) if (j.vivo && j.actor && (j.actor === actor || j.actor.tipo === actor.tipo && j.nombre === actor.nombre)) j.destruir();
  if (actor.tipo === "FINDTRAP") {
    const t = new TrampaMirada(actor, mgr, sis);
    mgr.agregar(t);
    sis.receptores.push(t);
    actor._meryl = t;
    t.cargando = Promise.resolve(t);
    for (const v of tomarPendientes(actor.nombre, ctx.nivel?.id)) t.recibir(v);
    return t;
  }
  const quietos = [];
  (ctx.mundo || J.ctx.mundo)?.traverse(o => {
    if (o.userData.actor === actor && !o.userData.jefe) quietos.push(o);
  });
  for (const o of quietos) o.removeFromParent();
  const m = new Muneco(actor, mgr, sis);
  mgr.agregar(m);
  sis.receptores.push(m);
  for (const v of tomarPendientes(actor.nombre, ctx.nivel?.id)) m.recibir(v);
  m.cargando = m.iniciar().then(() => {
    m.listo = true;
    actor._meryl = m;
    return m;
  }).catch(e => {
    console.warn("[muñecos]", actor.tipo, e);
    m.vivo = false;
    for (const o of quietos) (ctx.mundo || J.ctx.mundo)?.add(o);
    return null;
  });
  const d0 = m.destruir.bind(m);
  m.destruir = () => {
    d0();
    const k = sis.receptores.indexOf(m);
    if (k >= 0) sis.receptores.splice(k, 1);
  };
  return m;
}
