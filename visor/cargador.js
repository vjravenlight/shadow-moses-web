// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

let _cargar = null;

export function registrarCargador(f) {
  _cargar = typeof f === "function" ? f : null;
}

export const cargadorCompartido = () => _cargar;

const _tex = new Map;

const _carga = new THREE.TextureLoader;

export function texturaCompartida(url, op = {}) {
  const clave = [ url, op.colorSpace ?? "", op.mag ?? "", op.min ?? "" ].join("|");
  let t = _tex.get(clave);
  if (!t) {
    let ok;
    const listo = new Promise(r => {
      ok = r;
    });
    t = _carga.load(url, () => ok(t), undefined, () => {
      _tex.delete(clave);
      ok(t);
    });
    if (op.colorSpace) t.colorSpace = op.colorSpace;
    if (op.mag != null) t.magFilter = op.mag;
    if (op.min != null) t.minFilter = op.min;
    t.userData.listo = listo;
    _tex.set(clave, t);
  }
  return t;
}
