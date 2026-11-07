// MGS web — FeniXVOID · Project Ravenlight
let datos = null;

const listo = (typeof fetch === "function" ? fetch("assets/integral/integral.json") : Promise.reject()).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  datos = d && typeof d === "object" ? d : null;
  return datos;
});

const MERYL_PERSONAJE = /^personajes\/meryl\.glb$/;

const EN_NIVEL = /^niveles\/([a-z0-9]+)\/([0-9a-z_]+)\.glb$/;

export const integral = {
  listo: listo,
  get datos() {
    return datos;
  },
  get hay() {
    return !!datos;
  },
  get muyFacil() {
    return datos?.muy_facil || null;
  },
  esMp5(nivelJuego) {
    return nivelJuego === -1 && !!datos?.muy_facil;
  },
  varsMuyFacil() {
    return datos?.muy_facil?.vars || null;
  },
  modelo(url, {traje: traje = false} = {}) {
    const t = traje && datos?.traje_meryl;
    if (!t || typeof url !== "string") return url;
    if (MERYL_PERSONAJE.test(url)) return t.escenarios?.s07c?.meryl || t.escenarios?.s09a?.meryl || url;
    const m = EN_NIVEL.exec(url);
    if (!m) return url;
    const st = m[1], cambios = t.escenarios?.[st] || (st.endsWith("r") ? t.escenarios?.[st.slice(0, -1)] : null);
    return cambios?.[m[2]] || url;
  }
};
