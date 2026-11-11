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

const datos = await fetch("assets/extras/sin_usar.json").then(r => r.ok ? r.json() : null).catch(() => null);

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

window.__sinUsar = {
  datos: datos,
  mostrar: mostrar
};
