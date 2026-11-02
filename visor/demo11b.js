// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { sonido } from "./juego.js";

const MM = .001, ANG = Math.PI * 2 / 4096;

const randU = n => Math.floor(Math.random() * n);

const V = (x = 0, y = 0, z = 0) => ({
  x: x,
  y: y,
  z: z
});

const mod = (a, n) => a - Math.trunc(a / n) * n;

const div = (a, b) => Math.trunc(a / b);

const interp = (v, t, n) => {
  v.x = div(v.x * (n - 1) + t.x, n);
  v.y = div(v.y * (n - 1) + t.y, n);
  v.z = div(v.z * (n - 1) + t.z, n);
};

const N = 16, LARGO = 40;

export class Demo11B {
  constructor(actor, ctx) {
    this.actor = actor;
    this.ctx = ctx;
    this.registro = [];
    this.vivo = true;
    const ini = V(-18e3, 0, 26e3), dstB = V(-3e3, 4e3, 5e3);
    let s2 = 0, s3 = 0, s4 = 0, s5 = 0, s6 = 0, dx = 0;
    this.c = [];
    for (let i = 0; i < N; i++) {
      ini.x += dx;
      const pos = V(ini.x, mod(s4, 4096) + 17e3, ini.z);
      const dst = V(dstB.x + mod(s5, 4096) - 2048, dstB.y + i * 512, dstB.z + mod(s6, 4096) - 2048);
      this.c.push({
        est: 0,
        pos: pos,
        vel: V(div(dst.x - pos.x, i + 50), div(dst.y - pos.y, i + 50), div(dst.z - pos.z, i + 50)),
        a: mod(s2, 4096),
        b: mod(s3, 4096),
        idx: 0
      });
      s6 += 1493;
      s5 += 1223;
      dx += 50;
      s4 += 1433;
      s3 += 733;
      s2 += 633;
    }
    this.fase = 0;
    this.timer = 0;
    this.frame = 0;
    this.serie = 0;
    this.vib = 0;
    this.ojo = V();
    this.centro = V();
    this.ojoT = V();
    this.centroT = V();
    this.estela = new Array(N * LARGO).fill(0);
  }
  log(t, d = {}) {
    this.registro.push({
      t: t,
      f: this.frame,
      ...d
    });
  }
  async iniciar() {
    const ctx = this.ctx, g = new THREE.Group;
    g.name = "11B_DEMO";
    this.g = g;
    ctx.mundo?.add(g);
    for (const c of this.c) {
      const o = new THREE.Group;
      o.visible = false;
      g.add(o);
      c.o = o;
    }
    Promise.resolve(ctx.cargar?.("jefes/stn_fr.glb")).then(m => {
      if (!m || !this.g) return;
      for (const c of this.c) {
        const k = m.clone(true);
        k.traverse(x => {
          if (x.isMesh) x.userData.sinColision = true;
        });
        c.o.add(k);
      }
    }).catch(() => {});
    const geo = new THREE.BufferGeometry, pos = new Float32Array(N * LARGO * 4 * 3), col = new Float32Array(N * LARGO * 4 * 3), idx = [];
    for (let k = 0; k < N * LARGO; k++) {
      const b = k * 4;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    this.malla = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    this.malla.frustumCulled = false;
    this.malla.userData.sinColision = true;
    g.add(this.malla);
    const inv = ctx.inventario ?? (typeof window !== "undefined" ? window.__mgs?.inventario : null);
    if (inv) {
      if ([ 1, 12, 5, 6 ].includes(inv.item)) inv.item = -1;
      if ([ 9, 4 ].includes(inv.arma)) inv.arma = -1;
    }
    this.log("inicio");
    this.listo = true;
    return this;
  }
  cam() {
    return this.ctx.camJuego?.() ?? (typeof window !== "undefined" ? window.__mgs?.camJuego : null) ?? null;
  }
  jugador() {
    const r = (this.ctx.juego?.ctx.rig || (typeof window !== "undefined" ? window.__mgs?.rig : null))?.position;
    return r ? V(Math.round(r.x * 1e3), Math.round(r.y * 1e3) + 750, Math.round(r.z * 1e3)) : V();
  }
  se(id, p) {
    sonido(id, p ? new THREE.Vector3(p.x * MM, p.y * MM, p.z * MM) : null);
  }
  vibrar(n) {
    try {
      this.ctx.vibrar?.(Math.max(1, Math.round(n / 64)));
    } catch {}
  }
  destello(r, g, b, cuadros) {
    if (typeof document === "undefined") return;
    let d = this._velo;
    if (!d) {
      d = document.createElement("div");
      d.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:6;mix-blend-mode:screen";
      document.body.appendChild(d);
      this._velo = d;
    }
    d.style.background = `rgb(${r},${g},${b})`;
    this.veloT = cuadros;
    this.veloN = cuadros;
    d.style.opacity = "0.6";
  }
  cuadro() {
    if (!this.vivo || !this.listo) return;
    const f = this.fase;
    if (f === 0) {
      this.se(42, null);
      this.timer = 40;
      this.ojoT = V(4045, 1117, 26881);
      this.centroT = V(-6287, 8057, 15429);
      this.fase = 1;
      const c = this.cam();
      if (c) {
        this.ojo = V(c.W.pos.x, c.W.pos.y, c.W.pos.z);
        this.centro = V(c.W.trg.x, c.W.trg.y, c.W.trg.z);
      }
      this.se(190, this.centroT);
    }
    if (this.fase === 1) {
      if (this.timer > 20) this.vibrar((this.timer - 20) * 12);
      if (randU(128) === 0) this.se(189, this.centroT);
      interp(this.ojo, this.ojoT, 8);
      interp(this.centro, this.centroT, 8);
      if (this.timer < 0) {
        this.se(190, this.centroT);
        this.fase = 2;
        this.timer = 90;
        this.centroT = V(-10418, 13712, 15869);
        this.ojoT = V(-11662, 15703, 29801);
      }
    } else if (this.fase === 2) {
      if (randU(128) === 0) this.se(189, this.centroT);
      interp(this.ojo, this.ojoT, 16);
      interp(this.centro, this.centroT, 16);
      this.ojoT.x -= 30;
      this.ojoT.y -= 35;
      this.ojoT.z -= 100;
      this.centroT.x += 50;
      this.centroT.y -= 40;
      this.centroT.z -= 100;
      if (this.timer < 0) {
        this.se(190, this.centroT);
        this.fase = 3;
        this.timer = 41;
        this.centroT = this.jugador();
        this.ojoT = V(9200, 4e3, 29e3);
        this.destello(255, 255, 255, 40);
      }
    } else if (this.fase === 3) {
      interp(this.ojo, this.ojoT, 16);
      interp(this.centro, this.centroT, 8);
      if (this.timer < 0) {
        this.terminar();
        return;
      }
    }
    let s4 = 0, fp = 0, s7 = 0, t70 = 0, t78 = 0;
    this.c.forEach((c, i) => {
      if (c.est === 0) {
        c.o.visible = false;
        if (randU(32) === 0 || this.fase >= 3) {
          c.est = 1;
          this.se(180, c.pos);
          c.idx = 0;
          if (this.serie === 0) {
            this.se(188, this.centroT);
            this.serie++;
          } else if (this.serie === 1) {
            this.se(193, this.centroT);
            this.serie++;
          } else if (this.serie === 2) {
            this.se(194, this.centroT);
            this.serie = 0;
          }
        }
      } else if (c.est === 1) {
        c.o.visible = true;
        const rz = c.a + c.b;
        c.a += (i >> 1) + 10;
        c.b += i + 25;
        c.pos.x += c.vel.x;
        c.pos.y += c.vel.y;
        c.pos.z += c.vel.z;
        const sig = V(c.pos.x + c.vel.x, c.pos.y + c.vel.y, c.pos.z + c.vel.z);
        const off = (p, giro) => {
          const e = new THREE.Euler(0, 0, giro * ANG, "YXZ"), v = new THREE.Vector3(i * 10 + 60, 0, 0).applyEuler(e);
          return V(Math.round(p.x + v.x), Math.round(p.y + v.y), Math.round(p.z + v.z));
        };
        const p1 = off(c.pos, rz);
        c.pos = p1;
        this.humo(p1);
        const p2 = off(sig, c.a + c.b);
        p2.y -= 50;
        c.o.position.set(p2.x * MM, p2.y * MM, p2.z * MM);
        c.o.lookAt(p1.x * MM, p1.y * MM, p1.z * MM);
        this.ponerEstela(c, i);
        if (c.pos.z < 6800) {
          c.est = 2;
          c.o.visible = false;
          this.destello(32, 32, 32, 15);
          const p = new THREE.Vector3(c.pos.x * MM, c.pos.y * MM, c.pos.z * MM);
          if (c.pos.x >= -4999 && c.pos.x < 3e3) {
            this.explosion(p, 1.3);
            this.vib = randU(16) + 20;
            this.se(192, c.pos);
            this.se(41, c.pos);
          } else this.explosion(p, .8);
          this.log("impacto", {
            i: i,
            p: [ c.pos.x, c.pos.y, c.pos.z ]
          });
        }
      } else {
        c.o.visible = false;
        if (randU(2) === 0) this.se(187, null);
        if (randU(128) === 0) this.se(39, null);
        if (randU(256) === 0) this.se(40, null);
      }
      s4 += 1933;
      fp += 1633;
      s7 += 1348;
      t70 += 1133;
      t78 += 1433;
    });
    this.apagarEstela();
    if (this.vib > 0) {
      this.vib--;
      this.vibrar(this.vib * 255 / 42);
    }
    const cam = this.cam();
    if (cam) cam.corte([ this.ojo.x, this.ojo.y, this.ojo.z ], [ this.centro.x, this.centro.y, this.centro.z ], 320, 2);
    if (this._velo && this.veloT > 0) {
      this.veloT--;
      this._velo.style.opacity = String(.6 * (this.veloT / (this.veloN || 1)));
    }
    this.frame++;
    this.timer--;
  }
  humo(p) {
    const s = new THREE.Sprite(this._humoMat ||= new THREE.SpriteMaterial({
      color: 10132122,
      transparent: true,
      opacity: .5,
      depthWrite: false
    }));
    s.scale.set(.6, .6, 1);
    s.position.set(p.x * MM, p.y * MM, p.z * MM);
    s.userData.sinColision = true;
    this.g.add(s);
    (this.humos ||= []).push({
      s: s,
      t: 12
    });
  }
  explosion(p, k) {
    try {
      const A = this.ctx.armas ?? (typeof window !== "undefined" ? window.__mgs?.armas : null);
      if (A?.visualExplosion) A.visualExplosion(p, k);
    } catch {}
  }
  ponerEstela(c, i) {
    const k = i * LARGO + c.idx, ant = i * LARGO + (c.idx === 0 ? LARGO - 1 : c.idx - 1);
    this.estela[k] = LARGO;
    const P = this.malla.geometry.attributes.position.array, o = k * 12, oa = ant * 12;
    const prev = c.prev || c.pos;
    const vs = [ [ c.pos.x, c.pos.y, c.pos.z ], [ prev.x, prev.y, prev.z ], [ c.pos.x, c.pos.y - 100, c.pos.z ], [ prev.x, prev.y - 100, prev.z ] ];
    vs.forEach((v, j) => {
      P[o + j * 3] = v[0] * MM;
      P[o + j * 3 + 1] = v[1] * MM;
      P[o + j * 3 + 2] = v[2] * MM;
    });
    c.prev = {
      ...c.pos
    };
    c.idx = (c.idx + 1) % LARGO;
    this.malla.geometry.attributes.position.needsUpdate = true;
    void oa;
  }
  apagarEstela() {
    const C = this.malla.geometry.attributes.color.array;
    for (let k = 0; k < N * LARGO; k++) {
      let s = 0;
      if (this.estela[k] > 0) {
        s = this.estela[k] * 255 / 40 / 255;
        this.estela[k]--;
      } else this.estela[k] = 0;
      for (let j = 0; j < 12; j++) C[k * 12 + j] = s * .55;
    }
    this.malla.geometry.attributes.color.needsUpdate = true;
    for (const h of (this.humos || []).slice()) {
      if (--h.t <= 0) {
        h.s.removeFromParent();
        this.humos.splice(this.humos.indexOf(h), 1);
      } else h.s.material.opacity = .5 * (h.t / 12);
    }
  }
  terminar() {
    if (!this.vivo) return;
    this.vivo = false;
    this.log("fin");
    this.g?.removeFromParent();
    this._velo?.remove();
    try {
      this.ctx.guion?.eventoActor?.(this.actor, "p", []);
    } catch (e) {
      console.warn("[11b_demo]", e);
    }
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.g?.removeFromParent();
    this._velo?.remove();
  }
}
