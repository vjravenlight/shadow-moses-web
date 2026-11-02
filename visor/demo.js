// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { cargadorCompartido, texturaCompartida } from "./cargador.js";

import { dibujarTelop } from "./telops.js";

import { MiraScope, FILTRO_ANTIPARRAS, histogramaProfundidad } from "./mira_scope.js";

import * as ctl from "./controles.js";

export const FPS = 30;

const ANG = Math.PI * 2 / 4096, MM = .001;

export const ALTO_PROY = 112 * 64 / 58;

export const ASPECTO = 160 / ALTO_PROY;

export const SIGNO_ROLL = -1;

const ORDEN_RAIZ = "YXZ";

const ORDEN_HUESO = "ZYX";

const BARRA_ARRIBA = 24, BARRA_ABAJO = 40;

const ALTO_FILAS = 224;

const EF = {
  FADEIN: 3,
  FADEOUT: 4,
  TEXT: 5,
  SHADOW: 14,
  MESSAGE: 16,
  SCOPE: 19,
  DARKVISIBLEGOGGLE: 20,
  IRRAYSGOGGLE: 21,
  SEPIA: 27,
  UNSHAPEVIEW: 29,
  GUSMASK: 30,
  STOP: 31,
  BLUR: 34,
  MONOTONE: 36,
  MI24HIND: 38,
  PADVIBRATION: 54,
  PADVIBRATION2: 64,
  GHOST: 65,
  TEXT2: 74
};

const VISORES = [ EF.SCOPE, EF.DARKVISIBLEGOGGLE, EF.IRRAYSGOGGLE, EF.GUSMASK ];

const CONMUTABLES = new Set([ EF.SEPIA, EF.UNSHAPEVIEW, EF.BLUR, EF.MONOTONE, EF.GHOST ]);

const SILENCIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

let audioEl = null, audioDesbloqueado = false;

function elementoAudio() {
  if (!audioEl) {
    audioEl = new Audio;
    audioEl.preload = "auto";
    audioEl.playsInline = true;
    audioEl.setAttribute("playsinline", "");
  }
  return audioEl;
}

function alGesto() {
  const a = elementoAudio(), d = a._dueño;
  if (d && d._audioPendiente && d.activa) {
    d._reengancharAudio();
    audioDesbloqueado = true;
    return;
  }
  if (audioDesbloqueado) return;
  audioDesbloqueado = true;
  try {
    if (!d) a.src = SILENCIO;
    const p = a.play();
    if (p) p.then(() => {
      if (!(a._dueño && a._dueño._sonando)) a.pause();
    }).catch(() => {
      audioDesbloqueado = false;
    });
  } catch {
    audioDesbloqueado = false;
  }
}

if (typeof window !== "undefined") for (const ev of [ "pointerdown", "keydown", "touchend" ]) window.addEventListener(ev, alGesto, {
  capture: true,
  passive: true
});

async function bajarCuadros(url, n, stride, alProgreso) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`cuadros.bin ${r.status}`);
  let buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 31 && buf[1] === 139) {
    if (typeof DecompressionStream === "function") {
      const s = new Blob([ buf ]).stream().pipeThrough(new DecompressionStream("gzip"));
      buf = new Uint8Array(await new Response(s).arrayBuffer());
    } else {
      const {gunzipSync: gunzipSync} = await (import("three/addons/libs/fflate.module.js"));
      buf = gunzipSync(buf);
    }
  }
  const total = n * stride;
  if (buf.byteLength < total * 2) throw new Error(`cuadros.bin trae ${buf.byteLength} bytes, esperaba ${total * 2}`);
  const d = new Int16Array(buf.buffer, buf.byteOffset, total).slice();
  const TANDA = 400;
  for (let f = 1; f < n; f += TANDA) {
    const fin = Math.min(n, f + TANDA);
    for (let i = f; i < fin; i++) {
      const o = i * stride, p = o - stride;
      for (let k = 0; k < stride; k++) d[o + k] += d[p + k];
    }
    alProgreso?.(fin / n);
    if (fin < n) await new Promise(res => setTimeout(res, 0));
  }
  return d;
}

let _gltf = null;

const _cachePropia = new Map;

async function cargadorPropio(base) {
  if (!_gltf) {
    const [{GLTFLoader: GLTFLoader}, SkeletonUtils] = await Promise.all([ import("three/addons/loaders/GLTFLoader.js"), import("three/addons/utils/SkeletonUtils.js") ]);
    _gltf = {
      loader: new GLTFLoader,
      clonar: SkeletonUtils.clone
    };
  }
  return async url => {
    const comp = cargadorCompartido();
    if (comp) return comp(url);
    if (!_cachePropia.has(url)) {
      _cachePropia.set(url, _gltf.loader.loadAsync(base + url).then(g => {
        prepararMateriales(g.scene);
        return g;
      }).catch(e => {
        _cachePropia.delete(url);
        throw e;
      }));
    }
    return _gltf.clonar((await _cachePropia.get(url)).scene);
  };
}

export function prepararMateriales(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = !o.isSkinnedMesh;
    const m = o.material, t = /_t(\d)$/.exec(m.name || "")?.[1], conLuz = !!o.geometry.attributes.color;
    if (m.map) {
      m.map.magFilter = m.map.minFilter = THREE.NearestFilter;
      m.map.needsUpdate = true;
    }
    if (t != null) {
      m.transparent = true;
      m.depthWrite = false;
      m.alphaTest = t === "0" ? .02 : .5;
    }
    if (t === "1" || t === "3") m.blending = THREE.AdditiveBlending;
    if (t === "2") m.blending = THREE.SubtractiveBlending;
    if (conLuz) {
      o.material = new THREE.MeshBasicMaterial({
        map: m.map,
        color: new THREE.Color(2, 2, 2).multiply(m.color),
        vertexColors: true,
        alphaTest: m.alphaTest,
        side: m.side,
        transparent: m.transparent,
        depthWrite: m.depthWrite,
        blending: m.blending
      });
    }
  });
}

const VERT_PANTALLA = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

function matFundido(blanco) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uShade: {
        value: 0
      }
    },
    vertexShader: VERT_PANTALLA,
    fragmentShader: "uniform float uShade; void main(){ gl_FragColor = vec4(vec3(uShade), 1.0); }",
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: blanco ? THREE.AddEquation : THREE.ReverseSubtractEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor
  });
}

function matSombra(tex, rgb) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: {
        value: tex
      },
      k: {
        value: new THREE.Vector3(rgb[0] / 128, rgb[1] / 128, rgb[2] / 128)
      }
    },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D map; uniform vec3 k; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(max(t.rgb - vec3(0.035), vec3(0.0)) * t.a * k, 1.0); }",
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.ReverseSubtractEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

export class Demo {
  constructor(o = {}) {
    this.sceneHost = o.scene || null;
    this.cargarHost = o.cargar || null;
    this.overlayPadre = o.overlay || null;
    this.alMensaje = o.alMensaje || null;
    this.pisoEn = o.pisoEn || null;
    this.alCrearModelo = o.alCrearModelo || null;
    this.base = o.base ?? "assets/";
    this.encuadre = o.encuadre || "juego";
    this.barras = o.barras !== false;
    this.volumen = o.volumen ?? 1;
    this.vibrar = o.vibrar !== false;
    this.unaCara = o.unaCara !== false;
    this.unaCaraPersonajes = !!o.unaCaraPersonajes;
    this.camara = new THREE.PerspectiveCamera(50, ASPECTO, .05, 3e3);
    this.camara.name = "camara_demo";
    this.info = null;
    this.datos = null;
    this.n = 0;
    this.stride = 0;
    this.estado = "vacia";
    this.activa = false;
    this.pausada = false;
    this.cuadro = 0;
    this.tiempo = 0;
    this.verbose = false;
    this.modelos = [];
    this.grupo = null;
    this.escena = null;
    this.propia = null;
    this.tiempos = {};
    this.avisados = new Set;
    this._ui = null;
    this._caja = null;
    this._teclas = null;
    this._pad = false;
    this._camOrto = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._quad = new THREE.PlaneGeometry(2, 2);
    this._matNegro = matFundido(false);
    this._matBlanco = matFundido(true);
    this._escenaFundido = new THREE.Scene;
    this._mallaFundido = new THREE.Mesh(this._quad, this._matNegro);
    this._mallaFundido.frustumCulled = false;
    this._escenaFundido.add(this._mallaFundido);
    this._texSombra = null;
    this._rt = null;
  }
  async preparar(sector, op = {}) {
    if (this.info) this.destruir();
    const t0 = performance.now();
    this.estado = "cargando";
    this.sector = sector;
    this.aguaNivel = null;
    const dir = `${this.base}demos/${sector}/`;
    this._armarUI();
    this._mostrarCarga(true);
    const prog = {
      json: 0,
      cuadros: 0,
      modelos: 0,
      audio: 0
    };
    const avisar = txt => {
      const f = prog.json * .05 + prog.cuadros * .15 + prog.modelos * .5 + prog.audio * .3;
      this.progreso = f;
      op.alProgreso?.(f, txt);
      this._textoCarga(f);
    };
    this.progreso = 0;
    const info = await fetch(dir + "demo.json").then(r => {
      if (!r.ok) throw new Error(`demo ${sector}: demo.json ${r.status}`);
      return r.json();
    });
    if (info.version !== 2) throw new Error(`demo ${sector}: demo.json viejo (versión ${info.version}); reexportar con tools/demos_export.py`);
    prog.json = 1;
    avisar("datos");
    this.info = info;
    this.n = info.n_cuadros;
    this.stride = info.cuadros.stride;
    this.dir = dir;
    const usarPropia = !this.sceneHost || op.contexto !== null && op.contexto !== undefined;
    const contexto = op.contexto === undefined ? info.contexto : op.contexto;
    const conMapas = op.mapas ?? usarPropia;
    if (usarPropia) {
      const e = new THREE.Scene;
      e.background = new THREE.Color(0);
      e.add(new THREE.HemisphereLight(15660287, 3820094, 2));
      const sol = new THREE.DirectionalLight(16777215, 1.6);
      sol.position.set(3, 8, 5);
      e.add(sol);
      this.propia = e;
      this.escena = e;
    } else {
      this.propia = null;
      this.escena = this.sceneHost;
    }
    const grupo = new THREE.Group;
    grupo.name = `demo_${sector}`;
    grupo.visible = false;
    this.escena.add(grupo);
    this.grupo = grupo;
    const cargar = this.cargarHost || await cargadorPropio(this.base);
    const pCuadros = bajarCuadros(dir + info.cuadros.archivo, this.n, this.stride, f => {
      prog.cuadros = f;
      avisar("cuadros");
    }).then(d => {
      this.datos = d;
      this.tiempos.cuadros = performance.now() - t0;
    });
    const pAudio = this._prepararAudio(dir, () => {
      prog.audio = 1;
      avisar("audio");
    });
    let hechos = 0;
    const lista = info.modelos.filter(m => m.glb && m.visible_cuadros > 0);
    const total = lista.length + (conMapas ? info.mapas.filter(m => m.glb).length : 0) || 1;
    const uno = () => {
      prog.modelos = ++hechos / total;
      avisar("modelos");
    };
    this.modelos = info.modelos.map(m => ({
      info: m,
      raiz: null,
      huesos: [],
      offset: m.offset,
      n: m.huesos
    }));
    const pModelos = info.modelos.map(async (m, i) => {
      const raiz = new THREE.Group;
      raiz.name = `demo_${m.nombre}_${m.tipo}`;
      raiz.rotation.order = ORDEN_RAIZ;
      raiz.visible = false;
      const M = this.modelos[i];
      M.raiz = raiz;
      grupo.add(raiz);
      if (!m.glb || !m.visible_cuadros) return;
      let o;
      try {
        o = await cargar(m.glb);
      } catch (e) {
        console.warn(`demo ${sector}: no cargó ${m.glb}`, e.message);
        uno();
        return;
      }
      const huesos = [];
      for (let j = 0; j < m.huesos; j++) huesos.push(o.getObjectByName(`hueso_${j}`) || null);
      if (!huesos[0] && m.huesos >= 1) {
        const h0 = new THREE.Group;
        h0.name = "hueso_0";
        h0.position.set(m.t0[0], m.t0[1], m.t0[2]);
        o.position.set(-m.t0[0], -m.t0[1], -m.t0[2]);
        h0.add(o);
        raiz.add(h0);
        huesos[0] = h0;
      } else raiz.add(o);
      for (const h of huesos) if (h) h.rotation.order = ORDEN_HUESO;
      const faltan = huesos.filter(h => !h).length;
      if (faltan && this.verbose) console.warn(`demo ${sector}: ${m.nombre} sin ${faltan} de ${m.huesos} huesos en el glb`);
      M.huesos = huesos;
      M.obj = o;
      M.esHind = m.nombre === "hind" || m.nombre === "hinddemo";
      this.alCrearModelo?.(o, m);
      uno();
    });
    const pMapas = conMapas ? info.mapas.filter(m => m.glb).map(async m => {
      try {
        const o = await cargar(m.glb);
        o.name = `mapa_${m.nombre}`;
        grupo.add(o);
      } catch (e) {
        console.warn("demo: mapa", m.glb, e.message);
      }
      uno();
    }) : [];
    const pContexto = usarPropia && contexto ? this._cargarContexto(contexto, cargar, conMapas ? info.mapas.map(m => m.glb) : []) : Promise.resolve();
    const pSombra = info.efectos.some(e => e.tipo === EF.SHADOW) ? (() => {
      const t = texturaCompartida(this.base + "demos/comun/shadow.png", {
        mag: THREE.LinearFilter,
        min: THREE.LinearFilter,
        colorSpace: THREE.NoColorSpace
      });
      return t.userData.listo.then(() => {
        if (t.image) this._texSombra = t;
      });
    })() : null;
    await Promise.all([ pCuadros, ...pModelos, ...pMapas, pContexto, pSombra ]);
    this.tiempos.modelos = performance.now() - t0;
    await pAudio;
    this.tiempos.total = performance.now() - t0;
    this._porCuadro = new Map;
    for (const tr of info.efectos) for (let c = tr.c0; c <= tr.c1; c++) {
      let l = this._porCuadro.get(c);
      if (!l) this._porCuadro.set(c, l = []);
      l.push(tr);
    }
    this.subtitulos = info.subtitulos || [];
    this._reiniciarEfectos();
    this.estado = "lista";
    this._mostrarCarga(false);
    this.aplicarCuadro(1);
    return info;
  }
  async _cargarContexto(st, cargar, yaEnDemo) {
    let nv;
    try {
      nv = await fetch(`${this.base}niveles/${st}/nivel.json`).then(r => r.ok ? r.json() : null);
    } catch {
      nv = null;
    }
    if (!nv) return;
    this.aguaNivel = nv.actores || [];
    const v3 = p => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);
    const vis = (nv.visibles?.length ? nv.visibles : [ nv.principal ]).map(id => nv.mapas.find(m => m.id === id)).filter(Boolean);
    const piezas = [ ...new Set(vis.flatMap(m => m.piezas || [])) ].filter(p => !yaEnDemo.includes(p));
    const tareas = piezas.map(async p => {
      try {
        this.grupo.add(await cargar(p));
      } catch {}
    });
    this._pisos = [];
    for (const f of [ ...new Set(vis.flatMap(m => m.hzm_json || [])) ]) tareas.push(fetch(this.base + f).then(r => r.json()).then(h => {
      for (const g of h.grupos || []) for (const q of g.pisos || []) this._pisos.push(q.puntos.map(p => [ p[0] * MM, p[1] * MM, p[2] * MM ]));
    }).catch(() => {}));
    let cielo = null, nieve = null;
    for (const a of nv.actores || []) {
      if (a.evento || a.t) continue;
      if ((a.tipo === "SPHERE" || a.tipo === "SPHERE2") && a.cielo?.img && !cielo) cielo = a;
      if ((a.tipo === "SNOW" || a.tipo === "SNOWAREA") && !nieve) nieve = a;
      if (!a.modelo) continue;
      if (a.tipo === "PUT_OBJECT") {
        for (const ins of a.instancias || []) tareas.push(cargar(a.modelo).then(o => {
          o.position.copy(v3(ins.p));
          o.rotation.set(ins.d[0] * ANG, ins.d[1] * ANG, ins.d[2] * ANG, "YXZ");
          this.grupo.add(o);
        }).catch(() => {}));
      } else if ((a.tipo === "WALL" || a.tipo === "DOOR") && a.p) {
        tareas.push(cargar(a.modelo).then(o => {
          o.position.copy(v3(a.p));
          if (a.d) o.rotation.set(a.d[0] * ANG, a.d[1] * ANG, a.d[2] * ANG, "YXZ");
          this.grupo.add(o);
        }).catch(() => {}));
      }
    }
    if (cielo || nieve) {
      tareas.push((async () => {
        try {
          const {Dinamicos: Dinamicos} = await (import("./nivel.js"));
          const din = new Dinamicos({
            scene: this.propia,
            mundo: this.grupo,
            cam: this.camara,
            paredes: []
          });
          if (cielo) din.ponerCielo(cielo.cielo, await (new THREE.TextureLoader).loadAsync(this.base + cielo.cielo.img));
          if (nieve) din.ponerNieve(nieve);
          this._din = din;
        } catch (e) {
          console.warn("demo: sin cielo/nieve", e.message);
        }
      })());
    }
    if (nv.juego?.fondo && this.propia) this.propia.background = new THREE.Color(`rgb(${nv.juego.fondo.map(x => Math.max(0, Math.min(255, x))).join(",")})`);
    await Promise.all(tareas);
  }
  _prepararAudio(dir, listo) {
    const au = this.info.audio;
    this._audioOk = false;
    if (!au?.archivo) {
      listo();
      return Promise.resolve();
    }
    const a = elementoAudio();
    if (a._dueño && a._dueño !== this) a._dueño._soltarAudio();
    a._dueño = this;
    this._audio = a;
    a.pause();
    a.src = dir + au.archivo;
    a.volume = Math.max(0, Math.min(1, this.volumen));
    a.load();
    return new Promise(res => {
      let fin = false;
      const ok = bien => {
        if (fin) return;
        fin = true;
        clearTimeout(t);
        a.removeEventListener("canplay", h1);
        a.removeEventListener("error", h2);
        this._audioOk = bien;
        listo();
        res();
      };
      let otra = false;
      const h1 = () => ok(true), h2 = () => {
        if (!otra && !fin) {
          otra = true;
          const s = a.src;
          a.removeAttribute("src");
          a.load();
          a.src = s;
          a.load();
          return;
        }
        console.warn(`demo ${this.sector}: el audio no carga`);
        ok(false);
      };
      const t = setTimeout(() => ok(true), 3e3);
      a.addEventListener("canplay", h1);
      a.addEventListener("error", h2);
      if (a.readyState >= 3) ok(true);
    });
  }
  _reengancharAudio() {
    const a = this._audio;
    if (!a || a._dueño !== this) return;
    this._audioPendiente = false;
    this._sonando = true;
    try {
      a.currentTime = Math.min(this.tiempo, Math.max(0, (a.duration || 1e9) - .05));
    } catch {}
    a.play().then(() => {
      this._conAudio = true;
      this._relojAudio = true;
    }).catch(() => {
      this._sonando = false;
    });
  }
  _reintentarAudio() {
    const a = this._audio;
    if (!a || a._dueño !== this || this._reintento || !this.activa) return;
    this._reintento = true;
    const src = a.src;
    a.removeAttribute("src");
    a.load();
    a.src = src.split("#")[0];
    a.load();
    const listo = () => {
      a.removeEventListener("canplay", listo);
      if (!this.activa || this._salida || a._dueño !== this) return;
      try {
        a.currentTime = Math.min(this.tiempo, Math.max(0, (a.duration || 1e9) - .05));
      } catch {}
      this._sonando = true;
      a.play().then(() => {
        this._conAudio = true;
        this._relojAudio = true;
        this._ultimaTa = -1;
        this._sinAvance = 0;
      }).catch(() => {
        this._sonando = false;
      });
    };
    a.addEventListener("canplay", listo);
  }
  _soltarAudio() {
    const a = this._audio;
    if (!a) return;
    if (a._dueño === this) {
      try {
        a.pause();
      } catch {}
      a._dueño = null;
    }
    this._audio = null;
    this._audioOk = false;
  }
  reproducir({alTerminar: alTerminar = null, sinAudio: sinAudio = false} = {}) {
    if (!this.info || !this.datos) throw new Error("demo: llamá a preparar() antes");
    this.alTerminar = alTerminar;
    this.activa = true;
    this.pausada = false;
    this.tiempo = 0;
    this.cuadro = 0;
    this._hecho = 0;
    this._salida = null;
    this._reiniciarEfectos();
    this.grupo.visible = true;
    this.estado = "reproduciendo";
    this._conAudio = !sinAudio && !!this._audio && this._audioOk;
    this._relojAudio = false;
    this._audioPendiente = false;
    this._esperaAudio = 0;
    this._sinAvance = 0;
    this._ultimaTa = -1;
    this._reintento = false;
    if (this._conAudio) {
      const a = this._audio;
      try {
        if (a.currentTime > 0) a.currentTime = 0;
      } catch {}
      this._sonando = true;
      const p = a.play();
      if (p) p.then(() => {
        this._relojAudio = true;
      }).catch(e => {
        console.warn("demo: el audio no arrancó (" + e.name + "); sigue sin sonido hasta el próximo toque");
        this._conAudio = false;
        this._audioPendiente = e.name === "NotAllowedError";
        this._sonando = false;
        if (e.name !== "NotAllowedError") this._reintentarAudio();
      }); else this._relojAudio = true;
    }
    this._engancharEntrada(true);
    this._mostrarAyuda();
    this.update(0);
  }
  jugar(sector, op = {}) {
    return new Promise((res, rej) => {
      this.preparar(sector, op).then(() => this.reproducir({
        alTerminar: res,
        sinAudio: op.sinAudio
      })).catch(rej);
    });
  }
  saltear() {
    if (!this.activa || this._salida) return;
    this._sonando = false;
    this._salida = {
      t: 0,
      dur: 256 / 8 / FPS
    };
    try {
      this._audio?.pause();
    } catch {}
    this.estado = "saliendo";
  }
  pausar(si = true) {
    if (!this.activa) return;
    this.pausada = si;
    const a = this._audio;
    if (a && this._conAudio) {
      if (si) a.pause(); else a.play().catch(() => {});
    }
  }
  irA(cuadro) {
    if (!this.info || !this.datos) return;
    try {
      this._audio?.pause();
    } catch {}
    this._sonando = false;
    this._conAudio = false;
    this.grupo.visible = true;
    this.activa = true;
    this.pausada = true;
    this.estado = "reproduciendo";
    const c = Math.max(1, Math.min(this.n, Math.round(cuadro)));
    this._reiniciarEfectos();
    for (let f = 1; f <= c; f++) this._pasoCuadro(f);
    this._hecho = c;
    this.tiempo = (c - 1) / FPS;
    this.aplicarCuadro(c);
    this._dibujarOverlay(c, this.tiempo + .5 / FPS);
  }
  detener() {
    try {
      this._audio?.pause();
    } catch {}
    this._sonando = false;
    this._audioPendiente = false;
    this.activa = false;
    this.pausada = false;
    this._salida = null;
    if (this.estado !== "vacia") this.estado = this.info ? "lista" : "vacia";
    if (this.grupo) this.grupo.visible = false;
    this._engancharEntrada(false);
    this._reiniciarEfectos();
    this._limpiarOverlay();
    this._filtroCanvas("");
  }
  destruir() {
    this.detener();
    this._soltarAudio();
    if (this.grupo) {
      this.grupo.parent?.remove(this.grupo);
      this.grupo = null;
    }
    this._din?.destruir();
    this._din = null;
    this.modelos = [];
    this.datos = null;
    this.info = null;
    this.propia = null;
    this.escena = null;
    this._pisos = null;
    this.estado = "vacia";
  }
  liberar() {
    this.destruir();
    this._ui?.raiz.remove();
    this._ui = null;
    this._rt?.a.dispose();
    this._rt?.b.dispose();
    this._rt = null;
  }
  update(dt) {
    if (!this.activa || !this.info) return;
    if (this._salida) {
      this._salida.t += dt;
      this._dibujarOverlay(this.cuadro, this.tiempo);
      if (this._salida.t >= this._salida.dur) this._terminar(true);
      return;
    }
    this._leerPad();
    if (!this.pausada) this._avanzarReloj(dt);
    let c = Math.floor(this.tiempo * FPS) + 1;
    if (c > this.n) {
      const durAudio = this._conAudio ? this._audio?.duration || 0 : 0;
      const fin = !this._conAudio || this._audio.ended || this.tiempo >= durAudio - .02 || this.tiempo > this.n / FPS + 1.5;
      c = this.n;
      if (fin && !this.pausada) {
        for (let f = this._hecho + 1; f <= c; f++) this._pasoCuadro(f);
        this._hecho = c;
        this.aplicarCuadro(c);
        this._dibujarOverlay(c, this.tiempo);
        this._terminar(false);
        return;
      }
    }
    for (let f = this._hecho + 1; f <= c; f++) this._pasoCuadro(f);
    if (c > this._hecho) this._hecho = c;
    this.aplicarCuadro(c);
    this._din?.update(dt, {
      jugador: this.camara.position,
      guardias: [],
      vivo: () => false
    });
    this._dibujarOverlay(c, this.tiempo);
  }
  _avanzarReloj(dt) {
    const a = this._audio;
    if (this._conAudio && a) {
      if (!this._relojAudio) return;
      if (a.ended) {
        this._conAudio = false;
        this._sonando = false;
        this.tiempo = Math.max(this.tiempo, a.duration || 0) + dt;
        return;
      }
      if (a.paused || a.readyState < 3) {
        if (a.paused && !this.pausada && !document.hidden) a.play().catch(() => {});
        this._esperando = true;
        this._mostrarCarga(true);
        this._esperaAudio += dt;
        if (this._esperaAudio > 6) {
          console.warn("demo: el audio no avanza; sigue sin sonido");
          this._conAudio = false;
          this._sonando = false;
          try {
            a.pause();
          } catch {}
          this._esperando = false;
          this._mostrarCarga(false);
        }
        return;
      }
      this._esperaAudio = 0;
      if (this._esperando) {
        this._esperando = false;
        this._mostrarCarga(false);
      }
      const ta = a.currentTime;
      if (ta === this._ultimaTa) this._sinAvance = (this._sinAvance || 0) + dt; else {
        this._sinAvance = 0;
        this._ultimaTa = ta;
      }
      if (this._sinAvance > 4) {
        console.warn("demo: el audio no avanza; sigue sin sonido");
        this._conAudio = false;
        this._sonando = false;
        try {
          a.pause();
        } catch {}
        this.tiempo += dt;
        return;
      }
      if (ta <= 0 && this.tiempo < .5) return;
      let t = this.tiempo + dt;
      const err = ta - t;
      if (Math.abs(err) > .2) t = ta; else t += err * .2;
      this.tiempo = Math.max(this.tiempo, t);
    } else this.tiempo += dt;
  }
  _terminar(salteada) {
    const cb = this.alTerminar;
    this.alTerminar = null;
    const negro = salteada || this._fundidoFinal() >= .99;
    this.detener();
    this.ultimoFinal = {
      salteada: salteada,
      negro: negro,
      cuadro: this.cuadro
    };
    cb?.({
      salteada: salteada,
      negro: negro
    });
  }
  aplicarCuadro(c) {
    const d = this.datos, o = (c - 1) * this.stride;
    if (!d || o < 0 || o + this.stride > d.length) return;
    this.cuadro = c;
    const cam = this.camara;
    const ex = d[o] * MM, ey = d[o + 1] * MM, ez = d[o + 2] * MM, cx = d[o + 3] * MM, cy = d[o + 4] * MM, cz = d[o + 5] * MM;
    const roll = d[o + 6] * ANG, clip = d[o + 7] || 320;
    cam.position.set(ex, ey, ez);
    cam.up.set(0, 1, 0);
    if (Math.abs(cx - ex) + Math.abs(cy - ey) + Math.abs(cz - ez) > 1e-6) cam.lookAt(cx, cy, cz);
    if (roll) cam.rotateZ(SIGNO_ROLL * roll);
    const fov = 2 * Math.atan(ALTO_PROY / clip) * 180 / Math.PI;
    if (Math.abs(cam.fov - fov) > 1e-4) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    for (const m of this.modelos) {
      if (!m.raiz) continue;
      const p = o + m.offset;
      const vis = d[p] !== 0 && m.huesos.length > 0;
      m.raiz.visible = vis;
      if (!vis) continue;
      m.raiz.rotation.set(d[p + 1] * ANG, d[p + 2] * ANG, d[p + 3] * ANG, ORDEN_RAIZ);
      m.raiz.position.set(d[p + 4] * MM, d[p + 5] * MM, d[p + 6] * MM);
      for (let j = 0; j < m.n; j++) {
        const h = m.huesos[j];
        if (!h) continue;
        const q = p + 7 + j * 3;
        h.rotation.set(d[q] * ANG, d[q + 1] * ANG, d[q + 2] * ANG, ORDEN_HUESO);
      }
      if (m.esHind) {
        if (m.huesos[1]) m.huesos[1].rotation.y = this._hind.a1 * ANG;
        if (m.huesos[2]) m.huesos[2].rotation.x = this._hind.a2 * ANG;
      }
    }
    this._actualizarSombras(c);
  }
  _reiniciarEfectos() {
    for (const s of this._sombras || []) s.malla?.parent?.remove(s.malla);
    this._nodos = new Map;
    this._fundidos = [];
    this._telops = [];
    this._sombras = [];
    this._conm = {};
    this._hind = {
      v1: 0,
      v2: 0,
      a1: 0,
      a2: 0
    };
    this._visor = null;
    this._mira?.reiniciar();
  }
  get miraHud() {
    return this._mira?.visible ? this._mira : null;
  }
  get filtroAntiparras() {
    const a = this._visor;
    if (!a?.vivo || !this.activa) return null;
    if (a.tipo === EF.DARKVISIBLEGOGGLE) return a.k > 2 ? "nvg" : null;
    if (a.tipo === EF.IRRAYSGOGGLE) return a.k > 3 ? "termica" : null;
    return null;
  }
  _pasoCuadro(f) {
    for (const nd of this._nodos.values()) nd.usado = false;
    for (const tr of this._porCuadro?.get(f) || []) {
      const nd = this._nodos.get(tr.id);
      if (nd) {
        nd.usado = true;
        continue;
      }
      const nuevo = {
        tr: tr,
        usado: true,
        actor: null
      };
      this._nodos.set(tr.id, nuevo);
      this._nuevoEfecto(tr, nuevo, f);
    }
    for (const [id, nd] of this._nodos) if (!nd.usado && !(nd.actor && nd.actor.vivo)) this._nodos.delete(id);
    for (const a of this._fundidos) {
      a.k += 1;
      if (a.entra && a.k > a.total) a.vivo = false;
    }
    this._fundidos = this._fundidos.filter(a => a.vivo);
    const V = this._visor;
    if (V?.vivo) {
      V.k++;
      if (V.tipo === EF.SCOPE) this._mira?.paso({
        activo: true,
        zoom: 320,
        sinPad: true,
        angulo: 0
      });
    } else if (this._mira?.activo) this._mira.reiniciar();
    for (const t of this._telops) this._pasoTelop(t);
    this._telops = this._telops.filter(t => t.estado < 4);
    this._sombras = this._sombras.filter(s => {
      if (!s.vivo) s.malla?.parent?.remove(s.malla);
      return s.vivo;
    });
    const H = this._hind;
    H.a1 = ((H.a1 - H.v1) % 4096 + 4096) % 4096;
    H.a2 = ((H.a2 - H.v2) % 4096 + 4096) % 4096;
  }
  _matarTipo(tipo) {
    for (const nd of this._nodos.values()) if (nd.tr.tipo === tipo && nd.actor) {
      nd.actor.vivo = false;
      nd.actor = null;
    }
    if (CONMUTABLES.has(tipo)) this._conm[tipo] = null;
  }
  _nuevoEfecto(tr, nd, f) {
    const d = tr.d || {};
    switch (tr.tipo) {
     case EF.FADEIN:
     case EF.FADEOUT:
      {
        this._matarTipo(EF.FADEOUT);
        const a = {
          tipo: "fade",
          entra: tr.tipo === EF.FADEIN,
          blanco: !!d.blanco,
          total: Math.max(1, d.cuadros || 1),
          k: 0,
          vivo: true
        };
        this._fundidos.push(a);
        if (!a.entra) nd.actor = a;
        break;
      }

     case EF.TEXT:
     case EF.TEXT2:
      {
        const hex = h => (h ?? 0).toString(16).padStart(4, "0");
        const tex = this.info.texturas?.[hex(d.tex)];
        const tex2 = d.tex2 != null && d.tex2 !== d.tex ? this.info.texturas?.[hex(d.tex2)] : null;
        this._telops.push({
          estado: 0,
          timer: 0,
          reload: (d.reload || 0) - 16,
          shade: 0,
          visible: false,
          x: d.x || 0,
          y: d.y || 0,
          png: tex?.png || null,
          w: tex?.w || 0,
          h: tex?.h || 0,
          png2: tex2?.png || null,
          w2: tex2?.w || 0,
          h2: tex2?.h || 0
        });
        break;
      }

     case EF.MESSAGE:
      if (this.alMensaje) this.alMensaje(d.destino, (d.mensaje || []).filter(v => v), f); else if (this.verbose) console.log(`demo: MESSAGE #${(d.destino || 0).toString(16)} ${(d.mensaje || []).filter(v => v).map(v => "#" + (v & 65535).toString(16)).join(" ")}`);
      break;

     case EF.STOP:
      for (const n2 of this._nodos.values()) if (n2.actor) {
        n2.actor.vivo = false;
        n2.actor = null;
      }
      for (const k of Object.keys(this._conm)) this._conm[k] = null;
      break;

     case EF.SHADOW:
      {
        const idx = this.modelos.findIndex(m => m.info.tipo === d.modelo);
        if (idx < 0) break;
        for (const n2 of this._nodos.values()) if (n2.tr.tipo === EF.SHADOW && n2.tr.d?.modelo === d.modelo && n2.actor) {
          n2.actor.vivo = false;
          n2.actor = null;
        }
        if (!d.sacar) {
          const s = {
            tipo: "sombra",
            modelo: idx,
            huesos: d.huesos || [ 0, 0, 0, 0 ],
            rgb: d.rgb || [ 72, 72, 72 ],
            vivo: true,
            malla: null
          };
          this._sombras.push(s);
          nd.actor = s;
        }
        break;
      }

     case EF.BLUR:
     case EF.GHOST:
     case EF.MONOTONE:
     case EF.SEPIA:
     case EF.UNSHAPEVIEW:
      {
        this._matarTipo(tr.tipo);
        if (d.prender) {
          const a = {
            tipo: tr.n,
            vivo: true,
            d: d
          };
          nd.actor = a;
          this._conm[tr.tipo] = a;
        }
        break;
      }

     case EF.MI24HIND:
      {
        const q = tr.p || [];
        this._hind.v1 = (q[0] || 0) & 65535 | (q[1] || 0) << 16;
        this._hind.v2 = (q[2] || 0) & 65535 | (q[3] || 0) << 16;
        break;
      }

     case EF.SCOPE:
     case EF.DARKVISIBLEGOGGLE:
     case EF.IRRAYSGOGGLE:
      {
        for (const t of VISORES) this._matarTipo(t);
        this._visor = null;
        if ((tr.p?.[0] ?? 0) === 1) break;
        const a = {
          tipo: tr.tipo,
          vivo: true,
          k: 0,
          conHud: !!tr.p?.[1]
        };
        nd.actor = a;
        this._visor = a;
        if (tr.tipo === EF.SCOPE) {
          this._mira ||= new MiraScope({
            base: this.base,
            lienzo: false
          });
          this._mira.reiniciar();
        }
        if (a.conHud && this.verbose) console.log(`demo: ${tr.n} con NewGoggleSight (sin implementar)`);
        break;
      }

     case EF.PADVIBRATION:
     case EF.PADVIBRATION2:
      if (this.vibrar && (d.v1 || d.v2) && this.activa && !this.pausada && puedeVibrar() && performance.now() - (this._tVib || 0) > 250) {
        this._tVib = performance.now();
        try {
          navigator.vibrate(d.v2 ? Math.min(400, d.v2 * 4) : 60);
        } catch {}
      }
      break;

     default:
      if (this.verbose && !this.avisados.has(tr.tipo)) {
        this.avisados.add(tr.tipo);
        console.log(`demo: efecto ${tr.n} (${tr.tipo}) sin implementar`);
      }
    }
  }
  _pasoTelop(t) {
    switch (t.estado) {
     case 0:
      t.timer -= 2;
      if (t.timer <= 0) {
        t.timer = 16;
        t.shade = 0;
        t.visible = true;
        t.estado = 1;
      }
      break;

     case 1:
      t.timer--;
      t.shade = Math.min(t.shade + 8, 128);
      if (t.timer <= 0) {
        t.timer = t.reload * 2;
        t.estado = 2;
      }
      break;

     case 2:
      t.timer -= 2;
      if (t.timer <= 0) {
        t.timer = 16;
        t.shade = 128;
        t.estado = 3;
      }
      break;

     case 3:
      t.timer--;
      t.shade = Math.max(t.shade - 8, 0);
      if (t.timer <= 0) {
        t.visible = false;
        t.estado = 4;
      }
      break;

     default:
      break;
    }
  }
  _actualizarSombras(c) {
    if (!this._sombras?.length || !this._texSombra) return;
    const P = [ new THREE.Vector3, new THREE.Vector3, new THREE.Vector3, new THREE.Vector3 ];
    for (const s of this._sombras) {
      const M = this.modelos[s.modelo];
      if (!s.malla) {
        const g = new THREE.BufferGeometry;
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
        g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([ 0, 1, 1, 1, 0, 0, 1, 0 ]), 2));
        g.setIndex([ 0, 2, 1, 1, 2, 3 ]);
        s.malla = new THREE.Mesh(g, matSombra(this._texSombra, s.rgb));
        s.malla.frustumCulled = false;
        s.malla.renderOrder = 3;
        s.malla.rotation.order = "YXZ";
        this.grupo.add(s.malla);
      }
      const vis = M?.raiz?.visible;
      s.malla.visible = !!vis;
      if (!vis) continue;
      M.raiz.updateMatrixWorld(true);
      for (let i = 0; i < 4; i++) {
        const h = M.huesos[s.huesos[i]] || M.huesos[0];
        (h || M.raiz).getWorldPosition(P[i]);
        P[i].y = 0;
      }
      const yaw = M.raiz.rotation.y;
      const xs = [], zs = [];
      for (let i = 1; i < 4; i++) {
        const dx = P[0].x - P[i].x, dz = P[0].z - P[i].z, dist = Math.hypot(dx, dz);
        const dir = Math.atan2(dx, dz) - yaw;
        xs.push(dist * Math.sin(dir));
        zs.push(dist * Math.cos(dir));
      }
      let x = (Math.max(...xs) - Math.min(...xs)) / 2, z = (Math.max(...zs) - Math.min(...zs)) / 2;
      let z0, z1;
      if (z > .5) {
        x += .1;
        z0 = .01 - z;
        z1 = z + .05;
      } else {
        x += .2;
        z += .2;
        z0 = -z;
        z1 = z;
      }
      const pos = s.malla.geometry.attributes.position.array;
      pos.set([ -x, 0, z0, x, 0, z0, -x, 0, z1, x, 0, z1 ]);
      s.malla.geometry.attributes.position.needsUpdate = true;
      const rx = M.raiz.position.x, rz = M.raiz.position.z;
      let piso = this.pisoEn?.(rx, M.raiz.position.y + .5, rz);
      if (piso == null) piso = this._pisoPropio(rx, M.raiz.position.y + .5, rz);
      if (piso == null || piso < M.raiz.position.y - 2.5) {
        let min = Infinity;
        const v = new THREE.Vector3;
        for (const h of M.huesos) if (h) {
          h.getWorldPosition(v);
          if (v.y < min) min = v.y;
        }
        piso = Number.isFinite(min) ? min - .08 : M.raiz.position.y;
      }
      s.malla.position.set(rx, piso + .012, rz);
      s.malla.rotation.set(0, yaw, 0);
    }
  }
  _pisoPropio(x, y, z) {
    if (!this._pisos?.length) return null;
    let mejor = null;
    for (const q of this._pisos) {
      const h = alturaEnCuad(q, x, z);
      if (h != null && h <= y + .05 && (mejor == null || h > mejor)) mejor = h;
    }
    return mejor;
  }
  _fundidoFinal() {
    let negro = 0;
    for (const a of this._fundidos || []) if (!a.blanco) {
      const s = Math.min(a.k, a.total) / a.total;
      negro = Math.max(negro, a.entra ? 1 - s : s);
    }
    return negro;
  }
  get modo() {
    return this.encuadre === "auto" ? "cine" : this.encuadre;
  }
  caja(W, H) {
    if (this.modo === "llenar" || this.modo === "cine") return {
      x: 0,
      y: 0,
      w: W,
      h: H
    };
    let w = W, h = W / ASPECTO;
    if (h > H) {
      h = H;
      w = H * ASPECTO;
    }
    w = Math.round(w);
    h = Math.round(h);
    return {
      x: Math.round((W - w) / 2),
      y: Math.round((H - h) / 2),
      w: w,
      h: h
    };
  }
  render(R) {
    const el = R.domElement, W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
    this._lienzo = el;
    if (!this.escena || !this.activa || !this.grupo) {
      const c = R.getClearColor(new THREE.Color), al = R.getClearAlpha(), tg = R.getRenderTarget();
      R.setRenderTarget(null);
      R.setClearColor(0, 1);
      R.clear();
      R.setClearColor(c, al);
      R.setRenderTarget(tg);
      return;
    }
    const b = this.caja(W, H);
    this._caja = b;
    const cam = this.camara;
    const asp = b.w / b.h, modo = this.modo;
    if (modo === "cine") {
      const anchoCuadro = 224 * ASPECTO, centro = (BARRA_ARRIBA + 224 - BARRA_ABAJO) / 2;
      let wW, hW, yT;
      const util = 224 - BARRA_ARRIBA - BARRA_ABAJO;
      if (asp >= anchoCuadro / util) {
        hW = util;
        yT = BARRA_ARRIBA;
        wW = asp * hW;
      } else {
        wW = anchoCuadro;
        hW = wW / asp;
        yT = centro - hW / 2;
      }
      const Hf = 2 * Math.max(112, 112 - yT, yT + hW - 112), fov = cam.fov;
      cam.fov = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * (Hf / 2) / 112) * 180 / Math.PI;
      cam.aspect = wW / Hf;
      cam.setViewOffset(wW, Hf, 0, Hf / 2 - 112 + yT, wW, hW);
      cam.updateProjectionMatrix();
      cam.fov = fov;
      this._ventana = {
        yT: yT,
        hW: hW
      };
    } else if (cam.view?.enabled) {
      cam.clearViewOffset();
    }
    if (modo === "cine") {} else if (modo === "llenar") {
      const fov = cam.fov, tanV = Math.tan(fov * Math.PI / 360);
      if (asp < ASPECTO) cam.fov = 2 * Math.atan(tanV * ASPECTO / asp) * 180 / Math.PI;
      cam.aspect = asp;
      cam.updateProjectionMatrix();
      cam.fov = fov;
    } else if (Math.abs(cam.aspect - asp) > 1e-4) {
      cam.aspect = asp;
      cam.updateProjectionMatrix();
    }
    const prev = {
      auto: R.autoClear,
      tijera: R.getScissorTest(),
      color: R.getClearColor(new THREE.Color),
      alfa: R.getClearAlpha(),
      vp: R.getViewport(new THREE.Vector4),
      sc: R.getScissor(new THREE.Vector4),
      target: R.getRenderTarget()
    };
    R.setRenderTarget(this._destino || null);
    R.setClearColor(0, 1);
    R.setScissorTest(false);
    R.setViewport(0, 0, W, H);
    R.clear();
    const yGL = H - b.y - b.h;
    R.setViewport(b.x, yGL, b.w, b.h);
    R.setScissor(b.x, yGL, b.w, b.h);
    R.setScissorTest(true);
    R.autoClear = false;
    if (this.propia) R.clear(); else {
      R.setClearColor(this.escena.background?.isColor ? this.escena.background : new THREE.Color(0), 1);
      R.clear();
    }
    const estela = this._conm[EF.GHOST] ? .62 : this._conm[EF.BLUR] ? .5 : 0;
    if (estela > 0 && this.activa) this._renderEstela(R, b, estela); else {
      this._rtListo = false;
      this._dibujarEscena(R);
    }
    for (const a of this._fundidos) {
      let s = Math.min(Math.max(a.k, 1), a.total) / a.total;
      if (a.entra) s = 1 - s;
      if (s <= 0) continue;
      const m = a.blanco ? this._matBlanco : this._matNegro;
      m.uniforms.uShade.value = s;
      this._mallaFundido.material = m;
      R.render(this._escenaFundido, this._camOrto);
    }
    if (this._salida) {
      const s = Math.min(1, this._salida.t / this._salida.dur);
      this._matNegro.uniforms.uShade.value = s;
      this._mallaFundido.material = this._matNegro;
      R.render(this._escenaFundido, this._camOrto);
    }
    R.autoClear = prev.auto;
    R.setScissorTest(prev.tijera);
    R.setScissor(prev.sc);
    R.setViewport(prev.vp);
    R.setClearColor(prev.color, prev.alfa);
    R.setRenderTarget(prev.target);
  }
  _dibujarEscena(R, camara = this.camara) {
    const cambiados = [];
    if (this.unaCara) {
      const vistos = new Set;
      this.escena.traverse(o => {
        if (!o.isMesh || o.isSkinnedMesh && !this.unaCaraPersonajes || !o.visible) return;
        for (const m of Array.isArray(o.material) ? o.material : [ o.material ]) {
          if (!m || vistos.has(m) || m.side !== THREE.DoubleSide || m.isShaderMaterial) continue;
          vistos.add(m);
          m.side = THREE.BackSide;
          cambiados.push(m);
        }
      });
    }
    R.render(this.escena, camara);
    for (const m of cambiados) m.side = THREE.DoubleSide;
  }
  _renderEstela(R, b, k) {
    const dpr = R.getPixelRatio(), w = Math.max(1, Math.round(b.w * dpr)), h = Math.max(1, Math.round(b.h * dpr));
    if (!this._rt || this._rt.w !== w || this._rt.h !== h) {
      this._rt?.a.dispose();
      this._rt?.b.dispose();
      this._rt = {
        a: new THREE.WebGLRenderTarget(w, h, {
          depthBuffer: true
        }),
        b: new THREE.WebGLRenderTarget(w, h, {
          depthBuffer: false
        }),
        w: w,
        h: h
      };
      this._matMezcla = new THREE.ShaderMaterial({
        uniforms: {
          map: {
            value: null
          },
          alfa: {
            value: 1
          }
        },
        vertexShader: VERT_PANTALLA,
        fragmentShader: "uniform sampler2D map; uniform float alfa; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb, alfa); }",
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.NormalBlending
      });
      this._matCopia = new THREE.ShaderMaterial({
        uniforms: {
          map: {
            value: null
          }
        },
        vertexShader: VERT_PANTALLA,
        fragmentShader: "uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0);\n#include <colorspace_fragment>\n}",
        depthTest: false,
        depthWrite: false
      });
      this._escenaQuad = new THREE.Scene;
      this._mallaQuad = new THREE.Mesh(this._quad, this._matCopia);
      this._mallaQuad.frustumCulled = false;
      this._escenaQuad.add(this._mallaQuad);
      this._rtListo = false;
    }
    const vp = R.getViewport(new THREE.Vector4);
    R.setScissorTest(false);
    R.setRenderTarget(this._rt.a);
    R.setClearColor(this.escena.background?.isColor ? this.escena.background : new THREE.Color(0), 1);
    R.clear();
    this._dibujarEscena(R);
    this._matMezcla.uniforms.map.value = this._rt.a.texture;
    this._matMezcla.uniforms.alfa.value = this._rtListo ? 1 - k : 1;
    this._mallaQuad.material = this._matMezcla;
    R.setRenderTarget(this._rt.b);
    R.render(this._escenaQuad, this._camOrto);
    this._rtListo = true;
    R.setRenderTarget(this._destino || null);
    R.setViewport(vp);
    R.setScissor(vp);
    R.setScissorTest(true);
    this._matCopia.uniforms.map.value = this._rt.b.texture;
    this._mallaQuad.material = this._matCopia;
    R.render(this._escenaQuad, this._camOrto);
  }
  _filtroCanvas(f) {
    const el = this._lienzo;
    if (!el) return;
    if (el.style.filter !== f) el.style.filter = f;
  }
  _armarUI() {
    if (this._ui || typeof document === "undefined") return;
    const raiz = document.createElement("div");
    raiz.className = "demo-capa";
    raiz.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:40;display:none;user-select:none;-webkit-user-select:none;touch-action:none;" + "text-transform:none;letter-spacing:normal;font-weight:normal;font-style:normal;text-align:left;";
    const cuadro = document.createElement("div");
    cuadro.style.cssText = "position:absolute;overflow:hidden;pointer-events:none;";
    const mk = (padre, css, txt) => {
      const d = document.createElement("div");
      d.style.cssText = css;
      if (txt) d.textContent = txt;
      padre.appendChild(d);
      return d;
    };
    const lienzoM = document.createElement("canvas");
    lienzoM.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;display:none;";
    cuadro.appendChild(lienzoM);
    const arriba = mk(cuadro, "position:absolute;left:0;right:0;top:0;background:#000;");
    const abajo = mk(cuadro, "position:absolute;left:0;right:0;bottom:0;background:#000;");
    const telops = mk(cuadro, "position:absolute;inset:0;");
    const lienzoT = document.createElement("canvas");
    lienzoT.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;";
    telops.appendChild(lienzoT);
    const sub = mk(cuadro, 'position:absolute;left:4%;right:4%;text-align:center;color:#e8e8e8;font-family:"Trebuchet MS",Verdana,Arial,sans-serif;' + "text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;white-space:pre-line;line-height:1.2;display:none;letter-spacing:.02em;");
    raiz.appendChild(cuadro);
    const carga = mk(raiz, "position:absolute;right:14px;bottom:12px;color:#9fd0a8;font:13px Consolas,monospace;display:none;text-shadow:0 0 3px #000;", "CARGANDO…");
    const ayuda = mk(raiz, "position:absolute;right:14px;top:12px;color:#cfe;font:12px Consolas,monospace;opacity:0;transition:opacity .6s;text-shadow:0 0 3px #000;");
    const boton = document.createElement("button");
    boton.textContent = "SALTEAR ▶▶";
    boton.style.cssText = "position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(14px + env(safe-area-inset-top));padding:10px 16px;font:bold 15px Consolas,monospace;color:#dfe;background:rgba(0,30,10,.75);" + "border:1px solid #6c9;border-radius:4px;pointer-events:auto;display:none;cursor:pointer;";
    boton.addEventListener("click", e => {
      e.stopPropagation();
      this.saltear();
    });
    raiz.appendChild(boton);
    raiz.addEventListener("pointerdown", e => {
      if (!this.activa || e.target === boton) return;
      boton.style.display = "block";
      clearTimeout(this._tBoton);
      this._tBoton = setTimeout(() => {
        boton.style.display = "none";
      }, 3500);
    });
    (this.overlayPadre || document.body).appendChild(raiz);
    this._ui = {
      raiz: raiz,
      cuadro: cuadro,
      arriba: arriba,
      abajo: abajo,
      telops: telops,
      lienzoT: lienzoT,
      lienzoM: lienzoM,
      sub: sub,
      carga: carga,
      ayuda: ayuda,
      boton: boton,
      imgs: new Map,
      caja: "",
      firmaT: "",
      firmaM: ""
    };
  }
  _mostrarCarga(si) {
    if (this._ui) {
      this._ui.raiz.style.display = "block";
      this._ui.carga.style.display = si ? "block" : "none";
    }
  }
  _textoCarga(f) {
    if (this._ui) this._ui.carga.textContent = `CARGANDO… ${Math.round(f * 100)}%`;
  }
  _mostrarAyuda() {
    const u = this._ui;
    if (!u) return;
    const tactil = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    u.ayuda.textContent = tactil ? "tocá la pantalla para saltear" : "Enter / Start: saltear";
    u.ayuda.style.opacity = .85;
    clearTimeout(this._tAyuda);
    this._tAyuda = setTimeout(() => {
      u.ayuda.style.opacity = 0;
    }, 3e3);
  }
  _engancharEntrada(si) {
    if (typeof window === "undefined") return;
    if (si && !this._teclas) {
      this._teclas = e => {
        if (!this.activa || this.pausada) return;
        if (e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Escape" || e.code === "Space") {
          e.preventDefault();
          e.stopPropagation();
          if (!e.repeat) this.saltear();
        }
      };
      window.addEventListener("keydown", this._teclas, {
        capture: true
      });
      this._visib = () => {
        if (!this.activa) return;
        if (document.hidden) {
          this._pausaVis = !this.pausada;
          if (this._pausaVis) this.pausar(true);
        } else if (this._pausaVis) {
          this._pausaVis = false;
          this.pausar(false);
        }
      };
      document.addEventListener("visibilitychange", this._visib);
      if (this._ui) this._ui.raiz.style.pointerEvents = "auto";
    } else if (!si && this._teclas) {
      window.removeEventListener("keydown", this._teclas, {
        capture: true
      });
      this._teclas = null;
      document.removeEventListener("visibilitychange", this._visib);
      this._visib = null;
      if (this._ui) {
        this._ui.raiz.style.pointerEvents = "none";
        this._ui.boton.style.display = "none";
      }
    }
  }
  _leerPad() {
    const p = ctl.mando();
    let apretado = false;
    if (p?.buttons) for (const i of [ ctl.B.CRUZ, ctl.B.SELECT, ctl.B.START ]) if (p.buttons[i]?.pressed) apretado = true;
    if (apretado && !this._pad && !this.pausada) this.saltear();
    this._pad = apretado;
  }
  _dibujarOverlay(c, t) {
    const u = this._ui;
    if (!u) return;
    u.raiz.style.display = "block";
    const antiparras = this.filtroAntiparras;
    this._filtroCanvas(antiparras ? FILTRO_ANTIPARRAS[antiparras] : this._conm[EF.MONOTONE] ? "grayscale(1)" : this._conm[EF.SEPIA] ? "sepia(0.9)" : "");
    const W = this._lienzo?.clientWidth || innerWidth, H = this._lienzo?.clientHeight || innerHeight;
    const b = this._caja || this.caja(W, H);
    const modo = this.modo, cine = modo === "cine", barras = this.barras && !cine;
    const clave = `${b.x},${b.y},${b.w},${b.h},${barras},${modo},${(this._ventana?.hW || 0).toFixed(1)}`;
    const vent = this._ventana || {
      yT: BARRA_ARRIBA,
      hW: 224 - BARRA_ARRIBA - BARRA_ABAJO
    };
    const sy = cine ? b.h / vent.hW : b.h / 224, oy = cine ? -vent.yT * sy : 0;
    if (u.caja !== clave) {
      u.caja = clave;
      Object.assign(u.cuadro.style, {
        left: b.x + "px",
        top: b.y + "px",
        width: b.w + "px",
        height: b.h + "px"
      });
      u.arriba.style.height = (barras ? Math.round(BARRA_ARRIBA * sy) : 0) + "px";
      u.abajo.style.height = (barras ? Math.round(BARRA_ABAJO * sy) : 0) + "px";
      const fs = cine ? Math.max(14, Math.min(Math.round(9.5 * sy * .8), Math.round(b.w / 34))) : Math.max(11, Math.round(9.5 * sy));
      u.sub.style.fontSize = fs + "px";
      u.sub.style.bottom = Math.round((cine ? 10 : 4) * sy * (cine ? .6 : 1)) + "px";
      u.sub.style.minHeight = (cine ? 0 : Math.round(32 * sy)) + "px";
      u.sub.style.textShadow = cine ? "0 0 3px #000, 0 0 6px #000, 1px 1px 0 #000" : "";
      u.sub.style.display = "none";
    }
    const gw = cine ? Math.min(b.w, 224 * sy * ASPECTO) : modo === "llenar" ? Math.min(b.w, b.h * ASPECTO) : b.w, gx = (b.w - gw) / 2;
    const tx = gw / 320;
    const dpr = Math.min(3, typeof devicePixelRatio === "number" && devicePixelRatio || 1);
    const LW = Math.max(1, Math.round(b.w * dpr)), LH = Math.max(1, Math.round(b.h * dpr)), cv = u.lienzoT;
    const img = png => {
      if (!png) return null;
      let i = u.imgs.get(png);
      if (!i) {
        i = new Image;
        i.src = this.base + png;
        u.imgs.set(png, i);
      }
      return i;
    };
    const vis = this._telops.filter(tl => tl.visible && tl.png);
    const firma = `${LW}x${LH}|${gx.toFixed(1)},${oy.toFixed(1)},${tx.toFixed(4)},${sy.toFixed(4)}|` + vis.map(tl => `${tl.png}${tl.png2 ? "+" + tl.png2 : ""}@${tl.x},${tl.y}:${Math.min(128, tl.shade)}:${img(tl.png).complete ? 1 : 0}`).join(";");
    if (firma !== u.firmaT) {
      u.firmaT = firma;
      if (cv.width !== LW || cv.height !== LH) {
        cv.width = LW;
        cv.height = LH;
      }
      const x = cv.getContext("2d");
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, LW, LH);
      for (const tl of vis) {
        dibujarTelop(x, tl.png, {
          x: (gx + tl.x * tx) * dpr,
          y: (oy + tl.y * sy) * dpr,
          kx: tx * dpr,
          ky: sy * dpr,
          alfa: Math.min(128, tl.shade) / 128,
          img: img(tl.png),
          w: tl.w,
          h: tl.h,
          sombra: tl.png2 || null,
          imgSombra: img(tl.png2),
          w2: tl.w2,
          h2: tl.h2
        });
      }
    }
    const mira = this.miraHud, cvM = u.lienzoM;
    if (mira || antiparras) {
      if (mira && (this._cuadroM = (this._cuadroM || 0) + 1) & 1) histogramaProfundidad(this.escena, this.camara, mira.barras);
      const Wu = Math.ceil(b.w / tx), Hu = Math.ceil(b.h / sy), ox = gx / tx, oyU = oy / sy;
      const fm = `${Wu}x${Hu}|${ox.toFixed(1)},${oyU.toFixed(1)}|${mira?.firma ?? ""}|${antiparras}`;
      if (fm !== u.firmaM) {
        u.firmaM = fm;
        if (cvM.width !== Wu || cvM.height !== Hu) {
          cvM.width = Wu;
          cvM.height = Hu;
        }
        const x = cvM.getContext("2d");
        x.setTransform(1, 0, 0, 1, 0, 0);
        x.clearRect(0, 0, Wu, Hu);
        x.imageSmoothingEnabled = false;
        if (mira) mira.pintar(x, ox, oyU, Wu, Hu);
        if (antiparras) {
          x.fillStyle = "rgba(0,0,0,0.25)";
          for (let y = Math.round(oyU), k = 0; k < ALTO_FILAS; y += 2, k += 2) if (y >= 0 && y < Hu) x.fillRect(0, y, Wu, 1);
        }
      }
      if (cvM.style.display !== "block") cvM.style.display = "block";
    } else if (cvM.style.display !== "none") {
      cvM.style.display = "none";
      u.firmaM = "";
    }
    const linea = this._salida ? null : this.subtitulos.find(l => t >= l.t && t < l.t + l.d);
    if (linea) {
      if (u.sub.textContent !== linea.texto) u.sub.textContent = linea.texto;
      u.sub.style.display = "flex";
      u.sub.style.alignItems = "flex-end";
      u.sub.style.justifyContent = "center";
    } else if (u.sub.style.display !== "none") u.sub.style.display = "none";
  }
  _limpiarOverlay() {
    const u = this._ui;
    if (!u) return;
    u.sub.style.display = "none";
    u.imgs.clear();
    u.firmaT = "";
    u.lienzoT.getContext("2d").clearRect(0, 0, u.lienzoT.width, u.lienzoT.height);
    u.raiz.style.display = "none";
    u.carga.style.display = "none";
    u.boton.style.display = "none";
    u.lienzoM.style.display = "none";
    u.firmaM = "";
    this._filtroCanvas("");
  }
  get ocupada() {
    return this.estado !== "vacia" || !!this._enCadena;
  }
  set lienzo(el) {
    this._lienzo = el;
  }
  get lienzo() {
    return this._lienzo;
  }
  proyectar() {
    const cam = this.camara;
    cam.updateMatrixWorld();
    const out = {
      cuadro: this.cuadro,
      t: +this.tiempo.toFixed(3),
      fov: +cam.fov.toFixed(2),
      aspect: +cam.aspect.toFixed(3),
      ojo: cam.position.toArray().map(v => +v.toFixed(3))
    };
    out.modelos = this.modelos.filter(m => m.raiz?.visible).map(m => {
      const p = new THREE.Vector3;
      m.raiz.getWorldPosition(p);
      const s = p.clone().project(cam);
      m.raiz.updateMatrixWorld(true);
      let minY = Infinity, maxY = -Infinity;
      const v = new THREE.Vector3;
      for (const h of m.huesos) if (h) {
        h.getWorldPosition(v);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
      return {
        nombre: m.info.nombre,
        tipo: m.info.tipo,
        raiz: p.toArray().map(x => +x.toFixed(3)),
        pantalla: [ +((s.x + 1) / 2 * 100).toFixed(1), +((1 - s.y) / 2 * 100).toFixed(1) ],
        enCuadro: Math.abs(s.x) <= 1 && Math.abs(s.y) <= 1 && s.z < 1,
        huesoMin_y: +minY.toFixed(3),
        huesoMax_y: +maxY.toFixed(3)
      };
    });
    return out;
  }
}

function puedeVibrar() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function" && navigator.userActivation?.hasBeenActive !== false && typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}

function alturaEnCuad(q, x, z) {
  for (const [a, b, c] of [ [ q[0], q[1], q[2] ], [ q[0], q[2], q[3] ] ]) {
    const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-9) continue;
    const l1 = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
    const l2 = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6) return l1 * a[1] + l2 * b[1] + l3 * c[1];
  }
  return null;
}

let _cadenas = null;

export function cargarCadenas(base = "assets/") {
  if (!_cadenas) _cadenas = fetch(base + "demos/cadenas.json").then(r => r.ok ? r.json() : null).catch(() => null);
  return _cadenas;
}

export async function reproducirPasos(demo, pasos, {enEscena: enEscena = () => false, alRadio: alRadio = null, alPaso: alPaso = null} = {}) {
  let salteadas = 0;
  demo._enCadena = true;
  for (const p of pasos) {
    if (p.radio != null) {
      if (alRadio) await alRadio(p.radio, p);
      continue;
    }
    if (p.demo == null) continue;
    alPaso?.(p);
    const host = enEscena(p.st);
    try {
      const r = await demo.jugar(p.demo, host ? {
        contexto: null,
        mapas: false
      } : {
        contexto: p.st
      });
      if (r?.salteada) salteadas++;
    } catch (e) {
      console.warn("demo", p.demo, e.message);
    }
  }
  demo._enCadena = false;
  demo.destruir();
  return {
    salteadas: salteadas
  };
}
