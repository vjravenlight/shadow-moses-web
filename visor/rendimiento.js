// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const q = new URLSearchParams(location.search).get("rend");

let guardado = null;

try {
  guardado = localStorage.getItem("sm_rend");
} catch {}

export const REND = {
  activo: q === "0" ? false : q === "1" ? true : guardado !== "0",
  unir: true,
  recortarPersonajes: true,
  unirPersonajes: new URLSearchParams(location.search).get("rendp") !== "0"
};

window.__rendSet = (k, v) => {
  if (k in REND && k !== "activo") REND[k] = v;
  return REND[k];
};

export function guardarRend(si) {
  REND.activo = !!si;
  try {
    localStorage.setItem("sm_rend", si ? "1" : "0");
  } catch {}
}

const stats = {
  piezas: 0,
  primitivasAntes: 0,
  mallasUnidas: 0,
  sueltas: 0,
  atlas: [],
  ms: 0,
  personajesRecortables: 0,
  personajesSinRecorte: 0
};

window.__rendInfo = () => ({
  activo: REND.activo,
  ...stats,
  atlas: stats.atlas.slice(-12)
});

const BORDE = 2;

const MAX_ATLAS = 2048;

export class MallaUnida extends THREE.Mesh {
  constructor(geo, mat, partes = []) {
    super(geo, mat);
    this.partes = partes;
    this.isMallaUnida = true;
  }
  copy(src, rec) {
    super.copy(src, rec);
    this.partes = src.partes;
    return this;
  }
  onBeforeRender() {
    const m = this.material;
    if (m && !Array.isArray(m) && !m.__parche && m.map && /^atlas:/.test(m.map.name || "")) {
      m.userData.parcheAtlas = false;
      parcheAtlas(m);
    }
  }
  raycast(rc, out) {
    const n0 = out.length;
    for (const p of this.partes) {
      p.matrixWorld.copy(this.matrixWorld);
      p.raycast(rc, out);
    }
    for (let i = n0; i < out.length; i++) out[i].object = this;
  }
}

const esIdentidad = o => o.position.lengthSq() < 1e-12 && Math.abs(o.quaternion.w) > 1 - 1e-9 && Math.abs(o.scale.x - 1) < 1e-9 && Math.abs(o.scale.y - 1) < 1e-9 && Math.abs(o.scale.z - 1) < 1e-9;

const firmaGeo = g => Object.keys(g.attributes).sort().map(k => {
  const a = g.attributes[k];
  return `${k}:${a.itemSize}:${a.array.constructor.name}:${a.normalized ? 1 : 0}:${a.isInterleavedBufferAttribute ? "i" : ""}`;
}).join(",") + (g.index ? ":idx" : ":sin") + (Object.keys(g.morphAttributes).length ? ":morph" : "");

function rangoUV(g) {
  const a = g.attributes.uv;
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (let i = 0; i < a.count; i++) {
    const u = a.getX(i), v = a.getY(i);
    if (u < u0) u0 = u;
    if (u > u1) u1 = u;
    if (v < v0) v0 = v;
    if (v > v1) v1 = v;
  }
  return [ u0, v0, u1, v1 ];
}

function empaquetar(lista, ancho, altoMax) {
  const orden = lista.slice().sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0, y = 0, fila = 0;
  const lugar = new Map;
  for (const t of orden) {
    const w = t.w + 2 * BORDE, h = t.h + 2 * BORDE;
    if (w > ancho) return null;
    if (x + w > ancho) {
      y += fila;
      x = 0;
      fila = 0;
    }
    if (y + h > altoMax) return null;
    lugar.set(t, {
      x: x + BORDE,
      y: y + BORDE
    });
    x += w;
    fila = Math.max(fila, h);
  }
  return {
    lugar: lugar,
    alto: y + fila
  };
}

const pot2 = n => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

function armarAtlas(R, texs, lugar, W, H, nombre) {
  const rt = new THREE.WebGLRenderTarget(W, H, {
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    generateMipmaps: false
  });
  rt.texture.flipY = false;
  rt.texture.premultiplyAlpha = false;
  const gl = R.getContext(), previo = R.getRenderTarget(), cc = new THREE.Color;
  R.getClearColor(cc);
  const ca = R.getClearAlpha();
  R.initRenderTarget(rt);
  R.setRenderTarget(rt);
  R.setClearColor(0, 0);
  R.clear(true, false, false);
  R.setClearColor(cc, ca);
  R.setRenderTarget(previo);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  const pos = new THREE.Vector2;
  for (const t of texs) {
    const l = lugar.get(t);
    R.copyTextureToTexture(t.tex, rt.texture, null, pos.set(l.x, l.y));
  }
  const d = new Uint8Array(W * H * 4);
  R.readRenderTargetPixels(rt, 0, 0, W, H, d);
  rt.dispose();
  const px = (x, y) => (y * W + x) * 4;
  for (const t of texs) {
    const {x: x, y: y} = lugar.get(t), w = t.w, h = t.h;
    for (let r = y; r < y + h; r++) for (let k = 1; k <= BORDE; k++) {
      d.copyWithin(px(x - k, r), px(x, r), px(x, r) + 4);
      d.copyWithin(px(x + w - 1 + k, r), px(x + w - 1, r), px(x + w - 1, r) + 4);
    }
    for (let k = 1; k <= BORDE; k++) {
      d.copyWithin(px(x - BORDE, y - k), px(x - BORDE, y), px(x + w + BORDE, y));
      d.copyWithin(px(x - BORDE, y + h - 1 + k), px(x - BORDE, y + h - 1), px(x + w + BORDE, y + h - 1));
    }
  }
  const t0 = texs[0].tex, a = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  a.name = nombre;
  a.colorSpace = t0.colorSpace;
  a.flipY = false;
  a.premultiplyAlpha = false;
  a.generateMipmaps = false;
  a.magFilter = t0.magFilter;
  a.minFilter = t0.minFilter;
  a.wrapS = a.wrapT = THREE.ClampToEdgeWrapping;
  a.anisotropy = t0.anisotropy;
  a.needsUpdate = true;
  return a;
}

export function parcheAtlas(mat) {
  if (!mat || mat.userData.parcheAtlas) return;
  mat.userData.parcheAtlas = true;
  mat.__parche = true;
  const previo = mat.onBeforeCompile, clave = mat.customProgramCacheKey;
  mat.onBeforeCompile = (sh, r) => {
    previo?.call(mat, sh, r);
    sh.vertexShader = "attribute vec4 atlasRect;\nflat varying vec4 vAtlasRect;\n" + sh.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\n\tvAtlasRect = atlasRect;");
    sh.fragmentShader = "flat varying vec4 vAtlasRect;\n" + sh.fragmentShader.replace("#include <map_fragment>", `\n#ifdef USE_MAP\n\tvec2 tamAtlas = vec2( textureSize( map, 0 ) );\n\tvec2 pAtlas = clamp( vMapUv * tamAtlas, vAtlasRect.xy + 0.5, vAtlasRect.xy + vAtlasRect.zw - 0.5 );\n\tvec4 sampledDiffuseColor = texture2D( map, pAtlas / tamAtlas );\n\tdiffuseColor *= sampledDiffuseColor;\n#endif`);
  };
  mat.customProgramCacheKey = () => (clave ? clave.call(mat) : "") + "|atlas";
  mat.needsUpdate = true;
}

export function unirMallas(root, R, nombre = "", compartir = null) {
  if (!REND.activo || !REND.unir || !R || !root) return null;
  const t0 = performance.now();
  if (compartir) root.traverse(o => {
    if (o.isMesh && !Array.isArray(o.material)) compartir(o.material);
  });
  const orden = [];
  let sueltas = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const clave = claveUnion(o);
    if (!clave) sueltas++;
    orden.push({
      o: o,
      clave: clave
    });
  });
  const tramos = [];
  let actual = null;
  for (const e of orden) {
    if (e.clave && actual && actual.clave === e.clave && actual.padre === e.o.parent) {
      actual.mallas.push(e.o);
      continue;
    }
    actual = e.clave ? {
      clave: e.clave,
      padre: e.o.parent,
      mallas: [ e.o ]
    } : null;
    if (actual) tramos.push(actual);
  }
  const utiles = tramos.filter(t => t.mallas.length >= 2);
  if (!utiles.length) return null;
  const clases = new Map;
  for (const tr of utiles) for (const o of tr.mallas) {
    const t = o.material.map, k = [ t.colorSpace, t.magFilter, t.minFilter, t.anisotropy ].join("|");
    if (!clases.has(k)) clases.set(k, new Map);
    const c = clases.get(k);
    if (!c.has(t)) c.set(t, {
      tex: t,
      w: t.image.width,
      h: t.image.height
    });
  }
  const lugarDe = armarAtlases(clases, R, nombre);
  let nuevas = 0;
  for (const tr of utiles) {
    const sub = [];
    let cur = null;
    for (const o of tr.mallas) {
      const L = lugarDe.get(o.material.map);
      if (L && cur && cur.atlas === L.atlas) {
        cur.mallas.push(o);
        continue;
      }
      cur = L ? {
        atlas: L.atlas,
        mallas: [ o ]
      } : null;
      if (cur) sub.push(cur);
    }
    for (const sb of sub) if (sb.mallas.length >= 2 && unirTramo(sb.mallas, lugarDe)) nuevas++;
  }
  if (!nuevas) return null;
  {
    const atlasUsados = new Set([ ...lugarDe.values() ].map(l => l.atlas)), geos = [];
    root.traverse(o => {
      if (o.isMallaUnida) geos.push(o.geometry);
    });
    let vivas = geos.length;
    for (const g of geos) g.addEventListener("dispose", function f() {
      g.removeEventListener("dispose", f);
      if (--vivas === 0) for (const a of atlasUsados) a.dispose();
    });
  }
  let quedan = 0;
  root.traverse(o => {
    if (o.isMesh) quedan++;
  });
  stats.piezas++;
  stats.primitivasAntes += orden.length;
  stats.mallasUnidas += quedan;
  stats.sueltas += sueltas;
  stats.ms += performance.now() - t0;
  return quedan;
}

function armarAtlases(clases, R, nombre, lugarDe = new Map) {
  for (const porTex of clases.values()) {
    let resto = [ ...porTex.values() ];
    while (resto.length) {
      const area = resto.reduce((s, t) => s + (t.w + 2 * BORDE) * (t.h + 2 * BORDE), 0);
      let W = Math.min(MAX_ATLAS, Math.max(64, pot2(Math.ceil(Math.sqrt(area)))));
      let p = empaquetar(resto, W, MAX_ATLAS);
      if (!p && W < MAX_ATLAS) {
        W = MAX_ATLAS;
        p = empaquetar(resto, W, MAX_ATLAS);
      }
      let entran = resto;
      if (!p) {
        entran = [];
        for (const t of resto.slice().sort((a, b) => b.h - a.h)) {
          if (empaquetar([ ...entran, t ], W, MAX_ATLAS)) entran.push(t);
        }
        if (!entran.length) break;
        p = empaquetar(entran, W, MAX_ATLAS);
      }
      const H = pot2(p.alto);
      let tex = null;
      try {
        tex = armarAtlas(R, entran, p.lugar, W, H, `atlas:${nombre}:${stats.atlas.length}`);
      } catch (e) {
        console.warn("rendimiento: no se pudo armar el atlas", nombre, e.message);
      }
      if (tex) {
        for (const t of entran) {
          const l = p.lugar.get(t);
          lugarDe.set(t.tex, {
            atlas: tex,
            W: W,
            H: H,
            x: l.x,
            y: l.y,
            w: t.w,
            h: t.h
          });
        }
        stats.atlas.push({
          nombre: nombre,
          w: W,
          h: H,
          texturas: entran.length
        });
      }
      resto = resto.filter(t => !entran.includes(t));
    }
  }
  return lugarDe;
}

const UNIR_SIEMPRE = /^niveles\/[^/]+\/rasen_[0-9a-f]+\.glb$|^modelos\/(gca_gun|gca_arm|s_camera|cam_arm|claymore)\.glb$/;

export const unirSiempre = url => UNIR_SIEMPRE.test(url || "");

const _corren = new Set;

export function texturasQueCorren(hashes) {
  _corren.clear();
  for (const h of hashes || []) _corren.add(h);
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

function claveUnion(o) {
  if (o.isSkinnedMesh || o.isInstancedMesh || !o.parent || Array.isArray(o.material) || !esIdentidad(o)) return null;
  const m = o.material, g = o.geometry, t = m.map, img = t?.image;
  if (_corren.size && t && _corren.has(hashTextura(t.name))) return null;
  if (!t || !img || !img.width || m.transparent || /_t\d$/.test(m.name || "") || !g.attributes.uv || g.attributes.uv.isInterleavedBufferAttribute || g.groups.length) return null;
  if (t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x || t.offset.y || t.rotation || t.matrixAutoUpdate === false || t.flipY) return null;
  const [u0, v0, u1, v1] = rangoUV(g), w = img.width, h = img.height;
  const clamp = t.wrapS === THREE.ClampToEdgeWrapping && t.wrapT === THREE.ClampToEdgeWrapping;
  const mU = clamp ? BORDE / w : 0, mV = clamp ? BORDE / h : 0;
  if (!(u0 >= -mU && v0 >= -mV && u1 < 1 + mU && v1 < 1 + mV) || !clamp && (u1 >= 1 || v1 >= 1)) return null;
  return [ m.type, m.side, m.alphaTest, m.color.getHexString(), m.vertexColors, m.depthWrite, m.depthTest, m.blending, m.opacity, m.polygonOffset, t.colorSpace, t.magFilter, t.minFilter, firmaGeo(g), o.renderOrder, o.castShadow, o.receiveShadow, o.layers.mask, o.visible, o.frustumCulled ].join("|");
}

function unirTramo(mallas, lugarDe) {
  const L0 = lugarDe.get(mallas[0].material.map);
  const geos = mallas.map(o => {
    const g = o.geometry.clone(), uv = g.attributes.uv, l = lugarDe.get(o.material.map);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (l.x + uv.getX(i) * l.w) / l.W, (l.y + uv.getY(i) * l.h) / l.H);
    const r = new Float32Array(uv.count * 4);
    for (let i = 0; i < uv.count; i++) r.set([ l.x, l.y, l.w, l.h ], i * 4);
    g.setAttribute("atlasRect", new THREE.BufferAttribute(r, 4));
    return g;
  });
  const geo = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (!geo) return false;
  const o0 = mallas[0], m0 = o0.material, mat = m0.clone();
  mat.map = L0.atlas;
  mat.name = `unido_${m0.name || m0.id}`;
  mat.userData.ordenMat = m0.id;
  const u = new MallaUnida(geo, mat, mallas);
  u.name = "unida_" + mallas.length;
  u.renderOrder = o0.renderOrder;
  u.castShadow = o0.castShadow;
  u.receiveShadow = o0.receiveShadow;
  u.layers.mask = o0.layers.mask;
  u.frustumCulled = o0.frustumCulled;
  u.visible = o0.visible;
  u.userData.unida = true;
  const padre = o0.parent, i0 = padre.children.indexOf(o0);
  for (const o of mallas) {
    o.removeFromParent();
    o.updateMatrixWorld(true);
  }
  u.parent = padre;
  padre.children.splice(Math.min(i0, padre.children.length), 0, u);
  u.dispatchEvent({
    type: "added"
  });
  return true;
}

const _ord = m => m.userData.ordenMat ?? m.id;

export function ordenOpaco(a, b) {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
  if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
  const ka = _ord(a.material), kb = _ord(b.material);
  if (ka !== kb) return ka - kb;
  if (a.material.id !== b.material.id) return a.material.id - b.material.id;
  if (a.z !== b.z) return a.z - b.z;
  return a.id - b.id;
}

const _datosHuesos = new WeakMap;

const _m = new THREE.Matrix4, _v = new THREE.Vector3, _b = new THREE.Vector3, _k = new THREE.Matrix4;

function datosHuesos(malla) {
  const g = malla.geometry;
  if (_datosHuesos.has(g)) return _datosHuesos.get(g);
  let r = null;
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, P = g.attributes.position, sk = malla.skeleton;
  if (si && sw && P && sk && !Object.keys(g.morphAttributes).length) {
    const margen = new Map;
    let rigido = true;
    for (let i = 0; i < P.count && rigido; i++) {
      let j = -1;
      for (let c = 0; c < 4; c++) {
        const w = sw.getComponent(i, c);
        if (w > .999) j = si.getComponent(i, c); else if (w > .001) {
          rigido = false;
          break;
        }
      }
      if (j < 0 || !rigido || !sk.boneInverses[j]) {
        rigido = false;
        break;
      }
      _v.fromBufferAttribute(P, i).applyMatrix4(malla.bindMatrix);
      _m.copy(sk.boneInverses[j]).invert();
      _b.setFromMatrixPosition(_m);
      margen.set(j, Math.max(margen.get(j) || 0, _v.distanceTo(_b)));
    }
    if (rigido && margen.size) r = [ ...margen ].map(([j, mg]) => {
      _m.copy(sk.boneInverses[j]).invert();
      return {
        j: j,
        margen: mg,
        reposo: (new THREE.Vector3).setFromMatrixPosition(_m)
      };
    });
  }
  _datosHuesos.set(g, r);
  return r;
}

class EsferaHuesos extends THREE.Sphere {
  constructor(malla, datos) {
    super();
    this._malla = malla;
    this._datos = datos;
    this._r = 0;
  }
  get center() {
    this._actualizar();
    return this._c;
  }
  set center(v) {
    this._c = v;
  }
  get radius() {
    return this._r;
  }
  set radius(v) {
    this._r = v;
  }
  clone() {
    return new THREE.Sphere(new THREE.Vector3, Infinity);
  }
  _actualizar() {
    const M = this._malla, sk = M.skeleton, c = this._c, d = this._datos;
    if (!sk || !d) {
      c.set(0, 0, 0);
      this._r = Infinity;
      return;
    }
    const pts = [];
    let mn0 = Infinity, mn1 = Infinity, mn2 = Infinity, mx0 = -Infinity, mx1 = -Infinity, mx2 = -Infinity;
    for (const h of d) {
      const hueso = sk.bones[h.j];
      if (!hueso) {
        c.set(0, 0, 0);
        this._r = Infinity;
        return;
      }
      _k.multiplyMatrices(M.bindMatrixInverse, hueso.matrixWorld).multiply(sk.boneInverses[h.j]);
      const p = _v.copy(h.reposo).applyMatrix4(_k), s = _k.getMaxScaleOnAxis();
      pts.push(p.x, p.y, p.z, h.margen * s);
      if (p.x < mn0) mn0 = p.x;
      if (p.y < mn1) mn1 = p.y;
      if (p.z < mn2) mn2 = p.z;
      if (p.x > mx0) mx0 = p.x;
      if (p.y > mx1) mx1 = p.y;
      if (p.z > mx2) mx2 = p.z;
    }
    c.set((mn0 + mx0) / 2, (mn1 + mx1) / 2, (mn2 + mx2) / 2);
    let r = 0;
    for (let i = 0; i < pts.length; i += 4) r = Math.max(r, Math.hypot(pts[i] - c.x, pts[i + 1] - c.y, pts[i + 2] - c.z) + pts[i + 3]);
    this._r = Number.isFinite(r) ? r * 1.02 + .02 : Infinity;
  }
}

export function cullingPersonajes(obj, fuente = null) {
  if (!REND.activo || !obj) return;
  if (fuente && REND.unirPersonajes) {
    try {
      instanciarPersonajes(obj, fuente);
    } catch (e) {
      console.warn("rendimiento: personaje sin unir", e.message);
    }
  }
  if (!REND.recortarPersonajes) return;
  obj.traverse(o => {
    if (!o.isSkinnedMesh || o.boundingSphere instanceof EsferaHuesos) return;
    const d = datosHuesos(o);
    if (o.isUnidaPersonaje) {
      if (d) {
        o.boundingSphere = new EsferaHuesos(o, d);
        o.frustumCulled = true;
      }
      return;
    }
    if (!d) {
      stats.personajesSinRecorte++;
      return;
    }
    o.boundingSphere = new EsferaHuesos(o, d);
    o.frustumCulled = true;
    stats.personajesRecortables++;
  });
}

let _R = null;

const _pila = [];

let _nRender = 0;

function instalarGanchos(R) {
  if (!R || R.__rend2) return;
  R.__rend2 = true;
  const r0 = R.render;
  R.render = function(escena, cam) {
    const c = this.xr.enabled && this.xr.isPresenting ? this.xr.getCamera() : cam;
    if (_copias.length) {
      try {
        procesarCopias();
      } catch (e) {
        _copias.length = 0;
        console.warn("rendimiento: copia de personaje sin unir", e.message);
      }
    }
    if (_pila.length > 16) _pila.length = 0;
    _pila.push({
      cam: c,
      id: ++_nRender
    });
    try {
      return r0.call(this, escena, cam);
    } finally {
      _pila.pop();
    }
  };
}

function renderDe(L) {
  const t = _pila[_pila.length - 1];
  if (!t) return 0;
  const c = t.cam;
  if (c.layers === L) return t.id;
  const cs = c.cameras;
  if (cs) for (let i = 0; i < cs.length; i++) if (cs[i].layers === L) return t.id;
  return 0;
}

const OBR = THREE.Object3D.prototype.onBeforeRender;

const igual16 = (a, b) => {
  const x = a.elements, y = b.elements;
  for (let i = 0; i < 16; i++) if (x[i] !== y[i]) return false;
  return true;
};

function mismosHuesos(a, b) {
  if (a === b) return true;
  if (!a || !b || a.bones.length !== b.bones.length || a.boneInverses.length !== b.boneInverses.length) return false;
  for (let i = 0; i < a.bones.length; i++) if (a.bones[i] !== b.bones[i] || !igual16(a.boneInverses[i], b.boneInverses[i])) return false;
  return true;
}

function uvCabe(g, t) {
  const img = t?.image;
  if (!img || !img.width || !g.attributes.uv || g.attributes.uv.isInterleavedBufferAttribute) return false;
  if (t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x || t.offset.y || t.rotation || t.matrixAutoUpdate === false || t.flipY) return false;
  const [u0, v0, u1, v1] = rangoUV(g), w = img.width, h = img.height;
  const clamp = t.wrapS === THREE.ClampToEdgeWrapping && t.wrapT === THREE.ClampToEdgeWrapping;
  const mU = clamp ? BORDE / w : 0, mV = clamp ? BORDE / h : 0;
  return u0 >= -mU && v0 >= -mV && u1 < 1 + mU && v1 < 1 + mV && (clamp || u1 < 1 && v1 < 1);
}

function unirGeos(mallas, nombres, uvs = null) {
  const geos = mallas.map((o, k) => {
    const s = o.geometry, g = new THREE.BufferGeometry;
    for (const n of nombres) g.setAttribute(n, uvs && n === "uv" ? uvs[k].uv : s.attributes[n]);
    if (uvs) g.setAttribute("atlasRect", uvs[k].rect);
    g.setIndex(s.index ? s.index : [ ...Array(s.attributes.position.count).keys() ]);
    return g;
  });
  const geo = mergeGeometries(geos, true);
  if (!geo) return null;
  const rangos = geo.groups.map(r => [ r.start, r.count ]);
  geo.clearGroups();
  return {
    geo: geo,
    rangos: rangos,
    indice: geo.index.array
  };
}

const _plantillas = new WeakMap;

export function refrescarNormalesUnidas(root) {
  for (const P of _plantillas.get(root) || []) for (const T of P.tramos) {
    const N = T.geo.attributes.normal;
    if (!N || !T.normalesDe) continue;
    let o = 0;
    for (const g of T.normalesDe) {
      const a = g.attributes.normal;
      for (let i = 0; i < a.count; i++) N.setXYZ(o++, a.getX(i), a.getY(i), a.getZ(i));
    }
    N.needsUpdate = true;
  }
}

export function prepararPersonajes(root, R) {
  if (!REND.activo || !REND.unirPersonajes || !R || !root || _plantillas.has(root)) return;
  _R = R;
  const t0 = performance.now();
  const porPadre = new Map;
  root.traverse(o => {
    if (o.isSkinnedMesh && o.parent) {
      if (!porPadre.has(o.parent)) porPadre.set(o.parent, []);
      porPadre.get(o.parent).push(o);
    }
  });
  const grupos = [];
  for (const todas of porPadre.values()) {
    const p0 = todas[0];
    const apta = o => !Array.isArray(o.material) && o.material && !Object.keys(o.geometry.morphAttributes).length && !o.geometry.groups.length && o.geometry.drawRange.start === 0 && o.geometry.drawRange.count === Infinity && [ "position", "skinIndex", "skinWeight" ].every(n => o.geometry.attributes[n] && !o.geometry.attributes[n].isInterleavedBufferAttribute) && mismosHuesos(o.skeleton, p0.skeleton) && o.bindMode === p0.bindMode && igual16(o.bindMatrix, p0.bindMatrix) && o.position.equals(p0.position) && o.quaternion.equals(p0.quaternion) && o.scale.equals(p0.scale);
    const partes = todas.filter(apta);
    if (partes.length < 2) continue;
    const P = {
      partes: partes,
      sombra: null,
      tramos: [],
      geos: [],
      atlas: new Set
    };
    const S = unirGeos(partes, [ "position", "skinIndex", "skinWeight" ]);
    if (S) {
      P.sombra = S;
      P.geos.push(S.geo);
    }
    const claveDe = o => {
      if (!partes.includes(o)) return null;
      const m = o.material, t = m.map, g = o.geometry;
      if (m.transparent || /_t\d$/.test(m.name || "") || !t || !uvCabe(g, t)) return null;
      return [ m.type, m.side, m.alphaTest, m.color.getHexString(), m.blending, m.depthWrite, m.depthTest, t.colorSpace, t.magFilter, t.minFilter, t.anisotropy, firmaGeo(g), o.renderOrder ].join("|");
    };
    const tramos = [];
    let cur = null;
    for (const o of todas) {
      const k = claveDe(o);
      if (k && cur && cur.clave === k) {
        cur.mallas.push(o);
        continue;
      }
      cur = k ? {
        clave: k,
        mallas: [ o ]
      } : null;
      if (cur) tramos.push(cur);
    }
    const utiles = tramos.filter(t => t.mallas.length >= 2);
    if (utiles.length) {
      const clases = new Map;
      for (const tr of utiles) for (const o of tr.mallas) {
        const t = o.material.map, k = [ t.colorSpace, t.magFilter, t.minFilter, t.anisotropy ].join("|");
        if (!clases.has(k)) clases.set(k, new Map);
        const c = clases.get(k);
        if (!c.has(t)) c.set(t, {
          tex: t,
          w: t.image.width,
          h: t.image.height
        });
      }
      const lugarDe = armarAtlases(clases, R, "personaje");
      for (const tr of utiles) {
        const sub = [];
        let s = null;
        for (const o of tr.mallas) {
          const L = lugarDe.get(o.material.map);
          if (L && s && s.atlas === L.atlas) {
            s.mallas.push(o);
            continue;
          }
          s = L ? {
            atlas: L.atlas,
            mallas: [ o ]
          } : null;
          if (s) sub.push(s);
        }
        for (const sb of sub) {
          if (sb.mallas.length < 2) continue;
          const uvs = sb.mallas.map(o => {
            const l = lugarDe.get(o.material.map), a = o.geometry.attributes.uv, uv = new Float32Array(a.count * 2), r = new Float32Array(a.count * 4);
            for (let i = 0; i < a.count; i++) {
              uv[i * 2] = (l.x + a.getX(i) * l.w) / l.W;
              uv[i * 2 + 1] = (l.y + a.getY(i) * l.h) / l.H;
              r.set([ l.x, l.y, l.w, l.h ], i * 4);
            }
            return {
              uv: new THREE.BufferAttribute(uv, 2),
              rect: new THREE.BufferAttribute(r, 4)
            };
          });
          const U = unirGeos(sb.mallas, Object.keys(sb.mallas[0].geometry.attributes), uvs);
          if (!U) continue;
          P.geos.push(U.geo);
          P.atlas.add(sb.atlas);
          P.tramos.push({
            ...U,
            normalesDe: sb.mallas.map(o => o.geometry),
            idx: sb.mallas.map(o => partes.indexOf(o)),
            texs: sb.mallas.map(o => o.material.map),
            imgs: sb.mallas.map(o => o.material.map.image),
            atlas: sb.atlas
          });
        }
      }
    }
    if (!P.sombra && !P.tramos.length) continue;
    grupos.push(P);
    P.instancias = [];
    partes[0].geometry.addEventListener("dispose", () => {
      for (const g of P.geos) g.dispose();
      for (const g of P.instancias) g.dispose();
      for (const a of P.atlas) a.dispose();
      P.instancias.length = 0;
    });
  }
  _plantillas.set(root, grupos);
  if (grupos.length) {
    stats.personajesPreparados = (stats.personajesPreparados || 0) + 1;
    stats.msPersonajes = (stats.msPersonajes || 0) + performance.now() - t0;
  }
}

class UnidaPersonaje extends THREE.SkinnedMesh {
  constructor(geo, mat) {
    super(geo, mat);
    this.isUnidaPersonaje = true;
  }
  raycast() {}
  computeBoundingBox() {
    this.boundingBox = new THREE.Box3;
  }
  copy(src, rec) {
    super.copy(src, rec);
    this.layers.mask = 0;
    this.visible = false;
    if (src.__G && REND.unirPersonajes) _copias.push({
      src: src,
      copia: this
    });
    return this;
  }
}

function crearUnida(G, plantilla, tipo, T = null) {
  const p0 = G.partes[0], geo = new THREE.BufferGeometry;
  for (const [n, a] of Object.entries(plantilla.geo.attributes)) geo.setAttribute(n, a);
  const ind = new THREE.BufferAttribute(plantilla.indice.slice(), 1);
  ind.setUsage(THREE.DynamicDrawUsage);
  geo.setIndex(ind);
  if (!plantilla.geo.boundingSphere) plantilla.geo.computeBoundingSphere();
  geo.boundingSphere = plantilla.geo.boundingSphere;
  G.P.instancias.push(geo);
  const u = new UnidaPersonaje(geo, p0.material);
  u.name = tipo === "sombra" ? "sombra_unida" : "cuerpo_unido";
  u.bind(G.sk, p0.bindMatrix);
  u.bindMode = p0.bindMode;
  u.position.copy(p0.position);
  u.quaternion.copy(p0.quaternion);
  u.scale.copy(p0.scale);
  u.frustumCulled = false;
  u.boundingBox = new THREE.Box3;
  u.layers.mask = 0;
  u.renderOrder = p0.renderOrder;
  u.userData.sinColision = true;
  u.userData.unidaPersonaje = tipo;
  let mat = p0.material;
  Object.defineProperty(u, "visible", {
    get: () => true,
    set: () => {},
    configurable: true
  });
  Object.defineProperty(u, "material", {
    get: () => mat,
    set: () => {},
    configurable: true
  });
  u._ponerMat = m => {
    mat = m;
  };
  u.__G = G;
  u.layers.test = L => {
    if (!REND.unirPersonajes || u.parent !== G.padre) return false;
    const id = renderDe(L);
    if (!id) return false;
    if (tipo === "sombra") return (L.mask & 5) === 4 && estadoSombra(G, id) > 0;
    return (L.mask & 1) !== 0 && (estadoCuerpo(G, id), T.n > 0);
  };
  G.padre.add(u);
  return u;
}

function instanciarPersonajes(obj, fuente) {
  const grupos = _plantillas.get(fuente);
  if (!grupos || !grupos.length) return;
  const a = [], b = [];
  fuente.traverse(o => a.push(o));
  obj.traverse(o => b.push(o));
  if (a.length !== b.length) return;
  const de = new Map;
  for (let i = 0; i < a.length; i++) de.set(a[i], b[i]);
  instalarGanchos(_R);
  for (const P of grupos) instanciarGrupo(P, P.partes.map(o => de.get(o)));
}

function instanciarGrupo(P, partes) {
  if (partes.some((o, i) => !o || !o.isSkinnedMesh || o.isUnidaPersonaje || o.geometry !== P.partes[i].geometry || o.parent !== partes[0].parent)) return null;
  const sk = partes[0].skeleton;
  for (const o of partes) if (o.skeleton !== sk && mismosHuesos(o.skeleton, sk)) o.skeleton = sk;
  if (partes.some(o => o.skeleton !== sk)) return null;
  stats.esqueletosAhorrados = (stats.esqueletosAhorrados || 0) + partes.length - 1;
  const G = {
    P: P,
    partes: partes,
    padre: partes[0].parent,
    sk: sk,
    geos: partes.map(o => o.geometry),
    sombra: null,
    tramos: [],
    idS: 0,
    inclS: new Uint8Array(partes.length),
    prevS: new Uint8Array(partes.length).fill(1),
    nS: P.sombra ? P.sombra.indice.length : 0,
    idM: 0,
    inclM: new Uint8Array(partes.length)
  };
  if (P.sombra) G.sombra = crearUnida(G, P.sombra, "sombra");
  for (const t of P.tramos) {
    const T = {
      t: t,
      idx: t.idx,
      incl: new Uint8Array(t.idx.length),
      prev: new Uint8Array(t.idx.length).fill(1),
      n: t.indice.length,
      mats: new WeakMap,
      proxy: null
    };
    T.proxy = crearUnida(G, t, "cuerpo", T);
    T.proxy._ponerMat(matCuerpo(T, partes[t.idx[0]].material));
    G.tramos.push(T);
  }
  partes.forEach((p, k) => {
    const L = p.layers;
    L.test = C => {
      if (REND.unirPersonajes) {
        const id = renderDe(C);
        if (id) {
          const m = C.mask;
          if ((m & 5) === 4) {
            if (G.sombra && estadoSombra(G, id) >= 0 && G.inclS[k]) return false;
          } else if (m & 1) {
            if (G.tramos.length) {
              estadoCuerpo(G, id);
              if (G.inclM[k]) return false;
            }
          }
        }
      }
      return (L.mask & C.mask) !== 0;
    };
  });
  stats.personajesUnidos = (stats.personajesUnidos || 0) + 1;
  return G;
}

const _copias = [];

function procesarCopias() {
  const hechos = new Set;
  for (const {src: src, copia: copia} of _copias.splice(0)) {
    const G = src.__G, padre = copia.parent;
    if (!G || !padre || hechos.has(padre)) continue;
    hechos.add(padre);
    const partes = G.partes.map(p => {
      const i = G.padre.children.indexOf(p);
      return i >= 0 ? padre.children[i] : null;
    });
    if (instanciarGrupo(G.P, partes) && REND.recortarPersonajes) for (const u of padre.children) {
      if (!u.isUnidaPersonaje || !u.__G || u.boundingSphere instanceof EsferaHuesos) continue;
      const d = datosHuesos(u);
      if (d) {
        u.boundingSphere = new EsferaHuesos(u, d);
        u.frustumCulled = !u.userData.cuerpo;
      }
    }
  }
}

window.__rendPorque = escena => {
  const out = [];
  escena.traverse(u => {
    if (!u.isUnidaPersonaje || !u.__G) return;
    const G = u.__G, motivos = {};
    G.partes.forEach((p, k) => {
      const m = p.material, r = [];
      if (p.parent !== G.padre) r.push("padre");
      if (p.visible !== true) r.push("oculta");
      if (!m || Array.isArray(m) || !m.visible) r.push("material");
      if (p.geometry !== G.geos[k]) r.push("geometria");
      if (p.skeleton !== G.sk) r.push("esqueleto");
      if (p.onBeforeRender !== OBR) r.push("onBeforeRender");
      if (!igual16(p.matrixWorld, u.matrixWorld)) r.push("matrixWorld");
      if (!igual16(p.bindMatrix, u.bindMatrix)) r.push("bindMatrix");
      if (u.name === "sombra_unida" && !(p.layers.mask & 4)) r.push("sin capa 2");
      for (const x of r) motivos[x] = (motivos[x] || 0) + 1;
    });
    out.push({
      unida: u.name,
      partes: G.partes.length,
      dibuja: u.geometry.drawRange.count,
      motivos: motivos
    });
  });
  return out;
};

function parteLista(G, p, k, u) {
  const m = p.material;
  return p.parent === G.padre && p.visible === true && m && !Array.isArray(m) && m.visible && p.geometry === G.geos[k] && p.skeleton === G.sk && p.bindMode === u.bindMode && p.onBeforeRender === OBR && igual16(p.matrixWorld, u.matrixWorld) && igual16(p.bindMatrix, u.bindMatrix);
}

function rehacerIndice(u, plantilla, incl, prev, idx = null) {
  let cambio = false;
  for (let i = 0; i < incl.length; i++) if (incl[i] !== prev[i]) {
    cambio = true;
    break;
  }
  if (!cambio) return -1;
  prev.set(incl);
  const ind = u.geometry.index, dst = ind.array, src = plantilla.indice;
  let n = 0;
  for (let i = 0; i < incl.length; i++) if (incl[i]) {
    const [s, c] = plantilla.rangos[i];
    dst.set(src.subarray(s, s + c), n);
    n += c;
  }
  ind.needsUpdate = true;
  u.geometry.setDrawRange(0, n);
  return n;
}

function estadoSombra(G, id) {
  if (G.idS === id) return G.nS;
  G.idS = id;
  const u = G.sombra, incl = G.inclS, vivo = u.parent === G.padre;
  let mat = null;
  for (let k = 0; k < G.partes.length; k++) {
    const p = G.partes[k];
    incl[k] = vivo && (p.layers.mask & 4) !== 0 && parteLista(G, p, k, u) ? 1 : 0;
    if (incl[k] && !mat) mat = p.material;
  }
  const n = rehacerIndice(u, G.P.sombra, incl, G.prevS);
  if (n >= 0) G.nS = n;
  if (mat) u._ponerMat(mat);
  return G.nS;
}

const _claves = new Map;

const clavesDe = m => {
  let k = _claves.get(m.constructor);
  if (!k) {
    k = Object.keys(m);
    _claves.set(m.constructor, k);
  }
  return k;
};

const NO_COMPARAR = new Set([ "uuid", "name", "id", "version", "userData", "_listeners", "map" ]);

const NO_COPIAR = new Set([ ...NO_COMPARAR, "defines", "onBeforeCompile", "customProgramCacheKey", "_alphaTest" ]);

function mismoMaterial(a, r) {
  if (a === r) return true;
  if (a.constructor !== r.constructor || a.onBeforeCompile !== r.onBeforeCompile || a.customProgramCacheKey !== r.customProgramCacheKey) return false;
  for (const k of clavesDe(r)) {
    if (NO_COMPARAR.has(k)) continue;
    const x = a[k], y = r[k];
    if (x === y) continue;
    if (k === "defines") {
      if (JSON.stringify(x) !== JSON.stringify(y)) return false;
      continue;
    }
    if (x && y && typeof x.equals === "function" && x.equals(y)) continue;
    if (typeof x === "number" && typeof y === "number" && Number.isNaN(x) && Number.isNaN(y)) continue;
    return false;
  }
  return true;
}

function copiarMaterial(d, r) {
  for (const k of clavesDe(r)) {
    if (NO_COPIAR.has(k)) continue;
    const y = r[k], x = d[k];
    if (x === y) continue;
    if (x && y && typeof x.copy === "function" && typeof x.equals === "function" && x.constructor === y.constructor && !x.isTexture) {
      if (!x.equals(y)) x.copy(y);
    } else d[k] = y;
  }
  if (d.alphaTest !== r.alphaTest) d.alphaTest = r.alphaTest;
}

function matCuerpo(T, r) {
  let e = T.mats.get(r);
  if (!e || e.obc !== r.onBeforeCompile || e.cpk !== r.customProgramCacheKey) {
    const m = r.clone();
    m.map = T.t.atlas;
    m.name = "unido_" + (r.name || r.id);
    if (Object.prototype.hasOwnProperty.call(r, "onBeforeCompile")) m.onBeforeCompile = r.onBeforeCompile;
    if (Object.prototype.hasOwnProperty.call(r, "customProgramCacheKey")) m.customProgramCacheKey = r.customProgramCacheKey;
    parcheAtlas(m);
    e = {
      m: m,
      ver: r.version,
      obc: r.onBeforeCompile,
      cpk: r.customProgramCacheKey
    };
    T.mats.set(r, e);
  } else if (e.ver !== r.version) {
    e.ver = r.version;
    e.m.needsUpdate = true;
  }
  copiarMaterial(e.m, r);
  e.m.userData.ordenMat = r.userData.ordenMat ?? r.id;
  const A = T.t.atlas, t = r.map;
  if (A.magFilter !== t.magFilter || A.minFilter !== t.minFilter || A.anisotropy !== t.anisotropy) {
    A.magFilter = t.magFilter;
    A.minFilter = t.minFilter;
    A.anisotropy = t.anisotropy;
    A.needsUpdate = true;
  }
  return e.m;
}

function estadoCuerpo(G, id) {
  if (G.idM === id) return;
  G.idM = id;
  G.inclM.fill(0);
  for (const T of G.tramos) {
    const u = T.proxy, t = T.t, incl = T.incl.fill(0);
    let rep = null, cortado = u.parent !== G.padre;
    for (let j = 0; j < T.idx.length && !cortado; j++) {
      const k = T.idx[j], p = G.partes[k], m = p.material;
      const tex = t.texs[j];
      const ok = (p.layers.mask & 1) !== 0 && parteLista(G, p, k, u) && m.map === tex && tex.image === t.imgs[j] && !m.transparent && !tex.offset.x && !tex.offset.y && tex.repeat.x === 1 && tex.repeat.y === 1 && !tex.rotation && tex.matrixAutoUpdate !== false && (rep ? p.renderOrder === rep.renderOrder && mismoMaterial(m, rep.material) : true);
      if (ok) {
        incl[j] = 1;
        if (!rep) rep = p;
        continue;
      }
      const seDibuja = p.visible && m && (Array.isArray(m) || m.visible);
      if (rep && seDibuja) cortado = true;
    }
    const n = rehacerIndice(u, t, incl, T.prev);
    if (n >= 0) T.n = n;
    if (!rep) continue;
    for (let j = 0; j < T.idx.length; j++) if (incl[j]) G.inclM[T.idx[j]] = 1;
    u._ponerMat(matCuerpo(T, rep.material));
    u.renderOrder = rep.renderOrder;
  }
}
