// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import * as SU from "three/addons/utils/SkeletonUtils.js";

import { MM, ANG, Motor, aplicarPose, cargarAnim, randU } from "./base.js";

import { cargadorCompartido } from "../cargador.js";

export const MJ = 2 * MM;

export const DIR = "jefes/jeep/";

export const trunc = Math.trunc;

export const V3 = (x = 0, y = 0, z = 0) => ({
  x: x,
  y: y,
  z: z
});

export const copiar = a => ({
  x: a.x,
  y: a.y,
  z: a.z
});

export const sumar = (a, b) => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z
});

export const restar = (a, b) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z
});

export const largo3 = v => Math.round(Math.hypot(v.x, v.y, v.z));

export const dir2 = v => Math.round(Math.atan2(v.x, v.z) / ANG) & 4095;

export const ratan2 = (y, x) => Math.round(Math.atan2(y, x) / ANG);

export const rsin = a => Math.round(Math.sin(a * ANG) * 4096);

export const rcos = a => Math.round(Math.cos(a * ANG) * 4096);

export const randRango = n => trunc(Math.floor(Math.random() * 32768) * n / 32768);

export const aVisor = (p, v = new THREE.Vector3) => v.set(p.x * MJ, p.y * MJ, p.z * MJ);

export function dirAng(pitch, yaw, largo = 1) {
  const cp = Math.cos(pitch * ANG), sp = Math.sin(pitch * ANG), cy = Math.cos(yaw * ANG), sy = Math.sin(yaw * ANG);
  return {
    x: sy * cp * largo,
    y: -sp * largo,
    z: cy * cp * largo
  };
}

const _e = new THREE.Euler, _m = new THREE.Matrix4, _v = new THREE.Vector3;

export function rotar(rot, v) {
  _e.set(rot.x * ANG, rot.y * ANG, rot.z * ANG, "YXZ");
  _m.makeRotationFromEuler(_e);
  _v.set(v.x, v.y, v.z).applyMatrix4(_m);
  return {
    x: _v.x,
    y: _v.y,
    z: _v.z
  };
}

export const nearSpeed = (from, to, v) => {
  if (from < to) {
    const n = from + v;
    return n >= to ? to : n;
  }
  const n = from - v;
  return n <= to ? to : n;
};

export const nearExp = (from, to, k) => {
  const d = to - from;
  if (d > -k && d < k) return to;
  return from + trunc(d / k);
};

const TIME_INV = [ 0, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256 ];

export const nearTime = (from, to, n) => {
  const k = TIME_INV[Math.max(0, Math.min(15, n))];
  return k === 0 ? to : trunc((to - from) * k / 4096) + from;
};

export const fase = (from, to) => {
  let d = from - to & 4095;
  if (d > 2048) d -= 4096;
  return to + d;
};

export function nuevoSistema() {
  return {
    pos: V3(),
    f20: V3(),
    f28: 0,
    f30: 0,
    gate: V3(),
    estado: 0,
    f44: 0,
    c: 0,
    f4C: 0,
    f50: 0,
    f54: 0,
    f5C: 0,
    alerta: 0,
    mundo: V3(),
    cabezaSnake: V3(),
    cabezaMeryl: V3(),
    cabezaLiquid: V3(),
    f140: V3(),
    f148: V3(),
    f150: null,
    f154: V3(),
    f15C: null,
    f160: V3(),
    demo: null,
    scroll: null,
    jeep: null,
    snake: null,
    meryl: null,
    jeep2: null,
    liquid: null,
    blancos: [],
    balas: [],
    actores: [],
    fx: [],
    gameStatus: 0,
    frame: 0
  };
}

export const T = {
  AVAIL: 1,
  CAPTURE: 2,
  POWER: 4,
  PUSH: 8,
  SEEK: 16
};

export const LADO = {
  NINGUNO: 0,
  SNAKE: 1,
  ENEMIGO: 2,
  AMBOS: 3
};

export const P = {
  ONCE: 0,
  DECREASE: 1,
  THRESHOLD: 2,
  CONST: 3,
  EXPLODE: 4
};

export class Blanco {
  constructor(sis, clase, lado, size, dueño = null) {
    this.sis = sis;
    this.dueño = dueño;
    this.set(clase, lado, size);
    this.center = V3();
    this.offset = V3();
    this.force = V3();
    this.vital = 0;
    this.damage = 0;
    this.p_mode = 0;
    this.a_mode = 0;
    this.faint = 0;
    sis.blancos.push(this);
  }
  set(clase, lado, size) {
    this.clase = clase;
    this.lado = lado;
    this.size = copiar(size);
    this.damaged = 0;
    this.flag = 0;
    return this;
  }
  power(p_mode, a_mode, vital, faint, force = V3()) {
    this.p_mode = p_mode;
    this.a_mode = a_mode;
    this.vital = vital;
    this.damage = 0;
    this.faint = faint;
    this.force = copiar(force);
    return this;
  }
  mover(c) {
    this.center = copiar(c);
  }
  liberar() {
    const i = this.sis.blancos.indexOf(this);
    if (i >= 0) this.sis.blancos.splice(i, 1);
  }
}

const choca = (c1, s1, c2, s2) => {
  const s = s1 + s2;
  return c1 - s <= c2 && c2 - s <= c1;
};

export const conflicto = (a, b) => (a.lado & b.lado) === 0 && choca(a.center.x, a.size.x, b.center.x, b.size.x) && choca(a.center.z, a.size.z, b.center.z, b.size.z) && choca(a.center.y, a.size.y, b.center.y, b.size.y);

const actualizarPoder = (tipo, a, b) => {
  switch (tipo & 3) {
   case P.ONCE:
    return 0;

   case P.DECREASE:
    return a - b;

   case P.THRESHOLD:
    return a > b ? a : 0;

   default:
    return a;
  }
};

export function powerTarget(sis, t) {
  let hp = t.vital;
  for (const it of sis.blancos) {
    if (it === t || !(it.clase & T.POWER) || !conflicto(it, t)) continue;
    it.damaged |= T.POWER;
    const hp2 = it.vital;
    it.vital = actualizarPoder(it.p_mode, hp2, hp);
    hp = actualizarPoder(t.p_mode, hp, hp2);
    it.damage += hp2 - it.vital;
    it.faint -= t.faint;
    it.a_mode = t.a_mode;
    if (t.p_mode & P.EXPLODE) {
      const d = restar(it.center, t.center), a = Math.atan2(d.x, d.z);
      it.force.x += Math.round(Math.sin(a) * t.force.x);
      it.force.z += Math.round(Math.cos(a) * t.force.x);
    } else it.force = sumar(it.force, t.force);
    it.dueño?.alGolpe?.(it, t);
    if (hp < 0) break;
  }
  const dif = t.vital - hp;
  t.vital = hp;
  if (dif > 0) t.damaged |= T.POWER;
  return dif;
}

const empujar = (c1, s1, c2, s2) => {
  s1 += s2;
  s2 = c2 - c1;
  if (s2 >= 0) {
    s1 -= s2;
    return s1 < 0 ? 0 : s1;
  }
  s2 += s1;
  return s2 < 0 ? 0 : -s2;
};

export function pushTarget(sis, t) {
  if (!(t.clase & T.PUSH)) return 0;
  t.offset = V3();
  for (const it of sis.blancos) {
    if (it === t || !(it.clase & T.PUSH) || it.lado !== LADO.NINGUNO) continue;
    if (!(choca(it.center.x, it.size.x, t.center.x, t.size.x) && choca(it.center.z, it.size.z, t.center.z, t.size.z) && choca(it.center.y, it.size.y, t.center.y, t.size.y))) continue;
    let x = empujar(it.center.x, it.size.x, t.center.x, t.size.x);
    if (x === 0) continue;
    let z = empujar(it.center.z, it.size.z, t.center.z, t.size.z);
    if (z === 0) continue;
    if (Math.abs(x) <= Math.abs(z)) {
      x = trunc(x / 2);
      t.offset.x += x;
      it.offset.x -= x;
    } else {
      z = trunc(z / 2);
      t.offset.z += z;
      it.offset.z -= z;
    }
    it.damaged |= T.PUSH;
    t.damaged |= T.PUSH;
  }
  return t.damaged & T.PUSH ? 1 : 0;
}

function enLinea(f, t, d) {
  const ejes = [ [ "x", "y", "z" ], [ "y", "z", "x" ], [ "z", "x", "y" ] ];
  for (const [a, b, c] of ejes) {
    const f0 = f[a], df = t[a] - f0;
    if (df === 0) continue;
    let ca = d.center[a];
    const sa = d.size[a];
    if (ca < f0) {
      ca += sa;
      if (ca > f0) ca = f0;
    } else {
      ca -= sa;
      if (ca < f0) ca = f0;
    }
    const cb = f[b] + trunc((t[b] - f[b]) * (ca - f0) / df);
    if (cb < d.center[b] - d.size[b] || cb > d.center[b] + d.size[b]) continue;
    const cc = f[c] + trunc((t[c] - f[c]) * (ca - f0) / df);
    if (cc < d.center[c] - d.size[c] || cc > d.center[c] + d.size[c]) continue;
    return {
      [a]: ca,
      [b]: cb,
      [c]: cc
    };
  }
  return null;
}

export function enLineaBlancos(sis, from, to, lado) {
  let hit = null, hasta = copiar(to);
  for (const it of sis.blancos) {
    if (it.lado === lado || !(it.clase & T.SEEK)) continue;
    const caja = {
      lado: 0,
      center: {
        x: trunc((from.x + hasta.x) / 2),
        y: trunc((from.y + hasta.y) / 2),
        z: trunc((from.z + hasta.z) / 2)
      },
      size: {
        x: Math.abs(trunc((from.x - hasta.x) / 2)),
        y: Math.abs(trunc((from.y - hasta.y) / 2)),
        z: Math.abs(trunc((from.z - hasta.z) / 2))
      }
    };
    if (!conflicto(it, caja)) continue;
    const h = enLinea(from, hasta, it);
    if (h) {
      hit = {
        p: h,
        blanco: it
      };
      hasta = h;
    }
  }
  return hit;
}

const TEXTURAS = [ "blood_1", "fire2", "jeep_bonbori_add", "m19_c2_glass1hlf", "m60_flash", "smoke", "spark_fl" ];

export class Recursos {
  constructor(ctx) {
    this.ctx = ctx;
    this.modelos = new Map;
    this.anims = new Map;
    this.tex = new Map;
  }
  async cargar(nombres, anims = []) {
    const glb = async n => {
      if (this.modelos.has(n)) return;
      const url = (n.includes("/") ? n : DIR + n) + ".glb";
      let o = null;
      try {
        o = this.ctx.cargar ? await this.ctx.cargar(url) : await cargaPropia(url);
      } catch (e) {
        console.warn("[jeep] no cargó", url, e.message);
      }
      if (o) o.traverse(m => {
        if (m.isMesh) {
          m.userData.sinColision = true;
          m.frustumCulled = false;
        }
      });
      this.modelos.set(n, o);
    };
    await Promise.all(nombres.map(glb).concat(anims.map(async a => {
      if (!this.anims.has(a)) this.anims.set(a, await cargarAnim(a).catch(() => null));
    }), TEXTURAS.map(n => this.texturaLista(n))));
  }
  texturaLista(n) {
    if (this.tex.has(n) && this.tex.get(n).image) return Promise.resolve(this.tex.get(n));
    return new Promise(ok => {
      const t = (new THREE.TextureLoader).load(`assets/${DIR}${n}.png`, () => ok(t), undefined, () => {
        console.warn("[jeep] no cargó", n);
        ok(t);
      });
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      this.tex.set(n, t);
    });
  }
  nuevo(n) {
    const t = this.modelos.get(n);
    return t ? SU.clone(t) : null;
  }
  anim(n) {
    return this.anims.get(n) || null;
  }
  textura(n) {
    if (!this.tex.has(n)) {
      const t = (new THREE.TextureLoader).load(`assets/${DIR}${n}.png`);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      this.tex.set(n, t);
    }
    return this.tex.get(n);
  }
}

let _carga = null;

async function cargaPropia(url) {
  const comp = cargadorCompartido();
  if (comp) return comp(url);
  if (!_carga) {
    const {GLTFLoader: GLTFLoader} = await (import("three/addons/loaders/GLTFLoader.js"));
    _carga = new GLTFLoader;
  }
  return SU.clone((await _carga.loadAsync("assets/" + url)).scene);
}

export class Cuerpo {
  constructor(rec, modelo, anim, padre) {
    this.raiz = new THREE.Group;
    this.raiz.name = "jeep_" + modelo;
    this.o = rec.nuevo(modelo);
    this.datos = anim ? rec.anim(anim) : null;
    if (this.o) {
      this.raiz.add(this.o);
      this.o.traverse(m => {
        if (m.isMesh) m.castShadow = true;
      });
      const n = this.datos?.huesos ?? 0;
      this.huesos = [];
      for (let i = 0; i < 24; i++) {
        const h = this.o.getObjectByName("hueso_" + i);
        if (!h) break;
        this.huesos.push(h);
      }
      this.padres = this.huesos.map(h => {
        const m = /^hueso_(\d+)$/.exec(h.parent?.name || "");
        return m ? +m[1] : -1;
      });
      if (this.datos) {
        this.motor = new Motor(this.datos, n);
        this.adjust = Array.from({
          length: n
        }, () => [ 0, 0, 0 ]);
      }
    }
    padre?.add(this.raiz);
    this.accion = -1;
  }
  config(a, interp = 4) {
    this.accion = a;
    this.motor?.accion(a, interp);
  }
  get isEnd() {
    return this.motor ? this.motor.isEnd : 1;
  }
  get altura() {
    return this.motor ? this.motor.altura : 0;
  }
  tick() {
    this.motor?.tick();
  }
  pose() {
    if (this.motor && this.huesos.length) aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.motor.altura * MM);
  }
  punto(i, off = V3(), out = new THREE.Vector3) {
    const h = this.huesos?.[i];
    if (!h) return this.raiz.getWorldPosition(out);
    this.raiz.updateMatrixWorld(true);
    return out.set(off.x * MM, off.y * MM, off.z * MM).applyMatrix4(h.matrixWorld);
  }
  puntoMundo(i, off = V3()) {
    const p = this.punto(i, off);
    return {
      x: Math.round(p.x / MJ),
      y: Math.round(p.y / MJ),
      z: Math.round(p.z / MJ)
    };
  }
  visible(si) {
    this.raiz.visible = si;
  }
  destruir() {
    this.raiz.removeFromParent();
  }
}

export function sprite(rec, tex, color = 16777215, aditivo = true) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex ? rec.textura(tex) : null,
    color: color,
    transparent: true,
    depthWrite: false,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    fog: true
  }));
  s.userData.sinColision = true;
  return s;
}

export function efecto(sis, raiz, o, dur, fn, op = {}) {
  raiz.add(o);
  const f = {
    o: o,
    t: 0,
    dur: dur,
    fn: fn,
    mundo: !!op.mundo,
    p: op.p ? copiar(op.p) : null,
    fin: () => {
      o.removeFromParent();
      o.material?.dispose?.();
      op.fin?.();
    }
  };
  if (f.p) aVisor(f.p, o.position);
  sis.fx.push(f);
  return f;
}

export function cuadroEfectos(sis) {
  for (const f of sis.fx.slice()) {
    f.t++;
    if (f.mundo && f.p) {
      f.p = sumar(f.p, sis.pos);
      aVisor(f.p, f.o.position);
    }
    f.fn?.(f.t, f);
    if (f.t >= f.dur) {
      f.fin();
      sis.fx.splice(sis.fx.indexOf(f), 1);
    }
  }
}

export function fogonazo(sis, rec, raiz, p, escala = 300) {
  const s = sprite(rec, "m60_flash", 16777215);
  s.scale.setScalar(escala * MJ);
  s.material.rotation = Math.random() * 6.28;
  efecto(sis, raiz, s, 2, null, {
    p: p
  });
}

export function chispa(sis, rec, raiz, p, escala = 200) {
  const s = sprite(rec, "spark_fl", 16769184);
  s.scale.setScalar(escala * MJ);
  efecto(sis, raiz, s, 4, t => {
    s.material.opacity = 1 - t / 4;
  }, {
    p: p,
    mundo: true
  });
}

export function sangre(sis, rec, raiz, p, n = 4) {
  for (let i = 0; i < n; i++) {
    const s = sprite(rec, "blood_1", 11145232, false);
    s.scale.setScalar(80 * MJ);
    const v = {
      x: (Math.random() - .5) * 30,
      y: Math.random() * 25,
      z: (Math.random() - .5) * 30
    };
    efecto(sis, raiz, s, 16, (t, f) => {
      f.p.x += v.x;
      f.p.y += v.y;
      f.p.z += v.z;
      v.y -= 4;
      aVisor(f.p, s.position);
      s.material.opacity = 1 - t / 16;
    }, {
      p: p,
      mundo: true
    });
  }
}

export function explosion(sis, rec, raiz, p) {
  for (let i = 0; i < 5; i++) {
    const s = sprite(rec, "fire2", 16760944);
    const q = {
      x: p.x + (Math.random() - .5) * 300,
      y: p.y + Math.random() * 300,
      z: p.z + (Math.random() - .5) * 300
    };
    efecto(sis, raiz, s, 20 + i * 2, (t, f) => {
      s.scale.setScalar((400 + t * 40) * MJ);
      s.material.opacity = Math.max(0, 1 - t / f.dur);
    }, {
      p: q,
      mundo: true
    });
  }
}

function particula(rec, tex, cols, filas, mezcla) {
  const t = rec.textura(tex).clone();
  t.needsUpdate = true;
  t.repeat.set(1 / cols, 1 / filas);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: t,
    color: 0,
    transparent: true,
    depthWrite: false,
    blending: mezcla,
    fog: true
  }));
  s.userData.sinColision = true;
  s.visible = false;
  return s;
}

const celda = (s, i, cols, filas) => {
  s.material.map.offset.set(i % cols / cols, 1 - (Math.floor(i / cols) + 1) / filas);
};

export function humo(sis, rec, raiz, p, dur = 150) {
  const ps = Array.from({
    length: 16
  }, () => ({
    s: particula(rec, "smoke", 8, 4, THREE.SubtractiveBlending),
    vida: 0,
    cel: 0,
    p: V3(),
    v: V3(),
    tam: 0
  }));
  const grupo = new THREE.Group;
  for (const q of ps) grupo.add(q.s);
  let u54 = dur, u58 = 80, u5C = 20, u60 = -1, u64 = 0, base = copiar(p);
  efecto(sis, raiz, grupo, dur + 81, () => {
    base = sumar(base, sis.pos);
    if (u60 < 0) {
      const q = ps[u64];
      q.vida = Math.min(u5C, u58);
      q.cel = randU(16);
      q.p = copiar(base);
      q.tam = 375;
      q.v = {
        x: randU(8) - 4,
        y: randU(8) - 4 + 15,
        z: randU(8) - 4
      };
      u60 = 12;
      u64 = u64 + 1 & 15;
    } else u60--;
    for (const q of ps) {
      if (q.vida !== 0) {
        q.tam += 5;
        q.p = sumar(sumar(q.p, sis.pos), q.v);
        celda(q.s, q.cel, 8, 4);
        if (++q.cel >= 30) q.cel = 0;
        const sh = Math.min(q.vida * 2, 255) / 255;
        q.s.material.color.setRGB(sh, sh, sh);
        q.vida--;
        q.s.visible = true;
        aVisor(q.p, q.s.position);
        q.s.scale.setScalar(q.tam * MJ);
      } else {
        q.s.visible = false;
        q.p = sumar(q.p, sis.pos);
      }
    }
    if (u54 > 0) {
      u54--;
      u5C++;
    } else {
      u58 = Math.max(0, u58 - 1);
      u54--;
      u5C++;
    }
  }, {
    fin: () => {
      for (const q of ps) {
        q.s.material.map.dispose();
        q.s.material.dispose();
      }
    }
  });
}

export function fuego(sis, rec, raiz, p, dur = 30) {
  const ps = Array.from({
    length: 16
  }, () => ({
    s: particula(rec, "fire2", 4, 4, THREE.AdditiveBlending),
    vida: 0,
    cel: 0,
    fade: 0,
    p: V3(),
    tam: 0
  }));
  const grupo = new THREE.Group;
  for (const q of ps) grupo.add(q.s);
  let f54 = dur, f58 = 40, f5C = -1, f60 = 0, base = copiar(p);
  efecto(sis, raiz, grupo, dur + 41, (t, f) => {
    base = sumar(base, sis.pos);
    if (f5C < 0) {
      const q = ps[f60];
      q.vida = f58;
      q.fade = 255;
      q.cel = randU(16);
      q.tam = Math.max(200, f58 * 20 - 200);
      q.p = {
        x: base.x + trunc((randU(512) - 256) / 2),
        y: base.y + q.tam,
        z: base.z + trunc((randU(512) - 256) / 2)
      };
      f5C = 12;
      f60 = f60 + 1 & 15;
    } else f5C--;
    for (const q of ps) {
      q.p = sumar(q.p, sis.pos);
      if (q.vida !== 0) {
        celda(q.s, q.cel, 4, 4);
        if (++q.cel >= 16) q.cel = 0;
        let v1 = Math.min(255, q.vida << 4);
        if (q.fade > 0) {
          v1 = Math.max(0, v1 - q.fade);
          q.fade >>= 1;
        }
        const k = v1 / 255 * .5;
        q.s.material.color.setRGB(k, k, k);
        q.tam = Math.max(200, q.tam - 10);
        if (q.tam !== 200) q.p.y -= 10;
        q.vida--;
        q.s.visible = true;
        aVisor(q.p, q.s.position);
        q.s.scale.setScalar(q.tam * MJ);
      } else q.s.visible = false;
    }
    if (f54 <= 0) {
      if (f58 === 0) f.t = f.dur; else f58--;
    }
    f54--;
  }, {
    fin: () => {
      for (const q of ps) {
        q.s.material.map.dispose();
        q.s.material.dispose();
      }
    }
  });
}

export class BalaJeep {
  constructor(sis, rec, raiz, boca, dir, lado, op = {}) {
    this.sis = sis;
    this.lado = lado;
    this.vivo = true;
    const esc = op.escala ?? .5;
    this.maxDist = op.mode2 === 2 ? 1e5 : 15e3;
    this.rangeStep = trunc((op.mode2 === 2 ? 5e3 : 750) * esc);
    const origen = {
      x: Math.round(boca.x - dir.x * 400 * esc),
      y: Math.round(boca.y - dir.y * 400 * esc),
      z: Math.round(boca.z - dir.z * 400 * esc)
    };
    this.pos = copiar(origen);
    this.step = {
      x: Math.round(dir.x * this.rangeStep),
      y: Math.round(dir.y * this.rangeStep),
      z: Math.round(dir.z * this.rangeStep)
    };
    this.range = 0;
    this.hit = 0;
    const lejos = this.maxDist * esc;
    const h = op.conPared ? op.pared?.(origen, dir, lejos) : null;
    this.hitDist = h ? h.dist : this.maxDist;
    this.hitPoint = h ? h.punto : {
      x: Math.round(origen.x + dir.x * lejos),
      y: Math.round(origen.y + dir.y * lejos),
      z: Math.round(origen.z + dir.z * lejos)
    };
    if (h) this.hit = 1;
    this.blanco = new Blanco(sis, T.POWER, lado, {
      x: 100,
      y: 100,
      z: 100
    }).power(P.CONST, 1, lado === LADO.SNAKE ? 64 : trunc(64 * 2 / 3), 0, {
      x: this.step.x >> 3,
      y: this.step.y >> 3,
      z: this.step.z >> 3
    });
    this.blanco.clase = 0;
    this.rec = rec;
    this.raiz = raiz;
    const r = randU(128) - 32 + 128;
    this.geo = (new THREE.BufferGeometry).setFromPoints([ aVisor(origen), aVisor(origen) ]);
    this.linea = new THREE.Line(this.geo, new THREE.LineBasicMaterial({
      color: new THREE.Color(Math.min(255, r) / 255, trunc(r / 3) * 2 / 255, trunc(r / 3) * 2 / 255),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.linea.userData.sinColision = true;
    this.linea.frustumCulled = false;
    raiz.add(this.linea);
    this.chispa = op.chispa ?? true;
    this.alChocar = op.alChocar || null;
    sis.balas.push(this);
  }
  act() {
    if (!this.vivo) return;
    this.range += this.rangeStep;
    const ant = copiar(this.pos);
    const sig = this.range > this.hitDist ? copiar(this.hitPoint) : sumar(this.pos, this.step);
    const h = enLineaBlancos(this.sis, this.pos, sig, this.lado);
    if (h) {
      this.blanco.mover(h.p);
      this.blanco.clase = T.POWER;
      powerTarget(this.sis, this.blanco);
      this.blanco.clase = 0;
      this.dibujar(ant, h.p);
      this.destruir();
      return;
    }
    this.pos = sig;
    this.dibujar(ant, sig);
    if (this.range > this.hitDist) {
      if (this.hit === 1) {
        if (this.chispa) chispa(this.sis, this.rec, this.raiz, this.hitPoint);
        this.alChocar?.(this.hitPoint);
      }
      this.destruir();
    }
  }
  dibujar(a, b) {
    const p = this.geo.attributes.position;
    p.setXYZ(0, a.x * MJ, a.y * MJ, a.z * MJ);
    p.setXYZ(1, b.x * MJ, b.y * MJ, b.z * MJ);
    p.needsUpdate = true;
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.blanco.liberar();
    const l = this.linea;
    setTimeout(() => {
      l.removeFromParent();
      l.geometry.dispose();
      l.material.dispose();
    }, 30);
    const i = this.sis.balas.indexOf(this);
    if (i >= 0) this.sis.balas.splice(i, 1);
  }
}
