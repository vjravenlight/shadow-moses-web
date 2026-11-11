// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const ARRIBA = new THREE.Vector3(0, 1, 0);

const _S = new THREE.Vector3, _H = new THREE.Vector3, _E = new THREE.Vector3, _u = new THREE.Vector3, _w = new THREE.Vector3, _d = new THREE.Vector3;

const _f = new THREE.Vector3, _r = new THREE.Vector3, _polo = new THREE.Vector3;

export class BrazosVR {
  constructor(escena) {
    this.escena = escena;
    this.brazos = null;
  }
  _poner(brazos) {
    if (this.brazos === brazos) return;
    this.quitar();
    this.brazos = brazos;
    for (const lado of [ "right", "left" ]) for (const t of brazos[lado]) this.escena.add(t.obj);
  }
  quitar() {
    if (!this.brazos) return;
    for (const lado of [ "right", "left" ]) for (const t of this.brazos[lado]) {
      t.obj.visible = false;
      t.obj.removeFromParent();
    }
    this.brazos = null;
  }
  actualizar({brazos: brazos, ojos: ojos, yaw: yaw, manos: manos, visible: visible}) {
    if (!brazos) {
      this.quitar();
      return;
    }
    this._poner(brazos);
    _f.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _r.set(Math.cos(yaw), 0, -Math.sin(yaw));
    for (const lado of [ "right", "left" ]) {
      const [t1, t2] = brazos[lado], mano = manos?.[lado];
      const ver = !!(visible && mano && mano.visible && mano.parent);
      t1.obj.visible = t2.obj.visible = ver;
      if (!ver) continue;
      const s = lado === "right" ? 1 : -1;
      _S.copy(ojos).addScaledVector(ARRIBA, -.23).addScaledVector(_r, .17 * s).addScaledVector(_f, -.05);
      mano.getWorldPosition(_H);
      _d.subVectors(_H, _S);
      let c = _d.length();
      const L = t1.largo + t2.largo, k = c > L * .995 ? c / (L * .995) : 1, a = t1.largo * k, b = t2.largo * k;
      c = Math.max(c, Math.abs(a - b) + .01);
      _u.copy(_d).normalize();
      _polo.copy(ARRIBA).multiplyScalar(-1).addScaledVector(_r, .6 * s).addScaledVector(_f, -.3);
      _w.copy(_polo).addScaledVector(_u, -_polo.dot(_u));
      if (_w.lengthSq() < 1e-6) _w.copy(_r).multiplyScalar(s);
      _w.normalize();
      const cosA = Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c))), sinA = Math.sqrt(1 - cosA * cosA);
      _E.copy(_S).addScaledVector(_u, a * cosA).addScaledVector(_w, a * sinA);
      t1.obj.position.copy(_S);
      t1.obj.quaternion.setFromUnitVectors(ARRIBA, _d.subVectors(_E, _S).normalize());
      t1.obj.scale.set(1, k, 1);
      t2.obj.position.copy(_E);
      t2.obj.quaternion.setFromUnitVectors(ARRIBA, _d.subVectors(_H, _E).normalize());
      t2.obj.scale.set(1, k, 1);
    }
  }
}

const _pm = new THREE.Vector3, _po = new THREE.Vector3, _fc = new THREE.Vector3, _uc = new THREE.Vector3, _q = new THREE.Quaternion, _m = new THREE.Matrix4;

const _x = new THREE.Vector3, _y = new THREE.Vector3, _z = new THREE.Vector3;

export class DosManos {
  constructor() {
    this.activa = false;
    this.dir = new THREE.Vector3(0, 0, -1);
    this.q = new THREE.Quaternion;
    this.alCambiar = null;
  }
  actualizar({principal: principal, apoyo: apoyo, puede: puede, dt: dt = 1 / 72}) {
    let si = false;
    if (puede && principal?.visible && apoyo?.visible) {
      principal.getWorldPosition(_pm);
      apoyo.getWorldPosition(_po);
      principal.getWorldQuaternion(_q);
      _fc.set(0, 0, -1).applyQuaternion(_q);
      _uc.set(0, 1, 0).applyQuaternion(_q);
      const v = _po.sub(_pm), dist = v.length(), cos = dist > 1e-4 ? v.dot(_fc) / dist : -1;
      si = this.activa ? dist > .08 && dist < .85 && cos > Math.cos(70 * Math.PI / 180) : dist > .12 && dist < .75 && cos > Math.cos(50 * Math.PI / 180);
      if (si) {
        _z.copy(v).normalize().negate();
        _x.crossVectors(_uc, _z);
        if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0);
        _x.normalize();
        _y.crossVectors(_z, _x);
        const meta = _q.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
        if (!this.activa) this.q.copy(meta); else this.q.slerp(meta, 1 - Math.exp(-dt * 30));
        this.dir.set(0, 0, -1).applyQuaternion(this.q);
      }
    }
    if (si !== this.activa) {
      this.activa = si;
      this.alCambiar?.(si);
    }
    return si;
  }
}
