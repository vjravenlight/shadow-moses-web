// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

export const ORDEN_GEMELA = 950;

const _mats = new Map;

function matProfundidad(mt) {
  const corta = !!(mt && mt.map && mt.alphaTest > 0);
  const k = corta ? mt : null;
  let p = _mats.get(k);
  if (p && corta && (p.map !== mt.map || p.alphaTest !== mt.alphaTest)) {
    p.map = mt.map;
    p.alphaTest = mt.alphaTest;
    p.needsUpdate = true;
  }
  if (p) return p;
  p = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    map: corta ? mt.map : null,
    alphaTest: corta ? mt.alphaTest : 0
  });
  p.name = "cuerpo_profundidad";
  _mats.set(k, p);
  return p;
}

function gemela(m) {
  if (m.userData.gemelaProf !== undefined) return m.userData.gemelaProf;
  const mt = m.material;
  if (!mt || Array.isArray(mt) || !m.geometry) {
    m.userData.gemelaProf = null;
    return null;
  }
  const g = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, matProfundidad(mt)) : new THREE.Mesh(m.geometry, matProfundidad(mt));
  if (m.isSkinnedMesh) {
    g.bindMode = m.bindMode;
    g.bind(m.skeleton, m.bindMatrix);
  }
  g.name = "prof_" + (m.name || "");
  g.renderOrder = ORDEN_GEMELA;
  g.frustumCulled = false;
  g.castShadow = g.receiveShadow = false;
  g.raycast = () => {};
  g.visible = false;
  g.userData.sinColision = g.userData.propio = g.userData.gemelaCuerpo = true;
  m.add(g);
  m.userData.gemelaProf = g;
  return g;
}

export function gemelasProfundidad(obj, si, filtro) {
  if (!obj) return;
  const partes = [];
  obj.traverse(m => {
    if (m.isMesh && !m.userData.gemelaCuerpo && !m.isUnidaPersonaje && filtro(m)) partes.push(m);
  });
  for (const m of partes) {
    const g = si ? gemela(m) : m.userData.gemelaProf;
    if (!g) continue;
    if (si && g.material !== matProfundidad(m.material)) g.material = matProfundidad(m.material);
    g.visible = !!si;
  }
}

export function alfaPorDistancia(d) {
  if (d == null) return 1;
  if (d >= 1.2) return 1;
  if (d >= .5) return .25 + (d - .5) / .7 * .75;
  if (d <= .35) return 0;
  return (d - .35) / .15 * .25;
}
