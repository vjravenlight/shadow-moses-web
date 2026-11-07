// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const CLAVE = "sm_poligonos";

const COS_FIJO = Math.cos(THREE.MathUtils.degToRad(50)), COS_PERSONAJE = Math.cos(THREE.MathUtils.degToRad(70));

let suaves = (() => {
  try {
    return localStorage.getItem(CLAVE) !== "0";
  } catch {
    return true;
  }
})();

const registradas = new Set;

let ms = 0;

const _p = new THREE.Vector3, _n = new THREE.Vector3, _nm = new THREE.Matrix3;

function calcular(root) {
  const t0 = performance.now(), celdas = new Map, mallas = [];
  root.updateWorldMatrix(true, true);
  root.traverse(o => {
    const g = o.geometry, P = g?.attributes?.position, N = g?.attributes?.normal;
    if (!o.isMesh || !P || !N || g.userData.normalesCara) return;
    if (mallas.some(m => m.g === g)) return;
    const cant = N.count, n = new Float32Array(cant * 3);
    _nm.getNormalMatrix(o.isSkinnedMesh ? new THREE.Matrix4 : o.matrixWorld);
    for (let i = 0; i < cant; i++) {
      if (o.isSkinnedMesh) o.getVertexPosition(i, _p); else _p.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld);
      _n.fromBufferAttribute(N, i).applyMatrix3(_nm);
      if (_n.lengthSq() > 1e-8) _n.normalize();
      n[i * 3] = _n.x;
      n[i * 3 + 1] = _n.y;
      n[i * 3 + 2] = _n.z;
      const k = `${Math.round(_p.x * 500)},${Math.round(_p.y * 500)},${Math.round(_p.z * 500)}`;
      let c = celdas.get(k);
      if (!c) celdas.set(k, c = []);
      c.push(n, i);
    }
    mallas.push({
      g: g,
      N: N,
      n: n,
      nm: _nm.clone(),
      personaje: !!o.isSkinnedMesh
    });
  });
  for (const m of mallas) m.s = new Float32Array(m.n);
  const porN = new Map(mallas.map(m => [ m.n, m ]));
  for (const c of celdas.values()) {
    if (c.length < 4) continue;
    for (let a = 0; a < c.length; a += 2) {
      const na = c[a], ia = c[a + 1] * 3, M = porN.get(na), cos = M.personaje ? COS_PERSONAJE : COS_FIJO;
      let x = 0, y = 0, z = 0;
      for (let b = 0; b < c.length; b += 2) {
        const nb = c[b], ib = c[b + 1] * 3;
        if (na[ia] * nb[ib] + na[ia + 1] * nb[ib + 1] + na[ia + 2] * nb[ib + 2] < cos) continue;
        x += nb[ib];
        y += nb[ib + 1];
        z += nb[ib + 2];
      }
      const L = Math.hypot(x, y, z);
      if (L > 1e-5) {
        M.s[ia] = x / L;
        M.s[ia + 1] = y / L;
        M.s[ia + 2] = z / L;
      }
    }
  }
  for (const m of mallas) {
    const inv = m.nm.clone().invert(), cant = m.N.count, cara = new Float32Array(cant * 3), suave = new Float32Array(cant * 3);
    for (let i = 0; i < cant; i++) {
      cara[i * 3] = m.N.getX(i);
      cara[i * 3 + 1] = m.N.getY(i);
      cara[i * 3 + 2] = m.N.getZ(i);
      _n.set(m.s[i * 3], m.s[i * 3 + 1], m.s[i * 3 + 2]).applyMatrix3(inv);
      if (_n.lengthSq() > 1e-8) _n.normalize();
      suave[i * 3] = _n.x;
      suave[i * 3 + 1] = _n.y;
      suave[i * 3 + 2] = _n.z;
    }
    m.g.userData.normalesCara = cara;
    m.g.userData.normalesSuaves = suave;
    m.g.userData.normalesAttr = m.N;
  }
  ms += performance.now() - t0;
}

function escribir(root) {
  root.traverse(o => {
    const g = o.geometry, d = g?.userData, N = d?.normalesAttr, v = suaves ? d?.normalesSuaves : d?.normalesCara;
    if (!o.isMesh || !N || !v || d.normalesEstado === suaves) return;
    d.normalesEstado = suaves;
    for (let i = 0; i < N.count; i++) N.setXYZ(i, v[i * 3], v[i * 3 + 1], v[i * 3 + 2]);
    N.needsUpdate = true;
  });
}

export const normalesSuaves = {
  alEscribir: null,
  get suaves() {
    return suaves;
  },
  get ms() {
    return Math.round(ms);
  },
  registrar(root) {
    try {
      registradas.add(root);
      if (suaves) {
        calcular(root);
        escribir(root);
      }
    } catch (e) {
      console.warn("normales suaves:", e.message);
    }
  },
  poner(si) {
    si = !!si;
    if (si === suaves) return;
    suaves = si;
    try {
      localStorage.setItem(CLAVE, si ? "1" : "0");
    } catch {}
    for (const r of registradas) {
      try {
        if (si) calcular(r);
        escribir(r);
        this.alEscribir?.(r);
      } catch {}
    }
  },
  alternar() {
    this.poner(!suaves);
  }
};
