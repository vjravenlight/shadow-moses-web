// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $ = s => document.querySelector(s);

const cv = $("#cv");

const R = new THREE.WebGLRenderer({
  canvas: cv,
  antialias: true,
  preserveDrawingBuffer: true
});

R.setPixelRatio(Math.min(2, devicePixelRatio));

R.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene;

const cam = new THREE.PerspectiveCamera(40, 1, .01, 500);

const ctl = new OrbitControls(cam, cv);

ctl.enableDamping = true;

ctl.autoRotate = true;

ctl.autoRotateSpeed = 1.6;

const piso = new THREE.GridHelper(4, 16, 2050604, 860180);

escena.add(piso);

const loader = new GLTFLoader;

const cache = new Map;

function preparar(o) {
  o.traverse(m => {
    if (!m.isMesh) return;
    for (const mt of [].concat(m.material)) {
      const b = new THREE.MeshBasicMaterial({
        map: mt.map || null,
        color: mt.color || 16777215,
        vertexColors: !!m.geometry.attributes.color,
        side: THREE.DoubleSide,
        alphaTest: .5,
        transparent: !!mt.transparent
      });
      if (b.map) {
        b.map.magFilter = THREE.NearestFilter;
        b.map.colorSpace = THREE.SRGBColorSpace;
      }
      if (m.geometry.attributes.color) b.color.setScalar(2);
      m.material = b;
    }
  });
  return o;
}

function cargar(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync("assets/" + url).then(g => preparar(g.scene)).catch(() => null));
  return cache.get(url);
}

let actual = null;

function encuadrar(o) {
  const box = (new THREE.Box3).setFromObject(o), c = box.getCenter(new THREE.Vector3), s = box.getSize(new THREE.Vector3);
  const r = Math.max(.05, s.length() / 2);
  o.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  piso.scale.setScalar(Math.max(.25, r));
  cam.near = r / 100;
  cam.far = r * 100;
  cam.updateProjectionMatrix();
  cam.position.set(r * 1.6, r * 1.1, r * 1.9);
  ctl.target.set(0, s.y / 2, 0);
  ctl.update();
}

async function mostrar(m, i) {
  const o = await cargar(m.archivo);
  if (actual) escena.remove(actual);
  actual = o ? o.clone() : null;
  if (actual) {
    escena.add(actual);
    encuadrar(actual);
  }
  document.querySelectorAll(".tarjeta").forEach((t, k) => t.classList.toggle("sel", k === i));
  $("#ficha").innerHTML = `<b>${m.nombre}</b> · código #${m.codigo} · ${m.categoria} · ${m.piezas ?? "?"} pieza(s), ${m.caras ?? "?"} caras · ${(m.ancho ?? 0).toFixed(2)} × ${(m.alto ?? 0).toFixed(2)} m<br>` + `Está en el caché de: ${(m.escenarios || []).join(", ")}. Ningún guion, cinemática ni código del juego lo nombra.` + (o ? "" : " (sin modelo exportado)");
}

function tamano() {
  const r = cv.getBoundingClientRect();
  R.setSize(r.width, r.height, false);
  cam.aspect = r.width / Math.max(1, r.height);
  cam.updateProjectionMatrix();
}

addEventListener("resize", tamano);

async function foto(m, lienzo) {
  const o = await cargar(m.archivo);
  if (!o) return;
  const c = o.clone(), antes = actual;
  if (antes) antes.visible = false;
  escena.add(c);
  encuadrar(c);
  ctl.update();
  R.render(escena, cam);
  const g = lienzo.getContext("2d");
  g.drawImage(R.domElement, 0, 0, lienzo.width, lienzo.height);
  escena.remove(c);
  if (antes) {
    antes.visible = true;
    encuadrar(antes);
  }
}

let codec = null, son = null, sonando = null;

async function prepararAudio() {
  if (codec) return codec;
  const [{Codec: Codec}, {Guion: Guion}, {sonido: sonido}] = await Promise.all([ import("./codec.js"), import("./codec_gcl.js"), import("./sonido.js") ]);
  son = sonido;
  await sonido.iniciar();
  codec = new Codec({
    guion: new Guion({}),
    audioCtx: () => sonido.ctx,
    se: id => sonido.se(id),
    musica: c => sonido.codigo(c),
    alCerrar: () => marcar(null)
  });
  await codec.cargar();
  let ant = performance.now();
  const bucle = t => {
    codec.update(Math.min(.25, (t - ant) / 1e3));
    ant = t;
    requestAnimationFrame(bucle);
  };
  requestAnimationFrame(bucle);
  window.__sinUsar.codec = codec;
  return codec;
}

function marcar(el) {
  if (sonando) sonando.classList.remove("suena");
  sonando = el;
  if (el) el.classList.add("suena");
}

function callar() {
  try {
    codec?.pararVozJuego();
  } catch {}
  try {
    son?.cancion(0);
  } catch {}
}

const freqTxt = f => (f / 100).toFixed(2);

async function escucharLlamada(c, el) {
  await prepararAudio();
  if (codec.abierto) return;
  callar();
  marcar(el);
  codec.llamadaEntrante(c.freq, c.code, 1);
}

async function escucharVoz(v, el) {
  await prepararAudio();
  if (codec.abierto) return;
  callar();
  marcar(el);
  const ok = await codec.reproducirVoz(v.id, {
    subtitulos: !v.japones
  });
  if (sonando === el) marcar(null);
  if (!ok) el.querySelector(".t")?.append(" (no se encontró el audio: python tools/sin_usar_export.py)");
}

async function tocarMusica(m, el, b) {
  await prepararAudio();
  if (sonando === el) {
    callar();
    marcar(null);
    b.textContent = "▶ TOCAR";
    return;
  }
  callar();
  document.querySelectorAll("#musica button").forEach(x => {
    x.textContent = "▶ TOCAR";
  });
  marcar(el);
  b.textContent = "■ PARAR";
  son.codigo(33554178);
  await son.cargarEscenario(m.st);
  if (sonando !== el) return;
  son.cancion(0);
  son.cancion(m.n);
}

function tarjeta(clase, partes) {
  const d = document.createElement("div");
  d.className = clase;
  for (const [tag, cl, txt] of partes) {
    if (txt == null || txt === "") continue;
    const e = document.createElement(tag);
    if (cl) e.className = cl;
    e.textContent = txt;
    d.append(e);
  }
  return d;
}

function armarSonido(datos) {
  if (!datos?.llamadas && !datos?.voces) return;
  $("#sonido").hidden = false;
  const C = datos.cuenta || {};
  const ll = datos.llamadas || [];
  $("#nota-llamadas").textContent = `${ll.length} de las ${C.llamadas} llamadas de RADIO.DAT no las hace ningún guion de los dos discos (ni sus procs ni sus trampas): ` + `nadie las pone en una frecuencia (radio -b/-o) ni las dispara (radio -c). Se escuchan en el códec, con sus caras y subtítulos. ` + `Las que no tienen voz en el disco avanzan con ○ / Enter.`;
  for (const c of ll) {
    const el = tarjeta("doc", []);
    const cab = document.createElement("div");
    cab.className = "cab";
    const b = document.createElement("b");
    b.textContent = `${freqTxt(c.freq)} · ${c.quien.join(", ")}`;
    cab.append(b);
    const s = document.createElement("span");
    s.textContent = c.seg ? `${c.seg} s` : `${c.lineas} línea(s)`;
    cab.append(s);
    el.append(cab);
    for (const t of c.texto) {
      const p = document.createElement("div");
      p.className = "linea";
      p.textContent = "“" + t.replace(/#N|\|/g, "\n") + "”";
      el.append(p);
    }
    const extra = [];
    if (c.otra_version_de?.length) extra.push(`Otra versión de una llamada que sí se usa (${c.otra_version_de.join(", ")}).`);
    if (c.duda) extra.push("Dudosa: " + c.duda + ".");
    for (const x of extra) {
      const p = document.createElement("div");
      p.className = x.startsWith("Dudosa") ? "duda" : "linea";
      p.textContent = x;
      el.append(p);
    }
    const i = document.createElement("i");
    i.textContent = `RADIO.DAT byte ${c.off} · code ${c.code}`;
    el.append(i);
    const bt = document.createElement("button");
    bt.textContent = "▶ ESCUCHAR EN EL CODEC";
    bt.onclick = () => escucharLlamada(c, el);
    el.append(bt);
    $("#llamadas").append(el);
  }
  const vs = datos.voces || [];
  const seguras = vs.filter(v => !v.duda), dudosas = vs.filter(v => v.duda);
  $("#nota-voces").textContent = `${vs.length} voces de VOX.DAT (de ${C.streams} en los dos discos) sólo figuran en la tabla del SOUND TEST: ninguna llamada usada, ` + `ningún sound -v/-g, ningún actor ni el código las piden. ${seguras.length} seguras y ${dudosas.length} dudosas (en amarillo). ` + `${C.solo_llamadas_sin_usar || 0} más sólo las usan las llamadas sin usar de arriba. Un clic para escuchar.`;
  const filtros = [ [ "TODAS", () => true ], [ "SEGURAS", v => !v.duda ], [ "DUDOSAS", v => !!v.duda ], [ "DISCO 1", v => v.discos.includes(1) ], [ "DISCO 2", v => v.discos.includes(2) ] ];
  const pintar = f => {
    $("#voces").textContent = "";
    for (const v of vs.filter(f)) {
      const el = tarjeta("voz", [ [ "b", "", `${v.nombre} · ${v.seg.toFixed(1)} s · disco ${v.discos.join(" y ")}` ], [ "div", "t", v.texto.length ? "“" + v.texto.join(" ") + "”" : v.japones ? "(subtítulo con letras japonesas)" : "(sin subtítulo)" ], [ "div", "duda", v.duda ? "Dudosa: " + v.duda : null ] ]);
      el.title = `VOX.DAT disco ${v.disco}, sector ${v.sector}`;
      el.onclick = () => escucharVoz(v, el);
      $("#voces").append(el);
    }
  };
  for (const [n, f] of filtros) {
    const b = document.createElement("button");
    b.textContent = n;
    b.onclick = () => {
      document.querySelectorAll("#filtro-voces button").forEach(x => x.classList.toggle("sel", x === b));
      pintar(f);
    };
    $("#filtro-voces").append(b);
  }
  $("#filtro-voces button").classList.add("sel");
  pintar(() => true);
  const mu = datos.musica || [];
  $("#nota-musica").textContent = mu.length ? `${mu.length} de las ${C.canciones} canciones de los .mdx de los escenarios no las pide ningún guion que carga ese .mdx ` + `(sound -b/-s/-x) ni el código del escenario. Son dudosas: un actor puede pedir una canción por su número.` : "Todas las canciones las pide algún guion.";
  for (const m of mu) {
    const el = tarjeta("doc", [ [ "b", "", `${m.mdx}.mdx · canción ${m.n}` ], [ "div", "linea", `Escenarios: ${m.escenarios.join(", ")}. Los guiones piden ${m.pedidas.join(", ") || "ninguna"}.` ], [ "div", "duda", "Dudosa: " + m.duda + "." ] ]);
    const b = document.createElement("button");
    b.textContent = "▶ TOCAR";
    b.onclick = () => tocarMusica(m, el, b);
    el.append(b);
    $("#musica").append(el);
  }
  $("#criterio").innerHTML = "";
  for (const t of [ `LLAMADAS: se leyeron todos los guiones de los dos discos (scenerio.gcx y demo.gcx) con sus procs y trampas. Las llamadas sólo salen de ahí (radio -b/-o/-c; el código del juego no llama solo). Ningún radio tiene el número calculado (${C.calculados || 0}), y el número de las sin usar no aparece en el código de máquina (ejecutable y overlays). Dudosas: las que el Integral sí hace.`, `VOCES: cuenta como usada toda voz que nombre una llamada usada, un sound -v/-g, un parámetro de un actor (chara -v, -s, -t…) o el BRIEFING. Lo que queda sólo está en la tabla del SOUND TEST. Dudosas: las que coinciden con un número de las salas de VR TRAINING, las que tienen la misma frase que una voz usada (copia) y las que tienen el número en el código de máquina (puede ser casualidad).`, `CINEMATICAS: las ${116} de DEMO.DAT las nombra algún demo: ninguna sin usar.`, "Detalle: docs/sin_usar.md." ]) {
    const p = document.createElement("p");
    p.textContent = t;
    $("#criterio").append(p);
  }
}

const datos = await fetch("assets/extras/sin_usar.json").then(r => r.ok ? r.json() : null).catch(() => null);

window.__sinUsar = {
  datos: datos
};

try {
  armarSonido(datos);
} catch (e) {
  console.warn("sin usar: sonido", e);
}

if (!datos) $("#intro").textContent = "Faltan los datos (python tools/sin_usar_export.py)."; else {
  const C = datos.cuenta || {};
  $("#intro").textContent = `${C.sin_usar} de los ${C.catalogo} modelos del catálogo no aparecen en ninguno de los ${C.guiones} guiones de los dos discos, en ninguna cinemática ni en el código del juego (${C.fuentes_c} archivos del decomp, ensamblador y Ghidra). Están en el disco, en el caché de esos escenarios, pero el juego no los muestra. Barrido conservador: las familias de modelos numerados y las salas de VR TRAINING (sin código) quedan afuera.`;
  tamano();
  const lista = $("#modelos");
  datos.modelos.forEach((m, i) => {
    const t = document.createElement("div");
    t.className = "tarjeta";
    const l = document.createElement("canvas");
    l.width = 240;
    l.height = 180;
    t.innerHTML = "";
    t.append(l);
    const n = document.createElement("div");
    n.className = "n";
    n.textContent = m.nombre;
    t.append(n);
    const d = document.createElement("div");
    d.className = "d";
    d.textContent = `${m.categoria} · ${(m.escenarios || []).slice(0, 3).join(", ")}`;
    t.append(d);
    t.onclick = () => mostrar(m, i);
    lista.append(t);
  });
  for (let i = 0; i < datos.modelos.length; i++) await foto(datos.modelos[i], lista.children[i].querySelector("canvas"));
  if (datos.modelos.length) await mostrar(datos.modelos[0], 0);
  const docs = $("#docs");
  for (const x of datos.documentado || []) {
    const d = document.createElement("div");
    d.className = "doc";
    const b = document.createElement("b");
    b.textContent = x.titulo;
    d.append(b);
    const p = document.createElement("div");
    p.textContent = x.texto;
    d.append(p);
    if (x.imagenes?.length) {
      const f = document.createElement("div");
      f.className = "fotos";
      for (const u of x.imagenes) {
        const im = new Image;
        im.src = "assets/" + u;
        im.alt = x.titulo;
        f.append(im);
      }
      d.append(f);
    }
    const i = document.createElement("i");
    i.textContent = "Fuente: " + x.fuente;
    d.append(i);
    docs.append(d);
  }
}

R.setAnimationLoop(() => {
  ctl.update();
  R.render(escena, cam);
});

Object.assign(window.__sinUsar, {
  mostrar: mostrar,
  escucharLlamada: escucharLlamada,
  escucharVoz: escucharVoz,
  tocarMusica: tocarMusica,
  prepararAudio: prepararAudio
});
