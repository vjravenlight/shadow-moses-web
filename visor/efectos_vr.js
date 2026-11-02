// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const MM = .001, ANG = Math.PI * 2 / 4096;

let semilla = 4660;

export const rand = () => {
  semilla = Math.imul(semilla, 1103515245) + 12345 >>> 0;
  return semilla >>> 16 & 32767;
};

const randU = n => rand() % n;

const randS = n => (rand() & 2 * n - 1) - n;

const dir = (rx, ry, out = new THREE.Vector3) => out.set(Math.sin(ry * ANG) * Math.cos(rx * ANG), -Math.sin(rx * ANG), Math.cos(ry * ANG) * Math.cos(rx * ANG));

const VERT = `\nattribute vec3 col;\nvarying vec2 vUv; varying vec3 vCol;\nvoid main() { vUv = uv; vCol = col; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = `\nuniform sampler2D map; uniform float uK;\nvarying vec2 vUv; varying vec3 vCol;\nvoid main() {\n  vec4 t = texture2D(map, vUv);\n  vec3 c8 = floor(t.rgb * 255.0 + 0.5);\n  if (c8.r + c8.g + c8.b < 0.5) discard;                  // índice 0x0000 = transparente\n  vec3 t5 = floor(c8 / 8.0);\n  vec3 f = min(floor(t5 * vCol / 128.0), 31.0) / 31.0;   // (texel5 * color) >> 7\n  gl_FragColor = vec4(f * uK, 1.0);\n}`;

export function materialPS1(tex, {abr: abr = 1} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: {
        value: tex
      },
      uK: {
        value: abr === 3 ? .25 : 1
      }
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false
  });
}

const _cache = new Map;

export function texturaPS1(url) {
  if (!_cache.has(url)) _cache.set(url, new Promise(ok => (new THREE.TextureLoader).load(url, t => {
    t.colorSpace = THREE.NoColorSpace;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    ok(t);
  }, undefined, () => ok(null))));
  return _cache.get(url);
}

function quads(n) {
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 12), 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 8), 2));
  g.setAttribute("col", new THREE.BufferAttribute(new Float32Array(n * 12), 3).setUsage(THREE.DynamicDrawUsage));
  const idx = [];
  for (let i = 0; i < n; i++) {
    const b = i * 4;
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }
  g.setIndex(idx);
  return g;
}

function ponerUV(g, i, uv) {
  const a = g.attributes.uv.array;
  for (let k = 0; k < 8; k++) a[i * 8 + k] = uv[k];
  g.attributes.uv.needsUpdate = true;
}

function ponerQuad(g, i, p) {
  const a = g.attributes.position.array;
  for (let k = 0; k < 4; k++) {
    a[i * 12 + k * 3] = p[k].x;
    a[i * 12 + k * 3 + 1] = p[k].y;
    a[i * 12 + k * 3 + 2] = p[k].z;
  }
}

function ponerCol(g, i, r, gr, b) {
  const a = g.attributes.col.array;
  for (let k = 0; k < 4; k++) {
    a[i * 12 + k * 3] = r;
    a[i * 12 + k * 3 + 1] = gr;
    a[i * 12 + k * 3 + 2] = b;
  }
}

const listo = g => {
  g.attributes.position.needsUpdate = true;
  g.attributes.col.needsUpdate = true;
  g.computeBoundingSphere();
};

const _r = new THREE.Vector3, _u = new THREE.Vector3;

function billboard(c, h, cam, out) {
  _r.setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(h);
  _u.setFromMatrixColumn(cam.matrixWorld, 1).multiplyScalar(h);
  out[0].copy(c).sub(_r).add(_u);
  out[1].copy(c).add(_r).add(_u);
  out[2].copy(c).sub(_r).sub(_u);
  out[3].copy(c).add(_r).sub(_u);
  return out;
}

const Q = () => [ new THREE.Vector3, new THREE.Vector3, new THREE.Vector3, new THREE.Vector3 ];

const COL_SPARK = [ 0, 1 ].map(b => [ 0, 1, 2, 3, 4, 5 ].map(i => b === 0 ? [ (5 - i) * 64 / 5 | 0, ((5 - i) * 64 + 32 * i) / 5 | 0, 32 ] : [ (5 - i) * 48 / 5 | 0, ((5 - i) * 48 + 32 * i) / 5 | 0, 32 * i / 5 | 0 ]));

const lerp4 = (o, a, b, t) => o.set(Math.trunc((b.x * t + a.x * (4 - t)) / 4), Math.trunc((b.y * t + a.y * (4 - t)) / 4), Math.trunc((b.z * t + a.z * (4 - t)) / 4));

export class Chispas {
  constructor({datos: datos, textura: textura, camara: camara}) {
    this.piezas = (datos?.piezas || []).filter(p => p.v.length).map(p => ({
      v: p.v.map(q => new THREE.Vector3(q[0], q[1], q[2])),
      ady: p.ady
    }));
    this.cam = camara;
    this.cad = Array.from({
      length: 8
    }, () => ({
      estado: 0
    }));
    this.geo = quads(48);
    for (let i = 0; i < 48; i++) ponerUV(this.geo, i, [ 1, 0, 0, 0, 1, 1, 0, 1 ]);
    this.mat = materialPS1(textura);
    this.mat.polygonOffset = true;
    this.mat.polygonOffsetFactor = -2;
    this.mat.polygonOffsetUnits = -8;
    this.obj = new THREE.Mesh(this.geo, this.mat);
    this.obj.frustumCulled = false;
    this.obj.renderOrder = 5;
    this.obj.userData.sinColision = true;
    this.obj.raycast = () => {};
    this.obj.scale.setScalar(MM);
    this.reloj = 0;
  }
  ojo() {
    const p = new THREE.Vector3;
    this.cam.getWorldPosition(p);
    return p.multiplyScalar(1e3);
  }
  nuevoTramo(c) {
    c.head = (c.head + 1) % 6;
    c.hstep = 1;
    const a = c.oi.ady[c.cur];
    if (!a.length) {
      c.estado = 3;
      return;
    }
    const k = rand() % a.length, n = a[k];
    if (n === c.prev) {
      c.prev = c.cur;
      c.cur = k !== 0 ? a[k - 1] : a[1] ?? a[0];
    } else {
      c.prev = c.cur;
      c.cur = n;
    }
    const viejo = c.target, nuevo = c.oi.v[c.cur];
    const d = viejo.clone().sub(nuevo), e = viejo.clone().sub(this.ojo());
    const x = d.clone().cross(e);
    if (x.lengthSq() < 1e-6) x.set(0, 1, 0);
    x.normalize().multiplyScalar(40);
    c.off[c.head] = new THREE.Vector3(Math.trunc(x.x), Math.trunc(x.y), Math.trunc(x.z));
    const q = c.q[c.head], o = c.off[c.head];
    q[0].copy(viejo).add(o);
    q[1].copy(viejo).sub(o);
    q[2].copy(viejo).add(o);
    q[3].copy(viejo).sub(o);
    c.target = nuevo;
    c.vis[c.head] = true;
  }
  crecer(c) {
    const o = c.off[c.head];
    lerp4(c.q[c.head][2], c.q[c.head][0], c.target.clone().add(o), c.hstep);
    lerp4(c.q[c.head][3], c.q[c.head][1], c.target.clone().sub(o), c.hstep);
  }
  achicar(c) {
    const o = c.off[c.tail], q = c.q[c.tail];
    lerp4(q[0], c.tailpos.clone().add(o), q[2], c.tstep);
    lerp4(q[1], c.tailpos.clone().sub(o), q[3], c.tstep);
  }
  avanzarCola(c) {
    c.vis[c.tail] = false;
    c.tail = (c.tail + 1) % 6;
    c.tailpos = c.q[c.tail][0].clone().sub(c.off[c.tail]);
    c.tstep = 1;
  }
  fuera(c) {
    const p = c.q[(c.head + 5) % 6][0].clone().multiplyScalar(MM).project(this.cam);
    return !(p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1);
  }
  nacer() {
    if (!this.piezas.length) return;
    const c = this.cad.find(x => x.estado === 0);
    if (!c) return;
    c.q = Array.from({
      length: 6
    }, Q);
    c.off = Array.from({
      length: 6
    }, () => new THREE.Vector3);
    c.vis = [ false, false, false, false, false, false ];
    c.tail = 5;
    c.head = 5;
    c.tstep = 0;
    c.oi = this.piezas[rand() % this.piezas.length];
    c.cur = rand() % c.oi.v.length;
    c.target = c.oi.v[c.cur];
    c.tailpos = c.target.clone();
    c.prev = -1;
    this.nuevoTramo(c);
    c.estado = 1;
    c.prev = -1;
  }
  cuadro() {
    this.reloj++;
    if (rand() % 100 < 30) this.nacer();
    for (const c of this.cad) {
      if (c.estado === 1) {
        this.crecer(c);
        if (++c.hstep !== 5) continue;
        this.nuevoTramo(c);
        if ((c.head + 2) % 6 === c.tail || this.fuera(c)) {
          c.estado = 2;
          c.tstep = 1;
        }
      } else if (c.estado === 2) {
        this.achicar(c);
        if (++c.tstep === 5) this.avanzarCola(c);
        this.crecer(c);
        if (++c.hstep !== 5) continue;
        this.nuevoTramo(c);
        if (rand() % 100 < 5 || this.fuera(c)) {
          c.estado = 3;
          c.tstep = 1;
        }
      } else if (c.estado === 3) {
        this.achicar(c);
        if (++c.tstep === 5) {
          this.avanzarCola(c);
          if (c.tail === c.head) c.estado = 0;
        }
      }
    }
    this.dibujar();
  }
  dibujar() {
    const g = this.geo, B = this.reloj & 1;
    let n = 0;
    const cero = Q();
    this.cad.forEach((c, k) => {
      for (let s = 0; s < 6; s++) {
        const i = k * 6 + s;
        if (c.estado === 0 || !c.vis[s]) {
          ponerQuad(g, i, cero);
          continue;
        }
        ponerQuad(g, i, c.q[s]);
        const edad = (c.head - s + 6) % 6, col = COL_SPARK[B][edad];
        ponerCol(g, i, col[0], col[1], col[2]);
        n++;
      }
    });
    listo(g);
    this.obj.visible = n > 0;
  }
  dispose() {
    this.obj.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}

export class Materializacion {
  constructor({centro: centro, t: t = 30, color: color = [ 255, 255, 255 ], tex: tex, camara: camara}) {
    this.c = centro.clone().multiplyScalar(1e3);
    this.t = t;
    this.t0 = t;
    this.color = color;
    this.cam = camara;
    this.tex = tex;
    this.R = 5e3;
    this.grupo = new THREE.Group;
    this.grupo.scale.setScalar(MM);
    this.grupo.userData.sinColision = true;
    this.geoP = quads(32);
    for (let i = 0; i < 32; i++) ponerUV(this.geoP, i, [ 0, 1, 1, 1, 0, 0, 1, 0 ]);
    const mp = new THREE.Mesh(this.geoP, materialPS1(tex.rcm_l));
    mp.frustumCulled = false;
    mp.raycast = () => {};
    this.grupo.add(mp);
    this.p = Array.from({
      length: 32
    }, () => {
      const r = {
        rx: -randU(1024),
        ry: randU(4096),
        d: 5100,
        espera: randU(32),
        est: 0,
        vel: 0,
        col: [ 0, 0, 0 ]
      };
      return r;
    });
    this.tandas = [];
    this.geoS = quads(1);
    ponerUV(this.geoS, 0, [ 0, 1, 1, 1, 0, 0, 1, 0 ]);
    this.anillo = new THREE.Mesh(this.geoS, materialPS1(tex.sonic, {
      abr: 3
    }));
    this.anillo.frustumCulled = false;
    this.anillo.raycast = () => {};
    this.grupo.add(this.anillo);
    this.sonic = {
      f: 0
    };
    this.lf = {
      A: this.c.clone(),
      B: new THREE.Vector3(this.c.x + randS(3) * 1e3 + randS(512), this.c.y, this.c.z + randS(3) * 1e3 + randS(512)),
      vel: new THREE.Vector3(randS(512), 0, randS(512)),
      t: t
    };
    this.fundido = {
      modo: "sube",
      n: 0,
      total: t * 4
    };
    this.f = 0;
    this.terminado = false;
  }
  tanda(R) {
    const g = quads(32);
    for (let i = 0; i < 32; i++) ponerUV(g, i, [ 0, 1, 1, 1, 0, 0, 1, 0 ]);
    const m = new THREE.Mesh(g, materialPS1(this.tex.rcm_l));
    m.frustumCulled = false;
    m.raycast = () => {};
    this.grupo.add(m);
    const e = Array.from({
      length: 32
    }, () => this.reiniciarEstela({}, R, randU(32)));
    this.tandas.push({
      R: R,
      g: g,
      m: m,
      e: e
    });
  }
  reiniciarEstela(s, R, espera = 0) {
    s.rx = -randU(512);
    s.ry = randU(4096);
    s.est = 0;
    s.espera = espera;
    s.lado = new THREE.Vector3(Math.trunc(50 * Math.cos(s.ry * ANG)), 0, Math.trunc(-50 * Math.sin(s.ry * ANG)));
    s.d1 = Math.trunc(R / 2) + (R * randU(4096) >> 13);
    s.d2 = Math.trunc(s.d1 * 7 / 8);
    s.col = [ 0, 0, 0 ];
    return s;
  }
  cuadro() {
    if (this.terminado) {
      this.cuadroFundido();
      return;
    }
    this.f++;
    const T = this.t, T0 = this.t0;
    for (const p of this.p) {
      if (p.est === 0) {
        if (p.espera > 0) {
          p.espera--;
          continue;
        }
        p.col = [ ...this.color ];
        p.vel = randS(64);
        p.est = 1;
      } else if (p.est === 1) {
        p.rx += p.vel;
        p.ry += p.vel;
        p.d = Math.trunc(p.d * 7 / 8) - 5;
        if (p.d < 0) p.est = 2;
        p.col = this.color.map(c => Math.max(0, Math.trunc(c * p.d / this.R)));
      } else {
        p.d = this.R + 100;
        p.espera = 0;
        p.rx = -randU(1024);
        p.ry = randU(4096);
        p.est = 0;
      }
    }
    if (T === T0) this.tanda(this.R);
    if (T === Math.trunc(T0 * 2 / 3)) this.tanda(Math.trunc(this.R * 2 / 3));
    if (T === Math.trunc(T0 / 2)) this.tanda(Math.trunc(this.R / 2));
    for (const td of this.tandas) for (const s of td.e) {
      if (s.est === 0) {
        if (--s.espera < 0) {
          s.col = [ ...this.color ];
          s.est = 1;
        }
      } else if (s.est === 1) {
        const d2v = s.d2;
        s.d1 = Math.trunc(s.d1 * 7 / 8) - 10;
        s.d2 = Math.trunc(s.d2 * 3 / 4) - 10;
        s.q1 = d2v;
        s.q0 = s.d1;
        if (s.d1 < 0) {
          s.d1 = 0;
          s.est = 2;
        }
        if (s.d2 < 0) s.d2 = 0;
        s.col = this.color.map(c => Math.max(0, Math.trunc(c * s.d1 / td.R)));
      } else this.reiniciarEstela(s, td.R);
    }
    this.sonic.f++;
    if (this.lf.t > 0) {
      this.lf.B.add(this.lf.vel);
      this.lf.t--;
    }
    this.cuadroFundido();
    if (T < 0) {
      this.terminado = true;
      this.fundido = {
        modo: "destello",
        n: 0
      };
      this.grupo.visible = false;
    }
    this.t--;
  }
  cuadroFundido() {
    const F = this.fundido;
    if (!F) return;
    F.n++;
    if (F.modo === "sube") F.v = Math.trunc(F.n * 255 / F.total); else {
      F.v = 255 - Math.trunc(F.n * 255 / 15);
      if (F.n >= 15) {
        this.fundido = null;
        this.fin = true;
      }
    }
  }
  actualizarMallas() {
    const cam = this.cam, c = this.c, v = new THREE.Vector3, q = Q();
    this.p.forEach((p, i) => {
      dir(p.rx, p.ry, v).multiplyScalar(Math.max(0, p.d)).add(c);
      if (p.est === 0 && p.espera > 0) {
        ponerQuad(this.geoP, i, Q());
        return;
      }
      ponerQuad(this.geoP, i, billboard(v, 80, cam, q));
      ponerCol(this.geoP, i, ...p.col);
    });
    listo(this.geoP);
    for (const td of this.tandas) td.e.forEach((s, i) => {
      if (s.est !== 1 || s.q0 == null) {
        ponerQuad(td.g, i, Q());
        return;
      }
      const d = dir(s.rx, s.ry, new THREE.Vector3);
      const a = d.clone().multiplyScalar(s.q0).add(c), b = d.clone().multiplyScalar(s.q1).add(c);
      ponerQuad(td.g, i, [ a, b, a.clone().add(s.lado), b.clone().add(s.lado) ]);
      ponerCol(td.g, i, ...s.col);
    }), listo(td.g);
    const f = this.sonic.f;
    if (f >= 1 && f <= 11) {
      const lado = f <= 4 ? 800 + 500 * f : 800 + 500 * f, col = f <= 4 ? 128 : 128 - 16 * (f - 4);
      ponerQuad(this.geoS, 0, billboard(c, lado / 2, cam, q));
      ponerCol(this.geoS, 0, col, col, col);
      this.anillo.visible = true;
      listo(this.geoS);
    } else this.anillo.visible = false;
  }
  lente(proyectar) {
    if (this.lf.t <= 0 || this.terminado) return [];
    const a = proyectar(this.lf.A), b = proyectar(this.lf.B);
    if (!a || !b) return [];
    const TAB = [ [ 8, 8 ], [ 34, 11 ], [ 6, 20 ], [ 25, 33 ], [ 12, 37 ], [ 70, 50 ], [ 11, -7 ], [ 50, -9 ] ];
    return TAB.map(([lado, k]) => ({
      x: a.x - (a.x - b.x) * k / 64,
      y: a.y - (a.y - b.y) * k / 64,
      lado: lado,
      k: this.f & 1 ? 30 : 25
    }));
  }
  get blanco() {
    return this.fundido?.v || 0;
  }
  dispose() {
    this.grupo.removeFromParent();
    this.grupo.traverse(o => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
  }
}

const SXZ = [ 4096, 1024, 256, 64, 16, 4, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0 ], SY = [ 4096, 8e3, 12e3, 16e3, 8e3, 4096, 2048, 512, 128, 32, 16, 1, 0, 0, 0, 0 ];

export class Warp {
  constructor({oculto: oculto = true} = {}) {
    this.timer = oculto ? 15 : 0;
    this.indice = this.timer & 15;
  }
  entrar() {
    this.timer = 31;
  }
  salir() {
    this.timer = 32;
  }
  cuadro() {
    if (this.timer & 16) {
      if (--this.timer === 16) this.timer = 0;
    }
    if (this.timer & 32) {
      if (++this.timer === 47) this.timer = 15;
    }
    this.indice = this.timer & 15;
  }
  get escala() {
    return [ SXZ[this.indice] / 4096, SY[this.indice] / 4096 ];
  }
  get normal() {
    return this.indice === 0;
  }
  enganchar(cuerpo) {
    if (!cuerpo || cuerpo === this.cuerpo) return;
    this.soltar();
    this.cuerpo = cuerpo;
    const hueso = cuerpo.getObjectByName("hueso_0"), M = new THREE.Matrix4, S = new THREE.Matrix4, h = new THREE.Vector3, base = new THREE.Matrix4;
    const ajustar = o => {
      const [sxz, sy] = this.escala;
      if (sxz === 1 && sy === 1) return;
      base.multiplyMatrices(o.parent.matrixWorld, o.matrix);
      (hueso || cuerpo).getWorldPosition(h);
      const R = (new THREE.Matrix4).extractRotation(cuerpo.matrixWorld), Ri = R.clone().invert();
      M.makeTranslation(h.x, h.y, h.z).multiply(R).multiply(S.makeScale(Math.max(sxz, 1e-4), Math.max(sy, 1e-4), Math.max(sxz, 1e-4))).multiply(Ri).multiply((new THREE.Matrix4).makeTranslation(-h.x, -h.y, -h.z));
      o.matrixWorld.multiplyMatrices(M, base);
      if (sxz === 0 || sy === 0) o.matrixWorld.multiply(S.makeScale(0, 0, 0));
    };
    this.mallas = [];
    cuerpo.traverse(o => {
      if (o.isMesh) {
        const prev = [ o.onBeforeRender, o.onBeforeShadow ];
        o.onBeforeRender = (...a) => {
          prev[0]?.call(o, ...a);
          ajustar(o);
        };
        o.onBeforeShadow = (...a) => {
          prev[1]?.call(o, ...a);
          ajustar(o);
          if (a[3]) o.modelViewMatrix.multiplyMatrices(a[3].matrixWorldInverse, o.matrixWorld);
        };
        this.mallas.push([ o, prev ]);
      }
    });
  }
  soltar() {
    for (const [o, prev] of this.mallas || []) {
      o.onBeforeRender = prev[0] || (() => {});
      o.onBeforeShadow = prev[1] || (() => {});
    }
    this.mallas = [];
    this.cuerpo = null;
  }
}

export const GIRO_META = 68 / 4096 * Math.PI * 2;
