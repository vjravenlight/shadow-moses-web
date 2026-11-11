// MGS web — FeniXVOID · Project Ravenlight
const LV_ARMA = 14, LV_ITEM = 15, LV_ARMAS = 17, LV_ITEMS = 37;

const ENLACE = (() => {
  const E = [ [ LV_ARMA, i => i.arma, (i, v) => {
    i.arma = v;
  } ], [ LV_ITEM, i => i.item, (i, v) => {
    i.item = v;
  } ] ];
  for (let k = 0; k < 10; k++) E.push([ LV_ARMAS + k, i => i.armas?.[k], (i, v) => {
    if (i.armas) i.armas[k] = v;
  } ]);
  for (let k = 0; k < 24; k++) E.push([ LV_ITEMS + k, i => i.items?.[k], (i, v) => {
    if (i.items) i.items[k] = v;
  } ]);
  return E;
})();

const leerL = (L, i) => {
  const v = L[i * 2] | L[i * 2 + 1] << 8;
  return v & 32768 ? v - 65536 : v;
};

const ponerL = (L, i, v) => {
  L[i * 2] = v & 255;
  L[i * 2 + 1] = v >> 8 & 255;
};

export class SincEscenarios {
  constructor() {
    this.olvidar();
  }
  olvidar() {
    this.juego = null;
    this.vars = null;
    this.sombra = null;
    this.acum = 0;
  }
  tick(dt, inv, vars, juego) {
    if (!inv || !vars?.l || !juego) return;
    if (juego !== this.juego || vars !== this.vars || !this.sombra) {
      this.juego = juego;
      this.vars = vars;
      this.sombra = new Int32Array(96);
      this.acum = 0;
      for (const [i] of ENLACE) this.sombra[i] = leerL(vars.l, i);
      this.sincronizar(inv);
      return;
    }
    if (!(dt > 0) || (this.acum += dt) < .5) return;
    this.acum = 0;
    this.sincronizar(inv);
  }
  sincronizar(inv) {
    const L = this.vars.l, S = this.sombra;
    for (const [i, leer, escribir] of ENLACE) {
      const l = leerL(L, i);
      if (l !== S[i]) {
        escribir(inv, l);
        S[i] = l;
        continue;
      }
      const v = leer(inv);
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      if ((v | 0) !== l) {
        ponerL(L, i, v | 0);
        S[i] = leerL(L, i);
      }
    }
  }
}
