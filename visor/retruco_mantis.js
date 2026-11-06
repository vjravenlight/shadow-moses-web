// MGS web — FeniXVOID · Project Ravenlight
const ZONA_CRUCE = .05, T_CRUCE = 2, T_MANDO = 1.5;

const MIRA_MINIMA = -.4;

const FALLOS_PISTA = 6, T_REPITE_PISTA = 45;

const FLECHAS = [ "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ], WASD = [ "KeyW", "KeyA", "KeyS", "KeyD" ];

const DPAD = [ 12, 13, 14, 15 ];

export function controlesCruzados(cuadro, ref, fuentes) {
  const v = cuadro?.getViewerPose?.(ref);
  if (!v) return false;
  const m = v.transform.matrix, o = v.transform.position;
  let izq = false, der = false;
  for (const f of fuentes || []) {
    if (!f.gripSpace || f.handedness !== "left" && f.handedness !== "right") continue;
    const p = cuadro.getPose(f.gripSpace, ref)?.transform.position;
    if (!p) continue;
    const c = f.targetRaySpace && cuadro.getPose(f.targetRaySpace, ref)?.transform.matrix;
    if (c && m[8] * c[8] + m[9] * c[9] + m[10] * c[10] < MIRA_MINIMA) continue;
    const lado = (p.x - o.x) * m[0] + (p.y - o.y) * m[1] + (p.z - o.z) * m[2];
    if (f.handedness === "left" && lado > ZONA_CRUCE) izq = true;
    if (f.handedness === "right" && lado < -ZONA_CRUCE) der = true;
  }
  return izq && der;
}

export function fuentesActivas(teclas, mandos) {
  const r = [];
  if (WASD.some(k => teclas?.[k])) r.push("wasd");
  if (FLECHAS.some(k => teclas?.[k])) r.push("flechas");
  for (const g of mandos || []) {
    if (!g?.connected) continue;
    if ((g.axes || []).some(x => Math.abs(x) > .5) || DPAD.some(i => g.buttons?.[i]?.pressed)) r.push(g.index);
  }
  return r;
}

export class RetrucoMantis {
  constructor(o) {
    this.o = o;
    this.reiniciar();
  }
  reiniciar() {
    this.enPelea = false;
    this.logrado = false;
    this.t = 0;
    this.fuente = null;
    this.angulo = null;
    this.fallos = 0;
    this.previo = 0;
    this.tPista = 0;
    this.pistaDada = false;
  }
  cuadro(dt, e) {
    const j = this.o.jefe();
    if (!j) {
      if (this.logrado) this.o.fin();
      if (this.enPelea) this.reiniciar();
      return;
    }
    this.enPelea = true;
    const tCruce = this.o.tCruce?.() ?? T_CRUCE;
    if (!tCruce || this.o.puerto2()) return;
    this._pista(dt, e, j);
    if (e.xr) {
      this.t = controlesCruzados(e.xr.cuadro, e.xr.ref, e.xr.fuentes) ? this.t + dt : 0;
      if (this.t >= tCruce) this._lograr(j);
      return;
    }
    if (e.angulo != null) {
      if (this.angulo == null) this.angulo = e.angulo;
      const d = Math.abs(e.angulo - this.angulo) % 360;
      if (d === 180) return this._lograr(j);
      if (d) this.angulo = e.angulo;
    }
    const a = fuentesActivas(e.teclas, e.mandos);
    if (!a.length) return;
    if (this.fuente == null) {
      this.fuente = a[0];
      return;
    }
    if (a.includes(this.fuente)) {
      this.t = 0;
      return;
    }
    this.t += dt;
    if (this.t >= T_MANDO) this._lograr(j, typeof a[0] === "number" ? a[0] : null);
  }
  _lograr(j, mando = null) {
    this.logrado = true;
    this.t = 0;
    this.o.lograr(j, mando);
  }
  _pista(dt, e, j) {
    const n = j.missCount || 0;
    if (n > this.previo) this.fallos += n - this.previo;
    this.previo = n;
    this.tPista -= dt;
    if (this.fallos < FALLOS_PISTA || this.tPista > 0) return;
    this.tPista = T_REPITE_PISTA;
    const hayMando = (e.mandos || []).some(g => g?.connected);
    this.o.pista(e.xr ? "casco" : e.tactil ? "celular" : hayMando ? "joystick" : "teclado");
  }
}
