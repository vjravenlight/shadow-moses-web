// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { FondoVR } from "./fondo_vr.js";

import { CamaraJuego } from "./camara_juego.js";

import { MenuVR } from "./menu_vr.js";

import { MenuDisco, desbloqueo } from "./menu_vr_disco.js";

import { TituloDisco } from "./titulo_vr_disco.js";

import { Blancos } from "./blancos_vr.js";

import { GuionDisco } from "./guion_vr_disco.js";

import { HuellasMystery } from "./vrmisiones_huellas.js";

import { SesionFoto } from "./foto_vr.js";

import { todoDesbloqueado } from "./desbloqueo.js";

import { Chispas, Materializacion, Warp, GIRO_META, texturaPS1 } from "./efectos_vr.js";

import { marcoPS1, cargarImg, Fuente, HudVR, PausaVR, ClearVR, OverVR, modular } from "./pantallas_vr.js";

import { iniciar as iniciarTextosVR, ventana as ventanaIdioma, dibujarVentana as dibujarVentanaIdioma } from "./vr_textos.js";

import { PadDemo } from "./paddemo.js";

import { mandoDemo, mandosCrudos } from "./controles.js";

import { cargarAnims } from "./anim.js";

const FPS = 30, MM = .001, ANG = Math.PI * 2 / 4096;

async function sumarAnimsDisco() {
  try {
    const [e, x] = await Promise.all([ cargarAnims("enemy"), cargarAnims("vr_enemy_extra").catch(() => null) ]);
    if (!e?.clips || !x?.clips) return;
    for (const k of [ "levantarse de la pose del mensaje", "nodo 15 (NG 08)" ]) if (x.clips[k] && !e.clips[k]) e.clips[k] = x.clips[k];
  } catch {}
  try {
    const [b, y] = await Promise.all([ cargarAnims("snake"), cargarAnims("vr_snake_f846").catch(() => null) ]);
    if (b?.clips && y?.clips) for (const [k, c] of Object.entries(y.clips)) if (!b.clips[k]) b.clips[k] = c;
  } catch {}
}

const SE = {
  CURSOR: 31,
  ELEGIR: 32,
  SALIR: 33,
  SORPRESA: 83,
  BARRIDO: 94,
  LENTE: 95,
  ESCRIBE: 179,
  META: 184,
  PITIDO: 185,
  FIN_TIEMPO: 186
};

const H = {
  SNAKEWARP: 26414,
  ENTRAR: 3538,
  SALIR: 54732,
  VR: 60806,
  RELOJ: 45639,
  BORRAR_HUD: 60432,
  CLEAR: 42745,
  CONTINUAR: 60847
};

const v3 = p => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);

const dirDe = (dx, dz) => (Math.round(Math.atan2(dx, dz) / ANG) % 4096 + 4096) % 4096;

const difS = (a, b) => {
  const d = ((b - a) % 4096 + 4096) % 4096;
  return d > 2048 ? d - 4096 : d;
};

const difAbs = (a, b) => Math.abs(difS(a, b));

const CLAVE_REC = "mgs_vr_records", CLAVE_PROG = "mgs_vr_progreso", CLAVE_TODO = "mgs_vr_todo";

const CLAVE_SUPERADAS = "mgs_vr_disco_superadas";

const UMBRALES_FOTO = [ 90, 150, 210, 270, 300 ];

const leerLS = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch {
    return d;
  }
};

const guardarLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

const TA10 = {
  vars: [ "$w:G032c", "$w:G032e", "$w:G0330" ],
  inicial: [ 6300, 8100, 9900 ]
};

const PAD = {
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
  Backspace: "cruz",
  KeyQ: "cruz",
  Escape: "start",
  KeyP: "start"
};

export class VRMisiones {
  constructor(ctx) {
    this.ctx = ctx;
    this.base = ctx.base ?? "assets/";
    iniciarTextosVR(this.base);
    this.ev = new Map;
    this.estado = "off";
    this.cv = document.createElement("canvas");
    this.cv.id = "vrcv";
    Object.assign(this.cv.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "7",
      pointerEvents: "none",
      imageRendering: "pixelated"
    });
    this.cvSuma = document.createElement("canvas");
    Object.assign(this.cvSuma.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "7",
      pointerEvents: "none",
      imageRendering: "pixelated",
      mixBlendMode: "plus-lighter"
    });
    (ctx.contenedor || document.body).appendChild(this.cvSuma);
    this.gs = this.cvSuma.getContext("2d");
    (ctx.contenedor || document.body).appendChild(this.cv);
    this.g = this.cv.getContext("2d");
    this.records = leerLS(CLAVE_REC, {});
    this.progreso = +leerLS(CLAVE_PROG, 0) || 0;
    this.todo = ctx.desbloquearTodo ?? !!leerLS(CLAVE_TODO, false);
    this.t = 0;
    this.acum = 0;
    this.f = 0;
    this.carrera = null;
    this.grupo = null;
    this.cv.addEventListener("click", e => this.clic(e.clientX, e.clientY));
    addEventListener("keyup", e => {
      this.menuVR?.tecla(e.code, false);
      this.tituloD?.tecla(e.code, false);
    });
    this._listo = null;
  }
  get listo() {
    return this._listo ||= this.prepararMenu();
  }
  on(n, f) {
    if (!this.ev.has(n)) this.ev.set(n, []);
    this.ev.get(n).push(f);
    return this;
  }
  emit(n, d) {
    for (const f of this.ev.get(n) || []) {
      try {
        f(d);
      } catch (e) {
        console.warn("vr", n, e);
      }
    }
  }
  get activo() {
    return this.estado !== "off";
  }
  get bloqueaControl() {
    return this.estado !== "off" && this.estado !== "juego";
  }
  get congelado() {
    return [ "menu", "cargando", "ventana", "pausa", "gameover" ].includes(this.estado) || this.estado === "derrota" && this.over?.count >= 256;
  }
  get ocultaHud() {
    return this.activo;
  }
  get vr() {
    return this._vr;
  }
  set vr(v) {
    this._vr = v;
  }
  get conInventario() {
    return !!this.invDisco && !!this.vr?.disco && ![ "off", "menu", "cargando" ].includes(this.estado);
  }
  get conCamara() {
    return !!this.foto && this.estado === "juego";
  }
  async prepararMenu() {
    this.datosMenu = await fetch(this.base + "vr/menu.json").then(r => r.json());
    for (const [k, v] of Object.entries(this.datosMenu.rankings_defecto || {})) if (!this.records[k]) this.records[k] = v;
    const t10 = this.datosMenu.ranking_ta10;
    if (t10?.vars?.length === 3) {
      TA10.vars = t10.vars;
      TA10.inicial = t10.inicial.map(r => r.t);
    }
    TA10.vars.forEach((k, i) => {
      if (!this.records[k]) this.records[k] = {
        t: TA10.inicial[i],
        def: true
      };
    });
    const rot = await fetch(this.base + "vr/comun/tex/rotulos.json").then(r => r.json()).catch(() => ({}));
    this.img = {};
    await Promise.all([ ...Object.keys(rot).map(async h => {
      this.img[h] = await cargarImg(`${this.base}vr/comun/tex/${h}.png`);
    }), cargarImg(this.base + "codec/ui/marco.png").then(i => {
      this.img.marco = i;
    }), cargarImg(this.base + "hud/go_continue.png").then(i => {
      this.img.goC = i;
    }), cargarImg(this.base + "hud/go_exit.png").then(i => {
      this.img.goE = i;
    }), cargarImg(this.base + "hud/fuente.png").then(i => {
      this.fuente = new Fuente(i);
    }) ]);
    this.logoOver = (await fetch(this.base + "vr/comun/vrover.json").then(r => r.json()).catch(() => null))?.lineas || [];
    this.texEf = {};
    for (const n of [ "b09b", "rcm_l", "refrection6", "sonic" ]) this.texEf[n] = await texturaPS1(`${this.base}vr/comun/${n}.png`);
    this.imgLente = await cargarImg(this.base + "vr/comun/refrection6.png");
    this.fondoMenu = new FondoVR({
      tipo: 0,
      tipo2: 0,
      vR: 22,
      base: this.base
    });
    this.menuVR = new MenuVR({
      base: this.base,
      fondo: this.fondoMenu,
      sonar: id => this.sonar(id),
      elegir: n => this.elegirMenu(n),
      guardar: () => this.avisar("MEMORY CARD: LOS RÉCORDS SE GUARDAN EN EL NAVEGADOR")
    });
    await Promise.all([ this.menuVR.listo, this.fondoMenu.listo ]);
    this.menuD = new MenuDisco({
      base: this.base,
      fondo: this.fondoMenu,
      fuente: this.fuente,
      marco: this.img.marco,
      sonar: id => this.sonar(id),
      elegir: e => {
        this.pilaDisco = this.menuD.pila.map(q => ({
          sel: q.sel,
          ini: q.ini
        }));
        this.volverTitulo = null;
        this.cargarMision(e.clave);
      },
      salir: () => {
        this.menuD.cerrar();
        this.volverDisco = false;
        if (this.menuDDesde === "titulo") this.abrirTitulo(4);
      },
      textoVolver: () => this.menuDDesde === "titulo" ? "EXIT" : null,
      record: e => this.recordsDisco(e),
      superadas: () => this.superadas
    });
    await this.menuD.cargar();
    this.tituloD = new TituloDisco({
      base: this.base,
      sonar: id => this.sonar(id),
      sonido: this.ctx.sonido,
      cuenta: () => this.cuentaDisco(),
      todo: () => !!this.menuD?.todoAbierto,
      sonidoTitulo: () => this.sonidoTitulo(),
      ponerTodo: v => {
        if (this.menuD) this.menuD.todoAbierto = v;
      },
      alSalir: () => this.salirTitulo(),
      alEntrenamiento: () => {
        this.abrirDisco({
          desde: "titulo"
        });
      },
      alFoto: (clave, s) => {
        this.volverTitulo = s;
        this.cargarMision(clave);
      },
      reproducir: this.ctx.movie ? (actor, op) => this.reproducirDisco(actor, op) : null,
      demo: () => this.demoDisco()
    });
    fetch(`${this.base}vr/disco/demos_titulo.json`).then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      this._demosD = j;
    });
  }
  reproducirDisco(actor, op = {}) {
    const m = this.ctx.movie;
    if (!m) return false;
    this.ctx.sonido?.cancion?.(0);
    return m.iniciar(actor, {
      base: this.base + "vr/disco/",
      cortable: !!op.cortable,
      alTerminar: () => op.alTerminar?.()
    });
  }
  cuentaDisco() {
    const M = this.menuD?.datos?.menu;
    return M ? desbloqueo(M, this.superadas).cuenta : this.superadas.length;
  }
  sonidoTitulo() {
    const S = this.tituloD?.datos?.sonido;
    if (S) this.sonidoDisco({
      ...S,
      canciones: [ 0, 0 ]
    });
  }
  async abrirTitulo(s = 0) {
    if (!this.tituloD || this.estado !== "menu") return false;
    await this.tituloD.listo;
    if (this.estado !== "menu") return false;
    if (!this.tituloD.hay) return this.abrirDisco();
    this.menuD?.cerrar();
    this.volverDisco = false;
    this.tituloD.abrir(s);
    this.cv.style.pointerEvents = "auto";
    return true;
  }
  salirTitulo() {
    this.tituloD?.cerrar();
    this.volverDisco = false;
    this.menuD?.cerrar();
    this.ctx.sonido?.cancion?.(0);
  }
  recordsDisco(e) {
    if (!e?.limite) return null;
    const c = this._recD ||= new Map;
    if (!c.has(e.clave)) {
      c.set(e.clave, null);
      fetch(`${this.base}vr/disco/${e.clave}.json`).then(r => r.json()).then(d => c.set(e.clave, d.vr?.ranking || null)).catch(() => {});
    }
    const R = c.get(e.clave);
    if (!R?.vars) return null;
    return R.vars.map((k, i) => this.records[k] || R.inicial[i]);
  }
  abrirDisco({desde: desde = "vr1"} = {}) {
    if (!this.menuD?.hay) return false;
    this.menuDDesde = desde;
    this.tituloD?.cerrar();
    if (desde === "titulo") this.ctx.sonido?.cancion?.(0);
    this.menuD.abrir(this.pilaDisco);
    this.volverDisco = true;
    this.sonar(177);
    return true;
  }
  get orden() {
    return this.datosMenu?.orden || [];
  }
  async abrirMenu() {
    await this.listo;
    this.limpiar3D();
    this.over = null;
    this.clear = null;
    this.pausa = null;
    this.estado = "menu";
    this.cv.style.pointerEvents = "auto";
    this.ctx.sonido?.cancion?.(0);
    const R = (this.datosMenu.rankings_menu || []).slice(1).map(k => {
      const r = this.records[k];
      return r ? r.def ? -r.t : r.t : 0;
    });
    this.menuVR.abrir({
      progreso: this.todo || todoDesbloqueado() ? 32 : Math.max(1, this.progreso),
      records: R
    });
    this.mision = null;
    if (this.volverTitulo != null && this.tituloD?.hay) {
      const s = this.volverTitulo;
      this.volverTitulo = null;
      this.menuD?.cerrar();
      this.volverDisco = false;
      this.tituloD.abrir(s);
    } else if (this.volverDisco && this.menuD?.hay) this.menuD.abrir(this.pilaDisco); else this.menuD?.cerrar();
    this.emit("menu");
  }
  elegirMenu(n) {
    const e = this.datosMenu.entradas?.[n];
    if (!e) return;
    if (e.tipo === "titulo") {
      this.menuVR.fundirSalida(25);
      this.ctx.sonido?.codigo?.(4278190088);
      this.agendaMenu = {
        t: 30,
        fn: () => {
          this.cerrar();
          this.emit("salir");
        }
      };
      return;
    }
    this.volverDisco = false;
    if (e.tipo === "demo") {
      this.menuVR.fundirSalida(10);
      this.agendaMenu = {
        t: 15,
        fn: () => this.demoTecnica()
      };
      return;
    }
    this.menuVR.fundirSalida(10);
    this.agendaMenu = {
      t: 15,
      fn: () => {
        this.carrera = null;
        this.cargarSala(e.st, e.modo);
      }
    };
  }
  cerrar() {
    this.ctx.ninja?.desactivar?.();
    this.devolverInventario();
    this.limpiar3D();
    this.estado = "off";
    this.menuVR?.cerrar();
    this.menuD?.cerrar();
    this.tituloD?.cerrar();
    this.volverTitulo = null;
    this.over = null;
    this.clear = null;
    this.pausa = null;
    this.cv.style.pointerEvents = "none";
    this.g.clearRect(0, 0, this.cv.width, this.cv.height);
  }
  avisar(texto) {
    this.aviso = {
      texto: texto,
      t: 90
    };
  }
  demoTecnica(i = 0) {
    const orden = [ "vr01", "vr02", "vr07", "vr03", "vr05", "vr09", "vr04", "vr06", "vr08", "vr10" ];
    if (i >= orden.length) return this.salirDemo();
    const st = orden[i], crv = {
      vr01: "891f",
      vr02: "892f",
      vr03: "893f",
      vr04: "894f",
      vr05: "895f",
      vr06: "896f",
      vr07: "897f",
      vr08: "898f",
      vr09: "899f",
      vr10: "8b0f"
    }[st];
    const D = this.demoTec = {
      i: i,
      st: st,
      crv: crv,
      t: 0,
      pad: null,
      bits: 0,
      pasos: null,
      finPad: null,
      tClear: null,
      tFin: null
    };
    fetch(`${this.base}guion/paddemo/${st}_${crv}.json`).then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      if (this.demoTec === D) D.pasos = j?.pasos || [];
    });
    mandoDemo(() => this.demoTec ? this.demoTec.bits : null);
    this.engancharCorteDemo();
    this.carrera = null;
    this.cargarSala(st, 5, {
      demo: true
    });
  }
  demoDisco() {
    const L = this._demosD;
    if (!Array.isArray(L) || !L.length) return false;
    const k = (this.demoDiscoN ?? 0) % L.length, e = L[k];
    this.demoDiscoN = k + 1;
    if (!e?.clave) return false;
    const D = this.demoTec = {
      i: k,
      st: e.st,
      disco: true,
      t: 0,
      pad: null,
      bits: 0,
      pasos: e.pasos,
      finPad: null,
      tClear: null,
      tFin: null
    };
    mandoDemo(() => this.demoTec === D ? D.bits : null);
    this.engancharCorteDemo();
    this.volverTitulo = 1;
    this.cargarMision(e.clave);
    return true;
  }
  engancharCorteDemo() {
    if (this._corteDemo || typeof addEventListener !== "function") return;
    this._corteDemo = e => {
      if (this.demoTec && !(e.type === "keydown" && /^(Shift|Control|Alt|Meta)/.test(e.code || ""))) this.demoTec.cortar = true;
    };
    addEventListener("keydown", this._corteDemo, true);
    addEventListener("pointerdown", this._corteDemo, true);
  }
  salirDemo() {
    const D = this.demoTec;
    this.demoTec = null;
    mandoDemo(null);
    D?.pad?.cortar(false);
    if (this.estado !== "off") {
      this.ctx.sonido?.codigo?.(4278190334);
      this.abrirMenu();
    }
  }
  get demoActiva() {
    return !!this.demoTec && this.estado !== "menu" && this.estado !== "off";
  }
  cuadroDemoTec() {
    const D = this.demoTec;
    if (!D) return;
    if (this.estado === "menu" || this.estado === "off") {
      this.demoTec = null;
      mandoDemo(null);
      return;
    }
    let corta = !!D.cortar, ahora = 0;
    for (const g of mandosCrudos()) if (g?.connected) (g.buttons || []).forEach((b, i) => {
      if (b.pressed && i < 31) ahora |= 1 << i;
    });
    if (D.antes != null && ahora & ~D.antes) corta = true;
    D.antes = ahora;
    if (corta && D.t > 10) return this.salirDemo();
    D.cortar = false;
    if (this.estado === "cargando") return;
    D.t++;
    if (D.disco && this.estado === "ventana" && D.t > 45 && !D.ventanaCerrada) {
      D.ventanaCerrada = true;
      this.cerrarVentana();
    }
    if (!D.pad && D.pasos && (this.estado === "juego" || this.estado === "intro" && !D.disco)) {
      D.pad = new PadDemo;
      D.pad.iniciarControl({
        opts: {
          s: D.pasos.flat()
        }
      }, {
        st: D.st,
        alTerminar: () => {
          D.finPad = D.t;
        }
      });
    }
    if (D.pad?.activo && this.estado !== "clear") {
      D.pad.paso();
      D.bits = D.pad.bits;
    } else D.bits = 0;
    const sigue = () => D.disco ? this.salirDemo() : this.demoTecnica(D.i + 1);
    if (this.estado === "clear") {
      D.pad?.cortar(false);
      D.tClear ??= D.t;
      if (D.t - D.tClear >= (D.disco ? 90 : 300)) sigue();
    } else if (this.estado === "derrota") {
      D.tFin ??= D.t;
      if (D.t - D.tFin >= 15) sigue();
    } else if (D.finPad != null && D.t - D.finPad >= (D.disco ? 30 : 150)) sigue();
  }
  cargarMision(clave, op = {}) {
    this.volverDisco = true;
    return this.cargarSala(null, null, {
      ...op,
      clave: clave,
      url: `${this.base}vr/disco/${clave}.json`
    });
  }
  cargarSala(st, modo, op = {}) {
    this.cola = (this.cola || Promise.resolve()).then(() => this.cargarSala1(st, modo, op)).catch(e => console.warn("vr: no cargó", st, modo, e));
    return this.cola;
  }
  async cargarSala1(st, modo, op) {
    await this.listo;
    this.estado = "cargando";
    this.cv.style.pointerEvents = "none";
    this.menuVR.cerrar();
    this.menuD?.cerrar();
    this.tituloD?.cerrar();
    this.over = null;
    this.clear = null;
    this.pausa = null;
    this.fade = null;
    const nv = await fetch(op.url || `${this.base}vr/${st}_${modo}.json`).then(r => r.json());
    const V = nv.vr;
    st ??= V.sala;
    modo ??= V.modo;
    if (V.foto) this.categoriaFoto(nv, V.foto);
    this.datos = nv;
    this.vr = V;
    this.st = st;
    this.modo = modo;
    this.mision = op.clave || null;
    this.aplicarVariante(nv, op);
    try {
      globalThis.__mgs?.guion?.op?.mensaje?.(8650, [ 12856, 0 ], null);
    } catch (e) {
      console.warn("vr: postura", e);
    }
    if (V.ranking?.vars) V.ranking.vars.forEach((k, i) => {
      if (!this.records[k]) this.records[k] = V.ranking.inicial[i];
    });
    if (modo === 2 && (!this.carrera || this.carrera.modo !== 2 || st === this.orden[0] && !op.continuar)) this.carrera = {
      modo: 2,
      restante: V.limite || 9e3,
      total: V.limite || 9e3
    };
    if (modo === 4 && (!this.carrera || this.carrera.modo !== 4 || st === this.orden[0] && !op.continuar)) this.carrera = {
      modo: 4,
      acumulado: 0,
      limite: V.limite || 12600,
      municion: null
    };
    if (modo !== 2 && modo !== 4) this.carrera = null;
    this.carreraEntrada = this.carrera ? JSON.parse(JSON.stringify(this.carrera)) : null;
    if (V.acumula) {
      if (op.continuar && this.carreraD) {} else if (op.reintento && this.carreraDEntrada) this.carreraD = JSON.parse(JSON.stringify(this.carreraDEntrada)); else this.carreraD = {
        acumulado: 0,
        inv: null
      };
      this.carreraDEntrada = JSON.parse(JSON.stringify(this.carreraD));
    } else this.carreraD = null;
    const vigilancia = nv.actores.filter(a => a.tipo === "CAMERA" || a.tipo === "SEARCHLIGHT");
    const blancos = nv.actores.filter(a => a.tipo === "VRBOX" || a.tipo === "VRBOX2" || a.tipo === "VRBOX4");
    const nv2 = {
      ...nv,
      actores: nv.actores.filter(a => a.tipo !== "CAMERA" && a.tipo !== "SEARCHLIGHT" && a.tipo !== "VRBOX" && a.tipo !== "VRBOX2" && a.tipo !== "VRBOX4" && a.tipo !== "VRGLASS" && a.tipo !== "FINDTRAP" && a.tipo !== "BOXALL" && a.tipo !== "MYSTERYDOOR")
    };
    this.limpiar3D();
    const D = V.disco;
    const camDatos = fetch(D ? this.base + D.camaras : `${this.base}vr/${st}/camaras_${modo}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    const chispas = D ? Promise.resolve(null) : fetch(`${this.base}vr/${st}/chispas_${V.variante || "n"}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    const n0001 = D ? Promise.resolve(null) : cargarImg(`${this.base}vr/${st}/tex/7e37.png`);
    if (D) await sumarAnimsDisco();
    await this.ctx.cargarNivel(nv2);
    if (D?.sonido) this.sonidoDisco(D.sonido);
    this.prepararCamara(await camDatos);
    const J = this.ctx.juego?.();
    this.grupo = new THREE.Group;
    this.grupo.name = "vr";
    this.ctx.escena.add(this.grupo);
    await Promise.all([ V.foto ? null : this.armarFondo(), this.armarMeta(), this.armarVigilancia(vigilancia) ]);
    this.blancos = null;
    this.guionD = null;
    this.paredesD = [];
    if (V.disco?.guion) {
      try {
        this.guionD = await GuionDisco.cargar(this.base + V.disco.guion, V.disco.vars, {
          chara: (t, n, o) => this.charaGuion(t, n, o),
          mesg: (d, m, r) => this.mesgGuion(d, m, r),
          se: id => this.sonar(id),
          pad: sin => this.padGuion(sin),
          camara: (pos, mira) => {
            this.camMira = mira;
          },
          camaraCmd: c => this.camaraGuion(c),
          musica: r => this.musicaGuion(r),
          menu: r => {
            if (r.m) this.hudOculto = r.m[0] === 0;
          }
        });
      } catch (e) {
        console.warn("vr: sin guion de la sala", e);
      }
    }
    this.zonasD = [];
    this.dentroD = new Map;
    if (this.guionD && V.disco?.trampas?.length) {
      this.guionD.atarTrampas(V.disco.trampas);
      for (const [h, cajas] of Object.entries(V.disco.zonas || {})) this.zonasD.push({
        h: parseInt(h, 16),
        cajas: cajas.map(([a, b]) => new THREE.Box3(v3(a).min(v3(b)), v3(a).max(v3(b))))
      });
    }
    if (blancos.length || this.guionD) {
      const ga = () => {
        const x = globalThis.__mgs?.armas;
        return this.ctx.armas?.() ?? (typeof x === "function" ? x() : x);
      };
      this.blancos = new Blancos({
        grupo: this.grupo,
        cargarGlb: u => this.ctx.cargarGlb(u),
        actores: blancos,
        armas: ga,
        sonar: id => this.sonar(id, 48),
        paredes: () => globalThis.__mgs?.colParedes,
        sensores: () => globalThis.__mgs?.sensores,
        alRomperProc: p => this.guionD?.correr(p),
        alRomper: n => {
          if (V.vr2 || !V.blancos || n < V.blancos.n || this.metaLista || this.procBlancos) return;
          if (this.guionD && V.blancos.proc) {
            this.procBlancos = true;
            this.correrProcVR(V.blancos.proc);
            return;
          }
          this.mostrarMeta(true);
        }
      });
      await this.blancos.cargar();
      for (const a of nv.actores) if (a.tipo === "VRGLASS") this.blancos.agregarVidrio(a);
    }
    this.procBlancos = false;
    this.procClay = false;
    this.procTiro = false;
    this.foto = null;
    if (V.foto) {
      this.foto = new SesionFoto({
        grupo: this.grupo,
        cargarGlb: u => this.ctx.cargarGlb(u),
        base: this.base,
        foto: V.foto,
        sonar: id => this.sonar(id, 48),
        jugador: this.ctx.jugador,
        camara: this.ctx.camara
      });
      try {
        await this.foto.cargar();
      } catch (e) {
        console.warn("vr: la sesión de fotos no cargó", e);
      }
    }
    this.img["7e37"] = await n0001;
    const ch = await chispas;
    if (ch && this.texEf.b09b) {
      this.chispas = new Chispas({
        datos: ch,
        textura: this.texEf.b09b,
        camara: this.ctx.camara
      });
      this.grupo.add(this.chispas.obj);
    }
    this.warp = this.foto ? null : new Warp({
      oculto: true
    });
    this.materia = null;
    if (J) this.engancharJuego(J);
    this.prepararMystery(nv.actores);
    if (this.foto) {
      this.tiempo = 0;
      this.limite = null;
      this.relojCorre = false;
      this.metaLista = false;
      this.drops = [];
      this.resultado = null;
      this.f = 0;
      this.acum = 0;
      this.visto = null;
      this.vozOver = null;
      this.hud = null;
      this.win = null;
      this.fade = {
        modo: "entra",
        n: 0,
        total: 15
      };
      this.estado = "intro";
      this.fi = 0;
      this.agendaIntro = [];
      this.fovAntes = this.ctx.camara?.fov;
      this.emit("sala", {
        st: st,
        modo: modo
      });
      return;
    }
    this.tiempo = this.modo === 4 ? this.carrera?.acumulado || 0 : this.carreraD ? this.carreraD.acumulado : 0;
    this.limite = this.calcularLimite();
    this.relojCorre = false;
    this.metaLista = !V.tiro && !V.blancos && !V.claymores;
    this.drops = [];
    this.resultado = null;
    this.f = 0;
    this.acum = 0;
    this.visto = null;
    this.vozOver = null;
    this.cuenta = 0;
    this.cuentaVista = 0;
    this.cuentaT = 0;
    this.cuentaRojo = 0;
    this.nombresCuenta = new Set(nv.actores.filter(a => a.cuenta).map(a => a.nombre));
    this.hud = new HudVR({
      fuente: this.fuente
    });
    this.vr2 = V.vr2 ? {
      puntos: 0,
      vistos: 0,
      amarillo: 0
    } : null;
    if (this.vr2) {
      this.hud = null;
      this.limite = null;
    }
    this.fade = {
      modo: "entra",
      n: 0,
      total: 15
    };
    const W = V.ventana;
    if (W) {
      this.win = this.armarVentana(W);
      this.sonar(SE.ELEGIR);
      this.estado = "ventana";
    } else this.empezarIntro();
    this.emit("sala", {
      st: st,
      modo: modo
    });
  }
  sonidoDisco(S) {
    const snd = this.ctx.sonido;
    if (!snd?.cargarEscenario || !S.mdx) return;
    const r = n => "../../vr/disco/sonido/" + n, k = "vrm:" + S.mdx + S.bancos.join();
    snd.tabla ||= {};
    snd.tabla[k] = {
      bancos: S.bancos.map(r),
      mdx: r(S.mdx),
      efx: S.efx ? r(S.efx) : null,
      canciones: S.canciones || [ 2, 2 ]
    };
    try {
      const p = snd.cargarEscenario(k);
      p?.catch?.(() => {});
    } catch {}
  }
  aplicarVariante(nv, op = {}) {
    const L = nv.vr?.variantes;
    this.variante = null;
    if (!L?.length) return;
    const r = op.variante ?? this.varianteForzada ?? Math.floor(Math.random() * L.length), X = L[Math.min(L.length - 1, Math.max(0, r | 0))];
    this.variante = X.r;
    for (const a of nv.actores) {
      const g = X.guardias[String(a.nombre)];
      if (a.tipo === "WATCHER" && g) {
        a.mystery = g.mystery;
        a.opts = {
          ...a.opts,
          b: [ g.mystery.b.charCodeAt(0) ],
          k: [ g.mystery.k ],
          r: [ g.ruta ]
        };
        a.ruta = g.ruta;
        if (g.puntos?.length) {
          a.puntos = g.puntos;
          a.p = g.puntos[0].p;
        }
        if (g.ruta_inicio) a.ruta_inicio = g.ruta_inicio; else delete a.ruta_inicio;
      }
      if (a.tipo === "BELONG") {
        const b = (X.guardias.belong || []).find(q => q.nombre === a.nombre);
        if (b) a.opts = {
          ...a.opts,
          c: [ {
            id: b.c,
            n: null
          } ]
        };
      }
    }
    if (nv.vr.disco && X.vars) nv.vr.disco.vars = X.vars;
    if (nv.vr.disco && X.trampas) nv.vr.disco.trampas = X.trampas;
  }
  calcularLimite() {
    const V = this.vr;
    if (this.modo === 2) return this.carrera.restante;
    if (this.modo === 4) return this.carrera.limite;
    return V.limite || null;
  }
  engancharJuego(J) {
    this.J = J;
    J.activo = false;
    J.reglasVR = this.vr.disco ? {
      tiro: true,
      caida: true
    } : null;
    J.rutaNodo = (g, r) => this.cambiarRuta(g.nombre & 65535, [ r ]);
    J.seVR = id => this.sonar(id);
    J.golpeObjeto = (yo, f, modo) => this.golpePuerta(yo, f, modo);
    J.padVR = 0;
    this.padT = 0;
    J.primeraPersonaVR = () => !this.ctx.cuerpo?.();
    J.rumboSnakeVR = () => {
      const r = globalThis.__mgs?.ninjaJugable?.rumbo;
      return typeof r === "number" ? r + Math.PI : null;
    };
    J.pisadaMystery = (g, pie) => this.huellas?.paso(g, pie);
    if (this.vr.ninja && typeof this.vr.ninja === "object" && this.ctx.ninja) {
      this.ninjaCargando = Promise.resolve(this.ctx.ninja.activar(this.vr.ninja)).catch(e => {
        console.warn("vr: el Ninja no cargó", e);
        return null;
      });
    }
    if (this.vr.ninja && !J._vrEspada) {
      const orig = J.golpear.bind(J);
      J._vrEspada = true;
      J.golpear = (yo, frente) => this.vr?.ninja ? this.espadaNinja(yo, frente) : orig(yo, frente);
    }
    const c = J.ctx, goPrev = c.gameOver, morirPrev = c.alMorir;
    c.gameOver = () => {
      if (this.estado === "off") return goPrev?.();
      this.perder("muerte");
    };
    c.alMorir = g => {
      morirPrev?.(g);
      this.alMorir(g);
    };
    if (!J._vrMarca) {
      const orig = J.ponerMarca.bind(J);
      J._vrMarca = true;
      J.ponerMarca = (g, k) => {
        orig(g, k);
        if (k === 0) this.descubierto("guardia", g.o.position);
      };
    }
    this.invDisco = null;
    const inv = this.vr.disco ? c.inventario || null : null;
    if (inv) {
      const I = this.carreraD?.inv || this.vr.disco.inventario;
      this.invGuardado ??= {
        armas: [ ...inv.armas ],
        armasMax: [ ...inv.armasMax ],
        items: [ ...inv.items ],
        arma: inv.arma,
        item: inv.item,
        cargador: inv.cargador,
        cargadorMax: inv.cargadorMax
      };
      inv.armas = I.armas.slice(0, 10);
      inv.armasMax = I.armas_max.map((m, i) => m > 0 ? m : inv.armasMax[i]);
      inv.items = I.items.slice(0, 24);
      inv.arma = I.arma;
      inv.item = I.item;
      inv.cargador = 0;
      if (inv.lados) {
        inv.lados[1].ultimo = I.arma;
        inv.lados[0].ultimo = -1;
      }
      const ga = globalThis.__mgs?.armas, A = this.ctx.armas?.() ?? (typeof ga === "function" ? ga() : ga);
      if (A) {
        A.actual = -2;
        A.c4 = [];
        A.minas = [];
        A.granadas = [];
      }
      J.arma.balas = 0;
      J.arma.reserva = 0;
      this.invDisco = inv;
    }
    const M = this.vr.municion;
    if (this.invDisco) {} else if (M) {
      let total = M.balas;
      if (this.modo === 4) {
        if (this.carrera.municion == null) this.carrera.municion = M.balas > 0 ? M.balas : 25;
        total = this.carrera.municion;
        this.carrera.max = M.max > 0 ? M.max : 50;
      }
      J.arma.balas = Math.min(J.arma.cargador, total);
      J.arma.reserva = total - J.arma.balas;
      J.arma.recargando = 0;
      this.ctx.mostrarArma?.(true);
      if (M.silenciador && !J._vrSilencio) {
        const orig = J.disparar.bind(J);
        J._vrSilencio = true;
        J.disparar = (o, d) => {
          const antes = J.ruido.p, r = orig(o, d);
          if (J.ruido.p === 200 && antes !== 200) {
            J.ruido.p = antes;
            J.ruido.len = 0;
            J.setRuido(5, 2, o);
          }
          return r;
        };
      }
    } else {
      J.arma.balas = 0;
      J.arma.reserva = 0;
      this.ctx.mostrarArma?.(false);
    }
    this.guardias = c.guardias || [];
  }
  get balasTotales() {
    const I = this.invDisco;
    if (I) return I.arma >= 0 ? Math.max(0, I.armas[I.arma] | 0) : 0;
    return this.J ? this.J.arma.balas + this.J.arma.reserva : 0;
  }
  devolverInventario() {
    const G = this.invGuardado, inv = this.invDisco || globalThis.__mgs?.inventario;
    this.invGuardado = null;
    this.invDisco = null;
    if (!G || !inv) return;
    Object.assign(inv, {
      armas: G.armas,
      armasMax: G.armasMax,
      items: G.items,
      arma: G.arma,
      item: G.item,
      cargador: G.cargador,
      cargadorMax: G.cargadorMax
    });
  }
  async armarFondo() {
    const F = this.vr.fondo || {};
    const bb = new THREE.Box3;
    this.mapaCaja = null;
    this.ctx.escena.traverse(o => {
      if (o.isMesh && !o.isSkinnedMesh && o.geometry?.attributes?.color && !this.grupo.getObjectById(o.id)) bb.expandByObject(o);
    });
    if (!bb.isEmpty()) this.mapaCaja = bb;
    const tipo = F.vrbg ?? {
      0: 1,
      1: 2,
      2: 2,
      3: 3,
      4: 3
    }[this.modo] ?? 1;
    const vR = (await this.infoFondo())?.salas?.[this.st]?.vR ?? 22;
    try {
      this.fondo?.dispose();
      this.fondo = new FondoVR({
        tipo: tipo,
        tipo2: F.vrbg2 ?? tipo,
        vR: vR,
        base: this.base
      });
      await this.fondo.listo;
      if (this.grupo) this.grupo.add(this.fondo.grupo);
    } catch (e) {
      console.warn("vr: sin fondo", e);
      this.fondo = null;
    }
  }
  infoFondo() {
    return this._infoFondo ||= fetch(this.base + "vr/comun/fondo.json").then(r => r.ok ? r.json() : null).catch(() => null);
  }
  async armarMeta() {
    const G = this.vr.meta?.goal;
    this.meta = null;
    if (!G || !G.modelo || !G.p) return;
    const o = await this.ctx.cargarGlb(G.modelo);
    o.position.copy(v3(G.p));
    if (G.d) o.rotation.set(G.d[0] * ANG, G.d[1] * ANG, G.d[2] * ANG, "YXZ");
    o.traverse(m => {
      if (m.isMesh) {
        m.userData.sinColision = true;
        m.raycast = () => {};
        for (const mt of [].concat(m.material)) {
          mt.polygonOffset = true;
          mt.polygonOffsetFactor = -2;
          mt.polygonOffsetUnits = -8;
        }
      }
    });
    this.meta = {
      o: o,
      visible: !this.vr.meta.aparece_al_limpiar && !G.oculta
    };
    o.visible = this.meta.visible;
    this.grupo.add(o);
  }
  async armarVigilancia(lista) {
    this.camarasV = [];
    this.reflectores = [];
    for (const a of lista) {
      const o = a.opts || {}, n = (k, d) => Array.isArray(o[k]) && typeof o[k][0] === "number" ? o[k] : d;
      const p = n("p", [ 0, 0, 0 ]), d = n("d", [ 0, 0, 0 ]);
      if (a.tipo === "CAMERA") {
        const C = {
          p: v3([ p[0], p[1] + 25, p[2] + 450 ]),
          base: {
            vx: Math.min(512, d[0]),
            vy: d[1] & 4095
          },
          rot: {
            vx: Math.min(512, d[0]),
            vy: d[1] & 4095
          },
          l: n("l", [ 0 ])[0],
          w: n("w", [ 512 ])[0] || 512,
          x: n("x", [ 0 ])[0],
          pared: "h" in o,
          st: 1,
          c: 0,
          obj: null,
          ve: false
        };
        if (a.modelo) {
          try {
            const m = await this.ctx.cargarGlb(a.modelo);
            m.position.copy(v3(p));
            m.rotation.set(0, C.rot.vy * ANG, 0, "YXZ");
            m.traverse(q => {
              if (q.isMesh) q.userData.sinColision = true;
            });
            this.grupo.add(m);
            C.obj = m;
            if (a.brazo) {
              const b = await this.ctx.cargarGlb(a.brazo);
              b.position.copy(v3(p));
              b.rotation.y = C.base.vy * ANG;
              this.grupo.add(b);
            }
          } catch {}
        }
        const led = new THREE.Mesh(new THREE.SphereGeometry(.03, 6, 4), new THREE.MeshBasicMaterial({
          color: 65280
        }));
        led.position.copy(C.p);
        led.userData.sinColision = true;
        this.grupo.add(led);
        C.led = led;
        this.camarasV.push(C);
      } else {
        const t = n("t", [ 280, 330, 512, 4 ]);
        const S = {
          p: v3(p),
          base: {
            vx: Math.min(1e3, d[0]),
            vy: d[1] & 4095
          },
          rot: {
            vx: Math.min(1e3, d[0]),
            vy: d[1] & 4095
          },
          h: n("h", [ 0 ])[0],
          ang: n("a", [ 300 ])[0],
          pmin: t[0],
          pmax: t[1],
          amp: t[2],
          vel: t[3],
          st: 2,
          c: 0
        };
        const mat = new THREE.MeshBasicMaterial({
          color: 16773824,
          transparent: true,
          opacity: .07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        S.cono = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20, 1, true), mat);
        S.cono.userData.sinColision = true;
        S.disco = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
          color: 16774864,
          transparent: true,
          opacity: .2,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }));
        S.disco.rotation.x = -Math.PI / 2;
        S.disco.userData.sinColision = true;
        this.grupo.add(S.cono, S.disco);
        this.reflectores.push(S);
      }
    }
  }
  limpiar3D() {
    for (const w of this.pegadosGuion || []) w.removeFromParent();
    this.pegadosGuion = [];
    if (this.grupo) {
      this.grupo.removeFromParent();
      this.grupo.traverse(o => {
        if (o.isMesh && (o.geometry?.type === "ConeGeometry" || o.geometry?.type === "CircleGeometry")) o.geometry.dispose();
      });
    }
    this.fondo?.dispose();
    this.fondo = null;
    this.chispas?.dispose();
    this.chispas = null;
    this.materia?.dispose();
    this.materia = null;
    this.warp?.soltar();
    this.warp = null;
    this.blancos?.soltar?.();
    if (this.paredesD?.length) {
      const P = globalThis.__mgs?.colParedes;
      for (const w of this.paredesD) {
        const i = P?.indexOf(w.m) ?? -1;
        if (i >= 0) P.splice(i, 1);
      }
      this.paredesD = [];
    }
    this.grupo = null;
    this.meta = null;
    this.blancos = null;
    this.guionD = null;
    this.camarasV = [];
    this.reflectores = [];
    if (this.foto) {
      this.restaurarFov();
      this.foto = null;
    }
  }
  empezarIntro() {
    this.estado = "intro";
    this.fi = 0;
    const D = this.camDatos;
    if (this.cj && D) this.cj.aplicar(D.ventana?.length ? D.ventana : (D.inicial || []).filter(a => a.t > 0));
    const ev = D ? (D.ventana?.length ? D.ventana_ev : D.inicial_ev) || [] : [];
    const S = this.vr.secuencia || {};
    this.agendaIntro = [];
    const A = (t, fn) => this.agendaIntro.push({
      t: t,
      fn: fn
    });
    for (const e of ev) {
      if (e.sound?.e) A(e.t, () => this.sonar(e.sound.e[2])); else if (e.chara === "VR_SNAKE") A(e.t, () => this.materializar(S.materializa_dur ?? 45, S.color || [ 128, 128, 128 ])); else if (e.mesg?.[0] === H.SNAKEWARP) A(e.t, () => e.mesg[1] === H.ENTRAR ? this.warp?.entrar() : this.warp?.salir()); else if (e.mesg?.[0] === H.VR && e.mesg[1] === H.RELOJ) A(e.t, () => {
        this.relojCorre = true;
      }); else if (e.pad && "s" in e.pad) A(e.t, () => this.tomarControl());
    }
    if (!ev.length) {
      A(S.materializa ?? 30, () => {
        this.sonar(190);
        this.materializar(S.materializa_dur ?? 45, S.color || [ 128, 128, 128 ]);
      });
      A((S.control ?? 85) - 15, () => this.warp?.entrar());
      A(80, () => this.sonar(188));
      A(S.control ?? 85, () => {
        this.relojCorre = !this.vr.reloj_guion;
        this.tomarControl();
      });
    }
  }
  materializar(t, color) {
    const cuerpo = this.ctx.cuerpo?.(), hueso = cuerpo?.getObjectByName?.("hueso_0"), c = new THREE.Vector3;
    if (hueso) hueso.getWorldPosition(c); else c.copy(this.ctx.jugador.position).add(new THREE.Vector3(0, .9, 0));
    this.materia?.dispose();
    this.materia = new Materializacion({
      centro: c,
      t: t,
      color: color,
      tex: this.texEf,
      camara: this.ctx.camara
    });
    this.grupo?.add(this.materia.grupo);
  }
  tomarControl() {
    const J = this.J;
    this.estado = "juego";
    this.relojCorre = !this.vr.reloj_guion;
    const S = this.vr.secuencia || {};
    this.fCtrl = 0;
    this.mensajesTarde = (S.mensajes || []).map(([t, d, m]) => ({
      t: t - (S.control ?? 85),
      d: d,
      m: m
    }));
    if (J) {
      J.activo = true;
      for (const a of this.datos.actores) {
        if (a.tipo !== "WATCHER" || !a.ruta_inicio?.puntos?.length) continue;
        const g = this.guardias.find(q => q.nombre === a.nombre);
        if (!g || !g.think) continue;
        g.nodos = a.ruta_inicio.puntos.map(q => ({
          p: v3(q.p),
          cmd: q.cmd || 0
        }));
        g.pts = g.nodos.map(q => q.p);
        g.puntosCmd = g.nodos.map(q => q.cmd);
        g.inicioPos = g.nodos[0].p.clone();
        const T = g.think;
        T.nodo = 0;
        T.objetivo = g.nodos[0].p.clone();
        T.t1 = 0;
        T.t2 = 0;
        J.paso?.(g, 1);
        g.pad.mode = 0;
        g.pad.time = 0;
      }
    }
    for (const [d, m] of this.vr.disco?.arranque || []) this.blancos?.mensaje?.(d, m);
    const snd = this.ctx.sonido;
    if (snd) {
      if (Array.isArray(snd.canciones)) snd.canciones = [ 1, 1 ];
      snd.cancion?.(1);
    }
    this.emit("inicio", {
      st: this.st,
      modo: this.modo
    });
  }
  actualizar(dt) {
    if (this.estado === "off") return;
    if (this.pausaDepuracion) {
      this.animar3D(0);
      this.dibujar();
      return;
    }
    this.t += dt;
    if (this.aviso && (this.aviso.t -= dt * FPS) <= 0) this.aviso = null;
    this.acum += Math.min(dt, .25);
    let n = 0;
    while (this.acum >= 1 / FPS && n < 8) {
      this.acum -= 1 / FPS;
      this.cuadro();
      n++;
    }
    this.over?.actualizar(dt);
    this.animar3D(dt);
    this.dibujar();
  }
  cuadro() {
    this.f++;
    if (this.estado === "menu") {
      if (this.tituloD?.activo) this.tituloD.cuadro(); else {
        this.fondoMenu?.cuadro();
        if (this.menuD?.activo) this.menuD.cuadro(); else this.menuVR?.cuadro();
      }
      if (this.agendaMenu && --this.agendaMenu.t <= 0) {
        const a = this.agendaMenu;
        this.agendaMenu = null;
        a.fn();
      }
      return;
    }
    this.cuadroCamara();
    if (this.demoTec) this.cuadroDemoTec();
    if (this.fade) {
      this.fade.n++;
      if (this.fade.modo === "entra" && this.fade.n >= this.fade.total) this.fade = null;
    }
    this.chispas?.cuadro();
    this.materia?.cuadro();
    if (this.materia?.fin) {
      this.materia.dispose();
      this.materia = null;
    }
    this.warp?.cuadro();
    if (this.meta?.o && this.meta.visible) this.meta.o.rotation.y += GIRO_META;
    if (this.win) this.cuadroVentana();
    const E = this.estado;
    if (this.foto && (E === "intro" || E === "juego")) {
      const r = this.foto.cuadro(E === "juego");
      if (E === "intro" && this.foto.estado === "juego") {
        this.restaurarFov();
        this.tomarControl();
      }
      if (r) this.terminarFoto(r);
      return;
    }
    if (this.foto && E === "fin") {
      this.foto.cuadro(false);
      if (++this.fc >= 45) this.abrirMenu();
      return;
    }
    if (E !== "ventana" && E !== "pausa") this.hud?.cuadro();
    if (E === "ventana") return;
    if (E === "intro") {
      this.fi++;
      for (const a of this.agendaIntro) if (!a.hecho && this.fi >= a.t) {
        a.hecho = true;
        a.fn();
      }
      return;
    }
    if (E === "juego") return this.cuadroJuego();
    if (E === "pausa") {
      const r = this.pausa?.cuadro();
      if (r === "reintentar") this.reintentarPausa(); else if (r === "salir") this.abrirMenu();
      return;
    }
    if (E === "clear" || E === "derrota") {
      this.fc++;
      this.agenda();
    }
    if (E === "clear" && this.clear) {
      const op = this.clear.cuadro();
      if (op != null) this.elegirClear(op);
    }
    if (E === "derrota") this.cuadroDerrota();
  }
  cuadroVentana() {
    const W = this.win;
    if (W.st === 1) {
      if (++W.step === 5) {
        W.st = 2;
        W.step = 0;
      }
    } else if (W.st === 2) {
      if (++W.step === 5) {
        W.st = 3;
        W.step = 0;
      }
    } else if (W.st === 3) {
      const antes = W.n;
      W.n = Math.min(W.total, W.n + 2);
      const plano = W.lineas.join("");
      if (W.n > antes && plano[W.n - 1] && plano[W.n - 1] !== " ") this.sonar(SE.ESCRIBE, 32);
      if (W.n >= W.total) W.st = 0;
    } else if (W.st === 4) {
      if (++W.step === 5) {
        W.st = 5;
        W.step = 0;
      }
    } else if (W.st === 5) {
      if (++W.step === 5) {
        W.st = 6;
        W.step = 0;
      }
    } else if (W.st === 6) {
      if (++W.step === 3) this.win = null;
    }
    if (this.win && this.win.st >= 4 && this.estado === "ventana") {
      if (this.ventanaTr) this.cerrarVentanaTrampa(); else this.empezarIntro();
    }
  }
  abrirVentanaTrampa() {
    const W = this.vr.ventana_trampa;
    if (!W || this.estado !== "juego") return;
    this.win = this.armarVentana(W);
    this.ventanaTr = {
      proc: W.proc
    };
    this.sonar(SE.ELEGIR);
    this.estado = "ventana";
  }
  cerrarVentanaTrampa() {
    const T = this.ventanaTr;
    this.ventanaTr = null;
    this.estado = "juego";
    if (T?.proc) this.guionD?.correr(parseInt(T.proc, 16));
  }
  padGuion(sin) {
    if (this.J) this.J.padVR = sin ? 1 : 0;
    this.padT = 0;
  }
  cerrarVentana() {
    const W = this.win;
    if (!W || W.st >= 4) return;
    if (W.st === 1) {
      W.st = 5;
      W.step = 4 - W.step;
    } else if (W.st === 2) {
      W.st = 4;
      W.step = 4 - W.step;
    } else {
      W.st = 4;
      W.step = 0;
    }
    this.sonar(SE.ELEGIR);
  }
  cuadroJuego() {
    const J = this.J, V = this.vr;
    this.cuadroVigilancia();
    this.blancos?.cuadro();
    if (this.estado !== "juego") return;
    this.guionD?.cuadro();
    this.cuadroCinema();
    if (this.estado !== "juego") return;
    if (J?.padVR && ++this.padT > 1800) {
      J.padVR = 0;
      console.warn("vr: pad -r sin pad -s en 60 s: vuelve el control");
    }
    this.fCtrl = (this.fCtrl || 0) + 1;
    if (this.mensajesTarde?.length) for (const x of this.mensajesTarde.filter(q => q.t <= this.fCtrl)) {
      this.mensajesTarde.splice(this.mensajesTarde.indexOf(x), 1);
      this.mesgGuion(x.d, x.m, []);
    }
    this.cuadroTrampas();
    if (this.estado !== "juego") return;
    this.cuadroMystery();
    if (this.estado !== "juego") return;
    if (this.vr2) return this.cuadroVR2();
    if (this.relojCorre && !this.relojPausa) {
      this.tiempo++;
      if (this.limite != null) {
        const rem = this.limite - this.tiempo;
        if (rem < 300 && rem % 30 === 29) this.sonar(SE.PITIDO);
        if (this.tiempo === this.limite) {
          this.sonar(SE.FIN_TIEMPO);
          this.vozOver = V.voz;
          return this.perder("tiempo");
        }
      }
    }
    if (V.tiro && !this.metaLista) {
      const vivos = this.guardias.filter(g => !(g.accion === "muerto" || g.faseout || g.estado === "muerto"));
      if (!vivos.length && this.guionD && V.tiro.proc && !this.procTiro) {
        this.procTiro = true;
        this.correrProcVR(V.tiro.proc);
      } else if (!vivos.length && !this.guionD) {
        this.metaLista = true;
        if (this.meta) {
          this.meta.visible = true;
          this.meta.o.visible = true;
        }
        this.sonar(SE.META);
        this.emit("meta", {});
      }
    }
    if (V.claymores && !this.metaLista && !this.procClay && (this.invDisco?.armas?.[5] ?? 0) >= V.claymores.n) {
      this.procClay = true;
      if (this.guionD) this.correrProcVR(V.claymores.proc); else this.mostrarMeta(true);
    }
    if (V.blancos && this.nombresCuenta?.size && !this.metaLista) {
      if (this.cuenta > V.blancos.n) this.cuenta = V.blancos.n;
      if (this.cuenta > this.cuentaVista) {
        this.cuentaVista = this.cuenta;
        this.cuentaRojo = 1;
        this.sonar(180, 80);
      }
      if (this.cuenta >= V.blancos.n && ++this.cuentaT > 29) {
        this.metaLista = true;
        if (this.meta) {
          this.meta.visible = true;
          this.meta.o.visible = true;
        }
        this.sonar(SE.META);
        this.emit("meta", {});
      }
    }
    const yo = this.ctx.jugador.position;
    for (const d of this.drops) {
      if (!d.o.visible) continue;
      if ((d.t -= 1) <= 0) {
        d.o.visible = false;
        continue;
      }
      if (d.o.position.distanceTo(yo) < .8 && J) {
        d.o.visible = false;
        this.sonar(22);
        const tot = Math.min(this.carrera?.max ?? 50, this.balasTotales + d.n);
        if (J.arma.balas === 0) J.arma.balas = Math.min(J.arma.cargador, tot);
        J.arma.reserva = Math.max(0, tot - J.arma.balas);
      }
    }
    if (this.metaLista) {
      const m = v3(V.meta.p);
      if (Math.abs(yo.x - m.x) <= .5 && Math.abs(yo.z - m.z) <= .5 && Math.abs(yo.y + 1 - m.y) <= 1) {
        if (V.f === 3 && this.esMystery) {
          if (this.escolta & 256) this.ganar(); else if (this.escolta & 512) this.perder("tiempo");
        } else this.ganar();
      }
    }
  }
  prepararMystery(actores) {
    this.esMystery = false;
    this.escolta = 0;
    this.relojPausa = false;
    this.pistas = [];
    this.cajasMyst = [];
    this.alientosG = [];
    for (const g of this.guardias || []) {
      const m = g.o?.userData?.guardia?.mystery;
      if (!m) continue;
      this.esMystery = true;
      g.myst = {
        b: m.b,
        k: m.k,
        a: m.a
      };
      if (m.k & 72 && ((g.nodos?.[0]?.cmd ?? 0) & 31) === 13) this.J?.fingirMuerto?.(g);
    }
    this.ventanaTr = null;
    this.camMira = null;
    this.cinema = null;
    this.hudOculto = false;
    this.camEscena = null;
    this.huellas?.limpiar();
    this.huellas = null;
    if ((this.guardias || []).some(g => g.myst && g.myst.k & 1) && this.vr.zonas_huella) this.huellas = new HuellasMystery({
      grupo: this.grupo,
      zonas: this.vr.zonas_huella
    });
    this.pistasZona = new Set;
    const rec = x => {
      if (Array.isArray(x)) x.forEach(rec); else if (x && typeof x === "object") {
        if (x.cmd === "mesg" && x.args?.[0]?.id != null) this.pistasZona.add(x.args[0].id & 65535);
        Object.values(x).forEach(rec);
      }
    };
    rec(this.vr.disco?.trampas || []);
    for (const a of actores) {
      if (a.tipo === "FINDTRAP" && a.p) {
        const s = (a.opts?.s || []).filter(x => typeof x === "number");
        this.pistas.push({
          nombre: a.nombre,
          p: v3(a.p),
          sx: s[0] ?? 160,
          sy: s[1] ?? 112,
          proc: (a.opts?.e || []).find(x => x && x.proc != null)?.proc,
          hecha: false,
          enZona: false,
          muerta: false
        });
      }
      if (a.tipo === "BOXALL" && a.p) this.cajasMyst.push({
        a: a,
        p: v3(a.p),
        proc: (a.opts?.e || []).find(x => x && x.proc != null)?.proc,
        nombre: (a.opts?.n || [])[0] || "ITEM",
        o: null
      });
    }
    for (const c of this.cajasMyst) if (c.a.modelo) this.ctx.cargarGlb(c.a.modelo).then(o => {
      o.position.copy(c.p);
      this.grupo?.add(o);
      c.o = o;
    }).catch(() => {});
    this.puerta = null;
    const ad = actores.find(a => a.tipo === "MYSTERYDOOR");
    if (ad) {
      const P = globalThis.__mgs?.colParedes, d = (ad.opts?.d || []).filter(x => typeof x === "number");
      const g = new THREE.BoxGeometry(1.5, 3, .1);
      g.translate(8, 1.5, .25);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false
      }));
      m.userData.propio = m.userData.sinColision = true;
      m.frustumCulled = false;
      m.updateMatrixWorld(true);
      this.grupo?.add(m);
      if (Array.isArray(P)) P.push(m);
      const D = this.puerta = {
        o: null,
        pared: m,
        rot: [ d[0] || 0, d[1] || 0, d[2] || 0 ],
        t: -1,
        abierta: false,
        caja: new THREE.Box3(new THREE.Vector3(7.25, 0, -.4), new THREE.Vector3(8.75, 3, .4))
      };
      if (ad.modelo) this.ctx.cargarGlb(ad.modelo).then(o => {
        o.position.set(ad.p[0] * MM, ad.p[1] * MM, ad.p[2] * MM);
        o.rotation.set(D.rot[0] * ANG, D.rot[1] * ANG, D.rot[2] * ANG, "YXZ");
        o.traverse(q => {
          if (q.isMesh) q.userData.sinColision = true;
        });
        this.grupo?.add(o);
        D.o = o;
      }).catch(() => {});
    }
  }
  golpePuerta(yo, frente, modo) {
    const D = this.puerta;
    if (!D || D.t >= 0) return;
    const p = yo.clone().addScaledVector(new THREE.Vector3(frente.x, 0, frente.z).normalize(), .6);
    p.y += 1;
    if (!D.caja.clone().expandByScalar(.3).containsPoint(p)) return;
    if (modo === 4) {
      this.sonar(207);
      D.t = 0;
    } else this.sonar(206);
  }
  cuadroPuerta() {
    const D = this.puerta;
    if (!D || D.t < 0 || D.t > 39) return;
    const t = D.t;
    if (t < 4) {
      D.rot[1] -= 256;
      D.rot[2] += 10;
    } else if (t < 6) D.rot[1] += 128; else if (t < 8) D.rot[1] += 64; else if (t < 12) D.rot[1] += 32; else if (t >= 16 && t < 32) D.rot[1] -= 20; else if (t >= 32) D.rot[1] -= 24;
    if (t === 8) {
      this.sonar(208);
      const P = globalThis.__mgs?.colParedes, i = P?.indexOf(D.pared) ?? -1;
      if (i >= 0) P.splice(i, 1);
      D.abierta = true;
    }
    if (D.o) D.o.rotation.set(D.rot[0] * ANG, D.rot[1] * ANG, D.rot[2] * ANG, "YXZ");
    D.t++;
  }
  cuadroMystery() {
    this.cuadroPuerta();
    this.huellas?.cuadro();
    if (!this.esMystery && !this.pistas?.length && !this.cajasMyst?.length) return;
    const J = this.J, yo = this.ctx.jugador.position;
    const g = J?.ctx?.guardias?.find(q => q.accion === "agarrado" && q.myst);
    this.escolta = !g ? 0 : "CE".includes(g.myst.b) ? g.myst.k & 256 ? 512 : 256 : "DF".includes(g.myst.b) ? 512 : 0;
    const cam = this.ctx.camara, primera = !this.ctx.cuerpo?.();
    for (const P of this.pistas || []) {
      if (P.hecha || P.muerta || !cam || P.proc == null || !primera) continue;
      if (this.pistasZona?.has(P.nombre & 65535) && !P.enZona) continue;
      if (P.p.distanceTo(yo) > 8) continue;
      const q = P.p.clone().project(cam);
      if (q.z > 1 || q.z < -1) continue;
      if (Math.abs(q.x * 160) >= P.sx || Math.abs(q.y * 112) >= P.sy) continue;
      if (J?.libre && !J.libre(cam.getWorldPosition(new THREE.Vector3), P.p.clone().setY(P.p.y + .1))) continue;
      if (this.puerta && !this.puerta.abierta) {
        const o = cam.getWorldPosition(new THREE.Vector3), dd = P.p.clone().sub(o), L = dd.length(), r = new THREE.Ray(o, dd.normalize()), q = r.intersectBox(this.puerta.caja.clone().expandByVector(new THREE.Vector3(0, 0, -.35)), new THREE.Vector3);
        if (q && q.distanceTo(o) < L) continue;
      }
      P.hecha = true;
      this.sonar(SE.ELEGIR, 32);
      this.guionD?.correr(typeof P.proc === "string" ? parseInt(P.proc, 16) : P.proc);
    }
    for (const c of this.cajasMyst || []) {
      if (c.tomada || c.p.distanceTo(yo) > .8) continue;
      c.tomada = true;
      if (c.o) c.o.visible = false;
      this.sonar(22);
      this.avisar(String(c.nombre).toUpperCase());
      if (c.proc != null) this.guionD?.correr(typeof c.proc === "string" ? parseInt(c.proc, 16) : c.proc);
    }
    for (const q of J?.ctx?.guardias || []) {
      if (q.myst?.a !== "S" || q.faseout || q.inactivo || q.accion === "muerto" || (this.f + q.num * 13) % 45) continue;
      const h = q.o.getObjectByName("hueso_6");
      if (!h) continue;
      const p = h.getWorldPosition(new THREE.Vector3), r = q.o.rotation.y, d = new THREE.Vector3(Math.sin(r), .25, Math.cos(r));
      p.addScaledVector(d, .15);
      this.alientosG.push({
        s: this.bocanada(p),
        d: d.multiplyScalar(.006),
        t: 0
      });
    }
    for (const b of this.alientosG.slice()) {
      b.t++;
      b.s.position.add(b.d);
      b.s.scale.setScalar(.08 + b.t * .01);
      b.s.material.opacity = .45 * (1 - b.t / 24);
      if (b.t >= 24) {
        b.s.removeFromParent();
        b.s.material.dispose();
        this.alientosG.splice(this.alientosG.indexOf(b), 1);
      }
    }
  }
  bocanada(p) {
    if (!this.texAliento) {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const x = c.getContext("2d");
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,0.8)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 32, 32);
      this.texAliento = new THREE.CanvasTexture(c);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texAliento,
      transparent: true,
      depthWrite: false,
      opacity: .45
    }));
    s.position.copy(p);
    s.scale.setScalar(.08);
    s.userData.propio = s.userData.sinColision = true;
    this.grupo?.add(s);
    return s;
  }
  cuadroTrampas() {
    const G = this.guionD;
    if (!G || !this.zonasD?.length) return;
    const actores = [ [ 8650, this.ctx.jugador.position ] ];
    for (const g of this.guardias || []) if (!g.faseout && !g.inactivo) actores.push([ g.nombre & 65535, g.o.position ]);
    for (const b of this.blancos?.vivos || []) if (b.nombre != null) actores.push([ b.nombre & 65535, b.p.clone().setY(b.p.y - .5) ]);
    const q = new THREE.Vector3;
    for (const [ch, p] of actores) {
      q.copy(p);
      q.y += .5;
      for (const z of this.zonasD) {
        const k = ch + ":" + z.h, d = z.cajas.some(c => c.containsPoint(q));
        if (d === !!this.dentroD.get(k)) continue;
        this.dentroD.set(k, d);
        G.trampa(z.h, d ? 3538 : 54732, ch);
        if (this.estado !== "juego") return;
      }
    }
  }
  mostrarMeta(sonido) {
    if (this.metaLista) return;
    this.metaLista = true;
    if (this.meta) {
      this.meta.visible = true;
      this.meta.o.visible = true;
    }
    if (sonido) this.sonar(SE.META);
    this.emit("meta", {});
  }
  correrProcVR(hex) {
    this.guionD.correr(parseInt(hex, 16));
    if (this.estado === "juego" && !this.metaLista) {
      this.metaLista = true;
      this.emit("meta", {});
    }
  }
  charaGuion(tipo, nombre, o) {
    const V = this.vr;
    if (tipo === "GOAL") {
      if (o.v?.[0] !== 0 && this.meta) {
        this.meta.visible = true;
        this.meta.o.visible = true;
      }
      return;
    }
    if ((tipo === "VRBOX2" || tipo === "VRBOX" || tipo === "VRBOX4") && this.blancos) {
      const m4 = tipo === "VRBOX4" ? V.items?.vrbox4?.[String((o.m || [ 0 ])[0])] : null;
      this.blancos.agregar({
        tipo: tipo,
        nombre: nombre,
        opts: o,
        puntos: V.rutas?.[String((o.r || [ 0 ])[0])] || [],
        modelo: m4 || V.items?.blanco || V.meta?.goal?.modelo?.replace("b466", "box_01")
      });
      return;
    }
    if (tipo === "DYNWALL") {
      const p = (o.p || []).filter(x => typeof x === "number"), h = (o.h || [ 0 ])[0] * MM, P = globalThis.__mgs?.colParedes;
      if (p.length < 6 || !Array.isArray(P)) return;
      const [x0, y0, z0, x1, y1, z1] = p.map(v => v * MM), y = Math.min(y0, y1);
      const g = new THREE.BufferGeometry;
      g.setAttribute("position", new THREE.Float32BufferAttribute([ x0, y, z0, x1, y, z1, x1, y + h, z1, x0, y, z0, x1, y + h, z1, x0, y + h, z0 ], 3));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = true;
      m.frustumCulled = false;
      this.grupo?.add(m);
      P.push(m);
      this.paredesD.push({
        nombre: nombre,
        m: m
      });
      return;
    }
    if (tipo === "VRWINDOW") {
      this.abrirVentanaTrampa();
      return;
    }
    if (tipo === "CINEMA") {
      this.cinema = {
        nombre: (nombre ?? 0) & 65535,
        n: 0,
        total: (o.t || [ 3e4 ])[0] ?? 3e4,
        sale: null
      };
      return;
    }
    if (tipo === "VRCLEAR") return;
    if (tipo === "BELONG") {
      const m = (o.m || [])[0], c = ((o.c || [])[0] ?? 0) & 65535, u = (o.u || [ 6 ])[0], url = V.modelos_guion?.[((m ?? 0) & 65535).toString(16).padStart(4, "0")];
      if (url) this.ctx.cargarGlb(url).then(w => {
        const dueño = c === 8650 ? globalThis.__mgs?.cuerpo?.obj : this.guardias.find(q => (q.nombre & 65535) === c)?.o, h = dueño?.getObjectByName("hueso_" + u);
        if (!h || this.estado === "off") return;
        w.traverse(q => {
          if (q.isMesh) q.userData.sinColision = true;
        });
        w.name = "belong_guion";
        h.add(w);
        (this.pegadosGuion ||= []).push(w);
      }).catch(e => console.warn("vr: BELONG del guion", e));
      return;
    }
    if (tipo === "WALL") {
      const m = (o.m || [])[0], url = V.modelos_guion?.[((m ?? 0) & 65535).toString(16).padStart(4, "0")], p = (o.p || []).filter(x => typeof x === "number"), d = (o.d || []).filter(x => typeof x === "number");
      if (url && p.length >= 3) this.ctx.cargarGlb(url).then(w => {
        w.position.set(p[0] * MM, p[1] * MM, p[2] * MM);
        w.rotation.set((d[0] || 0) * ANG, (d[1] || 0) * ANG, (d[2] || 0) * ANG, "YXZ");
        w.traverse(q => {
          if (q.isMesh) q.userData.sinColision = true;
        });
        w.name = "wall_guion";
        this.grupo?.add(w);
        this.wallsGuion = (this.wallsGuion || 0) + 1;
      }).catch(e => console.warn("vr: WALL del guion", e));
      return;
    }
    (this._sinSop ||= new Set).add(tipo);
  }
  cambiarRuta(nombre, resto = []) {
    const J = this.J, pts = this.vr.rutas?.[String(resto[0])];
    if (!J || !pts?.length) return;
    const g = this.guardias.find(q => (q.nombre & 65535) === nombre);
    if (!g || !g.think || g.faseout) return;
    g.nodos = pts.map(q => ({
      p: v3(q.p),
      cmd: q.cmd || 0
    }));
    g.pts = g.nodos.map(q => q.p);
    g.puntosCmd = g.nodos.map(q => q.cmd);
    const T = g.think;
    T.nodo = 0;
    T.objetivo = g.nodos[0].p.clone();
    T.t1 = 0;
    T.t2 = 0;
    J.paso?.(g, 1);
    g.pad.mode = 0;
    g.pad.time = 0;
  }
  procActor(a, letra) {
    if (!this.vr?.disco || !this.guionD) return false;
    const p = (a?.opts?.[letra] || []).find(x => x && typeof x === "object" && "proc" in x)?.proc;
    if (p == null) return false;
    this.guionD.correr(typeof p === "string" ? parseInt(p, 16) : p);
    return true;
  }
  camaraGuion(c) {
    if (this.cj && this.camDatos && c) this.cj.camera(c);
  }
  musicaGuion(r) {
    const a = this.ctx.sonido;
    if (!a) return;
    try {
      if (r.b) {
        const igual = a.canciones && a.canciones[0] === r.b[0] && a.canciones[1] === r.b[1];
        a.canciones = r.b.slice();
        if (r.n && !igual) a.cancion?.(r.b[a.modo ? 1 : 0]);
      }
      if (r.s != null) a.cancion?.(r.s);
      if (r.c != null) a.codigo?.((r.c | 33554176) >>> 0);
      if (r.x != null) a.codigo?.(r.x >>> 0);
    } catch (e) {
      console.warn("vr: sound del guion", e);
    }
  }
  cuadroCinema() {
    const C = this.cinema;
    if (!C) return;
    C.n++;
    if (C.total < 3e4 && C.n >= C.total && C.sale == null) C.sale = 0;
    if (C.sale != null && ++C.sale >= 15) this.cinema = null;
  }
  get barrasCine() {
    const C = this.cinema;
    if (!C || this.estado === "off") return 0;
    return C.sale != null ? Math.max(0, 1 - C.sale / 15) : Math.min(1, C.n / 15);
  }
  dibujarCinema(x, M) {
    const C = this.cinema;
    if (!C || this.ctx.renderer?.xr?.isPresenting) return;
    const k = this.barrasCine, alto = 224 + 2 * M.margenY, y0 = -M.margenY;
    x.fillStyle = `rgba(0,0,0,${k.toFixed(3)})`;
    x.fillRect(-M.margenX, y0, 320 + 2 * M.margenX, alto * 24 / 240);
    x.fillRect(-M.margenX, y0 + alto - alto * 40 / 240, 320 + 2 * M.margenX, alto * 40 / 240);
  }
  mesgGuion(dest, msg, rest) {
    const V = this.vr;
    if (dest === 50006) {
      if (this.cj && this.camDatos && rest.length) {
        (this.camEscena ||= new Set)[rest[0] === 3538 ? "add" : "delete"](msg);
        this.cj.mensajes.push([ msg, rest[0] ]);
      }
      return;
    }
    if (this.cinema && dest === this.cinema.nombre) {
      if (msg === 54304) this.cinema.sale ??= 0; else if (msg === 12835 || msg === 29789) this.cinema = null;
      return;
    }
    if (dest === 19169 && msg === 35983) {
      if (this.meta) {
        this.meta.visible = true;
        this.meta.o.visible = true;
      }
      this.metaVista = true;
      return this.mostrarMeta(false);
    }
    if (dest === 60806 && msg === 4600 && V.meta?.h) {
      V.meta.p = V.meta.h.slice();
      return;
    }
    if (dest === 60806 && msg === 48972) {
      this.cuenta = (this.cuenta || 0) + 1;
      return;
    }
    if (dest === 60806 && msg === 12353) {
      this.relojPausa = true;
      return;
    }
    if (dest === 60806 && msg === 12139) {
      this.relojPausa = false;
      return;
    }
    if (msg === 54105) {
      const g = this.guardias.find(q => (q.nombre & 65535) === dest && q.myst);
      if (g) g.myst.k &= ~256;
      return;
    }
    if (dest === 60806 && msg === H.RELOJ) {
      this.relojCorre = true;
      return;
    }
    if (dest === 60806 && msg === H.CLEAR) {
      if (this.estado === "juego") this.ganar();
      return;
    }
    const P = (this.pistas || []).find(q => (q.nombre & 65535) === dest);
    if (P) {
      if (msg === H.ENTRAR) P.enZona = true; else if (msg === H.SALIR) P.enZona = false; else if (msg === 12835) P.muerta = true;
      return;
    }
    if (msg === 0) {
      const g = this.guardias.find(q => (q.nombre & 65535) === dest && q.myst);
      if (g) {
        if (g.accion === "finge") this.J?.despertarMystery?.(g); else this.J?.liberarNodo?.(g);
        return;
      }
    }
    if (dest === 8650 && (msg === 35275 || msg === 28923 || msg === 12856 || msg === 37754)) {
      try {
        globalThis.__mgs?.guion?.op?.mensaje?.(8650, [ msg, ...rest ], null);
      } catch (e) {
        console.warn("vr: mensaje a Snake", e);
      }
      if (msg === 35275 && this.camMira && rest.length >= 3) {
        const dx = this.camMira[0] - rest[0], dz = this.camMira[2] - rest[2], L = Math.hypot(dx, dz);
        if (L > 1) this.emit("girar", {
          dx: dx / L,
          dz: dz / L
        });
      }
      return;
    }
    if (dest === 60806 && msg === 18625 && V.tiro?.proc && !this.procTiro) {
      this.procTiro = true;
      this.correrProcVR(V.tiro.proc);
      return;
    }
    if (dest === 60806 && (msg === 22636 || msg === 60206)) {
      if (msg === 60206) this.vozOver = V.voz;
      this.sonar(SE.FIN_TIEMPO);
      this.perder("tiempo");
      return;
    }
    if (msg === 17167) return this.cambiarRuta(dest, rest);
    this.blancos?.mensaje?.(dest, msg);
    if (msg === 107 || msg === 12835) {
      const P = globalThis.__mgs?.colParedes;
      for (const w of this.paredesD.filter(q => q.nombre === dest)) {
        const i = P?.indexOf(w.m) ?? -1;
        if (i >= 0) P.splice(i, 1);
        w.m.removeFromParent();
        this.paredesD.splice(this.paredesD.indexOf(w), 1);
      }
    }
  }
  espadaNinja(yo, frente) {
    const J = this.J, f = new THREE.Vector3(frente.x, 0, frente.z).normalize(), dentro = p => {
      const d = p.clone().sub(yo), a = d.x * f.x + d.z * f.z, lat = Math.abs(d.x * f.z - d.z * f.x);
      return a > -.2 && a <= 1.8 && lat <= .9 && Math.abs(d.y) <= 1.2;
    };
    this.sonar(216);
    for (const g of J?.activos?.() || []) if (![ "muerto", "cuelloRoto" ].includes(g.accion) && dentro(g.o.position)) J.dañar(g, 9999, 1);
    for (const b of this.blancos?.vivos || []) if (dentro(b.p.clone().setY(b.p.y - .5))) this.blancos.golpe(b, 9999);
    return true;
  }
  cuadroVR2() {
    const V = this.vr, R = this.vr2;
    R.puntos = (this.cuenta || 0) + (this.blancos?.rotos || 0);
    if (R.puntos > R.vistos) {
      R.vistos = R.puntos;
      R.amarillo = 1;
      this.sonar(180, 80);
    }
    if (!this.relojCorre) return;
    this.tiempo++;
    const rem = V.vr2.limite - this.tiempo;
    if (rem > 0 && rem < 300 && rem % 30 === 29) this.sonar(SE.PITIDO);
    if (rem <= 0) {
      this.tiempo = V.vr2.limite;
      if (R.puntos >= V.vr2.minimo) this.ganar(); else {
        this.vozOver = V.voz;
        this.perder("tiempo");
      }
    }
  }
  alMorir(g) {
    if (this.vr?.disco && this.estado === "juego" && this.nombresCuenta?.has(g.nombre)) this.cuenta = (this.cuenta || 0) + 1; else if (this.vr?.disco && this.estado === "juego" && this.guionD) {
      const pe = (g.opts?.e || []).find(x => x && typeof x === "object" && "proc" in x);
      if (pe) this.guionD.correr(pe.proc);
    }
    if (this.modo !== 4 || !this.grupo) return;
    const h = g.opts?.h;
    if (!Array.isArray(h) || h[0] !== 3) return;
    const n = typeof h[1] === "number" ? h[1] : 12;
    const url = this.vr.items?.socom;
    if (!url) return;
    this.ctx.cargarGlb(url).then(o => {
      o.position.copy(g.o.position);
      o.position.y += .05;
      o.traverse(q => {
        if (q.isMesh) q.userData.sinColision = true;
      });
      this.grupo?.add(o);
      this.drops.push({
        o: o,
        n: n,
        t: 450
      });
    }).catch(() => {});
  }
  puntoSnake() {
    const J = this.J;
    return J?.puntoSnake ? J.puntoSnake() : this.ctx.jugador.position.clone().add(new THREE.Vector3(0, 1.1, 0));
  }
  alertar() {
    const J = this.J;
    if (!J?.com) return;
    J.com.alerta = 255;
    J.gopointSnake?.();
    if (J.com.modo !== 1) J.ponerModo?.(1);
  }
  cuadroVigilancia() {
    const sn = this.puntoSnake(), J = this.J, alerta = J?.com?.modo === 1;
    for (const C of this.camarasV) {
      const d = sn.clone().sub(C.p), hor = Math.hypot(d.x, d.z);
      const pv = {
        vy: dirDe(d.x, d.z),
        vx: ((Math.round(Math.atan2(hor, d.y) / ANG) - 1024) % 4096 + 4096) % 4096
      };
      const ve = difAbs(pv.vy, C.rot.vy) <= C.w && difAbs(pv.vx, C.rot.vx) <= C.w && d.length() * 1e3 <= C.l && (!C.pared || !J || J.libre(C.p, sn));
      if (alerta) {
        C.st = 4;
        C.rot.vy += Math.sign(difS(C.rot.vy, pv.vy)) * Math.min(16, difAbs(C.rot.vy, pv.vy));
        if (ve) J.com.alerta = 255;
      } else if (C.st === 1 || C.st === 2) {
        if (++C.c > 60 && C.x >= 8) {
          C.rot.vy = (C.rot.vy + (C.st === 1 ? 8 : -8) + 4096) % 4096;
          if (difAbs(C.base.vy, C.rot.vy) >= C.x) {
            C.st = C.st === 1 ? 2 : 1;
            C.c = 0;
          }
          if (C.c % 13 === 0) this.sonar(SE.BARRIDO, 16);
        }
        if (ve) {
          C.st = 5;
          C.c = 0;
        }
      } else if (C.st === 5) {
        if (C.c === 0) {
          this.sonar(SE.LENTE);
          C.led.material.color.set(16711680);
        }
        const dd = difS(C.rot.vy, pv.vy);
        C.rot.vy = (C.rot.vy + Math.sign(dd) * Math.min(Math.abs(dd), 24) + 4096) % 4096;
        if (C.c === 15) {
          this.sonar(SE.SORPRESA);
          this.descubierto("camara", C.p);
        }
        if (C.c === 35) {
          this.alertar();
          C.st = 4;
        }
        C.c++;
      } else if (C.st === 4 && !alerta) {
        C.st = 1;
        C.c = 0;
        C.led.material.color.set(65280);
      }
      if (C.obj) C.obj.rotation.set(0, C.rot.vy * ANG, 0, "YXZ");
    }
    for (const S of this.reflectores) {
      const obj = new THREE.Vector3(sn.x, S.h * MM, sn.z), d = obj.clone().sub(S.p);
      const eje = this.ejeReflector(S), ang = Math.round(eje.angleTo(d) / ANG);
      const ve = ang <= S.ang / 2;
      if (alerta) {
        S.st = 4;
        this.apuntar(S, obj, 24);
        if (ve) J.com.alerta = 255;
      } else if (S.st === 2 || S.st === 3) {
        if (++S.c > 60) {
          S.rot.vy = (S.rot.vy + (S.st === 2 ? S.vel : -S.vel) + 4096) % 4096;
          if (difAbs(S.base.vy, S.rot.vy) > S.amp) {
            S.rot.vy = (S.base.vy + (S.st === 2 ? S.amp : -S.amp) + 4096) % 4096;
            S.st = S.st === 2 ? 3 : 2;
            S.c = 0;
          }
        }
        if (ve) {
          S.st = 1;
          S.c = 0;
          this.sonar(SE.SORPRESA);
          this.descubierto("camara", S.p);
        }
      } else if (S.st === 1) {
        this.apuntar(S, obj, 32);
        if (++S.c > 14) {
          this.alertar();
          S.st = 4;
        }
      } else if (S.st === 4 && !alerta) {
        S.st = 2;
        S.c = 0;
        S.rot.vx = S.base.vx;
      }
    }
  }
  ejeReflector(S) {
    const p = S.rot.vx * ANG, y = S.rot.vy * ANG;
    return new THREE.Vector3(Math.sin(y) * Math.cos(p), -Math.sin(p), Math.cos(y) * Math.cos(p));
  }
  apuntar(S, obj, vel) {
    const d = obj.clone().sub(S.p), hor = Math.hypot(d.x, d.z);
    const vy = dirDe(d.x, d.z), vx = Math.max(S.pmin, Math.min(S.pmax, Math.round(Math.atan2(hor, d.y) / ANG) - 1024));
    let dd = difS(S.rot.vy, vy);
    S.rot.vy = (S.rot.vy + Math.sign(dd) * Math.min(Math.abs(dd), vel) + 4096) % 4096;
    if (difAbs(S.base.vy, S.rot.vy) > S.amp) S.rot.vy = (S.base.vy + Math.sign(difS(S.base.vy, S.rot.vy)) * S.amp + 4096) % 4096;
    dd = vx - S.rot.vx;
    S.rot.vx += Math.sign(dd) * Math.min(Math.abs(dd), vel);
  }
  terminarFoto(causa) {
    const J = this.J;
    if (J) J.activo = false;
    this.estado = "fin";
    this.fc = 0;
    this.causaFoto = causa;
    this.ctx.sonido?.cancion?.(0);
    this.fade = {
      modo: "sale",
      n: 0,
      total: 40
    };
    this.emit("derrota", {
      st: this.st,
      modo: this.modo,
      causa: causa === "tiempo" ? "tiempo" : "salida"
    });
  }
  restaurarFov() {
    const cam = this.ctx.camara;
    if (cam && this.fovAntes && Math.abs(cam.fov - this.fovAntes) > .01) {
      cam.fov = this.fovAntes;
      cam.updateProjectionMatrix();
    }
  }
  ganar() {
    if (this.estado !== "juego") return;
    const V = this.vr, J = this.J;
    this.estado = "clear";
    this.fc = 0;
    if (J) J.activo = false;
    const crudo = this.tiempo;
    const bonif = V.tiro && (!V.disco || V.ranking) ? V.tiro.espera ?? 10 : 0, balas = bonif ? this.balasTotales : 0;
    const final = this.vr2 ? this.vr2.puntos : V.disco ? Math.max(0, crudo - balas * bonif) : crudo - balas * bonif;
    let lista = null, puesto = 3, vars = V.ranking?.vars || (this.modo === 2 && this.st === this.orden[this.orden.length - 1] ? TA10.vars : null);
    if (this.modo === 2) this.carrera.restante -= crudo;
    if (this.modo === 4) {
      this.carrera.acumulado = crudo;
      this.carrera.municion = this.balasTotales;
    }
    if (this.carreraD) {
      const I = this.invDisco;
      this.carreraD.acumulado = crudo;
      if (I) this.carreraD.inv = {
        armas: [ ...I.armas ],
        armas_max: [ ...I.armasMax ],
        items: [ ...I.items ],
        arma: [ 9, 4 ].includes(I.arma) ? -1 : I.arma,
        item: [ 1, 6, 2 ].includes(I.item) ? -1 : I.item
      };
    }
    if (vars) {
      const U = v => v >>> 0, r = vars.map(k => {
        const q = this.records[k] || {
          t: 99999,
          def: true
        };
        return q.def ? -q.t : q.t;
      });
      if (this.vr2) {
        for (puesto = 3; puesto > 0 && Math.abs(r[puesto - 1]) < final; puesto--) if (puesto < 3) r[puesto] = r[puesto - 1];
        if (puesto < 3) r[puesto] = final;
      } else if (U(Math.abs(r[2])) < U(final)) puesto = 3; else {
        for (puesto = 2; puesto > 0; puesto--) {
          r[puesto] = r[puesto - 1];
          if (U(Math.abs(r[puesto - 1])) < U(final)) break;
        }
        r[puesto] = final;
      }
      lista = r;
      if (puesto < 3) {
        vars.forEach((k, i) => {
          this.records[k] = {
            t: Math.abs(r[i]),
            def: r[i] < 0,
            fecha: i === puesto ? Date.now() : this.records[k]?.fecha
          };
        });
        guardarLS(CLAVE_REC, this.records);
        this.emit("record", {
          clave: vars.join(","),
          lista: this.records,
          puesto: puesto
        });
      }
    }
    for (const [a, b] of V.clear?.progreso || []) if (this.progreso === a) {
      this.progreso = b;
      guardarLS(CLAVE_PROG, b);
      break;
    }
    if (V.disco?.clave) {
      const L = this.superadas;
      if (!L.includes(V.disco.clave)) {
        L.push(V.disco.clave);
        guardarLS(CLAVE_SUPERADAS, L);
      }
    }
    this.resultado = {
      cuadros: crudo,
      final: final,
      puesto: puesto,
      lista: lista
    };
    this.sonar(null);
    this.ctx.sonido?.cancion?.(0);
    if (this.cj && this.camDatos) {
      if (this.cj.cuadros === this.cjCuadros) this.sincronizarCamara();
      this.cj.aplicar(this.camDatos.llegada || []);
    }
    this.agendaLista = [];
    const A = (t, fn) => this.agendaLista.push({
      t: t,
      fn: fn
    });
    const ev = this.camDatos?.llegada_ev || [];
    const voces = V.clear?.voces || [];
    const vozClear = voces.length ? voces[lista && puesto < 3 ? puesto : 3] : null;
    const crearClear = () => {
      const ops = V.clear?.opciones || [];
      const o = ops.length === 3 ? ops : ops[0]?.tipo === "demo" ? [ ops[0], null, ops[1] ] : [ ops[0], null, ops[1] ];
      this.opsClear = o;
      this.clear = new ClearVR({
        modo: this.modo,
        conRecords: !!lista,
        tiroModo: !!V.tiro && !!lista,
        balas: balas,
        bonif: bonif,
        final: final,
        puesto: puesto,
        records: lista || [ 0, 0, 0 ],
        supervivencia: this.modo === 4,
        siguiente: !!o[1],
        formato: this.vr2 ? v => String(v | 0).padStart(3, "0") : null,
        opSurvival: o[1]?.tipo === "modo",
        fondo: this.fondo,
        fuente: this.fuente,
        img: this.img,
        sonar: id => this.sonar(id),
        voz: () => {
          if (vozClear) this.reproducirVoz(vozClear);
        }
      });
    };
    let hayClear = false;
    for (const e of ev) {
      if (e.chara === "VRCLEAR") {
        hayClear = true;
        A(e.t, crearClear);
      } else if (e.mesg?.[0] === H.SNAKEWARP && e.mesg[1] === H.SALIR) A(e.t, () => this.warp?.salir()); else if (e.mesg?.[1] === H.CONTINUAR) A(e.t, () => this.clear?.mensaje()); else if (e.mesg?.[0] === H.VR && e.mesg[1] === H.BORRAR_HUD) A(e.t, () => this.hud?.borrar()); else if (e.sound?.e) A(e.t, () => this.sonar(e.sound.e[2])); else if (e.sound?.v) A(e.t, () => this.reproducirVoz(e.sound.v[0])); else if (e.pad && "s" in e.pad) A(e.t, () => {
        this.clearInput = true;
      }); else if (e.mesg?.[1] === 12835) A(e.t, () => {
        for (const g of this.guardias || []) if (g.nombre === e.mesg[0]) {
          g.o.visible = false;
          g.inactivo = true;
        }
      });
    }
    if (!hayClear && V.clear?.mostrar != null) {
      hayClear = true;
      A(V.clear.mostrar, crearClear);
    }
    if (!ev.length) {
      hayClear = true;
      A(15, crearClear);
      A(85, () => {
        this.warp?.salir();
        this.sonar(189);
        this.clear?.mensaje();
        this.hud?.borrar();
      });
      A(90, () => {
        this.clearInput = true;
      });
    }
    if (this.hud) this.hud.estadoHud = 2;
    if (V.clear?.automatico && V.disco) {
      const au = V.clear.automatico, t = au.cuadros || 42;
      A(Math.max(0, t - 11), () => {
        this.fade = {
          modo: "sale",
          n: 0,
          total: 10
        };
      });
      A(t, () => au.clave ? this.cargarMision(au.clave, {
        continuar: true
      }) : this.abrirMenu());
    } else if (V.clear?.automatico) {
      if (!hayClear) A(0, crearClear);
      A(30, () => {
        this.fade = {
          modo: "sale",
          n: 0,
          total: 15
        };
      });
      A(V.clear.automatico.cuadros || 45, () => this.cargarSala(V.clear.automatico.st, this.modo, {
        continuar: true
      }));
    }
    this.emit("clear", {
      st: this.st,
      modo: this.modo,
      cuadros: crudo,
      tiempo: final,
      puesto: puesto
    });
  }
  agenda() {
    for (const a of this.agendaLista || []) if (!a.hecho && this.fc >= a.t) {
      a.hecho = true;
      a.fn();
    }
  }
  elegirClear(op) {
    const o = this.opsClear?.[op];
    if (!o) return this.abrirMenu();
    const ir = (t, cuadros, fn) => {
      this.fade = {
        modo: "sale",
        n: 0,
        total: t
      };
      this.agendaLista.push({
        t: this.fc + cuadros,
        fn: fn
      });
    };
    if (o.tipo === "reintentar") {
      this.ctx.sonido?.codigo?.(4278190334);
      ir(25, 30, () => this.reintentar());
    } else if (o.tipo === "siguiente" && this.mision) ir(10, 15, () => o.clave ? this.cargarMision(o.clave) : this.abrirMenu()); else if (o.tipo === "siguiente") ir(10, 15, () => this.cargarSala(o.st, this.modo, {
      continuar: true
    })); else if (o.tipo === "modo") ir(10, 15, () => {
      this.carrera = null;
      this.cargarSala(o.st, o.modo);
    }); else if (o.tipo === "demo") ir(10, 15, () => this.demoTecnica()); else ir(10, 15, () => this.abrirMenu());
  }
  descubierto(quien, desde) {
    if (this.estado !== "juego" || this.visto) return;
    if (this.vr?.visto_falla === false) return;
    this.visto = {
      quien: quien,
      desde: desde.clone(),
      t: 6
    };
    this.perder("visto");
  }
  perder(causa) {
    if (this.estado !== "juego" && this.estado !== "intro") return;
    const J = this.J;
    if (J) J.activo = false;
    this.estado = "derrota";
    this.fc = 0;
    this.causa = causa;
    this.agendaLista = [];
    if (causa === "muerte") {
      this.agendaLista.push({
        t: 30,
        fn: () => {
          if (this.ctx.gameOver) {
            this.estado = "gameover";
            this.ctx.gameOver({
              alSeguir: () => this.reintentar(),
              alSalir: () => this.abrirMenu()
            });
          } else this.crearOver();
        }
      });
    } else this.esperaOver = causa === "visto" ? 6 + 4 : 4;
    if (this.modo === 4 && this.carrera) this.carrera.acumulado = this.tiempo;
    this.emit("derrota", {
      st: this.st,
      modo: this.modo,
      causa: causa
    });
  }
  cuadroDerrota() {
    if (this.visto && this.visto.t > 0 && --this.visto.t === 0) this.girarHacia(this.visto.desde);
    if (this.esperaOver > 0 && --this.esperaOver === 0) this.crearOver();
  }
  girarHacia(p) {
    const dx = p.x - this.ctx.jugador.position.x, dz = p.z - this.ctx.jugador.position.z;
    this.emit("girar", {
      dx: dx,
      dz: dz
    });
  }
  crearOver() {
    const sinContinue = this.modo === 4 && this.causa === "tiempo";
    this.over = new OverVR({
      lineas: this.logoOver,
      goC: this.img.goC,
      goE: this.img.goE,
      sinContinue: sinContinue,
      quien: this.causa === "visto" ? this.visto?.quien : null,
      voz: this.vozOver ? () => this.reproducirVoz(this.vozOver) : null,
      sonar: id => this.sonar(id),
      sonido: this.ctx.sonido,
      alSeguir: () => {
        this.over = null;
        this.reintentar({
          mantenerTiempo: true
        });
      },
      alSalir: () => {
        this.over = null;
        this.abrirMenu();
      }
    });
  }
  reintentar({mantenerTiempo: mantenerTiempo = false} = {}) {
    if (this.mision) return this.cargarMision(this.mision, {
      reintento: true
    });
    if (this.modo === 4) {
      const acc = this.carrera?.acumulado ?? 0, mun = this.carreraEntrada?.municion;
      this.carrera = this.carreraEntrada ? JSON.parse(JSON.stringify(this.carreraEntrada)) : null;
      if (this.carrera && mantenerTiempo) {
        this.carrera.acumulado = acc;
        this.carrera.municion = mun;
      }
      return this.cargarSala(this.st, 4, {
        continuar: true
      });
    }
    this.carrera = this.carreraEntrada ? JSON.parse(JSON.stringify(this.carreraEntrada)) : null;
    return this.cargarSala(this.st, this.modo, {
      continuar: true
    });
  }
  reintentarPausa() {
    if (this.modo === 4) {
      this.carrera = null;
      return this.cargarSala(this.orden[0], 4);
    }
    return this.reintentar();
  }
  soltar(code) {
    if (this.estado === "menu" && this.tituloD?.activo) this.tituloD.tecla(code, false); else if (this.estado === "menu" && !this.menuD?.activo) this.menuVR?.tecla(code, false);
  }
  entrada(code) {
    const E = this.estado;
    if (E === "off" || E === "cargando") return false;
    const b = PAD[code];
    if (E === "menu" && this.tituloD?.activo) {
      this.tituloD.tecla(code, true);
      return true;
    }
    if (E === "menu" && this.menuD?.activo) return this.menuD.tecla(code, true) || true;
    if (E === "menu" && this.menuD?.hay && code === "KeyM") {
      this.abrirDisco();
      return true;
    }
    if (E === "menu" && this.menuD?.hay && (code === "ArrowRight" || code === "KeyD") && this.menuVR.pag === 0 && this.menuVR.estado === 0 && this.menuVR.it[this.menuVR.cur]?.vec?.[3] === -1) {
      this.sonar(177);
      this.abrirTitulo(0);
      return true;
    }
    if (E === "menu") {
      if (code === "KeyU") {
        this.todo = !this.todo;
        guardarLS(CLAVE_TODO, this.todo);
        this.sonar(SE.CURSOR);
        this.abrirMenu();
        return true;
      }
      this.menuVR.tecla(code, true);
      return true;
    }
    if (E === "ventana") {
      if (b) this.cerrarVentana();
      return true;
    }
    if (E === "juego" && b === "start") {
      this.estado = "pausa";
      this.pausa ||= new PausaVR({
        tex: this.img,
        marco: this.img.marco,
        fuente: this.fuente,
        sonar: id => this.sonar(id),
        sonido: this.ctx.sonido
      });
      this.pausa.abrir();
      return true;
    }
    if (E === "pausa") {
      const r = this.pausa?.tecla(b === "cruz" ? null : b);
      if (r === "continuar") this.estado = "juego";
      return true;
    }
    if (E === "clear") {
      if (this.clear && this.clearInput) this.clear.tecla(b || "cualquiera");
      return true;
    }
    if (E === "derrota") {
      this.over?.tecla(b);
      return true;
    }
    if (E === "intro") return true;
    return false;
  }
  clic(px, py) {
    const {sx: sx, sy: sy, ox: ox, oy: oy} = this.marco(), x = (px - ox) / sx, y = (py - oy) / sy;
    const E = this.estado;
    if (E === "menu" && this.tituloD?.activo) return this.tituloD.clic(x, y);
    if (E === "menu" && this.menuD?.activo) return this.menuD.clic(x, y);
    if (E === "menu" && this.menuD?.hay && this.menuVR.pag === 0 && x >= 214 && y >= 204) {
      this.sonar(177);
      this.abrirTitulo(0);
      return;
    }
    if (E === "menu") return this.menuVR.clic(x, y);
    if (E === "ventana") return this.cerrarVentana();
    if (E === "pausa" && this.pausa) {
      const i = [ 151, 169, 188 ].findIndex(yy => Math.abs(y - yy - 4) < 9);
      if (i >= 0) {
        if (this.pausa.sel === i) this.entrada("Enter"); else {
          this.pausa.sel = i;
          this.sonar(SE.CURSOR);
        }
      }
      return;
    }
    if (E === "clear" && this.clear && this.clearInput) {
      const k = [ 5, 6, 7 ].find(i => {
        const c = this.clear.it[i].cursor;
        return c && this.clear.it[i].tex && x >= c[0] && x < c[0] + c[2] && y >= c[1] && y < c[1] + c[3];
      });
      if (k != null) {
        if (this.clear.sel === k && this.clear.cur === k) this.clear.tecla("ok"); else {
          this.clear.sel = k;
          this.sonar(SE.CURSOR);
        }
      }
      return;
    }
    if (E === "derrota") this.over?.clic(x, y);
  }
  sonar(id, vol = 63) {
    if (id != null) this.ctx.sonido?.se?.(id, 0, vol);
  }
  reproducirVoz(id) {
    const url = (this.vr?.disco ? this.menuD?.datos?.voces?.[id] : null) || this.datosMenu?.voces?.[id];
    if (!url) return;
    try {
      this.audioVoz?.pause();
      this.audioVoz = new Audio(this.base + url);
      this.audioVoz.volume = .9;
      this.audioVoz.play().catch(() => {});
    } catch {}
    this.ultimaVoz = id;
  }
  animar3D(dt) {
    this.fondo?.actualizar(dt, {
      casco: !!this.ctx.renderer?.xr?.isPresenting
    });
    this.materia?.actualizarMallas();
    if (this.warp) {
      const c = this.ctx.cuerpo?.();
      if (c) this.warp.enganchar(c);
    }
    for (const S of this.reflectores || []) {
      const eje = this.ejeReflector(S), dy = S.p.y - S.h * MM;
      const L = eje.y < -.05 ? dy / -eje.y : 30, r = L * Math.tan(S.ang / 2 * ANG);
      const fin = S.p.clone().addScaledVector(eje, L);
      S.cono.scale.set(r, L, r);
      S.cono.position.copy(S.p).addScaledVector(eje, L / 2);
      S.cono.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), eje);
      S.disco.position.set(fin.x, S.h * MM + .02, fin.z);
      S.disco.scale.set(r / Math.max(.2, -eje.y), r, 1);
      S.disco.rotation.z = -Math.atan2(eje.x, eje.z);
    }
  }
  camaraApp() {
    return this.ctx.camJuego?.() ?? globalThis.__mgs?.camJuego ?? null;
  }
  prepararCamara(datos) {
    this.camDatos = datos;
    this.cj = null;
    if (!datos) return;
    let cj = this.camaraApp();
    if (!cj) {
      cj = this.cjPropia ||= new CamaraJuego({
        alerta: () => this.J?.com?.modo ?? 0,
        ruido: () => this.J?.ruido
      });
      this.ctx.ponerCamJuego?.(cj);
    }
    if (!cj._vrUsar) {
      const orig = cj.usarDatos.bind(cj);
      cj._vrUsar = orig;
      cj.usarDatos = d => orig(d && d.ventana === undefined && cj._vrDatos ? cj._vrDatos : d);
    }
    cj._vrDatos = datos;
    cj._vrUsar(datos);
    this.cj = cj;
    this.dirSnake = (this.datos?.actores || []).find(a => a.tipo === "SNAKE")?.d?.[1] ?? 0;
    cj.cuadro(this.infoCam());
    this.cjCuadros = cj.cuadros;
  }
  infoCam() {
    return {
      pos: this.ctx.jugador.position,
      postura: 0,
      dir: this.dirSnake | 0
    };
  }
  get manejaCamara() {
    return this.estado === "ventana" || this.estado === "intro" || this.estado === "clear" || this.escenaCam;
  }
  get escenaCam() {
    return this.estado === "juego" && !!this.J?.padVR && this.camEscena?.size > 0 && !!this.vr?.disco;
  }
  cuadroCamara() {
    const e = this.escenaCam;
    if (e && !this._escenaAntes) this.sincronizarCamara();
    this._escenaAntes = e;
    if (!this.cj || !this.manejaCamara) return;
    this.cj.cuadro(this.infoCam());
    this.cjCuadros = this.cj.cuadros;
  }
  mezclarSalida(cam, conCamaraSala, dt) {
    if (!cam?.parent) return;
    const xr = !!this.ctx.renderer?.xr?.isPresenting, e = this.escenaCam && !xr;
    if (e) {
      cam.updateMatrixWorld(true);
      const T = this._tomaEscena ||= {
        p: new THREE.Vector3,
        q: new THREE.Quaternion,
        fov: 0
      };
      cam.getWorldPosition(T.p);
      cam.getWorldQuaternion(T.q);
      T.fov = cam.fov;
      this._eraEscena = true;
      this.salidaEscena = null;
      return;
    }
    if (this._eraEscena) {
      this._eraEscena = false;
      if (!conCamaraSala && !xr && this._tomaEscena && this.estado === "juego") this.salidaEscena = {
        ...this._tomaEscena,
        p: this._tomaEscena.p.clone(),
        q: this._tomaEscena.q.clone(),
        t: 0,
        total: 30 / 30
      };
    }
    const S = this.salidaEscena;
    if (!S) return;
    S.t += Math.max(0, dt || 0);
    const k = S.t / S.total;
    if (k >= 1 || this.estado !== "juego" || xr || conCamaraSala) {
      this.salidaEscena = null;
      return;
    }
    cam.updateMatrixWorld(true);
    const p = cam.getWorldPosition(new THREE.Vector3), q = cam.getWorldQuaternion(new THREE.Quaternion);
    p.lerpVectors(S.p, p, k);
    q.slerpQuaternions(S.q, q, k);
    const m = (new THREE.Matrix4).compose(p, q, new THREE.Vector3(1, 1, 1));
    cam.parent.updateMatrixWorld(true);
    m.premultiply((new THREE.Matrix4).copy(cam.parent.matrixWorld).invert());
    m.decompose(cam.position, cam.quaternion, new THREE.Vector3);
    const fov = S.fov + (cam.fov - S.fov) * k;
    if (Math.abs(cam.fov - fov) > .01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);
  }
  sincronizarCamara() {
    const cj = this.cj, cam = this.ctx.camara;
    if (!cj || !cam) return;
    cam.updateMatrixWorld(true);
    const p = new THREE.Vector3, d = new THREE.Vector3;
    cam.getWorldPosition(p);
    cam.getWorldDirection(d);
    const pos = {
      x: Math.round(p.x * 1e3),
      y: Math.round(p.y * 1e3),
      z: Math.round(p.z * 1e3)
    };
    const trg = {
      x: pos.x + Math.round(d.x * 1e3),
      y: pos.y + Math.round(d.y * 1e3),
      z: pos.z + Math.round(d.z * 1e3)
    };
    const rot = {
      x: Math.round(Math.atan2(-d.y, Math.hypot(d.x, d.z)) / ANG),
      y: dirDe(d.x, d.z),
      z: 0
    };
    for (const k of [ cj.W, cj.G ]) {
      k.pos = {
        ...pos
      };
      k.trg = {
        ...trg
      };
      k.rot = {
        ...rot
      };
      k.track = 1e3;
    }
    cj.prevPos = {
      ...pos
    };
  }
  camaraFoto() {
    if (!this.foto || ![ "juego", "pausa", "fin" ].includes(this.estado)) return null;
    const J = this.foto.camJuego(), asp = typeof innerWidth === "number" && innerHeight > 0 ? innerWidth / innerHeight : 4 / 3;
    const tanV = 112 / (320 * 58 / 64), tanH = 160 / 320;
    return {
      pos: v3(J.ojo),
      mira: v3(J.mira),
      fov: 2 * Math.atan(Math.max(tanV, tanH / Math.max(.2, asp))) * 180 / Math.PI
    };
  }
  get superadas() {
    if (!Array.isArray(this._superadas)) {
      const L = leerLS(CLAVE_SUPERADAS, []);
      this._superadas = Array.isArray(L) ? L : [];
    }
    return this._superadas;
  }
  categoriaFoto(nv, F) {
    const C = F.categorias;
    if (!C) return;
    const n = this.todo || this.menuD?.todo || todoDesbloqueado() ? 300 : this.menuD?.datos?.menu ? desbloqueo(this.menuD.datos.menu, this.superadas).cuenta : this.superadas.length;
    const orden = Object.values(C).sort((a, b) => a.tiempo - b.tiempo);
    let i = UMBRALES_FOTO.findIndex(u => n < u);
    if (i < 0) i = orden.length - 1;
    const c = orden[Math.min(i, orden.length - 1)];
    if (!c) return;
    for (const k of [ "g0478", "g047a", "g047b", "tiempo", "nivel", "r", "arreglo", "poses" ]) if (c[k] !== undefined) F[k] = c[k];
    if (F.escenario) {
      F.escenario.anillos = c.anillos || F.escenario.anillos;
      if (c.rango) F.escenario.modelos = (F.escenario.modelos || []).map(m => m.tipo === "rango" ? c.rango : m);
    }
    if (c.hzm_json && nv.mapas?.[0]) nv.mapas[0].hzm_json = [ c.hzm_json ];
    F.superadas = n;
    F.porcentaje = Math.floor(n * 100 / 300);
  }
  camaraEspecial() {
    if (this.foto && this.estado === "intro") {
      const c = this.foto.camaraIntro(), cam = this.ctx.camara;
      if (cam && Math.abs(cam.fov - c.fov) > .01) {
        cam.fov = c.fov;
        cam.updateProjectionMatrix();
      }
      return {
        pos: c.pos,
        mira: c.mira,
        fov: c.fov,
        verSnake: true
      };
    }
    if (this.cj && this.camDatos) {
      if (!this.manejaCamara) return null;
      const r = this.cj.resultado(), cam = this.ctx.camara;
      if (cam && Math.abs(cam.fov - r.fov) > .01) {
        cam.fov = r.fov;
        cam.updateProjectionMatrix();
      }
      return {
        pos: r.pos,
        mira: r.objetivo,
        fov: r.fov,
        verSnake: true
      };
    }
    const C = this.vr?.camaras;
    if (!C) return null;
    let c = null;
    if (this.estado === "ventana" || this.estado === "intro" && this.fi < 10) c = C["0"]; else if (this.estado === "intro" && this.fi < 40) c = C["1"]; else if (this.estado === "clear" && this.fc < 90) c = C["4"];
    if (!c || c.length < 9 || c[2] !== 0) return null;
    return {
      pos: v3(c.slice(3, 6)),
      mira: v3(c.slice(6, 9)),
      verSnake: true
    };
  }
  marco() {
    if (!this.ctx.renderer?.xr?.isPresenting) return marcoPS1(innerWidth, innerHeight);
    const {s: s, ox: ox} = this.escala();
    return {
      sx: s,
      sy: s,
      ox: ox * s,
      oy: 8 * s,
      margenX: ox,
      margenY: 8
    };
  }
  escala() {
    const iw = innerWidth, ih = innerHeight, s = Math.max(1, Math.min(iw / 320, ih / 240));
    return {
      s: s,
      ox: Math.round((iw / s - 320) / 2),
      iw: iw,
      ih: ih
    };
  }
  get menu() {
    if (this.tituloD?.activo) return {
      nivel: 4,
      i: this.tituloD.o?.[8]?.sel ?? 0,
      j: "t|" + this.tituloD.firma
    };
    if (this.menuD?.activo) return {
      nivel: 3,
      i: this.menuD.tope?.sel ?? 0,
      j: "d|" + this.menuD.firma
    };
    const m = this.menuVR;
    return {
      nivel: (m?.pag ?? 0) === 0 ? 1 : 2,
      i: Math.max(0, [ 3, 4, 5, 7, 8 ].indexOf(m?.cur ?? 3)),
      j: m?.firma ?? `${m?.pag ?? 0}|${m?.cur ?? 0}|${m?.f ?? 0}`
    };
  }
  itemsMenu() {
    return [ {
      id: "training",
      modo: 0
    }, {
      id: "time_attack",
      modo: 1
    }, {
      id: "gun_shooting",
      modo: 3
    }, {
      id: "save"
    }, {
      id: "exit",
      tipo: "salir"
    } ];
  }
  dibujar() {
    const cv = this.cv, iw = innerWidth, ih = innerHeight;
    if (cv.width !== iw || cv.height !== ih) {
      cv.width = iw;
      cv.height = ih;
    }
    const x = this.g, M = this.marco(), margen = M.margenX, xs = this.gs;
    if (this.cvSuma.width !== iw || this.cvSuma.height !== ih) {
      this.cvSuma.width = iw;
      this.cvSuma.height = ih;
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, iw, ih);
    xs.setTransform(1, 0, 0, 1, 0, 0);
    xs.clearRect(0, 0, iw, ih);
    xs.imageSmoothingEnabled = false;
    xs.setTransform(M.sx, 0, 0, M.sy, M.ox, M.oy);
    const toca = [ "menu", "ventana", "pausa" ].includes(this.estado) || this.estado === "clear" && this.clearInput || this.estado === "derrota" && this.over?.eligiendo;
    if (cv.style.pointerEvents !== (toca ? "auto" : "none")) cv.style.pointerEvents = toca ? "auto" : "none";
    if (this.estado === "off") return;
    x.imageSmoothingEnabled = false;
    x.setTransform(M.sx, 0, 0, M.sy, M.ox, M.oy);
    const E = this.estado;
    if (E === "menu") {
      if (M.margenY > 0) {
        x.fillStyle = "#000";
        x.fillRect(-margen, -M.margenY, 320 + 2 * margen, 224 + 2 * M.margenY);
      }
      if (this.tituloD?.activo) this.tituloD.dibujar(x, margen); else if (this.menuD?.activo) this.menuD.dibujar(x, margen); else {
        this.menuVR.dibujar(x, margen);
        if (this.menuD?.hay && this.menuVR.pag === 0 && this.menuVR.estado === 0) this.fuente?.texto(x, "VR MISSIONS >", 312, 210, [ 208, 107, 57 ], 1);
      }
    } else if (E === "cargando") {
      x.fillStyle = "#000";
      x.fillRect(-margen, -M.margenY, 320 + 2 * margen, 224 + 2 * M.margenY);
    } else {
      this.dibujarCinema(x, M);
      if (this.hud && !this.hudOculto && E !== "ventana" && E !== "pausa" && E !== "gameover") this.hud.dibujar(x, {
        limite: this.limite,
        tiempo: this.tiempo,
        final: this.resultado?.final,
        demo: !!this.demoTec
      });
      this.dibujarArma(x, margen);
      this.dibujarCuenta(x);
      if (this.win) this.dibujarVentana(x);
      if (this.foto) {
        if (E !== "pausa") this.foto.dibujar(x, (g, s, X, Y, c) => this.texto(g, s, X, Y, c));
        const b = this.foto.blanco;
        if (b > 0) {
          xs.fillStyle = `rgba(255,255,255,${b})`;
          xs.fillRect(-margen, -M.margenY, 320 + 2 * margen, 224 + 2 * M.margenY);
        }
      }
      this.dibujarMaterializacion(xs, M);
      if (E === "pausa") this.pausa?.dibujar(x, margen, xs);
      if (E === "clear" && this.clear) {
        this.clear.dibujar(x, margen, this.img, xs);
        if (this.vr?.disco) this.dibujarClearDisco(x);
      }
      if (E === "derrota") this.over?.dibujar(x, margen);
      if (this.fade) {
        const v = this.fade.modo === "entra" ? 255 - Math.trunc(this.fade.n * 255 / this.fade.total) : Math.min(255, Math.trunc(this.fade.n * 255 / this.fade.total));
        x.fillStyle = `rgba(0,0,0,${v / 255})`;
        x.fillRect(-margen, -M.margenY, 320 + 2 * margen, 224 + 2 * M.margenY);
      }
    }
    if (this.aviso) {
      x.fillStyle = "rgba(0,0,0,0.7)";
      x.fillRect(20, 200, 280, 14);
      this.texto(x, this.aviso.texto, 160, 203, "255,150,60", "center");
    }
  }
  texto(x, s, X, Y, color = "206,206,206", alin = "left", tam = 8) {
    x.font = `${tam}px MGS, Consolas, monospace`;
    x.textBaseline = "top";
    x.textAlign = alin;
    x.fillStyle = `rgb(${color})`;
    x.fillText(s, X, Y);
  }
  dibujarArma(x, margen) {
    if (this.conInventario || !this.vr?.municion || !this.J || this.estado === "ventana" || this.estado === "intro" && !this.relojCorre) return;
    const h = this.ctx.hud;
    if (!h?.recuadroArma) return;
    try {
      h.recuadroArma(x, Math.round(320 + margen - 16 - 69), 224 - 16 - 26, {
        icono: "socom",
        balas: this.J.arma.balas,
        reserva: this.J.arma.reserva,
        recargando: this.J.arma.recargando > 0
      });
    } catch {}
  }
  dibujarCuenta(x) {
    const V = this.vr;
    if (this.vr2 && V?.vr2 && [ "juego", "clear", "derrota" ].includes(this.estado) && (this.relojCorre || this.estado !== "juego")) {
      const R = this.vr2, rem = Math.max(0, V.vr2.limite - this.tiempo), seg = rem / 30 | 0, d2 = n => String(n % 100).padStart(2, "0");
      this.texto(x, "SCORE", 138, 188, "120,120,120", "left", 6);
      this.texto(x, String(R.puntos).padStart(3, "0"), 182, 194, R.amarillo > 0 ? "255,255,0" : "120,120,120", "left", 6);
      if (R.amarillo > 0) R.amarillo--;
      const rojo = seg < 10 && rem % 30 > 14;
      this.texto(x, "TIME", 138, 200, "120,120,120", "left", 6);
      this.texto(x, `${d2(seg / 60 | 0)}:${d2(seg % 60)}:${d2(rem % 30 * 100 / 30 | 0)}`, 138, 206, rojo ? "120,48,48" : "120,120,120", "left", 6);
      return;
    }
    if (!V?.blancos || !this.nombresCuenta?.size || this.metaLista || !this.relojCorre || this.estado !== "juego") return;
    const c = this.cuentaRojo > 0 ? "255,255,0" : "200,200,200";
    if (this.cuentaRojo > 0) this.cuentaRojo--;
    for (const [d, col] of [ [ 1, "100,100,100" ], [ 0, c ] ]) {
      this.texto(x, "TARGET", 270 + d, 75 + d, d ? col : "200,200,200", "right");
      this.texto(x, `${this.cuenta}/${V.blancos.n}`, 270 + d, 83 + d, col, "right");
    }
  }
  dibujarClearDisco(x) {
    const C = this.clear, W = this.vr.ventana;
    if (!C || !W || !this.fuente) return;
    for (const k of [ 0, 1 ]) C.it[k].tex = null;
    if (C.estado === 4) return;
    const t = s => String(s || "").replace(/\s+/g, " ").trim(), n = /(\d+)\s*$/.exec(t(W.lineas[1]))?.[1];
    if (C.estado !== 2) {
      this.fuente.texto(x, t(W.lineas[0]), 160, 26, [ 148, 148, 148 ], 2);
      this.fuente.texto(x, t(W.lineas[1]), 160, 44, [ 148, 148, 148 ], 2);
    }
    if (n && C.estado !== 2 || n && C.anim > 4) this.fuente.texto(x, n.padStart(4, "0"), 151, 65, [ 148, 148, 148 ], 2);
  }
  armarVentana(W) {
    const T = ventanaIdioma(W), lineas = T ? T.lineas : W.lineas;
    const ancho = T ? T.ancho : W.cuadro_ps1.ancho, alto = T ? T.alto : W.cuadro_ps1.alto;
    return {
      st: 1,
      step: 0,
      n: 0,
      lineas: lineas,
      ancho: ancho,
      alto: alto,
      x: 320 - ancho >> 1,
      y: 224 - alto >> 1,
      total: lineas.reduce((s, l) => s + l.length, 0),
      idioma: T
    };
  }
  dibujarVentana(x) {
    const W = this.win;
    let r;
    const {ancho: ancho, alto: alto} = W, X = W.x, Y = W.y;
    if (W.st === 1) {
      const w = ancho * W.step / 5;
      r = [ X + (ancho - w) / 2, Y + alto / 2, w, 1 ];
    } else if (W.st === 2) {
      const h = alto * W.step / 4;
      r = [ X, Y + (alto - h) / 2, ancho, h ];
    } else if (W.st === 4) {
      const h = alto * (4 - W.step) / 4;
      r = [ X, Y + (alto - h) / 2, ancho, h ];
    } else if (W.st === 5) {
      const w = ancho * (4 - W.step) / 4;
      r = [ X + (ancho - w) / 2, Y + alto / 2, w, 1 ];
    } else if (W.st === 6) return; else r = [ X, Y, ancho, alto ];
    x.fillStyle = "rgba(0,0,0,0.5)";
    x.fillRect(r[0], r[1], r[2], r[3]);
    x.strokeStyle = "rgb(64,64,64)";
    x.lineWidth = 1;
    x.strokeRect(Math.round(r[0]) + .5, Math.round(r[1]) + .5, Math.round(r[2]), Math.round(r[3]));
    if (W.st === 3 || W.st === 0) {
      let quedan = W.st === 0 ? W.total : W.n;
      if (W.idioma) {
        dibujarVentanaIdioma(x, W.idioma, X, Y, quedan);
        return;
      }
      W.lineas.forEach((l, i) => {
        if (quedan <= 0) return;
        this.texto(x, l.slice(0, quedan), X + 16, Y + 12 + i * 18);
        quedan -= l.length;
      });
    }
  }
  dibujarMaterializacion(x, M) {
    const E = this.materia;
    if (!E) return;
    const cam = this.ctx.camara;
    const proyectar = p => {
      const v = p.clone().multiplyScalar(MM).project(cam);
      if (v.z > 1) return null;
      return {
        x: 160 + v.x * (160 + M.margenX),
        y: 112 - v.y * (112 + M.margenY)
      };
    };
    const L = E.lente(proyectar);
    if (L.length && this.imgLente) for (const s of L) {
      const T = modular(this.imgLente, [ s.k, s.k, s.k ]);
      x.drawImage(T, s.x - s.lado / 2, s.y - s.lado / 2, s.lado, s.lado);
    }
    const b = E.blanco;
    if (b > 0) {
      x.fillStyle = `rgb(${b},${b},${b})`;
      x.fillRect(-M.margenX, -M.margenY, 320 + 2 * M.margenX, 224 + 2 * M.margenY);
    }
  }
  brilloAlfa(img, k) {
    const clave = "_alfa" + k;
    if (img[clave]) return img[clave];
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const a = p[i + 3] ? Math.min(255, Math.max(p[i], p[i + 1], p[i + 2]) * k >> 7) : 0;
      p[i] = p[i + 1] = p[i + 2] = 255;
      p[i + 3] = a;
    }
    g.putImageData(d, 0, 0);
    return img[clave] = c;
  }
}
