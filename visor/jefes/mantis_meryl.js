// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, Jefes, MM, ANG, randU, randS, nearExp4, nearExp8, nearExp4P, nearTimeP, cargarModelo, aplicarPose } from "./base.js";

import { SalaPsy, PSY, U } from "./mantis.js";

import { IT, TIPO_ARMA, TIPO_ITEM } from "../inventario.js";

import { ponerSonrojo } from "../sonrojo.js";

const {idiv: idiv, s16: s16, rsin: rsin, vecDir2: vecDir2, sub3: sub3, add3: add3, len3: len3, lenVec3: lenVec3, difDirS: difDirS, putVec: putVec, aV3: aV3, deV3: deV3, seMM: seMM, varGuion: varGuion, ZERO: ZERO} = U;

const strCode = s => {
  if (typeof s !== "string") return s;
  let i = 0;
  for (const c of (new TextEncoder).encode(s)) i = ((i << 5 | i >> 11) & 65535) + c & 65535;
  return i;
};

const ALTO_HZD = [ 750, 250 ];

export class PsyMeryl extends Jefe {
  se(id, p = null, modo = null) {
    seMM(this, id, p, modo);
  }
  constructor(actor, mgr) {
    super(actor, mgr);
    this.sala = SalaPsy.de(mgr);
    this.nombre = "PSYCHOMERYL";
    this.registro = [];
    this.c = {
      mov: [ 0, 0, 0 ],
      rot: [ 0, 0, 0 ],
      turn: [ 0, 0, 0 ],
      step: [ 0, 0, 0 ],
      height: 0,
      interp: 0,
      grounded: 0
    };
    this.flags = 0;
    this.flagsB = 0;
    this.phase = 0;
    this.nextPhase = -1;
    this.phaseTime = 0;
    this.estado = null;
    this.estadoT = 0;
    this.sub = 0;
    this.subt = 0;
    this.f8C8 = 0;
    this.vy = 0;
    this.hover = 0;
    this.f834 = 0;
    this.f838 = 7;
    this.f83A = 0;
    this.f82C = 0;
    this.f8BE = 0;
    this.f8C0 = 0;
    this.f8CA = 0;
    this.f8CC = 0;
    this.invuln = 0;
    this.f864 = [ 0, 0, 0 ];
    this.aSnake = [ 0, 0, 0 ];
    this.dist = 0;
    this.adjOn = false;
    this.pasoEstado = null;
    this.voces = [];
    this.procs = [];
    this.trampas = [];
    this.pasos = [];
    this.posMeryl = [ 0, 0, 0 ];
    this.shukan = 0;
    this.blancoObj = new THREE.Object3D;
    const p0 = Array.isArray(actor.p) ? actor.p : [ 0, 0, 0 ];
    this.posMeryl = p0.slice(0, 3);
    if (this.sala.meryl && this.sala.meryl !== this) this.sala.meryl.destruir();
    this.sala.meryl = this;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 600) this.registro.shift();
  }
  async iniciar() {
    const o = this.opts, a = this.actor;
    const val = (x, d = 0) => typeof x === "number" ? x : x && typeof x === "object" ? "var" in x ? varGuion(this.ctx, x.var) : "proc" in x ? x.proc : "id" in x ? x.id : d : d;
    const lista = k => Array.isArray(o[k]) ? o[k].map(x => val(x)) : null;
    const p = lista("p") || a.p || [ 0, 0, 0 ], d = lista("d") || a.d || [ 0, 0, 0 ];
    this.c.mov = p.slice(0, 3);
    this.c.rot = d.slice(0, 3);
    this.c.turn = this.c.rot.slice();
    this.f8D4 = lista("v") || [ 0, 0, 0 ];
    this.f840 = val(o.s?.[0], 0);
    if (val(o.g?.[0], 0) === 1) this.flagsB |= 1024;
    this.phase = val(o.m?.[0], 0);
    this.procE = o.e ? val(o.e[0], -1) : -1;
    this.trampas = (lista("t") || [ 60562, 12215 ]).slice(0, 5);
    this.voces = (lista("c") || []).slice(0, 19);
    while (this.voces.length < 19) this.voces.push(0);
    this.procs = (lista("r") || []).slice(0, 11);
    this.pasos = (lista("f") || []).slice(0, 8);
    const h = lista("h");
    this.barX = h?.[0] ?? 16;
    this.barY = h?.[1] ?? 40;
    const lvl = Math.max(0, this.dificultad()), X = lista("x");
    this.dañoDE = X ? X[Math.min(lvl, X.length - 1)] ?? 96 : 96;
    const vm = this.J.ctx.inventario?.vidaMax || 256;
    let vida = o.l ? val(o.l[0], 0) : vm;
    if ((this.f840 === 1 || this.f840 === 2) && this.sala.vidaMeryl) vida = this.sala.vidaMeryl;
    if (!(vida >= 32)) vida = vida > 0 ? 32 : vm;
    this.vital = vida;
    this.faint = this.f840 === 3 ? 12 : 20;
    this.claseOn = true;
    this.barVital = vida;
    this.barras = [ {
      y: this.barY,
      rest: vida,
      now: vida,
      max: vm,
      visible: false,
      conf: {
        nombre: "MERYL",
        izq: [ 31, 191, 95 ],
        der: [ 31, 191, 95 ]
      }
    } ];
    const cuerpo = await this.cargarCuerpo("personajes/meryl.glb", "mel_07b");
    ponerSonrojo(cuerpo, () => this.vivo && this.phase < 2 ? this.f8BE * 5 : 0);
    try {
      const arma = await cargarModelo(this.ctx, "personajes/desert.glb");
      this.huesos[4]?.add(arma);
      this.ctx.teñir?.(arma);
    } catch (e) {
      console.warn("[meryl07b] arma", e.message);
    }
    this.motor.accion(24, 0);
    if (this.phase === 8) this.motor.accion(8, 0);
    const piso = this.J.alturaPiso?.(this.c.mov[0] * MM, this.c.mov[2] * MM, (this.c.mov[1] + 500) * MM);
    this.piso = piso == null ? 0 : Math.round(piso * 1e3);
    this.c.mov[1] = this.piso + this.motor.altura;
    this.posMeryl = this.c.mov.slice();
    this.vox = this.sala.voces(this.ctx);
    this.vox.f.precargar(this.voces.filter(v => v > 0));
    this.modo(this.c7D88);
    this.log("aparece", {
      fase: this.phase,
      modo: this.f840,
      vida: this.vital,
      mov: this.c.mov.slice()
    });
  }
  get proxy() {
    if (!this._proxy) {
      const j = this;
      this._proxy = {
        __jefe: j,
        think: {
          t1: 1
        },
        combo: 0,
        tCombo: 0,
        faint: 1,
        faintMax: 1,
        get o() {
          return j.blancoObj;
        },
        get accion() {
          return j.blanco ? "jefe" : "muerto";
        },
        get vital() {
          return Math.max(1, j.vital);
        },
        get rot() {
          return j.c.rot[1];
        },
        set vital(v) {}
      };
    }
    return this._proxy;
  }
  modo(fn) {
    this.estado = fn;
    this.estadoT = 0;
    this.subt = 0;
    this.sub = 0;
    this.c.turn[0] = 0;
    this.c.turn[2] = 0;
  }
  accion(a, interp = 4) {
    if (this.motor.action !== a) this.motor.accion(a, interp);
  }
  override(a, mask) {
    if (this.motor.action2 !== a) this.motor.override(a, 4, mask);
  }
  sinOverride() {
    if (this.motor.action2 !== 0) this.motor.override(0, 4, 0);
  }
  ajuste(si) {
    this.adjOn = si;
    if (!si) for (const a of this.adjust) a[0] = a[1] = a[2] = 0;
  }
  invulnOn(n) {
    this.invuln = n;
    this.flags |= 2;
    this.claseOn = false;
  }
  invulnOff() {
    this.invuln = 0;
    this.flags &= ~2;
    this.claseOn = true;
  }
  snakeMM() {
    const s = this.snake();
    return [ s.x, s.y, s.z ];
  }
  snakeMuerto() {
    return this.J.muerto || this.J.vida <= 0;
  }
  primeraPersona() {
    return !!(this.ctx.primeraPersona?.() ?? this.J.ctx.primeraPersona?.() ?? this.ctx.armas?.ctx?.primeraPersona?.());
  }
  mirandoPP() {
    return this.primeraPersona() || !!this.ctx.vistaSubjetiva?.();
  }
  rotSnake() {
    const y = this.J.ctx.yawSnake?.();
    return typeof y === "number" ? Math.round((y + Math.PI) * 2048 / Math.PI) & 4095 : null;
  }
  padRelease(si) {
    this.sala.padReleaseMeryl = si;
    if (si) this.mgr.congelar(true); else if (!this.sala.mantis?.congelado) this.mgr.congelar(false);
  }
  get padReleaseActivo() {
    return !!(this.sala.padReleaseMeryl || this.sala.mantis?.padRelease);
  }
  voz(id, demora = 0) {
    if (!(id > 0)) return;
    if (demora) {
      this.vox.nextCode = id;
      this.vox.nextDelay = demora;
    } else this.vox.queue(id);
    this.log("voz", {
      id: id
    });
  }
  vozAzar(base, n) {
    return this.voces[base + randU(8) % n];
  }
  proc(i) {
    const p = this.procs[i];
    if (p) this.mgr.correrProc(p, []);
  }
  c4854() {
    const s = this.snakeMM();
    this.aSnake = sub3([ s[0], 0, s[2] ], [ this.c.mov[0], 0, this.c.mov[2] ]);
    this.dist = len3(this.aSnake);
  }
  c4E90() {
    const dir = vecDir2(this.aSnake);
    if (!this.adjOn) {
      this.adjust[6][1] = 0;
      this.c.turn[1] = dir;
      this.c.interp = 8;
      return;
    }
    const diff = difDirS(dir, this.c.rot[1]);
    if (diff >= -767 && diff < 768) this.adjust[6][1] = nearExp8(this.adjust[6][1], -diff); else {
      this.adjust[6][1] = 0;
      this.c.turn[1] = dir;
      this.c.interp = 8;
    }
    this.c5B14(false);
  }
  c5B14(brazo) {
    const s = this.snakeMM(), pecho = [ s[0], s[1] + 200, s[2] ], cab = this.o ? deV3(this.puntoHueso(5)) : this.c.mov;
    const d = sub3(pecho, cab), h = Math.trunc(Math.hypot(d[0], d[2]));
    let a = -(Math.atan2(d[1], h) / ANG | 0);
    if (a < -2048) a += 4096;
    this.adjust[6][0] = nearExp4(this.adjust[6][0], a);
    if (brazo) {
      this.adjust[2][0] = nearExp4(this.adjust[2][0], a);
      this.adjust[7][0] = nearExp4(this.adjust[7][0], a);
    }
  }
  c4974() {
    const d = difDirS(this.c.rot[1], this.c.turn[1]);
    this.c.turn[2] = Math.max(-128, Math.min(128, d));
  }
  navegarA(p) {
    const J = this.J;
    let next = p;
    if (J.zonas?.length) {
      const za = J.zonaOCercana(aV3([ this.c.mov[0], this.piso, this.c.mov[2] ])), zb = J.zonaOCercana(aV3([ p[0], this.piso, p[2] ]));
      if (za >= 0 && zb >= 0 && za !== zb) {
        const n = J.navegar(za, zb, false);
        if (n >= 0 && n !== zb) {
          const z = J.zonas[n];
          next = [ Math.round(z.p.x * 1e3), 0, Math.round(z.p.z * 1e3) ];
        }
      }
    }
    this.c.turn[1] = vecDir2(sub3([ next[0], 0, next[2] ], [ this.c.mov[0], 0, this.c.mov[2] ]));
    return len3(sub3([ p[0], 0, p[2] ], [ this.c.mov[0], 0, this.c.mov[2] ]));
  }
  dentro(p, nombre) {
    const g = this.J.ctx.hz?.grupos?.[this.mgr.grupoHzd ?? 0];
    if (!g || !nombre) return false;
    const igual = t => t.nombre === nombre || typeof nombre === "number" && strCode(t.nombre) === nombre;
    return g.triggers.some(t => t.tipo === "trap" && igual(t) && t.caja[0][0] <= p[0] && p[0] <= t.caja[1][0] && t.caja[0][2] <= p[2] && p[2] <= t.caja[1][2] && t.caja[0][1] - 500 <= p[1] && p[1] <= t.caja[1][1] + 2e3);
  }
  sacarArmas() {
    const inv = this.J.ctx.inventario;
    if (!inv) return;
    if (inv.item >= 0 && TIPO_ITEM[inv.item] & 2) inv.item = -1;
    if (inv.arma >= 0 && TIPO_ARMA[inv.arma] & 512) inv.arma = -1;
  }
  sangre6() {
    this.sangre(aV3(this.o ? deV3(this.puntoHueso(6)) : this.c.mov));
  }
  gameOverMeryl() {
    if (this.mgr.gameOverTimer() === 0 && !this.snakeMuerto()) {
      this.mgr.timerGO = -2;
      this.mgr.congelar(true);
      this.log("GAME OVER (Meryl)");
    }
  }
  cuadro() {
    if (this.sala.pausa) return;
    const m = this.motor;
    m.tick();
    this.actControl();
    this.c.height = m.altura;
    if (this.vy < 0 && this.c.grounded) this.vy = 0;
    this.c.turn[2] = 0;
    this.vy -= 32;
    this.posMeryl = this.c.mov.slice();
    this.f834 = 0;
    this.c9D44();
    if (this.f834 === 3) this.disparoDE();
    this.barra();
    this.blanco = this.claseOn && this.vivo && !(this.flags & 8);
    this.blancoObj.position.set(this.c.mov[0] * MM, this.piso * MM - 0, this.c.mov[2] * MM);
    this.golpes.length = 0;
  }
  actControl() {
    const c = this.c, pa = this.motor.paso, r = c.rot[1] * ANG, co = Math.cos(r), si = Math.sin(r);
    let sx = Math.trunc(pa[0] * co + pa[1] * si), sz = Math.trunc(-pa[0] * si + pa[1] * co);
    if (this.pasoEstado) {
      sx += this.pasoEstado[0];
      sz += this.pasoEstado[2];
      this.pasoEstado = null;
    }
    c.mov[0] += sx;
    c.mov[2] += sz;
    if (sx || sz) {
      const p = new THREE.Vector3(c.mov[0] * MM, this.piso * MM, c.mov[2] * MM);
      this.J.chocar?.(p, .45);
      c.mov[0] = Math.round(p.x * 1e3);
      c.mov[2] = Math.round(p.z * 1e3);
    }
    if (c.interp > 0) {
      for (let i = 0; i < 3; i++) c.rot[i] = s16(nearTimeP(c.rot[i], c.turn[i], c.interp));
      c.interp--;
    } else for (let i = 0; i < 3; i++) c.rot[i] = s16(nearExp4P(c.rot[i], c.turn[i]));
    const h = this.J.alturaPiso?.(c.mov[0] * MM, c.mov[2] * MM, (this.piso + 500) * MM);
    if (h != null) this.piso = Math.round(h * 1e3);
    let vy = c.mov[1] + c.step[1];
    c.grounded = 0;
    if (this.piso + this.motor.altura > vy) {
      vy = this.piso + this.motor.altura;
      c.grounded = 1;
    }
    c.mov[1] = vy;
    c.step[1] = 0;
  }
  c9D44() {
    this.c9304();
    if (this.flagsB & 65536) return;
    this.c500C();
    if (!this.vivo) return;
    this.vox.tick(this.mgr.frame);
    const pt = this.phaseTime;
    if (pt < 16e3) this.phaseTime++;
    const F = [ this.c9454, this.c96B8, this.c9738, this.c9954, this.c9994, this.c9B94, this.c9C74, this.c9B24, this.c9A58 ][this.phase];
    F?.call(this, pt);
    this.c5598();
    const t = this.estadoT;
    if (t < 16e3) this.estadoT++;
    this.estado?.call(this, t);
    this.c.step[1] = this.vy * 2;
    if (this.c.grounded) this.pisadas();
  }
  pisadas() {
    const a = this.motor.action, f = this.motor.info1.frame - 1;
    let id = 0;
    if (a === 1) id = f === 0 ? this.pasos[0] : f === 25 ? this.pasos[1] : 0; else if (a === 25) id = f === 0 ? this.pasos[0] : f === 9 ? this.pasos[1] : 0;
    if (id) this.se(id, this.c.mov, "bomba");
  }
  mensaje(code, n) {
    (this.cola || (this.cola = [])).push([ code, n ]);
  }
  c9304() {
    for (const [code, n] of (this.cola || []).splice(0)) {
      if (code === 18717 && n >= -1 && n <= 8) {
        this.nextPhase = n;
        this.flagsB |= 256;
        this.log("mensaje", {
          fase: n
        });
      } else if (code === 42974) {
        this.nextPhase = -1;
        this.flagsB |= 256;
      } else if (code === 24203) {
        this.flagsB |= 65536;
        this.accion(24);
      } else if (code === 39455) this.flagsB &= ~65536;
    }
  }
  c500C() {
    if (!(this.flagsB & 256)) return;
    this.flagsB &= ~256;
    if (this.nextPhase >= 0) {
      this.log("fase", {
        de: this.phase,
        a: this.nextPhase
      });
      this.phase = this.nextPhase;
      this.phaseTime = 0;
      return;
    }
    if (this.procE > 0 && !this.snakeMuerto() && this.mgr.gameOverTimer() === 0) {
      this.log("fin (-e)", {
        vida: this.vital
      });
      const args = [ this.vital, this.sala.mantis?.vital ?? 0, this.c.mov[0], this.c.mov[2] ];
      if (!this.mgr.correrProc(this.procE, args) && this.f840 === 3) this.mgr.victoria(this, {
        jefe: "PSYCHOMANTIS",
        proc: this.procE,
        demos: [ 77474, 79038, 82900 ],
        siguiente: null
      }, {
        sinProc: true
      });
    }
  }
  barra() {
    const b = this.barras[0];
    if (!b) return;
    b.visible = !!(this.flagsB & 1024);
    const now = Math.max(0, this.vital);
    if (this.barVital < now) this.barVital = now;
    b.rest = this.barVital;
    b.now = now;
    b.max = this.J.ctx.inventario?.vidaMax || 256;
    const d = this.barVital - now;
    if (d > 0) this.barVital -= Math.min(64, d);
  }
  disparoDE() {
    const boca = this.o ? deV3(this.puntoHueso(4, {
      x: 0,
      y: -50,
      z: 200
    })) : this.c.mov;
    const s = this.snakeMM(), obj = [ s[0], s[1] + 100, s[2] ];
    const d = new THREE.Vector3(...sub3(obj, boca)).normalize();
    this.mgr.balas.nueva(new THREE.Vector3(...boca), d, 0, this.dañoDE, {
      vel: 750,
      largo: 1e4
    });
    this.se(73, boca, "bomba");
    this.mgr.chispa(aV3(boca), .25, 3, 16769168);
    this.log("Desert Eagle", {
      "daño": this.dañoDE
    });
  }
  c5598() {
    if (this.flags & 2) {
      if (this.invuln && --this.invuln === 0) this.invulnOff();
      return;
    }
    const g = this.tomarDaño(), stun = this.mgr.stun;
    if (this.padReleaseActivo) return;
    if (g) {
      let aMode = g.a_mode;
      if (aMode === 1) this.vital -= g.daño; else if (aMode === 3) this.faint -= 1; else if (aMode === 4) this.faint -= 3; else if (aMode === 2) {
        this.vital -= g.daño >> 1;
        this.faint -= 3;
      }
      const s = this.snakeMM();
      this.f864 = lenVec3(sub3([ this.c.mov[0], 0, this.c.mov[2] ], [ s[0], 0, s[2] ]), len3(sub3([ this.c.mov[0], 0, this.c.mov[2] ], [ s[0], 0, s[2] ])) || 1, 60);
      this.log("golpe", {
        a_mode: aMode,
        vida: this.vital,
        desmayo: this.faint
      });
      if (this.flagsB & 1) {
        if (aMode === 1 || aMode === 2) this.sangre6();
        this.se(138, this.c.mov);
        if (this.vital <= 0 && !this.snakeMuerto()) {
          this.vox.init();
          this.flags |= 8;
          if (this.f840 < 2 || this.f840 === 4) this.voz(this.vozAzar(11, 3), 4); else this.c52B8();
          this.modo(this.c73F0);
        } else this.vox.init();
      } else {
        if (aMode === 3) {
          this.vital -= 9;
          this.modo(this.vital <= 0 ? this.c714C : this.faint <= 0 ? this.c61D8 : this.c60F0);
          this.se(52, this.c.mov);
          this.se(138, this.c.mov);
        } else if (aMode === 4) {
          this.vital -= 14;
          this.modo(this.c627C);
          this.se(53, this.c.mov);
          this.se(139, this.c.mov);
        } else if (aMode === 1) {
          this.modo(this.vital <= 0 ? this.c714C : this.faint <= 0 ? this.c61D8 : this.c60F0);
          this.sangre6();
          this.se(138, this.c.mov);
        } else {
          this.modo(this.c627C);
          this.sangre6();
        }
        this.sinOverride();
        this.vox.init();
      }
      this.flags &= ~16;
      this.ajuste(false);
      this.flagsB &= ~4;
      if (this.vital <= 0) this.gameOverMeryl();
      return;
    }
    if (stun && !(this.flagsB & 1)) {
      const s = this.snakeMM(), d = len3(sub3(s, this.c.mov));
      if (d < 6e3) {
        this.vox.init();
        this.se(138, this.c.mov);
        this.modo(this.c6538);
        this.sinOverride();
        this.log("aturdida");
      }
    }
  }
  c52B8() {
    this.vox.init();
    if (this.snakeMuerto()) return;
    this.ajuste(true);
    if (this.f840 === 2) this.voz(this.voces[8], 4); else if (this.f840 === 3) {
      this.voz(this.voces[3], 4);
      this.log("set voice", {
        id: this.voces[3]
      });
    } else this.voz(this.vozAzar(11, 3), 4);
  }
  c9454(t) {
    if (t === 0) {
      this.ajuste(true);
      this.modo(this.c7D88);
    }
    if (this.f840 !== 0 || this.padReleaseActivo) return;
    const s = this.snakeMM();
    if (this.dentro(s, this.trampas[2]) && this.estado !== this.c7C64 && (this.estado === this.c7D88 || this.estado === this.c7E98)) {
      this.padRelease(true);
      this.invulnOn(0);
      this.ajuste(false);
      this.modo(this.c7AA8);
      this.nextPhase = 1;
      this.flagsB |= 256;
    }
  }
  c96B8() {}
  c9738(t) {
    if (t === 0) {
      this.ajuste(true);
      this.modo(this.c89E0);
    }
    const s = this.snakeMM();
    if (this.dentro(s, this.trampas[0]) && this.dentro(this.c.mov, this.trampas[0])) {
      if (this.f8CA < 1e4) this.f8CA++;
      if (this.f8CA >= 300 && (this.estado === this.c7D88 || this.estado === this.c7E98) && !this.ctx.armas?.misil && this.mgr.gameOverTimer() === 0 && !this.snakeMuerto()) {
        this.f8CA = 0;
        this.nextPhase = 3;
        this.flagsB |= 256;
        this.invulnOn(0);
        this.padRelease(true);
        this.ajuste(false);
        this.modo(this.c8BB4);
      }
    }
    this.psyShukan();
  }
  c9954() {
    if (!this.snakeMuerto() && this.mgr.gameOverTimer() === 0) this.psyShukan();
  }
  c9994(t) {
    if (t !== 0) return;
    this.ajuste(false);
    this.flagsB |= 1024;
    this.sinOverride();
    this.modo(this.c5CFC);
    this.invulnOff();
  }
  c9B94(t) {
    if (this.snakeMuerto() || this.mgr.gameOverTimer() !== 0 || t !== 0) return;
    this.ajuste(false);
    this.flags &= ~4;
    this.sinOverride();
    this.modo(this.c9044);
  }
  c9C74(t) {
    if (t !== 0) return;
    this.ajuste(false);
    this.flags &= ~4;
    this.sinOverride();
    this.modo(this.c8140);
    this.invulnOff();
    this.sala.f5BC0 = 0;
  }
  c9B24(t) {
    if (this.snakeMuerto() || this.mgr.gameOverTimer() !== 0 || t !== 0) return;
    this.invulnOn(0);
    this.modo(this.c8F9C);
  }
  c9A58(t) {
    if (t !== 0) return;
    this.ajuste(false);
    this.sinOverride();
    this.modo(this.c8010);
    this.invulnOn(0);
  }
  psyShukan() {
    if (this.shukan > 0) {
      if (!(this.flags & 1) && --this.shukan === 0) {
        this.oculto = false;
        this.sala.pantallaPsy().sepia = false;
        this.sala.pantallaPsy().gas = false;
      }
    } else if (this.shukan < 0) {
      if (this.flags & 1 && ++this.shukan === 0) {
        this.oculto = true;
        this.sala.pantallaPsy().sepia = true;
        this.sala.pantallaPsy().gas = true;
      }
    }
    const pp = this.primeraPersona(), apreto = pp && this.ppAntes === false;
    this.ppAntes = pp;
    if (!(this.flags & 1)) {
      const inv = this.J.ctx.inventario, arma = inv?.arma ?? -1, item = inv?.item ?? -1;
      if (apreto && !this.ctx.armas?.misil && !(arma >= 0 && TIPO_ARMA[arma] & 512) && !(item >= 0 && TIPO_ITEM[item] & 2)) {
        this.flags |= 1;
        this.shukan = -1;
        this.mgr.congelar(true);
        this.log("psy shukan");
      }
      return;
    }
    this.c4854();
    const cab = this.o ? deV3(this.puntoHueso(6)) : this.c.mov, a = vecDir2(this.aSnake) * ANG, b = (this.adjOn ? this.adjust[6][0] : 0) * ANG;
    const p = aV3(cab);
    this.cam = {
      pos: p,
      mira: p.clone().add(new THREE.Vector3(Math.sin(a) * Math.cos(b), -Math.sin(b), Math.cos(a) * Math.cos(b))),
      verSnake: true
    };
    if (!pp) {
      this.flags &= ~1;
      this.cam = null;
      this.shukan = 1;
      this.mgr.congelar(false);
    }
  }
  c7D88(t) {
    if (t === 0) {
      this.accion(24);
      this.ajuste(true);
    }
    this.c4854();
    if (this.dist >= 3001) {
      if (++this.sub >= 5) {
        this.ajuste(false);
        this.modo(this.c7E98);
      }
      return;
    }
    this.sub = 0;
    this.c4E90();
    this.c53A0();
  }
  c53A0() {
    if (this.phase >= 2) return;
    if (!this.mirandoPP()) {
      this.f8C0 = 0;
      return;
    }
    if (this.dist >= 4001) return;
    const rs = this.rotSnake();
    if (rs != null && Math.abs(difDirS(vecDir2(this.aSnake), rs)) < 1801) return;
    if (++this.f8C0 < 151) return;
    if (this.f8BE < 4) this.f8BE++;
    this.f8C0 = 0;
    this.modo(this.c7C64);
  }
  c7E98(t) {
    if (t === 0) this.accion(25);
    this.c4854();
    if (this.dist < 2001) {
      this.modo(this.c7D88);
      return;
    }
    this.navegarA(this.snakeMM());
    this.c4974();
  }
  c7C64(t) {
    if (t === 0) {
      this.accion(24);
      this.ajuste(true);
      this.vox.init();
      if (!this.snakeMuerto()) this.voz(this.voces[14 + this.f8BE], 4);
    }
    this.c4854();
    this.c4E90();
    if (this.sub === 0 && t >= 5 && this.vox.status() === 2) this.sub = 1;
    if (this.sub && this.vox.status() !== 2) this.modo(this.c7D88);
  }
  c77A8(t) {
    if (t === 0) {
      this.accion(26);
      this.f8D0 = this.voces[randU(16) % 3];
      this.vox.init();
      if (!this.snakeMuerto()) this.voz(this.f8D0, 4);
      this.ajuste(true);
    }
    if (this.vox.codeEnd(this.f8D0)) {
      this.modo(this.phase === 1 ? this.c7AA8 : this.c7D88);
      this.invulnOff();
      this.padRelease(false);
      this.ajuste(false);
    }
    this.c4854();
    this.c4E90();
  }
  c7AA8(t) {
    if (t === 0) {
      this.accion(25);
      if (!this.f8CC) this.proc(1);
    }
    this.c4854();
    if (this.sub === 0) {
      if (this.navegarA(this.f8D4) < 500) {
        this.sub = 1;
        this.padRelease(false);
        this.invulnOff();
        this.accion(24);
        this.f8CC = 1;
      }
    } else this.c4E90();
  }
  c89E0(t) {
    if (t === 0) {
      this.sacarArmas();
      this.padRelease(true);
      this.invulnOn(0);
      this.accion(26);
      this.vox.queue(this.voces[4]);
      this.proc(0);
      this.ajuste(true);
      this.mgr.hud.cine = 1;
    }
    if (this.subt === 0 && (this.vox.voxcode === this.voces[4] && this.vox.playtime >= 1 || t >= 300)) {
      if (t >= 300) this.log("sin la voz: sigue", {
        t: t
      });
      this.proc(10);
      this.subt = 1;
    }
    if (this.motor.isEnd && this.motor.action === 26) this.accion(27);
    if (this.subt > 0 && ++this.subt === 126) {
      this.modo(this.c7D88);
      this.invulnOff();
      this.padRelease(false);
      this.flagsB |= 1024;
      this.mgr.hud.cine = 0;
    }
  }
  c8BB4(t) {
    if (t === 0) {
      this.accion(25);
      this.padRelease(true);
      this.mgr.hud.cine = 1;
    }
    const P = this.sala.pantallaPsy();
    if (this.sub === 0) {
      this.c4854();
      this.navegarA(this.f8D4);
      if (len3(sub3([ this.f8D4[0], 0, this.f8D4[2] ], [ this.c.mov[0], 0, this.c.mov[2] ])) < 500) {
        this.accion(24);
        this.c.turn[1] = 2048;
        this.sub++;
      }
    } else if (this.sub === 1) {
      this.c4854();
      this.c4E90();
      if (++this.subt >= 24) {
        this.sacarArmas();
        const inv = this.J.ctx.inventario;
        if (inv && (inv.item === IT.NVG || inv.item === IT.THERMG)) inv.item = -1;
        this.flagsB &= ~1024;
        this.proc(3);
        this.c.turn[1] = 2048;
        this.accion(31);
        this.vox.queue(this.voces[7]);
        this.subt = 0;
        this.sub++;
      }
    } else if (this.sub === 2) {
      const k = ++this.subt;
      if (k < 64 && (k & 3) === 0 && randS(64) > 0) P.sepia = !P.sepia;
      if (k === 88) this.se(9, this.c.mov, "bomba");
      if (this.motor.isEnd) {
        P.sepia = false;
        this.accion(2, 12);
        this.subt = 0;
        this.sub++;
      }
    } else if (++this.subt === 60) {
      this.nextPhase = -1;
      this.flagsB |= 256;
      this.mgr.hud.cine = 0;
    }
  }
  c8F9C(t) {
    if (t === 0) this.accion(19);
    if (this.sub === 0) {
      if (this.motor.isEnd) {
        this.flags &= ~4;
        this.accion(0);
        this.sub = 1;
      }
    } else {
      this.c4854();
      this.c4E90();
    }
  }
  c8010(t) {
    if (t === 0) {
      const a = this.motor.action;
      if (a === 10 || a === 14 || a === 8) {
        this.hover = 1;
        this.f8C8 = a === 10 ? 1 : 2;
        this.flags |= 4;
      } else this.accion(7);
      this.invulnOn(0);
    }
    if (this.motor.action === 7) {
      if (t === 36) this.se(51, this.c.mov, "bomba");
      if (this.motor.isEnd) {
        this.hover = 1;
        this.f8C8 = 2;
        this.flags |= 4;
        this.accion(8);
      }
    }
  }
  c5CFC(t) {
    if (t === 0) {
      this.accion(0);
      this.override(2, 1022);
      this.f83A = 1;
      this.ajuste(true);
    }
    this.c4854();
    this.c.turn[1] = vecDir2(this.aSnake);
    if (t === 100) this.modo(this.c5DC4);
  }
  c5DC4(t) {
    if (t === 0) {
      this.accion(0);
      this.override(2, 1022);
      this.f83A = 1;
      this.ajuste(true);
    }
    this.c4854();
    if (this.dist >= 3001) {
      this.modo(this.c7F48);
      this.sinOverride();
      this.ajuste(false);
      return;
    }
    if (this.f838 === 0) {
      this.modo(this.c6000);
      return;
    }
    this.c5B14(true);
    let gat = 1;
    if (this.f83A === 1) {
      if (++this.sub >= 33) {
        this.override(3, 1022);
        gat = 3;
        this.f83A = 2;
        this.sub = 0;
        this.f838--;
      }
    } else if (this.motor.time2) {
      this.override(2, 1022);
      this.f83A = 1;
      this.sub = 0;
    }
    this.f834 = gat;
    this.c.turn[1] = vecDir2(this.aSnake);
  }
  c6000(t) {
    if (t === 0) {
      this.override(4, 65535);
      this.ajuste(false);
      this.f838 = 7;
    }
    if (t === 126) this.se(47, this.c.mov, "bomba");
    if (this.motor.time2) this.modo(this.c5DC4);
  }
  c7F48(t) {
    if (t === 0) this.accion(1);
    this.c4854();
    if (this.dist < 2001) {
      this.accion(0);
      this.modo(this.c5DC4);
      return;
    }
    this.navegarA(this.snakeMM());
  }
  siguientePorFase() {
    const ph = this.phase;
    return ph === 4 ? this.c7F48 : ph === 6 ? this.c8140 : ph >= 0 && ph < 2 ? this.c8510 : this.c7D88;
  }
  c60F0(t) {
    if (t === 0) {
      this.motor.action = -1;
      this.accion((this.J.gvTime ?? this.mgr.frame) & 1 ? 5 : 6);
    }
    if (this.motor.isEnd) this.modo(this.siguientePorFase());
  }
  c61D8(t) {
    if (t === 0) {
      this.invulnOn(0);
      this.accion(7);
    }
    if (t === 36) this.se(51, this.c.mov, "bomba");
    if (this.motor.isEnd) {
      this.f8C8 = 3;
      this.modo(this.c6634);
    }
  }
  c627C(t) {
    if (t === 0) {
      this.accion(9);
      const d = vecDir2(this.f864) + 2048 & 4095;
      this.c.turn[1] = this.c.rot[1] = d;
      this.invulnOn(0);
      this.se(139, this.c.mov, "bomba");
      if (this.vital <= 0) {
        this.flags |= 8;
        if (this.f840 === 2 || this.f840 === 3) this.c52B8();
      }
    }
    if (this.motor.isEnd) {
      this.modo(this.c6634);
      this.f8C8 = 1;
      return;
    }
    if (this.motor.altura < 500) this.hover = 1;
    if (t === 16) this.se(51, this.c.mov, "bomba");
    if (t > 16) for (let i = 0; i < 3; i++) this.f864[i] = nearExp8(this.f864[i], 0);
    this.pasoEstado = this.f864.slice();
  }
  c6538(t) {
    if (t === 0) {
      this.accion(30);
      this.invulnOn(0);
    }
    if (this.motor.altura < 500) this.hover = 1;
    if (this.motor.isEnd) {
      this.modo(this.c6634);
      this.f8C8 = 1;
      this.faint = 0;
      return;
    }
    if (t === 53) this.se(81, this.c.mov, "bomba");
    if (t === 75) this.se(51, this.c.mov, "bomba");
  }
  c6634(t) {
    if (t === 0) {
      this.invulnOn(0);
      if (this.flags & 256 || this.phase === 6) this.sala.f5BC0 = (this.sala.f5BC0 || 0) + 1;
      this.flags |= 4;
      this.flagsB |= 1;
      const a = this.f8C8 === 1 ? 10 : this.f8C8 === 2 ? 14 : (this.f8C8 = 2, 8);
      if (this.f840 === 3) this.invulnOn(0);
      this.accion(a);
      if (this.faint <= 0) {
        this.faint = this.f840 === 3 ? 12 : 20;
        if (this.f840 < 2 || this.f840 === 4) this.sub = 60; else if (this.vital > 0) {
          this.sub = 160;
          this.estrellas();
        }
        this.flags |= 4096;
        if (this.vital > 0 && (this.f840 === 2 || this.f840 === 3)) this.se(140, this.c.mov, "bomba");
        this.log("desmayada", {
          cuadros: this.sub
        });
      } else this.sub = 4;
      if (this.vital <= 0) {
        this.flags |= 8;
        if (this.f840 < 2 || this.f840 === 4) {
          this.vox.init();
          if (!this.snakeMuerto()) this.voz(this.vozAzar(11, 3), 4);
        }
        this.modo(this.c73F0);
        return;
      }
    }
    if (this.phase === 6 && this.flags & 4096) {
      this.flags |= 2048;
      return;
    }
    if (t < this.sub) return;
    this.modo(this.c6964);
    this.flagsB &= ~1;
    this.flags &= ~4096;
  }
  estrellas() {
    this.mgr.fx.push({
      t: 0,
      dur: 150,
      fn: k => {
        if (k % 3 || !this.vivo) return;
        const p = aV3(this.o ? deV3(this.puntoHueso(6)) : this.c.mov), a = k / 6;
        this.mgr.chispa(new THREE.Vector3(p.x + Math.cos(a) * .25, p.y + .3, p.z + Math.sin(a) * .25), .08, 4, 16777056);
      }
    });
  }
  c6964(t) {
    if (t === 0) {
      this.invulnOff();
      this.accion(this.f8C8 === 1 ? 19 : 20);
    }
    if (this.motor.altura >= 501) this.hover = 0;
    if (!this.motor.isEnd) return;
    this.f8C8 = 0;
    this.flags &= ~4;
    if (this.f840 === 3) this.invulnOff();
    this.modo(this.siguientePorFase());
  }
  c714C(t) {
    if (t === 0) {
      this.se(139, this.c.mov, "bomba");
      this.accion(32);
      this.flags |= 12;
      this.invulnOn(0);
      this.padRelease(true);
      this.c52B8();
      if (!this.snakeMuerto()) {
        this.sacarArmas();
        this.proc(8);
        this.proc(7);
      }
      this.ajuste(true);
      this.log("muere");
    }
    this.camaraMuerte();
    if (t === 53) this.se(81, this.c.mov, "bomba");
    if (t === 70) this.se(51, this.c.mov, "bomba");
    if (this.sub === 0) {
      if (this.motor.isEnd) {
        this.hover = 1;
        this.sub = 1;
      }
    } else if (this.sub === 1 && this.mgr.timerGO === -2) {
      this.mgr.timerGO = 0;
      this.mgr.gameOver();
      this.sub = 2;
    }
  }
  c73F0(t) {
    if (t === 0) {
      this.flags |= 12;
      this.invulnOn(0);
      this.padRelease(true);
      if (!this.snakeMuerto()) {
        this.sacarArmas();
        this.proc(7);
        this.proc(8);
      }
      this.ajuste(true);
      this.log("muerta");
    }
    this.camaraMuerte();
    if (this.sub === 0 && ++this.subt >= 65 && this.mgr.timerGO === -2) {
      this.mgr.timerGO = 0;
      this.mgr.gameOver();
      this.sub = 1;
    }
  }
  camaraMuerte() {
    if (this.snakeMuerto()) return;
    const p = this.c.mov, yaw = p[2] < 10001 ? 2048 : 0, b = 640 * ANG, a = yaw * ANG;
    const dir = new THREE.Vector3(Math.sin(a) * Math.cos(b), -Math.sin(b), Math.cos(a) * Math.cos(b));
    const mira = aV3([ p[0], this.piso + 600, p[2] ]);
    this.cam = {
      pos: mira.clone().addScaledVector(dir, -2.5),
      mira: mira,
      verSnake: true
    };
  }
  c8510(t) {
    if (t === 0) {
      if (this.f8BE >= 2) this.f8BE -= 2; else if (this.f8BE === 1) this.f8BE = 0;
      this.f8C0 = 0;
      this.accion(25);
      if (this.mgr.gameOverTimer() !== 0 || this.snakeMuerto()) {
        this.modo(this.c7D88);
        return;
      }
      this.flags |= 16;
      this.ajuste(true);
    }
    this.c4854();
    this.padRelease(true);
    if (this.sub === 0) {
      this.navegarA(this.snakeMM());
      if (this.dist < 1e3) this.sub++;
    } else if (this.sub === 1) {
      this.c4E90();
      this.sub++;
    } else if (this.sub === 2) {
      this.c4E90();
      this.accion(28);
      const k = ++this.subt;
      if (!this.snakeMuerto()) {
        if (k === 100) this.se(189, this.c.mov, "bomba");
        if (k === 102) {
          const J = this.J, inv = J.ctx.inventario;
          if (typeof J.dañoSnake === "function") {
            const s = this.snakeMM(), m = this.c.mov, L = Math.hypot(s[0] - m[0], s[2] - m[2]) || 1;
            J.dañoSnake(16, 4, {
              x: (s[0] - m[0]) / L * 60,
              z: (s[2] - m[2]) / L * 60
            });
          } else {
            J.vida -= 16 / (inv?.vidaMax || 256);
            J.ctx.daño?.();
          }
          this.se(176, this.c.mov, "bomba");
          if (J.vida * (inv?.vidaMax || 256) < 17 && !(inv?.items?.[IT.RATION] > 0)) this.proc(9);
          this.log("cachetada");
        }
      }
      if (this.motor.isEnd) {
        this.flags &= ~16;
        this.vox.init();
        this.voz(this.voces[9 + (randU(8) & 1)], 4);
        this.accion(24);
        this.sub++;
      }
    } else if (this.vox.end()) {
      this.padRelease(false);
      this.ajuste(false);
      this.modo(this.phase === 1 ? this.c7AA8 : this.c7D88);
    }
  }
  c8140(t) {
    if (t === 0) {
      this.flagsB &= ~1;
      this.accion(21);
      this.sinOverride();
      this.f8C8 = 0;
      this.c4854();
      this.c4E90();
    }
    switch (this.sub) {
     case 0:
      if (this.subt === 24 && ++this.f8C8 === 2) {
        this.se(73, this.c.mov, "bomba");
        this.mgr.chispa(aV3(this.o ? deV3(this.puntoHueso(4)) : this.c.mov), .3, 3, 16769168);
        this.sangre6();
        const n = Math.max(1, this.dificultad() + 1);
        this.vital -= 112 * n;
        this.log("se dispara", {
          vida: this.vital
        });
        if (this.vital <= 0) {
          this.invulnOn(0);
          this.vox.init();
          if (!this.snakeMuerto()) {
            this.voz(this.voces[3], 4);
            this.padRelease(true);
          }
          this.mgr.timerGO = -2;
          this.mgr.congelar(true);
        } else this.se(139, this.c.mov, "bomba");
        this.sub = 1;
        this.f8C8 = 0;
        this.accion(22);
      }
      if (this.motor.isEnd) this.subt = -1;
      break;

     case 1:
      this.invulnOn(0);
      this.sub = 2;
      break;

     case 2:
      if (this.subt === 57) this.se(81, this.c.mov, "bomba");
      if (this.subt === 108) this.se(51, this.c.mov, "bomba");
      if (this.motor.isEnd) {
        this.flags |= 4;
        this.accion(23);
        if (this.vital <= 0) {
          this.modo(this.c73F0);
          return;
        }
        this.subt = -1;
        this.sub = 3;
      }
      break;

     case 3:
      if (this.subt >= 65) {
        this.accion(19);
        this.sub = 4;
      }
      break;

     case 4:
      if (this.motor.isEnd) {
        this.c4854();
        this.c4E90();
        this.invulnOff();
        this.flags &= ~4;
        this.subt = -1;
        this.flagsB &= ~4;
        this.accion(21);
        this.sub = 0;
      }
      break;
    }
    this.subt++;
  }
  c9044(t) {
    if (t === 0) {
      this.invulnOff();
      this.flagsB &= ~1030;
      const a = this.motor.action;
      if (a !== 10 && a !== 14) {
        this.accion(10);
        this.f8C8 = 1;
      }
      this.pasoEstado = null;
    }
    if (this.sub === 0) {
      this.c4854();
      this.c4E90();
      if (!(this.flags & 512)) return;
      this.accion(this.f8C8 === 1 ? 19 : 20);
      this.sub = 1;
    } else if (this.sub === 1) {
      if (this.motor.isEnd) {
        this.accion(21);
        this.sub = 2;
      }
    } else {
      if (++this.subt === 64) this.flags &= ~512;
      this.oculto = !!(this.flags & 8192);
      if (!(this.flags & 1024)) return;
      this.oculto = false;
      this.nextPhase = 6;
      this.flagsB |= 1280;
      this.flags &= ~13317;
      this.faint = 5;
      this.log("fin de la escena 5");
    }
  }
  dibujar() {
    if (!this.o) return;
    this.o.position.set(this.c.mov[0] * MM, (this.c.mov[1] - this.motor.altura) * MM, this.c.mov[2] * MM);
    this.o.rotation.y = this.c.rot[1] * ANG;
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjOn ? this.adjust : null, this.motor.altura * MM);
    this.o.visible = !this.oculto;
  }
  destruir() {
    this.vivo = false;
    this.blanco = false;
    this.o?.removeFromParent();
    if (this.sala.meryl === this) {
      this.sala.vidaMeryl = this.vital;
      this.sala.meryl = null;
    }
    if (this.flags & 1) this.mgr.congelar(false);
  }
  estadoPrueba() {
    return {
      fase: this.phase,
      estado: this.estado?.name,
      vida: this.vital,
      desmayo: this.faint,
      flags: this.flags,
      flagsB: this.flagsB,
      anim: this.motor?.action,
      mov: this.c.mov.slice(),
      dist: this.dist,
      balas: this.f838
    };
  }
}

function ramaConMeryl(v) {
  const g = v("$w:G000a");
  if (!(v("$f:G0128.1") === 0 || v("$b:G0046") < 2 || v("$b:G0046") === 4)) return false;
  return g < 120 || g >= 123 && g < 124 || g >= 125 && g < 126 || g >= 127 && g < 130 || g >= 137 && g < 138;
}

const OPTS_5B5C = {
  m: [ {
    var: "$b:G011d"
  } ],
  p: [ {
    var: "$w:G0122"
  }, 0, {
    var: "$w:G0124"
  } ],
  d: [ 0, {
    var: "$w:G0126"
  }, 0 ],
  v: [ {
    var: "$w:G012a"
  }, 0, {
    var: "$w:G012c"
  } ],
  s: [ {
    var: "$b:G0046"
  } ],
  g: [ {
    var: "$f:G0128.0"
  } ],
  h: [ {
    var: "$b:G0129"
  }, {
    var: "$b:G012e"
  } ],
  l: [ {
    var: "$w:G005a"
  } ]
};

export function merylS07b(nv, ctx, op = {}) {
  const J = ctx?.juego;
  if (!J || !nv?.actores) return null;
  const A = nv.actores.find(a => a.tipo === "PSYCHOMERYL");
  if (!A) return null;
  const mgr = J.__jefes;
  const sala = mgr ? SalaPsy.de(mgr) : null;
  const v = n => varGuion(ctx, n);
  if (!op.forzar && !ramaConMeryl(v)) {
    if (sala?.meryl && op.reinicio) sala.meryl.destruir();
    return null;
  }
  if (sala?.meryl?.vivo && !op.reinicio) return sala.meryl;
  const act = {
    ...A,
    p: [ v("$w:G0122"), 0, v("$w:G0124") ],
    d: [ 0, v("$w:G0126"), 0 ],
    opts: {
      ...A.opts,
      ...OPTS_5B5C
    },
    guion: true
  };
  return op.crear ? op.crear(act) : nuevaMeryl(act, mgr || Jefes.de(J, ctx));
}

export function nuevaMeryl(act, mgr) {
  const j = new PsyMeryl(act, mgr);
  mgr.agregar(j);
  j.cargando = j.iniciar().then(() => {
    j.listo = true;
    return j;
  }).catch(e => {
    console.warn("[meryl07b]", e);
    j.vivo = false;
    return null;
  });
  return j;
}

export function entradaS07b(nv, ctx, crear) {
  if (nv?.id !== "s07b" || !ctx?.juego) return null;
  const g = ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
  if (g) {
    g.__mantisS07bCtx = ctx;
    g.__mantisS07bCrear = crear;
  }
  if (g && !g.__mantisS07b && typeof g.correrMain2 === "function") {
    g.__mantisS07b = true;
    const orig = g.correrMain2.bind(g);
    g.correrMain2 = reinicio => {
      const c = g.__mantisS07bCtx || ctx;
      if (reinicio && g.st === "s07b" && c.juego?.__jefes) SalaPsy.de(c.juego.__jefes).reiniciar();
      orig(reinicio);
      if (g.st === "s07b") Promise.resolve().then(() => merylS07b(g.nivel || nv, c, {
        reinicio: reinicio,
        crear: g.__mantisS07bCrear
      }));
    };
  }
  return merylS07b(nv, ctx, {
    crear: crear
  });
}

SalaPsy.crearMeryl = mgr => {
  if (SalaPsy.de(mgr).meryl) return;
  const g = mgr.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null), nv = g?.nivel;
  const A = nv?.actores?.find(a => a.tipo === "PSYCHOMERYL");
  if (!A) return;
  nuevaMeryl({
    ...A,
    p: [ -400, 0, 1500 ],
    d: [ 0, 0, 0 ],
    opts: {
      ...A.opts,
      m: [ 8 ],
      p: [ -400, 0, 1500 ],
      d: [ 0, 0, 0 ],
      v: [ 0, 0, 2500 ],
      s: [ 3 ],
      g: [ 1 ],
      h: [ 16, 40 ],
      l: [ 0 ]
    },
    forzado: true
  }, mgr);
};
