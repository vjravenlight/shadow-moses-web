// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { MM, ANG, ratan2, randU, randS, nearSpeed, nearExp8 } from "./base.js";

import { isqrt, rsin } from "./apoyo3.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const trunc = Math.trunc;

const SE = {
  MISIL_SALE: 186,
  MISIL_VUELA: 187,
  LASER_SALE: 182,
  LASER_ZUMBA: 183,
  CHISPAS: 59
};

const LASER_MSG = 15177, MSG_STOP = 24203, MSG_KILL = 12835;

const rotXYZ = a => (new THREE.Matrix4).makeRotationFromEuler(new THREE.Euler(a[0] * ANG, a[1] * ANG, a[2] * ANG, "XYZ"));

const rotYXZ = a => (new THREE.Matrix4).makeRotationFromEuler(new THREE.Euler(a[0] * ANG, a[1] * ANG, a[2] * ANG, "YXZ"));

const rotX = r => (new THREE.Matrix4).makeRotationX(r * ANG);

const tras = m => V(m.elements[12], m.elements[13], m.elements[14]);

const soloRot = m => (new THREE.Matrix4).extractRotation(m);

function matrizHueso(h, off = [ 0, 0, 0 ]) {
  h.updateWorldMatrix(true, false);
  const m = soloRot(h.matrixWorld), p = h.localToWorld(V(off[0] * MM, off[1] * MM, off[2] * MM)).multiplyScalar(1e3);
  m.setPosition(p);
  return m;
}

const cacheTex = new Map;

function tex(nombre) {
  if (!cacheTex.has(nombre)) {
    const t = (new THREE.TextureLoader).load(`assets/jefes/rex/${nombre}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    cacheTex.set(nombre, t);
  }
  return cacheTex.get(nombre);
}

let cuadrosHumo = null, cargandoHumo = false, circulo = null;

function texHumo(i) {
  if (cuadrosHumo) return cuadrosHumo[(i % 30 + 30) % 30];
  if (!cargandoHumo) {
    cargandoHumo = true;
    const img = new Image;
    img.onload = () => {
      const w = img.width / 8, h = img.height / 4, lista = [];
      for (let k = 0; k < 32; k++) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, (k & 7) * w, (k >> 3) * h, w, h, 0, 0, w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        lista.push(t);
      }
      cuadrosHumo = lista;
    };
    img.src = "assets/jefes/rex/humo.png";
  }
  if (!circulo) {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(220,220,220,1)");
    g.addColorStop(1, "rgba(120,120,120,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    circulo = new THREE.CanvasTexture(c);
    circulo.colorSpace = THREE.SRGBColorSpace;
  }
  return circulo;
}

function sprite(map, blending, escalaMM) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: map,
    blending: blending,
    depthWrite: false,
    transparent: true,
    color: 16777215
  }));
  s.scale.setScalar(escalaMM * MM);
  s.userData.sinColision = true;
  s.renderOrder = 4;
  return s;
}

const gris = (s, g, k = 1) => {
  const c = Math.max(0, Math.min(1, g / 128 * k));
  s.material.color.setRGB(c, c, c);
};

class Actor {
  constructor(armas, tipo) {
    this.armas = armas;
    this.rex = armas.rex;
    this.mgr = armas.mgr;
    this.vivo = true;
    this.listo = true;
    this.blanco = false;
    this.barras = [];
    this.actor = {
      tipo: tipo
    };
    this.objs = [];
  }
  agregar(o) {
    this.mgr.mundo.add(o);
    this.objs.push(o);
    return o;
  }
  cuadro() {}
  dibujar() {}
  destruir() {
    this.vivo = false;
    for (const o of this.objs) {
      o.removeFromParent();
      o.material?.dispose?.();
      o.geometry?.dispose?.();
    }
    this.objs = [];
  }
}

class Humito extends Actor {
  constructor(armas, p) {
    super(armas, "AN_RecoilSmoke");
    this.t = 0;
    this.lado = 400;
    this.g = 128;
    this.k = randU(30);
    this.s = this.agregar(sprite(texHumo(this.k), THREE.AdditiveBlending, 400));
    this.s.position.copy(p).multiplyScalar(MM);
    gris(this.s, 128, .25);
  }
  cuadro() {
    if (++this.t > 10) {
      this.destruir();
      return;
    }
    if (this.t <= 5) {
      this.lado += 100;
      this.g -= 10;
    } else {
      this.lado += 200;
      this.g -= 13;
    }
    this.s.scale.setScalar(this.lado * MM);
    this.s.material.map = texHumo(this.k + this.t);
    gris(this.s, this.g, .25);
  }
}

class Chispas extends Actor {
  constructor(armas, m, larga = false) {
    super(armas, larga ? "SPARK2" : "SPARK2L");
    this.larga = larga;
    this.t0 = tras(m);
    this.tiempo = larga ? 32 : 8;
    this.durMax = this.tiempo;
    const R = soloRot(m), n = 32;
    this.vel = [];
    this.cab = [];
    this.cola = [];
    for (let i = 0; i < n; i++) {
      const d = larga ? V(0, 0, randU(256) + 64).applyMatrix4(rotYXZ([ randS(512), randS(512), 0 ])) : V(0, 0, randU(512) + 64).applyMatrix4(rotYXZ([ randS(256), randS(256), 0 ]));
      const v = d.applyMatrix4(R);
      this.vel.push(v);
      this.cab.push(v.clone());
      this.cola.push(v.clone().multiplyScalar(.25));
    }
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 6), 3));
    this.lin = this.agregar(new THREE.LineSegments(g, new THREE.LineBasicMaterial({
      color: 16744512,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })));
    this.lin.userData.sinColision = true;
    this.lin.frustumCulled = false;
    this.primero = true;
    this.actualizar();
  }
  actualizar() {
    const a = this.lin.geometry.attributes.position.array, o = this.t0;
    for (let i = 0; i < this.cab.length; i++) {
      const c = this.cab[i], t = this.cola[i];
      a.set([ (o.x + c.x) * MM, (o.y + c.y) * MM, (o.z + c.z) * MM, (o.x + t.x) * MM, (o.y + t.y) * MM, (o.z + t.z) * MM ], i * 6);
    }
    this.lin.geometry.attributes.position.needsUpdate = true;
    const b = Math.min(255, 16 * this.tiempo + 50) / 255;
    this.lin.material.color.setRGB(b, b / 2, b / 2);
  }
  cuadro() {
    if (this.primero) {
      this.primero = false;
      this.rex.se(SE.CHISPAS, this.t0);
    }
    if (--this.tiempo <= 0) {
      this.destruir();
      return;
    }
    for (let i = 0; i < this.cab.length; i++) {
      const v = this.vel[i];
      this.cola[i].copy(this.cab[i]);
      this.cab[i].add(v);
      v.x -= trunc(v.x / 4);
      v.y = v.y - trunc(v.y / 4) - 3;
      v.z -= trunc(v.z / 4);
    }
    if (!this.larga) this.t0.y -= 16;
    this.actualizar();
  }
}

class Anillo extends Actor {
  constructor(armas, p, tam) {
    super(armas, "WINDCRCL");
    this.p = p.clone();
    this.radio = tam / 2;
    this.crece = this.onda = this.radio / 5;
    this.fase = 600;
    this.tiempo = 16;
    const n = 32, g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 6 * 3), 3));
    const uv = [];
    for (let i = 0; i < n; i++) uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    this.m = this.agregar(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: tex("anillo_polvo"),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })));
    this.m.userData.sinColision = true;
    this.m.frustumCulled = false;
    this.actualizar();
  }
  actualizar() {
    const a = this.m.geometry.attributes.position.array, n = 32, p = this.p;
    const r0 = this.radio, r1 = this.radio + this.onda * Math.cos(this.fase * ANG), h = this.onda * Math.sin(this.fase * ANG);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      const q = (r, ang, y) => [ (p.x + r * Math.sin(ang)) * MM, (p.y + y) * MM, (p.z + r * Math.cos(ang)) * MM ];
      const A = q(r0, a0, 0), B = q(r0, a1, 0), C = q(r1, a1, h), D = q(r1, a0, h);
      a.set([ ...A, ...B, ...C, ...A, ...C, ...D ], i * 18);
    }
    this.m.geometry.attributes.position.needsUpdate = true;
    const c = Math.min(1, this.tiempo * 8 / 128);
    this.m.material.color.setRGB(c, c, c);
  }
  cuadro() {
    if (--this.tiempo <= 0) {
      this.destruir();
      return;
    }
    this.radio += this.crece;
    this.crece -= trunc(this.crece / 8);
    this.fase = nearExp8(this.fase, 0);
    this.actualizar();
  }
}

class HumoNegro extends Actor {
  constructor(armas, hueso, ofs, sigue, tiempo) {
    super(armas, "MG_SMKE1");
    this.hueso = hueso;
    this.ofs = ofs;
    this.sigue = sigue;
    this.tiempo = tiempo;
    this.apagado = 80;
    this.espera = 0;
    this.idx = 0;
    this.m = matrizHueso(hueso);
    this.p = Array.from({
      length: 16
    }, () => null);
  }
  cuadro() {
    if (this.sigue && this.hueso.parent) this.m = matrizHueso(this.hueso);
    if (this.espera >= 0) this.espera--; else {
      const old = this.p[this.idx];
      if (old) old.s.removeFromParent();
      const pos = V(this.ofs[0], this.ofs[1], this.ofs[2]).applyMatrix4(this.m);
      const s = this.agregar(sprite(texHumo(randU(16)), THREE.SubtractiveBlending, 2600));
      s.position.copy(pos).multiplyScalar(MM);
      this.p[this.idx] = {
        s: s,
        pos: pos,
        vel: V(randS(16), randS(16) + 50, randS(16)),
        lado: 1300,
        vida: this.apagado,
        fog: 255,
        k: randU(16)
      };
      this.espera = 12;
      this.idx = this.idx + 1 & 15;
    }
    for (const q of this.p) {
      if (!q || q.vida <= 0) {
        if (q) q.s.visible = false;
        continue;
      }
      q.lado += 15;
      q.pos.add(q.vel);
      q.k = (q.k + 1) % 30;
      let c = Math.min(255, 2 * q.vida);
      if (q.fog > 0) {
        c = Math.max(0, c - q.fog);
        q.fog >>= 1;
      }
      q.s.position.copy(q.pos).multiplyScalar(MM);
      q.s.scale.setScalar(2 * q.lado * MM);
      q.s.material.map = texHumo(q.k);
      gris(q.s, c / 4, 2);
      q.vida--;
    }
    if (this.tiempo <= 0) {
      if (this.apagado === 0) {
        this.destruir();
        return;
      }
      this.apagado--;
    }
    this.tiempo--;
  }
}

class ChorroPie extends Actor {
  constructor(armas, hueso, ofs, dir, tiempo) {
    super(armas, "MG_SMKE2");
    this.hueso = hueso;
    this.ofs = ofs;
    this.dir = dir;
    this.tiempo = tiempo;
    this.apagado = 13;
    this.idx = 0;
    this.p = Array.from({
      length: 16
    }, () => null);
  }
  cuadro() {
    const m = matrizHueso(this.hueso), emitir = this.tiempo > 0;
    if (emitir) {
      const old = this.p[this.idx];
      if (old) old.s.removeFromParent();
      const pos = V(this.ofs[0], this.ofs[1], this.ofs[2]).applyMatrix4(m);
      const vel = V(this.dir[0], this.dir[1], this.dir[2]).applyMatrix4(soloRot(m)).add(V(randS(32), randS(32), randS(32)));
      const s = this.agregar(sprite(texHumo(randU(16)), THREE.AdditiveBlending, 2600));
      s.position.copy(pos).multiplyScalar(MM);
      this.p[this.idx] = {
        s: s,
        pos: pos,
        vel: vel,
        crece: 15,
        lado: 1300,
        vida: this.apagado,
        fog: 255,
        k: randU(16)
      };
      this.idx = this.idx + 1 & 15;
    }
    for (const q of this.p) {
      if (!q || q.vida <= 0) {
        if (q) q.s.visible = false;
        continue;
      }
      q.pos.add(q.vel);
      q.lado += q.crece;
      if (q.pos.y < 0) {
        q.pos.y = 0;
        q.vel.set(trunc(q.vel.x / 4) + randS(128), randU(32) + 1, trunc(q.vel.z / 4) + randS(128));
        q.crece = 20;
        q.pos.add(q.vel);
      }
      q.k = (q.k + 1) % 30;
      let c = Math.min(255, 64 * q.vida);
      if (q.fog > 0) {
        c = Math.max(0, c - q.fog);
        q.fog >>= 1;
      }
      q.s.position.copy(q.pos).multiplyScalar(MM);
      q.s.scale.setScalar(2 * q.lado * MM);
      q.s.material.map = texHumo(q.k);
      gris(q.s, c / 4, .25 * 2);
      q.vida--;
    }
    if (!emitir) {
      if (--this.apagado <= 0) {
        this.destruir();
        return;
      }
    }
    this.tiempo--;
  }
}

const CAJA_ALTA = {
  x: 15e3,
  y0: 4e3,
  y1: 32e3,
  z: 24e3
};

const HZD_SEG_NO_MISSILE = 8;

class MisilRex extends Actor {
  constructor(armas, m, meta, lado) {
    super(armas, "HMISSILE");
    this.lado = lado;
    this.rot = soloRot(m).multiply(rotXYZ([ randS(64), randS(64), randS(64) ]));
    this.pos = tras(m);
    this.paso = V();
    const b = typeof meta === "function" ? meta() : meta;
    this.objetivo = b ? b.clone() : this.pos.clone();
    this.vel = randU(64) + 40;
    this.giroMax = 10;
    this.fase = randU(1024);
    this.seT = -15;
    this.edad = 0;
    this.fin = -1;
    this.o = this.agregar(armas.rex.modeloMisil.clone(true));
    this.rex.ctx.teñir?.(this.o);
    this.humo = Array.from({
      length: 32
    }, () => null);
    this.humoI = 0;
    this.rex.se(SE.MISIL_SALE, this.pos);
    this.dibujarM();
  }
  dibujarM() {
    this.o.position.copy(this.pos).multiplyScalar(MM);
    this.o.quaternion.setFromRotationMatrix(this.rot);
  }
  estela(nueva) {
    for (const q of this.humo) {
      if (!q || q.vida <= 0) {
        if (q) q.s.visible = false;
        continue;
      }
      q.lado += 25;
      q.pos.add(q.vel);
      q.k = (q.k + 1) % 30;
      q.s.position.copy(q.pos).multiplyScalar(MM);
      q.s.scale.setScalar(2 * q.lado * MM);
      q.s.material.map = texHumo(q.k);
      gris(q.s, q.vida * 8, .25);
      q.vida--;
    }
    if (!nueva) return;
    const old = this.humo[this.humoI];
    if (old) old.s.removeFromParent();
    const s = this.agregar(sprite(texHumo(0), THREE.AdditiveBlending, 400));
    this.humo[this.humoI] = {
      s: s,
      pos: this.pos.clone(),
      vel: V(randS(16), randS(16), randS(16)),
      lado: 200,
      vida: 31,
      k: randU(16)
    };
    this.humoI = this.humoI + 1 & 31;
  }
  cuadro() {
    if (this.fin >= 0) {
      this.estela(false);
      if (this.fin === 0) {
        this.destruir();
        return;
      }
      this.fin--;
      return;
    }
    this.estela(true);
    const desde = this.pos.clone(), hasta = this.pos.clone().add(this.paso);
    let golpe = 0, punto = hasta;
    const dentro = Math.abs(desde.x) < CAJA_ALTA.x && desde.y > CAJA_ALTA.y0 && desde.y < CAJA_ALTA.y1 && Math.abs(desde.z) < CAJA_ALTA.z;
    if (!dentro && this.paso.lengthSq() > 0) {
      const L = this.paso.length(), h = this.mgr.pared(desde, this.paso.clone().normalize(), L, -1, HZD_SEG_NO_MISSILE);
      if (h) {
        golpe = 1;
        punto = h.punto;
      } else {
        const q = this.cortaSnake(desde, hasta);
        if (q) {
          golpe = 2;
          punto = q;
        }
      }
    }
    this.pos.copy(punto);
    this.dibujarM();
    if (golpe) {
      this.explotar(golpe);
      return;
    }
    this.paso = V(0, 0, this.vel + trunc(50 * rsin(this.fase) / 4096)).applyMatrix4(this.rot);
    this.paso.y -= 20;
    this.vel = nearSpeed(this.vel, 500, 10);
    const A = this.rex.ctx.armas || this.rex.J.ctx.armas;
    if (!(A?.chaff > 0)) this.objetivo = this.rex.snake();
    const l = this.objetivo.clone().sub(this.pos).applyMatrix4(this.rot.clone().transpose());
    let yaw = ratan2(l.x, l.z), pitch = ratan2(-l.y, Math.hypot(l.x, l.z));
    const gy = nearSpeed(0, yaw, this.giroMax), gx = nearSpeed(0, pitch, this.giroMax);
    this.rot.multiply(rotYXZ([ gx, gy, 180 ]));
    if (this.edad >= 40) this.giroMax = nearSpeed(this.giroMax, 0, 1); else if (this.edad >= 10) this.giroMax = nearSpeed(this.giroMax, 25, 4);
    this.edad++;
    if (++this.seT > 0) this.seT = -9e4; else if (this.seT === 0) this.rex.se(SE.MISIL_VUELA, this.pos);
    this.fase += 50;
  }
  cortaSnake(a, b) {
    const J = this.rex.J;
    if (J.muerto || J.sn?.inv > 0 || J.sn?.reac) return null;
    const s = this.rex.snake(), hy = [ 700, 500, 500 ][J.postura?.() ?? 0];
    const caja = new THREE.Box3(V(s.x - 300, s.y - hy, s.z - 300), V(s.x + 300, s.y + hy, s.z + 300));
    if (caja.containsPoint(a)) return a.clone();
    const d = b.clone().sub(a), L = d.length();
    if (L < 1e-6) return null;
    const q = new THREE.Ray(a, d.divideScalar(L)).intersectBox(caja, V());
    return q && q.distanceTo(a) <= L ? q : null;
  }
  explotar(golpe) {
    const A = this.rex.ctx.armas || this.rex.J.ctx.armas;
    if (A?.explosion) A.explosion(this.pos.clone().multiplyScalar(MM), 128); else this.rex.se(41, this.pos);
    if (golpe === 1) this.armas.agregar(new Anillo(this.armas, this.pos, 4e3));
    this.o.visible = false;
    this.fin = 32;
    this.rex.registro?.push?.({
      f: this.mgr.frame,
      t: "misil explota",
      golpe: golpe,
      p: [ this.pos.x | 0, this.pos.y | 0, this.pos.z | 0 ]
    });
  }
}

class TapaRex extends Actor {
  constructor(armas, m) {
    super(armas, "MG_HATCH");
    this.vel = V(0, 0, 300).applyMatrix4(soloRot(m));
    this.vel.set(trunc(this.vel.x), trunc(this.vel.y), trunc(this.vel.z));
    this.pos = tras(m);
    this.giroVel = [ randU(256), randS(256), randS(256) ];
    this.giro = [ 0, 0, 0 ];
    this.t = 0;
    this.o = this.agregar(armas.rex.modeloTapa.clone(true));
    this.rex.ctx.teñir?.(this.o);
    armas.agregar(new Chispas(armas, m, true));
    this.poner();
  }
  poner() {
    this.o.position.copy(this.pos).multiplyScalar(MM);
    this.o.rotation.set(this.giro[0] * ANG, this.giro[1] * ANG, this.giro[2] * ANG, "YXZ");
  }
  cuadro() {
    if (this.t < 6) this.armas.agregar(new Humito(this.armas, this.pos));
    this.pos.add(this.vel);
    for (let i = 0; i < 3; i++) this.giro[i] += this.giroVel[i];
    this.vel.x -= trunc(this.vel.x / 8);
    this.vel.z -= trunc(this.vel.z / 8);
    this.vel.y -= 40;
    for (let i = 0; i < 3; i++) this.giroVel[i] -= trunc(this.giroVel[i] / 16);
    if (this.pos.y < 0) {
      this.pos.y = -this.pos.y - 100;
      this.vel.y = -trunc(this.vel.y / 4);
      this.vel.x -= trunc(this.vel.x / 4);
      this.vel.z -= trunc(this.vel.z / 4);
      this.giro = [ 0, 0, 0 ];
      for (let i = 0; i < 3; i++) this.giroVel[i] -= trunc(this.giroVel[i] / 2);
      if (this.pos.y < 0) {
        this.destruir();
        return;
      }
    }
    this.poner();
    if (this.t >= 61) this.o.visible = (this.t & 1) === 1;
    if (this.t >= 81) {
      this.destruir();
      return;
    }
    this.t++;
  }
}

const LZ = {
  ofsBoca: [ 0, -500, 1800 ],
  rotBoca: [ -854, 0, 0 ],
  alcance: 3e4,
  tamBlanco: [ 100, 500, 100 ],
  filtroHzd: 14
};

class LaserRex extends Actor {
  constructor(armas, hueso, lado, daño, tiempo) {
    super(armas, "MG_LASER");
    this.hueso = hueso;
    this.lado = lado;
    this.daño = daño;
    this.tiempo = tiempo;
    this.vida = daño;
    this.seT = 10;
    this.brillo = 0;
    this.chispaI = 0;
    this.anillo = 0;
    this.pegadas = 0;
    this.origen = V();
    this.punta = V();
    this.cols = Array.from({
      length: 8
    }, () => null);
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(7 * 8 * 6 * 3), 3));
    const uv = [], col = [];
    for (let c = 0; c < 7; c++) for (let r = 0; r < 8; r++) {
      const u0 = c / 7, u1 = (c + 1) / 7, v0 = r / 8, v1 = (r + 1) / 8, k0 = .5 * Math.cos(c * 11.25 * Math.PI / 180) + .2, k1 = .5 * Math.cos((c + 1) * 11.25 * Math.PI / 180) + .2;
      uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
      col.push(k0, k0, k0, k1, k1, k1, k1, k1, k1, k0, k0, k0, k1, k1, k1, k0, k0, k0);
    }
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.cinta = this.agregar(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: tex("laser_rayo"),
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    })));
    this.cinta.userData.sinColision = true;
    this.cinta.frustumCulled = false;
    this.brilloS = this.agregar(sprite(tex("laser_brillo"), THREE.AdditiveBlending, 600));
    gris(this.brilloS, 0);
    this.chispas = Array.from({
      length: 8
    }, () => {
      const s = this.agregar(sprite(tex("laser_brillo"), THREE.AdditiveBlending, 1e3));
      s.visible = false;
      return {
        s: s,
        vida: 0
      };
    });
    this.rex.se(SE.LASER_SALE, V(0, 0, 0));
    this.quitar = this.rex.A.escuchar(LASER_MSG, v => {
      const c = v[0] & 65535;
      if (c === MSG_STOP) {
        this.tiempo = -1;
        return true;
      }
      if (c === MSG_KILL) {
        this.destruir();
        return true;
      }
      return false;
    });
  }
  matrizBoca() {
    return matrizHueso(this.hueso, LZ.ofsBoca).multiply(rotXYZ(LZ.rotBoca));
  }
  cuadro() {
    if (!this.hueso.parent && this.tiempo >= 0) this.tiempo = -1;
    if (this.tiempo >= 0) {
      const m = this.matrizBoca();
      this.origen = tras(m);
      const dir = V(0, -1, 0).applyMatrix4(soloRot(m)).normalize();
      const h = this.mgr.pared(this.origen, dir, LZ.alcance, -1, LZ.filtroHzd);
      this.punta = h ? h.punto : this.origen.clone().addScaledVector(dir, LZ.alcance);
      const q = this.cortaSnake(this.origen, this.punta), golpe = q || this.punta;
      if (this.tocaSnake(golpe)) {
        const d = this.vida;
        this.vida = 0;
        if (d > 0 && this.rex.dañarSnake(d, 2, this.origen)) {
          this.pegadas++;
          this.rex.registro?.push?.({
            f: this.mgr.frame,
            t: "láser pega",
            "daño": d
          });
        }
      }
      this.armas.agregar(new Humito(this.armas, this.punta));
      if (--this.seT === 0) {
        this.rex.se(SE.LASER_ZUMBA, this.origen);
        this.seT = 7;
      }
    }
    this.anillo = this.anillo + 7 & 7;
    this.cols[this.anillo] = [ this.punta.clone(), this.origen.clone() ];
    this.armarCinta();
    if (this.tiempo > 0) {
      this.brillo = nearSpeed(this.brillo, 128, 20);
      this.chispa(true);
    } else {
      this.brillo = trunc(this.brillo / 2);
      this.chispa(false);
    }
    this.brilloS.position.copy(this.origen).multiplyScalar(MM);
    gris(this.brilloS, this.brillo);
    this.tiempo--;
    if (this.tiempo < -8) this.destruir();
  }
  armarCinta() {
    const a = this.cinta.geometry.attributes.position.array;
    let k = 0;
    const p = (c, r) => {
      const x = this.cols[this.anillo + c & 7];
      if (!x) return null;
      return x[0].clone().lerp(x[1], r / 8).multiplyScalar(MM);
    };
    for (let c = 0; c < 7; c++) for (let r = 0; r < 8; r++) {
      const A = p(c, r), B = p(c + 1, r), C = p(c + 1, r + 1), D = p(c, r + 1);
      if (!A || !B || !C || !D) {
        a.fill(0, k, k + 18);
        k += 18;
        continue;
      }
      a.set([ A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z, A.x, A.y, A.z, C.x, C.y, C.z, D.x, D.y, D.z ], k);
      k += 18;
    }
    this.cinta.geometry.attributes.position.needsUpdate = true;
    this.cinta.visible = this.tiempo >= -8;
  }
  chispa(nueva) {
    if (nueva) {
      const c = this.chispas[this.chispaI];
      c.vida = 8;
      c.p = this.punta.clone();
      c.s.visible = true;
      this.chispaI = this.chispaI + 1 & 7;
    }
    for (const c of this.chispas) {
      if (c.vida <= 0) {
        c.s.visible = false;
        continue;
      }
      c.s.position.copy(c.p).multiplyScalar(MM);
      gris(c.s, c.vida * 255 / 8, .25);
      c.vida--;
    }
  }
  cortaSnake(a, b) {
    const J = this.rex.J;
    if (J.muerto) return null;
    const s = this.rex.snake(), hy = [ 700, 500, 500 ][J.postura?.() ?? 0] + LZ.tamBlanco[1], hx = 300 + LZ.tamBlanco[0];
    const caja = new THREE.Box3(V(s.x - hx, s.y - hy, s.z - hx), V(s.x + hx, s.y + hy, s.z + hx));
    const d = b.clone().sub(a), L = d.length();
    if (L < 1e-6) return null;
    const q = new THREE.Ray(a, d.divideScalar(L)).intersectBox(caja, V());
    return q && q.distanceTo(a) <= L ? q : null;
  }
  tocaSnake(p) {
    const s = this.rex.snake(), hy = [ 700, 500, 500 ][this.rex.J.postura?.() ?? 0];
    return Math.abs(p.x - s.x) <= 300 + LZ.tamBlanco[0] && Math.abs(p.z - s.z) <= 300 + LZ.tamBlanco[2] && Math.abs(p.y - s.y) <= hy + LZ.tamBlanco[1];
  }
  destruir() {
    this.quitar?.();
    super.destruir();
  }
}

export class ArmasRex {
  constructor(rex) {
    this.rex = rex;
    this.mgr = rex.mgr;
    this.toggle = 0;
  }
  async iniciar() {
    for (const n of [ "laser_rayo", "laser_brillo", "anillo_polvo", "humo" ]) tex(n);
  }
  agregar(a) {
    this.mgr.agregar(a);
    return a;
  }
  polvo() {
    const R = this.rex, a = R.motor.action, fr = R.motor.info1.frame;
    const chorros = t => {
      for (const p of [ R.L, R.R ]) this.agregar(new ChorroPie(this, p.huesos[7], [ 0, -2990, 500 ], [ 0, -600, 300 ], t));
    };
    if (a === 48 && fr === 59) chorros(30);
    if (a === 12 && fr === 18) chorros(8);
    if (a === 9 && fr === 24) chorros(10);
    const chispa = (p, i, r) => {
      const h = p.huesos[i];
      if (h) this.agregar(new Chispas(this, matrizHueso(h, [ 0, -2459, 907 ]).multiply(rotX(r))));
    };
    for (const [p, acc] of [ [ R.L, 13 ], [ R.R, 14 ] ]) {
      if (p.motor.action !== acc) continue;
      if (p.motor.info1.frame >= 25) {
        this.toggle = this.toggle + 1 & 1;
        chispa(p, this.toggle ? 10 : 12, -200);
      }
      if (R.atkT === 25) {
        chispa(p, 10, -800);
        chispa(p, 12, -800);
      }
    }
  }
  humo1(hueso, off, sigue, tiempo) {
    return this.agregar(new HumoNegro(this, hueso, off, !!sigue, tiempo));
  }
  anillo(hueso, tam) {
    const p = hueso.localToWorld(V()).multiplyScalar(1e3);
    p.y = 0;
    return this.agregar(new Anillo(this, p, tam));
  }
  fundido(cuadros) {
    const hud = this.mgr.hud;
    this.mgr.fx.push({
      t: 0,
      dur: cuadros,
      fn: t => {
        hud.blanco = Math.max(0, 1 - t / cuadros);
      },
      fin: () => {
        hud.blanco = 0;
      }
    });
  }
  laser(hueso, lado, daño, tiempo) {
    return this.agregar(new LaserRex(this, hueso, lado, daño, tiempo));
  }
  tapa(m) {
    return this.agregar(new TapaRex(this, m));
  }
  misil(m, meta, lado) {
    return this.agregar(new MisilRex(this, m, meta, lado));
  }
  destruir() {}
}
