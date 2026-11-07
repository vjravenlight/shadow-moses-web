// MGS web — FeniXVOID · Project Ravenlight
import { dibujarCursor, seguir, tiempoTexto } from "./pantallas_vr.js";

const SE = {
  CURSOR: 31,
  ENTRAR: 177,
  VOLVER: 179,
  ELEGIR: 102,
  NO: 33
};

const GRIS = [ 148, 148, 148 ], CLARO = [ 206, 206, 206 ], OSCURO = [ 72, 72, 72 ], NARANJA = [ 208, 107, 57 ], VERDE = [ 120, 200, 150 ];

const FILAS = 11, Y0 = 50, ALTO = 13;

const limpio = s => String(s || "").replace(/["']/g, "").replace(/\s+/g, " ").trim();

const nivelDe = t => {
  const m = /(LEVEL|STAGE)\s+(\d+)/.exec(t || "");
  return m ? `${m[1]} ${m[2]}` : limpio(t);
};

export class MenuDisco {
  constructor(op) {
    this.op = op;
    this.base = op.base ?? "assets/";
    this.activo = false;
    this.f = 0;
    this.pila = [];
  }
  async cargar() {
    try {
      const r = await fetch(this.base + "vr/disco/catalogo.json");
      if (!r.ok) return this.datos = null;
      this.datos = await r.json();
    } catch {
      this.datos = null;
    }
    if (this.datos) this.arbol = this.armar(this.datos);
    return this.datos;
  }
  get hay() {
    return !!this.datos?.misiones?.length;
  }
  armar(D) {
    const M = D.misiones || [], arma = k => D.armas?.[k] || k.toUpperCase();
    const hoja = e => ({
      texto: e.grupo === "photo" ? e.st.toUpperCase().replace("_", " ") : nivelDe(e.titulo?.[1]),
      sub: limpio(e.sub),
      mision: e
    });
    const ordenN = (a, b) => (a.lnum || a.n) - (b.lnum || b.n) || a.clave.localeCompare(b.clave);
    const grupo = (texto, xs) => ({
      texto: texto,
      hijos: xs.slice().sort(ordenN).map(hoja),
      n: xs.length,
      jugables: xs.filter(x => x.jugable).length
    });
    const sneaking = [ [ 3, "NO WEAPON  PRACTICE" ], [ 4, "NO WEAPON  TIME ATTACK" ], [ 1, "SOCOM  PRACTICE" ], [ 2, "SOCOM  TIME ATTACK" ] ].map(([m, t]) => grupo(t, M.filter(e => e.grupo === "sneaking" && e.modo === m)));
    const porArma = (g, m1, m2) => (D.orden_armas || []).flatMap(k => [ [ m1, "PRACTICE" ], [ m2, "TIME ATTACK" ] ].map(([m, t]) => grupo(`${arma(k)}  ${t}`, M.filter(e => e.grupo === g && e.modo === m && e.st.slice(3, 6) === k))));
    const esp = [ [ "battle", 5, "1 MIN. BATTLE  VS. ENEMY" ], [ "battle", 6, "1 MIN. BATTLE  VS. TARGET" ], [ "ninja", null, "NINJA" ], [ "mystery", null, "MYSTERY" ], [ "vs12", null, "VS. 12 BATTLE" ], [ "vrmission", null, "VR MISSION" ], [ "puzzle", null, "PUZZLE" ], [ "variety", null, "VARIETY" ], [ "ng", null, "NG SELECTION" ], [ "photo", null, "PHOTOGRAPH" ] ].map(([g, m, t]) => grupo(t, M.filter(e => e.grupo === g && (m == null || e.modo === m))));
    const pag = (texto, hijos) => ({
      texto: texto,
      hijos: hijos.filter(h => h.n),
      n: hijos.reduce((s, h) => s + h.n, 0),
      jugables: hijos.reduce((s, h) => s + h.jugables, 0)
    });
    return {
      texto: "VR MISSIONS",
      hijos: [ pag("SNEAKING MODE", sneaking), pag("WEAPON MODE", porArma("weapon", 1, 2)), pag("ADVANCED MODE", porArma("advanced", 3, 4)), pag("SPECIAL MODE", esp), {
        texto: "VR TRAINING",
        volver: true
      } ]
    };
  }
  abrir(pila) {
    this.activo = true;
    this.f = 0;
    this.aviso = null;
    this.pila = pila?.length ? pila.map(p => ({
      ...p
    })) : [ {
      nodo: this.arbol,
      sel: 0,
      ini: 0
    } ];
    let n = this.arbol;
    for (const p of this.pila) {
      p.nodo = n;
      n = n.hijos?.[p.sel] || n;
    }
    this.cur = this.barra();
    this.fade = {
      modo: "entra",
      n: 0,
      total: 10
    };
  }
  cerrar() {
    this.activo = false;
  }
  get tope() {
    return this.pila[this.pila.length - 1];
  }
  get firma() {
    return `${this.pila.map(p => p.sel).join(".")}|${this.aviso?.texto || ""}|${this.fade ? this.fade.n : ""}`;
  }
  tecla(code, abajo) {
    if (!abajo || !this.activo || this.fade?.modo === "sale") return true;
    const k = {
      ArrowUp: "arriba",
      KeyW: "arriba",
      ArrowDown: "abajo",
      KeyS: "abajo",
      ArrowLeft: "izq",
      KeyA: "izq",
      ArrowRight: "der",
      KeyD: "der",
      Enter: "ok",
      Space: "ok",
      KeyE: "ok",
      Escape: "cruz",
      Backspace: "cruz",
      KeyQ: "cruz",
      KeyM: "cruz"
    }[code];
    if (!k) return false;
    const T = this.tope, n = T.nodo.hijos.length;
    if (k === "arriba" || k === "abajo") {
      const s = (T.sel + (k === "arriba" ? -1 : 1) + n) % n;
      if (s !== T.sel) {
        T.sel = s;
        this.op.sonar?.(SE.CURSOR);
        this.aviso = null;
      }
      if (T.sel < T.ini) T.ini = T.sel;
      if (T.sel >= T.ini + FILAS) T.ini = T.sel - FILAS + 1;
      return true;
    }
    if (k === "ok" || k === "der") return this.aceptar(k === "der"), true;
    if (k === "cruz" || k === "izq") return this.volver(), true;
    return true;
  }
  aceptar(soloEntrar = false) {
    const T = this.tope, h = T.nodo.hijos[T.sel];
    if (!h) return;
    if (h.volver) {
      if (!soloEntrar) {
        this.op.sonar?.(SE.VOLVER);
        this.op.salir?.();
      }
      return;
    }
    if (h.hijos) {
      this.pila.push({
        nodo: h,
        sel: 0,
        ini: 0
      });
      this.op.sonar?.(SE.ENTRAR);
      this.aviso = null;
      return;
    }
    if (soloEntrar) return;
    const e = h.mision;
    if (!e.jugable) {
      this.op.sonar?.(SE.NO);
      this.aviso = {
        texto: "NOT AVAILABLE",
        t: 75
      };
      return;
    }
    this.op.sonar?.(SE.ELEGIR);
    this.fade = {
      modo: "sale",
      n: 0,
      total: 10,
      fn: () => this.op.elegir?.(e)
    };
  }
  volver() {
    if (this.pila.length > 1) {
      this.pila.pop();
      this.op.sonar?.(SE.VOLVER);
      this.aviso = null;
      return;
    }
    this.op.sonar?.(SE.VOLVER);
    this.op.salir?.();
  }
  clic(x, y) {
    if (!this.activo || this.fade) return;
    if (y < 34 && x < 70 && this.pila.length > 1) return this.volver();
    const T = this.tope, i = Math.floor((y - Y0 + 2) / ALTO) + T.ini;
    if (x < 14 || x > 196 || y < Y0 - 2 || i < T.ini || i >= Math.min(T.nodo.hijos.length, T.ini + FILAS)) return;
    if (i === T.sel) this.aceptar(); else {
      T.sel = i;
      this.op.sonar?.(SE.CURSOR);
      this.aviso = null;
    }
  }
  barra() {
    const T = this.tope;
    return [ 14, Y0 - 3 + (T.sel - T.ini) * ALTO, 182, 12 ];
  }
  cuadro() {
    if (!this.activo) return;
    this.f++;
    seguir(this.cur, this.barra());
    if (this.aviso && --this.aviso.t <= 0) this.aviso = null;
    if (this.fade && ++this.fade.n >= this.fade.total) {
      const f = this.fade;
      this.fade = null;
      if (f.modo === "sale") {
        this.activo = false;
        f.fn?.();
      }
    }
  }
  dibujar(x, margen = 0) {
    if (!this.activo) return;
    const F = this.op.fuente, m = Math.ceil(margen);
    const fondo = this.op.fondo?.lienzo?.(320 + 2 * m);
    if (fondo) x.drawImage(fondo, -m, 0); else {
      x.fillStyle = "#000";
      x.fillRect(-m, 0, 320 + 2 * m, 224);
    }
    x.fillStyle = "rgba(0,0,0,0.45)";
    x.fillRect(-m, 0, 320 + 2 * m, 224);
    F.texto(x, "VR MISSIONS", 160, 12, CLARO, 2);
    const camino = this.pila.slice(1).map(p => limpio(p.nodo.texto)).join(" / ");
    if (camino) F.texto(x, camino.length > 44 ? camino.slice(-44) : camino, 160, 24, GRIS, 2);
    if (this.pila.length > 1) F.texto(x, "<", 8, 12, GRIS);
    x.fillStyle = "rgb(64,64,64)";
    x.fillRect(10, 36, 300, 1);
    const T = this.tope, H = T.nodo.hijos;
    dibujarCursor(x, this.op.marco, ...this.cur);
    for (let k = T.ini; k < Math.min(H.length, T.ini + FILAS); k++) {
      const h = H[k], y = Y0 + (k - T.ini) * ALTO, sel = k === T.sel;
      const ok = h.volver || (h.hijos ? h.jugables > 0 : h.mision?.jugable);
      F.texto(x, limpio(h.texto), 20, y, sel ? CLARO : ok ? GRIS : OSCURO);
      if (h.hijos) F.texto(x, `${h.jugables}/${h.n}`, 190, y, ok ? GRIS : OSCURO, 1); else if (h.mision && /^"/.test(h.mision.sub || "")) F.texto(x, h.sub.slice(0, 11), 190, y, sel ? CLARO : OSCURO, 1);
    }
    if (T.ini > 0) F.texto(x, "-", 104, Y0 - 10, GRIS, 2);
    if (T.ini + FILAS < H.length) F.texto(x, "+", 104, Y0 + FILAS * ALTO, GRIS, 2);
    this.panel(x, H[T.sel]);
    if (this.aviso) {
      x.fillStyle = "rgba(0,0,0,0.75)";
      x.fillRect(60, 196, 200, 14);
      F.texto(x, this.aviso.texto, 160, 200, NARANJA, 2);
    }
    if (this.fade) {
      const v = this.fade.modo === "entra" ? 1 - this.fade.n / this.fade.total : this.fade.n / this.fade.total;
      x.fillStyle = `rgba(0,0,0,${v})`;
      x.fillRect(-m, 0, 320 + 2 * m, 224);
    }
  }
  panel(x, h) {
    const F = this.op.fuente, X = 206, W = 108;
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(X - 4, 44, W + 4, 146);
    x.strokeStyle = "rgb(64,64,64)";
    x.strokeRect(X - 3.5, 44.5, W + 3, 145);
    if (!h) return;
    const escribir = (lineas, y0, rgb) => {
      let y = y0;
      for (const l of lineas) {
        for (const t of partir(limpio(l), 15)) {
          if (y > 180) return y;
          F.texto(x, t, X, y, rgb);
          y += 9;
        }
      }
      return y;
    };
    if (h.volver) {
      escribir([ "VR TRAINING", "MGS DISC 1" ], 52, GRIS);
      return;
    }
    if (h.hijos) {
      let y = escribir([ h.texto ], 52, CLARO) + 4;
      F.texto(x, `MISSIONS ${h.n}`, X, y, GRIS);
      y += 10;
      F.texto(x, `PLAYABLE ${h.jugables}`, X, y, h.jugables ? VERDE : OSCURO);
      return;
    }
    const e = h.mision;
    let y = escribir([ e.titulo?.[0], e.titulo?.[1] ], 50, CLARO) + 3;
    y = escribir((e.texto || []).filter(l => l), y, GRIS) + 3;
    if (e.limite) {
      F.texto(x, "LIMIT " + tiempoTexto(e.limite), X, y, GRIS);
      y += 10;
    }
    const r = e.jugable ? this.op.record?.(e) : null;
    if (r) r.forEach((t, i) => {
      if (y > 172) return;
      F.texto(x, `${[ "1st", "2nd", "3rd" ][i]} ${tiempoTexto(Math.abs(t.t))}`, X, y, t.def ? [ 104, 53, 28 ] : NARANJA);
      y += 9;
    });
    if (!e.jugable) F.texto(x, "NOT PORTED", X, 180, NARANJA);
  }
}

function partir(s, n) {
  const out = [];
  let l = "";
  for (const w of s.split(" ")) {
    if ((l + " " + w).trim().length > n) {
      if (l) out.push(l);
      l = w;
    } else l = (l + " " + w).trim();
  }
  if (l) out.push(l);
  return out;
}
