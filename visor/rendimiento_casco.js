// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { REND } from "./rendimiento.js";

const q = new URLSearchParams(location.search);

export const CASCO = {
  transparentes: REND.activo && q.get("rendt") !== "0",
  huesos: REND.activo && q.get("rendh") !== "0",
  atajos: REND.activo && q.get("rendc") !== "0"
};

const stats = {
  unaPasada: 0,
  dosPasadas: 0,
  huesosSubidos: 0,
  huesosIguales: 0
};

window.__rendCasco = (reiniciar = false) => {
  const r = {
    ...CASCO,
    ...stats
  };
  if (reiniciar) for (const k in stats) stats[k] = 0;
  return r;
};

const CONMUTA = new Set([ THREE.AdditiveBlending, THREE.SubtractiveBlending, THREE.MultiplyBlending ]);

const _planas = new WeakMap;

const _a = new THREE.Vector3, _b = new THREE.Vector3, _c = new THREE.Vector3, _d = new THREE.Vector3, _n = new THREE.Vector3, _n0 = new THREE.Vector3;

function esPlana(g) {
  const pos = g.attributes.position, ind = g.index;
  if (!pos || pos.itemSize < 3 || Object.keys(g.morphAttributes).length) return false;
  let e = _planas.get(g);
  if (e && e.pos === pos && e.vp === pos.version && e.ind === ind && e.vi === (ind ? ind.version : -1)) return e.plana;
  let plana = true, d0 = 0, hay = false, escala = 0;
  const n = ind ? ind.count : pos.count;
  for (let i = 0; i < pos.count; i++) escala = Math.max(escala, Math.abs(pos.getX(i)), Math.abs(pos.getY(i)), Math.abs(pos.getZ(i)));
  const tol = Math.max(1e-6, escala * 1e-5);
  for (let t = 0; t + 2 < n && plana; t += 3) {
    const i0 = ind ? ind.getX(t) : t, i1 = ind ? ind.getX(t + 1) : t + 1, i2 = ind ? ind.getX(t + 2) : t + 2;
    _a.fromBufferAttribute(pos, i0);
    _b.fromBufferAttribute(pos, i1);
    _c.fromBufferAttribute(pos, i2);
    _n.subVectors(_c, _b).cross(_d.subVectors(_b, _a));
    const L = _n.length();
    if (L < 1e-12) continue;
    _n.divideScalar(L);
    if (!hay) {
      _n0.copy(_n);
      d0 = _n0.dot(_a);
      hay = true;
      continue;
    }
    if (_n.dot(_n0) < 1 - 1e-6) {
      plana = false;
      break;
    }
    if (Math.abs(_n0.dot(_a) - d0) > tol || Math.abs(_n0.dot(_b) - d0) > tol || Math.abs(_n0.dot(_c) - d0) > tol) plana = false;
  }
  _planas.set(g, {
    pos: pos,
    vp: pos.version,
    ind: ind,
    vi: ind ? ind.version : -1,
    plana: plana
  });
  return plana;
}

const _puestos = new WeakSet;

function unaPasadaDaIgual(m, g, o) {
  if (!o.isMesh || m.wireframe || m.stencilWrite || m.alphaToCoverage) return false;
  if (CONMUTA.has(m.blending) && m.depthWrite === false) return true;
  return !o.isSkinnedMesh && !o.isInstancedMesh && !o.isBatchedMesh && !!g && esPlana(g);
}

function decidir(m, g, o) {
  if (m.transparent !== true || m.side !== THREE.DoubleSide) return;
  if (m.forceSinglePass === true && !_puestos.has(m)) return;
  const una = unaPasadaDaIgual(m, g, o);
  if (una !== m.forceSinglePass) {
    m.forceSinglePass = una;
    m.needsUpdate = true;
    if (una) _puestos.add(m); else _puestos.delete(m);
  }
  if (una) stats.unaPasada++; else stats.dosPasadas++;
}

if (CASCO.transparentes) {
  const obr0 = THREE.Material.prototype.onBeforeRender;
  THREE.Material.prototype.onBeforeRender = function(R, escena, camara, geo, obj, grupo) {
    if (this.transparent === true && this.side === THREE.DoubleSide) {
      if (CASCO.transparentes) decidir(this, geo, obj); else if (_puestos.has(this)) {
        this.forceSinglePass = false;
        this.needsUpdate = true;
        _puestos.delete(this);
      }
    }
    return obr0.call(this, R, escena, camara, geo, obj, grupo);
  };
}

window.__rendCascoSet = (k, v) => {
  if (k in CASCO) CASCO[k] = !!v;
  return CASCO[k];
};

const _off = new THREE.Matrix4, _id = new THREE.Matrix4;

if (CASCO.huesos) {
  const sk0 = THREE.Skeleton.prototype.update;
  THREE.Skeleton.prototype.update = function() {
    const tex = this.boneTexture;
    if (tex === null || !CASCO.huesos) {
      this.__bmTex = null;
      return sk0.call(this);
    }
    const huesos = this.bones, inv = this.boneInverses, bm = this.boneMatrices, n = huesos.length * 16;
    let tmp = this.__bmTmp;
    if (!tmp || tmp.length < n) tmp = this.__bmTmp = new Float32Array(n);
    for (let i = 0, il = huesos.length; i < il; i++) {
      _off.multiplyMatrices(huesos[i] ? huesos[i].matrixWorld : _id, inv[i]);
      _off.toArray(tmp, i * 16);
    }
    let igual = this.__bmTex === tex && this.__bmVer === tex.version;
    if (igual) for (let k = 0; k < n; k++) if (tmp[k] !== bm[k]) {
      igual = false;
      break;
    }
    if (igual) {
      stats.huesosIguales++;
      return;
    }
    bm.set(n === tmp.length ? tmp : tmp.subarray(0, n));
    tex.needsUpdate = true;
    this.__bmTex = tex;
    this.__bmVer = tex.version;
    stats.huesosSubidos++;
  };
}

export function instalarCasco(R) {
  if (!R || R.__casco) return;
  R.__casco = true;
  _R = R;
  calidadCasco.aplicarEscala();
  R.xr.addEventListener("sessionend", () => setTimeout(() => calidadCasco.aplicarEscala(), 0));
  R.xr.addEventListener("sessionstart", () => frecuenciaCasco.aplicar());
  if (!CASCO.transparentes) return;
  const c0 = R.compile;
  R.compile = function(escena, camara, destino) {
    try {
      escena.traverse(o => {
        if (!o.isMesh || !o.material) return;
        for (const m of [].concat(o.material)) if (m && m.transparent === true && m.side === THREE.DoubleSide) decidir(m, o.geometry, o);
      });
    } catch {}
    return c0.call(this, escena, camara, destino);
  };
}

const NIVELES = [ "ALTA", "EQUILIBRADA", "RAPIDA" ];

let _R = null;

export const calidadCasco = {
  nivel: (() => {
    try {
      const v = +localStorage.getItem("sm_vrcalidad");
      return v >= 0 && v <= 2 ? v : 0;
    } catch {
      return 0;
    }
  })(),
  nombre() {
    return NIVELES[this.nivel];
  },
  poner(n) {
    this.nivel = (n % 3 + 3) % 3;
    try {
      localStorage.setItem("sm_vrcalidad", String(this.nivel));
    } catch {}
    this.aplicarEscala();
    return this.nivel;
  },
  rotar(d = 1) {
    return this.poner(this.nivel + d);
  },
  maxOtrosSombra(max) {
    return this.nivel >= 1 ? 0 : max;
  },
  sombraSnake() {
    return this.nivel < 2;
  },
  escalaFb() {
    return this.nivel >= 2 ? .8 : 1;
  },
  _acHud: 0,
  _parHud: false,
  dtHud(dt) {
    if (this.nivel === 0) {
      this._acHud = 0;
      return dt;
    }
    this._acHud += dt;
    this._parHud = !this._parHud;
    if (this._parHud) return null;
    const r = this._acHud;
    this._acHud = 0;
    return r;
  },
  aplicarEscala() {
    if (_R && !_R.xr.isPresenting) _R.xr.setFramebufferScaleFactor(this.escalaFb());
  }
};

window.__calidadCasco = calidadCasco;

const FRECUENCIAS = [ 72, 60 ];

export const frecuenciaCasco = {
  hz: (() => {
    try {
      const v = +localStorage.getItem("sm_vrhz");
      return FRECUENCIAS.includes(v) ? v : 72;
    } catch {
      return 72;
    }
  })(),
  pedida: null,
  nombre() {
    const r = _R?.xr?.getSession?.()?.frameRate;
    return this.hz + " HZ" + (r && Math.round(r) !== this.hz ? " (AHORA " + Math.round(r) + ")" : "");
  },
  poner(hz) {
    this.hz = FRECUENCIAS.includes(hz) ? hz : 72;
    try {
      localStorage.setItem("sm_vrhz", String(this.hz));
    } catch {}
    this.aplicar();
    return this.hz;
  },
  rotar(d = 1) {
    const i = Math.max(0, FRECUENCIAS.indexOf(this.hz));
    return this.poner(FRECUENCIAS[(i + d + FRECUENCIAS.length) % FRECUENCIAS.length]);
  },
  aplicar(s = _R?.xr?.getSession?.()) {
    try {
      const lista = s?.supportedFrameRates ? [ ...s.supportedFrameRates ] : [];
      if (!s?.updateTargetFrameRate || !lista.length) return this.pedida = null;
      const meta = lista.includes(this.hz) ? this.hz : lista.reduce((a, b) => Math.abs(b - this.hz) < Math.abs(a - this.hz) ? b : a);
      this.pedida = meta;
      if (s.frameRate !== meta) s.updateTargetFrameRate(meta).catch(e => window.debugLog?.("info", "casco: no tomó " + meta + " Hz (" + e?.message + ")"));
      return meta;
    } catch {
      return this.pedida = null;
    }
  }
};

window.__frecuenciaCasco = frecuenciaCasco;
