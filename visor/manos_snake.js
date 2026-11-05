// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const HUESOS = {
  right: {
    recorta: [ 4 ],
    origen: "hueso_4"
  },
  left: {
    recorta: [ 9 ],
    origen: "hueso_9"
  }
};

const BASE = (new THREE.Matrix4).makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));

function recortar(malla, huesos, origen) {
  const g0 = malla.geometry, pos = g0.attributes.position, uv = g0.attributes.uv, col = g0.attributes.color, sk = g0.attributes.skinIndex, idx = g0.index;
  if (!pos || !sk) return null;
  const sirve = new Set(huesos), n = idx ? idx.count : pos.count, p = [], t = [], c = [];
  const de = i => idx ? idx.getX(i) : i;
  for (let i = 0; i + 2 < n; i += 3) {
    const a = de(i), b = de(i + 1), d = de(i + 2);
    if (!sirve.has(sk.getX(a)) || !sirve.has(sk.getX(b)) || !sirve.has(sk.getX(d))) continue;
    for (const v of [ a, b, d ]) {
      p.push(pos.getX(v) - origen.x, pos.getY(v) - origen.y, pos.getZ(v) - origen.z);
      if (uv) t.push(uv.getX(v), uv.getY(v));
      if (col) c.push(col.getX(v), col.getY(v), col.getZ(v));
    }
  }
  if (!p.length) return null;
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  if (t.length) g.setAttribute("uv", new THREE.Float32BufferAttribute(t, 2));
  if (c.length) g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

export class ManosSnake {
  constructor(cargar) {
    this.cargar = cargar;
    this.mallas = null;
    this._pedido = null;
  }
  preparar() {
    if (this.mallas) return Promise.resolve(this.mallas);
    this._pedido ||= this.cargar().then(o => {
      o.updateMatrixWorld(true);
      const mallas = [];
      o.traverse(m => {
        if (m.isSkinnedMesh) mallas.push(m);
      });
      if (!mallas.length) return null;
      const out = {};
      for (const lado of [ "right", "left" ]) {
        const h = HUESOS[lado], hueso = o.getObjectByName(h.origen);
        if (!hueso) return null;
        const origen = hueso.getWorldPosition(new THREE.Vector3), grupo = new THREE.Group;
        for (const malla of mallas) {
          const g = recortar(malla, h.recorta, origen);
          if (!g) continue;
          const orig = Array.isArray(malla.material) ? malla.material[0] : malla.material;
          const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
            map: orig.map || null,
            color: 11579568,
            side: THREE.DoubleSide,
            transparent: false,
            alphaTest: 0
          }));
          m.frustumCulled = false;
          m.userData.sinColision = true;
          m.userData.propio = true;
          m.raycast = () => {};
          grupo.add(m);
        }
        if (!grupo.children.length) return null;
        grupo.setRotationFromMatrix(BASE);
        grupo.name = "mano_snake_" + lado;
        grupo.visible = false;
        grupo.userData.sinColision = true;
        grupo.userData.propio = true;
        out[lado] = grupo;
      }
      this.mallas = out;
      return out;
    }).catch(e => {
      console.warn("manos de Snake:", e);
      return null;
    });
    return this._pedido;
  }
}
