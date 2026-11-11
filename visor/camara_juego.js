// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { ducto as ductoSnake } from "./ducto.js";

import * as ctl from "./controles.js";

const MM = .001, FPS = 30, ANG = Math.PI * 2 / 4096;

const ENTRAR = 3538, SALIR = 54732;

const trunc = Math.trunc;

const and12 = a => (a % 4096 + 4096) % 4096;

const ratan2 = (y, x) => Math.round(Math.atan2(y, x) / ANG);

const vecDir2 = (x, z) => and12(ratan2(x, z));

const difS = (a, b) => {
  const d = and12(b - a);
  return d <= 2048 ? d : d - 4096;
};

const TIME_INV = [ 0, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256 ];

const nearExp2 = (f, t) => {
  const d = t - f;
  return d > -2 && d < 2 ? t : f + trunc(d / 2);
};

const nearExp4 = (f, t) => {
  const d = t - f;
  return d > -4 && d < 4 ? t : f + trunc(d / 4);
};

const nearPhase = (f, t) => {
  let d = and12(f - t);
  if (d > 2048) d -= 4096;
  return t + d;
};

const nearTime = (f, t, k) => k === 0 ? t : trunc((t - f) * k / 4096) + f;

const nearRange = (f, t, r) => f < t - r ? t - r : f > t + r ? t + r : f;

const sat = v => v > 32767 ? 32767 : v < -32768 ? -32768 : v;

const V = (x = 0, y = 0, z = 0) => ({
  x: x,
  y: y,
  z: z
});

const copiar = (a, b) => {
  a.x = b.x;
  a.y = b.y;
  a.z = b.z;
  return a;
};

const vecs = {
  nearExp2: (a, b) => {
    a.x = nearExp2(a.x, b.x);
    a.y = nearExp2(a.y, b.y);
    a.z = nearExp2(a.z, b.z);
  },
  nearExp4: (a, b) => {
    a.x = nearExp4(a.x, b.x);
    a.y = nearExp4(a.y, b.y);
    a.z = nearExp4(a.z, b.z);
  },
  nearExp2P: (a, b) => {
    a.x = nearExp2(nearPhase(a.x, b.x), b.x);
    a.y = nearExp2(nearPhase(a.y, b.y), b.y);
    a.z = nearExp2(nearPhase(a.z, b.z), b.z);
  },
  nearExp4P: (a, b) => {
    a.x = nearExp4(nearPhase(a.x, b.x), b.x);
    a.y = nearExp4(nearPhase(a.y, b.y), b.y);
    a.z = nearExp4(nearPhase(a.z, b.z), b.z);
  },
  nearTime: (a, b, k) => {
    k = TIME_INV[Math.min(15, Math.max(0, k))];
    a.x = nearTime(a.x, b.x, k);
    a.y = nearTime(a.y, b.y, k);
    a.z = nearTime(a.z, b.z, k);
  },
  nearTimeP: (a, b, k) => {
    k = TIME_INV[Math.min(15, Math.max(0, k))];
    a.x = nearTime(nearPhase(a.x, b.x), b.x, k);
    a.y = nearTime(nearPhase(a.y, b.y), b.y, k);
    a.z = nearTime(nearPhase(a.z, b.z), b.z, k);
  }
};

const rsin = a => Math.round(Math.sin((a & 4095) * ANG) * 4096), rcos = a => Math.round(Math.cos((a & 4095) * ANG) * 4096);

function dirVec3(rot, len) {
  const sx = rsin(rot.x), cx = rcos(rot.x), sy = rsin(rot.y), cy = rcos(rot.y);
  return V(s16(trunc(len * (sy * cx >> 12) / 4096)), s16(trunc(len * -sx / 4096)), s16(trunc(len * (cy * cx >> 12) / 4096)));
}

function makeRotate(c, t, out) {
  const x = s16(t.x - c.x), y = s16(t.y - c.y), z = s16(t.z - c.z);
  out.track = Math.floor(Math.sqrt(x * x + y * y + z * z));
  out.rot.z = 0;
  out.rot.y = vecDir2(x, z);
  out.rot.x = ratan2(-y, Math.floor(Math.sqrt(x * x + z * z)));
}

function makeTarget(c, t, rot, track) {
  const d = dirVec3(rot, track);
  t.x = sat(c.x + d.x);
  t.y = sat(c.y + d.y);
  t.z = sat(c.z + d.z);
}

function makeCamera(c, t, rot, track) {
  const d = dirVec3(rot, track);
  c.x = sat(t.x - d.x);
  c.y = sat(t.y - d.y);
  c.z = sat(t.z - d.z);
}

const clamp = (v, a, b) => {
  if (v < a) v = a;
  if (v > b) v = b;
  return v;
};

const INTERP = [ 0, 1966081, 1966082, 1966083, 1310723, 655363, 327683, 196611 ];

const ESTADO_S = [ 0, 32, 64, 8, 2048, 65536, 131072, 4096, 4, 1 ];

export const ESTADO = {
  MOVE: 16,
  SQUAT: 32,
  GROUND: 64,
  ATTACK: 2048,
  CB_BOX: 4096,
  CAUTION: 65536,
  CHECK_WALL: 131072,
  INTRUDE: 2
};

const CABEZA = [ 1499, 873, 136 + 320 ];

const s16 = v => (v & 65535 ^ 32768) - 32768;

const rnd = () => Math.floor(Math.random() * 32768);

const ALT_SNAKE = [ 1100, 496, 136 ];

export class CamaraJuego {
  constructor(op = {}) {
    this.op = op;
    this.datos = null;
    this.acum = 0;
    this.cuadros = 0;
    this.cajas = new Map;
    this.binds = [];
    this.reset();
  }
  async cargar(st) {
    if (/^(?:vr|vab|vcd|vefgh|vijkl|photo)_/.test(st)) throw new Error("sin camaras.json para " + st);
    const r = await fetch(`assets/niveles/${st}/camaras.json`);
    if (!r.ok) throw new Error("sin camaras.json para " + st);
    this.usarDatos(await r.json());
    return this;
  }
  reset() {
    const B = 32767;
    this.G = {
      pos: V(),
      trg: V(),
      rot: V(),
      track: 1e4,
      type: 0,
      flag: 0,
      zoom: 320,
      alertMask: 100,
      interp: -1,
      interpMode: 0,
      bound: [ [ V(B, B, B), V(B, B, B) ], [ V(-B, -B, -B), V(-B, -B, -B) ] ],
      limit: [ [ V(B, B, B), V(B, B, B) ], [ V(-B, -B, -B), V(-B, -B, -B) ] ]
    };
    this.S = {
      pos: V(),
      trg: V(),
      rot: V(640, 2048, 0),
      track: 1e4,
      rot2: V(0, 2048, 0)
    };
    this.U = {
      pos: V(),
      pad: 0,
      trg: V(),
      rot: V(),
      track: 1e4
    };
    this.W = {
      pos: V(),
      trg: V(),
      rot: V(),
      track: 1e4,
      zoom: 320
    };
    this.lista = Array.from({
      length: 8
    }, () => ({
      pos: V(),
      padPos: 0,
      trg: V(),
      mask: 0,
      p1: -1,
      interp: 0,
      tipo: 0,
      padTipo: 0
    }));
    this.trackSave = 1e4;
    this.rotSave = V(640, 2048, 0);
    this.evFlag = 0;
    this.evPrev = 0;
    this.mascaraAlerta = 0;
    this.mensajes = [];
    this.buzon = [];
    this.prevPos = V();
    this.padOrg = 0;
    this.sinDibujo = 4;
    this.fpOrg = 0;
    this.flagsOrg = 0;
    this.S.interp = 0;
    this.G.fp = 0;
    this.ocultar = 0;
    this.cuerpoOculto = false;
    this.ductoAnt = false;
    this.sacudones = [];
    this.shake = 0;
    this.adentro = [];
    this.disparadas = new Set;
    this.agenda = [];
    this.detras = {
      trp: null,
      n: 0
    };
    this.corteActivo = null;
    this.camActual = -1;
    this.inicializado = false;
    this.sobreescribir();
  }
  usarDatos(d) {
    this.reset();
    this.datos = d;
    this.zoomBase = d.zoom || 320;
    for (const a of d.inicial || []) {
      if (a.t) continue;
      if (a.camera) this.camera(a.camera); else if (a.evento) this.buzon.push([ a.evento.cam, a.evento.ev === "entra" ? ENTRAR : SALIR ]); else if (a.corte) this.corte(a.corte.ojo, a.corte.centro, a.corte.zoom, a.corte.cuadros);
    }
    for (const a of d.inicial || []) if (a.camera && a.t > 0 && this.op.conDemoras) this.agenda.push({
      t: a.t,
      acc: [ a ]
    });
    this.cajas = new Map;
    for (const t of d.trampas || []) for (const c of t.cajas || []) {
      if (!this.cajas.has(t.zona)) this.cajas.set(t.zona, []);
      const lst = this.cajas.get(t.zona);
      if (!lst.some(q => q[0].join() === c[0].join() && q[1].join() === c[1].join())) lst.push(c);
    }
    this.binds = (d.trampas || []).map((t, i) => ({
      ...t,
      i: i
    }));
  }
  sobreescribir() {
    if (!(this.G.flag & 32)) {
      this.S.track = this.trackSave;
      copiar(this.S.rot, this.rotSave);
    } else {
      this.S.track = this.U.track;
      copiar(this.S.rot, this.U.rot);
    }
  }
  camera(c) {
    const e = c.e ? 1 : 0, G = this.G;
    if (c.b) {
      G.bound[1][e] = V(c.b[0], c.b[1], c.b[2]);
      G.bound[0][e] = V(c.b[3], c.b[4], c.b[5]);
    }
    if (c.t != null) {
      this.trackSave = c.t;
      this.sobreescribir();
    }
    if (c.l) {
      G.limit[1][e] = V(c.l[0], c.l[1], c.l[2]);
      G.limit[0][e] = V(c.l[3], c.l[4], c.l[5]);
    }
    if (c.r) {
      this.rotSave = V(c.r[0], c.r[1], c.r[2]);
      this.sobreescribir();
    }
    if (c.s && c.s.id < 8) {
      const k = this.lista[c.s.id];
      k.p1 = c.s.p1;
      k.interp = c.s.interp;
      k.tipo = c.s.tipo;
      k.padTipo = c.p ? 1 : 0;
      k.pos = V(...c.s.pos);
      k.trg = V(...c.s.trg);
      k.mask = c.s.mask || 0;
      this.mascaraAlerta = this.mascaraAlerta & ~(1 << c.s.id) | (k.mask & 2 ? 1 << c.s.id : 0);
    }
    if (c.a != null) G.alertMask = c.a;
  }
  aplicar(acciones) {
    for (const a of acciones) {
      if (a.t > 0) {
        this.agenda.push({
          t: this.cuadros + a.t,
          acc: [ {
            ...a,
            t: 0
          } ]
        });
        continue;
      }
      if (a.camera) this.camera(a.camera); else if (a.evento) this.mensajes.push([ a.evento.cam, a.evento.ev === "entra" ? ENTRAR : SALIR ]); else if (a.corte) this.corte(a.corte.ojo, a.corte.centro, a.corte.zoom, a.corte.cuadros); else if (a.mesg) this.op.alMensaje?.(a.mesg.a, a.mesg.v);
    }
  }
  corte(ojo, centro, zoom = 320, cuadros = 90) {
    this.corteActivo = {
      ojo: V(...ojo),
      centro: V(...centro),
      zoom: zoom,
      t: cuadros
    };
    this.corteVisible = null;
  }
  condicion(b, sn) {
    if (b.d) {
      let d = and12(-b.d[0] + sn.dir);
      if (d > 2048) d = 4096 - d;
      if (b.d[1] < d) return false;
    }
    if (b.s != null) {
      const m = ESTADO_S[b.s] || 0;
      if (m) {
        if (!(sn.estado & m)) return false;
      } else if (sn.estado !== 0 && sn.estado & ~4294197264) return false;
    }
    if (b.b != null && !(sn.botones & [ 32, 128, 64, 16 ][b.b])) return false;
    return true;
  }
  evento(nombre, modo, sn) {
    for (const b of this.binds) {
      if (b.zona && b.zona !== nombre) continue;
      const cond = b.cmd === "ntrap" && (b.d || b.s != null || b.b != null);
      let hash = ENTRAR;
      if (modo !== 0 && this.condicion(b, sn)) {
        if (!cond) {
          if (modo !== 1 && !b.r) continue;
        } else if (this.disparadas.has(b.i)) continue; else if (!b.r) this.disparadas.add(b.i);
      } else {
        if (cond && !b.r && !this.disparadas.has(b.i)) continue;
        hash = SALIR;
        this.disparadas.delete(b.i);
      }
      if (b.cond && b.cond !== hash) continue;
      const acc = hash === ENTRAR ? b.entra : b.sale;
      if (!acc) continue;
      if (b.t > 0) this.agenda.push({
        t: this.cuadros + b.t,
        acc: acc
      }); else this.aplicar(acc);
    }
  }
  trampas(sn) {
    const p = sn.mov, ahora = [];
    for (const [nombre, cajas] of this.cajas) {
      if (!cajas.some(c => p.x >= c[0][0] && p.x < c[1][0] && p.z >= c[0][2] && p.z < c[1][2] && p.y >= c[0][1] && p.y < c[1][1])) continue;
      this.evento(nombre, this.adentro.includes(nombre) ? 2 : 1, sn);
      ahora.push(nombre);
    }
    for (const n of this.adentro) if (!ahora.includes(n)) this.evento(n, 0, sn);
    this.adentro = ahora;
  }
  detrasCuadro(sn) {
    const D = this.detras, alerta = this.alerta() === 1;
    const trp = sn.pared && !alerta ? (this.datos?.detras || []).find(c => sn.mov.x >= c.caja[0][0] && sn.mov.x < c.caja[1][0] && sn.mov.z >= c.caja[0][2] && sn.mov.z < c.caja[1][2] && sn.mov.y >= c.caja[0][1] && sn.mov.y < c.caja[1][1]) : null;
    if (trp) {
      if (D.trp !== trp && ++D.n >= 10) {
        D.trp = trp;
        const k = this.lista[3];
        k.p1 = 1;
        k.interp = 2;
        k.tipo = 0;
        k.padTipo = 2;
        k.padPos = this.padOrg;
        k.trg = V(...trp.trg);
        k.pos = V(...trp.pos);
        this.evFlag |= 8;
        this.evPrev &= ~8;
      }
    } else {
      if (D.trp) {
        this.evFlag &= ~8;
        this.evPrev |= 8;
      }
      D.n = 0;
      D.trp = null;
    }
  }
  alerta() {
    return this.op.alerta ? this.op.alerta() : 0;
  }
  checkMessage() {
    const M = this.buzon;
    if (!M.length) return;
    let bitmap = 0;
    for (const [i, t] of M) if (t === SALIR) {
      bitmap |= 1 << i;
      this.evFlag &= ~(1 << i);
    }
    for (const [i, t] of M) if (t === ENTRAR) {
      this.evFlag |= 1 << i;
      if (bitmap & 1 << i) this.evPrev &= ~(1 << i);
    }
    this.buzon = [];
  }
  checkEvents() {
    let ev = this.evFlag;
    if (this.alerta() === 1) {
      if (this.G.alertMask < 8) ev &= ~((1 << this.G.alertMask) - 1);
      if (this.mascaraAlerta) ev &= ~this.mascaraAlerta;
    }
    const cambio = ev ^ this.evPrev;
    if (!cambio) return false;
    this.evPrev = ev;
    let viejo = 0;
    for (let m = 1; viejo < 7; viejo++, m <<= 1) if (cambio & m) break;
    let i = 7;
    for (let m = 128; i >= 0; i--, m >>= 1) if (ev & m) {
      if (this.lista[i].p1 !== -1) break;
      this.evFlag &= ~m;
    }
    this.syncDesdeVista();
    this.cambiarCamara(i, viejo);
    this.camActual = i;
    return true;
  }
  syncDesdeVista() {
    copiar(this.G.pos, this.W.pos);
    copiar(this.G.trg, this.W.trg);
    const r = {
      rot: this.G.rot
    };
    makeRotate(this.G.pos, this.G.trg, r);
    this.G.track = r.track;
    copiar(this.W.rot, this.G.rot);
  }
  cambiarCamara(nueva, vieja) {
    const G = this.G, U = this.U, S = this.S;
    G.flag &= ~60;
    if (nueva === -1) {
      if (!(G.flag & 2)) this.sobreescribir();
    } else {
      const k = this.lista[nueva];
      if (k.p1 === 0) {
        G.flag |= 32;
        S.rot = V(k.trg.x, k.trg.y, 0);
        copiar(U.trg, S.trg);
        copiar(U.rot, S.rot);
        U.track = S.track = k.trg.z;
        makeCamera(U.pos, U.trg, U.rot, U.track);
      } else {
        if (k.tipo === 0) {
          copiar(U.pos, k.pos);
          copiar(U.trg, k.trg);
          const r = {
            rot: U.rot
          };
          makeRotate(U.pos, U.trg, r);
          U.track = r.track;
        } else if (k.tipo === 1) {
          copiar(U.pos, k.pos);
          U.rot = V(k.trg.x, k.trg.y, 0);
          U.track = k.trg.z;
          makeTarget(U.pos, U.trg, U.rot, U.track);
        } else if (k.tipo === 2) {
          copiar(U.trg, k.pos);
          U.rot = V(k.trg.x, k.trg.y, 0);
          U.track = k.trg.z;
          makeCamera(U.pos, U.trg, U.rot, U.track);
        }
        U.pad = s16(k.padTipo | (k.padPos & 65535) * 4);
        G.flag |= k.p1 === 1 ? 16 : k.p1 === 2 ? 8 : 4;
      }
    }
    if (G.fp === 1 || this.sinDibujo > 0) {
      G.interpMode = 0;
      G.interp = -1;
    } else if (vieja < 0) {
      G.interpMode = 2;
      G.interp = 30;
    } else {
      const t = INTERP[this.lista[vieja].interp & 7];
      G.interpMode = t & 65535;
      G.interp = t >> 16;
    }
  }
  padFijo(conRot) {
    const U = this.U;
    switch (U.pad & 3) {
     case 0:
      this.padOrg = 0;
      break;

     case 1:
      if (conRot) {
        const r = {
          rot: U.rot
        };
        makeRotate(this.G.pos, this.G.trg, r);
        U.track = r.track;
      }
      this.padOrg = and12(U.rot.y + 2048);
      break;

     case 2:
      this.padOrg = U.pad >> 2;
      break;
    }
  }
  seguirObjetivo() {
    const S = this.S, G = this.G, t = S.trg;
    if (this.sinDibujo > 0) copiar(t, S.pos); else {
      const v = V(nearRange(t.x, S.pos.x, 500), nearRange(t.y, S.pos.y, 150), nearRange(t.z, S.pos.z, 500));
      vecs.nearExp4(t, v);
    }
    const i = G.flag & 32 ? 1 : 0, mx = G.limit[0][i], mn = G.limit[1][i];
    t.x = clamp(t.x, mn.x, mx.x);
    t.y = clamp(t.y, mn.y, mx.y);
    t.z = clamp(t.z, mn.z, mx.z);
  }
  logica() {
    const G = this.G, S = this.S, U = this.U;
    this.seguirObjetivo();
    const seguir = () => {
      copiar(G.trg, S.trg);
      G.track = S.track;
      copiar(G.rot, S.rot);
      G.type = 2;
      this.padOrg = 0;
    };
    if (G.flag & 32) {
      seguir();
      return 2;
    }
    if (G.flag & 16) {
      copiar(G.pos, U.pos);
      copiar(G.trg, U.trg);
      G.type = 0;
      this.padFijo(false);
      return 0;
    }
    if (G.flag & 8) {
      U.trg.z = S.trg.z;
      copiar(G.pos, U.pos);
      copiar(G.trg, U.trg);
      G.type = 0;
      this.padOrg = 0;
      return 0;
    }
    if (G.flag & 4) {
      copiar(G.pos, U.pos);
      copiar(G.trg, S.trg);
      G.type = 0;
      this.padFijo(true);
      return 0;
    }
    if (G.flag & 2) return 0;
    seguir();
    return 1;
  }
  helper3() {
    const G = this.G, S = this.S;
    if (G.fp !== this.fpOrg) {
      S.interp = 0;
      G.interpMode = 0;
      if (G.fp === 0) {
        G.flag |= 1;
        this.syncDesdeVista();
      } else if (G.fp === 1) {
        G.flag |= 256;
        this.syncDesdeVista();
        if (!(G.flag & 1)) this.sobreescribir();
      } else G.fp = 1;
    }
    if (G.flag !== this.flagsOrg) S.interp = 0;
    this.fpOrg = G.fp;
    this.flagsOrg = G.flag;
  }
  primeraPersonaCuadro() {
    const G = this.G, S = this.S;
    if (G.flag & 256) {
      if (S.interp >= 12) G.flag &= ~257;
      this.interpDentro(S.interp);
    } else {
      copiar(G.pos, S.pos);
      G.track = 1e3;
      copiar(G.rot, S.rot2);
      G.type = 1;
      this.padOrg = and12(S.rot2.y + 2048);
    }
    S.interp++;
  }
  interpDentro(i) {
    const G = this.G, S = this.S;
    if (i < 6) {
      vecs.nearExp4(G.trg, S.pos);
      vecs.nearExp4P(G.rot, S.rot2);
      G.track = nearExp4(G.track, 1e3);
      const d = dirVec3(G.rot, G.track);
      G.pos = V(sat(G.trg.x - d.x), sat(G.trg.y - d.y), sat(G.trg.z - d.z));
    } else {
      vecs.nearTime(G.pos, S.pos, 12 - i);
      vecs.nearTimeP(G.rot, S.rot2, 12 - i);
      G.track = nearTime(G.track, 1e3, TIME_INV[Math.min(15, 12 - i)]);
      const d = dirVec3(G.rot, G.track);
      G.trg = V(sat(G.pos.x + d.x), sat(G.pos.y + d.y), sat(G.pos.z + d.z));
    }
    G.type = 0;
    this.padOrg = 0;
  }
  interpFuera(i) {
    const G = this.G, S = this.S;
    let ret = 0;
    if (i < 2) {
      vecs.nearTime(G.trg, S.pos, 2 - i);
      vecs.nearTimeP(G.rot, S.rot2, 2 - i);
      G.track = nearTime(G.track, 1e3, TIME_INV[2 - i]);
      this.padOrg = 0;
    } else {
      const exp4 = i < 4, trg = {
        ...G.trg
      }, rot = {
        ...G.rot
      };
      let track = G.track;
      ret = this.logica();
      if (G.type === 0) {
        const r = {
          rot: G.rot
        };
        makeRotate(G.pos, G.trg, r);
        G.track = r.track;
      } else if (G.type === 1) makeTarget(G.pos, G.trg, G.rot, G.track);
      if (exp4) {
        vecs.nearExp4(trg, G.trg);
        vecs.nearExp4P(rot, G.rot);
        track = nearExp4(track, G.track);
      } else {
        vecs.nearExp2(trg, G.trg);
        vecs.nearExp2P(rot, G.rot);
        track = nearExp2(track, G.track);
      }
      copiar(G.trg, trg);
      copiar(G.rot, rot);
      G.track = track;
    }
    G.type = 2;
    return ret;
  }
  terceraPersonaCuadro() {
    const G = this.G, S = this.S;
    if (G.flag & 1) {
      if (S.interp >= 12) {
        G.flag &= ~257;
        G.interp = -1;
        G.interpMode = 0;
      }
      const r = this.interpFuera(S.interp);
      S.interp++;
      return r;
    }
    return this.logica();
  }
  sacudir(a) {
    const o = a?.opts || {}, n = (k, d) => typeof o[k]?.[0] === "number" ? o[k][0] : d, p = Array.isArray(o.p) ? o.p : [ 0, 0, 0 ];
    const t = Math.max(1, n("l", 0));
    this.sacudones.push({
      p: V(p[0] | 0, p[1] | 0, p[2] | 0),
      r: Math.max(1, n("r", 0)),
      s: n("s", 0),
      t: t,
      c: t
    });
    return true;
  }
  cuadroSacudones(mov) {
    for (const k of this.sacudones.slice()) {
      if (--k.c < 0) {
        this.sacudones.splice(this.sacudones.indexOf(k), 1);
        continue;
      }
      const dx = mov.x - k.p.x >> 2, dy = mov.y - k.p.y >> 2, dz = mov.z - k.p.z >> 2, L = Math.floor(Math.sqrt(dx * dx + dy * dy + dz * dz)) << 2;
      if (L > k.r) continue;
      const tmp = trunc((k.r - L) * trunc(k.c * k.s / k.t) / k.r);
      this.shake += rnd() * tmp >> 15;
    }
  }
  vista() {
    const G = this.G, W = this.W;
    W.track = G.track;
    W.zoom = G.zoom;
    if (G.interpMode === 0) {
      copiar(W.pos, G.pos);
      copiar(W.rot, G.rot);
      copiar(W.trg, G.trg);
    } else {
      const r = {
        rot: G.rot
      };
      makeRotate(G.pos, G.trg, r);
      G.track = r.track;
      W.pos.x += G.pos.x - this.prevPos.x;
      W.pos.y += G.pos.y - this.prevPos.y;
      W.pos.z += G.pos.z - this.prevPos.z;
      copiar(this.prevPos, G.pos);
      if (G.interpMode === 3) {
        vecs.nearTime(W.pos, G.pos, G.interp);
        vecs.nearTimeP(W.rot, G.rot, G.interp);
      } else if (G.interpMode === 1) {
        vecs.nearExp2(W.pos, G.pos);
        vecs.nearExp2P(W.rot, G.rot);
      } else if (G.interpMode === 2) {
        vecs.nearExp4(W.pos, G.pos);
        vecs.nearExp4P(W.rot, G.rot);
      }
      if (W.track > 1e4) W.track = 1e4;
      makeTarget(W.pos, W.trg, W.rot, W.track);
      if (--G.interp < 0) {
        G.interpMode = 0;
        G.interp = -1;
      }
    }
    this.temblor = 0;
    const r = this.op.ruido?.(), fp = G.fp !== 0;
    if (r && r.p >= 255) this.temblor = trunc((Math.floor(Math.random() * 1024) - 512) * r.len / (fp ? 128 : 32));
    this.temblor += fp ? trunc(this.shake / 4) : this.shake;
    this.shake = 0;
  }
  infoSnake(s) {
    const postura = s.postura || 0, p = s.pos;
    const dir = s.dir != null ? s.dir : s.rumbo != null ? and12(Math.round((s.rumbo + Math.PI) / ANG)) : 0;
    let estado = s.estado ?? 0;
    if (s.estado == null) {
      if (postura === 1) estado |= ESTADO.SQUAT;
      if (postura === 2) estado |= ESTADO.GROUND;
      if (s.pared) estado |= ESTADO.CAUTION;
    }
    const piso = Math.round(p.y * 1e3);
    const mov = V(Math.round(p.x * 1e3), piso + ALT_SNAKE[postura], Math.round(p.z * 1e3));
    const cy = s.cabezaY != null ? s.cabezaY : s.cabeza ? s.cabeza.y : null;
    const cab = V(mov.x, cy != null ? Math.round(cy * 1e3) + (postura === 2 ? 320 : 0) : piso + CABEZA[postura], mov.z);
    let ducto = false;
    if (postura === 2) for (const c of this.datos?.ductos || []) if (mov.x >= c[0][0] && mov.x < c[1][0] && mov.z >= c[0][2] && mov.z < c[1][2] && mov.y >= c[0][1] && mov.y < c[1][1]) {
      ducto = true;
      break;
    }
    if (ducto) estado |= ESTADO.INTRUDE;
    const asomar = s.asomar && !ducto ? V(Math.round(s.asomar.x * 1e3), Math.round(s.asomar.y * 1e3), Math.round(s.asomar.z * 1e3)) : null;
    return {
      mov: mov,
      cab: cab,
      dir: dir,
      estado: estado,
      pared: !!s.pared && !ducto,
      botones: s.botones || 0,
      piso: piso,
      ducto: ducto,
      fp: ducto || !!s.primeraPersona ? 1 : 0,
      mirar: s.mirar | 0,
      asomar: asomar
    };
  }
  cuadro(s) {
    const sn = this.infoSnake(s);
    this.cuadros++;
    for (const a of this.agenda.filter(x => x.t <= this.cuadros)) {
      this.agenda.splice(this.agenda.indexOf(a), 1);
      this.aplicar(a.acc);
    }
    this.trampas(sn);
    this.detrasCuadro(sn);
    const S = this.S, G = this.G;
    if (sn.ducto) {
      vecs.nearExp4(S.pos, V(sn.mov.x, sn.mov.y + 320, sn.mov.z));
      S.pos.y = clamp(S.pos.y, sn.piso + 150, sn.piso + 250);
    } else copiar(S.pos, sn.cab);
    if (sn.fp && sn.asomar) {
      S.pos.x += sn.asomar.x;
      S.pos.y += sn.asomar.y;
      S.pos.z += sn.asomar.z;
    }
    {
      const ojo = ductoSnake.ojoJuego(S.pos, sn.ducto);
      if (ojo) copiar(S.pos, ojo);
    }
    S.rot2.x = sn.fp && !sn.ducto ? sn.mirar : 0;
    S.rot2.y = sn.dir;
    S.rot2.z = 0;
    if (!this.inicializado) {
      copiar(S.trg, S.pos);
      this.inicializado = true;
    }
    if (sn.fp !== G.fp) this.ocultar = sn.fp ? -6 : 6;
    G.fp = sn.fp;
    this.ductoAnt = sn.ducto;
    this.cuadroSacudones(sn.mov);
    this.checkMessage();
    const cambio = this.checkEvents();
    this.helper3();
    let b = 0;
    if (G.fp === 1) this.primeraPersonaCuadro(); else b = this.terceraPersonaCuadro();
    if (G.type === 1) makeTarget(G.pos, G.trg, G.rot, G.track); else if (G.type === 2) makeCamera(G.pos, G.trg, G.rot, G.track);
    if (b > 0) {
      const mx = G.bound[0][b - 1], mn = G.bound[1][b - 1], c = G.pos;
      c.x = clamp(c.x, mn.x, mx.x);
      c.y = clamp(c.y, mn.y, mx.y);
      c.z = clamp(c.z, mn.z, mx.z);
    }
    if (cambio) copiar(this.prevPos, G.pos);
    this.vista();
    if (this.ocultar < 0 && G.fp && ++this.ocultar === 0) this.cuerpoOculto = true; else if (this.ocultar > 0 && !G.fp && --this.ocultar === 0) this.cuerpoOculto = false;
    if (this.sinDibujo > 0) this.sinDibujo--;
    this.corteVisible = this.corteActivo;
    if (this.corteActivo && --this.corteActivo.t < 0) this.corteActivo = null;
    this.buzon = this.buzon.concat(this.mensajes);
    this.mensajes = [];
  }
  update(dt, s) {
    this.acum += dt;
    let n = 0;
    while (this.acum >= 1 / FPS && n < 4) {
      this.acum -= 1 / FPS;
      this.cuadro(s);
      n++;
    }
    if (n === 4) this.acum = 0;
    return this.resultado();
  }
  resultado(aspecto = (typeof innerWidth === "number" && innerHeight > 0 ? innerWidth / innerHeight : 4 / 3)) {
    const c = this.corteVisible || this.corteActivo;
    const pos = c ? c.ojo : {
      x: this.W.pos.x,
      y: this.W.pos.y + (this.temblor || 0),
      z: this.W.pos.z
    }, trg = c ? c.centro : this.W.trg, zoom = c ? c.zoom : this.W.zoom;
    const tanV = 112 / (zoom * 58 / 64), tanH = 160 / zoom;
    return {
      pos: new THREE.Vector3(pos.x * MM, pos.y * MM, pos.z * MM),
      objetivo: new THREE.Vector3(trg.x * MM, trg.y * MM, trg.z * MM),
      fov: 2 * Math.atan(Math.max(tanV, tanH / Math.max(.2, aspecto))) * 180 / Math.PI,
      primeraPersona: this.G.fp === 1,
      ocultarSnake: this.cuerpoOculto,
      ducto: !!this.ductoAnt,
      rumboPad: this.padOrg * ANG,
      camara: this.camActual,
      corte: !!c,
      flag: this.G.flag
    };
  }
  get primeraPersona() {
    return this.G.fp === 1;
  }
  get enDucto() {
    return !!this.ductoAnt;
  }
  estado() {
    return {
      camara: this.camActual,
      flag: this.G.flag,
      evFlag: this.evFlag,
      pos: {
        ...this.W.pos
      },
      trg: {
        ...this.W.trg
      },
      rot: {
        ...this.W.rot
      },
      track: this.W.track,
      adentro: this.adentro.map(n => this.binds.find(b => b.zona === n)?.nombre || n),
      interp: [ this.G.interpMode, this.G.interp ],
      padOrg: this.padOrg
    };
  }
}

export class Asomarse {
  constructor() {
    this.a56 = 0;
    this.a58 = 0;
    this.bandera = false;
    this.ant = 0;
    this.acum = 0;
    this.desp = new THREE.Vector3;
    this.obj = new THREE.Vector3;
    this.teclas = {
      Digit1: false,
      Digit2: false
    };
    if (typeof addEventListener === "function") {
      addEventListener("keydown", e => {
        if (e.code in this.teclas) this.teclas[e.code] = true;
      });
      addEventListener("keyup", e => {
        if (e.code in this.teclas) this.teclas[e.code] = false;
      });
      addEventListener("blur", () => {
        this.teclas.Digit1 = this.teclas.Digit2 = false;
      });
    }
  }
  botones() {
    let b = (this.teclas.Digit1 ? 1 : 0) | (this.teclas.Digit2 ? 2 : 0);
    const g = ctl.mando();
    if (g) {
      if (g.buttons[ctl.B.L1]?.pressed) b |= 1;
      if (g.buttons[ctl.B.R1]?.pressed) b |= 2;
    }
    return b | (this.forzado || 0);
  }
  cuadro({activo: activo, ojo: ojo, rumbo: rumbo, pared: pared}) {
    const st = activo ? this.botones() : 0, press = st & ~this.ant, rel = this.ant & ~st;
    this.ant = st;
    if (!activo) {
      this.a56 = 0;
      this.a58 = 0;
      this.bandera = false;
      this.desp.set(0, 0, 0);
      return false;
    }
    let bloquea = false, quiere = false;
    if (st) {
      if (press & 2) this.a56 = 8;
      if (press & 1) this.a56 = 4;
      if (rel & 2) this.a56 = 4;
      if (rel & 1) this.a56 = 8;
      if (!this.bandera) {
        this.a58 = 8;
        this.bandera = true;
      } else if (this.a56 & 12) quiere = true;
      bloquea = true;
    } else if (this.a58 > 0) {
      if (--this.a58 === 0) this.bandera = false; else bloquea = true;
    }
    this.obj.set(0, 0, 0);
    if (quiere) {
      const izq = this.a56 & 4, d = new THREE.Vector3(Math.cos(rumbo), 0, -Math.sin(rumbo));
      if (izq) d.negate();
      const h = pared ? pared(ojo, d, 1.28) : null, largo = (h != null && h < 1.28 ? h : 1.28) - .45;
      if (largo > 0) this.obj.copy(d).multiplyScalar(largo);
    }
    for (const k of [ "x", "y", "z" ]) {
      const dd = this.obj[k] - this.desp[k];
      this.desp[k] = Math.abs(dd) < .004 ? this.obj[k] : this.desp[k] + dd / 4;
    }
    return bloquea;
  }
  update(dt, o) {
    this.acum += dt;
    let n = 0;
    while (this.acum >= 1 / FPS && n < 4) {
      this.acum -= 1 / FPS;
      this.bloquea = this.cuadro(o);
      n++;
    }
    if (n === 4) this.acum = 0;
    if (!o.activo) {
      this.bloquea = this.cuadro(o);
    }
    return {
      desp: this.desp,
      bloquea: !!this.bloquea
    };
  }
}

export const asomarse = new Asomarse;

const _caras = new Map;

export async function carasPS1(root, url) {
  const m = /^((?:niveles|vr\/disco|vr)\/(?!comun\/)[^/]+)\/([^/]+)\.glb$/.exec(url || "");
  if (!m || !root) return false;
  if (!_caras.has(m[1])) _caras.set(m[1], fetch(`assets/${m[1]}/caras.json`).then(r => r.ok ? r.json() : null).catch(() => null));
  const d = (await _caras.get(m[1]))?.[m[2]];
  if (!d) return false;
  const mallas = [];
  root.traverse(o => {
    if (o.isMesh && !o.isSkinnedMesh) mallas.push(o);
  });
  if (mallas.length !== d.primitivas) return false;
  const dobles = new Set(d.dobles);
  mallas.forEach((o, i) => {
    for (const mt of [].concat(o.material)) mt.side = dobles.has(i) ? THREE.DoubleSide : THREE.BackSide;
  });
  return true;
}
