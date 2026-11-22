// MGS web — FeniXVOID · Project Ravenlight
import { PAD } from "./inventario.js";

export const CLAVE_PERSONAJE = "sm_personaje";

export const TRAJES = [ {
  id: "ninja",
  nombre: "Ninja",
  casco: "NINJA",
  modelo: "vr/disco/comun/ninja_vr.glb"
}, {
  id: "ninja_rojo",
  nombre: "Ninja rojo",
  casco: "NINJA ROJO",
  modelo: "modelos/s03c_9401.glb"
}, {
  id: "ninja_rex",
  nombre: "Ninja dañado",
  casco: "NINJA DAÑADO",
  modelo: "modelos/s17a_dc74.glb",
  "cañon": true
}, {
  id: "ninja_rex_rojo",
  nombre: "Ninja dañado rojo",
  casco: "NINJA DAÑADO ROJO",
  modelo: "modelos/s17ar_dc74.glb",
  "cañon": true
}, {
  id: "ninja_brazo",
  nombre: "Ninja sin brazo",
  casco: "NINJA SIN BRAZO",
  modelo: "modelos/s17a_7571.glb",
  "cañon": true
}, {
  id: "ninja_brazo_rojo",
  nombre: "Ninja sin brazo rojo",
  casco: "NINJA SIN BRAZO ROJO",
  modelo: "modelos/s17ar_7571.glb",
  "cañon": true
} ];

export const MODELO_NINJA = TRAJES[0].modelo;

const ES_SNAKE = /(^|\/)(snake|sne_nude|init_tux_snake)\.glb$/i;

export const MASCARA_NINJA = PAD.R1 | PAD.R2 | PAD.L1;

export const PAD_NINJA = {
  r1: PAD.R1,
  r2: PAD.R2,
  l1: PAD.L1
};

function leer() {
  try {
    return localStorage.getItem(CLAVE_PERSONAJE) || "snake";
  } catch {
    return "snake";
  }
}

export function trajeNinja() {
  const v = leer();
  return TRAJES.find(t => t.id === v) || null;
}

export function personajeNinja() {
  return !!trajeNinja();
}

export function nombrePersonaje(casco = false) {
  const t = trajeNinja();
  return t ? casco ? t.casco.replace("Ñ", "N") : t.nombre : casco ? "SNAKE" : "Snake";
}

export function ponerPersonaje(p) {
  const t = TRAJES.find(x => x.id === p) || null;
  try {
    localStorage.setItem(CLAVE_PERSONAJE, t ? t.id : "snake");
  } catch {}
  try {
    dispatchEvent(new CustomEvent("mgs:opcion", {
      detail: {
        clave: "personaje",
        valor: t ? t.id : "snake"
      }
    }));
  } catch {}
  return t;
}

export function rotarPersonaje(d = 1) {
  const ids = [ "snake", ...TRAJES.map(t => t.id) ], i = Math.max(0, ids.indexOf(trajeNinja()?.id || "snake"));
  return ponerPersonaje(ids[(i + d + ids.length) % ids.length]);
}

export function modeloDemo(url) {
  const t = trajeNinja();
  return t && typeof url === "string" && ES_SNAKE.test(url) ? t.modelo : url;
}

export const MASCARA_NINJA_VR = PAD.L1 | PAD.R1 | PAD.L2 | PAD.R2;

export function textoNinjaAccion(id, esc = true) {
  const t = {
    cruz: "voltereta (también quieto)",
    circulo: "guardia (mantener); al soltar, tajo" + (esc ? " · también acciona ascensores y escaleras (extra)" : ""),
    cuadrado: "quieto: estocada · corriendo: tajo en carrera",
    triangulo: "primera persona (mantener; no ataca)",
    l1: "camuflaje óptico (prende / apaga) · en primera persona, asomarse",
    r1: "descarga eléctrica (mantener) · en primera persona, asomarse",
    l2: esc ? "ítems de Snake: tarjetas, raciones (extra)" : "nada (menú deshabilitado)",
    r2: esc ? "el rayo del brazo (extra)" : "nada (menú deshabilitado)",
    select: esc ? "códec (extra)" : "nada",
    caminar: "caminar (extra: el Ninja siempre corre)"
  }[id];
  return t ? "Con el Ninja: " + t : "";
}

export function textoNinjaQuest(id, esc = true) {
  const t = {
    cuadrado: "estocada / tajo en carrera",
    circulo: "guardia; al soltar, tajo",
    cruz: "voltereta",
    triangulo: esc ? "agacharse / cuerpo a tierra (extra)" : "nada",
    L2: esc ? "ítems (extra)" : "nada",
    R2: esc ? "el rayo del brazo (extra)" : "nada",
    R1: "descarga eléctrica (mantener)",
    L1: "camuflaje óptico",
    select: esc ? "códec (extra)" : "nada"
  }[id];
  return t ? "Con el Ninja: " + t : "";
}

export function ayudaNinja(botonQuestDe = () => null, tactil = false, esc = true) {
  if (tactil) return "NINJA: GOLPE (○) guardia, al soltar tajo · ESPADA (□) estocada / tajo en carrera · VOLTERETA (✕) · DESCARGA (R1, mantener) · CAMUFLAJE (L1) · VISTA (△) primera persona" + (esc ? " · extras: AGACHAR (agacharse y cuerpo a tierra, para los ductos) · RAYO (R2) el arma del brazo · ÍTEMS (L2) tarjetas y raciones" : "");
  return "NINJA: ○ (G) guardia, al soltar tajo · □ (J) quieto estocada, corriendo tajo en carrera · ✕ (C) voltereta · R1 (2) descarga eléctrica (mantener) · L1 (1) camuflaje · △ (E) primera persona (ahí L1/R1 asoman)" + (esc ? " · extras: Q o L3 agacharse / cuerpo a tierra · R2 (X) el rayo del brazo · L2 (Z) ítems · Shift caminar · las armas de Snake no se usan" : " · L2 y R2 no hacen nada (como en el disco)");
}

export function ayudaNinjaQuest(botonQuestDe = () => null, esc = true) {
  const b = (a, d) => String(botonQuestDe(a) || d).replace(/\.$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const l = [ "NINJA:", `${b("circulo", "A")}: GUARDIA, AL SOLTAR TAJO`, `${b("cuadrado", "GATILLO DER")}: ESTOCADA / TAJO`, `${b("cruz", "B")}: VOLTERETA`, `${b("R1", "CLIC PALANCA DER")}: DESCARGA (MANTENER)`, "GATILLO LIBRE (DE FABRICA EL IZQ): CAMUFLAJE" ];
  if (esc) l.push(`${b("triangulo", "X")}: AGACHARSE (EXTRA; EN PANTALLA, UN TOQUE)`, `${b("R2", "APRETON DER")}: EL RAYO DEL BRAZO (EXTRA)`);
  return l;
}
