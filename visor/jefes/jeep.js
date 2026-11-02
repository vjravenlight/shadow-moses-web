// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, VoiceSys, Flujo, MM, ANG, randU, randS } from "./base.js";

import { MJ, trunc, V3, copiar, sumar, restar, largo3, dir2, ratan2, rsin, rcos, randRango, aVisor, dirAng, rotar, nearSpeed, nearExp, nearTime, fase, nuevoSistema, Blanco, T, LADO, P, powerTarget, pushTarget, Recursos, Cuerpo, sprite, efecto, cuadroEfectos, fogonazo, sangre, chispa, BalaJeep } from "./jeep_base.js";

import { Jeep2, SoldadoJeep, TamborJeep, PuertaJeep, VidrioJeep, MODELOS_ENEMIGOS, ANIMS_ENEMIGOS } from "./jeep_enemigos.js";

import { PkJeep } from "./jeep_s19a.js";

import * as ctl from "../controles.js";

const nearExp4 = (a, b) => nearExp(a, b, 4), nearExp8 = (a, b) => nearExp(a, b, 8), nearExp2 = (a, b) => nearExp(a, b, 2);

const nearExp4P = (a, b) => nearExp(fase(a, b), b, 4);

export const MAPAS = [ "cb82", "1b3f", "1b40", "1f3f", "1f40", "1f41", "233f", "2340", "2341", "273f", "2740", "2741" ];

const PAREDES = {
  cb82: [ [ -3e3, -4e3, -3e3, 4e3, 4e3 ], [ 3e3, -4e3, 3e3, 4e3, 4e3 ] ],
  "1b3f": [ [ -4500, -4e3, -4500, 0, 4e3 ], [ -4500, 0, -3e3, 3e3, 4e3 ], [ -3e3, 3e3, -3e3, 4e3, 4e3 ], [ 4500, -4e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 3e3, 4e3, 4e3 ] ],
  "1b40": [ [ -750, 4e3, 750, 4e3, 1400 ], [ -750, 0, 750, 0, 1400 ], [ -4500, 0, -3e3, -4e3, 4e3 ], [ -4500, 0, -4500, 4e3, 4e3 ], [ 3e3, -4e3, 4500, 0, 4e3 ], [ 4500, 0, 4500, 4e3, 4e3 ], [ -750, 1250, -750, 2750, 1200, 1400 ], [ -750, 0, -750, 4e3, 1400 ], [ 750, 0, 750, 4e3, 1400 ], [ 750, 1250, 750, 2750, 1200, 1400 ], [ -750, 2750, 750, 2750, 4e3 ], [ 750, 0, 750, 4e3, 1400, 2600 ], [ -750, 0, -750, 4e3, 1400, 2600 ], [ -750, 4e3, 750, 4e3, 1400, 2600 ], [ -750, 0, 750, 0, 1400, 2600 ], [ -750, 1250, 750, 1250, 4e3 ] ],
  "1f3f": [ [ -4500, 0, -3e3, 3e3, 4e3 ], [ -3e3, 3e3, -3e3, 4e3, 4e3 ], [ -4500, 0, -1e3, 0, 4e3 ], [ 4500, -4e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 3e3, 4e3, 4e3 ] ],
  "1f40": [ [ 4500, -4e3, 4500, 4e3, 2500 ], [ -250, -4e3, -250, 4e3, 4e3 ] ],
  "1f41": [ [ 4500, 0, 4500, 4e3, 4e3 ], [ 3e3, -3e3, 4500, 0, 4e3 ], [ 3e3, -4e3, 3e3, -3e3, 4e3 ], [ -2625, -4e3, -2625, -3e3, 4e3 ], [ -4125, 0, -2625, -3e3, 4e3 ], [ -4125, 0, -1e3, 0, 4e3 ] ],
  "233f": [ [ -4500, -4e3, -4500, 0, 4e3 ], [ -4500, 0, -3e3, 3e3, 4e3 ], [ -3e3, 3e3, -3e3, 4e3, 4e3 ], [ 4500, -4e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 3e3, 4e3, 4e3 ] ],
  2340: [ [ -4500, -4e3, -4500, 4e3, 4e3 ], [ 4500, -4e3, 4500, 4e3, 4e3 ], [ -500, -500, 500, -500, 4e3 ], [ -500, -500, -500, 500, 4e3 ], [ -500, 500, 500, 500, 4e3 ], [ 500, -500, 500, 500, 4e3 ] ],
  2341: [ [ -3e3, -4e3, -3e3, -3e3, 4e3 ], [ -4500, 0, -3e3, -3e3, 4e3 ], [ -4500, 0, -4500, 4e3, 4e3 ], [ 3e3, -4e3, 3e3, -3e3, 4e3 ], [ 3e3, -3e3, 4500, 0, 4e3 ], [ 4500, 0, 4500, 4e3, 4e3 ] ],
  "273f": [ [ -4500, -4e3, -4500, 0, 4e3 ], [ 4500, -4e3, 4500, 0, 4e3 ], [ -4500, 0, -3e3, 3e3, 4e3 ], [ 3e3, 3e3, 4500, 0, 4e3 ], [ 3e3, 3e3, 3e3, 4e3, 4e3 ], [ -3e3, 3e3, -3e3, 4e3, 4e3 ] ],
  2740: [ [ -4500, -4e3, -4500, 4e3, 4e3 ], [ 4500, -4e3, 4500, 4e3, 4e3 ] ],
  2741: [ [ -4500, -4e3, -4500, 4e3, 4e3 ], [ 4500, -4e3, 4500, 4e3, 4e3 ] ]
};

export const CURSO = [ [ 0, 10, 0, 1e3, 0, 200, 0, 0 ], [ 0, 10, 1e3, 1e3, 100, 200, 0, 0 ], [ 0, 4, -1e3, 1e3, 100, 0, 0, 0 ], [ 0, 10, 0, 0, 100, 100, 2, 1 ], [ 1, 1, 0, 0, 0, 0, 1, 9 ], [ 2, 1, 0, 0, 0, 0, 1, 2 ], [ 0, 10, 0, 1e3, 0, 100, 0, 0 ], [ 0, 10, 0, 0, 0, 100, 1, 3 ], [ 1, 1, 0, 0, 0, 0, 1, 9 ], [ 2, 1, 0, 0, 0, 0, 1, 4 ], [ 0, 20, 0, 1e3, 0, 50, 15, 5 ], [ 0, -8, 0, 1e3, 0, 0, 5, 6 ], [ 3, 1, 0, 1e3, 0, 0, 1, 10 ], [ 4, -8, 0, 1e3, 0, 0, 0, 15 ], [ 5, 1, 0, 1e3, 0, 0, 1, 12 ], [ 0, -8, 0, 1e3, 0, 0, 5, 7 ], [ 6, 1, 0, 1e3, 0, 0, 1, 11 ], [ 7, -8, 0, 1e3, 0, 0, 0, 0 ], [ 8, 1, 0, 1e3, 0, 0, 1, 13 ], [ 0, -16, 0, 1e3, 0, 0, 11, 8 ], [ 9, 1, 0, 1e3, 0, 0, 0, 0 ], [ 10, 1, 0, 1e3, 0, 0, 0, 0 ], [ 11, 1, 0, 1e3, 0, 0, 0, 0 ], [ 11, 8, 0, 1e3, 0, 0, 0, 14 ], [ -1, 0, 0, 1e3, 100, 200, 0, 0 ] ].map(([tipo, n, x, y, vx, vy, en, ev]) => ({
  tipo: tipo,
  n: n,
  x: x,
  y: y,
  vx: vx,
  vy: vy,
  en: en,
  ev: ev
}));

const SE = {
  MOTOR: 192,
  FRENA: 182,
  ATRAS: 187,
  PARA: 180,
  MANIOBRA: 194,
  MANIOBRA2: 193,
  LLEGA_LIQUID: 196,
  FIN: 181,
  TIRO: 46,
  SNAKE_AY: 136,
  SNAKE_MUERE: 51,
  PARED: 195
};

const STATE_PADRELEASE = 273293312, STATE_DEMO = 1073741824;

export const PAD = {
  IZQ: 32768,
  DER: 8192,
  ARR: 4096,
  ABA: 16384,
  CUADRADO: 128,
  TRIANGULO: 16
};

export class Mando {
  constructor(mgr) {
    this.teclas = {};
    this.raton = false;
    this.tactil = false;
    this.dx = 0;
    this.dy = 0;
    this.forzado = null;
    const dom = typeof window !== "undefined" ? window : null;
    this.dom = dom;
    if (!dom) return;
    this.kd = e => {
      this.teclas[e.code] = true;
    };
    this.ku = e => {
      this.teclas[e.code] = false;
    };
    this.md = e => {
      if (e.button === 0 && document.pointerLockElement) this.raton = true;
    };
    this.mu = e => {
      if (e.button === 0) this.raton = false;
    };
    this.mm = e => {
      if (document.pointerLockElement) {
        this.dx += e.movementX || 0;
        this.dy += e.movementY || 0;
      }
    };
    this.td = null;
    this.pd = e => {
      if (e.pointerType !== "mouse" && !e.target?.closest?.("button")) this.td = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY
      };
    };
    this.pm = e => {
      if (this.td && e.pointerId === this.td.id) {
        this.dx += e.clientX - this.td.x;
        this.dy += e.clientY - this.td.y;
        this.td.x = e.clientX;
        this.td.y = e.clientY;
      }
    };
    this.pu = e => {
      if (this.td && e.pointerId === this.td.id) this.td = null;
    };
    dom.addEventListener("keydown", this.kd);
    dom.addEventListener("keyup", this.ku);
    dom.addEventListener("mousedown", this.md);
    dom.addEventListener("mouseup", this.mu);
    dom.addEventListener("mousemove", this.mm);
    dom.addEventListener("pointerdown", this.pd);
    dom.addEventListener("pointermove", this.pm);
    dom.addEventListener("pointerup", this.pu);
    dom.addEventListener("pointercancel", this.pu);
  }
  leer() {
    if (this.forzado) {
      const f = this.forzado;
      return {
        status: f.status | 0,
        analog: f.analog || null,
        raton: f.raton || 0,
        ratonY: 0
      };
    }
    const k = this.teclas;
    let s = 0;
    if (k.ArrowLeft || k.KeyA) s |= PAD.IZQ;
    if (k.ArrowRight || k.KeyD) s |= PAD.DER;
    if (k.ArrowUp || k.KeyW) s |= PAD.ARR;
    if (k.ArrowDown || k.KeyS) s |= PAD.ABA;
    if (this.raton || this.tactil || k.Space || k.KeyK || k.KeyJ) s |= PAD.CUADRADO;
    if (k.KeyE) s |= PAD.TRIANGULO;
    let analog = null;
    try {
      const B = ctl.B;
      for (const gp of navigator.getGamepads?.() || []) {
        if (!gp || !gp.connected) continue;
        const b = i => !!gp.buttons[i]?.pressed;
        if (b(B.IZQ)) s |= PAD.IZQ;
        if (b(B.DER)) s |= PAD.DER;
        if (b(B.ARRIBA)) s |= PAD.ARR;
        if (b(B.ABAJO)) s |= PAD.ABA;
        if (b(B.CUADRADO)) s |= PAD.CUADRADO;
        if (b(B.TRIANGULO)) s |= PAD.TRIANGULO;
        const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        if (Math.abs(ax) > .2 || Math.abs(ay) > .2) analog = [ Math.round(ax * 127), Math.round(ay * 127) ];
      }
      const R = this.dom?.__mgs?.R, ses = R?.xr?.isPresenting ? R.xr.getSession() : null;
      if (ses) for (const src of ses.inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;
        const lado = src.handedness === "left" ? "left" : "right";
        for (const i of [ 0, 1, 3, 4, 5 ]) {
          if (!gp.buttons[i]?.pressed) continue;
          const a = ctl.accionQuest(lado, i);
          if (a === "cuadrado") s |= PAD.CUADRADO; else if (a === "triangulo" || a == null && lado === "left" && i === 0) s |= PAD.TRIANGULO;
        }
        if (lado === "right") {
          const x = gp.axes[2] || 0, y = gp.axes[3] || 0;
          if (Math.abs(x) > .2 || Math.abs(y) > .2) analog = [ Math.round(x * 127), Math.round(y * 127) ];
        }
      }
    } catch {}
    const r = {
      status: s,
      analog: analog,
      raton: this.dx,
      ratonY: this.dy
    };
    this.dx = 0;
    this.dy = 0;
    return r;
  }
  destruir() {
    const d = this.dom;
    if (!d || !this.kd) return;
    d.removeEventListener("keydown", this.kd);
    d.removeEventListener("keyup", this.ku);
    d.removeEventListener("mousedown", this.md);
    d.removeEventListener("mouseup", this.mu);
    d.removeEventListener("mousemove", this.mm);
    d.removeEventListener("pointerdown", this.pd);
    d.removeEventListener("pointermove", this.pm);
    d.removeEventListener("pointerup", this.pu);
    d.removeEventListener("pointercancel", this.pu);
  }
}

const VOCES_JEEP_DISCO2 = [ [ 80611, 229917, 80670, 80681, 229917, 230033, 230059, 230086, 230142, 230160, 80622, 80631, 80641, 80650, 80662, 23e4 ], [ 274113, 229917, 274193, 230042, 229917, 230025, 230059, 230086, 230131, 230153, 274128, 274141, 274157, 274168, 274182, 229993 ] ];

function voicesysCE6AC(vs, arg) {
  if (!vs) return;
  const g = vs.g;
  if (g.field_28 === 0 && g.flags & 2) {
    g.field_18 = 0;
    if (vs.f.estado !== 2) {
      vs.f.parar();
      g.field_8 = 5;
      return;
    }
    if (arg === 1) vs.CE300();
  }
}

export class JeepScroll extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    const S = this.sis = nuevoSistema();
    S.scroll = this;
    mgr.__jeepSis = S;
    S.c = this.opt("c", 0) ? 1 : 0;
    const e = Array.isArray(this.opts.e) ? this.opts.e : [];
    const pid = v => v && typeof v === "object" && "proc" in v ? v.proc : typeof v === "number" ? v : 0;
    this.procs = [ pid(e[0]), pid(e[1]), pid(e[2]) ];
    this.raiz = new THREE.Group;
    this.raiz.name = "persecucion_jeep";
    mgr.mundo.add(this.raiz);
    this.rec = new Recursos(this.ctx);
    this.mando = new Mando(mgr);
    this.registro = [];
    this.c80 = 0;
    this.tramos = [];
    this.blanco = false;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.sis.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 2e3) this.registro.shift();
  }
  async iniciar() {
    const S = this.sis;
    this.nivel = await fetch("assets/niveles/s19b/nivel.json").then(r => r.ok ? r.json() : null).catch(() => null);
    await this.rec.cargar(MAPAS.map(m => "via_" + m).concat([ "jeep_b", "jeep_t", "jeep_fhl", "jeep_hl", "jeep_gun", "snake", S.c ? "otacom" : "meryl" ], MODELOS_ENEMIGOS), [ "sne_19b", "mel_19b" ].concat(ANIMS_ENEMIGOS));
    this.voces();
    this.musica();
    this.init800CE020();
    this.enganchar();
    this.log("inicio", {
      c: S.c,
      procs: this.procs
    });
  }
  musica() {
    const A = typeof window !== "undefined" ? window.__mgs?.audio : null;
    if (!A?.tabla || A.tabla.s19b || !A.tabla.s19a || A.escenario === "s19a") return;
    A.cargarEscenario("s19a").then(() => {
      const g = window.__mgs?.guion, f = g?.vars?.get?.("$f:G01e8.3");
      if (f && this.vivo) A.codigo(16777219);
      this.log("sonido de s19a", {
        tema: f ? 3 : 1
      });
    }).catch(() => {});
  }
  voces() {
    const mgr = this.mgr;
    if (mgr.voicesys) {
      const d2 = VOCES_JEEP_DISCO2[this.sis.c ? 1 : 0], vc = mgr.voicesys.g.voxCodes, nuevas = [];
      for (let i = 0; i < d2.length && i < vc.length; i++) if (vc[i] === 0 && d2[i] > 0) {
        vc[i] = d2[i];
        nuevas.push(d2[i]);
      }
      if (mgr.voicesys.g.voxCode2 === 0 && vc[mgr.voicesys.g.index1] > 0) mgr.voicesys.g.voxCode2 = vc[mgr.voicesys.g.index1];
      if (nuevas.length) {
        mgr.flujo?.precargar(nuevas);
        this.log("voces del disco 2", {
          n: nuevas.length
        });
      }
      return;
    }
    const vs = (this.nivel?.actores || []).filter(a => a.tipo === "VOICESYS");
    const a = (this.sis.c ? vs.find(x => x.evento) : vs.find(x => !x.evento)) || vs[0];
    const d2 = VOCES_JEEP_DISCO2[this.sis.c ? 1 : 0];
    const lista = (a?.opts?.v || []).map((v, i) => v === 0 && d2[i] > 0 ? d2[i] : v);
    mgr.flujo?.parar();
    mgr.flujo = new Flujo({
      voces: this.ctx.voces,
      simulado: !!this.ctx.vocesSimuladas
    });
    mgr.voicesys = new VoiceSys(lista, mgr.flujo);
    mgr.voicesys.cargando = mgr.flujo.precargar(lista.filter(x => typeof x === "number"));
  }
  init800CE020() {
    const S = this.sis;
    this.c44 = 0;
    this.c60 = 0;
    this.c68 = 0;
    this.c6c = 0;
    for (let i = 0; i < 16; i++) {
      const t = {
        i: i,
        pos: V3(0, 0, -31500 + 4e3 * i),
        d: V3(0, 0, -2e3),
        corte: {
          x: 0,
          y: 0
        },
        tipo: 0,
        ev: 0,
        flags: 1,
        o: null
      };
      this.tramos.push(t);
      this.ponerModelo(t);
      S.gate = copiar(t.pos);
      if (t.pos.z < 16e3) this.faroles800CEFE4(0, t);
    }
    this.curso800CD790();
    S.jeep = new Jeep(this);
    this.camara = new CamaraJeep(this);
    this.camara.init800D0CE0();
    this.niebla();
    S.gameStatus |= 536870912;
  }
  curso800CD790() {
    this.cursoI = 0;
    this.c50 = CURSO[0].n;
    this.c54 = CURSO[0].en;
    this.c48 = 0;
    this.c4c = 0;
  }
  curso800CD638() {
    const S = this.sis, e = CURSO[this.cursoI];
    this.c48 = nearSpeed(this.c48, e.x, e.vx);
    this.c4c = nearSpeed(this.c4c, e.y, e.vy);
    const r = {
      tipo: e.tipo,
      x: this.c48,
      y: this.c4c,
      ev: e.ev
    };
    if (this.c50 > 0) {
      this.c54--;
      S.estado = this.c54 === 0 ? e.ev : 0;
      if (--this.c50 === 0) {
        this.cursoI++;
        if (CURSO[this.cursoI].tipo === -1) this.cursoI = 0;
        this.c50 = CURSO[this.cursoI].n;
        this.c54 = CURSO[this.cursoI].en;
      }
    } else {
      S.estado = 0;
      if (S.f44 !== 0) {
        S.f44--;
        this.c50 = -this.c50;
        this.log("permiso", {
          entrada: this.cursoI,
          quedan: S.f44
        });
      }
    }
    return r;
  }
  ponerModelo(t) {
    t.o?.removeFromParent();
    const o = this.rec.nuevo("via_" + MAPAS[t.tipo]) || new THREE.Group;
    o.matrixAutoUpdate = false;
    o.name = "tramo_" + MAPAS[t.tipo];
    o.traverse(m => {
      if (m.isMesh) {
        m.receiveShadow = true;
        m.userData.tramo = t;
      }
    });
    this.raiz.add(o);
    t.o = o;
  }
  cuadro() {
    const S = this.sis;
    if (!this.sis.jeep) return;
    S.frame++;
    if (this.mgr.gameOverTimer() !== 0 && !this.muerto) {
      this.muerto = true;
      this.log("game over");
    }
    this.act800CDAA4();
    for (const a of S.actores.slice()) if (a.vivo !== false) a.act?.();
    for (const j of this.mgr.lista) if (j.esJeep && j.vivo && j !== this) j.act?.();
    for (const b of S.balas.slice()) b.act();
    cuadroEfectos(S);
    S.jeep.act800D2258();
    S.meryl?.act800D3D30();
    S.snake?.act800D47F8();
    this.camara.callback800D0C44();
    this.aplicarAlVisor();
    if (this.vencerEn && S.frame >= this.vencerEn) {
      this.vencerEn = 0;
      this.log("vencer", this.mgr.ganado);
      this.ctx.alVencer?.(this.mgr.ganado);
    }
  }
  act800CDAA4() {
    const S = this.sis;
    S.pos = copiar(S.f20);
    if (this.c68 === 0) this.c68 = 1;
    for (let s3 = 0; s3 < 16; s3++) {
      const t = this.tramos[s3];
      let z = t.pos.z + S.pos.z;
      if (z >= 32e3) {
        const r = this.curso800CD638();
        t.d.x = trunc(r.x / 2);
        t.corte.x = trunc(-r.x * 2048 / 4e3);
        t.d.y = trunc(r.y / 2);
        t.corte.y = trunc(-r.y * 2048 / 4e3);
        t.flags = 3;
        t.ev = r.ev;
        z -= 64e3;
        const a2 = s3 + 1 & 15, ant = this.tramos[a2];
        t.pos.x = ant.pos.x + ant.d.x + t.d.x;
        t.pos.y = ant.pos.y + ant.d.y + t.d.y;
        if (a2 < s3) {
          t.pos.x -= S.pos.x;
          t.pos.y -= S.pos.y;
        }
        this.c6c = s3;
        if (t.tipo !== r.tipo) {
          t.tipo = r.tipo;
          this.ponerModelo(t);
        }
        t.pos.z = z;
        t.pos.x += S.pos.x;
        t.pos.y += S.pos.y;
        if (S.estado) this.log("evento", {
          ev: S.estado,
          tipo: r.tipo,
          z: t.pos.z
        });
        this.evento800CEE7C(t);
        this.faroles800CEFE4(r.tipo, t);
      } else {
        t.pos.z = z;
        t.pos.x += S.pos.x;
        t.pos.y += S.pos.y;
      }
    }
    this.dibujarTramos800CD7B4();
    this.camara.calcular800D0D40();
    if (this.c80 !== 0) {
      this.c80++;
      if (this.c80 >= 71) {
        if (!this.finCorrido && this.mgr.gameOverTimer() === 0) {
          this.finCorrido = true;
          this.fin();
        }
      } else if (this.c80 === 31) this.vibrar(20);
    } else if (this.evento800CEDFC(S.jeep.mov.z, 9600) === 14) {
      this.fundido(20);
      this.c80 = 1;
      this.log("fin de la pista");
    }
    S.mundo = sumar(S.mundo, S.pos);
  }
  evento800CEE7C(t) {
    const S = this.sis, e = S.estado;
    S.gate = copiar(t.pos);
    const dif = restar(t.pos, S.pos);
    if (e === 2 || e === 4) {
      S.alerta = 0;
      S.actores.push(new PuertaJeep(this, dif, 0), new PuertaJeep(this, dif, 1), new VidrioJeep(this, dif, 0), new VidrioJeep(this, dif, 1));
      const pid = e === 2 ? this.procs[0] : this.procs[1];
      if (pid) this.correrProcJeep(pid);
    } else if (e === 5) {
      if (!S.jeep2) {
        S.jeep2 = new Jeep2(this);
        S.actores.push(S.jeep2);
        this.log("llega Liquid");
      }
    }
  }
  faroles800CEFE4(tipo, t) {
    if (tipo !== 0) return;
    const S = this.sis, d = restar(S.gate, S.pos);
    for (const sx of [ 1562, -1562 ]) S.actores.push(new Farol(this, {
      x: d.x + sx,
      y: d.y + 1815,
      z: d.z - 500
    }));
  }
  dibujarTramos800CD7B4() {
    for (let s7 = 0; s7 < 16; s7++) {
      const t = this.tramos[s7], k = s7 - this.c6c & 15, o = t.o;
      if (!o) continue;
      o.visible = k >= 4 && k <= 11;
      if (!o.visible) continue;
      const kx = 2 * t.corte.x / 4096, ky = 2 * t.corte.y / 4096;
      o.matrix.set(1, 0, kx, t.pos.x * MJ, 0, 2049 / 2048, ky, t.pos.y * MJ, 0, 0, 1, t.pos.z * MJ, 0, 0, 0, 1);
      o.matrixWorldNeedsUpdate = true;
    }
    this.raiz.updateMatrixWorld(true);
  }
  idx(z, d = 0) {
    const c = this.tramos[this.c6c];
    return this.c6c + trunc((z - d - (c.pos.z - 2e3)) / 4e3) & 15;
  }
  evento800CEDFC(z, d) {
    return this.tramos[this.idx(z, d)].ev;
  }
  centro800CEC24(z) {
    const S = this.tramos, c = S[this.c6c];
    const a0 = this.c6c + trunc((z - (c.pos.z - 2e3)) / 4e3);
    let s1 = S[a0 & 15], a3;
    if (z >= s1.pos.z) {
      a3 = s1;
      s1 = S[a0 + 1 & 15];
    } else a3 = S[a0 + 15 & 15];
    const P1 = {
      x: s1.d.x,
      y: s1.d.y,
      z: s1.d.z
    }, P2 = {
      x: s1.d.x + a3.d.x,
      y: s1.d.y + a3.d.y,
      z: -4e3
    };
    const t = trunc((s1.pos.z - z) * 4096 / 4e3);
    const b1 = t * (4096 - t) >> 11, b2 = t * t >> 12;
    return {
      x: s1.pos.x + (P1.x * b1 + P2.x * b2 >> 12),
      y: s1.pos.y + (P1.y * b1 + P2.y * b2 >> 12),
      z: s1.pos.z + (P1.z * b1 + P2.z * b2 >> 12)
    };
  }
  pisoEn(x, z, yDesde) {
    const r = this.rayo || (this.rayo = new THREE.Raycaster);
    r.set(new THREE.Vector3(x * MJ, yDesde * MJ, z * MJ), new THREE.Vector3(0, -1, 0));
    r.far = 6e3 * MJ;
    const h = r.intersectObjects(this.tramosVisibles(), true)[0];
    return h ? Math.round(h.point.y / MJ) : this.centro800CEC24(z).y;
  }
  paredBala(o, dir, largo) {
    const r = this.rayo || (this.rayo = new THREE.Raycaster);
    r.set(new THREE.Vector3(o.x * MJ, o.y * MJ, o.z * MJ), new THREE.Vector3(dir.x, dir.y, dir.z).normalize());
    r.far = largo * MJ;
    const h = r.intersectObjects(this.tramosVisibles(), true)[0];
    return h ? {
      dist: Math.round(h.distance / MJ),
      punto: {
        x: Math.round(h.point.x / MJ),
        y: Math.round(h.point.y / MJ),
        z: Math.round(h.point.z / MJ)
      }
    } : null;
  }
  tramosVisibles() {
    return this.tramos.filter(t => t.o?.visible).map(t => t.o);
  }
  paredes800D9C90(mov) {
    const p = {
      x: mov.x,
      y: mov.y + 250,
      z: mov.z
    };
    let mejor = null, md = 475;
    for (const t of this.tramos) {
      const k = t.i - this.c6c & 15;
      if (k < 5 || k > 9) continue;
      for (const w of PAREDES[MAPAS[t.tipo]] || []) {
        const ay = w[5] || 0, ax = t.pos.x + trunc((2048 * w[0] + t.corte.x * w[1]) / 4096), az = t.pos.z + (w[1] >> 1);
        const bx = t.pos.x + trunc((2048 * w[2] + t.corte.x * w[3]) / 4096), bz = t.pos.z + (w[3] >> 1);
        const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
        let u = L ? ((p.x - ax) * dx + (p.z - az) * dz) / L : 0;
        u = Math.max(0, Math.min(1, u));
        const cx = ax + dx * u, cz = az + dz * u, d = Math.hypot(p.x - cx, p.z - cz);
        if (d >= md) continue;
        const y0 = t.pos.y + trunc((2049 * ay + t.corte.y * (w[1] + (w[3] - w[1]) * u)) / 4096);
        if (p.y < y0 || p.y > y0 + (w[4] >> 1)) continue;
        md = d;
        mejor = {
          x: Math.round(cx),
          y: p.y,
          z: Math.round(cz),
          d: d
        };
      }
    }
    if (!mejor) return null;
    const S = this.sis;
    chispa(S, this.rec, this.raiz, mejor, 260);
    this.c3AD4 = (this.c3AD4 || 0) + 1;
    if (this.c3AD4 >= 7) {
      this.c3AD4 -= 6;
      this.se(SE.PARED, mejor);
    }
    const k = mejor.d > 0 ? 475 / mejor.d : 0, nuevo = {
      x: Math.round(mejor.x + (p.x - mejor.x) * k),
      y: p.y,
      z: Math.round(mejor.z + (p.z - mejor.z) * k)
    };
    const delta = {
      x: p.x - nuevo.x,
      y: 0,
      z: p.z - nuevo.z
    };
    mov.x = nuevo.x;
    mov.z = nuevo.z;
    if (S.frame - (this.paredF ?? -9) > 1) {
      this.nParedes = (this.nParedes || 0) + 1;
      this.log("pared", {
        x: mejor.x,
        z: mejor.z
      });
    }
    this.paredF = S.frame;
    return {
      delta: delta
    };
  }
  correrProcJeep(pid) {
    this.log("proc", {
      proc: pid
    });
    if (this.mgr.correrProc(pid)) return true;
    const nombre = "proc_" + (pid & 65535).toString(16).padStart(4, "0");
    for (const a of (this.nivel?.actores || []).filter(x => x.ctx === nombre)) {
      const C = TIPOS_JEEP[a.tipo];
      if (!C) continue;
      const j = new C(a, this.mgr);
      this.mgr.agregar(j);
      j.cargando = j.iniciar().then(() => {
        j.listo = true;
        return j;
      }).catch(e => {
        console.warn("[jeep]", a.tipo, e);
        j.vivo = false;
      });
    }
    return false;
  }
  fin() {
    const pid = this.procs[2];
    this.log("fin", {
      proc: pid
    });
    if (pid && this.mgr.correrProc(pid)) return;
    this.mgr.ganado = {
      jefe: "JEEPSCROLL",
      proc: pid,
      demos: [],
      siguiente: "s20a",
      G000a: 286
    };
    this.ctx.musica?.(33554187);
    this.vencerEn = this.sis.frame + 35;
  }
  fundido(cuadros) {
    const h = this.mgr.hud;
    this.mgr.fx.push({
      t: 0,
      dur: cuadros,
      fn: t => {
        h.blanco = Math.min(1, t / cuadros);
      }
    });
  }
  cine(cuadros) {
    const h = this.mgr.hud;
    this.mgr.fx.push({
      t: 0,
      dur: cuadros,
      fn: t => {
        h.cine = Math.min(1, t / 8, (cuadros - t) / 8);
      },
      fin: () => {
        h.cine = 0;
      }
    });
  }
  vibrar(n) {
    try {
      ctl.vibrarCuadros(n);
    } catch {}
  }
  se(id, p = null) {
    this.mgr.se(id, p ? aVisor(p) : null, null);
  }
  enganchar() {
    const mgr = this.mgr, w = typeof window !== "undefined" ? window : {};
    if (this.ctx.congelar) this.ctx.congelar(true); else mgr.congelar(true);
    mgr.camaraEspecial = () => this.vivo ? this.camara.visor : null;
    this.ocultos = [];
    const ocultar = o => {
      if (!o || this.ocultos.some(x => x.o === o)) return;
      const d = Object.getOwnPropertyDescriptor(o, "visible"), r = {
        o: o,
        d: d,
        v: o.visible
      };
      Object.defineProperty(o, "visible", {
        configurable: true,
        get: () => false,
        set: v => {
          r.v = v;
        }
      });
      this.ocultos.push(r);
    };
    this.ocultar = () => {
      ocultar(w.__mgs?.cuerpo?.obj);
      ocultar(w.__mgs?.arma);
    };
    this.ocultar();
    const cam = w.__mgs?.cam;
    if (cam && !this.fovGancho) {
      const r = {
        cam: cam,
        d: Object.getOwnPropertyDescriptor(cam, "fov"),
        v: cam.fov
      };
      Object.defineProperty(cam, "fov", {
        configurable: true,
        get: () => this.vivo && this.camara?.fov || r.v,
        set: v => {
          r.v = v;
        }
      });
      this.fovGancho = r;
      cam.updateProjectionMatrix();
    }
    const A = this.ctx.armas || mgr.ctx.armas;
    if (A && !A.__jeep) {
      A.__jeep = {
        disparar: A.disparar,
        soltar: A.soltar
      };
      A.disparar = (...a) => {
        if (this.vivo) {
          this.mando.tactil = true;
          return null;
        }
        return A.__jeep.disparar.apply(A, a);
      };
      A.soltar = (...a) => {
        this.mando.tactil = false;
        if (!this.vivo) return A.__jeep.soltar?.apply(A, a);
      };
      this.armas = A;
    }
    const codec = w.__mgs?.codec;
    if (codec && !this.codecAbrir) {
      const viejo = codec.abrir, S = this.sis;
      const nuevo = function(...a) {
        return S.scroll?.vivo && S.gameStatus & (STATE_DEMO | STATE_PADRELEASE) ? false : viejo.apply(this, a);
      };
      this.codecAbrir = {
        codec: codec,
        viejo: viejo,
        nuevo: nuevo,
        propio: Object.prototype.hasOwnProperty.call(codec, "abrir")
      };
      codec.abrir = nuevo;
    }
    if (typeof document !== "undefined") {
      this.estilo = document.createElement("style");
      this.estilo.textContent = "#mira{visibility:hidden!important}";
      document.head.appendChild(this.estilo);
    }
  }
  niebla() {
    const sc = typeof window !== "undefined" ? window.__mgs?.scene : null;
    if (!sc) return;
    const f = (this.nivel?.actores || []).find(a => a.tipo === "FOG"), s = f?.opts?.s?.[0] ?? 50, e = f?.opts?.e?.[0] ?? 50;
    const esc = s + trunc((255 - s) * (240 - 360) / 3640);
    this.nieblaAnt = {
      sc: sc,
      fog: sc.fog,
      bg: sc.background
    };
    sc.fog = new THREE.Fog(0, esc * 256 * MJ, (esc + e) * 256 * MJ);
    sc.background = new THREE.Color(0);
  }
  aplicarAlVisor() {
    const S = this.sis, sn = S.snake;
    if (!sn) return;
    const rig = this.J.ctx.rig;
    if (rig && sn.pies) {
      aVisor(sn.pies, rig.position);
    }
    this.ocultar();
    const sinHud = !!(S.gameStatus & (STATE_DEMO | STATE_PADRELEASE));
    if (sinHud !== !!this.hudOculto) this.ocultarHud(sinHud);
  }
  ocultarHud(si) {
    this.hudOculto = si;
    if (typeof document !== "undefined") for (const id of [ "hudcv", "invcv" ]) {
      const e = document.getElementById(id);
      if (e) e.style.visibility = si ? "hidden" : "";
    }
    const inv = this.J?.ctx?.inventario || (typeof window !== "undefined" ? window.__mgs?.inventario : null);
    if (inv) {
      if (si && inv.padExterno == null) {
        inv.padExterno = 0;
        this.padInventario = inv;
      } else if (!si && this.padInventario === inv) {
        if (inv.padExterno === 0) inv.padExterno = null;
        this.padInventario = null;
      }
    }
  }
  dibujar() {
    const S = this.sis;
    if (!S.jeep) return;
    S.jeep.dibujar();
    S.snake?.dibujar();
    S.meryl?.dibujar();
    for (const a of S.actores) a.dibujar?.();
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    const S = this.sis;
    S.jeep?.destruir();
    S.snake?.destruir();
    S.meryl?.destruir();
    for (const a of S.actores) a.destruir?.();
    S.actores = [];
    for (const b of S.balas.slice()) b.destruir();
    for (const f of S.fx) f.fin();
    S.fx = [];
    this.raiz.removeFromParent();
    this.mando.destruir();
    for (const r of this.ocultos || []) {
      delete r.o.visible;
      if (r.d) Object.defineProperty(r.o, "visible", r.d); else r.o.visible = r.v;
    }
    if (this.fovGancho) {
      const r = this.fovGancho;
      delete r.cam.fov;
      r.cam.fov = r.v;
      r.cam.updateProjectionMatrix();
      this.fovGancho = null;
    }
    if (this.armas?.__jeep) {
      this.armas.disparar = this.armas.__jeep.disparar;
      this.armas.soltar = this.armas.__jeep.soltar;
      delete this.armas.__jeep;
    }
    this.estilo?.remove();
    if (this.nieblaAnt) {
      this.nieblaAnt.sc.fog = this.nieblaAnt.fog;
      this.nieblaAnt.sc.background = this.nieblaAnt.bg;
    }
    if (this.hudOculto || this.padInventario) this.ocultarHud(false);
    if (this.codecAbrir) {
      const k = this.codecAbrir, c = k.codec;
      if (c.abrir === k.nuevo) {
        if (k.propio) c.abrir = k.viejo; else delete c.abrir;
      }
      this.codecAbrir = null;
    }
    if (this.mgr.camaraEspecial) this.mgr.camaraEspecial = null;
    if (this.mgr.__jeepSis === S) this.mgr.__jeepSis = null;
    if (this.ctx.congelar) this.ctx.congelar(false); else this.mgr.congelar(false);
  }
}

class Farol {
  constructor(scroll, p) {
    this.sis = scroll.sis;
    this.p = copiar(p);
    this.depth = p.z;
    if (this.depth > 16e3) this.depth -= 65536;
    this.s = sprite(scroll.rec, "jeep_bonbori_add", 16777215);
    this.s.scale.setScalar(600 * MJ);
    this.s.renderOrder = 2;
    scroll.raiz.add(this.s);
    this.vivo = true;
  }
  act() {
    const S = this.sis;
    this.p.x += S.pos.x;
    this.p.y += S.pos.y;
    this.depth += S.pos.z;
    this.p.z = this.depth;
    if (this.depth > 32e3) this.destruir();
  }
  dibujar() {
    aVisor(this.p, this.s.position);
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.s.removeFromParent();
    const a = this.sis.actores, i = a.indexOf(this);
    if (i >= 0) a.splice(i, 1);
  }
}

export class Jeep {
  constructor(scroll) {
    const S = this.sis = scroll.sis;
    this.scroll = scroll;
    this.rec = scroll.rec;
    this.mov = V3();
    this.rot = V3(0, 2048, 0);
    this.abs = V3();
    this.prevAbs = V3();
    this.vel = V3(0, 0, -400);
    this.vel3A8 = V3();
    this.velAnt = V3(0, 0, -2048);
    this.rot3B8 = V3(0, 2048, 0);
    this.rot3C0 = V3(0, 2048, 0);
    this.f3C8 = 0;
    this.f3CA = 0;
    this.f3CC = 0;
    this.f3D0 = 400;
    this.f3D4 = 400;
    this.f3DC = 0;
    this.f3E0 = 0;
    this.f3E4 = 0;
    this.f3E8 = 400;
    this.f3EC = 0;
    this.cerebro = this.normal800D2E78;
    this.c39CC = 0;
    this.acel = 2;
    S.f28 = 0;
    S.f30 = 0;
    S.f20 = {
      x: -this.vel.x,
      y: -this.vel.y,
      z: -this.vel.z
    };
    S.pos = copiar(S.f20);
    this.ruedas = Array.from({
      length: 5
    }, () => [ 0, 0, 0 ]);
    this.blancoPush = new Blanco(S, T.PUSH, LADO.SNAKE, {
      x: 365,
      y: 440,
      z: 677
    }, this);
    this.blancoRam = new Blanco(S, T.POWER, LADO.SNAKE, {
      x: 315,
      y: 440,
      z: 365
    }, this).power(P.DECREASE | P.EXPLODE, 2, 8, 0);
    this.blancoRam.clase = 0;
    this.raiz = new THREE.Group;
    this.raiz.name = "jeep_snake";
    scroll.raiz.add(this.raiz);
    for (const n of [ "jeep_b", "jeep_fhl", "jeep_hl" ]) {
      const o = this.rec.nuevo(n);
      if (o) {
        o.traverse(m => {
          if (m.isMesh) m.castShadow = n === "jeep_b";
        });
        this.raiz.add(o);
      }
    }
    this.t = new Cuerpo(this.rec, "jeep_t", null, this.raiz);
    S.meryl = new MerylJeep(this);
    S.snake = new SnakeJeep(this);
    scroll.se(SE.MOTOR);
  }
  act800D2258() {
    const S = this.sis, sc = this.scroll;
    S.f20 = V3();
    this.mov.x = this.abs.x - S.f28;
    this.mov.z = this.abs.z - S.f30;
    let s1 = 0;
    const bp = this.blancoPush;
    if (bp.damaged & T.PUSH) {
      const o = bp.offset;
      this.mov.x += o.x;
      this.mov.z += o.z;
      this.abs.x += o.x;
      this.abs.y += o.y;
      S.f20.x -= o.x;
      S.f20.z -= o.z;
      if (this.cerebro !== this.final800D3928) {
        this.f3D0 += trunc(this.f3D0 / 16);
        this.f3D4 -= trunc(this.f3D4 / 4);
        this.f3E0 = 5;
        sc.vibrar(4);
        s1 = 2;
      } else {
        this.f3D4 -= trunc(this.f3D4 / 128);
        this.f3CA = Math.max(-950, this.f3CA - 20);
        if (this.f3E4 === 0) S.f50 |= 131584;
        this.f3E4 = 5;
        s1 = 2;
      }
      sc.log("choque", {
        x: o.x,
        z: o.z
      });
    }
    bp.damaged &= ~T.PUSH;
    const pw = sc.paredes800D9C90(this.mov);
    if (pw) {
      S.f20 = copiar(pw.delta);
      this.abs.x -= 3 * pw.delta.x;
      s1 |= 1;
      ctl.vibrar({
        m1: [ 127, 1 ]
      }, {
        celular: false
      });
    }
    if (s1 === 2) this.f3C8 += bp.offset.x;
    S.f22 = 0;
    S.f20.y = -this.fisica800D9EC0(this.mov, this.rot3B8, this.vel, this.velAnt);
    this.ruedas800DA0B4();
    this.ruedas[3][1] = this.ruedas[4][1] = -this.f3EC;
    this.rot = {
      x: 0,
      y: this.rot3B8.y,
      z: this.rot3B8.z
    };
    this.f3E8 = this.f3D0;
    this.cerebro();
    this.prevAbs.x = this.abs.x;
    this.abs.x += this.vel.x;
    S.f20.x -= this.abs.x - this.prevAbs.x;
    S.f28 = this.prevAbs.x;
    const a0 = this.abs.z, a1 = this.prevAbs.z, v1 = a0 + this.vel.z;
    if (v1 >= a1) this.abs.z = v1; else {
      if (a0 < a1) this.prevAbs.z = a0;
      this.abs.z = v1;
      S.f20.z -= this.abs.z - this.prevAbs.z;
      S.f30 = this.prevAbs.z;
    }
    bp.mover(this.mov);
    pushTarget(S, bp);
    if (this.f3E0 > 0) {
      this.f3E0--;
      S.f50 |= 2;
      S.f4C |= 2;
    }
    if (this.f3E4 > 0 && --this.f3E4 === 0) S.f50 &= ~131585;
    S.cabezaJeep = copiar(this.mov);
  }
  fisica800D9EC0(mov, rot, vel, velAnt) {
    const sc = this.scroll, s1 = mov.z;
    mov.y = sc.centro800CEC24(s1).y;
    const c2 = sc.centro800CEC24(s1 + 1024);
    rot.x = -ratan2(c2.y - mov.y, 1024);
    const a0 = -vel.x * velAnt.z, b = vel.z * velAnt.x;
    velAnt.x = vel.x;
    velAnt.y = vel.y;
    velAnt.z = vel.z;
    let roll = rot.z - (a0 + b >> 9) | 0;
    let k = 200 - Math.abs(roll);
    if (k < 0) k += 31;
    roll = nearSpeed(roll, 0, (k >> 5) + 1);
    rot.z = Math.max(-140, Math.min(140, roll));
    return mov.y;
  }
  ruedas800DA0B4() {
    const a0 = trunc(this.f3E8 * 4096 / 1178), R = this.ruedas;
    for (const i of [ 1, 2, 3, 4 ]) R[i][0] = R[i][0] + a0 & 4095;
    let v1 = this.rot3B8.y - this.rot3C0.y;
    if (this.f3E8 < 0) v1 = -v1;
    R[3][1] = nearExp4P(R[3][1], v1 * 4);
    R[4][1] = nearExp4P(R[4][1], v1 * 4);
    this.rot3C0 = copiar(this.rot3B8);
  }
  vel800D2CE8() {
    this.f3D0 = nearSpeed(this.f3D0, this.f3D4, this.f3E0 === 0 ? 5 : 10);
  }
  rumbo800D2D3C() {
    const v = rotar(this.rot3B8, {
      x: 0,
      y: 0,
      z: this.f3D0
    });
    this.vel.x = Math.round(v.x);
    this.vel.z = Math.round(v.z);
    const c = this.scroll.centro800CEC24(this.mov.z - 1600), d = restar(c, this.mov);
    d.x += this.f3C8;
    d.x += rsin(this.f3CC << 5) * 50 >> 12;
    this.rot3B8.y = dir2(d);
    this.f3CC++;
    this.f3D4 = nearSpeed(this.f3D4, 400, 10);
  }
  normal800D2E78() {
    const S = this.sis;
    this.vel800D2CE8();
    this.rumbo800D2D3C();
    if ((this.f3CC & 63) === 0) this.f3CA = randRango(1200) - 600;
    this.f3C8 = nearSpeed(this.f3C8, this.f3CA, 30);
    const e = S.estado;
    if (e === 1 || e === 3) this.cerebro = this.control800D2F54; else if (e === 6) this.cerebro = this.maniobra800D36A4; else if (e === 7) this.cerebro = this.maniobra800D37D0;
  }
  control800D2F54() {
    const S = this.sis, sc = this.scroll, vs = sc.mgr.voicesys;
    const acercarse = () => {
      this.rumbo800D2D3C();
      this.f3C8 = nearSpeed(this.f3C8, 250, 30);
      this.f3D0 = nearSpeed(this.f3D0, this.f3D4, 5);
    };
    switch (this.f3DC) {
     case 0:
      this.f3CC = 0;
      this.f3DC = 5;

     case 1:
      acercarse();
      if (sc.evento800CEDFC(this.mov.z, 3500) === 9) {
        this.f3DC = 2;
        this.vel3A8 = copiar(this.vel);
        S.f50 |= 131104;
        sc.se(SE.FRENA, this.mov);
        sc.vibrar(8);
        sc.ctx.musica?.(4278190334);
        sc.log("frena", {
          z: this.mov.z
        });
      }
      break;

     case 2:
      {
        const v = rotar(this.rot3B8, {
          x: 0,
          y: 0,
          z: this.f3D0
        });
        this.vel3A8.x = nearExp8(this.vel3A8.x, 0);
        this.vel3A8.z = nearExp8(this.vel3A8.z, 0);
        this.vel.x = Math.round(v.x) + this.vel3A8.x;
        this.vel.z = Math.round(v.z) + this.vel3A8.z;
        this.rot3B8.y = nearExp8(this.rot3B8.y, 3072);
        this.f3D0 = nearExp4(this.f3D0, 0);
        this.f3E8 = 0;
        if (this.f3D0 >= 6 && this.f3D0 < 50) this.humoRuedas();
        this.f3E8 = 0;
        this.f3EC = nearSpeed(this.f3EC, -400, 20);
        if (this.vel.x === 0 && this.vel.z === 0) {
          this.f3DC = 3;
          S.f50 &= ~196641;
          this.f3CC = 0;
          sc.log("parado");
        }
        break;
      }

     case 3:
      this.f3CC++;
      this.f3EC = nearSpeed(this.f3EC, -300, 10);
      if (this.radar800D39F0() === 1) {
        this.f3DC = 4;
        this.f3CC = 0;
        voicesysCE6AC(vs, 1);
        vs?.CE2D0();
        sc.log("barrera libre");
      } else if (this.f3CC === 90) vs?.CE5F8(10, 2);
      break;

     case 4:
      if (++this.f3CC >= 61) {
        this.cerebro = this.embestida800D32C4;
        this.f3DC = 0;
      }
      break;

     case 5:
      acercarse();
      if (sc.evento800CEDFC(this.mov.z, 13500) === 9) {
        vs?.CE2D0();
        this.f3DC = 1;
        sc.log("barrera a la vista");
      }
      break;
    }
  }
  embestida800D32C4() {
    const S = this.sis, sc = this.scroll;
    switch (this.f3DC) {
     case 0:
      this.f3DC = 1;
      this.f3CC = 0;
      this.f3EC = -300;
      S.f50 |= 131104 | 65536;
      sc.se(SE.ATRAS, this.mov);
      sc.vibrar(6);

     case 1:
     case 2:
      {
        this.f3C8 = nearSpeed(this.f3C8, 750, 50);
        const v = this.giro800D3A54(this.f3EC, this.f3D0);
        this.vel.x = v.x;
        this.vel.z = v.z;
        if (this.f3DC === 1) {
          this.f3D0 = nearSpeed(this.f3D0, -250, 10);
          this.f3EC = nearSpeed(this.f3EC, -400, 10);
          if ((this.rot3B8.y & 4095) < 1800) this.f3DC = 2;
        } else {
          this.f3D0 = nearSpeed(this.f3D0, 0, 20);
          this.f3EC = nearSpeed(this.f3EC, 0, 7);
          if (this.f3D0 === 0) {
            this.f3CC = 0;
            this.f3DC = 5;
            sc.se(SE.PARA, this.mov);
            sc.vibrar(6);
            S.f50 = S.f50 & ~131105 | 512;
          }
        }
        break;
      }

     case 3:
      this.rumbo800D2D3C();
      this.f3C8 = nearSpeed(this.f3C8, 1e3, 50);
      this.f3D0 = nearSpeed(this.f3D0, this.f3D4, this.acel);
      this.acel += 2;
      this.f3EC = nearSpeed(this.f3EC, 50, 10);
      if (sc.evento800CEDFC(this.mov.z, -3250) === 9) this.f3DC = 4;
      if (this.f3D0 < 200) this.humoRuedas();
      break;

     case 4:
      this.rumbo800D2D3C();
      this.f3C8 = nearSpeed(this.f3C8, 600, 50);
      this.f3D0 = nearSpeed(this.f3D0, 400, 5);
      this.f3EC = nearSpeed(this.f3EC, 0, 7);
      if (sc.evento800CEDFC(this.mov.z, -6e3) === 9) this.f3DC = -1;
      this.f3EC = nearSpeed(this.f3EC, 0, 20);
      break;

     case 5:
      this.f3EC = nearSpeed(this.f3EC, 100, 30);
      if (++this.f3CC >= 6) {
        this.f3DC = 3;
        this.f3C8 = 750;
        this.f3D0 = 0;
        this.acel = 2;
        sc.se(SE.MOTOR);
        sc.log("embiste");
      }
      break;
    }
    if (this.f3DC === -1) {
      this.cerebro = this.normal800D2E78;
      this.f3DC = 0;
      sc.log("pasó la barrera");
    }
    this.embestir800D3CA8(0);
  }
  giro800D3A54(giro, vel) {
    const yaw = this.rot3B8.y;
    const A = rotar({
      x: 0,
      y: yaw,
      z: 0
    }, {
      x: 0,
      y: 0,
      z: 1125
    }), C0 = rotar({
      x: 0,
      y: yaw,
      z: 0
    }, {
      x: 0,
      y: 0,
      z: vel
    });
    const C = {
      x: Math.round(C0.x) * rcos(giro) >> 12,
      y: 0,
      z: Math.round(C0.z) * rcos(giro) >> 12
    };
    const D = rotar({
      x: 0,
      y: giro,
      z: 0
    }, {
      x: 0,
      y: 0,
      z: vel
    });
    const n = {
      x: A.x + D.x - C.x,
      z: A.z + D.z - C.z
    };
    this.rot3B8.y = ratan2(n.x, n.z);
    return C;
  }
  embestir800D3CA8(k) {
    const off = k === 0 ? {
      x: 0,
      y: 450,
      z: 300
    } : {
      x: 0,
      y: 450,
      z: -300
    };
    const p = sumar(this.mov, rotar({
      x: 0,
      y: this.rot.y,
      z: 0
    }, off));
    const b = this.blancoRam;
    b.mover({
      x: Math.round(p.x),
      y: Math.round(p.y),
      z: Math.round(p.z)
    });
    b.vital = 8;
    if (powerTarget(this.sis, b) !== 0) this.scroll.vibrar(2);
  }
  maniobra800D36A4() {
    const sc = this.scroll;
    this.vel800D2CE8();
    this.rumbo800D2D3C();
    if (this.f3DC === 0) {
      this.f3C8 = nearSpeed(this.f3C8, 750, 50);
      if (sc.evento800CEDFC(this.mov.z, 2e3) === 10) {
        this.f3DC = 1;
        sc.camara.modo = 3;
        sc.se(SE.MANIOBRA);
      }
    } else if (this.f3DC === 1) {
      this.f3C8 = nearSpeed(this.f3C8, 1500, 50);
      if (sc.evento800CEDFC(this.mov.z, 3e3) === 12) {
        this.f3DC = 2;
        sc.camara.modo = 1;
        sc.se(SE.MANIOBRA);
      }
    } else if (this.f3DC === 2) {
      this.f3C8 = nearSpeed(this.f3C8, 750, 50);
      if (this.f3C8 === 750) {
        this.cerebro = this.normal800D2E78;
        this.f3DC = 0;
      }
    }
  }
  maniobra800D37D0() {
    const sc = this.scroll;
    this.vel800D2CE8();
    this.rumbo800D2D3C();
    if (this.f3DC === 0) {
      this.f3C8 = nearSpeed(this.f3C8, -750, 50);
      if (sc.evento800CEDFC(this.mov.z, 2e3) === 11) {
        this.f3DC = 1;
        sc.camara.modo = 4;
      }
    } else if (this.f3DC === 1) {
      this.f3C8 = nearSpeed(this.f3C8, -1350, 50);
      if (sc.evento800CEDFC(this.mov.z, 3e3) === 13) {
        this.f3DC = 2;
        sc.camara.modo = 1;
      }
      if (++this.c39CC >= 10) {
        this.c39CC = 0;
        sc.se(SE.MANIOBRA2);
      }
    } else if (this.f3DC === 2) {
      this.f3C8 = nearSpeed(this.f3C8, -750, 50);
      if (this.f3C8 === -750) {
        this.cerebro = this.final800D3928;
        this.f3DC = 0;
      }
    }
  }
  final800D3928() {
    this.vel800D2CE8();
    this.rumbo800D2D3C();
    if ((this.f3CC & 63) === 0) this.f3CA = randRango(60) - 600;
    this.f3C8 = nearSpeed(this.f3C8, this.f3CA, 30);
  }
  radar800D39F0() {
    let n = this.sis.snake ? 1 : 0;
    for (const j of this.scroll.mgr.lista) if (j.vivo && j.enRadar?.()) n++;
    return n;
  }
  humoRuedas() {
    if (this.sis.frame & 1) return;
    for (const sx of [ -261, 261 ]) {
      const p = sumar(this.mov, rotar(this.rot3B8, {
        x: sx,
        y: 0,
        z: -550
      }));
      const s = sprite(this.rec, "smoke", 8421504, false);
      s.scale.setScalar(200 * MJ);
      efecto(this.sis, this.scroll.raiz, s, 20, (t, f) => {
        f.p.y += 8;
        aVisor(f.p, s.position);
        s.material.opacity = .6 * (1 - t / 20);
        s.scale.setScalar((200 + t * 10) * MJ);
      }, {
        p: p,
        mundo: true
      });
    }
  }
  dibujar() {
    aVisor(this.mov, this.raiz.position);
    this.raiz.rotation.set(this.rot3B8.x * ANG, this.rot3B8.y * ANG, this.rot3B8.z * ANG, "XYZ");
    if (this.t.huesos?.length) {
      for (let i = 1; i <= 4; i++) {
        const h = this.t.huesos[i];
        if (h) h.rotation.set(this.ruedas[i][0] * ANG, this.ruedas[i][1] * ANG, 0, "ZYX");
      }
    }
    this.raiz.updateMatrixWorld(true);
  }
  destruir() {
    this.raiz.removeFromParent();
    this.blancoPush.liberar();
    this.blancoRam.liberar();
    this.scroll.ctx.musica?.(4278190334);
  }
}

const PIVOTE = {
  x: 0,
  y: 1435,
  z: -925
};

const SNAKE_OFF = {
  x: 180,
  y: -932,
  z: -340
};

const BOCA = {
  x: 0,
  y: 286,
  z: 574
};

const ACC_SNAKE = [ 0, 1, 2, 3, 4, 5, 6, 7, 8 ];

export class SnakeJeep {
  constructor(jeep) {
    const S = this.sis = jeep.sis;
    this.jeep = jeep;
    this.scroll = jeep.scroll;
    this.rec = jeep.rec;
    this.cuerpo = new Cuerpo(this.rec, "snake", "sne_19b", jeep.raiz);
    this.arma = new THREE.Group;
    this.arma.name = "jeep_gun";
    jeep.raiz.add(this.arma);
    const g = this.rec.nuevo("jeep_gun");
    if (g) this.arma.add(g);
    this.blanco = new Blanco(S, T.POWER | T.SEEK, LADO.SNAKE, {
      x: 150,
      y: 750,
      z: 150
    }, this).power(P.DECREASE, -1, 1e5, 0);
    this.f8D4 = 0;
    this.f8D6 = 0;
    this.f908 = 0;
    this.f90C = 0;
    this.f904 = 0;
    this.f92C = 0;
    this.f940 = 0;
    this.f944 = 0;
    this.f948 = 0;
    this.f950 = 0;
    this.f7E0 = V3();
    this.estado = null;
    this.t = 0;
    this.accion = -1;
    this.fp = 0;
    this.c3A58 = 0;
    this.mov = V3();
    this.pies = V3();
    this.cabeza = V3();
    this.primeraPersona = false;
    this.config(0);
  }
  config(a) {
    if (this.accion !== a) {
      this.accion = a;
      this.cuerpo.config(ACC_SNAKE[a], 4);
      this.f7E0 = V3();
    }
  }
  get J() {
    return this.scroll.J;
  }
  act800D47F8() {
    const S = this.sis;
    this.cuerpo.tick();
    const paso = this.cuerpo.motor?.paso || [ 0, 0 ];
    this.f7E0.x += paso[0];
    this.f7E0.z += paso[1];
    this.f7E0.y = this.cuerpo.altura - 503;
    if (this.J.muerto && !this.f950) {
      this.f950 = 1;
      this.scroll.log("Snake muerto");
    }
    this.input800D596C();
    S.f4C &= 4294901760;
    this.estados800D5894();
    this.ubicar();
    S.cabezaSnake = this.cabeza;
    const b = this.blanco;
    if (b.damage > 0) {
      const d = b.damage;
      b.damage = 0;
      if (!(S.gameStatus & STATE_PADRELEASE) && !(S.gameStatus & STATE_DEMO) && !this.J.muerto && this.scroll.mgr.gameOverTimer() === 0) {
        const J = this.J, inv = J.ctx.inventario;
        J.vida -= d / (inv?.vidaMax || 256);
        J.ctx.daño?.();
        this.scroll.log("daño Snake", {
          d: d,
          vida: +(J.vida ?? 0).toFixed(3)
        });
      }
    }
    b.mover(this.mov);
    if (this.f944 === 0) b.clase = T.POWER | T.SEEK; else {
      b.clase = T.AVAIL;
      this.cuerpo.visible((this.f944 & 3) !== 1);
      this.f944--;
    }
    if (this.f944 === 0) this.cuerpo.visible(true);
    if (this.f948) this.cuerpo.visible(false);
  }
  input800D596C() {
    const S = this.sis, sc = this.scroll;
    let s1 = 0, s9C = 0, st = 0, raton = 0;
    this.f92C = 0;
    if (this.f950 === 0 && !(S.gameStatus & STATE_PADRELEASE)) {
      const m = sc.mando.leer();
      st = m.status;
      raton = m.raton || 0;
      if (m.analog) {
        const z = v => (v >= 0 ? Math.max(0, v - 64) : Math.min(0, v + 64)) * 2;
        s1 = z(m.analog[0]);
        s9C = z(m.analog[1]);
      }
      if (s1 === 0 && s9C === 0) {
        if (st & PAD.IZQ) s1 = -128;
        if (st & PAD.DER) s1 = 127;
        if (st & PAD.ARR) s9C = -128;
        if (st & PAD.ABA) s9C = 127;
      }
    } else if (this.f950 === 0) sc.mando.leer();
    if (this.fp) {
      if (this.c3A58 < 15) this.c3A58++;
      this.f948 = this.c3A58 >= 13 ? 1 : 0;
    } else {
      if (this.c3A58 > 0) this.c3A58--;
      this.f948 = this.c3A58 >= 18 ? 1 : 0;
    }
    if (S.f4C & 4294901760) {
      if (S.f4C & 65536) this.f8D6 = 0; else if (S.f4C & 131072) {
        this.f8D6 = 2048;
        this.f908 = 2048;
      } else if (S.f4C & 262144) {
        const v = this.f8D6 - 1024 & 4095;
        if (v >= 101 && v < 101 + 1947) {
          s1 = -128;
          st |= PAD.IZQ;
        } else if (v >= 2048 && v < 2048 + 1952) {
          s1 = 128;
          st |= PAD.DER;
        }
        st |= PAD.CUADRADO;
      }
    }
    if (this.f940 !== 0 && this.f950 === 0) {
      st &= ~61441;
      s1 = 0;
      s9C = 0;
    }
    const fp = !!(st & PAD.TRIANGULO);
    this.f908 -= trunc(s1 / 4);
    this.f908 -= Math.round(raton * 1.5);
    if (s1 < 0 || raton < 0) this.f92C |= 2; else if (s1 > 0 || raton > 0) this.f92C |= 4;
    this.f8D6 = nearExp4P(this.f8D6, this.f908);
    const vuelta = Math.round(this.f908 / 4096) * 4096;
    if (vuelta) {
      this.f908 -= vuelta;
      this.f8D6 -= vuelta;
    }
    this.f90C = nearExp4P(this.f90C, this.fp ? trunc(s9C * 300 / 128) : 0);
    if (this.f904 > 0) this.f904--;
    if (st & PAD.CUADRADO && this.f904 === 0) {
      this.f904 = 3;
      this.f92C |= 1;
    }
    this.fp = fp ? 1 : 0;
    this.primeraPersona = !!this.fp;
    const rumbo = this.f8D6 + this.jeep.rot.y & 4095;
    this.f8CE = rumbo;
    const piv = this.puntoJeep(PIVOTE);
    let mejor = null, min = 6e3 + 100;
    for (const j of this.homing()) {
      const d = restar(j.p, piv), l = largo3(d);
      if (l < min) {
        const dd = dir2(d);
        let df = Math.abs((dd - rumbo + 2048 & 4095) - 2048);
        if (df < 128) {
          min = l;
          mejor = (ratan2(l, j.p.y - piv.y) & 4095) - 1024;
        }
      }
    }
    const comp = Math.round(this.jeep.rot3B8.x * Math.cos(this.f8D6 * ANG));
    if (mejor === null) {
      this.f8D4 = nearExp4(this.f8D4, 0);
      S.f5C = 0;
    } else {
      this.f8D4 = nearExp4(this.f8D4, mejor + comp);
      S.f5C = 1;
    }
    if (S.f4C & 2) this.f92C |= 8;
  }
  homing() {
    const out = [], S = this.sis;
    for (const j of this.scroll.mgr.lista) if (j.vivo && j.homing?.()) out.push({
      p: j.homing()
    });
    if (S.liquid?.homing?.()) out.push({
      p: S.liquid.homing()
    });
    return out;
  }
  puntoJeep(p) {
    const w = this.jeep.raiz;
    w.updateMatrixWorld(true);
    const v = new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM).applyMatrix4(w.matrixWorld);
    return {
      x: Math.round(v.x / MJ),
      y: Math.round(v.y / MJ),
      z: Math.round(v.z / MJ)
    };
  }
  ubicar() {
    const yawRel = this.f8D6;
    this.arma.position.set(PIVOTE.x * MM, PIVOTE.y * MM, PIVOTE.z * MM);
    this.arma.rotation.set(this.f8D4 * ANG, yawRel * ANG, 0, "YXZ");
    const off = rotar({
      x: 0,
      y: yawRel,
      z: 0
    }, {
      x: SNAKE_OFF.x + this.f7E0.x,
      y: SNAKE_OFF.y - 503,
      z: SNAKE_OFF.z + this.f7E0.z
    });
    this.cuerpo.raiz.position.set((PIVOTE.x + off.x) * MM, (PIVOTE.y + off.y) * MM, (PIVOTE.z + off.z) * MM);
    this.cuerpo.raiz.rotation.set(0, yawRel * ANG, 0);
    this.cuerpo.pose();
    this.jeep.raiz.updateMatrixWorld(true);
    const w = new THREE.Vector3;
    this.cuerpo.raiz.getWorldPosition(w);
    this.pies = {
      x: Math.round(w.x / MJ),
      y: Math.round(w.y / MJ),
      z: Math.round(w.z / MJ)
    };
    this.mov = {
      x: this.pies.x,
      y: this.pies.y + trunc(this.cuerpo.altura / 2),
      z: this.pies.z
    };
    this.cabeza = this.cuerpo.puntoMundo(6);
  }
  estados800D5894() {
    this.blanco.clase = T.AVAIL;
    const old = this.t++;
    if (!this.estado) {
      this.estado = this.normal800D5328;
      this.config(0);
    }
    this.estado(old);
  }
  cambiar(fn) {
    this.estado = fn;
    this.t = 0;
  }
  golpe800D50F4() {
    const b = this.blanco;
    if (b.damaged & T.POWER) {
      b.force = V3();
      this.cambiar(this.golpe800D5484);
      b.damaged = 0;
      this.scroll.vibrar(4);
      return 1;
    }
    return 0;
  }
  check800D519C() {
    if (this.golpe800D50F4()) {
      this.blanco.clase = T.AVAIL;
      this.f944 = 4;
      this.f908 += randS(512);
      return 1;
    }
    if (this.f944 === 0 && this.f92C & 8) {
      this.cambiar(this.sacudon800D55E8);
      this.scroll.vibrar(3);
      this.f908 += randS(256);
      return 1;
    }
    return 0;
  }
  normal800D5328(t) {
    const fl = this.f92C;
    if (this.check800D519C()) return;
    if (fl & 1) this.tirar800D5260();
    if (t === 0 && this.accion !== 0) this.config(0);
    if (fl & 2) this.config(2); else if (fl & 4) this.config(3); else if (this.accion !== 0) this.config(0);
  }
  tirar800D5260() {
    const S = this.sis, sc = this.scroll;
    this.arma.updateMatrixWorld(true);
    const v = new THREE.Vector3(BOCA.x * MM, BOCA.y * MM, BOCA.z * MM).applyMatrix4(this.arma.matrixWorld);
    const boca = {
      x: Math.round(v.x / MJ),
      y: Math.round(v.y / MJ),
      z: Math.round(v.z / MJ)
    };
    const q = new THREE.Quaternion;
    this.arma.getWorldQuaternion(q);
    const d = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
    new BalaJeep(S, this.rec, sc.raiz, boca, {
      x: d.x,
      y: d.y,
      z: d.z
    }, LADO.SNAKE, {
      conPared: true,
      pared: (o, dir, l) => sc.paredBala(o, dir, l)
    });
    sc.se(SE.TIRO, boca);
    fogonazo(S, this.rec, sc.raiz, boca, 260);
    this.tiros = (this.tiros || 0) + 1;
  }
  golpe800D5484(t) {
    const S = this.sis;
    this.f944 = 4;
    if (t === 0) {
      this.f940 = 1;
      this.config(1);
      sangre(S, this.rec, this.scroll.raiz, this.cabeza, 4);
      S.f4C |= 1;
      if (!this.J.muerto) this.scroll.se(SE.SNAKE_AY, this.mov);
    }
    if (this.cuerpo.isEnd) {
      if (this.f950 === 0) {
        this.cambiar(this.normal800D5328);
        this.config(0);
        this.f940 = 0;
        this.f944 = 45;
      } else this.cambiar(this.muerte800D571C);
    }
  }
  sacudon800D55E8(t) {
    if (this.golpe800D50F4()) {
      this.blanco.clase = T.AVAIL;
      this.f944 = 4;
      this.f908 += randS(512);
      return;
    }
    if (t === 0) {
      this.config(8);
      this.scroll.se(SE.SNAKE_AY, this.mov);
    }
    if (t >= 21) {
      this.cambiar(this.normal800D5328);
      this.config(0);
    }
  }
  muerte800D571C(t) {
    const vs = this.scroll.mgr.voicesys;
    if (t === 0) {
      this.config(4);
      if (vs) {
        vs.CE310();
        vs.CE5F8(15, 1);
        vs.CE734();
      }
    }
    if (t === 61) {
      this.scroll.vibrar(10);
      this.scroll.mgr.se(SE.SNAKE_MUERE, aVisor(this.mov), "bomba");
    }
    if (this.cuerpo.isEnd) this.cambiar(this.muerto800D5820);
  }
  muerto800D5820(t) {
    if (t === 0) this.config(5);
  }
  dibujar() {}
  destruir() {
    this.cuerpo.destruir();
    this.arma.removeFromParent();
    this.blanco.liberar();
  }
}

const MERYL_POS = {
  x: 345,
  y: 915,
  z: -440
};

export class MerylJeep {
  constructor(jeep) {
    const S = this.sis = jeep.sis;
    this.jeep = jeep;
    this.scroll = jeep.scroll;
    const ota = !!S.c;
    this.cuerpo = new Cuerpo(jeep.rec, ota ? "otacom" : "meryl", "mel_19b", jeep.raiz);
    this.se818 = ota ? 133 : 130;
    this.se81C = ota ? 135 : 132;
    this.f7E4 = 0;
    this.cabeza752 = 0;
    this.f800 = 0;
    this.estado = null;
    this.t = 0;
    this.accion = -1;
    this.cuerpo.config(0, 0);
  }
  config(a, interp = 4) {
    this.accion = a;
    this.cuerpo.config(a, interp);
  }
  act800D3D30() {
    const S = this.sis;
    this.f800 = S.f50;
    S.f50 &= 4294901760;
    const old = this.t++;
    if (!this.estado) {
      this.estado = this.quieta800D424C;
      this.config(0);
    }
    this.estado(old);
    this.cuerpo.tick();
    this.cabeza752 = nearSpeed(this.cabeza752, this.f7E4, 200);
    if (this.cuerpo.adjust?.[6]) this.cuerpo.adjust[6][1] = this.cabeza752;
    const alt = this.cuerpo.altura;
    this.cuerpo.raiz.position.set(MERYL_POS.x * MM, (MERYL_POS.y - alt) * MM, MERYL_POS.z * MM);
    this.cuerpo.pose();
    S.cabezaMeryl = this.cuerpo.puntoMundo(6);
  }
  cambiar(fn) {
    this.estado = fn;
    this.t = 0;
  }
  decidir800D4188() {
    const f = this.f800;
    if (f & 2) {
      this.cambiar(this.golpe800D46D4);
      return 1;
    }
    if (f & 1) {
      this.cambiar(this.quieta800D424C);
      return 1;
    }
    if (f & 32) {
      this.cambiar(this.agarra800D4414);
      return 1;
    }
    if (f & 512) {
      this.cambiar(this.embiste800D4574);
      return 1;
    }
    if (f & 4096) {
      this.cambiar(this.f800D43AC);
      return 1;
    }
    if (!(f & 65536)) {
      this.cambiar(this.maneja800D4290);
      return 1;
    }
    return 0;
  }
  quieta800D424C(t) {
    if (t === 0) this.config(0);
    this.decidir800D4188();
  }
  maneja800D4290(t) {
    const S = this.sis;
    if (t === 0) this.config(0);
    if (S.f4C & 1 && randU(256) < 20) this.scroll.mgr.se(this.se81C, aVisor(this.jeep.mov), null);
    let d = (S.snake?.f8CE ?? 0) - this.jeep.rot.y & 4095;
    if (d & 2048) d -= 4096;
    this.f7E4 = Math.max(-1024, Math.min(1024, d));
    if (this.f800 & 65536) {
      this.f7E4 = 0;
      if (this.decidir800D4188() === 0) this.cambiar(this.quieta800D424C);
    }
  }
  f800D43AC(t) {
    if (t === 0) this.config(7);
    if (this.f800 & 65536) this.cambiar(this.quieta800D424C);
  }
  agarra800D4414(t) {
    if (t === 0) this.config(7);
    if (this.decidir800D4188()) return;
    if (this.cuerpo.isEnd) this.cambiar(this.agarra800D4488);
  }
  agarra800D4488(t) {
    if (t === 0) this.config(8, 0);
    if (this.decidir800D4188()) return;
    if (!(this.f800 & 131072)) this.cambiar(this.agarra800D4500);
  }
  agarra800D4500(t) {
    if (t === 0) this.config(9);
    if (this.decidir800D4188()) return;
    if (this.cuerpo.isEnd) this.cambiar(this.quieta800D424C);
  }
  embiste800D4574(t) {
    if (t === 0) this.config(1);
    if (this.decidir800D4188()) return;
    if (this.cuerpo.isEnd) this.cambiar(this.embiste800D45E8);
  }
  embiste800D45E8(t) {
    if (t === 0) this.config(2, 0);
    if (this.decidir800D4188()) return;
    if (!(this.f800 & 131072)) this.cambiar(this.embiste800D4660);
  }
  embiste800D4660(t) {
    if (t === 0) this.config(3);
    if (this.decidir800D4188()) return;
    if (this.cuerpo.isEnd) this.cambiar(this.quieta800D424C);
  }
  golpe800D46D4(t) {
    if (t === 0) {
      this.config(13);
      this.scroll.mgr.se(this.se818, aVisor(this.jeep.mov), null);
    }
    if (this.cuerpo.isEnd) this.cambiar(this.quieta800D424C);
  }
  dibujar() {}
  destruir() {
    this.cuerpo.destruir();
  }
}

const FOV_240 = 2 * Math.atan(112 / (240 * 58 / 64)) * 180 / Math.PI;

const DEMO_TABLAS = [ [ [ 3, 30, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 768 ], [ 3, 31, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 48 ], [ 3, 130, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 3 ], [ 0, 175, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 33 ], [ 3, 176, 2, [ 0, 0, 0 ], [ -170, -1300, 500 ], 224 ], [ 3, 275, 2, [ 0, 0, 0 ], [ -170, -800, 500 ], 36 ], [ 3, 305, 2, [ 0, 0, 0 ], [ 170, -1024, 500 ], 224 ], [ 1, 335, 2, [ 0, 0, 0 ], [ 270, -20, 3e3 ], 44 ], [ -1, 0, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 0 ] ], [ [ 3, 30, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 768 ], [ 1, 130, 2, [ 0, 0, 0 ], [ 4050, 3e3, 500 ], 44 ], [ 1, 630, 0, [ 0, 0, 0 ], [ 0, 4e3, -12e3 ], 2 ], [ -1, 0, 0, [ 0, 0, 0 ], [ 0, 0, 0 ], 0 ] ] ];

class CamaraJeep {
  constructor(scroll) {
    this.scroll = scroll;
    this.sis = scroll.sis;
    this.pos = V3(0, 1500, 2e3);
    this.objetivo = V3();
    this.deseado = V3(0, 1500, 2e3);
    this.modo = 0;
    this.d4 = 2e3;
    this.d8 = 1500;
    this.objFijo = null;
    this.fov = FOV_240;
    this.visor = null;
    this.demo = null;
  }
  init800D0CE0() {
    this.deseado = V3(0, 1500, 2e3);
    this.d4 = 2e3;
    this.d8 = 1500;
    this.modo = 0;
    this.objFijo = null;
    this.pos = sumar(this.sis.jeep?.mov || V3(), V3(0, 1500, 2e3));
  }
  calcular800D0D40() {
    const S = this.sis, j = S.jeep, m = this.modo;
    if (m === 0 || m === 2) this.d4 = nearExp4(this.d4, 2e3); else if (m === 1) this.d4 = nearExp4(this.d4, -2e3);
    if (m === 3) {
      this.deseado = V3(-540, 1214, -963);
      this.objFijo = V3(428, 597, 1718);
      return;
    }
    if (m === 4) {
      this.deseado = V3(-689, 990, -431);
      this.objFijo = V3(459, 879, 59);
      return;
    }
    const c = this.scroll.centro800CEC24(j.mov.z + this.d4);
    this.d8 = nearSpeed(this.d8, 1500, 100);
    c.y += this.d8;
    this.objFijo = null;
    c.x += j.f3C8;
    this.deseado = c;
  }
  callback800D0C44() {
    const S = this.sis, sn = S.snake;
    this.pos = {
      x: nearExp4(this.pos.x, this.deseado.x),
      y: nearExp4(this.pos.y, this.deseado.y),
      z: nearExp4(this.pos.z, this.deseado.z)
    };
    const obj = this.objFijo || sn?.cabeza || S.jeep.mov;
    this.objetivo = {
      x: nearExp4(this.objetivo.x, obj.x),
      y: nearExp4(this.objetivo.y, obj.y),
      z: nearExp4(this.objetivo.z, obj.z)
    };
    if (!this.objFijo) this.objetivo = copiar(obj);
    let ojo = this.pos, mira = this.objetivo;
    if (this.demo) {
      const d = this.demo.cuadro();
      ojo = d.ojo;
      mira = d.centro;
      this.pos = copiar(ojo);
      this.objetivo = copiar(mira);
    }
    if (sn?.primeraPersona && !this.demo && sn.f950 === 0) {
      ojo = sn.cabeza;
      const d = dirAng(sn.f90C, sn.f8CE, 1e3);
      mira = sumar(ojo, d);
    }
    this.visor = {
      pos: aVisor(ojo),
      mira: aVisor(mira),
      verSnake: false
    };
  }
  escena800D0A20(n) {
    const S = this.sis;
    if (this.scroll.mgr.gameOverTimer() !== 0 || this.demo) return;
    this.demo = new DemoCamara(this, n);
    S.gameStatus |= STATE_DEMO;
    this.scroll.log("escena", {
      n: n
    });
  }
}

class DemoCamara {
  constructor(cam, n) {
    this.cam = cam;
    this.sis = cam.sis;
    this.scroll = cam.scroll;
    this.n = n;
    this.tabla = DEMO_TABLAS[n].map(([interp, cuadro, modo, fC, f14, flags]) => ({
      interp: interp,
      cuadro: cuadro,
      modo: modo,
      fC: {
        x: fC[0],
        y: fC[1],
        z: fC[2]
      },
      f14: {
        x: f14[0],
        y: f14[1],
        z: f14[2]
      },
      flags: flags
    }));
    this.llamadas = n === 0 ? [ [ 1, "06E0" ], [ 30, "072C" ], [ 130, "07EC" ], [ 141, "087C" ], [ 275, "08C8" ], [ 335, "08F0" ] ] : [ [ 1, "0928" ], [ 30, "094C" ], [ 60, "0970" ], [ 130, "09B8" ], [ 140, "0990" ], [ 150, "09DC" ] ];
    this.li = 0;
    this.f90 = 0;
    this.fin = false;
    this.ojo = copiar(cam.pos);
    this.centro = copiar(cam.objetivo);
    this.rot = V3();
    this.track = 0;
    this.tipo = 0;
    this.f40 = null;
    this.f44 = null;
    this.recalc800DB470();
    this.cargar800DB790(this.tabla[0]);
    this.i = 0;
  }
  vec(p) {
    return typeof p === "function" ? p() : p;
  }
  angulos(from, to) {
    const d = restar(to, from), l = largo3(d);
    return {
      rot: {
        x: ratan2(-d.y, Math.round(Math.hypot(d.x, d.z))),
        y: dir2(d),
        z: 0
      },
      track: l
    };
  }
  recalc800DB470() {
    if (this.tipo === 1) this.centro = sumar(this.ojo, dirAng(this.rot.x, this.rot.y, this.track)); else if (this.tipo === 2) this.ojo = restar(this.centro, dirAng(this.rot.x, this.rot.y, this.track));
  }
  cargar800DB790(u) {
    if (u.modo === 0) {
      this.f50 = copiar(u.fC);
      this.f58 = copiar(u.f14);
      const a = this.angulos(this.f50, this.f58);
      this.f60 = a.rot;
      this.f68 = a.track;
      this.tipo = 0;
    } else if (u.modo === 1) {
      this.f50 = copiar(u.fC);
      this.f60 = {
        x: u.f14.x,
        y: u.f14.y,
        z: 0
      };
      this.f68 = u.f14.z;
      this.f58 = sumar(this.f50, dirAng(this.f60.x, this.f60.y, this.f68));
      this.tipo = 1;
    } else {
      this.f58 = copiar(u.fC);
      this.f60 = {
        x: u.f14.x,
        y: u.f14.y,
        z: 0
      };
      this.f68 = u.f14.z;
      this.f50 = restar(this.f58, dirAng(this.f60.x, this.f60.y, this.f68));
      this.tipo = 2;
    }
    this.interp = u.interp;
    this.f70 = u.cuadro;
    this.flags = u.flags;
  }
  interpV(a, b, s1, fase) {
    const k = this.interp, f = (x, y) => fase ? fase(x, y) : x;
    const one = (x, y) => {
      x = f(x, y);
      return k === 0 ? nearExp(x, y, 2) : k === 1 ? nearExp(x, y, 4) : k === 2 ? nearExp(x, y, 8) : nearTime(x, y, s1);
    };
    return {
      x: one(a.x, b.x),
      y: one(a.y, b.y),
      z: one(a.z, b.z)
    };
  }
  cuadro() {
    const S = this.sis;
    if (!this.fin) {
      const s2 = this.flags, s1 = this.f70 - 1;
      const src40 = this.f40 ? this.vec(this.f40) : this.f50, src44 = this.f44 ? this.vec(this.f44) : this.f58;
      if (s2 & 1) this.ojo = s1 === 0 ? copiar(src40) : this.interpV(this.ojo, src40, s1);
      if (s2 & 2) this.centro = s1 === 0 ? copiar(src44) : this.interpV(this.centro, src44, s1);
      if (s2 & 4) this.rot = s1 === 0 ? copiar(this.f60) : this.interpV(this.rot, this.f60, s1, fase);
      if (s2 & 8) this.track = s1 === 0 ? this.f68 : this.interpV({
        x: this.track,
        y: 0,
        z: 0
      }, {
        x: this.f68,
        y: 0,
        z: 0
      }, s1).x;
      if (s2 & 16) this.ojo = copiar(src40);
      if (s2 & 32) this.centro = copiar(src44);
      if (s2 & 64) this.rot = copiar(this.f60);
      if (s2 & 128) this.track = this.f68;
      if (s2 & 256) this.ojo = copiar(this.cam.pos);
      if (s2 & 512) this.centro = copiar(this.cam.objetivo);
      this.recalc800DB470();
      if (--this.f70 <= 0) {
        const prev = this.tabla[this.i];
        this.i++;
        const u = this.tabla[this.i];
        this.recalc800DB470();
        this.cargar800DB790(u);
        if (u.interp === -1) this.fin = true; else this.f70 = u.cuadro - prev.cuadro;
      }
      this.f90++;
    }
    while (this.li < this.llamadas.length && this.f90 >= this.llamadas[this.li][0]) this.llamar(this.llamadas[this.li++][1]);
    if (S.f150) S.f140 = S.f150(S.f154);
    if (S.f15C) S.f148 = S.f15C(S.f160);
    const r = {
      ojo: copiar(this.ojo),
      centro: copiar(this.centro)
    };
    if (this.fin) this.terminar();
    return r;
  }
  terminar() {
    const S = this.sis;
    this.cam.demo = null;
    S.f4C &= ~131073;
    S.f150 = null;
    S.f15C = null;
    this.scroll.log("fin de la escena", {
      n: this.n
    });
  }
  llamar(fn) {
    const S = this.sis, sc = this.scroll, vs = sc.mgr.voicesys;
    const enJeep = (j, off) => () => {
      const r = j?.raiz;
      if (!r) return V3();
      r.updateMatrixWorld(true);
      const v = new THREE.Vector3(off.x * MM, off.y * MM, off.z * MM).applyMatrix4(r.matrixWorld);
      return {
        x: Math.round(v.x / MJ),
        y: Math.round(v.y / MJ),
        z: Math.round(v.z / MJ)
      };
    };
    switch (fn) {
     case "06E0":
      sc.cine(300);
      this.f44 = () => S.cabezaSnake;
      S.f54 |= 268435456;
      break;

     case "072C":
      S.f4C |= 65536;
      this.f40 = () => S.f140;
      S.f150 = o => enJeep(S.jeep, o)();
      S.f154 = V3(500, 3e3, 5e3);
      this.f44 = () => S.f148;
      S.f15C = o => enJeep(S.jeep2, o)();
      S.f160 = V3(0, 0, 0);
      sc.se(SE.LLEGA_LIQUID);
      break;

     case "07EC":
      vs?.CE2D0();
      this.f44 = () => S.cabezaLiquid;
      this.f40 = () => S.f140;
      S.f150 = o => enJeep(S.jeep2, o)();
      S.f154 = V3(250, 1400, 1500);
      this.cam.modo = 1;
      break;

     case "087C":
      S.f4C = S.f4C & ~65536 | 131072;
      break;

     case "08C8":
      this.f44 = () => S.cabezaSnake;
      vs?.CE2D0();
      break;

     case "08F0":
      S.gameStatus &= ~STATE_DEMO;
      S.f54 &= ~268435456;
      break;

     case "0928":
      this.f44 = () => S.cabezaMeryl;
      S.f4C |= 262144;
      break;

     case "094C":
      sc.cine(270);
      break;

     case "0970":
      vs?.CE2D0();
      break;

     case "09B8":
      this.f44 = null;
      S.f4C &= ~262144;
      break;

     case "0990":
      this.f44 = () => S.cabezaLiquid;
      vs?.CE2D0();
      break;

     case "09DC":
      sc.se(SE.FIN);
      sc.ctx.musica?.(33554187);
      sc.ctx.musica?.(4278190334);
      break;
    }
  }
}

const SEG7 = [ [ 1, 0, 7, 2 ], [ 0, 1, 2, 7 ], [ 7, 1, 2, 7 ], [ 1, 7, 7, 2 ], [ 0, 9, 2, 6 ], [ 7, 9, 2, 6 ], [ 1, 14, 7, 2 ] ];

const SEG7C = [ [ 1, 0, 5, 2 ], [ 0, 1, 2, 5 ], [ 5, 1, 2, 5 ], [ 1, 5, 5, 2 ], [ 0, 7, 2, 5 ], [ 5, 7, 2, 5 ], [ 1, 11, 5, 2 ] ];

const DIGITOS = [ 119, 36, 93, 109, 46, 107, 123, 37, 127, 111 ];

export class Countdown2 extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.esJeep = true;
    this.blanco = false;
    let t = this.opt("t", null);
    const g = typeof window !== "undefined" ? window.__mgs?.guion : null;
    const gv = g?.vars?.get?.("$w:G01ec");
    if (typeof gv === "number" && gv > 0 && (t === 0 || t == null)) t = gv;
    this.tiempo = t != null ? t * 30 : 1e4;
    this.proc = this.procId("p") || -1;
    this.cv = document.createElement("canvas");
    Object.assign(this.cv.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: "5",
      imageRendering: "pixelated"
    });
    (document.getElementById("hud") || document.body).appendChild(this.cv);
    this.img = {};
    for (const n of [ "cd_warn", "cd_keikoku" ]) {
      const i = new Image, url = `assets/jefes/jeep/${n}.png`;
      let k = 0;
      i.onerror = () => {
        if (++k <= 3 && this.vivo !== false) setTimeout(() => {
          i.src = url + "?r=" + k;
        }, 1e3 * k);
      };
      i.src = url;
      this.img[n] = i;
    }
  }
  async iniciar() {
    const m = await (import("../hud.js"));
    this.disp = m.disposicionHud;
  }
  act() {
    if (this.tiempo > 0 && --this.tiempo === 0) this.correr();
  }
  cuadro() {
    if (!this.mgr.__jeepSis) this.act();
  }
  correr() {
    if (this.proc >= 0) {
      const p = this.proc;
      this.proc = -1;
      this.mgr.correrProc(p, [ trunc(this.tiempo / 30) ]);
    }
  }
  dibujar() {
    const cv = this.cv, iw = innerWidth, ih = innerHeight;
    if (cv.width !== iw || cv.height !== ih) {
      cv.width = iw;
      cv.height = ih;
    }
    const x = cv.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, iw, ih);
    const hud = document.getElementById("hud");
    if (!this.disp || hud && hud.hidden) return;
    if ((this.mgr.__jeepSis?.gameStatus ?? 0) & STATE_DEMO) return;
    const D = this.disp();
    x.imageSmoothingEnabled = false;
    x.setTransform(D.kcss, 0, 0, D.kcss, 0, 0);
    const cx = D.radar[0] + 34, cy = D.radar[1] + 26;
    x.fillStyle = "rgb(0,0,0)";
    x.fillRect(cx - 34, cy - 26, 69, 52);
    x.fillStyle = "rgba(40,4,2,0.9)";
    x.fillRect(cx - 34, cy - 26, 69, 52);
    const s3 = trunc(this.tiempo * 100 / 30), col = "rgb(137,37,24)";
    x.fillStyle = col;
    const par = s3 % 100 < 50;
    x.fillStyle = par ? "rgb(24,8,0)" : col;
    for (const [px, py] of [ [ 24, 36 ], [ 24, 43 ], [ 48, 37 ], [ 48, 44 ] ]) x.fillRect(cx + px - 34, cy + py - 26, 1, 2);
    x.fillStyle = col;
    const dig = (d, X, Y, seg) => {
      const m = DIGITOS[d];
      seg.forEach(([sx, sy, w, h], i) => {
        if (m & 1 << i) x.fillRect(X + sx, Y + sy, w, h);
      });
    };
    const cs = s3 % 100, seg = trunc(s3 / 100) % 60, min = trunc(s3 / 6e3) % 60;
    const XS = [ 3, 13, 27, 37, 51, 59 ], YS = [ 32, 32, 32, 32, 35, 35 ];
    [ [ min, 0 ], [ seg, 2 ], [ cs, 4 ] ].forEach(([v, k]) => {
      const S = k === 4 ? SEG7C : SEG7;
      dig(trunc(v / 10), cx + XS[k] - 34, cy + YS[k] - 26, S);
      dig(v % 10, cx + XS[k + 1] - 34, cy + YS[k + 1] - 26, S);
    });
    x.fillRect(cx - 33, cy + 3, 67, 1);
    x.fillRect(cx - 33, cy + 24, 67, 1);
    if (((this.mgr.frame | 0) & 15) < 8) {
      const a = this.img.cd_warn, b = this.img.cd_keikoku, ok = i => i?.complete && i.naturalWidth > 0;
      if (ok(a)) x.drawImage(a, cx - 34, cy - 25);
      if (ok(b)) x.drawImage(b, cx - 33, cy - 13);
    }
  }
  destruir() {
    if (!this.vivo) return;
    this.correr();
    super.destruir();
    this.cv.remove();
  }
}

export const TIPOS_JEEP = {
  JEEPSCROLL: JeepScroll,
  JEEPDRUM: TamborJeep,
  JEEP_EMY: SoldadoJeep,
  COUNTDOWN2: Countdown2,
  PK_JEEP: PkJeep
};

const sel = () => {
  try {
    return new URLSearchParams(globalThis.location?.search || "").get("jefes") || "";
  } catch {
    return "";
  }
};

export const PELEA_S19B = {
  elegir: nv => {
    const ota = sel() === "otacon";
    const js = nv.actores.filter(a => a.tipo === "JEEPSCROLL"), vs = nv.actores.filter(a => a.tipo === "VOICESYS");
    const a = (ota ? js.find(x => x.evento) : js.find(x => !x.evento)) || js[0];
    const v = (ota ? vs.find(x => x.evento) : vs.find(x => !x.evento)) || vs[0];
    return [ v, a && {
      ...a,
      forzado: true
    }, nv.actores.find(x => x.tipo === "COUNTDOWN2") ].filter(Boolean);
  }
};
