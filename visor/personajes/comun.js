// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, Jefes, Flujo, MM, ANG, FPS, ratan2, dir4096, difS, nearExp4P, nearTimeP, cargarModelo, aplicarPose, subDeLinea } from "../jefes/base.js";

import { sonido, VIB } from "../juego.js";

import { disposicionHud } from "../hud.js";

export { MM, ANG, FPS, ratan2, dir4096, difS };

export const difAbs = (a, b) => Math.abs(difS(a, b));

export const randU = n => Math.floor(Math.random() * 32767) % n;

export const randS = n => Math.floor(Math.random() * 32767) % (2 * n) - n;

export const vecDir = (dx, dz) => dir4096(dx, dz);

export function strcode(t) {
  let id = 0;
  for (const c of (new TextEncoder).encode(t || "")) id = (id << 5 | id >> 11) + c & 65535;
  return id;
}

export const HASH = {
  ENTER: 3538,
  LEAVE: 54732,
  LEAVE2: 6681,
  KILL: 12835,
  OFF: 51495,
  ON: 3662,
  START: 39455,
  STOP: 24203,
  MOTION: 37754,
  MOVE: 19293,
  VOICE: 14430,
  TURN: 58089,
  MODE: 18717,
  OPERATION: 20276,
  MAP: 63917,
  RUN_MOVE: 28923,
  STANCE: 12856,
  END: 41509,
  TRAP_KETCHUP: 49310
};

export function asentir(vec, boca) {
  if (!vec) return;
  if (boca === 1) {
    vec[0] += 32;
    if (vec[0] >= 128) {
      vec[0] = 128;
      if (vec[2] === 0) vec[2] = randS(32);
    }
  } else if (boca === 2) {
    if (vec[0] < 64) {
      vec[0] += 16;
      if (vec[0] >= 64) {
        vec[0] = 64;
        if (vec[2] === 0) vec[2] = randS(16);
      }
    } else {
      vec[0] -= 16;
      if (vec[0] <= 64) {
        vec[0] = 64;
        if (vec[2] === 0) vec[2] = randS(16);
      }
    }
  } else if (vec[0] > 0) vec[0] -= 8;
  if (vec[2] !== 0) {
    if (vec[2] > 0) {
      vec[2] -= 8;
      if (vec[2] < 0) vec[2] = 0;
    } else {
      vec[2] += 8;
      if (vec[2] > 0) vec[2] = 0;
    }
  }
}

export function dirVec3(rot, len) {
  const sx = Math.sin(rot.x * ANG), cx = Math.cos(rot.x * ANG), sy = Math.sin(rot.y * ANG), cy = Math.cos(rot.y * ANG);
  return new THREE.Vector3(Math.trunc(len * sy * cx), Math.trunc(-len * sx), Math.trunc(len * cy * cx));
}

export class Vox {
  constructor(sis) {
    this.sis = sis;
    this.cola = [];
    this.init(true);
  }
  init(sinParar = false) {
    this.cola = [];
    this.lastStatus = -1;
    this.voxcode = -1;
    this.lastVoxcode = -1;
    this.end = 0;
    this.playing = 0;
    this.playtime = -1;
    this.time = -1;
    this.nextDelay = 0;
    this.nextCode = 0;
    if (!sinParar && this.sis.streamStatus() !== -1) this.sis.streamPlayStop();
  }
  queue(code) {
    if (this.cola.length === 6) return -1;
    this.cola.push(code);
    this.sis.log("vox cola", {
      code: code
    });
    return 0;
  }
  queueDelay(code, delay) {
    this.nextCode = code;
    this.nextDelay = delay;
  }
  tick() {
    if (this.nextDelay !== 0 && --this.nextDelay <= 0) {
      this.queue(this.nextCode);
      this.nextDelay = 0;
    }
    const prev = this.lastStatus, curr = this.sis.streamStatus();
    this.lastStatus = curr;
    this.end = 0;
    this.playing = 0;
    if (this.playtime >= 0 && this.cola.length && prev !== -1) {
      if (prev === 2) this.playtime++;
      let timeout = 0;
      if (++this.time > 5400) {
        timeout = 1;
        this.sis.streamPlayStop();
      }
      if (curr === -1 || timeout) {
        this.voxcode = -1;
        this.lastVoxcode = this.cola[0];
        this.end = 1;
        this.cola.shift();
        this.time = -1;
        this.playtime = -1;
      }
    }
    if (curr === -1 && this.cola.length) {
      this.time = 0;
      this.playtime = 0;
      this.voxcode = this.cola[0];
      this.playing = 1;
      this.sis.voxStream(this.voxcode, 0);
    }
  }
  current() {
    return this.voxcode;
  }
  fin() {
    return this.end;
  }
  sonando() {
    return this.playing;
  }
  playTime() {
    return this.playtime > 0;
  }
  codeStart(code) {
    return this.voxcode === code && this.playtime === 1;
  }
  codeEnd(code) {
    if (this.end === 1 && this.lastVoxcode === code) {
      this.lastVoxcode = -1;
      return true;
    }
    return false;
  }
  status() {
    return this.lastStatus;
  }
}

export const PLAYER = {
  WATCH: 1,
  INTRUDE: 2,
  NORMAL_WATCH: 8,
  MOVE: 16,
  SQUAT: 32,
  GROUND: 64,
  CB_BOX: 4096,
  CAUTION: 65536,
  CHECK_WALL: 131072
};

export const STATE = {
  STUN: 2,
  CUT_IN: 64,
  PAUSE_ONLY: 4857856,
  PADRELEASE: 268435456
};

const ALT_SNAKE = [ 1100, 496, 136 ];

const pendientes = [];

export function engancharGuion(guion) {
  const g = guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
  if (!g?.op || g.op.__personajes) return !!g?.op;
  const m0 = g.op.mensaje;
  g.op.mensaje = (d, v, i) => {
    const s = Sistema.actual;
    if (s && s.vivo && s.mensaje(d, v, i || {})) return true;
    if (i?.entrada && Array.isArray(v)) {
      if (!pendientes.enEntrada || pendientes.st !== g.st) {
        pendientes.length = 0;
        pendientes.st = g.st;
      }
      pendientes.enEntrada = true;
      pendientes.push({
        d: d,
        v: v.slice(),
        st: g.st
      });
      if (pendientes.length > 300) pendientes.shift();
    } else pendientes.enEntrada = false;
    return m0 ? m0(d, v, i) : false;
  };
  if (typeof g.prepararNivel === "function") {
    const pn = g.prepararNivel.bind(g);
    g.prepararNivel = (...a) => {
      const x = pn(...a);
      try {
        if (g.delegados && g.nodos) for (const [k, s] of g.nodos) if (TIPOS_DELEGADOS.has(s.tipo) && !((g.presupuestoBase?.get(k) || 0) > 0)) g.delegados.add(k);
      } catch (e) {
        console.warn("[personajes] delegados", e);
      }
      return x;
    };
  }
  if (typeof g.despuesDelMain === "function") {
    const dm = g.despuesDelMain.bind(g);
    g.despuesDelMain = (reinicio, ...r) => {
      const x = dm(reinicio, ...r);
      try {
        const s = Sistema.actual;
        if (s && s.vivo) s.trasMain(g, !!reinicio);
      } catch (e) {
        console.warn("[personajes] trasMain", e);
      }
      return x;
    };
  }
  g.op.__personajes = true;
  return true;
}

export const _pendientes = pendientes;

export function tomarPendientes(nombre, st) {
  const out = [];
  for (let k = pendientes.length - 1; k >= 0; k--) {
    const p = pendientes[k];
    if (p.d === nombre && (st == null || p.st === st)) {
      out.unshift(p.v);
      pendientes.splice(k, 1);
    }
  }
  return out;
}

if (typeof window !== "undefined") {
  const intentar = () => {
    if (!engancharGuion()) setTimeout(intentar, 500);
  };
  setTimeout(intentar, 0);
}

export class Sistema {
  static de(J, ctx = {}) {
    const mgr = Jefes.de(J, ctx);
    if (!mgr.__personajes) {
      const s = new Sistema(mgr, ctx);
      mgr.lista.unshift(s);
      mgr.__personajes = s;
    } else Object.assign(mgr.__personajes.ctx, ctx);
    return mgr.__personajes;
  }
  constructor(mgr, ctx) {
    this.mgr = mgr;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    Object.assign(this.ctx, ctx);
    this.vivo = true;
    this.listo = true;
    this.blanco = false;
    this.barras = [];
    this.o = null;
    this.actor = {
      tipo: "SISTEMA_PERSONAJES"
    };
    this.flujo = new Flujo({
      voces: ctx.voces,
      simulado: !!ctx.vocesSimuladas
    });
    this.autoVoz = false;
    this.balas = [];
    this.estado = 0;
    this.kore = {
      pos: new THREE.Vector3,
      flag: 0
    };
    this.registro = [];
    this.correr = null;
    this.personajes = [];
    this.tareas = [];
    this.receptores = [];
    this.vox = new Vox(this);
    this.fundidos = [];
    this.bloqueos = new Set;
    this.procsPendientes = [];
    this.padMask = ~0;
    this.mascaraPad = false;
    Sistema.actual = this;
    this.engancharGuion();
    this.engancharRadar();
    this.engancharAgarre();
    const sub0 = mgr.subtitulo.bind(mgr);
    mgr.subtitulo = () => sub0() || this.subtitulo();
    this.hudExtras = [];
    if (!mgr.hud.__personajes) {
      mgr.hud.__personajes = true;
      const hd = mgr.hud.dibujar.bind(mgr.hud);
      mgr.hud.dibujar = (jefes, mostrar) => {
        hd(jefes, mostrar);
        const s = mgr.__personajes;
        if (!s || !s.vivo || !s.hudExtras.length || mgr.hud.oculto) return;
        const x = mgr.hud.x, D = disposicionHud();
        x.imageSmoothingEnabled = false;
        for (const f of s.hudExtras.slice()) {
          x.setTransform(D.kcss, 0, 0, D.kcss, D.origenJefes?.[0] ?? 0, D.origenJefes?.[1] ?? 0);
          try {
            f(x, D);
          } catch (e) {
            console.warn("[personajes] hud", e);
          }
        }
        x.setTransform(1, 0, 0, 1, 0, 0);
      };
    }
    this.ray = new THREE.Raycaster;
  }
  engancharGuion() {
    engancharGuion(this.ctx.guion);
  }
  mensaje(dest, v, info = {}) {
    let ok = false;
    for (const r of this.receptores.slice()) if (r.vivo && r.nombre === dest) ok = r.recibir(v, info) || ok;
    if (ok) this.log("mesg", {
      dest: dest,
      m: v[0]
    });
    return ok;
  }
  enviar(dest, v) {
    this.log("enviar", {
      dest: dest,
      m: v[0]
    });
    if (dest === 25342) {
      this.mensajeFundidos(v);
      return true;
    }
    let ok = false;
    for (const r of this.receptores.slice()) if (r.vivo && r.nombre === dest) ok = r.recibir(v, {
      interno: true
    }) || ok;
    if (ok) return true;
    if (dest === 8650) return this.mensajeSnake(v);
    return this.ctx.mensaje ? this.ctx.mensaje(dest, v, {
      origen: {
        tipo: "actor"
      }
    }) !== false : false;
  }
  fundido(modo, cuadros) {
    const f = {
      modo: modo,
      shade: Math.max(1, cuadros),
      t: 1,
      valor: modo & 1 ? 255 : 0
    };
    this.fundidos.push(f);
    this.log("fundido", {
      modo: modo,
      cuadros: cuadros
    });
    return f;
  }
  mensajeFundidos(v) {
    for (const f of this.fundidos.slice()) {
      if (v[0] === HASH.KILL) this.fundidos.splice(this.fundidos.indexOf(f), 1); else if (v[0] === 29169) {
        f.t = 0;
        f.modo |= 1;
      }
    }
  }
  cuadroFundidos() {
    let negro = 0;
    for (const f of this.fundidos.slice()) {
      if (f.t > f.shade) f.t = f.shade;
      let s = Math.trunc(f.t * 255 / f.shade);
      if (f.modo & 1) s = 255 - s;
      f.t++;
      f.valor = s;
      negro = Math.max(negro, s / 255);
      if (f.modo & 1 && f.t >= f.shade) this.fundidos.splice(this.fundidos.indexOf(f), 1);
    }
    if (negro > 0 || this._negro) {
      this.mgr.hud.negro = negro;
      this._negro = negro > 0;
    }
  }
  guionListo() {
    const g = this.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null), id = this.ctx.nivel?.id;
    if (!g || !id || !this.ctx.proc) return true;
    return g.st === id && !!g.script && g.fase === "juego";
  }
  proc(pid, args = []) {
    if (!(pid > 0)) return false;
    if (!this.guionListo()) {
      this.procsPendientes.push([ pid, args ]);
      this.log("proc en espera", {
        proc: pid
      });
      return true;
    }
    this.log("proc", {
      proc: pid,
      args: args
    });
    return this.ctx.proc ? (this.ctx.proc(pid, args), true) : false;
  }
  trasMain(g, reinicio) {
    if (reinicio) this.reiniciar();
    this.log("tras el main", {
      reinicio: reinicio,
      st: g?.st,
      nivel: g?.nivel?.id ?? null,
      mio: this.ctx.nivel?.id ?? null,
      igual: !!g?.nivel && g.nivel === this.ctx.nivel
    });
    if (!g?.nivel || !this.ctx.nivel || g.nivel !== this.ctx.nivel || !g.presupuesto) return;
    const propios = new Set([ ...this.personajes, ...this.receptores, ...this.mgr.lista.filter(j => j.dePersonajes) ]);
    for (const j of propios) {
      const a = j.actor;
      if (!a || a._k == null || j === this) continue;
      if (!j.vivo) {
        if (reinicio && !j.__descontado && !g.creados?.includes(a) && (g.presupuestoBase?.get(a._k) || 0) > 0) {
          j.__descontado = true;
          g.presupuestoBase.set(a._k, g.presupuestoBase.get(a._k) - 1);
        }
        continue;
      }
      if (g.creados?.includes(a)) continue;
      if (!reinicio && !TIPOS_SOBRANTES.has(a.tipo)) continue;
      const base = g.presupuestoBase?.get(a._k) || 0;
      if (base > 0 && (g.presupuesto.get(a._k) || 0) > 0) {
        this.log("sobra", {
          tipo: a.tipo,
          nombre: a.nombre,
          reinicio: reinicio
        });
        if (j.quitar) j.quitar(); else j.destruir();
        if (a._meryl === j) a._meryl = null;
        g.presupuestoBase.set(a._k, base - 1);
      }
    }
  }
  reiniciar() {
    this.fundidos = [];
    this.cineAbierta = false;
    this.flujo.parar();
    this.vox.init(true);
    if (this.progcam) {
      this.progcam.activo = false;
      this.progcam.buzon = [];
    }
    if (this.camEv) this.camEv.bits = 0;
    this.padMask = ~0;
    this.mascaraPad = false;
    this.estado = 0;
    this.aplicarCongelar();
    if (this._negro) {
      this.mgr.hud.negro = 0;
      this._negro = false;
    }
    try {
      this.mgr.hud.dibujar(this.mgr.lista.filter(j => j.vivo && j.listo), this.mgr.mostrarBarras);
    } catch {}
    this.log("reinicio");
  }
  bloquear(quien, si) {
    if (si) this.bloqueos.add(quien); else this.bloqueos.delete(quien);
    this.aplicarCongelar();
  }
  aplicarCongelar() {
    const c = !!(this.estado & STATE.PADRELEASE) || this.bloqueos.size > 0;
    if (c !== !!this._cong) {
      this._cong = c;
      this.mgr.congelar(c);
      this.log(c ? "snake sin control" : "snake con control");
    }
  }
  boca(nombre) {
    const f = this.flujo;
    if (f.estado !== 2 || !f.listo?.datos?.lip) return 0;
    const s = f.segundos(), h = (nombre & 65535).toString(16).padStart(4, "0");
    let v = 0;
    for (const e of f.listo.datos.lip) {
      if (e[0] > s) break;
      if (e[1] === h && e[2] !== 4) v = e[2];
    }
    return v;
  }
  engancharRadar() {
    const J = this.J;
    if (typeof J.conosRadar !== "function" || J.__radarPersonajes) return;
    const c0 = J.conosRadar.bind(J), s = this;
    J.conosRadar = () => {
      const out = c0();
      if (s.vivo) for (const p of s.personajes) {
        const c = p.vivo && p.conoRadar?.();
        if (c) out.push(c);
      }
      return out;
    };
    J.__radarPersonajes = true;
  }
  engancharAgarre() {
    const J = this.J, s = this;
    if (J.__agarrePersonajes || typeof J.agarrar !== "function") return;
    J.__agarrePersonajes = true;
    const ag = J.agarrar.bind(J), ap = J.apretar.bind(J), so = J.soltar.bind(J), tg = J.tirarGuardia?.bind(J);
    J.agarrar = (...a) => {
      const c = s.candidatoAgarre();
      if (c && c.d <= s.distGuardiaAgarre()) return s.agarrarPersonaje(c.p);
      return ag(...a);
    };
    J.apretar = (...a) => {
      const p = s.agarradoMio();
      return p ? s.apretarPersonaje(p) : ap(...a);
    };
    J.soltar = (...a) => {
      const p = s.agarradoMio();
      if (!p) return so(...a);
      J.agarrado = null;
      s.log("suelta", {
        tipo: p.actor?.tipo
      });
    };
    if (tg) J.tirarGuardia = (...a) => {
      const y = J.ctx.yawSnake ? J.ctx.yawSnake() : 0, f = new THREE.Vector3(-Math.sin(y), 0, -Math.cos(y)), sp = J.ctx.rig.position;
      const g = typeof J.guardiaGolpe === "function" ? J.guardiaGolpe(sp, f, .2, 1, .8) : null;
      const p = g && g.__jefe && s.personajes.includes(g.__jefe) && g.__jefe.capturable?.() ? g.__jefe : null;
      if (!p) return tg(...a);
      const der = (g.o.position.x - sp.x) * f.z - (g.o.position.z - sp.z) * f.x > 0;
      J.sn.accion = {
        clip: der ? 36 : 37,
        t: 0,
        dur: 22
      };
      p.capturar(36, s.dirSnakeRot());
      s.log("tira", {
        tipo: p.actor?.tipo
      });
      return true;
    };
  }
  agarradoMio() {
    const g = this.J.agarrado;
    return g && g.__jefe && this.personajes.includes(g.__jefe) ? g.__jefe : null;
  }
  candidatoAgarre() {
    const yo = this.J.ctx.rig.position;
    let mejor = null;
    for (const p of this.personajes) {
      if (!p.vivo || !p.o || !p.capturable?.()) continue;
      const q = p.o.position, d = Math.max(Math.abs(q.x - yo.x), Math.abs(q.z - yo.z));
      if (d > .8 || Math.abs(q.y - yo.y) > .9) continue;
      const o = yo.clone(), c = q.clone();
      o.y += 1;
      c.y += 1;
      if (!this.J.libre(o, c)) continue;
      if (!mejor || d < mejor.d) mejor = {
        p: p,
        d: d
      };
    }
    return mejor;
  }
  distGuardiaAgarre() {
    const yo = this.J.ctx.rig.position;
    let md = Infinity;
    for (const g of this.J.ctx.guardias || []) {
      if (!g.o || g.inactivo || g.borrado || [ "muerto", "cuelloRoto", "piso", "cae", "soltado", "levanta", "agarrado" ].includes(g.accion)) continue;
      const d = Math.max(Math.abs(g.o.position.x - yo.x), Math.abs(g.o.position.z - yo.z));
      if (d > .8 || Math.abs(g.o.position.y - yo.y) > .9) continue;
      const o = yo.clone(), q = g.o.position.clone();
      o.y += 1;
      q.y += 1;
      if (!this.J.libre(o, q)) continue;
      if (d < md) md = d;
    }
    return md;
  }
  agarrarPersonaje(p) {
    const J = this.J, S = J.sn;
    J.agarrado = p.proxy;
    S.tSin = 0;
    S.tSuelto = 0;
    S.accion = {
      clip: 38,
      t: 0
    };
    p.golpesAgarre = 0;
    p.faint -= 1;
    p.capturar(0, this.dirSnakeRot());
    sonido("golpe");
    this.log("agarra", {
      tipo: p.actor?.tipo
    });
    J.ctx.aviso?.("AGARRADA: APRETÁ PARA AHORCARLA (10 VECES LE ROMPE EL CUELLO); MANTENÉ Y MOVETE PARA ARRASTRARLA");
    return true;
  }
  apretarPersonaje(p) {
    const J = this.J, S = J.sn;
    p.golpesAgarre = (p.golpesAgarre || 0) + 1;
    p.faint -= 1;
    S.tSin = 0;
    S.accion = {
      clip: 38,
      t: 0
    };
    if (p.golpesAgarre >= 10) {
      J.agarrado = null;
      S.accion = {
        clip: 39,
        t: 0,
        dur: 56
      };
      sonido("cuello");
      J.vibrar?.(VIB.cuello);
      this.log("cuello", {
        tipo: p.actor?.tipo
      });
    }
  }
  accionAgarre(p) {
    const J = this.J, S = J.sn || {};
    if (S.accion?.clip === 39) return 39;
    if (J.agarrado !== p.proxy) return 0;
    if (S.accion?.clip === 38) return 38;
    if (S.cuadrado && S.mov) return 13;
    return 7;
  }
  dirSnakeRot() {
    const y = this.J.ctx.yawSnake?.();
    return y == null ? 0 : (Math.round((y - Math.PI) / ANG) % 4096 + 4096) % 4096;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 600) this.registro.shift();
  }
  voxStream(code, flags = 0) {
    if (!(code > 0)) return;
    this.flujo.vox(code);
    this.autoVoz = !(flags & 1073741824);
    this.log("voz", {
      code: code
    });
  }
  streamStatus() {
    return this.flujo.estado;
  }
  streamPlayStart() {
    if (this.flujo.estado === 1) this.flujo.empezar();
  }
  streamPlayStop() {
    this.flujo.parar();
    this.autoVoz = false;
  }
  subtitulo() {
    const f = this.flujo;
    if (this.ctx.subtitulos === false) return null;
    return subDeLinea(f.lineaSub());
  }
  ponerEstado(bits) {
    const a = this.estado;
    this.estado |= bits;
    this.alCambiar(a);
  }
  sacarEstado(bits) {
    const a = this.estado;
    this.estado &= ~bits;
    this.alCambiar(a);
  }
  alCambiar() {
    this.aplicarCongelar();
  }
  cine(si) {
    this.ctx.cine?.(si);
    this.log(si ? "cine" : "fin cine");
  }
  abrirCine() {
    if (this.cineAbierta) return;
    this.cineAbierta = true;
    this.cine(true);
  }
  cerrarCine() {
    if (!this.cineAbierta) return;
    this.cineAbierta = false;
    this.cine(false);
  }
  snake() {
    const r = this.J.ctx.rig.position, p = this.J.postura?.() ?? 0;
    return new THREE.Vector3(Math.round(r.x * 1e3), Math.round(r.y * 1e3) + ALT_SNAKE[p], Math.round(r.z * 1e3));
  }
  estadoSnake() {
    if (this.ctx.estadoSnake) return this.ctx.estadoSnake();
    const p = this.J.postura?.() ?? 0;
    let e = p === 2 ? PLAYER.GROUND : p === 1 ? PLAYER.SQUAT : 0;
    if (this.J.ctx.inventario?.enCaja) e |= PLAYER.CB_BOX;
    if (typeof window !== "undefined" && window.__mgs?.pared) e |= PLAYER.CAUTION;
    return e;
  }
  vida() {
    const inv = this.J.ctx.inventario;
    return inv ? this.J.vida * inv.vidaMax : this.J.vida * 256;
  }
  vidaMax() {
    return this.J.ctx.inventario?.vidaMax ?? 256;
  }
  girarSnake(dir) {
    const r = this.J.ctx.rig.position;
    if (this.ctx.ubicar) this.ctx.ubicar(r.x, r.y, r.z, (dir & 4095) * ANG + Math.PI);
  }
  correrSnake(x, z, vel = 100) {
    this.correr = {
      x: x,
      z: z,
      vel: vel
    };
    this.log("run_move", {
      x: x,
      z: z
    });
  }
  mensajeSnake(v) {
    this.log("mesg snake", {
      m: v[0]
    });
    if (this.ctx.mensaje && this.ctx.mensaje(8650, v, {
      origen: {
        tipo: "actor"
      }
    }) !== false) return true;
    if (v[0] === 28923) {
      this.correrSnake(v[1], v[3] > 32767 ? v[3] - 65536 : v[3]);
      return true;
    }
    return false;
  }
  "dañarSnake"(d) {
    const J = this.J;
    if (J.muerto || this.mgr.gameOverTimer() !== 0) return;
    const inv = J.ctx.inventario;
    J.vida -= inv ? d / inv.vidaMax : d / 256;
    J.ctx.daño?.();
    this.log("daño a snake", {
      d: d
    });
  }
  nuevaBala(origen, dir, op) {
    const b = {
      pos: origen.clone(),
      dir: dir.clone().normalize(),
      vel: op.vel ?? 750,
      largo: op.largo ?? 1e4,
      "daño": op.daño ?? 64,
      lado: op.lado ?? 1,
      recorrido: 0,
      de: op.de || null
    };
    this.ray.set(b.pos.clone().multiplyScalar(MM), b.dir);
    this.ray.far = b.largo * MM;
    const hit = this.J.vista ? this.ray.intersectObject(this.J.vista, false)[0] : null;
    b.hitDist = hit ? hit.distance * 1e3 : b.largo;
    b.hitPos = hit ? hit.point.clone().multiplyScalar(1e3) : null;
    if (b.lado === 2) {
      const o = b.pos.clone().multiplyScalar(MM);
      this.J.balas.push({
        p: o,
        d: b.dir.clone(),
        v: b.vel * MM,
        recorrido: 0,
        "daño": b.daño,
        pared: true,
        mesh: this.J.ctx.balaVisual?.(o, b.dir)
      });
      return null;
    }
    b.mesh = this.J.ctx.balaVisual?.(b.pos.clone().multiplyScalar(MM), b.dir) || null;
    this.balas.push(b);
    return b;
  }
  blancosJugador(excluir) {
    return this.J.activos().filter(g => g !== excluir && !(g.__jefe && g.__jefe.lado === "jugador") && ![ "muerto" ].includes(g.accion) && g.o);
  }
  balasCuadro() {
    for (const b of this.balas.slice()) {
      const p0 = b.pos.clone();
      b.recorrido += b.vel;
      const fin = b.recorrido > b.hitDist;
      const p1 = fin && b.hitPos ? b.hitPos.clone() : b.pos.clone().addScaledVector(b.dir, b.vel);
      let blanco = null, mejor = 1e9;
      for (const g of this.blancosJugador(b.de?.proxy)) {
        const q = g.o.position, a = p0.clone().multiplyScalar(MM), c = p1.clone().multiplyScalar(MM), s = c.clone().sub(a), L2 = s.lengthSq() || 1e-9;
        const t = Math.max(0, Math.min(1, ((q.x - a.x) * s.x + (q.z - a.z) * s.z) / (s.x * s.x + s.z * s.z || 1e-9)));
        const px = a.x + s.x * t, py = a.y + s.y * t, pz = a.z + s.z * t;
        const tope = [ "piso", "cae", "soltado" ].includes(g.accion) ? .5 : 1.85;
        if (Math.hypot(px - q.x, pz - q.z) > .33 || py < q.y || py > q.y + tope) continue;
        const d = t * Math.sqrt(L2);
        if (d < mejor) {
          mejor = d;
          blanco = g;
        }
      }
      if (blanco) {
        this.J.dañar(blanco, b.daño, 1);
        this.log("bala pega", {
          "daño": b.daño
        });
        b.mesh?.removeFromParent();
        this.balas.splice(this.balas.indexOf(b), 1);
        continue;
      }
      b.pos.copy(p1);
      if (b.mesh) {
        b.mesh.position.copy(b.pos).multiplyScalar(MM);
        b.mesh.lookAt(b.mesh.position.clone().add(b.dir));
      }
      if (fin || b.recorrido >= b.largo) {
        if (b.hitPos) this.mgr.chispa(b.hitPos.clone().multiplyScalar(MM), .25, 3);
        b.mesh?.removeFromParent();
        this.balas.splice(this.balas.indexOf(b), 1);
      }
    }
  }
  balasEnemigas() {
    const lista = this.personajes.filter(p => p.vivo && p.listo && p.lado === "jugador" && p.blancoEnemigo);
    if (!lista.length || !this.J.balas?.length) return;
    for (const b of this.J.balas.slice()) {
      const p1 = b.p, p0 = b.p.clone().addScaledVector(b.d, -b.v);
      for (const per of lista) {
        const t = per.cajaBlanco();
        if (!t) continue;
        const caja = new THREE.Box3(t.min, t.max), r = new THREE.Ray(p0, b.d), q = r.intersectBox(caja, new THREE.Vector3);
        if (!q || q.distanceTo(p0) > b.v + 1e-6) continue;
        per.golpeEnemigo({
          "daño": b.daño,
          pos: q.clone()
        });
        b.mesh?.removeFromParent();
        this.J.balas.splice(this.J.balas.indexOf(b), 1);
        break;
      }
    }
  }
  cuadro() {
    if (this.J.zonas?.length) this.playerAddress = this.J.direccion(this.J.ctx.rig.position, this.playerAddress ?? 65535);
    if (this.procsPendientes.length && this.guionListo()) {
      const ps = this.procsPendientes.splice(0);
      for (const [pid, args] of ps) this.proc(pid, args);
    }
    this.cuadroFundidos();
    this.flujo.tick();
    if (this.autoVoz && this.flujo.estado === 1) {
      this.autoVoz = false;
      this.flujo.empezar();
    }
    this.balasEnemigas();
    this.balasCuadro();
    for (const t of this.tareas) t.cuadro();
    for (const mx of this.mezcladores || []) mx.update(1 / FPS);
    if (this.correr) {
      const r = this.J.ctx.rig.position, dx = this.correr.x * MM - r.x, dz = this.correr.z * MM - r.z, d = Math.hypot(dx, dz), v = this.correr.vel * MM;
      if (d <= v) {
        r.x = this.correr.x * MM;
        r.z = this.correr.z * MM;
        this.correr = null;
      } else {
        r.x += dx / d * v;
        r.z += dz / d * v;
      }
      if (this.mgr.congelado) this.mgr.congelado.copy(r);
    }
  }
  dibujar() {}
  destruir() {
    if (Sistema.actual === this) Sistema.actual = null;
    this.vivo = false;
    this.flujo.parar();
    for (const b of this.balas) b.mesh?.removeFromParent();
    this.balas = [];
    if (this._cong) this.mgr.congelar(false);
    if (this._negro) this.mgr.hud.negro = 0;
    this.fundidos = [];
    this.bloqueos.clear();
    this.procsPendientes = [];
    this.hudExtras = [];
    if (this.mando) for (const u of [ ...this.mando.usuarios ]) this.mando.desactivar(u);
    for (const f of this.alDestruir || []) {
      try {
        f();
      } catch (e) {
        console.warn(e);
      }
    }
    this.alDestruir = [];
  }
}

const TIPOS_SOBRANTES = new Set([ "DEMODOLL", "TORTURE", "TR_OCELOT", "TR_BED", "BOXALL", "JOHNNY", "PRISONOTACON", "PRISONNINJA", "PRISONSNAKE2" ]);

const TIPOS_DELEGADOS = new Set([ "TORTURE", "TR_OCELOT", "TR_BED", "BOXALL", "JOHNNY", "PRISONOTACON", "PRISONNINJA", "PRISONSNAKE2" ]);

export class Personaje extends Jefe {
  constructor(actor, mgr, sis) {
    super(actor, mgr);
    this.sis = sis;
    this.lado = "jugador";
    this.blancoEnemigo = false;
    this.step = new THREE.Vector3;
    this.rSphere = -1;
    this.grounded = 0;
    this.interpCtrl = 4;
    this.adjOn = false;
    this.ctx = mgr.ctx;
  }
  async cargarCon(glb, anim, arma) {
    await this.cargarCuerpo(glb, anim);
    if (!this.vivo) {
      this.o?.removeFromParent();
      return;
    }
    if (arma) {
      try {
        const a = await cargarModelo(this.ctx, arma);
        this.huesos[4]?.add(a);
        this.arma = a;
        this.ctx.teñir?.(a);
        a.traverse(m => {
          if (m.isMesh) m.castShadow = true;
        });
      } catch (e) {
        console.warn("[personajes] arma", arma, e.message);
      }
    }
    this.sis.personajes.push(this);
  }
  pose0(accion) {
    const c = this.motor.clip(accion);
    if (!c) return;
    for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c.rot.slice(j * 3, j * 3 + 3);
    this.motor.altura = c.altura[0];
  }
  snake() {
    return this.sis.snake();
  }
  estadoSnake() {
    return this.sis.estadoSnake();
  }
  v3m(p) {
    return new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM);
  }
  addr(p, prev = -1) {
    return this.J.direccion(this.v3m(p), prev < 0 ? 65535 : prev);
  }
  reachTo(a, b) {
    return this.J.alcance(a, b);
  }
  navigate(a, b, p) {
    return this.J.navegarDir(a, b, this.v3m(p), false);
  }
  zona(i) {
    const z = this.J.zonas[i];
    return z ? new THREE.Vector3(Math.round(z.p.x * 1e3), Math.round(z.p.y * 1e3), Math.round(z.p.z * 1e3)) : null;
  }
  insideZone(p, i) {
    const z = this.J.zonas[i];
    return !!z && this.J.dentroZona(z, this.v3m(p));
  }
  zoneDistance(a, b) {
    return this.J.distZona(a, b);
  }
  ruta(r) {
    const R = this.J.ctx.hz?.rutas?.[r];
    return R ? R.puntos.map(q => ({
      p: new THREE.Vector3(q.p[0], q.p[1], q.p[2]),
      cmd: q.cmd || 0
    })) : [];
  }
  actControl() {
    const s = this.step;
    this.mov.x += s.x;
    this.mov.z += s.z;
    if (this.rSphere > 0) {
      const p = new THREE.Vector3(this.mov.x * MM, (this.mov.y - (this.motor?.altura || 0)) * MM, this.mov.z * MM);
      this.J.chocar(p, Math.min(.45, this.rSphere * MM));
      this.mov.x = Math.round(p.x * 1e3);
      this.mov.z = Math.round(p.z * 1e3);
    }
    if (this.interpCtrl === 0) this.rot = nearExp4P(this.rot, this.turn) & 4095; else {
      this.rot = nearTimeP(this.rot, this.turn, this.interpCtrl) & 4095;
      this.interpCtrl--;
    }
    if (this.rSphere >= -1) {
      const alto = this.motor?.altura || 0;
      let vy = this.mov.y + s.y;
      this.grounded = 0;
      const h = this.J.alturaPiso?.(this.mov.x * MM, this.mov.z * MM, (this.mov.y - alto) * MM + .5);
      const piso = h == null ? this.piso ?? 0 : Math.round(h * 1e3);
      if (piso + alto > vy) {
        vy = piso + alto;
        this.grounded = 1;
      }
      this.mov.y = vy;
      this.piso = this.mov.y - alto;
    }
  }
  actMotion() {
    const M = this.motor;
    M.tick();
    const a = this.rot * ANG, c = Math.cos(a), sn = Math.sin(a);
    this.step.x = Math.trunc(M.paso[0] * c + M.paso[1] * sn);
    this.step.z = Math.trunc(-M.paso[0] * sn + M.paso[1] * c);
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.mov.x * MM, (this.mov.y - this.motor.altura) * MM, this.mov.z * MM);
    this.o.rotation.y = this.rot * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjOn ? this.adjust : null, this.motor.altura * MM);
  }
  puntoHuesoMM(i, off) {
    const p = this.puntoHueso(i, off);
    return p.multiplyScalar(1e3);
  }
  ejeHuesoMundo(i, eje) {
    this.o.updateMatrixWorld(true);
    return this.ejeHueso(i, eje);
  }
  cajaBlanco() {
    const t = this.tamBlanco;
    if (!t) return null;
    const c = this.v3m(this.mov);
    return {
      min: new THREE.Vector3(c.x - t[0] * MM, c.y - t[1] * MM, c.z - t[2] * MM),
      max: new THREE.Vector3(c.x + t[0] * MM, c.y + t[1] * MM, c.z + t[2] * MM)
    };
  }
  golpeEnemigo() {}
  execProc(pid, args = []) {
    return this.sis.proc(pid, args);
  }
  procDe(letra, i = 0) {
    const v = this.opts[letra];
    const x = Array.isArray(v) ? v[i] : null;
    return x && typeof x === "object" && "proc" in x ? x.proc : -1;
  }
  destruir() {
    if (this._proxy && this.J.agarrado === this._proxy) this.J.agarrado = null;
    super.destruir();
    const i = this.sis.personajes.indexOf(this);
    if (i >= 0) this.sis.personajes.splice(i, 1);
  }
}
