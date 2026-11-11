// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { PeloNaomi, PeloMeiLing } from "./foto_pelo.js";

import { texturaPS1 } from "./efectos_vr.js";

const MM = .001, ANG = Math.PI * 2 / 4096, FPS = 30;

const MSG = {
  CARA: 47672,
  BOCA: 47065,
  MANO: 27465,
  MANO2: 41796,
  EXTRA1: 25667,
  EXTRA2: 25668
};

const TIPO_MSG = [ null, MSG.CARA, MSG.BOCA, MSG.MANO, MSG.MANO2 ];

const SE = {
  FLASH: 177,
  FLASH2: 178,
  ANILLO: 182,
  PITIDO: 184,
  FIN1: 185,
  FIN2: 186
};

const q4096 = (a, o = 0) => new THREE.Quaternion(a[o] / 4096, a[o + 1] / 4096, a[o + 2] / 4096, a[o + 3] / 4096).normalize();

const GIRO = {
  1: q4096([ 0, 2896, 0, 2896 ]),
  2: q4096([ 0, -2896, 0, 2896 ]),
  3: new THREE.Quaternion(0, -1, 0, 0)
};

const v3 = p => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);

const ratan2 = (x, z) => Math.round(Math.atan2(x, z) / ANG);

const PIEZAS_ADELANTE = {
  "37a8": .025
};

function materialConLuz(m0, U, adelante = 0) {
  const m = new THREE.MeshBasicMaterial({
    map: m0.map || null,
    transparent: m0.transparent,
    alphaTest: m0.alphaTest,
    depthWrite: m0.depthWrite,
    blending: m0.blending,
    side: m0.side,
    opacity: m0.opacity
  });
  m.name = m0.name;
  m.color.copy(m0.color || new THREE.Color(1, 1, 1));
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = "uniform vec3 uLuzDir;\nuniform vec3 uLuzCol;\nuniform vec3 uLuzAmb;\nvarying vec3 vLuzPS1;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n  vec3 nLuz = normal;\n  #ifdef USE_SKINNING\n    nLuz = objectNormal;\n  #endif\n  float dLuz = max( 0.0, -dot( normalize( mat3( modelMatrix ) * nLuz ), uLuzDir ) );\n  vLuzPS1 = min( vec3( 255.0 ), floor( ( 256.0 - uLuzAmb ) * 0.5 ) * ( uLuzAmb + uLuzCol * dLuz ) / 256.0 ) / 128.0;`);
    if (adelante > 0) sh.vertexShader = sh.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>\n  mvPosition.xyz -= normalize( mvPosition.xyz ) * ${adelante.toFixed(4)};\n  gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = "varying vec3 vLuzPS1;\n" + sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n  diffuseColor.rgb *= vLuzPS1;");
  };
  m.customProgramCacheKey = () => "luzPS1" + (adelante > 0 ? "_a" + adelante : "");
  return m;
}

const ENV_VS = `uniform vec2 uC; uniform vec2 uK; varying vec2 vUv;\nvoid main() { vec3 o = normalize( normalMatrix * normal ); vUv = vec2( uC.x - o.x * uK.x, uC.y + o.y * uK.y );\n  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;

const ENV_FS = `uniform sampler2D map; uniform float uF; varying vec2 vUv;\nvoid main() { vec4 t = texture2D( map, vUv ); if ( t.a < 0.5 ) discard; gl_FragColor = vec4( t.rgb * uF, 1.0 ); }`;

const MEZCLA = [ THREE.NormalBlending, THREE.AdditiveBlending, THREE.SubtractiveBlending, THREE.AdditiveBlending ];

const PUNTOS_VS = `attribute vec3 col; uniform float uTam; varying vec3 vCol;\nvoid main() { vCol = col; gl_PointSize = uTam; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;

const PUNTOS_FS = `varying vec3 vCol; void main() { if ( vCol.r + vCol.g + vCol.b <= 0.0 ) discard; gl_FragColor = vec4( vCol, 1.0 ); }`;

class Pose {
  constructor(m) {
    this.m = m;
    this.cuadro = 0;
    this.fin = false;
    this.j = m.huesos.map(K => {
      const s = {
        K: K,
        k: 1,
        A: q4096(K[0], 1),
        B: q4096(K[0], 5),
        C: null,
        D: null,
        n: 0,
        t: 0,
        dt: 0
      };
      this.leer(s);
      return s;
    });
    this.raiz = [ 0, 0, 0 ];
  }
  leer(s) {
    if (s.C) {
      s.A = s.C;
      s.B = s.D;
    }
    const c = s.K[s.k] || s.K[s.K.length - 1];
    s.C = q4096(c, 1);
    s.D = q4096(c, 5);
    s.n = Math.max(1, c[0]);
    s.t = 0;
    s.dt = 32768 / s.n;
    s.k++;
  }
  paso(out) {
    const m = this.m;
    this.cuadro++;
    const vuelta = this.cuadro === m.cuadros;
    const r = m.raiz, i = (this.cuadro - 1) % m.cuadros;
    if (r) this.raiz = [ r[i * 3], r[i * 3 + 1], r[i * 3 + 2] ];
    if (vuelta) {
      this.cuadro = 0;
      this.fin = true;
    }
    const a = new THREE.Quaternion, b = new THREE.Quaternion;
    this.j.forEach((s, h) => {
      const t = Math.min(4096, s.t / 8) / 4096;
      a.slerpQuaternions(s.A, s.C, t);
      b.slerpQuaternions(s.B, s.D, t);
      (out[h] ||= new THREE.Quaternion).slerpQuaternions(a, b, 2 * t * (1 - t));
      s.n--;
      s.t += s.dt;
      if (s.n <= 0) {
        if (vuelta) s.k = 1;
        this.leer(s);
      }
    });
  }
}

class Morph {
  constructor(obj, variantes) {
    this.mallas = [];
    obj.traverse(o => {
      if (o.isMesh) {
        o.geometry = o.geometry.clone();
        this.mallas.push(o);
      }
    });
    this.base = this.mallas.map(o => Float32Array.from(o.geometry.attributes.position.array));
    this.var = variantes;
    this.desde = this.base.map(a => Float32Array.from(a));
    this.hacia = this.base;
    this.k = 0;
    this.modo = 0;
    this.n = 0;
    this.total = 0;
    this.activo = false;
  }
  ir(hash, modo, cuadros) {
    const v = this.var[hash.toString(16).padStart(4, "0")];
    if (!v) return;
    this.desde = this.mallas.map(o => Float32Array.from(o.geometry.attributes.position.array));
    this.hacia = v;
    this.modo = modo;
    this.total = Math.max(0, cuadros);
    this.n = this.total;
    this.k = 4096;
    this.activo = true;
  }
  cuadro() {
    if (!this.activo) return;
    if (this.modo === 0) this.k = this.total > 0 ? (this.n << 12) / this.total : 0; else {
      const paso = Math.trunc(this.k / [ 1, 2, 4, 8 ][Math.min(3, this.modo)]);
      this.k = paso > 0 ? this.k - paso : 0;
    }
    this.n--;
    const k = Math.max(0, Math.min(4096, this.k)) / 4096;
    this.mallas.forEach((o, i) => {
      const p = o.geometry.attributes.position, d = this.desde[i], h = this.hacia[i];
      if (!h || h.length !== p.array.length) return;
      for (let j = 0; j < p.array.length; j++) p.array[j] = h[j] + (d[j] - h[j]) * k;
      p.needsUpdate = true;
    });
    if (k <= 0) this.activo = false;
  }
}

export class SesionFoto {
  constructor(op) {
    this.op = op;
    this.F = op.foto;
    this.base = op.base ?? "assets/";
    this.f = 0;
    this.estado = "intro";
    this.fi = 0;
    this.tiempo = this.F.tiempo * FPS;
    this.pitidos = 10;
    this.fin = null;
    this.locales = [];
    this.globales = [];
    this.guardada = null;
    this.mezcla = 0;
    this.mezclaN = 0;
    this.correccion = [ 0, 0, 0 ];
    this.destello = 0;
    this.destelloN = 8;
  }
  async cargar() {
    const F = this.F, M = F.muneca, G = this.op.grupo, carg = u => this.op.cargarGlb(u);
    const [movs] = await Promise.all([ fetch(this.base + M.movs).then(r => r.json()) ]);
    this.movs = movs;
    const L = F.luz || this.op.luz || {}, d = L.main?.[0] || [ 0, -1, 0 ], c = L.main?.[1] || [ 0, 0, 0 ], a = L.amb || [ 128, 128, 128 ];
    this.uLuz = {
      uLuzDir: {
        value: new THREE.Vector3(...d).normalize()
      },
      uLuzCol: {
        value: new THREE.Vector3(...c)
      },
      uLuzAmb: {
        value: new THREE.Vector3(...a)
      }
    };
    this.raizObj = new THREE.Group;
    this.raizObj.name = "DOLL2";
    G.add(this.raizObj);
    this.cuerpo = await carg(M.cuerpo);
    this.raizObj.add(this.cuerpo);
    this.iluminar(this.cuerpo);
    this.huesos = [];
    this.cuerpo.traverse(o => {
      const m = /^hueso_(\d+)$/.exec(o.name);
      if (m && o.isBone) this.huesos[+m[1]] = o;
    });
    this.cuerpo.traverse(o => {
      if (o.isMesh) {
        o.frustumCulled = false;
        o.userData.sinColision = true;
      }
    });
    this.morphs = new Map;
    this.ojos = [];
    this.piezaH = {};
    for (const p of M.piezas) {
      const o = await carg(p.modelo);
      const h = this.huesos[p.hueso] || this.cuerpo;
      o.traverse(q => {
        if (q.isMesh) {
          q.userData.sinColision = true;
          q.frustumCulled = false;
        }
      });
      h.add(o);
      this.iluminar(o, PIEZAS_ADELANTE[p.hash] || 0);
      this.piezaH[p.hash] = o;
      if (p.variantes && p.mensaje) {
        const vs = {};
        await Promise.all(Object.entries(p.variantes).map(async ([k, u]) => {
          const v = await carg(u);
          const arr = [];
          v.traverse(q => {
            if (q.isMesh) arr.push(Float32Array.from(q.geometry.attributes.position.array));
          });
          vs[k] = arr;
        }));
        const mo = new Morph(o, vs);
        if (!this.morphs.has(p.mensaje)) this.morphs.set(p.mensaje, []);
        this.morphs.get(p.mensaje).push(mo);
      }
      if (p.nombre === "ojo_i" || p.nombre === "ojo_d") {
        const mallas = [];
        o.traverse(q => {
          if (q.isMesh) {
            q.geometry = q.geometry.clone();
            mallas.push(q);
          }
        });
        this.ojos.push({
          mallas: mallas,
          uv0: mallas.map(q => Float32Array.from(q.geometry.attributes.uv.array)),
          lado: p.nombre === "ojo_d" ? -1 : 1,
          o: o
        });
      }
    }
    this.sueltos = [];
    for (const s of M.sueltos || []) {
      const o = await carg(s.modelo);
      o.traverse(q => {
        if (q.isMesh) q.userData.sinColision = true;
      });
      G.add(o);
      this.iluminar(o);
      this.sueltos.push({
        ...s,
        o: o
      });
    }
    if (F.pelo?.modelo) {
      const o = await carg(F.pelo.modelo);
      o.traverse(q => {
        if (q.isMesh) {
          q.userData.sinColision = true;
          q.frustumCulled = false;
        }
      });
      this.iluminar(o);
      this.pelo = o;
      if (F.pelo.tipo === "MEILINGHAIR") {
        G.add(o);
        this.peloFis = new PeloMeiLing(o, F.pelo, this);
      } else {
        o.position.copy(v3(F.pelo.offset));
        (this.huesos[F.pelo.hueso] || this.cuerpo).add(o);
        this.peloFis = new PeloNaomi(o, F.pelo, this);
      }
      if (!this.peloFis.ok) console.warn("foto: el pelo no coincide con sus datos (vr_foto_export.py datos_pelo)");
    }
    await this.armarEnvmap();
    const E = F.escenario || {};
    this.anillos = [];
    for (const a of E.anillos || []) {
      const o = await carg(a.modelo);
      this.prepSet(o);
      G.add(o);
      this.anillos.push(o);
    }
    this.setObjs = {};
    for (const s of E.modelos || []) {
      const o = await carg(s.modelo);
      this.prepSet(o);
      o.position.copy(v3(s.pos));
      o.rotation.y = (s.rot || 0) * ANG;
      if (s.color) this.colorear(o, s.color);
      G.add(o);
      (this.setObjs[s.tipo || s.nombre] ||= []).push(o);
    }
    if (E.hex) this.armarHex(E.hex);
    if (E.set1) await this.armarSet1(E.set1);
    this.ctrl = {
      x: M.p[0],
      z: M.p[2],
      giro: M.d[1] | 0
    };
    this.siguiente = 0;
    this.idx = -1;
    this.objetivoOjos = {
      modo: 0,
      n: 0,
      p: new THREE.Vector3(0, 1.2, 20),
      act: new THREE.Vector3(0, 1.2, 20)
    };
    this.cambiarPose(0, 0);
    this.cuadroMuneca(true);
    this.distAnt = Infinity;
    this.anilloSig = 5;
  }
  prepSet(o) {
    o.traverse(q => {
      if (q.isMesh) {
        q.userData.sinColision = true;
        q.raycast = () => {};
      }
    });
  }
  iluminar(o, adelante = 0) {
    o.traverse(q => {
      if (q.isMesh && !q.userData.envmap) q.material = Array.isArray(q.material) ? q.material.map(m => materialConLuz(m, this.uLuz, adelante)) : materialConLuz(q.material, this.uLuz, adelante);
    });
  }
  async armarEnvmap() {
    for (const E of this.F.envmap || []) {
      const o = this.piezaH[E.pieza];
      if (!o) continue;
      const tex = await texturaPS1(this.base + E.textura.png);
      if (!tex?.image) continue;
      const w = tex.image.width, h = tex.image.height, cx = w - 1 >> 1, cy = h - 1 >> 1, r = cx - 1;
      const abr = E.textura.abr | 0;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          map: {
            value: tex
          },
          uC: {
            value: new THREE.Vector2((cx + .5) / w, 1 - (cy + .5) / h)
          },
          uK: {
            value: new THREE.Vector2(r / w, r / h)
          },
          uF: {
            value: abr === 3 ? .25 : 1
          }
        },
        vertexShader: ENV_VS,
        fragmentShader: ENV_FS,
        transparent: true,
        depthWrite: false,
        blending: MEZCLA[abr],
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
        toneMapped: false
      });
      const objs = new Set(E.objetos), mallas = [];
      o.traverse(q => {
        if (q.isMesh && !q.userData.envmap) mallas.push(q);
      });
      mallas.forEach((q, k) => {
        const Mp = E.mapa[k], pa = q.geometry.attributes.position;
        if (!Mp || Mp.length !== pa.count) return;
        const idx = [];
        for (let f = 0; f < Mp.length / 4; f++) if (objs.has(Mp[f * 4] >> 8)) {
          const b = f * 4;
          idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
        }
        if (!idx.length) return;
        const g = new THREE.BufferGeometry;
        g.setAttribute("position", pa);
        g.setAttribute("normal", q.geometry.attributes.normal);
        g.setIndex(idx);
        const m = new THREE.Mesh(g, mat);
        m.name = "envmap";
        m.renderOrder = 2;
        m.frustumCulled = false;
        m.raycast = () => {};
        m.userData.envmap = m.userData.sinColision = true;
        q.add(m);
      });
    }
  }
  async armarSet1(S) {
    const g = new THREE.Group;
    g.name = "BG_ST1";
    for (const u of S.modelos) {
      const o = await this.op.cargarGlb(u);
      this.prepSet(o);
      o.traverse(q => {
        if (q.isMesh) q.frustumCulled = false;
      });
      g.add(o);
    }
    g.rotation.y = S.giro * ANG;
    g.scale.setScalar(S.escala / 4096);
    const N = 1024, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), z = new Int32Array(N);
    for (let i = 0; i < N; i++) {
      const zz = ((Math.random() * 32768 | 0) - 16384) * 2, a = (Math.random() * 4096 | 0) * ANG, rr = (Math.random() * 4096 | 0) + 128;
      z[i] = zz;
      pos[i * 3] = rr * Math.cos(a) * MM;
      pos[i * 3 + 1] = rr * Math.sin(a) * MM;
      pos[i * 3 + 2] = zz * MM;
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("col", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTam: {
          value: 1
        }
      },
      vertexShader: PUNTOS_VS,
      fragmentShader: PUNTOS_FS,
      toneMapped: false
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.raycast = () => {};
    this.op.grupo.add(g);
    this.op.grupo.add(pts);
    this.set1 = {
      g: g,
      pts: pts,
      z: z,
      S: S,
      pz: S.z,
      vel: 0,
      acel: 0,
      estado: 0,
      f: 0
    };
    this.cuadroSet1(true);
  }
  cuadroSet1(soloDibujo = false) {
    const s = this.set1;
    if (!s) return;
    if (!soloDibujo) {
      if (s.f >= 30) {
        s.g.removeFromParent();
        s.pts.removeFromParent();
        s.pts.geometry.dispose();
        this.set1 = null;
        return;
      }
      if (s.estado === 0) s.estado = 1;
      if (s.estado === 1) {
        s.vel = 200;
        if (s.pz < 29150) {
          s.estado = 2;
          s.acel = -11;
          this.destellar(20);
          this.op.sonar?.(SE.FLASH2);
        }
      } else if (s.estado === 2) {
        s.vel += s.acel;
        if (s.vel < 8) {
          s.vel = 5;
          s.acel = 0;
        }
      }
      s.pz -= s.vel;
      const p = s.pts.geometry.attributes.position;
      for (let i = 0; i < s.z.length; i++) if (s.z[i] !== 32e3) {
        s.z[i] -= 1200;
        if (s.z[i] < -3e4) s.z[i] = 32e3;
        p.array[i * 3 + 2] = s.z[i] * MM;
      }
      p.needsUpdate = true;
      s.f++;
    }
    s.g.position.set(0, s.S.y * MM, s.pz * MM);
    const c = s.pts.geometry.attributes.col;
    for (let i = 0; i < s.z.length; i++) {
      const zz = s.z[i], rg = zz + 32768 >> 8 & 255, b = zz + 98304 >> 10 & 255;
      c.array[i * 3] = rg / 255;
      c.array[i * 3 + 1] = rg / 255;
      c.array[i * 3 + 2] = b / 255;
    }
    c.needsUpdate = true;
    s.pts.material.uniforms.uTam.value = Math.max(1, Math.round((typeof innerHeight === "number" ? innerHeight : 224) / 224));
  }
  destellar(n) {
    if (n >= this.destello) {
      this.destello = n;
      this.destelloN = n;
    }
  }
  colorear(o, c) {
    o.traverse(q => {
      if (q.isMesh) for (const m of [].concat(q.material)) {
        m.color = new THREE.Color(c[0] / 128, c[1] / 128, c[2] / 128);
      }
    });
  }
  cambiarPose(n, mezcla) {
    const m = this.movs[n] || this.movs[0];
    if (!m) return;
    if (this.globales.length) this.guardada = this.globales.map(q => q.clone());
    this.mezcla = mezcla ? 4096 : 0;
    this.mezclaN = mezcla;
    this.pose = new Pose(m);
    this.poseN = n;
    this.eventos = (this.F.muneca.eventos?.[n] || []).slice();
    this.ie = 0;
    this.sonidos = (this.F.muneca.sonidos?.[n] || []).slice();
    this.is = 0;
  }
  proximaDelArreglo() {
    const A = this.F.arreglo;
    if (!A) return;
    this.idx++;
    const v = this.idx < A.length ? A[this.idx] : -1;
    const T = this.F.poses || {};
    let r = T[String(v)] ?? T[String(v > 0 ? v : 0)];
    if (Array.isArray(r)) r = r[Math.floor(Math.random() * r.length)];
    if (typeof r === "number") this.siguiente = r;
  }
  cuadroMuneca(primero = false) {
    const H = this.huesos, pose = this.pose;
    if (!primero && pose.fin) {
      const raizQ = this.locales[0]?.clone();
      this.cambiarPose(this.siguiente, 4);
      this.siguiente = 0;
      if (raizQ) {
        const m = (new THREE.Matrix4).makeRotationFromQuaternion(raizQ).elements;
        const yaw = ratan2(m[8], m[10]);
        let g = 0;
        if (yaw < -512) g = yaw < -1499 ? 0 : 1;
        if (yaw >= 513 && yaw < 513 + 987) g = 2;
        if (yaw > 1500 || yaw < -1500) g = 3;
        if (g) {
          this.ctrl.giro += g === 1 ? -1024 : g === 2 ? 1024 : 2048;
          if (this.guardada) this.guardada = this.guardada.map(q => GIRO[g].clone().multiply(q));
        }
      }
      this.proximaDelArreglo();
    }
    pose.paso(this.locales);
    const n = this.locales.length;
    for (let h = 0; h < n; h++) {
      const padre = H[h]?.parent?.isBone ? +(/^hueso_(\d+)$/.exec(H[h].parent.name)?.[1] ?? -1) : -1;
      (this.globales[h] ||= new THREE.Quaternion).copy(this.locales[h]);
      if (padre >= 0) this.globales[h].premultiply(this.globales[padre]);
    }
    if (this.mezclaN > 0 && this.guardada) {
      this.mezcla -= Math.trunc(this.mezcla / this.mezclaN);
      this.mezclaN--;
      for (let h = 0; h < n; h++) this.globales[h].slerp(this.guardada[h], this.mezcla / 4096);
    }
    const inv = new THREE.Quaternion;
    for (let h = 0; h < n; h++) {
      const b = H[h];
      if (!b) continue;
      const padre = b.parent?.isBone ? +(/^hueso_(\d+)$/.exec(b.parent.name)?.[1] ?? -1) : -1;
      if (padre >= 0) b.quaternion.copy(inv.copy(this.globales[padre]).invert().multiply(this.globales[h])); else b.quaternion.copy(this.globales[h]);
    }
    const [px, py, pz] = pose.raiz, c = Math.cos(this.ctrl.giro * ANG), s = Math.sin(this.ctrl.giro * ANG);
    this.ctrl.x += Math.round(px * c + pz * s);
    this.ctrl.z += Math.round(-px * s + pz * c);
    const x0 = this.ctrl.x, z0 = this.ctrl.z;
    const d = Math.hypot(this.ctrl.x, this.ctrl.z);
    if (d > 250) {
      this.ctrl.x = Math.round(this.ctrl.x * 250 / d);
      this.ctrl.z = Math.round(this.ctrl.z * 250 / d);
    }
    this.correccion = [ this.ctrl.x - x0, 0, this.ctrl.z - z0 ];
    if (H[0]) H[0].position.y = py * MM;
    this.raizObj.position.set(this.ctrl.x * MM, 0, this.ctrl.z * MM);
    this.raizObj.rotation.set(0, this.ctrl.giro * ANG, 0);
    this.raizObj.updateMatrixWorld(true);
    this.peloFis?.cuadro();
    const fr = pose.cuadro;
    while (this.ie < this.eventos.length && this.eventos[this.ie][0] <= fr) this.evento(this.eventos[this.ie++]);
    while (this.is < this.sonidos.length && this.sonidos[this.is][0] <= fr) {
      this.op.sonar?.(this.sonidos[this.is++][1]);
    }
    for (const L of this.morphs.values()) for (const mo of L) mo.cuadro();
    for (const S of this.sueltos) {
      if (S.tipo !== "banco") continue;
      const m = (new THREE.Matrix4).makeRotationFromQuaternion(this.locales[0] || new THREE.Quaternion).elements;
      const a = (ratan2(m[8], m[10]) + 160) * ANG;
      S.o.rotation.set(0, a, 0);
      S.o.position.set((this.ctrl.x + -50 * Math.sin(a)) * MM, 0, (this.ctrl.z + -50 * Math.cos(a)) * MM);
    }
    this.cuadroOjos();
  }
  evento(e) {
    const t = e[1];
    if (t === 0) {
      const p = new THREE.Vector3(e[4] * MM, 0, e[6] * MM).applyMatrix4(this.raizObj.matrixWorld);
      p.y = e[5] * MM;
      this.mirar(e[2], e[3], p);
    } else {
      const L = this.morphs.get(TIPO_MSG[t]);
      if (L) for (const mo of L) mo.ir(e[4], e[2], e[3]);
    }
  }
  mirar(modo, cuadros, p) {
    const O = this.objetivoOjos;
    O.modo = modo;
    O.n = cuadros;
    O.p.copy(p);
    if (cuadros <= 0) O.act.copy(p);
  }
  cuadroOjos() {
    const O = this.objetivoOjos;
    if (O.n > 0) {
      O.act.lerp(O.p, O.modo === 0 ? 1 / O.n : O.modo === 1 ? .5 : O.modo === 2 ? .25 : .125);
      O.n--;
    } else O.act.copy(O.p);
    const cab = this.huesos[12];
    if (!cab || !this.ojos.length) return;
    const local = cab.worldToLocal(O.act.clone()).sub(new THREE.Vector3(0, .09, .1));
    const giroY = Math.atan2(local.x, local.z) / ANG, giroX = Math.atan2(-local.y, Math.hypot(local.x, local.z)) / ANG;
    const du = giroY > 512 ? -32 : giroY < -512 ? 32 : giroY * -32 / 512, dv = giroX > 256 ? -24 : giroX < -256 ? 24 : giroX * -24 / 256;
    for (const E of this.ojos) {
      E.mallas.forEach((q, i) => {
        const uv = q.geometry.attributes.uv, b = E.uv0[i];
        for (let j = 0; j < uv.count; j++) {
          uv.array[j * 2] = b[j * 2] + du * E.lado / 256;
          uv.array[j * 2 + 1] = b[j * 2 + 1] + dv / 256;
        }
        uv.needsUpdate = true;
      });
    }
  }
  armarHex(c) {
    const N = 8, L = 16;
    const geo = new THREE.BufferGeometry;
    this.hex = {
      pos: new Float32Array(N * L * 2 * 3),
      col: new Float32Array(N * L * 2 * 3),
      tr: [],
      c: c.map(v => v / 255),
      N: N,
      L: L
    };
    geo.setAttribute("position", new THREE.BufferAttribute(this.hex.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.hex.col, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.hex.obj = new THREE.LineSegments(geo, mat);
    this.hex.obj.frustumCulled = false;
    this.hex.obj.userData.sinColision = true;
    this.hex.obj.raycast = () => {};
    this.op.grupo.add(this.hex.obj);
    this.hex.dirs = [ [ 0, 256 ], [ 221, 128 ], [ 221, -128 ], [ 0, -256 ], [ -221, -128 ], [ -221, 128 ] ];
    for (let i = 0; i < N; i++) this.hex.tr.push({
      p: null,
      d: Math.random() * 6 | 0,
      seg: [],
      t: Math.random() * 24 | 0
    });
  }
  cuadroHex() {
    const X = this.hex;
    if (!X) return;
    const sn = this.op.jugador.position;
    for (let i = 0; i < X.N; i++) {
      const T = X.tr[i];
      if (!T.p || --T.t <= 0) {
        const gx = Math.round(sn.x / MM / 442) * 442, gz = Math.round(sn.z / MM / 768) * 768;
        T.p = [ gx + ((Math.random() * 7 | 0) - 3) * 442, gz + ((Math.random() * 7 | 0) - 3) * 768 ];
        T.seg = [];
        T.t = 24 + (Math.random() * 24 | 0);
      }
      T.d = (T.d + (Math.random() < .5 ? 1 : 5)) % 6;
      const [dx, dz] = X.dirs[T.d], q = [ T.p[0] + dx, T.p[1] + dz ];
      T.seg.push([ T.p, q, 1 ]);
      T.p = q;
      if (T.seg.length > X.L) T.seg.shift();
      for (const s of T.seg) s[2] *= .82;
      for (let k = 0; k < X.L; k++) {
        const s = T.seg[k], o = (i * X.L + k) * 6;
        if (!s) {
          X.col.fill(0, o, o + 6);
          continue;
        }
        X.pos.set([ s[0][0] * MM, .003, s[0][1] * MM, s[1][0] * MM, .003, s[1][1] * MM ], o);
        const c = X.c.map(v => v * s[2]);
        X.col.set([ ...c, ...c ], o);
      }
    }
    X.obj.geometry.attributes.position.needsUpdate = true;
    X.obj.geometry.attributes.color.needsUpdate = true;
  }
  camaraIntro() {
    const w = this.F.intro, f = this.fi;
    let ojo, mira, zoom = 320;
    const T1 = [ [ 0, [ 1025, 1366, 1149 ], [ -987, 671, -815 ] ], [ 7, [ 231, 1533, 1003 ], [ -450, -205, -1716 ] ], [ 15, [ -777, 1441, 727 ], [ 1446, -254, -1020 ] ], [ 22, [ 0, 1100, 430 ], [ 0, 1100, -1900 ] ] ];
    const T2 = [ [ 0, [ 1025, 1366, 1149 ], [ -987, 671, -815 ] ], [ 15, [ -219, 1419, 352 ], [ 476, 1735, -816 ] ] ];
    if (f < 30) {
      if (w === 0) {
        ojo = [ 0, 0, 28e3 ];
        mira = [ 0, 0, 26e3 ];
      } else {
        const T = w === 1 ? T1 : T2;
        const c = T.filter(x => f >= x[0]).pop();
        ojo = c[1];
        mira = c[2];
      }
    } else {
      const fr = w === 1 ? [ 0, 1100, 430 ] : [ 0, 1500, 500 ];
      if (f < 60) {
        ojo = fr;
        mira = [ fr[0], fr[1], fr[2] - 2e3 ];
        zoom = 28672 + (320 - 28672) * (f - 30) / 30;
      } else {
        const k = Math.min(1, (f - 60) / 60), J = this.camJuego();
        ojo = fr.map((v, i) => v + (J.ojo[i] - v) * k);
        const m0 = [ fr[0], fr[1], fr[2] - 2e3 ];
        mira = m0.map((v, i) => v + (J.mira[i] - v) * k);
      }
    }
    return {
      pos: v3(ojo),
      mira: v3(mira),
      fov: 2 * Math.atan(Math.tan(42.2 * Math.PI / 360) * (320 / zoom)) * 180 / Math.PI
    };
  }
  camJuego() {
    const p = this.op.jugador.position, x = p.x / MM, z = p.z / MM;
    this.cx ??= x;
    this.cz ??= z;
    if (this.cx < x - 512) this.cx = x - 512;
    if (this.cx > x + 512) this.cx = x + 512;
    if (this.cz < z - 512) this.cz = z - 512;
    if (this.cz > z + 512) this.cz = z + 512;
    const d = Math.hypot(this.cx, this.cz), s = Math.round(4096 * Math.sin((d / 32 + 1024) * ANG));
    return {
      ojo: [ this.cx, (4096 - s) * 7 + 3e3, this.cz + (4096 - s) + 4e3 ],
      mira: [ this.cx, 1500, this.cz ]
    };
  }
  intro() {
    const w = this.F.intro, f = this.fi;
    const cortes = w === 1 ? [ 0, 7, 15, 22 ] : w === 2 ? [ 0, 15 ] : [];
    if (cortes.includes(f)) {
      this.destellar(w === 2 ? 16 : 8);
      this.op.sonar?.(SE.FLASH);
      const c = this.camaraIntro();
      this.mirar(1, 4, c.pos);
    }
    if (f === 30) {
      this.destellar(32);
      this.op.sonar?.(w === 0 ? SE.FLASH2 : SE.FLASH);
      const c = this.camaraIntro();
      this.mirar(1, 2, c.pos);
    }
  }
  cuadro(juega) {
    this.f++;
    if (this.estado === "intro") {
      this.intro();
      if (++this.fi >= 120) this.estado = "juego";
    }
    this.cuadroMuneca();
    this.cuadroHex();
    this.cuadroSet1();
    if (this.destello > 0) this.destello--;
    const sn = this.op.jugador.position, d = Math.hypot(sn.x, sn.z) / MM;
    if (this.anilloSig > this.F.nivel && d < this.F.radios[this.anilloSig] + 768) {
      this.anilloSig--;
      this.flashRango = 16;
      this.destellar(8);
      this.op.sonar?.(SE.ANILLO);
    }
    this.cuadroRango(d);
    if (this.estado !== "juego" || !juega) return null;
    if (this.tiempo > 0) {
      this.tiempo--;
      if (this.tiempo < this.pitidos * FPS && this.pitidos > 0) {
        this.pitidos--;
        this.op.sonar?.(SE.PITIDO);
      }
      if (this.tiempo === 0) {
        this.op.sonar?.(SE.FIN1);
        this.op.sonar?.(SE.FIN2);
        return "tiempo";
      }
    }
    if (Math.abs(sn.x / MM) <= 5e3 && sn.z / MM >= 24e3) return "salida";
    return null;
  }
  cuadroRango(d) {
    const R = this.setObjs.rango?.[0];
    if (R) {
      const b = this.flashRango > 0 ? this.flashRango-- : 0;
      const c = b > 0 ? [ b * 200 / 16, b * 200 / 16 * 3 / 5, (16 - b) * 8 ] : [ 0, 0, 128 ];
      this.colorear(R, c);
    }
    const T = this.setObjs.texto?.[0];
    if (T) {
      const v = (Math.sin(this.f * 64 * ANG) * 4096 + 4096) / 128 + 64;
      this.colorear(T, [ v, v, v ]);
    }
    const B = this.setObjs.obj_edg?.[0];
    if (B && d > 18e3) {
      const v = Math.min(255, (d - 18e3) / 8);
      this.colorear(B, [ v, v, v ]);
    }
  }
  dibujar(x, texto) {
    if (this.estado !== "juego") return;
    const t = this.tiempo, cs = Math.floor(t % 30 * 100 / 30), s = Math.floor(t / 30) % 60, m = Math.floor(t / 1800);
    texto(x, `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(cs).padStart(2, "0")}`, 130, 16, "255,255,255");
  }
  get blanco() {
    return this.destello > 0 ? Math.min(1, this.destello / this.destelloN) : 0;
  }
}
