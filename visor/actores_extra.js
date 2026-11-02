// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { clone as clonarEsqueleto } from "three/addons/utils/SkeletonUtils.js";

import { cargarAnims, clip } from "./anim.js";

import { CLASES_GUION, TIPOS_GUION } from "./actores_guion.js";

const MM = .001, ANG = Math.PI * 2 / 4096, FPS = 30;

const v3 = (p, i = 0) => new THREE.Vector3(p[i] * MM, p[i + 1] * MM, p[i + 2] * MM);

const num = (a, k, d, i = 0) => typeof a.opts?.[k]?.[i] === "number" ? a.opts[k][i] : d;

const lista = (a, k) => Array.isArray(a.opts?.[k]) ? a.opts[k].filter(v => typeof v === "number") : [];

const vecs = (a, k) => {
  const l = lista(a, k), r = [];
  for (let i = 0; i + 2 < l.length; i += 3) r.push(l.slice(i, i + 3));
  return r;
};

const procDe = (a, k) => a.opts?.[k]?.find?.(v => v && typeof v === "object" && "proc" in v)?.proc ?? null;

const randS = n => Math.floor(Math.random() * (2 * n)) - n;

const randU = n => Math.floor(Math.random() * n);

const rsin = a => Math.round(Math.sin(a * ANG) * 4096);

const eulerYXZ = d => new THREE.Euler((d?.[0] || 0) * ANG, (d?.[1] || 0) * ANG, (d?.[2] || 0) * ANG, "YXZ");

const MSG = {
  ON2: 53634,
  OFF2: 107,
  KILL: 12835,
  EMPIEZA: 19111,
  PARA: 42422,
  ABRE: 16779,
  CIERRA: 14850,
  OPEN: 19783,
  CLOSE: 53548,
  ROMPE: 50075,
  BURBUJA_REVIENTA: 16517,
  ENV_PARA: 47655,
  ENV_EMPIEZA: 22030
};

const SE = {
  CHISPAS: 59,
  PANEL: 60,
  SILLA: 61,
  VIDRIO_RAJA: 62,
  VIDRIO_ROMPE: 63,
  PAPEL: 64,
  ELECTRICO: 179,
  DESCARGA: 180
};

const APAGADO = typeof location !== "undefined" && new URLSearchParams(location.search).get("extras") === "0";

export const TIPOS_EXTRA = new Set([ "GLASS", "CHAIR", "MONITOR1", "PAPER", "BLOOD_POOL", "BLOOD_POOL2", "EMITTER", "BLINKTEX", "ENV_SOUND", "SMOKE", "ELECFLOOR", "FLR_SPA", "WALLSPARK", "DEATHSPARK", "BUBBLE", "BUB_D_SN", "HIYOKO", "UJI", "REDALERT", "BREAK_OBJECT", "DUCTMOUSE", "ASIATOKUN", "TEXTURE", "TEXSCROLL", "MOTIONSE", "DOOR2", "MIRROR", "BELONG", "SCN_MARK", "RADARPOINT", "MOSAIC", "9FFD_2ND", "2D0A_2ND", "TOBCNT", "ITEM_DOT", "KEY_ITEM", "SMKTRGT", "CRANE", "ELEVCROW", "CONTAINER", "DRUMCAN", "DRUMCAN2", "BLACKSMOKE", "PK_GATE", "PUTHZD" ]);

const VIVOS = new Set;

export function golpeBalaExtras(origen, dir, hasta = null, daño = 64) {
  let r = null;
  for (const E of VIVOS) {
    const g = E.golpeBala(origen, dir, hasta, daño);
    if (g && (!r || g.dist < r.dist)) r = g;
  }
  return r;
}

export function golpeCajaExtras(centro, medio, modo = 2, daño = 256) {
  let ok = false;
  for (const E of VIVOS) for (const b of E.blancos.slice()) {
    if (Math.abs(b.centro.x - centro.x) <= b.medio.x + medio.x && Math.abs(b.centro.y - centro.y) <= b.medio.y + medio.y && Math.abs(b.centro.z - centro.z) <= b.medio.z + medio.z) {
      b.alGolpe(modo, b.centro.clone().sub(centro).normalize(), b.centro.clone(), daño);
      ok = true;
    }
  }
  return ok;
}

export const extrasVivos = () => [ ...VIVOS ];

export function homingExtras() {
  const r = [];
  for (const E of VIVOS) for (const x of E.actores) {
    const p = x.homing?.();
    if (p) r.push(p);
  }
  return r;
}

function materialPS1(map, modo = 0, color = [ 128, 128, 128 ], op = {}) {
  const m = new THREE.MeshBasicMaterial({
    map: map,
    transparent: true,
    depthWrite: false,
    side: op.unaCara ? THREE.FrontSide : THREE.DoubleSide,
    fog: false
  });
  ponerColor(m, color, modo);
  if (modo === 1 || modo === 3) m.blending = THREE.AdditiveBlending; else if (modo === 2) m.blending = THREE.SubtractiveBlending; else {
    m.opacity = .5;
    m.alphaTest = .02;
  }
  if (op.subir) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -op.subir;
  }
  return m;
}

function ponerColor(m, c, modo = m.userData.modo ?? 0) {
  const k = (modo === 3 ? .25 : 1) / 128;
  m.color.setRGB(c[0] * k, c[1] * k, c[2] * k, THREE.SRGBColorSpace);
  m.userData.modo = modo;
}

function mallaQuads(n, material, uvs = null) {
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 12), 3));
  const uv = new Float32Array(n * 8);
  for (let i = 0; i < n; i++) uv.set(uvs ? uvs(i) : [ 0, 1, 1, 1, 0, 0, 1, 0 ], i * 8);
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  const idx = [];
  for (let i = 0; i < n; i++) {
    const b = i * 4;
    idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  }
  g.setIndex(idx);
  const m = new THREE.Mesh(g, material);
  m.frustumCulled = false;
  m.userData.propio = m.userData.sinColision = true;
  m.renderOrder = 5;
  return m;
}

const uvRect = (w, h, u0, v0, u1, v1) => [ u0 / w, 1 - v0 / h, (u1 + 1) / w, 1 - v0 / h, u0 / w, 1 - (v1 + 1) / h, (u1 + 1) / w, 1 - (v1 + 1) / h ];

function sprite(map, modo, color, ancho, alto) {
  const m = new THREE.SpriteMaterial({
    map: map,
    transparent: true,
    depthWrite: false,
    fog: false
  });
  ponerColor(m, color, modo);
  if (modo === 1 || modo === 3) m.blending = THREE.AdditiveBlending; else if (modo === 2) m.blending = THREE.SubtractiveBlending; else m.opacity = .5;
  const s = new THREE.Sprite(m);
  s.scale.set(ancho * MM, alto * MM, 1);
  s.userData.propio = s.userData.sinColision = true;
  s.renderOrder = 6;
  return s;
}

const _rayo = new THREE.Ray, _caja = new THREE.Box3, _p = new THREE.Vector3;

function rayoCaja(o, d, b) {
  _caja.min.copy(b.centro).sub(b.medio);
  _caja.max.copy(b.centro).add(b.medio);
  _rayo.set(o, d);
  const q = _rayo.intersectBox(_caja, _p);
  return q ? q.distanceTo(o) : null;
}

export class ActoresExtra {
  constructor(din) {
    this.din = din;
    this.ctx = {};
    VIVOS.add(this);
    this.actores = [];
    this.efectos = [];
    this.blancos = [];
    this.acum = 0;
    this.cuadros = 0;
    this.texturas = new Map;
    this.porNombre = new Map;
    this.lamp = {};
    this.infoLamp = fetch("assets/actores/tex/indice.json").then(r => r.json()).then(j => {
      this.lamp = j || {};
    }).catch(() => {});
    this.infoTex = {};
    fetch("assets/actores/texturas.json").then(r => r.json()).then(j => {
      this.infoTex = j || {};
    }).catch(() => {});
  }
  async numerosDe(a, tipo) {
    if (Array.isArray(a.valores)) {
      const n = a.valores.filter(v => typeof v === "number");
      if (n.length) return n;
    }
    const st = this.ctx.st?.();
    if (!st) return null;
    if (this._guionSt !== st) {
      this._guionSt = st;
      this._usados = new Set;
      this._guion = fetch(`assets/guion/st/${st}.json`).then(r => r.json()).then(sc => {
        const idx = new Map;
        const ver = (x, prof = 0) => {
          if (!x || typeof x !== "object" || prof > 60) return;
          if (Array.isArray(x)) {
            for (const y of x) ver(y, prof + 1);
            return;
          }
          if (x.cmd === "chara" && x.tipo && Array.isArray(x.args)) {
            const k = `${x.tipo}:${tokVal(x.args[1])}`, I = x.args.find(o => o?.opt === "I")?.v?.[0];
            (idx.get(k) || idx.set(k, []).get(k)).push({
              n: x.args.filter(v => typeof v === "number"),
              I: tokVal(I) ?? null
            });
          }
          for (const v of Object.values(x)) if (v && typeof v === "object") ver(v, prof + 1);
        };
        ver(sc);
        return idx;
      }).catch(() => new Map);
    }
    const l = (await this._guion).get(`${tipo}:${a.nombre}`) || [], I = tokVal(a.opts?.I?.[0]) ?? null;
    const cand = l.filter(c => I == null || c.I === I), libre = cand.find(c => !this._usados.has(c)) || cand[0] || l[0];
    if (libre) this._usados.add(libre);
    return libre?.n || null;
  }
  maneja(a) {
    return !APAGADO && !!a && TIPOS_EXTRA.has(a.tipo);
  }
  tex(nombre) {
    if (!this.texturas.has(nombre)) {
      const t = (new THREE.TextureLoader).load("assets/actores/" + nombre + ".png", () => {
        for (const c of t.userData.clones || []) c.needsUpdate = true;
        t.userData.clones = null;
      });
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      this.texturas.set(nombre, t);
    }
    return this.texturas.get(nombre);
  }
  texCopia(nombre) {
    const t = this.tex(nombre), c = t.clone();
    if (t.image?.width) c.needsUpdate = true; else (t.userData.clones ||= []).push(c);
    return c;
  }
  sonido(id, p, modo) {
    try {
      this.din.sonido(id, p, undefined, modo);
    } catch (e) {
      console.warn("actores: sonido", e);
    }
  }
  proc(pid, args = []) {
    if (pid == null || !this.din.correrProc) return;
    try {
      this.din.correrProc(pid, args);
    } catch (e) {
      console.warn("actores: proc", pid, e);
    }
  }
  agregar(o) {
    (this.din.mundo || this.din.scene).add(o);
    return o;
  }
  jugador() {
    return this._jugador || null;
  }
  hueso(i) {
    const h = this.ctx.hueso?.(i);
    if (h) return h;
    const j = this._jugador;
    return j ? j.clone().setY(j.y + (i === 6 ? 1.55 : .6 + i % 7 * .15)) : null;
  }
  async crear(a) {
    const C = CLASES[a.tipo];
    if (!C) return false;
    let x;
    const anotar = y => {
      const l = this.porNombre.get(a.nombre) || [];
      l.push(y);
      this.porNombre.set(a.nombre, l);
    };
    const desanotar = y => {
      const l = this.porNombre.get(a.nombre);
      if (l) {
        const k = l.indexOf(y);
        if (k >= 0) l.splice(k, 1);
      }
    };
    const antes = !!C.temprano && a.nombre != null;
    try {
      x = new C(this, a);
      if (antes) anotar(x);
      await (x.iniciar?.());
    } catch (e) {
      console.warn("actores: no se pudo crear", a.tipo, e);
      if (x && antes) desanotar(x);
      return true;
    }
    if (x.muerto || this.destruido) {
      if (antes) desanotar(x);
      if (this.destruido) {
        x.morir?.();
        for (const o of x.objs || []) o.removeFromParent();
      }
      return true;
    }
    this.actores.push(x);
    a._extra = (a._extra || []).concat(x);
    a._objs = (a._objs || []).concat(x.objs || []);
    if (a.nombre != null && !antes) anotar(x);
    x.listo?.();
    return true;
  }
  async lucesPanel(a) {
    const x = new LucesPanel(this, a);
    try {
      await x.iniciar();
    } catch (e) {
      console.warn("actores: luces del ascensor", e);
      return null;
    }
    if (this.destruido) {
      for (const o of x.objs) o.removeFromParent();
      return null;
    }
    if (!x.objs.length) return null;
    this.actores.push(x);
    return x;
  }
  quitar(a) {
    for (const x of a?._extra || []) this.matar(x);
    if (a) a._extra = null;
  }
  matar(x) {
    if (x.muerto && !this.actores.includes(x)) return;
    x.muerto = true;
    x.morir?.();
    for (const o of x.objs || []) o.removeFromParent();
    for (const b of x.blancos || []) {
      const i = this.blancos.indexOf(b);
      if (i >= 0) this.blancos.splice(i, 1);
    }
    const i = this.actores.indexOf(x);
    if (i >= 0) this.actores.splice(i, 1);
    const l = this.porNombre.get(x.a?.nombre);
    if (l) {
      const k = l.indexOf(x);
      if (k >= 0) l.splice(k, 1);
    }
  }
  efecto(e) {
    this.efectos.push(e);
    return e;
  }
  explotar(p) {
    let ok = false;
    try {
      ok = !!this.ctx.explotar?.(p);
    } catch (e) {
      console.warn("actores: explosión", e);
    }
    if (!ok) {
      this.explosion(p);
      this.sonido(181, p);
      this.chispas(p, 1.5);
      for (let i = 0; i < 4; i++) this.humo(p, [ randS(20), 15 + i * 5, randS(20) ]);
    }
  }
  puntosRadar() {
    return this.actores.filter(x => x instanceof PuntoRadar && x.visible).map(x => ({
      p: x.p,
      dis: 0,
      enAltura: true
    }));
  }
  matarBlanco(b) {
    const i = this.blancos.indexOf(b);
    if (i >= 0) this.blancos.splice(i, 1);
  }
  blanco(x, centro, medio, alGolpe) {
    const b = {
      x: x,
      centro: centro,
      medio: medio,
      alGolpe: alGolpe
    };
    (x.blancos ||= []).push(b);
    this.blancos.push(b);
    return b;
  }
  mensaje(dest, v) {
    const l = this.porNombre.get(dest);
    if (!l?.length || !Array.isArray(v)) return false;
    let ok = false;
    for (const x of l.slice()) if (x.mensaje) {
      x.mensaje(v[0], v);
      ok = true;
    }
    return ok;
  }
  golpeBala(origen, dir, hasta = null, daño = null) {
    const lim = hasta ? hasta.distanceTo(origen) + .05 : 60;
    let mejor = null, md = lim;
    for (const b of this.blancos) {
      const d = rayoCaja(origen, dir, b);
      if (d != null && d < md) {
        md = d;
        mejor = b;
      }
    }
    if (!mejor) return null;
    const punto = origen.clone().addScaledVector(dir, md);
    if (daño == null) daño = typeof window !== "undefined" && window.__mgs?.inventario?.arma === 9 ? 256 : 64;
    mejor.alGolpe(1, dir.clone(), punto, daño);
    return {
      punto: punto,
      dist: md
    };
  }
  explosion(p) {
    for (const b of this.blancos.slice()) {
      const r = 2;
      if (Math.abs(b.centro.x - p.x) <= r + b.medio.x && Math.abs(b.centro.y - p.y) <= r + b.medio.y && Math.abs(b.centro.z - p.z) <= r + b.medio.z) b.alGolpe(2, b.centro.clone().sub(p).normalize(), b.centro.clone());
    }
  }
  update(dt, info = {}) {
    if (info.jugador) this._jugador = info.jugador;
    if (this.pausa) dt = 0;
    this.acum = Math.min(this.acum + dt, .25);
    while (this.acum >= 1 / FPS) {
      this.acum -= 1 / FPS;
      this.cuadros++;
      for (const x of this.actores.slice()) if (!x.muerto) {
        try {
          x.cuadro?.();
        } catch (e) {
          console.warn("actores:", x.a?.tipo, e);
          this.matar(x);
        }
      }
      for (let i = this.efectos.length - 1; i >= 0; i--) {
        const e = this.efectos[i];
        let sigue = false;
        try {
          sigue = e.cuadro();
        } catch (er) {
          console.warn("actores: efecto", er);
        }
        if (!sigue) {
          e.quitar?.();
          this.efectos.splice(i, 1);
        }
      }
    }
    for (const x of this.actores.slice()) {
      try {
        x.dibujar?.();
      } catch (e) {
        console.warn("actores:", x.a?.tipo, e);
        this.matar(x);
      }
    }
    for (const e of this.efectos) {
      try {
        e.dibujar?.();
      } catch {}
    }
  }
  destruir() {
    this.destruido = true;
    VIVOS.delete(this);
    for (const x of this.actores.slice()) this.matar(x);
    for (const e of this.efectos) e.quitar?.();
    this.efectos = [];
    this.blancos = [];
    this.porNombre.clear();
  }
  piso(p, arriba = .5) {
    const ms = this.ctx.pisos?.();
    if (!ms?.length) return null;
    const rc = this._rc ||= new THREE.Raycaster;
    rc.set(new THREE.Vector3(p.x, p.y + arriba, p.z), new THREE.Vector3(0, -1, 0));
    rc.far = 20;
    const h = rc.intersectObjects(ms, false).find(x => !x.object.userData.extra);
    return h ? h.point.y : null;
  }
  chispas(pos, escala = 1, dirMat = null) {
    return this.efecto(new Chispas(this, pos, escala, dirMat));
  }
  plasma(p1, p2, cuadros, ancho = null) {
    return this.efecto(new Plasma(this, p1, p2, cuadros, ancho));
  }
  humo(pos, vel) {
    return this.efecto(new Humo(this, pos, vel));
  }
  anime(def, pre, mat = null) {
    return this.efecto(new Anime(this, {
      ...def,
      pre: (Array.isArray(pre) ? pre : [ pre ]).map(q => ({
        speed: [ 0, 0, 0 ],
        scr: 0,
        anim: 0,
        ...q
      })),
      mat: mat
    }));
  }
  meltDie(pos, n = 60) {
    const E = this;
    let c1 = n, c2 = Math.trunc(n / 4);
    const puff = r => E.anime(ANIME_GRUA_B, {
      pos: [ pos[0] + randS(r), pos[1], pos[2] + randS(r) ],
      speed: [ 0, randU(128) + 64, 0 ],
      scr: 1
    });
    return this.efecto({
      cuadro() {
        if (--c1 > 0) {
          if (c1 % 6 === 0) puff(512);
          return true;
        }
        if (--c2 > 0) {
          if (!(c1 & 3)) puff(256);
          return true;
        }
        return false;
      }
    });
  }
}

class Chispas {
  constructor(E, pos, escala = 1, q = null) {
    this.E = E;
    this.t = 32;
    this.vel = [];
    this.p = [];
    const qq = q || (new THREE.Quaternion).setFromEuler(new THREE.Euler(randU(2048) * ANG, randU(4096) * ANG, 0, "YXZ"));
    for (let i = 0; i < 32; i++) {
      const r = new THREE.Euler(randS(512) * ANG, randS(512) * ANG, 0, "YXZ");
      const v = new THREE.Vector3(0, 0, (randU(256) + 64) * escala).applyEuler(r).applyQuaternion(qq);
      this.vel.push(v);
      this.p.push([ v.clone(), v.clone().multiplyScalar(.25) ]);
    }
    this.base = pos.clone();
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(32 * 6), 3));
    this.mat = new THREE.LineBasicMaterial({
      color: 16744576,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    this.obj = new THREE.LineSegments(g, this.mat);
    this.obj.frustumCulled = false;
    this.obj.userData.propio = this.obj.userData.sinColision = true;
    E.agregar(this.obj);
    this.escribir();
    E.sonido(SE.CHISPAS, pos);
  }
  cuadro() {
    if (--this.t <= 0) return false;
    for (let i = 0; i < 32; i++) {
      const v = this.vel[i], [a, b] = this.p[i];
      b.copy(a);
      a.add(v);
      v.x -= Math.trunc(v.x / 4);
      v.y -= Math.trunc(v.y / 4) + 3;
      v.z -= Math.trunc(v.z / 4);
    }
    this.base.y -= 16 * MM;
    const b = Math.min(255, this.t * 16 + 50) / 255;
    this.mat.color.setRGB(b, b / 2, b / 2);
    this.escribir();
    return true;
  }
  escribir() {
    const at = this.obj.geometry.attributes.position, o = this.base;
    for (let i = 0; i < 32; i++) {
      const [a, b] = this.p[i];
      at.setXYZ(i * 2, o.x + a.x * MM, o.y + a.y * MM, o.z + a.z * MM);
      at.setXYZ(i * 2 + 1, o.x + b.x * MM, o.y + b.y * MM, o.z + b.z * MM);
    }
    at.needsUpdate = true;
  }
  quitar() {
    this.obj.removeFromParent();
    this.obj.geometry.dispose();
  }
}

class Plasma {
  constructor(E, p1, p2, cuadros, ancho) {
    this.E = E;
    this.p1 = p1.clone();
    this.p2 = p2.clone();
    this.t = Math.max(1, cuadros | 0);
    this.n = 16;
    const largo = p1.distanceTo(p2) * 1e3;
    this.ancho = ancho ?? Math.max(40, largo / 128) * MM;
    this.desv = largo / 4 * MM;
    this.lados = Array.from({
      length: this.n + 1
    }, () => new THREE.Vector2);
    this.obj = mallaQuads(this.n, materialPS1(E.tex("plasma"), 1, [ 128, 128, 128 ]));
    E.agregar(this.obj);
    this.mover();
    this.dibujar();
  }
  mover() {
    for (let i = 1; i < this.n; i++) {
      const L = this.lados[i], lim = this.desv * Math.sin(i / this.n * Math.PI);
      L.x = THREE.MathUtils.clamp(L.x + (Math.random() - .5) * this.desv * .5, -lim, lim);
      L.y = THREE.MathUtils.clamp(L.y + (Math.random() - .5) * this.desv * .5, -lim, lim);
    }
  }
  cuadro() {
    if (--this.t < 0) return false;
    this.mover();
    return true;
  }
  dibujar() {
    const cam = this.E.din.cam, at = this.obj.geometry.attributes.position, d = this.p2.clone().sub(this.p1);
    const ojo = new THREE.Vector3;
    cam?.getWorldPosition(ojo);
    const u = new THREE.Vector3(0, 1, 0).cross(d).normalize();
    if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
    const w = d.clone().cross(u).normalize();
    const pts = this.lados.map((L, i) => this.p1.clone().addScaledVector(d, i / this.n).addScaledVector(u, L.x).addScaledVector(w, L.y));
    for (let i = 0; i < this.n; i++) {
      const a = pts[i], b = pts[i + 1], s = b.clone().sub(a), vista = a.clone().sub(ojo);
      const lado = s.clone().cross(vista).normalize().multiplyScalar(this.ancho / 2);
      at.setXYZ(i * 4, a.x - lado.x, a.y - lado.y, a.z - lado.z);
      at.setXYZ(i * 4 + 1, b.x - lado.x, b.y - lado.y, b.z - lado.z);
      at.setXYZ(i * 4 + 2, a.x + lado.x, a.y + lado.y, a.z + lado.z);
      at.setXYZ(i * 4 + 3, b.x + lado.x, b.y + lado.y, b.z + lado.z);
    }
    at.needsUpdate = true;
  }
  quitar() {
    this.obj.removeFromParent();
    this.obj.geometry.dispose();
  }
}

class Humo {
  constructor(E, pos, vel) {
    this.E = E;
    this.t = 0;
    this.p = pos.clone();
    this.vel = vel ? new THREE.Vector3(vel[0], vel[1], vel[2]).multiplyScalar(MM) : new THREE.Vector3(0, 10 * MM, 0);
    const t = E.texCopia("smoke");
    t.repeat.set(1 / 8, 1 / 4);
    this.tx = t;
    this.obj = sprite(t, 1, [ 48, 48, 48 ], 300, 300);
    this.obj.position.copy(pos);
    E.agregar(this.obj);
  }
  cuadro() {
    if (++this.t > 30) return false;
    this.p.add(this.vel);
    this.obj.position.copy(this.p);
    const f = Math.min(31, this.t), s = 300 + this.t * 15;
    this.obj.scale.set(s * MM, s * MM, 1);
    this.tx.offset.set(f % 8 / 8, 1 - (Math.floor(f / 8) + 1) / 4);
    const c = 48 * (1 - this.t / 30);
    ponerColor(this.obj.material, [ c, c, c ], 1);
    return true;
  }
  quitar() {
    this.obj.removeFromParent();
    this.obj.material.dispose();
    this.tx.dispose();
  }
}

class Astillas {
  constructor(E, matriz, medio, piso, n) {
    this.E = E;
    this.t = 32;
    this.n = Math.min(64, n);
    this.piso = piso;
    this.m = matriz;
    const sx = medio.x - 64, sy = medio.y - 64, cada = Math.max(1, Math.trunc(sy / 8));
    this.v = [];
    this.vel = [];
    this.espera = [];
    for (let i = 0; i < this.n; i++) {
      const x = Math.trunc(Math.random() * 2 * sx) - sx, y = Math.trunc(Math.random() * 2 * sy) - sy;
      this.v.push([ [ x + randU(128), y + randU(128), 0 ], [ x + randU(128), y - randU(128), 0 ], [ x - randU(128), y + randU(128), 0 ], [ x - randU(64), y - randU(64), 0 ] ]);
      this.vel.push([ Math.trunc(x / 64), 0, y > 0 ? 32 - Math.trunc(y / 32) : Math.trunc(y / 32) + 32 ]);
      this.espera.push(y > 0 ? Math.trunc(y / cada) - 3 : Math.trunc(-y / cada) + 3);
    }
    const info = E.infoTex?.glass || {
      w: 180,
      h: 120
    }, w = info.w, h = info.h;
    const uv = uvRect(w, h, Math.trunc(w * 3 / 4), 0, w - 1, h - 1);
    this.mat = materialPS1(E.tex("glass"), 0, [ 255, 255, 255 ]);
    this.obj = mallaQuads(this.n, this.mat, () => uv);
    this.obj.matrixAutoUpdate = false;
    this.obj.matrix.copy(matriz);
    E.agregar(this.obj);
    this.escribir();
  }
  cuadro() {
    if (--this.t <= 0) return false;
    for (let i = 0; i < this.n; i++) {
      if (--this.espera[i] > 0) continue;
      const v = this.vel[i], q = this.v[i];
      v[1] -= 12;
      if (q[0][1] < this.piso) {
        v[0] -= Math.trunc(v[0] / 4);
        v[2] -= Math.trunc(v[2] / 4);
        v[1] = Math.trunc(-v[1] / 4);
        const z = q[0][2], r = randS(64);
        q[1][2] = z + r;
        q[2][2] = z - r;
      }
      for (const p of q) {
        p[0] += v[0];
        p[1] += v[1];
        p[2] += v[2];
      }
    }
    ponerColor(this.mat, Array(3).fill(Math.min(255, this.t * 3 + 100)), 0);
    this.escribir();
    return true;
  }
  escribir() {
    const at = this.obj.geometry.attributes.position;
    for (let i = 0; i < this.n; i++) for (let k = 0; k < 4; k++) {
      const p = this.v[i][k];
      at.setXYZ(i * 4 + k, p[0] * MM, p[1] * MM, p[2] * MM);
    }
    at.needsUpdate = true;
  }
  quitar() {
    this.obj.removeFromParent();
    this.obj.geometry.dispose();
  }
}

class Papeles {
  constructor(E, pos, giroY) {
    this.E = E;
    this.t = 64;
    this.n = 8;
    this.base = pos.clone();
    this.giro = giroY;
    const esq = [ [ -105, 0, 145 ], [ 105, 0, 145 ], [ -105, 0, -145 ], [ 105, 0, -145 ] ];
    this.v = [];
    this.off = [];
    this.vel = [];
    for (let i = 0; i < this.n; i++) {
      const e = new THREE.Euler(randS(128) * ANG, randS(256) * ANG, randS(128) * ANG, "YXZ"), tx = randS(128), tz = randS(128);
      this.v.push(esq.map(c => {
        const p = new THREE.Vector3(...c).applyEuler(e);
        return [ p.x + tx, p.y, p.z + tz ];
      }));
      this.off.push([ randS(32), randS(64) + 150, randU(32) + 32 ]);
      this.vel.push([ randS(8), randU(8), 0 ]);
    }
    this.mat = new THREE.MeshBasicMaterial({
      map: E.tex("paper"),
      side: THREE.DoubleSide,
      alphaTest: .5,
      fog: false
    });
    this.obj = mallaQuads(this.n, this.mat);
    this.obj.position.copy(pos);
    this.obj.rotation.y = giroY;
    E.agregar(this.obj);
    this.escribir();
  }
  cuadro() {
    if (--this.t <= 0) return false;
    for (let i = 0; i < this.n; i++) {
      const o = this.off[i], s = this.vel[i];
      let x = o[0], y = o[1], z = o[2];
      s[0] += x > 0 ? -2 : 2;
      s[2] += z > 0 ? -2 : 2;
      o[0] += s[0];
      o[2] += s[2];
      if (y > 0) {
        x *= 2;
        z *= 2;
        o[1] -= 12;
      } else if (++o[1] > 0) {
        o[1] = -24;
        s[0] = randS(8);
        s[2] = randS(8);
      }
      for (const p of this.v[i]) {
        p[0] += x;
        p[1] += y;
        p[2] += z;
      }
    }
    const c = Math.min(128, this.t * 4 + 50) / 128;
    this.mat.color.setRGB(c, c, c, THREE.SRGBColorSpace);
    this.escribir();
    return true;
  }
  escribir() {
    const at = this.obj.geometry.attributes.position;
    for (let i = 0; i < this.n; i++) for (let k = 0; k < 4; k++) {
      const p = this.v[i][k];
      at.setXYZ(i * 4 + k, p[0] * MM, p[1] * MM, p[2] * MM);
    }
    at.needsUpdate = true;
  }
  quitar() {
    this.obj.removeFromParent();
    this.obj.geometry.dispose();
  }
}

class Vidrio {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    const p = a.p || lista(a, "p"), s = lista(a, "s");
    this.pos = v3(p);
    this.medio = new THREE.Vector3(Math.abs(s[0] || 0), Math.abs(s[1] || 0), Math.abs(s[2] || 0));
    this.vida = 3;
    this.proc = procDe(a, "e");
    this.n = num(a, "n", 64);
    this.pisoF = -num(a, "f", p[1]);
    this.pisoB = -num(a, "b", -this.pisoF);
    this.w = num(a, "w", 125);
    this.giro = eulerYXZ(a.d || lista(a, "d"));
    this.matriz = (new THREE.Matrix4).compose(this.pos, (new THREE.Quaternion).setFromEuler(this.giro), new THREE.Vector3(1, 1, 1));
  }
  iniciar() {
    const E = this.E, x = this.medio.x * MM, y = this.medio.y * MM;
    this.info = E.infoTex?.glass || {
      w: 180,
      h: 120
    };
    this.mat = materialPS1(E.tex("glass"), 0, [ 128, 128, 128 ]);
    this.obj = mallaQuads(2, this.mat);
    const at = this.obj.geometry.attributes.position;
    [ [ -x, y ], [ x, y ], [ -x, 0 ], [ x, 0 ], [ -x, 0 ], [ x, 0 ], [ -x, -y ], [ x, -y ] ].forEach(([vx, vy], i) => at.setXYZ(i, vx, vy, 0));
    this.ponerUV(0);
    this.obj.position.copy(this.pos);
    this.obj.rotation.copy(this.giro);
    this.obj.renderOrder = 4;
    E.agregar(this.obj);
    this.objs = [ this.obj ];
    const pared = new THREE.Mesh(new THREE.BoxGeometry(2 * x, 2 * y, 2 * this.w * MM), new THREE.MeshBasicMaterial({
      visible: false
    }));
    pared.position.copy(this.pos);
    pared.rotation.copy(this.giro);
    pared.userData.propio = true;
    pared.userData.extra = true;
    E.agregar(pared);
    this.pared = pared;
    E.din.paredes?.push(pared);
    this.objs.push(pared);
    const m = this.medio.clone().applyEuler(this.giro);
    const med = new THREE.Vector3(Math.max(150, Math.abs(m.x)), Math.max(150, Math.abs(m.y)), Math.max(150, Math.abs(m.z))).multiplyScalar(MM);
    E.blanco(this, this.pos.clone(), med, (modo, dir) => this.golpe(modo, dir));
  }
  ponerUV(k) {
    const {w: w, h: h} = this.info, uv = this.obj.geometry.attributes.uv;
    const u0 = Math.trunc(w * k / 3), u1 = Math.trunc(w * (k + 1) / 3) - 1;
    uv.array.set(uvRect(w, h, u0, 0, u1, Math.trunc(h / 2) - 1), 0);
    uv.array.set(uvRect(w, h, u0, Math.trunc(h / 2), u1, h - 1), 8);
    uv.needsUpdate = true;
  }
  golpe(modo, dir) {
    if (this.roto) return;
    if (modo === 1) this.vida--; else if (modo === 2) this.vida = 0; else return;
    if (this.vida > 0) {
      this.E.sonido(SE.VIDRIO_RAJA, this.pos);
      this.ponerUV(3 - this.vida);
      return;
    }
    this.roto = true;
    this.E.sonido(SE.VIDRIO_ROMPE, this.pos);
    const local = dir.clone().applyQuaternion((new THREE.Quaternion).setFromEuler(this.giro).invert());
    let m = this.matriz.clone(), piso = this.pisoF;
    if (!(local.z > 0)) {
      m = this.matriz.clone().multiply((new THREE.Matrix4).makeRotationY(Math.PI));
      piso = this.pisoB;
    }
    this.E.efecto(new Astillas(this.E, m, this.medio, piso, this.n));
    this.E.proc(this.proc);
    this.E.matar(this);
  }
  morir() {
    const P = this.E.din.paredes, i = P ? P.indexOf(this.pared) : -1;
    if (i >= 0) P.splice(i, 1);
    this.E.din.alCambiarParedes?.();
  }
}

class Silla {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.pos = v3(a.p || lista(a, "p"));
    const d = a.d || lista(a, "d");
    this.rot = new THREE.Vector3(d[0] || 0, d[1] || 0, d[2] || 0);
    this.giro = this.rot.clone();
    this.vy = 0;
    this.salto = false;
    this.proc = procDe(a, "e");
  }
  async iniciar() {
    const E = this.E, o = await E.ctx.cargar("actores/isu.glb");
    o.traverse(m => {
      if (m.isMesh) m.userData.extra = true;
    });
    E.ctx.teñir?.(o);
    const caja = (new THREE.Box3).setFromObject(o);
    this.esquinas = [];
    for (let i = 0; i < 8; i++) this.esquinas.push(new THREE.Vector3(i & 1 ? caja.max.x : caja.min.x, i & 2 ? caja.max.y : caja.min.y, i & 4 ? caja.max.z : caja.min.z));
    this.o = o;
    E.agregar(o);
    this.objs = [ o ];
    const piso = E.piso(this.pos, .2);
    this.suelo = piso != null && piso > this.pos.y - 1.5 ? piso : this.pos.y - .5;
    this.pos.y = this.suelo + this.altura();
    this.poner();
    this.b = E.blanco(this, this.pos.clone(), new THREE.Vector3(.5, .5, .5), modo => this.golpe(modo));
  }
  golpe() {
    if (this.salto) return;
    this.salto = true;
    const lado = {
      y: 0,
      z: 0
    };
    if (this.giro.z === 0) {
      this.giro.y += randS(256);
      if (randU(2)) {
        this.giro.z = randS(128) + 724;
        lado.z = 1024;
      } else {
        this.giro.z = randS(128) + 3372;
        lado.z = 3072;
      }
    } else {
      this.giro.y += randS(128);
      if (this.giro.z < 2048) {
        this.giro.z = randS(256) + 1024;
        lado.z = 1024;
      } else {
        this.giro.z = randS(256) + 3072;
        lado.z = 3072;
      }
    }
    this.E.proc(this.proc, [ this.giro.y, lado.z ]);
    this.vy = 128;
  }
  cuadro() {
    if (this.salto) {
      const y = this.pos.y + this.vy * MM, h = this.altura();
      if (y <= this.suelo + h && this.vy < 0) {
        this.pos.y = this.suelo + h;
        this.vy = Math.trunc(-this.vy / 2);
        this.E.sonido(SE.SILLA, this.pos);
        if (this.vy < 32) {
          this.salto = false;
          this.vy = 0;
          this.giro.z = this.giro.z < 2048 ? 1024 : 3072;
        } else this.giro.z = this.giro.z < 2048 ? Math.trunc((1024 - this.giro.z) / 2) + 1024 : Math.trunc((3072 - this.giro.z) / 2) + 3072;
      } else {
        this.pos.y = y;
        this.vy -= 16;
      }
    }
    for (const k of [ "x", "y", "z" ]) this.rot[k] += (this.giro[k] - this.rot[k]) * .35;
    this.poner();
    this.b.centro.copy(this.pos);
  }
  poner() {
    this.o.position.copy(this.pos);
    this.o.rotation.set(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ");
  }
  altura() {
    const e = new THREE.Euler(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ");
    let m = 0;
    for (const c of this.esquinas) m = Math.min(m, c.clone().applyEuler(e).y);
    return -m;
  }
}

class Monitor {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.pos = v3(a.p || lista(a, "p"));
    const d = a.d || lista(a, "d");
    this.rot = new THREE.Vector3(d[0] || 0, (d[1] || 0) + 1024, d[2] || 0);
    this.roto = !!num(a, "b", 0);
    this.proc = procDe(a, "e");
    this.alto = this.pos.y;
    this.vy = 0;
    this.saltando = false;
  }
  async iniciar() {
    this.raiz = new THREE.Group;
    this.E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    await this.modelo(this.roto ? "nanao_d" : "nanao");
    this.poner();
    this.E.blanco(this, this.pos.clone(), new THREE.Vector3(.3, .4, .3), modo => this.golpe(modo));
  }
  async modelo(n) {
    const o = await this.E.ctx.cargar(`actores/${n}.glb`);
    o.traverse(m => {
      if (m.isMesh) m.userData.extra = true;
    });
    this.E.ctx.teñir?.(o);
    this.raiz.clear();
    this.raiz.add(o);
  }
  golpe() {
    if (this.roto) return;
    this.roto = true;
    this.saltando = true;
    this.E.sonido(SE.PANEL, this.pos);
    this.modelo("nanao_d");
    this.rot.z = -randU(128) - 128;
    this.vy = 32;
    const q = (new THREE.Quaternion).setFromEuler(new THREE.Euler(this.rot.z * ANG, (this.rot.y - 1024) * ANG, 0, "YXZ"));
    this.E.chispas(this.pos, 1, q);
    const humo = new THREE.Vector3(0, 0, .35).applyQuaternion(q).add(this.pos);
    this.E.anime(ANIME_PANEL, {
      pos: [ humo.x / MM, humo.y / MM, humo.z / MM ],
      speed: [ randU(4) - 2, randU(4) - 2, randU(4) - 2 ]
    });
    this.E.proc(this.proc);
  }
  cuadro() {
    if (!this.saltando) return;
    if (this.pos.y < this.alto) {
      this.vy = Math.trunc(-this.vy / 4);
      this.pos.y = this.alto;
      if (this.vy < 16) {
        this.saltando = false;
        this.vy = 0;
        this.rot.x = 0;
      }
    } else {
      this.vy -= 16;
    }
    this.pos.y += this.vy * MM;
    this.poner();
  }
  poner() {
    this.raiz.position.copy(this.pos);
    this.raiz.rotation.set(this.rot.x * ANG, this.rot.y * ANG, this.rot.z * ANG, "YXZ");
  }
}

class Papel {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.pos = v3(a.p || lista(a, "p"));
    this.espera = 0;
  }
  iniciar() {
    this.E.blanco(this, this.pos.clone(), new THREE.Vector3(.3, .5, .3), (modo, dir) => this.golpe(dir));
    this.objs = [];
  }
  golpe(dir) {
    if (this.espera) return;
    this.E.sonido(SE.PAPEL, this.pos);
    this.E.efecto(new Papeles(this.E, this.pos, Math.atan2(dir.x, dir.z)));
    this.espera = 25;
  }
  cuadro() {
    if (this.espera) this.espera--;
  }
}

class Charcos {
  constructor(E, a) {
    this.E = E;
    this.a = a;
  }
  iniciar() {
    const ps = vecs(this.a, "p"), ds = vecs(this.a, "d"), ss = lista(this.a, "s"), n = Math.min(16, ps.length);
    if (!n) {
      this.muerto = true;
      return;
    }
    const mat = materialPS1(this.E.tex("ketchap_grey"), num(this.a, "u", 0) & 3, lista(this.a, "c").concat([ 0, 0, 0 ]).slice(0, 3), {
      unaCara: true,
      subir: 4
    });
    const m = mallaQuads(n, mat), at = m.geometry.attributes.position;
    for (let i = 0; i < n; i++) {
      const s = ss[i] ?? 0, e = eulerYXZ(ds[i]), p = v3(ps[i]);
      [ [ s, 0, s ], [ -s, 0, s ], [ s, 0, -s ], [ -s, 0, -s ] ].forEach((c, k) => {
        const q = new THREE.Vector3(c[0] * MM, c[1] * MM, c[2] * MM).applyEuler(e).add(p);
        at.setXYZ(i * 4 + k, q.x, q.y + .003, q.z);
      });
    }
    m.geometry.computeBoundingSphere();
    this.E.agregar(m);
    this.objs = [ m ];
  }
}

class CharcoQueCrece {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.t = 0;
    this.fin = Math.max(1, num(a, "t", 1));
    this.s = num(a, "s", 0);
  }
  iniciar() {
    const a = this.a;
    this.p = v3(a.p || lista(a, "p"));
    this.e = eulerYXZ(a.d || lista(a, "d"));
    const mat = materialPS1(this.E.tex("ketchap_grey"), num(a, "u", 0) & 3, lista(a, "c").concat([ 0, 0, 0 ]).slice(0, 3), {
      unaCara: true,
      subir: 4
    });
    this.m = mallaQuads(1, mat);
    this.E.agregar(this.m);
    this.objs = [ this.m ];
    this.poner(0);
  }
  cuadro() {
    if (this.t < this.fin) {
      this.t++;
      this.poner(Math.trunc(this.s * this.t / this.fin));
    }
  }
  poner(s) {
    const at = this.m.geometry.attributes.position;
    [ [ s, 0, s ], [ -s, 0, s ], [ s, 0, -s ], [ -s, 0, -s ] ].forEach((c, k) => {
      const q = new THREE.Vector3(c[0] * MM, 0, c[2] * MM).applyEuler(this.e).add(this.p);
      at.setXYZ(k, q.x, q.y + .003, q.z);
    });
    at.needsUpdate = true;
    this.m.geometry.computeBoundingSphere();
  }
}

class Brillos {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.blink = a.tipo === "BLINKTEX";
    this.k = 0;
  }
  iniciar() {
    const a = this.a, ps = vecs(a, "p").slice(0, 8);
    if (!ps.length) {
      this.muerto = true;
      return;
    }
    let nombre = "sfex0236";
    if (this.blink) {
      const t = a.opts?.t?.[0];
      const id = typeof t === "object" ? t?.id : t;
      if (id != null && id !== 9185) nombre = id.toString(16).padStart(4, "0");
    }
    const modo = this.E.infoTex?.[nombre]?.semi ?? 1;
    this.colores = this.blink ? a.opts?.n ? [ 36, 36 ] : [ 30, 36 ] : [ 64, 72 ];
    this.ss = ps.map(p => {
      const s = sprite(this.E.tex(nombre), modo, [ this.colores[0], this.colores[0], this.colores[0] ], 2e3, 2e3);
      s.position.copy(v3(p));
      this.E.agregar(s);
      return s;
    });
    this.objs = this.ss;
    this.modo = modo;
  }
  cuadro() {
    this.k ^= 1;
    const c = this.colores[this.k];
    for (const s of this.ss) ponerColor(s.material, [ c, c, c ], this.modo);
  }
}

class SonidoAmbiente {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.p = v3(a.p || lista(a, "p"));
    this.efecto = num(a, "n", 0);
    this.modo = num(a, "t", 0);
    this.cada = num(a, "i", 0);
    this.veces = num(a, "c", 0);
    this.radio = num(a, "r", 0);
    this.va = num(a, "s", 0);
    this.quedan = this.veces;
    this.t = 0;
    this.objs = [];
  }
  mensaje(h) {
    if (h === MSG.ENV_PARA) this.va = 0; else if (h === MSG.ENV_EMPIEZA) {
      this.va = 1;
      this.quedan = this.veces;
      this.t = 0;
    }
  }
  cuadro() {
    if (!this.va) return;
    if (this.t <= 0) {
      const j = this.E.jugador();
      if (this.modo === 0 && this.radio > 0 && j && j.distanceTo(this.p) * 1e3 > this.radio) {} else this.E.sonido(this.efecto, this.p, this.modo === 4 ? "bomba" : null);
      if (this.veces >= 0 && --this.quedan === 0) {
        this.va = 0;
        return;
      }
      this.t = this.cada;
    }
    this.t--;
  }
}

class Vapor {
  constructor(E, a, pos) {
    this.E = E;
    this.a = a;
    this.pos = pos;
    this.f = randU(31);
    this.c = 0;
    this.estado = 0;
    this.prox = 0;
    this.color = 128;
  }
  iniciar() {
    const t = this.E.texCopia("smoke");
    t.repeat.set(1 / 8, 1 / 4);
    this.tx = t;
    this.s = sprite(t, 1, [ 128, 128, 128 ], 1e3, 2e3);
    this.s.position.copy(this.pos);
    this.E.agregar(this.s);
    this.objs = [ this.s ];
  }
  cuadro() {
    switch (this.estado) {
     case 0:
      if (this.c > 100) {
        this.c = 0;
        this.estado = 1;
      }
      this.c++;
      break;

     case 1:
      if (this.c > 128) {
        this.c = 30;
        this.prox = 2;
        this.estado = 5;
      } else {
        this.color = 64 - (this.c >> 1);
        this.c++;
      }
      break;

     case 2:
      if (this.c > 128) {
        this.c = 0;
        this.estado = 0;
      } else {
        this.color = this.c >> 1;
        this.c++;
      }
      break;

     case 5:
      if (--this.c <= 0) {
        this.c = 0;
        this.estado = this.prox;
      }
      break;
    }
    if (++this.f >= 59) this.f = 0;
    const k = this.f >> 1, col = (k & 15) % 8, fila = k >> 3 & 3;
    this.tx.offset.set(col / 8, 1 - (fila + 1) / 4);
    ponerColor(this.s.material, [ this.color, this.color, this.color ], 1);
  }
}

class PisoElectrico {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.on = !!num(a, "a", 0);
    this.i = 0;
    this.c = [ 0, 0, 0 ];
  }
  async iniciar() {
    const o = await this.E.ctx.cargar("actores/piso_08a.glb");
    this.mats = [];
    o.traverse(m => {
      if (!m.isMesh) return;
      m.userData.sinColision = true;
      m.userData.extra = true;
      const mat = materialPS1(m.material.map || null, 1, [ 0, 0, 0 ], {
        subir: 8
      });
      m.material = mat;
      this.mats.push(mat);
      m.renderOrder = 3;
    });
    this.o = o;
    this.E.agregar(o);
    this.objs = [ o ];
  }
  mensaje(h) {
    if (h === MSG.ON2) this.on = true; else if (h === MSG.OFF2) this.on = false;
  }
  cuadro() {
    this.i++;
    if (this.on) {
      const s = rsin(this.i * 64);
      this.c = [ Math.trunc(s / 512) + 16, Math.trunc(s * 20 / 4096) + 40, Math.trunc(s / 128) + 64 ];
      if (this.i & 1) this.c = this.c.map(v => Math.trunc(v * 3 / 4));
    } else this.c = this.c.map(v => {
      const n = v + Math.trunc((1 - v) / 4);
      return n < 5 ? 1 : n;
    });
    for (const m of this.mats) ponerColor(m, this.c, 1);
  }
}

class ChispasPiso {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    const b = vecs(a, "b");
    this.b0 = b[0] || [ 0, 0, 0 ];
    this.b1 = b[1] || this.b0;
    this.cada = num(a, "t", 30);
    this.t = this.cada;
    this.largo = num(a, "l", 1e3);
    this.va = false;
    this.objs = [];
  }
  mensaje(h) {
    if (h === MSG.EMPIEZA) this.va = true; else if (h === MSG.PARA) this.va = false;
  }
  punto() {
    const t = randU(4096);
    return [ this.b0[0] + Math.trunc((this.b1[0] - this.b0[0]) * t / 4096), this.b0[1], this.b0[2] + Math.trunc((this.b1[2] - this.b0[2]) * t / 4096) ];
  }
  cerca() {
    const j = this.E.jugador();
    return j && j.z * 1e3 > -6e3;
  }
  cuadro() {
    if (!this.va) return;
    if (randU(64) === 0) {
      this.p1 = this.punto();
      if (this.cerca()) this.E.sonido(SE.ELECTRICO, v3(this.p1));
    }
    if (this.t-- < 0) {
      this.t = this.cada + Math.trunc(this.cada * randS(4096) / 4096);
      this.p1 = this.punto();
      const r = randU(4096) * ANG, l = this.largo + Math.trunc(this.largo * randU(4096) / 8192);
      const p2 = [ this.p1[0] + Math.round(Math.cos(r) * l), this.p1[1], this.p1[2] - Math.round(Math.sin(r) * l) ];
      p2[0] = THREE.MathUtils.clamp(p2[0], Math.min(this.b0[0], this.b1[0]), Math.max(this.b0[0], this.b1[0]));
      p2[2] = THREE.MathUtils.clamp(p2[2], Math.min(this.b0[2], this.b1[2]), Math.max(this.b0[2], this.b1[2]));
      this.E.plasma(v3(this.p1), v3(p2), Math.max(1, this.t));
      if (this.cerca()) {
        this.E.sonido(SE.ELECTRICO, v3(this.p1));
        const k = randU(4096) / 4096, q = v3(this.p1).lerp(v3(p2), k);
        this.E.chispas(q, (randU(256) + 1024) / 4096);
      }
    }
  }
}

class ChispasPared {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    const b = vecs(a, "b");
    this.b0 = b[0] || [ 0, 0, 0 ];
    this.b1 = b[1] || this.b0;
    this.alto = num(a, "h", 0);
    this.va = false;
    this.objs = [];
  }
  mensaje(h) {
    if (h === MSG.EMPIEZA) this.va = true; else if (h === MSG.PARA) this.va = false;
  }
  punto() {
    const r = randU(256);
    return [ this.b0[0] + ((this.b1[0] - this.b0[0]) * r >> 8), this.b0[1] + (this.alto * randU(256) >> 8), this.b0[2] + ((this.b1[2] - this.b0[2]) * r >> 8) ];
  }
  cuadro() {
    if (!this.va) return;
    const p = this.punto();
    if (randU(32) === 0) {
      this.E.plasma(v3(p), v3(this.punto()), 4);
      this.E.sonido(SE.ELECTRICO, v3(p));
    }
    if (randU(64) === 0) this.E.chispas(v3(p), (randU(256) + 1024) / 4096);
    if (randU(8) === 0) this.E.anime(ANIME_SMOKE_LN1, {
      pos: p.slice(),
      speed: [ 0, 10, 0 ]
    });
  }
}

class ChispasMuerte {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.t = num(a, "t", -1);
    this.s = 0;
    this.objs = [];
    this.cad = [ [ 12, 11, 10, 0, 1, 2, 3, 4 ], [ 15, 14, 13, 0, 1, 7, 8, 9 ] ];
    this.i = [ 0, 0 ];
    this.paso = [ 1, 1 ];
    this.de = [ 0, 0 ];
    this.a_ = [ 1, 1 ];
  }
  cuadro() {
    for (let k = 0; k < 2; k++) {
      if (randU(2) === 0) {
        this.de[k] = this.a_[k];
        this.i[k] += this.paso[k];
        if (this.i[k] >= 8) {
          this.i[k] = 6;
          this.paso[k] = -this.paso[k];
        } else if (this.i[k] < 0) {
          this.i[k] = 1;
          this.paso[k] = -this.paso[k];
        }
        this.a_[k] = this.i[k];
      }
      const p0 = this.E.hueso(this.cad[k][this.de[k]]), p1 = this.E.hueso(this.cad[k][this.a_[k]]);
      if (p0 && p1) this.E.plasma(p0, p1, 1, .03);
    }
    if (randU(8) === 0) {
      const p = this.E.hueso(randU(16));
      if (p) this.E.chispas(p, (randU(512) + 1024) / 4096);
    }
    {
      const p = this.E.hueso(randU(16));
      if (p) this.E.anime(ANIME_SMOKE_LN1, {
        pos: [ p.x / MM, p.y / MM, p.z / MM ],
        speed: [ 0, 10, 0 ]
      });
    }
    if (--this.s < 0) {
      this.s = randU(4) + 5;
      this.E.sonido(SE.DESCARGA, null);
    }
    if (this.t > 0 && --this.t === 0) this.E.matar(this);
  }
}

class Burbujas {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    const b = vecs(a, "b");
    this.b0 = b[0] || [ 0, 0, 0 ];
    this.b1 = b[1] || this.b0;
    this.onda = num(a, "r", 0);
    const s = lista(a, "s");
    this.corr = [ s[0] || 0, s[1] || 0, s[2] || 0 ];
    this.vivas = [ false, false, false, false ];
    this.pos = [ [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ], [ 0, 0, 0 ] ];
    this.c = [ 0, 0, 0, 0 ];
    this.n = 0;
    this.dentro = false;
  }
  iniciar() {
    this.ss = this.pos.map(() => {
      const s = sprite(this.E.tex("awa_s"), 1, [ 64, 64, 64 ], 30, 30);
      s.visible = false;
      this.E.agregar(s);
      return s;
    });
    this.objs = this.ss;
  }
  mensaje(h) {
    if (h === MSG.BURBUJA_REVIENTA || h === MSG.KILL) this.E.matar(this);
  }
  nueva(p) {
    for (let i = 0; i < 4; i++) if (!this.vivas[i]) {
      this.vivas[i] = true;
      this.c[i] = 0;
      this.pos[i] = p.slice();
      this.n++;
      return;
    }
  }
  cuadro() {
    const h = this.E.hueso(6), c = h ? [ h.x * 1e3, h.y * 1e3, h.z * 1e3 ] : null;
    const adentro = c && c[0] > this.b0[0] && c[1] > this.b0[1] && c[2] > this.b0[2] && c[0] < this.b1[0] && c[1] < this.b1[1] && c[2] < this.b1[2];
    if (adentro) {
      if (this.n < 4 && randU(32) === 0) this.nueva(c);
    } else if (this.n < 4 && this.E.cuadros & 16) this.nueva([ this.b0[0] + ((this.b1[0] - this.b0[0]) * randU(4096) >> 12), this.b0[1], this.b0[2] + ((this.b1[2] - this.b0[2]) * randU(4096) >> 12) ]);
    for (let i = 0; i < 4; i++) {
      const s = this.ss[i];
      s.visible = this.vivas[i];
      if (!this.vivas[i]) continue;
      const p = this.pos[i], t = Math.min(40, (++this.c[i] >> 3) + 20);
      p[0] += this.corr[0] + randS(16);
      p[1] += this.corr[1] + 15;
      p[2] += this.corr[2] + randS(16);
      const w = t + (randU(4096) % t >> 2);
      s.scale.set(w * MM, t * MM, 1);
      s.position.set(p[0] * MM, p[1] * MM, p[2] * MM);
      if (p[1] > this.b1[1]) {
        this.vivas[i] = false;
        this.n--;
        s.visible = false;
        if (this.onda) this.E.din.onda?.(p[0], p[1], p[2], 2e3);
      }
    }
  }
}

class Zambullida {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.t = 0;
    this.corr = [ 0, -3, 0 ];
  }
  iniciar() {
    const h = this.E.hueso(6) || this.E.jugador() || new THREE.Vector3;
    const p = n => Array.from({
      length: n
    }, () => [ randS(32), randS(32), randU(32) + 50 ]);
    this.g = [ {
      tex: "awa_s",
      ps: p(4)
    }, {
      tex: "awa_2",
      ps: p(16)
    }, {
      tex: "awa_3",
      ps: p(16)
    } ];
    this.base = h.clone();
    this.objs = [];
    for (const g of this.g) g.ss = g.ps.map(() => {
      const s = sprite(this.E.tex(g.tex), 3, [ 255, 255, 255 ], 20, 20);
      this.E.agregar(s);
      this.objs.push(s);
      return s;
    });
  }
  cuadro() {
    if (++this.t >= 48) {
      this.E.matar(this);
      return;
    }
    const [cx, cy, cz] = this.corr, tam = [ this.t + 10, (this.t >> 1) + 20, (this.t >> 1) + 20 ];
    this.g[0].ps.forEach(q => {
      q[0] += randS(4) + (cx >> 5);
      q[1] += randU(2) + 3 + cy;
      q[2] += randS(4) + (cz >> 5);
    });
    for (let i = 0; i < 16; i++) {
      const a = this.g[1].ps[i], b = this.g[2].ps[i];
      a[0] += randS(4) + Math.trunc(cx / (i + 24));
      a[1] += cy + i;
      a[2] += randS(4) + Math.trunc(cz / (i + 24));
      b[0] += randS(4) + Math.trunc(cx / (i + 16));
      b[1] += cy + (i >> 1);
      b[2] += randS(4) + Math.trunc(cz / (i + 16));
    }
    const c = Math.trunc((48 - this.t) * 255 / 48);
    this.g.forEach((g, k) => g.ss.forEach((s, i) => {
      const q = g.ps[i];
      s.position.set(this.base.x + q[0] * MM, this.base.y + q[1] * MM, this.base.z + q[2] * MM);
      s.scale.set(tam[k] * 2 * MM, tam[k] * 2 * MM, 1);
      ponerColor(s.material, [ c, c, c ], 3);
    }));
    this.corr = this.corr.map(v => Math.trunc(v * 15 / 16));
  }
}

class Pollitos {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.p = v3(a.p || lista(a, "p"));
  }
  iniciar() {
    this.ss = [ 0, 1, 2 ].map(() => {
      const s = sprite(this.E.tex("hosi"), 1, [ 128, 128, 128 ], 100, 100);
      this.E.agregar(s);
      return s;
    });
    this.objs = this.ss;
    this.dibujar();
  }
  dibujar() {
    const g = this.E.cuadros * 256 * ANG;
    this.ss.forEach((s, i) => {
      const r = g + i * (Math.PI * 2 / 3);
      s.position.set(this.p.x + Math.cos(r) * .1, this.p.y, this.p.z - Math.sin(r) * .1);
    });
  }
}

class Gusanos {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.cs = vecs(a, "c");
    if (!this.cs.length) this.cs = [ [ 0, 0, 0 ] ];
    this.rs = lista(a, "r");
    this.vs = vecs(a, "v");
    this.n = Math.max(1, num(a, "n", 1));
    this.paso = num(a, "m", 0) ? 2 : 4;
    this.t = 0;
  }
  iniciar() {
    this.g = [];
    this.cs.forEach((c, y) => {
      for (let x = 0; x < this.n; x++) {
        const r = this.rs[y] || 100, d = randS(4096) % r, ang = randS(4096) * ANG;
        this.g.push({
          y: y,
          p: [ c[0] + Math.sin(ang) * d, c[1], c[2] + Math.cos(ang) * d ],
          rumbo: randS(4096),
          fase: randU(4096)
        });
      }
    });
    const mat = materialPS1(this.E.tex("uji"), 3, [ 64, 64, 50 ], {
      subir: 2
    });
    this.m = mallaQuads(this.g.length, mat);
    this.E.agregar(this.m);
    this.objs = [ this.m ];
  }
  cuadro() {
    this.t++;
    for (const u of this.g) {
      const k = randU(4);
      if (k === 0) u.rumbo += randU(4096) % (this.paso * 8); else if (k === 1) u.rumbo -= randU(4096) % (this.paso * 8);
      if (randU(16) === 0) {
        const nx = u.p[0] + Math.sin(u.rumbo * ANG) * this.paso, nz = u.p[2] + Math.cos(u.rumbo * ANG) * this.paso, c = this.cs[u.y];
        if (Math.hypot(nx - c[0], nz - c[2]) > (this.rs[u.y] || 100)) u.rumbo += 2048; else {
          u.p[0] = nx;
          u.p[2] = nz;
        }
      }
    }
  }
  dibujar() {
    const at = this.m.geometry.attributes.position;
    this.g.forEach((u, i) => {
      const z = (rsin((this.t + u.fase) * 64) >> 10) + 14, s = Math.sin(u.rumbo * ANG), c = Math.cos(u.rumbo * ANG);
      [ [ -5, z ], [ 5, z ], [ -5, -z ], [ 5, -z ] ].forEach(([x, w], k) => at.setXYZ(i * 4 + k, (u.p[0] + x * c + w * s) * MM, u.p[1] * MM + .002, (u.p[2] - x * s + w * c) * MM));
    });
    at.needsUpdate = true;
  }
}

class AlarmaRoja {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.largo = Math.max(1, num(a, "t", 64));
    this.modo = num(a, "s", 1) % 3;
    const c = lista(a, "c");
    this.c1 = c.length >= 3 ? c.slice(0, 3) : [ 0, 0, 0 ];
    this.c2 = c.length >= 6 ? c.slice(3, 6) : [ 255, 0, 0 ];
    if (this.modo === 2) {
      this.c1 = this.c1.map(v => 255 - v);
      this.c2 = this.c2.map(v => 255 - v);
    }
    this.estado = 0;
    this.t = 0;
    this.de = [ 0, 0, 0 ];
    this.a_ = [ 0, 0, 0 ];
    this.dur = 1;
    this.k = 0;
    this.color = [ 0, 0, 0 ];
  }
  iniciar() {
    const cam = this.E.din.cam;
    if (!cam) {
      this.muerto = true;
      return;
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false
    });
    if (this.modo === 2) mat.blending = THREE.SubtractiveBlending; else if (this.modo === 1) mat.blending = THREE.AdditiveBlending; else mat.opacity = .5;
    this.q = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
    this.q.position.z = -.12;
    this.q.renderOrder = 999;
    this.q.frustumCulled = false;
    this.q.userData.propio = this.q.userData.sinColision = true;
    cam.add(this.q);
    this.objs = [ this.q ];
  }
  mensaje(h) {
    if (h === MSG.ABRE || h === MSG.OPEN) this.estado = 1; else if (h === MSG.CIERRA || h === MSG.CLOSE || h === MSG.KILL) this.estado = 0;
  }
  cuadro() {
    if (this.estado < -1) return;
    this.t++;
    this.color = this.dur >= this.t ? this.de.map((v, i) => v + Math.trunc((this.a_[i] - v) * this.t / this.dur)) : this.a_.slice();
    if (this.t >= this.dur) {
      this.t = 0;
      this.de = this.a_.slice();
      this.dur = this.largo;
      this.a_ = this.estado === 0 ? [ 0, 0, 0 ] : (this.k === 0 ? this.c1 : this.c2).slice();
      this.k ^= 1;
      if (this.estado === -1) this.estado = -2;
      if (this.estado === 0) this.estado = -1;
    }
    this.q.material.color.setRGB(this.color[0] / 255, this.color[1] / 255, this.color[2] / 255, THREE.SRGBColorSpace);
    this.q.visible = this.color.some(v => v > 0);
  }
}

class Rompible {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.roto = false;
  }
  async iniciar() {
    const a = this.a, m = a.opts?.m || [], id = v => typeof v === "object" ? v?.id : v;
    const st = /niveles\/([^/]+)\//.exec(a.modelo || "")?.[1] || this.E.ctx.st?.();
    const ruta = h => h == null ? null : `niveles/${st}/${h.toString(16).padStart(4, "0")}.glb`;
    this.rutaRoto = ruta(id(m[1]));
    this.raiz = new THREE.Group;
    this.raiz.position.copy(v3(a.p || lista(a, "p")));
    this.raiz.rotation.copy(eulerYXZ(a.d || lista(a, "d")));
    this.raiz.userData.actor = a;
    this.E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    const r0 = a.modelo || ruta(id(m[0]));
    if (r0) {
      try {
        this.raiz.add(await this.E.ctx.cargar(r0));
      } catch (e) {
        console.warn("actores: BREAK_OBJECT", r0, e);
      }
    }
    if (num(a, "a", 0)) {
      const c = (new THREE.Box3).setFromObject(this.raiz), centro = c.isEmpty() ? this.raiz.position.clone() : c.getCenter(new THREE.Vector3);
      this.E.blanco(this, centro, new THREE.Vector3(.1, .1, .1), modo => {
        if (modo === 2) this.romper();
      });
    }
  }
  mensaje(h) {
    if (h === MSG.ROMPE) this.romper();
  }
  async romper() {
    if (!this.rutaRoto) return;
    this.roto = true;
    try {
      const o = await this.E.ctx.cargar(this.rutaRoto);
      this.raiz.clear();
      this.raiz.add(o);
      this.E.ctx.alCambiar?.();
    } catch (e) {
      console.warn("actores: BREAK_OBJECT roto", e);
    }
  }
}

class VaporesDelScript {
  constructor(E, a) {
    this.E = E;
    this.a = a;
  }
  async iniciar() {
    const E = this.E, st = E.ctx.st?.();
    this.objs = [];
    if (!st || E._vapores === st) {
      this.muerto = true;
      return;
    }
    E._vapores = st;
    let sc = null;
    try {
      sc = await fetch(`assets/guion/st/${st}.json`).then(r => r.json());
    } catch {}
    const pos = [], vistos = new Set;
    const buscar = (x, prof = 0) => {
      if (!x || typeof x !== "object" || prof > 40) return;
      if (Array.isArray(x)) {
        for (const y of x) buscar(y, prof + 1);
        return;
      }
      if (x.cmd === "chara" && x.tipo === "SMOKE" && Array.isArray(x.args)) {
        const n = x.args.filter(v => typeof v === "number");
        if (n.length >= 3) {
          const k = n.slice(0, 3).join(",");
          if (!vistos.has(k)) {
            vistos.add(k);
            pos.push(n.slice(0, 3));
          }
        }
      }
      for (const v of Object.values(x)) if (v && typeof v === "object") buscar(v, prof + 1);
    };
    buscar(sc);
    for (const p of pos) {
      const x = new Vapor(E, this.a, v3(p));
      x.iniciar();
      E.actores.push(x);
      this.objs.push(...x.objs);
      (this.hijos ||= []).push(x);
    }
    if (!pos.length) this.muerto = true;
  }
  morir() {
    for (const x of this.hijos || []) this.E.matar(x);
  }
}

class Raton {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.ruta = num(a, "r", 0);
    this.rot = new THREE.Vector3;
    this.c = 0;
    this.mira = -1;
    this.corre = 0;
    this.espera = randU(256) + 128;
    this.sig = 1;
    this.mueve = [ 0, 1, 2, 1, 0, -1, -2, -1 ];
  }
  async iniciar() {
    let pts = [];
    try {
      pts = await (this.E.ctx.ruta?.(this.a.mapa, this.ruta)) || [];
    } catch {}
    this.pts = pts.map(q => (q.p || q).slice(0, 3));
    if (this.pts.length < 2 || this.pts.length >= 32) {
      this.muerto = true;
      return;
    }
    this.pos = this.pts[0].slice();
    const o = await this.E.ctx.cargar("actores/raton.glb");
    o.traverse(m => {
      if (m.isMesh) m.userData.sinColision = m.userData.extra = true;
    });
    this.E.ctx.teñir?.(o);
    this.o = o;
    this.sombra = mallaQuads(1, materialPS1(this.E.tex("shadow"), 2, [ 80, 80, 80 ], {
      subir: 4
    }));
    this.E.agregar(o);
    this.E.agregar(this.sombra);
    this.objs = [ o, this.sombra ];
    this.dibujar();
  }
  hacia(de, a) {
    const dx = a[0] - de[0], dy = a[1] - de[1], dz = a[2] - de[2];
    this.rot.y = Math.round(Math.atan2(dx, dz) / ANG) & 4095;
    this.rot.x = (Math.round(Math.atan2(Math.hypot(dx, dz), dy) / ANG) & 4095) - 1024;
  }
  cuadro() {
    const j = this.E.jugador(), sn = j ? [ j.x * 1e3, j.y * 1e3, j.z * 1e3 ] : [ 1e9, 0, 0 ];
    const lejos = Math.hypot(this.pos[0] - sn[0], this.pos[1] - sn[1], this.pos[2] - sn[2]), destino = this.pts[this.sig];
    this.c++;
    let z = 0;
    if (this.pos[1] < -50) z = 200; else if (this.mira >= 0) {
      if (this.mira === 2) this.E.sonido(29, v3(this.pos));
      this.mira--;
      this.hacia(this.pos, sn);
      this.rot.y -= 512;
      return;
    } else if (this.corre <= 0) {
      if (lejos < 2e3) {
        this.E.sonido(183, null);
        this.mira = 40;
        this.corre = randU(32) + 25;
      } else if (lejos > 4e3) {
        if (randU(512) === 0) {
          this.E.sonido(29, v3(this.pos));
          this.rot.y += this.mueve[this.c % 8] * 32;
        }
        return;
      } else if (--this.espera < 0) {
        this.E.sonido(29, v3(this.pos));
        this.espera = randU(512) + 256;
        z = randU(8) + 8;
        this.corre = randU(4) + 2;
      } else return;
    } else {
      z = 80;
      this.corre--;
    }
    if (Math.hypot(this.pos[0] - destino[0], this.pos[1] - destino[1], this.pos[2] - destino[2]) < z) {
      this.pos = destino.slice();
      if (++this.sig >= this.pts.length) {
        this.E.matar(this);
        return;
      }
    } else {
      this.hacia(this.pos, destino);
      const p = new THREE.Vector3(0, 0, z).applyEuler(new THREE.Euler(this.rot.x * ANG, this.rot.y * ANG, 0, "YXZ"));
      this.pos = [ this.pos[0] + p.x, this.pos[1] + p.y, this.pos[2] + p.z ];
    }
    this.rot.y += this.mueve[this.c % 8] * 64;
  }
  dibujar() {
    if (!this.o) return;
    const p = v3(this.pos), e = new THREE.Euler(this.rot.x * ANG, this.rot.y * ANG, 0, "YXZ");
    this.o.position.copy(p);
    this.o.rotation.copy(e);
    const at = this.sombra.geometry.attributes.position, s = Math.sin(this.rot.y * ANG), c = Math.cos(this.rot.y * ANG);
    const r = (x, z) => [ p.x + (x * c + z * s) * MM, p.y + .002, p.z + (-x * s + z * c) * MM ];
    [ r(48, 96), r(-48, 96), r(48, -96), r(-48, -96) ].forEach((q, k) => at.setXYZ(k, ...q));
    at.needsUpdate = true;
  }
}

class Pisadas {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.lista = [];
    this.mojado = 0;
    this.recorrido = 0;
    this.pie = 0;
    this.antes = null;
    this.objs = [];
    E.huellas = this.lista;
  }
  iniciar() {
    this.mat = materialPS1(this.E.tex("asiato"), 2, [ 48, 48, 48 ], {
      unaCara: true,
      subir: 6
    });
  }
  enTrampa(nombres, p) {
    for (const h of this.E.ctx.hzm?.() || []) for (const g of h?.grupos || []) for (const t of g.triggers || []) {
      if (t.tipo !== "trap" || !nombres.includes(t.nombre) || !t.caja) continue;
      const [a, b] = t.caja;
      if (p[0] >= a[0] && p[0] <= b[0] && p[2] >= a[2] && p[2] <= b[2] && p[1] >= a[1] - 1500 && p[1] <= b[1]) return true;
    }
    return false;
  }
  cuadro() {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const h = this.lista[i];
      if (++h.t > 390) {
        h.m.removeFromParent();
        h.m.geometry.dispose();
        h.m.material.dispose();
        this.lista.splice(i, 1);
        continue;
      }
      const c = 48 - Math.trunc(h.t * 48 / 690);
      ponerColor(h.m.material, [ c, c, c ], 2);
    }
    const j = this.E.jugador();
    if (!j) return;
    const ant = this.antes;
    this.antes = j.clone();
    const sn = this.E.ctx.snake?.() || {};
    const p = [ j.x * 1e3, j.y * 1e3 + 500, j.z * 1e3 ];
    let inicio = 0, deja = false;
    if (this.enTrampa([ "pool" ], p)) this.mojado = 60; else if (this.mojado > 0) {
      inicio = 360 - this.mojado * 2;
      this.mojado--;
      deja = true;
    } else deja = this.enTrampa([ "asiato" ], p);
    if (!ant) return;
    const paso = Math.hypot(j.x - ant.x, j.z - ant.z);
    if (!deja || sn.agachado || sn.reptando || sn.pared || paso > .5) {
      this.recorrido = 0;
      return;
    }
    this.recorrido += paso;
    if (this.recorrido < .55 || this.lista.length >= 48) return;
    this.recorrido = 0;
    this.pie ^= 1;
    const pie = this.E.ctx.hueso?.(this.pie ? 12 : 15), giro = sn.rumbo ?? Math.atan2(ant.x - j.x, ant.z - j.z);
    const q = pie ? pie.clone() : j.clone().add(new THREE.Vector3(Math.cos(giro), 0, -Math.sin(giro)).multiplyScalar(this.pie ? .1 : -.1));
    const piso = this.E.piso(q, .3);
    q.y = piso != null && Math.abs(piso - j.y) < .6 ? piso : j.y;
    const m = mallaQuads(1, this.mat.clone()), at = m.geometry.attributes.position, s = Math.sin(giro), c = Math.cos(giro);
    const esq = this.pie ? [ [ -70, -140 ], [ 70, -140 ], [ -70, 140 ], [ 70, 140 ] ] : [ [ 70, -140 ], [ -70, -140 ], [ 70, 140 ], [ -70, 140 ] ];
    esq.forEach(([x, z], k) => at.setXYZ(k, q.x + (x * c + z * s) * MM, q.y + .003, q.z + (-x * s + z * c) * MM));
    m.geometry.computeBoundingSphere();
    this.E.agregar(m);
    this.lista.push({
      m: m,
      t: inicio,
      p: q
    });
  }
  morir() {
    for (const h of this.lista) {
      h.m.removeFromParent();
      h.m.geometry.dispose();
    }
    this.lista.length = 0;
  }
}

const LAMP = {
  TEX: 56601,
  LOOP: 51847,
  SALTO: 4600,
  ON: 3662,
  OFF: 51495,
  PROGRAMA: 48338
};

const tokVal = x => x && typeof x === "object" ? x.id : x;

class Lampara {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.prog = null;
    this.pc = null;
    this.espera = -1;
    this.vueltas = -1;
    const D = lista(a, "D");
    this.cols = Math.max(1, D[0] || 1);
    this.filas = Math.max(1, D[1] || 1);
    const R = num(a, "R", 8421504);
    this.rgb = [ R & 255, R >> 8 & 255, R >> 16 & 255 ];
    this.semi = Array.isArray(a.opts?.S);
    this.dosCaras = Array.isArray(a.opts?.T);
  }
  async iniciar() {
    const E = this.E, n = await E.numerosDe(this.a, "TEXTURE");
    if (!n || n.length < 8) {
      this.muerto = true;
      return;
    }
    const [x, y, z, rx, ry, rz, ancho, alto, raise = 0] = n;
    this.pos = [ x, y, z ];
    const clave = this.a.nombre + ":" + this.pos.join();
    E._lampVistas ||= new Set;
    if (E._lampVistas.has(clave)) {
      this.muerto = true;
      return;
    }
    E._lampVistas.add(clave);
    this.clave = clave;
    await E.infoLamp;
    this.mat = new THREE.MeshBasicMaterial({
      transparent: true,
      alphaTest: .02,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -Math.min(64, 4 + raise / 25)
    });
    this.m = mallaQuads(this.cols * this.filas, this.mat);
    this.m.renderOrder = 4;
    const at = this.m.geometry.attributes.position, qw = Math.trunc(ancho / this.cols), qh = Math.trunc(alto / this.filas);
    let vy = Math.trunc(alto / 2), i = 0;
    for (let f = 0; f < this.filas; f++, vy -= qh) {
      let vx = Math.trunc(-ancho / 2);
      for (let c = 0; c < this.cols; c++, i++, vx += qw) [ [ vx, vy ], [ vx + qw, vy ], [ vx, vy - qh ], [ vx + qw, vy - qh ] ].forEach(([px, py], k) => at.setXYZ(i * 4 + k, px * MM, py * MM, 0));
    }
    this.m.geometry.computeBoundingSphere();
    this.m.position.copy(v3(this.pos));
    this.m.rotation.set(rx * ANG, ry * ANG, rz * ANG, "ZYX");
    E.agregar(this.m);
    this.objs = [ this.m ];
    this.textura(tokVal(this.a.opts?.I?.[0]) || 0);
  }
  textura(id) {
    if (!this.m) return;
    if (!id) {
      this.m.visible = false;
      return;
    }
    const h = id.toString(16).padStart(4, "0"), info = this.E.lamp?.[h];
    if (!info) {
      this.m.visible = false;
      return;
    }
    if (this.mat.map !== this.E.tex("tex/" + h)) {
      this.mat.map = this.E.tex("tex/" + h);
      this.mat.needsUpdate = true;
    }
    materialLampara(this.mat, info, this.semi, this.rgb);
    const uv = this.m.geometry.attributes.uv;
    let i = 0;
    for (let f = 0; f < this.filas; f++) for (let c = 0; c < this.cols; c++, i++) uv.array.set(uvRect(info.w, info.h, Math.trunc(info.w * c / this.cols), Math.trunc(info.h * f / this.filas), Math.trunc(info.w * (c + 1) / this.cols) - 1, Math.trunc(info.h * (f + 1) / this.filas) - 1), i * 8);
    uv.needsUpdate = true;
    this.m.visible = true;
  }
  morir() {
    this.E._lampVistas?.delete(this.clave);
  }
  listo() {
    this.armada = true;
    for (const [h, v] of (this.cola || []).splice(0)) this.mensaje(h, v);
  }
  programa(letra) {
    const p = this.a.opts?.[String.fromCharCode(letra)];
    this.prog = Array.isArray(p) ? p : null;
    this.pc = this.prog ? 0 : null;
    this.espera = 0;
    this.vueltas = -1;
  }
  mensaje(h, v) {
    if (!this.armada) {
      (this.cola ||= []).push([ h, v ]);
      return;
    }
    if (h === LAMP.ON) {
      this.textura(tokVal(v[1]) || 0);
      this.pc = null;
    } else if (h === LAMP.OFF) {
      this.textura(0);
      this.pc = null;
    } else if (h === LAMP.PROGRAMA) this.programa(tokVal(v[1]));
  }
  cuadro() {
    if (this.espera < 0) return;
    if (this.espera > 0) {
      this.espera--;
      return;
    }
    this.correr();
  }
  correr() {
    if (this.pc == null || !this.prog) {
      this.espera = -1;
      return;
    }
    const P = this.prog;
    for (let guardia = 0; guardia < 64 && this.pc < P.length; guardia++) {
      const tipo = tokVal(P[this.pc++]);
      if (tipo === LAMP.TEX) {
        const t = tokVal(P[this.pc++]) || 0, cuadros = tokVal(P[this.pc++]) || 0;
        this.textura(t);
        this.espera = cuadros;
        return;
      } else if (tipo === LAMP.LOOP) {
        const n = this.pc < P.length && typeof tokVal(P[this.pc]) === "number" && tokVal(P[this.pc]) < 256 ? tokVal(P[this.pc++]) : 0;
        if (this.vueltas >= 0) {
          if (n > 0 && --this.vueltas < 2) {
            this.espera = -1;
            this.pc = null;
            return;
          }
        } else this.vueltas = n;
        this.pc = 0;
      } else if (tipo === LAMP.SALTO) {
        this.programa(tokVal(P[this.pc]));
        if (!this.prog) {
          this.espera = -1;
          return;
        }
        return this.correr();
      } else console.warn("TEX:PARSE ERROR", this.a.nombre, tipo);
    }
    this.espera = -1;
  }
}

Lampara.temprano = true;

function materialLampara(mat, info, semi, rgb) {
  const mezcla = semi && (info.stp ?? 1) >= .5, modo = mezcla ? info.semi : 0;
  ponerColor(mat, rgb, modo);
  const bl = !mezcla ? THREE.NormalBlending : modo === 1 || modo === 3 ? THREE.AdditiveBlending : modo === 2 ? THREE.SubtractiveBlending : THREE.NormalBlending;
  const op = mezcla && modo === 0 ? .5 : 1;
  if (mat.blending !== bl || mat.opacity !== op) {
    mat.blending = bl;
    mat.opacity = op;
    mat.needsUpdate = true;
  }
}

class LucesPanel {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.botones = null;
    this.lamp = null;
    this._sel = -1;
    this._luz = -1;
    this._tex = -1;
  }
  async iniciar() {
    const E = this.E, op = this.a.opts || {}, n = Math.max(1, num(this.a, "n", 3));
    await E.infoLamp;
    const armar = (v, cuantos) => {
      if (!Array.isArray(v) || v.length < 11) return null;
      const [x, y, z, rx, ry, rz, ancho, alto, , raise] = v, tex = tokVal(v[10]), info = E.lamp?.[(tex || 0).toString(16).padStart(4, "0")];
      if (!info) return null;
      const mat = new THREE.MeshBasicMaterial({
        map: E.tex("tex/" + tex.toString(16).padStart(4, "0")),
        transparent: true,
        alphaTest: .02,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -Math.min(64, 4 + (raise || 0) / 25)
      });
      const alt = Math.trunc(Math.trunc(alto / cuantos) / 2), x1 = Math.trunc(ancho / 2);
      const m = mallaQuads(cuantos, mat, i => uvRect(info.w, info.h, 0, Math.trunc(info.h * i / cuantos), info.w - 1, Math.trunc(info.h * (i + 1) / cuantos) - 1));
      const at = m.geometry.attributes.position;
      let top = Math.trunc(alto / 2) - alt;
      for (let i = 0; i < cuantos; i++, top -= alt * 2) [ [ -x1, top + alt ], [ x1, top + alt ], [ -x1, top - alt ], [ x1, top - alt ] ].forEach(([px, py], k) => at.setXYZ(i * 4 + k, px * MM, py * MM, 0));
      m.geometry.computeBoundingSphere();
      m.renderOrder = 4;
      m.position.copy(v3([ x, y, z ]));
      m.rotation.set(rx * ANG, ry * ANG, rz * ANG, "ZYX");
      E.agregar(m);
      this.objs.push(m);
      return {
        m: m,
        mat: mat,
        info: info,
        tex: tex,
        tex2: tokVal(v[11]) || tex,
        n: cuantos
      };
    };
    this.botones = armar(op.p, n);
    if (this.botones) {
      const g = this.botones.m.geometry;
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 12).fill(1), 3));
      this.botones.mat.vertexColors = true;
      materialLampara(this.botones.mat, this.botones.info, true, [ 128, 128, 128 ]);
      this.botones.m.visible = false;
    }
    this.lamp = armar(op.b, 1);
    if (this.lamp) materialLampara(this.lamp.mat, this.lamp.info, true, [ 32, 32, 32 ]);
  }
  panel(visible, sel) {
    const B = this.botones;
    if (!B) return;
    B.m.visible = !!visible;
    if (sel === this._sel) return;
    this._sel = sel;
    const c = B.m.geometry.attributes.color;
    const k255 = (new THREE.Color).setRGB(255 / 128, 0, 0, THREE.SRGBColorSpace).r;
    for (let i = 0; i < B.n; i++) {
      const k = i === sel ? k255 : 1;
      for (let j = 0; j < 4; j++) c.setXYZ(i * 4 + j, k, k, k);
    }
    c.needsUpdate = true;
  }
  luz(prendida, llamado) {
    const L = this.lamp;
    if (!L) return;
    const tex = llamado ? L.tex2 : L.tex;
    if (tex !== this._tex) {
      const h = tex.toString(16).padStart(4, "0"), info = this.E.lamp?.[h];
      if (info) {
        L.mat.map = this.E.tex("tex/" + h);
        L.info = info;
        L.mat.needsUpdate = true;
      }
      this._tex = tex;
      this._luz = -1;
    }
    if (+prendida === this._luz) return;
    this._luz = +prendida;
    materialLampara(L.mat, L.info, true, prendida ? [ 97, 128, 138 ] : [ 32, 32, 32 ]);
  }
}

const strcode = s => {
  let i = 0;
  for (const c of (new TextEncoder).encode(s)) i = ((i << 5 | i >> 11) & 65535) + c & 65535;
  return i;
};

const hashTextura = nombre => {
  const b = /([^/\\]+)\.pcx$/i.exec(nombre || "")?.[1];
  if (!b) return null;
  return /^[0-9a-f]{4}$/.test(b) ? b : strcode(b).toString(16).padStart(4, "0");
};

const SCROLL_TODOS = 21430, SCROLL_SIGUE = 17547, SCROLL_PARA = 43172;

class DesplazaTextura {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.vel = num(a, "s", 1);
    this.n = num(a, "n", 1);
    this.parado = false;
    this.objs = [];
    this.k = 0;
    this.ids = (a.opts?.t || []).map(tokVal).filter(x => typeof x === "number").slice(0, this.n).map(x => x.toString(16).padStart(4, "0"));
    this.texs = new Map;
    (E.porNombre.get(SCROLL_TODOS) || E.porNombre.set(SCROLL_TODOS, []).get(SCROLL_TODOS)).push(this);
  }
  buscar() {
    const quiero = new Set(this.ids);
    (this.E.din.mundo || this.E.din.scene).traverse(o => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [ o.material ]) {
        const t = m?.map, h = hashTextura(t?.name);
        if (!h || !quiero.has(h) || !t || this.texs.has(t) || !t.image?.height) continue;
        t.wrapT = THREE.RepeatWrapping;
        t.needsUpdate = true;
        this.texs.set(t, t.image.height);
      }
    });
  }
  mensaje(h, v) {
    if (h === SCROLL_SIGUE) {
      this.parado = false;
      return;
    }
    if (h === SCROLL_PARA) {
      this.parado = true;
      return;
    }
    let s = h & 511;
    if (s >= 256) s -= 512;
    this.vel = s;
  }
  cuadro() {
    if (this.k++ % 30 === 0) this.buscar();
    if (this.parado || !this.vel) return;
    for (const [t, alto] of this.texs) {
      t.offset.y = (t.offset.y + this.vel / alto) % 1;
    }
  }
  morir() {
    for (const t of this.texs.keys()) t.offset.y = 0;
    const l = this.E.porNombre.get(SCROLL_TODOS);
    if (l) {
      const i = l.indexOf(this);
      if (i >= 0) l.splice(i, 1);
    }
  }
}

class SonidoMovimiento {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.m = num(a, "m", 0);
    this.objs = [];
    this.antes = -1;
    const s = lista(a, "s"), n = num(a, "n", 0);
    this.pares = [];
    for (let i = 0; i + 1 < s.length && this.pares.length < n; i += 2) this.pares.push([ s[i], s[i + 1] ]);
  }
  cuadro() {
    const q = this.E.ctx.accionSnake?.();
    if (!q || q.accion !== this.m) {
      this.antes = -1;
      return;
    }
    if (q.cuadro === this.antes) return;
    const desde = q.cuadro < this.antes ? -1 : this.antes;
    this.antes = q.cuadro;
    for (const p of this.pares) if (p[0] > desde && p[0] <= q.cuadro) {
      this.E.sonido(p[1], this.E.jugador(), "bomba");
      break;
    }
  }
}

const TIRAS_DOOR2 = [ 0, 2, 1, 2, 1, 2, 1, 2, 1, 2, 3 ];

class PuertaPlegadiza {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.f = 0;
    this.imp = 0;
    this.estado = 1;
    this.pos = v3(a.p || lista(a, "p"));
    this.d = a.d || lista(a, "d");
  }
  iniciar() {
    const E = this.E, info = E.infoTex?.door2 || {
      w: 64,
      h: 64
    }, tex = E.tex("door2");
    const uvs = i => {
      const k = i >> 1, s = TIRAS_DOOR2[k], alto = i & 1;
      return uvRect(info.w, info.h, Math.trunc(info.w * s / 4), alto ? Math.trunc(info.h / 2) : 0, Math.trunc(info.w * (s + 1) / 4) - 1, alto ? info.h - 1 : Math.trunc(info.h / 2) - 1);
    };
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide,
      alphaTest: .5,
      fog: false
    });
    this.lados = [ 0, 2048 ].map(extra => {
      const m = mallaQuads(22, mat, uvs);
      m.position.copy(this.pos);
      m.rotation.copy(eulerYXZ([ this.d[0] || 0, (this.d[1] || 0) + extra, this.d[2] || 0 ]));
      E.agregar(m);
      return m;
    });
    E.ctx.teñir?.(this.lados[0]);
    E.ctx.teñir?.(this.lados[1]);
    const pared = new THREE.Mesh(new THREE.BoxGeometry(1, 2.5, .1), new THREE.MeshBasicMaterial({
      visible: false
    }));
    pared.position.set(0, 1.25, 0);
    pared.userData.propio = pared.userData.extra = true;
    this.lados[0].add(pared);
    this.pared = pared;
    this.cerrada = false;
    this.objs = this.lados;
    this.vertices();
    this.ponerPared(true);
  }
  ponerPared(si) {
    const P = this.E.din.paredes;
    if (!P || si === this.cerrada) return;
    this.cerrada = si;
    const i = P.indexOf(this.pared);
    if (si && i < 0) P.push(this.pared); else if (!si && i >= 0) P.splice(i, 1);
    this.E.din.alCambiarParedes?.();
    this.E.ctx.alCambiar?.();
  }
  mensaje(h) {
    if (h === MSG.ABRE) {
      this.estado = 0;
      this.imp = 32;
      this.E.sonido(183, this.pos);
    } else if (h === MSG.CIERRA) {
      this.estado = 1;
      this.imp = 32;
      this.E.sonido(183, this.pos);
    }
  }
  cuadro() {
    if (this.estado === 0) {
      this.f += this.imp + 10;
      if (this.f > 256) {
        this.f = 256;
        this.estado = -1;
        this.E.sonido(184, this.pos);
        this.ponerPared(false);
      }
    } else if (this.estado === 1) {
      this.f -= this.imp + 10;
      if (this.f < 0) {
        this.f = 0;
        this.estado = -1;
        this.E.sonido(182, this.pos);
        this.ponerPared(true);
      }
    }
    this.imp -= Math.trunc(this.imp / 4);
    this.vertices();
  }
  vertices() {
    const xs = new Array(11).fill(null).map(() => [ 0, 0 ]);
    xs[10] = [ 650, 750 ];
    let t0 = 0, t1 = Math.trunc(400 * this.f / 256);
    for (let i = 0; i < 5; i++) {
      const izq = t1 + t0;
      xs[2 * i] = [ izq, izq + 50 ];
      const b0 = t1 + t0 + 50;
      t0 = (i + 1) * 130;
      const mult = 650 - t0 - 50 * (4 - i);
      t1 = Math.trunc(mult * this.f / 256);
      xs[2 * i + 1] = [ b0, t1 + t0 ];
    }
    for (const m of this.lados) {
      const at = m.geometry.attributes.position;
      for (let k = 0; k < 11; k++) {
        const [a, b] = xs[k];
        [ [ a, 2500 ], [ b, 2500 ], [ a, 1250 ], [ b, 1250 ] ].forEach(([px, py], j) => at.setXYZ(k * 8 + j, px * MM, py * MM, 0));
        [ [ a, 1250 ], [ b, 1250 ], [ a, 0 ], [ b, 0 ] ].forEach(([px, py], j) => at.setXYZ(k * 8 + 4 + j, px * MM, py * MM, 0));
      }
      at.needsUpdate = true;
      m.geometry.computeBoundingSphere();
    }
  }
  morir() {
    this.ponerPared(false);
  }
}

class Espejo {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    const p = lista(a, "p");
    this.eje = num(a, "m", 0);
    this.plano = (p[this.eje] || 0) * MM;
    this.reflejos = new Map;
    this.objs = [];
    const s = [ 1, 1, 1 ];
    s[this.eje] = -1;
    this.R = (new THREE.Matrix4).makeTranslation(...[ 0, 1, 2 ].map(k => k === this.eje ? 2 * this.plano : 0)).multiply((new THREE.Matrix4).makeScale(...s));
  }
  mensaje(h, v) {
    const n = tokVal(v[1]);
    if (h === MSG.ON2 && !this.reflejos.has(n)) this.agregar(n); else if (h !== MSG.ON2 && this.reflejos.has(n)) {
      this.reflejos.get(n).copia.removeFromParent();
      this.reflejos.delete(n);
    }
  }
  agregar(n) {
    const o = this.E.ctx.objetoDe?.(n);
    if (!o) return;
    const copia = clonarEsqueleto(o), a = [], b = [];
    o.traverse(x => a.push(x));
    copia.traverse(x => b.push(x));
    const pares = [];
    for (let i = 0; i < Math.min(a.length, b.length); i++) pares.push([ a[i], b[i] ]);
    copia.traverse(x => {
      x.userData.propio = x.userData.sinColision = true;
      if (x.isMesh) x.frustumCulled = false;
    });
    copia.matrixAutoUpdate = false;
    this.E.agregar(copia);
    this.reflejos.set(n, {
      o: o,
      copia: copia,
      pares: pares
    });
  }
  dibujar() {
    for (const r of this.reflejos.values()) {
      let vis = !!r.o.parent;
      for (let p = r.o; p && vis; p = p.parent) if (!p.visible) vis = false;
      r.copia.visible = vis;
      if (!vis) continue;
      r.o.updateMatrixWorld();
      r.copia.matrix.multiplyMatrices(this.R, r.o.matrixWorld);
      r.copia.matrixWorldNeedsUpdate = true;
      for (const [de, a] of r.pares) {
        if (de === r.o) continue;
        a.position.copy(de.position);
        a.quaternion.copy(de.quaternion);
        a.scale.copy(de.scale);
        a.visible = de.visible;
        if (a.isMesh) {
          if (a.userData.fuente !== de.material) {
            a.userData.fuente = de.material;
            a.material = Array.isArray(de.material) ? de.material.map(x => x.clone()) : de.material.clone();
          }
          const ms = Array.isArray(a.material) ? a.material : [ a.material ], os = Array.isArray(de.material) ? de.material : [ de.material ];
          ms.forEach((x, i) => {
            x.colorWrite = !!de.userData.cuerpo || os[i].colorWrite;
            x.depthWrite = !!de.userData.cuerpo || os[i].depthWrite;
          });
        }
      }
    }
  }
  morir() {
    for (const r of this.reflejos.values()) r.copia.removeFromParent();
    this.reflejos.clear();
  }
}

class Pegado {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
  }
  async iniciar() {
    const a = this.a, quien = tokVal(a.opts?.c?.[0]), m = tokVal(a.opts?.m?.[0]), u = num(a, "u", 0), o = this.E.ctx.objetoDe?.(quien);
    if (typeof m !== "number" || !o) {
      this.muerto = true;
      return;
    }
    const hueso = o.getObjectByName("hueso_" + u);
    if (!hueso) {
      this.muerto = true;
      return;
    }
    let mod = null;
    try {
      mod = await this.E.ctx.cargar(`niveles/${this.E.ctx.st?.()}/${m.toString(16).padStart(4, "0")}.glb`);
    } catch {}
    if (!mod) {
      this.muerto = true;
      return;
    }
    hueso.add(mod);
    this.mod = mod;
    this.objs = [ mod ];
  }
  mensaje(h) {
    if (!this.mod) return;
    if (h === LAMP.ON) this.mod.visible = true; else if (h === LAMP.OFF) this.mod.visible = false; else if (h === MSG.KILL) this.E.matar(this);
  }
}

const MARCAS = [ [ "!", "#ff2a1a" ], [ "?", "#ff2a1a" ], [ "!", "#ffe000" ], [ "?", "#ffe000" ], [ "!", "#ffffff" ], [ "?", "#ffffff" ], [ "♥", "#ff5080" ] ];

const MARCA_HASH = [ "B_MARK", "Q_MARK", "BY_MARK", "QY_MARK", "BW_MARK", "QW_MARK", "HEART_MARK" ].map(strcode);

class MarcaCabeza {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
  }
  mensaje(h) {
    const k = MARCA_HASH.indexOf(h);
    if (k < 0) return;
    const [txt, col] = MARCAS[k], cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d");
    g.font = "bold 54px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 6;
    g.strokeStyle = "#000";
    g.strokeText(txt, 32, 34);
    g.fillStyle = col;
    g.fillText(txt, 32, 34);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: t,
      depthTest: false,
      transparent: true,
      fog: false
    }));
    s.scale.set(.3, .3, 1);
    s.renderOrder = 998;
    s.userData.propio = true;
    this.E.agregar(s);
    const E = this.E;
    let n = 30;
    E.efecto({
      cuadro: () => {
        const h6 = E.hueso(6);
        if (h6) s.position.copy(h6).add(new THREE.Vector3(0, .45, 0));
        return --n > 0;
      },
      quitar: () => {
        s.removeFromParent();
        t.dispose();
        s.material.dispose();
      }
    });
  }
}

class PuntoRadar {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.p = v3(a.p || lista(a, "p"));
    this.visible = true;
    this.color = [ "celeste", "rojo", "amarillo" ][num(a, "c", 1)] || "rojo";
    this.objs = [];
  }
  mensaje(h) {
    if (h === LAMP.ON) this.visible = true; else if (h === LAMP.OFF) this.visible = false; else if (h === MSG.KILL) this.E.matar(this);
  }
}

class PuntoItem extends PuntoRadar {
  constructor(E, a) {
    super(E, a);
    const p = lista(a, "p");
    if (p.length >= 3) this.p = v3(p);
    this.conDetector = Array.isArray(a.opts?.m);
  }
  get visible() {
    return !this.conDetector || !!this.E.ctx.detectorMinas?.();
  }
  set visible(v) {}
}

class ReparteItems {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
  }
  async iniciar() {
    const a = this.a, modo = num(a, "m", 0), c = vecs(a, "c").slice(0, 16), pr = k => procDe(a, k);
    if (modo === 1) {
      const pts = await (this.E.ctx.ruta?.(a.mapa, num(a, "r", 0))) || [];
      const q = pts[0]?.p || pts[0];
      if (q) this.E.proc(pr("h"), [ q[0], q[1], q[2], 500 ]);
      this.muerto = true;
      return;
    }
    const orden = c.map((_, i) => i);
    for (let i = 0; i < orden.length; i++) {
      const k = randU(4096) % orden.length;
      [orden[i], orden[k]] = [ orden[k], orden[i] ];
    }
    orden.forEach((ix, i) => {
      const v = c[ix].slice();
      let alto = 500;
      if (i === 0) {
        const p0 = c[orden[0]];
        alto = p0[1] > -10 && p0[2] > -18010 ? 500 : v[2] > 5990 ? v[2] < 7001 ? 500 : 1e3 : 1e3;
      }
      const proc = i === 0 ? pr("h") : i === 1 ? pr("i") : i === 2 ? pr("j") : randU(2) === 0 ? pr("k") : pr("l");
      this.E.proc(proc, [ v[0], v[1], v[2], alto ]);
    });
    this.muerto = true;
  }
}

class CañosVapor {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    const m = lista(a, "m"), c = vecs(a, "c"), v = vecs(a, "v"), t = lista(a, "t");
    this.b = m.map((tipo, i) => ({
      tipo: tipo > 3 ? 0 : tipo,
      p: c[i] || [ 0, 0, 0 ],
      giro: v[i] || [ 0, 0, 0 ],
      frec: Math.max(1, t[i] ?? 1),
      est: 0,
      t: 0,
      vel: [ 0, 0, 0 ],
      quemo: false
    }));
  }
  vapor(B, vel) {
    this.E.anime(ANIME_VAPOR, {
      pos: [ B.p[0] + randS(32), B.p[1] + randS(32), B.p[2] + randS(32) ],
      speed: vel.slice(),
      scr: B.tipo,
      anim: randU(1024) % 30
    });
  }
  quemar(B, centro, medio) {
    const j = this.E.jugador();
    if (!j || B.quemo) return;
    const c = v3(centro), y = j.y + .9;
    if (Math.abs(j.x - c.x) < medio && Math.abs(y - c.y) < medio + .6 && Math.abs(j.z - c.z) < medio) {
      B.quemo = true;
      this.E.ctx.dañarSnake?.(32);
    }
  }
  cuadro() {
    for (const B of this.b) {
      if (B.est === 0) {
        if (randU(1024) % B.frec) continue;
        B.t = randU(8) + 16;
        B.est = 1;
        B.quemo = false;
        this.E.sonido(176, v3(B.p), "bomba");
      }
      if (B.est === 1) {
        if (B.t > 0) {
          if ((B.t & 3) === 0) {
            this.quemar(B, B.p, .3);
            this.vapor(B, [ 0, 0, 0 ]);
          }
        } else if (randU(32) >= 5) {
          this.E.sonido(177, v3(B.p), "bomba");
          B.t = 15;
          B.est = 2;
          const e = new THREE.Euler((B.giro[0] + randS(64)) * ANG, (B.giro[1] + randS(64)) * ANG, (B.giro[2] + randS(64)) * ANG, "YXZ");
          const d = new THREE.Vector3(0, 10, 100).applyEuler(e);
          B.vel = [ d.x + randS(8), d.y + randS(8), d.z + randS(8) ];
          B.lejos = B.p.map((x, k) => x + B.vel[k] * 14);
          B.cerca = B.p.map((x, k) => x + B.vel[k] * 4);
        } else B.est = 0;
        B.t--;
        continue;
      }
      if (B.est === 2) {
        if (B.t <= 0) {
          B.t = randU(64);
          B.est = 3;
        } else this.vapor(B, B.vel);
        B.t--;
        continue;
      }
      if (B.est === 3) {
        if (B.t <= 0) B.est = 0; else {
          this.quemar(B, B.lejos, .3);
          this.quemar(B, B.cerca, .2);
          this.vapor(B, B.vel);
        }
        B.t--;
      }
    }
  }
}

class Grua {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    const r = vecs(a, "r");
    this.n0 = r[0] || [ 0, 0, 0 ];
    this.n1 = r[1] || this.n0;
    this.dif = this.n1.map((v, k) => v - this.n0[k]);
    this.procD = procDe(a, "d");
    this.procP = procDe(a, "p");
    this.status = num(a, "c", 0);
    this.antesPaso = this.status === 1 ? num(a, "f", 0) : 0;
    Object.assign(this, {
      f378: 0,
      t1: 0,
      t2: 0,
      t3: 0,
      dir: 1,
      paso: 0,
      f310: 0,
      f314: 0,
      sac: [ 0, 0, 0 ],
      caida: [ 0, 0, 0 ],
      giro: [ 0, 0, 0 ],
      brazo: 0,
      choque: 0,
      f360: 0,
      tSon: 0,
      mov: this.n0.slice()
    });
  }
  async iniciar() {
    const E = this.E;
    const [m, b] = await Promise.all([ E.ctx.cargar("actores/grua.glb"), E.ctx.cargar("actores/grua_brazo.glb") ]);
    for (const o of [ m, b ]) {
      o.traverse(x => {
        if (x.isMesh) x.userData.extra = true;
      });
      E.ctx.teñir?.(o);
      E.agregar(o);
    }
    this.cuerpo = m;
    this.armBrazo = b;
    this.objs = [ m, b ];
    this.b = E.blanco(this, new THREE.Vector3, new THREE.Vector3(.5, .5, .3), modo => {
      this.golpe = Math.max(this.golpe || 0, modo);
    });
    if (this.status === 2) {
      m.visible = b.visible = false;
    }
    this.poner();
  }
  quieto() {
    if (this.t3 === 0) {
      this.E.sonido(179, v3(this.mov));
      this.f314 = randU(64) + 128;
      this.t3 = 1;
    }
    return this.f314-- > 0 ? 0 : 1;
  }
  anda(vel) {
    if (this.t3 === 0) {
      this.f314 = vel === 1 ? randU(32) + 32 : randU(128) + 64;
      this.f310 = 0;
      this.t3 = 1;
    }
    if (++this.tSon > 12) {
      this.tSon = 0;
      this.E.sonido(178, v3(this.mov));
    }
    if (this.paso > 255) {
      this.paso = 255;
      this.dir = -1;
      return 1;
    }
    if (this.paso < 0) {
      this.paso = 0;
      this.dir = 1;
      return 1;
    }
    if (this.f314-- > 0) {
      this.paso += this.dir * vel;
      return 0;
    }
    return 1;
  }
  sacude() {
    if (this.t3 === 0) {
      this.f310 = 32;
      this.f314 = 8;
      this.t3 = 1;
    }
    if (this.f314-- > 0) {
      this.sac[2] = randS(16);
      return 0;
    }
    this.sac = [ 0, 0, 0 ];
    return 1;
  }
  rompe() {
    if (this.t3 === 0) {
      if (this.status < 1 || this.status > 2) this.E.sonido(188, null);
      this.f310 = 0;
      this.f314 = 16;
      this.t3 = 1;
    }
    const tramo = [ null, [ 0, 0, 10, 12, -48, 0 ], [ 10, 8, 0, 0, 0, 22 ], [ 5, 4, 0, 0, 0, 11 ] ][this.t3];
    if (this.f314-- > 0) {
      this.giro[0] += tramo[0];
      this.giro[1] += tramo[1];
      this.giro[2] += tramo[2];
      this.caida[0] += tramo[3];
      this.caida[1] += tramo[4];
      this.caida[2] += tramo[5];
      this.sac = [ randS(16), randS(16), randS(16) ];
      return 0;
    }
    if (this.t3 < 3) {
      this.t3++;
      this.f314 = this.t3 === 2 ? 16 : 32;
      return 0;
    }
    this.sac = [ 0, 0, 0 ];
    return 1;
  }
  cae() {
    if (this.t3 === 0) {
      if (this.status !== 2) this.E.sonido(189, null);
      this.f314 = 80;
      this.t3 = 1;
    }
    if (this.f314-- > 0) {
      this.giro[0] += 20;
      const k = 4 * (this.f314 & 65535) & 65535;
      this.caida[1] -= k;
      return 0;
    }
    this.cuerpo.visible = this.armBrazo.visible = false;
    this.sac = [ 0, 0, 0 ];
    return 1;
  }
  piensa() {
    if (this.t1 === 0) {
      const sig = {
        3: () => this.sacude() && (this.t2 = randU(16) < 8 ? 1 : 2, this.t3 = 0),
        4: () => this.sacude() && (this.t2 = 0, this.t3 = 0),
        0: () => this.quieto() && (this.t2 = 3, this.t3 = 0),
        1: () => this.anda(1) && (this.t2 = 4, this.t3 = 0),
        2: () => this.anda(2) && (this.t2 = 4, this.t3 = 0)
      };
      sig[this.t2]?.();
      this.f310++;
      this.brazo = this.f310 > 128 ? 0 : Math.trunc(rsin(this.f310 * this.dir * 64) / (this.f310 * 4 + 64));
    } else {
      if (this.t2 === 6 && this.rompe()) {
        this.t2 = 8;
        this.t3 = 0;
      } else if (this.t2 === 8 && this.choque >= 2 && this.cae()) {
        this.t2 = 9;
        this.t3 = 0;
        this.f314 = 200;
      } else if (this.t2 === 9 && this.f314-- > 0 && this.status !== 2) this.humoCae([ this.mov[0], -1e3, this.mov[2] ]);
      this.f310++;
      this.brazo = this.f310 > 256 ? 0 : Math.trunc(rsin(this.f310 * this.dir * 64) * 4 / (this.f310 * 4 + 64));
    }
  }
  humoChoque(p) {
    const E = this.E, q = () => [ p[0] + randS(512) - 64, p[1] + randS(256) - 128, p[2] ];
    E.anime(ANIME_GRUA_A, {
      pos: q(),
      speed: [ randS(64), randU(128) + 64, 0 ]
    });
    if ((E.cuadros & 3) === 0) E.anime(ANIME_GRUA_B, {
      pos: q(),
      speed: [ randS(64), randS(128) + 64, 0 ]
    });
  }
  humoCae(p) {
    this.E.anime(ANIME_GRUA_B, {
      pos: [ p[0] + randS(2048), p[1], p[2] + randS(2048) ],
      speed: [ 0, randU(128) + 64, 0 ],
      scr: 1
    });
  }
  cuadro() {
    if (!this.cuerpo) return;
    if (this.f378 < 10) this.f378++;
    const j = this.E.jugador(), sn = j ? [ j.x * 1e3, j.y * 1e3, j.z * 1e3 ] : null;
    if (sn && this.f378 > 4 && sn[0] < -7500 && (sn[2] < -5e3 && sn[2] > -12500 || sn[2] > -2e3) && !this.E.ctx.snake?.()?.pared && this.procD != null) {
      this.E.proc(this.procD);
      this.procD = null;
    }
    if (this.f378 > 500) return;
    if (this.f378 > 100) this.f378++;
    this.piensa();
    for (let k = 0; k < 3; k++) this.mov[k] = Math.trunc(this.dif[k] * this.paso / 255) + this.n0[k] + this.sac[k] + this.caida[k];
    if (this.choque && this.f360 < 150) {
      this.f360++;
      if (this.status === 0) this.humoChoque([ this.mov[0] - 2400, this.mov[1] - 1500, this.mov[2] ]);
    }
    this.poner();
    const g = this.golpe || 0;
    this.golpe = 0;
    if (this.choque === 0) {
      if (g || this.status !== 0) {
        if (this.status === 0) this.E.proc(this.procP, [ 1, this.paso ]); else if (this.status === 1) {
          this.paso = this.antesPaso;
          this.mov[2] = this.n0[2] + Math.trunc(this.dif[2] * this.paso / 255);
        }
        if (g === 2 || this.status !== 0) {
          this.choque = 1;
          this.t1 = 1;
          this.t2 = 6;
          this.t3 = 0;
          return;
        }
      }
      if (sn && this.procD != null && Math.abs(sn[0] - (this.mov[0] - 2200)) < 800 && Math.abs(sn[1] + 900 - (this.mov[1] - 1e3)) < 900 && Math.abs(sn[2] - this.mov[2]) < 600 && ((this.t2 === 1 || this.t2 === 2) && this.f314 > 0 && (this.mov[2] - sn[2]) * this.dir < 0 || Math.abs(this.mov[2] - sn[2]) < 400)) {
        this.E.proc(this.procD);
        this.procD = null;
        this.E.sonido(141, null);
      }
      this.b.centro.copy(v3([ this.mov[0] - 2200, this.mov[1] - 1e3, this.mov[2] ]));
    } else if (this.choque === 1) {
      if (g === 2 || this.status >= 2) {
        if (this.status < 2) this.E.proc(this.procP, [ 2, this.paso ]);
        this.choque = 2;
        this.f378 = 111;
        this.E.matarBlanco(this.b);
        return;
      }
      this.b.centro.copy(v3([ this.mov[0] - 1900, this.mov[1] - 1e3, this.mov[2] ]));
    }
  }
  poner() {
    const p = v3(this.mov);
    this.cuerpo.position.copy(p);
    this.cuerpo.rotation.copy(eulerYXZ(this.giro));
    const m = (new THREE.Matrix4).compose(p, (new THREE.Quaternion).setFromEuler(eulerYXZ([ this.brazo, 0, 0 ])), new THREE.Vector3(1, 1, 1)).multiply((new THREE.Matrix4).makeTranslation(-.4, .2, 0));
    m.decompose(this.armBrazo.position, this.armBrazo.quaternion, this.armBrazo.scale);
  }
}

class Cuervos {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.n = Math.min(24, Math.max(1, num(a, "n", 1)));
    this.voces = this.n;
    const o = a.opts?.o;
    this.sigue = o ? tokVal(o[0]) : null;
    this.quieto = this.sigue == null;
    const caja = k => {
      const v = vecs(a, k);
      if (v.length === 2) for (const i of [ 0, 2 ]) if (v[0][i] > v[1][i]) [v[0][i], v[1][i]] = [ v[1][i], v[0][i] ];
      return v;
    };
    const caja3 = k => {
      const v = vecs(a, k);
      if (v.length === 2) for (const i of [ 0, 1, 2 ]) if (v[0][i] > v[1][i]) [v[0][i], v[1][i]] = [ v[1][i], v[0][i] ];
      return v;
    };
    this.p = caja("p");
    this.q = vecs(a, "q");
    this.r = this.quieto ? [] : caja("r");
    this.s = this.quieto ? [] : caja("s");
    this.x = caja3("x");
    this.y = caja3("y");
    this.modo = num(a, "w", 0);
    this.proc = procDe(a, "i");
    this.base = [ 0, 0, 0 ];
    this.mueve = this.quieto ? 1 : 0;
    this.mueveAntes = 0;
    this.listos = false;
    this.son1 = 0;
    this.son2 = randU(4);
    this.t1 = randU(64) + 20;
    this.t2 = randU(64) + 20;
  }
  async iniciar() {
    const E = this.E;
    const [datos, molde] = await Promise.all([ cargarAnims("crow"), E.ctx.cargar("actores/cuervo.glb") ]);
    this.datos = datos;
    this.c = [];
    for (let i = 0; i < this.n; i++) {
      const o = i === 0 ? molde : await E.ctx.cargar("actores/cuervo.glb");
      o.traverse(m => {
        if (m.isMesh) m.userData.sinColision = m.userData.extra = true;
      });
      E.ctx.teñir?.(o);
      E.agregar(o);
      const raiz = o.getObjectByName("hueso_0"), base = raiz ? raiz.position.toArray() : [ 0, 0, 0 ];
      const C = {
        o: o,
        base: base,
        mx: new THREE.AnimationMixer(o),
        acc: -1,
        accion: null,
        cuadrosAcc: 0,
        cuadro: 0,
        mov: [ 0, 0, 0 ],
        rot: [ 0, 0, 0 ],
        giro: [ 0, 0, 0 ],
        f384: [ 0, 0, 0 ],
        f38C: [ 0, 0, 0 ],
        f394: [ 0, 0, 0 ],
        f39C: [ 0, 0, 0 ],
        f3AC: randU(2),
        f3B4: 0,
        f3B8: 0,
        f3C4: 6,
        est: 0,
        cayendo: false,
        muerto: false,
        visible: true
      };
      this.ponerAccion(C, 0);
      C.b = E.blanco(this, new THREE.Vector3, new THREE.Vector3(.12, .12, .12), () => {
        if (!C.cayendo && !C.muerto) C.tiro = true;
      });
      this.c.push(C);
      this.objs.push(o);
    }
  }
  ponerAccion(C, n) {
    const nombre = "anim " + n, c = clip(this.datos, nombre, C.base);
    if (!c) return;
    const a = C.mx.clipAction(c);
    a.reset();
    a.setLoop(THREE.LoopRepeat);
    a.play();
    if (C.accion && C.accion !== a) C.accion.crossFadeTo(a, 4 / FPS, false);
    C.accion = a;
    C.acc = n;
    C.cuadrosAcc = this.datos.clips?.[nombre]?.cuadros || 30;
    C.cuadro = 0;
  }
  accion(C, n, siguiente) {
    if (C.acc !== n) {
      this.ponerAccion(C, n);
      return;
    }
    if (C.cuadro >= C.cuadrosAcc) C.est = siguiente;
  }
  azar(a, b) {
    return [ 0, 1, 2 ].map(k => a[k] + ((b[k] - a[k]) * randU(64) >> 6));
  }
  dir(de, a) {
    const d = [ a[0] - de[0], a[1] - de[1], a[2] - de[2] ];
    return [ (Math.round(Math.atan2(Math.hypot(d[0], d[2]), d[1]) / ANG) & 4095) - 1024, Math.round(Math.atan2(d[0], d[2]) / ANG) & 4095, 0 ];
  }
  sumar(a, b) {
    return [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
  }
  dist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  avanzar(C) {
    C.giro = this.dir(C.mov, C.f384);
    const v = new THREE.Vector3(...C.f39C).applyEuler(new THREE.Euler(C.giro[0] * ANG, C.giro[1] * ANG, 0, "YXZ"));
    C.mov = [ C.mov[0] + v.x, C.mov[1] + v.y, C.mov[2] + v.z ];
  }
  perchaAzar(C) {
    const n = this.q.length || 1;
    let v0 = randU(4096) % n, v1;
    if (v0 < n - 1) {
      v1 = v0;
      v0++;
    } else v1 = 0;
    C.f394 = this.azar(this.q[v0] || [ 0, 0, 0 ], this.q[v1] || [ 0, 0, 0 ]);
  }
  sonidos() {
    if (randU(4096) % this.n >= this.voces) return;
    if (this.t1-- < 0) {
      this.t1 = randU(32) + 20;
      const id = randU(4096) % 3;
      this.son1 = this.son1 !== id ? id : (id + 1) % 3;
      this.E.sonido(181 + this.son1, null);
    }
    if (this.t2-- < 0) {
      this.t2 = randU(16) + 15;
      const id = randU(4);
      this.son2 = this.son2 !== id ? id : (id + 1) % 4;
      this.E.sonido(185 + this.son2, null);
    }
  }
  seguir() {
    const E = this.E.din.elevadores?.find(x => x.o?.userData?.actor?.nombre === this.sigue);
    if (!E) return;
    const p = E.o.position, y = Math.round(p.y * 1e3);
    this.mueveAntes = this.mueve;
    this.mueve = y !== this.base[1] ? 1 : 0;
    this.base = [ Math.round(p.x * 1e3), y, Math.round(p.z * 1e3) ];
  }
  cuadro() {
    if (!this.c) return;
    this.sonidos();
    if (!this.quieto) this.seguir();
    const vuela = () => this.mueve === 1 || this.quieto;
    if (!this.listos) {
      this.listos = true;
      for (const C of this.c) {
        if (this.modo === 0 || this.modo === 2) {
          if (randU(2)) {
            this.perchaAzar(C);
            C.mov = this.sumar(C.f394, this.base);
            C.giro = this.dir(C.mov, this.base);
            C.est = 4;
          } else {
            C.f394 = this.azar(this.p[0] || [ 0, 0, 0 ], this.p[1] || [ 0, 0, 0 ]);
            C.mov = this.sumar(C.f394, this.base);
            C.mov[1] += randU(2048) + 1e3;
            C.est = 8;
          }
        }
        if (this.modo === 1 && this.x.length) {
          C.mov = this.azar(this.x[0], this.x[1]);
          C.est = 14;
        }
        if (this.modo === 3 && this.r.length) {
          C.mov = this.azar(this.r[0], this.r[1]);
          C.mov[1] += randU(2048) + 1e3;
          C.est = 8;
        }
        C.rot = C.giro.slice();
      }
    }
    for (const C of this.c) {
      C.f3B4--;
      C.f3B8--;
      C.cuadro++;
      if (C.tiro && !C.cayendo) {
        C.tiro = false;
        C.cayendo = true;
        this.voces--;
        C.f39C = [ randS(64), randU(32) + 32, randU(64) ];
        C.est = 29;
      }
      this.estado(C, vuela);
      for (let k = 0; k < 3; k++) {
        let d = (C.giro[k] - C.rot[k]) % 4096;
        if (d > 2048) d -= 4096;
        if (d < -2048) d += 4096;
        C.rot[k] += C.cayendo ? d : d / 4;
      }
      C.o.position.copy(v3(C.mov));
      C.o.rotation.set(C.rot[0] * ANG, C.rot[1] * ANG, C.rot[2] * ANG, "YXZ");
      C.o.visible = C.visible;
      C.b.centro.copy(C.o.position);
      C.mx.update(1 / FPS);
    }
  }
  estado(C, vuela) {
    const E = this.E;
    switch (C.est) {
     case 0:
      C.visible = false;
      C.f3B4 = randU(256);
      C.est = 1;

     case 1:
      if (C.f3B4 < 0) {
        C.est = 2;
        C.visible = true;
      }
      break;

     case 2:
      {
        if (vuela()) {
          this.perchaAzar(C);
          if (this.dist(C.mov, C.f394) > 4e3) {
            C.est = 8;
            break;
          }
        } else {
          C.est = 8;
          break;
        }
        C.f39C = [ 0, 0, randU(64) + 100 ];
        C.est = 3;
      }

     case 3:
      if (!vuela()) C.est = 8;
      if (this.dist(C.mov, C.f384) < 2e3) {
        C.est = 4;
      }
      C.f384 = this.sumar(C.f394, this.base);
      this.avanzar(C);
      break;

     case 4:
      if (!vuela()) C.est = 8;
      C.f384 = this.sumar(C.f394, this.base);
      for (let k = 0; k < 3; k++) C.mov[k] = (C.mov[k] * 15 + C.f384[k]) / 16;
      this.accion(C, 9, 5);
      break;

     case 5:
      C.est = 6;
      C.f3B4 = randU(256) + 30;
      C.giro = this.dir(C.mov, this.base);

     case 6:
      if (vuela() && C.f3B4 >= 0) C.mov = this.sumar(C.f394, this.base); else {
        C.est = 8;
        if (C.f3B4 < 0 && randU(64) === 0) C.est = 4; else C.mov = this.sumar(C.f394, this.base);
      }
      break;

     case 8:
      C.f3B8 = randU(256) + 30;
      C.giro = this.dir(C.mov, this.base);

     case 9:
      {
        let a0, a1;
        if (vuela()) {
          if (C.f3B8 < 0) {
            C.est = this.modo === 2 ? 14 : 2;
            break;
          }
          a0 = this.sumar(this.p[0] || [ 0, 0, 0 ], this.base);
          a1 = this.sumar(this.p[1] || [ 0, 0, 0 ], this.base);
          C.f3C4 = 6;
        } else {
          [a0, a1] = (this.modo === 4 ? this.s : this.r).length ? this.modo === 4 ? this.s : this.r : [ this.sumar(this.p[0] || [ 0, 0, 0 ], this.base), this.sumar(this.p[1] || [ 0, 0, 0 ], this.base) ];
          if (this.mueveAntes !== 1) {
            const r = randU(8);
            C.f3C4 = r === 0 ? 7 : r <= 3 ? 5 : 6;
          } else C.f3C4 = 10;
        }
        C.est = 10;
        const fuera = p => p[0] < a0[0] || p[0] > a1[0] || p[2] < a0[2] || p[2] > a1[2];
        const delante = (desde, giroY, largo) => {
          const v = new THREE.Vector3(0, 0, largo).applyEuler(new THREE.Euler(0, giroY * ANG, 0));
          return [ desde[0] + v.x, desde[1], desde[2] + v.z ];
        };
        C.f394 = delante(C.mov, C.giro[1], randU(4096) + 2e3);
        if (fuera(C.f394)) C.f394 = delante(C.mov, C.giro[1], 1e3);
        {
          let y = C.mov[1] + randS(2048);
          if (y < a0[1] + 500) y = a0[1] + 600;
          if (y > a0[1] + 2e3) y = a0[1] + 2e3;
          C.f394[1] = y;
        }
        const g = C.giro[1] + (C.f3AC === 0 ? 1024 : -1024);
        C.f38C = delante(C.f394, g, randU(2048) + 1e3);
        if (fuera(C.f38C)) C.f38C = delante(C.f394, g, 1e3); else if (this.dist(C.mov, this.base) < 3500) C.f3AC = 1 - C.f3AC;
        C.f39C = [ 0, 0, randU(64) + 100 ];
      }

     case 10:
      if (this.dist(C.mov, C.f38C) < 1e3) C.est = 9;
      for (let k = 0; k < 3; k++) C.f384[k] = (C.f394[k] * 7 + C.f38C[k]) / 8;
      C.f394 = C.f384.slice();
      this.avanzar(C);
      this.accion(C, C.f3C4, 10);
      break;

     case 14:
      C.f394 = this.y.length ? this.azar(this.y[0], this.y[1]) : C.f394;
      C.f39C = [ 0, 0, randU(64) + 100 ];
      C.est = 15;

     case 15:
      C.f384 = this.sumar(C.f394, this.base);
      this.avanzar(C);
      if (this.modo === 1 && C.mov[1] > this.base[1]) C.giro = this.dir(C.mov, this.base);
      this.accion(C, 6, 15);
      if (this.dist(C.mov, C.f384) < 300) C.est = this.modo === 2 ? 19 : 8;
      break;

     case 19:
      C.f384 = this.x.length ? this.azar(this.x[0], this.x[1]) : C.f384;
      C.giro = this.dir(C.mov, C.f384);
      C.f39C = [ 0, 0, randU(64) + 100 ];
      C.est = 20;

     case 20:
      this.avanzar(C);
      C.giro[0] += 1024;
      this.accion(C, 6, 20);
      if (this.dist(C.mov, C.f384) < 300) C.est = 21;
      break;

     case 21:
      C.visible = false;
      break;

     case 29:
      C.est = 30;
      E.sonido(184, null);
      this.t1 = 0;
      this.t2 = 0;
      break;

     case 30:
      {
        C.mov = this.sumar(C.mov, C.f39C);
        C.giro[0] += 164;
        C.giro[1] += 284;
        C.giro[2] += 394;
        C.f39C = [ Math.trunc(C.f39C[0] * 15 / 16), C.f39C[1] - 3, Math.trunc(C.f39C[2] * 15 / 16) ];
        this.accion(C, 4, 30);
        if (this.t1-- < 0) {
          this.t1 = randU(4) + 4;
          this.E.sonido(181 + randU(3), null);
        }
        if (this.t2-- < 0) {
          this.t2 = randU(4) + 4;
          this.E.sonido(185 + randU(4), null);
        }
        const piso = E.piso(v3(C.mov), .3);
        if (piso != null && C.mov[1] <= piso * 1e3 || C.mov[1] < -2e4) {
          if (piso != null) C.mov[1] = piso * 1e3;
          C.est = 31;
        }
        break;
      }

     case 31:
      C.f3B8 = 60;
      C.est = 32;
      E.proc(this.proc);
      C.giro[0] = 0;
      C.giro[2] = 0;

     case 32:
      C.visible = C.f3B8 % 4 >= 2;
      if (C.f3B8 < 0) C.est = 33;
      break;

     case 33:
      C.visible = false;
      C.muerto = true;
      C.est = 35;
      E.matarBlanco(C.b);
      break;
    }
  }
}

const CONT_TABLA = [ [ "con_uf0", "con_uf1", "con_uf2", "con_uf3", "br5", "br6" ], [ "con_ub0", "con_ub1", "con_ub2", "con_ub3", "br7", "br8" ], [ "con_uf0", "con_uf1", "con_uf2", "con_uf3", "con_uf3", "con_uf3" ], [ "con_ub0", "con_ub1", "con_ub2", "con_ub3", "con_ub3", "con_ub3" ] ];

const CONT_ESPECIAL = [ 3, 21, 24, 34 ];

const CONT_PASILLO = [ [ -5e3, -5500, -2e3, -3e3 ], [ 5e3, -3e3, 9e3, 500 ], [ -9e3, 3e3, -5e3, 6e3 ], [ 2e3, 6e3, 5e3, 9e3 ] ];

const CONT_PARED = [ [ -3500, -4250, false ], [ 7e3, -1500, true ], [ -7e3, 4500, true ], [ 3500, 7500, false ] ];

const CONT_LLEGA = [ [ [ 896, 1024, -512 ], [ -4e3, 750, -3500 ] ], [ [ 896, 2048, -512 ], [ 8e3, 750, -750 ] ], [ [ 896, 1024, -512 ], [ -8e3, 750, 5e3 ] ], [ [ 896, -1024, 512 ], [ 4e3, 750, 8e3 ] ] ];

const CONT_DEJA2 = [ [ [ -4e3, 749, -3500 ], [ 1023, 1023, -511 ] ], [ [ 8e3, 749, -750 ], [ 1023, 2048, -511 ] ], [ [ -7999, 749, 4999 ], [ 1023, 1024, -511 ] ], [ [ 4e3, 749, 8e3 ], [ 1023, -1023, 511 ] ] ];

const CONT_ITEMS = [ {
  modelo: "niveles/s15c/4d62.glb",
  off: [ -250, 1800, -250 ],
  item: "NIKITA MISSILE * 4",
  b: 3,
  i: 3,
  n: 4
}, {
  modelo: "actores/box_01.glb",
  off: [ 250, 1800, -250 ],
  item: "C4 * 2",
  b: 0,
  i: 6,
  n: 2
}, {
  modelo: "actores/box_01.glb",
  off: [ -250, 1800, -250 ],
  item: "C4 * 2",
  b: 0,
  i: 6,
  n: 2
}, {
  modelo: "niveles/s15c/4d63.glb",
  off: [ 250, 1800, -250 ],
  item: "RATION",
  b: 4,
  i: 13,
  n: 1
} ];

const espejo = (v, r) => {
  if (r === 1) v[0] = -v[0]; else if (r === 0) {
    v[0] = -v[0];
    v[2] = -v[2];
  } else if (r === 3) v[2] = -v[2];
  return v;
};

const idiv = (a, b) => Math.trunc(a / b);

class Contenedores {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.modo = num(a, "s", 1) | 0;
    const c = num(a, "c", 1);
    this.c = c > 0 ? c : 1;
    this.procs = [ "f", "g", "h" ].map(k => procDe(a, k));
    this.lug = [];
    this.k = [];
    this.filas = [];
    this.items = [];
  }
  async iniciar() {
    const E = this.E;
    if (E._contenedores) {
      this.muerto = true;
      return;
    }
    E._contenedores = this;
    for (let s5 = 0; s5 < 3; s5++) for (let s4 = 0; s4 < 3; s4++) for (let t4 = 0; t4 < 2; t4++) for (let a2 = 0; a2 < 2; a2++) for (let a1 = 0; a1 < 2; a1++) this.lug.push({
      p: [ 7e3 * s4 - 8e3 + 2e3 * a1, 1750 * t4, 6e3 * s5 - 5250 + 1500 * a2 ],
      r: [ 0, 1 - a2 << 11, 0 ],
      o: null
    });
    this.modelos = new Map;
    this.cargas = new Map;
    await Promise.all([ "con_uf0", "con_ub0", "con_tf", "con_tb", "con_ten" ].map(n => this.cargarModelo(n)));
    for (const n of new Set([ "con_all", "pan1", "pan2", ...CONT_TABLA.flat() ])) this.cargarModelo(n);
    this.raiz = new THREE.Group;
    this.raiz.userData.actor = this.a;
    E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    for (let s = 0; s < 9; s++) {
      const base = s * 8, uno = s === 7;
      [ "con_uf0", "con_ub0", "con_ub0", "con_uf0" ].forEach((m, i) => this.poner(base + i, m));
      if (uno) for (let i = 0; i < 4; i++) {
        const L = this.lug[base + i];
        this.ponerModelo({
          p: [ L.p[0], L.p[1] + 1749, L.p[2] ],
          r: L.r
        }, "con_ten");
      } else [ "con_tf", "con_tb", "con_tb", "con_tf" ].forEach((m, i) => this.poner(base + 4 + i, m));
    }
    for (let k = 0; k < 36; k++) {
      const L = (k >> 2) * 8 + (k & 3), a1 = k & 1, a2 = k >> 1 & 1;
      const esp = CONT_ESPECIAL.indexOf(k);
      const x = {
        L: L,
        tipo: esp >= 0 ? esp & 1 : a1 === a2 ? 2 : 3,
        nivel: 0,
        visto: 0,
        golpes: 0,
        guardado: 0,
        fila: esp
      };
      if (this.modo === 1) {
        const q = this.lug[L].p;
        x.b = E.blanco(this, new THREE.Vector3(q[0] * MM, (q[1] + 437) * MM, q[2] * MM), new THREE.Vector3(1.01, .885, .76), modo => {
          if (modo === 2) x.golpe = true;
        });
      }
      this.k.push(x);
    }
    for (let r = 0; r < 4; r++) this.filas.push({
      c: 0,
      s: 0,
      v: [ 0, 0, 0 ],
      rotT: [ 0, 0, 0 ],
      posT: [ 0, 0, 0 ],
      hecho: false,
      libre: 1,
      pared: null,
      top: (CONT_ESPECIAL[r] >> 2) * 8 + (CONT_ESPECIAL[r] & 3) + 4
    });
    if (this.modo === 1) {
      CONT_ITEMS.forEach((it, i) => {
        const o = new THREE.Group;
        this.raiz.add(o);
        E.ctx.cargar(it.modelo).then(m => {
          if (this.muerto) return;
          o.add(m);
          E.ctx.teñir?.(m);
        }).catch(e => console.warn("actores: caja", it.modelo, e));
        this.items.push({
          i: i,
          o: o,
          estado: 0,
          off: it.off.slice(),
          ry: 0
        });
      });
    } else if (this.modo === 2 || this.modo === 3) this.guardados(this.a);
    this.rama = this.ramaGuion();
    if (this.rama && this.rama._k !== this.a._k) this.cambiarRama(this.rama);
    this.cuadro800D92CC(true);
    E.ctx.alCambiar?.();
  }
  guardados(a) {
    const g = typeof window !== "undefined" ? window.__mgs?.guion : null;
    const val = v => typeof v === "number" ? v : v && typeof v === "object" && v.var ? g?.vars?.get?.(v.var) | 0 : 0;
    const vs = [ "l", "m", "n" ].flatMap(k => (Array.isArray(a.opts?.[k]) ? a.opts[k] : []).map(val));
    for (let i = 0; i < 18; i++) {
      const v = vs[i] | 0;
      this.k[2 * i].guardado = v >> 8 & 255;
      this.k[2 * i + 1].guardado = v & 255;
    }
  }
  ramaGuion() {
    const g = typeof window !== "undefined" ? window.__mgs?.guion : null, st = this.E.ctx.st?.(), T = g?.traza;
    if (!T || !g.nivel || !st) return null;
    let i = T.length - 1;
    while (i >= 0 && !(T[i].que === "escenario" && T[i].st === st)) i--;
    if (i < 0) return undefined;
    for (let j = i - 1; j >= 0 && T[j].que !== "escenario" && T[j].que !== "load"; j--) if (T[j].que === "entrada-sin-crear" && T[j].tipo === "CONTAINER") return g.nivel.actores.find(x => x.tipo === "CONTAINER" && x._k === T[j].k) || null;
    return null;
  }
  cambiarRama(alt) {
    const modo = num(alt, "s", 1) | 0;
    this.log = (this.log || []).concat(`rama k${alt._k}: -s ${modo}`);
    const c = num(alt, "c", 1);
    this.c = c > 0 ? c : 1;
    this.procs = [ "f", "g", "h" ].map(k => procDe(alt, k));
    if (modo === this.modo) return;
    this.modo = modo;
    if (modo !== 1) {
      for (const x of this.k) if (x.b) {
        this.E.matarBlanco(x.b);
        x.b = null;
      }
      for (const it of this.items) it.o?.removeFromParent();
      this.items = [];
      this.guardados(alt);
    }
  }
  cargarModelo(n) {
    if (!this.cargas.has(n)) this.cargas.set(n, this.E.ctx.cargar(`actores/${n}.glb`).then(o => {
      this.modelos.set(n, o);
      return o;
    }).catch(e => {
      console.warn("actores: contenedor", n, e);
      return null;
    }));
    return this.cargas.get(n);
  }
  ponerModelo(L, nombre, extraRy = 0) {
    this._nuevos = true;
    const o = new THREE.Group;
    o.position.set(L.p[0] * MM, L.p[1] * MM, L.p[2] * MM);
    o.rotation.set(L.r[0] * ANG, (L.r[1] + extraRy) * ANG, L.r[2] * ANG, "YXZ");
    this.raiz.add(o);
    const poner = src => {
      if (!src || !o.parent) return;
      const m = src.clone(true);
      o.add(m);
      this.E.ctx.teñir?.(m);
      this._nuevos = true;
    };
    if (this.modelos.has(nombre)) poner(this.modelos.get(nombre)); else this.cargarModelo(nombre).then(poner);
    return o;
  }
  poner(i, nombre, extraRy = 0) {
    const L = this.lug[i];
    L.o?.removeFromParent();
    L.o = this.ponerModelo(L, nombre, extraRy);
    L.nombre = nombre;
  }
  balasRaven() {
    const A = typeof window !== "undefined" ? window.__mgs?.juego?.__jefes?.__apoyo3 : null;
    if (!A?.balas?.length) return;
    const ray = this._ray ||= new THREE.Ray, caja = this._caja ||= new THREE.Box3, q = new THREE.Vector3;
    for (const b of A.balas.slice()) {
      const L = Math.min(b.vel, Math.max(0, b.hitDist - b.dist));
      if (!(L > 0)) continue;
      ray.set(b.pos, b.step.clone().normalize());
      let mejor = null, md = L;
      for (const x of this.k) {
        const p = this.lug[x.L].p;
        caja.min.set(p[0] - 1010, p[1] + 437 - 885, p[2] - 760);
        caja.max.set(p[0] + 1010, p[1] + 437 + 885, p[2] + 760);
        if (ray.intersectBox(caja, q)) {
          const d = q.distanceTo(b.pos);
          if (d <= md) {
            md = d;
            mejor = x;
          }
        }
      }
      if (!mejor) continue;
      mejor.golpe = true;
      b.mesh?.removeFromParent();
      const i = A.balas.indexOf(b);
      if (i >= 0) A.balas.splice(i, 1);
    }
  }
  snake() {
    const j = this.E.jugador();
    return j ? [ j.x * 1e3, j.y * 1e3, j.z * 1e3 ] : null;
  }
  seCerca(id, p) {
    const s = this.snake();
    const q = s ? [ s[0] + idiv(p[0] - s[0], 8), p[1], s[2] + idiv(p[2] - s[2], 8) ] : p;
    this.E.sonido(id, new THREE.Vector3(q[0] * MM, q[1] * MM, q[2] * MM));
  }
  cuadro() {
    if (this.rama === undefined) {
      this.rama = this.ramaGuion();
      if (this.rama && this.rama._k !== this.a._k) this.cambiarRama(this.rama);
    }
    this.cuadro800D92CC(false);
  }
  cuadro800D92CC(primero) {
    const E = this.E, modo = this.modo;
    if (modo === 1 && !primero) this.cajas();
    if (modo === 1) {
      for (const f of this.filas) f.libre = 1;
      const mgr = typeof window !== "undefined" ? window.__mgs?.juego?.__jefes : null;
      const raven = mgr?.lista?.find(j => j.vivo !== false && j.actor?.tipo === "VALCAN");
      const chequeo = (p, r) => this.filas.forEach((f, i) => {
        if (f.s < 1) {
          if (f.c !== 0) f.libre = 0;
        } else if (p) {
          const b = CONT_PASILLO[i];
          if (b[0] - r < p[0] && p[0] < b[2] + r && b[1] - r < p[2] && p[2] < b[3] + r) f.libre = 0;
        }
      });
      chequeo(raven?.mov ? [ raven.mov.x, 0, raven.mov.z ] : null, 1e4);
      chequeo(this.snake(), 5e3);
      this.balasRaven();
    }
    let cambio = false;
    for (let s = 0; s < 9; s++) {
      let toco = false;
      for (let l = 0; l < 4; l++) {
        const x = this.k[s * 4 + l];
        if (x.fila >= 0 && !this.filas[x.fila].libre) continue;
        if (modo === 1 && x.golpe) {
          x.golpe = false;
          if (!primero) this.seCerca(189, this.lug[x.L].p);
          if (++x.golpes >= this.c) {
            toco = true;
            x.golpes = 0;
            x.nivel++;
          }
        }
        if ((modo === 2 || modo === 3) && x.nivel < x.guardado && ++x.golpes >= this.c) {
          toco = true;
          x.golpes = 0;
          x.nivel++;
        }
      }
      if (toco) for (let l = 0; l < 4; l++) {
        const x = this.k[s * 4 + l];
        if (x.nivel > 5) x.nivel = 5;
      }
    }
    for (const x of this.k) {
      if (x.nivel === x.visto) continue;
      x.visto = x.nivel;
      cambio = true;
      if (modo === 1) this.seCerca(180, this.lug[x.L].p);
      const vuelta = (x.fila === 1 || x.fila === 3) && x.nivel >= 4 ? 2048 : 0;
      this.poner(x.L, CONT_TABLA[x.tipo][x.nivel], vuelta);
      if (x.fila < 0) continue;
      const r = x.fila, F = this.filas[r];
      if (x.nivel === 4) {
        F.c = 32;
        this.empujar(r, F, -80, 112, [ -48, -24, -48 ], [ -48, -212, -48 ], false);
        this.ponerModelo(this.lug[x.L], "pan1");
        this.ponerModelo(this.lug[x.L], "pan2", r % 2 === 1 ? 2048 : 0);
        this.poner(F.top, "con_all");
      }
      if (x.nivel === 5) {
        F.c = 32;
        this.empujar(r, F, -112, 32, [ -80, -52, -80 ], [ -80, -240, -80 ], true);
        if (r === 2) F.v[0] = -F.v[0];
      }
    }
    this.filas.forEach((F, r) => {
      if (F.c === 0 || F.hecho) return;
      const top = this.lug[F.top], mueve = () => {
        for (let k = 0; k < 3; k++) top.p[k] += Math.trunc(F.v[k] * F.c / 128);
      };
      cambio = true;
      switch (F.s) {
       case 0:
        if (modo === 2 || modo === 3) {
          if (modo === 2) {
            top.p = CONT_DEJA2[r][0].slice();
            top.r = CONT_DEJA2[r][1].slice();
          } else {
            top.p = [ -1e4, -1e4, -1e4 ];
            top.r = [ 0, 0, 0 ];
            if (top.o) top.o.visible = false;
          }
          F.hecho = true;
          break;
        }
        if (this.items[r]) this.items[r].estado = 1;
        if (randU(2) === 0) this.seCerca(178, top.p);
        mueve();
        if (--F.c === 0) F.s++;
        break;

       case 1:
        {
          if (randU(2) === 0) this.seCerca(178, top.p);
          this.paredFila(r, F, F.c === 32 ? 0 : (32 - F.c) * 4);
          top.r[1] += r < 2 ? 16 : -16;
          mueve();
        }

       case 2:
        if (--F.c === 0) {
          F.c = 32;
          F.s++;
        }
        break;

       case 3:
        {
          const t = 32 - F.c, h = idiv(t, 2);
          if (randU(2) === 0) this.seCerca(178, top.p);
          const d = [ [ [ t, t, -h ], [ t, -h, -h ] ], [ [ t, t, h ], [ -h, -h, -2 * t ] ], [ [ 2 * t, -h, -h ], [ t, -h, -2 * t ] ], [ [ t, -t, h ], [ -t, -h, h ] ] ][r];
          for (let k = 0; k < 3; k++) {
            top.r[k] += d[0][k];
            top.p[k] += d[1][k];
          }
          mueve();
          if (--F.c === 0) {
            F.c = 8;
            F.s = 4;
            F.rotT = CONT_LLEGA[r][0].slice();
            F.v = CONT_LLEGA[r][1].slice();
            this.E.sonido(41, new THREE.Vector3(top.p[0] * MM, top.p[1] * MM, top.p[2] * MM));
          }
          break;
        }

       case 4:
       case 5:
        {
          F.c--;
          for (let k = 0; k < 3; k++) {
            top.p[k] = idiv(top.p[k] + F.v[k], 2);
            top.r[k] = idiv(top.r[k] + F.rotT[k], 2);
          }
          if (F.c === 0 && F.s === 4) {
            F.c = 8;
            F.s = 5;
            F.rotT[0] = 1024;
            this.seCerca(177, top.p);
            this.vibrar();
          } else if (F.c === 0) {
            this.paredFila(r, F, null);
            this.seCerca(177, top.p);
            this.vibrar();
            F.c = 32;
            F.s = 6;
            if (this.items[r]) this.items[r].estado = 2;
          }
          break;
        }

       default:
        break;
      }
      if (top.o) {
        top.o.position.set(top.p[0] * MM, top.p[1] * MM, top.p[2] * MM);
        top.o.rotation.set(top.r[0] * ANG, top.r[1] * ANG, top.r[2] * ANG, "YXZ");
      }
    });
    if (modo === 1) {
      const mgr = typeof window !== "undefined" ? window.__mgs?.juego?.__jefes : null;
      if (mgr) mgr.bloqueosRaven = this.filas.map(f => f.s);
    }
    if (this._nuevos && !primero) {
      this._nuevos = false;
      E.ctx.alCambiar?.();
    }
    void cambio;
  }
  empujar(r, F, dz, dx, vel, corr, nivel5) {
    const top = this.lug[F.top];
    top.r[2] += (r & 1) === 0 ? dz : -dz;
    top.r[0] += dx;
    const v = espejo(vel.slice(), r);
    if (nivel5) {
      if (r === 1 || r === 2) v[0] = 0; else v[2] = 0;
    }
    F.v = v;
    const c = espejo(corr.slice(), r);
    for (let k = 0; k < 3; k++) top.p[k] += c[k];
  }
  paredFila(r, F, ext) {
    const E = this.E;
    if (ext === null) {
      if (F.pared) {
        ponerPared(E, F.pared, false);
        F.pared.removeFromParent();
        F.pared = null;
        E.ctx.alCambiar?.();
      }
      return;
    }
    if (!F.pared) {
      F.pared = paredSegmentos(E);
      E.agregar(F.pared);
      ponerPared(E, F.pared, true);
    }
    const [cx, cz, alx] = CONT_PARED[r], e = alx ? idiv(ext * 2e3, 128) : idiv(ext * 1500, 128);
    const s = alx ? [ [ cx - e, cz - 2500, cx - e, cz + 2500 ], [ cx + e, cz - 2500, cx + e, cz + 2500 ] ] : [ [ cx - 2500, cz - e, cx + 2500, cz - e ], [ cx - 2500, cz + e, cx + 2500, cz + e ] ];
    F.pared.poner(s.map(([x0, z0, x1, z1]) => [ x0 * MM, z0 * MM, x1 * MM, z1 * MM, 0, 3.5 ]));
  }
  vibrar() {
    try {
      navigator.vibrate?.(60);
    } catch {}
  }
  cajas() {
    for (const it of this.items) {
      if (!it.o || it.estado === 3) continue;
      const top = this.lug[this.filas[it.i].top];
      const m = (new THREE.Matrix4).makeRotationFromEuler(new THREE.Euler(top.r[0] * ANG, top.r[1] * ANG, top.r[2] * ANG, "YXZ"));
      if (it.estado === 2) it.off[1] += 300;
      const p = new THREE.Vector3(it.off[0] * MM, it.off[1] * MM, it.off[2] * MM).applyMatrix4(m).add(new THREE.Vector3(top.p[0] * MM, top.p[1] * MM, top.p[2] * MM));
      it.ry -= 90;
      it.o.position.copy(p);
      if (it.estado === 1) it.o.quaternion.setFromRotationMatrix(m).multiply((new THREE.Quaternion).setFromEuler(new THREE.Euler(0, it.ry * ANG, 0))); else it.o.rotation.set(0, it.ry * ANG, 0);
      if (it.estado === 2) {
        it.o.visible = false;
        it.estado = 3;
        const piso = this.E.piso(p, .5);
        const d = CONT_ITEMS[it.i], q = [ Math.round(p.x / MM), Math.round((piso ?? p.y) / MM), Math.round(p.z / MM) ];
        const g = typeof window !== "undefined" ? window.__mgs?.guion : null;
        const actor = {
          tipo: "ITEM",
          nombre: 56320 + it.i,
          mapa: this.a.mapa,
          p: q,
          modelo: d.modelo,
          item: d.item,
          opts: {
            p: q,
            b: [ d.b ],
            i: [ d.i ],
            n: [ d.n ],
            m: [ d.item ]
          }
        };
        try {
          g?.op?.crearActor?.(actor);
        } catch (e) {
          console.warn("actores: ítem del contenedor", e);
        }
        this.soltados = (this.soltados || []).concat(d.item);
      }
    }
  }
  morir() {
    if (this.E._contenedores === this) this.E._contenedores = null;
    for (const F of this.filas) if (F.pared) ponerPared(this.E, F.pared, false);
    if (this.modo !== 1 || !this.k.length) return;
    const lv = i => (i < 36 ? this.k[i].nivel : this.k[i - 36].visto) & 255;
    const vals = Array.from({
      length: 20
    }, (_, i) => lv(2 * i) << 8 | lv(2 * i + 1));
    this.procs.forEach((p, j) => {
      if (p) this.E.proc(p, j < 2 ? vals.slice(j * 8, j * 8 + 8) : vals.slice(16, 20));
    });
  }
}

function paredCaja(E, ancho, alto, largo) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, largo), new THREE.MeshBasicMaterial({
    visible: false
  }));
  m.userData.propio = m.userData.sinColision = m.userData.extra = true;
  return m;
}

function ponerPared(E, m, si) {
  const P = E.din.paredes;
  if (!P) return;
  const i = P.indexOf(m);
  if (si && i < 0) P.push(m); else if (!si && i >= 0) P.splice(i, 1);
  E.din.alCambiarParedes?.();
}

function paredSegmentos(E) {
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  }));
  m.userData.propio = m.userData.sinColision = m.userData.extra = true;
  m.frustumCulled = false;
  m.poner = segs => {
    const p = [];
    for (const [x0, z0, x1, z1, y, h] of segs) p.push(x0, y, z0, x1, y, z1, x1, y + h, z1, x0, y, z0, x1, y + h, z1, x0, y + h, z0);
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
  };
  return m;
}

function segmento(p, q, mat = null) {
  const a = new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM), b = new THREE.Vector3(q[0] * MM, q[1] * MM, q[2] * MM);
  if (mat) {
    a.applyMatrix4(mat);
    b.applyMatrix4(mat);
  }
  return [ a.x, a.z, b.x, b.z, Math.min(a.y, b.y), Math.abs(a.y - b.y) ];
}

class Anime {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.s = a.script;
    this.amb = a.amb;
    this.w = a.size[0];
    this.h = a.size[1];
    this.fin = false;
    const n = this.s[2], ptr = [];
    for (let i = 0; i < n; i++) ptr.push(this.s[3 + i * 2] * 256 + this.s[4 + i * 2]);
    this.units = a.pre.map(p => {
      const tx = E.texCopia(a.tex);
      tx.repeat.set(1 / a.dev[0], 1 / a.dev[1]);
      const o = sprite(tx, a.amb & ~3 ? 0 : a.amb, [ a.v, a.v, a.v ], this.w, this.h);
      if (a.amb & ~3) {
        o.material.blending = THREE.NormalBlending;
        o.material.opacity = 1;
        o.material.alphaTest = .5;
      }
      o.visible = false;
      E.agregar(o);
      return {
        count: 0,
        anime: p.anim | 0,
        speed: (p.speed || [ 0, 0, 0 ]).slice(),
        c: [ a.v, a.v, a.v ],
        loop: -1,
        lc: [],
        ls: [],
        data: ptr[p.scr | 0],
        ptr: ptr[p.scr | 0],
        pos: p.pos.slice(),
        o: o,
        tx: tx
      };
    });
  }
  num(i, code = 0) {
    let c = this.s[i] << 8 | this.s[i + 1];
    if (c & 32768) c -= 65536;
    if (code & 128 && c) c = c < 0 ? -randU(-c) : randU(c);
    return c;
  }
  vec(i, code) {
    return [ this.num(i, code), this.num(i + 2, code), this.num(i + 4, code) ];
  }
  cuadro() {
    if (this.fin) return false;
    for (const u of this.units) {
      if (u.count <= 0) {
        for (let k = 0; k < 64; k++) {
          const code = this.s[u.ptr], n = code & 127;
          if (n < 1 || n > 15) {
            this.fin = true;
            return false;
          }
          if (this.op(n, code, u)) break;
          if (this.fin) return false;
        }
        if (this.fin) return false;
      }
      for (let k = 0; k < 3; k++) u.pos[k] += u.speed[k];
      u.count--;
    }
    return true;
  }
  op(n, code, u) {
    const p = u.ptr;
    switch (n) {
     case 1:
      {
        const x = this.s[p + 1];
        u.anime = x === 255 ? u.anime + 1 >= this.a.nAnime ? 0 : u.anime + 1 : x === 254 ? randU(this.a.nAnime) : x;
        u.ptr += 2;
        return 0;
      }

     case 2:
      u.count = this.num(p + 1, code);
      u.ptr += 3;
      return 1;

     case 3:
      u.pos = this.vec(p + 1, code);
      u.ptr += 7;
      return 0;

     case 4:
      {
        const v = this.vec(p + 1, code);
        for (let k = 0; k < 3; k++) u.pos[k] += v[k];
        u.ptr += 7;
        return 0;
      }

     case 5:
      u.speed = this.vec(p + 1, code);
      u.ptr += 7;
      return 0;

     case 6:
      {
        const v = this.vec(p + 1, code);
        for (let k = 0; k < 3; k++) u.speed[k] += v[k];
        u.ptr += 7;
        return 0;
      }

     case 7:
      this.amb = this.s[p + 1];
      u.ptr += 2;
      return 0;

     case 8:
      for (let k = 0; k < 3; k++) u.c[k] = u.c[k] + this.s[p + 1 + k] & 255;
      u.ptr += 4;
      return 0;

     case 9:
      u.ptr += 3;
      return 0;

     case 10:
      this.w += this.num(p + 1);
      this.h += this.num(p + 3);
      u.ptr += 5;
      return 0;

     case 11:
      this.E.sonido(this.s[p + 1], this.mundo(u.pos));
      u.ptr += 2;
      return 0;

     case 12:
      {
        const k = this.num(p + 1);
        u.ptr += 3;
        u.loop++;
        u.lc[u.loop] = k;
        u.ls[u.loop] = u.ptr;
        return 0;
      }

     case 13:
      {
        const c = --u.lc[u.loop];
        if (c > 0) u.ptr = u.ls[u.loop]; else if (c === 0) {
          u.loop--;
          u.ptr++;
        } else u.ptr = u.ls[u.loop];
        return 0;
      }

     case 14:
      u.ptr = u.data;
      return 1;

     default:
      this.fin = true;
      return 1;
    }
  }
  mundo(pos) {
    const v = new THREE.Vector3(pos[0] * MM, pos[1] * MM, pos[2] * MM);
    return this.a.mat ? v.applyMatrix4(this.a.mat) : v;
  }
  dibujar() {
    const modo = this.amb & ~3 ? 0 : this.amb;
    for (const u of this.units) {
      const o = u.o;
      o.visible = !this.fin;
      o.position.copy(this.mundo(u.pos));
      o.scale.set(this.w * MM, this.h * MM, 1);
      const dx = this.a.dev[0], dy = this.a.dev[1];
      u.tx.offset.set(u.anime % dx / dx, 1 - (Math.floor(u.anime / dx) + 1) / dy);
      if (modo === 1 || modo === 3) o.material.blending = THREE.AdditiveBlending; else if (modo === 2) o.material.blending = THREE.SubtractiveBlending;
      ponerColor(o.material, u.c, modo);
    }
  }
  quitar() {
    for (const u of this.units) {
      u.o.removeFromParent();
      u.o.material.dispose();
      u.tx.dispose();
    }
  }
}

const DRUM_OCT = [ [ -500, -250 ], [ -250, -500 ], [ 250, -500 ], [ 500, -250 ], [ 500, 250 ], [ 250, 500 ], [ -250, 500 ], [ -500, 250 ] ];

const DRUM_ACOSTADO = [ [ -250, -500, -250 ], [ 250, 500, -250 ], [ -250, -500, 250 ], [ 250, 500, 250 ] ];

class Tambor {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.estado = 0;
    this.vital = 150;
    this.vuela = false;
    this.rebotes = 0;
    this.p0 = v3(a.p || lista(a, "p"));
    this.pos = this.p0.clone();
    const d = a.d || lista(a, "d");
    this.rot = [ d[0] || 0, d[1] || 0, d[2] || 0 ];
    this.proc = procDe(a, "e");
    const f = lista(a, "f");
    this.velF = f.length >= 3 ? f.slice(0, 3) : null;
  }
  async iniciar() {
    const E = this.E, o = await E.ctx.cargar("actores/tambor.glb");
    E.ctx.teñir?.(o);
    const caja = (new THREE.Box3).setFromObject(o);
    this.abajo = -caja.min.y;
    this.alto = caja.max.y - caja.min.y;
    this.arriba = caja.max.y;
    this.raiz = new THREE.Group;
    this.raiz.add(o);
    this.cuerpo = o;
    E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    this.pos.y += this.abajo;
    this.poner();
    const mat = this.raiz.matrixWorld;
    this.pared = paredSegmentos(E);
    this.pared.poner(DRUM_OCT.map((p, i) => {
      const q = DRUM_OCT[i + 1 & 7];
      return segmento([ p[0], -this.abajo / MM, p[1] ], [ q[0], this.arriba / MM, q[1] ], mat);
    }));
    E.agregar(this.pared);
    this.objs.push(this.pared);
    ponerPared(E, this.pared, true);
    this.b = E.blanco(this, this.pos.clone(), new THREE.Vector3(.55, this.alto / 2 + .01, .55), (modo, dir, punto, daño = 64) => this.golpe(modo, daño));
  }
  homing() {
    return this.estado === 0 ? this.pos.clone() : null;
  }
  golpe(modo, daño) {
    if (this.estado) return;
    this.vital -= modo === 2 ? 0 : daño;
    if (this.vital < 0 || modo === 2) {
      this.estado = 1;
      this.E.matarBlanco(this.b);
    }
  }
  async explotar() {
    const E = this.E;
    this.estado = 8;
    ponerPared(E, this.pared, false);
    this.vel = this.velF ? this.velF.slice() : [ randS(128), randU(128) + 150, randS(128) ];
    this.giro = [ 0, randS(128), randS(128) ];
    this.vuela = true;
    E.proc(this.proc);
    E.explotar(this.pos.clone());
    this.acostado = paredSegmentos(E);
    E.agregar(this.acostado);
    this.objs.push(this.acostado);
    ponerPared(E, this.acostado, true);
    try {
      const o = await E.ctx.cargar("actores/tambor_roto.glb");
      E.ctx.teñir?.(o);
      this.raiz.clear();
      this.raiz.add(o);
      const c = (new THREE.Box3).setFromObject(o);
      this.pos.y += -c.min.y - this.abajo;
      this.abajo = -c.min.y;
    } catch (e) {
      console.warn("actores: tambor roto", e);
    }
  }
  cuadro() {
    if (this.estado > 0 && this.estado < 7) {
      this.estado++;
      return;
    }
    if (this.estado === 7) {
      this.explotar();
      return;
    }
    if (!this.vuela) return;
    for (let k = 0; k < 3; k++) this.rot[k] += this.giro[k];
    const piso = this.E.piso(this.pos, .3) ?? this.pos.y - this.abajo;
    if (this.pos.y - this.abajo <= piso + .001 && this.vel[1] < 0) {
      this.rebotes++;
      this.vel = [ Math.trunc(this.vel[0] / 2), Math.trunc(-this.vel[1] / 2), Math.trunc(this.vel[2] / 2) ];
      if (this.vel[1] < 20) this.vuela = false;
    }
    this.vel[1] -= 20;
    if (this.rebotes > 2) {
      const z = (this.rot[2] + 32768 & 65535) - 32768;
      this.rot[2] = z > 2047 ? 3072 : 1024;
    }
    this.pos.x += this.vel[0] * MM;
    this.pos.z += this.vel[2] * MM;
    this.pos.y = Math.max(this.pos.y + this.vel[1] * MM, piso + this.abajo);
    if (!this.vuela) this.vel = [ 0, 0, 0 ];
    this.poner();
    const m = (new THREE.Matrix4).makeRotationY(this.rot[1] * ANG).setPosition(this.pos);
    this.acostado.poner(DRUM_ACOSTADO.map((p, i) => segmento(p, DRUM_ACOSTADO[i + 1 & 3], m)));
  }
  poner() {
    this.raiz.position.copy(this.pos);
    this.raiz.rotation.set(this.rot[0] * ANG, this.rot[1] * ANG, this.rot[2] * ANG, "YXZ");
    this.raiz.updateMatrixWorld(true);
  }
}

class Tambor2 {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.proc = procDe(a, "e");
    this.reventado = false;
  }
  async iniciar() {
    const E = this.E, a = this.a, ruta = a.modelo || `niveles/${E.ctx.st?.()}/${(tokVal(a.opts?.m?.[0]) || 0).toString(16).padStart(4, "0")}.glb`;
    const o = await E.ctx.cargar(ruta);
    const local = (new THREE.Box3).setFromObject(o);
    const p = v3(a.p || lista(a, "p"));
    o.position.copy(p);
    o.rotation.copy(eulerYXZ(a.d || lista(a, "d")));
    o.userData.actor = a;
    E.agregar(o);
    this.o = o;
    this.objs = [ o ];
    const tam = local.getSize(new THREE.Vector3), med = new THREE.Vector3(Math.trunc(tam.x / MM / 4) * MM, Math.trunc(tam.y / MM / 4) * MM, Math.trunc(tam.z / MM / 4) * MM);
    this.b = E.blanco(this, p.clone().setY(p.y - local.min.y), med, (modo, dir, punto, daño = 64) => {
      if (modo === 2 || daño > 20) this.explotar();
    });
  }
  mensaje(h) {
    if (h === MSG.ROMPE) this.explotar();
  }
  explotar() {
    if (this.reventado) return;
    this.reventado = true;
    const E = this.E;
    E.proc(this.proc);
    this.o.updateMatrixWorld(true);
    for (const x of [ -875, 875 ]) E.explotar(new THREE.Vector3(x * MM, 1, 0).applyMatrix4(this.o.matrixWorld));
    E.matar(this);
  }
}

const ANIME_HUMO_NEGRO = {
  tex: "smoke",
  dev: [ 8, 4 ],
  nAnime: 30,
  amb: 2,
  size: [ 1e3, 1e3 ],
  v: 32,
  script: [ 0, 58, 1, 0, 5, 1, 254, 12, 0, 7, 4, 0, 0, 0, 150, 0, 0, 10, 1, 44, 1, 44, 2, 0, 1, 4, 0, 0, 0, 150, 0, 0, 10, 1, 44, 1, 44, 2, 0, 1, 4, 0, 0, 0, 150, 0, 0, 10, 1, 44, 1, 44, 1, 255, 8, 252, 252, 252, 2, 0, 1, 13, 15 ]
};

const ANIME_PANEL = {
  tex: "smoke",
  dev: [ 8, 4 ],
  nAnime: 30,
  amb: 1,
  size: [ 100, 100 ],
  v: 80,
  script: [ 0, 51, 1, 0, 5, 1, 254, 12, 0, 4, 1, 255, 10, 0, 10, 0, 10, 2, 0, 1, 13, 12, 0, 32, 1, 255, 4, 0, 0, 0, 20, 0, 0, 2, 0, 1, 13, 12, 0, 47, 8, 255, 255, 255, 1, 255, 10, 0, 10, 0, 10, 2, 0, 1, 13, 15 ]
};

const ANIME_SMOKE_LN1 = {
  tex: "smoke",
  dev: [ 8, 4 ],
  nAnime: 30,
  amb: 2,
  size: [ 500, 500 ],
  v: 16,
  script: [ 0, 167, 4, 0, 11, 0, 49, 0, 92, 0, 135, 1, 254, 12, 0, 7, 2, 0, 1, 10, 0, 50, 0, 50, 1, 255, 2, 0, 1, 13, 12, 0, 7, 1, 255, 2, 0, 1, 1, 255, 8, 255, 255, 255, 2, 0, 1, 13, 15, 10, 1, 244, 1, 244, 1, 254, 12, 0, 7, 2, 0, 1, 10, 0, 100, 0, 100, 1, 255, 2, 0, 1, 13, 12, 0, 7, 1, 255, 2, 0, 1, 1, 255, 8, 255, 255, 255, 2, 0, 1, 13, 15, 10, 3, 232, 3, 232, 1, 254, 12, 0, 7, 2, 0, 1, 10, 0, 200, 0, 100, 1, 255, 2, 0, 1, 13, 12, 0, 7, 1, 255, 2, 0, 1, 1, 255, 8, 255, 255, 255, 2, 0, 1, 13, 15, 10, 7, 208, 7, 208, 1, 254, 12, 0, 7, 2, 0, 1, 10, 1, 144, 1, 144, 1, 255, 2, 0, 1, 13, 12, 0, 7, 1, 255, 2, 0, 1, 1, 255, 8, 255, 255, 255, 2, 0, 1, 13, 15 ]
};

const ANIME_VAPOR = {
  tex: "smoke",
  dev: [ 8, 4 ],
  nAnime: 30,
  amb: 1,
  size: [ 300, 300 ],
  v: 128,
  script: [ 0, 144, 4, 0, 11, 0, 44, 0, 81, 0, 118, 12, 0, 5, 1, 255, 10, 0, 50, 0, 50, 2, 0, 1, 13, 12, 0, 10, 1, 255, 10, 0, 100, 0, 100, 8, 244, 244, 244, 2, 0, 1, 13, 15, 8, 0, 192, 192, 12, 0, 5, 1, 255, 10, 0, 50, 0, 50, 2, 0, 1, 13, 12, 0, 10, 1, 255, 10, 0, 100, 0, 100, 8, 244, 250, 250, 2, 0, 1, 13, 15, 8, 224, 0, 224, 12, 0, 5, 1, 255, 10, 0, 50, 0, 50, 2, 0, 1, 13, 12, 0, 10, 1, 255, 10, 0, 100, 0, 100, 8, 247, 244, 247, 2, 0, 1, 13, 15, 8, 224, 224, 0, 12, 0, 5, 1, 255, 10, 0, 50, 0, 50, 2, 0, 1, 13, 12, 0, 10, 1, 255, 10, 0, 100, 0, 100, 8, 247, 247, 244, 2, 0, 1, 13, 15 ]
};

const ANIME_GRUA_A = {
  tex: "smoke",
  dev: [ 8, 4 ],
  nAnime: 30,
  amb: 2,
  size: [ 1500, 1500 ],
  v: 64,
  script: [ 0, 21, 1, 0, 5, 1, 254, 12, 0, 7, 10, 0, 200, 0, 200, 1, 255, 8, 248, 248, 248, 2, 0, 1, 13, 15 ]
};

const ANIME_GRUA_B = {
  tex: "smoke",
  dev: [ 8, 4 ],
  nAnime: 30,
  amb: 1,
  size: [ 800, 800 ],
  v: 64,
  script: [ 0, 54, 2, 0, 7, 0, 28, 1, 254, 12, 0, 7, 10, 1, 44, 1, 44, 1, 255, 8, 248, 248, 248, 2, 0, 1, 13, 15, 1, 254, 10, 1, 244, 1, 244, 8, 190, 190, 190, 2, 0, 1, 12, 0, 15, 10, 0, 200, 0, 200, 1, 255, 8, 240, 240, 240, 2, 0, 1, 13, 15 ]
};

class HumoNegro {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.ps = vecs(a, "p").slice(0, 4);
    this.t = 0;
  }
  cuadro() {
    const n = this.ps.length;
    if (!n) return;
    this.ps.forEach((p, i) => {
      if (this.t % 8 === (i * Math.trunc(8 / n) & 255)) this.E.anime(ANIME_HUMO_NEGRO, {
        pos: p.slice()
      });
    });
    this.t++;
  }
}

class Porton {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.roto = false;
  }
  async iniciar() {
    const E = this.E, o = await E.ctx.cargar("actores/porton_19a.glb");
    E.ctx.teñir?.(o);
    this.raiz = new THREE.Group;
    this.raiz.add(o);
    E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    this.pared = paredSegmentos(E);
    this.pared.poner([ segmento([ -3500, 0, -5e3 ], [ 1500, 4e3, -5e3 ]) ]);
    E.agregar(this.pared);
    this.objs.push(this.pared);
    ponerPared(E, this.pared, true);
    this.b = E.blanco(this, new THREE.Vector3(-.5, 2, -5), new THREE.Vector3(2.5, 2, .5), modo => {
      if (modo === 2) this.romper();
    });
    E.ctx.alCambiar?.();
  }
  async romper() {
    if (this.roto) return;
    this.roto = true;
    const E = this.E;
    E.matarBlanco(this.b);
    this.pared.poner([ segmento([ 500, 0, -5e3 ], [ 1500, 4e3, -5e3 ]) ]);
    E.din.alCambiarParedes?.();
    const o = await E.ctx.cargar("actores/porton_19a_roto.glb");
    E.ctx.teñir?.(o);
    this.raiz.clear();
    this.raiz.add(o);
    E.ctx.alCambiar?.();
  }
}

class PonerHzd {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.paredes = [];
  }
  async iniciar() {
    const E = this.E, h = tokVal(this.a.opts?.h?.[0]);
    if (typeof h !== "number") {
      this.muerto = true;
      return;
    }
    let z = null;
    try {
      z = await fetch(`assets/actores/hzm/${h.toString(16).padStart(4, "0")}.json`).then(r => r.json());
    } catch {}
    if (!z) {
      this.muerto = true;
      return;
    }
    const o = lista(this.a, "p"), off = o.length >= 3 ? o.slice(0, 3) : [ 0, 0, 0 ], q = p => [ (p[0] + off[0]) * MM, (p[1] + off[1]) * MM, (p[2] + off[2]) * MM ];
    const pos = [];
    for (const w of z.paredes || []) {
      const A = q(w.a), B = q(w.b), hh = (w.alto || 0) * MM;
      pos.push(A[0], A[1], A[2], B[0], B[1], B[2], B[0], B[1] + hh, B[2], A[0], A[1], A[2], B[0], B[1] + hh, B[2], A[0], A[1] + hh, A[2]);
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = m.userData.extra = true;
      E.agregar(m);
      this.objs.push(m);
      this.paredes.push(m);
      ponerPared(E, m, true);
    }
    const pisos = new THREE.Group;
    pisos.userData.actor = {
      tipo: "DYNFLOOR",
      nombre: this.a.nombre
    };
    const pp = [];
    for (const f of z.pisos || []) {
      const P = (f.puntos || []).map(q);
      for (let i = 1; i + 1 < P.length; i++) pp.push(...P[0], ...P[i], ...P[i + 1]);
    }
    if (pp.length) {
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute(pp, 3));
      pisos.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      })));
    }
    E.agregar(pisos);
    this.objs.push(pisos);
    E.ctx.alCambiar?.();
  }
  mensaje(h) {
    if (h === MSG.OFF2) this.E.matar(this);
  }
  morir() {
    for (const m of this.paredes) ponerPared(this.E, m, false);
    this.E.ctx.alCambiar?.();
  }
}

class SinDibujo {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    if (a.tipo === "9FFD_2ND") E.segundoMando = true;
  }
}

const CLASES = {
  DOOR2: PuertaPlegadiza,
  MIRROR: Espejo,
  BELONG: Pegado,
  SCN_MARK: MarcaCabeza,
  RADARPOINT: PuntoRadar,
  ITEM_DOT: PuntoItem,
  KEY_ITEM: ReparteItems,
  SMKTRGT: CañosVapor,
  CRANE: Grua,
  ELEVCROW: Cuervos,
  CONTAINER: Contenedores,
  DRUMCAN: Tambor,
  DRUMCAN2: Tambor2,
  BLACKSMOKE: HumoNegro,
  PK_GATE: Porton,
  PUTHZD: PonerHzd,
  MOSAIC: SinDibujo,
  "9FFD_2ND": SinDibujo,
  "2D0A_2ND": SinDibujo,
  TOBCNT: SinDibujo,
  TEXSCROLL: DesplazaTextura,
  MOTIONSE: SonidoMovimiento,
  DUCTMOUSE: Raton,
  ASIATOKUN: Pisadas,
  TEXTURE: Lampara,
  GLASS: Vidrio,
  CHAIR: Silla,
  MONITOR1: Monitor,
  PAPER: Papel,
  BLOOD_POOL: Charcos,
  BLOOD_POOL2: CharcoQueCrece,
  EMITTER: Brillos,
  BLINKTEX: Brillos,
  ENV_SOUND: SonidoAmbiente,
  SMOKE: VaporesDelScript,
  ELECFLOOR: PisoElectrico,
  FLR_SPA: ChispasPiso,
  WALLSPARK: ChispasPared,
  DEATHSPARK: ChispasMuerte,
  BUBBLE: Burbujas,
  BUB_D_SN: Zambullida,
  HIYOKO: Pollitos,
  UJI: Gusanos,
  REDALERT: AlarmaRoja,
  BREAK_OBJECT: Rompible
};

Object.assign(CLASES, CLASES_GUION);

for (const t of TIPOS_GUION) TIPOS_EXTRA.add(t);
