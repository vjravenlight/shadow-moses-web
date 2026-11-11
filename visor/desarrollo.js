// MGS web — FeniXVOID · Project Ravenlight
import * as ctl from "./controles.js";

const W = 320, H = 224, FPS = 30;

const jsonDe = url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);

const CLAVE_VIB = "mgs_vib_edit";

const EDIT = [ "INS PARAM", "DEL PARAM", "SWAP BACK", "SWAP FORWARD" ];

const FILE = [ "CHANGE BANK", "QUICK SAVE HIGH", "QUICK SAVE LOW", "QUICK LOAD HIGH", "QUICK LOAD LOW" ];

const TECLAS = {
  ArrowUp: "ar",
  KeyW: "ar",
  ArrowDown: "ab",
  KeyS: "ab",
  ArrowLeft: "izq",
  KeyA: "izq",
  ArrowRight: "der",
  KeyD: "der",
  Enter: "o",
  Space: "o",
  NumpadEnter: "o",
  Escape: "x",
  Backspace: "x",
  KeyT: "tri",
  KeyF: "cua",
  KeyQ: "l1",
  KeyE: "r1",
  Digit1: "l2",
  Digit2: "r2",
  KeyL: "l3"
};

const BOTONES_PANTALLA = [ [ "ar", "▲" ], [ "ab", "▼" ], [ "izq", "◀" ], [ "der", "▶" ], [ "o", "○" ], [ "x", "✕" ], [ "tri", "△" ], [ "cua", "□" ], [ "l1", "L1" ], [ "r1", "R1" ], [ "l2", "L2" ], [ "r2", "R2" ] ];

export class SalaDesarrollo {
  constructor(op = {}) {
    this.op = op;
    this.base = op.base || "assets/";
    this.datos = null;
    this.activa = false;
    this.jugando = null;
    this.raizEl = null;
  }
  async cargar() {
    if (this.datos) return this.datos;
    const [d, ind] = await Promise.all([ jsonDe(this.base + "extras/desarrollo.json"), jsonDe(this.base + "demos/indice.json") ]);
    this.datos = d || {
      raiz: [],
      sonido: []
    };
    this.dmo = new Map;
    for (const x of ind?.demos || []) for (const f of x.dmo || []) this.dmo.set(String(f).toLowerCase(), {
      id: x.id,
      st: x.contexto || x.stages?.[0]
    });
    return this.datos;
  }
  get hay() {
    return !!this.datos?.raiz?.length;
  }
  abrir() {
    this.activa = true;
    this.pila = [ {
      lista: this.datos.raiz,
      i: 0
    } ];
    this.pant = "menu";
    this.aviso = null;
    this.vib = null;
    this.snd = {
      i: 0,
      sonando: false
    };
    return new Promise(fin => {
      this._fin = fin;
      this.mostrar();
    });
  }
  salir(r = null) {
    if (!this.activa) return;
    this.activa = false;
    this.ocultar();
    try {
      this.op.pararVoz?.();
    } catch {}
    if (this.vib) this.guardarVib();
    const f = this._fin;
    this._fin = null;
    f?.(r);
  }
  get visible() {
    return !!this.raizEl;
  }
  mostrar() {
    if (this.raizEl || typeof document === "undefined") return;
    const r = this.raizEl = document.createElement("div");
    r.style.cssText = "position:fixed;inset:0;z-index:46;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;touch-action:none";
    const cv = this.cv = document.createElement("canvas");
    cv.width = W * 2;
    cv.height = H * 2;
    cv.style.cssText = "image-rendering:pixelated;max-width:100vw;max-height:calc(100vh - 64px);aspect-ratio:320/224;width:min(100vw,calc((100vh - 64px)*320/224));background:#000";
    const bar = document.createElement("div");
    bar.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:6px";
    this.retenidos = new Set;
    for (const [b, t] of BOTONES_PANTALLA) {
      const el = document.createElement("button");
      el.textContent = t;
      el.style.cssText = "min-width:40px;height:40px;background:#041008;color:#9fd8a0;border:1px solid #2f4a39;font:14px 'MGS8',Consolas,monospace;cursor:pointer;touch-action:none";
      el.onpointerdown = e => {
        e.preventDefault();
        this.retenidos.add(b);
        this.apretar(b);
      };
      el.onpointerup = el.onpointerleave = el.onpointercancel = () => this.retenidos.delete(b);
      bar.appendChild(el);
    }
    r.append(cv, bar);
    document.body.appendChild(r);
    this.g = cv.getContext("2d");
    this.teclasAbajo = new Set;
    this._tecla = e => {
      const b = TECLAS[e.code];
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "keydown") {
        if (!this.teclasAbajo.has(b)) {
          this.teclasAbajo.add(b);
          this.apretar(b);
        }
      } else this.teclasAbajo.delete(b);
    };
    addEventListener("keydown", this._tecla, true);
    addEventListener("keyup", this._tecla, true);
    this.mandoAntes = null;
    this.acum = 0;
    this.tAnt = performance.now();
    this.rep = {
      dir: 0,
      t: 0
    };
    const bucle = () => {
      if (!this.raizEl) return;
      this.cuadros();
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  }
  ocultar() {
    if (!this.raizEl) return;
    removeEventListener("keydown", this._tecla, true);
    removeEventListener("keyup", this._tecla, true);
    this.raizEl.remove();
    this.raizEl = null;
  }
  get abajo() {
    const s = new Set([ ...this.teclasAbajo || [], ...this.retenidos || [] ]);
    const g = ctl.mando();
    if (g) {
      const b = i => !!g.buttons?.[i]?.pressed, ax = g.axes || [];
      const m = {
        ar: b(ctl.B.ARRIBA) || ax[1] < -.6,
        ab: b(ctl.B.ABAJO) || ax[1] > .6,
        izq: b(ctl.B.IZQ) || ax[0] < -.6,
        der: b(ctl.B.DER) || ax[0] > .6,
        o: b(ctl.B.CIRCULO),
        x: b(ctl.B.CRUZ),
        tri: b(ctl.B.TRIANGULO),
        cua: b(ctl.B.CUADRADO),
        l1: b(ctl.B.L1),
        r1: b(ctl.B.R1),
        l2: b(ctl.B.L2),
        r2: b(ctl.B.R2),
        l3: b(ctl.B.L3)
      };
      const antes = this.mandoAntes || m;
      for (const k in m) {
        if (m[k]) s.add(k);
        if (m[k] && !antes[k] && this.mandoAntes) this.apretar(k);
      }
      this.mandoAntes = m;
    }
    return s;
  }
  cuadros() {
    const t = performance.now();
    this.acum += Math.min(.25, (t - this.tAnt) / 1e3);
    this.tAnt = t;
    let n = 0;
    while (this.acum >= 1 / FPS && n < 4) {
      this.acum -= 1 / FPS;
      this.cuadro();
      n++;
    }
    this.dibujar();
  }
  apretar(b) {
    if (this.jugando) return;
    if (this.pant === "menu") return this.teclaMenu(b);
    if (this.pant === "sonido") return this.teclaSonido(b);
    if (this.pant === "vib") return this.teclaVib(b);
  }
  cuadro() {
    const A = this.abajo;
    if (this.aviso && --this.aviso.t <= 0) this.aviso = null;
    const dir = A.has("ar") ? -1 : A.has("ab") ? 1 : 0;
    if (dir && dir === this.rep.dir) {
      if (--this.rep.t < 0) {
        this.mover(dir * (this.pant === "sonido" && A.has("l1") ? 10 : 1));
        this.rep.t = 2;
      }
    } else if (dir) {
      this.rep.dir = dir;
      this.rep.t = 10;
    } else this.rep.dir = 0;
    if (this.pant === "vib") this.cuadroVib(A);
  }
  mover(d) {
    if (this.pant === "menu") {
      const P = this.pila.at(-1);
      P.i = Math.max(0, Math.min(P.lista.length - 1, P.i + d));
    } else if (this.pant === "sonido" && !this.snd.sonando) this.snd.i = Math.max(0, Math.min(this.datos.sonido.length - 1, this.snd.i + d));
  }
  teclaMenu(b) {
    if (b === "ar") return this.mover(-1);
    if (b === "ab") return this.mover(1);
    if (b === "o") {
      const P = this.pila.at(-1);
      return this.elegir(P.lista[P.i]);
    }
    if (b === "x") return this.volver();
  }
  volver() {
    if (this.pila.length > 1) this.pila.pop(); else this.salir(null);
  }
  async elegir(n) {
    if (!n) return;
    if (n.tipo === "menu") {
      this.pila.push({
        lista: n.hijos || [],
        i: 0
      });
      return;
    }
    if (n.tipo === "volver") return this.volver();
    if (n.tipo === "titulo") return this.salir(null);
    if (n.tipo === "carga") return this.salir({
      carga: n
    });
    if (n.tipo === "sonido") {
      this.pant = "sonido";
      this.snd = {
        i: this.snd?.i || 0,
        sonando: false
      };
      return;
    }
    if (n.tipo === "vib") {
      this.pant = "vib";
      this.abrirVib();
      return;
    }
    if (n.tipo === "demo") {
      const d = this.dmo?.get(String(n.dmo).toLowerCase());
      if (!d) {
        this.aviso = {
          texto: "NOT AVAILABLE",
          t: 60
        };
        return;
      }
      this.jugando = n;
      const vis = this.visible;
      this.ocultar();
      try {
        await (this.op.demo?.(d));
      } catch (e) {
        console.warn("desarrollo: demo", e);
      }
      this.jugando = null;
      if (this.activa && vis && !this.op.enVR?.()) this.mostrar();
      if (this.activa && this.op.enVR?.()) this.op.reabrirVR?.();
      return;
    }
    this.aviso = {
      texto: "NOT AVAILABLE",
      t: 60
    };
  }
  teclaSonido(b) {
    const S = this.snd;
    if (S.sonando) {
      if (b === "x") {
        try {
          this.op.pararVoz?.();
        } catch {}
      }
      return;
    }
    if (b === "ar") return this.mover(-1);
    if (b === "ab") return this.mover(1);
    if (b === "x") {
      this.pant = "menu";
      return;
    }
    if (b === "o") this.pasarVoz(S.i);
  }
  pasarVoz(i) {
    const S = this.snd, v = this.datos.sonido[i];
    if (!v || S.sonando) return;
    S.i = i;
    S.sonando = true;
    Promise.resolve(this.op.voz?.(v[1])).then(ok => {
      if (ok === false) this.aviso = {
        texto: "NO DATA",
        t: 45
      };
    }).catch(() => {}).finally(() => {
      S.sonando = false;
    });
  }
  abrirVib() {
    let bancos = null;
    try {
      bancos = JSON.parse(localStorage.getItem(CLAVE_VIB) || "null");
    } catch {}
    if (!Array.isArray(bancos) || bancos.length !== 32) bancos = Array.from({
      length: 32
    }, () => Array.from({
      length: 32
    }, () => [ 0, 0 ]));
    const V = this.vib = {
      bancos: bancos,
      banco: 0,
      p1: null,
      p2: null,
      sel: 0,
      tipo: 0,
      modo: 0,
      sub: 0,
      t: 0,
      x: 0,
      q1: null,
      q2: null,
      salida: null
    };
    this.cargarBanco(0);
    return V;
  }
  cargarBanco(k) {
    const V = this.vib, b = V.bancos[k];
    V.p1 = b.slice(0, 16).map(x => x.slice());
    V.p2 = b.slice(16, 32).map(x => x.slice());
  }
  guardarBanco(k) {
    const V = this.vib;
    V.bancos[k] = [ ...V.p1, ...V.p2 ].map(x => x.slice());
  }
  guardarVib() {
    try {
      this.guardarBanco(this.vib.banco);
      localStorage.setItem(CLAVE_VIB, JSON.stringify(this.vib.bancos));
    } catch {}
  }
  get paresVib() {
    const V = this.vib;
    return V.tipo === 0 ? V.p2 : V.p1;
  }
  teclaVib(b) {
    const V = this.vib, P = this.paresVib;
    if (V.modo === 1) {
      if (b === "x") V.t = -1;
      return;
    }
    if (V.modo === 2) {
      if (b === "izq" || b === "ar") V.sub = (V.sub + 3) % 4;
      if (b === "der" || b === "ab") V.sub = (V.sub + 1) % 4;
      if (b === "o") this.editar(V.sub);
      return;
    }
    if (V.modo === 3) {
      if (b === "ar") V.sub = (V.sub + 4) % 5;
      if (b === "ab") V.sub = (V.sub + 1) % 5;
      if (V.sub === 0 && (b === "izq" || b === "der")) {
        const k = Math.max(0, Math.min(31, V.banco + (b === "der" ? 1 : -1)));
        if (k !== V.banco) {
          this.guardarBanco(V.banco);
          V.banco = k;
          this.cargarBanco(k);
        }
      }
      if (b === "o") {
        if (V.sub === 1) V.q1 = V.p1.map(x => x.slice()); else if (V.sub === 2) V.q2 = V.p2.map(x => x.slice()); else if (V.sub === 3 && V.q1) V.p1 = V.q1.map(x => x.slice()); else if (V.sub === 4 && V.q2) V.p2 = V.q2.map(x => x.slice());
        V.modo = 0;
      }
      return;
    }
    if (b === "l1" && V.sel > 0) V.sel--;
    if (b === "r1" && V.sel < 15) V.sel++;
    if (b === "tri") V.tipo ^= 1;
    if (b === "cua") this.sacarParametros();
    if (b === "o") this.tocarVib();
    if (b === "x" || b === "l3") {
      this.guardarVib();
      this.pant = "menu";
    }
    if (P && V.tipo === 1 && b === "ar") P[V.sel][0] = 127;
    if (P && V.tipo === 1 && b === "ab") P[V.sel][0] = 0;
  }
  cuadroVib(A) {
    const V = this.vib;
    if (!V) return;
    if (V.modo === 1) {
      V.x++;
      if (--V.t < 0) {
        V.modo = 0;
        V.x = 0;
      }
      return;
    }
    if (V.modo === 2 && !A.has("r2")) V.modo = 0;
    if (V.modo === 3 && !A.has("l2")) V.modo = 0;
    if (V.modo !== 0) return;
    if (A.has("r2")) {
      V.sub = 0;
      V.modo = 2;
      return;
    }
    if (A.has("l2")) {
      V.sub = 0;
      V.modo = 3;
      return;
    }
    const p = this.paresVib[V.sel];
    if (A.has("der") && p[1] < 127) p[1]++;
    if (A.has("izq") && p[1] > 0) p[1]--;
    if (V.tipo === 0) {
      if (A.has("ar") && p[0] < 255) p[0]++;
      if (A.has("ab") && p[0] > 0) p[0]--;
    }
  }
  editar(k) {
    const V = this.vib, P = this.paresVib, s = V.sel;
    if (k === 0) {
      for (let i = 15; i > s; i--) P[i] = P[i - 1].slice();
    } else if (k === 1) {
      for (let i = s; i < 15; i++) P[i] = P[i + 1].slice();
    } else if (k === 2) {
      if (s < 15) {
        [P[s], P[s + 1]] = [ P[s + 1], P[s] ];
        V.sel++;
      }
    } else if (k === 3) {
      if (s > 0) {
        [P[s], P[s - 1]] = [ P[s - 1], P[s] ];
        V.sel--;
      }
    }
  }
  hasta0(P) {
    const out = [];
    for (const [a, b] of P) {
      if (!a && !b) break;
      out.push(a, b);
    }
    return out;
  }
  tocarVib() {
    const V = this.vib, d1 = this.hasta0(V.p1), d2 = this.hasta0(V.p2);
    const largo = d => {
      let s = 0;
      for (let i = 1; i < d.length; i += 2) s += d[i];
      return s;
    };
    try {
      this.op.vibrar?.({
        m1: d1.length ? [ ...d1, 0, 0 ] : null,
        m2: d2.length ? [ ...d2, 0, 0 ] : null
      });
    } catch {}
    V.modo = 1;
    V.x = 0;
    V.t = Math.max(largo(d1), largo(d2));
  }
  sacarParametros() {
    const V = this.vib, h = this.hasta0(V.p1), l = this.hasta0(V.p2);
    const t = `pad vibation parameter (for gcl)\nhigh:{ ${h.join(" ").replace(/(\d+) (\d+)/g, "$1,$2")} }\nlow:{ ${l.join(" ").replace(/(\d+) (\d+)/g, "$1,$2")} }`;
    console.log(t);
    V.salida = {
      texto: `high:{ ${h.join(",")} } low:{ ${l.join(",")} }`,
      t: 150
    };
  }
  texto(s, x, y, color = "#fff", centro = false, k = 1) {
    const g = this.g;
    g.font = "16px MGS, Consolas, monospace";
    g.textBaseline = "top";
    g.textAlign = centro ? "center" : "left";
    g.fillStyle = color;
    if (k === 1) return g.fillText(s, x * 2, y * 2);
    g.save();
    g.translate(x * 2, y * 2);
    g.scale(k, 1);
    g.fillText(s, 0, 0);
    g.restore();
  }
  dibujar() {
    const g = this.g;
    if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#000";
    g.fillRect(0, 0, W * 2, H * 2);
    g.imageSmoothingEnabled = false;
    const gris = "#5f8f6c";
    if (this.pant === "menu") {
      const P = this.pila.at(-1), n = P.lista[P.i];
      this.texto(n ? n.texto : "", 160, 116, "#fff", true);
      this.texto(`${P.i + 1}/${P.lista.length}`, 160, 132, gris, true);
      this.texto("↑↓ ELEGIR   ○ ENTRAR   ✕ VOLVER", 160, 206, gris, true);
    } else if (this.pant === "sonido") {
      const S = this.snd, v = this.datos.sonido[S.i];
      this.texto(S.sonando ? "PLAYING" : v ? v[0] : "NO MENU", 160, 116, "#fff", true);
      if (!S.sonando && v) this.texto(`#${v[1]}   ${S.i + 1}/${this.datos.sonido.length}`, 160, 132, gris, true);
      this.texto(S.sonando ? "✕ STOP" : "↑↓ (L1 x10)   ○ PLAY   ✕ VOLVER", 160, 206, gris, true);
    } else if (this.pant === "vib") this.dibujarVib();
    if (this.aviso) this.texto(this.aviso.texto, 160, 150, "#ff9a3c", true);
  }
  dibujarVib() {
    const V = this.vib, g = this.g;
    const L = (x0, y0, x1, y1, c) => {
      g.strokeStyle = c;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x0 * 2 + 1, y0 * 2 + 1);
      g.lineTo(x1 * 2 + 1, y1 * 2 + 1);
      g.stroke();
    };
    const lin = (L0, x, y) => L0.forEach((s, i) => this.texto(s, x, y + i * 8, "#fff", false, .8));
    lin([ "Vibration Editor   Ver 1.50", "Select param  - < L1  R1 >", "Change length - < L   R  >", "Change power  - < U   D  >", "EXIT          - < L3 >" ], 32, 16);
    lin([ "PLAY          - < A >", "Type change   - < X >", "Disp param    - < Y >", "Edit menu     - < R2 >", "File menu     - < L2 >" ], 168, 24);
    this.texto(`Edit vibration - type ${2 - V.tipo}`, 32, 64);
    const barras = (P, sel, c1, c2) => {
      let x = 16;
      P.forEach(([f, l], i) => {
        g.fillStyle = sel === i ? c1 : c2;
        g.fillRect(x * 2, (155 - Math.floor(f / 3)) * 2, l * 2, 2);
        x += l;
      });
    };
    barras(V.p1, V.tipo === 1 ? V.sel : -1, "rgb(0,80,200)", "rgb(100,180,180)");
    barras(V.p2, V.tipo === 0 ? V.sel : -1, "rgb(200,80,0)", "rgb(180,180,100)");
    L(16, 155, 320, 155, "rgb(0,180,0)");
    L(16, 70, 320, 70, "rgb(180,0,0)");
    L(16 + V.x, 155, 16 + V.x, 70, "rgb(0,0,180)");
    const P = this.paresVib;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 8; i++) {
      const k = j * 8 + i, [f, l] = P[k];
      this.texto(`${k === V.sel ? "E" : " "}${String(k).padStart(2)}- ${String(f).padStart(3)} ${String(l).padStart(3)}`, 32 + 100 * j, 160 + i * 8);
    }
    if (V.modo === 2) {
      this.texto("EDIT MENU", 230, 160);
      EDIT.forEach((s, i) => this.texto(s, V.sub === i ? 230 : 238, 180 + (i - 1) * 8));
    }
    if (V.modo === 3) {
      this.texto("FILE MENU", 230, 160);
      this.texto(`${FILE[0]} ${V.banco}`, V.sub === 0 ? 230 : 238, 172);
      for (let i = 1; i < 5; i++) this.texto(FILE[i], V.sub === i ? 230 : 238, 180 + (i - 1) * 8);
    }
    if (V.salida && --V.salida.t > 0) this.texto(V.salida.texto.slice(0, 52), 16, 140, "#ff9a3c");
  }
  entradasVR() {
    const out = [ {
      texto: "< VOLVER",
      volver: true,
      accion: () => {
        if (this.pant !== "menu") {
          if (this.pant === "vib") this.guardarVib();
          this.pant = "menu";
        } else this.volver();
      },
      cierra: true
    } ];
    if (this.pant === "menu") {
      const P = this.pila.at(-1);
      P.lista.forEach((n, i) => out.push({
        texto: String(n.texto).toUpperCase().slice(0, 60),
        accion: () => {
          P.i = i;
          this.elegir(n);
        },
        cierra: true
      }));
    } else if (this.pant === "sonido") {
      out.push({
        texto: () => this.snd.sonando ? "PLAYING - STOP" : "STOP",
        accion: () => {
          try {
            this.op.pararVoz?.();
          } catch {}
        },
        cierra: false
      });
      this.datos.sonido.forEach((v, i) => out.push({
        texto: `${v[0]} #${v[1]}`,
        accion: () => this.pasarVoz(i),
        cierra: false
      }));
    } else if (this.pant === "vib") {
      const V = this.vib;
      out.push({
        texto: "PLAY",
        accion: () => this.tocarVib(),
        cierra: false
      });
      out.push({
        texto: () => `TYPE ${2 - V.tipo}`,
        accion: () => {
          V.tipo ^= 1;
        },
        cierra: false
      });
      for (let k = 0; k < 16; k++) {
        out.push({
          texto: () => `${String(k).padStart(2)} LENGTH ${this.paresVib[k][1]}`,
          izq: () => {
            const p = this.paresVib[k];
            p[1] = Math.max(0, p[1] - 4);
          },
          der: () => {
            const p = this.paresVib[k];
            p[1] = Math.min(127, p[1] + 4);
          },
          accion: () => {
            V.sel = k;
          },
          cierra: false
        });
        out.push({
          texto: () => `${String(k).padStart(2)} POWER ${this.paresVib[k][0]}`,
          izq: () => {
            const p = this.paresVib[k];
            p[0] = V.tipo === 1 ? 0 : Math.max(0, p[0] - 16);
          },
          der: () => {
            const p = this.paresVib[k];
            p[0] = V.tipo === 1 ? 127 : Math.min(255, p[0] + 16);
          },
          accion: () => {
            V.sel = k;
          },
          cierra: false
        });
      }
    }
    return out;
  }
}
