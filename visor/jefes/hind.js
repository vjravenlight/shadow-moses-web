// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, ratan2, randU, randS, nearExp4P, nearExp2, cargarModelo, aplicarPose } from "./base.js";

import { apoyo, HASH, rsin, rcos, isqrt, idiv } from "./apoyo3.js";

const WP_STINGER = 4, WP_RIFLE = 9;

const IT_SCOPE = 1, IT_CAMERA = 12, IT_NVG = 5, IT_THERMG = 6;

const PRIMERA = new Set([ IT_SCOPE, IT_CAMERA, IT_NVG, IT_THERMG ]);

const VIDA_HIND = [ 15, 16, 17, 18 ];

const BLAST_57C = [ 256, 256, 512, 1024, 2048 ];

const DAÑO_BALA = [ 90, 90, 135, 135, 180 ];

const L4 = 1010;

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function interp4A24(obj, k, pos, len) {
  const i = idiv(obj[k] * (len - 1) + pos, len);
  const old = obj[k] - i;
  obj[k] = i;
  return old;
}

function interp4A80(v, p, len) {
  v.x = idiv(v.x * (len - 1) + p.x, len);
  v.y = idiv(v.y * (len - 1) + p.y, len);
  v.z = idiv(v.z * (len - 1) + p.z, len);
}

function giro4B68(v, p, len, lenXZ = len) {
  for (const k of [ "x", "y", "z" ]) {
    v[k] &= 4095;
    p[k] &= 4095;
  }
  const d = {
    x: p.x - v.x,
    y: p.y - v.y,
    z: p.z - v.z
  };
  for (const k of [ "x", "y", "z" ]) {
    if (d[k] >= 2048) v[k] += 4096;
    if (d[k] <= -2048) p[k] += 4096;
  }
  v.y = idiv(v.y * (len - 1) + p.y, len);
  v.x = idiv(v.x * (lenXZ - 1) + p.x, lenXZ);
  v.z = idiv(v.z * (lenXZ - 1) + p.z, lenXZ);
}

const envolver = a => {
  a &= 4095;
  return a > 2048 ? a - 4096 : a;
};

const nearExp2P = (a, b) => nearExp2(a, a + envolver(b - a));

function cortarPlano(p0, d, eje, valor) {
  if (d[eje] === 0) return V(2147483647, 2147483647, 2147483647);
  const t = (valor - p0[eje]) / d[eje];
  return V(p0.x + d.x * t, p0.y + d.y * t, p0.z + d.z * t);
}

export class HindD extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "HIND D";
    this.registro = [];
    this.A = apoyo(mgr);
    this.blanco = false;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 800) this.registro.shift();
  }
  num(v, d = 0) {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && v.var) {
      const g = this.A.guion;
      const x = g?.vars?.get?.(v.var);
      if (typeof x === "number" && x > 0) return x;
      if (/G0428/i.test(v.var)) {
        const lv = this.dificultad();
        return lv >= 0 && lv <= 2 ? VIDA_HIND[lv] : 18;
      }
    }
    return d;
  }
  ints(k) {
    return (this.opts[k] || []).map(x => this.num(x, 0));
  }
  hay(k) {
    return Array.isArray(this.opts[k]);
  }
  async iniciar() {
    const o = await cargarModelo(this.ctx, "jefes/hind.glb");
    this.o = new THREE.Group;
    this.o.name = "jefe_MI24HIND";
    this.o.add(o);
    this.modelo = o;
    this.huesos = [];
    for (let i = 0; i < 18; i++) this.huesos.push(o.getObjectByName("hueso_" + i) || null);
    this.padres = this.huesos.map(h => {
      const m = /^hueso_(\d+)$/.exec(h?.parent?.name || "");
      return m ? +m[1] : -1;
    });
    this.rots = Array.from({
      length: 18
    }, () => [ 0, 0, 0 ]);
    this.mgr.mundo.add(this.o);
    this.ctx.teñir?.(o);
    const mis = await cargarModelo(this.ctx, "jefes/hindmsil.glb");
    this.mis1 = mis.clone(true);
    this.mis2 = mis.clone(true);
    this.misVuela = mis.clone(true);
    this.huesos[7]?.add(this.mis1);
    this.huesos[8]?.add(this.mis2);
    this.mgr.mundo.add(this.misVuela);
    this.misVuela.visible = false;
    for (const m of [ this.mis1, this.mis2, this.misVuela ]) this.ctx.teñir?.(m);
    this.f41C = 233;
    this.f420 = 205;
    if (this.hay("r")) {
      const r = this.ints("r");
      if (r.length > 0) this.f41C = r[0];
      if (r.length > 1) this.f420 = r[1];
    }
    this.f444 = 1;
    this.f430 = this.f434 = 1;
    this.f438 = 1;
    if (this.hay("d")) {
      const d = this.ints("d");
      this.f430 = this.f434 = d[0] || 1;
      this.damage = idiv(1024, this.f430) + 1;
      if (d.length > 1) this.f438 = d[1] + 1;
      if (d.length > 4) this.f444 = Math.max(1, d[4]);
    }
    this.f448 = 1;
    this.f44C = this.f450 = this.f454 = this.f458 = 0;
    this.f45C = 40;
    this.f464 = 9e4;
    this.f468 = 1111;
    if (this.hay("g")) {
      const g = this.ints("g"), a = x => idiv(x * 4096, 360);
      [this.f448, this.f44C, this.f450, this.f454, this.f458, this.f45C, this.f460, this.f464, this.f468] = [ g[0] + 1, a(g[1]), a(g[2]), a(g[3]), a(g[4]), g[5], g[6], g[7] * 1e3, idiv(g[8] * 1e6, 108e3) ];
    }
    this.f4BC = V();
    this.turn = V();
    this.rotV = V();
    if (this.hay("p")) {
      const p = this.ints("p"), a = x => idiv(x * 4096, 360);
      this.f4BC.set(p[0] * 1e3, p[1] * 1e3, p[2] * 1e3);
      this.turn.set(a(p[3] || 0), a(p[4] || 0), a(p[5] || 0));
    }
    this.f5FC = this.f4BC.clone();
    this.f60C = this.f4BC.clone();
    this.f4AC = this.hay("b") ? this.ints("b")[0] : 0;
    this.end_proc = this.hay("z") ? this.procId("z") || -1 : -1;
    this.rotV.copy(this.turn);
    this.f504 = idiv(this.f448, 2);
    this.vulnerable = true;
    this.claseBlanco = this.f4AC !== 2;
    this.soloCentro = this.dificultad() >= 3;
    this.life = 1024;
    this.life_total = 1024;
    this.f4B4 = idiv(this.f41C * 4096, 1800);
    this.f4B8 = idiv(this.f420 * 4096, 1800);
    this.f514 = 33200 - idiv(23139, 3);
    this.vox = this.ints("v");
    this.f8EC = this.hay("c") ? this.procId("c") || -1 : -1;
    this.f8F0 = this.hay("s") ? this.procId("s") || -1 : -1;
    this.f5F4 = 1536;
    this.f8C0 = this.f8C4 = this.f5C4 = this.f5C8 = this.f5E0 = this.f5E4 = this.f5E8 = this.f5EC = this.f5F0 = this.f5F8 = 0;
    this.f5D4 = this.f5D8 = this.f5DC = 0;
    this.f5CC = this.f5D0 = 0;
    this.fight_start_flag = 0;
    this.f658 = 0;
    this.f8FC = 5400;
    this.f50C = 0;
    this.nMissileDemoMode = 0;
    this.nMissileDemoMode2 = 0;
    this.f8CC = 0;
    this.f8D0 = this.f8D4 = 0;
    this.f900 = 0;
    this.f930 = this.f4AC === 2 ? 1 : 0;
    if (this.actor.forzado && this.f4AC === 2) this.f930 = 0;
    this.f938 = 0;
    this.f93C = 0;
    this.f940 = -1;
    this.f94C = 0;
    this.f950 = 0;
    this.f954 = randU(8) + 8;
    this.f958 = 0;
    this.f95C = 0;
    this.f960 = 0;
    this.f948 = 0;
    this.f8C8 = 0;
    this.fA74 = 0;
    this.f64C = 0;
    this.f62C = V();
    this.f63C = V();
    this.f66C = 4096;
    this.f670 = 4096;
    this.fA78 = this.A.posCamara();
    this.f964 = V();
    this.f908 = V();
    this.f910 = V();
    this.f918 = V();
    this.mmPosV = V();
    this.mmPos = V();
    this.mmRot = V();
    this.mmTarget = V();
    this.mmBlast = V();
    this.mmDelay = V();
    this.mmHelp2 = V();
    this.f8E0 = null;
    this.f8E4 = null;
    this.f8E8 = null;
    this.last_item = -1;
    this.last_weapon = -1;
    this.nivelBlast = BLAST_57C[Math.max(0, Math.min(4, this.dificultad() + 1))];
    this.tiros = 0;
    this.impactos = 0;
    this.mov = V();
    this.rot = 0;
    this.A.precargarVoces(this.vox);
    this.grande = this.A.agregarGrande({
      nombre: "HIND D",
      jefe: this,
      activo: () => this.vivo && this.listo && this.claseBlanco,
      blancos: () => this.blancosHind(),
      alPegar: (i, p, arma) => {
        this.golpeStinger = {
          i: i,
          p: p,
          arma: arma
        };
      }
    });
    this.quitarOyente = this.A.escuchar(this.actor.nombre ?? 31580, v => this.mensaje(v));
    this.barras = [];
    this.proyectar();
    this.dibujar();
    this.log("inicio", {
      modo: this.f4AC,
      impactos: this.f430,
      "dañoPorImpacto": this.damage,
      pos: this.f4BC.toArray()
    });
  }
  blancosHind() {
    const fij = this.f658 === 0 && this.f50C === 0 && this.vulnerable;
    return this.bl ? this.bl.map((c, i) => ({
      c: c,
      s: this.f66C * 5e3 / 4096,
      fijable: fij && (!this.soloCentro || i === 0)
    })) : [];
  }
  mensaje(v) {
    const h = v[0] & 65535;
    if (h === HASH.BULLET_OFF) {
      this.f930 = 1;
      return true;
    }
    if (h === HASH.BULLET_ON) {
      this.f930 = 0;
      return true;
    }
    if (h === HASH.DESTROY) {
      this.f938 = 1;
      this.saltar = true;
      this.log("destroy");
      return true;
    }
    if (h === HASH.KILL) {
      this.destruirActor();
      return true;
    }
    return false;
  }
  voz(i, chequearBalas = false) {
    if (this.f94C === 1 || chequearBalas && this.f930 !== 0) return;
    if (this.A.estadoVoz() === -1) {
      this.A.hablar(this.vox[i]);
      this.log("voz", {
        i: i,
        id: this.vox[i]
      });
    }
  }
  se(id, posMM = null) {
    this.mgr.se(id, posMM ? posMM.clone().multiplyScalar(MM) : null, posMM ? "bomba" : null);
  }
  cuadro() {
    if (this.f950 < 4) this.f950++; else if (this.gameOverTimer() !== 0 && this.f94C === 0) {
      this.f94C = 1;
      this.A.callar();
      this.mgr.congelar(false);
      this.A.soltarCamara();
    }
    if (this.saltar) {
      this.saltar = false;
      return;
    }
    const pasoAnt = this.f4BC.clone();
    this.rotV.x = nearExp4P(this.rotV.x, this.turn.x) & 4095;
    this.rotV.y = nearExp4P(this.rotV.y, this.turn.y) & 4095;
    this.rotV.z = nearExp4P(this.rotV.z, this.turn.z) & 4095;
    this.cuadroMisilVisual();
    if (--this.f504 < 0) this.f504 = 0;
    if (this.f50C > 0 && --this.f50C === 0) {
      this.vulnerable = true;
      if (this.f434 <= 0) {
        if (this.f658 === 0) this.f658 = 1;
        if (this.f658 === 1) this.f658 = 2;
        this.f5C4 = 0;
        this.f5C8 = 0;
        this.log("derribado");
      }
    }
    if (this.f4AC === 2) this.s11g_hind_800D5820(); else if (this.f4AC === 3) this.s11g_hind_800DAAC8();
    if (!this.vivo) return;
    if (!this.A.stinger()) this.fA78 = this.A.posCamara();
    this.proyectar();
    this.dibujar();
    this.s11g_blastoff_800DBF88();
    this.f64C = 0;
    if (this.f658 === 0 && this.f50C === 0 && this.golpeStinger) {
      const g = this.golpeStinger;
      if (g.arma === WP_STINGER && this.mov.y > 0) {
        this.vulnerable = false;
        this.f64C = this.len1 < 1e4 ? 2 : 1;
        this.f434--;
        this.life -= this.damage;
        this.f50C = this.f438;
        this.impactos++;
        this.log("impacto", {
          blanco: g.i,
          quedan: this.f434,
          vida: this.life,
          lejos: Math.round(this.len1)
        });
      } else this.log("impacto sin efecto", {
        y: Math.round(this.mov.y)
      });
    }
    this.golpeStinger = null;
    if (this.f50C > 0) {
      if (this.mgr.frame % 4 === 0) this.humo(this.mov, 1.2);
      this.destello = this.f50C % 2 === 0;
    } else this.destello = false;
    if (this.f4AC === 2 && this.f5F0 > 0 && this.f94C !== 1) {
      if (this.f8F0 !== -1) {
        if (this.f5F0 === 90) this.A.proc(this.actor, "s", [ 1 ]); else if (this.f5F0 === 1) this.A.proc(this.actor, "s", [ 0 ]);
      }
      this.mgr.congelar(true);
      if (--this.f5F0 === 0) {
        this.mgr.congelar(false);
        this.A.soltarCamara();
        this.restaurarArmas();
      } else {
        const R = this.matRot(this.rotV), ojo = V(this.f5D8 * 4e3, -1e3, -1500).applyMatrix4(R).add(this.mov);
        const s = this.A.snake(), centro = V((s.x + this.mov.x) / 2, (s.y + this.mov.y) / 2 + 1e3, (s.z + this.mov.z) / 2);
        this.A.ponerCamara(ojo, centro, 320);
      }
    }
    if (this.f4AC !== 2) {
      if (this.fight_start_flag === 0) this.fight_start_flag = 1;
      if (this.fight_start_flag === 1) {
        this.fight_start_flag = 2;
        this.barras = [ {
          y: 28,
          rest: 1024,
          now: 1024,
          max: 1024,
          conf: {
            nombre: "HIND",
            izq: [ 16, 111, 159 ],
            der: [ 31, 223, 127 ]
          }
        } ];
      }
      const life = Math.max(0, this.life), b = this.barras[0];
      let rest = this.life_total;
      if (this.life_total < life) rest = life;
      b.rest = rest;
      b.now = life;
      if (Math.max(this.life_total, life) > life) {
        this.life_total -= 8;
        if (this.life_total < life) this.life_total = life;
      }
    }
    this.velocidad = this.f4BC.clone().sub(pasoAnt);
  }
  proyectar() {
    const cam = this.fA78, p0 = cam.clone(), d = this.f4BC.clone().sub(cam);
    let local = this.f4BC.clone(), plano = null;
    if (local.x < -this.f514) {
      plano = [ "x", -this.f514 ];
      local = cortarPlano(p0, d, "x", -this.f514);
    } else if (local.x > this.f514) {
      plano = [ "x", this.f514 ];
      local = cortarPlano(p0, d, "x", this.f514);
    }
    if (local.z < -this.f514) {
      plano = [ "z", -this.f514 ];
      local = cortarPlano(p0, d, "z", -this.f514);
    } else if (local.z > this.f514) {
      plano = [ "z", this.f514 ];
      local = cortarPlano(p0, d, "z", this.f514);
    }
    const len1 = d.length();
    if (!plano) {
      this.f5DC = 0;
      this.f66C = 4096;
      this.f63C.copy(this.f4BC);
    } else {
      this.f5DC = 1;
      local = cortarPlano(p0, d, plano[0], plano[1]);
      this.f63C.copy(local);
      const len2 = local.clone().sub(cam).length();
      this.f66C = len1 === 0 ? len2 * 4096 : len2 * 4096 / len1;
    }
    this.len1 = len1;
    this.mov.copy(local);
    const s = this.f66C / 4096, eye = this.mov.clone();
    eye.y -= 340;
    const R = this.matRot(this.rotV);
    this.bl = [ eye, V(0, -2e3 * s, 4e3 * s).applyMatrix4(R).add(eye), V(0, 0, -8e3 * s).applyMatrix4(R).add(eye) ];
  }
  matRot(r) {
    return (new THREE.Matrix4).makeRotationFromEuler(new THREE.Euler(r.x * ANG, r.y * ANG, r.z * ANG, "YXZ"));
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, this.mov.y * MM, this.mov.z * MM);
    this.o.rotation.set(this.rotV.x * ANG, this.rotV.y * ANG, this.rotV.z * ANG, "YXZ");
    this.o.scale.setScalar(this.f66C / 4096);
    aplicarPose(this.huesos, this.padres, this.rots, null, null);
    if (this.destello !== this.destelloPrev) {
      this.destelloPrev = this.destello;
      this.o.traverse(m => {
        if (m.isMesh && m.material?.color) {
          m.userData.colorBase ??= m.material.color.clone();
          m.material.color.copy(m.userData.colorBase).multiplyScalar(this.destello ? 1.8 : 1);
        }
      });
    }
  }
  s11g_blastoff_800DBF88() {
    const h3 = this.huesos[3], h4 = this.huesos[4];
    if (!h3 || !h4) return 0;
    this.o.updateMatrixWorld(true);
    const P3 = V().setFromMatrixPosition(h3.matrixWorld).multiplyScalar(1e3);
    const q0 = new THREE.Quaternion;
    this.o.getWorldQuaternion(q0);
    const fwd = V(0, 0, 1).applyQuaternion(q0);
    const tgt = this.f62C;
    let yawRel = envolver(ratan2(P3.x - tgt.x, P3.z - tgt.z) - ratan2(-fwd.x, -fwd.z));
    const P4 = V().setFromMatrixPosition(h4.matrixWorld).multiplyScalar(1e3);
    const dd = P4.clone().sub(tgt), elevT = ratan2(dd.y, isqrt(dd.x * dd.x + dd.z * dd.z));
    const qy = q0.clone().multiply((new THREE.Quaternion).setFromAxisAngle(V(0, 1, 0), yawRel * ANG)), fw2 = V(0, 0, 1).applyQuaternion(qy);
    const elevN = ratan2(-fw2.y, Math.hypot(fw2.x, fw2.z));
    let pitchRel = envolver(elevT - elevN), puede = 1;
    if (this.f44C + this.f454 < Math.abs(pitchRel) || this.f450 + this.f458 < Math.abs(yawRel)) {
      puede = 0;
      pitchRel = 0;
      yawRel = 0;
    } else {
      pitchRel = Math.max(-this.f44C, Math.min(this.f44C, pitchRel));
      yawRel = Math.max(-this.f450, Math.min(this.f450, yawRel));
    }
    this.rots[3][1] = nearExp2P(this.rots[3][1], yawRel);
    this.rots[4][0] = nearExp2P(this.rots[4][0], pitchRel);
    if (this.f930 !== 0 || this.f4AC !== 2 && this.f4AC !== 3 || this.f5D4 !== 1) return puede;
    if (this.mgr.frame % this.f448 !== 0) return puede;
    if (this.f4AC === 2) {
      if (--this.f954 < 0) {
        this.f954 = randU(8) + 4;
        this.f958 = 1 - this.f958;
      }
      if (this.f958 !== 0) return puede;
    }
    this.f504 = this.f448;
    aplicarPose(this.huesos, this.padres, this.rots, null, null);
    this.o.updateMatrixWorld(true);
    const boca = V(0, 0, L4 * MM).applyMatrix4(h4.matrixWorld).multiplyScalar(1e3);
    const q4 = new THREE.Quaternion;
    h4.getWorldQuaternion(q4);
    const dir = V(0, 0, 1).applyQuaternion(q4).normalize();
    const daño = DAÑO_BALA[Math.max(0, Math.min(4, this.dificultad() + 1))];
    this.A.bala({
      origen: boca,
      dir: dir,
      "daño": daño,
      largo: this.f464,
      vel: this.f468,
      tam: this.f45C
    });
    this.mgr.chispa(boca.clone().multiplyScalar(MM), .5 * this.f66C / 4096, 2, 16769184);
    this.tiros++;
    return puede;
  }
  s11g_hind_800D4744() {
    if (this.f94C === 1 || this.f930 !== 0) return;
    this.f5F0 = 90;
    this.A.cine(90);
    this.guardarArmas();
    this.voz(this.f8C4++ % 4, true);
    this.f5D8 = this.mov.x <= 0 ? 1 : -1;
    this.log("escena liquid");
  }
  s11g_hind_800D48E8() {
    const s = this.A.snake();
    this.f62C.set(s.x + randS(2) * 500, s.y + randS(2) * 500, s.z + randS(2) * 500);
  }
  s11g_hind_800D4990() {
    const s = this.A.snake(), m = V((s.x + this.f63C.x) / 2, (s.y + this.f63C.y) / 2, (s.z + this.f63C.z) / 2);
    return this.A.paredEntre(s, m);
  }
  s11g_hind_800D4DD0() {
    const F = this;
    switch (F.f5C8) {
     case 0:
      F.f5C8 = 1;
      F.f5E4 = 8;
      F.f60C.copy(F.f4BC);

     case 1:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 16); else {
        F.f5C8 = 2;
        F.f5E4 = randU(16) + 60;
        F.f60C.copy(F.f4BC);
        F.f60C.y = 2e4;
      }
      break;

     case 2:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 64); else {
        F.f8CC = 1;
        F.f5C8 = 3;
        F.f5E4 = randU(32) + 90;
        F.f5E8 = randU(2);
        if (F.f60C.x < 0) F.f60C.set(randU(16384) + 55e3, randU(4096) + 2e4, 8e3 - randU(4096)); else F.f60C.set(-(randU(16384) + 55e3), 2e4, 12e3 - randU(4096));
        F.f61C = F.f60C.clone();
      }
      break;

     case 3:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 128); else {
        if (F.f5E8 < 0) {
          F.f5C8 = 4;
          F.f5E4 = randU(128) + 128;
          if (F.f60C.x < 0) F.f60C.x = -2e4;
          if (F.f60C.x > 0) F.f60C.x = 2e4;
          F.f60C.y = 7e3;
          F.f60C.z = F.A.snake().z + randS(4096);
          if (F.f60C.z > 12e3) F.f60C.z = 12e3 - randS(4096);
        } else {
          F.f5C8 = 3;
          F.f5E4 = randU(16) + 10;
          F.f60C.set(F.f61C.x + randS(8192), F.f61C.y + randS(8192), F.f61C.z + randS(8192));
        }
        F.f5E8--;
      }
      break;

     case 4:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 32); else {
        F.f5C4 = 2;
        F.f5C8 = 0;
      }
      break;
    }
  }
  s11g_hind_800D50F0() {
    const F = this;
    switch (F.f5C8) {
     case 0:
      F.f5C8 = 1;
      F.f5E4 = 8;
      F.f60C.copy(F.f4BC);

     case 1:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 16); else {
        F.f5C8 = 2;
        F.f5E4 = randU(16) + 60;
        F.f60C.copy(F.f4BC);
        F.f60C.y = 2e4;
      }
      break;

     case 2:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 64); else {
        F.f5C8 = 3;
        F.f5E4 = randU(32) + 150;
        F.f5E8 = randU(4) * 2 + 8;
        F.f60C.set(randS(4096) + 2e3, randU(1024) + 9e3, randS(2048) - 15e3);
      }
      break;

     case 3:
      if (F.f5D4 === 1 && F.snakeInvencible()) {
        F.f5D4 = 0;
        F.f5C4 = 0;
        F.f5C8 = 0;
        F.s11g_hind_800D4744();
      } else if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 128); else {
        F.voz(4 + F.f8C0++ % 4, true);
        if (randU(4) !== 0) {
          if (!(F.f5E8 & 1) && F.f5EC < 0) {
            F.s11g_hind_800D48E8();
            F.f5D4 = 1;
          } else {
            F.f5D4 = 0;
            F.f954 = randU(8) + 8;
          }
          F.f5C8 = 3;
          F.f5E4 = randU(32) + 150;
          F.f60C.set(randS(4096) + 2e3, randU(4096) + 12e3, randS(2048) - 2e3);
        } else {
          F.f5D4 = 0;
          F.f954 = randU(8) + 8;
          F.f5C4 = 0;
          F.f5C8 = 0;
        }
        F.f5E8--;
      }
      break;
    }
  }
  s11g_hind_800D5420() {
    const F = this;
    switch (F.f5C8) {
     case 0:
      F.f5C8 = 1;
      F.f5E4 = 8;
      F.f60C.copy(F.f4BC);
      F.f61C = F.f4BC.clone();
      F.f5E8 = randU(4) + 4;
      F.s11g_hind_800D48E8();

     case 1:
      if (F.f5D4 === 1 && F.snakeDañado() && F.f5EC < 0) {
        F.f5D4 = 0;
        F.f954 = randU(2) + 4;
        F.f5E4 = -1;
        F.f5E8 = -1;
        F.f5EC = 60;
        F.s11g_hind_800D4744();
      }
      if (F.f5E4 <= 0) {
        F.f61C.y += 1500;
        if (F.f61C.y > 8e3) F.f61C.y = randS(4096) + 5e3;
        if (F.f5E8 < 0 || F.s11g_hind_800D4990()) {
          if (randU(2) === 0) {
            F.f5D4 = 0;
            F.f954 = randU(4) + 4;
            if (randU(8) === 0) {
              const r = randU(8);
              F.voz(r <= 5 ? 11 : r === 6 ? 12 : 16, true);
            }
            if (randU(8)) {
              F.f5C4 = 0;
              F.f5C8 = 0;
            } else {
              F.f5C4 = 1;
              F.f5C8 = 0;
            }
          } else {
            const r = randU(4);
            if (r === 0) F.voz(10, true); else if (r === 1) F.voz(9, true);
            F.f5C8 = 2;
            F.f5E4 = randU(32) + 60;
            F.f60C.set(F.f61C.x, F.f61C.y + randU(4096), F.A.snake().z + randS(8192));
            if (F.f60C.z > 12e3) F.f60C.z = 12e3 - randS(4096);
          }
        } else {
          if (!(F.f5E8 & 1) && F.f5EC < 0) {
            F.s11g_hind_800D48E8();
            F.f5D4 = 1;
          } else {
            F.f5D4 = 0;
            F.f954 = randU(4) + 4;
          }
          F.f5C8 = 1;
          F.f5E4 = randU(32) + 60;
          F.f60C.set(F.f61C.x, F.f61C.y + randS(2048), F.A.snake().z + randS(8192));
          if (F.f60C.z > 12e3) F.f60C.z = 12e3 - randS(4096);
        }
        F.f5E8--;
      } else interp4A80(F.f5FC, F.f60C, 128);
      break;

     case 2:
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 128);
        return;
      }
      F.f5C8 = 1;
      F.f5E4 = randU(32) + 60;
      F.f5E8 = randU(2) + 2;
      F.f60C.set(F.f61C.x, F.f61C.y - randU(8192), F.A.snake().z + randS(8192));
      if (F.f60C.z > 12e3) F.f60C.z = 12e3 - randS(4096);
      break;
    }
  }
  "snakeDañado"() {
    return this.mgr.frame - this.A.snakeDañado <= 1;
  }
  snakeInvencible() {
    return this.A.snakeInvencible();
  }
  s11g_hind_800D5820() {
    if (this.f938 === 1) {
      this.voz(8, true);
      this.destruirActor();
      return;
    }
    const s = this.A.snake();
    this.f62C.copy(s);
    this.f5E0++;
    this.f5E4--;
    this.f5EC--;
    switch (this.f5C4) {
     case 0:
      this.s11g_hind_800D4DD0();
      break;

     case 1:
      this.s11g_hind_800D50F0();
      break;

     case 2:
      this.s11g_hind_800D5420();
      break;
    }
    const t = this.f5E0;
    this.f5FC.y += idiv(rsin(t * 64) - rsin((t - 1) * 64), 2);
    this.f5FC.x += rsin(t * 23) - rsin((t - 1) * 23);
    this.f5FC.z += rsin(t * 32) - rsin((t - 1) * 32);
    const tx = interp4A24(this.f4BC, "x", this.f5FC.x, 40);
    interp4A24(this.f4BC, "y", this.f5FC.y, 26);
    const tz = interp4A24(this.f4BC, "z", this.f5FC.z, 40);
    const dx = s.x - this.f4BC.x >> 1, dz = s.z - this.f4BC.z >> 1;
    giro4B68(this.turn, V(0, ratan2(dx, dz) & 4095, 0), 128);
    const t2 = V(tx, 0, -tz).applyAxisAngle(V(0, 1, 0), this.rotV.y * ANG);
    this.turn.x = Math.round(t2.z);
    this.turn.z = Math.round(t2.x);
    this.rotores();
    const pos = V(idiv(s.x * 7 + this.f4BC.x, 8), s.y, idiv(s.z * 7 + this.f4BC.z, 8));
    if (this.mgr.frame % 4 === 0 && this.f930 === 0) {
      if (this.f5F0 > 0) this.mgr.se(181, null); else switch (this.f8CC) {
       case 0:
        this.se(181, pos);
        break;

       case 1:
        this.f8CC = 2;
        this.mgr.se(179, null);
        this.se(181, pos);
        break;

       case 2:
        this.f8CC = 3;
        this.se(182, pos);
        break;

       case 3:
        this.f8CC = 4;
        this.se(183, pos);
        break;

       case 4:
        this.f8CC = 0;
        this.se(184, pos);
        break;
      }
    }
    if (this.f958 === 0 && this.mgr.frame % 2 === 0 && this.f930 === 0 && this.f5D4 === 1) this.se(177, pos);
  }
  rotores() {
    this.rots[1][1] = this.rots[1][1] - this.f4B4 & 4095;
    this.rots[2][0] = this.rots[2][0] - this.f4B8 & 4095;
  }
  guardarArmas() {
    const inv = this.J.ctx.inventario;
    if (!inv) return;
    this.last_item = inv.item;
    this.last_weapon = inv.arma;
    if (PRIMERA.has(inv.item)) inv.item = -1;
    if (inv.arma === WP_RIFLE || inv.arma === WP_STINGER) inv.arma = -1;
  }
  restaurarArmas() {
    const inv = this.J.ctx.inventario;
    if (!inv) return;
    if (this.last_weapon === WP_RIFLE || this.last_weapon === WP_STINGER) inv.arma = this.last_weapon;
    if (PRIMERA.has(this.last_item)) inv.item = this.last_item;
    this.last_weapon = -1;
    this.last_item = -1;
  }
  s11g_hind_800DAAC8() {
    const F = this;
    F.f5D4 = 0;
    F.f5F4 = F.f5F4 + 4096 & 4095;
    F.f62C.copy(F.A.snake());
    F.f5E0++;
    F.f5E4--;
    F.f5EC--;
    if (F.f8FC > 0) F.f8FC--;
    if (F.f434 < idiv(F.f430, 3) && (F.mgr.frame & 3) === 0) F.humo(F.f63C, F.f66C / 4096 * 1.5);
    if (F.f5C4 !== 4 && F.f658 === 0 && F.mov.y > 9e3) {
      let pasa = false;
      if (F.f8FC === 0) pasa = true; else if (F.f434 < idiv(F.f430 * 2, 3) && F.f8FC > 0) {
        pasa = true;
        F.se(129, F.f964);
      }
      if (pasa) {
        F.f8FC = -1;
        F.f658 = 1;
        F.f5C4 = 0;
        F.f5C8 = 0;
        F.log("misil grande");
      }
    }
    switch (F.f658) {
     case 0:
      if (F.f5C4 !== 4 && F.f64C !== 0) {
        F.f5CC = F.f5C4;
        F.f5D0 = F.f5C8;
        F.f5C4 = 4;
        F.f5C8 = 0;
      }
      switch (F.f5C4) {
       case 0:
        F.s11g_hind_800DA7C4();
        break;

       case 1:
        F.s11g_hind_800D9B80();
        break;

       case 2:
        F.s11g_hind_800D96B0();
        break;

       case 4:
        F.s11g_hind_800D9344();
        break;
      }
      break;

     case 1:
      if (F.f5C4 === 0) F.s11g_hind_800D6848();
      break;

     case 2:
      if (F.f5C4 === 0) F.s11g_hind_800D7644();
      break;

     case 3:
      F.fA74 = 1;
      F.destruirActor();
      return;
    }
    const s1 = F.f5E0;
    F.f5FC.x += rsin(s1 * 23) - rsin((s1 - 1) * 23);
    F.f5FC.z += rsin(s1 * 32) - rsin((s1 - 1) * 32);
    if (F.A.stinger()) F.f93C = 1; else if (F.f658 === 0 && F.f60C.y > 0) {
      if (F.f5FC.y > 2e4) F.f5FC.y = 2e4;
      const camY = F.A.posCamara().y;
      if (camY < 1e4) {
        if (F.f93C === 0) {
          F.f93C = 1;
          F.f5FC.y += 5e3;
          F.f4BC.y = F.f5FC.y;
        }
        F.f5FC.y -= idiv(F.f5FC.y - 15e3, 16);
      } else {
        if (F.f93C === 1) {
          F.f93C = 0;
          F.f5FC.y -= 5e3;
          F.f4BC.y = F.f5FC.y;
        }
        F.f5FC.y -= idiv(F.f5FC.y - 1e4, 16);
      }
    }
    const a1 = F.A.snake();
    F.f964.set(idiv(a1.x * 31 + F.f4BC.x, 32), a1.y, idiv(a1.z * 31 + F.f4BC.z, 32));
    const s2 = isqrt(F.f964.x ** 2 + F.f964.y ** 2 + F.f964.z ** 2);
    const s4 = s2 - F.f8C8;
    F.f8C8 = s2;
    const k = F.f900 !== 0 ? [ 4, 4, 4 ] : [ 32, 16, 32 ];
    const vx = interp4A24(F.f4BC, "x", F.f5FC.x, k[0]);
    interp4A24(F.f4BC, "y", F.f5FC.y, k[1]);
    const vz = interp4A24(F.f4BC, "z", F.f5FC.z, k[2]);
    let tx = idiv(vx, 2), tz = idiv(-vz, 2);
    tx = Math.max(-128, Math.min(128, tx));
    tz = Math.max(-128, Math.min(128, tz));
    const t2 = V(tx, 0, tz).applyAxisAngle(V(0, 1, 0), F.rotV.y * ANG);
    const yaw = ratan2(F.f62C.x - F.f4BC.x >> 1, F.f62C.z - F.f4BC.z >> 1) & 4095;
    const sp18 = V(Math.round(t2.z), yaw, Math.round(t2.x));
    switch (F.f5C4) {
     case 0:
      giro4B68(F.turn, sp18, 64, 8);
      break;

     case 1:
      giro4B68(F.turn, sp18, 16, 8);
      break;

     case 2:
      giro4B68(F.turn, sp18, 32, 8);
      break;

     case 4:
      if (F.f5C8 === 4) {
        const a = sp18.clone();
        a.y += idiv(F.f5E4, 10) * 512 - 256;
        giro4B68(F.turn, a, 32, 8);
      }
      if (F.f5C8 === 4 || F.f5C8 === 5) {
        const b = sp18.clone();
        b.y -= idiv(F.f5E4, 10) * 256 - 128;
        giro4B68(F.turn, b, 32, 8);
      }
      break;
    }
    if (F.f900 !== 0) {
      if ((F.mgr.frame & 15) === 0 || randU(16) === 0) {
        const s0 = Math.max(1, s2 >> 3);
        const p = F.mov.clone();
        p.x += randU(32768) % s0;
        p.y += randU(32768) % s0 >> 2;
        p.z += randU(32768) % s0;
        F.explosion(p, .8);
        F.mgr.se(176, null);
        F.mgr.se(41, null);
        if (randU(2)) F.mgr.se(39, null);
        if (randU(2)) F.mgr.se(40, null);
        F.turn.x += randS(512);
        F.turn.y += randS(512);
        F.f948 = 255;
      }
      F.f948 -= 8;
      F.ctx.juego?.ctx?.vibrar?.(1);
      giro4B68(F.turn, sp18, 16, 8);
    }
    if (F.f95C > 0 && --F.f95C === 0) F.se(F.f960, F.f964);
    if (F.f940 === -1) {
      F.f940 = 1;
      if (F.gameOverTimer() === 0) F.ctx.musica?.(16777218);
    }
    if (F.J.vida > 0 && F.gameOverTimer() === 0 && !F.J.muerto) {
      if (F.f940 === 0 && F.mov.y > 0) {
        F.f940 = 1;
        F.ctx.musica?.(33554179);
        F.ctx.musica?.(4278190334);
        F.f944 = 30;
      } else if (F.f940 === 1 && F.mov.y < 0) {
        F.f940 = 0;
        F.se(200, F.mov);
        F.mgr.se(204, null);
        F.ctx.musica?.(33554185);
      }
    }
    if (F.f8CC === 2) {
      F.se(182, F.f964);
      F.f8CC = 3;
    } else if (F.f8CC === 3) {
      F.se(183, F.f964);
      F.f8CC = 4;
    } else if (F.f8CC === 4) {
      F.se(184, F.f964);
      F.f8CC = 5;
    }
    if (F.f658 >= 2) {
      if (F.mgr.frame % 6 === 0) F.se(186, F.f964);
    } else if (F.mgr.frame % 4 === 0) {
      if (F.f8CC === 0) F.se(181, F.f964); else if (F.f8CC === 1) {
        F.se(181, F.f964);
        if (Math.abs(F.f4BC.x) < 1e4 && Math.abs(F.f4BC.z) < 1e4) {
          F.f8CC = 2;
          F.mgr.se(179, null);
        }
      } else if (F.f8CC === 5) {
        F.se(185, F.f964);
        if (s4 === 0) F.f8CC = 0;
      }
    }
    if (F.mgr.frame % 2 === 0 && F.f5D4 === 1) F.se(177, F.f964);
    if (F.f8D0 === 1) {
      F.f8D0 = 0;
      F.se(176, F.f964);
    }
    if (F.f8D4 === 1) {
      F.f8D4 = 0;
      F.se(180, F.f964);
    }
    F.rotores();
  }
  s11g_hind_800D5E44(se) {
    this.f95C = 30;
    this.f960 = se;
  }
  s11g_hind_800D61F8() {
    this.f65C = V(randS(128), randS(128), randS(128));
    this.f664 = V(randS(512), randS(512), randS(512));
  }
  s11g_hind_800D9344() {
    const F = this;
    switch (F.f5C8) {
     case 0:
      {
        if (idiv(F.f430 * 7, 8) < F.f434) F.s11g_hind_800D5E44(randU(4096) % 2 + 130); else F.voz(25 + F.f8C4++ % 3);
        F.f5C8 = 4;
        F.f5E4 = randU(8) + 32;
        F.f8D0 = 1;
        const sg = () => randU(2) * 2 - 1;
        F.f60C.x += (randU(4096) + 1e4) * sg();
        F.f60C.y += -1e3 - randU(4096);
        F.f60C.z += (randU(4096) + 1e4) * sg();
        F.f5F4 += randS(256);
      }

     case 4:
      if (F.f5E4 > 0) {
        interp4A80(F.f60C, F.f5FC, 32);
        interp4A80(F.f5FC, F.f60C, 32);
      } else {
        F.f5C8 = 5;
        F.f5E4 = randU(8) + 32;
        F.f60C.copy(F.f4BC);
      }
      break;

     case 5:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 16); else {
        F.f64C = 0;
        if (F.f5C4 === 2) {
          F.f5C8 = 6;
          F.f5E4 = 0;
        } else if (F.f5CC === 1 && F.f5D0 === 5) {
          F.f5C4 = F.f5CC;
          F.f5C8 = F.f5D0;
          F.f5E4 = 5;
        } else {
          F.f5C8 = 0;
          F.f5C4 = F.f5CC;
        }
      }
      break;
    }
  }
  s11g_hind_800DA534() {
    const F = this;
    F.s11g_hind_800D61F8();
    F.f5C8 = 5;
    F.f5E4 = 100;
    F.f5F8 = randU(2);
    F.f5F4 = F.f5F4 + 2048 & 4095;
    if (F.f5F4 > 256 && F.f5F4 < 1792) F.f5F4 = F.f5F4 < 1024 ? 256 : 1792;
    F.f60C.x = rcos(F.f5F4) * 43;
    F.f60C.y = idiv(F.f60C.y + 1e4, 2);
    F.f60C.z = rsin(F.f5F4) * 43;
  }
  s11g_hind_800DA614() {
    const F = this;
    F.s11g_hind_800D61F8();
    F.f5C8 = 6;
    F.f5E4 = randU(8) + 16;
    const lv = F.dificultad();
    let am;
    if (lv <= 1) {
      if (F.f5E8 < 10 && (F.f5E8 & 3) === 0 && randU(2) === 0) F.f5F8 = 1 - F.f5F8;
      am = 64;
    } else {
      if ((F.f5E8 === 5 || F.f5E8 === 10) && randU(2) === 0) F.f5F8 = 1 - F.f5F8;
      am = lv === 2 ? 70 : 72;
    }
    F.f5F4 += F.f5F8 ? am : -am;
    F.f60C.x = rcos(F.f5F4) * (idiv(F.f5E8, 2) + 29);
    F.f60C.y = 32e3;
    F.f60C.z = rsin(F.f5F4) * (idiv(F.f5E8, 2) + 29);
  }
  s11g_hind_800DA7C4() {
    const F = this;
    switch (F.f5C8) {
     case 0:
      F.f5C8 = 4;
      F.f5E4 = 0;
      F.f60C.copy(F.f4BC);
      F.f60C.y = 13e3;

     case 4:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 32); else {
        F.f5C8 = 7;
        F.f5E4 = 0;
      }
      break;

     case 5:
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 128);
        F.f5D4 = 1;
      } else if (idiv(F.f430 * 2, 3) < F.f434) {
        F.f5F8 = envolver(F.f5F4 - F.turn.y) > 0 ? 1 : 0;
        F.f5E8 = 24;
        F.s11g_hind_800DA614();
      } else {
        F.f5C8 = 8;
        F.f5E4 = randU(16) + 32;
        F.f60C.set(idiv(rcos(F.f5F4) * 3e4, 4096), 25e3, idiv(rsin(F.f5F4) * 3e4, 4096));
        F.f5F4 = F.f5F4 + (randS(126) + 700) * (randU(2) * 2 - 1) & 4095;
      }
      break;

     case 6:
      if (F.f5E8 > 9) F.f62C.copy(F.f60C);
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 64); else if (F.f5E8 > 0) {
        F.s11g_hind_800DA614();
        F.f5E8--;
      } else {
        F.f5C8 = 7;
        F.f5E4 = 10;
      }
      break;

     case 7:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 32); else {
        F.f8CC = 1;
        F.s11g_hind_800DA534();
      }
      break;

     case 8:
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 128); else {
        F.f5C4 = 2;
        F.f5C8 = 0;
      }
      break;
    }
  }
  s11g_hind_800D9B80() {
    const F = this, lv = F.dificultad(), duro = lv === 2 || lv === 3;
    const arco = a => a - 257 >= 0 && a - 257 < 1535;
    switch (F.f5C8) {
     case 0:
      F.f5C8 = 4;
      F.f5E4 = 20;
      F.f60C.copy(F.f4BC);
      F.f60C.y = 1e4;
      F.f5F8 = randU(2);

     case 4:
      F.f5D4 = 1;
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 8);
        break;
      }
      F.f5F4 &= 4095;
      if (arco(F.f5F4)) {
        F.f5C8 = 4;
        F.f5E4 = 2;
        const a = duro ? 16 : 8;
        F.f5F4 = F.f5F4 < 1024 ? F.f5F4 - a : F.f5F4 + a;
      } else {
        F.f5C8 = 5;
        if (lv === 2) {
          F.f5E4 = randU(16) + 20;
          F.f5E8 = randU(2) + 3;
        } else if (lv === 3) {
          F.f5E4 = randU(16) + 20;
          F.f5E8 = randU(2) + 2;
        } else {
          F.f5E4 = randU(32) + 70;
          F.f5E8 = randU(4) * 4 + 4;
        }
      }
      F.f60C.set(rcos(F.f5F4) * 8, 13e3, rsin(F.f5F4) * 8);
      break;

     case 5:
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, duro ? 32 : 40);
        break;
      }
      if (F.f5E8 > 0) {
        F.f5E8--;
        F.f5C8 = 5;
        F.f5E4 = duro ? randU(16) + 20 : randU(32) + 30;
        const a = F.f5F4;
        if (arco(a)) {
          F.f5F8 = a < 1025 ? 0 : 1;
          F.f5E8 = randU(4) * 2 + 4;
        } else if (a - 2561 >= 0 && a - 2561 < 1026 && (F.mgr.frame & 63) === 0 && randU(2) === 0) {
          F.f5E8 = randU(4) * 2 + 4;
          F.f5F8 = 1 - F.f5F8;
        }
        F.f5F4 += F.f5F8 ? 256 : -256;
        F.f60C.x = idiv(rcos(F.f5F4) * 3e4, 4096);
        F.f60C.z = idiv(rsin(F.f5F4) * 3e4, 4096);
        F.f60C.y = idiv(F.f60C.y - 15e3, 2);
      } else {
        F.f5F4 &= 4095;
        F.f5E8 = randU(2);
        F.f5E4 = randU(16) + 60;
        F.f5F4 += F.f5F8 ? 256 : -256;
        F.f5C8 = 6;
      }
      break;

     case 6:
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 16);
        break;
      }
      F.f8D4 = 1;
      F.f5C8 = 7;
      F.f5E4 = randU(16) + 60;
      {
        const s1 = F.f5F4 + (F.f5F8 ? randU(256) : -randU(256));
        if (!(F.f5F4 - 501 >= 0 && F.f5F4 - 501 < 1099)) F.f5F4 = s1;
      }
      F.f60C.set(idiv(rcos(F.f5F4) * 2e4, 4096), 1e4, idiv(rsin(F.f5F4) * 2e4, 4096));
      break;

     case 7:
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 4);
        break;
      }
      F.f5C8 = 8;
      if (lv === 2) {
        F.f5E4 = randU(8) + 32;
        F.f5E8 = randU(2) + 1;
      } else if (lv === 3) {
        F.f5E4 = randU(4) + 32;
        F.f5E8 = randU(2) + 1;
      } else {
        F.f5E4 = randU(8) + 32;
        F.f5E8 = randU(2) + 2;
      }
      F.f60C.x = idiv(rcos(F.f5F4) * 25e3, 4096);
      F.f60C.z = idiv(rsin(F.f5F4) * 25e3, 4096);
      F.f60C.y = idiv(F.f60C.y + 1e4, 2);
      switch (F.f8C0++ % 4) {
       case 0:
       case 2:
        F.se(132, F.f964);
        break;

       case 1:
        F.voz(23);
        break;

       case 3:
        F.voz(24);
        break;
      }
      break;

     case 8:
      F.f5D4 = 1;
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 64);
        break;
      }
      if (F.f5E8 > 0) {
        F.f5E8--;
        F.f5C8 = 8;
        F.f5E4 = randU(8) + 32;
        F.f5F8 = randU(2);
        F.f5F4 = F.f5F8 ? F.f5F4 - (randS(128) - 512) : F.f5F4 + (randS(128) - 512);
        F.f60C.x = idiv(rcos(F.f5F4) * 25e3, 4096) + 5e3;
        F.f60C.z = idiv(rsin(F.f5F4) * 25e3, 4096) + 5e3;
        F.f60C.y = idiv(F.f60C.y + (F.f60C.z < 4e3 ? 13e3 : 1e4), 2);
      } else if (F.f434 < idiv(F.f430, 5) && randU(4) < 3) {
        F.f5C8 = 5;
        F.f5E4 = randU(32) + 30;
        F.f5E8 = randU(4) * 4 + 4;
        F.f5F4 = (F.f5F4 & 4095 & 7680) + 256;
        F.f60C.x = idiv(rcos(F.f5F4) * 3e4, 4096);
        F.f60C.z = idiv(rsin(F.f5F4) * 3e4, 4096);
        F.f60C.y = idiv(F.f60C.y + 1e4, 2);
      } else {
        F.f5C4 = 2;
        F.f5C8 = 0;
      }
      break;
    }
  }
  s11g_hind_800D96B0() {
    const F = this, s = F.A.snake();
    const r25 = a => idiv(rcos(a) * 25e3, 4096), s25 = a => idiv(rsin(a) * 25e3, 4096);
    switch (F.f5C8) {
     case 0:
      F.f5C8 = 4;
      F.f5E4 = randU(16) + 30;
      F.f60C.y = F.f60C.z < 4e3 || F.mov.z < 4e3 ? 1e4 : idiv(F.f60C.y + 13e3, 2);

     case 4:
      F.f5D4 = 1;
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 16);
        break;
      }
      F.f5C8 = 5;
      F.f5E4 = randU(16) + 20;
      F.f5E8 = randU(2);
      F.f60C.x = r25(F.f5F4) + 9e3;
      F.f60C.z = s25(F.f5F4) + 9e3;
      F.f60C.y = idiv(F.f60C.y + (F.f60C.z < 4e3 || F.mov.z < 4e3 ? 5e3 : 13e3), 2);
      break;

     case 5:
      if (F.f5E4 < 10) F.f5D4 = 1;
      F.f65C ??= V();
      F.f664 ??= V();
      F.f62C.set(s.x + F.f664.x + F.f65C.x * F.f5E4, s.y + F.f664.y + F.f65C.y * F.f5E4, s.z + F.f664.z + F.f65C.z * F.f5E4);
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 40);
        break;
      }
      if (F.f5E8 > 0) {
        F.f5E8--;
        F.f5C8 = 5;
        F.f5E4 = randU(16) + 40;
        F.f5F4 += randU(2) ? randU(64) + 256 : -(randU(64) + 256);
        F.f60C.x = r25(F.f5F4);
        F.f60C.z = s25(F.f5F4);
        F.f60C.y = idiv(F.f60C.y + (F.f60C.z < 4e3 || F.mov.z < 4e3 ? 8e3 : 15e3), 2);
        F.s11g_hind_800D61F8();
      } else {
        F.f5C8 = 6;
        F.f5E4 = randU(16) + 16;
      }
      break;

     case 6:
      if (F.f5E4 > 0) {
        interp4A80(F.f5FC, F.f60C, 32);
        break;
      }
      F.f8CC = 1;
      F.f5C8 = 7;
      F.f5E4 = randU(32) + 70;
      F.f5F4 += 2048;
      F.f60C.set(r25(F.f5F4) + 9e3, 13e3, s25(F.f5F4) + 9e3);
      break;

     case 7:
      F.f5D4 = 1;
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 32); else {
        F.f5C4 = 1;
        F.f5C8 = 0;
      }
      break;
    }
  }
  misilEscena(fin) {
    const F = this, A = F.A;
    F.vulnerable = false;
    const dist = F.mmTarget.clone().sub(F.mmPos).length();
    if (fin && (F.mgr.frame & 3) === 0) F.humo(F.f63C, F.f66C / 4096 * 1.5);
    const lejos = fin ? 1e5 : 13e4, vivo = () => !F.J.muerto && F.gameOverTimer() === 0;
    const adelante = paso => V(0, 0, paso).applyMatrix4(F.matRot(F.mmRot));
    const explotaCuerpo = () => {
      if ((F.mgr.frame & 15) === 0 && randU(4) === 0) F.explosion(F.mov.clone().add(V(randS(2048), -randU(4096), randS(2048))), .5);
    };
    switch (F.f5C8) {
     case 0:
      if (fin) {
        if (F.gameOverTimer() === 0) F.ctx.musica?.(4278190334);
        F.f60C.y = 23e3;
        interp4A80(F.f5FC, F.f60C, 32);
        if (F.f5FC.y < 1e4) F.f5C8 = 0; else {
          F.f5E4 = 150;
          F.f5C8 = 1;
          F.se(132, F.mov);
        }
      } else {
        F.f5E4 = 150;
        F.f5C8 = 1;
      }

     case 1:
      {
        const d = V(0, 0, 4096).applyAxisAngle(V(0, 1, 0), F.rotV.y * ANG);
        F.f60C.y = 3e4;
        F.f60C.x += Math.round(d.x);
        F.f60C.z += Math.round(d.z);
        interp4A80(F.f60C, V(lejos, 3e4, fin ? 25e3 : 2e4), 64);
        F.f62C.copy(F.f60C);
        interp4A80(F.f5FC, F.f60C, 128);
        if (F.f5E4 < 0) {
          F.f5E4 = 150;
          F.f5C8 = 2;
          F.f60C.set(lejos, 23e3, 2e4);
        }
        break;
      }

     case 2:
      if (F.f5E4 < 0) {
        F.f5C8 = 17;
        F.f5E4 = 90;
        F.f60C.set(lejos, 23e3, 2e4);
      }
      interp4A80(F.f5FC, F.f60C, 128);
      F.f62C.copy(F.f5FC);
      break;

     case 17:
      if (F.f5E4 >= 2) {
        interp4A80(F.f5FC, F.f60C, 64);
        break;
      }
      if (F.f5E4 > 0) {
        F.guardarArmas();
        break;
      }
      if (vivo()) {
        F.voz(18);
        A.cine(9999);
        F.f8E4 = true;
        F.mgr.congelar(true);
        F.nMissileDemoMode2 = fin ? 12 : 11;
        F.f5C8 = 18;
        F.f5E4 = 90;
        F.f60C.set(1e4, 23e3, fin ? -1e4 : -8e3);
        F.f5FC.copy(F.f60C);
        F.f4BC.copy(F.f5FC);
        F.log(fin ? "último misil: escena" : "misil grande: escena");
      } else F.nMissileDemoMode2 = 0;
      break;

     case 18:
      F.f60C.set(1e4, 23e3, fin ? -14e3 : -4e3);
      F.f5FC.copy(F.f60C);
      F.f4BC.copy(F.f5FC);
      if (fin) explotaCuerpo();
      F.f62C.copy(A.posCamara());
      F.nMissileDemoMode2 = fin ? 12 : 11;
      F.mmPosV.copy(F.f4BC).add(V(2e3, -4e3, fin ? -4e3 : 4e3));
      F.mmRot.copy(F.rotV);
      if (F.f5E4 > 0) interp4A80(F.f5FC, F.f60C, 256); else {
        F.f60C.add(V(3e3, 3e3, fin ? 1e4 : -1e4));
        F.mgr.se(42, null);
        F.mgr.se(191, null);
        F.mgr.se(188, null);
        F.f5C8 = 21;
        F.f5E4 = fin ? 40 : 70;
      }
      break;

     case 21:
      interp4A80(F.f5FC, F.f60C, 32);
      if (fin) explotaCuerpo();
      F.f62C.copy(A.posCamara());
      F.nMissileDemoMode2 = fin ? 12 : 11;
      if (F.f5E4 > 0) {
        F.mmPosV.add(adelante(1e3));
        F.explosion(F.mmPos, .3);
        F.explosion(F.mmPos.clone().add(V(randS(256), randS(256), randS(256))), .3);
        F.chispa(F.mmPos.clone().multiplyScalar(MM), .6, 3);
        interp4A80(F.f5FC, F.f60C, 256);
      } else {
        A.finCine();
        F.f8E4 = null;
        F.mgr.congelar(false);
        A.soltarCamara();
        F.restaurarArmas();
        F.f60C.set(lejos, 25e3, fin ? 7e3 : 15e3);
        F.nMissileDemoMode2 = 0;
        F.f5FC.copy(F.f60C);
        F.f4BC.copy(F.f5FC);
        F.f5C8 = 5;
        F.f5E4 = 30;
        F.mmPosV.copy(F.f4BC).add(V(2e3, -4e3, fin ? -4e3 : 4e3));
        F.mmTarget.set(fin ? 5e3 : 4e3, fin ? 500 : 2e3, fin ? -3e3 : 6500);
        F.s11g_hind_800D60F0();
      }
      break;

     case 5:
      if (fin) explotaCuerpo();
      if (F.f5E4 > 0) {
        F.nMissileDemoMode = 1;
        F.mmPosV.copy(F.f4BC);
        F.s11g_hind_800D60F0();
      } else {
        F.mgr.se(188, null);
        F.mgr.se(189, null);
        F.f5C8 = 6;
        F.f5E4 = fin ? 90 : 120;
        F.f5E8 = F.f5EC = fin ? 23 : 22;
        F.log("misil sale");
      }
      break;

     case 6:
      if (F.f5E4 > 0) {
        if (F.f5E4 === (fin ? 87 : 117)) F.estela = true;
        if (F.f5EC <= 0) {
          F.mgr.se(79, null);
          if (--F.f5E8 <= 0) F.f5E8 = 1;
          F.f5EC = F.f5E8;
        } else F.f5EC--;
        F.s11g_hind_800D60F0();
        F.mmDelay.copy(F.mmBlast);
        F.mmBlast.copy(F.mmPos);
        F.mmPosV.add(adelante(1e3));
      } else {
        F.mgr.se(79, null);
        F.f5C8 = 7;
        F.f5E4 = 1e4;
      }
      break;

     case 7:
      if (dist > (fin ? 3e3 : 2500)) {
        F.mgr.se(79, null);
        F.s11g_hind_800D60F0();
        F.mmDelay.copy(F.mmBlast);
        F.mmBlast.copy(F.mmPos);
        F.mmPosV.add(adelante(1e3));
      } else {
        F.J.setRuido?.(255, 32, F.mmTarget.clone().multiplyScalar(MM));
        F.mgr.se(192, null);
        F.f948 = 255;
        F.ctx.juego?.ctx?.vibrar?.(4);
        F.f5C8 = 8;
        F.f5E4 = fin ? 100 : 50;
        F.mmHelp2.copy(F.mmTarget);
        F.nMissileDemoMode = fin ? 4 : 2;
        F.estela = false;
        if (fin && F.gameOverTimer() === 0) F.ctx.musica?.(16777217);
        F.explosion(F.mmHelp2, 2.2);
        F.log(fin ? "último misil explota" : "misil explota", {
          en: F.mmHelp2.toArray()
        });
        if (!fin && F.f8EC !== -1) F.procTecho();
      }
      break;

     case 8:
      if (F.f5E4 > 0) {
        F.s11g_hind_800D60F0();
        F.mmHelp2.x -= 200;
        const fuego = F.mmHelp2.clone();
        if (fin) fuego.z += (F.f5E4 - 100) * ((F.mgr.frame & 1) * 2 - 1) * 150;
        const p = fuego.clone();
        p.x += randS(4096);
        p.z += randS(4096);
        if (!randU(2)) F.mgr.se(41, null);
        if (!randU(8)) F.mgr.se(39, null);
        if (!randU(16)) F.mgr.se(40, null);
        F.explosion(p, .9);
        const s = A.snake(), lv = F.dificultad();
        const pega = !fin || lv >= 2 && lv < 4 && !(s.x < 0 && s.z < -1500);
        if (pega && A.snakeVivo() && Math.abs(s.x - fuego.x) <= 5e3 + 300 && Math.abs(s.y - fuego.y) <= 3e3 + 700 && Math.abs(s.z - fuego.z) <= 5e3 + 300) {
          if (!A.snakeInvencible()) {
            A.dañarSnake(F.nivelBlast, "blast");
            F.log("fuego le pega a Snake", {
              "daño": F.nivelBlast
            });
          }
        }
        F.f948 -= 8;
        if (F.f948 < 0) F.f948 = randU(128) + 128;
        if (fin && vivo()) {
          if (F.f5E4 === 5) F.explosion(V(600, 500, -5300), 2);
          if (F.f5E4 === 4) F.explosion(V(260, 500, -2500), 2);
          if (F.f5E4 === 2) F.explosion(V(-570, 500, -3900), 2);
          if (F.f5E4 === 80) {
            F.mmHelp2.copy(F.mmTarget);
            F.nMissileDemoMode2 = 999;
            F.mgr.congelar(true);
            A.cine(9999);
            F.guardarArmas();
            F.f60C.set(25e3, 1e4, -2e3);
            F.f5FC.copy(F.f60C);
            F.f4BC.copy(F.f5FC);
            F.f908.set(0, 0, 0);
            F.f910.copy(F.f908);
            F.f918.copy(F.f60C).add(V(-1e3, 3e3, -500));
            A.ponerCamara(F.f918, F.f908, 320);
            F.voz(9);
            F.log("corte: incendiado");
          } else if (F.f5E4 < 80) {
            F.f60C.set(1e4, 1e4, -2e3);
            F.f5FC.copy(F.f60C);
            F.f4BC.copy(F.f5FC);
            A.ponerCamara(F.f918, F.f908, 320);
            if ((F.mgr.frame & 3) === 0) F.explosion(F.f60C.clone().add(V(randU(4096) + 1e3, 0, randS(2048))), .6);
          }
        }
      } else if (!fin) {
        F.vulnerable = true;
        F.f658 = 0;
        F.f5C4 = 0;
        F.f5C8 = 0;
        F.log("vuelve a pelear");
      } else if (vivo()) {
        F.f5C8 = 9;
        F.f5E4 = 150;
        F.f5E8 = 5;
        F.f60C.set(3e4, 13e3, -1e4);
        F.f908.copy(A.snake());
        F.f918.set(-11e3, 5e3, 6300);
        F.f910.copy(F.f4BC);
        A.ponerCamara(F.f918, F.f910, 320);
        if (F.f8EC !== -1) F.procTecho();
        interp4A80(F.f5FC, F.f60C, 32);
      } else F.nMissileDemoMode2 = 0;
      break;

     case 9:
      if (!vivo()) {
        F.nMissileDemoMode2 = 0;
        break;
      }
      if ((F.mgr.frame & 7) === 0) F.explosion(F.mov.clone().add(V(-(randU(4096) + 1e3), -randU(2048), randS(2048))), .5);
      F.f60C.set(3e4, 13e3, -1e4);
      F.f910.copy(F.f4BC);
      F.f910.y += F.f5E4 > 0 ? 1e3 : 0;
      interp4A80(F.f908, F.f910, 128);
      A.ponerCamara(F.f918, F.f908, 320 + (150 - Math.max(0, F.f5E4)) * (F.f5E4 > 0 ? 4 : 6));
      interp4A80(F.f5FC, F.f60C, 32);
      if (F.f5E4 === 30) {
        F.f900 = 1;
        F.log("se incendia");
      }
      if (F.f5E4 === 50) F.mgr.se(130, null);
      if (F.f5E4 <= 0) {
        F.f5C8 = 10;
        F.f5E4 = 30;
        F.f8E8 = true;
        F.fundido = 30;
      }
      break;

     case 10:
      if (!vivo()) {
        F.nMissileDemoMode2 = 0;
        break;
      }
      if (F.f5E4 > 0) {
        F.f910.copy(F.f4BC);
        interp4A80(F.f908, F.f910, 128);
        A.ponerCamara(F.f918, F.f908, 1220);
      } else {
        F.vulnerable = true;
        F.f658 = 3;
        F.f5C4 = 0;
        F.f5C8 = 0;
        if (F.gameOverTimer() === 0) F.ctx.musica?.(4278190334);
        F.log("fin de la caída");
      }
      break;
    }
    if (F.fundido > 0) {
      F.fundido--;
      F.mgr.hud.negro = Math.min(1, (30 - F.fundido) / 30);
    }
    const t = F.mgr.frame;
    if (fin) {
      F.f60C.x += rsin(t * 98) >> 2;
      F.f60C.y += rsin(t * 232) >> 4;
      F.f60C.z += rsin(t * 292) >> 2;
    }
  }
  s11g_hind_800D6848() {
    this.misilEscena(false);
  }
  s11g_hind_800D7644() {
    this.misilEscena(true);
  }
  procTecho() {
    if (!this.A.proc(this.actor, "c")) this.A.mensaje(48554, [ HASH.CRASH ]);
  }
  s11g_hind_800D60F0() {
    const dx = this.mmTarget.x - this.mmPosV.x >> 1, dz = this.mmTarget.z - this.mmPosV.z >> 1;
    this.mmRot.y = ratan2(dx, dz) & 4095;
    const len = isqrt(dz * dz + dx * dx), h = this.mmTarget.y - this.mmPosV.y >> 1;
    this.mmRot.x = ratan2(len, h) - 1024 & 4095;
    this.mmRot.z = 0;
  }
  cuadroMisilVisual() {
    const cam = this.fA78, d = this.mmPosV.clone().sub(cam);
    let p = this.mmPosV.clone(), plano = null;
    if (p.x < -this.f514) {
      plano = [ "x", -this.f514 ];
      p = cortarPlano(cam, d, "x", -this.f514);
    } else if (p.x > this.f514) {
      plano = [ "x", this.f514 ];
      p = cortarPlano(cam, d, "x", this.f514);
    }
    if (p.z < -this.f514) {
      plano = [ "z", -this.f514 ];
      p = cortarPlano(cam, d, "z", -this.f514);
    } else if (p.z > this.f514) {
      plano = [ "z", this.f514 ];
      p = cortarPlano(cam, d, "z", this.f514);
    }
    this.f670 = plano ? p.clone().sub(cam).length() * 4096 / Math.max(1, d.length()) : 4096;
    this.mmPos.copy(p);
    const M = this.nMissileDemoMode, M2 = this.nMissileDemoMode2, vuela = M === 1 || M === 3 || M2 === 11 || M2 === 12;
    this.mis1.visible = !(M >= 1 || M2 === 11 || M2 === 12);
    this.mis2.visible = !(M >= 3 || M2 === 12);
    this.misVuela.visible = vuela && this.f5C8 !== 18 ? true : vuela;
    if (this.misVuela.visible) {
      this.misVuela.position.set(p.x * MM, p.y * MM, p.z * MM);
      this.misVuela.rotation.set(this.mmRot.x * ANG, this.mmRot.y * ANG, this.mmRot.z * ANG, "YXZ");
      this.misVuela.scale.setScalar(this.f670 / 4096);
      if (this.estela && (this.mgr.frame & 1) === 0) this.humo(this.mmPos, .6 * this.f670 / 4096);
    }
    if (M2 === 11) this.A.ponerCamara(V(-14598, 17975, 300), V(-6935, 19318, -1365), 320); else if (M2 === 12) this.A.ponerCamara(V(-14598, 17975, 2311), V(-6935, 19318, -1365), 320);
  }
  humo(pmm, escala = 1) {
    this.mgr.chispa(pmm.clone().multiplyScalar(MM), .9 * escala, 14, 6316128);
  }
  explosion(pmm, escala = 1) {
    const p = pmm.clone().multiplyScalar(MM);
    if (this.ctx.armas?.visualExplosion) this.ctx.armas.visualExplosion(p, escala); else this.mgr.chispa(p, 1.5 * escala, 12, 16752704);
  }
  destruirActor() {
    if (!this.vivo) return;
    this.vivo = false;
    this.mgr.congelar(false);
    this.A.soltarCamara();
    this.A.finCine();
    this.log("destruido", {
      fA74: this.fA74
    });
    if (this.end_proc >= 0 && this.f94C !== 1 && this.fA74 === 1) {
      const info = {
        jefe: "HIND D",
        proc: this.end_proc,
        demos: [ 114533 ],
        siguiente: null
      };
      this.victoria = info;
      if (!this.A.proc(this.actor, "z")) this.ctx.alVencer?.(info);
    }
    setTimeout(() => {
      if (this.mgr.hud) this.mgr.hud.negro = 0;
    }, 300);
    this.o?.removeFromParent();
    this.misVuela?.removeFromParent();
    this.quitarOyente?.();
    this.barras = [];
    const i = this.A.grandes.indexOf(this.grande);
    if (i >= 0) this.A.grandes.splice(i, 1);
  }
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
    this.misVuela?.removeFromParent();
    this.quitarOyente?.();
  }
  estadoPrueba() {
    return {
      modo: this.f4AC,
      fase: this.f658,
      cerebro: this.f5C4,
      paso: this.f5C8,
      pos: this.f4BC.toArray().map(Math.round),
      dibujo: this.mov.toArray().map(Math.round),
      escala: +(this.f66C / 4096).toFixed(3),
      quedan: this.f434,
      de: this.f430,
      vida: this.life,
      rest: this.life_total,
      vulnerable: this.vulnerable && this.f50C === 0,
      tiros: this.tiros,
      impactos: this.impactos,
      balasOn: this.f930 === 0,
      demo: this.nMissileDemoMode,
      demo2: this.nMissileDemoMode2,
      timer3min: this.f8FC
    };
  }
}

const POS_OBJS = [ [ -1500, 0, -1500 ], [ -1500, 0, -1500 ], [ -1625, 0, 1625 ], [ 1750, 3e3, 4e3 ], [ 8750, 3e3, 4e3 ], [ 6750, 2e3, 7500 ], [ 6750, 4e3, 7500 ], [ 750, 2500, 7500 ], [ 2750, 3500, 11e3 ], [ 1250, 0, 9e3 ], [ -750, 1e3, 7500 ], [ 4250, 1e3, 7500 ], [ 5250, 1e3, 5500 ], [ 1250, 1e3, 6e3 ], [ -2750, 0, 11500 ] ];

const TIEMPOS = [ -1, -1, 35, 23, 8, 5, 13, 27, 20, 31, 17, 0, 2, 10, 35 ];

export class S11Objs extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "S11_OBJS";
    this.A = apoyo(mgr);
    this.registro = [];
    this.blanco = false;
  }
  async iniciar() {
    const s = this.opt("s", 1);
    this.f25A0 = s;
    this.f25A4 = 0;
    this.f25A8 = 0;
    this.f25AC = 0;
    this.o = new THREE.Group;
    this.o.name = "jefe_S11_OBJS";
    this.mgr.mundo.add(this.o);
    const base = await Promise.all(Array.from({
      length: 15
    }, (_, i) => cargarModelo(this.ctx, `jefes/11h_o${i + 1}.glb`).catch(() => null)));
    this.obj1 = base.map((m, i) => {
      const p = POS_OBJS[i], g = m ? m.clone(true) : new THREE.Group;
      const ob = {
        o: g,
        pos: V(...p),
        rot: V(),
        step: V(),
        turn: V(),
        time: TIEMPOS[i],
        state: 0,
        pad: 0
      };
      if (i === 2 && this.f25A0 >= 2) ob.rot.set(-114, -228, -455);
      this.o.add(g);
      this.ctx.teñir?.(g);
      return ob;
    });
    this.obj2 = Array.from({
      length: 16
    }, (_, i) => {
      const k = randU(4096) % 7 + 2, m = base[k], g = m ? m.clone(true) : new THREE.Group;
      const ob = {
        o: g,
        pos: V(...POS_OBJS[randU(4096) % 6 + 9]),
        rot: V(),
        step: V(),
        turn: V(),
        time: TIEMPOS[i] ?? 0,
        state: 0,
        pad: 0,
        escala: V(randU(1024) + 512, randU(1024) + 512, randU(1024) + 512)
      };
      g.visible = false;
      this.o.add(g);
      this.ctx.teñir?.(g);
      return ob;
    });
    if (this.f25A0 >= 2) {
      for (const ob of this.obj1.slice(3)) ob.o.visible = false;
    }
    this.quitarOyente = this.A.escuchar(this.actor.nombre ?? 48554, v => {
      const h = v[0] & 65535;
      if (h === HASH.CRASH || h === HASH.ROMPER) {
        this.f25A0++;
        this.registro.push({
          f: this.mgr.frame,
          t: "crash",
          f25A0: this.f25A0
        });
        return true;
      }
      return false;
    });
    this.dibujar();
  }
  mensaje(v) {
    const h = v[0] & 65535;
    if (h === HASH.CRASH || h === HASH.ROMPER) {
      this.f25A0++;
      return true;
    }
    return false;
  }
  cuadro() {
    if (this.f25A0 > 2) return;
    if (this.f25A0 === 1 && this.f25AC < 30) {
      const r = this.J.ctx.rig.position, x = r.x * 1e3, z = r.z * 1e3;
      if (x > -1875 && x < 3e3 && z > 1250 && z < 3125) {
        if (x > 1875) r.x = 3; else if (z >= 2188) r.z = 3.125; else r.z = 1.25;
        if (this.f25AC === 0 && this.A.snakeVivo()) {
          this.A.dañarSnake(256, "blast");
          this.registro.push({
            f: this.mgr.frame,
            t: "golpe a Snake"
          });
        }
      }
      this.f25AC++;
    }
    if (this.f25A0 === 2) {
      this.obj1[0].o.visible = false;
      this.obj1[1].o.visible = true;
      for (const ob of this.obj1.slice(3)) ob.o.visible = false;
      for (const ob of this.obj2) ob.o.visible = false;
      this.f25A0 = 3;
      return;
    }
    this.obj1[0].o.visible = true;
    this.obj1[1].o.visible = false;
    if (this.f25A0 !== 1 || this.f25A4 === 13 && this.f25A8 === 16) {
      this.dibujar();
      return;
    }
    this.obj1.slice(2).forEach((ob, i) => {
      if (i !== 0) {
        if (ob.state === 0) {
          if (ob.time-- < 0) {
            ob.state = 1;
            ob.step = V(0, randU(128) + 200, 0).applyEuler(new THREE.Euler(randS(256) * ANG, randU(4096) * ANG, 0, "YXZ"));
            ob.turn.set(randS(16), randS(16), randS(16));
          }
        } else if (ob.state === 1) {
          ob.rot.add(ob.turn);
          ob.pos.add(ob.step);
          ob.step.y -= 15;
          if (ob.pos.y < -15e3) {
            ob.state = 2;
            ob.o.visible = false;
          }
        } else if (ob.state === 2) {
          if (!ob.pad) {
            this.f25A4++;
            ob.pad = 1;
          }
          ob.o.visible = false;
        }
      } else {
        if (ob.state === 0) {
          if (ob.time-- < 0) {
            ob.state = 1;
            ob.step.set(0, 0, 0);
            ob.turn.set(-2, -4, -8);
          }
        } else if (ob.state >= 1 && ob.state <= 3) {
          ob.turn.z -= 3;
          ob.rot.add(ob.turn);
          if (ob.rot.z < -455) {
            this.mgr.se(195, null);
            ob.rot.set(-114, -228, -455);
            ob.turn.set(0, 0, ob.state === 1 ? 40 : ob.state === 2 ? 20 : 0);
            ob.state++;
          }
        } else if (ob.state === 4) {
          if (!ob.pad) {
            this.f25A4++;
            ob.pad = 1;
          }
          ob.o.visible = true;
        }
      }
    });
    for (const ob of this.obj2) {
      if (ob.state === 0) {
        if (ob.time-- < 0) {
          ob.o.visible = true;
          ob.state = 1;
          ob.step = V(0, randU(128) + 300, 0).applyEuler(new THREE.Euler((randS(256) + 256) * ANG, randU(4096) * ANG, 0, "YXZ"));
          ob.turn.set(randS(128), randS(128), randS(128));
        }
      } else if (ob.state === 1) {
        ob.rot.add(ob.turn);
        ob.pos.add(ob.step);
        ob.step.y -= 15;
        if (ob.pos.y < -15e3) {
          ob.state = 2;
          ob.o.visible = false;
        }
      } else if (ob.state === 2) {
        if (!ob.pad) {
          this.f25A8++;
          ob.pad = 1;
        }
        ob.o.visible = false;
      }
    }
    this.dibujar();
  }
  dibujar() {
    for (const ob of [ ...this.obj1 || [], ...this.obj2 || [] ]) {
      ob.o.position.set(ob.pos.x * MM, ob.pos.y * MM, ob.pos.z * MM);
      ob.o.rotation.set(ob.rot.x * ANG, ob.rot.y * ANG, ob.rot.z * ANG, "YXZ");
      if (ob.escala) ob.o.scale.set(ob.escala.x / 4096, ob.escala.y / 4096, ob.escala.z / 4096);
    }
  }
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
    this.quitarOyente?.();
  }
}

export class Hind2 extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "HIND2";
    this.A = apoyo(mgr);
    this.registro = [];
    this.blanco = false;
  }
  async iniciar() {
    const o = await cargarModelo(this.ctx, "jefes/hind_pasarela.glb");
    this.o = new THREE.Group;
    this.o.name = "jefe_HIND2";
    this.o.add(o);
    this.mgr.mundo.add(this.o);
    this.ctx.teñir?.(o);
    this.huesos = [];
    for (let i = 0; i < 15; i++) this.huesos.push(o.getObjectByName("hueso_" + i) || null);
    this.padres = this.huesos.map(h => {
      const m = /^hueso_(\d+)$/.exec(h?.parent?.name || "");
      return m ? +m[1] : -1;
    });
    this.rots = Array.from({
      length: 15
    }, () => [ 0, 0, 0 ]);
    this.adj = Array.from({
      length: 15
    }, () => [ 0, 0, 0 ]);
    const p = this.actor.p || this.opts.p || [ 6e3, -25e3, -24e3 ];
    this.mov = V(p[0], p[1], p[2]);
    this.f1E4 = this.mov.clone();
    this.rotV = V();
    this.turn = V();
    const w = this.opts.w;
    this.f1E0 = [ w?.[0] ?? 0, w?.[1] ?? 0 ];
    const g = this.opts.g;
    this.f1F4 = V(g?.[0] ?? 0, g?.[1] ?? -2728, g?.[2] ?? 5587);
    this.f288 = this.procId("e") || -1;
    this.f1FC = 0;
    this.f200 = 0;
    this.f224 = 0;
    this.f234 = 0;
    this.f2A4 = 1;
    this.f2A8 = 0;
    this.f228 = V();
    this.o.visible = false;
    this.escala = 1;
    if (this.actor.forzado) this.f2A8 = 1;
    this.quitarOyente = this.A.escuchar(this.actor.nombre ?? 31580, v => {
      const h = v[0] & 65535;
      if (h === 28789) {
        this.f2A8 = 1;
        return true;
      }
      if (h === HASH.KILL) {
        this.destruir();
        return true;
      }
      return false;
    });
    this.tiros = 0;
  }
  sonar(modo) {
    if (this.mgr.frame & 3) return;
    if (modo === 0) this.mgr.se(181, this.f28C.clone().multiplyScalar(MM), "bomba"); else this.mgr.se(181, null);
  }
  apuntar() {
    this.mov.copy(this.f1E4);
    const s = this.A.snake(), d = s.clone().sub(this.mov);
    this.turn.y = ratan2(d.x, d.z);
    this.turn.x = -ratan2(d.y, isqrt(d.x * d.x + d.z * d.z));
    this.rotV.copy(this.turn);
    const off = this.f1F4.clone().applyEuler(new THREE.Euler(this.rotV.x * ANG, this.rotV.y * ANG, 0, "YXZ"));
    this.mov.sub(off);
  }
  tirar(destino) {
    if (this.f200 & 1) return;
    const boca = this.f1E4.clone();
    const d = destino.clone().sub(boca);
    this.A.bala({
      origen: boca,
      dir: d,
      "daño": Math.trunc(this.A.vidaMaxSnake() / 8),
      largo: d.length(),
      vel: 2e3,
      tam: 400,
      blast: true
    });
    this.mgr.se(177, this.f28C.clone().multiplyScalar(MM), "bomba");
    this.tiros++;
    this.mgr.chispa(boca.clone().multiplyScalar(MM), .8, 2, 16769184);
  }
  vaiven() {
    const t = this.f224;
    this.mov.x += (rsin(t * 23) - rsin((t - 1) * 23)) * 2;
    this.mov.y += rsin(t * 64) - rsin((t - 1) * 64);
    this.mov.z += (rsin(t * 32) - rsin((t - 1) * 32)) * 2;
  }
  tramo() {
    const s = this.A.snake();
    let r = 0;
    if (s.clone().sub(this.mov).length() >= 1e4) r = 1;
    if (s.z >= -1e4) r = 2;
    if (s.x <= -7250) r = 4;
    if (this.f1FC === 6 && s.z <= -1e4) r = 3;
    if (this.f1FC === 7 && s.x >= -7250) r = 5;
    return r;
  }
  voz() {
    if (this.gameOverTimer() === 0) {
      this.mgr.se(187 + randU(4), this.f28C.clone().multiplyScalar(MM), "bomba");
      this.f2A4 = 1;
    }
  }
  cuadro() {
    const s = this.A.snake();
    this.f28C = V((s.x * 3 + this.mov.x) / 4, (s.y * 3 + this.mov.y) / 4, (s.z * 3 + this.mov.z) / 4);
    if (this.f2A8 > 0 && this.f2A8 < 35 && ++this.f2A8 === 35) this.f234 = 1;
    const rot = () => {
      this.rots[1][1] = this.rots[1][1] + this.f1E0[0] & 4095;
      this.rots[2][0] = this.rots[2][0] + this.f1E0[1] & 4095;
    };
    switch (this.f1FC) {
     case 0:
      this.sonar(1);
      if (s.z <= -15e3 && this.f234 !== 0) {
        this.o.visible = true;
        this.f1FC = 1;
        this.mgr.se(180, this.f28C.clone().multiplyScalar(MM), "bomba");
        this.f200 = 0;
        this.escala = 2925 / 4096;
        this.apuntar();
        if (this.f288 !== -1) this.A.proc(this.actor, "e");
        this.registro.push({
          f: this.mgr.frame,
          t: "aparece"
        });
      }
      break;

     case 1:
      rot();
      this.sonar(0);
      this.f1E4.y += 500;
      this.escala = (this.f200 * 2 + 100) * 4096 / 140 / 4096;
      this.apuntar();
      if (this.f200 > 19) {
        this.f1FC = 2;
        this.f200 = 0;
      }
      break;

     case 2:
      rot();
      this.sonar(0);
      this.apuntar();
      this.vaiven();
      if (this.f200 >= 60) {
        this.f1FC = 3;
        this.f228.copy(s);
        this.f200 = 0;
        if (this.f2A4) this.f2A4 = 0; else this.voz();
      }
      break;

     case 3:
      rot();
      this.sonar(0);
      this.apuntar();
      this.vaiven();
      this.tirar(V(this.f228.x - (this.f200 - 15) * 150, this.f228.y, this.f228.z));
      if (this.f200 > 30 || s.x <= -7500) {
        this.f1FC = 4;
        this.f200 = 0;
      }
      break;

     case 4:
      {
        rot();
        this.sonar(0);
        this.apuntar();
        this.vaiven();
        const t = this.tramo();
        if (t === 0) {
          this.f1FC = 2;
          this.f200 = 0;
        } else if (t === 1) {
          this.f1FC = 5;
          this.f230 = Math.trunc((s.x - this.mov.x) / 100);
          this.f200 = 0;
        } else if (t === 2) {
          this.f1FC = 6;
          this.f200 = 0;
        } else if (t === 4) {
          this.f1FC = 7;
          this.f200 = 0;
        }
        break;
      }

     case 5:
      rot();
      this.sonar(0);
      this.apuntar();
      this.mov.x += this.f230;
      this.f1E4.x += this.f230;
      this.vaiven();
      if (this.f200 >= 80) {
        this.f1FC = 3;
        this.f228.copy(s);
        this.f200 = 0;
        if (this.f2A4) this.f2A4 = 0; else this.voz();
      }
      break;

     case 6:
      rot();
      this.sonar(0);
      this.apuntar();
      this.vaiven();
      if (this.tramo() === 3) {
        this.f1FC = 3;
        this.f228.copy(s);
        this.f200 = 0;
        if (this.f2A4) this.f2A4 = 0; else this.voz();
      }
      break;

     case 7:
      rot();
      this.sonar(1);
      this.apuntar();
      this.vaiven();
      if (this.tramo() === 5) {
        this.f1FC = 2;
        this.f228.copy(s);
        this.f200 = 0;
      }
      break;

     case 8:
      rot();
      this.sonar(1);
      this.f1E4.y -= 300;
      this.apuntar();
      this.escala = (140 - this.f200 * 2) * 4096 / 140 / 4096;
      if (this.f200 === 2) this.mgr.se(186, this.f28C.clone().multiplyScalar(MM), "bomba");
      if (this.f200 > 29) {
        this.f1FC = 9;
        this.f200 = 0;
        this.o.visible = false;
        this.registro.push({
          f: this.mgr.frame,
          t: "se va"
        });
      }
      break;
    }
    if (this.f1FC >= 2 && this.f1FC !== 8 && this.f1FC !== 9 && this.J.ctx.inventario?.arma === WP_STINGER) {
      this.f1FC = 8;
      this.f200 = 0;
    }
    if (this.f1FC === 3) {
      const d = V(this.f228.x - (this.f200 - 15) * 150, this.f228.y, this.f228.z).sub(this.mov);
      let a = ratan2(d.x, d.z) - this.turn.y;
      if (a < 0) a += 4096;
      this.adj[4][1] = a;
    } else if (this.adj[4][1] <= 2048) this.adj[4][1] -= this.adj[4][1] >> 1; else this.adj[4][1] += 4096 - this.adj[4][1] >> 1;
    this.f200++;
    this.f224++;
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, this.mov.y * MM, this.mov.z * MM);
    this.o.rotation.set(this.rotV.x * ANG, this.rotV.y * ANG, 0, "YXZ");
    this.o.scale.setScalar(this.escala);
    aplicarPose(this.huesos, this.padres, this.rots, this.adj, null);
  }
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
    this.quitarOyente?.();
  }
}

export class Demo11G extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "11G_DEMO";
    this.A = apoyo(mgr);
    this.registro = [];
    this.blanco = false;
  }
  async iniciar() {
    const m = await cargarModelo(this.ctx, "jefes/stn_fr.glb").catch(() => null);
    this.o = new THREE.Group;
    this.o.name = "jefe_11G_DEMO";
    this.mgr.mundo.add(this.o);
    const B34 = V(29e3, 8e3, 19e3), B3C = V(0, 2e3, 25500);
    this.f3B54 = V(29e3, 8e3, 9e3);
    this.f3B4C = V(-2e3, 1e3, 25500);
    this.f3B5C = this.f3B4C.clone();
    this.f3B44 = V(8e3, 0, 8e3);
    this.cohetes = [];
    for (let i = 0; i < 18; i++) {
      const pos = B34.clone().add(V(i * 345 % 256, i * 445 % 256, i * 545 % 256));
      B3C.x += 444;
      B3C.z -= 555;
      const dst = B3C.clone().add(V(i * 645 % 1024 - 512, i * 645 % 1024 - 512, i * 645 % 1024 - 512));
      const vel = dst.clone().sub(pos).divideScalar(i + 50).round();
      const g = m ? m.clone(true) : new THREE.Group;
      g.visible = false;
      this.o.add(g);
      this.cohetes.push({
        o: g,
        pos: pos,
        vel: vel,
        est: 0,
        a: i * 2345 % 4096,
        b: i * 3345 % 4096
      });
    }
    this.proc = this.procId("p") || -1;
    this.f3B6C = 0;
    this.f3B70 = 0;
    this.f3B7C = 0;
    this.f3B90 = 0;
    this.f3B98 = 0;
    this.mgr.congelar(true);
    this.mgr.se(188, this.f3B4C.clone().multiplyScalar(MM), "bomba");
    this.f3B98 = 1;
    this.guardarArmas?.();
  }
  cuadro() {
    const f = this.mgr.frame;
    if (f % 16 === 0) {
      this.mgr.se([ 188, 193, 194 ][this.f3B98], this.f3B4C.clone().multiplyScalar(MM), "bomba");
      this.f3B98 = (this.f3B98 + 1) % 3;
    }
    if (this.f3B6C === 0) {
      this.f3B6C = 1;
      this.f3B70 = 150;
      this.mgr.se(190, this.f3B4C.clone().multiplyScalar(MM), "bomba");
    }
    if (this.f3B6C === 1) {
      if (this.f3B70 % 4 === 0 && this.f3B7C < 18) {
        this.cohetes[this.f3B7C].est = 1;
        if (randU(4) === 0) this.mgr.se(180, this.cohetes[this.f3B7C].pos.clone().multiplyScalar(MM), "bomba");
        this.f3B7C++;
      }
      interp4A80(this.f3B54, this.f3B44, 32);
      interp4A80(this.f3B5C, this.f3B4C, 32);
      this.A.ponerCamara(this.f3B54, this.f3B5C, 320);
      if (this.f3B70 < 0) {
        this.f3B6C = 2;
        this.f3B70 = 50;
      }
    } else if (this.f3B6C === 2) {
      if (this.f3B70 % 10 === 0 && this.f3B7C < 18) {
        this.cohetes[this.f3B7C].est = 1;
        this.mgr.se(180, this.cohetes[this.f3B7C].pos.clone().multiplyScalar(MM), "bomba");
        this.f3B7C++;
      }
      this.A.ponerCamara(this.f3B54, this.f3B5C, 320);
    }
    this.cohetes.forEach((c, i) => {
      if (c.est === 1) {
        c.o.visible = true;
        c.a += (i >> 1) + 10;
        c.b += i + 25;
        const prev = c.pos.clone();
        c.pos.add(c.vel);
        c.o.position.set(c.pos.x * MM, c.pos.y * MM, c.pos.z * MM);
        c.o.lookAt(c.pos.clone().add(c.vel).multiplyScalar(MM));
        if ((f & 1) === 0) this.mgr.chispa(prev.multiplyScalar(MM), .35, 8, 9474192);
        if (c.pos.z < 27e3 && (c.pos.y < 0 || c.pos.x < 0) || c.pos.x < -3e3) {
          c.est = 2;
          c.o.visible = false;
          this.mgr.se(187, null);
          const p = c.pos.clone().multiplyScalar(MM);
          if (this.ctx.armas?.visualExplosion) this.ctx.armas.visualExplosion(p, 1.2); else this.mgr.chispa(p, 2, 14, 16752704);
          this.f3B90 = randU(16) + 20;
        }
      } else if (c.est === 2) {
        if (randU(64) === 0) this.mgr.se(187, null);
      }
    });
    if (this.f3B90 > 0) this.f3B90--;
    this.f3B70--;
  }
  dibujar() {}
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.o?.removeFromParent();
    this.mgr.congelar(false);
    this.A.soltarCamara();
    if (this.proc !== -1) this.A.proc(this.actor, "p");
  }
}
