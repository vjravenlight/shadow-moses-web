// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Sistema, Personaje, STATE, MM, ANG, difS, vecDir, randU, randS, HASH, asentir, dirVec3, tomarPendientes } from "./comun.js";

import { cargarModelo, aplicarPose, nearExp, fase } from "../jefes/base.js";

import { mandoDe, PAD, PAD_UDLR } from "./mando.js";

import { vibrar, vibrarCuadro } from "../controles.js";

import { desvestirEnLaCelda } from "./celda.js";

const N = {
  SNAKE: 8650,
  OCELOT: 2555,
  LIQUID: 31730,
  CAMA: 10785,
  PROGCAM: 52947,
  CAMARA: 50006
};

export const TIPOS_TORTURA = new Set([ "TORTURE", "TR_OCELOT", "TR_BED", "BOXALL" ]);

export const esTortura = a => !!a && TIPOS_TORTURA.has(a.tipo);

const nums = v => Array.isArray(v) ? v.filter(x => typeof x === "number") : [];

const procDe = v => {
  const x = Array.isArray(v) ? v[0] : null;
  return x && typeof x === "object" && "proc" in x ? x.proc : typeof x === "number" ? x : -1;
};

const procsDe = v => Array.isArray(v) ? v.map(x => x && typeof x === "object" && "proc" in x ? x.proc : typeof x === "number" ? x : -1) : [];

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const R = (x = 0, y = 0, z = 0) => ({
  x: x,
  y: y,
  z: z
});

const nearExp4V = (a, b) => {
  a.x = nearExp(a.x, b.x, 4);
  a.y = nearExp(a.y, b.y, 4);
  a.z = nearExp(a.z, b.z, 4);
};

const nearExp4PV = (a, b) => {
  a.x = nearExp(fase(a.x, b.x), b.x, 4) & 4095;
  a.y = nearExp(fase(a.y, b.y), b.y, 4) & 4095;
  a.z = nearExp(fase(a.z, b.z), b.z, 4) & 4095;
};

const nearExp2PV = (a, b) => {
  a.x = nearExp(fase(a.x, b.x), b.x, 2);
  a.y = nearExp(fase(a.y, b.y), b.y, 2);
  a.z = nearExp(fase(a.z, b.z), b.z, 2);
};

const s12 = a => {
  a &= 4095;
  return a > 2048 ? a - 4096 : a;
};

const SE_PLAYEROUT = 26;

const LIT = {
  v0: [ 18, 0, 0, 49, 17, 119, 0, 210, 19, 312, 0, 400, -1, 0 ],
  v1: [ 20, 0, 0, 59, -1, 0 ],
  v2: [ 0, 0, 15, 78, 0, 125, 18, 206, 0, 254, 16, 316, 0, 375, 4, 407, 0, 480, -1, 0 ],
  v17: [ 3, 0, 0, 79, -1, 0 ],
  v18: [ 13, 0, 0, 70, 18, 208, 15, 251, 0, 305, 17, 514, 0, 570, -1, 0 ],
  v19: [ 0, 0, 18, 94, 0, 190, 19, 312, 0, 384, 13, 735, 0, 780, 15, 852, 0, 902, 20, 1030, 0, 1087, 14, 1112, 13, 1174, 0, 1226, -1, 0 ],
  v20: [ 19, 0, 0, 89, 5, 95, 0, 154, 17, 233, 14, 319, 0, 382, 18, 534, 0, 580, 3, 741, 13, 816, 0, 864, 4, 884, 0, 964, 15, 1126, 0, 1177, -1, 0 ],
  v21: [ 4, 0, -1, 0 ],
  v22: [ 18, 0, 0, 49, 17, 96, 0, 185, 16, 279, 0, 333, 17, 426, 0, 482, 4, 726, 0, 813, -1, 0 ],
  v23: [ 11, 0, 4, 190, 3, 290, 0, 390, 20, 395, 0, 454, -1, 0 ],
  v24: [ 0, 0, 3, 125, 0, 205, 19, 522, 0, 610, 5, 672, 0, 730, 14, 760, 0, 818, 16, 909, 0, 967, 15, 1149, 0, 1197, -1, 0 ],
  v25: [ 0, 0, 3, 124, 2, 203, -1, 0 ],
  v26: [ 0, 0, 19, 50, 0, 139, 5, 205, 15, 264, 0, 313, 16, 393, 0, 451, 15, 621, 0, 670, -1, 0 ]
};

const REV_ENTRADA = [ 0, 1, 2, 24, 17, 18, 19, 20, 23, 21, 22, 25, 26 ];

const REV_LIT = [ "v0", "v1", "v2", "v24", "v17", "v18", "v19", "v20", "v23", "v21", "v22", "v25", "v26" ];

const imgs = {};

function imagen(nombre) {
  if (!imgs[nombre] && typeof Image !== "undefined") {
    const i = new Image;
    i.src = `assets/personajes/${nombre}.png`;
    imgs[nombre] = i;
  }
  return imgs[nombre];
}

let texPlasma = null;

function texturaPlasma() {
  if (!texPlasma) {
    texPlasma = (new THREE.TextureLoader).load("assets/personajes/plasma.png");
    texPlasma.colorSpace = THREE.SRGBColorSpace;
  }
  return texPlasma;
}

function camEventos(sis) {
  if (!sis.camEv) {
    sis.camEv = {
      nombre: N.CAMARA,
      vivo: true,
      bits: 0,
      recibir(v) {
        if (v.length >= 2 && v[0] >= 0 && v[0] < 8) {
          if (v[1] === HASH.ENTER) this.bits |= 1 << v[0]; else if (v[1] === HASH.LEAVE) this.bits &= ~(1 << v[0]);
        }
        return false;
      }
    };
    sis.receptores.push(sis.camEv);
  }
  return sis.camEv;
}

class ProgCam {
  constructor(sis) {
    this.sis = sis;
    this.nombre = N.PROGCAM;
    this.vivo = true;
    this.buzon = [];
    this.activo = false;
    this.p = V();
    this.t = V();
    this.pDest = V();
    this.tDest = V();
    this.pVel = 0;
    this.tVel = 0;
  }
  recibir(v) {
    this.buzon.push(v.slice());
    return true;
  }
  leer() {
    const ms = this.buzon.splice(0);
    for (let i = ms.length - 1; i >= 0; i--) {
      const m = ms[i];
      switch (m[0]) {
       case 41900:
        if (m.length === 7) {
          this.pDest.set(m[4], m[5], m[6]);
          this.tDest.set(m[1], m[2], m[3]);
        }
        break;

       case 43117:
        if (m.length >= 3) {
          this.pVel = m[1];
          this.tVel = m[2];
        }
        break;

       case HASH.START:
        if (!this.activo) {
          this.activo = true;
          this.sis.log("progcam start");
        }
        break;

       case HASH.END:
        if (this.activo) {
          this.activo = false;
          this.sis.log("progcam end");
        }
        break;
      }
    }
  }
  cuadro() {
    if (!this.activo) return;
    const mover = (a, b, vel) => {
      if (vel < 0) {
        a.copy(b);
        return;
      }
      const d = b.clone().sub(a), len = Math.round(d.length());
      if (vel < len) a.add(d.multiplyScalar(vel / len)).round();
    };
    mover(this.p, this.pDest, this.pVel);
    mover(this.t, this.tDest, this.tVel);
  }
}

function progcamDe(sis) {
  if (!sis.progcam) {
    sis.progcam = new ProgCam(sis);
    sis.receptores.push(sis.progcam);
    sis.tareas.push(sis.progcam);
  }
  return sis.progcam;
}

class Rayo {
  constructor(p, j1, j2, cuadros) {
    this.p = p;
    this.j1 = j1;
    this.j2 = j2;
    this.t = 0;
    this.dur = cuadros + randU(16);
    this.g = new THREE.Group;
    this.g.userData.sinColision = true;
    const mat = new THREE.SpriteMaterial({
      map: texturaPlasma(),
      color: 9869050,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    this.sp = [];
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(.09);
      this.g.add(s);
      this.sp.push(s);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(21), 3));
    this.linea = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 13158655,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    }));
    this.g.add(this.linea);
    p.mgr.mundo.add(this.g);
  }
  cuadro() {
    if (++this.t > this.dur || !this.p.o) {
      this.quitar();
      return false;
    }
    const a = this.p.puntoHueso(this.j1), b = this.p.puntoHueso(this.j2), pos = this.linea.geometry.attributes.position;
    for (let i = 0; i < 7; i++) {
      const k = i / 6, q = a.clone().lerp(b, k);
      if (i > 0 && i < 6) {
        q.x += randS(48) * MM;
        q.y += randS(48) * MM;
        q.z += randS(48) * MM;
      }
      this.sp[i].position.copy(q);
      this.sp[i].scale.setScalar((60 + randU(60)) * MM);
      pos.setXYZ(i, q.x, q.y, q.z);
    }
    pos.needsUpdate = true;
    return true;
  }
  quitar() {
    this.g.removeFromParent();
    this.linea.geometry.dispose();
  }
}

class Cartel {
  constructor(sis) {
    this.sis = sis;
    this.f20 = 0;
    this.f24 = 0;
    this.f28 = 0;
    this.f2C = 0;
    this.f30 = 0;
    this.vivo = true;
    this.bg = imagen("gou_bg");
    this.fg = imagen("goumon");
    this.dib = x => this.dibujar(x);
    sis.hudExtras.push(this.dib);
  }
  cuadro() {
    if (!this.vivo) return;
    const f24 = this.f24++, W0 = 112, H0 = 30;
    if (this.f20 === 0) {
      let w = f24 * 8;
      if (W0 < w) {
        w = W0;
        this.f20 = 1;
        this.f24 = 0;
      }
      this.f28 = w;
    } else if (this.f20 === 1) {
      const w = Math.min(f24 * 8, W0), h = Math.min(f24 * 8, H0);
      this.f2C = w;
      this.f30 = h;
      if (h === H0 && w === W0) this.f20++;
    } else this.f24--;
  }
  dibujar(x) {
    if (this.f28 > 0 && this.bg?.complete) {
      x.globalAlpha = .5;
      x.drawImage(this.bg, 188, 9, this.f28, 30);
      x.globalAlpha = 1;
    }
    if (this.f2C > 0 && this.f30 > 0 && this.fg?.complete) x.drawImage(this.fg, 188, 8, this.f2C, this.f30);
  }
  matar() {
    this.vivo = false;
    const i = this.sis.hudExtras.indexOf(this.dib);
    if (i >= 0) this.sis.hudExtras.splice(i, 1);
  }
}

class Tortura extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = N.SNAKE;
    this.lado = "jugador";
    this.blanco = false;
    this.dePersonajes = true;
    this.buzon = [];
    this.msgs = [];
    this.rayos = [];
    this.visibleCuerpo = true;
    this.rotV = R();
    this.turnV = R();
    this.mando = mandoDe(sis);
    this.pad = this.mando;
    this.trgS = null;
    this.temblor = 0;
  }
  log(t, extra = {}) {
    this.sis.log("torture " + t, extra);
  }
  async iniciar() {
    const o = this.opts;
    await this.cargarCon("personajes/sne_nude_03b.glb", "sne_03b");
    if (!this.vivo) return;
    this.o.userData.actor = this.actor;
    const p = nums(o.p), d = nums(o.d);
    this.mov.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rotV = R(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0);
    this.turnV = {
      ...this.rotV
    };
    this.rSphere = -2;
    this.interpCtrl = 0;
    this.f83C = procDe(o.e);
    this.f838 = procDe(o.s);
    this.f840 = procDe(o.a);
    this.f8B8 = Math.ceil(Math.floor(nums(o.x).length / 3) / 2);
    this.f89C = R();
    this.f8A4 = 0;
    this.f8A6 = 0;
    this.f8B4 = 0;
    this.f8B6 = 1;
    this.f844 = -1;
    if (o.b) {
      const b = nums(o.b);
      this.f89C = R(b[1] ?? 0, b[2] ?? 0, b[0] ?? 0);
      this.f8A4 = b[3] ?? 0;
      this.f8A6 = b[4] ?? 0;
      this.f8B4 = b[5] ?? 0;
      this.f8B6 = b[6] || 1;
      this.f844 = procDe(o.z);
    }
    this.f87C = nums(o.v).slice(0, 8);
    this.f878 = this.f87C.length;
    this.conf = {
      nombre: "Time",
      izq: [ 31, 63, 192 ],
      der: [ 31, 127, 255 ],
      alto: 1
    };
    this.barraT = {
      y: 28,
      rest: 0,
      now: 0,
      max: 1,
      conf: this.conf,
      visible: false
    };
    this.barras = [ this.barraT ];
    this.f7FE = 0;
    this.f800 = 0;
    this.f802 = 0;
    this.f804 = this.sis.vidaMax();
    this.f810 = 0;
    this.f814 = 0;
    this.f81A = 0;
    this.f818 = 0;
    this.f81C = 0;
    this.f820 = 0;
    this.f824 = this.mov.clone();
    this.f82C = {
      ...this.rotV
    };
    this.f8FC = null;
    this.f900 = null;
    this.f806 = 0;
    this.adjOn = true;
    this.f7FC = nums(o.m)[0] ?? 0;
    if (this.f7FC < 2) {
      this.fp = 2;
      this.f802 |= 8192;
    } else this.fp = 0;
    this.f848 = nums(o.c)[0] ?? 0;
    if ((nums(o.f)[0] ?? 0) !== 0) this.f802 |= 128;
    this.f84A = 0;
    this.f84C = 0;
    this.f85C = 0;
    this.f85E = 0;
    this.f860 = [ [ 0, 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0, 0 ] ];
    this.f808 = null;
    this.f80C = 0;
    this.rotate2 = {
      ...this.rotV
    };
    this.camNormal = null;
    this.sis.vox.init();
    this.pose0(0);
    this.motor.accion(0, 0);
    this.altCtrl = this.motor.altura;
    this.actMotion3();
    this.altCtrl = this.motor.altura;
    this.actControl3();
    this.sis.bloquear(this, true);
    this.ocultarSnake(true);
    this.mando.activar(this);
    this.sis.padMask = ~2064;
    this.sis.mascaraPad = true;
    camEventos(this.sis);
    const mgr = this.mgr, prev = mgr.camaraEspecial;
    this.camPrev = prev;
    this.camFn = () => (this.vivo && this.listo ? this.camara() : null) || (prev ? prev.call(mgr) : null);
    mgr.camaraEspecial = this.camFn;
    this.sis.flujo.precargar(this.f87C);
    this.sis.proc(procDe(o.n), []);
    this.log("inicio", {
      modo: this.f7FC,
      dia: this.f848,
      voces: this.f87C,
      b: this.f89C
    });
  }
  recibir(v) {
    const m = v[0];
    if (m === 4 || m === 58672 || m === 63897 || m === 58132 || m === 65061) {
      this.buzon.push(v.slice());
      return true;
    }
    return false;
  }
  ocultarSnake(si) {
    const c = typeof window !== "undefined" ? window.__mgs?.cuerpo : null;
    if (!c?.obj) return;
    c.obj.traverse(m => {
      if (si) {
        if (m.userData.__capas == null) {
          m.userData.__capas = m.layers.mask;
          m.layers.set(31);
        }
      } else if (m.userData.__capas != null) {
        m.layers.mask = m.userData.__capas;
        delete m.userData.__capas;
      }
    });
  }
  ubicarSnake() {
    const r = this.J.ctx.rig.position, x = this.mov.x * MM, z = this.mov.z * MM;
    const h = this.J.alturaPiso?.(x, z, this.mov.y * MM);
    r.set(x, h ?? r.y, z);
    if (this.mgr.congelado) this.mgr.congelado.copy(r);
  }
  actMotion3() {
    const M = this.motor;
    M.tick();
    const a = this.rotV.y * ANG, c = Math.cos(a), s = Math.sin(a);
    this.step.x += Math.trunc(M.paso[0] * c + M.paso[1] * s);
    this.step.z += Math.trunc(-M.paso[0] * s + M.paso[1] * c);
  }
  actControl3() {
    this.mov.x += this.step.x;
    this.mov.z += this.step.z;
    nearExp4PV(this.rotV, this.turnV);
    this.step.set(0, 0, 0);
  }
  cb(fn) {
    this.f808 = fn;
    this.f81A = 0;
    this.f818 = 0;
    this.f80C = 0;
  }
  cabezaMM() {
    return this.o ? this.puntoHuesoMM(6) : this.mov.clone();
  }
  cuadro() {
    if (!this.sis.guionListo()) return;
    this.msgs = this.buzon;
    this.buzon = [];
    this.pad = this.mando.leer(this.mgr.frame);
    this.barraT.visible = false;
    this.temblor = 0;
    this.sis.padMask &= ~2048;
    this.sis.mascaraPad = true;
    this.actMotion3();
    this.mov.y += this.motor.altura - this.altCtrl;
    this.actControl3();
    this.ubicarSnake();
    this.altCtrl = this.motor.altura;
    this.c64BC();
    if (!this.vivo) return;
    this.J.vida = Math.max(this.f804, .5) / this.sis.vidaMax();
    if (this.f800 & 1) nearExp2PV(this.rotate2, this.f82C); else this.rotate2 = {
      ...this.rotV
    };
    for (const r of this.rayos.slice()) if (!r.cuadro()) this.rayos.splice(this.rayos.indexOf(r), 1);
    this.info?.cuadro();
  }
  c64BC() {
    this.c5EC4();
    switch (this.f7FC) {
     case 0:
      this.c6024();
      break;

     case 1:
      this.c6080();
      break;

     case 2:
      this.c62C4();
      break;

     case 3:
      this.c6380();
      if (this.f7FC === 6) {
        this.f7FE = 1;
        this.f802 &= ~4;
        this.c6400();
      }
      break;

     case 5:
      this.c61A4();
      break;

     case 6:
      this.c6400();
      break;

     case 7:
      this.c6204();
      break;
    }
    if (!this.vivo) return;
    if (this.f7FE < 16e3) this.f7FE++;
    this.sis.vox.tick();
    asentir(this.adjust[6], this.sis.boca(N.SNAKE));
    this.c435C(4e3);
    this.c3EF8();
    this.c3E80();
    if (!this.vivo) return;
    this.c3EB8();
    this.c4284();
    this.c3FE4();
  }
  c3E80() {
    const i = this.f80C++;
    this.f808?.call(this, i);
  }
  c3EB8() {
    if (this.f802 & 2) {
      const i = this.f810++;
      this.c5E48(i);
    }
  }
  c3EF8() {
    if (this.f814 === 0) return;
    if (this.f814 > 0) {
      if (this.fp === 0 && --this.f814 === 0) this.visibleCuerpo = true;
    } else if (this.fp !== 0 && ++this.f814 === 0) this.visibleCuerpo = false;
  }
  c3FE4() {
    if (!(this.f800 & 1)) {
      this.turnV = R(this.f806 ?? 0, 0, 0);
      this.rotV = {
        ...this.turnV
      };
      this.f82C = {
        ...this.rotV
      };
      return;
    }
    if (!(this.f802 & 16384)) {
      const st = this.pad.status;
      if (this.pad.press & PAD_UDLR) this.se(186, this.mov, "bomba");
      let d = this.f806 ?? 0;
      if (st & PAD.UP) d -= 640; else if (st & PAD.DOWN) d += 640;
      this.f82C.x = d;
      d = 0;
      if (st & PAD.LEFT) d = 320; else if (st & PAD.RIGHT) d = -320;
      this.f82C.y = d;
      if (this.f82C.x < -1e3) this.f82C.x = -1e3;
    }
  }
  c421C() {
    this.f800 |= 1;
    if (this.fp <= 0) {
      this.fp = 1;
      this.f814 = -4;
    } else this.f814 = -1;
  }
  c4260() {
    this.f800 &= ~1;
    this.fp = 0;
    this.f814 = 4;
  }
  c4284() {
    if (this.f802 & 8192 || !(this.f802 & 1) && this.pad.status & PAD.TRIANGLE) {
      if (!(this.f800 & 1)) this.c421C();
    } else if (this.f800 & 1) this.c4260();
  }
  c4314() {
    if (this.f800 & 4 || !(this.pad.press & PAD.SELECT)) return 0;
    this.f7FC = 6;
    this.f7FE = 0;
    this.log("se rinde");
    return 1;
  }
  c435C(vx) {
    if (this.f802 & 8) this.sis.enviar(N.CAMA, [ HASH.TURN, Math.abs(vx) >= 2048 ? s12(this.rotV.x) : vx ]);
  }
  c43F0() {
    this.sis.enviar(N.CAMA, [ HASH.LEAVE2 ]);
  }
  c4438(m) {
    this.sis.enviar(N.LIQUID, [ m ]);
  }
  c447C(a, b) {
    this.sis.enviar(N.OCELOT, [ a, b ]);
  }
  c44D0(arg1, arg2) {
    let max = this.f860[0][this.f85C], now;
    if (arg2 < 0) {
      now = arg1 * 4;
      if (now > max) now = max;
      max = now;
    } else if (arg2 === 0) {
      now = max - arg1;
      if (max === now) now = max - 1;
    } else now = 0;
    max *= 5;
    now *= 5;
    if (max > 1024) {
      this.conf.der[1] = Math.trunc(65536 / max) + 63 & 255;
      this.conf.der[2] = Math.trunc(64512 / max) - 64 & 255;
    }
    Object.assign(this.barraT, {
      rest: now,
      now: now,
      max: Math.max(1, max),
      visible: true
    });
  }
  c4654() {
    for (const m of this.msgs) if (m[0] === 4) this.f802 |= 4;
  }
  c46B8=arg1 => {
    if (arg1 === 0) {
      this.sis.fundido(0, 28);
      this.sis.vox.init();
      this.f820 = 0;
      this.blur(false);
    }
    if (arg1 === 32) {
      this.fp = 0;
      if (this.f83C >= 0) this.execProc(this.f83C, []);
    }
  };
  c4740() {
    if (this.pad.press & PAD.CROSS) {
      this.cb(this.c46B8);
      this.log("saltea");
      return;
    }
    switch (this.f818) {
     case 0:
      if (this.f81A === 0) this.sis.abrirCine();
      if (!this.f8FC) this.blur(true);
      if (++this.f81A === 200) {
        this.f81A = 0;
        this.f818++;
      }
      break;

     case 1:
      this.sis.vox.queue(this.f87C[this.f820 + 3]);
      this.f818 = 2;
      this.f820++;
      break;

     case 2:
      if (this.sis.vox.fin()) {
        if (this.f820 === 4) {
          this.sis.cerrarCine();
          this.f802 |= 4;
        } else this.f818 = 3;
      }
      break;

     case 3:
      if ((this.f802 & 1792) !== 1792) {
        this.f81A = 150;
        this.f818 = 4;
      } else {
        this.c4438(this.f820 - 1);
        this.f81A = 0;
        this.f818 = 1;
      }
      break;

     case 4:
      {
        if (this.f81A-- === 1) {
          this.f818 = 1;
          this.c4438(this.f820 - 1);
          break;
        }
        const st = this.pad.status;
        if (st === 0) break;
        let v = -1;
        if (st & 61440 && !(this.f802 & 256)) {
          this.f802 |= 256;
          v = this.f87C[2];
        } else if (st & 15 && !(this.f802 & 512)) {
          this.f802 |= 512;
          v = this.f87C[0];
        } else if (st & 224 && !(this.f802 & 1024)) {
          this.f802 |= 1024;
          v = this.f87C[1];
        }
        if (v >= 0) {
          this.sis.vox.queue(v);
          this.f818 = 5;
          this.log("se mueve", {
            voz: v
          });
        }
        break;
      }

     case 5:
      if (this.sis.vox.fin()) {
        this.f81A -= 200;
        if (this.f81A < 1) {
          this.c4438(this.f820 - 1);
          this.f81A = 0;
          this.f818 = 1;
        } else this.f818 = 4;
      }
      break;
    }
  }
  c4A08() {
    if (this.f848 === 0) this.c4740(); else if (++this.f81A === 90) this.f802 |= 4;
  }
  c4AB0=arg1 => {
    if (arg1 === 0) {
      this.adjOn = true;
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.sis.vox.init();
      this.sis.vox.queueDelay(this.f87C[2], 4);
      this.ctx.musica?.(4278190334);
      this.sis.abrirCine();
      if (this.motor.action !== 2) this.motor.accion(2, 4);
    }
    if (this.sis.vox.codeEnd(this.f87C[2])) this.cb(this.c4C48);
    if (this.motor.isEnd !== 0 && this.motor.action === 2) this.motor.accion(3, 4);
    if (this.f800 & 2 && (arg1 & 15) === 0) for (let i = 0; i < this.f8B8; i++) {
      const r = randU(64) % 15;
      this.rayo(r, r + 1);
    }
  };
  c4C48=arg1 => {
    if (arg1 === 0) {
      this.c447C(HASH.MODE, 4);
      this.execProc(this.f840, [ 0 ]);
    }
    this.c4654();
    if (arg1 === 300) {
      if (this.motor.action !== 0) this.motor.accion(0, 15);
      this.execProc(this.f840, [ 11 ]);
    }
    if (arg1 >= 330) {
      if (arg1 === 330) {
        this.f802 |= 8;
        vibrar("camilla");
        this.se(176, this.mov);
      }
      this.turnV.x = (arg1 - 330) * -7;
      if (this.turnV.x < -760) {
        if (this.f818 === 0) this.f818 = 1;
        this.turnV.x = -760;
      }
      this.f806 = this.turnV.x;
      this.f82C.x = this.f806;
    }
    if (arg1 === 420) {
      this.fp = 2;
      this.f802 |= 24576;
    }
    if (arg1 === 490) this.se2(182);
  };
  c4DF0=arg1 => {
    if (arg1 === 0) {
      this.sis.fundido(1, 128);
      if (this.motor.action !== 0) this.motor.accion(0, 1);
      this.f806 = -760;
      this.rotV.x = -760 & 4095;
      this.turnV.x = -760 & 4095;
      this.f802 |= 8192;
    }
    this.c4A08();
  };
  c4E64=arg1 => {
    if (arg1 === 0) {
      this.f802 |= 8192;
      if (this.motor.action !== 0) this.motor.accion(0, 4);
      vibrar("camilla");
      this.se(176, this.mov);
    }
    this.f806 = arg1 * 7 - 760;
    if (this.f806 > 0) {
      if (this.f818 === 0) {
        this.f818 = 1;
        if (this.f848 !== 0) this.sis.fundido(0, 28);
      }
      this.f806 = 0;
    }
    this.turnV.x = this.f806 & 4095;
  };
  c4F54=arg1 => {
    if (arg1 === 0) {
      if (this.motor.action !== 0) this.motor.accion(0, 4);
      vibrar("camilla");
      this.se(176, this.mov);
    }
    this.f806 = arg1 * -7;
    if (this.f806 < -760) {
      if (this.f818 === 0) this.f818 = 1;
      this.f806 = -760;
    }
    this.turnV.x = this.f806 & 4095;
    if (arg1 === 90) {
      this.f802 |= 8192;
      this.fp = 2;
    }
    if (arg1 === 200) this.f900 = this.sis.fundido(0, 32);
    if (arg1 === 160) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.se2(182);
    }
    if (arg1 === 250) this.f802 |= 4;
  };
  c50A8=arg1 => {
    if (arg1 === 0) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      if (this.motor.action !== 0) this.motor.accion(0, 4);
      this.fp = 2;
      this.f802 |= 24576;
      this.mov.set(-2e3, 450, -1e3);
      this.step.set(0, 0, 0);
      this.turnV = R(320, 2048, 0);
      this.rotV = R(320, 2048, 0);
      this.c447C(HASH.MODE, 3);
      this.f820 = 183;
      this.f802 |= 8;
      this.c435C(-1023);
      this.f802 &= ~8;
      this.f82C = {
        ...this.rotV
      };
    }
    if (arg1 === 1) {
      this.sis.enviar(25342, [ 29169 ]);
      this.f802 &= ~8;
    }
    const which = this.f818 & 1;
    if (this.f818 === 10) this.sis.fundido(0, 64);
    if (this.f818 === 12) {
      this.f802 |= 4;
      return;
    }
    if (which === 0) {
      if (this.f81A === 0) {
        if (this.f820 === 183) vibrar("arrastre");
        this.se(this.f820, this.mov);
        if (++this.f820 === 186) this.f820 = 183;
      }
      this.step.z = 32;
      this.temblor = (this.mgr.frame & 1 ? -1 : 1) * randU(8);
    }
    if (++this.f81A === 16) {
      this.f81A = 0;
      this.f818++;
    }
    if (arg1 > 60 && s12(this.f82C.x) > 0) this.f82C.x -= 6;
  };
  c53C8=arg1 => {
    if (arg1 === 0) {
      this.f802 &= ~8192;
      if (this.motor.action !== 0) this.motor.accion(0, 4);
      this.f806 = 0;
    }
    this.c4654();
  };
  c5420=arg1 => {
    if (arg1 === 0) {
      this.f806 = 0;
      this.f802 &= ~8192;
      this.c447C(HASH.MOTION, 9);
      this.f8AC = {
        x: this.f89C.x,
        y: this.f89C.y,
        z: 0
      };
      this.execProc(this.f844, []);
      this.camNormal = {
        rot: {
          ...this.f8AC
        },
        track: this.f89C.z
      };
      this.trgS = null;
      this.f81C = 0;
    }
    const s2 = this.f85C === 0 ? 32 : 0;
    if (arg1 === s2 + 32) {
      if (this.f85C === 0) this.info = new Cartel(this.sis);
      this.se2(180);
    } else if (arg1 === s2 + 42 || arg1 === s2 + 64) this.se2(180);
    if (arg1 === s2 + 108) this.se2(178);
    const a1 = arg1 - 136 - s2;
    if (a1 < 0) this.c44D0(arg1, -1); else this.c44D0(a1, 0);
    if (arg1 >= s2 + 136) {
      this.f800 |= 2;
      if (!(arg1 & 15)) for (let i = 0; i < this.f8B8; i++) {
        const r = randU(64) % 15;
        this.rayo(r, r + 1);
      }
      const t0 = s2 + 136;
      if (arg1 === t0) {
        this.f84C = this.f860[0][this.f85C] + 64;
        this.f802 |= 2;
        this.se(128, this.mov);
        this.mov.copy(this.f824);
        const act = this.mgr.frame & 1 ? 1 : 7;
        if (this.motor.action !== act) this.motor.accion(act, 4);
        this.log("descarga", {
          ronda: this.f85C,
          dura: this.f860[0][this.f85C],
          baja: this.f860[1][this.f85C],
          vida: this.f804
        });
      }
      if ((arg1 - t0) % 30 === 0) this.f804 -= this.f860[1][this.f85C];
      if (arg1 === t0 + this.f860[0][this.f85C]) {
        this.ctx.musica?.(4278190334);
        this.f800 &= ~2;
        if (this.f804 <= 0) {
          this.f810 = 0;
          this.cb(this.c5CC8);
          this.f802 &= ~2;
          this.log("muere", {
            ronda: this.f85C
          });
          return;
        }
        this.log("aguanta", {
          ronda: this.f85C,
          vida: this.f804
        });
        this.cb(this.c59FC);
        return;
      }
      vibrarCuadro(randU(64) + 192);
      if (this.f81A === 0) {
        this.se2(177);
        this.f81A = randU(4096) % 11 + 2;
      } else this.f81A--;
      switch (this.f818) {
       case 0:
        {
          let v = this.f8AC.y + Math.trunc((this.f8A6 - this.f89C.y) / this.f8B6);
          if (v > this.f8A6) {
            v = this.f8A6;
            this.f818++;
          }
          this.f8AC.y = v;
          break;
        }

       case 1:
        if (++this.f81C === 32) {
          this.f81C = 0;
          this.f818++;
        }
        break;

       case 2:
        {
          let v = this.f8AC.y + Math.trunc((this.f89C.y - this.f8A6) / this.f8B6);
          if (this.f89C.y > v) {
            v = this.f89C.y;
            this.f818++;
          }
          this.f8AC.y = v;
          break;
        }

       case 3:
        if (++this.f81C === 32) {
          this.f818 = 0;
          this.f81C = 0;
        }
        break;
      }
      this.camNormal = {
        rot: {
          ...this.f8AC
        },
        track: this.f89C.z
      };
      if (this.motor.isEnd !== 0) this.mov.copy(this.f824);
    }
  };
  c59FC=arg1 => {
    if (arg1 === 0) {
      this.c447C(HASH.MOTION, 7);
      if (this.motor.action !== 2) this.motor.accion(2, 4);
      this.se(181, this.mov);
    }
    this.c44D0(0, 1);
    if (arg1 < 8) nearExp4V(this.mov, this.f824);
    if (this.motor.isEnd !== 0) {
      this.f85C++;
      if (this.f85C !== this.f85E) {
        this.c447C(HASH.MOTION, 7);
        this.c447C(HASH.VOICE, this.f85C + 2);
      }
      this.cb(this.c5AF8);
    }
  };
  c5AF8=arg1 => {
    const f85E = this.f85E;
    if (arg1 === 0) {
      if (this.motor.action !== 6) this.motor.accion(6, 15);
      this.f806 = 0;
      if (this.f840 >= 0) this.execProc(this.f840, [ this.f85C === f85E ? 0 : this.f85C ]);
    }
    if (this.f85C !== f85E) {
      if (this.f818 === 0 && !(this.f802 & 2) && this.f81A === 1) {
        randU(16);
        this.c447C(HASH.OPERATION, 0);
        this.c447C(HASH.VOICE, this.f85C + 8);
        this.f818 = 1;
      }
      if (this.sis.vox.fin()) this.f81A++;
      if (this.f81A === 2) this.cb(this.c5420);
    } else if (this.f818 === 0) {
      if (!(this.f802 & 2)) {
        this.f800 |= 4;
        this.info?.matar();
        this.info = null;
        this.c447C(HASH.MODE, 2);
        this.f818 = 1;
        this.log("sobrevive");
      }
      if (this.f818 !== 0) this.c4654();
    } else this.c4654();
  };
  c5CC8=arg1 => {
    if (arg1 === 0) {
      vibrar("muereTortura");
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.se2(SE_PLAYEROUT);
      if (this.motor.action !== 4) this.motor.accion(4, 4);
      this.f802 |= 16;
    }
    if (arg1 < 8) nearExp4V(this.mov, this.f824);
    if (this.f818 === 0) {
      if (this.motor.isEnd !== 0) {
        this.f818++;
        if (this.motor.action !== 5) this.motor.accion(5, 4);
      }
    } else if (this.f818 === 1 && ++this.f81A === 32) {
      this.f818++;
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.log("game over");
      this.mgr.gameOver();
    }
  };
  c5E48(arg1) {
    if (this.pad.press & PAD.CIRCLE) this.f804 += this.f84A;
    if (this.f804 > this.sis.vidaMax()) this.f804 = this.sis.vidaMax();
    if (arg1 === this.f84C) {
      this.f810 = 0;
      this.f802 &= ~2;
    }
  }
  c5EC4() {
    if (this.f802 & 64) return;
    for (let i = this.msgs.length - 1; i >= 0; i--) {
      const m = this.msgs[i];
      switch (m[0]) {
       case 58672:
        this.f85C = 0;
        this.f85E = m[1];
        this.f802 |= 64;
        break;

       case 63897:
        for (let k = 1; k < m.length && k <= 6; k++) this.f860[0][k - 1] = m[k];
        this.f802 |= 64;
        break;

       case 58132:
        for (let k = 1; k < m.length && k <= 6; k++) this.f860[1][k - 1] = m[k];
        this.f802 |= 64;
        break;

       case 65061:
        this.f84A = m[1];
        this.f802 |= 64;
        break;
      }
    }
    if (this.f802 & 64) this.log("rondas", {
      rondas: this.f85E,
      duran: this.f860[0].slice(0, this.f85E),
      bajan: this.f860[1].slice(0, this.f85E),
      porBoton: this.f84A
    });
  }
  c6024() {
    if (this.f7FE === 0) {
      this.cb(this.c4DF0);
      this.f802 |= 8;
    }
    if (this.f802 & 4) {
      this.f802 &= ~4;
      this.f7FC = 1;
      this.f7FE = 0;
    }
  }
  c6080() {
    if (this.f7FE < 2) {
      this.blur(false);
      this.cb(this.c4E64);
      this.f802 |= 8;
    }
    if (this.f848 === 0 && this.f7FE === 120) this.sis.fundido(0, 28);
    if (this.f7FE === (this.f848 === 0 ? 150 : 180)) {
      if (this.f848 === 0 && this.f83C >= 0) {
        this.fp = 0;
        this.execProc(this.f83C, []);
        this.log("fin del primer día");
        this.destruir();
      } else {
        this.f7FC = 2;
        this.f7FE = 0;
        this.f802 &= ~8;
      }
    }
  }
  c61A4() {
    if (this.f7FE < 2) {
      this.cb(this.c4F54);
      this.f802 |= 8;
    }
    if (this.f802 & 4) {
      this.f802 &= ~12;
      this.f7FC = 7;
      this.f7FE = 0;
    }
  }
  c6204() {
    if (this.f7FE < 2) {
      this.c43F0();
      this.cb(this.c50A8);
    }
    if (this.f802 & 4) {
      this.f802 &= ~4;
      this.sis.sacarEstado(STATE.PADRELEASE);
      if (this.f83C >= 0) {
        this.log("a la celda", {
          proc: this.f83C,
          seRindio: this.f83C === this.f838
        });
        this.execProc(this.f83C, []);
        this.destruir();
      }
    }
  }
  c62C4() {
    if (this.f7FE < 2) this.cb(this.c53C8);
    if (this.f7FE === 30) this.c4260();
    if (this.f802 & 4) {
      this.f802 &= ~4;
      this.f7FC = 3;
      this.f7FE = 0;
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.log("empiezan las rondas");
    }
  }
  c6380() {
    if (this.f7FE < 2) this.cb(this.c5420);
    if (!this.c4314() && this.f802 & 4) {
      this.f802 &= ~4;
      this.f820 = 0;
      this.f7FC = 5;
      this.f7FE = 0;
    }
  }
  c6400() {
    if (this.f7FE < 2) {
      this.info?.matar();
      this.info = null;
      this.cb(this.c4AB0);
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.f802 |= 8;
    }
    if (this.f802 & 4) {
      this.f7FC = 7;
      this.f7FE = 0;
      this.f83C = this.f838;
      this.f802 &= ~12;
      this.sis.sacarEstado(STATE.PADRELEASE);
    }
  }
  rayo(j1, j2) {
    if (this.o) this.rayos.push(new Rayo(this, j1, j2, 16));
  }
  blur(si) {
    const cv = typeof window !== "undefined" ? window.__mgs?.R?.domElement : null;
    this.f8FC = si ? true : null;
    if (cv) cv.style.filter = si ? "blur(1.6px)" : "";
  }
  dibujar() {
    if (!this.o) return;
    const c = this.sis.cama;
    let pos, rot;
    if (c && c.vivo && c.sostiene) {
      rot = c.rot;
      const e = new THREE.Euler(rot.x * ANG, rot.y * ANG, rot.z * ANG, "YXZ");
      pos = c.mov.clone().add(c.off.clone().applyEuler(e));
    } else {
      pos = this.mov;
      rot = this.rotV;
    }
    this.o.position.set(pos.x * MM, pos.y * MM, pos.z * MM);
    this.o.rotation.set(rot.x * ANG, rot.y * ANG, rot.z * ANG, "YXZ");
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjOn ? this.adjust : null, 0);
    this.o.visible = this.visibleCuerpo;
    const h = this.cabezaMM();
    h.y += this.temblor;
    if (!this.trgS) this.trgS = h.clone(); else {
      const t = this.trgS, rng = (a, b, r) => a < b - r ? b - r : a > b + r ? b + r : a;
      t.set(rng(t.x, h.x, 500), rng(t.y, h.y, 150), rng(t.z, h.z, 500));
      t.set(nearExp(t.x, h.x, 4), nearExp(t.y, h.y, 4), nearExp(t.z, h.z, 4));
    }
    this.cabeza = h;
  }
  camara() {
    if (!this.o || !this.cabeza) return null;
    const h = this.cabeza;
    let pos, trg;
    const pc = this.sis.progcam;
    if (this.fp !== 0) {
      pos = h.clone();
      trg = h.clone().add(dirVec3(this.rotate2, 1e3));
    } else if (pc?.activo) {
      pos = pc.p.clone();
      trg = pc.t.clone();
    } else {
      const ev = this.camaraEvento();
      if (ev) ({pos: pos, trg: trg} = ev); else {
        const cj = typeof window !== "undefined" ? window.__mgs?.camJuego : null;
        const n = this.camNormal || {
          rot: cj?.rotSave || {
            x: 298,
            y: 2323,
            z: 0
          },
          track: cj?.trackSave || 5200
        };
        trg = (this.trgS || h).clone();
        pos = trg.clone().sub(dirVec3(n.rot, n.track));
      }
    }
    if (pos.distanceToSquared(trg) < 1) trg.z += 1;
    return {
      pos: pos.multiplyScalar(MM),
      mira: trg.multiplyScalar(MM)
    };
  }
  camaraEvento() {
    const bits = this.sis.camEv?.bits || 0, cj = typeof window !== "undefined" ? window.__mgs?.camJuego : null;
    if (!bits || !cj?.lista) return null;
    let i = 7;
    for (;i >= 0; i--) if (bits & 1 << i && cj.lista[i].p1 !== -1) break;
    if (i < 0) return null;
    const k = cj.lista[i], S = (this.trgS || this.cabeza).clone(), P = a => V(a.x, a.y, a.z);
    if (k.p1 === 0) {
      const rot = R(k.trg.x, k.trg.y, 0);
      return {
        pos: S.clone().sub(dirVec3(rot, k.trg.z)),
        trg: S
      };
    }
    let pos, trg;
    if (k.tipo === 1) {
      pos = P(k.pos);
      trg = pos.clone().add(dirVec3(R(k.trg.x, k.trg.y, 0), k.trg.z));
    } else if (k.tipo === 2) {
      trg = P(k.pos);
      pos = trg.clone().sub(dirVec3(R(k.trg.x, k.trg.y, 0), k.trg.z));
    } else {
      pos = P(k.pos);
      trg = P(k.trg);
    }
    if (k.p1 === 2) trg.z = S.z; else if (k.p1 === 3) trg = S;
    return {
      pos: pos,
      trg: trg
    };
  }
  estadoPrueba() {
    return {
      modo: this.f7FC,
      t: this.f7FE,
      f802: this.f802,
      f800: this.f800,
      vida: this.f804,
      ronda: this.f85C,
      rondas: this.f85E,
      accion: this.motor?.action,
      fp: this.fp,
      sub: this.f818,
      cb: this.f808?.name || null,
      rot: this.rotV,
      mov: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      barra: this.barraT.visible ? [ this.barraT.now, this.barraT.max ] : null
    };
  }
  destruir() {
    if (!this.vivo) return;
    this.sis.cerrarCine();
    this.sis.vox.init();
    this.J.vida = 1;
    this.blur(false);
    this.info?.matar();
    this.info = null;
    for (const r of this.rayos) r.quitar();
    this.rayos = [];
    this.sis.bloquear(this, false);
    this.ocultarSnake(false);
    this.mando.desactivar(this);
    this.sis.mascaraPad = false;
    if (this.mgr.camaraEspecial === this.camFn) this.mgr.camaraEspecial = this.camPrev;
    super.destruir();
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

class Ocelote extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = N.OCELOT;
    this.lado = "jugador";
    this.blanco = false;
    this.dePersonajes = true;
    this.buzon = [];
    this.msgs = [];
    this.mando = mandoDe(sis);
    this.pad = this.mando;
  }
  log(t, extra = {}) {
    this.sis.log("ocelot " + t, extra);
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    await this.cargarCon("niveles/s03b/rev_v_ct.glb", "rev03bd");
    if (!this.vivo) return;
    this.o.userData.actor = a;
    const p = nums(o.p), d = nums(o.d);
    this.mov.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rot = this.turn = (d[1] ?? 0) & 4095;
    this.rSphere = -1;
    this.interpCtrl = 0;
    this.pts = this.ruta(nums(o.r)[0] ?? 0).map(q => q.p.clone());
    if (!this.pts.length) this.pts = [ this.mov.clone() ];
    this.f8B8 = 0;
    this.f8D0 = nums(o.v).slice(0, 27);
    this.f974 = procsDe(o.a).slice(0, 12);
    while (this.f974.length < 12) this.f974.push(-1);
    this.f964 = null;
    this.f95C = 0;
    this.f960 = 0;
    this.f8C0y = 0;
    this.f944 = 0;
    this.f948 = 0;
    this.f94C = 0;
    this.f958 = -1;
    this.f950 = 0;
    this.f954 = 0;
    this.f96A = 0;
    this.f96C = 0;
    this.f93C = -1;
    this.lit = null;
    this.litI = 0;
    this.f8C8 = procDe(o.e);
    this.f940 = nums(o.c)[0] ?? 0;
    if ((nums(o.f)[0] ?? 0) !== 0) this.f948 |= 1024;
    this.f9A4 = V();
    this.f9AC = R();
    this.f9B4 = 0;
    this.f9B6 = 0;
    this.pc = progcamDe(this.sis);
    this.mando.activar(this);
    this.pose0(0);
    this.motor.accion(0, 0);
    this.actMotion();
    this.actControl();
    this.movDib = this.mov.clone();
    this.rotDib = this.rot;
    this.sis.flujo.precargar(this.f8D0);
    this.log("inicio", {
      dia: this.f940,
      puntos: this.pts.length
    });
  }
  recibir(v) {
    this.buzon.push(v.slice());
    return true;
  }
  envio(v) {
    this.buzon.push(v.slice());
  }
  cuadro() {
    if (!this.sis.guionListo()) return;
    this.msgs = this.buzon;
    this.buzon = [];
    this.pad = this.mando.leer(this.mgr.frame);
    this.actMotion();
    this.step.y = this.f8C0y;
    this.actControl();
    this.movDib = this.mov.clone();
    this.rotDib = this.rot;
    this.pc.leer();
    this.c89C8();
    this.c8B5C();
    this.c8600();
    if (!this.vivo) return;
    if (this.f8C0y < 0 && this.grounded) this.f8C0y = 0;
    this.f8C0y -= 32;
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.movDib.x * MM, (this.movDib.y - this.motor.altura) * MM, this.movDib.z * MM);
    this.o.rotation.y = this.rotDib * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjOn ? this.adjust : null, this.motor.altura * MM);
  }
  accion(a, interp = 4) {
    this.motor.accion(a, interp);
  }
  c7384(index) {
    const entrada = REV_ENTRADA[index];
    this.lit = LIT[REV_LIT[index]] || null;
    this.litI = 0;
    this.sis.vox.queue(this.f8D0[entrada]);
    this.f93C = this.f8D0[entrada];
    if (this.motor.action !== 0) this.accion(0, 4);
    this.log("voz", {
      index: index,
      voz: this.f93C
    });
  }
  c71E8(frame) {
    const L = this.lit;
    if (!L) return;
    while (this.litI * 2 + 1 < L.length && L[this.litI * 2] >= 0 && L[this.litI * 2 + 1] === frame) {
      this.envio([ HASH.MOTION, L[this.litI * 2] ]);
      this.litI++;
    }
  }
  c72A4(arg1) {
    for (;;) {
      const m = this.f964?.[this.f964i];
      if (!m) break;
      if (m[1] === HASH.VOICE && arg1 !== 0) break;
      if (m[0] === arg1) {
        this.envio([ m[1], m[2] ]);
        this.f964i++;
        this.f960++;
      } else if (m[0] < 0 && this.f948 & m[3]) {
        this.envio([ m[1], m[2] ]);
        this.f964i++;
      } else break;
    }
  }
  c742C(arg1, arg2, arg3) {
    if (arg1 === 0) {
      this.f954 = 0;
      this.f96C = 0;
    }
    const t = this.f954++;
    switch (this.f96C) {
     case 0:
     case 1:
      if (this.c884C(t)) {
        this.f954 = 0;
        this.f96C++;
      }
      break;

     case 2:
      if (this.c8910(t)) {
        this.f954 = 0;
        this.f96C++;
      }
      break;

     case 3:
      if (this.c8794(t)) {
        this.f954 = 0;
        this.f96C++;
      }
      break;
    }
    if (arg1 === arg3 && arg2 >= 0) {
      this.sis.vox.queue(this.f8D0[arg2]);
      this.log("voz", {
        voz: this.f8D0[arg2]
      });
    }
    if (arg2 >= 0) {
      if (!this.sis.vox.codeEnd(this.f8D0[arg2])) return 0;
    } else if (arg1 !== arg3) return 0;
    this.f948 &= ~512;
    return 1;
  }
  contadores() {
    const st = this.sis.streamStatus(), i950 = this.f950, i958 = this.f958;
    if (st === -1 || st === 2) this.f950++;
    if (this.f950 === 0) this.f950 = 1;
    if (st === 2) this.f958++;
    return [ i950, i958 ];
  }
  saltar() {
    this.f944 = 5;
    this.f9A4.set(-3250, 788, -1125);
    this.f94C = 0;
    this.f9AC = R();
    this.f9B4 = 10;
    this.f9B6 = 1;
    this.log("saltea");
  }
  c7574() {
    const iVar5 = this.f96A, uVar7 = this.f948, [iVar4, i958] = this.contadores();
    let iVar6 = i958;
    if (this.pad.press & PAD.CROSS) {
      this.saltar();
      return;
    }
    const chequeo = () => {
      if (uVar7 & 2) {
        if (iVar5 === 0) this.c7384(1); else if (iVar5 === 3) this.c7384(11); else if (iVar5 === 4) this.c7384(12);
        this.f950 = 0;
        this.f958 = -1;
        iVar6 = -1;
        this.f96A++;
      }
      this.c71E8(iVar6);
    };
    switch (iVar5) {
     case 0:
      if (iVar4 === 0) {
        this.f958 = -1;
        iVar6 = -1;
        this.sis.abrirCine();
        this.c7384(0);
        this.f948 &= ~256;
        this.execProc(this.f974[11], []);
      }
      if (this.sis.vox.codeStart(this.f93C)) this.execProc(this.f974[0], []);
      chequeo();
      break;

     case 1:
      chequeo();
      break;

     case 3:
      if (this.sis.vox.codeStart(this.f93C)) this.execProc(this.f974[1], []);
      chequeo();
      break;

     case 4:
      if (this.sis.vox.codeStart(this.f93C)) this.execProc(this.f974[9], []);
      chequeo();
      break;

     case 5:
      if (this.sis.vox.codeStart(this.f93C)) this.execProc(this.f974[10], []);
      chequeo();
      break;

     case 2:
      {
        const seg = this.segundosSinGuardar();
        if (seg < 0 || seg > 1800) {
          this.c7384(2);
          this.f96A = 3;
        } else {
          this.c7384(11);
          this.f96A = 4;
        }
        this.f950 = 0;
        this.c71E8(iVar6);
        break;
      }

     case 6:
      if (this.c8710(iVar4)) {
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 7:
      if (this.c742C(iVar4, 8, 48)) {
        this.sis.fundido(0, 16);
        this.sis.cerrarCine();
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 8:
      if (iVar4 === 18) this.sis.enviar(N.PROGCAM, [ HASH.END, 0 ]); else if (iVar4 === 28) {
        this.sis.enviar(25342, [ 29169, 0 ]);
        this.f948 |= 256;
      }
      break;
    }
  }
  segundosSinGuardar() {
    const g = this.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
    if (!g?.vars) return 9999;
    try {
      const L = i => g.vars.get("$w:L" + (i * 2).toString(16).padStart(4, "0")) | 0;
      return L(91) * 3600 + L(92) - (L(93) * 3600 + L(94));
    } catch {
      return 9999;
    }
  }
  c7958() {
    const iVar4 = this.f96A, uVar6 = this.f948, [iVar3, i958] = this.contadores();
    let iVar5 = i958;
    if (iVar4 > 1 && this.pad.press & PAD.CROSS) {
      this.saltar();
      return;
    }
    const chequeo = () => {
      if (uVar6 & 2) {
        if (iVar4 === 1) this.c7384(0); else if (iVar4 === 2) this.c7384(10);
        this.f96A++;
        this.f950 = 0;
        this.f958 = -1;
        iVar5 = -1;
        if (this.f940 > 1 && iVar4 === 1) this.f96A++;
      }
      this.c71E8(iVar5);
    };
    switch (iVar4) {
     case 0:
      if (iVar3 === 0) this.sis.abrirCine();
      if (iVar3 === 120) {
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 1:
      if (iVar3 === 0) {
        this.f958 = -1;
        iVar5 = -1;
        this.c7384(9);
        this.f948 &= ~256;
      }
      chequeo();
      break;

     case 2:
      if (this.sis.vox.codeStart(this.f93C)) {
        this.execProc(this.f974[3], []);
        this.sis.enviar(25342, [ 29169, 0 ]);
      }
      chequeo();
      break;

     case 3:
      {
        const index = this.f940 > 1 ? 3 : 4;
        if (this.sis.vox.codeStart(this.f93C)) {
          this.execProc(this.f974[index], []);
          if (index === 3) this.sis.enviar(25342, [ 29169, 0 ]);
        }
        chequeo();
        break;
      }

     case 4:
      if (iVar3 === 0) this.execProc(this.f974[5], []);
      if (this.c8710(iVar3)) {
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 5:
      if (this.c742C(iVar3, 8, 48)) {
        this.sis.fundido(0, 16);
        this.sis.cerrarCine();
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 6:
      if (iVar3 === 18) this.sis.enviar(N.PROGCAM, [ HASH.END, 0 ]); else if (iVar3 === 28) {
        this.sis.enviar(25342, [ 29169, 0 ]);
        this.f948 |= 256;
      }
      break;
    }
  }
  c7D04(arg1) {
    if (arg1 === 0) {
      this.f950 = 0;
      this.f96A = 0;
      this.sis.mascaraPad = true;
      this.sis.padMask = this.sis.padMask & ~63504 | 64;
    }
    if (this.f940 === 0) this.c7574(); else this.c7958();
    if (this.f948 & 256) {
      this.sis.enviar(N.SNAKE, [ 4, 0 ]);
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.envio([ HASH.MODE, 1 ]);
      this.f948 &= ~256;
      this.sis.padMask = ~2048;
      this.sis.mascaraPad = true;
      this.log("fin del diálogo");
    }
  }
  c7E2C(arg1) {
    const q = this.pts[this.f8B8] || this.pts[0];
    this.mov.copy(q);
    if (this.f948 & 512) this.c742C(arg1, -1, 128);
  }
  c7E88(arg1) {
    if (arg1 === 0) {
      this.sis.mascaraPad = true;
      this.sis.padMask &= ~63504;
      this.sis.abrirCine();
      this.f950 = 0;
      this.f96A = 0;
      this.f9B6 = 0;
    }
    if (this.pad.press & PAD.CROSS) {
      this.sis.vox.init();
      this.sis.ponerEstado(STATE.PADRELEASE);
      if (this.f8C8 > -1) this.execProc(this.f8C8, []);
      this.f9B6 = 1;
      this.log("saltea la despedida");
      return;
    }
    if (this.f9B6 === 1) return;
    const uVar8 = this.f948, uVar1 = this.f96A, [iVar7, i958] = this.contadores();
    let iVar6 = i958;
    switch (uVar1) {
     case 0:
      if (this.c8710(iVar7)) {
        this.turn = 1800;
        this.f958 = -1;
        this.c7384(4);
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 1:
      if (uVar8 & 2) {
        if (this.f940 < 3) {
          this.c7384(this.f940 + 5);
          this.f950 = 0;
          this.f96A++;
        } else {
          this.f950 = 0;
          this.f96A += 2;
        }
        this.f958 = -1;
        iVar6 = -1;
      }
      this.c71E8(iVar6);
      break;

     case 2:
      if (this.sis.vox.codeStart(this.f93C)) this.execProc(this.f974[this.f940 + 6], []);
      if (uVar8 & 2) {
        this.f950 = 0;
        this.f958 = -1;
        iVar6 = -1;
        this.f96A++;
        this.sis.fundido(0, 12);
      }
      this.c71E8(iVar6);
      break;

     case 3:
      if (this.c8710(iVar7)) {
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 4:
      if (this.c742C(iVar7, -1, 48)) {
        this.f950 = 0;
        this.sis.sacarEstado(STATE.PADRELEASE);
        this.f96A++;
      }
      if (iVar7 === 0) this.sis.enviar(N.PROGCAM, [ HASH.END, 0 ]); else if (iVar7 === 8) {
        this.sis.enviar(25342, [ 29169, 0 ]);
        this.sis.enviar(N.SNAKE, [ 4, 0 ]);
      }
      break;
    }
  }
  c81EC(arg1) {
    if (arg1 === 0) {
      this.f964 = [ [ 0, HASH.MOVE, 2, 0 ], [ -1, HASH.MOTION, 0, 1 ], [ -1, HASH.TURN, 0, 1 ], [ 0, 1, 2, 24 ] ];
      this.f964i = 0;
      this.f95C = 3;
      this.f960 = 0;
      this.sis.ponerEstado(STATE.PADRELEASE);
    }
    if (this.f960 === this.f95C) this.sis.sacarEstado(STATE.PADRELEASE); else this.c72A4(arg1);
  }
  c826C(arg1) {
    if (arg1 === 0) {
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.sis.abrirCine();
      this.f950 = 0;
      this.f96A = 0;
    }
    const uVar1 = this.f96A, [iVar4, i958] = this.contadores();
    switch (uVar1) {
     case 0:
      if (this.c8710(iVar4)) {
        this.f958 = -1;
        this.c7384(8);
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 1:
      if (iVar4 === 254) {
        this.f950 = 0;
        this.f96A++;
      }
      this.c71E8(i958);
      break;

     case 2:
      if (this.c742C(iVar4, -1, 48)) {
        this.f950 = 0;
        this.f96A++;
      }
      break;

     case 3:
      if (this.sis.streamStatus() === -1) {
        this.f950 = 0;
        this.f96A++;
        this.sis.fundido(0, 28);
      }
      break;

     case 4:
      if (iVar4 === 34) this.sis.enviar(25342, [ 29169, 0 ]); else if (iVar4 === 28) {
        this.sis.enviar(N.SNAKE, [ 4, 0 ]);
        this.sis.cerrarCine();
      }
      break;
    }
  }
  c8488(mode) {
    if (mode === 0) {
      this.sis.fundido(0, 28);
      this.sis.vox.init();
      this.sis.cerrarCine();
    }
    if (mode === 32) {
      this.sis.enviar(N.PROGCAM, [ HASH.END, 0 ]);
      this.sis.enviar(N.SNAKE, [ 4, 0 ]);
      this.envio([ HASH.MODE, this.f9B6 ]);
      this.f948 &= ~256;
      this.sis.enviar(25342, [ 29169, 0 ]);
      this.mov.copy(this.f9A4);
      this.turn = this.f9AC.y & 4095;
      if (this.motor.action !== this.f9B4) this.accion(this.f9B4, 4);
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.sis.mascaraPad = true;
      this.sis.padMask = ~2048;
    }
  }
  c8600() {
    const uVar2 = this.f94C, st = this.sis.vox.status();
    if (st === -1 || st === 2) this.f94C++;
    if (this.f94C === 0) this.f94C = 1;
    switch (this.f944) {
     case 0:
      this.c7D04(uVar2);
      break;

     case 1:
      this.c7E2C(uVar2);
      break;

     case 2:
      this.c7E88(uVar2);
      break;

     case 3:
      this.c81EC(uVar2);
      break;

     case 4:
      this.c826C(uVar2);
      break;

     case 5:
      this.c8488(uVar2);
      break;
    }
  }
  c8710(arg1) {
    if (arg1 === 0 && this.motor.action !== 12) this.accion(12, 4);
    if (this.motor.isEnd !== 0) {
      this.turn = this.turn + 2048 & 4095;
      this.rot = this.turn;
      if (this.motor.action !== 0) this.accion(0, 0);
      return 1;
    }
    return 0;
  }
  c8794(arg1) {
    if (arg1 === 0) {
      this.turn = 0;
      if (this.motor.action !== 8) this.accion(8, 4);
    }
    nearExp4V(this.mov, this.pts[this.f8B8] || this.mov);
    if (arg1 === 24) this.se(179, this.mov);
    if (this.motor.isEnd !== 0) {
      if (this.motor.action !== 0) this.accion(0, 4);
      return 1;
    }
    return 0;
  }
  c884C(arg1) {
    if (arg1 === 0) {
      this.turn = 0;
      if (this.motor.action !== 9) this.accion(9, 4);
    }
    nearExp4V(this.mov, this.pts[this.f8B8] || this.mov);
    if (arg1 === 10 || arg1 === 44) this.se(180, this.mov);
    if (this.motor.isEnd !== 0) {
      if (this.motor.action !== 0) this.accion(0, 4);
      return 1;
    }
    return 0;
  }
  c8910(arg1) {
    if (arg1 === 0) {
      this.turn = 0;
      if (this.motor.action !== 10) this.accion(10, 4);
    }
    nearExp4V(this.mov, this.pts[this.f8B8] || this.mov);
    if (arg1 === 32) this.se(180, this.mov);
    if (this.motor.isEnd !== 0) {
      if (this.motor.action !== 0) this.accion(0, 4);
      return 1;
    }
    return 0;
  }
  c89C8() {
    for (let i = this.msgs.length - 1; i >= 0; i--) {
      const m = this.msgs[i];
      if (m.length < 2) continue;
      const code = m[0], a = m[1];
      switch (code) {
       case HASH.MOTION:
        if (a !== -1 && a !== 65535) this.accion(a, 4);
        break;

       case HASH.MOVE:
        this.f8B8 = a;
        if (this.motor.action !== 1) this.accion(1, 4);
        this.f948 |= 32;
        break;

       case HASH.VOICE:
        if (this.f8D0[a] > 0) {
          this.sis.vox.queue(this.f8D0[a]);
          this.log("voz", {
            i: a,
            voz: this.f8D0[a]
          });
        }
        break;

       case HASH.TURN:
        this.turn = a & 4095;
        break;

       case HASH.MODE:
        this.f944 = a;
        this.f94C = 0;
        this.log("modo", {
          modo: a
        });
        break;

       case HASH.OPERATION:
        this.f94C = 0;
        this.f948 |= 512;
        break;
      }
    }
  }
  c8B5C() {
    this.f948 &= ~7;
    if (this.motor.isEnd !== 0) this.f948 |= 4;
    if (this.f948 & 16 && this.sis.vox.fin()) this.f948 = (this.f948 | 2) & ~16;
    if (this.sis.vox.sonando()) {
      this.adjOn = true;
      this.f948 |= 16;
    }
    asentir(this.adjust[7], this.sis.boca(N.OCELOT));
    if (this.f948 & 32) {
      const q = this.pts[this.f8B8] || this.mov, d = V(q.x - this.mov.x, q.y, q.z - this.mov.z);
      this.turn = vecDir(d.x, d.z);
      if (d.length() < 128) {
        this.f948 = (this.f948 | 1) & ~32;
        if (this.motor.action !== 0) this.accion(0, 4);
      }
    }
  }
  estadoPrueba() {
    return {
      modo: this.f944,
      sub: this.f96A,
      f948: this.f948,
      accion: this.motor?.action,
      voz: this.f93C,
      punto: this.f8B8,
      mov: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      progcam: this.pc?.activo
    };
  }
  destruir() {
    if (!this.vivo) return;
    this.sis.vox.init();
    this.mando.desactivar(this);
    super.destruir();
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

class Cama {
  constructor(actor, mgr, sis) {
    this.actor = actor;
    this.mgr = mgr;
    this.sis = sis;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    this.nombre = N.CAMA;
    this.vivo = true;
    this.listo = false;
    this.blanco = false;
    this.barras = [];
    this.o = null;
    this.dePersonajes = true;
    const o = actor.opts || {}, p = nums(o.p), d = nums(o.d), v = nums(o.v);
    this.mov = V(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rot = R(d[0] ?? 0, d[1] ?? 0, d[2] ?? 0);
    this.turn = {
      ...this.rot
    };
    this.off = V(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    this.buzon = [];
    this.sostiene = false;
  }
  async iniciar() {
    const url = this.actor.modelo || "niveles/s03b/03b_o1.glb";
    const m = await cargarModelo(this.ctx, url);
    if (!this.vivo) return;
    this.o = new THREE.Group;
    this.o.add(m);
    this.o.userData.actor = this.actor;
    this.o.userData.jefe = true;
    this.mgr.mundo.add(this.o);
    this.ctx.teñir?.(m);
    this.dibujar();
  }
  recibir(v) {
    this.buzon.push(v.slice());
    return true;
  }
  cuadro() {
    const ms = this.buzon.splice(0);
    let found = false;
    for (let i = ms.length - 1; i >= 0; i--) {
      const m = ms[i];
      if (m[0] === HASH.TURN) {
        found = true;
        this.turn.x = m[1] & 4095;
      } else if (m[0] === HASH.LEAVE2) this.mov.y = 500;
    }
    nearExp4PV(this.rot, this.turn);
    this.sostiene = found;
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, this.mov.y * MM, this.mov.z * MM);
    this.o.rotation.set(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ");
  }
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
    if (this.sis.cama === this) this.sis.cama = null;
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

export class Cajas {
  constructor(actor, mgr, sis) {
    this.actor = actor;
    this.mgr = mgr;
    this.sis = sis;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    this.nombre = actor.nombre;
    this.vivo = true;
    this.listo = false;
    this.blanco = false;
    this.barras = [];
    this.o = null;
    this.dePersonajes = true;
    const o = actor.opts || {}, p = nums(o.p), d = nums(o.d);
    this.mov = V(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rot = (d[1] ?? 0) & 4095;
    this.turn = this.rot;
    this.proc = procDe(o.e);
    this.timer = 0;
    this.f104 = 0;
    this.dib = (x, D) => this.hud(x, D);
  }
  recibir() {
    return false;
  }
  async iniciar() {
    const m = await cargarModelo(this.ctx, this.actor.modelo || "niveles/s03c/4d66.glb");
    if (!this.vivo) return;
    this.o = new THREE.Group;
    this.o.add(m);
    this.o.userData.actor = this.actor;
    this.o.userData.jefe = true;
    this.mgr.mundo.add(this.o);
    this.ctx.teñir?.(m);
    this.sis.hudExtras.push(this.dib);
    this.dibujar();
  }
  cuadro() {
    if (this.timer > 0) {
      if (++this.timer >= 20) this.destruir(); else if (this.timer === 2) this.mgr.se(22, null);
      return;
    }
    this.rot = nearExp(fase(this.rot, this.turn), this.turn, 4) & 4095;
    this.turn = this.turn + 64 & 4095;
    const sn = this.sis.snake(), dx = this.mov.x - sn.x, dz = this.mov.z - sn.z;
    if (Math.hypot(dx, dz) < 500 && Math.abs(sn.y - this.mov.y) < 1e3) {
      this.timer++;
      if (this.o) this.o.visible = false;
      this.sis.log("boxall", {
        proc: this.proc
      });
      this.sis.proc(this.proc, []);
    }
  }
  primeraPersona() {
    const M = typeof window !== "undefined" ? window.__mgs : null;
    return !!(this.sis.estadoSnake() & 1) || (M?.camJuego?.primeraPersona ?? false);
  }
  hud(x) {
    const M = typeof window !== "undefined" ? window.__mgs : null, cam = M?.cam;
    if (!cam || !this.o) return;
    const q = V(this.mov.x * MM, (this.mov.y + (this.timer > 0 ? 0 : 250)) * MM, this.mov.z * MM).project(cam);
    if (q.z > 1) return;
    const cw = x.canvas.width, ch = x.canvas.height;
    x.setTransform(1, 0, 0, 1, 0, 0);
    const k = Math.max(1, Math.min(cw / 320, ch / 240)), sx = (q.x * .5 + .5) * cw, sy = (-q.y * .5 + .5) * ch;
    x.font = `${Math.round(7 * k)}px monospace`;
    x.textBaseline = "bottom";
    if (this.timer > 0) {
      const y = sy - Math.min(this.timer, 16) * k;
      x.textAlign = "center";
      x.fillStyle = "#000";
      x.fillText("SNAKE'S ITEMS", sx + k, y + k);
      x.fillStyle = "#fff";
      x.fillText("SNAKE'S ITEMS", sx, y);
      return;
    }
    if (!this.primeraPersona()) {
      this.f104 = 0;
      return;
    }
    const sn = this.sis.snake();
    if (Math.abs(sn.x - this.mov.x) >= 2e3 || Math.abs(sn.z - this.mov.z) >= 2e3) return;
    if (this.f104++ % 60 < 21) return;
    x.strokeStyle = "#fff";
    x.lineWidth = k;
    x.beginPath();
    x.moveTo(sx, sy);
    x.lineTo(sx + 16 * k, sy - 16 * k);
    x.lineTo(sx + 16 * k + x.measureText("SNAKE'S ITEMS").width + 3 * k, sy - 16 * k);
    x.stroke();
    x.textAlign = "left";
    x.fillStyle = "rgb(200,200,200)";
    x.fillText("SNAKE'S ITEMS", sx + 21 * k, sy - 17 * k);
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, this.mov.y * MM - .25, this.mov.z * MM);
    this.o.rotation.y = this.rot * ANG;
  }
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
    const i = this.sis.hudExtras.indexOf(this.dib);
    if (i >= 0) this.sis.hudExtras.splice(i, 1);
  }
}

export function crearTortura(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esTortura(actor)) return null;
  const sis = Sistema.de(J, ctx), mgr = sis.mgr;
  camEventos(sis);
  for (const j of mgr.lista.slice()) if (j.vivo && j.actor && j !== sis && (j.actor === actor || j.actor.tipo === actor.tipo && (j.nombre ?? j.actor.nombre) === actor.nombre)) j.destruir();
  const quietos = [];
  (ctx.mundo || J.ctx.mundo)?.traverse(o => {
    if (o.userData.actor === actor && !o.userData.jefe) quietos.push(o);
  });
  for (const o of quietos) o.removeFromParent();
  let p;
  if (actor.tipo === "TORTURE") p = new Tortura(actor, mgr, sis); else if (actor.tipo === "TR_OCELOT") p = new Ocelote(actor, mgr, sis); else if (actor.tipo === "TR_BED") {
    p = new Cama(actor, mgr, sis);
    sis.cama = p;
  } else {
    p = new Cajas(actor, mgr, sis);
    desvestirEnLaCelda(ctx, sis);
  }
  mgr.agregar(p);
  if (p.nombre != null) sis.receptores.push(p);
  for (const v of tomarPendientes(actor.nombre, ctx.nivel?.id)) p.recibir?.(v, {
    entrada: true
  });
  p.cargando = p.iniciar().then(() => {
    if (!p.vivo) return null;
    p.listo = true;
    actor._meryl = p;
    return p;
  }).catch(e => {
    console.warn("[tortura]", actor.tipo, e);
    p.vivo = false;
    p.destruir?.();
    for (const o of quietos) (ctx.mundo || J.ctx.mundo)?.add(o);
    return null;
  });
  return p;
}
