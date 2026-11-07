// MGS web — FeniXVOID · Project Ravenlight
import { Guion, VarsGCL, HASH } from "./codec_gcl.js";

import { blurGuion } from "./blur_guion.js";

const FPS = 30;

let SIN_DISCO2 = false;

fetch("assets/discos.json", {
  cache: "no-cache"
}).then(r => r.ok ? r.json() : null).then(d => {
  SIN_DISCO2 = !!d && d.disco2 === false;
}).catch(() => {});

function avisoDisco2() {
  if (document.getElementById("aviso_disco2")) return;
  const d = document.createElement("div");
  d.id = "aviso_disco2";
  d.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.88);color:#cfe;font:16px/1.5 sans-serif;text-align:center;padding:24px";
  d.innerHTML = "<div><b>PLEASE INSERT DISC 2</b><br><br>Para seguir hace falta el disco 2: abrí INSTALAR.cmd de nuevo y elegí el disco 1 y el 2.<br>" + "To continue you need disc 2: open INSTALAR.cmd again and choose disc 1 and disc 2.<br><br><small>(toca para cerrar / tap to close)</small></div>";
  d.onclick = () => d.remove();
  document.body.appendChild(d);
}

export const H = {
  ...HASH,
  KILL: 12835,
  CAMARA: 50006,
  MAPA: 63917,
  ON2: 53634,
  OFF2: 107,
  RUTA: 17167,
  DESAPARECE: 61885,
  APARECE: 7620,
  SUBIR: 44252,
  BAJAR: 2139,
  SUBIR_CON: 32843,
  BAJAR_CON: 56265,
  FUNDIDO_ENTRA: 29169,
  CINE_FIN: 54304,
  CINE_BORRA: 29789
};

const ESTADO_S = [ 0, 32, 64, 8, 2048, 65536, 131072, 4096, 4, 1 ];

const BOTON_B = [ 32, 128, 64, 16 ];

export const PAD = {
  TRIANGULO: 16,
  CIRCULO: 32,
  CRUZ: 64,
  CUADRADO: 128
};

export const ESTADO = {
  WATCH: 1,
  INTRUDE: 2,
  NORMAL_WATCH: 8,
  MOVE: 16,
  SQUAT: 32,
  GROUND: 64,
  NOT_PLAYABLE: 128,
  ATTACK: 2048,
  CB_BOX: 4096,
  CAUTION: 65536,
  CHECK_WALL: 131072
};

const ANG = Math.PI * 2 / 4096;

export const TIPOS_VISOR = new Set([ "WATCHER", "ITEM", "SPHERE", "SPHERE2", "SNOW", "SNOWAREA", "TELOP", "RIPPLES", "PATOLAMP", "RSURFACE", "PUT_OBJECT", "DOOR", "ELEVATOR", "DYNWALL" ]);

export const TIPOS_SENSOR = new Set([ "CAMERA", "CAMERA2", "CAMERAGUN", "CLAYMORE", "CENSOR", "SEARCHLIGHT", "KIKENKUN" ]);

export const TIPOS_EFECTO = new Set([ "FADEIO", "PADVIBRATE", "CAMERASHAKE", "CINEMA", "CAT_IN", "BLUR" ]);

const COMANDANTES = new Set([ "COMMANDER", "ZAKOCOM", "ZAKO10COM", "ZAKO11ACOM", "ZAKO11ECOM", "ZAKO11FCOM", "ZAKO14COM", "ZAKO19COM" ]);

export function strcode(t) {
  let id = 0;
  for (const c of (new TextEncoder).encode(t || "")) id = (id << 5 | id >> 11) + c & 65535;
  return id;
}

export const dirDesdeYaw = yaw => (Math.round((yaw - Math.PI) / ANG) % 4096 + 4096) % 4096;

export function estadoSnake({agachado: agachado = false, reptando: reptando = false, primeraPersona: primeraPersona = false, moviendo: moviendo = false, pared: pared = false, caja: caja = false, golpe: golpe = false} = {}) {
  let e = 0;
  if (reptando) e |= ESTADO.GROUND; else if (agachado) e |= ESTADO.SQUAT;
  if (primeraPersona) e |= ESTADO.NORMAL_WATCH | ESTADO.WATCH;
  if (moviendo) e |= ESTADO.MOVE;
  if (pared) e |= ESTADO.CAUTION;
  if (golpe) e |= ESTADO.CHECK_WALL;
  if (caja) e |= ESTADO.CB_BOX;
  return e;
}

export class GuionVivo extends Guion {
  constructor(op = {}) {
    super({
      base: "assets/guion/",
      ...op
    });
    this.sv = new VarsGCL;
    this.nivel = null;
    this.nodos = new Map;
    this.plantillas = new Map;
    this.presupuestoBase = new Map;
    this.presupuesto = new Map;
    this.fase = "quieto";
    this.origen = null;
    this.mapa = null;
    this.mapasActuales = [];
    this.creados = [];
    this.sinSoporte = new Map;
    this.traza = [];
    this.demosVisor = new Map;
    this.demosHechas = new Map;
    this.esperandoDemo = new Map;
    this.demosPedidas = new Set;
    this.zonasSalida = new Set;
    this.adentro = new Map;
    this.snake = null;
    this.historial = [];
    this.canciones = [ 0, 0 ];
    this.procReinicio = -1;
    this.procsSinGuardias = [];
    this.alertaArg = 0;
  }
  anotar(que, datos = {}) {
    const e = {
      t: this.t,
      que: que,
      ...datos
    };
    this.traza.push(e);
    if (this.traza.length > 400) this.traza.splice(0, this.traza.length - 400);
    this.op.registro?.(`vivo ${que} ` + Object.entries(datos).map(([k, v]) => `${k}=${typeof v === "number" && v > 255 ? "#" + (v & 65535).toString(16) : JSON.stringify(v)}`).join(" "));
    return e;
  }
  sinSop(clave) {
    this.sinSoporte.set(clave, (this.sinSoporte.get(clave) || 0) + 1);
  }
  async leerJSON(url) {
    if (this.op.cargarJSON) return this.op.cargarJSON(url);
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status + " " + url);
    return r.json();
  }
  async cargarEscenario(st, {nivel: nivel = null, entrada: entrada = "disco", usarEstadoDeEntrada: usarEstadoDeEntrada, carga: carga = null, demosVisor: demosVisor = []} = {}) {
    if (usarEstadoDeEntrada === false) entrada = "partida";
    const pre = this._pre?.st === st ? this._pre.p : null;
    this._pre = null;
    this.script = null;
    this.st = st;
    this.zonasMapa = null;
    try {
      this.script = await (pre || this.leerJSON(`${this.base}st/${st}.json`));
      if (!this.script) throw new Error("escenario sin guion (null)");
    } catch (e) {
      this.log("guion: sin script para", st, e.message);
      this.limpiarEscenario();
      return false;
    }
    if (entrada === "disco") {
      this.vars.cargar(this.script.vars);
      this.guardarPunto();
    } else {
      if (carga) this.aplicarCarga(st, carga);
      if (!carga?.n) this.guardarPunto();
    }
    const h = strcode(st);
    if (this.historial[0] !== h) {
      this.historial.unshift(h);
      this.historial.length = Math.min(this.historial.length, 8);
    }
    this.indexar();
    this.prepararNivel(nivel);
    this.creaTodo = !!this.op.entradaTotal?.(st);
    if (this.creaTodo) {
      this.presupuestoBase = new Map;
      this.presupuesto = new Map;
    }
    this.demosVisor = new Map;
    this.demosHechas = new Map;
    this.esperandoDemo = new Map;
    this.demosPedidas = new Set;
    for (const p of demosVisor || []) if (p && p.demo != null && (!p.st || p.st === st)) this.demosVisor.set(p.demo, (this.demosVisor.get(p.demo) || 0) + 1);
    this.creados = [];
    this.adentro = new Map;
    this.procReinicio = -1;
    this.fase = "entrada";
    try {
      this.correrMain();
    } finally {
      this.fase = "juego";
    }
    this.despuesDelMain();
    this.anotar("escenario", {
      st: st,
      entrada: entrada,
      charas: this.nodos.size,
      nivel: !!this.nivel
    });
    return true;
  }
  precargar(st) {
    if (this._pre?.st !== st) {
      this._pre = {
        st: st,
        p: this.leerJSON(`${this.base}st/${st}.json`)
      };
      this._pre.p.catch(() => {});
    }
    return this._pre.p;
  }
  aplicarCarga(st, c) {
    this.vars.set("$s:L0094", this.vars.get("$s:L000c"));
    this.vars.set("$s:L000c", strcode(st));
    const m = typeof c.m === "object" && c.m ? c.m.id : c.m;
    if (typeof m === "number") this.vars.set("$s:L000e", m);
    if (Array.isArray(c.p) && c.p.length >= 3) [ "$w:L0010", "$w:L0012", "$w:L0014" ].forEach((k, i) => this.vars.set(k, c.p[i] | 0));
  }
  indexar() {
    this.nodos = new Map;
    const rec = b => {
      for (const s of b || []) {
        if (s.cmd === "chara" && s.k != null) this.nodos.set(s.k, s);
        for (const a of s.args || []) {
          if (a && typeof a === "object" && a.bloque) rec(a.bloque);
          if (a && typeof a === "object" && a.opt) for (const v of a.v) if (v && typeof v === "object" && v.bloque) rec(v.bloque);
        }
      }
    };
    rec(this.script?.main);
    for (const b of Object.values(this.script?.procs || {})) rec(b);
  }
  prepararNivel(nv) {
    this.nivel = null;
    this.plantillas = new Map;
    this.presupuestoBase = new Map;
    this.zonasSalida = new Set;
    this.delegados = new Set;
    if (!nv) {
      this.reiniciarPresupuesto();
      return;
    }
    for (const s of nv.salidas || []) this.zonasSalida.add(s.zona);
    const ks = this.script?.nivel;
    if (!Array.isArray(ks) || ks.length !== nv.actores.length) {
      this.anotar("aviso", {
        motivo: "nivel.json no coincide con el guion: se crea todo lo que pida el script"
      });
      this.reiniciarPresupuesto();
      return;
    }
    for (let i = 0; i < ks.length; i++) {
      const s = this.nodos.get(ks[i]);
      if (!s || s.tipo !== nv.actores[i].tipo) {
        this.anotar("aviso", {
          motivo: "actor " + i + " no coincide"
        });
        this.reiniciarPresupuesto();
        return;
      }
    }
    this.nivel = nv;
    this._hzm = new Map;
    this.rutaDe(nv.principal, 0);
    const vis = new Set(nv.visibles?.length ? nv.visibles : [ nv.principal ]);
    const procsCom = new Set;
    for (const c of nv.actores.filter(a => a.tipo === "COMMANDER")) for (const k of "cnms") for (const v of c.opts?.[k] || []) if (v && typeof v === "object" && "proc" in v) procsCom.add("proc_" + v.proc.toString(16).padStart(4, "0"));
    const vistosSensor = new Set;
    nv.actores.forEach((a, i) => {
      const k = ks[i];
      Object.defineProperty(a, "_k", {
        value: k,
        enumerable: false,
        configurable: true,
        writable: true
      });
      if (!this.plantillas.has(k) || !this.plantillas.get(k).modelo && a.modelo) this.plantillas.set(k, a);
      let delVisor = !a.evento;
      if (ascensorConGuardia(a, nv)) {
        delVisor = false;
        this.delegados.add(k);
      }
      if (TIPOS_SENSOR.has(a.tipo)) {
        const clave = a.tipo + JSON.stringify(a.opts);
        delVisor = (!a.evento || procsCom.has(a.ctx)) && !(a.mapa != null && !vis.has(a.mapa)) && !(a.t > 0) && !vistosSensor.has(clave);
        if (delVisor) vistosSensor.add(clave);
      }
      if (delVisor && !TIPOS_EFECTO.has(a.tipo) && a.tipo !== "SNAKE") this.presupuestoBase.set(k, (this.presupuestoBase.get(k) || 0) + 1);
    });
    this.reiniciarPresupuesto();
  }
  reiniciarPresupuesto() {
    this.presupuesto = new Map(this.presupuestoBase);
  }
  limpiarEscenario() {
    super.limpiarEscenario();
    this.mapa = null;
    this.mapasActuales = [];
    this.procsSinGuardias = [];
  }
  correrMain() {
    const reinicio = this.fase !== "entrada";
    if ((this._reinicios = (this._reinicios || 0) + 1) > 8) {
      this.anotar("aviso", {
        motivo: "restart en bucle"
      });
      this._reinicios--;
      return;
    }
    try {
      this.correrMain2(reinicio);
    } finally {
      this._reinicios--;
    }
  }
  correrMain2(reinicio) {
    if (reinicio) {
      for (const a of this.creados) {
        try {
          this.op.destruirActor?.(a);
        } catch (e) {
          console.warn(e);
        }
      }
      this.creados = [];
      if (this.op.reinicioTotal?.()) this.presupuesto = new Map; else this.reiniciarPresupuesto();
      this.adentro = new Map;
    }
    this.limpiarEscenario();
    if (!this.script) return;
    const pr = this.procReinicio;
    this.procReinicio = -1;
    const origen = reinicio ? {
      tipo: "reinicio",
      desde: this.origen
    } : {
      tipo: "entrada"
    };
    this.ejecutarDesde(origen, () => pr > 0 ? this.proc(pr, [], "restart") : this.bloque(this.script.main, [], "main"));
    if (reinicio) this.despuesDelMain(true);
  }
  despuesDelMain(reinicio = false) {
    const p = this.procSistema.a;
    if (p) {
      this.alertaArg = 0;
      this.ejecutarDesde({
        tipo: "sistema",
        cual: "a",
        reset: true
      }, () => this.proc(p, [ 0 ], "sistema"));
    }
    if (reinicio && !this.cancionFijada && this.canciones[0]) this.op.sonido?.({
      inicio: this.canciones.slice()
    });
  }
  ejecutarDesde(origen, f) {
    const prev = this.origen;
    this.origen = origen;
    try {
      this.ejecutar(f);
    } finally {
      this.origen = prev;
    }
  }
  enTrampa(o = this.origen) {
    for (let x = o; x; x = x.desde) {
      if (x.tipo === "trampa") return x;
      if (x.tipo === "reinicio" || x.tipo === "demo" || x.tipo === "sistema") return null;
    }
    return null;
  }
  trasDemo(o = this.origen) {
    for (let x = o; x; x = x.desde) if (x.tipo === "demo") return true;
    return false;
  }
  correrProc(pid, args = []) {
    this.ejecutarDesde(this.origen || {
      tipo: "externo"
    }, () => this.proc(pid, args, "externo"));
    return this.vars.resultado;
  }
  luego(k, o, args, origen) {
    Promise.resolve().then(() => this.ejecutarDesde(origen, () => k === "proc" ? this.proc(o, args || [], "luego") : this.bloque(o, args || [], "luego")));
  }
  update(dt) {
    this.acum += Math.min(dt, .25) * FPS;
    while (this.acum >= 1) {
      this.acum -= 1;
      this.t++;
      this.reinicioDiferido = true;
      try {
        for (;;) {
          let k = -1;
          for (let i = 0; i < this.cola.length; i++) if (this.cola[i].t <= this.t && (k < 0 || this.cola[i].t < this.cola[k].t || this.cola[i].t === this.cola[k].t && this.cola[i].n < this.cola[k].n)) k = i;
          if (k < 0) break;
          const c = this.cola.splice(k, 1)[0];
          this.ejecutarDesde({
            tipo: "delay",
            desde: c.origen || null
          }, () => c.k === "proc" ? this.proc(c.o, c.a || [], "delay") : this.bloque(c.o, c.a || [], "delay"));
        }
      } finally {
        this.reinicioDiferido = false;
      }
      if (this.reiniciar) {
        if (this.ultimaCarga?.t === this.t) {
          this.reiniciar = false;
          this.anotar("restart-descartado", {
            por: this.ultimaCarga.dest
          });
        } else if (this.hacerReinicio) this.hacerReinicio();
      }
    }
  }
  actualizar(dt, sn = null, otros = []) {
    if (sn) this.snake = sn;
    if (sn?.botones & 255 && this.catIns?.size) for (const [n, c] of [ ...this.catIns ]) if (c.catIn.m) this.catInYa(n);
    this.update(dt);
    if (sn && this.script) this.trampas([ {
      nombre: H.SNAKE,
      pos: sn.pos,
      sn: sn
    }, ...otros ]);
  }
  trampas(quienes) {
    const Z = this.zonasMapa || this.script?.zonas || {};
    for (const q of quienes) {
      if (!q?.pos) continue;
      const alto = q.sn && q.sn.estado & (ESTADO.SQUAT | ESTADO.GROUND | ESTADO.INTRUDE) ? 250 : 750;
      const altoMov = !q.sn ? alto : q.sn.estado & (ESTADO.GROUND | ESTADO.INTRUDE) ? 200 : q.sn.estado & ESTADO.SQUAT ? 550 : 1100;
      const x = q.pos.x * 1e3, y = q.pos.y * 1e3 + alto, y2 = q.pos.y * 1e3 + altoMov, z = q.pos.z * 1e3;
      const dentroDe = cajas => cajas.some(c => {
        const y0 = Math.min(c[0][1], c[1][1]), y1 = Math.max(c[0][1], c[1][1]);
        return x >= Math.min(c[0][0], c[1][0]) && x < Math.max(c[0][0], c[1][0]) && (y >= y0 && y < y1 || y2 >= y0 && y2 < y1) && z >= Math.min(c[0][2], c[1][2]) && z < Math.max(c[0][2], c[1][2]);
      });
      let antes = this.adentro.get(q.nombre);
      if (!antes) {
        antes = new Set;
        if (q.nombre === H.SNAKE) for (const s of this.nivel?.salidas || []) if (Z[s.zona] && dentroDe(Z[s.zona])) antes.add(+s.zona);
      }
      const ahora = new Set;
      for (const h in Z) {
        const dentro = dentroDe(Z[h]);
        if (!dentro) continue;
        const zona = +h;
        ahora.add(zona);
        this.eventoTrampa(zona, q.nombre, antes.has(zona) ? 2 : 1, q.sn || null, q.pos);
      }
      for (const zona of antes) if (!ahora.has(zona)) this.eventoTrampa(zona, q.nombre, 0, q.sn || null, q.pos);
      this.adentro.set(q.nombre, ahora);
    }
  }
  trampa(zona, evento = H.ENTRAR, chara = H.SNAKE) {
    return this.eventoTrampa(zona, chara, evento === H.ENTRAR ? 1 : 0, this.snake, this.snake?.pos);
  }
  condicion(b, sn) {
    if (!(b.flags & 15)) return true;
    if (!sn) return false;
    if (b.flags & 1) {
      let d = -b.d[0] + (sn.dir | 0) & 4095;
      if (d > 2048) d = 4096 - d;
      if (b.d[1] < d) return false;
    }
    const est = sn.estado | 0;
    if (b.flags & 2) {
      const m = ESTADO_S[b.s] || 0;
      if (m) {
        if (!(est & m)) return false;
      } else if (est !== 0 && est & ~(sn.primeraPersona && !(est & ESTADO.INTRUDE) ? 4294230033 : 4294197264)) return false;
    }
    if (b.flags & 4) {
      if (est & ESTADO.NOT_PLAYABLE) return false;
      if (!((sn.botones | 0) & BOTON_B[b.b & 3])) return false;
    }
    return true;
  }
  trampaDePie(sn) {
    const Z = this.zonasMapa || this.script?.zonas;
    if (!Z || !sn?.pos) return false;
    const est = sn.estado | 0, dePie = est & ~(ESTADO.SQUAT | ESTADO.GROUND);
    if (dePie === est || est & ESTADO.INTRUDE) return false;
    const x = sn.pos.x * 1e3, y = sn.pos.y * 1e3 + 750, y2 = sn.pos.y * 1e3 + 1100, z = sn.pos.z * 1e3;
    const dentro = cajas => cajas.some(c => {
      const y0 = Math.min(c[0][1], c[1][1]), y1 = Math.max(c[0][1], c[1][1]);
      return x >= Math.min(c[0][0], c[1][0]) && x < Math.max(c[0][0], c[1][0]) && (y >= y0 && y < y1 || y2 >= y0 && y2 < y1) && z >= Math.min(c[0][2], c[1][2]) && z < Math.max(c[0][2], c[1][2]);
    });
    const ahora = {
      ...sn,
      botones: 240
    }, pie = {
      ...ahora,
      estado: dePie
    };
    for (const b of this.binds) {
      if (!(b.flags & 6) || !b.zona || !Z[b.zona] || b.chara && b.chara !== H.SNAKE) continue;
      if (b.disparada && !(b.flags & 64)) continue;
      if (b.ev && b.ev !== H.ENTRAR) continue;
      if (dentro(Z[b.zona]) && this.condicion(b, pie) && !this.condicion(b, ahora)) return true;
    }
    return false;
  }
  eventoTrampa(zona, quien, modo, sn, pos) {
    let n = 0;
    for (const b of this.binds.slice()) {
      if (b.zona && b.zona !== zona) continue;
      if (b.chara && b.chara !== quien) continue;
      const cond = b.flags & 15;
      let ev = H.ENTRAR;
      if (modo !== 0 && (!cond || quien === H.SNAKE && this.condicion(b, sn))) {
        if (!cond) {
          if (modo !== 1 && !(b.flags & 64)) continue;
        } else if (b.disparada) continue; else if (!(b.flags & 64)) b.disparada = true;
      } else {
        if (cond && !(b.flags & 64) && !b.disparada) continue;
        ev = H.SALIR;
        b.disparada = false;
      }
      if (b.ev && b.ev !== ev) continue;
      const args = [ zona, quien, ev, pos ? Math.round(pos.x * 1e3) : 0, pos ? Math.round(pos.y * 1e3) : 0, pos ? Math.round(pos.z * 1e3) : 0, 0 ];
      const origen = {
        tipo: "trampa",
        zona: zona,
        quien: quien,
        ev: ev
      };
      if (b.t > 0) this.cola.push({
        t: this.t + b.t,
        n: ++this.orden,
        k: b.k,
        o: b.o,
        a: args,
        origen: origen
      }); else this.ejecutarDesde(origen, () => b.k === "proc" ? this.proc(b.o, args, "trap") : this.bloque(b.o, args, "trap"));
      n++;
    }
    return n;
  }
  comando(s, args, ctx) {
    const a = s.args || [];
    switch (s.cmd) {
     case "chara":
      return this.cmdChara(s, args, ctx);

     case "mesg":
      return this.cmdMesg(s, args);

     case "trap":
     case "ntrap":
      return this.cmdTrampa(s, args);

     case "delay":
      {
        const o = this.opciones(s);
        let t = o.t ? this.v(o.t[0], args) : 0, k = null, obj = null;
        if (o.p) {
          k = "proc";
          obj = this.v(o.p[0], args);
        }
        if (o.e && o.e[0]?.bloque) {
          k = "b";
          obj = o.e[0].bloque;
        } else if (o.e && o.e[0] && "proc" in o.e[0]) {
          k = "proc";
          obj = o.e[0].proc;
        }
        if ("g" in o) t = -t;
        if (t && obj != null) this.cola.push({
          t: this.t + Math.abs(t),
          n: ++this.orden,
          k: k,
          o: obj,
          a: [],
          origen: this.origen
        });
        return null;
      }

     case "demo":
      return this.cmdDemo(s, args);

     case "load":
      return this.cmdLoad(s, args);

     case "restart":
      {
        const o = this.opciones(s);
        this.procReinicio = o.p ? this.v(o.p[0], args) : -1;
        if ("s" in o) this.guardarPunto();
        this.anotar("restart", {
          proc: this.procReinicio
        });
        this.reiniciar = true;
        this.fin = true;
        return "fin";
      }

     case "varsave":
      {
        if (a.some(x => x && x.opt === "a")) this.guardarPunto(); else for (const x of a) if (x && typeof x === "object" && "var" in x) this.sv.set(x.var, this.vars.get(x.var));
        return null;
      }

     case "map":
      return this.cmdMap(s, args);

     case "light":
      {
        const o = this.opciones(s), l = {};
        for (const k of "dca") if (o[k]) l[k] = o[k].slice(0, 3).map(x => this.v(x, args) | 0);
        if (this.fase !== "entrada") {
          this.anotar("light", l);
          this.op.luz?.(l);
        }
        return null;
      }

     case "sound":
      return this.cmdSound(s, args);

     case "camera":
      return this.cmdCamera(s, args);

     case "menu":
     case "pad":
      {
        const o = this.opciones(s), r = {};
        for (const k in o) r[k] = o[k].map(x => this.v(x, args));
        this.anotar(s.cmd, r);
        this.op[s.cmd]?.(r, {
          origen: this.origen,
          entrada: this.fase === "entrada"
        });
        return null;
      }

     case "func":
      return this.cmdFunc(s, args);

     case "jimaku":
      {
        const o = this.opciones(s), p = o.e ? this.v(o.e[0], args) : 0;
        if (p) this.luego("proc", p, [], {
          tipo: "actor",
          desde: this.origen
        });
        return null;
      }

     case "system":
      {
        const o = this.opciones(s);
        if (o.s) this.nombreEscenario = this.v(o.s[0], args);
        return super.comando(s, args, ctx);
      }

     case "print":
      this.anotar("print", {
        v: a.map(x => this.v(x, args))
      });
      return null;

     case "mapdef":
     case "start":
     case "demodebug":
      return null;

     default:
      return super.comando(s, args, ctx);
    }
  }
  resolver(lista, args) {
    return (lista || []).map(x => {
      if (x && typeof x === "object") {
        if ("id" in x) return {
          id: x.id,
          n: null
        };
        if ("proc" in x) return {
          proc: x.proc
        };
        if ("bloque" in x) return null;
        if ("str" in x) return x.str;
      }
      return this.v(x, args);
    });
  }
  cmdChara(s, args, ctx) {
    const a = s.args || [];
    if (!a[0] || typeof a[0] !== "object" || !("id" in a[0])) return null;
    const tipo = s.tipo || "#" + a[0].id.toString(16), k = s.k;
    const nombre = a[1] && typeof a[1] === "object" && "id" in a[1] ? a[1].id : a[1] != null && !(a[1] && typeof a[1] === "object" && "opt" in a[1]) ? this.v(a[1], args) : null;
    const o = this.opciones(s), opts = {};
    for (const key in o) opts[key] = this.resolver(o[key], args);
    const sueltos = this.resolver(a.slice(2).filter(x => !(x && typeof x === "object" && ("opt" in x || "bloque" in x))), args);
    if (COMANDANTES.has(tipo)) {
      const z = o.z ? this.v(o.z[0], args) : -1;
      if (z > 0) this.procsSinGuardias.push(z);
      for (const letra of "nmcs") for (const v of o[letra] || []) if (v && typeof v === "object" && "proc" in v) this.proc(v.proc, [], ctx);
    }
    if (tipo === "SNAKE") {
      if (opts.o?.[0]?.id != null) this.op.oarSnake?.(opts.o[0].id);
      if (this.fase !== "entrada") {
        const act = this.armarActor(k, tipo, nombre, opts, ctx);
        this.anotar("snake", {
          p: act.p
        });
        this.op.colocarSnake?.(act, {
          trasDemo: this.trasDemo(),
          origen: this.origen
        });
      }
      return null;
    }
    const efecto = TIPOS_EFECTO.has(tipo);
    const escenaGuion = [ "MOVIE", "ED_TELOP", "ENDINGROLL", "WAKE", "10A_DEMO" ].includes(tipo);
    if (!efecto && !escenaGuion) {
      const quedan = this.presupuesto.get(k) || 0;
      if (quedan > 0) {
        this.presupuesto.set(k, quedan - 1);
        return null;
      }
    }
    const escenaEntrada = escenaGuion || tipo === "DEMODOLL" && !!this.nivel?.actores?.some(x => x._k === k && x.evento);
    if (this.fase === "entrada" && !this.creaTodo && tipo !== "PADDEMO" && tipo !== "DEMOCANCEL" && tipo !== "CINEMA" && tipo !== "BLUR" && !escenaEntrada && !this.delegados?.has(k)) {
      if (!efecto) this.anotar("entrada-sin-crear", {
        tipo: tipo,
        k: k
      });
      return null;
    }
    if (COMANDANTES.has(tipo)) {
      this.op.comandante?.(this.armarActor(k, tipo, nombre, opts, ctx));
      return null;
    }
    const act = this.armarActor(k, tipo, nombre, opts, ctx);
    if (sueltos.length) act.valores = sueltos;
    const tr = this.enTrampa();
    if (tipo === "CAT_IN") this.catIn(act);
    if (tipo === "CAT_IN" && tr) return null;
    this.crearVivo(act);
    return null;
  }
  armarActor(k, tipo, nombre, opts, ctx) {
    const pl = this.plantillas.get(k);
    const act = {
      ...pl || {},
      tipo: tipo,
      nombre: nombre,
      mapa: this.mapa ?? pl?.mapa ?? null,
      ctx: ctx,
      t: +(this.t / FPS).toFixed(2),
      opts: opts,
      k: k,
      guion: true
    };
    delete act.evento;
    const n3 = x => Array.isArray(x) && x.length >= 3 && x.slice(0, 3).every(v => typeof v === "number") ? x.slice(0, 3) : null;
    const num = key => (opts[key] || []).filter(x => typeof x === "number");
    const p = n3(opts.p), d = n3(opts.d);
    if (p) act.p = p;
    if (d) act.d = d;
    if (!act.modelo && tipo === "WALL" && this.nivel) {
      const id = opts.m?.[0]?.id ?? opts.m?.[0], r = typeof id === "number" ? `niveles/${this.st}/${(id & 65535).toString(16).padStart(4, "0")}.glb` : null;
      if (r && this.nivel.actores.some(x => x.modelo === r)) act.modelo = r;
    }
    switch (tipo) {
     case "ITEM":
      if (typeof opts.m?.[0] === "string") act.item = opts.m[0];
      break;

     case "WATCHER":
      {
        act.ruta = num("r")[0] ?? 0;
        if (pl && pl.ruta === act.ruta && pl.mapa === act.mapa && pl.puntos?.length) {
          act.puntos = pl.puntos;
          act.p = pl.puntos[0].p;
        } else {
          act.puntos = [];
          act._ruta = true;
        }
        break;
      }

     case "ELEVATOR":
      {
        const s0 = num("s").slice(0, 3), e0 = num("e").slice(0, 3), c = num("c")[0] ?? 300, i = Math.abs(num("i")[0] ?? 0), X = num("X");
        if (s0.length === 3 && e0.length === 3 && c) {
          act.p = s0.map((v, j) => v + Math.trunc((e0[j] - v) * i / c));
          act.elevador = {
            s: s0,
            e: e0,
            c: c,
            i: i,
            x: num("x")[0] ?? 0,
            snd: X.length >= 3 ? X.slice(0, 3) : [ 184, 185, 186 ],
            per: X.length >= 4 ? X[3] : 8
          };
        }
        const w = opts.w?.[0];
        if (w && typeof w === "object" && "id" in w) act.espera = w.id;
        break;
      }

     case "PUT_OBJECT":
      {
        const v = num("s");
        act.instancias = [];
        for (let j = 0; j + 5 < v.length; j += 6) act.instancias.push({
          p: v.slice(j, j + 3),
          d: v.slice(j + 3, j + 6)
        });
        break;
      }

     case "DYNWALL":
      {
        const q = num("p");
        if (q.length >= 6) act.pared = {
          a: q.slice(0, 3),
          b: q.slice(3, 6),
          h: num("h")[0] ?? 2e3
        };
        break;
      }

     case "CAT_IN":
      {
        const c = num("c");
        if (c.length >= 6) act.corte = {
          ojo: c.slice(0, 3),
          centro: c.slice(3, 6),
          zoom: num("a")[0] ?? 320,
          cuadros: num("t")[0] ?? 0
        };
        break;
      }

     default:
      if ((tipo === "DEMODOLL" || tipo.startsWith("DOLL")) && !p) {
        act.ruta = num("r")[0] ?? 0;
        if (!(pl && pl.p && pl.ruta === act.ruta)) act._ruta = true;
      }
    }
    return act;
  }
  async rutaDe(mapa, r) {
    const m = this.nivel?.mapas?.find(x => x.id === mapa) || this.nivel?.mapas?.find(x => x.id === this.nivel?.principal);
    const f = m?.hzm_json?.[0];
    if (!f) return [];
    const ya = this.op.hzm?.(f);
    if (ya) return ya.rutas?.[r]?.puntos || [];
    this._hzm = this._hzm || new Map;
    if (!this._hzm.has(f)) this._hzm.set(f, this.leerJSON("assets/" + f).catch(() => null));
    const hz = await this._hzm.get(f);
    return hz?.rutas?.[r]?.puntos || [];
  }
  crearVivo(act) {
    this.creados.push(act);
    this.anotar("chara", {
      tipo: act.tipo,
      nombre: act.nombre,
      k: act.k,
      p: act.p || null
    });
    const listo = act._ruta ? this.rutaDe(act.mapa, act.ruta).then(pts => {
      act.puntos = pts;
      if (pts.length && !act.p) act.p = pts[0].p; else if (pts.length && act.tipo === "WATCHER") act.p = pts[0].p;
      delete act._ruta;
    }) : Promise.resolve();
    act.listo = listo.then(() => {
      const fn = TIPOS_EFECTO.has(act.tipo) ? this.op.efecto : this.op.crearActor;
      if (!fn) {
        this.sinSop("chara " + act.tipo);
        return false;
      }
      return Promise.resolve(fn.call(this.op, act)).then(ok => {
        if (ok === false) this.sinSop("chara " + act.tipo);
        act.creado = ok !== false;
        return act.creado;
      });
    }).catch(e => {
      console.warn("guion vivo: crear", act.tipo, e);
      return false;
    });
    return act;
  }
  cmdMesg(s, args) {
    const a = s.args || [];
    if (!a.length) return null;
    const dest = this.v(a[0], args) & 65535;
    const v = a.slice(1).map(x => {
      const r = this.v(x, args);
      return typeof r === "number" ? r : 0;
    });
    const info = {
      trampa: !!this.enTrampa(),
      entrada: this.fase === "entrada",
      origen: this.origen
    };
    if (v[0] === H.KILL) for (const c of this.creados) if (c.nombre === dest) c.muerto = true;
    let ok = v[0] === H.KILL && this.catInYa(dest);
    try {
      ok = !!this.op.mensaje?.(dest, v, info) || ok;
    } catch (e) {
      console.warn("guion vivo: mesg", e);
    }
    if (!info.entrada) {
      this.anotar("mesg", {
        dest: dest,
        v: v.map(x => x > 255 ? "#" + (x & 65535).toString(16) : x).join(" "),
        ok: ok
      });
      if (!ok) this.sinSop("mesg #" + dest.toString(16));
    }
    return null;
  }
  cmdTrampa(s, args) {
    const a = s.args || [], o = this.opciones(s);
    const pos = a.filter(x => !(x && typeof x === "object" && ("opt" in x || "bloque" in x)));
    const h = x => {
      const n = this.v(x, args);
      return n === H.TODO ? 0 : (n | 0) & 65535;
    };
    const b = {
      cmd: s.cmd,
      zona: h(pos[0]),
      chara: h(pos[1]),
      ev: 0,
      flags: 0,
      t: 0,
      disparada: false,
      mapa: this.mapa,
      k: "b",
      o: null
    };
    if (s.cmd === "trap") {
      b.ev = pos.length > 2 ? h(pos[2]) : 0;
      const blk = a.find(x => x && typeof x === "object" && "bloque" in x);
      if (blk) b.o = blk.bloque; else if (pos[3] && typeof pos[3] === "object" && "proc" in pos[3]) {
        b.k = "proc";
        b.o = pos[3].proc;
      }
    } else {
      if (o.m) b.ev = h(o.m[0]);
      if (o.d) {
        b.flags |= 1;
        b.d = [ this.v(o.d[0], args) | 0, o.d.length > 1 ? this.v(o.d[1], args) | 0 : 512 ];
      }
      if (o.b) {
        b.flags |= 4;
        b.b = this.v(o.b[0], args) | 0;
      }
      if (o.s) {
        b.flags |= 2;
        b.s = this.v(o.s[0], args) | 0;
      }
      if ("r" in o) b.flags |= 64;
      if (o.t) b.t = this.v(o.t[0], args) | 0;
      if (o.p) {
        b.k = "proc";
        b.o = this.v(o.p[0], args);
      }
      if (o.e) {
        const x = o.e[0];
        if (x && x.bloque) {
          b.k = "b";
          b.o = x.bloque;
        } else if (x && "proc" in x) {
          b.k = "proc";
          b.o = x.proc;
        }
      }
    }
    if (b.o != null) this.binds.push(b);
    return null;
  }
  cmdDemo(s, args) {
    const o = this.opciones(s);
    const sector = o.s ? this.v(o.s[0], args) : -1, proc = o.p ? this.v(o.p[0], args) : 0;
    const origen = {
      tipo: "demo",
      sector: sector,
      desde: this.origen
    };
    if (!(sector >= 0)) {
      if (proc) this.luego("proc", proc, [], origen);
      return null;
    }
    const n = this.demosVisor.get(sector) || 0;
    if (n > 0) {
      this.demosVisor.set(sector, n - 1);
      const hechas = this.demosHechas.get(sector) || 0;
      if (hechas > 0) {
        this.demosHechas.set(sector, hechas - 1);
        if (proc) this.luego("proc", proc, [], origen);
      } else {
        const l = this.esperandoDemo.get(sector) || [];
        l.push({
          proc: proc,
          origen: origen
        });
        this.esperandoDemo.set(sector, l);
      }
      this.anotar("demo", {
        sector: sector,
        del: "visor"
      });
      return null;
    }
    this.anotar("demo", {
      sector: sector,
      proc: proc,
      pedida: !!this.op.demo
    });
    if (!this.op.demo) {
      if (proc) this.luego("proc", proc, [], origen);
      return null;
    }
    this.demosPedidas.add(sector);
    Promise.resolve().then(() => this.op.demo(sector, {
      st: this.st,
      proc: proc,
      mapa: this.mapa,
      origen: origen
    })).catch(e => console.warn("guion vivo: demo", sector, e)).then(() => {
      this.demosPedidas.delete(sector);
      this.anotar("demo-fin", {
        sector: sector
      });
      if (proc) this.ejecutarDesde(origen, () => this.proc(proc, [], "demo"));
    });
    return null;
  }
  demosTerminadas(pasos) {
    for (const p of pasos || []) {
      const sector = typeof p === "number" ? p : p?.demo;
      if (sector == null || this.demosPedidas.has(sector)) continue;
      const l = this.esperandoDemo.get(sector);
      if (l?.length) {
        const x = l.shift();
        if (x.proc) this.ejecutarDesde(x.origen, () => this.proc(x.proc, [], "demo"));
      } else this.demosHechas.set(sector, (this.demosHechas.get(sector) || 0) + 1);
    }
  }
  cmdLoad(s, args) {
    const a = s.args || [], o = this.opciones(s);
    const dest = a[0] && typeof a[0] === "object" && "str" in a[0] ? a[0].str : "";
    const ints = k => (o[k] || []).map(x => this.v(x, args));
    if (dest === "change") return this.cambioDeDisco();
    if (!dest) {
      this.anotar("load", {
        dest: "(recarga)"
      });
      this.op.cargar?.(this.st, {
        recarga: true,
        origen: this.origen
      });
      this.fin = true;
      return "fin";
    }
    if (o.r) {
      this.anotar("load", {
        dest: dest,
        r: ints("r")[0]
      });
      this.op.cargar?.(dest, {
        reinicio: true,
        origen: this.origen
      });
      this.fin = true;
      return "fin";
    }
    this.vars.set("$s:L0094", this.vars.get("$s:L000c"));
    this.vars.set("$s:L000c", strcode(dest));
    if (o.m) this.vars.set("$s:L000e", ints("m")[0]);
    if (o.p) {
      const p = ints("p");
      [ "$w:L0010", "$w:L0012", "$w:L0014" ].forEach((k, i) => this.vars.set(k, p[i] | 0));
    }
    const info = {
      m: o.m ? ints("m")[0] : null,
      p: [ this.vars.get("$w:L0010"), this.vars.get("$w:L0012"), this.vars.get("$w:L0014") ],
      rot: this.vars.get("$w:G0002"),
      s: o.s ? ints("s")[0] : 1,
      n: "n" in o,
      desde: this.st,
      origen: this.origen
    };
    const tr = this.enTrampa();
    this.ultimaCarga = {
      dest: dest,
      info: info,
      zona: tr?.zona ?? null,
      t: this.t
    };
    const salidaVisor = tr && this.zonasSalida.has(tr.zona) && !this.op.salidasPorGuion;
    this.anotar("load", {
      dest: dest,
      salidaVisor: !!salidaVisor,
      zona: tr?.zona ?? null
    });
    if (!salidaVisor) this.op.cargar?.(dest, info);
    this.fin = true;
    return "fin";
  }
  cambioDeDisco() {
    if (SIN_DISCO2) {
      this.anotar("load", {
        dest: "s13a",
        cambioDeDisco: true,
        sinDisco2: true
      });
      avisoDisco2();
      this.fin = true;
      return "fin";
    }
    const v = this.vars;
    v.set("$w:L0008", 2);
    v.set("$b:G0000", (v.get("$b:G0000") | 0) + 1 | 128);
    v.set("$f:G0001.0", 0);
    v.set("$w:L0010", 7724);
    v.set("$w:L0012", 19536);
    v.set("$w:L0014", 10932);
    v.set("$w:G0002", 2048);
    v.set("$w:G0004", 0);
    v.set("$s:L0094", v.get("$s:L000c"));
    v.set("$s:L000c", strcode("s13a"));
    v.set("$s:L000e", 18822);
    const info = {
      m: 18822,
      p: [ 7724, 19536, 10932 ],
      rot: 2048,
      s: 1,
      n: false,
      desde: this.st,
      origen: this.origen,
      cambioDeDisco: true
    };
    this.ultimaCarga = {
      dest: "s13a",
      info: info,
      zona: this.enTrampa()?.zona ?? null,
      t: this.t
    };
    this.anotar("load", {
      dest: "s13a",
      cambioDeDisco: true
    });
    this.op.cargar?.("s13a", info);
    this.fin = true;
    return "fin";
  }
  cmdMap(s, args) {
    const o = this.opciones(s), ints = k => (o[k] || []).map(x => this.v(x, args));
    if (o.a) {
      this.mapasActuales = ints("a");
      if (this.mapasActuales.length) this.mapa = this.mapasActuales[0];
    }
    if (o.s) {
      this.anotar("map", {
        recarga: ints("s")
      });
      this.op.recargaMapas?.(ints("s"), {
        entrada: this.fase === "entrada",
        origen: this.origen
      });
    }
    if (this.fase === "entrada") return null;
    const c = {};
    if (o.p) c.agregar = ints("p");
    if (o.m) c.quitar = ints("m");
    if (o.b) c.fondo = ints("b").slice(0, 3);
    if (Object.keys(c).length) {
      c.actual = this.mapasActuales.slice();
      this.anotar("map", c);
      this.op.mapa?.(c);
    }
    return null;
  }
  cancelarVoz() {
    const t = this.vozActual;
    if (t) {
      t.cancelada = true;
      this.vozActual = null;
    }
    this.codec?.pararVozJuego?.();
  }
  cmdSound(s, args) {
    const o = this.opciones(s), ints = k => (o[k] || []).map(x => this.v(x, args));
    if (o.g) this.gameOverVox = this.v(o.g[0], args);
    if (o.v) {
      const id = this.v(o.v[0], args), proc = o.f ? this.v(o.f[0], args) : 0, origen = {
        tipo: "actor",
        desde: this.origen
      };
      if (this.op.voz) this.op.voz(id, proc); else if (this.codec) {
        const t = this.vozActual = {
          id: id,
          proc: proc
        };
        this.codec.reproducirVoz(id).then(() => {
          if (this.vozActual === t) this.vozActual = null;
          if (proc && !t.cancelada) this.ejecutarDesde(origen, () => this.proc(proc, [], "voz"));
        });
      } else if (proc) this.luego("proc", proc, [], origen);
    }
    const r = {};
    if (o.b) {
      r.b = ints("b").slice(0, 2);
      this.canciones = r.b.slice();
      this.cancionFijada = false;
    }
    if (o.s) {
      r.s = ints("s")[0];
      this.cancionFijada = true;
    }
    if (o.c) r.c = ints("c")[0];
    if (o.x) r.x = ints("x")[0];
    if (o.e) {
      const e = ints("e");
      r.e = {
        pan: e[0] | 0,
        vol: e[1] | 0,
        id: e[2] | 0
      };
    }
    if ("n" in o) r.n = true;
    for (const k of "krl") if (o[k]) (r.ruido = r.ruido || {})[k] = ints(k);
    if (!Object.keys(r).length) return null;
    if (this.fase === "entrada") {
      if (r.e) this.op.sonido?.({
        e: r.e
      });
      return null;
    }
    this.anotar("sound", r);
    this.op.sonido?.(r);
    return null;
  }
  cmdCamera(s, args) {
    if (this.fase === "entrada" || this.enTrampa()) return null;
    const o = this.opciones(s), r = {};
    for (const k in o) {
      const vals = o[k].map(x => {
        const y = this.v(x, args);
        return typeof y === "number" ? y : 0;
      });
      if (k === "e" || k === "p") r[k] = 1; else if (k === "b" || k === "l") r[k] = vals.slice(0, 6); else if (k === "r") r[k] = vals.slice(0, 3); else if (k === "t" || k === "a" || k === "c") r[k] = vals[0] ?? 0; else if (k === "s") r.s = {
        id: vals[0],
        p1: vals[1],
        interp: vals[2],
        tipo: vals[3],
        pos: vals.slice(4, 7),
        trg: vals.slice(7, 10),
        mask: vals[10] || 0
      };
    }
    this.anotar("camera", {
      s: r.s?.id ?? null
    });
    this.op.camara?.(r);
    return null;
  }
  cmdFunc(s, args) {
    const o = this.opciones(s);
    if (o.v) this.vars.resultado = this.op.puntoVisible?.(o.v.map(x => this.v(x, args))) ? 1 : 0;
    if ("s" in o) {
      const sn = this.snake;
      if (sn?.pos) {
        this.vars.set("$w:L0010", Math.round(sn.pos.x * 1e3));
        this.vars.set("$w:L0012", Math.round(sn.pos.y * 1e3));
        this.vars.set("$w:L0014", Math.round(sn.pos.z * 1e3));
      }
      this.vars.resultado = sn ? sn.dir | 0 : 0;
    }
    if (o.a) {
      const h = this.v(o.a[0], args) & 65535;
      this.vars.resultado = this.historial.indexOf(h) >= 0 ? 1 : 0;
    }
    if (o.m) {
      const m = this.v(o.m[0], args);
      this.vars.resultado = (this.op.mapaVisible ? this.op.mapaVisible(m) : (this.nivel?.visibles || []).includes(m)) ? 1 : 0;
    }
    if (o.c) this.vars.resultado = this.codec?.estadoVoz?.() ?? -1;
    if (o.n) this.vars.resultado = 0;
    if (o.p) {
      const v = o.p.map(x => this.v(x, args));
      this.fotoFantasma = {
        codigo: v[4] === H.SALIR ? 0 : v[0],
        pos: [ v[1], v[2], v[3] ]
      };
    }
    return null;
  }
  alerta(modoVisor) {
    if (typeof modoVisor !== "number") return;
    const arg = modoVisor === 1 ? 2 : modoVisor === 2 ? 1 : 0;
    const p = this.procSistema.a;
    this.alertaArg = arg;
    if (p) {
      this.anotar("alerta", {
        arg: arg
      });
      this.ejecutarDesde({
        tipo: "sistema",
        cual: "a"
      }, () => this.proc(p, [ arg ], "sistema"));
    }
  }
  cambioArma(id) {
    const p = this.procSistema.w;
    if (p) this.ejecutarDesde({
      tipo: "sistema",
      cual: "w"
    }, () => this.proc(p, [ id ], "sistema"));
  }
  cambioItem(id) {
    const p = this.procSistema.i;
    if (p) this.ejecutarDesde({
      tipo: "sistema",
      cual: "i"
    }, () => this.proc(p, [ id ], "sistema"));
  }
  continuar() {
    const p = this.procSistema.c;
    if (p) this.ejecutarDesde({
      tipo: "sistema",
      cual: "c"
    }, () => this.proc(p, [ 0 ], "sistema"));
    this.restaurarPunto();
  }
  sinGuardias() {
    const l = this.procsSinGuardias.splice(0);
    for (const p of l) this.ejecutarDesde({
      tipo: "actor"
    }, () => this.proc(p, [], "comandante"));
    return l.length;
  }
  eventoActor(actor, letra, args = []) {
    const k = actor?._k ?? actor?.k;
    const s = this.nodos.get(k);
    if (!s) return false;
    const o = this.opciones(s)[letra];
    if (!o?.length) return false;
    const x = o[0], origen = {
      tipo: "actor",
      k: k,
      letra: letra
    };
    if (x && typeof x === "object" && x.bloque) {
      this.ejecutarDesde(origen, () => this.bloque(x.bloque, args, "actor"));
      return true;
    }
    const pid = x && typeof x === "object" && "proc" in x ? x.proc : this.v(x, args);
    if (pid > 0) {
      this.ejecutarDesde(origen, () => this.proc(pid, args, "actor"));
      return true;
    }
    return false;
  }
  alTomarItem(actor) {
    return this.eventoActor(actor, "x") || this.eventoActor(actor, "e");
  }
  alElevador(actor, hash) {
    return this.eventoActor(actor, "p", [ hash ]);
  }
  catIn(act) {
    const n = k => (act.opts?.[k] || []).filter(x => typeof x === "number");
    const e = act.opts?.e?.[0], pid = e && typeof e === "object" ? e.proc : typeof e === "number" ? e : 0;
    const c = {
      t: this.t + Math.max(0, n("t")[0] ?? 0) + 1,
      n: ++this.orden,
      k: "proc",
      o: pid,
      a: [],
      origen: {
        tipo: "actor",
        k: act.k,
        letra: "e"
      },
      catIn: {
        nombre: act.nombre,
        m: n("m")[0] === 1
      }
    };
    if (!(pid > 0)) {
      c.sinProc = true;
      c.st = this.st;
      (this.catIns ||= new Map).set(act.nombre, c);
      return;
    }
    this.cola.push(c);
    (this.catIns ||= new Map).set(act.nombre, c);
  }
  catInYa(nombre) {
    const c = this.catIns?.get(nombre);
    if (!c) return false;
    this.catIns.delete(nombre);
    if (c.sinProc) {
      if (c.st !== this.st || this.t > c.t) return false;
      this.op.finCorte?.(c.catIn);
      return true;
    }
    if (!this.cola.includes(c)) return false;
    c.t = Math.min(c.t, this.t + 1);
    this.op.finCorte?.(c.catIn);
    return true;
  }
  guardarPunto() {
    this.sv.g.set(this.vars.g);
    this.sv.l.set(this.vars.l);
  }
  restaurarPunto() {
    this.vars.g.set(this.sv.g);
    this.vars.l.set(this.sv.l.subarray(0, 156));
  }
  exportarPartida() {
    return {
      version: 1,
      st: this.st,
      vars: this.vars.exportar(),
      guardadas: this.sv.exportar(),
      historial: this.historial.slice(),
      mapa: this.mapa,
      canciones: this.canciones.slice(),
      memoria: this.memoria?.lista?.slice() || []
    };
  }
  importarPartida(d) {
    if (!d) return false;
    this.vars.cargar(d.vars);
    this.sv.cargar(d.guardadas || d.vars);
    if (Array.isArray(d.historial)) this.historial = d.historial.slice(0, 8);
    if (Array.isArray(d.memoria) && this.memoria) {
      this.memoria.lista = d.memoria.slice(0, 16);
      this.memoria.guardar?.();
    }
    return true;
  }
  resumen() {
    const c = {};
    for (const e of this.traza) c[e.que] = (c[e.que] || 0) + 1;
    return {
      st: this.st,
      t: this.t,
      creados: this.creados.length,
      binds: this.binds.length,
      cola: this.cola.length,
      eventos: c,
      sinSoporte: Object.fromEntries(this.sinSoporte)
    };
  }
}

export function ascensorConGuardia(a, nv) {
  return a.tipo === "ELEVATOR" && a.t > 0 && a.espera != null && !!nv?.actores?.some(w => w.tipo === "WATCHER" && w.nombre === a.espera);
}

export function paredDinamica(a, THREE) {
  const w = a.pared || (Array.isArray(a.opts?.p) && a.opts.p.length >= 6 ? {
    a: a.opts.p.slice(0, 3),
    b: a.opts.p.slice(3, 6),
    h: a.opts.h?.[0] ?? 2e3
  } : null);
  if (!w) return null;
  const MM = .001, A = w.a.map(v => v * MM), B = w.b.map(v => v * MM), h = w.h * MM;
  const pos = [ A[0], A[1], A[2], B[0], B[1], B[2], B[0], B[1] + h, B[2], A[0], A[1], A[2], B[0], B[1] + h, B[2], A[0], A[1] + h, A[2] ];
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  }));
  m.userData.propio = m.userData.sinColision = true;
  m.userData.actor = a;
  m.userData.paredGuion = true;
  return m;
}

export function efectosPorDefecto({contenedor: contenedor = (typeof document !== "undefined" ? document.body : null), vibrar: vibrar = null} = {}) {
  const activos = new Map;
  const capa = css => {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;pointer-events:none;z-index:6;" + css;
    contenedor.appendChild(d);
    return d;
  };
  const quitar = n => {
    const x = activos.get(n);
    if (x) {
      for (const e of x.els) e.remove();
      activos.delete(n);
    }
  };
  const fundir = (els, desde, hasta, cuadros, alFin) => {
    for (const e of els) {
      e.style.transition = "none";
      e.style.opacity = desde;
    }
    void els[0]?.offsetWidth;
    for (const e of els) {
      e.style.transition = `opacity ${Math.max(0, cuadros) / FPS}s linear`;
      e.style.opacity = hasta;
    }
    if (alFin) setTimeout(alFin, Math.max(0, cuadros) / FPS * 1e3 + 30);
  };
  return {
    efecto(a) {
      const o = a.opts || {}, num = (k, d) => typeof o[k]?.[0] === "number" ? o[k][0] : d;
      if (a.tipo === "FADEIO" && contenedor) {
        quitar(a.nombre);
        const m = num("m", 0), s = Math.max(1, num("s", 30));
        const el = capa(`inset:0;background:${m & 2 ? "#fff" : "#000"};opacity:0`);
        activos.set(a.nombre, {
          els: [ el ],
          tipo: "FADEIO"
        });
        if (m & 1) fundir([ el ], 1, 0, s, () => {
          if (activos.get(a.nombre)?.els[0] === el) quitar(a.nombre);
        }); else fundir([ el ], 0, 1, s);
        return true;
      }
      if (a.tipo === "CINEMA" && contenedor) {
        quitar(a.nombre);
        const els = [ capa("left:0;right:0;top:0;height:10%;background:#000;opacity:0"), capa("left:0;right:0;bottom:0;height:16.7%;background:#000;opacity:0") ];
        activos.set(a.nombre, {
          els: els,
          tipo: "CINEMA"
        });
        fundir(els, 0, 1, 15);
        const t = num("t", 3e4);
        if (t < 3e4) setTimeout(() => this.mensaje(a.nombre, [ H.CINE_FIN ]), t / FPS * 1e3);
        return true;
      }
      if (a.tipo === "BLUR") {
        blurGuion.prender(a.nombre, (o.d || []).filter(x => typeof x === "number"));
        return true;
      }
      if (a.tipo === "PADVIBRATE") {
        const v = (a.valores || []).filter(x => typeof x === "number");
        let ms = 0;
        for (let i = 1; i < v.length; i += 2) ms += v[i] / FPS * 1e3;
        try {
          (vibrar || (n => navigator.vibrate?.(n)))(Math.min(1500, Math.round(ms)));
        } catch {}
        return true;
      }
      return false;
    },
    mensaje(dest, v) {
      if (blurGuion.mensaje(dest, v)) return true;
      const x = activos.get(dest);
      if (!x) return false;
      const m = v[0];
      if (m === H.KILL || m === H.CINE_BORRA) {
        quitar(dest);
        return true;
      }
      if (x.tipo === "FADEIO" && m === H.FUNDIDO_ENTRA) {
        fundir(x.els, 1, 0, 30, () => quitar(dest));
        return true;
      }
      if (x.tipo === "CINEMA" && m === H.CINE_FIN) {
        fundir(x.els, 1, 0, 15, () => quitar(dest));
        return true;
      }
      return false;
    },
    limpiar() {
      for (const n of [ ...activos.keys() ]) quitar(n);
      blurGuion.apagar();
    },
    quitarCine() {
      for (const [n, x] of [ ...activos ]) if (x.tipo === "CINEMA") fundir(x.els, 1, 0, 15, () => quitar(n));
    },
    hayCine() {
      for (const x of activos.values()) if (x.tipo === "CINEMA") return true;
      return false;
    }
  };
}

export function manejadorMensajes(ctx) {
  const MM = .001;
  return (dest, v, info) => {
    if (info.entrada) return false;
    const m = v[0];
    if (ctx.efectos?.mensaje(dest, v)) return true;
    if (dest === H.CAMARA) {
      if (info.trampa) return true;
      const cj = ctx.camJuego?.();
      if (!cj || v.length < 2) return false;
      cj.mensajes.push([ v[0], v[1] ]);
      return true;
    }
    let ok = false;
    const din = ctx.din?.();
    for (const p of din?.puertas || []) {
      if (p.o.userData.actor?.nombre !== dest) continue;
      ok = true;
      if (m === H.KILL) {
        p.o.visible = false;
        p.forzada = "abierta";
        continue;
      }
      if (m !== H.ENTRAR && m !== H.SALIR) continue;
      if (v.length > 1 && v[1] > 0 && v[1] < 64) continue;
      if (info.trampa && !ctx.puertaDeEvento?.(dest)) continue;
      p.contador = Math.max(0, (p.contador || 0) + (m === H.ENTRAR ? 1 : -1));
      p.forzada = p.contador > 0 ? "abierta" : null;
    }
    for (const E of din?.elevadores || []) {
      if (E.o.userData.actor?.nombre !== dest) continue;
      ok = true;
      if (ctx.juego?.()?.com?.modo) continue;
      const sube = m === H.SUBIR || m === H.SUBIR_CON, baja = m === H.BAJAR || m === H.BAJAR_CON;
      if (m === 13150) continue;
      if (!sube && !baja) continue;
      if (E.fiel) {
        if (E.destino !== null || E.aviso || (sube ? E.f > 0 : E.f < 1)) continue;
        E.destino = sube ? 1 : 0;
        E.lleva = (m === H.SUBIR_CON || m === H.BAJAR_CON) && v.length > 1 ? v[1] : null;
        continue;
      }
      E.porGuion = true;
      if (E.destino === null && (sube && E.f < .5 || baja && E.f > .5)) {
        E.destino = sube ? 1 : 0;
        E.espera = 0;
      }
    }
    for (const g of ctx.guardias?.() || []) {
      if (g.nombre !== dest) continue;
      ok = true;
      if (m === H.KILL) {
        g.inactivo = true;
        g.borrado = true;
        g.o.visible = false;
      } else if (m === H.DESAPARECE) {
        g.faseout = true;
        g.inactivo = true;
        g.o.visible = false;
      } else if (m === H.APARECE) {
        if (g.faseout) {
          g.faseout = false;
          g.o.visible = true;
          if (!g.esperaAscensor && !din?.elevadores?.some(E => E.guardia === g)) g.inactivo = false;
        }
      } else if (m === H.RUTA && ctx.rutaDe) {
        const r = v[1] | 0, punto = v.slice(2, 5);
        if (g.rutaPedida === r && g.rutaPunto === punto.join()) continue;
        g.rutaPedida = r;
        g.rutaPunto = punto.join();
        ctx.rutaDe(g.mapa ?? g.o.userData.guardia?.mapa, r).then(pts => {
          if (!pts.length || !ctx.THREE) return;
          g.ruta = r;
          g.pts = pts.map(q => new ctx.THREE.Vector3(q.p[0] * MM, q.p[1] * MM, q.p[2] * MM));
          g.puntosCmd = pts.map(q => q.cmd || 0);
          const J = ctx.juego?.();
          if (J && g.think) {
            g.nodos = g.pts.map((p, i) => ({
              p: p,
              cmd: g.puntosCmd[i]
            }));
            g.zonaAsignada = punto.length === 3 && punto[1] < 3e4 ? J.zonaDe(new ctx.THREE.Vector3(punto[0] * MM, punto[1] * MM, punto[2] * MM)) : -1;
            if (!g.inactivo) J.reanudarRuta(g);
          }
        });
      }
    }
    const S = ctx.sensores?.();
    if (S?.lista?.some(s => s.nombre === dest)) {
      S.mensaje(dest, m);
      ok = true;
    }
    if (m === H.KILL || m === H.OFF2) {
      const mundo = ctx.mundo?.(), col = ctx.colParedes?.();
      const borrar = [];
      mundo?.traverse(o => {
        const a = o.userData.actor;
        if (a?.nombre !== dest) return;
        if (m === H.OFF2 ? a.tipo === "DYNWALL" : a.tipo !== "DOOR" && a.tipo !== "ELEVATOR" && a.tipo !== "DYNWALL") borrar.push(o);
      });
      for (const o of borrar) {
        ok = true;
        o.visible = false;
        if (o.userData.paredGuion) {
          const i = col?.indexOf(o) ?? -1;
          if (i >= 0) col.splice(i, 1);
          o.removeFromParent();
        }
      }
      if (borrar.length) ctx.recalcular?.();
    }
    return ok;
  };
}

export function sonidoPorDefecto(audio) {
  const misma = b => audio.canciones && audio.canciones[0] === b[0] && audio.canciones[1] === b[1];
  return r => {
    if (r.inicio) {
      if (!misma(r.inicio)) {
        audio.canciones = r.inicio.slice();
        audio.cancion(audio.canciones[audio.modo ? 1 : 0]);
      }
      return;
    }
    if (r.b) {
      const igual = misma(r.b);
      audio.canciones = r.b.slice();
      if (r.n && !igual) audio.cancion(r.b[audio.modo ? 1 : 0]);
    }
    if (r.s != null) audio.cancion(r.s);
    if (r.c != null) audio.codigo((r.c | 33554176) >>> 0);
    if (r.x != null) audio.codigo(r.x >>> 0);
    if (r.e) audio.se(r.e.id, r.e.pan, r.e.vol);
  };
}
