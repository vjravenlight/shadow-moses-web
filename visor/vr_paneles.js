// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { PAD } from "./inventario.js";

import { ASPECTO as ASPECTO_DEMO } from "./demo.js";

import { reemplazo, hashDeRuta, desplazamiento } from "./texturas_idioma.js";

const GRADO = Math.PI / 180;

const ANCHO_REF = 1.1, DIST_REF = 1.3;

export const metrosPorPixel = d => ANCHO_REF / 320 * (d / DIST_REF);

export const DISPOSICION = {
  centro: {
    dist: 1.3,
    umbral: 34 * GRADO,
    pitchMax: 22 * GRADO
  },
  cine: {
    dist: 3.2,
    ancho: 3.4,
    umbral: 45 * GRADO,
    pitchMax: 15 * GRADO
  },
  pantalla: {
    dist: 3,
    ancho: 3.6,
    umbral: 50 * GRADO,
    pitchFijo: -5 * GRADO
  },
  hud: {
    dist: 1,
    yaw: 0,
    pitch: -24 * GRADO
  },
  aviso: {
    dist: 1.1,
    yaw: 0,
    pitch: -14 * GRADO
  },
  arriba: {
    dist: 1.1,
    yaw: 0,
    pitch: 19 * GRADO
  },
  izq: {
    dist: 1,
    yaw: 27 * GRADO,
    pitch: -28 * GRADO
  },
  der: {
    dist: 1,
    yaw: -27 * GRADO,
    pitch: -28 * GRADO
  },
  subtitulo: {
    dist: 1.15,
    yaw: 0,
    pitch: -19 * GRADO
  },
  visera: {
    dist: 1
  }
};

export const MAPA_XR = {
  right: {
    1: "R2",
    3: "R1",
    4: "circulo",
    5: "cruz"
  },
  left: {
    1: "L2",
    3: "start",
    4: "triangulo",
    5: "cuadrado"
  }
};

const PALANCA_ON = .6, PALANCA_OFF = .35;

const MOVER_RAYO = 5;

const SALTEA_CINE = new Set([ "circulo", "cruz", "start", "triangulo", "cuadrado" ]);

const A_TITULO = {
  circulo: "o",
  cruz: "x",
  start: "start",
  arriba: "arriba",
  abajo: "abajo",
  izq: "izq",
  der: "der"
};

const A_TECLA = {
  circulo: "Enter",
  cruz: "Escape",
  start: "KeyP",
  arriba: "ArrowUp",
  abajo: "ArrowDown",
  izq: "ArrowLeft",
  der: "ArrowRight"
};

const A_GAMEOVER = {
  circulo: "Enter",
  start: "Enter",
  izq: "ArrowLeft",
  der: "ArrowRight"
};

const A_PARTIDA = {
  circulo: "o",
  start: "o",
  cruz: "x",
  arriba: "arriba",
  abajo: "abajo",
  izq: "izq",
  der: "der"
};

const A_ASCENSOR = {
  circulo: "circulo",
  start: "circulo",
  cruz: "cruz",
  arriba: "arriba",
  abajo: "abajo"
};

const A_RANGO = {
  circulo: "o",
  cruz: "x",
  start: "start",
  triangulo: "otro",
  cuadrado: "otro",
  arriba: "arriba",
  abajo: "abajo",
  izq: "izq",
  der: "der"
};

const PAD_DE = {
  circulo: PAD.CIR,
  cruz: PAD.CRU,
  triangulo: PAD.TRI,
  cuadrado: PAD.CUA,
  arriba: PAD.ARRIBA,
  abajo: PAD.ABAJO,
  izq: PAD.IZQ,
  der: PAD.DER,
  L2: PAD.L2,
  R2: PAD.R2,
  L1: PAD.L1,
  R1: PAD.R1,
  start: PAD.START
};

const ESTADOS_VR_CENTRO = new Set([ "menu", "cargando", "ventana", "pausa", "clear", "derrota" ]);

const difAng = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

const eventoTecla = code => ({
  code: code,
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  preventDefault() {},
  stopPropagation() {},
  stopImmediatePropagation() {}
});

function lienzoVacio() {
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  return c;
}

function histeresis(v, antes) {
  if (antes > 0) return v > PALANCA_OFF ? 1 : v < -PALANCA_ON ? -1 : 0;
  if (antes < 0) return v < -PALANCA_OFF ? -1 : v > PALANCA_ON ? 1 : 0;
  return v > PALANCA_ON ? 1 : v < -PALANCA_ON ? -1 : 0;
}

export function adaptadorRenderer(R, cam) {
  const controles = [ 0, 1 ].map(i => {
    const c = R.xr.getController(i);
    c.addEventListener("connected", e => {
      c.userData.fuenteVR = e.data;
    });
    c.addEventListener("disconnected", () => {
      c.userData.fuenteVR = null;
    });
    return c;
  });
  return {
    activo: () => R.xr.isPresenting,
    cabeza(m) {
      let pose = null;
      try {
        const f = R.xr.getFrame?.(), ref = R.xr.getReferenceSpace?.();
        pose = f && ref ? f.getViewerPose(ref) : null;
      } catch {
        pose = null;
      }
      if (pose) {
        m.fromArray(pose.transform.matrix);
        const padre = cam?.parent;
        if (padre) {
          padre.updateWorldMatrix(true, false);
          m.premultiply(padre.matrixWorld);
        }
        return m;
      }
      return m.copy(R.xr.getCamera().matrixWorld);
    },
    fuentes: () => R.xr.getSession()?.inputSources || [],
    rayo(f) {
      const c = controles.find(k => k.userData.fuenteVR === f);
      if (c) return c;
      const i = [ ...R.xr.getSession()?.inputSources || [] ].indexOf(f);
      return i >= 0 && i < controles.length ? controles[i] : null;
    },
    sesion: () => R.xr.getSession()
  };
}

export class VRPaneles {
  constructor({renderer: renderer = null, camara: camara = null, xr: xr = null, mapa: mapa = MAPA_XR, disposicion: disposicion = {}} = {}) {
    this.R = renderer;
    this.cam = camara;
    this.xr = xr || adaptadorRenderer(renderer, camara);
    this.mapa = mapa;
    this.disp = {};
    for (const k of Object.keys(DISPOSICION)) this.disp[k] = {
      ...DISPOSICION[k],
      ...disposicion[k] || {}
    };
    this.paneles = [];
    this.escena = new THREE.Scene;
    this.escena.name = "vr_paneles";
    this.fondo = new THREE.Scene;
    this.fondo.name = "vr_fondo";
    this.fondo.background = new THREE.Color(0);
    this.grilla = new THREE.GridHelper(24, 48, 2050604, 860180);
    this.grilla.material.transparent = true;
    this.grilla.material.opacity = .55;
    this.fondo.add(this.grilla);
    this._plano = new THREE.PlaneGeometry(1, 1);
    this._m = new THREE.Matrix4;
    this._q = new THREE.Quaternion;
    this._v = new THREE.Vector3;
    this._e = new THREE.Euler(0, 0, 0, "YXZ");
    this._ray = new THREE.Raycaster;
    this._c = new THREE.Color;
    this.cab = {
      pos: new THREE.Vector3(0, 1.6, 0),
      yaw: 0,
      pitch: 0,
      valida: false
    };
    this.frame = 0;
    this.activo = false;
    this._mostrados = [];
    this._captura = null;
    this._ant = {};
    this._receptor = {};
    this._dir = {
      left: {
        x: 0,
        y: 0
      },
      right: {
        x: 0,
        y: 0
      }
    };
    this._gatAnt = {
      left: false,
      right: false
    };
    this._gatilloEn = {
      left: null,
      right: null
    };
    this._gatJuego = {
      left: false,
      right: false
    };
    this.intensidadVibra = 1;
    this._golpes = {
      left: null,
      right: null
    };
    this.manoActiva = "right";
    this._pinza = new WeakMap;
    this._ev = new Map;
    this._velos = [];
    this._armarCursores();
    this._armarVelos();
    this._armarCine();
    this._armarPantalla();
    this._armarBarras();
  }
  on(n, f) {
    if (!this._ev.has(n)) this._ev.set(n, []);
    this._ev.get(n).push(f);
    return this;
  }
  emit(n, ...a) {
    for (const f of this._ev.get(n) || []) {
      try {
        f(...a);
      } catch (e) {
        console.warn("vr_paneles", n, e);
      }
    }
  }
  get ocupaMandos() {
    return !!this._captura || this.cineActivo;
  }
  get apuntando() {
    return !!(this._golpes.left || this._golpes.right);
  }
  get cineActivo() {
    return !!this.demo && this._frameCine != null && this.frame - this._frameCine <= 2;
  }
  agregar(def) {
    const p = {
      prio: 0,
      exclusivo: false,
      pixel: true,
      escucha: [],
      ...def,
      subidas: 0,
      _firma: undefined,
      seg: null,
      mostrado: false,
      alfa: 1
    };
    p.pivote = new THREE.Group;
    p.pivote.name = "panel_" + p.id;
    p.pivote.visible = false;
    if (p.malla) {
      p.mesh = p.malla;
      p.mesh.removeFromParent();
      p.mesh.position.set(0, 0, 0);
      p.mesh.rotation.set(0, 0, 0);
      const mt = p.mesh.material;
      mt.depthTest = false;
      mt.depthWrite = false;
      mt.transparent = true;
      mt.toneMapped = false;
      mt.needsUpdate = true;
      const g = p.mesh.geometry.parameters || {};
      p.lw = p.logico?.w ?? 320;
      p.lh = p.logico?.h ?? Math.round(320 * (g.height || 1) / (g.width || 1));
    } else {
      p.tex = new THREE.CanvasTexture(lienzoVacio());
      p.tex.colorSpace = THREE.SRGBColorSpace;
      p.tex.generateMipmaps = false;
      p.tex.minFilter = THREE.LinearFilter;
      p.tex.magFilter = p.pixel ? THREE.NearestFilter : THREE.LinearFilter;
      p.mesh = new THREE.Mesh(this._plano, new THREE.MeshBasicMaterial({
        map: p.tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      }));
      p._tw = 2;
      p._th = 2;
      p.lw = p.logico?.w ?? 320;
      p.lh = p.logico?.h ?? 240;
    }
    p.mesh.renderOrder = 10 + p.prio;
    p.mesh.frustumCulled = false;
    p.mesh.userData.panel = p;
    p.pivote.add(p.mesh);
    this.escena.add(p.pivote);
    if (p.velo) this._velos.push(() => p.visible() ? p.velo() : null);
    this.paneles.push(p);
    return p;
  }
  panel(id) {
    return this.paneles.find(p => p.id === id) || null;
  }
  conectar({titulo: titulo, inventario: inventario, misionesVR: misionesVR, gameOver: gameOver, hud: hud, codec: codec, demo: demo, partida: partida, nivel: nivel, ascensor: ascensor, dom: dom = (typeof document !== "undefined" ? document : null)} = {}) {
    const hudDom = dom?.getElementById?.("hud") || null;
    if (titulo) this._conTitulo(titulo);
    if (partida) this._conPartida(partida);
    if (nivel) {
      this._conAscensor(() => nivel()?.ascensorUI);
      this._conTelop(() => nivel()?.telopVR);
    } else if (ascensor) this._conAscensor(typeof ascensor === "function" ? ascensor : () => ascensor);
    const carga = dom?.getElementById?.("pantalla-carga");
    if (carga && !this.panel("carga")) this._conCarga(carga);
    if (gameOver) this._conGameOver(gameOver);
    if (codec) this._conCodec(codec);
    if (misionesVR) this._conMisiones(misionesVR);
    if (inventario) this._conInventario(inventario);
    if (hud) this._conHud(hud, hudDom);
    const aviso = dom?.getElementById?.("aviso");
    if (aviso) this._conAviso(aviso, hudDom);
    for (const [id, base] of [ [ "fundido", 0 ], [ "daño", null ] ]) {
      const el = dom?.getElementById?.(id);
      if (el) this._conVeloDom(el, hudDom, base);
    }
    if (demo) this.demo = demo;
    return this;
  }
  _conTitulo(t) {
    this.titulo = t;
    return this.agregar({
      id: "titulo",
      tipo: "centro",
      prio: 100,
      exclusivo: true,
      pixel: true,
      visible: () => t.visible && !!(t.lienzoVR ?? t.buf),
      captura: () => true,
      lienzo: () => t.lienzoVR ?? t.buf,
      firma: () => `${t.n}|${t.estado}|${t.f}`,
      entrada: {
        boton: (n, abajo) => {
          const b = A_TITULO[n];
          if (!b) return;
          if (t.botonVR) t.botonVR(b, abajo); else if (abajo) t.boton(b);
        },
        apuntar: (x, y) => t.apuntarVR?.(x, y),
        tocar: (x, y) => t.tocarVR ? t.tocarVR(x, y) : t.toque(x, y)
      }
    });
  }
  _moverTitulo(dt) {
    const t = this.titulo;
    if (!t?.visible) return;
    const ahora = performance.now();
    if (t.conReloj !== false && t._tPrev !== this._tPrevTitulo) {
      this._tPrevTitulo = t._tPrev;
      this._tVivoTitulo = ahora;
      return;
    }
    if (t.conReloj === false || ahora - (this._tVivoTitulo || 0) > 150) t.update(dt);
  }
  _conPartida(ui) {
    this.partida = ui;
    return this.agregar({
      id: "partida",
      tipo: "centro",
      prio: 95,
      exclusivo: true,
      pixel: false,
      logico: {
        w: 320,
        h: 240
      },
      solo: true,
      visible: () => !!ui.abierta && !!ui.lienzoVR,
      captura: () => true,
      lienzo: () => ui.lienzoVR,
      firma: () => ui.firmaVR(),
      preparar: () => ui.dibujarVR(),
      entrada: {
        boton: (n, abajo) => {
          const a = A_PARTIDA[n];
          if (a) ui.botonVR(a, abajo);
        },
        apuntar: (x, y) => ui.apuntarVR(x, y),
        tocar: (x, y) => ui.tocarVR(x, y)
      }
    });
  }
  _conAscensor(fuente) {
    const u = () => {
      try {
        return fuente() || null;
      } catch {
        return null;
      }
    };
    const K = 1.6, aLogico = (p, x, y) => {
      const r = p._r;
      return r ? [ r.x0 + x / K, r.y0 + y / K ] : [ x, y ];
    };
    const p = this.agregar({
      id: "ascensor",
      tipo: "centro",
      prio: 85,
      exclusivo: true,
      pixel: false,
      visible: () => !!u()?.visible && !!u()?.lienzo,
      captura: () => true,
      lienzo: () => u()?.lienzo,
      recorte: () => {
        const c = u()?.caja?.() || {
          x: 0,
          y: 0,
          w: 320,
          h: 240
        }, s = (u()?.lienzo?.width || 640) / 320;
        return {
          x: c.x * s,
          y: c.y * s,
          w: c.w * s,
          h: c.h * s,
          lw: Math.round(c.w * K),
          lh: Math.round(c.h * K),
          e: Math.min(2, s),
          x0: c.x,
          y0: c.y
        };
      },
      firma: () => u()?.firma?.(),
      entrada: {
        boton: (n, abajo) => {
          const b = A_ASCENSOR[n];
          if (b) u()?.boton(b, abajo);
        },
        apuntar: (x, y) => u()?.apuntar(...aLogico(p, x, y)),
        tocar: (x, y) => u()?.tocar(...aLogico(p, x, y))
      }
    });
    return p;
  }
  _conTelop(fuente) {
    const u = () => {
      try {
        return fuente() || null;
      } catch {
        return null;
      }
    };
    return this.agregar({
      id: "telop",
      tipo: "centro",
      prio: 40,
      pixel: false,
      logico: {
        w: 320,
        h: 240
      },
      visible: () => !!u()?.visible && !!u()?.lienzo,
      lienzo: () => u()?.lienzo,
      firma: () => u()?.firma?.()
    });
  }
  _conCarga(el) {
    const cv = document.createElement("canvas");
    cv.width = 320;
    cv.height = 64;
    const vis = () => el.style.display === "flex" && +(el.style.opacity || 1) > .05;
    const texto = () => `${el.querySelector(".pc-t")?.textContent || "LOADING"}|${el.querySelector(".pc-p")?.textContent || ""}`;
    return this.agregar({
      id: "carga",
      tipo: "centro",
      prio: 98,
      exclusivo: true,
      pixel: false,
      logico: {
        w: 240,
        h: 48
      },
      solo: true,
      visible: vis,
      lienzo: () => cv,
      firma: () => `${texto()}|${document.fonts?.check?.("16px MGS8") ?? true}`,
      preparar: () => {
        const x = cv.getContext("2d"), [t, pct] = texto().split("|"), f = Math.max(0, Math.min(1, (parseFloat(pct) || 0) / 100));
        x.clearRect(0, 0, 320, 64);
        x.font = "16px MGS8, monospace";
        x.textAlign = "center";
        x.textBaseline = "top";
        x.fillStyle = "#b4f4ac";
        x.fillText(t, 160, 4);
        x.strokeStyle = "#2f4a39";
        x.lineWidth = 2;
        x.strokeRect(41, 31, 238, 12);
        x.fillStyle = "#7fb08c";
        x.fillRect(44, 34, 232 * f, 6);
        x.font = "10px MGS, Consolas, monospace";
        x.fillStyle = "#7fb08c";
        x.fillText(pct, 160, 48);
      }
    });
  }
  menu(def) {
    this._menuDef = def;
    if (this.panel("menu")) return this;
    const cv = document.createElement("canvas");
    cv.width = 640;
    cv.height = 480;
    const M = this._menu = {
      abierto: false,
      sel: 0,
      ver: 0,
      entradas: [],
      cv: cv,
      rects: []
    };
    const textoDe = e => {
      try {
        return String(typeof e.texto === "function" ? e.texto() : e.texto);
      } catch {
        return "?";
      }
    };
    this.agregar({
      id: "menu",
      tipo: "centro",
      prio: 75,
      exclusivo: true,
      pixel: false,
      logico: {
        w: 320,
        h: 240
      },
      visible: () => M.abierto,
      captura: () => M.abierto,
      lienzo: () => cv,
      firma: () => `${M.ver}|${M.sel}|${M.entradas.map(textoDe).join("|")}|${(() => {
        try {
          return this._menuDef?.pie?.() ?? "";
        } catch {
          return "";
        }
      })()}|${document.fonts?.check?.("9px MGS8") ?? true}`,
      preparar: () => this._dibujarMenu(textoDe),
      entrada: {
        boton: (n, abajo) => {
          if (abajo) this._botonMenu(n);
        },
        apuntar: (x, y) => {
          const r = M.rects.find(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
          if (r && r.i !== M.sel) {
            M.sel = r.i;
            this._menuDef?.se?.(31);
          }
        },
        tocar: (x, y) => {
          const r = M.rects.find(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
          if (!r) return;
          M.sel = r.i;
          const e = M.entradas[r.i];
          if (e?.izq && x < r.x + r.w * .25) this._botonMenu("izq"); else if (e?.der && x > r.x + r.w * .75) this._botonMenu("der"); else this._botonMenu("circulo");
        }
      }
    });
    return this;
  }
  get menuAbierto() {
    return !!this._menu?.abierto;
  }
  abrirMenu() {
    const M = this._menu, d = this._menuDef;
    if (!M || !d || M.abierto) return false;
    let e = [];
    try {
      e = (d.entradas?.() || []).filter(Boolean);
    } catch (err) {
      console.warn("vr_paneles: menú", err);
    }
    if (!e.length) return false;
    M.entradas = e;
    M.sel = 0;
    M.abierto = true;
    M.ver++;
    this.panel("menu").seg = null;
    try {
      d.alAbrir?.();
    } catch {}
    d.se?.(21);
    return true;
  }
  cerrarMenu() {
    const M = this._menu;
    if (!M?.abierto) return;
    M.abierto = false;
    M.ver++;
    try {
      this._menuDef?.alCerrar?.();
    } catch {}
  }
  submenu(entradas) {
    const M = this._menu;
    if (!M?.abierto) return;
    M.entradas = (entradas || []).filter(Boolean);
    M.sel = 0;
    M.ver++;
  }
  _botonMenu(n) {
    const M = this._menu, d = this._menuDef, e = M.entradas[M.sel];
    if (n === "arriba" || n === "abajo") {
      M.sel = (M.sel + (n === "arriba" ? M.entradas.length - 1 : 1)) % M.entradas.length;
      d?.se?.(31);
      return;
    }
    if ((n === "izq" || n === "der") && e?.[n]) {
      try {
        e[n]();
      } catch (err) {
        console.warn("vr_paneles: menú", err);
      }
      M.ver++;
      d?.se?.(31);
      return;
    }
    if (n === "circulo") {
      if (!e) return;
      if (e.cierra !== false) this.cerrarMenu();
      d?.se?.(32);
      try {
        const r = e.accion?.();
        r?.catch?.(err => console.warn("vr_paneles: menú", err));
      } catch (err) {
        console.warn("vr_paneles: menú", err);
      }
      M.ver++;
      return;
    }
    const volver = n === "cruz" && M.entradas.find(q => q.volver);
    if (volver) {
      d?.se?.(33);
      try {
        volver.accion?.();
      } catch (err) {
        console.warn("vr_paneles: menú", err);
      }
      M.ver++;
      return;
    }
    if (n === "cruz" || n === "start") {
      d?.se?.(33);
      this.cerrarMenu();
    }
  }
  _dibujarMenu(textoDe) {
    const M = this._menu, x = M.cv.getContext("2d"), CLARO = "#b4f4ac", MEDIO = "#7fb08c";
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, 320, 240);
    const tot = M.entradas.length, MAXV = 10, n = Math.min(tot, MAXV), hf = 16, gap = 3, W = 236, X0 = 42, alto = 14 + 6 + n * hf + (n - 1) * gap + 6 + 10;
    M.desde = Math.max(0, Math.min(tot - n, Math.max(M.sel - n + 1, Math.min(M.desde || 0, M.sel))));
    let y = Math.max(4, Math.round((240 - alto) / 2));
    x.fillStyle = "rgba(0,4,2,0.95)";
    x.fillRect(X0 - 10, y - 8, W + 20, alto + 16);
    x.strokeStyle = "#2f4a39";
    x.lineWidth = 1;
    x.strokeRect(X0 - 9.5, y - 7.5, W + 19, alto + 15);
    x.font = "10px MGS8, monospace";
    x.textAlign = "center";
    x.textBaseline = "top";
    x.fillStyle = CLARO;
    x.fillText(String(this._menuDef?.titulo || "MENU").toUpperCase(), 160, y, W);
    y += 14 + 6;
    const flecha = (yy, arriba) => {
      x.fillStyle = MEDIO;
      x.beginPath();
      x.moveTo(X0 + W - 8, yy + (arriba ? 5 : 0));
      x.lineTo(X0 + W, yy + (arriba ? 5 : 0));
      x.lineTo(X0 + W - 4, yy + (arriba ? 0 : 5));
      x.closePath();
      x.fill();
    };
    if (M.desde > 0) flecha(y - 12, true);
    M.rects = [];
    for (let i = M.desde; i < M.desde + n; i++) {
      const e = M.entradas[i], sel = i === M.sel;
      x.fillStyle = sel ? "rgba(0,110,60,0.38)" : "rgba(4,14,8,0.8)";
      x.fillRect(X0, y, W, hf);
      x.strokeStyle = sel ? CLARO : "#2f4a39";
      x.strokeRect(X0 + .5, y + .5, W - 1, hf - 1);
      let t = textoDe(e).toUpperCase();
      x.font = "9px MGS8, monospace";
      x.fillStyle = sel ? CLARO : "#9fd8a0";
      x.textAlign = "center";
      if (e.izq || e.der) {
        x.fillText("<", X0 + 10, y + 4);
        x.fillText(">", X0 + W - 10, y + 4);
      }
      x.fillText(t, 160, y + 4, W - (e.izq || e.der ? 34 : 10));
      M.rects.push({
        x: X0,
        y: y,
        w: W,
        h: hf,
        i: i
      });
      y += hf + gap;
    }
    if (M.desde + n < tot) flecha(y - 1, false);
    let pie = "O ELEGIR   < > CAMBIAR   X VOLVER";
    try {
      pie = this._menuDef?.pie?.() || pie;
    } catch {}
    x.font = "8px MGS, Consolas, monospace";
    x.fillStyle = MEDIO;
    x.textAlign = "center";
    x.fillText(String(pie).toUpperCase(), 160, y + 4, W);
  }
  _conGameOver(go) {
    return this.agregar({
      id: "gameover",
      tipo: "centro",
      prio: 90,
      exclusivo: true,
      pixel: false,
      visible: () => !!go.activo,
      captura: () => true,
      lienzo: () => go.cv,
      recorte: () => {
        const {s: s, ox: ox, oy: oy} = go.escala();
        return {
          x: ox,
          y: oy,
          w: 320 * s,
          h: 240 * s,
          lw: 320,
          lh: 240,
          e: 2
        };
      },
      firma: () => `${go.step}|${go.count}|${go.option}|${go.gradient}|${!!go.tex}|${go.cv.width}x${go.cv.height}`,
      entrada: {
        boton: (n, abajo) => {
          const c = A_GAMEOVER[n];
          if (abajo && c) go.tecla(eventoTecla(c));
        },
        tocar: (x, y) => {
          const r = go.cv.getBoundingClientRect(), {s: s, ox: ox, oy: oy} = go.escala();
          go.toque({
            clientX: r.left + ox + x * s,
            clientY: r.top + oy + y * s,
            preventDefault() {},
            stopPropagation() {}
          });
        }
      },
      velo: () => ({
        color: 0,
        alfa: Math.min(1, (go.fondo || 0) / 255)
      })
    });
  }
  conectarFinal({movie: movie, rango: rango, codec: codec} = {}) {
    if (movie && !this.panel("movie")) {
      this.movie = movie;
      this.agregar({
        id: "movie",
        tipo: "cine",
        prio: 88,
        exclusivo: true,
        pixel: false,
        logico: {
          w: 320,
          h: 224
        },
        solo: true,
        visible: () => !!movie.activo,
        captura: () => true,
        lienzo: () => movie._cvVR || movie.lienzoVR?.(2),
        preparar: () => movie.lienzoVR?.(2),
        entrada: {
          boton: (n, abajo) => {
            if (abajo && SALTEA_CINE.has(n)) movie.saltarVR?.();
          }
        }
      });
    }
    if (rango && !this.panel("rango")) {
      this.rango = rango;
      this.agregar({
        id: "rango",
        tipo: "centro",
        prio: 92,
        exclusivo: true,
        pixel: true,
        logico: {
          w: 320,
          h: 224
        },
        solo: true,
        visible: () => !!rango.activo && !rango.cargando,
        captura: () => true,
        lienzo: () => rango.buf,
        firma: () => rango.firma(),
        entrada: {
          boton: (n, abajo) => {
            const b = A_RANGO[n];
            if (abajo && b) rango.boton(b);
          },
          tocar: (x, y) => rango.tocar(x, y)
        }
      });
    }
    if (codec && !this.panel("voz_sub")) {
      const cv = document.createElement("canvas");
      cv.width = 640;
      cv.height = 72;
      let txt = "", cvJ = null, nJ = 0;
      this.agregar({
        id: "voz_sub",
        tipo: "subtitulo",
        prio: 54,
        pixel: false,
        logico: {
          w: 320,
          h: 36
        },
        visible: () => {
          txt = codec.textoVozJuego?.() || "";
          cvJ = codec.lienzoVozJuego?.() || null;
          return !!txt || !!cvJ;
        },
        lienzo: () => cv,
        firma: () => cvJ ? "ja:" + (cvJ._n ||= ++nJ) : txt,
        preparar: () => {
          const x = cv.getContext("2d"), filas = txt.split("\n").slice(0, 3), alto = 22;
          x.clearRect(0, 0, cv.width, cv.height);
          if (cvJ) {
            const k = Math.max(1, Math.floor(Math.min((cv.width - 8) / cvJ.width, (cv.height - 6) / cvJ.height)));
            x.fillStyle = "rgba(0,0,0,0.35)";
            x.fillRect(0, (cv.height - cvJ.height * k) / 2 - 3, cv.width, cvJ.height * k + 6);
            x.imageSmoothingEnabled = false;
            x.drawImage(cvJ, Math.round((cv.width - cvJ.width * k) / 2), Math.round((cv.height - cvJ.height * k) / 2), cvJ.width * k, cvJ.height * k);
            return;
          }
          x.font = '19px "Trebuchet MS", Verdana, Arial, sans-serif';
          x.textAlign = "center";
          x.textBaseline = "middle";
          x.lineJoin = "round";
          x.fillStyle = "rgba(0,0,0,0.35)";
          x.fillRect(0, (cv.height - filas.length * alto) / 2 - 3, cv.width, filas.length * alto + 6);
          x.lineWidth = 4;
          x.strokeStyle = "#000";
          x.fillStyle = "#e8e8e8";
          filas.forEach((f, i) => {
            const y = cv.height / 2 + (i - (filas.length - 1) / 2) * alto;
            x.strokeText(f, cv.width / 2, y);
            x.fillText(f, cv.width / 2, y);
          });
        }
      });
    }
    return this;
  }
  _conCodec(c) {
    this.codec = c;
    const ancho = 320 * metrosPorPixel(this.disp.centro.dist);
    const malla = c.malla || c.panelVR(THREE, ancho);
    this.agregar({
      id: "codec",
      tipo: "centro",
      prio: 80,
      exclusivo: true,
      malla: malla,
      logico: {
        w: 320,
        h: 224
      },
      visible: () => !!c.abierto,
      captura: () => true
    });
    this.agregar({
      id: "codec_llamada",
      tipo: "arriba",
      prio: 65,
      pixel: true,
      visible: () => !c.abierto && c.cvAviso?.style.display === "block",
      lienzo: () => c.cvAviso,
      recorte: () => ({
        x: 0,
        y: 44,
        w: 320,
        h: 32,
        lw: 320,
        lh: 32,
        e: 1
      }),
      firma: () => c.cvAviso?.style.display
    });
  }
  _conMisiones(vr) {
    this.misiones = vr;
    const recorte = (alto, eMax) => () => {
      const {s: s, ox: ox} = vr.escala();
      if (!(s > 0)) return null;
      return {
        x: ox * s,
        y: 0,
        w: 320 * s,
        h: alto * s,
        lw: 320,
        lh: alto,
        e: Math.max(1, Math.min(eMax, Math.round(s)))
      };
    };
    this.agregar({
      id: "vr",
      tipo: "centro",
      prio: 70,
      exclusivo: true,
      pixel: false,
      visible: () => {
        const v = ESTADOS_VR_CENTRO.has(vr.estado);
        this._fondoMenuVR(vr, v);
        this._tituloVR(vr, v);
        return v;
      },
      captura: () => true,
      lienzo: () => vr.cv,
      recorte: recorte(240, 2),
      firma: () => vr.estado === "menu" ? `m|${vr.menu.nivel},${vr.menu.i},${vr.menu.j}|${vr.todo}|${vr.aviso?.texto ?? ""}|${Object.keys(vr.img || {}).length}` : `${vr.estado}|${vr.f}|${vr.sel}|${vr.selP}|${vr.selD}`,
      entrada: {
        boton: (n, abajo) => {
          const c = A_TECLA[n];
          if (!c) return;
          if (abajo) vr.entrada(c); else vr.soltar?.(c);
        },
        tocar: (x, y) => {
          const {s: s, ox: ox} = vr.escala();
          vr.clic((x + ox) * s, y * s);
        }
      }
    });
    this._barrasK = () => vr.barrasCine || 0;
    this.agregar({
      id: "vr_reloj",
      tipo: "arriba",
      prio: 52,
      pixel: false,
      visible: () => vr.estado === "juego" || vr.estado === "intro",
      escucha: [ "start" ],
      lienzo: () => vr.cv,
      recorte: recorte(76, 3),
      firma: () => `${vr.estado}|${vr.f}`,
      entrada: {
        boton: (n, abajo) => {
          if (abajo && n === "start") vr.entrada("KeyP");
        }
      }
    });
  }
  _fondoMenuVR(vr, visible) {
    const D = vr.menuD, p = this.panel("vr");
    if (!D || !p) return;
    if (!this._fondoMenu) {
      const m = vr.fondoMenu?.mallaPanel?.();
      if (!m) return;
      m.renderOrder = p.mesh.renderOrder - .5;
      p.mesh.add(m);
      this._fondoMenu = m;
    }
    if (!D.fondoAparte) D.fondoAparte = () => !!(this.activo && this._fondoMenu?.visible);
    const V = vr.menuVR;
    if (V && !V.fondoAparte) V.fondoAparte = () => !!(this.activo && this._fondoMenu?.visible);
    this._fondoMenu.visible = !!(visible && this.activo && vr.estado === "menu" && !vr.tituloD?.activo && (D.activo || V?.activo));
  }
  _tituloVR(vr, visible) {
    const T = vr.tituloD, p = this.panel("vr");
    if (!T || !p) return;
    if (!this._titulo) {
      const g = T.mallaPanel?.();
      if (!g) return;
      p.mesh.add(g);
      this._titulo = g;
    }
    if (!T.gpuAparte) T.gpuAparte = () => !!(this.activo && this._titulo?.visible);
    const ver = !!(visible && this.activo && vr.estado === "menu" && T.activo && T.pant !== "album");
    this._titulo.visible = ver;
    if (ver) T.pintarGPU(p.mesh.renderOrder - 1);
  }
  _conInventario(inv) {
    this.inventario = inv;
    this._txt = {
      inv: inv,
      pool: [],
      cache: new Map
    };
    if (typeof inv.dibujarTextos === "function" && !inv.__textosVR) {
      inv.__textosVR = true;
      const orig = inv.dibujarTextos, panelesVR = this;
      inv.dibujarTextos = function(...a) {
        if (!panelesVR.activo) return orig.apply(this, a);
        for (const [k, t] of this.fijos || []) if (t.hasta < this.cuadro) this.fijos.delete(k);
      };
    }
    const LW = 300, LH = 206;
    const recorte = k => () => {
      if (!inv.cv || !inv.k || !inv.base) return null;
      const [bx, by] = inv.base[k], arriba = !!inv.tactil;
      if (inv.menu !== k) {
        const CW = 72, CH = 48, x0 = bx - 12, y0 = arriba ? by - 6 : by - 12;
        return {
          x: x0 * inv.k,
          y: y0 * inv.k,
          w: CW * inv.k,
          h: CH * inv.k,
          lw: CW,
          lh: CH,
          e: 1,
          x0: x0,
          y0: y0
        };
      }
      const x0 = k ? bx + 60 - LW : bx - 12, y0 = arriba ? by - 6 : by + 36 - LH;
      return {
        x: x0 * inv.k,
        y: y0 * inv.k,
        w: LW * inv.k,
        h: LH * inv.k,
        lw: LW,
        lh: LH,
        e: 1,
        x0: x0,
        y0: y0
      };
    };
    const boton = (n, abajo) => {
      const b = PAD_DE[n];
      if (!b) return;
      if (inv.botonVR) inv.botonVR(b, abajo); else if (abajo) {
        inv.toque |= b;
        inv.toqueSuelto |= b;
      }
    };
    for (const k of [ 0, 1 ]) {
      const p = this.agregar({
        id: k ? "armas" : "items",
        tipo: k ? "der" : "izq",
        prio: 60,
        pixel: true,
        esquina: (inv.tactil ? "arriba" : "abajo") + (k ? "-der" : "-izq"),
        visible: () => inv.listo && !!inv.cv && !inv.cv.hidden,
        captura: () => inv.menu === k,
        tapa: () => inv.menu === k ? [ "hud", "aviso" ] : null,
        escucha: [ "L2", "R2", "L1", "R1" ],
        lienzo: () => inv.cv,
        recorte: recorte(k),
        firma: () => inv.cuadro,
        entrada: {
          boton: boton,
          tocar: (x, y) => {
            const r = p._r;
            if (r) inv.tocarVR?.(r.x0 + x, r.y0 + y);
          },
          acepta: (x, y) => {
            const r = p._r;
            return !!r && inv.menu === k && (inv.casillaEn?.(r.x0 + x, r.y0 + y) ?? -1) >= 0;
          }
        }
      });
    }
  }
  _conHud(h, hudDom) {
    this.hud = h;
    return this.agregar({
      id: "hud",
      tipo: "hud",
      prio: 50,
      pixel: true,
      visible: () => !!h.franja && h.versionFranja > 0 && !hudDom?.hidden,
      lienzo: () => h.franja,
      firma: () => h.versionFranja
    });
  }
  _conAviso(el, hudDom) {
    const cv = document.createElement("canvas");
    cv.width = 640;
    cv.height = 40;
    try {
      document.fonts?.load?.("24px MGS")?.catch?.(() => {});
    } catch {}
    const p = this.agregar({
      id: "aviso",
      tipo: "aviso",
      prio: 55,
      pixel: false,
      logico: {
        w: 320,
        h: 20
      },
      opacidad: dt => {
        const meta = hudDom?.hidden ? 0 : +(el.style.opacity || 0);
        p.alfa += Math.sign(meta - p.alfa) * Math.min(Math.abs(meta - p.alfa), dt / .4);
        return p.alfa;
      },
      visible: () => p.alfa > .01 && !!el.textContent,
      lienzo: () => cv,
      firma: () => `${el.textContent}|${document.fonts?.check?.("24px MGS") ?? true}`,
      preparar: () => {
        const x = cv.getContext("2d"), t = el.textContent.toUpperCase();
        x.clearRect(0, 0, cv.width, cv.height);
        x.font = "24px MGS, Consolas, monospace";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.lineWidth = 5;
        x.strokeStyle = "rgba(0,0,0,0.85)";
        x.strokeText(t, 320, 21);
        x.fillStyle = "#b4f4ac";
        x.fillText(t, 320, 21);
      }
    });
    p.alfa = 0;
    return p;
  }
  _conVeloDom(el, hudDom, base) {
    const st = {
      alfa: 0,
      desde: 0,
      destino: 0,
      t: 0,
      dur: 0,
      estilo: undefined
    };
    const duracion = () => {
      if (/\bnone\b/.test(el.style.transition || "")) return 0;
      let props = "all", durs = "0s";
      try {
        const cs = getComputedStyle(el);
        props = cs.transitionProperty || "all";
        durs = cs.transitionDuration || "0s";
      } catch {}
      const P = props.split(",").map(s => s.trim()), D = durs.split(",").map(s => parseFloat(s) * (/ms\s*$/.test(s) ? .001 : 1) || 0);
      const i = P.findIndex(p => p === "opacity" || p === "all");
      return i < 0 ? 0 : D[i % D.length] || 0;
    };
    this._velos.push(() => {
      if (hudDom?.hidden) {
        st.alfa = st.destino = 0;
        st.estilo = undefined;
        return null;
      }
      const s = el.style.opacity;
      if (s !== st.estilo) {
        st.estilo = s;
        st.desde = st.alfa;
        st.destino = limitar(+(s || 0) || 0, 0, 1);
        st.t = 0;
        st.dur = st.desde === st.destino ? 0 : duracion();
      }
      if (st.dur > 0 && st.t < st.dur) {
        st.t += this._dt || 0;
        st.alfa = st.desde + (st.destino - st.desde) * Math.min(1, st.t / st.dur);
      } else st.alfa = st.destino;
      if (st.alfa <= .001) return null;
      let color = base;
      if (color == null) {
        let bg = el.style.background || el.style.backgroundColor || "";
        if (!/\d/.test(bg) && !/^#/.test(bg)) {
          try {
            bg = getComputedStyle(el).backgroundColor || "";
          } catch {
            bg = "";
          }
        }
        const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bg.trim()), m = /(\d+)\D+(\d+)\D+(\d+)/.exec(bg);
        if (h) {
          const x = h[1].length === 3 ? h[1].split("").map(c => c + c).join("") : h[1];
          color = parseInt(x, 16);
        } else color = m ? +m[1] << 16 | +m[2] << 8 | +m[3] : 13369344;
      }
      return {
        color: color,
        alfa: st.alfa
      };
    });
  }
  update(dt = 0) {
    dt = limitar(dt || 0, 0, .25);
    this.frame++;
    this._dt = dt;
    this._pantalla.pivote.visible = false;
    this._moverTitulo(dt);
    const activo = !!this.xr.activo();
    if (this.partida) this.partida.modoVR = activo;
    if (!activo) {
      if (this.activo) this._alSalir();
      this.activo = false;
      return;
    }
    if (!this.activo) this._alEntrar();
    this.activo = true;
    this._leerCabeza();
    const cine = this.cineActivo;
    for (const p of this.paneles) if (p.opacidad) p.alfa = p.opacidad(dt);
    const vis = cine ? [] : this.paneles.filter(p => {
      try {
        return !!p.visible();
      } catch {
        return false;
      }
    });
    const excl = vis.filter(p => p.exclusivo).sort((a, b) => b.prio - a.prio)[0];
    let mostrados = excl ? vis.filter(p => p.prio >= excl.prio) : vis;
    const centro = mostrados.filter(p => p.tipo === "centro").sort((a, b) => b.prio - a.prio)[0];
    mostrados = mostrados.filter(p => p.tipo !== "centro" || p === centro);
    const tapados = new Set(mostrados.flatMap(p => p.tapa?.() || []));
    if (tapados.size) mostrados = mostrados.filter(p => !tapados.has(p.id));
    for (const p of this.paneles) {
      const si = mostrados.includes(p);
      if (!si && p.mostrado) p.seg = null;
      p.mostrado = si;
      p.pivote.visible = si;
    }
    this._mostrados = mostrados;
    this._captura = mostrados.filter(p => p.captura?.()).sort((a, b) => b.prio - a.prio)[0] || null;
    for (const p of mostrados) {
      if (!p.malla) this._medir(p);
      this._ubicar(p, dt);
      if (p.opacidad) p.mesh.material.opacity = limitar(p.alfa, 0, 1);
    }
    this._ubicarCine(dt, cine);
    this._ubicarTextosItems(cine);
    this._ubicarVelos();
    this.escena.updateMatrixWorld(true);
    this._rayos();
    this._entrada();
  }
  _alEntrar() {
    for (const p of this.paneles) p.seg = null;
    this._cine.seg = null;
    this._pantalla.seg = null;
    const ses = this.xr.sesion?.();
    if (ses && ses !== this._sesion) {
      this._sesion = ses;
      ses.addEventListener("selectstart", e => {
        if (!e.inputSource?.gamepad) this._pinza.set(e.inputSource, true);
      });
      ses.addEventListener("selectend", e => {
        this._pinza.delete(e.inputSource);
      });
    }
  }
  _alSalir() {
    for (const n of Object.keys(this._ant)) this._ruta(n, false, this._ant[n]);
    for (const lado of [ "left", "right" ]) if (this._gatAnt[lado]) this._gatillo(lado, false);
    this._ant = {};
    this._gatAnt = {
      left: false,
      right: false
    };
    this._golpes = {
      left: null,
      right: null
    };
    this._captura = null;
    this._mostrados = [];
    for (const p of this.paneles) {
      p.pivote.visible = false;
      p.mostrado = false;
      p.seg = null;
    }
    for (const s of this._txt?.pool || []) s.piv.visible = false;
  }
  _leerCabeza() {
    const m = this.xr.cabeza(this._m), c = this.cab;
    if (!m) return;
    c.pos.setFromMatrixPosition(m);
    const f = this._v.set(0, 0, -1).transformDirection(m);
    c.yaw = Math.atan2(-f.x, -f.z);
    c.pitch = Math.asin(limitar(f.y, -1, 1));
    c.valida = c.pos.lengthSq() > 1e-8;
  }
  _medir(p) {
    const src = p.lienzo?.();
    if (!src || !src.width || !src.height) return null;
    const r = p.recorte ? p.recorte() : null;
    if (p.recorte && (!r || !(r.w >= 1) || !(r.h >= 1))) return null;
    p._r = r;
    p.lw = r ? r.lw : p.logico?.w ?? src.width;
    p.lh = r ? r.lh : p.logico?.h ?? src.height;
    return src;
  }
  _subir(p) {
    const src = this._medir(p);
    if (!src) return false;
    const r = p._r;
    const firma = p.firma ? p.firma() : NaN;
    if (p.subidas > 0 && p._fuente === src && firma === p._firma) return false;
    p._firma = firma;
    p._fuente = src;
    p.preparar?.();
    let img = src;
    if (r) {
      const W = Math.max(1, Math.round(r.lw * r.e)), H = Math.max(1, Math.round(r.lh * r.e));
      if (!p.cv) {
        p.cv = document.createElement("canvas");
        p.ctx = p.cv.getContext("2d");
      }
      if (p.cv.width !== W || p.cv.height !== H) {
        p.cv.width = W;
        p.cv.height = H;
      }
      const x = p.ctx, k = r.w / W;
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, W, H);
      x.imageSmoothingEnabled = !p.pixel || k > 1 && Math.abs(k - Math.round(k)) > .001;
      x.imageSmoothingQuality = "high";
      x.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, W, H);
      img = p.cv;
    }
    if (p.tex.image !== img || p._tw !== img.width || p._th !== img.height) {
      if (p._tw !== img.width || p._th !== img.height) p.tex.dispose();
      p.tex.image = img;
      p._tw = img.width;
      p._th = img.height;
    }
    p.tex.needsUpdate = true;
    p.subidas++;
    return true;
  }
  _ubicar(p, dt) {
    const D = this.disp[p.tipo] || this.disp.centro, mpp = metrosPorPixel(D.dist);
    let w, h;
    if (p.malla) {
      const g = p.mesh.geometry.parameters || {}, s = 320 * mpp / (g.width || 1) * (p.escala?.() ?? 1);
      p.mesh.scale.setScalar(s);
      w = (g.width || 1) * s;
      h = (g.height || 1) * s;
    } else if (p.tipo === "cine" && D.ancho) {
      w = D.ancho;
      h = w * p.lh / (p.lw || 1);
      p.mesh.scale.set(w, h, 1);
    } else {
      w = p.lw * mpp;
      h = p.lh * mpp;
      p.mesh.scale.set(w, h, 1);
    }
    if (p.tipo === "visera") return this._colocar(p.pivote, this.cab.pos, this.cab.yaw, this.cab.pitch, 0, 0, D.dist);
    if (p.tipo === "centro" || p.tipo === "cine") return this._seguirMundo(p, D, dt);
    const e = p.esquina || "";
    const dYaw = (D.yaw || 0) + (e.endsWith("izq") ? -1 : e.endsWith("der") ? 1 : 0) * Math.atan2(w / 2, D.dist);
    const dPitch = (D.pitch || 0) + (e.startsWith("abajo") ? 1 : e.startsWith("arriba") ? -1 : 0) * Math.atan2(h / 2, D.dist);
    this._seguirCabeza(p, D, dt, dYaw, dPitch);
  }
  _seguirMundo(p, D, dt) {
    const c = this.cab, pitch = D.pitchFijo ?? -6 * GRADO;
    let s = p.seg;
    if (!s || !s.valida) s = p.seg = {
      yaw: c.yaw,
      pitch: pitch,
      pos: c.pos.clone(),
      mover: false,
      valida: c.valida
    }; else {
      const dy = difAng(c.yaw, s.yaw), dp = pitch - s.pitch;
      if (Math.abs(dy) > D.umbral) s.mover = true;
      if (s.mover) {
        const k = 1 - Math.exp(-dt * 5);
        s.yaw += dy * k;
        s.pitch += dp * k;
        if (Math.abs(dy) < 2 * GRADO && Math.abs(dp) < 2 * GRADO) s.mover = false;
      }
      s.pos.lerp(c.pos, 1 - Math.exp(-dt * 4));
    }
    this._colocar(p.pivote, s.pos, s.yaw, s.pitch, 0, 0, D.dist);
  }
  _seguirCabeza(p, D, dt, dYaw = D.yaw || 0, dPitch = D.pitch || 0) {
    const c = this.cab;
    let s = p.seg;
    if (!s || !s.valida) s = p.seg = {
      yaw: c.yaw,
      valida: c.valida,
      mover: false
    }; else {
      const dy = difAng(c.yaw, s.yaw);
      if (Math.abs(dy) > 50 * GRADO) s.mover = true;
      if (s.mover) {
        s.yaw += dy * (1 - Math.exp(-dt * 5));
        if (Math.abs(dy) < 3 * GRADO) s.mover = false;
      }
    }
    this._colocar(p.pivote, c.pos, s.yaw, 0, dYaw, dPitch, D.dist);
  }
  _colocar(obj, origen, yaw, pitch, dYaw, dPitch, dist) {
    this._e.set(limitar(pitch, -1.45, 1.45), yaw, 0, "YXZ");
    this._q.setFromEuler(this._e);
    const d = this._v.set(-Math.sin(dYaw) * Math.cos(dPitch), Math.sin(dPitch), -Math.cos(dYaw) * Math.cos(dPitch)).applyQuaternion(this._q);
    obj.position.copy(origen).addScaledVector(d, dist);
    obj.up.set(0, 1, 0).applyQuaternion(this._q);
    obj.lookAt(origen);
  }
  puntoDe(id, x, y) {
    const p = typeof id === "string" ? this.panel(id) : id;
    if (!p) return null;
    p.mesh.updateWorldMatrix(true, false);
    const g = p.malla ? p.mesh.geometry.parameters : {
      width: 1,
      height: 1
    };
    return new THREE.Vector3((x / p.lw - .5) * g.width, (.5 - y / p.lh) * g.height, 0).applyMatrix4(p.mesh.matrixWorld);
  }
  _ubicarTextosItems(oculto = false) {
    const T = this._txt;
    if (!T) return;
    const inv = T.inv, lista = [];
    const tapa = oculto || !inv.listo || !inv.cv || inv.cv.hidden || inv.abierto || this._mostrados.some(p => p.exclusivo && p.tipo === "centro");
    if (!tapa) {
      for (const t of inv.textos || []) lista.push({
        ...t,
        sube: t.t
      });
      for (const t of inv.fijos?.values?.() || []) if (!(t.hasta < inv.cuadro)) lista.push(t);
    }
    const MMv = .001;
    for (let i = 0; i < Math.max(lista.length, T.pool.length); i++) {
      const t = lista[i];
      let s = T.pool[i];
      if (!t) {
        if (s) s.piv.visible = false;
        continue;
      }
      if (!s) {
        const piv = new THREE.Group, mesh = new THREE.Mesh(this._plano, new THREE.MeshBasicMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false
        }));
        mesh.renderOrder = 40;
        piv.add(mesh);
        this.escena.add(piv);
        s = T.pool[i] = {
          piv: piv,
          mesh: mesh
        };
      }
      const tx = this._texTexto(inv, t);
      if (!tx) {
        s.piv.visible = false;
        continue;
      }
      if (s.mesh.material.map !== tx.tex) {
        s.mesh.material.map = tx.tex;
        s.mesh.material.needsUpdate = true;
      }
      s.piv.visible = true;
      s.piv.position.set(t.pos.x, t.pos.y + (t.h || 0) * MMv, t.pos.z);
      const d = Math.max(.3, s.piv.position.distanceTo(this.cab.pos)), mpp = metrosPorPixel(d);
      s.piv.up.set(0, 1, 0);
      s.piv.lookAt(this.cab.pos);
      const sube = t.cartel ? 0 : Math.min(16, Math.floor(t.sube || 0));
      s.mesh.scale.set(tx.w * mpp, tx.h * mpp, 1);
      s.mesh.position.set((tx.w / 2 - tx.ax) * mpp, (tx.ay - tx.h / 2 + sube) * mpp, 0);
    }
  }
  _texTexto(inv, t) {
    const T = this._txt, k = `${t.msg}|${t.color}|${t.cartel ? 1 : 0}`;
    let tx = T.cache.get(k);
    if (tx) return tx;
    if (typeof inv.letra !== "function" || !inv.letras) return null;
    const ancho = Math.max(8, String(t.msg).length * 6 + 4), E = 3;
    const cv = document.createElement("canvas"), x = cv.getContext("2d");
    let w, h, ax, ay;
    if (t.cartel) {
      w = 22 + ancho + 2;
      h = 26;
      ax = 0;
      ay = 25;
    } else {
      w = ancho + 2;
      h = 8;
      ax = w / 2;
      ay = 7;
    }
    cv.width = w * E;
    cv.height = h * E;
    x.imageSmoothingEnabled = false;
    x.setTransform(E, 0, 0, E, 0, 0);
    try {
      if (t.cartel) {
        x.fillStyle = "rgb(255,255,255)";
        for (let i = 0; i < 16; i++) x.fillRect(ax + i, ay - i, 1, 1);
        x.fillRect(ax + 16, ay - 16, 40, 1);
        inv.letra(x, ax + 22, ay - 23, t.msg, "negro");
        inv.letra(x, ax + 21, ay - 24, t.msg, "blanco");
      } else {
        inv.letra(x, ax + 1, 1 + 1, t.msg, "negro", 2);
        inv.letra(x, ax, 1, t.msg, t.color || "blanco", 2);
      }
    } catch {
      return null;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tx = {
      tex: tex,
      w: w,
      h: h,
      ax: ax,
      ay: ay
    };
    if (T.cache.size > 40) {
      for (const [kk, v] of T.cache) {
        v.tex.dispose();
        T.cache.delete(kk);
        break;
      }
    }
    T.cache.set(k, tx);
    return tx;
  }
  _armarCursores() {
    this._cur = {};
    for (const lado of [ "left", "right" ]) {
      const anillo = new THREE.Mesh(new THREE.RingGeometry(.0045, .009, 24), new THREE.MeshBasicMaterial({
        color: 11859116,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      }));
      const punto = new THREE.Mesh(new THREE.CircleGeometry(.0022, 12), anillo.material);
      anillo.add(punto);
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute([ 0, 0, 0, 0, 0, -1 ], 3));
      const haz = new THREE.Line(g, new THREE.LineBasicMaterial({
        color: 8257440,
        transparent: true,
        opacity: .85,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      }));
      anillo.renderOrder = haz.renderOrder = 1e3;
      anillo.visible = haz.visible = false;
      haz.frustumCulled = false;
      this.escena.add(anillo, haz);
      this._cur[lado] = {
        anillo: anillo,
        haz: haz,
        origen: new THREE.Vector3
      };
    }
  }
  _rayos() {
    const tocables = this._mostrados.filter(p => p.entrada && (p.entrada.tocar || p.entrada.apuntar)).map(p => p.mesh);
    const vistos = {
      left: false,
      right: false
    };
    for (const f of this.xr.fuentes() || []) {
      if (f.targetRayMode && f.targetRayMode !== "tracked-pointer") continue;
      const lado = f.handedness === "left" ? "left" : "right";
      const obj = this.xr.rayo(f);
      if (!obj) continue;
      vistos[lado] = true;
      obj.updateWorldMatrix(true, false);
      const cur = this._cur[lado], o = cur.origen.setFromMatrixPosition(obj.matrixWorld);
      const d = this._v.set(0, 0, -1).transformDirection(obj.matrixWorld);
      let golpe = null;
      if (tocables.length) {
        this._ray.set(o, d);
        this._ray.far = 20;
        for (const h of this._ray.intersectObjects(tocables, false)) {
          const p = h.object.userData.panel;
          if (!h.uv) continue;
          const x = h.uv.x * p.lw, y = (1 - h.uv.y) * p.lh;
          if (p.entrada.acepta && !p.entrada.acepta(x, y)) continue;
          golpe = {
            p: p,
            x: x,
            y: y,
            punto: h.point.clone()
          };
          break;
        }
      }
      this._golpes[lado] = golpe;
      cur.anillo.visible = cur.haz.visible = !!golpe;
      if (golpe) {
        golpe.p.pivote.getWorldQuaternion(cur.anillo.quaternion);
        cur.anillo.position.copy(golpe.punto);
        const a = cur.haz.geometry.attributes.position;
        a.setXYZ(0, o.x, o.y, o.z);
        a.setXYZ(1, golpe.punto.x, golpe.punto.y, golpe.punto.z);
        a.needsUpdate = true;
      }
    }
    for (const lado of [ "left", "right" ]) if (!vistos[lado]) {
      this._golpes[lado] = null;
      this._cur[lado].anillo.visible = this._cur[lado].haz.visible = false;
    }
    const g = this._golpes[this.manoActiva];
    if (g?.p.entrada.apuntar) {
      const a = this._apuntado;
      if (!a || a.id !== g.p.id || Math.hypot(g.x - a.x, g.y - a.y) >= MOVER_RAYO) {
        this._apuntado = {
          id: g.p.id,
          x: g.x,
          y: g.y
        };
        g.p.entrada.apuntar(g.x, g.y);
      }
    } else this._apuntado = null;
  }
  _entrada() {
    const ahora = {}, gat = {
      left: false,
      right: false
    };
    for (const f of this.xr.fuentes() || []) {
      const lado = f.handedness === "left" ? "left" : "right", g = f.gamepad;
      if (!g) {
        if (this._pinza.get(f)) gat[lado] = true;
        continue;
      }
      const mapa = this.mapa[lado] || {};
      for (const i in mapa) if (i !== "0" && g.buttons[i]?.pressed) ahora[mapa[i]] = lado;
      if (g.buttons[0]?.pressed) gat[lado] = true;
      const ax = g.axes.length >= 4 ? [ g.axes[2], g.axes[3] ] : [ g.axes[0] || 0, g.axes[1] || 0 ];
      const d = this._dir[lado];
      d.x = histeresis(ax[0] || 0, d.x);
      d.y = histeresis(ax[1] || 0, d.y);
      if (d.x < 0) ahora.izq ??= lado;
      if (d.x > 0) ahora.der ??= lado;
      if (d.y < 0) ahora.arriba ??= lado;
      if (d.y > 0) ahora.abajo ??= lado;
    }
    for (const lado of [ "left", "right" ]) if (gat[lado] !== this._gatAnt[lado]) {
      this._gatJuego[lado] = gat[lado] && !!this.mapa[lado]?.[0] && !this._golpes[lado] && !this._captura && !this.cineActivo;
      this._gatAnt[lado] = gat[lado];
      this._gatillo(lado, gat[lado]);
    }
    for (const lado of [ "left", "right" ]) if (this._gatJuego[lado] && gat[lado]) ahora[this.mapa[lado][0]] ??= lado;
    for (const n of new Set([ ...Object.keys(this._ant), ...Object.keys(ahora) ])) {
      if (!!ahora[n] !== !!this._ant[n]) this._ruta(n, !!ahora[n], ahora[n] || this._ant[n]);
    }
    this._ant = ahora;
  }
  _ruta(n, abajo, lado) {
    if (abajo && this._apuntado && (n === "arriba" || n === "abajo" || n === "izq" || n === "der")) {
      const g = this._golpes[this.manoActiva];
      if (g) {
        this._apuntado.x = g.x;
        this._apuntado.y = g.y;
      }
    }
    let dest;
    if (!abajo && this._receptor[n]) {
      dest = this._receptor[n];
      delete this._receptor[n];
    } else if (this.cineActivo) dest = "cine"; else dest = this._captura || this._mostrados.find(p => p.escucha?.includes(n)) || "juego";
    if (abajo) this._receptor[n] = dest;
    if (dest === "cine") {
      if (abajo && SALTEA_CINE.has(n)) this.demo?.saltear?.();
      return;
    }
    if (dest === "juego") {
      if (n === "start" && abajo && this.abrirMenu()) {
        this._receptor[n] = this.panel("menu");
        return;
      }
      this.emit("boton", n, abajo, lado);
      return;
    }
    try {
      dest.entrada?.boton?.(n, abajo, lado);
    } catch (e) {
      console.warn("vr_paneles", dest.id, e);
    }
  }
  _gatillo(lado, abajo) {
    if (abajo) this.manoActiva = lado;
    if (abajo && this.cineActivo) {
      this.demo?.saltear?.();
      return;
    }
    if (abajo) {
      const g = this._golpes[lado];
      if (g?.p.entrada.tocar) {
        try {
          g.p.entrada.tocar(g.x, g.y, lado);
        } catch (e) {
          console.warn("vr_paneles", g.p.id, e);
        }
        this._gatilloEn[lado] = g.p;
        this._vibrar(lado);
      }
    } else {
      const p = this._gatilloEn[lado];
      this._gatilloEn[lado] = null;
      p?.entrada?.soltar?.(lado);
    }
  }
  _vibrar(lado) {
    for (const f of this.xr.fuentes() || []) {
      if ((f.handedness === "left" ? "left" : "right") !== lado) continue;
      const k = .25 * (this.intensidadVibra ?? 1);
      if (!(k > 0)) return;
      try {
        f.gamepad?.hapticActuators?.[0]?.pulse?.(k, 25);
      } catch {}
    }
  }
  _armarVelos() {
    const geo = new THREE.SphereGeometry(.3, 16, 12);
    this._esferas = [ 0, 1 ].map(() => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false
      }));
      m.renderOrder = -10;
      m.visible = false;
      m.frustumCulled = false;
      this.escena.add(m);
      return m;
    });
  }
  _ubicarVelos() {
    let negro = 0, color = null, alfa = 0;
    for (const f of this._velos) {
      let v = null;
      try {
        v = f();
      } catch {
        v = null;
      }
      if (!v || !(v.alfa > .002)) continue;
      if (!v.color) negro = Math.max(negro, v.alfa); else if (v.alfa > alfa) {
        alfa = v.alfa;
        color = v.color;
      }
    }
    const [a, b] = this._esferas;
    a.visible = negro > 0;
    a.material.color.setHex(0);
    a.material.opacity = Math.min(1, negro);
    a.position.copy(this.cab.pos);
    b.visible = alfa > 0;
    if (color != null) b.material.color.setHex(color);
    b.material.opacity = Math.min(1, alfa);
    b.position.copy(this.cab.pos);
  }
  _armarCine() {
    const D = this.disp.cine, w = D.ancho, h = w / ASPECTO_DEMO;
    const piv = new THREE.Group;
    piv.name = "cine";
    piv.visible = false;
    this._matCine = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: null
        },
        modo: {
          value: 0
        }
      },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform sampler2D map; uniform int modo; varying vec2 vUv; void main(){ vec3 c = texture2D(map, vUv).rgb;" + " float l = dot(c, vec3(0.299, 0.587, 0.114)); if (modo == 1) c = vec3(l); else if (modo == 2) c = mix(c, l * vec3(1.07, 0.74, 0.43), 0.9);" + " else if (modo >= 3) { float m = max(c.r, max(c.g, c.b));" + " if (modo == 3) c = vec3(min(1.0, m * 2.0)) + vec3(0.22, 0.47, 0.157); else { m = m * 4.0 / 3.0; c = vec3(min(1.0, m * 0.5 + 0.0645) + 0.314, m * 0.25, m * 0.25); }" + " if (mod(floor((1.0 - vUv.y) * 224.0), 2.0) < 1.0) c -= 0.25; c = clamp(c, 0.0, 1.0); }" + " gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}",
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this._matCine);
    pantalla.renderOrder = 5;
    this._cvCine = document.createElement("canvas");
    this._cvCine.width = 640;
    this._cvCine.height = 448;
    this._texCapa = new THREE.CanvasTexture(this._cvCine);
    this._texCapa.colorSpace = THREE.SRGBColorSpace;
    this._texCapa.generateMipmaps = false;
    this._texCapa.minFilter = THREE.LinearFilter;
    const capa = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
      map: this._texCapa,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    }));
    capa.renderOrder = 6;
    piv.add(pantalla, capa);
    this.escena.add(piv);
    this._cine = {
      pivote: piv,
      seg: null,
      imgs: new Map,
      firma: null
    };
  }
  _ubicarCine(dt, activo) {
    const C = this._cine;
    C.pivote.visible = activo;
    if (!activo) {
      C.seg = null;
      return;
    }
    this._seguirMundo(C, this.disp.cine, dt);
  }
  _renderDemo(R, demo) {
    if (!this._rtCine) {
      const flotante = R.extensions?.has?.("EXT_color_buffer_float") || R.extensions?.has?.("EXT_color_buffer_half_float");
      this._rtCine = new THREE.WebGLRenderTarget(800, Math.round(800 / ASPECTO_DEMO), {
        type: flotante ? THREE.HalfFloatType : THREE.UnsignedByteType,
        depthBuffer: true
      });
      this._matCine.uniforms.map.value = this._rtCine.texture;
    }
    const cam = demo.camara;
    if (cam && Math.abs(cam.aspect - ASPECTO_DEMO) > 1e-4) {
      cam.aspect = ASPECTO_DEMO;
      cam.updateProjectionMatrix();
    }
    const prev = {
      target: R.getRenderTarget(),
      xr: R.xr.enabled,
      auto: R.autoClear,
      color: R.getClearColor(this._c).getHex(),
      alfa: R.getClearAlpha()
    };
    R.xr.enabled = false;
    try {
      R.setRenderTarget(this._rtCine);
      R.setClearColor(0, 1);
      R.clear();
      if (demo.escena && demo.activa && demo.grupo && cam) {
        R.autoClear = false;
        if (typeof demo._dibujarEscena === "function") demo._dibujarEscena(R); else R.render(demo.escena, cam);
        const tile = (m, s) => {
          if (!m || !demo._mallaFundido) return;
          m.uniforms.uShade.value = s;
          demo._mallaFundido.material = m;
          R.render(demo._escenaFundido, demo._camOrto);
        };
        for (const a of demo._fundidos || []) {
          let s = Math.min(Math.max(a.k, 1), a.total) / a.total;
          if (a.entra) s = 1 - s;
          if (s > 0) tile(a.blanco ? demo._matBlanco : demo._matNegro, s);
        }
        if (demo._salida) tile(demo._matNegro, Math.min(1, demo._salida.t / demo._salida.dur));
      }
    } finally {
      R.autoClear = prev.auto;
      R.setClearColor(prev.color, prev.alfa);
      R.xr.enabled = prev.xr;
      R.setRenderTarget(prev.target);
    }
    let tAgua = null;
    try {
      tAgua = this.aguaCine?.(R, this._rtCine, demo) || null;
    } catch {}
    this._matCine.uniforms.map.value = tAgua || this._rtCine.texture;
    const c = demo._conm || {};
    const ant = demo.filtroAntiparras;
    this._matCine.uniforms.modo.value = ant === "nvg" ? 3 : ant === "termica" ? 4 : c[36] ? 1 : c[27] ? 2 : 0;
  }
  _armarPantalla() {
    const D = this.disp.pantalla, w = D.ancho, h = w / ASPECTO_DEMO;
    const piv = new THREE.Group;
    piv.name = "pantalla_juego";
    piv.visible = false;
    const mat = new THREE.MeshBasicMaterial({
      color: 16777215,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    pantalla.renderOrder = 4;
    const marco = new THREE.Mesh(new THREE.PlaneGeometry(w + .05, h + .05), new THREE.MeshBasicMaterial({
      color: 3099193,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    }));
    marco.renderOrder = 3;
    const radar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    }));
    radar.renderOrder = 5;
    radar.visible = false;
    piv.add(marco, pantalla, radar);
    this.escena.add(piv);
    this._pantalla = {
      pivote: piv,
      mat: mat,
      radar: radar,
      w: w,
      h: h,
      seg: null,
      rt: null,
      cam: new THREE.PerspectiveCamera(60, ASPECTO_DEMO, .03, 3e3),
      frame: -1,
      local: new THREE.Vector3,
      aux: new THREE.Vector3
    };
  }
  _radarPantalla(tex) {
    const P = this._pantalla, r = P.radar, img = tex?.image;
    r.visible = !!(img && img.width && img.height);
    if (!r.visible) return;
    if (r.material.map !== tex) {
      r.material.map = tex;
      r.material.needsUpdate = true;
    }
    const rw = P.w * .24, rh = rw * img.height / img.width, m = P.w * .025;
    r.scale.set(rw, rh, 1);
    r.position.set(P.w / 2 - m - rw / 2, P.h / 2 - m - rh / 2, 0);
  }
  get pantallaActiva() {
    return this._pantalla.frame >= this.frame - 1 && this._pantalla.frame >= 0;
  }
  _renderPantalla(R, cam, escena) {
    const P = this._pantalla;
    if (!P.rt) {
      const flotante = R.extensions?.has?.("EXT_color_buffer_float") || R.extensions?.has?.("EXT_color_buffer_half_float");
      P.rt = new THREE.WebGLRenderTarget(1024, Math.round(1024 / ASPECTO_DEMO), {
        type: flotante ? THREE.HalfFloatType : THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: true
      });
      P.mat.map = P.rt.texture;
      P.mat.needsUpdate = true;
    }
    cam.updateWorldMatrix(true, false);
    const sop = cam.parent && cam.parent !== escena ? cam.parent : null, sopVis = sop?.visible;
    const c = P.cam;
    cam.matrixWorld.decompose(c.position, c.quaternion, c.scale);
    c.fov = cam.fov;
    c.near = cam.near;
    c.far = cam.far;
    c.aspect = ASPECTO_DEMO;
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
    const prev = {
      target: R.getRenderTarget(),
      xr: R.xr.enabled,
      auto: R.autoClear,
      color: R.getClearColor(this._c).getHex(),
      alfa: R.getClearAlpha()
    };
    R.xr.enabled = false;
    if (sop) sop.visible = false;
    try {
      R.setRenderTarget(P.rt);
      R.autoClear = true;
      R.setClearColor(0, 1);
      R.render(escena, c);
    } finally {
      if (sop) sop.visible = sopVis;
      R.autoClear = prev.auto;
      R.setClearColor(prev.color, prev.alfa);
      R.xr.enabled = prev.xr;
      R.setRenderTarget(prev.target);
    }
  }
  _ubicarPantalla(dt) {
    const P = this._pantalla, D = this.disp.pantalla, c = this.cab, rig = this.cam?.parent || null;
    if (rig) rig.updateWorldMatrix(true, false);
    const local = v => rig ? rig.worldToLocal(v) : v;
    let s = P.seg;
    if (!s || !s.valida) s = P.seg = {
      yaw: c.yaw,
      local: local(c.pos.clone()),
      mover: false,
      valida: c.valida
    }; else {
      const dy = difAng(c.yaw, s.yaw);
      if (Math.abs(dy) > D.umbral) s.mover = true;
      if (s.mover) {
        s.yaw += dy * (1 - Math.exp(-dt * 4));
        if (Math.abs(dy) < 2 * GRADO) s.mover = false;
      }
      s.local.lerp(local(P.aux.copy(c.pos)), 1 - Math.exp(-dt * 1.5));
    }
    const origen = rig ? rig.localToWorld(P.local.copy(s.local)) : s.local;
    this._colocar(P.pivote, origen, s.yaw, D.pitchFijo ?? 0, 0, 0, D.dist);
  }
  _capaCine(demo) {
    const C = this._cine, k = 2, activa = !!(demo.activa && demo.escena);
    const t = demo.tiempo || 0, linea = !activa || demo._salida ? null : (demo.subtitulos || []).find(l => t >= l.t && t < l.t + l.d);
    const telops = activa ? (demo._telops || []).filter(tl => tl.visible && tl.png) : [];
    const mira = activa && demo.miraHud?.visible ? demo.miraHud : null;
    const cvJ = linea?.tj != null ? demo.lienzoSubtitulo?.(linea) : null;
    const firma = `${activa}|${demo.barras}|${linea?.texto ?? ""}|${cvJ ? linea.t : ""}|${telops.map(tl => `${tl.png}:${tl.x},${tl.y}:${Math.min(128, tl.shade)}`).join(";")}|${[ ...C.imgs.values() ].filter(i => i.complete).length}|${mira?.firma ?? ""}`;
    if (firma === C.firma) return;
    C.firma = firma;
    const x = this._cvCine.getContext("2d"), W = 320 * k, H = 224 * k;
    x.clearRect(0, 0, W, H);
    if (!activa) return void (this._texCapa.needsUpdate = true);
    x.imageSmoothingEnabled = false;
    if (mira) x.drawImage(mira.lienzo(320, 224, 0, 0, "_bufCine"), 0, 0, W, H);
    const img = png => {
      let i = C.imgs.get(png);
      if (!i) {
        i = new Image;
        i.src = (demo.base ?? "assets/") + png;
        C.imgs.set(png, i);
      }
      return i.complete && i.naturalWidth ? i : null;
    };
    for (const t0 of telops) {
      const dd = desplazamiento(t0.png), tl = dd ? {
        ...t0,
        x: t0.x + dd[0],
        y: t0.y + dd[1]
      } : t0;
      const op = Math.min(128, tl.shade) / 128;
      if (tl.png2) {
        const r2 = reemplazo(hashDeRuta(tl.png2)), i2 = r2?.listo ? r2.img : img(tl.png2);
        if (i2) {
          x.globalAlpha = op * .7;
          x.filter = "brightness(0)";
          x.drawImage(i2, tl.x * k, tl.y * k, (r2?.listo ? r2.w : tl.w2 || i2.naturalWidth) * k, (r2?.listo ? r2.h : tl.h2 || i2.naturalHeight) * k);
          x.filter = "none";
        }
      }
      const rl = reemplazo(hashDeRuta(tl.png));
      if (rl?.listo) {
        x.globalAlpha = op;
        x.drawImage(rl.img, tl.x * k, tl.y * k, rl.w * k, rl.h * k);
        continue;
      }
      const i = img(tl.png);
      if (i) {
        x.globalAlpha = op;
        x.drawImage(i, tl.x * k, tl.y * k, (tl.w || i.naturalWidth) * k, (tl.h || i.naturalHeight) * k);
      }
    }
    x.globalAlpha = 1;
    if (demo.barras !== false) {
      x.fillStyle = "#000";
      x.fillRect(0, 0, W, 24 * k);
      x.fillRect(0, H - 40 * k, W, 40 * k);
    }
    if (cvJ) {
      const kk = Math.max(1, Math.floor(Math.min((W - 8) / cvJ.width, (40 * k - 4) / cvJ.height)));
      x.drawImage(cvJ, W / 2 - cvJ.width * kk / 2, H - 2 * k - cvJ.height * kk, cvJ.width * kk, cvJ.height * kk);
    } else if (linea && linea.tj == null) {
      const filas = String(linea.texto).split("\n"), alto = 10.5 * k;
      x.font = `${Math.round(9.5 * k)}px "Trebuchet MS", Verdana, Arial, sans-serif`;
      x.textAlign = "center";
      x.textBaseline = "alphabetic";
      x.lineWidth = 3;
      x.strokeStyle = "#000";
      x.fillStyle = "#e8e8e8";
      filas.forEach((f, i) => {
        const y = H - 4 * k - (filas.length - 1 - i) * alto - 2;
        x.strokeText(f, W / 2, y);
        x.fillText(f, W / 2, y);
      });
    }
    this._texCapa.needsUpdate = true;
  }
  dibujar(R = this.R, cam = this.cam) {
    if (!this.activo || !this.xr.activo()) return false;
    for (const p of this._mostrados) if (!p.malla) this._subir(p);
    this._ponerBarras();
    const auto = R.autoClear;
    R.autoClear = false;
    try {
      if (!this._dibujandoSolo && this._mostrados.some(p => p.solo)) {
        R.clear();
        this._ponerGrilla(cam);
        R.render(this.fondo, cam);
      }
      R.render(this.escena, cam);
    } finally {
      R.autoClear = auto;
    }
    return true;
  }
  _armarBarras() {
    const P = this._pantalla, mat = () => new THREE.MeshBasicMaterial({
      color: 0,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    const arriba = new THREE.Mesh(this._plano, mat()), abajo = new THREE.Mesh(this._plano, mat());
    const ha = P.h * 24 / 240, hb = P.h * 40 / 240;
    arriba.scale.set(P.w, ha, 1);
    arriba.position.set(0, P.h / 2 - ha / 2, .001);
    abajo.scale.set(P.w, hb, 1);
    abajo.position.set(0, -P.h / 2 + hb / 2, .001);
    for (const m of [ arriba, abajo ]) {
      m.renderOrder = 6;
      m.visible = false;
      P.pivote.add(m);
    }
    const vista = new THREE.Mesh(new THREE.SphereGeometry(.28, 24, 16), new THREE.ShaderMaterial({
      uniforms: {
        uK: {
          value: 0
        }
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.BackSide,
      toneMapped: false,
      vertexShader: "varying vec4 vClip; void main() { vClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vClip; }",
      fragmentShader: "uniform float uK; varying vec4 vClip; void main() { if (vClip.w <= 0.0) discard; float y = vClip.y / vClip.w; if (y < 0.8 && y > -0.6667) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, uK); }"
    }));
    vista.renderOrder = 40;
    vista.visible = false;
    vista.frustumCulled = false;
    this.escena.add(vista);
    this._barras = {
      arriba: arriba,
      abajo: abajo,
      vista: vista,
      k: 0
    };
  }
  _ponerBarras() {
    const B = this._barras;
    if (!B) return;
    let k = 0;
    try {
      k = this._dibujandoSolo || this.cineActivo ? 0 : limitar(+this._barrasK?.() || 0, 0, 1);
    } catch {
      k = 0;
    }
    const enPantalla = k > 0 && this._pantalla.frame === this.frame;
    for (const m of [ B.arriba, B.abajo ]) {
      m.visible = enPantalla;
      m.material.opacity = k;
    }
    B.vista.visible = k > 0 && !enPantalla;
    B.vista.material.uniforms.uK.value = k;
    if (B.vista.visible) {
      B.vista.position.copy(this.cab.pos);
      B.vista.updateMatrixWorld(true);
    }
    B.k = k;
    B.donde = k > 0 ? enPantalla ? "pantalla" : "vista" : null;
  }
  get conPartida() {
    return this._mostrados.some(p => p.id === "partida");
  }
  dibujarSolo(R = this.R, cam = this.cam) {
    if (!this.activo || !this.xr.activo()) return false;
    this._ponerGrilla(cam);
    R.render(this.fondo, cam);
    this._dibujandoSolo = true;
    try {
      return this.dibujar(R, cam);
    } finally {
      this._dibujandoSolo = false;
    }
  }
  _ponerGrilla(cam = this.cam) {
    const padre = cam?.parent;
    if (padre) padre.updateWorldMatrix(true, false);
    if (padre) this.grilla.position.setFromMatrixPosition(padre.matrixWorld); else this.grilla.position.set(this.cab.pos.x, this.cab.pos.y - 1.6, this.cab.pos.z);
  }
  dibujarPantalla(R = this.R, cam = this.cam, escena = null, o = {}) {
    if (!this.activo || !this.xr.activo() || !escena || this.cineActivo) return false;
    this._renderPantalla(R, cam, escena);
    this._radarPantalla(o.radar || null);
    this._ubicarPantalla(this._dt || 1 / 72);
    this._pantalla.pivote.visible = true;
    this._pantalla.frame = this.frame;
    this._ponerGrilla(cam);
    R.render(this.fondo, cam);
    return true;
  }
  marcarCine(demo = this.demo) {
    this.demo = demo;
    this._frameCine = this.frame;
  }
  dibujarCine(R = this.R, cam = this.cam, demo = this.demo) {
    if (!this.activo || !this.xr.activo() || !demo) return false;
    this.demo = demo;
    this._frameCine = this.frame;
    this._renderDemo(R, demo);
    this._capaCine(demo);
    return this.dibujarSolo(R, cam);
  }
  estado() {
    const r = v => +v.toFixed(3);
    return {
      activo: this.activo,
      frame: this.frame,
      ocupaMandos: this.ocupaMandos,
      apuntando: this.apuntando,
      captura: this._captura?.id ?? null,
      cine: this.cineActivo,
      pantalla: this.pantallaActiva,
      manoActiva: this.manoActiva,
      barras: this._barras ? {
        k: r(this._barras.k),
        donde: this._barras.donde ?? null
      } : null,
      cabeza: {
        pos: this.cab.pos.toArray().map(r),
        yaw: r(this.cab.yaw / GRADO),
        pitch: r(this.cab.pitch / GRADO)
      },
      golpes: Object.fromEntries([ "left", "right" ].map(l => [ l, this._golpes[l] ? {
        panel: this._golpes[l].p.id,
        x: r(this._golpes[l].x),
        y: r(this._golpes[l].y)
      } : null ])),
      paneles: this.paneles.map(p => {
        const w = new THREE.Vector3;
        p.mesh.getWorldPosition(w);
        return {
          id: p.id,
          tipo: p.tipo,
          mostrado: p.mostrado,
          subidas: p.subidas,
          lw: p.lw,
          lh: p.lh,
          tex: p.tex ? [ p._tw, p._th ] : null,
          centro: w.toArray().map(r),
          dist: r(w.distanceTo(this.cab.pos)),
          ancho_m: r(p.mesh.scale.x * (p.malla ? p.mesh.geometry.parameters.width || 1 : 1))
        };
      })
    };
  }
}
