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

const randU = n => Math.floor(Math.random() * 32767) % n;

const randS = n => Math.floor(Math.random() * 32767) % (2 * n) - n;

const s16 = v => (v + 32768 & 65535) - 32768;

const ratan2 = (y, x) => Math.round(Math.atan2(y, x) * 4096 / (Math.PI * 2));

const R4096 = Math.PI * 2 / 4096;

const _m = new THREE.Matrix4, _e = new THREE.Euler(0, 0, 0, "YXZ"), _v = new THREE.Vector3;

export class Plasma {
  constructor(mundo, a, b, {modo: modo = 0, azul: azul = 0, f3B4: f3B4 = 0, f3B8: f3B8 = 0, cuadros: cuadros = 1} = {}) {
    this.f3AC = modo;
    this.f3BC = azul;
    this.f3B4 = f3B4;
    this.f3B8 = f3B8;
    this.f3A8 = cuadros;
    this.f3A4 = 0;
    this.f3B0 = 0;
    this.f31C = new Array(17).fill(0);
    this.f33E = new Array(17).fill(0);
    this.f360 = new Array(17).fill(0);
    this.f4C = Array.from({
      length: 17
    }, () => [ 0, 0, 0 ]);
    this.geo = new THREE.BufferGeometry;
    this.pos = new Float32Array(16 * 6 * 3);
    const uv = [];
    for (let i = 0; i < 16; i++) uv.push(0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0);
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const c = azul ? [ 150, 150, 250 ] : [ 80, 80, 80 ];
    this.mat = new THREE.MeshBasicMaterial({
      map: textura(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.mat.color.setRGB(c[0] / 128, c[1] / 128, c[2] / 128);
    this.m = new THREE.Mesh(this.geo, this.mat);
    this.m.frustumCulled = false;
    this.m.visible = false;
    this.m.userData.sinColision = true;
    this.m.userData.propio = true;
    mundo.add(this.m);
    this.iniciar(a, b);
  }
  ordenar() {
    const f = this.f33E;
    if (f[8] < f[4]) f[4] = f[8];
    if (f[12] < f[4]) f[4] = f[12];
    if (f[12] < f[8]) f[8] = f[12];
  }
  iniciar(a, b) {
    for (let i = 0; i < 5; i++) {
      this.f31C[i * 4] = this.f3BC === 1 ? s16(this.f3B8 + randS(32)) : randU(4096);
      this.f33E[i * 4] = randU(4096);
      this.f360[i * 4] = randU(4096);
    }
    this.ordenar();
    this.f2F4 = a.slice();
    this.f2FC = b.slice();
    this.f33E[0] = 0;
    this.f33E[16] = 4096;
    this.f360[0] = 0;
    this.f360[16] = 0;
  }
  sortear() {
    const m = this.f3AC, F = this.f31C, G = this.f33E, H = this.f360;
    if (m > 3 && m < 6) {
      if (m === 4) for (let k = 0; k < 3; k++) this.f2F4[k] += randS(128);
      const rx = this.f3BC === 1 ? 0 : randU(4096), ry = this.f3BC === 1 ? this.f3B8 : randU(4096);
      _e.set(rx * R4096, ry * R4096, 0, "YXZ");
      _v.set(0, this.f3B4, 0).applyEuler(_e);
      this.f2FC[0] += Math.trunc(_v.x);
      this.f2FC[1] += Math.trunc(_v.y);
      this.f2FC[2] += Math.trunc(_v.z);
    } else if (randS(32) === 0 && m !== 255) {
      for (let k = 0; k < 3; k++) {
        this.f2F4[k] += randS(128);
        this.f2FC[k] += randS(1024);
      }
    }
    if (this.f3BC === 1) {
      for (const i of [ 4, 8, 12 ]) {
        F[i] = s16(F[i] + randS(64));
        G[i] = s16(G[i] + randS(32));
        H[i] += randS(32);
      }
    } else {
      F[4] = s16(F[0] + randU(512));
      G[4] = randU(4096);
      H[4] = randU(4096) >> 2;
      F[8] = s16(F[4] + randU(512));
      G[8] = randU(4096);
      H[8] = randU(4096);
      F[12] = s16(F[8] + randU(512));
      G[12] = randU(4096);
      H[12] = randU(4096) >> 1;
    }
    this.ordenar();
  }
  mover() {
    const F = this.f31C, G = this.f33E, H = this.f360;
    for (const i of [ 4, 8, 12 ]) {
      F[i] = F[i] + randU(32) & 4095;
      G[i] = G[i] + randS(64) & 4095;
      H[i] = H[i] + randS(128) & 2047;
    }
    this.ordenar();
  }
  medio(i, d) {
    const a = i - d, b = i + d, F = this.f31C, G = this.f33E, H = this.f360;
    G[i] = s16(G[a] + ((G[b] - G[a]) * 3 >> 2));
    H[i] = H[a] + (H[b] - H[a] >> 1);
    F[i] = s16(F[a] + (F[b] - F[a] >> 1));
  }
  cuadro(a, b) {
    if (this.f3A4 > this.f3A8) {
      this.quitar();
      return false;
    }
    if (this.f3AC !== 5 && a && b) {
      this.f2F4 = a.slice();
      this.f2FC = b.slice();
    }
    this.f3A4++;
    if (randU(512) === 0) this.f3B0 = randS(32);
    if (this.f3AC === 1) this.mover(); else if (this.f3AC === 2) {
      if (this.f3A4 % 70 < this.f3B0 + 35) this.sortear(); else this.mover();
    } else this.sortear();
    const A = this.f2F4, B = this.f2FC, dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
    const h = Math.trunc(Math.sqrt(dx * dx + dz * dz));
    let len = Math.trunc(Math.hypot(dx, dy, dz));
    const rx = ratan2(h, dy), ry = ratan2(dx, dz);
    this.medio(2, 2);
    this.medio(6, 2);
    this.medio(10, 2);
    this.medio(14, 2);
    for (let i = 0; i < 8; i++) this.medio(i * 2 + 1, 1);
    _e.set(rx * R4096, ry * R4096, 0, "YXZ");
    _m.makeRotationFromEuler(_e);
    for (let i = 0; i < 17; i++) {
      const y = len * this.f33E[i] >> 12, z = len * this.f360[i] >> 12, t = this.f31C[i] * R4096;
      _v.set(Math.sin(t) * z, y, Math.cos(t) * z).applyMatrix4(_m);
      const P = this.f4C[i];
      P[0] = A[0] + Math.trunc(_v.x);
      P[1] = A[1] + Math.trunc(_v.y);
      P[2] = A[2] + Math.trunc(_v.z);
    }
    len >>= 7;
    const o = [ len + randS(16), len + randS(16), len ], p = this.pos, M = .001;
    for (let i = 0; i < 16; i++) {
      const v0 = this.f4C[i], v1 = this.f4C[i + 1];
      const v2 = [ v0[0] + o[0], v0[1] + o[1], v0[2] + o[2] ], v3 = [ v1[0] + o[0], v1[1] + o[1], v1[2] + o[2] ];
      const q = [ v0, v1, v2, v1, v3, v2 ];
      for (let k = 0; k < 6; k++) {
        const w = (i * 6 + k) * 3;
        p[w] = q[k][0] * M;
        p[w + 1] = q[k][1] * M;
        p[w + 2] = q[k][2] * M;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.m.visible = true;
    return true;
  }
  quitar() {
    if (!this.m.parent) return;
    this.m.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}

const randUL = n => Math.floor(Math.random() * 32768) & n - 1;

const randSL = n => (Math.floor(Math.random() * 32768) & 2 * n - 1) - n;

const tdiv = (a, b) => Math.trunc(a / b);

export class PlasmaL {
  constructor(mundo, a, b, cuadros = 2) {
    this.f3C0 = cuadros;
    this.f3BC = 0;
    this.f2F0 = new Array(17).fill(0);
    this.f334 = new Array(17).fill(0);
    this.f378 = new Array(17).fill(0);
    this.P = Array.from({
      length: 17
    }, () => [ 0, 0, 0 ]);
    this.geo = new THREE.BufferGeometry;
    this.pos = new Float32Array(16 * 6 * 3);
    const uv = [];
    for (let i = 0; i < 16; i++) uv.push(0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0);
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    this.mat = new THREE.MeshBasicMaterial({
      map: textura(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.mat.color.setRGB(255 / 128, 255 / 128, 255 / 128);
    this.m = new THREE.Mesh(this.geo, this.mat);
    this.m.frustumCulled = false;
    this.m.visible = false;
    this.m.userData.sinColision = true;
    this.m.userData.propio = true;
    mundo.add(this.m);
    this.iniciar(a, b);
  }
  iniciar(a, b) {
    this.a = a.slice();
    this.b = b.slice();
    const dx = tdiv(a[0] - b[0], 16), dy = tdiv(a[1] - b[1], 16), dz = tdiv(a[2] - b[2], 16);
    const d = Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz)) << 4;
    const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
    this.giro = [ ratan2(d, ey) & 4095, ratan2(ex, ez) & 4095 ];
    this.f2C = d;
    const q = tdiv(d, 4), F = this.f2F0, G = this.f334, H = this.f378;
    F[0] = randUL(4096);
    F[4] = randUL(512);
    G[4] = randUL(1024);
    H[4] = tdiv(q * randUL(4096), 4096);
    F[8] = F[4] + randSL(512);
    G[8] = randUL(1024) + 1024;
    H[8] = tdiv(q * (randUL(4096) * 2), 4096);
    F[12] = F[8] + randSL(512);
    G[12] = randUL(1024) + 2048;
    H[12] = tdiv(q * randUL(4096), 4096);
    F[16] = F[12] + randSL(512);
    if (G[8] < G[4]) G[4] = G[8];
    if (G[12] < G[4]) G[4] = G[12];
    if (G[12] < G[8]) G[8] = G[12];
    G[0] = 0;
    G[16] = 4096;
    H[0] = 0;
    H[16] = 0;
  }
  mover() {
    const q = tdiv(this.f2C, 4), F = this.f2F0, G = this.f334, H = this.f378;
    F[0] += randSL(128);
    F[4] += randSL(64);
    G[4] += randSL(32);
    H[4] += randSL(32);
    if (H[4] < 0) H[4] = 0;
    if (q < H[4]) H[4] = q;
    F[8] += randSL(64);
    if (F[4] + 512 < F[8]) F[8] = F[4] + randSL(512);
    if (F[8] < F[4] - 512) F[8] = F[4] + randSL(512);
    G[8] += randSL(32);
    {
      const r = randSL(64);
      H[8] = H[8] + 16 + r;
    }
    if (H[8] < 0) H[8] = 0;
    if (q < H[8]) H[8] = q;
    F[12] += randSL(64);
    if (F[8] + 512 < F[12]) F[12] = F[8] + randSL(512);
    if (F[12] < F[8] - 512) F[12] = F[8] + randSL(512);
    G[12] += randSL(32);
    H[12] += randSL(32);
    if (H[12] < 0) H[12] = 0;
    if (q * 2 < H[12]) H[12] = q * 2;
    if (G[8] < G[4]) {
      const t = G[4];
      G[4] = G[8];
      G[8] = t;
    }
    if (G[12] < G[4]) {
      const t = G[4];
      G[4] = G[12];
      G[12] = t;
    }
    if (G[12] < G[8]) {
      const t = G[8];
      G[8] = G[12];
      G[12] = t;
    }
  }
  medio(i, d) {
    const a = i - d, b = i + d, F = this.f2F0, G = this.f334, H = this.f378;
    G[i] = G[a] + tdiv((G[b] - G[a]) * 3, 4);
    H[i] = H[a] + tdiv(H[b] - H[a], 2);
    F[i] = F[a] + tdiv(F[b] - F[a], 2);
  }
  cuadro() {
    if (this.f3C0 < this.f3BC) {
      this.quitar();
      return false;
    }
    this.mover();
    this.medio(2, 2);
    this.medio(6, 2);
    this.medio(10, 2);
    this.medio(14, 2);
    for (let i = 0; i < 8; i++) this.medio(1 + i * 2, 1);
    _e.set(this.giro[0] * R4096, this.giro[1] * R4096, 0, "YXZ");
    _m.makeRotationFromEuler(_e);
    const A = this.a;
    for (let i = 0; i < 17; i++) {
      const y = Math.trunc(this.f334[i] * this.f2C / 4096), z = this.f378[i], t = this.f2F0[i] * R4096;
      const lx = Math.trunc(Math.sin(t) * z), lz = Math.trunc(Math.cos(t) * z);
      _v.set(lx, y, lz).applyMatrix4(_m);
      const P = this.P[i];
      P[0] = A[0] + Math.trunc(_v.x);
      P[1] = A[1] + Math.trunc(_v.y);
      P[2] = A[2] + Math.trunc(_v.z);
    }
    const o = [ 16 + randSL(16), 16 + randSL(16), 16 ], p = this.pos, M = .001;
    for (let i = 0; i < 16; i++) {
      const v0 = this.P[i], v1 = this.P[i + 1];
      const v2 = [ v0[0] + o[0], v0[1] + o[1], v0[2] + o[2] ], v3 = [ v1[0] + o[0], v1[1] + o[1], v1[2] + o[2] ];
      const qd = [ v0, v1, v2, v1, v3, v2 ];
      for (let k = 0; k < 6; k++) {
        const w = (i * 6 + k) * 3;
        p[w] = qd[k][0] * M;
        p[w + 1] = qd[k][1] * M;
        p[w + 2] = qd[k][2] * M;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.m.visible = true;
    this.f3BC++;
    return true;
  }
  quitar() {
    if (!this.m.parent) return;
    this.m.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
