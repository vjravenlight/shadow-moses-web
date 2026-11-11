// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const MM = .001, FPS = 30;

export class Blancos {
  constructor(op) {
    this.op = op;
    this.lista = [];
    this.rotos = 0;
    this.total = 0;
    this.vidrios = [];
  }
  async cargar() {
    for (const a of this.op.actores) await this.agregar(a);
  }
  async agregar(a) {
    const o = a.opts || {}, num = k => Array.isArray(o[k]) ? o[k].filter(v => typeof v === "number") : [];
    const pts = (a.puntos || []).map(q => new THREE.Vector3(q.p[0] * MM, q.p[1] ? q.p[1] * MM : "h" in o ? 1 : .5, q.p[2] * MM));
    const p = a.tipo === "VRBOX2" && num("p").length >= 3 ? new THREE.Vector3(num("p")[0] * MM, num("p")[1] * MM, num("p")[2] * MM) : pts[0]?.clone();
    if (!p) return null;
    const panel = a.tipo === "VRBOX2" && num("k").length ? {
      eje: num("k")[0] < 2 ? num("k")[0] & 1 : 0
    } : null;
    if (panel) p.y += 1;
    const B = {
      p: p,
      p0: p.clone(),
      pts: pts,
      i: 0,
      vel: (num("s")[0] || 0) * MM,
      vivo: true,
      obj: null,
      panel: panel,
      nombre: a.nombre
    };
    if (a.vrbox3) B.vr3 = true;
    const pe = (o.e || []).find(x => x && typeof x === "object" && "proc" in x);
    if (pe) B.proc = pe.proc;
    if (num("t").length) B.reaparece = Math.max(30, num("t")[0]);
    if (num("u").length) B.reaparece = Math.max(30, num("u")[0] * FPS);
    if (a.tipo === "VRBOX4") {
      B.vr4 = true;
      B.espera = !("i" in o);
      B.vida = num("l").length ? num("l")[0] : null;
      const pc = (o.c || []).find(x => x && typeof x === "object" && "proc" in x);
      if (pc) B.procC = pc.proc;
    }
    if (a.modelo) {
      try {
        const m = await this.op.cargarGlb(a.modelo);
        m.traverse(q => {
          if (q.isMesh) {
            q.userData.sinColision = true;
            q.raycast = () => {};
          }
        });
        if (panel) m.scale.set(panel.eje ? .2 : 2, 2, panel.eje ? 2 : .2);
        m.updateMatrixWorld(true);
        const bb = (new THREE.Box3).setFromObject(m), c = bb.getCenter(new THREE.Vector3);
        if (B.vr3) c.set(0, 0, 0);
        B.desfase = c;
        m.position.copy(p).sub(c);
        this.op.grupo?.add(m);
        B.obj = m;
        B.radio = panel ? 1 : Math.max(.3, bb.getSize(new THREE.Vector3).length() / 2 * .8);
      } catch {}
    }
    B.radio ??= .45;
    if (a.tipo === "VRBOX2" && (panel || (num("w")[0] ?? 1) !== 0)) this.ponerPared(B);
    this.lista.push(B);
    this.total++;
    return B;
  }
  agregarVidrio(a) {
    const o = a.opts || {}, num = k => Array.isArray(o[k]) ? o[k].filter(v => typeof v === "number") : [];
    const p = num("p"), d = num("d"), sz = num("s");
    if (p.length < 3) return null;
    const sx = (sz[0] || 1e3) * MM, sy = (sz[1] || 1e3) * MM, ANG = Math.PI * 2 / 4096;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * sx, 2 * sy), new THREE.MeshBasicMaterial({
      color: 10476799,
      transparent: true,
      opacity: .28,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    m.position.set(p[0] * MM, p[1] * MM, p[2] * MM);
    m.rotation.set((d[0] || 0) * ANG, (d[1] || 0) * ANG, (d[2] || 0) * ANG, "YXZ");
    m.userData.sinColision = true;
    m.userData.propio = true;
    m.updateMatrixWorld(true);
    this.op.grupo?.add(m);
    const V = {
      obj: m,
      golpes: 3,
      vivo: true
    };
    this.vidrios.push(V);
    return V;
  }
  golpeVidrio(V, explosion) {
    if (!V.vivo) return;
    V.golpes = explosion ? 0 : V.golpes - 1;
    if (V.golpes > 0) {
      this.op.sonar?.(62);
      V.obj.material.opacity = .28 + (3 - V.golpes) * .18;
      V.obj.material.color.set(14217471);
      return;
    }
    V.vivo = false;
    V.obj.visible = false;
    this.op.sonar?.(63);
    try {
      this.op.armas?.()?.visualExplosion?.(V.obj.position.clone(), .3);
    } catch {}
  }
  ponerPared(B) {
    const P = this.op.paredes?.();
    if (!Array.isArray(P)) return;
    const segs = [], y0 = B.p.y - (B.panel ? 1 : .5), h = B.panel ? 2 : 1, {x: x, z: z} = B.p;
    if (B.panel) segs.push(B.panel.eje ? [ x, z - 1, x, z + 1 ] : [ x - 1, z, x + 1, z ]); else {
      const r = .525;
      segs.push([ x - r, z - r, x + r, z - r ], [ x + r, z - r, x + r, z + r ], [ x + r, z + r, x - r, z + r ], [ x - r, z + r, x - r, z - r ]);
    }
    const pos = [];
    for (const [x0, z0, x1, z1] of segs) pos.push(x0, y0, z0, x1, y0, z1, x1, y0 + h, z1, x0, y0, z0, x1, y0 + h, z1, x0, y0 + h, z0);
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    }));
    m.userData.propio = m.userData.sinColision = true;
    m.frustumCulled = false;
    this.op.grupo?.add(m);
    P.push(m);
    B.pared = m;
  }
  quitarPared(B) {
    if (!B.pared) return;
    const P = this.op.paredes?.(), i = Array.isArray(P) ? P.indexOf(B.pared) : -1;
    if (i >= 0) P.splice(i, 1);
    B.pared.removeFromParent();
    B.pared.geometry.dispose();
    B.pared = null;
  }
  soltar() {
    for (const B of this.lista) this.quitarPared(B);
  }
  get vivos() {
    return this.lista.filter(b => b.vivo);
  }
  enganchar() {
    const S = this.op.sensores?.();
    if (S && S._vrBlancos !== this) {
      S._vrBlancos = this;
      const ex = S._vrExplosionOrig ||= S.explosion.bind(S);
      S.explosion = (pos, op) => {
        const r = ex(pos, op);
        if (S._vrBlancos === this && !this._enExpl) for (const b of this.vivos) {
          const d = Math.max(Math.abs(b.p.x - pos.x), Math.abs(b.p.y - pos.y), Math.abs(b.p.z - pos.z));
          if (d <= 2) this.golpe(b, d <= 1 ? 256 : 128);
        }
        return r;
      };
    }
    const A = this.op.armas?.();
    if (!A || A._vrBlancos === this) return;
    A._vrBlancos = this;
    const bala = A.bala.bind(A), expl = A.explosion.bind(A), pared = A.pared.bind(A);
    A.pared = (o, d, lejos, malla) => {
      const h = pared(o, d, lejos, malla);
      if (A._vrBlancos !== this || malla && malla !== A.juego?.vista || !this.vidrios.length) return h;
      const ray = new THREE.Raycaster(o, d, 0, h ? h.distance : lejos);
      let mejor = null;
      for (const V of this.vidrios) if (V.vivo) {
        const x = ray.intersectObject(V.obj, false)[0];
        if (x && (!mejor || x.distance < mejor.distance)) {
          mejor = x;
          mejor.vidrio = V;
        }
      }
      if (mejor) {
        this._vidrio = mejor.vidrio;
        return mejor;
      }
      return h;
    };
    A.bala = (o, d, tipo, daño) => {
      this._vidrio = null;
      const r = bala(o, d, tipo, daño);
      if (this._vidrio && !r?.guardia) {
        this.golpeVidrio(this._vidrio, false);
        this._vidrio = null;
        return r;
      }
      const lejos = r?.impacto ? o.distanceTo(r.impacto) : 10;
      let mejor = null, md = lejos + .3;
      for (const b of this.vivos) {
        const v = b.p.clone().sub(o), t = v.dot(d);
        if (t <= 0 || t > md) continue;
        if (v.clone().addScaledVector(d, -t).length() <= b.radio) {
          md = t;
          mejor = b;
        }
      }
      if (mejor && !r?.guardia) {
        this.golpe(mejor, daño ?? 64);
        if (r) r.impacto = o.clone().addScaledVector(d, md);
      }
      return r;
    };
    A.explosion = (p, daño, arma) => {
      let r;
      this._enExpl = true;
      try {
        r = expl(p, daño, arma);
      } finally {
        this._enExpl = false;
      }
      for (const V of this.vidrios) if (V.vivo && V.obj.position.distanceTo(p) <= 2) this.golpeVidrio(V, true);
      for (const b of this.vivos) {
        const d = Math.max(Math.abs(b.p.x - p.x), Math.abs(b.p.y - p.y), Math.abs(b.p.z - p.z));
        if (d <= 2) this.golpe(b, d <= 1 ? 256 : 128);
      }
      return r;
    };
  }
  golpe(b, n) {
    if (!b.vivo || b.cae) return;
    if (b.vida == null) return this.romper(b);
    b.vida -= n;
    if (b.vida < 0) {
      b.cae = 1;
      if (b.procC != null) this.op.alRomperProc?.(b.procC, b);
    }
  }
  mensaje(nombre, msg) {
    for (const b of this.lista) {
      if ((b.nombre & 65535) !== nombre) continue;
      if (msg === 39455) b.espera = false; else if (msg === 50075 || msg === 12835) {
        b.reaparece = 0;
        b.vuelve = 0;
        if (b.vivo) {
          b.vivo = false;
          if (b.obj) b.obj.visible = false;
          this.quitarPared(b);
        }
      }
    }
  }
  romper(b) {
    if (!b.vivo) return;
    b.vivo = false;
    if (b.obj) b.obj.visible = false;
    if (b.reaparece) b.vuelve = b.reaparece;
    this.quitarPared(b);
    this.rotos++;
    if (!b.vr3) try {
      this.op.armas?.()?.visualExplosion?.(b.p.clone(), .5);
    } catch {}
    this.op.sonar?.(b.vr3 ? 213 : 41);
    this.op.alRomper?.(this.rotos, this.total);
    if (b.proc != null) this.op.alRomperProc?.(b.proc, b);
  }
  cuadro() {
    this.enganchar();
    const A = this.op.armas?.();
    for (const b of this.lista) if (!b.vivo && b.vuelve > 0 && --b.vuelve === 0) {
      b.vivo = true;
      b.p.copy(b.pts[0] || b.p0);
      b.i = 0;
      if (b.obj) {
        b.obj.visible = true;
        b.obj.position.copy(b.p).sub(b.desfase || new THREE.Vector3);
      }
    }
    for (const b of this.vivos) {
      if (b.cae) {
        b.cae++;
        b.p.y -= .005 * b.cae;
        if (b.obj) b.obj.position.copy(b.p).sub(b.desfase || new THREE.Vector3);
        if (b.cae > 60 || b.p.y < 2.5) {
          b.cae = 0;
          b.vida = null;
          this.romper(b);
        }
        continue;
      }
      if (b.espera) continue;
      if (b.pts.length > 1 && b.vel > 0) {
        let falta = b.vel;
        while (falta > 0) {
          const dst = b.pts[(b.i + 1) % b.pts.length], d = dst.clone().sub(b.p), L = d.length();
          if (L <= falta) {
            b.p.copy(dst);
            b.i = (b.i + 1) % b.pts.length;
            falta -= L;
            if (L < 1e-6) break;
          } else {
            b.p.addScaledVector(d, falta / L);
            falta = 0;
          }
        }
        if (b.obj) b.obj.position.copy(b.p).sub(b.desfase || new THREE.Vector3);
      }
      if (!A) continue;
      if (A.misil && Math.hypot(A.misil.p.x - b.p.x, A.misil.p.z - b.p.z) < .8 && Math.abs(A.misil.p.y - b.p.y) < 1.2) A.terminarNikita?.(true);
      for (const m of [ ...A.misilS || [] ]) if (m.p.distanceTo(b.p) < .8) {
        A.misilS.splice(A.misilS.indexOf(m), 1);
        m.obj?.removeFromParent();
        A.explosion(m.p.clone(), undefined, 4);
      }
      for (const m of A.minas || []) if (!m.disparada && A.dentroZona?.(m, b.p.clone().setY(b.p.y - .5), 1)) {
        A.dispararMina(m);
        this.romper(b);
      }
    }
  }
}

export const CUADROS_POR_SEGUNDO = FPS;
