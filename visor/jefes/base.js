// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { sonido } from "../juego.js";

import { barraMenu, disposicionHud } from "../hud.js";

import { cargadorCompartido, texturaCompartida } from "../cargador.js";

export const MM = .001, FPS = 30, ANG = Math.PI * 2 / 4096;

const ALT_SNAKE = [ 1100, 496, 136 ];

export const ratan2 = (y, x) => Math.round(Math.atan2(y, x) / ANG);

export const dir4096 = (dx, dz) => ratan2(dx, dz) & 4095;

export const difS = (a, b) => {
  const d = ((a - b) % 4096 + 4096) % 4096;
  return d > 2048 ? d - 4096 : d;
};

export const fase = (from, to) => {
  let d = from - to & 4095;
  if (d > 2048) d -= 4096;
  return to + d;
};

export const randU = n => Math.floor(Math.random() * 32767) % n;

export const randS = n => Math.floor(Math.random() * 32767) % (2 * n) - n;

const trunc = Math.trunc;

export function nearExp(from, to, k) {
  const d = to - from;
  if (d > -k && d < k) return to;
  return from + trunc(d / k);
}

export const nearExp2 = (a, b) => nearExp(a, b, 2), nearExp4 = (a, b) => nearExp(a, b, 4), nearExp8 = (a, b) => nearExp(a, b, 8);

export const nearExp4P = (a, b) => nearExp(fase(a, b), b, 4);

export function nearSpeed(from, to, v) {
  if (from < to) {
    const n = from + v;
    return n >= to ? to : n;
  }
  const n = from - v;
  return n <= to ? to : n;
}

const TIME_INV = [ 0, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256 ];

export function nearTimeP(from, to, interp) {
  const f = fase(from, to), k = TIME_INV[Math.min(15, interp)];
  return interp === 0 ? to : trunc((to - f) * k / 4096) + f;
}

export const longXZ = v => Math.round(Math.hypot(v.x, v.z));

export const long3 = v => Math.round(Math.hypot(v.x, v.y, v.z));

export function rotY(ang, v) {
  const a = ang * ANG, c = Math.cos(a), s = Math.sin(a);
  return {
    x: v.x * c + v.z * s,
    y: v.y,
    z: -v.x * s + v.z * c
  };
}

export class Motor {
  constructor(datos, nHuesos) {
    this.datos = datos;
    this.claves = Object.keys(datos.clips);
    this.n = nHuesos;
    this.rots = Array.from({
      length: nHuesos
    }, () => [ 0, 0, 0 ]);
    this.altura = 0;
    this.interp = 0;
    this.paso = [ 0, 0 ];
    const info = mask => ({
      accion: 0,
      anim: -1,
      frame: 0,
      quedan: 0,
      f14: 0,
      mask: mask,
      time: 0
    });
    this.info1 = info(0);
    this.info2 = info(-1);
    this.action = 0;
    this.action2 = 0;
    this.isEnd = 0;
    this.time2 = 0;
  }
  clip(i) {
    return this.datos.clips[this.claves[i]];
  }
  largo(i) {
    return this.clip(i)?.cuadros || 0;
  }
  begin(info, a) {
    info.anim = a;
    info.frame = 0;
    info.quedan = this.largo(a);
  }
  config(info, a) {
    this.begin(info, a);
    info.f14 = info.quedan === 1 ? 2 : 1;
    info.accion = a;
  }
  accion(a, interp) {
    this.config(this.info1, a);
    this.action = a;
    this.isEnd = 0;
    this.interp = interp;
  }
  override(a, interp, mask) {
    mask |= 0;
    if (mask !== 0) this.config(this.info2, a); else {
      this.info2.f14 = 0;
      if (!this.info1.f14) this.info1.f14 = 2;
    }
    this.action2 = a;
    this.time2 = 0;
    this.interp = interp;
    this.info1.mask = mask;
    this.info2.mask = ~mask;
  }
  siguiente(info) {
    if (info.quedan === 0) return -1;
    info.frame++;
    const c = this.clip(info.anim);
    if (!c) {
      info.quedan = 0;
      return -1;
    }
    const k = Math.min(info.frame - 1, c.cuadros - 1), delta = trunc(4096 / (this.interp + 1)), n = this.n;
    if (!(info.mask & 1)) {
      this.paso = [ c.paso[k * 2] || 0, c.paso[k * 2 + 1] || 0 ];
      this.altura += trunc((c.altura[k] - this.altura) * delta / 4096);
    }
    let ret = info.quedan === 1 ? -1 : 0, flags = info.mask;
    for (let j = 0; j < n; j++, flags >>= 1) {
      if (flags & 1) continue;
      const o = (k * n + j) * 3, r = this.rots[j];
      for (let e = 0; e < 3; e++) {
        const d = difS(c.rot[o + e], r[e]);
        r[e] = r[e] + trunc(d * delta / 4096) & 4095;
      }
    }
    if (--info.quedan === 1) ret = 1;
    return ret;
  }
  tick() {
    this.paso = [ 0, 0 ];
    for (const info of [ this.info1, this.info2 ]) {
      if (info.f14 === 0) continue;
      let t = this.siguiente(info);
      if (t === -1) {
        if (info.f14 & 1) this.begin(info, info.accion);
        if (info.f14 & 2) {
          if (this.interp !== 0) this.begin(info, info.accion); else {
            info.f14 = 0;
            if (info === this.info2 && this.info1.f14 === 0) this.info1.f14 = 2;
          }
        }
        t = 0;
      }
      info.time = t;
    }
    this.isEnd = this.info1.time;
    this.time2 = this.info2.time;
    if (this.interp) this.interp--;
  }
}

const _e = new THREE.Euler, _q = new THREE.Quaternion, _qa = new THREE.Quaternion, _inv = new THREE.Quaternion;

const _qx = new THREE.Quaternion, _qy = new THREE.Quaternion, _qz = new THREE.Quaternion;

const EJE_X = new THREE.Vector3(1, 0, 0), EJE_Y = new THREE.Vector3(0, 1, 0), EJE_Z = new THREE.Vector3(0, 0, 1);

export function aplicarPose(huesos, padres, rots, adjust, raizY) {
  const qm = [];
  for (let j = 0; j < huesos.length; j++) {
    const h = huesos[j];
    if (!h) {
      qm.push(new THREE.Quaternion);
      continue;
    }
    const r = rots[j];
    _e.set(r[0] * ANG, r[1] * ANG, r[2] * ANG, "ZYX");
    _q.setFromEuler(_e);
    const p = padres[j], Q = p >= 0 ? qm[p].clone().multiply(_q) : _q.clone();
    const a = adjust?.[j];
    if (a && (a[0] || a[1] || a[2])) {
      _qz.setFromAxisAngle(EJE_Z, a[2] * ANG);
      _qx.setFromAxisAngle(EJE_X, a[0] * ANG);
      _qy.setFromAxisAngle(EJE_Y, a[1] * ANG);
      _qa.copy(_qy).multiply(_qx).multiply(_qz);
      Q.premultiply(_qa);
    }
    qm.push(Q);
    if (p >= 0) h.quaternion.copy(_inv.copy(qm[p]).invert().multiply(Q)); else h.quaternion.copy(Q);
  }
  if (huesos[0] && raizY != null) huesos[0].position.y = raizY;
}

const cacheAnim = new Map;

export function cargarAnim(nombre) {
  if (!cacheAnim.has(nombre)) cacheAnim.set(nombre, fetch(`assets/anim/${nombre}.json`).then(r => r.json()));
  return cacheAnim.get(nombre);
}

let _gltf = null;

async function cargarGlb(url) {
  const comp = cargadorCompartido();
  if (comp) return comp(url);
  if (!_gltf) {
    const [{GLTFLoader: GLTFLoader}, SU] = await Promise.all([ import("three/addons/loaders/GLTFLoader.js"), import("three/addons/utils/SkeletonUtils.js") ]);
    _gltf = {
      loader: new GLTFLoader,
      SU: SU
    };
  }
  const g = await _gltf.loader.loadAsync("assets/" + url);
  return _gltf.SU.clone(g.scene);
}

export async function cargarModelo(ctx, url) {
  const o = ctx.cargar ? await ctx.cargar(url) : await cargarGlb(url);
  o.traverse(m => {
    if (m.isMesh) {
      m.userData.sinColision = true;
      m.frustumCulled = false;
    }
  });
  return o;
}

const texCache = {};

function texturaPng(url) {
  if (!texCache[url]) texCache[url] = texturaCompartida(url, {
    colorSpace: THREE.SRGBColorSpace,
    mag: THREE.NearestFilter
  });
  return texCache[url];
}

let texChispa = null;

function texturaChispa() {
  if (texChispa) return texChispa;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,220,1)");
  g.addColorStop(.4, "rgba(255,200,80,0.8)");
  g.addColorStop(1, "rgba(255,120,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  texChispa = new THREE.CanvasTexture(c);
  texChispa.colorSpace = THREE.SRGBColorSpace;
  return texChispa;
}

export class Jefe {
  constructor(actor, mgr) {
    this.actor = actor;
    this.mgr = mgr;
    this.ctx = mgr.ctx;
    this.J = mgr.J;
    this.opts = actor.opts || {};
    this.vivo = true;
    this.listo = false;
    this.o = null;
    this.blanco = false;
    this.golpes = [];
    this.mov = new THREE.Vector3;
    this.rot = 0;
    this.turn = 0;
    this.interpCtrl = 0;
    this.adjust = null;
    this.radio = .33;
    this.alto = 1.85;
    this.barras = [];
    this.efectos = [];
  }
  opt(k, d) {
    const v = this.opts[k];
    return Array.isArray(v) && typeof v[0] === "number" ? v[0] : d;
  }
  procId(k) {
    const v = this.opts[k];
    return Array.isArray(v) && v[0] && typeof v[0] === "object" && "proc" in v[0] ? v[0].proc : 0;
  }
  async cargarCuerpo(glb, anim) {
    const [o, datos] = await Promise.all([ cargarModelo(this.ctx, glb), cargarAnim(anim) ]);
    return this.montarCuerpo(o, datos);
  }
  montarCuerpo(o, datos, teñir = true) {
    this.modelo = o;
    this.datos = datos;
    this.o = new THREE.Group;
    this.o.name = "jefe_" + this.actor.tipo;
    this.o.add(o);
    this.huesos = [];
    for (let i = 0; i < datos.huesos; i++) this.huesos.push(o.getObjectByName("hueso_" + i));
    this.padres = this.huesos.map(h => {
      const p = h?.parent?.name;
      const m = /^hueso_(\d+)$/.exec(p || "");
      return m ? +m[1] : -1;
    });
    this.motor = new Motor(datos, datos.huesos);
    this.adjust = Array.from({
      length: datos.huesos
    }, () => [ 0, 0, 0 ]);
    this.mgr.mundo.add(this.o);
    if (teñir) this.ctx.teñir?.(o);
    this.o.traverse(m => {
      if (m.isMesh) m.castShadow = true;
    });
    return o;
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, (this.piso ?? 0) * MM, this.mov.z * MM);
    this.o.rotation.y = this.rot * ANG;
    if (this.motor) aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.motor.altura * MM);
  }
  apoyar() {
    const h = this.J.alturaPiso?.(this.mov.x * MM, this.mov.z * MM, (this.piso ?? 0) * MM + .5);
    this.piso = h == null ? this.piso ?? 0 : Math.round(h * 1e3);
    this.mov.y = this.piso + this.motor.altura;
  }
  control(paso) {
    this.mov.x += paso.x;
    this.mov.z += paso.z;
    if (this.interpCtrl === 0) this.rot = nearExp4P(this.rot, this.turn) & 4095; else {
      this.rot = nearTimeP(this.rot, this.turn, this.interpCtrl) & 4095;
      this.interpCtrl--;
    }
    this.apoyar();
  }
  puntoHueso(i, off = {
    x: 0,
    y: 0,
    z: 0
  }) {
    const h = this.huesos[i];
    if (!h) return this.o.position.clone();
    this.o.updateMatrixWorld(true);
    return new THREE.Vector3(off.x * MM, off.y * MM, off.z * MM).applyMatrix4(h.matrixWorld);
  }
  ejeHueso(i, eje) {
    const h = this.huesos[i];
    const q = new THREE.Quaternion;
    h.getWorldQuaternion(q);
    return eje.clone().applyQuaternion(q).normalize();
  }
  recibirGolpe(cuanto, modo, origen) {
    if (this.blanco && this.vivo && !origen.aturdidora) this.golpes.push({
      cuanto: cuanto,
      modo: modo,
      explosion: origen.explosion,
      frame: this.mgr.frame
    });
  }
  "tomarDaño"() {
    if (!this.golpes.length) return null;
    const g = this.golpes.splice(0);
    const exp = g.find(x => x.explosion);
    if (exp) return {
      a_mode: 2,
      "daño": g.filter(x => x.explosion && x.modo === 1).reduce((s, x) => s + x.cuanto, 0),
      explosion: exp.explosion
    };
    const bala = g.find(x => x.modo === 1);
    if (bala) return {
      a_mode: 1,
      "daño": g.filter(x => x.modo === 1).reduce((s, x) => s + x.cuanto, 0)
    };
    if (g.some(x => x.modo === 4)) return {
      a_mode: 4,
      "daño": 0
    };
    if (g.some(x => x.modo === 3)) return {
      a_mode: 3,
      "daño": 0
    };
    return null;
  }
  snake() {
    const r = this.J.ctx.rig.position, p = this.J.postura?.() ?? 0;
    return new THREE.Vector3(Math.round(r.x * 1e3), Math.round(r.y * 1e3) + ALT_SNAKE[p], Math.round(r.z * 1e3));
  }
  dificultad() {
    const d = (this.ctx.dificultad || this.J.ctx.dificultad)?.() ?? 2;
    return d - 1;
  }
  gameOverTimer() {
    return this.mgr.gameOverTimer();
  }
  se(id, pos = null, modo = null) {
    this.mgr.se(id, pos ? pos.clone().multiplyScalar(MM) : null, modo);
  }
  se2(id) {
    this.mgr.se(id, null, null);
  }
  chispa(p, escala = .35, cuadros = 4, color = 16777215) {
    this.mgr.chispa(p, escala, cuadros, color);
  }
  sangre(p) {
    for (let i = 0; i < 4; i++) {
      const q = p.clone();
      q.x += (Math.random() - .5) * .15;
      q.y += (Math.random() - .5) * .15;
      q.z += (Math.random() - .5) * .15;
      this.chispa(q, .12, 8, 11141120);
    }
  }
  marca(texto = "!") {
    if (!this.o) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaPng(`assets/hud/${texto === "!" ? "b_mark" : "q_mark"}.png`),
      color: 16726570,
      depthTest: false,
      transparent: true
    }));
    s.scale.set(.5, .5, 1);
    s.renderOrder = 999;
    s.position.y = 2.25;
    this.o.add(s);
    this.mgr.fx.push({
      t: 0,
      dur: 30,
      fn: () => {},
      fin: () => {
        s.removeFromParent();
        s.material.dispose();
      }
    });
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
          return j.o;
        },
        get accion() {
          return j.blanco ? "jefe" : "muerto";
        },
        get vital() {
          return j.vitalBlanco?.() ?? 1;
        },
        get rot() {
          return j.rot;
        },
        set vital(v) {}
      };
    }
    return this._proxy;
  }
  cuadro() {}
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
    this.blanco = false;
  }
}

const PASO_BALA = 750, LARGO_BALA = 10740;

const _caja = new THREE.Box3, _rayo = new THREE.Ray, _q3 = new THREE.Vector3;

export class Balas {
  constructor(mgr) {
    this.mgr = mgr;
    this.lista = [];
    this.ray = new THREE.Raycaster;
    this.usadas = 0;
  }
  nueva(origen, dir, rebotes, daño, op = {}) {
    const largo = op.largo || LARGO_BALA, vel = op.vel || PASO_BALA;
    const hit = this.mgr.paredBala(origen, dir, largo);
    const b = {
      pos: origen.clone(),
      start: origen.clone(),
      dir: dir.clone().normalize(),
      rebotes: rebotes,
      "daño": daño,
      hitlen: hit ? hit.dist : largo,
      vel: vel,
      endpos: hit ? hit.punto : origen.clone().addScaledVector(dir, largo),
      normal: hit?.normal || null,
      wallflag: hit ? 1 : 0,
      hitflag: 0,
      estado: 0
    };
    const o = (new THREE.Vector3).copy(b.pos).multiplyScalar(MM);
    b.mesh = this.mgr.J.ctx.balaVisual?.(o, b.dir) || null;
    this.lista.push(b);
    return b;
  }
  cuadro() {
    const J = this.mgr.J, rig = J.ctx.rig.position;
    for (const b of this.lista.slice()) {
      if (!b.hitflag) {
        const sig = b.pos.clone().addScaledVector(b.dir, b.vel || PASO_BALA);
        let pega = false;
        if (this.mgr.gameOverTimer() === 0 && !J.ctx.vuelo?.() && !J.muerto && J.activo !== false) {
          const post = J.postura?.() ?? 0, cy = rig.y + ALT_SNAKE[post] * MM, hy = [ .7, .5, .5 ][post];
          _caja.min.set(rig.x - .3, cy - hy, rig.z - .3);
          _caja.max.set(rig.x + .3, cy + hy, rig.z + .3);
          const p0 = b.pos.clone().multiplyScalar(MM);
          _rayo.set(p0, b.dir);
          const q = _rayo.intersectBox(_caja, _q3);
          if (q && q.distanceTo(p0) <= (b.vel || PASO_BALA) * MM) {
            pega = true;
            b.pos.copy(q).multiplyScalar(1e3);
            b.hitlen = 0;
            b.wallflag = 2;
            J.vida -= J.ctx.inventario ? J.ctx.inventario.dañoBala(b.daño) / J.ctx.inventario.vidaMax : b.daño / 256;
            J.ctx.daño?.();
            sonido("daño");
            this.mgr.alDañarSnake?.(b.daño);
          }
        }
        if (!pega) b.pos.copy(sig);
        if (b.mesh) {
          b.mesh.position.copy(b.pos).multiplyScalar(MM);
          b.mesh.lookAt(b.mesh.position.clone().add(b.dir));
        }
        if (b.pos.distanceTo(b.start) >= b.hitlen) {
          if (b.wallflag === 1) {
            const d = b.dir.clone(), n = b.normal.clone().normalize(), r = d.sub(n.multiplyScalar(2 * b.dir.dot(n))).normalize();
            this.mgr.chispa(b.endpos.clone().multiplyScalar(MM));
            if (b.rebotes > 0) {
              this.rebotes = (this.rebotes || 0) + 1;
              this.nueva(b.endpos.clone().addScaledVector(r, 1), r, b.rebotes - 1, b.daño);
              this.mgr.se(176, b.endpos.clone().multiplyScalar(MM), "bomba");
            } else {
              this.usadas++;
              this.mgr.se(40, b.endpos.clone().multiplyScalar(MM), "bomba");
            }
          }
          b.hitflag = 1;
          b.estado = 0;
        }
      } else {
        if (b.estado === 0) b.mesh?.removeFromParent();
        if (b.estado > 2) {
          this.lista.splice(this.lista.indexOf(b), 1);
          continue;
        }
        b.estado++;
      }
    }
  }
  destruir() {
    for (const b of this.lista) b.mesh?.removeFromParent();
    this.lista = [];
  }
}

export class Flujo {
  constructor(op = {}) {
    this.op = op;
    this.estado = -1;
    this.src = null;
    this.pedido = 0;
    this.listo = null;
    this.codigo = -1;
    this.log = [];
    this.resto = 0;
    this.dur = new Map;
  }
  async precargar(ids) {
    await Promise.all(ids.filter(i => i >= 0).map(id => fetch(`assets/codec/vox/${id}.json`).then(r => r.ok ? r.json() : null).then(d => {
      if (d) this.dur.set(id, d);
    }).catch(() => {})));
  }
  tick() {
    if (this.op.simulado && this.estado === 2 && --this.resto <= 0) {
      this.estado = -1;
      this.op.alCallar?.();
    }
  }
  audio() {
    if (this.op.voces?.ctx) return {
      ctx: this.op.voces.ctx(),
      salida: this.op.voces.salida
    };
    if (!Flujo._ctx) {
      Flujo._ctx = new (window.AudioContext || window.webkitAudioContext);
    }
    return {
      ctx: Flujo._ctx,
      salida: Flujo._ctx.destination
    };
  }
  async cargar(id) {
    if (this.op.voces?.cargar) return this.op.voces.cargar(id);
    try {
      const [dj, ab] = await Promise.all([ fetch(`assets/codec/vox/${id}.json`).then(r => r.ok ? r.json() : null), fetch(`assets/codec/vox/${id}.m4a`).then(r => r.ok ? r.arrayBuffer() : null) ]);
      if (!dj || !ab) return null;
      const buf = await this.audio().ctx.decodeAudioData(ab);
      const sobra = buf.length - dj.muestras * buf.sampleRate / dj.hz_m4a, priming = 1024 * buf.sampleRate / dj.hz_m4a;
      return {
        datos: dj,
        buffer: buf,
        offset: sobra >= priming * .9 ? 1024 / dj.hz_m4a : 0
      };
    } catch (e) {
      return null;
    }
  }
  vox(id) {
    this.parar();
    const n = ++this.pedido;
    this.estado = 0;
    this.codigo = id;
    if (this.op.simulado) {
      this.listo = {
        datos: this.dur.get(id) || null,
        buffer: null
      };
      this.estado = 1;
      return;
    }
    this.cargar(id).then(r => {
      if (n !== this.pedido) return;
      this.listo = r || {
        datos: null,
        buffer: null
      };
      this.estado = 1;
    });
  }
  empezar() {
    if (this.estado !== 1 || !this.listo) return;
    const r = this.listo;
    this.log.push(this.codigo);
    this.op.alHablar?.(this.codigo, r.datos);
    if (this.op.simulado || !r.buffer) {
      this.estado = 2;
      this.t0 = performance.now() / 1e3;
      this.resto = Math.max(1, Math.round((r.datos?.seg ?? 0) * 30));
      if (!this.op.simulado) {
        const n = this.pedido;
        setTimeout(() => {
          if (n === this.pedido && this.estado === 2) {
            this.estado = -1;
            this.op.alCallar?.();
          }
        }, (r.datos?.seg ?? 0) * 1e3);
      }
      return;
    }
    const {ctx: ctx, salida: salida} = this.audio();
    const s = ctx.createBufferSource();
    s.buffer = r.buffer;
    s.connect(salida || ctx.destination);
    s.onended = () => {
      if (this.src === s) {
        this.src = null;
        this.estado = -1;
        this.op.alCallar?.();
      }
    };
    this.src = s;
    this.estado = 2;
    this.t0 = ctx.currentTime;
    try {
      s.start(ctx.currentTime, r.offset);
    } catch {}
    if (ctx.state !== "running") {
      const n = this.pedido;
      setTimeout(() => {
        if (n === this.pedido && this.src === s) {
          this.src = null;
          this.estado = -1;
          this.op.alCallar?.();
        }
      }, r.buffer.duration * 1e3);
    }
  }
  parar() {
    ++this.pedido;
    try {
      this.src?.stop();
    } catch {}
    if (this.estado === 2) this.op.alCallar?.();
    this.src = null;
    this.estado = -1;
    this.listo = null;
    this.resto = 0;
  }
  segundos() {
    if (this.estado !== 2) return 0;
    if (this.op.simulado) return ((this.listo?.datos?.seg ?? 0) * 30 - this.resto) / 30;
    return this.src ? this.audio().ctx.currentTime - this.t0 : performance.now() / 1e3 - this.t0;
  }
}

export class VoiceSys {
  constructor(lista, flujo) {
    this.f = flujo;
    const v = (lista || []).filter(x => typeof x === "number");
    this.g = {
      flags: 0,
      voxCode1: 0,
      field_8: 5,
      field_C: 0,
      index1: 0,
      voxCode2: -1,
      field_18: 0,
      index2: 0,
      voxCode3: 0,
      field_24: 0,
      field_28: 0,
      voxCodes: []
    };
    this.g.voxCodes = v.slice(0, 32);
    if (this.g.voxCodes.length < 32) this.g.voxCodes.push(-1);
    flujo.parar();
    this.CE58C(0);
  }
  code(i) {
    const c = this.g.voxCodes[i];
    return c === undefined ? -1 : c;
  }
  CE2D0() {
    if (this.g.field_28 === 0) this.g.field_C++;
  }
  CE300() {
    this.g.field_24 = 1;
  }
  CE310() {
    this.g.field_24 = 2;
  }
  CE58C(i) {
    const g = this.g, st = this.f.estado;
    if (g.field_28 === 0) {
      g.field_C = 0;
      g.index1 = i;
      g.voxCode2 = this.code(i);
      if (st !== 2) this.f.parar();
    }
  }
  CE5F8(i, n) {
    const g = this.g, st = this.f.estado;
    if (g.field_28 === 0) {
      g.index2 = i;
      g.voxCode3 = this.code(i);
      g.field_18 = n;
      if (st !== 2) {
        this.f.parar();
        g.field_8 = 5;
      }
      g.flags |= 2;
    }
  }
  CE694() {
    return (this.g.flags & 2) > 0;
  }
  CE734() {
    if (this.g.field_28 === 0) this.g.field_28 = 1;
  }
  cuadro(gameOverTimer = 0, pausa = false) {
    if (gameOverTimer > 0) {
      this.gameOver = true;
      return;
    }
    if (this.gameOver) return;
    this.f.tick();
    const g = this.g;
    if (g.field_8 !== 0) {
      g.field_8--;
      return;
    }
    const st = this.f.estado;
    switch (st) {
     case 0:
      if (g.field_24 === 2) {
        this.f.parar();
        g.field_8 = 1;
      }
      break;

     case 1:
      if (!pausa) {
        if (g.field_24 === 2) {
          this.f.parar();
          g.field_8 = 0;
        }
        if (!(g.flags & 2)) {
          if (g.field_C !== 0) {
            g.field_C--;
            this.f.empezar();
            g.voxCode1 = -1;
          }
        } else if (g.field_18 !== 0) {
          g.field_18--;
          this.f.empezar();
        }
        g.field_24 = 0;
      }
      return;

     case 2:
      if (g.field_24 !== 0) {
        this.f.parar();
        g.field_8 = 5;
      } else if (g.field_28 === 1) g.field_28 = 2;
      break;

     default:
      if (g.field_28 !== 2) {
        if (!(g.flags & 2)) {
          const vc = g.voxCode2;
          if (vc !== -1) {
            this.f.vox(vc);
            g.voxCode1 = vc;
            if (!(g.flags & 1)) g.voxCode2 = this.code(++g.index1);
          }
        } else if (g.field_18 <= 0) {
          const vc = g.voxCode1;
          g.flags &= ~2;
          if (vc !== -1) this.f.vox(vc);
        } else {
          const vc = g.voxCode3;
          if (vc !== -1) {
            this.f.vox(vc);
            g.voxCode3 = this.code(++g.index2);
          }
        }
      }
      break;
    }
    g.field_24 = 0;
  }
  destruir() {
    this.f.parar();
  }
}

const W0 = 320, H0 = 240;

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

export class HudJefes {
  constructor() {
    this.cv = document.createElement("canvas");
    this.cv.id = "jefescv";
    Object.assign(this.cv.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "4",
      imageRendering: "pixelated"
    });
    (document.getElementById("hud") || document.body).appendChild(this.cv);
    this.x = this.cv.getContext("2d");
    this.tactil = matchMedia("(pointer: coarse)").matches;
    this.img = {};
    Promise.all([ "assets/hud/fuente.png", "assets/jefes/tama_01.png", "assets/jefes/tama_02.png", "assets/jefes/tama_03.png" ].map(cargarImg)).then(([f, t1, t2, t3]) => {
      if (f) {
        const c = document.createElement("canvas");
        c.width = f.width;
        c.height = f.height;
        const x = c.getContext("2d");
        x.drawImage(f, 0, 0);
        x.globalCompositeOperation = "source-in";
        x.fillStyle = "#fff";
        x.fillRect(0, 0, c.width, c.height);
        this.img.fuente = c;
      }
      this.img.tama = [ t1, t2, t3 ];
    });
    this.sub = null;
    this.negro = 0;
    this.oculto = false;
    this.cine = 0;
    this.blanco = 0;
  }
  texto(x, X, Y, s) {
    const f = this.img.fuente;
    if (!f) return X + s.length * 8;
    for (const ch of s.toUpperCase()) {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) x.drawImage(f, (c - 65) * 8, 0, 8, 6, X, Y, 8, 6); else if (c >= 48 && c <= 57) x.drawImage(f, (c - 48) * 8, 6, 8, 6, X, Y, 8, 6);
      X += ch === "I" ? 4 : ch === " " ? 5 : 8;
    }
    return X;
  }
  barra(x, X, Y, rest, now, max, conf) {
    const h = 5 - (conf.alto || 0), ancho = Math.floor(max / 8), y1 = Y + 1;
    rest = Math.min(rest, max);
    x.fillStyle = "rgba(0,24,24,0.5)";
    x.fillRect(X, y1, ancho, h);
    if (rest > now) {
      x.fillStyle = "rgb(200,0,0)";
      x.fillRect(X + Math.floor(now / 8), y1, Math.floor((rest - now) / 8), h);
    }
    const w = Math.floor((now + 7) / 8);
    if (w > 0) {
      const L = conf.izq, R = conf.der, fin = L.map((v, i) => Math.round(v + (R[i] - v) * w / 128));
      const g = x.createLinearGradient(X, 0, X + w, 0);
      g.addColorStop(0, `rgb(${L})`);
      g.addColorStop(1, `rgb(${fin})`);
      x.fillStyle = g;
      x.fillRect(X, y1, w, h);
    }
    x.fillStyle = "#000";
    x.fillRect(X - 1, Y, 1, h + 2);
    x.fillRect(X, Y, ancho, 1);
    x.fillRect(X, Y + h + 1, ancho, 1);
    x.fillRect(X + ancho, Y, 1, h + 2);
    const tx = X + 4, ty = Y + 4, fin = this.texto({
      drawImage() {}
    }, tx, ty, conf.nombre);
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(tx - 1, ty - 1, fin - tx + 2, 7);
    this.texto(x, tx, ty, conf.nombre);
  }
  dibujar(jefes, mostrarBarras = true) {
    const cv = this.cv, iw = innerWidth, ih = innerHeight;
    if (cv.width !== iw || cv.height !== ih) {
      cv.width = iw;
      cv.height = ih;
    }
    const x = this.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, iw, ih);
    if (this.negro > 0) {
      x.fillStyle = `rgba(0,0,0,${Math.min(1, this.negro)})`;
      x.fillRect(0, 0, iw, ih);
    }
    if (this.blanco > 0) {
      x.fillStyle = `rgba(255,255,255,${Math.min(1, this.blanco)})`;
      x.fillRect(0, 0, iw, ih);
    }
    if (this.cine > 0) {
      const h = Math.round(ih / 8 * Math.min(1, this.cine));
      x.fillStyle = "#000";
      x.fillRect(0, 0, iw, h);
      x.fillRect(0, ih - h, iw, h);
    }
    if (this.oculto) return;
    const s = Math.max(1, Math.min(iw / W0, ih / H0)) * (this.tactil ? 1.25 : 1);
    const D = disposicionHud();
    x.imageSmoothingEnabled = false;
    x.setTransform(D.kcss, 0, 0, D.kcss, D.origenJefes?.[0] ?? 0, D.origenJefes?.[1] ?? 0);
    if (mostrarBarras) for (const j of jefes) for (const b of j.barras) {
      if (b.visible === false) continue;
      barraMenu(x, 16, b.y, b.rest, b.now, b.max, b.conf);
      D.jefeHasta = performance.now() + 250;
      b.extra?.(x, this);
    }
    if (this.sub) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.font = `${Math.round(9 * s)}px monospace`;
      x.textAlign = "center";
      x.textBaseline = "bottom";
      x.lineWidth = Math.max(2, s);
      x.strokeStyle = "#000";
      x.fillStyle = "#fff";
      x.strokeText(this.sub, iw / 2, ih - 24 * s);
      x.fillText(this.sub, iw / 2, ih - 24 * s);
    }
  }
  destruir() {
    this.cv.remove();
  }
}

export class Jefes {
  static de(J, ctx = {}) {
    if (!J.__jefes) J.__jefes = new Jefes(J, ctx); else Object.assign(J.__jefes.ctx, ctx);
    return J.__jefes;
  }
  constructor(J, ctx) {
    this.J = J;
    this.ctx = ctx;
    this.lista = [];
    this.frame = 0;
    this.fx = [];
    this.voicesys = null;
    this.mundo = ctx.mundo || J.ctx.mundo;
    this.balas = new Balas(this);
    this.hud = new HudJefes;
    this.stun = false;
    this.stunSig = false;
    this.explosionActual = null;
    this.aturdiendo = false;
    this.timerGO = 0;
    this.mostrarBarras = true;
    this.congelado = null;
    this.prepararParedes();
    this.instalar();
  }
  instalar() {
    const J = this.J, m = this;
    const cuadro = J.cuadro.bind(J), activos = J.activos.bind(J), dañar = J.dañar.bind(J), destruir = J.destruir.bind(J);
    this.enCuadro = false;
    J.cuadro = () => {
      m.enCuadro = true;
      try {
        cuadro();
      } finally {
        m.enCuadro = false;
      }
      m.cuadro();
    };
    J.activos = () => m.sinJefes || m.enCuadro && !m.enSnake ? activos() : activos().concat(m.blancos());
    if (typeof J.cuadroSnake === "function") {
      const cs = J.cuadroSnake.bind(J);
      J.cuadroSnake = e => {
        m.enSnake = true;
        try {
          return cs(e);
        } finally {
          m.enSnake = false;
        }
      };
    }
    if (typeof J.agarrar === "function") {
      const ag = J.agarrar.bind(J);
      J.agarrar = (...a) => {
        m.sinJefes = true;
        try {
          return ag(...a);
        } finally {
          m.sinJefes = false;
        }
      };
    }
    J.dañar = (g, cuanto, modo = 1) => g && g.__jefe ? g.__jefe.recibirGolpe(cuanto, modo, {
      explosion: m.explosionActual,
      aturdidora: m.aturdiendo
    }) : dañar(g, cuanto, modo);
    J.destruir = () => {
      m.destruir();
      destruir();
    };
    this.engancharArmas(this.ctx.armas);
  }
  engancharArmas(A) {
    if (!A || A.__jefes) return;
    A.__jefes = this;
    const m = this, ex = A.explosion.bind(A), at = A.aturdir.bind(A);
    A.explosion = (p, d) => {
      m.explosionActual = p.clone();
      try {
        return ex(p, d);
      } finally {
        m.explosionActual = null;
        m.alExplotar(p);
      }
    };
    A.aturdir = p => {
      m.aturdiendo = true;
      try {
        return at(p);
      } finally {
        m.aturdiendo = false;
        m.stunSig = true;
      }
    };
    if (typeof A.tirarGranada === "function") {
      const tg = A.tirarGranada.bind(A);
      A.tirarGranada = (o, d) => {
        const r = tg(o, d);
        if (r?.lanzada) {
          const g = A.granadas[A.granadas.length - 1];
          for (const j of m.lista) if (j.vivo) j.alLanzarGranada?.(g, A);
        }
        return r;
      };
    }
    if (typeof A.cuadroGranadas === "function") {
      const cg = A.cuadroGranadas.bind(A);
      A.cuadroGranadas = () => {
        for (const j of m.lista) if (j.vivo && j.listo) j.antesGranadas?.(A.granadas, A);
        return cg();
      };
    }
    if (typeof A.estallar === "function") {
      const es = A.estallar.bind(A);
      A.estallar = (id, p) => {
        const g = A.ultimaGranada;
        m.flagsBomba = g && g.p && g.p.distanceTo(p) < 1e-6 ? g.m1 || 0 : 0;
        try {
          return es(id, p);
        } finally {
          m.flagsBomba = 0;
        }
      };
    }
  }
  correrProc(pid, args = []) {
    if (!(pid > 0)) return false;
    if (this.ctx.procGuion) return !!this.ctx.procGuion(pid, args);
    const g = this.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
    if (g && typeof g.correrProc === "function" && g.script?.procs?.[(pid & 65535).toString(16).padStart(4, "0")]) {
      this.registro?.push?.({
        t: "proc",
        proc: pid
      });
      g.correrProc(pid, args);
      return true;
    }
    return false;
  }
  victoriaProc(j, info) {
    if (this.ganado) return;
    this.mostrarBarras = false;
    if (this.correrProc(info.proc, info.args || [])) {
      this.ganado = info;
      this.alGanar?.(info);
      this.fx.push({
        t: 0,
        dur: 20,
        fn: t => {
          this.hud.blanco = Math.max(0, this.hud.blanco - .05);
          this.hud.cine = Math.max(0, this.hud.cine - .05);
        },
        fin: () => {
          this.hud.blanco = 0;
          this.hud.cine = 0;
        }
      });
      return;
    }
    this.victoria(j, info, {
      sinProc: true
    });
    this.fx.push({
      t: 0,
      dur: 30,
      fn: t => {
        this.hud.blanco = Math.max(0, 1 - t / 30);
      }
    });
  }
  blancos() {
    return this.lista.filter(j => j.vivo && j.blanco && j.o).map(j => j.proxy);
  }
  prepararParedes() {
    this.mallas = new Map;
    this.ray = new THREE.Raycaster;
  }
  malla(grupo = -1, filtro = 0) {
    const k = grupo + ":" + filtro;
    if (this.mallas.has(k)) return this.mallas.get(k);
    const hz = this.J.ctx.hz, pos = [];
    if (hz) hz.grupos.forEach((g, gi) => {
      if (grupo >= 0 && gi !== grupo) return;
      for (const w of g.paredes) {
        if (w.flags & filtro) continue;
        const a = w.a, b = w.b, h = w.alto;
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], b[1] + h, b[2], a[0], a[1], a[2], b[0], b[1] + h, b[2], a[0], a[1] + h, a[2]);
      }
      for (const f of g.pisos) {
        const q = f.puntos;
        pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
      }
    });
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos.map(v => v * MM), 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    }));
    m.userData.sinColision = true;
    m.updateMatrixWorld(true);
    this.mallas.set(k, m);
    return m;
  }
  pared(origen, dir, largo, grupo = this.grupoHzd ?? -1, filtro = 0) {
    const m = this.malla(grupo, filtro);
    this.ray.set(origen.clone().multiplyScalar(MM), dir.clone().normalize());
    this.ray.far = largo * MM;
    const h = this.ray.intersectObject(m, false)[0];
    if (!h) return null;
    return {
      dist: h.distance * 1e3,
      punto: h.point.clone().multiplyScalar(1e3),
      normal: h.face.normal.clone()
    };
  }
  paredBala(origen, dir, largo) {
    return this.pared(origen, dir, largo, this.grupoHzd ?? -1, 2);
  }
  agregar(j) {
    this.lista.push(j);
    return j;
  }
  gameOverTimer() {
    return this.timerGO || (this.J.muerto ? -1 : 0);
  }
  se(id, pos, modo) {
    if (this.ctx.se) this.ctx.se(id, pos, modo); else sonido(id, pos);
  }
  chispa(p, escala = .3, cuadros = 3, color = 16777215) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaChispa(),
      color: color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }));
    s.position.copy(p);
    s.scale.setScalar(escala);
    s.userData.sinColision = true;
    this.mundo.add(s);
    this.fx.push({
      t: 0,
      dur: cuadros,
      fn: t => {
        s.material.opacity = 1 - t / cuadros;
      },
      fin: () => {
        s.removeFromParent();
        s.material.dispose();
      }
    });
  }
  alExplotar(p) {
    for (const j of this.lista) j.alExplotar?.(p);
  }
  victoria(j, info, op = {}) {
    if (this.ganado) return;
    this.ganado = info;
    this.mostrarBarras = false;
    if (!op.sinProc && this.ctx.alProc?.(j.actor, "e", info.proc)) {
      this.registro?.push?.({
        t: "proc por guion",
        proc: info.proc
      });
      return;
    }
    this.congelar(true);
    this.fx.push({
      t: 0,
      dur: 32,
      fn: t => {
        this.hud.negro = Math.min(1, t / 30);
      },
      fin: () => {
        if (this.ctx.alVencer) this.ctx.alVencer(info); else this.fx.push({
          t: 0,
          dur: 30,
          fn: t => {
            this.hud.negro = 1 - t / 30;
          },
          fin: () => {
            this.hud.negro = 0;
            this.congelar(false);
          }
        });
      }
    });
  }
  subtitulo() {
    const f = this.flujo;
    if (!f || f.estado !== 2 || !f.listo?.datos?.sub || this.ctx.subtitulos === false) return null;
    const s = f.segundos();
    const l = f.listo.datos.sub.find(x => s >= x[0] && s < x[1]);
    return l ? l[2] : null;
  }
  cuadro() {
    this.frame++;
    this.stun = this.stunSig;
    this.stunSig = false;
    if (this.congelado) this.J.ctx.rig.position.copy(this.congelado);
    this.voicesys?.cuadro(this.gameOverTimer());
    for (const j of this.lista.slice()) if (j.vivo && j.listo) j.cuadro();
    this.balas.cuadro();
    for (const f of this.fx.slice()) {
      f.t++;
      f.fn(f.t);
      if (f.t >= f.dur) {
        f.fin?.();
        this.fx.splice(this.fx.indexOf(f), 1);
      }
    }
    for (const j of this.lista) if (j.vivo && j.listo) j.dibujar();
    const hud = document.getElementById("hud");
    this.hud.cv.style.display = hud && hud.hidden ? "none" : "";
    this.hud.sub = this.subtitulo();
    this.hud.dibujar(this.lista.filter(j => j.vivo && j.listo), this.mostrarBarras);
  }
  congelar(si) {
    if (this.ctx.congelar) {
      this.ctx.congelar(si);
      return;
    }
    this.congelado = si ? this.J.ctx.rig.position.clone() : null;
  }
  gameOver() {
    if (this.J.muerto) return;
    this.J.muerto = true;
    (this.ctx.gameOver || this.J.ctx.gameOver)?.();
  }
  destruir() {
    for (const j of this.lista) j.destruir();
    this.lista = [];
    this.balas.destruir();
    this.voicesys?.destruir();
    this.voicesys = null;
    for (const f of this.fx) f.fin?.();
    this.fx = [];
    for (const e of this.extras || []) e?.destruir?.();
    this.extras = [];
    this.hud.destruir();
    for (const m of this.mallas.values()) m.geometry.dispose();
  }
}
