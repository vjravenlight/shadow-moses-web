// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const MM = .001, VIDA = 1800, MAX = 128;

let TEX = null;

function textura() {
  if (!TEX) {
    TEX = (new THREE.TextureLoader).load("assets/actores/asiato.png");
    TEX.colorSpace = THREE.SRGBColorSpace;
    TEX.magFilter = TEX.minFilter = THREE.NearestFilter;
    TEX.generateMipmaps = false;
  }
  return TEX;
}

function material() {
  const m = new THREE.MeshBasicMaterial({
    map: textura(),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    blending: THREE.SubtractiveBlending
  });
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -6;
  return m;
}

const color = (m, c) => m.color.setRGB(c / 128, c / 128, c / 128, THREE.SRGBColorSpace);

export class HuellasMystery {
  constructor({grupo: grupo, zonas: zonas, piso: piso}) {
    this.grupo = grupo;
    this.piso = piso;
    this.lista = [];
    const cajas = k => (zonas?.[k] || []).map(([a, b]) => new THREE.Box3(new THREE.Vector3(Math.min(a[0], b[0]), Math.min(a[1], b[1]) - 1500, Math.min(a[2], b[2])).multiplyScalar(MM), new THREE.Vector3(Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])).multiplyScalar(MM)));
    this.asiato = cajas("asiato");
    this.pool = cajas("pool");
  }
  dentro(cs, p) {
    return cs.some(c => c.containsPoint(p));
  }
  paso(g, pie) {
    if (this.lista.length >= MAX) return;
    const p = g.o.position.clone();
    p.y += .5;
    let edad = 0;
    if (this.dentro(this.pool, p)) {
      g.huellaPool = 360;
      return;
    }
    if (g.huellaPool > 0) {
      edad = 360 - g.huellaPool;
      g.huellaPool--;
    } else if (!this.dentro(this.asiato, p)) return;
    const h = g.o.getObjectByName(pie === 1 ? "hueso_12" : "hueso_15"), q = h ? h.getWorldPosition(new THREE.Vector3) : g.o.position.clone();
    const y = this.piso?.(q);
    q.y = y != null && Math.abs(y - g.o.position.y) < .6 ? y : g.o.position.y;
    const giro = g.o.rotation.y, s = Math.sin(giro), c = Math.cos(giro);
    const esq = pie === 1 ? [ [ 70, -140 ], [ -70, -140 ], [ 70, 140 ], [ -70, 140 ] ] : [ [ -70, -140 ], [ 70, -140 ], [ -70, 140 ], [ 70, 140 ] ];
    const pos = new Float32Array(12);
    esq.forEach(([x, z], k) => {
      pos[k * 3] = q.x + (x * c + z * s) * MM;
      pos[k * 3 + 1] = q.y + .003;
      pos[k * 3 + 2] = q.z + (-x * s + z * c) * MM;
    });
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([ 0, 1, 1, 1, 0, 0, 1, 0 ]), 2));
    geo.setIndex([ 0, 2, 1, 1, 2, 3 ]);
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, material());
    m.frustumCulled = false;
    m.renderOrder = 5;
    m.userData.propio = m.userData.sinColision = true;
    m.name = "huella_sospechoso";
    color(m.material, 48);
    this.grupo?.add(m);
    this.lista.push({
      m: m,
      t: edad,
      de: g.nombre
    });
  }
  cuadro() {
    for (let i = this.lista.length - 1; i >= 0; i--) {
      const H = this.lista[i];
      if (++H.t > VIDA - 300) {
        H.m.removeFromParent();
        H.m.geometry.dispose();
        H.m.material.dispose();
        this.lista.splice(i, 1);
        continue;
      }
      const r = VIDA - H.t;
      if (r < 690) color(H.m.material, 48 - Math.trunc((690 - r) * 48 / 690));
    }
  }
  limpiar() {
    for (const H of this.lista) {
      H.m.removeFromParent();
      H.m.geometry.dispose();
      H.m.material.dispose();
    }
    this.lista.length = 0;
  }
}
