// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Sistema, Personaje, PLAYER, STATE, MM, ANG, ratan2, difS, difAbs, randU, randS, tomarPendientes } from "./comun.js";

import { aplicarPose } from "../jefes/base.js";

export const TIPOS_PERRO = new Set([ "DOG" ]);

export const esPerro = a => !!a && TIPOS_PERRO.has(a.tipo);

const MSJ = [ 21803, 29001, 54475 ];

const IT = {
  SCOPE: 1,
  BOX1: 2,
  BOX2: 3,
  BOX3: 4,
  NVG: 5,
  THERMG: 6,
  CAMERA: 12,
  "PAÑUELO": 22
};

const WP = {
  STINGER: 4,
  PSG1: 9
};

const tdiv = (a, b) => Math.trunc(a / b);

const rsin = a => Math.trunc(Math.sin(a * ANG) * 4096);

const V = (x, y, z) => new THREE.Vector3(x, y, z);

const en = (p, x0, x1, z0, z1) => p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1;

function dirA(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.round(Math.hypot(dx, dz));
  return {
    len: len,
    x: (ratan2(len, dy) & 4095) - 1024,
    y: ratan2(dx, dz) & 4095,
    z: 0
  };
}

const cercaDe = (v, obj, pasos) => tdiv(v * (pasos - 1) + obj, pasos);

const SIN_ACTUALIZAR = new Set([ 8, 9, 10, 11, 12, 13 ]);

const texCache = {};

function textura(url) {
  if (!texCache[url]) {
    const t = (new THREE.TextureLoader).load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    texCache[url] = t;
  }
  return texCache[url];
}

function texturaZ() {
  if (texCache.z) return texCache.z;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  x.font = "bold 26px monospace";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = "#fff";
  x.strokeStyle = "#000";
  x.lineWidth = 3;
  x.strokeText("Z", 16, 17);
  x.fillText("Z", 16, 17);
  texCache.z = new THREE.CanvasTexture(c);
  texCache.z.colorSpace = THREE.SRGBColorSpace;
  return texCache.z;
}

class Perro extends Personaje {
  constructor(actor, mgr, sis, jau, i) {
    super(actor, mgr, sis);
    this.jau = jau;
    this.i = i;
    this.lado = "enemigo";
    this.nombre = "DOG";
    this.tv = {
      x: 0,
      y: 0,
      z: 0
    };
    this.rotX = 0;
    this.rotZ = 0;
    this.modo = 0;
    this.sub = 0;
    this.accion = 2;
    this.prevModo = 0;
    this.dist = 0;
    this.dirSn = {
      x: 0,
      y: 0,
      z: 0
    };
    this.reloj = randU(4096);
    this.espera = 0;
    this.fase = randU(4096);
    this.ancla = V(0, 0, 0);
    this.zadr = 65535;
    this.vy = 0;
    this.vista = 255;
    this.tGolpe = 0;
    this.aturdido = 0;
    this.contento = 0;
    this.addrVuelta = 65535;
    this.tContento = 0;
    this.ojos = 0;
    this.ausente = 0;
    this.tMarca = 0;
    this.tPañuelo = randU(64) + 30;
    this.tCorre = 0;
    this.tocado = 0;
    this.trasAnim = -1;
    this.pitchRuta = 0;
    this.tSentado = 0;
    this.puntos = [];
    this.nPuntos = 0;
    this.sig = 0;
    this.actual = 0;
    this.ctrlH = -1;
    this.rSphere = -2;
    this.radarAtr = 5;
    this.claseOn = true;
    this.homing = 1;
    this.vital = 256;
    this.nTouches = 0;
    this.escala = i === 2 ? .5 : 1;
    this.tamBlanco = i === 2 ? [ 300, 1e3, 300 ] : [ 500, 1e3, 500 ];
    this.tamAtaque = i === 2 ? [ 40, 200, 40 ] : [ 500, 500, 500 ];
    this.visible = true;
    this.animar = true;
  }
  async iniciar(anim) {
    await this.cargarCon("personajes/wolfdog.glb", anim, null);
    this.o.rotation.order = "YXZ";
    this.o.scale.setScalar(this.escala);
    this.o.traverse(m => {
      if (m.isMesh) m.userData.sinColision = true;
    });
    if (this.jau.modoS === 0) this.ponerOjos();
  }
  ponerOjos() {
    const h = this.huesos[5];
    if (!h) return;
    const tex = textura("assets/personajes/wolf_eye.png");
    const quad = (v, espejo) => {
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute(v.flatMap(q => [ q[0] * MM, q[1] * MM, q[2] * MM ]), 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(espejo ? [ 1, 0, 0, 0, 1, 1, 0, 1 ] : [ 0, 0, 1, 0, 0, 1, 1, 1 ], 2));
      g.setIndex([ 0, 1, 2, 1, 3, 2 ]);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        map: tex,
        color: 16711680,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      }));
      m.userData.sinColision = true;
      m.renderOrder = 5;
      h.add(m);
      return m;
    };
    this.ojosMesh = [ quad([ [ -55, 50, 160 ], [ -30, 45, 170 ], [ -55, 10, 160 ], [ -30, 5, 170 ] ], false), quad([ [ 30, 45, 170 ], [ 55, 50, 160 ], [ 30, 5, 170 ], [ 55, 10, 160 ] ], true) ];
    this.tOjos = 0;
  }
  cuadroOjos() {
    if (!this.ojosMesh) return;
    if (--this.tOjos < 0) this.tOjos = randU(128) + 10;
    const ver = this.ojos !== 0 && this.tOjos >= 5;
    for (const m of this.ojosMesh) m.visible = ver;
  }
  vitalBlanco() {
    return this.vital;
  }
  cuadro() {}
  actControl() {
    const s = this.step;
    const x0 = this.mov.x, z0 = this.mov.z;
    this.mov.x += s.x;
    this.mov.z += s.z;
    this.nTouches = 0;
    if (this.rSphere > 0) {
      const p = V(this.mov.x * MM, (this.mov.y - Math.max(0, this.ctrlH)) * MM, this.mov.z * MM), a = p.clone();
      this.J.chocar(p, Math.min(.45, this.rSphere * MM));
      this.mov.x = Math.round(p.x * 1e3);
      this.mov.z = Math.round(p.z * 1e3);
      if (Math.abs(p.x - a.x) + Math.abs(p.z - a.z) > 1e-6) this.nTouches = 1;
    }
    const t = this.tv.y & 4095;
    if (this.interpCtrl === 0) {
      this.rot = this.rot + tdiv(difS(t, this.rot), 4) & 4095;
      this.rotX += tdiv(difS(this.tv.x, this.rotX), 4);
    } else {
      this.rot = this.rot + tdiv(difS(t, this.rot), this.interpCtrl + 1) & 4095;
      this.rotX += tdiv(difS(this.tv.x, this.rotX), this.interpCtrl + 1);
      this.interpCtrl--;
    }
    if (this.rSphere >= -1) {
      const alto = Math.max(0, this.ctrlH);
      let vy = this.mov.y + s.y;
      this.grounded = 0;
      const h = this.J.alturaPiso?.(this.mov.x * MM, this.mov.z * MM, (this.mov.y - alto) * MM + .5);
      const piso = h == null ? this.piso ?? 0 : Math.round(h * 1e3);
      if (piso + alto > vy) {
        vy = piso + alto;
        this.grounded = 1;
      }
      this.mov.y = vy;
      this.piso = this.mov.y - alto;
    }
    return x0 !== this.mov.x || z0 !== this.mov.z;
  }
  actMotion() {
    if (this.animar) super.actMotion(); else this.step.set(0, this.step.y, 0);
  }
  dibujar() {
    if (!this.o) return;
    this.o.visible = this.visible;
    if (!this.visible) return;
    const alt = this.motor.altura * this.escala;
    this.o.position.set(this.mov.x * MM, (this.mov.y - alt) * MM, this.mov.z * MM);
    this.o.rotation.set(this.rotX * ANG, this.rot * ANG, 0, "YXZ");
    aplicarPose(this.huesos, this.padres, this.motor.rots, this.adjust, this.motor.altura * MM);
  }
  marca(n) {
    if (!this.o) return;
    const url = n === 6 ? "assets/personajes/heart.png" : n === 0 ? "assets/hud/b_mark.png" : "assets/hud/q_mark.png";
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textura(url),
      color: n === 6 ? 16777215 : 16726570,
      depthTest: false,
      transparent: true
    }));
    const alto = this.i === 2 ? .45 : .9;
    s.scale.set(.4, .4, 1);
    s.renderOrder = 999;
    s.position.copy(this.puntoHueso(5));
    s.position.y += alto;
    s.userData.sinColision = true;
    this.mgr.mundo.add(s);
    const y0 = s.position.y;
    this.mgr.fx.push({
      t: 0,
      dur: 30,
      fn: t => {
        s.position.y = y0 + Math.min(t, 6) * .01;
      },
      fin: () => {
        s.removeFromParent();
        s.material.dispose();
      }
    });
  }
  zzz() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaZ(),
      depthTest: true,
      transparent: true
    }));
    s.scale.set(.18, .18, 1);
    s.position.set(this.mov.x * MM, (this.mov.y + 200) * MM, this.mov.z * MM);
    s.userData.sinColision = true;
    this.mgr.mundo.add(s);
    const y0 = s.position.y;
    this.mgr.fx.push({
      t: 0,
      dur: 45,
      fn: t => {
        s.position.y = y0 + t * .008;
        s.material.opacity = 1 - t / 45;
      },
      fin: () => {
        s.removeFromParent();
        s.material.dispose();
      }
    });
  }
  aliento(fuerte) {
    this.chispa(this.puntoHueso(6, {
      x: 0,
      y: 0,
      z: 60
    }), fuerte ? .16 : .1, fuerte ? 20 : 10, 14540253);
  }
  conoRadar() {
    if (!this.o || !this.visible || this.ausente || !(this.radarAtr & 1)) return null;
    const s = this.J.ctx.rig.position, post = this.J.postura?.() ?? 0, alto = this.mov.y * MM - (s.y + [ 1.1, .496, .136 ][post]);
    const cono = !!(this.radarAtr & 4) && this.vista > 0;
    const dir = this.rot + (this.adjust?.[5]?.[1] || 0) & 4095, dis = this.i !== 2 ? tdiv(this.vista * 4e3, 255) : tdiv(this.vista * 5e3, 255);
    const alerta = this.jau.alerta === 1;
    return {
      p: this.o.position,
      r: dir * ANG,
      dis: cono ? dis * MM : 0,
      mitad: (this.i !== 2 ? 700 : 400) * ANG,
      estado: alerta ? "alerta" : "normal",
      color: alerta ? "rojo" : "celeste",
      alerta: alerta,
      alto: alto,
      enAltura: alto >= -2 && alto < 2,
      perro: this
    };
  }
  estadoPrueba() {
    return {
      i: this.i,
      modo: this.modo,
      sub: this.sub,
      accion: this.accion,
      pos: [ Math.round(this.mov.x), Math.round(this.mov.y), Math.round(this.mov.z) ],
      rot: this.rot,
      dist: this.dist,
      vital: this.vital,
      ausente: this.ausente,
      visible: this.visible,
      blanco: this.blanco,
      contento: this.contento,
      rSphere: this.rSphere
    };
  }
}

export class Jauria {
  constructor(actor, mgr, sis) {
    this.actor = actor;
    this.mgr = mgr;
    this.sis = sis;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    this.opts = actor.opts || {};
    this.vivo = true;
    this.listo = false;
    this.blanco = false;
    this.barras = [];
    this.o = null;
    this.nombre = actor.nombre;
    this.perros = [];
    this.mensajes = [];
    this.registro = [];
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  valor(v, d) {
    if (!Array.isArray(v) || v[0] == null) return d;
    const x = v[0];
    if (typeof x === "number") return x;
    if (x && typeof x === "object" && "var" in x) {
      const g = this.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null);
      const r = g?.vars?.get?.(x.var);
      return typeof r === "number" ? r : d;
    }
    return d;
  }
  proc(letra) {
    const v = this.opts[letra];
    const x = Array.isArray(v) ? v[0] : null;
    return x && typeof x === "object" && "proc" in x ? x.proc : -1;
  }
  async iniciar() {
    const o = this.opts;
    this.procH = this.proc("h");
    this.procO = this.proc("o");
    this.cajas = this.valor(o.b, 0);
    this.modoS = this.valor(o.s, 0);
    this.c = this.valor(o.c, 0) === 1 ? 1 : 0;
    const rutas = Array.isArray(o.r) ? o.r.filter(x => typeof x === "number") : [];
    this.n = this.modoS !== 0 || this.c !== 0 ? 2 : Math.min(2, rutas.length);
    this.vitalMax = this.valor(o.l, 256);
    this.maxReap = this.valor(o.d, 2);
    const pp = Array.isArray(o.p) ? o.p.filter(x => typeof x === "number") : [];
    this.hayP = pp.length >= 3 ? 1 : 0;
    this.posP = this.hayP ? V(pp[0], pp[1], pp[2]) : V(0, 0, 0);
    const sn = this.sis.snake(), anim = this.modoS === 1 ? "wolfdog2" : "wolfdog";
    this.tabla = this.modoS === 1 ? Array.from({
      length: 30
    }, () => -1) : Array.from({
      length: 30
    }, (_, i) => i);
    if (this.modoS === 1) Object.assign(this.tabla, {
      0: 0,
      1: 1,
      2: 2,
      9: 3,
      16: 6,
      24: 4,
      28: 5
    });
    for (let i = 0; i <= this.n; i++) {
      const p = new Perro(this.actor, this.mgr, this.sis, this, i);
      this.perros.push(p);
    }
    await Promise.all(this.perros.map(p => p.iniciar(anim)));
    for (const p of this.perros) {
      this.mgr.agregar(p);
      p.listo = true;
    }
    const ausentesAdultos = this.maxReap < 0 || this.modoS === 1 || this.c !== 0;
    for (const p of this.perros) {
      const i = p.i;
      p.radarAtr = this.c === 0 || i === 2 ? 5 : 0;
      p.rSphere = -2;
      p.interpCtrl = 4;
      if (i !== 2) {
        if (this.modoS !== 1 && this.c === 0) {
          let r = rutas[i] ?? rutas[0] ?? 0;
          const hz = this.J.ctx.hz;
          if (!hz?.rutas || hz.rutas.length < r + 1) r = 0;
          p.puntos = p.ruta(r).map(q => q.p);
          p.nPuntos = p.puntos.length;
          if (!p.nPuntos) {
            p.puntos = [ sn.clone() ];
            p.nPuntos = 1;
            console.warn("[perros] ruta", r, "sin puntos");
          }
          p.actual = randU(4096) % p.nPuntos;
          p.sig = p.actual + 1;
          if (p.sig >= p.nPuntos) p.sig = 0;
          p.mov.copy(p.puntos[p.sig]);
        }
      } else {
        this.sigue = randU(2);
        p.mov.copy(this.perros[this.sigue]?.mov || sn);
      }
      p.vital = this.vitalMax;
      p.claseOn = true;
      p.homing = 1;
      if (this.c === 0) {
        p.modo = 0;
        p.sub = 0;
        p.contento = 0;
        p.ausente = 0;
      } else if (i === 2) {
        p.modo = 0;
        p.sub = 0;
      } else {
        p.claseOn = false;
        p.homing = 0;
      }
      if (ausentesAdultos && i !== 2) {
        p.modo = 15;
        p.sub = 0;
        p.ausente = 1;
        p.mov.copy(sn);
      }
      p.accion = 2;
      p.pose0(this.tabla[2] >= 0 ? this.tabla[2] : 0);
      p.motor.accion(this.tabla[2] >= 0 ? this.tabla[2] : 0, 0);
      p.ctrlH = p.motor.altura;
      p.mov.y += p.ctrlH;
      if (i === 2) {
        this.posC = (this.perros[this.sigue]?.mov || sn).clone();
        this.addrC = p.addr(this.posC);
        p.zadr = p.addr(p.mov);
      }
      p.lodAlto = 1;
    }
    Object.assign(this, {
      tLadrido: 0,
      alerta: 0,
      tAlerta: 0,
      contentos: 0,
      ladridoDiferido: 0,
      quienLadra: 0,
      vibracion: 0,
      escena: 0,
      reap: 0,
      tIrA: 0,
      relojJ: 0,
      tRuido: 0,
      pulsados: 0,
      f1610: 0,
      f1614: 0,
      f1618: -1,
      tCabeza: 0,
      tPis: 0,
      procesados: 0,
      addrObj: 65535,
      posObj: V(0, 0, 0),
      snakeY: sn.y,
      camara: null,
      guardado: null
    });
    this.teclas = 0;
    this.alTecla = () => {
      this.teclas++;
    };
    if (typeof window !== "undefined") window.addEventListener("keydown", this.alTecla);
    for (const p of this.perros) this.ver(p), p.dibujar();
    this.log("inicio", {
      n: this.n + 1,
      s: this.modoS,
      c: this.c,
      vital: this.vitalMax,
      d: this.maxReap,
      cajas: this.cajas
    });
  }
  perroPorIndice(i) {
    return this.perros[i];
  }
  snake() {
    return this.sis.snake();
  }
  estadoSnake() {
    return this.sis.estadoSnake();
  }
  intrude() {
    return !!(this.estadoSnake() & PLAYER.INTRUDE);
  }
  reac() {
    return this.J.sn?.reac || null;
  }
  derribado() {
    const r = this.reac();
    return !!r && [ "derribo", "piso", "levanta" ].includes(r.tipo);
  }
  sinControl() {
    return !!this.J.muerto || !!(this.sis.estado & STATE.PADRELEASE) || this.mgr.gameOverTimer() !== 0;
  }
  "dañado"() {
    return this.reac()?.tipo === "sacudon";
  }
  invencible() {
    return (this.J.sn?.inv || 0) > 0;
  }
  altoSnake() {
    if (this.derribado()) return 250;
    const p = this.J.postura?.() ?? 0;
    return p === 2 ? 250 : p === 1 ? 850 : 1600;
  }
  item() {
    return this.J.ctx.inventario?.item ?? -1;
  }
  arma() {
    return this.J.ctx.inventario?.arma ?? -1;
  }
  se(id, p) {
    this.mgr.se(id, p ? p.mov.clone().multiplyScalar(MM) : null, null);
  }
  se2(id) {
    this.mgr.se(id, null, null);
  }
  enPantalla(p) {
    const f = this.J.ctx.enPantalla;
    return f ? !!f(p.o?.position || p.v3m(p.mov)) : true;
  }
  vecinas(zi) {
    const z = this.J.zonas?.[zi & 255];
    return z ? z.v.slice(0, 6) : [];
  }
  centro(zi) {
    const z = this.J.zonas?.[zi & 255];
    return z ? V(Math.round(z.p.x * 1e3), Math.round(z.p.y * 1e3), Math.round(z.p.z * 1e3)) : null;
  }
  pasos(p) {
    const m = p.reloj % 32;
    if (p.i === 0) {
      if (m === 0) this.se(160, p); else if (m === 15) this.se(161, p);
    } else if (p.i === 1) {
      if (m === 0) this.se(162, p); else if (m === 15) this.se(163, p);
    } else if (m === 0 || m === 15) this.se(166, p); else if (m === 7 || m === 23) this.se(167, p);
  }
  pasosCorre(p) {
    if (p.reloj & 7) return;
    if (p.i === 0) this.se(164, p); else if (p.i === 1) this.se(165, p);
  }
  ocultar(p) {
    p.ojos = 0;
    p.visible = false;
  }
  mostrar(p) {
    p.ojos = 1;
    p.visible = true;
  }
  ver(p) {
    p.blanco = p.claseOn && p.visible && !p.ausente;
  }
  limpiarAdj(p) {
    for (const a of p.adjust) a.fill(0);
  }
  turnTo(p, t, pasos) {
    if (pasos === 0) return;
    const c = p.tv;
    c.x &= 4095;
    c.y &= 4095;
    c.z &= 4095;
    const T = {
      x: t.x & 4095,
      y: t.y & 4095,
      z: t.z & 4095
    };
    if (T.x - c.x > 2047) c.x += 4096;
    if (T.y - c.y > 2047) c.y += 4096;
    if (T.z - c.z > 2047) c.z += 4096;
    if (T.x - c.x < -2047) T.x += 4096;
    if (T.y - c.y < -2047) T.y += 4096;
    if (T.z - c.z < -2047) T.z += 4096;
    c.y = tdiv(c.y * (pasos - 1) + T.y, pasos);
    c.x = tdiv(c.x * 7 + T.x, 8);
    c.z = tdiv(c.z * 7 + T.z, 8);
  }
  setTv(p, d, sinX = true) {
    p.tv = {
      x: sinX ? 0 : d.x,
      y: d.y,
      z: 0
    };
  }
  snapRot(p) {
    p.rot = p.tv.y & 4095;
    p.rotX = p.tv.x;
  }
  cfgAccion(p, a) {
    if (p.sub === 37 || p.modo === 12 || p.modo === 13) p.rSphere = -2; else if (p.i !== 2) {
      if (this.modoS === 0) p.rSphere = 550;
    } else p.rSphere = 250;
    if ([ 0, 2, 3, 4, 5, 6, 7, 8, 9, 17, 18, 19, 21, 22, 23, 24, 25, 28 ].includes(a)) p.ojos = 1; else if ([ 1, 10, 11, 12, 13, 14, 15, 16, 20, 26, 27 ].includes(a)) p.ojos = 0;
    if (a === 1 || a === 12) p.tCorre++; else p.tCorre = 0;
  }
  ponerAccion(p, a) {
    p.accion = a;
    const m = this.tabla[a];
    if (m >= 0) p.motor.accion(m, 4);
  }
  accion(p, a, sig) {
    if (p.accion !== a) {
      this.cfgAccion(p, a);
      this.ponerAccion(p, a);
    } else if (p.motor.isEnd === 1) {
      p.trasAnim = p.accion !== 13 ? -1 : 0;
      p.sub = sig;
    }
  }
  accion2(p, a, a2, sig) {
    if (p.accion !== a) this.ponerAccion(p, a); else if (p.motor.isEnd === 1) {
      p.trasAnim = p.accion !== 13 ? -1 : 0;
      this.ponerAccion(p, a2);
      p.sub = sig;
    }
  }
  accionAzar(p, a, sig, alt, chance) {
    const cur = p.accion;
    if (cur !== a) {
      this.cfgAccion(p, a);
      this.ponerAccion(p, a);
    } else if (p.motor.isEnd === 1) {
      p.trasAnim = cur !== 13 ? -1 : 0;
      p.sub = randU(chance) !== 0 ? sig : alt;
    }
  }
  todos(m, s) {
    for (const p of this.perros) if (p.modo !== 9) {
      p.modo = m;
      p.sub = s;
    }
  }
  salto(p, hp) {
    if (this.sinControl() || this.dañado()) return;
    const s = p.step;
    let mx = Math.max(1, Math.abs(s.x), Math.abs(s.y), Math.abs(s.z));
    const f = mx > 128 ? V(tdiv(s.x * 128, mx), tdiv(s.y * 128, mx), tdiv(s.z * 128, mx)) : s.clone();
    if (!this.tocaSnake(p.mov, p.tamAtaque)) return;
    if (this.J.dañoSnake?.(hp, 2, f, null)) {
      this.se2(37);
      this.log("salto pega", {
        i: p.i,
        hp: hp
      });
    }
  }
  mordida(p, hp) {
    if (this.sinControl() || this.dañado() || this.invencible()) return;
    const f = V(randU(32), randU(32), randU(32));
    if (this.J.dañoSnake?.(hp, 2, f, null)) this.log("mordida pega", {
      i: p.i,
      hp: hp
    });
  }
  tocaSnake(c, t) {
    const sn = this.snake(), post = this.J.postura?.() ?? 0, hy = [ 700, 500, 500 ][post];
    return Math.abs(c.x - sn.x) < t[0] + 300 && Math.abs(c.z - sn.z) < t[2] + 300 && Math.abs(c.y - sn.y) < t[1] + hy;
  }
  cA098(p) {
    if (p.modo > 9 && p.modo < 14) return;
    if (this.dist01 > 500) return;
    const sn = this.snake(), d0 = this.perros[0], d1 = this.perros[1];
    if (!d0 || !d1) return;
    const sep = k => {
      if (Math.abs(d0.mov[k] - d1.mov[k]) >= 500) return;
      const s = d0.mov[k] < d1.mov[k] ? -1 : 1;
      if (d0.nTouches === 0) {
        d0.ancla[k] += 20 * s;
        d0.mov[k] += 20 * s;
        d0.espera = randU(128) + 30;
      }
      if (d1.nTouches === 0) {
        d1.ancla[k] -= 20 * s;
        d1.mov[k] -= 20 * s;
        d1.espera = randU(128) + 30;
      }
    };
    if (en(sn, -3500, 7e3, 2e3, 7500) || en(sn, -14e3, -4e3, -2e3, 8e3)) sep("x"); else if (en(sn, 2e3, 1e4, -2e3, 1500)) sep("z");
  }
  cA4B4(p, estado) {
    const c = p.mov, sn = this.snake();
    const quieto = () => {
      p.sub = estado;
      p.ancla.copy(c);
      p.tv.y = p.dirSn.y;
      p.espera = p.i * 60 + 20;
    };
    if (en(c, -14e3, -4e3, -2e3, 8e3)) {
      if (this.intrude() || this.derribado()) {
        quieto();
        return 1;
      }
      if (c.z < 3e3 && sn.z > 2500 && p.modo !== 3) {
        p.modo = 10;
        p.sub = 0;
        return 1;
      }
      if (c.z > 2e3 && sn.z < 2500) {
        p.modo = 11;
        p.sub = 0;
        return 1;
      }
    } else if (en(c, 2e3, 1e4, -2e3, 1500)) {
      if (this.intrude() || this.derribado()) {
        quieto();
        return 1;
      }
      if (c.x < 6500 && sn.x > 6e3 && p.modo !== 12 && p.modo !== 3) {
        p.modo = 12;
        p.sub = 0;
        p.contento = 0;
        return 1;
      }
      if (c.x > 5500 && sn.x < 6e3 && p.modo !== 13) {
        p.modo = 13;
        p.sub = 0;
        p.contento = 0;
        return 1;
      }
    } else if (en(c, -500, 3500, 500, 2e3)) {
      quieto();
      return 2;
    }
    return 0;
  }
  cA758(p) {
    if (this.escena >= 2 || this.modoS !== 0) return;
    const it = this.item(), c = this.cajas;
    const olor = it === IT.PAÑUELO || it === IT.BOX1 && c & 1 || it === IT.BOX2 && c & 2 || it === IT.BOX3 && c & 4;
    if (olor && p.tPañuelo <= 0 && this.contentos !== 1 || this.contentos === 1) {
      p.tPañuelo = randU(64) + 30;
      if (p.aturdido === 0 && p.contento === 0 && p.modo !== 5) {
        p.contento = 1;
        p.modo = 5;
        p.sub = 0;
        this.limpiarAdj(p);
        this.log("contento", {
          i: p.i
        });
      }
    } else if (p.aturdido === 0 && p.contento === 1 && p.tContento <= 0 && p.tPañuelo <= 0 && p.modo !== 3) {
      p.tPañuelo = randU(64) + 30;
      p.contento = 0;
      p.tContento = 0;
      p.modo = 3;
      p.sub = 0;
      this.limpiarAdj(p);
    }
  }
  cAD8C(p) {
    const a4 = p.adjust[4], a5 = p.adjust[5];
    p.adjPrev4 = a4[0];
    p.adjPrev5 = a5[0];
    if (p.accion === 11 || p.accion === 20) {
      if (p.dist >= 4001) {
        a4[0] = 0;
        a5[0] = 0;
      } else {
        const cab = p.puntoHuesoMM(5), d = dirA(cab, this.snake()), half = tdiv(d.x, 2);
        a4[0] = tdiv(half + p.adjPrev4 * 15, 16);
        a5[0] = tdiv(half + p.adjPrev5 * 15, 16);
      }
    }
  }
  cAEC8(p, mark) {
    if (p.tMarca > 0) return;
    p.tMarca = 60;
    p.marca(mark);
    if (mark === 6) this.se([ 132, 187, 188 ][p.i], p);
  }
  cB054C(p) {
    const sn = this.snake();
    if (this.modoS === 0 && en(sn, -3500, 7e3, 2e3, 7500)) return 0;
    if (this.intrude()) return 0;
    if (p.i !== 2 && p.dist > 1e3 || p.i === 2 && p.dist > 1500) {
      const dis = p.i !== 2 ? tdiv(p.vista * 4e3, 255) : tdiv(p.vista * 5e3, 255), rango = p.i !== 2 ? 700 : 400;
      const dir = p.rot + (p.adjust[5]?.[1] || 0) & 4095;
      if (p.dist > dis) return 0;
      if (difAbs(dir, p.dirSn.y) > rango) return 0;
    }
    if (!this.J.libre(p.v3m(sn), p.v3m(p.mov))) return 0;
    this.tAlerta = 768;
    return 1;
  }
  sangreSnake(p) {
    const r = this.J.ctx.rig.position;
    p.sangre(V(r.x, r.y + 1.2, r.z));
    if (randU(16) === 0) this.se(randU(2) ? 179 : 180, p); else this.se(randU(2) ? 185 : 186, p);
  }
  sangreCachorro(p) {
    p.sangre(p.puntoHueso(6));
    this.se(randU(2) !== 0 ? 185 : 186, p);
    this.f1610 = 0;
  }
  cruzarTunel(p, ida) {
    const T1 = ida ? V(0, 0, -500) : V(11e3, 0, 0), T2 = ida ? V(3500, 0, 0) : V(8500, 0, 0), T5 = ida ? V(9500, 0, 0) : V(3e3, 0, 0), T17 = ida ? V(9e3, 0, 0) : V(3e3, 0, 0);
    switch (p.sub) {
     case 0:
      p.sub = 1;
      this.limpiarAdj(p);

     case 1:
      {
        const d = dirA(p.mov, T1);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 2);
        if (d.len < 1e3) {
          p.sub = 5;
          this.se(133, p);
        } else {
          this.pasosCorre(p);
          this.accion(p, 0, 1);
        }
        break;
      }

     case 2:
      {
        const d = dirA(p.mov, T2);
        this.setTv(p, d);
        if (d.len < 500) {
          p.sub = 5;
          this.se(133, p);
        } else {
          this.pasosCorre(p);
          this.accion(p, 0, 1);
        }
        break;
      }

     case 5:
      {
        const d = dirA(p.mov, T5);
        this.setTv(p, d, false);
        this.accion(p, 25, 14);
        if (randU(16) === 0) p.aliento(true);
        break;
      }

     case 14:
      {
        const d = dirA(p.mov, T5);
        this.setTv(p, d, false);
        this.snapRot(p);
        this.accion(p, 21, 17);
        break;
      }

     case 17:
      {
        const d = dirA(p.mov, T17);
        this.setTv(p, d, false);
        this.snapRot(p);
        if (d.len < 1e3) {
          p.sub = 20;
          break;
        }
        const m = p.reloj % 16;
        if (m === 0) this.se(182, p); else if (m === 8) this.se(randU(2) !== 0 ? 179 : 180, p);
        this.accion(p, 22, 17);
        break;
      }

     case 20:
      this.accion(p, 23, 27);
      break;

     case 27:
      p.modo = this.alerta !== 1 ? 3 : 6;
      p.sub = 0;
      p.contento = 0;
      this.cA758(p);
      break;
    }
  }
  saltarEscalon(p, sube) {
    const T1 = sube ? V(p.i * 300 - 10600, 0, -400) : V(-7e3, 0, 5500), T5 = sube ? V(-7500, 0, 5600) : V(p.i * 300 - 10600, 0, -400);
    switch (p.sub) {
     case 0:
      p.sub = 1;
      this.limpiarAdj(p);

     case 1:
      {
        const d = dirA(p.mov, T1);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 2);
        if (p.i === 0) {
          if (d.len < 1e3) {
            if (this.dist01 < 2e3) {
              if ((p.reloj & 31) === 0) this.se(129, p);
              this.accion(p, 2, 5);
            } else p.sub = 5;
          } else {
            if ((p.reloj & 7) === 0) this.se(164, p);
            this.accion(p, 0, 1);
          }
        } else if (p.i === 1) {
          if (d.len < 1e3) {
            p.sub = 5;
            this.se(133, p);
          } else {
            if ((p.reloj & 7) === 0) this.se(165, p);
            this.accion(p, 0, 1);
          }
        }
        break;
      }

     case 5:
      {
        const d = dirA(p.mov, T5);
        this.setTv(p, d, false);
        this.accion(p, 25, 14);
        if (randU(16) === 0) p.aliento(true);
        break;
      }

     case 14:
      {
        p.sub = 37;
        const d = dirA(p.mov, T5);
        this.setTv(p, d, false);
        this.snapRot(p);
        this.se(183, p);
      }

     case 37:
      this.accion(p, 5, 17);
      break;

     case 17:
      this.se(181, p);
      p.modo = this.alerta !== 1 ? 3 : 6;
      p.sub = 0;
      p.contento = 0;
      this.cA758(p);
      break;
    }
  }
  cCCC3C(p) {
    const ataca = () => Dog_800CAB34(this, p.i);
    const morder = () => {
      p.ancla.copy(p.mov);
      p.sub = this.altoSnake() >= 701 ? 20 : 27;
      p.tv.y = p.dirSn.y;
    };
    switch (p.sub) {
     case 0:
      p.sub = 1;
      p.ancla.copy(p.mov);
      this.limpiarAdj(p);
      p.espera = p.i * 20 + 20;
      p.tv.y = p.dirSn.y;

     case 1:
      if (p.dist < 3e3) {
        p.espera = p.i * 20 + 20;
        p.sub = 6;
        p.ancla.copy(p.mov);
        p.tv.y = p.dirSn.y;
        break;
      }
      if (p.espera-- > 0) {
        p.mov.x = p.ancla.x;
        p.mov.z = p.ancla.z;
        if ((p.reloj & 31) === 0) this.se(129, p);
        p.tv.y = p.dirSn.y;
        this.accion(p, 2, 1);
        break;
      }
      p.sub = 2;
      this.se(133, p);
      break;

     case 2:
      if (p.dist < 5e3) {
        p.espera = p.i * 20 + 20;
        p.sub = 6;
        p.ancla.copy(p.mov);
        p.tv.y = p.dirSn.y;
        break;
      }
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      this.accion(p, 25, 4);
      if (randU(16) === 0) p.aliento(true);
      break;

     case 4:
      p.tv.y = p.dirSn.y;
      p.sub = 5;
      if (this.modoS === 0 && this.cA4B4(p, 6) !== 0) break;

     case 5:
      {
        p.zadr = p.addr(p.mov, p.zadr);
        this.addrObj = p.addr(this.snake());
        let z = p.navigate(p.zadr, this.addrObj, p.mov);
        if (p.i === 0 && this.dist01 < 1e3) {
          const nv = this.vecinas(z);
          if (nv.length) {
            this.addrObj = nv[randU(4096) % nv.length];
            this.addrObj = p.addr(p.mov, this.addrObj);
            z = p.navigate(p.zadr, this.addrObj, p.mov);
          }
        }
        const q = this.centro(z) || this.snake(), d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        if (p.dist < 400 && ataca()) {
          morder();
          break;
        }
        if (p.reloj % 128 < 100 && p.dist < p.i * 500 + 2e3 && Math.abs(this.perros[0].mov.x - (this.perros[1]?.mov.x ?? 1e9)) >= 501 && Math.abs(this.perros[0].mov.z - (this.perros[1]?.mov.z ?? 1e9)) >= 501) {
          p.espera = p.i * 40 + 40;
          p.sub = 6;
          p.ancla.copy(p.mov);
          p.tv.y = p.dirSn.y;
          break;
        }
        this.pasosCorre(p);
        this.accion(p, 0, 4);
        break;
      }

     case 6:
      {
        if (p.espera-- > 0) {
          p.mov.x = p.ancla.x;
          p.mov.z = p.ancla.z;
          if ((p.reloj & 31) === 0) this.se(129, p);
          p.tv.y = p.dirSn.y;
          this.accion(p, 2, 6);
          break;
        }
        const sn = this.snake();
        if (en(sn, -3500, 7e3, 2e3, 7500) || en(sn, -14e3, -4e3, -2e3, 8e3) || en(sn, 2e3, 1e4, -2e3, 1500)) {
          this.se(133, p);
          p.mov.x = p.ancla.x;
          p.mov.z = p.ancla.z;
          p.tv = {
            x: 0,
            y: p.dirSn.y,
            z: 0
          };
          p.sub = 7;
          break;
        }
        p.reloj = 0;
        p.sub = randU(2) === 0 ? 11 : 13;
        break;
      }

     case 7:
      if (randU(16) === 0) p.aliento(true);
      this.accion(p, 25, 32);
      break;

     case 11:
      if (p.reloj < 8 && p.reloj % 3 === 0) {
        if (p.i === 0) this.se(164, p); else if (p.i === 1) this.se(165, p);
      } else if (p.reloj === 8) this.se(183, p);
      this.salto(p, 96);
      this.accion(p, 4, 17);
      if (p.dist < 400 && ataca()) morder();
      break;

     case 13:
      this.salto(p, 96);
      this.accion(p, 17, 17);
      if (p.dist < 400 && ataca()) morder();
      break;

     case 17:
      {
        p.zadr = p.addr(p.mov, p.zadr);
        this.posC = this.snake();
        this.addrC = p.addr(this.posC);
        const nv = this.vecinas(this.addrC);
        if (nv.length) {
          this.addrC = nv[randU(4096) % nv.length];
          this.addrC = p.addr(this.posC, this.addrC);
        }
        const z = p.navigate(p.zadr, this.addrC, p.mov), q = this.centro(z) || this.snake(), d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        this.pasosCorre(p);
        this.accion(p, 0, 4);
        break;
      }

     case 20:
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      this.accion(p, 19, 20);
      if (this.pulsados >= 2 || p.dist >= 201) p.sub = 4;
      if ((p.reloj & 15) === 0) this.sangreSnake(p);
      if (this.altoSnake() < 900) p.sub = 4;
      this.mordida(p, 16);
      break;

     case 27:
      if (this.J.gvTime % 32 < 16 && p.i === 0 && this.perros[1]?.modo === 6 && this.perros[1]?.sub === 27 || this.J.gvTime % 32 >= 16 && p.i === 1 && this.perros[0].modo === 6 && this.perros[0].sub === 27) {
        p.sub = 4;
        break;
      }
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      this.accion(p, 6, 27);
      if (this.pulsados >= 2 || p.dist >= 501) p.sub = 4;
      if ((p.reloj & 15) === 0) this.sangreSnake(p);
      if (this.altoSnake() >= 901) p.sub = 4;
      this.mordida(p, 16);
      break;

     case 32:
      {
        if (randU(2) !== 0 && !this.intrude()) {
          p.reloj = 0;
          p.sub = 11;
          break;
        }
        p.zadr = p.addr(p.mov, p.zadr);
        const z = p.navigate(p.zadr, p.zadr, p.mov), q = this.centro(z) || p.mov.clone(), d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        this.pasosCorre(p);
        this.accion(p, 0, 0);
        break;
      }
    }
  }
  cDBC4(p) {
    const d = dirA(p.mov, p.puntos[p.sig] || p.mov);
    if (p.sub !== 17) this.turnTo(p, {
      x: p.pitchRuta,
      y: d.y,
      z: 0
    }, 32);
    let dist = d.len;
    if (dist < 500) {
      p.actual = p.sig;
      p.sig++;
      if (p.sig >= p.nPuntos) p.sig = 0;
      const d2 = dirA(p.puntos[p.actual], p.puntos[p.sig]);
      dist = d2.len;
      p.pitchRuta = d2.x;
    }
    switch (p.sub) {
     case 0:
      p.sub = 1;

     case 1:
      p.adjust[5][1] = tdiv(rsin(p.fase), 8);
      p.fase += p.i * 2 + 16;
      this.accionAzar(p, 1, 1, 5, 16);
      p.ancla.copy(p.mov);
      break;

     case 5:
      if (dist >= 3001) {
        p.fase = 0;
        p.espera = 0;
        p.sub = 20;
        break;
      }
      p.fase = 0;
      p.espera = 8;

     case 14:
      p.sub = 17;
      p.espera--;

     case 17:
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      p.adjust[5][1] = tdiv(p.adjust[5][1] * 7, 8);
      p.fase = 0;
      p.vista = cercaDe(p.vista, 128, 16);
      if (p.espera > 0) this.accion(p, 9, 14); else if (randU(64) !== 0) this.accionAzar(p, 9, 1, 5, 4); else this.accionAzar(p, 9, 1, 27, 2);
      break;

     case 20:
      p.adjust[5][1] = tdiv(p.adjust[5][1] * 7, 8);
      p.fase = 0;
      this.accion(p, 8, 1);
      break;

     case 27:
      p.fase = 0;
      p.espera = 60;
      this.accion2(p, 14, 13, 32);
      break;

     case 32:
      this.se(184, p);

     case 33:
      p.sub = 34;
      p.espera--;
      this.se(184, p);

     case 34:
      if (p.espera > 0 || p.dist > 1e3) this.accion(p, 13, 33); else this.accion(p, 15, 35);
      break;

     case 35:
      this.accion(p, 16, 1);
      break;
    }
  }
  cE034(p) {
    switch (p.sub) {
     case 0:
      p.sub = 1;
      p.fase = 0;
      p.espera = randU(16) + 32;
      p.ancla.x = p.mov.x;
      p.ancla.z = p.mov.z;

     case 1:
      p.sub = 5;
      p.espera--;

     case 5:
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      if (p.espera > 0) {
        p.vista = cercaDe(p.vista, 16, 16);
        this.accion(p, 9, 1);
      } else {
        p.modo = 0;
        p.sub = 0;
      }
      break;
    }
  }
  cE194(p) {
    let dist = -1, obj;
    if (this.contentos === 1) {
      this.posObj = this.sis.kore.pos.clone();
      const dm = dirA(p.mov, this.posObj);
      p.dist = dm.len;
      p.dirSn = dm;
      dist = dirA(p.mov, V(8500, 0, -9500)).len;
      obj = V(8500, 0, -9500);
    } else {
      this.posObj = this.snake();
      obj = this.posObj.clone();
    }
    if (p.tContento > 0) p.tContento--;
    switch (p.sub) {
     case 0:
      p.sub = 1;
      p.fase = randU(16) + 10;
      p.tContento = 60;
      this.cAEC8(p, 6);

     case 1:
      {
        if (this.modoS === 0 && p.i !== 2 && p.dist >= 1501 && this.contentos !== 1 && this.cA4B4(p, 5) !== 0) break;
        p.zadr = p.addr(p.mov, p.zadr);
        this.addrObj = p.addr(obj);
        let z = p.navigate(p.zadr, this.addrObj, p.mov);
        if (p.i === 0 && this.dist01 < 1e3) {
          if (p.nTouches !== 0) {
            p.sub = 5;
            break;
          }
          const nv = this.vecinas(z);
          if (nv.length) {
            this.addrObj = nv[randU(4096) % nv.length];
            this.addrObj = p.addr(p.mov, this.addrObj);
            z = p.navigate(p.zadr, this.addrObj, p.mov);
          }
        }
        const q = this.centro(z) || obj, d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        p.fase--;
        if (this.contentos === 0 && p.fase < 0 && p.dist < p.i * 500 + 1500) {
          p.sub = 5;
          p.tContento = 60;
          this.cAEC8(p, 6);
          break;
        }
        if (this.contentos === 1 && (p.dist < p.i * 200 + 1500 || dist < 4e3)) {
          p.sub = 5;
          p.tContento = 60;
          this.cAEC8(p, 6);
          break;
        }
        this.accion(p, 12, 1);
        if (p.i !== 2 && p.dist < 5e3 && p.tCorre >= 91) p.sub = 5;
        break;
      }

     case 5:
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      this.accion(p, 10, 14);
      break;

     case 14:
      p.sub = 15;
      if (p.reloj % 128 < 20) {
        p.tContento = 60;
        this.cAEC8(p, 6);
      }
      this.f1610 = 0;
      if (this.item() === IT.PAÑUELO && this.contentos !== 1 && this.procH !== -1) {
        this.log("-h (pañuelo)", {
          proc: this.procH
        });
        this.ejecutar(this.procH, []);
        this.procH = -1;
      }

     case 15:
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      if ((this.J.gvTime & 15) === 0 && randU(2) !== 0) this.se([ 176, 177, 178 ][randU(4096) % 3], p);
      this.accionAzar(p, 11, 14, 17, 4);
      if (this.contentos !== 1) {
        p.espera--;
        if (p.espera < 0 && p.dist > p.i * 500 + 5e3) {
          p.sub = 1;
          p.espera = randU(128) + 30;
        }
      }
      if (p.dist < 1e3 && this.snakeY !== this.snake().y) p.sub = 0;
      break;

     case 17:
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      if (p.i === 2 && (p.reloj & 63) === 0 && randU(4) === 0) p.sub = 0;
      if ((p.reloj & 511) === 0 && randU(8) === 0) p.sub = 27;
      this.accionAzar(p, 20, 14, 17, 4);
      if (this.contentos !== 1) {
        p.espera--;
        if (p.espera < 0 && p.dist > p.i * 500 + 5e3) {
          p.sub = 1;
          p.espera = randU(128) + 30;
        }
      }
      if (p.dist < 1e3 && this.snakeY !== this.snake().y) p.sub = 0;
      break;

     case 27:
      this.accion2(p, 14, 13, 34);
      break;

     case 34:
      p.vista = cercaDe(p.vista, 0, 32);
      if (p.dist < p.i * 500 + 4e3 && p.dist > 1e3) {
        if (randU(16) === 0) this.accion2(p, 13, 29, 35); else this.accion2(p, 13, 13, 34);
      } else this.accion2(p, 15, 16, 36);
      break;

     case 35:
      this.accion2(p, 29, 13, 34);
      break;

     case 36:
      this.accion(p, 16, 0);
      break;
    }
    if (p.i === 2 && (p.sub === 15 || p.sub === 17)) this.cabezaCachorro(p);
  }
  cabezaCachorro(p) {
    const t = this.tCabeza;
    this.tCabeza = t - 1;
    if (t > 40 && t < 61) {
      p.adjust[4][2] += 8;
      p.adjust[5][2] += 8;
    }
    if (this.tCabeza < 10) {
      p.adjust[4][2] -= 16;
      p.adjust[5][2] -= 16;
    }
    if (this.tCabeza < 0) {
      this.tCabeza = randU(512) + 256;
      this.limpiarAdj(p);
    }
  }
  ejecutar(pid, args) {
    if (!(pid > 0)) return false;
    this.log("proc", {
      proc: pid,
      args: args
    });
    return this.ctx.proc ? (this.ctx.proc(pid, args), true) : this.mgr.correrProc(pid, args);
  }
  procOlor() {
    if (this.procO !== -1) this.ejecutar(this.procO, [ this.cajas ]);
  }
  cEB74(p) {
    if (p.i !== 2) {
      switch (p.sub) {
       case 0:
        p.sub = 1;
        p.ancla.copy(p.mov);
        this.limpiarAdj(p);
        p.tv.y = p.dirSn.y;

       case 1:
        p.mov.x = p.ancla.x;
        p.mov.z = p.ancla.z;
        if ((p.reloj & 31) === 0) this.se(129, p);
        this.accion(p, 2, 1);
        break;
      }
      return;
    }
    const sn = this.snake();
    switch (p.sub) {
     case 0:
      p.sub = 1;
      p.ancla.copy(p.mov);
      this.limpiarAdj(p);
      p.tv.y = p.dirSn.y;
      p.espera = 30;
      this.f1618 = -1;
      this.log("escena del cachorro");

     case 1:
      {
        p.espera--;
        let pos;
        const it = this.item();
        if (it > IT.SCOPE && it < IT.NVG) {
          pos = sn.clone();
          pos.x = pos.x < 1e4 ? pos.x + 800 : pos.x - 800;
          if (p.dist > 900 && p.dist < 1100) {
            p.ancla.copy(p.mov);
            if (p.espera < 0) {
              this.tPis = 0;
              p.sub = randU(2) !== 0 ? 7 : 9;
              this.log("pis", {
                lado: p.sub
              });
            }
            break;
          }
        } else if (this.f1618 !== -1) {
          this.f1618--;
          p.mov.copy(p.ancla);
          this.accion(p, 9, 1);
          if (this.f1618 > 0) break;
          if (p.espera >= 0) break;
          p.sub = 6;
          p.tv.y = p.dirSn.y;
          this.sangreCachorro(p);
          this.mordida(p, 16);
          this.sis.kore.flag &= ~1;
          this.log("el cachorro muerde");
          break;
        } else if (p.dist < 300) {
          this.f1618 = 30;
          p.ancla.copy(p.mov);
          break;
        } else if (p.dist < 3e3) {
          p.tv.y = p.dirSn.y;
          if ((this.J.gvTime & 7) === 0 && randU(2) === 0) this.se2(189);
          this.accion(p, 12, 1);
          break;
        } else {
          p.zadr = p.addr(p.mov, p.zadr);
          this.addrObj = p.addr(sn);
          pos = this.centro(p.navigate(p.zadr, this.addrObj, p.mov)) || sn;
        }
        const d = dirA(p.mov, pos);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        this.accion(p, 12, 1);
        if ((this.J.gvTime & 7) === 0 && randU(4) === 0) this.se2(189);
        break;
      }

     case 6:
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      this.accion(p, 6, 14);
      break;

     case 7:
     case 9:
      {
        this.tPis++;
        if (this.tPis >= 39) {
          if (this.tPis === 39) this.se2(198);
          const m = V((sn.x + p.mov.x) / 2, (sn.y + p.mov.y) / 2, (sn.z + p.mov.z) / 2);
          this.chispa(m.multiplyScalar(MM), .06, 8, 15259744);
        }
        const ojo = p.mov.clone(), centro = p.mov.clone();
        ojo.z = sn.z < -8e3 ? ojo.z + 2e3 : ojo.z - 2e3;
        centro.x += sn.x < 1e4 ? -1e3 : 1e3;
        ojo.y += 2500;
        this.camara = {
          ojo: ojo,
          centro: centro
        };
        p.mov.x = p.ancla.x;
        p.mov.z = p.ancla.z;
        p.tv = {
          x: 0,
          y: p.dirSn.y + (p.sub === 7 ? -1024 : 1024) & 4095,
          z: 0
        };
        this.accion(p, p.sub === 7 ? 26 : 27, 14);
        break;
      }

     case 14:
      {
        const it = this.item();
        if (it === IT.BOX1) this.cajas |= 1;
        if (it === IT.BOX2) this.cajas |= 2;
        if (it === IT.BOX3) this.cajas |= 4;
        this.procOlor();
        this.log("olor en la caja", {
          cajas: this.cajas
        });
        p.modo = 5;
        p.sub = 0;
        for (const q of this.perros.slice(0, 2)) if (q.modo !== 5) {
          q.modo = 5;
          q.sub = 0;
        }
        break;
      }
    }
  }
  chispa(p, e, c, col) {
    this.mgr.chispa(p, e, c, col);
  }
  cF578(p) {
    switch (p.sub) {
     case 0:
      p.sub = 1;
      this.se(141, p);
      p.homing = 0;

     case 1:
      p.vista = 0;
      this.accion(p, 24, 5);
      break;

     case 5:
      if (p.dist >= 3001) {
        const d = dirA(p.mov, this.snake());
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
      }
      this.accion(p, 28, 14);
      break;

     case 14:
      p.modo = 6;
      p.sub = 0;
      this.cA758(p);
      p.homing = 1;
      break;
    }
  }
  cF6CC(p) {
    p.vista = 0;
    p.radarAtr = 1;
    switch (p.sub) {
     case 0:
      p.sub = 1;
      p.claseOn = false;
      this.se(145, p);
      p.homing = 0;
      this.log("muere", {
        i: p.i
      });

     case 1:
      this.accion(p, 24, 5);
      break;

     case 5:
      p.sub = 6;
      p.reloj = 0;
      this.muertos = (this.muertos || 0) + 1;

     case 6:
      p.animar = false;
      if (p.reloj % 4 < 2) this.ocultar(p); else this.mostrar(p);
      if (p.reloj < 61) break;
      if (this.reap >= this.maxReap || this.contentos === 1) {
        this.ocultar(p);
        p.claseOn = false;
        p.modo = 15;
        p.sub = 0;
        p.ausente = 1;
        this.log("no vuelve", {
          i: p.i
        });
      } else {
        this.reap++;
        p.sub = 14;
      }
      break;

     case 14:
      if (this.snake().x < -2800) p.mov.set(500, 1200, -1e3); else p.mov.set(-5300, 1200, 1e3);
      p.sub = 17;
      p.animar = true;
      this.mostrar(p);
      this.log("reaparece", {
        i: p.i,
        reap: this.reap
      });
      break;

     case 17:
      p.radarAtr = 5;
      this.mostrar(p);
      p.vital = this.vitalMax;
      p.claseOn = true;
      p.modo = this.alerta !== 1 ? 3 : 6;
      p.sub = 0;
      this.cA758(p);
      p.homing = 1;
      break;
    }
  }
  cFA30(p) {
    const sn = this.snake();
    switch (p.sub) {
     case 0:
      p.sub = 1;

     case 1:
      {
        if ((p.reloj & 63) === 0 && randU(16) === 0) {
          p.modo = 1;
          p.sub = 0;
          break;
        }
        p.zadr = p.addr(p.mov, p.zadr);
        if (this.modoS === 0 && en(sn, -3500, 7e3, 2e3, 7500)) this.posC = sn.clone(); else {
          this.addrC = p.addr(this.posC, this.addrC);
          if (this.tIrA < 0) {
            if (this.procesados === 3 && this.modoS === 0) this.tIrA = 300;
            if ((this.J.gvTime & 127) === 0 && randU(32) === 0) {
              this.sigue = 1 - this.sigue;
              this.posC = this.perros[this.sigue].mov.clone();
            }
            if (randU(2) === 0) {
              this.posC = this.perros[this.sigue].mov.clone();
              const nv = this.vecinas(this.addrC);
              if (nv.length) this.addrC = nv[randU(4096) % nv.length];
            }
          } else {
            this.tIrA--;
            this.posC = V(10555, 0, -7e3);
          }
        }
        this.addrC = p.addr(this.posC, this.addrC);
        const z = p.navigate(p.zadr, this.addrC, p.mov), q = this.centro(z) || this.posC, d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        if (this.modoS !== 0) {
          if ((p.reloj & 15) === 0) this.se(166, p); else if (p.reloj % 16 === 8) this.se(167, p);
          if ((this.J.gvTime & 3) === 0 && randU(8) === 0) this.se(189, p);
          this.accion(p, 0, 1);
          break;
        }
        if (en(sn, -3500, 7e3, 2e3, 7500)) {
          p.sub = 38;
          break;
        }
        if ((this.J.gvTime & 3) === 0 && randU(8) === 0) this.se(189, p);
        if ((p.reloj & 7) === 0) this.se(190, p);
        this.accion(p, 0, 1);
        break;
      }

     case 5:
      p.sub = 6;
      this.se(183, p);

     case 6:
      this.accion(p, 5, 7);
      break;

     case 7:
      p.sub = 1;
      this.se(181, p);
      break;

     case 38:
      p.sub = 39;
      this.posObj = sn.clone();

     case 39:
      {
        p.zadr = p.addr(p.mov, p.zadr);
        this.addrObj = p.addr(sn);
        const z = p.navigate(p.zadr, this.addrObj, p.mov), q = this.centro(z) || sn, d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        if (p.dist < 2e3) {
          p.sub = 40;
          break;
        }
        this.accion(p, 12, 1);
        break;
      }

     case 40:
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      this.accion(p, 10, 41);
      this.tCabeza = randU(128) + 60;
      break;

     case 41:
      p.sub = 42;

     case 42:
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      if (p.dist > 4e3 || p.dist < 1e3 && this.snakeY !== sn.y) p.sub = 1;
      this.accionAzar(p, 11, 41, 43, 4);
      if ((p.reloj & 31) === 0 && randU(4) === 0) this.se(188, p);
      break;

     case 43:
      p.tv = {
        x: 0,
        y: p.dirSn.y,
        z: 0
      };
      if (p.dist > 4e3 || p.dist < 1e3 && this.snakeY !== sn.y) p.sub = 1;
      this.accionAzar(p, 20, 41, 43, 4);
      break;
    }
    if (p.i === 2 && p.sub > 40 && p.sub < 44) this.cabezaCachorro(p);
  }
  cD0374(p) {
    p.zadr = p.addr(p.mov, p.zadr);
    const q = this.centro(p.navigate(p.zadr, this.addrObj, p.mov)) || p.mov.clone();
    p.adjust[5][1] = tdiv(p.adjust[5][1] * 7, 8);
    p.fase = 0;
    switch (p.sub) {
     case 0:
      p.sub = 1;

     case 1:
      {
        const d = dirA(p.mov, q);
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, 8);
        if ((p.reloj & 31) === 0) this.se(this.modoS === 0 ? 190 : 188, p);
        this.accion(p, 0, 1);
        if (p.reachTo(p.zadr, this.addrObj) <= 0) {
          p.sub = 5;
          p.espera = 150;
        }
        break;
      }

     case 5:
      {
        this.accion(p, 0, 1);
        const r = this.J.ruido?.pos;
        const d = r ? dirA(p.mov, V(r.x * 1e3, r.y * 1e3, r.z * 1e3)) : {
          len: 0,
          y: p.tv.y
        };
        p.tv = {
          x: d.x || 0,
          y: d.y,
          z: 0
        };
        if (d.len < 500 || p.espera < 0) p.sub = 14; else p.espera--;
        break;
      }

     case 14:
      if (p.espera > 0) {
        p.espera--;
        const d = dirA(p.mov, this.posObj);
        p.tv = {
          x: 0,
          y: d.y,
          z: 0
        };
        p.vista = cercaDe(p.vista, 128, 16);
        this.accion(p, 9, 5);
      } else {
        p.modo = this.alerta !== 1 ? 3 : 6;
        p.sub = 0;
      }
      break;
    }
  }
  cD0680(p) {
    p.adjust[5][1] = tdiv(p.adjust[5][1] * 7, 8);
    p.fase = 0;
    switch (p.sub) {
     case 0:
      if (p.i !== 2) {
        p.actual = randU(4096) % p.nPuntos;
        p.sig = p.actual + 1;
        if (p.sig >= p.nPuntos) p.sig = 0;
        this.posObj = p.puntos[p.sig].clone();
        p.addrVuelta = p.addr(this.posObj);
        p.sub = 1;
      } else {
        p.modo = 0;
        p.sub = 0;
        break;
      }

     case 1:
      {
        if ((this.J.gvTime & 15) === 0 && this.modoS === 0 && p.i !== 2) {
          if (this.cA4B4(p, 5) === 1) break;
          p.sub = 1;
        }
        p.zadr = p.addr(p.mov, p.zadr);
        const z = p.navigate(p.zadr, p.addrVuelta, p.mov);
        if (p.i === 0 && this.dist01 < 1e3) {
          p.sub = 5;
          break;
        }
        const q = this.centro(z) || this.posObj, d = dirA(p.mov, q);
        if (this.modoS === 0 && p.i !== 2) {
          if (en(p.mov, -14e3, -4e3, -2e3, 8e3)) {
            if (p.mov.z < 3e3 && q.z > 2400) {
              p.modo = 10;
              p.sub = 0;
              break;
            }
            if (p.mov.z > 2e3 && q.z < 2600) {
              p.modo = 11;
              p.sub = 0;
              break;
            }
          }
          if (en(p.mov, 2e3, 1e4, -2e3, 1500)) {
            if (p.mov.x < 6500 && q.x > 5900) {
              p.modo = 12;
              p.sub = 0;
              break;
            }
            if (p.mov.x > 5500 && q.x < 6100) {
              p.modo = 13;
              p.sub = 0;
              break;
            }
          }
        }
        this.turnTo(p, {
          x: 0,
          y: d.y,
          z: 0
        }, randU(2) + 1);
        this.accion(p, 1, 1);
        if (p.reachTo(p.zadr, p.addrVuelta) <= 0) {
          p.modo = 0;
          p.sub = 0;
        }
        if (p.tCorre >= 91) p.sub = 5;
        break;
      }

     case 5:
      p.ancla.x = p.mov.x;
      p.ancla.z = p.mov.z;
      p.sub = 6;
      p.tSentado = randU(32) + 60;

     case 6:
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      p.adjust[5][1] = tdiv(p.adjust[5][1] * 7, 8);
      this.accion(p, 9, 6);
      if (this.modoS !== 0 || p.i === 2) break;
      p.tSentado--;
      if (p.tSentado < 0) {
        p.sub = 1;
        p.tSentado = randU(32) + 60;
      } else this.cA4B4(p, 6);
      break;
    }
  }
  aturdidora() {
    if (!this.mgr.stun) return 0;
    for (const p of this.perros) if ((p.modo < 8 || p.modo > 9) && ![ 10, 11, 12, 13 ].includes(p.modo)) {
      p.aturdido = 200;
      p.modo = 4;
      p.sub = 0;
    }
    this.log("aturdidos");
    return 1;
  }
  cD0C78(p) {
    if (p.sub !== 5 && p.sub !== 14 && p.aturdido <= tdiv(p.i, 2) * 25 + 60) {
      p.sub = 5;
      this.limpiarAdj(p);
      this.se(this.modoS === 0 ? 132 : 134, p);
    }
    switch (p.sub) {
     case 0:
      p.sub = 1;
      p.fase = 0;
      this.limpiarAdj(p);
      p.ancla.x = p.mov.x;
      p.ancla.z = p.mov.z;
      this.se(141, p);

     case 1:
      p.vista = 128;
      if (p.fase < 16) p.fase++;
      p.adjust[4][0] = p.fase * 32;
      p.adjust[5][0] = p.fase * 32;
      p.mov.x = p.ancla.x;
      p.mov.z = p.ancla.z;
      this.accion(p, 2, 1);
      break;

     case 5:
      this.accion(p, 16, 14);
      break;

     case 14:
      if (this.contentos) {
        for (const q of this.perros) if (q.ausente === 0) {
          q.modo = 5;
          q.sub = 0;
          if (q.mov.x < 6e3 || q.mov.z > -1500) q.mov.set(q.i * 500 + 8500, 1e3, q.i * 500 - 1500);
        }
      } else {
        p.modo = 3;
        p.sub = 0;
      }
      break;
    }
  }
  cD0F30(p) {
    if (this.modoS !== 0) return;
    if (p.modo === 8) {
      if (p.nTouches !== 0 || p.tocado === 1) {
        p.tocado = 1;
        p.step.x = 0;
        p.step.z = 0;
        p.mov.y = p.ctrlH;
      }
    } else p.tocado = 0;
    p.turn = p.tv.y & 4095;
    if (p.sub === 37) {
      p.ctrlH = tdiv(p.motor.altura * 3, 2);
      p.actControl();
      p.mov.y = p.ctrlH;
    } else {
      p.actControl();
      p.ctrlH = p.motor.altura;
      if (p.rSphere === -2) {
        p.mov.y = p.ctrlH;
        p.vy = 0;
      } else if (p.vy < 0 && p.grounded !== 0) p.vy = 0;
      p.vy -= 32;
      p.step.y = p.vy;
    }
    p.actMotion();
    this.empujar(p);
    if (p.trasAnim === -1) {
      if ((p.reloj & 63) === 0 && p.modo !== 9) p.aliento(false);
    } else {
      p.trasAnim++;
      if (p.trasAnim >= 31 && (this.J.gvTime & 3) === 0) p.aliento(true);
      if (p.trasAnim === 30) p.zzz();
    }
  }
  cD11D4(p) {
    p.step.x = tdiv(p.step.x, 2);
    p.step.y = tdiv(p.step.y, 2);
    p.step.z = tdiv(p.step.z, 2);
    if (p.modo !== 14) {
      if (this.modoS === 0 && p.mov.x > 3800 && p.mov.x < 14200 && p.mov.z > -14200 && p.mov.z < -9800) p.mov.z = -9800;
      if (this.modoS === 0 && p.mov.x > -12200 && p.mov.x < -1800 && p.mov.z > 11800 && p.mov.z < 16200) p.mov.z = 11800;
    }
    const a = p.motor.altura;
    if (this.modoS === 0 && (en(p.mov, -500, 3500, 0, 3500) || en(p.mov, -11e3, -7e3, 0, 5e3) || en(p.mov, 3e3, 1e4, -2500, 3500)) && (p.accion === 24 || p.accion === 28)) p.ctrlH = a > 200 ? 200 : a; else if (p.accion === 5 || p.accion === 0) p.ctrlH = tdiv(a, 3); else p.ctrlH = tdiv(a, 2);
    p.turn = p.tv.y & 4095;
    p.actControl();
    if (p.rSphere === -2) {
      p.mov.y = p.ctrlH;
      p.vy = 0;
    } else if (p.vy < 0 && p.grounded === 1) p.vy = 0;
    p.vy -= 32;
    p.step.y = p.vy;
    p.actMotion();
    this.empujar(p);
    if (p.trasAnim === -1) {
      if (randU(16) === 0 && p.modo !== 9) p.aliento(true);
    } else {
      p.trasAnim++;
      if (p.trasAnim >= 31 && (this.J.gvTime & 3) === 0) p.aliento(true);
      if (p.trasAnim === 30) p.zzz();
    }
  }
  empujar(p) {
    if (!p.claseOn || !p.visible || p.ausente) return;
    const r = this.J.ctx.rig.position, c = p.v3m(p.mov), R = (p.tamBlanco[0] + 300) * MM * .6;
    const dx = r.x - c.x, dz = r.z - c.z, d = Math.hypot(dx, dz);
    if (d >= R || d < 1e-4 || Math.abs(r.y - c.y) > 1.2 || this.mgr.congelado) return;
    r.x = c.x + dx / d * R;
    r.z = c.z + dz / d * R;
    this.J.chocar(r, .3);
  }
  cD16C0(p) {
    const d = p.tomarDaño();
    if (!d) return;
    if (d.a_mode === 1 || d.a_mode === 2) p.vital -= d.daño;
    if (p.tGolpe <= 0 && p.modo !== 9 && p.modo !== 8) {
      p.tGolpe = 60;
      if (this.perros[2]?.modo === 14 && this.sis.kore.flag & 1) this.sis.kore.flag = this.sis.kore.flag & ~1 | 2;
      if (p.i === 2 || p.modo !== 12 && p.modo !== 13 && p.sub !== 37) {
        if (d.a_mode === 4) this.se(52, p); else if (d.a_mode === 3) this.se(53, p);
        p.sangre(p.puntoHueso(randU(8), {
          x: 0,
          y: 0,
          z: 100
        }));
        this.limpiarAdj(p);
        if (p.vital < 0) {
          p.modo = 9;
          p.sub = 0;
        } else {
          p.prevModo = p.modo;
          p.modo = 8;
          p.sub = 0;
        }
        this.log("golpe", {
          i: p.i,
          a_mode: d.a_mode,
          "daño": d.daño,
          vital: p.vital,
          modo: p.modo
        });
      }
    }
  }
  cD187C() {
    const inv = this.J.ctx.inventario, sn = this.snake(), p2 = this.perros[2];
    const enCaja = () => !this.intrude() && this.item() > IT.SCOPE && this.item() < IT.NVG;
    const camara = () => {
      if (!enCaja()) return;
      const cj = this.ctx.camJuego?.() ?? (typeof window !== "undefined" ? window.__mgs?.camJuego : null);
      const c = this.camara || {
        ojo: this.ojo0,
        centro: this.centro0
      };
      if (cj?.corte && c?.ojo) cj.corte([ c.ojo.x, c.ojo.y, c.ojo.z ], [ c.centro.x, c.centro.y, c.centro.z ], 320, 2);
    };
    switch (this.escena) {
     case 2:
      this.ojo0 = p2.mov.clone();
      this.ojo0.y = 2500;
      this.centro0 = sn.clone();
      this.camara = null;
      this.guardado = {
        item: this.item(),
        arma: this.arma()
      };
      this.escena = 3;
      if (inv && (this.item() === IT.SCOPE || this.item() === IT.CAMERA)) inv.item = -1;
      if (inv && (this.arma() === WP.PSG1 || this.arma() === WP.STINGER)) inv.arma = -1;
      camara();

     case 3:
      this.f1610 = 1;
      if (p2.dist < 2500) this.escena = 4;
      camara();
      break;

     case 4:
      camara();
      if (p2.dist > 2500 || this.f1610 !== 1) {
        this.escena = 5;
        this.f1614 = 60;
      }
      break;

     case 5:
      this.escena = 6;
      if (inv && this.guardado) {
        if (this.guardado.arma === WP.PSG1 || this.guardado.arma === WP.STINGER) {
          inv.arma = this.guardado.arma;
          this.f1614 = 0;
        }
        if (this.guardado.item === IT.SCOPE || this.guardado.item === IT.CAMERA) {
          inv.item = this.guardado.item;
          this.f1614 = 0;
        }
      }

     case 6:
      if (--this.f1614 < 0) {
        this.escena = 1;
        this.sis.kore.flag &= ~1;
        this.camara = null;
        this.log("fin escena del cachorro");
      }
      break;
    }
  }
  recibir(v) {
    this.mensajes.push(v[0]);
    return true;
  }
  cuadro() {
    if (!this.perros.length) return;
    if (this.relojJ < 100) this.relojJ++;
    this.cD187C();
    this.pulsados = this.teclas > 0 ? this.pulsados + 1 : 0;
    this.teclas = 0;
    const sel = this.c === 1 ? 2 : this.J.gvTime % 3;
    let msg = -1;
    for (const m of this.mensajes.splice(0)) {
      const k = MSJ.indexOf(m);
      if (k >= 0) msg = k;
    }
    if (msg === 0) {
      this.contentos = 1;
      this.log("happy");
      if (this.relojJ < 10) {
        this.escena = 1;
        for (const p of this.perros) if (p.ausente === 0) {
          p.modo = 5;
          p.sub = 0;
          p.mov.set(randS(1024) + 1e4, 1e3, -randU(1024));
        }
      }
    } else if (msg === 2) {
      this.contentos = 1;
      this.escena = 1;
      this.log("trap");
      for (const p of this.perros) if (p.ausente === 0) {
        p.modo = 5;
        p.sub = 0;
        if (p.mov.x < 6e3 || p.mov.z > -1500) p.mov.set(p.i * 500 + 8500, 1e3, p.i * 500 - 1500);
      }
    }
    const K = this.sis.kore, p2 = this.perros[2];
    if (this.contentos === 1 && this.escena === 1 && K.flag & 1 && p2) {
      if ([ 0, 1, 2, 3, 5, 7 ].includes(p2.modo)) {
        this.escena = 2;
        this.f1610 = 0;
        for (const p of this.perros) {
          p.modo = 14;
          p.sub = 0;
        }
        this.log("escena: el cachorro va hacia Snake");
      } else K.flag = K.flag & ~1 | 2;
    }
    const hit = this.aturdidora();
    const p0 = this.perros[0], p1 = this.perros[1];
    this.dist01 = p0 && p1 ? Math.round(p0.mov.distanceTo(p1.mov)) : 1e9;
    let count = 0;
    if (this.tLadrido > 0) this.tLadrido--;
    this.procesados = 0;
    const sn = this.snake();
    for (const p of this.perros) {
      if (p.tGolpe > 0) p.tGolpe--;
      if (p.tPañuelo > 0) p.tPañuelo--;
      const estado = p.modo;
      let vivo = 0;
      if (p.ausente !== 0) {
        this.ocultar(p);
        p.homing = 0;
        if (this.c === 0 && this.hayP === 0) {
          if (this.modoS !== 0) {
            if (this.tRuido > 0) {
              this.tRuido--;
              const r = this.J.ruido?.pos;
              if (r) p.mov.set(r.x * 1e3, r.y * 1e3, r.z * 1e3);
            } else if (this.J.gvTime % 256 < 128) p.mov.copy(sn); else if (this.J.gvTime % 4096 < 3072) p.mov.set(11e3, 0, 12e3); else p.mov.set(9e3, 0, -8e3);
          } else if (this.J.gvTime % 256 < 128) p.mov.copy(sn); else p.mov.set(9e3, 0, -8e3);
        } else if (this.J.gvTime % 256 < 128) p.mov.copy(sn); else p.mov.copy(this.posP);
      } else {
        p.vista = cercaDe(p.vista, 255, 8);
        if (estado < 8 || estado > 13) {
          vivo = 1;
          this.cA758(p);
        }
        if (this.enPantalla(p) || sel === p.i || vivo === 0 || this.escena !== 0) {
          this.procesados++;
          const d = dirA(p.mov, sn);
          p.dist = d.len;
          p.dirSn = d;
          if (vivo !== 0) {
            if (p.aturdido > 0) p.aturdido--;
            if (p.aturdido === 1) p.contento = 0;
            if (hit === 0 && this.modoS === 0) {
              if (this.cB054C(p) === 1) {
                count++;
                if (p.aturdido === 0 && p.contento === 0 && estado !== 6 && this.contentos !== 1 && this.alerta !== 1 && this.escena === 0) {
                  this.alerta = 1;
                  this.cAEC8(p, 0);
                  if (p.i !== 2) {
                    this.ladridoDiferido = 20;
                    this.quienLadra = p.i;
                  }
                  if (this.tLadrido <= 0) {
                    this.se(83, p);
                    this.tLadrido = 30;
                  }
                  p.modo = 6;
                  p.sub = 0;
                  this.vibracion = 10;
                  this.log("ve a Snake", {
                    i: p.i
                  });
                }
              } else if (estado !== 6 && this.alerta === 1) {
                p.modo = 6;
                p.sub = 0;
              }
            }
          }
          this.porModo(p);
          this.cAD8C(p);
          if (p.i === 2) this.cD11D4(p); else {
            this.cA098(p);
            this.cD0F30(p);
          }
          this.cD16C0(p);
        }
      }
      if (p.tMarca >= -9) p.tMarca--;
      this.ver(p);
      p.cuadroOjos();
    }
    for (const p of this.perros) {
      p.reloj++;
      if (p.accion === 1 || p.accion === 12) this.pasos(p);
    }
    if (!this.perros.some(p => p.modo === 9) && this.alerta === 1 && count <= 0 && !this.intrude() && --this.tAlerta < 0 && ![ 10, 11, 12, 13 ].includes(p0?.modo) && ![ 10, 11, 12, 13 ].includes(p1?.modo)) {
      this.alerta = 0;
      this.tAlerta = 0;
      this.todos(3, 0);
      this.log("fin de la alerta");
    }
    this.snakeY = sn.y;
    if (this.vibracion > 0) {
      if (this.vibracion === 10) this.J.vibrar?.([ [ 255, 10 ] ]);
      this.vibracion--;
    } else this.vibracion = 0;
    if (this.ladridoDiferido > 0 && --this.ladridoDiferido === 0) this.se(130, this.perros[this.quienLadra]);
  }
  porModo(p) {
    switch (p.modo) {
     case 0:
      p.contento = 0;
      if (p.i === 2) this.cFA30(p); else this.cDBC4(p);
      break;

     case 1:
      p.contento = 0;
      this.cE034(p);
      break;

     case 2:
      p.contento = 0;
      this.cD0374(p);
      break;

     case 3:
      p.contento = 0;
      this.alerta = 0;
      this.tAlerta = 0;
      this.cD0680(p);
      break;

     case 4:
      this.alerta = 0;
      this.tAlerta = 0;
      p.contento = 0;
      this.cD0C78(p);
      break;

     case 5:
      this.alerta = 0;
      this.tAlerta = 0;
      this.cE194(p);
      break;

     case 14:
      this.alerta = 0;
      this.tAlerta = 0;
      this.cEB74(p);
      break;

     case 6:
      p.contento = 0;
      if (p.i === 2) this.cFA30(p); else this.cCCC3C(p);
      break;

     case 8:
      p.contento = 0;
      this.cF578(p);
      break;

     case 9:
      p.contento = 0;
      if (p.i === 2) this.cF578(p); else this.cF6CC(p);
      break;

     case 10:
      this.saltarEscalon(p, true);
      break;

     case 11:
      this.saltarEscalon(p, false);
      break;

     case 12:
      this.cruzarTunel(p, true);
      break;

     case 13:
      this.cruzarTunel(p, false);
      break;
    }
  }
  dibujar() {}
  estadoPrueba() {
    return {
      alerta: this.alerta,
      tAlerta: this.tAlerta,
      contentos: this.contentos,
      escena: this.escena,
      cajas: this.cajas,
      reap: this.reap,
      kore: this.sis.kore.flag,
      perros: this.perros.map(p => p.estadoPrueba())
    };
  }
  destruir() {
    this.vivo = false;
    if (typeof window !== "undefined") window.removeEventListener("keydown", this.alTecla);
    for (const p of this.perros) {
      p.destruir();
      const k = this.mgr.lista.indexOf(p);
      if (k >= 0) this.mgr.lista.splice(k, 1);
    }
    this.perros = [];
    const k = this.sis.receptores.indexOf(this);
    if (k >= 0) this.sis.receptores.splice(k, 1);
  }
}

function Dog_800CAB34(jau, i) {
  return i === 0 || i === 1 && jau.dist01 < 2e3 ? 1 : 0;
}

export function crearPerros(actor, ctx) {
  const J = ctx?.juego;
  if (!J || !esPerro(actor)) return null;
  const sis = Sistema.de(J, ctx), mgr = sis.mgr;
  const viejo = mgr.lista.find(j => j instanceof Jauria && j.vivo && j.nombre === actor.nombre);
  if (viejo) viejo.destruir();
  const jau = new Jauria(actor, mgr, sis);
  mgr.agregar(jau);
  sis.receptores.push(jau);
  for (const v of tomarPendientes(actor.nombre, ctx.nivel?.id)) jau.recibir(v);
  jau.cargando = jau.iniciar().then(() => {
    jau.listo = true;
    actor._meryl = jau;
    return jau;
  }).catch(e => {
    console.warn("[perros]", e);
    jau.vivo = false;
    return null;
  });
  return jau;
}
