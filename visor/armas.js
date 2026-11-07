// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { WP, IT, NOMBRE_ARMA } from "./inventario.js";

import { ducto as ductoSnake } from "./ducto.js";

const FPS = 30, MM = .001, ANG = Math.PI * 2 / 4096;

export const SE_ARMA = {
  SOCOM: 1,
  VACIO: 4,
  LISTO: 9,
  LATIDO: 10,
  PSG1: 27,
  EXPLOSION: 41,
  REBOTE: 43,
  SEGURO: 44,
  RECARGA: 47,
  FAMAS: 48,
  C4_PONER: 49,
  C4_BOTON: 50,
  CHAFF: 58,
  CHAFF_EXPL: 66,
  MISIL: 76,
  MISIL_TURBO: 77,
  FIJADO: 79,
  SOCOM_SIL: 82,
  TOMAR: 22,
  LLENO: 11,
  MP5: 101
};

const GRANADA_SALE = 7, MANO_VACIA = 48;

const ARMA_CON_KAMAE = new Set([ WP.SOCOM, WP.FAMAS, WP.NIKITA ]);

export const MODELOS = {
  [WP.SOCOM]: "armas/socom.glb",
  socom2: "armas/socom2.glb",
  [WP.FAMAS]: "armas/famas.glb",
  [WP.GRENADE]: "armas/grenade.glb",
  [WP.STUN]: "armas/can_gren.glb",
  [WP.CHAFF]: "armas/can_gren.glb",
  [WP.C4]: "armas/c4_bomb.glb",
  [WP.CLAYMORE]: "armas/claymore.glb",
  [WP.NIKITA]: "armas/nikita.glb",
  misil: "armas/nik_mis.glb",
  [WP.STINGER]: "armas/stinger.glb",
  [WP.PSG1]: "armas/rifle.glb",
  caja: "armas/cb_box.glb"
};

export const RETROCESO = {
  [WP.SOCOM]: 9,
  [WP.FAMAS]: 4,
  [WP.PSG1]: 16,
  [WP.NIKITA]: 6,
  [WP.STINGER]: 12
};

const CARGADOR = {
  [WP.SOCOM]: 12,
  [WP.FAMAS]: 25,
  [WP.PSG1]: 5
};

const RECARGA = 36;

const RECARGA_ARMA = {
  [WP.SOCOM]: 19,
  [WP.FAMAS]: 21
};

const BALA = {
  1: {
    alcance: 10,
    vel: 5
  },
  2: {
    alcance: 100,
    vel: 5
  },
  0: {
    alcance: 10,
    vel: .75
  }
};

export const BLAST = {
  normal: 128,
  bomba: 512
};

const CAJA_GUARDIA = new THREE.Vector3(.3, .9, .3);

let texExplosion = null;

function texturaExplosion() {
  if (texExplosion) return texExplosion;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,230,1)");
  g.addColorStop(.25, "rgba(255,200,80,0.95)");
  g.addColorStop(.6, "rgba(220,70,10,0.6)");
  g.addColorStop(1, "rgba(60,10,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  texExplosion = new THREE.CanvasTexture(c);
  texExplosion.colorSpace = THREE.SRGBColorSpace;
  return texExplosion;
}

const dirDe = (dx, dz) => (Math.round(Math.atan2(dx, dz) / ANG) % 4096 + 4096) % 4096;

const difS = (a, b) => {
  const d = ((a - b) % 4096 + 4096) % 4096;
  return d > 2048 ? d - 4096 : d;
};

const randS = n => (Math.floor(Math.random() * 32767) & 2 * n - 1) - n;

export class Armas {
  constructor(juego, inv, ctx = {}) {
    this.juego = juego;
    this.inv = inv;
    this.ctx = ctx;
    this.escena = ctx.escena || juego?.ctx?.mundo;
    this.se = ctx.se || (() => {});
    this.acum = 0;
    this.frame = 0;
    this.actual = -2;
    this.recargando = 0;
    this.gatillo = false;
    this.tFamas = 0;
    this.silenciada = false;
    this.granadaMano = null;
    this.granadas = [];
    this.c4 = [];
    this.detonando = 0;
    this.minas = [];
    this.trazadoras = [];
    this.fx = [];
    this.misil = null;
    this.mandoMisil = 0;
    this.misilS = [];
    this.recargaStinger = 0;
    this.fijado = null;
    this.tFijado = 0;
    this.patadaStinger = 0;
    this.chaff = 0;
    this.chaffSon = 0;
    this.zoom = 320;
    this.tApunta = 0;
    this.tebure = 0;
    this.tTebure = 0;
    this.latido = 0;
    this.latidoPend = 0;
    this.modelos = new Map;
    this.posPrev = null;
    this.velSnake = new THREE.Vector3;
    this.gesto = null;
    this.tManoVacia = 0;
    this.tSuelto = 99;
    this.sinBotonFamas = 0;
    const hud = (x, W, H) => this.dibujarHud(x, W, H);
    hud.__armas = this;
    inv.extras = inv.extras || [];
    inv.extras.push(hud);
    if (juego) {
      juego.alDañoSnake = aMode => this.alDañoSnake(aMode);
      juego.alCajaPateada = g => this.cajaVuela(g);
    }
    if (juego) {
      juego.modeloArma = k => this.modelo(k === "granada" ? WP.GRENADE : k, this.bolita(3820074, .05));
      juego.alExplosionVisual = p => this.visualExplosion(p);
    }
    this.zoomItem = 320;
    this.zoomPedido = 320;
    this._rueda = e => {
      if (this.itemConZoom()) this.zoomPedido = Math.max(320, Math.min(3200, this.zoomPedido * (e.deltaY < 0 ? 1.25 : .8)));
    };
    this._teclaZoom = e => {
      if (!this.itemConZoom()) return;
      if (e.code === "Equal" || e.code === "NumpadAdd") this.zoomPedido = Math.min(3200, this.zoomPedido * 1.25);
      if (e.code === "Minus" || e.code === "NumpadSubtract") this.zoomPedido = Math.max(320, this.zoomPedido * .8);
    };
    if (typeof addEventListener === "function") {
      addEventListener("wheel", this._rueda, {
        passive: true
      });
      addEventListener("keydown", this._teclaZoom);
    }
    this.tebureRot = null;
    if (typeof fetch === "function") fetch("assets/anim/snake.json").then(r => r.json()).then(d => {
      const c = d.clips?.["anim 122"], H = d.huesos;
      if (!c || !H) return;
      const n = c.cuadros | 0, x0 = c.rot[0], y0 = c.rot[1], rx = [], ry = [];
      for (let f = 0; f < n; f++) {
        rx.push(c.rot[f * H * 3] - x0);
        ry.push(c.rot[f * H * 3 + 1] - y0);
      }
      this.tebureRot = {
        rx: rx,
        ry: ry,
        n: n
      };
    }).catch(() => {});
    this.caja = null;
    this.cajaVolando = null;
  }
  modelo(clave, respaldo) {
    const g = new THREE.Group;
    g.userData.propio = g.userData.sinColision = true;
    const ruta = clave != null ? MODELOS[clave] : null;
    if (ruta && this.ctx.cargar) {
      let p = this.modelos.get(ruta);
      if (!p) {
        p = Promise.resolve(this.ctx.cargar(ruta)).catch(() => null);
        this.modelos.set(ruta, p);
      }
      p.then(o => {
        if (o) {
          const c = o.clone(true);
          c.traverse(m => {
            if (m.isMesh) m.userData.sinColision = true;
          });
          g.add(c);
        } else if (respaldo) g.add(respaldo);
      });
    } else if (respaldo) g.add(respaldo);
    this.escena?.add(g);
    return g;
  }
  bolita(color, r = .04) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({
      color: color
    }));
    m.userData.sinColision = true;
    return m;
  }
  posSnake() {
    return this.ctx.rig?.position || this.juego?.ctx?.rig?.position || new THREE.Vector3;
  }
  postura() {
    return this.ctx.postura ? this.ctx.postura() : this.juego?.postura?.() ?? 0;
  }
  ruido(p, len, pos) {
    this.juego?.setRuido?.(p, len, pos);
  }
  guardias() {
    return (this.juego?.activos?.() || []).filter(g => ![ "muerto", "cuelloRoto" ].includes(g.accion));
  }
  pared(o, d, lejos, malla = this.juego?.vista) {
    if (!malla || !this.juego?.ray) return null;
    const r = this.juego.ray;
    r.set(o, d);
    r.far = lejos;
    return r.intersectObject(malla, false)[0] || null;
  }
  piso(p) {
    return this.juego?.alturaPiso?.(p.x, p.z, p.y + .3) ?? this.ctx.piso?.(p) ?? 0;
  }
  guardiaEn(o, d, lejos, radio = .33) {
    let mejor = null, md = lejos;
    for (const g of this.guardias()) {
      const p = g.o.position, dx = p.x - o.x, dz = p.z - o.z, h = Math.hypot(d.x, d.z) || 1e-6;
      const t = (dx * d.x + dz * d.z) / (h * h);
      if (t <= 0) continue;
      const cx = o.x + d.x * t - p.x, cz = o.z + d.z * t - p.z;
      if (cx * cx + cz * cz > radio * radio) continue;
      const y = o.y + d.y * t - p.y, dist = t * Math.hypot(d.x, d.y, d.z);
      const tope = [ "piso", "cae", "soltado" ].includes(g.accion) ? .5 : 1.85;
      if (y < 0 || y > tope || dist >= md) continue;
      md = dist;
      mejor = g;
    }
    return mejor ? {
      g: mejor,
      dist: md
    } : null;
  }
  bloqueado() {
    return !!(this.misil && !this.misil.perdido) || this.inv.abierto || ductoSnake.activo || this.inv.padExterno != null;
  }
  get arma() {
    const id = this.inv.arma, inv = this.inv;
    return {
      id: id,
      nombre: id >= 0 ? NOMBRE_ARMA[id] : "",
      icono: id === WP.SOCOM ? this.silenciada ? "socom_sil" : "socom" : id === WP.FAMAS ? "famas" : null,
      balas: inv.cargador,
      cargador: inv.cargadorMax,
      reserva: id >= 0 ? Math.max(0, inv.armas[id] - inv.cargador) : 0,
      recargando: this.recargando,
      silenciador: this.silenciada,
      modelo: id === WP.SOCOM && this.silenciada ? MODELOS.socom2 : MODELOS[id] || null,
      retroceso: RETROCESO[id] || 0
    };
  }
  equipar(id) {
    const inv = this.inv, previo = this.actual;
    this.actual = id;
    this.recargando = 0;
    this.tFamas = 0;
    this.tApunta = 0;
    this.zoom = 320;
    this.tebure = 0;
    this.tTebure = 0;
    this.granadaMano = null;
    this.gesto = null;
    this.tManoVacia = 0;
    if (id === WP.SOCOM) {
      this.silenciada = inv.items[IT.SUPPR] >= 0;
      if (this.silenciada) {
        inv.items[IT.SUPPR] = 0;
        if (inv.item === IT.SUPPR) inv.item = -1;
      }
    }
    if (CARGADOR[id]) {
      let m = CARGADOR[id];
      if (inv.cargador) m++;
      let a = inv.armas[id];
      if (m > 0 && m < a) a = m;
      inv.cargadorMax = m;
      inv.cargador = Math.max(0, a);
    } else if ([ WP.GRENADE, WP.STUN, WP.CHAFF, WP.C4, WP.CLAYMORE ].includes(id)) {
      inv.cargadorMax = 0;
      inv.cargador = 0;
    }
    this.ctx.alEquipar?.(id, previo, this.arma);
  }
  disparar(origen, dir) {
    const inv = this.inv, id = inv.arma;
    if (this.bloqueado()) return null;
    if (this.actual !== id) this.equipar(id);
    this.gatillo = true;
    this.origen = origen.clone();
    this.dir = dir.clone().normalize();
    if (inv.item === IT.CAMERA) {
      const url = this.ctx.foto?.();
      return url ? {
        foto: url
      } : null;
    }
    if (id < 0 || this.juego?.agarrado) {
      this.juego?.botonAgarre?.(true);
      return null;
    }
    if (ARMA_CON_KAMAE.has(id) && (id !== WP.SOCOM || this.tSuelto > 4) && this.recargando <= 0) this.se(SE_ARMA.LISTO, this.posSnake());
    this.tSuelto = 0;
    switch (id) {
     case WP.SOCOM:
      return this.tiroPistola(origen, this.dir);

     case WP.FAMAS:
      this.tFamas = 0;
      return this.cuadroFamas(origen, this.dir);

     case WP.PSG1:
      return this.tiroRifle(origen, this.dir);

     case WP.GRENADE:
     case WP.STUN:
     case WP.CHAFF:
      return this.sacarSeguro(id);

     case WP.C4:
      return this.ponerC4(origen, this.dir);

     case WP.CLAYMORE:
      return this.ponerMina(origen, this.dir);

     case WP.NIKITA:
      return this.lanzarNikita(origen, this.dir);

     case WP.STINGER:
      return this.lanzarStinger(origen, this.dir);

     default:
      return null;
    }
  }
  soltar(origen, dir) {
    this.gatillo = false;
    this.tFamas = 0;
    this.juego?.botonAgarre?.(false);
    const G = this.granadaMano;
    if (G && G.sale == null) {
      G.sale = GRANADA_SALE;
      G.o = (origen || this.origen || this.posSnake()).clone();
      G.d = (dir || this.dir || new THREE.Vector3(0, 0, -1)).clone().normalize();
      this.gesto = {
        tipo: "tira",
        id: G.id,
        f: this.frame
      };
      return {
        granada: G.id,
        lanzando: true
      };
    }
    return null;
  }
  recargar() {
    const inv = this.inv, id = inv.arma;
    if (!CARGADOR[id] || this.recargando > 0 || inv.armas[id] <= inv.cargador) return false;
    let m = CARGADOR[id];
    if (inv.cargador) m++;
    inv.cargadorMax = m;
    inv.cargador = Math.min(m, inv.armas[id]);
    this.recargando = this.recargaDur = id === WP.PSG1 ? 20 : RECARGA_ARMA[id] || RECARGA;
    return true;
  }
  recargaAuto() {
    const inv = this.inv, id = inv.arma;
    if (!CARGADOR[id] || this.recargando > 0 || inv.cargador !== 0 || inv.cargadorMax === 0 || inv.armas[id] <= 0) return;
    if (id === WP.PSG1) {
      this.recargando = this.recargaDur = 24;
      return;
    }
    const m = inv.cargadorMax;
    inv.cargador = m > 0 && m < inv.armas[id] ? m : inv.armas[id];
    this.recargando = this.recargaDur = RECARGA_ARMA[id] || RECARGA;
  }
  tiroPistola(o, d) {
    const inv = this.inv;
    if (this.recargando > 0) return null;
    if (inv.cargador === 0) {
      this.se(SE_ARMA.VACIO, o);
      this.ruido(5, 2, o);
      this.recargaAuto();
      return null;
    }
    inv.cargador--;
    inv.cargadorMax = CARGADOR[WP.SOCOM];
    inv.armas[WP.SOCOM]--;
    this.se(this.silenciada ? SE_ARMA.SOCOM_SIL : SE_ARMA.SOCOM, o);
    this.ruido(this.silenciada ? 5 : 200, 2, o);
    const r = this.bala(o, d, 1, 64);
    if (inv.cargador === 0) this.recargaAuto();
    return {
      ...r,
      retroceso: RETROCESO[WP.SOCOM],
      silenciador: this.silenciada
    };
  }
  cuadroFamas(o, d) {
    const inv = this.inv;
    if (this.recargando > 0) return null;
    if (inv.cargador === 0) {
      if (this.frame & 1) {
        this.se(SE_ARMA.VACIO, o);
        this.ruido(5, 2, o);
      }
      this.recargaAuto();
      return null;
    }
    let r = null;
    if ((this.tFamas & 1) === 0) {
      inv.cargador--;
      inv.cargadorMax = CARGADOR[WP.FAMAS];
      const mp5 = inv.nivelJuego === -1;
      if (!mp5) inv.armas[WP.FAMAS]--;
      r = inv.cargador < 3 ? this.trazadora(o, d) : this.bala(o, d, 1, 64);
      if (!mp5) {
        this.se(SE_ARMA.FAMAS, o);
        this.ruido(200, 2, o);
      } else this.se(SE_ARMA.MP5, o);
      r.retroceso = RETROCESO[WP.FAMAS];
      if (inv.cargador === 0) this.recargaAuto();
    }
    this.tFamas++;
    return r;
  }
  tiroRifle(o, d) {
    const inv = this.inv;
    if (this.recargando > 0) return null;
    if (inv.cargador === 0) {
      this.se(SE_ARMA.VACIO, o);
      this.ruido(5, 2, o);
      this.recargaAuto();
      return null;
    }
    inv.cargador--;
    inv.armas[WP.PSG1]--;
    this.se(SE_ARMA.PSG1);
    this.ruido(100, 2, o);
    const r = this.bala(o, d, 2, 256);
    if (!r.guardia && r.pared) this.ruido(100, 2, r.impacto);
    if (inv.cargador === 0) this.recargaAuto();
    return {
      ...r,
      retroceso: RETROCESO[WP.PSG1]
    };
  }
  bala(o, d, tipo, daño) {
    const B = BALA[tipo], alc = B.alcance * (tipo === 1 ? this.ctx.alcanceX?.() || 1 : 1), h = this.pared(o, d, alc), lejos = h ? h.distance : alc;
    const gg = this.guardiaEn(o, d, lejos);
    const impacto = o.clone().addScaledVector(d, gg ? gg.dist : lejos);
    if (gg) this.juego.dañar(gg.g, daño, 1);
    return {
      impacto: impacto,
      guardia: gg?.g || null,
      pared: !gg && !!h
    };
  }
  trazadora(o, d) {
    const t = {
      p: o.clone(),
      d: d.clone(),
      rec: 0,
      mesh: this.ctx.balaVisual?.(o, d) || null
    };
    this.trazadoras.push(t);
    return {
      impacto: o.clone().addScaledVector(d, 10),
      guardia: null,
      trazadora: true
    };
  }
  cuadroTrazadoras() {
    for (const t of this.trazadoras.slice()) {
      const v = BALA[0].vel, h = this.pared(t.p, t.d, v), gg = this.guardiaEn(t.p, t.d, h ? h.distance : v);
      let fin = false;
      if (gg) {
        this.juego.dañar(gg.g, 64, 1);
        fin = true;
      } else if (h) fin = true;
      t.p.addScaledVector(t.d, v);
      t.rec += v;
      if (t.rec >= 10) fin = true;
      if (t.mesh) {
        t.mesh.position.copy(t.p);
        if (fin) t.mesh.removeFromParent();
      }
      if (fin) this.trazadoras.splice(this.trazadoras.indexOf(t), 1);
    }
  }
  sacarSeguro(id) {
    if (this.granadaMano || !(this.inv.armas[id] > 0)) return null;
    if (this.gesto?.tipo === "tira" && this.frame - this.gesto.f < 12) return null;
    this.granadaMano = {
      id: id,
      espoleta: 120,
      sinBoton: 0
    };
    this.tManoVacia = 0;
    this.se(SE_ARMA.SEGURO, this.posSnake());
    this.gesto = {
      tipo: "seguro",
      id: id,
      f: this.frame
    };
    return {
      granada: id,
      espoleta: 120
    };
  }
  tirarGranada(o, d, seCae = false) {
    const G = this.granadaMano;
    if (!G) return null;
    this.granadaMano = null;
    this.tManoVacia = MANO_VACIA;
    if (!(this.inv.armas[G.id] > 0)) return null;
    const pos = this.postura(), f = new THREE.Vector3(d.x, 0, d.z);
    if (f.lengthSq() < 1e-8) f.set(0, 0, -1);
    f.normalize();
    const [vy, vz] = seCae || this._seCae || pos === 2 ? [ 32, 32 ] : pos === 0 ? [ 128, 150 ] : [ 50, 200 ];
    const paso = f.clone().multiplyScalar(vz * MM);
    paso.y = vy * MM;
    paso.x += this.velSnake.x;
    paso.z += this.velSnake.z;
    const p = o.clone();
    p.y -= .25;
    p.addScaledVector(f, .2);
    const obj = this.modelo(G.id, this.bolita(G.id === WP.GRENADE ? 3820074 : 6318192, .05));
    obj.position.copy(p);
    this.granadas.push({
      id: G.id,
      p: p,
      paso: paso,
      espoleta: G.espoleta,
      rebotes: 0,
      obj: obj,
      salida: p.clone()
    });
    this.inv.armas[G.id]--;
    return {
      granada: G.id,
      lanzada: true,
      paso: paso.clone()
    };
  }
  cuadroGranadas() {
    if (this.tManoVacia > 0) this.tManoVacia--;
    const G = this.granadaMano;
    if (G && G.sale == null && this.ctx.cuadrado && !this.inv.abierto) {
      if (this.ctx.cuadrado()) G.sinBoton = 0; else if (++G.sinBoton >= 2) {
        const m = this.ctx.mira?.();
        this.soltar(m?.o, m?.d);
      }
    }
    if (G && --G.espoleta < 1) {
      const id = G.id;
      this.granadaMano = null;
      this.inv.armas[id]--;
      const p = this.posSnake().clone();
      p.y += 1.2;
      this.estallar(id, p);
      if (id === WP.STUN) this.juego?.dañoSnake?.(64, 2);
    } else if (G && G.sale != null && --G.sale <= 0) {
      const m = this.ctx.mira?.();
      this.tirarGranada(m?.o || G.o, (m?.d || G.d).clone().normalize());
    }
    for (const g of this.granadas.slice()) {
      const ant = g.p.clone(), q = g.p.clone().add(g.paso);
      const dd = q.clone().sub(ant), L = dd.length();
      if (L > 1e-6) {
        const h = this.pared(ant, dd.clone().divideScalar(L), L + .05, this.juego?.paredCol || this.juego?.vista);
        if (h && h.face) {
          const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
          n.y = 0;
          if (n.lengthSq() > 0) {
            n.normalize();
            g.paso.reflect(n);
            g.paso.x /= 4;
            g.paso.z /= 4;
            q.copy(h.point).addScaledVector(n, .05);
            q.y = ant.y + g.paso.y;
            if (++g.rebotes < 3) {
              this.se(SE_ARMA.REBOTE, q);
              this.ruido(128, 12, q);
            }
          }
        }
      }
      const piso = this.piso(q);
      if (q.y <= piso + .05 && g.paso.y <= 0) {
        q.y = piso + .05;
        g.paso.y = -g.paso.y / 8;
        g.paso.x /= 4;
        g.paso.z /= 4;
        if (g.paso.y < 5 * MM) g.paso.set(0, 0, 0);
        if (g.quieta) {} else if (++g.rebotes < 3) {
          this.se(SE_ARMA.REBOTE, q);
          this.ruido(128, 12, q);
        }
        if (g.paso.lengthSq() === 0) g.quieta = true;
        if (g.primerPique == null) g.primerPique = q.clone();
      } else g.paso.y -= 16 * MM;
      g.p.copy(q);
      g.obj.position.copy(q);
      if (!g.quieta) g.obj.rotation.x += .3;
      if (--g.espoleta <= 0) {
        this.granadas.splice(this.granadas.indexOf(g), 1);
        g.obj.removeFromParent();
        this.ultimaGranada = g;
        this.estallar(g.id, g.p.clone());
      }
    }
  }
  estallar(id, p) {
    if (id === WP.STUN) return this.aturdir(p);
    if (id === WP.CHAFF) return this.tirarChaff(p);
    return this.explosion(p, BLAST.normal);
  }
  explosion(p, daño = BLAST.normal, arma = null) {
    this.se(SE_ARMA.EXPLOSION, p);
    this.ruido(255, 32, p);
    this.visualExplosion(p);
    const cubo = (c, half, r) => Math.abs(c.x - p.x) <= r + half.x && Math.abs(c.y - p.y) <= r + half.y && Math.abs(c.z - p.z) <= r + half.z;
    const res = {
      pos: p.clone(),
      guardias: [],
      snake: 0
    };
    for (const g of this.guardias()) {
      const c = g.o.position.clone();
      c.y += .9;
      const a = cubo(c, CAJA_GUARDIA, 1), b = cubo(c, CAJA_GUARDIA, 2);
      if (!a && !b) continue;
      const d = (a ? daño : 0) + (b ? daño : 0), f = (a ? 5 : 0) + (b ? 3 : 0);
      this.juego.dañar(g, d, 1);
      if (g.vital > 0) this.juego.dañar(g, f, 4);
      res.guardias.push({
        g: g,
        "daño": d,
        vital: g.vital
      });
    }
    const s = this.posSnake(), alt = [ 1.1, .5, .14 ][this.postura()] || 1.1, cs = s.clone();
    cs.y += alt / 2;
    const half = new THREE.Vector3(.3, alt / 2, .3), a = cubo(cs, half, 1), b = cubo(cs, half, 2);
    if ((a || b) && this.juego && !this.juego.muerto && !this.juego.ctx?.vuelo?.()) {
      res.snake = (a ? daño : 0) + (b ? daño : 0);
      const e = cs.clone().sub(p);
      e.y = 0;
      if (e.lengthSq() < 1e-6) e.set(0, 0, 1);
      e.normalize().multiplyScalar(a ? 100 : 50);
      if (this.juego.dañoSnake) {
        if (!this.juego.dañoSnake(res.snake, 2, e)) res.snake = 0;
      } else {
        this.juego.vida -= res.snake / (this.inv.vidaMax || 256);
        this.ctx.daño?.();
      }
    }
    this.ultimaExplosion = res;
    return res;
  }
  visualExplosion(p, escala = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaExplosion(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }));
    s.position.copy(p);
    s.scale.setScalar(.5);
    s.renderOrder = 5;
    s.userData.propio = s.userData.sinColision = true;
    const luz = new THREE.PointLight(16755285, 3, 8);
    luz.position.copy(p);
    this.escena?.add(s);
    this.escena?.add(luz);
    this.fx.push({
      t: 0,
      dur: 30,
      fn: t => {
        const k = t / 30;
        s.scale.setScalar(escala * (.6 + 3.4 * Math.min(1, t / 8)));
        s.material.opacity = 1 - k;
        luz.intensity = 3 * (1 - k);
      },
      fin: () => {
        s.removeFromParent();
        luz.removeFromParent();
        s.material.dispose();
      }
    });
  }
  aturdir(p) {
    this.se(SE_ARMA.EXPLOSION, p);
    this.ruido(255, 32, p);
    this.visualExplosion(p, .6);
    this.ctx.destello?.();
    const normal = (this.juego?.modo ?? 0) === 0, lista = [];
    for (const g of this.guardias()) {
      if ([ "piso", "cae", "soltado", "levanta", "agarrado" ].includes(g.accion)) continue;
      this.juego.dañar(g, normal ? Math.max(1, g.faint) : 5, 3);
      lista.push(g);
    }
    this.ultimoAturdidos = lista;
    return lista;
  }
  tirarChaff(p) {
    this.se(SE_ARMA.CHAFF_EXPL, p);
    this.ruido(100, 32, p);
    this.chaff = 300;
    this.inv.chaff = true;
    if (!this.nube) {
      const n = 64, g = new THREE.BufferGeometry, pos = new Float32Array(n * 3);
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.nube = new THREE.Points(g, new THREE.PointsMaterial({
        color: 14211304,
        size: 3,
        sizeAttenuation: false,
        depthWrite: false
      }));
      this.nube.frustumCulled = false;
      this.nube.userData.propio = this.nube.userData.sinColision = true;
      this.nubeVel = new Float32Array(n * 3);
    }
    const P = this.nube.geometry.attributes.position.array;
    for (let i = 0; i < 64; i++) {
      P[i * 3] = p.x;
      P[i * 3 + 1] = p.y;
      P[i * 3 + 2] = p.z;
      const a = Math.random() * Math.PI * 2, v = (100 + Math.random() * 1024) * MM / 8;
      this.nubeVel[i * 3] = Math.sin(a) * v;
      this.nubeVel[i * 3 + 1] = .02 + Math.random() * .03;
      this.nubeVel[i * 3 + 2] = Math.cos(a) * v;
    }
    this.nube.geometry.attributes.position.needsUpdate = true;
    this.escena?.add(this.nube);
  }
  cuadroChaff() {
    if (this.chaff <= 0) return;
    if (--this.chaff <= 0) {
      this.inv.chaff = false;
      this.nube?.removeFromParent();
      return;
    }
    if (++this.chaffSon >= 24) {
      this.chaffSon = 0;
      this.se(SE_ARMA.CHAFF);
    }
    if (this.nube) {
      const P = this.nube.geometry.attributes.position.array, V = this.nubeVel;
      for (let i = 0; i < 64; i++) {
        P[i * 3] += V[i * 3];
        P[i * 3 + 1] += V[i * 3 + 1];
        P[i * 3 + 2] += V[i * 3 + 2];
        V[i * 3] *= .9;
        V[i * 3 + 2] *= .9;
        V[i * 3 + 1] = Math.max(-.01, V[i * 3 + 1] - .002);
      }
      this.nube.geometry.attributes.position.needsUpdate = true;
    }
  }
  ponerC4(o, d) {
    const inv = this.inv;
    if (!(inv.armas[WP.C4] > 0) || this.c4.length >= 16) return null;
    const s = this.posSnake(), f = new THREE.Vector3(d.x, 0, d.z).normalize(), pecho = s.clone();
    pecho.y += .9;
    const c = {
      pos: new THREE.Vector3,
      normal: new THREE.Vector3(0, 1, 0),
      guardia: null,
      local: null
    };
    const gg = this.guardias().find(g => {
      const v = g.o.position.clone().sub(s);
      v.y = 0;
      return v.length() < .9 && v.normalize().dot(f) > .7;
    });
    const h = gg ? null : this.pared(pecho, f, .8, this.juego?.paredCol || this.juego?.vista);
    if (gg) {
      c.guardia = gg;
      c.local = new THREE.Vector3(0, 1.1, -.2);
    } else if (h) {
      c.pos.copy(h.point);
      if (h.face) c.normal.copy(h.face.normal).transformDirection(h.object.matrixWorld);
      c.pos.addScaledVector(c.normal, .03);
    } else {
      c.pos.copy(s).addScaledVector(f, .3);
      c.pos.y = this.piso(c.pos) + .02;
    }
    c.obj = this.modelo(WP.C4, new THREE.Mesh(new THREE.BoxGeometry(.12, .05, .18), new THREE.MeshBasicMaterial({
      color: 9075280
    })));
    c.obj.position.copy(c.pos);
    if (!gg) c.obj.lookAt(c.pos.clone().add(c.normal));
    this.c4.push(c);
    inv.armas[WP.C4]--;
    this.se(SE_ARMA.C4_PONER, s);
    this.gesto = {
      tipo: gg ? "poneGuardia" : "pone",
      id: WP.C4,
      f: this.frame
    };
    this.tManoVacia = 16;
    return {
      c4: c,
      enGuardia: !!gg,
      enPared: !!h
    };
  }
  detonar() {
    if (!this.c4.length || this.detonando) return false;
    this.se(SE_ARMA.C4_BOTON);
    this.detonando = 3;
    return true;
  }
  cuadroC4() {
    for (const c of this.c4) if (c.guardia) {
      if (c.guardia.inactivo || c.guardia.faseout) {
        c.perdida = true;
        continue;
      }
      c.guardia.o.updateMatrixWorld();
      c.obj.position.copy(c.local).applyMatrix4(c.guardia.o.matrixWorld);
      c.pos.copy(c.obj.position);
    }
    this.c4 = this.c4.filter(c => {
      if (c.perdida) c.obj.removeFromParent();
      return !c.perdida;
    });
    if (this.detonando && --this.detonando === 0) {
      const lista = this.c4.splice(0);
      for (const c of lista) {
        c.obj.removeFromParent();
        this.explosion(c.pos.clone(), BLAST.normal, WP.C4);
      }
    }
  }
  ponerMina(o, d) {
    const inv = this.inv;
    if (!(inv.armas[WP.CLAYMORE] > 0) || this.minas.filter(m => m.propia && !m.disparada).length >= 8) return null;
    const s = this.posSnake(), f = new THREE.Vector3(d.x, 0, d.z).normalize(), p = s.clone().addScaledVector(f, .6);
    p.y = this.piso(p);
    const m = this.crearMina(p, Math.atan2(f.x, f.z), true);
    inv.armas[WP.CLAYMORE]--;
    this.se(SE_ARMA.C4_PONER, s);
    this.gesto = {
      tipo: "pone",
      id: WP.CLAYMORE,
      f: this.frame
    };
    this.tManoVacia = 13;
    return {
      mina: m
    };
  }
  crearMina(p, rot, propia) {
    const m = {
      pos: p.clone(),
      rot: rot,
      propia: propia,
      t: 0,
      disparada: false
    };
    m.obj = this.modelo(WP.CLAYMORE, new THREE.Mesh(new THREE.BoxGeometry(.22, .12, .05), new THREE.MeshBasicMaterial({
      color: 4872762
    })));
    m.obj.position.copy(p);
    m.obj.rotation.y = rot;
    this.minas.push(m);
    return m;
  }
  dentroZona(m, q, alto) {
    const f = new THREE.Vector3(Math.sin(m.rot), 0, Math.cos(m.rot)), c = m.pos.clone().addScaledVector(f, .6);
    const v = q.clone().sub(c), lx = v.x * Math.cos(m.rot) - v.z * Math.sin(m.rot), lz = v.x * Math.sin(m.rot) + v.z * Math.cos(m.rot);
    return Math.abs(lx) <= .5 && Math.abs(lz) <= .5 && q.y - .2 <= m.pos.y + .45 && q.y + alto >= m.pos.y - .25;
  }
  cuadroMinas() {
    const termica = this.inv.filtro === "termica", s = this.posSnake(), postura = this.postura();
    for (const m of this.minas) {
      if (m.disparada) continue;
      m.t++;
      m.obj.visible = m.t < 64 || termica;
      if (postura === 2 && m.pos.distanceTo(s) < .8) {
        const inv = this.inv;
        if (inv.armas[WP.CLAYMORE] >= inv.armasMax[WP.CLAYMORE]) {
          if (!m.full) {
            m.full = true;
            this.se(SE_ARMA.LLENO, m.pos);
            this.ctx.aviso?.("FULL");
          }
          continue;
        }
        inv.armas[WP.CLAYMORE] = Math.max(0, inv.armas[WP.CLAYMORE]) + 1;
        this.se(SE_ARMA.TOMAR, m.pos);
        this.ctx.aviso?.("CLAYMORE");
        m.disparada = true;
        m.levantada = true;
        m.borrar = true;
        m.obj.removeFromParent();
        continue;
      }
      m.full = false;
      let salta = postura !== 2 && !this.juego?.ctx?.vuelo?.() && this.dentroZona(m, s, [ 1.1, .5, .14 ][postura] || 1.1);
      if (!salta) salta = this.guardias().some(g => this.dentroZona(m, g.o.position, 1.8));
      if (salta) this.dispararMina(m);
    }
    this.minas = this.minas.filter(m => !m.borrar);
  }
  dispararMina(m) {
    m.disparada = true;
    m.obj.visible = true;
    const f = new THREE.Vector3(Math.sin(m.rot), 0, Math.cos(m.rot)), o = m.pos.clone();
    o.y += .25;
    this.se(SE_ARMA.EXPLOSION, o);
    this.ruido(255, 32, o);
    this.visualExplosion(o.clone().addScaledVector(f, .3), .7);
    const tocados = new Set, esquirlas = new Set;
    for (const g of this.guardias()) if (this.dentroZona(m, g.o.position, 1.8)) {
      this.juego.dañar(g, 128, 1);
      if (g.vital > 0) this.juego.dañar(g, 3, 4);
      tocados.add(g);
    }
    let snake = false, s0 = this.posSnake();
    const enZona = this.postura() !== 2 && this.dentroZona(m, s0, [ 1.1, .5, .14 ][this.postura()] || 1.1);
    for (let k = -3; k <= 3; k++) {
      const d = f.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * .12), h = this.pared(o, d, 4.5), lejos = h ? h.distance : 4.5;
      const gg = this.guardiaEn(o, d, lejos, .35);
      if (gg && !esquirlas.has(gg.g)) {
        this.juego.dañar(gg.g, 256, 1);
        esquirlas.add(gg.g);
        tocados.add(gg.g);
      }
      const s = this.posSnake(), sv = s.clone().sub(o);
      sv.y = 0;
      const t = sv.dot(d);
      if (!snake && t > 0 && t < lejos && sv.clone().addScaledVector(d, -t).length() < .3 && this.postura() !== 2 && this.juego) {
        snake = d.clone().multiplyScalar(1500 / 32);
      }
    }
    const aSnake = (enZona ? 128 : 0) + (snake ? 256 : 0);
    if (aSnake && this.juego?.dañoSnake) this.juego.dañoSnake(aSnake, 2, snake || null);
    m.fx = 6;
    this.fx.push({
      t: 0,
      dur: 6,
      fn: () => {},
      fin: () => {
        m.obj.removeFromParent();
        m.borrar = true;
      }
    });
    this.ultimaMina = [ ...tocados ];
  }
  lanzarNikita(o, d) {
    const inv = this.inv;
    if (this.misil || this.recargando > 0) return null;
    if (!(inv.armas[WP.NIKITA] > 0)) {
      this.se(SE_ARMA.VACIO, o);
      this.ruido(5, 2, o);
      return null;
    }
    const s = this.posSnake(), rumbo = dirDe(d.x, d.z), p = s.clone();
    p.y += .4;
    p.x += Math.sin(rumbo * ANG) * .5;
    p.z += Math.cos(rumbo * ANG) * .5;
    const obj = this.modelo("misil", new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({
      color: 7829367
    })));
    obj.position.copy(p);
    this.misil = {
      p: p,
      rumbo: rumbo,
      giro: rumbo,
      vel: 0,
      freno: 30,
      turbo: 0,
      t: 0,
      perdido: false,
      obj: obj,
      alto: .4
    };
    inv.armas[WP.NIKITA]--;
    inv.misilEnVuelo = true;
    this.se(SE_ARMA.MISIL, s);
    this.ruido(100, 2, s);
    this.gesto = {
      tipo: "lanza",
      id: WP.NIKITA,
      f: this.frame
    };
    return {
      misil: this.misil,
      retroceso: RETROCESO[WP.NIKITA]
    };
  }
  girarMisil(signo) {
    const M = this.misil;
    if (!M || M.perdido || !signo) return;
    M.freno = 30;
    M.giro = (M.giro + (signo > 0 ? -64 : 64) + 4096) % 4096;
  }
  rumboMisil(rad) {
    const M = this.misil;
    if (!M || M.perdido) return;
    const r = dirDe(-Math.sin(rad), -Math.cos(rad));
    if (r !== M.giro) {
      M.freno = 30;
      M.giro = r;
    }
  }
  cuadroNikita() {
    const M = this.misil;
    if (!M) return;
    if (this.mandoMisil) this.girarMisil(this.mandoMisil);
    if (!M.perdido && (this.chaff > 0 || this.juego?.muerto)) M.perdido = true;
    if (M.freno > 0) {
      if (--M.freno === 0) {
        this.se(SE_ARMA.MISIL_TURBO);
        M.turbo = 12;
      }
      M.vel = 50 * MM;
    } else {
      if (M.turbo > 0) M.turbo--;
      M.vel = 200 * MM;
    }
    M.t++;
    if (1e3 - M.t < 100) M.giro = (M.giro + Math.trunc(randS(32) * (M.t - 900) / 32) + 4096) % 4096;
    if (M.perdido) M.giro = (M.giro + randS(128) + 4096) % 4096;
    const d = difS(M.giro, M.rumbo);
    M.rumbo = (M.rumbo + (Math.abs(d) < 4 ? d : Math.round(d / 4)) + 4096) % 4096;
    const dir = new THREE.Vector3(Math.sin(M.rumbo * ANG), 0, Math.cos(M.rumbo * ANG));
    const h = this.pared(M.p, dir, M.vel + .1, this.juego?.paredCol || this.juego?.vista);
    const bajo = M.p.clone();
    bajo.y -= .5;
    const gg = this.guardiaEn(bajo, dir, M.vel + .2, .4);
    M.p.addScaledVector(dir, M.vel);
    const piso = this.piso(M.p);
    M.p.y += (piso + M.alto - M.p.y) * .5;
    M.obj.position.copy(M.p);
    M.obj.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
    this.ruido(5, 2, M.p);
    if (gg || h || M.t >= 1e3) this.terminarNikita(true);
  }
  terminarNikita(explota) {
    const M = this.misil;
    if (!M) return;
    if (explota) this.explosion(M.p.clone(), BLAST.normal, WP.NIKITA);
    M.obj.removeFromParent();
    this.misil = null;
    this.inv.misilEnVuelo = false;
  }
  vistaMisil() {
    const M = this.misil;
    if (!M) return null;
    return {
      pos: M.p.clone(),
      dir: new THREE.Vector3(Math.sin(M.rumbo * ANG), 0, Math.cos(M.rumbo * ANG)),
      temblor: M.turbo,
      perdido: M.perdido
    };
  }
  actualizarFijado(cam) {
    if (this.inv.arma !== WP.STINGER || !cam) {
      this.fijado = null;
      return null;
    }
    const s = this.posSnake();
    let mejor = null, md = 60;
    const v = new THREE.Vector3, w = new THREE.Vector3;
    cam.updateMatrixWorld();
    for (const g of this.guardias()) {
      if ([ "piso", "cae", "soltado" ].includes(g.accion)) continue;
      v.copy(g.o.position);
      v.y += .9;
      w.copy(v);
      w.y += .54;
      const d = v.distanceTo(s);
      if (d < 2.401) continue;
      v.project(cam);
      w.project(cam);
      if (v.z > 1 || v.z < -1) continue;
      const sx = v.x * 160, sy = -v.y * 112, caja = sy - -w.y * 112;
      if (caja <= 0 || caja >= 225) continue;
      const hol = caja * (this.holguraFijado || 1);
      if (Math.abs(sx) < hol && Math.abs(sy) < hol && d < md) {
        md = d;
        mejor = g;
      }
    }
    if (mejor && mejor !== this.fijado) this.se(SE_ARMA.FIJADO);
    if (mejor !== this.fijado) this.tFijado = 0;
    this.fijado = mejor;
    return mejor;
  }
  lanzarStinger(o, d) {
    const inv = this.inv;
    if (this.recargaStinger > 0 || this.misilS.length) return null;
    if (!(inv.armas[WP.STINGER] > 0)) {
      this.se(SE_ARMA.VACIO, o);
      return null;
    }
    this.recargaStinger = 30;
    this.patadaStinger = 30;
    const obj = this.modelo(null, new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .6, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({
      color: 9079408
    })));
    const p = o.clone();
    obj.position.copy(p);
    this.misilS.push({
      p: p,
      d: d.clone().normalize(),
      t: 0,
      blanco: this.fijado,
      obj: obj,
      despegue: 11
    });
    inv.armas[WP.STINGER]--;
    this.se(SE_ARMA.MISIL, o);
    this.ruido(200, 2, o);
    this.gesto = {
      tipo: "lanza",
      id: WP.STINGER,
      f: this.frame
    };
    return {
      stinger: true,
      fijado: this.fijado,
      retroceso: RETROCESO[WP.STINGER]
    };
  }
  cuadroStinger() {
    if (this.recargaStinger > 0) this.recargaStinger--;
    if (this.patadaStinger > 0) this.patadaStinger--;
    for (const m of this.misilS.slice()) {
      m.t++;
      let vel;
      if (m.t < 5) vel = 350 * MM; else if (m.t < 14) {
        vel = 100 * MM;
        m.p.y -= 70 * MM;
      } else {
        vel = 800 * MM;
        if (--m.despegue >= 0) m.p.y += 11 * MM;
        const b = m.blanco;
        if (b && !b.inactivo && b.accion !== "muerto") {
          const q = b.o.position.clone();
          q.y += .9;
          q.sub(m.p);
          const tasa = Math.max(0, 30 - Math.floor(m.t / 3)) * ANG, yaw = Math.atan2(m.d.x, m.d.z), yawB = Math.atan2(q.x, q.z);
          let dy = Math.atan2(Math.sin(yawB - yaw), Math.cos(yawB - yaw));
          if (Math.abs(dy) <= Math.PI / 2) {
            dy = Math.max(-tasa, Math.min(tasa, dy));
            const pit = Math.asin(Math.max(-1, Math.min(1, m.d.y))), pitB = Math.atan2(q.y, Math.hypot(q.x, q.z));
            const dp = Math.max(-tasa, Math.min(tasa, pitB - pit)), ny = yaw + dy, np = pit + dp;
            m.d.set(Math.sin(ny) * Math.cos(np), Math.sin(np), Math.cos(ny) * Math.cos(np));
          }
        }
      }
      const h = this.pared(m.p, m.d, vel + .1), gg = this.guardiaEn(m.p, m.d, vel + .3, .45);
      m.p.addScaledVector(m.d, vel);
      m.obj.position.copy(m.p);
      m.obj.lookAt(m.p.clone().add(m.d));
      if (gg || h || m.p.y < this.piso(m.p) || m.t > 90) {
        this.misilS.splice(this.misilS.indexOf(m), 1);
        m.obj.removeFromParent();
        this.explosion(m.p.clone(), BLAST.normal, WP.STINGER);
      }
    }
  }
  cuadroMira() {
    const id = this.inv.arma, pp = this.ctx.primeraPersona ? this.ctx.primeraPersona() : true;
    if (id !== WP.PSG1 || !pp) {
      this.tApunta = 0;
      this.zoom = 320;
      this.tebure = 0;
      this.tTebure = 0;
      return;
    }
    if (this.tApunta++ >= 9) {
      let limite = 3e3;
      const m = this.ctx.mira?.();
      if (m) {
        const h = this.pared(m.o, m.d.clone().normalize(), 3);
        if (h) limite = h.distance * 1e3;
        if (limite < 1e3) limite = 320;
      }
      if (this.zoom < limite) {
        this.zoom += Math.floor(this.zoom / 3);
        if (this.zoom > limite) this.zoom = limite;
      } else this.zoom += (limite - this.zoom) / 4;
    }
    const calmo = this.inv.diazepam > 0, largo = this.tebureRot?.n || 130;
    if (calmo) this.tTebure = 0; else if (this.tTebure > 0) {
      if (++this.tTebure > largo) {
        this.tTebure = 0;
        this.tebure = 0;
      }
    } else if (++this.tebure >= 90) {
      this.tebure = 0;
      this.tTebure = 1;
    }
    if (++this.latido >= (calmo ? 48 : 32)) {
      this.latido = 0;
      this.ctx.vibrar?.(2);
      this.latidoPend = 2;
    }
    if (this.latidoPend > 0 && --this.latidoPend === 0) this.se(SE_ARMA.LATIDO);
  }
  fovFactor() {
    return (this.itemConZoom() ? this.zoomItem : this.zoom) / 320;
  }
  itemConZoom() {
    return (this.inv.item === IT.SCOPE || this.inv.item === IT.CAMERA) && (this.ctx.primeraPersona ? this.ctx.primeraPersona() : true);
  }
  cuadroZoomItem() {
    if (!this.itemConZoom()) {
      this.zoomItem = 320;
      this.zoomPedido = 320;
      return;
    }
    let tope = 3200;
    const m = this.ctx.mira?.();
    if (m) {
      const h = this.pared(m.o, m.d.clone().normalize(), 3.2);
      if (h) tope = Math.max(320, h.distance * 1e3);
    }
    const obj = Math.min(this.zoomPedido, tope), paso = Math.max(1, this.zoomItem / 32);
    this.zoomItem = this.zoomItem < obj ? Math.min(obj, this.zoomItem + paso) : Math.max(obj, this.zoomItem - paso);
  }
  "alDañoSnake"() {
    if (this.granadaMano) {
      const m = this.ctx.mira?.();
      this._seCae = true;
      try {
        this.tirarGranada(m?.o || this.posSnake().clone().setY(this.posSnake().y + 1.2), m?.d || new THREE.Vector3(0, 0, -1), true);
      } finally {
        this._seCae = false;
      }
    }
    if (this.misil && !this.misil.perdido) this.misil.perdido = true;
  }
  cuadroCaja() {
    const inv = this.inv, enCaja = inv.item >= IT.BOX1 && inv.item <= IT.BOX3, tercera = this.ctx.primeraPersona ? !this.ctx.primeraPersona() : false;
    if (enCaja && !this.caja) this.caja = this.modelo("caja", new THREE.Mesh(new THREE.BoxGeometry(.75, .8, .6).translate(0, .4, 0), new THREE.MeshBasicMaterial({
      color: 9071168
    })));
    if (this.caja) {
      this.caja.visible = enCaja && tercera && !this.ctx.cajaPorDentro?.();
      if (enCaja) {
        const s = this.posSnake(), y = this.juego?.ctx?.yawSnake?.() ?? 0;
        this.caja.position.set(s.x, s.y, s.z);
        this.caja.rotation.y = y + Math.PI;
        const k = this.caja.children[0];
        if (k && !k.userData.centrada && !k.isMesh) {
          k.position.set(0, .394, -.221);
          k.userData.centrada = true;
        }
      } else {
        this.caja.removeFromParent();
        this.caja = null;
      }
    }
    const V = this.cajaVolando;
    if (V) {
      V.t++;
      V.obj.position.add(V.v);
      V.v.y -= 16 * MM;
      V.obj.rotation.x += .25;
      V.obj.rotation.z += .12;
      const piso = this.piso(V.obj.position);
      if (V.obj.position.y < piso) {
        V.obj.position.y = piso;
        V.v.multiplyScalar(.3);
        V.v.y = Math.abs(V.v.y);
      }
      V.obj.visible = V.t < 19 || (V.t & 2) === 0;
      if (V.t > 40) {
        V.obj.removeFromParent();
        this.cajaVolando = null;
      }
    }
  }
  cajaVuela(g) {
    const s = this.posSnake(), obj = this.modelo("caja", new THREE.Mesh(new THREE.BoxGeometry(.75, .8, .6).translate(0, .4, 0), new THREE.MeshBasicMaterial({
      color: 9071168
    })));
    obj.position.copy(s);
    const d = s.clone().sub(g?.o?.position || s.clone().add(new THREE.Vector3(0, 0, 1)));
    d.y = 0;
    if (d.lengthSq() < 1e-6) d.set(0, 0, -1);
    d.normalize();
    this.cajaVolando = {
      obj: obj,
      v: d.multiplyScalar(.09).setY(.16),
      t: 0
    };
    if (this.caja) this.caja.visible = false;
  }
  cuadroBandana() {
    const inv = this.inv, id = inv.arma;
    if (inv.item !== IT.BANDANA || id < 0 || !(inv.armasMax[id] > 0)) return;
    inv.armas[id] = inv.armasMax[id];
    if (inv.cargadorMax > 0) inv.cargador = Math.min(inv.cargadorMax, inv.armas[id]);
  }
  balanceo() {
    let yaw = 0, pitch = 0;
    if (this.tTebure > 0) {
      const T = this.tebureRot;
      if (T) {
        const f = Math.min(T.n - 1, this.tTebure - 1);
        yaw = T.ry[f] * ANG;
        pitch = -T.rx[f] * ANG;
      } else {
        const t = this.tTebure / FPS, amp = Math.min(1, t / 1);
        yaw = .01 * amp * Math.sin(t * Math.PI * 2 / 2.2) + .004 * amp * Math.sin(t * 5.1);
        pitch = .007 * amp * Math.sin(t * Math.PI * 2 / 1.4 + .7);
      }
    }
    const k = this.patadaStinger;
    if (k >= 27) pitch += (30 - k) * 36 * ANG; else if (k > 14) pitch += (k - 12) * 12 * ANG;
    return {
      yaw: yaw,
      pitch: pitch
    };
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
  cuadro() {
    this.frame++;
    const s = this.posSnake();
    if (this.posPrev) this.velSnake.subVectors(s, this.posPrev); else this.posPrev = new THREE.Vector3;
    this.posPrev.copy(s);
    const inv = this.inv;
    if (inv.arma !== this.actual) this.equipar(inv.arma);
    if (inv.arma === WP.SOCOM && inv.items[IT.SUPPR] > 0) this.equipar(WP.SOCOM);
    if (this.recargando > 0) {
      this.recargando--;
      if (inv.arma === WP.PSG1) {
        if (this.recargando === 4) {
          this.se(SE_ARMA.RECARGA);
          inv.cargadorMax = 5;
          inv.cargador = Math.min(5, inv.armas[WP.PSG1]);
        }
      } else if (this.recargando === (this.recargaDur || RECARGA) - 17) this.se(SE_ARMA.RECARGA);
    }
    if (!this.gatillo) this.tSuelto++;
    if (this.gatillo && inv.arma === WP.FAMAS && this.ctx.cuadrado && !this.ctx.cuadrado()) {
      if (++this.sinBotonFamas >= 2) this.soltar();
    } else this.sinBotonFamas = 0;
    if (this.gatillo && inv.arma === WP.FAMAS && !this.bloqueado()) {
      const m = this.ctx.mira?.(), o = m?.o || this.origen, d = (m?.d || this.dir).clone().normalize();
      const r = this.cuadroFamas(o, d);
      if (r) this.ctx.alRafaga?.(r, o, d);
    }
    if (this.fijado) this.tFijado++;
    this.cuadroTrazadoras();
    this.cuadroGranadas();
    this.cuadroC4();
    this.cuadroMinas();
    this.cuadroNikita();
    this.cuadroStinger();
    this.cuadroChaff();
    this.cuadroMira();
    this.cuadroZoomItem();
    this.cuadroCaja();
    this.cuadroBandana();
    for (const e of this.fx.slice()) {
      e.t++;
      e.fn(e.t);
      if (e.t >= e.dur) {
        e.fin();
        this.fx.splice(this.fx.indexOf(e), 1);
      }
    }
  }
  estadoAnim() {
    const G = this.granadaMano, g = this.gesto, inv = this.inv;
    if (G && G.sale == null) return {
      tipo: "mantiene",
      id: G.id,
      t: (this.frame - (g?.tipo === "seguro" ? g.f : this.frame)) / FPS
    };
    if (this.gatillo && inv.arma === WP.FAMAS && inv.cargador > 0 && this.recargando <= 0 && !this.bloqueado()) return {
      tipo: "rafaga",
      id: WP.FAMAS,
      t: 0
    };
    if (g && g.tipo !== "seguro" && g.id === inv.arma && this.frame - g.f < 45) return {
      tipo: g.tipo,
      id: g.id,
      t: (this.frame - g.f) / FPS
    };
    return null;
  }
  manoVacia() {
    const id = this.inv.arma;
    if ([ WP.GRENADE, WP.STUN, WP.CHAFF, WP.C4, WP.CLAYMORE ].includes(id) && !(this.inv.armas[id] > 0) && !this.granadaMano) return true;
    return this.tManoVacia > 0 && !this.granadaMano;
  }
  dibujarHud(x, W, H) {
    if (this.fijado && (this.tFijado >> 3 & 1) === 0) this.inv.letra?.(x, 180 + (W - 320 >> 1), 16, "LOCK_ON", "cian");
    const M = this.misil;
    if (M) {
      const f = Math.max(0, 1 - M.t / 1e3), h = Math.round(10 * f);
      x.fillStyle = "rgb(93,135,90)";
      x.fillRect(31, 39, 6, 10);
      x.fillStyle = f < .1 ? "rgb(212,78,78)" : "rgb(158,184,138)";
      x.fillRect(31, 39 + 10 - h, 6, h);
    }
  }
  destruir() {
    for (const o of [ ...this.granadas, ...this.c4, ...this.minas, ...this.misilS ]) o.obj?.removeFromParent();
    this.misil?.obj.removeFromParent();
    this.nube?.removeFromParent();
    this.caja?.removeFromParent();
    this.cajaVolando?.obj.removeFromParent();
    if (typeof removeEventListener === "function") {
      removeEventListener("wheel", this._rueda);
      removeEventListener("keydown", this._teclaZoom);
    }
    if (this.juego?.alDañoSnake) {
      this.juego.alDañoSnake = null;
      this.juego.alCajaPateada = null;
    }
    for (const t of this.trazadoras) t.mesh?.removeFromParent();
    for (const e of this.fx) e.fin();
    this.inv.extras = (this.inv.extras || []).filter(f => f.__armas !== this);
    this.inv.misilEnVuelo = false;
    this.inv.chaff = false;
  }
}
