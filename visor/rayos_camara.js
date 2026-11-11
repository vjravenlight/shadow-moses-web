// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const CELDA = 1;

const _datos = new WeakMap;

const _esf = new THREE.Sphere, _ray = new THREE.Ray, _rc = new THREE.Raycaster;

let _sello = 1;

function armar(o) {
  const g = o.geometry, P = g.attributes.position, I = g.index, M = o.matrixWorld;
  const n = I ? I.count : P.count, tris = new Float32Array((n / 3 | 0) * 9), v = new THREE.Vector3, celdas = new Map;
  let k = 0;
  for (let i = 0; i + 2 < n; i += 3) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let j = 0; j < 3; j++) {
      v.fromBufferAttribute(P, I ? I.getX(i + j) : i + j).applyMatrix4(M);
      tris[k * 9 + j * 3] = v.x;
      tris[k * 9 + j * 3 + 1] = v.y;
      tris[k * 9 + j * 3 + 2] = v.z;
      if (v.x < x0) x0 = v.x;
      if (v.y < y0) y0 = v.y;
      if (v.z < z0) z0 = v.z;
      if (v.x > x1) x1 = v.x;
      if (v.y > y1) y1 = v.y;
      if (v.z > z1) z1 = v.z;
    }
    const ax = Math.floor(x0 / CELDA), ay = Math.floor(y0 / CELDA), az = Math.floor(z0 / CELDA), bx = Math.floor(x1 / CELDA), by = Math.floor(y1 / CELDA), bz = Math.floor(z1 / CELDA);
    if ((bx - ax + 1) * (by - ay + 1) * (bz - az + 1) > 4096) {
      k++;
      continue;
    }
    for (let x = ax; x <= bx; x++) for (let y = ay; y <= by; y++) for (let z = az; z <= bz; z++) {
      const c = x + "," + y + "," + z;
      let l = celdas.get(c);
      if (!l) celdas.set(c, l = []);
      l.push(k);
    }
    k++;
  }
  return {
    tris: tris,
    celdas: celdas,
    sellos: new Int32Array(k)
  };
}

function triangulo(T, i, ox, oy, oz, dx, dy, dz) {
  const b = i * 9, ax = T[b], ay = T[b + 1], az = T[b + 2];
  const e1x = T[b + 3] - ax, e1y = T[b + 4] - ay, e1z = T[b + 5] - az, e2x = T[b + 6] - ax, e2y = T[b + 7] - ay, e2z = T[b + 8] - az;
  const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return -1;
  const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az, u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return -1;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, w = (dx * qx + dy * qy + dz * qz) * inv;
  if (w < 0 || u + w > 1) return -1;
  const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return t >= 0 ? t : -1;
}

function enGrilla(G, o, d, far) {
  const s = ++_sello;
  let mejor = -1;
  let x = Math.floor(o.x / CELDA), y = Math.floor(o.y / CELDA), z = Math.floor(o.z / CELDA);
  const sx = d.x > 0 ? 1 : d.x < 0 ? -1 : 0, sy = d.y > 0 ? 1 : d.y < 0 ? -1 : 0, sz = d.z > 0 ? 1 : d.z < 0 ? -1 : 0;
  const lim = (p, c, dd, st) => st === 0 ? Infinity : ((st > 0 ? (c + 1) * CELDA : c * CELDA) - p) / dd;
  let tx = lim(o.x, x, d.x, sx), ty = lim(o.y, y, d.y, sy), tz = lim(o.z, z, d.z, sz);
  const ddx = sx ? CELDA / Math.abs(d.x) : Infinity, ddy = sy ? CELDA / Math.abs(d.y) : Infinity, ddz = sz ? CELDA / Math.abs(d.z) : Infinity;
  let t0 = 0;
  for (let paso = 0; paso < 512; paso++) {
    const l = G.celdas.get(x + "," + y + "," + z);
    if (l) for (const i of l) {
      if (G.sellos[i] === s) continue;
      G.sellos[i] = s;
      const t = triangulo(G.tris, i, o.x, o.y, o.z, d.x, d.y, d.z);
      if (t >= 0 && t <= far && (mejor < 0 || t < mejor)) mejor = t;
    }
    const t1 = Math.min(tx, ty, tz);
    if (mejor >= 0 && mejor <= t1) return mejor;
    if (t1 > far) break;
    t0 = t1;
    if (tx <= ty && tx <= tz) {
      x += sx;
      tx += ddx;
    } else if (ty <= tz) {
      y += sy;
      ty += ddy;
    } else {
      z += sz;
      tz += ddz;
    }
  }
  return mejor;
}

function mismaMatriz(a, b) {
  const x = a.elements, y = b;
  for (let i = 0; i < 16; i++) if (x[i] !== y[i]) return false;
  return true;
}

export function primerGolpeCamara(o, d, far, lista, ignorar) {
  let mejor = null;
  _ray.origin.copy(o);
  _ray.direction.copy(d);
  for (const m of lista) {
    if (!m.isMesh || !m.geometry?.attributes?.position || m.isSkinnedMesh || m.isInstancedMesh || ignorar && ignorar(m)) continue;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _esf.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
    if (_ray.distanceSqToPoint(_esf.center) > _esf.radius * _esf.radius) continue;
    if (_esf.center.distanceTo(o) - _esf.radius > far) continue;
    let D = _datos.get(m);
    const ver = g.attributes.position.version;
    if (D && D.g && (D.v !== ver || D.ig !== g.index || !mismaMatriz(m.matrixWorld, D.m))) {
      D.cambios++;
      D.g = null;
    }
    if (!D) {
      D = {
        m: null,
        v: ver,
        ig: g.index,
        g: null,
        cambios: 0
      };
      _datos.set(m, D);
    }
    let t = -1;
    if (D.cambios < 2 && !D.g && (g.index ? g.index.count : g.attributes.position.count) >= 60) {
      D.g = armar(m);
      D.m = m.matrixWorld.elements.slice();
      D.v = ver;
      D.ig = g.index;
    }
    if (D.g) t = enGrilla(D.g, o, d, far); else {
      const mats = Array.isArray(m.material) ? m.material : [ m.material ], lados = mats.map(x => x?.side);
      for (const x of mats) if (x) x.side = THREE.DoubleSide;
      try {
        _rc.set(o, d);
        _rc.near = 0;
        _rc.far = far;
        const h = _rc.intersectObject(m, false)[0];
        t = h ? h.distance : -1;
      } finally {
        mats.forEach((x, i) => {
          if (x) x.side = lados[i];
        });
      }
    }
    if (t >= 0 && (!mejor || t < mejor.distance)) mejor = {
      distance: t,
      object: m
    };
  }
  return mejor;
}
