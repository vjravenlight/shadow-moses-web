// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const ANG = Math.PI * 2 / 4096;

const cache = new Map;

export async function cargarAnims(nombre) {
  if (!cache.has(nombre)) cache.set(nombre, fetch(`assets/anim/${nombre}.json`).then(r => r.json()));
  return cache.get(nombre);
}

export let ORDEN = "ZYX";

export function setOrden(o) {
  ORDEN = o;
}

export function avanceClip(datos, nombre) {
  const c = datos?.clips?.[nombre];
  if (!c?.cuadros || !c.paso) return null;
  let x = 0, z = 0;
  for (let f = 0; f < c.cuadros; f++) {
    x += c.paso[f * 2];
    z += c.paso[f * 2 + 1];
  }
  return Math.hypot(x, z) / c.cuadros * (datos.fps || 30) / 1e3;
}

export function clip(datos, nombre, raizBase = [ 0, 0, 0 ]) {
  const c = datos.clips[nombre];
  if (!c) return null;
  const H = datos.huesos, n = c.cuadros, fps = datos.fps;
  const m = c.ciclo && n > 1 ? n + 1 : n, fr = f => f === n ? 0 : f;
  const tiempos = Float32Array.from({
    length: m
  }, (_, i) => i / fps);
  const pistas = [];
  const e = new THREE.Euler, q = new THREE.Quaternion;
  for (let h = 0; h < H; h++) {
    const v = new Float32Array(m * 4);
    for (let f = 0; f < m; f++) {
      const o = (fr(f) * H + h) * 3;
      e.set(c.rot[o] * ANG, c.rot[o + 1] * ANG, c.rot[o + 2] * ANG, ORDEN);
      q.setFromEuler(e);
      q.toArray(v, f * 4);
    }
    pistas.push(new THREE.QuaternionKeyframeTrack(`hueso_${h}.quaternion`, tiempos, v));
  }
  const pos = new Float32Array(m * 3);
  for (let f = 0; f < m; f++) {
    pos[f * 3] = raizBase[0];
    pos[f * 3 + 1] = c.altura[fr(f)] * .001;
    pos[f * 3 + 2] = raizBase[2];
  }
  pistas.push(new THREE.VectorKeyframeTrack("hueso_0.position", tiempos, pos));
  return new THREE.AnimationClip(nombre, n / fps, pistas);
}
