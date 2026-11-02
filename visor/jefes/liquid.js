// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, Flujo, MM, ANG, ratan2, nearExp, nearExp4P, nearTimeP, cargarModelo, aplicarPose, rotY } from "./base.js";

import { apoyo } from "./apoyo3.js";

import { disposicionHud } from "../hud.js";

import { Snake18, BordeREX, zonaBorde, CENTRO_REX, actualizarCongelado } from "./snake18.js";

const idiv = (a, b) => Math.trunc(a / b);

const s16 = v => (v + 32768 & 65535) - 32768;

const rsin = a => Math.round(Math.sin((a & 4095) * ANG) * 4096);

const rcos = a => Math.round(Math.cos((a & 4095) * ANG) * 4096);

const trig = (v, k) => Math.trunc(v * k / 4096);

const vecDir2 = (x, z) => ratan2(x, z) & 4095;

const difS = (desde, hacia) => ((hacia - desde & 4095) + 2048 & 4095) - 2048;

const difAbs = (a, b) => Math.abs(difS(a, b));

const nearExp2 = (a, b) => nearExp(a, b, 2), nearExp8 = (a, b) => nearExp(a, b, 8);

const nearRange = (a, b, r) => a < b - r ? b - r : a > b + r ? b + r : a;

const aV3 = a => new THREE.Vector3(a[0] * MM, a[1] * MM, a[2] * MM);

const cop = a => a.slice();

const T = [ 0, 0, 1, 2, 37, 2, 36, 38, 3, 4, 23, 7, 5, 6, 9, 8, 11, 10, 29, 12, 13, 17, 18, 19, 15, 16, 20, 21, 22, 27, 24, 25, 26, 30, 31, 32, 33, 34, 35, 28 ];

const TAM_BLANCO = [ 200, 1500, 200 ];

const TAM_SNAKE = [ 300, 750, 300 ];

const TAM_A = [ 200, 400, 500 ], TAM_B = [ 200, 400, 300 ], TAM_C = [ 200, 500, 700 ], TAM_D = [ 400, 500, 700 ];

const F_N = [ 0, 0, 50 ], F_0 = [ 0, 0, 0 ], F_4 = [ 5, 200, 100 ];

const ATAQUES = [ [ TAM_A, F_N, 3, 0, [ -200, 1e3, 600 ] ], [ TAM_A, F_N, 3, 0, [ 200, 1e3, 600 ] ], [ TAM_C, F_N, 2, 1, [ 0, 1e3, 900 ] ], [ TAM_C, F_N, 2, 1, [ 0, 1e3, 900 ] ], [ TAM_A, F_4, 2, 2, [ 0, 1e3, 900 ] ], [ TAM_D, F_0, 3, 3, [ 0, -1e3, 500 ] ], [ null, F_N, 2, 4, [ 0, 1e3, 500 ] ], [ TAM_A, F_N, 2, 100, [ 0, 1e3, 0 ] ], [ TAM_D, F_0, 3, 3, [ 0, -3e3, 1e3 ] ], [ TAM_C, F_N, 2, 1, [ 0, 0, 900 ] ] ];

const CAPTURA = [ [ [ 400, 200, 400 ], [ 0, 1e3, 500 ] ], [ [ 1e3, 200, 1e3 ], [ 0, 1e3, -500 ] ] ];

const P = (x, z) => [ x, 12e3, z ];

const CAMINO_A = [ [ P(3125, 750), P(-125, 500) ], [ P(3125, -750), P(-125, -500) ], [ P(1875, 750), P(5125, 500) ], [ P(1875, -750), P(5125, -500) ] ];

const CAMINO_B = [ [ P(5125, 250), P(3125, -1e3) ], [ P(5125, -250), P(3125, 1e3) ], [ P(-125, 250), P(1875, -1e3) ], [ P(-125, -250), P(1875, 1e3) ] ];

const CAMINO_C = [ [ P(3750, 1250), P(5250, 1e3) ], [ P(3750, -750), P(5250, -1e3) ], [ P(1e3, 1250), P(-500, 1e3) ], [ P(1e3, -750), P(-500, -1e3) ] ];

const BOMBA = [ 3483, 11810, -4300 ];

const LED_A = [ -100, 50, -70 ], LED_B = [ 100, 50, -70 ];

const LED_PASOS = [ 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1 ];

const VOCES_A = [ 14, 15, 6, 5 ], VOCES_B = [ 6, 2 ];

const VOCES_LIQUID_DISCO2 = [ 227672, 227791, 227805, 227824, 227841, 38291, 38297, 0, 38311, 227888, 0, 227890, 227892, 222443, 38335, 38324, 227682, 227707, 227743 ];

const DAÑOS = [ {
  y: [ 4, 8, 4 ],
  z: [ 28, 56, 64, 32, 64 ]
}, {
  y: [ 3, 8, 3 ],
  z: [ 42, 84, 120, 32, 150 ]
}, {
  y: [ 3, 7, 3 ],
  z: [ 56, 112, 120, 32, 250 ]
}, {
  y: [ 3, 6, 3 ],
  z: [ 70, 140, 120, 32, 250 ]
} ];

const BARRA = {
  nombre: "LIQUID",
  izq: [ 16, 111, 159 ],
  der: [ 31, 223, 127 ]
};

const SEG7 = [ 119, 36, 93, 109, 46, 107, 123, 37, 127, 111 ];

const DIG_GRANDE = [ [ 1, 0, 7, 2 ], [ 0, 1, 2, 7 ], [ 7, 1, 2, 7 ], [ 1, 7, 7, 2 ], [ 0, 9, 2, 6 ], [ 7, 9, 2, 6 ], [ 1, 14, 7, 2 ] ];

const DIG_CHICO = [ [ 1, 0, 5, 2 ], [ 0, 1, 2, 5 ], [ 5, 1, 2, 5 ], [ 1, 5, 5, 2 ], [ 0, 7, 2, 5 ], [ 5, 7, 2, 5 ], [ 1, 11, 5, 2 ] ];

const DIG_X = [ 3, 13, 27, 37, 51, 59 ], DIG_Y = [ 32, 32, 32, 32, 35, 35 ];

const PUNTOS = [ [ 24, 36 ], [ 24, 43 ], [ 48, 37 ], [ 48, 44 ] ];

const LINEAS = [ [ 1, 29, 67, 1 ], [ 1, 50, 67, 1 ] ];

export class Liquid extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "LIQUID";
    this.registro = [];
    this.c = {
      mov: [ 1e3, 12e3, 0 ],
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ],
      interp: 4,
      r: 450,
      height: 1100,
      levels: [ 0, 32e3 ],
      grounded: 0,
      atr: 0,
      toques: []
    };
    this.ej = null;
    this.ej_t = 0;
    this.ej2 = null;
    this.ej2_t = 0;
    this.slot = 0;
    this.fin_accion = 0;
    this.sin_choque = 0;
    this.parpadeo = 0;
    this.accion = -1;
    this.dir_obj = -1;
    this.f958 = 0;
    this.fase = 0;
    this.grupo = 0;
    this.estado = 0;
    this.t = 0;
    this.cerca = 0;
    this.dest = [ 0, 0, 0 ];
    this.alerta = 0;
    this.cuadros = 0;
    this.cnt = 1;
    this.vida = 255;
    this.camino = null;
    this.camino_i = 0;
    this.cam_modo = 0;
    this.golpe_puño = 0;
    this.ruta = 0;
    this.colgado = 0;
    this.al_borde = 0;
    this.dir_snake = 0;
    this.dist_snake = 0;
    this.golpe = 0;
    this.fin_tiempo = 0;
    this.continuo = 0;
    this.pila = new Array(8).fill(null);
    this.proc_e = -1;
    this.proc_b = -1;
    this.proc_s = -1;
    this.voz = [];
    this.y = [ 5, 8, 4 ];
    this.z = [ 28, 56, 64, 32, 64 ];
    this.vy = 0;
    this.piso_colgado = 0;
    this.zona_borde = 0;
    this.capturado = null;
    this.tgt = {
      clase: 1,
      damaged: 0,
      a_mode: 0,
      fuerza: null,
      dirCaptura: null
    };
    this.t2 = 9;
    this.invisible = false;
    this.g = {
      rojo: 255,
      vB4: 0,
      vB8: 0,
      d8: 0,
      dc: 0,
      e0: 0,
      e4: 0,
      e8: 0,
      ec: 0,
      f0: 0,
      f4: 0,
      cineOn: 0,
      cineT: 0,
      cineH: 0,
      camT: 0,
      caidaY: 0
    };
    this.cam = {
      modo28: 0,
      pos: [ 0, 0, 0 ],
      tgt: [ 0, 0, 0 ],
      rot: [ 440, 2048, 0 ],
      track: 4e3
    };
    this.radio = .33;
    this.alto = 1.85;
    this.padRelease = false;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 2e3) this.registro.shift();
  }
  async iniciar() {
    const o = this.opts;
    const proc = k => {
      const v = o[k]?.[0];
      return v && typeof v === "object" && "proc" in v ? v.proc : typeof v === "number" ? v : -1;
    };
    this.proc_e = proc("e");
    this.proc_b = proc("b");
    this.proc_s = proc("s");
    this.voz = (o.v || []).map(x => typeof x === "number" ? x : 0).slice(0, 19);
    this.voz = this.voz.map((v, i) => v === 0 && VOCES_LIQUID_DISCO2[i] > 0 ? VOCES_LIQUID_DISCO2[i] : v);
    const nums = k => Array.isArray(o[k]) && o[k].every(x => typeof x === "number") ? o[k] : null;
    const lvl = this.nivel(), tabla = DAÑOS[lvl >= 0 && lvl <= 2 ? lvl : 3];
    const y = nums("y"), z = nums("z");
    this.y = (y && y.length === 3 && !this.ctx.dañosPorNivel ? y : tabla.y).map(v => v & 255);
    this.z = (z && z.length === 5 && !this.ctx.dañosPorNivel ? z : tabla.z).map(v => v & 255);
    this.continuo = Array.isArray(o.m) && typeof o.m[0] === "number" ? o.m[0] : 0;
    const [bsw] = await Promise.all([ cargarModelo(this.ctx, "jefes/b_switch.glb").catch(() => null), this.cargarCuerpo("jefes/liquid.glb", "lqd_18a") ]);
    if (bsw && this.huesos[4]) {
      this.bsw = bsw;
      this.huesos[4].add(bsw);
      this.ctx.teñir?.(bsw);
    }
    this.materiales = [];
    this.modelo.traverse(m => {
      if (m.isMesh) this.materiales.push(m);
    });
    this.borde = new BordeREX(this.J);
    this.A3 = apoyo(this.mgr);
    this.mgr.liquid = this;
    this.apilar(2);
    this.bomba = new LuzBomba(this, BOMBA);
    this.c.mov = [ 1e3, 12e3, 0 ];
    const piso = this.borde.piso(1e3, 0, 12e3 + 500);
    if (piso) this.c.levels[0] = piso.y;
    this.vida = 255;
    this.g.rojo = 255;
    this.fase = 0;
    this.grupo = 0;
    this.estado = 0;
    this.t = 0;
    this.cuadros = 0;
    this.cnt = 1;
    this.fin_tiempo = 0;
    this.alerta = 0;
    this.golpe_puño = 0;
    this.ruta = 0;
    this.colgado = 0;
    this.motor.accion(T[0], 0);
    this.motor.altura = 1106;
    this.c.height = 1106;
    this.cam_modo = 0;
    this.g.camT = 0;
    this.flujo = new Flujo({
      voces: this.ctx.voces,
      simulado: !!this.ctx.vocesSimuladas,
      alHablar: c => this.log("voz", {
        c: c
      })
    });
    this.mgr.flujo = this.flujo;
    await this.flujo.precargar([ ...new Set(this.voz) ]);
    if (!this.ctx.vocesSimuladas && this.ctx.voces?.cargar) for (const id of new Set(this.voz)) if (id >= 0) this.ctx.voces.cargar(id)?.catch?.(() => {});
    this.barras = [ {
      y: 28,
      rest: 255 * 3,
      now: 255 * 3,
      max: 768,
      visible: false,
      conf: BARRA
    } ];
    this.instalarHud();
    this.instalarAgarre();
    this.log("aparece", {
      mov: cop(this.c.mov),
      nivel: lvl,
      y: this.y,
      z: this.z,
      m: this.continuo,
      voces: this.voz.filter(v => v)
    });
  }
  nivel() {
    return this.dificultad();
  }
  gvTime() {
    return this.J.gvTime ?? this.mgr.frame;
  }
  s18() {
    const s = this.mgr.snake18;
    return s && s.vivo ? s : null;
  }
  snakeMM() {
    const s = this.s18();
    if (s) return s.posicion();
    const v = this.snake();
    return [ v.x, v.y, v.z ];
  }
  status() {
    const s = this.s18();
    if (s) return s.status();
    const J = this.J, S = J.sn || {}, p = J.postura?.() ?? 0;
    let v = 0;
    if (p === 1) v |= 32;
    if (p === 2) v |= 64;
    if (S.reac) v |= 256;
    if ([ "derribo", "piso", "levanta" ].includes(S.reac?.tipo)) v |= 512;
    if (S.combo) v |= 2048;
    return v;
  }
  playerAction() {
    return this.s18()?.accionColgado ?? -1;
  }
  vitality() {
    const inv = this.J.ctx.inventario;
    return Math.round(Math.max(0, this.J.vida) * (inv?.vidaMax || 256));
  }
  snakeVive() {
    return !this.J.muerto && this.J.vida > 0;
  }
  gameOverTimer() {
    return this.mgr.gameOverTimer();
  }
  cabezaSnakeY() {
    const C = globalThis.__mgs?.cuerpo, h = C?.obj?.getObjectByName?.("hueso_6");
    if (h && !this.s18()?.colgado) {
      const p = new THREE.Vector3;
      h.getWorldPosition(p);
      if (Number.isFinite(p.y)) return Math.round(p.y * 1e3);
    }
    return this.snakeMM()[1] + 600;
  }
  seC(id) {
    this.mgr.se(id, aV3(this.c.mov), null);
  }
  seM(id, modo = 1) {
    this.mgr.se(id, aV3(this.c.mov), modo ? "bomba" : null);
  }
  se2(id) {
    this.mgr.se(id, null, null);
  }
  voxStream(code, proc = 0) {
    if (this.J.muerto) return;
    this.flujo.vox(code);
    this.vozAuto = !(proc & 1073741824);
    this.log("VoxStream", {
      code: code,
      esperar: !this.vozAuto
    });
  }
  streamStatus() {
    return this.flujo.estado;
  }
  guardiaVoz() {
    const f = this.flujo;
    if (f.estado !== 0 && f.estado !== 2) {
      this.vozCuadros = 0;
      return;
    }
    if (this.vozEstado === f.estado && this.vozPedido === f.pedido) this.vozCuadros++; else this.vozCuadros = 0;
    this.vozEstado = f.estado;
    this.vozPedido = f.pedido;
    const lim = f.estado === 2 ? Math.round(((f.listo?.buffer?.duration ?? f.listo?.datos?.seg ?? 0) + 1) * 30) : 25;
    if (this.vozCuadros <= lim) return;
    this.log("voz: se da por dicha", {
      code: f.codigo,
      estado: f.estado
    });
    if (f.estado === 0) {
      ++f.pedido;
      f.listo = {
        datos: f.dur?.get?.(f.codigo) || null,
        buffer: null
      };
      f.estado = 1;
    } else f.parar();
    this.vozCuadros = 0;
  }
  playStart() {
    if (this.flujo.estado === 1) this.flujo.empezar();
  }
  accionMotion(slot, interp = 4) {
    this.slot = slot;
    this.motor.accion(T[slot], interp);
  }
  sinOverride() {
    this.motor.override(T[0], 4, 0);
    this.ej2 = null;
    this.ej2_t = 0;
  }
  get isEnd() {
    return this.motor.isEnd;
  }
  get frameM() {
    return this.motor.info1.frame;
  }
  ejecutor(fn) {
    this.ej = fn;
    this.ej_t = 0;
    this.c.turn[0] = 0;
    this.c.turn[2] = 0;
  }
  hacerBlanco() {
    this.tgt.clase |= 23;
  }
  ponerAjuste(on) {
    this.ajusteOn = on;
    if (!on && this.adjust) for (const a of this.adjust) a[0] = a[1] = a[2] = 0;
  }
  apilar(n) {
    for (let i = 0; i < 8; i++) if (this.pila[i] == null) {
      this.pila[i] = n;
      return;
    }
  }
  desapilar(n) {
    for (let i = 0; i < 8; i++) if (this.pila[i] === n) {
      this.pila[i] = null;
      return;
    }
  }
  correrPila() {
    for (let i = 0; i < 8; i++) {
      const n = this.pila[i];
      if (n != null) this.PILA[n].call(this);
    }
  }
  cuadro() {
    this.golpesDelVisor();
    this.actControl();
    this.actMotion();
    this.Logica();
    this.empujarSnake();
    if (--this.alerta < 0) this.alerta = 0;
    if (this.vida < this.g.rojo) this.g.rojo--;
    const b = this.barras[0];
    b.rest = this.g.rojo * 3;
    b.now = this.vida * 3;
    b.visible = this.fase !== 0 && !this.ganado;
    if (this.fase !== 0 && this.fin_tiempo === 0 && this.cuenta && this.cuenta.tiempo === 0) {
      this.fin_tiempo = 1;
      this.padRelease = true;
      actualizarCongelado(this.mgr);
      this.destello = new DestelloBomba(this, BOMBA, 20);
      this.log("fin del tiempo");
      if (this.gameOverTimer() === 0 && this.vitality() > 0) {
        this.correrProc("b");
        this.mgr.gameOver();
        this.mgr.timerGO = -2;
      }
    }
    if (this.fin_tiempo > 0) {
      if (this.fin_tiempo >= 31 && this.mgr.timerGO === -2) this.mgr.timerGO = 1;
      if (this.fin_tiempo === 600) {
        this.mgr.timerGO = 0;
        this.mgr.gameOver();
      }
      this.fin_tiempo++;
    }
    const cd = this.cuenta ? this.cuenta.tiempo : 0;
    if (cd > 0 && cd < 5400 && cd % 30 === 0) this.se2(cd < 900 ? 185 : 183);
    this.cuenta?.cuadro();
    this.bomba?.cuadro();
    this.destello?.cuadro();
    this.camara();
    this.flujo.tick();
    if (this.vozAuto && this.flujo.estado === 1) this.flujo.empezar();
    this.guardiaVoz();
    this.blanco = this.vivo && !!(this.tgt.clase & 4) && !this.ganado;
  }
  golpesDelVisor() {
    const lanzado = this.golpes.some(x => x.modo === 4 && x.cuanto >= 5 && !x.explosion);
    const agarre = this.agarre;
    this.agarre = null;
    const d = this.tomarDaño();
    this.tgt.damaged = 0;
    if (lanzado && this.tgt.clase & 2) {
      this.tgt.damaged = 2;
      this.tgt.a_mode = 36;
      this.tgt.dirCaptura = this.rumboSnake();
      this.log("lanzado", this.estadoCorto());
      return;
    }
    if (agarre && this.tgt.clase & 2) {
      this.tgt.damaged = 2;
      this.tgt.a_mode = 0;
      this.tgt.dirCaptura = this.rumboSnake();
      this.log("agarrado", this.estadoCorto());
      return;
    }
    if (d) {
      this.tgt.damaged = 4;
      this.tgt.a_mode = d.a_mode;
      this.log("golpe recibido", {
        a_mode: d.a_mode,
        ...this.estadoCorto()
      });
    }
  }
  rumboSnake() {
    const y = this.J.ctx.yawSnake ? this.J.ctx.yawSnake() : globalThis.__mgs?.rig?.rotation?.y ?? 0;
    return Math.round((y + Math.PI) / ANG) & 4095;
  }
  estadoCorto() {
    return {
      fase: this.fase,
      g: this.grupo,
      s: this.estado,
      ej: this.ej?.name || "",
      vida: this.vida
    };
  }
  actControl() {
    const c = this.c;
    c.mov[0] += c.step[0];
    c.mov[2] += c.step[2];
    if (c.r > 0) this.chocar(c.r, 2);
    if (c.interp === 0) for (let i = 0; i < 3; i++) c.rot[i] = s16(nearExp4P(c.rot[i], c.turn[i])); else {
      for (let i = 0; i < 3; i++) c.rot[i] = s16(nearTimeP(c.rot[i], c.turn[i], c.interp));
      c.interp--;
    }
    if (c.r >= -1) {
      let vy = c.mov[1] + c.step[1];
      const piso = this.borde.piso(c.mov[0], c.mov[2], c.mov[1] - 600);
      c.atr = piso ? piso.atr : 0;
      c.grounded = 0;
      if (piso && piso.y + c.height > vy) {
        vy = piso.y + c.height;
        c.grounded = 1;
      }
      c.levels[0] = piso ? piso.y : 0;
      c.mov[1] = vy;
    }
  }
  chocar(r, segFlag) {
    const c = this.c;
    let px = c.mov[0], pz = c.mov[2];
    const py = c.mov[1];
    c.toques = [];
    for (const w of this.borde.paredes) {
      if (w.flags & segFlag) continue;
      if (py < w.y0 || py > w.y1) continue;
      const ax = w.a[0], az = w.a[2], bx = w.b[0], bz = w.b[2];
      if (px < Math.min(ax, bx) - r || px > Math.max(ax, bx) + r || pz < Math.min(az, bz) - r || pz > Math.max(az, bz) + r) continue;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
      const ex = px - (ax + dx * t), ez = pz - (az + dz * t), d = Math.hypot(ex, ez);
      if (d >= r || d < .001) continue;
      c.toques.push([ -ex, 0, -ez ]);
      px += ex / d * (r - d);
      pz += ez / d * (r - d);
    }
    c.mov[0] = Math.round(px);
    c.mov[2] = Math.round(pz);
  }
  actMotion() {
    const m = this.motor;
    m.tick();
    const pa = m.paso, r = rotY(this.c.rot[1], {
      x: pa[0],
      y: 0,
      z: pa[1]
    });
    this.c.step[0] = Math.trunc(r.x);
    this.c.step[2] = Math.trunc(r.z);
  }
  empujarSnake() {
    if (!(this.t2 & 8) || this.J.muerto || this.mgr.congelado || this.s18()?.colgado) return;
    const s = this.snakeMM(), m = this.c.mov;
    const push = (c1, s1, c2, s2) => {
      s1 += s2;
      s2 = c2 - c1;
      if (s2 >= 0) {
        s1 -= s2;
        return s1 < 0 ? 0 : s1;
      }
      s2 += s1;
      return s2 < 0 ? 0 : -s2;
    };
    const x = push(m[0], TAM_BLANCO[0], s[0], TAM_SNAKE[0]);
    if (!x) return;
    const z = push(m[2], TAM_BLANCO[2], s[2], TAM_SNAKE[2]);
    if (!z) return;
    if (Math.abs(s[1] - m[1]) > TAM_BLANCO[1] + TAM_SNAKE[1]) return;
    const r = this.J.ctx.rig.position;
    if (Math.abs(x) <= Math.abs(z)) r.x += idiv(x, 2) * MM; else r.z += idiv(z, 2) * MM;
    this.J.chocar?.(r, .3);
  }
  Logica() {
    this.MirarASnake();
    this.LeerGolpe();
    this.Cerebro();
    this.Cuerpo();
    this.correrPila();
  }
  MirarASnake() {
    const s = this.snakeMM(), dx = s[0] - this.c.mov[0], dz = s[2] - this.c.mov[2];
    this.dir_snake = vecDir2(dx, dz);
    this.dist_snake = Math.trunc(Math.hypot(dx, dz));
  }
  LeerGolpe() {
    this.golpe = this.tgt.damaged & 6 ? this.tgt.a_mode : 0;
  }
  Cuerpo() {
    this.tgt.clase = 1;
    this.t2 = this.status() & 96 ? 1 : 9;
    this.fin_accion = 0;
    this.sin_choque = 0;
    this.al_borde = 0;
    const t = this.ej_t++;
    if (!this.ej) this.ej = this.E_Quieto;
    this.ej.call(this, t);
    if (this.ej2) {
      const t2 = this.ej2_t++;
      this.ej2.call(this, t2);
    }
    this.tgt.damaged = 0;
    this.Parpadeo();
    this.c.height = this.motor.altura;
    const c = this.c;
    if (this.colgado === 1) {
      c.r = -2;
      c.mov[1] = this.motor.altura + this.piso_colgado;
    } else if (this.colgado === 2 || this.colgado === 3) {
      c.r = -2;
      this.vy += this.colgado === 2 ? -4 : -1;
      c.step[1] = this.vy;
      c.mov[1] += this.vy;
    } else c.r = this.sin_choque ? -1 : nearExp2(c.r, 450);
    if (this.colgado === 0) {
      if (this.vy < 0 && c.grounded) this.vy = 0;
      this.vy -= 16;
      c.step[1] = this.vy;
    }
  }
  Parpadeo() {
    if (this.parpadeo > 0) {
      this.invisible = !!(this.parpadeo & 2);
      this.tgt.clase = 1;
      this.t2 = 1;
      this.parpadeo--;
    } else {
      this.parpadeo = 0;
      this.invisible = false;
    }
  }
  ApuntarCabeza() {
    if (!this.adjust) return;
    const h6 = this.huesos[6];
    let hy = this.c.mov[1] + 600;
    if (h6) {
      const p = new THREE.Vector3;
      h6.getWorldPosition(p);
      hy = Math.round(p.y * 1e3);
    }
    let v = (ratan2(this.dist_snake, this.cabezaSnakeY() - hy) & 4095) - 1024;
    if (v > 512) v = 512; else if (v < -512) v = -512;
    this.adjust[6][0] = v;
    const d = difS(this.c.rot[1], this.dir_snake);
    if (d + 511 >= 0 && d + 511 < 1023) this.adjust[6][1] = d;
  }
}

const D = Liquid.prototype;

const EJ_ACCION = {
  1: "A01_Pose",
  2: "A02_Camina",
  3: "A03_Mira",
  4: "A04_Mira",
  5: "A05_Guardia",
  6: "A06_Parado",
  7: "A07_Guardia",
  8: "A08_Bloquea",
  9: "A09_Para",
  10: "A10_CostadoI",
  11: "A11_CostadoD",
  12: "A12_Gira",
  13: "A13_Atras",
  14: "A14_Adelante",
  15: "A15_Adelante",
  16: "A16_Trompada",
  17: "A17_Trompada2",
  18: "A18_DosTrompadas",
  19: "A19_PatadaBaja",
  20: "A20_Patada",
  21: "A21_Pisoton",
  22: "A22_Combo",
  23: "A23_Embestida",
  24: "A24_TresGolpes",
  25: "A25_TresGolpes2",
  26: "A26_AmagueI",
  27: "A27_AmagueD",
  30: "A30_Agarrar"
};

D.ElegirEjecutor = function() {
  const n = EJ_ACCION[this.accion];
  if (!n) return 0;
  this.ejecutor(this[n]);
  return 1;
};

D.Soltar = function() {
  if (this.ElegirEjecutor()) this.sinOverride(); else this.ejecutor(this.E_Quieto);
  this.c.turn[0] = this.c.turn[2] = 0;
};

D.LeerDañoGolpe = function() {
  const tg = this.tgt;
  if (!(tg.damaged & 4)) return 0;
  if (tg.a_mode === 3) {
    tg.fuerza = null;
    this.ejecutor(this.R_Trompada);
  } else if (tg.a_mode === 4) this.ejecutor(this.vida < 64 ? this.R_Derribo : this.R_Patada);
  tg.damaged = 0;
  return 1;
};

D.LeerCaptura = function() {
  const tg = this.tgt;
  if (!(tg.damaged & 2)) return 0;
  this.ejecutor(tg.a_mode === 36 ? this.R_Lanzado : this.R_Agarrado);
  this.ponerAjuste(false);
  tg.damaged = 0;
  return 1;
};

D.LeerDañoGuardia = function() {
  const tg = this.tgt;
  if (tg.damaged & 4) {
    if (tg.a_mode === 3) {
      tg.fuerza = null;
      this.ejecutor(this.A09_Para);
    } else if (tg.a_mode === 4) this.ejecutor(this.E_Esquive);
    tg.damaged = 0;
    return 1;
  }
  return this.LeerCaptura();
};

D.Reaccion = function() {
  if (this.LeerDañoGolpe() || this.LeerCaptura()) {
    this.tgt.clase = 1;
    return 1;
  }
  return 0;
};

D.Borde = function() {
  const c = this.c;
  if (c.mov[1] < 5e3 || c.levels[0] < 5e3) {
    c.mov = [ 2e3, 12100, 500 ];
    this.vy = 0;
    this.log("se cayó de REX: vuelve arriba");
    return 0;
  }
  let en = c.atr === 1;
  if (!en) en = !!this.borde.online(CENTRO_REX, c.mov, 4);
  if (!en) return 0;
  if (this.vida >= 3) this.ejecutor(this.E_Colgarse); else {
    this.ejecutor(this.E_Caer);
    this.ponerAjuste(false);
  }
  this.al_borde = 1;
  if (this.tgt.damaged & 4) this.tgt.damaged = 0;
  c.step = [ 0, 0, 0 ];
  this.log("borde", {
    vida: this.vida,
    atr: c.atr,
    mov: cop(c.mov)
  });
  return 1;
};

D.E_Quieto = function(t) {
  if (t === 0) {
    this.slot = 0;
    this.motor.accion(T[0], 4);
    this.ponerAjuste(true);
  }
  if (this.Borde()) return;
  this.ApuntarCabeza();
  if (this.Reaccion()) return;
  if (this.ElegirEjecutor()) {
    this.sinOverride();
    this.c.turn[0] = this.c.turn[2] = 0;
    return;
  }
  if (this.dir_obj >= 0) this.ejecutor(this.E_Girar);
  this.hacerBlanco();
};

D.E_Girar = function(t) {
  const d = this.dir_obj;
  if (t === 0) {
    this.accionMotion(8);
    this.ponerAjuste(true);
  }
  this.ApuntarCabeza();
  if (this.Borde()) return;
  if (this.Reaccion()) return;
  if (this.ElegirEjecutor() || d < 0) {
    if (d < 0 && this.ej === this.E_Girar) this.ejecutor(this.E_Quieto);
    this.sinOverride();
    this.c.turn[0] = this.c.turn[2] = 0;
    return;
  }
  this.c.turn[1] = d;
  this.hacerBlanco();
};

D.A01_Pose = function(t) {
  if (t === 0) this.accionMotion(6);
  if (t === 53) this.seC(50);
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.A06_Parado);
  } else this.t2 = 1;
};

D.A02_Camina = function(t) {
  if (t === 0) {
    this.accionMotion(7);
    this.ponerAjuste(true);
  }
  if (this.isEnd) this.accionMotion(4);
  if (this.accion === 2) return;
  this.Soltar();
};

D.A03_Mira = function(t) {
  this.MiraHacia(t, 1, 3);
};

D.A04_Mira = function(t) {
  this.MiraHacia(t, 2, 4);
};

D.MiraHacia = function(t, slot, accion) {
  if (t === 0) {
    this.accionMotion(slot);
    this.ponerAjuste(true);
  }
  this.ApuntarCabeza();
  if (this.Borde() || this.Reaccion()) return;
  if (this.dir_obj >= 0) this.c.turn[1] = this.dir_obj;
  if (this.accion === accion) {
    this.hacerBlanco();
    return;
  }
  this.Soltar();
};

D.A05_Guardia = function(t) {
  this.Guardia(t, 3, 5);
};

D.A07_Guardia = function(t) {
  this.Guardia(t, 3, 7);
};

D.Guardia = function(t, slot, accion) {
  if (t === 0) {
    this.accionMotion(slot);
    this.ponerAjuste(true);
  }
  this.ApuntarCabeza();
  if (this.Borde() || this.Reaccion()) return;
  if (difAbs(this.c.rot[1], this.dir_snake) >= 1024) this.c.turn[1] = this.dir_snake;
  if (this.accion === accion) {
    this.hacerBlanco();
    return;
  }
  this.Soltar();
};

D.A06_Parado = function(t) {
  if (t === 0) {
    this.accionMotion(4);
    this.ponerAjuste(true);
  }
  if (this.Borde() || this.LeerDañoGuardia()) return;
  this.c.turn[1] = this.dir_snake;
  if (this.accion === 6) {
    this.hacerBlanco();
    return;
  }
  this.Soltar();
};

D.A08_Bloquea = function(t) {
  if (t === 0) {
    this.accionMotion(5);
    this.ponerAjuste(true);
  }
  this.ApuntarCabeza();
  if (this.Borde() || this.LeerDañoGuardia()) return;
  if (difAbs(this.c.rot[1], this.dir_snake) >= 1024) this.c.turn[1] = this.dir_snake;
  if (this.accion === 8) {
    this.hacerBlanco();
    return;
  }
  this.Soltar();
};

D.A09_Para = function(t) {
  if (t === 0) {
    this.accionMotion(31, 1);
    this.seC(57);
  }
  this.vy = -1e3;
  if (this.Borde()) return;
  if (this.accion === 9) return;
  this.fin_accion = 1;
  this.Soltar();
};

D.A10_CostadoI = function(t) {
  this.Costado(t, 12, 10, -1024);
};

D.A11_CostadoD = function(t) {
  this.Costado(t, 13, 11, 1024);
};

D.Costado = function(t, slot, accion, lado) {
  if (t === 0) this.accionMotion(slot);
  this.c.turn[1] = this.c.rot[1] = this.dir_snake;
  this.ApuntarCabeza();
  if (this.Borde()) return;
  if (this.accion !== accion) {
    this.Soltar();
    return;
  }
  if (this.frameM >= 8) return;
  const d = this.dir_snake, s = d + lado & 4095, c = this.c;
  c.step[0] += trig(rsin(d), 64);
  c.step[2] += trig(rcos(d), 64);
  c.step[0] += trig(rsin(s), 48);
  c.step[2] += trig(rcos(s), 48);
};

D.A12_Gira = function(t) {
  if (t === 0) {
    this.accionMotion(10);
    this.c.turn[1] = this.dir_obj;
    this.ponerAjuste(true);
  }
  this.ApuntarCabeza();
  if (this.Borde() || this.Reaccion()) return;
  if (this.accion === 12 && t < 11) {
    this.hacerBlanco();
    return;
  }
  this.ejecutor(this.E_Quieto);
};

D.A13_Atras = function(t) {
  if (t === 0) {
    this.accionMotion(11);
    this.ponerAjuste(true);
  }
  this.ApuntarCabeza();
  if (this.Borde() || this.Reaccion()) return;
  if (this.dir_obj >= 0) this.c.turn[1] = this.dir_obj;
  if (!this.isEnd && this.accion === 13) {
    this.hacerBlanco();
    return;
  }
  this.fin_accion = 1;
  this.ejecutor(this.E_Quieto);
};

D.A14_Adelante = function(t) {
  this.Adelante(t, 12, 14, false);
};

D.A15_Adelante = function(t) {
  this.Adelante(t, 13, 15, true);
};

D.Adelante = function(t, slot, accion, cortaSiCambia) {
  if (t === 0 || t === 14) this.accionMotion(slot);
  this.c.turn[1] = this.c.rot[1] = this.dir_snake;
  this.ApuntarCabeza();
  if (this.Borde() || this.Reaccion()) return;
  const sigue = cortaSiCambia ? t < 29 && this.accion === accion : t < 29;
  if (!sigue) {
    if (this.accion === accion) this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (this.frameM < 8) {
    this.c.step[0] += trig(rsin(this.dir_snake), 12);
    this.c.step[2] += trig(rcos(this.dir_snake), 12);
  }
  this.hacerBlanco();
};

D.A16_Trompada = function(t) {
  if (t === 0) {
    this.accionMotion(14);
    this.c.turn[1] = this.dir_obj;
  }
  if (t === 3) this.Atacar(0);
  if (this.Borde() || this.Reaccion()) return;
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (t < 4) {
    this.c.step[0] = trig(rsin(this.dir_snake), 128);
    this.c.step[2] = trig(rcos(this.dir_snake), 128);
  }
  this.hacerBlanco();
};

D.A17_Trompada2 = function(t) {
  if (t === 0) {
    this.accionMotion(15);
    this.c.turn[1] = this.dir_obj;
  }
  if (t === 7) this.Atacar(1);
  if (this.Borde() || this.Reaccion()) return;
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (t < 8) {
    this.c.step[0] = trig(rsin(this.dir_snake), 24);
    this.c.step[2] = trig(rcos(this.dir_snake), 24);
  }
  this.hacerBlanco();
};

D.A18_DosTrompadas = function(t) {
  let pega = 0;
  if (t === 0) {
    this.slot = 15;
    this.c.turn[1] = this.dir_snake;
    this.motor.accion(T[15], 0);
  }
  if (t === 6) {
    pega = this.Atacar(1);
    this.seC(56);
  }
  if (t === 11) this.accionMotion(14, 0);
  if (t === 15) {
    pega = this.Atacar(0);
    this.seC(56);
  }
  if (this.Borde() || this.Reaccion()) return;
  if (pega) this.seC(52);
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.hacerBlanco();
};

D.A19_PatadaBaja = function(t) {
  let pega = 0;
  if (t === 0) {
    this.accionMotion(16);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 4) {
    pega = this.Atacar(9);
    this.seC(57);
  }
  if (pega) this.seC(52);
  if (this.Borde() || this.Reaccion()) return;
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
  }
  this.hacerBlanco();
};

D.A20_Patada = function(t) {
  if (t === 0) {
    this.accionMotion(17);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 10) this.seC(57);
  if (t === 12 && this.Atacar(3)) this.seC(53);
  if (this.Borde() || this.Reaccion()) return;
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.c.step[0] = 0;
  this.c.step[2] = 0;
  this.hacerBlanco();
};

D.A21_Pisoton = function(t) {
  if (t === 0) {
    this.accionMotion(18);
    this.c.turn[1] = this.dir_obj;
  }
  if (t === 12) {
    this.Atacar(this.status() & 4 ? 8 : 5);
    this.seC(180);
  }
  if (this.Borde() || this.Reaccion()) return;
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.hacerBlanco();
};

D.VelCombo = function(base) {
  const s = this.slot, f = this.frameM;
  if (s === 15) return f < 8 ? 24 : base;
  if (s === 14) return f < 4 ? 128 : base;
  if (s === 16) return f > 0 ? base : 128;
  if (s === 17) return f < 4 ? 48 : base;
  return null;
};

const COMBO = {
  0: [ 14, 4 ],
  3: [ "g", 2, 56 ],
  12: [ 15, 0 ],
  19: [ "g", 2, 56 ],
  30: [ 14, 0 ],
  33: [ "g", 2, 56 ],
  40: [ 17, 4 ],
  52: [ "g", 3, 57 ],
  65: [ 14, 0 ],
  68: [ "g", 2, 56 ],
  76: [ 16, 4 ],
  80: [ "g", 2, 57 ],
  86: [ 17, 4 ],
  98: [ "g", 3, 57 ],
  110: [ 16, 4 ],
  114: [ "g", 2, 57 ],
  120: [ 14, 4 ],
  123: [ "g", 2, 56 ],
  143: [ 17, 4 ],
  155: [ "g", 3, 57 ]
};

D.A22_Combo = function(t) {
  let pega = 0;
  const k = COMBO[t];
  if (k && k[0] === "g") {
    pega = this.Atacar(k[1]);
    this.seC(k[2]);
  } else if (k) {
    this.accionMotion(k[0], k[1]);
    this.c.turn[1] = this.dir_snake;
  }
  let vel = this.VelCombo(0) ?? 0;
  if (pega) this.ej_t = 156;
  if (this.isEnd) this.accionMotion(1, 15);
  if (this.Borde() || this.Reaccion()) return;
  if (t === 190) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.c.step[0] = trig(rsin(this.dir_snake), vel);
  this.c.step[2] = trig(rcos(this.dir_snake), vel);
  this.hacerBlanco();
};

D.A23_Embestida = function(t) {
  if (this.Borde() || this.Reaccion()) return;
  let pega = 0;
  if (t === 0) {
    this.accionMotion(29, 8);
    this.seM(132, 1);
  }
  if (t < 15) this.c.turn[1] = this.dir_snake;
  if (t === 15) this.accionMotion(30, 4);
  if (t === 17) this.seC(57);
  if (t === 31) this.accionMotion(0, 15);
  if (t > 17 && t < 43) pega = this.Atacar(6);
  if (pega > 0) {
    this.seC(181);
    this.ej_t = 30;
  }
  if (t > 19 && t < 30) for (const v of this.c.toques) if (difAbs(this.c.rot[1], vecDir2(v[0], v[2])) < 512) {
    this.ej_t = 30;
    this.log("embestida: pared");
    break;
  }
  if (t > 76) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.hacerBlanco();
};

D.A24_TresGolpes = function(t) {
  if (t === 0) {
    this.accionMotion(15, 0);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 7) {
    this.Atacar(1);
    this.seC(56);
  }
  if (t === 12) {
    this.accionMotion(14, 0);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 17) {
    this.Atacar(0);
    this.seC(56);
  }
  if (t === 21) {
    this.accionMotion(16, 4);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 25) {
    this.Atacar(2);
    this.seC(57);
  }
  const vel = this.VelCombo(4) ?? 0;
  if (this.Borde() || this.Reaccion()) return;
  if (t === 40) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.c.step[0] = trig(rsin(this.dir_snake), vel);
  this.c.step[2] = trig(rcos(this.dir_snake), vel);
  this.hacerBlanco();
};

D.A25_TresGolpes2 = function(t) {
  let pega = 0;
  if (t === 0) {
    this.slot = 15;
    this.c.turn[1] = this.dir_snake;
    this.motor.accion(T[15], 0);
  }
  if (t === 6) {
    pega = this.Atacar(1);
    this.seC(56);
  }
  if (t === 11) this.accionMotion(14, 0);
  if (t === 15) {
    pega = this.Atacar(0);
    this.seC(56);
  }
  if (t === 19) this.accionMotion(16, 4);
  if (t === 23) {
    pega = this.Atacar(2);
    this.seC(57);
  }
  if (t === 35) this.accionMotion(0, 10);
  if (pega) {
    this.c.rot[1] = this.c.turn[1] = this.dir_snake;
    this.seC(t <= 15 ? 52 : 53);
  }
  const v0 = this.VelCombo(4) ?? 0, vel = idiv(v0, 2);
  if (this.Borde() || this.Reaccion()) return;
  if (t === 36) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (this.slot !== 10) {
    this.c.step[0] = trig(rsin(this.c.rot[1]), vel);
    this.c.step[2] = trig(rcos(this.c.rot[1]), vel);
  }
  this.hacerBlanco();
};

D.A26_AmagueI = function(t) {
  this.Amague(t, 12, -1024);
};

D.A27_AmagueD = function(t) {
  this.Amague(t, 13, 1024);
};

D.Amague = function(t, slot, lado) {
  let vel = 0;
  if (t === 0 || t === 14) this.accionMotion(slot);
  if (t < 28) {
    this.c.turn[1] = this.c.rot[1] = this.dir_snake;
    vel = 24;
  }
  if (t === 28) {
    this.accionMotion(15, 0);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 46) {
    this.accionMotion(14, 0);
    this.c.turn[1] = this.dir_snake;
  }
  if (t === 57) {
    this.accionMotion(16, 4);
    this.c.turn[1] = this.dir_snake;
  }
  const v = this.VelCombo(4);
  if (v != null) vel = v;
  if (this.Borde() || this.Reaccion()) return;
  if (t === 75) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  const d = this.dir_snake, c = this.c;
  if (t < 28) {
    c.step[0] += trig(rsin(d), vel);
    c.step[2] += trig(rcos(d), vel);
    const s = d + lado & 4095;
    c.step[0] += trig(rsin(s), 48);
    c.step[2] += trig(rcos(s), 48);
  } else {
    c.step[0] = trig(rsin(d), vel);
    c.step[2] = trig(rcos(d), vel);
  }
  this.hacerBlanco();
};

D.A30_Agarrar = function(t) {
  if (t === 0) {
    this.accionMotion(32);
    this.Capturar(0);
  }
  if (this.Borde()) return;
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
  }
};

D.E_Esquive = function(t) {
  if (t === 0) this.accionMotion(this.gvTime() & 1 ? 12 : 13);
  this.c.turn[1] = this.c.rot[1] = this.dir_snake;
  this.ApuntarCabeza();
  if (this.Borde()) return;
  if (t >= 15) {
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (this.frameM < 8) {
    const d = this.dir_snake, c = this.c;
    c.step[0] += trig(rsin(d), 24);
    c.step[2] += trig(rcos(d), 24);
    const s = d + (this.slot === 12 ? -1024 : 1024) & 4095, k = this.frameM < 2 ? 128 : 64;
    c.step[0] += trig(rsin(s), k);
    c.step[2] += trig(rcos(s), k);
  }
  this.hacerBlanco();
};

D.R_Trompada = function(t) {
  if (t === 0) {
    this.accionMotion(19);
    this.vida = Math.max(0, this.vida - this.y[0]);
    this.seC(52);
    this.seM(135, 1);
    this.Sangre(6);
    this.log("trompada", {
      vida: this.vida
    });
  }
  if (this.Borde()) return;
  if (this.LeerDañoGolpe()) return;
  if (t >= 11) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    this.parpadeo = 30;
    return;
  }
  this.hacerBlanco();
};

D.R_Patada = function(t) {
  if (this.Borde()) return;
  if (t === 0) {
    this.accionMotion(20);
    this.vida = Math.max(0, this.vida - this.y[1]);
    this.seC(53);
    this.seM(134, 1);
    this.Sangre(6);
    this.log("patada", {
      vida: this.vida
    });
  }
  if (t >= 11) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    this.parpadeo = 30;
    return;
  }
  if (t < 3) {
    this.c.step[0] = trig(rsin(this.dir_snake), -256);
    this.c.step[2] = trig(rcos(this.dir_snake), -256);
  }
  this.hacerBlanco();
};

D.R_Derribo = function(t) {
  if (this.Borde()) return;
  if (t === 0) {
    this.accionMotion(21);
    this.vida = Math.max(0, this.vida - this.y[1]);
    this.seC(53);
    this.seM(134, 1);
    this.c.turn[1] = this.c.rot[1] = this.dir_snake;
    this.log("derribado", {
      vida: this.vida
    });
  }
  this.sin_choque = 1;
  this.t2 = 1;
  if (t === 10) this.seC(177);
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.R_Piso);
    return;
  }
  this.c.step[0] = idiv(this.c.step[0], 2);
  this.c.step[2] = idiv(this.c.step[2], 2);
};

D.R_Piso = function(t) {
  if (t === 0) {
    this.accionMotion(22);
    if (this.vida >= 31) this.ej_t = 30;
  }
  if (this.Borde()) return;
  if (this.vida < 30) {
    const lvl = this.nivel();
    if (lvl >= 4 || lvl < 2) {
      if (!(t & 1)) this.vida++;
    } else if (!(t & 7)) this.vida++;
  }
  this.sin_choque = 1;
  if (idiv(255 - this.vida, 25) >= t) return;
  this.fin_accion = 1;
  this.ejecutor(this.R_Levantarse);
};

D.R_Levantarse = function(t) {
  if (this.Borde()) return;
  if (t === 0) this.accionMotion(23);
  if (t === 12) this.seC(182);
  if (t === 32 && this.Atacar(4)) this.seC(53);
  if (t === 41) this.seM(161, 0);
  if (t === 43) this.seM(160, 0);
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (t < 32) this.sin_choque = 1;
};

D.R_Lanzado = function(t) {
  if (t === 0) {
    this.accionMotion(24);
    this.seM(134, 1);
    this.vida = Math.max(0, this.vida - this.y[2]);
    this.log("lanzado", {
      vida: this.vida
    });
  }
  if (this.Borde()) return;
  if (t === 21) {
    this.seC(177);
    this.seM(135, 1);
  }
  if (t === 59) {
    this.c.rot[1] = this.c.turn[1] = this.c.rot[1] + 2048 & 4095;
    this.accionMotion(3, 0);
  }
  if (t >= 61) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  if (t < 24 && this.tgt.dirCaptura != null) this.c.turn[1] = this.tgt.dirCaptura;
  this.sin_choque = 1;
  this.t2 = 1;
};

D.R_Agarrado = function(t) {
  if (t === 0) {
    this.accionMotion(25);
    if (this.tgt.dirCaptura != null) this.c.turn[1] = this.tgt.dirCaptura;
    this.Capturar(1);
    this.seM(135, 1);
  }
  if (this.Reaccion()) return;
  if (t === 35) this.seC(187);
  if (this.isEnd) {
    this.fin_accion = 1;
    this.ejecutor(this.E_Quieto);
    return;
  }
  this.hacerBlanco();
};

const SLOTS_BORDE = {
  0: [ 26, 27, 28 ],
  1: [ 33, 34, 35 ],
  2: [ 36, 37, 38 ]
};

const grupoBorde = z => z === 0 || z === 1 || z === 3 ? 1 : z === 4 ? 2 : 0;

D.E_Colgarse = function(t) {
  const c = this.c;
  if (t === 0) {
    const z = zonaBorde(c.mov[0], c.mov[2]);
    c.turn[1] = z.dir;
    this.zona_borde = z.zona;
    this.accionMotion(SLOTS_BORDE[grupoBorde(z.zona)][0], 4);
    this.colgado = 1;
    this.piso_colgado = c.levels[0];
    const cerca = this.borde.cercano(c.mov, 5e3, z.zona & 1 ? 32 : 16);
    if (cerca) {
      c.mov[0] += cerca.v[0];
      c.mov[2] += cerca.v[2];
    } else this.log("borde: sin línea cercana");
    c.step[0] = c.step[2] = 0;
    this.seC(178);
    this.log("se cuelga", {
      zona: z.zona,
      mov: cop(c.mov),
      piso: this.piso_colgado
    });
    return;
  }
  const g = grupoBorde(this.zona_borde);
  if (t === 26) this.accionMotion(SLOTS_BORDE[g][1], 4); else if (t === 58) {
    this.accionMotion(SLOTS_BORDE[g][2], 4);
    this.seC(179);
  }
  if (t > 60 && this.isEnd) {
    this.motor.altura = 1100;
    c.height = 1100;
    this.slot = 0;
    this.motor.accion(T[0], 0);
    this.fin_accion = 1;
    this.parpadeo = 30;
    this.colgado = 0;
    this.ejecutor(this.E_Quieto);
    this.log("sube del borde", {
      mov: cop(c.mov)
    });
    return;
  }
  if (t >= 27 && t < 58) {
    c.step[0] = 0;
    c.step[2] = 0;
  }
  if ((this.zona_borde === 2 || this.zona_borde === 6) && t > 60 && t < 80) this.piso_colgado += 16;
};

D.E_Caer = function(t) {
  if (t !== 0) return;
  const c = this.c;
  this.accionMotion(39, 4);
  this.colgado = 2;
  this.piso_colgado = c.levels[0];
  const h = this.borde.online(CENTRO_REX, c.mov, 4);
  if (h) {
    const aCentro = vecDir2(CENTRO_REX[0] - c.mov[0], CENTRO_REX[2] - c.mov[2]);
    const w = h.pared, dw = vecDir2(w.b[0] - w.a[0], w.b[2] - w.a[2]);
    const s2 = dw + 1024 & 4095, s1 = s2 + 2024 & 4095;
    c.turn[1] = difAbs(s2, aCentro) < difAbs(s1, aCentro) ? s2 : s1;
    const o = rotY(c.turn[1], {
      x: 0,
      y: 0,
      z: -1e3
    });
    c.mov = [ Math.round(h.punto[0] + o.x), Math.round(h.punto[1]), Math.round(h.punto[2] + o.z) ];
  } else this.log("caída: sin borde en la línea");
  this.vy = 0;
  this.g.caidaY = c.mov[1];
  this.log("se cae", {
    mov: cop(c.mov),
    vida: this.vida
  });
};

D.Atacar = function(k) {
  const A = ATAQUES[k];
  if (!A) return 0;
  const lvl = this.nivel(), c = this.c;
  const tam = A[0] || (lvl > 0 && lvl < 4 ? TAM_B : TAM_A);
  const daño = A[3] === 100 ? 100 : this.z[A[3]];
  const o = rotY(c.rot[1], {
    x: A[4][0],
    y: A[4][1],
    z: A[4][2]
  });
  const centro = [ c.mov[0] + Math.trunc(o.x), c.mov[1] + A[4][1], c.mov[2] + Math.trunc(o.z) ];
  const f = rotY(c.rot[1], {
    x: A[1][0],
    y: A[1][1],
    z: A[1][2]
  });
  this.atk = {
    centro: centro,
    tam: tam,
    k: k,
    f: this.mgr.frame
  };
  if (!this.snakeVive() || this.gameOverTimer() !== 0 || this.J.ctx.vuelo?.()) return 0;
  const s = this.snakeMM();
  for (let i = 0; i < 3; i++) if (Math.abs(centro[i] - s[i]) > tam[i] + TAM_SNAKE[i]) return 0;
  const ok = this.J.dañoSnake ? this.J.dañoSnake(daño, A[2], {
    x: 2 * f.x,
    z: 2 * f.z
  }, aV3(centro)) : false;
  if (!ok) return 0;
  this.log("golpe a Snake", {
    k: k,
    "daño": daño,
    a_mode: A[2],
    vida: this.vitality()
  });
  return daño;
};

D.Capturar = function(k) {
  const [tam, pto] = CAPTURA[k], c = this.c;
  const o = rotY(c.rot[1], {
    x: pto[0],
    y: 0,
    z: pto[2]
  });
  const centro = [ c.mov[0] + Math.trunc(o.x), c.mov[1] + pto[1], c.mov[2] + Math.trunc(o.z) ];
  this.capturado = 0;
  if (!this.snakeVive() || this.gameOverTimer() !== 0 || this.s18()?.colgado) return 0;
  const s = this.snakeMM();
  for (let i = 0; i < 3; i++) if (Math.abs(centro[i] - s[i]) > tam[i] + TAM_SNAKE[i]) return 0;
  const f = rotY(c.rot[1], {
    x: 0,
    y: 0,
    z: 50
  });
  if (!this.J.dañoSnake?.(0, 2, {
    x: 2 * f.x,
    z: 2 * f.z
  }, aV3(centro))) return 0;
  this.capturado = 1;
  this.log("agarra a Snake", {
    k: k
  });
  return 1;
};

D.Sangre = function(hueso) {
  const h = this.huesos[hueso];
  if (!h) return;
  this.o.updateMatrixWorld(true);
  this.sangre(new THREE.Vector3(0, 0, .1).applyMatrix4(h.matrixWorld));
};

Liquid.prototype.PILA = [ function P0_Fogonazo() {
  this.desapilar(0);
}, function P1() {}, function P2_Pasos() {
  const s = this.slot, f = this.frameM;
  let se = -1;
  if (s === 8) se = f === 16 ? 161 : f === 8 ? 160 : -1; else if (s === 10) se = f === 4 ? 161 : -1; else if (s === 11) se = f === 8 || f === 13 ? 161 : f === 15 ? 160 : -1; else if (s === 12 || s === 13) se = f === 6 || f === 14 ? 161 : f === 15 ? 160 : -1;
  if (se >= 0) this.seM(se, 0);
} ];

D.ir = function(g, s) {
  if (g != null) this.grupo = g;
  this.estado = s;
  this.cuadros = 0;
  this.t = 0;
  this.log("estado", {
    fase: this.fase,
    g: this.grupo,
    s: s
  });
};

D.irSin = function(g, s) {
  if (g != null) this.grupo = g;
  this.estado = s;
  this.t = 0;
  this.log("estado", {
    fase: this.fase,
    g: this.grupo,
    s: s
  });
};

D.mirar = function() {
  this.dir_obj = this.dir_snake;
};

const PATEA = new Set([ 2, 5, 8 ]);

D.Cerebro = function() {
  this.dir_obj = -1;
  this.accion = -1;
  if (this.al_borde) {
    if (this.estado !== 30 && this.estado !== 31) this.t = 0;
    this.grupo = 6;
    this.estado = this.vida >= 3 ? 30 : 31;
    this.cuadros = 0;
  }
  if (!this.mgr.stun) {
    switch (this.fase) {
     case 0:
      this.Fase0();
      break;

     case 1:
      this.Fase1();
      break;

     case 2:
      this.Fase2();
      break;

     case 3:
      this.Fase3();
      break;

     case 4:
      this.Fase4();
      break;
    }
  }
  this.cuadros++;
};

D.Fase0 = function() {
  if (this.grupo === 0) this.G0_Entrada(); else if (this.grupo === 1) {
    const s = this.estado;
    if (s === 1) this.S1_Musica(); else if (s === 2) this.S1_Empieza(); else if (s === 3) this.S1_Distancia();
  } else if (this.grupo === 2) {
    const s = this.estado;
    if (s === 8) this.S0_Acercarse(); else if (s === 9) this.S0_Atras(); else if (s === 10) this.S_Adelante14();
  } else if (this.grupo === 3) {
    if (this.estado === 13) this.S_IrASnake();
  }
};

D.Fase1 = function() {
  const s = this.estado;
  if (this.grupo === 0) this.G0_Entrada(); else if (this.grupo === 1) {
    if (s === 3) this.S1_EsperaPiso();
  } else if (this.grupo === 2) {
    if (s === 8) this.S1_Tekken(); else if (s === 9) this.S1_Atras(); else if (s === 10) this.S_Adelante14();
  } else if (this.grupo === 3) {
    if (s === 13) this.S_IrASnake();
  } else if (this.grupo === 5) {
    if (s === 19) this.S1_Combo(); else if (s === 20) this.S1_Embestida();
  }
};

D.Fase2 = function() {
  const s = this.estado;
  switch (this.grupo) {
   case 1:
    if (s === 2) this.S2_Espera(); else if (s === 3) this.S2_EsperaLejos();
    if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
    break;

   case 2:
    if (s === 8) this.S2_Acercarse(); else if (s === 9) this.S2_Atras(); else if (s === 10) this.S2_Adelante14(); else if (s === 11) this.S2_Adelante15(); else if (s === 12) this.S2_Decidir();
    if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
    break;

   case 3:
    if (s === 14) this.S2_Camino(); else if (s === 15) this.S2_Guardia();
    if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
    break;

   case 4:
    if (s === 29) this.S2_Golpeado();
    break;

   case 5:
    {
      const f = {
        16: this.S_Bloquea,
        18: this.S2_Ataque,
        20: this.S_Embestida,
        21: this.S2_TresGolpes,
        23: this.S_AmagueI,
        24: this.S_AmagueD,
        25: this.S2_Patada,
        26: this.S2_PatadaBaja,
        27: this.S2_Pisoton,
        28: this.S2_DosTrompadas
      }[s];
      if (f) f.call(this);
      if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
      break;
    }

   case 6:
    if (s === 30) this.S2_Colgado(); else if (s === 31) this.S_Cae();
    break;
  }
  this.Voces2();
};

D.Fase3 = function() {
  const s = this.estado;
  switch (this.grupo) {
   case 1:
    if (s === 3) this.S3_Acercarse(); else if (s === 7) this.S3_Guardia();
    if (this.GolpeRecibido(false)) this.cuadros = this.t = 0;
    break;

   case 2:
    if (s === 8) this.S3_Gira(); else if (s === 9) this.S_AtrasHastaFin(); else if (s === 10) this.S3_CostadoI(); else if (s === 11) this.S3_CostadoD(); else if (s === 33) this.S3_Para();
    if (this.GolpeRecibido(false)) this.cuadros = this.t = 0;
    break;

   case 3:
    if (s === 14) this.S3_Camino(); else if (s === 17) this.S3_IrAlPie();
    if (this.golpe === 3 || this.golpe === 36) this.ir(4, 29);
    break;

   case 4:
    if (s === 29) this.S3_Golpeado();
    break;

   case 5:
    {
      const f = {
        16: this.S_Bloquea,
        18: this.S3_Ataque,
        20: this.S_Embestida,
        23: this.S_AmagueI,
        24: this.S_AmagueD,
        25: this.S3_Patada,
        26: this.S3_PatadaBaja,
        27: this.S3_Pisoton,
        28: this.S3_DosTrompadas,
        29: this.S3_DespuesDelGolpe
      }[s];
      if (f) f.call(this);
      if (this.GolpeRecibido(false)) this.cuadros = this.t = 0;
      break;
    }

   case 6:
    if (s === 30) this.S_Colgado(); else if (s === 31) this.S_Cae();
    break;
  }
};

D.Fase4 = function() {
  const s = this.estado;
  switch (this.grupo) {
   case 1:
    if (s === 3) this.S4_Decidir(); else if (s === 2) this.S4_EsperaSuba(); else if (s === 16) this.S4_Bloquea();
    if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
    break;

   case 2:
    if (s === 8) this.S4_Acercarse(); else if (s === 9) this.S_AtrasHastaFin();
    if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
    break;

   case 3:
    if (s === 14) this.S4_Camino(); else if (s === 17) this.S4_IrAlBorde();
    if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
    break;

   case 4:
    if (s === 29) this.S4_Golpeado();
    break;

   case 5:
    {
      const f = {
        18: this.S4_Ataque,
        20: this.S4_Embestida,
        21: this.S4_Patada,
        22: this.S4_TresGolpes,
        23: this.S4_AmagueI,
        24: this.S4_AmagueD,
        25: this.S4_Patada2,
        26: this.S4_PatadaBaja,
        27: this.S4_Pisoton,
        32: this.S4_Agarrar
      }[s];
      if (f) f.call(this);
      if (this.GolpeRecibido(true)) this.cuadros = this.t = 0;
      break;
    }

   case 6:
    if (s === 30) this.S_Colgado(); else if (s === 31) this.S_Cae();
    break;
  }
  this.Voces4();
};

D.GolpeRecibido = function(anotar) {
  const a = this.golpe;
  if (a !== 3 && a !== 4 && a !== 36) return 0;
  if (anotar) this.golpe_puño = a === 4 ? 0 : 1;
  this.grupo = 4;
  this.estado = 29;
  this.log("golpe → 29", {
    a: a,
    fase: this.fase
  });
  return 1;
};

D.G0_Entrada = function() {
  switch (this.estado) {
   case 0:
    this.S_Iniciar();
    break;

   case 1:
    this.S_Entrada();
    break;

   case 2:
    this.S_Pose();
    break;

   case 3:
    this.S_Habla1();
    break;

   case 4:
    this.S_Habla2();
    break;

   case 5:
    this.S_Habla3();
    break;

   case 6:
    this.S_Habla4();
    break;

   case 18:
    this.S_Continuo();
    break;
  }
};

D.S_Iniciar = function() {
  const g = this.g;
  g.vB4 = g.vB8 = 0;
  g.d8 = g.dc = g.e0 = g.e4 = g.e8 = 0;
  if (this.continuo) {
    this.cuenta = new Cuenta(this, 5400, -1);
    this.camaraModo(4);
    this.estado = 18;
    this.correrProc("s");
    this.bswOculto = true;
  } else this.estado = 1;
  this.cuadros = 0;
  this.t = 0;
  this.log("iniciar", {
    continuo: this.continuo
  });
};

D.S_Entrada = function() {
  this.accion = 6;
  this.padRelease = true;
  actualizarCongelado(this.mgr);
  this.mirar();
  if (this.t === 0) {
    this.cineAbrir();
    this.voxStream(this.voz[16], 1073741824);
    this.cuenta = new Cuenta(this, 5400, -1);
  }
  this.cuenta.poner(5400);
  if (this.t >= 31) this.ir(null, 2); else this.t++;
};

D.S_Pose = function() {
  if (this.t === 0) this.accion = 1;
  if (this.t < 54) this.cuenta.poner(5400);
  if (this.t >= 71) {
    this.accion = 6;
    this.ir(null, 3);
  } else this.t++;
};

D.S_Habla1 = function() {
  this.accion = 6;
  this.mirar();
  if (this.t > 0 && this.streamStatus() === 1) this.playStart();
  if (this.t >= 101 && this.streamStatus() === -1) this.ir(null, 4); else this.t++;
};

D.S_Habla2 = function() {
  this.accion = 6;
  this.mirar();
  if (this.t === 0) {
    if (this.streamStatus() === -1) this.voxStream(this.voz[17], 1073741824);
    this.camaraModo(1);
  }
  if (this.t === 60) this.playStart();
  if (this.t >= 201 && this.streamStatus() === -1) this.ir(null, 5); else this.t++;
};

D.S_Habla3 = function() {
  this.mirar();
  if (this.t === 0) {
    if (this.streamStatus() === -1) this.voxStream(this.voz[18], 1073741824);
    this.camaraModo(2);
  }
  if (this.t === 30) this.playStart();
  this.accion = this.t < 30 ? 6 : 2;
  if (this.t >= 301 && this.streamStatus() === -1) this.ir(null, 6); else this.t++;
};

D.S_Habla4 = function() {
  this.accion = 6;
  this.mirar();
  if (this.t === 0) {
    this.camaraModo(3);
    this.voxStream(this.voz[0], 1073741824);
  }
  if (this.t >= 161 && this.streamStatus() === 1) {
    this.bswOculto = true;
    this.ir(1, 1);
  } else this.t++;
};

D.S_Continuo = function() {
  this.accion = 3;
  this.padRelease = true;
  actualizarCongelado(this.mgr);
  this.mirar();
  if (this.t === 0) this.voxStream(this.voz[0], 1073741824);
  if (this.t >= 61 && this.streamStatus() === 1) {
    this.playStart();
    this.ir(1, 2);
  }
  this.t++;
};

D.S1_Musica = function() {
  this.accion = 3;
  this.mirar();
  if (this.t === 0) {
    this.playStart();
    this.correrProc("s");
  }
  if (this.t >= 31 && this.streamStatus() === -1) {
    this.cineCerrar();
    this.ir(null, 2);
  }
  this.t++;
};

D.S1_Empieza = function() {
  this.padRelease = true;
  if (this.t >= 16) {
    this.padRelease = false;
    actualizarCongelado(this.mgr);
    this.camaraModo(6);
    this.fase = 3;
    this.alerta = 5400;
    this.ir(1, 3);
    this.log("empieza la pelea");
  } else this.t++;
};

D.S1_Distancia = function() {
  this.accion = 5;
  this.mirar();
  const d = this.dist_snake;
  if (d >= 8001) this.ir(3, 13); else if (d >= 3001) this.ir(2, 8); else if (d < 1500) this.ir(2, 9); else if (this.t >= 6) this.ir(2, 10); else this.t++;
};

D.S0_Acercarse = function() {
  this.accion = 12;
  this.mirar();
  if (this.dist_snake < 3e3) this.ir(1, 3); else if (this.dist_snake >= 8001) this.ir(3, 13); else this.t++;
};

D.S0_Atras = function() {
  this.accion = 13;
  this.mirar();
  if (this.fin_accion && this.dist_snake >= 3001) this.ir(1, 3); else this.t++;
};

D.S_Adelante14 = function() {
  this.accion = 14;
  this.mirar();
  if (this.fin_accion) this.ir(1, 3); else this.t++;
};

D.S_IrASnake = function() {
  const s = this.snakeMM();
  this.dest = [ s[0], s[1], s[2] ];
  if (this.Llegar(2e3)) this.ir(1, 3); else this.t++;
};

D.S1_EsperaPiso = function() {
  this.accion = 5;
  this.mirar();
  if (!(this.status() & 512)) this.ir(2, 8); else this.t++;
};

D.S1_Tekken = function() {
  this.accion = 12;
  this.mirar();
  if (this.dist_snake < 2e3) {
    this.log("go tekken 1");
    this.ir(5, 19);
  } else this.t++;
};

D.S1_Atras = function() {
  if (this.fin_accion) this.ir(5, 20); else {
    this.accion = 13;
    this.mirar();
    this.t++;
  }
};

D.S1_Combo = function() {
  if (this.fin_accion) this.ir(3, 13); else {
    this.accion = 22;
    this.mirar();
    this.t++;
  }
};

D.S1_Embestida = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 23;
    this.mirar();
    this.t++;
  }
};

D.S3_Acercarse = function() {
  this.accion = 3;
  this.mirar();
  if (this.dist_snake < 2e3) {
    if (this.golpe_puño) {
      this.estado = 7;
      this.t = 0;
      this.cerca = 0;
      this.cnt++;
      this.log("estado", {
        fase: 3,
        g: 1,
        s: 7
      });
      return;
    }
    this.cerca++;
  } else this.cerca = 0;
  if (this.cerca >= 16 || this.dist_snake < 500) {
    this.grupo = 3;
    this.estado = 14;
    this.t = 0;
    this.cerca = 0;
    this.cnt++;
    this.log("estado", {
      fase: 3,
      g: 3,
      s: 14
    });
    return;
  }
  if (this.t >= 301) {
    this.grupo = 2;
    this.estado = 8;
    this.t = 0;
    this.cerca = 0;
    this.cnt++;
    this.log("estado", {
      fase: 3,
      g: 2,
      s: 8
    });
    return;
  }
  if (this.t >= 151) {
    if (this.t === 160) this.Voces(1);
    this.accion = 4;
  }
  this.t++;
};

D.S3_Guardia = function() {
  this.accion = 8;
  this.mirar();
  if (this.dist_snake < 1e3) {
    this.irSin(2, this.Lado(this.ruta, this.dir_snake) ? 11 : 10);
    return;
  }
  if (this.status() & 2048) {
    this.ir(2, 33);
    this.f958 = 0;
    return;
  }
  if (this.t >= 91) this.ir(3, 14); else this.t++;
};

D.S3_Gira = function() {
  this.accion = 12;
  this.mirar();
  if (this.dist_snake < 1500) {
    if (this.gvTime() & 1) this.ir(3, 14); else this.ir(5, 18);
  } else this.t++;
};

D.S_AtrasHastaFin = function() {
  if (this.fin_accion) this.irSin(1, 3); else {
    this.accion = 13;
    this.mirar();
    this.t++;
  }
};

D.S3_CostadoI = function() {
  if (this.t >= 11) this.irSin(5, 25); else {
    this.accion = 10;
    this.mirar();
    this.t++;
  }
};

D.S3_CostadoD = function() {
  if (this.t >= 11) this.irSin(5, 25); else {
    this.accion = 11;
    this.mirar();
    this.t++;
  }
};

D.S3_Para = function() {
  if (this.t >= 7 || !(this.status() & 2048)) {
    this.irSin(2, this.Lado(this.ruta, this.dir_snake) ? 11 : 10);
    return;
  }
  this.accion = 9;
  this.mirar();
  this.t++;
};

D.S3_Camino = function() {
  if (this.t === 0) {
    const r = this.Ruta();
    this.golpe_puño = this.cnt % 3 === 0 ? 1 : 0;
    this.dest = cop(CAMINO_C[r][this.golpe_puño]);
    this.ruta = r;
    this.log("camino C", {
      r: r,
      punto: this.golpe_puño,
      dest: this.dest
    });
  }
  if (this.c.mov[2] >= 2251) {
    this.dir_obj = 2048;
    this.t++;
    return;
  }
  if (this.Llegar(300)) this.irSin(1, 3); else this.t++;
};

D.S3_IrAlPie = function() {
  this.mirar();
  if (this.dist_snake < 1e3) this.irSin(5, 27); else this.t++;
};

D.S3_Golpeado = function() {
  if (this.fin_accion || this.t >= 61) {
    this.g.e8++;
    if (this.vida < 180) {
      this.g.d8 = 0;
      this.fase = 2;
      this.log("fase 2", {
        vida: this.vida
      });
    }
    this.ir(3, 14);
  } else this.t++;
};

D.S3_Ataque = function() {
  this.accion = 5;
  this.mirar();
  if (this.t === 10) this.g.f0 = this.status() & 96 ? 1 : 0;
  if (this.t >= 16) {
    const st = this.status();
    this.ir(null, st & 64 ? 27 : this.g.f0 ? 26 : this.dist_snake < 1001 ? 28 : 25);
    return;
  }
  if (this.status() & 2048) {
    this.ir(null, 16);
    this.f958 = 0;
    return;
  }
  this.t++;
};

D.S_Bloquea = function() {
  this.accion = 8;
  if (!(this.status() & 2048)) this.t++;
  if (this.t >= 5) this.irSin(null, this.dist_snake < 1001 ? 28 : 25);
};

D.S_Embestida = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 23;
    this.mirar();
    this.t++;
  }
};

D.S_AmagueI = function() {
  if (this.t > 0 && this.fin_accion) this.ir(3, 14); else {
    this.accion = 26;
    this.mirar();
    this.t++;
  }
};

D.S_AmagueD = function() {
  if (this.t > 0 && this.fin_accion) this.ir(3, 14); else {
    this.accion = 27;
    this.mirar();
    this.t++;
  }
};

D.S3_Patada = function() {
  if (this.t > 0 && this.fin_accion) this.ir(null, 29); else {
    this.accion = 20;
    this.mirar();
    this.t++;
  }
};

D.S3_PatadaBaja = function() {
  if (this.t > 0 && this.fin_accion) this.ir(3, 14); else {
    this.accion = 19;
    this.mirar();
    this.t++;
  }
};

D.S3_Pisoton = function() {
  if (this.fin_accion) this.ir(null, 29); else {
    this.accion = 21;
    this.mirar();
    this.t++;
  }
};

D.S3_DosTrompadas = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 18;
    this.mirar();
    this.t++;
  }
};

D.S3_DespuesDelGolpe = function() {
  if (this.t >= 4) {
    if (this.status() & 260) this.Voces(0);
    this.ir(3, 14);
    return;
  }
  this.accion = 3;
  this.mirar();
  this.t++;
};

D.S_Colgado = function() {
  if (this.fin_accion) this.ir(1, 3); else {
    this.accion = 28;
    this.t++;
  }
};

D.S_Cae = function() {
  if (this.t === 0) this.Victoria();
  this.accion = 29;
  this.t++;
};

D.S2_Espera = function() {
  this.accion = 5;
  this.mirar();
  if (this.t >= 181) {
    this.estado = 3;
    this.cnt = 0;
    this.cuadros = 0;
    this.t = 0;
  } else this.t++;
};

D.S2_EsperaLejos = function() {
  this.accion = 5;
  this.mirar();
  if (this.status() & 4) this.t = 0;
  if (this.t >= 181 || this.dist_snake < 3e3) {
    this.cnt = 0;
    this.ir(2, 8);
  } else this.t++;
};

D.S2_Acercarse = function() {
  this.accion = 12;
  this.mirar();
  if (this.dist_snake < 2e3) this.ir(null, 12); else this.t++;
};

D.S2_Atras = function() {
  if (this.fin_accion) this.ir(1, 3); else {
    this.accion = 13;
    this.mirar();
    this.t++;
  }
};

D.S2_Adelante14 = function() {
  if (this.fin_accion) this.irSin(null, 12); else {
    this.accion = 14;
    this.mirar();
    this.t++;
  }
};

D.S2_Adelante15 = function() {
  if (this.fin_accion) this.irSin(null, 12); else {
    this.accion = 15;
    this.mirar();
    this.t++;
  }
};

D.S2_Decidir = function() {
  const lvl = this.nivel();
  this.accion = lvl < 4 ? lvl < 2 ? 5 : 7 : 5;
  this.mirar();
  if (this.status() & 4) {
    this.ir(3, 14);
    return;
  }
  if (this.t === 0) {
    const a1 = lvl < 4 && lvl > 0 ? this.cnt + 2 : this.cnt + 1;
    const r = s16(this.c.mov[1]) % a1;
    if (r > 0 || a1 >= 3) {
      this.ir(5, 18);
      return;
    }
  }
  const lim = lvl === 1 ? 3 : lvl > 0 && lvl < 4 ? 1 : 5;
  if (this.t > lim) {
    this.estado = this.snakeMM()[1] & 1 ? 10 : 11;
    this.t = 0;
    this.cnt++;
    this.log("estado", {
      fase: 2,
      g: 2,
      s: this.estado
    });
  } else this.t++;
};

D.S2_Camino = function() {
  if (this.t === 0) {
    const z = this.Zona4(this.c.mov);
    if (z < 0) {
      this.ir(1, 3);
      return;
    }
    this.camino = this.snakeMM()[0] & 1 ? CAMINO_A[z] : CAMINO_B[z];
    this.camino_i = 0;
    this.dest = cop(this.camino[0]);
    this.log("camino", {
      z: z,
      dest: this.dest
    });
  }
  if (this.Llegar(300)) {
    if (this.camino_i === 0) {
      this.camino_i = 1;
      this.dest = cop(this.camino[1]);
    } else {
      this.ir(1, 3);
      return;
    }
  }
  this.t++;
};

D.S2_Guardia = function() {
  this.accion = 5;
  this.mirar();
  const lvl = this.nivel();
  let lim = 15;
  if (lvl === 2) lim = 5; else if (lvl === 1) lim = 10; else if (lvl === 3) {
    this.accion = 7;
    lim = 2;
  }
  if (this.t > lim) this.ir(2, 8); else this.t++;
};

D.S2_Golpeado = function() {
  if (this.fin_accion || this.t >= 61) {
    if (this.vida < 64) {
      this.fase = 4;
      this.grupo = 1;
      this.estado = 3;
      this.log("fase 4", {
        vida: this.vida
      });
    } else {
      const lvl = this.nivel(), dificil = lvl < 4 && lvl >= 2;
      if (this.golpe_puño === 1 || dificil) {
        this.grupo = 5;
        this.estado = 28;
      } else if (this.FueraDelCentro(this.c.mov)) {
        this.grupo = 3;
        this.estado = 14;
      } else {
        this.grupo = 2;
        this.estado = 9;
      }
      this.log("estado", {
        fase: 2,
        g: this.grupo,
        s: this.estado
      });
    }
    this.golpe_puño = 0;
    this.cuadros = 0;
    this.t = 0;
  } else {
    if (this.golpe === 4) this.golpe_puño = 0;
    this.t++;
  }
};

D.S2_Ataque = function() {
  this.accion = 5;
  this.mirar();
  const lvl = this.nivel(), medio = lvl > 0 && lvl < 4;
  if (this.t === (lvl === 1 ? 8 : medio ? 2 : 10)) this.g.ec = this.status() & 96 ? 1 : 0;
  if (this.t > (lvl === 1 ? 12 : medio ? 5 : 15)) {
    const st = this.status(), d = this.dist_snake;
    if (d < 2e3) this.estado = st & 64 ? 27 : this.g.ec ? 26 : d >= 1001 ? 25 : this.c.mov[1] & 1 ? 25 : 28; else if (st & 96) {
      this.grupo = 2;
      this.estado = 8;
    } else this.estado = 20;
    this.cuadros = 0;
    this.t = 0;
    this.cnt = 0;
    this.log("estado", {
      fase: 2,
      g: this.grupo,
      s: this.estado
    });
    return;
  }
  if (this.cnt >= 2 && this.status() & 2048) {
    this.ir(null, 16);
    this.f958 = 0;
    return;
  }
  this.t++;
};

D.S2_TresGolpes = function() {
  if (this.fin_accion) this.ir(3, 15); else {
    this.accion = 24;
    this.mirar();
    this.t++;
  }
};

D.S2_Patada = function() {
  if (this.fin_accion) this.ir(this.dist_snake < 1e3 ? 2 : 3, this.dist_snake < 1e3 ? 9 : 15); else {
    this.accion = 20;
    this.mirar();
    this.t++;
  }
};

D.S2_PatadaBaja = function() {
  if (this.fin_accion) this.ir(this.dist_snake < 1e3 ? 2 : 3, this.dist_snake < 1e3 ? 9 : 15); else {
    this.accion = 19;
    this.mirar();
    this.t++;
  }
};

D.S2_Pisoton = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 21;
    this.mirar();
    this.t++;
  }
};

D.S2_DosTrompadas = function() {
  if (this.fin_accion) this.ir(this.dist_snake < 1e3 ? 2 : 3, this.dist_snake < 1e3 ? 9 : 15); else {
    this.accion = 18;
    this.mirar();
    this.t++;
  }
};

D.S2_Colgado = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 28;
    this.t++;
  }
};

D.S4_Decidir = function() {
  if (this.status() & 4 && this.vitality() >= 41) {
    this.ir(3, 17);
    this.f958 = 0;
    return;
  }
  this.accion = 5;
  if (this.cuadros > 15) {
    if (this.cnt & 1) this.ir(2, 8); else this.ir(5, 20);
    this.f958 = 0;
    this.cnt++;
    return;
  }
  if (this.dist_snake < 500) {
    this.ir(5, 22);
    this.f958 = 0;
    this.cnt++;
    return;
  }
  this.t++;
};

D.S4_EsperaSuba = function() {
  this.accion = 3;
  this.mirar();
  if (PATEA.has(this.playerAction()) || !(this.status() & 4)) this.ir(3, 14); else this.t++;
};

D.S4_Bloquea = function() {
  this.accion = 8;
  if (!(this.status() & 2048)) this.t++;
  if (this.t >= 5) this.irSin(5, 18);
};

D.S4_Acercarse = function() {
  this.mirar();
  if (this.dist_snake < 6e3) this.accion = 12;
  const piso = this.status() & 96;
  if (this.dist_snake < 1500) {
    this.ir(5, piso ? 27 : 21);
    return;
  }
  if (this.t >= 601) this.ir(1, 3); else this.t++;
};

D.S4_Camino = function() {
  if (this.t === 0) {
    const z = this.Zona4(this.c.mov);
    if (z < 0) {
      this.irSin(2, 9);
      return;
    }
    this.camino = this.CaminoCercano(z, this.c.mov);
    this.camino_i = 0;
    this.dest = cop(this.camino[0]);
    this.log("camino", {
      z: z,
      dest: this.dest
    });
  }
  if (this.Llegar(300)) {
    if (this.camino_i === 0) {
      this.camino_i = 1;
      this.dest = cop(this.camino[1]);
    } else {
      this.irSin(2, 9);
      return;
    }
  }
  this.t++;
};

D.S4_IrAlBorde = function() {
  if (PATEA.has(this.playerAction()) || !(this.status() & 4)) {
    this.ir(1, 3);
    return;
  }
  this.mirar();
  if (this.dist_snake < 1300) this.irSin(5, 27); else this.t++;
};

D.S4_Golpeado = function() {
  if (this.fin_accion || this.t >= 61) {
    if (this.golpe_puño === 1) {
      this.grupo = 5;
      this.estado = 22;
    } else if (this.FueraDelCentro(this.c.mov)) {
      this.grupo = 3;
      this.estado = 14;
    } else {
      this.grupo = 2;
      this.estado = 9;
    }
    this.golpe_puño = 0;
    this.cuadros = 0;
    this.t = 0;
    this.log("estado", {
      fase: 4,
      g: this.grupo,
      s: this.estado
    });
  } else {
    if (this.golpe === 4) this.golpe_puño = 0;
    this.t++;
  }
};

D.S4_Ataque = function() {
  this.accion = 5;
  this.mirar();
  if (this.t === 3) this.g.f4 = this.status() & 96 ? 1 : 0;
  if (this.t >= 9) {
    const st = this.status();
    if (this.dist_snake < 2e3) this.estado = st & 64 ? 27 : this.g.f4 ? 26 : 22; else if (!(st & 96)) this.estado = 20;
    this.cuadros = 0;
    this.t = 0;
    this.cnt = 0;
    this.log("estado", {
      fase: 4,
      g: this.grupo,
      s: this.estado
    });
  } else this.t++;
};

D.S4_Embestida = function() {
  if (this.fin_accion) {
    this.ir(3, this.status() & 4 && this.vitality() >= 41 ? 17 : 14);
    this.f958 = 0;
  } else {
    this.accion = 23;
    this.mirar();
    this.t++;
  }
};

D.S4_Patada = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 20;
    this.t++;
  }
};

D.S4_TresGolpes = function() {
  if (this.t === 0) {
    this.accion = 25;
    this.c.rot[1] = this.dir_snake;
    this.t = 1;
    return;
  }
  if (this.fin_accion && this.t >= 11) {
    this.ir(3, this.status() & 4 && this.vitality() >= 41 ? 17 : 14);
    this.f958 = 0;
    return;
  }
  this.accion = 25;
  this.t++;
};

D.S4_AmagueI = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 26;
    this.mirar();
    this.t++;
  }
};

D.S4_AmagueD = function() {
  if (this.fin_accion) this.ir(3, 14); else {
    this.accion = 27;
    this.mirar();
    this.t++;
  }
};

D.S4_Patada2 = function() {
  if (this.fin_accion) this.ir(1, 3); else {
    this.accion = 20;
    this.mirar();
    this.t++;
  }
};

D.S4_PatadaBaja = function() {
  if (this.fin_accion) this.ir(1, 3); else {
    this.accion = 19;
    this.mirar();
    this.t++;
  }
};

D.S4_Pisoton = function() {
  if (this.fin_accion) this.ir(1, 2); else {
    this.accion = 21;
    this.mirar();
    this.t++;
  }
};

D.S4_Agarrar = function() {
  if (this.fin_accion) {
    this.fase = 3;
    this.ir(3, 14);
  } else {
    this.accion = 30;
    this.t++;
  }
};

D.Llegar = function(r) {
  const dx = this.dest[0] - this.c.mov[0], dz = this.dest[2] - this.c.mov[2];
  if (-r < dx && dx < r && -r < dz && dz < r) return 1;
  this.dir_obj = vecDir2(dx, dz);
  return 0;
};

D.Zona4 = function(p) {
  if (p[0] >= 2251) return p[2] < 1 ? 1 : 0;
  return p[2] <= 0 ? 3 : 2;
};

D.Zona5 = function(p) {
  if (p[2] >= 2251) return 4;
  return this.Zona4(p);
};

D.Ruta = function() {
  const zl = this.Zona5(this.c.mov), zs = this.Zona5(this.snakeMM()), d = this.dir_snake;
  const en = (a, b) => d >= a && d < b;
  switch (zl) {
   case 0:
    return [ en(513, 2560) ? 2 : 1, 2, 1, 0, 1 ][zs] ?? 2;

   case 1:
    return [ 3, en(1537, 3584) ? 0 : 3, 1, 0, 1 ][zs] ?? 3;

   case 2:
    return [ 3, 2, en(1537, 3584) ? 0 : 3, 0, 3 ][zs] ?? 3;

   case 3:
    return [ 3, 2, 1, en(513, 2560) ? 2 : 1, 3 ][zs] ?? 3;

   default:
    return this.gvTime() & 1 ? 1 : 3;
  }
};

D.Lado = function(r, d) {
  const en = a => d >= a && d < a + 2047;
  switch (r) {
   case 0:
    return en(513) ? 1 : 0;

   case 1:
    return en(1537) ? 1 : 0;

   case 2:
    return en(1537) ? 0 : 1;

   case 3:
    return en(513) ? 0 : 1;

   case 4:
    return d < 2048 ? 1 : 0;
  }
  return 0;
};

D.CaminoCercano = function(z, p) {
  const d = q => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  return d(CAMINO_A[z][0]) < d(CAMINO_B[z][0]) ? CAMINO_A[z] : CAMINO_B[z];
};

D.FueraDelCentro = function(p) {
  return p[0] < -500 || p[0] > 5e3 || p[2] < -750 || p[2] > 1250;
};

D.Voz = function(code) {
  if (this.streamStatus() === -1) this.voxStream(code, 0);
};

D.Voces = function(k) {
  const g = this.g;
  if (k === 0) {
    if (!this.fin_tiempo) this.Voz(this.voz[VOCES_A[g.vB4]] ?? 0);
    g.vB4 = (g.vB4 + 1) % 4;
  } else if (k === 1) {
    if (!this.fin_tiempo) this.Voz(this.voz[VOCES_B[g.vB8]] ?? 0);
    g.vB8 = (g.vB8 + 1) % 2;
  }
};

D.Voces2 = function() {
  const g = this.g, v = this.voz, libre = () => this.streamStatus() === -1;
  if (g.d8 === 0) {
    g.dc = g.e0 = g.e4 = g.e8 = 0;
  }
  if (!g.dc && g.d8 >= 31 && libre()) {
    if (!this.fin_tiempo) this.voxStream(v[13], 0);
    g.dc++;
  }
  const st = this.status(), y = s16(this.c.mov[1]);
  if (g.e0 === 0) {
    if (st & 4) g.e0 = 1;
  } else if (g.e0 === 1) {
    if (libre() && y % 2 === 0 && !this.fin_tiempo) this.voxStream(v[1], 0);
    g.e0 = 2;
  } else if (g.e0 === 2) {
    if (!(st & 4)) g.e0 = 0;
  }
  if (g.e4 === 0) {
    if (st & 768) g.e4 = 1;
  } else if (g.e4 === 1) {
    if (libre() && !this.fin_tiempo) {
      const k = y % 4;
      if (k === 0) this.voxStream(v[6], 0); else if (k === 1) this.voxStream(v[2], 0);
    }
    g.e4 = 2;
  } else if (g.e4 === 2) {
    if (!(st & 768)) g.e4 = 0;
  }
  if (libre() && !this.fin_tiempo) {
    const k = g.e8 % 12, c = {
      1: v[5],
      4: v[15],
      7: v[14],
      10: v[2]
    }[k];
    if (c != null) {
      this.voxStream(c, 0);
      g.e8++;
    }
  }
  g.d8++;
};

D.Voces4 = function() {
  const g = this.g, v = this.voz, libre = () => this.streamStatus() === -1;
  if (g.d8 === 0) {
    g.dc = g.e0 = g.e4 = g.e8 = 0;
  }
  if (!g.dc && g.d8 >= 31 && libre()) {
    if (!this.fin_tiempo) this.voxStream(v[13], 0);
    g.dc++;
  }
  const st = this.status(), y = s16(this.c.mov[1]);
  if (g.e0 === 0) {
    if (st & 516) g.e0 = 1;
  } else if (g.e0 === 1) {
    if (libre() && !this.fin_tiempo) {
      const k = y % 2;
      if (k === 0) this.voxStream(v[4], 0); else if (k === 1) this.voxStream(v[7], 0);
    }
    g.e0 = 2;
  } else if (g.e0 === 2) {
    if (!(st & 516)) g.e0 = 0;
  }
  g.d8++;
};

D.correrProc = function(letra) {
  const pid = letra === "e" ? this.proc_e : letra === "b" ? this.proc_b : this.proc_s;
  if (!(pid >= 0)) return false;
  const ok = this.A3?.proc(this.actor, letra, []) || false;
  this.log("proc -" + letra, {
    pid: pid.toString(16),
    guion: ok
  });
  if (!ok && letra === "s") this.ctx.musica?.(16777218);
  return ok;
};

D.Victoria = function() {
  this.log("victoria", {
    vida: this.vida
  });
  const info = {
    jefe: "LIQUID",
    proc: this.proc_e,
    demos: [ "s2502a0" ],
    siguiente: "d18a"
  };
  if (this.correrProc("e")) {
    this.mgr.ganado = info;
    this.mgr.mostrarBarras = false;
    return;
  }
  this.mgr.victoria(this, info, {
    sinProc: true
  });
};

D.cineAbrir = function() {
  if (!this.g.cineOn) {
    this.g.cineOn = 1;
    this.mgr.hud.cine = 1;
    this.log("cine");
  }
};

D.cineCerrar = function() {
  if (!this.g.cineOn) return;
  this.g.cineOn = 0;
  this.log("fin del cine");
  const h = this.mgr.hud;
  this.mgr.fx.push({
    t: 0,
    dur: 30,
    fn: t => {
      h.cine = Math.max(0, 1 - t / 30);
    },
    fin: () => {
      h.cine = 0;
    }
  });
};

D.camaraModo = function(m) {
  this.cam_modo = m;
  this.g.camT = 0;
  this.log("cámara", {
    m: m
  });
};

const lerp3 = (a, b, n, t) => [ 0, 1, 2 ].map(i => a[i] + idiv(b[i] - a[i], n) * t);

D.camara = function() {
  const C = this.cam, s = this.snakeMM(), L = this.c.mov, g = this.g, t = g.camT;
  let sube = true;
  switch (this.cam_modo) {
   case 0:
    C.modo28 = 0;
    C.pos = [ 2379, 12461, -156 ];
    C.tgt = [ 2283, 12479, -147 ];
    break;

   case 1:
    C.modo28 = 0;
    C.pos = lerp3([ 2446, 13168, -2366 ], [ 2542, 12664, -3446 ], 200, t);
    C.tgt = lerp3([ 2453, 13126, -2455 ], [ 2549, 12622, -3535 ], 200, t);
    break;

   case 2:
    C.modo28 = 0;
    if (t < 30) {
      C.pos = [ -409, 13003, 952 ];
      C.tgt = [ 3168, 12092, -582 ];
    } else if (t < 90) {
      C.pos = [ -409, 13003, 952 ];
      C.tgt = lerp3([ 3168, 12092, -582 ], [ 1548, 10058, 2815 ], 60, t - 30);
    } else if (t >= 135 && t < 240) {
      C.pos = lerp3([ -2183, 2648, 15174 ], [ 2212, 28178, 12064 ], 150, t - 135);
      C.tgt = lerp3([ -1405, 4631, 9573 ], [ 2212, 23404, 8444 ], 150, t - 135);
    }
    break;

   case 3:
    {
      C.modo28 = 2;
      const medio = () => {
        C.tgt = [ idiv(s[0] + L[0], 2), idiv(s[1], 2) + idiv(L[1], 2), idiv(s[2] + L[2], 2) ];
        C.track = 3e3;
      };
      if (t <= 0) {
        medio();
        C.rot[0] = -200;
        C.rot[1] = 2960;
      } else if (t < 90) C.rot[1]--; else if (t === 90) {
        medio();
        C.rot[0] = 50;
        C.rot[1] = 1206;
      } else if (t < 500) C.rot[1]++; else {
        this.cam_modo = 4;
        g.camT = 0;
      }
      break;
    }

   case 4:
    C.rot = [ 440, 2048, 0 ];
    C.track = 6600;
    C.modo28 = 2;
    C.tgt = cop(s);
    this.cam_modo = 6;
    g.camT = 0;
    sube = false;
    break;

   case 5:
    C.modo28 = 2;
    if (t < 128) {
      C.tgt = [ idiv(s[0] + L[0], 2), s[1], idiv(s[2] + L[2], 2) ];
      C.track = 6e3;
      C.rot[0] = 700;
      C.rot[1] = t * 24 + 2048;
    } else if (t < 280) {
      C.tgt = C.tgt.map((v, i) => nearExp8(v, s[i]));
      C.track = Math.min(6600, C.track + 15);
      C.rot[0] = Math.max(440, C.rot[0] - 10);
      C.rot[1] = Math.min(6144, t * 24 + 2048);
    } else {
      this.cam_modo = 6;
      g.camT = 0;
    }
    break;

   case 6:
    {
      const r = [ nearRange(C.tgt[0], s[0], 250), nearRange(C.tgt[1], s[1], 100), nearRange(C.tgt[2], s[2], 250) ];
      C.tgt = C.tgt.map((v, i) => nearExp(v, r[i], 4));
      const a1 = Math.min(8e3, this.dist_snake + 4e3);
      if (C.track < a1) C.track = a1; else if (a1 - 1e3 < C.track) C.track = nearExp8(C.track, a1);
      C.rot[0] = 440;
      C.rot[1] = 2048;
      C.modo28 = 2;
      if (this.status() & 4) {
        this.cam_modo = 8;
        g.camT = 0;
      }
      sube = false;
      break;
    }

   case 7:
    if (t === 0) C.rot[1] = this.dir_snake;
    C.tgt = cop(L);
    C.rot[0] = 640;
    break;

   case 8:
    {
      if (t === 0) {
        const z = zonaBorde(s[0], s[2]).zona;
        C.tgt = cop(s);
        C.rot[0] = 240;
        C.track = 5e3;
        C.rot[1] = this.dir_snake - 2048 & 4095;
        const tabla = {
          0: [ -240, 5e3 ],
          1: [ 0, 4e3 ],
          2: [ -100, 5e3 ],
          3: [ 450, 5e3 ],
          4: [ 600, 5e3 ],
          5: [ 1e3, 5e3 ],
          6: [ -180, 2500 ]
        }[z];
        if (tabla) {
          C.rot[0] = tabla[0];
          C.track = tabla[1];
          if (z === 4) C.rot[1] = 2048;
          if (z === 6 && C.rot[1] < 1900) C.rot[1] = 1900;
        }
      }
      if (this.playerAction() === 2) {
        this.cam_modo = 9;
        g.camT = 0;
      }
      break;
    }

   case 9:
    C.tgt = C.tgt.map((v, i) => nearExp8(v, s[i]));
    C.rot[0] = nearExp8(C.rot[0], 440);
    C.rot[1] = nearExp8(C.rot[1], 2048);
    C.track = nearExp8(C.track, 6e3);
    if (!(this.status() & 4)) {
      C.rot = [ 440, 2048, 0 ];
      C.track = 6e3;
      this.cam_modo = 6;
    }
    break;

   case 10:
    if (t === 0) {
      C.tgt = cop(L);
      C.track = 3e3;
      C.rot[0] = 1e3;
      C.rot[1] = this.c.rot[1] + 512 & 4095;
    }
    if (t === 16) {
      C.track = 2e3;
      C.rot[1] = this.c.rot[1] - 512 & 4095;
    }
    if (t === 48) {
      C.track = 500;
      C.rot[1] = this.c.rot[1] + 2048 & 4095;
    }
    break;
  }
  if (sube) g.camT++;
  let ojo, mira;
  if (C.modo28 === 0) {
    ojo = C.pos;
    mira = C.tgt;
  } else {
    const p = C.rot[0] * ANG, y = C.rot[1] * ANG, cp = Math.cos(p);
    ojo = [ C.tgt[0] - Math.sin(y) * cp * C.track, C.tgt[1] + Math.sin(p) * C.track, C.tgt[2] - Math.cos(y) * cp * C.track ];
    mira = C.tgt;
  }
  this.camPelea = {
    pos: aV3(ojo),
    mira: aV3(mira),
    modo: this.cam_modo,
    verSnake: true
  };
  const escena = this.cam_modo <= 5 && this.padRelease && this.fase === 0 && this.ctx.camaraEscena !== false;
  if (escena) {
    this.A3?.ponerCamara({
      x: ojo[0],
      y: ojo[1],
      z: ojo[2]
    }, {
      x: mira[0],
      y: mira[1],
      z: mira[2]
    });
    this.camEscena = true;
  } else if (this.camEscena) {
    this.A3?.soltarCamara();
    this.camEscena = false;
  }
  this.camEsp = escena ? this.camPelea : null;
};

D.instalarHud = function() {
  const hud = this.mgr.hud, yo = this;
  if (!hud || hud.__liquid) return;
  hud.__liquid = true;
  const dib = hud.dibujar.bind(hud);
  this._hudDib = dib;
  hud.dibujar = (jefes, barras) => {
    dib(jefes, barras);
    try {
      if (yo.vivo && yo.cuenta && !hud.oculto) yo.cuenta.dibujar(hud.x);
    } catch (e) {
      console.warn("[liquid] cuenta", e);
    }
  };
  this.mgr.camaraEspecial = () => this.vivo && this.camEsp ? this.camEsp : null;
};

D.instalarAgarre = function() {
  const J = this.J, yo = this;
  if (typeof J.agarrar !== "function" || J.__agarreLiquid) return;
  J.__agarreLiquid = true;
  const ag = J.agarrar.bind(J);
  this._agarrar = ag;
  J.agarrar = (...a) => {
    const r = ag(...a);
    if (r || !yo.vivo || !yo.blanco) return r;
    const s = J.ctx.rig.position, d = Math.max(Math.abs(yo.c.mov[0] * MM - s.x), Math.abs(yo.c.mov[2] * MM - s.z));
    if (d > .8) return r;
    yo.agarre = true;
    return true;
  };
};

D.dibujar = function() {
  if (!this.o) return;
  this.o.position.set(this.c.mov[0] * MM, (this.c.mov[1] - this.motor.altura) * MM, this.c.mov[2] * MM);
  this.o.rotation.y = this.c.rot[1] * ANG;
  aplicarPose(this.huesos, this.padres, this.motor.rots, this.ajusteOn ? this.adjust : null, this.motor.altura * MM);
  for (const m of this.materiales || []) m.visible = !this.invisible;
  if (this.bsw) this.bsw.visible = !this.bswOculto && !this.invisible;
  this.o.updateMatrixWorld(true);
};

D.destruir = function() {
  this.vivo = false;
  this.blanco = false;
  this.flujo?.parar();
  if (this.g.cineOn && this.mgr.hud) this.mgr.hud.cine = 0;
  if (this.camEscena) this.A3?.soltarCamara();
  this.bomba?.destruir();
  this.destello?.destruir();
  if (this._hudDib && this.mgr.hud) {
    this.mgr.hud.dibujar = this._hudDib;
    this.mgr.hud.__liquid = false;
  }
  if (this._agarrar) {
    this.J.agarrar = this._agarrar;
    this.J.__agarreLiquid = false;
  }
  if (this.mgr.camaraEspecial) this.mgr.camaraEspecial = null;
  this.padRelease = false;
  actualizarCongelado(this.mgr);
  if (this.mgr.liquid === this) this.mgr.liquid = null;
  this.o?.removeFromParent();
};

D.estadoPrueba = function() {
  return {
    fase: this.fase,
    g: this.grupo,
    s: this.estado,
    t: this.t,
    cuadros: this.cuadros,
    accion: this.accion,
    slot: this.slot,
    ej: this.ej?.name || "",
    vida: this.vida,
    rojo: this.g.rojo,
    mov: cop(this.c.mov),
    rot: this.c.rot[1],
    dir: this.dir_snake,
    dist: this.dist_snake,
    blanco: this.blanco,
    colgado: this.colgado,
    cnt: this.cnt,
    cuenta: this.cuenta?.tiempo ?? null,
    cam: this.cam_modo,
    voz: this.flujo?.estado,
    padRelease: this.padRelease,
    fin_tiempo: this.fin_tiempo,
    "golpe_puño": this.golpe_puño
  };
};

class Cuenta {
  constructor(liq, tiempo, proc) {
    this.liq = liq;
    this.tiempo = tiempo;
    this.proc = proc;
    this.img = {};
    for (const k of [ "cd_warn", "cd_keikoku" ]) {
      const i = new Image;
      i.onload = () => {
        this.img[k] = i;
      };
      i.src = `assets/jefes/${k}.png`;
    }
    liq.log("cuenta", {
      tiempo: tiempo
    });
  }
  poner(t) {
    this.tiempo = t;
  }
  cuadro() {
    if (this.tiempo > 0) {
      this.tiempo--;
      if (this.tiempo === 0 && this.proc >= 0) this.liq.A3?.proc(this.liq.actor, "p", [ 0 ]);
    }
  }
  dibujar(x) {
    const D = disposicionHud();
    if (!D.radar) return;
    const [rx, ry] = D.radar, t = this.tiempo;
    x.save();
    x.setTransform(D.kcss, 0, 0, D.kcss, 0, 0);
    x.imageSmoothingEnabled = false;
    x.translate(rx, ry);
    x.fillStyle = "rgb(8,10,10)";
    x.fillRect(0, 0, 69, 52);
    x.fillStyle = "rgba(222,0,0,0.5)";
    x.fillRect(0, 0, 69, 52);
    const gt = this.liq.gvTime(), k = gt % 16, brillo = k < 8 ? 128 - k * 16 : 128;
    if (this.img.cd_warn) {
      x.globalAlpha = brillo / 128;
      x.drawImage(this.img.cd_warn, 0, 1);
      x.globalAlpha = 1;
    }
    if (this.img.cd_keikoku) x.drawImage(this.img.cd_keikoku, 1, 13);
    const ON = "rgb(137,37,24)", OFF = "rgb(24,8,0)";
    let cs = idiv(t * 100, 30);
    const cc = cs % 100;
    cs = idiv(cs, 100);
    const ss = cs % 60;
    cs = idiv(cs, 60);
    const mm = cs % 60;
    const tenue = idiv(t * 100, 30) % 100 < 50;
    x.fillStyle = tenue ? OFF : ON;
    for (const [px, py] of PUNTOS) x.fillRect(px, py, 1, 2);
    x.fillStyle = ON;
    for (const [lx, ly, w, h] of LINEAS) x.fillRect(lx, ly, w, h);
    const digito = (n, px, py, segs) => {
      const b = SEG7[n];
      segs.forEach((s, i) => {
        x.fillStyle = b & 1 << i ? ON : OFF;
        x.fillRect(px + s[0], py + s[1], s[2], s[3]);
      });
    };
    digito(idiv(cc, 10), DIG_X[4], DIG_Y[4], DIG_CHICO);
    digito(cc % 10, DIG_X[5], DIG_Y[5], DIG_CHICO);
    digito(idiv(ss, 10), DIG_X[2], DIG_Y[2], DIG_GRANDE);
    digito(ss % 10, DIG_X[3], DIG_Y[3], DIG_GRANDE);
    digito(idiv(mm, 10), DIG_X[0], DIG_Y[0], DIG_GRANDE);
    digito(mm % 10, DIG_X[1], DIG_Y[1], DIG_GRANDE);
    x.restore();
  }
}

const texLuz = (() => {
  let t = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(.4, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 32, 32);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

class LuzBomba {
  constructor(liq, pos) {
    this.liq = liq;
    this.t = 0;
    const a = pos.map((v, i) => v + LED_A[i]), b = pos.map((v, i) => v + LED_B[i]);
    this.puntos = [ 0, 1, 2, 3, 4 ].map(k => aV3(a.map((v, i) => v + idiv(b[i] - v, 4) * k)));
    this.s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texLuz(),
      color: 16724e3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }));
    this.s.scale.setScalar(.09);
    this.s.userData.sinColision = true;
    liq.mgr.mundo.add(this.s);
  }
  cuadro() {
    const k = LED_PASOS[idiv(this.t % 60, 3)];
    this.s.position.copy(this.puntos[k]);
    this.t++;
  }
  destruir() {
    this.s.removeFromParent();
    this.s.material.dispose();
  }
}

class DestelloBomba {
  constructor(liq, pos, cuadros) {
    this.liq = liq;
    this.n = cuadros;
    this.total = cuadros;
    this.p = aV3(pos);
    this.s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texLuz(),
      color: 16773328,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true
    }));
    this.s.position.copy(this.p);
    this.s.scale.setScalar(.5);
    this.s.renderOrder = 998;
    this.s.userData.sinColision = true;
    liq.mgr.mundo.add(this.s);
    this.J = liq.J;
    this.J.setRuido?.(255, 32, this.p);
  }
  cuadro() {
    if (this.n <= 0) return;
    const L = this.liq, h = L.mgr.hud;
    if (this.n === 15) L.mgr.stunSig = true;
    this.n--;
    const k = (this.total - this.n) / this.total;
    this.s.scale.setScalar(.5 + k * 9);
    this.s.material.opacity = 1 - k * .5;
    if (this.n === this.total - 2) L.se2(186);
    if (this.n <= idiv(this.total, 2)) h.blanco = Math.min(1, (idiv(this.total, 2) - this.n + 1) / 10);
    if (this.n <= 0) {
      this.destruir();
      L.mgr.fx.push({
        t: 0,
        dur: 30,
        fn: t => {
          h.blanco = Math.max(0, 1 - t / 30);
        },
        fin: () => {
          h.blanco = 0;
        }
      });
    }
  }
  destruir() {
    this.s.removeFromParent();
    this.s.material.dispose();
  }
}

for (const k of Object.getOwnPropertyNames(D)) {
  const f = Object.getOwnPropertyDescriptor(D, k).value;
  if (typeof f === "function" && !f.name) Object.defineProperty(f, "name", {
    value: k
  });
}

export const TIPOS_LIQUID = {
  LIQUID: Liquid,
  SNAKE18: Snake18
};

export const PELEA_S18A = {
  elegir: (nv, ctx) => {
    const ya = new Set((ctx?.juego?.__jefes?.lista || []).filter(j => j.vivo).map(j => j.actor?.tipo));
    return nv.actores.filter(a => (a.tipo === "LIQUID" || a.tipo === "SNAKE18") && !a.evento && !ya.has(a.tipo)).map(a => ({
      ...a,
      forzado: true
    }));
  },
  snake: {
    p: [ 3700, 11500, -200 ],
    rot: 3072
  },
  cancion: 1,
  grupoHzd: 0
};
