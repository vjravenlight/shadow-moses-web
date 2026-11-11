// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { cargarSgt, poligono, linea, rgb, calc, W0, H0, ALTO_FRAME } from "./mira_scope.js";

import { textoMenu, anchoTextoMenu, cargarAtlasHud } from "./hud.js";

const FPS = 30, ANG = Math.PI * 2 / 4096;

const ESPERA_MASCARA = 9;

const CAPAS = {
  camara: [ "camera", "camera_2" ],
  mascara: [ "mask" ],
  nvg: [ "nv_ggle1", "nv_ggle2", "nv_ggle3" ],
  termica: [ "ir_ggle1", "ir_ggle2", "ir_ggle3" ],
  rifle: [ "rifle1", "rifle3", "rifle2" ]
};

const MUEVEN = {
  camara: {},
  nvg: {
    capas: [ [ 1, 2, 20, false, false ], [ 2, 1, 12, true, true ] ]
  },
  termica: {
    capas: [ [ 1, 2, 20, false, false ], [ 2, 1, 12, true, true ] ]
  },
  rifle: {
    capas: [ [ 0, 1, 8, false, false ], [ 1, 1, 8, false, false ] ]
  }
};

const SIN_OCULTAR = new Set([ "caja", "mascara", "nvg", "termica" ]);

const COLORES = {
  stinger: {
    libre: [ 45, 150, 150 ],
    fijado: [ 235, 40, 40 ]
  },
  nikita: {
    libre: [ 45, 140, 70 ],
    fijado: [ 150, 40, 40 ]
  }
};

const _v = new THREE.Vector3, _w = new THREE.Vector3;

const CARTON = [ 52, 38, 22 ];

function bordeDifuso(x, v, c, t = [ 0, 0, 0 ]) {
  const N = 16, a0 = c[0][0] / 255, porLado = c[0][0] !== c[1][0], a1 = (porLado ? c[1][0] : c[2][0]) / 255;
  const [a, b, d, e] = porLado ? v : [ v[0], v[2], v[1], v[3] ];
  const mezcla = (p, q, t) => [ p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t ];
  for (let k = 0; k < N; k++) {
    const t0 = k / N, t1 = (k + 1) / N;
    x.fillStyle = rgb(t, a0 + (a1 - a0) * (k + .5) / N);
    poligono(x, [ mezcla(a, b, t0), mezcla(a, b, t1), mezcla(d, e, t0), mezcla(d, e, t1) ]);
  }
}

const pedidosRifle = new Set;

export function miraRifleEscena(dueño, si) {
  if (si) pedidosRifle.add(dueño); else pedidosRifle.delete(dueño);
}

export const hayMiraRifleEscena = () => pedidosRifle.size > 0;

export class MiraArma {
  constructor({base: base = "assets/", contenedor: contenedor = null, z: z = 3, se: se = null} = {}) {
    this.se = se;
    this.sgt = {};
    this.tipo = null;
    this.t = 0;
    this.acum = 0;
    this.vr = false;
    this.blancos = [];
    this.lock = false;
    for (const n of [ "stinger", "nikita", "cb_box", ...new Set(Object.values(CAPAS).flat()) ]) cargarSgt(n, base).then(j => {
      this.sgt[n] = j;
    });
    this.atlas = false;
    try {
      cargarAtlasHud().then(ok => {
        this.atlas = !!ok;
      });
    } catch {}
    if (typeof document !== "undefined") {
      const cv = document.createElement("canvas");
      cv.id = "miraarmacv";
      cv.style.cssText = `position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:${z};image-rendering:pixelated;display:none`;
      (contenedor || document.body).appendChild(cv);
      this.cv = cv;
      this.x = cv.getContext("2d");
    }
  }
  get _dibujo() {
    const capas = CAPAS[this.tipo];
    if (capas) {
      this._armados ||= {};
      if (!this._armados[this.tipo] && capas.every(n => this.sgt[n])) {
        this._armados[this.tipo] = {
          cuadros: Math.max(...capas.map(n => this.sgt[n].cuadros)),
          prims: capas.flatMap((n, c) => this.sgt[n].prims.map(p => ({
            ...p,
            capa: c,
            v: p.v?.map(q => [ q[0], q[1] > 2048 ? q[1] - 4096 : q[1] ])
          })))
        };
      }
      return this._armados[this.tipo] || null;
    }
    return this.tipo === "caja" ? this.sgt.cb_box : this.sgt[this.tipo];
  }
  get visible() {
    return !!this.tipo && !!this._dibujo;
  }
  get ocultaArma() {
    return !!this.tipo && !SIN_OCULTAR.has(this.tipo) && !this.vr;
  }
  get firma() {
    return this.visible ? `${this.atlas}|${this.tipo}|${this.tipo === "caja" ? Math.min(this.t, this._dibujo.cuadros + 1) : this.t}|${this.lock}|${this.blancos.map(b => b.join()).join(";")}` : "";
  }
  actualizar(dt, e = {}) {
    this.vr = !!e.vr;
    if (e.tipo !== this.tipo) {
      this.tipo = e.tipo || null;
      this.t = e.rapida ? 1e5 : 0;
      this.acum = 0;
      this.despl = [ [ 0, 0 ], [ 0, 0 ], [ 0, 0 ] ];
      this.respiro = 0;
      this.angPrevio = null;
      if (this.tipo === "camara") this.se?.(21);
    }
    if (!this.tipo) {
      this.blancos = [];
      this.lock = false;
      return;
    }
    this.acum += Math.min(dt, .25) * FPS;
    let cuadros = 0;
    while (this.acum >= 1) {
      this.acum -= 1;
      this.t++;
      cuadros++;
    }
    if (this.tipo === "mascara" && this.t > ESPERA_MASCARA) for (let k = 0; k < cuadros; k++) if (++this.respiro === 45) {
      this.respiro = 0;
      this.se?.(114);
    }
    if (MUEVEN[this.tipo]) {
      this.zoom = Math.round(e.zoom ?? 320);
      this.ang = [ 0, 0 ];
      if (e.camara?.getWorldDirection) {
        const d = e.camara.getWorldDirection(_v);
        this.ang = [ Math.round(Math.asin(Math.max(-1, Math.min(1, d.y))) / ANG), (Math.round((Math.atan2(-d.x, -d.z) + Math.PI) / ANG) % 4096 + 4096) % 4096 ];
      }
      this._moverCapas(cuadros);
    }
    if (this.tipo === "stinger") this._moverStinger(cuadros, e.camara);
    this._medirBlancos(e.camara, e.armas);
  }
  _moverStinger(cuadros, cam) {
    const St = this.stn ||= {
      pitch: 0,
      yaw: 0,
      ant: null,
      dx: 0,
      dy: 0,
      barras: Array.from({
        length: 32
      }, () => Math.random() * 512)
    };
    if (cam?.getWorldDirection) {
      const d = cam.getWorldDirection(_v);
      St.pitch = Math.round(Math.asin(Math.max(-1, Math.min(1, d.y))) / ANG);
      St.yaw = Math.round(Math.atan2(-d.x, -d.z) / ANG);
    }
    const a = St.ant;
    St.ant = [ St.pitch, St.yaw ];
    if (!a || !cuadros) return;
    const dyaw = (St.yaw - a[1] + 6144) % 4096 - 2048, dp = St.pitch - a[0];
    const sx = dyaw > 1 ? -1 : dyaw < -1 ? 1 : 0, sy = dp > 1 ? -1 : dp < -1 ? 1 : 0;
    for (let k = 0; k < cuadros; k++) {
      if (sx && Math.abs(St.dx) < 8) St.dx += sx; else if (!sx && St.dx) St.dx -= Math.sign(St.dx);
      if (sy && Math.abs(St.dy) < 8 && Math.abs(St.pitch) !== 512) St.dy += sy; else if (!sy && St.dy) St.dy -= Math.sign(St.dy);
      for (let i = 0; i < St.barras.length; i++) St.barras[i] = Math.max(0, Math.min(511, St.barras[i] + (Math.random() - .5) * 120));
    }
  }
  _rayasStinger(x, ox, oy) {
    const St = this.stn;
    if (!St) return;
    const CIAN = [ 46, 65, 65 ], VERDE = [ 135, 177, 104 ], GRIS = [ 114, 121, 127 ], NUM = [ 104, 111, 116 ];
    const tr = v => Math.trunc(v), L = (pts, c) => {
      x.fillStyle = rgb(c);
      linea(x, pts.map(([a, b]) => [ a + ox, b + oy ]), null);
    };
    const v3 = St.pitch;
    let v4 = 5 * tr(tr(v3 / 32) / 5), v5 = tr(16 * (tr(v3 / 32) % 5) / 5) + 112;
    while (v5 >= 31) {
      v5 -= 16;
      v4 += 5;
    }
    for (let v6 = v5 + 16, v7 = v4 - 5; v6 < 210; v6 += 16, v7 -= 5) {
      const n = Math.abs(v7) < 10 ? v7 < 0 ? "-0" + -v7 : "0" + v7 : String(v7);
      textoMenu(x, 40 + ox, v6 - 2 + oy, n, NUM);
      L([ [ 42, v6 - 1 ], [ 42, v6 + 1 ], [ 42, v6 ], [ 45, v6 ] ], CIAN);
      if (v7 % 10 !== 0) continue;
      const y = v6 + St.dy;
      x.fillStyle = rgb(VERDE);
      x.fillRect(47 + ox, y + oy, 1, 1);
      L([ [ 18, y - 4 ], [ 41, y - 4 ], [ 41, y + 4 ], [ 18, y + 4 ] ], CIAN);
      L([ [ 18, y - 4 ], [ 18, y + 4 ] ], CIAN);
    }
    const P = [ [ 147, 117 ], [ 147, 104 ], [ 159, 116 ], [ 171, 104 ], [ 171, 117 ], [ 144, 120 ], [ 144, 123 ], [ 174, 123 ], [ 174, 120 ] ];
    const dx = St.dx, b1 = St.dy < 0 ? St.dy : 0, b2 = St.dy > 0 ? St.dy : 0, m = (p, ax, ay) => [ p[0] + ax, p[1] + ay ];
    L([ P[0], P[1], P[2], P[3] ].map(p => m(p, dx, b1)), GRIS);
    L([ P[3], P[4] ].map(p => m(p, dx, b1)), GRIS);
    L([ P[5], P[6], P[7], P[8] ].map(p => m(p, -dx, b2)), GRIS);
    x.fillStyle = rgb(CIAN, .5);
    for (let i = 0, s2 = 24; i < St.barras.length; i++) {
      const w = tr(St.barras[i] / 10), v1 = s2 + w;
      if (v1 > 240) break;
      x.fillRect(s2 + ox, 20 + oy, w, 5);
      s2 += w + 1;
    }
  }
  _moverCapas(cuadros) {
    const M = MUEVEN[this.tipo], a = this.ang, p = this.angPrevio;
    this.angPrevio = a;
    if (!p || !M.capas || !cuadros || this.t < 10) return;
    const dv = (a[1] - p[1] + 6144) % 4096 - 2048, dp = a[0] - p[0];
    const sx = dv < -1 ? 1 : dv > 1 ? -1 : 0, sy = dp > 1 ? -1 : dp < -1 ? 1 : 0;
    for (let k = 0; k < cuadros; k++) for (const [c, sens, max, inv, soloX] of M.capas) {
      const d = this.despl[c], paso = (i, s) => {
        if (s) d[i] = Math.max(-max, Math.min(max, d[i] + (inv ? -s : s) * sens)); else if (d[i] > 0) d[i] = Math.max(0, d[i] - sens); else if (d[i] < 0) d[i] = Math.min(0, d[i] + sens);
      };
      paso(0, sx);
      if (!soloX) paso(1, sy);
    }
  }
  _hudAntiparras(x, ox, oy) {
    const col = this.tipo === "nvg" ? [ 255, 0, 0 ] : [ 65, 160, 74 ], rgbT = rgb(col, .5), vy = this.ang[1];
    const a4 = Math.trunc(vy % 64 * 24 / 64) + 160;
    let X = a4 - Math.trunc(a4 / 24) * 24, n = Math.trunc(vy / 64) + Math.trunc(a4 / 24);
    x.fillStyle = rgbT;
    for (;X < 300; X += 24, n--) {
      if (X < 20) continue;
      const v = n >= 65 ? n - 64 : n < 0 ? -n : n > 32 ? 64 - n : n, s = String(v).padStart(2, "0");
      textoMenu(x, X + ox - (anchoTextoMenu(s) >> 1), 148 + oy, s, col);
      x.fillRect(X + ox, 144 + oy, 1, 1);
    }
    if ((this.t + 16) % 33 - 16 > 0) textoMenu(x, 41 + ox, 42 + oy, "SCAN", col);
    textoMenu(x, 137 + ox, 42 + oy, this.tipo === "nvg" ? "MODE - B" : "MODE - A", col);
    [ 8 * (vy & 2047), 4 * (vy & 4095), 16 * (vy & 1023) ].forEach((v, k) => textoMenu(x, 40 + ox, 56 + 8 * k + oy, String(v), col));
    const barra = (k, v) => {
      const h = v < 32 ? 64 - v : v, P = 40 + 12 * k;
      x.fillStyle = rgbT;
      x.fillRect(P + ox, 140 - h + oy, 3, h);
      x.fillRect(P + 3 + ox, 140 - h + oy, 3, 1);
    };
    barra(0, (vy + 1024 & 2047) >> 5);
    barra(1, vy >> 6);
    barra(2, (vy - 1024 & 1023) >> 4);
  }
  _medirBlancos(cam, armas) {
    const out = [];
    this.lock = !!armas?.fijado;
    if (cam && armas?.guardias) {
      cam.updateMatrixWorld?.();
      for (const g of armas.guardias()) {
        if (g.inactivo || !g.o?.visible) continue;
        _v.copy(g.o.position);
        _v.y += .9;
        _w.copy(_v);
        _w.y += .54;
        _v.project(cam);
        _w.project(cam);
        if (_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1 || Math.abs(_v.y) > 1) continue;
        out.push([ +_v.x.toFixed(3), +_v.y.toFixed(3), +Math.abs(_w.y - _v.y).toFixed(3), armas.fijado === g ? 1 : 0 ]);
      }
      for (const t of armas.blancosGrandes?.() || []) {
        _v.set(t.c.x / 1e3, t.c.y / 1e3, t.c.z / 1e3);
        _w.copy(_v);
        _w.y += t.alto;
        _v.project(cam);
        _w.project(cam);
        if (_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1 || Math.abs(_v.y) > 1) continue;
        out.push([ +_v.x.toFixed(3), +_v.y.toFixed(3), +Math.abs(_w.y - _v.y).toFixed(3), t.fijado ? 1 : 0 ]);
      }
    }
    this.blancos = out;
  }
  pintar(x, ox, oy, Wu, Hu) {
    if (!this.visible) return false;
    const S = this._dibujo, s = this.tipo === "mascara" ? this.t - ESPERA_MASCARA : this.t, fin = s > S.cuadros;
    if (s < 0) return true;
    ox = Math.round(ox);
    oy = Math.round(oy);
    const borde = p => {
      const X = p[0] <= 0 ? -ox : p[0] >= W0 ? Wu - ox : p[0], Y = p[1] <= 0 ? -oy : p[1] >= ALTO_FRAME ? Hu - oy : p[1];
      return [ X + ox, Y + oy ];
    };
    const verts = p => p.v.map((v, k) => {
      const a = p.anim?.[k], o = p.capa != null ? this.despl?.[p.capa] : null, ex = o ? o[0] : 0, ey = o ? o[1] : 0;
      if (!a || fin) return [ v[0] + ex, v[1] + ey ];
      const d = Math.min(Math.max(s, a[0]), a[1]) - a[1];
      return [ v[0] + calc(d, a[2]) + ex, v[1] + calc(d, a[3]) + ey ];
    });
    const parpadea = p => p.parpadeo && s % p.parpadeo[0] < p.parpadeo[1];
    for (let i = S.prims.length - 1; i >= 0; i--) {
      const p = S.prims[i];
      if (p.tipo === "texto" || parpadea(p)) continue;
      if (this.tipo === "camara" && this.vr && p.tipo === "poly") continue;
      const v = verts(p).map(borde);
      const carton = this.tipo === "caja" ? CARTON : null;
      if (p.tipo === "poly" && p.gouraud && p.abr === 2 && v.length === 4) {
        bordeDifuso(x, v, p.color, carton || undefined);
        continue;
      }
      if (p.semi && p.abr === 2 && !carton && !p.gouraud) x.fillStyle = `rgba(0,0,0,${p.color[0] / 255})`; else x.fillStyle = rgb(carton || (p.gouraud ? p.color[0] : p.color), p.semi ? .5 : 1);
      if (p.tipo === "poly") poligono(x, v); else linea(x, v, p.semi ? new Set : null);
    }
    if (this.tipo === "stinger" && this.t >= 8) this._rayasStinger(x, ox, oy);
    const C = COLORES[this.tipo];
    for (const [nx, ny, nh, fijado] of this.blancos) {
      const cx = Math.round((nx + 1) / 2 * Wu), cy = Math.round((1 - ny) / 2 * Hu), h = Math.max(6, Math.round(nh / 2 * Hu));
      x.fillStyle = rgb(fijado ? C.fijado : C.libre);
      linea(x, [ [ cx - h, cy - h ], [ cx + h, cy - h ], [ cx + h, cy + h ], [ cx - h, cy + h ], [ cx - h, cy - h ] ], null);
    }
    for (const p of S.prims) {
      if (p.tipo !== "texto" || parpadea(p)) continue;
      const [v] = verts(p);
      textoMenu(x, v[0] + ox, v[1] + oy, p.texto, p.color);
    }
    if ((this.tipo === "nvg" || this.tipo === "termica") && this.t >= 6) this._hudAntiparras(x, ox, oy);
    if (this.tipo === "camara") {
      const n = (v, a = 4) => String(v).padStart(a, " ");
      textoMenu(x, 200 + ox, 25 + oy, `zoom  : ${n(this.zoom)}`, [ 192, 144, 128 ]);
      textoMenu(x, 200 + ox, 33 + oy, `angle : ${n(this.ang[0])}, ${n(this.ang[1])}`, [ 192, 144, 128 ]);
    }
    if (this.vr && this.tipo === "stinger" && this.lock && (s >> 3 & 1) === 0) textoMenu(x, 180 + ox, 16 + oy, "LOCK_ON", [ 60, 200, 200 ]);
    return true;
  }
  lienzo(Wu, Hu, ox, oy, clave = "_buf") {
    Wu = Math.max(1, Math.ceil(Wu));
    Hu = Math.max(1, Math.ceil(Hu));
    let c = this[clave];
    if (!c) c = this[clave] = document.createElement("canvas");
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
    if (!this.visible || this.vr) {
      if (cv.style.display !== "none") cv.style.display = "none";
      return;
    }
    if (cv.style.display !== "block") cv.style.display = "block";
    const dpr = Math.min(3, typeof devicePixelRatio === "number" && devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    const firma = `${this.firma}|${W}|${H}`;
    if (this.tipo === "caja" && firma === this._firmaPC) return;
    this._firmaPC = firma;
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
    if (!paneles?.agregar || paneles.panel?.("mira_arma")) return null;
    const MC = [ 320, 240 ];
    paneles.agregar({
      id: "mira_caja",
      tipo: "visera",
      prio: 2,
      pixel: true,
      logico: {
        w: 1536,
        h: 1152
      },
      visible: () => this.visible && this.vr && (this.tipo === "caja" || this.tipo === "mascara"),
      lienzo: () => {
        const f = this.firma;
        if (!this._bufCaja || f !== this._firmaCaja) {
          this._firmaCaja = f;
          this.lienzo(W0 + 2 * MC[0], H0 + 2 * MC[1], MC[0], MC[1], "_bufCaja");
        }
        return this._bufCaja;
      },
      firma: () => this.firma
    });
    const M = [ 40, 30 ];
    return paneles.agregar({
      id: "mira_arma",
      tipo: "visera",
      prio: 2,
      pixel: true,
      logico: {
        w: 640,
        h: 480
      },
      visible: () => this.visible && this.vr && this.tipo !== "caja" && this.tipo !== "mascara",
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
}
