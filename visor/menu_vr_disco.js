// MGS web — FeniXVOID · Project Ravenlight
import { dibujarCursor, seguir, tiempoTexto } from "./pantallas_vr.js";

import { panel as textoPanel, armados as armadosTextos } from "./vr_textos.js";

const CLAVE_TODO_DISCO = "mgs_vr_disco_todo";

const leerTodo = () => {
  try {
    return localStorage.getItem(CLAVE_TODO_DISCO) === "1";
  } catch {
    return false;
  }
};

const todoGlobal = () => {
  try {
    return localStorage.getItem("sm_todo_desbloqueado") === "1";
  } catch {
    return false;
  }
};

const guardarTodo = v => {
  try {
    localStorage.setItem(CLAVE_TODO_DISCO, v ? "1" : "0");
  } catch {}
};

const BIT_VRMISSION = 12 * 192 + 140;

export function desbloqueo(M, superadas) {
  const N = M?.nodos || [], bits = new Set;
  for (const k of superadas || []) {
    const b = M?.bit?.[k];
    if (b != null) bits.add(b);
  }
  const ab = N.map(n => n.abierta.map(Boolean)), marca = N.map(n => n.hijos.map(() => false)), comp = N.map(() => false);
  const abrir = (n, i) => {
    if (ab[n] && i < ab[n].length) ab[n][i] = true;
  };
  N.forEach((nd, n) => {
    let todo = nd.bit.length > 0;
    nd.bit.forEach((b, i) => {
      if (b >= 0 && bits.has(b)) {
        marca[n][i] = true;
        if (n !== 7 && i < nd.cuenta - 1) abrir(n, i + 1);
      } else todo = false;
    });
    comp[n] = todo;
  });
  const padres = {};
  N.forEach((nd, n) => nd.hijos.forEach((h, i) => {
    if (h >= 0 && nd.bit[i] < 0 && !nd.clave[i]) (padres[h] ||= []).push([ n, i ]);
  }));
  for (let paso = 0; paso < 3; paso++) {
    N.forEach((nd, n) => {
      if (comp[n] && n !== 67) for (const [p, i] of padres[n] || []) marca[p][i] = true;
    });
    N.forEach((nd, n) => {
      if (!comp[n] && n !== 0 && nd.bit.every(b => b < 0) && nd.hijos.length && marca[n].every(Boolean)) comp[n] = true;
    });
  }
  const C = n => comp[n], K = [ 0, 1, 2, 3, 4, 5, 6, 7 ];
  if (C(7)) {
    abrir(5, 1);
    abrir(8, 0);
    abrir(1, 1);
    abrir(6, 0);
    abrir(9, 0);
  }
  if (C(9)) {
    abrir(6, 1);
    abrir(10, 0);
  }
  for (const k of K) if (C(19 + 2 * k)) {
    abrir(11 + k, 1);
    abrir(20 + 2 * k, 0);
  }
  for (const k of K) if (C(43 + 2 * k)) {
    abrir(35 + k, 1);
    abrir(44 + 2 * k, 0);
  }
  for (const k of K) if (C(7) && C(19 + 2 * k)) {
    abrir(0, 2);
    abrir(3, k);
    abrir(35 + k, 0);
    abrir(43 + 2 * k, 0);
  }
  if (C(7)) {
    abrir(0, 3);
    abrir(4, 0);
    abrir(59, 0);
    abrir(61, 0);
    abrir(59, 1);
    abrir(62, 0);
  }
  for (const k of K) if (C(19 + 2 * k)) {
    abrir(0, 3);
    abrir(4, 0);
    abrir(59, 0);
    abrir(61, k + 1);
  }
  for (const k of K) if (C(43 + 2 * k)) {
    abrir(0, 3);
    abrir(4, 0);
    abrir(59, 1);
    abrir(62, k + 1);
  }
  if (K.every(k => marca[35 + k]?.[0])) {
    abrir(4, 1);
    abrir(63, 0);
  }
  if (C(7) && C(9) && K.every(k => marca[11 + k]?.[0] && marca[35 + k]?.[0])) abrir(4, 5);
  let cuenta = 0;
  for (const b of bits) cuenta += b === BIT_VRMISSION ? 10 : 1;
  const q = Math.floor(cuenta / 3);
  if (q >= 50) {
    abrir(4, 3);
    abrir(65, 0);
  }
  if (q >= 60) {
    abrir(4, 4);
    abrir(66, 0);
  }
  if (q >= 70) {
    abrir(4, 2);
    abrir(64, 0);
  }
  if (q >= 80) {
    abrir(4, 7);
    abrir(69, 0);
  }
  if (q >= 85) {
    abrir(4, 6);
    abrir(68, 0);
  }
  const memo = new Map;
  const llega = n => {
    if (n === 0) return true;
    if (memo.has(n)) return memo.get(n);
    memo.set(n, false);
    const r = (padres[n] || []).some(([p, i]) => ab[p][i] && llega(p));
    memo.set(n, r);
    return r;
  };
  const abiertas = new Set;
  N.forEach((nd, n) => nd.clave.forEach((c, i) => {
    if (c && ab[n][i] && llega(n)) abiertas.add(c);
  }));
  const sup = new Set(Object.keys(M?.bit || {}).filter(k => bits.has(M.bit[k])));
  return {
    abiertas: abiertas,
    superadas: sup,
    cuenta: cuenta,
    completos: comp
  };
}

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
    this.todo = leerTodo();
  }
  get todoAbierto() {
    return this.todo || todoGlobal() || !this.datos?.menu;
  }
  set todoAbierto(v) {
    this.todo = !!v;
    guardarTodo(this.todo);
    this.aplicarProgreso();
  }
  aplicarProgreso() {
    if (!this.arbol) return;
    const P = this.prog = desbloqueo(this.datos?.menu, this.op.superadas?.() || []), todo = this.todoAbierto;
    const recorrer = h => {
      if (h.opcion === "todo") {
        h.texto = "ALL OPEN  " + (todo ? "ON" : "OFF");
        return;
      }
      if (h.mision) {
        h.abierta = todo || h.mision.grupo === "photo" || P.abiertas.has(h.mision.clave);
        h.superada = P.superadas.has(h.mision.clave);
        return;
      }
      if (!h.hijos) return;
      h.hijos.forEach(recorrer);
      h.abierta = h.hijos.some(x => x.abierta);
      h.jugables = h.hijos.reduce((s, x) => s + (x.mision ? x.abierta && x.mision.jugable ? 1 : 0 : x.jugables || 0), 0);
    };
    this.arbol.hijos.forEach(recorrer);
  }
  async cargar() {
    try {
      const r = await fetch(this.base + "vr/disco/catalogo.json");
      if (!r.ok) return this.datos = null;
      this.datos = await r.json();
    } catch {
      this.datos = null;
    }
    if (this.datos) {
      this.arbol = this.armar(this.datos);
      this.aplicarProgreso();
    }
    return this.datos;
  }
  get hay() {
    return !!this.datos?.misiones?.length;
  }
  armar(D) {
    const M = D.misiones || [], arma = k => D.armas?.[k] || k.toUpperCase();
    const hoja = e => ({
      texto: e.grupo === "photo" ? limpio(e.titulo?.[1]) || e.st.toUpperCase().replace("_", " ") : nivelDe(e.titulo?.[1]),
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
        texto: "ALL OPEN  OFF",
        opcion: "todo"
      }, {
        texto: "VR TRAINING",
        volver: true
      } ]
    };
  }
  abrir(pila) {
    this.activo = true;
    this.f = 0;
    this.aviso = null;
    this.aplicarProgreso();
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
    return `${this.pila.map(p => p.sel + ":" + p.ini).join(".")}|${this.cur?.join(",") ?? ""}|${this.todo ? 1 : 0}|${this.fondoAparte?.() ? "g" : ""}|${this.aviso?.texto || ""}|${this.fade ? this.fade.n : ""}|${armadosTextos()}`;
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
      KeyM: "cruz",
      KeyU: "todo"
    }[code];
    if (!k) return false;
    if (k === "todo") {
      this.todoAbierto = !this.todo;
      this.op.sonar?.(SE.CURSOR);
      this.aviso = {
        texto: "ALL OPEN " + (this.todo ? "ON" : "OFF"),
        t: 60
      };
      return true;
    }
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
    if (h.opcion === "todo") {
      if (!soloEntrar) {
        this.todoAbierto = !this.todo;
        this.op.sonar?.(SE.ELEGIR);
      }
      return;
    }
    if (h.hijos) {
      if (!h.abierta) {
        this.op.sonar?.(SE.NO);
        this.aviso = {
          texto: "LOCKED",
          t: 75
        };
        return;
      }
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
    if (!h.abierta) {
      this.op.sonar?.(SE.NO);
      this.aviso = {
        texto: "LOCKED",
        t: 75
      };
      return;
    }
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
    const T = this.tope, i = Math.floor((y - Y0 + 3) / ALTO) + T.ini;
    if (x < 14 || x > 196 || y < Y0 - 3 || i < T.ini || i >= Math.min(T.nodo.hijos.length, T.ini + FILAS)) return;
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
    if (this.fondoAparte?.()) x.clearRect(-m, 0, 320 + 2 * m, 224); else {
      const fondo = this.op.fondo?.lienzo?.(320 + 2 * m);
      if (fondo) x.drawImage(fondo, -m, 0); else {
        x.fillStyle = "#000";
        x.fillRect(-m, 0, 320 + 2 * m, 224);
      }
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
      const ok = h.volver || h.opcion || (h.hijos ? h.jugables > 0 : h.mision?.jugable && h.abierta);
      F.texto(x, limpio(h.volver ? this.op.textoVolver?.() || h.texto : h.texto), 20, y, sel ? CLARO : ok ? GRIS : OSCURO);
      if (h.superada) {
        x.fillStyle = `rgb(${VERDE})`;
        x.fillRect(9, y + 1, 3, 3);
      }
      if (h.hijos) F.texto(x, `${h.jugables}/${h.n}`, 190, y, ok ? GRIS : OSCURO, 1); else if (h.mision && /^"/.test(h.mision.sub || "")) F.texto(x, limpio(textoPanel(h.mision)?.sub || h.sub).slice(0, 11), 190, y, sel ? CLARO : OSCURO, 1);
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
      escribir(this.op.textoVolver?.() ? [ "VR MISSIONS", "MAIN MENU" ] : [ "VR TRAINING", "MGS DISC 1" ], 52, GRIS);
      return;
    }
    if (h.opcion === "todo") {
      const y = escribir([ "ALL MISSIONS OPEN FOR TESTING", this.todo ? "ON" : todoGlobal() ? "ON (OPTIONS: ALL UNLOCKED)" : "OFF: THEY OPEN WITH PROGRESS, AS IN THE ORIGINAL" ], 52, GRIS) + 4;
      F.texto(x, `CLEARED ${this.prog?.cuenta ?? 0}/300`, X, y, GRIS);
      return;
    }
    if (h.hijos) {
      let y = escribir([ h.texto ], 52, CLARO) + 4;
      F.texto(x, `MISSIONS ${h.n}`, X, y, GRIS);
      y += 10;
      F.texto(x, `PLAYABLE ${h.jugables}`, X, y, h.jugables ? VERDE : OSCURO);
      if (!h.abierta) F.texto(x, "LOCKED", X, 180, NARANJA);
      return;
    }
    const e = h.mision;
    let y = escribir([ e.titulo?.[0], e.titulo?.[1] ], 50, CLARO) + 3;
    const T = textoPanel(e, W);
    if (T?.lienzos) {
      for (const cv of T.lienzos) {
        if (!cv) continue;
        if (y + cv.height > 186) break;
        x.drawImage(cv, X, y);
        y += cv.height + 1;
      }
      y += 3;
    } else y = escribir((T?.texto || e.texto || []).filter(l => l), y, GRIS) + 3;
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
    if (!h.abierta) F.texto(x, "LOCKED", X, 180, NARANJA); else if (!e.jugable) F.texto(x, "NOT PORTED", X, 180, NARANJA);
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
