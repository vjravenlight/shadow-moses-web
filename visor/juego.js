// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { clip, cargarAnims, avanceClip } from "./anim.js";

import { ducto, ALTURA_CONTROL } from "./ducto.js";

import * as ctl from "./controles.js";

const MM = .001, FPS = 30, ANG = Math.PI * 2 / 4096;

const dirDe = (dx, dz) => (Math.round(Math.atan2(dx, dz) / ANG) % 4096 + 4096) % 4096;

const difAbs = (a, b) => {
  const d = ((a - b) % 4096 + 4096) % 4096;
  return d > 2048 ? 4096 - d : d;
};

const difS = (a, b) => {
  const d = ((a - b) % 4096 + 4096) % 4096;
  return d > 2048 ? d - 4096 : d;
};

const randU = n => Math.floor(Math.random() * 32767) & n - 1;

const nearPhase = (f, t) => {
  let d = f - t & 4095;
  if (d > 2048) d -= 4096;
  return t + d;
};

const nearExp8 = (f, t) => {
  const d = t - f;
  return d > -8 && d < 8 ? t : f + Math.trunc(d / 8);
};

const and12 = a => (a % 4096 + 4096) % 4096;

const _v = new THREE.Vector3, _ejeX = new THREE.Vector3(1, 0, 0);

const nearExp4P = (f, t) => {
  const a = nearPhase(f, t), d = t - a;
  return (d > -4 && d < 4 ? t : a + Math.trunc(d / 4)) & 4095;
};

function mirarCostado(g) {
  if (g.sup !== 1 && g.sup !== 2) return;
  const t = Math.max(0, g.tSup - 1), k = t < 4 ? t * 256 : 1024;
  g.facedir = g.rot + (g.sup === 1 ? -k : k) + 4096 & 4095;
}

const RADIOS = [ 2500, 3500, 4e3, 5e3, 5500, 5600, 5700, 5800 ];

const ALT_SNAKE = [ 1100, 496, 136 ];

const DAÑO_BALA = [ 64, 64, 96, 128, 128 ];

export const VIB = {
  leve: [ [ 225, 1 ], [ 255, 2 ] ],
  derribo: [ [ 225, 1 ], [ 255, 4 ], [ 225, 2 ], [ 75, 8 ] ],
  muerte: [ [ 155, 3 ] ],
  estornudo: [ [ 0, 2 ], [ 140, 4 ], [ 80, 6 ] ],
  cuello: [ [ 60, 2 ], [ 200, 4 ], [ 40, 2 ] ],
  aviso: [ [ 255, 10 ] ],
  forcejeo: [ [ 255, 4 ] ]
};

const LEVE = new Set([ 1, 3, 8 ]);

const ANIM_DAÑO = {
  ninguna: [ 63, 65, 67, 68, 69, 70, 71, 72, 66 ],
  socom: [ 61, 64, 67, 68, 69, 70, 71, 72, 66 ],
  famas: [ 62, 83, 67, 68, 69, 70, 71, 72, 66 ]
};

const DAÑO_DE_ARMA = [ "socom", "famas", "ninguna", "famas", "famas", "ninguna", "ninguna", "ninguna", "ninguna", "ninguna" ];

const DUR_DAÑO = {
  sacudon: 13,
  sacudonTierra: 28,
  derribo: 45,
  levanta: 25
};

const ANIM_AGARRE = {
  tirarD: 36,
  tirarI: 37,
  apretar: 38,
  cuello: 39,
  arrastrar: 13
};

const HUELLAS = 48, VIDA_HUELLA = 390, PASO_HUELLA = .98;

const O2_MAX = 1024;

export const sfx = {
  hook: null
};

export function sonido(tipo, pos) {
  if (sfx.hook) sfx.hook(tipo, pos);
}

const texMarcas = {};

function marca(texto, color) {
  const k = texto === "!" ? "b_mark" : "q_mark";
  if (!texMarcas[k]) {
    texMarcas[k] = (new THREE.TextureLoader).load(`assets/hud/${k}.png`);
    texMarcas[k].colorSpace = THREE.SRGBColorSpace;
    texMarcas[k].magFilter = THREE.NearestFilter;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texMarcas[k],
    color: color,
    depthTest: false,
    transparent: true
  }));
  s.scale.set(.5, .5, 1);
  s.renderOrder = 999;
  s.visible = false;
  return s;
}

let texKirari = null;

function destelloOjos(g) {
  texKirari ||= (() => {
    const t = (new THREE.TextureLoader).load("assets/hud/kirari.png");
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    return t;
  })();
  const map = texKirari.clone();
  map.repeat.set(1 / 3, 1);
  map.needsUpdate = true;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: map,
    color: (new THREE.Color).setRGB(100 / 128, 100 / 128, 100 / 128, THREE.SRGBColorSpace),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  s.scale.set(.35, .2, 1);
  s.renderOrder = 998;
  s.userData.propio = s.userData.sinColision = true;
  let cab = null;
  g.o.traverse(o => {
    if (!cab && /hueso_6$/.test(o.name)) cab = o;
  });
  if (cab) {
    s.position.set(0, .08, .05);
    cab.add(s);
  } else {
    s.position.set(0, 1.7, .05);
    g.o.add(s);
  }
  return {
    s: s,
    t: 6
  };
}

function cuadroDestello(d) {
  if (--d.t <= 0) {
    d.s.removeFromParent();
    d.s.material.map.dispose();
    d.s.material.dispose();
    return false;
  }
  let k = 5 - d.t;
  if (k >= 3) k -= 3;
  d.s.material.map.offset.set(k / 3, 0);
  return true;
}

const BIT_GUARDIAS = (() => {
  try {
    return new URLSearchParams(location.search).get("guardiasbit") === "1" ? 1 : 2;
  } catch {
    return 2;
  }
})();

const A = {
  PARADO: 0,
  CAMINAR: 1,
  CORRER: 2,
  APUNTAR: 3,
  DISPARAR: 4,
  GRANADA: 7,
  CULATAZO: 8,
  MIRAR_D: 9,
  MIRAR_I: 10,
  MIRAR_ABAJO: 11,
  AGACHADO_RUIDO: 13,
  MIRAR_ARRIBA: 14,
  SACUDON: 15,
  SORPRESA: 16,
  ESTIRARSE: 19,
  DORMIR: 20,
  DESPERTAR: 21,
  RADIO: 22,
  CUELLO: 23,
  ESTORNUDO: 24,
  POSE_I: 25,
  POSE_I2: 26,
  AGARRADO: 27,
  PRE_CUELLO: 28,
  CUELLO_ROTO: 29,
  SOLTADO: 30,
  CUBRIRSE: 32,
  CAE_RAPIDO: 34,
  EMPUJADO_ATRAS: 35,
  EMPUJADO_ADELANTE: 36,
  CAE: 37,
  PISO_ABAJO: 39,
  PISO_ARRIBA: 40,
  PISO_CARA: 41,
  LEVANTA_CARA: 42,
  LEVANTA_ESPALDA: 43,
  LEVANTA_GOLPE_ABAJO: 44,
  LEVANTA_GOLPE_ESPALDA: 45,
  ARRASTRADO: 48,
  LEVANTA_MSJ: 49,
  NODO15: 50
};

const SUPERPUESTAS = {
  1: A.MIRAR_D,
  2: A.MIRAR_I,
  4: A.MIRAR_ABAJO,
  8192: A.MIRAR_ARRIBA,
  64: A.ESTORNUDO,
  128: A.RADIO,
  1024: A.CUELLO,
  2048: A.ESTIRARSE,
  512: A.ESTIRARSE,
  8388608: A.POSE_I,
  16777216: A.POSE_I2,
  1048576: A.GRANADA
};

const ORDEN_SUP = [ 1, 2, 4, 8192, 64, 128, 1024, 2048, 512, 8388608, 16777216 ];

const FIN_PROPIO = new Set([ 64, 128, 1024, 2048, 8388608, 16777216, 1048576 ]);

const SIN_VISTA = new Set([ 64, 128, 2048, 512 ]);

const VISTA_CORTA = new Set([ 4, 8192, 8388608, 16777216 ]);

const BOTON_NODO = [ 0, 1, 2, 4, 8192, 64, 128, 512, 1024, 2048, 256, 8388608, 16777216, 67108864, 134217728, 0 ];

const ESPERAS = [ 450, 15, 30, 60, 90, 0, 32001, 3e4 ];

const PROB = [ 100, 50, 25, 10 ];

const ROTAN = new Set([ "quieto", "camina", "apunta", "sorpresa", "agachadoRuido", "culatazo", "patea", "granada" ]);

const SE_PINNUKI = 44, SE_GRENADE_HIT = 43, SE_EXPLOSION = 41, SE_V_ENE_GRENADE = 131;

export class Juego {
  constructor(ctx) {
    this.ctx = ctx;
    this.activo = true;
    this.modo = 0;
    this.tiempo = 0;
    this.vida = 1;
    this.muerto = false;
    this.arma = {
      nombre: "SOCOM",
      balas: 12,
      cargador: 12,
      reserva: 36,
      recargando: 0
    };
    this.agarrado = null;
    this.acum = 0;
    this.frame = 0;
    this.gvTime = 0;
    this.balas = [];
    this.ruido = {
      p: 0,
      len: 0,
      pos: new THREE.Vector3
    };
    this.sn = {
      inv: 0,
      reac: null,
      parpadeo: false,
      boton: false,
      cuadrado: false,
      tSuelto: 0,
      tSin: 0,
      combo: null,
      estornudo: 0,
      tEstornudo: 0,
      mov: false,
      vel: 0,
      prev: null,
      accion: null
    };
    this.o2 = O2_MAX;
    this.o2s = [];
    this.aguas = [];
    this.camionesCaja = [];
    this.huellas = {
      lista: [],
      sig: 0,
      activas: 0,
      charco: 0,
      dist: 0,
      lado: 0,
      mallas: []
    };
    this._tecla = () => {
      this.sn.boton = true;
    };
    if (typeof addEventListener === "function") {
      addEventListener("keydown", this._tecla);
      addEventListener("pointerdown", this._tecla);
    }
    this.velArrastre = 0;
    if (typeof fetch === "function") cargarAnims("snake").then(d => {
      this.velArrastre = avanceClip(d, "anim " + ANIM_AGARRE.arrastrar) || 0;
    }).catch(() => {});
    this.preparar();
  }
  preparar() {
    const hz = this.ctx.hz;
    this.paredColG?.removeFromParent();
    const posV = [], posC = [], posG = [];
    this.segs = [];
    if (hz) for (const g of hz.grupos) for (const w of g.paredes) {
      const a = w.a.map(v => v * MM), b = w.b.map(v => v * MM), h = w.alto * MM;
      this.segs.push({
        a: a,
        b: b,
        h: h,
        flags: w.flags
      });
      const quad = [ a[0], a[1], a[2], b[0], b[1], b[2], b[0], b[1] + h, b[2], a[0], a[1], a[2], b[0], b[1] + h, b[2], a[0], a[1] + h, a[2] ];
      if (!(w.flags & 4)) posV.push(...quad);
      if (!(w.flags & 1)) posC.push(...quad);
      if (!(w.flags & 2)) posG.push(...quad);
    }
    const malla = pos => {
      const geo = new THREE.BufferGeometry;
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = true;
      this.ctx.mundo.add(m);
      return m;
    };
    this.vista = malla(posV);
    this.paredCol = malla(posC);
    this.paredColG = malla(posG);
    this.paredColG.removeFromParent();
    this.ray = new THREE.Raycaster;
    this.pisos = [];
    this.grilla = new Map;
    if (hz) for (const g of hz.grupos) for (const f of g.pisos) {
      const q = f.puntos.map(p => [ p[0] * MM, p[1] * MM, p[2] * MM ]);
      const i = this.pisos.push(q) - 1;
      const xs = q.map(p => p[0]), zs = q.map(p => p[2]);
      for (let cx = Math.floor(Math.min(...xs) / 2); cx <= Math.floor(Math.max(...xs) / 2); cx++) for (let cz = Math.floor(Math.min(...zs) / 2); cz <= Math.floor(Math.max(...zs) / 2); cz++) {
        const k = cx * 100003 + cz;
        if (!this.grilla.has(k)) this.grilla.set(k, []);
        this.grilla.get(k).push(i);
      }
    }
    this.zonas = hz ? hz.zonas.map(z => ({
      p: new THREE.Vector3(z.p[0] * MM, z.p[1] * MM, z.p[2] * MM),
      w: z.w * MM,
      h: z.h * MM,
      v: z.vecinas.filter(n => n < hz.zonas.length),
      d: z.dist
    })) : [];
    const n = this.zonas.length;
    this.saltos = [];
    for (let i = 0; i < n; i++) {
      const row = new Uint8Array(n).fill(255);
      row[i] = 0;
      const cola = [ i ];
      while (cola.length) {
        const z = cola.shift();
        for (const m of this.zonas[z].v) if (row[m] === 255) {
          row[m] = row[z] + 1;
          cola.push(m);
        }
      }
      this.saltos.push(row);
    }
    const co = this.ctx.comandante || {};
    const num = (k, d) => Array.isArray(co[k]) && typeof co[k][0] === "number" ? co[k] : d;
    this.com = {
      frame: 0,
      modo: 0,
      alerta: 0,
      evasion: 0,
      huboAlerta: !!(num("a", [ 0 ])[0] & 1),
      vista: num("l", [ 4e3, 4e3, 4e3 ]),
      ruidoDis: num("y", [ 8e3 ])[0],
      decr: [ 4, 3, 2 ][num("t", [ 0 ])[0]] || 4,
      punto: new THREE.Vector3,
      tienePunto: false,
      puntoEsSnake: false,
      snakeZona: -1,
      snakePos: this.ctx.rig.position.clone(),
      vozCd: 0,
      elegidas: new Set,
      tickLatido: 0,
      bikkuri: 0,
      explosiones: 0,
      oyente: null,
      resetMax: num("b", [ 5 ])[0],
      resetNum: 0,
      puntosReset: [],
      danbowl: 0,
      reponerSiempre: num("reponer_siempre", [ 0 ])[0] === 1
    };
    const v = Array.isArray(co.v) ? co.v.filter(x => typeof x === "number") : [];
    for (let i = 0; i + 2 < v.length && this.com.puntosReset.length < 4; i += 3) {
      const z = this.zonaOCercana(new THREE.Vector3(v[i] * MM, v[i + 1] * MM, v[i + 2] * MM));
      if (z >= 0) this.com.puntosReset.push(z);
    }
    this.trampas = {
      asiato: [],
      pool: [],
      poolato: [],
      nohidden: []
    };
    if (hz) for (const gr of hz.grupos) for (const t of gr.triggers || []) if (t.tipo === "trap" && this.trampas[t.nombre] && t.caja) this.trampas[t.nombre].push(t.caja);
    this.ctx.guardias.forEach((g, i) => {
      g.num = i;
      this.prepararGuardia(g);
    });
  }
  prepararGuardia(g) {
    const o = g.opts || g.o.userData.guardia?.opts || {};
    const num = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    if (g.num == null) g.num = Math.max(0, this.ctx.guardias.indexOf(g));
    g.estado = "patrulla";
    g.marca = marca("!", 16726570);
    g.o.add(g.marca);
    g.marca.position.y = 2.25;
    g.marcaQ = marca("?", 16777215);
    g.o.add(g.marcaQ);
    g.marcaQ.position.y = 2.25;
    g.marcaT = 0;
    g.vital = num("l", 192);
    g.vitalMax = g.vital;
    g.faint = num("f", 10);
    g.faintMax = g.faint;
    g.tipo = num("b", 65);
    const ga = g.o.userData.guardia || {};
    g.escala = ga.escala || 1;
    g.altCtrl = (ga.alt_ctrl || 0) * MM;
    g.pasoCaminar = ga.paso_caminar ? ga.paso_caminar * MM : .05;
    const nz = o.n;
    g.zonaAsignada = -1;
    if (Array.isArray(nz) && nz.length >= 3 && typeof nz[1] === "number" && nz[1] < 3e4) g.zonaAsignada = this.zonaDe(new THREE.Vector3(nz[0] * MM, nz[1] * MM, nz[2] * MM));
    g.esperas = ESPERAS.slice();
    g.dirs = [ 0, 1024, 2048, 3072 ];
    if (Array.isArray(o.t) && o.t.length >= 4) for (let i = 0; i < 4; i++) g.esperas[i + 1] = o.t[i];
    if (Array.isArray(o.i) && o.i.length >= 4) g.dirs = o.i.slice(0, 4);
    g.nodos = g.pts.length ? g.pts.map((p, i) => ({
      p: p,
      cmd: g.puntosCmd && g.puntosCmd[i] || 0
    })) : [ {
      p: g.o.position.clone(),
      cmd: 0
    } ];
    g.rot = dirDe(Math.sin(g.o.rotation.y), Math.cos(g.o.rotation.y));
    g.turn = g.rot;
    g.facedir = g.rot;
    g.vel = 0;
    g.pad = {
      dir: -1,
      mode: 0,
      press: 0,
      sound: 0,
      time: 0,
      tmp: 0
    };
    g.think = {
      t1: 0,
      t2: 0,
      t3: 0,
      t4: 0,
      c3: 0,
      l: 0,
      modetime: [ 0, 0 ],
      objetivo: g.nodos[0].p.clone(),
      nodo: 0,
      enCamino: false,
      pasoZona: null,
      saltar: false,
      ratio: 0,
      zonaBus: -1
    };
    g.vision = {
      len: 0,
      angle: 512,
      b92: 0,
      b94: 0
    };
    g.alertLevel = 0;
    g.snDir = 0;
    g.snDis = 3e4;
    g.ba1 = 0;
    g.ba3 = 7 | (o.c ? 16 : 0);
    g.ruidoP = 0;
    g.ruidoPos = new THREE.Vector3;
    g.rank = 0;
    g.radio = 2500;
    g.inicioPos = g.nodos[0].p.clone();
    g.accion = "quieto";
    g.tAcc = 0;
    g.sup = 0;
    g.tSup = 0;
    g.supAct = null;
    g.supFin = false;
    g.actStatus = 0;
    g.caida = 0;
    g.tPiso = 0;
    g.dañoFrame = -1;
    g.rSphere = -1;
    g.durmiendo = false;
    g.capturado = false;
    g.combo = 0;
    g.tCombo = 0;
    g.balaPendiente = false;
    g.tDisp = null;
    g.resets = typeof (o.g && o.g[0]) === "number" ? o.g[0] : 255;
    if (g.tipo === 90) g.resets = 0;
    g.reset = null;
    g.huella = -1;
    g.adjust = {
      a2: 0,
      a6: 0,
      a7: 0,
      activo: false
    };
    g.o.position.copy(g.nodos[0].p);
    this.ponerClip(g, A.PARADO);
  }
  reanudarRuta(g) {
    const T = g.think;
    let mi = 0, md = 1e9;
    g.nodos.forEach((nd, i) => {
      const d = nd.p.distanceTo(g.o.position);
      if (d < md) {
        md = d;
        mi = i;
      }
    });
    T.nodo = mi;
    T.objetivo = g.nodos[mi].p.clone();
    T.t1 = 0;
    T.t2 = 0;
    this.paso(g, 1);
    g.pad.mode = 0;
  }
  alturaPiso(x, z, y) {
    const e = this.ctx.pisoExtra?.(x, z, y);
    let mejor = e != null && e <= y + .6 ? e : null;
    const lista = this.grilla.get(Math.floor(x / 2) * 100003 + Math.floor(z / 2));
    if (!lista) return mejor;
    const tri = (a, b, c) => {
      const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      if (Math.abs(d) < 1e-9) return null;
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d, v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d, w = 1 - u - v;
      if (u < -1e-4 || v < -1e-4 || w < -1e-4) return null;
      return u * a[1] + v * b[1] + w * c[1];
    };
    for (const i of lista) {
      const q = this.pisos[i];
      let h = tri(q[0], q[1], q[2]);
      if (h === null) h = tri(q[0], q[2], q[3]);
      if (h !== null && h <= y + .6 && (mejor === null || h > mejor)) mejor = h;
    }
    return mejor;
  }
  libre(desde, hasta) {
    const d = hasta.clone().sub(desde);
    const L = d.length();
    if (L < .001) return true;
    this.ray.set(desde, d.normalize());
    this.ray.far = L;
    return this.ray.intersectObject(this.vista, false).length === 0;
  }
  chocar(p, r, bit = 1) {
    for (const s of this.segs) {
      if (s.flags & bit) continue;
      const y0 = Math.min(s.a[1], s.b[1]), y1 = Math.max(s.a[1], s.b[1]) + s.h, py = p.y + .75;
      if (py < y0 || py > y1) continue;
      const ax = s.a[0], az = s.a[2], bx = s.b[0], bz = s.b[2];
      if (p.x < Math.min(ax, bx) - r || p.x > Math.max(ax, bx) + r || p.z < Math.min(az, bz) - r || p.z > Math.max(az, bz) + r) continue;
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / L2));
      const cx = ax + dx * t, cz = az + dz * t, ex = p.x - cx, ez = p.z - cz, d = Math.hypot(ex, ez);
      if (d >= r || d < 1e-5) continue;
      p.x += ex / d * (r - d);
      p.z += ez / d * (r - d);
    }
  }
  dentroZona(z, p) {
    return Math.abs(p.y - z.p.y) <= 2 && Math.abs(p.x - z.p.x) <= z.w && Math.abs(p.z - z.p.z) <= z.h;
  }
  zonaDe(p) {
    for (let i = 0; i < this.zonas.length; i++) if (this.dentroZona(this.zonas[i], p)) return i;
    return -1;
  }
  distZonaPos(z, p) {
    let s = 0, l = Math.abs(p.x - z.p.x) - z.w;
    if (l > 0) s += l;
    l = Math.abs(p.z - z.p.z) - z.h;
    if (l > 0) s += l;
    l = Math.abs(z.p.y - p.y);
    if (l > 2) s += l;
    return s;
  }
  zonaCercana(p) {
    let mejor = -1, md = 1e9;
    this.zonas.forEach((z, i) => {
      const d = this.distZonaPos(z, p);
      if (d < md) {
        md = d;
        mejor = i;
      }
    });
    return mejor;
  }
  entreZonas(a, b, p) {
    if (p.y < a.p.y && p.y < b.p.y) return false;
    if (p.y - 2 > a.p.y && p.y - 2 > b.p.y) return false;
    if (p.x < a.p.x - a.w && p.x < b.p.x - b.w) return false;
    if (p.x > a.p.x + a.w && p.x > b.p.x + b.w) return false;
    if (p.z < a.p.z - a.h && p.z < b.p.z - b.h) return false;
    if (p.z > a.p.z + a.h && p.z > b.p.z + b.h) return false;
    return true;
  }
  direccion(p, prev = 65535) {
    const Z = this.zonas, N = Z.length;
    if (!N) return 65535;
    let z1 = prev & 255, z2 = prev >> 8 & 255;
    if (z1 >= N) z1 = 255;
    if (z2 >= N) z2 = 255;
    if (z2 === 255) z2 = z1;
    const dentroVec = z => {
      for (const n of Z[z].v) if (this.dentroZona(Z[n], p)) return n;
      return -1;
    };
    const entreVec = z => {
      for (const n of Z[z].v) if (this.entreZonas(Z[z], Z[n], p)) return n;
      return -1;
    };
    if (z1 === z2) {
      if (z1 !== 255) {
        if (this.dentroZona(Z[z1], p)) return z1 | z1 << 8;
        const n = entreVec(z1);
        if (n >= 0) return z1 | n << 8;
      }
    } else {
      if (this.dentroZona(Z[z1], p)) return z1 | z1 << 8;
      if (this.dentroZona(Z[z2], p)) return z2 | z2 << 8;
      let n = dentroVec(z1);
      if (n >= 0) return n | n << 8;
      n = dentroVec(z2);
      if (n >= 0) return n | n << 8;
      if (this.entreZonas(Z[z1], Z[z2], p)) return z1 | z2 << 8;
      n = entreVec(z1);
      if (n >= 0) return z1 | n << 8;
      n = entreVec(z2);
      if (n >= 0) return n | z2 << 8;
    }
    const z = this.zonaCercana(p);
    return (z < 0 ? 255 : z) | 255 << 8;
  }
  alcance(a1, a2) {
    let z1 = a1 & 255, z2 = a1 >> 8 & 255, z3 = a2 & 255, z4 = a2 >> 8 & 255;
    if (z2 === 255) z2 = z1;
    if (z4 === 255) z4 = z3;
    const existe = (a, b) => a < this.zonas.length && this.zonas[a].v.includes(b);
    if (z1 === z2) {
      if (z3 === z4) {
        if (z1 === z3) return 0;
        if (existe(z1, z3)) return 2;
      } else if (z2 === z3 || z2 === z4) return 1;
    } else if (z3 === z4) {
      if (z1 === z3 || z2 === z3) return 1;
    } else {
      if (z1 === z3 && z2 === z4) return 0;
      if (z1 === z3 || z1 === z4 || z2 === z3 || z2 === z4) return 2;
    }
    return 3;
  }
  ruta(a, b) {
    return a === 255 || b === 255 || a >= this.zonas.length || b >= this.zonas.length ? 255 : this.saltos[a][b];
  }
  zonaNavegar(z1, z3, alterno) {
    if (z1 === z3) return z1;
    let ms = 255, mejor = z1;
    for (const n of this.zonas[z1].v) {
      const r = this.ruta(n, z3);
      if (r < ms || alterno && r === ms) {
        ms = r;
        mejor = n;
      }
    }
    return mejor;
  }
  navegarDir(a1, a2, p, alterno) {
    let z1 = a1 & 255, z2 = a1 >> 8 & 255, z3 = a2 & 255, z4 = a2 >> 8 & 255;
    if (z2 === 255) return z1;
    if (z1 === z2) {
      if (z1 === z3 || z1 === z4) return z1;
      if (z4 !== z3 && z3 !== 255 && this.ruta(z1, z4) < this.ruta(z1, z3)) z3 = z4;
      return this.zonaNavegar(z1, z3, alterno);
    }
    let r1 = this.ruta(z1, z3), r2 = this.ruta(z2, z3);
    if (z3 !== z4 && z4 !== 255) {
      const r3 = this.ruta(z1, z4), r4 = this.ruta(z2, z4);
      if (r3 < r1) r1 = r3;
      if (r4 < r2) r2 = r4;
    }
    if (r1 === r2) {
      r1 = this.distZonaPos(this.zonas[z1], p);
      r2 = this.distZonaPos(this.zonas[z2], p);
    }
    return r2 < r1 ? z2 : z1;
  }
  zonaOCercana(p) {
    const z = this.zonaDe(p);
    return z >= 0 ? z : this.zonaCercana(p);
  }
  navegar(desde, hasta, alterno) {
    if (desde < 0 || hasta < 0 || desde === hasta) return hasta;
    let mejor = -1, ms = 255;
    for (const n of this.zonas[desde].v) {
      const s = this.saltos[n][hasta];
      if (s < ms || alterno && s === ms) {
        ms = s;
        mejor = n;
      }
    }
    return mejor;
  }
  reachTo(a, b) {
    if (a < 0 || b < 0) return 3;
    const s = this.saltos[a][b];
    return s === 0 ? 0 : s === 1 ? 1 : s === 255 ? 3 : 2;
  }
  distZona(a, b) {
    if (a < 0 || b < 0 || this.saltos[a][b] === 255) return 1e5;
    let z = a, acc = 0, k = 0;
    while (z !== b && k++ < 300) {
      const n = this.navegar(z, b, false);
      if (n < 0) return 1e5;
      const i = this.zonas[z].v.indexOf(n);
      acc += this.zonas[z].d[i] || 0;
      z = n;
    }
    return acc;
  }
  boundOutZone(desde, hacia, umbral) {
    if (desde < 0 || hacia < 0) return -1;
    let z = desde, acc = 0, k = 0;
    while (z !== hacia && k++ < 300) {
      const n = this.navegar(z, hacia, false);
      if (n < 0) break;
      const i = this.zonas[z].v.indexOf(n);
      acc += this.zonas[z].d[i] || 0;
      z = n;
      if (acc > umbral && !this.ctx.enPantalla(this.zonas[z].p)) return z;
    }
    return -1;
  }
  setRuido(p, len, pos) {
    const r = this.ruido;
    if (p > r.p || p === r.p && len > r.len) {
      r.p = p;
      r.len = len;
      r.pos.copy(pos);
    }
  }
  ruidoPared(pos) {
    this.setRuido(100, 16, pos);
  }
  update(dt) {
    this.acum += dt;
    let n = 0;
    while (this.acum >= 1 / FPS && n < 4) {
      this.acum -= 1 / FPS;
      this.cuadro();
      n++;
    }
    if (n === 4) this.acum = 0;
  }
  activos() {
    return this.ctx.guardias.filter(g => !g.inactivo && !g.faseout);
  }
  postura() {
    return this.ctx.postura ? this.ctx.postura() : 0;
  }
  puntoSnake() {
    const p = this.ctx.rig.position.clone();
    p.y += ALT_SNAKE[this.postura()] * MM;
    return p;
  }
  cuadro() {
    this.frame++;
    this.gvTime++;
    const espectador = !this.activo || this.ctx.vuelo() || this.muerto;
    const yo = this.ctx.rig.position, snake = this.puntoSnake();
    if (this.arma.recargando > 0 && --this.arma.recargando <= 0) {
      const k = Math.min(this.arma.cargador - this.arma.balas, this.arma.reserva);
      this.arma.balas += k;
      this.arma.reserva -= k;
    }
    if (this.ruido.len > 0 && --this.ruido.len <= 0) this.ruido.p = 0;
    this.cuadroSnake(espectador);
    this.comandanteAntes();
    for (const g of this.activos()) {
      if (g.marcaT > 0 && --g.marcaT === 0 && g.marca) {
        g.marca.visible = g.marcaQ.visible = false;
      }
      if (g.tCombo > 0 && --g.tCombo === 0) g.combo = 0;
      this.mover(g);
      if (g.accion !== "muerto") {
        this.vision(g, snake, espectador);
        this.flagsPercepcion(g);
        this.nivelAlerta(g);
        this.pensar(g);
      }
      this.actuar(g);
    }
    this.comandanteDespues();
    if (this.destellos?.length) this.destellos = this.destellos.filter(cuadroDestello);
    this.balasCuadro(yo);
    this.cuadroGranadas();
    if (!espectador && this.ctx.inventario) this.ctx.inventario.cuadroItems(this.ctx.items, yo); else if (!espectador) for (const it of this.ctx.items) {
      if (!it.obj.visible) continue;
      if (it.obj.position.distanceTo(yo) < .8 || it.obj.position.distanceTo(snake) < .8) {
        it.obj.visible = false;
        sonido("item");
        if (/RATION/i.test(it.nombre)) this.vida = Math.min(1, this.vida + .35);
        if (/SOCOM|BULLET|BALA|AMMO/i.test(it.nombre)) this.arma.reserva = Math.min(108, this.arma.reserva + 12);
        this.ctx.aviso(`${it.nombre}`);
      }
    }
    if (this.vida <= 0 && !this.muerto && !this.ctx.inventario?.racionAuto()) {
      this.muerto = true;
      this.ctx.gameOver();
    }
  }
  comandanteAntes() {
    const c = this.com, gs = this.activos();
    const z = this.zonaDe(this.ctx.rig.position);
    if (z >= 0) {
      c.snakeZona = z;
      c.snakePos.copy(this.ctx.rig.position);
    }
    const orden = gs.slice().sort((a, b) => a.snDis - b.snDis);
    orden.forEach((g, i) => {
      g.rank = i;
      g.radio = RADIOS[Math.min(i, 7)];
    });
    c.oyente = null;
    if (c.modo !== 1 && this.ruido.p === 100) {
      let md = 300, mejor = null;
      const zr = this.zonaOCercana(this.ruido.pos);
      for (const g of gs) {
        if (g.actStatus & 40) continue;
        if (g.o.position.distanceTo(this.ruido.pos) * 1e3 >= c.ruidoDis) continue;
        const d = this.distZona(this.zonaOCercana(g.o.position), zr);
        if (d < md) {
          md = d;
          mejor = g;
        }
      }
      c.oyente = mejor;
    }
  }
  comandanteDespues() {
    const c = this.com, gs = this.activos();
    let mx = 0;
    for (const g of gs) mx = Math.max(mx, g.alertLevel);
    c.alerta = mx >= c.alerta ? mx : Math.max(mx, c.alerta - 4);
    if (c.top) {
      c.alerta = Math.max(c.alerta, c.top);
      c.top = 0;
    }
    if (c.modo === 0) {
      if (c.alerta >= 255) this.ponerModo(1);
    } else if (c.modo === 1) {
      if (c.alerta <= 0) this.ponerModo(2);
    } else {
      if (c.alerta >= 255) this.ponerModo(1); else if (--c.evasion <= 0) this.ponerModo(0); else if (c.evasion === 60) this.ctx.alModo?.("fin");
    }
    if (c.modo === 2) {
      if (gs.some(g => g.snDis < 6e3) && ++c.tickLatido >= 40) {
        c.tickLatido = 0;
        if (!c.pasosOff) sonido("latido");
      }
    }
    if (c.vozCd > 0) c.vozCd--;
    if (c.vozCd === 0) {
      const pide = gs.filter(g => g.pad.sound).sort((a, b) => a.snDis - b.snDis);
      if (pide.length) {
        c.vozCd = 30;
        this.voz(pide[0], pide[0].pad.sound);
      }
      for (const g of gs) g.pad.sound = 0;
    }
    if (c.bikkuri > 0) c.bikkuri--;
    this.refuerzos();
    c.frame++;
    this.modo = c.modo;
    this.tiempo = c.modo === 1 ? c.alerta * 99.99 / 255 : c.modo === 2 ? c.evasion / FPS : 0;
  }
  ponerModo(m) {
    const c = this.com;
    if (m === c.modo) return;
    if (m === 1 && c.modo === 0) c.resetNum = 0;
    c.modo = m;
    if (m === 1) c.huboAlerta = true;
    if (m === 2) {
      c.evasion = 300;
      c.elegidas.clear();
      c.explosiones = 0;
    }
    if (m === 0) c.explosiones = 0;
    this.ctx.alModo?.(m);
  }
  voz(g, codigo) {
    const F = this.com.frame;
    const tabla = {
      240: this.com.huboAlerta ? "v_ahi" : "v_quien",
      241: "v_ruido",
      242: "v_caja",
      243: "v_huellas",
      244: "v_nada",
      245: "v_vuelvan",
      246: F % 3 ? "v_aca" : "v_ahi",
      247: F % 2 ? null : "v_aca"
    };
    const n = codigo in tabla ? tabla[codigo] : codigo;
    if (n) sonido(n, null);
  }
  alertaExterna(v) {
    this.com.top = Math.max(this.com.top || 0, v);
  }
  puntoComandante(pos, esSnake) {
    this.com.punto.copy(pos);
    this.com.tienePunto = true;
    this.com.puntoEsSnake = esSnake;
  }
  gopointSnake() {
    this.puntoComandante(this.com.snakePos, true);
  }
  vision(g, snake, espectador) {
    const c = this.com, gp = g.o.position.clone();
    gp.y += g.altCtrl ? 0 : 1;
    const d = snake.clone().sub(gp);
    g.snDir = dirDe(d.x, d.z);
    g.snDis = Math.round(d.length() * 1e3);
    if (g.myst && "MCD".includes(g.myst.b)) {
      g.vision.b92 = 0;
      return;
    }
    if (espectador || this.sigilo() && g.tipo !== 83) {
      g.vision.b92 = 0;
      return;
    }
    if (ducto.activo) {
      g.vision.b92 = 0;
      return;
    }
    const act = this.activos(), N = Math.max(1, act.length), idx = act.indexOf(g);
    if (c.frame % N !== idx) return;
    g.vision.b92 = 0;
    const eye = c.vista[c.modo] || 4e3;
    if (g.snDis <= eye + 2e3 && Math.abs(d.y) * 1e3 <= 2e3 && (g.snDis < 500 || difAbs(g.facedir, g.snDir) < g.vision.angle) && this.libre(gp, snake)) g.vision.b92 = g.snDis > g.vision.len ? 1 : 2;
  }
  nivelAlerta(g) {
    const b = g.vision.b92;
    if (b === 2) {
      g.alertLevel = Math.min(255, g.alertLevel + 1);
      g.vision.b94 = 2;
    } else if (b === 1) {
      g.alertLevel = Math.max(0, g.alertLevel - 1);
      g.vision.b94 = 1;
    } else if (!(g.vision.b94 === 2 && (ducto.activo || this.noHidden()) && g.vision.len > 0)) {
      g.alertLevel = Math.max(0, g.alertLevel - this.com.decr);
      g.vision.b94 = 0;
    }
  }
  flagsPercepcion(g) {
    g.ba1 = 0;
    const r = this.ruido;
    if (g.ba3 & 1 && !(g.actStatus & 104) && r.p > 0) {
      const dist = g.o.position.distanceTo(r.pos) * 1e3;
      if (r.p === 255 || r.p === 5 && dist < 1500 || r.p === 200 && dist < this.com.ruidoDis || r.p === 100 && this.com.oyente === g) {
        g.ba1 |= 1;
        g.ruidoP = r.p;
        g.ruidoPos.copy(r.pos);
        if (r.p === 100) r.p = 0;
      }
    }
    if (this.com.modo === 1) return;
    const cv = this.ctx.inventario?.cajaVista(g, g.vision.b92, this.ctx.rig.position, this.ctx.yawSnake?.(), this.com.modo);
    if (cv?.caja) {
      g.vision.b92 = 0;
      if (cv.sospecha) g.ba1 |= 2;
      if (cv.cerca) g.ba1 |= 64;
      g.ba1 |= 128;
    }
    if (g.dañoFrame === this.frame || g.capturado) g.ba1 |= 4;
    const p = this.ctx.rig.position, q = g.o.position;
    const cajaQuieta = this.ctx.inventario?.enCaja && !this.sn.mov;
    if (!(g.actStatus & 96) && !this.ctx.vuelo() && !cajaQuieta && Math.abs(p.x - q.x) < .5 && Math.abs(p.z - q.z) < .5 && Math.abs(p.y - q.y) < .8) g.ba1 |= 12;
    if (g.ba3 & 16 && g.think.t2 !== 5 && this.huellas.activas > 0) {
      const m = this.movGuardia(g);
      if (this.enTrampa("asiato", m) || this.enTrampa("poolato", m)) {
        const k = this.huellaCercana(g, m);
        if (k >= 0) {
          g.ba1 |= 16;
          g.huella = k;
        }
      }
    }
  }
  pensar(g) {
    const T = g.think, c = this.com;
    g.pad.dir = -1;
    g.pad.press = 0;
    if ([ "finge", "despierta", "disfraz", "debil", "nodo15" ].includes(g.accion)) return;
    T.c3++;
    if (T.t1 === 0) {
      if (c.modo !== 0 && T.t2 !== 7) {
        this.entrarAlerta(g);
        return;
      }
      if (c.modo !== 0 && T.t2 === 7) T.t1 = 1;
    } else if (T.t1 === 1) {
      if (c.modo !== 1 && T.t2 !== 7) {
        this.entrarEvasion(g);
        return;
      }
    } else if (T.t1 === 2) {
      if (c.modo === 1 && T.t2 !== 7) {
        this.entrarAlerta(g);
        return;
      }
      if (c.modo === 0) {
        T.t1 = 0;
        if (![ 7, 4 ].includes(T.t2)) {
          T.t2 = 6;
          this.paso(g, 3);
        }
      }
    }
    switch (T.t2) {
     case 0:
      this.thPatrulla(g);
      break;

     case 1:
      this.thRuido(g);
      break;

     case 2:
      this.thCaja(g);
      break;

     case 4:
      this.thGolpeado(g);
      break;

     case 5:
      this.thHuellas(g);
      break;

     case 6:
      this.thVolver(g);
      break;

     case 7:
      this.thDescubrir(g);
      break;

     case 8:
      this.thPerseguir(g);
      break;

     case 9:
      this.thAtacar(g);
      break;

     case 10:
      this.thIrPunto(g);
      break;

     case 11:
      this.thEvasionIr(g);
      break;

     case 13:
      this.thBuscar(g);
      break;

     default:
      T.t2 = 0;
      this.paso(g, 0);
    }
  }
  paso(g, t3) {
    g.think.t3 = t3;
    g.think.c3 = 0;
    g.think.l = 0;
  }
  mirarAlrededor(g) {
    const T = g.think, v = Math.floor(T.l / 30) + g.rank;
    if (v === 1 || v === 4) g.pad.press |= 2; else if (v === 2 || v === 5) g.pad.press |= 1;
    return ++T.l >= 92;
  }
  directo(g, obj, r) {
    const dx = obj.x - g.o.position.x, dz = obj.z - g.o.position.z;
    if (Math.abs(dx) < r * MM && Math.abs(dz) < r * MM) return true;
    g.pad.dir = dirDe(dx, dz);
    return false;
  }
  navegarA(g, obj, teletransporte = false) {
    const T = g.think;
    if (!this.zonas.length) return this.directo(g, obj, 350);
    g.dirZona = this.direccion(g.o.position, g.dirZona ?? 65535);
    if (!T.objDirP || T.objDirP.distanceToSquared(obj) > 1e-6) {
      T.objDir = this.direccion(obj);
      T.objDirP = obj.clone();
    }
    const ao = T.objDir, zo = ao & 255, zg = g.dirZona & 255;
    if (zo === 255) return this.directo(g, obj, 350);
    if (teletransporte && g.accion === "camina" && !this.ctx.enPantalla(g.o.position)) {
      const z = this.boundOutZone(zo, zg, 200);
      if (z >= 0 && z !== zg && !this.ctx.enPantalla(this.zonas[z].p)) {
        g.o.position.copy(this.zonas[z].p);
        g.o.position.y += 1;
        g.dirZona = z | z << 8;
      }
    }
    if (this.dentroZona(this.zonas[zo], g.o.position)) {
      T.pasoZona = null;
      return this.directo(g, obj, 350);
    }
    if (!T.pasoZona || T.pasoZona.ao !== ao || this.alcance(g.dirZona, T.pasoZona.dir) <= 0) {
      const alterno = g.rank % 2 === 0;
      const z = this.navegarDir(g.dirZona, ao, g.o.position, alterno);
      const p = this.zonas[z < this.zonas.length ? z : zo].p.clone();
      if (alterno) {
        const s = this.ctx.rig.position;
        p.x += Math.round(s.x * 1e3) & 1 ? .23 : -.23;
        p.z += Math.round(s.z * 1e3) & 1 ? .23 : -.23;
      }
      T.pasoZona = {
        ao: ao,
        dir: z | z << 8,
        p: p
      };
    }
    g.pad.dir = dirDe(T.pasoZona.p.x - g.o.position.x, T.pasoZona.p.z - g.o.position.z);
    return false;
  }
  thinkReset2(g) {
    const T = g.think;
    if (T.t1 === 0) {
      T.t2 = 0;
      this.paso(g, 0);
      T.objetivo = g.nodos[T.nodo].p.clone();
      g.pad.mode = this.distZona(this.zonaOCercana(g.o.position), this.zonaOCercana(T.objetivo)) < 200 ? 0 : 1;
    } else this.entrarEvasion(g);
  }
  descubrir(g) {
    g.think.t2 = 7;
    this.paso(g, 14);
  }
  ponerMarca(g, k) {
    if (g.marca) g.marca.visible = k === 0 || k === 4;
    if (g.marcaQ) g.marcaQ.visible = k === 5;
    g.marcaT = 30;
    if (k === 0 && this.com.bikkuri === 0) {
      this.com.bikkuri = 32;
      sonido("!");
    }
  }
  thPatrulla(g) {
    const T = g.think;
    if (T.t3 === 0) {
      if (this.navegarA(g, T.objetivo)) {
        g.pad.mode = 0;
        this.paso(g, 1);
      }
    } else if (T.t3 === 1) {
      if (T.enCamino && g.pad.time > 0) {
        g.pad.press |= g.pad.tmp;
        g.pad.time--;
      }
      if (this.directo(g, T.objetivo, 350)) {
        T.enCamino = false;
        if (this.comandoNodo(g)) this.paso(g, 2);
      } else if (g.ba1 & 64) {
        this.entrarCaja(g);
        this.paso(g, 12);
        return;
      }
    } else if (T.t3 === 2) {
      g.pad.press |= g.pad.tmp;
      if (g.pad.time > 0 && g.pad.time !== 32001) g.pad.time--;
      if (g.pad.time === 0) {
        this.siguienteNodo(g);
        if (this.cerca(g, T.objetivo, .35)) {
          if (this.comandoNodo(g)) this.paso(g, 2);
        } else this.paso(g, 1);
      }
    }
    if (g.ba1 & 4) this.entrarGolpeado(g); else if (g.ba1 & 2) this.entrarCaja(g); else if (g.ba1 & 1) this.entrarRuido(g); else if (g.ba1 & 16) this.entrarHuellas(g); else if (g.alertLevel > 2) {
      this.gopointSnake();
      this.descubrir(g);
    }
  }
  cerca(g, p, r) {
    return Math.hypot(p.x - g.o.position.x, p.z - g.o.position.z) < r;
  }
  siguienteNodo(g) {
    const T = g.think;
    T.nodo = (T.nodo + 1) % g.nodos.length;
    T.objetivo = g.nodos[T.nodo].p.clone();
  }
  comandoNodo(g, prof = 0) {
    const T = g.think, cmd = g.nodos[T.nodo].cmd;
    const act = cmd & 31, time = cmd >> 5 & 7, dir = cmd >> 8 & 3, con = cmd >> 10 & 7;
    if (act === 31) {
      if (this.reglasVR && this.rutaNodo) this.rutaNodo(g, (cmd >> 10 & 7) + (cmd >> 8 & 3) * 8);
      return false;
    }
    if (act === 10 && g.myst && this.reglasVR) {
      this.chocarPared(g);
      this.siguienteNodo(g);
      return false;
    }
    if ((act === 11 || act === 14 || act === 15) && g.myst && this.reglasVR) {
      if (g.accion !== "quieto" && g.accion !== "camina") return false;
      const m15 = act === 15 ? this.cuadrosClip(A.NODO15) : 0;
      this.quitarSuperpuesta(g);
      this.cambiar(g, act === 11 ? "disfraz" : act === 14 ? "debil" : "nodo15", m15 ? A.NODO15 : A.PARADO, m15 ? {
        loop: false
      } : undefined);
      g.tNodo15 = m15 || 45;
      g.esperaNodo = time === 6 ? Infinity : g.esperas[time] || 0;
      g.subMyst = 0;
      g.tSE = 0;
      this.siguienteNodo(g);
      return false;
    }
    if (time !== 6) {
      const falla = this.gvTime % 100 >= PROB[con & 3];
      if (falla || T.saltar) {
        T.saltar = false;
        this.siguienteNodo(g);
        return prof < 8 && this.cerca(g, T.objetivo, .35) ? this.comandoNodo(g, prof + 1) : false;
      }
      if (con & 4) T.saltar = true;
    }
    let boton = act < 16 ? BOTON_NODO[act] : act < 26 ? BOTON_NODO[act - 16] : 0, espera = g.esperas[time];
    if (this.com.huboAlerta && !(g.myst && this.reglasVR)) {
      if (boton & (128 | 512 | 1024 | 2048)) boton = 0;
      if (espera === 450) espera = 90;
    }
    g.pad.time = espera;
    g.pad.tmp = boton;
    if (act === 0 && time === 0) {
      g.pad.time = 0;
      this.siguienteNodo(g);
      return false;
    }
    if (act >= 16 && act <= 30) {
      T.enCamino = true;
      this.siguienteNodo(g);
      return false;
    }
    const d = g.dirs[dir];
    if (difAbs(g.rot, d) >= 128) g.turn = d;
    return true;
  }
  entrarRuido(g) {
    const T = g.think, p = g.ruidoP;
    T.t2 = 1;
    if (p === 5) {
      this.paso(g, 8);
      return;
    }
    T.objetivo = g.ruidoPos.clone();
    if (p === 200) {
      this.puntoComandante(g.ruidoPos, false);
      this.paso(g, g.actStatus & 16 ? 15 : 6);
      return;
    }
    if (p === 255) {
      this.com.explosiones++;
      T.t2 = 7;
      this.paso(g, 16);
      return;
    }
    T.modetime[0] = 0;
    this.paso(g, g.actStatus & 16 ? 14 : 5);
  }
  thRuido(g) {
    const T = g.think;
    switch (T.t3) {
     case 8:
      g.pad.press |= 33554432;
      g.turn = dirDe(g.ruidoPos.x - g.o.position.x, g.ruidoPos.z - g.o.position.z);
      if (T.c3 === 1) this.ponerMarca(g, 4);
      if (g.ba1 & 1) T.c3 = 1;
      if (T.c3 > 31) this.thinkReset2(g);
      break;

     case 6:
      g.turn = g.snDir;
      if (T.c3 > 15) {
        T.t2 = 7;
        this.paso(g, 16);
      }
      break;

     case 14:
     case 15:
      if (T.c3 === 1) g.pad.press |= 4096; else if (T.c3 > 91 || g.supFin) this.paso(g, T.t3 === 15 ? 6 : 5);
      break;

     case 5:
      {
        if (T.c3 === 1) {
          if (T.t1 === 0) {
            if (T.modetime[0] <= 1) g.pad.sound = 136;
            if (T.modetime[0] <= 3) this.ponerMarca(g, 4);
            g.turn = g.snDir;
          } else if (T.modetime[0] !== 0) {
            g.pad.mode = 1;
            this.paso(g, 9);
            break;
          } else {
            g.pad.sound = 149;
            this.ponerMarca(g, 4);
            g.turn = g.snDir;
          }
        }
        const dur = T.modetime[0] === 0 ? 16 : T.modetime[0] < 3 ? 48 : 0;
        if (T.c3 - 1 >= dur) {
          if (T.modetime[0] === 0 && T.t1 === 0) g.pad.sound = 241;
          T.modetime[0]++;
          g.pad.mode = T.t1 === 0 && T.modetime[0] < 2 ? 0 : 1;
          this.paso(g, 9);
        }
        break;
      }

     case 9:
      if (this.navegarA(g, T.objetivo)) this.paso(g, 11); else if (T.c3 > 32 && g.ba1 & 1 && T.modetime[0] < 3) {
        T.objetivo.copy(g.ruidoPos);
        this.paso(g, 5);
      }
      break;

     case 11:
      if (T.l === 20) {
        this.ponerMarca(g, 5);
        g.pad.sound = T.t1 === 0 ? 244 : 132;
      }
      if (this.mirarAlrededor(g)) this.thinkReset2(g);
      break;

     default:
      this.thinkReset2(g);
    }
    if (g.ba1 & 4) this.entrarGolpeado(g); else if (g.alertLevel > 2) {
      this.gopointSnake();
      this.descubrir(g);
    } else if (g.ba1 & 2) this.entrarCaja(g); else if (g.ba1 & 16) this.entrarHuellas(g); else if (g.ba1 & 1 && (g.ruidoP === 200 || g.ruidoP === 255)) {
      T.objetivo.copy(g.ruidoPos);
      T.t2 = 7;
      this.paso(g, 16);
    }
  }
  entrarGolpeado(g) {
    g.think.t2 = 4;
    this.paso(g, g.actStatus & 16 && g.ba1 & 8 ? 14 : 4);
  }
  thGolpeado(g) {
    const T = g.think;
    if (T.t3 === 14) {
      if (T.c3 === 1) g.pad.press |= 4096; else if (T.c3 > 91 || g.supFin) this.paso(g, 5);
    } else if (T.t3 === 4) {
      if (T.c3 > 2 && g.actStatus & 1) this.paso(g, 5);
    } else if (T.t3 === 5) {
      if (T.c3 === 1) g.turn = g.snDir;
      if (T.c3 === 31) {
        g.pad.sound = 136;
        this.ponerMarca(g, 5);
      }
      if (T.c3 > 30 && this.mirarAlrededor(g)) {
        this.thinkReset2(g);
        return;
      }
      if (g.ba1 & 1 && (g.ruidoP === 200 || g.ruidoP === 255)) {
        T.objetivo.copy(g.ruidoPos);
        T.t2 = 7;
        this.paso(g, 16);
        return;
      }
      if (g.ba1 & 2) {
        this.entrarCaja(g);
        return;
      }
    }
    if (g.ba1 & 4 && !(g.ba1 & 8) && T.t3 === 5) this.paso(g, 4);
    if (g.alertLevel > 1) {
      this.gopointSnake();
      this.descubrir(g);
    }
  }
  thVolver(g) {
    const T = g.think;
    if (T.c3 === 1) g.pad.sound = 245;
    if (T.c3 >= 33) {
      T.objetivo = g.inicioPos.clone();
      T.nodo = g.nodos.length - 1;
      T.t2 = 0;
      this.paso(g, 0);
      g.pad.mode = 1;
      T.modetime = [ 0, 0 ];
    }
    if (g.ba1 & 4) this.entrarGolpeado(g); else if (g.ba1 & 1) this.entrarRuido(g); else if (g.alertLevel > 1) {
      this.gopointSnake();
      this.descubrir(g);
    }
  }
  thDescubrir(g) {
    const T = g.think;
    if (T.t3 === 14) {
      if (T.c3 === 1) {
        this.ponerMarca(g, 0);
        this.vibrar(VIB.aviso);
        (this.destellos ||= []).push(destelloOjos(g));
      }
      if (T.c3 <= 20) {
        g.pad.press |= 32;
        g.turn = g.snDir;
        return;
      }
      g.pad.sound = T.t1 === 0 ? 240 : 246;
      g.alertLevel = 255;
      this.gopointSnake();
      T.t1 = 1;
      T.t2 = 9;
      this.paso(g, 27);
      T.c3 = 32;
      g.pad.mode = 1;
    } else if (T.t3 === 16) {
      if (T.c3 === 1) {
        this.ponerMarca(g, 0);
        this.vibrar(VIB.aviso);
      }
      g.turn = dirDe(T.objetivo.x - g.o.position.x, T.objetivo.z - g.o.position.z);
      if (T.c3 <= 21) return;
      g.alertLevel = 255;
      if (this.com.explosiones < 2) {
        T.t1 = 1;
        T.t2 = 10;
        this.paso(g, 29);
        g.pad.mode = 1;
      } else {
        this.gopointSnake();
        this.entrarAlerta(g);
      }
    } else if (T.t3 === 17) {
      this.gopointSnake();
      g.pad.sound = 246;
      g.alertLevel = 255;
      T.t1 = 1;
      T.t2 = 8;
      this.paso(g, 18);
      g.pad.mode = 1;
    } else this.paso(g, 14);
  }
  entrarAlerta(g) {
    const T = g.think;
    T.t1 = 1;
    g.pad.mode = 1;
    if (g.zonaAsignada >= 0) {
      T.t2 = 10;
      this.paso(g, 28);
      return;
    }
    if (!this.com.tienePunto) this.gopointSnake();
    T.objetivo = this.com.punto.clone();
    if (this.com.puntoEsSnake) {
      T.t2 = 8;
      this.paso(g, 18);
    } else {
      T.t2 = 10;
      this.paso(g, 29);
    }
  }
  thPerseguir(g) {
    const T = g.think;
    T.objetivo.copy(this.com.snakePos);
    g.pad.mode = 1;
    const ve = g.vision.b92 === 2;
    if (g.snDis < g.radio && (g.radio >= 4e3 || ve)) {
      T.t2 = 9;
      this.paso(g, 27);
      T.c3 = 32;
      if (ve) {
        g.alertLevel = 255;
        this.gopointSnake();
      }
      return;
    }
    if (T.t3 === 18) {
      if (this.navegarA(g, T.objetivo, true)) this.paso(g, 19);
    } else if (T.t3 === 19) {
      if (this.navegarA(g, T.objetivo)) this.paso(g, 20);
    } else {
      const zg = this.zonaOCercana(g.o.position), zs = this.zonaOCercana(T.objetivo);
      if (T.c3 & 16 && this.reachTo(zg, zs) > 1) this.paso(g, 19); else if (this.directo(g, T.objetivo, 1500)) {
        T.t2 = 9;
        this.paso(g, 27);
        T.c3 = 32;
      }
    }
    if (ve) {
      g.alertLevel = 255;
      this.gopointSnake();
    }
  }
  thAtacar(g) {
    const T = g.think, ve = g.vision.b92 === 2, rango = (this.com.vista[this.com.modo] || 4e3) + 500;
    g.pad.press |= 65536;
    g.turn = g.snDir;
    if (Math.floor(this.gvTime / 4) % 4 === g.rank % 4) {
      const zg = this.zonaOCercana(g.o.position), zs = this.zonaOCercana(this.ctx.rig.position);
      if (g.zonaAsignada < 0) {
        if (zg !== zs && (g.rank <= 1 ? g.snDis > g.radio + 1e3 || !ve : g.snDis > g.radio)) {
          T.t2 = 8;
          this.paso(g, 18);
          return;
        }
      } else if (!ve && g.alertLevel !== 255 && zg !== g.zonaAsignada) {
        T.t2 = 10;
        this.paso(g, 28);
        return;
      }
    }
    switch (T.t3) {
     case 27:
      if (g.zonaAsignada < 0) {
        if (T.c3 === 16) T.c3 += randU(16) & 13;
        if (T.c3 > 32 && this.quiereGranada(g)) {
          this.paso(g, 24);
          break;
        }
        if (T.c3 > 32 && g.snDis < rango && ve) {
          if (g.snDis < 1e3 && this.postura() === 0) this.paso(g, 25); else {
            this.paso(g, 21);
            T.ratio = 0;
          }
        }
      } else if (T.c3 & 1 && ve && g.snDis < rango) this.paso(g, g.snDis < 1e3 && this.postura() === 0 ? 25 : 26); else if (T.c3 > 32 && this.quiereGranada(g)) this.paso(g, 24);
      break;

     case 24:
      if (g.tipo === 71) {
        this.paso(g, 27);
        break;
      }
      if (T.c3 === 31) {
        g.pad.press |= 1048576;
        if (g.actStatus & 1) g.pad.sound = SE_V_ENE_GRENADE;
      } else if (g.actend || T.c3 > 151) this.paso(g, 27);
      break;

     case 21:
      if (T.c3 === 1) {
        g.pad.press |= 262144;
        T.ratio = randU(8);
      } else {
        T.ratio++;
        if (T.ratio < 9 && (T.ratio & 1) === 0) g.pad.press |= 262144;
        if (T.ratio > 11) this.paso(g, 27);
      }
      break;

     case 26:
      if (T.c3 <= 9 && T.c3 & 1) g.pad.press |= 262144;
      if (T.c3 > 20) this.paso(g, 27);
      break;

     case 25:
      g.pad.press |= 2097152;
      if (g.supFin && T.c3 > 3 || T.c3 > 60) this.paso(g, 27);
      break;

     default:
      this.paso(g, 27);
    }
    if (ve) {
      g.alertLevel = 255;
      this.gopointSnake();
    }
  }
  thIrPunto(g) {
    const T = g.think, ve = g.vision.b92 === 2;
    g.pad.mode = 1;
    if (ve) {
      if (!this.com.puntoEsSnake) {
        T.t2 = 7;
        this.paso(g, 17);
      } else {
        T.t2 = 9;
        this.paso(g, 27);
        T.c3 = 32;
      }
      return;
    }
    if (T.t3 === 29) {
      if (this.navegarA(g, this.com.punto, true)) this.paso(g, 28);
    } else if (T.t3 === 28) {
      const obj = g.zonaAsignada >= 0 ? this.zonas[g.zonaAsignada].p : this.com.punto;
      if (this.navegarA(g, obj)) {
        if (this.com.puntoEsSnake || g.zonaAsignada >= 0) {
          T.t2 = 9;
          this.paso(g, 27);
          T.c3 = 32;
        } else this.paso(g, 30);
      }
    } else if (this.com.puntoEsSnake) {
      T.t2 = 9;
      this.paso(g, 27);
      T.c3 = 32;
    }
  }
  entrarEvasion(g) {
    const T = g.think;
    T.t1 = 2;
    this.com.tienePunto = false;
    this.com.puntoEsSnake = false;
    if (g.actStatus & 4) {
      this.entrarGolpeado(g);
      g.pad.mode = 0;
      return;
    }
    if (g.zonaAsignada >= 0) {
      if (this.zonaOCercana(g.o.position) !== g.zonaAsignada) {
        T.t2 = 11;
        T.objetivo = this.zonas[g.zonaAsignada].p.clone();
        this.paso(g, 0);
        g.pad.mode = 1;
      } else {
        T.t2 = 13;
        this.paso(g, 34);
        T.t4 = 3;
        g.pad.mode = 0;
      }
      return;
    }
    if (g.radio >= 5800) {
      T.t2 = 13;
      this.paso(g, 34);
      T.t4 = 3;
      g.pad.mode = 0;
    } else {
      T.t2 = 11;
      this.paso(g, 0);
      g.pad.mode = 1;
    }
  }
  prioridadesEvasion(g) {
    if (g.alertLevel > 1) {
      this.gopointSnake();
      this.descubrir(g);
      return true;
    }
    if (g.ba1 & 2) {
      this.entrarCaja(g);
      return true;
    }
    if (g.ba1 & 1) {
      this.entrarRuido(g);
      return true;
    }
    if (g.ba1 & 16) {
      this.entrarHuellas(g);
      g.pad.mode = 0;
      return true;
    }
    if (g.ba1 & 4) {
      this.entrarGolpeado(g);
      g.pad.mode = 0;
      return true;
    }
    return false;
  }
  thEvasionIr(g) {
    const T = g.think;
    if (this.navegarA(g, T.objetivo)) {
      T.t2 = 13;
      this.paso(g, 34);
      T.t4 = 3;
      g.pad.mode = 0;
    }
    this.prioridadesEvasion(g);
  }
  elegirZonaBusqueda(g) {
    const zg = this.zonaOCercana(g.o.position);
    if (zg < 0) return -1;
    const vec = this.zonas[zg].v;
    if (!vec.length) return -1;
    const ini = Math.abs(Math.round(g.o.position.x * 1e3)) % vec.length;
    for (let k = 0; k < vec.length; k++) {
      const z = vec[(ini + k) % vec.length];
      if (!this.com.elegidas.has(z)) {
        this.com.elegidas.add(z);
        return z;
      }
    }
    return -1;
  }
  thBuscar(g) {
    const T = g.think;
    if (T.t4 === 3 || T.t4 === 0) {
      if (T.t4 === 0 && T.l === 0 && g.rank === 0) g.pad.sound = 132;
      if (this.mirarAlrededor(g)) {
        T.zonaBus = this.elegirZonaBusqueda(g);
        T.t4 = 2;
      }
    } else {
      const zg = this.zonaOCercana(g.o.position);
      const obj = T.zonaBus >= 0 ? this.zonas[T.zonaBus].p : zg >= 0 ? this.zonas[zg].p : g.o.position;
      if (this.directo(g, obj, 250)) T.zonaBus = this.elegirZonaBusqueda(g);
    }
    this.prioridadesEvasion(g);
  }
  cuadrosClip(idx) {
    const c = this.ctx.anims?.clips, n = c && Object.keys(c)[idx];
    return n ? c[n].cuadros || 0 : 0;
  }
  ponerClip(g, idx, opts = {}) {
    const nombres = Object.keys(this.ctx.anims.clips), n = nombres[idx];
    if (!n) return null;
    g.clipIdx = idx;
    g.clipAct = g.an.tocar(n, {
      fundido: opts.fundido ?? 4 / FPS,
      loop: opts.loop ?? true,
      offset: opts.offset || 0
    });
    g.cuadroPaso = -1;
    return g.clipAct;
  }
  superponer(g, boton) {
    const idx = SUPERPUESTAS[boton];
    if (idx == null || g.sup === boton) return;
    this.quitarSuperpuesta(g);
    const nombres = Object.keys(this.ctx.anims.clips), c = clip(this.ctx.anims, nombres[idx]);
    if (!c) return;
    c.tracks = c.tracks.filter(t => /hueso_[1-9]\.quaternion/.test(t.name));
    const a = g.an.mx.clipAction(c);
    a.setLoop(FIN_PROPIO.has(boton) || boton === 512 ? THREE.LoopOnce : THREE.LoopRepeat, 1);
    a.clampWhenFinished = true;
    a.weight = 50;
    a.reset().fadeIn(4 / FPS).play();
    g.sup = boton;
    g.supAct = a;
    g.tSup = 0;
    g.supFin = false;
    g.supDur = c.duration;
    if (boton === 64) sonido("v_estornudo", g.o.position);
  }
  quitarSuperpuesta(g) {
    if (g.supAct) {
      const a = g.supAct;
      a.fadeOut(4 / FPS);
      setTimeout(() => a.stop(), 200);
    }
    g.sup = 0;
    g.supAct = null;
    g.supFin = false;
  }
  cambiar(g, accion, idx, opts) {
    g.accion = accion;
    g.tAcc = 0;
    g.vel = 0;
    if (idx != null) this.ponerClip(g, idx, opts);
  }
  chocarPared(g) {
    if ([ "muerto", "cuelloRoto", "cae", "piso", "agarrado", "choque" ].includes(g.accion)) return;
    this.quitarSuperpuesta(g);
    this.seVR?.(212, g.o.position);
    if (g.myst) g.myst.k &= ~256;
    this.cambiar(g, "choque", A.EMPUJADO_ATRAS, {
      loop: false
    });
    this.alChoque?.(g);
  }
  distSnake(g) {
    const r = this.ctx.rig.position;
    return Math.hypot(r.x - g.o.position.x, r.z - g.o.position.z) * 1e3;
  }
  liberarNodo(g) {
    if (g.pad?.time === 32001) g.pad.time = 1;
    if ([ "disfraz", "debil", "nodo15" ].includes(g.accion)) g.esperaNodo = 0;
  }
  fingirMuerto(g) {
    this.quitarSuperpuesta(g);
    this.cambiar(g, "finge", A.PISO_ABAJO, {
      loop: true
    });
  }
  despertarMystery(g) {
    if (g.accion !== "finge") return;
    this.seVR?.(222, g.o.position);
    this.cambiar(g, "despierta", A.LEVANTA_GOLPE_ABAJO, {
      loop: false
    });
  }
  actuar(g) {
    g.actStatus = 0;
    g.vision.len = 0;
    g.rSphere = -1;
    g.actend = false;
    if (g.granadaMano && g.accion !== "granada") this.soltarGranadaMano(g);
    const eye = this.com.vista[this.com.modo] || 4e3, P = g.pad;
    g.tAcc++;
    if (g.supAct) {
      g.tSup++;
      if (g.sup === 128 && g.tSup === 60) sonido("v_bosteza", g.o.position);
      if (g.sup === 2048 && g.tSup === 90) sonido("v_bosteza", g.o.position);
      if (FIN_PROPIO.has(g.sup) && !g.supFin && g.tSup / FPS >= g.supDur) {
        g.supFin = true;
        if (P.tmp === g.sup) P.time = 0;
      }
    }
    const quiereSup = P.press & 29371975;
    switch (g.accion) {
     case "quieto":
      {
        g.actStatus |= 1;
        g.vision.len = eye;
        g.facedir = nearExp4P(g.facedir, g.rot);
        if (g.sup) {
          if (VISTA_CORTA.has(g.sup)) g.vision.len = 3e3;
          if (SIN_VISTA.has(g.sup)) g.vision.len = 0;
          mirarCostado(g);
          if (g.sup === 512 && g.tSup > 110) {
            this.quitarSuperpuesta(g);
            this.ponerClip(g, A.DORMIR);
            g.durmiendo = true;
            g.tSueño = 0;
          } else if (!(P.press & g.sup) && (!FIN_PROPIO.has(g.sup) || g.supFin)) this.quitarSuperpuesta(g);
        }
        if (g.durmiendo) {
          g.actStatus |= 16;
          g.vision.len = 0;
          if (++g.tSueño % 90 === 30) sonido("v_ronca", g.o.position);
          if (!(P.press & 512)) {
            g.durmiendo = false;
            this.ponerClip(g, A.PARADO);
          }
        }
        if (quiereSup && !g.sup && !g.durmiendo) {
          for (const b of ORDEN_SUP) if (P.press & b) {
            this.superponer(g, b);
            break;
          }
        }
        if (P.press & 32) {
          this.quitarSuperpuesta(g);
          g.durmiendo = false;
          this.cambiar(g, "sorpresa", A.SORPRESA, {
            loop: false
          });
          break;
        }
        if (P.press & 33554432) {
          this.quitarSuperpuesta(g);
          this.cambiar(g, "agachadoRuido", A.AGACHADO_RUIDO);
          break;
        }
        if (P.press & 4096) {
          this.quitarSuperpuesta(g);
          g.durmiendo = false;
          this.cambiar(g, "despertar", A.DESPERTAR, {
            loop: false
          });
          break;
        }
        if (P.press & 196608) {
          this.quitarSuperpuesta(g);
          g.durmiendo = false;
          this.cambiar(g, "apunta", A.APUNTAR);
          g.adjust.a2 = 0;
          break;
        }
        if (P.press & 4194304) {
          this.quitarSuperpuesta(g);
          g.durmiendo = false;
          this.cambiar(g, "patea", A.PARADO);
          break;
        }
        if (P.dir >= 0 && !g.durmiendo) {
          if (difAbs(g.rot, P.dir) < 256) {
            this.quitarSuperpuesta(g);
            this.cambiar(g, "camina", null);
          } else g.turn = P.dir;
        }
        if (g.accion === "quieto" && g.clipIdx !== A.PARADO && !g.durmiendo) this.ponerClip(g, A.PARADO);
        break;
      }

     case "camina":
      {
        g.actStatus |= 256;
        g.vision.len = eye;
        g.facedir = this.ctx.enPantalla(g.o.position) ? nearExp4P(g.facedir, g.rot) : g.rot;
        if (quiereSup && !g.sup) {
          for (const b of ORDEN_SUP) if (P.press & b && b !== 512) {
            this.superponer(g, b);
            break;
          }
        }
        if (g.sup && !(P.press & g.sup) && (!FIN_PROPIO.has(g.sup) || g.supFin)) this.quitarSuperpuesta(g);
        if (g.sup) {
          mirarCostado(g);
          if (VISTA_CORTA.has(g.sup)) g.vision.len = 3e3;
          if (SIN_VISTA.has(g.sup)) g.vision.len = 0;
        }
        if (P.press & 32) {
          this.quitarSuperpuesta(g);
          this.cambiar(g, "sorpresa", A.SORPRESA, {
            loop: false
          });
          break;
        }
        if (P.press & 196608) {
          this.quitarSuperpuesta(g);
          this.cambiar(g, "apunta", A.APUNTAR);
          g.adjust.a2 = 0;
          break;
        }
        if (P.press & 4194304) {
          this.quitarSuperpuesta(g);
          this.cambiar(g, "patea", A.PARADO);
          break;
        }
        if (P.dir < 0) {
          this.cambiar(g, "quieto", A.PARADO);
          break;
        }
        const huye = !!(g.myst && g.myst.k & 4), corre = P.mode & 1 || huye;
        if (corre && g.clipIdx !== A.CORRER) this.ponerClip(g, A.CORRER); else if (!corre && g.clipIdx !== A.CAMINAR && g.clipIdx !== A.CORRER) this.ponerClip(g, A.CAMINAR);
        g.vel = g.clipIdx === A.CORRER ? huye ? .11 : .1 : g.pasoCaminar ?? .05;
        if (g.tAcc > 1) this.deslizarPared(g, P.dir); else {
          g.turn = P.dir;
          g.rSphere = 1;
        }
        if (!this.ctx.enPantalla(g.o.position)) g.rot = g.turn;
        break;
      }

     case "sorpresa":
      g.vision.len = eye;
      g.turn = g.snDir;
      if (!(P.press & 32) || g.tAcc > 20) this.cambiar(g, "quieto", A.PARADO);
      break;

     case "agachadoRuido":
      g.vision.len = eye;
      if (!(P.press & 33554432)) this.cambiar(g, "quieto", A.PARADO);
      break;

     case "despertar":
      g.vision.len = 0;
      if (g.tAcc > 35) {
        g.supFin = true;
        this.cambiar(g, "quieto", A.PARADO);
      }
      break;

     case "apunta":
      {
        g.vision.len = eye;
        g.facedir = g.rot;
        g.turn = g.snDir;
        this.apuntarBrazo(g);
        if (g.balaPendiente) {
          g.balaPendiente = false;
          this.bala(g);
        }
        if (!(P.press & 196608)) {
          this.cambiar(g, "quieto", A.PARADO);
          break;
        }
        if (P.press & 262144) {
          this.ponerClip(g, A.DISPARAR, {
            fundido: 0,
            loop: false
          });
          g.balaPendiente = true;
          g.tDisp = 0;
        } else if (g.tDisp != null && ++g.tDisp > 6) {
          this.ponerClip(g, A.APUNTAR, {
            fundido: 0
          });
          g.tDisp = null;
        }
        if (P.press & 1048576) {
          this.cambiar(g, "granada", null);
          break;
        }
        if (P.press & 2097152) {
          g.supFin = false;
          this.cambiar(g, "culatazo", A.CULATAZO, {
            fundido: 0,
            loop: false
          });
        }
        break;
      }

     case "granada":
      {
        g.vision.len = eye;
        g.rSphere = 1;
        const t = g.tAcc - 1;
        if (t === 0) {
          g.granadaTodo = ducto.activo;
          this.nuevaGranadaMano(g);
          if (g.granadaTodo) this.ponerClip(g, A.GRANADA, {
            loop: false
          }); else {
            this.ponerClip(g, A.PARADO);
            this.superponer(g, 1048576);
          }
        }
        let trig = 0;
        if (t > 4) trig |= 1;
        if (t === 17) sonido(SE_PINNUKI, g.o.position);
        if (t === 45) trig |= g.granadaTodo ? 4 : 2;
        this.cuadroGranadaMano(g, trig);
        const n = this.ctx.anims.clips[Object.keys(this.ctx.anims.clips)[A.GRANADA]]?.cuadros || 60;
        if (t >= n - 1) {
          g.actend = true;
          this.quitarSuperpuesta(g);
          this.soltarGranadaMano(g);
          this.cambiar(g, "apunta", A.APUNTAR);
        }
        break;
      }

     case "culatazo":
      {
        g.vision.len = eye;
        g.rSphere = 1;
        if (g.tAcc === 3) {
          const p = this.ctx.rig.position, q = g.o.position.clone();
          q.x += Math.sin(g.rot * ANG) * .6;
          q.z += Math.cos(g.rot * ANG) * .6;
          if (!this.ctx.vuelo() && Math.abs(p.x - q.x) < .5 && Math.abs(p.z - q.z) < .5 && Math.abs(p.y - q.y) < 1) {
            const r = g.rot * ANG, f = new THREE.Vector3(Math.sin(r) * 100 + Math.cos(r) * 5, 0, Math.cos(r) * 100 - Math.sin(r) * 5);
            if (this.dañoSnake(32, 2, f)) sonido("golpe");
          }
        }
        if (g.tAcc > 17) {
          g.supFin = true;
          this.cambiar(g, "quieto", A.PARADO);
        }
        break;
      }

     case "patea":
      {
        g.vision.len = eye;
        g.actStatus |= 1;
        g.facedir = g.rot;
        const c = this.com;
        if (!(P.press & 4194304) || g.dañoFrame === this.frame) {
          if (c.danbowl === g) c.danbowl = 0;
          this.quitarSuperpuesta(g);
          this.cambiar(g, "quieto", A.PARADO);
          break;
        }
        const t = g.tAcc;
        if (t === 1) this.superponer(g, 4);
        if (t === 60) {
          this.quitarSuperpuesta(g);
          this.ponerClip(g, 17, {
            loop: false
          });
        }
        if (t === 78) this.alCajaPateada?.(g);
        if (t === 100) this.ponerClip(g, 18, {
          loop: false
        });
        if (t === 130 && this.ctx.inventario && this.ctx.inventario.item >= 2 && this.ctx.inventario.item <= 4) this.ctx.inventario.item = -1;
        if (t > 150) {
          g.actend = true;
          if (c.danbowl === g) c.danbowl = 0;
          this.cambiar(g, "quieto", A.PARADO);
        }
        break;
      }

     case "sacudon":
      g.actStatus |= 8;
      g.vision.len = eye;
      g.rSphere = 1;
      if (g.tAcc > 22) this.cambiar(g, "quieto", A.PARADO);
      break;

     case "cubrirse":
      g.actStatus |= 8;
      g.vision.len = 0;
      if (g.tAcc >= 10) {
        this.quitarSuperpuesta(g);
        g.caida = 1;
        g.caidaImpacto = 37;
        g.caidaDur = 66;
        g.poseMsj = false;
        this.cambiar(g, "cae", A.CAE, {
          loop: false
        });
        sonido("v_piña", g.o.position);
      }
      break;

     case "finge":
      g.vision.len = 0;
      g.actStatus |= 32;
      break;

     case "disfraz":
      {
        g.vision.len = eye;
        const d = this.distSnake(g);
        if (g.subMyst === 0 && d < 2e3) {
          g.subMyst = 26;
          g.tSub = 0;
          this.ponerClip(g, A.POSE_I2, {
            loop: false
          });
        } else if (g.subMyst === 26) {
          if (++g.tSub === 10) this.seVR?.(217, g.o.position);
          if (g.clipAct && g.clipAct.time >= g.clipAct.getClip().duration - 1 / FPS) {
            g.subMyst = 25;
            this.ponerClip(g, A.POSE_I, {
              loop: true
            });
          }
        } else if (g.subMyst === 25 && d >= 2501) {
          g.subMyst = 0;
          this.ponerClip(g, A.PARADO);
        }
        if (--g.esperaNodo <= 0) this.cambiar(g, "quieto", A.PARADO);
        break;
      }

     case "debil":
      {
        g.vision.len = eye;
        if (this.primeraPersonaVR?.() && this.distSnake(g) < 2e3) {
          const r = this.ctx.rig.position, dir = Math.atan2(r.x - g.o.position.x, r.z - g.o.position.z), rumbo = this.rumboSnakeVR?.() ?? dir + Math.PI;
          let dif = Math.abs(((dir - rumbo) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
          const cada = dif * 2048 / Math.PI < 1800 ? 40 : 20;
          if (++g.tSE > cada) {
            this.seVR?.(213, g.o.position);
            g.tSE = 0;
          }
        }
        if (--g.esperaNodo <= 0) this.cambiar(g, "quieto", A.PARADO);
        break;
      }

     case "nodo15":
      g.vision.len = eye;
      if (g.tAcc > (g.tNodo15 || 45) || --g.esperaNodo <= 0) this.cambiar(g, "quieto", A.PARADO);
      break;

     case "despierta":
      {
        g.vision.len = 0;
        g.actStatus |= 8;
        const t = g.tAcc;
        if (t === 68) this.ponerClip(g, A.ESTIRARSE, {
          loop: false
        });
        if (t === 78) this.seVR?.(146, g.o.position);
        if (t > 80 && (!g.clipAct || g.clipAct.time >= g.clipAct.getClip().duration - 1 / FPS)) this.cambiar(g, "quieto", A.PARADO);
        break;
      }

     case "choque":
      {
        g.vision.len = eye;
        g.actStatus |= 8;
        const t = g.tAcc;
        if (t === 17) {
          this.seVR?.(51, g.o.position);
          this.setRuido(100, 4, g.o.position.clone());
        }
        if (t === 44) this.ponerClip(g, A.PISO_ARRIBA, {
          loop: true
        });
        if (t === 104) this.ponerClip(g, A.LEVANTA_GOLPE_ESPALDA, {
          loop: false
        });
        if (t > 104 && (!g.clipAct || g.clipAct.time >= g.clipAct.getClip().duration - 1 / FPS)) this.cambiar(g, "quieto", A.PARADO);
        break;
      }

     case "cae":
      {
        g.actStatus |= 8;
        g.rSphere = 1;
        if (g.tiroVR) this.cuadroTiroVR(g);
        if (g.empujeVR && (g.tAcc <= 16 || g.yCae != null)) g.o.position.add(g.empujeVR); else if (g.empujeVR && g.tAcc > 16) g.empujeVR = null;
        if (g.tAcc === g.caidaImpacto) {
          sonido("cae", g.o.position);
          this.setRuido(100, 4, g.o.position);
        }
        if (g.tAcc > g.caidaDur && g.yCae != null) break;
        if (g.tAcc > g.caidaDur) {
          g.tiroVR = null;
          g.empujeVR = null;
          if (g.vital <= 0) this.morir(g); else {
            const x = Math.abs(Math.round(g.o.position.x * 1e3));
            this.cambiar(g, "piso", g.caida === 1 ? g.poseMsj ? A.POSE_I : A.PISO_CARA : g.caida >= 3 ? A.PISO_ARRIBA : A.PISO_ABAJO, g.poseMsj ? {
              loop: true
            } : undefined);
            g.tPiso = g.faint <= 0 ? x % 60 + 90 : x % 30 + 10;
          }
        }
        break;
      }

     case "piso":
      g.actStatus |= 32;
      if (g.tAcc > g.tPiso) {
        const largo = g.tPiso >= 90, boca = g.caida <= 2, msj = g.poseMsj ? this.cuadrosClip(A.LEVANTA_MSJ) : 0;
        g.faint = g.faintMax;
        g.poseMsj = false;
        if (msj) {
          this.cambiar(g, "levanta", A.LEVANTA_MSJ, {
            loop: false
          });
          g.tLevanta = msj;
        } else {
          this.cambiar(g, "levanta", largo ? boca ? A.LEVANTA_GOLPE_ABAJO : A.LEVANTA_GOLPE_ESPALDA : boca ? A.LEVANTA_CARA : A.LEVANTA_ESPALDA, {
            loop: false
          });
          g.tLevanta = largo ? 70 : 25;
        }
      }
      break;

     case "levanta":
      g.actStatus |= 8;
      if (g.tAcc > g.tLevanta) {
        if (g.derriba) g.derriba.base = g.vital;
        this.cambiar(g, "quieto", A.PARADO);
      }
      break;

     case "agarrado":
      {
        g.actStatus |= 4;
        g.vision.len = 0;
        if (g.tAcc === 50 && g.faint > 0 && g.clipIdx !== A.ARRASTRADO) this.ponerClip(g, A.ARRASTRADO);
        if (g.clipIdx === A.ARRASTRADO && (g.tAcc & 7) === 0) this.vibrar(VIB.forcejeo);
        const y = this.ctx.yawSnake ? this.ctx.yawSnake() : 0, p = this.ctx.rig.position;
        g.o.position.set(p.x - Math.sin(y) * .3 - Math.cos(y) * .15, p.y, p.z - Math.cos(y) * .3 + Math.sin(y) * .15);
        g.rot = g.turn = dirDe(-Math.sin(y), -Math.cos(y));
        g.o.rotation.y = g.rot * ANG;
        break;
      }

     case "cuelloRoto":
      g.actStatus |= 4;
      g.vision.len = 0;
      if (g.tAcc > 67) this.morir(g);
      break;

     case "soltado":
      g.actStatus |= 8;
      if (g.tAcc > 15) {
        const x = Math.abs(Math.round(g.o.position.x * 1e3));
        g.caida = 5;
        this.cambiar(g, "piso", A.PISO_ARRIBA);
        g.tPiso = g.faint <= 0 ? x % 60 + 90 : x % 30 + 10;
      }
      break;

     case "muerto":
      g.actStatus |= 64;
      if (g.tAcc <= 9) g.o.visible = (g.tAcc & 2) === 0; else {
        g.o.visible = false;
        g.faseout = true;
        g.inactivo = true;
        this.ctx.alMorir?.(g);
      }
      break;

     default:
      this.cambiar(g, "quieto", A.PARADO);
    }
    if (g.accion !== "camina") g.vel = 0;
    this.estrellas(g);
    const T = g.think;
    g.estado = g.accion === "muerto" || g.accion === "cuelloRoto" ? "muerto" : g.accion === "piso" || g.accion === "cae" || g.accion === "soltado" || g.accion === "levanta" ? "desmayado" : g.accion === "agarrado" ? "agarrado" : T.t1 === 1 ? "alerta" : T.t1 === 2 ? "evasion" : [ 1, 2, 3, 4, 5, 7 ].includes(T.t2) ? "sospecha" : "patrulla";
  }
  deslizarPared(g, dir) {
    const p = g.o.position.clone();
    p.y += .75;
    const d = new THREE.Vector3(Math.sin(dir * ANG), 0, Math.cos(dir * ANG));
    this.ray.set(p, d);
    this.ray.far = .6;
    const h = this.ray.intersectObject(this.reglasVR || BIT_GUARDIAS === 2 ? this.paredColG : this.paredCol, false)[0];
    if (!h) {
      g.turn = dir;
      return;
    }
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    n.y = 0;
    n.normalize();
    const contacto = dirDe(n.x, n.z), dd = difS(dir, contacto);
    g.turn = Math.abs(dd) < 896 ? (contacto + (dd >= 0 ? 1024 : 3072)) % 4096 : dir;
  }
  mover(g) {
    if (ROTAN.has(g.accion)) {
      const d = difS(g.turn, g.rot);
      g.rot = Math.abs(d) < 4 ? g.turn : (g.rot + Math.round(d / 4) + 4096) % 4096;
      g.o.rotation.y = g.rot * ANG;
    }
    if (g.vel > 0) {
      g.o.position.x += Math.sin(g.rot * ANG) * g.vel;
      g.o.position.z += Math.cos(g.rot * ANG) * g.vel;
      this.pasosGuardia(g);
    }
    if (g.accion !== "agarrado" && !(g.tiroVR && g.tAcc < 22) && !(g.empujeVR && g.tAcc < 20) && !(g.yCae != null && g.vital <= 0)) this.chocar(g.o.position, g.rSphere > 0 ? .45 : .25, this.reglasVR ? 2 : BIT_GUARDIAS);
    const h0 = this.alturaPiso(g.o.position.x, g.o.position.z, g.o.position.y), h = h0 === null ? null : h0 + (g.altCtrl || 0);
    if (h !== null && this.reglasVR?.caida && g.accion !== "agarrado") this.caerVR(g, h); else if (h !== null) g.o.position.y += (h - g.o.position.y) * .5;
  }
  caerVR(g, h) {
    const p = g.o.position;
    if (p.y - h > .3) {
      g.yCae ??= p.y;
      g.vyCae = (g.vyCae || 0) + .016;
      p.y = Math.max(h, p.y - g.vyCae);
      if (p.y > h) return;
    } else p.y += (h - p.y) * .5;
    if (g.yCae == null) return;
    const alto = g.yCae - h;
    g.yCae = null;
    g.vyCae = 0;
    if (alto <= 3) return;
    g.vital = 0;
    sonido("cae", p);
    if (![ "cae", "muerto", "cuelloRoto" ].includes(g.accion)) this.morir(g);
  }
  pasosGuardia(g) {
    const a = g.clipAct;
    if (!a || this.com?.pasosOff) return;
    const caminar = g.clipIdx === A.CAMINAR, correr = g.clipIdx === A.CORRER;
    if (!caminar && !correr) return;
    const f = Math.floor(a.time * FPS + 1e-4), p = g.cuadroPaso;
    if (f === p) return;
    g.cuadroPaso = f;
    const cruza = k => p < 0 ? f === k : p < f ? k > p && k <= f : k > p || k <= f;
    const n = (g.num ?? 0) % 4 * 2;
    if (cruza(caminar ? 22 : 16)) {
      sonido(161 + n, g.o.position);
      if (g.myst && g.myst.k & 1) this.pisadaMystery?.(g, 2);
    } else if (cruza(caminar ? 11 : 8)) {
      sonido(160 + n, g.o.position);
      if (g.myst && g.myst.k & 1) this.pisadaMystery?.(g, 1);
    }
  }
  apuntarBrazo(g) {
    const A = g.adjust;
    A.activo = true;
    const cs = this.alturasSnake().cabeza, cg = g.cabeza6 ||= g.o.getObjectByName("hueso_6");
    const yg = cg ? cg.getWorldPosition(_v).y : g.o.position.y + 1.6;
    const trans = and12(Math.round(Math.atan2(g.snDis, Math.round((cs - yg) * 1e3)) / ANG));
    const near = nearExp8(A.a2, trans - 1024);
    A.a2 = near;
    A.a6 = near;
    A.a7 = near < 0 ? near * 3 : Math.trunc(near * 3 / 2);
    this.ajusteMezclador(g);
  }
  ajusteMezclador(g) {
    const mx = g.an?.mx;
    if (!mx || mx._ajuste) return;
    const orig = mx.update.bind(mx);
    mx._ajuste = true;
    mx.update = dt => {
      const r = orig(dt);
      this.ajustarHuesos(g);
      return r;
    };
  }
  ajustarHuesos(g) {
    const A = g.adjust;
    if (!A?.activo || g.inactivo) return;
    g.o.updateMatrixWorld(true);
    const qo = g.o.getWorldQuaternion(new THREE.Quaternion).invert(), qp = new THREE.Quaternion, rx = new THREE.Quaternion;
    const base = g.qBase ||= {}, puesto = g.qPuesto ||= {};
    for (const [n, a] of [ [ 2, A.a2 ], [ 6, A.a6 ], [ 7, A.a7 ] ]) {
      const h = (g.huesosAj ||= {})[n] ||= g.o.getObjectByName("hueso_" + n);
      if (!h?.parent) continue;
      if (!base[n] || !puesto[n] || !h.quaternion.equals(puesto[n])) base[n] = h.quaternion.clone();
      if (!a) {
        h.quaternion.copy(base[n]);
        puesto[n] = null;
        continue;
      }
      h.parent.getWorldQuaternion(qp);
      qp.premultiply(qo);
      rx.setFromAxisAngle(_ejeX, a * ANG);
      h.quaternion.copy(base[n]).premultiply(qp.clone().invert().multiply(rx).multiply(qp));
      puesto[n] = h.quaternion.clone();
    }
  }
  alturasSnake() {
    const y0 = this.ctx.rig.position.y, c = globalThis.__mgs?.cuerpo?.obj, k = this.postura();
    let cadera = [ 1.016, .55, .136 ][k] ?? 1.016, cabeza = y0 + ([ 1.62, 1, .3 ][k] ?? 1.62);
    if (c?.parent) {
      c.updateMatrixWorld(true);
      const h0 = c.getObjectByName("hueso_0"), h6 = c.getObjectByName("hueso_6");
      if (h0) cadera = Math.max(0, h0.getWorldPosition(_v).y - y0);
      if (h6) cabeza = h6.getWorldPosition(_v).y;
    }
    return {
      cadera: cadera,
      cabeza: cabeza
    };
  }
  bala(g) {
    const h = g.o.getObjectByName("hueso_4"), o = new THREE.Vector3;
    let d = null;
    if (h && this.punteriaOriginal !== false) {
      h.updateWorldMatrix(true, false);
      o.copy(h.localToWorld(new THREE.Vector3(.005, -.5, .08)));
      const q = h.getWorldQuaternion(new THREE.Quaternion);
      const r = (new THREE.Quaternion).setFromEuler(new THREE.Euler(((Math.floor(Math.random() * 32767) & 31) - 16) * ANG, 0, (Math.floor(Math.random() * 32767) & 127) * ANG, "ZYX"));
      d = new THREE.Vector3(0, -1, 0).applyQuaternion(q.multiply(r)).normalize();
    }
    if (!d) {
      if (h) h.getWorldPosition(o); else {
        o.copy(g.o.position);
        o.y += 1.2;
      }
      d = this.puntoSnake().sub(o).normalize();
      const eje = new THREE.Vector3(-d.z, 0, d.x).normalize();
      d.applyAxisAngle(eje, (randU(32) - 16) * ANG);
    }
    const dif = this.ctx.dificultad ? this.ctx.dificultad() : 2;
    this.balas.push({
      p: o,
      d: d,
      v: .75,
      recorrido: 0,
      alcance: 10 * (g.escala || 1),
      "daño": DAÑO_BALA[dif] ?? 96,
      pared: (this.gvTime & 3) !== 0,
      mesh: this.ctx.balaVisual?.(o, d)
    });
    sonido("tiro", g.o.position);
  }
  balasCuadro(yo) {
    const {cadera: cadera} = this.alturasSnake(), hy = Math.min(.7, Math.max(.5, cadera));
    const min = new THREE.Vector3(yo.x - .3, yo.y + cadera - hy, yo.z - .3), max = new THREE.Vector3(yo.x + .3, yo.y + cadera + hy, yo.z + .3);
    const caja = new THREE.Box3(min, max), rayo = new THREE.Ray, q = new THREE.Vector3;
    for (const b of this.balas.slice()) {
      const p0 = b.p.clone();
      b.p.addScaledVector(b.d, b.v);
      b.recorrido += b.v;
      let fin = b.recorrido > (b.alcance || 10);
      if (b.pared && !fin) {
        this.ray.set(p0, b.d);
        this.ray.far = b.v;
        if (this.ray.intersectObject(this.vista, false).length) {
          fin = true;
          sonido("impacto", b.p);
        }
      }
      if (!fin && !this.ctx.vuelo() && !this.muerto) {
        rayo.set(p0, b.d);
        const hit = caja.containsPoint(p0) ? q.copy(p0) : rayo.intersectBox(caja, q);
        if (hit && hit.distanceTo(p0) <= b.v && this.dañoSnake(b.daño, 1, null, hit.clone())) fin = true;
      }
      if (b.mesh) {
        b.mesh.position.copy(b.p);
        b.mesh.lookAt(b.p.clone().add(b.d));
        if (fin) b.mesh.removeFromParent();
      }
      if (fin) this.balas.splice(this.balas.indexOf(b), 1);
    }
  }
  noHidden() {
    const p = this.ctx.rig.position;
    return this.enTrampa("nohidden", {
      x: p.x * 1e3,
      y: (p.y + ALTURA_CONTROL[this.postura()]) * 1e3,
      z: p.z * 1e3
    });
  }
  quiereGranada(g) {
    return g.rank === 0 && g.alertLevel === 255 && (ducto.activo || this.noHidden()) && g.vision.b92 === 0;
  }
  nuevaGranadaMano(g) {
    this.soltarGranadaMano(g);
    const s = this.ctx.rig.position;
    g.granadaMano = {
      timer: 120,
      objetivo: {
        x: s.x * 1e3,
        z: s.z * 1e3
      },
      obj: this.objGranada()
    };
    g.granadaMano.obj.visible = false;
  }
  objGranada() {
    if (this.modeloArma) return this.modeloArma("granada");
    const m = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({
      color: 3820074
    }));
    m.userData.propio = m.userData.sinColision = true;
    this.ctx.mundo.add(m);
    return m;
  }
  soltarGranadaMano(g) {
    if (g.granadaMano) {
      g.granadaMano.obj.removeFromParent();
      g.granadaMano = null;
    }
  }
  manoGuardia(g, p) {
    const h = g.mano9 ||= g.o.getObjectByName("hueso_9");
    if (h) h.getWorldPosition(p); else {
      p.copy(g.o.position);
      p.y += 1.3;
    }
    return p;
  }
  cuadroGranadaMano(g, trig) {
    const G = g.granadaMano;
    if (!G) return;
    const mano = this.manoGuardia(g, new THREE.Vector3);
    if (trig & 1) {
      if (--G.timer <= 0) {
        this.explosionGranada(mano.clone(), true);
        G.timer = 120;
      }
      if (trig & 6) {
        let dist = Math.round(Math.hypot(g.o.position.x * 1e3 - G.objetivo.x, g.o.position.z * 1e3 - G.objetivo.z));
        if (trig & 2) dist = Math.trunc(dist / 2);
        const vz = Math.trunc(dist / 8), vy = trig & 4 ? 20 : 80, r = g.rot * ANG;
        const paso = new THREE.Vector3(Math.sin(r) * vz, vy, Math.cos(r) * vz).multiplyScalar(MM);
        const obj = this.objGranada();
        obj.position.copy(mano);
        (this.granadasE ||= []).push({
          p: mano.clone(),
          paso: paso,
          espoleta: G.timer,
          rebotes: 0,
          obj: obj,
          guardia: g
        });
        G.timer = 120;
      }
      G.obj.visible = true;
    } else {
      G.obj.visible = false;
      G.timer = 120;
    }
    G.obj.position.copy(mano);
    if (g.mano9) g.mano9.getWorldQuaternion(G.obj.quaternion);
  }
  cuadroGranadas() {
    const L = this.granadasE;
    if (!L?.length) return;
    for (const e of L.slice()) {
      const ant = e.p.clone(), q = e.p.clone().add(e.paso);
      const dd = q.clone().sub(ant), Ld = dd.length();
      if (Ld > 1e-6) {
        this.ray.set(ant, dd.clone().divideScalar(Ld));
        this.ray.far = Ld + .1;
        const h = this.ray.intersectObject(this.paredCol, false)[0];
        if (h?.face) {
          const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
          n.y = 0;
          if (n.lengthSq() > 0) {
            n.normalize();
            if (n.dot(dd) > 0) n.negate();
            e.paso.reflect(n);
            e.paso.x /= 4;
            e.paso.z /= 4;
            q.copy(h.point).addScaledVector(n, .1);
            q.y = ant.y + e.paso.y;
            if (++e.rebotes < 3) sonido(SE_GRENADE_HIT, q);
          }
        }
      }
      const piso = this.alturaPiso(q.x, q.z, q.y + .3);
      if (piso != null && q.y <= piso + .1 && e.paso.y <= 0) {
        q.y = piso + .1;
        e.paso.y = -e.paso.y / 8;
        e.paso.x /= 4;
        e.paso.z /= 4;
        if (e.paso.y < 5 * MM) e.paso.set(0, 0, 0);
        if (++e.rebotes < 3) sonido(SE_GRENADE_HIT, q);
      } else e.paso.y -= 16 * MM;
      e.p.copy(q);
      e.obj.position.copy(q);
      e.obj.rotation.x += .3;
      if (--e.espoleta <= 0) {
        L.splice(L.indexOf(e), 1);
        e.obj.removeFromParent();
        this.explosionGranada(e.p.clone(), false);
      }
    }
  }
  explosionGranada(p, todos) {
    sonido(SE_EXPLOSION, p);
    this.alExplosionVisual?.(p);
    if (todos) this.setRuido(255, 32, p);
    const cubo = (c, half, r) => Math.abs(c.x - p.x) <= r + half.x && Math.abs(c.y - p.y) <= r + half.y && Math.abs(c.z - p.z) <= r + half.z;
    if (todos) for (const g of this.activos()) {
      if ([ "muerto", "cuelloRoto" ].includes(g.accion)) continue;
      const c = g.o.position.clone();
      c.y += .9;
      const half = new THREE.Vector3(.3, .9, .3);
      const a = cubo(c, half, 1), b = cubo(c, half, 2);
      if (!a && !b) continue;
      this.dañar(g, (a ? 128 : 0) + (b ? 128 : 0), 1);
      if (g.vital > 0) this.dañar(g, (a ? 5 : 0) + (b ? 3 : 0), 4);
    }
    this.ultimaGranadaE = {
      p: p.clone(),
      snake: 0
    };
    if (this.muerto || this.ctx.vuelo()) return;
    const s = this.ctx.rig.position, alt = ALT_SNAKE[this.postura()] * MM, cs = s.clone();
    cs.y += alt / 2;
    const half = new THREE.Vector3(.3, alt / 2, .3), a = cubo(cs, half, 1), b = cubo(cs, half, 2);
    if (!a && !b) return;
    const f = cs.clone().sub(p);
    f.y = 0;
    if (f.lengthSq() < 1e-6) f.set(0, 0, 1);
    f.normalize().multiplyScalar(a ? 100 : 50);
    if (this.dañoSnake((a ? 128 : 0) + (b ? 128 : 0), 2, f)) this.ultimaGranadaE.snake = (a ? 128 : 0) + (b ? 128 : 0);
  }
  "dañar"(g, cuanto, modo = 1) {
    if ([ "muerto", "cuelloRoto" ].includes(g.accion) || g.inactivo) return;
    g.dañoFrame = this.frame;
    if (modo === 1) g.vital -= cuanto; else g.faint -= cuanto;
    if (g.accion === "agarrado") {
      if (g.vital <= 0) {
        this.agarrado = null;
        this.morir(g);
      }
      return;
    }
    const muerto = g.vital <= 0, ko = modo !== 1 && g.faint <= 0;
    if ([ "piso", "cae", "soltado" ].includes(g.accion)) {
      if (muerto) this.morir(g);
      return;
    }
    const tira = modo === 1 && !!g.derriba && g.derriba.base - g.vital >= g.derriba.umbral;
    if (muerto || ko || modo === 4 || tira) {
      this.quitarSuperpuesta(g);
      g.durmiendo = false;
      g.caida = modo === 4 ? 0 : 1;
      g.caidaImpacto = modo === 4 ? 17 : 37;
      g.caidaDur = modo === 4 ? 44 : 66;
      g.poseMsj = modo !== 4 && g.faint <= 0 && !!(g.myst && g.myst.k & 2);
      if (g.poseMsj) g.myst.k &= ~256;
      this.cambiar(g, "cae", modo === 4 ? A.CAE_RAPIDO : g.poseMsj ? A.POSE_I2 : A.CAE, {
        loop: false
      });
      sonido(muerto ? "v_muere" : "v_piña", g.o.position);
      if (muerto) g.gritoMuerte = true;
      return;
    }
    if (modo === 1) {
      const s = g.o.position.clone();
      s.y += 1.2;
      this.sangre(s, 1);
    }
    this.quitarSuperpuesta(g);
    g.durmiendo = false;
    this.cambiar(g, "sacudon", A.SACUDON, {
      loop: false,
      fundido: .05
    });
    sonido(modo === 1 ? "impacto" : "golpe", g.o.position);
    sonido("v_piña", g.o.position);
  }
  aturdir(g, normal) {
    if ([ "muerto", "cuelloRoto", "piso", "cae", "soltado", "levanta", "agarrado", "cubrirse" ].includes(g.accion) || g.inactivo) return false;
    g.dañoFrame = this.frame;
    if (normal) g.faint = 0; else g.faint -= 5;
    this.quitarSuperpuesta(g);
    g.durmiendo = false;
    this.cambiar(g, "cubrirse", A.CUBRIRSE, {
      loop: false,
      fundido: .05
    });
    return true;
  }
  morir(g) {
    if (g.accion === "muerto") return;
    if (!g.gritoMuerte && g.accion !== "cuelloRoto") {
      sonido("v_muere", g.o.position);
      g.gritoMuerte = true;
    }
    const idx = g.clipIdx;
    this.cambiar(g, "muerto", idx === A.CUELLO_ROTO ? null : g.caida === 1 ? g.poseMsj ? A.POSE_I : A.PISO_CARA : g.caida >= 3 ? A.PISO_ARRIBA : A.PISO_ABAJO);
    g.alertLevel = 0;
    g.snDis = 3e4;
    if (g.marca) g.marca.visible = g.marcaQ.visible = false;
    if (this.agarrado === g) this.agarrado = null;
    if (this.com.danbowl === g) this.com.danbowl = 0;
    if (!g.borrado) g.reset = {
      estado: 1,
      t: (g.num | 0) + 1
    };
    this.ctx.inventario?.soltarDeGuardia(g, this.com.modo);
    window.debugLog?.("juego", "guardia muerto");
  }
  disparar(origen, dir) {
    const a = this.arma;
    if (a.recargando > 0) return null;
    if (a.balas <= 0) {
      sonido("vacio");
      this.setRuido(5, 2, origen);
      if (a.reserva > 0) this.recargar(); else this.ctx.aviso("SIN BALAS");
      return null;
    }
    a.balas--;
    sonido("socom");
    this.setRuido(200, 2, origen);
    this.ray.set(origen, dir);
    this.ray.far = 60;
    const pared = this.ray.intersectObject(this.vista, false)[0];
    let lejos = pared ? pared.distance : 60, blanco = null;
    for (const g of this.activos()) {
      if (g.accion === "muerto") continue;
      const p = g.o.position, dx = p.x - origen.x, dz = p.z - origen.z, h = Math.hypot(dir.x, dir.z) || 1e-6;
      const t = (dx * dir.x + dz * dir.z) / (h * h);
      if (t <= 0) continue;
      const cx = origen.x + dir.x * t - p.x, cz = origen.z + dir.z * t - p.z;
      if (cx * cx + cz * cz > .33 * .33) continue;
      const y = origen.y + dir.y * t - p.y, dist = t * Math.hypot(dir.x, dir.y, dir.z);
      const tope = [ "piso", "cae", "soltado" ].includes(g.accion) ? .5 : 1.85;
      if (y < 0 || y > tope || dist >= lejos) continue;
      lejos = dist;
      blanco = g;
    }
    const impacto = origen.clone().addScaledVector(dir, lejos);
    if (blanco) this.dañar(blanco, 64, 1);
    return {
      impacto: impacto,
      guardia: blanco
    };
  }
  recargar() {
    const a = this.arma;
    if (a.recargando > 0 || a.balas >= a.cargador || a.reserva <= 0) return;
    a.recargando = 36;
    sonido("recarga");
    this.ctx.aviso("RECARGANDO");
  }
  conosRadar() {
    const s = this.ctx.rig.position, out = [];
    for (const g of this.ctx.guardias) {
      if (g.inactivo || g.faseout || !g.vision || !g.think || [ "muerto", "cuelloRoto" ].includes(g.accion) || g.borrado || !g.o?.visible) continue;
      const T = g.think, estado = T.t1 === 1 ? "alerta" : T.t1 === 2 ? "evasion" : [ 1, 2, 3, 4, 5, 7 ].includes(T.t2) ? "sospecha" : "normal";
      const alto = g.o.position.y + 1 - (s.y + (ALTURA_CONTROL[this.postura()] ?? .75));
      out.push({
        p: g.o.position,
        r: g.facedir * ANG,
        dis: (g.vision.len || 0) * MM,
        mitad: (g.vision.angle || 512) * ANG,
        estado: estado,
        color: estado === "normal" ? "celeste" : "rojo",
        alerta: estado !== "normal",
        alto: alto,
        enAltura: alto >= -2 && alto < 2,
        guardia: g
      });
    }
    return out;
  }
  golpear(yo, frente) {
    if (this.agarrado) {
      this.apretar();
      return true;
    }
    const S = this.sn;
    if (S.reac || this.muerto) return true;
    if (S.combo) {
      if (S.combo.nivel === 1 && S.combo.t <= 5) S.combo.nivel = 2; else if (S.combo.nivel === 2 && S.combo.t >= 6 && S.combo.t <= 12) S.combo.nivel = 3;
      return true;
    }
    const f = new THREE.Vector3(frente.x, 0, frente.z).normalize();
    let cerca = null, dc = 2;
    for (const x of this.activos()) {
      if ([ "muerto", "cuelloRoto", "piso", "cae", "soltado", "levanta" ].includes(x.accion)) continue;
      const d = x.o.position.clone().sub(yo);
      d.y = 0;
      const L = d.length();
      if (L < dc && L > .001 && d.dot(f) / L > 0) {
        dc = L;
        cerca = d.divideScalar(L);
      }
    }
    if (cerca) {
      f.copy(cerca);
      this.giroGolpe = Math.atan2(-f.x, -f.z);
    }
    const g = this.guardiaGolpe(yo, f, 0, 1.1, .75);
    if (!g) {
      const o = yo.clone();
      o.y += 1;
      this.ray.set(o, f);
      this.ray.far = 1.2;
      if (this.ray.intersectObject(this.vista, false).length) return false;
    }
    S.combo = {
      t: 0,
      nivel: 1,
      frente: f
    };
    return true;
  }
  guardiaGolpe(yo, f, cerca, lejos, ancho, excepto = null) {
    let mejor = null, md = 1e9;
    for (const g of this.activos()) {
      if (g === excepto || [ "muerto", "cuelloRoto", "piso", "cae", "soltado", "levanta", "agarrado" ].includes(g.accion)) continue;
      const d = g.o.position.clone().sub(yo), dy = d.y;
      d.y = 0;
      const ad = d.x * f.x + d.z * f.z, lat = Math.abs(d.x * f.z - d.z * f.x);
      if (ad < cerca || ad > lejos || lat > ancho || Math.abs(dy) > 1) continue;
      const o = yo.clone(), q = g.o.position.clone();
      o.y += 1;
      q.y += 1;
      if (!this.libre(o, q)) continue;
      if (ad < md) {
        md = ad;
        mejor = g;
      }
    }
    return mejor;
  }
  cuadroCombo() {
    const S = this.sn, C = S.combo;
    if (!C) return;
    C.t++;
    const pega = (faint, modo, aire, se) => {
      const yo = this.ctx.rig.position;
      sonido(this.sn.enAgua ? 182 : aire, yo);
      this.setRuido(4, 2, yo.clone());
      const g = this.guardiaGolpe(yo, C.frente, 0, 1.1, .75);
      this.golpeObjeto?.(yo, C.frente, modo);
      if (g) {
        this.dañar(g, faint, modo);
        sonido(se, g.o.position);
        this.sangre(g.o.position.clone().setY(g.o.position.y + 1.3), 3);
      }
      if (g && modo === 4 && (this.reglasVR?.tiro || g.empuje14) && g.accion === "cae") g.empujeVR = C.frente.clone().setY(0).normalize().multiplyScalar(.1);
    };
    if (C.t === 4) pega(1, 3, 56, 52);
    if (C.t === 6 && C.nivel < 2) {
      S.combo = null;
      return;
    }
    if (C.t === 11 && C.nivel >= 2) pega(1, 3, 56, 52);
    if (C.t === 13 && C.nivel < 3) {
      S.combo = null;
      return;
    }
    if (C.t === 22 && C.nivel >= 3) pega(3, 4, 57, 53);
    if (C.t >= 34) S.combo = null;
  }
  botonAgarre(abajo) {
    const S = this.sn;
    S.cuadrado = !!abajo;
    if (!abajo) return;
    if (this.agarrado) {
      this.apretar();
      return;
    }
    if (S.reac || this.muerto || S.combo || this.postura() !== 0) return;
    if (S.mov) this.tirarGuardia(); else this.agarrar();
  }
  agarrar() {
    const yo = this.ctx.rig.position;
    let mejor = null, md = .8;
    for (const g of this.activos()) {
      if ([ "muerto", "cuelloRoto", "piso", "cae", "soltado", "levanta", "agarrado" ].includes(g.accion)) continue;
      const dx = g.o.position.x - yo.x, dz = g.o.position.z - yo.z, d = Math.max(Math.abs(dx), Math.abs(dz));
      if (d > md || Math.abs(g.o.position.y - yo.y) > .9) continue;
      const o = yo.clone(), q = g.o.position.clone();
      o.y += 1;
      q.y += 1;
      if (!this.libre(o, q)) continue;
      md = d;
      mejor = g;
    }
    if (!mejor) return false;
    const g = mejor;
    g.golpes = 0;
    g.faint -= 1;
    g.capturado = true;
    this.agarrado = g;
    g.dañoFrame = this.frame;
    this.sn.tSin = 0;
    this.sn.tSuelto = 0;
    this.sn.accion = {
      clip: ANIM_AGARRE.apretar,
      t: 0
    };
    this.quitarSuperpuesta(g);
    g.durmiendo = false;
    this.cambiar(g, "agarrado", A.AGARRADO, {
      fundido: .1
    });
    sonido("golpe");
    sonido("v_agarrado", g.o.position);
    this.ctx.aviso?.("AGARRADO: APRETÁ PARA AHORCARLO (10 VECES LE ROMPE EL CUELLO); MANTENÉ Y MOVETE PARA ARRASTRARLO");
    return true;
  }
  apretar() {
    const g = this.agarrado;
    if (!g) return;
    g.golpes++;
    g.faint -= 1;
    this.sn.tSin = 0;
    this.sn.accion = {
      clip: ANIM_AGARRE.apretar,
      t: 0
    };
    sonido("v_agarrado", g.o.position);
    if (g.golpes >= 10) {
      this.agarrado = null;
      g.vital = 0;
      g.capturado = false;
      this.cambiar(g, "cuelloRoto", A.CUELLO_ROTO, {
        loop: false
      });
      sonido("cuello");
      sonido("v_cuello", g.o.position);
      this.vibrar(VIB.cuello);
      this.sn.accion = {
        clip: ANIM_AGARRE.cuello,
        t: 0,
        dur: 56
      };
    }
  }
  tirarGuardia() {
    const y = this.ctx.yawSnake ? this.ctx.yawSnake() : 0, f = new THREE.Vector3(-Math.sin(y), 0, -Math.cos(y)), s = this.ctx.rig.position;
    const g = this.guardiaGolpe(s, f, .2, 1, .8);
    if (!g) return false;
    const der = (g.o.position.x - s.x) * f.z - (g.o.position.z - s.z) * f.x > 0;
    this.sn.accion = {
      clip: der ? ANIM_AGARRE.tirarD : ANIM_AGARRE.tirarI,
      t: 0,
      dur: 22
    };
    this.dañar(g, 5, 4);
    sonido("v_tirado", g.o.position);
    g.tirado = {
      t: 0
    };
    if ((this.reglasVR?.tiro || g.empuje14) && g.accion === "cae") {
      g.tiroVR = {
        rot: (dirDe(f.x, f.z) + 2048) % 4096
      };
      g.caidaImpacto = 22;
      g.caidaDur = 32;
      this.ponerClip(g, 31, {
        loop: false
      });
    }
    return true;
  }
  cuadroTiroVR(g) {
    const T = g.tiroVR, c = this.ctx.anims?.clips?.[Object.keys(this.ctx.anims.clips)[31]], i = g.tAcc - 1;
    if (g.tAcc < 24) {
      g.rot = g.turn = T.rot;
      g.o.rotation.y = g.rot * ANG;
    }
    const px = c?.paso?.[i * 2] || 0, pz = c?.paso?.[i * 2 + 1] || 0, s = Math.sin(g.rot * ANG), co = Math.cos(g.rot * ANG);
    g.o.position.x += (px * co + pz * s) * MM;
    g.o.position.z += (-px * s + pz * co) * MM;
    if (g.tAcc === 22 && !g.empuje14) {
      const h = this.alturaPiso(g.o.position.x, g.o.position.z, g.o.position.y);
      if (h == null || g.o.position.y - h > 3) g.vital = 0;
    }
  }
  soltar() {
    const g = this.agarrado;
    this.agarrado = null;
    if (!g) return;
    g.capturado = false;
    this.cambiar(g, "soltado", A.SOLTADO, {
      loop: false
    });
  }
  velAgarre() {
    return this.agarrado ? this.sn.cuadrado ? this.velArrastre || 0 : 0 : null;
  }
  "dañable"() {
    const S = this.sn;
    return !(this.muerto || this.ctx.vuelo?.() || S.inv > 0 || S.reac && S.reac.tipo !== "piso");
  }
  "dañoSnake"(daño, aMode = 1, fuerza = null, punto = null) {
    const S = this.sn, inv = this.ctx.inventario;
    if (!this.dañable()) return false;
    let d = daño;
    if (aMode === 1 && inv) d = inv.dañoBala(d);
    this.vida -= d / (inv?.vidaMax || 256);
    this.ctx.daño?.();
    const leve = LEVE.has(aMode);
    sonido(leve ? 24 : 25);
    this.vibrar(leve ? VIB.leve : VIB.derribo);
    const p = this.ctx.rig.position.clone();
    p.y += [ 1.2, .6, .2 ][this.postura()] || 1.2;
    this.sangre(punto || p, aMode);
    this.alDañoSnake?.(aMode);
    if (this.agarrado) this.soltar();
    S.combo = null;
    if (S.reac?.tipo === "piso") {
      S.inv = 32;
      return true;
    }
    if (leve) {
      if (inv?.o?.primeraPersona?.()) {
        S.inv = 32;
        return true;
      }
      const tierra = this.postura() === 2;
      S.reac = {
        tipo: "sacudon",
        t: 0,
        dur: tierra ? DUR_DAÑO.sacudonTierra : DUR_DAÑO.sacudon,
        k: tierra ? 8 : this.gvTime & 1 ? 0 : 1
      };
    } else {
      const lado = this.gvTime & 1 ? 1 : 2, e = new THREE.Vector3;
      if (fuerza) e.set(fuerza.x, 0, fuerza.z).multiplyScalar(.5);
      S.reac = {
        tipo: "derribo",
        t: 0,
        dur: DUR_DAÑO.derribo,
        k: lado === 1 ? 2 : 3,
        lado: lado,
        empuje: e
      };
    }
    return true;
  }
  snakeBloqueado() {
    return !!this.padVR || !!this.sn.reac || !!this.com.danbowl && this.com.danbowl.accion === "patea" || this.sn.accion?.dur > 0;
  }
  botonSnake() {
    this.sn.boton = true;
  }
  reaccionSnake() {
    const S = this.sn, R = S.reac;
    if (R) {
      const t = ANIM_DAÑO[DAÑO_DE_ARMA[this.ctx.inventario?.arma] || "ninguna"];
      const k = R.tipo === "sacudon" || R.tipo === "derribo" ? R.k : R.tipo === "piso" ? R.lado === 1 ? 4 : 5 : R.lado === 1 ? 6 : 7;
      return {
        clip: "anim " + t[k],
        unaVez: R.tipo !== "piso",
        tipo: R.tipo
      };
    }
    if (S.accion) return {
      clip: "anim " + S.accion.clip,
      unaVez: true,
      tipo: "agarre"
    };
    if (this.agarrado && S.cuadrado && S.mov) return {
      clip: "anim " + ANIM_AGARRE.arrastrar,
      unaVez: false,
      tipo: "arrastre"
    };
    if (this.agarrado) return {
      clip: "anim " + ANIM_AGARRE.apretar,
      unaVez: true,
      tipo: "agarre"
    };
    return null;
  }
  cuadroSnake(espectador) {
    const S = this.sn, p = this.ctx.rig.position;
    if (S.prev) {
      const d = Math.hypot(p.x - S.prev.x, p.z - S.prev.z);
      S.vel = d > 1 ? 0 : d * FPS;
      S.prev.copy(p);
    } else S.prev = p.clone();
    S.mov = S.vel > .3;
    if (S.inv > 0) {
      S.inv--;
      S.parpadeo = S.inv > 0 && (S.inv & 3) === 0;
    } else S.parpadeo = false;
    const R = S.reac;
    if (R) {
      R.t++;
      if (R.tipo === "sacudon") {
        if (R.t >= R.dur) {
          S.reac = null;
          S.inv = 32;
        }
      } else if (R.tipo === "derribo") {
        if (R.t > 16) R.empuje.multiplyScalar(7 / 8);
        if (R.empuje.lengthSq() > 1) {
          p.x += R.empuje.x * MM;
          p.z += R.empuje.z * MM;
          this.chocar(p, .3);
        }
        if (R.t === (R.lado === 1 ? 12 : 20)) sonido(51, p);
        if (R.t >= R.dur) {
          R.tipo = "piso";
          R.t = 0;
          S.inv = 32;
          S.boton = false;
        }
      } else if (R.tipo === "piso") {
        if (S.boton && R.t > 2 || this.botonMando() || R.t > 150) {
          R.tipo = "levanta";
          R.t = 0;
        }
      } else if (R.tipo === "levanta") {
        if (R.t >= DUR_DAÑO.levanta) {
          S.reac = null;
          S.inv = 24;
        }
      }
    }
    S.boton = false;
    if (S.accion && ++S.accion.t >= (S.accion.dur || 12)) S.accion = null;
    this.cuadroCombo();
    if (this.agarrado) {
      S.tSin++;
      S.tSuelto = S.cuadrado ? 0 : S.tSuelto + 1;
      if (S.tSin > 90 || S.tSuelto >= 9) this.soltar();
    }
    for (const g of this.ctx.guardias) if (g.tirado) {
      if (++g.tirado.t > 19 || g.accion !== "cae") {
        g.tirado = null;
        continue;
      }
      if (g.tirado.t < 8) continue;
      for (const o of this.activos()) if (o !== g && !o.tirado && ![ "muerto", "piso", "cae", "soltado", "levanta", "agarrado", "cuelloRoto" ].includes(o.accion) && o.o.position.distanceTo(g.o.position) < .9) this.dañar(o, 3, 4);
    }
    this.cuadroSangre();
    if (espectador) return;
    this.cuadroResfrio();
    this.cuadroHuellas();
    this.cuadroAgua();
    this.cuadroO2();
    this.cuadroCamion();
    this.cuadroCigarrillos();
    this.cuadroAliento();
  }
  botonMando() {
    let algo = false;
    try {
      for (const m of navigator.getGamepads?.() || []) if (m) for (const b of m.buttons) if (b.pressed) algo = true;
    } catch {}
    const nuevo = algo && !this._mandoAnt;
    this._mandoAnt = algo;
    return nuevo;
  }
  cuadroResfrio() {
    const S = this.sn, inv = this.ctx.inventario;
    if (!inv?.resfriado) {
      S.estornudo = 0;
      return;
    }
    if (this.com.modo !== 0 || S.reac || this.agarrado) return;
    if (++S.estornudo < 900) return;
    if (S.mov) return;
    S.estornudo = 0;
    const p = this.ctx.rig.position.clone();
    p.y += 1.5;
    sonido(19, p);
    this.setRuido(100, 16, p);
    this.vibrar(VIB.estornudo);
    this.ctx.aviso?.("¡ACHÚ!");
  }
  cuadroCigarrillos() {
    const inv = this.ctx.inventario;
    if (!inv || inv.item !== 0) return;
    if ((this.gvTime & 63) !== 0) return;
    const v = inv.getVida();
    if (v < 2) return;
    inv.setVida(v - 1);
    this.ctx.daño?.();
  }
  sigilo() {
    return this.ctx.inventario?.item === 10;
  }
  movSnake() {
    const p = this.ctx.rig.position;
    return {
      x: p.x * 1e3,
      y: p.y * 1e3 + ALT_SNAKE[this.postura()],
      z: p.z * 1e3
    };
  }
  movGuardia(g) {
    const p = g.o.position;
    return {
      x: p.x * 1e3,
      y: p.y * 1e3 + 1e3,
      z: p.z * 1e3
    };
  }
  enTrampa(nombre, m) {
    for (const c of this.trampas?.[nombre] || []) if (m.x >= c[0][0] && m.x <= c[1][0] && m.y >= c[0][1] && m.y <= c[1][1] && m.z >= c[0][2] && m.z <= c[1][2]) return true;
    return false;
  }
  cuadroHuellas() {
    const H = this.huellas;
    for (const h of H.lista) {
      if (!h || !h.viva) continue;
      if (++h.edad > VIDA_HUELLA) {
        h.viva = false;
        h.rastro = false;
        H.activas--;
        h.malla?.removeFromParent();
        h.malla = null;
        continue;
      }
      if (h.malla) h.malla.material.color.setScalar((48 - h.edad * 48 / 690) / 128);
    }
    if (!this.trampas || !this.trampas.asiato.length && !this.trampas.pool.length) return;
    if (!this.sn.mov || this.postura() === 2 || this.ctx.pared?.()) return;
    const m = this.movSnake();
    let edad0 = 0;
    if (this.enTrampa("pool", m)) {
      H.charco = 60;
      H.dist = 0;
      return;
    }
    if (H.charco > 0) {
      edad0 = 360 - H.charco * 2;
      H.charco--;
    } else if (!this.enTrampa("asiato", m)) {
      H.dist = 0;
      return;
    }
    H.dist += this.sn.vel / FPS;
    if (H.dist < PASO_HUELLA) return;
    H.dist = Math.min(H.dist - PASO_HUELLA, PASO_HUELLA);
    if (H.activas >= HUELLAS) return;
    this.ponerHuella(edad0);
  }
  ponerHuella(edad0 = 0) {
    const H = this.huellas, p = this.ctx.rig.position, y = this.ctx.yawSnake ? this.ctx.yawSnake() : 0;
    const vieja = H.lista[H.sig];
    if (vieja?.malla) vieja.malla.removeFromParent();
    if (vieja?.viva) H.activas--;
    H.lado ^= 1;
    const der = new THREE.Vector3(Math.cos(y), 0, -Math.sin(y)).multiplyScalar(H.lado ? .09 : -.09);
    const q = p.clone().add(der);
    q.y = p.y + .015;
    let malla = null;
    if (this.ctx.mundo) {
      if (!Juego.texHuella) {
        Juego.texHuella = (new THREE.TextureLoader).load("assets/hud/asiato.png");
        Juego.texHuella.colorSpace = THREE.SRGBColorSpace;
      }
      Juego.geoHuella ||= new THREE.PlaneGeometry(.14, .28).rotateX(-Math.PI / 2);
      malla = new THREE.Mesh(Juego.geoHuella, new THREE.MeshBasicMaterial({
        map: Juego.texHuella,
        color: (new THREE.Color).setScalar((48 - edad0 * 48 / 690) / 128),
        transparent: true,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.ReverseSubtractEquation,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        polygonOffset: true,
        polygonOffsetFactor: -4
      }));
      malla.position.copy(q);
      malla.rotation.y = y + Math.PI;
      malla.renderOrder = 2;
      malla.userData.propio = malla.userData.sinColision = true;
      this.ctx.mundo.add(malla);
    }
    H.lista[H.sig] = {
      p: p.clone(),
      edad: edad0,
      viva: true,
      rastro: true,
      malla: malla
    };
    H.activas++;
    H.sig = (H.sig + 1) % HUELLAS;
  }
  limpiarHuellas() {
    for (const h of this.huellas.lista) if (h) h.rastro = false;
  }
  huellaCercana(g, m) {
    let mejor = -1, md = 1e9;
    const o = g.o.position.clone();
    o.y += 1;
    this.huellas.lista.forEach((h, i) => {
      if (!h?.rastro) return;
      const dx = h.p.x - g.o.position.x, dz = h.p.z - g.o.position.z, L = Math.hypot(dx, dz) * 1e3;
      if (L >= md || L >= g.vision.len || difAbs(g.facedir, dirDe(dx, dz)) >= g.vision.angle) return;
      const q = h.p.clone();
      q.y += 1;
      if (!this.libre(o, q)) return;
      md = L;
      mejor = i;
    });
    return mejor;
  }
  siguienteHuella(i, desde) {
    const k = (i + 1) % HUELLAS, h = this.huellas.lista[k];
    if (!h?.rastro || h.p.distanceTo(desde) >= 5) return -1;
    const a = desde.clone(), b = h.p.clone();
    a.y += 1;
    b.y += 1;
    return this.libre(a, b) ? k : -1;
  }
  entrarHuellas(g) {
    const T = g.think;
    T.t2 = 5;
    this.paso(g, 5);
    T.huella = g.huella;
    T.cuenta = 0;
  }
  thHuellas(g) {
    const T = g.think, H = this.huellas.lista;
    switch (T.t3) {
     case 5:
      if (T.c3 === 1) {
        g.pad.sound = 136;
        this.ponerMarca(g, 4);
        g.turn = g.snDir;
      }
      if (T.c3 >= 17) {
        if (this.com.modo === 0) g.pad.sound = 243;
        const h = H[T.huella];
        if (!h?.rastro) {
          this.paso(g, 11);
          break;
        }
        T.objetivo = h.p.clone();
        T.cuenta = 0;
        g.pad.mode = 0;
        this.paso(g, 10);
      }
      break;

     case 10:
      g.pad.press |= 4;
      if (this.directo(g, T.objetivo, 500)) {
        const k = this.siguienteHuella(T.huella, T.objetivo);
        if (k >= 0) {
          T.huella = k;
          T.objetivo = H[k].p.clone();
          if (++T.cuenta === 12) this.paso(g, 32); else T.c3 = 0;
        } else {
          this.paso(g, 11);
          this.limpiarHuellas();
        }
      }
      break;

     case 32:
      if (T.l === 0 || T.l === 24) g.turn = (g.turn + 2048) % 4096;
      if (++T.l > 30) {
        T.cuenta = 0;
        this.paso(g, 10);
      }
      break;

     case 11:
      if (T.c3 === 21) {
        this.ponerMarca(g, 5);
        g.pad.sound = 244;
      }
      if (this.mirarAlrededor(g)) this.thinkReset2(g);
      break;

     default:
      this.paso(g, 5);
    }
    if (T.t2 !== 5) return;
    if (g.ba1 & 4) {
      this.entrarGolpeado(g);
      this.limpiarHuellas();
    } else if (g.alertLevel > 1) {
      this.gopointSnake();
      this.descubrir(g);
      this.limpiarHuellas();
    } else if (g.ba1 & 2) this.entrarCaja(g); else if (g.ba1 & 1) {
      this.entrarRuido(g);
      this.limpiarHuellas();
    }
  }
  entrarCaja(g) {
    g.think.t2 = 2;
    this.paso(g, 5);
  }
  thCaja(g) {
    const T = g.think, c = this.com, patea = () => g.ba1 & 16 || T.t1 === 2;
    switch (T.t3) {
     case 5:
      if (T.c3 === 1) {
        g.pad.sound = c.modo === 0 ? 136 : 150;
        this.ponerMarca(g, 5);
        g.turn = g.snDir;
      }
      if (T.c3 > 16) {
        T.objetivo = c.snakePos.clone();
        g.pad.mode = c.modo === 0 ? 0 : 1;
        this.paso(g, 9);
      }
      break;

     case 9:
      if (this.navegarA(g, T.objetivo)) this.paso(g, 10);
      if (g.snDis < 1500 && g.ba1 & 128) this.paso(g, patea() ? 12 : 11);
      break;

     case 10:
      if (this.directo(g, T.objetivo, 1500)) {
        g.turn = g.snDir;
        this.paso(g, patea() && g.ba1 & 128 ? 12 : 11);
      }
      break;

     case 11:
      g.pad.press |= 4;
      if (T.c3 === 21) {
        this.ponerMarca(g, 5);
        if (c.modo === 0) g.pad.sound = 242;
      }
      if (T.c3 > 121) this.thinkReset2(g);
      break;

     case 12:
      if (T.c3 === 1) {
        if (c.danbowl && c.danbowl !== g) {
          this.paso(g, 13);
          break;
        }
        c.danbowl = g;
        g.turn = g.snDir;
        g.actend = false;
      }
      if (T.c3 === 64 && !(g.ba1 & 16) && c.modo === 0) g.pad.sound = 140;
      if (g.actend || T.c3 >= 302) {
        if (c.danbowl === g) c.danbowl = 0;
        this.thinkReset2(g);
        break;
      }
      g.pad.press |= 4194304;
      break;

     case 13:
      if (!c.danbowl) {
        this.thinkReset2(g);
        break;
      }
      g.pad.press |= 4;
      break;

     default:
      this.paso(g, 5);
    }
    if (T.t2 !== 2) return;
    if (g.ba1 & 4) {
      if (c.danbowl === g) c.danbowl = 0;
      this.entrarGolpeado(g);
      return;
    }
    if (g.alertLevel > 1 || g.ba1 & 2) {
      if (c.danbowl === g) c.danbowl = 0;
      this.gopointSnake();
      this.descubrir(g);
      return;
    }
    if (g.ba1 & 1) {
      if (c.danbowl === g) c.danbowl = 0;
      if (g.ruidoP === 255) {
        T.objetivo.copy(g.ruidoPos);
        T.t2 = 7;
        this.paso(g, 16);
      } else this.descubrir(g);
    }
  }
  actoresJuego(actores, {proc: proc = null} = {}) {
    this.correrProc = proc;
    const num = (v, d) => Array.isArray(v) && typeof v[0] === "number" ? v[0] : d;
    for (const a of actores || []) {
      const o = a.opts || {};
      if (a.tipo === "FEWDAMAGE" && !this.o2s.some(x => x.nombre === a.nombre)) {
        const oo = Array.isArray(o.o) ? o.o : [ 0, 0 ], ii = Array.isArray(o.i) ? o.i : [ 0, 0 ];
        this.o2s.push({
          nombre: a.nombre,
          gasto: oo[0] | 0,
          "dañoSinAire": oo[1] | 0,
          h: num(o.h, 0),
          m: num(o.m, 1) || 1,
          r: num(o.r, 0),
          proc: o.e?.[0]?.proc || 0,
          on: !!ii[0],
          "dañoOn": !!ii[1],
          f28: 0,
          f30: 0,
          f40: 0,
          f50: 0
        });
      } else if ((a.tipo === "WT_AREA" || a.tipo === "WT_AREA2") && Array.isArray(o.b) && o.b.length >= 6 && !this.aguas.some(x => x.nombre === a.nombre)) {
        this.aguas.push({
          nombre: a.nombre,
          b: o.b,
          proc: o.e?.[0]?.proc || 0,
          cuerpo: false,
          cabeza: false,
          ojo: false,
          dos: a.tipo === "WT_AREA2",
          sinRuido: !!num(o.s, 0),
          salpica: false
        });
      } else if (a.tipo === "SNEBREATH" && !(this.alientos ||= []).some(x => x.nombre === a.nombre)) {
        this.alientos.push({
          nombre: a.nombre,
          t: num(o.t, 64),
          visible: true
        });
      } else if (a.tipo === "TRUCKTRAP" && !this.camionesCaja.some(x => x.nombre === a.nombre)) {
        this.camionesCaja.push({
          nombre: a.nombre,
          t: num(o.t, 90),
          procs: (o.e || []).map(x => x?.proc || 0),
          adentro: false,
          item: -1,
          cuenta: 0,
          pos: null
        });
      }
    }
  }
  mensaje(dest, v) {
    if (!Array.isArray(v)) return false;
    const B = this.alientos?.find(x => x.nombre === dest);
    if (B) {
      B.visible = v[0] === 3538;
      return true;
    }
    const W = this.aguas.find(x => x.nombre === dest);
    if (W) {
      if (v[0] === 17363) W.salpica = true; else if (v[0] === 16949) W.salpica = false; else return false;
      return true;
    }
    const K = this.camionesCaja.find(x => x.nombre === dest);
    if (K) {
      if (v[0] === 3538) {
        K.adentro = true;
        K.item = -1;
        K.cuenta = 0;
        K.pos = this.ctx.rig.position.clone();
        return true;
      }
      if (v[0] === 54732) {
        K.adentro = false;
        return true;
      }
      return false;
    }
    const A = this.o2s.find(x => x.nombre === dest);
    if (!A) return false;
    switch (v[0]) {
     case 28647:
      A.on = true;
      break;

     case 37605:
      A.on = false;
      break;

     case 20009:
      A.dañoOn = true;
      break;

     case 39518:
      A.dañoOn = false;
      break;

     case 64165:
      A.gasto = v[1] | 0;
      A.dañoSinAire = v[2] | 0;
      break;

     case 55527:
      A.h = v[1] | 0;
      break;

     case 13387:
      A.m = v[1] | 0 || 1;
      break;

     default:
      return false;
    }
    return true;
  }
  cuadroAgua() {
    if (!this.aguas.length) return;
    const p = this.ctx.rig.position, post = this.postura(), mov = this.movSnake();
    const cab = {
      x: mov.x,
      y: p.y * 1e3 + [ 1550, 900, 136 + 320 ][post],
      z: mov.z
    };
    const dentro = (b, q) => q.x >= b[0] && q.x <= b[3] && q.y >= b[1] && q.y <= b[4] && q.z >= b[2] && q.z <= b[5];
    for (const W of this.aguas) {
      const c = dentro(W.b, W.dos ? {
        x: mov.x,
        y: mov.y - (this.ctx.altoCuerpo?.() ?? [ 1700, 1100, 450 ][post]) / 2,
        z: mov.z
      } : mov);
      if (c !== W.cuerpo) {
        W.cuerpo = c;
        const s = new THREE.Vector3(p.x, W.b[4] * MM, p.z);
        let ruido = true;
        if (W.dos) {
          if (c) {
            sonido(176, s);
            W.salpica = false;
          }
        } else if (c && W.salpica) {
          sonido(176, s);
          W.salpica = false;
        } else {
          sonido(177, s);
          ruido = !c;
        }
        if (ruido && !W.sinRuido) this.setRuido(100, 2, s);
        if (!W.dos) this.sn.enAgua = c;
      }
      if (W.dos && this.ctx.ojo) {
        const e = this.ctx.ojo(), o = !!e && dentro(W.b, {
          x: e.x * 1e3,
          y: e.y * 1e3,
          z: e.z * 1e3
        });
        if (o !== W.ojo) {
          W.ojo = o;
          if (o) sonido(178, null); else this.ctx.cortarSonido?.(4278190334);
          if (W.proc && this.correrProc) {
            try {
              this.correrProc(W.proc, [ o ? 63192 : 48851 ]);
            } catch (e) {
              console.warn("wt_area2 proc", e);
            }
          }
        }
      }
      const h = dentro(W.b, cab);
      if (h !== W.cabeza) {
        W.cabeza = h;
        if (!h) sonido(179, new THREE.Vector3(p.x, W.b[4] * MM, p.z));
        if (W.proc && this.correrProc) {
          try {
            this.correrProc(W.proc, [ h ? 10868 : 62062 ]);
          } catch (e) {
            console.warn("wt_area proc", e);
          }
        }
      }
    }
  }
  cuadroO2() {
    for (const A of this.o2s) {
      if (this.muerto) return;
      let daño = 0, avisa = false;
      if (A.on) {
        const red = this.ctx.inventario?.item === 7 ? A.m : 1;
        const t = A.f28 + Math.trunc(A.gasto / red);
        this.o2 -= t >> 12;
        A.f28 = t & 4095;
        if (this.o2 < 0) {
          this.o2 = 0;
          daño = A.dañoSinAire;
          avisa = true;
        }
      } else {
        const t = A.f40 + A.r;
        A.f40 = t & 4095;
        this.o2 = Math.min(O2_MAX, this.o2 + (t >> 12));
      }
      if (A.dañoOn) {
        avisa = true;
        daño += A.h;
      }
      if (this.vida > 0) {
        const t = A.f30 + daño, d = t >> 12;
        A.f30 = t & 4095;
        if (avisa && (++A.f50 & 15) === 0) {
          sonido(106);
          this.ctx.daño?.();
        }
        if (d > 0) {
          const inv = this.ctx.inventario;
          this.vida -= d / (inv?.vidaMax || 256);
          const racion = inv && inv.item === 13 && inv.items[13] > 0 && !inv.congeladas;
          if (this.vida <= 0 && A.proc && this.correrProc && !racion) {
            try {
              this.correrProc(A.proc, [ this.postura() === 2 ? 61281 : 47530 ]);
            } catch {}
          }
        }
      }
    }
  }
  cuadroCamion() {
    const inv = this.ctx.inventario;
    if (!inv) return;
    for (const K of this.camionesCaja) {
      if (!K.adentro) continue;
      const it = inv.item, p = this.ctx.rig.position;
      if (it === K.item && it >= 2 && it <= 4 && !inv.agachado) {
        if (!K.pos || K.pos.distanceToSquared(p) > 1e-8 || inv.abierto) {
          K.cuenta = 0;
          K.pos = p.clone();
        }
        if (this.com.modo !== 0 || this.snakeBloqueado()) K.cuenta = 0;
        if (K.cuenta > K.t) {
          const proc = K.procs[it - 2] || 0;
          if (proc && this.correrProc) {
            K.adentro = false;
            K.cuenta = 0;
            window.debugLog?.("juego", `camión: caja ${"ABC"[it - 2]} → proc ${proc}`);
            try {
              this.correrProc(proc, []);
            } catch (e) {
              console.warn("camión", e);
            }
          } else K.cuenta = 0;
        }
        K.cuenta++;
      } else {
        K.item = it >= 2 && it <= 4 ? it : -1;
        K.cuenta = 0;
        K.pos = p.clone();
      }
    }
  }
  cuadroAliento() {
    const B = this.alientos?.find(x => x.visible);
    if (B && this.com.modo !== 1 && !this.sn.mov && !this.sn.reac && !this.ctx.inventario?.o?.primeraPersona?.() && this.gvTime % B.t === 0 && this.ctx.mundo) {
      const p = this.ctx.rig.position, y = this.ctx.yawSnake ? this.ctx.yawSnake() : 0, alt = [ 1.55, .92, .35 ][this.postura()];
      const q = new THREE.Vector3(p.x - Math.sin(y) * .18, p.y + alt, p.z - Math.cos(y) * .18);
      if (!Juego.texAliento) {
        const c = document.createElement("canvas");
        c.width = c.height = 32;
        const x = c.getContext("2d");
        const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
        g.addColorStop(0, "rgba(255,255,255,0.8)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        x.fillStyle = g;
        x.fillRect(0, 0, 32, 32);
        Juego.texAliento = new THREE.CanvasTexture(c);
      }
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Juego.texAliento,
        transparent: true,
        depthWrite: false,
        opacity: .5
      }));
      s.position.copy(q);
      s.scale.setScalar(.08);
      s.userData.propio = s.userData.sinColision = true;
      this.ctx.mundo.add(s);
      (this._alientos ||= []).push({
        s: s,
        t: 0,
        d: new THREE.Vector3(-Math.sin(y), .3, -Math.cos(y)).multiplyScalar(.006)
      });
    }
    for (const a of (this._alientos || []).slice()) {
      a.t++;
      a.s.position.add(a.d);
      a.s.scale.setScalar(.08 + a.t * .012);
      a.s.material.opacity = .5 * (1 - a.t / 24);
      if (a.t >= 24) {
        a.s.removeFromParent();
        a.s.material.dispose();
        this._alientos.splice(this._alientos.indexOf(a), 1);
      }
    }
  }
  estrellas(g) {
    const ver = g.accion === "piso" && g.tPiso >= 90 && g.o.visible;
    if (!ver) {
      if (g.estrellas) g.estrellas.visible = false;
      return;
    }
    if (!g.estrellas) {
      if (!Juego.texEstrella) {
        const c = document.createElement("canvas");
        c.width = c.height = 16;
        const x = c.getContext("2d");
        x.fillStyle = "#ffe24a";
        x.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i & 1 ? 3 : 7.5, a = i * Math.PI / 5 - Math.PI / 2;
          x.lineTo(8 + Math.cos(a) * r, 8 + Math.sin(a) * r);
        }
        x.closePath();
        x.fill();
        Juego.texEstrella = new THREE.CanvasTexture(c);
        Juego.texEstrella.magFilter = THREE.NearestFilter;
      }
      g.estrellas = new THREE.Group;
      g.estrellas.userData.propio = g.estrellas.userData.sinColision = true;
      for (let i = 0; i < 3; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: Juego.texEstrella,
          depthTest: false,
          transparent: true
        }));
        s.scale.setScalar(.12);
        s.renderOrder = 998;
        g.estrellas.add(s);
      }
      this.ctx.mundo?.add(g.estrellas);
    }
    const E = g.estrellas, h = g.o.getObjectByName("hueso_6"), c = new THREE.Vector3;
    if (h) h.getWorldPosition(c); else c.copy(g.o.position).setY(g.o.position.y + .3);
    E.position.copy(c);
    E.position.y += .18;
    E.visible = true;
    E.children.forEach((s, i) => {
      const a = this.frame * .15 + i * Math.PI * 2 / 3;
      s.position.set(Math.cos(a) * .2, Math.sin(a * 2) * .03, Math.sin(a) * .2);
    });
  }
  o2Hud() {
    return this.o2 < O2_MAX ? this.o2 / O2_MAX : null;
  }
  refuerzos() {
    const c = this.com;
    for (const g of this.ctx.guardias) {
      const R = g.reset;
      if (!R || g.borrado) continue;
      if (R.estado === 1) {
        if (--R.t <= 0) {
          if (g.resets) {
            R.estado = 2;
            c.resetNum++;
          } else g.reset = null;
        }
      } else if (R.estado === 2 && c.modo === 1 && (c.resetNum < c.resetMax + 1 || c.resetMax === 255) && c.puntosReset.length && (!this.reglasVR || g.faseout)) this.reaparecer(g); else if (R.estado === 2 && c.reponerSiempre && g.faseout && c.puntosReset.length) this.reaparecer(g);
    }
  }
  reaparecer(g) {
    const c = this.com, s = this.ctx.rig.position, n = c.puntosReset.length, d0 = this.gvTime % n;
    let z = c.puntosReset[d0];
    for (let i = 0; i < n; i++) {
      const k = c.puntosReset[(i + d0) % n], q = this.zonas[k].p;
      if (Math.hypot(q.x - s.x, q.z - s.z) > 10) {
        z = k;
        break;
      }
    }
    const zs = this.zonaOCercana(s), w = zs >= 0 ? this.boundOutZone(zs, z, 200) : z, q = this.zonas[w >= 0 ? w : z].p;
    g.reset = null;
    if (g.resets !== 255) g.resets--;
    g.o.position.set(q.x, q.y + 1, q.z);
    g.o.visible = true;
    g.inactivo = false;
    g.faseout = false;
    g.gritoMuerte = false;
    g.vital = g.vitalMax;
    g.faint = g.faintMax;
    g.capturado = false;
    g.durmiendo = false;
    g.alertLevel = 0;
    g._caja = null;
    const T = g.think;
    T.t1 = 0;
    T.t2 = 0;
    T.t3 = 0;
    T.t4 = 0;
    T.c3 = 0;
    T.l = 0;
    T.nodo = g.nodos.length - 1;
    T.objetivo = g.nodos[0].p.clone();
    T.pasoZona = null;
    g.pad.mode = 1;
    g.pad.sound = 0;
    g.rot = g.turn = g.facedir = 0;
    this.cambiar(g, "quieto", A.PARADO);
    window.debugLog?.("juego", `refuerzo: guardia ${g.num} en la zona ${w}`);
  }
  sangre(pos, aMode = 1) {
    if (!this.ctx.mundo) return;
    const n = 16, g = new THREE.BufferGeometry, P = new Float32Array(n * 3), V = [];
    const chorros = aMode === 2 ? 2 : aMode === 3 ? 0 : 1, dir = new THREE.Vector3(Math.random() - .5, 0, Math.random() - .5).normalize();
    for (let i = 0; i < n; i++) {
      P[i * 3] = pos.x;
      P[i * 3 + 1] = pos.y;
      P[i * 3 + 2] = pos.z;
      const d = chorros === 0 ? new THREE.Vector3(Math.random() - .5, Math.random() * .6, Math.random() - .5).multiplyScalar(.03) : dir.clone().multiplyScalar((i % chorros === 0 ? 1 : -1) * (.03 + Math.random() * .04)).add(new THREE.Vector3((Math.random() - .5) * .02, .02 + Math.random() * .04, (Math.random() - .5) * .02));
      V.push(d);
    }
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
      color: 9043968,
      size: chorros === 0 ? 2 : 3,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false
    }));
    pts.frustumCulled = false;
    pts.userData.propio = pts.userData.sinColision = true;
    this.ctx.mundo.add(pts);
    (this._sangre ||= []).push({
      pts: pts,
      V: V,
      t: 0
    });
  }
  cuadroSangre() {
    if (!this._sangre?.length) return;
    for (const s of this._sangre.slice()) {
      const P = s.pts.geometry.attributes.position.array;
      for (let i = 0; i < s.V.length; i++) {
        s.V[i].y -= 11 * MM;
        P[i * 3] += s.V[i].x;
        P[i * 3 + 1] += s.V[i].y;
        P[i * 3 + 2] += s.V[i].z;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.opacity = 1 - s.t / 16;
      if (++s.t >= 16) {
        s.pts.removeFromParent();
        s.pts.geometry.dispose();
        s.pts.material.dispose();
        this._sangre.splice(this._sangre.indexOf(s), 1);
      }
    }
  }
  vibrar(patron) {
    if (!patron) return;
    if (!ctl.vibraActiva()) return;
    const ms = patron.reduce((a, [, c]) => a + c, 0) * 1e3 / FPS;
    try {
      ctl.vibrar({
        m2: patron.flat()
      }, {
        celular: false,
        xr: false
      });
    } catch {}
    if (this.ctx.vibrar) this.ctx.vibrar(Math.max(1, Math.round(ms / 33)));
  }
  destruir() {
    for (const g of this.ctx.guardias) {
      g.marca?.removeFromParent();
      g.marcaQ?.removeFromParent();
    }
    for (const b of this.balas) b.mesh?.removeFromParent();
    for (const e of this.granadasE || []) e.obj.removeFromParent();
    for (const g of this.ctx.guardias) g.granadaMano?.obj.removeFromParent();
    for (const h of this.huellas.lista) h?.malla?.removeFromParent();
    for (const s of this._sangre || []) s.pts.removeFromParent();
    for (const a of this._alientos || []) a.s.removeFromParent();
    for (const g of this.ctx.guardias) g.estrellas?.removeFromParent();
    if (typeof removeEventListener === "function") {
      removeEventListener("keydown", this._tecla);
      removeEventListener("pointerdown", this._tecla);
    }
    this.vista.removeFromParent();
    this.paredCol.removeFromParent();
    this.paredColG?.removeFromParent();
  }
}
