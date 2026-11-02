// MGS web — FeniXVOID · Project Ravenlight
const ANG = Math.PI * 2 / 4096;

export const ALTO_CONTROL = [ 1.1, .496, .136, 0 ];

export function rotarPaso(px, pz, dir) {
  const a = dir * ANG, c = Math.cos(a), s = Math.sin(a);
  return [ px * c + pz * s, -px * s + pz * c ];
}

export function iniciarMotion(o) {
  const c = o.datos, n = Math.max(1, c?.cuadros | 0), alt = c?.altura || [], pa = c?.paso || [];
  const a0 = (alt[0] ?? 1100) / 1e3, aN = (alt[n - 1] ?? alt[0] ?? 1100) / 1e3;
  const cx = new Float32Array(n), cz = new Float32Array(n);
  let x = 0, z = 0;
  for (let f = 0; f < n; f++) {
    const [wx, wz] = rotarPaso(pa[f * 2] || 0, pa[f * 2 + 1] || 0, o.dir);
    x += wx / 1e3;
    z += wz / 1e3;
    cx[f] = x;
    cz[f] = z;
  }
  const postura = Math.max(0, Math.min(3, o.postura | 0));
  const fin = o.posturaFin >= 0 && o.posturaFin <= 3 ? o.posturaFin : postura;
  const ctl = o.ctlY ?? o.pos.y + ALTO_CONTROL[postura];
  let ref;
  if (o.banderas & 4 && o.y6 != null) ref = ctl - o.y6 / 1e3; else if (a0 < .6 && aN < a0 - .3) {
    const yf = o.piso(o.pos.x + cx[n - 1], ctl + aN + .4, o.pos.z + cz[n - 1], 3);
    ref = yf != null ? yf + ALTO_CONTROL[fin === 3 ? 2 : fin] - aN : ctl;
  } else ref = o.piso(o.pos.x, ctl + .05, o.pos.z, ALTO_CONTROL[postura] + 1.5) ?? o.pos.y;
  let rango = 0;
  for (let f = 0; f < n; f++) rango = Math.max(rango, Math.abs((alt[f] ?? 0) / 1e3 - a0));
  return {
    n: n,
    x0: o.pos.x,
    z0: o.pos.z,
    cx: cx,
    cz: cz,
    ref: ref,
    aN: aN,
    posturaFin: fin,
    escalera: rango > 1.2
  };
}

export function cuadroMotion(m, t, pos) {
  const f = Math.max(0, Math.min(m.n - 1, Math.floor(t * 30)));
  pos.x = m.x0 + m.cx[f];
  pos.z = m.z0 + m.cz[f];
  pos.y = m.ref;
}

export function moverMotion(m, t, x, z) {
  const f = Math.max(0, Math.min(m.n - 1, Math.floor(t * 30)));
  m.x0 = x - m.cx[f];
  m.z0 = z - m.cz[f];
}

export function finMotion(m, pos, piso) {
  const cadera = m.ref + m.aN;
  return piso(pos.x, cadera + .3, pos.z, 2.5);
}
