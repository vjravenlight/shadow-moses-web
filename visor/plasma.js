// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

let tex = null;

const textura = () => {
  if (!tex) {
    tex = (new THREE.TextureLoader).load("assets/personajes/plasma.png");
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  return tex;
};

const N = 7;

export class ArcoPlasma {
  constructor(mundo, {color: color = 9869050, tam: tam = .09, ruido: ruido = .05} = {}) {
    this.tam = tam;
    this.ruido = ruido;
    this.g = new THREE.Group;
    this.g.userData.sinColision = true;
    this.g.userData.propio = true;
    this.mat = new THREE.SpriteMaterial({
      map: textura(),
      color: color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    this.sp = [];
    for (let i = 0; i < N; i++) {
      const s = new THREE.Sprite(this.mat);
      s.userData.sinColision = true;
      this.g.add(s);
      this.sp.push(s);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    this.linea = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: color,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    }));
    this.linea.frustumCulled = false;
    this.linea.userData.sinColision = true;
    this.g.add(this.linea);
    mundo.add(this.g);
  }
  actualizar(a, b) {
    const pos = this.linea.geometry.attributes.position, r = this.ruido;
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = a.z + (b.z - a.z) * k;
      const e = i > 0 && i < N - 1 ? r : 0, px = x + (Math.random() - .5) * e * 2, py = y + (Math.random() - .5) * e * 2, pz = z + (Math.random() - .5) * e * 2;
      this.sp[i].position.set(px, py, pz);
      this.sp[i].scale.setScalar(this.tam * (.6 + Math.random() * .8));
      pos.setXYZ(i, px, py, pz);
    }
    pos.needsUpdate = true;
  }
  quitar() {
    this.g.removeFromParent();
    this.linea.geometry.dispose();
    this.linea.material.dispose();
    this.mat.dispose();
  }
}
