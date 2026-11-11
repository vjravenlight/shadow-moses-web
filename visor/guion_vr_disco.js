// MGS web — FeniXVOID · Project Ravenlight
import { Guion, VarsGCL } from "./codec_gcl.js";

const MEMORIA_MUDA = {
  lista: [],
  guardar() {},
  poner() {},
  marcar() {},
  borrarTodo() {}
};

export class GuionDisco extends Guion {
  constructor(op = {}) {
    super({
      ...op,
      vars: new VarsGCL,
      memoria: MEMORIA_MUDA
    });
  }
  static async cargar(url, vars, op) {
    const g = new GuionDisco(op);
    g.script = await fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!g.script) return null;
    g.charas = g.script.charas || {};
    g.vars.cargar(vars);
    return g;
  }
  atarTrampas(lista) {
    for (const s of lista || []) this.comando(s, [], "main");
  }
  cuadro() {
    this.update(1 / 30);
  }
  correr(pid, args = []) {
    if (pid != null && pid >= 0) this.correrProc(pid, args);
  }
  resolver(o, args) {
    const r = {};
    for (const [k, vs] of Object.entries(o)) r[k] = (vs || []).map(x => x && typeof x === "object" && "proc" in x ? {
      proc: x.proc
    } : this.v(x, args));
    return r;
  }
  comando(s, args, ctx) {
    const a = s.args || [];
    if (s.cmd === "chara") {
      const h = a[0] && a[0].id, tipo = this.charas[(h & 65535).toString(16).padStart(4, "0")] || "chara_" + h;
      const nombre = a[1] ? this.v(a[1], args) : 0;
      this.op.chara?.(tipo, nombre, this.resolver(this.opciones(s), args));
      return null;
    }
    if (s.cmd === "mesg") {
      const vals = a.filter(x => !(x && typeof x === "object" && "opt" in x)).map(x => this.v(x, args));
      this.op.mesg?.(vals[0], vals[1], vals.slice(2));
      return null;
    }
    if (s.cmd === "pad") {
      const o = this.opciones(s);
      if ("r" in o || "s" in o) this.op.pad?.("r" in o);
      return null;
    }
    if (s.cmd === "camera") {
      const o = this.opciones(s), v = (o.s || []).map(x => this.v(x, args));
      if (v.length >= 10) this.op.camara?.(v.slice(4, 7), v.slice(7, 10));
      const c = {};
      for (const [k, vs] of Object.entries(o)) {
        const n = (vs || []).map(x => this.v(x, args)).filter(x => typeof x === "number");
        if (k === "e" || k === "p") c[k] = 1; else if (k === "b" || k === "l") c[k] = n.slice(0, 6); else if (k === "r") c[k] = n.slice(0, 3); else if (k === "t" || k === "a" || k === "c") c[k] = n[0] ?? 0; else if (k === "s" && n.length >= 10) c.s = {
          id: n[0],
          p1: n[1],
          interp: n[2],
          tipo: n[3],
          pos: n.slice(4, 7),
          trg: n.slice(7, 10),
          mask: n[10] ?? 0
        };
      }
      this.op.camaraCmd?.(c);
      return null;
    }
    if (s.cmd === "sound") {
      const o = this.opciones(s), ints = k => (o[k] || []).map(x => this.v(x, args));
      if (o.e && o.e.length >= 3) this.op.se?.(this.v(o.e[2], args));
      const r = {};
      if (o.b) r.b = ints("b").slice(0, 2);
      if (o.s) r.s = ints("s")[0];
      if (o.c) r.c = ints("c")[0];
      if (o.x) r.x = ints("x")[0];
      if ("n" in o) r.n = true;
      if (r.b || r.s != null || r.c != null || r.x != null) this.op.musica?.(r);
      return null;
    }
    if (s.cmd === "menu") {
      const o = this.opciones(s), r = {};
      for (const k in o) r[k] = o[k].map(x => this.v(x, args));
      this.op.menu?.(r);
      return null;
    }
    return super.comando(s, args, ctx);
  }
}
