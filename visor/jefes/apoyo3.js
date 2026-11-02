// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { MM, ANG, Flujo } from "./base.js";

import { sonido } from "../juego.js";

const WP_STINGER = 4;

const ALT_SNAKE = [ 1100, 496, 136 ];

const INVULN_SNAKE = 45;

export function strcode(s) {
  let i = 0;
  for (const c of (new TextEncoder).encode(s)) {
    i = (i << 5 | i >> 11) & 65535;
    i = i + c & 65535;
  }
  return i;
}

export const HASH = {
  KILL: 12835,
  BULLET_ON: strcode("bullet_on"),
  BULLET_OFF: strcode("bullet_off"),
  DESTROY: strcode("destroy"),
  CRASH: strcode("crash"),
  ROMPER: strcode("壊れろ")
};

let actual = null;

export function apoyo(mgr) {
  if (mgr.__apoyo3) return mgr.__apoyo3;
  const A = new Apoyo(mgr);
  mgr.__apoyo3 = A;
  actual = A;
  return A;
}

class Apoyo {
  constructor(mgr) {
    this.mgr = mgr;
    this.J = mgr.J;
    this.ctx = mgr.ctx;
    this.oyentes = [];
    this.camara = null;
    this.grandes = [];
    this.balas = [];
    this.fijado = null;
    this.registro = [];
    this.snakeDañado = -99;
    this.instalarGuion();
    this.instalarCamara();
    this.instalarArmas(this.ctx.armas);
    const destruir = mgr.destruir.bind(mgr);
    mgr.destruir = () => {
      this.destruir();
      destruir();
    };
    const cuadro = mgr.cuadro.bind(mgr);
    mgr.cuadro = () => {
      cuadro();
      this.cuadro();
    };
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 600) this.registro.shift();
  }
  get guion() {
    return this.ctx.guion || globalThis.__mgs?.guion || null;
  }
  instalarGuion() {
    const g = this.guion;
    if (!g?.op || g.op.__jefes3) return;
    const previo = g.op.mensaje;
    g.op.mensaje = (d, v, info) => {
      try {
        if (actual?.mensaje(d, v, info)) return true;
      } catch (e) {
        console.warn("[jefes3] mesg", e);
      }
      return previo ? previo.call(g.op, d, v, info) : false;
    };
    g.op.__jefes3 = true;
  }
  escuchar(nombre, fn) {
    const o = {
      nombre: nombre & 65535,
      fn: fn
    };
    this.oyentes.push(o);
    return () => {
      const i = this.oyentes.indexOf(o);
      if (i >= 0) this.oyentes.splice(i, 1);
    };
  }
  mensaje(dest, v) {
    let ok = false;
    for (const o of this.oyentes.slice()) if (o.nombre === (dest & 65535)) ok = o.fn(v) || ok;
    if (ok) this.log("mesg", {
      dest: "#" + (dest & 65535).toString(16),
      v: v[0]
    });
    return ok;
  }
  proc(actor, letra, args = []) {
    const g = this.guion;
    let ok = false;
    try {
      if (g && typeof g.eventoActor === "function" && (actor?._k ?? actor?.k) != null) ok = g.eventoActor(actor, letra, args); else ok = !!this.ctx.alProc?.(actor, letra);
    } catch (e) {
      console.warn("[jefes3] proc", letra, e);
    }
    this.log("proc", {
      letra: letra,
      ok: ok
    });
    return ok;
  }
  instalarCamara() {
    const J = this.J;
    if (J.__camara3) return;
    J.__camara3 = true;
    const update = J.update.bind(J);
    J.update = dt => {
      update(dt);
      actual?.aplicarCamara();
    };
  }
  aplicarCamara() {
    const c = this.camara, cam = this.J.ctx.cam, rig = this.J.ctx.rig;
    if (!c || !cam || !rig || this.ctx.camaraEscena === false) return;
    const R = globalThis.__mgs?.R;
    if (R?.xr?.isPresenting) return;
    rig.updateMatrixWorld();
    cam.position.copy(rig.worldToLocal(c.ojo.clone()));
    cam.lookAt(c.centro);
    if (c.fov && Math.abs(cam.fov - c.fov) > .01) {
      this.fovPrevio ??= cam.fov;
      cam.fov = c.fov;
      cam.updateProjectionMatrix();
    }
    const arma = globalThis.__mgs?.arma;
    if (arma && arma.visible) {
      arma.visible = false;
      this.armaOculta = arma;
    }
  }
  ponerCamara(ojo, centro, zoom = 320) {
    const fov = 2 * Math.atan(120 / zoom) * 180 / Math.PI;
    this.camara = {
      ojo: new THREE.Vector3(ojo.x * MM, ojo.y * MM, ojo.z * MM),
      centro: new THREE.Vector3(centro.x * MM, centro.y * MM, centro.z * MM),
      fov: fov
    };
  }
  soltarCamara() {
    if (!this.camara) return;
    this.camara = null;
    const cam = this.J.ctx.cam;
    if (cam && this.fovPrevio != null) {
      cam.fov = this.fovPrevio;
      cam.updateProjectionMatrix();
      this.fovPrevio = null;
    }
    if (this.armaOculta) {
      this.armaOculta.visible = true;
      this.armaOculta = null;
    }
  }
  posCamara() {
    const cam = this.J.ctx.cam;
    if (!cam) return this.snake();
    const p = new THREE.Vector3;
    cam.getWorldPosition(p);
    return p.multiplyScalar(1e3);
  }
  snake() {
    const r = this.J.ctx.rig.position, p = this.J.postura?.() ?? 0;
    return new THREE.Vector3(r.x * 1e3, r.y * 1e3 + ALT_SNAKE[p], r.z * 1e3);
  }
  snakeVivo() {
    return !this.J.muerto && this.J.activo !== false && !this.J.ctx.vuelo?.() && this.mgr.gameOverTimer() === 0;
  }
  "dañarSnake"(daño, tipo = "bala") {
    const J = this.J, inv = J.ctx.inventario;
    J.vida -= inv ? (tipo === "bala" ? inv.dañoBala(daño) : daño) / inv.vidaMax : daño / 256;
    J.ctx.daño?.();
    sonido("daño");
    this.snakeDañado = this.mgr.frame;
  }
  snakeInvencible() {
    return this.mgr.frame - this.snakeDañado <= INVULN_SNAKE;
  }
  vidaMaxSnake() {
    return this.J.ctx.inventario?.vidaMax || 256;
  }
  paredEntre(a, b, grupo = -1) {
    const d = b.clone().sub(a), L = d.length();
    if (L < 1) return false;
    const m = this.mallaParedes(grupo);
    const r = this.mgr.ray;
    r.set(a.clone().multiplyScalar(MM), d.normalize());
    r.far = L * MM;
    return r.intersectObject(m, false).length > 0;
  }
  mallaParedes(grupo = -1) {
    this.mallasP ??= new Map;
    if (this.mallasP.has(grupo)) return this.mallasP.get(grupo);
    const hz = this.J.ctx.hz, pos = [];
    if (hz) hz.grupos.forEach((g, gi) => {
      if (grupo >= 0 && gi !== grupo) return;
      for (const w of g.paredes) {
        const a = w.a, b = w.b, h = w.alto;
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], b[1] + h, b[2], a[0], a[1], a[2], b[0], b[1] + h, b[2], a[0], a[1] + h, a[2]);
      }
    });
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos.map(v => v * MM), 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    }));
    m.userData.sinColision = true;
    m.updateMatrixWorld(true);
    this.mallasP.set(grupo, m);
    return m;
  }
  instalarArmas(Ar) {
    if (!Ar || Ar.__jefes3) return;
    Ar.__jefes3 = true;
    const fij = Ar.actualizarFijado.bind(Ar), stg = Ar.cuadroStinger.bind(Ar), mina = Ar.dispararMina.bind(Ar), lanzar = Ar.lanzarStinger.bind(Ar);
    Ar.actualizarFijado = cam => {
      const r = fij(cam);
      return actual ? actual.fijarGrandes(Ar, cam, r) : r;
    };
    Ar.lanzarStinger = (o, d) => {
      const r = lanzar(o, d);
      if (r && actual?.fijado && Ar.misilS.length) Ar.misilS[Ar.misilS.length - 1].grande = actual.fijado.__grande;
      return r;
    };
    Ar.cuadroStinger = () => {
      const antes = Ar.misilS.map(m => m.p.clone());
      const lista = Ar.misilS.slice();
      stg();
      actual?.stingerGrandes(Ar, lista, antes);
    };
    Ar.dispararMina = m => {
      const mg = actual?.mgr;
      if (!mg) return mina(m);
      const prev = mg.explosionActual;
      mg.explosionActual = m.pos.clone();
      try {
        return mina(m);
      } finally {
        mg.explosionActual = prev;
      }
    };
  }
  agregarGrande(b) {
    b.ancla = new THREE.Object3D;
    b.ancla.name = "ancla_" + (b.nombre || "jefe");
    b.pseudo = {
      __grande: b,
      o: b.ancla,
      accion: "jefe",
      inactivo: false,
      think: {
        t1: 1
      },
      vital: 1
    };
    this.grandes.push(b);
    return b;
  }
  fijarGrandes(Ar, cam, elegido) {
    if (Ar.inv.arma !== WP_STINGER || !cam) {
      this.fijado = null;
      return elegido;
    }
    const s = Ar.posSnake(), v = new THREE.Vector3, w = new THREE.Vector3;
    let mejor = null, md = elegido ? elegido.o.position.distanceTo(s) * 1e3 : 6e4, mejorC = null;
    cam.updateMatrixWorld();
    for (const b of this.grandes) {
      if (!b.activo()) continue;
      for (const t of b.blancos()) {
        if (!t.fijable) continue;
        const add = Math.max(500, t.s * 3 / 5);
        v.set(t.c.x * MM, t.c.y * MM, t.c.z * MM);
        w.copy(v);
        w.y += add * MM;
        const d = v.distanceTo(s) * 1e3;
        if (d < 2401) continue;
        v.project(cam);
        w.project(cam);
        if (v.z > 1 || v.z < -1) continue;
        const sx = v.x * 160, sy = -v.y * 112, caja = sy - -w.y * 112;
        if (caja <= 0 || caja >= 225) continue;
        if (Math.abs(sx) < caja && Math.abs(sy) < caja && d < md) {
          md = d;
          mejor = b;
          mejorC = t.c;
        }
      }
    }
    if (!mejor) {
      if (this.fijado && Ar.fijado !== this.fijado) this.fijado = null;
      return elegido;
    }
    mejor.ancla.position.set(mejorC.x * MM, mejorC.y * MM - .9, mejorC.z * MM);
    if (Ar.fijado !== mejor.pseudo) {
      Ar.se?.(79);
      Ar.tFijado = 0;
    }
    Ar.fijado = mejor.pseudo;
    this.fijado = mejor.pseudo;
    return mejor.pseudo;
  }
  stingerGrandes(Ar, lista, antes) {
    for (const b of this.grandes) if (b.pseudo && b.activo()) {
      const c = b.blancos()[0]?.c;
      if (c) b.ancla.position.set(c.x * MM, c.y * MM - .9, c.z * MM);
    }
    lista.forEach((m, k) => {
      if (!Ar.misilS.includes(m)) return;
      const a = antes[k], p = m.p, caja = new THREE.Box3, seg = new THREE.Ray(a, p.clone().sub(a).normalize()), L = p.distanceTo(a), q = new THREE.Vector3;
      for (const b of this.grandes) {
        if (!b.activo()) continue;
        for (const [i, t] of b.blancos().entries()) {
          const h = t.s * MM;
          caja.min.set(t.c.x * MM - h, t.c.y * MM - h, t.c.z * MM - h);
          caja.max.set(t.c.x * MM + h, t.c.y * MM + h, t.c.z * MM + h);
          const dentro = caja.containsPoint(p) || L > 0 && seg.intersectBox(caja, q) && q.distanceTo(a) <= L + 1e-6;
          if (!dentro) continue;
          const punto = caja.containsPoint(p) ? p.clone() : q.clone();
          Ar.misilS.splice(Ar.misilS.indexOf(m), 1);
          m.obj?.removeFromParent();
          this.log("stinger", {
            blanco: b.nombre,
            i: i
          });
          b.alPegar(i, punto.clone().multiplyScalar(1e3), WP_STINGER);
          Ar.explosion(punto, 128);
          return;
        }
      }
    });
  }
  nikita() {
    const M = this.ctx.armas?.misil;
    return M && !M.perdido ? {
      p: M.p.clone().multiplyScalar(1e3)
    } : null;
  }
  stinger() {
    const S = this.ctx.armas?.misilS;
    return S?.length ? {
      p: S[0].p.clone().multiplyScalar(1e3)
    } : null;
  }
  derribarNikita() {
    const Ar = this.ctx.armas;
    if (Ar?.misil) {
      Ar.terminarNikita(true);
      this.log("nikita derribado");
    }
  }
  derribarStinger() {
    const Ar = this.ctx.armas, m = Ar?.misilS?.[0];
    if (!m) return;
    Ar.misilS.splice(0, 1);
    m.obj?.removeFromParent();
    Ar.explosion(m.p.clone(), 128);
    this.log("stinger derribado");
  }
  bala({origen: origen, dir: dir, "daño": daño, largo: largo, vel: vel, tam: tam = 30, hzd: hzd = true, chispa: chispa = true, blast: blast = false}) {
    const d = dir.clone().normalize(), hit = hzd ? this.mgr.pared(origen, d, largo, -1, 0) : null;
    const b = {
      pos: origen.clone(),
      step: d.clone().multiplyScalar(vel),
      vel: vel,
      dist: 0,
      hitDist: hit ? hit.dist : largo,
      hitPos: hit ? hit.punto : origen.clone().addScaledVector(d, largo),
      hit: !!hit,
      "daño": daño,
      tam: tam,
      chispa: chispa,
      blast: blast,
      mesh: this.J.ctx.balaVisual?.(origen.clone().multiplyScalar(MM), d) || null
    };
    this.balas.push(b);
    return b;
  }
  cuadroBalas() {
    const s = this.snake(), post = this.J.postura?.() ?? 0, rig = this.J.ctx.rig.position, caja = new THREE.Box3, ray = new THREE.Ray, q = new THREE.Vector3;
    for (const b of this.balas.slice()) {
      b.dist += b.vel;
      const sig = b.dist > b.hitDist ? b.hitPos.clone() : b.pos.clone().add(b.step);
      let fin = false;
      if (this.snakeVivo() && !this.snakeInvencible()) {
        const cy = s.y, hy = [ 700, 500, 500 ][post] + b.tam / 2;
        caja.min.set(rig.x * 1e3 - 300 - b.tam / 2, cy - hy, rig.z * 1e3 - 300 - b.tam / 2);
        caja.max.set(rig.x * 1e3 + 300 + b.tam / 2, cy + hy, rig.z * 1e3 + 300 + b.tam / 2);
        const L = sig.distanceTo(b.pos);
        if (L > 0) {
          ray.set(b.pos, sig.clone().sub(b.pos).normalize());
          if (ray.intersectBox(caja, q) && q.distanceTo(b.pos) <= L) {
            fin = true;
            this.dañarSnake(b.daño, b.blast ? "blast" : "bala");
          }
        }
      }
      b.pos.copy(sig);
      if (b.mesh) b.mesh.position.copy(b.pos).multiplyScalar(MM);
      if (!fin && b.dist > b.hitDist) {
        fin = true;
        if (b.hit && b.chispa) this.mgr.chispa(b.hitPos.clone().multiplyScalar(MM), .3, 4);
      }
      if (fin) {
        b.mesh?.removeFromParent();
        this.balas.splice(this.balas.indexOf(b), 1);
      }
    }
  }
  voces() {
    if (!this.flujo) {
      this.flujo = new Flujo({
        voces: this.ctx.voces,
        simulado: !!this.ctx.vocesSimuladas
      });
      if (!this.mgr.flujo) this.mgr.flujo = this.flujo;
      this.vozPend = false;
    }
    return this.flujo;
  }
  precargarVoces(ids) {
    return this.voces().precargar(ids.filter(x => typeof x === "number" && x > 0));
  }
  estadoVoz() {
    return this.flujo ? this.flujo.estado : -1;
  }
  hablar(id) {
    if (!(id > 0)) return;
    const f = this.voces();
    f.vox(id);
    this.vozPend = true;
    this.log("voz", {
      id: id
    });
  }
  callar() {
    this.flujo?.parar();
    this.vozPend = false;
  }
  cine(cuadros) {
    if (!this.barras) {
      const mk = top => {
        const d = document.createElement("div");
        Object.assign(d.style, {
          position: "fixed",
          left: "0",
          right: "0",
          height: "0",
          background: "#000",
          zIndex: "5",
          pointerEvents: "none",
          [top ? "top" : "bottom"]: "0",
          transition: "height 0.3s linear"
        });
        (document.getElementById("hud")?.parentElement || document.body).appendChild(d);
        return d;
      };
      this.barras = [ mk(true), mk(false) ];
    }
    this.tCine = cuadros;
    for (const b of this.barras) b.style.height = "12.5%";
    const hud = document.getElementById("hud");
    if (hud && this.hudPrevio == null) {
      this.hudPrevio = hud.hidden;
      hud.hidden = true;
    }
  }
  finCine() {
    this.tCine = 0;
    for (const b of this.barras || []) b.style.height = "0";
    const hud = document.getElementById("hud");
    if (hud && this.hudPrevio != null) {
      hud.hidden = this.hudPrevio;
      this.hudPrevio = null;
    }
  }
  cuadro() {
    if (this.flujo) {
      this.flujo.tick();
      if (this.vozPend && this.flujo.estado === 1) {
        this.flujo.empezar();
        this.vozPend = false;
      }
    }
    this.cuadroBalas();
    if (this.tCine > 0 && --this.tCine === 0) this.finCine();
  }
  destruir() {
    for (const b of this.balas) b.mesh?.removeFromParent();
    this.balas = [];
    this.soltarCamara();
    this.finCine();
    for (const b of this.barras || []) b.remove();
    this.barras = null;
    this.flujo?.parar();
    this.oyentes = [];
    this.grandes = [];
    for (const m of this.mallasP?.values() || []) m.geometry.dispose();
    if (actual === this) actual = null;
  }
}

export const rsin = a => Math.round(Math.sin(a * ANG) * 4096);

export const rcos = a => Math.round(Math.cos(a * ANG) * 4096);

export const isqrt = v => Math.floor(Math.sqrt(Math.max(0, v)));

export const idiv = (a, b) => Math.trunc(a / b);
