// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { blurGuion } from "./blur_guion.js";

export const FILTROS = [ "ninguno", "ps1", "crt", "tv" ];

export const NOMBRES_FILTRO = {
  ninguno: "ninguno",
  ps1: "PS1",
  crt: "CRT",
  tv: "TV vieja"
};

const CLAVE = "sm_filtro";

const VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const COMUN = `uniform sampler2D tF; uniform vec2 uR; uniform vec2 uL; uniform float uT; varying vec2 vUv;\n  vec3 fuente(vec2 uv) { return texture2D(tF, uv).rgb; }   // ya en sRGB (como el lienzo)\n`;

const FRAG = {
  ps1: COMUN + `\n  const int TRAMA[16] = int[16](-4, 0, -3, 1, 2, -2, 3, -1, -3, 1, -4, 0, 3, -1, 2, -2);\n  void main() {\n    vec2 p = floor(vUv * uL);\n    vec3 c = fuente((p + 0.5) / uL) * 255.0;\n    vec2 q = mod(vec2(p.x, uL.y - 1.0 - p.y), 4.0);   // la fila 0 arriba, como la PS1\n    float d = float(TRAMA[int(q.y) * 4 + int(q.x)]);\n    c = clamp(floor((c + d) / 8.0), 0.0, 31.0) / 31.0;\n    gl_FragColor = vec4(c, 1.0);\n  }`,
  crt: COMUN + `\n  vec2 curvar(vec2 uv) { uv = uv * 2.0 - 1.0; vec2 o = abs(uv.yx) / vec2(6.5, 5.0); uv += uv * o * o; return uv * 0.5 + 0.5; }\n  void main() {\n    vec2 uv = curvar(vUv);\n    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }\n    float y = uv.y * uL.y, f = fract(y) - 0.5, yc = (floor(y) + 0.5) / uL.y, dx = 0.5 / uL.x;\n    vec3 c = (fuente(vec2(uv.x - dx, yc)) + 2.0 * fuente(vec2(uv.x, yc)) + fuente(vec2(uv.x + dx, yc))) * 0.25;\n    float l = dot(c, vec3(0.299, 0.587, 0.114)), s = mix(0.2, 0.34, l);\n    c *= mix(0.5, 1.0, exp(-0.5 * f * f / (s * s)));                  // la línea de barrido: el haz más ancho en lo claro\n    if (uR.x / uL.x >= 2.5) {                                           // máscara de fósforo (con pocos píxeles haría moiré)\n      int m = int(mod(gl_FragCoord.x, 3.0)); vec3 k = vec3(0.86); if (m == 0) k.r = 1.1; else if (m == 1) k.g = 1.1; else k.b = 1.1; c *= k;\n    }\n    float v = 16.0 * uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);\n    c *= 1.22 * pow(v, 0.18);\n    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n  }`,
  tv: COMUN + `\n  const mat3 A_YIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);\n  const mat3 A_RGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);\n  float azar(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n  void main() {\n    float y = vUv.y * uL.y, f = fract(y) - 0.5, yc = (floor(y) + 0.5) / uL.y, dx = 1.0 / uL.x, x = vUv.x;\n    vec3 c0 = A_YIQ * fuente(vec2(x, yc));\n    float Y = 0.5 * c0.x + 0.25 * ((A_YIQ * fuente(vec2(x - 0.6 * dx, yc))).x + (A_YIQ * fuente(vec2(x + 0.6 * dx, yc))).x);\n    vec2 iq = vec2(0.0); float ws = 0.0;                                 // el color, corrido 1 píxel y desparramado\n    for (int i = -2; i <= 2; i++) { float w = exp(-0.35 * float(i * i)); iq += w * (A_YIQ * fuente(vec2(x - (float(i) * 1.6 + 1.0) * dx, yc))).yz; ws += w; }\n    vec3 c = A_RGB * vec3(Y, iq / ws * 1.1);\n    c *= 0.86 + 0.14 * cos(6.2831853 * f);                               // líneas tenues\n    c += (azar(gl_FragCoord.xy + fract(uT) * 97.0) - 0.5) * 0.045;       // un poco de ruido\n    float v = 16.0 * vUv.x * vUv.y * (1.0 - vUv.x) * (1.0 - vUv.y);\n    c *= 1.06 * pow(v, 0.12);\n    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);\n  }`
};

export class FiltroPantalla {
  constructor(R, {tactil: tactil = false} = {}) {
    this.R = R;
    this.tactil = tactil;
    this.rt = null;
    this._cap = false;
    this._hubo = false;
    this._oyentes = new Set;
    let m = null;
    try {
      m = localStorage.getItem(CLAVE);
    } catch {}
    this._modo = FILTROS.includes(m) ? m : "ninguno";
    this.mats = {};
    this.uniforms = {
      tF: {
        value: null
      },
      uR: {
        value: new THREE.Vector2
      },
      uL: {
        value: new THREE.Vector2
      },
      uT: {
        value: 0
      }
    };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.escena = new THREE.Scene;
    this.escena.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._v = new THREE.Vector2;
    this._vp = new THREE.Vector4;
    this._t0 = performance.now();
    const set0 = this._set = R.setRenderTarget.bind(R), r0 = this._render = R.render.bind(R), c0 = R.clear.bind(R);
    R.setRenderTarget = (t, ...a) => set0(t === null && this._cap ? this.rt : t, ...a);
    R.render = (s, c) => {
      if (this._cap) this._hubo = true;
      return r0(s, c);
    };
    R.clear = (...a) => {
      if (this._cap) this._hubo = true;
      return c0(...a);
    };
  }
  get modo() {
    return this._modo;
  }
  get activo() {
    return (this._modo !== "ninguno" || !!blurGuion.actual) && !this.R.xr.isPresenting;
  }
  poner(m) {
    if (!FILTROS.includes(m) || m === this._modo) return;
    this._modo = m;
    try {
      localStorage.setItem(CLAVE, m);
    } catch {}
    this.rt?.dispose();
    this.rt = null;
    this._soltarBlur();
    for (const f of this._oyentes) {
      try {
        f(m);
      } catch (e) {
        console.error(e);
      }
    }
  }
  siguiente(d = 1) {
    const i = FILTROS.indexOf(this._modo);
    this.poner(FILTROS[(i + d + FILTROS.length) % FILTROS.length]);
  }
  alCambiar(f) {
    this._oyentes.add(f);
    return () => this._oyentes.delete(f);
  }
  releer() {
    try {
      const m = localStorage.getItem(CLAVE);
      if (m) this.poner(m);
    } catch {}
  }
  _material(m) {
    return this.mats[m] ||= new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG[m],
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
  }
  _preparar() {
    const R = this.R;
    R.getDrawingBufferSize(this._v);
    const w = Math.max(1, this._v.x | 0), h = Math.max(1, this._v.y | 0);
    if (this.rt && this.rt.width === w && this.rt.height === h) return;
    this.rt?.dispose();
    const filtro = this._modo === "ps1" ? THREE.NearestFilter : THREE.LinearFilter;
    this.rt = new THREE.WebGLRenderTarget(w, h, {
      depthBuffer: true,
      stencilBuffer: true,
      samples: this.tactil || this._modo === "ps1" ? 0 : 4,
      minFilter: filtro,
      magFilter: filtro,
      generateMipmaps: false
    });
    this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    this.rt.texture.internalFormat = "RGBA8";
    this.rt.isXRRenderTarget = true;
  }
  empezar() {
    this._cap = false;
    if (!blurGuion.actual && this._blurRT) this._soltarBlur();
    if (!this.activo) {
      if (this.rt && this._modo === "ninguno") {
        this.rt.dispose();
        this.rt = null;
      }
      return;
    }
    this._preparar();
    this._cap = true;
    this._hubo = false;
    this._set(this.rt);
  }
  terminar() {
    if (!this._cap) return;
    this._cap = false;
    const R = this.R;
    this._set(null);
    if (!this._hubo) return;
    const fuente = blurGuion.actual ? this._pasoBlur() : this.rt.texture;
    const w = this.rt.width, h = this.rt.height, k = Math.max(1, Math.min(w / 320, h / 240));
    this.uniforms.tF.value = fuente;
    this.uniforms.uR.value.set(w, h);
    this.uniforms.uL.value.set(w / k, h / k);
    this.uniforms.uT.value = (performance.now() - this._t0) / 1e3;
    this.quad.material = this._modo === "ninguno" ? this._copia() : this._material(this._modo);
    R.getViewport(this._vp);
    const tijera = R.getScissorTest(), auto = R.autoClear;
    R.setScissorTest(false);
    R.getSize(this._v);
    R.setViewport(0, 0, this._v.x, this._v.y);
    R.autoClear = false;
    this._render(this.escena, this.cam);
    R.setViewport(this._vp);
    R.setScissorTest(tijera);
    R.autoClear = auto;
  }
  _copia() {
    return this._matCopia ||= new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fragmentShader: "uniform sampler2D tF; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tF, vUv).rgb, 1.0); }"
    });
  }
  _pasoBlur() {
    const R = this.R, w = this.rt.width, h = this.rt.height;
    let B = this._blurRT;
    if (!B || B.w !== w || B.h !== h) {
      this._soltarBlur();
      const nueva = () => {
        const f = this.rt.texture.magFilter;
        const t = new THREE.WebGLRenderTarget(w, h, {
          depthBuffer: false,
          minFilter: f,
          magFilter: f,
          generateMipmaps: false
        });
        t.texture.colorSpace = THREE.SRGBColorSpace;
        t.texture.internalFormat = "RGBA8";
        t.isXRRenderTarget = true;
        return t;
      };
      B = this._blurRT = {
        mezcla: nueva(),
        anterior: nueva(),
        w: w,
        h: h,
        listo: false
      };
    }
    const P = this._blurPiezas || this._armarBlur();
    const nuevo = blurGuion.tic(performance.now()), geo = blurGuion.actual?.geo;
    const auto = R.autoClear;
    R.autoClear = false;
    this._set(B.mezcla);
    this.uniforms.tF.value = this.rt.texture;
    this.quad.material = this._copia();
    this._render(this.escena, this.cam);
    if (geo && B.listo) {
      const p = P.geo.attributes.position, u = P.geo.attributes.uv;
      for (let i = 0; i < 9; i++) {
        p.setXYZ(i, geo.pos[i][0] / 320 * 2 - 1, 1 - geo.pos[i][1] / 224 * 2, 0);
        u.setXY(i, geo.uv[i][0] / 320, 1 - geo.uv[i][1] / 224);
      }
      p.needsUpdate = true;
      u.needsUpdate = true;
      const m = P.mat, abr = geo.abr;
      m.blendEquation = abr === 2 ? THREE.ReverseSubtractEquation : THREE.AddEquation;
      m.blendSrc = abr === 1 || abr === 2 ? THREE.OneFactor : THREE.SrcAlphaFactor;
      m.blendDst = abr === 0 ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
      m.uniforms.alfa.value = abr === 0 ? .5 : abr === 3 ? .25 : 1;
      m.uniforms.tP.value = B.anterior.texture;
      this._render(P.escena, this.cam);
    }
    this._set(null);
    R.autoClear = auto;
    if (nuevo) {
      const t = B.anterior;
      B.anterior = B.mezcla;
      B.mezcla = t;
      B.listo = true;
      return B.anterior.texture;
    }
    return B.mezcla.texture;
  }
  _armarBlur() {
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(27), 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(18), 2));
    const ind = [];
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const a = j * 3 + i, b = a + 1, c = a + 3, d = a + 4;
      ind.push(a, b, c, b, d, c);
    }
    geo.setIndex(ind);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tP: {
          value: null
        },
        alfa: {
          value: .5
        }
      },
      vertexShader: VERT,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fragmentShader: "uniform sampler2D tP; uniform float alfa; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tP, vUv).rgb, alfa); }",
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending
    });
    const malla = new THREE.Mesh(geo, mat);
    malla.frustumCulled = false;
    const escena = new THREE.Scene;
    escena.add(malla);
    return this._blurPiezas = {
      geo: geo,
      mat: mat,
      escena: escena
    };
  }
  _soltarBlur() {
    this._blurRT?.mezcla.dispose();
    this._blurRT?.anterior.dispose();
    this._blurRT = null;
  }
}
