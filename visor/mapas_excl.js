// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

export const ESCENARIOS = new Set([ "s14e" ]);

const MM = .001;

export function zonasDelMapa(zonasGuion, hzs) {
  const cajas = new Set;
  for (const hz of hzs) for (const g of hz?.grupos || []) for (const t of g.triggers || []) if (t.caja) cajas.add(JSON.stringify(t.caja));
  const z = {};
  for (const h in zonasGuion || {}) {
    const c = zonasGuion[h].filter(x => cajas.has(JSON.stringify(x)));
    if (c.length) z[h] = c;
  }
  return z;
}

export function hzUnido(hzs) {
  return hzs.filter(Boolean).reduce((acc, h) => acc ? {
    ...acc,
    grupos: acc.grupos.concat(h.grupos),
    zonas: acc.zonas.concat(h.zonas.map(z => ({
      ...z,
      vecinas: z.vecinas.map(v => v + acc.zonas.length)
    })))
  } : h, null);
}

function mallas(hz) {
  const mat = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  });
  const posP = [], posF = [], atr = [];
  for (const g of hz?.grupos || []) {
    for (const w of g.paredes) {
      if (w.flags & 1) continue;
      const a = w.a.map(v => v * MM), b = w.b.map(v => v * MM), h = w.alto * MM;
      posP.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], b[1] + h, b[2], a[0], a[1], a[2], b[0], b[1] + h, b[2], a[0], a[1] + h, a[2]);
    }
    for (const f of g.pisos) {
      atr.push(f.atr ?? 0);
      const q = f.puntos.map(p => p.map(v => v * MM));
      posF.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
    }
  }
  const malla = pos => {
    const geo = new THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const m = new THREE.Mesh(geo, mat);
    m.userData.propio = m.userData.sinColision = true;
    return m;
  };
  const p = malla(posP), f = malla(posF);
  f.userData.atr = atr;
  return {
    p: p,
    f: f
  };
}

export class MapasExclusivos {
  constructor({nv: nv, piezas: piezas, hzms: hzms, grupo: grupo, paredes: paredes, pisos: pisos, alCambiar: alCambiar}) {
    Object.assign(this, {
      nv: nv,
      piezas: piezas,
      hzms: hzms,
      grupo: grupo,
      paredes: paredes,
      pisos: pisos,
      alCambiar: alCambiar
    });
    this.actual = null;
    this.mallas = new Map;
    for (const lista of [ paredes, pisos ]) for (let i = lista.length - 1; i >= 0; i--) if (lista[i].userData.hzmUnido) {
      lista[i].removeFromParent();
      lista.splice(i, 1);
    }
  }
  visible(id) {
    return !!this.actual && this.actual.split(",").includes(String(id));
  }
  mapas(ids) {
    return ids.map(id => this.nv.mapas.find(m => m.id === id)).filter(Boolean);
  }
  poner(ids) {
    const ms = this.mapas(ids || []);
    if (!ms.length) return false;
    const clave = ms.map(m => m.id).sort().join(",");
    if (clave === this.actual) return false;
    this.actual = clave;
    const piezasSi = new Set(ms.flatMap(m => m.piezas || [])), hzmSi = new Set(ms.flatMap(m => m.hzm_json || []));
    for (const [f, o] of this.piezas) if (o) o.visible = piezasSi.has(f);
    for (const [f, mm] of this.mallas) if (!hzmSi.has(f)) {
      for (const [lista, m] of [ [ this.paredes, mm.p ], [ this.pisos, mm.f ] ]) {
        const i = lista.indexOf(m);
        if (i >= 0) lista.splice(i, 1);
        m.removeFromParent();
      }
    }
    for (const f of hzmSi) {
      const hz = this.hzms.get(f);
      if (!hz) continue;
      let mm = this.mallas.get(f);
      if (!mm) {
        mm = mallas(hz);
        this.mallas.set(f, mm);
      }
      if (!this.paredes.includes(mm.p)) {
        this.grupo.add(mm.p);
        this.paredes.push(mm.p);
      }
      if (!this.pisos.includes(mm.f)) {
        this.grupo.add(mm.f);
        this.pisos.push(mm.f);
      }
    }
    const hzs = [ ...hzmSi ].map(f => this.hzms.get(f)).filter(Boolean);
    this.alCambiar?.(hzUnido(hzs), hzs, ms.map(m => m.id));
    return true;
  }
}
