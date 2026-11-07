// MGS web — FeniXVOID · Project Ravenlight
import { integral } from "./integral.js";

import { VarsGCL, Guion } from "./codec_gcl.js";

const BASE = "assets/partida/";

export const RANURAS = 3;

export const RANURA_AUTO = "auto";

export const ALMACEN = {
  prefijo: ""
};

export const claveRanura = r => ALMACEN.prefijo + (r === RANURA_AUTO ? "mgs_partida_auto" : "mgs_codec_save_" + r);

export const FORMATO = "mgs1-partida";

const VERSION = 1;

const G_BYTES = 2048;

const L_BYTES = 192;

const L_RESTAURA = 156;

const HISTORIAL = 8;

const ENGANCHE = Symbol.for("mgs.partida");

const MEMORIA_MUDA = {
  lista: [],
  actual: 0,
  poner() {},
  marcar() {},
  guardar() {},
  borrarTodo() {}
};

export const LV = Object.freeze({
  GameLevel: 1,
  Configuration: 2,
  ClearFlag: 3,
  Disk: 4,
  Result: 5,
  SaveArea: 6,
  SaveMap: 7,
  PlayerPosX: 8,
  PlayerPosY: 9,
  PlayerPosZ: 10,
  Vitality: 11,
  VitalityMax: 12,
  StatusEvent: 13,
  Weapon: 14,
  Item: 15,
  PlayerStance: 16,
  Weapons: 17,
  WeaponsMax: 27,
  Items: 37,
  ItemsMax: 61,
  EnvironTemp: 64,
  ShapeKeyState: 65,
  ShapeKeyTemp: 66,
  FrozenItemsState: 69,
  BodyTemp: 70,
  FrozenItemsTemp: 71,
  TranquilizerTimer: 73,
  PrevArea: 74,
  EnemyWatchCount: 78,
  EnemyKillCount: 79,
  PitfallDeathCount: 80,
  MouseKillCount: 81,
  CrowKillCount: 82,
  RationUseCount: 86,
  ContinueCount: 87,
  SaveCount: 88,
  StageTimeHours: 89,
  StageTimeSeconds: 90,
  PlayTimeHours: 91,
  PlayTimeSeconds: 92,
  LastSaveHours: 93,
  LastSaveSeconds: 94,
  FirstPerson: 95
});

const IT_TIMERBOMB = 18;

export const AREAS = [ "Dock", "Heliport", "Tank Hangar", "Cell", "Medi room", "Armory", "Armory Sth", "Canyon", "Nuke Bldg 1", "Nuke Bldg. B1", "Cmnder room", "Nuke Bldg. B2", "Lab", "Cave", "U.Grnd Pssge", "Comm Twr A", "Roof/Comm Twr", "Comm Twr B", "Twr Wall A", "Walkway", "Snowfield", "Blast Furnace", "Cargo Elev.", "Warehouse", "Warehouse Nth", "U.Grnd Base 1", "U.Grnd Base 2", "U.Grnd Base 3", "Cmnd room", "Spply Rte.", "Esc Route" ];

export const RANGOS = [ "HOUND", "DOBERMAN", "FOX", "BIG BOSS", "PIGEON", "FALCON", "HAWK", "EAGLE", "PIRANHA", "SHARK", "JAWS", "ORCA", "PIG", "ELEPHANT", "MAMMOTH", "WHALE", "CAT", "DEER", "ZEBRA", "HIPPOPOTAMUS", "KOALA", "CAPYBARA", "SLOTH", "GIANT PANDA", "CHICKEN", "MOUSE", "RABBIT", "OSTRICH", "PUMA", "LEOPARD", "PANTHER", "JAGUAR", "CHAMELEON (?)", "IGUANA", "ALLIGATOR", "CROCODILE", "MONGOOSE", "HYENA", "JACKAL", "TASMANIAN DEVIL", "SPIDER", "TARANTULA", "CENTIPEDE (?)", "SCORPION", "FLYING SQUIRREL", "BAT", "FLYING FOX", "NIGHT OWL (?)" ];

export const SIGLAS_NIVEL = [ "VE", "EZ", "NM", "HD", "EX" ];

export function strcode(t) {
  let id = 0;
  for (const c of (new TextEncoder).encode(t || "")) id = (id << 5 | id >> 11) + c & 65535;
  return id;
}

const lw = (m, i) => {
  const o = i * 2, v = m[o] | m[o + 1] << 8;
  return v & 32768 ? v - 65536 : v;
};

const sw = (m, i, v) => {
  const o = i * 2;
  v |= 0;
  m[o] = v & 255;
  m[o + 1] = v >> 8 & 255;
};

const esparcir = (m, n) => {
  const r = [];
  for (let i = 0; i < n; i++) if (m[i]) r.push([ i, m[i] ]);
  return r;
};

function juntar(lista, m) {
  m.fill(0);
  for (const x of lista || []) if (Array.isArray(x) && x[0] >= 0 && x[0] < m.length) m[x[0]] = x[1] & 255;
  return m;
}

function copiaVars(v) {
  const c = new VarsGCL;
  c.g.set(v.g);
  c.l.set(v.l);
  return c;
}

const AUX = new VarsGCL;

const varEn = (g, l, n) => {
  AUX.g = g;
  AUX.l = l;
  return AUX.get(n);
};

const ponerEn = (g, l, n, x) => {
  AUX.g = g;
  AUX.l = l;
  const q = AUX.parse(n);
  if (q && q.off < AUX[q.mem].length) AUX.set(n, x);
};

const num = (v, d = 0) => Array.isArray(v) && typeof v[0] === "number" ? v[0] : typeof v === "number" ? v : d;

const reloj2 = s => `${String(Math.min(99, Math.floor(s / 3600))).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}`;

export const claveItem = (b, i, p) => `${b | 0}:${i | 0}:${(p || []).slice(0, 3).map(x => x | 0).join(",")}`;

export const claveActor = a => claveItem(num(a?.opts?.b, 0), num(a?.opts?.i, 0), a?.p || a?.opts?.p);

export const nombreArea = idx => idx > 0 && idx <= AREAS.length ? AREAS[idx - 1] : "NO PLACE";

const ENLACE = (() => {
  const E = [ [ LV.VitalityMax, i => i.vidaMax, (i, v) => {
    i.vidaMax = v;
  } ], [ LV.Vitality, i => Math.round(i.getVida()), (i, v) => i.setVida(v) ], [ LV.StatusEvent, (i, l) => l & ~1 | (i.resfriado ? 1 : 0), (i, v) => {
    i.resfriado = !!(v & 1);
  } ], [ LV.Weapon, i => i.arma, (i, v) => {
    i.arma = v;
  } ], [ LV.Item, i => i.item, (i, v) => {
    i.item = v;
  } ] ];
  for (let k = 0; k < 10; k++) {
    E.push([ LV.Weapons + k, i => i.armas[k], (i, v) => {
      i.armas[k] = v;
    } ]);
    E.push([ LV.WeaponsMax + k, i => i.armasMax[k], (i, v) => {
      i.armasMax[k] = v;
    } ]);
  }
  for (let k = 0; k < 24; k++) E.push([ LV.Items + k, i => i.items[k], (i, v) => {
    i.items[k] = v;
  } ]);
  for (let k = 0; k < 3; k++) E.push([ LV.ItemsMax + k, i => i.itemsMax[k], (i, v) => {
    i.itemsMax[k] = v;
  } ]);
  E.push([ LV.EnvironTemp, i => i.ambiente | 0, (i, v) => {
    i.ambiente = v;
  } ]);
  E.push([ LV.ShapeKeyState, i => i.palEstado | 0, (i, v) => {
    i.palEstado = v;
  } ]);
  E.push([ LV.ShapeKeyTemp, i => i.palTemp | 0, (i, v) => {
    i.palTemp = v;
  } ]);
  E.push([ 67, i => i.palMax | 0, (i, v) => {
    i.palMax = v || 9e3;
  } ]);
  E.push([ 68, i => i.palMin | 0, (i, v) => {
    i.palMin = v || -9e3;
  } ]);
  E.push([ LV.FrozenItemsState, i => i.congeladas ? 1 : 0, (i, v) => {
    i.congeladas = !!v;
  } ]);
  E.push([ LV.FrozenItemsTemp, i => i.racionTemp | 0, (i, v) => {
    i.racionTemp = v;
  } ]);
  E.push([ LV.TranquilizerTimer, i => i.diazepam | 0, (i, v) => {
    i.diazepam = v;
  } ]);
  E.push([ LV.RationUseCount, i => i.usoRaciones | 0, (i, v) => {
    i.usoRaciones = v;
  } ]);
  E.push([ LV.PlayerStance, (i, l) => i.postura ? i.postura() : l, () => {} ]);
  return E;
})();

class Ensayo extends Guion {
  constructor(datos, vars, partida, {transito: transito = false} = {}) {
    super({
      vars: vars,
      memoria: MEMORIA_MUDA,
      base: ""
    });
    this.script = datos;
    this.st = datos.st;
    this.partida = partida;
    this.transito = transito;
    this.demos = [];
    this.varsaves = [];
  }
  correr() {
    const foto = () => ({
      g: this.vars.g.slice(0, G_BYTES),
      l: this.vars.l.slice(0, L_BYTES)
    });
    let antes = null, real = null, pasoReal = 0, salvar = false, llamada = false;
    for (let pasada = 0; pasada < 6; pasada++) {
      antes = foto();
      Object.assign(this, {
        pasada: pasada,
        creados: [],
        snake: null,
        carga: null,
        reinicio: null,
        fin: false,
        prof: 0,
        hechos: new Set,
        llamadaPend: null
      });
      try {
        this.bloque(this.script.main, [], "main");
      } catch (e) {
        console.warn("partida: ensayo de", this.st, e);
      }
      if (!this.transito && !this.carga && !this.reinicio && this.llamadaPend && !llamada) {
        llamada = true;
        real = antes;
        pasoReal = pasada;
        this.fin = false;
        try {
          this.proc(this.llamadaPend.p, this.llamadaPend.args, "radio");
        } catch (e) {
          console.warn(e);
        }
      }
      if (this.carga || !this.reinicio) break;
      if (this.reinicio.s && !llamada) salvar = true;
    }
    if (!real && this.pasada > 0) {
      real = antes;
      pasoReal = this.pasada;
    }
    if (this.carga && !llamada) {
      real = foto();
      pasoReal = this.pasada + 1;
    }
    return {
      pasadas: this.pasada + 1,
      items: this.creados,
      snake: this.snake,
      carga: llamada ? null : this.carga,
      demos: this.demos,
      real: real,
      salvar: salvar,
      llamada: llamada,
      varsaves: this.varsaves.filter(v => v.pasada < pasoReal)
    };
  }
  comando(s, args, ctx) {
    switch (s.cmd) {
     case "item":
      this.creados.push({
        k: s.k,
        p: (this.script.items?.[s.k]?.p || []).map(x => this.v(x, args))
      });
      return null;

     case "snake":
      if (!this.snake) this.snake = {
        p: (s.p || []).map(x => this.v(x, args)),
        d: (s.d || []).map(x => this.v(x, args)),
        postura: this.vars.get("$w:L0020")
      };
      return null;

     case "demo":
      this.demos.push({
        st: this.st,
        sector: s.s != null ? this.v(s.s, args) : null,
        pasada: this.pasada
      });
      if (s.p != null) this.proc(this.v(s.p, args), [], "demo");
      return this.fin ? "fin" : null;

     case "radiop":
      {
        if (!s.c || s.p == null) return null;
        const [freq, , t] = s.c.map(x => this.v(x, args)), a = [ t < 0 ? 2 : 1, freq ];
        if (this.transito) {
          this.proc(this.v(s.p, args), a, "radio");
          return this.fin ? "fin" : null;
        }
        this.llamadaPend ||= {
          p: this.v(s.p, args),
          args: a
        };
        return null;
      }

     case "delay":
      {
        if (this.hechos.has(s) || !(this.transito ? s.carga || s.items : s.items)) return null;
        this.hechos.add(s);
        if (s.bloque) this.bloque(s.bloque, args, "delay"); else if (s.proc != null) this.proc(s.proc, [], "delay");
        return this.fin ? "fin" : null;
      }

     case "load":
      {
        const o = {};
        for (const k of [ "m", "p", "s" ]) if (s[k]) o[k] = s[k].map(x => this.v(x, args));
        if (s.n) o.n = true;
        this.carga = {
          st: s.st || null,
          opts: o
        };
        this.fin = true;
        return "fin";
      }

     case "restart":
      this.reinicio = {
        s: !!s.s
      };
      this.fin = true;
      return "fin";

     case "varsave":
      if (this.transito) this.partida._varsave(s.a ? null : (s.vars || []).map(x => x.var)); else this.varsaves.push({
        pasada: this.pasada,
        todo: !!s.a,
        vals: (s.vars || []).map(x => [ x.var, this.vars.get(x.var) ])
      });
      return null;

     case "func":
      {
        const o = this.opciones(s);
        this.vars.resultado = o.a ? this.partida.historialArea(this.v(o.a[0], args)) : 0;
        return null;
      }

     case "if":
     case "eval":
     case "return":
     case "foreach":
     case "rand":
      return super.comando(s, args, ctx);

     default:
      return null;
    }
  }
}

function engancharGuion(g) {
  if (g.__partida) return;
  g.__partida = true;
  const cargar = g.op.cargar;
  g.op.cargar = (st, o) => {
    g[ENGANCHE]?.alPedirCarga(st, o);
    return cargar?.(st, o);
  };
  const comando = g.comando;
  g.comando = function(s, args, ctx) {
    const p = this[ENGANCHE];
    if (p && s.cmd === "varsave") {
      const a = s.args || [];
      if (a.some(x => x && x.opt === "a")) p._checkpoint(p.st); else p._varsave(a.filter(x => x && x.var).map(x => x.var));
    }
    if (p && s.cmd === "func") {
      const o = this.opciones(s);
      if (o.a) {
        this.vars.resultado = p.historialArea(this.v(o.a[0], args));
        return null;
      }
    }
    return comando.call(this, s, args, ctx);
  };
}

function engancharCodec(c) {
  if (c.__partida) return;
  c.__partida = true;
  const previo = c.op.alGuardar;
  c.op.alGuardar = d => {
    const r = previo?.(d);
    if (r && typeof r === "object") d = r;
    const p = c[ENGANCHE];
    return p ? p.paraCodec(d) : d;
  };
}

export class Partida {
  constructor(op = {}) {
    this.op = op;
    this.vars = new VarsGCL;
    this.punto = {
      g: new Uint8Array(G_BYTES),
      l: new Uint8Array(L_BYTES),
      st: null
    };
    this.st = null;
    this.frames = 0;
    this.historial = new Array(HISTORIAL).fill(0);
    this.memoria = {
      lista: [],
      actual: 0
    };
    this.visor = {};
    this.sinMarca = {};
    this.ensayo = null;
    this.registro = [];
    this.guion = null;
    this.inventario = null;
    this.codec = null;
    this._pend = null;
    this._salvar = false;
    this._datos = new Map;
    this._sombra = null;
    this._acum = 0;
  }
  log(t) {
    this.registro.push({
      t: Math.round(this.frames),
      texto: t
    });
    if (this.registro.length > 200) this.registro.shift();
    this.op.registro?.(t);
  }
  getL(i) {
    return lw(this.vars.l, i);
  }
  get conGuionVivo() {
    return typeof this.guion?.alTomarItem === "function" && typeof this.guion?.eventoActor === "function";
  }
  setL(i, v) {
    sw(this.vars.l, i, v);
  }
  sumar(i, n = 1) {
    this.setL(i, this.getL(i) + n);
  }
  get dificultad() {
    return this.getL(LV.GameLevel) + 1;
  }
  get progreso() {
    return this.vars.get("$w:G000a");
  }
  get areaIdx() {
    return this.vars.get("$b:G00aa");
  }
  get segundos() {
    return Math.floor(this.frames / 60);
  }
  get guardados() {
    return this.getL(LV.SaveCount);
  }
  get continues() {
    return this.getL(LV.ContinueCount);
  }
  rango() {
    const alertas = this.getL(LV.EnemyWatchCount), muertes = this.getL(LV.EnemyKillCount), raciones = this.getL(LV.RationUseCount);
    const conts = this.getL(LV.ContinueCount), guard = this.getL(LV.SaveCount), seg = this.segundos, horas = Math.floor(seg / 3600);
    const off = Math.max(0, Math.min(3, this.dificultad - 1));
    let g;
    if (conts === 0 && alertas < 5 && muertes <= 25 && raciones <= 1 && horas < 3) g = 0; else if (seg < 9e3) g = 4; else if (muertes >= 250) g = 8; else if (horas >= 18 && raciones >= 130 && guard >= 80) g = 24; else if (raciones >= 130) g = 12; else if (guard >= 80) g = 16; else if (horas >= 18) g = 20; else {
      const r = muertes <= 25 ? 1e3 : Math.floor(alertas * 10 / (muertes - 25));
      if (alertas < 31) g = r < 9 ? 28 : r < 17 ? 36 : 40; else if (alertas < 56) g = r < 5 ? 32 : r < 21 ? 36 : 44; else g = r < 9 ? 32 : r < 17 ? 36 : 44;
    }
    return {
      nombre: RANGOS[g + off],
      indice: g + off,
      alertas: alertas,
      muertes: muertes,
      raciones: raciones,
      continues: conts,
      guardados: guard,
      segundos: seg
    };
  }
  entradaDeVars() {
    return {
      p: [ this.getL(LV.PlayerPosX), this.getL(LV.PlayerPosY), this.getL(LV.PlayerPosZ) ],
      rot: this.vars.get("$w:G0002")
    };
  }
  historialArea(h) {
    h &= 65535;
    for (let i = 1; i < HISTORIAL; i++) if ((this.historial[i] & 65535) === h) return i;
    return HISTORIAL;
  }
  resumen() {
    return Partida.resumenDe(this.datos());
  }
  static async nueva(dificultad = 2, op = {}) {
    const p = new Partida(op);
    const d = await p._json("nueva");
    if (!d?.niveles) throw new Error("partida: falta assets/partida/nueva.json (python tools/partida_items.py)");
    const e = d.niveles[String(Math.max(-1, Math.min(3, (dificultad | 0) - 1)))];
    juntar(e.g, p.vars.g);
    juntar(e.l, p.vars.l);
    const mf = (dificultad | 0) === 0 ? (await integral.listo)?.muy_facil?.vars : null;
    if (mf) for (const [k, v] of Object.entries(mf)) p.vars.set(k, v);
    p.historial = [ ...d.historial, ...new Array(HISTORIAL).fill(0) ].slice(0, HISTORIAL);
    p.st = d.st;
    p._pend = {
      tipo: "nueva",
      st: d.st
    };
    p._salvar = true;
    p.log(`partida nueva, dificultad ${SIGLAS_NIVEL[p.dificultad]}, entra a ${d.st}`);
    return p;
  }
  static cargar(fuente, op = {}) {
    const d = fuente && typeof fuente === "object" ? Partida.validar(fuente) : Partida.leerRanura(fuente);
    return d ? Partida.desdeDatos(d, op) : null;
  }
  static desdeDatos(d0, op = {}) {
    const d = Partida.validar(d0);
    const p = new Partida(op);
    juntar(d.punto.g, p.punto.g);
    juntar(d.punto.l, p.punto.l);
    p.punto.st = d.punto.st;
    p.vars.g.set(p.punto.g);
    p.vars.l.set(p.punto.l);
    p.frames = +d.frames || 0;
    p.historial = [ ...d.historial || [], ...new Array(HISTORIAL).fill(0) ].slice(0, HISTORIAL);
    p.memoria = {
      lista: (d.memoria?.lista || []).map(c => ({
        freq: c.freq,
        nombre: c.nombre
      })),
      actual: d.memoria?.actual | 0
    };
    p.visor = {
      ...d.visor || {}
    };
    p.sinMarca = d.visor?.sinMarca || {};
    p.st = d.punto.st;
    p._pend = {
      tipo: "cargar",
      st: p.st
    };
    p.log(`partida cargada: ${p.st}, ${reloj2(p.segundos)}, guardados ${lw(p.punto.l, LV.SaveCount)}`);
    return p;
  }
  conectar({guion: guion = null, inventario: inventario = null, codec: codec = null} = {}) {
    if (guion) {
      guion.vars.g.set(this.vars.g.subarray(0, guion.vars.g.length));
      guion.vars.l.set(this.vars.l.subarray(0, guion.vars.l.length));
      this.vars = guion.vars;
      this.guion = guion;
      engancharGuion(guion);
      guion[ENGANCHE] = this;
      if (guion.memoria) {
        guion.memoria.lista = this.memoria.lista.map(c => ({
          ...c
        }));
        guion.memoria.actual = this.memoria.actual;
        guion.memoria.guardar?.();
      }
    }
    if (codec) {
      this.codec = codec;
      engancharCodec(codec);
      codec[ENGANCHE] = this;
    }
    if (inventario) this.aplicarInventario(inventario);
    return this;
  }
  desconectar() {
    if (this.guion?.[ENGANCHE] === this) this.guion[ENGANCHE] = null;
    if (this.codec?.[ENGANCHE] === this) this.codec[ENGANCHE] = null;
  }
  alPedirCarga(st, o = {}) {
    o = o || {};
    if (!st || o.recarga) this._pend = {
      tipo: "recarga",
      st: this.st
    }; else if (o.reinicio) this._pend = {
      tipo: "carga",
      st: st,
      opts: {
        n: true
      }
    }; else {
      const ya = "desde" in o || typeof o.n === "boolean";
      this._pend = {
        tipo: "carga",
        st: st,
        ya: ya,
        opts: ya ? {
          m: o.m != null ? [ o.m ] : [],
          ...o.n ? {
            n: true
          } : {}
        } : o
      };
    }
    this.log(`load ${st || "(misma área)"} ${Object.keys(o).filter(k => k !== "origen").map(k => "-" + k).join(" ")}`);
  }
  alSalirEscenario() {
    this._cargaDiferida();
    this.sincronizar();
  }
  async alEntrarEscenario(st, entrada = null) {
    this.sincronizar();
    const pend = this._pend;
    this._pend = null;
    const tipo = pend?.tipo || "salida";
    const r = {
      st: st,
      tipo: tipo,
      entrada: null,
      items: null,
      demos: [],
      carga: null,
      punto: false,
      avisos: []
    };
    if (tipo === "carga" || tipo === "salida") {
      let actual;
      if (tipo === "carga") {
        this._loadCmd(pend.st, pend.opts, pend.ya);
        actual = pend.st;
      } else {
        actual = entrada?.via || st;
        const ya = (this.getL(LV.SaveArea) & 65535) === strcode(actual);
        if (!ya) {
          this._contadorArea();
          if (entrada?.p?.length >= 3) for (let i = 0; i < 3; i++) this.setL(LV.PlayerPosX + i, entrada.p[i]);
          if (entrada?.rot != null) this.vars.set("$w:G0002", entrada.rot);
        }
        this._loadCmd(actual, {
          m: entrada?.m != null ? [ entrada.m ] : []
        }, ya);
      }
      for (let n = 0; actual !== st && n < 6; n++) {
        const d = await this._json(actual);
        if (!d) {
          r.avisos.push(`sin datos de ${actual}`);
          break;
        }
        const t = new Ensayo(d, this.vars, this, {
          transito: true
        }).correr();
        r.demos.push(...t.demos);
        if (!t.carga?.st) {
          r.avisos.push(`${actual} no carga otro escenario`);
          break;
        }
        this._loadCmd(t.carga.st, t.carga.opts);
        actual = t.carga.st;
      }
      if (actual !== st) {
        r.avisos.push(`el script iba a ${actual} y el visor entró a ${st}`);
        this._loadCmd(st, {});
      }
    }
    this.st = st;
    if (this._salvar) {
      this._salvar = false;
      this._checkpoint(st);
      r.punto = true;
    }
    const d = await this._json(st);
    this.ensayo = null;
    if (d) {
      const e = new Ensayo(d, copiaVars(this.vars), this).correr();
      if (e.real && !this.conGuionVivo) {
        this.vars.g.set(e.real.g);
        this.vars.l.set(e.real.l);
        for (const v of e.varsaves) {
          if (v.todo) this._checkpoint(st); else for (const [n, x] of v.vals) this._varsaveValor(n, x);
        }
        if (e.salvar) {
          this._checkpoint(st);
          r.punto = true;
        }
      }
      r.llamada = e.llamada;
      if (e.carga?.st) {
        r.carga = e.carga;
        if (!this.conGuionVivo) this._pend = {
          tipo: "carga",
          st: e.carga.st,
          opts: e.carga.opts
        };
      }
      this.ensayo = {
        st: st,
        datos: d,
        creados: e.items.map(c => {
          const it = d.items[c.k];
          return {
            k: c.k,
            p: c.p,
            clave: claveItem(it.b, it.i, c.p)
          };
        })
      };
      r.items = this.ensayo.creados.map(c => c.clave);
      if (e.snake?.p?.length >= 3) r.entrada = {
        p: e.snake.p.slice(0, 3),
        rot: e.snake.d?.[1] ?? 0,
        postura: e.snake.postura ?? 0
      };
      r.demos.push(...e.demos);
      if (d.area) this.visor.area = d.area;
    } else r.avisos.push(`sin datos de partida para ${st}`);
    if (r.avisos.length) this.log("aviso: " + r.avisos.join("; "));
    this.log(`entra a ${st} (${tipo}) progreso ${this.progreso}, ${r.items ? r.items.length + " ítems" : "ítems del disco"}${r.punto ? ", punto de regreso" : ""}`);
    if (this.op.autoGuardar !== false && r.punto) this.guardarAuto();
    return r;
  }
  filtrarActores(st, actores, {agregar: agregar = true} = {}) {
    const base = actores.filter(a => !a.evento);
    const ens = this.ensayo;
    if (!ens || ens.st !== st) return base;
    const r = base.filter(a => a.tipo !== "ITEM"), libres = actores.filter(a => a.tipo === "ITEM"), usados = new Set;
    const quitar = new Set(this.op.recordarSinMarca ? this.sinMarca[st] || [] : []);
    for (const c of ens.creados) {
      if (quitar.has(c.clave)) continue;
      let a = libres.find(x => !usados.has(x) && !x.evento && claveActor(x) === c.clave) || (agregar ? libres.find(x => !usados.has(x) && claveActor(x) === c.clave) : null);
      if (!a && !agregar) continue;
      if (!a) {
        const it = ens.datos.items[c.k], modelo = libres.find(x => num(x.opts?.b, 0) === it.b && x.modelo)?.modelo || null;
        a = {
          tipo: "ITEM",
          nombre: it.nombre,
          p: c.p,
          opts: {
            p: c.p,
            h: [ it.h ],
            b: [ it.b ],
            i: [ it.i ],
            n: [ it.n ],
            m: [ it.m ]
          },
          modelo: modelo,
          item: it.m,
          ctx: "partida"
        };
      }
      usados.add(a);
      a._partida = {
        k: c.k,
        clave: c.clave
      };
      r.push(a);
    }
    for (const a of libres) a.evento = !usados.has(a);
    return r;
  }
  alTomarItem(st, actor) {
    const ens = this.ensayo;
    if (!ens || ens.st !== st) return false;
    const clave = actor?._partida?.clave || claveActor(actor);
    const k = actor?._partida?.k ?? ens.creados.find(c => c.clave === clave)?.k;
    const it = k != null ? ens.datos.items[k] : null;
    if (!it) return false;
    if (it.clase === "sin_marca" && this.op.recordarSinMarca) (this.sinMarca[st] ||= []).push(clave);
    if (it.x || it.e != null) {
      const g = this.guion;
      if (typeof g?.alTomarItem === "function" && g.st === st && g.alTomarItem(actor)) {} else if (g && g.st === st && g.script) {
        if (it.x) g.ejecutar(() => g.bloque(it.x, [], "item")); else g.correrProc(it.e);
      } else {
        const g2 = new Guion({
          vars: this.vars,
          memoria: MEMORIA_MUDA,
          base: ""
        });
        g2.script = {
          main: [],
          procs: ens.datos.procs_item || {}
        };
        g2.ejecutar(() => it.x ? g2.bloque(it.x, [], "item") : g2.proc(it.e, [], "item"));
      }
    }
    this.log(`levantó ${it.m} (${it.clase}${it.var ? " " + it.var + " = " + this.vars.get(it.var) : ""})`);
    return true;
  }
  tick(dt) {
    if (!(dt > 0)) return;
    this.frames += dt * 60;
    this._reloj();
    if ((this._acum += dt) >= .5) {
      this._acum = 0;
      this.sincronizar();
    }
  }
  continuar() {
    const g = this.guion;
    if (g?.procSistema?.c) {
      try {
        g.correrProc(g.procSistema.c, [ 0 ]);
      } catch (e) {
        console.warn(e);
      }
    }
    const cont = this.getL(LV.ContinueCount);
    this.vars.l.set(this.punto.l.subarray(0, L_RESTAURA), 0);
    this.vars.g.set(this.punto.g, 0);
    this._setArea(strcode(this.punto.st));
    this.setL(LV.ContinueCount, cont + 1);
    const b = this.getL(LV.Items + IT_TIMERBOMB) & 65535;
    if (b >= 1 && b <= 9) this.setL(LV.Items + IT_TIMERBOMB, 10);
    this.st = this.punto.st;
    this._pend = {
      tipo: "continuar",
      st: this.punto.st
    };
    if (this.inventario) this.aplicarInventario();
    this.log(`CONTINUE ${this.continues}: vuelve a ${this.punto.st}`);
    if (this.op.autoGuardar !== false) this.guardarAuto();
    return {
      st: this.punto.st,
      entrada: this.entradaDeVars()
    };
  }
  guardar(ranura, extra = {}) {
    const d = this.paraGuardar(extra);
    const ok = Partida.escribirRanura(ranura, d);
    this.log(`guardado en ${ranura}: ${ok ? "ok" : "FALLÓ"}`);
    return ok ? d : null;
  }
  paraGuardar(extra = {}) {
    this.sincronizar();
    this._reloj();
    this.setL(LV.SaveCount, this.getL(LV.SaveCount) + 1);
    this.setL(LV.LastSaveHours, this.getL(LV.PlayTimeHours));
    this.setL(LV.LastSaveSeconds, this.getL(LV.PlayTimeSeconds));
    for (const i of [ LV.LastSaveHours, LV.LastSaveSeconds, LV.SaveCount ]) sw(this.punto.l, i, this.getL(i));
    return this.datos(extra);
  }
  paraCodec(dc = {}) {
    return {
      ...this.paraGuardar({
        area: dc.area,
        areaIdx: dc.areaIdx
      }),
      freq: dc.freq
    };
  }
  guardarAuto() {
    return Partida.escribirRanura(RANURA_AUTO, this.datos({
      auto: true
    }));
  }
  datos(extra = {}) {
    const P = this.punto, l = P.l.slice();
    if (extra.auto) l.set(this.vars.l.subarray(L_RESTAURA, L_BYTES), L_RESTAURA);
    const pl = i => lw(l, i), mem = this.guion?.memoria || this.memoria;
    const areaIdx = extra.areaIdx ?? this.visor.area ?? varEn(P.g, l, "$b:G00aa");
    const d = {
      formato: FORMATO,
      version: VERSION,
      fecha: (new Date).toISOString(),
      area: extra.area || nombreArea(areaIdx),
      areaIdx: areaIdx,
      st: P.st,
      dificultad: pl(LV.GameLevel) + 1,
      segundos: Math.floor(this.frames / 60),
      progreso: varEn(P.g, l, "$w:G000a"),
      guardados: pl(LV.SaveCount),
      continues: pl(LV.ContinueCount),
      frames: Math.round(this.frames),
      historial: this.historial.slice(),
      memoria: {
        lista: (mem.lista || []).map(c => ({
          freq: c.freq,
          nombre: c.nombre
        })),
        actual: mem.actual | 0
      },
      punto: {
        st: P.st,
        g: esparcir(P.g, G_BYTES),
        l: esparcir(l, L_BYTES)
      },
      visor: {
        ...this.visor,
        bomba: this.inventario?.bomba ?? this.visor.bomba ?? 0,
        ...this.op.recordarSinMarca ? {
          sinMarca: this.sinMarca
        } : {}
      }
    };
    if (extra.auto) d.auto = true;
    return d;
  }
  aplicarInventario(inv = this.inventario) {
    if (!inv) return;
    this.inventario = inv;
    inv.dificultad = this.dificultad;
    const nh = this.vars.get("$w:G0044");
    if (nh > 0) inv.nivelHistoria = Math.min(9, nh);
    const L = this.vars.l;
    for (const [i, , escribir] of ENLACE) escribir(inv, lw(L, i));
    this._sombra = new Int32Array(96);
    for (const [i] of ENLACE) this._sombra[i] = lw(L, i);
    if (inv.arma >= 0) inv.lados[1].ultimo = inv.arma;
    if (inv.item >= 0) inv.lados[0].ultimo = inv.item;
    if (this.visor.bomba != null) inv.bomba = this.visor.bomba;
  }
  sincronizar() {
    const inv = this.inventario;
    if (!inv) return;
    if (!this._sombra) {
      this.aplicarInventario(inv);
      return;
    }
    const L = this.vars.l, S = this._sombra;
    for (const [i, leer, escribir] of ENLACE) {
      const l = lw(L, i);
      if (l !== S[i]) {
        escribir(inv, l);
        S[i] = l;
      } else {
        const v = leer(inv, l) | 0;
        if (v !== l) {
          sw(L, i, v);
          S[i] = lw(L, i);
        }
      }
    }
    this.visor.bomba = inv.bomba | 0;
  }
  async _json(st) {
    if (!this._datos.has(st)) this._datos.set(st, fetch(`${this.op.base || BASE}${st}.json`).then(r => r.ok ? r.json() : null).catch(() => null));
    return this._datos.get(st);
  }
  _reloj() {
    const s = Math.floor(this.frames / 60);
    this.setL(LV.PlayTimeHours, Math.floor(s / 3600));
    this.setL(LV.PlayTimeSeconds, s % 3600);
  }
  _setArea(h) {
    for (let i = HISTORIAL - 1; i > 0; i--) this.historial[i] = this.historial[i - 1];
    this.historial[0] = h & 65535;
  }
  _contadorArea() {
    this.vars.set("$b:G0000", (this.vars.get("$b:G0000") + 1 | 128) & 255);
  }
  _loadCmd(st, o = {}, ya = false) {
    if (!st) return;
    const h = strcode(st);
    this._setArea(h);
    if (!ya) {
      this.setL(LV.PrevArea, this.getL(LV.SaveArea));
      this.setL(LV.SaveArea, h);
      if (typeof o.m?.[0] === "number") this.setL(LV.SaveMap, o.m[0]);
      if (Array.isArray(o.p) && o.p.length >= 3 && o.p.slice(0, 3).every(x => typeof x === "number")) for (let i = 0; i < 3; i++) this.setL(LV.PlayerPosX + i, o.p[i]);
    }
    if (!("n" in o) || o.n === false) this._salvar = true;
    this.st = st;
  }
  _checkpoint(st) {
    this.punto.g.set(this.vars.g.subarray(0, G_BYTES));
    this.punto.l.set(this.vars.l.subarray(0, L_BYTES));
    this.punto.st = st || this.st;
    this.log(`punto de regreso en ${this.punto.st}`);
  }
  _varsave(nombres) {
    if (!nombres) {
      this._checkpoint(this.st);
      return;
    }
    for (const n of nombres) this._varsaveValor(n, this.vars.get(n));
  }
  _varsaveValor(n, x) {
    ponerEn(this.punto.g, this.punto.l, n, x);
  }
  _cargaDiferida() {
    const g = this.guion;
    if (this._pend || !g?.cola?.length || !g.script) return;
    const lleva = (b, vistos) => (b || []).some(s => {
      if (s.cmd === "load") return true;
      if ("call" in s) {
        const k = (s.call & 65535).toString(16).padStart(4, "0");
        if (vistos.has(k)) return false;
        vistos.add(k);
        return lleva(g.script.procs?.[k], vistos);
      }
      return (s.args || []).some(a => a?.bloque && lleva(a.bloque, vistos) || a?.opt && a.v.some(v => v?.bloque && lleva(v.bloque, vistos)));
    });
    const c = g.cola.filter(x => x.k === "proc" ? lleva([ {
      call: x.o,
      args: []
    } ], new Set) : lleva(x.o, new Set)).sort((a, b) => a.t - b.t || a.n - b.n)[0];
    if (!c) return;
    g.cola.splice(g.cola.indexOf(c), 1);
    const f = () => c.k === "proc" ? g.proc(c.o, c.a || [], "delay") : g.bloque(c.o, c.a || [], "delay");
    if (g.ejecutarDesde) g.ejecutarDesde({
      tipo: "delay",
      desde: c.origen || null
    }, f); else g.ejecutar(f);
  }
  static validar(d) {
    if (!d || typeof d !== "object") throw new Error("no es una partida");
    if (d.formato === FORMATO && d.punto && Array.isArray(d.punto.g) && Array.isArray(d.punto.l) && d.punto.st) return d;
    if (d.version === 1 && d.vars && d.st) {
      return {
        formato: FORMATO,
        version: VERSION,
        fecha: d.fecha,
        area: d.area,
        areaIdx: d.areaIdx,
        st: d.st,
        frames: 0,
        historial: [ strcode(d.st) ],
        memoria: {
          lista: d.memoria || [],
          actual: 0
        },
        punto: {
          st: d.st,
          g: d.vars.g || [],
          l: d.vars.l || []
        },
        visor: {},
        convertido: true
      };
    }
    throw new Error("no es una partida de MGS (formato desconocido)");
  }
  static leerRanura(r) {
    try {
      const t = localStorage.getItem(claveRanura(r));
      return t ? Partida.validar(JSON.parse(t)) : null;
    } catch {
      return null;
    }
  }
  static escribirRanura(r, d) {
    try {
      localStorage.setItem(claveRanura(r), JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  }
  static listar() {
    return [ ...Array.from({
      length: RANURAS
    }, (_, i) => i), RANURA_AUTO ].map(ranura => {
      const datos = Partida.leerRanura(ranura);
      return {
        ranura: ranura,
        datos: datos,
        resumen: datos ? Partida.resumenDe(datos) : null
      };
    });
  }
  static resumenDe(d) {
    const l = juntar(d.punto?.l, new Uint8Array(L_BYTES));
    const dif = d.dificultad ?? lw(l, LV.GameLevel) + 1, seg = d.segundos ?? Math.floor((d.frames || 0) / 60);
    return {
      st: d.punto?.st || d.st,
      area: String(d.area || nombreArea(d.areaIdx)).toUpperCase(),
      dificultad: dif,
      siglas: SIGLAS_NIVEL[Math.max(0, Math.min(4, dif))],
      tiempo: reloj2(seg),
      segundos: seg,
      guardados: d.guardados ?? lw(l, LV.SaveCount),
      continues: d.continues ?? lw(l, LV.ContinueCount),
      fecha: d.fecha ? new Date(d.fecha) : null,
      auto: !!d.auto,
      disco: 1
    };
  }
  static exportarTexto(d) {
    return JSON.stringify(Partida.validar(d), null, 1);
  }
  static importarTexto(t) {
    return Partida.validar(JSON.parse(t));
  }
  static async leerArchivo(archivo) {
    return Partida.importarTexto(await archivo.text());
  }
  static descargar(d, nombre = null) {
    const r = Partida.resumenDe(d), f = r.fecha || new Date, dd = n => String(n).padStart(2, "0");
    const n = nombre || `mgs_${r.st}_${r.siglas}_${r.tiempo.replace(":", "h")}_${f.getFullYear()}${dd(f.getMonth() + 1)}${dd(f.getDate())}.json`;
    const texto = Partida.exportarTexto(d);
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    try {
      const f = ios && typeof File === "function" ? new File([ texto ], n, {
        type: "application/json"
      }) : null;
      if (f && navigator.canShare?.({
        files: [ f ]
      })) {
        navigator.share({
          files: [ f ],
          title: n
        }).catch(e => {
          if (e?.name !== "AbortError") Partida._bajarArchivo(texto, n);
        });
        return n;
      }
    } catch {}
    Partida._bajarArchivo(texto, n);
    return n;
  }
  static _bajarArchivo(texto, n) {
    if (window.MGSApp?.guardarArchivo) {
      const bytes = (new TextEncoder).encode(texto);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
      window.MGSApp.guardarArchivo(n, "application/json", btoa(bin));
      return n;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ texto ], {
      type: "application/json"
    }));
    a.download = n;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 2e3);
    return n;
  }
}
