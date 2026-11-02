// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, ratan2, randU, randS, cargarModelo, cargarAnim, Motor } from "./base.js";

import { apoyo, isqrt, idiv, rsin } from "./apoyo3.js";

import { WP, IT } from "../inventario.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const ALT_SNAKE = [ 1100, 496, 136 ];

const SE = {
  GOLPE1: 128,
  GOLPE2: 129,
  MUERE: 130,
  NOTA: 131,
  RESPIRA: 132,
  MERYL_GOLPE: 133,
  MERYL_MUERE: 134,
  LATIDO: 135,
  LISTA: 9,
  LASER: 99,
  TIRO: 179,
  LLAMADA: 16
};

const HZD_SEG_NO_NAVIGATE = 2, HZD_SEG_NO_PLAYER = 4;

const VIDA_G0428 = {
  s10a: [ 5, 6, 7, 7 ],
  s12a: [ 7, 8, 9, 10 ]
};

const OFF_BOCA1 = V(10, -800, -120), OFF_BOCA2 = V(10, -2e3, -70);

const OFF_LASER = V(0, -550, 100);

const OFF_SANGRE = V(0, 0, 100);

let wolf2Pos = null;

let actualW = null;

function engancharArmas(Ar) {
  if (!Ar || Ar.__wolf) return;
  Ar.__wolf = true;
  const gEn = Ar.guardiaEn.bind(Ar);
  Ar.guardiaEn = (o, d, lejos, radio) => {
    let r = gEn(o, d, lejos, radio);
    const mgr = actualW;
    if (!mgr) return r;
    let md = r ? r.dist : lejos;
    const ray = new THREE.Ray(o, d.clone().normalize()), q = new THREE.Vector3, caja = new THREE.Box3;
    const esc = Math.hypot(d.x, d.y, d.z) || 1;
    for (const j of mgr.lista) {
      if (!j.vivo || !j.blanco || typeof j.cajasBlanco !== "function") continue;
      for (const c of j.cajasBlanco()) {
        if (c.lado === 1) continue;
        caja.min.set((c.c.x - c.s.x) * MM, (c.c.y - c.s.y) * MM, (c.c.z - c.s.z) * MM);
        caja.max.set((c.c.x + c.s.x) * MM, (c.c.y + c.s.y) * MM, (c.c.z + c.s.z) * MM);
        if (!ray.intersectBox(caja, q)) continue;
        const dist = q.distanceTo(o) * esc;
        if (dist < md) {
          md = dist;
          r = {
            g: j.proxy,
            dist: dist
          };
          j.cajaPegada = c.id;
        }
      }
    }
    return r;
  };
}

function engancharGuion(g) {
  if (!g?.op || g.op.__wolf) return;
  g.op.__wolf = true;
  const reinicio = g.op.reinicio, destruir = g.op.destruirActor;
  g.op.reinicio = function(...x) {
    destruirWolfs(actualW, "restart");
    return reinicio ? reinicio.apply(this, x) : undefined;
  };
  g.op.destruirActor = function(a) {
    try {
      for (const j of actualW?.lista || []) if (j.vivo && j.actor === a && typeof j.destruirActor === "function") j.destruirActor("restart");
    } catch (e) {
      console.warn("[wolf] restart", e);
    }
    return destruir ? destruir.call(this, a) : undefined;
  };
}

function destruirWolfs(mgr, motivo) {
  try {
    for (const j of mgr?.lista || []) if (j.vivo && (j instanceof Wolf || j instanceof MerylHerida)) j.destruirActor(motivo);
  } catch (e) {
    console.warn("[wolf]", motivo, e);
  }
}

const vecMM = (h, off = V()) => h.localToWorld(off.clone().multiplyScalar(MM)).multiplyScalar(1e3);

const ejeMM = (h, eje) => {
  const q = new THREE.Quaternion;
  h.getWorldQuaternion(q);
  return eje.clone().applyQuaternion(q);
};

const len3i = v => Math.trunc(Math.hypot(v.x, v.y, v.z));

function svec(v) {
  return Array.isArray(v) ? V(v[0] || 0, v[1] || 0, v[2] || 0) : V();
}

function cortaCaja(a, b, c, s) {
  const caja = new THREE.Box3(V(c.x - s.x, c.y - s.y, c.z - s.z), V(c.x + s.x, c.y + s.y, c.z + s.z));
  if (caja.containsPoint(a)) return a.clone();
  const d = b.clone().sub(a), L = d.length();
  if (L < 1e-6) return null;
  const q = new THREE.Ray(a, d.divideScalar(L)).intersectBox(caja, V());
  return q && q.distanceTo(a) <= L ? q : null;
}

export class Wolf extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "WOLF";
    this.registro = [];
    this.A = apoyo(mgr);
    actualW = mgr;
    engancharArmas(this.ctx.armas || this.J.ctx.armas || globalThis.__mgs?.armas);
    engancharGuion(this.A.guion);
    this.balasW = [];
    this.tiros = 0;
    this.impactos = 0;
    this.golpesRecibidos = 0;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 800) this.registro.shift();
  }
  get st() {
    return this.ctx.nivel?.id || this.A.guion?.st || new URLSearchParams(globalThis.location?.search || "").get("esc") || "";
  }
  num(v, d = 0) {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && v.var) {
      const x = this.A.guion?.vars?.get?.(v.var);
      if (typeof x === "number" && x !== 0) return x;
      if (/G0428/i.test(v.var)) {
        const t = VIDA_G0428[this.st] || VIDA_G0428.s10a, lv = this.dificultad();
        return t[lv >= 0 && lv <= 2 ? lv : 3];
      }
    }
    return d;
  }
  ints(k) {
    return (this.opts[k] || []).map(x => this.num(x, 0));
  }
  procOpt(k) {
    const p = this.procId(k);
    return p > 0 ? p : -1;
  }
  async iniciar() {
    this.f7D8 = 1;
    this.f7DC = 0;
    this.f7D4 = 1e3;
    this.f9AC = this.f9AE = this.f9B0 = 0;
    this.f9F0 = 0;
    this.fA58 = 0;
    const u = this.ints("u");
    this.f7FC = u.length ? u[0] : 1;
    const p = this.ints("p");
    this.f888 = [];
    for (let i = 0; i < this.f7FC; i++) this.f888.push(p.length >= i * 3 + 3 ? V(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]) : V());
    const m = this.ints("m");
    this.f800 = [];
    for (let i = 0; i < this.f7FC; i++) this.f800.push(m[i] ?? 0);
    this.f724 = 3e5;
    this.f6E0 = 5;
    const h = this.ints("h");
    this.f700 = h.length ? h[0] : 5;
    this.f6FC = this.f700;
    this.fA68 = this.f700 === -1 ? 1 : 0;
    this.fA6C = 0;
    const k = this.ints("k");
    this.f99C = k.length ? k[0] : 0;
    const o = this.ints("o");
    this.f9D0 = o.length ? o[0] : 17250;
    this.f9C0 = this.procOpt("c");
    this.f9C4 = this.f9C0 !== -1 ? 1 : 0;
    this.f9E4 = this.procOpt("j");
    this.f9BC = 0;
    const r = this.ints("r");
    if (r.length >= 6) {
      if (r[4] === 0) {
        this.mov.set(r[0], r[1], r[2]);
        this.rot = this.turn = r[3] & 4095;
        this.f9BC = 1;
      } else this.f6FC = r[4];
    }
    this.fA48 = Math.trunc(1024 / this.f700) + 1;
    this.f9C8 = this.procOpt("d");
    this.f9E0 = this.procOpt("i");
    this.fA4C = this.procOpt("e");
    const g = this.ints("g");
    this.f9D4 = g.length ? g[0] : 5e3;
    const q = this.ints("q");
    this.f9E8 = q.length ? q[0] : 0;
    if (this.fA68) {
      this.f9C0 = this.f9E4 = this.f9C8 = this.fA4C = this.f9E0 = -1;
    }
    const [cuerpo, datos, rifle, herida] = await Promise.all([ cargarModelo(this.ctx, this.f99C ? "jefes/wolf_frio.glb" : "jefes/wolf.glb"), cargarAnim("sniper"), cargarModelo(this.ctx, "armas/rifle.glb").catch(() => null), this.f99C ? cargarModelo(this.ctx, "jefes/wolf_herida.glb").catch(() => null) : null ]);
    this.montarCuerpo(cuerpo, datos);
    this.rifle = rifle;
    if (rifle) {
      this.huesos[4]?.add(rifle);
      this.ctx.teñir?.(rifle);
    }
    this.modeloHerida = herida;
    this.crearLaser();
    this.t1 = {
      c: V(),
      s: V(250, 1e3, 250),
      "dañado": false,
      a_mode: 0,
      activo: true
    };
    this.t2 = {
      c: V(),
      s: V(250, 1e3, 250),
      "dañado": false,
      a_mode: 0,
      activo: true
    };
    this.fA40 = 1024;
    this.fA44 = 1024;
    this.f6AC = V();
    this.f6B4 = V();
    this.fA5C = 0;
    this.fA60 = 0;
    this.barras = [ {
      y: 28,
      rest: 1024,
      now: 1024,
      max: 1024,
      visible: false,
      conf: {
        nombre: "WOLF",
        izq: [ 16, 111, 159 ],
        der: [ 31, 223, 127 ]
      }
    } ];
    this.adjust = Array.from({
      length: 16
    }, () => [ 0, 0, 0 ]);
    this.f6D8 = 0;
    this.f6DC = 0;
    this.f6E8 = 0;
    this.f6F0 = 0;
    this.f6D0 = 0;
    this.f6E4 = 0;
    this.f710 = 0;
    this.f714 = 0;
    this.f720 = 0;
    this.f728 = 0;
    this.f9FC = V();
    this.f988 = V();
    this.fA18 = V();
    this.f9D8 = 0;
    this.f9DC = 0;
    this.fA64 = 0;
    this.f880 = 0;
    this.f884 = 0;
    this.voces0 = 0;
    this.paso = V();
    this.f6BC = 0;
    this.mov.y = this.mov.y || 0;
    this.CED18();
    this.piso = this.mov.y;
    this.apoyar();
    const c0 = this.motor.clip(this.motor.info1.anim >= 0 ? this.motor.info1.anim : 0);
    if (c0) {
      for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c0.rot.slice(j * 3, j * 3 + 3);
      this.motor.altura = c0.altura[0];
    }
    this.blanco = true;
    this.dibujar();
    this.log("inicio", {
      st: this.st,
      golpes: this.f6FC,
      puntos: this.f7FC,
      k: this.f99C,
      o: this.f9D0,
      q: this.f9E8,
      d: this.f9C8,
      e: this.fA4C,
      j: this.f9E4,
      pos: [ this.mov.x, this.mov.y, this.mov.z ]
    });
  }
  CED18() {
    this.D2E0C();
  }
  D2E0C() {
    if (this.f9BC === 1) {
      this.limpiarAdjust();
      this.D0848(9, 11);
      return;
    }
    this.voces0 = 30;
    this.f6C0 = 26;
    this.f6CC = 0;
    this.f9A8 = 0;
    this.f6F8 = 0;
    this.f6F4 = 0;
    this.f704 = 0;
    this.f708 = 0;
    this.f6E4 = 0;
    this.f748 = 0;
    this.f71C = 0;
    this.f9BC = 0;
    this.f990 = 0;
    this.f718 = 0;
    this.f9EC = 0;
    this.f9F4 = 0;
    this.f9F8 = 0;
    this.fA08 = 0;
    this.fA04 = 0;
    this.f9CC = 0;
    this.fA0C = 0;
    this.fA10 = [ 0, 0, 0 ];
    this.f6AC.set(0, 0, 0);
    this.f6B4.set(0, 0, 0);
    this.fA28 = 0;
    this.fA2C = 0;
    this.cine = false;
    this.fA50 = 0;
    this.fA54 = 0;
    this.f6D4 = 18;
    this.limpiarAdjust();
    this.D08D8(0);
    this.f9A4 = 0;
    this.f880 = randU(4096) % this.f7FC;
    this.f884 = this.f880 + 1;
    if (this.f884 >= this.f7FC) this.f884 = this.f880 - 1;
    this.mov.copy(this.punto(this.f880));
    this.mov.z -= 1e3;
    this.fA70 = 0;
  }
  punto(i) {
    return this.f888[i] || V();
  }
  limpiarAdjust() {
    for (const a of this.adjust) {
      a[0] = 0;
      a[1] = 0;
      a[2] = 0;
    }
  }
  vitalBlanco() {
    return Math.max(1, this.f6FC);
  }
  D0848(a, sig) {
    if (this.f6C0 !== a) {
      this.f6C0 = a;
      this.motor.accion(a, 4);
    } else if (this.motor.isEnd === 1) this.f6D4 = sig;
  }
  D08A0(a) {
    if (this.motor.isEnd === 1) {
      this.f6C0 = a;
      this.motor.accion(a, 4);
    }
  }
  D08D8(a) {
    this.f6C0 = a;
    this.motor.accion(a, 4);
  }
  D0904(a1, a2, sig) {
    if (this.f6C0 !== a1) {
      this.f6C0 = a1;
      this.motor.accion(a1, 4);
    } else if (this.motor.isEnd === 1) {
      this.f6C0 = a2;
      this.motor.accion(a2, 4);
      this.f6D4 = sig;
    }
  }
  CED64() {
    this.fA5C = 5;
    this.f6AC.y = 0;
    this.t1.s.set(150, 200, 150);
    this.fA60 = 0;
    this.f6B4.y = -300;
    this.t2.s.set(150, 500, 150);
  }
  CEDC0() {
    this.fA5C = 0;
    this.f6AC.y = 500;
    this.t1.s.set(10, 500, 100);
    this.fA60 = 0;
    this.f6B4.y = -500;
    this.t2.s.set(10, 500, 100);
  }
  CEE1C() {
    this.fA5C = 0;
    this.f6AC.y = 200;
    this.t1.s.set(250, 200, 250);
    this.fA60 = 0;
    this.f6B4.y = -200;
    this.t2.s.set(250, 200, 250);
  }
  CEE78() {
    this.fA5C = 0;
    this.f6AC.y = 125;
    this.t1.s.set(350, 125, 350);
    this.fA60 = 0;
    this.f6B4.y = -125;
    this.t2.s.set(350, 125, 350);
  }
  static CEED4(lenH, to, from) {
    const x = to.x - from.x, y = to.y - from.y, z = to.z - from.z;
    return {
      x: ratan2(lenH, y) & 4095,
      y: ratan2(x, z) & 4095,
      z: 0
    };
  }
  CEF50() {
    this.f6E8 = randU(16);
    const lv = this.dificultad();
    this.f6E8 += lv === 1 ? 120 : lv === 2 ? 90 : lv >= 3 ? 20 : 150;
  }
  CEFF0(sig) {
    this.CEF50();
    this.f710 = randS(16);
    this.f714 = randS(16);
    this.f6D4 = sig;
  }
  static poner(pos, rot, v) {
    return v.clone().applyEuler(new THREE.Euler(rot.x * ANG, rot.y * ANG, rot.z * ANG, "YXZ")).add(pos);
  }
  snakeMano() {
    const r = this.J.ctx.rig.position, C = globalThis.__mgs?.cuerpo, h = C?.obj?.getObjectByName?.("hueso_4");
    const cam = this.J.ctx.cam || globalThis.__mgs?.cam;
    if (cam && this.arma() === WP.PSG1 && this.zoom() > 320) {
      const p = V();
      cam.getWorldPosition(p);
      if (p.distanceTo(r) < 2.5) return p.multiplyScalar(1e3).round();
    }
    if (h) {
      const p = V();
      h.getWorldPosition(p);
      if (p.distanceTo(r) < 2.5) return p.multiplyScalar(1e3).round();
    }
    const post = this.J.postura?.() ?? 0;
    return V(Math.round(r.x * 1e3), Math.round(r.y * 1e3) + [ 1e3, 450, 150 ][post], Math.round(r.z * 1e3));
  }
  snakeVivo() {
    return !this.J.muerto && this.J.vida > 0 && this.mgr.gameOverTimer() === 0;
  }
  snakeIntocable() {
    return !this.snakeVivo() || this.J.activo === false || !!this.J.ctx.vuelo?.() || this.A.snakeInvencible();
  }
  cajaSnake() {
    const s = this.A.snake(), post = this.J.postura?.() ?? 0;
    return {
      c: s,
      s: V(300, [ 700, 500, 500 ][post], 300)
    };
  }
  get inv() {
    return this.J.ctx.inventario || null;
  }
  arma() {
    return this.inv ? this.inv.arma : -1;
  }
  item() {
    return this.inv ? this.inv.item : -1;
  }
  zoom() {
    const Ar = this.ctx.armas || this.J.ctx.armas;
    return Ar && this.arma() === WP.PSG1 ? Ar.zoom : 320;
  }
  enPantalla(pMM) {
    const cam = this.J.ctx.cam || globalThis.__mgs?.cam;
    if (!cam) return {
      ve: false
    };
    cam.updateMatrixWorld(true);
    const v = pMM.clone().multiplyScalar(MM).project(cam);
    return {
      ve: v.z > -1 && v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1,
      sx: (v.x + 1) * 160,
      sy: (1 - v.y) * 112
    };
  }
  hzd(a, b, filtro) {
    const d = b.clone().sub(a), L = d.length();
    if (L < 1 || Math.abs(d.x) < 1 && Math.abs(d.z) < 1) return null;
    return this.mgr.pared(a, d.divideScalar(L), L, this.mgr.grupoHzd ?? -1, filtro);
  }
  cuadro() {
    if (!this.vivo) return;
    const T = this.mgr.frame;
    if (this.fA0C === 2) this.drawLifebar();
    if (this.fA0C === 1) {
      this.fA0C = 2;
      this.fA44 = Math.trunc(this.fA40 / 8) * 8;
      this.barras[0].visible = true;
      this.drawLifebar();
    }
    if (this.fA68) {
      this.mov.x = 4201;
      this.mov.z = -16766;
      this.rot = this.turn = 2048;
    }
    if (this.f99C === 0) this.paso.z = 0;
    this.control({
      x: this.paso.x,
      z: this.paso.z
    });
    this.motor.tick();
    const pv = V(this.motor.paso[0], 0, this.motor.paso[1]).applyAxisAngle(V(0, 1, 0), this.rot * ANG);
    this.paso.set(Math.round(pv.x), 0, Math.round(pv.z));
    if (T % 64 === 0) this.f7D8 = randU(2) + 1;
    this.f7DC += this.f7D8;
    if (this.fA28 === 1 && this.snakeVivo()) {
      this.padRelease(true);
      this.setCamera();
      this.caminarSnake(this.mov.x > this.A.snake().x ? 1 : -1);
    }
    if (this.f9BC === 1) {
      const s = this.A.snake();
      if (this.f99C !== 0 && s.z < -14e3 && this.fA28 === 0) {
        this.quitarArma();
        this.hud(false);
        if (![ IT.BOX1, IT.BOX2, IT.BOX3 ].includes(this.item())) this.inv?.equiparItem(-1);
        this.A.cine(2e9);
        this.cine = true;
        this.fA28 = 1;
        this.f9D8 = this.f9DC = this.mov.x > s.x ? 1 : -1;
        this.log("acercarse", {
          snake: [ Math.round(s.x), Math.round(s.z) ]
        });
      }
      if (s.distanceTo(this.mov) < this.f9D4 || this.f9DC === -1 && this.mov.x > s.x || this.f9DC === 1 && this.mov.x <= s.x) {
        this.padRelease(false);
        if (this.cine) {
          this.A.finCine();
          this.cine = false;
        }
        this.destruirActor("cerca");
        return;
      }
    } else {
      this.D1EBC();
      this.CECB4();
    }
    if (T % 128 === 0) this.aliento();
    this.cuadroBalas();
    this.cuadroLaserVisual();
  }
  CECB4() {}
  D1EBC() {
    const T = this.mgr.frame;
    this.fA64 = 0;
    this.o.updateMatrixWorld(true);
    const w1 = vecMM(this.huesos[this.fA5C] || this.huesos[0]), w2 = vecMM(this.huesos[this.fA60] || this.huesos[0]);
    if (this.f99C === 0 && this.arma() === WP.NIKITA) {
      this.fA54 = 90;
    } else if (this.fA54 > 0) this.fA54--; else this.fA54 = 0;
    if (this.f99C === 0 || this.f9C8 === -1) this.padRelease(false);
    if (this.voces0 > 0) this.voces0--;
    if (this.f9C8 !== -1) {
      if (this.escenaMira()) return;
    }
    if (T % 15 === 0 && randU(2) === 0) {
      this.f9FC.copy(this.snakeMano());
      if (this.f9E8 === 2) {
        if (this.D0298() && wolf2Pos) {
          this.fA04 = 1;
          this.f9FC.copy(wolf2Pos);
        } else this.fA04 = 0;
      }
    }
    this.f6D8 = this.D07D8(this.mov);
    const s = this.A.snake();
    let golpe = this.t1.dañado || this.t2.dañado;
    if (this.f6FC > 0 && this.f9D0 > s.z && this.arma() !== WP.PSG1 && this.snakeVivo() && this.J.activo !== false && !this.J.ctx.vuelo?.()) {
      this.padRelease(true);
      if ([ IT.SCOPE, IT.CAMERA, IT.NVG, IT.THERMG ].includes(this.item())) this.inv?.equiparItem(-1);
      if ([ WP.PSG1, WP.STINGER ].includes(this.arma())) this.inv?.equiparArma(-1);
      this.f718 = 1;
      this.f6E8 = 0;
      this.rot = this.f990;
      this.t1.dañado = this.t2.dañado = false;
      golpe = false;
      if (this.fA08 === 0) {
        this.fA08 = 1;
        this.log("zona prohibida", {
          z: Math.round(s.z),
          o: this.f9D0
        });
      }
      if (this.f9C8 === -1 || this.fA70 === 0) this.D0358();
      if (this.fA08 === 1) this.fA08 = 2;
    } else if (this.fA68 !== 1 || this.fA6C !== 0) {
      if (this.f9C8 !== -1) {
        this.laserVisible(false);
        this.t1.dañado = this.t2.dañado = true;
        this.t1.c.copy(w1).add(this.f6AC);
        this.t2.c.copy(w2).add(this.f6B4);
        return;
      }
      this.f718 = 0;
      if (this.f6CC === 0) {
        this.D0980();
        this.f6CC = 1;
      } else if (this.f6CC === 1 && this.f6D0 === 0) this.D0ED4();
      if (this.f6FC < 1) {
        this.t1.activo = this.t2.activo = false;
        this.blanco = false;
        this.fA10 = [ 0, 0, 0 ];
        return;
      }
      this.CF084(this.f6E8, this.f710, this.f714);
    }
    this.CF2C4();
    if (this.arma() === WP.PSG1) {
      const f = this.fA10;
      for (let i = 0; i < 3; i++) {
        f[i] -= Math.trunc(f[i] / 8);
        if ((f[i] - 1 & 65535) < 31) f[i]--;
      }
    } else this.fA10 = [ 0, 0, 0 ];
    const stinger = this.arma() === WP.STINGER;
    this.t1.c.copy(w1).add(this.f6AC);
    this.t2.c.copy(w2).add(this.f6B4);
    this.t1.activo = this.t2.activo = !stinger;
    this.blanco = !stinger && this.f6FC > 0;
    if (golpe && this.f748 === 0 && this.fA54 === 0 || this.fA68 === 1 && this.fA6C === 0) this.golpe();
    if (this.fA2C <= 0) {
      this.t1.dañado = this.t2.dañado = false;
      this.f748 = 0;
    }
    this.f6F0--;
    this.f6F8++;
    if (this.fA2C > 0) this.fA2C--;
  }
  golpe() {
    const t1 = this.t1.dañado;
    this.fA6C = 1;
    this.fA2C = 60;
    this.f9F8 = 0;
    this.sangreEn(t1 ? 6 : 14);
    this.limpiarAdjust();
    this.f748 = 1;
    this.f6FC--;
    this.fA40 -= this.fA48;
    this.golpesRecibidos++;
    const tierra = [ 0, 2, 6, 10, 16 ].includes(this.f6D4);
    if (this.f6FC <= 0) {
      if (this.mgr.gameOverTimer() === 0) this.ctx.musica?.(16777217);
      this.f6D4 = tierra ? 13 : 9;
      this.laserVisible(false);
      if (this.fA68 === 0) this.se2(SE.MUERE);
    } else {
      this.se2(randU(2) ? SE.GOLPE1 : SE.GOLPE2);
      this.f6D4 = tierra ? 12 : 8;
    }
    this.log("golpe", {
      caja: t1 ? 1 : 2,
      quedan: this.f6FC,
      barra: this.fA40,
      estado: this.f6D4
    });
    if (this.f6FC < 1 && this.f99C !== 0 && this.modeloHerida) this.cambiarModelo(this.modeloHerida);
  }
  cambiarModelo(o) {
    const viejo = this.modelo;
    this.modelo = o;
    this.o.add(o);
    viejo.removeFromParent();
    this.ctx.teñir?.(o);
    this.huesos = [];
    for (let i = 0; i < this.datos.huesos; i++) this.huesos.push(o.getObjectByName("hueso_" + i));
    this.padres = this.huesos.map(h => {
      const m = /^hueso_(\d+)$/.exec(h?.parent?.name || "");
      return m ? +m[1] : -1;
    });
    o.traverse(m => {
      if (m.isMesh) m.castShadow = true;
    });
    if (this.rifle) {
      this.huesos[4]?.add(this.rifle);
      this.rifle.visible = false;
    }
  }
  sangreEn(hueso) {
    const h = this.huesos[hueso];
    if (h) this.sangre(vecMM(h, OFF_SANGRE).multiplyScalar(MM));
  }
  D07D8(pos) {
    const x = pos.x - this.f9FC.x >> 4, y = pos.y - this.f9FC.y >> 4, z = pos.z - this.f9FC.z >> 4;
    return isqrt(x * x + y * y + z * z) << 4;
  }
  hueso4() {
    return vecMM(this.huesos[4]);
  }
  mitad() {
    const p = this.hueso4();
    return p.clone().add(this.f9FC).multiplyScalar(.5).round();
  }
  D01D8() {
    return !!this.hzd(this.hueso4(), this.mitad(), HZD_SEG_NO_PLAYER);
  }
  D0298() {
    return !!this.hzd(this.f9FC.clone(), this.mitad(), HZD_SEG_NO_PLAYER);
  }
  D0980() {
    if (this.fA0C === 0 && this.fA68 === 0) {
      this.fA0C = 1;
      if (this.mgr.gameOverTimer() === 0) this.ctx.musica?.(16777218);
      this.log("pelea");
    }
  }
  CF084(a1, a2, a3) {
    if (this.f6D4 === 20) return;
    let s4 = 0, s3 = 0;
    if (this.f718 === 0) {
      const v1 = this.f71C;
      if (this.f720 === 0) {
        if (a1 < v1) a1 = 0; else if (a1 <= v1 + 32) a1 = v1 - a1; else if (a1 <= v1 + 96) a1 = a1 - v1 - 64; else if (a1 <= v1 + 128) a1 = v1 - (a1 - 64); else a1 = 0;
        s4 = Math.trunc(a2 * a1 / 32);
        s3 = Math.trunc(a3 * a1 / 32);
      } else {
        if (a1 < 0) {
          this.f710 = 0;
          this.f714 = 0;
        } else {
          const r1 = rsin(a1 * 32), r0 = rsin(a1 * 16);
          if (r1 === 0) {
            this.f714 = randS(16);
            a3 = this.f714;
          }
          s4 = Math.trunc(r0 / 1024);
          s3 = Math.trunc(a3 * r1 / 4096);
        }
      }
    }
    const b = this.hueso4(), x = this.f9FC.x - b.x >> 1, z = this.f9FC.z - b.z >> 1, y = this.f9FC.y - b.y >> 1;
    const yaw = s3 + ratan2(x, z) & 4095, len = isqrt(z * z + x * x), ax = ratan2(len, y) - 1024 + s4 & 4095;
    this.adjust[4][0] = ax;
    this.adjust[6][0] = ax;
    this.adjust[7][0] = ax;
    this.adjust[1][1] = yaw - this.rot & 4095;
  }
  D0358() {
    if (this.snakeIntocable()) return;
    if (!(this.f9E8 === 2 || this.fA04 === 1 || this.f718 === 1 || !this.D0298() && !this.D01D8())) return;
    this.f71C = 0;
    this.f6DC--;
    const b4 = this.hueso4(), ang = Wolf.CEED4(this.f6D8, b4, this.f9FC);
    const dir = this.f9FC.clone().sub(b4);
    if (dir.lengthSq() < 1) dir.set(0, 0, 1);
    dir.normalize();
    const boca = b4.clone().addScaledVector(dir, -OFF_BOCA1.y);
    if (this.f718 !== 1) {
      this.mgr.chispa(boca.clone().multiplyScalar(MM), .5, 3, 16769184);
      const sale = boca.clone().addScaledVector(dir, -OFF_BOCA2.y - 400);
      this.nuevaBala(sale, dir, 128, 3e5, 5e3, this.f99C === 0 ? "chispa" : "humo");
      this.tiros++;
      this.log("tiro", {
        a: this.fA04 ? "meryl" : "snake",
        dist: this.f6D8,
        ang: [ ang.x, ang.y ],
        quedan: this.f6DC
      });
    } else if (this.snakeVivo()) {
      this.fA70 = 1;
      if (this.f9C8 !== -1) {
        this.A.dañarSnake(0, "blast");
        this.ultimoItem = this.item();
        this.ultimaArma = this.arma();
        if ([ IT.SCOPE, IT.CAMERA, IT.NVG, IT.THERMG ].includes(this.item())) this.inv?.equiparItem(-1);
        if ([ WP.PSG1, WP.STINGER ].includes(this.arma())) this.inv?.equiparArma(-1);
        this.f9CC = 1;
        this.log("tiro de aviso (-d)");
      } else {
        this.A.dañarSnake(64, "blast");
        this.log("tiro zona prohibida", {
          "daño": 64
        });
      }
      this.tiros++;
    }
    this.se2(SE.TIRO);
    this.limpiarAdjust();
  }
  nuevaBala(origen, dir, daño, largo, vel, efecto) {
    const hit = this.mgr.pared(origen, dir, largo, this.mgr.grupoHzd ?? -1, HZD_SEG_NO_PLAYER);
    this.balasW.push({
      pos: origen.clone(),
      start: origen.clone(),
      dir: dir.clone(),
      vel: vel,
      "daño": daño,
      dist: 0,
      hitDist: hit ? hit.dist : largo,
      hitPos: hit ? hit.punto : origen.clone().addScaledVector(dir, largo),
      hit: !!hit,
      efecto: efecto,
      mesh: this.J.ctx.balaVisual?.(origen.clone().multiplyScalar(MM), dir) || null
    });
  }
  cuadroBalas() {
    for (const b of this.balasW.slice()) {
      b.dist += b.vel;
      const sig = b.dist > b.hitDist ? b.hitPos.clone() : b.pos.clone().addScaledVector(b.dir, b.vel);
      let fin = false, mejor = null;
      const blancos = [];
      if (this.snakeVivo() && !this.A.snakeInvencible() && this.J.activo !== false && !this.J.ctx.vuelo?.()) blancos.push({
        ...this.cajaSnake(),
        snake: true
      });
      for (const j of this.mgr.lista) if (j !== this && j.vivo && typeof j.cajasBlanco === "function") for (const c of j.cajasBlanco()) if (c.lado === 1) blancos.push({
        ...c,
        jefe: j
      });
      for (const t of blancos) {
        const q = cortaCaja(b.pos, sig, t.c, t.s);
        if (q && (!mejor || q.distanceTo(b.pos) < mejor.q.distanceTo(b.pos))) mejor = {
          q: q,
          t: t
        };
      }
      if (mejor) {
        fin = true;
        this.impactos++;
        if (mejor.t.snake) {
          this.A.dañarSnake(b.daño, "bala");
          this.log("le pega a Snake", {
            "daño": b.daño
          });
        } else mejor.t.jefe.golpeBala?.(mejor.t.id, b.daño, 1);
      }
      b.pos.copy(mejor ? mejor.q : sig);
      if (b.mesh) b.mesh.position.copy(b.pos).multiplyScalar(MM);
      if (!fin && b.dist > b.hitDist) {
        fin = true;
        if (b.hit) this.mgr.chispa(b.hitPos.clone().multiplyScalar(MM), b.efecto === "humo" ? .4 : .3, 4, b.efecto === "humo" ? 14542058 : 16777215);
      }
      if (fin) {
        b.mesh?.removeFromParent();
        this.balasW.splice(this.balasW.indexOf(b), 1);
      }
    }
  }
  D0734() {
    return this.fA64 === 1 && this.mgr.frame % 32 === 0 && randU(8) === 0;
  }
  D09D4(sig) {
    if (this.D01D8() || this.zoom() < 900) return;
    if (this.enPantalla(this.mov).ve) {
      if (this.f704 === 0 && this.arma() === WP.PSG1) {
        this.f704 = 1;
        this.f708 = 150;
      }
      if (this.f708 !== 0) {
        if (--this.f708 === 30) {
          this.se2(SE.NOTA);
          this.marca("!");
          this.log("la ven", {});
        }
        if (this.f708 === 1) {
          if (this.f6D4 !== 0 && this.f6D4 !== 34) this.f6D4 = sig;
          this.f708 = 0;
        }
      }
    } else this.f704 = 0;
  }
  D0B04(a1) {
    if (randU(4) === 0) {
      if (this.f728 === 1) this.f728 = 0;
      if (this.f728 === 0) this.f728 = 1;
    }
    const dir = this.f728 === 1 ? -1 : 1;
    this.f884 = this.f880 + dir;
    if (this.f7FC - 1 < this.f884) {
      this.f884 = this.f7FC - 2;
      this.f728 = 1;
    }
    if (this.f884 < 0) {
      this.f884 = 1;
      this.f728 = 0;
    }
    if (this.punto(this.f884).x > this.mov.x) {
      if (a1 === 0) this.turn = this.turn - 1024 & 4095;
    } else if (a1 === 0) this.turn = this.turn + 1024 & 4095;
    this.f880 = this.f884;
  }
  D0C1C(a1) {
    this.turn = ratan2(this.f988.x - this.mov.x, this.f988.z - this.mov.z) & 4095;
    if (this.mov.x < this.punto(this.f884).x) {
      if (a1 === 0) this.turn = this.turn - 1024 & 4095;
    } else if (a1 === 0) this.turn = this.turn + 1024 & 4095;
  }
  D0CAC() {
    if (this.f99C === 0) return 3;
    const base = this.mov.clone();
    base.y += 1e3;
    const centro = this.f9FC.clone().add(base).multiplyScalar(.5).round();
    const prueba = paso => {
      const pos = base.clone(), tgt = centro.clone();
      let i = 0;
      for (;i < 4; i++) {
        if (!this.hzd(pos, tgt, HZD_SEG_NO_NAVIGATE)) break;
        tgt.x += paso;
        pos.x += paso;
      }
      return i;
    };
    const i = prueba(-100), j = prueba(100);
    if (i === 4 || j === 4) return 0;
    if (i !== 0 && i === j) return 3;
    if (i >= j) return i > j ? 2 : 0;
    return 1;
  }
  D0ED4() {
    switch (this.f6D4) {
     case 18:
      {
        this.f9FC.copy(this.A.snake());
        this.CED64();
        this.f720 = randU(4);
        this.f9A8 = 0;
        this.limpiarAdjust();
        this.f6F4 = 0;
        this.f6F8 = 0;
        this.D0B04(1);
        this.f6D4 = 19;
        const pos = this.punto(this.f880), d = pos.clone().sub(this.f9FC), len = isqrt((d.x >> 4) ** 2 + (d.y >> 4) ** 2 + (d.z >> 4) ** 2) << 4;
        const rot = Wolf.CEED4(len, this.f9FC, pos);
        rot.x -= 1024;
        this.f988.copy(Wolf.poner(pos, rot, V(0, 0, -1500)).round());
        this.log("mudarse", {
          punto: this.f880,
          modo: this.f800[this.f880],
          destino: [ this.f988.x, this.f988.z ]
        });
      }

     case 19:
      {
        this.D0C1C(1);
        if (Math.abs(this.mov.x - this.f988.x) < 200) {
          this.turn = 0;
          this.rot = 0;
          if (this.f99C === 1 && this.f988.x > -4e3 && this.f988.x < 7e3 || randU(16) === 0 && this.f800[this.f880] !== 1) {
            this.f6D4 = 18;
            break;
          }
          switch (this.f800[this.f880]) {
           case 0:
            this.se2(SE.LISTA);
            this.CEFF0(6);
            this.D0904(3, 0, 0);
            break;

           case 1:
            this.se2(SE.LISTA);
            this.CEFF0(7);
            this.D08D8(11);
            break;

           case 2:
            this.f6F8 = 0;
            this.f6D4 = 20;
            this.CEDC0();
            this.D08D8(13);
            break;

           case 3:
            this.f6D4 = 30;
            break;
          }
        } else this.D0848(25, 19);
        break;
      }

     case 30:
      this.f9A8 = 1;
      this.D0904(3, 0, 31);
      this.f6F4 = randU(32) + 150;
      break;

     case 31:
      this.D08D8(0);
      if (this.f6F4-- <= 0) this.f6D4 = 33;
      break;

     case 20:
      this.f6D4 = 21;
      this.CEDC0();

     case 21:
      {
        const pos = this.punto(this.f880), s = this.A.snake(), d = pos.clone().sub(s);
        const len = isqrt(Math.trunc(d.x / 16) ** 2 + Math.trunc(d.y / 16) ** 2 + Math.trunc(d.z / 16) ** 2) << 4;
        const rot = Wolf.CEED4(len, s, pos);
        rot.x -= 1024;
        const p20 = Wolf.poner(pos, rot, V(0, 0, -1e3)).round(), e = p20.clone().sub(this.mov);
        const len2 = isqrt(Math.trunc(e.x / 16) ** 2 + Math.trunc(e.y / 16) ** 2 + Math.trunc(e.z / 16) ** 2) << 4;
        if (len2 > 1100) {
          this.f6D4 = 18;
          this.D08D8(13);
          break;
        }
        this.mov.copy(p20);
        this.f9F8 = 0;
        const rnd = randU(1024);
        this.CEF50();
        if (this.f6F8 === 30) {
          if (randU(8) === 0) this.f6D4 = 18;
          this.D08D8(13);
          break;
        }
        if (rnd <= 512 && this.f6F8 >= 240) {
          this.f6F8 = 0;
          this.f6E4 = 1;
          this.f6F4++;
          switch (this.D0CAC()) {
           case 0:
            this.f6D4 = 18;
            break;

           case 1:
            this.f6D4 = 22;
            this.se2(SE.LISTA);
            this.CED64();
            break;

           case 2:
            this.f6D4 = 26;
            this.se2(SE.LISTA);
            this.CED64();
            break;

           case 3:
            this.f6D4 = randU(2) === 0 ? 22 : 26;
            this.se2(SE.LISTA);
            this.CED64();
            break;
          }
        } else if (rnd <= this.f6F4) {
          this.f6D4 = 18;
          this.CED64();
        } else {
          this.D08D8(13);
          break;
        }
        this.D08D8(13);
        break;
      }

     case 22:
      this.f9F8 = 1;
      this.D0848(14, 23);
      break;

     case 23:
      this.D09D4(18);
      if (this.f6E8-- < 0 || this.D0734()) this.f6D4 = 24;
      this.D08D8(15);
      break;

     case 24:
      this.f9F8 = 0;
      this.D0358();
      this.f6D4 = 25;
      this.D08D8(16);
      break;

     case 25:
      this.D0848(17, 20);
      break;

     case 26:
      this.f9F8 = 1;
      this.D0848(18, 27);
      break;

     case 27:
      this.D09D4(18);
      if (this.f6E8-- < 0 || this.D0734()) this.f6D4 = 28;
      this.D08D8(19);
      break;

     case 28:
      this.f9F8 = 0;
      this.D0358();
      this.f6D4 = 29;
      this.D08D8(20);
      break;

     case 29:
      this.D0848(21, 20);
      break;

     case 6:
      this.f6F4 = 1;
      this.D0904(3, 0, 0);
      break;

     case 7:
      this.f6F4 = 1;
      this.D08D8(11);
      this.CEFF0(1);
      break;

     case 0:
      this.fA2C = -1;
      this.CEE78();
      this.f9F8 = 1;
      this.D09D4(4);
      if (this.f6E8-- < 0 || this.D0734()) this.f6D4 = 2; else this.D08D8(0);
      break;

     case 1:
      this.CEE1C();
      if (!this.D01D8()) this.f6E8 = 30;
      this.f6D4 = 34;

     case 34:
      this.f9F8 = 1;
      this.D09D4(5);
      if (this.f6E8-- < 0 || this.D0734()) this.f6D4 = 3; else this.D08D8(11);
      break;

     case 2:
      this.D08A0(1);
      this.f9F8 = 0;
      this.D0358();
      if (this.f6DC <= 0) {
        this.f6D4 = 16;
        this.f6DC = this.f6E0;
      } else if (randU(2) === 0) this.f6D4 = 4; else {
        this.f6F4 = 1;
        this.CEFF0(0);
      }
      break;

     case 3:
      this.D08A0(12);
      this.f9F8 = 0;
      this.D0358();
      if (this.f6DC <= 0) {
        this.f6D4 = 17;
        this.f6DC = this.f6E0;
      } else this.f6D4 = 5;
      break;

     case 16:
      this.D0848(24, 0);
      break;

     case 17:
      this.D0848(23, 1);
      break;

     case 4:
      this.f9F8 = 0;
      this.D0848(2, 18);
      break;

     case 5:
      this.f9F8 = 0;
      this.f6D4 = 18;
      break;

     case 8:
      this.D0848(7, 18);
      break;

     case 9:
      if (this.fA4C !== -1) this.padRelease(true);
      if (this.f6C0 !== 10) {
        this.f6C0 = 10;
        this.motor.accion(10, 0);
      } else if (this.motor.isEnd === 1) {
        this.f6C0 = 9;
        this.motor.accion(9, 0);
        this.f6F4 = 90;
        this.f6D4 = 11;
      }
      break;

     case 10:
     case 33:
      this.D0848(2, 18);
      break;

     case 12:
      if (randU(16) < 2) this.D0848(6, 15); else this.D0848(6, 4);
      break;

     case 13:
      if (this.fA4C !== -1) this.padRelease(true);
      this.f6F4 = 90;
      this.D0904(8, 9, 11);
      break;

     case 15:
      this.f6F4 = 1;
      this.CEFF0(0);
      this.D08D8(0);
      break;

     case 11:
      this.D0848(9, 11);
      this.f9BC = 1;
      if (this.f6F4 > 0) {
        this.f6F4--;
        if (this.fA4C !== -1 && this.snakeVivo()) this.procE();
      }
      break;
    }
  }
  procE() {
    if (this.yaE) return;
    this.yaE = true;
    const ok = this.A.proc(this.actor, "e");
    this.log("-e", {
      proc: this.fA4C,
      guion: ok
    });
    if (!ok) {
      this.mgr.ganado = {
        jefe: "SNIPER WOLF",
        proc: this.fA4C,
        st: this.st
      };
      if (this.f99C === 0) this.mgr.fx.push({
        t: 0,
        dur: 64,
        fn: t => {
          this.mgr.hud.negro = t <= 32 ? t / 32 : (64 - t) / 32;
        },
        fin: () => {
          this.mgr.hud.negro = 0;
        }
      });
    }
  }
  CF2C4() {
    if (this.f9F8 !== 1) {
      this.laserVisible(false);
      return;
    }
    this.laserVisible(true);
    const h4 = this.huesos[4];
    if (!h4) return;
    const step = 3e4, count = Math.trunc(this.f6D8 / step) + 1;
    const dirU = ejeMM(h4, V(0, -1, 0)).normalize(), sp18 = dirU.clone().multiplyScalar(step);
    let sp20 = vecMM(h4, OFF_LASER);
    const sp30 = sp20.clone();
    let hit = false, hitT = false, alto = 0;
    const blancos = [];
    if (this.snakeVivo()) blancos.push({
      ...this.cajaSnake(),
      snake: true
    });
    for (const j of this.mgr.lista) if (j !== this && j.vivo && typeof j.cajasBlanco === "function") for (const c of j.cajasBlanco()) if (c.lado === 1) blancos.push(c);
    for (let i = 0; i < count; i++) {
      const sp28 = sp20.clone();
      sp20 = sp20.clone().add(sp18);
      for (const t of blancos) {
        const q = cortaCaja(sp28, sp20, t.c, t.s);
        if (q) {
          sp20 = q;
          hit = true;
          hitT = true;
        }
      }
      const hz = this.hzd(sp28, sp20, HZD_SEG_NO_PLAYER);
      if (hz) {
        sp20 = hz.punto.clone();
        hit = true;
      }
      if (!hit) continue;
      sp20.x += randS(16);
      sp20.y += randS(16);
      sp20.z += randS(16);
      const ve = this.enPantalla(this.mov);
      if (ve.ve && this.zoom() > 900 && this.f9A8 === 0 && hitT && (this.arma() === WP.PSG1 || this.item() === IT.SCOPE)) {
        const pp = this.enPantalla(sp20), dist = Math.abs(160 - pp.sx) + Math.abs(112 - pp.sy) & 4095;
        if (pp.ve && dist < 90) {
          this.fA64 = 1;
          this.se2(SE.LASER);
          this.laserVisible(false);
          const k = Math.trunc((90 - dist) / 2) + 160;
          if (k > this.fA10[0]) this.fA10 = [ k, Math.trunc(k / 4), 0 ];
          this.brillo(vecMM(h4, OFF_LASER));
          this.laserFin = null;
        }
        return;
      }
      alto = i * 3e4 + Math.round(sp28.distanceTo(sp20));
      break;
    }
    this.laserIni = sp30;
    this.laserFin = this.f6FC <= 0 ? sp30.clone() : sp30.clone().addScaledVector(dirU, alto);
  }
  escenaMira() {
    if (this.f9CC === 2) {
      if (this.f9F0 !== 1) {
        this.f9F0 = 1;
        this.mira(true);
        this.hud(false);
      }
      this.D1BE8();
      if (!this.A.snakeInvencible() || [ IT.BOX1, IT.BOX2, IT.BOX3 ].includes(this.item())) this.f9CC = 3;
    }
    if (this.f9CC > 2) {
      this.f9CC++;
      this.D1BE8();
      this.padDemo = true;
      this.aplicarCongelado();
      if (this.f9CC === 119) this.se2(SE.LLAMADA); else if (this.f9CC === 149) {
        if ([ WP.PSG1, WP.STINGER ].includes(this.ultimaArma)) this.inv?.equiparArma(this.ultimaArma);
        if ([ IT.SCOPE, IT.CAMERA, IT.NVG, IT.THERMG ].includes(this.ultimoItem)) this.inv?.equiparItem(this.ultimoItem);
      } else if (this.f9CC > 149) {
        this.padDemo = false;
        this.mira(false);
        this.hud(true);
        this.A.soltarCamara();
        const s = this.A.snake(), ok = this.A.proc(this.actor, "d", [ Math.round(s.x), Math.round(s.y), Math.round(s.z) ]);
        this.log("-d", {
          proc: this.f9C8,
          guion: ok
        });
        this.destruirActor("mira");
        return true;
      }
    }
    if (this.f9CC === 1 && this.snakeVivo()) {
      this.f9CC = 2;
      this.padDemo = true;
      this.aplicarCongelado();
      const s = this.A.snake();
      this.fA18.set(s.x < 13e3 ? 7464 : 55e3, 8e3, -14e3);
      this.log("escena de la mira", {
        desde: [ this.fA18.x, this.fA18.z ]
      });
    }
    return false;
  }
  D1BE8() {
    const T = this.mgr.frame;
    if (T % 60 === 0) this.se2(SE.LATIDO);
    const p = this.A.snake();
    p.y += Math.trunc((rsin(T * 64) - Math.trunc(rsin(T * 31) / 2) - Math.trunc(rsin(T * 131) / 2)) / 16);
    p.x += Math.trunc((rsin(T * 23) - Math.trunc(rsin(T * 45) / 2) - Math.trunc(rsin(T * 145) / 2)) / 16);
    const c = this.fA18.clone().multiplyScalar(31).add(p).divideScalar(32);
    this.A.ponerCamara(this.fA18, c, 3721);
  }
  setCamera() {
    const s = this.A.snake(), pos = V(s.x, 2500, s.z);
    const ojo = V(Math.trunc(s.x / 2), 4e3, s.z + 2e3 + Math.trunc(Math.abs(this.mov.x - s.x) / 4));
    this.A.ponerCamara(ojo, ojo.clone().multiplyScalar(15).add(pos).divideScalar(16), 320);
  }
  caminarSnake(sentido) {
    const r = this.J.ctx.rig.position;
    r.x += sentido * .115;
  }
  padRelease(si) {
    if (this._pad !== si) {
      this._pad = si;
      this.aplicarCongelado();
    }
  }
  aplicarCongelado() {
    const si = !!(this._pad || this.padDemo);
    if (this._cong !== si) {
      this._cong = si;
      this.mgr.congelar(si);
    }
  }
  quitarArma() {
    if (this.arma() >= 0) this.inv?.equiparArma(-1);
  }
  hud(si) {
    const h = document.getElementById("hud");
    if (!h) return;
    if (!si) {
      if (this.hudPrevio == null) {
        this.hudPrevio = h.hidden;
        h.hidden = true;
      }
    } else if (this.hudPrevio != null) {
      h.hidden = this.hudPrevio;
      this.hudPrevio = null;
    }
  }
  mira(si) {
    if (si && !this.divMira) {
      const d = document.createElement("div");
      Object.assign(d.style, {
        position: "fixed",
        inset: "0",
        zIndex: "6",
        pointerEvents: "none",
        background: "radial-gradient(circle at 50% 50%, transparent 0 34vmin, #000 35vmin), linear-gradient(#000a, #000a) 50% 50% / 1px 100% no-repeat, linear-gradient(#000a, #000a) 50% 50% / 100% 1px no-repeat"
      });
      (document.getElementById("hud")?.parentElement || document.body).appendChild(d);
      this.divMira = d;
    }
    if (!si && this.divMira) {
      this.divMira.remove();
      this.divMira = null;
    }
  }
  cajasBlanco() {
    if (!this.t1 || this.f6FC < 1) return [];
    const r = [];
    if (this.t1.activo) r.push({
      id: 1,
      c: this.t1.c,
      s: this.t1.s,
      lado: 2
    });
    if (this.t2.activo) r.push({
      id: 2,
      c: this.t2.c,
      s: this.t2.s,
      lado: 2
    });
    return r;
  }
  get proxy() {
    if (!this._proxyW) {
      const j = this, ancla = new THREE.Object3D;
      ancla.position.set(0, -10, 0);
      this._proxyW = {
        __jefe: j,
        think: {
          t1: 1
        },
        combo: 0,
        tCombo: 0,
        faint: 1,
        faintMax: 1,
        o: ancla,
        get accion() {
          return j.blanco ? "jefe" : "muerto";
        },
        get vital() {
          return j.vitalBlanco();
        },
        get rot() {
          return j.rot;
        },
        set vital(v) {}
      };
    }
    return this._proxyW;
  }
  recibirGolpe(cuanto, modo, origen) {
    if (!this.vivo || !this.blanco || origen.aturdidora) return;
    const id = this.cajaPegada || 1;
    this.cajaPegada = 0;
    const t = id === 2 ? this.t2 : this.t1;
    t.dañado = true;
    t.a_mode = origen.explosion ? 2 : modo;
    this.log("le pegan", {
      caja: id,
      modo: t.a_mode,
      "daño": cuanto
    });
  }
  alExplotar(p) {
    if (!this.vivo || !this.blanco) return;
    const c = p.clone().multiplyScalar(1e3);
    for (const b of this.cajasBlanco()) {
      if (Math.abs(b.c.x - c.x) <= 2e3 + b.s.x && Math.abs(b.c.y - c.y) <= 2e3 + b.s.y && Math.abs(b.c.z - c.z) <= 2e3 + b.s.z) {
        const t = b.id === 2 ? this.t2 : this.t1;
        t.dañado = true;
        t.a_mode = 2;
        this.log("explosión", {
          caja: b.id
        });
      }
    }
  }
  drawLifebar() {
    const B = this.barras[0];
    if (this.fA68 !== 0) {
      B.visible = false;
      return;
    }
    const cur = Math.max(Math.trunc(this.fA40 / 8) * 8, 0);
    let life = this.fA44, rest = life;
    const now = cur;
    if (cur > life) {
      rest = cur;
      life = cur;
    }
    if (this.f9BC === 1 && life === cur) {
      if (this.fA50 >= 30) {
        B.visible = false;
        return;
      }
      this.fA50++;
    }
    B.rest = rest;
    B.now = now;
    B.visible = true;
    if (cur < life) this.fA44 -= 8;
  }
  crearLaser() {
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute([ 0, 0, 0, 0, 0, 0 ], 3));
    const mat = new THREE.LineBasicMaterial({
      color: 16719904,
      transparent: true,
      opacity: .55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laser = new THREE.Line(g, mat);
    this.laser.frustumCulled = false;
    this.laser.visible = false;
    this.laser.userData.sinColision = true;
    this.laser.renderOrder = 3;
    const pg = new THREE.BufferGeometry;
    pg.setAttribute("position", new THREE.Float32BufferAttribute([ 0, 0, 0 ], 3));
    this.punta = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 16727871,
      size: 3,
      sizeAttenuation: false,
      depthWrite: false,
      transparent: true
    }));
    this.punta.frustumCulled = false;
    this.punta.visible = false;
    this.punta.userData.sinColision = true;
    this.mgr.mundo.add(this.laser);
    this.mgr.mundo.add(this.punta);
    this.laserIni = null;
    this.laserFin = null;
    const d = document.createElement("div");
    Object.assign(d.style, {
      position: "fixed",
      inset: "0",
      zIndex: "5",
      pointerEvents: "none",
      mixBlendMode: "screen",
      background: "#000",
      display: "none"
    });
    (document.getElementById("hud")?.parentElement || document.body).appendChild(d);
    this.divRojo = d;
  }
  laserVisible(si) {
    this.laserOn = si;
  }
  cuadroLaserVisual() {
    const on = this.laserOn && this.laserIni && this.laserFin && this.vivo;
    this.laser.visible = !!on && this.laserFin.distanceTo(this.laserIni) > 10;
    this.punta.visible = !!on;
    if (on) {
      const a = this.laserIni.clone().multiplyScalar(MM), b = this.laserFin.clone().multiplyScalar(MM), p = this.laser.geometry.attributes.position;
      p.setXYZ(0, a.x, a.y, a.z);
      p.setXYZ(1, b.x, b.y, b.z);
      p.needsUpdate = true;
      const q = this.punta.geometry.attributes.position;
      q.setXYZ(0, a.x, a.y, a.z);
      q.needsUpdate = true;
    }
    const f = this.fA10, ver = this.arma() === WP.PSG1 && f[0] > 0;
    this.divRojo.style.display = ver ? "" : "none";
    if (ver) this.divRojo.style.background = `rgb(${Math.min(255, f[0])},${Math.min(255, f[1])},${Math.min(255, f[2])})`;
  }
  brillo(pMM) {
    if (!this._texK) {
      this._texK = (new THREE.TextureLoader).load("assets/jefes/kirari.png");
      this._texK.colorSpace = THREE.SRGBColorSpace;
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this._texK,
      color: 16777215,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true
    }));
    s.position.copy(pMM).multiplyScalar(MM);
    s.scale.setScalar(.6);
    s.userData.sinColision = true;
    this.mgr.mundo.add(s);
    this.mgr.fx.push({
      t: 0,
      dur: 6,
      fn: t => {
        s.material.opacity = 1 - t / 6;
      },
      fin: () => {
        s.removeFromParent();
        s.material.dispose();
      }
    });
  }
  aliento() {
    if (this.o && this.huesos[6]) this.mgr.chispa(vecMM(this.huesos[6], V(0, 0, 150)).multiplyScalar(MM), .18, 10, 11583688);
  }
  se2(id) {
    this.mgr.se(id, null, null);
  }
  destruirActor(motivo) {
    if (!this.vivo) return;
    this.padRelease(false);
    this.padDemo = false;
    this.aplicarCongelado();
    this.mira(false);
    this.hud(true);
    if (this.cine) {
      this.A.finCine();
      this.cine = false;
    }
    this.A.soltarCamara();
    const s = this.A.snake();
    if (motivo === "pelea forzada") {} else if (this.f9BC === 1 && this.f9C4 === this.f9BC && this.f9C0 !== -1) this.A.proc(this.actor, "c", [ Math.round(s.x), Math.round(s.y), Math.round(s.z) ]); else if (this.f9E4 !== -1) this.A.proc(this.actor, "j", [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z), this.rot, this.f6FC ]);
    this.log("destruida", {
      motivo: motivo
    });
    this.destruir();
  }
  destruir() {
    super.destruir();
    for (const b of this.balasW || []) b.mesh?.removeFromParent();
    this.balasW = [];
    this.laser?.removeFromParent();
    this.punta?.removeFromParent();
    this.divRojo?.remove();
    this.mira(false);
    this.hud(true);
    if (this._cong) {
      this._cong = false;
      this.mgr.congelar(false);
    }
    if (this.cine) {
      this.A.finCine();
      this.cine = false;
    }
    this.barras = [];
  }
  estadoPrueba() {
    return {
      estado: this.f6D4,
      accion: this.f6C0,
      golpes: this.f6FC,
      barra: this.fA40,
      punto: this.f880,
      modo: this.f800?.[this.f880],
      pos: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      apunta: [ this.f9FC.x, this.f9FC.y, this.f9FC.z ],
      espera: this.f6E8,
      tiros: this.tiros,
      impactos: this.impactos,
      recibidos: this.golpesRecibidos,
      laser: !!this.laserOn,
      resplandor: this.fA10?.[0] || 0,
      zona: this.f718,
      mira: this.f9CC,
      caida: this.f9BC,
      sinControl: !!this._cong,
      blanco: this.blanco,
      cajas: this.cajasBlanco().map(c => ({
        id: c.id,
        c: [ Math.round(c.c.x), Math.round(c.c.y), Math.round(c.c.z) ],
        s: [ c.s.x, c.s.y, c.s.z ]
      }))
    };
  }
}

export class MerylHerida extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "MERYL";
    this.registro = [];
    this.A = apoyo(mgr);
    actualW = mgr;
    engancharArmas(this.ctx.armas || this.J.ctx.armas || globalThis.__mgs?.armas);
    engancharGuion(this.A.guion);
    this.vocesDichas = [];
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  num(v, d = 0) {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && v.var) {
      const x = this.A.guion?.vars?.get?.(v.var);
      if (typeof x === "number") return x;
    }
    return d;
  }
  ints(k) {
    return (this.opts[k] || []).map(x => this.num(x, 0));
  }
  procOpt(k) {
    const p = this.procId(k);
    return p > 0 ? p : -1;
  }
  vidaMaxSnake() {
    return this.J.ctx.inventario?.vidaMax || 256;
  }
  async iniciar() {
    const m = this.ints("m"), h = this.ints("h"), c = this.ints("c");
    this.f7A8 = m.length ? m[0] : 0;
    this.f7A4 = h.length && (h[0] || !this.opts.h?.[0]?.var) ? h[0] : 128;
    if (!(this.f7A4 > 0)) this.f7A4 = 128;
    this.f7AC = c.length ? c[0] : 10;
    const p = this.ints("p"), d = this.ints("d");
    if (p.length >= 3) this.mov.set(p[0], p[1], p[2]);
    if (d.length >= 3) {
      this.rot = this.turn = d[1] & 4095;
    }
    this.voces = (this.opts.v || []).filter(x => typeof x === "number");
    this.f780 = this.procOpt("n");
    this.f784 = this.procOpt("o");
    this.f788 = this.procOpt("a");
    this.f78C = this.procOpt("b");
    await this.cargarCuerpo("jefes/meryl_herida.glb", "mel10ad");
    this.A.precargarVoces(this.voces);
    this.f6A4 = this.f6A0 = this.f6A8 = this.f69C = this.f6AC = this.f690 = 0;
    this.f688 = 6;
    this.limpiar();
    this.setAction(0);
    this.f778 = 0;
    this.f77C = 0;
    this.f770 = 0;
    this.f774 = 0;
    this.f6B0 = 0;
    this.f7B0 = 0;
    this.t1 = {
      c: this.mov.clone(),
      s: V(500, 500, 500),
      "dañado": false,
      "daño": 0,
      a_mode: 0
    };
    this.t2 = {
      c: this.mov.clone(),
      s: V(500, 500, 500),
      "dañado": false,
      "daño": 0,
      a_mode: 0
    };
    this.f79C = this.f7A8 === 0 ? this.vidaMaxSnake() : 0;
    this.barras = [ {
      y: 40,
      rest: 0,
      now: 0,
      max: this.vidaMaxSnake(),
      conf: {
        nombre: "MERYL",
        izq: [ 31, 191, 95 ],
        der: [ 31, 191, 95 ],
        alto: 1
      }
    } ];
    this.drawLifebar();
    this.piso = this.mov.y;
    const c0 = this.motor.clip(0);
    if (c0) {
      for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c0.rot.slice(j * 3, j * 3 + 3);
      this.motor.altura = c0.altura[0];
    }
    this.blanco = true;
    this.dibujar();
    this.mgr.hud.negro = 1;
    this.fundido = {
      modo: 1,
      t: 0
    };
    wolf2Pos = this.mov.clone();
    this.log("inicio", {
      vida: this.f7A4,
      m: this.f7A8,
      voces: this.voces.length
    });
  }
  limpiar() {
    for (const a of this.adjust || []) {
      a[0] = 0;
      a[1] = 0;
      a[2] = 0;
    }
  }
  setAction(a) {
    this.f688 = a;
    this.motor.accion(a, 4);
  }
  D3704(a, sig) {
    if (this.f688 !== a) {
      this.f688 = a;
      this.motor.accion(a, 4);
      return;
    }
    if (this.motor.isEnd === 1) this.f690 = sig;
  }
  hablar(i) {
    const id = this.voces[i];
    if (this.A.estadoVoz() === -1 && id > 0) {
      this.A.hablar(id);
      this.vocesDichas.push(id);
      this.log("voz", {
        i: i,
        id: id
      });
    }
  }
  procO() {
    if (this.f784 !== -1) this.A.proc(this.actor, "o", [ this.f7A4 ]);
  }
  ponerSangre() {
    const h = this.huesos[randU(8)];
    if (h) this.sangre(vecMM(h, OFF_SANGRE).multiplyScalar(MM));
  }
  drawLifebar() {
    const VM = this.vidaMaxSnake(), B = this.barras[0];
    this.f7A0 = VM * this.f7A4 >> 8;
    const now = Math.max(Math.trunc(this.f7A0 / 8) * 8, 0), rest = Math.max(this.f79C, now);
    B.rest = rest;
    B.now = now;
    B.max = VM;
    if (now < rest) this.f79C -= 8;
  }
  cajasBlanco() {
    return this.vivo && this.f778 === 0 ? [ {
      id: 1,
      c: this.t1.c,
      s: this.t1.s,
      lado: 1
    }, {
      id: 2,
      c: this.t2.c,
      s: this.t2.s,
      lado: 2
    } ] : [];
  }
  golpeBala(id, daño, modo) {
    const t = id === 2 ? this.t2 : this.t1;
    t.dañado = true;
    t.daño = daño;
    t.a_mode = modo;
  }
  get proxy() {
    if (!this._proxyM) {
      const j = this, ancla = new THREE.Object3D;
      ancla.position.set(0, -10, 0);
      this._proxyM = {
        __jefe: j,
        think: {
          t1: 1
        },
        combo: 0,
        tCombo: 0,
        faint: 1,
        faintMax: 1,
        o: ancla,
        get accion() {
          return j.blanco ? "jefe" : "muerto";
        },
        vital: 1,
        get rot() {
          return j.rot;
        }
      };
    }
    return this._proxyM;
  }
  recibirGolpe(cuanto, modo, origen) {
    if (!this.vivo || !this.blanco || origen.aturdidora) return;
    const id = this.cajaPegada || 2;
    this.cajaPegada = 0;
    if (origen.explosion) this.golpeBala(1, cuanto, 2); else this.golpeBala(id, cuanto, modo);
    this.log("le pega Snake", {
      "daño": cuanto,
      modo: origen.explosion ? 2 : modo
    });
  }
  alExplotar(p) {
    if (!this.vivo) return;
    const c = p.clone().multiplyScalar(1e3);
    if (Math.abs(this.t1.c.x - c.x) <= 2500 && Math.abs(this.t1.c.y - c.y) <= 2500 && Math.abs(this.t1.c.z - c.z) <= 2500 && !this.t1.dañado) this.golpeBala(1, 128, 2);
  }
  cuadro() {
    if (!this.vivo) return;
    if (this.fundido) {
      const f = this.fundido;
      f.t++;
      this.mgr.hud.negro = f.modo === 1 ? Math.max(0, 1 - f.t / 20) : Math.min(1, f.t / 20);
      if (f.t >= 20 && f.modo === 1) this.fundido = null;
    }
    if (this.mgr.gameOverTimer() !== 0 && this.f7B0 === 0) {
      this.f7B0 = 1;
      this.A.callar();
    }
    wolf2Pos = this.mov.clone();
    this.drawLifebar();
    if (!(256 - this.f7A4 < this.f69C)) {
      this.f69C++;
      if (this.f7A8 !== 0) {
        this.f69C = 255;
        this.f7A0 = this.f79C = this.vidaMaxSnake() * this.f7A4 >> 8;
      }
    }
    this.E032C();
    this.DFFD0();
    if (this.f778 === 0) {
      this.motor.tick();
    }
    if (this.f778 === 1) this.f778 = 2;
    if (this.f778 === 2) {
      this.f778 = 3;
      this.f77C = 30;
      this.fundido = {
        modo: 0,
        t: 0
      };
      this.log("fundido");
    }
    if (this.f778 === 3) {
      if (this.f77C-- < 0) {
        this.log("fin");
        this.destruir();
      }
    }
  }
  DFFD0() {}
  E032C() {
    switch (this.f690) {
     case 0:
      this.D3704(0, 0);
      break;

     case 2:
      this.D3704(1, 0);
      break;

     case 3:
      this.D3704(2, 1);
      break;

     case 4:
      this.D3704(3, 1);
      break;

     case 1:
      if (this.f6B0 === 0) {
        if (this.f770 >= 0 && this.f770 <= 3) this.hablar(this.f770);
        if (++this.f770 > 3) this.f770 = 0;
      } else {
        if (this.f774 >= 0 && this.f774 <= 2) this.hablar(4 + this.f774);
        if (++this.f774 > 2) this.f774 = 0;
      }
      this.f690 = 0;
      break;

     case 5:
      this.D3704(4, 6);
      this.f6A0 = 90;
      return;

     case 6:
      if (--this.f6A0 > 0) this.D3704(5, 6); else {
        this.f778 = 1;
        this.f690 = 7;
      }
      return;

     case 7:
      this.D3704(5, 7);
      break;
    }
    const t1 = this.t1, t2 = this.t2;
    if (this.f6AC === 0) {
      let golpe = false;
      if (t1.dañado && t1.a_mode !== 2) {
        this.f7A4 -= Math.trunc(t1.daño / 4);
        this.procO();
        this.f6B0 = 0;
        this.limpiar();
        this.f6A8 = this.f6A4 = 0;
        golpe = true;
        this.log("bala de Wolf", {
          vida: this.f7A4
        });
      } else if (t2.dañado || t1.a_mode === 2) {
        this.f6B0 = 1;
        this.f7A4 -= t1.a_mode === 2 ? Math.trunc(t1.daño / 4) : Math.trunc(t2.daño / 8);
        this.procO();
        golpe = true;
        this.log("golpe de Snake", {
          vida: this.f7A4
        });
      }
      if (golpe) {
        this.ponerSangre();
        if (this.f7A4 < 1) {
          this.f690 = 5;
          if (this.f770 !== -1) {
            this.se2(SE.MERYL_MUERE);
            this.f770 = -1;
          }
          if (this.f78C !== -1) this.A.proc(this.actor, "b");
          this.log("muere");
          this.blanco = false;
          this.mgr.gameOver();
        } else {
          this.f6AC = 1;
          this.se2(SE.MERYL_GOLPE);
          this.f690 = randU(4) < 2 ? 3 : 4;
        }
      }
    }
    t1.dañado = t2.dañado = false;
    t1.daño = t2.daño = 0;
    t1.a_mode = t2.a_mode = 0;
    const st = this.A.estadoVoz();
    if (this.f6AC === 1 && st === 2) this.f6AC = 2; else if (this.f6AC === 2 && st === -1) {
      this.f6AC = 0;
      if (this.f6B0 === 1 && this.f788 !== -1) this.A.proc(this.actor, "a");
    }
    if (this.f6AC === 1 && st === -1 && this.esperaVoz++ > 120) {
      this.f6AC = 0;
      this.esperaVoz = 0;
    }
    if (this.f6AC !== 1) this.esperaVoz = 0;
  }
  se2(id) {
    this.mgr.se(id, null, null);
  }
  destruirActor() {
    this.destruir();
  }
  destruir() {
    super.destruir();
    this.barras = [];
    if (this.fundido) {
      this.fundido = null;
    }
  }
  estadoPrueba() {
    return {
      vida: this.f7A4,
      estado: this.f690,
      accion: this.f688,
      voz: this.f6AC,
      voces: this.vocesDichas.slice(),
      barra: {
        ...this.barras[0],
        conf: undefined
      },
      fin: this.f778
    };
  }
}

MerylHerida.prototype.esperaVoz = 0;

export const TIPOS_WOLF = {
  WOLF: Wolf,
  BLOODY_MERYL: MerylHerida
};

const sel = () => {
  try {
    return new URLSearchParams(globalThis.location?.search || "").get("jefes") || "";
  } catch {
    return "";
  }
};

const varsYRestart = (g, v) => {
  for (const [k, x] of Object.entries(v)) {
    try {
      g.vars.set(k, x);
    } catch {}
  }
  g.correrProc(44333);
};

const limpiar = ctx => destruirWolfs(ctx?.juego?.__jefes, "pelea forzada");

export const PELEA_S10A = {
  elegir: (nv, ctx) => {
    limpiar(ctx);
    const w = nv.actores.filter(a => a.tipo === "WOLF");
    if (sel() === "149") return [ w.find(a => a.nombre === 17561), nv.actores.find(a => a.tipo === "BLOODY_MERYL") ].filter(Boolean).map(a => ({
      ...a,
      forzado: true
    }));
    return w.filter(a => a.nombre === 17562).slice(0, 1).map(a => ({
      ...a,
      forzado: true
    }));
  },
  snake: {
    p: [ 0, -3e4, 23500 ],
    rot: 2048
  },
  armas: {
    9: 25
  },
  guion: g => varsYRestart(g, {
    "$w:G000a": sel() === "149" ? 149 : 150,
    "$w:L0010": 0,
    "$w:L0012": -3e4,
    "$w:L0014": 23500,
    "$w:G0002": 2048
  }),
  tipos: [ "WOLF" ]
};

export const PELEA_S12A = {
  elegir: (nv, ctx) => {
    limpiar(ctx);
    const w = nv.actores.filter(a => a.tipo === "WOLF"), s = sel();
    const a = s === "196" ? w.find(x => x.opts?.d) : s === "198" ? w.find(x => (x.opts?.h || [])[0] === -1) : w.find(x => (x.opts?.u || [])[0] === 19);
    return a ? [ {
      ...a,
      forzado: true
    } ] : [];
  },
  snake: {
    p: [ 0, 0, 21e3 ],
    rot: 2048
  },
  armas: {
    9: 25
  },
  guion: g => {
    const s = sel();
    varsYRestart(g, {
      "$w:G000a": s === "196" ? 196 : s === "198" ? 198 : 197,
      "$f:G005c.6": 0,
      "$w:L0010": 0,
      "$w:L0012": 0,
      "$w:L0014": 21e3,
      "$w:G0002": 2048
    });
  },
  tipos: [ "WOLF" ]
};
