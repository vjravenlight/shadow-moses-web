// MGS web — FeniXVOID · Project Ravenlight
import { ALMACEN } from "./partida.js";

export const MAX_FOTOS = 16;

export const ANCHO_FOTO = 288, ALTO_FOTO = 176;

const clave = () => ALMACEN.prefijo + "mgs_fotos";

export function leerFotos() {
  try {
    const l = JSON.parse(localStorage.getItem(clave()) || "[]");
    return Array.isArray(l) ? l.filter(f => f && typeof f.img === "string") : [];
  } catch {
    return [];
  }
}

export function guardarFotos(lista) {
  while (lista.length) {
    try {
      localStorage.setItem(clave(), JSON.stringify(lista));
      return true;
    } catch {
      lista.shift();
    }
  }
  try {
    localStorage.removeItem(clave());
  } catch {}
  return false;
}

export function numeroLibre(lista) {
  for (let n = 1; n <= MAX_FOTOS; n++) if (!lista.some(f => f.n === n)) return n;
  return 0;
}

export function agregarFoto(lista, datos) {
  if (lista.length >= MAX_FOTOS) lista.shift();
  const f = {
    n: numeroLibre(lista) || 1,
    nombre: "",
    ajuste: [ 0, 0, 0 ],
    fantasma: 0,
    ...datos
  };
  lista.push(f);
  guardarFotos(lista);
  return f;
}

export function recortarFoto(img, calidad = .82) {
  const c = document.createElement("canvas");
  c.width = ANCHO_FOTO;
  c.height = ALTO_FOTO;
  const w = img.width, h = img.height, k = Math.min(w / ANCHO_FOTO, h / ALTO_FOTO), sw = ANCHO_FOTO * k, sh = ALTO_FOTO * k;
  c.getContext("2d").drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, ANCHO_FOTO, ALTO_FOTO);
  return c.toDataURL("image/jpeg", calidad);
}

export function puntoEnCuadro(ndc) {
  return !!ndc && ndc.z > 0 && Math.abs(ndc.x) <= 192 / 160 && Math.abs(ndc.y) <= 152 / 112;
}
