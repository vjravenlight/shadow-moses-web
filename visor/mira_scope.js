// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { textoMenu, anchoTextoMenu, cargarAtlasHud } from "./hud.js";

const W0 = 320, H0 = 240, ALTO_FRAME = 224, FPS = 30;

const ANG = Math.PI * 2 / 4096;

const HUD_DISP_DELAY = 16;

const CIAN_OSCURO = [ 46, 65, 65 ], VERDE_CLARO = [ 135, 177, 104 ], VERDE_OSCURO = [ 71, 113, 40 ];

export const SE_MIRA = {
  ABRIR: 21,
  ZOOM: 36
};

export const FILTRO_ANTIPARRAS = {
  nvg: "grayscale(1) brightness(1.8) sepia(1) hue-rotate(52deg) saturate(2.6) contrast(1.05)",
  termica: "grayscale(1) sepia(1) saturate(7) hue-rotate(-42deg) brightness(0.62) contrast(1.15)"
};

const _sgt = new Map;

export function cargarSgt(nombre, base = "assets/") {
  const k = base + nombre;
  if (!_sgt.has(k)) _sgt.set(k, fetch(`${base}hud/sgt/${nombre}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
  return _sgt.get(k);
}

function calc(d, m) {
  let v = d * m;
  if (v < 0) v += 3;
  return v >> 2;
}

const trunc = Math.trunc;

const rgb = (c, a = 1) => a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function triangulo(x, a, b, c) {
  const v = [ a, b, c ].sort((p, q) => p[1] - q[1]);
  const [p0, p1, p2] = v;
  const y0 = Math.ceil(p0[1]), y2 = Math.ceil(p2[1]);
  const xEn = (p, q, y) => q[1] === p[1] ? p[0] : p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
  for (let y = y0; y < y2; y++) {
    const xa = xEn(p0, p2, y), xb = y < p1[1] ? xEn(p0, p1, y) : xEn(p1, p2, y);
    const l = Math.ceil(Math.min(xa, xb)), r = Math.ceil(Math.max(xa, xb));
    if (r > l) x.fillRect(l, y, r - l, 1);
  }
}

function poligono(x, v) {
  if (v.length === 4) {
    const xs = v.map(p => p[0]), ys = v.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const rect = v.every(p => (p[0] === x0 || p[0] === x1) && (p[1] === y0 || p[1] === y1)) && new Set(v.map(p => p.join())).size === 4;
    if (rect) {
      if (x1 > x0 && y1 > y0) x.fillRect(x0, y0, x1 - x0, y1 - y0);
      return;
    }
    triangulo(x, v[0], v[1], v[2]);
    triangulo(x, v[1], v[2], v[3]);
  } else triangulo(x, v[0], v[1], v[2]);
}

function linea(x, v, vistos) {
  for (let i = 0; i + 1 < v.length; i++) {
    let [x0, y0] = v[i];
    const [x1, y1] = v[i + 1];
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    if (dy === 0 || dx === 0) {
      const xa = Math.min(x0, x1), ya = Math.min(y0, y1), w = dx + 1, h = -dy + 1;
      if (!vistos) {
        x.fillRect(xa, ya, w, h);
        continue;
      }
      for (let yy = ya; yy < ya + h; yy++) for (let xx = xa; xx < xa + w; xx++) {
        const k = xx * 4096 + yy;
        if (!vistos.has(k)) {
          vistos.add(k);
          x.fillRect(xx, yy, 1, 1);
        }
      }
      continue;
    }
    let e = dx + dy;
    for (;;) {
      const k = x0 * 4096 + y0;
      if (!vistos || !vistos.has(k)) {
        vistos?.add(k);
        x.fillRect(x0, y0, 1, 1);
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) {
        e += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        e += dx;
        y0 += sy;
      }
    }
  }
}

const _fr = new THREE.Frustum, _m4 = new THREE.Matrix4, _esf = new THREE.Sphere, _v = new THREE.Vector3, _vc = new THREE.Vector3;

export function histogramaProfundidad(escena, camara, out = new Float32Array(16)) {
  out.fill(0);
  if (!escena || !camara) return out;
  camara.updateMatrixWorld();
  const vista = camara.matrixWorldInverse;
  _m4.multiplyMatrices(camara.projectionMatrix, vista);
  _fr.setFromProjectionMatrix(_m4);
  let presupuesto = 12e3;
  escena.traverseVisible(o => {
    if (!o.isMesh) return;
    const mt = o.material;
    if (mt && !Array.isArray(mt) && (mt.colorWrite === false || mt.visible === false)) return;
    const g = o.geometry, pos = g?.attributes?.position;
    if (!pos) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _esf.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
    if (!_fr.intersectsSphere(_esf)) return;
    const tris = (g.index ? g.index.count : pos.count) / 3, prims = tris / 2;
    if (_esf.radius < 3 || presupuesto <= 0) {
      const z = -_v.copy(_esf.center).applyMatrix4(vista).z * 1e3, b = Math.floor(z / 4096);
      if (b >= 0 && b < 16) out[b] += prims;
      return;
    }
    const n = Math.min(64, Math.ceil(tris)), paso = tris / n, idx = g.index;
    presupuesto -= n;
    for (let i = 0; i < n; i++) {
      const t = Math.floor(i * paso) * 3, vi = idx ? idx.getX(t) : t;
      _v.fromBufferAttribute(pos, vi).applyMatrix4(o.matrixWorld);
      _vc.copy(_v).applyMatrix4(_m4);
      if (Math.abs(_vc.x) > 1 || Math.abs(_vc.y) > 1 || _vc.z > 1 || _vc.z < -1) continue;
      const z = -_v.applyMatrix4(vista).z * 1e3, b = Math.floor(z / 4096);
      if (b >= 0 && b < 16) out[b] += prims / n;
    }
  });
  return out;
}

export class MiraScope {
  constructor({base: base = "assets/", se: se = null, lienzo: lienzo = true, contenedor: contenedor = null, z: z = 3} = {}) {
    this.base = base;
    this.se = se;
    this.sgt = null;
    this.barras = new Float32Array(16);
    this.reiniciar();
    cargarSgt("scope", base).then(j => {
      this.sgt = j;
    });
    this.atlas = false;
    try {
      cargarAtlasHud().then(ok => {
        this.atlas = !!ok;
      });
    } catch {}
    if (lienzo && typeof document !== "undefined") {
      const cv = document.createElement("canvas");
      cv.id = "miracv";
      cv.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z};image-rendering:pixelated;display:none`;
      (contenedor || document.body).appendChild(cv);
      this.cv = cv;
      this.x = cv.getContext("2d");
    }
    this.vr = false;
    this.cuadro = 0;
  }
  reiniciar() {
    this.activo = false;
    this.t = -1;
    this.f62 = 0;
    this.contZoom = 0;
    this.rect = [ 0, 0 ];
    this.zoom = 320;
    this.angulo = 0;
    this._yaw = null;
    this._pitch = null;
    this.acum = 0;
    this.barras?.fill(0);
  }
  get s() {
    return this.t - HUD_DISP_DELAY;
  }
  get visible() {
    return this.activo && !!this.sgt && this.t >= HUD_DISP_DELAY;
  }
  get aceptaPad() {
    return this.activo && this.s >= 8;
  }
  get firma() {
    return this.visible ? `${this.atlas}|${this.t}|${this.zoom}|${this.f62}|${this.rect}|${this.angulo}|${this.barras.join()}` : "";
  }
  actualizar(dt, e = {}) {
    this.vr = !!e.vr;
    if (!e.activo) {
      if (this.activo) this.reiniciar();
      return;
    }
    this.acum += Math.min(dt, .25) * FPS;
    if (!this.activo) {
      this.paso(e);
      this.acum = Math.min(this.acum, 1);
    }
    let n = 0;
    while (this.acum >= 1 && n < 8) {
      this.acum -= 1;
      this.paso(e);
      n++;
    }
    if (this.visible && e.escena && e.camara && (this.cuadro++ & 1) === 0) histogramaProfundidad(e.escena, e.camara, this.barras);
  }
  paso(e = {}) {
    if (!e.activo) {
      if (this.activo) this.reiniciar();
      return;
    }
    if (!this.activo) {
      this.reiniciar();
      this.activo = true;
    }
    this.t++;
    const s = this.s, z = Math.max(320, Math.min(3200, e.zoom ?? 320));
    if (s === 0) this.se?.(SE_MIRA.ABRIR);
    let yaw = null, pitch = null;
    if (e.camara) {
      e.camara.updateMatrixWorld?.();
      const m = e.camara.matrixWorld.elements, fx = -m[8], fy = -m[9], fz = -m[10];
      yaw = Math.atan2(-fx, -fz);
      pitch = Math.asin(Math.max(-1, Math.min(1, fy)));
    }
    if (s >= 8) {
      const mueve = z > this.zoom + .5 ? 1 : z < this.zoom - .5 ? -1 : 0;
      if (mueve > 0) this.f62 = (this.f62 + 1) % 15; else if (mueve < 0) this.f62 = this.f62 === 0 ? 14 : this.f62 - 1;
      if (mueve) {
        if ((this.contZoom & 3) === 0) this.se?.(SE_MIRA.ZOOM);
        this.contZoom++;
      } else this.contZoom = 0;
      const r = this.rect;
      let dy = 0, dp = 0;
      if (!e.sinPad && yaw != null && this._yaw != null) {
        dy = Math.atan2(Math.sin(yaw - this._yaw), Math.cos(yaw - this._yaw)) / ANG;
        dp = (pitch - this._pitch) / ANG;
      }
      const U = .25;
      if (Math.abs(dy) > U || Math.abs(dp) > U) {
        if (dp > U) r[1] = Math.max(-8, r[1] - 1); else if (dp < -U) r[1] = Math.min(8, r[1] + 1);
        if (dy < -U) r[0] = Math.min(8, r[0] + 1); else if (dy > U) r[0] = Math.max(-8, r[0] - 1);
      } else {
        if (r[0]) r[0] += r[0] > 0 ? -1 : 1;
        if (r[1]) r[1] += r[1] > 0 ? -1 : 1;
      }
    }
    this.zoom = z;
    this._yaw = yaw;
    this._pitch = pitch;
    this.angulo = e.angulo != null ? e.angulo : pitch != null && !e.sinPad ? Math.round(pitch / ANG) : 0;
  }
  pintar(x, ox, oy, Wu, Hu) {
    if (!this.visible) return false;
    const S = this.sgt, s = this.s, fin = s > S.cuadros;
    ox = Math.round(ox);
    oy = Math.round(oy);
    const borde = p => {
      const X = p[0] <= 0 ? -ox : p[0] >= W0 ? Wu - ox : p[0], Y = p[1] <= 0 ? -oy : p[1] >= ALTO_FRAME ? Hu - oy : p[1];
      return [ X + ox, Y + oy ];
    };
    const verts = p => p.v.map((v, k) => {
      const a = p.anim?.[k];
      if (!a || fin) return [ v[0], v[1] ];
      const d = Math.min(Math.max(s, a[0]), a[1]) - a[1];
      return [ v[0] + calc(d, a[2]), v[1] + calc(d, a[3]) ];
    });
    const parpadea = p => p.parpadeo && s % p.parpadeo[0] < p.parpadeo[1];
    for (let i = S.prims.length - 1; i >= 0; i--) {
      const p = S.prims[i];
      if (p.tipo === "texto" || parpadea(p)) continue;
      const col = p.gouraud ? p.color[0] : p.color, a = p.semi ? .5 : 1;
      x.fillStyle = rgb(col, a);
      const v = verts(p).map(borde);
      if (p.tipo === "poly") poligono(x, v); else linea(x, v, p.semi ? new Set : null);
    }
    const lado = (xx, y, a) => {
      x.fillStyle = rgb(CIAN_OSCURO, a);
      linea(x, [ [ xx + ox, y + oy ], [ xx + ox, H0 - y + oy ] ], null);
      linea(x, [ [ W0 - xx + ox, y + oy ], [ W0 - xx + ox, H0 - y + oy ] ], null);
    };
    if (s < 8) {
      const temp = Math.min(s, 6), i1 = 12 * temp, paso = trunc(i1 / 4);
      const L = [];
      let xx = W0 - i1;
      for (let i = 0; i < 4; i++) {
        L.push([ xx, 66 - trunc((xx - 258) * 9 / 15) ]);
        xx += paso;
      }
      for (let i = 3; i >= 0; i--) lado(L[i][0], L[i][1], .5);
    } else {
      x.fillStyle = rgb(VERDE_OSCURO, .5);
      for (let j = 15; j >= 0; j--) {
        const n = Math.min(296, Math.floor(this.barras[j] || 0)), h = 178 - trunc(n / 2), xa = 68 + j * 12 + ox, xb = 76 + j * 12 + ox;
        linea(x, [ [ xa, h + oy ], [ xb, h + oy ], [ xb, 178 + oy ] ], new Set);
      }
      const [rx, ry] = this.rect, l = 130 + rx + ox, rr = 189 + rx + ox, t = 102 + ry + oy, b = 137 + ry + oy;
      x.fillStyle = rgb(VERDE_CLARO);
      linea(x, [ [ l, t ], [ l, b ] ], null);
      linea(x, [ [ l, t ], [ rr, t ], [ rr, b ], [ l, b ] ], null);
      const L = [];
      let xx = this.f62 + 258, y = 66 - trunc(this.f62 * 9 / 15);
      for (let i = 0; i < 4; i++) {
        L.push([ xx, y ]);
        xx += 15;
        y -= 9;
      }
      for (let i = 3; i >= 0; i--) lado(L[i][0], L[i][1], .5);
      const zl = trunc((this.zoom - 320) / 16) + 48;
      x.fillStyle = rgb(VERDE_OSCURO);
      linea(x, [ [ 48 + ox, 46 + oy ], [ zl + ox, 46 + oy ], [ zl + ox, 52 + oy ] ], null);
    }
    for (const p of S.prims) {
      if (p.tipo !== "texto" || parpadea(p)) continue;
      const [v] = verts(p);
      textoMenu(x, v[0] + ox, v[1] + oy, p.texto, p.color);
    }
    if (s >= 8) {
      textoMenu(x, 20 + ox, 34 + oy, `- ZOOM LEVEL - - ${100 * trunc(this.zoom / 320)} -`, [ 127, 166, 97 ]);
      const a = String(this.angulo);
      textoMenu(x, 32 + ox - anchoTextoMenu(a), 101 + oy, a, [ 101, 133, 77 ]);
    }
    return true;
  }
  lienzo(Wu, Hu, ox, oy, clave = "_buf") {
    Wu = Math.max(1, Math.ceil(Wu));
    Hu = Math.max(1, Math.ceil(Hu));
    let c = this[clave];
    if (!c) {
      c = this[clave] = document.createElement("canvas");
    }
    if (c.width !== Wu || c.height !== Hu) {
      c.width = Wu;
      c.height = Hu;
    }
    const x = c.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, Wu, Hu);
    x.imageSmoothingEnabled = false;
    this.pintar(x, ox, oy, Wu, Hu);
    return c;
  }
  dibujar() {
    const cv = this.cv;
    if (!cv) return;
    const ver = this.visible && !this.vr;
    if (!ver) {
      if (cv.style.display !== "none") {
        cv.style.display = "none";
      }
      return;
    }
    if (cv.style.display !== "block") cv.style.display = "block";
    const dpr = Math.min(3, typeof devicePixelRatio === "number" && devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const exacta = Math.min(W / W0, H / H0);
    let k = Math.max(1, Math.floor(exacta + 1e-6));
    if (k < exacta * .8) k = exacta;
    const Wu = Math.ceil(W / k), Hu = Math.ceil(H / k), ox = Math.floor((Wu - W0) / 2), oy = Math.floor((Hu - H0) / 2);
    const b = this.lienzo(Wu, Hu, ox, oy);
    const x = this.x;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, W, H);
    x.imageSmoothingEnabled = false;
    x.drawImage(b, 0, 0, Wu, Hu, 0, 0, Wu * k, Hu * k);
  }
  conectarVR(paneles) {
    if (!paneles?.agregar || paneles.panel?.("binoculares")) return null;
    const M = [ 40, 30 ];
    return paneles.agregar({
      id: "binoculares",
      tipo: "visera",
      prio: 2,
      pixel: true,
      logico: {
        w: 640,
        h: 480
      },
      visible: () => this.visible && this.vr,
      lienzo: () => {
        const f = this.firma;
        if (!this._bufVR || f !== this._firmaVR) {
          this._firmaVR = f;
          this.lienzo(W0 + 2 * M[0], H0 + 2 * M[1], M[0], M[1], "_bufVR");
        }
        return this._bufVR;
      },
      firma: () => this.firma
    });
  }
  destruir() {
    this.cv?.remove();
    this.cv = null;
  }
}
