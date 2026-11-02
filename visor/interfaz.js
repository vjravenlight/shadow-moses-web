// MGS web — FeniXVOID · Project Ravenlight
import { disposicionHud, modoHud, ponerModoHud, configurarHud } from "./hud.js";

const $ = s => document.querySelector(s);

const GRUPOS_DEF = {
  "g-juego": true,
  "g-opciones": false,
  "g-escenarios": false,
  "g-museo": false,
  "g-vr": false,
  "g-ayuda": false
};

const TEXTO_HUD = {
  original: [ "HUD: original (la Play)", "El cuadro de 320×240 del juego, escalado y centrado: igual que en la Play. LIFE aparece al cambiar la vida y se va a los 5 s." ],
  adaptado: [ "HUD: adaptado a la pantalla", "LIFE, radar, arma e ítem en las esquinas de la pantalla (vertical u horizontal), sin tapar los controles táctiles; LIFE siempre a la vista." ]
};

export class Interfaz {
  constructor({tactil: tactil = false, alCerrar: alCerrar = null, alAbrir: alAbrir = null} = {}) {
    this.tactil = !!tactil;
    this.alCerrar = alCerrar;
    this.alAbrir = alAbrir;
    configurarHud({
      tactil: this.tactil
    });
    this.panel = $("#panel");
    this.boton = $("#mostrar");
    this.bloqueada = false;
    this._clavePos = "";
    this._claveBoton = "";
    this._grupos();
    this._opcionHud();
    addEventListener("keydown", e => this._tecla(e));
    addEventListener("resize", () => {
      this._clavePos = "";
    });
    addEventListener("hud-modo", () => {
      this._rotularHud();
      this._clavePos = "";
    });
    this.ubicar();
    this._rotularBoton();
  }
  get abierto() {
    return !!this.panel && !this.panel.classList.contains("oculto");
  }
  abrirMenu() {
    if (this.bloqueada || !this.panel) return;
    this.panel.classList.remove("oculto");
    this.boton.hidden = true;
    this._abrirGrupoDelModo();
    this.alAbrir?.();
    this._rotularBoton();
  }
  cerrarMenu() {
    if (!this.panel) return;
    const estaba = this.abierto;
    this.panel.classList.add("oculto");
    this.boton.hidden = false;
    this._rotularBoton();
    if (estaba) this.alCerrar?.();
  }
  alternarMenu() {
    if (this.abierto) this.cerrarMenu(); else this.abrirMenu();
  }
  cuadro(e = {}) {
    const bloq = !!(e.cine || e.titulo || e.codec || e.gameOver);
    if (bloq !== this.bloqueada) {
      this.bloqueada = bloq;
      document.body.classList.toggle("ui-bloqueada", bloq);
    }
    if (bloq && this.abierto) {
      this.panel.classList.add("oculto");
      this.boton.hidden = false;
    }
    const ab = this.abierto;
    if (ab && !this._abiertoAntes) this._abrirGrupoDelModo();
    this._abiertoAntes = ab;
    document.body.classList.toggle("menu-abierto", ab);
    this._rotularBoton();
    this.ubicar();
  }
  ubicar() {
    const D = disposicionHud(), b = this.boton;
    if (!b) return;
    const ancho = b.offsetWidth || 96, codec = document.querySelector(".codec-boton");
    const clave = `${D.clave}|${ancho}|${!!codec}`;
    if (clave === this._clavePos) return;
    this._clavePos = clave;
    const r = document.documentElement.style, x = D.botonMenu.x, y = D.botonMenu.y;
    b.style.left = x + "px";
    b.style.top = y + "px";
    r.setProperty("--menu-left", Math.max(8, x) + "px");
    r.setProperty("--menu-top", y + D.botonMenu.alto + 6 + "px");
    r.setProperty("--hud-k", D.kcss + "px");
    r.setProperty("--codec-x", x + ancho + 6 + "px");
    r.setProperty("--codec-y", y + "px");
  }
  _rotularBoton() {
    const b = this.boton;
    if (!b) return;
    const abierto = this.abierto, clave = abierto ? "cerrar" : "abrir";
    if (clave === this._claveBoton && b.querySelector(".tx")) return;
    this._claveBoton = clave;
    const tecla = this.tactil ? "" : '<span class="tecla">Tab</span>';
    b.innerHTML = abierto ? `<span class="ic">&#10005;</span><span class="tx">CERRAR</span>${tecla}` : `<span class="ic">&#9776;</span><span class="tx">MENÚ</span>${tecla}`;
    b.title = abierto ? "Cerrar el menú y volver (Tab, M o Escape)" : "Abrir el menú (Tab o M)";
    b.setAttribute("aria-expanded", abierto ? "true" : "false");
    this._clavePos = "";
  }
  _tecla(e) {
    const t = e.target, escribiendo = t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA");
    if (escribiendo || e.repeat || this.bloqueada || document.body.classList.contains("modo-camara")) return;
    if (e.code === "KeyM") {
      e.preventDefault();
      this.alternarMenu();
    } else if (e.code === "Escape" && this.abierto) {
      e.preventDefault();
      this.cerrarMenu();
    }
  }
  _grupos() {
    let guardado = {};
    try {
      guardado = JSON.parse(localStorage.getItem("sm_menu_grupos") || "{}") || {};
    } catch {}
    this.estadoGrupos = {
      ...GRUPOS_DEF,
      ...guardado
    };
    for (const d of document.querySelectorAll("#panel details.grupo")) {
      d.open = !!this.estadoGrupos[d.id];
      d.addEventListener("toggle", () => {
        if (this._abriendo) return;
        this.estadoGrupos[d.id] = d.open;
        try {
          localStorage.setItem("sm_menu_grupos", JSON.stringify(this.estadoGrupos));
        } catch {}
      });
    }
  }
  _abrirGrupoDelModo() {
    const m = document.querySelector("nav button.activo")?.dataset.modo;
    const id = m === "escenarios" ? "g-escenarios" : m === "museo" || m === "catalogo" ? "g-museo" : null;
    const k = $("#g-esc-k"), sel = $("#esc-sel");
    if (k) k.textContent = sel?.value || "";
    if (!id) return;
    const d = document.getElementById(id);
    if (d && !d.open) {
      this._abriendo = true;
      d.open = true;
      setTimeout(() => {
        this._abriendo = false;
      }, 0);
    }
  }
  _opcionHud() {
    const b = $("#opt-hud");
    if (!b) return;
    b.onclick = () => ponerModoHud(modoHud() === "original" ? "adaptado" : "original");
    this._rotularHud();
  }
  _rotularHud() {
    const m = modoHud(), b = $("#opt-hud"), i = $("#hud-info");
    if (b) b.textContent = TEXTO_HUD[m][0];
    if (i) i.textContent = TEXTO_HUD[m][1];
  }
}
