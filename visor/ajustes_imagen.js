// MGS web — FeniXVOID · Project Ravenlight
const NEUTRO = {
  brillo: 2,
  contraste: 2,
  color: 2
};

export const PASOS = {
  brillo: 7,
  contraste: 5,
  color: 5
};

export const NOMBRES_AJUSTE = {
  brillo: [ "-2", "-1", "NORMAL", "+1", "+2", "+3", "+4" ],
  contraste: [ "-2", "-1", "NORMAL", "+1", "+2" ],
  color: [ "-2", "-1", "NORMAL", "+1", "+2" ]
};

const clave = k => "sm_" + k;

const leer = k => {
  try {
    const v = localStorage.getItem(clave(k));
    if (v !== null && +v >= 0 && +v < PASOS[k]) return +v;
  } catch {}
  return NEUTRO[k];
};

const val = {
  brillo: leer("brillo"),
  contraste: leer("contraste"),
  color: leer("color")
};

export const gammaDe = i => Math.pow(.85, i - NEUTRO.brillo);

export const contrasteDe = i => 1 + (i - NEUTRO.contraste) * .15;

export const colorDe = i => 1 + (i - NEUTRO.color) * .25;

export const ajustes = {
  valor: k => val[k],
  nombre: k => NOMBRES_AJUSTE[k][val[k]],
  poner(k, i) {
    if (!(k in val)) return;
    val[k] = Math.max(0, Math.min(PASOS[k] - 1, Math.round(i)));
    try {
      localStorage.setItem(clave(k), val[k]);
    } catch {}
  },
  mover(k, dir = 1, vuelta = false) {
    const n = PASOS[k], j = val[k] + dir;
    this.poner(k, vuelta ? (j + n) % n : j);
  },
  get neutro() {
    return val.brillo === NEUTRO.brillo && val.contraste === NEUTRO.contraste && val.color === NEUTRO.color;
  },
  get exposicion() {
    return 3 + val.brillo + 9 * val.contraste + 81 * val.color;
  },
  aplicarBytes(d) {
    if (this.neutro) return;
    const g = gammaDe(val.brillo), k = contrasteDe(val.contraste), s = colorDe(val.color), t = new Float32Array(256);
    for (let i = 0; i < 256; i++) t[i] = (Math.pow(i / 255, g) - .25) * k + .25;
    for (let i = 0; i < d.length; i += 4) {
      const r = t[d[i]], v = t[d[i + 1]], a = t[d[i + 2]], l = .2126 * r + .7152 * v + .0722 * a;
      d[i] = Math.max(0, Math.min(255, Math.round((l + (r - l) * s) * 255)));
      d[i + 1] = Math.max(0, Math.min(255, Math.round((l + (v - l) * s) * 255)));
      d[i + 2] = Math.max(0, Math.min(255, Math.round((l + (a - l) * s) * 255)));
    }
  }
};
