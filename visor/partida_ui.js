// MGS web — FeniXVOID · Project Ravenlight
import { Partida, RANURAS, RANURA_AUTO, SIGLAS_NIVEL } from "./partida.js";

import * as ctl from "./controles.js";

const NIVELES = [ "VERY EASY", "EASY", "NORMAL", "HARD", "EXTREME" ];

const MARCA_NIVEL = {
  0: "EXTRA"
};

const SE = {
  CURSOR: 31,
  OK: 32,
  ATRAS: 33,
  ZUMBADOR: 35
};

const TECLAS = {
  ArrowUp: "arriba",
  KeyW: "arriba",
  ArrowDown: "abajo",
  KeyS: "abajo",
  ArrowLeft: "izq",
  KeyA: "izq",
  ArrowRight: "der",
  KeyD: "der",
  Enter: "o",
  NumpadEnter: "o",
  Space: "o",
  KeyZ: "o",
  KeyE: "o",
  Escape: "x",
  KeyX: "x",
  Backspace: "x",
  KeyQ: "x"
};

const MANDO = [ [ ctl.B.ARRIBA, "arriba" ], [ ctl.B.ABAJO, "abajo" ], [ ctl.B.IZQ, "izq" ], [ ctl.B.DER, "der" ], [ ctl.B.CIRCULO, "o" ], [ ctl.B.START, "o" ], [ ctl.B.CRUZ, "x" ] ];

const dormir = ms => new Promise(r => setTimeout(r, ms));

const limpiar = t => String(t ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\//g, "-");

const CSS = `\n@font-face{font-family:'MGS';src:url(assets/hud/mgs.woff) format('woff');font-display:block}\n@font-face{font-family:'MGS8';src:url(assets/hud/mgs8.woff) format('woff');font-display:block}\n.pui{--k:2;--kr:2;position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,4,2,.97);\n  color:#7fb08c;font:calc(var(--kr)*8px)/1.25 'MGS',monospace;text-transform:uppercase;user-select:none;-webkit-user-select:none;\n  touch-action:manipulation;-webkit-font-smoothing:none;font-smooth:never;text-rendering:optimizeSpeed;\n  padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box}\n.pui[hidden]{display:none}\n.pui *{box-sizing:border-box}\n.pui-caja{width:min(100%,calc(var(--kr)*236px));max-height:100%;display:flex;flex-direction:column;gap:calc(var(--kr)*5px)}\n.pui-titulo{margin:0;font:calc(var(--k)*9px)/1.15 'MGS8',monospace;color:#b4f4ac;text-align:center;letter-spacing:0;text-shadow:0 0 calc(var(--k)*3px) rgba(120,248,112,.25)}\n.pui-sub{text-align:center;color:#4f7a5c;min-height:1.25em}\n.pui-lista{display:flex;flex-direction:column;gap:calc(var(--kr)*3px);overflow:auto;min-height:0;padding:2px;scrollbar-width:thin;scrollbar-color:#2f4a39 transparent}\n.pui-fila{display:grid;grid-template-columns:calc(var(--kr)*14px) 1fr;align-items:center;gap:calc(var(--kr)*4px);padding:calc(var(--kr)*3px) calc(var(--kr)*5px);\n  border:1px solid #2f4a39;background:rgba(4,14,8,.8);cursor:pointer;outline:1px solid #000;min-height:calc(var(--kr)*20px)}\n.pui-fila.sel{border-color:#b4f4ac;background:rgba(0,110,60,.38);box-shadow:0 0 0 1px #000,0 0 calc(var(--kr)*4px) rgba(120,248,112,.35)}\n.pui-fila.vacia .pui-area{color:#4f7a5c}\n.pui-fila.sola{grid-template-columns:1fr;text-align:center}\n.pui-num{font:calc(var(--kr)*9px)/1 'MGS8',monospace;color:#5f8c6c;text-align:center}\n.pui-fila.sel .pui-num{color:#b4f4ac}\n.pui-texto{display:flex;flex-direction:column;gap:calc(var(--kr)*2px);min-width:0}\n.pui-area{font:calc(var(--kr)*9px)/1.1 'MGS8',monospace;color:#b4f4ac;white-space:nowrap;overflow:hidden;text-overflow:clip}\n.pui-fila:not(.sel) .pui-area{color:#9fd8a0}\n.pui-fila.con-marca{position:relative}\n.pui-marca{position:absolute;right:calc(var(--kr)*6px);top:50%;transform:translateY(-50%);font:calc(var(--kr)*8px)/1 'MGS',monospace;color:#4f7a5c;pointer-events:none}\n.pui-det{display:flex;flex-wrap:wrap;gap:0 calc(var(--kr)*6px);color:#7fb08c;white-space:nowrap}\n.pui-det b{font-weight:normal;color:#5f8c6c}\n.pui-botones{display:flex;gap:calc(var(--kr)*3px);flex-wrap:wrap}\n.pui-boton{flex:1 1 0;min-width:calc(var(--kr)*44px);padding:calc(var(--kr)*3px) calc(var(--kr)*2px);border:1px solid #2f4a39;background:rgba(4,14,8,.8);\n  color:#7fb08c;font:inherit;text-transform:inherit;cursor:pointer;outline:1px solid #000;min-height:calc(var(--kr)*16px)}\n.pui-boton.sel{border-color:#b4f4ac;color:#b4f4ac;background:rgba(0,110,60,.38)}\n.pui-ayuda{text-align:center;color:#5f8c6c;min-height:1.25em;animation:pui-titila 2.133s steps(1) infinite}\n.pui-ayuda.fija{animation:none;color:#b4f4ac}\n@keyframes pui-titila{0%{opacity:1}81.25%{opacity:0}}\n.pui-pregunta{display:flex;justify-content:center;gap:calc(var(--kr)*8px)}\n.pui-archivo{display:none}\n`;

let activa = null;

if (typeof window !== "undefined") {
  const abajo = new Set;
  addEventListener("keydown", e => {
    if (!activa) return;
    abajo.add(e.code);
    const a = TECLAS[e.code];
    if (a) {
      e.preventDefault();
      activa._accion(a, e.repeat);
    }
    e.stopImmediatePropagation();
  }, true);
  addEventListener("keyup", e => {
    if (activa && abajo.has(e.code)) e.stopImmediatePropagation();
    abajo.delete(e.code);
  }, true);
}

export class PartidaUI {
  constructor(op = {}) {
    this.op = op;
    this.raiz = null;
    this.estado = null;
    this.registro = [];
    this.version = 0;
    this.modoVR = false;
  }
  get abierta() {
    return !!this.raiz && !this.raiz.hidden;
  }
  se(id) {
    try {
      this.op.sonido?.se?.(id);
    } catch {}
  }
  async inicio({dificultad: dificultad = null, cursor: cursor = 0} = {}) {
    for (;;) {
      const auto = Partida.leerRanura(RANURA_AUTO), ra = auto && Partida.resumenDe(auto);
      const filas = [ {
        texto: "NEW GAME",
        id: "nueva"
      }, {
        texto: "LOAD GAME",
        id: "cargar"
      } ];
      if (ra) filas.push({
        texto: "CONTINUE",
        id: "auto",
        detalle: [ ra.area, ra.siglas, ra.tiempo ]
      });
      const r = await this._menu({
        titulo: "JUGAR",
        sub: "",
        filas: filas,
        botones: [],
        ayuda: "O ELEGIR    X VOLVER",
        cursor: cursor,
        sola: true
      });
      if (!r) {
        this.cerrar();
        return null;
      }
      cursor = r.i;
      const id = filas[r.i].id;
      if (id === "nueva") {
        const d = dificultad ?? await this.nivel();
        if (d == null) continue;
        this.cerrar();
        return {
          accion: "nueva",
          dificultad: d
        };
      }
      if (id === "auto") {
        await this._mensaje("LOADING...", 12);
        this.cerrar();
        return {
          accion: "cargar",
          ranura: RANURA_AUTO,
          datos: auto
        };
      }
      const c = await this.cargar({
        cerrarAlFinal: false
      });
      if (c) {
        this.cerrar();
        return {
          accion: "cargar",
          ...c
        };
      }
    }
  }
  async nivel(cursor = null) {
    let c = cursor;
    if (c == null) {
      try {
        const s = localStorage.getItem("sm_dif");
        c = s !== null && +s >= 0 && +s <= 4 ? +s : 2;
      } catch {
        c = 2;
      }
    }
    const r = await this._menu({
      titulo: "SELECT GAME LEVEL",
      filas: NIVELES.map((t, i) => ({
        texto: t,
        marca: MARCA_NIVEL[i]
      })),
      ayuda: "O ELEGIR    X VOLVER",
      cursor: c,
      sola: true
    });
    return r ? r.i : null;
  }
  async cargar({cerrarAlFinal: cerrarAlFinal = true} = {}) {
    let cursor = 0;
    for (;;) {
      const lista = Partida.listar();
      const r = await this._menu({
        titulo: "LOAD DATA",
        sub: "MEMORY CARD",
        filas: lista.map(f => this._filaRanura(f)),
        botones: this.modoVR ? [ "VOLVER" ] : [ "IMPORTAR", "EXPORTAR", "VOLVER" ],
        ayuda: "O CARGAR    X VOLVER",
        cursor: cursor
      });
      if (!r || r.boton === "VOLVER") {
        if (cerrarAlFinal) this.cerrar();
        return null;
      }
      cursor = r.fila;
      const f = lista[r.fila];
      if (r.boton === "IMPORTAR") {
        await this._importar(f.ranura === RANURA_AUTO ? 0 : f.ranura);
        continue;
      }
      if (r.boton === "EXPORTAR") {
        if (f.datos) {
          Partida.descargar(f.datos);
          await this._mensaje("COMPLETE", 15);
        } else {
          this.se(SE.ZUMBADOR);
          await this._mensaje("NO FILE", 20);
        }
        continue;
      }
      if (!f.datos) {
        this.se(SE.ZUMBADOR);
        await this._mensaje("NO FILE", 20);
        continue;
      }
      await this._mensaje("LOADING...", 12);
      await this._mensaje("COMPLETE", 15);
      this.registro.push({
        cargar: f.ranura
      });
      if (cerrarAlFinal) this.cerrar();
      return {
        ranura: f.ranura,
        datos: f.datos
      };
    }
  }
  async guardar(partida, {area: area = null, areaIdx: areaIdx = null} = {}) {
    let cursor = 0;
    const sub = limpiar(area || partida?.resumen?.()?.area || "");
    for (;;) {
      const lista = Partida.listar().filter(f => f.ranura !== RANURA_AUTO);
      const r = await this._menu({
        titulo: "SAVE DATA",
        sub: sub,
        filas: lista.map(f => this._filaRanura(f)),
        botones: this.modoVR ? [ "VOLVER" ] : [ "EXPORTAR", "VOLVER" ],
        ayuda: "O GUARDAR    X VOLVER",
        cursor: cursor
      });
      if (!r || r.boton === "VOLVER") {
        this.cerrar();
        return null;
      }
      cursor = r.fila;
      const f = lista[r.fila];
      if (r.boton === "EXPORTAR") {
        if (partida) {
          Partida.descargar(partida.datos(area ? {
            area: area,
            areaIdx: areaIdx
          } : {}));
          await this._mensaje("COMPLETE", 15);
        }
        continue;
      }
      if (f.datos && !await this._preguntar("OVERWRITE OK?")) continue;
      await this._mensaje("SAVING...", 12);
      const d = partida?.guardar(f.ranura, area ? {
        area: area,
        areaIdx: areaIdx
      } : {});
      this.se(d ? SE.OK : SE.ZUMBADOR);
      await this._mensaje(d ? "COMPLETE" : "ERROR", 20);
      this.registro.push({
        guardar: f.ranura,
        ok: !!d
      });
      if (d) {
        this.cerrar();
        return f.ranura;
      }
    }
  }
  cerrar() {
    if (this.estado?.fin) this.estado.fin(null);
    this.estado = null;
    this._vr = null;
    this._vrPregunta = null;
    this.version++;
    if (this.raiz) this.raiz.hidden = true;
    if (activa === this) activa = null;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
  static engancharCodec(codec, {ui: ui, partida: partida, usar: usar = () => true}) {
    if (codec.__partidaUI) return;
    codec.__partidaUI = true;
    const ini = codec.iniciarGuardado, paso = codec.pasoGuardado, dib = codec.dibujarGuardado;
    codec.iniciarGuardado = function() {
      ini.call(this);
      const p = partida();
      if (!p || !usar()) return;
      const g = this.guardado;
      g.externo = true;
      g.listo = false;
      ui.guardar(p, {
        area: g.area,
        areaIdx: g.areaIdx
      }).then(() => {
        g.listo = true;
        const pd = this.pad;
        if (pd) {
          pd.estado = 0;
          pd.latchP = 0;
          pd.latchR = 0;
        }
      });
    };
    codec.pasoGuardado = function(pad) {
      const g = this.guardado;
      return g?.externo ? !!g.listo : paso.call(this, pad);
    };
    codec.dibujarGuardado = function(x) {
      if (this.guardado?.externo) {
        x.fillStyle = "#000";
        x.fillRect(0, 0, x.canvas.width, x.canvas.height);
        return;
      }
      dib.call(this, x);
    };
  }
  _filaRanura(f) {
    const n = f.ranura === RANURA_AUTO ? "A" : String(f.ranura + 1);
    if (!f.datos) return {
      num: n,
      texto: "NO FILE",
      vacia: true
    };
    const r = f.resumen;
    return {
      num: n,
      texto: r.area,
      detalle: [ `DISC ${r.disco}`, r.siglas, r.tiempo, f.ranura === RANURA_AUTO ? "AUTO" : `SAVE ${r.guardados}` ]
    };
  }
  _armar() {
    if (this.raiz) return;
    if (!document.getElementById("pui-css")) {
      const s = document.createElement("style");
      s.id = "pui-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    const r = document.createElement("div");
    r.className = "pui";
    r.hidden = true;
    r.style.zIndex = String(this.op.capa ?? 50);
    r.innerHTML = '<div class="pui-caja"><h1 class="pui-titulo"></h1><div class="pui-sub"></div><div class="pui-lista"></div>' + '<div class="pui-botones"></div><div class="pui-ayuda"></div></div><input class="pui-archivo" type="file" accept=".json,.mgs,application/json,text/plain,application/octet-stream">';
    (this.op.contenedor || document.body).appendChild(r);
    this.raiz = r;
    this.el = {
      titulo: r.querySelector(".pui-titulo"),
      sub: r.querySelector(".pui-sub"),
      lista: r.querySelector(".pui-lista"),
      botones: r.querySelector(".pui-botones"),
      ayuda: r.querySelector(".pui-ayuda"),
      archivo: r.querySelector(".pui-archivo")
    };
    r.addEventListener("contextmenu", e => {
      e.preventDefault();
      this._accion("x");
    });
    addEventListener("resize", () => this._escala());
  }
  _escala() {
    if (!this.raiz) return;
    const k = Math.max(2, Math.min(4, Math.floor(Math.min(innerWidth / 190, innerHeight / 150))));
    this.raiz.style.setProperty("--k", k);
    this.raiz.style.setProperty("--kr", Math.max(2, k - 1));
  }
  _abrir() {
    this._armar();
    this._escala();
    this.raiz.hidden = false;
    activa = this;
    document.exitPointerLock?.();
    if (!this._raf) {
      this._mando = new Map;
      const f = () => {
        this._leerMando();
        this._raf = requestAnimationFrame(f);
      };
      this._raf = requestAnimationFrame(f);
    }
  }
  _menu({titulo: titulo, sub: sub = "", filas: filas, botones: botones = [], ayuda: ayuda = "", cursor: cursor = 0, sola: sola = false}) {
    this._abrir();
    this._vr = {
      titulo: titulo,
      sub: sub,
      filas: filas,
      botones: botones,
      sola: sola
    };
    this.version++;
    const e = this.el;
    e.titulo.textContent = limpiar(titulo);
    e.sub.textContent = limpiar(sub);
    e.ayuda.textContent = limpiar(ayuda);
    e.ayuda.classList.remove("fija");
    e.lista.innerHTML = "";
    e.botones.innerHTML = "";
    const nodos = filas.map((f, i) => {
      const d = document.createElement("div");
      d.className = "pui-fila" + (f.vacia ? " vacia" : "") + (sola && !f.num ? " sola" : "");
      if (f.num != null) {
        const n = document.createElement("span");
        n.className = "pui-num";
        n.textContent = f.num;
        d.appendChild(n);
      }
      const t = document.createElement("span");
      t.className = "pui-texto";
      const a = document.createElement("span");
      a.className = "pui-area";
      a.textContent = limpiar(f.texto);
      t.appendChild(a);
      if (f.detalle) {
        const dt = document.createElement("span");
        dt.className = "pui-det";
        for (const x of f.detalle) {
          const b = document.createElement("span");
          b.textContent = limpiar(x);
          dt.appendChild(b);
        }
        t.appendChild(dt);
      }
      d.appendChild(t);
      if (f.marca) {
        const mk = document.createElement("span");
        mk.className = "pui-marca";
        mk.textContent = limpiar(f.marca);
        d.appendChild(mk);
        d.classList.add("con-marca");
      }
      e.lista.appendChild(d);
      d.addEventListener("pointerenter", ev => {
        if (ev.pointerType === "mouse" && this.estado?.nodos === todos) this._ir(i);
      });
      d.addEventListener("click", ev => {
        if (this.estado?.nodos !== todos) return;
        if (ev.pointerType !== "mouse" && ev.pointerType !== "" && this.estado.sel !== i) {
          this._ir(i);
          return;
        }
        this._ir(i);
        this._accion("o");
      });
      return d;
    });
    const bots = botones.map((b, j) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "pui-boton";
      d.textContent = limpiar(b);
      e.botones.appendChild(d);
      d.addEventListener("click", () => {
        if (this.estado?.nodos !== todos) return;
        this._ir(filas.length + j);
        this._accion("o");
      });
      return d;
    });
    const todos = [ ...nodos, ...bots ];
    return new Promise(fin => {
      this.estado = {
        nodos: todos,
        nf: filas.length,
        botones: botones,
        sel: -1,
        fila: Math.max(0, Math.min(filas.length - 1, cursor)),
        fin: v => {
          this.estado = null;
          fin(v);
        }
      };
      this._ir(Math.max(0, Math.min(todos.length - 1, cursor)), true);
    });
  }
  _ir(i, mudo = false) {
    const s = this.estado;
    if (!s || i === s.sel || i < 0 || i >= s.nodos.length) return;
    s.nodos[s.sel]?.classList.remove("sel");
    s.sel = i;
    s.nodos[i].classList.add("sel");
    this.version++;
    if (i < s.nf) {
      s.fila = i;
      s.nodos[i].scrollIntoView?.({
        block: "nearest"
      });
    }
    if (!mudo) this.se(SE.CURSOR);
  }
  _accion(a, repetida = false) {
    const s = this.estado;
    if (this._pregunta) {
      this._pregunta(a);
      return;
    }
    if (!s) return;
    const nb = s.nodos.length - s.nf, enBoton = s.sel >= s.nf;
    if (a === "arriba") this._ir(enBoton ? s.nf ? s.fila : s.sel : Math.max(0, s.sel - 1)); else if (a === "abajo") {
      if (!enBoton) this._ir(s.sel + 1 < s.nf ? s.sel + 1 : nb ? s.nf : s.sel);
    } else if (a === "izq") {
      if (enBoton && s.sel > s.nf) this._ir(s.sel - 1);
    } else if (a === "der") {
      if (enBoton && s.sel < s.nodos.length - 1) this._ir(s.sel + 1);
    } else if (a === "o" && !repetida) {
      const boton = enBoton ? s.botones[s.sel - s.nf] : null;
      this.se(boton === "VOLVER" ? SE.ATRAS : SE.OK);
      s.fin(enBoton ? {
        boton: boton,
        fila: s.fila,
        i: s.fila
      } : {
        i: s.sel,
        fila: s.sel
      });
    } else if (a === "x" && !repetida) {
      this.se(SE.ATRAS);
      s.fin(null);
    }
  }
  _preguntar(texto) {
    const e = this.el, prev = e.botones.innerHTML, ay = e.ayuda.textContent;
    e.ayuda.textContent = limpiar(texto);
    e.ayuda.classList.add("fija");
    e.botones.innerHTML = "";
    const si = document.createElement("button"), no = document.createElement("button");
    si.className = no.className = "pui-boton";
    si.type = no.type = "button";
    si.textContent = "YES";
    no.textContent = "NO";
    e.botones.append(si, no);
    const q = this._vrPregunta = {
      sel: 1
    };
    const marcar = () => {
      si.classList.toggle("sel", q.sel === 0);
      no.classList.toggle("sel", q.sel === 1);
      this.version++;
    };
    marcar();
    return new Promise(fin => {
      const cerrar = v => {
        this._pregunta = null;
        this._vrPregunta = null;
        e.botones.innerHTML = prev;
        e.ayuda.textContent = ay;
        e.ayuda.classList.remove("fija");
        this.version++;
        this.se(v ? SE.OK : SE.ATRAS);
        fin(v);
      };
      this._pregunta = a => {
        if (a === "izq" || a === "der" || a === "arriba" || a === "abajo") {
          q.sel = 1 - q.sel;
          marcar();
          this.se(SE.CURSOR);
        } else if (a === "o") cerrar(q.sel === 0); else if (a === "x") cerrar(false);
      };
      q.elegir = i => {
        if (q.sel !== i) {
          q.sel = i;
          marcar();
        }
        this._pregunta?.("o");
      };
      si.onclick = () => cerrar(true);
      no.onclick = () => cerrar(false);
    });
  }
  async _mensaje(texto, cuadros = 20) {
    const e = this.el;
    if (!e) return;
    const ay = e.ayuda.textContent;
    e.ayuda.textContent = limpiar(texto);
    e.ayuda.classList.add("fija");
    this.version++;
    const s = this.estado;
    this.estado = null;
    await dormir(cuadros * 1e3 / 30);
    e.ayuda.textContent = ay;
    e.ayuda.classList.remove("fija");
    this.estado = s;
    this.version++;
  }
  async _importar(ranura) {
    const inp = this.el.archivo;
    inp.value = "";
    const archivo = await new Promise(ok => {
      inp.onchange = () => ok(inp.files?.[0] || null);
      inp.click();
      setTimeout(() => {
        if (!inp.files?.length) addEventListener("focus", () => setTimeout(() => ok(inp.files?.[0] || null), 400), {
          once: true
        });
      }, 0);
    });
    if (!archivo) return false;
    let d;
    try {
      d = await Partida.leerArchivo(archivo);
    } catch {
      this.se(SE.ZUMBADOR);
      await this._mensaje("ERROR", 30);
      return false;
    }
    if (Partida.leerRanura(ranura) && !await this._preguntar("OVERWRITE OK?")) return false;
    const ok = Partida.escribirRanura(ranura, d);
    this.se(ok ? SE.OK : SE.ZUMBADOR);
    await this._mensaje(ok ? "COMPLETE" : "ERROR", 20);
    this.registro.push({
      importar: ranura,
      ok: ok
    });
    return ok;
  }
  get lienzoVR() {
    if (!this._cvVR && typeof document !== "undefined") {
      this._cvVR = document.createElement("canvas");
      this._cvVR.width = 640;
      this._cvVR.height = 480;
    }
    return this._cvVR;
  }
  firmaVR() {
    const fija = this.el?.ayuda?.classList.contains("fija"), t = performance.now() % 2133;
    return `${this.version}|${fija ? 1 : t < 1733 ? 1 : 0}|${typeof document !== "undefined" && document.fonts?.check?.("9px MGS8")}`;
  }
  botonVR(a, abajo = true) {
    if (abajo && a) this._accion(a, false);
  }
  apuntarVR(x, y) {
    const r = this._golpeVR(x, y);
    if (r?.i != null && this.estado?.nodos && !this._pregunta) this._ir(r.i);
  }
  tocarVR(x, y) {
    const r = this._golpeVR(x, y);
    if (!r) return;
    if (r.pregunta != null) {
      this._vrPregunta?.elegir?.(r.pregunta);
      return;
    }
    if (r.i != null && this.estado && !this._pregunta) {
      this._ir(r.i);
      this._accion("o");
    }
  }
  _golpeVR(x, y) {
    return (this._rectsVR || []).find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || null;
  }
  dibujarVR() {
    const c = this.lienzoVR;
    if (!c) return;
    const x = c.getContext("2d"), k = 2, d = this._vr, e = this.el, s = this.estado;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, 320, 240);
    x.fillStyle = "rgba(0,4,2,0.97)";
    x.fillRect(0, 0, 320, 240);
    x.strokeStyle = "#2f4a39";
    x.lineWidth = 1;
    x.strokeRect(.5, .5, 319, 239);
    this._rectsVR = [];
    if (!d) return;
    const W = 236, X0 = (320 - W) / 2, CLARO = "#b4f4ac", MEDIO = "#7fb08c", OSCURO = "#4f7a5c";
    const texto = (t, px, py, fuente, color, al = "left") => {
      x.font = fuente;
      x.fillStyle = color;
      x.textAlign = al;
      x.textBaseline = "top";
      x.fillText(limpiar(t), px, py);
    };
    const caja = (bx, by, bw, bh, sel) => {
      x.fillStyle = sel ? "rgba(0,110,60,0.38)" : "rgba(4,14,8,0.8)";
      x.fillRect(bx, by, bw, bh);
      x.strokeStyle = "#000";
      x.strokeRect(bx - .5, by - .5, bw + 1, bh + 1);
      x.strokeStyle = sel ? CLARO : "#2f4a39";
      x.strokeRect(bx + .5, by + .5, bw - 1, bh - 1);
    };
    const F8 = "9px MGS8, monospace", FT = "10px MGS8, monospace", FN = "8px MGS, Consolas, monospace";
    const conDet = d.filas.some(f => f.detalle), hf = conDet ? 26 : 18, gap = 3;
    const nb = d.botones.length || (this._vrPregunta ? 2 : 0);
    const alto = 12 + 5 + 9 + 5 + d.filas.length * hf + Math.max(0, d.filas.length - 1) * gap + (nb ? 5 + 15 : 0) + 5 + 9;
    let y = Math.max(6, Math.round((240 - alto) / 2));
    texto(d.titulo, 160, y, FT, CLARO, "center");
    y += 12 + 5;
    texto(d.sub || "", 160, y, FN, OSCURO, "center");
    y += 9 + 5;
    d.filas.forEach((f, i) => {
      const sel = s ? s.sel === i : false;
      caja(X0, y, W, hf, sel);
      let tx = X0 + 6;
      if (f.num != null) {
        texto(f.num, X0 + 12, y + (hf - 9) / 2, F8, sel ? CLARO : "#5f8c6c", "center");
        tx = X0 + 26;
      }
      const centrada = d.sola && f.num == null;
      texto(f.texto, centrada ? 160 : tx, y + (f.detalle ? 4 : (hf - 9) / 2), F8, f.vacia ? OSCURO : sel ? CLARO : "#9fd8a0", centrada ? "center" : "left");
      if (f.marca) texto(f.marca, X0 + W - 6, y + (hf - 8) / 2, FN, OSCURO, "right");
      if (f.detalle) {
        let dx = centrada ? 160 - 50 : tx;
        x.font = FN;
        for (const t of f.detalle) {
          texto(t, dx, y + 15, FN, MEDIO);
          dx += x.measureText(limpiar(t)).width + 8;
        }
      }
      this._rectsVR.push({
        x: X0,
        y: y,
        w: W,
        h: hf,
        i: i
      });
      y += hf + gap;
    });
    y += 5 - gap;
    if (this._vrPregunta) {
      const bw = (W - 3) / 2;
      [ "YES", "NO" ].forEach((t, j) => {
        const bx = X0 + j * (bw + 3), sel = this._vrPregunta.sel === j;
        caja(bx, y, bw, 15, sel);
        texto(t, bx + bw / 2, y + 4, FN, sel ? CLARO : MEDIO, "center");
        this._rectsVR.push({
          x: bx,
          y: y,
          w: bw,
          h: 15,
          pregunta: j
        });
      });
      y += 15 + 5;
    } else if (d.botones.length) {
      const bw = (W - 3 * (d.botones.length - 1)) / d.botones.length;
      d.botones.forEach((t, j) => {
        const bx = X0 + j * (bw + 3), i = d.filas.length + j, sel = s ? s.sel === i : false;
        caja(bx, y, bw, 15, sel);
        texto(t, bx + bw / 2, y + 4, FN, sel ? CLARO : MEDIO, "center");
        this._rectsVR.push({
          x: bx,
          y: y,
          w: bw,
          h: 15,
          i: i
        });
      });
      y += 15 + 5;
    }
    const fija = e?.ayuda?.classList.contains("fija"), ver = fija || performance.now() % 2133 < 1733;
    if (ver) texto(e?.ayuda?.textContent || "", 160, y, FN, fija ? CLARO : "#5f8c6c", "center");
  }
  _leerMando() {
    if (!activa || activa !== this || !navigator.getGamepads) return;
    const gp = ctl.mando();
    if (!gp) return;
    const ahora = new Set;
    for (const [b, a] of MANDO) if (gp.buttons[b]?.pressed) ahora.add(a);
    const y = gp.axes[1] || 0, x = gp.axes[0] || 0;
    if (y < -.5) ahora.add("arriba");
    if (y > .5) ahora.add("abajo");
    if (x < -.5) ahora.add("izq");
    if (x > .5) ahora.add("der");
    for (const a of ahora) {
      const t = (this._mando.get(a) || 0) + 1;
      this._mando.set(a, t);
      if (t === 1) this._accion(a, false); else if ([ "arriba", "abajo", "izq", "der" ].includes(a) && t > 12 && (t - 12) % 4 === 0) this._accion(a, true);
    }
    for (const a of [ ...this._mando.keys() ]) if (!ahora.has(a)) this._mando.delete(a);
  }
}

export { NIVELES, SIGLAS_NIVEL, RANURAS };
