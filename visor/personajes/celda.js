// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Sistema, Personaje, PLAYER, STATE, MM, ANG, difS, vecDir, randU, randS, HASH, asentir, dirVec3, tomarPendientes } from "./comun.js";

import { cargarModelo, aplicarPose, nearExp } from "../jefes/base.js";

import { ducto } from "../ducto.js";

import { vibrar as vibrarMando } from "../controles.js";

const VIB_JOHNNY = {
  alerta: {
    m2: [ 255, 10 ]
  },
  forcejeo: {
    m2: [ 255, 4 ]
  }
};

const NOMBRE_JOHNNY = 7929, NOMBRE_SNAKE = 8650, ROU_TOBIRA = 5267, DR_GOMON = 35380, LAMP_ON = 18552, LAMP_OFF = 3695, OTACOM = 65471;

const PLAYER_KETCHUP = 1048576, PLAYER_INTRUDE = 2, PLAYER_GROUND = 64, PLAYER_MOVE = 16, PLAYER_CHECK_WALL = 131072;

const SE = {
  PUNCH_HIT: 52,
  KICK_HIT: 53,
  HIT_FLOOR: 51,
  EXCLAMATION: 83,
  COLLAPSE: 81,
  DOOR_CLOSE3: 88,
  NINJA_STEALTH: 78,
  PSG1: 27,
  ITEM_GET: 22,
  V_PUNCHED: 143,
  V_THROWN: 144,
  V_GRABBED: 145,
  V_SNAPPED: 146,
  V_YAWN: 151,
  V_SNORE: 152
};

export const TIPOS_CELDA = new Set([ "JOHNNY", "PRISONOTACON", "PRISONNINJA", "PRISONSNAKE2" ]);

export const esCelda = a => !!a && TIPOS_CELDA.has(a.tipo);

const nums = v => Array.isArray(v) ? v.filter(x => typeof x === "number") : [];

const procsDe = v => Array.isArray(v) ? v.map(x => x && typeof x === "object" && "proc" in x ? x.proc : typeof x === "number" ? x : -1) : [];

const idDe = v => {
  const x = Array.isArray(v) ? v[0] : null;
  return typeof x === "number" ? x : x && typeof x === "object" ? x.id ?? null : null;
};

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const s16 = v => (v & 65535 ^ 32768) - 32768;

const nearExp2V = (a, b) => {
  a.x = nearExp(a.x, b.x, 2);
  a.y = nearExp(a.y, b.y, 2);
  a.z = nearExp(a.z, b.z, 2);
};

const nearExp8V = (a, b) => {
  a.x = nearExp(a.x, b.x, 8);
  a.y = nearExp(a.y, b.y, 8);
  a.z = nearExp(a.z, b.z, 8);
};

const globales = sis => sis.celda ||= {
  d32C8: 0,
  d33D8: 0
};

const trampasHzm = new Map;

function cargarTrampas(st) {
  if (!st) return Promise.resolve({});
  if (!trampasHzm.has(st)) {
    const pr = fetch(`assets/personajes/trampas_${st}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(d => {
      trampasHzm.set(st, d);
      return d;
    });
    trampasHzm.set(st, pr);
  }
  const v = trampasHzm.get(st);
  return v instanceof Promise ? v : Promise.resolve(v);
}

function cajasTrampa(sis, hash) {
  const t = trampasHzm.get(sis.ctx.nivel?.id);
  if (t && !(t instanceof Promise) && t[String(hash)]) return t[String(hash)].cajas;
  const g = sis.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
  return g?.script?.zonas?.[hash] || g?.script?.zonas?.[String(hash)] || [];
}

function dentro(sis, hash, p) {
  for (const c of cajasTrampa(sis, hash)) if (p.x >= c[0][0] && p.x < c[1][0] && p.y >= c[0][1] && p.y < c[1][1] && p.z >= c[0][2] && p.z < c[1][2]) return true;
  return false;
}

function estadoSnake(sis) {
  return sis.estadoSnake() | (ducto.activo ? PLAYER_INTRUDE : 0) | (sis.ketchup ? PLAYER_KETCHUP : 0) | (sis.J.sn?.mov ? PLAYER_MOVE : 0);
}

class Nav {
  constructor(p, pos) {
    this.p = p;
    this.addr = p.addr(pos);
    this.target = -1;
    this.target_next = -1;
    this.next = this.addr;
    this.next_pos = V();
    this.target_pos = V();
  }
  setTarget(pos) {
    this.target = this.p.addr(pos);
    this.target_pos = pos.clone();
    this.target_next = -1;
  }
  setTargetPlayer() {
    this.target = this.p.sis.playerAddress ?? this.p.addr(this.p.snake());
    this.target_pos = this.p.snake();
  }
  dist(pos) {
    const v = pos.clone();
    v.y = this.target_pos.y;
    return Math.round(this.target_pos.clone().sub(v).length());
  }
  near(pos, d) {
    return this.dist(pos) < d;
  }
  zoneNavi() {
    const p = this.p, pos = p.mov;
    const reach = p.reachTo(this.addr, this.next);
    if (this.target !== this.target_next || reach <= 0) {
      this.target_next = this.target;
      if (p.reachTo(this.addr, this.target) < 2) {
        this.next_pos = this.target_pos.clone();
        this.next = this.target;
        p.turn = vecDir(this.target_pos.x - pos.x, this.target_pos.z - pos.z);
        return -1;
      }
      const zon = p.navigate(this.addr, this.target, pos), z = p.zona(zon);
      if (z) this.next_pos = z;
      this.next = zon & 255 | (zon & 255) << 8;
    }
    p.turn = vecDir(this.next_pos.x - pos.x, this.next_pos.z - pos.z);
    return 0;
  }
}

function camuflar(o, si) {
  o?.traverse(m => {
    if (!m.isMesh) return;
    if (!m.userData.__matOrig) {
      m.userData.__matOrig = m.material;
    }
    if (si) {
      if (!m.userData.__matKogaku) {
        const k = m.userData.__matOrig.clone();
        k.transparent = true;
        k.opacity = .14;
        k.depthWrite = false;
        if (k.color) k.color.setRGB(.75, .85, 1);
        m.userData.__matKogaku = k;
      }
      m.material = m.userData.__matKogaku;
    } else m.material = m.userData.__matOrig;
  });
}

class Johnny extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = NOMBRE_JOHNNY;
    this.lado = "enemigo";
    this.tamBlanco = [ 300, 750, 300 ];
    this.dePersonajes = true;
    this.buzon = [];
    this.msgs = [];
    this.G = globales(sis);
  }
  log(t, extra = {}) {
    this.sis.log("johnny " + t, extra);
  }
  async iniciar() {
    const o = this.opts;
    await Promise.all([ this.cargarCon("personajes/johnny.glb", "joh_03c", "armas/famas.glb"), cargarTrampas(this.ctx.nivel?.id) ]);
    if (!this.vivo) return;
    this.o.userData.actor = this.actor;
    const p = nums(o.p), d = nums(o.d);
    this.mov.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rot = this.turn = (d[1] ?? 0) & 4095;
    this.rSphere = 450;
    this.interpCtrl = 0;
    this.vital = 192;
    this.faint = 10;
    this.blanco = true;
    this.claseDown = false;
    this.homing = true;
    this.radarVista = true;
    this.rutas = [];
    for (let r = 0; r < 5; r++) {
      const R = this.ruta(r);
      this.rutas.push(R.length ? R.map(q => ({
        p: q.p.clone(),
        pad: q.cmd | 0
      })) : [ {
        p: this.mov.clone(),
        pad: 2048
      } ]);
    }
    this.AFC = this.rutas[0][0].p.clone();
    this.B04 = this.rutas[4][0].p.clone();
    this.AD0r = 0;
    this.AD0i = 0;
    this.B60 = this.rutas[0][0].p.clone();
    this.B60pad = 0;
    this.AD8 = 0;
    this.AD4 = 0;
    this.vox_ids = nums(o.v).slice(0, 18);
    while (this.vox_ids.length < 18) this.vox_ids.push(0);
    this.proc_id = procsDe(o.e).slice(0, 8);
    while (this.proc_id.length < 8) this.proc_id.push(-1);
    this.B68 = 0;
    this.trigger = 0;
    this.luzArma = true;
    this.B5A = 0;
    this.B58 = 0;
    this.B5E = 0;
    this.B5C = 0;
    this.B0C = nums(o.m)[0] ?? 0;
    this.B14 = 0;
    this.B10 = 0;
    this.B18 = 0;
    this.B1C = 0;
    if (this.B0C === 4) this.B1C = 32;
    this.B70 = (nums(o.f)[0] ?? 0) & 65535;
    if (this.B70 === 3) this.B1C |= 2;
    if ((nums(o.b)[0] ?? 0) === 1) this.B1C |= 1;
    this.B6C = (nums(o.c)[0] ?? 0) & 65535;
    this.B6E = (nums(o.s)[0] ?? 0) & 65535;
    if (this.B6C === 1) {
      if (this.B6E === 0) this.B1C |= 4194304;
    } else this.B1C |= 16384;
    if (this.B6C >= 3) this.B1C |= 33554432;
    if (this.B70 >= 2) this.B1C |= 8388608 | 16384;
    this.B24 = 0;
    this.B38 = null;
    this.B3C = 0;
    this.B44 = null;
    this.B48 = null;
    this.B4E = 0;
    this.B4C = 0;
    this.B52 = 0;
    this.B50 = 0;
    this.B56 = 0;
    this.B54 = 0;
    this.B74 = 0;
    this.B1C |= 536870912;
    this.player_status = estadoSnake(this.sis);
    this.B30 = V();
    this.BE0 = 0;
    this.BE4 = 0;
    this.B72 = 0;
    this.nav = new Nav(this, this.mov);
    this.camEsp = null;
    this.sis.vox.init();
    this.sis.flujo.precargar(this.vox_ids.filter(x => x > 0));
    this.pose0(0);
    this.motor.accion(0, 0);
    this.mov.y += this.motor.altura;
    this.actControl();
    this.step.set(0, 0, 0);
    const mgr = this.mgr, prev = mgr.camaraEspecial;
    this.camPrev = prev;
    this.camFn = () => (this.vivo && this.listo && this.camEsp ? this.camaraJohnny() : null) || (prev ? prev.call(mgr) : null);
    mgr.camaraEspecial = this.camFn;
    this.log("inicio", {
      modo: this.B0C,
      dia: this.B6C,
      se_rindio: this.B6E,
      f: this.B70,
      b1c: this.B1C.toString(16),
      rutas: this.rutas.map(r => r.length)
    });
  }
  recibir(v) {
    this.buzon.push(v.slice());
    return v[0] === 4282;
  }
  setAction(a) {
    if (this.motor.action !== a) this.motor.accion(a, 4);
  }
  clearAdjust() {
    for (const a of this.adjust) {
      a[0] = 0;
      a[1] = 0;
      a[2] = 0;
    }
  }
  adj(si) {
    this.adjOn = si;
    if (!si) this.clearAdjust();
  }
  ir(fn) {
    this.B38 = fn;
    this.B4E = 0;
    this.B4C = 0;
    this.B3C = 0;
  }
  punto() {
    const R = this.rutas[this.AD0r];
    return R[Math.min(this.AD0i, R.length - 1)];
  }
  sn() {
    return this.sis.snake();
  }
  st() {
    return estadoSnake(this.sis);
  }
  stream() {
    return this.sis.streamStatus();
  }
  marcar(m) {
    this.marca(m === 3 ? "?" : "!");
  }
  niebla() {
    this.chispa(this.v3m(this.mov).add(V(0, 1.1, 0)), .3, 8, 14540253);
  }
  vibrar(cual = "alerta") {
    vibrarMando(VIB_JOHNNY[cual]);
  }
  j4194() {
    const a = this.v3m(this.sn()), b = this.v3m(this.mov);
    return this.J.libre(a, b) ? -1 : Math.round(a.distanceTo(b) * 1e3);
  }
  j424C(func) {
    if (this.B1C & 1048576) return;
    if (this.B38 !== this.j5520 && this.B38 !== this.j588C && this.stream() === -1 && this.J.gvTime % 320 === 0) {
      this.B44 = func;
      this.ir(this.j5520);
    }
  }
  j430C() {
    this.AD4 = 0;
    const q = this.punto().p, d = V(q.x - this.mov.x, q.y, q.z - this.mov.z);
    this.turn = vecDir(d.x, d.z);
    if (d.length() < 320) this.AD4 = 1;
  }
  j4388(hash) {
    if (this.B5C !== 0) return 1;
    return dentro(this.sis, hash, this.mov) ? 1 : 0;
  }
  j43D0(hash) {
    return dentro(this.sis, hash, this.sn()) ? 1 : 0;
  }
  j4418() {
    let n = 0;
    const sn = this.sn();
    if (dentro(this.sis, 16805, sn)) n |= 2;
    if (dentro(this.sis, 26009, sn)) n |= 8;
    if (this.st() & PLAYER_INTRUDE) n |= 1;
    if ((n & 1) !== (this.B24 & 1)) {
      if (n & 1) {
        if (this.B1C & 32) this.B1C |= 64; else this.B1C |= 16;
      } else {
        if (!(this.B1C & 32)) this.B1C |= 1073741824;
        this.B1C &= ~16;
        this.B1C &= ~64;
      }
    }
    this.B24 = n;
  }
  j44F8() {
    const st = this.st();
    if ((this.player_status & PLAYER_KETCHUP) !== (st & PLAYER_KETCHUP)) {
      if (st & PLAYER_KETCHUP) {
        if (this.B1C & 32) {
          if (!(this.B1C & 2)) this.B1C |= 256;
        } else this.B1C |= 2;
      } else {
        if (!(this.B1C & 32)) this.B1C |= 2;
        this.B1C &= ~256;
      }
    }
    this.player_status = st;
  }
  j4588() {
    this.B48 = this.B38;
    this.ir(this.j7F78);
  }
  j45AC() {
    const fB24 = this.B24;
    if (this.B70 === 2 && !(this.B1C & 2)) {
      if (!(this.B1C & 32) && this.ketchupUsada() && !(this.st() & PLAYER_KETCHUP)) this.B1C |= 524290;
    }
    if (fB24 & 1) {
      if (this.B1C & 64) {
        this.sis.vox.init();
        this.se2(SE.EXCLAMATION);
        this.sis.vox.queueDelay(this.vox_ids[6], 4);
        this.B0C = 6;
        this.B10 = 0;
        this.log("se escapó (debajo de la cama)");
      }
    } else if (this.B1C & 256) {
      this.j4588();
      this.B48 = this.j794C;
    } else if (this.B1C & 2 && this.st() & PLAYER_KETCHUP && !(this.B1C & 524288)) {
      this.B1C |= 134217728;
      this.j4588();
      this.B1C |= 524288;
    }
  }
  ketchupUsada() {
    const inv = this.J.ctx.inventario;
    return inv ? (inv.items?.[9] ?? -1) === -1 : false;
  }
  j470C() {
    return this.B24 & 1 ^ 1;
  }
  j4720(r) {
    this.AD0r = r;
    this.AD0i = 0;
  }
  j4734() {
    let to = vecDir(0 - this.mov.x, 7e3 - this.mov.z) - this.rot & 4095;
    if (to > 2048) to -= 4096;
    to = Math.max(-768, Math.min(768, to));
    this.adjust[6][1] = nearExp(this.adjust[6][1], to, 4);
  }
  j47C4() {
    const s = this.sn();
    this.turn = vecDir(s.x - this.mov.x, s.z - this.mov.z);
  }
  j4804() {
    const s = this.sn();
    return Math.round(Math.hypot(s.x - this.mov.x, s.z - this.mov.z));
  }
  j4860() {
    const s = this.sn(), vd = vecDir(s.x - this.mov.x, s.z - this.mov.z), r = this.rot & 4095;
    if (r > 480 && r < 3615) return r - 480 < vd && vd < r + 480 ? 1 : 0;
    if (r < 480) return vd < r + 480 || (r - 480 & 4095) < vd ? 1 : 0;
    return r - 480 < vd || vd < (r + 480 & 4095) ? 1 : 0;
  }
  j4934() {
    const c = typeof window !== "undefined" ? window.__mgs?.cuerpo?.obj : null;
    let h = null;
    if (c) {
      const b = c.getObjectByName("hueso_5");
      if (b) {
        const w = new THREE.Vector3;
        b.getWorldPosition(w);
        h = w.multiplyScalar(1e3);
      }
    }
    if (!h) {
      h = this.sn();
      h.y += 400;
    }
    const a = this.puntoHuesoMM(9), d = h.sub(a);
    let vd = -vecDir(d.y, Math.round(Math.hypot(d.x, d.z)));
    if (vd < -2048) vd += 4096;
    this.adjust[2][0] = nearExp(this.adjust[2][0], vd, 4);
    this.adjust[6][0] = nearExp(this.adjust[6][0], vd, 4);
    this.adjust[7][0] = nearExp(this.adjust[7][0], vd, 4);
    this.adjust[6][1] = 0;
  }
  j4A98(arg) {
    this.execProc(this.proc_id[2], [ arg ]);
  }
  j4AD0(hash) {
    this.sis.enviar(hash, [ HASH.ENTER, NOMBRE_JOHNNY ]);
    if (hash === ROU_TOBIRA) {
      this.B5C = 1;
      this.j4A98(1);
    } else this.B5E = 1;
    this.log("abre", {
      puerta: hash.toString(16)
    });
  }
  j4B58(hash) {
    this.sis.enviar(hash, [ HASH.LEAVE, NOMBRE_JOHNNY ]);
    if (hash === ROU_TOBIRA) {
      this.B5C = 0;
      this.j4A98(0);
    } else this.B5E = 0;
    this.log("cierra", {
      puerta: hash.toString(16)
    });
  }
  j4BDC(a1, a2, func) {
    this.B58 = a1;
    this.B5A = a2;
    this.B44 = func;
  }
  j4BEC(i) {
    this.sangre(this.puntoHueso(i, {
      x: 0,
      y: 0,
      z: 100
    }));
  }
  j4C54() {
    const b70 = this.B70;
    if (this.B6C >= 5) {
      this.B70 = 3;
      return 1;
    }
    if (b70 === 0) return 0;
    if (b70 === 2 && !(this.B1C & 2)) return 0;
    if (b70 !== 1) return (this.B1C & 2) > 0 ? 1 : 0;
    return 1;
  }
  j4CCC() {
    if (this.B68 < 0) return;
    if (this.B70 < 3 && this.B1C & 2) this.B70 = 3;
    const args = [ this.B70, this.B1C & 1, this.B0C === 3 ? 1 : 0, this.B1C & 4096 ? 1 : 0 ];
    this.log("fin", {
      args: args
    });
    this.execProc(this.proc_id[0], args);
    this.destruir();
  }
  j4D8C() {
    this.execProc(this.proc_id[6], [ this.G.d32C8 ]);
  }
  j4DCC() {
    if (!(this.B1C & 8)) return;
    this.B1C &= ~8;
    if (this.B14 < 0) {
      this.j4CCC();
      return;
    }
    if (this.B1C & 8192) {
      this.B1C &= ~8192;
      if (this.j4C54() !== 0) {
        this.j4CCC();
        return;
      }
      this.B10 = 0;
      this.B0C = this.B14;
    } else {
      this.B0C = this.B14;
      this.B10 = 0;
    }
    this.log("modo", {
      modo: this.B0C
    });
  }
  j4E5C() {
    if (this.B72 !== 0 && --this.B72 === 0) this.se(SE.DOOR_CLOSE3, this.B04);
  }
  j4F24(si) {
    if (si) {
      this.B1C |= 268435456;
      this.alerta = true;
    } else {
      this.B1C &= ~268435456;
      this.alerta = false;
    }
  }
  j4FAC() {
    const f = this.motor.info1.frame, a = this.motor.action;
    if (a === 1) {
      if (f === 0) this.se(160, this.mov);
      if (f === 12) this.se(161, this.mov);
    } else if (a === 2 || a === 33) {
      if (f === 0) this.se(160, this.mov);
      if (f === 8) this.se(161, this.mov);
    }
  }
  j5064() {
    if (this.j4388(16805) !== 0 || this.B5C === 1) this.ir(this.j7428); else {
      this.B48 = this.j6C10;
      this.ir(this.j7F78);
    }
  }
  j50D0() {
    if (!(this.B1C & 16) || !(this.st() & PLAYER_INTRUDE)) {
      this.B74 = 0;
      return;
    }
    if (this.B74 < 0 || this.B74 >= 24) return;
    this.B74++;
  }
  vitalBlanco() {
    return this.vital;
  }
  capturable() {
    return this.blanco && this.vivo && this.listo && !(this.B1C & 4096) && !(this.B1C & 2048) && !this.claseDown && this.B1C >= 0;
  }
  capturar(a_mode) {
    this.captura = {
      a_mode: a_mode
    };
  }
  j5124() {
    this.golpes = [];
    this.captura = null;
  }
  j5168() {
    if (this.B1C & 4096) return;
    if (this.B1C < 0) {
      this.j5124();
      return;
    }
    const d = this.tomarDaño(), vm = this.sis.vidaMax();
    if (d) {
      if (d.a_mode === 3) {
        this.faint -= 1;
        this.vital -= Math.trunc(vm / 48);
      } else if (d.a_mode === 4) {
        this.faint -= 3;
        this.vital -= Math.trunc(vm / 32);
      } else if (d.a_mode === 1 || d.a_mode === 2) this.vital -= d.daño;
      if (!(this.B1C & 512)) {
        if (d.a_mode === 3) {
          this.ir(this.j8400);
          this.se(SE.PUNCH_HIT, this.mov);
          this.se(SE.V_PUNCHED, this.mov);
          this.niebla();
          if (this.faint <= 0) this.ir(this.j9144);
        } else if (d.a_mode === 4) {
          this.ir(this.j8400);
          this.se(SE.KICK_HIT, this.mov);
          this.se(SE.V_THROWN, this.mov);
          this.niebla();
          if (this.faint <= 0) this.ir(this.j9144);
        } else if (d.a_mode === 1) {
          this.ir(this.j8400);
          this.B1C |= 1024;
          this.niebla();
          this.se(SE.V_PUNCHED, this.mov);
        } else {
          const s = this.sn();
          this.B30 = V(Math.sign(this.mov.x - s.x) * 40 * 4, 0, Math.sign(this.mov.z - s.z) * 40 * 4);
          this.ir(this.j854C);
          this.niebla();
          this.se(SE.V_THROWN, this.mov);
        }
      } else this.j4BEC(6);
      this.j5124();
      this.B1C &= ~2048;
      this.claseDown = false;
      this.sis.vox.init();
      this.log("golpe", {
        a_mode: d.a_mode,
        vital: this.vital,
        faint: this.faint
      });
    } else if (this.captura) {
      const c = this.captura;
      this.captura = null;
      if (c.a_mode === 36) {
        this.claseDown = true;
        this.ir(this.j8654);
        this.adj(false);
        this.sis.vox.init();
        this.log("tirado");
      } else if (!(this.B1C & 2048)) {
        this.claseDown = true;
        this.se(SE.V_GRABBED, this.mov);
        this.BE4 = 0;
        this.ir(this.j8B14);
        this.adj(false);
        this.sis.vox.init();
        this.log("agarrado");
      }
    }
  }
  j54A8=arg1 => {
    if (arg1 === 0) {
      this.setAction(0);
      this.j47C4();
    }
    if (arg1 === 60) {
      this.B38 = this.B44;
      this.B4E = 0;
      this.B4C = 0;
      this.B3C = 0;
    }
  };
  j5520=action => {
    if (action === 0) {
      const i = this.B1C & 16384 ? 10 : 0;
      this.sis.vox.init();
      this.sis.vox.queueDelay(this.vox_ids[i], 4);
      this.BE0 = this.vox_ids[i];
      this.setAction(0);
      this.adj(true);
    }
    switch (this.B4C) {
     case 0:
      if (this.BE0 === this.vox_ids[10]) {
        if (this.stream() === 2) {
          this.setAction(15);
          this.B4C = 1;
        }
      } else if (this.stream() === 2 && ++this.B4E === 42) {
        this.setAction(15);
        this.B4C = 1;
        this.B4E = 0;
      }
      break;

     case 1:
      if (this.motor.action === 15 && this.motor.isEnd !== 0) {
        if (this.B1C & 16384) {
          this.ir(this.B44);
          this.adj(false);
        } else {
          this.motor.accion(0, 4);
          this.B4C = 2;
        }
      }
      break;

     case 2:
      if (this.stream() === -1) {
        this.ir(this.B44);
        this.B1C |= 16384;
        this.adj(false);
      }
      break;
    }
  };
  j57D0=arg1 => {
    if (arg1 === 0) {
      this.turn = 3072;
      this.B74 = -1;
      this.B1C |= 32;
      this.setAction(this.J.gvTime & 1 ? 10 : 11);
    }
    if (arg1 === 24) this.se2(SE.V_YAWN);
    if (this.motor.isEnd !== 0) this.ir(this.j5A7C);
  };
  j588C=arg1 => {
    if (arg1 === 0) {
      const s = this.sn();
      this.turn = vecDir(s.x - this.mov.x, s.z - this.mov.z);
      this.setAction(0);
      this.sis.vox.init();
      this.sis.vox.queueDelay(this.vox_ids[12], 4);
    }
    if (arg1 > 16) {
      const st = this.stream();
      if (st === -1) {
        this.B4E = 0;
        this.B4C = 0;
        this.B3C = 0;
        this.B74 = st;
        this.B38 = this.B44;
      }
    }
  };
  j594C() {
    if (this.stream() === -1 && this.ruido()) this.sis.vox.queue(this.vox_ids[this.J.gvTime & 1 ? 14 : 16]);
  }
  ruido() {
    const r = this.J.ruido;
    return !!(r && r.p > 0);
  }
  j59B8=arg1 => {
    if (arg1 === 0) {
      this.turn = 3072;
      this.setAction(0);
    }
    nearExp2V(this.mov, this.AFC);
    if ((this.B74 ^ 24) === 0) {
      this.B44 = this.j59B8;
      this.ir(this.j588C);
    } else if (arg1 === 90) {
      this.B44 = this.j59B8;
      this.ir(this.j54A8);
    } else this.j594C();
  };
  j5A7C=action => {
    if (action === 0) {
      this.B1C |= 32;
      this.radarVista = false;
      this.setAction(12);
      this.B74 = -1;
    }
    if (!(this.B1C & 65536) && action % 100 === 0) this.chispa(this.puntoHueso(6, {
      x: 0,
      y: 150,
      z: 0
    }), .15, 30, 16777215);
    switch (this.B4C) {
     case 0:
      if (!(action & 63)) this.se2(SE.V_SNORE);
      if (action === 348) {
        this.B4C = 1;
        this.setAction(13);
      }
      break;

     case 1:
      if (this.motor.isEnd !== 0) {
        this.B1C |= 65536;
        this.setAction(0);
        this.marcar(0);
        if (!(this.B1C & 33554432)) {
          this.sis.vox.queue(this.vox_ids[3]);
          this.B4C = 2;
          this.B1C |= 33554432;
        } else {
          this.B14 = 2;
          this.B1C |= 8;
          this.radarVista = true;
          this.B1C &= ~65536;
        }
        this.B1C &= ~32;
      }
      break;

     case 2:
      if (action === 511) this.setAction(10);
      if (this.motor.action === 10 && this.motor.isEnd !== 0) this.motor.accion(0, 4);
      if (action >= 512 && this.stream() === -1) {
        this.B4C = 3;
        this.sis.vox.queue(this.vox_ids[4]);
        this.setAction(11);
      }
      break;

     case 3:
      if (this.motor.action === 11 && this.motor.isEnd !== 0) this.motor.accion(0, 4);
      if (this.motor.action === 0 && this.stream() === -1) {
        this.B14 = 2;
        this.B1C |= 8;
        this.radarVista = true;
        this.B1C &= ~65536;
      }
      break;
    }
  };
  j5DE4=action => {
    if (action === 0) {
      this.adj(true);
      this.AD0i++;
      this.setAction(1);
    }
    this.j4734();
    this.j430C();
    if (this.AD4 !== 0) {
      if ((this.punto().pad & 3072) >> 10 === 2) {
        if (this.B4C === 0) {
          this.adj(false);
          if (this.B6E === 1 || (this.B1C & 4194304) !== 0) {
            this.B14 = 0;
            this.B1C |= 8;
          } else {
            this.ir(this.j92E0);
            return;
          }
          this.B4C = 1;
        }
      } else {
        this.adj(false);
        this.B44 = this.j5DE4;
        if (this.B1C & 536870912) {
          this.ir(this.j5520);
          this.B1C &= ~536870912;
          return;
        }
        if ((this.B74 ^ 24) === 0) {
          this.B44 = this.j5DE4;
          this.ir(this.j588C);
          return;
        }
        if (randS(128) > 0 || (this.B1C & 1048576) !== 0 || this.stream() !== -1) this.ir(this.j54A8); else this.ir(this.j5520);
      }
    }
    this.j594C();
  };
  j6054=action => {
    if (action === 0) {
      this.B74 = -1;
      this.B1C |= 32;
      this.setAction(31);
      const i = !(this.B1C & 8388608) ? 1 : 2;
      this.B1C |= 8388608;
      this.sis.vox.init();
      this.sis.vox.queueDelay(this.vox_ids[i], 4);
      this.se2(180);
      this.log("diarrea", {
        voz: this.vox_ids[i]
      });
    }
    if (this.B4C === 0) {
      if (this.motor.isEnd !== 0) {
        this.setAction(32);
        this.B4C = 1;
      }
    } else if (this.stream() === -1) this.ir(this.j6268);
  };
  j6170=arg1 => {
    if (arg1 === 0) {
      this.setAction(0);
      this.radarVista = false;
    }
    if (arg1 === 300 && this.B4C === 0) {
      this.B14 = 4;
      this.B4C = 1;
      this.B1C |= 8192 | 8;
    }
  };
  j6204=arg1 => {
    if (arg1 === 0) {
      this.B1C |= 32;
      this.setAction(0);
      this.ir(this.j64B0);
    }
  };
  j6268=action => {
    if (action === 0) {
      this.B1C |= 32;
      this.AD0i++;
      this.setAction(33);
    }
    this.j430C();
    if (this.AD4 !== 0) {
      if ((this.punto().pad & 3072) >> 10 === 2) this.ir(this.j6170); else this.AD0i++;
    }
  };
  j631C=action => {
    if (action === 0) {
      this.turn = 0;
      this.setAction(10);
      this.sis.vox.queue(this.vox_ids[5]);
    }
    if (this.motor.isEnd !== 0 && this.motor.action === 10) {
      this.motor.accion(0, 4);
      this.B4C++;
    }
    if (this.motor.action === 0 && this.stream() === -1) this.B4C++;
    if (this.B4C === 2) {
      this.ir(this.j64B0);
      this.B1C |= 16777216;
    }
  };
  j6418=() => {
    this.B1C |= 32;
    this.setAction(0);
    this.mov.x = 6e3;
    this.mov.z = 750;
    this.rot = 1024;
    this.turn = 1024;
    this.ir(this.j64B0);
    this.AD0i += 2;
    this.B1C |= 16777216;
  };
  j64B0=action => {
    if (action === 0) {
      this.B1C |= 32;
      this.AD0i++;
      this.setAction(1);
      if (!(this.B1C & 16777216)) {
        this.se2(179);
        this.se2(182);
      }
    }
    if (this.j4388(23741)) this.B1C &= ~32;
    this.j430C();
    if (this.AD4 !== 0) {
      if ((this.punto().pad & 3072) >> 10 === 2) {
        if (this.B4C === 0) {
          this.B14 = 0;
          this.B1C &= ~16777216;
          this.B1C |= 8;
        }
      } else if ((this.punto().pad & 224) >> 5 === 4) this.ir(this.j631C); else this.AD0i++;
    }
  };
  j65F8=arg1 => {
    if (arg1 === 0) {
      this.setAction(6);
      this.turn = (this.punto().pad & 31) * 512 & 4095;
      this.marcar(3);
    }
    if (this.j470C() !== 0) this.j5064(); else if (this.motor.isEnd !== 0) this.ir(this.j69D8);
  };
  j66A4=action => {
    if (action === 0) {
      this.B1C &= ~2147483648;
      this.adj(false);
      this.turn = (this.punto().pad & 31) * 512 & 4095;
      this.setAction(34);
    }
    if (this.motor.isEnd !== 0 && this.B4C === 0) {
      this.setAction(38);
      this.B4C = 1;
    }
    if (this.B4C !== 0) {
      if (this.j4860() || action === 240 || (this.B24 & 2) === 0) this.ir(this.j7428); else if (this.motor.isEnd !== 0) {
        this.mov.copy(this.punto().p);
        this.marcar(3);
      }
    }
  };
  j6850=arg1 => {
    if (arg1 === 0) {
      this.B1C |= 2147483648;
      if (this.B5A === 0) {
        this.j4B58(this.B58);
        this.B72 = 16;
      }
      this.setAction(35);
      this.se2(181);
    }
    if (this.motor.isEnd !== 0) {
      if (this.B5A === 1) {
        this.j4AD0(this.B58);
        this.B72 = 16;
      }
      this.B4E = 0;
      this.B4C = 0;
      this.B3C = 0;
      this.B38 = this.B44;
    }
  };
  j6918=arg1 => {
    if (arg1 === 0) {
      this.B1C &= ~2147483648;
      this.adj(true);
      this.setAction(2);
      this.nav.setTarget(this.rutas[3][0].p);
    }
    this.j4734();
    if (this.nav.zoneNavi() < 0) {
      this.j4720(3);
      this.ir(this.j65F8);
    }
  };
  j69D8=action => {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.adj(true);
      this.setAction(2);
      this.AD0i++;
    }
    this.j4734();
    if (this.j470C()) {
      this.adj(false);
      this.j5064();
      return;
    }
    this.j430C();
    if (this.AD4 !== 0) {
      const a1 = (this.punto().pad & 3072) >> 10, a2 = (this.punto().pad & 224) >> 5;
      if (a1 === 2) this.ir(this.j66A4); else if (a2 === 1) {
        this.adj(false);
        this.ir(this.j65F8);
      } else if (a2 === 2) {
        this.adj(false);
        this.turn = 3072;
        this.j4BDC(ROU_TOBIRA, 1, this.j69D8);
        this.ir(this.j6850);
      } else this.AD0i++;
    }
  };
  j6C10=action => {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.adj(true);
      this.setAction(1);
      this.nav.setTarget(this.rutas[0][0].p);
      const b = this.B1C;
      this.B1C &= ~64;
      if (b & 256) {
        this.B1C &= ~256;
        this.B1C |= 2;
      }
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.j4F24(0);
    }
    this.j4734();
    this.nav.zoneNavi();
    if (this.nav.near(this.mov, 250)) {
      this.adj(false);
      this.B14 = 2;
      this.B1C |= 8;
    }
  };
  j6D84=action => {
    if (this.B24 & 8 && !this.claseDown) {
      this.ir(this.j7A64);
      return;
    }
    let len = this.j4804();
    const intr = !!(this.st() & PLAYER_INTRUDE);
    if (intr) len = Math.round(Math.hypot(-700 - this.mov.x, 8e3 - this.mov.z));
    if (action === 0) {
      this.B1C &= ~2147483648;
      this.setAction(2);
      if (len < 2500 && (intr || this.j4194() < 0)) {
        this.B44 = this.j6D84;
        this.ir(this.j7160);
        return;
      }
      this.j4F24(1);
      this.nav.target_next = -1;
    }
    if (intr) this.nav.setTarget(V(-700, 0, 8e3)); else this.nav.setTargetPlayer();
    this.nav.zoneNavi();
    if (len < 1500 && (intr || this.j4194() < 0)) {
      this.B44 = this.j6D84;
      this.ir(this.j7160);
    }
    if (this.B70 !== 4 && this.B24 & 2) this.ir(this.j6FC0);
  };
  j6FC0=action => {
    if (action === 0) {
      this.B1C &= ~2147483648;
      this.setAction(2);
      this.nav.setTarget(this.B04);
      this.j4F24(1);
    }
    this.nav.zoneNavi();
    if (this.nav.near(this.mov, 450)) {
      const s = this.sn(), len = Math.round(s.clone().sub(this.mov).length());
      if (this.B24 & 2 && len > 1500) {
        this.turn = 3072;
        this.j4BDC(ROU_TOBIRA, 0, this.j6C10);
        this.ir(this.j6850);
        this.sis.ponerEstado(STATE.PADRELEASE);
      } else this.ir(this.j6D84);
    } else if (action === 24 && this.B24 & 2) {
      this.B44 = this.j6FC0;
      this.ir(this.j7160);
    }
  };
  j7160=arg1 => {
    if (arg1 === 0) {
      this.B1C &= ~2147483648;
      let a;
      if (this.st() & PLAYER_INTRUDE) {
        this.B4E = 1;
        a = 41;
      } else a = 8;
      this.adj(true);
      this.setAction(a);
      this.j4F24(1);
    }
    this.j47C4();
    if (this.B4E === 1) {
      this.adjust[3][0] = -this.adjust[2][0];
      this.turn = this.turn + 320 & 4095;
    }
    this.j4934();
    let trigger = 1;
    if (arg1 === 4) {
      this.B4C = 1;
      if (this.B4E === 0) this.setAction(9);
    }
    if (this.motor.action === 41) {
      if (arg1 === 16 || arg1 === 22 || arg1 === 28) trigger |= 2;
    } else if (arg1 !== 12 && arg1 !== 17) {
      if (arg1 === 22) trigger |= 2;
    } else trigger |= 2;
    if (this.motor.isEnd !== 0 && this.B4C === 1) {
      if (this.st() & PLAYER_INTRUDE) this.ir(this.j7160); else {
        this.adj(false);
        this.B4E = 0;
        this.B4C = 0;
        this.B3C = 0;
        this.B38 = this.B44;
      }
    } else this.trigger = trigger;
  };
  j7378=arg1 => {
    if (arg1 === 0) {
      this.B1C &= ~2147483648;
      this.adj(true);
      this.setAction(8);
      this.j4F24(1);
    }
    if (arg1 === 32) this.ir(this.j7160);
    this.j47C4();
  };
  j7428=action => {
    if (action === 0) {
      this.B1C &= ~2147483648;
      this.sis.vox.init();
      this.sis.vox.queueDelay(this.vox_ids[13], 4);
      this.se2(SE.EXCLAMATION);
      this.vibrar();
      this.marcar(0);
      this.setAction(5);
      this.B1C &= ~1073741824;
      this.log("!");
    }
    this.j47C4();
    if (this.motor.isEnd !== 0) {
      if (this.j4388(16805) !== 0) {
        this.B44 = this.j6FC0;
        this.ir(this.B24 & 2 ? this.j7378 : this.j6FC0);
      } else this.ir(this.j6C10);
    }
  };
  j753C=action => {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.sis.vox.init();
      this.setAction(2);
      if (this.B50 === 0) this.nav.setTarget(V(0, 0, 3500)); else if (this.B50 === 1) this.nav.setTarget(this.B04); else if (this.B50 === 2) {
        if (this.st() & PLAYER_INTRUDE) this.nav.setTarget(V(-750, 0, 8e3)); else {
          this.nav.target_next = -1;
          this.nav.setTargetPlayer();
        }
      }
      this.log("va a ver", {
        paso: this.B50
      });
    }
    if (!(this.st() & PLAYER_KETCHUP)) {
      this.B50 = 0;
      this.B1C |= 2;
      this.B1C &= ~256;
      this.vibrar();
      this.B1C |= 524290;
      this.B1C &= ~256;
      if (this.j4388(16805)) {
        this.B44 = this.j6FC0;
        if (this.B24 & 2) {
          this.ir(this.j7378);
          return;
        }
        this.B38 = this.j6FC0;
      } else {
        this.marcar(0);
        this.se2(SE.EXCLAMATION);
        this.sis.vox.init();
        this.sis.vox.queueDelay(this.vox_ids[8], 4);
        this.vibrar();
        this.execProc(this.proc_id[4], []);
        this.B38 = this.j6C10;
      }
      this.B4E = 0;
      this.B4C = 0;
      this.B3C = 0;
      return;
    }
    this.nav.zoneNavi();
    if (this.nav.near(this.mov, 500)) {
      this.B50++;
      if (this.B50 === 2) {
        this.turn = 3072;
        this.j4BDC(ROU_TOBIRA, 1, this.j753C);
        this.B38 = this.j6850;
      } else if (this.B50 === 3) this.B38 = this.j7804; else this.B38 = this.j794C;
      this.B4E = 0;
      this.B4C = 0;
      this.B3C = 0;
    }
  };
  j7804=arg1 => {
    if (arg1 === 0) {
      this.B1C &= ~2147483648;
      this.setAction(0);
      this.marcar(3);
      this.B60 = this.sn();
      this.B60pad = this.sis.dirSnakeRot();
    }
    const d = this.sn().sub(this.B60);
    if (d.length() < 5) {
      if (Math.abs(this.B60pad - this.sis.dirSnakeRot()) >= 5) this.ir(this.j794C);
    } else this.ir(this.j794C);
    if (arg1 === 64) this.ir(this.j794C);
  };
  j794C=arg1 => {
    if (arg1 === 0) {
      this.B1C &= ~2147483648;
      this.setAction(5);
    }
    this.j47C4();
    if (this.motor.isEnd !== 0) {
      if (this.B50 === 3) {
        this.B50 = 0;
        this.B44 = this.j6FC0;
        this.marcar(0);
        this.se2(SE.EXCLAMATION);
        this.vibrar();
        this.execProc(this.proc_id[4], []);
        this.ir(this.j7378);
        this.B1C |= 524288 | 2;
        this.B1C &= ~256;
      } else this.ir(this.j753C);
    }
  };
  j7A64=action => {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.sis.vox.init();
      this.sis.abrirCine();
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.setAction(2);
      this.nav.target_next = -1;
    }
    switch (this.B4C) {
     case 0:
      {
        this.nav.setTargetPlayer();
        this.nav.zoneNavi();
        const len = this.j4804();
        if (len < 5e3) {
          const s = this.sn();
          this.sis.girarSnake(vecDir(this.mov.x - s.x, this.mov.z - s.z));
        }
        if (len < 1500 && this.j4194() < 0) {
          this.setAction(8);
          this.B4C = 1;
        }
        break;
      }

     case 1:
      this.j47C4();
      if (++this.B4E === 32) this.ir(this.j7BF8);
      break;
    }
  };
  j7BF8=action => {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.blanco = false;
      this.sis.vox.init();
      this.setAction(31);
      this.se2(180);
    }
    if (action === 4) this.sis.vox.queue(this.vox_ids[2]);
    switch (this.B4C) {
     case 0:
      if (this.motor.isEnd !== 0) {
        this.setAction(32);
        this.B4C = 1;
      }
      break;

     case 1:
      if (this.stream() === -1) {
        this.setAction(33);
        this.nav.setTarget(V(6500, 0, -1500));
        this.B4C = 2;
      }
      break;

     case 2:
     case 3:
      {
        this.ocultarSnake(true);
        const s = this.sn();
        s.y += 500;
        const dir = vecDir(5500 - s.x, 750 - s.z);
        this.camEsp = {
          pos: s,
          rot: {
            x: 0,
            y: dir,
            z: 0
          }
        };
        if (this.B4C === 2) {
          this.nav.zoneNavi();
          if (this.nav.dist(this.mov) < 500) {
            this.radarVista = false;
            this.setAction(0);
            this.B4C = 3;
          }
        } else if (++this.B4E === 32) {
          this.camEsp = null;
          this.B4C = 4;
          this.B4E = 0;
        }
        break;
      }

     case 4:
      if (++this.B4E === 6) {
        this.ocultarSnake(false);
        this.sis.cerrarCine();
        this.j4D8C();
        this.j4F24(0);
        this.execProc(this.proc_id[5], []);
        this.sis.sacarEstado(STATE.PADRELEASE);
        this.B4C = 5;
      }
      break;

     case 5:
      if (this.stream() === -1 && this.j43D0(44691) && this.st() & (PLAYER_CHECK_WALL | 65536)) this.sis.vox.queueDelay(this.vox_ids[17], 4);
      break;
    }
  };
  j7F78=action => {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.setAction(0);
      this.adj(false);
      this.marcar(0);
      this.se2(SE.EXCLAMATION);
      this.vibrar();
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.log("toma");
    }
    this.ocultarSnake(false);
    this.j47C4();
    const off = this.mov.x >= -2700 ? V(-350, 1e3, -750) : V(450, 1e3, -750);
    const e = new THREE.Euler(0, this.rot * ANG, 0, "YXZ"), pos = this.mov.clone().add(off.applyEuler(e));
    const s = this.sn();
    this.camEsp = {
      pos: pos,
      rot: {
        x: 320,
        y: vecDir(s.x - pos.x, s.z - pos.z),
        z: 0
      }
    };
    const volver = () => {
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.camEsp = null;
      if (this.B48 === this.j64B0 || this.B48 === this.j5DE4) this.AD0i--;
      this.B4E = 0;
      this.B4C = 0;
      this.B3C = 0;
      this.B38 = this.B48;
    };
    if (this.B1C & 67108864) {
      if (action === 64) {
        this.sis.enviar(NOMBRE_SNAKE, [ HASH.RUN_MOVE, -250, 0, s16(this.sn().z), 500, 513 ]);
        this.correrA = V(-250, 0, this.sn().z);
      }
      if (action > 64 && !this.snakeCorriendo()) {
        this.B1C &= ~67108864;
        volver();
      }
    } else if (this.B1C & 1073741824) {
      if (this.B48 === this.j6C10 && action === 0) {
        this.sis.vox.init();
        this.sis.vox.queueDelay(this.vox_ids[13], 4);
      }
      if (action === 65 || this.sis.vox.fin()) {
        this.sis.vox.init();
        volver();
        this.B1C &= ~1073741824;
      }
    } else if (this.B1C & 134217728) {
      if (action === 0) {
        this.sis.vox.init();
        this.sis.vox.queueDelay(this.vox_ids[8], 4);
        this.execProc(this.proc_id[4], []);
      }
      this.sis.ponerEstado(STATE.PADRELEASE);
      if (action === 100) volver();
    } else {
      if (action === 0) {
        this.sis.vox.init();
        this.sis.vox.queueDelay(this.vox_ids[7], 4);
      }
      if (action === 32) {
        this.camEsp = null;
        this.B0C = 7;
        this.B10 = 0;
        this.sis.sacarEstado(STATE.PADRELEASE);
      }
    }
  };
  snakeCorriendo() {
    if (!this.correrA) return false;
    const r = this.J.ctx.rig.position;
    if (Math.hypot(r.x * 1e3 - this.correrA.x, r.z * 1e3 - this.correrA.z) < 300) {
      this.correrA = null;
      return false;
    }
    return true;
  }
  j8400=action => {
    if (action === 0) {
      if (this.B1C & 1024) {
        this.B1C |= 512;
        this.B1C &= ~1024;
      }
      this.setAction(this.J.gvTime & 1 ? 16 : 17);
    }
    if (this.motor.isEnd !== 0) {
      this.B1C &= ~512;
      if (this.vital <= 0) {
        this.ir(this.j9144);
        return;
      }
      if (this.B70 !== 4 && this.B24 & 2) this.ir(this.j6FC0); else this.ir(this.j6D84);
      if (!(this.B1C & 268435456)) {
        this.se2(SE.EXCLAMATION);
        this.vibrar();
        this.marcar(0);
      }
    }
  };
  j854C=action => {
    if (action === 0) {
      this.B1C |= 512;
      this.setAction(20);
      this.vital--;
    }
    if (action < 12) this.turn = this.turn + 170 & 4095;
    if (this.motor.isEnd !== 0) {
      this.B50 = 1;
      this.ir(this.vital > 0 ? this.j873C : this.j8FE4);
    } else {
      if (action > 16) nearExp8V(this.B30, V());
      this.step.x += this.B30.x;
      this.step.z += this.B30.z;
    }
  };
  j8654=action => {
    if (action === 0) {
      this.setAction(19);
      this.turn = this.sis.dirSnakeRot() + 2048 & 4095;
      this.vital--;
    }
    if (action === 20) {
      this.se(SE.V_PUNCHED, this.mov);
      this.se(SE.HIT_FLOOR, this.mov);
    }
    if (this.motor.isEnd !== 0) {
      this.B50 = 2;
      this.ir(this.vital > 0 ? this.j873C : this.j8FE4);
    }
  };
  j873C=action => {
    if (action === 0) {
      this.radarVista = false;
      this.B1C |= 512;
      this.claseDown = true;
      this.setAction(this.B50 === 1 ? 23 : 24);
    }
    if (this.B24 & 8) this.faint = 0;
    if (this.faint <= 0) {
      if (this.B4E === 0) {
        this.homing = false;
        this.j4F24(0);
        this.execProc(this.proc_id[5], []);
        this.execProc(this.proc_id[3], []);
        this.B4E = 1;
        this.marca("?");
        this.blanco = false;
        this.B1C |= 2147483648;
        this.log("desmayado");
      }
      if (++this.B4C === 36) this.j4D8C();
    } else if (action === 48) this.ir(this.j88C8);
  };
  j88C8=action => {
    if (action === 0) {
      const a = this.B50 === 1 ? 25 : 26;
      this.B50 = 0;
      this.setAction(a);
    }
    if (this.B24 & 8) {
      this.sis.abrirCine();
      this.sis.ponerEstado(STATE.PADRELEASE);
    }
    if (this.motor.isEnd !== 0) {
      this.claseDown = false;
      this.B1C &= ~512;
      if (this.B24 & 8) this.ir(this.j7A64); else if (this.B70 !== 4 && this.B24 & 2) this.ir(this.j6FC0); else this.ir(this.j6D84);
      if (!(this.B1C & 268435456)) {
        this.se2(SE.EXCLAMATION);
        this.vibrar();
        this.marcar(0);
      }
      this.radarVista = true;
    }
  };
  j8A2C(action) {
    if (!this.agarradoPorSnake()) {
      this.ir(this.j8C34);
      return 1;
    }
    const pa = this.sis.accionAgarre(this);
    if (pa === action) return 0;
    switch (pa) {
     case 7:
      this.ir(this.j8B14);
      break;

     case 38:
      this.ir(this.j8CD4);
      return 1;

     case 39:
      this.ir(this.j8D58);
      return 1;

     case 13:
      this.ir(this.j8E84);
      return 1;
    }
    return 0;
  }
  agarradoPorSnake() {
    return this.J.agarrado === this.proxy || this.sis.accionAgarre(this) === 39;
  }
  j8B14=action => {
    if (action === 0) {
      this.setAction(27);
      this.B1C |= 2048;
      this.turn = this.sis.dirSnakeRot();
    }
    if (++this.BE4 > 50) {
      this.setAction(42);
      if (!(this.BE4 & 7)) this.vibrar("forcejeo");
    }
    if (this.j8A2C(7) === 0 && this.B24 & 8) {
      this.J.agarrado = null;
      this.faint = 0;
      this.se(SE.V_THROWN, this.mov);
      this.ir(this.j8C34);
    }
  };
  j8C34=action => {
    if (action === 0) this.setAction(30);
    if (action === 12) this.se(SE.HIT_FLOOR, this.mov);
    if (this.motor.isEnd !== 0) {
      this.B50 = 2;
      this.ir(this.j873C);
      this.B1C &= ~2048;
    }
  };
  j8CD4=action => {
    if (action === 0) {
      this.se(SE.V_GRABBED, this.mov);
      this.setAction(28);
      this.BE4 = 0;
    }
    if (this.motor.isEnd) this.ir(this.j8B14);
    this.j8A2C(38);
  };
  j8D58=action => {
    if (action === 0) {
      this.radarVista = false;
      this.se(SE.V_THROWN, this.mov);
      this.se(SE.V_SNAPPED, this.mov);
      this.setAction(29);
      this.vital -= 255;
      this.J.agarrado = null;
      this.log("cuello");
    }
    if (action > 48 && action < 60) {
      const a = this.rot * ANG;
      this.step.x += Math.round(96 * Math.sin(a));
      this.step.z += Math.round(96 * Math.cos(a));
    }
    if (action === 55) this.se(SE.HIT_FLOOR, this.mov);
    if (this.motor.isEnd !== 0) {
      this.B50 = 2;
      this.ir(this.j8FE4);
      this.B1C &= ~2048;
    }
  };
  j8E84=action => {
    if (action === 0) this.setAction(27);
    if (++this.BE4 > 50) {
      this.setAction(42);
      if (!(this.BE4 & 7)) this.vibrar("forcejeo");
    }
    if (this.j8A2C(13) === 0) {
      this.turn = this.sis.dirSnakeRot();
      const r = this.J.ctx.rig.position, a = this.sis.dirSnakeRot() * ANG;
      const dst = V(r.x * 1e3 + 300 * Math.sin(a), this.mov.y, r.z * 1e3 + 300 * Math.cos(a));
      this.step.x += dst.x - this.mov.x;
      this.step.z += dst.z - this.mov.z;
      if (this.B24 & 8) {
        this.J.agarrado = null;
        this.faint = 0;
        this.se(SE.V_THROWN, this.mov);
        this.ir(this.j8C34);
      }
    }
  };
  j8FE4=action => {
    if (action === 0) {
      this.homing = false;
      this.radarVista = false;
      const a = this.B50 === 1 ? 23 : 24;
      this.B50 = 0;
      this.setAction(a);
      this.claseDown = true;
      this.j4F24(0);
      this.execProc(this.proc_id[5], []);
      this.B1C |= 4096;
      this.blanco = false;
      this.log("muerto");
    }
    if (action & 2) {
      if (this.o) this.o.visible = false;
      this.luzArma = false;
    } else {
      if (this.o) this.o.visible = true;
      this.luzArma = true;
    }
    if (action === 36) {
      this.B1C |= 4096;
      this.execProc(this.proc_id[3], []);
      this.j4D8C();
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.destruir();
    }
  };
  j9144=action => {
    if (action === 0) {
      this.homing = false;
      this.radarVista = false;
      this.setAction(39);
      this.blanco = false;
      this.claseDown = true;
    }
    if (action === 36) this.j4D8C();
    if (this.B4C === 0) {
      if (action === 22) this.se(SE.COLLAPSE, this.mov, "bomba");
      if (action === 44) this.se(SE.HIT_FLOOR, this.mov, "bomba");
      if (this.motor.isEnd !== 0) {
        this.j4F24(0);
        this.execProc(this.proc_id[5], []);
        this.setAction(40);
        this.B4C++;
        this.marca("?");
      }
    } else if (this.B4C === 1) {
      if (++this.B4E === 32) {
        this.B1C |= 4096;
        this.execProc(this.proc_id[3], []);
        this.log("desmayado");
      }
    }
  };
  j92E0=arg1 => {
    if (arg1 === 0) {
      this.sis.abrirCine();
      this.setAction(0);
      this.B1C |= 32;
      this.sis.ponerEstado(STATE.PADRELEASE);
      this.nav.setTarget(this.B04);
    }
    if (arg1 === 8) this.se(194, this.mov, "bomba");
    if (arg1 >= 48) {
      if (arg1 === 48) {
        this.setAction(1);
        this.sis.vox.queue(this.vox_ids[9]);
        this.adj(true);
      }
      if (this.B4C === 0) {
        this.nav.zoneNavi();
        if (this.nav.dist(this.mov) < 500) this.B4C++;
      } else if (this.B4C === 1) {
        this.setAction(0);
        this.B4C++;
      } else if (this.B4C === 2) {
        this.turn = 3072;
        this.ir(this.j949C);
      }
    }
  };
  j949C=arg1 => {
    if (arg1 === 0) {
      if (this.st() & PLAYER_KETCHUP) this.B1C |= 2;
      this.turn = 0;
      this.setAction(36);
      const s = this.sn();
      this.sis.girarSnake(vecDir(this.mov.x - s.x, this.mov.z - s.z));
    }
    if (arg1 === 24) this.execProc(this.proc_id[1], []);
    if (this.B4C === 0) {
      if (this.stream() === -1) {
        this.adj(false);
        this.sis.fundido(0, 32);
        this.sis.cerrarCine();
        this.B4C++;
      }
    } else if (this.B4C === 1 && ++this.B4E === 80) {
      this.sis.sacarEstado(STATE.PADRELEASE);
      this.j4CCC();
    }
  };
  j9644() {
    for (let i = this.msgs.length - 1; i >= 0; i--) {
      const m = this.msgs[i];
      if (m.length >= 2 && m[0] === 4282) {
        if (m[1] === HASH.ON) this.B1C &= ~1048576; else if (m[1] === HASH.OFF) this.B1C |= 1048576;
      }
    }
  }
  j96F4(B10) {
    if (B10 === 0) {
      this.B1C |= 2147483648;
      if (this.B1C & 4194304 && this.B54 === 1) {
        this.B54 = 0;
        this.B38 = this.j92E0;
      } else this.B38 = this.j59B8;
      this.B4E = 0;
      this.B4C = 0;
      this.B3C = 0;
    }
    if (this.B38 !== this.j92E0 && this.B38 !== this.j949C && this.B38 !== this.j7F78 && this.B38 !== this.j6850) {
      this.j45AC();
      if (this.B38 !== this.j7F78) {
        if (this.B1C & 1073741824) this.B1C &= ~1073741824;
        this.j424C(this.j59B8);
        if (this.B38 !== this.j5520 && this.B38 !== this.j588C && B10 >= 480 && this.stream() === -1) {
          this.B10 = 0;
          if (this.B1C & 4194304) {
            this.B1C |= 8;
            this.B14 = 2;
            this.B54++;
          } else if (this.B1C & 4) {
            this.B1C |= 8;
            this.B14 = 1;
            this.B1C &= ~4;
          } else {
            this.B1C |= 8;
            this.B14 = 3;
            this.B1C |= 4;
          }
        }
      }
    }
  }
  j98B0(B10) {
    if (B10 === 0) {
      this.ir(this.j57D0);
      this.B1C |= 2147483648;
    }
  }
  j98E4(B10) {
    if (B10 === 0) {
      this.ir(this.j5DE4);
      this.B1C |= 2147483648;
      this.j4720(0);
    }
    if (this.B38 !== this.j7F78) {
      this.j45AC();
      if (this.B38 !== this.j7F78 && this.B1C & 1073741824) this.B1C &= ~1073741824;
    }
  }
  j998C(B10) {
    if (B10 === 0) {
      this.ir(this.j6054);
      this.B1C |= 2147483648;
      this.j4720(1);
    }
  }
  j99D8(action) {
    if (action === 0) {
      this.B1C |= 2147483648;
      this.ir(this.j6204);
      this.B1C |= 36;
      this.radarVista = true;
      if (this.G.d33D8 === 1) {
        this.G.d33D8 = 0;
        this.ir(this.j6418);
      }
      this.j4720(2);
    }
    if (this.B70 === 4 && !(this.B24 & 2)) {
      this.B14 = 8;
      this.B1C |= 8;
    } else if (!(this.B1C & 32)) {
      if (this.B70 === 4) {
        this.B1C &= ~2147483648;
        this.B1C |= 8;
        this.B14 = 8;
      } else if (this.B38 !== this.j7F78) {
        this.j45AC();
        if (this.B38 !== this.j7F78 && this.B1C & 1073741824) this.B1C &= ~1073741824;
      }
    }
  }
  j9B3C(B10) {
    if (B10 === 0) {
      this.B1C |= 2147483648 | 4;
      this.j4720(2);
      this.B0C = 4;
      this.ir(this.j64B0);
      this.AD0i += 2;
      this.B1C |= 32;
    }
  }
  j9BB4(B10) {
    if (B10 === 0) {
      this.G.d32C8 = 1;
      this.ir(this.j6918);
      this.B1C |= 2147483648;
    }
    this.trigger = 0;
    this.j5168();
  }
  j9C2C(B10) {
    if (B10 === 0) {
      this.G.d32C8 = 2;
      this.ir(this.j794C);
      this.B50 = 0;
      this.B1C |= 2147483648;
    }
    this.trigger = 0;
    this.j5168();
  }
  j9CA8(B10) {
    if (B10 === 0) {
      this.G.d32C8 = 3;
      this.B1C &= ~2147483648;
      this.sis.vox.init();
      this.sis.vox.queueDelay(this.vox_ids[13], 4);
      this.vibrar();
      this.se2(SE.EXCLAMATION);
      this.marcar(0);
      this.ir(this.j6D84);
    }
    this.trigger = 0;
    this.j5168();
  }
  j9D64() {
    this.j9644();
    this.j4418();
    this.j44F8();
    this.j4DCC();
    if (!this.vivo) return;
    this.j4E5C();
    this.j50D0();
    this.sis.vox.tick();
    if (this.adjOn) asentir(this.adjust[6], this.sis.boca(NOMBRE_JOHNNY));
    const B10 = this.B10;
    if (this.B10 < 16e3) this.B10++;
    switch (this.B0C) {
     case 0:
      this.j96F4(B10);
      break;

     case 1:
      this.j98B0(B10);
      break;

     case 2:
      this.j98E4(B10);
      break;

     case 3:
      this.j998C(B10);
      break;

     case 4:
      this.j99D8(B10);
      break;

     case 5:
      this.j9B3C(B10);
      break;

     case 6:
      this.j9BB4(B10);
      break;

     case 7:
      this.j9C2C(B10);
      break;

     case 8:
      this.j9CA8(B10);
      break;
    }
    const fn = this.B38, t = this.B3C, st = this.stream();
    if (st === -1 || st === 2) this.B3C++;
    if (this.B3C === 0) this.B3C = 1;
    if (fn) fn.call(this, t);
    if (!this.vivo) return;
    this.j4FAC();
    if (!(this.B1C & 2) && this.ketchupVacia()) {
      this.B1C |= 2;
      this.ketchupQuitar();
    }
  }
  ketchupVacia() {
    const inv = this.J.ctx.inventario;
    return inv ? inv.items?.[9] === 0 : false;
  }
  ketchupQuitar() {
    const inv = this.J.ctx.inventario;
    if (inv) inv.items[9] = -1;
  }
  cuadro() {
    if (!this.sis.guionListo()) return;
    this.msgs = this.buzon;
    this.buzon = [];
    this.trigger = 0;
    this.actMotionAcum();
    this.actControl();
    this.step.set(0, 0, 0);
    this.movDib = this.mov.clone();
    this.rotDib = this.rot;
    this.nav.addr = this.addr(this.mov, this.nav.addr);
    this.j9D64();
    if (!this.vivo) return;
    if (this.B30.y < 0 && this.grounded) this.B30.y = 0;
    this.B30.y -= 32;
    this.step.y = this.B30.y;
    this.disparar();
  }
  actMotionAcum() {
    const M = this.motor;
    M.tick();
    const a = this.rot * ANG, c = Math.cos(a), sn = Math.sin(a);
    this.step.x += Math.trunc(M.paso[0] * c + M.paso[1] * sn);
    this.step.z += Math.trunc(-M.paso[0] * sn + M.paso[1] * c);
  }
  disparar() {
    if (!(this.trigger & 2) || !this.arma) return;
    const o = this.puntoHuesoMM(4, {
      x: 5,
      y: -500,
      z: 80
    }), d = this.ejeHuesoMundo(4, V(0, -1, 0));
    this.sis.nuevaBala(o, d, {
      lado: 2,
      "daño": 64,
      de: this
    });
    this.se(48, this.mov);
    this.chispa(o.clone().multiplyScalar(MM), .3, 2, 16769184);
  }
  ocultarSnake(si) {
    const c = typeof window !== "undefined" ? window.__mgs?.cuerpo : null;
    if (!c?.obj) return;
    c.obj.traverse(m => {
      if (si) {
        if (m.userData.__capas == null) {
          m.userData.__capas = m.layers.mask;
          m.layers.set(31);
        }
      } else if (m.userData.__capas != null) {
        m.layers.mask = m.userData.__capas;
        delete m.userData.__capas;
      }
    });
  }
  camaraJohnny() {
    const c = this.camEsp;
    if (!c) return null;
    const pos = c.pos.clone(), mira = pos.clone().add(dirVec3(c.rot, 1e3));
    return {
      pos: pos.multiplyScalar(MM),
      mira: mira.multiplyScalar(MM),
      verSnake: true
    };
  }
  dibujar() {
    if (!this.o) return;
    const m = this.movDib || this.mov;
    this.o.position.set(m.x * MM, (m.y - this.motor.altura) * MM, m.z * MM);
    this.o.rotation.y = (this.rotDib ?? this.rot) * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjOn ? this.adjust : null, this.motor.altura * MM);
  }
  conoRadar() {
    if (!this.o || !this.radarVista || this.B1C & 4096) return null;
    return {
      p: this.o.position,
      r: this.rot * ANG,
      alerta: !!this.alerta
    };
  }
  estadoPrueba() {
    return {
      modo: this.B0C,
      estado: this.B38?.name || null,
      t: this.B3C,
      sub: this.B4C,
      b1c: (this.B1C >>> 0).toString(16),
      b24: this.B24,
      b70: this.B70,
      vital: this.vital,
      faint: this.faint,
      accion: this.motor?.action,
      mov: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      ruta: [ this.AD0r, this.AD0i ],
      puerta: this.B5C
    };
  }
  destruir() {
    if (!this.vivo) return;
    this.sis.vox.init();
    this.ocultarSnake(false);
    if (this.mgr.camaraEspecial === this.camFn) this.mgr.camaraEspecial = this.camPrev;
    super.destruir();
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

class Johnny2 extends Personaje {
  constructor(mgr, sis) {
    super({
      tipo: "JOHNNY2",
      nombre: NOMBRE_JOHNNY,
      opts: {}
    }, mgr, sis);
    this.lado = "jugador";
    this.blanco = false;
    this.dePersonajes = true;
    this.G = globales(sis);
  }
  async iniciar() {
    await this.cargarCon("personajes/johnny.glb", "joh_03c", "armas/famas.glb");
    if (!this.vivo) return;
    this.mov.set(6e3, 750, 750);
    this.rot = this.turn = 1024;
    this.rSphere = -1;
    this.interpCtrl = 0;
    this.pose0(10);
    this.motor.accion(10, 0);
    this.y0 = 0;
  }
  cuadro() {
    if (this.G.d33D8 === 1) {
      this.destruir();
      return;
    }
    this.actMotion();
    this.step.y = this.y0;
    this.actControl();
    this.step.set(0, 0, 0);
    if (this.motor.isEnd !== 0) {
      this.mov.x = 6e3;
      this.mov.z = 750;
      const r = randU(64), a = r < 16 ? 11 : r < 32 ? 15 : r < 48 ? 10 : 9;
      if (this.motor.action !== a) this.motor.accion(a, 4);
    }
    if (this.y0 < 0 && this.grounded) this.y0 = 0;
    this.y0 -= 32;
  }
}

class Otacon extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = actor.nombre;
    this.lado = "jugador";
    this.blanco = false;
    this.dePersonajes = true;
    this.G = globales(sis);
  }
  log(t, extra = {}) {
    this.sis.log("otacon " + t, extra);
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    await this.cargarCon(a.modelo || "niveles/s03c/otacom.glb", "ota_03c");
    if (!this.vivo) return;
    this.o.userData.actor = a;
    const p = nums(o.p), d = nums(o.d);
    this.mov.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rot = this.turn = (d[1] ?? 0) & 4095;
    this.rSphere = -1;
    this.interpCtrl = 0;
    const b = Array.isArray(o.b) ? o.b[0] : null;
    this.bound = typeof b === "number" ? b : b && typeof b === "object" ? b.id ?? -1 : -1;
    this.f810 = nums(o.v).slice(0, 3);
    this.procs = procsDe(o.r).slice(0, 3);
    while (this.procs.length < 3) this.procs.push(-1);
    const t = nums(o.a);
    this.nav = new Nav(this, this.mov);
    this.nav.setTarget(V(t[0] ?? 0, t[1] ?? 0, t[2] ?? 0));
    this.timer = 0;
    this.f804 = nums(o.c)[0] ?? 0;
    this.mode = 0;
    if (this.f804) this.sis.ponerEstado(STATE.PADRELEASE);
    this.G.d33D8 = 0;
    this.adjOn = true;
    this.kogaku = false;
    this.sis.flujo.precargar(this.f810);
    this.pose0(0);
    this.motor.accion(0, 0);
    this.mov.y += this.motor.altura;
    this.actControl();
    this.step.set(0, 0, 0);
    this.log("inicio", {
      c: this.f804,
      voces: this.f810
    });
  }
  camuflaje(si) {
    this.kogaku = si;
    camuflar(this.o, si);
  }
  enviar(hash, m) {
    this.sis.enviar(hash, [ m, OTACOM ]);
  }
  lampara(si) {
    this.sis.enviar(DR_GOMON, [ HASH.ON, si ? LAMP_ON : LAMP_OFF ]);
  }
  recibir() {
    return false;
  }
  cuadro() {
    if (!this.sis.guionListo()) return;
    this.actMotion();
    this.step.y = -32;
    this.actControl();
    this.step.set(0, 0, 0);
    this.nav.addr = this.addr(this.mov, this.nav.addr);
    const t = this.timer++;
    if (this.f804 === 0) this.cB494(t); else this.cB838(t);
    if (!this.vivo) return;
    if (this.motor.action === 0) {
      const f = this.motor.info1.frame;
      if (f === 0) this.se(160, this.mov, "bomba");
      if (f === 12) this.se(161, this.mov, "bomba");
    }
    asentir(this.adjust[6], this.sis.boca(15660));
  }
  cB494(timer) {
    switch (this.mode) {
     case 0:
      if (timer === 0) {
        this.camuflaje(true);
        if (this.motor.action !== 1) this.motor.accion(1, 0);
        this.enviar(this.bound, HASH.ENTER);
        this.lampara(true);
      }
      if (timer === 64) {
        this.enviar(this.bound, HASH.LEAVE);
        this.lampara(false);
        if (this.motor.action !== 0) this.motor.accion(0, 4);
        this.timer = 0;
        this.mode++;
      }
      break;

     case 1:
      this.nav.zoneNavi();
      if (this.nav.dist(this.mov) < 250) {
        if (this.motor.action !== 1) this.motor.accion(1, 4);
        this.turn = 3072;
        this.sis.vox.queue(this.f810[0]);
        this.timer = 0;
        this.mode++;
      }
      break;

     case 2:
      this.sis.vox.tick();
      if (this.sis.vox.fin()) {
        const s = this.snake();
        this.sis.girarSnake(vecDir(this.mov.x - s.x, this.mov.z - s.z));
        this.execProc(this.procs[1], []);
        this.sis.ponerEstado(STATE.PADRELEASE);
        this.timer = 0;
        this.mode++;
      }
      break;

     case 3:
      if (timer === 16) {
        this.camuflaje(false);
        this.se(78, this.mov, "bomba");
      }
      if (timer === 64) {
        this.execProc(this.procs[2], []);
        this.sis.sacarEstado(STATE.PADRELEASE);
        this.timer = 0;
        this.mode++;
      }
      break;

     case 4:
      {
        const s = this.snake();
        if (Math.hypot(this.mov.x - s.x, this.mov.z - s.z) < 1500) {
          this.sis.girarSnake(vecDir(this.mov.x - s.x, this.mov.z - s.z));
          this.execProc(this.procs[2], []);
          this.execProc(this.procs[0], []);
          this.log("fin");
          this.destruir();
        }
        break;
      }
    }
  }
  cB838(timer) {
    switch (this.mode) {
     case 0:
      this.sis.vox.tick();
      if (timer === 0) {
        this.execProc(this.procs[1], []);
        if (this.motor.action !== 1) this.motor.accion(1, 0);
        this.sis.vox.queue(this.f810[1]);
        crearJohnny2(this.mgr, this.sis);
      }
      this.sis.ponerEstado(STATE.PADRELEASE);
      if (this.sis.vox.fin()) {
        this.sis.sacarEstado(STATE.PADRELEASE);
        if (this.motor.action !== 0) this.motor.accion(0, 4);
        this.timer = 0;
        this.mode++;
      }
      break;

     case 1:
      this.sis.vox.tick();
      if (timer === 32) {
        this.execProc(this.procs[2], []);
        this.sis.vox.queue(this.f810[2]);
      }
      if (timer === 96) {
        this.camuflaje(true);
        this.se(78, this.mov, "bomba");
      }
      this.nav.zoneNavi();
      if (this.nav.dist(this.mov) < 250) {
        if (this.motor.action !== 1) this.motor.accion(1, 4);
        this.timer = 0;
        this.mode++;
      }
      break;

     case 2:
      if (timer === 0) {
        if (this.o) this.o.visible = false;
        this.enviar(this.bound, HASH.ENTER);
        this.lampara(true);
      }
      if (timer === 64) {
        this.enviar(this.bound, HASH.LEAVE);
        this.lampara(false);
      }
      if (timer === 128) {
        this.G.d33D8 = 1;
        this.execProc(this.procs[0], []);
        this.log("se fue");
        this.destruir();
      }
      break;
    }
  }
  estadoPrueba() {
    return {
      c: this.f804,
      modo: this.mode,
      t: this.timer,
      accion: this.motor?.action,
      mov: [ Math.round(this.mov.x), Math.round(this.mov.z) ],
      kogaku: this.kogaku
    };
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

class Ninja extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = actor.nombre;
    this.lado = "jugador";
    this.blanco = false;
    this.dePersonajes = true;
  }
  log(t, extra = {}) {
    this.sis.log("ninja " + t, extra);
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    await this.cargarCon(a.modelo || "niveles/s03c/9401.glb", "a11f");
    if (!this.vivo) return;
    this.o.userData.actor = a;
    const p = nums(o.p), d = nums(o.d);
    this.mov.set(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
    this.rot = this.turn = (d[1] ?? 0) & 4095;
    this.rSphere = -1;
    this.interpCtrl = 0;
    const b = Array.isArray(o.b) ? o.b[0] : null;
    this.bound = typeof b === "number" ? b : b && typeof b === "object" ? b.id ?? -1 : -1;
    this.f7FC = nums(o.v).slice(0, 2);
    this.procs = procsDe(o.r).slice(0, 4);
    while (this.procs.length < 4) this.procs.push(-1);
    const q = nums(o.a);
    this.f7E4 = V(q[0] ?? 0, q[1] ?? 0, q[2] ?? 0);
    this.timer = 0;
    this.mode = 0;
    this.sis.flujo.precargar(this.f7FC);
    this.pose0(0);
    this.motor.accion(0, 0);
    this.mov.y = (p[1] ?? 0) + this.motor.altura;
    this.log("inicio");
  }
  recibir() {
    return false;
  }
  cuadro() {
    if (!this.sis.guionListo()) return;
    this.actMotion();
    this.actControl();
    this.step.set(0, 0, 0);
    const t = this.timer++;
    this.update(t);
  }
  update(timer) {
    switch (this.mode) {
     case 0:
      {
        if (timer === 0) {
          this.execProc(this.procs[1], [ 0 ]);
          const s = this.snake();
          this.sis.girarSnake(vecDir(this.mov.x - s.x, this.mov.z - s.z));
          this.sis.ponerEstado(STATE.PADRELEASE);
          camuflar(this.o, true);
          this.kogaku = true;
        }
        if (timer === 32) {
          this.se(SE.PSG1, this.f7E4);
          this.ctx.musica?.(33554187);
          const q = this.f7E4.clone();
          q.y = 1500;
          for (let i = 0; i < 4; i++) this.chispa(this.v3m(q).add(V(randS(20) * .01, randS(20) * .01, randS(20) * .01)), .3, 8, 16765056);
        }
        if (timer === 96) this.sis.enviar(this.bound, [ HASH.ENTER, 19639 ]);
        const s = this.snake(), len = Math.hypot(this.f7E4.x - s.x, this.f7E4.z - s.z);
        if (timer === 128) {
          this.ctx.musica?.(16777219);
          this.sis.sacarEstado(STATE.PADRELEASE);
          this.sis.girarSnake(vecDir(this.f7E4.x - s.x, this.f7E4.z - s.z));
          this.execProc(this.procs[2], []);
        }
        if (timer > 128 && len < 1500) {
          this.sis.girarSnake(vecDir(this.mov.x - s.x, this.mov.z - s.z));
          this.sis.abrirCine();
          this.sis.ponerEstado(STATE.PADRELEASE);
          this.sis.vox.queue(this.f7FC[0]);
          this.execProc(this.procs[1], [ 1 ]);
          this.timer = 0;
          this.mode++;
          this.log("Snake llegó");
        }
        break;
      }

     case 1:
      this.sis.vox.tick();
      if (this.sis.vox.fin()) {
        this.timer = 0;
        this.mode++;
      }
      break;

     case 2:
      if (timer === 32) {
        camuflar(this.o, false);
        this.se(SE.NINJA_STEALTH, this.mov, "bomba");
      }
      if (timer === 36) camuflar(this.o, true);
      if (timer === 64) {
        this.timer = 0;
        this.mode++;
      }
      break;

     case 3:
      if (timer === 0) camuflar(this.o, false);
      if (timer < 40 && this.o) this.o.visible = !(timer & 1);
      if (timer === 16 && this.motor.action !== 1) this.motor.accion(1, 4);
      if (timer === 32) {
        this.se(196, this.mov, "bomba");
        this.ctx.musica?.(33554187);
      }
      if (timer === 38) {
        camuflar(this.o, true);
        this.se(SE.NINJA_STEALTH, this.mov, "bomba");
      }
      if (timer === 55 && this.o) this.o.visible = false;
      if (this.motor.isEnd) {
        this.timer = 0;
        this.mode++;
      }
      break;

     case 4:
      this.sis.vox.tick();
      if (timer === 0) {
        if (this.o) this.o.visible = false;
        this.sis.vox.queue(this.f7FC[1]);
      }
      if (this.sis.vox.fin()) {
        this.timer = 0;
        this.mode++;
        this.sis.cerrarCine();
        this.execProc(this.procs[2], []);
        this.execProc(this.procs[0], []);
        this.execProc(this.procs[3], [ 1 ]);
        this.ctx.musica?.(16777217);
        this.log("se fue");
        this.destruir();
      }
      break;
    }
  }
  estadoPrueba() {
    return {
      modo: this.mode,
      t: this.timer,
      accion: this.motor?.action
    };
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

class SnakeViste {
  constructor(actor, mgr, sis) {
    this.actor = actor;
    this.mgr = mgr;
    this.sis = sis;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    this.nombre = actor.nombre;
    this.vivo = true;
    this.listo = true;
    this.blanco = false;
    this.barras = [];
    this.o = null;
    this.dePersonajes = true;
    this.procs = procsDe(actor.opts?.e).slice(0, 4);
    while (this.procs.length < 4) this.procs.push(-1);
    this.mode = 0;
    this.f24 = 0;
    this.ultimaPos = null;
    this.quieto = 0;
  }
  recibir() {
    return false;
  }
  corriendo() {
    const r = this.J.ctx.rig.position, p = r.clone();
    if (this.ultimaPos && p.distanceTo(this.ultimaPos) < .005) this.quieto++; else this.quieto = 0;
    this.ultimaPos = p;
    return this.quieto < 6;
  }
  cuadro() {
    if (!this.sis.guionListo()) return;
    const t = this.f24++;
    switch (this.mode) {
     case 0:
      if (t === 0) {
        this.sis.abrirCine();
        this.sis.ponerEstado(STATE.PADRELEASE);
        this.sis.proc(this.procs[0], []);
      }
      if (t === 48) {
        this.sis.proc(this.procs[1], []);
        this.f24 = 0;
        this.mode++;
      }
      return;

     case 1:
      if (t > 8 && !this.corriendo()) {
        this.mgr.se(184, null);
        vestirSnake(this.ctx);
        this.f24 = 0;
        this.mode++;
        this.sis.log("snake se viste");
      }
      break;

     case 2:
      if (t === 32) {
        this.sis.proc(this.procs[2], []);
        this.mode++;
        this.f24++;
      }
      break;

     case 3:
      if (t > 40 && !this.corriendo()) {
        this.sis.sacarEstado(STATE.PADRELEASE);
        this.sis.girarSnake(1024);
        this.sis.cerrarCine();
        this.sis.proc(this.procs[3], []);
        this.destruir();
      }
      break;
    }
  }
  dibujar() {}
  destruir() {
    this.vivo = false;
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

async function cambiarCuerpo(ctx, url) {
  const c = typeof window !== "undefined" ? window.__mgs?.cuerpo : null;
  if (!c?.obj) return false;
  try {
    const nuevo = await cargarModelo(ctx, url);
    const partes = o => {
      const l = [];
      o.traverse(m => {
        if (m.isSkinnedMesh && !m.isUnidaPersonaje && !m.userData.unidaPersonaje) l.push(m);
      });
      return l;
    };
    const viejas = partes(c.obj), nuevas = partes(nuevo);
    if (!viejas.length || viejas.length !== nuevas.length) {
      console.warn("[celda] cuerpo: partes distintas", url, viejas.length, nuevas.length);
      return false;
    }
    viejas.forEach((v, i) => {
      const n = nuevas[i], antes = Array.isArray(v.material) ? v.material[0] : v.material;
      v.geometry = n.geometry;
      v.material = Array.isArray(n.material) ? n.material.map(x => x.clone()) : n.material.clone();
      for (const m of Array.isArray(v.material) ? v.material : [ v.material ]) {
        m.colorWrite = antes?.colorWrite ?? true;
        m.depthWrite = antes?.depthWrite ?? true;
      }
      ctx.teñir?.(v);
    });
    c.modeloCelda = url;
    return true;
  } catch (e) {
    console.warn("[celda] cuerpo de Snake", url, e);
    return false;
  }
}

const vestirSnake = ctx => cambiarCuerpo(ctx, "niveles/s03c/snake.glb");

export function desvestirEnLaCelda(ctx, sis) {
  if (!sis || sis.desvestido || ctx?.nivel?.id !== "s03c") return;
  const g = ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
  if (!g?.vars || g.vars.get("$f:G004e.1")) return;
  sis.desvestido = true;
  cambiarCuerpo(ctx, "niveles/s03c/sne_nude.glb").then(ok => sis.log("snake desnudo", {
    ok: ok
  }));
}

class Ketchup {
  constructor(sis) {
    this.sis = sis;
    this.J = sis.J;
    this.estado = 0;
    this.t = 0;
    this.charco = null;
    this.vivo = true;
    this.circulo = false;
    this.kd = e => {
      if ((e.code === "KeyG" || e.code === "Space") && !e.repeat) this.circulo = true;
    };
    if (typeof window !== "undefined") addEventListener("keydown", this.kd, true);
    (sis.alDestruir ||= []).push(() => this.destruir());
  }
  equipada() {
    const inv = this.J.ctx.inventario;
    return !!inv && inv.item === 9;
  }
  cuadro() {
    const circulo = this.circulo;
    this.circulo = false;
    if (this.estado === 0) {
      const st = estadoSnake(this.sis);
      if (this.equipada() && (st & (PLAYER_INTRUDE | PLAYER_MOVE | PLAYER_GROUND)) === PLAYER_GROUND && circulo) {
        if (dentro(this.sis, HASH.TRAP_KETCHUP, this.sis.snake())) {
          this.sis.mgr.se(183, null);
          this.estado = 1;
          this.t = 0;
          this.crearCharco();
          this.sis.ponerEstado(STATE.PADRELEASE);
          this.sis.log("ketchup");
        } else this.sis.mgr.se(35, null);
      }
    } else if (this.estado === 1 && ++this.t > 100) {
      this.estado = 2;
      this.sis.sacarEstado(STATE.PADRELEASE);
      const inv = this.J.ctx.inventario;
      if (inv) {
        inv.item = -1;
        inv.items[9] = -1;
      }
    }
    if (this.charco) this.cuadroCharco();
  }
  crearCharco() {
    const r = this.J.ctx.rig.position, tex = (new THREE.TextureLoader).load("assets/personajes/ketchap_grey.png");
    const g = new THREE.Group;
    g.userData.sinColision = true;
    const c = typeof window !== "undefined" ? window.__mgs?.cuerpo?.obj : null, pts = [];
    for (const h of [ 0, 5, 2, 7 ]) {
      const b = c?.getObjectByName("hueso_" + h);
      const w = new THREE.Vector3;
      if (b) b.getWorldPosition(w); else w.copy(r);
      pts.push(w);
    }
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      color: 65535,
      transparent: true,
      depthWrite: false,
      blending: THREE.SubtractiveBlending
    });
    this.quads = pts.map((w, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = i * 200 * ANG;
      m.position.set(w.x, r.y + .01, w.z);
      m.scale.setScalar(.001);
      g.add(m);
      return m;
    });
    this.sis.mgr.mundo.add(g);
    this.charco = {
      g: g,
      t: 0,
      pos: pts[0].clone().multiplyScalar(1e3)
    };
  }
  cuadroCharco() {
    const c = this.charco;
    if (c.t > 10 && c.t < 200) {
      const d = (c.t - 10) * 3 / 2;
      for (const q of this.quads) q.scale.setScalar(Math.max(.001, d * 2 * MM));
    }
    if (c.t < 200 && ++c.t === 100) this.sis.ketchup = true;
    if (c.t >= 100) {
      const st = this.sis.estadoSnake(), s = this.sis.snake();
      this.sis.ketchup = !!(st & PLAYER_GROUND) && Math.hypot(s.x - c.pos.x, s.z - c.pos.z) <= 640;
    }
  }
  destruir() {
    this.vivo = false;
    if (typeof window !== "undefined") removeEventListener("keydown", this.kd, true);
    this.charco?.g.removeFromParent();
    this.sis.ketchup = false;
  }
}

function ketchupDe(sis) {
  if (!sis.ketchupAct) {
    sis.ketchupAct = new Ketchup(sis);
    sis.tareas.push(sis.ketchupAct);
  }
  return sis.ketchupAct;
}

function crearJohnny2(mgr, sis) {
  const p = new Johnny2(mgr, sis);
  mgr.agregar(p);
  p.cargando = p.iniciar().then(() => {
    p.listo = true;
    return p;
  }).catch(e => {
    console.warn("[celda] johnny2", e);
    p.vivo = false;
    return null;
  });
  return p;
}

export function crearCelda(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esCelda(actor)) return null;
  const sis = Sistema.de(J, ctx), mgr = sis.mgr;
  cargarTrampas(ctx.nivel?.id);
  ketchupDe(sis);
  desvestirEnLaCelda(ctx, sis);
  for (const j of mgr.lista.slice()) if (j.vivo && j.actor && j !== sis && (j.actor === actor || j.actor.tipo === actor.tipo && (j.nombre ?? j.actor.nombre) === actor.nombre)) j.destruir();
  const quietos = [];
  (ctx.mundo || J.ctx.mundo)?.traverse(o => {
    if (o.userData.actor === actor && !o.userData.jefe) quietos.push(o);
  });
  for (const o of quietos) o.removeFromParent();
  let p;
  if (actor.tipo === "JOHNNY") p = new Johnny(actor, mgr, sis); else if (actor.tipo === "PRISONOTACON") p = new Otacon(actor, mgr, sis); else if (actor.tipo === "PRISONNINJA") p = new Ninja(actor, mgr, sis); else p = new SnakeViste(actor, mgr, sis);
  mgr.agregar(p);
  sis.receptores.push(p);
  for (const v of tomarPendientes(actor.nombre, ctx.nivel?.id)) p.recibir?.(v, {
    entrada: true
  });
  p.cargando = (p.iniciar ? p.iniciar() : Promise.resolve()).then(() => {
    if (!p.vivo) return null;
    p.listo = true;
    actor._meryl = p;
    return p;
  }).catch(e => {
    console.warn("[celda]", actor.tipo, e);
    p.vivo = false;
    p.destruir?.();
    for (const o of quietos) (ctx.mundo || J.ctx.mundo)?.add(o);
    return null;
  });
  return p;
}
