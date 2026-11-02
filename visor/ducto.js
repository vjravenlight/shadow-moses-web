// MGS web — FeniXVOID · Project Ravenlight
const H_HIDDEN = "hidden";

export const ALTURA_CONTROL = [ .75, .25, .25 ];

const TIEMPO_INV = [ 0, 2048, 1365, 1024, 819, 682, 585, 512, 455, 409, 372, 341, 315, 292, 273, 256 ];

export class Ductos {
  constructor() {
    this.cajas = [];
    this.activo = false;
    this.vistaAntes = null;
    this.entradas = 0;
  }
  cargar(trampas = []) {
    this.cajas = [];
    for (const t of trampas || []) {
      if (t?.nombre !== H_HIDDEN || !t.caja) continue;
      const c = t.caja;
      if (c.min && c.max) this.cajas.push({
        x0: c.min.x,
        y0: c.min.y,
        z0: c.min.z,
        x1: c.max.x,
        y1: c.max.y,
        z1: c.max.z
      }); else if (Array.isArray(c) && c.length === 2) {
        const [a, b] = c;
        this.cajas.push({
          x0: Math.min(a[0], b[0]) / 1e3,
          y0: Math.min(a[1], b[1]) / 1e3,
          z0: Math.min(a[2], b[2]) / 1e3,
          x1: Math.max(a[0], b[0]) / 1e3,
          y1: Math.max(a[1], b[1]) / 1e3,
          z1: Math.max(a[2], b[2]) / 1e3
        });
      }
    }
    this.activo = false;
    this.vistaAntes = null;
    return this.cajas.length;
  }
  dentro(pos, postura = 0) {
    if (!pos || !this.cajas.length) return false;
    const x = pos.x, y = pos.y + ALTURA_CONTROL[Math.max(0, Math.min(2, postura | 0))], z = pos.z;
    for (const c of this.cajas) if (x >= c.x0 && x < c.x1 && y >= c.y0 && y < c.y1 && z >= c.z0 && z < c.z1) return true;
    return false;
  }
  actualizar(pos, postura = 0, habilitado = true) {
    const d = habilitado && this.dentro(pos, postura);
    if (d === this.activo) return null;
    this.activo = d;
    if (d) this.entradas++;
    return d ? "entra" : "sale";
  }
  reset() {
    this.activo = false;
    this.vistaAntes = null;
  }
  camaraIntrusa(a) {
    if (a?.tipo !== "INTRUDECAM" || !Array.isArray(a.p)) return false;
    (this.camaras ||= new Map).set(a.nombre, {
      p: {
        x: a.p[0] / 1e3,
        y: a.p[1] / 1e3,
        z: a.p[2] / 1e3
      },
      estado: 2
    });
    return true;
  }
  cargarCamaras(actores = []) {
    this.camaras = new Map;
    for (const a of actores) this.camaraIntrusa(a);
    this.mirando = null;
    this.interp = 8;
  }
  mensaje(dest, v) {
    const c = this.camaras?.get(dest);
    if (!c) return false;
    const m = v?.[0];
    if (m === 3662) c.estado = 1; else if (m === 51495) c.estado = 2; else if (m === 12835) {
      c.estado = 3;
      this.camaras.delete(dest);
    } else return false;
    return true;
  }
  ojoJuego(cab, enDucto = this.activo) {
    let on = null;
    if (enDucto && this.camaras) for (const c of this.camaras.values()) if (c.estado === 1) {
      on = c;
      break;
    }
    if (!on) {
      this._ojoJ = null;
      this._camJ = null;
      this._interpJ = 8;
      return null;
    }
    if (this._camJ !== on || !this._ojoJ) {
      this._camJ = on;
      this._ojoJ = {
        x: cab.x,
        y: cab.y,
        z: cab.z
      };
      this._interpJ = 8;
    }
    const it = this._interpJ;
    if (this._interpJ > 0) this._interpJ--;
    const k = TIEMPO_INV[Math.min(15, it)], e = this._ojoJ, p = {
      x: on.p.x * 1e3,
      y: on.p.y * 1e3,
      z: on.p.z * 1e3
    };
    for (const c of "xyz") e[c] = k === 0 ? Math.round(p[c]) : Math.trunc((Math.round(p[c]) - e[c]) * k / 4096) + e[c];
    return e;
  }
  ojo(dt = 1 / 30) {
    let on = null;
    if (this.activo && this.camaras) for (const c of this.camaras.values()) if (c.estado === 1) {
      on = c;
      break;
    }
    if (!on) {
      this.interp = 8;
      this.mirando = null;
      return null;
    }
    if (this.mirando !== on) {
      this.mirando = on;
      this.interp = 8;
    }
    const n = Math.max(1, Math.round(dt * 30));
    this.interp = Math.max(0, this.interp - n);
    return {
      p: on.p,
      k: this.interp > 0 ? Math.min(1, n / this.interp) : 1
    };
  }
}

export const ducto = new Ductos;
