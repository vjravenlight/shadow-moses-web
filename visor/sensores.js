// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { sonido as sonar } from "./juego.js";

import { ducto as ductoSnake } from "./ducto.js";

const MM = .001, FPS = 30, ANG = Math.PI * 2 / 4096;

export const SE = {
  BARRIDO: 94,
  LENTE: 95,
  TRABADA: 109,
  SORPRESA: 83,
  TIRO_GUNCAM: 46,
  CHISPAS: 59,
  EXPLOSION: 41,
  REBOTE_FUERTE: 40,
  REBOTE: 39,
  ITEM: 22,
  LLENO: 11,
  "DAÑO1": 24,
  "DAÑO2": 25
};

const ALT_SNAKE = [ 1100, 496, 136 ];

const HZD_ALTO = [ 750, 250, 250 ];

const DAÑO_GUNCAM = [ 80, 80, 120, 120, 160 ];

const ENTRAR = 3538, SALIR = 54732, KILL = 12835;

const SEG_NO_NAVIGATE = 2, SEG_NO_PLAYER = 4;

const trunc = Math.trunc;

const and12 = a => (a % 4096 + 4096) % 4096;

const ratan2 = (y, x) => Math.round(Math.atan2(y, x) / ANG);

const difAbs = (a, b) => {
  const d = and12(a - b);
  return d > 2048 ? 4096 - d : d;
};

const difS = (a, b) => {
  const d = and12(b - a);
  return d <= 2048 ? d : d - 4096;
};

const rnd = () => Math.floor(Math.random() * 32768);

const randU = n => rnd() & n - 1;

const randS = n => (rnd() & 2 * n - 1) - n;

const rsin = a => Math.round(Math.sin(a * ANG) * 4096);

const TIME_INV = [ 0, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256 ];

const nearPhase = (f, t) => {
  let d = and12(f - t);
  if (d > 2048) d -= 4096;
  return t + d;
};

const nearExp4P = (f, t) => {
  const g = nearPhase(f, t), d = t - g;
  return d > -4 && d < 4 ? t : g + trunc(d / 4);
};

const nearTimeP = (f, t, k) => {
  const g = nearPhase(f, t);
  return k === 0 ? t : trunc((t - g) * k / 4096) + g;
};

const V = (x = 0, y = 0, z = 0) => ({
  x: x,
  y: y,
  z: z
});

const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const aM = v => new THREE.Vector3(v.x * MM, v.y * MM, v.z * MM);

const _e = new THREE.Euler, _q = new THREE.Quaternion, _v = new THREE.Vector3;

function rotYXZ(rot, v) {
  _e.set(rot.x * ANG, rot.y * ANG, (rot.z || 0) * ANG, "YXZ");
  _v.set(v.x, v.y, v.z).applyEuler(_e);
  return V(_v.x, _v.y, _v.z);
}

function dirHacia(de, a, envolver = true) {
  const x = a.x - de.x, y = a.y - de.y, z = a.z - de.z;
  const r = and12(ratan2(Math.round(Math.hypot(x, z)), y));
  let vx = r - 1024;
  if (envolver && vx < 0) vx = r + 3072;
  return V(vx, and12(ratan2(x, z)), 0);
}

function girar(c) {
  if (c.interp === 0) {
    c.rot.x = nearExp4P(c.rot.x, c.turn.x);
    c.rot.y = nearExp4P(c.rot.y, c.turn.y);
    c.rot.z = nearExp4P(c.rot.z, c.turn.z);
  } else {
    const k = TIME_INV[Math.min(15, c.interp)];
    c.rot.x = nearTimeP(c.rot.x, c.turn.x, k);
    c.rot.y = nearTimeP(c.rot.y, c.turn.y, k);
    c.rot.z = nearTimeP(c.rot.z, c.turn.z, k);
    c.interp--;
  }
  c.rot.x = and12(c.rot.x);
  c.rot.y = and12(c.rot.y);
}

const choca = (c1, s1, c2, s2) => Math.abs(c1.x - c2.x) <= s1.x + s2.x && Math.abs(c1.y - c2.y) <= s1.y + s2.y && Math.abs(c1.z - c2.z) <= s1.z + s2.z;

function segmentoCaja(a, b, c, s) {
  let t0 = 0, t1 = 1;
  for (const k of [ "x", "y", "z" ]) {
    const d = b[k] - a[k], mn = c[k] - s[k], mx = c[k] + s[k];
    if (Math.abs(d) < 1e-9) {
      if (a[k] < mn || a[k] > mx) return null;
      continue;
    }
    let u = (mn - a[k]) / d, w = (mx - a[k]) / d;
    if (u > w) [u, w] = [ w, u ];
    t0 = Math.max(t0, u);
    t1 = Math.min(t1, w);
    if (t0 > t1) return null;
  }
  return {
    t: t0,
    p: V(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.z + (b.z - a.z) * t0)
  };
}

function texRadial(r, g, b) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(.4, `rgba(${r},${g},${b},0.6)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texTexto(s, color) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 24;
  const x = c.getContext("2d");
  x.font = "bold 16px monospace";
  x.textAlign = "center";
  x.fillStyle = "#010101";
  x.fillText(s, 65, 18);
  x.fillStyle = color;
  x.fillText(s, 64, 17);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

const propio = o => {
  o.traverse?.(m => {
    m.userData.propio = m.userData.sinColision = true;
  });
  o.userData.propio = o.userData.sinColision = true;
  return o;
};

const plegar = k => {
  const v = Math.trunc(k * 255 / 6) * 2;
  return (v > 255 ? 511 - v : v) / 256;
};

function mallaLuz(tex) {
  const pos = new Float32Array(49 * 3), uv = new Float32Array(49 * 2), idx = [];
  for (let f = 0; f < 7; f++) for (let c = 0; c < 7; c++) {
    uv[(f * 7 + c) * 2] = plegar(f);
    uv[(f * 7 + c) * 2 + 1] = plegar(c);
  }
  for (let f = 0; f < 6; f++) for (let c = 0; c < 6; c++) {
    const a = f * 7 + c, b = a + 7, d = a + 8, e = a + 1;
    idx.push(a, b, d, a, d, e);
  }
  const geo = new THREE.BufferGeometry;
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const col = (new THREE.Color).setRGB(56 / 128 * .25, 71 / 128 * .25, 47 / 128 * .25, THREE.SRGBColorSpace);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: tex,
    color: col,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  }));
  m.frustumCulled = false;
  m.renderOrder = 2;
  return m;
}

function ponerMallaLuz(m, mov, rot, altura, cono) {
  const eje = rotYXZ(rot, V(0, 0, 4096));
  const c4 = ratan2(eje.x, eje.z), c0 = ratan2(eje.y, Math.round(Math.hypot(eje.x, eje.z))) + 1024;
  const b0 = mov.y - altura, inc = Math.trunc(cono / 6);
  const p = m.geometry.attributes.position, tg = a => {
    const c = Math.cos(a * ANG);
    return Math.sin(a * ANG) / (Math.abs(c) < 1 / 4096 ? 1 / 4096 : c);
  };
  for (let f = 0; f < 7; f++) {
    const af = c0 - inc * 3 + inc * f, cf = Math.cos(af * ANG), z = b0 * tg(af), k = 1 / (Math.abs(cf) < 1 / 4096 ? 1 / 4096 : cf);
    for (let c = 0; c < 7; c++) p.setXYZ(f * 7 + c, b0 * tg(-inc * 3 + inc * c) * k * MM, 0, z * MM);
  }
  p.needsUpdate = true;
  m.position.set(mov.x * MM, altura * MM, mov.z * MM);
  m.rotation.set(0, c4 * ANG, 0);
}

function sombraReflector(tex) {
  const geo = new THREE.BufferGeometry;
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([ 0, 0, 1, 0, 0, 1, 1, 1 ]), 2));
  geo.setIndex([ 0, 2, 3, 0, 3, 1 ]);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: tex,
    color: 10263708,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.SubtractiveBlending
  }));
  m.frustumCulled = false;
  m.renderOrder = 3;
  m.visible = false;
  return m;
}

class Camara {
  constructor(S, a, v2) {
    const o = a.opts, n0 = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    const p = (o.p || [ 0, 0, 0 ]).map(v => typeof v === "number" ? v : 0), d = (o.d || [ 0, 0, 0 ]).map(v => typeof v === "number" ? v : 0);
    this.S = S;
    this.a = a;
    this.v2 = v2;
    this.tipo = v2 ? "CAMERA2" : "CAMERA";
    this.nombre = a.nombre;
    this.mov = V(p[0], p[1] + 25, p[2] + 450);
    this.rot = V(d[0], d[1], d[2]);
    this.turn = V(d[0], d[1], d[2]);
    this.interp = 0;
    this.home = V(Math.min(d[0], 512), d[1], d[2]);
    this.l = n0("l", 0);
    this.w = Math.min(n0("w", 0), 512);
    this.x = Math.min(n0("x", 0), 1024);
    this.h = v2 || o.h != null;
    this.proc = o.e?.[0]?.proc ?? -1;
    this.m1 = 0;
    this.m2 = 1;
    this.t = 0;
    this.dest = 0;
    this.activo = v2 ? o.o ? 0 : 1 : 1;
    this.blanco = v2 ? this.activo ? 0 : 1 : 1;
    this.sonido = 1;
    this.tick = 0;
    this.caja = {
      visto: 0,
      pos: V(),
      rot: 0
    };
    this.prev = V();
    this.vib = 0;
    this.led = [ 0, 255, 0 ];
    this.radar = true;
    this.armRot = V(0, d[1], d[2]);
  }
  ve() {
    const S = this.S, sn = S.sn;
    if (!sn.visible) {
      this.caja.visto = 0;
      return false;
    }
    if (!this.v2 && sn.sigilo) {
      this.caja.visto = 0;
      return false;
    }
    const d = dirHacia(this.mov, sn.mov), dy = difAbs(d.y, this.rot.y), dx = difAbs(d.x, this.rot.x);
    if (dx > this.w || dy > this.w || dist3(this.mov, sn.mov) > this.l) {
      this.caja.visto = 0;
      return false;
    }
    if (this.h && S.pared(this.mov, sn.mov, SEG_NO_NAVIGATE)) {
      this.caja.visto = 0;
      return false;
    }
    if (!this.v2 && S.modoTop() !== 1 && sn.caja) {
      if (!this.caja.visto) {
        this.caja.pos = {
          ...sn.mov
        };
        this.caja.rot = sn.dir;
        this.caja.visto = 1;
        return false;
      }
      if (dist3(this.caja.pos, sn.mov) < 50 && this.caja.rot === sn.dir) return false;
    }
    this.caja.visto = 1;
    return true;
  }
  limitar(t) {
    if (this.v2) {
      if (t.x > 768) t.x = 768;
      const d = difS(this.home.y, t.y);
      if (d > 1024) t.y = and12(this.home.y + 1024); else if (d < -1024) t.y = and12(this.home.y - 1024);
      return;
    }
    if (this.x < 8) t.x = this.home.x; else if (t.x > 768) t.x = 768;
    const d = difS(this.home.y, t.y);
    if (this.x < d) t.y = and12(this.home.y + this.x); else if (d < -this.x) t.y = and12(this.home.y - this.x);
  }
  seguir(rapido) {
    const d = dirHacia(this.mov, this.S.sn.mov);
    this.turn.x = d.x;
    this.turn.y = d.y;
    this.limitar(this.turn);
    if (rapido) this.rot = {
      ...this.turn
    };
  }
  tic() {
    const k = this.S.cuadros * 2;
    if (k - this.tick >= 13) {
      if (this.sonido) this.S.son(SE.BARRIDO, this.mov);
      this.tick = k;
    }
  }
  barrer(paso) {
    if (this.t > 60) {
      if (!this.v2 && !(this.t & 3)) this.tic();
      if (this.v2 || this.x >= 8) {
        this.turn.y = and12(this.turn.y + paso);
        const d = difAbs(this.home.y, this.turn.y);
        if (this.v2 ? d > this.x : d >= this.x) return true;
      } else return false;
    }
    this.t++;
    return false;
  }
  descubrir() {
    const S = this.S;
    if (this.t === 0) {
      S.son(SE.LENTE, this.mov);
      this.led = [ 255, 0, 0 ];
    }
    this.seguir(false);
    if (this.t === 15) {
      S.bikkuri();
      S.marca(this, 30);
      this.vib = 10;
      S.vibrar(10);
      this.seguir(true);
    }
    if (this.t === 35) {
      if (this.v2) S.alerta(false); else {
        S.alerta(true);
      }
      return true;
    }
    this.t++;
    return false;
  }
  mirarAzar(se) {
    if (!(this.t & 63)) {
      const r = randU(16);
      this.interp = 48;
      this.t += r;
      this.turn.y = this.v2 ? and12(this.home.y + (randU(2048) - 1024)) : and12(this.home.y - (1024 - randU(2048)));
      this.turn.x = randU(768);
      this.limitar(this.turn);
      this.prev = {
        ...this.rot
      };
    }
    if (!this.v2 && (difAbs(this.prev.x, this.rot.x) > 16 || difAbs(this.prev.y, this.rot.y) > 16) && this.sonido) this.S.son(se, this.mov);
    this.prev = {
      ...this.rot
    };
    this.t++;
  }
  volver() {
    const h = this.home, t = this.turn;
    for (const k of [ "y", "x" ]) {
      const d = difS(h[k], t[k]);
      t[k] = and12(d < -10 ? t[k] + 8 : d < 10 ? h[k] : t[k] - 8);
    }
    if (t.x === h.x && t.y === h.y && this.t > 96) return true;
    if (!this.v2 && (difAbs(this.prev.x, this.rot.x) > 16 || difAbs(this.prev.y, this.rot.y) > 16) && this.sonido) this.S.son(SE.BARRIDO, this.mov);
    this.prev = {
      ...this.rot
    };
    this.t++;
    return false;
  }
  logica() {
    const S = this.S, top = S.modoTop(), chaff = S.chaffActivo;
    if (this.v2) return this.logica2(top);
    const pon = (m1, m2, led) => {
      this.m1 = m1;
      this.m2 = m2;
      this.t = 0;
      if (led) this.led = led;
    };
    switch (this.m1) {
     case 0:
      switch (this.m2) {
       case 1:
        if (this.barrer(8)) pon(0, 2);
        if (this.ve()) pon(0, 5);
        break;

       case 2:
        if (this.barrer(-8)) pon(0, 1);
        if (this.ve()) pon(0, 5);
        break;

       case 3:
        pon(0, 1);
        break;

       case 5:
        if (this.descubrir()) {
          pon(1, 4);
          return;
        }
        break;

       case 7:
        if (this.volver()) pon(0, 1, [ 0, 255, 0 ]);
        break;
      }
      if (top === 1) pon(1, 0, [ 255, 0, 0 ]);
      if (chaff) pon(3, 6, [ 255, 255, 0 ]);
      break;

     case 1:
      if (this.m2 !== 0) {
        if (this.m2 === 4) {
          this.seguir(false);
          S.alerta(true);
          if (!this.ve()) this.m2 = 0;
        }
      } else if (this.ve()) this.m2 = 4;
      if (top !== 1) pon(2, 6, [ 255, 255, 0 ]);
      if (chaff) pon(3, 6, [ 255, 255, 0 ]);
      break;

     case 2:
      if (this.m2 === 6) {
        this.mirarAzar(SE.BARRIDO);
        if (top === 0) pon(0, 7);
      }
      if (this.ve()) {
        S.alerta(true);
        this.vib = 10;
        S.vibrar(10);
        S.bikkuri();
        S.marca(this, 30);
        this.seguir(true);
        pon(1, 4, [ 255, 0, 0 ]);
      } else if (top === 1) pon(1, 0, [ 255, 0, 0 ]);
      if (chaff) pon(3, 6, [ 255, 255, 0 ]);
      break;

     case 3:
      if (this.m2 === 6) {
        if (chaff) {
          this.mirarAzar(SE.TRABADA);
          return;
        }
        if (top === 0) pon(0, 7); else if (top === 1) pon(1, 0, [ 255, 0, 0 ]); else pon(2, 6, [ 255, 255, 0 ]);
      }
      break;
    }
  }
  logica2(top) {
    const pon = (m1, m2, led) => {
      this.m1 = m1;
      this.m2 = m2;
      this.t = 0;
      if (led) this.led = led;
    };
    if (this.m1 === 0) {
      switch (this.m2) {
       case 1:
        if (this.barrer(8)) pon(0, 2);
        if (this.ve()) pon(0, 7);
        break;

       case 2:
        if (this.barrer(-8)) pon(0, 1);
        if (this.ve()) pon(0, 7);
        break;

       case 3:
        pon(0, 1);
        break;

       case 7:
        if (this.descubrir()) {
          this.blanco = 1;
          pon(1, 4);
          return;
        }
        break;
      }
      if (top === 1) {
        this.blanco = 1;
        pon(1, 0, [ 255, 0, 0 ]);
      }
    } else if (this.m1 === 1) {
      if (this.m2 === 4) {
        this.seguir(false);
        if (!this.ve()) this.m2 = 0;
      } else if (this.m2 === 0 && this.ve()) this.m2 = 4;
      if (top !== 1) pon(2, 5, [ 255, 255, 0 ]);
    } else {
      if (this.m2 === 5) {
        this.mirarAzar(0);
        if (top === 0) pon(2, 6);
      } else if (this.m2 === 6 && this.volver()) {
        pon(0, 1, [ 0, 255, 0 ]);
        this.activo = 0;
      }
      if (this.ve()) pon(1, 4, [ 255, 0, 0 ]); else if (top === 1) pon(1, 0, [ 255, 0, 0 ]);
    }
  }
  cuadro() {
    const S = this.S;
    if (this.vib > 0) this.vib--;
    if (this.dest === 0) {
      girar(this);
      if (this.golpe) {
        const g = this.golpe;
        this.golpe = null;
        if (g === 2 && this.blanco) {
          this.dest = 1;
          if (this.proc >= 0) S.proc(this.proc, this);
          S.explotar(this.mov, .6);
          S.humo(this.mov, 8);
        }
      }
    } else {
      this.dest++;
      this.led = [ 0, 0, 0 ];
      if (this.dest >= 10 && this.dest % 8 === 0) S.chispa(this.mov);
      if (this.dest >= 40) {
        this.muerta = true;
        return;
      }
    }
    if (this.activo) {
      this.logica();
      this.radar = true;
    } else this.radar = false;
  }
}

let GUNCAM_N = 0;

class GunCam {
  constructor(S, a) {
    const o = a.opts, num = v => typeof v === "number" ? v : 0;
    const n0 = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    const p = (o.p || [ 0, 0, 0 ]).map(num), d = (o.d || [ 0, 0, 0 ]).map(num);
    this.S = S;
    this.a = a;
    this.tipo = "CAMERAGUN";
    this.nombre = a.nombre;
    this.barre = n0("m", 0) === 1 ? 1 : 0;
    this.l = n0("l", 65535);
    this.w = n0("w", 512);
    this.x = n0("x", 512);
    const off = rotYXZ(V(d[0], d[1], d[2]), V(0, -150, -400));
    this.mov = V(p[0] - off.x, p[1] - off.y, p[2] - off.z);
    this.armPos = V(p[0], p[1], p[2]);
    this.armRot = V(d[0], d[1], d[2]);
    const r = (o.r || [ 0, 0, 0 ]).map(num);
    this.turn = V(d[0] + r[0], d[1] + r[1], d[2]);
    this.rot = {
      ...this.turn
    };
    this.home = {
      ...this.turn
    };
    this.interp = 4;
    const g = (o.g || []).map(num);
    this.rafaga = o.g ? [ g[0] ?? 1, g[1] ?? 30 ] : [ 1, 30 ];
    this.v = o.v != null;
    this.radarOn = o.n == null;
    this.proc = o.e?.[0]?.proc ?? -1;
    this.m1 = 0;
    this.m2 = this.barre ? !this.v && randU(2) === 0 ? 3 : 2 : 4;
    this.t = 0;
    this.c348 = 0;
    this.tiros = 0;
    this.pausa = 0;
    this.retro = 0;
    this.dest = 0;
    this.chaffT = -1;
    this.sonido = 1;
    this.vision = 1;
    this.fuera = 0;
    this.parada = 0;
    this.fase = GUNCAM_N++;
    this.led = [ 0, 255, 0 ];
    this.ledObj = [ 0, 255, 0 ];
    this.radar = this.radarOn;
  }
  ve() {
    const S = this.S, sn = S.sn;
    if (!(this.vision && !this.fuera)) {
      this.radar = false;
      return false;
    }
    this.radar = this.radarOn;
    if (!sn.visible || sn.ducto || sn.sigilo) return false;
    const a = dirHacia(this.mov, sn.mov, false), dy = difAbs(a.y, this.rot.y), dx = difAbs(a.x, this.rot.x);
    return this.w >= dx && this.w >= dy && this.l >= dist3(this.mov, sn.mov) && !S.pared(this.mov, sn.mov, 0);
  }
  limitar(t) {
    for (const k of [ "y", "x" ]) {
      const d = difS(this.home[k], t[k]);
      if (this.x < d) t[k] = and12(this.home[k] + this.x); else if (d < -this.x) t[k] = and12(this.home[k] - this.x);
    }
  }
  apuntar() {
    const d = dirHacia(this.mov, this.S.sn.mov, false);
    this.turn.x = d.x;
    this.turn.y = d.y;
    this.limitar(this.turn);
  }
  disparar() {
    const S = this.S, boca = rotYXZ(this.rot, V(0, 200, 900)), dir = rotYXZ(this.rot, V(0, 0, 1));
    const o = V(this.mov.x + boca.x, this.mov.y + boca.y, this.mov.z + boca.z);
    S.bala(o, dir, DAÑO_GUNCAM[S.dificultad()] ?? 120, this.l, 2e3);
    S.fogonazo(o);
  }
  barrer(paso) {
    if (this.t > 60) {
      if (this.sonido) this.S.son(SE.BARRIDO, this.mov);
      this.turn.y = and12(this.turn.y + paso);
      if (this.x < difAbs(this.home.y, this.turn.y)) return true;
    }
    this.t++;
    return false;
  }
  volver() {
    const h = this.home, t = this.turn;
    for (const k of [ "y", "x" ]) {
      const d = difS(h[k], t[k]);
      t[k] = and12(d < -10 ? t[k] + 8 : d < 10 ? h[k] : t[k] - 8);
    }
    if (t.x !== h.x || t.y !== h.y || this.t < 145) {
      this.t++;
      return false;
    }
    return true;
  }
  logica() {
    const S = this.S;
    const rojo = () => {
      this.ledObj = [ 255, 0, 0 ];
    };
    switch (this.m1) {
     case 0:
      this.interp = 4;
      if (this.m2 === 2 && this.barrer(8)) {
        this.m2 = 3;
        this.t = randU(32);
        this.turn.y = and12(this.home.y + this.x);
      } else if (this.m2 === 3 && this.barrer(-8)) {
        this.m2 = 2;
        this.t = randU(32);
        this.turn.y = and12(this.home.y - this.x);
      }
      if ((S.gvTime + this.fase & 3) === 0 && this.ve()) {
        S.marca(this, 30);
        if (S.guncamCd <= 0) {
          S.guncamCd = 90;
          if (this.sonido) S.son(SE.SORPRESA, null);
        }
        this.m1 = 1;
        this.m2 = 5;
        this.t = 0;
        rojo();
        S.vibrar(10);
      }
      break;

     case 1:
      this.interp = 0;
      if (this.m2 === 5) {
        this.apuntar();
        if (!(++this.c348 & 3)) {
          if (this.tiros < this.rafaga[0]) {
            this.tiros++;
            this.disparar();
            if (this.sonido) S.son(SE.TIRO_GUNCAM, this.mov, "bomba");
            this.retro = 1;
          } else if (++this.pausa >= this.rafaga[1]) {
            this.tiros = 0;
            this.pausa = 0;
          }
        } else this.retro = 0;
        if (!this.ve()) {
          this.m2 = 1;
          this.t = 0;
        }
      } else if (this.m2 === 1) {
        this.retro = 0;
        if (++this.t >= 91) {
          this.m1 = 2;
          this.m2 = 6;
          this.t = 0;
          break;
        }
        if (this.ve()) this.m2 = 5;
      }
      break;

     case 2:
      this.interp = 4;
      if (this.m2 === 6) this.m2 = 7; else if (this.m2 === 7 && this.volver()) {
        this.m1 = 0;
        this.m2 = this.barre ? randU(2) === 0 ? 3 : 2 : 4;
        this.t = 0;
        this.ledObj = [ 0, 255, 0 ];
      }
      if (this.ve()) {
        this.m1 = 1;
        this.m2 = 5;
        this.t = 0;
        rojo();
      }
      break;

     case 3:
      {
        this.interp = 4;
        if (this.m2 === 0) this.m2 = 7;
        const tt = this.chaffT + S.gvTime;
        if (randU(16) === 0 && this.sonido) S.son(SE.TRABADA, this.mov);
        if (S.chaffActivo) {
          this.turn.y = and12(this.turn.y + trunc((rsin(tt * 64) - trunc(rsin(tt * 31) / 2) - trunc(rsin(tt * 231) / 2)) / 16));
          this.turn.x = and12(this.turn.x + trunc((rsin(tt * 23) - trunc(rsin(tt * 45) / 2) - trunc(rsin(tt * 245) / 2)) / 16));
          this.limitar(this.turn);
          this.ledObj = [ Math.abs(trunc(rsin(tt * 95) / 16)), Math.abs(trunc(rsin(tt * 154) / 16)), Math.abs(trunc(rsin(tt * 43) / 16)) ];
        } else {
          this.ledObj = [ 0, 255, 0 ];
          this.chaffT = -1;
          this.m1 = 2;
          this.m2 = 6;
          this.t = 0;
        }
        break;
      }
    }
  }
  cuadro() {
    const S = this.S;
    if (S.guncamCd > 0) S.guncamCd--;
    if (this.parada) {
      if (this.fuera === 1) return;
      this.fuera = 1;
    } else this.fuera = 0;
    for (let i = 0; i < 3; i++) this.led[i] = trunc((this.led[i] * 15 + this.ledObj[i]) / 16);
    if (!this.fuera) {
      if (S.chaffActivo && this.chaffT === -1) {
        this.chaffT = randU(4096);
        this.m1 = 3;
        this.m2 = 0;
        this.t = 0;
      }
    } else {
      this.ledObj = [ 0, 255, 0 ];
      this.chaffT = -1;
      this.m1 = 2;
      this.m2 = 6;
      this.t = 0;
    }
    if (this.dest === 0) {
      girar(this);
      if (this.golpe) {
        const g = this.golpe;
        this.golpe = null;
        if (g === 2 && !S.guncamRota) {
          S.guncamRota = true;
          S.guncamRotas++;
          if (this.sonido) S.son(SE.CHISPAS, this.mov);
          this.dest = 1;
          S.explotar(this.mov, .35);
          S.humo(this.mov, 2);
        }
      }
    } else {
      if (++this.dest === 19) S.chispa(this.mov);
      this.led = [ 0, 0, 0 ];
      this.ledObj = [ 0, 0, 0 ];
      if (this.dest >= 20 || (S.guncamRotas & 1) === 0) {
        if (this.proc >= 0) S.proc(this.proc, this);
        this.muerta = true;
        S.guncamRota = false;
        return;
      }
    }
    this.logica();
  }
}

class Claymore {
  constructor(S, a) {
    const o = a.opts, num = v => typeof v === "number" ? v : 0;
    const p = (o.p || [ 0, 0, 0 ]).map(num), d = (o.d || [ 0, 0, 0 ]).map(num);
    this.S = S;
    this.a = a;
    this.tipo = "CLAYMORE";
    this.nombre = a.nombre;
    this.mov = V(p[0], p[1], p[2]);
    this.dirEsq = V(d[0], d[1], d[2]);
    this.rot = V(-1024, and12(d[1] + 1024), d[2]);
    const ctr = rotYXZ(this.rot, V(-500, -250, 750));
    this.centro = V(this.mov.x + ctr.x, this.mov.y + 500 + ctr.y, this.mov.z + ctr.z);
    const t = (o.t || []).map(num);
    this.tam = t.length >= 3 ? V(t[0], t[1], t[2]) : V(500, 200, 500);
    this.proc = o.e?.[0]?.proc ?? -1;
    this.f130 = 64;
    this.estado = 0;
    this.esq = 8;
    this.explota = false;
    this.levantada = false;
    this.lleno = false;
    this.radarDir = and12(this.rot.y - 1024);
  }
  cerca() {
    const sn = this.S.sn;
    return sn.visible && sn.estado & 64 && !this.explota && dist3(this.mov, sn.mov) < 800;
  }
  cuadro() {
    const S = this.S, sn = S.sn;
    if (this.estado === 2) {
      if (++this.f130 < 45) {
        if (this.f130 === 1) {
          if (S.claymores >= S.claymoresMax) {
            S.son(SE.LLENO, this.mov, "bomba");
            this.lleno = true;
          } else {
            S.claymores++;
            S.son(SE.ITEM, this.mov, "bomba");
            this.levantada = true;
            this.lleno = false;
            S.ctx.alRecoger?.("claymore", S.claymores);
          }
        }
        S.cartel(this, this.lleno ? "CLAYMORE" : "CLAYMORE", this.lleno ? "#ff3030" : "#c8c8c8");
        if (this.levantada && this.f130 === 16) this.visible = false;
      } else if (this.levantada) {
        this.muerta = true;
        this.arg = 2;
        if (this.proc >= 0) S.proc(this.proc, this, 2);
        return;
      } else {
        this.f130 = 0;
        this.estado = 3;
      }
    } else if (this.estado === 3) {
      if (++this.f130 < 45 || this.cerca()) S.cartel(this, "FULL", "#ff3030"); else {
        this.estado = 0;
        this.f130 = 0;
      }
    }
    if (this.estado >= 2) return;
    this.visible = S.termicos;
    const empujada = sn.visible && choca(sn.mov, sn.tam, this.centro, this.tam);
    if (empujada && !this.explota) {
      if (S.claymoreExplotando) {
        this.muerta = true;
        this.arg = 1;
        if (this.proc >= 0) S.proc(this.proc, this, 1);
        return;
      }
      if (sn.estado & 64) return;
      S.claymoreExplotando = this;
      this.explota = true;
      this.visible = true;
      S.poder(this.centro, this.tam, 128, 2);
    }
    if (this.explota) {
      S.esquirlas(this.mov, this.dirEsq, this.esq);
      if (--this.esq <= 0) {
        this.muerta = true;
        this.arg = 1;
        if (S.claymoreExplotando === this) S.claymoreExplotando = null;
        if (this.proc >= 0) S.proc(this.proc, this, 1);
        return;
      }
    }
    if (this.cerca()) {
      this.estado = 2;
      this.visible = true;
      this.f130 = 0;
    }
  }
}

class Infrarrojo {
  constructor(S, a) {
    const o = a.opts, num = v => typeof v === "number" ? v : 0, n0 = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    const p = (o.p || []).map(num);
    this.S = S;
    this.a = a;
    this.tipo = "CENSOR";
    this.nombre = a.nombre;
    this.p0 = V(p[0], p[1], p[2]);
    this.p1 = V(p[3] ?? p[0], p[4] ?? p[1], p[5] ?? p[2]);
    const m = (o.m || [ 0, 0, 0 ]).map(num);
    this.mueve = V(m[0], m[1], m[2]);
    this.periodo = Math.max(1, n0("s", 60));
    this.c = 0;
    this.ida = 0;
    this.parpadeo = 0;
    if (Array.isArray(o.b) && o.b.length >= 2) {
      this.on = num(o.b[0]);
      this.off = num(o.b[1]);
      this.parpadeo = 1;
    }
    this.cb = 0;
    this.prendido = 1;
    this.proc = o.e?.[0]?.proc ?? -1;
    this.veces = 1;
    this.vecesMax = 1;
    this.brillo = 0;
    this.forzado = 0;
    this.largo = 1;
    this.scroll = randU(128);
  }
  cuadro() {
    const S = this.S, sn = S.sn;
    this.scroll = this.scroll + 1 & 127;
    if (++this.c === this.periodo) {
      this.c = 0;
      this.ida ^= 1;
    }
    if (this.parpadeo === 1) {
      if (++this.cb >= this.on) {
        this.cb = 0;
        this.parpadeo = 2;
      } else this.prendido = 1;
    } else if (this.parpadeo === 2) {
      if (++this.cb >= this.off) {
        this.cb = 0;
        this.parpadeo = 1;
      } else this.prendido = 0;
    }
    const k = this.ida === 0 ? this.c : this.periodo - this.c;
    const off = V(trunc(this.mueve.x * k / this.periodo), trunc(this.mueve.y * k / this.periodo), trunc(this.mueve.z * k / this.periodo));
    this.a0 = V(this.p0.x + off.x, this.p0.y + off.y, this.p0.z + off.z);
    this.a1 = V(this.p1.x + off.x, this.p1.y + off.y, this.p1.z + off.z);
    this.largo = 1;
    if (this.prendido && !sn.sigilo && sn.visible) {
      const h = segmentoCaja(this.a0, this.a1, sn.mov, sn.tam);
      if (h) {
        S.alerta(true);
        if (S.modoTop() !== 1) S.bikkuri();
        this.largo = h.t;
        if (this.veces > 0) {
          if (this.proc >= 0) S.proc(this.proc, this);
          this.veces--;
        }
      } else this.veces = this.vecesMax;
    } else this.veces = this.vecesMax;
    let b = 0;
    if (S.cigarrillos && this.prendido) {
      const c = sn.cabeza, a = this.a0, e = this.a1, dx = e.x - a.x, dy = e.y - a.y, dz = e.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
      const u = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / L2));
      b = 128 - Math.min(2048, Math.hypot(a.x + dx * u - c.x, a.y + dy * u - c.y, a.z + dz * u - c.z)) / 16;
    } else if (S.termicos && this.prendido) b = 128;
    this.forzado = this.forzadoOn ? Math.min(128, this.forzado + 2) : Math.max(0, this.forzado - 2);
    this.brillo = Math.min(128, b + this.forzado);
  }
}

class Reflector {
  constructor(S, a) {
    const o = a.opts, num = v => typeof v === "number" ? v : 0, n0 = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k][0] : d;
    const p = (o.p || [ 0, 0, 0 ]).map(num), d = (o.d || [ 0, 0, 0 ]).map(num);
    this.S = S;
    this.a = a;
    this.tipo = "SEARCHLIGHT";
    this.nombre = a.nombre;
    this.mov = V(p[0], p[1], p[2]);
    this.rot = V(d[0], d[1], d[2]);
    this.turn = {
      ...this.rot
    };
    this.interp = 0;
    this.home = V(Math.min(d[0], 1e3), d[1], d[2]);
    this.altura = Math.min(n0("h", 0), 3e4);
    this.ancho = Math.min(n0("w", 0), 4e3);
    this.angulo = n0("a", 300);
    this.cono = n0("l", 0) + this.angulo;
    const t = (o.t || []).map(num);
    if (t.length >= 4) {
      this.pMin = t[0];
      this.pMax = t[1];
      this.yaw = t[2];
      this.vel = t[3];
    } else {
      this.pMin = 280;
      this.pMax = 330;
      this.yaw = 512;
      this.vel = 4;
    }
    this.xmax = t.length >= 4 ? t[2] : Math.min(n0("x", 0), 1024);
    this.m1 = 0;
    this.m2 = 2;
    this.t = 0;
    this.caja = {
      visto: 0,
      pos: V(),
      rot: 0
    };
    this.adentro = 0;
    this.enLuz = 0;
  }
  limitar(t) {
    if (t.x > this.pMax) t.x = this.pMax; else if (t.x < this.pMin) t.x = this.pMin;
    const d = difS(this.home.y, t.y);
    if (d > this.yaw) t.y = and12(this.home.y + this.yaw); else if (d < -this.yaw) t.y = and12(this.home.y - this.yaw);
  }
  local(p) {
    _e.set(this.rot.x * ANG, this.rot.y * ANG, 0, "YXZ");
    _q.setFromEuler(_e).invert();
    _v.set(p.x - this.mov.x, p.y - this.mov.y, p.z - this.mov.z).applyQuaternion(_q);
    return V(_v.x, _v.y, _v.z);
  }
  medir() {
    const sn = this.S.sn;
    if (sn.sigilo || !sn.visible) {
      this.adentro = 0;
      this.enLuz = 0;
      return;
    }
    const l = this.local(V(sn.mov.x, this.altura, sn.mov.z)), ang = and12(ratan2(Math.round(Math.hypot(l.x, l.y)), Math.round(l.z)));
    this.f2A8 = ang;
    this.adentro = ang <= this.angulo / 2 ? 1 : 0;
    this.enLuz = ang < this.cono / 2 ? 1 : 0;
  }
  ve() {
    const S = this.S, sn = S.sn;
    if (!this.adentro) {
      this.caja.visto = 0;
      return false;
    }
    if (S.modoTop() !== 1 && sn.caja) {
      if (!this.caja.visto) {
        this.caja.pos = {
          ...sn.mov
        };
        this.caja.rot = sn.dir;
        this.caja.visto = 1;
        return false;
      }
      if (dist3(this.caja.pos, sn.mov) < 50 && this.caja.rot === sn.dir) return false;
    }
    this.caja.visto = 1;
    return true;
  }
  seguir() {
    const sn = this.S.sn, d = dirHacia(this.mov, V(sn.mov.x, this.altura, sn.mov.z));
    this.turn.x = d.x;
    this.turn.y = d.y;
    this.limitar(this.turn);
  }
  cuadro() {
    const S = this.S, top = S.modoTop();
    girar(this);
    this.medir();
    const pon = (m1, m2) => {
      this.m1 = m1;
      this.m2 = m2;
      this.t = 0;
    };
    if (this.m1 === 0) {
      switch (this.m2) {
       case 2:
       case 3:
        {
          const paso = this.m2 === 2 ? this.vel : -this.vel;
          if (this.t > 60) {
            this.turn.y = and12(this.turn.y + paso);
            if (difAbs(this.home.y, this.turn.y) > this.xmax) {
              this.turn.y = and12(this.home.y + (paso > 0 ? this.xmax : -this.xmax));
              pon(0, this.m2 === 2 ? 3 : 2);
            } else this.t++;
          } else this.t++;
          if (this.turn.x > this.pMax) this.turn.x = this.pMax; else if (this.turn.x < this.pMin) this.turn.x = this.pMin;
          if (this.ve()) pon(0, 1);
          break;
        }

       case 4:
        this.seguir();
        break;

       case 1:
        this.seguir();
        if (this.t === 0) {
          S.bikkuri();
          S.vibrar(10);
        }
        if (this.t > 14) {
          S.alerta(true);
          pon(1, 4);
        } else this.t++;
        break;
      }
      if (top === 1) pon(1, S.puntoConocido() ? 4 : 0);
    } else if (this.m1 === 1) {
      if (this.m2 === 4) {
        this.seguir();
        if (this.ve()) S.alerta(true);
      } else if (this.m2 === 0 && this.ve()) this.m2 = 4;
      if (top !== 1) pon(2, 5);
    } else {
      if (this.m2 === 5) {
        if (!(this.t & 63)) {
          this.t += randU(16);
          this.interp = 48;
          this.turn.y = and12(this.home.y - this.yaw + (rnd() * this.yaw * 2 >> 15));
          this.turn.x = rnd() * this.pMax >> 15;
          this.limitar(this.turn);
        }
        this.t++;
        if (top === 0) pon(2, 6);
      } else if (this.m2 === 6) {
        const h = this.home, t = this.turn;
        for (const k of [ "y", "x" ]) {
          const d = difS(h[k], t[k]);
          t[k] = and12(d < -10 ? t[k] + 8 : d < 10 ? h[k] : t[k] - 8);
        }
        if (t.x === h.x && t.y === h.y && this.t > 96) pon(0, 2); else this.t++;
      }
      if (this.ve()) {
        S.alerta(true);
        S.bikkuri();
        S.vibrar(10);
        pon(1, 4);
      } else if (top === 1) pon(1, 4);
    }
  }
}

class Kiken {
  constructor(S, a) {
    this.S = S;
    this.a = a;
    this.tipo = "KIKENKUN";
    this.nombre = a.nombre;
    this.activo = false;
  }
  cuadro() {
    if (this.activo) this.S.alerta(true);
  }
}

const CLASES = {
  CAMERA: (S, a) => new Camara(S, a, false),
  CAMERA2: (S, a) => new Camara(S, a, true),
  CAMERAGUN: (S, a) => new GunCam(S, a),
  CLAYMORE: (S, a) => new Claymore(S, a),
  CENSOR: (S, a) => new Infrarrojo(S, a),
  SEARCHLIGHT: (S, a) => new Reflector(S, a),
  KIKENKUN: (S, a) => new Kiken(S, a)
};

const MODELOS = {
  CAMERA: [ "modelos/s_camera.glb", "modelos/cam_arm.glb" ],
  CAMERA2: [ "modelos/s_camera.glb", "modelos/cam_arm.glb" ],
  CAMERAGUN: [ "modelos/gca_gun.glb", "modelos/gca_arm.glb" ],
  CLAYMORE: [ "modelos/claymore.glb" ]
};

export class Sensores {
  static conoReflector=false;
  constructor(ctx) {
    this.ctx = ctx;
    this.juego = ctx.juego || null;
    this.lista = [];
    this.balas = [];
    this.esq = [];
    this.fx = [];
    this.acum = 0;
    this.cuadros = 0;
    this.gvTime = 0;
    this.chaffT = 0;
    this.termicos = false;
    this.cigarrillos = false;
    this.detectorMinas = false;
    this.claymores = 0;
    this.claymoresMax = 8;
    this.claymoreExplotando = null;
    this.guncamCd = 0;
    this.guncamRota = false;
    this.guncamRotas = 0;
    this.invul = 0;
    this.modoLocal = 0;
    this.alertaLocal = 0;
    this.mallas = {};
    this.grupo = propio(new THREE.Group);
    this.grupo.name = "sensores";
    (ctx.mundo || ctx.scene).add(this.grupo);
    this.texLuz = texRadial(255, 255, 255);
    this.texFuego = texRadial(255, 150, 40);
    this.texHumo = texRadial(120, 120, 120);
    this.texMarca = (new THREE.TextureLoader).load("assets/hud/b_mark.png");
    this.texMarca.colorSpace = THREE.SRGBColorSpace;
    this.texMarca.magFilter = THREE.NearestFilter;
    this.sn = {
      visible: false,
      mov: V(),
      tam: V(300, 700, 300),
      estado: 0,
      dir: 0,
      cabeza: V()
    };
  }
  get chaffActivo() {
    return this.chaffT > 0;
  }
  chaff(cuadros = 300) {
    this.chaffT = Math.max(this.chaffT, cuadros);
  }
  elegir() {
    const nv = this.ctx.nivel, vis = new Set(nv.visibles?.length ? nv.visibles : [ nv.principal ]);
    const procs = new Set;
    for (const c of nv.actores.filter(a => a.tipo === "COMMANDER")) for (const k of [ "c", "n", "m", "s" ]) for (const v of c.opts?.[k] || []) if (v && typeof v === "object" && "proc" in v) procs.add("proc_" + v.proc.toString(16).padStart(4, "0"));
    const vistos = new Set;
    return nv.actores.filter(a => {
      if (!CLASES[a.tipo]) return false;
      if (a.mapa != null && !vis.has(a.mapa)) return false;
      if (!(this.ctx.todos || !a.evento || procs.has(a.ctx))) return false;
      if (a.t > 0 && !this.ctx.todos) return false;
      const k = a.tipo + JSON.stringify(a.opts);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }
  async crear() {
    for (const a of this.elegir()) {
      const s = CLASES[a.tipo](this, a);
      s.mapa = a.mapa;
      this.lista.push(s);
    }
    await Promise.all(this.lista.map(s => this.vestir(s)));
    window.debugLog?.("sensores", this.lista.map(s => s.tipo).join(", ") || "ninguno");
    return this;
  }
  agregar(a) {
    const f = CLASES[a?.tipo];
    if (!f) return null;
    const s = f(this, a);
    s.mapa = a.mapa;
    s.actor = a;
    this.lista.push(s);
    this.vestir(s);
    return s;
  }
  quitar(a) {
    for (const s of this.lista.filter(x => x.actor === a)) {
      s.obj?.removeFromParent();
      this.lista.splice(this.lista.indexOf(s), 1);
    }
  }
  async cargar(ruta) {
    if (this.ctx.cargar) return this.ctx.cargar(ruta);
    this.cache = this.cache || new Map;
    if (!this.cache.has(ruta)) this.cache.set(ruta, (new GLTFLoader).loadAsync("assets/" + ruta).then(g => g.scene));
    return (await this.cache.get(ruta)).clone(true);
  }
  async vestir(s) {
    const m = MODELOS[s.tipo];
    const g = propio(new THREE.Group);
    this.grupo.add(g);
    s.obj = g;
    if (m) {
      try {
        const [cuerpo, brazo] = await Promise.all(m.map(r => this.cargar(r)));
        s.cuerpo = propio(cuerpo);
        g.add(cuerpo);
        if (brazo) {
          s.brazo = propio(brazo);
          g.add(brazo);
          if (s.tipo === "CAMERAGUN") {
            brazo.position.copy(aM(s.armPos));
            brazo.rotation.set(s.armRot.x * ANG, s.armRot.y * ANG, s.armRot.z * ANG, "YXZ");
          } else {
            const o = rotYXZ(s.armRot, V(0, -25, -450));
            brazo.position.copy(aM(V(s.mov.x + o.x, s.mov.y + o.y, s.mov.z + o.z)));
            brazo.rotation.set(0, s.armRot.y * ANG, s.armRot.z * ANG, "YXZ");
          }
        }
      } catch (e) {
        window.debugLog?.("aviso", "sensores: sin modelo " + m[0]);
      }
    }
    if (s.tipo === "CAMERA" || s.tipo === "CAMERA2" || s.tipo === "CAMERAGUN") {
      s.ledSpr = propio(new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.texLuz,
        color: 65280,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })));
      s.ledSpr.scale.set(.12, .12, 1);
      (s.cuerpo || g).add(s.ledSpr);
      const l = s.tipo === "CAMERAGUN" ? V(-90, 300, 350) : V(50, 300, 350);
      s.ledSpr.position.set(l.x * MM, l.y * MM, l.z * MM);
      if (!s.cuerpo) s.ledSpr.position.copy(aM(s.mov));
    }
    if (s.tipo === "CENSOR") {
      const geo = new THREE.BufferGeometry;
      geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      s.haz = propio(new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 16719904,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })));
      g.add(s.haz);
    }
    if (s.tipo === "SEARCHLIGHT") {
      const mat = new THREE.MeshBasicMaterial({
        color: 16774864,
        transparent: true,
        opacity: .12,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      s.conoObj = propio(new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), mat));
      s.conoObj.visible = false;
      g.add(s.conoObj);
      s.manchaObj = propio(mallaLuz(this.texReflector()));
      g.add(s.manchaObj);
      s.sombraObj = propio(sombraReflector(this.texSombra()));
      g.add(s.sombraObj);
    }
    s.marcaSpr = propio(new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texMarca,
      color: 16726570,
      depthTest: false,
      transparent: true
    })));
    s.marcaSpr.scale.set(.5, .5, 1);
    s.marcaSpr.renderOrder = 999;
    s.marcaSpr.visible = false;
    g.add(s.marcaSpr);
    s.marcaT = 0;
    this.dibujar(s);
  }
  son(id, pos, modo) {
    if (id) sonar(id, pos ? aM(pos) : null);
  }
  vibrar(n) {
    this.juego?.ctx?.vibrar?.(n);
  }
  dificultad() {
    const d = this.juego?.ctx?.dificultad?.();
    return d == null ? 2 : d;
  }
  modoTop() {
    return this.juego ? this.juego.com.modo : this.modoLocal;
  }
  puntoConocido() {
    return this.juego ? this.juego.com.tienePunto : false;
  }
  alerta(conPunto) {
    const J = this.juego;
    if (!J) {
      this.modoLocal = 1;
      this.alertaLocal = 255;
      return;
    }
    if (typeof J.alertaExterna === "function") J.alertaExterna(255); else {
      J.com.alerta = 255;
      if (J.com.modo !== 1) J.ponerModo(1);
    }
    if (conPunto) J.gopointSnake();
  }
  bikkuri() {
    const c = this.juego?.com;
    if (c) {
      if (c.bikkuri === 0) {
        c.bikkuri = 32;
        sonar("!");
      }
    } else sonar(SE.SORPRESA);
  }
  marca(s, t) {
    s.marcaT = t;
  }
  proc(id, s, arg) {
    this.ctx.alProc?.(id, s, arg);
    window.debugLog?.("sensores", `proc_${id.toString(16)} (${s.tipo})`);
  }
  pared(a, b, mascara) {
    const m = this.malla(mascara);
    if (!m) return false;
    const o = aM(a), d = aM(b).sub(o), L = d.length();
    if (L < 1e-4) return false;
    this.ray = this.ray || new THREE.Raycaster;
    this.ray.set(o, d.divideScalar(L));
    this.ray.far = L;
    return this.ray.intersectObject(m, false).length > 0;
  }
  malla(mascara) {
    if (this.mallas[mascara] !== undefined) return this.mallas[mascara];
    const hz = this.juego?.ctx?.hz || this.ctx.hz;
    if (!hz) return this.mallas[mascara] = null;
    const pos = [];
    for (const g of hz.grupos) {
      for (const w of g.paredes) {
        if (w.flags & mascara) continue;
        const a = w.a.map(v => v * MM), b = w.b.map(v => v * MM), h = w.alto * MM;
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], b[1] + h, b[2], a[0], a[1], a[2], b[0], b[1] + h, b[2], a[0], a[1] + h, a[2]);
      }
      for (const f of g.pisos) {
        const q = f.puntos.map(p => p.map(v => v * MM));
        pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
      }
    }
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const m = propio(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    })));
    m.updateMatrixWorld(true);
    return this.mallas[mascara] = m;
  }
  "dañarSnake"(n, modo) {
    const J = this.juego;
    if (!J || this.invul > 0 || !this.sn.visible) return false;
    J.vida -= n / 256;
    this.invul = 32;
    J.ctx.daño?.();
    sonar(modo === 2 ? SE.DAÑO2 : SE.DAÑO1);
    return true;
  }
  guardias() {
    return this.juego ? this.juego.activos().filter(g => ![ "muerto" ].includes(g.accion)) : [];
  }
  cajaGuardia(g) {
    const p = g.o.position;
    return {
      c: V(p.x * 1e3, p.y * 1e3 + 900, p.z * 1e3),
      s: V(300, 900, 300)
    };
  }
  poder(c, s, n, modo) {
    if (this.sn.visible && choca(c, s, this.sn.mov, this.sn.tam)) this.dañarSnake(n, modo);
    for (const g of this.guardias()) {
      const k = this.cajaGuardia(g);
      if (choca(c, s, k.c, k.s)) this.juego.dañar(g, n, 1);
    }
    for (const x of this.lista) if (x.mov && (x.tipo === "CAMERA" || x.tipo === "CAMERA2" || x.tipo === "CAMERAGUN") && !x.dest && choca(c, s, x.mov, V(300, 300, 300))) x.golpe = modo;
  }
  explosion(pos, op = {}) {
    const c = V(Math.round(pos.x * 1e3), Math.round(pos.y * 1e3), Math.round(pos.z * 1e3));
    for (const x of this.lista) if (x.mov && !x.dest && (x.tipo === "CAMERA" || x.tipo === "CAMERA2" || x.tipo === "CAMERAGUN") && choca(c, V(2e3, 2e3, 2e3), x.mov, V(300, 300, 300))) x.golpe = 2;
    if (op.ruido !== false && this.juego) this.juego.setRuido(255, 32, pos.clone ? pos.clone() : aM(c));
    if (op.efecto !== false) this.explotar(c, 1.6);
  }
  golpeBala(origen, dir, alcance = 60) {
    const a = V(origen.x * 1e3, origen.y * 1e3, origen.z * 1e3), b = V(a.x + dir.x * alcance * 1e3, a.y + dir.y * alcance * 1e3, a.z + dir.z * alcance * 1e3);
    let mejor = null;
    for (const x of this.lista) if (x.mov && !x.dest && x.tipo !== "CLAYMORE") {
      const h = segmentoCaja(a, b, x.mov, V(300, 300, 300));
      if (h && (!mejor || h.t < mejor.t)) mejor = {
        t: h.t,
        sensor: x,
        p: aM(h.p)
      };
    }
    return mejor ? {
      distancia: mejor.t * alcance,
      sensor: mejor.sensor,
      punto: mejor.p
    } : null;
  }
  mensaje(nombre, msg) {
    for (const s of this.lista) {
      if (nombre && s.nombre !== nombre) continue;
      if (msg === KILL) s.muerta = true;
      if (s.tipo === "KIKENKUN") {
        if (msg === ENTRAR) s.activo = true;
        if (msg === SALIR) s.activo = false;
      }
      if (s.tipo === "CAMERA") {
        if (msg === ENTRAR) s.activo = 1;
        if (msg === SALIR) s.activo = 0;
      }
      if (s.tipo === "CAMERA" && (msg === 10081 || msg === 60799)) s.sonido = msg === 10081 ? 1 : 0;
      if (s.tipo === "CAMERAGUN") {
        if (msg === 10081) s.sonido = 1; else if (msg === 60799) s.sonido = 0; else if (msg === 2215) s.vision = 1; else if (msg === 34459) s.vision = 0; else if (msg === 57182) s.parada = 0; else if (msg === 22680) s.parada = 1;
      }
      if (s.tipo === "CENSOR") {
        if (msg === 56572) s.forzadoOn = 1;
        if (msg === 57602) s.forzadoOn = 0;
      }
    }
  }
  kiken(activo, nombre) {
    for (const s of this.lista) if (s.tipo === "KIKENKUN" && (!nombre || s.nombre === nombre)) s.activo = !!activo;
  }
  bala(o, dir, daño, largo, vel) {
    const fin = V(o.x + dir.x * largo, o.y + dir.y * largo, o.z + dir.z * largo);
    let hasta = largo;
    const m = this.malla(0);
    if (m) {
      this.ray = this.ray || new THREE.Raycaster;
      this.ray.set(aM(o), new THREE.Vector3(dir.x, dir.y, dir.z).normalize());
      this.ray.far = largo * MM;
      const h = this.ray.intersectObject(m, false)[0];
      if (h) hasta = h.distance * 1e3;
    }
    const mesh = this.juego?.ctx?.balaVisual?.(aM(o), new THREE.Vector3(dir.x, dir.y, dir.z));
    this.balas.push({
      p: {
        ...o
      },
      dir: dir,
      "daño": daño,
      hasta: hasta,
      d: 0,
      vel: vel,
      mesh: mesh,
      fin: fin
    });
  }
  balasCuadro() {
    for (const b of this.balas.slice()) {
      b.d += b.vel;
      const sig = b.d >= b.hasta ? V(b.p.x + b.dir.x * (b.hasta - b.d + b.vel), b.p.y + b.dir.y * (b.hasta - b.d + b.vel), b.p.z + b.dir.z * (b.hasta - b.d + b.vel)) : V(b.p.x + b.dir.x * b.vel, b.p.y + b.dir.y * b.vel, b.p.z + b.dir.z * b.vel);
      let fin = false;
      if (this.sn.visible) {
        const h = segmentoCaja(b.p, sig, this.sn.mov, this.sn.tam);
        if (h) {
          this.dañarSnake(b.daño, 1);
          fin = true;
        }
      }
      if (!fin) for (const g of this.guardias()) {
        const k = this.cajaGuardia(g);
        if (segmentoCaja(b.p, sig, k.c, k.s)) {
          this.juego.dañar(g, b.daño, 1);
          fin = true;
          break;
        }
      }
      b.p = sig;
      if (!fin && b.d >= b.hasta) {
        fin = true;
        if (b.hasta < 65535) {
          this.chispa(sig);
          if (randU(4) === 0) this.son(SE.REBOTE, sig);
        }
      }
      if (b.mesh) {
        b.mesh.position.copy(aM(b.p));
        if (fin) b.mesh.removeFromParent();
      }
      if (fin) this.balas.splice(this.balas.indexOf(b), 1);
    }
  }
  esquirlas(pos, dir, n) {
    const v2 = V(pos.x + randS(256), pos.y + randS(128), pos.z);
    const ini = rotYXZ(dir, V(200, 200, 200)), o = V(v2.x + ini.x, v2.y + ini.y, v2.z + ini.z);
    if (n === 8) {
      this.son(SE.EXPLOSION, pos, "bomba");
      if (this.juego) this.juego.setRuido(255, 32, aM(pos));
      this.explotar(o, 1.4);
    }
    for (let i = 0; i < 2; i++) {
      const r = V(dir.x + randS(512), dir.y + randS(512), 0);
      const d = rotYXZ(r, V(0, 0, 1)), a0 = V(o.x + d.x * 200, o.y + d.y * 200, o.z + d.z * 200);
      let alcance = 1e4, pega = 0;
      const m = this.malla(SEG_NO_PLAYER);
      if (m) {
        this.ray = this.ray || new THREE.Raycaster;
        this.ray.set(aM(a0), new THREE.Vector3(d.x, d.y, d.z));
        this.ray.far = 9.8;
        const h = this.ray.intersectObject(m, false)[0];
        if (h) {
          alcance = h.distance * 1e3 + 200;
          pega = 1;
        }
      }
      const mesh = propio(new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .3), new THREE.MeshBasicMaterial({
        color: 16769184
      })));
      mesh.position.copy(aM(o));
      mesh.lookAt(aM(V(o.x + d.x, o.y + d.y, o.z + d.z)));
      this.grupo.add(mesh);
      this.esq.push({
        p: {
          ...o
        },
        d: d,
        alcance: alcance,
        dist: 0,
        pega: pega,
        mesh: mesh,
        fin: 0
      });
    }
  }
  esquirlasCuadro() {
    for (const e of this.esq.slice()) {
      if (e.fin) {
        if (++e.fin > 3) {
          e.mesh.removeFromParent();
          this.esq.splice(this.esq.indexOf(e), 1);
        }
        continue;
      }
      e.dist += 1500;
      const sig = e.dist < e.alcance ? V(e.p.x + e.d.x * 1500, e.p.y + e.d.y * 1500, e.p.z + e.d.z * 1500) : V(e.p.x + e.d.x * (e.alcance - e.dist + 1500), e.p.y + e.d.y * (e.alcance - e.dist + 1500), e.p.z + e.d.z * (e.alcance - e.dist + 1500));
      let golpe = false;
      if (this.sn.visible) {
        const h = segmentoCaja(e.p, sig, this.sn.mov, this.sn.tam);
        if (h) {
          this.dañarSnake(256, 2);
          golpe = true;
        }
      }
      if (!golpe) for (const g of this.guardias()) {
        const k = this.cajaGuardia(g);
        if (segmentoCaja(e.p, sig, k.c, k.s)) {
          this.juego.dañar(g, 256, 1);
          golpe = true;
          break;
        }
      }
      e.p = sig;
      e.mesh.position.copy(aM(sig));
      if (golpe) {
        e.alcance = 0;
        e.pega = 2;
      }
      if (e.alcance <= e.dist) {
        if (e.pega === 1 && randU(32) > 20) {
          this.chispa(sig);
          this.son(SE.REBOTE_FUERTE, sig);
        }
        e.fin = 1;
        e.mesh.visible = false;
      }
    }
  }
  efecto(tex, pos, t, tam0, tam1, color, aditivo = true) {
    const s = propio(new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      color: color,
      transparent: true,
      depthWrite: false,
      blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending
    })));
    s.position.copy(pos.isVector3 ? pos : aM(pos));
    s.scale.setScalar(tam0);
    this.grupo.add(s);
    this.fx.push({
      s: s,
      t: t,
      t0: t,
      tam0: tam0,
      tam1: tam1
    });
  }
  explotar(p, tam) {
    this.efecto(this.texFuego, p, 14, tam * .3, tam, 16777215);
    this.efecto(this.texLuz, p, 4, tam * 1.5, tam * 2, 16769200);
  }
  chispa(p) {
    this.efecto(this.texLuz, p, 4, .08, .25, 16769152);
  }
  fogonazo(p) {
    this.efecto(this.texLuz, p, 2, .25, .35, 16760928);
  }
  humo(p, n) {
    for (let i = 0; i < n; i++) this.efecto(this.texHumo, V(p.x + randS(200), p.y + randU(256), p.z + randS(200)), 30 + randU(16), .2, .8, 8421504, false);
  }
  cartel(s, texto, color) {
    if (!s.cartelSpr || s.cartelTxt !== texto + color) {
      s.cartelSpr?.removeFromParent();
      s.cartelSpr = propio(new THREE.Sprite(new THREE.SpriteMaterial({
        map: texTexto(texto, color),
        depthTest: false,
        transparent: true
      })));
      s.cartelSpr.scale.set(.8, .15, 1);
      s.cartelSpr.renderOrder = 999;
      this.grupo.add(s.cartelSpr);
      s.cartelTxt = texto + color;
    }
    s.cartelSpr.position.copy(aM(s.mov));
    s.cartelSpr.position.y += .6 + Math.min(16, s.f130) * .01;
    s.cartelT = 2;
  }
  dibujar(s) {
    if (s.obj && s.cuerpo && s.rot && s.tipo !== "CLAYMORE") {
      let m = s.mov;
      if (s.tipo === "CAMERAGUN" && s.retro) {
        const r = rotYXZ(s.rot, V(0, 0, 80));
        m = V(m.x - r.x, m.y - r.y, m.z - r.z);
      }
      s.cuerpo.position.copy(aM(m));
      s.cuerpo.rotation.set(s.rot.x * ANG, s.rot.y * ANG, s.rot.z * ANG, "YXZ");
      s.cuerpo.visible = !s.dest || s.tipo === "CAMERAGUN" && s.dest === 1;
      if (s.brazo) s.brazo.visible = s.cuerpo.visible;
    }
    if (s.tipo === "CLAYMORE" && s.cuerpo) {
      s.cuerpo.position.copy(aM(s.mov));
      s.cuerpo.rotation.set(s.rot.x * ANG, s.rot.y * ANG, s.rot.z * ANG, "YXZ");
      s.cuerpo.visible = !!s.visible;
    }
    if (s.ledSpr) {
      const c = s.led;
      s.ledSpr.material.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255);
      s.ledSpr.visible = !!(s.activo ?? 1) && c[0] + c[1] + c[2] > 0;
    }
    if (s.marcaSpr) {
      s.marcaSpr.visible = s.marcaT > 0;
      if (s.marcaT > 0) {
        s.marcaT--;
        s.marcaSpr.position.copy(aM(s.mov));
        s.marcaSpr.position.y += .5;
      }
    }
    if (s.cartelSpr && s.cartelT !== undefined) {
      if (--s.cartelT < 0) {
        s.cartelSpr.removeFromParent();
        s.cartelSpr = null;
        s.cartelT = undefined;
      }
    }
    if (s.tipo === "CENSOR" && s.haz && s.a0) {
      const a = aM(s.a0), b = aM(V(s.a0.x + (s.a1.x - s.a0.x) * s.largo, s.a0.y + (s.a1.y - s.a0.y) * s.largo, s.a0.z + (s.a1.z - s.a0.z) * s.largo));
      const p = s.haz.geometry.attributes.position;
      p.setXYZ(0, a.x, a.y, a.z);
      p.setXYZ(1, b.x, b.y, b.z);
      p.needsUpdate = true;
      s.haz.geometry.computeBoundingSphere();
      s.haz.material.opacity = s.brillo / 128;
      s.haz.visible = s.brillo > 0;
    }
    if (s.tipo === "SEARCHLIGHT" && s.manchaObj) {
      ponerMallaLuz(s.manchaObj, s.mov, s.rot, s.altura, s.cono);
      const ojo = this.ojo();
      s.manchaObj.visible = !ojo || ojo.y * 1e3 > s.altura;
      this.sombraSnake(s);
    }
    if (s.tipo === "SEARCHLIGHT") this.luzSnake(s);
    if (s.tipo === "SEARCHLIGHT" && s.conoObj && Sensores.conoReflector) {
      const eje = rotYXZ(s.rot, V(0, 0, 1)), baja = -eje.y;
      const L = baja > .05 ? Math.min(4e4, ((s.apex ? s.apex.y * 1e3 : s.mov.y) - s.altura + 1100) / baja) : 2e4;
      const r = Math.tan(s.cono / 2 * ANG) * L;
      if (s.apex === undefined) {
        const t = this.ctx.techoCerca?.(s.mov.x * MM, s.mov.z * MM, 4, s.mov.y * MM);
        s.apex = t && s.mov.y * MM - t.y < 4 ? t : null;
      }
      const o = s.apex ? s.apex.clone() : aM(s.mov), f = new THREE.Vector3(eje.x, eje.y, eje.z);
      s.conoObj.scale.set(r * MM, L * MM, r * MM);
      s.conoObj.position.copy(o).addScaledVector(f, L * MM / 2);
      s.conoObj.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), f);
      s.conoObj.material.opacity = s.m1 === 1 ? .2 : .12;
      s.conoObj.visible = true;
    } else if (s.conoObj) s.conoObj.visible = false;
  }
  ojo() {
    const c = this.ctx.camara?.() || globalThis.__mgs?.cam;
    if (!c) return null;
    c.getWorldPosition(this._ojo ||= new THREE.Vector3);
    return this._ojo;
  }
  sombraSnake(s) {
    const o = s.sombraObj, sn = this.sn;
    if (!o) return;
    const cab = sn.cabeza.y;
    let h = cab - s.altura;
    h = h < 300 ? 10 : h > 1e3 ? h + 300 : h;
    if (!sn.visible || !s.enLuz) {
      o.visible = false;
      return;
    }
    const sombra = s.f2A8 < s.cono / 4 ? 78 : Math.trunc((s.f2A8 - Math.trunc(s.cono / 4)) * 78 / Math.max(1, Math.trunc(s.cono / 4)));
    const dx = sn.mov.x - s.mov.x, dy = cab - s.mov.y, dz = sn.mov.z - s.mov.z;
    const t = ratan2(dy, Math.round(Math.hypot(dx, dz))) + 1024;
    let largo = (t & 2047) !== 1024 ? h * Math.sin(t * ANG) / Math.cos(t * ANG) : h * Math.sin(t * ANG);
    const l = this.localDe(s, V(sn.mov.x, cab, sn.mov.z)), a2 = and12(ratan2(Math.round(Math.hypot(l.x, l.y)), Math.round(l.z)));
    if (a2 > s.cono / 2) {
      const tg = a => Math.tan(a * ANG), t6 = tg(s.cono / 2), t1 = tg(s.f2A8), t0 = tg(a2) - t1;
      largo = t0 !== 0 ? largo * (t6 - t1) / t0 : 0;
    }
    const e = -200 - largo, p = o.geometry.attributes.position;
    p.setXYZ(0, e * MM, 0, e * MM);
    p.setXYZ(1, .2, 0, -.2);
    p.setXYZ(2, -.2, 0, .2);
    p.setXYZ(3, .2, 0, .2);
    p.needsUpdate = true;
    o.position.set(sn.mov.x * MM, (s.altura + 10) * MM, sn.mov.z * MM);
    o.rotation.set(0, and12(ratan2(dx, dz) + 1536) * ANG, 0);
    o.material.color.setScalar(sombra / 128);
    o.visible = sombra > 0;
  }
  localDe(s, p) {
    return s.local ? s.local(p) : p;
  }
  luzSnake(s) {
    const sn = this.sn;
    if (!sn.visible || !s.enLuz) {
      s.luzTmp = null;
      return;
    }
    const dx = sn.mov.x - s.mov.x, dy = sn.mov.y - s.mov.y, dz = sn.mov.z - s.mov.z;
    const p = rotYXZ({
      x: ratan2(dy, Math.floor(Math.sqrt(dx * dx + dz * dz))) + 1024,
      y: s.rot.y,
      z: 0
    }, V(0, 0, -512));
    s.luzTmp = {
      p: V(sn.mov.x + p.x, sn.mov.y + p.y, sn.mov.z + p.z),
      r: 1024,
      e: 2e3
    };
  }
  aplicarLucesTmp() {
    const luces = [];
    for (const s of this.lista) if (s.luzTmp && !s.muerta) luces.push(s.luzTmp);
    const objs = [], c = globalThis.__mgs?.cuerpo?.obj;
    if (c?.parent) objs.push(c);
    if (luces.length || this._tmpTeñidos?.size) for (const g of this.juego?.activos?.() || []) if (g.o?.visible) objs.push(g.o);
    const amb = this.ctx.nivel?.luz?.amb || [ 0, 0, 0 ], _p = this._pTmp ||= new THREE.Vector3, vistos = new Set;
    for (const o of objs) {
      o.getWorldPosition(_p);
      const x = _p.x * 1e3, y = _p.y * 1e3 + 900, z = _p.z * 1e3;
      let f = 0;
      for (const l of luces) {
        const ex = x - l.p.x, ey = y - l.p.y, ez = z - l.p.z;
        if (Math.abs(ex) > l.e || Math.abs(ey) > l.e || Math.abs(ez) > l.e) continue;
        f = Math.max(0, 2 * l.r - Math.hypot(ex, ey, ez)) / l.r * .75 * .42 * (255 / 256);
        break;
      }
      o.traverse(m => {
        const mat = m.isMesh ? m.material : null;
        if (!mat?.isMeshBasicMaterial || !mat.color) return;
        const u = mat.userData;
        vistos.add(mat);
        if (!u.tmpBase || !u.tmpPuesto || !mat.color.equals(u.tmpPuesto)) u.tmpBase = mat.color.clone();
        if (f > 0) {
          mat.color.setRGB(...[ 0, 1, 2 ].map(k => Math.min(1.25, [ u.tmpBase.r, u.tmpBase.g, u.tmpBase.b ][k] + (256 - amb[k]) / 256 * f)));
          u.tmpPuesto = (u.tmpPuesto || new THREE.Color).copy(mat.color);
        } else if (u.tmpPuesto) {
          if (mat.color.equals(u.tmpPuesto)) mat.color.copy(u.tmpBase);
          u.tmpPuesto = null;
          u.tmpBase = null;
        }
      });
    }
    this._tmpTeñidos = luces.length ? vistos : null;
  }
  texReflector() {
    if (!this._texLit) {
      const t = this._texLit = (new THREE.TextureLoader).load("assets/hud/lit_59fc.png");
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false;
      t.magFilter = THREE.NearestFilter;
    }
    return this._texLit;
  }
  texSombra() {
    if (!this._texSombra) {
      const t = this._texSombra = (new THREE.TextureLoader).load("assets/hud/shadow.png");
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false;
    }
    return this._texSombra;
  }
  infoSnake() {
    const J = this.juego, sn = this.sn, f = this.ctx.snake?.();
    const rig = J?.ctx?.rig;
    const pos = f?.pos || rig?.position || new THREE.Vector3;
    const postura = f?.postura ?? (J ? J.postura() : 0);
    sn.visible = f?.visible ?? (!!J && J.activo && !J.ctx.vuelo() && !J.muerto);
    sn.mov = V(Math.round(pos.x * 1e3), Math.round(pos.y * 1e3) + ALT_SNAKE[postura], Math.round(pos.z * 1e3));
    sn.tam = V(300, Math.min(700, Math.max(500, ALT_SNAKE[postura])), 300);
    sn.hzd = Math.round(pos.y * 1e3) + (HZD_ALTO[postura] ?? 750);
    sn.estado = (postura === 1 ? 32 : 0) | (postura === 2 ? 64 : 0) | (f?.caja ? 4096 : 0);
    sn.caja = f?.caja ?? !!J?.ctx?.inventario?.enCaja;
    sn.sigilo = f?.sigilo ?? !!J?.sigilo?.();
    sn.ducto = !!f?.ducto || ductoSnake.activo;
    if (!f) sn.estado = sn.estado & ~4096 | (sn.caja ? 4096 : 0);
    const yaw = f?.yaw ?? J?.ctx?.yawSnake?.() ?? 0;
    sn.dir = (Math.round((yaw + Math.PI) / ANG) % 4096 + 4096) % 4096;
    const c = f?.cabeza;
    sn.cabeza = c ? V(c.x * 1e3, c.y * 1e3, c.z * 1e3) : V(sn.mov.x, Math.round(pos.y * 1e3) + 1550, sn.mov.z);
  }
  cuadro() {
    this.cuadros++;
    this.gvTime++;
    if (this.chaffT > 0) this.chaffT--;
    if (this.invul > 0) this.invul--;
    this.guncamRota = false;
    this.infoSnake();
    for (const s of this.lista) if (!s.muerta) s.cuadro();
    this.balasCuadro();
    this.esquirlasCuadro();
    for (const s of this.lista.filter(x => x.muerta)) {
      s.obj?.removeFromParent();
      s.cartelSpr?.removeFromParent();
      this.lista.splice(this.lista.indexOf(s), 1);
    }
    for (const s of this.lista) this.dibujar(s);
    for (const e of this.fx.slice()) {
      e.t--;
      const k = 1 - e.t / e.t0;
      e.s.scale.setScalar(e.tam0 + (e.tam1 - e.tam0) * k);
      e.s.material.opacity = Math.max(0, e.t / e.t0);
      if (e.t <= 0) {
        e.s.removeFromParent();
        e.s.material.dispose();
        this.fx.splice(this.fx.indexOf(e), 1);
      }
    }
  }
  update(dt) {
    this.acum += dt;
    let n = 0;
    while (this.acum >= 1 / FPS && n < 4) {
      this.acum -= 1 / FPS;
      this.cuadro();
      n++;
    }
    if (n === 4) this.acum = 0;
    this.aplicarLucesTmp();
  }
  paso(n = 1) {
    for (let i = 0; i < n; i++) this.cuadro();
  }
  conosRadar() {
    const out = [], sn = this.sn;
    for (const s of this.lista) {
      if (s.dest || s.muerta || !s.mov) continue;
      const dy = s.mov.y - sn.hzd;
      if (s.tipo === "CAMERA" || s.tipo === "CAMERAGUN" && s.vision && !s.fuera) {
        const en = dy >= 0 && dy < 6e3;
        out.push({
          p: aM(s.mov),
          r: s.rot.y * ANG,
          alerta: s.m1 === 1,
          dis: s.tipo === "CAMERAGUN" && !s.radarOn ? 0 : s.l * MM,
          mitad: s.w * ANG,
          color: "amarillo",
          tipo: s.tipo,
          enAltura: en
        });
      } else if (s.tipo === "CAMERA2" || s.tipo === "CAMERAGUN") {
        const en = dy >= -2e3 && dy < 2e3;
        out.push({
          p: aM(s.mov),
          r: s.rot.y * ANG,
          alerta: s.m1 === 1,
          dis: 0,
          mitad: s.w * ANG,
          color: "celeste",
          tipo: s.tipo,
          enAltura: en
        });
      } else if (s.tipo === "CLAYMORE" && this.detectorMinas && s.estado < 2) {
        out.push({
          p: aM(s.mov),
          r: s.radarDir * ANG,
          alerta: false,
          dis: 2,
          mitad: 512 * ANG,
          color: "amarillo",
          tipo: "CLAYMORE",
          enAltura: dy > -2750 && dy < 2e3
        });
      }
    }
    return out;
  }
  estado() {
    return this.lista.map(s => ({
      tipo: s.tipo,
      nombre: s.nombre,
      m: [ s.m1, s.m2 ],
      t: s.t,
      rot: s.rot ? {
        x: s.rot.x,
        y: s.rot.y
      } : null,
      led: s.led,
      dest: s.dest || 0,
      estado: s.estado,
      explota: s.explota,
      visible: s.visible,
      activo: s.activo
    }));
  }
  destruir() {
    for (const b of this.balas) b.mesh?.removeFromParent();
    this.grupo.removeFromParent();
    for (const m of Object.values(this.mallas)) m?.geometry.dispose();
  }
}
