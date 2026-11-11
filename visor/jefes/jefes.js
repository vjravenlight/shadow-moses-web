// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefes, VoiceSys, Flujo, MM, ANG, cargarModelo } from "./base.js";

import { Ocelot, Baker, Cables } from "./ocelot.js";

import { Tanque, CamaraTanque } from "./tanque.js";

import { HindD, S11Objs, Hind2, Demo11G } from "./hind.js";

import { Valcan, Cuervos } from "./valcan.js";

import { TIPOS_MANTIS, PELEA_S07B } from "./mantis.js";

import { PsyMeryl, entradaS07b } from "./mantis_meryl.js";

import { TIPOS_WOLF, PELEA_S10A, PELEA_S12A } from "./wolf.js";

import { Ninja, PELEA_S08B } from "./ninja.js";

import { TIPOS_REX, PELEA_S17A } from "./rex.js";

import { TIPOS_LIQUID, PELEA_S18A } from "./liquid.js";

import { TIPOS_JEEP, PELEA_S19B } from "./jeep.js";

export const TIPOS_JEFE = new Set([ "REVOLVER04", "AT", "C4WIRE", "VOICESYS", "M1E1", "M1E1CAME" ]);

export const esJefe = actor => !!actor && TIPOS_JEFE.has(actor.tipo);

const JEFES3 = {
  MI24HIND: HindD,
  S11_OBJS: S11Objs,
  HIND2: Hind2,
  "11G_DEMO": Demo11G,
  VALCAN: Valcan,
  CROW: Cuervos
};

Object.assign(JEFES3, TIPOS_WOLF);

JEFES3.NINJA = Ninja;

Object.assign(JEFES3, TIPOS_REX);

Object.assign(JEFES3, TIPOS_LIQUID);

Object.assign(JEFES3, TIPOS_JEEP);

for (const t of Object.keys(JEFES3)) TIPOS_JEFE.add(t);

TIPOS_MANTIS.PSYCHOMERYL = PsyMeryl;

for (const t of Object.keys(TIPOS_MANTIS)) TIPOS_JEFE.add(t);

export function crearJefe(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esJefe(actor)) return null;
  const mgr = Jefes.de(J, ctx);
  if (actor.tipo === "VOICESYS") {
    mgr.flujo?.parar();
    mgr.flujo = new Flujo({
      voces: ctx.voces,
      simulado: !!ctx.vocesSimuladas
    });
    mgr.voicesys = new VoiceSys(actor.opts?.v, mgr.flujo);
    mgr.voicesys.cargando = mgr.flujo.precargar((actor.opts?.v || []).filter(x => typeof x === "number"));
    return mgr.voicesys;
  }
  let j = null;
  if (actor.tipo === "REVOLVER04") j = new Ocelot(actor, mgr); else if (actor.tipo === "AT") j = new Baker(actor, mgr); else if (actor.tipo === "C4WIRE") j = new Cables(actor, mgr); else if (actor.tipo === "M1E1") j = new Tanque(actor, mgr); else if (actor.tipo === "M1E1CAME") j = new CamaraTanque(actor, mgr); else if (JEFES3[actor.tipo]) j = new JEFES3[actor.tipo](actor, mgr); else if (TIPOS_MANTIS[actor.tipo]) j = new TIPOS_MANTIS[actor.tipo](actor, mgr);
  mgr.agregar(j);
  j.cargando = j.iniciar().then(() => {
    j.listo = true;
    return j;
  }).catch(e => {
    console.warn("[jefes]", actor.tipo, e);
    j.vivo = false;
    return null;
  });
  return j;
}

const PELEAS = {
  s04b: {
    filtro: a => a.mapa === 49736 && [ "VOICESYS", "REVOLVER04", "C4WIRE", "AT", "WALL", "DYNWALL" ].includes(a.tipo),
    snake: {
      p: [ -500, 0, 10500 ],
      rot: 2048
    },
    cancion: 3,
    grupoHzd: 1
  },
  s07b: PELEA_S07B,
  s08b: PELEA_S08B,
  s08br: PELEA_S08B,
  s10a: PELEA_S10A,
  s12a: PELEA_S12A,
  s17a: PELEA_S17A,
  s17ar: PELEA_S17A,
  s18a: PELEA_S18A,
  s19b: PELEA_S19B,
  s05a: {
    elegir: (nv, ctx) => {
      const tanques = nv.actores.filter(a => a.tipo === "M1E1" && a.mapa === 65 && a.opts?.w?.[1] && typeof a.opts.w[1] === "object");
      const nivel = Math.max(0, Math.min(3, ((ctx.dificultad || ctx.juego.ctx.dificultad)?.() ?? 2) - 1));
      return [ ...nv.actores.filter(a => a.tipo === "M1E1CAME" && a.mapa === 65).slice(0, 1), tanques[nivel] || tanques[1] ].filter(Boolean);
    },
    snake: {
      p: [ -1e3, 0, 18e3 ],
      rot: 2048
    },
    cancion: 2,
    grupoHzd: 1,
    armas: {
      2: 8,
      8: 3
    },
    guion: g => g.correrProc(42157),
    tipos: [ "M1E1" ]
  },
  s11h: {
    elegir: nv => [ nv.actores.find(a => a.tipo === "S11_OBJS" && !a.evento), nv.actores.find(a => a.tipo === "MI24HIND") ].filter(Boolean),
    snake: {
      p: [ 5011, 0, -3505 ],
      rot: 1024
    },
    armas: {
      4: 10
    }
  },
  s11g: {
    elegir: nv => nv.actores.filter(a => a.tipo === "MI24HIND").slice(0, 1).map(a => ({
      ...a,
      forzado: true
    }))
  },
  s11i: {
    elegir: nv => nv.actores.filter(a => a.tipo === "HIND2").slice(0, 1).map(a => ({
      ...a,
      forzado: true
    }))
  },
  s15a: {
    elegir: nv => nv.actores.filter(a => a.tipo === "VALCAN").slice(0, 1),
    armas: {
      3: 8,
      4: 10
    }
  },
  s15c: {
    elegir: nv => nv.actores.filter(a => a.tipo === "VALCAN").slice(0, 1),
    armas: {
      3: 8,
      4: 10
    }
  }
};

export async function crearJefesEntrada(nv, ctx, guion = null) {
  if (!nv?.actores || !ctx?.juego) return [];
  const g = guion && guion.nivel === nv && guion.presupuesto ? guion : null;
  const pidio = a => !g || a._k == null || (g.presupuesto.get(a._k) || 0) < (g.presupuestoBase.get(a._k) || 0);
  const ya = new Set((ctx.juego.__jefes?.lista || []).filter(j => j.vivo !== false).map(j => j.actor?.tipo));
  const sinCrear = new Set;
  if (g?.traza) {
    const T = g.traza;
    let i = T.length - 1;
    while (i >= 0 && !(T[i].que === "escenario" && T[i].st === nv.id)) i--;
    for (let j = i - 1; j >= 0 && T[j].que !== "escenario" && T[j].que !== "load"; j--) if (T[j].que === "entrada-sin-crear" && (TIPOS_JEFE.has(T[j].tipo) || PELEAS[nv.id] && (T[j].tipo === "WALL" || T[j].tipo === "DYNWALL"))) sinCrear.add(T[j].k);
  }
  const deEntrada = a => !a.evento && !a.t && pidio(a) || a.evento && sinCrear.has(a._k);
  const creados = [];
  for (const a of nv.actores) if (JEFES3[a.tipo] && !ya.has(a.tipo) && deEntrada(a)) {
    const j = crearJefe(a, ctx);
    if (j) {
      creados.push(j);
      if (a.evento) j.__sinCrear = true;
    }
  }
  const resto = nv.actores.filter(a => a.evento && sinCrear.has(a._k) && !JEFES3[a.tipo]);
  resto.sort((a, b) => (a.tipo === "VOICESYS" ? -1 : 0) - (b.tipo === "VOICESYS" ? -1 : 0));
  {
    const P = PELEAS[nv.id];
    if (resto.length && P?.grupoHzd != null && (ctx.juego.ctx.hz?.grupos?.length || 0) > P.grupoHzd) Jefes.de(ctx.juego, ctx).grupoHzd = P.grupoHzd;
  }
  for (const a of resto) {
    if (a.tipo === "VOICESYS" && ctx.juego.__jefes?.voicesys) continue;
    if (esJefe(a)) {
      if (a.tipo !== "VOICESYS" && ya.has(a.tipo)) continue;
      const j = crearJefe(a, ctx);
      if (j && a.tipo !== "VOICESYS") {
        creados.push(j);
        j.__sinCrear = true;
      }
      continue;
    }
    const mgr = Jefes.de(ctx.juego, ctx);
    const x = a.tipo === "WALL" ? await ponerPared(a, nv.id, mgr) : a.tipo === "DYNWALL" ? paredDinamica(a, ctx) : null;
    if (x) {
      x.__sinCrear = true;
      (mgr.extrasEntrada ||= []).push(x);
    }
  }
  if (g) g.__jefesCtx = ctx;
  if (g && !g.__jefesReinicio && typeof g.despuesDelMain === "function") {
    g.__jefesReinicio = true;
    const dm = g.despuesDelMain.bind(g);
    g.despuesDelMain = (reinicio, ...r) => {
      if (reinicio) try {
        const J = (typeof window !== "undefined" ? window.__mgs?.juego : null) || g.__jefesCtx?.juego, mgr = J?.__jefes;
        for (const j of (mgr?.lista || []).slice()) if (j.__sinCrear && j.vivo !== false) j.destruir();
        for (const x of (mgr?.extrasEntrada || []).splice(0)) x.destruir?.();
      } catch (e) {
        console.warn("[jefes] restart", e);
      }
      return dm(reinicio, ...r);
    };
  }
  if (resto.length) console.info("[jefes] entrada: creados los que el main pidió y nadie creó", resto.map(a => a.tipo + " k" + a._k).join(", "));
  if (nv.id === "s07b") {
    const m = entradaS07b(nv, ctx);
    if (m) creados.push(m);
  }
  await Promise.all(creados.map(j => j.cargando).filter(Boolean));
  return creados;
}

export async function forzarJefes(nv, ctx, op = {}) {
  const P = PELEAS[nv?.id];
  if (!P || !ctx?.juego) return [];
  const mgr = Jefes.de(ctx.juego, ctx);
  if (P.grupoHzd != null && (ctx.juego.ctx.hz?.grupos?.length || 0) > P.grupoHzd) mgr.grupoHzd = P.grupoHzd;
  let creados = P.guion && !op.directo ? await porGuion(nv, ctx, P, mgr) : null;
  if (!creados) {
    creados = [];
    const sel = P.elegir ? P.elegir(nv, ctx) : nv.actores.filter(P.filtro);
    sel.sort((a, b) => (a.tipo === "VOICESYS" ? -1 : 0) - (b.tipo === "VOICESYS" ? -1 : 0));
    for (const a of sel) {
      if (esJefe(a)) {
        const j = crearJefe(a, ctx);
        if (j) creados.push(j);
        continue;
      }
      if (a.tipo === "WALL") creados.push(await ponerPared(a, nv.id, mgr));
      if (a.tipo === "DYNWALL") creados.push(paredDinamica(a, ctx));
    }
  }
  if (P.snake && op.ubicar !== false) {
    const p = P.snake.p, R = ctx.juego.ctx.rig;
    if (ctx.ubicar) ctx.ubicar(p[0] * MM, p[1] * MM, p[2] * MM, P.snake.rot * ANG + Math.PI); else R.position.set(p[0] * MM, p[1] * MM, p[2] * MM);
  }
  if (P.cancion && op.musica !== false) ctx.musica?.(16777216 | P.cancion);
  const inv = ctx.juego.ctx.inventario;
  if (P.armas && inv) for (const [id, n] of Object.entries(P.armas)) if (!(inv.armas[id] >= n)) {
    inv.armas[id] = n;
    if (inv.armasMax && !(inv.armasMax[id] >= n)) inv.armasMax[id] = n;
  }
  await Promise.all(creados.map(j => j?.cargando).filter(Boolean));
  return creados;
}

async function porGuion(nv, ctx, P, mgr) {
  const g = ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
  if (!g || typeof g.correrProc !== "function") return null;
  for (let i = 0; i < 80 && !(g.st === nv.id && g.script); i++) await new Promise(r => setTimeout(r, 100));
  if (!(g.st === nv.id && g.script)) return null;
  const antes = new Set(mgr.lista);
  try {
    P.guion(g);
  } catch (e) {
    console.warn("[jefes] guion", e);
    return null;
  }
  for (let i = 0; i < 30 && !mgr.lista.some(j => !antes.has(j) && P.tipos.includes(j.actor?.tipo)); i++) await new Promise(r => setTimeout(r, 100));
  const nuevos = mgr.lista.filter(j => !antes.has(j));
  return nuevos.some(j => P.tipos.includes(j.actor?.tipo)) ? nuevos : null;
}

async function ponerPared(a, st, mgr) {
  const m = a.opts?.m?.[0], id = typeof m === "object" ? m.id : m;
  if (id == null) return null;
  const url = a.modelo || `niveles/${st}/${id.toString(16).padStart(4, "0")}.glb`;
  try {
    const o = await cargarModelo(mgr.ctx, url), p = a.p || a.opts.p, d = a.d || a.opts.d || [ 0, 0, 0 ];
    o.position.set(p[0] * MM, p[1] * MM, p[2] * MM);
    o.rotation.set(d[0] * ANG, d[1] * ANG, d[2] * ANG, "YXZ");
    o.userData.actor = a;
    mgr.mundo.add(o);
    mgr.ctx.teñir?.(o);
    const r = {
      actor: a,
      o: o,
      destruir() {
        o.removeFromParent();
      }
    };
    mgr.extras = (mgr.extras || []).concat(r);
    return r;
  } catch (e) {
    console.warn("[jefes] WALL", url, e.message);
    return null;
  }
}

function paredDinamica(a, ctx) {
  const q = a.opts?.p;
  if (!Array.isArray(q) || q.length < 6 || !ctx.paredes) return null;
  const h = (a.opts.h?.[0] ?? 2e3) * MM, A = new THREE.Vector3(q[0], q[1], q[2]).multiplyScalar(MM), B = new THREE.Vector3(q[3], q[4], q[5]).multiplyScalar(MM);
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.Float32BufferAttribute([ A.x, A.y, A.z, B.x, B.y, B.z, B.x, B.y + h, B.z, A.x, A.y, A.z, B.x, B.y + h, B.z, A.x, A.y + h, A.z ], 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  }));
  m.userData.propio = m.userData.sinColision = true;
  (ctx.mundo || ctx.juego.ctx.mundo).add(m);
  ctx.paredes.push(m);
  return {
    actor: a,
    o: m,
    destruir() {
      m.removeFromParent();
      const i = ctx.paredes.indexOf(m);
      if (i >= 0) ctx.paredes.splice(i, 1);
    }
  };
}

export function jefesDe(juego) {
  return juego?.__jefes || null;
}
