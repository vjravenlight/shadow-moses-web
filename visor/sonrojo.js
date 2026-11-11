// MGS web — FeniXVOID · Project Ravenlight
export function ponerSonrojo(obj, rojo) {
  const mallas = [];
  obj?.traverse?.(m => {
    if (!m.isMesh || m.userData.sonrojo) return;
    const antes = m.onBeforeRender, despues = m.onAfterRender, guardado = {
      mat: null,
      r: 0
    };
    m.userData.sonrojo = {
      antes: antes,
      despues: despues
    };
    m.onBeforeRender = function(r, s, c, g, mat, grupo) {
      antes.call(this, r, s, c, g, mat, grupo);
      const v = +rojo() || 0;
      if (v <= 0 || !mat?.color) return;
      guardado.mat = mat;
      guardado.r = mat.color.r;
      mat.color.r += v / 128;
    };
    m.onAfterRender = function(r, s, c, g, mat, grupo) {
      if (guardado.mat) {
        guardado.mat.color.r = guardado.r;
        guardado.mat = null;
      }
      despues.call(this, r, s, c, g, mat, grupo);
    };
    mallas.push(m);
  });
  return () => {
    for (const m of mallas) {
      const u = m.userData.sonrojo;
      if (!u) continue;
      m.onBeforeRender = u.antes;
      m.onAfterRender = u.despues;
      delete m.userData.sonrojo;
    }
  };
}
