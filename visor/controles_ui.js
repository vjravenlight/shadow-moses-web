// MGS web — FeniXVOID · Project Ravenlight
import { ACCIONES, NOMBRE_BOTON, ASIGNABLES, config, asignarTecla, asignarBoton, teclasDe, botonDe, tecla_reservada, bloquearEntrada, bloquearMando, mandosCrudos, vibraActiva, ponerVibra, vibrar, alCambiar, B, restaurarTeclado, restaurarMando, TIPOS_MANDO, NOMBRE_TIPO, detectarTipo, tipoMando, ponerTipoMando, nombreBotonMando, nombreAccionMando, mandoConectado, tactil, ponerTactil, restaurarTactil, quest, ponerQuest, asignarQuest, accionQuest, restaurarQuest, BOTONES_QUEST, ACCIONES_QUEST, ANGULOS_GIRO, VELOCIDADES_GIRO, ZONAS_MUERTAS, VIBRAS_QUEST, botonQuestDe, pasoLista, rotarQuest } from "./controles.js";

const NOMBRES_TECLA = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ShiftLeft: "Shift izq.",
  ShiftRight: "Shift der.",
  ControlLeft: "Ctrl izq.",
  ControlRight: "Ctrl der.",
  AltLeft: "Alt",
  AltRight: "AltGr",
  Space: "Espacio",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Retroceso",
  CapsLock: "Bloq Mayús",
  Semicolon: "Ñ",
  Quote: "´",
  BracketLeft: "`",
  BracketRight: "+",
  Backslash: "Ç",
  Comma: ",",
  Period: ".",
  Slash: "-",
  Minus: "'",
  Equal: "¡",
  Backquote: "º",
  IntlBackslash: "<",
  Delete: "Supr",
  Insert: "Insert",
  Home: "Inicio",
  End: "Fin",
  PageUp: "RePág",
  PageDown: "AvPág",
  NumpadEnter: "Enter (num.)"
};

export function nombreTecla(c) {
  if (!c) return "—";
  if (NOMBRES_TECLA[c]) return NOMBRES_TECLA[c];
  let m = /^Key(.)$/.exec(c);
  if (m) return m[1];
  m = /^Digit(\d)$/.exec(c);
  if (m) return m[1];
  m = /^Numpad(.+)$/.exec(c);
  if (m) return m[1] + " (num.)";
  return c;
}

export const nombreBoton = (i, tipo) => nombreBotonMando(i, tipo);

const TACTIL = typeof window !== "undefined" && (new URLSearchParams(location.search).has("tactil") || matchMedia("(pointer: coarse)").matches);

const CSS = `\n#controles-capa{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:12px;\n  padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));\n  font:15px/1.35 'MGS','Consolas',monospace;color:#7fb08c;text-transform:uppercase;user-select:none;-webkit-user-select:none}\n#controles-capa[hidden]{display:none}\n#controles-capa .cu-caja{width:min(680px,100%);max-height:100%;display:flex;flex-direction:column;border:1px solid #5f8c6c;outline:1px solid #000;background:rgba(0,6,2,.96)}\n#controles-capa h2{margin:0;padding:10px 12px 6px;font:400 22px/1.1 'MGS8','Consolas',monospace;color:#b4f4ac;letter-spacing:1px}\n#controles-capa .cu-pestanas{display:flex;flex-wrap:wrap;gap:4px;padding:0 12px;border-bottom:1px solid #2f4a39}\n#controles-capa .cu-pestanas button{flex:1 1 auto;min-width:0;text-align:center;border-bottom:none;margin-bottom:-1px;font:400 13px/1.1 'MGS8','Consolas',monospace;padding:7px 6px}\n#controles-capa .cu-pestanas button.cu-activa{color:#000;background:#b4f4ac;border-color:#b4f4ac}\n#controles-capa .cu-pestanas button.cu-activa.foco-mando{color:#000 !important;outline-color:#fff !important}\n#controles-capa .cu-lista{scrollbar-color:#2f4a39 #020a05;scrollbar-width:thin}\n#controles-capa .cu-estado{padding:6px 12px;color:#4f7a5c;font-size:12px;text-transform:none}\n#controles-capa .cu-lista{overflow:auto;min-height:0;flex:1 1 auto;padding:0 12px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}\n#controles-capa table{width:100%;border-collapse:collapse}\n#controles-capa th{position:sticky;top:0;background:#020a05;color:#4f7a5c;font-weight:400;font-size:12px;text-align:left;padding:4px 6px;border-bottom:1px solid #2f4a39}\n#controles-capa td{padding:3px 6px;border-bottom:1px solid #12201a;vertical-align:middle}\n#controles-capa td.cu-acc{color:#b4f4ac}\n#controles-capa td.cu-acc small{display:block;color:#4f7a5c;font-size:11px;text-transform:none}\n#controles-capa tr.cu-sep td{padding-top:10px;color:#4f7a5c;font-size:12px;border-bottom:1px solid #2f4a39}\n#controles-capa button{font:inherit;text-transform:inherit;color:#7fb08c;background:rgba(4,14,8,.8);border:1px solid #2f4a39;padding:5px 8px;cursor:pointer;min-width:84px;text-align:left;touch-action:manipulation}\n#controles-capa button:hover{color:#b4f4ac;border-color:#5f8c6c}\n#controles-capa .cu-val{display:flex;align-items:stretch;gap:3px}\n#controles-capa .cu-val .cu-valor{flex:1 1 auto;min-width:0;white-space:normal;text-align:center}\n#controles-capa .cu-val .cu-flecha{min-width:30px;flex:none;text-align:center;padding:5px 4px;color:#5f8c6c}\n#controles-capa .cu-fijo{color:#4f7a5c;font-size:12px}\n#controles-capa .cu-extra{color:#4f7a5c;font-size:11px;margin-left:6px}\n#controles-capa .cu-esperando{color:#000;background:#b4f4ac;border-color:#b4f4ac;animation:cuTitila .5s steps(2) infinite}\n@keyframes cuTitila{50%{background:#5f8c6c}}\n#controles-capa .cu-aviso{min-height:22px;padding:6px 12px;color:#b4f4ac;font-size:13px;border-top:1px solid #2f4a39;text-transform:none}\n#controles-capa .cu-pie{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 12px}\n#controles-capa .cu-pie button{flex:1 1 auto;text-align:center}\n.foco-mando{outline:2px solid #b4f4ac !important;outline-offset:-2px;color:#b4f4ac !important}\n@media (pointer:coarse){#controles-capa button{min-height:40px}#controles-capa .cu-val .cu-flecha{min-width:40px}}\n@media (max-width:520px){#controles-capa{font-size:13px;padding:6px}#controles-capa h2{font-size:18px;padding:8px 10px 4px}\n  #controles-capa .cu-lista{padding:0 6px}#controles-capa td{padding:3px 3px}#controles-capa button{min-width:64px;padding:5px 6px}\n  #controles-capa .cu-pestanas{padding:0 6px}#controles-capa .cu-pestanas button{font-size:11px;padding:7px 3px}}\n@media (max-height:480px){#controles-capa h2{display:none}#controles-capa .cu-estado{display:none}#controles-capa .cu-aviso{min-height:0;padding:3px 12px}}\n`;

export class NavMando {
  constructor(obtenerFilas) {
    this.obtener = obtenerFilas;
    this.f = 0;
    this.c = 0;
    this.el = null;
  }
  filas() {
    return this.obtener().map(r => r.filter(e => e && e.offsetParent !== null && !e.disabled)).filter(r => r.length);
  }
  pintar(el) {
    if (this.el && this.el !== el) this.el.classList.remove("foco-mando");
    this.el = el;
    if (!el) return;
    el.classList.add("foco-mando");
    try {
      el.focus({
        preventScroll: true
      });
    } catch {}
    el.scrollIntoView?.({
      block: "nearest"
    });
  }
  ubicar() {
    const F = this.filas();
    if (!F.length) {
      this.pintar(null);
      return F;
    }
    if (this.el) for (let f = 0; f < F.length; f++) {
      const c = F[f].indexOf(this.el);
      if (c >= 0) {
        this.f = f;
        this.c = c;
        return F;
      }
    }
    this.f = Math.min(this.f, F.length - 1);
    this.c = Math.min(this.c, F[this.f].length - 1);
    this.pintar(F[this.f][this.c]);
    return F;
  }
  mover(dir) {
    const F = this.ubicar();
    if (!F.length) return;
    if (dir === "arriba" || dir === "abajo") {
      this.f = (this.f + (dir === "abajo" ? 1 : -1) + F.length) % F.length;
      this.c = Math.min(this.c, F[this.f].length - 1);
    } else {
      const n = F[this.f].length;
      this.c = Math.max(0, Math.min(n - 1, this.c + (dir === "der" ? 1 : -1)));
    }
    this.pintar(F[this.f][this.c]);
  }
  activar() {
    const F = this.ubicar();
    const el = F[this.f]?.[this.c];
    if (el) el.click();
    return el;
  }
  limpiar() {
    this.pintar(null);
  }
}

export class FlancosMando {
  constructor() {
    this.ant = new Map;
  }
  leer(g, permut = null) {
    const r = [];
    if (!g) {
      this.ant.clear();
      return r;
    }
    const bt = i => {
      const k = permut ? permut(i) : i;
      return !!g.buttons[k]?.pressed;
    };
    const ax = g.axes || [];
    const ahora = {
      arriba: bt(B.ARRIBA) || ax[1] < -.55,
      abajo: bt(B.ABAJO) || ax[1] > .55,
      izq: bt(B.IZQ) || ax[0] < -.55,
      der: bt(B.DER) || ax[0] > .55,
      ok: bt(B.CIRCULO),
      atras: bt(B.CRUZ),
      start: bt(B.START),
      select: bt(B.SELECT),
      l1: bt(B.L1),
      r1: bt(B.R1)
    };
    for (const [k, v] of Object.entries(ahora)) {
      const t = v ? (this.ant.get(k) || 0) + 1 : 0;
      this.ant.set(k, t);
      if (t === 1 || t > 12 && (t - 12) % 4 === 0 && [ "arriba", "abajo", "izq", "der" ].includes(k)) r.push(k);
    }
    return r;
  }
}

const kTecla = id => teclasDe(id).map(nombreTecla).join("/") || "—";

const k1 = id => nombreTecla(teclasDe(id)[0]);

export function textoAyuda({tactil: esTactil = TACTIL, catalogo: catalogo = false, escenarios: escenarios = false} = {}) {
  const qMov = quest.zurdo ? "der." : "izq.", qGira = quest.zurdo ? "izq." : "der.";
  const giro = quest.giro === "suave" ? "girar suave" : `girar ${quest.angulo}°`;
  const qb = a => botonQuestDe(a) || "—";
  const vr = `VR (Quest): palanca ${qMov} = caminar · palanca ${qGira} = ${giro} · ${qb("start")} = menú del casco` + (escenarios ? ` · ${qb("cuadrado")} = disparar / poner personaje` : "");
  if (esTactil) {
    const T = tactil;
    return `Palanca (${T.zurdo ? "derecha" : "izquierda"}): poco = caminar, a fondo = correr · ○ golpe / acción · ✕ agacharse / cuerpo a tierra · □ arma (mantener = ráfaga; soltar = tirar la granada) · △ mantener = primera persona · ÍTEMS / ARMAS: mantener y elegir (un toque lo deja abierto) · CODEC · MENÚ · CÁM · arrastrar el dedo = mirar${T.invertirY || T.invertirX ? " (invertido)" : ""}\nTamaño, zurdo, sensibilidad: MENÚ > CONTROLES > CELULAR`;
  }
  if (catalogo) return `Arrastrá para girar · rueda = zoom · clic der. = mover\nL = luz · P = píxel · ${kTecla("start")} = menú\n` + vr;
  const mov = [ "adelante", "izquierda", "atras", "derecha" ].map(k1).join(" ");
  let t = `Clic = capturar mouse / DISPARAR (también ${kTecla("cuadrado")}) · ${kTecla("recargar")} = recargar · ${k1("l2")}/${k1("r2")} = ítems/armas (mantener) · ${k1("l1")}/${k1("r1")} = sacar/poner · ${mov} + mouse · ${kTecla("caminar")} = caminar despacio · ${kTecla("saltar")} = saltar · O = modo Cámara\n` + `${kTecla("cruz")} = agacharse · ${kTecla("circulo")} = golpe (de frente piña, de espaldas agarre, si no golpe a la pared) · ${kTecla("triangulo")} = primera persona (mantener) · ${kTecla("select")} = códec · ${kTecla("vista")} = cambiar vista · F = vuelo · ${kTecla("start")} = menú`;
  const g = mandoConectado();
  if (g) {
    const j = id => nombreAccionMando(id);
    t += `\nJoystick (${NOMBRE_TIPO[tipoMando(g)]}): palanca izq. = moverse · palanca der. = mirar · ${j("circulo")} golpe / acción · ${j("cruz")} agacharse · ${j("cuadrado")} disparar · ${j("triangulo")} primera persona · ${j("l2")}/${j("r2")} ítems/armas · ${j("l1")}/${j("r1")} sacar/poner · ${j("start")} menú · ${j("select")} códec`;
  }
  return t + "\n" + vr;
}

const pct = v => Math.round(v * 100) + " %";

const siNo = v => v ? "Sí" : "No";

const paso = pasoLista;

const L_TAM = [ .7, .8, .9, 1, 1.1, 1.2, 1.35, 1.5 ], L_OPAC = [ .3, .4, .5, .6, .7, .8, .9, 1 ];

const L_SENS_PAL = [ .6, .8, 1, 1.2, 1.5, 2 ], L_SENS_MIR = [ .4, .6, .8, 1, 1.25, 1.5, 2, 2.5, 3 ];

const L_ZONA = ZONAS_MUERTAS, L_VIBRA_Q = VIBRAS_QUEST;

const PESTANAS = [ [ "teclado", "Teclado" ], [ "joystick", "Joystick" ], [ "celular", "Celular" ], [ "quest", "Quest (VR)" ] ];

class PantallaControles {
  constructor() {
    this.abierta = false;
    this.esperando = null;
    this.nav = new NavMando(() => this._filas());
    this.flancos = new FlancosMando;
    this.raiz = null;
    this._raf = 0;
    this.pestana = "teclado";
    this.opts = new Map;
    this.enVR = null;
    this.alAbrirVR = null;
    if (typeof window === "undefined") return;
    addEventListener("mgs:controles", e => this.abrir(e.detail?.pestana));
    addEventListener("gamepadconnected", e => {
      this.rotularPanel();
      this._aviso(`Joystick conectado: ${NOMBRE_TIPO[detectarTipo(e.gamepad.id)]} (${e.gamepad.id})`, true);
      if (this.abierta) this.dibujar();
    });
    addEventListener("gamepaddisconnected", () => {
      this.rotularPanel();
      if (this.abierta) this.dibujar();
    });
    alCambiar(() => {
      this.rotularPanel();
      if (this.abierta) this.dibujar();
    });
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);
    if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => this.engancharPanel()); else this.engancharPanel();
  }
  engancharPanel() {
    const $ = s => document.getElementById(s);
    if ($("ctl-config")) $("ctl-config").onclick = () => this.abrir();
    if ($("ctl-vibra")) $("ctl-vibra").onclick = () => {
      ponerVibra(!vibraActiva());
      if (vibraActiva()) vibrar("leve");
    };
    if ($("ctl-probar")) $("ctl-probar").onclick = () => this.probar();
    this.rotularPanel();
  }
  rotularPanel() {
    if (typeof document === "undefined") return;
    const v = document.getElementById("ctl-vibra"), i = document.getElementById("ctl-info"), k = document.getElementById("g-ctl-k");
    if (v) v.textContent = "Vibración: " + (vibraActiva() ? "sí" : "no");
    const g = mandoConectado();
    if (i) i.textContent = g ? `Joystick ${NOMBRE_TIPO[tipoMando(g)]}${config.tipo === "auto" ? "" : " (forzado)"}: ${g.id}${g.vibrationActuator ? "" : " (sin vibración)"}${g.mapping === "standard" ? "" : " · mapeo no estándar: si un botón no coincide, reasignalo"}` : "Sin joystick: conectalo y apretá un botón. Configuración de fábrica = la de la Play.";
    if (k) k.textContent = g ? NOMBRE_TIPO[tipoMando(g)].toUpperCase() : "";
  }
  probar() {
    vibrar("stinger");
  }
  crear() {
    if (this.raiz) return;
    const r = this.raiz = document.createElement("div");
    r.id = "controles-capa";
    r.hidden = true;
    r.setAttribute("role", "dialog");
    r.setAttribute("aria-label", "Controles");
    r.innerHTML = `<div class="cu-caja"><h2>CONTROLES</h2><div class="cu-pestanas" role="tablist">${PESTANAS.map(([id, t]) => `<button role="tab" data-pest="${id}" data-k="pest:${id}">${t}</button>`).join("")}</div>\n      <div class="cu-estado"></div><div class="cu-lista"><table><thead></thead><tbody></tbody></table></div>\n      <div class="cu-aviso"></div><div class="cu-pie"><button data-p="restaurar" data-k="p:restaurar">Restaurar por defecto</button><button data-p="volver" data-k="p:volver">Volver</button></div></div>`;
    r.addEventListener("pointerdown", e => e.stopPropagation());
    r.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.pest) this.ponerPestana(b.dataset.pest); else if (b.dataset.o) this.cambiar(b.dataset.o, +(b.dataset.paso || 1)); else if (b.dataset.p === "probar") this.probar(); else if (b.dataset.p === "restaurar") this.restaurar(); else if (b.dataset.p === "volver") this.cerrar(); else if (b.dataset.id) this.esperar(b.dataset.id, b.dataset.tipo);
    });
    document.body.appendChild(r);
  }
  restaurar() {
    this.esperando = null;
    const p = this.pestana;
    if (p === "teclado") {
      restaurarTeclado();
      this._aviso("Teclado de fábrica.", true);
    } else if (p === "joystick") {
      restaurarMando();
      this._aviso("Joystick de fábrica (los botones de la Play; tipo automático).", true);
    } else if (p === "celular") {
      restaurarTactil();
      this._aviso("Mando táctil de fábrica.", true);
    } else {
      restaurarQuest();
      this._aviso("Quest de fábrica (diestro, giro de a 30°, marcha hacia el control).", true);
    }
  }
  ponerPestana(p) {
    if (!PESTANAS.some(([id]) => id === p)) return;
    if (this.esperando) {
      this.esperando = null;
      this._aviso("Cancelado.", true);
    }
    this.pestana = p;
    if (this.raiz) {
      this.raiz.querySelector(".cu-lista").scrollTop = 0;
      this.dibujar();
    }
  }
  _filas() {
    if (!this.raiz) return [];
    const F = [ [ ...this.raiz.querySelectorAll(".cu-pestanas button") ] ];
    for (const tr of this.raiz.querySelectorAll("tbody tr")) F.push([ ...tr.querySelectorAll("button[data-k]:not(.cu-flecha)") ]);
    F.push([ ...this.raiz.querySelectorAll(".cu-pie button") ]);
    return F;
  }
  _opciones() {
    const p = this.pestana, O = [];
    const op = (id, texto, valor, cambiar, sub) => O.push({
      id: id,
      texto: texto,
      valor: valor,
      cambiar: cambiar,
      sub: sub
    });
    if (p === "joystick") {
      const g = mandoConectado();
      op("tipo", "Tipo de joystick", () => config.tipo === "auto" ? `Automático (${NOMBRE_TIPO[g ? detectarTipo(g.id) : "ps"]})` : NOMBRE_TIPO[config.tipo], d => ponerTipoMando(paso([ "auto", ...TIPOS_MANDO ], config.tipo, d, true)), "Los nombres de los botones: ✕○□△ / A B X Y / B A Y X");
      op("vibra", "Vibración", () => siNo(vibraActiva()), () => {
        ponerVibra(!vibraActiva());
        if (vibraActiva()) vibrar("leve");
      }, "Joystick, celular y Quest");
    } else if (p === "celular") {
      const T = tactil;
      op("t-tam", "Tamaño de los botones", () => pct(T.tam), d => ponerTactil("tam", paso(L_TAM, T.tam, d)));
      op("t-opac", "Opacidad", () => pct(T.opacidad), d => ponerTactil("opacidad", paso(L_OPAC, T.opacidad, d)));
      op("t-zurdo", "Mano", () => T.zurdo ? "Zurdo" : "Diestro", () => ponerTactil("zurdo", !T.zurdo), "Zurdo: la palanca a la derecha y los botones a la izquierda");
      op("t-invy", "Invertir la vista (arriba/abajo)", () => siNo(T.invertirY), () => ponerTactil("invertirY", !T.invertirY));
      op("t-invx", "Invertir la vista (izq./der.)", () => siNo(T.invertirX), () => ponerTactil("invertirX", !T.invertirX));
      op("t-spal", "Sensibilidad de la palanca", () => pct(T.sensPalanca), d => ponerTactil("sensPalanca", paso(L_SENS_PAL, T.sensPalanca, d)), "Más = corre con menos recorrido");
      op("t-smir", "Sensibilidad de mirar", () => pct(T.sensMirar), d => ponerTactil("sensMirar", paso(L_SENS_MIR, T.sensMirar, d)), "Arrastrando el dedo");
      op("t-vib", "Vibración al tocar", () => siNo(T.vibraToque), () => {
        ponerTactil("vibraToque", !T.vibraToque);
        if (T.vibraToque) try {
          navigator.vibrate?.(12);
        } catch {}
      }, vibraActiva() ? "" : "La vibración general está apagada (pestaña JOYSTICK)");
    } else if (p === "quest") {
      const texto = id => ACCIONES_QUEST.find(a => a.id === id)?.texto ?? "—";
      for (const b of BOTONES_QUEST) op(`q:${b.lado}:${b.i}`, b.nombre, () => texto(accionQuest(b.lado, b.i)), d => {
        if (!rotarQuest(b.lado, b.i, d)) this._aviso("START tiene que quedar en algún botón: ponelo primero en otro.", true);
      }, b.i === 0 ? "También es el clic del rayo sobre los paneles" : "");
      op("q-giro", "Giro", () => quest.giro === "suave" ? "Suave" : "Por saltos", () => ponerQuest("giro", quest.giro === "suave" ? "saltos" : "suave"));
      if (quest.giro === "suave") op("q-vel", "Velocidad del giro", () => quest.velGiro + " °/s", d => ponerQuest("velGiro", paso(VELOCIDADES_GIRO, quest.velGiro, d))); else op("q-ang", "Ángulo de cada salto", () => quest.angulo + "°", d => ponerQuest("angulo", paso(ANGULOS_GIRO, quest.angulo, d)));
      op("q-zona", "Zona muerta de las palancas", () => pct(quest.zonaMuerta), d => ponerQuest("zonaMuerta", paso(L_ZONA, quest.zonaMuerta, d)));
      op("q-mano", "Mano hábil", () => quest.zurdo ? "Zurdo" : "Diestro", () => ponerQuest("zurdo", !quest.zurdo), "Zurdo: se mueve con la palanca derecha y dispara con la izquierda (espeja todos los botones)");
      op("q-dir", "Moverse hacia", () => quest.dir === "mirada" ? "La mirada" : "El control", () => ponerQuest("dir", quest.dir === "mirada" ? "control" : "mirada"));
      op("q-vib", "Vibración de los controles", () => quest.vibra > 0 ? pct(quest.vibra) : "No", d => ponerQuest("vibra", paso(L_VIBRA_Q, quest.vibra, d)));
    }
    return O;
  }
  cambiar(id, d) {
    const o = this.opts.get(id);
    if (!o) return;
    try {
      o.cambiar(d);
    } catch (e) {
      console.warn("controles_ui", e);
    }
    this.dibujar();
  }
  _filaOpcion(tb, o) {
    const tr = document.createElement("tr");
    tr.className = "cu-opt";
    const t0 = document.createElement("td");
    t0.className = "cu-acc";
    t0.textContent = o.texto;
    if (o.sub) {
      const s = document.createElement("small");
      s.textContent = o.sub;
      t0.appendChild(s);
    }
    const t1 = document.createElement("td"), caja = document.createElement("div");
    caja.className = "cu-val";
    const btn = (txt, paso, cls, k) => {
      const b = document.createElement("button");
      b.textContent = txt;
      b.dataset.o = o.id;
      b.dataset.paso = paso;
      b.className = cls;
      if (k) b.dataset.k = k; else b.tabIndex = -1;
      return b;
    };
    caja.append(btn("‹", -1, "cu-flecha"), btn(o.valor(), 1, "cu-valor", "o:" + o.id), btn("›", 1, "cu-flecha"));
    t1.appendChild(caja);
    tr.append(t0, t1);
    tb.appendChild(tr);
  }
  _sep(tb, a, b) {
    const tr = document.createElement("tr");
    tr.className = "cu-sep";
    const t0 = document.createElement("td"), t1 = document.createElement("td");
    t0.textContent = a;
    t1.textContent = b || "";
    tr.append(t0, t1);
    tb.appendChild(tr);
  }
  dibujar() {
    if (!this.raiz) return;
    const P = this.pestana, tb = this.raiz.querySelector("tbody"), th = this.raiz.querySelector("thead"), foco = this.nav.el?.dataset.k || null;
    for (const b of this.raiz.querySelectorAll(".cu-pestanas button")) {
      const si = b.dataset.pest === P;
      b.classList.toggle("cu-activa", si);
      b.setAttribute("aria-selected", si);
    }
    tb.innerHTML = "";
    th.innerHTML = "";
    const O = this._opciones();
    this.opts = new Map(O.map(o => [ o.id, o ]));
    const g = mandoConectado(), tipo = tipoMando(g);
    if (P === "quest") this._sep(tb, "Botón del Touch", "Acción");
    for (const o of O) {
      if (P === "quest" && o.id === "q-giro") this._sep(tb, "Palancas y opciones", quest.zurdo ? "se mueve con la palanca derecha y gira con la izquierda" : "se mueve con la palanca izquierda y gira con la derecha");
      this._filaOpcion(tb, o);
    }
    if (P === "joystick") {
      const tr = document.createElement("tr"), t0 = document.createElement("td"), t1 = document.createElement("td"), b = document.createElement("button");
      t0.className = "cu-acc";
      t0.textContent = "Probar vibración";
      b.textContent = "Vibrar";
      b.dataset.p = "probar";
      b.dataset.k = "p:probar";
      t1.appendChild(b);
      tr.append(t0, t1);
      tb.appendChild(tr);
    }
    if (P === "teclado" || P === "joystick") {
      const tecla = P === "teclado";
      this._sep(tb, "Acción", tecla ? "Tecla" : `Botón (${NOMBRE_TIPO[tipo]})`);
      for (const a of ACCIONES) {
        const tr = document.createElement("tr");
        const t0 = document.createElement("td");
        t0.className = "cu-acc";
        t0.textContent = a.texto;
        if (!tecla && a.boton != null && tipo !== "ps" && tipo !== "generico") {
          const s = document.createElement("small");
          s.textContent = "En la Play: " + NOMBRE_BOTON[a.boton];
          t0.appendChild(s);
        } else if (tecla && a.boton != null) {
          const s = document.createElement("small");
          s.textContent = "En la Play: " + NOMBRE_BOTON[a.boton];
          t0.appendChild(s);
        }
        tr.appendChild(t0);
        const t1 = document.createElement("td");
        if (tecla && a.teclas.length) {
          const b = document.createElement("button");
          b.dataset.id = a.id;
          b.dataset.tipo = "tecla";
          b.dataset.k = "tecla:" + a.id;
          const ks = teclasDe(a.id);
          b.textContent = ks.length ? ks.map(nombreTecla).join(" / ") : "—";
          if (this.esperando?.id === a.id && this.esperando.tipo === "tecla") {
            b.textContent = "¿tecla?";
            b.classList.add("cu-esperando");
          }
          t1.appendChild(b);
          if (a.extra === "o clic") {
            const s = document.createElement("span");
            s.className = "cu-extra";
            s.textContent = a.extra;
            t1.appendChild(s);
          }
        } else if (!tecla && a.boton != null) {
          const b = document.createElement("button");
          b.dataset.id = a.id;
          b.dataset.tipo = "boton";
          b.dataset.k = "boton:" + a.id;
          b.textContent = nombreBoton(botonDe(a.id), tipo);
          if (this.esperando?.id === a.id && this.esperando.tipo === "boton") {
            b.textContent = "¿botón?";
            b.classList.add("cu-esperando");
          }
          t1.appendChild(b);
        } else {
          const s = document.createElement("span");
          s.className = "cu-fijo";
          s.textContent = tecla ? a.extra || "—" : a.mando || "—";
          t1.appendChild(s);
        }
        tr.appendChild(t1);
        tb.appendChild(tr);
      }
    }
    const est = {
      teclado: "Elegí una acción y apretá la tecla nueva. Flechas/Enter para elegir, Tab cambia de pestaña, Esc vuelve.",
      joystick: (g ? `Joystick: ${g.id}${g.mapping === "standard" ? "" : " · mapeo no estándar: si un botón no coincide, reasignalo"}` : "Sin joystick conectado (conectalo y apretá un botón).") + ` · Cruceta/${nombreAccionMando("circulo", tipo)} para elegir, ${nombreAccionMando("cruz", tipo)} vuelve, ${nombreBotonMando(B.L1, tipo)}/${nombreBotonMando(B.R1, tipo)} cambian de pestaña.`,
      celular: "El mando en pantalla del celular" + (TACTIL ? "" : " (en esta compu no se ve: abrí el visor en el celular o con ?tactil)") + ". Los cambios se aplican al momento.",
      quest: "Controles Touch del Meta Quest. Adentro del casco está lo mismo en START > CONTROLES. ← → o ‹ › cambian cada valor."
    }[P];
    this.raiz.querySelector(".cu-estado").textContent = est;
    this.nav.el?.classList.remove("foco-mando");
    this.nav.el = null;
    const el = foco && this.raiz.querySelector(`[data-k="${CSS_ESC(foco)}"]`);
    if (el) this.nav.pintar(el); else if (foco) this.nav.ubicar();
  }
  _aviso(t, temporal = false) {
    const a = this.raiz?.querySelector(".cu-aviso");
    if (!a) return;
    a.textContent = t;
    clearTimeout(this._tAviso);
    if (temporal) this._tAviso = setTimeout(() => {
      if (!this.esperando) a.textContent = "";
    }, 3e3);
  }
  abrir(pestana) {
    if (typeof document === "undefined") return;
    if (this.enVR?.()) {
      this.alAbrirVR?.();
      return;
    }
    this.crear();
    if (this.abierta) {
      if (pestana) this.ponerPestana(pestana);
      return;
    }
    this.pestana = PESTANAS.some(([id]) => id === pestana) ? pestana : TACTIL ? "celular" : mandoConectado() ? "joystick" : "teclado";
    this.abierta = true;
    this.raiz.hidden = false;
    this.esperando = null;
    try {
      document.exitPointerLock?.();
    } catch {}
    bloquearMando(true);
    bloquearEntrada(e => this._tecla(e));
    this.nav.el = null;
    this.dibujar();
    this.nav.f = 0;
    this.nav.c = PESTANAS.findIndex(([id]) => id === this.pestana);
    this.nav.ubicar();
    this._aviso(this.pestana === "celular" || this.pestana === "quest" ? "Elegí una opción y cambiala con ‹ › (o ← →)." : "Elegí una casilla y apretá la tecla o el botón nuevo.", true);
    this.flancos = new FlancosMando;
    this._previos = this._apretados();
    const bucle = () => {
      if (!this.abierta) return;
      this._cuadro();
      this._raf = requestAnimationFrame(bucle);
    };
    this._raf = requestAnimationFrame(bucle);
  }
  cerrar() {
    if (!this.abierta) return;
    this.abierta = false;
    this.esperando = null;
    this.raiz.hidden = true;
    this.nav.limpiar();
    cancelAnimationFrame(this._raf);
    bloquearEntrada(null);
    bloquearMando(false);
    this.rotularPanel();
    dispatchEvent(new CustomEvent("mgs:controles-cerrado"));
  }
  esperar(id, tipo) {
    this.esperando = {
      id: id,
      tipo: tipo,
      t: performance.now()
    };
    const a = ACCIONES.find(x => x.id === id);
    this._aviso(tipo === "tecla" ? `Apretá una tecla para «${a.texto}» (Esc = cancelar).` : `Apretá un botón del joystick para «${a.texto}» (Esc o esperar 6 s = cancelar).`);
    this._previos = this._apretados();
    this.dibujar();
  }
  _lado(dir) {
    const el = this.nav.ubicar() && this.nav.el;
    if (el?.dataset.o) {
      this.cambiar(el.dataset.o, dir === "der" ? 1 : -1);
      return;
    }
    this.nav.mover(dir);
    if (this.nav.el?.dataset.pest && this.nav.el.dataset.pest !== this.pestana) this.ponerPestana(this.nav.el.dataset.pest);
  }
  _otraPestana(d) {
    const i = PESTANAS.findIndex(([id]) => id === this.pestana), p = PESTANAS[(i + d + PESTANAS.length) % PESTANAS.length][0];
    this.ponerPestana(p);
    this.nav.el?.classList.remove("foco-mando");
    this.nav.el = null;
    this.nav.f = 0;
    this.nav.c = PESTANAS.findIndex(([id]) => id === p);
    this.nav.ubicar();
  }
  _tecla(e) {
    if (e.type !== "keydown") return false;
    const E = this.esperando;
    if (E?.tipo === "tecla") {
      if (e.code === "Escape") {
        this.esperando = null;
        this._aviso("Cancelado.", true);
        this.dibujar();
        return true;
      }
      if (tecla_reservada(e.code) || e.repeat) return true;
      const ok = asignarTecla(E.id, e.code);
      this.esperando = null;
      this._aviso(ok ? `«${ACCIONES.find(x => x.id === E.id).texto}» = ${nombreTecla(e.code)}` : "Esa tecla no se puede usar.", true);
      this.dibujar();
      return true;
    }
    if (E && e.code === "Escape") {
      this.esperando = null;
      this._aviso("Cancelado.", true);
      this.dibujar();
      return true;
    }
    if (E) return true;
    const dir = {
      ArrowUp: "arriba",
      ArrowDown: "abajo",
      ArrowLeft: "izq",
      ArrowRight: "der"
    }[e.code];
    if (dir === "izq" || dir === "der") this._lado(dir); else if (dir) this.nav.mover(dir); else if (e.code === "Tab") this._otraPestana(e.shiftKey ? -1 : 1); else if (e.code === "PageUp" || e.code === "PageDown") this._otraPestana(e.code === "PageDown" ? 1 : -1); else if (e.code === "Enter" || e.code === "Space" || e.code === "NumpadEnter") {
      if (!e.repeat) this.nav.activar();
    } else if (e.code === "Escape" || e.code === "Backspace") this.cerrar(); else if (/^F\d+$/.test(e.code)) return false;
    return true;
  }
  _apretados() {
    const s = new Set;
    for (const g of mandosCrudos()) if (g) g.buttons.forEach((b, i) => {
      if (b.pressed) s.add(g.index + ":" + i);
    });
    return s;
  }
  _cuadro() {
    const E = this.esperando;
    if (E?.tipo === "boton") {
      if (performance.now() - E.t > 6e3) {
        this.esperando = null;
        this._aviso("Cancelado (no se apretó ningún botón).", true);
        this.dibujar();
        return;
      }
      const ahora = this._apretados();
      for (const k of ahora) if (!this._previos.has(k)) {
        const i = +k.split(":")[1];
        if (!ASIGNABLES.includes(i)) continue;
        asignarBoton(E.id, i);
        this.esperando = null;
        this._aviso(`«${ACCIONES.find(x => x.id === E.id).texto}» = ${nombreBoton(i)}`, true);
        this.dibujar();
        this._previos = ahora;
        this.flancos.leer(null);
        return;
      }
      this._previos = ahora;
      return;
    }
    const g = mandosCrudos().find(x => x && x.connected);
    const fis = i => i === B.CIRCULO || i === B.CRUZ || i === B.START || i === B.SELECT || i === B.L1 || i === B.R1 ? config.mando[{
      [B.CIRCULO]: "circulo",
      [B.CRUZ]: "cruz",
      [B.START]: "start",
      [B.SELECT]: "select",
      [B.L1]: "l1",
      [B.R1]: "r1"
    }[i]] : i;
    const ahora = this._apretados();
    for (const k of [ ...this._previos ]) if (!ahora.has(k)) this._previos.delete(k);
    if (this._previos.size) return;
    for (const f of this.flancos.leer(g, fis)) {
      if (f === "izq" || f === "der") this._lado(f); else if (f === "arriba" || f === "abajo") this.nav.mover(f); else if (f === "l1" || f === "r1") this._otraPestana(f === "r1" ? 1 : -1); else if (f === "ok") {
        const el = this.nav.activar();
        if (el?.dataset.tipo === "boton") this._previos = this._apretados();
      } else if (f === "atras" || f === "start") {
        if (this.esperando) {
          this.esperando = null;
          this._aviso("Cancelado.", true);
          this.dibujar();
        } else this.cerrar();
      }
    }
  }
}

const CSS_ESC = s => String(s).replace(/["\\]/g, "\\$&");

export const pantallaControles = new PantallaControles;

if (typeof window !== "undefined") window.__controlesUI = pantallaControles;
