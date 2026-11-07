// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const MM = .001, FPS = 30;

export class Blancos {
  constructor(op) {
    this.op = op;
    this.lista = [];
    this.rotos = 0;
  }
  async cargar() {
    for (const a of this.op.actores) {
      const o = a.opts || {}, num = k => Array.isArray(o[k]) ? o[k].filter(v => typeof v === "number") : [];
      const pts = (a.puntos || []).map(q => new THREE.Vector3(q.p[0] * MM, q.p[1] ? q.p[1] * MM : "h" in o ? 1 : .5, q.p[2] * MM));
      const p = a.tipo === "VRBOX2" && num("p").length >= 3 ? new THREE.Vector3(num("p")[0] * MM, num("p")[1] * MM, num("p")[2] * MM) : pts[0]?.clone();
      if (!p) continue;
      const B = {
        p: p,
        pts: pts,
        i: 0,
        vel: (num("s")[0] || 0) * MM,
        vivo: true,
        obj: null
      };
      if (a.modelo) {
        try {
          const m = await this.op.cargarGlb(a.modelo);
          m.traverse(q => {
            if (q.isMesh) {
              q.userData.sinColision = true;
              q.raycast = () => {};
            }
          });
          const bb = (new THREE.Box3).setFromObject(m), c = bb.getCenter(new THREE.Vector3);
          B.desfase = c;
          m.position.copy(p).sub(c);
          this.op.grupo?.add(m);
          B.obj = m;
          B.radio = Math.max(.3, bb.getSize(new THREE.Vector3).length() / 2 * .8);
        } catch {}
      }
      B.radio ??= .45;
      this.lista.push(B);
    }
    this.total = this.lista.length;
  }
  get vivos() {
    return this.lista.filter(b => b.vivo);
  }
  enganchar() {
    const A = this.op.armas?.();
    if (!A || A._vrBlancos === this) return;
    A._vrBlancos = this;
    const bala = A.bala.bind(A), expl = A.explosion.bind(A);
    A.bala = (o, d, tipo, daño) => {
      const r = bala(o, d, tipo, daño);
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
        this.romper(mejor);
        if (r) r.impacto = o.clone().addScaledVector(d, md);
      }
      return r;
    };
    A.explosion = (p, daño, arma) => {
      const r = expl(p, daño, arma);
      for (const b of this.vivos) if (Math.abs(b.p.x - p.x) <= 2 && Math.abs(b.p.y - p.y) <= 2 && Math.abs(b.p.z - p.z) <= 2) this.romper(b);
      return r;
    };
  }
  romper(b) {
    if (!b.vivo) return;
    b.vivo = false;
    if (b.obj) b.obj.visible = false;
    this.rotos++;
    try {
      this.op.armas?.()?.visualExplosion?.(b.p.clone(), .5);
    } catch {}
    this.op.sonar?.(41);
    this.op.alRomper?.(this.rotos, this.total);
  }
  cuadro() {
    this.enganchar();
    const A = this.op.armas?.();
    for (const b of this.vivos) {
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
