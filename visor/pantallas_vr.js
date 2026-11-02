// MGS web — FeniXVOID · Project Ravenlight
export const PROPORCION = .5 / (112 / (320 * 58 / 64));

export function marcoPS1(iw, ih) {
  let sy = ih / 224, sx = sy * 224 * PROPORCION / 320;
  if (320 * sx > iw) {
    sx = iw / 320;
    sy = sx * 320 / (224 * PROPORCION);
  }
  const ox = (iw - 320 * sx) / 2, oy = (ih - 224 * sy) / 2;
  return {
    sx: sx,
    sy: sy,
    ox: ox,
    oy: oy,
    margenX: ox / sx,
    margenY: oy / sy
  };
}

export function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

const _mod = new Map;

export function modular(img, rgb) {
  if (!img) return null;
  let m = _mod.get(img);
  if (!m) _mod.set(img, m = new Map);
  const k = rgb.join(",");
  if (m.has(k)) return m.get(k);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    for (let j = 0; j < 3; j++) p[i + j] = Math.min(31, (p[i + j] >> 3) * rgb[j] >> 7) * 255 / 31;
  }
  x.putImageData(d, 0, 0);
  m.set(k, c);
  return c;
}

export function tiempoTexto(t, G = t) {
  t = Math.max(0, t | 0);
  G = Math.max(0, G | 0);
  const sec = t / 30 | 0, fr = t % 30, min = sec / 60 | 0, cs = fr * 100 / 30 | 0;
  const gfr = G % 30, gd = (gfr * 100 / 30 | 0) % 10, seed = (G / 30 | 0) + 29 * gd;
  let j = (seed * (gfr / 3 | 0) & 255) >> 1;
  j = gd === 6 ? j & 3 : j % 3;
  return `${(min / 10 | 0) % 10}${min % 10}:${(sec / 10 | 0) % 6}${sec % 10}:${fr / 3 | 0}${cs % 10 + j}`;
}

const SIGNOS = [ [ ".", 2 ], [ "@", 2 ], [ ":", 2 ], [ "_", 4 ], [ "!", 2 ], [ "?", 6 ], [ "+", 6 ], [ "-", 6 ], [ "/", 6 ], [ "*", 6 ], [ "{", 3 ], [ "}", 3 ] ];

export class Fuente {
  constructor(img) {
    if (!img) {
      this.img = null;
      return;
    }
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3]) {
      p[i] = p[i + 1] = p[i + 2] = 132;
      p[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    this.img = c;
  }
  glifos(s) {
    const g = [];
    let w = 0;
    for (const ch of String(s)) {
      const lc = ch.toLowerCase(), c = lc.charCodeAt(0);
      if (c >= 48 && c <= 57) {
        g.push([ (c - 48) * 8, 6, w ]);
        w += 9;
      } else if (c >= 97 && c <= 122) {
        if (lc === "i") {
          w += 1;
          g.push([ (c - 97) * 8, 0, w ]);
          w += 4;
        } else {
          g.push([ (c - 97) * 8, 0, w ]);
          w += 9;
        }
      } else if (lc === " ") w += 4; else {
        const k = SIGNOS.findIndex(q => q[0] === lc);
        if (k < 0) continue;
        let sk = SIGNOS[k][1];
        if (sk < 3) {
          w += 1;
          sk += 1;
        } else if (sk === 6) sk = 9;
        g.push([ 80 + k * 8, 6, w ]);
        w += sk;
      }
    }
    return {
      g: g,
      w: w
    };
  }
  texto(x, s, X, Y, rgb = [ 128, 128, 128 ], alin = 0, maxCar = Infinity) {
    if (!this.img) return;
    const {g: g, w: w} = this.glifos(s), T = modular(this.img, rgb);
    const x0 = alin === 1 ? X - w : alin === 2 ? X - Math.trunc(w / 2) : X;
    g.slice(0, maxCar).forEach(([u, v, dx]) => x.drawImage(T, u, v, 8, 6, x0 + dx, Y, 8, 6));
  }
}

export function dibujarCursor(x, marco, cx, cy, cw, ch, xh = null) {
  if (cw <= 0 && ch <= 0) return;
  const X = cx + 3, Y = cy + 3, W = cw - 7, H = ch - 7;
  if (marco && W >= 0) {
    const T = modular(marco, [ 255, 255, 255 ]), x0 = x;
    if (xh) x = xh;
    x.globalCompositeOperation = xh ? "source-over" : "lighter";
    const q = (sx, sy, sw, sh, dx, dy, dw, dh) => {
      if (dw > 0 && dh > 0) x.drawImage(T, sx, sy, sw, sh, dx, dy, dw, dh);
    };
    q(0, 0, 9, 9, X - 9, Y - 9, 9, 9);
    q(10, 0, 9, 9, X + W, Y - 9, 9, 9);
    q(0, 10, 9, 9, X - 9, Y + H, 9, 9);
    q(10, 10, 9, 9, X + W, Y + H, 9, 9);
    q(9, 0, 1, 9, X, Y - 9, W, 9);
    q(9, 10, 1, 9, X, Y + H, W, 9);
    q(0, 9, 9, 1, X - 9, Y, 9, H);
    q(10, 9, 9, 1, X + W, Y, 9, H);
    x.globalCompositeOperation = "source-over";
    x = x0;
  }
  x.fillStyle = "rgb(82,164,114)";
  x.fillRect(cx, cy, cw, ch);
}

export function seguir(c, d) {
  for (let i = 0; i < 4; i++) {
    let v = Math.trunc((c[i] + d[i]) / 2);
    if (c[i] === d[i] - 1) v++;
    c[i] = v;
  }
}

export function pasoItem(it) {
  const t = it.cnt;
  let r = null;
  switch (it.estado) {
   case 0:
    r = [ it.x, it.y, it.w, it.h ];
    break;

   case 1:
    {
      const w = Math.trunc(it.w * t / 5);
      r = [ it.x + Math.trunc((it.w - w) / 2), it.y + Math.trunc(it.h / 2), w, 1 ];
      if (++it.cnt === 5) {
        it.estado = 2;
        it.cnt = 0;
      }
      break;
    }

   case 2:
    {
      const h = Math.trunc(it.h * t / 4);
      r = [ it.x, it.y + Math.trunc((it.h - h) / 2), it.w, h ];
      if (++it.cnt === 5) {
        it.estado = 0;
        it.cnt = 0;
      }
      break;
    }

   case 3:
    {
      const h = Math.trunc(it.h * (4 - t) / 4);
      r = [ it.x, it.y + Math.trunc((it.h - h) / 2), it.w, h ];
      if (++it.cnt === 5) {
        it.estado = 4;
        it.cnt = 0;
      }
      break;
    }

   case 4:
    {
      const w = Math.trunc(it.w * (4 - t) / 4);
      r = [ it.x + Math.trunc((it.w - w) / 2), it.y + Math.trunc(it.h / 2), w, 1 ];
      if (++it.cnt === 5) it.estado = 5;
      break;
    }

   default:
    r = null;
  }
  it.r = r;
}

export function dibujarRotulo(x, img, r, rgb = [ 74, 118, 100 ], aditivo = true, u0 = 0) {
  if (!img || !r || r[2] - 1 <= 0 || r[3] - 1 <= 0) return;
  const T = modular(img, rgb);
  if (aditivo) x.globalCompositeOperation = "lighter";
  x.drawImage(T, u0, 0, Math.max(1, img.width - 1 - u0), Math.max(1, img.height - 1), r[0], r[1], r[2] - 1, r[3] - 1);
  x.globalCompositeOperation = "source-over";
}

export class HudVR {
  constructor({fuente: fuente}) {
    this.fuente = fuente;
    this.estadoHud = 1;
    this.corte = 10;
    this.f = 0;
  }
  borrar() {
    if (this.estadoHud < 3) {
      this.estadoHud = 3;
      this.corte = 10;
    }
  }
  cuadro() {
    this.f++;
    if (this.estadoHud === 3) {
      this.corte -= 2;
      if (this.corte <= 0) this.estadoHud = 4;
    }
  }
  dibujar(x, d) {
    if (d.demo && (this.f / 15 | 0) % 2 === 0) this.fuente.texto(x, "DEMO", 20, 192, [ 148, 148, 148 ]);
    if (d.limite == null || this.estadoHud === 4) return;
    const n = this.estadoHud === 3 ? this.corte : Infinity;
    if (this.estadoHud < 3) {
      x.fillStyle = "rgba(0,0,0,0.5)";
      x.fillRect(15, 15, 70, 50);
    }
    const gris = [ 148, 148, 148 ], rem = d.limite - d.tiempo;
    const rojo = rem < 300 && (rem / 15 | 0) % 2 === 1 && this.estadoHud === 1;
    this.fuente.texto(x, "limit", 20, 20, gris, 0, n);
    this.fuente.texto(x, tiempoTexto(d.limite), 20, 30, gris, 0, n);
    this.fuente.texto(x, "time", 20, 40, rojo ? [ 148, 0, 0 ] : gris, 0, n);
    this.fuente.texto(x, tiempoTexto(d.tiempo, this.estadoHud >= 2 && d.final != null ? d.final : d.tiempo), 20, 50, rojo ? [ 148, 0, 0 ] : gris, 0, n);
  }
}

const OPS_PAUSA = [ {
  tex: "edaf",
  r: [ 126, 151, 68, 8 ],
  barra: [ 120, 148, 80, 14 ]
}, {
  tex: "e43c",
  r: [ 128, 169, 64, 8 ],
  barra: [ 122, 166, 76, 14 ]
}, {
  tex: "6dc8",
  r: [ 132, 188, 56, 14 ],
  barra: [ 132, 188, 57, 14 ]
} ];

export class PausaVR {
  constructor({tex: tex, marco: marco, fuente: fuente, sonar: sonar, sonido: sonido}) {
    Object.assign(this, {
      tex: tex,
      marco: marco,
      fuente: fuente,
      sonar: sonar,
      sonido: sonido
    });
    this.abierta = false;
  }
  abrir() {
    this.abierta = true;
    this.sel = 0;
    this.cur = [ ...OPS_PAUSA[0].barra ];
    this.fade = null;
    this.rep = 10;
    this.ult = 0;
  }
  cerrar() {
    this.abierta = false;
  }
  tecla(t) {
    if (!this.abierta || this.fade) return null;
    if (t === "start") {
      this.cerrar();
      return "continuar";
    }
    if (t === "arriba" && this.sel > 0) {
      this.sel--;
      this.sonar?.(31);
    } else if (t === "abajo" && this.sel < 2) {
      this.sel++;
      this.sonar?.(31);
    } else if (t === "ok") {
      if (this.sel === 0) {
        this.cerrar();
        return "continuar";
      }
      if (this.sel === 1) {
        this.sonido?.codigo?.(33554186);
        this.fade = {
          n: 0,
          total: 15,
          que: "reintentar"
        };
      } else {
        this.sonido?.codigo?.(33554187);
        this.sonar?.(33);
        this.fade = {
          n: 0,
          total: 30,
          que: "salir"
        };
      }
    }
    return null;
  }
  cuadro() {
    if (!this.abierta) return null;
    seguir(this.cur, OPS_PAUSA[this.sel].barra);
    if (this.fade && ++this.fade.n >= this.fade.total) {
      const q = this.fade.que;
      this.cerrar();
      return q;
    }
    return null;
  }
  dibujar(x, margen, xs = null) {
    if (!this.abierta) return;
    const v = this.fade ? 32 + Math.trunc(223 * this.fade.n / Math.max(1, this.fade.total - 1)) : 32;
    x.fillStyle = `rgba(0,0,0,${Math.min(1, v / 128)})`;
    x.fillRect(-margen, 0, 320 + 2 * margen, 224);
    if (this.fade) return;
    dibujarCursor(x, this.marco, ...this.cur, xs);
    OPS_PAUSA.forEach(o => dibujarRotulo(x, this.tex[o.tex], o.r));
    this.fuente.texto(x, "PAUSE", 160, 80, [ 128, 128, 128 ], 2);
  }
}

const ITEMS_CLEAR = [ {
  x: 19,
  y: 21,
  w: 144,
  h: 22,
  nav: [ -1, -1, -1, -1 ],
  tex: "9f93"
}, {
  x: 90,
  y: 43,
  w: 140,
  h: 8,
  nav: [ -1, -1, -1, -1 ],
  tex: "1866"
}, {
  x: 159,
  y: 52,
  w: 2,
  h: 11,
  nav: [ -1, -1, -1, -1 ],
  tex: "b25c"
}, {
  x: 78,
  y: 64,
  w: 48,
  h: 8,
  nav: [ -1, -1, -1, -1 ],
  tex: "98b0"
}, {
  x: 176,
  y: 64,
  w: 64,
  h: 8,
  nav: [ -1, -1, -1, -1 ],
  tex: "a6f9"
}, {
  x: 122,
  y: 169,
  w: 76,
  h: 8,
  nav: [ 6, -1, 7, -1 ],
  tex: "8d82",
  op: 0,
  cursor: [ 111, 166, 96, 14 ]
}, {
  x: 115,
  y: 151,
  w: 90,
  h: 8,
  nav: [ -1, -1, 5, -1 ],
  tex: "7f9c",
  op: 1,
  cursor: [ 103, 148, 114, 14 ]
}, {
  x: 132,
  y: 188,
  w: 56,
  h: 14,
  nav: [ 5, -1, -1, -1 ],
  tex: "6dc8",
  op: 2,
  cursor: [ 132, 188, 57, 14 ]
}, {
  x: 133,
  y: 64,
  w: 36,
  h: 8,
  nav: [ -1, -1, -1, -1 ],
  tex: "7e37"
}, {
  x: 160,
  y: 171,
  w: 0,
  h: 8,
  nav: [ -1, -1, -1, -1 ],
  tex: "6dc8",
  cursor: [ 160, 171, 0, 8 ]
} ];

export class ClearVR {
  constructor(d) {
    Object.assign(this, d);
    this.it = ITEMS_CLEAR.map(i => ({
      ...i,
      estado: 5,
      cnt: 0
    }));
    const I = this.it;
    if (this.tiroModo) Object.assign(I[1], {
      tex: "1eec",
      x: 86,
      w: 148
    }); else if (this.conRecords) Object.assign(I[1], {
      tex: "1866",
      x: 90,
      w: 140
    }); else Object.assign(I[1], {
      tex: "a90a",
      x: 106,
      w: 108
    });
    this.sinSiguiente = !this.siguiente;
    if (this.sinSiguiente) {
      Object.assign(I[6], {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        tex: null
      });
      if (this.supervivencia) {
        Object.assign(I[1], {
          tex: "93d8",
          x: 95,
          w: 132
        });
        Object.assign(I[3], {
          tex: "93d8",
          x: 96,
          w: 56,
          u0: 76
        });
        Object.assign(I[4], {
          x: 160
        });
        Object.assign(I[8], {
          w: 0,
          h: 0
        });
        Object.assign(I[5], {
          tex: "a242",
          x: 61,
          y: 155,
          w: 200,
          h: 8,
          cursor: [ 50, 152, 220, 14 ]
        });
      }
    }
    if (this.opSurvival) Object.assign(I[6], {
      tex: "93d8",
      x: 95,
      y: 151,
      w: 132,
      h: 8,
      cursor: [ 84, 148, 154, 14 ]
    });
    I[3].estado = I[4].estado = I[8].estado = 0;
    this.sel = this.sinSiguiente && !this.supervivencia ? 7 : 6;
    if (this.supervivencia) this.sel = 5;
    this.cur = 9;
    this.estado = 2;
    this.anim = 0;
    this.t = 0;
    this.cursorR = [ 160, 112, 0, 0 ];
    this.soloBarrido = this.supervivencia && !this.conRecords;
    if (this.soloBarrido) this.estado = 4; else this.sonar?.(195);
    this.ultBalas = -1;
    this.rep = 10;
    this.ultPad = 0;
    this.elegido = null;
  }
  mensaje() {
    if (this.estado !== 2) return;
    this.it.forEach((i, k) => {
      if (k !== 3 && k !== 4 && k !== 8) {
        i.estado = 1;
        i.cnt = 0;
      }
    });
    this.estado = 0;
    this.anim = 0;
    this.t = 0;
    this.voz?.();
  }
  tecla(t) {
    if (this.estado !== 0) return;
    if (this.tiroModo) {
      if (t) this.t = Math.max(this.t, this.balas * 2 + 30);
      return;
    }
    const dir = {
      arriba: 0,
      izq: 1,
      abajo: 2,
      der: 3
    }[t];
    if (dir != null) {
      let n = this.it[this.cur]?.nav?.[dir] ?? -1;
      if (n === -1) return;
      while (!this.it[n].tex) {
        n = this.it[n].nav[dir];
        if (n === -1) return;
      }
      this.sel = n;
      this.sonar?.(31);
      return;
    }
    if (t === "ok" && this.cur >= 5 && this.cur <= 7) {
      this.estado = 3;
      for (let k = 0; k < 9; k++) {
        this.it[k].estado = 3;
        this.it[k].cnt = 0;
      }
      this.it[this.cur].estado = 0;
      this.sonar?.(this.cur === 7 ? 33 : 102);
      for (let k = 0; k <= 4; k++) this.it[k].estado = 0;
      this.it[8].estado = 0;
    }
  }
  cuadro() {
    if (this.estado === 0) {
      this.cur = this.sel;
      this.it.slice(0, 9).forEach(pasoItem);
      this.resultados(this.t++);
      seguir(this.cursorR, this.it[this.sel].cursor || [ 160, 112, 0, 0 ]);
    } else if (this.estado === 2) {
      if (this.anim - 4 >= 0) [ 3, 4, 8 ].forEach(k => pasoItem(this.it[k]));
      this.anim++;
    } else if (this.estado === 4) this.t++; else if (this.estado === 3 || this.estado === 5) {
      let ocupado = false;
      for (let k = 0; k < 9; k++) {
        pasoItem(this.it[k]);
        if (k !== this.cur && this.it[k].estado !== 5 && this.it[k].estado !== 0) ocupado = true;
      }
      this.resultados(this.t++);
      seguir(this.cursorR, this.it[this.sel].cursor || [ 160, 112, 0, 0 ]);
      if (!ocupado && this.estado === 3) {
        this.estado = 5;
        return this.it[this.cur].op ?? null;
      }
    }
    return null;
  }
  resultados(t) {
    this.txt = [];
    if (!this.conRecords) return;
    const NAR = [ 208, 107, 57 ], OSC = [ 104, 53, 28 ];
    if (this.tiroModo) {
      const tt = Math.max(0, t - 30), queda = Math.max(0, this.balas - (tt / 2 | 0));
      if (queda !== this.ultBalas && tt !== 0) this.sonar?.(187);
      this.ultBalas = queda;
      this.txt.push([ tiempoTexto(this.final + this.bonif * queda, this.final), 159, 133, NAR, 0 ], [ "record", 99, 133, NAR, 0 ], [ String(queda), 219, 97, NAR, 1 ], [ "bullet   X", 99, 97, NAR, 0 ]);
      if (this.balas - ((tt + 1) / 2 | 0) < -15) this.tiroModo = false;
      return;
    }
    const n = t < 9 ? t : 8, puesto = this.puesto < 3 ? this.puesto : -1;
    if (puesto >= 0 && (t + 15) % 30 === 0) this.sonar?.(192);
    const on = (t / 15 | 0) & 1;
    let y = 85;
    [ "1st", "2nd", "3rd", "record" ].forEach((lab, i) => {
      if (i === 3) y += 12;
      if (!(i === puesto && !on)) {
        const v = i < 3 ? this.records[i] : this.final;
        this.txt.push([ tiempoTexto(Math.abs(v), Math.abs(v)).slice(0, n), 159, y, v > 0 ? NAR : OSC, 0 ], [ lab, 99, y, NAR, 0 ]);
      }
      y += 12;
    });
  }
  dibujar(x, margen, img, xs = null) {
    const c = this.estado === 2 ? 0 : this.t;
    if (c > 0 && this.fondo) {
      const L = this.fondo.lienzo?.(320 + 2 * Math.ceil(margen));
      const w = Math.min(c * 64, 320);
      if (L) {
        const m = Math.ceil(margen);
        if (w >= 320) x.drawImage(L, -m, 0); else for (let yy = 0; yy < 224; yy++) {
          if (yy & 1) x.drawImage(L, L.width - w - m, yy, w + m, 1, 320 - w, yy, w + m, 1); else x.drawImage(L, 0, yy, w + m, 1, -m, yy, w + m, 1);
        }
      }
    }
    if (this.estado === 2) {
      const r3 = this.it[3];
      for (let copia = 0; copia < 4; copia++) {
        const k = this.anim + copia - 3, v = k >= 0 && k < 6 ? 148 - Math.trunc(148 * k / 5) & 255 : 0;
        if (!v) continue;
        const dx = 37 * (copia + 1);
        for (const [h, s] of [ [ "dd3d", 1 ], [ "dd3d", -1 ], [ "6462", 1 ], [ "6462", -1 ], [ "7e37", 1 ], [ "7e37", -1 ] ]) dibujarRotulo(xs || x, img[h], [ r3.x + s * dx, r3.y, r3.w, r3.h ], [ v, v, v ], !xs);
      }
      if (this.anim - 4 > 0) [ 3, 4, 8 ].forEach(k => {
        const i = this.it[k];
        dibujarRotulo(xs || x, img[i.tex], i.r || [ i.x, i.y, i.w, i.h ], undefined, !xs, i.u0 || 0);
      });
      return;
    }
    if (this.estado === 4) return;
    if (!this.tiroModo || this.estado !== 0) dibujarCursor(x, img.marco, ...this.cursorR);
    for (let k = 8; k >= 0; k--) {
      const i = this.it[k];
      if (i.tex && i.r) dibujarRotulo(x, img[i.tex], i.r, undefined, true, i.u0 || 0);
    }
    for (const [s, X, Y, rgb, al] of this.txt || []) this.fuente.texto(x, s, X, Y, rgb, al);
  }
}

function colorLinea(shade, step) {
  if (step < 8) return [ 128, 255, 255 ];
  step = Math.min(step - 8, 8);
  const gb = 255 - Math.trunc((255 - shade) * step / 8);
  return [ 128 - step * 16, gb, gb ];
}

export class OverVR {
  constructor(d) {
    Object.assign(this, d);
    const L = this.lineas, N = L.length / 4;
    this.N = N;
    this.dirs = [];
    for (let i = 0; i < N; i++) {
      const dx = L[i * 4] - L[i * 4 + 2], dy = L[i * 4 + 1] - L[i * 4 + 3], l = Math.hypot(dx, dy) || 1;
      this.dirs.push([ Math.trunc(-dx / l * 4096 / 8), Math.trunc(-dy / l * 4096 / 8) ]);
    }
    this.step = 1;
    this.count = 0;
    this.option = this.sinContinue ? 1 : 0;
    this.gradient = 0;
    this.acum = 0;
    this.activo = true;
    this.sonido?.codigo?.(4278190334);
    this.sonido?.codigo?.(33554186);
    this.sonar?.(15);
  }
  get eligiendo() {
    return this.count === 256;
  }
  tecla(t) {
    if (!this.activo || this.count !== 256) return;
    if (t === "ok" || t === "start") {
      this.count = 257;
      this.gradient = 32;
      this.sonar?.(this.option === 0 ? 102 : 33);
      return;
    }
    if (this.sinContinue) {
      this.option = 1;
      return;
    }
    if (this.option === 0 && t === "der") {
      this.sonar?.(31);
      this.option = 1;
      this.gradient = 0;
    } else if (this.option === 1 && t === "izq") {
      this.sonar?.(31);
      this.option = 0;
      this.gradient = 0;
    }
  }
  clic(x, y) {
    if (this.count !== 256 || y < 110 || y > 145) return;
    const op = this.sinContinue ? 1 : x < 160 ? 0 : 1;
    if (op === this.option) this.tecla("ok"); else {
      this.option = op;
      this.gradient = 0;
      this.sonar?.(31);
    }
  }
  tick() {
    if (this.count < 256) {
      if (this.count === 30) {
        if (this.quien === "guardia") this.sonar?.(128); else if (this.quien === "camara") this.sonar?.(130);
      }
      if (this.count === 120) {
        this.voz?.();
        this.sonido?.codigo?.(16777219);
      }
      this.fondoV = this.count * 2;
      this.count += 3;
      if (this.count >= 256) {
        if (this.step > 0) this.count = 255; else this.count = 256;
      }
    } else if (this.count === 256) {
      this.fondoV = 255;
      this.gradient = (this.gradient + 1) % 64;
    } else {
      this.fondoV = 255;
      this.salida = Math.min(this.count - 256, 255);
      this.count += 4;
      if (this.count > 542) {
        this.activo = false;
        (this.option === 0 ? this.alSeguir : this.alSalir)?.();
        return;
      }
    }
    if (this.step > 0) this.step = this.step < this.N + 16 ? this.step + 3 : 0;
  }
  actualizar(dt) {
    if (!this.activo) return;
    this.acum += Math.min(dt, .25);
    let n = 0;
    while (this.activo && n < 8) {
      const T = this.count < 256 ? 1 / 20 : 1 / 30;
      if (this.acum < T) break;
      this.acum -= T;
      this.tick();
      n++;
    }
  }
  dibujar(x, margen) {
    if (!this.activo) return;
    x.fillStyle = `rgba(0,0,0,${Math.min(1, (this.fondoV || 0) / 255)})`;
    x.fillRect(-margen, -8, 320 + 2 * margen, 240);
    const L = this.lineas;
    let step = this.step, mueve = true;
    if (step === 0) {
      mueve = false;
      step = 16;
    }
    x.lineWidth = 1;
    for (let i = 0; i < this.N; i++) {
      const cuenta = this.N - i;
      let w = 0, h = 0;
      if (mueve) {
        if (step < 8) {
          w = this.dirs[i][0] >> step;
          h = this.dirs[i][1] >> step;
          if (cuenta % 4 === 2) {
            w = -w;
            h = -h;
          }
        }
        if (--step < 0) break;
      }
      const k = i * 4, x0 = L[k] + w, y0 = L[k + 1] + h, x1 = L[k + 2] + 2 * w, y1 = L[k + 3] + 2 * h;
      const c0 = colorLinea(Math.min(255, 255 - Math.abs(x0 - 160)), step), c1 = cuenta === 1 || cuenta === 3 ? [ 0, 0, 0 ] : colorLinea(Math.min(255, 255 - Math.abs(x1 - 160)), step);
      if (step >= 8 && step <= 13) {
        const fw = -(this.dirs[i][1] >> step - 6), fh = this.dirs[i][0] >> step - 6, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const g = x.createRadialGradient(mx, my, 0, mx, my, Math.max(1, Math.hypot(fw, fh)));
        g.addColorStop(0, "rgba(0,64,128,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        x.globalCompositeOperation = "lighter";
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(x1 - fw, y1 - fh);
        x.lineTo(x0 - fw, y0 - fh);
        x.lineTo(x0 + fw, y0 + fh);
        x.lineTo(x1 + fw, y1 + fh);
        x.closePath();
        x.fill();
        x.globalCompositeOperation = "source-over";
      }
      const gr = x.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, `rgb(${c0})`);
      gr.addColorStop(1, `rgb(${c1})`);
      x.strokeStyle = gr;
      x.beginPath();
      x.moveTo(x0 + .5, y0 + .5);
      x.lineTo(x1 + .5, y1 + .5);
      x.stroke();
    }
    if (this.step === 0 && this.goC) {
      const g = this.gradient > 32 ? 64 - this.gradient : this.gradient, c = 48 + g * 4, on = [ 0, c, c ], off = [ 0, 48, 48 ];
      if (!this.sinContinue) {
        x.drawImage(modular(this.goC, this.option === 0 ? on : off), 66, 123);
        x.drawImage(modular(this.goE, this.option === 0 ? off : on), 191, 123);
      } else x.drawImage(modular(this.goE, this.option === 0 ? off : on), 135, 123);
    }
    if (this.salida) {
      x.fillStyle = `rgba(0,0,0,${Math.min(1, this.salida / 255)})`;
      x.fillRect(-margen, -8, 320 + 2 * margen, 240);
    }
  }
}
