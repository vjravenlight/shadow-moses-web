// MGS web — FeniXVOID · Project Ravenlight
const ANG = Math.PI * 2 / 4096;

const rsin = a => Math.round(Math.sin(a * ANG) * 4096);

const randS = n => (Math.floor(Math.random() * 32768) & 2 * n - 1) - n;

const randU = n => Math.floor(Math.random() * 32768) & n - 1;

export const KILL = 12835;

export const FPS_JUEGO = 30;

class BlurGuion {
  constructor() {
    this.actual = null;
    this._oyentes = new Set;
  }
  prender(nombre, d = []) {
    const v = Array.isArray(d) && typeof d[0] === "number" ? d[0] : 0;
    const temblor = v, completa = v, modo = v;
    this.actual = {
      nombre: nombre ?? -1,
      temblor: temblor,
      modo: modo,
      f64: 0,
      f68: completa ? 0 : 24,
      f6C: completa ? 0 : 40,
      f5C: randU(4096),
      espera: 4,
      f70: 0,
      f74: 0,
      geo: null,
      t: null
    };
    this._avisar();
    return this.actual;
  }
  prenderSet(temblor = 1, completa = 0, modo = 0, nombre = "set") {
    this.actual = {
      nombre: nombre,
      temblor: temblor,
      modo: modo,
      f64: 0,
      f68: completa ? 0 : 24,
      f6C: completa ? 0 : 40,
      f5C: randU(4096),
      espera: 4,
      f70: 0,
      f74: 0,
      geo: null,
      t: null
    };
    this._avisar();
    return this.actual;
  }
  apagar(nombre) {
    if (!this.actual || nombre != null && this.actual.nombre !== nombre) return false;
    this.actual = null;
    this._avisar();
    return true;
  }
  mensaje(dest, v) {
    return !!this.actual && this.actual.nombre === dest && v?.[0] === KILL && this.apagar(dest);
  }
  alCambiar(f) {
    this._oyentes.add(f);
    return () => this._oyentes.delete(f);
  }
  _avisar() {
    for (const f of this._oyentes) {
      try {
        f(this.actual);
      } catch (e) {
        console.error(e);
      }
    }
  }
  tic(ahora) {
    const b = this.actual;
    if (!b) return false;
    if (b.t == null) {
      b.t = ahora;
      this.act();
      return true;
    }
    const paso = 1e3 / FPS_JUEGO;
    if (ahora - b.t < paso) return false;
    b.t = ahora - b.t > 4 * paso ? ahora : b.t + paso;
    this.act();
    return true;
  }
  act() {
    const b = this.actual;
    if (!b) return null;
    b.f5C++;
    if (b.espera > 0) {
      b.espera--;
      b.geo = null;
      return null;
    }
    const t0 = b.modo === 1 ? 2 : b.modo === 2 ? 3 : 1, abr = b.modo === 3 ? 3 : 0;
    b.geo = this.grilla(t0, abr);
    return b.geo;
  }
  grilla(caso, abr) {
    const b = this.actual;
    const r1 = [ randS(2), randS(2), randS(2) ], r2 = [ randS(2), randS(2), randS(2) ];
    let off = 0;
    if (caso === 1) {
      if (b.temblor) {
        b.f70 = Math.trunc((rsin(b.f5C * 41) + rsin(b.f5C * 30)) / 2048);
        b.f74 = Math.trunc((rsin(b.f5C * 53) + rsin(b.f5C * 81)) / 2048);
      } else {
        b.f70 = 0;
        b.f74 = 0;
      }
    } else {
      off = caso === 2 ? 8 : -8;
      b.f70 = 0;
      b.f74 = 0;
    }
    const {f64: f64, f68: f68, f6C: f6C, f70: f70, f74: f74} = b;
    const x0 = f64 + off, x2 = 320 - off - f64, y0 = f68 + off, y2 = 224 - off - f6C;
    const pos = [ [ x0, y0 ], [ 160 + f70 + r1[0], y0 ], [ x2, y0 ], [ x0, 112 + f74 + r2[0] ], [ 160 + f70 + r1[1], 112 + f74 + r2[1] ], [ x2, 112 + f74 + r2[2] ], [ x0, y2 ], [ 160 + f70 + r1[2], y2 ], [ x2, y2 ] ];
    const u = [ f64 + 2, 159.5 - f70, 317 - f64 ], v = [ f68 + 2, 111.5 - f74, 221 - f6C ];
    const uv = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) uv.push([ u[i], v[j] ]);
    return {
      pos: pos,
      uv: uv,
      abr: abr
    };
  }
}

export const blurGuion = new BlurGuion;
