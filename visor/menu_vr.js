// MGS web — FeniXVOID · Project Ravenlight
const PAD = {
  ARRIBA: 4096,
  DER: 8192,
  ABAJO: 16384,
  IZQ: 32768,
  CIRCULO: 32,
  CRUZ: 64
};

const SE = {
  CURSOR: 31,
  EXIT: 33,
  START: 102,
  ENTRAR: 177,
  VOLVER: 179,
  APARECE: 191
};

const TINTE = [ 74, 118, 100 ], AMARILLO = [ 128, 128, 64 ], BARRA = "rgb(82,164,114)";

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function modular(img, rgb) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    for (let k = 0; k < 3; k++) p[i + k] = Math.min(31, (p[i + k] >> 3) * rgb[k] >> 7) * 255 / 31;
  }
  x.putImageData(d, 0, 0);
  return c;
}

export function glifosRecord(cuadros) {
  const f = Math.abs(cuadros | 0), s = f / 30 | 0, fr = f % 30, cs = fr * 100 / 30 | 0, u = cs % 10, d = fr / 3 | 0, m = s / 60 | 0;
  let j = ((s + 29 * u) * d & 255) >> 1;
  j = u === 6 ? j & 3 : j % 3;
  return [ (m / 10 | 0) % 10, m % 10, 10, (s / 10 | 0) % 6, s % 10, 10, d, u + j ];
}

export class MenuVR {
  constructor(op) {
    this.op = op;
    this.base = op.base ?? "assets/";
    this.listo = this.cargar();
    this.activo = false;
    this.f = 0;
  }
  async cargar() {
    this.D = await fetch(this.base + "vr/menu_items.json").then(r => r.json());
    const T = this.D.texturas || {}, ids = new Set;
    for (const it of this.D.items) for (const h of [ it.tex, it.alt ]) if (h && T[h]) ids.add(h);
    ids.add("957b");
    ids.add("marco");
    this.img = {};
    await Promise.all([ ...ids ].map(async h => {
      this.img[h] = await cargarImg(h === "marco" ? this.base + "codec/ui/marco.png" : `${this.base}vr/menu/tex/${h}.png`);
    }));
    this.tintes = new Map;
    return this;
  }
  tex(h, rgb) {
    const im = this.img[h];
    if (!im) return null;
    const k = h + "|" + rgb;
    if (!this.tintes.has(k)) this.tintes.set(k, modular(im, rgb));
    return this.tintes.get(k);
  }
  abrir({progreso: progreso = 1, records: records = []} = {}) {
    const D = this.D;
    this.it = D.items.map(i => ({
      ...i,
      vec: [ ...i.vec ],
      barra: [ ...i.barra ],
      estado: 8,
      t: 0,
      texAct: i.tex
    }));
    let j = 0;
    for (const it of this.it) if (it.proc > 0) it.nproc = j++;
    this.P = Math.max(1, progreso | 0);
    this.rec = records;
    this.pag = 0;
    this.cur = this.curNext = D.paginas[0].cursor;
    this.estado = 0;
    this.rep = 10;
    this.ultDir = this.held & 61440;
    this.cx = 160;
    this.cy = 112;
    this.cw = 0;
    this.ch = 0;
    this.bajado = false;
    this.progreso();
    for (const it of this.items(0)) {
      it.estado = 1;
      it.t = 0;
    }
    this.fade = {
      modo: "entra",
      n: 0,
      total: 15
    };
    this.activo = true;
    this.f = 0;
  }
  items(p) {
    const P = this.D.paginas[p];
    return this.it.slice(P.primero, P.primero + P.n);
  }
  bloquear(p, a, b) {
    const c = this.D.paginas[p].cursor;
    for (let s = a; s <= b; s++) {
      const it = this.it[c + s - 1];
      if (!it) continue;
      it.bloq = true;
      if (it.link) this.it[it.link].bloq = true;
    }
  }
  progreso() {
    const P = this.P, I = this.it;
    for (const it of I) it.bloq = false;
    if (P < 2) {
      Object.assign(I[7], {
        w: 0,
        h: 0
      });
      this.bloquear(0, 5, 5);
    }
    if (P < 11) {
      Object.assign(I[3], {
        x: 106,
        y: 112,
        w: 108,
        h: 8
      });
      I[3].barra = [ 72, 109, 176, 14 ];
      Object.assign(I[4], {
        w: 0,
        h: 0
      });
      Object.assign(I[5], {
        w: 0,
        h: 0
      });
      this.bloquear(0, 2, 3);
      this.bloquear(1, P + 1, 10);
    } else if (P < 21) {
      Object.assign(I[3], {
        x: 106,
        y: 103,
        w: 108,
        h: 8
      });
      I[3].barra = [ 72, 100, 176, 14 ];
      Object.assign(I[4], {
        x: 90,
        y: 121,
        w: 140,
        h: 8
      });
      I[4].barra = [ 72, 118, 176, 14 ];
      Object.assign(I[5], {
        w: 0,
        h: 0
      });
      this.bloquear(0, 3, 3);
      this.bloquear(2, P - 9, 10);
    } else if (P < 31) this.bloquear(3, P - 19, 10);
    if (P < 31) this.bloquear(3, 13, 13);
    if (P < 32) {
      Object.assign(I[93], {
        w: 0,
        h: 0
      });
      this.bloquear(3, 14, 14);
    }
  }
  cuadro() {
    if (!this.activo) return;
    this.f++;
    if (this.fade) {
      this.fade.n++;
      if (this.fade.modo === "entra" && this.fade.n >= this.fade.total) this.fade = null;
    }
    const pad = this.leerPad();
    if (this.estado === 0) {
      this.cur = this.curNext;
      this.entrada(pad);
      for (const it of this.items(this.pag)) this.paso(it);
      if (this.it[this.cur].rec >= 0 || this.it[95].estado === 5 && this.it[95].t < 4) this.pasoRecords();
    } else if (this.estado === 1) {
      if (this.it[this.cur].rec >= 0) for (let k = 95; k < 119; k++) this.paso(this.it[k]);
      let ocupado = false;
      for (const it of this.items(this.pagNext)) {
        this.paso(it);
        ocupado ||= it.estado !== 0;
      }
      for (const it of this.items(this.pag)) {
        this.paso(it);
        ocupado ||= it.estado !== 8;
        if (it.morph >= 0 && it.estado === 8) {
          const d = this.it[this.D.paginas[this.pagNext].primero + it.morph];
          if (d) {
            d.estado = 0;
            d.t = 0;
          }
        }
      }
      if (!ocupado) {
        this.pag = this.pagNext;
        this.cur = this.D.paginas[this.pag].cursor;
        this.estado = 0;
        if (this.it[this.cur].rec >= 0) this.prepararRecords();
      }
    } else if (this.estado === 2 || this.estado === 4) {
      let ocupado = false;
      for (const it of this.items(this.pag)) {
        this.paso(it);
        if (it !== this.it[this.cur] && it.estado !== 8) ocupado ||= it.estado !== 0;
      }
      if (this.it[this.cur].rec >= 0) for (let k = 95; k < 119; k++) this.paso(this.it[k]);
      if (!ocupado && this.estado === 2) {
        this.estado = 4;
        this.op.elegir?.(this.it[this.cur].nproc);
      }
    }
    this.cursor();
  }
  paso(it) {
    const t = it.t;
    it.eDib = it.estado;
    switch (it.estado) {
     case 1:
      it.t++;
      if (t === it.delay) {
        it.t = 0;
        it.estado = 3;
        if (it.delay && !it.bloq) this.op.sonar?.(SE.APARECE);
      }
      break;

     case 3:
      if (++it.t === 5) {
        it.estado = 4;
        it.t = 0;
      }
      break;

     case 4:
      if (++it.t === 5) {
        it.estado = 0;
        it.t = 0;
      }
      break;

     case 5:
      if (++it.t === 5) {
        it.estado = 6;
        it.t = 0;
      }
      break;

     case 6:
      if (++it.t === 5) it.estado = 8;
      break;

     case 7:
      if (++it.t === 8) it.estado = 8;
      break;
    }
    it.tDib = t;
  }
  leerPad() {
    const p = {
      held: this.held | 0 | (this.press | 0) & 61440,
      press: this.press | 0
    };
    this.press = 0;
    return p;
  }
  tecla(code, abajo) {
    const m = {
      ArrowUp: PAD.ARRIBA,
      KeyW: PAD.ARRIBA,
      ArrowDown: PAD.ABAJO,
      KeyS: PAD.ABAJO,
      ArrowLeft: PAD.IZQ,
      KeyA: PAD.IZQ,
      ArrowRight: PAD.DER,
      KeyD: PAD.DER,
      Enter: PAD.CIRCULO,
      Space: PAD.CIRCULO,
      KeyE: PAD.CIRCULO,
      Escape: PAD.CRUZ,
      Backspace: PAD.CRUZ,
      KeyQ: PAD.CRUZ
    }[code];
    if (!m) return false;
    if (abajo) {
      if (!(this.held & m)) this.press |= m;
      this.held |= m;
    } else this.held &= ~m;
    return true;
  }
  entrada(pad) {
    let held = pad.held;
    if ((held & 61440) === this.ultDir) {
      const viejo = this.rep--;
      if (viejo > 0) held &= 4095; else this.rep = 1;
    } else {
      this.ultDir = held & 61440;
      this.rep = 10;
    }
    if (held & 61440) {
      const dir = held & PAD.IZQ ? 1 : held & PAD.ABAJO ? 2 : held & PAD.DER ? 3 : 0;
      let n = this.it[this.cur].vec[dir];
      if (n !== -1) {
        while (this.it[n].bloq) {
          n = this.it[n].vec[dir];
          if (n === -1) return;
        }
        this.mover(n);
        return;
      }
    }
    if (pad.press & PAD.CIRCULO) return this.aceptar();
    if (pad.press & PAD.CRUZ) return this.volver();
  }
  mover(n) {
    if (n === this.curNext) return;
    this.curNext = n;
    this.estado = 0;
    this.op.sonar?.(SE.CURSOR);
    if (this.it[this.cur].rec >= 0) this.voltearRecords();
  }
  aceptar() {
    const it = this.it[this.cur];
    if (it.proc > 0) {
      this.estado = 2;
      for (const x of this.items(this.pag)) {
        x.estado = 5;
        x.t = 0;
      }
      it.estado = 0;
      if (it.link) this.it[it.link].estado = 0;
      this.elegidoFx();
    } else if (it.proc < 0) {
      this.op.sonar?.(32);
      this.op.guardar?.();
    } else {
      this.op.sonar?.(it.tex === "6555" ? SE.VOLVER : SE.ENTRAR);
      this.pagNext = it.page;
      this.cambiarPagina();
    }
  }
  volver() {
    const padre = this.D.paginas[this.pag].padre;
    if (padre >= 0) {
      this.pagNext = padre;
      this.cambiarPagina();
      this.op.sonar?.(SE.VOLVER);
      return;
    }
    this.estado = 2;
    this.cur = 8;
    for (const x of this.items(this.pag)) {
      x.estado = 5;
      x.t = 0;
    }
    const c = this.it[this.curNext];
    c.barra = [ c.barra[0] + (c.barra[2] >> 1), c.barra[1], 0, c.barra[3] ];
    this.elegidoFx();
  }
  elegidoFx() {
    const p = this.pag;
    this.op.sonar?.(p === 0 ? SE.EXIT : SE.START);
    const quedan = {
      1: [ 9, 10, 11, 12, 13, 34, 35 ],
      2: [ 36, 37, 38, 39, 40, 61, 62 ],
      3: [ 65, 66, 67, 68, 69, 90, 91 ]
    }[p] || [];
    for (const k of quedan) this.it[k].estado = 0;
    for (let k = 95; k < 120; k++) {
      this.it[k].t = 0;
      this.it[k].estado = p !== 0 && this.cur !== 93 ? 5 : 8;
    }
  }
  cambiarPagina() {
    this.estado = 1;
    for (const it of this.items(this.pagNext)) {
      it.estado = 3;
      it.t = 0;
    }
    for (const it of this.items(this.pag)) {
      if (it.morph >= 0 && (it.page === this.pagNext || it.page < 0)) {
        it.dest = this.it[this.D.paginas[this.pagNext].primero + it.morph];
        if (it.dest) it.dest.estado = 8;
        it.t = 0;
        it.estado = 7;
      } else {
        it.t = 0;
        it.estado = 5;
      }
    }
    if (this.it[this.cur].rec >= 0) this.voltearRecords();
    this.curNext = this.D.paginas[this.pagNext].cursor;
    if (this.pagNext === 3 && this.P >= 32 && !this.bajado) {
      for (let k = 94; k <= 118; k++) this.it[k].y += 8;
      this.it[91].y += 8;
      this.it[91].barra[1] += 8;
      this.bajado = true;
    }
    if (this.pagNext === 2 && this.bajado) {
      for (let k = 94; k <= 118; k++) this.it[k].y -= 8;
      this.it[91].y -= 8;
      this.it[91].barra[1] -= 8;
      this.bajado = false;
    }
  }
  baseRecord() {
    const p = this.pag, c = this.curNext;
    if (p === 2) return (c - 51) * 3;
    if (p === 3) return c === 91 || c === 92 || c === 93 ? 60 : (c - 80) * 3 + 30;
    return -1;
  }
  ponerDigitos(base) {
    for (let fila = 0; fila < 3; fila++) {
      const v = this.rec[base + fila] ?? 0, g = glifosRecord(v), col = v > 0 ? 128 : 64;
      for (let k = 0; k < 8; k++) {
        const d = this.it[95 + fila * 8 + k];
        d.glifo = g[k];
        d.col = col;
      }
    }
  }
  prepararRecords() {
    const b = this.baseRecord();
    if (b < 0) {
      for (let k = 95; k < 119; k++) this.it[k].estado = 8;
      return;
    }
    this.ponerDigitos(b);
    for (let k = 95; k < 119; k++) {
      this.it[k].estado = 4;
      this.it[k].t = 0;
    }
  }
  pasoRecords() {
    const b = this.baseRecord();
    for (let k = 95; k < 119; k++) {
      const d = this.it[k];
      if (b < 0 && d.estado !== 5) {
        d.estado = 8;
        continue;
      }
      if (d.estado === 4) this.paso(d); else if (d.estado === 0) {
        d.tDib = 0;
        d.eDib = 0;
      } else if (d.estado === 5) {
        const t = d.t;
        d.tDib = t;
        d.eDib = 5;
        if (++d.t === 5) {
          if (b >= 0) {
            this.ponerDigitos(b);
            d.estado = 4;
            d.t = 0;
          } else d.estado = 8;
        }
      }
    }
  }
  voltearRecords() {
    const d0 = this.it[95];
    if (d0.estado === 5) return;
    let t0 = 0;
    if (d0.estado === 4) {
      t0 = 3 - d0.t;
      t0 = t0 <= 0 ? 1 : t0 >= 3 ? 2 : t0;
    }
    for (let k = 95; k < 119; k++) {
      this.it[k].estado = 5;
      this.it[k].t = t0;
    }
  }
  cursor() {
    if (this.estado === 3) return;
    const b = this.it[this.curNext].barra, c = [ this.cx, this.cy, this.cw, this.ch ];
    for (let i = 0; i < 4; i++) {
      let v = Math.trunc((c[i] + b[i]) / 2);
      if (c[i] === b[i] - 1) v++;
      c[i] = v;
    }
    [this.cx, this.cy, this.cw, this.ch] = c;
  }
  clic(x, y) {
    if (!this.activo || this.estado !== 0) return;
    const P = this.items(this.pag).filter(it => (it.proc !== 0 || it.page >= 0 && it.morph >= 0 || it.tex === "6555") && !it.bloq && it.barra[2] > 0);
    const it = P.find(q => x >= q.barra[0] && x < q.barra[0] + q.barra[2] && y >= q.barra[1] && y < q.barra[1] + q.barra[3]);
    if (!it) return;
    if (it.i === this.cur) this.press |= PAD.CIRCULO; else this.mover(it.i);
  }
  dibujar(x, margen = 0) {
    if (!this.activo) return;
    if (this.fondoAparte?.()) x.clearRect(-Math.ceil(margen), 0, 320 + 2 * Math.ceil(margen), 224); else {
      const fondo = this.op.fondo?.lienzo?.(320 + 2 * Math.ceil(margen));
      if (fondo) x.drawImage(fondo, -Math.ceil(margen), 0); else {
        x.fillStyle = "#000";
        x.fillRect(-margen, 0, 320 + 2 * margen, 224);
      }
    }
    if (this.estado !== 3) this.dibujarCursor(x);
    const recs = this.it[this.cur].rec >= 0 || this.estado === 1 || this.estado === 2 || this.estado === 4 || this.it[95].estado === 5;
    if (recs) for (let k = 95; k < 119; k++) this.dibujarItem(x, this.it[k]);
    const visibles = this.items(this.pag);
    if (this.estado === 1) visibles.push(...this.items(this.pagNext));
    for (let i = visibles.length - 1; i >= 0; i--) this.dibujarItem(x, visibles[i]);
    if (this.fade) {
      const v = this.fade.modo === "entra" ? 255 - Math.trunc(this.fade.n * 255 / this.fade.total) : Math.min(255, Math.trunc(this.fade.n * 255 / this.fade.total));
      x.fillStyle = `rgba(0,0,0,${v / 255})`;
      x.fillRect(-margen, 0, 320 + 2 * margen, 224);
    }
  }
  dibujarCursor(x) {
    const {cx: cx, cy: cy, cw: cw, ch: ch} = this;
    if (cw <= 0 && ch <= 0) return;
    const m = this.img.marco;
    if (m && cw >= 7) {
      const X = cx + 3, Y = cy + 3, W = cw - 7, H = ch - 7, T = this.tex("marco", [ 255, 255, 255 ]);
      x.globalCompositeOperation = "lighter";
      const q = (sx, sy, sw, sh, dx, dy, dw, dh) => {
        if (dw > 0 && dh > 0) {
          x.drawImage(T, sx, sy, sw, sh, dx, dy, dw, dh);
        }
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
    }
    x.fillStyle = BARRA;
    x.fillRect(cx, cy, cw, ch);
  }
  dibujarItem(x, it) {
    const e = it.eDib ?? it.estado;
    if (e === 8 || e === 1 || e === 2) return;
    const t = it.tDib ?? it.t;
    let {x: X, y: Y, w: W, h: H} = it;
    if (e === 3) {
      const ww = Math.trunc(W * t / 5);
      X += Math.trunc((W - ww) / 2);
      Y += Math.trunc(H / 2);
      W = ww;
      H = 1;
    } else if (e === 4) {
      const hh = Math.trunc(H * t / 4);
      Y += Math.trunc((H - hh) / 2);
      H = hh;
    } else if (e === 5) {
      const hh = Math.trunc(H * (4 - t) / 4);
      Y += Math.trunc((H - hh) / 2);
      H = hh;
    } else if (e === 6) {
      const ww = Math.trunc(W * (4 - t) / 4);
      X += Math.trunc((W - ww) / 2);
      Y += Math.trunc(H / 2);
      W = ww;
      H = 1;
    } else if (e === 7 && it.dest) {
      const d = it.dest;
      X = Math.trunc(((7 - t) * it.x + t * d.x) / 7);
      Y = Math.trunc(((7 - t) * it.y + t * d.y) / 7);
      W = Math.trunc(((7 - t) * it.w + t * d.w) / 7);
      H = Math.trunc(((7 - t) * it.h + t * d.h) / 7);
    }
    if (W - 1 <= 0 || H - 1 <= 0) return;
    let T;
    if (it.i >= 95 && it.i < 119) {
      if (it.glifo == null) return;
      T = this.tex("957b", [ it.col, it.col, it.col ]);
      if (!T) return;
      x.drawImage(T, it.glifo * 8, 0, 7, 7, X, Y, W - 1, H - 1);
      return;
    }
    const h = it.bloq ? it.alt : it.tex;
    if (!h) return;
    const semi = it.semi || it.bloq;
    const rgb = h === "93d8" || h === "7fe5" || it.tex === "93d8" || it.tex === "7fe5" ? AMARILLO : semi ? TINTE : [ 128, 128, 128 ];
    T = this.tex(h, rgb);
    if (!T) return;
    if (semi) x.globalCompositeOperation = "lighter";
    x.drawImage(T, 0, 0, Math.max(1, T.width - 1), Math.max(1, T.height - 1), X, Y, W - 1, H - 1);
    x.globalCompositeOperation = "source-over";
  }
  get firma() {
    const L = [ this.pag, this.pagNext, this.estado, this.cur, this.curNext, this.cx, this.cy, this.cw, this.ch, this.fade ? this.fade.n : "", this.fondoAparte?.() ? "g" : this.f ];
    const vis = this.items(this.pag);
    if (this.estado === 1) vis.push(...this.items(this.pagNext));
    for (const it of vis) L.push(`${it.estado}.${it.t}.${it.bloq ? 1 : 0}.${it.x},${it.y}`);
    for (let k = 95; k < 119; k++) {
      const d = this.it[k];
      if (d) L.push(`${d.estado}.${d.t}.${d.tDib ?? ""}.${d.eDib ?? ""}.${d.glifo ?? ""}.${d.col ?? ""}`);
    }
    return L.join("|");
  }
  fundirSalida(cuadros) {
    this.fade = {
      modo: "sale",
      n: 0,
      total: cuadros
    };
  }
  cerrar() {
    this.activo = false;
  }
}
