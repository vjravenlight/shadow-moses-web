// MGS web — FeniXVOID · Project Ravenlight
const W0 = 320, H0 = 240;

const FPS = 30;

export const MODOS_HUD = {
  original: "Original",
  adaptado: "Adaptado"
};

const est = {
  modo: null,
  tactil: null,
  seg: {
    l: 0,
    t: 0,
    r: 0,
    b: 0
  },
  segClave: "",
  sonda: null
};

function esTactil() {
  if (est.tactil == null) {
    try {
      est.tactil = new URLSearchParams(location.search).has("tactil") || matchMedia("(pointer: coarse)").matches;
    } catch {
      est.tactil = false;
    }
  }
  return est.tactil;
}

export function configurarHud({tactil: tactil} = {}) {
  if (tactil != null) {
    est.tactil = !!tactil;
    disposicion.clave = "";
  }
}

export function modoHud() {
  if (!est.modo) {
    let m = null;
    try {
      m = localStorage.getItem("sm_hud");
    } catch {}
    est.modo = MODOS_HUD[m] ? m : esTactil() ? "adaptado" : "original";
  }
  return est.modo;
}

export function ponerModoHud(m) {
  if (!MODOS_HUD[m]) return;
  est.modo = m;
  disposicion.clave = "";
  try {
    localStorage.setItem("sm_hud", m);
  } catch {}
  try {
    dispatchEvent(new CustomEvent("hud-modo", {
      detail: m
    }));
  } catch {}
}

function medirSeguras() {
  if (typeof document === "undefined") return;
  if (!est.sonda) {
    const s = document.createElement("div");
    s.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" + "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(s);
    est.sonda = s;
  }
  const cs = getComputedStyle(est.sonda);
  const v = {
    t: parseFloat(cs.paddingTop) || 0,
    r: parseFloat(cs.paddingRight) || 0,
    b: parseFloat(cs.paddingBottom) || 0,
    l: parseFloat(cs.paddingLeft) || 0
  };
  est.seg = v;
  est.segClave = `${v.t},${v.r},${v.b},${v.l}`;
}

if (typeof addEventListener === "function") addEventListener("resize", () => {
  est.segClave = "";
  disposicion.clave = "";
});

export const disposicion = {
  clave: "",
  vidaY: 16,
  jefeHasta: 0
};

const BOTON_ALTO = 34;

export function disposicionHud() {
  if (typeof innerWidth === "undefined") return disposicion;
  if (!est.segClave) medirSeguras();
  const iw = innerWidth, ih = innerHeight, dpr = Math.min(3, typeof devicePixelRatio === "number" && devicePixelRatio || 1);
  const modo = modoHud(), tactil = esTactil();
  const clave = `${iw}x${ih}@${dpr}|${modo}|${tactil}|${est.segClave}`;
  const D = disposicion;
  if (D.clave === clave) return D;
  D.clave = clave;
  D.modo = modo;
  D.tactil = tactil;
  D.dpr = dpr;
  D.iw = iw;
  D.ih = ih;
  const exacta = Math.min(iw / W0, ih / H0);
  if (modo === "original" || !tactil) {
    let kd = Math.max(1, Math.floor(exacta * dpr + 1e-6));
    if (kd < exacta * dpr * .8) kd = Math.max(1, exacta * dpr);
    D.kd = kd;
  } else D.kd = Math.max(1, Math.floor(Math.max(1.25, Math.min(3, Math.min(iw, ih) / 195)) * dpr + 1e-6));
  const k = D.kd / dpr, W = iw / k, H = ih / k, S = est.seg;
  const sl = S.l / k, st = S.t / k, sr = S.r / k, sb = S.b / k;
  D.kcss = k;
  D.W = W;
  D.H = H;
  if (modo === "original") {
    const ox = Math.round((iw * dpr - W0 * D.kd) / 2) / D.kd, oy = Math.round((ih * dpr - H0 * D.kd) / 2) / D.kd;
    D.marco = [ ox, oy, W0, H0 ];
    D.vida = [ ox + 16, oy + 16 ];
    D.radar = [ ox + 235, oy + 16 ];
    D.item = [ ox + 16, oy + 184 ];
    D.arma = [ ox + 256, oy + 184 ];
    D.abreAbajo = false;
  } else if (!tactil) {
    D.marco = null;
    D.vida = [ sl + 16, st + 16 ];
    D.radar = [ W - sr - 16 - 69, st + 16 ];
    D.item = [ sl + 16, H - sb - 56 ];
    D.arma = [ W - sr - 64, H - sb - 56 ];
    D.abreAbajo = false;
  } else {
    const m = 10, vertical = ih >= iw;
    D.marco = null;
    D.vida = [ sl + m + 1, st + m ];
    D.radar = [ W - sr - m - 69 - 1, st + m + 1 ];
    D.item = [ sl + m + 4, D.vida[1] + 24 + BOTON_ALTO / k + 6 ];
    D.arma = vertical ? [ W - sr - m - 51, D.radar[1] + 52 + 7 ] : [ D.radar[0] - 1 - 6 - 51, D.radar[1] - 1 ];
    D.abreAbajo = true;
  }
  if (!tactil && modo === "original" && D.marco[0] * k >= 150) D.botonMenu = {
    x: Math.round(12 + S.l),
    y: Math.round(12 + S.t),
    alto: BOTON_ALTO
  }; else D.botonMenu = {
    x: Math.round((D.vida[0] - 1) * k),
    y: Math.round((D.vida[1] + 24) * k),
    alto: BOTON_ALTO
  };
  return D;
}

function actualizarOrigenJefes(D) {
  D.origenJefes = [ (D.vida[0] - 16) * D.kcss, (D.vida[1] - 16 + D.vidaY - 16) * D.kcss ];
}

export const CLUT_NUM = [ null, [ 0, 0, 0 ], [ 240, 176, 8 ], [ 8, 216, 80 ], [ 56, 120, 248 ], [ 240, 24, 0 ], [ 40, 0, 0 ], [ 64, 0, 0 ], [ 112, 8, 0 ], [ 144, 16, 16 ], [ 168, 32, 24 ], [ 144, 32, 40 ], [ 104, 40, 48 ], [ 56, 48, 64 ], [ 32, 48, 72 ], [ 184, 184, 184 ] ];

const mod5 = (c8, m) => {
  const v = Math.min(31, (c8 >> 3) * m >> 7);
  return v << 3 | v >> 2;
};

const ATLAS = {
  idxNum: null,
  idxRadar: null,
  cache: new Map,
  icono: null
};

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function indices(img) {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, out = new Uint8Array(c.width * c.height);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(d[i * 4] / 17);
  return {
    w: c.width,
    h: c.height,
    i: out
  };
}

let cargaAtlas = null;

export function cargarAtlasHud() {
  cargaAtlas ||= Promise.all([ "num_idx", "radar_idx", "icono_socom" ].map(k => cargarImg(`assets/hud/${k}.png`))).then(([n, r, ic]) => {
    ATLAS.idxNum = indices(n);
    ATLAS.idxRadar = indices(r);
    ATLAS.icono = ic;
    return !!(ATLAS.idxNum && ATLAS.idxRadar);
  });
  return cargaAtlas;
}

export function atlasNum(mod = [ 128, 128, 128 ]) {
  const A = ATLAS.idxNum;
  if (!A) return null;
  const clave = mod.join(",");
  let c = ATLAS.cache.get(clave);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = A.w;
  c.height = A.h;
  const x = c.getContext("2d"), im = x.createImageData(A.w, A.h), d = im.data;
  for (let i = 0; i < A.i.length; i++) {
    const col = CLUT_NUM[A.i[i]];
    if (!col) continue;
    d[i * 4] = mod5(col[0], mod[0]);
    d[i * 4 + 1] = mod5(col[1], mod[1]);
    d[i * 4 + 2] = mod5(col[2], mod[2]);
    d[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  ATLAS.cache.set(clave, c);
  return c;
}

const SIGNOS = {
  ".": [ 60, 3 ],
  ",": [ 66, 3 ],
  ":": [ 72, 3 ],
  "-": [ 78, 5 ],
  "!": [ 84, 3 ],
  "?": [ 90, 6 ],
  "+": [ 96, 6 ],
  _: [ 102, 6 ],
  "=": [ 108, 6 ],
  "%": [ 114, 6 ],
  "(": [ 120, 4 ],
  ")": [ 126, 4 ],
  "[": [ 120, 4 ],
  "]": [ 126, 4 ]
};

function glifosMenu(s) {
  const g = [];
  let w = 0;
  for (const ch of String(s)) {
    const lc = ch.toLowerCase(), cc = lc.charCodeAt(0);
    if (cc >= 48 && cc <= 57) {
      g.push([ (cc - 48) * 6, 0, w ]);
      w += 6;
    } else if (cc >= 97 && cc <= 122) {
      if (lc === "i") {
        w += 1;
        g.push([ (cc - 97) * 6, 5, w ]);
        w += 3;
      } else {
        g.push([ (cc - 97) * 6, 5, w ]);
        w += 6;
      }
    } else if (lc === " ") w += 4; else if (lc === "#") w += 6; else {
      const sg = SIGNOS[lc];
      if (!sg) continue;
      let av = sg[1];
      if (av < 3) {
        w += 1;
        av += 1;
      }
      g.push([ sg[0], 0, w ]);
      w += av;
    }
  }
  return {
    g: g,
    w: w
  };
}

export function anchoTextoMenu(s) {
  return glifosMenu(s).w;
}

export function textoMenu(x, X, Y, s, mod = [ 128, 128, 128 ]) {
  const {g: g, w: w} = glifosMenu(s), img = atlasNum(mod);
  if (img) for (const [tx, ty, gx] of g) x.drawImage(img, tx, ty, 6, 5, X + gx, Y, 6, 5);
  return X + w;
}

export const BARRA_VIDA = {
  nombre: "LIFE",
  izq: [ 16, 143, 127 ],
  der: [ 31, 223, 63 ],
  alto: 0
};

export const BARRA_O2 = {
  nombre: "O2",
  izq: [ 31, 63, 192 ],
  der: [ 31, 127, 255 ],
  alto: 1
};

export function barraMenu(x, X, Y, rest, now, max, conf, rojo = false) {
  const h = 5 - (conf.alto ?? conf.height ?? 0), y1 = Y + 1, ancho = Math.trunc(max / 8);
  const L = conf.izq || conf.left, R = conf.der || conf.right, nombre = conf.nombre ?? conf.name ?? "";
  rest = Math.min(rest, max);
  now = Math.max(0, Math.min(now, max));
  x.fillStyle = "#000";
  x.fillRect(X - 1, Y, 1, h + 2);
  x.fillRect(X, Y, ancho, 1);
  x.fillRect(X, Y + h + 1, ancho, 1);
  x.fillRect(X + ancho, Y, 1, h + 2);
  x.fillStyle = "rgba(0,24,24,0.5)";
  x.fillRect(X, y1, ancho, h);
  const w = Math.trunc((now + 7) / 8);
  if (w > 0) {
    const fin = L.map((v, i) => v + Math.trunc((R[i] - v) * w / 128));
    for (let c = 0; c < w; c++) {
      const t = c / w;
      x.fillStyle = `rgb(${Math.round(L[0] + (fin[0] - L[0]) * t)},${Math.round(L[1] + (fin[1] - L[1]) * t)},${Math.round(L[2] + (fin[2] - L[2]) * t)})`;
      x.fillRect(X + c, y1, 1, h);
    }
  }
  if (rest > now) {
    x.fillStyle = "rgb(200,0,0)";
    x.fillRect(X + Math.trunc(now / 8), y1, Math.trunc((rest - now) / 8), h);
  }
  const tw = anchoTextoMenu(nombre);
  x.fillStyle = "rgba(0,0,0,0.5)";
  x.fillRect(X + 3, Y + 3, tw + 2, 7);
  textoMenu(x, X + 4, Y + 4, nombre, rojo ? [ 255, 48, 48 ] : [ 255, 255, 255 ]);
}

class Raster {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.a = new Float32Array(w * h);
    this.c = new Float32Array(w * h * 3);
    this.img = null;
    this.limpiar();
  }
  limpiar() {
    this.a.fill(1);
    this.c.fill(0);
  }
  pix(x, y, r, g, b, modo) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x, j = i * 3, c = this.c;
    if (modo < 0) {
      this.a[i] = 0;
      c[j] = r;
      c[j + 1] = g;
      c[j + 2] = b;
    } else if (modo === 0) {
      this.a[i] *= .5;
      c[j] = (c[j] + r) * .5;
      c[j + 1] = (c[j + 1] + g) * .5;
      c[j + 2] = (c[j + 2] + b) * .5;
    } else if (modo === 1) {
      c[j] += r;
      c[j + 1] += g;
      c[j + 2] += b;
    } else if (modo === 2) {
      let falta = 0;
      for (const [k, v] of [ [ j, r ], [ j + 1, g ], [ j + 2, b ] ]) {
        const q = c[k] - v;
        if (q < 0) {
          falta -= q;
          c[k] = 0;
        } else c[k] = q;
      }
      if (falta > 0) this.a[i] = Math.max(0, this.a[i] - falta / 3 / 110);
    } else {
      c[j] += r / 4;
      c[j + 1] += g / 4;
      c[j + 2] += b / 4;
    }
  }
  rect(x, y, w, h, rgb, modo) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0), x1 = Math.min(this.w, x + w | 0), y1 = Math.min(this.h, y + h | 0);
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this.pix(xx, yy, rgb[0], rgb[1], rgb[2], modo);
  }
  linea(x0, y0, x1, y1, rgb, modo = -1) {
    x0 |= 0;
    y0 |= 0;
    x1 |= 0;
    y1 |= 0;
    if (Math.max(x0, x1) < 0 || Math.min(x0, x1) >= this.w || Math.max(y0, y1) < 0 || Math.min(y0, y1) >= this.h) return;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy, n = 0;
    for (;;) {
      this.pix(x0, y0, rgb[0], rgb[1], rgb[2], modo);
      if (x0 === x1 && y0 === y1 || ++n > 400) break;
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
  cono(ox, oy, P, main, fade) {
    const [L, F, Rr] = P;
    const xs = [ ox, L[0], F[0], Rr[0] ], ys = [ oy, L[1], F[1], Rr[1] ];
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(this.w - 1, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    const bar = (px, py, a, b, c) => {
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (!d) return null;
      const u = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d, v = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
      return [ u, v, 1 - u - v ];
    };
    const O = [ ox, oy ], t1 = [ O, L, F ], t2 = [ O, F, Rr ], E = -1e-6;
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const cx = px + .5, cy = py + .5;
      let b = bar(cx, cy, ...t1);
      if (!b || b[0] < E || b[1] < E || b[2] < E) {
        b = bar(cx, cy, ...t2);
        if (!b || b[0] < E || b[1] < E || b[2] < E) continue;
      }
      const u = b[0], r = 1 - u;
      this.pix(px, py, main[0] * u + fade[0] * r, main[1] * u + fade[1] * r, main[2] * u + fade[2] * r, 1);
    }
  }
  sprite(T, u, v, w, h, x, y, clut, mod, modoSemi) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const uu = u + i, vv = v + j;
      if (uu >= T.w || vv >= T.h) continue;
      const col = clut[T.i[vv * T.w + uu]];
      if (!col) continue;
      const r = mod5(col[0], mod[0]), g = mod5(col[1], mod[1]), b = mod5(col[2], mod[2]);
      this.pix(x + i, y + j, r, g, b, col[3] ? modoSemi : -1);
    }
  }
  volcar(ctx) {
    const n = this.w * this.h;
    if (!this.img) this.img = ctx.createImageData(this.w, this.h);
    const d = this.img.data, a = this.a, c = this.c;
    for (let i = 0; i < n; i++) {
      let A = 1 - a[i];
      const r = c[i * 3], g = c[i * 3 + 1], b = c[i * 3 + 2], k = i * 4;
      if (A < .004) {
        const m = Math.max(r, g, b);
        if (m <= .5) {
          d[k + 3] = 0;
          continue;
        }
        A = Math.min(1, m / 255);
      }
      d[k] = Math.min(255, r / A);
      d[k + 1] = Math.min(255, g / A);
      d[k + 2] = Math.min(255, b / A);
      d[k + 3] = Math.round(Math.min(1, A) * 255);
    }
    ctx.putImageData(this.img, 0, 0);
  }
}

const C15 = v => [ (v & 31) * 255 / 31, (v >> 5 & 31) * 255 / 31, (v >> 10 & 31) * 255 / 31, v >> 15 & 1 ];

const FONDO_RADAR = [ [ 0, 160, 72 ], [ 110, 110, 0 ], [ 222, 0, 0 ], [ 0, 24, 24 ] ];

const TEXTO_RADAR = [ [ 137, 37, 24 ], [ 137, 71, 24 ], [ 137, 37, 24 ], [ 24, 137, 51 ] ];

const SEG_ON = [ 35985, 36113 ], SEG_OFF = [ 32803, 32803 ];

const DIGITO7 = [ 119, 36, 93, 109, 46, 107, 123, 37, 127, 111 ];

const CLUT_RADAR = (() => {
  const c = new Array(16).fill(null);
  c[15] = C15(49680);
  return c;
})();

const CONO = {
  celeste: [ [ 0, 128, 128 ], [ 0, 0, 16 ] ],
  rojo: [ [ 160, 0, 0 ], [ 16, 0, 0 ] ],
  amarillo: [ [ 160, 160, 0 ], [ 8, 8, 0 ] ]
};

const ESCALA_RADAR = 13 / 4096;

const UV = {
  sim: [ [ 0, 0, 28, 12 ], [ 28, 0, 28, 12 ], null, [ 10, 26, 58, 12 ] ],
  cartel: [ [ 0, 12, 44, 7 ], [ 0, 19, 58, 7 ], null, [ 10, 38, 58, 7 ] ],
  rayas: [ 60, 19, 36, 3 ],
  digito: [ 0, 26, 10, 16 ],
  consola: [ 68, 22, 28, 22 ]
};

const BARRA = {
  OCULTA: 0,
  BAJA: 1,
  QUIETA: 2,
  SUBE: 3
};

export class Hud {
  constructor() {
    this.cv = document.getElementById("hudcv");
    this.ctx = this.cv?.getContext("2d");
    this.radar = document.createElement("canvas");
    this.radar.width = 69;
    this.radar.height = 52;
    this.ras = new Raster(69, 52);
    this.muñeca = document.createElement("canvas");
    this.muñeca.width = 144;
    this.muñeca.height = 80;
    this.franja = document.createElement("canvas");
    this.franja.width = 224;
    this.franja.height = 30;
    this.versionFranja = 0;
    this._firmaFranja = "";
    this.listo = false;
    this.t = 0;
    this.acum = 0;
    this.f = 0;
    this.mostrada = null;
    this.demora = 10;
    this.dañoCuenta = 0;
    this.dañoPedido = false;
    this.barra = {
      estado: BARRA.OCULTA,
      y: -48,
      espera: 0,
      o2: 0
    };
    this.cons = {
      x: 0,
      y: 0
    };
    this.barrido = 0;
    this.modoAntes = 0;
    this.semilla = 1;
    this.vidaMostrada = 1;
    globalThis.__mgsHud = this;
  }
  async cargar() {
    this.listo = await cargarAtlasHud();
    if (!this.listo) console.warn("hud: faltan assets/hud/num_idx.png o radar_idx.png (python tools/hud_indices.py)");
  }
  "daño"() {
    this.dañoPedido = true;
  }
  paso(d, vit, max, o2, rM) {
    this.f++;
    this.semilla = Math.random() * 4294967296 >>> 0;
    if (this.mostrada == null) this.mostrada = vit;
    let cambio;
    if (this.mostrada === vit) {
      this.demora = 10;
      cambio = false;
    } else {
      if (vit < this.mostrada) {
        if (this.demora === 0) this.mostrada -= 64; else this.demora--;
      }
      if (this.mostrada < vit) this.mostrada = vit;
      cambio = true;
    }
    if (o2 < 1024) {
      cambio = true;
      this.barra.o2 = -106;
    }
    if (this.dañoPedido) {
      this.dañoPedido = false;
      this.dañoCuenta = 8;
    } else if (this.dañoCuenta > 0) this.dañoCuenta--;
    const B = this.barra, pide = !!d.menuAbierto || performance.now() < disposicion.jefeHasta, mitad = max / 2 >= vit;
    if (disposicion.modo !== "original") {
      B.estado = BARRA.QUIETA;
      B.y = 16;
      B.o2 = o2 < 1024 ? -106 : 0;
    } else {
      if ((B.estado === BARRA.OCULTA || B.estado === BARRA.SUBE) && (cambio || pide || mitad)) {
        if (B.estado === BARRA.OCULTA) B.y = -48;
        B.estado = BARRA.BAJA;
        this.dañoCuenta = 0;
      }
      if (B.estado === BARRA.BAJA) {
        B.y += 8;
        if (B.y >= 16) {
          B.y = 16;
          B.estado = BARRA.QUIETA;
          B.espera = 150;
        }
      } else if (B.estado === BARRA.SUBE) {
        B.y -= 8;
        if (B.y < -47) {
          B.estado = BARRA.OCULTA;
          B.y = -48;
          if (o2 >= 1024) B.o2 = 0;
        }
      } else if (B.estado === BARRA.QUIETA) {
        if (cambio || mitad || pide) {
          B.espera = 150;
          if (B.o2) B.o2++;
        } else if (--B.espera <= 0) B.estado = BARRA.SUBE;
      }
    }
    if (B.estado === BARRA.OCULTA && o2 >= 1024) B.o2 = 0;
    if (rM === 1) {
      if (++this.cons.x >= 57) {
        this.cons.x = 0;
        this.cons.y++;
      }
    } else if (rM >= 2) {
      if (++this.cons.x > 24) {
        this.cons.x = 0;
        this.cons.y++;
      }
    } else if (this.barrido > 0) this.barrido -= 2; else {
      this.cons.x = 0;
      this.cons.y = 0;
    }
    if (rM === 0 && this.modoAntes !== 0) this.barrido = 93;
    if (rM === 1 && this.modoAntes === 0) d.sonar?.(120);
    if (rM === 0 && this.modoAntes === 1) d.sonar?.(14);
    this.modoAntes = rM;
  }
  radarNormal(d, R, puntos) {
    R.rect(0, 0, 69, 52, FONDO_RADAR[3], 0);
    const yo = d.yo, mm = 1e3;
    const sx = Math.trunc(yo.x * mm * ESCALA_RADAR), sz = Math.trunc(yo.z * mm * ESCALA_RADAR);
    const giro = d.giroRadar || 0, cg = Math.cos(giro), sg = Math.sin(giro);
    const P = giro ? (x, z) => {
      const dx = (x - yo.x) * mm * ESCALA_RADAR, dz = (z - yo.z) * mm * ESCALA_RADAR;
      return [ 34 + Math.trunc(dx * cg - dz * sg), 26 + Math.trunc(dx * sg + dz * cg) ];
    } : (x, z) => [ 34 + Math.trunc(x * mm * ESCALA_RADAR) - sx, 26 + Math.trunc(z * mm * ESCALA_RADAR) - sz ];
    const bajo = yo.y - .8, alto = yo.y + 1, claras = [];
    for (const s of d.segs || []) {
      if ((s.flags | 0) & 128) continue;
      const fuera = p => alto < p[1] || p[1] + (s.h || 0) < bajo;
      const a = P(s.a[0], s.a[2]), b = P(s.b[0], s.b[2]);
      if (Math.max(a[0], b[0]) < -2 || Math.min(a[0], b[0]) > 71 || Math.max(a[1], b[1]) < -2 || Math.min(a[1], b[1]) > 54) continue;
      if (fuera(s.a) && fuera(s.b)) R.linea(a[0], a[1], b[0], b[1], [ 0, 64, 0 ]); else claras.push([ a, b ]);
    }
    for (const [a, b] of claras) R.linea(a[0], a[1], b[0], b[1], [ 0, 160, 72 ]);
    if (!puntos) return;
    const cono = (x, y, r, dis, mitad, col) => {
      const len = Math.trunc(Math.trunc(dis * mm * ESCALA_RADAR) * 3 / 2);
      if (len <= 0) return;
      const pt = ang => [ x + len * Math.sin(ang), y + len * Math.cos(ang) ];
      R.cono(x + .5, y + .5, [ pt(r + mitad), pt(r), pt(r - mitad) ].map(([px, py]) => [ px + .5, py + .5 ]), col[0], col[1]);
    };
    for (const g of [ ...d.guardias || [], ...(d.minas || []).map(m => ({
      ...m,
      mitad: m.mitad ?? (m.ang ?? Math.PI / 2) / 2,
      color: "amarillo"
    })) ]) {
      if (!g?.p) continue;
      const [x, y] = P(g.p.x, g.p.z);
      if (x < -40 || x > 110 || y < -40 || y > 92) continue;
      const dy = g.p.y - yo.y, enAltura = g.enAltura ?? (dy >= -2 && dy < 2);
      if (!enAltura) {
        R.pix(x, y, 200, 0, 0, -1);
        continue;
      }
      const tipoAm = g.color ? g.color === "amarillo" : /CAMERA|CLAYMORE/.test(g.tipo || "");
      const rojo = g.color ? g.color === "rojo" : g.estado && g.estado !== "normal" || !g.estado && !!g.alerta;
      const dis = g.dis ?? 4, mitad = g.mitad ?? Math.PI / 4;
      if (dis > 0) cono(x, y, (g.r || 0) - giro, dis, mitad, CONO[tipoAm ? "amarillo" : rojo ? "rojo" : "celeste"]);
      R.pix(x, y, 255, 100, 0, -1);
    }
    if (d.primeraPersona !== false) cono(34, 26, (d.yaw || 0) + Math.PI - giro, 6.144 * Math.cos(d.pitch || 0), 300 / 4096 * Math.PI * 2, [ [ 0, 160, 72 ], [ 0, 0, 0 ] ]);
    R.pix(34, 26, 200, 200, 200, -1);
  }
  panelEstado(R, rM, nivel) {
    const T = ATLAS.idxRadar, fondo = FONDO_RADAR[rM - 1];
    R.rect(0, 0, 69, 52, fondo, 0);
    let rv = this.semilla >>> 0;
    for (let i = 0; i < 52; ) {
      const x0 = rv % 138 - 69, x1 = x0 + Math.floor(rv / 256) % 69 + 8;
      R.linea(x0 + 34, i, x1 + 34, i, fondo, 0);
      i += 4 + (rv >>> 24 & 7);
      rv = (rv << 25 | rv >>> 7) >>> 0;
    }
    if (rM === 4) return;
    const code = rM === 1 ? 3 : 3 - rM, tc = TEXTO_RADAR[code];
    const spr = (uv, x, y, mod, clut = CLUT_RADAR, w = uv[2], v0 = uv[1], h = uv[3]) => R.sprite(T, uv[0], v0, w, h, x, y, clut, mod, 2);
    const t = this.f % 16, k = t < 8 ? 1 - t / 8 : 1, tcb = tc.map(v => Math.trunc(v * k));
    const franja = (uv, y) => {
      const x = Math.trunc(-uv[2] / 2) + 34;
      spr(uv, x, y, tcb);
      R.rect(0, y, x, uv[3], tcb, 2);
      R.rect(x + uv[2], y, 69 - (x + uv[2]), uv[3], tcb, 2);
    };
    franja(UV.cartel[code], 1);
    franja(UV.rayas, 8);
    if (rM === 1) {
      spr(UV.sim[3], 6, 14, tc);
      const C = this.cons, n = Math.min(C.y, 7), y0 = n * 2 + 30, u = UV.consola;
      const fila = (x, y, w, v) => {
        if (w > 0) spr(u, x, y, tc, CLUT_RADAR, w, u[1] + v, 1);
      };
      if (C.x > 28) {
        fila(6, y0, 28, C.y % 16);
        fila(34, y0, C.x - 28, (C.y + 3) % 16);
      } else fila(6, y0, C.x, C.y % 16);
      for (let i = 1; i <= n; i++) {
        fila(6, y0 - i * 2, 28, (C.y - i + 16) % 16);
        fila(34, y0 - i * 2, 28, (C.y - i + 19) % 16);
      }
      return;
    }
    spr(UV.sim[code], 9, 14, tc);
    R.rect(7, 29, 55, 1, tc, 2);
    R.rect(7, 50, 55, 1, tc, 2);
    R.rect(33, 46, 3, 2, tc, 2);
    let v = Math.trunc((nivel === 255 ? 256 : nivel) * 9999 / 256);
    const cifras = [];
    for (let i = 0; i < 4; i++) {
      cifras.push(v % 10);
      v = Math.trunc(v / 10);
    }
    const xs = [ 9, 21, 38, 50 ];
    for (let j = 0; j < 4; j++) {
      const seg = DIGITO7[cifras[3 - j]] || 0, clut = new Array(16).fill(null);
      for (let s = 0; s < 7; s++) clut[s + 1] = C15(seg >> s & 1 ? SEG_ON[code] : SEG_OFF[code]);
      spr(UV.digito, xs[j], 32, [ 128, 128, 128 ], clut);
    }
    const C = this.cons, h = Math.min(C.y, 5), y0 = 14 + h * 2, u = UV.consola;
    if (C.x > 0) spr(u, 38, y0, tc, CLUT_RADAR, C.x, u[1] + C.y % 16, 1);
    for (let i = 1; i <= h; i++) spr(u, 38, y0 - i * 2, tc, CLUT_RADAR, 24, u[1] + (C.y - i + 16) % 16, 1);
  }
  dibujarRadar(d, rM, nivel) {
    const R = this.ras;
    R.limpiar();
    const puntos = this.f % 8 >= 2;
    if (rM === 0 && this.barrido > 0) {
      const L = this.barrido - 24;
      this.radarNormal(d, R, puntos);
      if (L >= 0) {
        const R2 = this.ras2 ||= new Raster(69, 52);
        R2.limpiar();
        this.panelEstado(R2, 4, 0);
        for (let y = 0; y < 52; y++) for (let x = 69 - L; x < 69; x++) {
          const i = y * 69 + x;
          R.a[i] = R2.a[i];
          R.c.set(R2.c.subarray(i * 3, i * 3 + 3), i * 3);
        }
      }
      for (let x = 45 - L; x < 69 - L; x++) {
        const t = (x - (45 - L)) / 24;
        for (let y = 0; y < 52; y++) R.pix(x, y, 0, 160 * t, 72 * t, 1);
      }
    } else if (rM === 0) this.radarNormal(d, R, puntos); else this.panelEstado(R, rM, nivel);
    R.volcar(this.radar.getContext("2d"));
  }
  recuadroArma(x, X, Y, a) {
    const ox = X + 4;
    x.fillStyle = "#000";
    x.fillRect(ox, Y, 47, 1);
    x.fillRect(ox - 4, Y, 14, 20);
    x.fillRect(ox + 45, Y + 1, 2, 19);
    x.fillRect(ox - 4, Y + 20, 51, 9);
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(ox + 10, Y + 1, 35, 19);
    const ic = ATLAS.icono;
    if (ic) x.drawImage(ic, ox + 20, Y + 3);
    const img = atlasNum([ 87, 87, 87 ]), total = Math.max(0, (a.balas | 0) + (a.reserva | 0));
    if (img) {
      let px = ox;
      for (const ch of String(total)) {
        x.drawImage(img, 156 + +ch * 6, 0, 6, 7, px, Y + 11, 6, 7);
        px += 6;
      }
    }
    const lleno = atlasNum([ 128, 128, 128 ]), cmax = a.cargador || 12;
    if (lleno) {
      let px = ox + 45;
      for (let i = 0; i < cmax; i++) {
        px -= 3;
        x.drawImage(lleno, i < (a.recargando ? 0 : a.balas) ? 216 : 220, 0, 4, 9, px, Y + 20, 4, 9);
      }
    }
  }
  dibujar(d, dt) {
    if (!this.listo || !this.ctx) return;
    this.t += dt;
    const D = disposicionHud();
    const max = d.vidaMax || 1024, vit = Math.max(0, Math.round(Math.max(0, d.vida) * max));
    const o2 = d.o2 != null ? Math.max(0, Math.round(d.o2 * 1024)) : 1024;
    const rM = d.modo === 1 ? 3 : d.modo === 2 ? 2 : d.chaff || d.jamming ? 1 : 0;
    const nivel = d.nivelAlerta ?? (d.modo === 1 ? Math.round((d.tiempo || 0) * 255 / 99.99) : d.modo === 2 ? Math.min(256, Math.round((d.tiempo || 0) * FPS)) : 0);
    this.acum += dt;
    let n = 0;
    if (this.mostrada == null) this.paso(d, vit, max, o2, rM);
    while (this.acum >= 1 / FPS && n < 4) {
      this.acum -= 1 / FPS;
      this.paso(d, vit, max, o2, rM);
      n++;
    }
    if (n === 4) this.acum = 0;
    disposicion.vidaY = this.barra.y;
    actualizarOrigenJefes(D);
    const sinRadar = d.sinRadar && rM !== 3 && rM !== 2;
    if (!sinRadar) this.dibujarRadar(d, rM, nivel);
    const cv = this.cv, Wd = Math.round(D.iw * D.dpr), Hd = Math.round(D.ih * D.dpr);
    const x = this.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (cv.width !== Wd || cv.height !== Hd || D.clave !== this._claveSucio) {
      cv.width = Wd;
      cv.height = Hd;
      this._claveSucio = D.clave;
    } else for (const [rx, ry, rw, rh] of this._sucio || []) x.clearRect(Math.floor((rx - 2) * D.kd), Math.floor((ry - 2) * D.kd), Math.ceil((rw + 4) * D.kd), Math.ceil((rh + 4) * D.kd));
    this._sucio = [];
    x.imageSmoothingEnabled = false;
    x.setTransform(D.kd, 0, 0, D.kd, 0, 0);
    const B = this.barra, rojo = this.dañoCuenta > 0;
    if (B.estado !== BARRA.OCULTA) {
      const vy = D.vida[1] + (B.y - 16);
      this._sucio.push([ D.vida[0] - 1, vy, Math.max(max, 1024) / 8 + 2, 26 ]);
      barraMenu(x, D.vida[0], vy, this.mostrada, vit, max, BARRA_VIDA, rojo);
      if (B.o2) barraMenu(x, D.vida[0], vy + 12, o2, o2, 1024, BARRA_O2);
    }
    if (!sinRadar) {
      const [rx, ry] = D.radar;
      this._sucio.push([ rx - 1, ry - 1, 71, 54 ]);
      x.fillStyle = "#000";
      x.fillRect(rx - 1, ry - 1, 1, 53);
      x.fillRect(rx - 1, ry - 1, 70, 1);
      x.fillRect(rx + 69, ry - 1, 1, 54);
      x.fillRect(rx - 1, ry + 52, 70, 1);
      x.drawImage(this.radar, rx, ry);
    }
    if (d.arma) {
      this.recuadroArma(x, D.arma[0], D.arma[1], d.arma);
      this._sucio.push([ D.arma[0] - 2, D.arma[1] - 1, 56, 32 ]);
    }
    const m = this.muñeca.getContext("2d");
    m.imageSmoothingEnabled = false;
    m.fillStyle = "#000";
    m.fillRect(0, 0, 144, 80);
    barraMenu(m, 8, 2, this.mostrada, vit, max, BARRA_VIDA, rojo);
    if (!sinRadar) m.drawImage(this.radar, 37, 24);
    const a = d.arma, firma = `${vit}|${this.mostrada}|${max}|${rojo}|${a ? [ a.icono, a.balas, a.reserva, !!a.recargando ] : ""}`;
    if (firma !== this._firmaFranja) {
      this._firmaFranja = firma;
      this.versionFranja++;
      const f = this.franja.getContext("2d");
      f.clearRect(0, 0, 224, 30);
      f.imageSmoothingEnabled = false;
      barraMenu(f, 4, 2, this.mostrada, vit, max, BARRA_VIDA, rojo);
      if (a) this.recuadroArma(f, 224 - 56, 0, a);
    }
    this.vidaMostrada = max ? this.mostrada / max : 1;
  }
}
