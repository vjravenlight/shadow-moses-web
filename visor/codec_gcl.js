// MGS web — FeniXVOID · Project Ravenlight
export const HASH = {
  ENTRAR: 3538,
  SALIR: 54732,
  TODO: 5321,
  SNAKE: 8650
};

const FPS = 30;

export class VarsGCL {
  constructor() {
    this.g = new Uint8Array(65536);
    this.l = new Uint8Array(512);
    this._p = new Map;
  }
  cargar(v) {
    this.g.fill(0);
    this.l.fill(0);
    for (const [o, b] of v?.g || []) this.g[o] = b;
    for (const [o, b] of v?.l || []) this.l[o] = b;
  }
  exportar() {
    const sp = m => {
      const r = [];
      for (let i = 0; i < m.length; i++) if (m[i]) r.push([ i, m[i] ]);
      return r;
    };
    return {
      g: sp(this.g),
      l: sp(this.l)
    };
  }
  parse(n) {
    let p = this._p.get(n);
    if (p) return p;
    const m = /^\$(\w):([GL])([0-9a-fA-F]+)(?:\.(\d+))?$/.exec(n);
    p = m ? {
      tipo: m[1],
      mem: m[2] === "L" ? "l" : "g",
      off: parseInt(m[3], 16),
      bit: m[4] !== undefined ? +m[4] : null
    } : null;
    this._p.set(n, p);
    return p;
  }
  get(n) {
    const p = this.parse(n);
    if (!p) return 0;
    const m = this[p.mem], o = p.off;
    switch (p.tipo) {
     case "w":
      {
        const v = m[o] | m[o + 1] << 8;
        return v & 32768 ? v - 65536 : v;
      }

     case "s":
     case "p":
      return m[o] | m[o + 1] << 8;

     case "b":
     case "c":
      return m[o];

     case "f":
      return m[o] >> p.bit & 1;

     case "i":
      return m[o] | m[o + 1] << 8 | m[o + 2] << 16 | m[o + 3] << 24;

     default:
      return 0;
    }
  }
  set(n, v) {
    const p = this.parse(n);
    if (!p) return;
    const m = this[p.mem], o = p.off;
    v = v | 0;
    switch (p.tipo) {
     case "w":
     case "s":
     case "p":
      m[o] = v & 255;
      m[o + 1] = v >> 8 & 255;
      break;

     case "b":
     case "c":
      m[o] = v & 255;
      break;

     case "f":
      if (v) m[o] |= 1 << p.bit; else m[o] &= ~(1 << p.bit) & 255;
      break;

     case "i":
      m[o] = v & 255;
      m[o + 1] = v >> 8 & 255;
      m[o + 2] = v >> 16 & 255;
      m[o + 3] = v >>> 24 & 255;
      break;
    }
  }
  get resultado() {
    return this.get("$w:L000a");
  }
  set resultado(v) {
    this.set("$w:L000a", v);
  }
}

function calc(op, a, b) {
  a = typeof a === "number" ? a | 0 : 0;
  b = typeof b === "number" ? b | 0 : 0;
  switch (op) {
   case 1:
    return -b;

   case 2:
    return b ? 0 : 1;

   case 3:
    return ~b;

   case 4:
    return a + b | 0;

   case 5:
    return a - b | 0;

   case 6:
    return Math.imul(a, b);

   case 7:
    return b ? a / b | 0 : 0;

   case 8:
    return b ? a % b : 0;

   case 9:
    return +(a === b);

   case 10:
    return +(a !== b);

   case 11:
    return +(a < b);

   case 12:
    return +(a <= b);

   case 13:
    return +(a > b);

   case 14:
    return +(a >= b);

   case 15:
    return a | b;

   case 16:
    return a & b;

   case 17:
    return a ^ b;

   case 18:
    return +(!!a || !!b);

   case 19:
    return +(!!a && !!b);

   default:
    return 0;
  }
}

export function valorGCL(vars, v, args = []) {
  if (typeof v === "number") return v | 0;
  if (v == null) return 0;
  if (typeof v === "string") return v;
  if ("var" in v) return vars.get(v.var);
  if ("arg" in v) return v.arg === 0 ? args.length : args[v.arg - 1] ?? 0;
  if ("expr" in v) return exprGCL(vars, v.expr, args);
  if ("id" in v) return v.id;
  if ("proc" in v) return v.proc;
  if ("str" in v) return v.str;
  if ("bloque" in v) return v;
  return 0;
}

export function exprGCL(vars, lista, args = []) {
  const pila = [];
  for (const x of lista) {
    if (x && typeof x === "object" && "op" in x) {
      const op = x.op;
      if (op === 0) return pila.length ? pila[pila.length - 1][0] : 0;
      if (op === 20) {
        const b = pila.pop() || [ 0, null ], a = pila.pop() || [ 0, null ];
        if (a[1]) vars.set(a[1], b[0]);
        pila.push([ b[0], null ]);
        continue;
      }
      const b = pila.length ? pila.pop()[0] : 0, a = pila.length ? pila.pop()[0] : 0;
      pila.push([ calc(op, a, b), null ]);
    } else pila.push([ valorGCL(vars, x, args), x && typeof x === "object" && "var" in x ? x.var : null ]);
  }
  return pila.length ? pila[pila.length - 1][0] : 0;
}

export class MemoriaRadio {
  constructor(clave = "mgs_codec_memoria") {
    this.clave = clave;
    this.lista = [];
    this.actual = 0;
    try {
      const d = JSON.parse(localStorage.getItem(clave) || "null");
      if (d) {
        this.lista = d.lista || [];
        this.actual = d.actual || 0;
      }
    } catch {}
  }
  guardar() {
    try {
      localStorage.setItem(this.clave, JSON.stringify({
        lista: this.lista,
        actual: this.actual
      }));
    } catch {}
  }
  poner(freq, nombre) {
    const i = this.lista.findIndex(c => c.freq === freq);
    if (nombre === "clear") {
      if (i >= 0) this.lista.splice(i, 1);
      this.actual = 0;
    } else if (i >= 0) this.lista[i].nombre = nombre; else if (this.lista.length < 16) this.lista.push({
      freq: freq,
      nombre: nombre
    });
    this.guardar();
  }
  marcar(freq) {
    const i = this.lista.findIndex(c => c.freq === freq);
    if (i >= 0) {
      this.actual = i;
      this.guardar();
    }
  }
  borrarTodo() {
    this.lista = [];
    this.actual = 0;
    this.guardar();
  }
}

class TablaRadio {
  constructor() {
    this.e = Array.from({
      length: 8
    }, () => ({
      freq: 0,
      code: 0
    }));
  }
  limpiar() {
    for (const x of this.e) {
      x.freq = 0;
      x.code = 0;
    }
  }
  buscar(freq) {
    let vacia = -1;
    for (let i = 7; i >= 0; i--) {
      if (this.e[i].freq === freq) return this.e[i];
      if (this.e[i].freq === 0) vacia = i;
    }
    if (vacia < 0) {
      console.warn("RADIO CALL OVER!!");
      return null;
    }
    return this.e[vacia];
  }
  poner(freq, code) {
    const x = this.buscar(freq);
    if (!x) return;
    if (code >= 0) {
      x.freq = freq;
      x.code = code;
    } else {
      x.freq = 0;
      x.code = 0;
    }
  }
  code(freq) {
    const x = this.buscar(freq);
    return x && x.freq === freq ? x.code : -1;
  }
}

export class Guion {
  constructor(op = {}) {
    this.op = op;
    this.vars = op.vars || new VarsGCL;
    this.memoria = op.memoria || new MemoriaRadio;
    this.base = op.base || "assets/codec/";
    this.over = new TablaRadio;
    this.baseT = new TablaRadio;
    this.binds = [];
    this.cola = [];
    this.t = 0;
    this.acum = 0;
    this.orden = 0;
    this.procCallback = -1;
    this.procSistema = {};
    this.gameOverVox = -1;
    this.radioOff = false;
    this.script = null;
    this.st = null;
    this.codec = null;
    this.prof = 0;
    this.reiniciar = false;
  }
  log(...a) {
    this.op.registro?.(a.join(" "));
  }
  async cargarEscenario(st, {usarEstadoDeEntrada: usarEstadoDeEntrada = true} = {}) {
    this.script = null;
    this.st = st;
    try {
      const r = await fetch(`${this.base}st/${st}.json`);
      if (!r.ok) throw new Error(r.status);
      this.script = await r.json();
    } catch (e) {
      this.log("guion: sin script para", st, e.message);
      this.limpiarEscenario();
      return false;
    }
    if (usarEstadoDeEntrada) this.vars.cargar(this.script.vars);
    this.correrMain();
    return true;
  }
  get zonas() {
    return this.script?.zonas || {};
  }
  limpiarEscenario() {
    this.over.limpiar();
    this.baseT.limpiar();
    this.binds = [];
    this.cola = [];
    this.t = 0;
    this.acum = 0;
    this.procSistema = {};
    this.gameOverVox = -1;
    this.radioOff = false;
    this.procCallback = -1;
    this.codec?.resetLlamada?.();
  }
  correrMain() {
    this.limpiarEscenario();
    if (!this.script) return;
    this.ejecutar(() => this.bloque(this.script.main, [], "main"));
  }
  update(dt) {
    this.acum += Math.min(dt, .25) * FPS;
    while (this.acum >= 1) {
      this.acum -= 1;
      this.t++;
      for (;;) {
        let k = -1;
        for (let i = 0; i < this.cola.length; i++) if (this.cola[i].t <= this.t && (k < 0 || this.cola[i].t < this.cola[k].t || this.cola[i].t === this.cola[k].t && this.cola[i].n < this.cola[k].n)) k = i;
        if (k < 0) break;
        const c = this.cola.splice(k, 1)[0];
        this.ejecutar(() => c.k === "proc" ? this.proc(c.o, [], "delay") : this.bloque(c.o, [], "delay"));
      }
    }
  }
  trampa(zona, evento = HASH.ENTRAR, chara = HASH.SNAKE) {
    const lista = this.binds.filter(b => (!b.zona || b.zona === zona) && (!b.chara || b.chara === chara) && (!b.ev || b.ev === evento));
    for (const b of lista) this.ejecutar(() => b.k === "proc" ? this.proc(b.o, [ zona, chara, evento ], "trap") : this.bloque(b.o, [ zona, chara, evento ], "trap"));
    return lista.length;
  }
  correrProc(pid, args = []) {
    this.ejecutar(() => this.proc(pid, args, "externo"));
    return this.vars.resultado;
  }
  gameOver() {
    this.gameOverVox = -1;
    const p = this.procSistema.g;
    if (p) this.ejecutar(() => this.proc(p, [ 0 ], "gameover"));
    return this.gameOverVox;
  }
  codigoDe(freq) {
    const c = this.over.code(freq);
    return c >= 0 ? c : this.baseT.code(freq);
  }
  radioBase(freq, code) {
    this.baseT.poner(freq, code);
  }
  radioOver(freq, code) {
    this.over.poner(freq, code);
  }
  alCerrarCodec(tipo, freq) {
    if (tipo !== 15 && this.procCallback > 0) {
      this.log("códec: callback", this.procCallback.toString(16), tipo & 15, freq);
      this.correrProc(this.procCallback, [ tipo & 15, freq ]);
    }
  }
  ejecutar(f) {
    if (this.prof > 0) {
      f();
      return;
    }
    this.fin = false;
    try {
      f();
    } catch (e) {
      console.error("guion GCL", e);
    }
    this.fin = false;
    if (this.reiniciar && !this.reinicioDiferido) this.hacerReinicio();
  }
  hacerReinicio() {
    this.reiniciar = false;
    this.log("guion: restart");
    this.op.reinicio?.();
    this.correrMain();
  }
  opciones(s) {
    const o = {};
    for (const a of s.args || []) if (a && typeof a === "object" && "opt" in a) o[a.opt] = a.v;
    return o;
  }
  v(x, args) {
    return valorGCL(this.vars, x, args);
  }
  bloque(b, args, ctx) {
    if (!b) return null;
    if (++this.prof > 64) {
      this.prof--;
      return null;
    }
    try {
      for (const s of b) {
        if (this.fin) return "fin";
        if ("call" in s) this.proc(s.call, s.args.map(a => this.v(a, args)), ctx); else if ("eval" in s) exprGCL(this.vars, s.eval, args); else if ("cmd" in s) {
          const r = this.comando(s, args, ctx);
          if (r === "return" || r === "fin") return r;
        }
      }
      return null;
    } finally {
      this.prof--;
    }
  }
  proc(pid, args, ctx) {
    const b = this.script?.procs?.[(pid & 65535).toString(16).padStart(4, "0")];
    if (!b) return null;
    return this.bloque(b, args, `proc_${pid.toString(16)}`);
  }
  comando(s, args, ctx) {
    const c = s.cmd, a = s.args || [], o = this.opciones(s);
    switch (c) {
     case "if":
      {
        let cond = this.v(a[0], args), blk = a[1];
        const resto = a.slice(2);
        for (;;) {
          if (cond) return this.bloque(blk?.bloque, args, ctx);
          const sig = resto.shift();
          if (!sig || !("opt" in sig)) return null;
          if (sig.opt === "e") return this.bloque(sig.v[0]?.bloque, args, ctx);
          if (sig.opt === "i") {
            cond = this.v(sig.v[0], args);
            blk = sig.v[1];
            continue;
          }
          return null;
        }
      }

     case "eval":
      for (const x of a) this.v(x, args);
      return null;

     case "return":
      return "return";

     case "foreach":
      {
        const vals = [];
        let blk = null;
        for (const x of a) {
          if (x && typeof x === "object" && "opt" in x) {
            blk = x.v.find(y => y && y.bloque)?.bloque;
            break;
          }
          vals.push(this.v(x, args));
        }
        if (blk) for (const val of vals) this.bloque(blk, [ val ], ctx);
        return null;
      }

     case "radio":
      return this.cmdRadio(o, args);

     case "trap":
     case "ntrap":
      {
        const h = x => {
          const n = this.v(x, args);
          return n === HASH.TODO ? 0 : n;
        };
        const ej = a.find(x => x && typeof x === "object" && "bloque" in x);
        let k = "b", obj = ej?.bloque;
        if (!obj) for (const x of a) if (x && typeof x === "object" && x.opt) for (const y of x.v) {
          if (y && typeof y === "object") {
            if (y.bloque) obj = y.bloque; else if ("proc" in y) {
              k = "proc";
              obj = y.proc;
            }
          }
        }
        if (obj != null) this.binds.push({
          zona: h(a[0]),
          chara: h(a[1]),
          ev: h(a[2]),
          k: k,
          o: obj
        });
        return null;
      }

     case "delay":
      {
        let t = o.t ? this.v(o.t[0], args) : 0, k = null, obj = null;
        if (o.p) {
          k = "proc";
          obj = this.v(o.p[0], args);
        }
        if (o.e && o.e[0]?.bloque) {
          k = "b";
          obj = o.e[0].bloque;
        }
        if ("g" in o) t = -t;
        if (t && obj != null) this.cola.push({
          t: this.t + Math.abs(t),
          n: ++this.orden,
          k: k,
          o: obj
        });
        return null;
      }

     case "sound":
      {
        if (o.g) this.gameOverVox = this.v(o.g[0], args);
        if (o.v) {
          const id = this.v(o.v[0], args), proc = o.f ? this.v(o.f[0], args) : 0;
          if (this.op.voz) this.op.voz(id, proc); else if (this.codec) this.codec.reproducirVoz(id).then(() => {
            if (proc) this.correrProc(proc);
          });
        }
        const resto = Object.keys(o).filter(k => k !== "g" && k !== "v" && k !== "f");
        if (resto.length) this.op.sonido?.(Object.fromEntries(resto.map(k => [ k, o[k].map(x => this.v(x, args)) ])));
        return null;
      }

     case "system":
      for (const k of "gcawi") if (o[k]) this.procSistema[k] = this.v(o[k][0], args);
      return null;

     case "rand":
      {
        const n = this.v(a[0], args);
        this.vars.resultado = n > 0 ? Math.floor(Math.random() * 32768) % n : 0;
        return null;
      }

     case "func":
      if (o.c) this.vars.resultado = this.codec?.estadoVoz?.() ?? -1; else if (o.s || o.a || o.m || o.v) this.vars.resultado = 0;
      return null;

     case "varsave":
      return null;

     case "restart":
      this.reiniciar = true;
      this.fin = true;
      return "fin";

     case "load":
      {
        const dest = a[0] && a[0].str;
        this.log("guion: load", dest);
        this.op.cargar?.(dest, Object.fromEntries(Object.entries(o).map(([k, v]) => [ k, v.map(x => this.v(x, args)) ])));
        this.fin = true;
        return "fin";
      }

     default:
      return null;
    }
  }
  cmdRadio(o, args) {
    const ints = lista => (lista || []).map(x => this.v(x, args));
    if (o.b) {
      const v = ints(o.b);
      for (let i = 0; i + 1 < v.length; i += 2) this.baseT.poner(v[i], v[i + 1]);
    }
    if (o.o) {
      const v = ints(o.o);
      const salir = v[0] === HASH.SALIR;
      if (v[0] !== HASH.ENTRAR && !salir) console.warn("Wrong Code for radio over");
      for (let i = 1; i + 1 < v.length; i += 2) this.over.poner(v[i], salir ? -1 : v[i + 1]);
    }
    if (o.c) {
      const [f, code, t] = ints(o.c);
      this.log("guion: radio -c", f, code, t);
      this.codec?.llamadaEntrante(f, code, t | 0);
    }
    if (o.p) this.procCallback = ints(o.p)[0];
    if ("r" in o) {
      this.codec?.resetLlamada();
      this.procCallback = -1;
    }
    if (o.m) {
      const f = this.v(o.m[0], args), n = this.v(o.m[1], args);
      this.memoria.poner(f, typeof n === "string" ? n : String(n));
    }
    if ("d" in o) this.radioOff = true;
    if ("e" in o) this.radioOff = false;
    if ("a" in o) {
      this.baseT.limpiar();
      this.over.limpiar();
    }
    return null;
  }
}
