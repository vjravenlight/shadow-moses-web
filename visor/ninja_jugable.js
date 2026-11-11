// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { cargarAnims, clip as clipAnim } from "./anim.js";

import { ArcoPlasma } from "./plasma.js";

import { materialKogaku, TINTE } from "./kogaku.js";

const MM = .001;

export const MOT = {
  QUIETO: 2,
  GUARDIA: 3,
  CORRER: 5,
  "DAÑO": 9,
  "DAÑO_FUERTE": 10,
  DESCARGA: 12,
  TAJO_CARRERA: 13,
  TAJO: 14,
  DESVIA: 16,
  MUERTE: 19,
  PARED: 21,
  PARED_I: 22,
  PARED_D: 23,
  GUARDIA_CORRE: 24,
  ESTOCADA: 25,
  TAJO_TORSO: 26,
  VOLTERETA: 27
};

export const SE = {
  "DAÑO": 197,
  DESCARGA: 198,
  CHISPA: 208,
  VOLTERETA: 209,
  ATERRIZA: 210,
  DESVIA: 211,
  ESTOCADA: 212,
  ZUMBIDO: 205,
  PASO1: 168,
  PASO2: 169,
  KOGAKU: 78,
  ENTRADA: 216
};

const HOJA = {
  tajo: [ [ 10, -75, 0 ], [ 10, -75, -930 ] ],
  carrera: [ [ 10, -75, 0 ], [ 10, -75, -1130 ] ],
  corre: [ [ 10, -75, 0 ], [ 10, -75, -930 ] ]
};

const ESTELA = [ [ 0, -65, -883 ], [ 0, -65, -45 ] ];

export const SE_ESCENARIOS = {
  [SE.DAÑO]: 37,
  [SE.DESCARGA]: 59,
  [SE.CHISPA]: 59,
  [SE.VOLTERETA]: 57,
  [SE.ATERRIZA]: 51,
  [SE.DESVIA]: 39,
  [SE.ESTOCADA]: 52,
  [SE.ZUMBIDO]: 56,
  [SE.PASO1]: 2,
  [SE.PASO2]: 3,
  [SE.ENTRADA]: null
};

export const RAYO = {
  fiel: true,
  "daño": 128,
  alcance: 60,
  carga: 15,
  haz: 10,
  despues: 30,
  largo: 1e3,
  espera: 10,
  se: 80,
  seImpacto: 59,
  azul: 8421631,
  azul2: 7763701,
  brillo: 8355839,
  destello: 10727375,
  pose: {
    anims: "snake",
    n: 42
  },
  hueso: 3,
  boca: .35,
  tex: "assets/jefes/rex/",
  brazo: true
};

const texRayo = new Map;

function texturaRayo(n) {
  if (!texRayo.has(n)) {
    const t = (new THREE.TextureLoader).load(n.includes("/") ? n : RAYO.tex + n + ".png");
    t.colorSpace = THREE.SRGBColorSpace;
    texRayo.set(n, t);
  }
  return texRayo.get(n);
}

const _rotX90 = (new THREE.Matrix4).makeRotationX(Math.PI / 2);

const _mB = new THREE.Matrix4, _vP = new THREE.Vector3, _vD = new THREE.Vector3, _vT = new THREE.Vector3, _qA = new THREE.Quaternion, _qB = new THREE.Quaternion, _qC = new THREE.Quaternion;

const TORSO = /^hueso_[1-9]\.quaternion$/;

const VEL_CORRER = 3.99;

const LEVE = new Set([ 1, 3, 8 ]);

const _v = new THREE.Vector3, _w = new THREE.Vector3, _a = new THREE.Vector3, _b = new THREE.Vector3;

function distSeg(p1, q1, p2, q2) {
  const d1 = _v.subVectors(q1, p1), d2 = _w.subVectors(q2, p2), r = _a.subVectors(p1, p2);
  const a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r);
  let s, t;
  if (a < 1e-9 && e < 1e-9) return p1.distanceTo(p2);
  if (a < 1e-9) {
    s = 0;
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = d1.dot(r);
    if (e < 1e-9) {
      t = 0;
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = d1.dot(d2), den = a * e - b * b;
      s = den > 1e-9 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  const c1 = p1.clone().addScaledVector(d1, s), c2 = _b.copy(p2).addScaledVector(d2, t);
  return c1.distanceTo(c2);
}

let texChispa = null;

function texturaChispa() {
  if (texChispa) return texChispa;
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(.4, "rgba(255,255,255,0.5)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return texChispa = new THREE.CanvasTexture(c);
}

export class NinjaJugable {
  constructor(ctx) {
    this.ctx = ctx;
    this.activo = false;
    this.listo = false;
    this.obj = null;
    this.huesos = [];
    this.mx = null;
    this.acciones = {};
    this.actual = null;
    this.torso = {};
    this.torsoActual = null;
    this.estado = "quieto";
    this.t = 0;
    this.acum = 0;
    this.yaw = 0;
    this.pos = new THREE.Vector3;
    this.pad = {
      circulo: false,
      cuadrado: false,
      cruz: false,
      r1: false,
      l1: false,
      r2: false
    };
    this.escenarios = false;
    this.mapaSE = null;
    this.prestado = false;
    this.esperaRayo = 0;
    this.rayos = 0;
    this.pulsados = new Set;
    this.soltarLuego = new Set;
    this.mueve = false;
    this.tMueve = 0;
    this.empuje = {
      x: 0,
      z: 0
    };
    this.hayEmpuje = false;
    this.kogaku = false;
    this.estela = false;
    this.desvios = 0;
    this.desvio = null;
    this.golpeados = new Set;
    this.aterrizo = false;
    this.objetivo = null;
    this.lunge = null;
    this.fx = [];
    this.registro = [];
    this.pared = null;
    this.forzado = null;
    this.muerto = false;
  }
  log(t, extra = {}) {
    this.registro.push({
      t: t,
      estado: this.estado,
      ...extra
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  juego() {
    return this.ctx.juego?.() || null;
  }
  se(id) {
    if (this.mapaSE && id in this.mapaSE) id = this.mapaSE[id];
    if (id == null) return;
    try {
      this.ctx.se?.(id);
    } catch {}
  }
  async cargar({modelo: modelo = "vr/disco/comun/ninja_vr.glb", anims: anims = "vr_ninja", anims_o: anims_o = "vr_ninja_o", escenarios: escenarios = false} = {}) {
    const [o, datos, datosO, datosR] = await Promise.all([ this.ctx.cargarGlb(modelo), cargarAnims(anims), anims_o ? cargarAnims(anims_o).catch(() => null) : null, escenarios ? cargarAnims(RAYO.pose.anims).catch(() => null) : null ]);
    if (escenarios) for (const n of [ "blue_bonbori", "laser_rayo", "laser_brillo" ]) texturaRayo(n);
    this.escenarios = !!escenarios;
    this.mapaSE = escenarios ? SE_ESCENARIOS : null;
    this.datosRayo = datosR;
    this.modeloUrl = modelo;
    this.datos = {
      ...datos,
      clips: {
        ...datos.clips
      }
    };
    if (datosO) for (const [k, c] of Object.entries(datosO.clips)) this.datos.clips["o " + c.n] = c;
    o.traverse(m => {
      if (m.isMesh) {
        m.frustumCulled = false;
        m.userData.sinColision = true;
        m.castShadow = true;
      }
    });
    o.userData.personaje = true;
    o.userData.ninjaJugable = true;
    for (let i = 0; i < 16; i++) this.huesos.push(o.getObjectByName("hueso_" + i));
    {
      const c = o.getObjectByName("hueso_16");
      this.cara = c && c.parent?.name === "hueso_5" ? c : null;
    }
    this.raizBase = this.huesos[0] ? this.huesos[0].position.toArray() : [ 0, 0, 0 ];
    this.obj = o;
    o.visible = false;
    this.ctx.mundo.add(o);
    this.ctx.teñir?.(o);
    this.materiales = [];
    o.traverse(m => {
      if (m.isMesh) this.materiales.push([ m, m.material ]);
    });
    this.mx = new THREE.AnimationMixer(o);
    this.crearEstela();
    this.listo = true;
    this.tocar(MOT.QUIETO);
    return this;
  }
  activar(si = true) {
    if (!this.listo) return;
    this.activo = !!si;
    this.obj.visible = this.activo;
    const J = this.juego();
    if (this.activo && J && J._ninjaJ !== this) {
      const orig = J._dañoSnakeOrig || J.dañoSnake.bind(J), sig = J._sigiloOrig || J.sigilo.bind(J);
      J._dañoSnakeOrig = orig;
      J._sigiloOrig = sig;
      J._ninjaJ = this;
      J.dañoSnake = (d, aMode = 1, fuerza = null, punto = null) => {
        const nj = J._ninjaJ;
        if (!nj?.activo) return orig(d, aMode, fuerza, punto);
        if (aMode === 1 && nj.paraBala(punto)) return true;
        const ok = orig(d, aMode, fuerza, punto);
        if (ok) nj.recibir(aMode);
        return ok;
      };
      J.sigilo = () => J._ninjaJ?.activo && J._ninjaJ.kogaku || sig();
    }
    if (!this.activo) {
      this.ponerKogaku(false);
      this.limpiarFx();
    }
    this.estado = "quieto";
    this.t = 0;
    this.muerto = false;
    this.tocar(MOT.QUIETO);
  }
  destruir() {
    this.activar(false);
    const J = this.juego();
    if (J?._ninjaJ === this) J._ninjaJ = null;
    this.obj?.removeFromParent();
    this.rastro?.removeFromParent();
    this.rastro?.geometry.dispose();
    this.mx?.stopAllAction();
    this.listo = false;
  }
  boton(b, abajo) {
    if (!(b in this.pad)) return;
    if (abajo) {
      if (!this.pad[b]) this.pulsados.add(b);
      this.pad[b] = true;
      this.soltarLuego.delete(b);
    } else if (this.pulsados.has(b)) this.soltarLuego.add(b); else this.pad[b] = false;
  }
  control(quiereMover) {
    this.mueve = !!quiereMover;
    const libre = [ "quieto", "correr", "guardiaCorre", "tajoCorre" ].includes(this.estado) && !this.muerto;
    return {
      bloqueado: !libre,
      vel: VEL_CORRER
    };
  }
  tomarRumbo() {
    const r = this.rumboPedido;
    this.rumboPedido = null;
    return r ?? null;
  }
  tomarEmpuje() {
    if (!this.hayEmpuje) return null;
    const e = {
      x: this.empuje.x,
      z: this.empuje.z
    };
    this.empuje.x = this.empuje.z = 0;
    this.hayEmpuje = false;
    return e;
  }
  get guardando() {
    return this.estado === "guardia" || this.estado === "guardiaCorre";
  }
  get vel() {
    return VEL_CORRER;
  }
  tocar(n, {una: una = false, fundido: fundido = 4, reiniciar: reiniciar = false, nombre: nombre = null} = {}) {
    const k = nombre || "anim " + n;
    if (this.actual?.k === k && !reiniciar) return this.actual.a;
    if (!this.acciones[k]) {
      const c = clipAnim(this.datos, k, this.raizBase);
      if (!c) return null;
      this.acciones[k] = this.mx.clipAction(c);
    }
    const a = this.acciones[k];
    a.reset();
    a.setLoop(una ? THREE.LoopOnce : THREE.LoopRepeat);
    a.clampWhenFinished = una;
    a.timeScale = 1;
    a.play();
    if (this.actual && this.actual.a !== a) this.actual.a.crossFadeTo(a, (fundido + 1) / 30, false);
    this.actual = {
      k: k,
      a: a,
      n: n,
      una: una
    };
    return a;
  }
  cuadroAnim() {
    const a = this.actual?.a;
    return a ? Math.floor(a.time * 30 + 1e-4) : 0;
  }
  terminoAnim() {
    const a = this.actual?.a;
    if (!a) return true;
    const c = this.datos.clips[this.actual.k];
    return !a.isRunning() || this.actual.una && a.time * 30 >= (c?.cuadros || 1) - 1;
  }
  tocarTorso(n, una = true) {
    if (n == null) {
      this.torsoActual = null;
    } else {
      const k = "anim " + n;
      if (!this.torso[k]) {
        const c = clipAnim(this.datos, k, this.raizBase);
        if (!c) return;
        c.tracks = c.tracks.filter(t => TORSO.test(t.name));
        c.name = k + " (torso)";
        this.torso[k] = this.mx.clipAction(c);
      }
      const a = this.torso[k];
      a.reset();
      a.setLoop(una ? THREE.LoopOnce : THREE.LoopRepeat);
      a.clampWhenFinished = una;
      a.play();
      a.setEffectiveWeight(50);
      this.torsoActual = k;
    }
    for (const [k, a] of Object.entries(this.torso)) if (k !== this.torsoActual) {
      a.stop();
      a.setEffectiveWeight(0);
    }
  }
  tocarTorsoDe(datos, n, una = true) {
    if (!datos) return this.tocarTorso(null);
    const k = "otro " + n;
    if (!this.torso[k]) {
      const c = clipAnim(datos, "anim " + n, this.raizBase);
      if (!c) return this.tocarTorso(null);
      c.tracks = c.tracks.filter(t => TORSO.test(t.name));
      c.name = k + " (torso)";
      this.torso[k] = this.mx.clipAction(c);
    }
    const a = this.torso[k];
    a.reset();
    a.setLoop(una ? THREE.LoopOnce : THREE.LoopRepeat);
    a.clampWhenFinished = una;
    a.play();
    a.setEffectiveWeight(50);
    this.torsoActual = k;
    for (const [j, b] of Object.entries(this.torso)) if (j !== k) {
      b.stop();
      b.setEffectiveWeight(0);
    }
  }
  pasoAnim() {
    const c = this.datos.clips[this.actual?.k];
    if (!c?.paso) return 0;
    const f = Math.min(c.cuadros - 1, this.cuadroAnim());
    return Math.hypot(c.paso[f * 2] || 0, c.paso[f * 2 + 1] || 0) * Math.sign(c.paso[f * 2 + 1] || 1);
  }
  empujar(mm) {
    const s = mm * MM;
    this.empuje.x += -Math.sin(this.yaw) * s;
    this.empuje.z += -Math.cos(this.yaw) * s;
    this.hayEmpuje = true;
  }
  cambiar(e) {
    if (e !== "estocada") this.rumboPedido = null;
    this.estado = e;
    this.t = 0;
    this.golpeados = new Set;
    this.aterrizo = false;
    this.estela = false;
    this.log("estado");
  }
  leerBotones() {
    const P = this.pad, ap = b => this.pulsados.has(b);
    if (P.circulo) {
      this.cambiar(this.mueve ? "guardiaCorre" : "guardia");
      return true;
    }
    if (ap("cruz")) {
      this.cambiar("voltereta");
      return true;
    }
    if (ap("cuadrado")) {
      this.cambiar(this.mueve ? "tajoCarrera" : "estocada");
      return true;
    }
    if (ap("r1")) {
      this.cambiar("descarga");
      return true;
    }
    if (this.escenarios && (P.r2 || ap("r2")) && this.esperaRayo <= 0) {
      this.cambiar("rayo");
      return true;
    }
    return false;
  }
  tick() {
    const J = this.juego();
    if (this.pulsados.has("l1") && !this.muerto) {
      this.ponerKogaku(!this.kogaku);
      this.se(SE.KOGAKU);
    }
    if (this.kogaku) this.gastarVida();
    if (this.esperaRayo > 0) this.esperaRayo--;
    if (this.prestado) {
      if (this.estado !== "quieto") this.cambiar("quieto");
      this.desvio = null;
      this.objetivo = null;
      this.estela = false;
      return;
    }
    if (this.muerto) {
      this.tocar(MOT.MUERTE, {
        una: true
      });
      this.estela = false;
      return;
    }
    if (this.forzado) return;
    switch (this.estado) {
     case "quieto":
     case "correr":
      {
        if (this.pared) {
          this.tocar(this.mueve ? this.pared.lado < 0 ? MOT.PARED_I : MOT.PARED_D : MOT.PARED);
          this.tocarTorso(null);
          break;
        }
        if (this.leerBotones()) return this.tick2();
        this.estado = this.mueve ? "correr" : "quieto";
        this.t++;
        this.tocar(this.mueve ? MOT.CORRER : MOT.QUIETO);
        this.tocarTorso(null);
        if (this.mueve) {
          const f = this.cuadroAnim();
          if (f !== this.fPaso) {
            if (f === 0) this.se(SE.PASO1); else if (f === 10) this.se(SE.PASO2);
            this.fPaso = f;
          }
        }
        break;
      }

     default:
      return this.tick2();
    }
  }
  tick2() {
    const t = this.t++, P = this.pad;
    switch (this.estado) {
     case "guardia":
      {
        if (t === 0) {
          this.tocar(MOT.GUARDIA);
          this.tocarTorso(null);
          this.tMueve = 0;
        }
        this.estela = true;
        if (this.desvio) {
          if (this.desvio.t++ === 0) this.tocar(MOT.DESVIA + this.desvio.i, {
            una: true,
            fundido: 0,
            reiniciar: true
          }); else if (this.terminoAnim()) {
            this.desvio = null;
            this.tocar(MOT.GUARDIA);
          }
        }
        if (!P.circulo) {
          this.desvio = null;
          this.cambiar("tajo");
          return this.tick2();
        }
        if (this.mueve) {
          if (++this.tMueve > 2) {
            this.desvio = null;
            this.cambiar("guardiaCorre");
          }
        } else this.tMueve = 0;
        break;
      }

     case "guardiaCorre":
      {
        if (t === 0) {
          this.tocar(MOT.GUARDIA_CORRE);
          this.tocarTorso(null);
        }
        this.estela = true;
        if (this.desvio) {
          if (this.desvio.t++ === 0) this.tocarTorso(MOT.DESVIA + this.desvio.i); else if (this.desvio.t > 17) {
            this.desvio = null;
            this.tocarTorso(null);
          }
        }
        if (!P.circulo) {
          this.desvio = null;
          this.tocarTorso(null);
          this.cambiar("tajoCorre");
          return this.tick2();
        }
        if (!this.mueve) {
          this.desvio = null;
          this.tocarTorso(null);
          this.cambiar("guardia");
        }
        break;
      }

     case "tajo":
      {
        if (t === 0) {
          this.tocar(MOT.TAJO, {
            una: true,
            fundido: 4,
            reiniciar: true
          });
          this.tocarTorso(null);
        }
        this.estela = true;
        const f = this.cuadroAnim();
        if ((f === 3 || f === 14) && f !== this.fSe) this.se(SE.ZUMBIDO);
        this.fSe = f;
        if (t > 2) this.atacar("tajo");
        this.empujar(this.pasoAnim());
        if (this.terminoAnim()) this.cambiar("quieto");
        break;
      }

     case "tajoCorre":
      {
        if (t === 0) {
          this.tocar(MOT.CORRER);
          this.tocarTorso(MOT.TAJO_TORSO);
        }
        if (!this.mueve && this.actual?.n !== MOT.TAJO) {
          this.tocarTorso(null);
          this.tocar(MOT.TAJO, {
            una: true,
            reiniciar: true
          });
          this.actual.a.time = Math.min(t, 20) / 30;
        }
        this.estela = t >= 5 && t < 20;
        if (t === 3 || t === 14) this.se(SE.ZUMBIDO);
        this.atacar("corre");
        if (t >= 23) {
          this.tocarTorso(null);
          this.cambiar(this.mueve ? "correr" : "quieto");
        }
        break;
      }

     case "tajoCarrera":
      {
        if (t === 0) {
          this.tocar(MOT.TAJO_CARRERA, {
            una: true,
            fundido: 4,
            reiniciar: true
          });
          this.tocarTorso(null);
          this.fSe = -1;
        }
        this.estela = t >= 5 && t < 16;
        const f = this.cuadroAnim();
        if (f === 3 && this.fSe !== 3) this.se(SE.ZUMBIDO);
        this.fSe = f;
        this.empujar(this.pasoAnim() + (t < 10 ? 96 : 0));
        if (t > 2) this.atacar("carrera");
        if (t === 10) this.se(SE.ATERRIZA);
        if (this.terminoAnim() || f > 15 && this.mueve) this.cambiar(this.mueve ? "correr" : "quieto");
        break;
      }

     case "estocada":
      {
        if (t === 0) {
          this.objetivo = this.buscarCerca(.8);
          if (this.objetivo) {
            const g = this.objetivo, d = g.o.position.clone().sub(this.pos);
            d.y = 0;
            const L = d.length();
            const fin = L > .35 ? d.multiplyScalar((L - .35) / L) : d.set(0, 0, 0);
            this.lunge = {
              x: fin.x / 4,
              z: fin.z / 4
            };
            this.yaw = Math.atan2(-(g.o.position.x - this.pos.x), -(g.o.position.z - this.pos.z));
            this.rumboPedido = this.yaw;
            this.tocar(MOT.ESTOCADA, {
              una: true,
              reiniciar: true
            });
            this.tocarTorso(null);
            this.juego()?.dañar?.(g, 0, 3);
          } else this.tocar(MOT.GUARDIA);
        }
        if (t < 4 && this.lunge) {
          this.empuje.x += this.lunge.x;
          this.empuje.z += this.lunge.z;
          this.hayEmpuje = true;
        }
        if (!this.objetivo) {
          if (t >= 4) this.cambiar("quieto");
          break;
        }
        const f = this.cuadroAnim();
        this.estela = f >= 19 && f < 22;
        if (f >= 22 && !this.golpeados.has("estocada")) {
          this.golpeados.add("estocada");
          this.se(SE.ESTOCADA);
          const J = this.juego(), g = this.objetivo;
          if (J && g) J.dañar(g, 9999, 1);
          this.log("estocada", {
            g: g?.nombre
          });
        }
        if (this.terminoAnim()) {
          this.objetivo = null;
          this.lunge = null;
          this.cambiar("quieto");
        }
        break;
      }

     case "voltereta":
      {
        if (t === 0) {
          this.tocar(MOT.VOLTERETA, {
            una: true,
            fundido: 2,
            reiniciar: true
          });
          this.tocarTorso(null);
          this.se(SE.VOLTERETA);
        }
        if (t < 12) this.empujar(96 + Math.max(0, this.pasoAnim())); else if (!this.aterrizo) {
          this.aterrizo = true;
          this.se(SE.ATERRIZA);
          const c = this.pos.clone();
          c.y += .02;
          this.golpearCaja(c, [ .35, .15, .35 ], {
            vital: 256
          });
          this.golpearCaja(c, [ .5, .15, .5 ], {
            faint: 5
          });
          this.onda(c);
          this.ctx.vibrar?.(6);
        }
        if (this.terminoAnim()) this.cambiar("quieto");
        break;
      }

     case "descarga":
      {
        if (t === 0) {
          this.tocar(MOT.DESCARGA);
          this.tocarTorso(null);
          this.se(SE.DESCARGA);
        }
        if (t % 10 === 0) this.se(SE.CHISPA);
        if (t > 0 && t % 32 === 0) this.se(SE.DESCARGA);
        const c = this.pos.clone();
        c.y += .2;
        this.golpearCaja(c, [ .75, .2 + .7, .75 ], {
          vital: 256
        });
        this.golpearCaja(c, [ 1.5, .2 + .7, 1.5 ], {
          faint: 5
        });
        this.arcos(t);
        this.gastarVida();
        if (!P.r1) this.cambiar("quieto");
        break;
      }

     case "rayo":
      {
        if (t === 0) {
          this.tocarTorsoDe(this.datosRayo, RAYO.pose.n, false);
          this.tocar(MOT.QUIETO);
          this.rumboPedido = this.ctx.rumboMira?.() ?? null;
          if (this.rumboPedido != null) this.yaw = this.rumboPedido;
          this.cargaRayo();
        }
        if (this.rumboPedido != null) {
          const r = this.ctx.rumboMira?.();
          if (r != null) this.yaw = this.rumboPedido = r;
        }
        if (t === RAYO.carga) this.dispararRayo();
        if (t >= RAYO.carga + RAYO.haz) {
          this.tocarTorso(null);
          this.esperaRayo = RAYO.espera;
          this.cambiar(this.mueve ? "correr" : "quieto");
        }
        break;
      }

     case "daño":
     case "dañoFuerte":
      {
        if (t === 0) {
          this.tocar(this.estado === "daño" ? MOT.DAÑO : MOT.DAÑO_FUERTE, {
            una: true,
            fundido: 1,
            reiniciar: true
          });
          this.tocarTorso(null);
          this.se(SE.DAÑO);
        }
        if (this.estado === "dañoFuerte") this.empujar(this.pasoAnim());
        if (this.terminoAnim()) this.cambiar("quieto");
        break;
      }
    }
  }
  gastarVida() {
    const inv = this.ctx.inventario?.();
    if (!inv?.getVida) return;
    inv.setVida(inv.getVida() - 1);
  }
  recibir(aMode) {
    if (this.muerto) return;
    const J = this.juego(), S = J?.sn, leve = LEVE.has(aMode);
    if (S?.reac) S.reac = {
      tipo: "sacudon",
      t: 0,
      dur: leve ? 20 : 30,
      k: 0,
      ninja: true
    };
    this.desvio = null;
    this.objetivo = null;
    this.cambiar(leve ? "daño" : "dañoFuerte");
  }
  paraBala(punto) {
    if (!this.guardando || this.muerto) return false;
    const fr = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    if (punto) {
      const d = punto.clone().sub(this.pos);
      d.y = 0;
      if (d.lengthSq() > 1e-6 && d.normalize().dot(fr) < .34) return false;
    }
    this.desvios = (this.desvios + 1) % 3;
    this.desvio = {
      i: this.desvios,
      t: 0
    };
    this.se(SE.DESVIA);
    const p = this.pos.clone().addScaledVector(fr, .45);
    p.y += 1.1;
    this.chispas(p, 16777215, 6);
    this.log("desvía");
    return true;
  }
  get seVe() {
    return !!this.obj?.visible && !this.oculto;
  }
  ocultar(si) {
    si = !!si;
    if (!!this.oculto === si && this._ocultoMat === this.kogaku) return;
    this.oculto = si;
    this._ocultoMat = this.kogaku;
    this.obj?.traverse(m => {
      if (!m.isMesh) return;
      const mt = m.material;
      if (si) {
        if (mt.userData.dw0 === undefined) mt.userData.dw0 = mt.depthWrite;
        mt.colorWrite = false;
        mt.depthWrite = false;
      } else {
        mt.colorWrite = true;
        if (mt.userData.dw0 !== undefined) {
          mt.depthWrite = mt.userData.dw0;
          delete mt.userData.dw0;
        }
      }
    });
  }
  ponerKogaku(si) {
    if (this.kogaku === !!si) return;
    this.kogaku = !!si;
    this.log(si ? "camuflaje" : "sin camuflaje");
    if (this.obj) this.obj.userData.kogakuRaiz = true;
    const k = materialKogaku(TINTE.snake), estaba = !!this.oculto;
    if (estaba) this.ocultar(false);
    for (const [m, mat] of this.materiales || []) {
      m.material = si ? k : mat;
      m.castShadow = !si;
    }
    if (estaba) this.ocultar(true);
  }
  atacar(cual) {
    const h4 = this.huesos[4];
    if (!h4) return;
    const [p, q] = HOJA[cual].map(v => new THREE.Vector3(v[0] * MM, v[1] * MM, v[2] * MM).applyMatrix4(h4.matrixWorld));
    const J = this.juego();
    for (const g of J?.activos?.() || []) {
      if (this.golpeados.has(g) || [ "muerto", "cuelloRoto" ].includes(g.accion)) continue;
      const pie = g.o.position, esc = g.escala || 1, cab = _v.set(pie.x, pie.y + 1.7 * esc, pie.z).clone(), pi = new THREE.Vector3(pie.x, pie.y + .15, pie.z);
      const dHoja = distSeg(p, q, pi, cab), dCuerpo = Math.hypot(pie.x - this.pos.x, pie.z - this.pos.z);
      if (dHoja <= .3 * esc + .1 || dCuerpo <= .6) {
        this.golpeados.add(g);
        this.dañarComoNinja(g, 256, 1, "espada");
        this.log("tajo", {
          g: g.nombre ?? g.__jefe?.actor?.tipo,
          cual: cual
        });
      }
    }
    const ray = new THREE.Ray, caja = new THREE.Box3, dq = q.clone().sub(p), Lh = dq.length(), w = new THREE.Vector3;
    if (Lh > 1e-6) for (const x of this.blancosJefes()) {
      const k = x.tipo === "caja" ? "c" + x.id + (x.j.actor?.nombre ?? "") : "g" + x.i + x.b.nombre;
      if (this.golpeados.has(k)) continue;
      caja.set(x.min.clone().subScalar(.1), x.max.clone().addScalar(.1));
      ray.set(p, dq.clone().divideScalar(Lh));
      const dentro = caja.containsPoint(p) || caja.containsPoint(q) || ray.intersectBox(caja, w) && w.distanceTo(p) <= Lh;
      if (!dentro) continue;
      this.golpeados.add(k);
      const quien = this.pegarJefe(x, caja.containsPoint(q) ? q : w, 256, "espada");
      this.log("tajo", {
        g: quien,
        cual: cual
      });
    }
    for (const b of this.ctx.blancos?.() || []) {
      if (this.golpeados.has(b.id ?? b)) continue;
      const c = b.p, r = b.radio ?? .3, d = distSeg(p, q, c, c);
      if (d <= r + .1 || Math.hypot(c.x - this.pos.x, c.z - this.pos.z) <= .6 && Math.abs(c.y - this.pos.y - .9) < .9) {
        this.golpeados.add(b.id ?? b);
        b.golpe(256);
        this.log("blanco", {
          cual: cual
        });
      }
    }
  }
  golpearCaja(c, mitad, {vital: vital = 0, faint: faint = 0} = {}) {
    const J = this.juego(), dentro = (x, y, z, r, alto) => Math.abs(x - c.x) <= mitad[0] + r && Math.abs(z - c.z) <= mitad[2] + r && y + alto >= c.y - mitad[1] && y <= c.y + mitad[1];
    for (const g of J?.activos?.() || []) {
      if ([ "muerto", "cuelloRoto" ].includes(g.accion)) continue;
      const k = (vital ? "v" : "f") + (g.nombre || "");
      if (this.golpeados.has(k)) continue;
      const p = g.o.position, esc = g.escala || 1;
      if (!dentro(p.x, p.y, p.z, .3 * esc, 1.8 * esc)) continue;
      this.golpeados.add(k);
      if (vital) J.dañar(g, vital, 1); else if (faint && ![ "cae", "piso", "soltado", "sacudon" ].includes(g.accion)) J.dañar(g, 9999, 3);
    }
    if (vital) for (const b of this.ctx.blancos?.() || []) {
      const p = b.p, r = b.radio ?? .3;
      if (!this.golpeados.has(b.id ?? b) && dentro(p.x, p.y - r, p.z, r, 2 * r)) {
        this.golpeados.add(b.id ?? b);
        b.golpe(vital);
      }
    }
  }
  buscarCerca(r) {
    let mejor = null, dm = Infinity;
    for (const g of this.juego()?.activos?.() || []) {
      if ([ "muerto", "cuelloRoto", "cae", "piso" ].includes(g.accion)) continue;
      const p = g.o.position, d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      if (d <= r * (g.escala || 1) && Math.abs(p.y - this.pos.y) < 1.2 && d < dm) {
        dm = d;
        mejor = g;
      }
    }
    return mejor;
  }
  animar(dt, {pos: pos, yaw: yaw, vel: vel = 0, pared: pared = null, muerte: muerte = false, forzado: forzado = null, visible: visible = true, prestado: prestado = null, sombra: sombra = false} = {}) {
    if (!this.activo || !this.listo) return;
    this.pos.copy(pos);
    this.pared = prestado ? null : pared;
    if (!!prestado !== this.prestado) {
      this.prestado = !!prestado;
      this.log(prestado ? "pose de Snake" : "pose propia");
      if (prestado) this.tocarTorso(null); else {
        this.mx.stopAllAction();
        this.actual = null;
        this.torsoActual = null;
        this.tocar(MOT.QUIETO);
      }
    }
    if (this.rumboPedido == null) this.yaw = yaw;
    if (muerte && !this.muerto) {
      this.muerto = true;
      this.ponerKogaku(false);
      this.cambiar("muerte");
      this.tocar(MOT.MUERTE, {
        una: true,
        reiniciar: true
      });
    }
    if (!muerte && this.muerto) {
      this.muerto = false;
      this.cambiar("quieto");
    }
    const fz = forzado ? /(\d+)$/.exec(forzado) : null;
    if (fz && !this.muerto) {
      const k = "o " + fz[1];
      if (this.forzado !== k) {
        this.forzado = k;
        if (this.datos.clips[k]) this.tocar(0, {
          nombre: k,
          una: true,
          reiniciar: true
        });
        if (+fz[1] === 0) this.se(SE.ENTRADA);
      }
    } else if (this.forzado) {
      this.forzado = null;
      this.tocar(MOT.QUIETO);
    }
    this.acum += dt;
    let n = 0;
    while (this.acum >= 1 / 30 && n++ < 4) {
      this.acum -= 1 / 30;
      this.tick();
      for (const b of this.soltarLuego) this.pad[b] = false;
      this.soltarLuego.clear();
      this.pulsados.clear();
    }
    if (this.acum > 1 / 30) this.acum = 0;
    const o = this.obj;
    o.position.copy(pos);
    o.rotation.y = this.yaw + Math.PI;
    o.visible = visible || sombra;
    this.ocultar(!visible && sombra);
    const a = this.actual?.a;
    if (a && !this.actual.una && (this.actual.n === MOT.CORRER || this.actual.n === MOT.GUARDIA_CORRE)) a.timeScale = Math.max(.3, Math.min(1.6, vel / VEL_CORRER)); else if (a) a.timeScale = 1;
    if (this._brazoQ) {
      this.huesos[RAYO.hueso]?.parent?.quaternion.copy(this._brazoQ);
      this._brazoQ = null;
    }
    if (prestado) this.copiarPose(prestado); else this.mx.update(dt);
    if (this.cara && this.huesos[6]) this.cara.quaternion.copy(this.huesos[6].quaternion);
    o.updateMatrixWorld(true);
    this.apuntarBrazo();
    this.dibujarEstela(visible);
    for (const e of this.fx.slice()) {
      e.t += dt;
      e.fn(e.t);
      if (e.t >= e.dur) {
        e.fin?.();
        this.fx.splice(this.fx.indexOf(e), 1);
      }
    }
  }
  copiarPose(fuente) {
    const H = fuente.userData.huesosNinja ||= Array.from({
      length: 16
    }, (_, i) => fuente.getObjectByName("hueso_" + i));
    for (let i = 0; i < 16; i++) {
      const a = H[i], b = this.huesos[i];
      if (a && b) b.quaternion.copy(a.quaternion);
    }
    if (H[0] && this.huesos[0]) this.huesos[0].position.set(this.raizBase[0], H[0].position.y, this.raizBase[2]);
  }
  matrizBoca(m = new THREE.Matrix4) {
    const h = this.huesos[RAYO.hueso];
    if (!h) return null;
    h.updateWorldMatrix(true, false);
    return m.copy(h.matrixWorld).multiply(_rotX90).multiply((new THREE.Matrix4).makeTranslation(0, 0, RAYO.boca));
  }
  apuntarBrazo() {
    const b = this.huesos[RAYO.hueso]?.parent;
    this.errorBrazo = null;
    if (!RAYO.brazo || this.estado !== "rayo" || !this.seVe || this.prestado || !b?.parent) {
      this.objetivoBrazo = null;
      return;
    }
    const m = this.ctx.mira?.();
    if (!m) return;
    const d = m.d.clone().normalize(), X = m.o.clone().addScaledVector(d, Math.min(30, this.impacto(m.o, d).lejos));
    const M0 = this.matrizBoca(_mB);
    if (!M0) return;
    _vP.setFromMatrixPosition(M0);
    if (_vT.subVectors(X, _vP).dot(d) < 1.5) X.copy(_vP).addScaledVector(d, 10);
    this.objetivoBrazo = X;
    this._brazoQ = b.quaternion.clone();
    for (let k = 0; k < 3; k++) {
      const M = this.matrizBoca(_mB);
      if (!M) break;
      _vP.setFromMatrixPosition(M);
      _vD.set(0, 0, 1).transformDirection(M);
      _vT.subVectors(X, _vP);
      if (_vT.lengthSq() < 1e-4) break;
      _vT.normalize();
      const ang = _vD.angleTo(_vT);
      if (ang < .002) break;
      if (ang > 2.4) {
        b.quaternion.copy(this._brazoQ);
        break;
      }
      _qA.setFromUnitVectors(_vD, _vT);
      b.getWorldQuaternion(_qB);
      b.parent.getWorldQuaternion(_qC);
      b.quaternion.copy(_qC.invert().multiply(_qA.multiply(_qB)));
      b.updateMatrixWorld(true);
    }
    const M = this.matrizBoca(_mB);
    if (M) {
      _vP.setFromMatrixPosition(M);
      _vD.set(0, 0, 1).transformDirection(M);
      this.errorBrazo = +(_vD.angleTo(_vT.subVectors(X, _vP).normalize()) * 180 / Math.PI).toFixed(2);
    }
  }
  impacto(o, d) {
    const J = this.juego();
    let lejos = this.ctx.paredRayo?.(o, d, RAYO.alcance) ?? RAYO.alcance, blanco = null, jefe = null;
    for (const g of J?.activos?.() || []) {
      if ([ "muerto", "cuelloRoto" ].includes(g.accion) || !g.o) continue;
      const p = g.o.position, h2 = d.x * d.x + d.z * d.z || 1e-6, t = ((p.x - o.x) * d.x + (p.z - o.z) * d.z) / h2;
      if (t <= 0) continue;
      const cx = o.x + d.x * t - p.x, cz = o.z + d.z * t - p.z, esc = g.escala || 1;
      if (cx * cx + cz * cz > (.33 * esc) ** 2) continue;
      const y = o.y + d.y * t - p.y, dist = t * Math.hypot(d.x, d.y, d.z), tope = [ "piso", "cae", "soltado" ].includes(g.accion) ? .5 : 1.85 * esc;
      if (y < -.1 || y > tope || dist >= lejos) continue;
      lejos = dist;
      blanco = g;
    }
    const ray = new THREE.Ray(o, d), q = new THREE.Vector3, caja = new THREE.Box3;
    for (const x of this.blancosJefes()) {
      caja.set(x.min, x.max);
      if (!ray.intersectBox(caja, q)) continue;
      const dist = caja.containsPoint(o) ? 0 : q.distanceTo(o);
      if (dist >= lejos) continue;
      lejos = dist;
      jefe = x;
      blanco = null;
    }
    return {
      lejos: lejos,
      blanco: blanco,
      jefe: jefe
    };
  }
  boca(v = new THREE.Vector3) {
    const M = this.matrizBoca();
    if (M && this.seVe) return v.setFromMatrixPosition(M);
    const bp = this.ctx.bocaPrimera?.();
    if (bp) return v.copy(bp);
    const m = this.ctx.mira?.();
    if (!m) return v.copy(this.pos);
    const d = m.d.clone().normalize(), der = new THREE.Vector3(-d.z, 0, d.x).normalize();
    return v.copy(m.o).add(new THREE.Vector3(0, -.3, 0)).addScaledVector(der, .18).addScaledVector(d, .7);
  }
  "dañarComoNinja"(g, cuanto, modo, arma) {
    const J = this.juego(), mgr = J?.__jefes;
    if (!J) return;
    if (mgr) mgr.golpeNinja = arma;
    try {
      J.dañar(g, cuanto, modo);
    } finally {
      if (mgr) mgr.golpeNinja = null;
    }
  }
  blancosJefes() {
    const mgr = this.juego()?.__jefes, out = [];
    if (!mgr) return out;
    for (const j of mgr.lista || []) {
      if (!j.vivo || !j.blanco || typeof j.cajasBlanco !== "function") continue;
      for (const c of j.cajasBlanco()) if (c.lado !== 1) out.push({
        tipo: "caja",
        j: j,
        id: c.id,
        min: new THREE.Vector3((c.c.x - c.s.x) * MM, (c.c.y - c.s.y) * MM, (c.c.z - c.s.z) * MM),
        max: new THREE.Vector3((c.c.x + c.s.x) * MM, (c.c.y + c.s.y) * MM, (c.c.z + c.s.z) * MM)
      });
    }
    for (const b of mgr.__apoyo3?.grandes || []) {
      if (!b.activo()) continue;
      b.blancos().forEach((t, i) => {
        if (!t.fijable && !t.tam) return;
        const h = (t.tam ? Math.max(...t.tam) : t.s) * MM;
        out.push({
          tipo: "grande",
          b: b,
          i: i,
          min: new THREE.Vector3(t.c.x * MM - h, t.c.y * MM - h, t.c.z * MM - h),
          max: new THREE.Vector3(t.c.x * MM + h, t.c.y * MM + h, t.c.z * MM + h)
        });
      });
    }
    return out;
  }
  pegarJefe(x, punto, cuanto, arma) {
    if (x.tipo === "caja") {
      x.j.cajaPegada = x.id;
      x.j.recibirGolpe(cuanto, 1, {
        ninja: arma
      });
      return x.j.actor?.tipo || "jefe";
    }
    const pmm = punto.clone().multiplyScalar(1e3);
    if (typeof x.b.golpeNinja === "function") x.b.golpeNinja(x.i, pmm, cuanto); else x.b.alPegar(x.i, pmm, 4);
    return x.b.nombre || "jefe";
  }
  dispararRayo() {
    const J = this.juego();
    let o, d;
    const M = RAYO.brazo && this.seVe && this.objetivoBrazo && this.errorBrazo != null && this.errorBrazo < 5 ? this.matrizBoca(new THREE.Matrix4) : null;
    if (M) {
      o = (new THREE.Vector3).setFromMatrixPosition(M);
      d = new THREE.Vector3(0, 0, 1).transformDirection(M);
    } else {
      const m = this.ctx.mira?.();
      if (!m) return;
      o = m.o.clone();
      d = m.d.clone().normalize();
    }
    const {lejos: lejos, blanco: blanco, jefe: jefe} = this.impacto(o, d);
    const fin = o.clone().addScaledVector(d, lejos);
    this.rayoPorBrazo = !!M;
    let quien = null;
    if (jefe) quien = this.pegarJefe(jefe, fin, RAYO.daño, "rayo"); else if (blanco) {
      this.dañarComoNinja(blanco, RAYO.daño, 1, "rayo");
      quien = blanco.nombre || (blanco.__jefe ? blanco.__jefe.actor?.tipo || "jefe" : "?");
    }
    this.log("rayo", quien ? {
      g: quien
    } : {});
    J?.setRuido?.(200, 2, o.clone());
    this.rayos++;
    this.ultimoRayo = {
      o: o.toArray().map(v => +v.toFixed(2)),
      fin: fin.toArray().map(v => +v.toFixed(2)),
      blanco: quien
    };
    this.se(RAYO.se);
    this.laserRayo(fin);
    this.chispas(fin, 12577023, 8);
    this.se(RAYO.seImpacto);
    this.ctx.destello?.(RAYO.destello);
    this.ctx.vibrar?.(4);
  }
  sprite(n, tam, color) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaRayo(n),
      color: color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }));
    s.scale.setScalar(tam);
    s.userData.sinColision = true;
    s.frustumCulled = false;
    this.ctx.mundo.add(s);
    return s;
  }
  cargaRayo() {
    const k = this.seVe ? 1 : .25, L = RAYO.largo * MM * k, n0 = RAYO.carga, parts = [];
    const nueva = () => ({
      p: new THREE.Vector3((Math.random() - .5) * L / 2, (Math.random() - .5) * L / 2, L + (Math.random() - .5) * L / 2),
      n: 5 + Math.floor(Math.random() * Math.max(1, n0 / 2))
    });
    for (let i = 0; i < 7; i++) parts.push({
      ...nueva(),
      s: this.sprite("blue_bonbori", L / 16 * 2, i & 1 ? RAYO.azul2 : RAYO.azul)
    });
    const brillo = this.sprite("blue_bonbori", L / 2, RAYO.brillo);
    const M = new THREE.Matrix4, v = new THREE.Vector3;
    let paso = 0;
    this.fx.push({
      t: 0,
      dur: n0 / 30,
      fn: t => {
        const f = Math.floor(t * 30);
        if (!this.matrizBoca(M)) return;
        while (paso < f) {
          paso++;
          for (const q of parts) {
            if (q.n <= 0) Object.assign(q, nueva()); else {
              q.p.x -= q.p.x / q.n;
              q.p.y -= q.p.y / q.n;
              q.p.z -= q.p.z / q.n;
              q.n--;
            }
          }
        }
        for (const q of parts) {
          q.s.position.copy(v.copy(q.p).applyMatrix4(M));
          q.s.visible = this.seVe;
        }
        this.boca(brillo.position);
        const k = 1 / Math.max(1, n0 - f);
        brillo.material.color.setHex(RAYO.brillo).multiplyScalar(k);
      },
      fin: () => {
        for (const q of parts) {
          q.s.removeFromParent();
          q.s.material.dispose();
        }
        brillo.removeFromParent();
        brillo.material.dispose();
      }
    });
  }
  laserRayo(fin) {
    const e = this.seVe ? 1 : .3, mats = [], g = new THREE.Group;
    g.userData.sinColision = true;
    this.ctx.mundo.add(g);
    let malla = null, lineas = null, anillo = 0, cuadros = 0;
    if (RAYO.fiel) {
      const geo = new THREE.BufferGeometry, pos = new Float32Array(72 * 3), uv = [], idx = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) uv.push(Math.trunc(r * 255 / 7) / 255, 1 - Math.trunc(c * 255 / 8) / 255);
      for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) {
        const k = r * 9 + c;
        idx.push(k, k + 9, k + 1, k + 9, k + 10, k + 1);
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const mat = new THREE.MeshBasicMaterial({
        map: texturaRayo("laser_rayo"),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      malla = new THREE.Mesh(geo, mat);
      malla.frustumCulled = false;
      malla.userData.sinColision = true;
      malla.visible = false;
      g.add(malla);
      mats.push(mat);
      lineas = Array.from({
        length: 8
      }, () => Array.from({
        length: 9
      }, () => new THREE.Vector3));
    } else {
      const ancho = .18 * e;
      for (const r of [ 0, Math.PI / 2 ]) {
        const geo = new THREE.PlaneGeometry(ancho, 1);
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, 0, .5);
        geo.rotateZ(r);
        const mat = new THREE.MeshBasicMaterial({
          map: texturaRayo("laser_rayo"),
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        const m = new THREE.Mesh(geo, mat);
        m.userData.sinColision = true;
        m.frustumCulled = false;
        g.add(m);
        mats.push(mat);
      }
    }
    const brilloBoca = this.sprite("laser_brillo", .6 * e, 16777215), glows = [ this.sprite("blue_bonbori", RAYO.largo * MM * e, RAYO.brillo), this.sprite("blue_bonbori", RAYO.largo * MM / 2 * e, 6250495), this.sprite("blue_bonbori", RAYO.largo * MM / 2 * e, 4145151) ];
    const desv = glows.map((_, i) => i ? new THREE.Vector3((Math.random() - .5) * .2, (Math.random() - .5) * .2, 0) : new THREE.Vector3);
    const a = new THREE.Vector3, dir = new THREE.Vector3, lejos = new THREE.Vector3, dur = (RAYO.haz + RAYO.despues) / 30;
    const linea = () => {
      this.boca(a);
      const L = Math.min(30, a.distanceTo(fin)), mi = this.ctx.mira?.();
      const MB = this.rayoPorBrazo && this.seVe && this.objetivoBrazo ? this.matrizBoca(_mB) : null;
      if (MB) dir.set(0, 0, 1).transformDirection(MB); else if (mi) {
        lejos.copy(mi.o).addScaledVector(mi.d.clone().normalize(), Math.min(30, mi.o.distanceTo(fin)));
        dir.subVectors(lejos, a).normalize();
      } else dir.subVectors(fin, a).normalize();
      lejos.copy(a).addScaledVector(dir, L);
      anillo = anillo + 7 & 7;
      const l = lineas[anillo];
      for (let k = 0; k < 9; k++) l[k].lerpVectors(lejos, a, k / 8);
      const P = malla.geometry.attributes.position.array;
      for (let r = 0; r < 8; r++) {
        const lr = lineas[anillo + r & 7];
        for (let c = 0; c < 9; c++) {
          const w = (r * 9 + c) * 3;
          P[w] = lr[c].x;
          P[w + 1] = lr[c].y;
          P[w + 2] = lr[c].z;
        }
      }
      malla.geometry.attributes.position.needsUpdate = true;
      cuadros++;
      malla.visible = cuadros > 8 && cuadros <= RAYO.haz;
    };
    if (RAYO.fiel) {
      this.boca(a);
      for (const l of lineas) for (const v of l) v.copy(a);
    }
    let paso = 0, estallido = false;
    this.fx.push({
      t: 0,
      dur: dur,
      fn: t => {
        const f = t * 30;
        this.boca(a);
        const vivo = f < RAYO.haz;
        brilloBoca.visible = vivo;
        if (RAYO.fiel) {
          while (paso < Math.min(Math.floor(f) + 1, RAYO.haz)) {
            paso++;
            linea();
          }
          if (!vivo) malla.visible = false;
        } else {
          g.visible = vivo;
          if (vivo) {
            const L = Math.max(.05, a.distanceTo(fin));
            g.position.copy(a);
            g.lookAt(fin);
            g.scale.set(1, 1, L);
            const k = 1 - f / RAYO.haz * .5;
            for (const m of mats) m.color.setScalar(k);
          }
        }
        if (vivo) brilloBoca.position.copy(a);
        if (RAYO.fiel && !estallido && f >= 20) {
          estallido = true;
          this.estallidoRayo(e, fin);
        }
        glows.forEach((s, i) => {
          s.position.copy(a).add(desv[i]);
          const k = (i === 0 ? 1 : i === 1 ? 95 / 127 : 63 / 127) / Math.max(1, f - 1);
          s.material.color.setHex(RAYO.brillo).multiplyScalar(Math.min(1, k));
          s.visible = f > 1 && f < RAYO.haz + RAYO.despues - [ 6, 10, 15 ][i];
        });
      },
      fin: () => {
        g.removeFromParent();
        for (const c of g.children) c.geometry.dispose();
        for (const m of mats) m.dispose();
        for (const s of [ brilloBoca, ...glows ]) {
          s.removeFromParent();
          s.material.dispose();
        }
      }
    });
  }
  estallidoRayo(e, fin) {
    let M = this.seVe ? this.matrizBoca(new THREE.Matrix4) : null;
    if (!M) {
      const a = this.boca(new THREE.Vector3);
      M = (new THREE.Matrix4).lookAt(fin, a, new THREE.Vector3(0, 1, 0));
      M.setPosition(a);
    }
    M.multiply(_rotX90).multiply((new THREE.Matrix4).makeScale(.5 * e, .5 * e, .5 * e));
    const randU = n => Math.floor(Math.random() * 32768) & n - 1, randS = n => (Math.floor(Math.random() * 32768) & 2 * n - 1) - n;
    const rot = (new THREE.Matrix3).setFromMatrix4(M), pos = new Float32Array(8 * 6 * 3), uvs = [], vel = [], verts = [];
    for (let i = 0; i < 8; i++) {
      const ang = randU(4096) * Math.PI * 2 / 4096, k = randU(256) + 64;
      const sx = Math.trunc(Math.round(Math.sin(ang) * 4096) / k), sz = Math.trunc(Math.round(Math.cos(ang) * 4096) / k);
      const r = [ randS(512), randS(512), randS(512) ];
      const loc = [ [ sx, k, sz ], [ sx + r[0], k + r[1], sz + r[2] ], [ sx - r[0], k - r[1], sz - r[2] ], [ sx * 4, k * 4, sz * 4 ] ];
      verts.push(loc.map(q => new THREE.Vector3(q[0] * MM, q[1] * MM, q[2] * MM).applyMatrix4(M)));
      vel.push(new THREE.Vector3(sx * MM, k * MM, sz * MM).applyMatrix3(rot));
      uvs.push(0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0);
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    const mat = new THREE.MeshBasicMaterial({
      map: texturaRayo("assets/actores/awa_3.png"),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    mat.color.setRGB(127 / 128, 255 / 128, 255 / 128);
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    m.userData.sinColision = true;
    this.ctx.mundo.add(m);
    const volcar = () => {
      for (let i = 0; i < 8; i++) {
        const v = verts[i], q = [ v[0], v[1], v[2], v[1], v[3], v[2] ];
        for (let j = 0; j < 6; j++) {
          const w = (i * 6 + j) * 3;
          pos[w] = q[j].x;
          pos[w + 1] = q[j].y;
          pos[w + 2] = q[j].z;
        }
      }
      geo.attributes.position.needsUpdate = true;
    };
    volcar();
    let n = 8, paso = 0;
    this.fx.push({
      t: 0,
      dur: 8 / 30,
      fn: t => {
        while (paso < Math.floor(t * 30)) {
          paso++;
          n--;
          if (n < 1) {
            m.visible = false;
            break;
          }
          for (let i = 0; i < 8; i++) for (const v of verts[i]) v.add(vel[i]);
          const c = (255 * n * 10 >> 8) / 128;
          mat.color.setRGB(c, c, c);
        }
        volcar();
      },
      fin: () => {
        m.removeFromParent();
        geo.dispose();
        mat.dispose();
      }
    });
  }
  crearEstela() {
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(8 * 6 * 3), 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(8 * 6 * 3), 3));
    this.rastro = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    this.rastro.frustumCulled = false;
    this.rastro.userData.sinColision = true;
    this.rastro.visible = false;
    this.ctx.mundo.add(this.rastro);
    this.hoja = [];
    for (let i = 0; i < 8; i++) this.hoja.push([ new THREE.Vector3, new THREE.Vector3 ]);
    this.hojaI = 0;
    this.hojaLista = false;
  }
  dibujarEstela(visible) {
    const h4 = this.huesos[4];
    if (!h4) return;
    const a = new THREE.Vector3(...ESTELA[0].map(v => v * MM)).applyMatrix4(h4.matrixWorld), b = new THREE.Vector3(...ESTELA[1].map(v => v * MM)).applyMatrix4(h4.matrixWorld);
    this.hojaI = (this.hojaI + 1) % 8;
    this.hoja[this.hojaI][0].copy(a);
    this.hoja[this.hojaI][1].copy(b);
    if (!this.hojaLista || !this.estela) {
      for (const p of this.hoja) {
        p[0].copy(a);
        p[1].copy(b);
      }
      this.hojaLista = true;
    }
    this.rastro.visible = visible && this.estela && !this.kogaku;
    if (!this.rastro.visible) return;
    const col = [ 55, 192, 155 ], P = this.rastro.geometry.attributes.position.array, C = this.rastro.geometry.attributes.color.array;
    for (let i = 0; i < 7; i++) {
      const c0 = this.hoja[(this.hojaI - i + 8) % 8], c1 = this.hoja[(this.hojaI - i - 1 + 8) % 8];
      const k0 = col.map(v => Math.max(0, v - i * 32) / 255), k1 = col.map(v => Math.max(0, v - (i + 1) * 32) / 255);
      const q = [ [ c0[0], k0 ], [ c0[1], [ 0, 0, 0 ] ], [ c1[0], k1 ], [ c0[1], [ 0, 0, 0 ] ], [ c1[1], [ 0, 0, 0 ] ], [ c1[0], k1 ] ];
      q.forEach(([p, c], j) => {
        const o = (i * 6 + j) * 3;
        P[o] = p.x;
        P[o + 1] = p.y;
        P[o + 2] = p.z;
        C[o] = c[0];
        C[o + 1] = c[1];
        C[o + 2] = c[2];
      });
    }
    this.rastro.geometry.attributes.position.needsUpdate = true;
    this.rastro.geometry.attributes.color.needsUpdate = true;
  }
  chispas(p, color = 16777215, n = 5) {
    const mat = new THREE.SpriteMaterial({
      map: texturaChispa(),
      color: color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    const sp = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(.08);
      s.position.copy(p);
      s.userData.sinColision = true;
      this.ctx.mundo.add(s);
      sp.push({
        s: s,
        v: new THREE.Vector3(Math.random() - .5, Math.random() * .8, Math.random() - .5).multiplyScalar(2.2)
      });
    }
    this.fx.push({
      t: 0,
      dur: .3,
      fn: t => {
        for (const q of sp) {
          q.s.position.addScaledVector(q.v, 1 / 60);
          q.s.material.opacity = 1 - t / .3;
        }
      },
      fin: () => {
        for (const q of sp) q.s.removeFromParent();
        mat.dispose();
      }
    });
  }
  onda(c) {
    const geo = new THREE.RingGeometry(.6, 1, 32);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 12577023,
      transparent: true,
      opacity: .6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    m.position.copy(c);
    m.userData.sinColision = true;
    this.ctx.mundo.add(m);
    this.fx.push({
      t: 0,
      dur: .33,
      fn: t => {
        const k = .2 + t / .33 * .4;
        m.scale.set(k, 1, k);
        m.material.opacity = .6 * (1 - t / .33);
      },
      fin: () => {
        m.removeFromParent();
        geo.dispose();
        m.material.dispose();
      }
    });
  }
  arcos(t) {
    if (t % 3 !== 0) return;
    const pares = [ [ 0, 6 ], [ 2, 4 ], [ 7, 9 ], [ 10, 12 ], [ 13, 15 ], [ 1, 5 ] ], [b1, b2] = pares[t / 3 % pares.length | 0];
    const h1 = this.huesos[b1], h2 = this.huesos[b2];
    if (!h1 || !h2) return;
    const arco = new ArcoPlasma(this.ctx.mundo, {
      color: 10475775
    });
    const act = () => arco.actualizar((new THREE.Vector3).setFromMatrixPosition(h1.matrixWorld), (new THREE.Vector3).setFromMatrixPosition(h2.matrixWorld));
    act();
    this.fx.push({
      t: 0,
      dur: .15,
      fn: act,
      fin: () => arco.quitar()
    });
    if (t % 6 === 0) {
      const p = this.pos.clone();
      const a = Math.random() * Math.PI * 2, d = .3 + Math.random() * .6;
      p.x += Math.sin(a) * d;
      p.z += Math.cos(a) * d;
      p.y += .05;
      this.chispas(p, 10475775, 4);
    }
  }
  limpiarFx() {
    for (const e of this.fx) e.fin?.();
    this.fx = [];
    if (this.rastro) this.rastro.visible = false;
  }
  info() {
    return {
      activo: this.activo,
      estado: this.estado,
      t: this.t,
      clip: this.actual?.k,
      torso: this.torsoActual,
      kogaku: this.kogaku,
      estela: this.estela,
      muerto: this.muerto,
      desvios: this.desvios,
      pad: {
        ...this.pad
      },
      escenarios: this.escenarios,
      prestado: this.prestado,
      rayos: this.rayos,
      ultimoRayo: this.ultimoRayo || null,
      registro: this.registro.slice(-30)
    };
  }
}
