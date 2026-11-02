// MGS web — FeniXVOID · Project Ravenlight
import * as ctl from "./controles.js";

import { urlVoz } from "./audio_ps1.js";

export const BOTON = {
  L2: 1,
  R2: 2,
  L1: 4,
  R1: 8,
  TRI: 16,
  CIR: 32,
  CRU: 64,
  CUA: 128,
  FIN: 2048,
  ARRIBA: 4096,
  DER: 8192,
  ABAJO: 16384,
  IZQ: 32768
};

const FPS = 30;

export class PadDemo {
  constructor({base: base = "assets/guion/paddemo/", cargarJSON: cargarJSON = null} = {}) {
    this.base = base;
    this.cargarJSON = cargarJSON;
    this.activo = false;
    this.bits = 0;
    this.antes = 0;
    this.cuadro = 0;
    this.esperando = false;
  }
  iniciar(actor, op = {}) {
    const d = actor?.opts?.d?.[0], id = typeof d === "object" && d ? d.id : typeof d === "number" ? d : null;
    if (id == null || !op.st) return false;
    this.cortar(false);
    const archivo = `${this.base}${op.st}_${(id & 65535).toString(16).padStart(4, "0")}.json`;
    this.actor = actor;
    this.op = op;
    this.st = op.st;
    this.datos = null;
    this.control = false;
    this.cancelable = !!actor.opts && "c" in actor.opts;
    this.activo = true;
    this.esperando = true;
    this.bits = 0;
    this.antes = 0;
    this.cuadro = 0;
    this.i = 0;
    this.resta = 0;
    this.acum = 0;
    this.tEspera = 0;
    this.cancelado = false;
    const pedido = this._pedido = (this.cargarJSON ? this.cargarJSON(archivo) : fetch(archivo).then(r => r.ok ? r.json() : null)).catch(() => null).then(j => {
      if (this._pedido !== pedido || !this.activo) return;
      if (!j?.pasos?.length) {
        this.terminar(0);
        return;
      }
      this.datos = j;
    });
    return true;
  }
  iniciarControl(actor, op = {}) {
    const s = (actor?.opts?.s || []).filter(x => typeof x === "number");
    if (!op.st || s.length < 2) return false;
    this.cortar(false);
    const pasos = [];
    for (let i = 0; i + 1 < s.length; i += 2) pasos.push([ s[i] & 65535 & ~BOTON.FIN, s[i + 1] ]);
    this.actor = actor;
    this.op = op;
    this.st = op.st;
    this.datos = {
      pasos: pasos
    };
    this.control = true;
    this.cancelable = false;
    this.activo = true;
    this.esperando = false;
    this.bits = 0;
    this.antes = 0;
    this.cuadro = 0;
    this.i = 0;
    this.resta = 0;
    this.acum = 0;
    this.tEspera = 0;
    this.cancelado = false;
    return true;
  }
  get apretados() {
    return this.bits & ~this.antes;
  }
  get soltados() {
    return this.antes & ~this.bits;
  }
  avanzar(dt) {
    if (!this.activo || !this.datos) return 0;
    if (this.esperando) {
      this.tEspera += dt;
      if (this.op.vozLista?.() || this.tEspera > 4) this.esperando = false; else return 0;
    }
    this.acum += Math.min(dt, .5) * FPS;
    let n = 0;
    while (this.acum >= 1 && n < 15 && this.activo) {
      this.acum -= 1;
      this.paso();
      n++;
    }
    return n;
  }
  paso() {
    const P = this.datos.pasos;
    if (this.resta <= 0) {
      if (this.i >= P.length) {
        this.terminar(0);
        return;
      }
      const [b, n] = P[this.i++];
      this.actual = b;
      this.resta = n;
    }
    this.antes = this.bits;
    this.bits = this.actual & ~2048;
    this.resta--;
    this.cuadro++;
    if (this.actual & BOTON.FIN) this.terminar(0);
  }
  cancelar() {
    if (!this.activo || !this.cancelable) return false;
    this.cancelado = true;
    this.terminar(1);
    return true;
  }
  terminar(arg) {
    if (!this.activo) return;
    this.activo = false;
    this.bits = 0;
    this.antes = 0;
    const op = this.op;
    this.op = null;
    try {
      op?.alTerminar?.(arg, this.actor);
    } catch (e) {
      console.warn("paddemo", e);
    }
  }
  cortar(avisar = false) {
    if (this.activo) {
      if (avisar) this.terminar(0); else {
        this.activo = false;
        this.bits = 0;
        this.antes = 0;
        this.op = null;
      }
    }
  }
}

export class DemoCancel {
  constructor() {
    this.activo = false;
  }
  iniciar(actor, op = {}) {
    const n = (k, d) => {
      const v = actor?.opts?.[k]?.[0];
      return typeof v === "number" ? v : d;
    };
    this.cortar();
    Object.assign(this, {
      actor: actor,
      op: op,
      mascara: n("m", 65535),
      paso: Math.max(1, n("s", 8)),
      fase: "espera",
      timer: 0,
      acum: 0,
      antes: -1,
      activo: true
    });
    return true;
  }
  actualizar(dt, botones = 0) {
    if (!this.activo) return;
    const nuevos = this.antes < 0 ? 0 : botones & ~this.antes;
    this.antes = botones;
    if (this.fase === "espera") {
      if (nuevos & this.mascara) {
        this.fase = "fundido";
        this.op.cancelar?.();
        this.op.fundido?.(Math.ceil(256 / this.paso));
      }
      return;
    }
    this.acum += Math.min(dt, .25) * 30;
    while (this.acum >= 1) {
      this.acum -= 1;
      this.timer += this.paso;
    }
    if (this.timer > 256 && !this.op.vozSonando?.()) {
      const op = this.op, a = this.actor;
      this.activo = false;
      this.op = null;
      op.alTerminar?.(a);
    }
  }
  cortar() {
    this.activo = false;
    this.op = null;
  }
}

export class LifeUp {
  constructor() {
    this.activo = false;
  }
  iniciar(actor, op = {}) {
    const n = k => {
      const v = actor?.opts?.[k]?.[0];
      return typeof v === "number" ? v : null;
    };
    this.op = op;
    this.actor = actor;
    this.max = n("m") ?? 256;
    this.paso = n("c") ?? 8;
    this.pasoMax = this.paso;
    this.resta = n("l") ?? Math.max(0, this.max - op.vida());
    this.t = 0;
    this.acum = 0;
    this.activo = true;
    return true;
  }
  actualizar(dt) {
    if (!this.activo) return;
    this.acum += Math.min(dt, .25) * 30;
    while (this.acum >= 1 && this.activo) {
      this.acum -= 1;
      this.cuadro();
    }
  }
  cuadro() {
    const op = this.op;
    let max = op.max(), vida = op.vida();
    if (this.resta <= 0) max = Math.min(this.max, max + this.pasoMax);
    if (this.resta < this.paso) this.paso = this.resta;
    vida += this.paso;
    this.resta -= this.paso;
    if (vida > this.max) vida = this.max;
    if (vida > max) max = vida;
    op.setMax(max);
    op.setVida(vida);
    if ((this.t += 1) >= 12) {
      this.t -= 12;
      op.se?.(126);
    }
    if (max >= this.max) {
      this.activo = false;
      this.op = null;
      op.alTerminar?.(this.actor);
    }
  }
  cortar() {
    this.activo = false;
    this.op = null;
  }
}

const DURACION_ESCENA = {
  "10A_DEMO": 190,
  "11B_DEMO": 150
};

export class EscenaPendiente {
  constructor() {
    this.lista = [];
  }
  get activo() {
    return this.lista.length > 0;
  }
  iniciar(actor, op = {}) {
    this.lista.push({
      actor: actor,
      op: op,
      t: 0,
      dur: (DURACION_ESCENA[actor?.tipo] ?? 150) / 30
    });
    return true;
  }
  actualizar(dt) {
    for (const e of this.lista.slice()) if ((e.t += dt) >= e.dur) {
      this.lista.splice(this.lista.indexOf(e), 1);
      e.op.alTerminar?.(e.actor);
    }
  }
  cortar() {
    this.lista = [];
  }
}

const ZOOM_10A = 5e3, FOV_10A = 2 * Math.atan(123.6 / ZOOM_10A) * 180 / Math.PI;

const rsin = a => Math.round(4096 * Math.sin(2 * Math.PI * a / 4096));

const t2 = v => Math.trunc(v / 2), t8 = v => Math.trunc(v / 8), t32 = v => Math.trunc(v / 32);

export class Escena10A {
  constructor() {
    this.activo = false;
    this.camara = null;
    this.registro = [];
  }
  iniciar(actor, op = {}) {
    this.cortar();
    Object.assign(this, {
      actor: actor,
      op: op,
      activo: true,
      f50: 0,
      acum: 0,
      tiempo: 0,
      ojo: [ 0, -28e3, -23e3 ],
      f38: [ 0, 0, 0 ],
      f30: [ 0, 0, 0 ],
      registro: []
    });
    this.mira = this._mira();
    const hud = typeof document !== "undefined" ? document.getElementById("hud") : null;
    this.hudAntes = hud ? hud.hidden : null;
    if (hud) hud.hidden = true;
    this._engancharReinicio();
    globalThis.__escena10A = this;
    this.cuadro();
    return true;
  }
  _snake() {
    const p = this.op.snake?.();
    return p ? [ Math.round(p.x * 1e3), Math.round(p.y * 1e3), Math.round(p.z * 1e3) ] : [ 0, -29e3, 27e3 ];
  }
  actualizar(dt) {
    if (!this.activo) return;
    this.acum += Math.min(dt, .25) * 30;
    while (this.acum >= 1 && this.activo) {
      this.acum -= 1;
      this.cuadro();
    }
  }
  cuadro() {
    const op = this.op, lerp = n => {
      for (let i = 0; i < 3; i++) this.f38[i] = Math.trunc((this.f38[i] * (n - 1) + this.f30[i]) / n);
    };
    if (this.tiempo % 60 === 0) op.se?.(135);
    const f = this.f50;
    if (f === 0) {
      const inv = op.inventario;
      this.item = inv?.item ?? -1;
      this.arma = inv?.arma ?? -1;
      if ([ 1, 5, 6, 12 ].includes(this.item)) try {
        inv.equiparItem(-1);
      } catch {}
      if (this.arma === 9 || this.arma === 4) try {
        inv.equiparArma(-1);
      } catch {}
      this.f38 = this._snake();
      this.f38[1] += 1e4;
      this.f30 = this.f38.slice();
    } else if (f < 20) {
      this.f30 = this._snake();
      lerp(16);
    } else if (f < 100) {
      this.f30 = this._snake();
      lerp(8);
    } else if (f < 190) {
      this.f30 = [ 1e3, -29e3, 20500 ];
      lerp(8);
    }
    this._camara();
    this.f50++;
    this.tiempo++;
    if (f === 0 || f === 100) this.registro.push({
      f: f,
      ojo: this.ojo.slice(),
      blanco: this.f38.slice()
    });
    if (f >= 190) this.terminar();
  }
  _camara() {
    const T = this.tiempo;
    const dy = t32(rsin(T << 6) - t2(rsin(T * 31)) - t2(rsin(T * 180)));
    const dx = t32(rsin(T * 23) - t2(rsin(T * 45)) - t2(rsin(T * 139)));
    const b = [ this.f38[0] + dx, this.f38[1] + dy, this.f38[2] ], o = this.ojo;
    const c = [ o[0] + t8(b[0] - o[0]), o[1] + t8(b[1] - o[1]), o[2] + t8(b[2] - o[2]) ];
    const V = globalThis.__mgs?.cam?.position?.constructor;
    const v3 = p => V ? new V(p[0] / 1e3, p[1] / 1e3, p[2] / 1e3) : {
      x: p[0] / 1e3,
      y: p[1] / 1e3,
      z: p[2] / 1e3
    };
    this.camara = {
      pos: v3(o),
      mira: v3(c),
      fov: FOV_10A,
      zoom: ZOOM_10A
    };
  }
  _mira() {
    if (typeof document === "undefined") return null;
    const d = document.createElement("div");
    d.className = "mira-10a";
    d.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:6;";
    const cv = document.createElement("canvas");
    cv.width = 640;
    cv.height = 448;
    cv.style.cssText = "width:100%;height:100%;";
    const x = cv.getContext("2d");
    x.fillStyle = "#000";
    x.fillRect(0, 0, 640, 448);
    x.globalCompositeOperation = "destination-out";
    x.beginPath();
    x.ellipse(320, 224, 250, 200, 0, 0, Math.PI * 2);
    x.fill();
    x.globalCompositeOperation = "source-over";
    x.strokeStyle = "rgba(0,0,0,.85)";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(70, 224);
    x.lineTo(570, 224);
    x.moveTo(320, 24);
    x.lineTo(320, 424);
    x.stroke();
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(70, 224);
    x.lineTo(250, 224);
    x.moveTo(390, 224);
    x.lineTo(570, 224);
    x.moveTo(320, 260);
    x.lineTo(320, 424);
    x.stroke();
    for (let k = 1; k <= 4; k++) {
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(314, 224 + k * 12);
      x.lineTo(326, 224 + k * 12);
      x.stroke();
    }
    d.appendChild(cv);
    (document.getElementById("hud")?.parentNode || document.body).appendChild(d);
    return d;
  }
  _engancharReinicio() {
    const g = globalThis.__mgs?.guion;
    if (!g?.op || g.op.__esc10a) return;
    g.op.__esc10a = true;
    const r = g.op.reinicio, yo = this;
    g.op.reinicio = function(...x) {
      yo.cortar();
      return r ? r.apply(this, x) : undefined;
    };
  }
  terminar() {
    if (!this.activo) return;
    const op = this.op, a = this.actor, inv = op.inventario;
    try {
      if (this.arma === 9 || this.arma === 4) inv?.equiparArma(this.arma);
      if ([ 1, 5, 6, 12 ].includes(this.item)) inv?.equiparItem(this.item);
    } catch {}
    this.cortar();
    try {
      op.alTerminar?.(a);
    } catch (e) {
      console.warn("10A_DEMO", e);
    }
  }
  cortar() {
    if (this.activo && this.hudAntes != null) {
      const hud = document.getElementById("hud");
      if (hud) hud.hidden = this.hudAntes;
    }
    this.activo = false;
    this.camara = null;
    this.mira?.remove();
    this.mira = null;
    this.hudAntes = null;
  }
}

const ANG_PS = 2 * Math.PI / 4096;

const TECLAS_WAKE = {
  ArrowUp: "arriba",
  KeyW: "arriba",
  ArrowDown: "abajo",
  KeyS: "abajo",
  ArrowLeft: "izq",
  KeyA: "izq",
  ArrowRight: "der",
  KeyD: "der"
};

export class Despertar {
  constructor() {
    this.activo = false;
    this.camara = null;
    this.teclas = {};
  }
  iniciar(actor, op = {}) {
    this.cortar();
    const o = actor?.opts || {}, nums = k => Array.isArray(o[k]) ? o[k].filter(x => typeof x === "number") : [];
    const b = nums("b"), p = nums("p"), d = nums("d");
    if (b.length < 4 || p.length < 3 || d.length < 3) return false;
    Object.assign(this, {
      actor: actor,
      op: op,
      activo: true,
      b: b,
      pos: p.slice(0, 3),
      base: d.slice(0, 3),
      obj: d.slice(0, 3),
      rot: d.slice(0, 3),
      acum: 0,
      nombre: (actor.nombre ?? 0) & 65535
    });
    this._k = (e, si) => {
      const t = TECLAS_WAKE[e.code];
      if (t) this.teclas[t] = si;
    };
    this._kd = e => this._k(e, true);
    this._ku = e => this._k(e, false);
    addEventListener("keydown", this._kd);
    addEventListener("keyup", this._ku);
    engancharMensajeWake(this);
    this._engancharReinicio();
    globalThis.__despertar = this;
    this._camara();
    return true;
  }
  mensaje(destino, v) {
    if (!this.activo || (destino & 65535) !== this.nombre || ((v?.[0] ?? 0) & 65535) !== 32273 || v.length < 4) return false;
    this.base = [ v[1], v[2], v[3] ];
    return true;
  }
  actualizar(dt) {
    if (!this.activo) return;
    this.acum += Math.min(dt, .25) * 30;
    while (this.acum >= 1 && this.activo) {
      this.acum -= 1;
      this.cuadro();
    }
  }
  cuadro() {
    const t = this.teclas, b = this.b, g = typeof navigator !== "undefined" && navigator.getGamepads ? [ ...navigator.getGamepads() ].find(x => x) : null;
    const ej = i => g && Math.abs(g.axes[i] || 0) > .5 ? Math.sign(g.axes[i]) : 0;
    const arriba = t.arriba || ej(1) < 0, abajo = t.abajo || ej(1) > 0, izq = t.izq || ej(0) < 0, der = t.der || ej(0) > 0;
    let x = this.base[0];
    if (arriba) x -= b[0]; else if (abajo) x += b[1];
    let y = this.base[1];
    if (izq) y += b[2]; else if (der) y -= b[3];
    if (x < -1e3) x = -1e3;
    this.obj = [ x, y, this.base[2] ];
    for (let i = 0; i < 3; i++) this.rot[i] += Math.trunc((this.obj[i] - this.rot[i]) / 8);
    this._camara();
  }
  _camara() {
    const V = globalThis.__mgs?.cam?.position?.constructor;
    const yaw = this.rot[1] * ANG_PS + Math.PI, pitch = -this.rot[0] * ANG_PS, cp = Math.cos(pitch);
    const p = this.pos.map(v => v / 1e3), m = [ p[0] - Math.sin(yaw) * cp, p[1] + Math.sin(pitch), p[2] - Math.cos(yaw) * cp ];
    const v3 = q => V ? new V(q[0], q[1], q[2]) : {
      x: q[0],
      y: q[1],
      z: q[2]
    };
    this.camara = {
      pos: v3(p),
      mira: v3(m),
      fov: 42.2
    };
  }
  _engancharReinicio() {
    const g = globalThis.__mgs?.guion;
    if (!g?.op || g.op.__despertar) return;
    g.op.__despertar = true;
    const r = g.op.reinicio, yo = this;
    g.op.reinicio = function(...x) {
      yo.cortar();
      return r ? r.apply(this, x) : undefined;
    };
  }
  cortar() {
    if (this._kd) {
      removeEventListener("keydown", this._kd);
      removeEventListener("keyup", this._ku);
      this._kd = this._ku = null;
    }
    this.activo = false;
    this.camara = null;
    this.teclas = {};
  }
}

function engancharMensajeWake(w) {
  const g = globalThis.__mgs?.guion;
  if (!g?.op || g.op.__wake) return;
  g.op.__wake = true;
  const m = g.op.mensaje;
  g.op.mensaje = function(d, v, i) {
    return w.mensaje(d, v) || (m ? m.call(this, d, v, i) : undefined);
  };
}

export function camaraEscena(...escenas) {
  for (const e of escenas) if (e?.camara) return e.camara;
  return null;
}

const FPS_JUEGO = 30;

const TICK_60 = 1 / 60;

const BASE_ASSETS = "assets/";

const hex4 = n => ((n ?? 0) & 65535).toString(16).padStart(4, "0");

const opNum = (actor, k, d = null) => {
  const v = actor?.opts?.[k]?.[0];
  return typeof v === "number" ? v : v && typeof v === "object" && typeof v.id === "number" ? v.id : d;
};

const jsonDe = url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);

function musicaJuego(si) {
  try {
    globalThis.__mgs?.audio?.codigo?.(si ? 33554178 : 33554177);
  } catch {}
}

function armarCapa() {
  const raiz = document.createElement("div");
  raiz.className = "movie-capa";
  raiz.style.cssText = "position:fixed;inset:0;background:#000;z-index:44;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;touch-action:none;" + "text-transform:none;letter-spacing:normal;font-weight:normal;font-style:normal;text-align:left;";
  const pant = document.createElement("div");
  pant.style.cssText = "position:relative;width:min(100vw,calc(100vh*320/224));aspect-ratio:320/224;";
  const ventana = document.createElement("div");
  ventana.style.cssText = "position:absolute;left:0;width:100%;top:calc(100%*24/224);height:calc(100%*160/224);overflow:hidden;background:#000;";
  const fundido = document.createElement("div");
  fundido.style.cssText = "position:absolute;inset:0;background:#000;opacity:1;pointer-events:none;";
  const sub = document.createElement("div");
  sub.style.cssText = 'position:absolute;left:4%;right:4%;top:calc(100%*186/224);text-align:center;color:#e8e8e8;font-family:"Trebuchet MS",Verdana,Arial,sans-serif;' + "font-size:calc(min(100vw,100vh*320/224)*0.034);text-shadow:1px 1px 0 #000,-1px -1px 0 #000;white-space:pre-line;line-height:1.2;";
  const boton = document.createElement("button");
  boton.textContent = "SALTEAR ▶▶";
  boton.style.cssText = "position:fixed;right:14px;bottom:14px;padding:10px 16px;font:bold 15px Consolas,monospace;color:#dfe;background:rgba(0,30,10,.75);border:1px solid #6c9;border-radius:4px;display:none;cursor:pointer;";
  pant.append(ventana, sub);
  ventana.appendChild(fundido);
  raiz.append(pant, boton);
  (document.getElementById("hud")?.parentNode || document.body).appendChild(raiz);
  return {
    raiz: raiz,
    pant: pant,
    ventana: ventana,
    fundido: fundido,
    sub: sub,
    boton: boton
  };
}

export class Movie {
  constructor({base: base = BASE_ASSETS} = {}) {
    this.base = base;
    this.activo = false;
    this.capa = null;
    this.creditos = null;
    this.registro = [];
  }
  iniciar(actor, op = {}) {
    this.cortar();
    this.op = op;
    this.actor = actor;
    this.t = 0;
    this.activo = true;
    this.tipo = actor?.tipo || "MOVIE";
    this.estado = "cargando";
    this.pausado = false;
    this.registro = [];
    op.negro?.(true);
    musicaJuego(false);
    engancharMensajes(this);
    globalThis.__movie = this;
    const pedido = this._pedido = {};
    const listo = fn => x => {
      if (this._pedido === pedido && this.activo) fn(x);
    };
    if (this.tipo === "ED_TELOP") this._telop(listo); else if (this.tipo === "ENDINGROLL") this._rodillo(listo); else this._video(listo);
    return true;
  }
  get congela() {
    return this.activo && this.tipo === "MOVIE";
  }
  log(t, x = {}) {
    this.registro.push({
      t: +this.t.toFixed(2),
      e: t,
      ...x
    });
    if (globalThis.__mgs?.debugMovie) console.log("[movie]", t, JSON.stringify(x));
  }
  _video(listo) {
    const id = hex4(this.actor?.nombre);
    this.id = id;
    jsonDe(`${this.base}demos/movie/${id}.json`).then(listo(info => {
      if (!info) {
        this.estado = "sin-video";
        this.log("sin video", {
          id: id
        });
        return;
      }
      this.info = info;
      this.f40 = 11 + (opNum(this.actor, "i", 0) || 0);
      this.f42 = info.cuadros - 11 - (opNum(this.actor, "o", 0) || 0);
      const c = this.capa = armarCapa();
      const v = this.media = document.createElement("video");
      v.playsInline = true;
      v.preload = "auto";
      v.src = `${this.base}${info.archivo}`;
      v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
      c.ventana.insertBefore(v, c.fundido);
      v.addEventListener("ended", () => {
        if (this.media === v) this.terminar("fin");
      });
      v.addEventListener("error", () => {
        if (this.media === v) {
          this.log("error del video");
          this.estado = "sin-video";
          this._quitarCapa();
        }
      });
      this._entrada(c);
      this.estado = "reproduciendo";
      this._play(v);
      this.log("video", {
        id: id,
        cuadros: info.cuadros,
        fps: info.fps,
        i: this.f40,
        o: this.f42,
        sub: info.sub.length
      });
    }));
  }
  _play(m) {
    const p = m.play();
    if (p) p.catch(e => {
      if (e.name === "NotAllowedError" && !m.muted) {
        m.muted = true;
        this.log("sin sonido (falta un toque)");
        m.play().catch(() => {});
      }
    });
  }
  _entrada(c) {
    if (this.tipo !== "MOVIE") return;
    const cortar = () => {
      if (this.activo && this.estado === "reproduciendo") {
        this.log("cortado");
        this.terminar("cortado");
      }
    };
    this._teclas = e => {
      if ([ "Enter", "Escape", "Space", "KeyC", "NumpadEnter" ].includes(e.code)) {
        e.stopPropagation();
        e.preventDefault();
        cortar();
      }
    };
    addEventListener("keydown", this._teclas, true);
    c.raiz.addEventListener("pointerdown", () => {
      c.boton.style.display = "";
      clearTimeout(this._tb);
      this._tb = setTimeout(() => {
        c.boton.style.display = "none";
      }, 3500);
    });
    c.boton.addEventListener("click", e => {
      e.stopPropagation();
      cortar();
    });
    this._cortarMando = cortar;
  }
  _mando() {
    if (!this._cortarMando) return;
    const g = ctl.mando();
    if (!g) return;
    const ap = !!(g.buttons[ctl.B.CRUZ]?.pressed || g.buttons[ctl.B.START]?.pressed);
    if (ap && this._mandoAntes === false) this._cortarMando();
    this._mandoAntes = ap;
  }
  _subtitulo(t, lista) {
    const l = lista?.find(x => t >= x[0] && t < x[1]);
    const txt = l ? l[2] : "";
    if (this.capa && this.capa.sub.textContent !== txt) this.capa.sub.textContent = txt;
  }
  _telop(listo) {
    const tex = hex4(opNum(this.actor, "t", 0) ?? 0);
    this.f30 = opNum(this.actor, "f", 30) ?? 30;
    this.f34 = opNum(this.actor, "d", 150) ?? 150;
    this.cargarCreditos().then(listo(cr => {
      const lista = cr?.archivos?.[tex];
      if (!lista?.length) {
        this.estado = "sin-video";
        this.log("ED_TELOP sin imágenes", {
          tex: tex
        });
        return;
      }
      const c = this.capa = armarCapa();
      c.fundido.style.opacity = 0;
      const cv = this.lienzo = document.createElement("canvas");
      cv.width = 320;
      cv.height = 160;
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      c.ventana.insertBefore(cv, c.fundido);
      this.imgs = lista.map(x => {
        const im = new Image;
        im.src = this.base + x.png;
        return im;
      });
      this.tel = {
        f24: 0,
        f28: 0,
        f2C: 0,
        msg: false
      };
      this.vozSub = null;
      engancharVoces(this);
      this.estado = "reproduciendo";
      this.log("ED_TELOP", {
        tex: tex,
        n: lista.length,
        f: this.f30,
        d: this.f34
      });
    }));
  }
  _telopCuadro() {
    const w = this.tel;
    let color = -1, val = 0;
    switch (w.f24) {
     case 0:
      w.f24 = 1;
      w.f2C = this.f30;
      break;

     case 1:
      color = 192 - --w.f2C * 192 / this.f30;
      if (w.f2C <= 0) {
        w.f24 = 2;
        w.f2C = this.f34;
      }
      break;

     case 2:
      w.f2C--;
      color = 192;
      if (w.f2C <= 0 && this.f34 !== -1) val = 1;
      if (w.msg) {
        w.msg = false;
        val = 1;
      }
      if (val) {
        w.f24 = 3;
        w.f2C = this.f30;
      }
      break;

     case 3:
      color = --w.f2C * 192 / this.f30;
      if (w.f2C <= 0) {
        if (++w.f28 >= this.imgs.length) w.f24 = -1; else {
          w.f24 = 4;
          w.f2C = 15;
        }
      }
      break;

     case 4:
      if (--w.f2C <= 0) w.f24 = 0;
      break;

     case -1:
      this.terminar("fin");
      return;
    }
    const x = this.lienzo.getContext("2d");
    x.clearRect(0, 0, 320, 160);
    const im = this.imgs[w.f28];
    if (color > 0 && im?.complete && im.naturalWidth) {
      x.filter = `brightness(${(color / 128).toFixed(3)})`;
      x.drawImage(im, Math.round((320 - im.naturalWidth) / 2), Math.round((160 - im.naturalHeight) / 2));
      x.filter = "none";
    }
  }
  cargarCreditos() {
    if (!this.creditos) this.creditos = jsonDe(`${this.base}demos/creditos/creditos.json`);
    return this.creditos;
  }
  _rodillo(listo) {
    const voz = opNum(this.actor, "v", 0) || 0;
    this.f30 = opNum(this.actor, "w", 660) ?? 660;
    const id = hex4(this.actor?.nombre);
    Promise.all([ this.cargarCreditos(), voz ? jsonDe(`${this.base}codec/vox/${voz}.json`) : jsonDe(`${this.base}demos/movie/${id}.json`) ]).then(listo(([cr, info]) => {
      const lista = cr?.archivos?.credit || [];
      if (!lista.length || !info) {
        this.estado = "sin-video";
        this.log("ENDINGROLL sin datos", {
          id: id,
          voz: voz
        });
        return;
      }
      const c = this.capa = armarCapa();
      c.fundido.style.opacity = 0;
      this.rod = {
        fase: this.f30 > 0 ? "espera" : "arranca",
        espera: this.f30,
        sombra: 40,
        terminoMedio: false,
        durMedio: voz ? info.seg : info.duracion
      };
      if (voz) {
        const a = this.media = new Audio;
        a.preload = "auto";
        urlVoz(`${this.base}codec/vox/`, voz, info).then(({url: url, esBlob: esBlob}) => {
          if (this.media !== a) {
            if (esBlob) URL.revokeObjectURL(url);
            return;
          }
          if (esBlob) a._blob = url;
          a.src = url;
          if (this.rod?.fase === "rueda") this._play(a);
        }, () => {
          if (this.media === a) this.rod.terminoMedio = true;
        });
      } else {
        const v = this.media = document.createElement("video");
        v.playsInline = true;
        v.preload = "auto";
        v.src = `${this.base}${info.archivo}`;
        v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;filter:brightness(0.625);";
        c.ventana.insertBefore(v, c.fundido);
      }
      const media = this.media;
      media.addEventListener("ended", () => {
        if (this.media === media) this.rod.terminoMedio = true;
      });
      media.addEventListener("error", () => {
        if (this.media === media) {
          this.rod.terminoMedio = true;
          this.log("ENDINGROLL: el audio/video no carga");
        }
      });
      const cv = this.lienzo = document.createElement("canvas");
      cv.width = 320;
      cv.height = 160;
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      c.ventana.insertBefore(cv, c.fundido);
      this.imgs = lista.map(x => {
        const im = new Image;
        im.src = this.base + x.png;
        return im;
      });
      const T = cr.tiempos_rodillo || [];
      let fin = 0;
      this.paginas = lista.map((x, k) => {
        const s = Math.max((T[k] ?? 0) * TICK_60, fin);
        fin = s + x.h / 45;
        return {
          s: s,
          h: x.h
        };
      });
      this.estado = "reproduciendo";
      this.log("ENDINGROLL", {
        voz: voz,
        id: id,
        paginas: lista.length,
        fin: +fin.toFixed(1),
        w: this.f30
      });
    }));
  }
  _rodilloCuadro() {
    const r = this.rod, m = this.media;
    if (r.fase === "espera") {
      if (--r.espera <= 0) r.fase = "arranca";
      return;
    }
    if (r.fase === "arranca") {
      r.fase = "rueda";
      this._play(m);
    }
    const tm = m.currentTime || 0;
    if (tm !== r.tmAntes || m.paused || m.ended) {
      r.tmAntes = tm;
      r.trabado = 0;
    } else if ((r.trabado = (r.trabado || 0) + 1) > 90 && !r.propio) {
      r.propio = true;
      r.tPropio = tm;
      this.log("ENDINGROLL: el video no avanza; sigue con el reloj de la página");
    }
    if (r.propio) r.tPropio += 1 / FPS_JUEGO;
    const t = this.tRodillo != null ? this.tRodillo : r.propio ? Math.max(r.tPropio, tm) : tm;
    if (r.propio && r.durMedio && t >= r.durMedio) r.terminoMedio = true;
    const x = this.lienzo.getContext("2d");
    x.clearRect(0, 0, 320, 160);
    for (let k = 0; k < this.paginas.length; k++) {
      const p = this.paginas[k], im = this.imgs[k];
      if (t < p.s) break;
      const y = 160 - (t - p.s) * 45;
      if (y < 160 && y + p.h > 0 && im?.complete && im.naturalWidth) x.drawImage(im, 0, Math.round(y));
    }
    const ultima = this.paginas[this.paginas.length - 1];
    const listoTexto = t > ultima.s + (ultima.h + 160) / 45;
    if (r.fase === "rueda" && (r.terminoMedio || m.ended) && listoTexto) r.fase = "sale";
    if (r.fase === "sale") {
      this.capa.fundido.style.opacity = (1 - Math.max(0, r.sombra) / 40).toFixed(3);
      if (--r.sombra < 0) this.terminar("fin");
    }
  }
  actualizar(dt) {
    if (!this.activo) return;
    this.t += dt;
    if (this.estado === "cargando") {
      if (this.t > 60) {
        this.log("no cargó en 60 s");
        this.estado = "sin-video";
      }
      return;
    }
    if (this.estado === "sin-video") {
      this._tNegro = (this._tNegro || 0) + dt;
      if (this._tNegro >= 2) this.terminar("sin video");
      return;
    }
    const m = this.media;
    if (m && this.estado === "reproduciendo" && !(this.tipo === "ENDINGROLL" && this.rod?.fase === "espera")) {
      if (dt === 0 && !m.paused && !this.pausado) {
        this.pausado = true;
        m.pause();
      } else if (dt > 0 && this.pausado) {
        this.pausado = false;
        this._play(m);
      }
    }
    if (dt === 0) return;
    this._acum = (this._acum || 0) + Math.min(dt, .25) * FPS_JUEGO;
    if (this.tipo === "ED_TELOP") {
      while (this._acum >= 1 && this.activo) {
        this._acum -= 1;
        this._telopCuadro();
      }
      const vs = this.vozSub, src = globalThis.__mgs?.codec?.vozJuego;
      if (this.activo && vs) {
        if (src && src !== vs.src) {
          vs.src = src;
          vs.t0 = performance.now() / 1e3;
        }
        if (vs.t0 != null) this._subtitulo(performance.now() / 1e3 - vs.t0, vs.sub);
      }
      return;
    }
    if (this.tipo === "ENDINGROLL") {
      while (this._acum >= 1 && this.activo) {
        this._acum -= 1;
        this._rodilloCuadro();
      }
      return;
    }
    this._acum = 0;
    this._mando();
    const info = this.info;
    if (!info || !m) return;
    const tv = m.currentTime || 0, n = Math.floor(tv * info.fps) + 1;
    let fade = 0;
    if (this.f40 > n) fade = (this.f40 - n) / this.f40; else if (this.f42 < n) fade = Math.min(1, (n - this.f42) / Math.max(1, info.cuadros - 1 - this.f42));
    this.capa.fundido.style.opacity = fade.toFixed(3);
    this._subtitulo(tv, info.sub);
    if (n >= info.cuadros - 1 && tv > 0) this.terminar("fin");
  }
  mensaje(destino, valores) {
    if (!this.activo || this.tipo !== "ED_TELOP" || ((this.actor?.nombre ?? -1) & 65535) !== (destino & 65535)) return false;
    if (((valores?.[0] ?? 0) & 65535) === 10681 && this.tel) {
      this.tel.msg = true;
      this.log("mensaje #29b9");
    }
    return true;
  }
  terminar(motivo) {
    if (!this.activo) return;
    const op = this.op, a = this.actor;
    this.log("termina", {
      motivo: motivo
    });
    this._limpiar();
    op?.negro?.(false);
    musicaJuego(true);
    try {
      op?.alTerminar?.(a);
    } catch (e) {
      console.warn("movie", e);
    }
  }
  _quitarCapa() {
    if (this.media) {
      try {
        this.media.pause();
        this.media.removeAttribute("src");
        this.media.load();
        if (this.media._blob) URL.revokeObjectURL(this.media._blob);
      } catch {}
      this.media = null;
    }
    this.capa?.raiz.remove();
    this.capa = null;
    this.lienzo = null;
  }
  _limpiar() {
    this.activo = false;
    this.op = null;
    this._pedido = null;
    if (this._teclas) {
      removeEventListener("keydown", this._teclas, true);
      this._teclas = null;
    }
    clearTimeout(this._tb);
    this._cortarMando = null;
    this._tNegro = 0;
    this._acum = 0;
    this.tRodillo = null;
    this._quitarCapa();
  }
  cortar() {
    if (this.activo) {
      this.op?.negro?.(false);
      musicaJuego(true);
    }
    this._limpiar();
  }
  lienzoVR(k = 2) {
    if (typeof document === "undefined") return null;
    let cv = this._cvVR;
    if (!cv) {
      cv = this._cvVR = document.createElement("canvas");
      cv.width = 320 * k;
      cv.height = 224 * k;
    }
    const x = cv.getContext("2d"), W = cv.width, H = cv.height, s = W / 320, vy = 24 * s, vh = 160 * s;
    x.globalAlpha = 1;
    x.filter = "none";
    x.fillStyle = "#000";
    x.fillRect(0, 0, W, H);
    const c = this.capa;
    if (!this.activo || !c) return cv;
    const m = this.media;
    if (m && m.tagName === "VIDEO" && m.readyState >= 2 && m.videoWidth) {
      x.imageSmoothingEnabled = true;
      if (this.tipo === "ENDINGROLL") x.filter = "brightness(0.625)";
      try {
        x.drawImage(m, 0, vy, W, vh);
      } catch {}
      x.filter = "none";
    }
    if (this.lienzo) {
      x.imageSmoothingEnabled = false;
      x.drawImage(this.lienzo, 0, vy, W, vh);
    }
    const op = +(c.fundido.style.opacity || 0);
    if (op > 0) {
      x.fillStyle = `rgba(0,0,0,${Math.min(1, op)})`;
      x.fillRect(0, vy, W, vh);
    }
    const txt = c.sub.textContent;
    if (txt) {
      const filas = String(txt).split("\n"), alto = 12 * s;
      x.font = `${Math.round(10.5 * s)}px "Trebuchet MS", Verdana, Arial, sans-serif`;
      x.textAlign = "center";
      x.textBaseline = "top";
      x.lineWidth = Math.max(2, 1.5 * s);
      x.strokeStyle = "#000";
      x.fillStyle = "#e8e8e8";
      x.lineJoin = "round";
      filas.forEach((f, i) => {
        const y = 186 * s + i * alto;
        x.strokeText(f, W / 2, y);
        x.fillText(f, W / 2, y);
      });
    }
    return cv;
  }
  saltarVR() {
    if (this.activo && this.tipo === "MOVIE" && this._cortarMando) {
      this._cortarMando();
      return true;
    }
    return false;
  }
}

function engancharVoces(movie) {
  const c = globalThis.__mgs?.codec;
  if (!c?.reproducirVoz || c.__movieVoz) return;
  c.__movieVoz = true;
  const orig = c.reproducirVoz;
  c.reproducirVoz = function(id, op = {}) {
    if (movie.activo && movie.tipo === "ED_TELOP") {
      const antes = c.vozJuego;
      jsonDe(`${movie.base}codec/vox/${id}.json`).then(d => {
        if (d?.sub && movie.activo) {
          movie.vozSub = {
            sub: d.sub,
            t0: null,
            src: antes
          };
          movie.log("voz con subtítulos", {
            id: id
          });
        }
      });
    }
    return orig.call(this, id, op);
  };
}

function engancharMensajes(movie) {
  const g = globalThis.__mgs?.guion;
  if (!g?.op || g.op.__movie) return;
  g.op.__movie = true;
  const m = g.op.mensaje;
  g.op.mensaje = function(d, v, i) {
    return movie.mensaje(d, v) || (m ? m.call(this, d, v, i) : undefined);
  };
}
