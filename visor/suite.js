// MGS web — FeniXVOID · Project Ravenlight
"use strict";

const TEXTOS = {
  es: {
    portada: "PORTADA",
    clasif: "ARCHIVO CLASIFICADO · SOLO PERSONAL AUTORIZADO",
    bajada: "Elegí la misión. El juego arranca con su título y sus menús de PlayStation, tal cual.",
    jugar: "JUGAR",
    jugar_d: "La misión entera, desde el muelle hasta el final, con el título y las opciones del original.",
    vrmis: "VR MISSIONS",
    vrmis_d: "El entrenamiento de realidad virtual del disco: sigilo, armas y pruebas contra reloj.",
    escenarios: "ESCENARIOS",
    escenarios_d: "Recorré cada escenario a tu ritmo, con o sin guardias, caminando o en vuelo libre.",
    museo: "MUSEO",
    museo_d: "Una sala con los personajes, vehículos y jefes del juego, para caminarla entre ellos.",
    objetos: "OBJETOS",
    objetos_d: "Los modelos del disco uno por uno, para girarlos y mirarlos de cerca.",
    casco: "CASCO VR",
    casco_d: "Con un Meta Quest o un Pico: el juego, el códec y las cinemáticas alrededor tuyo.",
    n_esc: "escenarios",
    n_cine: "cinemáticas",
    n_mod: "modelos",
    n_disc: "discos",
    h_casco: "ENTRAR CON EL CASCO",
    casco_1: "Abrí esta misma página en el navegador del casco (Meta Quest Browser o Pico) y entrá con tu código.",
    casco_2: "Elegí <b>JUGAR</b> y tocá <b>ENTER VR</b>, abajo en la pantalla (o <b>Entrar a VR</b> en el menú). También funciona desde la PC con Quest Link, Air Link o Virtual Desktop.",
    casco_3: "En el menú del casco elegís cómo ver las cinemáticas: adentro de la escena o en una pantalla de cine.",
    casco_ir: "JUGAR EN EL CASCO ▶",
    pie: "Proyecto de fans, sin fines de lucro. Metal Gear Solid es una marca de Konami; este sitio no tiene relación con Konami.",
    online: "● EN LÍNEA",
    alert: "ALERT"
  },
  en: {
    portada: "HOME",
    clasif: "CLASSIFIED FILE · AUTHORIZED PERSONNEL ONLY",
    bajada: "Choose your mission. The game starts with its PlayStation title and menus, exactly as they were.",
    jugar: "PLAY",
    jugar_d: "The whole mission, from the dock to the end, with the original title and options.",
    vrmis: "VR MISSIONS",
    vrmis_d: "The disc’s virtual reality training: stealth, weapons and time trials.",
    escenarios: "AREAS",
    escenarios_d: "Walk every area at your own pace, with or without guards, on foot or flying free.",
    museo: "MUSEUM",
    museo_d: "A hall with the game’s characters, vehicles and bosses, to walk among them.",
    objetos: "OBJECTS",
    objetos_d: "The disc’s models one by one, to turn them around and look up close.",
    casco: "VR HEADSET",
    casco_d: "With a Meta Quest or a Pico: the game, the codec and the cutscenes all around you.",
    n_esc: "areas",
    n_cine: "cutscenes",
    n_mod: "models",
    n_disc: "discs",
    h_casco: "ENTER WITH THE HEADSET",
    casco_1: "Open this same page in the headset browser (Meta Quest Browser or Pico) and enter your code.",
    casco_2: "Choose <b>PLAY</b> and tap <b>ENTER VR</b> at the bottom of the screen (or <b>Entrar a VR</b> in the menu). It also works from the PC with Quest Link, Air Link or Virtual Desktop.",
    casco_3: "In the headset menu you choose how to watch cutscenes: inside the scene or on a cinema screen.",
    casco_ir: "PLAY IN THE HEADSET ▶",
    pie: "Non-profit fan project. Metal Gear Solid is a trademark of Konami; this site is not affiliated with Konami.",
    online: "● ONLINE",
    alert: "ALERT"
  }
};

const $ = s => document.querySelector(s);

const guardar = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch (e) {}
};

const leer = k => {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return null;
  }
};

const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

let idioma = leer("mgs_idioma") || ((navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en");

let alerta = 0;

function ponerIdioma(l) {
  idioma = TEXTOS[l] ? l : "es";
  document.documentElement.lang = idioma;
  for (const el of document.querySelectorAll("[data-t]")) el.innerHTML = TEXTOS[idioma][el.dataset.t] ?? "";
  for (const b of document.querySelectorAll("[data-lang]")) b.classList.toggle("activo", b.dataset.lang === idioma);
  pintarEstado();
}

function pintarEstado() {
  const el = $("#estado"), T = TEXTOS[idioma];
  el.className = "estado" + (alerta > 0 ? " alert" : "");
  el.textContent = alerta > 0 ? `${T.alert} ${alerta.toFixed(2).padStart(5, "0")}` : T.online;
}

if (location.pathname.startsWith("/full/")) $("#volver").hidden = false;

let audio = null;

const encender = () => {
  if (!audio) try {
    audio = new (window.AudioContext || window.webkitAudioContext);
  } catch (e) {
    audio = null;
  }
};

addEventListener("pointerdown", encender, {
  once: true
});

addEventListener("keydown", encender, {
  once: true
});

function tono(freq, dur, tipo = "square", vol = .05, cuando = 0) {
  if (!audio || audio.state !== "running") return;
  const t = audio.currentTime + cuando, o = audio.createOscillator(), g = audio.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur + .02);
}

const sonar = {
  mover: () => tono(1320, .05, "square", .035),
  exclama: () => {
    tono(1568, .12, "sawtooth", .06);
    tono(2093, .28, "sawtooth", .06, .1);
  }
};

function exclamar(el) {
  const a = $("#alerta"), r = el.getBoundingClientRect();
  a.style.left = r.left + r.width / 2 + "px";
  a.style.top = r.top + 20 + "px";
  a.classList.remove("ver");
  void a.offsetWidth;
  a.classList.add("ver");
  sonar.exclama();
  alerta = 4;
}

function azar(s) {
  return () => {
    s |= 0;
    s = s + 1831565813 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const mundo = (() => {
  const r = azar(14085), ancho = 90, alto = 60, bloques = [], guardias = [];
  for (let k = 0; k < 160 && bloques.length < 26; k++) {
    const w = 3 + r() * 9, h = 3 + r() * 9, x = 2 + r() * (ancho - w - 4), y = 2 + r() * (alto - h - 4);
    if (bloques.every(b => x > b.x + b.w + 2.5 || x + w + 2.5 < b.x || y > b.y + b.h + 2.5 || y + h + 2.5 < b.y)) bloques.push({
      x: x,
      y: y,
      w: w,
      h: h
    });
  }
  for (let g = 0; g < 9; g++) {
    const pts = [];
    for (let p = 0; p < 2 + (r() * 2 | 0); p++) pts.push([ 3 + r() * (ancho - 6), 3 + r() * (alto - 6) ]);
    guardias.push({
      pts: pts,
      tramo: 0,
      t: r(),
      pausa: 0,
      vel: 2 + r() * 1.5,
      mira: 0,
      x: pts[0][0],
      y: pts[0][1]
    });
  }
  return {
    ancho: ancho,
    alto: alto,
    bloques: bloques,
    guardias: guardias
  };
})();

function moverGuardias(dt) {
  for (const g of mundo.guardias) {
    if (g.pausa > 0) {
      g.pausa -= dt;
      g.mira += Math.sin(g.pausa * 3) * dt * 1.5;
      continue;
    }
    const a = g.pts[g.tramo], b = g.pts[(g.tramo + 1) % g.pts.length], largo = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    g.t += g.vel * dt / largo;
    if (g.t >= 1) {
      g.t = 0;
      g.tramo = (g.tramo + 1) % g.pts.length;
      g.pausa = 1.2 + Math.random() * 1.5;
      continue;
    }
    g.x = a[0] + (b[0] - a[0]) * g.t;
    g.y = a[1] + (b[1] - a[1]) * g.t;
    g.mira = Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
}

function dibujar() {
  const cv = $("#fondo"), dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  const cx = cv.getContext("2d");
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const esc = Math.max(W / mundo.ancho, H / mundo.alto), ox = (W - mundo.ancho * esc) / 2, oy = (H - mundo.alto * esc) / 2;
  const P = (x, y) => [ ox + x * esc, oy + y * esc ];
  cx.fillStyle = "#020604";
  cx.fillRect(0, 0, W, H);
  const color = alerta > 0 ? "#ff5a5a" : "#5ef08a";
  for (const b of mundo.bloques) {
    const [x, y] = P(b.x, b.y);
    cx.fillStyle = "rgba(18,80,40,0.55)";
    cx.fillRect(x, y, b.w * esc, b.h * esc);
    cx.strokeStyle = color;
    cx.strokeRect(x, y, b.w * esc, b.h * esc);
  }
  for (const g of mundo.guardias) {
    const [x, y] = P(g.x, g.y);
    cx.fillStyle = alerta > 0 ? "rgba(255,90,90,0.25)" : "rgba(150,230,255,0.22)";
    cx.beginPath();
    cx.moveTo(x, y);
    cx.arc(x, y, 9 * esc, g.mira - .42, g.mira + .42);
    cx.closePath();
    cx.fill();
    cx.fillStyle = "#ff3030";
    cx.beginPath();
    cx.arc(x, y, Math.max(2.5, esc * .55), 0, 7);
    cx.fill();
  }
}

let antes = performance.now();

function cuadro(ahora) {
  const dt = Math.min(.1, (ahora - antes) / 1e3);
  antes = ahora;
  if (!document.hidden) {
    if (!quieto) moverGuardias(dt);
    dibujar();
    if (alerta > 0) {
      alerta = Math.max(0, alerta - dt);
      pintarEstado();
    }
  }
  requestAnimationFrame(cuadro);
}

requestAnimationFrame(cuadro);

const items = [ ...document.querySelectorAll("#misiones a") ];

let sel = 0;

function elegir(i, conSonido) {
  if (i === sel && items[i].classList.contains("sel")) return;
  items.forEach((a, k) => a.classList.toggle("sel", k === i));
  sel = i;
  if (conSonido) sonar.mover();
}

const columnas = () => getComputedStyle($("#misiones")).gridTemplateColumns.split(" ").length;

items.forEach((a, i) => {
  a.addEventListener("mouseenter", () => elegir(i, true));
  a.addEventListener("focus", () => elegir(i, false));
  a.addEventListener("click", e => {
    exclamar(a);
    if (a.getAttribute("href").startsWith("#") || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault();
    setTimeout(() => {
      location.href = a.href;
    }, quieto ? 0 : 450);
  });
});

function mover(dx, dy) {
  const c = columnas();
  let i = sel + dx + dy * c;
  if (i < 0 || i >= items.length) return;
  elegir(i, true);
  items[i].focus({
    preventScroll: true
  });
  items[i].scrollIntoView({
    block: "nearest",
    behavior: quieto ? "auto" : "smooth"
  });
}

addEventListener("keydown", e => {
  const k = {
    ArrowLeft: [ -1, 0 ],
    ArrowRight: [ 1, 0 ],
    ArrowUp: [ 0, -1 ],
    ArrowDown: [ 0, 1 ]
  }[e.key];
  if (k) {
    e.preventDefault();
    mover(...k);
  } else if (e.key === "Enter" && document.activeElement === document.body) items[sel].click();
});

let antesPad = {};

(function leerPad() {
  const p = navigator.getGamepads ? [ ...navigator.getGamepads() ].find(Boolean) : null;
  if (p) {
    const ahora = {
      izq: p.buttons[14]?.pressed || p.axes[0] < -.6,
      der: p.buttons[15]?.pressed || p.axes[0] > .6,
      arr: p.buttons[12]?.pressed || p.axes[1] < -.6,
      aba: p.buttons[13]?.pressed || p.axes[1] > .6,
      ok: p.buttons[0]?.pressed
    };
    if (ahora.izq && !antesPad.izq) mover(-1, 0);
    if (ahora.der && !antesPad.der) mover(1, 0);
    if (ahora.arr && !antesPad.arr) mover(0, -1);
    if (ahora.aba && !antesPad.aba) mover(0, 1);
    if (ahora.ok && !antesPad.ok) items[sel].click();
    antesPad = ahora;
  }
  requestAnimationFrame(leerPad);
})();

elegir(0, false);

for (const b of document.querySelectorAll("[data-lang]")) b.addEventListener("click", () => {
  guardar("mgs_idioma", b.dataset.lang);
  ponerIdioma(b.dataset.lang);
});

ponerIdioma(idioma);
