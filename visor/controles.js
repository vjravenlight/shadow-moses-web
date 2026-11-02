// MGS web — FeniXVOID · Project Ravenlight
export const B = {
  CRUZ: 0,
  CIRCULO: 1,
  CUADRADO: 2,
  TRIANGULO: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  ARRIBA: 12,
  ABAJO: 13,
  IZQ: 14,
  DER: 15,
  PS: 16
};

export const NOMBRE_BOTON = [ "✕", "○", "□", "△", "L1", "R1", "L2", "R2", "SELECT", "START", "L3", "R3", "↑", "↓", "←", "→", "PS" ];

export const TIPOS_MANDO = [ "ps", "xbox", "switch", "8bitdo", "generico" ];

export const ACCIONES = [ {
  id: "adelante",
  texto: "Adelante",
  teclas: [ "KeyW", "ArrowUp" ],
  mando: "Palanca izq. / cruceta"
}, {
  id: "atras",
  texto: "Atrás",
  teclas: [ "KeyS", "ArrowDown" ],
  mando: "Palanca izq. / cruceta"
}, {
  id: "izquierda",
  texto: "Izquierda",
  teclas: [ "KeyA", "ArrowLeft" ],
  mando: "Palanca izq. / cruceta"
}, {
  id: "derecha",
  texto: "Derecha",
  teclas: [ "KeyD", "ArrowRight" ],
  mando: "Palanca izq. / cruceta"
}, {
  id: "caminar",
  texto: "Caminar despacio",
  teclas: [ "ShiftLeft", "ShiftRight" ],
  mando: "— (en el MGS1 la palanca siempre corre)"
}, {
  id: "cruz",
  texto: "Agacharse / cuerpo a tierra",
  teclas: [ "KeyC" ],
  boton: B.CRUZ
}, {
  id: "circulo",
  texto: "Golpe / acción",
  teclas: [ "KeyG" ],
  boton: B.CIRCULO
}, {
  id: "cuadrado",
  texto: "Disparar / usar arma",
  teclas: [ "KeyJ" ],
  boton: B.CUADRADO,
  extra: "o clic"
}, {
  id: "triangulo",
  texto: "Primera persona (mantener)",
  teclas: [ "KeyE" ],
  boton: B.TRIANGULO
}, {
  id: "l1",
  texto: "L1",
  teclas: [ "Digit1" ],
  boton: B.L1
}, {
  id: "r1",
  texto: "R1",
  teclas: [ "Digit2" ],
  boton: B.R1
}, {
  id: "l2",
  texto: "Ítems (L2)",
  teclas: [ "KeyZ" ],
  boton: B.L2
}, {
  id: "r2",
  texto: "Armas (R2)",
  teclas: [ "KeyX" ],
  boton: B.R2
}, {
  id: "start",
  texto: "Pausa / menú (START)",
  teclas: [ "Tab", "KeyM" ],
  boton: B.START
}, {
  id: "select",
  texto: "Códec (SELECT)",
  teclas: [ "KeyT", "Backspace" ],
  boton: B.SELECT
}, {
  id: "mirar",
  texto: "Mirar",
  teclas: [],
  mando: "Palanca derecha",
  extra: "mouse"
}, {
  id: "recargar",
  texto: "Recargar",
  teclas: [ "KeyR" ]
}, {
  id: "vista",
  texto: "Cambiar vista",
  teclas: [ "KeyV" ]
}, {
  id: "saltar",
  texto: "Saltar",
  teclas: [ "Space" ]
} ];

const POR_ID = Object.fromEntries(ACCIONES.map(a => [ a.id, a ]));

export const ASIGNABLES = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16 ];

export const tecla_reservada = c => c === "Escape" || /^F\d+$/.test(c) || /^(Meta|OS|ContextMenu)/.test(c);

const CLAVE = "sm_controles";

const leerLS = k => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const escribirLS = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

function deFabrica() {
  const teclas = {}, mando = {};
  for (const a of ACCIONES) {
    teclas[a.id] = a.teclas.slice();
    if (a.boton != null) mando[a.id] = a.boton;
  }
  return {
    teclas: teclas,
    mando: mando,
    tipo: "auto"
  };
}

function cargar() {
  const c = deFabrica();
  try {
    const g = JSON.parse(leerLS(CLAVE) || "null");
    if (g?.teclas) for (const id in c.teclas) if (Array.isArray(g.teclas[id])) c.teclas[id] = g.teclas[id].filter(x => typeof x === "string" || x === null).slice(0, 2);
    if (g?.mando) for (const id in c.mando) if (Number.isInteger(g.mando[id])) c.mando[id] = g.mando[id];
    if (typeof g?.tipo === "string" && (g.tipo === "auto" || TIPOS_MANDO.includes(g.tipo))) c.tipo = g.tipo;
  } catch {}
  return c;
}

export const config = cargar();

const oyentes = new Set;

export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function guardar() {
  escribirLS(CLAVE, JSON.stringify(config));
  recalcular();
  for (const f of oyentes) try {
    f();
  } catch {}
}

let traduccion = new Map;

let permutacion = null;

function recalcular() {
  const t = new Map, usadas = new Set;
  for (const a of ACCIONES) (config.teclas[a.id] || []).forEach((c, i) => {
    if (c) {
      usadas.add(c);
      const logica = a.teclas[i] ?? a.teclas[0];
      if (logica && logica !== c) t.set(c, logica);
    }
  });
  for (const a of ACCIONES) for (const c of a.teclas) if (!usadas.has(c) && !t.has(c)) t.set(c, null);
  traduccion = t;
  let p = null;
  for (const a of ACCIONES) if (a.boton != null && config.mando[a.id] !== a.boton) {
    p ||= Array.from({
      length: 17
    }, (_, i) => i);
    p[a.boton] = config.mando[a.id];
  }
  permutacion = p;
}

recalcular();

export function asignarTecla(id, code, slot = 0) {
  const a = POR_ID[id];
  if (!a || tecla_reservada(code)) return false;
  const vieja = config.teclas[id][slot] ?? null;
  for (const b of ACCIONES) {
    const l = config.teclas[b.id];
    if (!l) continue;
    for (let i = 0; i < l.length; i++) if (l[i] === code && !(b.id === id && i === slot)) l[i] = b.id !== id && i === 0 ? vieja : null;
  }
  config.teclas[id][slot] = code;
  guardar();
  return true;
}

export function asignarBoton(id, fisico) {
  const a = POR_ID[id];
  if (!a || a.boton == null || !ASIGNABLES.includes(fisico)) return false;
  const viejo = config.mando[id];
  for (const b of ACCIONES) if (b.id !== id && b.boton != null && config.mando[b.id] === fisico) config.mando[b.id] = viejo;
  config.mando[id] = fisico;
  guardar();
  return true;
}

export function restaurar() {
  const c = deFabrica();
  config.teclas = c.teclas;
  config.mando = c.mando;
  config.tipo = c.tipo;
  guardar();
}

export function restaurarTeclado() {
  config.teclas = deFabrica().teclas;
  guardar();
}

export function restaurarMando() {
  const c = deFabrica();
  config.mando = c.mando;
  config.tipo = c.tipo;
  guardar();
}

export const teclasDe = id => (config.teclas[id] || []).filter(Boolean);

export const botonDe = id => config.mando[id];

export const NOMBRE_TIPO = {
  auto: "Automático",
  ps: "PlayStation",
  xbox: "Xbox",
  switch: "Nintendo Switch",
  "8bitdo": "8BitDo",
  generico: "Genérico"
};

const NOMBRES_MANDO = {
  ps: NOMBRE_BOTON,
  xbox: [ "A", "B", "X", "Y", "LB", "RB", "LT", "RT", "VIEW", "MENU", "LS", "RS", "↑", "↓", "←", "→", "XBOX" ],
  switch: [ "B", "A", "Y", "X", "L", "R", "ZL", "ZR", "−", "+", "LS", "RS", "↑", "↓", "←", "→", "HOME" ],
  "8bitdo": [ "B", "A", "Y", "X", "L1", "R1", "L2", "R2", "SELECT", "START", "L3", "R3", "↑", "↓", "←", "→", "HOME" ],
  generico: NOMBRE_BOTON
};

export function detectarTipo(id = "") {
  const s = String(id).toLowerCase();
  const v = /vendor:\s*([0-9a-f]{4})/.exec(s)?.[1] || /^([0-9a-f]{1,4})-[0-9a-f]{1,4}-/.exec(s)?.[1]?.padStart(4, "0") || "";
  if (v === "2dc8" || /8bitdo|8bit ?do/.test(s)) return "8bitdo";
  if (v === "045e" || /xbox|xinput|microsoft/.test(s)) return "xbox";
  if (v === "057e" || /pro controller|joy-?con|nintendo|switch/.test(s)) return "switch";
  if (v === "054c" || /dualsense|dualshock|playstation|sony|wireless controller|ps[1-5]\b/.test(s)) return "ps";
  return "generico";
}

function variantePS(id = "") {
  const s = String(id).toLowerCase();
  if (/0ce6|0df2|dualsense/.test(s)) return [ "CREATE", "OPTIONS" ];
  if (/05c4|09cc|0ba0|dualshock ?4|wireless controller/.test(s)) return [ "SHARE", "OPTIONS" ];
  return null;
}

export const mandoConectado = () => mandosCrudos().find(g => g && g.connected) || null;

export function tipoMando(g = mandoConectado()) {
  return config.tipo !== "auto" && TIPOS_MANDO.includes(config.tipo) ? config.tipo : g ? detectarTipo(g.id) : "ps";
}

export function ponerTipoMando(t) {
  if (t !== "auto" && !TIPOS_MANDO.includes(t)) return false;
  config.tipo = t;
  guardar();
  return true;
}

export function nombresMando(tipo = tipoMando(), g = mandoConectado()) {
  const n = (NOMBRES_MANDO[tipo] || NOMBRE_BOTON).slice();
  if (tipo === "ps") {
    const v = variantePS(g?.id);
    if (v) {
      n[8] = v[0];
      n[9] = v[1];
    }
  }
  return n;
}

export const nombreBotonMando = (i, tipo) => i == null || i < 0 ? "—" : nombresMando(tipo)[i] ?? "Botón " + i;

export const nombreAccionMando = (id, tipo) => nombreBotonMando(config.mando[id], tipo);

const ASCII = {
  "✕": "X",
  "○": "O",
  "□": "CUADRADO",
  "△": "TRIANGULO",
  "−": "-"
};

export const nombreAscii = n => ASCII[n] ?? n;

const CLAVE_TACTIL = "sm_tactil";

export const TACTIL_FABRICA = Object.freeze({
  tam: 1,
  opacidad: 1,
  zurdo: false,
  invertirY: false,
  invertirX: false,
  sensPalanca: 1,
  sensMirar: 1,
  vibraToque: true
});

function cargarTactil() {
  const c = {
    ...TACTIL_FABRICA
  };
  try {
    const g = JSON.parse(leerLS(CLAVE_TACTIL) || "null");
    if (g) for (const k in c) if (typeof g[k] === typeof c[k]) c[k] = g[k];
  } catch {}
  return c;
}

export const tactil = cargarTactil();

function avisar() {
  for (const f of oyentes) try {
    f();
  } catch {}
}

export function ponerTactil(k, v) {
  if (!(k in TACTIL_FABRICA) || typeof v !== typeof TACTIL_FABRICA[k]) return false;
  tactil[k] = v;
  escribirLS(CLAVE_TACTIL, JSON.stringify(tactil));
  avisar();
  return true;
}

export function restaurarTactil() {
  Object.assign(tactil, TACTIL_FABRICA);
  escribirLS(CLAVE_TACTIL, JSON.stringify(tactil));
  avisar();
}

export const BOTONES_QUEST = [ {
  lado: "right",
  i: 4,
  nombre: "A"
}, {
  lado: "right",
  i: 5,
  nombre: "B"
}, {
  lado: "left",
  i: 4,
  nombre: "X"
}, {
  lado: "left",
  i: 5,
  nombre: "Y"
}, {
  lado: "right",
  i: 0,
  nombre: "Gatillo der."
}, {
  lado: "left",
  i: 0,
  nombre: "Gatillo izq."
}, {
  lado: "right",
  i: 1,
  nombre: "Apretón der."
}, {
  lado: "left",
  i: 1,
  nombre: "Apretón izq."
}, {
  lado: "right",
  i: 3,
  nombre: "Clic palanca der."
}, {
  lado: "left",
  i: 3,
  nombre: "Clic palanca izq."
} ];

export const ACCIONES_QUEST = [ {
  id: null,
  texto: "Nada"
}, {
  id: "cuadrado",
  texto: "Disparar / usar el arma (□)"
}, {
  id: "circulo",
  texto: "Golpe / acción · aceptar (○)"
}, {
  id: "cruz",
  texto: "Agacharse / cuerpo a tierra · volver (✕)"
}, {
  id: "triangulo",
  texto: "△ (en los menús)"
}, {
  id: "L2",
  texto: "Ítems (mantener, L2)"
}, {
  id: "R2",
  texto: "Armas (mantener, R2)"
}, {
  id: "L1",
  texto: "Sacar / guardar el ítem (L1)"
}, {
  id: "R1",
  texto: "Sacar / guardar el arma (R1)"
}, {
  id: "start",
  texto: "Menú del casco / pausa (START)"
}, {
  id: "select",
  texto: "Códec (SELECT)"
} ];

const QUEST_MAPA = {
  right: {
    0: "cuadrado",
    1: "R2",
    3: "R1",
    4: "circulo",
    5: "cruz"
  },
  left: {
    0: null,
    1: "L2",
    3: "start",
    4: "triangulo",
    5: "select"
  }
};

export const QUEST_FABRICA = Object.freeze({
  giro: "saltos",
  angulo: 30,
  velGiro: 90,
  zonaMuerta: .15,
  vibra: 1,
  zurdo: false,
  dir: "control"
});

export const ANGULOS_GIRO = [ 15, 30, 45, 90 ], VELOCIDADES_GIRO = [ 45, 90, 135, 180, 270 ];

export const ZONAS_MUERTAS = [ .05, .1, .15, .2, .25, .3, .4 ], VIBRAS_QUEST = [ 0, .25, .5, .75, 1 ];

export function pasoLista(lista, v, d, vuelta = false) {
  let i = lista.findIndex(x => typeof x === "number" && typeof v === "number" ? Math.abs(x - v) < 1e-6 : x === v);
  if (i < 0) i = typeof v === "number" ? lista.reduce((m, x, j) => Math.abs(x - v) < Math.abs(lista[m] - v) ? j : m, 0) : 0;
  const n = lista.length, j = vuelta ? (i + d + n) % n : Math.max(0, Math.min(n - 1, i + d));
  return lista[j];
}

const CLAVE_QUEST = "sm_quest";

const copiaMapa = m => ({
  right: {
    ...m.right
  },
  left: {
    ...m.left
  }
});

function cargarQuest() {
  const c = {
    ...QUEST_FABRICA,
    mapa: copiaMapa(QUEST_MAPA)
  };
  try {
    const g = JSON.parse(leerLS(CLAVE_QUEST) || "null");
    if (g) for (const k of [ "giro", "angulo", "velGiro", "zonaMuerta", "vibra" ]) if (typeof g[k] === typeof c[k]) c[k] = g[k];
    const ids = new Set(ACCIONES_QUEST.map(a => a.id));
    if (g?.mapa) for (const b of BOTONES_QUEST) {
      const v = g.mapa[b.lado]?.[b.i];
      if (v !== undefined && ids.has(v)) c.mapa[b.lado][b.i] = v;
    }
  } catch {}
  c.zurdo = leerLS("sm_vrzurdo") === "1";
  c.dir = leerLS("sm_vrdir") === "mirada" ? "mirada" : "control";
  return c;
}

export const quest = cargarQuest();

function guardarQuest() {
  const {mapa: mapa, giro: giro, angulo: angulo, velGiro: velGiro, zonaMuerta: zonaMuerta, vibra: vibra} = quest;
  escribirLS(CLAVE_QUEST, JSON.stringify({
    mapa: mapa,
    giro: giro,
    angulo: angulo,
    velGiro: velGiro,
    zonaMuerta: zonaMuerta,
    vibra: vibra
  }));
  escribirLS("sm_vrzurdo", quest.zurdo ? "1" : "0");
  escribirLS("sm_vrdir", quest.dir);
  avisar();
}

export function ponerQuest(k, v) {
  if (!(k in QUEST_FABRICA) || typeof v !== typeof QUEST_FABRICA[k]) return false;
  if (k === "giro" && v !== "saltos" && v !== "suave") return false;
  if (k === "dir" && v !== "control" && v !== "mirada") return false;
  quest[k] = v;
  guardarQuest();
  return true;
}

const espejo = lado => lado === "left" ? "right" : "left";

const ladoConfig = lado => quest.zurdo ? espejo(lado) : lado;

export const accionQuest = (lado, i) => quest.mapa[ladoConfig(lado)]?.[i] ?? null;

export function asignarQuest(lado, i, accion) {
  if (!ACCIONES_QUEST.some(a => a.id === accion)) return false;
  const l = ladoConfig(lado), antes = quest.mapa[l]?.[i] ?? null;
  if (antes === "start" && accion !== "start" && BOTONES_QUEST.filter(b => quest.mapa[b.lado][b.i] === "start").length < 2) return false;
  quest.mapa[l][i] = accion;
  guardarQuest();
  return true;
}

export function restaurarQuest() {
  Object.assign(quest, QUEST_FABRICA, {
    mapa: copiaMapa(QUEST_MAPA)
  });
  guardarQuest();
}

export function restaurarBotonesQuest() {
  quest.mapa = copiaMapa(QUEST_MAPA);
  guardarQuest();
}

export function rotarQuest(lado, i, d) {
  const ids = ACCIONES_QUEST.map(a => a.id);
  let v = accionQuest(lado, i);
  if (v === "start" && BOTONES_QUEST.filter(b => accionQuest(b.lado, b.i) === "start").length < 2) return false;
  for (let n = 0; n < ids.length; n++) {
    v = pasoLista(ids, v, d, true);
    if (asignarQuest(lado, i, v)) return true;
  }
  return false;
}

export function mapaQuest() {
  const m = {
    left: {},
    right: {}
  };
  for (const b of BOTONES_QUEST) {
    const a = accionQuest(b.lado, b.i);
    if (a) m[b.lado][b.i] = a;
  }
  return m;
}

export function botonQuestDe(accion) {
  const b = BOTONES_QUEST.find(x => accionQuest(x.lado, x.i) === accion);
  return b ? b.nombre : null;
}

const sinTildes = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

export function ayudaQuest() {
  const mov = quest.zurdo ? "DER" : "IZQ", gira = quest.zurdo ? "IZQ" : "DER";
  const giro = quest.giro === "suave" ? `GIRAR (SUAVE, ${quest.velGiro} GRADOS/S)` : `GIRAR (SALTOS DE ${quest.angulo} GRADOS)`;
  const textoA = {
    cuadrado: "DISPARAR / USAR EL ARMA",
    circulo: "GOLPE / ACCION",
    cruz: "AGACHARSE / CUERPO A TIERRA / PARARSE",
    triangulo: "TRIANGULO (MENUS)",
    L2: "ITEMS (MANTENER)",
    R2: "ARMAS (MANTENER)",
    L1: "SACAR / GUARDAR ITEM",
    R1: "SACAR / GUARDAR ARMA",
    start: "MENU DEL CASCO (PAUSA)",
    select: "CODEC"
  };
  const l = [ `PALANCA ${mov}: MOVERSE (A FONDO = CORRER)`, `PALANCA ${gira}: ${giro}` ];
  for (const b of BOTONES_QUEST) {
    const a = accionQuest(b.lado, b.i);
    if (a) l.push(`${sinTildes(b.nombre).replace(/\.$/, "")}: ${textoA[a] || a.toUpperCase()}`);
  }
  return l;
}

export const vibraQuest = () => Math.max(0, Math.min(1, quest.vibra));

let bloqueo = null;

export function bloquearEntrada(fn) {
  bloqueo = fn;
}

const sinteticos = new WeakSet;

if (typeof window !== "undefined") {
  const traducir = e => {
    if (sinteticos.has(e)) return;
    if (bloqueo) {
      if (bloqueo(e) !== false) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
    }
    const t = e.target, escribiendo = t && (t.tagName === "INPUT" && t.type !== "checkbox" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
    if (escribiendo || !traduccion.has(e.code)) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const logica = traduccion.get(e.code);
    if (!logica) return;
    const n = new KeyboardEvent(e.type, {
      code: logica,
      key: e.key,
      repeat: e.repeat,
      bubbles: true,
      cancelable: true,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });
    sinteticos.add(n);
    (t && t.dispatchEvent ? t : window).dispatchEvent(n);
  };
  addEventListener("keydown", traducir, true);
  addEventListener("keyup", traducir, true);
}

const nav = typeof navigator !== "undefined" ? navigator : null;

const getNavegador = nav?.getGamepads ? nav.getGamepads.bind(nav) : () => [];

let mandoPrueba = null;

const getOriginal = () => mandoPrueba ? mandoPrueba() : getNavegador();

export function mandosCrudos() {
  try {
    return [ ...getOriginal() || [] ];
  } catch {
    return [];
  }
}

let mandoBloqueado = false, esperarSuelto = false;

export function bloquearMando(si) {
  mandoBloqueado = si;
  if (!si) esperarSuelto = true;
}

const SUELTO = Object.freeze({
  pressed: false,
  touched: false,
  value: 0
});

function virtual(g, neutro) {
  if (!g) return g;
  const bt = g.buttons || [];
  const buttons = neutro ? bt.map(() => SUELTO) : permutacion ? bt.map((b, i) => i < permutacion.length ? permutacion[i] < 0 ? SUELTO : bt[permutacion[i]] || SUELTO : b) : bt;
  return {
    id: g.id,
    index: g.index,
    connected: g.connected,
    mapping: g.mapping,
    timestamp: g.timestamp,
    axes: neutro ? (g.axes || []).map(() => 0) : g.axes,
    buttons: buttons,
    vibrationActuator: g.vibrationActuator,
    hapticActuators: g.hapticActuators,
    _fisico: g
  };
}

if (nav?.getGamepads) {
  try {
    Object.defineProperty(nav, "getGamepads", {
      configurable: true,
      writable: true,
      value: function getGamepads() {
        const l = getOriginal();
        if (esperarSuelto) {
          if (!(l || []).some(g => g && g.buttons.some(b => b.pressed))) esperarSuelto = false;
        }
        const neutro = mandoBloqueado || esperarSuelto;
        if (!neutro && !permutacion) return l;
        return [ ...l || [] ].map(g => virtual(g, neutro));
      }
    });
  } catch {}
}

export function mando() {
  try {
    return [ ...nav?.getGamepads?.() || [] ].find(g => g && g.connected) || null;
  } catch {
    return null;
  }
}

export function apretadoCrudo(g, i) {
  const k = permutacion ? permutacion[i] : i;
  return k != null && k >= 0 && !!g?.buttons?.[k]?.pressed;
}

export function palanca(x = 0, y = 0, muerta = .2) {
  const m = Math.hypot(x, y);
  if (m < muerta) return {
    x: 0,
    y: 0,
    m: 0
  };
  const k = Math.min(1, (m - muerta) / (1 - muerta));
  return {
    x: x / m * k,
    y: y / m * k,
    m: k
  };
}

export function vibraActiva() {
  return leerLS("sm_vibra") !== "0";
}

export function ponerVibra(si) {
  escribirLS("sm_vibra", si ? "1" : "0");
  if (!si) apagar();
  for (const f of oyentes) try {
    f();
  } catch {}
}

export const PATRONES = {
  stinger: {
    m1: [ 0, 2, 127, 4 ],
    m2: [ 145, 4, 75, 10 ]
  },
  leve: {
    m1: [ 127, 4 ],
    m2: [ 225, 1, 255, 2 ]
  },
  derribo: {
    m1: [ 127, 6 ],
    m2: [ 225, 1, 255, 4, 225, 2, 75, 8 ]
  },
  muerte: {
    m1: [ 127, 1 ],
    m2: [ 155, 3 ]
  },
  cuello: {
    m1: [ 0, 2, 127, 2 ],
    m2: [ 60, 2, 200, 4, 40, 2 ]
  },
  latido: {
    m2: [ 196, 4 ]
  },
  latidoCalmo: {
    m2: [ 148, 4 ]
  },
  camilla: {
    m1: [ 0, 1, 127, 1, 0, 118, 127, 2 ],
    m2: [ 85, 4, 50, 10, 40, 106, 125, 4 ]
  },
  arrastre: {
    m1: [ 0, 2, 127, 6, 0, 20, 127, 4, 0, 22, 127, 4 ],
    m2: [ 90, 14, 40, 12, 70, 14, 40, 12, 80, 20 ]
  },
  muereTortura: {
    m1: [ 127, 7, 0, 50, 127, 2 ],
    m2: [ 255, 4, 60, 10, 40, 12, 30, 28, 160, 4 ]
  },
  socom: {
    m1: [ 127, 1 ],
    m2: [ 150, 2 ]
  },
  socomSil: {
    m2: [ 90, 2 ]
  },
  famas: {
    m1: [ 127, 1 ],
    m2: [ 110, 1 ]
  },
  psg1: {
    m1: [ 127, 2 ],
    m2: [ 200, 2, 90, 4 ]
  },
  nikita: {
    m1: [ 0, 2, 127, 2 ],
    m2: [ 120, 3, 60, 6 ]
  },
  lanzar: {
    m2: [ 70, 2 ]
  },
  boton: {
    m1: [ 127, 1 ]
  },
  explosion: {
    m1: [ 127, 4 ],
    m2: [ 255, 4, 160, 6, 60, 8 ]
  },
  chaff: {
    m2: [ 90, 4 ]
  }
};

const FPS = 30, MS = 1e3 / FPS;

let ctxVib = {
  xr: () => null,
  manoArma: () => "right"
};

export function configurarVibracion(o) {
  Object.assign(ctxVib, o);
}

const actores = [];

let reloj = null, salidaAnt = {
  m1: 0,
  m2: 0
}, finCelular = 0;

const escalar = (d, k) => d.map((v, i) => i & 1 ? v : Math.round(v * k));

export function vibrar(patron, op = {}) {
  if (!vibraActiva()) return false;
  const p = typeof patron === "string" ? PATRONES[patron] : patron;
  if (!p) return false;
  const k = op.fuerza ?? 1;
  if (k <= .02) return false;
  for (const [motor, d] of [ [ 1, p.m1 ], [ 2, p.m2 ] ]) if (d?.length) actores.push({
    motor: motor,
    datos: k === 1 ? d : escalar(d, k),
    i: 0,
    timer: 0,
    inc: 0,
    mano: op.mano || null,
    pc: op.mando !== false,
    xr: op.xr !== false
  });
  if (op.celular !== false) {
    let cuadros = 0;
    for (const d of [ p.m1, p.m2 ]) if (d) {
      let c = 0, n = 0;
      for (let i = 0; i + 1 < d.length; i += 2) {
        c += d[i + 1];
        if (d[i]) n = c;
      }
      cuadros = Math.max(cuadros, n);
    }
    const ms = Math.round(cuadros * MS), ahora = performance.now();
    if (cuadros > 0 && ahora + ms > finCelular + 20 && celularPuede()) try {
      vibrarOriginal?.(ms);
      finCelular = ahora + ms;
    } catch {}
  }
  if (!reloj) reloj = setInterval(tick, MS);
  return true;
}

export function vibrarCuadro(v, op = {}) {
  return vibrar({
    m2: [ Math.max(0, Math.min(255, v | 0)), 2 ]
  }, op);
}

export function vibrarCuadros(n, op = {}) {
  return vibrar({
    m2: [ 200, Math.max(1, Math.round(n)) ]
  }, op);
}

function tick() {
  const suma = {
    pc: {
      m1: 0,
      m2: 0
    },
    left: {
      m1: 0,
      m2: 0
    },
    right: {
      m1: 0,
      m2: 0
    }
  };
  for (let j = actores.length - 1; j >= 0; j--) {
    const a = actores[j];
    if (a.timer <= 0) {
      if (a.i + 1 >= a.datos.length || !a.datos[a.i] && !a.datos[a.i + 1]) {
        actores.splice(j, 1);
        continue;
      }
      a.inc = a.datos[a.i];
      a.timer = a.datos[a.i + 1];
      a.i += 2;
    }
    a.timer--;
    const m = a.motor === 1 ? "m1" : "m2";
    if (a.pc) suma.pc[m] += a.inc;
    if (a.xr) {
      if (a.mano !== "right") suma.left[m] += a.inc;
      if (a.mano !== "left") suma.right[m] += a.inc;
    }
  }
  salida(suma);
  if (!actores.length) {
    clearInterval(reloj);
    reloj = null;
    salida({
      pc: {
        m1: 0,
        m2: 0
      },
      left: {
        m1: 0,
        m2: 0
      },
      right: {
        m1: 0,
        m2: 0
      }
    });
  }
}

function salida(s) {
  const m1 = s.pc.m1 ? 1 : 0, m2 = Math.min(255, s.pc.m2) / 255;
  const cambio = m1 !== salidaAnt.m1 || m2 !== salidaAnt.m2;
  if (m1 || m2 || cambio) for (const g of mandosCrudos()) {
    const v = g?.vibrationActuator;
    if (!v) continue;
    try {
      if (!m1 && !m2) {
        v.reset ? v.reset() : v.playEffect("dual-rumble", {
          duration: 0,
          strongMagnitude: 0,
          weakMagnitude: 0
        });
      } else v.playEffect("dual-rumble", {
        startDelay: 0,
        duration: Math.round(MS * 2),
        weakMagnitude: m1 * .8,
        strongMagnitude: m2
      })?.catch?.(() => {});
    } catch {}
  }
  salidaAnt = {
    m1: m1,
    m2: m2
  };
  let ses = null;
  try {
    ses = ctxVib.xr?.();
  } catch {}
  const kq = vibraQuest();
  if (ses?.inputSources && kq > 0) for (const src of ses.inputSources) {
    const h = src.gamepad?.hapticActuators?.[0], lado = s[src.handedness];
    if (!h || !lado) continue;
    const i = Math.max(Math.min(255, lado.m2) / 255, lado.m1 ? .35 : 0) * kq;
    if (i > 0) try {
      h.pulse(i, Math.round(MS + 8))?.catch?.(() => {});
    } catch {}
  }
}

function apagar() {
  actores.length = 0;
  for (const g of mandosCrudos()) try {
    g?.vibrationActuator?.reset?.();
  } catch {}
}

let vibrarOriginal = null;

const celularPuede = () => {
  try {
    return matchMedia("(pointer:coarse)").matches && nav.userActivation?.hasBeenActive !== false;
  } catch {
    return false;
  }
};

if (nav && typeof nav.vibrate === "function") {
  vibrarOriginal = nav.vibrate.bind(nav);
  try {
    Object.defineProperty(nav, "vibrate", {
      configurable: true,
      writable: true,
      value: function vibrate(p) {
        if (!vibraActiva()) return true;
        const ms = typeof p === "number" ? p : Array.isArray(p) ? p.reduce((a, v, i) => i & 1 ? a : a + (+v || 0), 0) : 0;
        if (ms > 0) vibrar({
          m2: [ 180, Math.max(1, Math.round(ms / MS)) ]
        }, {
          celular: false
        });
        try {
          return vibrarOriginal(p);
        } catch {
          return false;
        }
      }
    });
  } catch {}
}

const SE_VIB = {
  1: "socom",
  82: "socomSil",
  48: "famas",
  27: "psg1",
  44: "lanzar",
  49: "lanzar",
  50: "boton",
  4: "boton",
  41: "explosion",
  66: "chaff"
};

export function vibrarSE(id, arma, dist = 0) {
  let n = SE_VIB[id];
  if (id === 76) n = arma === 4 ? "stinger" : "nikita";
  if (!n) return false;
  if (n === "explosion" || n === "chaff") {
    const k = Math.max(0, 1 - dist / 25);
    return k > .08 && vibrar(n, {
      fuerza: k
    });
  }
  return vibrar(n, {
    mano: ctxVib.manoArma?.()
  });
}

export function vibrarDisparo(nombre = "socom") {
  return vibrar(nombre, {
    mano: ctxVib.manoArma?.()
  });
}

if (typeof window !== "undefined") window.__controles = {
  config: config,
  ACCIONES: ACCIONES,
  asignarTecla: asignarTecla,
  asignarBoton: asignarBoton,
  restaurar: restaurar,
  vibrar: vibrar,
  vibrarSE: vibrarSE,
  PATRONES: PATRONES,
  simular: f => {
    mandoPrueba = f;
  },
  get traduccion() {
    return traduccion;
  },
  get permutacion() {
    return permutacion;
  },
  actores: actores,
  detectarTipo: detectarTipo,
  tipoMando: tipoMando,
  ponerTipoMando: ponerTipoMando,
  nombresMando: nombresMando,
  nombreAccionMando: nombreAccionMando,
  tactil: tactil,
  ponerTactil: ponerTactil,
  restaurarTactil: restaurarTactil,
  quest: quest,
  ponerQuest: ponerQuest,
  asignarQuest: asignarQuest,
  accionQuest: accionQuest,
  mapaQuest: mapaQuest,
  restaurarQuest: restaurarQuest,
  ayudaQuest: ayudaQuest
};
