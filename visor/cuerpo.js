// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { cargarAnims, clip as clipAnim } from "./anim.js";

export function agregarSombra(obj, opacidad = .58) {
  const u = {
    uPiso: {
      value: 0
    },
    uDir: {
      value: new THREE.Vector3(.2, -1, .15).normalize()
    }
  };
  const mat = new THREE.MeshBasicMaterial({
    color: 0,
    transparent: true,
    opacity: opacidad,
    depthWrite: false,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.EqualStencilFunc,
    stencilZPass: THREE.IncrementStencilOp,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uPiso = u.uPiso;
    sh.uniforms.uDir = u.uDir;
    sh.vertexShader = "uniform float uPiso;\nuniform vec3 uDir;\n" + sh.vertexShader.replace("#include <project_vertex>", `\n      vec4 wp = modelMatrix * vec4( transformed, 1.0 );\n      float k = max( 0.0, wp.y - uPiso ) / max( 0.3, -uDir.y );\n      wp.xyz += uDir * k; wp.y = uPiso + 0.02;\n      vec4 mvPosition = viewMatrix * wp;\n      gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => "sombra-planar";
  const mallas = [];
  obj.traverse(m => {
    if (!m.isMesh || m.userData.esSombra) return;
    const s = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, mat) : new THREE.Mesh(m.geometry, mat);
    if (m.isSkinnedMesh) {
      s.bind(m.skeleton, m.bindMatrix);
      s.bindMode = m.bindMode;
    }
    s.position.copy(m.position);
    s.quaternion.copy(m.quaternion);
    s.scale.copy(m.scale);
    s.frustumCulled = false;
    s.renderOrder = 1;
    s.userData.esSombra = s.userData.propio = s.userData.sinColision = true;
    mallas.push([ m.parent, s ]);
  });
  for (const [p, s] of mallas) p.add(s);
  return {
    obj: obj,
    u: u,
    mallas: mallas.map(x => x[1]),
    dir: u.uDir.value.clone()
  };
}

const _d = new THREE.Vector3, _p = new THREE.Vector3;

export function actualizarSombra(S, pisoY, luz, dt) {
  S.obj.getWorldPosition(_p);
  let obj = null;
  if (luz) {
    const x = _p.x * 1e3, y = _p.y * 1e3 + 1e3, z = _p.z * 1e3;
    let mejor = 1e18;
    for (const l of luz.luces) {
      const dx = x - l[0], dy = y - l[1], dz = z - l[2], e = l[4] * 1.3;
      if (Math.abs(dx) > e || Math.abs(dz) > e || dy > 400 || dy < -e) continue;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < mejor) {
        mejor = d2;
        obj = _d.set(dx, Math.min(dy, -300), dz);
      }
    }
    if (!obj && luz.main) obj = _d.set(luz.main[0][0], luz.main[0][1], luz.main[0][2]);
  }
  if (!obj) obj = _d.set(.25, -1, .15);
  obj.normalize();
  if (obj.y > -.45) {
    obj.y = -.45;
    obj.normalize();
  }
  S.dir.lerp(obj, Math.min(1, dt * 4)).normalize();
  S.u.uDir.value.copy(S.dir);
  S.u.uPiso.value = pisoY;
}

export function mostrarSombra(S, si) {
  for (const m of S.mallas) m.visible = si;
}

export const MAX_SOMBRAS = 4;

export const sombraU = {
  uSombraN: {
    value: 0
  },
  uSombraOn: {
    value: 1
  },
  uSombraDebug: {
    value: 0
  },
  uSombraTam: {
    value: new THREE.Vector2(1024, 1024)
  },
  uSombraRango: {
    value: 24.5
  },
  uSombraMatriz: {
    value: Array.from({
      length: MAX_SOMBRAS
    }, () => new THREE.Matrix4)
  },
  uSombraFuerza: {
    value: new Float32Array(MAX_SOMBRAS)
  },
  uSombraMap0: {
    value: null
  },
  uSombraMap1: {
    value: null
  },
  uSombraMap2: {
    value: null
  },
  uSombraMap3: {
    value: null
  }
};

const GLSL_SOMBRA = `\nfloat sombraLuz(sampler2D mapa, vec4 coord) {\n  vec3 sc = coord.xyz / coord.w;\n  if (sc.x <= 0.0 || sc.x >= 1.0 || sc.y <= 0.0 || sc.y >= 1.0 || sc.z >= 1.0) return 1.0;\n  vec2 tx = 1.0 / uSombraTam; float z = sc.z - 0.0012;\n  float bloq = 0.0, nb = 0.0, d;\n  d = unpackRGBAToDepth(textureLod(mapa, sc.xy + vec2(-1.5, -1.5) * tx, 0.0)); if (d < z) { bloq += d; nb += 1.0; }\n  d = unpackRGBAToDepth(textureLod(mapa, sc.xy + vec2( 1.5, -1.5) * tx, 0.0)); if (d < z) { bloq += d; nb += 1.0; }\n  d = unpackRGBAToDepth(textureLod(mapa, sc.xy + vec2(-1.5,  1.5) * tx, 0.0)); if (d < z) { bloq += d; nb += 1.0; }\n  d = unpackRGBAToDepth(textureLod(mapa, sc.xy + vec2( 1.5,  1.5) * tx, 0.0)); if (d < z) { bloq += d; nb += 1.0; }\n  if (nb < 0.5) return 1.0;                                  // nada tapa la luz acá (lo más común: sale enseguida)\n  float dist = (z - bloq / nb) * uSombraRango;               // metros entre el cuerpo y la superficie que recibe\n  float r = clamp(0.7 + dist * 2.2, 0.7, 4.0);               // penumbra\n  float luz = 0.0;\n  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++)\n    luz += step(z, unpackRGBAToDepth(textureLod(mapa, sc.xy + vec2(float(i), float(j)) * tx * r, 0.0)));\n  luz /= 9.0;\n  float alcance = 1.0 - smoothstep(1.0, 2.4, dist);          // no atraviesa: se apaga lejos del cuerpo\n  return mix(1.0, luz, alcance * (1.0 - 0.35 * smoothstep(0.2, 1.4, dist)));\n}`;

export function recibirSombra(mat) {
  if (mat.userData.recibeSombra) return;
  mat.userData.recibeSombra = true;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, sombraU);
    sh.vertexShader = "uniform mat4 uSombraMatriz[4];\nvarying vec4 vSombraCoord[4];\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n{ vec4 wpS = modelMatrix * vec4( transformed, 1.0 ); for (int i = 0; i < 4; i++) vSombraCoord[i] = uSombraMatriz[i] * wpS; }");
    const declS = `\nuniform int uSombraN;\nuniform float uSombraOn;\nuniform float uSombraDebug;\nuniform vec2 uSombraTam;\nuniform float uSombraRango;\nuniform float uSombraFuerza[4];\nuniform sampler2D uSombraMap0;\nuniform sampler2D uSombraMap1;\nuniform sampler2D uSombraMap2;\nuniform sampler2D uSombraMap3;\nvarying vec4 vSombraCoord[4];\n${GLSL_SOMBRA}\n`;
    const fs = sh.fragmentShader.includes("#include <packing>") ? sh.fragmentShader.replace("#include <packing>", "#include <packing>" + declS) : "#include <packing>" + declS + sh.fragmentShader;
    sh.fragmentShader = fs.replace("#include <opaque_fragment>", `\n      if (uSombraOn > 0.5 && uSombraN > 0) {\n        float fS = 1.0;\n        fS *= 1.0 - uSombraFuerza[0] * (1.0 - sombraLuz(uSombraMap0, vSombraCoord[0]));\n        if (uSombraN > 1) fS *= 1.0 - uSombraFuerza[1] * (1.0 - sombraLuz(uSombraMap1, vSombraCoord[1]));\n        if (uSombraN > 2) fS *= 1.0 - uSombraFuerza[2] * (1.0 - sombraLuz(uSombraMap2, vSombraCoord[2]));\n        if (uSombraN > 3) fS *= 1.0 - uSombraFuerza[3] * (1.0 - sombraLuz(uSombraMap3, vSombraCoord[3]));\n        if (uSombraDebug > 0.5) outgoingLight = vec3(vSombraCoord[0].xy / vSombraCoord[0].w, fS); else outgoingLight *= fS;\n      }\n      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => "recibe-sombra5";
  mat.needsUpdate = true;
}

export class Sombras {
  constructor(renderer, scene, tam) {
    this.R = renderer;
    this.scene = scene;
    this.tam = tam;
    sombraU.uSombraTam.value.set(tam, tam);
    this.rts = [];
    this.cams = [];
    for (let k = 0; k < MAX_SOMBRAS; k++) {
      this.rts.push(new THREE.WebGLRenderTarget(tam, tam, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        generateMipmaps: false
      }));
      const c = new THREE.OrthographicCamera(-5, 5, 5, -5, .5, 25);
      c.layers.set(2);
      this.cams.push(c);
    }
    this.depth = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking
    });
    this.bias = (new THREE.Matrix4).set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
    this.color = new THREE.Color;
  }
  render(casters) {
    const R = this.R, scene = this.scene, n = Math.min(MAX_SOMBRAS, casters.length);
    sombraU.uSombraN.value = n;
    if (!n) return;
    const fondo = scene.background, override = scene.overrideMaterial, rt = R.getRenderTarget(), xr = R.xr.enabled, autoClear = R.autoClear;
    R.getClearColor(this.color);
    const alfa = R.getClearAlpha();
    scene.background = null;
    scene.overrideMaterial = this.depth;
    R.xr.enabled = false;
    R.setClearColor(16777215, 1);
    R.autoClear = true;
    for (let k = 0; k < n; k++) {
      const c = casters[k], cam = this.cams[k];
      cam.position.copy(c.centro).addScaledVector(c.dir, -10);
      if (Math.abs(c.dir.y) > .99) cam.up.set(1, 0, 0); else cam.up.set(0, 1, 0);
      cam.lookAt(c.centro);
      cam.updateMatrixWorld(true);
      R.setRenderTarget(this.rts[k]);
      R.render(scene, cam);
      sombraU.uSombraMatriz.value[k].copy(this.bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
      sombraU["uSombraMap" + k].value = this.rts[k].texture;
      sombraU.uSombraFuerza.value[k] = c.fuerza;
    }
    scene.background = fondo;
    scene.overrideMaterial = override;
    R.xr.enabled = xr;
    R.setRenderTarget(rt);
    R.setClearColor(this.color, alfa);
    R.autoClear = autoClear;
  }
}

const _lam = new THREE.Vector3, _obj = new THREE.Vector3;

export function luzDePersonaje(estado, centro, luz, dirBase, dt, tapada = null) {
  let mejor = null, mc = 0;
  if (luz) {
    const x = centro.x * 1e3, y = centro.y * 1e3, z = centro.z * 1e3, cand = [];
    for (const l of luz.luces) {
      const dx = x - l[0], dy = y - l[1], dz = z - l[2], e = l[4];
      if (dx < -e || dx > e || dy < -e || dy > e || dz < -e || dz > e) continue;
      const d = Math.hypot(dx, dy, dz) || 1, c = Math.max(l[5], l[6], l[7]) / 255 * Math.max(0, 2 * l[3] - d) / l[3];
      if (c > 0) cand.push([ c, l ]);
    }
    cand.sort((a, b) => b[0] - a[0]);
    for (const [c, l] of cand.slice(0, 4)) {
      if (tapada) {
        _lam.set(l[0] * .001, l[1] * .001, l[2] * .001);
        if (tapada(_lam, centro)) continue;
      }
      mc = c;
      mejor = l;
      break;
    }
  }
  if (mejor) {
    _lam.set(mejor[0] * .001, mejor[1] * .001, mejor[2] * .001);
    _obj.subVectors(centro, _lam);
    if (_obj.lengthSq() < 1e-6) _obj.set(0, -1, 0);
    _obj.normalize();
    if (_obj.y > -.3) {
      _obj.y = -.3;
      _obj.normalize();
    }
  } else _obj.copy(dirBase);
  const fuerza = mejor ? .3 + .45 * Math.min(1, mc / .6) : .4;
  if (!estado.dir) {
    estado.dir = _obj.clone();
    estado.fuerza = fuerza;
  } else {
    estado.dir.lerp(_obj, Math.min(1, dt * 4)).normalize();
    estado.fuerza += (fuerza - estado.fuerza) * Math.min(1, dt * 4);
  }
  return estado;
}

export function ocultarCuerpo(C, oculto) {
  C.oculto = oculto;
  C.obj.traverse(m => {
    if (m.userData.cuerpo) {
      m.material.colorWrite = !oculto;
      m.material.depthWrite = !oculto;
    }
  });
}

export function prepararCuerpo(o) {
  o.traverse(m => {
    if (m.isMesh) {
      m.frustumCulled = false;
      m.userData.sinColision = true;
      m.userData.cuerpo = true;
    }
  });
  return o;
}

const STILL = {
  ninguna: [ 2, 6, 16, 22, 26, 129, 88, 89 ],
  socom: [ 0, 0, 15, 22, 25, 31, 40, 41 ],
  famas: [ 1, 5, 15, 22, 25, 31, 40, 41 ],
  granada: [ 3, 3, 16, 22, 26, 129, 88, 89 ],
  c4: [ 90, 90, 16, 22, 43, 53, 88, 89 ],
  nikita: [ 76, 76, 78, 85, 25, 87, 40, 41 ],
  claymore: [ 95, 95, 99, 100, 26, 102, 88, 89 ]
};

const MOVE = {
  ninguna: [ 12, 82, 19, 23, 24, 29, 30, 12 ],
  socom: [ 10, 8, 17, 23, 24, 27, 28, 80 ],
  famas: [ 11, 9, 18, 23, 24, 27, 28, 73 ],
  nikita: [ 75, 77, 79, 23, 24, 27, 28, 75 ],
  c4: [ 92, 91, 93, 23, 24, 29, 30, 92 ],
  claymore: [ 97, 96, 98, 101, 24, 29, 30, 97 ],
  granada: [ 104, 103, 19, 23, 24, 29, 30, 104 ]
};

const ATTACK = {
  ninguna: [ 136, 136, 35, 136, 36 ],
  socom: [ 42, 51, 35, 45, 47 ],
  famas: [ 5, 52, 34, 46, 48 ],
  stinger: [ 74, 136, 136, 136, 105 ],
  nikita: [ 74, 136, 34, 46, 81 ],
  c4: [ 43, 136, 35, 136, 53 ],
  claymore: [ 57, 136, 35, 136, 58 ],
  granada: [ 60, 136, 35, 136, 50 ],
  psg1: [ 44, 136, 136, 136, 136 ]
};

const PACK = [ [ "socom", "socom", "socom" ], [ "famas", "famas", "famas" ], [ "granada", "granada", "granada" ], [ "nikita", "nikita", "nikita" ], [ "famas", "famas", "stinger" ], [ "claymore", "claymore", "claymore" ], [ "c4", "c4", "c4" ], [ "granada", "granada", "granada" ], [ "granada", "granada", "granada" ], [ "ninguna", "ninguna", "psg1" ] ];

const SIN_ARMA = [ "ninguna", "ninguna", "ninguna" ];

const C4_PONER = {
  pared: 56,
  guardia: 49
};

const CON_GESTO = new Set([ "granada", "c4", "claymore", "nikita", "stinger" ]);

const TRANS = {
  tierra: 20,
  pararse: 84
};

const MUERTE = {
  parado: 128,
  tierra: 125
};

export const AVANCE = {
  12: 3.25,
  82: .78,
  10: 3.45,
  8: .72,
  11: 3.45,
  9: .72,
  73: 3.45,
  80: 3.45,
  75: 3.45,
  77: .67,
  92: 3.45,
  91: .52,
  97: 3.45,
  96: .72,
  104: 3.45,
  103: .62,
  17: 2.74,
  18: 2.74,
  19: 2.74,
  79: 2.74,
  93: 2.74,
  98: 2.74,
  23: .78,
  24: .78,
  101: .78,
  27: .68,
  28: .68,
  29: .75,
  30: .75
};

const FUNDIDO = interp => (interp + 1) / 30;

export function packSnake(armaId) {
  const p = armaId >= 0 && PACK[armaId] ? PACK[armaId] : SIN_ARMA;
  return {
    still: STILL[p[0]],
    move: MOVE[p[1]],
    attack: ATTACK[p[2]]
  };
}

const IDX_MOVE = {
  correr: 0,
  arrancar: 1,
  agachado: 2,
  reptar: 3,
  reptarAtras: 4,
  paredD: 5,
  paredI: 6,
  alerta: 7
};

export function velSnake(armaId, k) {
  return AVANCE[packSnake(armaId).move[IDX_MOVE[k] ?? 0]] ?? 3.45;
}

const TORSO = /^hueso_[1-9]\.quaternion$/;

function accionTorso(C, nombre) {
  C.torso ||= {};
  if (nombre in C.torso) return C.torso[nombre];
  if (!C.datos) return null;
  const c = clipAnim(C.datos, nombre);
  C.torso[nombre] = null;
  if (!c) return null;
  c.tracks = c.tracks.filter(t => TORSO.test(t.name));
  c.name = nombre + " (torso)";
  const a = C.an.mx.clipAction(c);
  a.setEffectiveWeight(0);
  a.play();
  a.userData = {
    f: 0
  };
  return C.torso[nombre] = a;
}

function actualizarTorso(C, nombre, una, interp, dt) {
  const nueva = nombre ? accionTorso(C, nombre) : null;
  if (nueva && C.torsoActual !== nombre) {
    nueva.reset();
    nueva.setLoop(una ? THREE.LoopOnce : THREE.LoopRepeat);
    nueva.clampWhenFinished = una;
    nueva.play();
    nueva.userData.f = C.torsoActual ? nueva.userData.f : 0;
  }
  C.torsoActual = nueva ? nombre : null;
  for (const a of Object.values(C.torso || {})) {
    if (!a) continue;
    const obj = a === nueva ? 1 : 0, paso = dt / FUNDIDO(interp);
    a.userData.f = obj > a.userData.f ? Math.min(obj, a.userData.f + paso) : Math.max(obj, a.userData.f - paso);
    const f = a.userData.f;
    a.setEffectiveWeight(f >= .98 ? 50 : f / (1 - f));
  }
}

function gestoArma(G, at, st, w, cuadros) {
  const ok = x => x && x !== 136, pk = PACK[w]?.[2], f = G.t * 30;
  let n = 0, una = true, interp = 4;
  switch (G.tipo) {
   case "mantiene":
    if (pk !== "granada") return null;
    n = f < cuadros(at[0]) ? at[0] : st[0];
    una = n === at[0];
    interp = n === at[0] ? 4 : 1;
    break;

   case "tira":
    if (pk !== "granada") return null;
    n = at[4];
    interp = 1;
    break;

   case "pone":
    n = pk === "c4" ? C4_PONER.pared : pk === "claymore" ? at[4] : 0;
    interp = 1;
    break;

   case "poneGuardia":
    n = pk === "c4" ? C4_PONER.guardia : 0;
    break;

   case "lanza":
    n = pk === "nikita" || pk === "stinger" ? at[4] : 0;
    break;

   case "rafaga":
    if (pk !== "famas") return null;
    n = at[4];
    una = false;
    interp = 2;
    break;

   default:
    return null;
  }
  if (!ok(n) || !cuadros(n)) return null;
  if (una && G.tipo !== "mantiene" && f >= cuadros(n)) return null;
  return {
    n: n,
    una: una,
    interp: interp
  };
}

export function animarCuerpo(C, {pos: pos, yaw: yaw, vel: vel, agachado: agachado, postura: postura = null, arma: arma = true, armaId: armaId = null, alerta: alerta = false, pared: pared = null, golpePared: golpePared = null, muerte: muerte = false, atras: atras = false, reversa: reversa = false, forzado: forzado = null, dt: dt, visible: visible, detras: detras = .08, apunta: apunta = false, disparo: disparo = false, recargando: recargando = false, golpe: golpe = false, reaccion: reaccion = null, parpadeo: parpadeo = false, caja: caja = false, armaAnim: armaAnim = null}) {
  C.obj.position.set(pos.x + Math.sin(yaw) * detras, pos.y, pos.z + Math.cos(yaw) * detras);
  C.obj.rotation.y = yaw + Math.PI;
  if (C.oculto !== !visible) ocultarCuerpo(C, !visible);
  {
    const ver = !(visible && (parpadeo || caja));
    if (C.obj.visible !== ver) C.obj.visible = ver;
  }
  if (!C.datos && !C.pidioDatos) {
    C.pidioDatos = true;
    cargarAnims("snake").then(d => {
      C.datos = d;
    }).catch(() => {});
  }
  const post = postura ?? (agachado ? 1 : 0), quieto = vel < .15, ahora = C.reloj = (C.reloj || 0) + dt;
  const w = armaId ?? (arma ? 0 : -1), P = packSnake(w), st = P.still, mv = P.move, at = P.attack;
  const cuadros = n => C.datos?.clips?.[`anim ${n}`]?.cuadros || 0;
  if (C.postPrev !== undefined && post !== C.postPrev) {
    const n = post === 2 ? TRANS.tierra : C.postPrev === 2 && post === 0 ? TRANS.pararse : 0;
    C.trans = n && cuadros(n) ? {
      n: n,
      hasta: ahora + cuadros(n) / 30
    } : null;
  } else if (post === 0 && !pared && !quieto && C.quietoPrev && !C.trans && cuadros(mv[1])) C.trans = {
    n: mv[1],
    hasta: ahora + cuadros(mv[1]) / 30,
    arranque: true
  };
  if (C.trans && (ahora >= C.trans.hasta || pared || muerte || C.trans.arranque && (quieto || post !== 0))) C.trans = null;
  C.postPrev = post;
  C.quietoPrev = quieto;
  let n, unaVez = false, interp = 4;
  if (muerte) {
    n = post === 2 ? MUERTE.tierra : MUERTE.parado;
    unaVez = true;
  } else if (golpePared) {
    n = golpePared === "i" ? st[7] : st[6];
    unaVez = true;
  } else if (pared) n = quieto ? post === 1 ? st[5] : st[4] : pared.lado < 0 ? mv[6] : mv[5]; else if (C.trans) {
    n = C.trans.n;
    unaVez = !C.trans.arranque;
  } else if (post === 2) n = quieto ? st[3] : atras ? mv[4] : mv[3]; else if (post === 1) n = quieto ? st[2] : mv[2]; else n = quieto ? st[alerta ? 1 : 0] : mv[alerta ? 7 : 0];
  let nombre = `anim ${n}`, torso = null, torsoUna = false;
  if (forzado && !muerte) {
    nombre = forzado;
    unaVez = true;
  } else if (reaccion && !muerte) {
    nombre = reaccion.clip;
    unaVez = !!reaccion.unaVez;
  }
  const ok = x => x && x !== 136;
  const libre = !muerte && !golpePared && !pared && !forzado && !reaccion && !C.trans;
  if (libre && golpe && ok(at[2])) {
    nombre = `anim ${at[2]}`;
    unaVez = true;
    interp = 1;
  } else if (libre && w >= 0 && post === 0 && armaAnim?.tipo && gestoArma(armaAnim, at, st, w, cuadros)) {
    const g = gestoArma(armaAnim, at, st, w, cuadros);
    interp = g.interp;
    if (quieto) {
      nombre = `anim ${g.n}`;
      unaVez = g.una;
    } else {
      torso = `anim ${g.n}`;
      torsoUna = g.una;
    }
  } else if (libre && w >= 0 && post === 0) {
    const disp = disparo && !(armaAnim !== null && CON_GESTO.has(PACK[w]?.[2]));
    if (disp && !C.disparoPrev && ok(at[4])) C.ataque = {
      n: at[4],
      hasta: ahora + Math.max(7, cuadros(at[4])) / 30
    };
    if (C.ataque && ahora >= C.ataque.hasta) C.ataque = null;
    const t = recargando && ok(at[1]) ? at[1] : (disp || C.ataque) && ok(at[4]) ? at[4] : apunta && ok(at[0]) ? at[0] : 0;
    if (t) {
      interp = t === at[4] ? 2 : 4;
      if (quieto) {
        nombre = `anim ${t}`;
        unaVez = t !== at[0];
      } else {
        torso = `anim ${t}`;
        torsoUna = t !== at[0];
      }
    }
  }
  C.disparoPrev = disparo;
  const a = C.an.tocar(nombre, {
    fundido: FUNDIDO(interp),
    loop: !unaVez
  });
  const av = nombre === `anim ${n}` ? AVANCE[n] : 0;
  if (a) a.timeScale = !unaVez && !quieto && av ? Math.max(.3, Math.min(1.6, vel / av)) : 1;
  if (a && reversa && !unaVez && !quieto && post !== 2) a.timeScale = -a.timeScale;
  actualizarTorso(C, torso, torsoUna, interp, dt);
  C.clip = nombre;
  C.accion = a;
}

let texBrillo = null;

function texturaBrillo() {
  if (texBrillo) return texBrillo;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(.18, "rgba(255,255,255,0.55)");
  g.addColorStop(.5, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  texBrillo = new THREE.CanvasTexture(c);
  texBrillo.colorSpace = THREE.SRGBColorSpace;
  return texBrillo;
}

export function crearBrillos(lista, padre) {
  const out = [];
  for (const b of lista || []) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaBrillo(),
      color: (new THREE.Color).setRGB(b[3] / 255, b[4] / 255, b[5] / 255, THREE.SRGBColorSpace),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: .3,
      fog: false
    }));
    s.position.set(b[0] / 1e3, b[1] / 1e3, b[2] / 1e3);
    s.userData.propio = s.userData.sinColision = true;
    s.renderOrder = 3;
    s.userData.tam = b[6] / 1e3;
    s.scale.setScalar(s.userData.tam);
    padre.add(s);
    out.push(s);
  }
  return out;
}

const _c = new THREE.Vector3, _f = new THREE.Vector3, _v = new THREE.Vector3;

export function actualizarBrillos(lista, cam) {
  if (!lista.length) return;
  cam.getWorldPosition(_c);
  cam.getWorldDirection(_f);
  for (const s of lista) {
    _v.subVectors(s.position, _c);
    const d = _v.length();
    _v.divideScalar(d || 1);
    const frente = Math.max(0, _v.dot(_f)), lejos = THREE.MathUtils.clamp(1 - (d - 14) / 22, 0, 1);
    s.material.opacity = (.18 + Math.pow(frente, 10) * .8) * lejos;
    s.scale.setScalar(s.userData.tam * (1 + Math.pow(frente, 16) * 1.6));
    s.visible = lejos > 0;
  }
}

export async function precalentar(R, escena, cam) {
  const t0 = performance.now(), texturas = new Set;
  escena.traverse(o => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [ o.material ] : [];
    for (const m of ms) for (const k of [ "map", "alphaMap", "emissiveMap", "lightMap" ]) if (m[k]?.isTexture && m[k].image) texturas.add(m[k]);
  });
  for (const t of texturas) {
    try {
      R.initTexture(t);
    } catch {}
  }
  try {
    const mats = R.compile(escena, cam);
    if (mats?.forEach) await new Promise(listo => {
      const mirar = () => {
        mats.forEach(m => {
          const pr = R.properties.get(m)?.currentProgram;
          if (!pr || pr.isReady()) mats.delete(m);
        });
        if (mats.size === 0 || performance.now() - t0 > 1e4) listo(); else setTimeout(mirar, 10);
      };
      mirar();
    });
  } catch {}
  return {
    ms: Math.round(performance.now() - t0),
    texturas: texturas.size,
    programas: R.info.programs?.length ?? 0
  };
}
