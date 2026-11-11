// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const ANG = Math.PI * 2 / 4096;

const a12 = v => v & 4095;

const s12 = v => {
  v &= 4095;
  return v > 2048 ? v - 4096 : v;
};

const diffS = (desde, hasta) => {
  const d = hasta - desde & 4095;
  return d <= 2048 ? d : d - 4096;
};

const diffAbs = (desde, hasta) => Math.abs(diffS(desde, hasta));

const ratan2 = (y, x) => a12(Math.round(Math.atan2(y, x) / ANG));

const trunc = Math.trunc;

const acercar = (v, meta, paso) => {
  const d = meta - v;
  return d < -paso ? v - paso : d > paso ? v + paso : meta;
};

const acercarAng = (v, meta, paso) => {
  let d = meta - v & 4095;
  if (!d) return v;
  if (d > 2048) d -= 4096;
  return d < -paso ? v - paso : d > paso ? v + paso : v + d;
};

function rotYXZ(x, y, z) {
  const sx = Math.sin(x * ANG), cx = Math.cos(x * ANG), sy = Math.sin(y * ANG), cy = Math.cos(y * ANG), sz = Math.sin(z * ANG), cz = Math.cos(z * ANG);
  const t = sy * sx, t2 = cy * sx;
  return [ cy * cz + t * sz, t * cz - cy * sz, sy * cx, sz * cx, cz * cx, -sx, t2 * sz - sy * cz, sy * sz + t2 * cz, cy * cx ];
}

const aplicar = (m, v) => [ m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2] ];

const aplicarT = (m, v) => [ m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2] ];

const sumar = (a, b) => [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];

const restar = (a, b) => [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];

const largo = a => Math.hypot(a[0], a[1], a[2]);

function angulosYXZ(m) {
  const i1 = -m[5] * 4096, i2 = Math.sqrt(Math.max(0, 16777216 - i1 * i1));
  let x, y, z;
  if (i2 < 128) {
    x = i1 <= 0 ? 3072 : 1024;
    y = ratan2(-m[6], m[0]);
    z = 0;
  } else {
    x = ratan2(i1, i2);
    y = ratan2(m[2], m[8]);
    z = ratan2(m[3], m[4]);
  }
  if (Math.abs(z << 16 >> 16) > 1024) {
    z = a12(z + 2048);
    y = a12(y + 2048);
    x = a12(2048 - x);
  }
  return [ x, y, z ];
}

const _m = new THREE.Matrix4, _mi = new THREE.Matrix4;

function matrizJuego(o, base) {
  _m.copy(o.matrixWorld);
  if (base) _m.premultiply(_mi.copy(base.matrixWorld).invert());
  const e = _m.elements;
  return {
    r: [ e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10] ],
    t: [ e[12] * 1e3, e[13] * 1e3, e[14] * 1e3 ]
  };
}

class Vertices {
  constructor(obj, mapa) {
    this.mallas = [];
    obj.traverse(q => {
      if (q.isMesh) {
        q.geometry = q.geometry.clone();
        this.mallas.push(q);
      }
    });
    this.mapa = mapa || [];
    this.ok = this.mallas.length === this.mapa.length && this.mallas.every((q, i) => q.geometry.attributes.position.count === this.mapa[i].length);
  }
  escribir(pos) {
    if (!this.ok) return;
    this.mallas.forEach((q, i) => {
      const p = q.geometry.attributes.position, a = p.array, M = this.mapa[i];
      for (let j = 0; j < M.length; j++) {
        const o = M[j] >> 8, k = (M[j] & 255) * 3;
        if (o) continue;
        a[j * 3] = pos[k] / 1e3;
        a[j * 3 + 1] = pos[k + 1] / 1e3;
        a[j * 3 + 2] = pos[k + 2] / 1e3;
      }
      p.needsUpdate = true;
      q.geometry.computeBoundingSphere();
    });
  }
}

export class PeloNaomi {
  constructor(obj, P, ses) {
    this.o = obj;
    this.ses = ses;
    this.v = new Vertices(obj, P.mapa);
    this.base = P.base;
    this.j = (P.juegos || []).slice(0, 4);
    this.ok = this.v.ok && this.j.length === 4 && this.j.every(x => x.length === this.base.length);
    this.w = {
      w134: 100,
      w138: 0,
      w13c: 0,
      w140: 0,
      w144: 0,
      w14c: 100,
      p150: 100,
      p154: 0,
      p158: 0,
      p15c: 0,
      p160: 0
    };
    this.velH = Array.from({
      length: 8
    }, () => [ 0, 0, 0 ]);
    this.giroH = new Array(8).fill(0);
    this.pos0 = null;
    this.rot = null;
    this.rot0 = null;
    this.reloj = 0;
  }
  cuadro() {
    if (!this.ok) return;
    const M = matrizJuego(this.o, this.ses.op.grupo), W = this.w;
    let rot = angulosYXZ(M.r);
    const dollY = this.ses.ctrl.giro, dollY0 = this.dollY0 ?? dollY;
    if (this.rot && diffAbs(rot[1], this.rot[1]) > 1536 && (diffAbs(dollY0, dollY) < 1023 || diffAbs(rot[1], dollY) > 1536)) rot = [ a12(2048 - rot[0]), a12(rot[1] + 2048), a12(rot[2] + 2048) ];
    this.dollY0 = dollY;
    this.rot = rot;
    for (let k = 7; k > 0; k--) {
      this.velH[k] = this.velH[k - 1];
      this.giroH[k] = this.giroH[k - 1];
    }
    const corr = this.ses.correccion || [ 0, 0, 0 ];
    const p = M.t, p2 = restar(p, corr);
    this.velH[0] = this.pos0 ? aplicarT(M.r, restar(p2, this.pos0)).map(Math.trunc) : [ 0, 0, 0 ];
    this.giroH[0] = this.rot0 ? diffS(rot[1], this.rot0[1]) : 0;
    this.pos0 = p;
    this.rot0 = rot.slice();
    const div8 = s => trunc(s / 8);
    const vel = [ 0, 1, 2 ].map(c => div8(this.velH.reduce((a, v) => a + v[c], 0))), giro = div8(this.giroH.reduce((a, v) => a + v, 0));
    if (vel[2] > 24 && (this.reloj++ & 15) < 8) vel[2] = 8;
    W.p150 = 100;
    W.p154 = W.p158 = W.p15c = W.p160 = 0;
    const escala = v => Math.abs(v) <= 7 ? v << 3 : Math.abs(v) <= 15 ? v << 4 : v << 5;
    let d = s12(rot[0]) - escala(vel[2]);
    if (d < 1) {
      W.p158 = 0;
      W.p154 = Math.min(100, trunc(-d * 100 / 756));
      W.p150 = 100 - W.p154;
    } else {
      W.p154 = 0;
      W.p158 = Math.min(100, d * 100 >> 8);
      W.p150 = 100 - W.p158;
    }
    d = s12(rot[2]) + escala(vel[0]);
    if (d < 1) {
      W.p15c = 0;
      W.p160 = Math.min(100, -d * 100 >> 9);
      W.w14c = 100 - W.p160;
    } else {
      W.p160 = 0;
      W.p15c = Math.min(100, d * 100 >> 9);
      W.w14c = 100 - W.p15c;
    }
    let a = Math.abs(giro) * 100 >> 6;
    if (W.p154 < 1) {
      const t = W.p158 - a;
      if (t > 0) W.p158 = t; else {
        W.p154 = Math.min(100, -t);
        W.p158 = 0;
      }
    } else W.p154 = Math.min(100, W.p154 + a);
    a = trunc(giro * 100 / 64);
    if (giro < 0) {
      if (W.p160 < 1) {
        const t = W.p15c + a;
        if (t > 0) W.p15c = t; else {
          W.p160 = Math.min(100, -t);
          W.p15c = 0;
        }
      } else W.p160 = Math.min(100, W.p160 - a);
    } else if (W.p15c < 1) {
      const t = W.p160 - a;
      if (t > 0) W.p160 = t; else {
        W.p15c = Math.min(100, -t);
        W.p160 = 0;
      }
    } else W.p15c = Math.min(100, W.p15c + a);
    let v;
    if (W.p154 < 1) {
      if (W.w138 < 1) {
        W.w138 = 0;
        W.w13c = acercar(W.w13c, W.p158, W.w13c < W.p158 ? 6 : 3);
        v = W.w13c;
      } else {
        W.w13c = 0;
        W.w138 = acercar(W.w138, 0, 4);
        v = W.w138;
      }
    } else if (W.w13c < 1) {
      W.w138 = acercar(W.w138, W.p154, W.w138 < W.p154 ? 6 : 3);
      v = W.w138;
    } else {
      W.w138 = 0;
      W.w13c = acercar(W.w13c, 0, 4);
      v = W.w13c;
    }
    W.w134 = 100 - v;
    if (W.p15c < 1) {
      if (W.w140 > 0) {
        W.w144 = 0;
        W.w140 = acercar(W.w140, 0, 4);
        v = W.w140;
      } else {
        W.w140 = 0;
        W.w144 = acercar(W.w144, W.p160, W.w144 < W.p160 ? 6 : 3);
        v = W.w144;
      }
    } else if (W.w144 < 1) {
      W.w144 = 0;
      W.w140 = acercar(W.w140, W.p15c, W.w140 < W.p15c ? 6 : 3);
      v = W.w140;
    } else {
      W.w140 = 0;
      W.w144 = acercar(W.w144, 0, 4);
      v = W.w144;
    }
    W.w14c = 100 - v;
    for (const k of [ "w134", "w138", "w13c", "w140", "w144", "w14c" ]) W[k] = Math.max(0, Math.min(100, W[k]));
    const B = this.base, [J1, J2, J3, J4] = this.j, out = this.out ||= new Array(B.length);
    for (let i = 0; i < B.length; i++) {
      const fb = trunc((B[i] * W.w134 + J1[i] * W.w138 + J2[i] * W.w13c) / 100) << 16 >> 16;
      out[i] = trunc((fb * W.w14c + J3[i] * W.w140 + J4[i] * W.w144) / 100);
    }
    this.v.escribir(out);
  }
}

export class PeloMeiLing {
  constructor(obj, P, ses) {
    this.o = obj;
    this.ses = ses;
    this.v = new Vertices(obj, P.mapa);
    obj.matrixAutoUpdate = false;
    const B = P.base, n = B.length / 3;
    this.V0 = Array.from({
      length: n
    }, (_, i) => [ B[i * 3], B[i * 3 + 1], B[i * 3 + 2] ]);
    this.s = P.offset || [ 0, 0, 0 ];
    const L = P.l || [];
    let k = 1;
    this.anillos = [];
    for (let a = 0; a < (L[0] | 0); a++) {
      const c = L[k++] | 0;
      this.anillos.push(L.slice(k, k + c));
      k += c;
    }
    this.de = new Array(n).fill(-1);
    this.anillos.forEach((r, a) => r.forEach(v => {
      if (v < n && this.de[v] < 0) this.de[v] = a;
    }));
    this.ok = this.v.ok && this.anillos.length >= 2 && this.de.every(a => a >= 0);
    if (!this.ok) return;
    const N = this.anillos.length;
    this.C = this.anillos.map(r => [ 0, 1, 2 ].map(c => trunc(r.reduce((s, v) => s + this.V0[v][c], 0) / r.length)));
    this.rotT = [];
    this.reposo = [];
    this.B = [];
    this.A = [];
    this.vecT = [];
    for (let i = 0; i < N - 1; i++) {
      const d = restar(this.C[i + 1], this.C[i]), r = [ ratan2(d[2], d[1]), 0, 0 ];
      this.rotT.push(r.slice());
      this.reposo.push(r.slice());
      this.B.push(r.slice());
      this.A.push([ 0, 0, 0 ]);
      this.vecT.push([ 0, trunc(largo(d)), 0 ]);
    }
    this.B.push([ 0, 0, 0 ]);
    this.A.push([ 0, 0, 0 ]);
    this.rotT.push([ 0, 0, 0 ]);
    this.local = this.V0.map((p, v) => {
      const a = this.de[v];
      return a === 0 ? p.slice() : aplicarT(rotYXZ(...this.reposo[a - 1]), restar(p, this.C[a - 1]));
    });
    const H = P.h || [];
    this.esferas = [];
    for (let e = 0; e < Math.min(8, H[0] | 0); e++) {
      const b = 1 + e * 5;
      this.esferas.push({
        hueso: H[b],
        p: [ H[b + 1], H[b + 2], H[b + 3] ],
        r: H[b + 4],
        c: [ 0, 0, 0 ]
      });
    }
    this.ultima = new Array(N).fill(1e4);
    this.cuenta = new Array(N).fill(0);
    this.giros = new Array(N).fill(0);
    this.guardado = [ 0, 0, 0 ];
    this.velH = Array.from({
      length: 8
    }, () => [ 0, 0, 0 ]);
    this.primero = true;
    this.rot = [ 0, 0, 0 ];
    this.rot0 = null;
    this.pos0 = null;
    this.Cw = [];
    this.Lb = [];
  }
  cuadro() {
    if (!this.ok) return;
    const ses = this.ses, G = ses.op.grupo, H = ses.huesos;
    const cab = H[12];
    if (!cab) return;
    this.dinamica();
    const Mc = matrizJuego(cab, G), Ht = sumar(Mc.t, aplicar(Mc.r, this.s));
    let rot = angulosYXZ(Mc.r);
    const dollY = ses.ctrl.giro, dollY0 = this.dollY0 ?? dollY;
    if (this.rot0 && diffAbs(rot[1], this.rot[1]) > 1536 && !(diffAbs(dollY0, dollY) > 1022 && diffAbs(rot[1], dollY) < 1537)) rot = [ a12(2048 - rot[0]), a12(rot[1] + 2048), a12(rot[2] + 2048) ];
    if (this.pose0 !== undefined && ses.poseN !== this.pose0 && diffAbs(rot[1], dollY) > 1023) rot = [ a12(2048 - rot[0]), a12(rot[1] + 2048), a12(rot[2] + 2048) ];
    this.pose0 = ses.poseN;
    this.dollY0 = dollY;
    this.rot = rot;
    this.Mb8 = {
      r: rotYXZ(0, rot[1], 0),
      t: Ht
    };
    this.M298 = rotYXZ(rot[0], 0, rot[2]);
    this.Mh = [];
    for (const e of this.esferas) {
      const b = H[e.hueso];
      if (!b) continue;
      const m = matrizJuego(b, G);
      this.Mh[e.hueso] = m;
      e.c = sumar(aplicar(m.r, e.p), m.t);
    }
    this.cadena();
    const M = this.Mb8;
    this.Cw = this.C.map(c => sumar(aplicar(M.r, c), M.t));
    this.Lb = this.esferas.map(e => {
      const m = this.Mh[e.hueso];
      return m ? this.Cw.map(c => aplicarT(m.r, restar(c, m.t))) : null;
    });
    this.vertices();
    const r = M.r, t = M.t;
    this.o.matrix.set(r[0], r[1], r[2], t[0] / 1e3, r[3], r[4], r[5], t[1] / 1e3, r[6], r[7], r[8], t[2] / 1e3, 0, 0, 0, 1);
    this.o.matrixWorldNeedsUpdate = true;
  }
  dinamica() {
    const N = this.anillos.length, M = this.Mb8;
    for (let k = 7; k > 0; k--) this.velH[k] = this.velH[k - 1];
    const corr = this.ses.correccion || [ 0, 0, 0 ];
    if (M && this.pos0) this.velH[0] = aplicarT(M.r, restar(restar(M.t, corr), this.pos0)).map(Math.trunc);
    if (M) this.pos0 = M.t.slice();
    const vel = [ 0, 1, 2 ].map(c => trunc(this.velH.reduce((a, v) => a + v[c], 0) / 6));
    let dr = [ 0, 0, 0 ];
    if (this.rot0) {
      dr = [ -diffS(this.rot[0], this.rot0[0]), -diffS(this.rot[1], this.rot0[1]), -diffS(this.rot0[2], this.rot[2]) ];
      if (Math.abs(dr[1]) > 512) dr = [ 0, 0, 0 ];
    }
    this.rot0 = this.rot.slice();
    const amort = v => v < 1 ? Math.min(0, v + 16) : Math.max(0, v - 16);
    dr = dr.map(amort);
    let hx = 0, hz = 0;
    for (let i = 0; i < N; i++) {
      const B = this.B[i], A = this.A[i], out = this.rotT[i], antes = B.slice();
      B[0] = a12(B[0] + dr[0]);
      B[1] = 0;
      B[2] = a12(B[2] + dr[2]);
      B[0] -= trunc(hx / 3);
      B[2] -= trunc(hz / 3);
      if (i === 0) A[0] = this.reposo[0][0]; else this.adelante(i, vel, A);
      if (i === 1 && this.reposo[1] && A[0] < this.reposo[1][0]) A[0] = this.reposo[1][0];
      this.costado(i, vel, A);
      this.vertical(i, vel, A);
      this.latigazo(i, dr, A);
      this.resorte(i, B, A, out, N);
      if (i === 0) {
        const v = a12(this.reposo[0][0] + this.rot[0]);
        A[0] = v;
        B[0] = v;
        const z = B[2] << 16 >> 16;
        if (z > 256) {
          B[2] = 256;
          A[2] = 256;
        } else if (z < -256) {
          B[2] = 65280 & 4095;
          A[2] = B[2];
        }
      }
      if (i === 1 && this.reposo[1] && A[0] < this.reposo[1][0]) A[0] = this.reposo[1][0];
      hx = diffS(out[0], antes[0]);
      hz = diffS(out[2], antes[2]);
    }
    if (Math.abs(this.guardado[1]) < Math.abs(dr[1])) this.guardado[1] = dr[1];
  }
  factor(i, v, zona, tope) {
    v = v < 1 ? Math.min(0, v + zona) : Math.max(0, v - zona);
    let k = tope ? Math.min(8, Math.abs(v)) : Math.max(1, Math.min(64, Math.abs(v) * 2) - 4 * i);
    if (this.cuenta[i - 1]) k = trunc(k / 8);
    return [ v, k ];
  }
  adelante(i, vel, A) {
    const [v, k] = this.factor(i, vel[2], 4);
    let x = a12(v * k + 2048);
    A[0] = x < 1024 ? 1024 : x > 3072 ? 3072 : x;
  }
  costado(i, vel, A) {
    const [, k] = this.factor(i, vel[0], 12);
    const z = a12(vel[0] * k);
    A[2] = z > 1024 && z < 2048 ? 1024 : z > 2048 && z < 3072 ? 3072 : z;
  }
  vertical(i, vel, A) {
    const [, k0] = this.factor(i, vel[1], 12, true), k = k0, vy = vel[1], x0 = A[0];
    if (A[0] !== 2048) {
      if (A[0] << 16 >> 16 <= 2048) {
        A[0] = a12(A[0] + vy * k);
        if (A[0] > 2048) A[0] = 2048;
      } else {
        A[0] = a12(A[0] - vy * k);
        if (A[0] < 2048) A[0] = 2048;
      }
    }
    if (i === 0 && A[0] < x0) A[0] = x0;
    if (A[2] !== 0 && A[2] << 16 >> 16 > 0) A[2] = a12(A[2] - vy * k);
  }
  latigazo(i, dr, A) {
    if (i < 2) return;
    const a = Math.abs(dr[1]), b = Math.abs(this.guardado[1]);
    if (b < a) {
      A[2] = a12(A[2] - dr[1] * 8);
      A[0] = a12(A[0] + a * 2);
      this.giros[i] = 16;
      return;
    }
    if (this.giros[i] > 0) {
      A[0] = a12(A[0] + b * 2);
      const c = this.giros[i]--;
      A[2] = a12(A[2] - this.guardado[1] * (c - 9));
      if (this.giros[i] === 0) this.guardado[1] = 0;
    }
  }
  resorte(i, B, A, out, N) {
    B[1] = 0;
    B[0] = a12(B[0]);
    B[2] = a12(B[2]);
    A[1] = 0;
    A[0] = a12(A[0]);
    A[2] = a12(A[2]);
    const d1 = diffAbs(B[0], 2048), d3 = diffAbs(A[0], 2048);
    let r = d3 < d1 ? d1 > 768 ? 96 : 54 : d1 > 768 ? 112 : 80;
    r += d1 >> 5;
    r -= trunc(r / N) * i;
    r = Math.max(d1 <= 768 ? 16 : 64, r);
    out[0] = a12(acercarAng(B[0], A[0], r));
    const z1 = diffAbs(B[2], 0), z2 = diffAbs(A[2], 0);
    let rz = z2 < z1 ? z1 > 768 ? 96 : 54 : z1 > 768 ? 112 : 80;
    rz += d1 >> 5;
    rz -= trunc(rz / N) * i;
    rz = Math.max(Math.abs(z1 - z2) <= 768 ? 16 : 64, rz);
    out[2] = a12(acercarAng(B[2], A[2], rz));
    out[1] = 0;
  }
  cadena() {
    const N = this.anillos.length;
    this.F = [];
    let cur = this.C[0].slice();
    for (let i = 0; i < N - 1; i++) {
      let m = rotYXZ(...this.rotT[i]);
      let next = sumar(cur, aplicar(m, this.vecT[i]));
      m = this.choque(i, cur, next, m) || m;
      next = this._next || next;
      this.C[i + 1] = next;
      this.F[i] = m;
      cur = next;
    }
  }
  choque(i, cur, next, m) {
    this._next = null;
    if (this.primero) {
      this.primero = false;
      return null;
    }
    if (i <= 0) return null;
    const M = this.Mb8;
    const nw = sumar(aplicar(M.r, next), M.t);
    const r = this.esferasChoque(i, cur, nw);
    const B = this.B[i], T = this.rotT[i];
    if (!r) {
      if (!this.cuenta[i]) {
        B[0] = T[0];
        B[1] = T[1];
        B[2] = T[2];
        return null;
      }
      B[0] = a12(acercarAng(B[0], T[0], 32));
      B[2] = a12(acercarAng(B[2], T[2], 32));
      const mb = rotYXZ(B[0], 0, B[2]);
      this._next = sumar(cur, aplicar(mb, this.vecT[i]));
      this.cuenta[i]--;
      return mb;
    }
    const d = r.delta;
    const rx = ratan2(d[2], d[1]), rz = a12(ratan2(d[1], d[2]) + 1024);
    T[0] = a12(acercarAng(T[0], rx, 64));
    T[2] = a12(acercarAng(T[2], rz << 16 >> 16, 64));
    T[1] = 0;
    const mt = rotYXZ(T[0], 0, T[2]);
    this._next = sumar(cur, aplicar(mt, this.vecT[i]));
    B[0] = rx;
    B[1] = 0;
    B[2] = rz;
    this.cuenta[i] = 1;
    return mt;
  }
  esferasChoque(i, cur, nw) {
    const M = this.Mb8;
    let best = 3e4, bestJ = 1e4, hallado = null, guardaQ = null, p = nw;
    this.esferas.forEach((e, j) => {
      if (largo(restar(p, e.c)) >= e.r) return;
      const m = this.Mh[e.hueso], L = this.Lb[j];
      if (!m || !L || !L[i + 1]) return;
      const q = sumar(aplicar(m.r, L[i + 1]), m.t);
      const pp = p.slice(), dd = afuera(pp, q, e.c, e.r);
      if (dd >= 0 && dd < best) {
        guardaQ = q;
        const loc = aplicarT(M.r, restar(pp, M.t));
        hallado = {
          delta: restar(loc, cur)
        };
        p = sumar(cur, hallado.delta);
        best = dd;
        bestJ = j;
      }
    });
    if (bestJ !== 1e4 && this.ultima[i] === bestJ && guardaQ) {
      const loc = aplicarT(M.r, restar(guardaQ, M.t));
      hallado = {
        delta: restar(loc, cur)
      };
    }
    this.ultima[i] = bestJ;
    return hallado;
  }
  vertices() {
    const out = this.out ||= new Array(this.V0.length * 3);
    const P = this.V0.map((p, v) => {
      const a = this.de[v];
      return a === 0 ? aplicar(this.M298, this.local[v]) : sumar(aplicar(this.F[a - 1], this.local[v]), this.C[a - 1]);
    });
    const r0 = this.anillos[0], R = this.Mb8.r, ref = aplicar(R, this.V0[r0[0]]);
    let bi = 0, bd = Infinity;
    r0.forEach((v, k) => {
      const d = largo(restar(aplicar(R, P[v]), ref));
      if (d < bd) {
        bd = d;
        bi = k;
      }
    });
    const rot = r0.map((_, k) => P[r0[(bi + k) % r0.length]]);
    r0.forEach((v, k) => {
      P[v] = rot[k];
    });
    P.forEach((p, v) => {
      out[v * 3] = p[0];
      out[v * 3 + 1] = p[1];
      out[v * 3 + 2] = p[2];
    });
    this.v.escribir(out);
  }
}

function afuera(p, q, c, r) {
  let lejos = q.slice(), dP = largo(restar(p, c)), dQ = largo(restar(lejos, c));
  if (dQ < dP) {
    const t = p.slice();
    p[0] = lejos[0];
    p[1] = lejos[1];
    p[2] = lejos[2];
    lejos = t;
    dQ = dP;
  }
  if (dQ <= r) {
    let v = restar(lejos, p), L = largo(v);
    if (L === 0) {
      v = [ 0, 0, lejos[2] < c[2] ? -8 : 8 ];
      L = 8;
    }
    for (let n = 0; n < 400; n++) {
      const k = (L + 8) / L;
      v = v.map(x => x * k);
      L += 8;
      lejos = sumar(p, v);
      if (largo(restar(lejos, c)) > r + 16) break;
    }
  }
  const v = restar(p, lejos), L = largo(v);
  let paso = 8, ult = p.slice(), ultV = v;
  for (let n = 0; n < 400 && L > 0; n++) {
    const w = v.map(x => x * paso / L), q2 = sumar(lejos, w);
    paso += 8;
    if (largo(restar(c, q2)) <= r || L <= paso) break;
    ult = q2;
    ultV = w;
  }
  p[0] = ult[0];
  p[1] = ult[1];
  p[2] = ult[2];
  return largo(ultV);
}
