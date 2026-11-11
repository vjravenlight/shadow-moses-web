// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Juego, sonido } from "./juego.js";

import { ocultarCuerpo } from "./cuerpo.js";

import * as ctl from "./controles.js";

export const MM = .001, FPS = 30, ANG = Math.PI * 2 / 4096;

const and12 = a => (a % 4096 + 4096) % 4096;

const dirDe = (dx, dz) => and12(Math.round(Math.atan2(dx, dz) / ANG));

const nearExp4 = (f, t) => {
  const d = t - f;
  return d > -4 && d < 4 ? t : f + Math.trunc(d / 4);
};

const nearExp2 = (f, t) => {
  const d = t - f;
  return d > -2 && d < 2 ? t : f + Math.trunc(d / 2);
};

const nearExp4P = (f, t) => {
  const d = ((t - f + 2048) % 4096 + 4096) % 4096 - 2048;
  return d > -4 && d < 4 ? and12(t) : and12(f + Math.trunc(d / 4));
};

const strcode = t => {
  let id = 0;
  for (const c of (new TextEncoder).encode(t || "")) id = (id << 5 | id >> 11) + c & 65535;
  return id;
};

const hashTrigger = n => typeof n === "string" && /^[0-9a-f]{4}$/.test(n) ? parseInt(n, 16) : typeof n === "string" ? strcode(n) : n;

export function navegador(zonasHzm, dy = 0) {
  const n = Object.create(Juego.prototype);
  n.ctx = {
    enPantalla: () => false
  };
  n.zonas = zonasHzm.map(z => ({
    p: new THREE.Vector3(z.p[0] * MM, (z.p[1] + dy) * MM, z.p[2] * MM),
    w: z.w * MM,
    h: z.h * MM,
    v: z.vecinas.filter(k => k < zonasHzm.length),
    d: z.dist
  }));
  const N = n.zonas.length;
  n.saltos = [];
  for (let i = 0; i < N; i++) {
    const row = new Uint8Array(N).fill(255);
    row[i] = 0;
    const cola = [ i ];
    while (cola.length) {
      const z = cola.shift();
      for (const m of n.zonas[z].v) if (row[m] === 255) {
        row[m] = row[z] + 1;
        cola.push(m);
      }
    }
    n.saltos.push(row);
  }
  return n;
}

export function agregarPiso(S, q) {
  const i = S.pisos.push(q) - 1, xs = q.map(p => p[0]), zs = q.map(p => p[2]);
  for (let cx = Math.floor(Math.min(...xs) / 2); cx <= Math.floor(Math.max(...xs) / 2); cx++) for (let cz = Math.floor(Math.min(...zs) / 2); cz <= Math.floor(Math.max(...zs) / 2); cz++) {
    const k = cx * 100003 + cz;
    if (!S.grilla.has(k)) S.grilla.set(k, []);
    S.grilla.get(k).push(i);
  }
}

function alturasEn(S, x, z) {
  const lista = S.grilla.get(Math.floor(x / 2) * 100003 + Math.floor(z / 2));
  if (!lista) return [];
  const out = [];
  const tri = (a, b, c) => {
    const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-9) return null;
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d, v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d, w = 1 - u - v;
    if (u < -1e-4 || v < -1e-4 || w < -1e-4) return null;
    return u * a[1] + v * b[1] + w * c[1];
  };
  for (const i of lista) {
    const q = S.pisos[i];
    let h = tri(q[0], q[1], q[2]);
    if (h === null) h = tri(q[0], q[2], q[3]);
    if (h !== null) out.push(h);
  }
  return out;
}

export function alturaEn(S, x, z, y) {
  let m = null;
  for (const h of alturasEn(S, x, z)) if (h <= y + .6 && (m === null || h > m)) m = h;
  return m;
}

export function techoEn(S, x, z, y) {
  let m = null;
  for (const h of alturasEn(S, x, z)) if (h > y + .05 && (m === null || h < m)) m = h;
  return m;
}

export class Rasen {
  constructor(datos, hzms, ctx, actor = null) {
    this.d = datos;
    this.ctx = ctx;
    this.actor = actor;
    const o = actor?.opts || {}, hid = x => x && typeof x === "object" ? x.id : x;
    this.mapas = (o.n || []).map(hid).filter(x => typeof x === "number");
    if (this.mapas.length !== 3) this.mapas = datos.mapas.slice();
    const m0 = hid((o.m || [])[0]);
    this.s0 = Math.max(0, this.mapas.indexOf(typeof m0 === "number" ? m0 : this.mapas[0]));
    this.ids = (o.o || []).map(hid);
    this.tabla = (o.l || []).filter(x => typeof x === "number");
    if (this.tabla.length < 48) this.tabla = datos.tabla.slice();
    this.modo = typeof (o.c || [])[0] === "number" ? o.c[0] : 0;
    this.menos = this.ids.length ? this.ids.length > 10 ? 2250 : 0 : datos.umbral_menos || 0;
    this.navs = hzms.map((h, s) => navegador(h.zonas, this.dy(s)));
    this.hzms = hzms;
    this.seccion = this.s0;
    this.cambio = 0;
    this.objs = [];
    this.vivo = true;
    this.suelo = {
      pisos: [],
      grilla: new Map
    };
    this.segs = [];
    hzms.forEach((h, s) => {
      const dy = this.dy(s);
      for (const g of h.grupos) {
        for (const f of g.pisos) {
          if (s > 0 && f.puntos.every(p => p[1] <= -31500)) continue;
          agregarPiso(this.suelo, f.puntos.map(p => [ p[0] * MM, (p[1] + dy) * MM, p[2] * MM ]));
        }
        for (const w of g.paredes) this.segs.push({
          a: [ w.a[0] * MM, (w.a[1] + dy) * MM, w.a[2] * MM ],
          b: [ w.b[0] * MM, (w.b[1] + dy) * MM, w.b[2] * MM ],
          h: w.alto * MM,
          flags: w.flags,
          s: s
        });
      }
    });
    this.c0 = null;
    this.c8 = null;
    this.c10 = null;
    this.c18 = 0;
  }
  dy(s) {
    return this.d.seccion * (s - this.s0);
  }
  seccionDeMapa(m) {
    return this.mapas.indexOf(m);
  }
  seccionDe(pisoMM) {
    return Math.max(0, Math.min(this.navs.length - 1, this.s0 + Math.floor((pisoMM + this.d.seccion / 2 + this.d.altura_snake + this.menos) / this.d.seccion)));
  }
  actualizar(rig) {
    const s = this.seccionDe(Math.round(rig.y * 1e3));
    this.cambio = s > this.seccion ? 1 : s < this.seccion ? 2 : 0;
    this.seccion = s;
    return this.cambio;
  }
  nav(s = this.seccion) {
    return this.navs[s];
  }
  async dibujar(cargar, mundo, teñir) {
    const {paso: paso, base: base} = this.d, hechos = new Set, prom = [];
    const url = k => {
      const h = this.ids[k];
      if (h != null) return this.d.modelos?.[h.toString(16).padStart(4, "0")] || null;
      return this.d.piezas[k] || null;
    };
    for (let s = 0; s < 3; s++) for (let j = 0; j < 16; j++) {
      const u = url(this.tabla[s * 16 + j]);
      if (!u) continue;
      const y = this.dy(s) + paso * j + base;
      if (hechos.has(y)) continue;
      hechos.add(y);
      prom.push(cargar(u).then(o => {
        o.position.set(0, y * MM, 0);
        o.traverse(m => {
          if (m.isMesh) m.userData.sinColision = true;
        });
        o.userData.rasen = {
          s: s,
          j: j
        };
        mundo.add(o);
        teñir?.(o);
        this.objs.push(o);
        return o;
      }).catch(() => null));
    }
    return (await Promise.all(prom)).filter(Boolean);
  }
  colisionSnake(ctx) {
    const pisos = [], paredes = [];
    this.hzms.forEach((h, s) => {
      if (s === this.s0) return;
      const dy = this.dy(s);
      for (const g of h.grupos) {
        for (const f of g.pisos) {
          if (s > 0 && f.puntos.every(p => p[1] <= -31500)) continue;
          const q = f.puntos.map(p => [ p[0] * MM, (p[1] + dy) * MM, p[2] * MM ]);
          pisos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
        }
        for (const w of g.paredes) {
          if (w.flags & 1) continue;
          const a = [ w.a[0] * MM, (w.a[1] + dy) * MM, w.a[2] * MM ], b = [ w.b[0] * MM, (w.b[1] + dy) * MM, w.b[2] * MM ], hh = w.alto * MM;
          paredes.push(...a, ...b, b[0], b[1] + hh, b[2], ...a, b[0], b[1] + hh, b[2], a[0], a[1] + hh, a[2]);
        }
      }
    });
    const malla = pos => {
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = true;
      m.userData.rasen = true;
      return m;
    };
    const mp = malla(pisos), mw = malla(paredes);
    ctx.mundo?.add(mp);
    ctx.mundo?.add(mw);
    this.objs.push(mp, mw);
    if (Array.isArray(ctx.pisos)) ctx.pisos.push(mp);
    if (Array.isArray(ctx.paredes)) ctx.paredes.push(mw);
    this.mallas = {
      pisos: mp,
      paredes: mw
    };
    ctx.recalcular?.();
    return this.mallas;
  }
  subirActores(mundo, items, din = null) {
    let n = 0;
    const dyM = m => {
      const s = this.seccionDeMapa(m);
      return s >= 0 && s !== this.s0 ? this.dy(s) * MM : 0;
    };
    const puertas = new Set((din?.puertas || []).map(p => p.o));
    mundo?.traverse(o => {
      const a = o.userData.actor;
      if (!a || o.userData.subidoRasen || puertas.has(o) || o.userData.rasen) return;
      if (a.tipo === "SNAKE" || a.tipo === "RASEN" || a.tipo === "RASEN_EL") return;
      if (o.parent && o.parent.userData.actor === a) return;
      const d = dyM(a.mapa);
      if (d) {
        o.position.y += d;
        o.userData.subidoRasen = true;
        n++;
      }
    });
    for (const it of items || []) {
      const d = dyM(it.actor?.mapa);
      if (d && !it.obj.userData.subidoRasen) {
        it.obj.position.y += d;
        it.obj.userData.subidoRasen = true;
        n++;
      }
    }
    this.puertasPendientes = (din?.puertas || []).filter(p => dyM(p.mapa));
    this.subirPuertas();
    return n;
  }
  subirPuertas() {
    if (!this.puertasPendientes?.length) return;
    for (const p of this.puertasPendientes.slice()) {
      const d = this.dy(this.seccionDeMapa(p.mapa)) * MM;
      if (!p._rasenSubida) {
        p.o.position.y += d;
        p.centro.y += d;
        p._rasenSubida = true;
      }
      if (p.trampas !== undefined) {
        for (const t of p.trampas || []) for (const c of t.cajas || []) if (!c._rasen) {
          c.min.y += d;
          c.max.y += d;
          c._rasen = true;
        }
        this.puertasPendientes.splice(this.puertasPendientes.indexOf(p), 1);
      }
    }
  }
  ajustarActor(a) {
    const s = this.seccionDeMapa(a?.mapa);
    if (s < 0 || s === this.s0 || a._rasenAjustado) return;
    const d = this.dy(s);
    a._rasenAjustado = true;
    const sumar = (v, ks) => {
      if (!Array.isArray(v)) return;
      for (const k of ks) if (typeof v[k] === "number" && Math.abs(v[k]) < 3e4) v[k] += d;
    };
    sumar(a.p, [ 1 ]);
    const o = a.opts || {};
    if (a.tipo === "DYNWALL") sumar(o.p, [ 1, 4 ]); else sumar(o.p, [ 1 ]);
    if (a.pared) {
      a.pared.a = a.pared.a.slice();
      a.pared.b = a.pared.b.slice();
      a.pared.a[1] += d;
      a.pared.b[1] += d;
    }
    if (Array.isArray(a.puntos)) a.puntos = a.puntos.map(q => ({
      ...q,
      p: [ q.p[0], q.p[1] + d, q.p[2] ]
    }));
  }
  ajustarTrampas(guion, cam) {
    const cajas = new Map;
    const largos = this.d.trampas_largas || {};
    this.hzms.forEach((h, s) => {
      const dy = this.dy(s);
      h.grupos.forEach((g, gi) => (g.triggers || []).forEach((t, ti) => {
        if (t.tipo !== "trap" || t.nombre == null) return;
        const k = hashTrigger(largos[`${s}:${gi}:${ti}`] || t.nombre);
        if (!cajas.has(k)) cajas.set(k, []);
        cajas.get(k).push([ [ t.caja[0][0], t.caja[0][1] + dy, t.caja[0][2] ], [ t.caja[1][0], t.caja[1][1] + dy, t.caja[1][2] ] ]);
      }));
    });
    if (guion?.script) {
      const Z = guion.script.zonas ||= {};
      for (const [k, v] of cajas) Z[String(k)] = v;
    }
    if (cam?.cajas) for (const [k, v] of cajas) cam.cajas.set(k, v);
    this.trampas = cajas;
    return cajas.size;
  }
  instalarCamara(cam) {
    if (!cam || this.cam === cam) return;
    this.desinstalarCamara();
    const R = this, logica = cam.logica, camera = cam.camera, corte = cam.corte;
    const propios = [ "logica", "camera", "corte" ].filter(k => Object.prototype.hasOwnProperty.call(cam, k));
    this.cam = cam;
    this._cam = {
      logica: logica,
      camera: camera,
      corte: corte,
      propios: propios
    };
    cam.logica = function() {
      const G = this.G;
      if (R.vivo && R.camOn !== false && G.flag & 2 && !(G.flag & 60)) {
        const L = G.limit, guard = L.map(par => par.map(v => ({
          ...v
        })));
        for (const par of L) for (const v of par) for (const k of [ "x", "y", "z" ]) if (Math.abs(v[k]) >= 3e4) v[k] = v[k] > 0 ? 1e9 : -1e9;
        try {
          this.seguirObjetivo();
        } finally {
          for (let i = 0; i < L.length; i++) for (let j = 0; j < L[i].length; j++) Object.assign(L[i][j], guard[i][j]);
        }
        R.callback(this);
        return 0;
      }
      return logica.call(this);
    };
    cam.camera = function(c) {
      return camera.call(this, R.camaraLocal(c));
    };
    cam.corte = function(ojo, centro, zoom, cuadros) {
      const d = R.dy(R.seccion);
      return corte.call(this, d ? [ ojo[0], ojo[1] + d, ojo[2] ] : ojo, d ? [ centro[0], centro[1] + d, centro[2] ] : centro, zoom, cuadros);
    };
    cam.G.flag |= 2;
    this.c0 = null;
    this.c8 = null;
  }
  desinstalarCamara() {
    const cam = this.cam;
    if (!cam || !this._cam) return;
    for (const k of [ "logica", "camera", "corte" ]) {
      if (this._cam.propios.includes(k)) cam[k] = this._cam[k]; else delete cam[k];
    }
    cam.G.flag &= ~2;
    this.cam = null;
    this._cam = null;
  }
  camaraLocal(c) {
    const d = this.dy(this.seccion);
    if (!d || !c) return c;
    const y = (v, i) => typeof v?.[i] === "number" && Math.abs(v[i]) < 3e4 ? v[i] + d : v?.[i];
    const r = {
      ...c
    };
    if (c.b) {
      r.b = c.b.slice();
      r.b[1] = y(c.b, 1);
      r.b[4] = y(c.b, 4);
    }
    if (c.l) {
      r.l = c.l.slice();
      r.l[1] = y(c.l, 1);
      r.l[4] = y(c.l, 4);
    }
    if (c.s) {
      r.s = {
        ...c.s,
        pos: c.s.pos.slice(),
        trg: c.s.trg.slice()
      };
      r.s.pos[1] += d;
      r.s.trg[1] += d;
    }
    return r;
  }
  callback(cam) {
    const G = cam.G, T = cam.S.trg;
    if (!this.c0) {
      this.c0 = {
        x: G.pos.x,
        y: G.pos.y,
        z: G.pos.z
      };
      this.c8 = {
        x: T.x,
        y: T.y,
        z: T.z
      };
    }
    if (this.modo === 2) {
      if (!this.c10) this.c10 = {
        ...this.c0
      };
      for (const k of [ "x", "y", "z" ]) {
        this.c0[k] = nearExp4(this.c0[k], this.c10[k]);
        this.c8[k] = nearExp4(this.c8[k], T[k]);
      }
      this.c18 = dirDe(this.c8.x - this.c0.x, this.c8.z - this.c0.z);
      cam.padOrg = and12(this.c18 + 2048);
    } else if (this.modo === 1) {
      const ax = 500, ay = T.y + 2e3, az = -500, dx = T.x - ax, dyy = T.y - ay, dz = T.z - az, L = Math.hypot(dx, dyy, dz) || 1, k = 3e3 / L;
      this.c0 = {
        x: Math.round(ax - dx * k),
        y: Math.round(ay - dyy * k),
        z: Math.round(az - dz * k)
      };
      this.c8 = {
        ...T
      };
      this.c18 = dirDe(dx, dz);
      cam.padOrg = and12(this.c18 + 2048);
    } else {
      let y = T.y + 6e3;
      const techo = techoEn(this.suelo, T.x * MM, (T.z + 400) * MM, T.y * MM);
      if (techo != null && techo * 1e3 < y) y = Math.round(techo * 1e3);
      this.c0 = {
        x: T.x,
        y: y - 300,
        z: T.z + 400
      };
      this.c8 = {
        ...T
      };
      this.c18 = 2048;
      cam.padOrg = 0;
    }
    G.pos = {
      x: this.c0.x,
      y: this.c0.y,
      z: this.c0.z
    };
    G.trg = {
      x: this.c8.x,
      y: this.c8.y,
      z: this.c8.z
    };
    G.type = 0;
    G.rot.y = this.c18;
  }
  mensaje(v) {
    if (v[0] === 17736) {
      if (v[1] === -1 || v[1] === 65535) {
        this.camOn = false;
        if (this.cam) this.cam.G.flag &= ~2;
      } else {
        this.modo = v[1];
        this.camOn = true;
        if (this.cam) this.cam.G.flag |= 2;
      }
      return true;
    }
    if (v[0] === 29394) {
      const s16 = n => (n & 65535 ^ 32768) - 32768;
      this.c10 = {
        x: s16(v[1]),
        y: s16(v[2]) + this.dy(this.seccion),
        z: s16(v[3])
      };
      return true;
    }
    return false;
  }
  cuadro() {
    if (this.cam && this.camOn !== false && !(this.cam.G.flag & 2)) this.cam.G.flag |= 2;
    if (this.puertasPendientes?.length) this.subirPuertas();
  }
  destruir() {
    this.vivo = false;
    this.desinstalarCamara();
    for (const o of this.objs) o.removeFromParent();
    if (this.mallas && this.ctx) {
      for (const [k, m] of [ [ "pisos", this.mallas.pisos ], [ "paredes", this.mallas.paredes ] ]) {
        const l = this.ctx[k];
        const i = Array.isArray(l) ? l.indexOf(m) : -1;
        if (i >= 0) l.splice(i, 1);
      }
    }
    this.objs = [];
  }
}

const MSG_EL = [ 44252, 2139, 32843, 56265, 57551, 24363 ];

const SALE = 14850, LLEGA = 16779, SNAKE = 8650;

const SE_EL = {
  VENTANA: 21,
  BOTON: 96
};

const ITEMS_CANCELAN = [ 1, 12, 2, 3, 4 ], ARMAS_CANCELAN = [ 4, 9 ];

const TECLAS_EL = {
  ArrowUp: "arriba",
  KeyW: "arriba",
  ArrowDown: "abajo",
  KeyS: "abajo",
  ArrowLeft: "izq",
  KeyA: "izq",
  ArrowRight: "der",
  KeyD: "der",
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

export class RasenEl {
  constructor(actor, datos, ctx, R = null) {
    this.actor = actor;
    this.nombre = actor.nombre;
    this.d = datos || {};
    this.ctx = ctx;
    this.R = R;
    const o = actor.opts || {}, n = (k, d, i = 0) => typeof o[k]?.[i] === "number" ? o[k][i] : d;
    const pid = k => {
      const v = o[k]?.[0];
      return v && typeof v === "object" && "proc" in v ? v.proc : typeof v === "number" ? v : 0;
    };
    this.p = [ n("p", 0, 0), n("p", 0, 1), n("p", 0, 2) ];
    this.alto = n("h", 0) * 10;
    this.cuadros = n("c", 300) || 300;
    this.procArriba = pid("o");
    this.procAbajo = pid("u");
    this.f230 = 0;
    this.estado = 3;
    this.f234 = 0;
    this.f23C = 0;
    const i = o.i?.[0];
    if (typeof i === "number") {
      if (i >= 0) this.estado = 1;
      this.f230 = Math.abs(i);
    }
    const w = o.w?.[0];
    if (w != null) {
      this.f23C = typeof w === "object" ? w.id : w;
      this.f234 |= 4;
    }
    this.elev = Math.trunc(this.alto * this.f230 / this.cuadros);
    const b = (o.b || []).filter(x => typeof x === "number");
    if (b.length >= 9) {
      this.ojoFin = b.slice(0, 3);
      this.panelC = b.slice(3, 6);
      this.panelT = b.slice(6, 9);
    } else {
      this.ojoFin = [ -600, 1650, 550 ];
      this.panelC = [ -750, 1500, 1750 ];
      this.panelT = [ 400, 600, 0 ];
    }
    this.sel = 2;
    this.f240 = 60;
    this.f244 = 0;
    this.f248 = 0;
    this.f2D0 = 0;
    this.f2D4 = 0;
    this.f2D8 = 0;
    this.ojoRel = [ 0, 0, 0 ];
    this.f2F4 = 0;
    this.f2F0 = 0;
    this.ojo = null;
    this.rot = [ 0, 0, 0 ];
    this.mirar = 0;
    this.vista = false;
    this.buzon = [];
    this.objs = [];
    this.vivo = true;
    this.registro = [];
    this.botones = new Set;
    this.pulsados = new Set;
    this.soltados = new Set;
    this._mando = new Set;
    this.dy0 = R ? R.dy(0) : 0;
  }
  log(t, d = {}) {
    this.registro.push({
      t: t,
      estado: this.estado,
      f230: this.f230,
      ...d
    });
    if (this.registro.length > 200) this.registro.shift();
  }
  posMM() {
    return [ this.p[0], this.p[1] + this.elev + this.dy0, this.p[2] ];
  }
  async armar() {
    const ctx = this.ctx, g = new THREE.Group;
    g.userData.rasenEl = this;
    g.name = "RASEN_EL";
    if (ctx.cargar && this.d.modelo) {
      try {
        const m = await ctx.cargar(this.d.modelo);
        m.traverse(x => {
          if (x.isMesh) x.userData.sinColision = true;
        });
        g.add(m);
        ctx.teñir?.(m);
      } catch (e) {
        console.warn("[torres] ascensor", e);
      }
    }
    if (!this.vivo) return this;
    this.cuadrosPanel = [];
    let tex = null;
    if (this.d.textura) {
      try {
        tex = await (new THREE.TextureLoader).loadAsync("assets/" + this.d.textura);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
      } catch {
        tex = null;
      }
    }
    const [cx, cy, cz] = this.panelC, [tw, th, tz] = this.panelT;
    const vx = cx - Math.trunc(tw / 2), vz = cz - Math.trunc(tz / 2), paso = Math.trunc(th / 3);
    let vy = cy + Math.trunc(th / 2);
    for (let k = 0; k < 3; k++) {
      const arr = [ vx + tw, vy, vz, vx, vy, vz ];
      vy -= paso;
      arr.push(vx + tw, vy, vz, vx, vy, vz);
      const geo = new THREE.BufferGeometry;
      geo.setAttribute("position", new THREE.Float32BufferAttribute(arr.map(v => v * MM), 3));
      const v0 = 1 - k / 3, v1 = 1 - (k + 1) / 3;
      geo.setAttribute("uv", new THREE.Float32BufferAttribute([ 0, v0, 1, v0, 0, v1, 1, v1 ], 2));
      geo.setIndex([ 0, 1, 2, 1, 3, 2 ]);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: 4210752,
        side: THREE.DoubleSide,
        alphaTest: .5,
        toneMapped: false
      });
      const q = new THREE.Mesh(geo, mat);
      q.userData.sinColision = true;
      q.userData.botonEl = k;
      q.renderOrder = 1;
      g.add(q);
      this.cuadrosPanel.push(q);
    }
    this.obj = g;
    ctx.mundo?.add(g);
    this.objs.push(g);
    const ux = (this.d.ux ?? 2437) + 100, uz = (this.d.uz ?? 2e3) + 100;
    const pg = new THREE.PlaneGeometry(2 * ux * MM, 2 * uz * MM);
    pg.rotateX(-Math.PI / 2);
    const piso = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    }));
    piso.userData.propio = piso.userData.sinColision = true;
    piso.userData.rasenEl = true;
    this.piso = piso;
    ctx.mundo?.add(piso);
    this.objs.push(piso);
    if (Array.isArray(ctx.pisos)) {
      ctx.pisos.push(piso);
      ctx.recalcular?.();
    }
    this.ubicar();
    this.colorPanel();
    this.log("creado", {
      p: this.p,
      i: this.actor.opts?.i?.[0] ?? null
    });
    return this;
  }
  ubicar() {
    const [x, y, z] = this.posMM();
    this.obj?.position.set(x * MM, y * MM, z * MM);
    if (this.piso) {
      this.piso.position.set(x * MM, (y + 1) * MM, z * MM);
      this.piso.updateMatrixWorld(true);
    }
  }
  colorPanel() {
    for (const q of this.cuadrosPanel || []) {
      if (q.userData.botonEl === this.sel) q.material.color.setRGB(97 / 128, 1, 138 / 128, THREE.SRGBColorSpace); else q.material.color.setRGB(.25, .25, .25, THREE.SRGBColorSpace);
    }
  }
  proc(pid, v) {
    if (!pid) return;
    this.log("proc", {
      pid: pid.toString(16),
      v: v.toString(16)
    });
    try {
      this.ctx.guion?.correrProc?.(pid, [ v ]);
    } catch (e) {
      console.warn("[torres] proc", e);
    }
  }
  mensaje(v) {
    if (MSG_EL.includes(v[0] & 65535)) {
      this.buzon.push(v.slice());
      return true;
    }
    return false;
  }
  juego() {
    return this.ctx.juego;
  }
  camJuego() {
    return this.ctx.camJuego?.() ?? (typeof window !== "undefined" ? window.__mgs?.camJuego : null) ?? null;
  }
  cuerpo() {
    return this.ctx.cuerpo?.() ?? (typeof window !== "undefined" ? window.__mgs?.cuerpo : null) ?? null;
  }
  inventario() {
    return this.ctx.inventario ?? (typeof window !== "undefined" ? window.__mgs?.inventario : null) ?? null;
  }
  dirSnake() {
    const y = this.juego()?.ctx.yawSnake?.() ?? 0;
    return and12(Math.round((y + Math.PI) / ANG));
  }
  cabeza() {
    const S = this.camJuego()?.S?.pos, r = this.juego()?.ctx.rig.position;
    if (S && r && Math.abs(S.y - r.y * 1e3) < 2500 && Math.abs(S.x - r.x * 1e3) < 600) return {
      x: S.x,
      y: S.y,
      z: S.z
    };
    return r ? {
      x: Math.round(r.x * 1e3),
      y: Math.round(r.y * 1e3) + 1499,
      z: Math.round(r.z * 1e3)
    } : {
      x: 0,
      y: 0,
      z: 0
    };
  }
  abrirVista() {
    this.vista = true;
    this.mirar = 0;
    this.ctx.congelar?.(true);
    const C = this.cuerpo();
    if (C) ocultarCuerpo(C, true);
    this.instalarCamara(this.camJuego());
    this.teclas(true);
  }
  cerrarVista() {
    this.vista = false;
    this.ctx.congelar?.(false);
    const C = this.cuerpo();
    if (C) ocultarCuerpo(C, false);
    this.teclas(false);
  }
  instalarCamara(cam) {
    if (!cam || this.cam === cam) return;
    this.desinstalarCamara();
    const E = this, cuadro = cam.cuadro, helper3 = cam.helper3, pp = cam.primeraPersonaCuadro;
    const propios = [ "cuadro", "helper3", "primeraPersonaCuadro" ].filter(k => Object.prototype.hasOwnProperty.call(cam, k));
    this.cam = cam;
    this._cam = {
      cuadro: cuadro,
      helper3: helper3,
      primeraPersonaCuadro: pp,
      propios: propios
    };
    cam.cuadro = function(s) {
      return cuadro.call(this, E.vista ? {
        ...s,
        primeraPersona: true,
        mirar: 0
      } : s);
    };
    cam.helper3 = function() {
      if (E.vista && E.ojo) {
        this.S.pos.x = E.ojo[0];
        this.S.pos.y = E.ojo[1];
        this.S.pos.z = E.ojo[2];
      }
      return helper3.call(this);
    };
    cam.primeraPersonaCuadro = function() {
      const G = this.G, S = this.S;
      if (E.vista && E.ojo && !(G.flag & 256)) {
        G.pos = {
          x: E.ojo[0],
          y: E.ojo[1],
          z: E.ojo[2]
        };
        G.rot = {
          x: E.rot[0],
          y: nearExp4P(G.rot.y, E.rot[1] + E.mirar),
          z: E.rot[2]
        };
        G.track = 3e3;
        G.type = 1;
        S.trg.x = S.pos.x;
        S.trg.y = S.pos.y;
        S.trg.z = S.pos.z;
        this.padOrg = and12(E.rot[1] + 2048);
        S.interp++;
        return;
      }
      return pp.call(this);
    };
  }
  desinstalarCamara() {
    const cam = this.cam;
    if (!cam || !this._cam) return;
    for (const k of [ "cuadro", "helper3", "primeraPersonaCuadro" ]) {
      if (this._cam.propios.includes(k)) cam[k] = this._cam[k]; else delete cam[k];
    }
    this.cam = null;
    this._cam = null;
  }
  teclas(si) {
    if (typeof window === "undefined") return;
    if (si && !this._kd) {
      const bloquear = e => e.code !== "Tab" && !/^F\d+$/.test(e.code);
      this._kd = e => {
        const b = TECLAS_EL[e.code];
        if (b) {
          e.preventDefault();
          if (!e.repeat) {
            this.botones.add(b);
            this.pulsados.add(b);
          }
        }
        if (bloquear(e)) e.stopImmediatePropagation();
      };
      this._ku = e => {
        const b = TECLAS_EL[e.code];
        if (b && this.botones.has(b)) {
          this.botones.delete(b);
          this.soltados.add(b);
        }
      };
      this._pd = e => {
        const cam = this.juego()?.ctx.cam;
        if (!cam || !this.cuadrosPanel?.length) return;
        const r = e.target?.tagName === "CANVAS" ? e.target.getBoundingClientRect() : {
          left: 0,
          top: 0,
          width: innerWidth,
          height: innerHeight
        };
        const ndc = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        const rc = new THREE.Raycaster;
        rc.setFromCamera(ndc, cam);
        const h = rc.intersectObjects(this.cuadrosPanel, false)[0];
        if (h) {
          this.sel = h.object.userData.botonEl;
          this.colorPanel();
          this.pulsados.add("circulo");
          this.soltados.add("circulo");
        } else {
          this.pulsados.add("cruz");
          this.soltados.add("cruz");
        }
        e.preventDefault();
        e.stopImmediatePropagation();
      };
      addEventListener("keydown", this._kd, true);
      addEventListener("keyup", this._ku, true);
      addEventListener("pointerdown", this._pd, true);
    } else if (!si && this._kd) {
      removeEventListener("keydown", this._kd, true);
      removeEventListener("keyup", this._ku, true);
      removeEventListener("pointerdown", this._pd, true);
      this._kd = this._ku = this._pd = null;
      this.botones.clear();
      this.pulsados.clear();
      this.soltados.clear();
    }
  }
  leerMando() {
    const gp = ctl.mando();
    if (!gp) return;
    const B = ctl.B, bt = i => !!gp.buttons[i]?.pressed, ahora = new Set;
    if (bt(B.ARRIBA) || (gp.axes[1] || 0) < -.5) ahora.add("arriba");
    if (bt(B.ABAJO) || (gp.axes[1] || 0) > .5) ahora.add("abajo");
    if (bt(B.IZQ) || (gp.axes[0] || 0) < -.5) ahora.add("izq");
    if (bt(B.DER) || (gp.axes[0] || 0) > .5) ahora.add("der");
    if (bt(B.CIRCULO)) ahora.add("circulo");
    if (bt(B.CRUZ)) ahora.add("cruz");
    for (const b of ahora) if (!this._mando.has(b)) {
      this.botones.add(b);
      this.pulsados.add(b);
    }
    for (const b of this._mando) if (!ahora.has(b)) {
      this.botones.delete(b);
      this.soltados.add(b);
    }
    this._mando = ahora;
  }
  pad() {
    if (this.vista) this.leerMando();
    const r = {
      press: new Set(this.pulsados),
      release: new Set(this.soltados),
      status: new Set(this.botones)
    };
    this.pulsados.clear();
    this.soltados.clear();
    return r;
  }
  moverJinete(delta) {
    if (!delta) return;
    const J = this.juego();
    if (this.f23C === SNAKE) {
      if (J) J.ctx.rig.position.y += delta * MM;
      return;
    }
    for (const g of J?.ctx.guardias || []) if (g.nombre === this.f23C) {
      g.o.position.y += delta * MM;
      break;
    }
  }
  cuadro() {
    if (!this.vivo) return;
    if (this.vista && this.cam !== this.camJuego()) this.instalarCamara(this.camJuego());
    let found = -1, result = 0;
    for (const v of this.buzon.splice(0)) {
      const k = MSG_EL.indexOf(v[0] & 65535);
      if (k >= 0) {
        found = k;
        result = v[1] ?? 0;
      }
    }
    if (found >= 0) this.log("mesg", {
      m: MSG_EL[found].toString(16)
    });
    if (found === 4 && this.estado === 0) {
      this.estado = 4;
      this.f2D0 = 0;
      this.f2D4 = 0;
    } else if (found === 5 && this.estado === 2) {
      this.estado = 5;
      this.f2D0 = 0;
      this.f2D4 = 0;
    }
    const pad = this.pad();
    switch (this.estado) {
     case 0:
      if (found === 0 || found === 2) {
        this.estado = 1;
        this.proc(this.procAbajo, SALE);
        if (found === 2) {
          this.f23C = result;
          this.f234 |= 4;
        }
        this.f240 = 60;
        this.f244 = 60;
      }
      this.sel = 1;
      break;

     case 1:
      if (this.f244 === 0) {
        if (this.f230 >= this.cuadros) {
          if (this.f240 === 60) {
            this.proc(this.procArriba, LLEGA);
            this.sel = 0;
          } else if (this.f240 === 0) {
            this.estado = 2;
            this.f234 &= ~4;
            if (this.vista) {
              this.cerrarVista();
              this.f248 = 3;
            }
            this.log("arriba");
          }
          this.f240--;
        } else this.f230++;
      } else this.f244--;
      break;

     case 2:
      if (found === 1 || found === 3) {
        this.estado = 3;
        this.proc(this.procArriba, SALE);
        if (found === 3) {
          this.f23C = result;
          this.f234 |= 4;
        }
        this.f240 = 60;
        this.f244 = 60;
      }
      this.sel = 0;
      break;

     case 3:
      if (this.f244 !== 0) this.f244--; else if (this.f230 < 1) {
        if (this.f240 === 60) {
          this.proc(this.procAbajo, LLEGA);
          this.sel = 1;
        } else if (this.f240 === 0) {
          this.estado = 0;
          this.f234 &= ~4;
          if (this.vista) {
            this.cerrarVista();
            this.f248 = 3;
          }
          this.log("abajo");
        }
        this.f240--;
      } else this.f230--;
      break;

     case 4:
      this.panel(0, pad);
      break;

     case 5:
      this.panel(1, pad);
      break;
    }
    if (this.f248 !== 0) this.f248--;
    const elev = Math.trunc(this.alto * this.f230 / this.cuadros), delta = elev - this.elev;
    this.elev = elev;
    if (this.f234 & 4) this.moverJinete(delta);
    this.ubicar();
    if (this.f2F4 !== 0) {
      for (let k = 0; k < 3; k++) this.ojoRel[k] = nearExp4(this.ojoRel[k], this.ojoFin[k]);
      this.f2F4--;
    }
    const pos = this.posMM(), sinSuav = pos[1] + this.ojoRel[1];
    const viejo = (this.ojo ? this.ojo[1] : sinSuav) - this.f2F0;
    this.f2F0 = nearExp2(this.f2F0, sinSuav - viejo);
    this.ojo = [ pos[0] + this.ojoRel[0], sinSuav + this.f2F0, pos[2] + this.ojoRel[2] ];
    if (this.vista) {
      if (pad.status.has("izq") && this.mirar < 200) this.mirar += 32;
      if (pad.status.has("der") && this.mirar > -200) this.mirar -= 32;
    }
    this.colorPanel();
  }
  panel(arg, pad) {
    const J = this.juego(), cam = this.camJuego();
    switch (this.f2D0) {
     case 0:
      if (this.f2D4 === 0) {
        if (cam?.G.fp === 1 && !this.vista && !this.ctx.primeraPersonaMovil?.()) {
          this.f2D8 = -1;
          this.f2D0 = 2;
          this.log("cancel");
          break;
        }
        const inv = this.inventario();
        if (inv && (ITEMS_CANCELAN.includes(inv.item) || ARMAS_CANCELAN.includes(inv.arma))) {
          if (!this.vista) this.f2D8 = -1;
          this.f2D0 = 2;
          this.log("cancel cause of item");
          break;
        }
        if (J?.snakeBloqueado?.()) {
          if (!this.vista) this.f2D8 = -1;
          this.f2D0 = 2;
          break;
        }
        this.f2D8 = 0;
        sonido(SE_EL.VENTANA, null);
        this.abrirVista();
        const h = this.cabeza(), dyS = this.R ? this.R.dy(this.R.seccion) : 0;
        this.ojoRel = [ h.x, h.y - dyS + (arg === 0 ? 16250 : 16e3), h.z ];
        this.f2F4 = 15;
        this.ojo = null;
        this.f2F0 = 0;
        this.log("panel", {
          arg: arg
        });
      }
      this.rot = [ 0, this.dirSnake(), 0 ];
      if (this.f2D4 > 20) {
        this.f2D0 = 1;
        this.f2D4 = 0;
      }
      this.f2D4++;
      break;

     case 1:
      if (pad.press.has("arriba")) {
        if (--this.sel < 0) this.sel = 0; else sonido(SE_EL.BOTON, null);
      }
      if (pad.press.has("abajo")) {
        if (++this.sel > 2) this.sel = 2; else sonido(SE_EL.BOTON, null);
      }
      if (pad.release.has("circulo")) {
        if (this.sel === arg) {
          this.f2D8 = 1;
          this.f2D0 = 2;
          const r = J?.ctx.rig.position;
          if (r) {
            r.x = 500 * MM;
            r.z = 0;
          }
        } else this.f2D0 = 2;
      } else if (pad.release.has("cruz") || J?.snakeBloqueado?.()) this.f2D0 = 2;
      break;

     case 2:
      if (this.f2D8 === 0) {
        this.estado = arg * 2;
        this.cerrarVista();
        this.f248 = 3;
        this.log("cerrar");
      } else if (this.f2D8 === 1) {
        if (arg === 0) {
          this.estado = 1;
          this.proc(this.procAbajo, SALE);
        } else {
          this.estado = 3;
          this.proc(this.procArriba, SALE);
        }
        this.f23C = SNAKE;
        this.f240 = 60;
        this.f244 = 60;
        this.f234 |= 4;
        this.log("viaje", {
          arg: arg
        });
        return;
      } else this.estado = arg * 2;
      break;
    }
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    if (this.vista) this.cerrarVista();
    this.desinstalarCamara();
    this.teclas(false);
    for (const o of this.objs) o.removeFromParent();
    const l = this.ctx.pisos, i = Array.isArray(l) ? l.indexOf(this.piso) : -1;
    if (i >= 0) {
      l.splice(i, 1);
      this.ctx.recalcular?.();
    }
    this.objs = [];
  }
}
