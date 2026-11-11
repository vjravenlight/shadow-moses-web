// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

export const TINTE = {
  ninja: [ 1, 1, 1 ],
  snake: [ 1, 160 / 128, 96 / 128 ]
};

const VERT = `\n#include <common>\n#include <skinning_pars_vertex>\n#include <logdepthbuf_pars_vertex>\n#include <clipping_planes_pars_vertex>\nvoid main() {\n  #include <skinbase_vertex>\n  #include <begin_vertex>\n  #include <skinning_vertex>\n  #include <project_vertex>\n  #include <logdepthbuf_vertex>\n  #include <clipping_planes_vertex>\n}`;

const FRAG = `\nuniform sampler2D tFondo;\nuniform vec2 uTam;       // tamaño de la copia (= del búfer donde se dibuja), en píxeles\nuniform vec4 uVista;     // viewport del ojo / de la pantalla (x, y, ancho, alto) en píxeles\nuniform vec3 uTinte;\nuniform float uListo;    // 1 = copia hecha; 0 = no se dibuja; 2 = sin copia posible (camuflaje viejo)\n#include <common>\n#include <logdepthbuf_pars_fragment>\n#include <clipping_planes_pars_fragment>\nvec3 aLineal(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }\nvoid main() {\n  #include <clipping_planes_fragment>\n  #include <logdepthbuf_fragment>\n  if (uListo < 0.5) discard;\n  if (uListo > 1.5) { gl_FragColor = vec4(0.06, 0.07, 0.06, 0.2); return; }\n  float cx = uVista.x + uVista.z * 0.5;\n  vec2 s = vec2(cx + (gl_FragCoord.x - cx) * 0.75, gl_FragCoord.y);   // EQ_VisibleUnit2: u = 160 + 0,75·x, v = 112 + y\n  s = clamp(s, uVista.xy + 0.5, uVista.xy + uVista.zw - 0.5);\n  vec3 c = min(texture2D(tFondo, s / uTam).rgb * uTinte, 1.0);          // la copia guarda el color de la pantalla (sRGB)\n  gl_FragColor = vec4(aLineal(c), 1.0);\n  #include <colorspace_fragment>\n}`;

const E = {
  rt: null,
  w: 0,
  h: 0,
  pase: 0,
  hechos: new Map,
  error: false,
  revisados: new Set,
  metodo: new Map,
  uniforms: {
    tFondo: {
      value: null
    },
    uTam: {
      value: new THREE.Vector2(1, 1)
    },
    uListo: {
      value: 0
    }
  },
  mats: new Map,
  escenas: new WeakSet,
  vp: new THREE.Vector4,
  stats: {
    copias: 0,
    pixeles: 0
  }
};

const _v = new THREE.Vector3, _min = new THREE.Vector3, _max = new THREE.Vector3, _c = new THREE.Vector3;

const _w = new THREE.Vector3, _esq = Array.from({
  length: 8
}, () => new THREE.Vector3);

export function materialKogaku(tinte = TINTE.ninja) {
  const clave = tinte.join(",");
  let m = E.mats.get(clave);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: {
      ...E.uniforms,
      uVista: {
        value: new THREE.Vector4(0, 0, 1, 1)
      },
      uTinte: {
        value: new THREE.Vector3(...tinte)
      }
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
    blending: THREE.NoBlending,
    depthWrite: true
  });
  m.name = "kogaku";
  m.onBeforeRender = (R, escena, cam, geo, obj) => antes(R, escena, cam, obj, m);
  if (E.error) viejo(m);
  E.mats.set(clave, m);
  return m;
}

export function estadisticasKogaku() {
  return {
    ...E.stats,
    error: E.error,
    tam: [ E.w, E.h ]
  };
}

function viejo(m) {
  m.blending = THREE.NormalBlending;
  m.depthWrite = false;
  m.needsUpdate = true;
  m.uniforms.uListo = {
    value: 2
  };
}

function tamDestino(R) {
  const rt = R.getRenderTarget();
  if (rt) return [ rt.width, rt.height ];
  const gl = R.getContext();
  return [ gl.drawingBufferWidth, gl.drawingBufferHeight ];
}

function antes(R, escena, cam, obj, m) {
  if (!E.escenas.has(escena)) {
    E.escenas.add(escena);
    const previo = escena.onAfterRender;
    escena.onAfterRender = function(...a) {
      try {
        previo?.apply(this, a);
      } finally {
        E.pase++;
      }
    };
  }
  const vp = R.getCurrentViewport(E.vp), uv = m.uniforms.uVista.value;
  if (!uv.equals(vp)) {
    uv.copy(vp);
    m.uniformsNeedUpdate = true;
  }
  if (E.error) return;
  const raiz = obj.userData.kgRaiz ||= buscarRaiz(obj);
  const clave = raiz.id + ":" + vp.x + ":" + vp.y;
  if (E.hechos.get(clave) === E.pase) return;
  E.hechos.set(clave, E.pase);
  const r = rectangulo(raiz, cam, vp), listo = r ? copiar(R, r) ? 1 : 0 : 0;
  if (E.uniforms.uListo.value !== listo) {
    E.uniforms.uListo.value = listo;
    for (const x of E.mats.values()) x.uniformsNeedUpdate = true;
  }
}

function buscarRaiz(o) {
  let p = o;
  while (p) {
    if (p.userData?.kogakuRaiz) return p;
    if (!p.parent || p.parent.isScene) return p;
    p = p.parent;
  }
  return o;
}

function puntosDe(raiz) {
  if (raiz.userData.kgPuntos) return raiz.userData.kgPuntos;
  const huesos = new Set, mallas = [];
  raiz.traverse(x => {
    if (x.isSkinnedMesh && x.skeleton) for (const b of x.skeleton.bones) huesos.add(b); else if (x.isMesh) {
      if (!x.geometry.boundingSphere) x.geometry.computeBoundingSphere();
      mallas.push(x);
    }
  });
  return raiz.userData.kgPuntos = {
    huesos: [ ...huesos ],
    mallas: mallas
  };
}

function rectangulo(raiz, cam, vp) {
  const P = puntosDe(raiz);
  _min.set(Infinity, Infinity, Infinity);
  _max.set(-Infinity, -Infinity, -Infinity);
  const sumar = (x, y, z, r) => {
    _min.x = Math.min(_min.x, x - r);
    _min.y = Math.min(_min.y, y - r);
    _min.z = Math.min(_min.z, z - r);
    _max.x = Math.max(_max.x, x + r);
    _max.y = Math.max(_max.y, y + r);
    _max.z = Math.max(_max.z, z + r);
  };
  for (const b of P.huesos) {
    const e = b.matrixWorld.elements;
    sumar(e[12], e[13], e[14], .35);
  }
  for (const m of P.mallas) {
    if (!m.visible) continue;
    const s = m.geometry.boundingSphere;
    _c.copy(s.center).applyMatrix4(m.matrixWorld);
    sumar(_c.x, _c.y, _c.z, s.radius * m.matrixWorld.getMaxScaleOnAxis());
  }
  if (_min.x === Infinity) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const cerca = -Math.max(.05, cam.near || .05);
  for (let i = 0; i < 8; i++) _esq[i].set(i & 1 ? _max.x : _min.x, i & 2 ? _max.y : _min.y, i & 4 ? _max.z : _min.z).applyMatrix4(cam.matrixWorldInverse);
  const proyectar = q => {
    _v.copy(q).applyMatrix4(cam.projectionMatrix);
    const px = vp.x + (_v.x * .5 + .5) * vp.z, py = vp.y + (_v.y * .5 + .5) * vp.w;
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    y0 = Math.min(y0, py);
    y1 = Math.max(y1, py);
  };
  for (let i = 0; i < 8; i++) if (_esq[i].z <= cerca) proyectar(_esq[i]);
  for (let i = 0; i < 8; i++) for (const bit of [ 1, 2, 4 ]) {
    if (i & bit) continue;
    const A = _esq[i], Bq = _esq[i | bit];
    if (A.z <= cerca === Bq.z <= cerca) continue;
    proyectar(_w.copy(A).lerp(Bq, (cerca - A.z) / (Bq.z - A.z)));
  }
  if (x0 === Infinity) return null;
  const cx = vp.x + vp.z / 2, mg = 2;
  let a = cx + (x0 - cx) * .75 - mg, b = cx + (x1 - cx) * .75 + mg;
  y0 -= mg;
  y1 += mg;
  a = Math.max(vp.x, Math.floor(a));
  b = Math.min(vp.x + vp.z, Math.ceil(b));
  y0 = Math.max(vp.y, Math.floor(y0));
  y1 = Math.min(vp.y + vp.w, Math.ceil(y1));
  if (b <= a || y1 <= y0) return null;
  return [ a, y0, b, y1 ];
}

function copiar(R, [x0, y0, x1, y1]) {
  const gl = R.getContext(), [w, h] = tamDestino(R);
  if (!E.rt || E.w !== w || E.h !== h) {
    E.rt?.dispose();
    E.rt = new THREE.WebGLRenderTarget(w, h, {
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false
    });
    R.initRenderTarget(E.rt);
    E.w = w;
    E.h = h;
    E.uniforms.tFondo.value = E.rt.texture;
    E.uniforms.uTam.value.set(w, h);
  }
  const P = R.properties.get(E.rt), destino = P.__webglFramebuffer, tx = R.properties.get(E.rt.texture).__webglTexture;
  if (!destino || !tx) return false;
  const rt = R.getRenderTarget(), lienzo = !rt;
  const dib = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING), lee = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
  const clave = (lienzo ? "lienzo" : rt.uuid) + ":" + w + "x" + h, revisar = !E.revisados.has(clave);
  const metodo = E.metodo.get(clave) || (lienzo ? "copia" : "blit");
  if (revisar) for (let i = 0; i < 8 && gl.getError() !== gl.NO_ERROR; i++) ;
  if (metodo === "copia") {
    const tex0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
    if (lee !== dib) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, dib);
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, x0, y0, x0, y0, x1 - x0, y1 - y0);
    gl.bindTexture(gl.TEXTURE_2D, tex0);
    if (lee !== dib) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, lee);
  } else {
    const tijera = gl.isEnabled(gl.SCISSOR_TEST);
    if (tijera) gl.disable(gl.SCISSOR_TEST);
    if (lee !== dib) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, dib);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destino);
    gl.blitFramebuffer(x0, y0, x1, y1, x0, y0, x1, y1, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dib);
    if (lee !== dib) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, lee);
    if (tijera) gl.enable(gl.SCISSOR_TEST);
  }
  E.stats.copias++;
  E.stats.pixeles += (x1 - x0) * (y1 - y0);
  if (revisar) {
    E.revisados.add(clave);
    const err = gl.getError();
    if (err !== gl.NO_ERROR && metodo === "blit") {
      E.revisados.delete(clave);
      E.metodo.set(clave, "copia");
      return false;
    }
    if (err !== gl.NO_ERROR) {
      E.error = true;
      for (const m of E.mats.values()) viejo(m);
      console.warn("kogaku: sin copia de la pantalla (error " + err + " en " + (lienzo ? "el lienzo" : "un render target") + "), camuflaje simple");
      return false;
    }
  }
  return true;
}
