// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Personaje, STATE, MM, ANG } from "./comun.js";

import { cargarModelo } from "../jefes/base.js";

const enCaja = (p, x0, x1, z0, z1) => p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1;

const enBaño = p => enCaja(p, 4e3, 9500, -20500, -9500);

const enEntrada = p => enCaja(p, 5500, 7e3, -9500, -8e3);

const adentro = p => enCaja(p, 4500, 8500, -20500, -15500);

const BAÑO = new THREE.Vector3(7500, 0, -2e4), SALIDA = new THREE.Vector3(4500, 0, -7500);

function animador(obj, datos, clipDe, mezcladores) {
  const raiz = obj.getObjectByName("hueso_0"), base = raiz ? raiz.position.toArray() : [ 0, 0, 0 ];
  const mx = new THREE.AnimationMixer(obj);
  mezcladores.push(mx);
  const acciones = {};
  let actual = null;
  return {
    mx: mx,
    tocar(nombre, {fundido: fundido = .25, loop: loop = true, offset: offset = 0} = {}) {
      if (actual?.nombre === nombre) return actual.accion;
      if (!acciones[nombre]) {
        const c = clipDe(datos, nombre, base);
        if (!c) return null;
        acciones[nombre] = mx.clipAction(c);
      }
      const a = acciones[nombre];
      a.reset();
      a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
      a.clampWhenFinished = !loop;
      a.time = offset;
      a.play();
      if (actual) actual.accion.crossFadeTo(a, fundido, false);
      actual = {
        nombre: nombre,
        accion: a
      };
      return a;
    },
    get actual() {
      return actual?.nombre;
    }
  };
}

export class Meryl7 extends Personaje {
  constructor(actor, mgr, sis) {
    super(actor, mgr, sis);
    this.nombre = "MERYL7";
    this.lado = "enemigo";
    this.g = null;
    this.registro = [];
    this.muerta = false;
    this.goTimer = 0;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 400) this.registro.shift();
  }
  mm(v) {
    return new THREE.Vector3(Math.round(v.x * 1e3), Math.round(v.y * 1e3), Math.round(v.z * 1e3));
  }
  async iniciar() {
    const J = this.J, ctx = this.ctx, a = this.actor, o0 = this.opts;
    const st = ctx.nivel?.id || "s07a";
    const w = ctx.nivel?.actores?.find(x => x.tipo === "WATCHER" && x.modelo);
    const [{clip: clip}] = await Promise.all([ import("../anim.js") ]);
    let o = null;
    for (const u of [ w?.modelo, `niveles/${st}/ippanhei.glb`, "niveles/s07a/ippanhei.glb" ].filter(Boolean)) {
      try {
        o = await cargarModelo(ctx, u);
        break;
      } catch {}
    }
    if (!o) throw new Error("sin modelo de soldado");
    try {
      const fa = await cargarModelo(ctx, "armas/famas.glb");
      o.getObjectByName("hueso_4")?.add(fa);
    } catch {}
    ctx.luzArma?.(o);
    const r = typeof o0.r?.[0] === "number" ? o0.r[0] : 0;
    const pts = this.ruta(r);
    const p0 = pts.length ? pts[0].p : new THREE.Vector3(...a.p || [ 0, 0, 0 ]);
    o.position.set(p0.x * MM, p0.y * MM, p0.z * MM);
    o.userData.guardia = a;
    (ctx.mundo || J.ctx.mundo).add(o);
    ctx.teñir?.(o);
    o.traverse(m => {
      if (m.isMesh && m.isSkinnedMesh) m.castShadow = true;
    });
    this.sis.mezcladores = this.sis.mezcladores || [];
    const an = animador(o, J.ctx.anims, clip, this.sis.mezcladores);
    an.tocar("parado", {
      offset: Math.random()
    });
    const g = {
      o: o,
      an: an,
      pts: pts.map(q => q.p.clone().multiplyScalar(MM)),
      puntosCmd: pts.map(q => q.cmd),
      i: 0,
      nombre: a.nombre,
      opts: o0,
      mapa: a.mapa,
      __meryl7: this,
      ruta: r
    };
    this.g = g;
    J.ctx.guardias.push(g);
    J.prepararGuardia(g);
    g.vital = typeof o0.l?.[0] === "number" ? o0.l[0] : 192;
    g.vitalMax = g.vital;
    g.faint = typeof o0.f?.[0] === "number" ? o0.f[0] : 10;
    g.faintMax = g.faint;
    this.voz = (o0.v || []).find(x => typeof x === "number") || 0;
    this.procE = this.procDe("e");
    this.inicio = p0.clone();
    if (this.voz) await this.sis.flujo.precargar([ this.voz ]);
    Meryl7.instalar(J);
    this.o = null;
    this.log("inicio", {
      ruta: r,
      puntos: pts.length,
      vida: g.vital,
      zona: g.zonaAsignada
    });
  }
  static instalar(J) {
    if (J.__pensarMeryl7) return;
    const p0 = J.pensar.bind(J);
    J.__pensarMeryl7 = true;
    J.pensar = g => g.__meryl7 && g.__meryl7.vivo ? g.__meryl7.pensar(g, p0) : p0(g);
  }
  pensar(g, p0) {
    const T = g.think, pos = this.mm(g.o.position);
    if (T.t1 === 3) {
      g.pad.dir = -1;
      g.pad.press = 0;
      T.c3++;
      this.baño(g, pos);
      return;
    }
    const t1 = T.t1, t2 = T.t2, t3 = T.t3;
    p0(g);
    if (t1 === 0 && t2 === 0 && T.t1 === 0 && T.t2 === 0) {
      if (t3 === 0 && T.t3 === 1 && enBaño(pos)) {
        this.entrar(g, 15, 39);
        g.pad.time = 0;
        this.log("se queda en el baño");
        return;
      }
      if (enBaño(pos)) {
        this.irAlBaño(g);
        g.pad.mode = 0;
        this.log("entra al baño");
      }
    }
  }
  entrar(g, t2, t3) {
    const T = g.think;
    T.t1 = 3;
    T.t2 = t2;
    T.t3 = t3;
    T.c3 = 0;
    T.cBaño = 0;
  }
  objetivoZona(p) {
    const z = this.J.zonaOCercana(new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM));
    return z >= 0 ? this.J.zonas[z].p.clone() : new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM);
  }
  "irAlBaño"(g) {
    this.entrar(g, 14, 37);
    g.think.objetivo = this.objetivoZona(BAÑO);
    g.pad.mode = 1;
  }
  "baño"(g, pos) {
    const T = g.think, J = this.J, sn = this.snake();
    switch (T.t2) {
     case 14:
      if (J.navegarA(g, T.objetivo)) {
        T.t2 = 15;
        g.pad.mode = 0;
        T.t3 = 39;
        T.c3 = 0;
        T.cBaño = 0;
        this.log("adentro");
      }
      if (T.t3 === 38 && g.alertLevel > 1) {
        T.c3 = 0;
        T.t2 = 7;
        T.t3 = 14;
      } else g.alertLevel = 0;
      return;

     case 15:
      {
        const c = T.cBaño || 0;
        if (enBaño(sn) || enEntrada(sn) || J.com.modo !== 0 || enBaño(this.inicio)) T.cBaño = 0;
        if (c > 180 || !adentro(pos)) {
          T.objetivo = this.objetivoZona(SALIDA);
          T.t2 = 16;
          T.t3 = 40;
          T.c3 = 0;
          g.pad.mode = 0;
          this.log("sale del baño");
        } else T.cBaño = (T.cBaño || 0) + 1;
        g.alertLevel = 0;
        return;
      }

     case 16:
      if (T.t3 === 40 && J.navegarA(g, T.objetivo)) {
        T.t1 = 0;
        T.t2 = 0;
        T.t3 = 0;
        T.c3 = 0;
        g.pad.mode = 0;
        T.nodo = g.nodos.length - 1;
        T.objetivo = this.inicio.clone().multiplyScalar(MM);
        this.log("patrulla");
        return;
      }
      if (enBaño(sn) || enEntrada(sn) || g.alertLevel > 1) {
        T.c3 = 0;
        T.t2 = 7;
        T.t3 = 14;
        return;
      }
      if (J.com.modo === 1) {
        this.irAlBaño(g);
        return;
      }
      g.alertLevel = 0;
      return;

     case 7:
      if (T.t3 === 14 || T.t3 === 17) {
        if (T.c3 === 1) J.ponerMarca(g, 0);
        if (T.c3 <= 20) {
          g.pad.press |= 32;
          return;
        }
        if (T.t3 === 14) {
          if (g.actStatus & 1) this.se(this.estadoSnake() & 4096 ? 193 : 181, this.mm(g.o.position));
          this.irAlBaño(g);
        } else {
          T.t1 = 1;
          T.t2 = 8;
          T.t3 = 19;
          T.c3 = 0;
          g.pad.mode = 1;
          J.gopointSnake();
        }
      } else if (T.t3 === 16) {
        if (T.c3 === 1) J.ponerMarca(g, 0);
        if (T.c3 > 20) {
          T.t1 = 1;
          T.t2 = 10;
          T.t3 = 29;
          T.c3 = 0;
          g.pad.mode = 1;
        }
      } else {
        T.t3 = 14;
        T.c3 = 0;
      }
      return;

     default:
      T.t1 = 0;
      T.t2 = 0;
      T.t3 = 0;
    }
  }
  cuadro() {
    const g = this.g;
    if (!g) return;
    if (!this.muerta && g.vital <= 0) {
      this.muerta = true;
      this.goTimer = -2;
      this.mgr.timerGO = -2;
      if (this.procE > 0) this.execProc(this.procE, []);
      this.sis.ponerEstado(STATE.PADRELEASE);
      if (this.sis.streamStatus() === -1 && this.voz) this.sis.voxStream(this.voz, 0);
      this.log("muerta");
    }
    if (this.muerta && this.goTimer === -2 && g.accion === "muerto" && this.sis.streamStatus() === -1) {
      this.goTimer = 1;
      this.log("game over");
      this.mgr.gameOver();
    }
  }
  dibujar() {}
  estadoPrueba() {
    const g = this.g, T = g?.think || {};
    return {
      pos: g ? [ Math.round(g.o.position.x * 1e3), Math.round(g.o.position.z * 1e3) ] : null,
      think: [ T.t1, T.t2, T.t3 ],
      c3: T.c3,
      "cBaño": T.cBaño,
      accion: g?.accion,
      vital: g?.vital,
      alerta: g?.alertLevel,
      ruta: g?.ruta,
      nodo: T.nodo,
      muerta: this.muerta,
      goTimer: this.goTimer,
      "enBaño": g ? enBaño(this.mm(g.o.position)) : null
    };
  }
  destruir() {
    this.vivo = false;
    const g = this.g;
    if (g) {
      g.o.removeFromParent();
      g.inactivo = true;
      g.borrado = true;
      const l = this.J.ctx.guardias, i = l.indexOf(g);
      if (i >= 0) l.splice(i, 1);
    }
    const i = this.sis.personajes.indexOf(this);
    if (i >= 0) this.sis.personajes.splice(i, 1);
  }
}
