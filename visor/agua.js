// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const TIPOS = new Set([ "WT_AREA", "WT_AREA2", "WT_VIEW", "FURNACE" ]);

export function zonasAguaDe(actores) {
  const out = [];
  for (const a of actores || []) {
    if (!TIPOS.has(a.tipo) || a.evento || !Array.isArray(a.opts?.b) || a.opts.b.length < 6) continue;
    const b = a.opts.b.map(v => v * .001), c = Array.isArray(a.opts.c) ? a.opts.c : a.tipo === "FURNACE" ? [ 64, 10, 10 ] : [ 100, 128, 120 ];
    const caja = new THREE.Box3(new THREE.Vector3(Math.min(b[0], b[3]), Math.min(b[1], b[4]), Math.min(b[2], b[5])), new THREE.Vector3(Math.max(b[0], b[3]), Math.max(b[1], b[4]), Math.max(b[2], b[5])));
    out.push({
      caja: caja,
      color: new THREE.Vector3(c[0] / 128, c[1] / 128, c[2] / 128),
      tipo: a.tipo
    });
  }
  return out;
}

export class VistaAgua {
  constructor() {
    this.rt = null;
    this.paso = 0;
    this.acum = 0;
    this._v = new THREE.Vector2;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tex: {
          value: null
        },
        color: {
          value: new THREE.Vector3(1, 1, 1)
        },
        fase: {
          value: 0
        }
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `uniform sampler2D tex; uniform vec3 color; uniform float fase; varying vec2 vUv;\n        void main(){\n          float franja = floor((1.0 - vUv.y) * 112.0);                     // franjas de 2 líneas sobre 224\n          float d = sin((franja + fase) * 6.28318530718 / 32.0) * 4.0 / 224.0;   // ±4 líneas\n          gl_FragColor = vec4(texture2D(tex, vec2(vUv.x, clamp(vUv.y + d, 0.0, 1.0))).rgb * color, 1.0);\n          #include <colorspace_fragment>\n        }`,
      depthTest: false,
      depthWrite: false
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    q.frustumCulled = false;
    this.escena = new THREE.Scene;
    this.escena.add(q);
    this.camQ = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  zonaEn(p, zonas) {
    for (const z of zonas || []) if (z.caja.containsPoint(p)) return z;
    return null;
  }
  preparar(R) {
    R.getDrawingBufferSize(this._v);
    const w = Math.max(1, this._v.x | 0), h = Math.max(1, this._v.y | 0);
    if (!this.rt || this.rt.width !== w || this.rt.height !== h) {
      this.rt?.dispose();
      this.rt = new THREE.WebGLRenderTarget(w, h, {
        depthBuffer: true
      });
    }
    return this.rt;
  }
  mostrar(R, dt, zona) {
    this.acum += dt * 30;
    while (this.acum >= 1) {
      this.acum -= 1;
      this.paso = this.paso + 1 & 31;
    }
    this.mat.uniforms.tex.value = this.rt.texture;
    this.mat.uniforms.color.value.copy(zona.color);
    this.mat.uniforms.fase.value = this.paso;
    const prev = R.autoClear;
    R.autoClear = true;
    R.setRenderTarget(null);
    R.setScissorTest(false);
    R.render(this.escena, this.camQ);
    R.autoClear = prev;
  }
  aplicar(R, tex, destino, zona) {
    this.mat.uniforms.tex.value = tex;
    this.mat.uniforms.color.value.copy(zona.color);
    this.mat.uniforms.fase.value = this.paso;
    const prev = R.getRenderTarget();
    R.setRenderTarget(destino);
    R.render(this.escena, this.camQ);
    R.setRenderTarget(prev);
  }
}
