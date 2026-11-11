// MGS web — FeniXVOID · Project Ravenlight
import { Guion, HASH } from "./codec_gcl.js";

let datos = null, staffIndice = null;

const staff = {
  guion: null,
  st: null,
  dentro: new Set,
  pide: 0
};

const listo = (typeof fetch === "function" ? fetch("assets/integral/integral.json") : Promise.reject()).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  datos = d && typeof d === "object" ? d : null;
  return datos;
});

const CLAVE_VERSION = "sm_version";

const VERSIONES = [ "original", "integral" ];

const leerUltima = () => {
  try {
    const v = localStorage.getItem(CLAVE_VERSION);
    return VERSIONES.includes(v) ? v : "original";
  } catch {
    return "original";
  }
};

let version = leerUltima();

const on = () => !!datos && version === "integral";

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
  get version() {
    return version;
  },
  get activo() {
    return on();
  },
  usarVersion(v) {
    version = VERSIONES.includes(v) ? v : "original";
    return version;
  },
  elegirVersion(v) {
    this.usarVersion(v);
    try {
      localStorage.setItem(CLAVE_VERSION, version);
    } catch {}
    return version;
  },
  versionGuardada() {
    return leerUltima();
  },
  versionDe(p) {
    const v = p?.visor?.version;
    if (VERSIONES.includes(v)) return v;
    if (!p) return leerUltima();
    const vars = p.vars?.get ? p.vars : null;
    const dif = typeof p.dificultad === "number" ? p.dificultad : null;
    const muyFacil = dif === 0, esmoquin = !!vars?.get("$f:G0435.0"), alterna = !!vars?.get("$f:G0435.3");
    const r = muyFacil || esmoquin || alterna ? "integral" : "original";
    if (vars && p.visor) p.visor.version = r;
    return r;
  },
  get muyFacil() {
    return on() ? datos.muy_facil || null : null;
  },
  esMp5(nivelJuego) {
    return nivelJuego === -1 && on() && !!datos.muy_facil;
  },
  varsMuyFacil() {
    return on() ? datos.muy_facil?.vars || null : null;
  },
  async sumarRecargaMp5(base) {
    const r = (await listo)?.muy_facil?.recarga;
    if (!r || !base?.clips || base.clips["ve:52"]) return !!base?.clips?.["ve:52"];
    try {
      const d = await (await fetch("assets/" + r.anim)).json();
      const c = d?.clips?.["anim " + r.motion];
      if (!c || d.huesos !== base.huesos) return false;
      base.clips["ve:52"] = c;
      return true;
    } catch {
      return false;
    }
  },
  llamadaStaff(freq, st) {
    const s = on() ? datos.staff : null;
    if (!s || freq !== s.freq || !st) return null;
    if (!staffIndice) {
      staffIndice = fetch("assets/" + s.indice).then(r => r.ok ? r.json() : null).catch(() => null).then(d => staffIndice = d || false);
      return null;
    }
    if (typeof staffIndice.then === "function" || !staffIndice) return null;
    let off = null;
    if (staff.guion?.script && staff.st === st) {
      const code = staff.guion.codigoDe(freq), o = code >= 0 ? (code & 65535) * 2048 : null;
      if (o != null && (!staffIndice.llamadas || staffIndice.llamadas.includes(o))) off = o;
    }
    off ??= staffIndice.escenarios?.[st] ?? staffIndice.escenarios?.[st.replace(/r$/, "")];
    return off == null ? null : {
      code: off,
      url: `assets/integral/staff/${off}.json`,
      fuente: "assets/integral/staff/ui/"
    };
  },
  async cargarStaff(st, vars) {
    const n = ++staff.pide;
    staff.st = st;
    staff.dentro = new Set;
    if (staff.guion) {
      staff.guion.script = null;
      staff.guion.limpiarEscenario();
    }
    const s = on() ? datos.staff : null;
    if (!s || !st || !vars) return false;
    if (!staffIndice) this.prepararStaff();
    if (typeof staffIndice?.then === "function") await staffIndice;
    if (n !== staff.pide || !staffIndice?.guiones?.includes(st)) return false;
    staff.guion ||= new Guion({
      vars: vars,
      memoria: {
        poner() {},
        borrarTodo() {},
        marcar() {}
      },
      base: "assets/integral/staff/"
    });
    staff.guion.vars = vars;
    const ok = await staff.guion.cargarEscenario(st, {
      usarEstadoDeEntrada: false
    });
    if (n !== staff.pide) return false;
    return ok;
  },
  actualizarStaff(sn) {
    const g = staff.guion;
    if (!g?.script || !sn?.pos || !on()) return;
    const Z = g.zonas, x = sn.pos.x * 1e3, y = sn.pos.y * 1e3 + 750, z = sn.pos.z * 1e3;
    const dentro = cajas => cajas.some(c => x >= Math.min(c[0][0], c[1][0]) && x < Math.max(c[0][0], c[1][0]) && y >= Math.min(c[0][1], c[1][1]) && y < Math.max(c[0][1], c[1][1]) && z >= Math.min(c[0][2], c[1][2]) && z < Math.max(c[0][2], c[1][2]));
    for (const h in Z) {
      const zona = +h, ahora = dentro(Z[h]);
      if (ahora === staff.dentro.has(zona)) continue;
      if (ahora) staff.dentro.add(zona); else staff.dentro.delete(zona);
      g.trampa(zona, ahora ? HASH.ENTRAR : HASH.SALIR, HASH.SNAKE);
    }
  },
  get estadoStaff() {
    return {
      st: staff.st,
      script: !!staff.guion?.script,
      code: staff.guion?.script ? staff.guion.codigoDe(datos?.staff?.freq ?? 14007) : -1,
      dentro: [ ...staff.dentro ]
    };
  },
  prepararStaff() {
    if (datos?.staff && !staffIndice) this.llamadaStaff(datos.staff.freq, "-");
  },
  get alterna() {
    return on() ? datos.alterna || null : null;
  },
  esAlterna(st, activa) {
    return !!(activa && st && on() && datos.alterna?.escenarios?.[st]);
  },
  urlNivel(st, activa) {
    if (this.esAlterna(st, activa)) return "assets/" + datos.alterna.escenarios[st].nivel;
    const g = on() && st ? datos.guiones?.escenarios?.[st] : null;
    return g?.nivel ? "assets/" + g.nivel : null;
  },
  urlGuion(st, nivel) {
    if (nivel === true || nivel === "alterna") return this.esAlterna(st, true) ? "assets/" + datos.alterna.escenarios[st].guion : null;
    const g = on() && st ? datos.guiones?.escenarios?.[st] : null;
    if (!g?.guion || !!g.nivel !== (nivel === "integral")) return null;
    return "assets/" + g.guion;
  },
  tieneGuion(st) {
    return !!(on() && st && datos.guiones?.escenarios?.[st]);
  },
  varsEntrada(vars, voz = "en") {
    if (!on() || !datos.guiones || !vars?.get) return;
    const c = vars.get("$w:L0004") | 0;
    vars.set("$w:L0004", voz === "ja" ? c & ~256 : c | 256);
  },
  sumarActores(st, nv) {
    const extra = on() ? datos.actores?.[st] : null;
    if (!extra?.length || !Array.isArray(nv?.actores) || nv.actores.some(a => a.integral)) return 0;
    let n = 0;
    for (const a of extra) if (!nv.actores.some(b => b.tipo === a.tipo && b.nombre === a.nombre)) {
      nv.actores.push({
        ...a,
        mapa: a.mapa ?? nv.principal
      });
      n++;
    }
    return n;
  },
  modelo(url, {traje: traje = false} = {}) {
    if (on() && typeof url === "string" && datos.armas?.[url]) return datos.armas[url];
    const t = traje && on() && datos.traje_meryl;
    if (!t || typeof url !== "string") return url;
    if (MERYL_PERSONAJE.test(url)) return t.escenarios?.s07c?.meryl || t.escenarios?.s09a?.meryl || url;
    const m = EN_NIVEL.exec(url);
    if (!m) return url;
    const st = m[1], cambios = t.escenarios?.[st] || (st.endsWith("r") ? t.escenarios?.[st.slice(0, -1)] : null);
    return cambios?.[m[2]] || url;
  }
};
