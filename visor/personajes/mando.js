// MGS web — FeniXVOID · Project Ravenlight
import { STATE } from "./comun.js";

import * as ctl from "../controles.js";

export const PAD = {
  L2: 1,
  R2: 2,
  L1: 4,
  R1: 8,
  TRIANGLE: 16,
  CIRCLE: 32,
  CROSS: 64,
  SQUARE: 128,
  SELECT: 256,
  START: 2048,
  UP: 4096,
  RIGHT: 8192,
  DOWN: 16384,
  LEFT: 32768
};

export const PAD_UDLR = 61440;

const BOTON_VR = {
  circulo: PAD.CIRCLE,
  cruz: PAD.CROSS,
  cuadrado: PAD.SQUARE,
  triangulo: PAD.TRIANGLE,
  select: PAD.SELECT,
  start: PAD.START,
  L1: PAD.L1,
  R1: PAD.R1,
  L2: PAD.L2,
  R2: PAD.R2
};

const padVR = {
  abajo: 0,
  pulsos: 0
};

export function botonMandoVR(nombre, abajo) {
  const b = BOTON_VR[nombre];
  if (!b) return;
  if (abajo) {
    padVR.abajo |= b;
    padVR.pulsos |= b;
  } else padVR.abajo &= ~b;
}

const TECLAS = {
  KeyG: PAD.CIRCLE,
  Space: PAD.CIRCLE,
  KeyC: PAD.CROSS,
  KeyX: PAD.CROSS,
  KeyF: PAD.SQUARE,
  KeyZ: PAD.TRIANGLE,
  KeyT: PAD.SELECT,
  Backspace: PAD.SELECT,
  Enter: PAD.START,
  KeyQ: PAD.L1,
  KeyE: PAD.R1,
  Digit1: PAD.L2,
  Digit3: PAD.R2,
  ArrowUp: PAD.UP,
  KeyW: PAD.UP,
  ArrowDown: PAD.DOWN,
  KeyS: PAD.DOWN,
  ArrowLeft: PAD.LEFT,
  KeyA: PAD.LEFT,
  ArrowRight: PAD.RIGHT,
  KeyD: PAD.RIGHT
};

const B = ctl.B, BOTONES = [];

for (const [i, b] of [ [ B.CRUZ, PAD.CROSS ], [ B.CIRCULO, PAD.CIRCLE ], [ B.CUADRADO, PAD.SQUARE ], [ B.TRIANGULO, PAD.TRIANGLE ], [ B.L1, PAD.L1 ], [ B.R1, PAD.R1 ], [ B.L2, PAD.L2 ], [ B.R2, PAD.R2 ], [ B.SELECT, PAD.SELECT ], [ B.START, PAD.START ], [ B.ARRIBA, PAD.UP ], [ B.ABAJO, PAD.DOWN ], [ B.IZQ, PAD.LEFT ], [ B.DER, PAD.RIGHT ] ]) BOTONES[i] = b;

export class Mando {
  constructor(sis) {
    this.sis = sis;
    this.usuarios = new Set;
    this.abajo = new Set;
    this.pulsos = 0;
    this.prev = 0;
    this.status = 0;
    this.press = 0;
    this.frame = -1;
    this.toques = 0;
    this.kd = e => {
      const b = TECLAS[e.code];
      if (b == null || !this.usuarios.size) return;
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) this.pulsos |= b;
      this.abajo.add(e.code);
    };
    this.ku = e => {
      if (TECLAS[e.code] == null || !this.usuarios.size) return;
      e.stopImmediatePropagation();
      this.abajo.delete(e.code);
    };
    this.pd = e => {
      if (!this.usuarios.size) return;
      const cv = typeof window !== "undefined" ? window.__mgs?.R?.domElement : null;
      if (!cv || e.target !== cv) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.toques++;
    };
  }
  activar(quien) {
    if (!this.usuarios.size && typeof window !== "undefined") {
      addEventListener("keydown", this.kd, true);
      addEventListener("keyup", this.ku, true);
      addEventListener("pointerdown", this.pd, true);
      addEventListener("mousedown", this.pd, true);
    }
    this.usuarios.add(quien);
  }
  desactivar(quien) {
    this.usuarios.delete(quien);
    if (!this.usuarios.size && typeof window !== "undefined") {
      removeEventListener("keydown", this.kd, true);
      removeEventListener("keyup", this.ku, true);
      removeEventListener("pointerdown", this.pd, true);
      removeEventListener("mousedown", this.pd, true);
      this.abajo.clear();
      this.pulsos = 0;
      this.toques = 0;
      this.prev = 0;
      this.status = 0;
      this.press = 0;
    }
  }
  crudo() {
    let st = this.pulsos | padVR.abajo | padVR.pulsos;
    padVR.pulsos = 0;
    for (const c of this.abajo) st |= TECLAS[c] || 0;
    try {
      for (const g of [ ctl.mando() ]) {
        if (!g || !g.connected) continue;
        g.buttons.forEach((b, i) => {
          if ((b.pressed || b.value > .5) && BOTONES[i]) st |= BOTONES[i];
        });
        const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        if (ax < -.5) st |= PAD.LEFT; else if (ax > .5) st |= PAD.RIGHT;
        if (ay < -.5) st |= PAD.UP; else if (ay > .5) st |= PAD.DOWN;
        break;
      }
    } catch {}
    return st;
  }
  leer(frame) {
    if (frame === this.frame) return this;
    this.frame = frame;
    let st = this.crudo(), extra = 0;
    if (this.toques > 0) {
      extra = PAD.CIRCLE;
      this.toques--;
    }
    let press = st & ~this.prev | extra;
    this.prev = st;
    st |= extra;
    this.pulsos = 0;
    const S = this.sis;
    if (S && S.estado & STATE.PADRELEASE) {
      st = 0;
      press = 0;
    } else if (S && S.mascaraPad) {
      st &= S.padMask;
      press &= S.padMask;
    }
    this.status = st & 65535;
    this.press = press & 65535;
    return this;
  }
}

export function mandoDe(sis) {
  if (!sis.mando) sis.mando = new Mando(sis);
  return sis.mando;
}
