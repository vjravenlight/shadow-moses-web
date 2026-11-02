// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Sistema, Personaje, PLAYER, STATE, MM, ANG, ratan2, difS, difAbs, randU, randS, vecDir } from "./comun.js";

import { Meryl7 } from "./meryl7.js";

import { crearPerros, esPerro } from "./perros.js";

import { crearMuneco, esMuneco } from "./munecos.js";

import { crearTortura, esTortura } from "./tortura.js";

import { crearCelda, esCelda } from "./celda.js";

export const TIPOS_MERYL = new Set([ "MERYL3", "MERYL72", "MERYL7" ]);

export const esMeryl = actor => !!actor && (TIPOS_MERYL.has(actor.tipo) || esPerro(actor) || esMuneco(actor) || esTortura(actor) || esCelda(actor));

const num = (v, d) => Array.isArray(v) && typeof v[0] === "number" ? v[0] : d;

const nums = v => Array.isArray(v) ? v.filter(x => typeof x === "number") : [];

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const ZAKOCOM_S03 = {
  a: [ 61984, 16205, 46811, 58826, 16101, 65100 ],
  s: [ 12039, 12065, 0 ],
  e: 17720
};

export class FugaS03d {
  static de(J, sis) {
    if (!J.__fugaS03d) {
      J.__fugaS03d = new FugaS03d(J, sis);
      sis.tareas.push(J.__fugaS03d);
    }
    return J.__fugaS03d;
  }
  constructor(J, sis) {
    this.J = J;
    this.sis = sis;
    this.fase = 0;
    this.cuenta = 0;
    this.muertos = 0;
    this.externa = false;
    this.zakocom = {
      ...ZAKOCOM_S03
    };
    this.estadoG = new WeakMap;
    this.modoAntes = 0;
    this.terminada = false;
    const zc = sis.ctx.nivel?.actores?.find(a => a.tipo === "ZAKOCOM");
    if (zc) this.configurar(zc);
  }
  configurar(a) {
    const pr = v => Array.isArray(v) ? v.map(x => x && typeof x === "object" && "proc" in x ? x.proc : -1) : null;
    const o = a?.opts || {};
    if (pr(o.a)) this.zakocom.a = pr(o.a);
    if (nums(o.s).length) this.zakocom.s = nums(o.s);
    if (pr(o.e)?.[0] > 0) this.zakocom.e = pr(o.e)[0];
  }
  contar() {
    const z = this.sis.ctx.zakos?.();
    if (z) {
      this.muertos = z.muertos;
      return z;
    }
    const gs = this.J.ctx.guardias || [];
    for (const g of gs) {
      const m = g.accion === "muerto" || g.vital <= 0;
      if (m && !this.estadoG.get(g)) this.muertos++;
      this.estadoG.set(g, m);
    }
    return {
      muertos: this.muertos,
      vivos: gs.filter(g => !g.inactivo && g.accion !== "muerto" && g.vital > 0).length
    };
  }
  proc(i) {
    const p = this.zakocom.a[i];
    if (p > 0) {
      this.sis.log("fuga proc", {
        i: i,
        proc: p
      });
      this.sis.ctx.proc?.(p, []);
    }
  }
  comandanteZako() {
    const c = this.J.__zakos?.comandanteDe?.("ZAKO");
    return c && typeof c.flag === "number" ? c : null;
  }
  cuadro() {
    const zc = this.comandanteZako();
    if (zc) {
      if (!this.externa) this.sis.log("fase fuga: la lleva el ZAKOCOM de zako.js");
      this.externa = true;
      this.fase = zc.flag;
      this.muertos = zc.muertes ?? this.muertos;
      return;
    }
    if (this.externa || this.terminada) return;
    const S = this.sis, modo = this.J.modo ?? 0;
    if (modo === 1 && this.modoAntes !== 1) this.muertos = 0;
    this.modoAntes = modo;
    const z = this.contar();
    if (S.mgr.gameOverTimer() !== 0 || S.vida() <= 0) return;
    const antes = this.fase;
    switch (this.fase) {
     case 0:
      if (this.cuenta === 0 && S.streamStatus() === -1) S.voxStream(this.zakocom.s[0], 1073741824);
      if (this.muertos !== 0) {
        this.fase = 1;
        this.cuenta = 0;
      }
      this.cuenta++;
      break;

     case 1:
      if (this.muertos < 3) break;
      S.cine(true);
      this.fase = 2;
      this.cuenta = 0;
      S.ponerEstado(STATE.PADRELEASE | 663552);
      break;

     case 2:
      if (this.cuenta === 0) {
        if (S.streamStatus() === 1) S.streamPlayStart();
        this.proc(5);
        if (!S.ctx.proc) S.correrSnake(8e3, 1e3);
      }
      if (this.cuenta >= 11) {
        this.fase = 3;
        this.cuenta = 0;
      }
      this.cuenta++;
      break;

     case 3:
      if (this.cuenta >= 31) {
        this.proc(0);
        this.fase = 4;
        this.cuenta = 0;
      }
      this.cuenta++;
      break;

     case 4:
      if (this.cuenta >= 61 && S.streamStatus() === -1) {
        S.voxStream(this.zakocom.s[1], 0);
        this.proc(1);
        this.fase = 5;
        this.cuenta = 0;
        if (S.correr) {
          const r = this.J.ctx.rig.position;
          r.x = 8;
          r.z = 1;
          S.correr = null;
        }
      }
      this.cuenta++;
      break;

     case 5:
      if (this.cuenta === 60) {
        this.proc(2);
        this.fase = 6;
        this.cuenta = 0;
      }
      this.cuenta++;
      break;

     case 6:
      if (this.cuenta === 30) this.proc(3);
      if (this.cuenta === 180) this.proc(4);
      if (this.cuenta >= 183) {
        S.cine(false);
        this.fase = 8;
        this.cuenta = 0;
        S.sacarEstado(STATE.PADRELEASE | 663552);
      }
      this.cuenta++;
      break;

     case 8:
      if (this.muertos === 13 || this.muertos === 14) {
        this.fase = 9;
        this.cuenta = 0;
      }
      this.cuenta++;
      break;

     case 9:
      if (this.muertos >= 15) {
        this.fase = 10;
        this.cuenta = 0;
      }
      break;

     case 10:
      {
        const c = this.cuenta;
        this.cuenta = c + 2;
        if (c + 1 >= 31) {
          this.fase = 11;
          this.cuenta = 0;
        }
        break;
      }

     case 11:
      {
        const c = this.cuenta;
        this.cuenta = c + 2;
        if (c + 1 >= 221) this.fase = 12;
        break;
      }

     case 12:
      if (this.muertos >= 17) {
        this.fase = 13;
        this.cuenta = 0;
      }
      break;

     case 13:
      if (modo !== 0) break;
      this.fase = 14;
      this.cuenta = 0;
      if (z.vivos > 0) this.fase = 13;
      break;

     case 14:
      {
        const c = this.cuenta;
        this.cuenta = c + 1;
        if (c >= 31) this.fase = 15;
        break;
      }
    }
    if (this.fase !== antes) S.log("fase fuga", {
      de: antes,
      a: this.fase,
      muertos: this.muertos
    });
    if (this.fase === 15) {
      this.terminada = true;
      if (this.zakocom.e > 0) S.ctx.proc?.(this.zakocom.e, []);
    }
  }
}

const M3_ACT = [ 0, 1, 0, 4, 3, 2, 5, 0 ];

const M3 = {
  STANDSTILL: 0,
  WALK: 1,
  GUNSHOOT: 2,
  SITUP: 3,
  DAMAGE: 4,
  RUN: 5,
  RELOAD: 6
};

const PAD = {
  L2: 1,
  R2: 2,
  L1: 4,
  R1: 8
};

const AIMPOS = V(4e3, 0, 500), AIMPOS2 = V(5e3, 0, 500);

const BOCA_FAMAS = {
  x: 5,
  y: -500,
  z: 80
};

export class Meryl3 extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = "MERYL3";
    this.lado = "jugador";
    this.tamBlanco = [ 300, 1500, 300 ];
    this.think1 = 0;
    this.think2 = 0;
    this.think3 = 0;
    this.count1 = 0;
    this.count3 = 0;
    this.pad = {
      press: 0,
      dir: -1
    };
    this.trg_yaw = 0;
    this.trg_pitch = 0;
    this.f970 = 0;
    this.f990 = 0;
    this.time = 0;
    this.action = null;
    this.nAction = 0;
    this.height = 0;
    this.vital = 6e4;
    this.golpesE = [];
    this.disparos = 0;
    this.registro = [];
    this.fuga = FugaS03d.de(this.J, sis);
  }
  async iniciar() {
    await Promise.all([ this.cargarCon("personajes/meryl_hei.glb", "melhei03", "armas/famas.glb"), this.sis.flujo.precargar(this.fuga.zakocom.s) ]);
    const d = this.actor.d || [ 0, 0, 0 ];
    this.rot = this.turn = d[1] & 4095;
    this.mov.set(8e3, 0, -1e3);
    this.interpCtrl = 4;
    this.rSphere = -1;
    this.pose0(0);
    this.mov.y = this.motor.altura;
    this.actControl();
    this.dibujar();
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  setMode(fn) {
    this.action = fn;
    this.time = 0;
  }
  setAction(n, interp) {
    this.nAction = n;
    this.motor.accion(M3_ACT[n], interp);
  }
  unsetMode() {
    this.motor.override(M3_ACT[0], 4, 0);
  }
  claseActiva() {
    this.blancoEnemigo = true;
  }
  checkPad() {
    const p = this.pad.press;
    if (p & PAD.L2) {
      this.setMode(this.actAim);
      return 1;
    }
    if (p & PAD.L1) {
      this.setMode(this.actRun);
      return 1;
    }
    if (p & PAD.R1) {
      this.setMode(this.actReload);
      return 1;
    }
    return 0;
  }
  checkTarget() {
    if (!this.golpesE.length) return 0;
    const g = this.golpesE.splice(0);
    this.vital -= g.reduce((s, x) => s + x.daño, 0);
    this.setMode(this.actDamage);
    this.log("golpe", {
      n: g.length
    });
    return 1;
  }
  golpeEnemigo(g) {
    this.golpesE.push(g);
  }
  adjustTarget() {
    const p = this.trg_pitch, a = this.adjust;
    a[2][0] = p;
    a[6][0] = p;
    a[7][0] = p < 0 ? p * 3 : Math.trunc(p * 3 / 2);
  }
  famasShoot() {
    const o = this.puntoHuesoMM(4, BOCA_FAMAS), d = this.ejeHuesoMundo(4, V(0, -1, 0));
    this.sis.nuevaBala(o, d, {
      lado: 1,
      "daño": 65,
      largo: 1e4,
      vel: 750,
      de: this
    });
    this.se(46, this.mov, "bomba");
    this.chispa(o.clone().multiplyScalar(MM), .3, 2, 16769184);
    this.disparos++;
    this.log("tiro", {
      yaw: this.trg_yaw,
      dir: vecDir(d.x, d.z)
    });
  }
  actStandStill=t => {
    this.step.x = 0;
    this.step.z = 0;
    if (t === 0) this.setAction(M3.STANDSTILL, 4);
    if (this.checkTarget()) return;
    if (this.checkPad()) return;
    if (this.pad.dir >= 0) this.setMode(this.actWalk);
    this.step.set(0, 0, 0);
    this.claseActiva();
  };
  actWalk=t => {
    const dir = this.pad.dir;
    if (t === 0) this.setAction(M3.WALK, 4);
    if (this.checkTarget()) return;
    if (this.checkPad()) return;
    if (dir < 0) {
      this.setMode(this.actStandStill);
      this.unsetMode();
      return;
    }
    this.turn = dir;
    const dis = t < 10 ? t * 4 : 40;
    this.step.x = Math.trunc(dis * Math.round(Math.sin(dir * ANG) * 4096) / 4096);
    this.step.z = Math.trunc(dis * Math.round(Math.cos(dir * ANG) * 4096) / 4096);
    this.claseActiva();
  };
  actRun=t => {
    this.step.x = 0;
    this.step.z = 0;
    if (t === 0) this.setAction(M3.RUN, 4);
    if (this.checkTarget()) return;
    if (!(this.pad.press & PAD.L1)) {
      if (!this.checkPad()) this.setMode(this.actStandStill);
      return;
    }
    this.turn = this.trg_yaw;
    this.claseActiva();
  };
  actReload=t => {
    if (t === 0) this.setAction(M3.GUNSHOOT, 4);
    if (t < 30 && t % 8 === 0) this.se(4, this.mov, "bomba");
    if (t === 30) {
      this.setAction(M3.RELOAD, 4);
      this.log("recarga");
    }
    if (t === 46) this.se(47, this.mov, "bomba");
    if (t >= 31 && this.motor.isEnd) {
      this.setMode(this.actStandStill);
      this.se(9, this.mov, "bomba");
      return;
    }
    this.turn = this.trg_yaw;
    this.step.set(0, 0, 0);
    this.claseActiva();
  };
  actAim=t => {
    const p = this.pad.press;
    this.step.x = 0;
    this.step.z = 0;
    if (this.checkTarget()) return;
    if (t === 0) {
      this.setAction(M3.GUNSHOOT, 4);
      this.adjOn = true;
    }
    this.adjustTarget();
    if (!(p & PAD.L2)) {
      this.setMode(this.actStandStill);
      return;
    }
    this.turn = this.trg_yaw;
    this.step.set(0, 0, 0);
    if (p & PAD.R2) {
      this.setMode(this.actShoot);
      return;
    }
    this.claseActiva();
  };
  actShoot=t => {
    if (this.checkTarget()) return;
    if (t === 0) {
      this.setAction(M3.GUNSHOOT, 0);
      this.famasShoot();
      this.adjOn = true;
    }
    this.adjustTarget();
    this.turn = this.trg_yaw;
    this.step.set(0, 0, 0);
    this.setMode(this.actAim);
    this.claseActiva();
  };
  actDamage=t => {
    this.step.x = 0;
    this.step.z = 0;
    if (t === 0) {
      this.setAction(M3.DAMAGE, 4);
      this.se(187, this.mov);
      this.sangre(this.puntoHueso(5, {
        x: 0,
        y: 0,
        z: 100
      }));
    }
    if (this.motor.isEnd) this.setMode(this.actStandStill);
  };
  doAction() {
    this.blancoEnemigo = false;
    const t = this.time++;
    if (!this.action) this.action = this.actStandStill;
    this.action(t);
    this.rSphere = -1;
    if (this.height < 0 && this.grounded) this.height = 0;
    this.height -= 16;
    this.step.y = this.height;
  }
  lockOn(shake) {
    const dir = vecDir(AIMPOS.x - this.mov.x, AIMPOS.z - this.mov.z);
    const cab = this.puntoHuesoMM(6), r = this.homing(cab, dir, 6e3, 4096);
    if (r.yaw < 0) {
      this.trg_yaw = dir + randS(shake) & 4095;
      this.objetivo = null;
      return 0;
    }
    this.trg_yaw = r.yaw + randS(shake) & 4095;
    this.trg_pitch = r.pitch;
    this.objetivo = r.g;
    return 1;
  }
  homing(pos, ang, maxDist, maxAng) {
    let min = maxDist + 100, yaw = -1, pitch = 0, g0 = null;
    for (const g of this.sis.blancosJugador(this.proxy)) {
      if ([ "piso", "cae", "cuelloRoto", "soltado" ].includes(g.accion)) continue;
      const h = g.o.getObjectByName?.("hueso_6");
      const q = new THREE.Vector3;
      if (h) {
        g.o.updateMatrixWorld(true);
        h.getWorldPosition(q);
      } else {
        q.copy(g.o.position);
        q.y += 1.5;
      }
      q.multiplyScalar(1e3);
      const dx = q.x - pos.x, dy = q.y - pos.y, dz = q.z - pos.z, len = Math.round(Math.hypot(dx, dy, dz));
      if (len >= min) continue;
      const dir = vecDir(dx, dz);
      if (difAbs(ang, dir) < maxAng) {
        min = len;
        yaw = dir;
        pitch = (ratan2(len, dy) & 4095) - 1024;
        g0 = g;
      }
    }
    return {
      yaw: yaw,
      pitch: pitch,
      g: g0
    };
  }
  get faseFuga() {
    return this.fuga.fase;
  }
  pensar3() {
    const F = this.faseFuga;
    switch (this.think3) {
     case 0:
      this.pad.press |= PAD.L1;
      this.trg_yaw = this.player_dir;
      if (F === 0 || F === 4) {
        this.think3 = 1;
        this.count3 = 0;
      } else this.count3++;
      break;

     case 1:
      if (F === 2) {
        this.think3 = 0;
        this.count3 = 0;
      } else if (F === 6) {
        this.lockOn(2);
        this.f970 = 90;
        this.think3 = 4;
        this.count3 = 0;
      } else {
        if (this.f990 < 300) {
          if (this.lockOn(256)) this.pad.press |= PAD.L2; else this.pad.press |= PAD.L1;
        }
        this.count3++;
      }
      break;

     case 2:
      if (F === 14) {
        this.think3 = 6;
        this.count3 = 0;
        return;
      }
      if (this.lockOn(8)) {
        this.pad.press |= PAD.L2;
        if (this.f990 % 64 === 0) {
          this.f970 = randU(8) + 14;
          this.think3 = 3;
          this.count3 = 0;
          return;
        }
      } else this.pad.press |= PAD.L2;
      this.count3++;
      break;

     case 3:
      this.pad.press |= PAD.L2;
      if (this.f970 < this.count3) {
        this.think3 = 2;
        this.count3 = 0;
        return;
      }
      if (this.count3 % 3 === 0) this.pad.press |= PAD.R2;
      this.count3++;
      break;

     case 4:
      this.pad.press |= PAD.L2;
      if (this.f970 < this.count3) {
        this.think3 = 5;
        this.count3 = 0;
        return;
      }
      if (this.count3 % 10 === 0) this.lockOn(8);
      if (this.count3 % 3 === 0) this.pad.press |= PAD.R2;
      this.count3++;
      break;

     case 5:
      if (this.count3 < 4) this.pad.press |= PAD.R1;
      if (F === 8) this.think3 = 2;
      this.count3++;
      break;

     case 6:
      {
        const dx = AIMPOS2.x - this.mov.x, dz = AIMPOS2.z - this.mov.z;
        this.pad.dir = vecDir(dx, dz);
        if (Math.round(Math.hypot(dx, dz)) < 500) {
          this.think3 = 7;
          this.count3 = 0;
          return;
        }
        this.count3++;
        break;
      }

     case 7:
      break;
    }
  }
  think() {
    this.pad.dir = -1;
    this.pad.press = 0;
    if (this.think1 === 0 && this.think2 === 0) this.pensar3();
    this.count1++;
  }
  cuadro() {
    this.actControl();
    this.actMotion();
    const sn = this.snake();
    const dx = sn.x - this.mov.x, dz = sn.z - this.mov.z;
    this.player_dir = vecDir(dx, dz);
    this.player_dis = Math.round(Math.hypot(dx, dz));
    this.think();
    this.doAction();
    if (this.faseFuga > 6) this.f990++;
  }
  estadoPrueba() {
    return {
      pos: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      rot: this.rot,
      think3: this.think3,
      fase: this.faseFuga,
      accion: this.action?.name || "",
      nAction: this.nAction,
      anim: this.motor.action,
      trg_yaw: this.trg_yaw,
      trg_pitch: this.trg_pitch,
      disparos: this.disparos,
      f990: this.f990,
      muertos: this.fuga.muertos,
      golpes: this.registro.filter(r => r.t === "golpe").length
    };
  }
}

const ACT72 = [ 16, 17, 17, 24, 16, 16, 16, 16, 24, 18, 19, 27, 28, 29, 16, 16, 16, 16, 16, 16, 1, 16, 16, 16, 16, 16, 16, 16, 20, 26, 25, 21, 10, 11, 12, 13, 8, 22, 23, 16, 4, 4, 4, 2, 23, 5, 9, 5, 14, 15, 14, 15, 6, 7, 5, 9, 5, 24 ];

const BOCA_DESERT = {
  x: 5,
  y: -500,
  z: 80
};

export class Meryl72 extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = "MERYL";
    this.lado = "enemigo";
    this.tamBlanco = [ 300, 1500, 300 ];
    this.registro = [];
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 600) this.registro.shift();
  }
  async iniciar() {
    const o = this.opts, S = this.sis;
    this.stage = num(o.s, 0);
    this.fB96 = num(o.c, 0);
    await this.cargarCon("personajes/meryl.glb", this.stage === 0 ? "mel_07a" : "mel_09a", "personajes/desert.glb");
    const p = this.actor.p || [ 0, 0, 0 ], d = this.actor.d || [ 0, 0, 0 ];
    this.mov.set(p[0], p[1], p[2]);
    this.rot = this.turn = d[1] & 4095;
    this.interpCtrl = 4;
    this.fA9C = new Array(8).fill(null);
    this.setPutChar("sonido");
    if (this.stage !== 0) this.setPutChar("aliento");
    this.f8BC = {
      f00: 0,
      f04: 0,
      f14: 0,
      f18: 0,
      f1A: 450,
      f1C: 1
    };
    this.action = null;
    this.action2 = null;
    this.time = 0;
    this.time2 = 0;
    this.voices = nums(o.v).slice(0, 25);
    await S.flujo.precargar(this.voices);
    this.fC1C = new Array(6).fill(-1);
    (o.a || []).slice(0, 6).forEach((x, i) => {
      this.fC1C[i] = x && typeof x === "object" && "proc" in x ? x.proc : -1;
    });
    const roots = nums(o.r);
    this.param = {
      fAF8: 0,
      c_root: 0,
      roots: roots.length ? roots : [ 0 ],
      defends: [ 255, 255, 255, 255 ],
      faint: num(o.f, 20),
      fAF9: num(o.b, 65)
    };
    this.fB58 = 2e3;
    this.fB0B = this.param.roots[0];
    let life = S.vidaMax();
    if (typeof o.l?.[0] === "number") life = o.l[0];
    if (life < 32) life = 512;
    this.param.life = life;
    this.param.max_life = life;
    const nn = nums(o.n);
    for (let i = 0; i * 3 + 2 < nn.length && i < 4; i++) {
      const z = V(nn[i * 3], nn[i * 3 + 1], nn[i * 3 + 2]);
      this.param.defends[i] = z.y < 3e4 ? this.addr(z) & 255 : 255;
    }
    this.nodes = this.ruta(this.param.roots[this.param.c_root]);
    this.n_patrols = this.nodes.length;
    if (!this.n_patrols) {
      this.nodes = [ {
        p: this.mov.clone(),
        cmd: 0
      } ];
      this.n_patrols = 1;
      console.warn("[meryl] meryl72: ruta", this.param.roots[0], "sin puntos");
    }
    this.fC3C = this.procDe("e");
    this.proc_id = this.procDe("z");
    this.vital = life;
    this.faint = this.param.faint;
    this.blanco = true;
    this.think1 = 0;
    this.think2 = 0;
    this.think3 = 0;
    this.think4 = 0;
    this.count3 = 0;
    this.next_node = 0;
    this.target_pos = this.nodes[0].p.clone();
    this.target_addr = this.addr(this.target_pos);
    this.vision = {
      facedir: 0,
      angle: 2048,
      length: 4e3,
      f06: 0
    };
    this.fB18 = 0;
    this.pad = {
      press: 0,
      mode: 0,
      tmp: 0,
      time: 0,
      dir: -1,
      sound: 0
    };
    this.fB98 = 0;
    this.fC0A = 0;
    this.fC0C = 0;
    this.fC0E = 0;
    this.mov.copy(this.fB96 !== 0 && this.nodes[3] ? this.nodes[3].p : this.nodes[0].p);
    this.fC10 = [ 0, 0, 0 ];
    this.fC34 = 0;
    this.fC36 = 0;
    this.fC38 = 0;
    this.fC08 = 0;
    this.fAEA = 0;
    this.fAEC = 0;
    this.modetime = [ 0, 0, 0, 0, -1, 0, 0, 23 ];
    this.start_pos = this.nodes[0].p.clone();
    const a = this.addr(this.mov);
    this.start_addr = a;
    this.fB60 = a;
    this.fB4C = a;
    this.fB5C = -1;
    this.fB6C = this.start_pos.clone();
    this.fC04 = 0;
    this.fAF4 = 0;
    this.act_status = 0;
    this.actend = 0;
    this.fB9C = 0;
    this.player_addr = 0;
    this.player_pos = this.snake();
    S.kore.pos.set(0, 0, 0);
    S.kore.flag = 0;
    this.goTimer = 0;
    this.adjOn = false;
    this.barras = [ {
      y: 28,
      rest: this.param.max_life,
      now: this.param.life,
      max: S.vidaMax(),
      conf: {
        nombre: "MERYL",
        izq: [ 31, 191, 95 ],
        der: [ 31, 191, 95 ]
      }
    } ];
    this.pose0(ACT72[0]);
    this.mov.y += this.motor.altura;
    this.rSphere = -1;
    this.actControl();
    this.dibujar();
    this.log("inicio", {
      stage: this.stage,
      c: this.fB96,
      life: life,
      ruta: this.param.roots[0],
      nodos: this.n_patrols,
      defends: this.param.defends.slice(0, 2)
    });
  }
  vitalBlanco() {
    return this.vital;
  }
  setPutChar(k) {
    const i = this.fA9C.indexOf(null);
    if (i >= 0) {
      this.fA9C[i] = k;
      return 1;
    }
    return 0;
  }
  clearPutChar(k) {
    const i = this.fA9C.indexOf(k);
    if (i >= 0) {
      this.fA9C[i] = null;
      return 1;
    }
    return 0;
  }
  execPutChar() {
    for (const k of this.fA9C.slice()) {
      if (k === "sonido") this.putSound(); else if (k === "bala") this.putBullet(); else if (k === "aliento") {
        if (this.J.gvTime % 64 === this.param.fAF8 * 16) this.chispa(this.puntoHueso(6, {
          x: 0,
          y: 0,
          z: 120
        }), .18, 20, 14540253);
      }
    }
  }
  putSound() {
    const t0 = this.f8BC.f18, a2 = this.motor.info1.frame;
    const sd1 = this.stage === 0 ? 3 : 192, sd2 = this.stage === 0 ? 2 : 191;
    if (t0 === 1 || t0 === 2) {
      if (a2 === 10) this.se(sd1, this.mov); else if (a2 === 1) this.se(sd2, this.mov);
    }
  }
  putBullet() {
    const o = this.puntoHuesoMM(4, BOCA_DESERT), d = this.ejeHuesoMundo(4, V(0, -1, 0));
    this.sis.nuevaBala(o, d, {
      lado: 2,
      "daño": 64,
      de: this
    });
    this.se(45, this.mov);
    this.chispa(o.clone().multiplyScalar(MM), .3, 2, 16769184);
    this.clearPutChar("bala");
  }
  putBlood(hueso) {
    this.sangre(this.puntoHueso(hueso, {
      x: 0,
      y: 0,
      z: 100
    }));
  }
  setMode(fn) {
    this.action = fn;
    this.time = 0;
  }
  setMode2(fn) {
    if (!this.action2) {
      this.action2 = fn;
      this.time2 = 0;
    }
    this.adjOn = false;
  }
  setAction(n, interp) {
    this.f8BC.f18 = n;
    this.motor.accion(ACT72[n], interp);
  }
  unsetMode() {
    this.motor.override(ACT72[0], 4, 0);
    this.action2 = null;
    this.time2 = 0;
  }
  unsetAction(n) {
    this.motor.override(ACT72[n], 4, 1022);
  }
  setTargetClass() {
    this.blanco = true;
  }
  execProcZ(mode) {
    if (this.proc_id > 0) this.execProc(this.proc_id, [ mode ]);
  }
  a7D1C() {
    const d = this.tomarDaño();
    if (!d) return 0;
    const vm = this.sis.vidaMax();
    if (d.a_mode === 1 || d.a_mode === 2) this.vital -= d.daño;
    this.ultimoAmode = d.a_mode;
    switch (d.a_mode) {
     case 3:
      this.faint -= 1;
      this.vital -= Math.trunc(vm / 48);
      if (this.faint <= 0 || this.vital <= 0) {
        this.f8BC.f14 = 1;
        this.setMode(this.aA538);
      } else this.setMode(this.aA408);
      break;

     case 4:
      this.faint -= 3;
      this.f8BC.f14 = 0;
      this.vital -= Math.trunc(vm / 32);
      this.setMode(this.aA538);
      break;

     case 1:
      if (this.vital <= 0) {
        this.f8BC.f14 = 1;
        this.setMode(this.aA538);
      } else this.setMode(this.aA408);
      break;

     case 2:
      this.f8BC.f14 = 3;
      this.setMode(this.aA538);
      break;
    }
    this.log("daño", {
      a_mode: d.a_mode,
      "daño": d.daño,
      vital: this.vital
    });
    if (this.vital <= 0 && this.goTimer === 0 && this.sis.vida() > 0) this.muerte();
    return 1;
  }
  muerte() {
    this.execProcZ(1);
    this.goTimer = -2;
    this.mgr.timerGO = -2;
    this.log("muerta");
  }
  a7F14() {
    if (this.mgr.stun) {
      this.setMode(this.a9F98);
      return 1;
    }
    return 0;
  }
  capturable() {
    return this.blanco && this.vivo && this.listo && !this.fC34 && ![ this.aA0EC, this.aA314, this.aA538, this.aAA48, this.a9F98, this.a9970, this.a9B30 ].includes(this.action);
  }
  capturar(a_mode, dir) {
    this.captura = {
      a_mode: a_mode,
      dir: dir
    };
  }
  a7C9C() {
    const c = this.captura;
    if (!c) return 0;
    this.captura = null;
    this.capturaDir = c.dir;
    this.setMode(c.a_mode === 36 ? this.a9970 : this.a9B30);
    this.log(c.a_mode === 36 ? "tirada" : "agarrada");
    return 1;
  }
  checkDamage() {
    if (this.a7D1C() || this.a7C9C() || this.a7F14()) {
      this.blanco = false;
      return 1;
    }
    return 0;
  }
  a7FCC(dir, dist) {
    if (dist < 0 || dir < 0) return 0;
    const d = difS(dir, dist);
    if (d + 896 > 1792 || d + 896 < 0) return 0;
    return d >= 0 ? 1 : 2;
  }
  reviseReadyGun() {
    const sn = this.snake(), cab = this.puntoHuesoMM(6);
    let tr = (ratan2(this.sn_dis, sn.y + 400 - cab.y) & 4095) - 1024;
    tr = Math.max(-256, Math.min(256, tr));
    this.adjust[5][0] = tr;
    const near = difS(this.rot, this.sn_dir);
    if (near + 511 >= 0 && near + 511 < 1023) this.adjust[5][1] = near;
  }
  attackForce(check) {
    const off = check ? {
      x: -200,
      y: -500,
      z: 600
    } : {
      x: -200,
      y: 100,
      z: 900
    };
    const a = this.rot * ANG, c = Math.cos(a), s = Math.sin(a);
    const cx = this.mov.x + off.x * c + off.z * s, cz = this.mov.z - off.x * s + off.z * c, cy = this.mov.y + off.y;
    const sn = this.snake();
    if (Math.abs(sn.x - cx) < 400 + 300 && Math.abs(sn.z - cz) < 400 + 300 && Math.abs(sn.y - cy) < 200 + 600) {
      this.sis.dañarSnake(16);
      return 1;
    }
    return 0;
  }
  a829C() {
    const v = this.sis.vida();
    return v < 17;
  }
  checkPad() {
    const p = this.pad.press;
    if (p & 1) {
      this.setMode2(this.aAD30);
      return 0;
    }
    if (p & 2) {
      this.setMode2(this.aADEC);
      return 0;
    }
    if (p & 4) {
      this.setMode2(this.aAEA8);
      return 0;
    }
    if (p & 8192) {
      this.setMode2(this.aAF30);
      return 0;
    }
    if (p & 64) {
      this.setMode2(this.aAFB8);
      return 0;
    }
    if (p & 128) {
      this.setMode2(this.aB038);
      return 0;
    }
    if (p & 1024) {
      this.setMode2(this.aB0B8);
      return 0;
    }
    if (p & 2048) {
      this.setMode2(this.aB134);
      return 0;
    }
    if (p & 512) {
      this.setMode2(this.aB1B4);
      return 0;
    }
    if (p & 256) {
      this.setMode(this.a88EC);
      return 1;
    }
    if (p & 32) {
      this.setMode(this.a8970);
      return 1;
    }
    if (p & 4194304) {
      this.setMode(this.a8A30);
      return 1;
    }
    if (p & 16384) {
      this.setMode(this.a8BC4);
      return 1;
    }
    if (p & 8388608) {
      this.setMode(this.a8E74);
      return 1;
    }
    if (p & 16777216) {
      this.setMode(this.a8C7C);
      return 1;
    }
    if (p & 33554432) {
      this.setMode(this.a9000);
      return 1;
    }
    if (p & 67108864) {
      this.setMode(this.a90C8);
      return 1;
    }
    if (p & 536870912) {
      this.setMode(this.a9190);
      return 1;
    }
    if (p & 268435456) {
      this.setMode(this.a9258);
      return 1;
    }
    if (p & 1073741824) {
      this.setMode(this.a9318);
      return 1;
    }
    if (p & 196608) {
      this.setMode(this.actReadyGun);
      return 1;
    }
    return 0;
  }
  actStandStill=t => {
    this.act_status = 1;
    this.vision.length = 4e3;
    if (t === 0) {
      this.setAction(0, 4);
      this.adjOn = true;
    }
    if (this.checkDamage() || this.checkPad()) {
      this.unsetMode();
      return;
    }
    if (this.pad.dir >= 0) {
      if (difAbs(this.rot, this.pad.dir) < 256) {
        this.setAction(this.pad.mode & 1 ? 2 : 1, 4);
        this.setMode(this.a86EC);
      } else this.turn = this.pad.dir;
    }
    this.vision.facedir = this.rot;
    this.setTargetClass();
  };
  a86EC=() => {
    this.act_status = 1;
    this.vision.length = 4e3;
    if (this.checkDamage()) {
      this.unsetMode();
      return;
    }
    if (this.checkPad()) {
      this.unsetMode();
      return;
    }
    let dir = this.pad.dir;
    const dist = -1;
    if (this.pad.mode & 1 && this.f8BC.f18 !== 2) this.setAction(2, 4);
    if (dir < 0) {
      this.setMode(this.actStandStill);
      this.unsetMode();
      return;
    }
    switch (this.a7FCC(dir, dist)) {
     case 1:
      dir = dist - 1024 & 4095;
      break;

     case 2:
      dir = dist + 1024 & 4095;
      break;
    }
    if (!this.J.ctx.enPantalla?.(this.o.position)) this.rot = dir;
    this.turn = dir;
    this.vision.facedir = this.vision.facedir + Math.trunc(difS(this.rot, this.vision.facedir) / 4) & 4095;
    this.setTargetClass();
  };
  a88EC=t => {
    if (t === 0) {
      this.f8BC.f14 = 4;
      this.setAction(41, 4);
    }
    if (!this.checkDamage() && this.motor.isEnd) {
      this.pad.tmp = 0;
      this.setMode(this.aA0EC);
    }
  };
  a8970=t => {
    this.act_status = 1;
    this.setTargetClass();
    this.vision.length = 4e3;
    if (t === 0) this.setAction(21, 4);
    if (this.checkDamage()) return;
    if (this.motor.isEnd || !(this.pad.press & 32)) {
      this.setMode(this.actStandStill);
      return;
    }
    this.turn = this.sn_dir;
  };
  golpeVoz() {
    this.se(this.stage ? 199 : 189, this.mov);
  }
  pegaVoz() {
    this.se(this.stage ? 200 : 176, this.mov);
  }
  a8A30=t => {
    this.vision.length = 4e3;
    this.act_status |= 9;
    if (t === 0) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.setAction(28, 4);
      this.log("cachetada");
    }
    if (t === 1) this.sis.girarSnake(this.sn_dir + 2048 & 4095);
    if (t === 98) {
      this.se(56, this.mov);
      this.golpeVoz();
    }
    if (t === 101 && this.attackForce(0)) {
      this.pegaVoz();
      if (this.a829C()) this.execProcZ(2);
    }
    if (this.motor.isEnd) {
      this.fC08 = 3;
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.setMode(this.actStandStill);
    } else this.turn = this.sn_dir;
  };
  a8BC4=t => {
    this.vision.length = 4e3;
    this.act_status |= 9;
    if (t === 0) this.setAction(13, 4);
    if (t === 30) this.se(193, this.mov, "bomba");
    if (this.motor.isEnd) {
      this.fC08 = 3;
      this.setMode(this.actStandStill);
    } else this.turn = this.sn_dir;
  };
  a8C7C=t => {
    this.vision.length = 4e3;
    this.act_status |= 9;
    if (t === 0) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.setAction(31, 4);
    }
    if (t === 90) {
      this.J.ctx.inventario?.equiparItem?.(-1);
      this.se(20, this.mov);
    }
    if (t === 95) {
      this.sis.girarSnake(this.sn_dir + 2048 & 4095);
      this.setAction(28, 4);
    }
    if (t === 193) {
      this.se(56, this.mov);
      this.golpeVoz();
    }
    if (t === 196 && this.attackForce(0)) {
      this.pegaVoz();
      if (this.a829C()) this.execProcZ(2);
    }
    if (t > 95 && this.motor.isEnd) {
      this.fC08 = 3;
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.setMode(this.actStandStill);
    } else this.turn = this.sn_dir;
  };
  a8E74=t => {
    this.vision.length = 4e3;
    this.act_status |= 9;
    if (t === 0) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.setAction(28, 4);
    }
    if (t === 50) this.setAction(29, 4);
    if (t === 63) {
      this.se(56, this.mov);
      this.golpeVoz();
    }
    if (t === 67 && this.attackForce(1)) {
      this.se(53, this.mov);
      if (this.a829C()) this.execProcZ(2);
    }
    if (t > 50 && this.motor.isEnd) {
      this.fC08 = 3;
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.setMode(this.actStandStill);
    } else this.turn = this.sn_dir;
  };
  mirar(n, bit) {
    return t => {
      const p = this.pad.press;
      this.act_status = 1;
      this.vision.length = 4e3;
      if (t === 0) this.setAction(n, 4);
      if (!this.checkDamage()) {
        if (!(p & bit)) {
          if (!this.checkPad()) this.setMode(this.actStandStill);
        } else {
          this.turn = this.sn_dir;
          this.vision.facedir = this.rot;
          this.setTargetClass();
        }
      }
    };
  }
  a9000=this.mirar(9, 33554432);
  a90C8=this.mirar(10, 67108864);
  a9190=this.mirar(11, 536870912);
  unaVez(n) {
    return t => {
      this.act_status = 1;
      this.vision.length = 4e3;
      if (t === 0) this.setAction(n, 4);
      if (this.checkDamage()) return;
      if (this.checkPad()) return;
      if (this.motor.isEnd) this.setMode(this.actStandStill); else {
        this.turn = this.sn_dir;
        this.vision.facedir = this.rot;
        this.setTargetClass();
      }
    };
  }
  a9258=this.unaVez(31);
  a9318=this.unaVez(12);
  a93D8() {
    const d = difS(this.rot, this.sn_dir);
    return d < 768 && d > -768 ? this.turn : this.sn_dir;
  }
  actReadyGun=t => {
    this.act_status = 1;
    this.setTargetClass();
    this.vision.length = 4e3;
    const p = this.pad.press;
    if (t === 0) {
      this.setAction(p & 65536 ? 3 : 5, 4);
      this.adjOn = true;
    }
    this.reviseReadyGun();
    if (this.checkDamage()) {
      this.adjust[5][0] = 0;
      this.adjust[5][1] = 0;
      return;
    }
    if (!(p & 196608)) {
      this.adjust[5][0] = 0;
      this.adjust[5][1] = 0;
      this.setMode(this.actStandStill);
      return;
    }
    if (p & 262144) {
      this.setMode(this.a9594);
      return;
    }
    if (p & 524288) {
      this.setMode(this.a964C);
      return;
    }
    if (p & 3145728) {
      this.setMode(this.actGrenade);
      return;
    }
    this.turn = this.a93D8();
    this.vision.facedir = this.rot + this.adjust[5][1] & 4095;
  };
  a9594=t => {
    this.act_status = 1;
    this.setTargetClass();
    this.vision.length = 4e3;
    if (t === 0) {
      this.setAction(4, 0);
      this.setPutChar("bala");
      this.adjOn = true;
    }
    this.turn = this.sn_dir;
    if (this.checkDamage()) return;
    this.setMode(this.actReadyGun);
  };
  a964C=t => {
    this.act_status = 1;
    this.setTargetClass();
    this.vision.length = 4e3;
    if (t === 0) this.adjOn = true;
    if (t === 1 || t === 7) this.rot = this.rot - 256 & 4095;
    if (t === 3 || t === 5) this.rot = this.rot + 256 & 4095;
    if (t === 2 || t === 4 || t === 6) {
      this.setAction(6, 0);
      this.setPutChar("bala");
    }
    if (this.checkDamage()) return;
    if (this.motor.isEnd) this.setMode(this.actReadyGun);
  };
  actGrenade=t => {
    this.act_status = 1;
    this.setTargetClass();
    this.vision.length = 4e3;
    if (t === 0) this.setAction(7, 4);
    if (t === 17) this.se(44, this.mov);
    if (this.checkDamage()) return;
    if (this.motor.isEnd) this.setMode(this.actReadyGun);
  };
  a9970=t => {
    this.f8BC.f1C = 0;
    if (t === 0) {
      this.fC08 = 1;
      this.f8BC.f14 = 7;
      this.setAction(36, 4);
    }
    if (t === 24) {
      this.se(this.stage ? 194 : 195, this.mov);
      this.se(51, this.mov);
    }
    if (this.motor.isEnd) this.setMode(this.aA0EC);
    if (t < 24) this.turn = this.capturaDir ?? this.turn;
  };
  a9AB0() {
    const d = this.sis.dirSnakeRot(), sn = this.snake(), a = d * ANG, c = Math.cos(a), sn_ = Math.sin(a);
    this.turn = d;
    this.step.x = Math.round(sn.x + (-150 * c + 300 * sn_) - this.mov.x);
    this.step.z = Math.round(sn.z + (150 * sn_ + 300 * c) - this.mov.z);
  }
  a9B30=t => {
    const s2 = this.f8BC.f18;
    this.f8BC.f1C = 0;
    if (t === 0) {
      this.fC08 = 1;
      this.fAEA = this.faint;
      this.fAEC = 0;
      this.se(this.stage ? 196 : 190, this.mov);
    }
    if (this.fAEA !== this.faint) {
      this.se(this.stage ? 196 : 190, this.mov);
      this.fAEA = this.faint;
    }
    const d = this.tomarDaño();
    if (d) {
      if (d.a_mode === 1 || d.a_mode === 2) this.vital -= d.daño;
      this.putBlood(5);
      this.se(this.stage ? 194 : 195, this.mov);
      if (this.vital <= 0) {
        this.f8BC.f14 = 6;
        if (this.goTimer === 0 && this.sis.vida() > 0) this.muerte();
        this.setMode(this.aA538);
        if (this.J.agarrado === this.proxy) this.J.agarrado = null;
        return;
      }
    }
    switch (this.sis.accionAgarre(this)) {
     case 7:
     case 13:
      if (s2 !== 32 && s2 !== 30) {
        this.setAction(32, 4);
        this.fAEC = 0;
      }
      if (this.fAEC === 50 && this.faint > 0) this.setAction(30, 4);
      if (s2 === 30 && !(this.fAEC & 7)) this.J.vibrar?.([ [ 1, 4 ], [ 255, 4 ] ]);
      this.a9AB0();
      this.fAEC++;
      break;

     case 38:
      if (s2 !== 33) this.setAction(33, 4);
      this.a9AB0();
      break;

     case 39:
      this.f8BC.f14 = 5;
      this.vital = 0;
      this.log("cuello roto");
      if (this.goTimer === 0 && this.sis.vida() > 0) this.muerte();
      this.setMode(this.aA538);
      return;

     default:
      this.f8BC.f14 = 6;
      this.setMode(this.aA538);
      this.log("soltada");
      return;
    }
    if (this.sn_dis > 800 && this.J.agarrado === this.proxy) this.J.soltar();
    this.blanco = true;
    this.vision.facedir = this.rot;
  };
  a98E0=t => {
    this.setTargetClass();
    if (t === 0) this.setAction(24, 4);
    if (!this.checkDamage() && this.motor.isEnd) this.setMode(this.actStandStill);
  };
  a9F98=t => {
    this.f8BC.f1C = 0;
    this.vision.length = 0;
    if (t === 0) {
      this.fC08 = 1;
      this.setAction(37, 4);
      this.faint = 0;
      if (this.sis.streamStatus() !== -1) this.sis.streamPlayStop();
    }
    if (this.checkDamage()) return;
    if (t === 10) {
      this.f8BC.f14 = 2;
      this.setAction(38, 4);
    } else this.setTargetClass();
    if (t === 58) this.se(81, this.mov);
    if (t === 84) this.se(51, this.mov);
    if (t >= 60 && this.motor.isEnd) this.setMode(this.aA0EC);
  };
  aA0EC=t => {
    if (t === 0) {
      this.setAction(this.f8BC.f14 < 4 ? this.f8BC.f14 === 1 ? 47 : 45 : 46, 4);
      if (this.faint <= 0) {
        this.faint = 7;
        this.marca("?");
        this.fAEA = 150;
      } else this.fAEA = 10;
    }
    if (this.fAEA < t) {
      if (this.faint <= 0) this.faint = this.param.faint;
      this.setMode(this.aA314);
      return;
    }
    this.blanco = true;
  };
  aA314=t => {
    this.f8BC.f1C = 0;
    if (t === 0) {
      if (this.f8BC.f14 < 4) this.setAction(this.fAEA === 150 ? 50 : 48, 4); else this.setAction(this.fAEA === 150 ? 51 : 49, 4);
    }
    if (this.motor.isEnd) {
      this.fC34 = 30;
      this.setMode(this.actStandStill);
      this.fC08 = 2;
    }
  };
  aA408=t => {
    this.f8BC.f1C = 0;
    this.vision.length = 4e3;
    if (this.checkDamage()) return;
    if (t === 0) {
      this.fC08 = 1;
      this.setAction(20, 4);
      this.se(this.stage ? 194 : 195, this.mov);
      if (this.ultimoAmode === 3) {
        this.se(52, this.mov);
        this.chispa(this.puntoHueso(1, {
          x: 0,
          y: 0,
          z: 100
        }), .2, 10, 13421772);
      } else this.putBlood(5);
    }
    if (this.motor.isEnd) {
      this.fC34 = 30;
      this.fC08 = 2;
      this.setMode(this.actStandStill);
    }
    this.setTargetClass();
  };
  aA538=t => {
    let s2 = 15;
    const u = this.f8BC;
    u.f1C = 0;
    if (t === 0) {
      this.fC08 = 1;
      switch (u.f14) {
       case 0:
        this.se(52, this.mov);
        this.setAction(40, 4);
        this.se(this.stage ? 194 : 195, this.mov);
        this.putBlood(5);
        this.fAEA = 17;
        break;

       case 1:
        this.setAction(43, 4);
        if (this.vital <= 0) {
          this.se(this.stage ? 195 : 196, this.mov);
          this.putBlood(6);
          if (this.ultimoAmode === 3) this.se(52, this.mov);
        } else {
          this.se(this.stage ? 194 : 195, this.mov);
          this.putBlood(5);
        }
        this.fAEA = 46;
        break;

       case 4:
        this.se(this.stage ? 194 : 195, this.mov);
        this.setAction(41, 4);
        this.putBlood(5);
        this.fAEA = 14;
        break;

       case 3:
        this.se(this.stage ? 194 : 195, this.mov);
        this.setAction(42, 4);
        this.putBlood(5);
        this.fAEA = 22;
        break;

       case 5:
        this.se(this.stage ? 197 : 191, this.mov);
        this.se(144, this.mov);
        this.setAction(34, 4);
        this.fAEA = 67;
        break;

       case 6:
        this.setAction(35, 4);
        this.fAEA = 15;
        break;
      }
      if (this.sis.streamStatus() !== -1) this.sis.streamPlayStop();
    }
    if (t === 2 && this.vital <= 0) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      if (this.sis.streamStatus() === -1) this.sis.voxStream(this.voices[s2], 0);
    }
    if (u.f14 === 1 && t === 24) this.se(81, this.mov);
    if (t > 16 && this.grounded) this.step.set(0, this.step.y, 0);
    if (t === this.fAEA) this.se(51, this.mov);
    if (this.motor.isEnd) {
      u.f1C = 1;
      this.setMode(this.vital <= 0 ? this.aAA48 : this.aA0EC);
    }
  };
  aAA48=t => {
    if (t === 0) {
      this.setAction(this.f8BC.f14 < 4 ? this.f8BC.f14 === 1 ? 56 : 54 : 55, 4);
      this.blanco = false;
    }
    if (t > 32 && this.sis.streamStatus() === -1 && this.goTimer === -2) {
      this.goTimer = 1;
      this.log("game over");
      this.mgr.gameOver();
    }
    if (t === 600 && this.goTimer !== 1) {
      this.goTimer = 1;
      this.mgr.gameOver();
    }
  };
  aAD30=t => {
    if (t === 0) this.unsetAction(14);
    if (!(this.pad.press & 1)) this.unsetMode(); else this.vision.facedir = this.rot - (t < 4 ? t * 256 : 1024) & 4095;
  };
  aADEC=t => {
    if (t === 0) this.unsetAction(15);
    if (!(this.pad.press & 2)) this.unsetMode(); else this.vision.facedir = this.rot + (t < 4 ? t * 256 : 1024) & 4095;
  };
  aAEA8=t => {
    this.vision.length = 2e3;
    if (t === 0) this.unsetAction(16);
    if (!(this.pad.press & 4)) this.unsetMode();
  };
  aAF30=t => {
    this.vision.length = 2e3;
    if (t === 0) this.unsetAction(19);
    if (!(this.pad.press & 8192)) this.unsetMode();
  };
  hastaFin(n, vista = 0) {
    return t => {
      if (vista != null) this.vision.length = vista;
      if (t === 0) this.unsetAction(n);
      if (this.motor.time2) this.unsetMode();
    };
  }
  aAFB8=this.hastaFin(27);
  aB038=this.hastaFin(25);
  aB0B8=this.hastaFin(26, null);
  aB134=this.hastaFin(22);
  aB1B4=t => {
    this.vision.length = 0;
    if (t === 0) this.unsetAction(23);
    if (this.pad.press & 4096) {
      this.setMode(this.a98E0);
      this.unsetMode();
      return;
    }
    if (t === 130) this.unsetMode();
  };
  aB748() {
    if (!(this.modetime[7] & 1)) return;
    const r = this.J.ruido;
    if (!r?.p) return;
    const d = this.v3m(this.mov).distanceTo(r.pos) * 1e3;
    if (r.p === 5 && d < 500) this.modetime[6] |= 1; else if (r.p === 200 && d < 4e3) this.modetime[6] |= 1; else if (r.p === 100 && d < 4e3) {
      const zd = this.zoneDistance(this.addr(this.mov) & 255, this.J.zonaOCercana(r.pos));
      if (zd < 300) {
        this.modetime[6] |= 1;
        r.len = 0;
        r.p = 0;
      }
    } else if (r.p === 255) this.modetime[6] |= 1;
  }
  aB8DC() {
    this.modetime[6] = 0;
    this.aB748();
    if ((this.J.modo ?? 0) !== 1 && this.modetime[7] & 4 && this.golpes.length) this.modetime[6] |= 4;
  }
  aB928() {
    const f = this.vision.f06;
    if (f === 0) {
      if (this.fB18 !== 255 || !(this.estadoSnake() & PLAYER.INTRUDE)) this.fB18 -= 4;
    } else if (f === 1) this.fB18--; else this.fB18++;
    this.fB18 = Math.max(0, Math.min(255, this.fB18));
  }
  aB9DC() {
    const f = this.vision.f06;
    if (f === 2) {
      if (this.estadoSnake() & PLAYER.WATCH) {
        const sd = this.dirSnake();
        if (difAbs(this.sn_dir, sd) > 1800) this.fC0A++; else this.fC0A -= 2;
      } else this.fC0A -= 4;
    } else this.fC0A -= 4;
    this.fC0A = Math.max(0, Math.min(1e3, this.fC0A));
  }
  dirSnake() {
    const y = this.J.ctx.yawSnake?.();
    return y == null ? 0 : (Math.round((y - Math.PI) / ANG) % 4096 + 4096) % 4096;
  }
  aBA9C() {
    const sn = this.snake(), dx = sn.x - this.mov.x, dz = sn.z - this.mov.z;
    this.sn_dir = vecDir(dx, dz);
    this.sn_dis = Math.round(Math.hypot(dx, dz));
    const h = Math.abs(sn.y - this.mov.y);
    if (this.estadoSnake() & PLAYER.INTRUDE) {
      this.vision.f06 = 0;
      return;
    }
    if (this.J.gvTime % 3 !== this.param.fAF8) return;
    if (this.sn_dis > 6e3 || h > 2e3 || difAbs(this.vision.facedir, this.sn_dir) > this.vision.angle) {
      this.vision.f06 = 0;
      return;
    }
    if (!this.J.libre(this.v3m(sn), this.v3m(this.mov))) this.vision.f06 = 0; else this.vision.f06 = this.vision.length < this.sn_dis ? 1 : 2;
  }
  actionMain() {
    if (this.f8BC.f18 < 54) {
      this.aBA9C();
      this.aB8DC();
      this.aB928();
      this.aB9DC();
      if (this.stage === 0) this.think72(); else this.think9();
      this.execPutChar();
    }
    this.aABA0();
  }
  aABA0() {
    this.vision.length = 0;
    this.blanco = false;
    this.actend = 0;
    this.fC08 = 0;
    this.act_status = 0;
    this.f8BC.f1C = 1;
    this.fB9C = 0;
    const t = this.time++;
    if (!this.action) this.action = this.actStandStill;
    this.action(t);
    if (this.action2) {
      const t2 = this.time2++;
      this.action2(t2);
    }
    if (!this.f8BC.f1C) this.rSphere = this.rSphere < 0 ? this.f8BC.f1A >> 1 : this.rSphere + (this.f8BC.f1A - this.rSphere >> 1); else this.rSphere = -1;
    if (this.fC34 > 0) {
      this.blanco = false;
      this.fC34--;
    } else this.fC34 = 0;
    this.cabeza();
    if (this.f8BC.f04 < 0 && this.grounded) this.f8BC.f04 = 0;
    this.f8BC.f04 -= 16;
    this.step.y = this.f8BC.f04;
  }
  cabeza() {
    const a = this.adjust[6], hablando = this.sis.streamStatus() === 2;
    if (hablando) {
      a[0] += 32;
      if (a[0] >= 128) {
        a[0] = 128;
        if (a[2] === 0) a[2] = randS(32);
      }
    } else if (a[0] > 0) a[0] -= 8;
    if (a[2] !== 0) a[2] = a[2] > 0 ? Math.max(0, a[2] - 4) : Math.min(0, a[2] + 4);
  }
  proc(i) {
    const p = this.fC1C[i];
    if (p > 0) this.execProc(p, []);
  }
  voz(i) {
    this.sis.voxStream(this.voices[i], 0);
  }
  sinVoz() {
    return this.sis.streamStatus() === -1;
  }
  puedeHablar() {
    return this.mgr.gameOverTimer() === 0 && this.sis.vida() > 0;
  }
  aC9A8() {
    this.target_addr = this.player_addr;
    this.target_pos = this.player_pos.clone();
  }
  aC9E0() {
    let x = this.next_node + 1;
    if (x >= this.n_patrols) x = 0;
    this.next_node = x;
    this.target_pos = this.nodes[x].p.clone();
    this.target_addr = this.addr(this.target_pos);
  }
  aCA68() {
    this.target_pos = this.nodes[this.next_node].p.clone();
    this.target_addr = this.addr(this.target_pos);
  }
  aCAD8() {
    this.target_pos = V(-5500, 0, -18e3);
    this.target_addr = this.addr(this.target_pos);
  }
  aCB64() {
    const to = this.target_addr, from = this.addr(this.mov, this.fB5C);
    this.fB5C = from;
    const reach = this.reachTo(from, this.fB60);
    if (to !== this.fB4C || reach <= 0) {
      this.fB4C = to;
      if (this.reachTo(from, to) < 2) {
        this.fB6C = this.target_pos.clone();
        this.fB60 = to;
        this.pad.dir = vecDir(this.fB6C.x - this.mov.x, this.fB6C.z - this.mov.z);
        return -1;
      }
      const link = this.navigate(from, to, this.mov), z = this.zona(link);
      if (z) this.fB6C = z;
      this.fB60 = link & 255 | (link & 255) << 8;
    }
    return vecDir(this.fB6C.x - this.mov.x, this.fB6C.z - this.mov.z);
  }
  aCCC8() {
    if (this.count3 % 32 === 0) {
      this.fB5C = -1;
      this.fB4C = -1;
      this.aCB64();
    }
    this.pad.dir = this.aCB64();
    return this.pad.dir < 0;
  }
  aCD1C(r) {
    const dx = this.target_pos.x - this.mov.x, dz = this.target_pos.z - this.mov.z;
    if (dx > -r && dx < r && dz > -r && dz < r) return 1;
    this.pad.dir = vecDir(dx, dz);
    return 0;
  }
  aCD98() {
    if (!this.fB96) {
      if (this.count3 === 0) {
        this.proc(1);
      }
      if (this.count3 === 1) {
        this.pad.dir = this.sn_dir;
        this.sis.ponerEstado(STATE.PADRELEASE | STATE.PAUSE_ONLY);
      }
      if (this.count3 === 60) this.voz(0);
      if (this.count3 > 60 && this.sinVoz()) {
        this.proc(0);
        this.proc(4);
        this.think3 = 1;
        this.count3 = 0;
        return;
      }
    } else {
      this.next_node = 2;
      this.aC9E0();
      this.think1 = 1;
      this.think2 = 2;
      this.think3 = 4;
      this.count3 = 0;
      return;
    }
    this.count3++;
  }
  aCEC4() {
    if (this.count3 > 30 && this.sinVoz()) {
      if (this.puedeHablar()) this.voz(6);
      this.think3 = 4;
      this.count3 = 0;
    } else this.count3++;
  }
  aCF5C() {
    if (this.count3 > 60 && this.sinVoz()) {
      this.think2 = 1;
      this.think3 = 2;
      this.count3 = 0;
      this.sis.sacarEstado(STATE.PADRELEASE);
    } else this.count3++;
  }
  aCFE0() {
    if (this.fC08 === 2) {
      this.think3 = 2;
      this.count3 = 0;
    } else if (this.count3 > 6e3 && this.act_status & 1) {
      this.think3 = 2;
      this.count3 = 0;
    } else this.count3++;
  }
  aD038() {
    if (this.fC08 === 1) {
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (this.count3 === 0) {
      const e = this.estadoSnake();
      if (e & (PLAYER.GROUND | PLAYER.SQUAT)) this.pad.press |= 8388608; else if (e & PLAYER.CB_BOX) {
        this.pad.press |= 16777216;
        if (this.sinVoz()) this.voz(12);
      } else this.pad.press |= 4194304;
      this.fC0E = Math.max(0, this.fC0E - 2);
    }
    if (this.fC08 === 3 || this.count3 > 300) {
      this.think3 = 8;
      this.count3 = 0;
    } else this.count3++;
  }
  aD14C() {
    this.pad.press |= 65536;
    this.pad.dir = this.sn_dir;
    if (this.fC08 === 1) {
      this.think3 = 6;
      this.count3 = 0;
      if (!this.sinVoz()) this.sis.streamPlayStop();
      return;
    }
    if (this.count3 === 0 && this.sinVoz()) this.voz(13 + this.J.gvTime % 2);
    if (this.count3 > 30) {
      if (this.sinVoz()) {
        this.aCA68();
        this.think2 = 2;
        this.think3 = 4;
        this.count3 = 0;
      }
    } else this.count3++;
  }
  aD260() {
    if (this.count3 === 0) this.aC9E0();
    if (this.aCD1C(350)) {
      if (this.next_node === 2) {
        this.think3 = 4;
        this.count3 = 0;
        return;
      }
      this.aC9E0();
    }
    this.count3++;
  }
  aD2E0() {
    if (this.count3 === 0) this.aC9E0();
    if (this.count3 === 30) {
      this.sis.sacarEstado(STATE.PADRELEASE | STATE.PAUSE_ONLY);
      this.sis.cine(false);
    }
    if (this.aCD1C(350)) {
      this.think3 = 4;
      this.count3 = 0;
    } else this.count3++;
  }
  static enCaja(p, x0, x1, z0, z1) {
    return !(p.x < x0 || p.x > x1 || p.z < z0 || p.z > z1);
  }
  aD474() {
    const sn = this.snake();
    switch (this.fAF4) {
     case 0:
      if (this.count3 === 0) {
        this.pad.dir = 3076;
        this.sis.sacarEstado(STATE.PADRELEASE | STATE.PAUSE_ONLY);
      }
      if (Meryl72.enCaja(sn, 5500, 7e3, -10500, -8e3) && this.sis.vida() !== 0) {
        this.sis.mensajeSnake([ 28923, 6500, 500, -7500, 500, 0, 0 ]);
        this.sis.cine(true);
        this.fAF4 = 100;
        this.count3 = 0;
        this.sis.ponerEstado(STATE.PADRELEASE | STATE.PAUSE_ONLY);
      }
      break;

     case 100:
      if (this.count3 > 30 && (Meryl72.enCaja(sn, 5500, 7e3, -8500, -7e3) || this.count3 > 120) && this.act_status & 1) {
        this.pad.dir = this.sn_dir;
        if (this.sinVoz()) this.voz(1);
        this.proc(2);
        this.fAF4 = 1;
      }
      break;

     case 1:
      if (this.count3 < 140) this.pad.press |= 33554432;
      if (this.count3 > 60 && this.sinVoz()) {
        this.voz(2);
        this.count3 = 0;
        this.fAF4 = 2;
        this.proc(3);
        return;
      }
      if (this.mgr.gameOverTimer() !== 0) {
        if (!this.sinVoz()) this.sis.streamPlayStop();
        this.proc(4);
        this.fAF4 = 255;
      }
      break;

     case 2:
      if (this.count3 > 60 && this.sinVoz()) {
        this.voz(3);
        this.count3 = 0;
        this.fAF4 = 3;
      }
      if (this.mgr.gameOverTimer() !== 0) {
        if (!this.sinVoz()) this.sis.streamPlayStop();
        this.proc(4);
        this.fAF4 = 255;
      }
      break;

     case 3:
      if (this.count3 > 60 && this.sinVoz()) {
        this.proc(4);
        this.think1 = 1;
        this.think2 = 2;
        this.think3 = 1;
        this.count3 = 0;
        this.fC04 = 0;
        return;
      }
      break;
    }
    this.count3++;
  }
  pegadoEn(x0, z0, x1, z1) {
    return this.estadoSnake() & PLAYER.CAUTION && Meryl72.enCaja(this.snake(), x0, x1, z0, z1);
  }
  avisoPared(x0) {
    if (this.pegadoEn(x0, -9e3, 1500, -8500)) {
      if (this.fC10[0] === 0) {
        if (this.puedeHablar()) this.voz(4);
        this.fC10[0] = 1800;
      }
    } else if (this.pegadoEn(5500, -9e3, 7e3, -8500)) {
      if (this.fC10[1] === 0) {
        if (this.puedeHablar()) this.voz(5);
        this.fC10[1] = 1800;
      }
    } else if (this.pegadoEn(-9e3, -9e3, -7500, -8500)) {
      if (this.fC10[2] === 0) {
        if (this.puedeHablar()) this.voz(5);
        this.fC10[2] = 1800;
      }
    }
  }
  aD80C() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (!this.sinVoz()) this.count3 = 0;
    if (this.count3 > 60) this.avisoPared(-1e3);
    if (this.count3 > 60 && this.fC0A > 150) {
      this.think3 = 5;
      this.count3 = 0;
      this.pad.press |= 65536;
    } else if (this.fC04 > 3600 || this.snake().z < -14e3 && this.snake().x > -6e3 && this.snake().x < -4e3) {
      this.think1 = 2;
      this.think2 = 2;
      this.think3 = 4;
      this.count3 = 0;
      this.fC04 = 0;
    } else {
      if (this.count3 % 32 === 0 && !this.insideZone(this.mov, this.param.defends[0])) {
        this.think3 = 2;
        this.count3 = 0;
      }
      this.pad.press |= 65536;
      this.pad.dir = this.sn_dir;
      this.count3++;
    }
  }
  aDA88() {
    this.fC0A = 0;
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      if (!this.sinVoz()) this.sis.streamPlayStop();
      return;
    }
    if (this.count3 === 0) {
      if (this.sinVoz()) {
        if (this.puedeHablar()) this.voz(this.fC0C + 7);
        if (++this.fC0E > 14) this.fC0E = 14;
        if (++this.fC0C > 4) this.fC0C = 0;
      } else {
        this.think3 = 4;
        this.count3 = 0;
        return;
      }
    }
    if (this.count3 > 60 && this.sinVoz()) {
      this.think3 = 4;
      this.count3 = 0;
      this.pad.press |= 65536;
    } else {
      this.pad.press |= 65536;
      this.pad.dir = this.sn_dir;
      this.count3++;
    }
  }
  aDC34() {
    if (!this.sinVoz()) this.count3 = 0;
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (this.count3 > 15) this.avisoPared(1e3);
    if (this.count3 > 60 && this.fC0A > 150) {
      this.think3 = 5;
      this.count3 = 0;
      this.pad.press |= 65536;
    } else if (this.fC04 > 3600 && !(this.modetime[6] & 4) && !this.mgr.stun) {
      this.think1 = 3;
      this.think2 = 0;
      this.think3 = 0;
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.count3 = 0;
      this.fC04 = 0;
    } else if (this.sn_dis > 3e3 && !(this.estadoSnake() & PLAYER.INTRUDE)) {
      this.think2 = 1;
      this.think3 = 2;
      this.count3 = 0;
    } else {
      this.pad.press |= 67108864;
      this.pad.dir = this.sn_dir;
      this.count3++;
    }
  }
  aDEC4() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (this.count3 === 0) this.aCAD8();
    if (this.count3 % 32 === 0 && !this.insideZone(this.mov, this.param.defends[1])) {
      this.think2 = 1;
      this.think3 = 2;
      this.count3 = 0;
    }
    if (this.count3 > 60 && this.fC0A > 150) {
      this.think3 = 5;
      this.count3 = 0;
      this.pad.press |= 65536;
    } else {
      this.pad.press |= 67108864;
      this.pad.dir = this.sn_dir;
      this.count3++;
    }
  }
  aDFC8() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    this.pad.mode = this.sn_dis > 3e3 ? 1 : 0;
    this.aC9A8();
    if (this.aCCC8()) {
      this.think3 = 3;
      this.pad.mode = 0;
      this.count3 = 0;
    } else if (this.sn_dis < 2e3 && this.vision.f06 === 2) {
      this.think2 = 2;
      this.think3 = 4;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aE08C() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
    } else if (this.aCCC8()) {
      this.think3 = 3;
      this.count3 = 0;
    } else if (this.fC04 > 3600) {
      this.think1 = 2;
      this.think2 = 2;
      this.think3 = 4;
      this.count3 = 0;
      this.fC04 = 0;
    } else this.count3++;
  }
  aE124() {
    this.aC9A8();
    if (this.aCCC8()) {
      this.think3 = 3;
      this.count3 = 0;
    } else if (this.sn_dis < 1e3 && this.vision.f06 === 2) {
      this.think3 = 7;
      this.count3 = 0;
    } else this.count3++;
  }
  aE198() {
    if (this.count3 === 0) this.aCAD8();
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (this.aCCC8()) {
      this.think3 = 3;
      this.count3 = 0;
    } else this.count3++;
  }
  aE218() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    this.pad.mode = this.sn_dis > 3e3 ? 1 : 0;
    this.aC9A8();
    if (this.count3 & 32) {
      this.fB5C = this.addr(this.mov);
      if (this.reachTo(this.fB5C, this.target_addr) >= 2) {
        this.think3 = 2;
        this.count3 = 0;
        return;
      }
    }
    if (this.aCD1C(2e3) > 0) {
      this.think2 = 2;
      this.think3 = 4;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aE314() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
    } else if (this.aCD1C(300) > 0) {
      this.think3 = 4;
      this.pad.mode = 0;
      this.count3 = 0;
    } else if (this.fC04 > 3600) {
      this.think1 = 2;
      this.think2 = 2;
      this.think3 = 4;
      this.count3 = 0;
      this.fC04 = 0;
    } else this.count3++;
  }
  aE3BC() {
    this.aC9A8();
    const r = this.aCD1C(1e3);
    if (r < 0 || this.vision.f06 !== 2) {
      this.think3 = 2;
      this.count3 = 0;
    } else if (r > 0) {
      this.think3 = 7;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aE450() {
    if (this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (this.count3 & 32) {
      this.fB5C = this.addr(this.mov);
      if (this.reachTo(this.fB5C, this.target_addr) >= 2) {
        this.think3 = 2;
        this.count3 = 0;
        return;
      }
    }
    if (this.aCD1C(300) > 0) {
      this.think2 = 2;
      this.think3 = 4;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  t2_3() {
    switch (this.think3) {
     case 6:
      this.aCFE0();
      break;

     case 2:
      this.aE124();
      break;

     case 3:
      this.aE3BC();
      break;

     case 7:
      this.aD038();
      break;

     case 8:
      this.aD14C();
      break;
    }
  }
  think72() {
    this.pad.dir = -1;
    this.pad.press = 0;
    switch (this.think1) {
     case 0:
      if (this.think2 === 0) {
        switch (this.think3) {
         case 0:
          this.aCD98();
          break;

         case 1:
          this.aD260();
          break;

         case 4:
          this.aD474();
          break;
        }
        this.fC34 = 30;
      }
      break;

     case 1:
      if (this.think2 === 2) {
        switch (this.think3) {
         case 1:
          this.aD2E0();
          break;

         case 2:
          this.aE08C();
          break;

         case 3:
          this.aE314();
          break;

         case 4:
          this.aD80C();
          break;

         case 5:
          this.aDA88();
          break;
        }
      } else if (this.think2 === 3) this.t2_3();
      break;

     case 2:
      if (this.think2 === 1) {
        if (this.think3 === 2) this.aDFC8(); else if (this.think3 === 3) this.aE218();
      } else if (this.think2 === 2) {
        if (this.think3 === 4) this.aDC34(); else if (this.think3 === 5) this.aDA88();
      } else if (this.think2 === 3) this.t2_3();
      break;

     case 3:
      if (this.think2 === 0) {
        if (this.think3 === 0) this.aCEC4(); else if (this.think3 === 4) this.aCF5C();
      } else if (this.think2 === 1) {
        if (this.think3 === 2) this.aE198(); else if (this.think3 === 3) this.aE450();
      } else if (this.think2 === 2) {
        if (this.think3 === 4) this.aDEC4(); else if (this.think3 === 5) this.aDA88();
      } else if (this.think2 === 3) this.t2_3();
      break;
    }
    for (let i = 0; i < 3; i++) if (--this.fC10[i] < 0) this.fC10[i] = 0;
  }
  static zona9a(p) {
    if (p.z > 1e3 || p.x < 6e3) return 0;
    if (p.z > -1e3 && p.x < 8500) return 0;
    return 1;
  }
  static zona9b(p) {
    return !(p.z > -5e3 || p.x < 6e3);
  }
  aCEE88() {
    return this.aCCC8();
  }
  aCEF58() {
    if (this.stage === 1) {
      this.think3 = 4;
      this.fC04 = 0;
    } else {
      this.think1 = 2;
      this.think2 = 2;
      this.think3 = 4;
      this.fC04 = 5400;
    }
    this.count3 = 0;
  }
  aCEF98() {
    if (this.fC38 > 900) {
      this.think3 = 4;
      this.fC38 = 0;
      this.count3 = 0;
    } else if (!this.insideZone(this.mov, this.param.defends[0])) {
      this.aCA68();
      this.think3 = 2;
      this.count3 = 0;
    } else if (this.sinVoz() && this.act_status & 1) {
      this.sis.girarSnake(this.sn_dir + 2048 & 4095);
      this.think3 = 4;
      this.fC38 = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aCF060() {
    if (this.count3 === 0 && !this.sinVoz()) this.sis.streamPlayStop();
    if (this.fC08 === 2) {
      this.think3 = 2;
      this.count3 = 0;
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.pad.dir = this.sn_dir;
    } else if (this.count3 > 6e3 && this.act_status & 1) {
      this.aCA68();
      this.think2 = 2;
      this.think3 = 4;
      this.count3 = 0;
      this.pad.dir = this.sn_dir;
    } else this.count3++;
  }
  aCF144() {
    if (this.fC08 === 1) {
      this.think3 = 6;
      this.count3 = 0;
      this.sis.sacarEstado(STATE.PADRELEASE);
      return;
    }
    if (this.count3 === 0) {
      const e = this.estadoSnake();
      if (e & (PLAYER.GROUND | PLAYER.SQUAT)) this.pad.press |= 8388608; else if (e & PLAYER.CB_BOX) {
        this.pad.press |= 16777216;
        if (this.sinVoz()) this.voz(12);
      } else this.pad.press |= 4194304;
      this.fC0E = Math.max(0, this.fC0E - 2);
    }
    if (this.count3 > 30 && !(this.act_status & 8) || this.fC08 === 3) {
      this.think3 = 9;
      this.count3 = 0;
      this.sis.sacarEstado(STATE.PADRELEASE);
    } else this.count3++;
  }
  aCF2A4() {
    if (this.fC08 === 1) {
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    const K = this.sis.kore;
    if (this.count3 === 0) K.flag = 1;
    if (this.count3 === 2 && K.flag & 2) {
      K.flag &= ~2;
      this.think3 = 7;
      this.count3 = 0;
      return;
    }
    if (this.count3 === 4) {
      this.pad.press |= 16384;
      this.fC0E = Math.max(0, this.fC0E - 2);
    }
    if (this.count3 >= 5 && (this.count3 > 1500 || !(K.flag & 1))) {
      this.think3 = 9;
      this.count3 = 0;
      this.sis.sacarEstado(STATE.PADRELEASE);
      return;
    }
    this.count3++;
  }
  aCF3AC() {
    this.pad.press |= 65536;
    this.pad.dir = this.sn_dir;
    if (this.fC08 === 1) {
      this.think3 = 6;
      this.count3 = 0;
      if (!this.sinVoz()) this.sis.streamPlayStop();
      return;
    }
    if (this.count3 === 0 && this.sinVoz()) this.voz(13 + this.J.gvTime % 2);
    if (this.count3 > 30) {
      if (this.sinVoz()) {
        this.aCA68();
        this.think2 = 2;
        this.think3 = 4;
        this.count3 = 0;
      }
    } else this.count3++;
  }
  aCF4C0() {
    if (Meryl72.zona9a(this.snake())) this.pad.press |= 65536; else this.pad.press |= 536870912;
    this.pad.dir = this.sn_dir;
    if (this.count3 % 32 === 0 && !this.insideZone(this.mov, this.param.defends[0])) {
      this.aCA68();
      this.think3 = 2;
      this.count3 = 0;
    }
    this.count3++;
  }
  aCF568() {
    if (this.count3 === 0) {
      this.pad.dir = this.sn_dir;
      this.sis.voxStream(this.voices[0], 1073741824);
    }
    if (this.count3 < 150) this.pad.press |= 33554432;
    if (this.count3 === 160) {
      this.sis.streamPlayStart();
      this.fC10[0] = 1800;
      this.pad.press |= 1073741824;
    }
    if (this.count3 > 180 && this.sinVoz()) {
      this.think1 = 2;
      this.think2 = 2;
      this.think3 = 4;
      this.count3 = 0;
      this.fC04 = 0;
      this.sis.sacarEstado(STATE.PADRELEASE | STATE.PAUSE_ONLY | STATE.CUT_IN);
      this.proc(1);
    } else this.count3++;
  }
  aCF67C() {
    this.fC0A = 0;
    if (Meryl72.zona9a(this.snake()) && this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      if (!this.sinVoz()) this.sis.streamPlayStop();
      return;
    }
    if (this.count3 === 0) {
      if (this.sinVoz()) {
        if (this.puedeHablar()) this.voz(this.fC0C + 7);
        if (++this.fC0E > 14) this.fC0E = 14;
        if (++this.fC0C > 4) this.fC0C = 0;
      } else {
        this.think3 = 4;
        this.count3 = 0;
        return;
      }
    }
    if (this.count3 > 60 && this.sinVoz()) {
      this.think3 = 4;
      this.count3 = 0;
      this.pad.press |= 65536;
    } else {
      this.pad.press |= 65536;
      this.pad.dir = this.sn_dir;
      this.count3++;
    }
  }
  aCF824() {
    const sn = this.snake();
    if (Meryl72.zona9a(sn)) this.pad.press |= 65536; else {
      this.pad.press |= 536870912;
      this.fC04++;
    }
    this.pad.dir = this.sn_dir;
    if (!this.sinVoz()) this.count3 = 0;
    if (Meryl72.zona9a(sn) && this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
      return;
    }
    if (this.fC04 > 5400) {
      if (Meryl72.zona9b(sn)) {
        if (this.sinVoz() && this.puedeHablar()) this.voz(18);
        this.fC04 = 0;
      }
    } else if (this.count3 > 60 && this.fC0A > 150) {
      this.think3 = 5;
      this.count3 = 0;
      this.pad.press |= 65536;
      return;
    }
    if ((this.count3 & 31) === 0 && !this.insideZone(this.mov, this.param.defends[0])) {
      this.aCA68();
      this.think3 = 2;
      this.count3 = 0;
    }
    this.count3++;
  }
  aCF9E0() {
    if (this.aCEE88()) {
      this.think3 = 3;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFA28() {
    if (this.fC38 > 900) {
      this.think3 = 4;
      this.fC38 = 0;
      this.count3 = 0;
    } else if (this.aCEE88()) {
      this.think3 = 3;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFA98() {
    if (Meryl72.zona9a(this.snake()) && this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
    } else if (this.aCEE88()) {
      this.think3 = 3;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFB14() {
    this.aC9A8();
    if (this.aCEE88()) {
      this.think3 = 3;
      this.count3 = 0;
    } else if (!Meryl72.zona9a(this.snake())) {
      this.think3 = 9;
      this.count3 = 0;
      this.sis.sacarEstado(STATE.PADRELEASE);
    } else if (this.sn_dis < 1e3 || this.count3 > 300) {
      this.think3 = 8;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFBBC() {
    if (Meryl72.zona9a(this.snake()) && this.fC08 === 1) {
      this.think2 = 3;
      this.think3 = 6;
      this.count3 = 0;
    } else if (this.aCD1C(300) > 0) {
      this.think2 = 2;
      this.think3 = 4;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFC54() {
    if (this.aCD1C(300) > 0) {
      this.think3 = 4;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFCA4() {
    if (this.fC38 > 900 || this.aCD1C(300) > 0) {
      this.think3 = 4;
      this.fC38 = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFD0C() {
    this.aC9A8();
    if (this.aCD1C(1e3) > 0 || this.count3 > 300) {
      this.think3 = 8;
      this.pad.mode = 0;
      this.count3 = 0;
    } else this.count3++;
  }
  aCFD80() {
    switch (this.think3) {
     case 0:
      this.aCEF58();
      break;

     case 4:
      this.aCF4C0();
      break;

     case 2:
      this.aCF9E0();
      break;

     case 3:
      this.aCFC54();
      break;
    }
    if (Meryl72.zona9b(this.snake())) {
      this.think1 = 1;
      this.think2 = 0;
      this.think3 = 0;
      this.fC38 = 0;
      this.count3 = 0;
      this.fC04 = 0;
      this.sis.ponerEstado(STATE.PADRELEASE | STATE.PAUSE_ONLY | STATE.CUT_IN);
      this.proc(0);
    }
  }
  think9() {
    this.pad.dir = -1;
    this.pad.press = 0;
    switch (this.think1) {
     case 0:
      if (this.think2 === 0) this.aCFD80();
      break;

     case 1:
      if (this.think2 === 0) {
        switch (this.think3) {
         case 0:
          this.aCEF98();
          break;

         case 2:
          this.aCFA28();
          break;

         case 3:
          this.aCFCA4();
          break;

         case 4:
          this.aCF568();
          break;
        }
      }
      break;

     case 2:
      if (this.think2 === 2) {
        switch (this.think3) {
         case 2:
          this.aCFA98();
          break;

         case 3:
          this.aCFBBC();
          break;

         case 4:
          this.aCF824();
          break;

         case 5:
          this.aCF67C();
          break;
        }
      } else if (this.think2 === 3) {
        switch (this.think3) {
         case 6:
          this.aCF060();
          break;

         case 2:
          this.aCFB14();
          break;

         case 3:
          this.aCFD0C();
          break;

         case 7:
          this.aCF144();
          break;

         case 8:
          this.aCF2A4();
          break;

         case 9:
          this.aCF3AC();
          break;
        }
      }
      break;
    }
    for (let i = 0; i < 3; i++) if (--this.fC10[i] < 0) this.fC10[i] = 0;
    this.fC38++;
  }
  empuje() {
    const sn = this.snake(), dx = this.mov.x - sn.x, dz = this.mov.z - sn.z, d = Math.hypot(dx, dz);
    if (d >= 600 || d < 1 || Math.abs(sn.y - this.mov.y) > 1200) return;
    const f = (600 - d) / 2;
    this.step.x += Math.round(dx / d * f);
    this.step.z += Math.round(dz / d * f);
    const u = this.f8BC.f18;
    if (u !== 1 && u !== 2) return;
    this.rSphere = this.rSphere < 0 ? this.f8BC.f1A >> 1 : this.rSphere + (this.f8BC.f1A - this.rSphere >> 1);
  }
  cuadro() {
    this.empuje();
    this.actControl();
    this.actMotion();
    const a = this.sis.playerAddress ?? 65535;
    if ((a & 255) === (a >> 8 & 255) && (a & 255) !== 255) {
      this.player_addr = a;
      this.player_pos = this.snake();
    }
    this.actionMain();
    const P = this.param;
    if (P.life !== this.vital) {
      P.life = this.vital;
      this.fC36 = 150;
    }
    if (P.life < 0) P.life = 0;
    if (P.life < P.max_life) P.max_life -= 4;
    const b = this.barras[0];
    b.rest = P.max_life;
    b.now = P.life;
    b.max = this.sis.vidaMax();
    if (this.fC36 > 0) this.fC36--;
    this.fC04++;
    this.sis.kore.pos.copy(this.mov);
  }
  estadoPrueba() {
    return {
      pos: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      rot: this.rot,
      stage: this.stage,
      think: [ this.think1, this.think2, this.think3 ],
      count3: this.count3,
      fAF4: this.fAF4,
      next_node: this.next_node,
      accion: this.f8BC.f18,
      anim: this.motor.action,
      vital: this.vital,
      faint: this.faint,
      sn_dis: this.sn_dis,
      vista: this.vision.f06,
      fC0A: this.fC0A,
      fC04: this.fC04,
      fC08: this.fC08,
      goTimer: this.goTimer,
      voz: this.sis.flujo.codigo,
      estadoVoz: this.sis.streamStatus(),
      blanco: this.blanco
    };
  }
}

export function crearMeryl(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esMeryl(actor)) return null;
  if (esPerro(actor)) return crearPerros(actor, ctx);
  if (esMuneco(actor)) return crearMuneco(actor, ctx);
  if (esTortura(actor)) return crearTortura(actor, ctx);
  if (esCelda(actor)) return crearCelda(actor, ctx);
  const sis = Sistema.de(J, ctx), mgr = sis.mgr;
  const viejo = mgr.lista.find(j => j.actor && j.actor.tipo === actor.tipo && j.vivo);
  if (viejo) viejo.destruir();
  const m = actor.tipo === "MERYL3" ? new Meryl3(actor, mgr, sis) : actor.tipo === "MERYL7" ? new Meryl7(actor, mgr, sis) : new Meryl72(actor, mgr, sis);
  mgr.agregar(m);
  m.cargando = m.iniciar().then(() => {
    m.listo = true;
    actor._meryl = m;
    return m;
  }).catch(e => {
    console.warn("[meryl]", actor.tipo, e);
    m.vivo = false;
    return null;
  });
  return m;
}

export function destruirMeryl(actor) {
  const m = actor?._meryl;
  if (m) {
    m.destruir();
    actor._meryl = null;
    return true;
  }
  return false;
}

export { crearMeryl as crearPersonaje, esMeryl as esPersonaje, destruirMeryl as destruirPersonaje };

export function personajesDe(juego) {
  return juego?.__jefes?.__personajes || null;
}
