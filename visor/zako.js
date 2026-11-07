// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Juego, sonido } from "./juego.js";

import { clip } from "./anim.js";

import { ducto as ductoSnake } from "./ducto.js";

import { Rasen, RasenEl, navegador, agregarPiso, alturaEn } from "./torres.js";

import { Rapel, TIPOS_RAPEL } from "./rapel.js";

import { Demo11B } from "./demo11b.js";

export const MM = .001, FPS = 30, ANG = Math.PI * 2 / 4096;

const NO_POINT = 3e4;

const dirDe = (dx, dz) => (Math.round(Math.atan2(dx, dz) / ANG) % 4096 + 4096) % 4096;

const difAbs = (a, b) => {
  const d = ((a - b) % 4096 + 4096) % 4096;
  return d > 2048 ? 4096 - d : d;
};

const randU = n => Math.floor(Math.random() * 32767) & n - 1;

const ALT_SNAKE = [ 1100, 496, 136 ];

const DAÑO_BALA = [ 64, 64, 96, 128, 128 ];

const SE = {
  EXCLAMACION: 83,
  SIRENA: 42,
  PISO: 141
};

const VOZ = (com, id) => {
  const t2 = com.time % 2, t3 = com.time % 3;
  switch (id) {
   case 240:
    return 128;

   case 241:
    return 135;

   case 242:
    return 139;

   case 243:
    return 138;

   case 244:
    return 134;

   case 245:
    return 133;

   case 246:
    return t3 === 0 ? 130 : 129;

   case 247:
    return t2 === 0 ? 129 : 0;

   default:
    return id;
  }
};

const SOLDADOS = {
  ZAKO: {
    familia: "celda",
    anim: "enemy",
    vida: 192,
    desmayo: 255,
    "daño": 40,
    correr: [ 100, 100 ]
  },
  ZAKO11A: {
    familia: "escalera",
    anim: "ene_11a",
    vida: 384,
    desmayo: 7,
    "daño": 64,
    correr: [ 110, 130 ]
  },
  ZAKO10: {
    familia: "vigia",
    anim: "enemy",
    vida: 192,
    desmayo: 10,
    "daño": 64
  },
  ZAKO11E: {
    familia: "zonas",
    anim: "enemy",
    vida: 576,
    desmayo: 7,
    "daño": 64,
    kogaku: true
  },
  ZAKO11F: {
    familia: "pasarela",
    anim: "enemy",
    vida: 384,
    desmayo: 7,
    "daño": 64
  },
  ZAKO14: {
    familia: "zonas",
    anim: "enemy",
    vida: 768,
    desmayo: 7,
    "daño": 64
  },
  ZAKO19: {
    familia: "vigia",
    anim: "enemy",
    vida: 192,
    desmayo: 10,
    "daño": 64
  }
};

const ACCION_11E = [ [ 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1, 0 ], [ 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1, 0 ], [ 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 0 ], [ 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 0 ] ];

const ZONA_11E = [ [ 2, 10, 10, 2, 2, 10, 10, 2, 2, 5, 5, 5, 2, 0, 11, 0 ], [ 0, 9, 9, 0, 0, 8, 8, 11, 11, 0, 0, 2, 0, 11, 9, 0 ], [ 11, 3, 3, 1, 1, 9, 9, 1, 1, 6, 6, 0, 11, 9, 2, 0 ], [ 9, 2, 2, 5, 5, 0, 0, 3, 3, 11, 11, 11, 9, 2, 0, 0 ] ];

const ACCION_14 = [ [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0 ], [ 0, 0, 1, 0, 1, 2, 0, 1, 2, 0, 0, 1, 0, 0, 0, 0 ], [ 0, 1, 2, 0, 0, 1, 0, 0, 1, 0, 1, 2, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ];

const ZONA_14 = [ [ 0, 0, 3, 3, 3, 2, 2, 2, 3, 3, 3, 0, 0, 0, 0, 0 ], [ 1, 1, 2, 2, 32, 32, 3, 9, 9, 2, 2, 1, 0, 0, 0, 0 ], [ 3, 23, 23, 0, 0, 1, 1, 1, 0, 0, 6, 6, 0, 0, 0, 0 ], [ 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ] ];

const ACCION_11F = [ [ 2, 6, 1, 1, 6, 1, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0 ], [ 1, 6, 1, 1, 6, 1, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0 ], [ 1, 6, 1, 1, 6, 1, 1, 6, 1, 0, 0, 0, 0, 0, 0, 0 ] ];

const ZONA_11F = [ [ 1, 1, 13, 3, 3, 15, 7, 7, 255, 255, 0, 0, 0, 0, 0, 0 ], [ 3, 3, 15, 6, 6, 15, 7, 7, 255, 255, 0, 0, 0, 0, 0, 0 ], [ 10, 10, 17, 9, 9, 15, 7, 7, 255, 255, 0, 0, 0, 0, 0, 0 ] ];

const tabla = (t, i, f) => (t[i] || t[0])[f] ?? 0;

const DIST_ZONAS = [ 3e3, 4e3, 7e3, 8e3, 8e3, 8e3, 8e3, 8e3 ];

const DIST_11F = [ 3e3, 4e3, 4e3, 8e3, 8e3, 8e3, 8e3, 8e3 ];

const GRANADA_ZONAS = [ [ 5750, 0, -1e3 ], [ 6250, 0, 500 ], [ 5750, 0, 2e3 ] ];

const FLAGS_11E = {
  1: [ 60, 2 ],
  2: [ 90, 3 ],
  3: [ 60, 4 ],
  4: [ 90, 5 ],
  5: [ 60, 6 ],
  6: [ 90, 7 ],
  7: [ 60, 8 ],
  8: [ 90, 9 ],
  9: [ 120, 10 ],
  10: [ 90, 1 ],
  11: [ 90, 12 ],
  12: [ 120, 1 ],
  13: [ 120, 0 ]
};

const FLAGS_14 = {
  0: [ 180, 1 ],
  1: [ 60, 2 ],
  2: [ 90, 3 ],
  3: [ 180, 4 ],
  4: [ 60, 5 ],
  5: [ 90, 6 ],
  6: [ 180, 7 ],
  7: [ 60, 8 ],
  8: [ 90, 9 ],
  9: [ 180, 10 ],
  10: [ 60, 11 ],
  11: [ 90, 0 ],
  13: [ 90, 0 ]
};

const EYE_LENGTH = 4e3;

const COMANDANTES = {
  ZAKOCOM: "ZAKO",
  ZAKO10COM: "ZAKO10",
  ZAKO11ACOM: "ZAKO11A",
  ZAKO11ECOM: "ZAKO11E",
  ZAKO11FCOM: "ZAKO11F",
  ZAKO14COM: "ZAKO14",
  ZAKO19COM: "ZAKO19"
};

export const TIPOS_ZAKO = new Set([ ...Object.keys(SOLDADOS), ...Object.keys(COMANDANTES) ]);

export const esZako = actor => !!actor && TIPOS_ZAKO.has(actor.tipo);

const H_KILL = 12835;

const z1 = a => a & 255, z2 = a => a >> 8 & 255;

export { Rasen, RasenEl };

class MapaZako {
  constructor(m, hz, visible) {
    this.m = m;
    this.id = m.id;
    this.hz = hz;
    this.visible = visible;
    this.objs = [];
    this.apagados = [];
    this.nav = navegador(hz.zonas);
    this.suelo = {
      pisos: [],
      grilla: new Map
    };
    this.segs = [];
    for (const g of hz.grupos) {
      for (const f of g.pisos) agregarPiso(this.suelo, f.puntos.map(p => [ p[0] * MM, p[1] * MM, p[2] * MM ]));
      for (const w of g.paredes) this.segs.push({
        a: [ w.a[0] * MM, w.a[1] * MM, w.a[2] * MM ],
        b: [ w.b[0] * MM, w.b[1] * MM, w.b[2] * MM ],
        h: w.alto * MM,
        flags: w.flags
      });
    }
  }
  get propio() {
    return !this.visible;
  }
  async mostrar(ctx, nv) {
    if (this.visible || this.mostrado) return;
    this.mostrado = true;
    this.ctx = ctx;
    if (!ctx.cargar || !ctx.mundo) return;
    const nombres = new Set((nv.visibles?.length ? nv.visibles : [ nv.principal ]).flatMap(id => nv.mapas.find(x => x.id === id)?.kmds || []).map(h => h.toString(16).padStart(4, "0")));
    for (const o of ctx.mundo.children) if (o.visible && !o.userData.personaje && o.children.some(c => nombres.has(c.name))) {
      o.visible = false;
      this.apagados.push(o);
    }
    const piezas = await Promise.all((this.m.piezas || []).map(u => ctx.cargar(u).catch(() => null)));
    for (const o of piezas.filter(Boolean)) {
      o.traverse(x => {
        if (x.isMesh) x.userData.sinColision = true;
      });
      o.userData.mapaZako = this.id;
      ctx.mundo.add(o);
      ctx.teñir?.(o);
      this.objs.push(o);
    }
    const pisos = [], paredes = [];
    for (const g of this.hz.grupos) {
      for (const f of g.pisos) {
        const q = f.puntos.map(p => [ p[0] * MM, p[1] * MM, p[2] * MM ]);
        pisos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
      }
      for (const w of g.paredes) {
        if (w.flags & 1) continue;
        const a = [ w.a[0] * MM, w.a[1] * MM, w.a[2] * MM ], b = [ w.b[0] * MM, w.b[1] * MM, w.b[2] * MM ], hh = w.alto * MM;
        paredes.push(...a, ...b, b[0], b[1] + hh, b[2], ...a, b[0], b[1] + hh, b[2], a[0], a[1] + hh, a[2]);
      }
    }
    const malla = pos => {
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = true;
      return m;
    };
    this.mallas = {
      pisos: malla(pisos),
      paredes: malla(paredes)
    };
    for (const [k, m] of Object.entries(this.mallas)) {
      ctx.mundo.add(m);
      this.objs.push(m);
      if (Array.isArray(ctx[k])) ctx[k].push(m);
    }
    ctx.recalcular?.();
  }
  destruir() {
    for (const o of this.objs) o.removeFromParent();
    for (const o of this.apagados) o.visible = true;
    if (this.mallas && this.ctx) for (const [k, m] of Object.entries(this.mallas)) {
      const l = this.ctx[k];
      const i = Array.isArray(l) ? l.indexOf(m) : -1;
      if (i >= 0) l.splice(i, 1);
    }
    if (this.mostrado) this.ctx?.recalcular?.();
    this.objs = [];
    this.apagados = [];
  }
}

function animador(obj, datos) {
  const raiz = obj.getObjectByName("hueso_0"), base = raiz ? raiz.position.toArray() : [ 0, 0, 0 ];
  const mx = new THREE.AnimationMixer(obj), acciones = {};
  let actual = null;
  return {
    mx: mx,
    tocar(nombre, {fundido: fundido = .25, loop: loop = true, offset: offset = 0} = {}) {
      if (actual?.nombre === nombre) return actual.accion;
      if (!acciones[nombre]) {
        const c = clip(datos, nombre, base);
        if (!c) return null;
        acciones[nombre] = mx.clipAction(c);
      }
      const a = acciones[nombre];
      a.reset();
      a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
      a.clampWhenFinished = !loop;
      a.time = offset;
      a.play();
      if (actual) actual.accion.crossFadeTo(a, fundido, false);
      actual = {
        nombre: nombre,
        accion: a
      };
      return a;
    },
    get actual() {
      return actual?.nombre;
    }
  };
}

const cacheAnim = new Map;

function cargarAnim(nombre) {
  if (!cacheAnim.has(nombre)) cacheAnim.set(nombre, fetch(`assets/anim/${nombre}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
  return cacheAnim.get(nombre);
}

export class Zakos {
  static de(J, ctx = {}) {
    if (!J.__zakos) J.__zakos = new Zakos(J, ctx); else Object.assign(J.__zakos.ctx, ctx);
    mgrActual = J.__zakos;
    return J.__zakos;
  }
  camJuego() {
    return this.ctx.camJuego?.() ?? (typeof window !== "undefined" ? window.__mgs?.camJuego : null) ?? null;
  }
  din() {
    return this.ctx.din?.() ?? (typeof window !== "undefined" ? window.__mgs?.din : null) ?? null;
  }
  constructor(J, ctx) {
    this.J = J;
    this.ctx = ctx;
    this.soldados = [];
    this.comandantes = new Map;
    this.granadas = [];
    this.frame = 0;
    this.rasen = null;
    this.rasenEl = null;
    this.rapel = null;
    this.demo11b = null;
    this.enCuadro = false;
    this.porUpdate = false;
    this.registro = [];
    this.mapas = new Map;
    this.mapasListos = new Map;
    this.snakePrev = J.ctx.rig.position.clone();
    this.snakeMueve = false;
    this.instalar();
  }
  instalar() {
    const J = this.J, m = this;
    const cuadro = J.cuadro.bind(J), activos = J.activos.bind(J), bala = J.bala.bind(J), destruir = J.destruir.bind(J), update = J.update.bind(J), cDespues = J.comandanteDespues.bind(J);
    J.activos = () => {
      const l = activos();
      return m.enCuadro ? l.filter(g => !g.__zako?.propio) : l;
    };
    J.cuadro = () => {
      m.antes();
      m.enCuadro = true;
      try {
        cuadro();
      } finally {
        m.enCuadro = false;
      }
      m.cuadro();
    };
    J.update = dt => {
      m.porUpdate = true;
      try {
        update(dt);
      } finally {
        m.porUpdate = false;
      }
      if (dt > 0) m.animar(dt);
    };
    J.bala = g => g?.__zako ? g.__zako.bala() : bala(g);
    J.comandanteDespues = () => {
      cDespues();
      m.despuesComandante();
    };
    J.destruir = () => {
      m.destruir();
      destruir();
    };
  }
  log(t, d) {
    this.registro.push({
      f: this.frame,
      t: t,
      ...d
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  mapa(id) {
    if (this.mapas.has(id)) return this.mapas.get(id);
    const nv = this.ctx.nivel, m = nv?.mapas?.find(x => x.id === id) || nv?.mapas?.find(x => x.id === nv?.principal);
    const f = m?.hzm_json?.[0];
    const p = !f ? Promise.resolve(null) : (async () => {
      let hz = this.ctx.hzm?.(f);
      if (!hz) hz = await (await fetch("assets/" + f)).json();
      const visible = (nv.visibles?.length ? nv.visibles : [ nv.principal ]).includes(m.id) || !!this.ctx.mapaVisible?.(m.id);
      const M = new MapaZako(m, hz, visible);
      this.mapasListos.set(id, M);
      if (m.id !== id) this.mapasListos.set(m.id, M);
      return M;
    })().catch(e => {
      console.warn("[zako] mapa", id, e);
      return null;
    });
    this.mapas.set(id, p);
    return p;
  }
  agregarComandante(c) {
    const v = this.comandantes.get(c.soldado);
    if (v && v !== c) v.destruir();
    this.comandantes.set(c.soldado, c);
    return c;
  }
  comandanteDe(tipo) {
    return this.comandantes.get(tipo) || null;
  }
  maestro() {
    for (const c of this.comandantes.values()) if (c.vivo && c.mandaAlerta) return c;
    return null;
  }
  antes() {
    const c = this.maestro();
    if (c && c.alerta > 0) this.J.alertaExterna(c.alerta);
  }
  despuesComandante() {
    const c = this.maestro();
    if (!c) return;
    const J = this.J;
    if (c.modo === 0 && J.com.modo === 2) J.ponerModo(0);
  }
  cuadro() {
    this.frame++;
    const r = this.J.ctx.rig.position;
    this.snakeMueve = Math.hypot(r.x - this.snakePrev.x, r.z - this.snakePrev.z) > .004;
    this.snakePrev.copy(r);
    if (this.rasen) {
      const R = this.rasen, cam = this.camJuego();
      if (cam && R.cam !== cam) R.instalarCamara(cam);
      if (cam && R.cam === cam && R._datosCam !== cam.datos) {
        R._datosCam = cam.datos;
        R.ajustarTrampas(null, cam);
      }
      R.cuadro();
      const c = this.rasen.actualizar(r);
      if (c) {
        this.log("rasen", {
          seccion: this.rasen.seccion,
          cambio: c
        });
        for (const z of this.soldados) z.cambioSeccion?.(c);
        for (const k of this.comandantes.values()) k.jugadorAddr = 65535;
      }
    }
    this.rasenEl?.cuadro();
    this.rapel?.cuadro();
    if (this.demo11b?.vivo) this.demo11b.cuadro();
    for (const c of [ ...this.comandantes.values() ]) if (c.vivo) c.cuadro();
    for (const z of this.soldados.slice()) if (z.listo && z.propio) z.cuadro();
    this.cuadroGranadas();
    if (!this.porUpdate) this.animar(1 / FPS);
  }
  animar(dt) {
    for (const z of this.soldados) z.an?.mx.update(dt);
  }
  granada(o, paso, espoleta) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({
      color: 3820074
    }));
    m.userData.sinColision = true;
    m.position.copy(o);
    this.J.ctx.mundo.add(m);
    this.granadas.push({
      p: o.clone(),
      paso: paso.clone(),
      espoleta: espoleta,
      rebotes: 0,
      obj: m
    });
  }
  cuadroGranadas() {
    const J = this.J;
    for (const g of this.granadas.slice()) {
      const q = g.p.clone().add(g.paso);
      const piso = J.alturaPiso(q.x, q.z, q.y + .3) ?? (this.rasen ? alturaEn(this.rasen.suelo, q.x, q.z, q.y + .3) : null) ?? -1e9;
      if (q.y <= piso + .05 && g.paso.y <= 0) {
        q.y = piso + .05;
        g.paso.y = -g.paso.y / 8;
        g.paso.x /= 4;
        g.paso.z /= 4;
        if (g.paso.y < 5 * MM) g.paso.set(0, 0, 0);
        if (++g.rebotes < 3) sonido(43, q);
      } else g.paso.y -= 16 * MM;
      g.p.copy(q);
      g.obj.position.copy(q);
      if (--g.espoleta <= 0) {
        this.granadas.splice(this.granadas.indexOf(g), 1);
        g.obj.removeFromParent();
        this.log("granada", {
          p: g.p.toArray().map(v => Math.round(v * 1e3))
        });
        if (this.ctx.armas?.explosion) this.ctx.armas.explosion(g.p.clone()); else {
          const s = J.ctx.rig.position;
          if (Math.abs(s.x - g.p.x) < 2.3 && Math.abs(s.z - g.p.z) < 2.3 && Math.abs(s.y + .5 - g.p.y) < 2.5) J.dañoSnake(64, 2);
          J.setRuido(255, 32, g.p);
        }
      }
    }
  }
  async crearRasenEl(a) {
    if (this.rasenEl) {
      this.rasenEl.destruir();
      this.rasenEl = null;
    }
    let datos = this.rasen?.d?.ascensor;
    if (!datos) {
      try {
        datos = (await (await fetch(`assets/niveles/${this.ctx.st || this.ctx.nivel?.id}/rasen.json`)).json()).ascensor;
      } catch {
        datos = null;
      }
    }
    const E = new RasenEl(a, datos, {
      ...this.ctx,
      juego: this.J,
      camJuego: () => this.camJuego()
    }, this.rasen);
    this.rasenEl = E;
    a._rasenEl = E;
    await E.armar();
    this.log("rasen_el", {
      nombre: a.nombre,
      estado: E.estado,
      f230: E.f230,
      procs: [ E.procArriba, E.procAbajo ].map(x => x.toString(16))
    });
    return E;
  }
  destruir() {
    for (const z of this.soldados.slice()) z.destruir();
    for (const c of this.comandantes.values()) c.destruir();
    for (const g of this.granadas) g.obj.removeFromParent();
    this.soldados = [];
    this.comandantes.clear();
    this.granadas = [];
    this.rasenEl?.destruir();
    this.rasenEl = null;
    this.rapel?.destruir();
    this.rapel = null;
    this.demo11b?.destruir();
    this.demo11b = null;
    this.rasen?.destruir();
    this.rasen = null;
    for (const M of this.mapasListos.values()) M.destruir();
    this.mapas.clear();
    this.mapasListos.clear();
  }
}

class Comandante {
  constructor(actor, mgr) {
    this.actor = actor;
    this.mgr = mgr;
    this.ctx = mgr.ctx;
    this.J = mgr.J;
    this.tipo = actor.tipo;
    this.soldado = COMANDANTES[actor.tipo];
    this.opts = actor.opts || {};
    this.vivo = true;
    this.mandaAlerta = false;
    this.time = 0;
    this.time2 = 0;
    this.alerta = 0;
    this.modo = 0;
    this.tiempoAlerta = 0;
    this.vigias = Array.from({
      length: 8
    }, () => ({
      f0: 0,
      f4: 0,
      f8: 0,
      z: null
    }));
    this.muertes = 0;
    this.f10C = 0;
    this.top = 0;
    this.sonidoT = 0;
    this.nVigias = (this.opts.n || []).filter(v => v && typeof v === "object" && "proc" in v).length || 1;
    this.zonas = this.nums("v");
    if (!this.zonas.length) this.zonas = [ 0 ];
    this.procFin = this.proc("e");
    this.jugador = {
      addr: 65535,
      pos: new THREE.Vector3(NO_POINT, NO_POINT, NO_POINT),
      map: 0
    };
  }
  nums(k) {
    return (this.opts[k] || []).filter(x => typeof x === "number");
  }
  proc(k, i = 0) {
    const v = (this.opts[k] || []).filter(x => x && typeof x === "object" && "proc" in x)[i];
    return v ? v.proc : -1;
  }
  correr(pid, motivo) {
    if (pid < 0) return false;
    this.mgr.log("proc", {
      com: this.tipo,
      proc: pid,
      motivo: motivo
    });
    try {
      const g = this.ctx.guion;
      if (g?.correrProc) {
        g.correrProc(pid);
        return true;
      }
    } catch (e) {
      console.warn("[zako] proc", pid, e);
    }
    return false;
  }
  registrar(z) {
    for (let i = 0; i < 8; i++) if (!this.vigias[i].z) {
      this.vigias[i].z = z;
      this.vigias[i].f4 = 2;
      return i;
    }
    return -1;
  }
  soltar(i) {
    if (i >= 0 && this.vigias[i]) {
      this.vigias[i].z = null;
      this.vigias[i].f4 = 1;
    }
  }
  posSnake() {
    const r = this.J.ctx.rig.position, p = this.J.postura?.() ?? 0;
    return new THREE.Vector3(r.x, r.y + ALT_SNAKE[p] * MM, r.z);
  }
  sonidos() {
    if (--this.sonidoT < 0) this.sonidoT = 0;
    if (this.sonidoT > 0) {
      for (const v of this.vigias) if (v.z?.g) v.z.g.pad.sound = 0;
      return;
    }
    let id = 0, dist = 1e5, quien = null;
    for (let i = 0; i < this.nVigias; i++) {
      const v = this.vigias[i];
      if (v.f4 !== 2 || !v.z?.g) continue;
      const z = v.z;
      if (z.g.pad.sound && z.snDis < dist) {
        id = z.g.pad.sound;
        dist = z.snDis;
        quien = z;
      }
      z.g.pad.sound = 0;
    }
    if (id) {
      this.sonidoT = 30;
      const se = VOZ(this, id);
      if (se) {
        sonido(se, null);
        this.mgr.log("voz", {
          id: id,
          se: se,
          de: quien?.nombre
        });
      }
    }
  }
  alertas(maxNivel, reiniciaMuertes = true) {
    if (this.alerta - maxNivel > 4) this.alerta -= 4; else this.alerta = maxNivel;
    if (this.alerta < this.top) this.alerta = this.top;
    this.top = 0;
    const antes = this.modo;
    if (this.modo === 0) {
      if (this.alerta >= 255) {
        this.alerta = 255;
        this.modo = 1;
        if (reiniciaMuertes) this.muertes = 0;
      }
    } else if (this.modo === 1) {
      if (this.alerta <= 0) {
        this.modo = 2;
        this.tiempoAlerta = 0;
      }
    } else {
      if (--this.tiempoAlerta <= 0) {
        this.modo = 0;
        this.tiempoAlerta = 0;
      }
      if (this.alerta >= 255) {
        this.alerta = 255;
        this.modo = 1;
        if (reiniciaMuertes) this.muertes = 0;
      }
    }
    if (antes !== this.modo) this.mgr.log("modo", {
      com: this.tipo,
      modo: this.modo
    });
  }
  actualizarJugador(nav) {
    if (!nav) return;
    const a = nav.direccion(this.J.ctx.rig.position, this.jugadorAddr ?? 65535);
    this.jugadorAddr = a;
    if (z1(a) === z2(a) && z1(a) !== 255) this.jugador = {
      addr: a,
      pos: this.posSnake(),
      map: this.actor.mapa ?? 0
    };
  }
  vigiasSinRevivir() {
    let mx = 0;
    for (let i = 0; i < this.nVigias; i++) {
      const v = this.vigias[i];
      if (v.f4 === 2 && v.z) mx = Math.max(mx, v.z.alerta); else if (v.f4 === 1) this.reviviendo(v, 0);
    }
    return mx;
  }
  quedan() {
    return this.vigias.some(v => v.z);
  }
  reviviendo(v, limite, alRevivir) {
    switch (v.f8) {
     case 0:
      if (v.f4 === 1) {
        v.f8 = 1;
        v.f0 = 1;
        this.muertes++;
      }
      break;

     case 1:
      if (--v.f0 <= 0) {
        v.f8 = 2;
        v.f0 = 0;
      }
      break;

     case 2:
      if (this.modo === 0 && this.f10C & 1 || this.modo === 1 && this.muertes < limite) {
        alRevivir?.();
        v.f4 = 2;
        v.f8 = 0;
      }
      break;
    }
  }
  cuadro() {
    this.time++;
  }
  destruir() {
    this.vivo = false;
  }
}

class ComandanteEscalera extends Comandante {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.mandaAlerta = true;
    this.gameflag = 0;
    this.procInicio = this.proc("t");
    this.procInicio2 = this.proc("u");
  }
  enZonaPersecucion(p) {
    const x = p.x * 1e3, z = p.z * 1e3;
    return !(x < -8e3 || x > -3e3 || z < -12500 || z > -6e3);
  }
  flags() {
    const J = this.J, R = this.mgr.rasen;
    if (J.muerto || J.vida <= 0) return;
    const nivel = R ? R.seccion : 0, a = this.jugadorAddr, a1 = z1(a), a2 = z2(a);
    const antes = this.gameflag, en = (z, s) => a1 === a2 && a1 === z && nivel === s;
    switch (this.gameflag) {
     case 0:
      if (en(24, 0)) {
        this.gameflag = 1;
        this.ctx.vibrar?.(10);
        this.correr(this.procInicio, "FLAG1 (-t)");
        this.procInicio = -1;
      }
      if (a1 > 13 && a1 < 24 && nivel === 0 && J.ruido.p === 255 && this.enZonaPersecucion(J.ruido.pos)) {
        this.gameflag = 1;
        this.ctx.vibrar?.(10);
        this.correr(this.procInicio2, "FLAG1 por explosión (-u)");
        this.procInicio2 = -1;
      }
      break;

     case 1:
      if (en(56, 0)) this.gameflag = 2;
      break;

     case 2:
      if (en(68, 0)) this.gameflag = 3;
      break;

     case 3:
      if (en(11, 1)) this.gameflag = 4;
      break;

     case 4:
     case 5:
     case 6:
     case 7:
      {
        const sig = {
          4: 24,
          5: 36,
          6: 44,
          7: 52
        }[this.gameflag];
        if (a1 === a2) {
          if (a1 === sig && nivel === 1) this.gameflag++; else if (a1 === 10 && nivel === 1) this.gameflag = 3;
        }
        break;
      }

     case 8:
      if (en(12, 2)) this.gameflag = 9;
      break;

     case 9:
      if (en(40, 2)) this.gameflag = 10;
      break;

     case 10:
      if (this.modo === 0) {
        this.gameflag = 16;
        this.time2 = 0;
      }
      if (this.alerta < 180 && this.procFin >= 0) {
        this.correr(this.procFin, "fin (-e)");
        this.procFin = -1;
      }
      break;

     case 16:
      this.gameflag = this.vigias.some(v => v.z) ? 16 : 17;
      break;
    }
    if (antes !== this.gameflag) this.mgr.log("flag", {
      com: this.tipo,
      flag: this.gameflag,
      zona: a1,
      seccion: nivel
    });
    this.time2++;
  }
  cuadro() {
    const R = this.mgr.rasen, nav = R ? R.nav() : this.J, r = this.J.ctx.rig.position;
    this.jugadorAddr = nav.direccion(r, this.jugadorAddr ?? 65535);
    this.flags();
    this.jugador = {
      addr: this.jugadorAddr,
      pos: this.posSnake(),
      map: R ? R.seccion : 0
    };
    let mx = 0;
    for (let i = 0; i < this.nVigias; i++) {
      const v = this.vigias[i];
      if (v.f4 === 2 && v.z) mx = Math.max(mx, v.z.alerta); else if (v.f4 === 1) this.reviviendo(v, 256);
    }
    this.sonidos();
    this.alertas(mx);
    this.f10C = 0;
    this.time++;
    if (this.gameflag === 16) for (const v of this.vigias) if (v.z) v.z.destruir("flag 16");
    if (this.gameflag === 17) {
      this.mgr.log("fin", {
        com: this.tipo
      });
      this.destruir();
    }
  }
}

class ComandanteCelda extends Comandante {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.mandaAlerta = true;
    this.flag = 0;
    this.serie = 0;
    this.voces = this.nums("s");
    this.a = (this.opts.a || []).filter(x => x && typeof x === "object" && "proc" in x).map(x => x.proc);
    while (this.a.length < 8) this.a.push(-1);
    this.zonaLejos = 0;
  }
  vox(i, motivo) {
    const id = this.voces[i];
    if (!id) return;
    this.mgr.log("vox", {
      com: this.tipo,
      id: id,
      motivo: motivo
    });
    this.ctx.voz?.(id);
  }
  sinControl(si) {
    this.ctx.congelar?.(si);
    this.mgr.log("pad", {
      com: this.tipo,
      sinControl: si
    });
  }
  flags() {
    const J = this.J;
    if (J.muerto || J.vida <= 0) return;
    const m = this.muertes, antes = this.flag;
    switch (this.flag) {
     case 0:
      if (this.time2 === 0) this.voxPre = this.voces[0];
      if (m !== 0) {
        this.flag = 1;
        this.time2 = 0;
      }
      this.time2++;
      break;

     case 1:
      if (m < 3) return;
      this.flag = 2;
      this.time2 = 0;
      this.sinControl(true);
      return;

     case 2:
      if (this.time2 === 0) {
        this.vox(0, "FLAG2");
        this.correr(this.a[5], "FLAG2 Snake a la ventana");
      }
      if (this.time2 >= 11) {
        this.flag = 3;
        this.time2 = 0;
      }
      this.time2++;
      break;

     case 3:
      if (this.time2 >= 31) {
        this.correr(this.a[0], "FLAG3 cámara");
        this.flag = 4;
        this.time2 = 0;
      }
      this.time2++;
      break;

     case 4:
      if (this.time2 >= 61) {
        this.vox(1, "FLAG4");
        this.correr(this.a[1], "FLAG4 cámara");
        this.flag = 5;
        this.time2 = 0;
      }
      this.time2++;
      break;

     case 5:
      if (this.time2 === 60) {
        this.correr(this.a[2], "FLAG5 cámara");
        this.flag = 6;
        this.time2 = 0;
      }
      this.time2++;
      break;

     case 6:
      if (this.time2 === 30) this.correr(this.a[3], "FLAG6 cámara");
      if (this.time2 === 180) this.correr(this.a[4], "FLAG6 vuelve la cámara");
      if (this.time2 >= 183) {
        this.flag = 8;
        this.time2 = 0;
        this.sinControl(false);
      }
      this.time2++;
      break;

     case 8:
      if (m === 13 || m === 14) {
        this.flag = 9;
        this.time2 = 0;
      }
      this.time2++;
      break;

     case 9:
      if (m >= 15) {
        this.flag = 10;
        this.time2 = 0;
      }
      break;

     case 10:
      {
        const t = this.time2;
        this.time2 = t + 2;
        if (t + 1 >= 31) {
          this.flag = 11;
          this.time2 = 0;
        }
        break;
      }

     case 11:
      {
        const t = this.time2;
        this.time2 = t + 2;
        if (t + 1 >= 221) this.flag = 12;
        break;
      }

     case 12:
      if (m >= 17) {
        this.flag = 13;
        this.time2 = 0;
      }
      break;

     case 13:
      if (this.modo === 0) {
        this.flag = 14;
        this.time2 = 0;
        if (this.vigias.some(v => v.z)) this.flag = 13;
      }
      break;

     case 14:
      if (this.time2 >= 31) this.flag = 15;
      this.time2++;
      break;
    }
    if (antes !== this.flag) this.mgr.log("flag", {
      com: this.tipo,
      flag: this.flag,
      muertes: m
    });
  }
  cuadro() {
    this.flags();
    const r = this.J.ctx.rig.position, a = this.J.direccion(r, this.jugadorAddr ?? 65535);
    this.jugadorAddr = a;
    if (z1(a) === z2(a) && z1(a) !== 255) this.jugador = {
      addr: a,
      pos: this.posSnake(),
      map: 0
    };
    let mx = 0;
    for (let i = 0; i < this.nVigias; i++) {
      const v = this.vigias[i];
      if (v.f4 === 2 && v.z) mx = Math.max(mx, v.z.alerta); else if (v.f4 === 1) this.reviviendo(v, 16, () => this.zonaMasLejos());
    }
    this.sonidos();
    this.alertas(mx);
    this.f10C = 0;
    this.time++;
    if (this.flag === 15) {
      this.mgr.log("fin", {
        com: this.tipo
      });
      this.correr(this.procFin, "fin (-e)");
      this.procFin = -1;
      this.destruir();
    }
  }
  zonaMasLejos() {
    const s = this.posSnake();
    let d1 = 0, k = 0;
    this.zonas.forEach((z, i) => {
      const Z = this.J.zonas[z];
      if (!Z) return;
      const d = Math.hypot(Z.p.x - s.x, Z.p.z - s.z);
      if (d1 < d) {
        d1 = d;
        k = i;
      }
    });
    this.zonaLejos = k;
  }
}

class ComandanteZonas extends Comandante {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.mandaAlerta = true;
    this.flag = 0;
    this.time2 = 0;
    this.es11E = actor.tipo === "ZAKO11ECOM";
    this.vozB = this.nums("b")[0] || 0;
    this.procAlerta = this.proc("k");
    this.procQuince = this.proc("m");
    mgr.mapa(actor.mapa).then(M => {
      this.mapaZ = M;
    });
  }
  get gameflag() {
    return this.flag;
  }
  sinControl(si) {
    if (this.congelado === si) return;
    this.congelado = si;
    this.ctx.congelar?.(si);
    this.mgr.log("pad", {
      com: this.tipo,
      sinControl: si
    });
  }
  flags() {
    const J = this.J, antes = this.flag, m = this.muertes;
    if (this.es11E) {
      if (J.muerto || J.vida <= 0) return;
      if (this.flag === 0) {
        this.sinControl(true);
        if (!this.vozDada && this.vozB) {
          this.vozDada = true;
          this.ctx.voz?.(this.vozB);
          this.mgr.log("vox", {
            com: this.tipo,
            id: this.vozB
          });
        }
        if (this.time2 > 90) {
          this.flag = 1;
          this.time2 = 0;
          this.sinControl(false);
        }
      } else if (FLAGS_11E[this.flag]) {
        const [t, sig] = FLAGS_11E[this.flag];
        if (this.time2 > t) {
          this.flag = sig;
          this.time2 = 0;
        }
        if (m > 3) this.flag = 15;
      } else if (this.flag === 15) {
        if (this.modo === 0) this.flag = this.quedan() ? 15 : 16;
        if (this.procQuince >= 0) {
          this.correr(this.procQuince, "flag 15 (-m)");
          this.procQuince = -1;
        }
      }
    } else {
      if (FLAGS_14[this.flag]) {
        const [t, sig] = FLAGS_14[this.flag];
        if (this.time2 > t) {
          this.flag = sig;
          this.time2 = 0;
        }
        if (m > 2) this.flag = 15;
      } else if (this.flag === 15) {
        if (this.modo === 0) this.flag = this.quedan() ? 15 : 16;
        if (!J.muerto && J.vida > 0 && this.procFin >= 0) {
          this.correr(this.procFin, "murieron 3 (-e)");
          this.procFin = -1;
        }
      }
    }
    if (antes !== this.flag) this.mgr.log("flag", {
      com: this.tipo,
      flag: this.flag,
      muertes: m
    });
    this.time2++;
  }
  cuadro() {
    this.flags();
    this.actualizarJugador(this.mapaZ?.nav);
    const mx = this.vigiasSinRevivir();
    this.sonidos();
    const antes = this.modo;
    this.alertas(mx, false);
    if (this.es11E && antes === 0 && this.modo === 1) this.correr(this.procAlerta, "alerta (-k)");
    this.f10C = 0;
    this.time++;
    if (this.flag === 16) {
      this.mgr.log("fin", {
        com: this.tipo
      });
      if (this.es11E) this.correr(this.procFin, "Die (-e)");
      if (this.congelado) this.sinControl(false);
      this.destruir();
    }
  }
}

class ComandantePasarela extends Comandante {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.mandaAlerta = false;
    this.flag = 0;
    this.time2 = 0;
    this.f114 = 0;
    this.f112 = 0;
    this.primerDaño = 0;
    this.procsA = (this.opts.a || []).filter(x => x && typeof x === "object" && "proc" in x).map(x => x.proc);
    mgr.mapa(actor.mapa).then(M => {
      this.mapaZ = M;
    });
  }
  get gameflag() {
    return this.flag;
  }
  "alDaño"() {
    if (this.primerDaño === 0) {
      this.f112 = 5;
      this.primerDaño = 1;
      this.mgr.log("primer daño", {
        com: this.tipo
      });
    }
  }
  alMatar(z) {
    this.f112 = 5;
    this.f114++;
    this.mgr.log("cae", {
      com: this.tipo,
      de: z?.nombre,
      f114: this.f114
    });
  }
  "dañoReciente"() {
    return this.f112 > 0;
  }
  snake() {
    const r = this.J.ctx.rig.position;
    return {
      x: r.x * 1e3,
      z: r.z * 1e3
    };
  }
  enPasarela(arg) {
    const s = this.snake();
    return !(s.x < 4500 || s.x > 7500 || s.z < -16e3 || arg === 1 && s.z > 6e3);
  }
  alFondo(arg) {
    const s = this.snake();
    return arg === 0 ? s.z <= -15e3 : s.z <= -13e3;
  }
  flags() {
    const f = this.f114, antes = this.flag;
    const a = n => {
      this.flag = n;
      this.time2 = 0;
    };
    switch (this.flag) {
     case 0:
      if (f !== 0) a(2); else if (this.enPasarela(1)) a(1);
      break;

     case 1:
      if (f !== 0) a(2); else if (!this.enPasarela(0)) a(0); else if (this.alFondo(0)) a(9);
      break;

     case 2:
      if (this.time2 > 150) a(3);
      break;

     case 3:
      if (f > 1) a(5); else if (this.enPasarela(0)) {
        if (this.time2 > 120 || this.enPasarela(1)) a(4);
      } else if (this.alFondo(0)) a(9); else this.time2 = 0;
      break;

     case 4:
      if (f > 1) a(5); else if (!this.enPasarela(0)) a(3); else if (this.alFondo(0)) a(9); else this.time2 = 0;
      break;

     case 5:
      if (this.time2 > 60) a(6);
      break;

     case 6:
      if (f > 2) a(8); else if (this.time2 >= 2) a(7);
      break;

     case 7:
      if (f > 2) a(8); else if (this.time2 > 60) a(5); else if (this.alFondo(0)) a(9);
      break;

     case 8:
      if (f > 2) a(15);
      break;

     case 9:
      if (!this.alFondo(1)) {
        if (f === 0) this.flag = 1; else if (f === 1) this.flag = 4; else if (f === 2) this.flag = 7;
        this.time2 = 0;
      }
      if (this.muertes > 2) a(8);
      break;

     case 13:
      if (this.time2 > 60) a(0);
      break;

     case 15:
      if (this.modo === 2) {
        this.flag = this.quedan() ? 15 : 16;
        if (this.flag === 16) this.correr(this.procFin, "flag 16 (-e)");
      }
      break;
    }
    if (antes !== this.flag) this.mgr.log("flag", {
      com: this.tipo,
      flag: this.flag,
      f114: f,
      muertes: this.muertes
    });
    this.time2++;
  }
  cuadro() {
    this.flags();
    this.actualizarJugador(this.mapaZ?.nav);
    const mx = this.vigiasSinRevivir();
    this.sonidos();
    if (this.alerta - mx > 4) this.alerta -= 4; else this.alerta = mx;
    const antes = this.modo;
    switch (this.modo) {
     case 0:
      if (this.flag === 1 || this.flag === 2 || this.primerDaño === 1) {
        this.primerDaño = 2;
        this.alerta = 255;
        this.modo = 1;
        if (this.procsA[0] >= 0) this.correr(this.procsA[0], "alerta (-a)");
      }
      break;

     case 1:
      if (this.alerta <= 0) {
        this.modo = 2;
        this.tiempoAlerta = 0;
      }
      break;

     case 2:
      this.tiempoAlerta--;
      break;
    }
    if (antes !== this.modo) this.mgr.log("modo", {
      com: this.tipo,
      modo: this.modo
    });
    if (--this.f112 < 0) this.f112 = 0;
    this.time++;
    if (this.flag === 16) {
      this.mgr.log("fin", {
        com: this.tipo
      });
      this.destruir();
    }
  }
}

class ComandanteVigia extends Comandante {
  cuadro() {
    this.time++;
    let muertos = 0;
    for (const z of this.mgr.soldados) if (z.comandante === this && z.g && (z.g.faseout || z.g.borrado)) muertos++;
    this.muertes = muertos;
  }
}

const PATRON_11A = [ [ [ 1, 0, 1, 255 ], [ 1, 0, 1, 255 ], [ 1, 0, 1, 255 ], [ 1, 0, 1, 255 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 1, 0, 1, 255 ], [ 1, 0, 1, 255 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 3, 1, 1, 63 ], [ 1, 0, 1, 255 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 1, 0, 1, 255 ], [ 1, 0, 1, 255 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 3, 1, 1, 16 ], [ 3, 1, 1, 20 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 3, 1, 1, 29 ], [ 3, 1, 1, 32 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 1, 0, 1, 255 ], [ 3, 1, 1, 41 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 3, 1, 1, 47 ], [ 3, 1, 1, 49 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 1, 0, 1, 255 ], [ 1, 0, 1, 255 ] ], [ [ 0, 2, 0, 255 ], [ 0, 2, 0, 255 ], [ 1, 0, 1, 255 ], [ 0, 2, 0, 255 ] ], [ [ 0, 2, 1, 255 ], [ 0, 2, 1, 255 ], [ 0, 2, 1, 255 ], [ 0, 2, 1, 255 ] ] ];

const patron = (f, i) => {
  const p = (PATRON_11A[f] || [])[i] || [ 0, 0, 0, 0 ];
  return {
    accion: p[0],
    set: p[1],
    cementerio: p[2],
    reset: p[3]
  };
};

const DIST_11A = [ 1e3, 2e3, 1e3, 2e3, 8e3, 8e3, 8e3, 8e3 ];

const DIST_S03D = [ 3e3, 4e3, 7e3, 8e3, 8e3, 8e3, 8e3, 8e3 ];

const GRANADA_S03D = [ [ 6750, 0, -1e3 ], [ 7250, 0, 500 ], [ 6750, 0, 2e3 ] ];

const DIR_ZONA_11A = {
  0: 1536,
  9: 2048,
  3: 2560,
  23: 3072,
  2: 3584,
  32: 0,
  1: 512,
  6: 1024
};

class Zako {
  constructor(actor, mgr) {
    this.actor = actor;
    this.mgr = mgr;
    this.ctx = mgr.ctx;
    this.J = mgr.J;
    this.tipo = actor.tipo;
    this.nombre = actor.nombre;
    const def = SOLDADOS[actor.tipo];
    this.def = def;
    this.familia = def.familia;
    this.propio = def.familia !== "vigia";
    const o = actor.opts || {}, num = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    this.vida = num("l", def.vida) || def.vida;
    this.desmayo = num("f", def.desmayo);
    this.daño = num("z", def.daño) || def.daño;
    this.ruta = num("r", 0);
    this.siguiente = num("n", 255);
    this.area = num("a", 65);
    this.listo = false;
    this.muerto = false;
    this.oculto = false;
    this.alerta = 0;
    this.vista = 0;
    this.snDis = 3e4;
    this.snDir = 0;
    this.t1 = 0;
    this.t2 = 0;
    this.t3 = 0;
    this.c3 = 0;
    this.gameflag = 0;
    this.escala = 4096;
    this.cur = 65535;
    this.lastAddr = -1;
    this.nextAddr = 65535;
    this.nextPos = null;
    this.c34 = -1;
    this.target = {
      addr: 65535,
      pos: new THREE.Vector3,
      map: 0
    };
  }
  get comandante() {
    return this.mgr.comandanteDe(this.tipo);
  }
  registrar() {
    if (this.indice == null || this.indice < 0) {
      const c = this.comandante;
      this.indice = c ? c.registrar(this) : -1;
    }
    return this.indice;
  }
  async iniciar() {
    const ctx = this.ctx, J = this.J, a = this.actor;
    const st = ctx.st || ctx.nivel?.id || "";
    const urls = [ a.modeloZako, `niveles/${st}/ippanhei.glb`, `modelos/${st}_ippanhei.glb`, "modelos/ippanhei.glb" ].filter(Boolean);
    let o = null;
    for (const u of urls) {
      try {
        o = await ctx.cargar(u);
        break;
      } catch {}
    }
    if (!o) throw new Error("sin modelo de soldado");
    try {
      const fa = await ctx.cargar("armas/famas.glb");
      o.getObjectByName("hueso_4")?.add(fa);
    } catch {}
    const datos = await cargarAnim(this.def.anim) || await cargarAnim("enemy");
    if (this.familia === "zonas" || this.familia === "pasarela") {
      this.mapaZ = await this.mgr.mapa(a.mapa);
      if (this.mapaZ?.propio) await this.mapaZ.mostrar(ctx, ctx.nivel);
    }
    const pts = await this.puntosRuta();
    const zn = J.zonas[this.siguiente], o0 = pts.length ? pts[0].p : a.p || (zn ? [ zn.p.x * 1e3, zn.p.y * 1e3, zn.p.z * 1e3 ] : [ 0, 0, 0 ]);
    o.position.set(o0[0] * MM, o0[1] * MM, o0[2] * MM);
    o.userData.guardia = a;
    ctx.mundo.add(o);
    ctx.teñir?.(o);
    o.traverse(m => {
      if (m.isMesh && m.isSkinnedMesh) m.castShadow = true;
    });
    if (this.def.kogaku) this.camuflaje(o);
    this.an = animador(o, datos);
    this.an.tocar("parado", {
      offset: Math.random()
    });
    const g = {
      o: o,
      an: this.an,
      pts: pts.map(q => new THREE.Vector3(q.p[0] * MM, q.p[1] * MM, q.p[2] * MM)),
      puntosCmd: pts.map(q => q.cmd || 0),
      i: 0,
      nombre: a.nombre,
      opts: a.opts || {},
      mapa: a.mapa,
      __zako: this
    };
    this.g = g;
    J.ctx.guardias.push(g);
    J.prepararGuardia(g);
    g.vital = this.vida;
    g.vitalMax = this.vida;
    g.faint = this.desmayo;
    g.faintMax = this.desmayo;
    if (this.familia === "escalera") this.iniciarEscalera(); else if (this.familia === "celda") this.iniciarCelda(); else if (this.familia === "zonas") this.iniciarZonas(); else if (this.familia === "pasarela") this.iniciarPasarela(); else this.registrar();
    this.listo = true;
    this.mgr.log("creado", {
      tipo: this.tipo,
      nombre: this.nombre,
      indice: this.indice,
      p: o0
    });
    return this;
  }
  async puntosRuta() {
    const ctx = this.ctx, nv = ctx.nivel, mapa = nv?.mapas?.find(m => m.id === this.actor.mapa) || nv?.mapas?.find(m => m.id === nv?.principal);
    const f = mapa?.hzm_json?.[0];
    if (!f) return [];
    let hz = ctx.hzm?.(f);
    if (!hz) {
      try {
        hz = await (await fetch("assets/" + f)).json();
      } catch {
        hz = null;
      }
    }
    return hz?.rutas?.[this.ruta]?.puntos || [];
  }
  piso(p) {
    const R = this.mgr.rasen;
    if (R) return alturaEn(R.suelo, p.x, p.z, p.y);
    if (this.mapaZ?.propio) return alturaEn(this.mapaZ.suelo, p.x, p.z, p.y);
    return this.J.alturaPiso(p.x, p.z, p.y);
  }
  chocar(p, r) {
    const R = this.mgr.rasen, segs2 = R ? R.segs : this.mapaZ?.propio ? this.mapaZ.segs : null;
    if (!segs2) return this.J.chocar(p, r);
    const J = this.J, segs = J.segs;
    J.segs = segs2;
    try {
      J.chocar(p, r);
    } finally {
      J.segs = segs;
    }
  }
  camuflaje(o) {
    o.traverse(m => {
      if (!m.isMesh) return;
      const k = x => {
        const c = x.clone();
        c.transparent = true;
        c.opacity = .22;
        c.depthWrite = false;
        if (c.color) c.color = c.color.clone().multiplyScalar(.6);
        return c;
      };
      m.material = Array.isArray(m.material) ? m.material.map(k) : k(m.material);
      m.castShadow = false;
      m.layers.disable(2);
    });
    o.userData.kogaku = true;
  }
  "revisarDaño"() {
    const g = this.g, com = this.comandante;
    if (this.vitalAnt != null && (g.vital < this.vitalAnt || g.faint < this.faintAnt || g.capturado && !this.capAnt)) com?.alDaño?.(this);
    if (g.vital <= 0 && !this.cayo) {
      this.cayo = true;
      com?.alMatar?.(this);
      if (this.procMuerte >= 0) com?.correr(this.procMuerte, "muere (-o)");
    }
    this.vitalAnt = g.vital;
    this.faintAnt = g.faint;
    this.capAnt = g.capturado;
  }
  libre(desde, hasta) {
    if (!this.J.libre(desde, hasta)) return false;
    const R = this.mgr.rasen;
    if (!R?.mallas) return true;
    const d = hasta.clone().sub(desde), L = d.length();
    if (L < .001) return true;
    const ray = this.J.ray;
    ray.set(desde, d.normalize());
    ray.far = L;
    return ray.intersectObject(R.mallas.paredes, false).length === 0;
  }
  mover() {
    const g = this.g, J = this.J;
    if ([ "quieto", "camina", "apunta", "sorpresa", "agachadoRuido", "culatazo", "barrido", "granada" ].includes(g.accion)) {
      const d = ((g.turn - g.rot) % 4096 + 4096 + 2048) % 4096 - 2048;
      g.rot = Math.abs(d) < 4 ? g.turn : (g.rot + Math.round(d / 4) + 4096) % 4096;
      g.o.rotation.y = g.rot * ANG;
    }
    const y0 = g.o.position.y;
    if (g.vel > 0) {
      g.o.position.x += Math.sin(g.rot * ANG) * g.vel;
      g.o.position.z += Math.cos(g.rot * ANG) * g.vel;
      this.pasos(y0);
    }
    if (g.accion !== "agarrado") this.chocar(g.o.position, g.rSphere > 0 ? .45 : .25);
    const h = this.piso(g.o.position);
    if (h !== null) g.o.position.y += (h - g.o.position.y) * .5; else if (g.accion !== "agarrado") g.o.position.y -= .05;
  }
  pasos() {
    const g = this.g, a = g.clipAct;
    if (!a) return;
    const caminar = g.clipIdx === 1, correr = g.clipIdx === 2;
    if (!caminar && !correr) return;
    const f = Math.floor(a.time * FPS + 1e-4), p = g.cuadroPaso;
    if (f === p) return;
    g.cuadroPaso = f;
    const cruza = k => p < 0 ? f === k : p < f ? k > p && k <= f : k > p || k <= f;
    const n = (this.indice ?? 0) % 4 * 2, y = Math.round(g.o.position.y * 1e3);
    const esc = this.pisoAnt == null ? 0 : this.pisoAnt > y + 50 ? 31 : this.pisoAnt < y - 50 ? 23 : 0;
    let id = null;
    if (cruza(caminar ? 22 : 16)) id = 161 + n; else if (cruza(caminar ? 11 : 8)) id = 160 + n;
    if (id != null) {
      sonido(id + (this.familia === "escalera" ? esc : 0), g.o.position);
      this.pisoAnt = y;
    }
  }
  posControl() {
    const p = this.g.o.position.clone();
    p.y += 1;
    return p;
  }
  ver() {
    const g = this.g, com = this.comandante, s = com ? com.posSnake() : this.J.puntoSnake();
    const m = this.posControl(), d = s.clone().sub(m);
    this.snDir = dirDe(d.x, d.z);
    this.snDis = Math.round(d.length() * 1e3);
    g.snDir = this.snDir;
    g.snDis = this.snDis;
    if (this.familia === "celda") {
      this.vista = 2;
      return;
    }
    if (this.J.ctx.vuelo?.() || this.J.muerto) {
      this.vista = 0;
      return;
    }
    if (ductoSnake.activo) {
      this.vista = 0;
      return;
    }
    const n = Math.max(1, com?.nVigias || 1);
    if (com && com.time % n !== this.indice) return;
    const alto = Math.abs(d.y) * 1e3, ojo = 4e3;
    if (this.snDis > ojo + 2e3 || alto > 2e3) {
      this.vista = 0;
      return;
    }
    if (this.snDis >= 500 && difAbs(g.facedir, this.snDir) >= 512) {
      this.vista = 0;
      return;
    }
    if (!this.libre(m, s)) {
      this.vista = 0;
      return;
    }
    this.vista = this.snDis > (g.vision.len || 0) ? 1 : 2;
  }
  nivelAlerta() {
    if (this.vista === 0) {
      if (!(this.b90 === 2 && ductoSnake.activo && (this.g.vision.len || 0) > 0)) {
        this.alerta -= 4;
        this.b90 = 0;
      }
    } else if (this.vista === 1) {
      this.alerta--;
      this.b90 = 1;
    } else {
      this.alerta++;
      this.b90 = 2;
    }
    this.alerta = Math.max(0, Math.min(255, this.alerta));
    this.g.alertLevel = this.alerta;
  }
  nav() {
    const R = this.mgr.rasen;
    return R ? R.nav() : this.mapaZ?.nav || this.J;
  }
  hacia(p) {
    const o = this.g.o.position;
    return dirDe(p.x - o.x, p.z - o.z);
  }
  navegar() {
    const N = this.nav(), pos = this.g.o.position, T = this.target;
    this.cur = N.direccion(pos, this.cur);
    const reach = N.alcance(this.cur, this.nextAddr);
    if (T.addr !== this.lastAddr || reach <= 0) {
      this.lastAddr = T.addr;
      if (N.alcance(this.cur, T.addr) < 2) {
        this.nextPos = T.pos.clone();
        this.nextAddr = T.addr;
        this.g.pad.dir = this.hacia(this.nextPos);
        return -1;
      }
      const nx = N.navegarDir(this.cur, T.addr, pos, false);
      const Z = N.zonas[nx < N.zonas.length ? nx : z1(T.addr)] || null;
      this.nextPos = Z ? Z.p.clone() : T.pos.clone();
      this.nextAddr = nx & 255 | (nx & 255) << 8;
    }
    return this.nextPos ? this.hacia(this.nextPos) : -1;
  }
  objetivoJugador() {
    const c = this.comandante;
    if (c) {
      this.target = {
        addr: c.jugador.addr,
        pos: c.jugador.pos.clone(),
        map: c.jugador.map
      };
    }
  }
  objetivoZona(zona) {
    const N = this.nav(), Z = N.zonas[zona];
    if (!Z) return;
    this.target = {
      addr: zona | zona << 8,
      pos: Z.p.clone(),
      map: this.mgr.rasen ? this.mgr.rasen.seccion : 0
    };
  }
  dentroZona(zona) {
    const N = this.nav(), Z = N.zonas[zona];
    return !!Z && N.dentroZona(Z, this.g.o.position);
  }
  cuerpo() {
    const g = this.g, J = this.J, P = g.pad;
    if (g.accion === "barrido") return this.barrido();
    if (g.accion === "granada") return this.lanzarGranada();
    if (g.accion === "apunta" && P.press & 524288) {
      J.cambiar(g, "barrido", 6, {
        fundido: 0,
        loop: false
      });
      return this.barrido();
    }
    if (g.accion === "apunta" && P.press & 1048576) {
      J.cambiar(g, "granada", 7, {
        loop: false
      });
      return this.lanzarGranada();
    }
    if (this.familia === "pasarela" && P.press & 33554432) P.press = P.press & ~33554432 | 262144;
    const antes = g.accion;
    J.actuar(g);
    if (g.accion === "apunta") {
      if (antes !== "apunta" && P.press & 131072 && !(P.press & 65536)) J.ponerClip(g, 5);
      if (P.dir >= 0) g.turn = P.dir;
    }
    if (g.accion === "camina") {
      const c = this.def.correr || [ 100, 100 ];
      g.vel = (g.clipIdx === 2 ? c[(this.indice ?? 0) & 1] : 50) * MM;
    }
    if (g.vision.len > 0) g.vision.len = 4e3;
    if (this.alerta >= 255 && g.estado === "patrulla") g.estado = "alerta";
  }
  barrido() {
    const g = this.g, t = g.tAcc++;
    g.actStatus = 0;
    g.vision.len = 4e3;
    if (t === 1 || t === 7) g.rot = (g.rot - 256 + 4096) % 4096;
    if (t === 3 || t === 5) g.rot = (g.rot + 256) % 4096;
    g.turn = g.rot;
    g.o.rotation.y = g.rot * ANG;
    if (t === 2 || t === 4 || t === 6) {
      this.J.ponerClip(g, 6, {
        fundido: 0,
        loop: false
      });
      this.bala();
    }
    if (t >= 9) {
      this.J.cambiar(g, "apunta", 3);
      g.tAcc = 1;
    }
    g.vel = 0;
  }
  lanzarGranada() {
    const g = this.g, t = g.tAcc++;
    g.actStatus = 0;
    g.vision.len = 4e3;
    g.vel = 0;
    if (t === 0) {
      this.granadaObj = this.objGranada || this.comandante?.posSnake() || this.J.puntoSnake();
      this.granadaEsp = 120;
    }
    if (t > 4) this.granadaEsp--;
    if (t === 17) sonido(47, g.o.position);
    if (t === 45) {
      const mano = new THREE.Vector3;
      (g.o.getObjectByName("hueso_4") || g.o).getWorldPosition(mano);
      const b = this.granadaObj, dist = Math.hypot(b.x - g.o.position.x, b.z - g.o.position.z) * 1e3;
      const f = new THREE.Vector3(Math.sin(g.rot * ANG), 0, Math.cos(g.rot * ANG));
      const paso = f.multiplyScalar(dist / 8 * MM);
      paso.y = 20 * MM;
      this.mgr.granada(mano, paso, Math.max(1, this.granadaEsp));
      this.mgr.log("tira granada", {
        de: this.nombre,
        dist: Math.round(dist)
      });
    }
    if (t > 50) {
      this.J.cambiar(g, "apunta", 3);
      g.tAcc = 1;
      this.granadaFin = true;
    }
  }
  bala() {
    const g = this.g, J = this.J, h = g.o.getObjectByName("hueso_4"), o = new THREE.Vector3;
    if (h) h.getWorldPosition(o); else {
      o.copy(g.o.position);
      o.y += 1.2;
    }
    const d = J.puntoSnake().sub(o).normalize();
    const eje = new THREE.Vector3(-d.z, 0, d.x).normalize();
    if (eje.lengthSq() > 0) d.applyAxisAngle(eje, (randU(32) - 16) * ANG);
    J.balas.push({
      p: o,
      d: d,
      v: .75,
      recorrido: 0,
      "daño": this.daño,
      pared: (J.gvTime & 3) !== 0,
      mesh: J.ctx.balaVisual?.(o, d)
    });
    sonido("tiro", g.o.position);
    this.tiros = (this.tiros || 0) + 1;
  }
  cuadro() {
    const g = this.g;
    if (g.borrado) {
      this.destruir("kill");
      return;
    }
    if (g.marcaT > 0 && --g.marcaT === 0 && g.marca) g.marca.visible = g.marcaQ.visible = false;
    if (g.tCombo > 0 && --g.tCombo === 0) g.combo = 0;
    if (this.muerto && this.familia === "celda" && this.comandante?.flag === 13) {
      this.destruir("FLAG 13");
      return;
    }
    if (this.muerto && (this.familia === "zonas" || this.familia === "pasarela") && this.comandante?.flag === 15) {
      this.destruir("flag 15");
      return;
    }
    if (!this.muerto && (this.familia === "zonas" || this.familia === "pasarela")) this.revisarDaño();
    if (this.muerto) {
      this.esperarRevivir();
      return;
    }
    if (g.faseout && !this.oculto) {
      this.alMorir();
      return;
    }
    if (this.oculto) {
      this.ver();
      this.nivelAlerta();
      this.pensar();
      return;
    }
    if (this.abajo) {
      if (this.t2 === 2) this.cambioDeFlag(true);
      if (this.t2 === 5) {
        this.abajo = null;
        this.ocultar();
        return;
      }
      if (this.abajo && --this.abajo.t <= 0) this.salirDeAbajo();
      return;
    }
    this.mover();
    if (![ "muerto", "cuelloRoto" ].includes(g.accion)) {
      this.ver();
      this.nivelAlerta();
      this.pensar();
    }
    this.cuerpo();
  }
  pensar() {
    if (this.familia === "escalera") this.pensarEscalera(); else if (this.familia === "celda") this.pensarCelda(); else if (this.familia === "zonas") this.pensarZonas(); else if (this.familia === "pasarela") this.pensarPasarela();
  }
  ocultar() {
    const g = this.g;
    this.oculto = true;
    this.abajo = null;
    g.o.visible = false;
    g.inactivo = true;
    g.o.position.set(NO_POINT * MM, NO_POINT * MM, NO_POINT * MM);
    this.cur = 65535;
    this.lastAddr = -1;
  }
  mostrar(p) {
    const g = this.g, J = this.J;
    this.oculto = false;
    this.muerto = false;
    this.abajo = null;
    g.o.visible = true;
    g.inactivo = false;
    g.faseout = false;
    g.borrado = false;
    if (p) g.o.position.copy(p);
    if (![ "quieto", "camina", "apunta" ].includes(g.accion)) {
      J.quitarSuperpuesta(g);
      J.cambiar(g, "quieto", 0);
    }
    g.o.scale.setScalar(this.escala / 4096);
    this.cur = 65535;
    this.lastAddr = -1;
    this.nextAddr = 65535;
  }
  alMorir() {
    const com = this.comandante;
    this.muerto = true;
    this.ocultar();
    this.muertes = (this.muertes || 0) + 1;
    this.mgr.log("muere", {
      de: this.nombre,
      indice: this.indice
    });
    if (com && this.indice >= 0) com.vigias[this.indice].f4 = 1;
  }
  esperarRevivir() {
    const com = this.comandante;
    if (!com || this.indice < 0) return;
    if (com.vigias[this.indice].f4 !== 2) return;
    const g = this.g, J = this.J;
    g.vital = this.vida;
    g.faint = this.desmayo;
    g.gritoMuerte = false;
    g.capturado = false;
    g.alertLevel = 0;
    this.alerta = 0;
    J.quitarSuperpuesta(g);
    J.cambiar(g, "quieto", 0);
    if (g.marca) g.marca.visible = false;
    if (g.marcaQ) g.marcaQ.visible = false;
    this.muerto = false;
    this.revivir();
    this.mgr.log("revive", {
      de: this.nombre,
      indice: this.indice,
      p: g.o.position.toArray().map(v => Math.round(v * 1e3))
    });
  }
  revivir() {
    if (this.familia === "escalera") {
      this.t1 = 0;
      this.t2 = 0;
      this.t3 = 1;
      this.c3 = 0;
      this.ocultar();
    } else if (this.familia === "celda") this.revivirCelda();
  }
  cambioSeccion(c) {
    if (this.familia !== "escalera" || this.oculto || this.muerto) return;
    const R = this.mgr.rasen, g = this.g, y = Math.round(g.o.position.y * 1e3) + 1e3;
    const viejo = c === 1 ? R.seccion - 1 : R.seccion + 1, local = y - R.dy(viejo);
    if (c === 1 && local <= 0) {
      const N = R.nav(), p = new THREE.Vector3(g.o.position.x, (R.dy(R.seccion) - 32e3) * MM, g.o.position.z);
      const z0 = N.zonaOCercana(p), dist = N.distZona(z0, 0), vel = (this.def.correr || [ 100, 100 ])[(this.indice ?? 0) & 1];
      const t = dist >= 1e5 ? 300 : Math.max(30, Math.round(dist * 50 / vel));
      this.abajo = {
        t: t,
        s: R.seccion
      };
      g.o.visible = false;
      g.inactivo = true;
      g.o.position.set(NO_POINT * MM, NO_POINT * MM, NO_POINT * MM);
      this.mgr.log("queda abajo", {
        de: this.nombre,
        seccion: R.seccion,
        zona: z0,
        cuadros: t
      });
    } else if (c === 2 && local >= 0) {
      g.o.position.y = R.dy(viejo) * MM;
      this.mgr.log("cae", {
        de: this.nombre,
        seccion: R.seccion,
        y: R.dy(viejo)
      });
    }
    this.cur = 65535;
    this.lastAddr = -1;
    this.c34 = -1;
  }
  salirDeAbajo() {
    const R = this.mgr.rasen, N = R.nav(), Z = N.zonas[0], g = this.g;
    this.abajo = null;
    g.o.visible = true;
    g.inactivo = false;
    g.o.position.copy(Z.p);
    this.cur = 65535;
    this.lastAddr = -1;
    this.c34 = -1;
    this.mgr.log("sale de abajo", {
      de: this.nombre,
      seccion: R.seccion
    });
  }
  destruir(motivo) {
    const g = this.g;
    if (!g) return;
    this.listo = false;
    g.inactivo = true;
    g.borrado = true;
    g.o.visible = false;
    g.marca?.removeFromParent();
    g.marcaQ?.removeFromParent();
    g.o.removeFromParent();
    const l = this.J.ctx.guardias, i = l.indexOf(g);
    if (i >= 0) l.splice(i, 1);
    const k = this.mgr.soldados.indexOf(this);
    if (k >= 0) this.mgr.soldados.splice(k, 1);
    this.comandante?.soltar(this.indice);
    if (motivo) this.mgr.log("destruido", {
      de: this.nombre,
      motivo: motivo
    });
  }
  iniciarEscalera() {
    this.registrar();
    this.chaseDis = DIST_11A[Math.max(0, this.indice)] ?? 8e3;
    this.escala = 4096;
    this.t1 = this.t2 = this.t3 = this.c3 = 0;
  }
  zonaReset(modo) {
    const R = this.mgr.rasen, com = this.comandante, zs = z1(com?.jugador.addr ?? 0), i = this.indice;
    let z = 0;
    if (modo === 1) {
      const sec = R ? R.seccion : 0;
      if (sec === 0) {
        if (i < 2 || this.gameflag === 10) {
          z = zs;
          if (z < 14 || z > 87) z = 24; else if (z > 13 && z < 21) z += 7; else z -= i + 8;
        } else {
          z = zs + 8;
          if (z > 87) z -= 12;
        }
      } else z = i < 2 ? zs - 8 : zs + 8;
    } else if (modo === 2) z = patron(this.gameflag, i).reset;
    const N = this.nav();
    z = Math.max(0, Math.min(N.zonas.length - 1, z));
    const Z = N.zonas[z];
    this.escala = patron(this.gameflag, i).accion === 3 ? 4323 : 4096;
    this.mostrar(new THREE.Vector3(Z.p.x, Z.p.y, Z.p.z));
    this.mgr.log("reset zona", {
      de: this.nombre,
      indice: i,
      modo: modo,
      zona: z,
      seccion: R ? R.seccion : 0,
      flag: this.gameflag
    });
  }
  aparecer(modo) {
    this.zonaReset(modo);
  }
  irA() {
    if (this.siguiente === 255) {
      this.t2 = 1;
      this.t1 = 0;
      this.t3 = 5;
    } else {
      this.t2 = 3;
      this.t1 = 0;
      this.t3 = 17;
      this.objetivoZona(this.siguiente);
    }
    this.c3 = 0;
    this.g.pad.mode = 1;
  }
  avanzar() {
    const P = this.g.pad;
    P.dir = this.navegar();
    if (P.dir < 0) return true;
    if (this.cur === this.c34) {
      if (++this.c3 > 300) {
        this.cur = 65535;
        this.lastAddr = -1;
        this.navegar();
        this.c3 = 0;
      }
    } else this.c3 = 1;
    this.c34 = this.cur;
    return false;
  }
  directo(r) {
    const o = this.g.o.position, T = this.target.pos, dx = (T.x - o.x) * 1e3, dz = (T.z - o.z) * 1e3;
    if (dx <= -r || dx >= r || dz <= -r || dz >= r) {
      this.g.pad.dir = dirDe(dx, dz);
      this.c3++;
      return false;
    }
    return true;
  }
  cerca() {
    this.objetivoJugador();
    if ((this.mgr.rasen ? this.mgr.rasen.seccion : 0) !== this.target.map) return -1;
    if (this.c3 & 16) {
      const N = this.nav();
      this.cur = N.direccion(this.g.o.position, 65535);
      if (N.alcance(this.cur, this.target.addr) >= 2) return -1;
    }
    return this.directo(500) ? 1 : 0;
  }
  marcaSorpresa(conBrillo) {
    const P = this.g.pad;
    if (this.c3 === 0) {
      this.J.ponerMarca(this.g, 4);
      sonido(SE.EXCLAMACION, this.g.o.position);
    }
    if (conBrillo) {
      if (this.c3 >= 0 && this.c3 <= 19) {
        P.press |= 32;
        this.c3++;
        return false;
      }
      return true;
    }
    if (this.c3 < 0 || this.c3 > 20) return true;
    this.c3++;
    return false;
  }
  rafaga() {
    const P = this.g.pad, c = this.c3;
    P.press |= 65536;
    P.dir = this.snDir;
    if (c === 0) this.c3 = randU(4) + 4;
    if (c <= 8 && c % 2 === 0) P.press |= 262144;
    if (c >= 12) return true;
    this.c3++;
    return false;
  }
  guardiaAgachado() {
    const P = this.g.pad;
    P.press |= 131072;
    if (this.c3 === 0) P.press |= 524288;
    if (this.c3 < 0 || this.c3 > 80) return true;
    if (this.siguiente in DIR_ZONA_11A) P.dir = DIR_ZONA_11A[this.siguiente];
    this.c3++;
    return false;
  }
  culatazo() {
    const P = this.g.pad;
    P.press |= 65536;
    if (this.c3 === 0) P.press |= 2097152; else if (this.c3 > 30 || this.c3 > 3 && this.g.accion !== "culatazo") return true;
    P.dir = this.snDir;
    this.c3++;
    return false;
  }
  rafagaCorta() {
    const P = this.g.pad;
    P.dir = this.snDir;
    P.press |= 65536;
    if (this.c3 < 10) {
      if (!(this.c3 & 2)) P.press |= 262144;
    } else if (this.c3 > 19) return true;
    this.c3++;
    return false;
  }
  apuntarEsperar() {
    const P = this.g.pad;
    P.press |= 65536;
    P.dir = this.snDir;
    if (this.snDis < 1300) {
      this.t3 = 11;
      this.c3 = 0;
      return false;
    }
    if (this.snDis > 4e3) return true;
    this.c3++;
    return false;
  }
  acercarse() {
    const P = this.g.pad;
    if (this.snDis < 800) {
      P.press |= 65536;
      return true;
    }
    P.dir = this.snDir;
    this.c3++;
    return false;
  }
  decidir() {
    const P = this.g.pad;
    P.press |= 65536;
    P.dir = this.snDir;
    if (this.c3 === 16) this.c3 += randU(14);
    if (this.c3 < 0 || this.c3 > 32) {
      const d = this.snDis;
      switch (patron(this.gameflag, this.indice).accion) {
       case 0:
        if (d < 8e3) return d < 800 && this.mgr.snakeMueve ? 11 : 7;
        return 15;

       case 2:
        return 8;

       case 4:
        return 14;

       case 3:
        if (d >= 3900 && d < 8e3) return 12;
        if (d < 3900) return 13;
        break;

       case 1:
        return 15;
      }
    }
    this.c3++;
    return 0;
  }
  volver() {
    const P = this.g.pad;
    P.press |= 65536;
    P.dir = this.snDir;
    this.siguiente = patron(this.gameflag, this.indice).reset;
    this.escala = 4096 + (this.siguiente !== 255 ? 200 : 0);
    return 16;
  }
  cambioDeFlag(enAtaque) {
    const com = this.comandante, GF = com ? com.gameflag : 0;
    if (this.gameflag === GF) return;
    const set = patron(GF, this.indice).set;
    this.gameflag = GF;
    if (set !== 0) {
      if (set === 1) this.zonaReset(2);
      this.t2 = 2;
      this.t3 = 15;
      this.c3 = 0;
    } else {
      this.t2 = 5;
      this.t3 = 19;
      this.c3 = 0;
      this.mgr.log("al cementerio", {
        de: this.nombre,
        flag: GF,
        ataque: enAtaque
      });
    }
  }
  pensarEscalera() {
    const g = this.g, P = g.pad, com = this.comandante, GF = com ? com.gameflag : 0;
    P.dir = -1;
    P.press = 0;
    if (GF > 0 && GF < 10) this.alerta = 255; else if (this.t3 !== 18 && GF === 10) this.alerta = 255;
    if (this.t1 !== 0) return;
    switch (this.t2) {
     case 0:
      if (this.t3 === 0) {
        this.siguiente = patron(this.gameflag, this.indice).reset;
        if (patron(0, this.indice).set === 0) {
          this.ocultar();
          this.t2 = 5;
          this.t3 = 18;
          this.c3 = 0;
        } else this.irA();
      } else if (this.t3 === 1) {
        if (patron(this.gameflag, this.indice).cementerio === 0) {
          if (this.gameflag !== GF) this.gameflag = GF;
          this.aparecer(1);
          this.irA();
        } else if (this.gameflag === 10 && (this.mgr.rasen?.seccion ?? 0) === 0) {
          this.aparecer(1);
          this.irA();
        } else {
          this.t2 = 5;
          this.t3 = 18;
          this.c3 = 0;
        }
      }
      break;

     case 1:
      if (this.t3 === 5) {
        this.objetivoJugador();
        if (this.avanzar()) {
          this.t3 = 6;
          this.c3 = 0;
        }
      } else if (this.t3 === 6) {
        const r = this.cerca();
        if (r < 0) {
          this.t3 = 5;
          this.c3 = 0;
        } else if (r > 0) {
          this.t2 = 2;
          this.t3 = 15;
          this.c3 = 0;
        }
      }
      if (this.snDis < this.chaseDis && (this.J.postura?.() ?? 0) === 0) {
        this.t2 = 2;
        this.t3 = 16;
        this.c3 = 33;
        P.press |= 65536;
      }
      if (this.vista === 2) this.alerta = 255;
      break;

     case 2:
      {
        let r;
        switch (this.t3) {
         case 7:
          if (this.rafaga()) {
            this.t3 = 15;
            this.c3 = 0;
          }
          break;

         case 8:
          if (this.guardiaAgachado()) {
            this.t3 = 15;
            this.c3 = 0;
          }
          break;

         case 11:
          if (this.culatazo()) {
            this.t3 = 15;
            this.c3 = 0;
          }
          break;

         case 12:
          if (this.rafagaCorta()) {
            this.t3 = 15;
            this.c3 = 0;
          }
          break;

         case 13:
          if (this.apuntarEsperar()) {
            this.t3 = 15;
            this.c3 = 0;
          }
          break;

         case 14:
          if (this.acercarse()) {
            this.t3 = 11;
            this.c3 = 0;
          }
          break;

         case 16:
          r = this.decidir();
          if (r) {
            this.t3 = r;
            this.c3 = 0;
          }
          this.cambioDeFlag(true);
          break;

         case 15:
          r = this.volver();
          if (r) {
            this.t3 = r;
            this.c3 = 0;
          }
          if (this.siguiente === 255) {
            if (this.snDis > this.chaseDis || this.vista !== 2) this.irA();
          } else if (!this.dentroZona(this.siguiente)) this.irA();
          this.cambioDeFlag(true);
          break;
        }
        if (this.vista === 2) this.alerta = 255;
        break;
      }

     case 3:
      if (this.t3 === 17 && this.avanzar()) {
        this.t2 = 2;
        this.t3 = 15;
        this.c3 = 0;
      }
      if (this.snDis < 800 && (this.J.postura?.() ?? 0) === 0) {
        this.t2 = 2;
        this.t3 = 11;
        this.c3 = 0;
        P.press |= 65536;
      }
      break;

     case 4:
      if (this.t3 === 2) {
        if (this.marcaSorpresa(true)) {
          this.irA();
          P.sound = com?.modo ? 246 : 240;
          this.alerta = 255;
        }
      } else if (this.marcaSorpresa(false)) {
        if (this.t3 === 3) {
          this.t2 = 3;
          this.t3 = 17;
          this.c3 = 0;
          P.mode = 1;
        } else this.irA();
        P.sound = 240;
        this.alerta = 255;
      }
      break;

     case 5:
      if (this.t3 === 18) {
        if (this.gameflag !== GF) {
          this.gameflag = GF;
          const set = patron(GF, this.indice).set;
          if (set === 0) break;
          if (set === 1) this.aparecer(2); else if (set === 2) this.aparecer(1);
          this.t2 = 2;
          this.t3 = 15;
          this.c3 = 0;
        } else if (!this.oculto) this.ocultar();
      } else if (this.t3 === 19) {
        this.ocultar();
        this.t3 = 18;
        this.c3 = 0;
      }
      break;
    }
    if (this.t2 === 1 || this.t2 === 2) if (this.vista === 2 || this.t2 === 1) {}
  }
  iniciarCelda() {
    const com = this.comandante;
    this.registrar();
    this.serie = com ? com.serie++ : 0;
    this.chaseDis = DIST_S03D[Math.max(0, this.indice)] ?? 8e3;
    const n = (this.actor.opts?.n || []).filter(x => typeof x === "number");
    this.defensa = n.length ? n[0] : 255;
    this.objGranada = (() => {
      const p = GRANADA_S03D[Math.max(0, this.indice)] || GRANADA_S03D[0];
      return new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);
    })();
    this.t1 = this.t2 = this.t3 = this.c3 = 0;
    this.alerta = 255;
  }
  revivirCelda() {
    const com = this.comandante, J = this.J;
    this.serie = com ? com.serie++ : this.serie + 1;
    const zona = !com || com.flag < 4 ? this.indice * 2 + 25 : com.zonas[this.indice % 2] ?? com.zonas[0];
    const Z = J.zonas[zona];
    if (!Z) return;
    const p = Z.p.clone();
    if (this.indice === 2) p.z += .5;
    this.t1 = this.t2 = this.t3 = this.c3 = 0;
    this.alerta = 255;
    this.mostrar(p);
    this.mgr.log("aparece en zona", {
      de: this.nombre,
      zona: zona,
      flag: com?.flag
    });
  }
  defender() {
    if (this.defensa === 255) {
      this.t2 = 1;
      this.t1 = 0;
      this.t3 = 4;
    } else {
      this.t2 = 3;
      this.t1 = 0;
      this.t3 = 13;
      this.objetivoZona(this.defensa);
    }
    this.c3 = 0;
    this.g.pad.mode = 1;
  }
  avanzarCelda() {
    if (this.c3 % 32 === 0) {
      this.cur = 65535;
      this.lastAddr = -1;
      this.navegar();
    }
    this.g.pad.dir = this.navegar();
    if (this.g.pad.dir < 0) return true;
    this.c3++;
    return false;
  }
  decidirCelda() {
    const P = this.g.pad, com = this.comandante, F = com ? com.flag : 0;
    P.press |= this.indice === 2 ? 131072 : 65536;
    P.dir = this.snDir;
    if (F < 7 && F >= 4) return 0;
    if (this.c3 === 16) this.c3 += randU(14);
    if (this.c3 >= 33) {
      if (this.chaseDis <= 3e3 && this.ctx.enDucto?.()) return 9;
      const p = this.J.postura?.() ?? 0;
      if (this.snDis < 1e3 && p === 0) return 10;
      return 6;
    }
    this.c3++;
    return 0;
  }
  pensarCelda() {
    const g = this.g, P = g.pad, com = this.comandante, F = com ? com.flag : 0;
    P.dir = -1;
    P.press = 0;
    this.alerta = 255;
    if (this.t1 !== 0) return;
    switch (this.t2) {
     case 0:
      if (this.t3 !== 0) break;
      if (F === 9 && this.serie >= 15) {
        this.c3++;
        break;
      }
      if ((F === 9 || F === 8) && this.c3 < 31) {
        this.c3++;
        break;
      }
      if ([ 0, 4, 5, 7, 12, 8, 9 ].includes(F)) {
        this.defender();
        this.c3 = 0;
        break;
      }
      if (F === 10) {
        this.t2 = 2;
        this.t3 = 9;
        this.c3 = 0;
        P.mode = 1;
        break;
      }
      this.c3++;
      break;

     case 1:
      if (this.t3 === 4) {
        this.objetivoJugador();
        if (this.avanzarCelda()) {
          this.t3 = 5;
          this.c3 = 0;
        }
      } else if (this.t3 === 5) {
        this.objetivoJugador();
        let r;
        if (this.c3 & 16) {
          const N = this.nav();
          this.cur = N.direccion(g.o.position, 65535);
          r = N.alcance(this.cur, this.target.addr) >= 2 ? -1 : null;
        }
        if (r == null) r = this.directo(1500) ? 1 : 0;
        if (r < 0) {
          this.t3 = 4;
          this.c3 = 0;
        } else if (r > 0) {
          this.t2 = 2;
          this.t3 = 12;
          this.c3 = 0;
        }
      }
      if (this.snDis < this.chaseDis && (this.chaseDis >= 7e3 || this.vista === 2)) {
        this.t2 = 2;
        this.t3 = 12;
        this.c3 = 0;
      }
      break;

     case 2:
      {
        let r;
        switch (this.t3) {
         case 6:
          P.press |= this.indice === 2 ? 131072 : 65536;
          if (this.c3 < 4) {
            if (this.c3 & 1) P.press |= 262144;
          } else if (this.c3 >= 21) {
            this.t3 = 12;
            this.c3 = 0;
            break;
          }
          this.c3++;
          break;

         case 7:
          P.press |= 131072;
          if (this.c3 === 0) P.press |= 524288; else if (this.c3 === 8) {
            this.t3 = 12;
            this.c3 = 0;
            break;
          }
          P.dir = this.snDir;
          this.c3++;
          break;

         case 9:
          P.press |= 65536;
          if (this.c3 === 30) P.press |= 1048576; else if (this.c3 > 30 && (this.granadaFin || this.c3 > 120)) {
            this.granadaFin = false;
            this.t1 = 0;
            this.t2 = 0;
            this.t3 = 0;
            this.c3 = 0;
            break;
          }
          P.dir = this.hacia(this.objGranada);
          this.c3++;
          break;

         case 10:
          P.press |= 65536;
          if (this.c3 === 0) P.press |= 2097152; else if (g.accion !== "culatazo" || this.c3 > 30) {
            this.t3 = 12;
            this.c3 = 0;
            break;
          }
          P.dir = this.snDir;
          this.c3++;
          break;

         case 11:
          P.press |= 65536;
          if (this.c3 < 10) {
            if (!(this.c3 & 1)) P.press |= 262144;
          } else if (this.c3 >= 20) {
            this.t3 = 12;
            this.c3 = 0;
            break;
          }
          P.dir = this.snDir;
          this.c3++;
          break;

         case 12:
          r = this.decidirCelda();
          if (r) {
            this.t3 = r;
            this.c3 = 0;
          }
          if (this.vista !== 2 && !this.dentroZona(this.defensa)) this.defender();
          break;
        }
        break;
      }

     case 3:
      if (this.t3 === 13 && this.avanzarCelda()) {
        this.t2 = 2;
        this.t3 = 12;
        this.c3 = 0;
      }
      break;
    }
  }
  iniciarZonas() {
    this.registrar();
    this.es14 = this.tipo === "ZAKO14";
    this.chaseDis = DIST_ZONAS[Math.max(0, this.indice)] ?? 8e3;
    this.zonaObj = this.siguiente;
    const o = (this.actor.opts?.o || []).find(x => x && typeof x === "object" && "proc" in x);
    this.procMuerte = o ? o.proc : -1;
    const gp = GRANADA_ZONAS[Math.max(0, this.indice)] || GRANADA_ZONAS[0];
    this.objGranada = new THREE.Vector3(gp[0] * MM, gp[1] * MM, gp[2] * MM);
    this.t1 = this.t2 = this.t3 = this.c3 = 0;
  }
  a3(t3) {
    this.t3 = t3;
    this.c3 = 0;
  }
  irAZona() {
    if (this.zonaObj === 255) {
      this.t2 = 1;
      this.t1 = 0;
      this.t3 = 4;
    } else {
      this.t2 = 3;
      this.t1 = 0;
      this.t3 = 16;
      this.objetivoZona(this.zonaObj);
    }
    this.c3 = 0;
    this.g.pad.mode = 1;
  }
  reiniciarCerebro() {
    this.t1 = this.t2 = this.t3 = 0;
    this.c3 = 0;
    this.g.pad.mode = 1;
  }
  rastrear() {
    this.objetivoJugador();
    if (this.c3 & 16) {
      const N = this.nav();
      this.cur = N.direccion(this.g.o.position, 65535);
      if (N.alcance(this.cur, this.target.addr) > 1) return -1;
    }
    return this.directo(1500) ? 1 : 0;
  }
  parado() {
    return (this.J.postura?.() ?? 0) === 0;
  }
  agachadoOCaja() {
    return (this.J.postura?.() ?? 0) !== 0 || !!this.J.ctx.enCaja?.();
  }
  rafagaZ() {
    const P = this.g.pad, c = this.c3;
    P.press |= 65536;
    P.dir = this.snDir;
    if (c === 0) this.c3 = randU(8);
    if (c < 9 && !(c & 1)) P.press |= 262144;
    if (c > 11) return true;
    this.c3++;
    return false;
  }
  guardiaZ() {
    const P = this.g.pad, c = this.c3;
    P.press |= 131072;
    if (this.es14) {
      if (c === 0) P.press |= 524288;
      if (c > 80) return true;
      if (this.zonaObj in DIR_ZONA_11A) P.dir = DIR_ZONA_11A[this.zonaObj];
    } else {
      P.dir = 2048;
      if (c >= 80) return true;
      if (!(c & 2)) P.press |= 524288;
    }
    this.c3++;
    return false;
  }
  granadaZ() {
    const P = this.g.pad;
    P.press |= 65536;
    if (this.c3 === 30) P.press |= 1048576; else if (this.c3 > 30 && (this.granadaFin || this.c3 > 120)) {
      this.granadaFin = false;
      return true;
    }
    P.dir = this.hacia(this.objGranada);
    this.c3++;
    return false;
  }
  culatazoZ() {
    const P = this.g.pad;
    P.press |= 65536;
    P.dir = this.snDir;
    if (this.c3 === 0) P.press |= 2097152; else if (this.c3 > 3 && this.g.accion !== "culatazo" || this.c3 > 30) return true;
    this.c3++;
    return false;
  }
  rafagaCortaZ() {
    const P = this.g.pad, c = this.c3;
    P.press |= 65536;
    P.dir = this.snDir;
    if (c < 10) {
      if (!(c & 1)) P.press |= 262144;
    } else if (c >= 20) return true;
    this.c3++;
    return false;
  }
  apuntarZ() {
    const P = this.g.pad;
    if (this.c3 > 200) return true;
    P.press |= 65536;
    P.dir = this.snDir;
    this.c3++;
    return false;
  }
  acercarseZ() {
    const P = this.g.pad;
    if (this.snDis < 800) {
      P.press |= 65536;
      return true;
    }
    P.dir = this.snDir;
    this.c3++;
    return false;
  }
  decidirZonas() {
    const P = this.g.pad;
    P.press |= 65536;
    P.dir = this.snDir;
    if (this.c3 === 16) this.c3 += randU(14);
    if (this.c3 > (this.es14 ? 32 : 24)) {
      const cerca = this.snDis < 800;
      switch (tabla(this.es14 ? ACCION_14 : ACCION_11E, this.indice, this.comandante?.flag ?? 0)) {
       case 0:
        return cerca && !this.agachadoOCaja() ? 10 : 6;

       case 1:
        return !this.es14 && cerca && this.parado() ? 10 : 14;

       case 2:
        return 7;

       case 3:
        return 12;

       case 4:
        return 13;
      }
    }
    this.c3++;
    return 0;
  }
  zonaPatron() {
    const P = this.g.pad;
    P.press |= 65536;
    P.dir = this.snDir;
    this.zonaObj = tabla(this.es14 ? ZONA_14 : ZONA_11E, this.indice, this.comandante?.flag ?? 0);
    return 15;
  }
  pensarZonas() {
    const P = this.g.pad, com = this.comandante;
    P.dir = -1;
    P.press = 0;
    if (this.es14) this.alerta = 255;
    if (this.t1 === 0) switch (this.t2) {
     case 0:
      if (this.t3 === 0) this.irAZona();
      break;

     case 1:
      if (this.t3 === 4) {
        this.objetivoJugador();
        if (this.avanzarCelda()) this.a3(5);
      } else if (this.t3 === 5) {
        const r = this.rastrear();
        if (r < 0) this.a3(4); else if (r > 0) {
          this.t2 = 2;
          this.a3(14);
        }
      }
      if (this.snDis < 800 && this.parado()) {
        P.press |= 65536;
        this.t2 = 2;
        this.a3(10);
        P.dir = this.snDir;
      }
      if (this.vista === 2) this.alerta = 255;
      break;

     case 2:
      switch (this.t3) {
       case 6:
        if (this.rafagaZ()) this.a3(14);
        break;

       case 7:
        if (this.guardiaZ()) this.a3(14);
        break;

       case 9:
        if (this.granadaZ()) this.reiniciarCerebro();
        break;

       case 10:
        if (this.culatazoZ()) this.a3(14);
        break;

       case 11:
        if (this.rafagaCortaZ()) this.a3(14);
        break;

       case 12:
        if (this.apuntarZ()) this.a3(14);
        break;

       case 13:
        if (this.acercarseZ()) this.a3(10);
        break;

       case 15:
        {
          const r = this.decidirZonas();
          if (r) this.a3(r);
          break;
        }

       case 14:
        {
          const r = this.zonaPatron();
          if (r) this.a3(r);
          if (!this.dentroZona(this.zonaObj)) this.irAZona();
          break;
        }
      }
      if (this.vista === 2) this.alerta = 255;
      break;

     case 3:
      if (this.t3 === 16 && this.avanzarCelda()) {
        this.t2 = 2;
        this.a3(14);
      }
      if (this.es14 && this.snDis < 800 && this.parado()) {
        this.t2 = 2;
        this.a3(10);
        P.press |= 65536;
        P.dir = this.snDir;
      }
      break;

     case 4:
      if (this.marcaSorpresa(this.t3 === 1)) {
        this.irAZona();
        P.sound = 240;
        this.alerta = 255;
      }
      break;
    }
    if (!this.es14) this.alerta = (com?.flag ?? 0) > 0 ? 255 : 0;
  }
  iniciarPasarela() {
    this.registrar();
    this.chaseDis = DIST_11F[Math.max(0, this.indice)] ?? 8e3;
    this.zonaObj = 255;
    this.flagVisto = 0;
    const gp = GRANADA_ZONAS[Math.max(0, this.indice)] || GRANADA_ZONAS[0];
    this.objGranada = new THREE.Vector3(gp[0] * MM, gp[1] * MM, gp[2] * MM);
    this.procMuerte = -1;
    this.t1 = this.t2 = this.t3 = this.c3 = 0;
  }
  zonaPatron11F() {
    const GF = this.comandante?.flag ?? 0;
    this.flagVisto = GF;
    this.zonaObj = tabla(ZONA_11F, this.indice, GF);
  }
  arcoPasarela(dir, rafaga) {
    let d = dir & 4095;
    const r = this.J.ctx.rig.position, x = r.x * 1e3, z = r.z * 1e3;
    if (z > 10500 && (x < 5500 || x > 7500)) {
      if (rafaga) {
        if (d >= 39 && d <= 1023) d = 38;
        if (d < 6 || d > 3072) d = 6;
      } else {
        if (d > 38 && d < 1024) d = 38;
        if (d < 5 || d > 3072) d = 5;
      }
    }
    return d;
  }
  tiro11F() {
    const P = this.g.pad;
    P.dir = this.snDir;
    P.press |= 65536;
    if (this.c3 === 0) P.press |= 262144; else if (this.c3 === 4) return true;
    this.c3++;
    return false;
  }
  guardia11F() {
    const P = this.g.pad;
    P.press |= 131072;
    if (this.c3 === 0) P.press |= 524288;
    if (this.c3 > 80) return true;
    P.dir = 2560;
    this.c3++;
    return false;
  }
  espera11F() {
    const P = this.g.pad;
    P.press |= 65536;
    if (this.c3 >= 60) return true;
    this.c3++;
    return false;
  }
  rafagaCadera() {
    const P = this.g.pad, c = this.c3;
    P.press |= 65536;
    if (c < 10) {
      if (c % 2 === 0) P.press |= 33554432;
    } else if (c >= 20) return true;
    P.dir = this.arcoPasarela(this.snDir, true) + 47;
    this.c3++;
    return false;
  }
  decidirPasarela() {
    const P = this.g.pad;
    P.press |= 65536;
    if (this.c3 === 8) this.c3 += randU(8);
    P.dir = this.arcoPasarela(this.snDir, false);
    if (this.c3 > 18) {
      switch (tabla(ACCION_11F, this.indice, this.flagVisto)) {
       case 0:
        if (this.vista !== 2) return 14;
        if (this.snDis < 1e3 && !this.agachadoOCaja()) return 10;
        if (this.snDis < this.chaseDis) return 6;
        return 14;

       case 1:
        return 14;

       case 3:
        return 7;

       case 6:
        P.dir += 47;
        return 12;

       case 5:
        return 13;

       case 2:
        return randU(8) === 0 ? 11 : 14;
      }
    }
    if (this.flagVisto !== (this.comandante?.flag ?? 0)) return 14;
    this.c3++;
    return 0;
  }
  volver11F() {
    const P = this.g.pad;
    P.dir = this.snDir;
    P.press |= 65536;
    this.zonaPatron11F();
    return 15;
  }
  pensarPasarela() {
    const P = this.g.pad, com = this.comandante;
    P.dir = -1;
    P.press = 0;
    this.alerta = 255;
    if (this.t1 !== 0) return;
    const lejos = () => com?.dañoReciente?.() && this.snDis > EYE_LENGTH + 2e3;
    const sorpresa = () => {
      this.t1 = 0;
      this.t2 = 4;
      this.t3 = 1;
      this.c3 = 0;
    };
    switch (this.t2) {
     case 0:
      if (this.t3 === 0) {
        this.zonaPatron11F();
        this.irAZona();
      }
      break;

     case 1:
      if (this.t3 === 4) {
        this.objetivoJugador();
        if (this.avanzarCelda()) this.a3(5);
      } else if (this.t3 === 5) {
        const r = this.rastrear();
        if (r < 0) this.a3(4); else if (r > 0) {
          this.t2 = 2;
          this.a3(14);
        }
      }
      if (this.snDis < this.chaseDis && this.parado()) {
        this.t2 = 2;
        this.a3(14);
        P.press |= 65536;
      }
      break;

     case 2:
      switch (this.t3) {
       case 6:
        if (this.tiro11F()) this.a3(14);
        break;

       case 7:
        if (this.guardia11F()) this.a3(14);
        break;

       case 9:
        if (this.granadaZ()) this.reiniciarCerebro();
        break;

       case 10:
        if (this.culatazoZ()) this.a3(14);
        break;

       case 11:
        if (this.espera11F()) this.a3(14);
        if (lejos()) sorpresa();
        break;

       case 12:
        if (this.rafagaCadera()) this.a3(14);
        if (lejos()) sorpresa();
        break;

       case 13:
        if (this.acercarseZ()) this.a3(10);
        break;

       case 15:
        {
          const r = this.decidirPasarela();
          if (r) this.a3(r);
          if (lejos()) sorpresa();
          break;
        }

       case 14:
        {
          const r = this.volver11F();
          if (r) this.a3(r);
          if (this.zonaObj === 255) {
            if (this.cur === com?.jugador.addr || this.snDis <= this.chaseDis) break;
          } else if (this.dentroZona(this.zonaObj)) break;
          this.irAZona();
          break;
        }
      }
      break;

     case 3:
      if (this.t3 === 16 && this.avanzarCelda()) {
        this.t2 = 2;
        this.a3(14);
      }
      if (this.snDis < 800 && this.parado()) {
        this.t2 = 2;
        this.a3(10);
        P.press |= 65536;
      }
      break;

     case 4:
      if (this.t3 === 1) {
        if (this.c3 === 0) this.J.ponerMarca(this.g, 4);
        if (this.c3 < 20) {
          P.press |= 32;
          this.c3++;
        } else {
          this.t2 = 2;
          this.a3(14);
        }
      } else if (this.marcaSorpresa(false)) {
        this.irAZona();
        P.sound = 240;
      }
      break;
    }
  }
}

export function crearZako(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esZako(actor)) return null;
  const mgr = Zakos.de(J, ctx);
  if (actor.tipo in COMANDANTES) {
    const fam = SOLDADOS[COMANDANTES[actor.tipo]].familia;
    const Clase = {
      escalera: ComandanteEscalera,
      celda: ComandanteCelda,
      zonas: ComandanteZonas,
      pasarela: ComandantePasarela
    }[fam] || ComandanteVigia;
    const c = new Clase(actor, mgr);
    mgr.agregarComandante(c);
    actor._zako = c;
    mgr.log("comandante", {
      tipo: actor.tipo,
      procs: (actor.opts?.n || []).map(v => v?.proc).filter(x => x != null)
    });
    return c;
  }
  const z = new Zako(actor, mgr);
  mgr.soldados.push(z);
  actor._zako = z;
  z.registrar();
  z.cargando = z.iniciar().catch(e => {
    console.warn("[zako]", actor.tipo, e);
    z.listo = false;
    const i = mgr.soldados.indexOf(z);
    if (i >= 0) mgr.soldados.splice(i, 1);
    return null;
  });
  return z;
}

export async function zakosAlEntrar(nv, guion, ctx) {
  const J = ctx?.juego;
  if (!J || !nv) return null;
  if (!nv.actores.some(a => esZako(a) || a.tipo === "RASEN" || a.tipo === "RASEN_EL" || TIPOS_RAPEL.has(a.tipo) || a.tipo === "11B_DEMO")) return null;
  engancharGuion(guion);
  const mgr = Zakos.de(J, {
    ...ctx,
    nivel: nv,
    st: nv.id,
    guion: guion
  });
  const r = {
    comandantes: [],
    soldados: [],
    rasen: null
  };
  const ra = deLaEntrada(nv, guion, new Set([ "RASEN" ]))[0] || nv.actores.find(a => a.tipo === "RASEN" && !a.evento);
  if (ra && !mgr.rasen) {
    try {
      const datos = await (await fetch(`assets/niveles/${nv.id}/rasen.json`)).json();
      const hzms = await Promise.all(datos.mapas.map(m => {
        const f = nv.mapas.find(x => x.id === m)?.hzm_json?.[0];
        return f ? ctx.hzm?.(f) || fetch("assets/" + f).then(x => x.json()) : null;
      }));
      if (hzms.every(Boolean)) {
        const R = mgr.rasen = new Rasen(datos, hzms, ctx, ra);
        if (ctx.cargar && ctx.mundo) {
          await R.dibujar(ctx.cargar, ctx.mundo, ctx.teñir);
          R.colisionSnake(ctx);
          R.subirActores(ctx.mundo, J.ctx.items, mgr.din());
        }
        R.ajustarTrampas(guion, mgr.camJuego());
        R.instalarCamara(mgr.camJuego());
        mgr.log("rasen", {
          mapas: R.mapas,
          s0: R.s0,
          modo: R.modo,
          menos: R.menos,
          trampas: R.trampas?.size
        });
        r.rasen = R;
        const sm = R.seccionDeMapa(guion?.vars?.get?.("$s:L000e"));
        if (sm >= 0 && sm !== R.s0 && typeof ctx.subirSnake === "function") {
          ctx.subirSnake(R.dy(sm) * MM);
          mgr.log("rasen: Snake a su sección", {
            seccion: sm,
            dy: R.dy(sm)
          });
        }
      }
    } catch (e) {
      console.warn("[zako] rasen", e);
    }
  }
  const el = deLaEntrada(nv, guion, new Set([ "RASEN_EL" ]))[0];
  if (el && !mgr.rasenEl) {
    try {
      r.rasenEl = await mgr.crearRasenEl(el);
    } catch (e) {
      console.warn("[zako] rasen_el", e);
    }
  }
  const deRapel = deLaEntrada(nv, guion, TIPOS_RAPEL).map(a => conVariables(a, guion));
  if (deRapel.length && !mgr.rapel) {
    try {
      mgr.rapel = new Rapel(mgr, mgr.ctx);
      for (const a of deRapel) await mgr.rapel.crear(a);
      r.rapel = mgr.rapel;
    } catch (e) {
      console.warn("[zako] rapel", e);
    }
  }
  for (const a of nv.actores) {
    if (!(a.tipo in COMANDANTES) || a.evento || a.t > 0) continue;
    const c = crearZako(a, {
      ...ctx,
      nivel: nv,
      st: nv.id,
      guion: guion
    });
    if (!c) continue;
    r.comandantes.push(c);
    const procs = (a.opts?.n || []).filter(v => v && typeof v === "object" && "proc" in v).map(v => v.proc);
    if (guion?.correrProc) for (const p of procs) {
      try {
        guion.correrProc(p);
      } catch (e) {
        console.warn("[zako] -n", p, e);
      }
    }
    for (let k = 0; k < 3; k++) await new Promise(ok => setTimeout(ok, 0));
    if (!mgr.soldados.some(z => z.tipo === c.soldado)) {
      const ctxs = new Set(procs.map(p => "proc_" + p.toString(16).padStart(4, "0")));
      for (const s of nv.actores.filter(x => x.tipo in SOLDADOS && ctxs.has(x.ctx))) {
        const opts = {};
        for (const [k, v] of Object.entries(s.opts || {})) opts[k] = v.map(x => x && typeof x === "object" && "var" in x ? guion?.vars?.get?.(x.var) ?? null : x);
        crearZako({
          ...s,
          opts: opts
        }, {
          ...ctx,
          nivel: nv,
          st: nv.id,
          guion: guion
        });
      }
    }
  }
  await new Promise(ok => setTimeout(ok, 0));
  await Promise.all(mgr.soldados.map(z => z.cargando).filter(Boolean));
  r.soldados = mgr.soldados.slice();
  mgr.listoEntrada = true;
  return r;
}

function conVariables(a, guion) {
  const s = guion?.nodos?.get?.(a._k ?? a.k);
  if (!s || typeof guion.opciones !== "function" || a.guion) return a;
  try {
    const o = guion.opciones(s), opts = {};
    for (const k in o) opts[k] = guion.resolver(o[k], []);
    return {
      ...a,
      opts: opts
    };
  } catch {
    return a;
  }
}

export function deLaEntrada(nv, guion, tipos) {
  const out = [];
  const conPres = guion?.nivel === nv && guion.presupuestoBase instanceof Map;
  for (const a of nv.actores) {
    if (!tipos.has(a.tipo) || a.evento || a.t > 0) continue;
    if (conPres && a._k != null && guion.presupuestoBase.has(a._k) && (guion.presupuesto.get(a._k) ?? 0) >= guion.presupuestoBase.get(a._k)) continue;
    out.push(a);
  }
  if (guion?.traza && guion.nodos && typeof guion.opciones === "function") for (const e of guion.traza) {
    if (e.que !== "entrada-sin-crear" || !tipos.has(e.tipo)) continue;
    const s = guion.nodos.get(e.k);
    if (!s) continue;
    const o = guion.opciones(s), opts = {};
    for (const k in o) opts[k] = guion.resolver(o[k], []);
    const a1 = s.args?.[1], nombre = a1 && typeof a1 === "object" && "id" in a1 ? a1.id : null;
    const pl = guion.plantillas?.get(e.k);
    const act = typeof guion.armarActor === "function" ? guion.armarActor(e.k, e.tipo, nombre, opts, "main") : {
      tipo: e.tipo,
      nombre: nombre,
      opts: opts,
      k: e.k
    };
    if (pl?.mapa != null) act.mapa = pl.mapa;
    out.push(act);
  }
  return out;
}

let mgrActual = null;

function engancharGuion(guion) {
  const op = guion?.op;
  if (!op || op.__torres) return;
  op.__torres = true;
  const c0 = op.crearActor;
  if (typeof c0 === "function") op.crearActor = function(a) {
    if (a?.tipo === "RASEN_EL" && mgrActual) return mgrActual.crearRasenEl(a).then(() => true, e => {
      console.warn("[zako] rasen_el", e);
      return false;
    });
    if (a?.tipo === "11B_DEMO" && mgrActual) {
      const m = mgrActual;
      m.demo11b?.destruir();
      const d = m.demo11b = new Demo11B(a, {
        ...m.ctx,
        camJuego: () => m.camJuego()
      });
      a._demo11b = d;
      return d.iniciar().then(() => {
        m.log("11b_demo", {});
        return true;
      }, e => {
        console.warn("[zako] 11b_demo", e);
        return false;
      });
    }
    if (TIPOS_RAPEL.has(a?.tipo) && mgrActual) {
      const m = mgrActual;
      if (!m.rapel) m.rapel = new Rapel(m, m.ctx);
      return m.rapel.crear(a).catch(e => {
        console.warn("[zako] rapel", e);
        return false;
      });
    }
    try {
      mgrActual?.rasen?.ajustarActor(a);
    } catch (e) {
      console.warn("[zako] torre", e);
    }
    return c0.call(this, a);
  };
  const d0 = op.destruirActor;
  op.destruirActor = function(a) {
    if (a?._rasenEl) {
      const E = a._rasenEl;
      E.destruir();
      if (mgrActual?.rasenEl === E) mgrActual.rasenEl = null;
      return;
    }
    if (a?._demo11b) {
      a._demo11b.destruir();
      return;
    }
    return d0?.call(this, a);
  };
}

export function mensajeZako(dest, v, info, ctx) {
  if (info?.entrada) return false;
  const mgr = ctx?.juego?.__zakos;
  if (!mgr) return false;
  if (mgr.rasen && mgr.rasen.actor?.nombre === dest && mgr.rasen.mensaje(v)) {
    mgr.log("rasen mesg", {
      v: v.slice(0, 4)
    });
    return true;
  }
  if (mgr.rasenEl && mgr.rasenEl.nombre === dest && mgr.rasenEl.mensaje(v)) {
    mgr.log("rasen_el mesg", {
      v: v.slice(0, 2)
    });
    return true;
  }
  if (mgr.rapel && mgr.rapel.mensaje(dest, v)) {
    mgr.log("rapel mesg", {
      dest: dest,
      v: v.slice(0, 3)
    });
    return true;
  }
  for (const c of mgr.comandantes.values()) {
    if (c.actor.nombre !== dest) continue;
    if (v[0] === H_KILL) {
      mgr.log("kill", {
        com: c.tipo
      });
      c.destruir();
    }
    return true;
  }
  return false;
}

export function zakosDe(juego) {
  return juego?.__zakos || null;
}
