// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { dibujarCreditos, dibujarTelop } from "./telops.js";

import { telopsGuion } from "./texturas_idioma.js";

import { ActoresExtra } from "./actores_extra.js";

import * as ctl from "./controles.js";

const MM = .001, ANG = Math.PI * 2 / 4096, FPS = 30;

const v3 = p => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);

const H = {
  ENTRA: 3538,
  SALE: 54732,
  SNAKE: 8650,
  TODOS: 5321,
  KILL: 12835,
  LLAMAR: 4639,
  PANEL: 36188,
  AVISO_PUERTA: 34193,
  SALIR_MENU: 25941,
  LLEGA: 11947,
  TEXTURA: 48338
};

const LAMPARA = {
  ON: 3662,
  PROGRAMA: 48338,
  VERDE: 18552,
  ROJA: 3695
};

const SE_ASC = {
  PARA: 113,
  CAMPANA: 112,
  VENTANA: 21,
  CURSOR: 31,
  BOTON: 96
};

export function trampasDePuertas(script, nombres = null) {
  const res = new Map;
  if (!script) return res;
  const procs = new Map(Object.entries(script.procs || {}).map(([k, v]) => [ parseInt(k, 16), v ]));
  const zonas = new Map(Object.entries(script.zonas || {}).map(([k, v]) => [ +k, v ]));
  const EV = {
    ev: true
  };
  const val = (x, args) => x && typeof x === "object" && x.arg != null ? args?.[x.arg - 1] : x;
  const idDe = x => x && typeof x === "object" ? x.id ?? null : typeof x === "number" ? x : null;
  const anotar = (puerta, trap) => {
    const z = zonas.get(trap.zona);
    if (!z?.length) return;
    let l = res.get(puerta);
    if (!l) res.set(puerta, l = []);
    if (l.some(t => t.zona === trap.zona && t.chara === trap.chara)) return;
    l.push({
      zona: trap.zona,
      chara: trap.chara,
      cajas: z.map(c => ({
        min: new THREE.Vector3(Math.min(c[0][0], c[1][0]) * MM, Math.min(c[0][1], c[1][1]) * MM, Math.min(c[0][2], c[1][2]) * MM),
        max: new THREE.Vector3(Math.max(c[0][0], c[1][0]) * MM, Math.max(c[0][1], c[1][1]) * MM, Math.max(c[0][2], c[1][2]) * MM)
      }))
    });
  };
  const hechos = new Set;
  const firma = (args, trap) => (trap ? trap.zona + ":" + trap.chara : "-") + "|" + (args || []).map(x => x === EV ? "EV" : x && typeof x === "object" ? JSON.stringify(x) : String(x)).join(",");
  const visitar = (b, args, trap, prof) => {
    if (prof > 8 || !Array.isArray(b)) return;
    for (const s of b) {
      if (!s || typeof s !== "object") continue;
      if (s.cmd === "mesg" && trap && s.args?.length >= 2) {
        const d = idDe(val(s.args[0], args)), e = val(s.args[1], args);
        if (d != null && (!nombres || nombres.has(d)) && (e === EV || idDe(e) === H.ENTRA)) anotar(d, trap);
      }
      if ("call" in s) {
        const sub = procs.get(s.call), a2 = (s.args || []).map(x => val(x, args)), k = s.call + "#" + firma(a2, trap);
        if (sub && !hechos.has(k)) {
          hechos.add(k);
          visitar(sub, a2, trap, prof + 1);
        }
      }
      let t2 = trap, a2 = args;
      if (s.cmd === "trap" || s.cmd === "ntrap") {
        const pos = (s.args || []).filter(x => !(x && typeof x === "object" && ("opt" in x || "bloque" in x)));
        const ch = idDe(pos[1]);
        t2 = {
          zona: idDe(pos[0]),
          chara: ch === H.TODOS ? 0 : ch ?? 0
        };
        a2 = [ t2.zona, t2.chara, EV, 0, 0, 0, 0 ];
        const llamar = pid => {
          const k = pid + "#" + firma(a2, t2);
          if (procs.get(pid) && !hechos.has(k)) {
            hechos.add(k);
            visitar(procs.get(pid), a2, t2, prof + 1);
          }
        };
        for (const x of s.args || []) {
          if (x?.opt === "p" || x?.opt === "e") for (const v of x.v || []) if (v?.proc != null) llamar(v.proc);
          if (x?.proc != null) llamar(x.proc);
        }
      }
      for (const x of s.args || []) {
        if (x?.bloque) visitar(x.bloque, a2, t2, prof);
        if (x?.opt) for (const v of x.v || []) if (v?.bloque) visitar(v.bloque, a2, t2, prof);
      }
    }
  };
  visitar(script.main, [], null, 0);
  for (const [pid, b] of procs) {
    const k = pid + "#" + firma([], null);
    if (!hechos.has(k)) {
      hechos.add(k);
      visitar(b, [], null, 0);
    }
  }
  return res;
}

let llegadaAscensor = null;

let menuAscensor = null;

const TECLAS_ASC = {
  ArrowUp: "arriba",
  KeyW: "arriba",
  ArrowDown: "abajo",
  KeyS: "abajo",
  Enter: "circulo",
  NumpadEnter: "circulo",
  Space: "circulo",
  KeyE: "circulo",
  KeyG: "circulo",
  Escape: "cruz",
  Backspace: "cruz",
  KeyC: "cruz",
  KeyX: "cruz"
};

if (typeof window !== "undefined") {
  addEventListener("keydown", e => {
    if (!menuAscensor) return;
    const b = TECLAS_ASC[e.code];
    if (b) {
      e.preventDefault();
      if (!e.repeat) menuAscensor._boton(b, true);
    }
    if (e.code !== "Tab") e.stopImmediatePropagation();
  }, true);
  addEventListener("keyup", e => {
    if (!menuAscensor) return;
    const b = TECLAS_ASC[e.code];
    if (b) menuAscensor._boton(b, false);
    if (e.code !== "Tab") e.stopImmediatePropagation();
  }, true);
}

export class Dinamicos {
  constructor({scene: scene, mundo: mundo, cam: cam, paredes: paredes, sonido: sonido}) {
    this.scene = scene;
    this.mundo = mundo;
    this.cam = cam;
    this.sonido = sonido || (() => {});
    this.paredes = paredes;
    this.puertas = [];
    this.elevadores = [];
    this.agenda = [];
    this.t = 0;
    this.ascensores = [];
    this.cielo = null;
    this.nieve = null;
    this.correrProc = null;
    this.alerta = null;
    this.extras = new ActoresExtra(this);
  }
  async paredRompible(o, a, cargar) {
    const op = a.opts || {}, num = (k, d) => typeof op[k]?.[0] === "number" ? op[k][0] : d;
    const st = /niveles\/([^/]+)\//.exec(a.modelo || "")?.[1], idRoto = op.m?.[1]?.id;
    o.updateMatrixWorld(true);
    const inv = (new THREE.Matrix4).copy(o.matrixWorld).invert(), caja = new THREE.Box3, tmp = new THREE.Box3;
    o.traverse(m => {
      if (m.isMesh) {
        m.geometry.computeBoundingBox();
        tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        caja.union(tmp);
      }
    });
    const W = {
      o: o,
      a: a,
      roto: false,
      pared: null,
      centro: new THREE.Vector3,
      idRoto: idRoto,
      st: st,
      se: num("c", 185),
      proc: op.e?.[0]?.proc ?? null
    };
    if (!caja.isEmpty()) {
      const largo = Math.max(.1, caja.max.x - caja.min.x), alto = Math.max(.5, caja.max.y - caja.min.y);
      const p = new THREE.Mesh(new THREE.BoxGeometry(largo, alto, .12), new THREE.MeshBasicMaterial({
        visible: false
      }));
      p.position.set((caja.min.x + caja.max.x) / 2, (caja.min.y + caja.max.y) / 2, 0);
      p.userData.propio = p.userData.sinColision = true;
      o.add(p);
      W.pared = p;
      W.centro.set((caja.min.x + caja.max.x) / 2, 1, 0).applyMatrix4(o.matrixWorld);
    } else o.getWorldPosition(W.centro);
    this.rompibles = this.rompibles || [];
    this.rompibles.push(W);
    this._cargarGlb = cargar;
    if (num("f", 0)) await this.romperPared(W, false); else if (W.pared) this.paredes.push(W.pared);
    return W;
  }
  explosion(p, arma) {
    this.extras?.explosion(p, arma);
    const L = this.lampara;
    if (L && L.fase === 0) {
      const d = L.blanco;
      if (Math.abs(d.x - p.x) <= 2.005 && Math.abs(d.y - p.y) <= 2.005 && Math.abs(d.z - p.z) <= 2.005) {
        L.fase = 1;
        L.i = 0;
        this.sonido(177, d);
      }
    }
    if (!(arma === 6 || arma === 4) || !this.rompibles) return 0;
    let n = 0;
    for (const W of this.rompibles) {
      if (W.roto) continue;
      const d = W.centro, dx = Math.abs(d.x - p.x), dy = Math.abs(d.y - p.y), dz = Math.abs(d.z - p.z), r = 2 + .1;
      if (dx <= r && dy <= r && dz <= r) {
        this.romperPared(W, true);
        n++;
      }
    }
    return n;
  }
  async romperPared(W, conProc) {
    if (W.roto) return;
    W.roto = true;
    if (W.pared) {
      const i = this.paredes.indexOf(W.pared);
      if (i >= 0) this.paredes.splice(i, 1);
      W.pared.removeFromParent();
    }
    if (conProc) this.sonido(W.se, W.centro);
    let roto = null;
    if (W.idRoto != null && W.st && this._cargarGlb) {
      try {
        roto = await this._cargarGlb(`niveles/${W.st}/${W.idRoto.toString(16).padStart(4, "0")}.glb`);
      } catch {}
    }
    for (const c of [ ...W.o.children ]) if (c !== W.pared) c.visible = false;
    if (roto) W.o.add(roto);
    if (conProc && W.proc != null && this.correrProc) {
      try {
        this.correrProc(W.proc, []);
      } catch (e) {
        console.warn("nivel: -e de la pared", e);
      }
    }
    this.alCambiarParedes?.();
  }
  persiana(o, a, op = {}) {
    const ops = a.opts || {}, num = (k, d) => typeof ops[k]?.[0] === "number" ? ops[k][0] : d;
    o.updateMatrixWorld(true);
    const inv = (new THREE.Matrix4).copy(o.matrixWorld).invert(), caja = new THREE.Box3, tmp = new THREE.Box3;
    o.traverse(m => {
      if (m.isMesh) {
        m.geometry.computeBoundingBox();
        tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        caja.union(tmp);
      }
    });
    if (caja.isEmpty()) return null;
    const t = caja.getSize(new THREE.Vector3), c = caja.getCenter(new THREE.Vector3);
    const alerta = !!num("a", 0), altoHzd = Math.round(t.y / MM);
    const hSeg = Math.max(.3, t.y - (alerta ? .25 : 0));
    const pared = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.1, t.x), hSeg, Math.max(.12, t.z)), new THREE.MeshBasicMaterial({
      visible: false
    }));
    pared.position.set(c.x, caja.min.y + hSeg / 2, c.z);
    pared.userData.propio = pared.userData.sinColision = true;
    o.add(pared);
    const max = num("h", 0) || altoHzd, arriba = !!num("o", 0);
    const P = {
      o: o,
      a: a,
      nombre: a.nombre,
      base: o.position.y,
      max: max,
      nivel: arriba ? max : 0,
      vel: num("s", 20),
      abierta: arriba ? 1 : 0,
      espera: 0,
      moviendo: false,
      tSon: 0,
      acum: 0,
      alerta: alerta,
      cola: [],
      pared: pared,
      op: op,
      resolver: true,
      st: /niveles\/([^/]+)\//.exec(a.modelo || "")?.[1],
      procs: [ ops.e?.[0]?.proc ?? null, ops.e?.[1]?.proc ?? null ],
      centro: c.clone().applyMatrix4(o.matrixWorld)
    };
    this.persianas = this.persianas || [];
    this.persianas.push(P);
    this.paredes.push(pared);
    this._ponerPersiana(P);
    this._pedirTrampas(a);
    return P;
  }
  _ponerPersiana(P) {
    P.o.position.y = P.base + P.nivel * MM;
  }
  lamparaPiloto(a) {
    this.lampara = {
      a: a,
      nombre: a.nombre,
      blanco: new THREE.Vector3(-4.8, 1.47, -13.8),
      fase: 0,
      i: 0,
      acum: 0,
      proc: a.opts?.e?.[0]?.proc ?? null
    };
    return this.lampara;
  }
  danoElectrico(a, op = {}) {
    const ops = a.opts || {}, num = (k, d) => typeof ops[k]?.[0] === "number" ? ops[k][0] : d;
    const D = {
      nombre: a.nombre,
      suma: num("s", 0),
      cuadros: num("c", 0),
      proc: ops.e?.[0]?.proc ?? null,
      resto: 0,
      quedan: 0,
      acum: 0,
      op: op
    };
    (this.electricos ||= []).push(D);
    return D;
  }
  _cuadroElectrico(D) {
    const s = D.resto + D.suma, v = Math.max(0, (D.op.vida?.() ?? 0) - (s >> 8));
    D.resto = s & 255;
    D.op.setVida?.(v);
    if (--D.quedan === 0 && D.proc != null && this.correrProc) {
      try {
        this.correrProc(D.proc, [ v <= 0 ? 6773 : 63834 ]);
      } catch (e) {
        console.warn("nivel: -e de ELECDAMAGE", e);
      }
    }
  }
  _cuadroLampara(L) {
    if (L.fase === 1) {
      const i = L.i++;
      if (i < 80) {
        if (i === 70 && L.proc != null && this.correrProc) {
          try {
            this.correrProc(L.proc, []);
          } catch (e) {
            console.warn("nivel: -e de la PILOTLAMP", e);
          }
        }
      } else if (i < 240 && i % 6 === 0) this.sonido([ 178, 184, 185, 186 ][Math.floor(Math.random() * 4)], L.blanco); else if (i > 170) {
        L.fase = 2;
        L.i = 0;
        this.sonido(181, L.blanco);
        return;
      }
      if (i > 0 && i < 140 && !(i & 3)) this.sonido(179, L.blanco);
    } else if (L.fase === 2 && ++L.i > 100) L.fase = 3;
  }
  _resolverPersiana(P) {
    P.resolver = false;
    const sc = this._script;
    if (!sc) return;
    const buscar = (b, prof = 0) => {
      if (prof > 12 || !Array.isArray(b)) return null;
      for (const s of b) {
        if (!s || typeof s !== "object") continue;
        if (s.cmd === "chara" && s.tipo === "SHUTTER" && (s.args?.[1]?.id ?? s.args?.[1]) === P.nombre) return s;
        for (const x of s.args || []) {
          if (x?.bloque) {
            const r = buscar(x.bloque, prof + 1);
            if (r) return r;
          }
          if (x?.opt && Array.isArray(x.v)) for (const v of x.v) if (v?.bloque) {
            const r = buscar(v.bloque, prof + 1);
            if (r) return r;
          }
        }
      }
      return null;
    };
    let s = buscar(sc.main);
    for (const b of Object.values(sc.procs || {})) {
      if (s) break;
      s = buscar(b);
    }
    const v = s?.args?.find(x => x?.opt === "o")?.v?.[0];
    const o = typeof v === "number" ? v : v && typeof v === "object" && v.var && P.op.leerVar ? P.op.leerVar(v.var) : null;
    if (o == null) return;
    const arriba = o ? 1 : 0;
    if (arriba !== P.abierta && !P.moviendo && !P.cola.length) {
      P.abierta = arriba;
      P.nivel = arriba ? P.max : 0;
      this._ponerPersiana(P);
    }
  }
  _cuadroPersiana(P) {
    const orden = abre => {
      if (P.abierta === (abre ? 0 : 1)) P.moviendo = true;
      P.abierta = abre ? 1 : 0;
      P.espera = 5;
      this.sonido(124, P.centro);
    };
    const f = P.cola.length ? P.cola[P.cola.length - 1] : -1;
    P.cola.length = 0;
    if (f === 0 && P.abierta !== 1) orden(true); else if (f === 1 && P.abierta !== 0) orden(false);
    if (P.alerta) {
      const m = P.op.modoAlerta?.() ?? 0;
      if (m === 1 && P.abierta === 1) orden(false); else if (m === 0 && P.abierta === 0) orden(true);
    }
    if (P.espera > 0) {
      P.espera--;
      return;
    }
    const obj = P.abierta ? P.max : 0;
    P.nivel = P.nivel < obj ? Math.min(obj, P.nivel + P.vel) : Math.max(obj, P.nivel - P.vel);
    if (P.nivel === obj && P.moviendo) {
      const pr = P.procs[P.abierta ? 1 : 0];
      if (pr && this.correrProc) {
        try {
          this.correrProc(pr, []);
        } catch (e) {
          console.warn("nivel: -e de la persiana", e);
        }
      }
      this.sonido(110, P.centro);
      P.moviendo = false;
    } else if (P.moviendo) {
      if (++P.tSon >= 14) P.tSon = 0;
      if (P.tSon === 0) this.sonido(111, P.centro);
    }
    this._ponerPersiana(P);
  }
  _lampara(p, msg) {
    if (p.lampara === undefined) {
      const sc = this._script, puerta = p.o?.userData?.actor?.nombre, ex = this.extras;
      if (!sc || puerta == null || !ex) return;
      p.lampara = null;
      const buscar = (x, prof = 0) => {
        if (p.lampara != null || !x || typeof x !== "object" || prof > 40) return;
        if (Array.isArray(x)) {
          for (const y of x) buscar(y, prof + 1);
          return;
        }
        if (x.call != null && Array.isArray(x.args) && x.args.some(v => v?.id === puerta)) {
          for (const v of x.args) if (v?.id != null && v.id !== puerta && ex.porNombre.get(v.id)?.some(l => l.a?.tipo === "TEXTURE")) {
            p.lampara = v.id;
            return;
          }
        }
        for (const v of Object.values(x)) if (v && typeof v === "object") buscar(v, prof + 1);
      };
      buscar(sc.main);
      for (const b of Object.values(sc.procs || {})) buscar(b);
    }
    if (p.lampara != null) this.extras.mensaje(p.lampara, msg);
  }
  puerta(o, a) {
    const op = a.opts || {};
    const num = (k, def) => Array.isArray(op[k]) && typeof op[k][0] === "number" ? op[k][0] : def;
    const w = num("w", 1e3) * MM, vel = num("s", 100) * MM * FPS, hojas = num("t", 1), hParam = num("h", 0);
    const rotY = (a.d ? a.d[1] : 0) * ANG;
    if (hojas === 1 && op.c) {
      const ang = rotY + 3072 * ANG;
      o.position.x += Math.sin(ang) * w / 2;
      o.position.z += Math.cos(ang) * w / 2;
    }
    const huesos = [];
    for (let i = 0; ;i++) {
      const h = o.getObjectByName("hueso_" + i);
      if (!h) break;
      huesos.push(h);
    }
    const mover = [];
    if (huesos.length < 2 * hojas) for (let i = 0; i < Math.min(hojas, huesos.length); i++) mover.push({
      h: huesos[i],
      s: i % 2 ? -1 : 1,
      x: huesos[i].position.x
    }); else for (let i = 0; i < 2 * hojas; i += 2) mover.push({
      h: huesos[i],
      s: i / 2 % 2 ? -1 : 1,
      x: huesos[i].position.x
    });
    o.updateMatrixWorld(true);
    const inv = (new THREE.Matrix4).copy(o.matrixWorld).invert(), caja = new THREE.Box3, tmp = new THREE.Box3;
    o.traverse(m => {
      if (m.isMesh) {
        m.geometry.computeBoundingBox();
        tmp.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
        caja.union(tmp);
      }
    });
    let pared = null;
    if (!caja.isEmpty() && hParam >= 0) {
      const t = caja.getSize(new THREE.Vector3), c = caja.getCenter(new THREE.Vector3);
      t.x = Math.max(t.x, .15);
      t.z = Math.max(t.z, .15);
      t.y = Math.max(t.y, 2.2);
      pared = new THREE.Mesh(new THREE.BoxGeometry(t.x, t.y, t.z), new THREE.MeshBasicMaterial({
        visible: false
      }));
      pared.position.copy(c);
      pared.userData.propio = pared.userData.sinColision = true;
      o.add(pared);
    }
    const abierta = !!op.o;
    const p = {
      o: o,
      w: w,
      vel: vel,
      mover: mover,
      pared: pared,
      abierto: abierta ? w : 0,
      centro: new THREE.Vector3,
      cerrada: true,
      nombre: a.nombre,
      mapa: a.mapa ?? 0,
      contador: abierta ? 1 : 0,
      forzada: abierta ? "abierta" : null,
      quiere: abierta,
      vano: (Math.max(hParam, 250) + 50) * MM,
      son: Array.isArray(op.e) && typeof op.e[0] === "number" ? [ op.e[0] | 0, (op.e[1] ?? 0) | 0 ] : null,
      procF: op.f?.[0]?.proc ?? null,
      trampas: undefined
    };
    o.getWorldPosition(p.centro);
    if (pared && caja.getSize(new THREE.Vector3).y > 0) p.centro.y = o.position.y;
    if (!pared) p.centro.y = o.position.y;
    this.puertas.push(p);
    this.ponerPuerta(p);
    this._pedirTrampas(a);
    return p;
  }
  _pedirTrampas(a) {
    const st = /niveles\/([^/]+)\//.exec(a.modelo || "")?.[1];
    if (!st || this._trampasSt === st) return;
    this._trampasSt = st;
    this._trampas = null;
    const pedido = this._pedidoTrampas = fetch(`assets/guion/st/${st}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    pedido.then(sc => {
      if (this._pedidoTrampas !== pedido) return;
      this._script = sc;
      this._scriptSt = st;
      this._trampas = trampasDePuertas(sc);
      for (const p of this.puertas) p.trampas = this._trampas.get(p.nombre) || [];
    });
  }
  _enTrampa(p, q, quien) {
    if (!p.trampas?.length) {
      if (p.trampas === undefined && this._trampas) p.trampas = this._trampas.get(p.nombre) || [];
      return Math.hypot(q.x - p.centro.x, q.z - p.centro.z) < Math.max(1.8, p.w * 1.2) && Math.abs(q.y - p.centro.y) < 2.5;
    }
    const x = q.x, y = q.y + .3, z = q.z;
    for (const t of p.trampas) {
      if (t.chara && t.chara !== quien) continue;
      for (const c of t.cajas) if (x >= c.min.x && x < c.max.x && y >= c.min.y && y < c.max.y && z >= c.min.z && z < c.max.z) return true;
    }
    return false;
  }
  _enVano(p, q) {
    const dy = q.y - p.centro.y;
    return Math.abs(q.x - p.centro.x) <= p.vano && Math.abs(q.z - p.centro.z) <= p.vano && dy >= -.05 && dy <= 2.5;
  }
  mensajePuerta(nombre, ev) {
    let n = 0;
    for (const p of this.puertas) {
      if (p.nombre !== nombre) continue;
      p.contador = Math.max(0, (p.contador || 0) + (ev === H.ENTRA ? 1 : -1));
      p.forzada = p.contador > 0 ? "abierta" : null;
      n++;
    }
    return n;
  }
  _avisoPuerta(p, ev, quien) {
    if (p.procF != null && this.correrProc) {
      try {
        this.correrProc(p.procF, [ ev, quien || 0, p.mapa ]);
      } catch (e) {
        console.warn("nivel: -f de la puerta", e);
      }
    }
    for (const E of this.ascensores) if (E.puerta === p.nombre) E.cola.push([ H.AVISO_PUERTA, ev ]);
  }
  ponerPuerta(p) {
    for (const m of p.mover) m.h.position.x = m.x + m.s * p.abierto;
    const cerrada = p.abierto < p.w * .6;
    if (p.pared && cerrada !== p.cerrada) {
      const i = this.paredes.indexOf(p.pared);
      if (cerrada && i < 0) this.paredes.push(p.pared);
      if (!cerrada && i >= 0) this.paredes.splice(i, 1);
    }
    if (p.pared && p.cerrada === true && cerrada && !this.paredes.includes(p.pared)) this.paredes.push(p.pared);
    p.cerrada = cerrada;
  }
  elevador(o, a, guardia, alSoltar) {
    const el = a.elevador;
    if (!el) return null;
    const s = v3(el.s), e = v3(el.e), dur = Math.max(1, el.c / FPS);
    const E = {
      o: o,
      s: s,
      e: e,
      dur: dur,
      f: el.c ? el.i / el.c : 0,
      destino: null,
      espera: 0,
      guardia: guardia,
      alSoltar: alSoltar,
      piso: o.position.clone(),
      mask: el.x ?? 7,
      snd: el.snd || [ 184, 185, 186 ],
      per: (el.per || 8) / FPS
    };
    E.f = Math.min(1, Math.max(0, E.f));
    if (guardia) {
      E.destino = E.f > .5 ? 0 : 1;
      E.espera = 1.5;
    } else this._arranqueFiel(E, a);
    this.elevadores.push(E);
    this.ponerElevador(E);
    return E;
  }
  _arranqueFiel(E, a) {
    const o = a.opts || {}, i = (o.i || []).find(x => typeof x === "number"), w = o.w?.[0];
    E.fiel = true;
    E.porGuion = true;
    E.conBaranda = !!o.f?.length;
    E.lleva = w && typeof w === "object" ? w.id : typeof w === "number" ? w : null;
    E.bajada = -1.5;
    if (i == null) {
      E.f = 0;
      E.aviso = 60856;
      return;
    }
    if (i < 0) {
      if (E.f <= 0) {
        E.aviso = 60856;
        return;
      }
      E.destino = 0;
    } else {
      if (E.f >= 1) {
        E.aviso = 44479;
        return;
      }
      E.destino = 1;
    }
    E.andando = true;
    E.tPausa = 0;
    E.tSon = E.per;
    E.bajada = 0;
  }
  _elevadorFiel(E, dt, jugador) {
    if (E.aviso) {
      const h = E.aviso;
      E.aviso = 0;
      E.lleva = null;
      this.alElevador?.(E, h);
    }
    if (E.o2) {
      const meta = E.destino === null || E.tLlegada != null ? -1.5 : 0;
      for (let k = Math.max(1, Math.round(dt * FPS)); k > 0; k--) {
        const d = meta - E.bajada;
        E.bajada = Math.abs(d) < .004 ? meta : E.bajada + d / 4;
      }
      E.o2.position.set(E.o.position.x, E.o.position.y + E.bajada, E.o.position.z);
      E.o2.visible = E.bajada >= -1;
    }
    if (E.destino === null) return;
    const haciaE = E.destino === 1, bit = k => (E.mask & k) !== 0;
    if (!E.andando) {
      E.andando = true;
      E.tPausa = E.conBaranda ? 40 / FPS : 1 / FPS;
      E.tLlegada = null;
      this.alElevador?.(E, haciaE ? 13854 : 63012);
    }
    if (E.tPausa > 0) {
      E.tPausa -= dt;
      if (E.tPausa > 0) return;
      if (bit(haciaE ? 4 : 32)) this.sonido(E.snd[2], E.o.position);
      E.tSon = E.per;
    }
    if (E.tLlegada == null) {
      if ((E.tSon -= dt) <= 0) {
        E.tSon += E.per;
        if (bit(haciaE ? 8 : 1)) this.sonido(E.snd[0], E.o.position);
      }
      const antes = E.o.position.clone(), paso = dt / E.dur;
      E.f = Math.abs(E.destino - E.f) <= paso ? E.destino : E.f + Math.sign(E.destino - E.f) * paso;
      this.ponerElevador(E);
      if (jugador) {
        const d = E.o.position.clone().sub(antes);
        if (E.lleva === H.SNAKE) jugador.add(d); else if (this.sobreElevador(E, {
          x: jugador.x,
          y: jugador.y - d.y,
          z: jugador.z
        })) jugador.y += d.y;
      }
      if (E.f === E.destino) {
        if (bit(haciaE ? 16 : 2)) this.sonido(E.snd[1], E.o.position);
        E.tLlegada = E.conBaranda ? 24 / FPS : 1 / FPS;
      }
      return;
    }
    if ((E.tLlegada -= dt) > 0) return;
    E.destino = null;
    E.andando = false;
    E.lleva = null;
    E.tLlegada = null;
    this.alElevador?.(E, haciaE ? 44479 : 60856);
  }
  ponerElevador(E) {
    E.o.position.lerpVectors(E.s, E.e, E.f);
    E.o.updateMatrixWorld(true);
    if (E.guardia) E.guardia.o.position.set(E.o.position.x, E.o.position.y + (E.alto || 0), E.o.position.z);
  }
  sobreElevador(E, p) {
    if (E.area === undefined) {
      const c = (new THREE.Box3).setFromObject(E.o), q = E.o.position;
      E.area = c.isEmpty() ? null : {
        x0: c.min.x - q.x - .1,
        x1: c.max.x - q.x + .1,
        z0: c.min.z - q.z - .1,
        z1: c.max.z - q.z + .1
      };
    }
    const dx = p.x - E.o.position.x, dz = p.z - E.o.position.z, A = E.area;
    const dentro = A ? dx >= A.x0 && dx <= A.x1 && dz >= A.z0 && dz <= A.z1 : Math.abs(dx) < 1.2 && Math.abs(dz) < 1.2;
    return dentro && Math.abs(p.y - E.o.position.y) < 1;
  }
  baliza(grupoGiro, conos, son = 181, nombre = null) {
    (this.balizas = this.balizas || []).push({
      g: grupoGiro,
      conos: conos,
      son: son,
      t: 0,
      nombre: nombre,
      msg: null,
      se: true
    });
    conos.forEach(c => c.visible = false);
  }
  ponerCielo(c, textura) {
    const R = 900, N = 64, alto = c.alto, horiz = alto / 2 - c.y;
    const pos = [], uv = [], idx = [];
    for (let k = 0; k <= N; k++) {
      const th = k / N * Math.PI * 2, x = Math.sin(th) * R, z = Math.cos(th) * R;
      for (const [r, v] of [ [ 0, 1 ], [ alto, 0 ] ]) {
        pos.push(x, R * (horiz - r) / 285, z);
        uv.push(1 - k / N, v);
      }
    }
    for (let k = 0; k < N; k++) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.wrapS = THREE.RepeatWrapping;
    textura.magFilter = THREE.LinearFilter;
    const col = (new THREE.Color).setRGB(...(c.c && c.c.length === 3 ? c.c : [ 128, 128, 128 ]).map(x => Math.min(2, x / 128)), THREE.SRGBColorSpace);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      map: textura,
      color: col,
      side: THREE.DoubleSide,
      alphaTest: .5,
      depthWrite: false,
      fog: false
    }));
    m.renderOrder = -10;
    m.frustumCulled = false;
    m.userData.propio = m.userData.sinColision = true;
    m.userData.vel = c.vel ? FPS / Math.abs(c.vel) / c.ancho * Math.sign(c.vel) : 0;
    this.scene.add(m);
    this.cielo = m;
  }
  ponerNieve(a) {
    const op = a.opts || {}, n3 = (k, d) => Array.isArray(op[k]) && op[k].length >= 3 && op[k].every(x => typeof x === "number") ? op[k].slice(0, 3) : d;
    const n = Math.min(1200, op.n && op.n[0] || 256);
    const N = {
      min: v3(n3("l", [ -5e3, 0, -1e4 ])),
      max: v3(n3("h", [ 5e3, 8e3, 1e4 ])),
      s: n3("s", [ 0, -50, 0 ]),
      w: n3("w", [ 0, 0, 0 ]),
      lejos: (op.c && op.c[0] || 0) * MM,
      fija: a.tipo === "SNOWAREA",
      n: n
    };
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const ext = N.max.clone().sub(N.min);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = N.min.x + Math.random() * ext.x;
      pos[i * 3 + 1] = N.min.y + Math.random() * ext.y;
      pos[i * 3 + 2] = N.min.z + Math.random() * ext.z;
      for (let k = 0; k < 3; k++) vel[i * 3 + k] = (N.s[k] + Math.random() * N.w[k]) * MM * FPS;
      const sh = .5 + Math.random() * .5;
      col[i * 3] = sh / 2;
      col[i * 3 + 1] = sh / 2;
      col[i * 3 + 2] = sh;
      col[i * 3] = col[i * 3 + 1] = .55 + sh * .4;
      col[i * 3 + 2] = .75 + sh * .25;
    }
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
      size: 2.2,
      sizeAttenuation: false,
      vertexColors: true,
      depthWrite: false,
      fog: false
    }));
    pts.frustumCulled = false;
    pts.userData.propio = pts.userData.sinColision = true;
    N.pts = pts;
    N.vel = vel;
    N.ext = ext;
    N.centro = new THREE.Vector3;
    this.scene.add(pts);
    this.nieve = N;
  }
  temblar(obj, eje, escala, nombre = null) {
    const fases = Array.from({
      length: 16
    }, () => Math.random() * 4096), vel = Array.from({
      length: 16
    }, () => 16 + Math.random() * 64);
    const mallas = [];
    obj.traverse(m => {
      if (!m.isMesh) return;
      m.geometry = m.geometry.clone();
      const P = m.geometry.attributes.position, base = Float32Array.from(P.array), grupo = new Uint8Array(P.count);
      for (let i = 0; i < P.count; i++) {
        const x = Math.round(base[i * 3] * 1e3), y = Math.round(base[i * 3 + 1] * 1e3), z = Math.round(base[i * 3 + 2] * 1e3);
        grupo[i] = (x * 73856093 ^ y * 19349663 ^ z * 83492791) & 15;
      }
      m.frustumCulled = false;
      mallas.push({
        m: m,
        P: P,
        base: base,
        grupo: grupo
      });
    });
    this.temblores = this.temblores || [];
    this.temblores.push({
      mallas: mallas,
      fases: fases,
      vel: vel,
      eje: Math.max(0, Math.min(2, eje | 0)),
      escala: escala * MM,
      nombre: nombre,
      objetivo: null,
      paso: 0,
      acum: 0,
      quieto: false
    });
  }
  onda(x, y, z, escala = 4096) {
    if (!this.ondas) {
      this.ondas = [];
      const g = new THREE.RingGeometry(.832, 1, 32, 1);
      g.rotateX(-Math.PI / 2);
      for (let i = 0; i < 24; i++) {
        const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
          color: 16777215,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false
        }));
        m.visible = false;
        m.renderOrder = 2;
        m.userData.propio = m.userData.sinColision = true;
        this.scene.add(m);
        this.ondas.push({
          m: m,
          t: 0
        });
      }
    }
    const o = this.ondas.find(q => !q.m.visible) || this.ondas[0];
    o.m.position.set(x, y + .01, z);
    o.t = 64;
    o.r = 2.1 * escala / 4096;
    o.m.visible = true;
  }
  goteo(a) {
    const op = a.opts || {}, n = (k, d) => Array.isArray(op[k]) && typeof op[k][0] === "number" ? op[k][0] : d;
    if (!a.p) return;
    (this.goteos = this.goteos || []).push({
      p: v3(a.p),
      i: n("i", 90),
      r: n("r", 0),
      s: n("s", 4096),
      t: Math.random() * n("i", 90)
    });
  }
  superficie(a) {
    const p = (a.opts || {}).p;
    if (!p || p.length < 6) return;
    const A = v3(p.slice(0, 3)), B = v3(p.slice(3, 6)), h = (a.opts.h?.[0] ?? (p[1] + p[4]) / 2) * MM;
    (this.superficies = this.superficies || []).push({
      min: A.clone().min(B),
      max: A.clone().max(B),
      h: h,
      s: a.opts.s?.[0] ?? 4096,
      quien: new Map
    });
  }
  telop(lineas) {
    if (!this.lineas) this.lineas = [];
    for (const l of telopsGuion(lineas)) {
      const img = new Image;
      img.src = "assets/" + l.img;
      this.lineas.push({
        ...l,
        src: l.img,
        img: img,
        t0: this.t + l.espera / FPS
      });
    }
  }
  dibujarTelop() {
    if (!this.lineas) return;
    this.lineas = this.lineas.filter(l => this.t < l.t0 + (l.dur + 16) / FPS);
    if (!this.lineas.length && !this.cvTelop) return;
    const vr = this._telopVR ||= {
      cv: null,
      ver: 0,
      hay: false
    };
    const K = 4, xv = this.lineas.length ? (vr.cv ||= Object.assign(document.createElement("canvas"), {
      width: 320 * K,
      height: 240 * K
    })).getContext("2d") : null;
    if (xv) xv.clearRect(0, 0, 320 * K, 240 * K);
    let hay = false;
    for (const l of this.lineas) {
      const f = (this.t - l.t0) * FPS;
      l.a = 0;
      if (f < 0) continue;
      const a = f < 16 ? f / 16 : f < l.dur ? 1 : Math.max(0, 1 - (f - l.dur) / 16);
      l.a = a;
      if (xv && a > 0 && dibujarTelop(xv, l.src, {
        x: l.x * K,
        y: l.y * K,
        kx: K,
        ky: K,
        alfa: a,
        img: l.img,
        sinIdioma: l.sinIdioma
      })) hay = true;
    }
    this.cvTelop = dibujarCreditos(this.cvTelop, this.lineas);
    if (hay || vr.hay) vr.ver++;
    vr.hay = hay;
  }
  get telopVR() {
    const vr = this._telopVR;
    return vr ? {
      visible: vr.hay,
      lienzo: vr.cv,
      firma: () => vr.ver
    } : null;
  }
  update(dt, {jugador: jugador, guardias: guardias, vivo: vivo}) {
    this.t += dt;
    while (this.agenda.length && this.agenda[0].t <= this.t) this.agenda.shift().fn();
    this.extras?.update(dt, {
      jugador: jugador
    });
    for (const p of this.puertas) {
      let quien = 0;
      const deja = snake => this.puedeAbrir ? this.puedeAbrir(p, snake) : true;
      const snakeAdentro = !!jugador && this._enTrampa(p, jugador, H.SNAKE);
      if (snakeAdentro && deja(true)) quien = H.SNAKE; else if (snakeAdentro && !p.negada && (p.zumbo || !this.puedeAbrir)) {
        p.negada = true;
        this._lampara(p, [ LAMPARA.PROGRAMA, 97 ]);
      }
      if (!snakeAdentro) p.negada = false;
      if (!quien && guardias) for (const g of guardias) if (vivo(g) && this._enTrampa(p, g.o.position, g.nombre ?? -1) && deja(false)) {
        quien = g.nombre || 1;
        break;
      }
      const quiere = !!quien || p.forzada === "abierta";
      if (quiere !== p.quiere) {
        p.quiere = quiere;
        if (p.son?.[0] && (!quiere || p.abierto <= 0)) this.sonido(p.son[0], p.centro);
        if (quiere) {
          p.quien = quien || H.SNAKE;
          this._avisoPuerta(p, H.ENTRA, p.quien);
        }
        this._lampara(p, [ LAMPARA.ON, quiere ? LAMPARA.VERDE : LAMPARA.ROJA ]);
      }
      const obj = quiere ? p.w : jugador && p.abierto > 0 && this._enVano(p, jugador) ? Math.max(0, p.w - .002) : 0;
      if (p.abierto !== obj) {
        const paso = p.vel * dt, antes = p.abierto;
        p.abierto = Math.abs(obj - p.abierto) <= paso ? obj : p.abierto + Math.sign(obj - p.abierto) * paso;
        this.ponerPuerta(p);
        if (p.abierto !== antes && (p.abierto === p.w || p.abierto === 0)) {
          if (p.son?.[1]) this.sonido(p.son[1], p.centro);
          if (p.abierto === 0) this._avisoPuerta(p, H.SALE, p.quien);
        }
      }
    }
    for (const E of this.ascensores) this._ascensor(E, dt);
    for (const D of this.electricos || []) {
      if (D.quedan <= 0) {
        D.acum = 0;
        continue;
      }
      D.acum += Math.min(dt, .25) * FPS;
      while (D.acum >= 1 && D.quedan > 0) {
        D.acum -= 1;
        this._cuadroElectrico(D);
      }
    }
    if (this.lampara && this.lampara.fase > 0 && this.lampara.fase < 3) {
      const L = this.lampara;
      L.acum += Math.min(dt, .25) * FPS;
      while (L.acum >= 1) {
        L.acum -= 1;
        this._cuadroLampara(L);
      }
    }
    for (const P of this.persianas || []) {
      if (P.resolver && this._script && this._scriptSt === P.st) {
        this._resolverPersiana(P);
        if (!P.ordenado && (P.tRes = (P.tRes || 0) + dt) < 8) P.resolver = true;
      }
      P.acum += Math.min(dt, .25) * FPS;
      while (P.acum >= 1) {
        P.acum -= 1;
        this._cuadroPersiana(P);
      }
    }
    if (this.elevadores.some(E => !E.o.parent)) {
      for (const E of this.elevadores) if (!E.o.parent) E.o2?.removeFromParent();
      this.elevadores = this.elevadores.filter(E => E.o.parent);
    }
    for (const E of this.elevadores) {
      if (E.fiel) {
        this._elevadorFiel(E, dt, jugador);
        continue;
      }
      const encima = jugador && this.sobreElevador(E, jugador);
      if (E.destino === null) {
        if (encima && !E.porGuion) {
          E.quieto = (E.quieto || 0) + dt;
          if (E.quieto > 1.2) {
            E.destino = E.f > .5 ? 0 : 1;
            E.quieto = 0;
          }
        } else E.quieto = 0;
        continue;
      }
      const subiendo = E.destino === 1;
      const bit = k => (E.mask & k) !== 0;
      if (E.espera > 0) {
        E.espera -= dt;
        if (E.espera > 0) continue;
      }
      if (!E.andando) {
        E.andando = true;
        E.tSon = E.per;
        if (bit(subiendo ? 4 : 32)) this.sonido(E.snd[2], E.o.position);
        this.alElevador?.(E, subiendo ? 13854 : 63012);
      }
      if ((E.tSon -= dt) <= 0) {
        E.tSon += E.per;
        if (bit(subiendo ? 8 : 1)) this.sonido(E.snd[0], E.o.position);
      }
      const antes = E.o.position.y;
      const paso = dt / E.dur;
      E.f = Math.abs(E.destino - E.f) <= paso ? E.destino : E.f + Math.sign(E.destino - E.f) * paso;
      this.ponerElevador(E);
      if (encima) jugador.y += E.o.position.y - antes;
      if (E.f === E.destino) {
        if ((E.mask & (subiendo ? 16 : 2)) !== 0) this.sonido(E.snd[1], E.o.position);
        E.destino = null;
        E.andando = false;
        if (E.guardia) {
          const g = E.guardia;
          E.guardia = null;
          E.alSoltar?.(g);
        }
        this.alElevador?.(E, subiendo ? 44479 : 60856);
      }
    }
    this.dibujarTelop();
    if (this.balizas) {
      const activaE = this.elevadores.some(E => E.destino !== null && !(E.espera > 0));
      for (const B of this.balizas) {
        const activa = B.msg ?? activaE;
        B.conos.forEach(c => c.visible = activa);
        if (activa) {
          B.g.rotation.y += 128 * FPS / 4096 * Math.PI * 2 * dt;
          if ((B.t -= dt) <= 0) {
            B.t = 32 / FPS;
            if (B.se) this.sonido(B.son, null);
          }
        } else B.t = 0;
      }
    }
    for (const g of this.goteos || []) if ((g.t -= dt * FPS) < 0) {
      this.onda(g.p.x, g.p.y, g.p.z, g.s);
      g.t = g.i + (Math.random() - .5) * g.r;
    }
    for (const S of this.superficies || []) {
      const cuerpos = [];
      if (jugador) cuerpos.push([ "yo", jugador ]);
      if (guardias) for (const g of guardias) if (vivo(g)) cuerpos.push([ g, g.o.position ]);
      for (const [k, q] of cuerpos) {
        if (q.x < S.min.x || q.x > S.max.x || q.z < S.min.z || q.z > S.max.z || q.y > S.h + .1 || q.y < S.min.y) continue;
        const st = S.quien.get(k) || {
          t: 0,
          x: q.x,
          z: q.z
        };
        st.t -= dt * FPS;
        const mueve = Math.hypot(q.x - st.x, q.z - st.z) > .002;
        if (st.t <= 0 && (mueve || st.t < -60)) {
          this.onda(q.x, S.h, q.z, S.s);
          st.t = 30;
        }
        st.x = q.x;
        st.z = q.z;
        S.quien.set(k, st);
      }
    }
    for (const o of this.ondas || []) {
      if (!o.m.visible) continue;
      o.t -= dt * FPS;
      if (o.t <= 0) {
        o.m.visible = false;
        continue;
      }
      const k = (80 - o.t) * 32 / 4096 * o.r;
      o.m.scale.set(k, 1, k);
      o.m.material.color.setScalar(Math.max(0, o.t / 2) / 128 * .9);
    }
    for (const T of this.temblores || []) {
      if (T.quieto) continue;
      if (T.objetivo != null) {
        for (T.acum += dt * FPS; T.acum >= 1; T.acum--) {
          const d = T.objetivo - T.escala;
          T.escala = Math.abs(d) <= T.paso ? T.objetivo : T.escala + Math.sign(d) * T.paso;
        }
        if (T.escala === 0 && T.objetivo === 0) {
          T.objetivo = null;
          T.quieto = true;
        }
      }
      const off = T.fases.map(f => Math.sin(f * ANG) * T.escala);
      for (let k = 0; k < 16; k++) T.fases[k] = (T.fases[k] + T.vel[k] * FPS * dt) % 4096;
      for (const {P: P, base: base, grupo: grupo} of T.mallas) {
        const a = P.array;
        for (let i = 0, n = P.count; i < n; i++) a[i * 3 + T.eje] = base[i * 3 + T.eje] + off[grupo[i]];
        P.needsUpdate = true;
      }
    }
    if (this.cielo) {
      this.cam.getWorldPosition(this.cielo.position);
      if (this.cielo.userData.vel) this.cielo.material.map.offset.x += this.cielo.userData.vel * dt;
    }
    const N = this.nieve;
    if (N) {
      if (!N.fija) {
        const f = new THREE.Vector3;
        this.cam.getWorldDirection(f);
        f.y = 0;
        if (f.lengthSq() > 0) f.normalize();
        this.cam.getWorldPosition(N.centro);
        N.centro.addScaledVector(f, N.lejos);
        N.centro.y -= 1.6;
      }
      const P = N.pts.geometry.attributes.position, a = P.array, c = N.centro;
      for (let i = 0; i < N.n; i++) {
        for (let k = 0; k < 3; k++) {
          const mn = N.min.getComponent(k) + c.getComponent(k), ex = N.ext.getComponent(k);
          let v = a[i * 3 + k] + N.vel[i * 3 + k] * dt;
          if (v < mn) v += ex; else if (v > mn + ex) v -= ex;
          a[i * 3 + k] = v;
        }
      }
      P.needsUpdate = true;
    }
  }
  destruir() {
    this.extras?.destruir();
    if (this.cielo) {
      this.scene.remove(this.cielo);
      this.cielo.geometry.dispose();
      this.cielo.material.map?.dispose();
    }
    if (this.nieve) {
      this.scene.remove(this.nieve.pts);
      this.nieve.pts.geometry.dispose();
    }
    this.cvTelop?.remove();
    this.cvTelop = null;
    for (const T of this.temblores || []) for (const {m: m} of T.mallas) m.geometry?.dispose();
    for (const o of this.ondas || []) {
      this.scene.remove(o.m);
      o.m.material.dispose();
    }
    this.ondas?.[0]?.m.geometry.dispose();
    this.ondas = null;
    this.goteos = [];
    this.superficies = [];
    this.puertas = [];
    this.elevadores = [];
    this.agenda = [];
    this.temblores = [];
    this.persianas = [];
    this.lampara = null;
    this.electricos = [];
    if (menuAscensor?.din === this) menuAscensor = null;
    this.ascensores = [];
    this._pedidoTrampas = null;
    this._trampasSt = null;
    this.cvAsc?.remove();
    this.cvAsc = null;
    this.ascensorUI = null;
  }
  mensaje(dest, v, info = {}) {
    let ok = !!this.extras?.mensaje(dest, v);
    for (const D of this.electricos || []) {
      if (D.nombre !== dest || !Array.isArray(v)) continue;
      if (v[0] === 53634) {
        D.resto = 0;
        D.quedan = D.cuadros;
        this.sonido(183, null);
        ok = true;
      } else if (v[0] === 107) ok = true;
    }
    for (const P of this.persianas || []) {
      if (P.nombre !== dest || !Array.isArray(v)) continue;
      const k = v[0] === 16779 ? 0 : v[0] === 14850 ? 1 : -1;
      if (k >= 0) {
        P.cola.push(k);
        P.resolver = false;
        P.ordenado = true;
        ok = true;
      }
    }
    for (const E of this.ascensores) {
      if (E.nombre !== dest) continue;
      ok = true;
      if (!Array.isArray(v) || !v.length) continue;
      if (v[0] === H.AVISO_PUERTA) continue;
      E.cola.push(v.slice());
    }
    return ok;
  }
  panelAscensor(a) {
    const op = a.opts || {};
    if (this.ascensores.some(E => E.nombre === a.nombre)) return null;
    const E = {
      a: a,
      nombre: a.nombre,
      n: Math.max(1, op.n?.[0] ?? 3),
      piso: op.f?.[0] ?? 0,
      puerta: op.r?.[0]?.id ?? null,
      tex: op.t?.[0]?.id ?? null,
      procs: (op.e || []).map(x => x?.proc ?? null),
      rot: Array.isArray(op.c) && typeof op.c[4] === "number" ? op.c[4] : 0,
      st: 0,
      f36: 0,
      f38: 0,
      f42: 0,
      f44: 0,
      sel: 0,
      cola: [],
      acum: 0,
      reloj: 0,
      botones: new Set,
      procHecho: false,
      luzP: true,
      luzL: false,
      panelVis: false,
      luces: null
    };
    E.sel = E.piso;
    this.ascensores.push(E);
    this.extras?.lucesPanel(a).then(L => {
      if (!L) return;
      if (E.muerto) {
        this.extras.matar(L);
        return;
      }
      E.luces = L;
      this._lucesAscensor(E);
    });
    if (llegadaAscensor && performance.now() - llegadaAscensor.t < 6e5) {
      E.cola.push([ H.LLEGA, llegadaAscensor.rot ]);
      llegadaAscensor = null;
    }
    this._uiAscensor();
    return E;
  }
  get bloqueaControl() {
    return this.ascensores.some(E => E.st >= 5 && E.st <= 10);
  }
  _ascensor(E, dt) {
    E.acum += dt;
    let k = 0;
    while (E.acum >= 1 / FPS && k++ < 6) {
      E.acum -= 1 / FPS;
      this._cuadroAscensor(E);
    }
    if (k >= 6) E.acum = 0;
    this._lucesAscensor(E);
    this._leerMandoAscensor(E);
    this._dibujarAscensor();
  }
  _abrirPuertaAsc(E) {
    if (E.puerta != null) this.mensajePuerta(E.puerta, H.ENTRA);
    E.f42 = 2;
    E.f38 = 600;
  }
  _cerrarPuertaAsc(E) {
    if (E.puerta != null) this.mensajePuerta(E.puerta, H.SALE);
    E.f42 = 1;
  }
  _cuadroAscensor(E) {
    E.reloj++;
    let m = 0;
    for (const v of E.cola.splice(0)) {
      const c = v[0];
      if (c === H.KILL) {
        this.ascensores = this.ascensores.filter(x => x !== E);
        if (menuAscensor?.E === E) menuAscensor = null;
        E.muerto = true;
        if (E.luces) this.extras?.matar(E.luces);
        return;
      }
      if (c === H.LLAMAR) {
        m |= 1;
        E.f36 = v.length >= 2 && v[1] === 0 ? -1 : 0;
      } else if (c === H.PANEL) m |= 2; else if (c === H.ENTRA || c === H.SALE) {
        m |= c === H.ENTRA ? 4 : 8;
        m |= v[1] === H.SNAKE ? 256 : 512;
        if (c === H.ENTRA) E.f44++; else E.f44 = Math.max(0, E.f44 - 1);
      } else if (c === H.AVISO_PUERTA) {
        m |= 16 | (v[1] === H.ENTRA ? 4096 : 8192);
      } else if (c === H.SALIR_MENU) m |= 32; else if (c === H.LLEGA) {
        m |= 64;
        if (v.length >= 2) {
          m |= 1024;
          E.rotLlegada = v[1];
        }
      }
    }
    const alerta = !!this.alerta?.();
    const adentro = msg => {
      if ((msg & 260) === 260) {
        E.panelVis = true;
        E.st = 3;
        if (E.f42 === 1) this._abrirPuertaAsc(E);
      }
    };
    switch (E.st) {
     case 0:
      if (m & 1) {
        if (E.f36 < 0) E.f36 = 0; else {
          E.f36 = E.reloj % 6 * 30;
          if ((E.reloj & 7) === 0) E.f36 = 300;
        }
        E.st = 1;
      } else adentro(m);
      if (!(m & 64)) return;
      E.f36 = 25;
      E.st = 9;
      return;

     case 1:
      E.luzP = true;
      E.luzL = true;
      if (E.f36 === 30) this.sonido(SE_ASC.PARA, null);
      if (--E.f36 < 0) {
        if (E.f42 !== 2) this._abrirPuertaAsc(E);
        E.st = 2;
        this.sonido(SE_ASC.CAMPANA, null);
      }
      adentro(m);
      break;

     case 2:
      E.luzP = (E.reloj >> 3 & 1) === 1;
      adentro(m);
      if (alerta) E.f38 = 600;
      if (E.f42 === 0) {
        E.st = 0;
        E.luzP = true;
        E.luzL = false;
        break;
      }
      if (E.f44 < 1) break;
      if (E.f42 === 1) {
        this._abrirPuertaAsc(E);
        if ((m & 8208) === 8208) m &= ~8208;
      } else E.f38 = 600;
      break;

     case 3:
      E.f38 = 100;
      if (m & 2) {
        if (!alerta && E.f44 === 1) {
          E.sel = E.piso;
          E.st = 5;
          this.sonido(SE_ASC.VENTANA, null);
          this._menu(E, true);
        }
      } else if ((m & 264) === 264) {
        E.panelVis = false;
        if (E.f42 === 1) this._abrirPuertaAsc(E);
        E.st = 2;
      }
      break;

     case 5:
     case 6:
      {
        E.f38 = 100;
        if (E.st === 5) {
          E.pulsados = new Set;
          if (!E.botones.size) E.st = 6;
        } else {
          const p = E.pulsados || new Set;
          E.pulsados = new Set;
          const n = E.n;
          if (p.has("arriba") || p.has("abajo")) {
            E.sel = (E.sel + (p.has("arriba") ? n - 1 : 1)) % n;
            this.sonido(SE_ASC.CURSOR, null);
          }
          if (p.has("circulo")) {
            if (E.sel === E.piso || E.sel === n - 1) m |= 32; else {
              E.st = 7;
              E.f38 = 15;
            }
            this.sonido(SE_ASC.BOTON, null);
          }
          if (p.has("cruz")) m |= 32;
        }
        if (E.st !== 7 && (alerta || m & 32 || E.f44 > 1)) {
          this._menu(E, false);
          if (E.f42 !== 2) this._abrirPuertaAsc(E);
          E.st = 11;
        } else if (E.st === 7) this._menu(E, false);
        break;
      }

     case 11:
      E.f42 = 2;
      E.st = 3;
      break;

     case 7:
      if (E.f44 > 1) {
        if (E.f42 !== 2) {
          this._abrirPuertaAsc(E);
          if ((m & 8208) === 8208) m &= ~8208;
        }
        E.st = 11;
        break;
      }
      if (E.f42 === 0) {
        E.st = 8;
        E.f36 = 30;
        if (E.tex != null) this.extras?.mensaje(E.tex, [ H.TEXTURA, E.sel < E.piso ? 97 : 98 ]);
      }
      break;

     case 8:
      if (E.f36 >= 1) E.f36--; else if (!E.procHecho) {
        E.procHecho = true;
        const pid = E.procs[E.sel];
        if (pid == null) {
          console.warn("ascensor: NO FLOOR PROC", E.sel);
          E.st = 11;
          E.procHecho = false;
          break;
        }
        llegadaAscensor = {
          t: performance.now(),
          rot: E.rot,
          desde: E.nombre
        };
        try {
          this.correrProc?.(pid, [ E.rot ]);
        } catch (e) {
          console.warn("ascensor: proc del piso", e);
        }
        if (!this.correrProc) {
          llegadaAscensor = null;
          E.st = 11;
          E.procHecho = false;
        }
      }
      break;

     case 9:
      if (E.f36 >= 1) E.f36--; else if (E.f36 === 0) {
        E.f36 = -1;
        this._abrirPuertaAsc(E);
        this.sonido(SE_ASC.CAMPANA, null);
      }
      if ((m & 4112) === 4112) {
        E.f36 = 30;
        E.st = 10;
      }
      break;

     case 10:
      if (E.f36-- === 1) {
        E.st = 11;
        E.luzL = true;
      }
      break;
    }
    if ((m & 8208) === 8208) {
      if (E.f42 === 1) {
        E.f42 = 0;
        E.f38 = 0;
      }
    } else if (E.f38 > 0) {
      if (E.st !== 7 && E.f44 > 0) E.f38 = 30;
      if (E.f38-- === 1) this._cerrarPuertaAsc(E);
    }
  }
  _lucesAscensor(E) {
    if (E.luces) {
      E.luces.luz(E.luzP, E.luzL);
      E.luces.panel(E.panelVis, E.sel);
    }
  }
  _menu(E, abrir) {
    if (abrir) {
      menuAscensor = {
        din: this,
        E: E,
        _boton: (b, abajo) => this._botonAscensor(E, b, abajo)
      };
      E.botones.clear();
      E.pulsados = new Set;
    } else if (menuAscensor?.E === E) {
      menuAscensor = null;
      E.botones.clear();
    }
    this._firmaAsc = null;
  }
  _botonAscensor(E, b, abajo) {
    if (abajo) {
      E.botones.add(b);
      (E.pulsados ||= new Set).add(b);
    } else E.botones.delete(b);
  }
  _leerMandoAscensor(E) {
    if (menuAscensor?.E !== E || typeof navigator === "undefined" || !navigator.getGamepads) return;
    const gp = ctl.mando();
    if (!gp) return;
    const ahora = new Set, bt = i => !!gp.buttons[i]?.pressed;
    if (bt(ctl.B.ARRIBA) || (gp.axes[1] || 0) < -.5) ahora.add("arriba");
    if (bt(ctl.B.ABAJO) || (gp.axes[1] || 0) > .5) ahora.add("abajo");
    if (bt(ctl.B.CIRCULO)) ahora.add("circulo");
    if (bt(ctl.B.CRUZ)) ahora.add("cruz");
    const antes = E._mando || new Set;
    for (const b of ahora) if (!antes.has(b)) this._botonAscensor(E, b, true);
    for (const b of antes) if (!ahora.has(b)) this._botonAscensor(E, b, false);
    E._mando = ahora;
  }
  _rotulo(E, i) {
    return i === E.n - 1 ? "abrir" : i === 0 ? "1" : "B" + i;
  }
  _cajasAsc(E) {
    const bw = 64, bh = 34, gap = 8, alto = E.n * bh + (E.n - 1) * gap, x = 160 - bw / 2, y0 = 120 - alto / 2 - 8;
    return Array.from({
      length: E.n
    }, (_, i) => ({
      x: x,
      y: y0 + i * (bh + gap),
      w: bw,
      h: bh
    }));
  }
  _uiAscensor() {
    if (this.cvAsc || typeof document === "undefined") return;
    const c = document.createElement("canvas");
    c.id = "ascensor";
    c.width = 640;
    c.height = 480;
    c.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(100vw,133.33vh);height:min(75vw,100vh);z-index:7;display:none;touch-action:none;image-rendering:auto";
    const enLogico = ev => {
      const r = c.getBoundingClientRect();
      return [ (ev.clientX - r.left) / r.width * 320, (ev.clientY - r.top) / r.height * 240 ];
    };
    c.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const [x, y] = enLogico(ev);
      this.ascensorUI?.tocar(x, y);
    });
    c.addEventListener("pointermove", ev => {
      if (ev.pointerType === "mouse") {
        const [x, y] = enLogico(ev);
        this.ascensorUI?.apuntar(x, y);
      }
    });
    document.body.appendChild(c);
    this.cvAsc = c;
    const activo = () => menuAscensor?.din === this ? menuAscensor.E : null;
    const indice = (E, x, y) => this._cajasAsc(E).findIndex(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
    this.ascensorUI = {
      get visible() {
        return !!activo();
      },
      get lienzo() {
        return c;
      },
      firma: () => this._firmaAsc,
      caja: () => {
        const E = activo();
        if (!E) return null;
        const b = this._cajasAsc(E), b0 = b[0], bN = b[b.length - 1];
        return {
          x: 100,
          y: Math.max(0, b0.y - 16),
          w: 120,
          h: Math.min(240, bN.y + bN.h + 32) - Math.max(0, b0.y - 16)
        };
      },
      boton: (b, abajo) => {
        const E = activo();
        if (E) this._botonAscensor(E, b, abajo);
      },
      apuntar: (x, y) => {
        const E = activo();
        if (!E || E.st !== 6) return;
        const i = indice(E, x, y);
        if (i >= 0 && i !== E.sel) {
          E.sel = i;
          this.sonido(SE_ASC.CURSOR, null);
        }
      },
      tocar: (x, y) => {
        const E = activo();
        if (!E) return;
        const i = indice(E, x, y);
        if (i < 0) {
          this._botonAscensor(E, "cruz", true);
          this._botonAscensor(E, "cruz", false);
          return;
        }
        if (E.st === 5) E.st = 6;
        E.sel = i;
        this._botonAscensor(E, "circulo", true);
        this._botonAscensor(E, "circulo", false);
      }
    };
  }
  _dibujarAscensor() {
    const c = this.cvAsc;
    if (!c) return;
    const E = menuAscensor?.din === this ? menuAscensor.E : null;
    const vis = !!E;
    if (c.style.display !== "none" !== vis) c.style.display = vis ? "block" : "none";
    if (!vis) return;
    const firma = `${E.sel}|${E.st}|${E.n}|${typeof document !== "undefined" && document.fonts?.check?.("16px MGS8")}`;
    if (firma === this._firmaAsc) return;
    this._firmaAsc = firma;
    const x = c.getContext("2d"), k = 2;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, 320, 240);
    const cajas = this._cajasAsc(E), b0 = cajas[0], bN = cajas[cajas.length - 1];
    x.fillStyle = "rgba(0,0,0,0.55)";
    x.fillRect(0, 0, 320, 240);
    x.fillStyle = "#20262c";
    x.fillRect(b0.x - 12, b0.y - 12, b0.w + 24, bN.y + bN.h - b0.y + 24);
    x.strokeStyle = "#5c6670";
    x.lineWidth = 1;
    x.strokeRect(b0.x - 11.5, b0.y - 11.5, b0.w + 23, bN.y + bN.h - b0.y + 23);
    cajas.forEach((b, i) => {
      const sel = i === E.sel, tinte = sel ? 1 : .5;
      const col = (r, g, bl) => `rgb(${Math.round(r * tinte)},${Math.round(g * tinte)},${Math.round(bl * tinte)})`;
      x.fillStyle = col(16, 24, 56);
      x.fillRect(b.x, b.y, b.w, b.h);
      x.fillStyle = col(96, 136, 216);
      x.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      x.fillStyle = col(136, 176, 248);
      x.fillRect(b.x + 2, b.y + 2, b.w - 4, 2);
      x.fillStyle = col(20, 32, 74);
      const r = this._rotulo(E, i), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (r === "abrir") {
        x.beginPath();
        x.moveTo(cx - 6, cy - 8);
        x.lineTo(cx - 6, cy + 8);
        x.lineTo(cx - 17, cy);
        x.closePath();
        x.fill();
        x.beginPath();
        x.moveTo(cx + 6, cy - 8);
        x.lineTo(cx + 6, cy + 8);
        x.lineTo(cx + 17, cy);
        x.closePath();
        x.fill();
        x.fillRect(cx - 4, cy - 9, 3, 18);
        x.fillRect(cx + 1, cy - 9, 3, 18);
      } else {
        x.font = "16px MGS8, 'Arial Black', monospace";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText(r, cx, cy - 1);
        x.fillRect(b.x + 8, b.y + b.h - 7, b.w - 16, 2);
      }
      if (sel) {
        x.strokeStyle = "#e8f0ff";
        x.lineWidth = 1;
        x.strokeRect(b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3);
      }
    });
    x.font = "8px MGS, Consolas, monospace";
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    x.fillStyle = "#b4f4ac";
    x.fillText(E.st === 7 ? "" : "▲▼  O OK   X SALIR", 160, Math.min(236, bN.y + bN.h + 26));
  }
}
