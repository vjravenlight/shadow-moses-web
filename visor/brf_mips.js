// MGS web — FeniXVOID · Project Ravenlight
export const OV_BASE = 2148292968;

const RAM = 4194304;

const VUELTA = 2147483664;

const GP = 2148194812;

const GV_CLOCK = 2148196504, GV_PAD = 2148216152;

const HEAP0 = 2149580800, HEAP1 = 2151546880;

const PILA = 2151677696;

export function strcode(bytes) {
  let i = 0;
  for (const c of bytes) {
    i = (i << 5 | i >> 11) & 65535;
    i = i + c & 65535;
  }
  return i;
}

export class Maquina {
  constructor({overlay: overlay, brf: brf, vram: vram, texturas: texturas, opciones: opciones, llamadas: llamadas}) {
    this.ram = new Uint8Array(RAM);
    this.dv = new DataView(this.ram.buffer);
    this.ram.set(new Uint8Array(overlay), OV_BASE & 4194303);
    this.brf = new Uint8Array(brf);
    this.vram = new Uint16Array(vram.slice(0));
    this.tex = texturas;
    this.texPtr = new Map;
    this.opc = opciones;
    this.cursor = null;
    this.tokens = [];
    this.ll = llamadas || {};
    this.r = new Int32Array(32);
    this.hi = 0;
    this.lo = 0;
    this.pc = 0;
    this.npc = 0;
    this.heap = HEAP0;
    this.libres = [];
    this.bloques = new Map;
    this.actores = [];
    this.prims = [];
    this.clock = 0;
    this.cuenta = 0;
    this.nombres = new Map;
    this.registro = [];
  }
  _a(a) {
    return a >>> 0 & 4194303;
  }
  r8(a) {
    return this.ram[this._a(a)];
  }
  r16(a) {
    return this.dv.getUint16(this._a(a), true);
  }
  r32(a) {
    return this.dv.getInt32(this._a(a), true);
  }
  w8(a, v) {
    this.ram[this._a(a)] = v;
  }
  w16(a, v) {
    this.dv.setUint16(this._a(a), v & 65535, true);
  }
  w32(a, v) {
    this.dv.setInt32(this._a(a), v | 0, true);
  }
  s16(a) {
    return this.dv.getInt16(this._a(a), true);
  }
  cadena(a) {
    const b = [];
    for (let i = 0; i < 256; i++) {
      const c = this.r8(a + i);
      if (!c) break;
      b.push(c);
    }
    return b;
  }
  alloc(n) {
    n = Math.max(1, n) + 15 & ~15;
    let p = -1;
    const k = this.libres.findIndex(b => b.n >= n);
    if (k >= 0) {
      const b = this.libres[k];
      p = b.p;
      if (b.n > n) {
        b.p += n;
        b.n -= n;
      } else this.libres.splice(k, 1);
    } else {
      p = this.heap;
      this.heap += n;
      if (this.heap > HEAP1) throw new Error("brf: sin memoria");
    }
    this.bloques.set(p, n);
    this.ram.fill(0, this._a(p), this._a(p) + n);
    return p | 0;
  }
  free(p) {
    p >>>= 0;
    const n = this.bloques.get(p);
    if (!n) return;
    this.bloques.delete(p);
    this.libres.push({
      p: p,
      n: n
    });
    this.libres.sort((a, b) => a.p - b.p);
    for (let i = this.libres.length - 1; i > 0; i--) {
      const a = this.libres[i - 1], b = this.libres[i];
      if (a.p + a.n === b.p) {
        a.n += b.n;
        this.libres.splice(i, 1);
      }
    }
  }
  llamar(dir, ...args) {
    const r = this.r, guardado = r.slice(), sp = (r[29] || PILA) - 64;
    r[29] = sp;
    r[28] = GP;
    r[31] = VUELTA;
    for (let i = 0; i < args.length; i++) {
      if (i < 4) r[4 + i] = args[i]; else this.w32(sp + 16 + (i - 4) * 4, args[i]);
    }
    this.pc = dir >>> 0;
    this.npc = this.pc + 4;
    let n = 0;
    while (this.pc !== VUELTA) {
      if (++n > 3e8) throw new Error("brf: el código no vuelve de " + (dir >>> 0).toString(16));
      if (this.pc < OV_BASE && this.pc >= 2147483648) this._hle(); else this._paso();
    }
    this.cuenta += n;
    const v0 = r[2];
    r.set(guardado);
    return v0;
  }
  _arg(i) {
    return i < 4 ? this.r[4 + i] : this.r32(this.r[29] + 16 + (i - 4) * 4);
  }
  _volver(v) {
    if (v !== undefined) this.r[2] = v | 0;
    this.pc = this.r[31] >>> 0;
    this.npc = this.pc + 4;
  }
  _paso() {
    const pc = this.pc, i = this.dv.getUint32(this._a(pc), true), r = this.r;
    this.pc = this.npc;
    this.npc = this.npc + 4 >>> 0;
    const op = i >>> 26, rs = i >>> 21 & 31, rt = i >>> 16 & 31, rd = i >>> 11 & 31;
    const imm = i << 16 >> 16, immu = i & 65535;
    switch (op) {
     case 0:
      {
        const sa = i >>> 6 & 31;
        switch (i & 63) {
         case 0:
          if (rd) r[rd] = r[rt] << sa;
          break;

         case 2:
          if (rd) r[rd] = r[rt] >>> sa;
          break;

         case 3:
          if (rd) r[rd] = r[rt] >> sa;
          break;

         case 4:
          if (rd) r[rd] = r[rt] << (r[rs] & 31);
          break;

         case 6:
          if (rd) r[rd] = r[rt] >>> (r[rs] & 31);
          break;

         case 7:
          if (rd) r[rd] = r[rt] >> (r[rs] & 31);
          break;

         case 8:
          this.npc = r[rs] >>> 0;
          break;

         case 9:
          {
            const t = r[rs] >>> 0;
            if (rd) r[rd] = pc + 8;
            this.npc = t;
            break;
          }

         case 12:
         case 13:
          break;

         case 16:
          if (rd) r[rd] = this.hi;
          break;

         case 17:
          this.hi = r[rs];
          break;

         case 18:
          if (rd) r[rd] = this.lo;
          break;

         case 19:
          this.lo = r[rs];
          break;

         case 24:
          {
            const p = BigInt(r[rs]) * BigInt(r[rt]);
            this.lo = Number(BigInt.asIntN(32, p));
            this.hi = Number(BigInt.asIntN(32, p >> 32n));
            break;
          }

         case 25:
          {
            const p = BigInt(r[rs] >>> 0) * BigInt(r[rt] >>> 0);
            this.lo = Number(BigInt.asIntN(32, p));
            this.hi = Number(BigInt.asIntN(32, p >> 32n));
            break;
          }

         case 26:
          {
            const a = r[rs], b = r[rt];
            if (b === 0) {
              this.lo = a >= 0 ? -1 : 1;
              this.hi = a;
            } else if (a === -2147483648 && b === -1) {
              this.lo = a;
              this.hi = 0;
            } else {
              this.lo = a / b | 0;
              this.hi = a % b | 0;
            }
            break;
          }

         case 27:
          {
            const a = r[rs] >>> 0, b = r[rt] >>> 0;
            if (b === 0) {
              this.lo = -1;
              this.hi = a | 0;
            } else {
              this.lo = Math.floor(a / b) | 0;
              this.hi = a % b | 0;
            }
            break;
          }

         case 32:
         case 33:
          if (rd) r[rd] = r[rs] + r[rt] | 0;
          break;

         case 34:
         case 35:
          if (rd) r[rd] = r[rs] - r[rt] | 0;
          break;

         case 36:
          if (rd) r[rd] = r[rs] & r[rt];
          break;

         case 37:
          if (rd) r[rd] = r[rs] | r[rt];
          break;

         case 38:
          if (rd) r[rd] = r[rs] ^ r[rt];
          break;

         case 39:
          if (rd) r[rd] = ~(r[rs] | r[rt]);
          break;

         case 42:
          if (rd) r[rd] = r[rs] < r[rt] ? 1 : 0;
          break;

         case 43:
          if (rd) r[rd] = r[rs] >>> 0 < r[rt] >>> 0 ? 1 : 0;
          break;

         default:
          throw new Error("brf: SPECIAL " + (i & 63) + " en " + pc.toString(16));
        }
        break;
      }

     case 1:
      {
        const t = pc + 4 + (imm << 2) >>> 0, v = r[rs];
        const salta = rt & 1 ? v >= 0 : v < 0;
        if (rt & 16) r[31] = pc + 8;
        if (salta) this.npc = t;
        break;
      }

     case 2:
      this.npc = (pc & 4026531840 | (i & 67108863) << 2) >>> 0;
      break;

     case 3:
      r[31] = pc + 8;
      this.npc = (pc & 4026531840 | (i & 67108863) << 2) >>> 0;
      break;

     case 4:
      if (r[rs] === r[rt]) this.npc = pc + 4 + (imm << 2) >>> 0;
      break;

     case 5:
      if (r[rs] !== r[rt]) this.npc = pc + 4 + (imm << 2) >>> 0;
      break;

     case 6:
      if (r[rs] <= 0) this.npc = pc + 4 + (imm << 2) >>> 0;
      break;

     case 7:
      if (r[rs] > 0) this.npc = pc + 4 + (imm << 2) >>> 0;
      break;

     case 8:
     case 9:
      if (rt) r[rt] = r[rs] + imm | 0;
      break;

     case 10:
      if (rt) r[rt] = r[rs] < imm ? 1 : 0;
      break;

     case 11:
      if (rt) r[rt] = r[rs] >>> 0 < imm >>> 0 ? 1 : 0;
      break;

     case 12:
      if (rt) r[rt] = r[rs] & immu;
      break;

     case 13:
      if (rt) r[rt] = r[rs] | immu;
      break;

     case 14:
      if (rt) r[rt] = r[rs] ^ immu;
      break;

     case 15:
      if (rt) r[rt] = immu << 16;
      break;

     case 32:
      {
        const v = this.r8(r[rs] + imm);
        if (rt) r[rt] = v << 24 >> 24;
        break;
      }

     case 33:
      {
        const v = this.r16(r[rs] + imm);
        if (rt) r[rt] = v << 16 >> 16;
        break;
      }

     case 34:
      {
        const a = r[rs] + imm >>> 0, s = (a & 3) * 8, w = this.r32(a & ~3);
        if (rt) r[rt] = r[rt] & 16777215 >>> s | w << 24 - s;
        break;
      }

     case 35:
      if (rt) r[rt] = this.r32(r[rs] + imm); else this.r32(r[rs] + imm);
      break;

     case 36:
      if (rt) r[rt] = this.r8(r[rs] + imm);
      break;

     case 37:
      if (rt) r[rt] = this.r16(r[rs] + imm);
      break;

     case 38:
      {
        const a = r[rs] + imm >>> 0, s = (a & 3) * 8, w = this.r32(a & ~3);
        if (rt) r[rt] = r[rt] & ~(4294967295 >>> s) | w >>> s;
        break;
      }

     case 40:
      this.w8(r[rs] + imm, r[rt]);
      break;

     case 41:
      this.w16(r[rs] + imm, r[rt]);
      break;

     case 42:
      {
        const a = r[rs] + imm >>> 0, s = (a & 3) * 8, w = this.r32(a & ~3);
        this.w32(a & ~3, w & ~(4294967295 >>> 24 - s) | r[rt] >>> 24 - s);
        break;
      }

     case 43:
      this.w32(r[rs] + imm, r[rt]);
      break;

     case 46:
      {
        const a = r[rs] + imm >>> 0, s = (a & 3) * 8, w = this.r32(a & ~3);
        this.w32(a & ~3, w & ~(4294967295 << s) | r[rt] << s);
        break;
      }

     default:
      throw new Error("brf: instrucción " + op + " en " + pc.toString(16));
    }
  }
  _hle() {
    const pc = this.pc, a = k => this._arg(k), L = this.ll;
    switch (pc) {
     case 2147568808:
     case 2147584940:
     case 2147585064:
     case 2147571560:
     case 2147576284:
     case 2147608172:
     case 2148057216:
      return this._volver(0);

     case 2148066860:
      {
        const s = String.fromCharCode(...this.cadena(a(0)));
        this.registro.push(s.trim());
        if (this.registro.length > 40) this.registro.shift();
        return this._volver(0);
      }

     case 2147571188:
      {
        const b = this.cadena(a(0)), k = b.indexOf(46), raiz = k < 0 ? b : b.slice(0, k), ext = k < 0 ? 0 : b[k + 1] || 0;
        let spec = ext - 97;
        if (spec > 25) spec += 32;
        return this._volver(strcode(raiz) | spec << 16);
      }

     case 2147578588:
      return this._volver(strcode(this.cadena(a(0))));

     case 2147579564:
      {
        const n = a(0);
        return this._volver(n > 0 ? Math.floor(Math.random() * n) : 0);
      }

     case 2147570380:
      return this._volver(this.alloc(a(1)));

     case 2147570488:
      {
        this.actores.push({
          w: a(0) >>> 0,
          act: a(1) >>> 0,
          die: a(2) >>> 0,
          nombre: String.fromCharCode(...this.cadena(a(3))),
          vivo: true
        });
        return this._volver(0);
      }

     case 2147570680:
      {
        const w = a(0) >>> 0, x = this.actores.find(q => q.w === w && q.vivo);
        if (x) x.vivo = false;
        return this._volver(0);
      }

     case 2147575768:
      return this._volver(this.alloc(a(0)));

     case 2147575804:
      this.free(a(0));
      return this._volver(0);

     case 2147599628:
      {
        const tipo = a(0) & 31, n = a(1), tam = {
          18: 40,
          14: 24
        }[tipo];
        if (!tam) throw new Error("brf: DG_MakePrim de tipo " + tipo);
        const p = this.alloc(80);
        this.w32(p + 64, this.alloc(n * tam));
        this.w32(p + 68, this.alloc(n * tam));
        this.prims.push({
          p: p,
          tipo: tipo,
          n: n,
          tam: tam,
          en: false
        });
        return this._volver(p);
      }

     case 2147584448:
      {
        const x = this.prims.find(q => q.p === (a(0) | 0));
        if (x) x.en = true;
        return this._volver(0);
      }

     case 2147584620:
      {
        const x = this.prims.find(q => q.p === (a(0) | 0));
        if (x) x.en = false;
        return this._volver(0);
      }

     case 2147599964:
      {
        const i = this.prims.findIndex(q => q.p === (a(0) | 0));
        if (i >= 0) {
          const q = this.prims[i];
          this.free(this.r32(q.p + 64));
          this.free(this.r32(q.p + 68));
          this.free(q.p);
          this.prims.splice(i, 1);
        }
        return this._volver(0);
      }

     case 2147607312:
      return this._volver(this._textura(a(0) & 65535));

     case 2147617984:
      {
        const ar = a(1), n = this.s16(ar), pv = this.r32(ar + 4), v = [];
        for (let k = 0; k < n; k++) v.push(this.r32(pv + 4 * k));
        L.proc?.(a(0), v);
        return this._volver(0);
      }

     case 2147621208:
      {
        const vals = this.opc[String.fromCharCode(a(0))];
        this.cursor = vals ? {
          vals: vals,
          i: 0
        } : null;
        return this._volver(vals ? 1 : 0);
      }

     case 2147621644:
      {
        const c = this.cursor;
        const v = c && c.i < c.vals.length ? c.vals[c.i++] : 0;
        this.tokens.push(v);
        return this._volver(65536 + this.tokens.length - 1);
      }

     case 2147621340:
      {
        const k = a(0) - 65536;
        return this._volver(k >= 0 && k < this.tokens.length ? this.tokens[k] : 0);
      }

     case 2147627188:
      {
        const o = a(1) * 2048, n = a(2);
        this.ram.set(this.brf.subarray(o, o + n), this._a(a(3)));
        return this._volver(0);
      }

     case 2147627244:
      return this._volver(0);

     case 2147663236:
      L.area?.(String.fromCharCode(...this.cadena(a(1))));
      return this._volver(0);

     case 2147698744:
      L.se?.(a(2) & 255, a(1));
      return this._volver(0);

     case 2147699488:
      L.sonido?.(a(0) >>> 0);
      return this._volver(0);

     case 2147721168:
      L.voxArranca?.();
      return this._volver(0);

     case 2147721244:
      L.voxPara?.();
      return this._volver(0);

     case 2147721480:
      L.vox?.(a(0), a(1) >>> 0);
      return this._volver(0);

     case 2147721784:
      return this._volver(L.boca ? L.boca(a(0) & 65535) : 0);

     case 2148083100:
      this._loadImage(a(0), a(1));
      return this._volver(0);

     case 2148093892:
      {
        const p = a(0), c = this.r8(p + 7);
        this.w8(p + 7, a(1) ? c | 2 : c & 253);
        return this._volver(0);
      }

     default:
      throw new Error("brf: función del ejecutable sin hacer " + pc.toString(16));
    }
  }
  _textura(id) {
    let p = this.texPtr.get(id);
    if (p) return p;
    const t = this.tex[id] || [ 0, 0, 0, 0, 0, 0, 0 ];
    p = this.alloc(12);
    this.w16(p, id);
    this.w8(p + 3, t[6] & 255);
    this.w16(p + 4, t[0]);
    this.w16(p + 6, t[1]);
    this.w8(p + 8, t[2]);
    this.w8(p + 9, t[3]);
    this.w8(p + 10, t[4]);
    this.w8(p + 11, t[5]);
    this.texPtr.set(id, p);
    return p;
  }
  _loadImage(rect, datos) {
    const x = this.s16(rect), y = this.s16(rect + 2), w = this.s16(rect + 4), h = this.s16(rect + 6);
    let o = this._a(datos);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++, o += 2) {
      const xx = x + i & 1023, yy = y + j & 511;
      this.vram[yy * 1024 + xx] = this.ram[o] | this.ram[o + 1] << 8;
    }
  }
  cuadro(apretados, sostenidos) {
    for (let k = 0; k < 4; k++) {
      const p = GV_PAD + 16 * k;
      this.w16(p, sostenidos);
      this.w16(p + 2, apretados);
      this.w16(p + 4, 0);
      this.w16(p + 6, apretados);
    }
    this.w32(GV_CLOCK, this.clock);
    for (const x of this.actores.slice()) {
      if (!x.vivo) continue;
      this.llamar(x.act, x.w);
    }
    for (const x of this.actores.filter(q => !q.vivo)) {
      if (x.die) this.llamar(x.die, x.w);
      this.free(x.w);
    }
    this.actores = this.actores.filter(q => q.vivo);
    this.dibujo = this.clock;
    this.clock ^= 1;
  }
  dibujar(fb, ox = 160, oy = 112) {
    const lista = [];
    for (const pr of this.prims) {
      if (!pr.en) continue;
      const base = this.r32(pr.p + 64 + 4 * this.dibujo);
      for (let k = 0; k < pr.n; k++) {
        const q = base + k * pr.tam, z = this.r8(q + 1);
        if (z) lista.push({
          q: q,
          z: z,
          tipo: pr.tipo,
          orden: lista.length
        });
      }
    }
    lista.sort((a, b) => b.z - a.z || b.orden - a.orden);
    this.gpu = {
      abr: 0,
      dtd: this.dithering !== false
    };
    for (const e of lista) this._poly(fb, e.q, ox, oy);
  }
  _poly(fb, q, ox, oy) {
    const code = this.r8(q + 7);
    const r = this.r8(q + 4), g = this.r8(q + 5), b = this.r8(q + 6);
    if ((code & 252) === 44) {
      const X = k => this.s16(q + 8 + k * 8), Y = k => this.s16(q + 10 + k * 8);
      const U = k => this.r8(q + 12 + k * 8), V = k => this.r8(q + 13 + k * 8);
      const clut = this.r16(q + 14), tpage = this.r16(q + 22);
      this.gpu.abr = tpage >> 5 & 3;
      this._rect(fb, X(0) + ox, Y(0) + oy, X(3) + ox, Y(3) + oy, U(0), V(0), U(3), V(3), tpage, clut, r, g, b, code);
    } else if ((code & 252) === 40) {
      const X = k => this.s16(q + 8 + k * 4), Y = k => this.s16(q + 10 + k * 4);
      this._rect(fb, X(0) + ox, Y(0) + oy, X(3) + ox, Y(3) + oy, 0, 0, 0, 0, -1, 0, r, g, b, code);
    }
  }
  _rect(fb, x0, y0, x1, y1, u0, v0, u1, v1, tpage, clut, r, g, b, code) {
    if (x1 < x0) {
      [x0, x1] = [ x1, x0 ];
      [u0, u1] = [ u1, u0 ];
    }
    if (y1 < y0) {
      [y0, y1] = [ y1, y0 ];
      [v0, v1] = [ v1, v0 ];
    }
    const W = fb.w, H = fb.h, D = fb.d, dw = x1 - x0, dh = y1 - y0;
    if (dw <= 0 || dh <= 0) return;
    const semi = (code & 2) !== 0, crudo = (code & 1) !== 0;
    const tp = tpage < 0 ? -1 : tpage >> 7 & 3, abr = tpage < 0 ? this.gpu?.abr ?? 0 : tpage >> 5 & 3;
    const tx = (tpage & 15) * 64, ty = (tpage >> 4 & 1) * 256, cx = (clut & 63) * 16, cy = clut >> 6 & 511;
    const VR = this.vram, mezcla = tp >= 0 && !crudo, dit = mezcla && (this.gpu?.dtd ?? true);
    const xa = Math.max(0, x0), xb = Math.min(W, x1), ya = Math.max(0, y0), yb = Math.min(H, y1);
    for (let y = ya; y < yb; y++) {
      const v = v0 + Math.floor((y - y0) * (v1 - v0) / dh) & 255, fila = DITHER[y & 3];
      let o = (y * W + xa) * 4;
      for (let x = xa; x < xb; x++, o += 4) {
        let c;
        if (tp < 0) c = 32768 | b >> 3 << 10 | g >> 3 << 5 | r >> 3; else {
          const u = u0 + Math.floor((x - x0) * (u1 - u0) / dw) & 255;
          if (tp === 0) {
            const w = VR[(ty + v & 511) * 1024 + (tx + (u >> 2) & 1023)];
            c = VR[cy * 1024 + cx + (w >> (u & 3) * 4 & 15)];
          } else if (tp === 1) {
            const w = VR[(ty + v & 511) * 1024 + (tx + (u >> 1) & 1023)];
            c = VR[cy * 1024 + (cx + (w >> (u & 1) * 8 & 255) & 1023)];
          } else c = VR[(ty + v & 511) * 1024 + (tx + u & 1023)];
          if (c === 0) continue;
        }
        let fr = c & 31, fg = c >> 5 & 31, fb5 = c >> 10 & 31;
        if (mezcla) {
          const d = dit ? fila[x & 3] : 0;
          fr = sat8(((fr << 3) * r >> 7) + d) >> 3;
          fg = sat8(((fg << 3) * g >> 7) + d) >> 3;
          fb5 = sat8(((fb5 << 3) * b >> 7) + d) >> 3;
        }
        if (semi && (tp < 0 || c & 32768)) {
          const br = D[o] >> 3, bg = D[o + 1] >> 3, bb = D[o + 2] >> 3;
          if (abr === 0) {
            fr = br + fr >> 1;
            fg = bg + fg >> 1;
            fb5 = bb + fb5 >> 1;
          } else if (abr === 1) {
            fr = Math.min(31, br + fr);
            fg = Math.min(31, bg + fg);
            fb5 = Math.min(31, bb + fb5);
          } else if (abr === 2) {
            fr = Math.max(0, br - fr);
            fg = Math.max(0, bg - fg);
            fb5 = Math.max(0, bb - fb5);
          } else {
            fr = Math.min(31, br + (fr >> 2));
            fg = Math.min(31, bg + (fg >> 2));
            fb5 = Math.min(31, bb + (fb5 >> 2));
          }
        }
        D[o] = fr << 3;
        D[o + 1] = fg << 3;
        D[o + 2] = fb5 << 3;
      }
    }
  }
}

const DITHER = [ [ -4, 0, -3, 1 ], [ 2, -2, 3, -1 ], [ -3, 1, -4, 0 ], [ 3, -1, 2, -2 ] ];

const sat8 = v => v < 0 ? 0 : v > 255 ? 255 : v;
