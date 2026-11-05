// MGS web — FeniXVOID · Project Ravenlight
export const PROGRESO_LLAMAR_MERYL = 52;

const T_ESPERA = 600, FALLOS = 3, T_REPITE = 120;

export class PistaMeryl {
  constructor(o) {
    this.o = o;
    this.reiniciar();
  }
  reiniciar() {
    this.t = 0;
    this.fallos = 0;
    this.tAviso = 0;
  }
  fallo() {
    if (this.o.progreso() === PROGRESO_LLAMAR_MERYL) this.fallos++;
  }
  cuadro(dt, libre) {
    if (this.o.progreso() !== PROGRESO_LLAMAR_MERYL) {
      this.reiniciar();
      return;
    }
    if (!libre) return;
    this.t += dt;
    if (this.t < T_ESPERA && this.fallos < FALLOS) return;
    this.tAviso -= dt;
    if (this.tAviso > 0) return;
    this.tAviso = T_REPITE;
    this.o.mostrar();
  }
}
