// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const FPS = 30;

export const TINTE = [ [ 12, 79, 60 ], [ 4, 101, 138 ], [ 38, 82, 50 ], [ 55, 67, 18 ] ];

export const COLORES = [ [ [ 34, 40, 13 ], [ 8, 45, 71 ], [ 23, 60, 14 ] ], [ [ 16, 56, 62 ], [ 31, 56, 25 ], [ 38, 29, 57 ] ], [ [ 12, 67, 45 ], [ 47, 67, 3 ], [ 1, 67, 87 ] ], [ [ 53, 51, 0 ], [ 50, 13, 5 ], [ 44, 93, 13 ] ] ];

export const SECUENCIA = [ 0, 1, 0, 2 ];

const PROPORCION = .5 / (112 / (320 * 58 / 64));

const VERT_PANTALLA = `\nout vec2 vP;\nvoid main() { vP = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }`;

const VERT_ESFERA = `\nout vec3 vDir;\nvoid main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;

const FRAG = `\nprecision highp float; precision highp int;\nuniform sampler2D tL, tR;          // op_back_l (160x224) y op_back_r con 22 filas de VRAM arriba (160x246)\nuniform vec3 uSprX, uSprT;         // VRBG: x de los 3 SPRT y su textura (0 = l, 1 = r)\nuniform vec3 uTinte, uCol;         // VRBG: color de los SPRT; VRBG2: color de los POLY_FT4 (0..255, 128 = 1)\nuniform float uS, uVR, uOn1, uOn2, uBrillo;\nuniform vec2 uMedio;               // pantalla: medio ancho y medio alto visibles en píxeles de la PS1\n#ifdef ESFERA\nin vec3 vDir;\n#else\nin vec2 vP;\n#endif\nout vec4 color;\nconst int TRAMA[16] = int[16](-4, 0, -3, 1, 2, -2, 3, -1, -3, 1, -4, 0, 3, -1, 2, -2);   // GPU de la PS1, 4x4\n// texel de la página de VRAM (u, v absolutos de 0..255): false si no hay textura o es el índice transparente (0x0000)\nbool leer(int cual, int u, int v, out ivec3 t5, out bool stp) {\n  vec4 c;\n  if (cual == 0) { if (u < 0 || u > 159 || v < 0 || v > 223) return false; c = texelFetch(tL, ivec2(u, v), 0); }\n  else { int f = v + 22 - int(uVR); if (u < 0 || u > 159 || f < 0 || f > 245) return false; c = texelFetch(tR, ivec2(u, f), 0); }\n  ivec3 c8 = ivec3(c.rgb * 255.0 + 0.5);\n  if (c8.r == 0 && c8.g == 0 && c8.b == 0) return false;\n  t5 = c8 >> 3; stp = ((c8.r | c8.g | c8.b) & 7) != 0;   // libdg/loader.c LoadPalette\n  return true;\n}\nvoid main() {\n#ifdef ESFERA\n  vec3 d = normalize(vDir);\n  float th = atan(d.x, -d.z), ph = asin(clamp(d.y, -1.0, 1.0));\n  vec2 q = vec2(th / atan(0.5) * 160.0, -tan(clamp(ph, -1.3, 1.3)) * 320.0 * 58.0 / 64.0);\n#else\n  vec2 q = vec2(vP.x * uMedio.x, -vP.y * uMedio.y);\n#endif\n  int px = int(floor(q.x)), py = int(floor(q.y));\n  ivec3 B = ivec3(0); ivec3 t5; bool stp;\n  // ---- VRBG: tira de SPRT (backgrnd.c 0x800DB0A4 / 0x800DB1CC)\n  if (uOn1 > 0.5 && py >= -112 && py < 112) {\n    int cual = -1, dx = 0;\n    int xmin = 100000, xmax = -100000, tmin = 0, tmax = 0;\n    for (int k = 0; k < 3; k++) {\n      int X = int(uSprX[k]), T = int(uSprT[k]);\n      if (px >= X && px < X + 160) { cual = T; dx = px - X; }\n      if (X < xmin) { xmin = X; tmin = T; }\n      if (X > xmax) { xmax = X; tmax = T; }\n    }\n    if (cual < 0 && px < xmin) { int n = (xmin - px + 159) / 160; cual = (tmin + n) & 1; dx = px - (xmin - n * 160); }\n    else if (cual < 0) { int n = (px - xmax) / 160; cual = (tmax + n) & 1; dx = px - (xmax + n * 160); }\n    int v = (cual == 0 ? 0 : int(uVR)) + py + 112;\n    if (leer(cual, dx, v, t5, stp)) B = min(ivec3(31), (t5 * ivec3(uTinte)) >> 7);   // SPRT 0x64: opaco, sin tramado\n  }\n  // ---- VRBG2: zoom hacia el centro (bg2.c 0x800DB74C), POLY_FT4 0x2E semitransparente, modo 1 (fondo + textura)\n  if (uOn2 > 0.5) {\n    int s = int(uS), vR = int(uVR);\n    bool izq = px < 0, arr = py < 0;\n    int x0 = izq ? -160 : 0, y0 = arr ? -112 : 0, u0, u1, v0, v1, cual;\n    if (izq) { cual = 0; u0 = s; u1 = 159; if (arr) { v0 = s; v1 = 111; } else { v0 = 112; v1 = 223 - s; } }\n    else { cual = 1; u0 = 0; u1 = 159 - s; if (arr) { v0 = vR + s; v1 = vR + 111; } else { v0 = 0; v1 = 111 - s; } }   // abajo a la derecha: v absoluta (así está en el original)\n    int u = u0 + int(floor(float((u1 - u0) * (px - x0)) / 160.0));\n    int v = v0 + int(floor(float((v1 - v0) * (py - y0)) / 112.0));\n    if (leer(cual, u, v, t5, stp)) {\n      ivec3 c8 = clamp(((t5 << 3) * ivec3(uCol)) / 128 + TRAMA[(py & 3) * 4 + (px & 3)], 0, 255);\n      ivec3 F = c8 >> 3;\n      B = stp ? min(ivec3(31), B + F) : F;\n    }\n  }\n  color = vec4(vec3(B) / 31.0 * uBrillo, 1.0);\n}`;

function textura(url) {
  return new Promise((ok, mal) => (new THREE.TextureLoader).load(url, t => {
    t.flipY = false;
    t.colorSpace = THREE.NoColorSpace;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    ok(t);
  }, undefined, mal));
}

export class FondoVR {
  constructor({tipo: tipo = 1, tipo2: tipo2 = null, vR: vR = 22, base: base = "assets/", vrbg: vrbg = true, vrbg2: vrbg2 = true} = {}) {
    this.base = base;
    this.tipo = tipo;
    this.tipo2 = tipo2 ?? tipo;
    this.vR = vR;
    this.u = {
      tL: {
        value: null
      },
      tR: {
        value: null
      },
      uSprX: {
        value: new THREE.Vector3
      },
      uSprT: {
        value: new THREE.Vector3
      },
      uTinte: {
        value: new THREE.Vector3
      },
      uCol: {
        value: new THREE.Vector3
      },
      uS: {
        value: 0
      },
      uVR: {
        value: vR
      },
      uOn1: {
        value: vrbg ? 1 : 0
      },
      uOn2: {
        value: vrbg2 ? 1 : 0
      },
      uBrillo: {
        value: 1
      },
      uMedio: {
        value: new THREE.Vector2(160, 112)
      }
    };
    this.grupo = new THREE.Group;
    this.grupo.name = "fondo_vr";
    this.acum = 0;
    this.cuadros = 0;
    this.reiniciar();
    this.listo = this.cargar();
  }
  async cargar() {
    const [l, r] = await Promise.all([ textura(this.base + "vr/comun/fondo_l.png"), textura(this.base + "vr/comun/fondo_r.png") ]);
    this.u.tL.value = l;
    this.u.tR.value = r;
    const comun = {
      uniforms: this.u,
      fragmentShader: FRAG,
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false
    };
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      ...comun,
      vertexShader: VERT_PANTALLA
    }));
    const esf = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), new THREE.ShaderMaterial({
      ...comun,
      vertexShader: VERT_ESFERA,
      defines: {
        ESFERA: 1
      },
      side: THREE.BackSide
    }));
    for (const m of [ pant, esf ]) {
      m.frustumCulled = false;
      m.renderOrder = -1e6;
      m.userData.sinColision = true;
      m.userData.fondoVR = true;
      m.raycast = () => {};
    }
    pant.onBeforeRender = (renderer, scene, camera) => {
      const xr = renderer.xr?.isPresenting;
      if (xr) return;
      const s = renderer.getRenderTarget(), w = s ? s.width : renderer.domElement.width, h = s ? s.height : renderer.domElement.height;
      const asp = w / Math.max(1, h);
      this.u.uMedio.value.set(160 * Math.max(1, asp / PROPORCION), 112 * Math.max(1, PROPORCION / asp));
    };
    esf.onBeforeRender = (renderer, scene, camera) => {
      camera.getWorldPosition(esf.position);
      esf.updateMatrixWorld();
    };
    this.pantalla = pant;
    this.esfera = esf;
    this.grupo.add(pant, esf);
    this.modoCasco(false);
    return this;
  }
  modoCasco(si) {
    if (this.pantalla) {
      this.pantalla.visible = !si;
      this.esfera.visible = !!si;
    }
  }
  reiniciar() {
    this.spr = [ {
      x: -160,
      t: 0
    }, {
      x: 0,
      t: 1
    }, {
      x: 160,
      t: 0
    } ];
    this.c1 = 0;
    this.alt = 0;
    this.idx = 0;
    this.c2 = 0;
    this.mezcla = 0;
    this.sec = 0;
    this.subir();
  }
  cuadro() {
    for (const s of this.spr) s.x--;
    if (this.c1 === 160) {
      const s = this.spr[this.idx];
      s.x = 160;
      s.t = this.alt;
      this.c1 = 0;
      this.alt ^= 1;
      this.idx = (this.idx + 1) % 3;
    }
    this.c1++;
    const t = this.tipo2 & 3, A = COLORES[t][SECUENCIA[this.sec]], B = COLORES[t][SECUENCIA[(this.sec + 1) % 4]], c = this.c2;
    this.col = [ 0, 1, 2 ].map(i => {
      let v = Math.trunc((A[i] * (900 - this.mezcla) + B[i] * this.mezcla) / 900);
      if (c < 30) v = Math.trunc(v * c / 30); else if (c >= 148) v = Math.trunc(v * (177 - c) / 30);
      return v;
    });
    if (++this.mezcla >= 901) {
      this.mezcla = 0;
      this.sec = (this.sec + 1) % 4;
    }
    this.s = c >> 1;
    if (this.c2 === 177) this.c2 = 0;
    this.c2++;
    this.cuadros++;
    this.subir();
  }
  subir() {
    const u = this.u;
    u.uSprX.value.set(this.spr[0].x, this.spr[1].x, this.spr[2].x);
    u.uSprT.value.set(this.spr[0].t, this.spr[1].t, this.spr[2].t);
    u.uTinte.value.set(...TINTE[this.tipo & 3]);
    u.uCol.value.set(...this.col || [ 0, 0, 0 ]);
    u.uS.value = this.s || 0;
    u.uVR.value = this.vR;
  }
  actualizar(dt, {casco: casco = false} = {}) {
    this.acum += Math.min(Math.max(dt, 0), .5);
    let n = 0;
    while (this.acum >= 1 / FPS && n < 8) {
      this.acum -= 1 / FPS;
      this.cuadro();
      n++;
    }
    if (n === 8) this.acum = 0;
    this.modoCasco(casco);
  }
  datosCPU() {
    if (this._cpu || !this.u.tL.value) return this._cpu;
    const leer = img => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const x = c.getContext("2d");
      x.drawImage(img, 0, 0);
      return {
        w: img.width,
        h: img.height,
        d: x.getImageData(0, 0, img.width, img.height).data
      };
    };
    return this._cpu = {
      L: leer(this.u.tL.value.image),
      R: leer(this.u.tR.value.image)
    };
  }
  lienzo(ancho = 320) {
    const D = this.datosCPU();
    if (!D) return null;
    ancho = Math.max(320, Math.round(ancho));
    if (!this._lz || this._lz.width !== ancho) {
      this._lz = document.createElement("canvas");
      this._lz.width = ancho;
      this._lz.height = 224;
      this._img = this._lz.getContext("2d").createImageData(ancho, 224);
      this._lzCuadro = -1;
    }
    if (this._lzCuadro === this.cuadros) return this._lz;
    this._lzCuadro = this.cuadros;
    const out = this._img.data, mx = ancho >> 1, vR = this.vR | 0, s = this.s | 0, T = TINTE[this.tipo & 3], C = this.col || [ 0, 0, 0 ];
    const TR = [ -4, 0, -3, 1, 2, -2, 3, -1, -3, 1, -4, 0, 3, -1, 2, -2 ];
    const xs = this.spr.map(q => q.x), ts = this.spr.map(q => q.t);
    let xmin = 1e9, xmax = -1e9, tmin = 0, tmax = 0;
    xs.forEach((X, k) => {
      if (X < xmin) {
        xmin = X;
        tmin = ts[k];
      }
      if (X > xmax) {
        xmax = X;
        tmax = ts[k];
      }
    });
    const t5 = [ 0, 0, 0 ];
    const leer = (cual, u, v) => {
      let img, f;
      if (cual === 0) {
        if (u < 0 || u > 159 || v < 0 || v > 223) return -1;
        img = D.L;
        f = v;
      } else {
        f = v + 22 - vR;
        if (u < 0 || u > 159 || f < 0 || f > 245) return -1;
        img = D.R;
      }
      const o = (f * img.w + u) * 4, r = img.d[o], g = img.d[o + 1], b = img.d[o + 2];
      if (!r && !g && !b) return -1;
      t5[0] = r >> 3;
      t5[1] = g >> 3;
      t5[2] = b >> 3;
      return ((r | g | b) & 7) !== 0 ? 1 : 0;
    };
    for (let py = -112; py < 112; py++) for (let px = -mx; px < ancho - mx; px++) {
      let r = 0, g = 0, b = 0;
      if (this.u.uOn1.value) {
        let cual = -1, dx = 0;
        for (let k = 0; k < 3; k++) if (px >= xs[k] && px < xs[k] + 160) {
          cual = ts[k];
          dx = px - xs[k];
        }
        if (cual < 0 && px < xmin) {
          const n = (xmin - px + 159) / 160 | 0;
          cual = tmin + n & 1;
          dx = px - (xmin - n * 160);
        } else if (cual < 0) {
          const n = (px - xmax) / 160 | 0;
          cual = tmax + n & 1;
          dx = px - (xmax + n * 160);
        }
        if (leer(cual, dx, (cual === 0 ? 0 : vR) + py + 112) >= 0) {
          r = Math.min(31, t5[0] * T[0] >> 7);
          g = Math.min(31, t5[1] * T[1] >> 7);
          b = Math.min(31, t5[2] * T[2] >> 7);
        }
      }
      if (this.u.uOn2.value) {
        const izq = px < 0, arr = py < 0, x0 = izq ? -160 : 0, y0 = arr ? -112 : 0;
        let u0, u1, v0, v1, cual;
        if (izq) {
          cual = 0;
          u0 = s;
          u1 = 159;
          if (arr) {
            v0 = s;
            v1 = 111;
          } else {
            v0 = 112;
            v1 = 223 - s;
          }
        } else {
          cual = 1;
          u0 = 0;
          u1 = 159 - s;
          if (arr) {
            v0 = vR + s;
            v1 = vR + 111;
          } else {
            v0 = 0;
            v1 = 111 - s;
          }
        }
        const st = leer(cual, u0 + Math.floor((u1 - u0) * (px - x0) / 160), v0 + Math.floor((v1 - v0) * (py - y0) / 112));
        if (st >= 0) {
          const dd = TR[(py & 3) * 4 + (px & 3)], f = k => Math.min(255, Math.max(0, ((t5[k] << 3) * C[k] >> 7) + dd)) >> 3;
          if (st) {
            r = Math.min(31, r + f(0));
            g = Math.min(31, g + f(1));
            b = Math.min(31, b + f(2));
          } else {
            r = f(0);
            g = f(1);
            b = f(2);
          }
        }
      }
      const o = ((py + 112) * ancho + px + mx) * 4;
      out[o] = r * 255 / 31 | 0;
      out[o + 1] = g * 255 / 31 | 0;
      out[o + 2] = b * 255 / 31 | 0;
      out[o + 3] = 255;
    }
    this._lz.getContext("2d").putImageData(this._img, 0, 0);
    return this._lz;
  }
  set tipos({tipo: tipo, tipo2: tipo2}) {
    if (tipo != null) this.tipo = tipo;
    if (tipo2 != null) this.tipo2 = tipo2;
    this.subir();
  }
  set brillo(k) {
    this.u.uBrillo.value = k;
  }
  dispose() {
    this.grupo.removeFromParent();
    for (const m of [ this.pantalla, this.esfera ]) {
      m?.geometry.dispose();
      m?.material.dispose();
    }
    this.u.tL.value?.dispose();
    this.u.tR.value?.dispose();
  }
}
