// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Plasma, PlasmaL } from "../plasma.js";

import { Jefe, Flujo, MM, ANG, ratan2, randU, nearExp, nearExp4, nearExp4P, nearTimeP, cargarModelo, cargarAnim, aplicarPose, rotY } from "./base.js";

import { IT, TIPO_ARMA, TIPO_ITEM } from "../inventario.js";

import { materialKogaku, TINTE } from "../kogaku.js";

const _eE = new THREE.Euler, _vE = new THREE.Vector3;

const idiv = (a, b) => Math.trunc(a / b);

const s16 = v => (v + 32768 & 65535) - 32768;

const rsin = a => Math.round(Math.sin((a & 4095) * ANG) * 4096);

const rcos = a => Math.round(Math.cos((a & 4095) * ANG) * 4096);

const vecDir2 = v => ratan2(v[0], v[2]) & 4095;

const sub3 = (a, b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];

const lenXZ = v => Math.trunc(Math.hypot(v[0], v[2]));

const difAbs = (a, b) => {
  let d = ((a - b) % 4096 + 4096) % 4096;
  return d > 2048 ? 4096 - d : d;
};

const dirVec2 = (dir, len) => [ Math.trunc(rsin(dir) * len / 4096), 0, Math.trunc(rsin(dir + 1024) * len / 4096) ];

const putVec = (mov, rotY_, v) => {
  const r = rotY(rotY_, {
    x: v[0],
    y: v[1],
    z: v[2]
  });
  return [ mov[0] + Math.trunc(r.x), mov[1] + Math.trunc(r.y), mov[2] + Math.trunc(r.z) ];
};

const aV3 = a => new THREE.Vector3(a[0] * MM, a[1] * MM, a[2] * MM);

const deV3 = v => [ Math.round(v.x * 1e3), Math.round(v.y * 1e3), Math.round(v.z * 1e3) ];

const cop = a => a.slice();

const T = [ 0, 2, 18, 10, 40, 3, 4, 5, 1, 0, 11, 12, 19, 20, 21, 22, 34, 30, 23, 24, 27, 28, 43, 13, 14, 15, 25, 26, 35, 36, 37, 38, 32, 33, 39, 25, 41, 42, 44, 45 ];

const P = (x, y, z) => [ x, y, z, 0 ];

const DEST_FINAL = P(2e3, 1e3, 0), ADDR_FINAL = 18 | 18 << 8;

const TABLA6 = [ P(4e3, 1e3, 6e3), P(-8e3, 1e3, -4e3), P(6200, 1e3, 0), P(2e3, 1e3, 0), P(-2500, 1e3, 0), P(-11e3, 1e3, -2250) ];

const TABLA4 = [ P(-7e3, 1e3, 500), P(3500, 1e3, -500), P(3500, 1e3, 6e3), P(-7e3, 1e3, 6e3) ];

const TABLA6B = [ P(-1e3, 1e3, 2e3), P(4e3, 1e3, 6500), P(-5500, 1e3, -1500), P(3e3, 1e3, -2500), P(-6e3, 1e3, -1500), P(2e3, 1e3, -1500) ];

const TABLA_F6 = [ P(-6e3, 1e3, -1500), P(2e3, 1e3, -1500), P(-1500, 1e3, 3e3), P(-7e3, 1e3, 5500), P(4e3, 1e3, 4500) ];

const FINAL3 = [ P(-4500, 1e3, -2e3), P(0, 1e3, 2e3), P(1e3, 1e3, -2e3) ];

const PARES_SALTO = [ [ 10, 16 ], [ 13, 45 ] ];

const TABLA_RUTAS = [ [ 0, 10, 23, 30 ], [ 2, 5, 34, -1 ], [ 4, 6, 14, -1 ], [ 5, 2, 34, -1 ], [ 6, 4, 14, -1 ], [ 8, 12, 33, 35 ], [ 10, 0, 23, 30 ], [ 12, 8, 33, 35 ], [ 14, 4, 6, -1 ], [ 16, 18, 28, -1 ], [ 18, 16, 28, -1 ], [ 23, 0, 10, 30 ], [ 28, 16, 18, -1 ], [ 29, 31, 32, -1 ], [ 30, 0, 10, 23 ], [ 31, 29, 32, -1 ], [ 32, 29, 31, -1 ], [ 33, 8, 12, 35 ], [ 34, 2, 5, -1 ], [ 35, 8, 12, 33 ] ];

const ESQUINAS = [ [ P(4e3, 1e3, 6e3), 10280 ], [ P(3e3, 1e3, -1e3), 7967 ], [ P(-7500, 1e3, 6500), 514 ], [ P(-7500, 1e3, -1500), 16448 ] ];

const DEST_ARRIBA = P(-2e3, 2e3, -1250), ADDR_ARRIBA = 74 | 74 << 8;

const TAM_BLANCO = [ 300, 1500, 300 ];

const TAM_ATK = [ 500, 400, 800 ], TAM_ELE = [ 3e3, 2e3, 3e3 ];

const PTO_A = [ -200, 200, 200 ], PTO_B = [ -200, -500, 400 ], PTO_C = [ 0, -500, 0 ], PTO_0 = [ 0, 0, 0 ];

const FUERZA_ATK = [ 5, 0, 50 ];

const DAÑOS = {
  facil: [ 4, 8, 162, 50, 128, 50 ],
  normal: [ 3, 6, 200, 80, 200, 150 ],
  dificil: [ 3, 6, 255, 100, 255, 150 ]
};

const CAM_FIJA0 = [ [ -6843, 1193, -675 ], [ -7935, 1193, -2797 ] ];

const CAM5 = [ [ [ 2400, 607, -575 ], [ 4297, 2299, -8156 ] ], [ [ -4315, 680, 77 ], [ -8415, 2384, -6574 ] ] ];

const CAM7 = [ [ [ 1823, 832, -1083 ], [ 2495, 1015, -1924 ] ], [ [ -4856, 559, 229 ], [ -6304, 2222, -4878 ] ] ];

const CAM8 = [ [ [ 2284, 150, -976 ], [ 2336, 173, -1055 ] ], [ [ -6231, 117, -131 ], [ 115, 2873, -8294 ] ] ];

const BARRA = {
  nombre: "NINJA",
  izq: [ 16, 111, 159 ],
  der: [ 31, 223, 127 ]
};

export class Ninja extends Jefe {
  get espadaComoGolpe() {
    return true;
  }
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "NINJA";
    this.registro = [];
    this.blanco = false;
    this.c = {
      mov: [ -7525, 0, -2063 ],
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ],
      interp: 4,
      r: 450,
      levels: [ 0, 32e3 ],
      height: 850,
      grounded: 0
    };
    this.es_clon = 0;
    this.sin_katana = 0;
    this.tclass = 31;
    this.tgt = {
      damaged: 0,
      a_mode: 0
    };
    this.vy = 0;
    this.pos0 = [ 0, 0, 0 ];
    this.rutas = [];
    this.n_rutas = 0;
    this.ruta_i = 0;
    this.punto_i = 0;
    this.dest = [ 0, 0, 0, 0 ];
    this.dest_addr = -1;
    this.nav_dest_addr = -1;
    this.nav_addr = -1;
    this.wp_addr = -1;
    this.wp = [ 0, 0, 0, 0 ];
    this.save_addr = -1;
    this.save = [ 0, 0, 0, 0 ];
    this.ej = null;
    this.ej_t = 0;
    this.slot = 0;
    this.fin_accion = 0;
    this.visto = 0;
    this.accion = -1;
    this.dir_obj = -1;
    this.andar = 1;
    this.flags = 0;
    this.fase = 0;
    this.modo = 0;
    this.estado = 0;
    this.t = 0;
    this.t_modo = 0;
    this.cuadros = 0;
    this.cnt_golpes = 0;
    this.cnt = 0;
    this.vida = 255;
    this.cam_modo = 1;
    this.parpadeo = 0;
    this.voz_nivel = 0;
    this.katana_vis = 1;
    this.estela = 0;
    this.chispas = 0;
    this.esfera = 0;
    this.vulnerable = 0;
    this.de_balas = 0;
    this.r_modo = 0;
    this.fin_pelea = 0;
    this.clon1 = 0;
    this.clon2 = 0;
    this.dir_snake = 0;
    this.dist_snake = 0;
    this.golpe = 0;
    this.ultimo_golpe = 0;
    this.combo = 0;
    this.pila = new Array(8).fill(null);
    this.proc_e = -1;
    this.proc_w = -1;
    this.proc_b = -1;
    this.voz = [];
    this.golpe_pared = 0;
    this.primer_golpe = 0;
    this.dir_salto = 0;
    this.dañosN = DAÑOS.normal;
    this.invisible = false;
    this.kogaku = false;
    this.g = {
      c3438: 0,
      c343C: 0,
      c3440: 0,
      c3444: 0,
      c3448: 0,
      c344C: 0,
      c3450: 0,
      e4340: 0,
      rojo: 255,
      camT: 0,
      camLado: 0
    };
    this.snakeAddr = -1;
    this.snakeCaido = 0;
    this.empujeSnake = null;
    this.offset = [ 0, 0, 0 ];
    this.radio = .33;
    this.alto = 1.85;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 1500) this.registro.shift();
  }
  async iniciar() {
    const o = this.opts;
    const proc = k => {
      const v = o[k]?.[0];
      return v && typeof v === "object" && "proc" in v ? v.proc : typeof v === "number" ? v : -1;
    };
    this.proc_e = proc("e");
    this.proc_w = proc("w");
    this.proc_b = proc("b");
    this.voz = (o.v || []).map(x => typeof x === "number" ? x : 0).slice(0, 35);
    const lvl = this.dificultad();
    this.dañosN = (lvl === 1 ? DAÑOS.normal : lvl > 0 && lvl < 4 ? DAÑOS.dificil : DAÑOS.facil).slice();
    const nums = k => Array.isArray(o[k]) ? o[k].filter(x => typeof x === "number") : null;
    const y = nums("y"), z = nums("z");
    if (y && y.length === 2) {
      this.dañosN[0] = y[0] & 255;
      this.dañosN[1] = y[1] & 255;
    }
    if (z && z.length === 4) for (let i = 0; i < 4; i++) this.dañosN[2 + i] = z[i] & 255;
    [this.d_puno, this.d_patada, this.d_tajo, this.d_golpe, this.d_salto, this.d_ele] = this.dañosN;
    const rutas = this.J.ctx.hz?.rutas || [];
    this.rutas = rutas.slice(0, 16).map(r => ({
      n: Math.min(32, r.puntos.length),
      p: r.puntos.slice(0, 32).map(q => [ q.p[0], q.p[1], q.p[2], q.cmd | 0 ])
    }));
    this.n_rutas = this.rutas.length;
    if (!this.n_rutas) this.rutas = [ {
      n: 1,
      p: [ [ -7e3, 0, 0, 0 ] ]
    } ], this.n_rutas = 1;
    const opc = url => cargarModelo(this.ctx, url).catch(() => null);
    const [katana, trans1, trans2, bola1, bola2] = await Promise.all([ opc("jefes/katana.glb"), opc("jefes/ninja_camuflado.glb"), opc("jefes/ninja_camuflado.glb"), opc("jefes/nja_ball.glb"), opc("jefes/nja_ball.glb"), this.cargarCuerpo("jefes/ninja.glb", "nja_08b") ]);
    this.materiales = [];
    this.modelo.traverse(m => {
      if (m.isMesh) this.materiales.push([ m, m.material ]);
    });
    if (katana && this.huesos[4]) {
      this.katana = katana;
      this.huesos[4].add(katana);
      this.ctx.teñir?.(katana);
    }
    this.vfx = new EfectosNinja(this, [ trans1, trans2 ], [ bola1, bola2 ]);
    const p0 = this.rutas[0].p[0];
    this.c.mov = [ -7525, p0[1], -2063 ];
    if (Array.isArray(o.p) && typeof o.p[0] === "number") this.c.mov = [ o.p[0], o.p[1], o.p[2] ];
    if (Array.isArray(o.d) && typeof o.d[1] === "number") {
      this.c.rot[1] = o.d[1] & 4095;
      this.c.turn[1] = this.c.rot[1];
    }
    this.piso = this.pisoEn(this.c.mov);
    this.c.levels[0] = this.piso;
    this.c.mov[1] = this.piso + 850;
    this.apilar(1);
    this.apilar(2);
    this.fase = this.es_clon ? 5 : 0;
    this.vida = 255;
    this.modo = 0;
    this.estado = 0;
    this.t = 0;
    this.cuadros = 0;
    this.cnt_golpes = 0;
    this.andar = 1;
    this.combo = 0;
    this.sin_katana = 0;
    this.parpadeo = 0;
    this.katana_vis = 1;
    this.golpe_pared = 0;
    this.fin_pelea = 0;
    this.motor.accion(T[0], 0);
    this.g.e4340 = 0;
    this.cam = {
      target: cop(this.snakeMM()),
      rotX: 640,
      rotY: 2048,
      track: 4e3,
      pos: null,
      mira: null,
      fija: false
    };
    this.cam_modo = 1;
    this.g.camT = 0;
    this.mgr.camaraEspecial = () => this.vivo && this.camEsp ? this.camEsp : null;
    this.flujo = new Flujo({
      voces: this.ctx.voces,
      simulado: !!this.ctx.vocesSimuladas,
      alHablar: c => this.log("voz", {
        c: c
      })
    });
    this.mgr.flujo = this.flujo;
    await this.flujo.precargar(this.voz.filter(v => v > 0));
    this.barras = [ {
      y: 28,
      rest: 255 << 2,
      now: 255 << 2,
      max: 1024,
      visible: true,
      conf: BARRA
    } ];
    this.snakeAddr = this.addr(this.snakeMM(), -1);
    this.log("aparece", {
      mov: cop(this.c.mov),
      dif: lvl,
      "daños": this.dañosN.slice(),
      rutas: this.n_rutas
    });
  }
  gvTime() {
    return this.J.gvTime ?? this.mgr.frame;
  }
  nivel() {
    return this.dificultad();
  }
  snakeMM() {
    const s = this.snake();
    return [ s.x, s.y, s.z ];
  }
  snakeVive() {
    return !this.J.muerto && this.J.vida > 0;
  }
  inv() {
    return this.J.ctx.inventario || this.ctx.inventario || null;
  }
  armas() {
    return this.ctx.armas || this.J.ctx.armas || null;
  }
  arma() {
    const i = this.inv();
    return i ? i.arma : 0;
  }
  status() {
    const p = this.J.postura?.() ?? 0;
    let s = 0;
    if (p === 1) s |= 32;
    if (p === 2) s |= 64;
    if (this.inv()?.enCaja) s |= 4096;
    if (this.snakeCaido > 0 || [ "derribo", "piso" ].includes(this.J.sn?.reac?.tipo)) s |= 512;
    return s;
  }
  chafLife() {
    const a = this.armas();
    return a?.chaff > 0 ? a.chaff : 0;
  }
  chaff() {
    return this.chafLife() > 0 || !!this.inv()?.chaff;
  }
  termicas() {
    return this.inv()?.item === IT.THERMG;
  }
  gameOverTimer() {
    return this.mgr.gameOverTimer();
  }
  pisoEn(p) {
    const h = this.J.alturaPiso?.(p[0] * MM, p[2] * MM, (p[1] - (this.c?.height ?? 850) + 600) * MM);
    return h == null ? this.piso ?? 0 : Math.round(h * 1e3);
  }
  addr(p, prev = -1) {
    if (!this.J.zonas?.length) return 0;
    return this.J.direccion(aV3(p), prev < 0 ? 65535 : prev & 65535);
  }
  reach(a, b) {
    return this.J.zonas?.length ? this.J.alcance(a & 65535, b & 65535) : 0;
  }
  navegarZona(a, b, p) {
    return this.J.navegarDir(a & 65535, b & 65535, aV3(p), false);
  }
  zonaCentro(z) {
    const Z = this.J.zonas?.[z];
    return Z ? [ Math.round(Z.p.x * 1e3), Math.round(Z.p.y * 1e3), Math.round(Z.p.z * 1e3), 0 ] : [ 0, 0, 0, 0 ];
  }
  getRoute(z1, z2) {
    if (z1 === z2) return z1;
    let m = 255;
    for (const n of this.J.zonas[z1]?.v || []) m = Math.min(m, this.J.ruta(n, z2));
    return m;
  }
  farZone(z1, z2) {
    if (z1 === z2) return {
      z: z1,
      rout: 0
    };
    let maxR = 0, maxN = z1;
    for (const n of this.J.zonas[z1]?.v || []) {
      const r = this.J.ruta(n, z2);
      if (r > maxR) {
        maxR = r;
        maxN = n;
      }
    }
    return {
      z: maxN,
      rout: maxR - 1
    };
  }
  hazard(a, b) {
    if (!this.J.libre) return 0;
    return this.J.libre(aV3(a), aV3(b)) ? 0 : 1;
  }
  seM(id) {
    this.mgr.se(id, aV3(this.c.mov), "bomba");
  }
  se2(id) {
    this.mgr.se(id, null, null);
  }
  voxStream(code) {
    if (!(code > 0)) {
      this.log("voz 0 (sin código)");
      return;
    }
    this.flujo.vox(code);
  }
  streamStatus() {
    return this.flujo.estado;
  }
  streamStop() {
    this.flujo.parar();
  }
  puedeHablar() {
    return this.gameOverTimer() === 0 && this.snakeVive();
  }
  Voz(code) {
    if (this.streamStatus() === -1 && this.puedeHablar()) this.voxStream(code);
  }
  CamModo(n) {
    this.cam_modo = n;
    this.g.camT = 0;
  }
  apilar(n) {
    for (let i = 0; i < 8; i++) if (!this.pila[i]) {
      this.pila[i] = n;
      return 1;
    }
    return 0;
  }
  desapilar(n) {
    for (let i = 0; i < 8; i++) if (this.pila[i] === n) {
      this.pila[i] = null;
      return 1;
    }
    return 0;
  }
  correrPila() {
    for (let i = 0; i < 8; i++) {
      const n = this.pila[i];
      if (n != null) this.PILA[n].call(this);
    }
  }
  sinControl(si) {
    this.padRelease = si;
    this.mgr.congelar(si || this.snakeCaido > 0);
  }
  CineAbrir() {
    if (!this.g.cine) {
      this.g.cine = 1;
      this.log("cine abre");
    }
  }
  CineCerrar() {
    if (this.g.cine) {
      this.g.cine = 0;
      this.log("cine cierra");
    }
  }
  accionMotion(slot, interp = 4) {
    this.slot = slot;
    this.motor.accion(T[slot], interp);
  }
  sinOverride() {
    this.motor.override(T[0], 4, 0);
  }
  get isEnd() {
    return this.motor.isEnd;
  }
  get frameM() {
    return this.motor.info1.frame;
  }
  get height() {
    return this.motor.altura;
  }
  ejecutor(fn) {
    this.ej = fn;
    this.ej_t = 0;
    this.c.turn[0] = 0;
    this.c.turn[2] = 0;
  }
  hacerBlanco() {
    this.tclass |= 31;
  }
  cuadro() {
    this.golpesDelVisor();
    this.Empuje();
    this.actControl();
    this.actMotion();
    this.Logica();
    if (!this.es_clon) this.pushTarget();
    this.cuadros++;
    if (!this.es_clon) {
      if (this.vida < 0) this.vida = 0;
      if (this.vida < this.g.rojo) this.g.rojo--;
      const b = this.barras[0];
      b.rest = this.g.rojo << 2;
      b.now = this.vida << 2;
    }
    this.GolpePared();
    if (this.snakeCaido > 0 && --this.snakeCaido === 0) this.mgr.congelar(!!this.padRelease);
    this.empujarSnake();
    this.flujo.tick();
    if (this.flujo.estado === 1) this.flujo.empezar();
    this.vfx.cuadro();
    this.camara();
    this.blanco = this.vivo && !!(this.tclass & 4) && !this.ganado;
  }
  golpesDelVisor() {
    const lanzado = this.golpes.some(x => x.modo === 4 && x.cuanto >= 5 && !x.explosion);
    const d = this.tomarDaño();
    this.tgt.damaged = 0;
    if (lanzado) {
      if (!this.fin_pelea) {
        this.tgt.damaged = 2;
        this.tgt.a_mode = 36;
        this.log("lanzado", {
          fase: this.fase,
          modo: this.modo,
          estado: this.estado
        });
      }
      return;
    }
    if (d) {
      this.tgt.damaged = 4;
      this.tgt.a_mode = d.a_mode;
      this.log("golpe recibido", {
        a_mode: d.a_mode,
        fase: this.fase,
        modo: this.modo,
        estado: this.estado
      });
    }
  }
  Empuje() {
    if (this.offset[0] || this.offset[2]) {
      this.c.step[0] += this.offset[0];
      this.c.step[2] += this.offset[2];
      this.offset = [ 0, 0, 0 ];
    }
  }
  actControl() {
    const c = this.c;
    c.mov[0] += c.step[0];
    c.mov[2] += c.step[2];
    if (c.r > 0) this.chocar(c.r, c.segFlag ?? 2);
    if (c.interp === 0) for (let i = 0; i < 3; i++) c.rot[i] = s16(nearExp4P(c.rot[i], c.turn[i])); else {
      for (let i = 0; i < 3; i++) c.rot[i] = s16(nearTimeP(c.rot[i], c.turn[i], c.interp));
      c.interp--;
    }
    if (c.r >= -1) {
      let vy = c.mov[1] + c.step[1];
      const piso = this.pisoEn(c.mov);
      c.grounded = 0;
      if (piso + c.height > vy) {
        vy = piso + c.height;
        c.grounded = 1;
      }
      c.levels[0] = piso;
      c.mov[1] = vy;
      this.piso = piso;
    }
  }
  chocar(r, segFlag) {
    const segs = this.J.segs;
    if (!segs) return;
    const c = this.c, R = r * MM, px0 = c.mov[0] * MM, pz0 = c.mov[2] * MM, py = c.mov[1] * MM;
    let px = px0, pz = pz0;
    for (const s of segs) {
      if (s.flags & segFlag) continue;
      const y0 = Math.min(s.a[1], s.b[1]), y1 = Math.max(s.a[1], s.b[1]) + s.h;
      if (py < y0 || py > y1) continue;
      const ax = s.a[0], az = s.a[2], bx = s.b[0], bz = s.b[2];
      if (px < Math.min(ax, bx) - R || px > Math.max(ax, bx) + R || pz < Math.min(az, bz) - R || pz > Math.max(az, bz) + R) continue;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
      const ex = px - (ax + dx * t), ez = pz - (az + dz * t), d = Math.hypot(ex, ez);
      if (d >= R || d < 1e-5) continue;
      px += ex / d * (R - d);
      pz += ez / d * (R - d);
    }
    c.mov[0] = Math.round(px * 1e3);
    c.mov[2] = Math.round(pz * 1e3);
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
  pushTarget() {
    if (!(this.tclass & 8) || this.J.muerto) return;
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
    const x = push(s[0], 300, m[0], TAM_BLANCO[0]);
    if (!x) return;
    const z = push(s[2], 300, m[2], TAM_BLANCO[2]);
    if (!z) return;
    if (Math.abs(s[1] - m[1]) > TAM_BLANCO[1] + 750) return;
    if (Math.abs(x) <= Math.abs(z)) {
      const h = idiv(x, 2);
      this.offset[0] += h;
      this.empujeSnake = [ -h, 0 ];
    } else {
      const h = idiv(z, 2);
      this.offset[2] += h;
      this.empujeSnake = [ 0, -h ];
    }
  }
  empujarSnake() {
    const e = this.empujeSnake;
    this.empujeSnake = null;
    if (!e || this.mgr.congelado) return;
    const r = this.J.ctx.rig.position;
    r.x += e[0] * MM;
    r.z += e[1] * MM;
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
    const s = this.snakeMM(), d = sub3(s, this.c.mov);
    d[1] = 0;
    this.dir_snake = vecDir2(d);
    this.dist_snake = lenXZ(d);
    this.visto = 0;
    if ((this.gvTime() & 3) === 0) this.visto = this.hazard(s, this.c.mov) ? 0 : 1;
    this.snakeAddr = this.addr(s, this.snakeAddr);
  }
  LeerGolpe() {
    this.golpe = 0;
    if (this.tgt.damaged & 4) this.golpe = this.tgt.a_mode; else if (this.tgt.damaged & 2 && this.tgt.a_mode === 36) this.golpe = 6;
  }
  Cuerpo() {
    this.tclass = 1;
    this.fin_accion = 0;
    this.estela = 0;
    this.chispas = 0;
    this.r_modo = 0;
    this.katana_vis = this.sin_katana === 1 ? 0 : 1;
    this.c.segFlag = 2;
    const t = this.ej_t++;
    if (!this.ej) this.ej = this.E_Quieto;
    this.ej.call(this, t);
    this.tgt.damaged = 0;
    if (this.fin_pelea) {
      this.tclass &= ~2;
      this.estela = 0;
    }
    this.MirarSnake();
    this.NivelVoz();
    this.Parpadeo();
    this.Camuflaje();
    this.Chispas();
    if (this.termicas()) this.estela = 0;
    if (this.flags & 4) {
      if (this.es_clon || this.clon1 || this.clon2) this.invisible = this.es_clon !== this.gvTime() % 3; else this.invisible = false;
    }
    this.c.height = this.height;
    if (this.c.mov[1] >= 3801) this.r_modo = 2;
    this.c.r = this.r_modo === 1 ? -1 : this.r_modo === 2 ? -2 : nearExp(this.c.r, 450, 2);
    if (this.vy < 0 && this.c.grounded) this.vy = 0;
    this.vy -= 16;
    this.c.step[1] = this.vy;
  }
  MirarSnake() {
    if (!this.adjust) return;
    const d = (this.dir_snake - this.c.rot[1] + 2048 & 4095) - 2048, lim = 512;
    this.adjust[6][1] = Math.max(-lim, Math.min(lim, d));
  }
  NivelVoz() {
    this.voz_nivel = this.flujo.estado === 2 ? 64 + (this.cuadros * 37 & 63) : 0;
  }
  Parpadeo() {
    if (this.parpadeo > 0) {
      this.invisible = !!(this.parpadeo & 2);
      this.tclass = 1;
      this.parpadeo--;
    } else this.parpadeo = 0;
  }
  Camuflaje() {
    if (this.flags & 2) {
      if (this.termicas()) {
        if (this.kogaku) {
          this.seM(78);
          this.kogaku = false;
          this.log("camuflaje apagado (térmicas)");
        }
      } else if (!this.kogaku) {
        this.seM(78);
        this.kogaku = true;
        this.log("camuflaje");
      }
      this.voz_nivel = -1;
    } else if (this.kogaku) {
      this.seM(78);
      this.kogaku = false;
      this.log("camuflaje apagado");
    }
  }
  Chispas() {
    if (this.chispas === 1) {
      if (this.ChispasCuerpo()) this.seM(178);
    } else if (this.chispas !== 2 && this.vida < 90) this.chispas = 1;
  }
  ChispasCuerpo() {
    if (this.gvTime() & 7) return 0;
    const k = randU(8), pares = [ [ 3, 1 ], [ 5, 6 ], [ 7, 8 ], [ 8, 9 ], [ 0, 5 ] ];
    if (k >= 5) return 0;
    this.vfx.arco(pares[k][0], pares[k][1], 4, 1e3);
    return 1;
  }
  ElegirEjecutor() {
    const E = this.EJ[this.accion];
    if (!E) return 0;
    this.ejecutor(E);
    return 1;
  }
  "LeerDaño"() {
    const tg = this.tgt;
    if (!(tg.damaged & 4)) return tg.damaged & 2 ? this.LeerCaptura() : 0;
    const a = tg.a_mode;
    if (a === 2) {
      if (this.vulnerable) this.ejecutor(this.R_Patada); else {
        this.parpadeo = 30;
        this.ejecutor(this.E_Quieto);
      }
    } else if (a === 1) this.ejecutor(this.vulnerable ? this.R_Trompada : this.R_Desviar); else if (a === 3) this.ejecutor(this.R_Trompada); else if (a === 4) this.ejecutor(this.R_Patada);
    tg.damaged = 0;
    return 1;
  }
  LeerCaptura() {
    const tg = this.tgt;
    if (!(tg.damaged & 2) || tg.a_mode !== 36) {
      tg.damaged &= ~2;
      return 0;
    }
    this.ejecutor(this.vulnerable ? this.R_Lanzado2 : this.R_Lanzado);
    tg.damaged = 0;
    return 1;
  }
  GolpeRecibido() {
    const tg = this.tgt;
    if (tg.damaged & 4) {
      tg.damaged = 0;
      return tg.a_mode;
    }
    return -1;
  }
  Reaccion() {
    if (this.LeerDaño()) {
      this.tclass = 1;
      return 1;
    }
    return 0;
  }
  E_Quieto(t) {
    this.hacerBlanco();
    if (t === 0) {
      this.slot = 0;
      this.accionMotion(0);
    }
    if (this.Reaccion()) return;
    if (this.ElegirEjecutor()) {
      this.sinOverride();
      this.c.turn[0] = this.c.turn[2] = 0;
      return;
    }
    if (this.dir_obj < 0) return;
    this.ejecutor(this.E_Andar);
  }
  ZonaConChoque() {
    const x = this.c.mov[0], z = this.c.mov[2];
    if (x >= 5001 && x < 5750 && z >= -499 && z < 6e3) return 1;
    return x >= -3249 && x < 2500 && z >= -249 && z < 250 ? 1 : 0;
  }
  E_Andar(t) {
    if (this.andar !== 3) this.hacerBlanco();
    const d = this.dir_obj;
    const elegir = () => {
      const a = this.andar;
      if (a === 1) this.accionMotion(this.sin_katana === 1 ? 2 : 1); else if (a === 0) this.accionMotion(3); else if (a === 2) this.accionMotion(8); else if (a === 3) this.accionMotion(4);
    };
    if (t === 0) elegir();
    const s = this.slot, a = this.andar;
    if (s === 3) {
      if (a === 1) this.accionMotion(this.sin_katana === 1 ? 2 : 1); else if (a === 2) this.accionMotion(8);
    } else if (s === 1 || s === 2) {
      if (a === 0) this.accionMotion(3); else if (a === 2) this.accionMotion(8);
    } else if (s === 8) {
      if (a === 0) this.accionMotion(3); else if (a === 1) this.accionMotion(1);
    }
    if (this.Reaccion()) return;
    if (this.ElegirEjecutor()) {
      this.sinOverride();
      return;
    }
    if (d < 0) {
      this.ejecutor(this.E_Quieto);
      this.sinOverride();
      return;
    }
    if (!this.enPantalla()) this.c.rot[1] = d;
    this.c.turn[1] = d;
    if (!this.ZonaConChoque()) this.r_modo = 1;
  }
  enPantalla() {
    const f = this.J.ctx.enPantalla;
    return f ? !!f(aV3(this.c.mov)) : true;
  }
  saltoA(t, slot, se, opt = {}) {
    if (t === 0) {
      this.accionMotion(slot);
      this.pos0 = cop(this.c.mov);
      if (opt.turn) {
        this.c.turn[1] = this.dir_obj;
        this.log("salto", {
          slot: slot,
          dir: this.dir_obj
        });
      }
    }
    for (const [cuadro, id, remolino] of se) if (t === cuadro) {
      this.seM(id);
      if (remolino) this.vfx.remolino(200, 100);
    }
    if (opt.estelaDesde == null || t >= opt.estelaDesde) this.estela = 1;
    if (this.isEnd) {
      this.ejecutor(this.E_Quieto);
      this.fin_accion = 1;
      return;
    }
    const f = this.frameM;
    if (f - 7 >= 0 && f - 7 < 19) {
      this.c.step[0] = idiv(this.dest[0] - this.pos0[0], 18);
      this.c.step[2] = idiv(this.dest[2] - this.pos0[2], 18);
    } else {
      this.c.step[0] = 0;
      this.c.step[2] = 0;
    }
    this.c.segFlag = 4;
    this.c.mov[1] = this.height + (this.c.levels[0] || 0);
  }
  E01_SaltoAdelante(t) {
    this.saltoA(t, 5, [ [ 26, 188, true ], [ 13, 56 ] ], {
      turn: true,
      estelaDesde: 8
    });
  }
  E02_SaltoLado(t) {
    this.saltoA(t, 7, [ [ 18, 188, true ], [ 8, 56 ] ]);
  }
  E03_SaltoLado2(t) {
    this.saltoA(t, 6, [ [ 18, 188, true ], [ 8, 56 ] ]);
  }
  E04_SaltoAtras(t) {
    this.saltoA(t, 20, [ [ 17, 188, true ], [ 40, 188, true ], [ 17, 182 ], [ 8, 56 ], [ 28, 56 ] ]);
  }
  E05_SaltoAlto(t) {
    const d = this.dir_obj;
    if (t === 0) {
      this.accionMotion(5);
      this.pos0 = cop(this.c.mov);
      this.c.turn[1] = d;
    }
    if (this.Reaccion()) return;
    if (t === 7) this.seM(188);
    if (t === 70) {
      this.seM(188);
      this.vfx.remolino(200, 100);
    }
    if (t === 13 || t === 60) this.seM(187);
    if (t === 79) {
      this.ejecutor(this.E_Quieto);
      this.fin_accion = 1;
      return;
    }
    if (this.isEnd) this.motor.isEnd = 0;
    if (t - 7 >= 0 && t - 7 < 62) {
      this.katana_vis = 0;
      this.flags |= 2;
      if (t === 9) {
        this.invisible = true;
        this.sombraOculta = true;
      }
      if (t === 65) {
        this.invisible = false;
        this.sombraOculta = false;
      }
    }
    if (t === 39) {
      this.c.mov[0] = this.dest[0];
      this.c.mov[2] = this.dest[2];
    }
    const piso = this.c.levels[0] || 0;
    if (t - 7 >= 0 && t - 7 < 9 || t - 56 >= 0 && t - 56 < 10) this.c.mov[1] = piso + (this.height << 1); else if (t - 16 >= 0 && t - 16 < 40) {
      this.c.mov[1] = 6e3;
      this.c.step[1] = 0;
    } else this.c.mov[1] = this.height + piso;
    if (t >= 67) this.hacerBlanco();
    this.c.step[0] = 0;
    this.c.step[2] = 0;
  }
  E06_SaltoCorto(t) {
    this.estela = 1;
    if (t === 0) {
      this.accionMotion(5);
      this.pos0 = cop(this.c.mov);
    }
    if (t === 7) this.seM(188);
    if (t === 26) {
      this.seM(188);
      this.vfx.remolino(200, 100);
    }
    if (t === 13) this.seM(187);
    if (t === 39) {
      this.fin_accion = 1;
      this.ejecutor(this.E_Quieto);
      return;
    }
    if (this.isEnd) this.motor.isEnd = 0;
    if (t - 7 >= 0 && t - 7 < 22) {
      this.flags |= 2;
      if (t === 9) {
        this.invisible = true;
        this.sombraOculta = true;
      }
      if (t === 25) {
        this.invisible = false;
        this.sombraOculta = false;
      }
    }
    if (t === 15) {
      this.c.mov[0] = this.dest[0];
      this.c.mov[2] = this.dest[2];
    }
    const piso = this.c.levels[0] || 0;
    if (t - 9 >= 0 && t - 9 < 17) this.c.mov[1] = piso + (this.height << 1); else this.c.mov[1] = this.height + piso;
    this.c.step[0] = 0;
    this.c.step[2] = 0;
  }
  E07_Mirar(t) {
    if (t === 0) this.accionMotion(8);
    if (this.dir_obj >= 0) this.c.turn[1] = this.dir_obj;
    const g = this.GolpeRecibido();
    if (g > 0 && g >= 3 && g < 5) this.seM(189);
    if (this.accion !== 7) this.ejecutor(this.E_Quieto);
    this.hacerBlanco();
  }
  guardia(t, slot, mia) {
    this.hacerBlanco();
    if (t === 0) this.accionMotion(slot);
    if (this.Reaccion()) return;
    if (this.dir_obj >= 0) this.c.turn[1] = this.dir_obj;
    if (this.accion === mia) return;
    if (this.ElegirEjecutor()) this.sinOverride(); else this.ejecutor(this.E_Quieto);
    this.c.turn[0] = this.c.turn[2] = 0;
  }
  E08_Guardia(t) {
    this.guardia(t, 9, 8);
  }
  E09_Guardia2(t) {
    this.guardia(t, 8, 9);
  }
  E21_Pose(t) {
    if (t === 0) this.accionMotion(31);
    this.katana_vis = 2;
    if (t - 1 >= 0 && t - 1 < 6 || t - 20 >= 0 && t - 20 < 16 || t - 101 >= 0 && t - 101 < 5) this.estela = 1;
    if (t === 22 || t === 30 || t === 100) this.se2(180);
    if (!this.ElegirEjecutor() && this.isEnd) this.ejecutor(this.E_Quieto);
  }
  E10_Envainar(t) {
    this.estela = 1;
    if (t === 0) {
      this.accionMotion(30);
      this.se2(180);
    }
    if (t === 90) {
      this.slot = 0;
      this.motor.accion(T[0], 15);
    }
    if (this.dir_obj >= 0) this.c.turn[1] = this.dir_obj;
    if (t === 20) this.se2(180);
    if (t === 33) {
      this.se2(179);
      this.sin_katana = 1;
      this.log("guarda la katana");
    }
    if (t < 33) this.katana_vis = 2;
    if (!this.ElegirEjecutor() && t === 104) this.ejecutor(this.E_Quieto);
  }
  E22_Pose2(t) {
    if (t === 0) this.accionMotion(27);
    if (this.accion !== 22) {
      if (!this.ElegirEjecutor()) this.ejecutor(this.E_Quieto); else return;
    }
    this.c.step[0] = this.c.step[2] = 0;
  }
  E23_Electrico(t) {
    if (t === 0) this.accionMotion(28);
    this.chispas = 1;
    if (this.accion !== 23) {
      if (!this.ElegirEjecutor()) this.ejecutor(this.E_Quieto);
      return;
    }
    this.c.step[0] = this.c.step[2] = 0;
    this.hacerBlanco();
  }
  E24_Electrico2(t) {
    if (t === 0) this.accionMotion(29);
    this.chispas = 1;
    if (this.accion !== 24) {
      if (!this.ElegirEjecutor()) this.ejecutor(this.E_Quieto);
      return;
    }
    this.c.step[0] = this.c.step[2] = 0;
    this.hacerBlanco();
  }
  E26_Chaff(t) {
    if (t === 0) this.accionMotion(32);
    if (this.Reaccion()) return;
    this.chispas = 1;
    if (this.accion !== 26) {
      if (this.ElegirEjecutor()) return;
      this.ejecutor(this.E_Quieto);
    }
    this.c.step[0] = this.c.step[2] = 0;
    this.hacerBlanco();
  }
  E27_Chaff2(t) {
    if (t === 0) this.accionMotion(27);
    this.chispas = 1;
    if (this.accion !== 27) {
      if (this.ElegirEjecutor()) return;
      this.parpadeo = 30;
      this.ejecutor(this.E_Quieto);
    }
    this.c.step[0] = this.c.step[2] = 0;
  }
  E30_Carga(t) {
    if (t === 0) this.accionMotion(35);
    if (this.Reaccion()) return;
    this.chispas = 1;
    if (this.accion !== 30) {
      if (this.ElegirEjecutor()) return;
      this.ejecutor(this.E_Quieto);
    }
    this.c.step[0] = this.c.step[2] = 0;
    this.hacerBlanco();
  }
  E25_Grito(t) {
    if (t === 0) this.accionMotion(26);
    if (t === 60) this.seM(51);
    if (this.ElegirEjecutor()) return;
    if (this.isEnd) {
      this.fin_accion = 1;
      this.ejecutor(this.E_Quieto);
    }
  }
  E28_Descarga(t) {
    if (t === 0) {
      this.accionMotion(34);
      this.Atacar(5);
      this.vfx.remolino(400, 400);
    }
    if ((t & 3) === 0) {
      this.seM(183);
      this.vfx.chispasPiso();
    }
    this.chispas = 2;
    if (this.accion !== 28) {
      if (this.ElegirEjecutor()) return;
      this.ejecutor(this.E_Quieto);
    }
    this.Atacar(6);
    this.c.step[0] = this.c.step[2] = 0;
  }
  E29_Descarga2(t) {
    if (t === 0) this.accionMotion(34);
    if (this.Reaccion()) return;
    if ((t & 3) === 0) {
      this.seM(183);
      this.vfx.chispasPiso();
    }
    if (this.accion !== 29) {
      if (this.ElegirEjecutor()) return;
      this.ejecutor(this.E_Quieto);
    }
    this.Atacar(6);
    this.c.step[0] = this.c.step[2] = 0;
    this.hacerBlanco();
  }
  empezarAtaque(slot) {
    this.accionMotion(slot);
    this.c.rot[1] = this.dir_snake;
    this.c.turn[1] = this.dir_snake;
    this.primer_golpe = 1;
    this.log("ataque", {
      slot: slot,
      accion: this.accion
    });
  }
  pego(r, se) {
    if (r && this.primer_golpe) {
      this.seM(se);
      this.primer_golpe = 0;
    }
  }
  avanceDificultad(t) {
    const lv = this.nivel(), s = this.c.step;
    if (lv === 1) {
      s[0] <<= 1;
      s[2] <<= 1;
    } else if (lv === 2) {
      s[0] = idiv(s[0] * 3, 2);
      s[2] = idiv(s[2] * 3, 2);
      if ((t & 3) === 0) this.c.turn[1] = this.dir_snake;
    } else if (lv === 3) {
      s[0] <<= 1;
      s[2] <<= 1;
      this.c.turn[1] = this.dir_snake;
    }
  }
  terminarAtaque() {
    this.ejecutor(this.E_Quieto);
    this.fin_accion = 1;
  }
  E12_Tajo1(t) {
    let r = 0;
    this.katana_vis = 2;
    if (t === 0) this.empezarAtaque(10);
    if (this.Reaccion()) return;
    if (t === 3 || t === 16) this.seM(81);
    if (t === 5) this.seM(180);
    if (t - 5 >= 0 && t - 5 < 15) {
      this.estela = 1;
      r = this.Atacar(0);
    }
    this.pego(r, 177);
    if (this.isEnd) {
      if (this.sin_katana === 1) this.se2(179);
      this.terminarAtaque();
      return;
    }
    this.hacerBlanco();
    this.avanceDificultad(t);
  }
  E13_Tajo2(t) {
    let r = 0;
    this.katana_vis = 2;
    if (t === 0) this.empezarAtaque(11);
    if (this.Reaccion()) return;
    if (t === 6 || t === 17) this.seM(180);
    if (t - 7 >= 0 && t - 7 < 23) {
      this.estela = 1;
      r = this.Atacar(0);
    }
    this.pego(r, 177);
    if (this.isEnd) {
      if (this.sin_katana === 1) this.se2(179);
      this.terminarAtaque();
      return;
    }
    this.hacerBlanco();
  }
  E14_Golpes(t) {
    let r = 0;
    this.hacerBlanco();
    if (t === 0) this.empezarAtaque(12);
    if (this.Reaccion()) return;
    if (t === 12 || t === 38 || t === 56) this.seM(56);
    if (t - 13 >= 0 && t - 13 < 5) {
      this.estela = 1;
      r = this.Atacar(3);
    }
    if (t - 39 >= 0 && t - 39 < 3) {
      this.estela = 1;
      r = this.Atacar(3);
    }
    if (t - 57 >= 0 && t - 57 < 3) {
      this.estela = 1;
      r = this.Atacar(4);
    }
    this.pego(r, 52);
    if (this.isEnd) this.terminarAtaque();
  }
  E15_Golpes2(t) {
    let r = 0;
    if (t === 0) this.empezarAtaque(13);
    if (this.Reaccion()) return;
    if (t === 13 || t === 21 || t === 34) this.seM(56);
    if (t - 14 >= 0 && t - 14 < 5) {
      this.estela = 1;
      r = this.Atacar(3);
    }
    if (t - 22 >= 0 && t - 22 < 18) {
      this.estela = 1;
      r = this.Atacar(3);
    }
    this.pego(r, 52);
    if (this.isEnd) {
      this.terminarAtaque();
      return;
    }
    this.hacerBlanco();
    this.avanceDificultad(t);
  }
  E16_Tajo3(t) {
    let r = 0;
    if (t === 0) this.empezarAtaque(14);
    if (this.Reaccion()) return;
    if (t === 13) this.seM(56);
    if (t - 14 >= 0 && t - 14 < 7) {
      this.estela = 1;
      r = this.Atacar(0);
    }
    this.pego(r, 52);
    if (this.isEnd) {
      this.terminarAtaque();
      return;
    }
    this.hacerBlanco();
  }
  E17_Tajo4(t) {
    let r = 0;
    if (t === 0) this.empezarAtaque(15);
    if (t === 6) this.seM(182);
    if (t === 10) this.seM(57);
    if (t === 24) this.seM(188);
    if (t - 11 >= 0 && t - 11 < 17) {
      r = this.Atacar(0);
      this.estela = 1;
    }
    this.pego(r, 52);
    if (this.Reaccion()) return;
    if (this.isEnd) {
      this.terminarAtaque();
      return;
    }
    this.hacerBlanco();
    this.avanceDificultad(t);
  }
  E18_SaltoAtaque(t) {
    let r = 0;
    const f = this.frameM;
    if (t === 0) {
      this.empezarAtaque(16);
      this.pos0 = cop(this.c.mov);
    }
    if (this.Reaccion()) return;
    const lv = this.nivel(), tope = lv === 1 ? 60 : lv <= 0 || lv >= 4 ? 100 : 50;
    if (this.isEnd || tope < t) {
      this.fin_accion = 1;
      this.ejecutor(this.E_Quieto);
      return;
    }
    if (t === 10) this.seM(187);
    if (t === 39) this.seM(57);
    if (t === 41) {
      this.seM(188);
      this.vfx.remolino(400, 400);
    }
    if (t - 21 >= 0 && t - 21 < 22) this.estela = 1;
    if (t - 31 >= 0 && t - 31 < 12) r = this.Atacar(2);
    this.pego(r, 53);
    const s = this.snakeMM();
    if (f - 7 >= 0 && f - 7 < 19) {
      this.c.step[0] = idiv(s[0] - this.pos0[0], 18);
      this.c.step[2] = idiv(s[2] - this.pos0[2], 18);
    } else {
      if (f !== 26) this.hacerBlanco();
      this.c.step[0] = this.c.step[2] = 0;
    }
    this.c.mov[1] = this.height + (this.c.levels[0] || 0);
  }
  E19_Tajo5(t) {
    let r = 0;
    if (t === 0) this.empezarAtaque(17);
    if (this.Reaccion()) return;
    if (t === 16) this.seM(56);
    if (t - 18 >= 0 && t - 18 < 5) {
      this.estela = 1;
      r = this.Atacar(0);
    }
    this.pego(r, 52);
    if (this.isEnd) {
      this.terminarAtaque();
      return;
    }
    this.hacerBlanco();
  }
  E20_Disparos(t) {
    if (t === 0) this.accionMotion(33);
    this.estela = 1;
    if (t < 150) {
      const p = this.puntoHueso(4), dir = new THREE.Vector3(Math.sin(this.c.rot[1] * ANG), 0, Math.cos(this.c.rot[1] * ANG));
      this.mgr.balas.nueva(new THREE.Vector3(p.x * 1e3, p.y * 1e3, p.z * 1e3), dir, 0, 50, {
        vel: 750,
        largo: 1e4
      });
      this.seM(73);
    }
    if (this.Reaccion()) return;
    if (t >= 181) {
      this.fin_accion = 1;
      this.ejecutor(this.E_Quieto);
      return;
    }
    this.hacerBlanco();
    this.c.step[0] = this.c.step[2] = 0;
    this.c.rot[1] = this.c.rot[1] + 128 & 4095;
    this.c.turn[1] = this.c.turn[1] + 128 & 4095;
  }
  R_Trompada(t) {
    this.estela = 1;
    if (this.Reaccion()) {
      this.combo++;
      return;
    }
    if (t === 0) {
      this.vida -= this.d_puno;
      this.log("trompada", {
        vida: this.vida,
        combo: this.combo
      });
      this.accionMotion(18);
      this.seM(137);
      if (this.tgt.a_mode !== 1) this.seM(52);
      this.c.rot[1] = this.dir_snake;
      this.c.turn[1] = this.dir_snake;
      const a = randU(16);
      this.vfx.arco(a, a + 2 < 16 ? a + 2 : a - 14, 4);
    }
    if (this.isEnd) {
      this.fin_accion = 1;
      this.parpadeo = 30;
      this.combo = 0;
      this.ejecutor(this.E_Quieto);
    }
    if (this.combo < 2 && t < 10) this.hacerBlanco();
  }
  R_Patada(t) {
    if (t === 0) {
      this.slot = 19;
      this.vida -= this.d_patada;
      this.log("patada", {
        vida: this.vida
      });
      this.accionMotion(19);
      this.seM(138);
      this.seM(52);
      this.c.rot[1] = this.dir_snake;
      this.c.turn[1] = this.dir_snake;
    }
    if (this.isEnd) {
      this.fin_accion = 1;
      this.parpadeo = 30;
      this.combo = 0;
      this.ejecutor(this.E_Quieto);
    }
  }
  R_Lanzado(t) {
    if (t === 0) this.accionMotion(21);
    this.estela = 1;
    if (t === 30) this.seM(181);
    if (t === 36) this.seM(182);
    if (t === 60) {
      this.seM(188);
      this.vfx.remolino(200, 100);
    }
    if (this.isEnd) {
      this.ejecutor(this.E_Quieto);
      this.fin_accion = 1;
    }
  }
  R_Lanzado2(t) {
    if (t === 0) this.accionMotion(22);
    if (t === 24) this.seM(51);
    if (t === 30) this.accionMotion(38);
    if (t === 60) this.accionMotion(39);
    if (t >= 61 && this.isEnd) {
      this.ejecutor(this.E_Quieto);
      this.fin_accion = 1;
    }
  }
  R_Desviar(t) {
    this.hacerBlanco();
    this.estela = 1;
    this.katana_vis = 2;
    this.flags &= ~2;
    if (t === 0) {
      this.seM(189);
      this.vfx.chispa(4);
      this.log("desvía");
      if (this.gvTime() & 1) {
        this.slot = 23;
        this.motor.accion(T[23], 0);
      } else {
        this.slot = 24;
        this.motor.accion(T[24], 0);
      }
    }
    const s = this.slot;
    if (this.tgt.damaged & 4) {
      this.tgt.damaged = 0;
      this.seM(this.tgt.a_mode === 1 ? 189 : 180);
      this.vfx.chispa(4);
      this.log("desvía otra");
      const sig = s === 23 ? 24 : s === 24 ? 25 : 23;
      this.slot = sig;
      this.motor.accion(T[sig], 0);
    }
    if (this.isEnd) {
      this.fin_accion = 1;
      this.apilar(3);
      this.ejecutor(this.E_Quieto);
      this.seM(80);
    }
    this.c.rot[1] = this.dir_snake;
    this.c.turn[1] = this.dir_snake;
  }
  Atacar(tipo) {
    if (this.es_clon) return 0;
    let tam = TAM_ATK, pto = PTO_B, daño = 5;
    if (tipo === 5) tam = TAM_ELE; else if (tipo === 6) {
      const lv = this.nivel(), s = lv === 1 ? 1500 : lv > 0 && lv < 4 ? 2e3 : 1e3;
      tam = [ s, 2e3, s ];
    }
    if (tipo === 0) {
      daño = this.d_tajo;
      pto = PTO_A;
    } else if (tipo === 1) {
      daño = this.d_tajo;
      pto = PTO_B;
    } else if (tipo === 2) {
      daño = this.d_salto;
      pto = PTO_C;
    } else if (tipo === 3) {
      daño = this.d_golpe;
      pto = PTO_A;
    } else if (tipo === 4) {
      daño = this.d_golpe;
      pto = PTO_B;
    } else if (tipo === 5 || tipo === 6) {
      daño = this.d_ele;
      pto = PTO_0;
    }
    const c = putVec(this.c.mov, this.c.rot[1], pto);
    this.atk = {
      c: c,
      tam: tam,
      tipo: tipo,
      f: this.mgr.frame
    };
    if (this.J.muerto || this.snakeCaido > 0 || this.gameOverTimer() !== 0 || this.J.ctx.vuelo?.()) return 0;
    const s = this.snakeMM(), post = this.J.postura?.() ?? 0, hy = [ 700, 500, 500 ][post];
    if (Math.abs(c[0] - s[0]) >= tam[0] + 300 || Math.abs(c[2] - s[2]) >= tam[2] + 300 || Math.abs(c[1] - s[1]) >= tam[1] + hy) return 0;
    return this.dañarSnake(daño, tipo, c) ? daño : 0;
  }
  "dañarSnake"(n, tipo, centro) {
    const J = this.J, inv = this.inv();
    if (J.muerto) return 0;
    const f = rotY(this.c.rot[1], {
      x: FUERZA_ATK[0],
      y: 0,
      z: FUERZA_ATK[2]
    });
    if (typeof J.dañoSnake === "function") {
      if (!J.dañoSnake(n, 2, {
        x: f.x,
        z: f.z
      }, centro ? aV3(centro) : null)) return 0;
    } else {
      J.vida -= n / (inv?.vidaMax || 256);
      J.ctx.daño?.();
      this.snakeCaido = 45;
      this.mgr.congelar(true);
      const L = Math.hypot(f.x, f.z) || 1;
      this.vfx.empujon(f.x / L, f.z / L);
    }
    this.log("daño a Snake", {
      n: n,
      tipo: tipo,
      vida: Math.round(J.vida * (inv?.vidaMax || 256))
    });
    return 1;
  }
}

Ninja.prototype.PILA = [ function P0_Fogonazo() {
  this.vfx.chispa(4, 16772744);
  this.mgr.se(73, aV3(this.c.mov), null);
  this.desapilar(0);
}, function P1_Pasos() {
  const s = this.slot, f = this.frameM;
  if (s === 3) {
    if (f === 27) this.seM(186); else if (f === 13) this.seM(185);
  } else if (s === 1 || s === 2) {
    if (f === 9) this.seM(186); else if (f === 18) this.seM(185);
  } else if (s === 4) {
    if (f === 22 || f === 74 || f === 120) this.seM(186); else if (f === 44 || f === 90 || f === 142) this.seM(185);
  }
}, function P2_Sombra() {}, function P3_Destello() {
  if (!(this.g.c3438 & 1)) this.vfx.chispa(6, 16777215, .5);
  if (this.g.c3438 >= 8) {
    this.g.c3438 = 0;
    this.desapilar(3);
  }
  this.g.c3438++;
}, function P4_SinKatana() {
  if (this.g.c343C === 8) {
    this.g.c343C = 0;
    this.desapilar(4);
    this.sin_katana = 1;
  }
  this.g.c343C++;
}, function P5_ConKatana() {
  this.katana_vis = 1;
  this.desapilar(4);
} ];

Object.defineProperty(Ninja.prototype, "EJ", {
  get() {
    if (!this._EJ) {
      const p = Ninja.prototype;
      this._EJ = {
        1: p.E01_SaltoAdelante,
        2: p.E02_SaltoLado,
        3: p.E03_SaltoLado2,
        4: p.E04_SaltoAtras,
        5: p.E05_SaltoAlto,
        6: p.E06_SaltoCorto,
        7: p.E07_Mirar,
        8: p.E08_Guardia,
        9: p.E09_Guardia2,
        10: p.E10_Envainar,
        12: p.E12_Tajo1,
        13: p.E13_Tajo2,
        14: p.E14_Golpes,
        15: p.E15_Golpes2,
        16: p.E16_Tajo3,
        17: p.E17_Tajo4,
        18: p.E18_SaltoAtaque,
        19: p.E19_Tajo5,
        20: p.E20_Disparos,
        21: p.E21_Pose,
        22: p.E22_Pose2,
        23: p.E23_Electrico,
        24: p.E24_Electrico2,
        25: p.E25_Grito,
        26: p.E26_Chaff,
        27: p.E27_Chaff2,
        28: p.E28_Descarga,
        29: p.E29_Descarga2,
        30: p.E30_Carga
      };
    }
    return this._EJ;
  }
});

const D = Ninja.prototype;

D.SiguientePunto = function() {
  const r = this.rutas[this.ruta_i];
  let i = this.punto_i + 1;
  if (i >= r.n) i = 0;
  this.punto_i = i;
  this.dest = cop(r.p[i]);
  this.dest_addr = this.addr(this.dest, -1);
};

D.PuntoAlAzar = function() {
  const g = this.gvTime();
  this.ruta_i = g % this.n_rutas;
  const r = this.rutas[this.ruta_i];
  this.punto_i = g % r.n;
  this.dest = cop(r.p[this.punto_i]);
  this.dest_addr = this.addr(this.dest, -1);
};

D.DestSnake = function() {
  const s = this.snakeMM();
  this.dest = [ s[0], s[1], s[2], 0 ];
  this.dest_addr = this.snakeAddr;
};

D.GuardarDest = function() {
  this.save = cop(this.dest);
  this.save_addr = this.dest_addr;
  this.dest = cop(this.wp);
  this.dest_addr = this.wp_addr;
};

D.RestaurarDest = function() {
  this.dest = cop(this.save);
  this.dest_addr = this.save_addr;
};

D.DestArriba = function() {
  this.dest = cop(DEST_ARRIBA);
  this.dest_addr = ADDR_ARRIBA;
};

D.DestFinal = function() {
  this.dest = cop(DEST_FINAL);
  this.dest_addr = ADDR_FINAL;
};

D.distSnake3 = function(p) {
  const s = this.snakeMM();
  return Math.trunc(Math.hypot(p[0] - s[0], p[1] - s[1], p[2] - s[2]));
};

D.ponerDest = function(p) {
  this.dest = cop(p);
  this.dest_addr = this.addr(this.dest, -1);
};

D.DestTabla6 = function() {
  let i = this.gvTime() % 6;
  if (this.distSnake3(TABLA6[i]) < 3e3) {
    i++;
    if (i >= 6) i = 0;
  }
  this.ponerDest(TABLA6[i]);
};

D.DestTabla4 = function() {
  let i = this.gvTime() % 4 + this.es_clon;
  if (i >= 4) i -= 4;
  this.ponerDest(TABLA4[i]);
};

D.DestTabla6b = function() {
  let i = this.gvTime() % 4;
  if (this.distSnake3(TABLA6B[i]) < 3e3) {
    i++;
    if (i >= 6) i = 0;
  }
  this.ponerDest(TABLA6B[i]);
};

D.DestLejos = function() {
  this.ponerDest(this.distSnake3(TABLA6B[2]) >= this.distSnake3(TABLA6B[3]) ? TABLA6B[2] : TABLA6B[3]);
};

D.rotSnake = function() {
  if (this.ctx.rotSnake) return this.ctx.rotSnake() & 4095;
  const r = this.J.ctx.rig;
  if (!r) return 0;
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(r.getWorldQuaternion(new THREE.Quaternion));
  return ratan2(f.x, f.z) & 4095;
};

D.DestDetras = function() {
  const s = this.snakeMM(), q = Math.trunc(s16(this.rotSnake()) / 512);
  let k = this.gvTime() % 4;
  if (k > 0) k = k < 3 ? q + 3 >> 1 : q + 5 >> 1;
  if (k >= 4) k -= 4;
  if (k < 0) k += 4;
  for (let n = 0; n < 4; n++) {
    const d = [ s[0], s[1], s[2], 0 ];
    if (k & 1) d[0] = s[0] - (2e3 * (k >> 1) - 1e3); else d[2] = s[2] - (2e3 * (k >> 1) - 1e3);
    if (!this.hazard(s, d)) {
      this.dest = d;
      this.dest_addr = this.addr(d, -1);
      return;
    }
    k++;
    if (k >= 4) k = 0;
  }
  this.dest = [ ...this.c.mov, 0 ];
  this.dest_addr = this.addr(this.dest, -1);
};

D.DestSalto = function() {
  const m = this.c.mov;
  let k = this.gvTime() % 4;
  for (let n = 0; n < 4; n++) {
    const d = [ m[0], 0, m[2], 0 ], ej = k & 1 ? 0 : 2, sg = k >> 1 ? -1 : 1;
    d[ej] = m[ej] + sg * 3e3;
    if (!this.hazard([ m[0], m[1], m[2] ], [ d[0], m[1], d[2] ])) {
      d[ej] = m[ej] + sg * 2800;
      this.dest = d;
      this.dest_addr = this.addr(d, -1);
      return k;
    }
    k++;
    if (k >= 4) k = 0;
  }
  this.dest = [ ...m, 0 ];
  this.dest_addr = this.addr(this.dest, -1);
  return k;
};

D.AccionSalto = function(k) {
  const q = Math.trunc(s16(this.c.rot[1]) / 1024), base = q * 1024 & 4095;
  this.c.turn[1] = base;
  let a = k + 4 - q;
  while (a >= 4) a -= 4;
  while (a < 0) a += 4;
  if (a === 0) {
    this.dir_salto = base;
    this.accion = 1;
  } else if (a === 1) this.accion = 2; else if (a === 2) this.accion = 4; else this.accion = 3;
};

D.DestFase6 = function() {
  const v = this.cnt + 2;
  this.cnt++;
  let i;
  if (v % 6 === 0) i = v / 6 - 1; else i = (this.gvTime() + this.snakeMM()[1]) % 5;
  this.ponerDest(TABLA_F6[Math.max(0, Math.min(4, i))]);
  return this.cnt % 6 === 0 ? 1 : 0;
};

D.DestRuta = function() {
  const i = Math.min(2, this.cnt++);
  this.ponerDest(FINAL3[i]);
};

D.Huir = function(snakeAddr) {
  if (!this.J.zonas?.length) return -1;
  const z1 = this.addr(this.dest, -1) & 255, z2 = snakeAddr & 255;
  if (z1 >= this.J.zonas.length || z2 >= this.J.zonas.length) return -1;
  const f = this.farZone(z1, z2), r = this.getRoute(z1, z2);
  if (f.rout < r) return -1;
  this.dest = this.zonaCentro(f.z);
  this.dest_addr = f.z | f.z << 8;
  this.save = cop(this.dest);
  this.save_addr = this.dest_addr;
  return f.rout;
};

D.DestZona = function() {
  const z = this.addr(this.c.mov, -1) & 255, s = this.snakeAddr & 255;
  let a = 4;
  if (z === 40) a = s === 25 || s === 29 || s === 37 ? 68 : 20; else if (z === 4) a = s === 11 || s === 12 ? 40 : 20; else if (z === 20) a = s === 16 ? 40 : 4; else if (z === 63) a = s === 15 ? 68 : 20; else if (z === 68) a = s === 60 ? 63 : 4;
  this.dest = this.zonaCentro(a);
  this.dest_addr = a | a << 8;
  this.save = cop(this.dest);
  this.save_addr = this.dest_addr;
};

D.Navegar = function() {
  const destAddr = this.dest_addr;
  const own = this.addr(this.c.mov, this.nav_addr);
  this.nav_addr = own;
  const r = this.reach(own, this.wp_addr);
  if (!(destAddr === this.nav_dest_addr && r > 0)) {
    this.nav_dest_addr = destAddr;
    if (this.reach(own, destAddr) < 2) {
      this.wp = cop(this.dest);
      this.wp_addr = destAddr;
      this.dir_obj = vecDir2(sub3(this.wp, this.c.mov));
      return -1;
    }
    const z = this.navegarZona(own, destAddr, this.c.mov);
    this.wp = this.zonaCentro(z);
    this.wp_addr = z & 255 | (z & 255) << 8;
  }
  return vecDir2(sub3(this.wp, this.c.mov));
};

D.NavegarA = function() {
  if ((this.t & 31) === 0) {
    this.nav_addr = -1;
    this.nav_dest_addr = -1;
    this.Navegar();
  }
  const r = this.Navegar();
  this.dir_obj = r;
  return r < 0 ? 1 : 0;
};

D.MirarDest = function(r) {
  const dx = this.dest[0] - this.c.mov[0], dz = this.dest[2] - this.c.mov[2];
  if (dx > -r && dx < r && dz > -r && dz < r) return 1;
  this.dir_obj = vecDir2([ dx, 0, dz ]);
  return 0;
};

D.ParSaltable = function(a, b) {
  if (a > b) [a, b] = [ b, a ];
  return PARES_SALTO.some(p => p[0] === a && p[1] === b) ? 1 : 0;
};

D.IndicePunto = function(ruta, punto) {
  let s = 0;
  for (let i = 0; i < ruta; i++) s += this.rutas[i].n;
  return s + punto;
};

D.RutaDeIndice = function(v) {
  let cur = v, n = -1;
  while (cur >= 0 && n + 1 < this.rutas.length) {
    v = cur;
    n++;
    cur = v - this.rutas[n].n;
  }
  this.ruta_i = Math.max(0, n);
  this.punto_i = Math.max(0, Math.min(v, this.rutas[this.ruta_i].n - 1));
};

D.ElegirRuta = function() {
  const flat = this.IndicePunto(this.ruta_i, this.punto_i);
  const e = TABLA_RUTAS.find(x => x[0] === flat);
  if (!e) return;
  const alt = e[1 + (this.gvTime() + randU(8)) % 2];
  this.RutaDeIndice(alt);
  this.dest = cop(this.rutas[this.ruta_i].p[this.punto_i]);
};

D.CmdPunto = function() {
  return this.dest[3] & 31;
};

D.ElegirAtaque = function() {
  const d = this.dist_snake;
  if (d < 1e3 && difAbs(this.c.rot[1], this.dir_snake) < 1024) {
    if (this.hazard(this.snakeMM(), this.c.mov)) return 0;
    return this.gvTime() & 1 ? 13 : 16;
  }
  if (d >= 2e3) return 0;
  if (difAbs(this.c.rot[1], this.dir_snake) >= 512) return 0;
  return this.hazard(this.snakeMM(), this.c.mov) ? 18 : 12;
};

D.chaffAModo9 = function() {
  if (this.estado - 3 >= 0 && this.estado - 3 < 2) return 0;
  if (!this.chaff()) return 0;
  this.modo = 9;
  this.estado = 29;
  this.log("chaff");
  return 1;
};

D.Golpeado0 = function() {
  const g = this.golpe;
  if (g === 0) return this.chaffAModo9();
  if (g === 2) {
    this.DestTabla6b();
    this.modo = 7;
    this.estado = 5;
    this.ultimo_golpe = 2;
  } else if (g === 1) {
    this.modo = 7;
    this.estado = 23;
    this.ultimo_golpe = 1;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.ultimo_golpe = 3;
  }
  return 1;
};

D.Golpeado1 = function() {
  const g = this.golpe;
  if (g === 0) return this.chaffAModo9();
  if (g === 1) {
    this.modo = 7;
    this.estado = 23;
    this.ultimo_golpe = 1;
  } else if (g === 2) {
    this.PuntoAlAzar();
    this.modo = 7;
    this.estado = 5;
    this.ultimo_golpe = 2;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.ultimo_golpe = 3;
  } else if (g === 6) {
    this.modo = 7;
    this.estado = 34;
    this.ultimo_golpe = 6;
  }
  return 1;
};

D.Golpeado2 = function() {
  const g = this.golpe;
  if (g === 0) return this.chaffAModo9();
  if (g === 1) {
    this.modo = 7;
    this.estado = 23;
    this.ultimo_golpe = 1;
  } else if (g === 2) {
    this.modo = 4;
    this.estado = 10;
    this.ultimo_golpe = 2;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.ultimo_golpe = 3;
  } else if (g === 6) {
    this.modo = 7;
    this.estado = 34;
    this.ultimo_golpe = 6;
  }
  return 1;
};

D.Golpeado3 = function() {
  const g = this.golpe;
  if (g === 0) return this.chaffAModo9();
  if (g === 1) {
    this.g.c3448 = 0;
    this.modo = 7;
    this.estado = 23;
  } else if (g === 2) {
    this.g.c3448 = 0;
    this.DestLejos();
    this.modo = 7;
    this.estado = 5;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.g.c3448++;
  } else if (g === 6) {
    this.modo = 7;
    this.estado = 34;
  }
  return 1;
};

D.Golpeado7 = function() {
  const g = this.golpe;
  if (g === 2) {
    this.g.c3448 = 0;
    this.DestLejos();
    this.modo = 7;
    this.estado = 23;
  } else if (g === 1) {
    this.g.c3448 = 0;
    this.modo = 7;
    this.estado = 23;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.g.c3448++;
  }
};

D.reset0 = function() {
  this.t = 0;
  this.t_modo = 0;
  this.andar = 1;
};

D.voz_ = function(i) {
  this.Voz(this.voz[i] | 0);
};

D.vozSi = function(i) {
  if (this.puedeHablar()) this.voxStream(this.voz[i] | 0);
};

D.escenaOn = function(cam) {
  if (this.puedeHablar()) {
    this.sinControl(true);
    this.CamModo(cam);
  }
};

D.escenaOff = function(cam) {
  this.CamModo(cam);
  this.sinControl(false);
  this.CineCerrar();
};

D.desequipar = function() {
  const inv = this.inv();
  if (!inv) return;
  if (inv.item >= 0 && TIPO_ITEM[inv.item] & 2) inv.item = -1;
  if (inv.arma >= 0 && TIPO_ARMA[inv.arma] & 512) inv.arma = -1;
};

D.A_Entrada = function() {
  const s = this.t;
  if (s === 0) {
    Object.assign(this.g, {
      c3440: 0,
      c3444: 0,
      c3448: 0,
      c344C: 0,
      c3450: 0
    });
    this.CineAbrir();
    this.sinControl(true);
    this.voxStream(this.voz[0]);
    this.CamModo(0);
    this.dir_obj = this.dir_snake;
    this.log("entrada");
  }
  if (s >= 11 && this.streamStatus() === -1) {
    this.CamModo(2);
    this.CineCerrar();
    this.ruta_i = 0;
    this.punto_i = -1;
    this.t_modo = 0;
    this.sinControl(false);
    this.DestZona();
    this.fase = 3;
    this.modo = 0;
    this.estado = 24;
    this.t_modo = 0;
    this.t = 0;
    this.log("empieza la pelea");
    return;
  }
  if (s < 80) {
    this.accion = 9;
    this.dir_obj = this.dir_snake;
  } else if (s === 80) this.accion = 21; else if (s >= 207) this.accion = 9;
  this.t++;
};

D.A_Entrada2 = function() {
  if (this.t === 0) {
    this.voxStream(this.voz[1]);
    this.dir_obj = this.dir_snake;
  }
  if (this.t >= 11 && this.streamStatus() === -1) {
    this.ruta_i = 0;
    this.punto_i = -1;
    this.t_modo = 0;
    this.sinControl(false);
    this.DestZona();
    this.fase = 1;
    this.modo = 0;
    this.estado = 23;
    this.t_modo = 0;
    this.t = 0;
    return;
  }
  this.accion = 7;
  this.t++;
};

D.A_Clones = function() {
  if (this.t === 5) this.clon2 = 0; else if (this.t === 4) this.clon1 = 0;
  if (this.t >= 6) this.flags |= 4; else this.dir_obj = this.dir_snake;
  if (this.t >= 21) return 1;
  this.accion = 7;
  this.t++;
  return 0;
};

D.A_Fase6Inicio = function() {
  const v = ++this.t;
  if (v === 1) {
    this.accion = 25;
    return 0;
  }
  if (v >= 71) this.accion = 28;
  return this.t >= 161 ? 1 : 0;
};

D.A_FinalInicio = function() {
  const n = ++this.t;
  if (n === 1) {
    this.fin_pelea = 1;
    this.accion = 25;
    if (this.proc_b >= 0 && !this.mgr.correrProc(this.proc_b)) this.ctx.musica?.(16777216 | 3);
    this.log("fase final");
    return 0;
  }
  if (n === 60) this.voz_(18);
  if (this.t === 70) {
    this.esfera = 1;
    this.vfx.esferaCrear();
  }
  if (this.t >= 71) this.accion = 28;
  if (this.t >= 161 && this.streamStatus() === -1) {
    this.esfera = 3;
    return 1;
  }
  return 0;
};

D.A_ClonLado = function() {
  if (this.t < 10) {
    const v = dirVec2(this.c.rot[1] + (this.es_clon === 1 ? 1024 : -1024) & 4095, 100);
    this.c.mov[0] += v[0];
    this.c.mov[2] += v[2];
  }
  if (this.g.e4340 === 1) return 1;
  this.accion = 7;
  this.t++;
  return 0;
};

D.A_IrPunto = function() {
  this.t++;
  return this.MirarDest(500);
};

D.A_SaltarA = function() {
  this.MirarDest(100);
  if (this.t === 0) {
    this.accion = 1;
    this.t++;
    return 0;
  }
  if (++this.t >= 301) return 1;
  return this.fin_accion;
};

D.A_SaltarLejos = function() {
  if (this.t === 0) {
    this.dir_salto = -1;
    this.AccionSalto(this.DestSalto());
    this.t++;
    return 0;
  }
  if (this.t === 1) this.dir_obj = this.dir_salto;
  if (++this.t >= 301) return 1;
  return this.fin_accion;
};

D.A_SaltoAlto = function() {
  if (this.t === 0) this.accion = 5;
  if (this.t >= 61 && this.isEnd) return 1;
  this.t++;
  return 0;
};

D.A_SaltoCorto = function() {
  if (this.t === 0) this.accion = 6;
  if (this.t >= 61) return 1;
  if (this.isEnd) return 1;
  this.t++;
  return 0;
};

D.A_Detras = function() {
  if (this.t < 12) this.accion = 7;
  if (this.t - 7 >= 0 && this.t - 7 < 9) this.flags |= 2;
  if (this.t === 10) {
    this.DestDetras();
    this.c.mov = [ this.dest[0], this.dest[1], this.dest[2] ];
    this.log("aparece al lado de Snake", {
      dest: cop(this.dest)
    });
  } else if (this.t === 11) {
    this.c.rot[1] = this.dir_snake;
    this.c.turn[1] = this.dir_snake;
  }
  const lv = this.nivel(), umbral = lv === 1 ? 15 : lv <= 0 || lv >= 4 ? 20 : 15;
  if (umbral < this.t) {
    if (this.cnt_golpes !== 0) {
      this.estado = 32;
      this.cnt_golpes = 0;
      this.t = 0;
      return;
    }
    this.estado = this.status() & 4192 ? 19 : 20;
    if (lv <= 0) this.cnt_golpes = 0; else if (this.vida < 41) this.cnt_golpes = this.gvTime() % 2;
    this.t = 0;
  }
  this.t++;
};

D.A_SaltoCerca = function() {
  if (this.t === 0) {
    this.DestDetras();
    this.accion = 6;
  }
  if (this.t >= 31 && this.isEnd) return 1;
  this.t++;
  return 0;
};

D.A_SaltoEscena = function() {
  if (this.t === 0) this.accion = 5;
  if (this.t === 30) {
    this.desequipar();
    this.escenaOn(5);
    this.CineAbrir();
  }
  if (this.isEnd) return 1;
  this.t++;
  return 0;
};

D.A_SaltoTabla6b = function() {
  if (this.t === 0) {
    this.DestTabla6b();
    this.accion = 5;
  }
  if (this.t >= 61 && this.isEnd) return 1;
  this.t++;
  return 0;
};

D.A_SaltoAzar = function() {
  if (this.t === 0) this.PuntoAlAzar();
  this.MirarDest(100);
  if (this.t === 0) {
    this.accion = 1;
    this.t++;
    return 0;
  }
  const r = this.isEnd;
  this.t++;
  return r;
};

D.A_Esperar120 = function() {
  if (this.t >= 121) return 1;
  return this.fin_accion;
};

D.A_Grito = function() {
  const v = ++this.t;
  if (v === 1) {
    this.accion = 25;
    return 0;
  }
  if (v >= 301) return 1;
  return this.fin_accion;
};

D.A_ChaffVoz = function() {
  if (this.golpe !== 0) {
    this.streamStop();
    this.estado = 23;
    return 1;
  }
  if (this.chafLife() < 90) {
    this.streamStop();
    this.estado = 28;
    return 1;
  }
  if (this.t === 0) this.voz_(17);
  this.accion = 26;
  this.t++;
  return 0;
};

D.A_ChaffEspera = function() {
  if (!this.chaff()) return 1;
  this.accion = 27;
  this.t++;
  return 0;
};

D.A_Explota = function() {
  const s = ++this.t;
  if (s === 1) {
    this.accion = 25;
    return 0;
  }
  if (s === 50) this.vfx.estallido(4);
  if (s === 60) this.vfx.estallido(7);
  if (s === 65) this.vfx.estallido(12);
  if (s === 69) this.vfx.estallido(1);
  return this.t >= 301 ? 1 : this.fin_accion;
};

D.A_Pose22 = function() {
  this.accion = 22;
  this.t++;
  return this.t >= 31 ? 1 : 0;
};

D.A_VozGolpe = function() {
  if (this.t === 0 && this.streamStatus() === -1) {
    const i = this.g.c344C, tabla = [ 7, 8, 9, 4, 12, 7, 8 ];
    const s = i >= 0 && i < 7 ? tabla[i] : 7;
    if (this.puedeHablar()) this.voxStream(this.voz[s]);
    this.g.c344C++;
    if (this.g.c344C >= 6) this.g.c344C = 4;
    this.t++;
    return 0;
  }
  if (this.t >= 61 && this.streamStatus() === -1) return 1;
  this.t++;
  return 0;
};

D.A_Contar = function() {
  return this.t++;
};

D.A_Reaccion = function() {
  if (this.t === 0) {
    this.streamStop();
    this.t++;
    return 0;
  }
  const n = ++this.t;
  if (n >= 301) return 1;
  if (n >= 121 && this.slot === 0) return 1;
  return this.fin_accion;
};

D.A_NavSnake = function() {
  this.DestSnake();
  const r = this.NavegarA();
  const a = this.nav_addr & 255, b = this.wp_addr & 255;
  this.t++;
  return this.ParSaltable(a, b) ? 2 : r;
};

D.A_AcercarSnake = function() {
  this.DestSnake();
  if (this.t & 16) {
    this.nav_addr = this.addr(this.c.mov, -1);
    if (this.reach(this.nav_addr, this.dest_addr) >= 2) return 1;
  }
  this.dir_obj = this.dir_snake;
  this.t++;
  return 0;
};

D.A_Nav = function() {
  const r = this.NavegarA();
  const a = this.nav_addr & 255, b = this.wp_addr & 255;
  this.t++;
  return this.ParSaltable(a, b) ? 2 : r;
};

D.A_Directo = function() {
  const v = sub3(this.dest, this.c.mov);
  v[1] = 0;
  this.dir_obj = vecDir2(v);
  if (Math.hypot(v[0], v[2]) < 300) return 1;
  this.t++;
  return 0;
};

D.A_NavHuir = function() {
  const r = this.NavegarA();
  this.t++;
  if (this.ParSaltable(this.nav_addr & 255, this.wp_addr & 255)) return 2;
  if (r === 0) return 0;
  const v = this.Huir(this.snakeAddr);
  return v < 0 || v >= 3 ? 1 : 0;
};

D.A_SaltoTabla6 = function() {
  if (this.t === 0) {
    this.DestTabla6();
    this.accion = 5;
  }
  if (this.t >= 11) this.flags |= 2;
  if (this.t >= 61) return 1;
  this.t++;
  return 0;
};

D.A_EsperarCamuflado = function() {
  if (this.t === 0) {
    this.dir_obj = this.dir_snake;
    this.g.c3450++;
  }
  this.flags |= 2;
  const lv = this.nivel(), u = lv === 1 ? 150 : lv <= 0 || lv >= 4 ? 450 : 90;
  if (u < this.t) return 1;
  this.t++;
  return 0;
};

D.A_Mirar2000 = function() {
  this.accion = 8;
  this.dir_obj = this.dir_snake;
  if (this.dist_snake < 2e3) return 1;
  this.t++;
  return 0;
};

D.A_Guardia = function() {
  this.accion = 8;
  this.dir_obj = this.dir_snake;
  if (this.t === 0) this.cnt_golpes++;
  const lv = this.nivel(), u = lv === 1 ? 15 : lv <= 0 || lv >= 4 ? 60 : 1;
  if (u < this.t) {
    this.modo = 3;
    this.estado = 8;
    this.t = 0;
  } else this.t++;
};

D.A_Accion7 = function() {
  this.accion = 7;
  if (this.t >= 11) {
    this.estado = 5;
    this.t = 0;
  } else this.t++;
};

D.guardiaCerca = function(d) {
  if (d < 1e3 && (!(this.status() & 4192) || (this.gvTime() & 3) === 0)) this.cnt++;
  return d < 500 || this.cnt >= 16;
};

D.A_Guardia1 = function() {
  this.dir_obj = this.dir_snake;
  const d = this.dist_snake;
  if (this.t === 0) {
    this.cnt = 0;
    this.de_balas = 0;
  }
  if (this.arma() !== -1) {
    this.estado = 32;
    this.t = 0;
    this.de_balas = 1;
    return;
  }
  if (this.Golpeado1()) {
    this.t = 0;
    this.t_modo = 0;
    this.andar = 1;
    return;
  }
  if (d >= 4001) {
    this.modo = 2;
    this.estado = 8;
    this.t = 0;
    return;
  }
  if (this.guardiaCerca(d)) {
    this.modo = 6;
    this.estado = 15;
    this.t = 0;
    return;
  }
  const lv = this.nivel(), u = lv === 1 ? 15 : lv <= 0 || lv >= 4 ? 30 : 2;
  if (u < this.t) {
    this.modo = 6;
    this.estado = d < 1e3 ? 15 : 16;
    this.t = 0;
    return;
  }
  this.accion = 9;
  this.t++;
};

D.A_Fase1x20 = function() {
  this.dir_obj = this.dir_snake;
  if (this.Golpeado1()) {
    this.t = 0;
    this.t_modo = 0;
    this.andar = 1;
    return;
  }
  if (this.t === 0) this.vfx.humo(6);
  if (this.t >= 31) {
    this.PuntoAlAzar();
    this.modo = 1;
    this.estado = 26;
    this.t = 0;
  } else {
    this.accion = 9;
    this.t++;
  }
};

D.A_Guardia3 = function() {
  this.dir_obj = this.dir_snake;
  const d = this.dist_snake;
  if (this.t === 0) this.cnt = 0;
  if (this.Golpeado3()) {
    this.t = 0;
    this.t_modo = 0;
    this.andar = 1;
    return;
  }
  if (d >= 3001) {
    this.modo = 3;
    this.estado = 8;
    this.t = 0;
    return;
  }
  if (this.guardiaCerca(d)) {
    this.modo = 6;
    this.estado = 15;
    this.t = 0;
    return;
  }
  if (this.t >= 31) {
    this.modo = 6;
    this.estado = d < 1e3 ? 15 : 16;
    this.t = 0;
    return;
  }
  this.accion = 9;
  this.t++;
};

D.A_Guardia0 = function() {
  this.accion = 8;
  this.dir_obj = this.dir_snake;
  const lv = this.nivel(), u = lv === 1 ? 15 : lv <= 0 || lv >= 4 ? 30 : 5;
  if (u < this.t && !(this.status() & 512)) {
    this.modo = 5;
    this.estado = 24;
    this.t = 0;
    return;
  }
  if (this.t >= 61) {
    this.estado = 19;
    this.t = 0;
    return;
  }
  this.t++;
};

D.A_Accion7b = function() {
  this.accion = 7;
  this.dir_obj = this.dir_snake;
  if (this.t >= 11) return 1;
  this.t++;
  return 0;
};

D.A_EsperarCerca = function() {
  if (this.t === 0) this.dir_obj = this.dir_snake;
  const lv = this.nivel();
  let u = 10;
  if (lv === 1) {
    u = 5;
    this.flags |= 2;
  } else if (lv > 0 && lv < 4) {
    u = 1;
    this.flags |= 2;
  }
  if (u < this.t) return 1;
  this.t++;
  return 0;
};

D.sq = function() {
  return !!(this.status() & 4192);
};

D.A_Ataque13 = function() {
  const lv = this.nivel(), u = lv === 1 ? 4 : lv <= 0 || lv >= 4 ? 10 : 1;
  if (u < this.t) this.accion = this.sq() ? 18 : this.arma() === -1 ? 17 : 12; else this.accion = 7;
  const n = ++this.t;
  if (n >= 301) return 1;
  return n >= 9 ? this.fin_accion : 0;
};

D.ataqueFin = function() {
  if (++this.t === 1) return 0;
  if (this.t >= 301) return 1;
  return this.fin_accion;
};

D.A_Ataque14 = function() {
  this.accion = this.sq() ? 18 : this.arma() === -1 ? 16 : 13;
  return this.ataqueFin();
};

D.A_Ataque15 = function() {
  if (this.t === 0) this.accion = this.sq() ? 18 : 14;
  return this.ataqueFin();
};

D.A_Ataque16 = function() {
  if (this.t === 0) this.accion = this.sq() ? 18 : 15;
  return this.ataqueFin();
};

D.A_Ataque17 = function() {
  this.accion = 16;
  return this.ataqueFin();
};

D.A_Ataque18 = function() {
  this.accion = 17;
  return this.ataqueFin();
};

D.A_Ataque19 = function() {
  this.accion = 18;
  if (this.t === 0) {
    this.t = 1;
    return 0;
  }
  if (++this.t >= 301) return 1;
  return this.fin_accion;
};

D.A_Ataque20 = function() {
  this.accion = 19;
  if (this.t === 0) {
    this.dir_obj = this.dir_snake;
    this.t = 1;
    this.DestSnake();
    return 0;
  }
  if (++this.t >= 301) return 1;
  return this.fin_accion;
};

D.A_Disparar = function() {
  this.accion = 20;
  if (++this.t === 1) return 0;
  if (this.t >= 301) return 1;
  return this.fin_accion;
};

D.A_EsferaOn = function() {
  if (this.t === 0) {
    this.esfera = 1;
    this.vfx.esferaCrear();
  }
  if (this.t >= 31) return 1;
  this.accion = 28;
  this.t++;
  return 0;
};

D.A_Carga = function() {
  const c = this.cnt === 1 ? this.t < 31 : this.cnt === 2 ? this.t < 16 : this.t < 11;
  if (!c) return 1;
  if (this.t === 4 && this.cnt_golpes % 3 === 0) this.voz_(7);
  this.accion = 29;
  this.t++;
  return 0;
};

D.A_Descanso = function() {
  const c = this.cnt === 1 ? this.t < 61 : this.cnt === 2 ? this.t < 46 : this.t < 31;
  if (c) {
    this.accion = 30;
    this.t++;
    return 0;
  }
  return 1;
};

D.A_Voz6 = function() {
  const s = this.t;
  if (s === 0) this.voz_(6);
  if (s === 1) return 1;
  this.accion = 8;
  this.dir_obj = this.dir_snake;
  this.t++;
  return 0;
};

D.A_EscenaVoz3 = function() {
  const s = this.t;
  if (s === 10) this.vozSi(3);
  if (s >= 131 && this.streamStatus() === -1) {
    this.CamModo(2);
    this.sinControl(false);
    this.CineCerrar();
    return 1;
  }
  this.dir_obj = this.dir_snake;
  if (s < 100) this.accion = 8; else if (s === 100) this.accion = 10; else if (s >= 205) this.accion = 8;
  this.t++;
  return 0;
};

D.A_EscenaVoz1 = function() {
  if (this.t === 0) {
    this.voz_(1);
    if (this.proc_w >= 0) this.mgr.correrProc(this.proc_w);
  }
  if (this.t >= 2) return 1;
  this.accion = 8;
  this.dir_obj = this.dir_snake;
  this.t++;
  return 0;
};

D.A_EscenaVoz12 = function() {
  if (this.t === 0) {
    this.desequipar();
    this.escenaOn(7);
  }
  if (this.t === 30) this.voz_(12);
  this.accion = 8;
  this.dir_obj = this.dir_snake;
  if (this.t >= 31 && this.streamStatus() === -1) return 1;
  this.t++;
  return 0;
};

D.A_EscenaVoz14 = function() {
  if (this.t === 0) this.voz_(14);
  this.accion = 9;
  this.dir_obj = this.dir_snake;
  this.flags |= 2;
  if (this.t >= 31 && this.streamStatus() === -1) return 1;
  this.t++;
  return 0;
};

D.A_EscenaSalto = function() {
  this.flags |= 2;
  if (this.t === 0) {
    this.DestTabla6();
    this.accion = 5;
  }
  if (this.t === 30 && this.puedeHablar()) this.CamModo(6);
  if (this.t >= 131 && this.streamStatus() === -1) {
    this.escenaOff(1);
    return 1;
  }
  this.t++;
  return 0;
};

D.A_EscenaVoz5 = function() {
  if (this.t === 0) {
    this.desequipar();
    this.escenaOn(8);
  }
  if (this.t === 30) this.voz_(5);
  if (this.t === 130) this.voz_(10);
  this.dir_obj = this.dir_snake;
  this.accion = this.t >= 131 ? 23 : 24;
  if (this.t >= 231 && this.streamStatus() === -1) {
    this.escenaOff(1);
    return 1;
  }
  this.t++;
  return 0;
};

D.F0M0 = function() {
  if (this.estado === 0) this.A_Entrada(); else if (this.estado === 1) this.A_Entrada2();
};

D.F1M0 = function() {
  if (this.estado === 24) this.A_Guardia1(); else if (this.estado === 7) {
    if (this.A_SaltarLejos()) {
      this.estado = 24;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (this.estado === 32) this.A_Fase1x20();
};

D.F3M0 = function() {
  switch (this.estado) {
   case 0:
    this.modo = 7;
    this.estado = 24;
    this.t_modo = 0;
    this.t = 0;
    break;

   case 24:
    this.A_Guardia3();
    break;

   case 36:
    if (this.A_Voz6()) {
      this.estado = 24;
      this.t = 0;
    }
    if (this.Golpeado3()) {
      this.t = 0;
      this.t_modo = 0;
      this.andar = 1;
    }
    break;

   case 5:
    if (this.A_SaltoCerca()) {
      this.estado = 24;
      this.t = 0;
    }
    break;

   case 7:
    if (this.A_SaltarLejos()) {
      this.estado = 24;
      this.t_modo = 0;
      this.t = 0;
    }
    break;
  }
};

D.F2M0 = function() {
  if (this.estado === 0) {
    this.DestArriba();
    this.estado = 5;
    this.t = 0;
  } else if (this.estado === 5) {
    if (this.A_SaltoCorto()) {
      this.estado = 23;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (this.estado === 23) {
    if (this.A_Contar() >= 151) {
      this.modo = 4;
      this.estado = 10;
      this.t_modo = 0;
      this.t = 0;
    } else this.accion = 22;
  }
};

D.matarClones = function() {
  this.clon1 = 0;
  this.clon2 = 0;
};

D.F4M0 = function() {
  const e = this.estado;
  if (e === 5) {
    if (this.A_SaltoTabla6b()) {
      this.estado = 23;
      this.t = 0;
    }
  } else if (e === 23) {
    const v = this.A_Contar();
    if (v >= 151 || this.dist_snake < 3e3) {
      this.estado = 0;
      this.t = 0;
      return;
    }
    this.accion = 22;
  } else if (e === 0) {
    if (this.A_Clones()) {
      this.g.e4340 = 1;
      this.DestTabla4();
      this.estado = 3;
      this.t = 0;
      return;
    }
  } else if (e === 3) {
    this.flags |= 4;
    if (this.A_SaltoAlto()) {
      this.modo = 2;
      this.estado = 8;
      this.t = 0;
    }
  }
  if (this.golpe !== 0) {
    this.modo = 7;
    this.estado = 31;
    this.matarClones();
    this.t = 0;
    this.t_modo = 0;
  }
};

D.F6M0 = function() {
  if (this.estado === 0 && this.A_Fase6Inicio()) {
    this.modo = 1;
    this.estado = 6;
    this.t = 0;
    this.cnt = 0;
  }
};

D.F7M0 = function() {
  if (this.estado === 0 && this.A_FinalInicio()) {
    this.cnt = 0;
    this.cnt_golpes = 0;
    this.DestRuta();
    this.modo = 1;
    this.estado = 5;
    this.t = 0;
  }
};

D.cercaOLejos = function() {
  if (this.dist_snake < 1200) {
    this.modo = 5;
    this.estado = 5;
  } else {
    this.modo = 3;
    this.estado = 8;
  }
};

D.F0M7 = function() {
  switch (this.estado) {
   case 23:
    if (this.A_Reaccion()) {
      if (this.ultimo_golpe === 1) this.cercaOLejos(); else if (this.vida < 6) {
        this.fase = 7;
        this.modo = 0;
        this.estado = 0;
      } else this.estado = 35;
      this.t = 0;
    }
    break;

   case 28:
    if (this.A_Grito()) {
      this.estado = 35;
      this.t = 0;
    }
    break;

   case 35:
    if (this.A_VozGolpe()) {
      this.cercaOLejos();
      this.t = 0;
    } else this.accion = 22;
    break;

   case 5:
    if (this.A_SaltoCorto()) {
      this.modo = 3;
      this.estado = 8;
      this.t_modo = 0;
      this.t = 0;
    }
    break;
  }
};

D.F0M9 = function() {
  switch (this.estado) {
   case 23:
    this.vulnerable = 1;
    if (this.A_Reaccion()) {
      if (this.vida < 6) {
        this.fase = 7;
        this.modo = 0;
        this.estado = 0;
      } else this.estado = 28;
      this.t = 0;
    }
    break;

   case 29:
    this.vulnerable = 1;
    if (this.A_ChaffVoz()) this.t = 0;
    break;

   case 28:
    if (this.A_ChaffEspera()) {
      this.cercaOLejos();
      this.t_modo = 0;
      this.t = 0;
    }
    break;
  }
};

D.F1M9 = function() {
  switch (this.estado) {
   case 23:
    this.vulnerable = 1;
    if (this.A_Reaccion()) {
      if (this.vida < 6) {
        this.fase = 7;
        this.modo = 0;
        this.estado = 0;
      } else this.estado = 28;
      this.t = 0;
    }
    break;

   case 29:
    this.vulnerable = 1;
    if (this.A_ChaffVoz()) this.t = 0;
    break;

   case 28:
    if (this.A_ChaffEspera()) {
      this.PuntoAlAzar();
      this.modo = 1;
      this.estado = 26;
      this.t_modo = 0;
      this.t = 0;
    }
    break;
  }
};

D.F2M9 = function() {
  switch (this.estado) {
   case 23:
    this.vulnerable = 1;
    if (this.A_Reaccion()) {
      if (this.vida < 6) {
        this.fase = 7;
        this.modo = 0;
        this.estado = 0;
      } else this.estado = 28;
      this.t = 0;
    }
    break;

   case 29:
    this.vulnerable = 1;
    if (this.A_ChaffVoz()) this.t = 0; else this.flags |= 2;
    break;

   case 28:
    if (this.A_ChaffEspera()) {
      this.modo = 4;
      this.estado = 10;
      this.t_modo = 0;
      this.t = 0;
    }
    break;
  }
};

D.F1M7 = function() {
  const e = this.estado;
  let fin = false;
  const aRutas = () => {
    this.PuntoAlAzar();
    this.modo = 1;
    this.estado = 26;
    fin = true;
  };
  if (e === 23) {
    if (!this.A_Reaccion()) return;
    if (this.vida < 6) {
      this.fase = 7;
      this.modo = 0;
      this.estado = 0;
      fin = true;
    } else if (this.chaff()) {
      this.modo = 9;
      this.estado = 28;
      fin = true;
    } else if (this.ultimo_golpe !== 3) aRutas(); else if (this.g.c3448 === 0) {
      this.g.c3448 = 2;
      this.DestLejos();
      this.modo = 8;
      this.estado = 5;
      fin = true;
    } else if (this.vida < 121) {
      this.DestLejos();
      this.fase = 2;
      this.modo = 8;
      this.estado = 5;
      fin = true;
      this.log("fase 2 (camuflado)");
    } else {
      this.cnt_golpes++;
      const lv = this.nivel(), n = lv === 1 ? 3 : lv <= 0 || lv >= 4 ? 4 : 2;
      if (this.cnt_golpes % n === 0) {
        this.modo = 6;
        this.estado = 19;
      } else this.estado = 7;
      fin = true;
    }
  } else if (e === 34) {
    if (!this.A_Reaccion()) return;
    this.estado = 7;
    fin = true;
  } else if (e === 7) {
    if (!this.A_SaltarLejos()) return;
    const d = this.dist_snake;
    if (d < 1e3) {
      this.modo = 6;
      this.estado = 15;
    } else if (d < 5e3) {
      this.modo = 6;
      this.estado = 16;
    } else if (this.de_balas) aRutas(); else {
      this.modo = 0;
      this.estado = 24;
    }
    fin = true;
  } else if (e === 5) {
    if (!this.A_SaltoCorto()) return;
    aRutas();
  }
  if (fin) {
    this.t_modo = 0;
    this.t = 0;
  }
};

D.F2M7 = function() {
  const e = this.estado;
  if (e === 23) {
    if (!this.A_Reaccion()) return;
    if (this.ultimo_golpe === 3) this.cnt_golpes++;
    if (this.vida < 6) {
      this.fase = 7;
      this.modo = 0;
      this.estado = 0;
    } else if (this.cnt_golpes >= 3) {
      this.DestLejos();
      this.modo = 8;
      this.estado = 5;
      this.fase = 0;
      this.log("fase 0 (a mano limpia)");
    } else {
      this.modo = 4;
      this.estado = 10;
    }
    this.t_modo = 0;
    this.t = 0;
  } else if (e === 34) {
    if (this.A_Reaccion()) {
      this.modo = 4;
      this.estado = 10;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (e === 28) {
    if (this.A_Grito()) {
      this.modo = 3;
      this.estado = 8;
      this.fase = 0;
      this.t = 0;
    }
  } else if (e === 25) {
    if (!this.A_SaltoAzar()) return;
    if (this.vida < 91) {
      this.fase = 4;
      this.modo = 0;
      this.estado = 0;
      this.log("fase 4");
    } else {
      this.modo = 1;
      this.estado = 6;
    }
    this.t = 0;
  }
};

D.F3M9 = function() {
  const e = this.estado;
  if (e === 23) {
    this.vulnerable = 1;
    if (this.A_Reaccion()) {
      this.estado = 28;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (e === 29) {
    this.vulnerable = 1;
    if (this.A_ChaffVoz()) {
      this.g.c3448 = 0;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (e === 28) {
    if (this.A_ChaffEspera()) {
      this.modo = 8;
      this.estado = 38;
      this.g.c3448 = 0;
      this.t_modo = 0;
      this.t = 0;
    }
  }
};

D.F3M7 = function() {
  const e = this.estado;
  let fin = false;
  if (e === 23) {
    if (!this.A_Reaccion()) return;
    if (this.chaff()) {
      this.modo = 9;
      this.estado = 28;
    } else if (this.g.c3448 < 2) this.estado = 7; else {
      this.DestLejos();
      this.modo = 8;
      this.estado = 5;
    }
    fin = true;
  } else if (e === 34) {
    if (!this.A_Reaccion()) return;
    this.modo = 0;
    this.estado = 24;
    fin = true;
  } else if (e === 5) {
    if (!this.A_SaltoCorto()) return;
    this.modo = 8;
    this.estado = 38;
    fin = true;
  } else if (e === 7) {
    if (!this.A_SaltarLejos()) return;
    if (this.g.c3448 === 0) {
      this.modo = 8;
      this.estado = 38;
    } else {
      this.modo = 0;
      this.estado = 36;
    }
    fin = true;
  }
  if (fin) {
    this.t_modo = 0;
    this.t = 0;
  }
};

D.F4M7 = function() {
  const e = this.estado;
  if (e === 23) {
    if (this.A_Contar() >= 31) {
      this.modo = 0;
      this.estado = 5;
      this.t = 0;
      return;
    }
    this.accion = 23;
    if (this.golpe !== 0) {
      this.modo = 7;
      this.estado = 25;
      this.t = 0;
      this.t_modo = 0;
    }
  } else if (e === 25) {
    if (!this.A_SaltoAzar()) return;
    if (this.vida < 61) {
      this.modo = 3;
      this.estado = 8;
      this.fase = 0;
      this.log("fase 0 (desde la 4)");
    } else {
      this.estado = 5;
      this.modo = 0;
    }
    this.t_modo = 0;
    this.t = 0;
  } else if (e === 29) {
    if (this.A_Explota()) this.destruirClon();
  } else if (e === 31) {
    if (this.A_Accion7b()) {
      this.modo = 6;
      this.estado = 14;
      this.t = 0;
    }
  }
};

D.F6M7 = function() {
  if (this.estado === 23) {
    if (this.A_Esperar120()) {
      this.estado = 29;
      this.t = 0;
    }
  } else if (this.estado === 29) {
    if (this.A_Explota()) this.destruirClon();
  }
};

D.F7M7 = function() {
  if (this.estado === 23) {
    this.vulnerable = 1;
    if (!this.A_Reaccion()) return;
    if (this.cnt >= 3) {
      this.DestFinal();
      this.estado = 27;
      this.modo = 1;
      this.andar = 3;
      if (this.proc_e >= 0 && this.gameOverTimer() === 0 && this.snakeVive()) this.ganar();
    } else {
      this.DestRuta();
      this.modo = 1;
      this.estado = 5;
    }
    this.t = 0;
  } else if (this.estado === 29) this.A_Pose22();
};

D.F3M8 = function() {
  const e = this.estado;
  if (e === 5) {
    if (this.A_SaltoEscena()) {
      this.estado = 36;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (e === 36) {
    if (this.A_EscenaVoz3()) {
      this.fase = 1;
      this.modo = 2;
      this.estado = 8;
      this.cnt_golpes = 0;
      this.t_modo = 0;
      this.t = 0;
      this.log("fase 1 (a mano limpia)");
    }
  } else if (e === 38) {
    if (this.A_EscenaVoz1()) {
      this.PuntoAlAzar();
      this.fase = 1;
      this.modo = 1;
      this.estado = 26;
      this.de_balas = 1;
      this.cnt_golpes = 0;
      this.t_modo = 0;
      this.t = 0;
      this.log("fase 1 (desvía balas)");
    }
  }
};

D.F2M8 = function() {
  const e = this.estado;
  if (e === 5) {
    if (this.A_SaltoEscena()) {
      this.estado = 36;
      this.t_modo = 0;
      this.t = 0;
      this.cnt_golpes = 0;
    }
  } else if (e === 36) {
    if (this.A_EscenaVoz12()) {
      this.estado = 37;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (e === 37) {
    if (this.A_EscenaVoz14()) {
      this.estado = 38;
      this.t_modo = 0;
      this.t = 0;
    }
  } else if (e === 38) {
    if (this.A_EscenaSalto()) {
      this.modo = 4;
      this.estado = 11;
      this.t_modo = 0;
      this.t = 0;
    }
  }
};

D.F1M8 = function() {
  if (this.estado === 5) {
    if (!this.A_SaltoEscena()) return;
    this.estado = 36;
  } else if (this.estado === 36) {
    if (!this.A_EscenaVoz3()) return;
    this.modo = 2;
    this.estado = 8;
  } else return;
  this.t_modo = 0;
  this.t = 0;
};

D.F0M8 = function() {
  if (this.estado === 5) {
    if (!this.A_SaltoEscena()) return;
    this.estado = 36;
  } else if (this.estado === 36) {
    if (!this.A_EscenaVoz5()) return;
    this.modo = 3;
    this.estado = 8;
    this.cnt_golpes = 0;
  } else return;
  this.t_modo = 0;
  this.t = 0;
};

D.F5M0 = function() {
  if (this.estado === 0) {
    if (!this.A_ClonLado()) return;
    this.DestTabla4();
    this.estado = 5;
  } else if (this.estado === 5) {
    this.flags |= 4;
    if (!this.A_SaltoAlto()) return;
    this.modo = 2;
    this.estado = 8;
  } else return;
  this.t = 0;
};

D.F0M1 = function() {
  const e = this.estado;
  const pon = n => {
    this.estado = n;
    this.t = 0;
  };
  if (e === 26) {
    const v = this.A_Nav();
    if (v === 1) pon(27); else if (v === 2) {
      this.GuardarDest();
      pon(3);
    }
  } else if (e === 27) {
    if (this.A_Directo()) pon(24);
  } else if (e === 24) {
    if (this.A_Mirar2000()) {
      const v = this.Huir(this.snakeAddr);
      if (v >= 0) this.estado = 25; else {
        this.DestTabla6b();
        this.estado = 5;
      }
      this.accion = -1;
      this.t = 0;
    }
  } else if (e === 25) {
    const v = this.A_NavHuir();
    if (v === 1) pon(24); else if (v === 2) {
      this.GuardarDest();
      pon(4);
    }
  } else if (e === 3) {
    if (this.A_SaltarA()) {
      this.RestaurarDest();
      pon(26);
    }
  } else if (e === 4) {
    if (this.A_SaltarA()) pon(24);
  } else if (e === 5) {
    if (this.A_SaltoAlto()) pon(24);
  }
  const g = this.golpe;
  if (g === 2) {
    this.DestTabla6b();
    this.estado = 5;
    this.accion = -1;
    this.t = 0;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.t = 0;
  }
};

D.SiguienteRuta = function() {
  if (this.t_modo >= 151 && this.arma() === -1) {
    this.modo = 2;
    this.estado = 8;
    this.accion = -1;
    this.t_modo = 0;
    this.t = 0;
    return;
  }
  this.ElegirRuta();
  const c = this.CmdPunto();
  if (c === 0) this.estado = 2; else if (c === 1) this.estado = 3; else if (c === 5) this.estado = 5;
  this.SiguientePunto();
  this.MirarDest(500);
  this.t = 0;
};

D.F1M1 = function() {
  const e = this.estado;
  if (e === 26) {
    const v = this.A_Nav();
    if (v === 1) {
      this.estado = 2;
      this.t = 0;
    } else if (v === 2) {
      this.GuardarDest();
      this.estado = 4;
      this.t = 0;
    }
  } else if (e === 4) {
    if (this.A_SaltarA()) {
      this.RestaurarDest();
      this.estado = 26;
      this.t = 0;
    }
  } else if (e === 2) {
    if (this.A_IrPunto()) {
      this.SiguienteRuta();
      const v = ++this.g.c3444;
      if (v === 20) this.voz_(2); else if (v === 40) {
        this.voz_(1);
        this.g.c3444 = 0;
      }
    }
    const tm = this.t_modo;
    if (tm >= 451) {
      this.modo = 5;
      this.estado = 8;
      this.t = 0;
    } else if (tm >= 151 && this.dist_snake < 3e3 && this.visto === 1 && this.arma() !== -1) {
      this.modo = 6;
      this.estado = this.dist_snake < 1500 ? 14 : 13;
      this.t = 0;
    }
  } else if (e === 3) {
    if (this.A_SaltarA()) this.SiguienteRuta();
  }
  if (this.Golpeado1()) {
    const u = this.ultimo_golpe;
    if (u === 3) {
      this.de_balas = 0;
      this.t = 0;
    } else if (u === 1) this.t = 1; else this.t = 0;
    this.accion = -1;
  }
};

D.F2M1 = function() {
  const e = this.estado;
  if (e === 2) {
    if (this.A_IrPunto()) {
      this.estado = 6;
      this.t = 0;
    }
  } else if (e === 3) {
    if (this.A_SaltarA()) {
      this.estado = 6;
      this.t = 0;
    }
  } else if (e === 5) {
    if (this.A_SaltoCorto()) {
      this.estado = 6;
      this.t = 0;
    }
  } else if (e === 6) {
    if (this.t_modo >= 301) {
      this.modo = 4;
      this.estado = 10;
      this.t_modo = 0;
      return;
    }
    const c = this.CmdPunto();
    if (c === 0) this.estado = 2; else if (c === 1) this.estado = 3; else if (c === 5) this.estado = 5;
    this.ElegirRuta();
    this.SiguientePunto();
    this.t = 0;
  }
  if (this.golpe === 3 || this.golpe === 4) {
    this.modo = 7;
    this.estado = 25;
    this.t = 0;
    this.t_modo = 0;
  }
};

D.DestEsquina = function() {
  const s = this.snakeMM(), k = s[0] < -1999 ? s[2] < 2501 ? 3 : 2 : s[2] < 2501 ? 1 : 0;
  this.dest = cop(ESQUINAS[k][0]);
  this.dest_addr = ESQUINAS[k][1];
};

D.F3M1 = function() {
  this.DestEsquina();
  const e = this.estado;
  if (e === 26) {
    const v = this.A_Nav();
    if (v === 1) {
      this.estado = 27;
      this.t = 0;
    } else if (v === 2) {
      this.GuardarDest();
      this.estado = 3;
      this.t = 0;
    }
  } else if (e === 27) {
    if (this.A_Directo()) {
      this.estado = 24;
      this.t = 0;
    }
  } else if (e === 24) {
    if (this.dist_snake < 3e3) {
      this.estado = 26;
      this.t = 0;
    }
  } else if (e === 3) {
    if (this.A_SaltarA()) {
      this.RestaurarDest();
      this.estado = 26;
      this.t = 0;
    }
  }
};

D.F6M1 = function() {
  if (this.estado === 5) {
    if (this.A_SaltoCorto()) {
      this.estado = 6;
      this.t = 0;
    }
  } else if (this.estado === 6) {
    if (this.DestFase6()) {
      this.modo = 6;
      this.estado = 21;
    } else this.estado = 5;
    this.t = 0;
  }
};

D.F7M1 = function() {
  if (this.estado === 5) {
    if (this.A_SaltoCorto()) {
      this.modo = 6;
      this.estado = 0;
      this.t = 0;
    }
  } else if (this.estado === 27) {
    if (this.A_Directo()) {
      this.modo = 7;
      this.estado = 29;
      this.t = 0;
    }
  }
};

D.NavSnake = function() {
  const e = this.estado;
  if (e === 8) {
    const v = this.A_NavSnake();
    if (v === 1) {
      this.estado = 9;
      this.t = 0;
    } else if (v === 2) {
      this.GuardarDest();
      this.estado = 3;
      this.t = 0;
    }
  } else if (e === 9) {
    if (this.A_AcercarSnake()) {
      this.estado = 8;
      this.t = 0;
    }
  } else if (e === 3) {
    if (this.A_SaltarA()) {
      this.estado = 8;
      this.t = 0;
    }
  }
};

D.F0M3 = function() {
  if (this.Golpeado0()) {
    this.reset0();
    return;
  }
  this.NavSnake();
  this.andar = 0;
  if (this.dist_snake < 1200) {
    this.modo = 5;
    this.estado = 5;
    this.andar = 1;
    this.t = 0;
  }
};

D.F1M2 = function() {
  if (this.Golpeado1()) {
    this.reset0();
    return;
  }
  this.NavSnake();
  if (this.dist_snake < 3e3 && this.estado !== 3 && this.visto === 1) {
    this.modo = 0;
    this.estado = 24;
    this.t = 0;
    this.t_modo = 0;
  }
};

D.F1M5 = function() {
  if (this.Golpeado1()) {
    this.reset0();
    return;
  }
  this.NavSnake();
  if (this.dist_snake >= 3e3 || this.estado === 3 || this.visto !== 1) return;
  if (this.arma() !== -1) {
    const v = this.g.c3444;
    if (v - 6 >= 0 && v - 6 < 9 || v - 26 >= 0 && v - 26 < 9) this.Voz(this.voz[11] | 0);
    this.modo = 6;
    this.estado = this.dist_snake < 1500 ? 14 : 13;
  } else {
    this.modo = 0;
    this.estado = 24;
  }
  this.t = 0;
  this.t_modo = 0;
};

D.F2M2 = function() {
  if (this.Golpeado2()) {
    this.reset0();
    this.flags &= ~2;
    return;
  }
  this.NavSnake();
  this.flags |= 2;
  const lv = this.nivel(), lim = lv >= 4 || lv <= 0 ? 3e3 : 2e3;
  if (this.dist_snake < lim && this.estado !== 3 && this.visto === 1) {
    this.modo = 6;
    this.estado = this.dist_snake < 1500 ? 14 : 13;
    this.t = 0;
    this.t_modo = 0;
  }
};

D.F2M3 = function() {
  this.NavSnake();
  if (this.dist_snake < 2e3 && this.estado !== 3) {
    this.modo = 4;
    this.estado = 10;
    this.t = 0;
    this.t_modo = 0;
    this.andar = 1;
    return;
  }
  const g = this.golpe;
  if (g === 2) {
    this.modo = 4;
    this.estado = 10;
    this.t = 0;
    this.t_modo = 0;
    this.andar = 1;
  } else if (g === 3 || g === 4) {
    this.modo = 7;
    this.estado = 23;
    this.t = 0;
    this.andar = 1;
  }
};

D.F3M3 = function() {
  if (this.Golpeado3()) {
    this.reset0();
    return;
  }
  this.NavSnake();
  this.andar = 0;
  if (this.dist_snake < 2e3 && this.visto === 1 && this.estado !== 3) {
    this.modo = 0;
    this.estado = 24;
    this.t = 0;
    this.andar = 1;
    return;
  }
  if (this.dist_snake >= 6001 && this.estado !== 3) {
    this.estado = 5;
    this.modo = 0;
    this.t = 0;
    this.andar = 1;
  }
};

D.F4M2 = function() {
  this.NavSnake();
  if (this.estado !== 3) {
    const r = this.ElegirAtaque();
    if (r) {
      this.modo = 6;
      this.estado = r === 13 ? 14 : r === 12 ? 13 : r === 16 ? 17 : r === 17 ? 18 : 19;
      this.t = 0;
      this.t_modo = 0;
      return;
    }
  }
  this.flags |= 4;
  if (this.golpe !== 0) {
    this.modo = 7;
    this.estado = 25;
    this.matarClones();
    this.t = 0;
    this.t_modo = 0;
  }
};

D.F5M2 = function() {
  this.NavSnake();
  if (this.estado === 3) return;
  const r = this.ElegirAtaque();
  if (!r) return;
  this.modo = 6;
  this.estado = r === 12 ? 13 : r === 13 ? 14 : r === 16 ? 17 : r === 17 ? 18 : 19;
  this.t = 0;
  this.t_modo = 0;
};

D.F2M4 = function() {
  const e = this.estado;
  if (e === 10) {
    if (this.A_SaltoTabla6()) {
      this.estado = 11;
      this.t = 0;
    }
  } else if (e === 11) {
    if (this.A_EsperarCamuflado()) {
      this.modo = 2;
      this.estado = 8;
      this.t = 0;
      this.t_modo = 0;
    }
    if (this.dist_snake < 1e3) {
      this.estado = 12;
      this.t = 0;
      this.t_modo = 0;
    }
  } else if (e === 12) {
    if (this.A_EsperarCerca()) {
      this.modo = 6;
      this.estado = 14;
      this.t = 0;
      this.t_modo = 0;
    }
  }
  if (this.Golpeado2()) {
    this.andar = 1;
    this.t = 0;
    this.t_modo = 0;
    this.flags &= ~2;
  }
};

D.Ataque = function() {
  const e = this.estado;
  let v = 0;
  if (e === 23) {
    if (this.A_Contar() >= 6) {
      this.t = 0;
      return 1;
    }
    this.accion = 8;
    return 0;
  }
  if (e === 13) v = this.A_Ataque13(); else if (e === 14) v = this.A_Ataque14(); else if (e === 15) v = this.A_Ataque15(); else if (e === 16) v = this.A_Ataque16(); else if (e === 17) v = this.A_Ataque17(); else if (e === 18) v = this.A_Ataque18(); else if (e === 19) v = this.A_Ataque19(); else return 0;
  if (v) {
    this.accion = -1;
    this.estado = 23;
    this.t = 0;
  }
  return 0;
};

D.F1M6 = function() {
  if (this.Golpeado1()) {
    this.reset0();
    return;
  }
  if (!this.Ataque()) return;
  if (this.de_balas) {
    this.PuntoAlAzar();
    this.modo = 1;
    this.estado = 26;
  } else {
    this.modo = 0;
    this.estado = 7;
  }
  this.t = 0;
  this.t_modo = 0;
};

D.F2M6 = function() {
  if (this.Golpeado2()) {
    this.andar = 1;
    this.t = 0;
    this.t_modo = 0;
    this.flags &= ~2;
    return;
  }
  if (this.Ataque()) {
    this.modo = 4;
    this.estado = 10;
    this.t = 0;
    this.t_modo = 0;
  }
};

D.F3M6 = function() {
  if (this.Golpeado3()) {
    this.reset0();
    return;
  }
  if (this.Ataque()) {
    this.modo = 0;
    this.estado = 7;
    this.t = 0;
    this.t_modo = 0;
  }
};

D.F4M6 = function() {
  if (this.Ataque()) {
    this.g.e4340 = 0;
    this.modo = 7;
    this.estado = 23;
    this.matarClones();
    this.invisible = false;
    this.t = 0;
    return;
  }
  if (this.golpe !== 0) {
    this.modo = 7;
    this.estado = 25;
    this.matarClones();
    this.t = 0;
    this.t_modo = 0;
    this.invisible = false;
    return;
  }
  this.flags |= 4;
};

D.F5M6 = function() {
  if (this.Ataque()) {
    this.destruirClon();
    this.t = 0;
  }
  if (this.t >= 31) this.destruirClon();
};

D.F0M5 = function() {
  const e = this.estado;
  let v = -1;
  if (e === 5) this.A_Detras(); else if (e === 13) v = this.A_Ataque13(); else if (e === 16) v = this.A_Ataque16(); else if (e === 17) v = this.A_Ataque17(); else if (e === 19) v = this.A_Ataque19(); else if (e === 20) v = this.A_Ataque20(); else if (e === 23) this.A_Guardia0(); else if (e === 24) this.A_Guardia(); else if (e === 32) this.A_Accion7();
  if (v > 0) {
    this.accion = -1;
    this.estado = 23;
    this.t = 0;
  }
  if (this.accion !== 7 && this.t !== 0 && this.Golpeado0()) {
    this.reset0();
    return;
  }
  if (this.nivel() === 3) this.flags |= 2;
};

D.F6M6 = function() {
  if (this.estado === 21 && this.A_Disparar()) {
    if (this.cnt < 15) {
      this.modo = 1;
      this.estado = 6;
    } else {
      this.modo = 7;
      this.estado = 29;
    }
    this.accion = -1;
    this.t = 0;
  }
  if (this.golpe > 2 && this.golpe < 5) {
    this.modo = 7;
    this.estado = 23;
    this.t = 0;
  }
};

D.F7M6 = function() {
  const e = this.estado;
  if (e === 0) {
    if (this.A_EsferaOn()) {
      this.esfera = 2;
      this.estado = 23;
      this.t = 0;
    }
  } else if (e === 22) {
    if (this.A_Carga()) {
      this.esfera = 2;
      this.estado = 23;
      this.t = 0;
      this.cnt_golpes++;
    }
    if (this.t === 5) this.esfera = 1;
  } else if (e === 23) {
    if (this.A_Descanso()) {
      this.estado = 22;
      this.t = 0;
    }
  }
  this.vulnerable = 1;
  if (this.golpe !== 0) {
    this.esfera = 3;
    this.Golpeado7();
    this.t = 0;
  }
};

D.Fase0 = function() {
  const m = this.modo;
  if (m === 0) this.F0M0(); else if (m === 1) this.F0M1(); else if (m === 3) this.F0M3(); else if (m === 5) this.F0M5(); else if (m === 7) this.F0M7(); else if (m === 8) this.F0M8(); else if (m === 9) this.F0M9();
};

D.Fase1 = function() {
  const m = this.modo;
  if (m === 0) this.F1M0(); else if (m === 1) this.F1M1(); else if (m === 2) this.F1M2(); else if (m === 5) this.F1M5(); else if (m === 6) this.F1M6(); else if (m === 7) this.F1M7(); else if (m === 8) this.F1M8(); else if (m === 9) this.F1M9();
};

D.Fase2 = function() {
  const m = this.modo;
  if (m === 0) this.F2M0(); else if (m === 1) this.F2M1(); else if (m === 2) this.F2M2(); else if (m === 3) this.F2M3(); else if (m === 4) this.F2M4(); else if (m === 6) this.F2M6(); else if (m === 7) this.F2M7(); else if (m === 8) this.F2M8(); else if (m === 9) this.F2M9();
  this.VocesFase2();
};

D.Fase3 = function() {
  const m = this.modo;
  if (m === 0) this.F3M0(); else if (m === 1) this.F3M1(); else if (m === 3) this.F3M3(); else if (m === 6) this.F3M6(); else if (m === 7) this.F3M7(); else if (m === 8) this.F3M8(); else if (m === 9) this.F3M9();
};

D.Fase4 = function() {
  const m = this.modo;
  if (m === 0) this.F4M0(); else if (m === 2) this.F4M2(); else if (m === 6) this.F4M6(); else if (m === 7) this.F4M7();
};

D.Fase5 = function() {
  const m = this.modo;
  if (m === 0) this.F5M0(); else if (m === 2) this.F5M2(); else if (m === 6) this.F5M6();
  this.flags |= 4;
};

D.Fase6 = function() {
  const m = this.modo;
  if (m === 0) this.F6M0(); else if (m === 1) this.F6M1(); else if (m === 6) this.F6M6(); else if (m === 7) this.F6M7();
};

D.Fase7 = function() {
  const m = this.modo;
  if (m === 0) this.F7M0(); else if (m === 1) this.F7M1(); else if (m === 6) this.F7M6(); else if (m === 7) this.F7M7();
};

D.VocesFase2 = function() {
  const g = this.g;
  if (g.c3440 % 12 === 1) {
    if (this.streamStatus() === -1) {
      if (this.puedeHablar()) this.voxStream(this.voz[1]);
      g.c3440++;
    }
  } else if (g.c3440 % 12 === 5) {
    if (this.streamStatus() === -1) {
      if (this.puedeHablar()) this.voxStream(this.voz[2]);
      g.c3440++;
    }
  }
  if (g.c3450 === 2) {
    if (this.streamStatus() === -1) {
      if (this.puedeHablar()) this.voxStream(this.voz[15]);
      g.c3450++;
    }
  } else if (g.c3450 === 4) {
    if (this.streamStatus() === -1) {
      if (this.puedeHablar()) this.voxStream(this.voz[16]);
      g.c3450++;
    }
  } else if (g.c3450 === 6) {
    if (this.streamStatus() === -1) {
      if (this.puedeHablar()) this.voxStream(this.voz[14]);
      g.c3450 = 0;
    }
  }
};

D.Cerebro = function() {
  const antes = [ this.fase, this.modo, this.estado ];
  this.dir_obj = -1;
  this.accion = -1;
  this.flags = 0;
  this.vulnerable = 0;
  const F = [ this.Fase0, this.Fase1, this.Fase2, this.Fase3, this.Fase4, this.Fase5, this.Fase6, this.Fase7 ][this.fase];
  F?.call(this);
  this.t_modo++;
  if (antes[0] !== this.fase || antes[1] !== this.modo || antes[2] !== this.estado) this.log("estado", {
    fase: this.fase,
    modo: this.modo,
    estado: this.estado,
    vida: this.vida
  });
};

D.destruirClon = function() {
  if (this.es_clon) this.destruir();
};

D.SnakeEnOtacon = function() {
  const s = this.snakeMM();
  return s[0] >= -7625 && s[0] <= -6125 && s[2] >= -4125 && s[2] <= -3375;
};

D.GolpePared = function() {
  if (this.golpe_pared === 0) {
    const r = this.J.ruido;
    if (r && r.p === 100 && r.len >= 15 && r.len <= 16 && this.SnakeEnOtacon()) {
      this.golpe_pared = 90;
      this.log("golpe en el armario de Otacon");
    }
  } else if (this.golpe_pared === 75) this.mgr.se(143, aV3(this.c.mov), null);
  this.golpe_pared--;
  if (this.golpe_pared < 0) this.golpe_pared = 0;
};

D.ganar = function() {
  if (this.ganado) return;
  this.ganado = true;
  this.log("victoria", {
    proc: this.proc_e
  });
  this.mgr.victoriaProc(this, {
    jefe: "NINJA",
    proc: this.proc_e,
    demos: [ 52188 ],
    siguiente: null
  });
};

D.camara = function() {
  const C = this.cam, g = this.g, s = this.snakeMM();
  const destV = () => [ this.dest[0], this.dest[1], this.dest[2] ];
  let fija = null;
  const near = (a, b, k) => nearExp(a, b, k);
  const acercarRango = (v, p) => {
    const nr = (a, b, r) => a < b - r ? b - r : a > b + r ? b + r : a;
    return [ nr(v[0], p[0], 250), nr(v[1], p[1], 100), nr(v[2], p[2], 250) ];
  };
  switch (this.cam_modo) {
   case 0:
    fija = CAM_FIJA0;
    g.camT++;
    break;

   case 1:
    {
      const v = acercarRango(C.target, s);
      for (let i = 0; i < 3; i++) C.target[i] = near(C.target[i], v[i], 4);
      C.track = 8e3;
      C.rotX = 640;
      C.rotY = 2048;
      g.camT++;
      break;
    }

   case 2:
    for (let i = 0; i < 3; i++) C.target[i] = near(C.target[i], s[i], 8);
    C.rotX = near(C.rotX, 640, 4);
    C.rotY = near(C.rotY, 2048, 4);
    C.track = near(C.track, 8e3, 2);
    if (g.camT >= 32) this.CamModo(1); else g.camT++;
    break;

   case 3:
    {
      const v = acercarRango(C.target, s);
      for (let i = 0; i < 3; i++) C.target[i] = near(C.target[i], v[i], 4);
      C.rotX = 640;
      C.rotY = near(C.rotY, 2048, 2);
      C.track = near(C.track, 4e3, 2);
      if (g.camT >= 64) this.CamModo(2); else g.camT++;
      break;
    }

   case 5:
   case 7:
    {
      const tabla = this.cam_modo === 5 ? CAM5 : CAM7;
      if (g.camT < 31) {
        C.rotX = 640;
        C.rotY = 2048;
        C.track = 8e3;
        C.target = destV();
        g.camLado = this.dest[0] >= -1999 ? 0 : 1;
      } else fija = tabla[g.camLado];
      g.camT++;
      break;
    }

   case 6:
    C.track = 8e3;
    C.target = destV();
    C.rotX = 640;
    C.rotY = 2048;
    g.camT++;
    break;

   case 8:
    if (g.camT < 61) {
      C.rotX = 640;
      C.rotY = 2048;
      C.track = 8e3;
      C.target = destV();
    }
    if (g.camT >= 46) fija = CAM8[this.dest[0] >= -1999 ? 0 : 1];
    g.camT++;
    break;
  }
  if (!Array.isArray(C.target)) C.target = deV3(C.target);
  let pos, mira;
  if (fija) {
    pos = fija[0];
    mira = fija[1];
  } else {
    const p = C.rotX * ANG, y = C.rotY * ANG, cp = Math.cos(p);
    pos = [ C.target[0] - Math.sin(y) * cp * C.track, C.target[1] + Math.sin(p) * C.track, C.target[2] - Math.cos(y) * cp * C.track ];
    mira = C.target;
  }
  const v = {
    pos: aV3(pos),
    mira: aV3(mira),
    modo: this.cam_modo,
    verSnake: true
  };
  const escena = [ 0, 5, 6, 7, 8 ].includes(this.cam_modo) && (this.padRelease || this.cam_modo === 0);
  this.camEsp = escena ? v : null;
  this.camPelea = v;
};

D.dibujar = function() {
  if (!this.o) return;
  this.o.position.set(this.c.mov[0] * MM, (this.c.mov[1] - this.motor.altura) * MM, this.c.mov[2] * MM);
  this.o.rotation.y = this.c.rot[1] * ANG;
  aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.motor.altura * MM);
  this.o.updateMatrixWorld(true);
  this.vfx.dibujar();
};

D.destruir = function() {
  this.vivo = false;
  this.blanco = false;
  this.flujo?.parar();
  this.vfx?.destruir();
  if (this.padRelease || this.snakeCaido) this.mgr.congelar(false);
  if (this.mgr.camaraEspecial) this.mgr.camaraEspecial = null;
  this.o?.removeFromParent();
};

D.estadoPrueba = function() {
  return {
    fase: this.fase,
    modo: this.modo,
    estado: this.estado,
    t: this.t,
    t_modo: this.t_modo,
    accion: this.accion,
    slot: this.slot,
    vida: this.vida,
    mov: cop(this.c.mov),
    rot: this.c.rot[1],
    dir_snake: this.dir_snake,
    dist: this.dist_snake,
    blanco: this.blanco,
    kogaku: this.kogaku,
    invisible: this.invisible,
    katana: this.katana_vis,
    sin_katana: this.sin_katana,
    esfera: this.esfera,
    cam: this.cam_modo,
    voz: this.flujo?.estado,
    ej: this.ej?.name || "",
    cnt: this.cnt,
    cnt_golpes: this.cnt_golpes,
    c3448: this.g.c3448,
    snakeCaido: this.snakeCaido
  };
};

let texRemolino = null;

function texturaRemolino() {
  if (texRemolino) return texRemolino;
  const L = new THREE.TextureLoader;
  const t = L.load("assets/jefes/hind_wind01.png", undefined, undefined, () => L.load("assets/jefes/rex/anillo_polvo.png", t2 => {
    t.image = t2.image;
    t.needsUpdate = true;
  }));
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return texRemolino = t;
}

let _texGlow = null;

function texGlow() {
  if (_texGlow) return _texGlow;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(.35, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  _texGlow = new THREE.CanvasTexture(c);
  _texGlow.colorSpace = THREE.SRGBColorSpace;
  return _texGlow;
}

const sprite = (color, escala, op = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texGlow(),
    color: color,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: op
  }));
  s.scale.setScalar(escala);
  s.userData.sinColision = true;
  return s;
};

class EfectosNinja {
  constructor(n, trans, bola) {
    this.n = n;
    this.mgr = n.mgr;
    this.mundo = n.mgr.mundo;
    this.fx = [];
    this.anillo = [];
    this.idx = 0;
    this.estelas = [];
    for (const [k, atras] of [ 4, 8 ].entries()) {
      const o = trans[k];
      if (!o) continue;
      const huesos = [];
      for (let i = 0; i < 16; i++) huesos.push(o.getObjectByName("hueso_" + i));
      const padres = huesos.map(h => {
        const m = /^hueso_(\d+)$/.exec(h?.parent?.name || "");
        return m ? +m[1] : -1;
      });
      const luz = ((8 - atras) * 10 + 40) / 128;
      o.traverse(m => {
        if (m.isMesh) {
          const k = m.material.clone();
          k.transparent = true;
          k.opacity = .55 * luz + .1;
          k.depthWrite = false;
          if (k.color) k.color = k.color.clone().multiplyScalar(luz + .3);
          m.material = k;
          m.castShadow = false;
          m.userData.sinColision = true;
          m.frustumCulled = false;
        }
      });
      const g = new THREE.Group;
      g.add(o);
      g.visible = false;
      this.mundo.add(g);
      this.estelas.push({
        g: g,
        o: o,
        huesos: huesos,
        padres: padres,
        atras: atras
      });
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(8 * 6 * 3), 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(8 * 6 * 3), 3));
    this.rastro = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    this.rastro.frustumCulled = false;
    this.rastro.userData.sinColision = true;
    this.mundo.add(this.rastro);
    this.hoja = [];
    for (let i = 0; i < 8; i++) this.hoja.push([ new THREE.Vector3, new THREE.Vector3 ]);
    this.hojaI = 0;
    this.hojaLista = false;
    this.lampara = sprite(16738874, .16, 0);
    this.mundo.add(this.lampara);
    this.lamp = {
      estado: 0,
      brillo: 0
    };
    this.bolas = bola;
    this.esfera = null;
    this.materialesKogaku = null;
  }
  cuadro() {
    const n = this.n;
    if (n.katana) n.katana.visible = n.katana_vis !== 0;
    for (const [m] of n.materiales || []) {
      m.visible = !n.invisible;
      m.castShadow = !n.sombraOculta && !n.kogaku && !n.invisible;
    }
    this.kogaku(n.kogaku);
    const L = this.lamp, f = n.voz_nivel;
    if (L.estado === 0) {
      if (f > 0) L.estado = 2; else if (f < 0) L.estado = 3; else {
        L.brillo += 8;
        if (L.brillo > 150) L.estado = 1;
      }
    } else if (L.estado === 1) {
      if (f < 0) L.estado = 3; else if (L.brillo < 160 && f > 0) L.estado = 2; else {
        L.brillo -= 4;
        if (L.brillo < 50) L.estado = 0;
      }
    } else if (L.estado === 2) {
      if (f < 0) L.estado = 3; else {
        L.brillo += 16;
        if (L.brillo > 180) {
          L.brillo = 180;
          L.estado = 1;
        }
      }
    } else {
      L.brillo -= 16;
      if (L.brillo < 0) {
        L.brillo = 0;
        if (f >= 0) L.estado = 2;
      }
    }
    this.cuadroEsfera();
    for (const e of this.fx.slice()) {
      e.t++;
      e.fn(e.t);
      if (e.t >= e.dur) {
        e.fin?.();
        this.fx.splice(this.fx.indexOf(e), 1);
      }
    }
  }
  dibujar() {
    const n = this.n;
    const snap = {
      pos: n.o.position.clone(),
      rot: n.o.rotation.y,
      rots: n.motor.rots.map(r => r.slice()),
      altura: n.motor.altura,
      est: n.estela && !n.invisible ? 1 : 0
    };
    this.idx = (this.idx + 1) % 32;
    this.anillo[this.idx] = snap;
    for (const e of this.estelas) {
      const s = this.anillo[(this.idx - e.atras + 32) % 32];
      e.g.visible = !!(s && s.est) && n.vivo;
      if (!e.g.visible) continue;
      e.g.position.copy(s.pos);
      e.g.rotation.y = s.rot;
      aplicarPose(e.huesos, e.padres, s.rots, null, s.altura * MM);
    }
    const h4 = n.huesos[4];
    if (h4) {
      const a = new THREE.Vector3(0, -.065, -.883).applyMatrix4(h4.matrixWorld), b = new THREE.Vector3(0, -.065, -.045).applyMatrix4(h4.matrixWorld);
      this.hojaI = (this.hojaI + 1) % 8;
      this.hoja[this.hojaI][0].copy(a);
      this.hoja[this.hojaI][1].copy(b);
      if (!this.hojaLista) {
        for (const p of this.hoja) {
          p[0].copy(a);
          p[1].copy(b);
        }
        this.hojaLista = true;
      }
      const kv = n.katana_vis, col = kv === 2 ? [ 55, 192, 155 ] : [ 28, 96, 78 ];
      this.rastro.visible = kv > 0 && n.vivo && !n.kogaku;
      const P = this.rastro.geometry.attributes.position.array, Cc = this.rastro.geometry.attributes.color.array;
      for (let i = 0; i < 7; i++) {
        const c0 = this.hoja[(this.hojaI - i + 8) % 8], c1 = this.hoja[(this.hojaI - i - 1 + 8) % 8];
        const k0 = col.map(v => Math.max(0, v - i * 32) / 255), k1 = col.map(v => Math.max(0, v - (i + 1) * 32) / 255);
        const q = [ [ c0[0], k0 ], [ c0[1], [ 0, 0, 0 ] ], [ c1[0], k1 ], [ c0[1], [ 0, 0, 0 ] ], [ c1[1], [ 0, 0, 0 ] ], [ c1[0], k1 ] ];
        q.forEach(([p, c], j) => {
          const o = (i * 6 + j) * 3;
          P[o] = p.x;
          P[o + 1] = p.y;
          P[o + 2] = p.z;
          Cc[o] = c[0];
          Cc[o + 1] = c[1];
          Cc[o + 2] = c[2];
        });
      }
      this.rastro.geometry.attributes.position.needsUpdate = true;
      this.rastro.geometry.attributes.color.needsUpdate = true;
    }
    const h6 = n.huesos[6];
    if (h6) {
      this.lampara.position.copy(new THREE.Vector3(0, 0, .1).applyMatrix4(h6.matrixWorld));
    }
    this.lampara.material.opacity = n.invisible || n.kogaku ? 0 : Math.min(1, this.lamp.brillo / 180);
    if (this.esfera && n.huesos[0]) {
      const p = (new THREE.Vector3).setFromMatrixPosition(n.huesos[0].matrixWorld);
      for (const b of this.esfera.bolas) b.g.position.copy(p);
    }
  }
  kogaku(si) {
    if (!!this._kog === !!si) return;
    this._kog = si;
    if (this.n.modelo) this.n.modelo.userData.kogakuRaiz = true;
    const k = materialKogaku(TINTE.ninja);
    for (const [m, mat] of this.n.materiales || []) m.material = si ? k : mat;
    if (this.n.katana) this.n.katana.traverse(m => {
      if (m.isMesh) {
        if (!m.userData.matOrig) m.userData.matOrig = m.material;
        m.material = si ? k : m.userData.matOrig;
      }
    });
  }
  arco(b1, b2, cuadros = 4, f3B4 = 0) {
    const n = this.n, h1 = n.huesos[b1 % 16], h2 = n.huesos[b2 % 16];
    if (!h1 || !h2) return;
    const mm = h => {
      const e = h.matrixWorld.elements;
      return [ Math.round(e[12] * 1e3), Math.round(e[13] * 1e3), Math.round(e[14] * 1e3) ];
    };
    const p = new Plasma(this.mundo, mm(h1), mm(h2), {
      modo: 0,
      azul: 0,
      f3B4: f3B4,
      cuadros: cuadros + randU(16)
    });
    const e = {
      t: 0,
      dur: Infinity,
      fn: () => {
        if (!p.cuadro(mm(h1), mm(h2))) e.dur = 0;
      },
      fin: () => p.quitar()
    };
    this.fx.push(e);
  }
  chispa(hueso, color = 16777215, escala = .35) {
    const h = this.n.huesos[hueso];
    const p = h ? new THREE.Vector3(0, 0, .1).applyMatrix4(h.matrixWorld) : aV3(this.n.c.mov);
    this.mgr.chispa(p, escala, 4, color);
  }
  remolino(a1 = 200, a2 = 100, a3 = a1, tiempo = 10) {
    const n = this.n, cx = n.c.mov[0], cy = (n.c.levels[0] || 0) + 20, cz = n.c.mov[2];
    const N = 32, geo = new THREE.BufferGeometry, pos = new Float32Array(N * 6 * 3), uv = [];
    for (let i = 0; i < N; i++) uv.push(1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const mat = new THREE.MeshBasicMaterial({
      map: texturaRemolino(),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const m = new THREE.Mesh(geo, mat);
    m.userData.sinColision = true;
    m.frustumCulled = false;
    m.visible = false;
    this.mundo.add(m);
    const w = {
      f448: idiv(a1, 2),
      f450: a2,
      f44C: a3,
      f454: 600,
      time: tiempo
    };
    const dibujar = () => {
      const r0 = w.f448, r1 = w.f448 + idiv(w.f450 * rcos(w.f454), 4096), h = idiv(w.f450 * rsin(w.f454), 4096);
      const v = (r, i, y) => {
        const a = i % N * 128;
        return [ (cx + r * rcos(a) / 4096) * MM, (cy + y) * MM, (cz + r * rsin(a) / 4096) * MM ];
      };
      for (let i = 0; i < N; i++) {
        const A = v(r0, i, 0), B = v(r0, i + 1, 0), C = v(r1, i, h), D = v(r1, i + 1, h);
        pos.set([ ...C, ...D, ...B, ...C, ...B, ...A ], i * 18);
      }
      geo.attributes.position.needsUpdate = true;
    };
    this.fx.push({
      t: 0,
      dur: tiempo - 1,
      fn: () => {
        w.time--;
        dibujar();
        m.visible = true;
        w.f448 += w.f44C;
        w.f44C -= idiv(w.f44C, 8);
        w.f454 = nearExp(w.f454, 0, 8);
        const c = w.time * 8 / 128;
        mat.color.setRGB(c, c, c);
      },
      fin: () => {
        m.removeFromParent();
        geo.dispose();
        mat.dispose();
      }
    });
  }
  chispasPiso() {
    const n = this.n;
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2, d = .3 + Math.random() * .9;
      this.mgr.chispa(new THREE.Vector3(n.c.mov[0] * MM + Math.sin(a) * d, ((n.c.levels[0] || 0) + 30) * MM, n.c.mov[2] * MM + Math.cos(a) * d), .25, 3, 10475775);
    }
  }
  humo(hueso) {
    this.chispa(hueso, 14211288, .6);
  }
  estallido(hueso) {
    this.chispa(hueso, 16752704, 1.2);
    this.n.seM(143);
  }
  empujon(dx, dz) {
    const J = this.n.J, r = J.ctx.rig?.position;
    if (!r) return;
    this.fx.push({
      t: 0,
      dur: 8,
      fn: () => {
        r.x += dx * .075;
        r.z += dz * .075;
        J.chocar?.(r, .3);
        if (this.mgr.congelado) this.mgr.congelado.copy(r);
      }
    });
  }
  esferaCrear() {
    if (this.esfera || !this.bolas[0]) return;
    const bolas = [];
    for (let i = 0; i < 2; i++) {
      const o = this.bolas[i] || this.bolas[0];
      o.traverse(m => {
        if (m.isMesh) {
          const k = m.material.clone();
          k.transparent = true;
          k.opacity = i === 0 ? .55 : .4;
          k.blending = THREE.AdditiveBlending;
          k.depthWrite = false;
          if (k.color) k.color = new THREE.Color(i === 0 ? 7321343 : 10476799);
          m.material = k;
          m.castShadow = false;
          m.userData.sinColision = true;
        }
      });
      const g = new THREE.Group;
      g.add(o);
      this.mundo.add(g);
      bolas.push({
        g: g,
        o: o,
        cur: 128,
        obj: 128,
        rot: [ randU(4096), randU(4096), randU(4096) ]
      });
    }
    const c = this.centroEsfera();
    this.esfera = {
      bolas: bolas,
      t: randU(4096),
      arcos: [ 0, 1 ].map(() => ({
        rot: [ randU(4096), randU(4096), randU(4096) ],
        antes: c.slice()
      }))
    };
    this.n.log("esfera");
  }
  cuadroEsfera() {
    const E = this.esfera, n = this.n;
    if (!E) return;
    const cmd = n.esfera;
    if (cmd === 1) {
      n.esfera = 0;
      E.bolas[0].cur = 2048;
      E.bolas[0].obj = 4096;
      E.bolas[1].cur = 2048;
      E.bolas[1].obj = 2048;
    } else if (cmd === 2) {
      n.esfera = 0;
      E.bolas[0].cur = 4096;
      E.bolas[0].obj = 2048;
      E.bolas[1].cur = 2048;
      E.bolas[1].obj = 2048;
    } else if (cmd === 3) {
      n.esfera = -1;
      E.bolas[0].obj = 0;
      E.bolas[1].obj = 0;
    }
    E.t++;
    for (const [i, b] of E.bolas.entries()) {
      b.cur = b.obj >= b.cur ? b.obj : Math.trunc(b.cur * 31 / 32);
      b.rot[0] += 32;
      b.rot[1] += 123;
      b.rot[2] += 295;
      const s = Math.min(4096, b.cur) / 4096;
      b.g.scale.setScalar(Math.max(.001, s));
      b.g.rotation.set(b.rot[0] * ANG, b.rot[1] * ANG * (i ? -1 : 1), b.rot[2] * ANG);
      b.o.traverse(m => {
        if (m.isMesh) m.material.opacity = (i === 0 ? .45 : .3) + .15 * Math.sin(E.t * .4 + i);
      });
    }
    this.arcosEsfera(E);
    if (n.esfera === -1 && E.bolas[0].cur < 500) {
      for (const b of E.bolas) b.g.removeFromParent();
      this.esfera = null;
      n.esfera = 0;
      n.log("esfera apagada");
    }
  }
  centroEsfera() {
    const h = this.n.huesos[0];
    if (!h) return [ 0, 0, 0 ];
    const e = h.matrixWorld.elements;
    return [ Math.round(e[12] * 1e3), Math.round(e[13] * 1e3), Math.round(e[14] * 1e3) ];
  }
  arcosEsfera(E) {
    const t = this.n.gvTime(), c = this.centroEsfera(), r = Math.trunc(E.bolas[0].cur * 1e3 / 4096);
    for (const [i, A] of E.arcos.entries()) {
      if ((t + i) % 2 !== i) continue;
      for (let k = 0; k < 3; k++) A.rot[k] = A.rot[k] + randU(128) + 128 & 65535;
      _eE.set(A.rot[0] * ANG, A.rot[1] * ANG, A.rot[2] * ANG, "YXZ");
      _vE.set(0, 0, r).applyEuler(_eE);
      const q = [ c[0] + Math.trunc(_vE.x), c[1] + Math.trunc(_vE.y), c[2] + Math.trunc(_vE.z) ];
      const p = new PlasmaL(this.mundo, A.antes, q, 2);
      const e = {
        t: 0,
        dur: Infinity,
        fn: () => {
          if (!p.cuadro()) e.dur = 0;
        },
        fin: () => p.quitar()
      };
      this.fx.push(e);
      A.antes = q;
    }
  }
  destruir() {
    for (const e of this.fx) e.fin?.();
    this.fx = [];
    for (const e of this.estelas) e.g.removeFromParent();
    this.rastro.removeFromParent();
    this.rastro.geometry.dispose();
    this.lampara.removeFromParent();
    if (this.esfera) for (const b of this.esfera.bolas) b.g.removeFromParent();
    this.esfera = null;
  }
}

export const PELEA_S08B = {
  elegir: (nv, ctx) => (ctx?.juego?.__jefes?.lista || []).some(j => j.vivo && j.actor?.tipo === "NINJA") ? [] : nv.actores.filter(a => a.tipo === "NINJA").slice(0, 1).map(a => ({
    ...a,
    forzado: true
  })),
  snake: {
    p: [ -6378, 0, 55 ],
    rot: 2371
  },
  cancion: 2,
  grupoHzd: 0,
  guion: g => g.correrProc(52866),
  tipos: [ "NINJA" ]
};

export const NINJA = {
  escenario: "s08b",
  script: "chara NINJA #30ba -e proc_39bd -v 17807 17850 17879 17917 17990 18049 18064 18083 18101 18122 18150 18171 18193 18209 18211 18228 0 18245 18261 -b proc_d4e2 -w proc_aeea",
  modelo: "jefes/ninja.glb",
  camuflado: "jefes/ninja_camuflado.glb",
  katana: "jefes/katana.glb",
  esfera: "jefes/nja_ball.glb",
  anim: "nja_08b",
  portado: true
};

export function crearNinja(actor, mgr) {
  return new Ninja(actor, mgr);
}
