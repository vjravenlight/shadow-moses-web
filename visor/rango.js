// MGS web — FeniXVOID · Project Ravenlight
import { Fuente, modular, cargarImg, marcoPS1 } from "./pantallas_vr.js";

import { Partida } from "./partida.js";

import { VarsGCL } from "./codec_gcl.js";

import * as ctl from "./controles.js";

const BASE = "assets/rango/";

const FPS = 30;

const SE = {
  RANKING: 125,
  CURSOR: 31,
  EXIT: 33
};

const NIVEL_TXT = [ "VERY EASY", "EASY", "NORMAL", "HARD", "EXTREME" ];

const C_FONDO = 64, C_SCORE = [ 46, 72, 61 ], C_LINEA = [ 82, 140, 123 ], C_NOMBRE = [ 165, 74, 74 ], C_ESPECIAL = [ 74, 107, 148 ];

const C_ROTULO = [ 82, 140, 123 ], C_VALOR = [ 140, 181, 181 ];

const C_PREGUNTA = [ 86, 137, 116 ], C_SI = [ 192, 192, 192 ], C_NO = [ 46, 72, 61 ];

const TECLAS = {
  Enter: "o",
  NumpadEnter: "o",
  Space: "o",
  KeyZ: "o",
  KeyE: "o",
  Escape: "x",
  KeyX: "x",
  Backspace: "x",
  KeyQ: "x",
  ArrowLeft: "izq",
  KeyA: "izq",
  ArrowRight: "der",
  KeyD: "der",
  ArrowUp: "arriba",
  KeyW: "arriba",
  ArrowDown: "abajo",
  KeyS: "abajo"
};

const MANDO = [ [ ctl.B.CIRCULO, "o" ], [ ctl.B.CRUZ, "x" ], [ ctl.B.START, "start" ], [ ctl.B.CUADRADO, "otro" ], [ ctl.B.TRIANGULO, "otro" ], [ ctl.B.ARRIBA, "arriba" ], [ ctl.B.ABAJO, "abajo" ], [ ctl.B.IZQ, "izq" ], [ ctl.B.DER, "der" ] ];

export const NOMBRES = [ "HOUND", "DOBERMAN", "FOX", "BIG BOSS", "PIGEON", "FALCON", "HAWK", "EAGLE", "PIRANHA", "SHARK", "JAWS", "ORCA", "PIG", "ELEPHANT", "MAMMOTH", "WHALE", "CAT", "DEER", "ZEBRA", "HIPPOPOTAMUS", "KOALA", "CAPYBARA", "SLOTH", "GIANT PANDA", "CHICKEN", "MOUSE", "RABBIT", "OSTRICH", "PUMA", "LEOPARD", "PANTHER", "JAGUAR", "COMODO DRAGON", "IGUANA", "ALLIGATOR", "CROCODILE", "MONGOOSE", "HYENA", "JACKAL", "TASMANIAN DEVIL", "SPIDER", "TARANTULA", "CENTIPEDE", "SCORPION", "FLYING SQUIRREL", "BAT", "FLYING FOX", "NIGHT OWL" ];

const tr = Math.trunc;

const hex4 = n => n.toString(16).padStart(4, "0");

export function estadisticas(vars, frames = null) {
  const L = o => vars?.get?.("$w:L" + hex4(o)) ?? 0, F = n => vars?.get?.(n) ?? 0;
  let horas = L(182), seg = L(184);
  if (frames != null && frames >= 0) {
    const s = Math.floor(frames / 60);
    horas = Math.floor(s / 3600);
    seg = s % 3600;
  }
  return {
    nivel: L(2),
    alertas: L(156),
    muertes: L(158),
    raciones: L(172),
    continues: L(174),
    guardados: L(176),
    horas: horas,
    seg: seg,
    clear: L(6),
    sigilo: L(94),
    bandana: L(96),
    camara: L(98),
    tuvo: {
      camara: F("$f:G03f6.1"),
      bandana: F("$f:G03f6.2"),
      sigilo: F("$f:G03f6.3")
    }
  };
}

export function calcularRango(e) {
  const V = e.alertas | 0, K = e.muertes | 0, R = e.raciones | 0, C = e.continues | 0, S = e.guardados | 0, H = e.horas | 0, M = tr((e.seg | 0) / 60);
  const ratio = K - 25 > 0 ? tr(V * 10 / (K - 25)) : 1e3;
  const L = (e.nivel | 0) + 1, col = b => L >= 0 && L <= 4 ? b + Math.max(0, L - 1) : null;
  let r;
  if (C === 0 && V < 5 && K < 26 && R < 2 && H < 3) r = col(0); else if (H < 2 || H === 2 && M < 30) r = col(4); else if (K >= 250) r = col(8); else if (H >= 18 && R >= 130 && S >= 80) r = col(24); else if (R >= 130) r = col(12); else if (S >= 80) r = col(16); else if (H >= 18) r = col(20); else if (V < 31) r = col(ratio < 9 ? 28 : ratio < 17 ? 36 : 40); else if (V < 56) r = col(ratio < 5 ? 32 : ratio < 21 ? 36 : 44); else r = col(ratio < 9 ? 32 : ratio < 17 ? 36 : 44);
  if (r == null) r = 0;
  const usados = [];
  if ((e.sigilo | 0) > 0) usados.push("STEALTH");
  if ((e.bandana | 0) > 0) usados.push("BANDANA");
  const esp = {
    camara: false,
    sigilo: false,
    bandana: false
  };
  if ((e.nivel | 0) !== -1) {
    esp.camara = (e.camara | 0) >= 0;
    esp.sigilo = (e.clear | 0) >= 2;
    esp.bandana = (e.clear | 0) === 1 || (e.clear | 0) >= 3;
  }
  return {
    indice: r,
    nombre: NOMBRES[r],
    filas: 1 + usados.length,
    usados: usados,
    especiales: esp,
    cantEspeciales: +esp.camara + +esp.sigilo + +esp.bandana,
    ratio: ratio
  };
}

export function rangoDe(vars, frames = null) {
  const e = estadisticas(vars, frames);
  const v = {
    ...e,
    sigilo: e.tuvo.sigilo ? 1 : e.sigilo,
    bandana: e.tuvo.bandana ? 1 : e.bandana,
    camara: e.tuvo.camara ? 1 : e.camara
  };
  return {
    ...calcularRango(v),
    est: v
  };
}

export class PantallaRango {
  constructor({base: base = BASE} = {}) {
    this.base = base;
    this.activo = false;
    this.version = 0;
    this.registro = [];
    this.buf = typeof document !== "undefined" ? document.createElement("canvas") : null;
    if (this.buf) {
      this.buf.width = 320;
      this.buf.height = 224;
    }
    this.cv = null;
  }
  log(t, x = {}) {
    this.registro.push({
      t: this.time,
      estado: this.state,
      e: t,
      ...x
    });
  }
  async _cargar() {
    if (this._carga) return this._carga;
    this._carga = (async () => {
      const [json, piezas, fondo, fondoBB, fuente] = await Promise.all([ fetch(this.base + "rango.json").then(r => r.ok ? r.json() : null).catch(() => null), cargarImg(this.base + "piezas.png"), cargarImg(this.base + "fondo.png"), cargarImg(this.base + "fondo_bb.png"), cargarImg("assets/hud/fuente.png") ]);
      const pz = {};
      if (json && piezas) for (const [n, [x, y, w, h, abr]] of Object.entries(json.piezas)) {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(piezas, x, y, w, h, 0, 0, w, h);
        pz[n] = {
          img: c,
          w: w,
          h: h,
          abr: abr
        };
      }
      return {
        json: json,
        pz: pz,
        fondo: fondo,
        fondoBB: fondoBB,
        fuente: new Fuente(fuente)
      };
    })();
    return this._carga;
  }
  async iniciar(op = {}) {
    this.cerrar();
    if (op.vars?.g && op.vars?.l) {
      const c = new VarsGCL;
      c.g.set(op.vars.g.subarray(0, c.g.length));
      c.l.set(op.vars.l.subarray(0, c.l.length));
      op = {
        ...op,
        vars: c
      };
    }
    this.op = op;
    this.activo = true;
    this.cargando = true;
    globalThis.__rango = this;
    const r = this.rango = rangoDe(op.vars, op.frames);
    const e = r.est;
    this.horas = e.horas;
    this.min = tr(e.seg / 60);
    this.segs = e.seg % 60;
    Object.assign(this, {
      time: 0,
      state: 0,
      select: 0,
      count: 0,
      acum: 0,
      curZ: false,
      cur: null,
      guardando: false,
      terminado: false
    });
    if (op.x === 1) this.state = 3;
    this.log("rango", {
      indice: r.indice,
      nombre: r.nombre,
      filas: r.filas,
      especiales: r.especiales,
      est: e
    });
    this._armarLienzo();
    this.datos = await this._cargar();
    if (!this.activo) return;
    this.cargando = false;
    this._dibujar();
  }
  get nombre() {
    return this.rango?.nombre;
  }
  boton(b) {
    if (!this.activo || this.cargando || this.guardando) return false;
    if (this.state === 1) {
      this.state = 2;
      this.time = 0;
      this.log("botón: se apaga");
      return true;
    }
    if (this.state !== 3) return true;
    if (this.select === 1) {
      if (b === "der") {
        this.select = 2;
        this._se(SE.CURSOR);
      } else if (b === "o") this._si(); else if (b === "x") this._no();
    } else if (this.select === 2) {
      if (b === "izq") {
        this.select = 1;
        this._se(SE.CURSOR);
      } else if (b === "o" || b === "x") this._no();
    }
    return true;
  }
  tocar(x, y) {
    if (!this.activo || this.cargando || this.guardando) return;
    if (this.state !== 3) {
      this.boton("o");
      return;
    }
    if (this.select === 0) return;
    if (y >= 96 && y < 120) {
      if (x >= 86 && x < 140) {
        if (this.select !== 1) {
          this.select = 1;
          this._se(SE.CURSOR);
        } else this._si();
      } else if (x >= 182 && x < 236) {
        if (this.select !== 2) {
          this.select = 2;
          this._se(SE.CURSOR);
        } else this._no();
      }
    }
  }
  _no() {
    this._se(SE.EXIT);
    this.state = 4;
    this.time = 0;
    this.curZ = false;
    this.log("NO");
  }
  async _si() {
    this.log("YES: guardar");
    this.guardando = true;
    let ranura = 0;
    try {
      const p = await this.partidaClear();
      ranura = this.op.guardar ? await this.op.guardar(p) : 0;
    } catch (e) {
      console.warn("rango: no se pudo guardar", e);
      ranura = null;
    }
    if (!this.activo) return;
    this.guardando = false;
    if (ranura == null) {
      this.log("no se guardó: vuelve la pregunta");
      Object.assign(this, {
        state: 3,
        select: 0,
        count: 0,
        curZ: false
      });
      return;
    }
    this.log("guardado", {
      ranura: ranura
    });
    this._terminar("guardado");
  }
  async partidaClear() {
    const v = this.op.vars, L = o => v?.get?.("$w:L" + hex4(o)) ?? 0;
    const camara = v?.get?.("$f:G03f6.1") ?? 0, cf = L(6);
    const p = await Partida.nueva(L(2) + 1);
    for (const o of [ 0, 2, 4, 6 ]) p.vars.set("$w:L" + hex4(o), L(o));
    p.vars.set("$w:L0008", 1);
    if (camara > 0) p.vars.set("$w:L0062", 1);
    if (cf === 1 || cf > 2) p.vars.set("$w:L0060", 1);
    if (cf >= 2) p.vars.set("$w:L005e", 1);
    p._checkpoint(p.st);
    p.visor.nuevaPartida = true;
    p.visor.clear = cf;
    p.visor.rango = this.rango?.nombre;
    p.visor.area = 1;
    p.log(`clear ${cf}: NEW GAME con ${[ cf === 1 || cf > 2 ? "pañuelo" : "", cf >= 2 ? "traje" : "", camara > 0 ? "cámara" : "" ].filter(Boolean).join(", ") || "nada"}`);
    return p;
  }
  actualizar(dt) {
    if (!this.activo) return;
    this._mando();
    if (this.cargando || this.guardando) return;
    this.acum += Math.min(dt, .25) * FPS;
    let cambio = false;
    while (this.acum >= 1 && this.activo && !this.guardando) {
      this.acum -= 1;
      this._act();
      cambio = true;
    }
    if (cambio && this.activo) this._dibujar();
  }
  _se(id) {
    try {
      this.op?.se?.(id);
    } catch {}
  }
  _act() {
    switch (this.state) {
     case 0:
      if (this.time === 1) this._se(SE.RANKING);
      if (this.time >= 43) this.state = 1;
      break;

     case 1:
      break;

     case 2:
      if (this.time > 32) {
        this.state = 3;
        this.select = 0;
        this.count = 0;
        if (this.rango.est.nivel === -1) {
          this._terminar("muy fácil");
          return;
        }
      }
      break;

     case 3:
      if (this.select === 0 && this.count >= 14) this.select = 1;
      this.count++;
      break;

     case 4:
      if (this.time > 16) {
        this._terminar("no");
        return;
      }
      break;
    }
    this.time++;
  }
  _terminar(motivo) {
    if (!this.activo) return;
    this.terminado = true;
    this.log("termina", {
      motivo: motivo
    });
    const f = this.op?.alTerminar;
    this.cerrar();
    try {
      f?.(motivo);
    } catch (e) {
      console.warn("rango", e);
    }
  }
  cerrar() {
    this.activo = false;
    if (this._tec) {
      removeEventListener("keydown", this._tec, true);
      this._tec = null;
    }
    if (this.cv) {
      this.cv.remove();
      this.cv = null;
    }
  }
  _armarLienzo() {
    if (typeof document === "undefined") return;
    const cv = this.cv = document.createElement("canvas");
    cv.className = "rango-capa";
    Object.assign(cv.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: 47,
      background: "#000",
      imageRendering: "pixelated",
      touchAction: "none"
    });
    (document.getElementById("hud")?.parentNode || document.body).appendChild(cv);
    cv.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      const r = cv.getBoundingClientRect(), m = this._marco(r.width, r.height);
      this.tocar((ev.clientX - r.left - m.ox) / m.sx, (ev.clientY - r.top - m.oy) / m.sy);
    });
    this._tec = ev => {
      if (!this.activo || ev.repeat) return;
      if (this.op?.partidaAbierta?.()) return;
      if (/^F\d+$/.test(ev.code) || /^(Shift|Control|Alt|Meta|OS|ContextMenu|Tab)/.test(ev.code)) return;
      const b = TECLAS[ev.code] || "otro";
      ev.stopPropagation();
      ev.preventDefault();
      this.boton(b);
    };
    addEventListener("keydown", this._tec, true);
    this._mandoAnt = new Set(MANDO.map(([i]) => i).filter(i => this._pad()?.buttons[i]?.pressed));
  }
  _pad() {
    return ctl.mando();
  }
  _mando() {
    const g = this._pad();
    if (!g || this.op?.partidaAbierta?.()) return;
    const ahora = new Set;
    for (const [i] of MANDO) if (g.buttons[i]?.pressed) ahora.add(i);
    const x = g.axes?.[0] || 0;
    if (x < -.6) ahora.add("ejeIzq");
    if (x > .6) ahora.add("ejeDer");
    for (const k of ahora) if (!this._mandoAnt?.has(k)) {
      const b = k === "ejeIzq" ? "izq" : k === "ejeDer" ? "der" : MANDO.find(([i]) => i === k)?.[1];
      if (b) this.boton(b);
    }
    this._mandoAnt = ahora;
  }
  _marco(w, h) {
    return marcoPS1(w, h);
  }
  _dibujar() {
    const d = this.datos, b = this.buf;
    if (!d || !b) return;
    const x = b.getContext("2d");
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "source-over";
    x.globalAlpha = 1;
    x.imageSmoothingEnabled = false;
    x.fillStyle = "#000";
    x.fillRect(0, 0, 320, 224);
    if (this.state <= 2) this._tabla(x); else if (this.state === 3) this._pregunta(x);
    this.version++;
    this._aPantalla();
  }
  _aPantalla() {
    const cv = this.cv;
    if (!cv) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1), W = Math.round(cv.clientWidth * dpr) || 1, H = Math.round(cv.clientHeight * dpr) || 1;
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
    }
    const x = cv.getContext("2d"), m = this._marco(W, H);
    x.imageSmoothingEnabled = false;
    x.fillStyle = "#000";
    x.fillRect(0, 0, W, H);
    x.drawImage(this.buf, m.ox, m.oy, 320 * m.sx, 224 * m.sy);
  }
  _pieza(x, n, rgb, X, Y, W = null, H = null, aditiva = null) {
    const p = this.datos.pz[n];
    if (!p) return;
    const img = modular(p.img, rgb.map(c => Math.max(0, c | 0)));
    if (!img) return;
    x.globalCompositeOperation = aditiva ?? false ? "lighter" : "source-over";
    x.drawImage(img, 0, 0, p.w, p.h, Math.round(X), Math.round(Y), W ?? p.w, H ?? p.h);
    x.globalCompositeOperation = "source-over";
  }
  _cursor(x, X, Y, W, H, shade, modo) {
    if (shade <= 0) return;
    X += 160;
    Y += 112;
    const k = modo ? 2 : 0, e = 8;
    const x0 = X - e + k, x1 = X + k, x2 = X + W - k, y0 = Y - e + k, y1 = Y + k, y2 = Y + H - k, c = [ shade, shade, shade ];
    const P = (n, a, bq, cw, ch) => {
      if (cw > 0 && ch > 0) this._pieza(x, n, c, a, bq, cw, ch, true);
    };
    P("cur_lu", x0, y0, e, e);
    P("cur_ru", x2, y0, e, e);
    P("cur_ld", x0, y2, e, e);
    P("cur_rd", x2, y2, e, e);
    P("cur_u", x1, y0, x2 - x1, e);
    P("cur_d", x1, y2, x2 - x1, e);
    P("cur_l", x0, y1, e, y2 - y1);
    P("cur_r", x2, y1, e, y2 - y1);
    P("cur_c", x1, y1, x2 - x1, y2 - y1);
  }
  _texto(x, s, X, Y, rgb, alin = 0) {
    this.datos.fuente.texto(x, s, X, Y, rgb.map(c => Math.max(0, c | 0)), alin);
  }
  _tabla(x) {
    const t = Math.max(0, this.time - 1), st = this.state, r = this.rango;
    const f = st === 2 ? c => c - tr(Math.min(t, 32) * c / 32) : c => c;
    const F = rgb => rgb.map(f);
    const fondo = r.indice === 3 ? this.datos.fondoBB : this.datos.fondo;
    let s = 0;
    if (st === 0) s = t >= 33 ? tr((Math.min(t, 42) - 32) * 64 / 10) : 0; else s = st === 1 ? C_FONDO : 64 - Math.min(t, 32) * 2;
    if (s > 0 && fondo) {
      x.drawImage(fondo, 0, 0);
      x.fillStyle = `rgba(0,0,0,${(1 - Math.min(128, s) / 128).toFixed(4)})`;
      x.fillRect(0, 0, 320, 224);
    }
    let x2 = -34, x3 = -34, y = -97;
    if (st === 0) {
      const tt = Math.min(t, 8);
      if (t < 29) y = -17; else if (t < 33) y = -17 - (t - 28) * 20;
      if (t < 9) {
        x2 = 206 - tt * 30;
        x3 = tt * 30 - 274;
      }
    }
    this._pieza(x, "rank_rank", F(C_SCORE), x2 + 160, y + 112, 68, 12, true);
    this._pieza(x, "rank_rank", F(C_SCORE), x3 + 160, y + 112, 68, 12, true);
    if (st === 0) {
      let sh = 0;
      if (t >= 13 && t < 17) sh = tr((t - 12) * 255 / 4); else if (t >= 17 && t < 25) sh = 255; else if (t >= 25 && t < 29) sh = 255 - tr((t - 24) * 255 / 4);
      this._cursor(x, -34, -17, 68, 12, sh, 0);
      return;
    }
    const LIN = {
      0: [ -63, 71 ],
      1: [ -63, 68 ],
      2: [ -67, 79 ],
      3: [ -73, 89 ]
    }[r.filas] || [ -63, 68 ];
    this._pieza(x, "rank_line1", F(C_LINEA), 125 + 160, LIN[0] + 112, 4, LIN[1]);
    this._pieza(x, "rank_line1", F(C_LINEA), -125 + 160, LIN[0] + 112, 4, LIN[1]);
    const mw = this.datos.json?.medio_ancho?.[r.indice] ?? 24;
    this._pieza(x, "n" + String(r.indice).padStart(2, "0"), F(C_NOMBRE), 40 - mw + 160, 30 + 112, mw * 2, 8);
    const e = r.especiales, n = r.cantEspeciales, esp = [];
    if (n === 1) {
      if (e.camara) esp.push([ "rank_spe_camera", -34, 65, 68 ]); else if (e.sigilo) esp.push([ "rank_spe_stealth", -38, 65, 76 ]); else if (e.bandana) esp.push([ "rank_spe_mugen", -38, 75, 76 ]);
    } else if (n === 2) {
      if (e.camara) esp.push([ "rank_spe_camera", -34, 65, 68 ]);
      if (e.sigilo) esp.push([ "rank_spe_stealth", -38, e.camara ? 77 : 65, 76 ]);
      if (e.bandana) esp.push([ "rank_spe_mugen", -38, 77, 76 ]);
    } else if (n === 3) esp.push([ "rank_spe_camera", -34, 65, 68 ], [ "rank_spe_stealth", -38, 77, 76 ], [ "rank_spe_mugen", -38, 89, 76 ]);
    for (const [pz, ex, ey, ew] of esp) this._pieza(x, pz, F(C_ESPECIAL), ex + 160, ey + 112, ew, 9);
    this._datos(x, F);
  }
  _datos(x, F) {
    const r = this.rango, e = r.est, R = F(C_ROTULO), V = F(C_VALOR);
    const y0 = {
      0: 60,
      1: 57,
      2: 53,
      3: 47
    }[r.filas] ?? 57, paso = r.filas === 0 ? 14 : 11;
    const fila = i => y0 + i * paso;
    let h = this.horas, m = this.min, s = this.segs;
    if (h >= 100) {
      h = 99;
      m = 59;
      s = 59;
    }
    this._texto(x, "PLAY TIME /", 164, fila(0), R, 1);
    const cif = [ [ 172, tr(h / 10) ], [ 181, h % 10 ], [ 199, tr(m / 10) ], [ 208, m % 10 ], [ 226, tr(s / 10) ], [ 235, s % 10 ] ];
    for (const [cx, d] of cif) this._texto(x, String(d), cx, fila(0), V);
    this._texto(x, ":", 193, fila(0), V);
    this._texto(x, ":", 220, fila(0), V);
    const num = (n, Y) => {
      n = Math.max(0, Math.min(999, n | 0));
      if (n >= 100) this._texto(x, String(tr(n / 100)), 172, Y, V);
      if (n >= 10) this._texto(x, String(tr(n / 10) % 10), 181, Y, V);
      this._texto(x, String(n % 10), 190, Y, V);
    };
    const filas = [ [ "SAVE /", e.guardados, "TIMES" ], [ "CONTINUE /", e.continues, "TIMES" ], [ "BEING FOUND /", e.alertas, "TIMES" ], [ "ENEMIES /", e.muertes, "KILLED" ], [ "RATIONS /", e.raciones, "USED" ] ];
    filas.forEach(([rot, n, u], i) => {
      const Y = fila(i + 1);
      this._texto(x, rot, 164, Y, R, 1);
      num(n, Y);
      this._texto(x, u, 214, Y, R);
    });
    if (r.filas >= 1) {
      const Y = fila(-1);
      this._texto(x, "GAME LEVEL /", 164, Y, R, 1);
      this._texto(x, NIVEL_TXT[Math.max(0, Math.min(4, (e.nivel | 0) + 1))], 172, Y, V);
    }
    if (r.usados.length) {
      this._texto(x, r.usados.length > 1 ? "USED ITEMS /" : "USED ITEM /", 164, fila(6), R, 1);
      r.usados.forEach((u, i) => this._texto(x, u, 172, fila(6 + i), V));
    }
    this._texto(x, "CODE NAME", 115 - (this.datos.json?.medio_ancho?.[r.indice] ?? 24), 143, R);
    if ((e.nivel | 0) !== -1) this._texto(x, "SPECIAL ITEMS", 107, 163, R);
  }
  _pregunta(x) {
    const c = Math.max(0, this.count - 1);
    let ty = 50, cur = [ -68, -12, 40, 15 ], opciones = true;
    if (this.select === 0) {
      if (c < 5) {
        ty = 90;
        cur = [ -115, -27, 230, 15 ];
        opciones = false;
      } else if (c < 10) {
        ty = 90 - (c - 4) * 8;
        cur = [ -115, -27, 230, 15 ];
        opciones = false;
      } else if (c < 11) cur = [ -115, -27, 230, 15 ]; else if (c < 14) {
        const k = c - 10;
        cur = [ tr(k * 47 / 3) - 115, k * 5 - 27, 230 - tr(k * 190 / 3), 15 ];
      }
    } else if (this.select === 2) cur = [ 28, -12, 40, 15 ];
    this._texto(x, "SAVE COMPLETED MISSION DATA?", 45, ty, C_PREGUNTA);
    if (opciones) {
      this._texto(x, "YES", 100, 105, this.select === 2 ? C_NO : C_SI);
      this._texto(x, "NO", 200, 105, this.select === 2 ? C_SI : C_NO);
    }
    this._cursor(x, cur[0], cur[1], cur[2], cur[3], 255, 1);
  }
  firma() {
    return `${this.version}|${this.activo}`;
  }
}
