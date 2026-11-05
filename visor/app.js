// MGS web — FeniXVOID · Project Ravenlight
import * as debug from "./debug.js";

import * as ctl from "./controles.js";

import { pantallaControles, NavMando, FlancosMando, textoAyuda } from "./controles_ui.js";

import * as THREE from "three";

import { texturasPixel } from "./texturas_pixel.js";

import { FiltroPantalla, NOMBRES_FILTRO } from "./filtro_pantalla.js";

import { LuzModerna } from "./luz_moderna.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { VRButton } from "three/addons/webxr/VRButton.js";

import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

import { XRHandModelFactory } from "three/addons/webxr/XRHandModelFactory.js";

import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

import { NOMBRES, ESCENARIOS_ES, MUSEO, MUSEO_GRANDES } from "./nombres.js";

import { cargarAnims, clip } from "./anim.js";

import { Juego, sonido, sfx } from "./juego.js";

import { sonido as audioMGS, SE } from "./sonido.js";

import { Hud } from "./hud.js";

import { Interfaz } from "./interfaz.js";

import { Tactil } from "./tactil.js";

import { GameOver } from "./gameover.js";

import { Titulo } from "./titulo.js";

import { Dinamicos } from "./nivel.js";

import { VistaAgua, zonasAguaDe } from "./agua.js";

import { Sensores } from "./sensores.js";

import { CamaraJuego, carasPS1, asomarse } from "./camara_juego.js";

import { Inventario, WP, IT } from "./inventario.js";

import { Armas } from "./armas.js";

import { crearJefe, forzarJefes, esJefe, crearJefesEntrada } from "./jefes/jefes.js";

import { crearZako, esZako, zakosAlEntrar, mensajeZako, deLaEntrada } from "./zako.js";

import { botonMandoVR } from "./personajes/mando.js";

import { crearMeryl, esMeryl, destruirMeryl } from "./personajes/meryl.js";

import { VRMisiones } from "./vrmisiones.js";

import { MuseoVR } from "./museo_vr.js";

import { Demo, cargarCadenas, reproducirPasos } from "./demo.js";

import { Escena10A, Despertar, camaraEscena } from "./paddemo.js";

const escena10A = new Escena10A, despertar = new Despertar;

import { prepararCuerpo, animarCuerpo, velSnake, crearBrillos, actualizarBrillos, sombraU, recibirSombra, Sombras, luzDePersonaje, ocultarCuerpo, precalentar } from "./cuerpo.js";

import { Codec } from "./codec.js";

import { Guion, HASH } from "./codec_gcl.js";

import { Partida, LV } from "./partida.js";

import { PartidaUI } from "./partida_ui.js";

import { PantallaRango } from "./rango.js";

import { VRPaneles, MAPA_XR } from "./vr_paneles.js";

import { CamaraLibre, sacarFoto, descargar } from "./camara_libre.js";

import { REND, unirMallas, cullingPersonajes, prepararPersonajes, parcheAtlas, ordenOpaco, unirSiempre, texturasQueCorren } from "./rendimiento.js";

import { registrarCargador } from "./cargador.js";

import { GuionVivo, manejadorMensajes, efectosPorDefecto, sonidoPorDefecto, paredDinamica, ascensorConGuardia, estadoSnake, dirDesdeYaw, TIPOS_VISOR, TIPOS_SENSOR, ESTADO } from "./guion_vivo.js";

import { manejadorMensajesExtra, TIPOS_GUION } from "./actores_guion.js";

import { ducto } from "./ducto.js";

import { iniciarMotion, cuadroMotion, moverMotion, finMotion, ALTO_CONTROL } from "./escaleras.js";

import { PadDemo, BOTON, DemoCancel, LifeUp, Movie, EscenaPendiente } from "./paddemo.js";

import { ManosSnake } from "./manos_snake.js";

import { VentanaMiraVR } from "./ventana_mira_vr.js";

import { MiraArma } from "./mira_armas.js";

import { antiparrasVR } from "./antiparras_vr.js";

import { MiraScope } from "./mira_scope.js";

import { ESCENARIOS as MAPAS_EXCL, MapasExclusivos, zonasDelMapa } from "./mapas_excl.js";

const pantallaGameOver = new GameOver;

pantallaGameOver.se = id => audioMGS.se(id);

const titulo = new Titulo({
  contenedor: document.body,
  sonido: audioMGS
});

let sonidoOn = (() => {
  try {
    return localStorage.getItem("sm_sonido") !== "0";
  } catch {
    return true;
  }
})();

for (const ev of [ "pointerdown", "keydown" ]) addEventListener(ev, () => {
  if (sonidoOn) audioMGS.iniciar();
}, {
  capture: true
});

const SE_PEGAR = "pegar";

const SE_DE = {
  pegar: 7,
  paso_i: SE.PASO_I,
  paso_d: SE.PASO_D,
  "!": SE.SORPRESA,
  socom: SE.SOCOM,
  vacio: SE.SIN_BALAS,
  recarga: SE.RECARGA,
  golpe: SE.PIÑA,
  cuello: SE.CAE,
  toc: SE.PARED,
  item: SE.ITEM,
  tiro: SE.DISPARO_E2,
  "daño": SE.DAÑO1,
  cae: SE.CAE,
  impacto: SE.BALA_PEGA,
  v_quien: 128,
  v_aca: 129,
  v_ahi: 130,
  v_donde: 132,
  v_vuelvan: 133,
  v_nada: 134,
  v_ruido: 135,
  v_huh: 136,
  v_movio: 137,
  "v_piña": 141,
  v_tirado: 142,
  v_agarrado: 143,
  v_cuello: 144,
  v_muere: 145,
  v_bosteza: 146,
  v_ronca: 147,
  v_estornudo: 148,
  v_esesonido: 149,
  v_que: 150,
  v_caja: 139,
  v_huellas: 138,
  latido: 10,
  patada: SE.PATADA
};

sfx.hook = (tipo, pos) => {
  if (!audioMGS.listo || !sonidoOn) return false;
  if (typeof tipo === "number") {
    seEn(tipo, pos);
    return true;
  }
  const id = SE_DE[tipo];
  if (id == null) return tipo === "?";
  seEn(id, pos);
  return true;
};

const SE_BOMBA = new Set([ 41, 45, 46, 51, 19, 141, 142, 145, 181, 186, 187, 188 ]);

const _oido = new THREE.Vector3, _mira = new THREE.Vector3;

function seEn(id, pos, volMax = 63, modo = null) {
  if (!audioMGS.listo || !sonidoOn) return;
  let pan = 0, vol = 63;
  if (pos) {
    const camara = !terceraPersona() || vista === "hombro";
    const real = id >= 160 && id <= 167, bomba = modo === "bomba" || modo == null && SE_BOMBA.has(id);
    if (real && !camara) return;
    cam.getWorldDirection(_mira);
    if (camara) cam.getWorldPosition(_oido); else _oido.copy(rig.position);
    const d = pos.clone().sub(_oido);
    let dist = d.length() * 1e3, escalaPan;
    if (camara) {
      if (bomba) vol = dist < 2e3 ? 63 : dist < 9050 ? 63 - Math.floor((dist - 2e3) / 300) : (dist = 9050, 
      39); else vol = dist < 9500 ? 63 - Math.floor(dist / 150) : 0;
      escalaPan = Math.min(dist * 4, bomba ? 9050 : 9500) / (bomba ? 9050 : 9500);
    } else {
      if (bomba) vol = dist < 3e3 ? 63 : dist < 7700 ? 63 - Math.floor((dist - 3e3) / 200) : (dist = 7700, 
      39); else vol = dist < 1e3 ? 63 : dist < 7300 ? 63 - Math.floor((dist - 1e3) / 100) : 0;
      escalaPan = Math.min(dist, bomba ? 7700 : 7300) / (bomba ? 7700 : 7300);
    }
    if (vol <= 0) return;
    const ang = Math.atan2(d.x, d.z) - Math.atan2(_mira.x, _mira.z);
    pan = Math.round(-Math.sin(ang) * 31 * escalaPan);
    if (audioMGS.espacial) {
      audioMGS.seEspacial(id, pos, Math.min(volMax, vol));
      return;
    }
  }
  audioMGS.se(id, pan, Math.min(volMax, vol));
}

const $ = s => document.querySelector(s);

const ALTURA_OJOS = 1.6, RADIO = .3, PASO = .45;

const TACTIL = new URLSearchParams(location.search).has("tactil") || matchMedia("(pointer: coarse)").matches;

const efectosGuion = efectosPorDefecto();

const padDemo = new PadDemo;

const rango = new PantallaRango;

const demoCancel = new DemoCancel, lifeUp = new LifeUp, movie = new Movie, escenaPendiente = new EscenaPendiente;

let crearActorNivel = null, hzmNivel = new Map;

let mapasExcl = null, mapasPend = null, objsNivel = [], olvidarVistos = null;

let esperaRecarga = null;

let hornos = [];

function revisarHorno() {
  if (!hornos.length || !juego || juego.muerto || muerteSnake || pantallaGameOver.activo) return;
  const x = rig.position.x * 1e3, z = rig.position.z * 1e3;
  const M = snakeScript.motion, alt = M?.fis && !((M.v?.[5] | 0) & 16386) ? animsSnakeDatos?.clips?.[M.clip]?.altura : null;
  const y = alt ? M.fis.ref * 1e3 + (alt[Math.max(0, Math.min(alt.length - 1, Math.floor(M.t * 30)))] ?? 0) : (rig.position.y + ALTO_CONTROL[reptando ? 2 : agachado ? 1 : 0]) * 1e3;
  for (const h of hornos) {
    const b = h.b;
    if (!(x > b[0] && x < b[3] && y > b[1] && y < b[4] && z > b[2] && z < b[5])) continue;
    const p = [ x, b[4], z ];
    debug.log("juego", "Snake cae al acero fundido (FURNACE): GAME OVER");
    din?.extras?.meltDie?.(p, 60);
    seEn(186, v3(p));
    juego.muerto = true;
    juego.vida = 0;
    inventario.setVida(0);
    if (h.e > 0) guion.correrProc(h.e, [ 0 ]);
    ctxJefes?.gameOver?.();
    return;
  }
}

function retenerHastaCreados() {
  const ps = (guion.creados || []).map(a => a.listo).filter(Boolean);
  if (!ps.length) return;
  const yo = esperaRecarga = Promise.race([ Promise.allSettled(ps), new Promise(r => setTimeout(r, 1e4)) ]).then(() => {
    if (esperaRecarga === yo) esperaRecarga = null;
  });
}

const guion = new GuionVivo({
  registro: t => debug.log("guion", t),
  reinicio: () => {
    efectosGuion.limpiar();
    padDemo.cortar();
    demoCancel.cortar();
    lifeUp.cortar();
    movie.cortar();
    escenaPendiente.cortar();
    padGuion.suelto = false;
    cortarMotionSnake();
  },
  crearActor: a => crearDesdeGuion(a),
  destruirActor: a => destruirDesdeGuion(a),
  efecto: a => a.tipo === "CAMERASHAKE" && camJuego ? camJuego.sacudir(a) : a.tipo === "CAT_IN" ? a.corte && vista === "arriba" && camJuego ? (camJuego.corte(a.corte.ojo, a.corte.centro, a.corte.zoom, Math.max(1, a.corte.cuadros)), 
  true) : true : efectosGuion.efecto(a),
  finCorte: () => {
    if (camJuego) camJuego.corteActivo = null;
  },
  mensaje: (d, v, i) => d === 8650 ? mensajeSnake(v, i) : mensajesGuion(d, v, i),
  demo: (sector, info) => correrDemos([ {
    st: info.st,
    demo: sector
  } ], {
    enEscena: s => s === info.st
  }),
  cargar: (st, info) => cargarDesdeGuion(st, info),
  luz: l => luzDesdeGuion(l),
  sonido: r => sonidoGuion(r),
  mapa: c => {
    if (c.fondo) scene.background = new THREE.Color(`rgb(${c.fondo.map(x => Math.max(0, Math.min(255, x))).join(",")})`);
  },
  recargaMapas: ids => {
    if (!mapasExcl) return;
    mapasExcl.poner(ids);
    if (!mapasPend) {
      mapasPend = true;
      queueMicrotask(() => {
        mapasPend = null;
        mapasExcl?.prepararIA?.();
        retenerHastaCreados();
      });
    }
  },
  reinicioTotal: () => vaciarNivelPorReinicio(),
  entradaTotal: st => MAPAS_EXCL.has(st),
  camara: c => camJuego?.camera(c),
  oarSnake: id => ponerOarSnake(id),
  colocarSnake: (a, info) => {
    if ((info.trasDemo || info.origen?.tipo === "reinicio") && a.p) {
      const ps = guion.vars.get("$w:L0020");
      if (ps >= 0 && ps <= 3) {
        agachado = ps >= 1;
        reptando = ps >= 2;
      }
      ubicarControl(v3(a.p), (a.d ? a.d[1] : 0) * ANG + Math.PI);
    }
  },
  hzm: archivo => hzmNivel.get(archivo),
  pad: r => {
    if ("r" in r) Object.assign(padGuion, {
      suelto: true,
      desde: guion.t,
      st: $("#esc-sel").value
    }); else if ("s" in r) padGuion.suelto = false;
  },
  comandante: a => esZako(a) && ctxZako ? crearZako(a, ctxZako) : null
});

const sonidoGuion = sonidoPorDefecto(audioMGS);

{
  const m = guion.op.mensaje;
  guion.op.mensaje = (d, v, i) => mensajeZako(d, v, i, ctxZako) || m(d, v, i);
}

const H_SN = {
  MOTION: 37754,
  GO_MOTION: 48650,
  RUN_MOVE: 28923,
  STANCE: 12856,
  POSITION: 25270,
  STOP: 24203,
  START: 39455,
  PADON: 9600,
  PADOFF: 44906,
  KILL: 12835,
  TABAKO: 32786,
  MAPA: 63917,
  SLOW: 16018
};

const snakeScript = {
  frenado: false,
  sinPad: false,
  destino: null,
  motion: null
};

const padGuion = {
  suelto: false,
  desde: 0,
  st: null
};

function mensajeSnake(v, info) {
  if (info?.entrada && v[0] === H_SN.POSITION && v.length >= 4) {
    moverControl(v[1] * .001, v[2] * .001, v[3] * .001);
    return true;
  }
  if (info?.entrada && v[0] !== H_SN.MOTION && v[0] !== H_SN.GO_MOTION && v[0] !== 35275) return true;
  const m = v[0], mm = x => x * .001;
  switch (m) {
   case H_SN.STOP:
    snakeScript.frenado = true;
    break;

   case H_SN.START:
    snakeScript.frenado = false;
    break;

   case H_SN.PADOFF:
    snakeScript.sinPad = true;
    break;

   case H_SN.PADON:
    snakeScript.sinPad = false;
    break;

   case H_SN.POSITION:
    if (v.length >= 4) {
      rig.position.set(mm(v[1]), mm(v[2]), mm(v[3]));
      vy = 0;
    }
    break;

   case 35275:
    if (v.length >= 4) moverControl(mm(v[1]), mm(v[2]), mm(v[3]));
    break;

   case H_SN.STANCE:
    {
      const st = v[1] | 0;
      agachado = st >= 1;
      reptando = st === 2;
      break;
    }

   case H_SN.MOTION:
   case H_SN.GO_MOTION:
    {
      const n = v[1] | 0, propio = !((v[5] | 0) & 128) && oarSnake ? `${oarSnake}:${n}` : null;
      cortarMotionSnake();
      snakeScript.motion = {
        n: n,
        propio: propio,
        v: v.slice(),
        clip: null,
        t: 0,
        dur: 1,
        espera: 0
      };
      armarMotionSnake();
      break;
    }

   case H_SN.RUN_MOVE:
    if (v.length >= 4) snakeScript.destino = {
      p: new THREE.Vector3(mm(v[1]), mm(v[2]), mm(v[3])),
      t: 0
    };
    break;

   case H_SN.MAPA:
   case H_SN.SLOW:
   case H_SN.KILL:
   case H_SN.TABAKO:
    break;

   default:
    debug.log("guion", `Snake: mensaje #${(m >>> 0).toString(16)} ignorado (como sna_init.c)`);
    return true;
  }
  return true;
}

let animsSnakeDatos = null;

cargarAnims("snake").then(d => animsSnakeDatos = d).catch(() => {});

let oarSnake = null;

function ponerOarSnake(id) {
  let n = id != null ? "snake_" + (id & 65535).toString(16).padStart(4, "0") : null;
  if (n === "snake_4ec8" || n === "snake_ee1f") n = null;
  if (n === oarSnake) return;
  oarSnake = n;
  if (!n) return;
  Promise.all([ cargarAnims("snake"), cargarAnims(n) ]).then(([base, d]) => {
    for (const c of Object.values(d.clips)) base.clips[`${n}:${c.n}`] = c;
  }).catch(() => {
    if (oarSnake === n) oarSnake = null;
  });
}

function duracionSnake(clip) {
  const c = animsSnakeDatos?.clips?.[clip];
  return c ? c.cuadros / (animsSnakeDatos.fps || 30) : 1;
}

let escVista = null;

const _pb = new THREE.Vector3;

function pisoBajo(x, y, z, alcance = 2) {
  const l = colPisos || colisiones;
  if (!l?.length) return null;
  const g = golpe(_pb.set(x, y, z), ABAJO, alcance, l);
  return g ? g.point.y : null;
}

function ubicarControl(p, ang) {
  ubicar(p.x, pisoBajo(p.x, p.y + .05, p.z, 1.7) ?? p.y - ALTO_CONTROL[reptando ? 2 : agachado ? 1 : 0], p.z, ang);
  snakeScript.ctl = {
    x: p.x,
    y: p.y,
    z: p.z
  };
}

function moverControl(x, y, z) {
  const M = snakeScript.motion;
  if (M?.fis) {
    moverMotion(M.fis, M.t, x, z);
    return;
  }
  rig.position.set(x, pisoBajo(x, y + .05, z, 1.7) ?? y - ALTO_CONTROL[reptando ? 2 : agachado ? 1 : 0], z);
  vy = 0;
  snakeScript.ctl = {
    x: x,
    y: y,
    z: z
  };
}

function armarMotionSnake() {
  const M = snakeScript.motion;
  if (!M || M.clip || !animsSnakeDatos) return;
  const clips = animsSnakeDatos.clips;
  const clip = M.propio && clips[M.propio] ? M.propio : M.propio && oarSnake && M.espera < 3 ? null : `anim ${M.n}`;
  if (!clip) return;
  const v = M.v, c = snakeScript.ctl, ctlY = c && Math.hypot(rig.position.x - c.x, rig.position.z - c.z) < .05 ? c.y : null;
  snakeScript.ctl = null;
  if (v.length > 2 && v[2] >= 0) {
    rumbo = v[2] * ANG + Math.PI;
    if (!terceraPersona()) yaw = rumbo;
  }
  M.clip = clip;
  M.dur = duracionSnake(clip);
  M.fis = clips[clip] ? iniciarMotion({
    datos: clips[clip],
    dir: dirDesdeYaw(rumbo),
    pos: rig.position,
    ctlY: ctlY,
    postura: ducto.activo ? 3 : reptando ? 2 : agachado ? 1 : 0,
    posturaFin: v.length > 4 ? v[4] : -1,
    banderas: v[5] | 0,
    y6: v.length > 6 ? v[6] : null,
    piso: pisoBajo
  }) : null;
  if (M.fis) {
    cuadroMotion(M.fis, 0, rig.position);
    const pf = M.fis.posturaFin;
    agachado = pf >= 1;
    reptando = pf >= 2;
  }
  if (M.fis?.escalera && vista !== "arriba" && !R.xr.isPresenting && camJuego) {
    escVista = vista;
    vista = "arriba";
    if (armaVista) armaVista.visible = false;
  }
}

function cortarMotionSnake(terminar = false) {
  const M = snakeScript.motion;
  snakeScript.motion = null;
  if (terminar && M?.fis) {
    cuadroMotion(M.fis, M.dur, rig.position);
    const y = finMotion(M.fis, rig.position, pisoBajo), pf = M.fis.posturaFin;
    rig.position.y = y ?? M.fis.ref + M.fis.aN - ALTO_CONTROL[pf];
    vy = 0;
    agachado = pf >= 1;
    reptando = pf >= 2;
  }
  if (escVista != null) {
    const v = escVista;
    escVista = null;
    if (v !== vista && !R.xr.isPresenting) {
      if (v !== "arriba") {
        yaw = rumbo;
        pitch = 0;
      }
      vista = v;
      if (armaVista) armaVista.visible = v === "primera";
    }
  }
}

function actualizarSnakeGuion(dt) {
  const G = snakeScript, M = G.motion;
  if (M && cargaNivel) {
    if (M.fis) cuadroMotion(M.fis, 0, rig.position);
  } else if (M && !M.clip) {
    M.espera += dt;
    armarMotionSnake();
  } else if (M && (M.t += dt) >= M.dur) cortarMotionSnake(true); else if (M?.fis) {
    cuadroMotion(M.fis, M.t, rig.position);
    vy = 0;
  }
  if (G.destino) {
    const d = G.destino, p = rig.position, dx = d.p.x - p.x, dz = d.p.z - p.z, L = Math.hypot(dx, dz);
    if (L < .25 || (d.t += dt) > 8) {
      G.destino = null;
      return;
    }
    const paso = Math.min(L, 3.45 * dt), mov = new THREE.Vector3(dx / L * paso, 0, dz / L * paso);
    deslizar(p, mov);
    p.x += mov.x;
    p.z += mov.z;
    rumbo = Math.atan2(-dx, -dz);
    if (!terceraPersona()) yaw = rumbo;
  }
}

const mensajesGuionScript = manejadorMensajes({
  din: () => din,
  guardias: () => patrullas,
  juego: () => juego,
  sensores: () => sensores,
  camJuego: () => camJuego,
  mundo: () => mundo,
  colParedes: () => colParedes,
  recalcular: () => {
    recalcularColisiones();
    recalcularPisos();
  },
  puertaDeEvento: n => inventario.puedeAbrir(n).evento === true,
  rutaDe: (m, r) => guion.rutaDe(m, r),
  efectos: efectosGuion,
  THREE: THREE
});

const mensajesExtra = manejadorMensajesExtra({
  din: () => din,
  juego: () => juego,
  mundo: () => mundo,
  armas: () => armas,
  sensores: () => sensores,
  guardias: () => patrullas,
  guion: guion,
  recalcular: () => {
    recalcularColisiones();
    recalcularPisos();
  }
});

const mensajesGuion = (d, v, i) => din?.mensaje?.(d, v, i) || ducto.mensaje(d, v) || !!juego?.mensaje?.(d, v) || mensajesGuionScript(d, v, i) || mensajeEntrada(d, v, i) || mensajesExtra(d, v, i);

function mensajeEntrada(d, v, i) {
  if (i?.entrada) {
    if (mesgEntrada.st !== guion.st) {
      mesgEntrada.st = guion.st;
      mesgEntrada.l = [];
    }
    mesgEntrada.l.push([ d, v.slice() ]);
  }
  return false;
}

const codec = new Codec({
  guion: guion,
  botonTactil: TACTIL,
  audioCtx: () => audioMGS.ctx,
  se: id => audioMGS.se(id),
  musica: c => audioMGS.codigo(c),
  puedeAbrir: () => !!juego && modo === "escenarios" && !enPausa() && !pantallaGameOver.activo && !cargandoNivel,
  alAbrir: () => {
    document.exitPointerLock?.();
    for (const k in teclas) teclas[k] = false;
    tac.x = tac.y = 0;
  },
  alCerrar: ({tipo: tipo, freq: freq}) => debug.log("códec", `cerrado tipo ${tipo} freq ${freq}`)
});

codec.cargar();

{
  const voz = codec.reproducirVoz.bind(codec);
  codec.reproducirVoz = async (id, o) => {
    for (let i = 0; i < 600 && cargaNivel; i++) await new Promise(r => setTimeout(r, 50));
    return voz(id, o);
  };
}

let codecXRult = 0;

const codecXRignorar = new Set;

function fuentesCodecXR() {
  const r = [], nuevo = performance.now() - codecXRult > 300;
  codecXRult = performance.now();
  if (nuevo) codecXRignorar.clear();
  for (const src of R.xr.getSession()?.inputSources || []) {
    const g = src.gamepad;
    if (!g) continue;
    const lado = src.handedness === "left" ? "left" : "right", b = [ false, false, false, false, false, false ];
    const apretado = i => {
      const k = lado + i, p = !!g.buttons[i]?.pressed;
      if (nuevo && p) codecXRignorar.add(k);
      if (!p) codecXRignorar.delete(k);
      return p && !codecXRignorar.has(k);
    };
    b[0] = apretado(0);
    for (const i of [ 1, 3, 4, 5 ]) if (apretado(i)) {
      const a = ctl.accionQuest(lado, i);
      if (a === "circulo") b[4] = true; else if (a === "cruz") b[5] = true; else if (a === "select") b[3] = true;
    }
    r.push({
      handedness: src.handedness,
      gamepad: {
        axes: g.axes,
        buttons: b.map(p => ({
          pressed: p,
          value: p ? 1 : 0
        }))
      }
    });
  }
  return r;
}

Object.defineProperty(codec.op, "textoSalir", {
  configurable: true,
  get: () => {
    if (R.xr.isPresenting) {
      const b = ctl.botonQuestDe("select");
      return b ? `PRESS ${b.toUpperCase().replace(/\.$/, "")} TO EXIT` : undefined;
    }
    const g = ctl.mandoConectado(), t = g && ctl.tipoMando(g);
    return t && t !== "ps" && t !== "generico" ? `PRESS ${ctl.nombreAscii(ctl.nombreAccionMando("select", t))} TO EXIT` : undefined;
  }
});

let partida = null;

const partidaUI = new PartidaUI({
  sonido: audioMGS
});

PartidaUI.engancharCodec(codec, {
  ui: partidaUI,
  partida: () => partida,
  usar: () => !R.xr.isPresenting
});

function usarPartida(p) {
  partida?.desconectar();
  partida = p;
  if (p) {
    p.conectar({
      guion: guion,
      inventario: inventario,
      codec: codec
    });
    dificultad = p.dificultad;
  }
}

function seguirTrasGameOver() {
  if (partida) {
    const c = partida.continuar();
    cargarEscenario(c.st, c.entrada);
  } else cargarEscenario($("#esc-sel").value, entradaActual);
}

let zonasCodec = [], yCodecAnt = false;

function revisarZonasCodec() {
  const p = rig.position.clone();
  p.y += .3;
  for (const z of zonasCodec) {
    const dentro = z.cajas.some(c => c.containsPoint(p));
    if (z.dentro === null) {
      z.dentro = dentro;
      continue;
    }
    if (dentro !== z.dentro) {
      z.dentro = dentro;
      guion.trampa(z.h, dentro ? HASH.ENTRAR : HASH.SALIR);
    }
  }
}

const VISTAS = [ "primera", "hombro", "arriba" ], NOMBRE_VISTA = {
  primera: "1ra persona",
  hombro: "3ra persona (MGS3/4)",
  arriba: "original (cámara del juego)"
};

let vista = (() => {
  try {
    return VISTAS.includes(localStorage.getItem("sm_vista")) ? localStorage.getItem("sm_vista") : "primera";
  } catch {
    return "primera";
  }
})();

let rumbo = 0, tApunta = 0, tDisparo = 0, tGolpe = 0;

let hombroK = 0;

const terceraVR = {
  S: new THREE.Vector3,
  activo: false,
  saltar: true,
  aplicado: null
};

function vrModo() {
  if (!R.xr.isPresenting) return null;
  if (modo !== "escenarios" || ducto.activo || vrCamara) return "primera";
  return vista === "hombro" ? "tercera" : vista === "arriba" ? "pantalla" : "primera";
}

const terceraPersona = () => R.xr.isPresenting ? vrModo() !== "primera" : vista !== "primera";

const camaraJuegoActiva = () => vista === "arriba" && (!R.xr.isPresenting || vrModo() === "pantalla");

const _dirCab = new THREE.Vector3;

const yawCabezaVR = () => {
  R.xr.getCamera().getWorldDirection(_dirCab);
  return Math.atan2(-_dirCab.x, -_dirCab.z);
};

const DIFICULTADES = [ "muy fácil", "fácil", "normal", "difícil", "extremo" ];

let dificultad = (() => {
  try {
    const s = localStorage.getItem("sm_dif"), v = +s;
    return s !== null && v >= 0 && v <= 4 ? v : 2;
  } catch {
    return 2;
  }
})();

const R = new THREE.WebGLRenderer({
  antialias: !TACTIL,
  stencil: true,
  powerPreference: "high-performance"
});

const escalaMax = Math.min(devicePixelRatio, TACTIL ? 1.5 : 2), escalaMin = TACTIL ? .6 : .7;

const MAX_OTROS_SOMBRA = TACTIL ? 1 : 3;

let otrosSombra = MAX_OTROS_SOMBRA;

let escala = TACTIL ? Math.min(1, escalaMax) : escalaMax;

R.setPixelRatio(escala);

const adapt = {
  dts: [],
  cpus: [],
  t: 0,
  tIni: 0,
  canal: null,
  vrBien: 0
};

try {
  adapt.canal = new MessageChannel;
  adapt.canal.port1.onmessage = () => {
    if (adapt.tIni) adapt.cpus.push(performance.now() - adapt.tIni);
    adapt.tIni = 0;
  };
} catch {}

const mediaSinTirones = a => {
  const b = a.slice().sort((x, y) => x - y), n = Math.max(1, Math.ceil(b.length * .95));
  let s = 0;
  for (let i = 0; i < n && i < b.length; i++) s += b[i];
  return b.length ? s / Math.min(n, b.length) : 0;
};

function adaptarResolucion(dtReal) {
  if (dtReal <= 0 || dtReal > .5 || !R.xr.isPresenting && (enPausa() || cambiando)) {
    adapt.dts.length = adapt.cpus.length = 0;
    adapt.t = 0;
    return;
  }
  adapt.t += dtReal;
  adapt.dts.push(dtReal);
  if (adapt.canal && !adapt.tIni) {
    adapt.tIni = performance.now();
    adapt.canal.port2.postMessage(0);
  }
  if (adapt.t < 2.5) return;
  const msCuadro = mediaSinTirones(adapt.dts) * 1e3, msCPU = mediaSinTirones(adapt.cpus), fps = 1e3 / msCuadro;
  adapt.dts.length = adapt.cpus.length = 0;
  adapt.t = 0;
  adapt.ult = {
    fps: +fps.toFixed(1),
    msCPU: +msCPU.toFixed(1),
    msCuadro: +msCuadro.toFixed(1)
  };
  if (R.xr.isPresenting) {
    const hz = R.xr.getSession?.()?.frameRate || 72;
    if (fps < hz * .9) {
      adapt.vrBien = 0;
      if (otrosSombra > 0) {
        otrosSombra--;
        window.debugLog?.("info", `VR: sombras de ${otrosSombra} personajes (fps ${fps.toFixed(0)} de ${hz})`);
      }
    } else if (fps > hz * .97 && ++adapt.vrBien >= 2 && otrosSombra < MAX_OTROS_SOMBRA) {
      adapt.vrBien = 0;
      otrosSombra++;
    }
    return;
  }
  let nueva = escala;
  const cpuLimita = msCPU > .8 * msCuadro;
  if (fps < 28) {
    if (otrosSombra > 0) {
      otrosSombra--;
      window.debugLog?.("info", `sombras de ${otrosSombra} personajes (fps ${fps.toFixed(0)})`);
      return;
    }
    if (cpuLimita) {
      if (!adapt.avisoCPU) {
        adapt.avisoCPU = true;
        window.debugLog?.("info", `fps ${fps.toFixed(0)} por CPU (${msCPU.toFixed(0)} de ${msCuadro.toFixed(0)} ms): la resolución queda`);
      }
      return;
    }
    nueva = Math.max(escalaMin, escala - .15);
  } else if (fps > 55) {
    if (escala >= escalaMax - .01 && otrosSombra < MAX_OTROS_SOMBRA) {
      otrosSombra++;
      return;
    }
    nueva = Math.min(escalaMax, escala + .1);
  }
  if (Math.abs(nueva - escala) > .01) {
    escala = nueva;
    R.setPixelRatio(escala);
    R.setSize(innerWidth, innerHeight);
    window.debugLog?.("info", `resolución ${escala.toFixed(2)} (fps ${fps.toFixed(0)}, CPU ${msCPU.toFixed(0)} de ${msCuadro.toFixed(0)} ms)`);
  }
}

window.__adapt = () => ({
  escala: escala,
  otrosSombra: otrosSombra,
  escalaMax: escalaMax,
  escalaMin: escalaMin,
  ...adapt.ult
});

R.setSize(innerWidth, innerHeight);

R.xr.enabled = true;

R.xr.setReferenceSpaceType("local-floor");

R.xr.setFramebufferScaleFactor(1);

R.xr.setFoveation(1);

R.xr.addEventListener("sessionstart", () => {
  const s = R.xr.getSession();
  try {
    if (s?.updateTargetFrameRate && s.supportedFrameRates?.includes(72) && s.frameRate !== 72) s.updateTargetFrameRate(72).catch(() => {});
  } catch {}
});

if (REND.activo) R.setOpaqueSort(ordenOpaco);

document.body.appendChild(R.domElement);

debug.iniciar({
  renderer: R,
  estado: () => ({
    modo: modo,
    esc: $("#esc-sel")?.value,
    pos: rig?.position,
    yaw: +yaw.toFixed(2),
    nivelT: +tNivel.toFixed(1),
    xr: R.xr.isPresenting,
    alerta: juego?.modo,
    vida: juego ? +juego.vida.toFixed(2) : undefined,
    guardias: patrullas?.length,
    audio: audioMGS.ctx?.state,
    menu: !$("#panel")?.classList.contains("oculto"),
    vuelo: vuelo,
    cambiando: cambiando
  })
});

const CASCO = /OculusBrowser|Quest|Pico|Wolvic|VR/i.test(navigator.userAgent);

if (CASCO) document.body.appendChild(VRButton.createButton(R));

navigator.xr?.isSessionSupported?.("immersive-vr").then(ok => {
  const b = document.getElementById("opt-vr");
  if (!ok || !b) return;
  b.hidden = false;
  b.onclick = async () => {
    if (R.xr.isPresenting) {
      R.xr.getSession()?.end();
      return;
    }
    try {
      const ses = await navigator.xr.requestSession("immersive-vr", {
        optionalFeatures: [ "local-floor", "bounded-floor", "hand-tracking" ]
      });
      await R.xr.setSession(ses);
      b.textContent = "Salir de VR";
      ses.addEventListener("end", () => {
        b.textContent = "Entrar a VR";
      });
    } catch (e) {
      aviso("VR no disponible");
    }
  };
}).catch(() => {});

const scene = new THREE.Scene;

scene.background = new THREE.Color(725517);

scene.add(new THREE.HemisphereLight(15660287, 3820094, 2));

const sol = new THREE.DirectionalLight(16777215, 1.6);

sol.position.set(3, 8, 5);

scene.add(sol);

const luzMod = new LuzModerna({
  escena: scene,
  sol: sol,
  tactil: TACTIL
});

const sombras = new Sombras(R, scene, TACTIL ? 512 : 1024);

let dirSombra = new THREE.Vector3(-.3, -.8, -.5).normalize();

const rig = new THREE.Group;

scene.add(rig);

const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .03, 3e3);

const FOV_NORMAL = cam.fov;

const museoVR = new MuseoVR;

const soporteVR = new THREE.Group;

soporteVR.name = "soporteVR";

rig.add(soporteVR);

cam.position.y = ALTURA_OJOS;

soporteVR.add(cam);

const camOrb = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, .01, 2e3);

const orbita = new OrbitControls(camOrb, R.domElement);

orbita.enableDamping = true;

orbita.enabled = false;

let mundo = new THREE.Group;

scene.add(mundo);

let colisiones = [];

let giran = [];

let mezcladores = [], patrullas = [], itemsNivel = [];

let juego = null, agachado = false, reptando = false, din = null;

const pref = (k, d) => {
  try {
    const v = localStorage.getItem("sm_" + k);
    return v === null ? d : v === "1";
  } catch {
    return d;
  }
};

const guardarPref = (k, v) => {
  try {
    localStorage.setItem("sm_" + k, v ? "1" : "0");
  } catch {}
};

let conCuerpo = pref("cuerpo", true), conSombras = pref("sombras", true);

let cuerpo = null, brillos = [];

sombraU.uSombraOn.value = conSombras ? 1 : 0;

let modo = "museo";

const fabControles = (new XRControllerModelFactory).setPath("assets/xr/perfiles");

const fabManos = (new XRHandModelFactory).setPath("assets/xr/perfiles/generic-hand/");

for (let i = 0; i < 2; i++) {
  const c = R.xr.getController(i);
  const g = (new THREE.BufferGeometry).setFromPoints([ new THREE.Vector3, new THREE.Vector3(0, 0, -1) ]);
  c.userData.rayito = new THREE.Line(g, new THREE.LineBasicMaterial({
    color: 8257440
  }));
  c.add(c.userData.rayito);
  c.addEventListener("connected", e => {
    c.userData.lado = e.data?.handedness || null;
  });
  c.addEventListener("disconnected", () => {
    c.userData.lado = null;
  });
  soporteVR.add(c);
  const grip = R.xr.getControllerGrip(i);
  grip.userData.modelo = fabControles.createControllerModel(grip);
  grip.add(grip.userData.modelo);
  grip.addEventListener("connected", e => {
    grip.userData.lado = e.data?.handedness || null;
    if (R.xr.isPresenting) ponerArmaEnMano();
  });
  soporteVR.add(grip);
  const mano = R.xr.getHand(i);
  mano.add(fabManos.createHandModel(mano, "mesh"));
  soporteVR.add(mano);
}

const hud = new Hud;

hud.cargar();

const miraArma = new MiraArma;

const camCasco = new THREE.PerspectiveCamera;

camCasco.matrixAutoUpdate = false;

const camApuntar = () => R.xr.isPresenting && vrModo() !== "pantalla" ? camCasco : cam;

const ventanaMira = new VentanaMiraVR;

const miraScope = new MiraScope({
  se: id => audioMGS.se(id)
});

const interfaz = new Interfaz({
  tactil: TACTIL,
  alCerrar: () => {
    if (!TACTIL && modo === "escenarios" && juego && !R.xr.isPresenting && !camLibre.activa) pedirMouse();
  }
});

const inventario = new Inventario({
  dificultad: dificultad,
  tactil: TACTIL,
  tema: "juego",
  se: (id, p) => sonido(id, p),
  proyectar: v => {
    const p = v.clone().project(cam);
    return {
      x: (p.x + 1) / 2 * innerWidth,
      y: (1 - p.y) / 2 * innerHeight,
      visible: p.z < 1
    };
  },
  primeraPersona: () => !terceraPersona(),
  postura: () => reptando ? 2 : agachado ? 1 : 0,
  crearModelo: tipo => {
    const it = itemsNivel.find(i => i._tipo?.caja === tipo && i.obj.children[0]);
    return it ? it.obj.children[0].clone(true) : null;
  }
});

let armas = null;

const BASE_ARMA = (new THREE.Matrix4).makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));

async function cambiarModeloArma(a) {
  if (!armaVista) return;
  const u = armaVista.userData;
  u.socom ||= pistolaVista || armaVista.children[0];
  let nuevo = null;
  if (a.id === WP.SOCOM && !a.silenciador) nuevo = u.socom; else if (a.id === WP.FAMAS) nuevo = null; else if (a.modelo) {
    nuevo = u.cache?.[a.modelo];
    if (!nuevo) {
      nuevo = await cargar(a.modelo);
      nuevo.setRotationFromMatrix(BASE_ARMA);
      nuevo.traverse(o => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.color?.setScalar?.(1.6);
        }
      });
      (u.cache ||= {})[a.modelo] = nuevo;
    }
    if (armas && armas.arma.modelo !== a.modelo) return;
  }
  for (const m of [ u.socom, ...Object.values(u.cache || {}) ]) if (m && m !== nuevo && m.parent === armaVista) armaVista.remove(m);
  if (nuevo && nuevo.parent !== armaVista) armaVista.add(nuevo);
  u.modelo = nuevo;
}

function miraSnake() {
  const o = new THREE.Vector3, d = new THREE.Vector3;
  if (camaraJuegoActiva() && inventario?.arma === WP.STINGER && teclas.KeyE && camJuego?.primeraPersona) {
    cam.getWorldPosition(o);
    cam.getWorldDirection(d);
  } else if (camaraJuegoActiva()) {
    o.copy(rig.position);
    o.y += agachado ? .7 : 1.25;
    d.set(-Math.sin(rumbo), 0, -Math.cos(rumbo));
  } else if (R.xr.isPresenting) {
    const c = [ 0, 1 ].map(i => R.xr.getController(i)).find(k => k.userData.lado === manoArma());
    if (c) {
      c.getWorldPosition(o);
      d.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion));
    } else {
      cam.getWorldPosition(o);
      cam.getWorldDirection(d);
    }
    if (terceraPersona()) apuntarDesdeSnake(o, d);
  } else {
    cam.getWorldPosition(o);
    cam.getWorldDirection(d);
    if (terceraPersona()) apuntarDesdeSnake(o, d);
  }
  return {
    o: o,
    d: d
  };
}

function apuntarDesdeSnake(o, d) {
  const h = primerGolpe(o, d, 60, colParedes ? colParedes.concat(colisiones) : colisiones);
  const p = h ? h.point.clone() : o.clone().addScaledVector(d, 30);
  o.copy(rig.position);
  o.y += reptando ? .3 : agachado ? .7 : 1.25;
  d.copy(p).sub(o);
  if (d.lengthSq() < 1e-6) d.set(-Math.sin(rumbo), 0, -Math.cos(rumbo));
  d.normalize();
}

const radarTex = new THREE.CanvasTexture(hud.muñeca);

radarTex.colorSpace = THREE.SRGBColorSpace;

radarTex.magFilter = radarTex.minFilter = THREE.NearestFilter;

radarTex.generateMipmaps = false;

{
  const grip = R.xr.getControllerGrip(0);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(.126, .07), new THREE.MeshBasicMaterial({
    map: radarTex
  }));
  pantalla.position.set(0, .035, .02);
  pantalla.rotation.x = -Math.PI / 2.6;
  grip.add(pantalla);
}

if (TACTIL) {
  try {
    globalThis.createImageBitmap = undefined;
  } catch {}
}

const loader = new GLTFLoader;

const cache = new Map;

const aBasico = new WeakMap, aStd = new WeakMap, texturas = new Set;

let pendientes = 0;

function cargando(d) {
  pendientes += d;
  if (!$("#cargando").dataset.cine) $("#cargando").style.display = pendientes > 0 && !cargaNivel ? "block" : "none";
  if (cargaNivel) {
    if (d > 0) cargaNivel.total += d; else cargaNivel.hechos -= d;
    barraCarga();
  }
}

let cargaNivel = null;

function barraCarga(fin = false) {
  const c = cargaNivel, el = document.getElementById("pantalla-carga");
  if (!el) return;
  const f = fin ? 1 : c ? Math.min(.95, (c.hechos + 1) / (c.total + 2)) : 0;
  el.querySelector("i").style.width = (f * 100).toFixed(0) + "%";
  el.querySelector(".pc-p").textContent = (f * 100).toFixed(0) + " %";
}

function mostrarCarga(si) {
  const el = document.getElementById("pantalla-carga");
  if (!el) return;
  if (si) {
    cargaNivel = {
      total: 0,
      hechos: 0
    };
    barraCarga();
    el.style.display = "flex";
    el.style.opacity = 1;
  } else {
    cargaNivel = null;
    barraCarga(true);
    el.style.opacity = 0;
    setTimeout(() => {
      if (!cargaNivel) el.style.display = "none";
    }, 320);
    $("#cargando").style.display = pendientes > 0 ? "block" : "none";
  }
}

async function esperarAcomodo(maxMs = 1500) {
  if (!juego || enPausa()) return;
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < maxMs) {
    await new Promise(r => {
      const t = setTimeout(r, 100);
      requestAnimationFrame(() => {
        clearTimeout(t);
        r();
      });
    });
    n = enSuelo ? n + 1 : 0;
    if (n >= 6) break;
  }
}

const texturasCompartidas = new Map;

const piezasMapa = new Set;

function compartirTextura(m) {
  const t = m.map;
  if (!t || !t.name) return;
  const clave = t.name + (/_t0$/.test(m.name || "") ? "#t0" : "");
  const ya = texturasCompartidas.get(clave);
  if (ya && ya !== t) m.map = ya; else if (!ya) texturasCompartidas.set(clave, t);
}

function preparar(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = !o.isSkinnedMesh;
    compartirTextura(o.material);
    const m = o.material;
    if (m.map) texturas.add(m.map);
    if (!aBasico.has(m)) {
      const t = /_t(\d)$/.exec(m.name || "")?.[1];
      if (t != null) {
        m.transparent = true;
        m.depthWrite = false;
        m.alphaTest = t === "0" ? .02 : .5;
        if (t === "1" || t === "3") m.blending = THREE.AdditiveBlending;
        if (t === "2") m.blending = THREE.SubtractiveBlending;
        if (t === "3") m.color.multiplyScalar(.25);
      }
      const conLuz = !!o.geometry.attributes.color;
      const b = new THREE.MeshBasicMaterial({
        map: m.map,
        color: conLuz ? new THREE.Color(2, 2, 2).multiply(m.color) : m.color,
        vertexColors: conLuz,
        alphaTest: m.alphaTest,
        side: m.side,
        transparent: m.transparent,
        depthWrite: m.depthWrite,
        blending: m.blending
      });
      m.vertexColors = false;
      aBasico.set(m, b);
      aStd.set(b, m);
      if (!o.isSkinnedMesh) {
        recibirSombra(b);
        recibirSombra(m);
      }
      if (o.isMallaUnida) {
        parcheAtlas(b);
        parcheAtlas(m);
      }
    }
    if (o.isSkinnedMesh) o.layers.enable(2);
  });
}

let cargasActivas = 0;

const colaCargas = [];

const turno = () => new Promise(r => {
  if (cargasActivas < (TACTIL ? 4 : 16)) {
    cargasActivas++;
    r();
  } else colaCargas.push(r);
});

const liberarTurno = () => {
  const r = colaCargas.shift();
  if (r) r(); else cargasActivas--;
};

async function cargar(url) {
  if (!cache.has(url)) {
    cargando(1);
    const bajar = (k = 0) => loader.loadAsync("assets/" + url).catch(e => {
      if (k >= 3) throw e;
      return new Promise(r => setTimeout(r, 1e3 * (k + 1))).then(() => bajar(k + 1));
    });
    cache.set(url, turno().then(bajar).finally(liberarTurno).then(async g => {
      await carasPS1(g.scene, url);
      if (piezasMapa.has(url) || unirSiempre(url)) unirMallas(g.scene, R, url, compartirTextura);
      preparar(g.scene);
      prepararPersonajes(g.scene, R);
      resueltos.set(url, g);
      return g;
    }).catch(e => {
      debug.log("error", `no cargó el modelo ${url}: ${e.message}`);
      cache.delete(url);
      throw e;
    }).finally(() => cargando(-1)));
  }
  const g = await cache.get(url);
  const obj = SkeletonUtils.clone(g.scene);
  aplicarLuz(obj);
  aplicarPixel();
  cullingPersonajes(obj, g.scene);
  let huesos = false;
  obj.traverse(m => {
    if (m.isSkinnedMesh) huesos = true;
  });
  if (huesos) obj.userData.personaje = true;
  return obj;
}

registrarCargador(cargar);

const demo = new Demo({
  scene: scene,
  cargar: cargar,
  encuadre: "auto",
  alCrearModelo: o => teñir(o),
  pisoEn: (x, y, z) => {
    if (!colPisos?.length) return null;
    const rc = new THREE.Raycaster(new THREE.Vector3(x, y, z), new THREE.Vector3(0, -1, 0), 0, 4);
    return rc.intersectObjects(colPisos, false)[0]?.point.y ?? null;
  },
  alMensaje: (destino, m) => debug.log("demo", `MESSAGE #${destino.toString(16)} ${m.map(v => "#" + (v & 65535).toString(16)).join(" ")}`)
});

let enDemo = false;

let radioCadena = null;

function radioDeCadena(p) {
  const [f, code, t] = Array.isArray(p?.radio_c) ? p.radio_c : [ p?.radio, 0, 3 ];
  if (!codec.listo || !f || !code) {
    debug.log("demo", `códec -c ${f}: sin datos de la llamada`);
    return Promise.resolve();
  }
  guion.radioOff = false;
  guion.procCallback = -1;
  codec.llamadaEntrante(f, code, t || 3);
  return new Promise(fin => {
    radioCadena = {
      fin: fin,
      t: 0,
      abrio: false
    };
  });
}

function dibujarRadioCadena(dtReal) {
  const rc = radioCadena;
  rc.t += dtReal;
  codec.update(dtReal);
  if (codec.abierto) rc.abrio = true; else if (rc.abrio || rc.t > 4) {
    radioCadena = null;
    rc.fin();
  }
  const c0 = R.getClearColor(new THREE.Color), a0 = R.getClearAlpha();
  R.setRenderTarget(null);
  R.setClearColor(0, 1);
  R.clear();
  R.setClearColor(c0, a0);
}

async function correrDemos(pasos, {enEscena: enEscena = () => false} = {}) {
  if (!pasos?.length || enDemo) {
    guion.demosTerminadas(pasos);
    return;
  }
  enDemo = true;
  sombraU.uSombraN.value = 0;
  const luzAntes = luzOriginal;
  if (!luzOriginal) {
    luzOriginal = true;
    aplicarLuz();
  }
  const escAntes = escala, dprDemo = Math.min(devicePixelRatio, 2);
  if (R.getPixelRatio() !== dprDemo) {
    R.setPixelRatio(dprDemo);
    R.setSize(innerWidth, innerHeight);
  }
  const antes = {
    hud: $("#hud").hidden,
    mostrar: $("#mostrar").hidden,
    panel: $("#panel").classList.contains("oculto"),
    cuerpo: cuerpo?.obj.visible
  };
  document.exitPointerLock?.();
  $("#hud").hidden = true;
  $("#mostrar").hidden = true;
  $("#tactil").hidden = true;
  $("#pausa").hidden = true;
  $("#panel").classList.add("oculto");
  rig.visible = false;
  if (cuerpo) cuerpo.obj.visible = false;
  rig.userData.antesCine = {
    p: rig.position.clone(),
    yaw: yaw
  };
  const muñecos = [];
  mundo.traverse(o => {
    if (o.userData.muñeco && o.visible) {
      o.visible = false;
      muñecos.push(o);
    }
  });
  audioMGS.codigo(33554177);
  const telon = $("#fundido"), telonAntes = telon ? {
    op: telon.style.opacity,
    tr: telon.style.transition
  } : null;
  if (telon) {
    telon.style.transition = "none";
    telon.style.opacity = 0;
  }
  if (pasos.some(p => p.st && p.st !== $("#esc-sel").value)) efectosGuion.limpiar();
  try {
    await reproducirPasos(demo, pasos, {
      enEscena: enEscena,
      alRadio: (c, p) => radioDeCadena(p)
    });
  } finally {
    if (telon) {
      telon.style.opacity = cambiando ? telonAntes.op : 0;
      void telon.offsetWidth;
      telon.style.transition = telonAntes.tr;
    }
    rig.visible = true;
    if (cuerpo) cuerpo.obj.visible = antes.cuerpo;
    const ac = rig.userData.antesCine;
    if (ac) {
      rig.position.copy(ac.p);
      yaw = ac.yaw;
      rig.rotation.set(0, yaw, 0);
      rig.userData.antesCine = rig.userData.cineInfo = null;
    }
    for (const o of muñecos) o.visible = true;
    $("#hud").hidden = antes.hud;
    $("#mostrar").hidden = antes.mostrar;
    $("#panel").classList.toggle("oculto", antes.panel);
    audioMGS.codigo(33554178);
    if (escala !== escAntes || R.getPixelRatio() !== escala) {
      R.setPixelRatio(escala);
      R.setSize(innerWidth, innerHeight);
    }
    if (luzOriginal !== luzAntes && modo !== "escenarios") {
      luzOriginal = luzAntes;
      aplicarLuz();
    }
    enDemo = false;
    reloj.getDelta();
    guion.demosTerminadas(pasos);
  }
}

let luzOriginal = false;

function aplicarLuz(root = scene) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const std = aStd.get(o.material) || o.material;
    if (!aBasico.has(std)) return;
    o.material = luzOriginal ? aBasico.get(std) : std;
    if (!luzOriginal) luzMod.malla(o);
  });
  luzMod.activar(!luzOriginal && modo === "escenarios" ? luzNivel : null);
  $("#opt-luz").textContent = "Luz: " + (luzOriginal ? "original" : "moderna") + " (L)";
  if (cuerpo) ocultarCuerpo(cuerpo, cuerpo.oculto);
}

function aplicarPixel() {
  $("#opt-pixel").textContent = "Texturas: " + (texturasPixel.pixel ? "pixeladas" : "suavizadas") + " (P)";
}

texturasPixel.alCambiar(() => {
  aplicarPixel();
  aviso("Texturas " + (texturasPixel.pixel ? "pixeladas (como la PS1)" : "suavizadas"));
});

$("#opt-luz").onclick = () => {
  luzOriginal = !luzOriginal;
  aplicarLuz();
};

const rotular = () => {
  $("#opt-sombras").textContent = "Sombras: " + (conSombras ? "sí" : "no");
  $("#opt-pantalla").textContent = document.fullscreenElement ? "Salir de pantalla completa" : "Pantalla completa";
};

$("#opt-sombras").onclick = () => {
  conSombras = !conSombras;
  guardarPref("sombras", conSombras);
  sombraU.uSombraOn.value = conSombras ? 1 : 0;
  rotular();
};

let prefPantalla = (() => {
  try {
    return localStorage.getItem("sm_pantalla") !== "0";
  } catch {
    return true;
  }
})(), pantallaPedida = false;

for (const ev of [ "pointerdown", "keydown" ]) addEventListener(ev, e => {
  if (pantallaPedida || !prefPantalla || document.fullscreenElement || !document.documentElement.requestFullscreen || R.xr.isPresenting) return;
  if (e.type === "keydown" && e.code === "Escape") return;
  pantallaPedida = true;
  pantallaCompleta(true, false);
}, {
  capture: true
});

function pantallaCompleta(si = !document.fullscreenElement, guardar = true) {
  if (guardar) {
    prefPantalla = si;
    try {
      localStorage.setItem("sm_pantalla", si ? "1" : "0");
    } catch {}
  }
  try {
    if (si && !document.fullscreenElement) document.documentElement.requestFullscreen?.({
      navigationUI: "hide"
    })?.catch?.(() => {});
    if (!si && document.fullscreenElement) document.exitFullscreen?.();
  } catch {}
}

$("#opt-pantalla").onclick = () => pantallaCompleta();

$("#opt-vista").onclick = () => cambiarVista();

$("#opt-dif").onclick = () => {
  dificultad = (dificultad + 1) % 5;
  try {
    localStorage.setItem("sm_dif", dificultad);
  } catch {}
  $("#opt-dif").textContent = "Dificultad: " + DIFICULTADES[dificultad];
  inventario.dificultad = dificultad;
  inventario.aplicarMaximos(inventario.nivelHistoria);
};

$("#opt-dif").textContent = "Dificultad: " + DIFICULTADES[dificultad];

{
  const b = document.getElementById("opt-puerto2");
  const lee = () => {
    try {
      return localStorage.getItem("sm_puerto2") === "1";
    } catch {
      return false;
    }
  };
  if (b) {
    b.textContent = "Mando: puerto " + (lee() ? 2 : 1);
    b.onclick = () => {
      const si = !lee();
      try {
        localStorage.setItem("sm_puerto2", si ? "1" : "0");
      } catch {}
      b.textContent = "Mando: puerto " + (si ? 2 : 1);
    };
  }
}

$("#opt-vista").textContent = "Vista: " + NOMBRE_VISTA[vista];

document.addEventListener("fullscreenchange", rotular);

if (!document.documentElement.requestFullscreen) $("#opt-pantalla").hidden = true;

rotular();

$("#opt-pixel").onclick = () => texturasPixel.alternar();

aplicarPixel();

let sonido3D = (() => {
  try {
    return localStorage.getItem("sm_3d") === "1";
  } catch {
    return false;
  }
})();

function aplicar3D() {
  audioMGS.setEspacial(sonido3D || R.xr.isPresenting);
  $("#opt-3d").textContent = "Sonido 3D: " + (sonido3D ? "sí" : R.xr.isPresenting ? "sí (VR)" : "no");
}

$("#opt-3d").onclick = () => {
  sonido3D = !sonido3D;
  try {
    localStorage.setItem("sm_3d", sonido3D ? "1" : "0");
  } catch {}
  aplicar3D();
};

aplicar3D();

$("#opt-sonido").onclick = () => {
  sonidoOn = !sonidoOn;
  try {
    localStorage.setItem("sm_sonido", sonidoOn ? "1" : "0");
  } catch {}
  audioMGS.setVolumen(sonidoOn ? .9 : 0);
  $("#opt-sonido").textContent = "Sonido: " + (sonidoOn ? "si" : "no");
  if (sonidoOn) audioMGS.iniciar();
};

audioMGS.setVolumen(sonidoOn ? .9 : 0);

$("#opt-sonido").textContent = "Sonido: " + (sonidoOn ? "si" : "no");

function aplicarOpciones(op) {
  if (op.vista !== vista) cambiarVista(op.vista);
  dificultad = op.dificultad;
  $("#opt-dif").textContent = "Dificultad: " + DIFICULTADES[dificultad];
  inventario.dificultad = dificultad;
  inventario.aplicarMaximos(inventario.nivelHistoria);
  conSombras = op.sombras;
  sombraU.uSombraOn.value = conSombras ? 1 : 0;
  if (op.pantallaCompleta !== undefined) prefPantalla = op.pantallaCompleta;
  sonidoOn = op.sonido;
  audioMGS.setVolumen(sonidoOn ? .9 : 0);
  $("#opt-sonido").textContent = "Sonido: " + (sonidoOn ? "si" : "no");
  rotular();
}

$("#opt-titulo").onclick = () => mostrarTitulo("menu");

$("#opt-partidas").onclick = async () => {
  const r = await partidaUI.cargar();
  if (!r) return;
  usarPartida(Partida.cargar(r.datos));
  if (partida?.visor?.nuevaPartida) {
    delete partida.visor.nuevaPartida;
    await correrDemos((await cargarCadenas())?.partida_nueva?.pasos);
  }
  cambiarModo("jugar", partida.st);
};

let catalogo = [], escenarios = [], personajes = [];

const nombreLindo = n => NOMBRES[n] || n;

const nombreEsc = id => ESCENARIOS_ES[id] || ESCENARIOS_ES[id.replace(/r$/, "")] && ESCENARIOS_ES[id.replace(/r$/, "")] + " (R)" || id;

function limpiar() {
  museoVR.quitar();
  scene.remove(mundo);
  mundo.traverse(o => {
    if (o.isMesh && o.userData.propio) {
      o.geometry.dispose();
    }
  });
  mundo = new THREE.Group;
  scene.add(mundo);
  colisiones = [];
  giran = [];
  colParedes = null;
  colPisos = null;
  recalcularPisos = () => {};
  mapasExcl = null;
  mapasPend = null;
  objsNivel = [];
  olvidarVistos = null;
  esperaRecarga = null;
  hornos = [];
  mezcladores = [];
  patrullas = [];
  itemsNivel = [];
  crearActorNivel = null;
  hzmNivel = new Map;
  efectosGuion.limpiar();
  ctxZako = null;
  zakoPisos.length = 0;
  sensores?.destruir();
  sensores = null;
  camJuego = null;
  armas?.destruir();
  armas = null;
  juego?.destruir();
  juego = null;
  din?.destruir();
  din = null;
  cortarMotionSnake();
  salidas = [];
  cuerpo = null;
  brillos = [];
  armaVista?.removeFromParent();
  $("#hud").hidden = true;
  $("#gameover").hidden = true;
}

function recalcularColisiones() {
  colisiones = [];
  mundo.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.userData.sinColision) return;
    let v = true;
    for (let p = o; p; p = p.parent) if (!p.visible) {
      v = false;
      break;
    }
    if (v) colisiones.push(o);
  });
}

function cartel(texto, sub, ancho = 1.6) {
  if (modo === "museo") return museoVR.cartel(texto, sub, ancho);
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(6,20,10,.92)";
  x.fillRect(0, 0, 512, 160);
  x.strokeStyle = "#7dffa0";
  x.lineWidth = 4;
  x.strokeRect(4, 4, 504, 152);
  x.fillStyle = "#c8ffd8";
  x.font = "bold 44px Consolas, monospace";
  x.textAlign = "center";
  x.fillText(texto.slice(0, 22), 256, 72);
  x.fillStyle = "#7fb08f";
  x.font = "26px Consolas, monospace";
  x.fillText((sub || "").slice(0, 34), 256, 120);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 160 / 512), new THREE.MeshBasicMaterial({
    map: t,
    transparent: true
  }));
  m.userData.propio = true;
  m.userData.sinColision = true;
  return m;
}

function texturaGrilla(color = "#1b2a20", linea = "#2f5a3c") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = color;
  x.fillRect(0, 0, 128, 128);
  x.strokeStyle = linea;
  x.lineWidth = 3;
  x.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function caja(w, h, d, x, y, z, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.userData.propio = true;
  mundo.add(m);
  return m;
}

let yaw = 0, pitch = 0;

function ubicar(x, y, z, ang = 0) {
  rig.position.set(x, y, z);
  yaw = ang;
  pitch = 0;
  vy = 0;
}

const ANIM_DE = nombre => /ippanhei|lopryhei|out_c_m1|mel_hei/.test(nombre) ? "enemy" : /snake|sne_|tux/.test(nombre) ? "snake" : null;

function animador(obj, datos) {
  const raiz = obj.getObjectByName("hueso_0");
  const base = raiz ? raiz.position.toArray() : [ 0, 0, 0 ];
  const mx = new THREE.AnimationMixer(obj);
  mezcladores.push(mx);
  const acciones = {};
  let actual = null;
  return {
    mx: mx,
    tocar(nombre, {fundido: fundido = .25, loop: loop = true, offset: offset = 0, idaVuelta: idaVuelta = false} = {}) {
      if (actual?.nombre === nombre) return actual.accion;
      if (!acciones[nombre]) {
        const c = clip(datos, nombre, base);
        if (!c) return null;
        acciones[nombre] = mx.clipAction(c);
      }
      const a = acciones[nombre];
      a.reset();
      a.setLoop(loop ? idaVuelta ? THREE.LoopPingPong : THREE.LoopRepeat : THREE.LoopOnce);
      a.clampWhenFinished = !loop;
      a.time = offset;
      a.play();
      if (actual) actual.accion.crossFadeTo(a, fundido, false);
      actual = {
        nombre: nombre,
        accion: a
      };
      return a;
    },
    get actual() {
      return actual?.nombre;
    }
  };
}

function aviso(t) {
  const a = $("#aviso");
  a.textContent = t;
  a.style.opacity = 1;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => a.style.opacity = 0, 1800);
}

let armaVista = null, fogonazo = null;

const monturaVR = new THREE.Group;

monturaVR.name = "montura_arma";

const EMPUNADURA = new THREE.Vector3(0, .03, .056);

function alinearArmaVR() {
  const g = monturaVR.parent;
  if (!g || monturaVR.userData.alineada || armaVista?.parent !== monturaVR) return;
  const i = [ 0, 1 ].find(k => R.xr.getControllerGrip(k) === g);
  if (i == null) return;
  const c = R.xr.getController(i);
  if (!c.visible || !g.visible) return;
  monturaVR.quaternion.copy(g.quaternion).invert().multiply(c.quaternion);
  monturaVR.userData.alineada = true;
}

const chispas = [];

const texArma = n => {
  const t = (new THREE.TextureLoader).load(`assets/armas/${n}.png`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
};

async function prepararArma() {
  if (!armaVista) {
    const pistola = await cargar("armas/socom.glb");
    pistola.setRotationFromMatrix((new THREE.Matrix4).makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
    pistola.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material.clone();
      o.material = m;
      m.color?.setScalar?.(1.6);
      o.geometry = o.geometry.clone();
      const P = o.geometry.attributes.position, base = Float32Array.from(P.array), mask = [];
      for (let i = 0; i < P.count; i++) {
        const y = base[i * 3 + 1], z = base[i * 3 + 2];
        if (z > .06 || Math.abs(z + .01) < .004 && y < -.12) mask.push(i);
      }
      corredera = {
        P: P,
        base: base,
        mask: mask
      };
    });
    armaVista = new THREE.Group;
    armaVista.add(pistola);
    pistolaVista = pistola;
    cargar("armas/famas.glb").then(f => {
      f.setRotationFromMatrix((new THREE.Matrix4).makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
      f.traverse(o => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.color?.setScalar?.(1.6);
        }
      });
      f.visible = false;
      rifleVista = f;
      armaVista.add(f);
    }).catch(() => {});
    armaVista.add(new THREE.PointLight(16777215, .6, 1.2));
    fogonazo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texArma("socom_f"),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }));
    fogonazo.scale.set(.16, .16, 1);
    fogonazo.position.set(0, .02, -.25);
    fogonazo.visible = false;
    armaVista.add(fogonazo);
    const geoV = new THREE.CylinderGeometry(.0045, .0045, .018, 6), matV = new THREE.MeshBasicMaterial({
      color: 13213760
    });
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Mesh(geoV, matV);
      v.visible = false;
      v.userData.propio = v.userData.sinColision = true;
      scene.add(v);
      vainas.push({
        m: v,
        vel: new THREE.Vector3,
        giro: new THREE.Vector3,
        t: 0
      });
    }
    const tc = texArma("spark_fl");
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tc,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
      }));
      c.scale.set(.25, .25, 1);
      c.visible = false;
      c.userData.t = 0;
      scene.add(c);
      chispas.push(c);
    }
  }
  ponerArmaEnMano();
}

let corredera = null, pistolaVista = null, rifleVista = null;

const vainas = [];

const anim = {
  kick: 0,
  vk: 0,
  corr: 0,
  bob: 0,
  swayX: 0,
  swayY: 0,
  yawPrev: 0,
  pitchPrev: 0,
  posPrev: new THREE.Vector3
};

function ponerArmaEnMano() {
  if (!armaVista) return;
  if (R.xr.isPresenting) {
    const grip = [ 0, 1 ].map(i => R.xr.getControllerGrip(i)).find(g => g.userData.lado === manoArma()) || R.xr.getControllerGrip(1);
    grip.add(monturaVR);
    monturaVR.add(armaVista);
    monturaVR.userData.alineada = false;
    armaVista.userData.base = {
      p: EMPUNADURA.clone(),
      r: new THREE.Euler(0, 0, 0)
    };
  } else {
    cam.add(armaVista);
    armaVista.userData.base = {
      p: new THREE.Vector3(.17, -.17, -.42),
      r: new THREE.Euler(.04, .12, 0)
    };
  }
  armaVista.position.copy(armaVista.userData.base.p);
  armaVista.rotation.copy(armaVista.userData.base.r);
}

function animarArma(dt) {
  if (!armaVista?.userData.base || dt <= 0) return;
  {
    const equip = (armas ? inventario.arma >= 0 : true) && !miraScope.activo && !miraArma.ocultaArma, fam = equip && inventario?.arma === WP.FAMAS;
    armaVista.userData.equipada = equip;
    if (pistolaVista && pistolaVista.visible !== (equip && !fam)) pistolaVista.visible = equip && !fam;
    if (rifleVista && rifleVista.visible !== fam) {
      rifleVista.visible = fam;
      fogonazo.position.set(0, fam ? .086 : .02, fam ? -.5 : -.25);
    }
  }
  const b = armaVista.userData.base, vr = R.xr.isPresenting;
  const k = 520, c = 30, pasos = Math.ceil(dt / .004), h = dt / pasos;
  for (let i = 0; i < pasos; i++) {
    anim.vk += (-k * anim.kick - c * anim.vk) * h;
    anim.kick += anim.vk * h;
  }
  anim.kick = Math.max(-.4, Math.min(1.2, anim.kick));
  anim.vk = Math.max(-40, Math.min(40, anim.vk));
  const aa = (armas ?? juego)?.arma, vacia = !!aa && (aa.id ?? 0) === WP.SOCOM && aa.balas === 0 && aa.recargando <= 0;
  anim.corr += ((vacia ? 1 : 0) - anim.corr) * Math.min(1, dt * (anim.corr > .5 && !vacia ? 18 : 30));
  if (anim.golpeCorr > 0) {
    anim.golpeCorr -= dt;
    anim.corr = 1;
  }
  if (corredera) {
    const {P: P, base: base, mask: mask} = corredera, a = P.array, off = anim.corr * .022;
    for (const i of mask) a[i * 3 + 1] = base[i * 3 + 1] + off;
    P.needsUpdate = true;
  }
  let bx = 0, by = 0, sx = 0, sy = 0;
  if (!vr) {
    const v = Math.hypot(rig.position.x - anim.posPrev.x, rig.position.z - anim.posPrev.z) / dt;
    anim.posPrev.copy(rig.position);
    const vel = Math.min(v, 7);
    anim.bob += dt * (4 + vel * 1.6) * (vel > .3 ? 1 : .25);
    const amp = Math.min(1, vel / 3) * (agachado ? .5 : 1);
    bx = Math.sin(anim.bob) * .008 * amp;
    by = -Math.abs(Math.cos(anim.bob)) * .01 * amp + Math.sin(performance.now() / 900) * .0015;
    const dyaw = Math.atan2(Math.sin(yaw - anim.yawPrev), Math.cos(yaw - anim.yawPrev)), dpi = pitch - anim.pitchPrev;
    anim.yawPrev = yaw;
    anim.pitchPrev = pitch;
    anim.swayX += (Math.max(-.05, Math.min(.05, dyaw * .6)) - anim.swayX) * Math.min(1, dt * 10);
    anim.swayY += (Math.max(-.05, Math.min(.05, dpi * .6)) - anim.swayY) * Math.min(1, dt * 10);
    sx = anim.swayX;
    sy = anim.swayY;
  }
  let rd = 0;
  if (juego && (armas ?? juego).arma.recargando > 0) rd = Math.sin(Math.PI * Math.max(0, 1 - (armas ?? juego).arma.recargando / (armas?.recargaDur || 36)));
  const baseX = vr ? b.p.x : .05 + .12 * Math.min(1, cam.aspect / 1.6);
  const ga = armas?.estadoAnim?.(), g = {
    y: 0,
    z: 0,
    rx: 0
  };
  if (ga && !vr) {
    if (ga.tipo === "mantiene") {
      const k = Math.min(1, ga.t / .2);
      g.y = .06 * k;
      g.z = .07 * k;
      g.rx = .55 * k;
    } else if (ga.tipo === "tira") {
      const p = Math.min(1, ga.t / .23), q = Math.max(0, Math.min(1, (ga.t - .23) / .45));
      if (ga.t < .23) {
        g.y = .06 - .18 * p;
        g.z = .07 - .27 * p;
        g.rx = .55 - 1.45 * p;
      } else {
        g.y = -.12 * (1 - q);
        g.z = -.2 * (1 - q);
        g.rx = -.9 * (1 - q);
      }
    } else if (ga.tipo === "pone" || ga.tipo === "poneGuardia") {
      const s = Math.sin(Math.PI * Math.min(1, ga.t / .55));
      g.y = -.2 * s;
      g.z = -.12 * s;
      g.rx = -.7 * s;
    }
  }
  {
    const mod = armaVista.userData.modelo;
    if (mod && mod !== pistolaVista) {
      const ver = !armas?.manoVacia?.() && !miraArma.ocultaArma;
      if (mod.visible !== ver) mod.visible = ver;
    }
  }
  armaVista.position.set(baseX + bx + sx * .4, b.p.y + by - rd * .12 - sy * .3 + g.y, b.p.z + anim.kick * .06 + g.z);
  armaVista.rotation.set(b.r.x + anim.kick * .22 - rd * .6 + g.rx, b.r.y + sx, b.r.z + rd * .35 + sx * .5);
  for (const vn of vainas) {
    if (!vn.m.visible) continue;
    vn.t += dt;
    vn.vel.y -= 9.8 * dt;
    vn.m.position.addScaledVector(vn.vel, dt);
    vn.m.rotation.x += vn.giro.x * dt;
    vn.m.rotation.z += vn.giro.z * dt;
    if (vn.t > .9) vn.m.visible = false;
  }
}

function armaEnManoTercera(wId, ver) {
  if (!cuerpo) return;
  const M = cuerpo.armas3 ||= new Map;
  if (cuerpo.arma && !M.has("armas/socom.glb")) M.set("armas/socom.glb", cuerpo.arma);
  const ruta = !armas ? "armas/socom.glb" : wId >= 0 ? armas.arma.modelo : null, C = cuerpo;
  if (ruta && !M.has(ruta)) {
    M.set(ruta, null);
    cargar(ruta).then(m => {
      const h = C.obj.getObjectByName("hueso_4");
      if (!h) return;
      m.visible = false;
      h.add(m);
      M.set(ruta, m);
    }).catch(() => {});
  }
  for (const [r, m] of M) if (m && m.visible !== (ver && r === ruta)) m.visible = ver && r === ruta;
}

let laserSocom = null;

function actualizarLaser() {
  const xr = R.xr.isPresenting;
  if (xr) for (let i = 0; i < 2; i++) {
    const c = R.xr.getController(i), enArma = !!armaVista?.visible && !!armaVista.userData.equipada && c.userData.lado === manoArma();
    if (c.userData.rayito && c.userData.rayito.visible === enArma) c.userData.rayito.visible = !enArma;
  }
  const ok = !!armas && !!juego && modo === "escenarios" && inventario.arma === WP.SOCOM && !inventario.abierto && !muerteSnake && !enDemo && !demo.ocupada && !camLibre.activa && !ducto.activo && !armas.manoVacia?.() && !enPausa() && !codec.abierto;
  if (!ok || !(xr || cuadradoApretado())) {
    if (laserSocom) laserSocom.visible = false;
    return;
  }
  if (!laserSocom) {
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.Float32BufferAttribute([ 0, 0, 0, 0, 0, 0 ], 3));
    laserSocom = new THREE.Line(g, new THREE.LineBasicMaterial({
      color: 16727871,
      transparent: true,
      opacity: .9,
      depthWrite: false,
      toneMapped: false
    }));
    laserSocom.frustumCulled = false;
    laserSocom.userData.sinColision = true;
    laserSocom.raycast = () => {};
    scene.add(laserSocom);
  }
  const m = miraSnake(), o = new THREE.Vector3;
  if (!terceraPersona() && fogonazo && armaVista?.visible) {
    armaVista.updateMatrixWorld(true);
    fogonazo.getWorldPosition(o);
  } else {
    const a = cuerpo?.armas3?.get(armas.arma.modelo) || cuerpo?.arma;
    if (!a?.visible) {
      laserSocom.visible = false;
      return;
    }
    a.getWorldPosition(o);
    o.addScaledVector(m.d, .22);
  }
  const h = primerGolpe(m.o, m.d, 10, colParedes ? colParedes.concat(colisiones) : colisiones);
  const fin = h?.point || m.o.clone().addScaledVector(m.d, 10);
  const a = laserSocom.geometry.attributes.position;
  a.setXYZ(0, o.x, o.y, o.z);
  a.setXYZ(1, fin.x, fin.y, fin.z);
  a.needsUpdate = true;
  laserSocom.visible = true;
}

function expulsarVaina() {
  const vn = vainas.find(x => !x.m.visible) || vainas[0];
  if (!vn || !armaVista) return;
  armaVista.updateMatrixWorld(true);
  const q = new THREE.Quaternion;
  armaVista.getWorldQuaternion(q);
  vn.m.position.copy(new THREE.Vector3(.012, .035, -.04).applyMatrix4(armaVista.matrixWorld));
  vn.vel.set(1.6 + Math.random() * .6, 1.4 + Math.random() * .5, .3).applyQuaternion(q);
  vn.giro.set(20 + Math.random() * 10, 0, 15);
  vn.t = 0;
  vn.m.visible = true;
}

function disparo(origen, dir) {
  if (!juego || vuelo) return;
  const r = armas ? armas.disparar(origen, dir) : juego.disparar(origen, dir);
  if (!armas) ctl.vibrarDisparo();
  if (r && !r.impacto && r.retroceso) anim.vk += r.retroceso;
  if (!r || !r.impacto) return;
  efectoTiro(r, origen, dir);
}

function efectoTiro(r, origen, dir) {
  const gs = sensores?.golpeBala(origen, dir);
  if (gs && gs.punto.distanceTo(origen) < r.impacto.distanceTo(origen)) r.impacto.copy(gs.punto);
  {
    const gx = din?.extras?.golpeBala(origen, dir, r.impacto);
    if (gx) r.impacto.copy(gx.punto);
  }
  if (fogonazo) {
    fogonazo.visible = true;
    fogonazo.material.rotation = Math.random() * 6.28;
    fogonazo.scale.setScalar(.13 + Math.random() * .08);
    clearTimeout(fogonazo.userData.t);
    fogonazo.userData.t = setTimeout(() => fogonazo.visible = false, 50);
  }
  fogonazoTercera();
  anim.vk += r.retroceso ?? 9;
  anim.golpeCorr = .04;
  expulsarVaina();
  if (r.trazadora) return;
  const c = chispas.find(x => !x.visible) || chispas[0];
  if (!c) return;
  c.position.copy(r.impacto).addScaledVector(dir, -.05);
  c.visible = true;
  setTimeout(() => c.visible = false, 110);
}

function tiroRafaga(r, o, d) {
  if (!r?.impacto) return;
  if (terceraPersona()) {
    tApunta = Math.max(tApunta, .8);
  }
  efectoTiro(r, o, d);
}

const BOCA_ARMA = {
  "armas/socom.glb": [ 0, -.25, .02 ],
  "armas/socom2.glb": [ 0, -.36, .02 ],
  "armas/famas.glb": [ 0, -.5, .086 ]
};

let fogonazo3 = null;

function fogonazoTercera() {
  if (!cuerpo?.armas3 || !terceraPersona()) return;
  let m = null, ruta = null;
  for (const [k, x] of cuerpo.armas3) if (x?.visible) {
    m = x;
    ruta = k;
    break;
  }
  if (!m) return;
  if (!fogonazo3) {
    fogonazo3 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texArma("socom_f"),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    }));
    fogonazo3.userData.propio = fogonazo3.userData.sinColision = true;
    fogonazo3.renderOrder = 5;
  }
  let b = BOCA_ARMA[ruta];
  if (!b) {
    const box = (new THREE.Box3).setFromObject(m, true), inv = (new THREE.Matrix4).copy(m.matrixWorld).invert();
    box.applyMatrix4(inv);
    b = [ 0, box.min.y, .05 ];
    BOCA_ARMA[ruta] = b;
  }
  if (fogonazo3.parent !== m) m.add(fogonazo3);
  fogonazo3.position.set(b[0], b[1], b[2]);
  fogonazo3.material.rotation = Math.random() * 6.28;
  fogonazo3.scale.setScalar(.22 + Math.random() * .1);
  fogonazo3.visible = true;
  clearTimeout(fogonazo3.userData.t);
  fogonazo3.userData.t = setTimeout(() => {
    if (fogonazo3) fogonazo3.visible = false;
  }, 50);
}

function dispararDesdeCamara() {
  const o = new THREE.Vector3, d = new THREE.Vector3;
  if (camaraJuegoActiva()) {
    o.copy(rig.position);
    o.y += agachado ? .7 : 1.25;
    d.set(-Math.sin(rumbo), 0, -Math.cos(rumbo));
    let mejor = null, md = 18;
    for (const g of patrullas) {
      if (g.inactivo || [ "muerto" ].includes(g.estado)) continue;
      const v = g.o.position.clone();
      v.y += 1.1;
      v.sub(o);
      const dist = v.length();
      v.normalize();
      if (dist < md && v.dot(d) > Math.cos(.6)) {
        md = dist;
        mejor = v;
      }
    }
    if (mejor) {
      d.copy(mejor);
      rumbo = Math.atan2(-d.x, -d.z);
    }
  } else {
    cam.getWorldPosition(o);
    cam.getWorldDirection(d);
    if (terceraPersona()) apuntarDesdeSnake(o, d);
  }
  tApunta = .8;
  tDisparo = 7 / 30;
  disparo(o, d);
}

async function construirMuseo() {
  limpiar();
  luzOriginal = false;
  aplicarLuz();
  scene.background = new THREE.Color(0);
  museoVR.poner(scene);
  const todos = $("#museo-todos").checked;
  const porNombre = Object.fromEntries(catalogo.map(c => [ c.nombre, c ]));
  const pjs = MUSEO.map(n => porNombre[n]).filter(Boolean);
  if (todos) for (const c of personajes) if (!MUSEO.includes(c.nombre)) pjs.push(c);
  const grandes = MUSEO_GRANDES.map(g => ({
    ...g,
    cats: g.partes.map(n => porNombre[n]).filter(Boolean)
  })).filter(g => g.cats.length);
  const SEP = 3.2, filas = Math.ceil(pjs.length / 2), L = 8 + filas * SEP, AN = 11, AL = 5;
  const piso = new THREE.MeshStandardMaterial({
    map: texturaGrilla(),
    roughness: .9
  });
  piso.map.repeat.set(AN / 2, L / 2);
  const pared = new THREE.MeshStandardMaterial({
    color: 1582108,
    roughness: 1
  });
  caja(AN, .2, L, 0, -.1, -L / 2 + 2, piso);
  caja(AN, .2, L, 0, AL + .1, -L / 2 + 2, pared).userData.sinColision = true;
  caja(.3, AL, L, -AN / 2, AL / 2, -L / 2 + 2, pared);
  caja(.3, AL, L, AN / 2, AL / 2, -L / 2 + 2, pared);
  caja(AN, AL, .3, 0, AL / 2, 2, pared);
  const titulo = cartel("SHADOW MOSES", "ARCHIVO DE PERSONAJES", 4);
  titulo.position.set(0, 3.4, 1.8);
  titulo.rotation.y = Math.PI;
  mundo.add(titulo);
  const t2 = cartel("SHADOW MOSES", "ARCHIVO DE PERSONAJES", 4);
  t2.position.set(0, 3.4, 1.84);
  mundo.add(t2);
  const ped = new THREE.MeshStandardMaterial({
    color: 2241320,
    roughness: .6,
    metalness: .3
  });
  const aro = new THREE.MeshBasicMaterial({
    color: 4045670
  });
  if (grandes.length) {
    const HA = 70, HL = 70, HY = 26, z0 = -L + 2;
    const p2 = new THREE.MeshStandardMaterial({
      map: texturaGrilla("#141d17", "#284a33"),
      roughness: .9
    });
    p2.map.repeat.set(HA / 4, HL / 4);
    caja(HA, .2, HL, 0, -.1, z0 - HL / 2, p2);
    caja(HA, HY, .3, 0, HY / 2, z0 - HL, pared);
    caja(.3, HY, HL, -HA / 2, HY / 2, z0 - HL / 2, pared);
    caja(.3, HY, HL, HA / 2, HY / 2, z0 - HL / 2, pared);
    caja((HA - AN) / 2, HY, .3, -(AN / 2 + (HA - AN) / 4), HY / 2, z0, pared);
    caja((HA - AN) / 2, HY, .3, AN / 2 + (HA - AN) / 4, HY / 2, z0, pared);
    grandes.forEach(async (g, i) => {
      const o = new THREE.Group;
      for (const c of g.cats) o.add(await cargar(c.archivo));
      const n = grandes.length, x = (i - (n - 1) / 2) * (HA / Math.max(n, 1));
      const caja3 = (new THREE.Box3).setFromObject(o);
      o.position.set(x - (caja3.min.x + caja3.max.x) / 2, -caja3.min.y, z0 - HL / 2 - (caja3.min.z + caja3.max.z) / 2);
      mundo.add(o);
      const k = cartel(g.nombre, g.partes.join(" + "), 3);
      k.position.set(x, 1.2, z0 - 4);
      mundo.add(k);
    });
  }
  pjs.forEach(async (c, i) => {
    const lado = i % 2 ? 1 : -1, x = lado * 3, z = -1.5 - Math.floor(i / 2) * SEP;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, .8, .3, 24), ped);
    base.position.set(x, .15, z);
    base.userData.propio = true;
    mundo.add(base);
    const r = new THREE.Mesh(new THREE.TorusGeometry(.72, .02, 6, 32), aro);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, .3, z);
    r.userData.propio = r.userData.sinColision = true;
    mundo.add(r);
    const k = cartel(nombreLindo(c.nombre), `${c.nombre} · ${c.caras} caras`, 1.4);
    k.position.set(lado * (AN / 2 - .2), 2.75, z);
    k.rotation.y = -lado * Math.PI / 2;
    mundo.add(k);
    const o = await cargar(c.archivo);
    o.position.y = -(new THREE.Box3).setFromObject(o).min.y;
    const piv = new THREE.Group;
    piv.position.set(x, .3, z);
    piv.rotation.y = -lado * Math.PI / 2;
    piv.add(o);
    mundo.add(piv);
    giran.push(piv);
  });
  museoVR.estilizar(mundo);
  ubicar(0, 0, 1.4, 0);
  recalcularColisiones();
  setTimeout(recalcularColisiones, 300);
  ayuda();
}

$("#museo-entrar").onclick = () => pedirMouse();

$("#museo-todos").onchange = () => construirMuseo();

let filtro = "personaje", selCat = null;

function listaCatalogo() {
  const q = $("#cat-buscar").value.trim().toLowerCase();
  const items = catalogo.filter(c => (filtro === "todo" || filtro === "nombre" && c.con_nombre || c.categoria === filtro) && (!q || c.nombre.includes(q) || nombreLindo(c.nombre).toLowerCase().includes(q))).sort((a, b) => !!NOMBRES[b.nombre] - !!NOMBRES[a.nombre] || b.con_nombre - a.con_nombre || a.nombre.localeCompare(b.nombre));
  const L = $("#cat-lista");
  L.innerHTML = "";
  for (const c of items.slice(0, 600)) {
    const d = document.createElement("div");
    d.innerHTML = `<span>${nombreLindo(c.nombre)}</span><span class="k">${c.caras} c</span>`;
    if (c === selCat) d.className = "sel";
    d.onclick = () => {
      selCat = c;
      verModelo(c);
      listaCatalogo();
    };
    L.appendChild(d);
  }
}

async function verModelo(c) {
  limpiar();
  scene.background = new THREE.Color(725517);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(Math.max(1.2, c.ancho * .8), 48), new THREE.MeshStandardMaterial({
    map: texturaGrilla(),
    roughness: 1
  }));
  piso.material.map.repeat.set(6, 6);
  piso.rotation.x = -Math.PI / 2;
  piso.userData.propio = true;
  mundo.add(piso);
  const o = await cargar(c.archivo);
  const b = (new THREE.Box3).setFromObject(o), ctr = b.getCenter(new THREE.Vector3), tam = b.getSize(new THREE.Vector3);
  o.position.set(-ctr.x, -b.min.y, -ctr.z);
  mundo.add(o);
  const sel = $("#cat-anim");
  sel.innerHTML = "";
  sel.hidden = true;
  const fuente = ANIM_DE(c.nombre);
  if (fuente && c.piezas >= 16) {
    const datos = await cargarAnims(fuente);
    if (datos.huesos === c.piezas || fuente === "snake" && c.piezas >= 16) {
      const an = animador(o, datos);
      const ini = Object.keys(datos.clips)[0];
      sel.innerHTML = '<option value="">(pose de reposo)</option>' + Object.keys(datos.clips).map(k => `<option>${k}</option>`).join("");
      sel.hidden = false;
      sel.onchange = () => {
        if (sel.value) {
          o.position.y = 0;
          an.tocar(sel.value, {
            fundido: .15
          });
        } else {
          an.mx.stopAllAction();
          o.position.y = -b.min.y;
        }
      };
      if (fuente === "enemy") {
        sel.value = "parado";
        sel.onchange();
      }
    }
  }
  const r = Math.max(tam.x, tam.y, tam.z, .3);
  camOrb.position.set(r * .9, tam.y * .6 + r * .3, r * 1.6);
  orbita.target.set(0, tam.y / 2, 0);
  orbita.update();
  ubicar(0, 0, Math.max(2.5, r * 1.2), 0);
  const esc = c.escenarios.map(nombreEsc).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5).join("\n  ");
  $("#cat-info").textContent = `${nombreLindo(c.nombre)}  (${c.nombre})\n${c.categoria} · ${c.piezas} piezas · ${c.caras} caras · ${c.texturas} texturas\n${tam.y.toFixed(2)} m de alto · ${Math.max(tam.x, tam.z).toFixed(2)} m de ancho\nAparece en:\n  ${esc}`;
}

$("#cat-buscar").oninput = listaCatalogo;

document.querySelectorAll("#cat-filtros .btn").forEach(b => b.onclick = () => {
  filtro = b.dataset.f;
  document.querySelectorAll("#cat-filtros .btn").forEach(x => x.classList.toggle("activo", x === b));
  listaCatalogo();
});

function llenarEscenarios() {
  const S = $("#esc-sel");
  S.innerHTML = "";
  const grupos = {
    Juego: [],
    "Cinemáticas": [],
    "VR Training": [],
    Otros: []
  };
  for (const e of escenarios) {
    const g = /^s\d/.test(e.id) ? "Juego" : /^d\d/.test(e.id) ? "Cinemáticas" : /^vr/.test(e.id) ? "VR Training" : "Otros";
    grupos[g].push(e);
  }
  for (const [g, es] of Object.entries(grupos)) {
    if (!es.length) continue;
    const og = document.createElement("optgroup");
    og.label = g;
    for (const e of es) {
      const o = document.createElement("option");
      o.value = e.id;
      o.textContent = `${e.id} · ${nombreEsc(e.id)}`;
      og.appendChild(o);
    }
    S.appendChild(og);
  }
  const L = $("#esc-lista");
  L.innerHTML = "";
  for (const og of S.querySelectorAll("optgroup")) {
    const g = document.createElement("div");
    g.className = "grupo";
    g.textContent = og.label;
    L.appendChild(g);
    for (const o of og.querySelectorAll("option")) {
      const d = document.createElement("div");
      d.dataset.id = o.value;
      d.innerHTML = `<span>${nombreEsc(o.value)}</span><span class="k">${o.value}</span>`;
      d.onclick = () => {
        S.value = o.value;
        S.dispatchEvent(new Event("change"));
        marcarEscenario();
        if (TACTIL) cerrarMenu();
      };
      L.appendChild(d);
    }
  }
  const P = $("#esc-pj");
  P.innerHTML = "";
  for (const c of personajes.filter(c => NOMBRES[c.nombre])) {
    const o = document.createElement("option");
    o.value = c.nombre;
    o.textContent = nombreLindo(c.nombre);
    P.appendChild(o);
  }
}

function marcarEscenario() {
  const v = $("#esc-sel").value;
  for (const d of document.querySelectorAll("#esc-lista div[data-id]")) d.classList.toggle("sel", d.dataset.id === v);
}

let cargaEnCurso = Promise.resolve(), pedidoCarga = 0, cargandoNivel = false;

async function cargarEscenario(id, entrada = null) {
  const mio = ++pedidoCarga, previa = cargaEnCurso;
  let fin;
  cargaEnCurso = new Promise(r => fin = r);
  try {
    await previa;
    if (mio !== pedidoCarga) {
      debug.log("carga", `${id} salteado (pidieron otro escenario)`);
      return;
    }
    cargandoNivel = true;
    if (window.mgsOffline && !await window.mgsOffline.antesDeCargar(id)) {
      debug.log("carga", `${id} cancelado: sin señal`);
      return;
    }
    const conPantalla = modo === "escenarios" || modo === "jugar" || !!entrada;
    if (conPantalla) mostrarCarga(true);
    const tCarga = performance.now();
    debug.log("carga", `escenario ${id}` + (entrada ? ` (desde ${entrada.desde})` : ""));
    try {
      await cargarEscenario2(id, entrada);
      debug.log("carga", `${id} listo en ${((performance.now() - tCarga) / 1e3).toFixed(1)} s`);
      if (conPantalla) {
        barraCarga(true);
        await Promise.all([ esperarAcomodo(), precalentar(R, scene, cam).then(r => debug.log("carga", `shaders: ${r.programas} programas, ${r.texturas} texturas en ${r.ms} ms`)).catch(() => {}) ]);
      }
    } catch (e) {
      debug.log("error", `no cargó ${id}: ${e.message}`, e.stack?.slice(0, 600));
      window.mgsOffline?.fallo(id, e, () => cargarEscenario(id, entrada));
      throw e;
    } finally {
      if (conPantalla) mostrarCarga(false);
    }
  } finally {
    cargandoNivel = false;
    fin();
  }
}

const resueltos = new Map;

function liberarCache() {
  const usadas = new Set;
  for (const [url, g] of resueltos) if (/^armas\//.test(url)) g.scene.traverse(o => {
    if (o.isMesh && o.material.map) usadas.add(o.material.map);
  });
  for (const url of [ ...cache.keys() ]) {
    if (/^armas\//.test(url)) continue;
    cache.delete(url);
    const g = resueltos.get(url);
    resueltos.delete(url);
    g?.scene.traverse(o => {
      if (o.isMesh) o.geometry.dispose();
    });
  }
  for (const [k, t] of texturasCompartidas) if (!usadas.has(t)) {
    t.source?.data?.close?.();
    t.dispose();
    texturasCompartidas.delete(k);
    texturas.delete(t);
  }
}

async function cargarEscenario2(id, entrada = null) {
  entradaActual = entrada;
  partida?.alSalirEscenario();
  if (modo === "escenarios") {
    limpiar();
    liberarCache();
  }
  if ($("#esc-sel").value !== id) $("#esc-sel").value = id;
  marcarEscenario();
  limpiar();
  luzOriginal = true;
  aplicarLuz();
  scene.background = new THREE.Color(329738);
  $("#capas").innerHTML = "";
  $("#nivel-info").textContent = "";
  const nv = await fetch(`assets/niveles/${id}/nivel.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  if (nv) return cargarNivel(nv, entrada);
  const e = escenarios.find(x => x.id === id);
  if (!e) return;
  const box = $("#partes");
  box.innerHTML = "";
  const objs = await Promise.all(e.partes.map(p => cargar(p.archivo)));
  objs.forEach((o, i) => {
    const p = e.partes[i];
    o.name = p.nombre;
    mundo.add(o);
    const l = document.createElement("label");
    l.className = "chk";
    l.innerHTML = `<input type="checkbox" checked> ${p.nombre} · ${p.caras} caras · ${p.ancho.toFixed(0)} m`;
    l.querySelector("input").onchange = ev => {
      o.visible = ev.target.checked;
      recalcularColisiones();
    };
    box.appendChild(l);
  });
  recalcularColisiones();
  aparecer(objs[0]);
  ayuda();
}

const _snG = {
  pos: null,
  dir: 0,
  estado: 0,
  botones: 0,
  primeraPersona: false
};

let botonesGuion = 0;

function snakeGuion(consumir = true) {
  const pp = !terceraPersona();
  let yawG = pp ? yaw : rumbo;
  if (R.xr.isPresenting && pp) {
    const d = new THREE.Vector3;
    R.xr.getCamera().getWorldDirection(d);
    yawG = Math.atan2(-d.x, -d.z);
  } else if (R.xr.isPresenting && pared?.n) yawG = Math.atan2(pared.n.x, pared.n.z);
  _snG.pos = rig.position;
  _snG.dir = dirDesdeYaw(yawG);
  _snG.primeraPersona = pp;
  const quieto = ![ "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight" ].some(k => teclas[k]) && Math.hypot(tac.x, tac.y) < .2 && !(padDemo.activo && (pdMov.f || pdMov.s));
  const subjetiva = camaraJuegoActiva() && !!camJuego?.primeraPersona;
  const mira = subjetiva && quieto && !(botonesGuion & 32);
  _snG.estado = estadoSnake({
    agachado: agachado,
    reptando: reptando,
    primeraPersona: mira,
    pared: !!pared && !pp && !R.xr.isPresenting,
    caja: !!inventario.enCaja
  }) | (ducto.activo ? ESTADO.INTRUDE : 0);
  _snG.botones = botonesGuion;
  if (consumir) botonesGuion = 0;
  return _snG;
}

const otrosGuion = () => patrullas.filter(g => g.o.visible && !g.inactivo).map(g => ({
  nombre: g.nombre,
  pos: g.o.position
}));

async function crearDesdeGuion(a) {
  if (!crearActorNivel || !mundo) return false;
  if (esJefe(a)) return !!(ctxJefes && crearJefe(a, ctxJefes));
  if (esZako(a)) {
    const z = ctxZako && crearZako(a, ctxZako);
    a._objs = [];
    return z ? Promise.resolve(z.cargando || z).then(x => !!x) : false;
  }
  if (esMeryl(a)) return !!(ctxPersonajes && crearMeryl(a, ctxPersonajes));
  if (a.tipo === "DEMOCANCEL") return demoCancel.iniciar(a, {
    cancelar: () => guion.cancelarVoz?.(),
    vozSonando: () => !!codec.vozJuego,
    fundido: n => efectosGuion.efecto({
      tipo: "FADEIO",
      nombre: "democancel",
      opts: {
        m: [ 0 ],
        s: [ n ]
      }
    }),
    alTerminar: () => guion.eventoActor(a, "p", [])
  });
  if (a.tipo === "LIFEUP") return lifeUp.iniciar(a, {
    vida: () => inventario.getVida(),
    setVida: v => inventario.setVida(v),
    max: () => inventario.vidaMax,
    setMax: x => {
      const v = inventario.getVida();
      inventario.vidaMax = x;
      inventario.setVida(v);
    },
    se: id => audioMGS.se(id),
    alTerminar: () => {
      guion.eventoActor(a, "e", []);
      padGuion.suelto = false;
    }
  });
  if (a.tipo === "MOVIE" || a.tipo === "ENDINGROLL" || a.tipo === "ED_TELOP") return movie.iniciar(a, {
    negro: si => {
      const f = $("#fundido");
      if (f) f.style.opacity = si ? 1 : 0;
    },
    alTerminar: () => guion.eventoActor(a, "p", [])
  });
  if (a.tipo === "10A_DEMO") return escena10A.iniciar(a, {
    snake: () => new THREE.Vector3(rig.position.x, rig.position.y + (reptando ? .25 : agachado ? .5 : 1), rig.position.z),
    inventario: inventario,
    se: id => audioMGS.se(id),
    alTerminar: () => guion.eventoActor(a, "p", [])
  });
  if (a.tipo === "WAKE") return despertar.iniciar(a);
  if (a.tipo === "PADCONTROL") return padDemo.iniciarControl(a, {
    st: $("#esc-sel").value,
    alTerminar: () => {
      finPadDemo(null, null);
      guion.eventoActor(a, "p", []);
    }
  });
  if (a.tipo === "10A_DEMO" || a.tipo === "11B_DEMO") return escenaPendiente.iniciar(a, {
    alTerminar: () => guion.eventoActor(a, "p", [])
  });
  if (a.tipo === "PADDEMO") return padDemo.iniciar(a, {
    st: $("#esc-sel").value,
    vozLista: () => !!codec.vozJuego,
    alTerminar: arg => {
      padGuion.suelto = false;
      finPadDemo(a, arg);
    }
  });
  if (a.tipo === "INTRUDECAM") return ducto.camaraIntrusa(a);
  if (a.tipo === "ELEVPANEL") {
    if (!din) return false;
    din.panelAscensor(a);
    return true;
  }
  if (a.tipo === "DYNWALL") {
    const m = paredDinamica(a, THREE);
    if (!m || !colParedes) return false;
    mundo.add(m);
    colParedes.push(m);
    a._objs = [ m ];
    return true;
  }
  if (din?.extras?.maneja(a)) {
    const ok = await din.extras.crear(a);
    recalcularColisiones();
    recalcularPisos();
    return ok;
  }
  if (TIPOS_SENSOR.has(a.tipo) && sensores?.agregar) return !!sensores.agregar(a);
  if ([ "FEWDAMAGE", "WT_AREA", "WT_AREA2", "SNEBREATH", "TRUCKTRAP" ].includes(a.tipo)) {
    if (!juego) return false;
    juego.actoresJuego([ a ], {
      proc: (id, args) => guion.correrProc(id, args)
    });
    return true;
  }
  if (a.tipo === "ASIOTOKUN") {
    armarAsioto(a);
    return true;
  }
  if (!TIPOS_VISOR.has(a.tipo) && !(a.modelo && a.p)) return false;
  const antes = new Set(mundo.children);
  await crearActorNivel(a);
  a._objs = mundo.children.filter(o => !antes.has(o));
  recalcularColisiones();
  recalcularPisos();
  return true;
}

const TIPOS_ENTRADA_6B = new Set([ ...TIPOS_SENSOR, "FEWDAMAGE", "WT_AREA", "WT_AREA2", "SNEBREATH", "TRUCKTRAP", "ASIOTOKUN", ...TIPOS_GUION ]);

const mesgEntrada = {
  st: null,
  l: []
};

async function crearSinCrearEntrada(nv, vivos) {
  const pend = mesgEntrada.st === nv.id ? mesgEntrada.l : [];
  mesgEntrada.l = [];
  const T = guion.traza;
  let iE = T.length - 1;
  while (iE >= 0 && !(T[iE].que === "escenario" && T[iE].st === nv.id)) iE--;
  const ks = new Set;
  for (let j = iE - 1; j >= 0 && T[j].que !== "escenario" && T[j].que !== "load"; j--) if (T[j].que === "entrada-sin-crear" && TIPOS_ENTRADA_6B.has(T[j].tipo)) ks.add(T[j].k);
  if (!ks.size || guion.st !== nv.id) return;
  const nombres = new Set;
  for (const a of deLaEntrada(nv, guion, TIPOS_ENTRADA_6B)) {
    if (!a.guion || !ks.has(a.k)) continue;
    const igual = x => x.tipo === a.tipo && x.nombre === a.nombre;
    if (vivos.some(x => igual(x) && !x.evento) || sensores?.lista?.some(igual) || din?.extras?.actores?.some(x => x.a && igual(x.a)) || a.tipo === "ASIOTOKUN" && asioto) continue;
    if (TIPOS_SENSOR.has(a.tipo) && a.mapa != null && !(nv.visibles?.length ? nv.visibles : [ nv.principal ]).includes(a.mapa)) continue;
    ks.delete(a.k);
    const ok = await crearDesdeGuion(a);
    if (ok !== false) {
      guion.creados.push(a);
      if (a.nombre != null) nombres.add(a.nombre);
      debug.log("guion", `entrada: ${a.tipo} #${(a.nombre & 65535).toString(16)} (k ${a.k}) creado con el progreso de ahora`);
    }
  }
  for (const [d, v] of pend) if (nombres.has(d)) guion.op.mensaje(d, v, {
    trampa: false,
    entrada: false,
    origen: {
      tipo: "entrada"
    }
  });
}

function vaciarNivelPorReinicio() {
  if (!mapasExcl || !mundo) return false;
  const fuera = o => !o || !o.parent;
  for (const o of objsNivel) {
    const a = o.userData?.actor;
    if (a) din?.extras?.quitar(a);
    o.removeFromParent();
    const i = colParedes ? colParedes.indexOf(o) : -1;
    if (i >= 0) colParedes.splice(i, 1);
  }
  objsNivel = [];
  const filtrar = (lista, f) => {
    for (let i = lista.length - 1; i >= 0; i--) if (f(lista[i])) lista.splice(i, 1);
  };
  filtrar(itemsNivel, it => fuera(it.obj));
  filtrar(giran, fuera);
  if (din) {
    for (const p of din.puertas) if (fuera(p.o) && p.pared) {
      const i = colParedes.indexOf(p.pared);
      if (i >= 0) colParedes.splice(i, 1);
    }
    din.puertas = din.puertas.filter(p => !fuera(p.o));
    for (const E of din.elevadores) if (fuera(E.o)) E.o2?.removeFromParent();
    din.elevadores = din.elevadores.filter(E => !fuera(E.o));
  }
  for (const g of patrullas) if (fuera(g.o)) {
    g.inactivo = true;
    g.borrado = true;
  }
  juego?.__zakos?.destruir();
  olvidarVistos?.();
  recalcularColisiones();
  recalcularPisos();
  return true;
}

function destruirDesdeGuion(a) {
  destruirMeryl(a);
  din?.extras?.quitar(a);
  sensores?.quitar?.(a);
  for (const o of a._objs || []) {
    o.removeFromParent();
    const i = colParedes ? colParedes.indexOf(o) : -1;
    if (i >= 0) colParedes.splice(i, 1);
  }
  for (const g of patrullas) if (g.o.userData.guardia === a) {
    g.inactivo = true;
    g.borrado = true;
    g.o.visible = false;
  }
  recalcularColisiones();
  recalcularPisos();
}

function luzDesdeGuion({d: d, c: c, a: a}) {
  luzNivel = luzNivel || {
    luces: [],
    amb: [ 0, 0, 0 ],
    main: null
  };
  if (a) luzNivel.amb = a;
  const dir = d || luzNivel.main?.[0], col = c || luzNivel.main?.[1];
  if (dir && col) {
    const v = new THREE.Vector3(...dir);
    if (v.lengthSq() > 0) {
      v.normalize();
      luzNivel.main = [ v.toArray(), col ];
      if (v.y < -.5) dirSombra.copy(v);
    }
  }
}

async function cargarDesdeGuion(st, info) {
  const desde = $("#esc-sel").value;
  if (st === "rank") {
    debug.log("guion", "fin del juego: rank → pantalla del rango");
    movie.cortar();
    codec.pararVozJuego?.();
    audioMGS.codigo(4278190334);
    audioMGS.cancion(0);
    document.exitPointerLock?.();
    rango.iniciar({
      vars: guion.vars,
      frames: partida ? partida.frames : null,
      se: id => audioMGS.se(id),
      partidaAbierta: () => partidaUI.abierta,
      guardar: p => partidaUI.guardar(p),
      alTerminar: () => mostrarTitulo("titulo")
    });
    return;
  }
  if (cambiando || st === desde && !info.recarga) return;
  cambiando = true;
  const f = $("#fundido");
  if (f) f.style.opacity = 1;
  try {
    if (st[0] === "d") {
      const c = (await cargarCadenas())?.entrada_cadena?.[st];
      if (c?.pasos?.length) await correrDemos(c.pasos);
      if (c?.destino?.[0] === "s") {
        await cargarEscenario(c.destino, {
          desde: desde,
          via: st
        });
        return;
      }
    }
    await cargarEscenario(st, {
      p: info.p?.some(v => v) ? info.p : null,
      rot: info.rot,
      desde: desde
    });
  } finally {
    cambiando = false;
    if (f) setTimeout(() => f.style.opacity = 0, 150);
  }
}

const MM = .001, ANG = Math.PI * 2 / 4096;

const v3 = p => new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM);

let colParedes = null, colPisos = null;

let recalcularPisos = () => {};

function capa(nombre, etiqueta, visible) {
  const g = new THREE.Group;
  g.name = nombre;
  g.visible = visible;
  mundo.add(g);
  const l = document.createElement("label");
  l.className = "chk";
  l.innerHTML = `<input type="checkbox" ${visible ? "checked" : ""}> ${etiqueta}`;
  l.querySelector("input").onchange = ev => {
    g.visible = ev.target.checked;
  };
  $("#capas").appendChild(l);
  return g;
}

function marcador(texto, color = 16763955) {
  const g = new THREE.Group;
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(.15), new THREE.MeshBasicMaterial({
    color: color,
    wireframe: true
  }));
  m.userData.propio = m.userData.sinColision = true;
  g.add(m);
  const k = cartel(texto, "", .9);
  k.position.y = .35;
  g.add(k);
  return g;
}

async function cargarNivel(nv, entrada = null) {
  zonasAgua = zonasAguaDe(nv.actores);
  zonaAguaAnt = null;
  if (!/^vr/.test(nv.id)) guion.precargar(nv.id);
  const pe = partida && !/^vr/.test(nv.id) ? await partida.alEntrarEscenario(nv.id, entrada) : null;
  if (pe?.entrada) entrada = {
    ...entrada || {},
    ...pe.entrada
  };
  const vivos = pe ? partida.filtrarActores(nv.id, nv.actores) : nv.actores.filter(a => !a.evento);
  luzNivel = nv.luz && (nv.luz.luces.length || nv.luz.amb.some(v => v > 0) || nv.luz.main) ? nv.luz : null;
  dirSombra = new THREE.Vector3(-.3, -.8, -.5).normalize();
  if (luzNivel?.main) {
    const d = new THREE.Vector3(...luzNivel.main[0]);
    if (d.lengthSq() > 0) {
      d.normalize();
      if (d.y > -.5) {
        d.y = -.5;
        d.normalize();
      }
      if (d.y < -.92) {
        d.x += .28;
        d.z += .18;
        d.normalize();
      }
      dirSombra.copy(d);
    }
  }
  teñidos.length = 0;
  const snake = vivos.find(a => a.tipo === "SNAKE" && !a.t) || vivos.find(a => a.tipo === "SNAKE");
  ponerOarSnake(snake?.opts?.o?.[0]?.id ?? null);
  const mapa = nv.mapas.find(m => m.id === nv.principal) || nv.mapas.find(m => snake && m.id === snake.mapa) || nv.mapas[0];
  const vis = (nv.visibles?.length ? nv.visibles.map(id => nv.mapas.find(m => m.id === id)) : [ mapa ]).filter(Boolean);
  if (MAPAS_EXCL.has(nv.id)) for (const m of nv.mapas) if (!vis.includes(m)) vis.push(m);
  {
    const mId = typeof entrada?.m === "object" && entrada?.m ? entrada.m.id : entrada?.m, me = nv.mapas.find(m => m.id === mId);
    if (me && !vis.includes(me)) vis.push(me);
  }
  const archivosPiezas = [ ...new Set(vis.flatMap(m => m.piezas || [])) ];
  const archivosHzm = [ ...new Set(vis.flatMap(m => m.hzm_json || [])) ];
  const box = $("#partes");
  box.innerHTML = "";
  const fondo = nv.juego?.fondo;
  scene.background = new THREE.Color(fondo ? `rgb(${fondo.map(x => Math.max(0, Math.min(255, x))).join(",")})` : 0);
  {
    const tiemblan = new Set(nv.actores.filter(a => a.tipo === "SHAKEMODEL" && a.modelo).map(a => a.modelo));
    const desplaza = false;
    texturasQueCorren(nv.actores.filter(a => a.tipo === "TEXSCROLL").flatMap(a => (a.opts?.t || []).map(x => x && typeof x === "object" ? x.id : x).filter(x => typeof x === "number").map(x => x.toString(16).padStart(4, "0"))));
    for (const a of archivosPiezas) if (!tiemblan.has(a) && !desplaza) piezasMapa.add(a);
    for (const a of nv.actores) if ([ "WALL", "PUT_OBJECT", "DOOR", "ITEM" ].includes(a.tipo) && /^niveles\//.test(a.modelo || "") && !tiemblan.has(a.modelo) && !desplaza) piezasMapa.add(a.modelo);
  }
  const piezas = await Promise.all(archivosPiezas.map(a => cargar(a)));
  piezas.forEach((o, i) => {
    mundo.add(o);
    const l = document.createElement("label");
    l.className = "chk";
    l.innerHTML = `<input type="checkbox" checked> ${archivosPiezas[i].split("/").pop()}`;
    l.querySelector("input").onchange = ev => {
      o.visible = ev.target.checked;
      recalcularColisiones();
      recalcularPisos();
    };
    box.appendChild(l);
  });
  const cRutas = capa("rutas", "Rutas de los guardias", !$("#modo-sigilo").checked);
  const cParedes = capa("paredes", "Paredes del juego (las del radar)", false);
  const cZonas = capa("zonas", "Zonas / triggers con nombre", false);
  const cInvis = capa("invisibles", "Actores invisibles (efectos, cámaras, sonidos…)", false);
  const cCol = new THREE.Group;
  cCol.name = "colision";
  mundo.add(cCol);
  colParedes = [];
  colPisos = [];
  din = new Dinamicos({
    scene: scene,
    mundo: mundo,
    cam: cam,
    paredes: colParedes,
    sonido: (id, p, v, m) => seEn(id, p, v, m)
  });
  din.extras.ctx = {
    cargar: cargar,
    "teñir": teñir,
    st: () => nv.id,
    pisos: () => colPisos,
    alCambiar: () => {
      recalcularColisiones();
      recalcularPisos();
    },
    accionSnake: () => {
      const m = snakeScript.motion && /(?:^anim |:)(\d+)$/.exec(cuerpo?.clip || "");
      return m && cuerpo.accion ? {
        accion: +m[1],
        cuadro: Math.floor(cuerpo.accion.time * 30)
      } : null;
    },
    hueso: i => {
      const h = cuerpo?.obj?.visible !== false && cuerpo?.obj.getObjectByName("hueso_" + i);
      return h ? h.getWorldPosition(new THREE.Vector3) : null;
    },
    ruta: (m, r) => guion.rutaDe(m, r),
    hzm: () => [ ...hzmNivel.values() ],
    snake: () => ({
      agachado: agachado,
      reptando: reptando,
      pared: !!pared,
      rumbo: terceraPersona() ? rumbo : yaw
    }),
    objetoDe: n => (n === 8650 ? cuerpo?.obj : patrullas.find(g => g.nombre === n && !g.borrado)?.o) || null,
    detectorMinas: () => inventario.item === IT.MINED,
    "dañarSnake": n => juego?.dañoSnake?.(n, 3),
    explotar: p => armas ? (armas.explosion(p), true) : false
  };
  Object.assign(din.extras.ctx, {
    enGameOver: () => !juego || juego.muerto || !!muerteSnake || pantallaGameOver.activo,
    gameOver: proc => {
      if (!juego || juego.muerto || muerteSnake || pantallaGameOver.activo) return false;
      juego.muerto = true;
      juego.vida = 0;
      inventario.setVida(0);
      if (proc > 0) guion.correrProc(proc, []);
      ctxJefes?.gameOver?.();
      return true;
    },
    mensaje: (dest, v) => {
      try {
        return !!guion.op.mensaje?.(dest & 65535, v, {
          trampa: false,
          entrada: false,
          origen: {
            tipo: "actor"
          }
        });
      } catch (e) {
        console.warn("actores: mensaje", e);
        return false;
      }
    },
    termica: () => inventario.item === IT.THERMG,
    primeraPersona: () => !!juego && modo === "escenarios" && !R.xr.isPresenting && (vista === "primera" || camaraJuegoActiva() && !!camJuego?.primeraPersona),
    mirada: () => camaraJuegoActiva() && camJuego?.primeraPersona ? {
      rumbo: rumbo,
      pitch: -mirarJ * ANG
    } : {
      rumbo: yaw,
      pitch: pitch
    },
    ponerMirada: (r, p) => {
      if (camaraJuegoActiva() && camJuego?.primeraPersona) {
        rumbo = r;
        mirarJ = -p / ANG;
      } else {
        yaw = r;
        pitch = p;
      }
    },
    padDemo: si => {
      if (si && !padFindtrap) {
        padFindtrap = {
          antes: snakeScript.sinPad
        };
        snakeScript.sinPad = true;
      } else if (!si && padFindtrap) {
        snakeScript.sinPad = padFindtrap.antes;
        padFindtrap = null;
      }
    }
  });
  din.alElevador = (E, hash) => guion.alElevador(E.o.userData.actor, hash);
  din.correrProc = (pid, args) => guion.correrProc(pid, args);
  din.alerta = () => !!juego?.modo;
  din.puedeAbrir = (p, esSnake) => {
    const r = inventario.puedeAbrir(p.o.userData.actor?.nombre, esSnake);
    if (r.zumbador && !p.zumbo) {
      p.zumbo = true;
      seEn(35, p.centro);
    } else if (!r.zumbador) p.zumbo = false;
    return r.abre;
  };
  const anims = await cargarAnims("enemy");
  const esperan = new Set(vivos.filter(a => a.tipo === "ELEVATOR" && a.espera != null).map(a => a.espera));
  const porNombre = new Map;
  const vistos = new Set;
  const crear = async a => {
    const t = a.tipo;
    if (t === "SNAKE" || t === "SHAKEMODEL") return;
    if (din.extras.maneja(a)) {
      await din.extras.crear(a);
      return;
    }
    if (t === "ELEVPANEL") {
      din.panelAscensor(a);
      return;
    }
    if (t === "WATCHER" && a.modelo && a.p) {
      const o = await cargar(a.modelo);
      const fa = await cargar("armas/famas.glb");
      o.getObjectByName("hueso_4")?.add(fa);
      const p0 = v3(a.p);
      o.position.copy(p0);
      if (a.puntos.length > 1) {
        const p1 = v3(a.puntos[1].p);
        o.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      }
      o.userData.guardia = a;
      mundo.add(o);
      teñir(o);
      const an = animador(o, anims);
      an.tocar("parado", {
        offset: Math.random()
      });
      const g = {
        o: o,
        an: an,
        pts: a.puntos.map(q => v3(q.p)),
        puntosCmd: a.puntos.map(q => q.cmd || 0),
        i: 0,
        nombre: a.nombre,
        opts: a.opts
      };
      if (esperan.has(a.nombre)) {
        g.inactivo = true;
        o.visible = false;
        g.esperaAscensor = true;
      }
      patrullas.push(g);
      porNombre.set(a.nombre, g);
      if (juego) juego.prepararGuardia(g);
      const k = cartel(`Guardia · ruta ${a.ruta}`, `${a.puntos.length} puntos`, 1);
      k.position.set(p0.x, p0.y + 2.3, p0.z);
      cRutas.add(k);
      if (a.puntos.length > 1) {
        const pts = a.puntos.map(q => v3(q.p).add(new THREE.Vector3(0, .05, 0)));
        pts.push(pts[0]);
        const ln = new THREE.Line((new THREE.BufferGeometry).setFromPoints(pts), new THREE.LineBasicMaterial({
          color: 16724804
        }));
        ln.userData.propio = true;
        cRutas.add(ln);
      }
      return;
    }
    if (t === "ITEM" && a.p) {
      const o = a.modelo ? await cargar(a.modelo) : marcador("ITEM");
      const piv = new THREE.Group;
      piv.position.copy(v3(a.p));
      piv.add(o);
      mundo.add(piv);
      giran.push(piv);
      itemsNivel.push({
        obj: piv,
        nombre: String(a.item || "ITEM"),
        actor: a,
        alTomar: () => partida ? partida.alTomarItem(nv.id, a) : guion.alTomarItem(a)
      });
      const k = cartel(String(a.item || "ITEM"), "ítem", .8);
      k.position.copy(v3(a.p)).add(new THREE.Vector3(0, .8, 0));
      cInvis.add(k);
      return;
    }
    if ((t === "SPHERE" || t === "SPHERE2") && a.cielo?.img) {
      if (din.cielo) return;
      const tex = await (new THREE.TextureLoader).loadAsync("assets/" + a.cielo.img);
      din.ponerCielo(a.cielo, tex);
      return;
    }
    if (t === "SNOW" || t === "SNOWAREA") {
      if (!din.nieve) din.ponerNieve(a);
      return;
    }
    if (t === "TELOP") {
      if (a.telop?.length) din.telop(a.telop);
      return;
    }
    if (t === "RIPPLES") {
      din.goteo(a);
      return;
    }
    if (t === "PATOLAMP" && a.baliza && a.p) {
      const raiz = new THREE.Group;
      raiz.position.copy(v3(a.p));
      if (a.d) raiz.rotation.set(a.d[0] * ANG, a.d[1] * ANG, a.d[2] * ANG, "YXZ");
      const giro = new THREE.Group;
      raiz.add(giro);
      mundo.add(raiz);
      if (a.baliza.cuerpo) raiz.add(await cargar(a.baliza.cuerpo));
      if (a.baliza.lampara) giro.add(await cargar(a.baliza.lampara));
      const conos = [];
      if (a.baliza.cono) for (const r of [ 0, Math.PI ]) {
        const c = await cargar(a.baliza.cono);
        c.rotation.y = r;
        c.traverse(m => {
          if (m.isMesh) m.userData.sinColision = true;
        });
        giro.add(c);
        conos.push(c);
      }
      din.baliza(giro, conos, typeof a.opts?.s?.[0] === "number" ? a.opts.s[0] : 181, a.nombre);
      return;
    }
    if (t === "PILOTLAMP") {
      din.lamparaPiloto(a);
      return;
    }
    if (t === "ELECDAMAGE") {
      din.danoElectrico(a, {
        vida: () => inventario.getVida(),
        setVida: v => inventario.setVida(v)
      });
      return;
    }
    if (t === "RSURFACE") {
      din.superficie(a);
      return;
    }
    if (t === "PUT_OBJECT" && a.modelo && a.instancias) {
      for (const ins of a.instancias) {
        const o = await cargar(a.modelo);
        o.position.copy(v3(ins.p));
        o.rotation.set(ins.d[0] * ANG, ins.d[1] * ANG, ins.d[2] * ANG, "YXZ");
        o.userData.actor = a;
        mundo.add(o);
      }
      return;
    }
    if (!a.modelo || !a.p) {
      if (a.p) {
        const m = marcador(t);
        m.position.copy(v3(a.p));
        cInvis.add(m);
      }
      return;
    }
    const clave = a.modelo + a.p.join(",") + t;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    const o = await cargar(a.modelo);
    o.position.copy(v3(a.p));
    if (a.d) o.rotation.set(a.d[0] * ANG, a.d[1] * ANG, a.d[2] * ANG, "YXZ");
    o.userData.actor = a;
    mundo.add(o);
    if (t === "DOOR") {
      din.puerta(o, a);
      return;
    }
    if (t === "DMYWALL") {
      await din.paredRompible(o, a, cargar);
      return;
    }
    if (t === "SHUTTER") {
      din.persiana(o, a, {
        leerVar: n => guion.vars.get(n),
        modoAlerta: () => juego?.modo ?? 0
      });
      return;
    }
    if (t === "ELEVATOR") {
      const g = a.espera != null ? porNombre.get(a.espera) : null;
      if (g) {
        g.o.visible = true;
        g.inactivo = true;
      }
      const E = din.elevador(o, a, g, gg => {
        gg.inactivo = false;
        gg.esperaAscensor = false;
        juego?.reanudarRuta(gg);
      });
      if (E) {
        const c = (new THREE.Box3).setFromObject(o), q = o.position;
        E.caja = {
          x0: c.min.x - q.x,
          x1: c.max.x - q.x,
          z0: c.min.z - q.z,
          z1: c.max.z - q.z
        };
      }
      if (E && g) {
        E.alto = .05;
        g.an.tocar("parado");
      }
      if (E && a.modelo2) {
        const o2 = await cargar(a.modelo2);
        o2.traverse(m => {
          if (m.isMesh) m.userData.sinColision = true;
        });
        o2.position.copy(o.position);
        mundo.add(o2);
        E.o2 = o2;
      }
      recalcularColisiones();
      recalcularPisos();
      return;
    }
    if (o.getObjectByName("hueso_15")) {
      teñir(o);
      o.userData.muñeco = true;
    }
    if (o.getObjectByName("hueso_15") && !o.getObjectByName("hueso_16")) animador(o, anims).tocar("parado", {
      offset: Math.random()
    });
  };
  crearActorNivel = crear;
  olvidarVistos = () => vistos.clear();
  hornos = vivos.filter(a => a.tipo === "FURNACE" && Array.isArray(a.opts?.b) && a.opts.b.length >= 6).map(a => ({
    b: a.opts.b.slice(0, 6),
    e: a.opts?.e?.[0]?.proc ?? (typeof a.opts?.e?.[0] === "number" ? a.opts.e[0] : 0)
  }));
  const antesNivel = new Set(mundo.children);
  await Promise.all(vivos.filter(a => !a.t && !MAPAS_EXCL.has(nv.id)).map(crear));
  objsNivel = mundo.children.filter(o => !antesNivel.has(o));
  for (const a of vivos.filter(x => x.tipo === "SHAKEMODEL" && x.modelo)) {
    mundo.traverse(o => {
      if (o.userData.actor?.modelo === a.modelo && o.userData.actor.tipo !== "SHAKEMODEL" && !o.userData.tiembla) {
        o.userData.tiembla = true;
        din.temblar(o, a.opts?.a?.[0] ?? 1, a.opts?.s?.[0] ?? 50, a.nombre);
      }
    });
    {
      const k = archivosPiezas.indexOf(a.modelo), o = piezas[k];
      if (o && !o.userData.tiembla) {
        o.userData.tiembla = true;
        din.temblar(o, a.opts?.a?.[0] ?? 1, a.opts?.s?.[0] ?? 50, a.nombre);
      }
    }
  }
  for (const a of vivos.filter(x => x.t > 0 && [ "WATCHER", "ELEVATOR", "DOOR", "DEMODOLL", "ITEM", "WALL", "PUT_OBJECT", "SNOW", "SPHERE", "TELOP" ].includes(x.tipo)).sort((x, y) => x.t - y.t)) din.agenda.push({
    t: a.t,
    fn: () => crear(a),
    porGuion: ascensorConGuardia(a, nv)
  });
  for (const a of vivos) if (a.tipo === "DYNWALL" && !a.t && Array.isArray(a.opts?.p) && a.opts.p.length >= 6 && a.opts.p.slice(0, 6).every(v => typeof v === "number")) {
    const m = paredDinamica(a, THREE);
    if (m) {
      cCol.add(m);
      colParedes.push(m);
    }
  }
  const hzs = await Promise.all(archivosHzm.map(f => fetch("assets/" + f).then(r => r.json()).catch(() => null)));
  hzmNivel = new Map(archivosHzm.map((f, i) => [ f, hzs[i] ]));
  const hz = hzs.filter(Boolean).reduce((acc, h) => acc ? {
    ...acc,
    grupos: acc.grupos.concat(h.grupos),
    zonas: acc.zonas.concat(h.zonas.map(z => ({
      ...z,
      vecinas: z.vecinas.map(v => v + acc.zonas.length)
    })))
  } : h, null);
  if (hz) {
    const matInv = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide
    });
    const matPared = new THREE.MeshBasicMaterial({
      color: 16729156,
      transparent: true,
      opacity: .35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const posP = [], posF = [], atrPisos = [];
    trampasHzm = [];
    for (const g of hz.grupos) {
      for (const w of g.paredes) {
        if (w.flags & 1) continue;
        const a = v3(w.a), b = v3(w.b), h = w.alto * MM;
        posP.push(a.x, a.y, a.z, b.x, b.y, b.z, b.x, b.y + h, b.z, a.x, a.y, a.z, b.x, b.y + h, b.z, a.x, a.y + h, a.z);
      }
      for (const f of g.pisos) {
        atrPisos.push(f.atr ?? 0);
        const q = f.puntos.map(v3);
        posF.push(q[0].x, q[0].y, q[0].z, q[1].x, q[1].y, q[1].z, q[2].x, q[2].y, q[2].z, q[0].x, q[0].y, q[0].z, q[2].x, q[2].y, q[2].z, q[3].x, q[3].y, q[3].z);
      }
      for (const t of g.triggers) {
        if (t.tipo !== "trap") continue;
        const b1 = v3(t.caja[0]), b2 = v3(t.caja[1]);
        const bx = new THREE.Box3(b1.clone().min(b2), b1.clone().max(b2));
        trampasHzm.push({
          nombre: t.nombre,
          caja: bx
        });
        const h = new THREE.Box3Helper(bx, 3386111);
        h.userData.propio = h.userData.sinColision = true;
        cZonas.add(h);
        const k = cartel(t.nombre, "zona", 1.2);
        k.position.copy(bx.getCenter(new THREE.Vector3));
        cZonas.add(k);
      }
    }
    const geoP = new THREE.BufferGeometry;
    geoP.setAttribute("position", new THREE.Float32BufferAttribute(posP, 3));
    const geoF = new THREE.BufferGeometry;
    geoF.setAttribute("position", new THREE.Float32BufferAttribute(posF, 3));
    const mP = new THREE.Mesh(geoP, matInv);
    mP.userData.propio = mP.userData.sinColision = true;
    cCol.add(mP);
    colParedes.push(mP);
    const mF = new THREE.Mesh(geoF, matInv);
    mF.userData.propio = mF.userData.sinColision = true;
    mF.userData.atr = atrPisos;
    cCol.add(mF);
    colPisos.push(mF);
    mP.userData.hzmUnido = mF.userData.hzmUnido = true;
    asioto = null;
    const aA = vivos.find(a => a.tipo === "ASIOTOKUN");
    if (aA) armarAsioto(aA);
    const vis2 = new THREE.Mesh(geoP, matPared);
    vis2.userData.propio = vis2.userData.sinColision = true;
    cParedes.add(vis2);
  }
  recalcularColisiones();
  ducto.cargar(hz ? trampasHzm : []);
  ducto.cargarCamaras(vivos);
  const pisosHzm = colPisos.slice();
  recalcularPisos = () => {
    colPisos = pisosHzm.length ? [ ...pisosHzm, ...colisiones.filter(m => esPisable(m)) ] : [ ...colisiones ];
  };
  {
    const rp = recalcularPisos;
    recalcularPisos = () => {
      rp();
      if (zakoPisos.length && colPisos) colPisos.push(...zakoPisos);
    };
  }
  recalcularPisos();
  mapasExcl = MAPAS_EXCL.has(nv.id) ? new MapasExclusivos({
    nv: nv,
    piezas: new Map(archivosPiezas.map((f, i) => [ f, piezas[i] ])),
    hzms: hzmNivel,
    grupo: cCol,
    paredes: colParedes,
    pisos: pisosHzm,
    alCambiar: (hzSel, hzs, ids) => {
      guion.zonasMapa = zonasDelMapa(guion.script?.zonas, hzs);
      recalcularColisiones();
      recalcularPisos();
      mapasExcl.prepararIA = () => {
        mapasExcl.prepararIA = null;
        if (juego) {
          juego.vista?.removeFromParent();
          juego.paredCol?.removeFromParent();
          juego.ctx.hz = hzSel;
          juego.preparar();
        }
      };
      debug.log("guion", "map -s: " + ids.map(x => "#" + x.toString(16)).join(" "));
    }
  }) : null;
  salidas = (nv.salidas || []).map(s => ({
    ...s,
    cajas: s.cajas.map(c => {
      const a = v3(c[0]), b = v3(c[1]);
      return new THREE.Box3(a.clone().min(b), a.clone().max(b)).expandByScalar(.1);
    })
  }));
  for (const s of salidas) for (const c of s.cajas) {
    const h = new THREE.Box3Helper(c, 16765498);
    h.userData.propio = h.userData.sinColision = true;
    cZonas.add(h);
    const k = cartel("→ " + nombreEsc(s.a), "salida", 1.4);
    k.position.copy(c.getCenter(new THREE.Vector3));
    cZonas.add(k);
  }
  zonasCodec = [];
  const rotGO = (() => {
    try {
      return +localStorage.getItem("sm_go_rot") || guion.vars.get("$w:G02be");
    } catch {
      return guion.vars.get("$w:G02be");
    }
  })();
  const pIni = entrada?.p ? entrada.p : snake?.p;
  const rIni = entrada?.p ? entrada.rot || 0 : snake?.d ? snake.d[1] : 0;
  if (entrada?.postura != null) {
    agachado = entrada.postura >= 1;
    reptando = entrada.postura >= 2;
  }
  if (pIni) {
    ubicarControl(v3(pIni), rIni * ANG + Math.PI);
    inicio.copy(rig.position);
  } else aparecer(piezas[0] || mundo);
  hayPisoSeguro = false;
  tAire = 0;
  tNivel = 0;
  await prepararArma();
  try {
    const modeloSnake = snake?.modelo || catalogo.find(c => c.nombre === "snake")?.archivo;
    if (modeloSnake) {
      const o = prepararCuerpo(await cargar(modeloSnake));
      mundo.add(o);
      teñir(o);
      cuerpo = {
        obj: o,
        an: animador(o, await cargarAnims("snake"))
      };
      try {
        const s2 = await cargar("armas/socom.glb");
        o.getObjectByName("hueso_4")?.add(s2);
        cuerpo.arma = s2;
        s2.visible = false;
      } catch {}
      ocultarCuerpo(cuerpo, !terceraPersona());
    }
  } catch (e) {
    debug.log("aviso", "sin cuerpo de Snake: " + e.message);
  }
  brillos = [];
  const comandante = vivos.find(a => a.tipo === "COMMANDER")?.opts || {};
  juego = new Juego({
    mundo: mundo,
    rig: rig,
    cam: cam,
    guardias: patrullas,
    hz: hz,
    items: itemsNivel,
    anims: anims,
    comandante: comandante,
    pisoExtra: (x, z, y) => {
      let h = null;
      for (const E of din?.elevadores || []) {
        const q = E.o.position, c = E.caja, m = .05;
        const dentro = c ? x >= q.x + c.x0 - m && x <= q.x + c.x1 + m && z >= q.z + c.z0 - m && z <= q.z + c.z1 + m : Math.abs(x - q.x) < 1.2 && Math.abs(z - q.z) < 1.2;
        if (dentro && q.y <= y + .6 && (h === null || q.y > h)) h = q.y;
      }
      return h;
    },
    enPantalla: p => enPantalla(p),
    postura: () => reptando ? 2 : agachado ? 1 : 0,
    yawSnake: () => R.xr.isPresenting ? yawCabezaVR() : terceraPersona() ? rumbo : yaw,
    dificultad: () => dificultad,
    balaVisual: (o, d) => balaVisual(o, d),
    vibrar: n => ctl.vibrarCuadros(n, {
      mando: false
    }),
    cabeza: v => {
      if (terceraPersona()) {
        v.copy(rig.position);
        v.y += agachado ? .8 : 1.5;
      } else {
        cam.getWorldPosition(v);
        v.y -= .15;
      }
      return v;
    },
    vuelo: () => vuelo,
    aviso: aviso,
    "daño": () => {
      hud.daño();
      const d = $("#daño");
      d.style.opacity = .18;
      setTimeout(() => d.style.opacity = 0, 60);
    },
    gameOver: () => {
      debug.log("juego", "Snake muere");
      document.exitPointerLock?.();
      audioMGS.se(SE.PLAYEROUT);
      muerteSnake = {
        t: 0
      };
      setTimeout(() => {
        muerteSnake = null;
        debug.log("juego", "GAME OVER");
        audioMGS.gameOver();
        const vozGO = guion.gameOver();
        try {
          localStorage.setItem("sm_go_rot", guion.vars.get("$w:G02be"));
        } catch {}
        if (vozGO >= 0) codec.reproducirVoz(vozGO, {
          retraso: 2
        });
        pantallaGameOver.iniciar({
          alSeguir: () => {
            codec.pararVozJuego();
            seguirTrasGameOver();
          },
          alSalir: () => {
            codec.pararVozJuego();
            mostrarTitulo("titulo");
          }
        });
      }, 1600);
    }
  });
  juego.ctx.pared = () => !!pared;
  juego.ctx.ojo = () => cam.getWorldPosition(new THREE.Vector3);
  juego.ctx.cortarSonido = c => audioMGS.codigo(c >>> 0);
  juego.actoresJuego(vivos, {
    proc: (id, args) => guion.correrProc(id, args)
  });
  juego.ctx.alModo = m => {
    debug.log("juego", m === "fin" ? "fin de evasión" : [ "normal", "ALERTA", "evasión" ][m]);
    if (m === "fin") audioMGS.finEvasion(); else audioMGS.alerta(m);
    guion.alerta(m);
  };
  {
    const am = juego.ctx.alModo;
    juego.ctx.alModo = m => {
      if (m === 1) partida?.sumar(LV.EnemyWatchCount);
      am(m);
    };
  }
  {
    const muere = juego.ctx.alMorir;
    juego.ctx.alMorir = g => {
      partida?.sumar(LV.EnemyKillCount);
      muere?.(g);
    };
  }
  if (!/^vr/.test(nv.id)) {
    juego.ctx.inventario = inventario;
    inventario.conectarJuego(juego);
    partida?.aplicarInventario(inventario);
    await inventario.cargarPuertas(nv.id, !entrada && !partida);
    armas = new Armas(juego, inventario, {
      cargar: cargar,
      rig: rig,
      se: (id, p) => {
        sonido(id, p);
        try {
          ctl.vibrarSE(id, inventario.arma, p?.distanceTo ? p.distanceTo(rig.position) : 0);
        } catch {}
      },
      balaVisual: (o, d) => balaVisual(o, d),
      mira: miraSnake,
      alcanceX: () => terceraPersona() ? 1 : 3,
      aviso: aviso,
      cuadrado: () => cuadradoApretado(),
      alRafaga: (r, o, d) => tiroRafaga(r, o, d),
      postura: () => reptando ? 2 : agachado ? 1 : 0,
      primeraPersona: () => !terceraPersona(),
      "daño": () => {
        hud.daño();
        const d = $("#daño");
        d.style.opacity = .18;
        setTimeout(() => d.style.opacity = 0, 60);
      },
      vibrar: n => {
        try {
          navigator.vibrate?.(n * 33);
        } catch {}
      },
      foto: () => inventario.foto(R, scene, cam),
      destello: () => {
        const d = $("#daño");
        d.style.background = "#fff";
        d.style.opacity = .85;
        setTimeout(() => {
          d.style.opacity = 0;
          d.style.background = "";
        }, 150);
      },
      alEquipar: (id, previo, a) => cambiarModeloArma(a)
    });
    armas.ponerMinasNivel(vivos);
  }
  audioMGS.cargarEscenario(nv.id);
  juego.activo = $("#modo-sigilo").checked;
  sensores?.destruir();
  sensores = new Sensores({
    mundo: mundo,
    juego: juego,
    nivel: nv,
    cargar: cargar,
    techoCerca: techoCerca
  });
  sensores.crear();
  if (armas) {
    const ex = armas.explosion.bind(armas);
    armas.explosion = (p, d, arma) => {
      sensores?.explosion(p);
      din?.explosion?.(p, arma);
      return ex(p, d, arma);
    };
  }
  congeladoJefe = false;
  ctxJefes = {
    juego: juego,
    armas: armas,
    cargar: cargar,
    mundo: mundo,
    "teñir": teñir,
    ubicar: ubicar,
    paredes: colParedes,
    dificultad: () => dificultad,
    se: (id, p, modo) => seEn(id, p, 63, modo),
    voces: codec.voces,
    musica: c => audioMGS.codigo(c),
    congelar: si => {
      congeladoJefe = si;
    },
    alProc: (a, letra) => typeof guion.eventoActor === "function" && guion.eventoActor(a, letra),
    gameOver: () => {
      document.exitPointerLock?.();
      audioMGS.gameOver();
      const vozGO = guion.gameOver();
      if (vozGO >= 0) codec.reproducirVoz(vozGO, {
        retraso: 2
      });
      pantallaGameOver.iniciar({
        alSeguir: () => {
          codec.pararVozJuego();
          seguirTrasGameOver();
        },
        alSalir: () => {
          codec.pararVozJuego();
          mostrarTitulo("titulo");
        }
      });
    },
    alVencer: info => correrDemos([ {
      st: nv.id,
      demo: info.demos[0]
    } ], {
      enEscena: s => s === nv.id
    }).then(() => {
      if (info.siguiente) cargarEscenario(info.siguiente);
    })
  };
  if (new URLSearchParams(location.search).has("jefes")) forzarJefes(nv, ctxJefes);
  zakoPisos.length = 0;
  ctxZako = {
    juego: juego,
    armas: armas,
    cargar: cargar,
    mundo: mundo,
    "teñir": teñir,
    nivel: nv,
    st: nv.id,
    guion: guion,
    hzm: f => hzmNivel.get(f),
    pisos: zakoPisos,
    paredes: colParedes,
    recalcular: () => {
      recalcularColisiones();
      recalcularPisos();
    },
    mapaVisible: id => !!mapasExcl?.visible(id),
    vibrar: n => {
      try {
        navigator.vibrate?.(n * 33);
      } catch {}
    },
    congelar: si => {
      congeladoJefe = si;
    },
    voz: id => codec.reproducirVoz(id),
    subirSnake: d => {
      rig.position.y += d;
      if (snakeScript.ctl) snakeScript.ctl.y += d;
      const M = snakeScript.motion, F = M?.fis;
      if (F && M.t < .5) {
        rig.position.x = F.x0;
        rig.position.z = F.z0;
        snakeScript.ctl = {
          x: F.x0,
          y: rig.position.y,
          z: F.z0
        };
        M.clip = null;
        M.fis = null;
        M.t = 0;
      } else if (F) F.ref += d;
    }
  };
  ctxPersonajes = {
    ...ctxJefes,
    nivel: nv,
    proc: (pid, args) => guion.correrProc(pid, args),
    mensaje: (d, v, i) => d === 8650 ? mensajeSnake(v, i) : mensajesGuion(d, v, i),
    estadoSnake: () => estadoSnake({
      agachado: agachado,
      reptando: reptando,
      primeraPersona: !terceraPersona(),
      pared: !!pared,
      caja: !!inventario.enCaja
    }),
    cine: si => si ? efectosGuion.efecto({
      tipo: "CINEMA",
      nombre: "personajes",
      opts: {
        t: [ 3e4 ]
      }
    }) : efectosGuion.mensaje("personajes", [ 54304 ])
  };
  for (const a of vivos) if (esMeryl(a) && !(a.t > 0)) crearMeryl(a, ctxPersonajes);
  camJuego = new CamaraJuego({
    alerta: () => juego.com.modo,
    ruido: () => juego.ruido,
    alMensaje: (a, v) => sensores?.mensaje(a, v[0])
  });
  camJuego.cargar(nv.id).catch(() => {
    camJuego = null;
  });
  $("#hud").hidden = false;
  $("#nivel-info").textContent = `Nivel del juego · ${nv.juego?.estado || ""} · progreso ${nv.juego?.progreso ?? "?"} · ${vis.length} mapa(s) · ` + `${patrullas.length} guardias · ${itemsNivel.length} ítems · ${salidas.length} salidas`;
  ayuda();
  precargarSiguientes(nv.id);
  const cad = await cargarCadenas();
  const cadena = cad?.entrada_cadena?.[nv.id];
  const pasosEntrada = cadena ? cadena.pasos : (nv.demos || []).slice().sort((a, b) => a.pasada - b.pasada || a.t - b.t).map(d => ({
    st: nv.id,
    demo: d.sector,
    t: d.t
  }));
  if (!/^vr/.test(nv.id)) {
    await guion.cargarEscenario(nv.id, {
      nivel: nv,
      demosVisor: pasosEntrada,
      entrada: pe ? "partida" : "disco"
    });
    if (guion.nivel === nv) din.agenda = din.agenda.filter(x => !x.porGuion);
    if (rotGO && !pe) guion.vars.set("$w:G02be", rotGO);
    await zakosAlEntrar(nv, guion, ctxZako).catch(e => debug.log("aviso", "zako: " + e.message));
    await crearSinCrearEntrada(nv, vivos).catch(e => debug.log("aviso", "entrada (tanda6b): " + e.message));
    if (guion.nivel === nv) for (const a of nv.actores) {
      const b = a._k != null && !a.evento && !a.t && esJefe(a) ? guion.presupuestoBase.get(a._k) || 0 : 0;
      if (b > 0 && (guion.presupuesto.get(a._k) || 0) >= b) {
        guion.presupuestoBase.set(a._k, 0);
        guion.presupuesto.set(a._k, 0);
      }
    }
    crearJefesEntrada(nv, ctxJefes, guion).catch(e => debug.log("aviso", "jefes: " + e.message));
    aplicarTodo();
  }
  const enEscena = st => st === nv.id;
  const cuenta = new Map;
  for (const p of pasosEntrada) cuenta.set(p.demo, (cuenta.get(p.demo) || 0) + 1);
  const filtrar = !cadena && pe && guion.nivel === nv && guion.st === nv.id;
  const pedida = p => !filtrar || (guion.demosVisor.get(p.demo) || 0) < cuenta.get(p.demo);
  const avisar = p => {
    const n = guion.demosVisor.get(p.demo) || 0;
    if (n > 0) guion.demosVisor.set(p.demo, n - 1);
    cuenta.set(p.demo, Math.max(0, cuenta.get(p.demo) - 1));
    debug.log("demo", `entrada: ${p.demo} no la pidió el main (progreso ${guion.vars?.get("$w:G000a")})`);
    return false;
  };
  for (const p of pasosEntrada.filter(x => x.t > 0)) din.agenda.push({
    t: p.t,
    fn: () => pedida(p) || !filtrar ? correrDemos([ p ], {
      enEscena: enEscena
    }) : avisar(p)
  });
  din.agenda.sort((a, b) => a.t - b.t);
  const ya = pasosEntrada.filter(x => !(x.t > 0) && (pedida(x) || avisar(x)));
  if (ya.length) correrDemos(ya, {
    enEscena: enEscena
  }).then(() => {
    if (cadena?.destino?.[0] === "s" && $("#esc-sel").value === nv.id) cargarEscenario(cadena.destino);
  });
}

let luzNivel = null;

const vistaAgua = new VistaAgua;

let zonasAgua = [], zonaAguaAnt = null;

const _ojo = new THREE.Vector3;

let zonasDemo = {
  de: null,
  zonas: []
};

let sensores = null, camJuego = null;

let ctxJefes = null, congeladoJefe = false;

let ctxZako = null, zakoPisos = [];

let ctxPersonajes = null;

const _luz = new THREE.Color;

function luzEn(p) {
  if (!luzNivel) return _luz.setRGB(1, 1, 1);
  const L = luzNivel, a = L.amb, x = p.x * 1e3, y = p.y * 1e3 + 900, z = p.z * 1e3;
  const I = [ a[0] / 256, a[1] / 256, a[2] / 256 ];
  if (L.main) {
    const c = L.main[1];
    for (let k = 0; k < 3; k++) I[k] += c[k] / 256 * .6;
  }
  let n = 0;
  for (const l of L.luces) {
    const dx = x - l[0], dy = y - l[1], dz = z - l[2], e = l[4];
    if (dx < -e || dx > e || dy < -e || dy > e || dz < -e || dz > e) continue;
    const d = Math.hypot(dx, dy, dz), f = Math.max(0, 2 * l[3] - d) / l[3] * .75 * (n === 0 ? .42 : .2);
    I[0] += l[5] / 256 * f;
    I[1] += l[6] / 256 * f;
    I[2] += l[7] / 256 * f;
    if (++n === 2) break;
  }
  return _luz.setRGB(...[ 0, 1, 2 ].map(k => Math.min(1.25, (256 - a[k]) / 2 * I[k] / 128)));
}

const teñidos = [];

function teñir(o) {
  const mats = [];
  o.traverse(m => {
    if (m.isMesh) {
      const b = (aBasico.get(m.material) || m.material).clone();
      const st = (aStd.get(m.material) || m.material).clone();
      aBasico.set(st, b);
      aStd.set(b, st);
      m.material = luzOriginal ? b : st;
      mats.push(b);
    }
  });
  teñidos.push({
    o: o,
    mats: mats
  });
}

function actualizarTintes() {
  if (!luzOriginal) return;
  const p = new THREE.Vector3;
  for (const t of teñidos) {
    t.o.getWorldPosition(p);
    const c = luzEn(p);
    for (const m of t.mats) m.color.copy(c);
  }
}

const _frustum = new THREE.Frustum, _mProj = new THREE.Matrix4;

function enPantalla(p) {
  const c = R.xr.isPresenting && vrModo() !== "pantalla" ? R.xr.getCamera() : cam;
  _mProj.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_mProj);
  return _frustum.containsPoint(p);
}

const geoBala = new THREE.BoxGeometry(.015, .015, .3), matBala = new THREE.MeshBasicMaterial({
  color: 16765056
});

function balaVisual(o, d) {
  const m = new THREE.Mesh(geoBala, matBala);
  m.position.copy(o);
  m.lookAt(o.clone().add(d));
  m.userData.propio = m.userData.sinColision = true;
  mundo.add(m);
  return m;
}

const _pc = new THREE.Vector3, _prev = new THREE.Vector3;

function actualizarCuerpoYSombras(dt) {
  if (cuerpo && dt > 0) {
    let pos = rig.position, ry = yaw;
    if (R.xr.isPresenting && !terceraPersona()) {
      const d = new THREE.Vector3;
      cam.updateWorldMatrix(true, false);
      cam.getWorldPosition(_pc);
      cam.getWorldDirection(d);
      pos = _pc.set(_pc.x, rig.position.y, _pc.z);
      ry = Math.atan2(-d.x, -d.z);
    }
    const vel = Math.hypot(pos.x - _prev.x, pos.z - _prev.z) / dt;
    _prev.copy(pos);
    const tercera = terceraPersona() || !!juego?.__jefes?.camaraEspecial?.()?.verSnake || !!misionesVR.camaraEspecial()?.verSnake;
    if (tercera !== cuerpo.tercera) {
      cuerpo.tercera = tercera;
      if (armaVista) armaVista.visible = !tercera;
    }
    tApunta = Math.max(0, tApunta - dt);
    tDisparo = Math.max(0, tDisparo - dt);
    tGolpe = Math.max(0, tGolpe - dt);
    tGolpePared = Math.max(0, tGolpePared - dt);
    const ojosJ = vista === "arriba" && !!camJuego?.cuerpoOculto;
    const wId = armas ? inventario.arma : 0;
    armaEnManoTercera(wId, tercera && !ojosJ && !armas?.manoVacia());
    const golpeVivo = tGolpe > 0 && (!juego?.sn || !!juego.sn.combo || tGolpe > 28 / 30);
    animarCuerpo(cuerpo, {
      pos: pos,
      yaw: tercera ? rumbo : ry,
      vel: vel > 20 ? 0 : vel,
      agachado: agachado,
      postura: reptando ? 2 : agachado ? 1 : 0,
      arma: wId >= 0,
      armaId: wId,
      alerta: juego?.modo === 1,
      pared: pared,
      golpePared: tGolpePared > 0 ? ladoGolpe : null,
      muerte: !!muerteSnake,
      forzado: snakeScript.motion?.clip || null,
      atras: reptando && (giroSnake.atras || (vista !== "arriba" || R.xr.isPresenting) && (teclas.KeyS || teclas.ArrowDown || tac.y < -.3)),
      dt: dt,
      visible: tercera && !ojosJ || R.xr.isPresenting && vrCuerpoVisible,
      detras: tercera ? 0 : .08,
      apunta: tercera && (tApunta > 0 || apuntaHombro()),
      disparo: tercera && tDisparo > 0,
      recargando: tercera && (armas ?? juego)?.arma?.recargando > 0,
      golpe: tercera && golpeVivo,
      reaccion: juego?.reaccionSnake?.() || null,
      parpadeo: !!juego?.sn?.parpadeo,
      caja: !!armas && inventario.enCaja,
      armaAnim: armas ? armas.estadoAnim() || {} : null
    });
  }
  ajustarCuerpoVR();
  dibujarSombras(dt);
  actualizarBrillos(brillos, cam);
}

function esPisable(m) {
  for (let p = m; p; p = p.parent) {
    const t = p.userData?.actor?.tipo;
    if (t) return [ "ELEVATOR", "LIFT", "RASEN_EL", "PUT_OBJECT", "BOXALL", "DMYFLOOR", "DYNFLOOR" ].includes(t);
  }
  return false;
}

const _cs = new THREE.Vector3;

const _rt = new THREE.Raycaster, _dl = new THREE.Vector3;

function lamparaTapada(lam, c) {
  if (!colParedes?.length) return false;
  _dl.subVectors(c, lam);
  const L = _dl.length();
  if (L < .4) return false;
  _dl.divideScalar(L);
  _rt.set(lam, _dl);
  _rt.far = L - .35;
  return _rt.intersectObjects(colParedes, false).length > 0;
}

function dibujarSombras(dt) {
  if (!conSombras) {
    sombraU.uSombraN.value = 0;
    return;
  }
  const lista = [];
  if (cuerpo && !vuelo) {
    _cs.copy(rig.position);
    _cs.y += .9;
    cuerpo.luz = luzDePersonaje(cuerpo.luz || {}, _cs, luzNivel, dirSombra, dt, lamparaTapada);
    lista.push({
      centro: _cs.clone(),
      dir: cuerpo.luz.dir,
      fuerza: cuerpo.luz.fuerza
    });
  }
  const otros = [];
  mundo.traverse(o => {
    if ((o.userData.personaje || o.userData.muñeco) && o !== cuerpo?.obj && o.visible && o.parent?.visible !== false) otros.push(o);
  });
  for (const g of patrullas) if (!g.inactivo && g.o.visible && !otros.includes(g.o)) otros.push(g.o);
  const _wp = new THREE.Vector3, cand = otros.map(o => {
    o.getWorldPosition(_wp);
    return {
      o: o,
      p: _wp.clone(),
      d: _wp.distanceTo(rig.position),
      ve: enPantalla(_wp)
    };
  }).filter(c => c.d < 30).sort((a, b) => b.ve - a.ve || a.d - b.d);
  const cubierto = p => lista.some(l => Math.abs(l.centro.x - p.x) < 4 && Math.abs(l.centro.z - p.z) < 4);
  for (const c of cand) {
    if (lista.length >= 1 + otrosSombra) break;
    if (cubierto(c.p)) continue;
    const ce = c.p.clone();
    ce.y += .9;
    c.o.userData.luz = luzDePersonaje(c.o.userData.luz || {}, ce, luzNivel, dirSombra, dt, lamparaTapada);
    lista.push({
      centro: ce,
      dir: c.o.userData.luz.dir,
      fuerza: c.o.userData.luz.fuerza
    });
  }
  sombras.render(lista);
}

async function precargarSiguientes(id) {
  await new Promise(r => setTimeout(r, 5e3));
  const destinos = [ ...new Set(salidas.map(s => s.a)) ];
  for (const d of destinos) {
    try {
      const sig = await fetch(`assets/niveles/${d}/nivel.json`).then(r => r.json());
      const vis = (sig.visibles?.length ? sig.visibles : [ sig.principal ]).map(v => sig.mapas.find(m => m.id === v)).filter(Boolean);
      const urls = new Set;
      for (const m of vis) for (const f of [ ...m.piezas || [], ...m.hzm_json || [] ]) urls.add("assets/" + f);
      for (const a of sig.actores || []) if (a.modelo && !a.evento) urls.add("assets/" + a.modelo);
      for (const u of urls) {
        if ($("#esc-sel").value !== id) return;
        await fetch(u, {
          priority: "low"
        }).catch(() => {});
      }
      debug.log("info", `precargado ${d} (${urls.size} archivos)`);
    } catch {}
  }
}

let salidas = [], tNivel = 0, cambiando = false, entradaActual = null, esperaSalida = false;

const _colSnake = new THREE.Box3;

function revisarSalidas() {
  if (cambiando || cargandoNivel || !juego || vuelo || tNivel < 1.5 || !salidas.length) return;
  const p = rig.position, alto = reptando ? .35 : agachado ? .9 : 1.6;
  _colSnake.min.set(p.x - .1, p.y, p.z - .1);
  _colSnake.max.set(p.x + .1, p.y + alto, p.z + .1);
  for (const s of salidas) {
    const zg = guion.st === $("#esc-sel").value && guion.script?.zonas?.[s.zona] ? guion.adentro?.get(8650) : null;
    const uc = guion.ultimaCarga, conBoton = !!zg && guion.binds?.some(b => b.zona === s.zona && b.flags & 4);
    const dentro = conBoton ? !!uc && uc.zona === s.zona && uc.info?.desde === guion.st && uc !== s.cargaVista : zg ? zg.has(s.zona) : s.cajas.some(c => c.intersectsBox(_colSnake));
    if (conBoton && dentro) s.cargaVista = uc;
    const antes = conBoton ? false : s.dentro ?? true;
    s.dentro = dentro;
    if (!dentro || antes) continue;
    cambiando = true;
    window.debugLog?.("salida", `${$("#esc-sel").value} -> ${s.a}`);
    const t0g = guion.t, pendiente = () => !!zg && guion.cola.some(c => c.origen?.tipo === "trampa" && c.origen.zona === s.zona);
    esperaSalida = pendiente();
    const f = $("#fundido");
    if (f && !esperaSalida) f.style.opacity = 1;
    aviso("→ " + nombreEsc(s.a));
    setTimeout(async () => {
      for (const hasta = performance.now() + 6e3; pendiente() && performance.now() < hasta; ) await new Promise(r => setTimeout(r, 100));
      esperaSalida = false;
      if (f) f.style.opacity = 1;
      try {
        const desde = $("#esc-sel").value;
        const uc = guion.ultimaCarga, elegido = uc && uc.zona === s.zona && uc.t >= t0g - 1 && /^(s|d\d)/.test(uc.dest) && uc.dest !== s.a && uc.dest !== s.via ? uc : null;
        if (elegido) {
          debug.log("salida", `el script eligió ${elegido.dest} (nivel.json: ${s.a})`);
          await cargarEscenario(elegido.dest, {
            p: elegido.info.p,
            rot: elegido.info.rot,
            m: elegido.info.m,
            desde: desde
          });
          return;
        }
        const pasos = s.via ? (await cargarCadenas())?.salidas?.[desde]?.find(x => x.zona === s.zona && x.via === s.via)?.pasos : null;
        if (pasos?.length) await correrDemos(pasos);
        await cargarEscenario(s.a, {
          p: s.p,
          rot: s.rot,
          m: s.m,
          via: s.via,
          desde: desde
        });
      } finally {
        cambiando = false;
        if (f) setTimeout(() => f.style.opacity = 0, 150);
      }
    }, 450);
    return;
  }
}

function aparecer(principal) {
  const b = (new THREE.Box3).setFromObject(principal), c = b.getCenter(new THREE.Vector3);
  const ray = new THREE.Raycaster, cands = [];
  for (let i = 0; i <= 16; i++) for (let j = 0; j <= 16; j++) {
    const x = b.min.x + (b.max.x - b.min.x) * i / 16, z = b.min.z + (b.max.z - b.min.z) * j / 16;
    ray.set(new THREE.Vector3(x, b.max.y + 1, z), new THREE.Vector3(0, -1, 0));
    ray.far = b.max.y - b.min.y + 2;
    const hits = ray.intersectObjects(colisiones, false);
    hits.forEach((h, k) => {
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
      if (Math.abs(n.y) < .7) return;
      const libre = k === 0 ? 99 : h.distance - hits[k - 1].distance;
      if (libre >= 2) cands.push({
        p: h.point,
        d: Math.hypot(x - c.x, z - c.z),
        techo: k > 0
      });
    });
  }
  cands.sort((a, b) => b.techo - a.techo || a.d - b.d || a.p.y - b.p.y);
  const p = cands[0]?.p || c;
  ubicar(p.x, p.y + .05, p.z, 0);
  inicio.copy(rig.position);
}

async function ponerPersonaje() {
  const n = $("#esc-pj").value;
  const c = catalogo.find(x => x.nombre === n);
  if (!c) return;
  const o = await cargar(c.archivo);
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const p = rig.position.clone().addScaledVector(f, 2);
  const ray = new THREE.Raycaster(p.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3(0, -1, 0), 0, 6);
  const h = ray.intersectObjects(colisiones, false)[0];
  const pie = -(new THREE.Box3).setFromObject(o).min.y;
  o.position.set(p.x, (h ? h.point.y : rig.position.y) + pie, p.z);
  o.rotation.y = yaw;
  mundo.add(o);
}

$("#esc-sel").onchange = e => {
  usarPartida(null);
  cargarEscenario(e.target.value);
};

$("#esc-caminar").onclick = () => pedirMouse();

$("#esc-poner").onclick = ponerPersonaje;

$("#esc-vuelo").onclick = () => alternarVuelo();

function cambiarModo(m, inicio = "s00a") {
  if (m !== "jugar") usarPartida(null);
  if (m === "vr") {
    cerrarMenu();
    document.exitPointerLock?.();
    misionesVR.abrirMenu();
    return;
  }
  if (misionesVR.activo) misionesVR.cerrar();
  const inmersivo = m === "jugar";
  if (m === "jugar") {
    if (TACTIL && prefPantalla) pantallaCompleta(true, false);
    $("#modo-sigilo").checked = true;
    $("#esc-sel").value = inicio;
    m = "escenarios";
    document.querySelectorAll("#capas input").forEach(i => {
      i.checked = false;
      i.dispatchEvent(new Event("change"));
    });
    setTimeout(() => {
      $("#panel").classList.add("oculto");
      $("#mostrar").hidden = false;
      if (!TACTIL && !R.xr.isPresenting) {
        try {
          R.domElement.requestPointerLock?.()?.catch?.(() => {});
        } catch {}
      }
    }, 50);
  }
  modo = m;
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("activo", b.dataset.modo === (inmersivo ? "jugar" : m)));
  document.querySelectorAll('section[id^="s-"]').forEach(s => s.classList.toggle("activo", s.id === "s-" + m));
  orbita.enabled = m === "catalogo";
  $("#tactil").hidden = !TACTIL || m === "catalogo";
  if (m !== "escenarios") audioMGS.callar();
  if (m === "museo") construirMuseo();
  if (m === "catalogo") {
    listaCatalogo();
    verModelo(selCat || personajes[0]);
    selCat = selCat || personajes[0];
    listaCatalogo();
  }
  if (m === "escenarios") cargarEscenario($("#esc-sel").value || "s00a");
  ayuda();
}

document.querySelectorAll("nav button").forEach(b => b.onclick = () => cambiarModo(b.dataset.modo));

function ayuda() {
  $("#ayuda").textContent = textoAyuda({
    tactil: TACTIL,
    catalogo: modo === "catalogo",
    escenarios: modo === "escenarios"
  });
}

ctl.alCambiar(() => ayuda());

addEventListener("gamepadconnected", () => ayuda());

addEventListener("gamepaddisconnected", () => ayuda());

const teclas = {};

let vy = 0, vuelo = false, enSuelo = false;

const inicio = new THREE.Vector3;

const pisoSeguro = new THREE.Vector3;

let hayPisoSeguro = false, tAire = 0;

const ray = new THREE.Raycaster;

const ABAJO = new THREE.Vector3(0, -1, 0);

const modoDebug = () => {
  try {
    return localStorage.getItem("sm_debug") === "1";
  } catch {
    return false;
  }
};

const enJuegoReal = () => !!juego && modo === "escenarios";

function alternarVuelo() {
  if (!vuelo && enJuegoReal() && !modoDebug() && !vrCamara) {
    aviso("El vuelo es del MODO DEBUG (OPCIONES)");
    return;
  }
  vuelo = !vuelo;
  vy = 0;
  $("#esc-vuelo").textContent = "Vuelo: " + (vuelo ? "sí" : "no") + " (F)";
}

const saltoPermitido = () => !enJuegoReal();

const velSalto = () => enJuegoReal() ? 7.2 : 4.2;

function ponerModoDebug(si) {
  try {
    localStorage.setItem("sm_debug", si ? "1" : "0");
  } catch {}
  if (!si && vuelo && enJuegoReal() && !vrCamara) alternarVuelo();
  const b = $("#opt-debug");
  if (b) b.textContent = "Modo debug: " + (si ? "sí" : "no");
  aviso(si ? "Modo debug: vuelo (F)" : "Modo debug apagado");
}

{
  const b = document.getElementById("opt-debug");
  if (b) {
    b.textContent = "Modo debug: " + (modoDebug() ? "sí" : "no");
    b.onclick = () => ponerModoDebug(!modoDebug());
  }
}

addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" && e.target.type === "search") return;
  if (e.code === "KeyO" && !e.repeat) {
    e.preventDefault();
    alternarModoCamara();
    return;
  }
  if (camLibre.activa) {
    teclas[e.code] = true;
    if (e.code === "Tab") e.preventDefault();
    if (!e.repeat && e.code === "KeyF") fotoModoCamara("plana");
    if (!e.repeat && e.code === "KeyP") fotoModoCamara("360");
    return;
  }
  if (misionesVR.entrada(e.code)) {
    e.preventDefault();
    return;
  }
  teclas[e.code] = true;
  if (e.code === "Tab") {
    e.preventDefault();
    interfaz.alternarMenu();
  }
  if (e.code === "KeyL") {
    luzOriginal = !luzOriginal;
    aplicarLuz();
  }
  if (e.code === "KeyP") texturasPixel.alternar();
  if (e.code === "KeyF") alternarVuelo();
  if (e.code === "Space" && enSuelo && !vuelo && saltoPermitido()) vy = velSalto();
  if (e.code === "KeyC") alternarAgachado();
  if (e.code === "KeyG" && juego) golpearPared();
  if (e.code === "KeyR" && juego) (armas ?? juego).recargar();
  if (e.code === "KeyV") cambiarVista();
  if ((e.code === "KeyT" || e.code === "Backspace") && juego && modo === "escenarios") {
    e.preventDefault();
    codec.abrir();
  }
  if (e.code === "KeyJ" && !e.repeat && juego && modo === "escenarios" && !misionesVR.bloqueaControl) dispararDesdeCamara();
});

addEventListener("keyup", e => {
  teclas[e.code] = false;
  if (e.code === "KeyJ" && armas && modo === "escenarios") {
    const m = miraSnake();
    armas.soltar(m.o, m.d);
  }
});

ctl.configurarVibracion({
  xr: () => R.xr.isPresenting ? R.xr.getSession() : null,
  manoArma: () => manoArma()
});

const flancosMando = new FlancosMando, navMenu = new NavMando(() => [ ...document.querySelectorAll("#panel summary, #panel .cuerpo-grupo button:not([hidden]), #panel .cuerpo-grupo input, #panel .lista div:not(.grupo)") ].map(e => [ e ]));

let mandoAnt = 0, mandoMovia = false;

const CODIGO_DIR = {
  arriba: "ArrowUp",
  abajo: "ArrowDown",
  izq: "ArrowLeft",
  der: "ArrowRight",
  ok: "Enter",
  atras: "Backspace",
  start: "Escape"
};

const CODIGO_DIR_REP = {
  arriba: 1,
  abajo: 1,
  izq: 1,
  der: 1
}, dirVR = new Set;

function mandoCuadro(dt) {
  const g = ctl.mando();
  if (!g || pantallaControles.abierta || titulo.visible || partidaUI.abierta || codec.abierto || R.xr.isPresenting || camLibre.activa) {
    soltarMando();
    flancosMando.leer(null);
    return;
  }
  if (pantallaGameOver.activo) {
    soltarMando();
    for (const f of flancosMando.leer(g)) {
      const code = {
        izq: "ArrowLeft",
        der: "ArrowRight",
        ok: "Enter",
        start: "Enter"
      }[f];
      if (code) pantallaGameOver.tecla({
        code: code,
        preventDefault() {},
        stopPropagation() {}
      });
    }
    return;
  }
  if (misionesVR.activo && misionesVR.bloqueaControl) {
    soltarMando();
    for (const f of flancosMando.leer(g)) if (CODIGO_DIR[f]) {
      misionesVR.entrada(CODIGO_DIR[f]);
      if (f in CODIGO_DIR_REP) dirVR.add(f);
    }
    for (const k of [ ...dirVR ]) if (!flancosMando.ant.get(k)) {
      dirVR.delete(k);
      misionesVR.soltar(CODIGO_DIR[k]);
    }
    return;
  }
  if (enDemo || demo.ocupada) {
    soltarMando();
    flancosMando.leer(null);
    return;
  }
  if (interfaz.abierto) {
    soltarMando();
    for (const f of flancosMando.leer(g)) {
      if (f === "arriba" || f === "abajo") navMenu.mover(f); else if (f === "ok") {
        if (navMenu.el?.isConnected) navMenu.activar(); else navMenu.ubicar();
      } else if (f === "atras" || f === "start") {
        navMenu.limpiar();
        interfaz.cerrarMenu();
      }
    }
    return;
  }
  const F = flancosMando.leer(g);
  if (inventario.abierto) {
    soltarMando();
    return;
  }
  const bt = i => !!g.buttons[i]?.pressed, ax = g.axes || [];
  let estado = 0;
  for (const i of [ ctl.B.CRUZ, ctl.B.CIRCULO, ctl.B.CUADRADO, ctl.B.TRIANGULO, ctl.B.START, ctl.B.SELECT ]) if (bt(i)) estado |= 1 << i;
  const antes = mandoAnt;
  mandoAnt = estado;
  const baja = i => estado & 1 << i && !(antes & 1 << i), sube = i => !(estado & 1 << i) && antes & 1 << i;
  if (misionesVR.activo && F.includes("start")) {
    misionesVR.entrada("Escape");
    return;
  }
  if (F.includes("start")) {
    navMenu.limpiar();
    interfaz.alternarMenu();
  }
  if (baja(ctl.B.SELECT) && juego && modo === "escenarios") codec.abrir();
  if (baja(ctl.B.CRUZ)) alternarAgachado();
  if (baja(ctl.B.CIRCULO) && juego) golpearPared();
  if (baja(ctl.B.CUADRADO) && juego && modo === "escenarios" && !misionesVR.bloqueaControl) dispararDesdeCamara();
  if (sube(ctl.B.CUADRADO) && armas && modo === "escenarios") {
    const m = miraSnake();
    armas.soltar(m.o, m.d);
  }
  for (const [i, c] of [ [ ctl.B.TRIANGULO, "KeyE" ], [ ctl.B.CRUZ, "KeyC" ], [ ctl.B.CIRCULO, "KeyG" ], [ ctl.B.START, "Enter" ] ]) {
    if (baja(i)) teclas[c] = true; else if (sube(i)) teclas[c] = false;
  }
  if (tac.joy == null) {
    const p = ctl.palanca(ax[0], ax[1]);
    let x = p.x, y = -p.y, despacio = false;
    const dx = (bt(ctl.B.DER) ? 1 : 0) - (bt(ctl.B.IZQ) ? 1 : 0), dy = (bt(ctl.B.ARRIBA) ? 1 : 0) - (bt(ctl.B.ABAJO) ? 1 : 0);
    if (dx || dy) {
      const l = Math.hypot(dx, dy);
      x = dx / l;
      y = dy / l;
      despacio = false;
    } else if (p.m > 0) {
      x /= p.m;
      y /= p.m;
    }
    if (x || y) {
      tac.x = x;
      tac.y = y;
      tac.correr = despacio;
      mandoMovia = true;
    } else if (mandoMovia) {
      tac.x = tac.y = 0;
      tac.correr = false;
      mandoMovia = false;
    }
  }
  const r = ctl.palanca(ax[2], ax[3], .15);
  if (r.m > 0 && !padDemo.activo && !asomarse.bandera) {
    yaw -= r.x * r.m * 2.6 * dt;
    pitch = Math.max(-1.5, Math.min(1.5, pitch - r.y * r.m * 1.9 * dt));
  }
}

function soltarMando() {
  if (mandoAnt) {
    for (const [i, c] of [ [ ctl.B.TRIANGULO, "KeyE" ], [ ctl.B.CRUZ, "KeyC" ], [ ctl.B.CIRCULO, "KeyG" ], [ ctl.B.START, "Enter" ] ]) if (mandoAnt & 1 << i) teclas[c] = false;
    mandoAnt = 0;
  }
  if (mandoMovia) {
    tac.x = tac.y = 0;
    tac.correr = false;
    mandoMovia = false;
  }
}

$("#mostrar").onclick = () => interfaz.alternarMenu();

function cerrarMenu() {
  $("#panel").classList.add("oculto");
  $("#mostrar").hidden = false;
}

$("#cerrar").onclick = cerrarMenu;

R.domElement.addEventListener("pointerdown", () => {
  if (TACTIL && !$("#panel").classList.contains("oculto")) cerrarMenu();
});

R.domElement.addEventListener("click", () => {
  if (!TACTIL && modo !== "catalogo" && !R.xr.isPresenting) pedirMouse();
});

addEventListener("mouseup", e => {
  if (e.button === 0) mouseCuadrado = false;
  if (e.button === 0 && armas && modo === "escenarios") {
    const m = miraSnake();
    armas.soltar(m.o, m.d);
  }
});

R.domElement.addEventListener("mousedown", e => {
  if (e.button === 0 && !camLibre.activa && document.pointerLockElement === R.domElement && juego && modo === "escenarios" && !misionesVR.bloqueaControl) {
    mouseCuadrado = true;
    dispararDesdeCamara();
  }
});

addEventListener("blur", () => {
  mouseCuadrado = false;
});

let mouseCuadrado = false, cuadradoVR = false;

function cuadradoApretado() {
  if (mouseCuadrado || teclas.KeyJ || cuadradoVR) return true;
  if (TACTIL && tactil?._gatillo) return true;
  try {
    const g = ctl.mando();
    if (g?.buttons?.[ctl.B.CUADRADO]?.pressed) return true;
  } catch {}
  return false;
}

let apuntaRaton = false;

R.domElement.addEventListener("mousedown", e => {
  if (e.button === 2) apuntaRaton = true;
});

addEventListener("mouseup", e => {
  if (e.button === 2) apuntaRaton = false;
});

addEventListener("blur", () => {
  apuntaRaton = false;
});

R.domElement.addEventListener("contextmenu", e => e.preventDefault());

const apuntaHombro = () => vista === "hombro" && !R.xr.isPresenting && !!juego && modo === "escenarios" && (apuntaRaton || !!teclas.KeyE) && !vuelo && !reptando && !ducto.activo && !inventario.abierto;

document.addEventListener("pointerlockchange", () => {
  const tomado = document.pointerLockElement === R.domElement;
  $("#mira").style.display = tomado ? "block" : "none";
  if (modo !== "escenarios" || !juego || misionesVR.activo || camLibre.activa) return;
  if (!tomado && (interfaz.bloqueada || enDemo || demo.ocupada || codec.abierto || titulo.visible || pantallaGameOver.activo)) return;
  if (tomado) cerrarMenu(); else {
    $("#panel").classList.remove("oculto");
    $("#mostrar").hidden = true;
  }
});

addEventListener("mousemove", e => {
  if (camLibre.activa) {
    if (document.pointerLockElement === R.domElement) camLibre.mirar(e.movementX * .0022, e.movementY * .0022);
    return;
  }
  if (document.pointerLockElement !== R.domElement || inventario.abierto || padDemo.activo) return;
  if (asomarse.bandera) return;
  yaw -= e.movementX * .0022;
  pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * .0022));
});

function golpe(o, d, far, lista = colisiones) {
  ray.set(o, d);
  ray.far = far;
  return ray.intersectObjects(lista, false)[0];
}

const esDeSnake = o => {
  for (let p = o; p; p = p.parent) if (p === rig || cuerpo && p === cuerpo.obj) return true;
  return false;
};

function primerGolpe(o, d, far, lista) {
  ray.set(o, d);
  ray.far = far;
  for (const h of ray.intersectObjects(lista, false)) if (!esDeSnake(h.object)) return h;
  return null;
}

const _rC = new THREE.Vector3, _vC = new THREE.Vector3, _X = new THREE.Vector3(1, 0, 0);

let alfaCuerpoAct = 1;

function alfaCuerpo(d) {
  if (stealthCuerpo && stealthCuerpo === cuerpo) return;
  const a = d == null ? 1 : Math.max(.25, Math.min(1, (d - .5) / .7 * .75 + .25));
  if (!cuerpo?.obj || Math.abs(a - alfaCuerpoAct) < .02 && a === 1 === (alfaCuerpoAct === 1)) return;
  const trans = a < 1, cambia = trans !== alfaCuerpoAct < 1;
  alfaCuerpoAct = a;
  cuerpo.obj.traverse(m => {
    if (!m.userData.cuerpo || !m.material) return;
    for (const mt of Array.isArray(m.material) ? m.material : [ m.material ]) {
      mt.opacity = 1;
      mt.blendAlpha = a;
      if (cambia) {
        mt.transparent = trans;
        if (!cuerpo.oculto) mt.depthWrite = !trans;
        if (trans) {
          mt.blending = THREE.CustomBlending;
          mt.blendEquation = THREE.AddEquation;
          mt.blendSrc = THREE.ConstantAlphaFactor;
          mt.blendDst = THREE.OneMinusConstantAlphaFactor;
        } else mt.blending = THREE.NormalBlending;
        mt.needsUpdate = true;
      }
    }
  });
}

const STEALTH_OPACIDAD = .35, STEALTH_OSCURO = .9;

let stealthCuerpo = null;

function actualizarStealth() {
  if (!cuerpo?.obj) {
    stealthCuerpo = null;
    return;
  }
  const si = inventario.item === IT.STEALTH;
  if (!si && stealthCuerpo !== cuerpo) return;
  const nuevo = si && stealthCuerpo !== cuerpo;
  cuerpo.obj.traverse(m => {
    if (!m.userData.cuerpo || !m.material) return;
    if (si) {
      if (nuevo) {
        m.userData.ordenStealth = m.renderOrder;
        m.renderOrder = 900;
      }
    } else if (m.userData.ordenStealth != null) {
      m.renderOrder = m.userData.ordenStealth;
      delete m.userData.ordenStealth;
    }
    for (const mt of Array.isArray(m.material) ? m.material : [ m.material ]) {
      if (si) {
        if (nuevo) {
          if (mt.color) {
            mt.userData.colorStealth = mt.color.clone();
            mt.color.multiplyScalar(STEALTH_OSCURO);
          }
          mt.userData.alphaTestStealth = mt.alphaTest;
          mt.alphaTest = 0;
          mt.blending = THREE.CustomBlending;
          mt.blendEquation = THREE.AddEquation;
          mt.blendSrc = THREE.ConstantAlphaFactor;
          mt.blendDst = THREE.OneMinusConstantAlphaFactor;
          mt.blendAlpha = STEALTH_OPACIDAD;
          mt.transparent = true;
          mt.opacity = 1;
          mt.needsUpdate = true;
        }
        mt.depthWrite = false;
      } else {
        if (mt.userData.colorStealth) {
          mt.color.copy(mt.userData.colorStealth);
          delete mt.userData.colorStealth;
        }
        if (mt.userData.alphaTestStealth != null) {
          mt.alphaTest = mt.userData.alphaTestStealth;
          delete mt.userData.alphaTestStealth;
        }
        const trans = alfaCuerpoAct < 1;
        mt.opacity = 1;
        mt.transparent = trans;
        if (!cuerpo.oculto) mt.depthWrite = !trans;
        if (trans) mt.blendAlpha = alfaCuerpoAct; else mt.blending = THREE.NormalBlending;
        mt.needsUpdate = true;
      }
    }
  });
  stealthCuerpo = si ? cuerpo : null;
}

function distanciaCamara(P, C, lateral, margen, minimo) {
  const lista = colParedes ? colParedes.concat(colisiones) : colisiones;
  let k = 1;
  for (const s of [ 0, -.25, .25 ]) {
    _rC.copy(C).addScaledVector(lateral, s).sub(P);
    const l = _rC.length();
    if (l < 1e-4) continue;
    _rC.divideScalar(l);
    const h = primerGolpe(P, _rC, l + margen, lista);
    if (h) k = Math.min(k, Math.max(minimo, h.distance - margen) / l);
  }
  return k;
}

function deslizar(pos, mov) {
  for (let pasada = 0; pasada < 2; pasada++) {
    const len = mov.length();
    if (len < 1e-6) return mov;
    const d = mov.clone().normalize();
    const juegoHzm = modo === "escenarios" && colParedes && colParedes.length;
    const alturas = juegoHzm ? [ vuelo ? .75 : agachado ? .25 : .75 ] : [ PASO, 1, 1.5 ];
    for (const h of alturas) {
      const o = pos.clone();
      o.y += h;
      const g = golpe(o, d, len + RADIO, juegoHzm ? colParedes : colisiones);
      if (!g) continue;
      const n = g.face.normal.clone().transformDirection(g.object.matrixWorld);
      n.y = 0;
      if (n.lengthSq() < 1e-6) continue;
      n.normalize();
      if (n.dot(d) > 0) n.negate();
      const dentro = mov.dot(n);
      if (dentro < 0) mov.addScaledVector(n, -dentro);
      if (juegoHzm) choquePared = {
        n: n.clone(),
        punto: g.point.clone()
      };
      if (g.distance < RADIO) mov.addScaledVector(n, (RADIO - g.distance) * .5);
      break;
    }
  }
  return mov;
}

let padFindtrap = null;

let giroListo = true, mirarJ = 0;

let arranqueCarrera = 0, tTransPostura = 0;

const giroSnake = {
  espera: 0,
  movia: false,
  atras: false
};

function mover(dt) {
  if (misionesVR.bloqueaControl) return;
  if (cargaNivel || cambiando && !esperaSalida) return;
  if (esperaRecarga) {
    vy = 0;
    return;
  }
  if (muerteSnake) return;
  if (snakeScript.frenado || snakeScript.sinPad || snakeScript.destino || snakeScript.motion) return;
  if (congeladoJefe) return;
  if (juego?.snakeBloqueado?.()) {
    vy = 0;
    return;
  }
  if (armas?.misil && !armas.misil.perdido) {
    armas.mandoMisil = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0) + Math.sign(tac.x);
    if (R.xr.isPresenting) {
      for (const f of R.xr.getSession()?.inputSources || []) {
        if (f.handedness === manoMov() && f.gamepad && Math.abs(f.gamepad.axes[2] || 0) > ctl.quest.zonaMuerta) armas.mandoMisil = Math.sign(f.gamepad.axes[2]);
      }
    }
    return;
  }
  if (armas) armas.mandoMisil = 0;
  let f = 0, s = 0, up = 0;
  if (teclas.KeyW || teclas.ArrowUp) f += 1;
  if (teclas.KeyS || teclas.ArrowDown) f -= 1;
  if (teclas.KeyD || teclas.ArrowRight) s += 1;
  if (teclas.KeyA || teclas.ArrowLeft) s -= 1;
  if (teclas.KeyE) up += 1;
  if (teclas.KeyQ) up -= 1;
  f += tac.y;
  s += tac.x;
  if (padDemo.activo) {
    f = pdMov.f;
    s = pdMov.s;
  }
  if (esperaSalida) {
    f = 0;
    s = 0;
  }
  if (padGuion.suelto && !padDemo.activo) {
    if (padGuion.st !== $("#esc-sel").value) padGuion.suelto = false; else if ((juego?.__jefes?.lista || []).some(j => j.vivo !== false)) padGuion.suelto = false; else {
      f = 0;
      s = 0;
      if (guion.t - padGuion.desde > 1800) {
        padGuion.suelto = false;
        debug.log("guion", "pad -r sin pad -s en 60 s: el visor devuelve el control");
      }
    }
  }
  let correr = (teclas.ShiftLeft || teclas.ShiftRight || tac.correr) && !padDemo.activo;
  let dirYaw = yaw, dirPitch = pitch;
  if (R.xr.isPresenting) {
    const ses = R.xr.getSession();
    if (!paneles.ocupaMandos) for (const src of ses.inputSources) {
      const gp = src.gamepad;
      if (!gp || gp.axes.length < 4) continue;
      const x = gp.axes[2], y = gp.axes[3], Q = ctl.quest;
      if (src.handedness === manoMov()) {
        const p = ctl.palanca(x, y, Q.zonaMuerta);
        s += p.x;
        f -= p.y;
      }
      if (src.handedness === manoArma()) {
        if (Q.giro === "suave") {
          const p = ctl.palanca(x, 0, Q.zonaMuerta);
          if (p.x) girarRig(-p.x * Q.velGiro * (Math.PI / 180) * dt);
        } else {
          if (Math.abs(x) > .7 && giroListo) {
            const a = (Q.angulo || 30) * (Math.PI / 180);
            girarRig(x > 0 ? -a : a);
            giroListo = false;
          }
          if (Math.abs(x) < .3) giroListo = true;
        }
        if (vuelo && Math.abs(y) > Math.max(.3, Q.zonaMuerta)) up -= y;
      }
    }
    const d = new THREE.Vector3;
    R.xr.getCamera().getWorldDirection(d);
    dirYaw = Math.atan2(-d.x, -d.z);
    dirPitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    if (ctl.quest.dir === "control") {
      const ci = [ 0, 1 ].map(i => R.xr.getController(i)).find(c => c.userData.lado === manoMov());
      if (ci) {
        const v = ci.getWorldDirection(new THREE.Vector3).negate();
        if (Math.hypot(v.x, v.z) > .25) dirYaw = Math.atan2(-v.x, -v.z);
      }
    }
  }
  if (camaraJuegoActiva()) {
    dirYaw = camJuego ? camJuego.resultado().rumboPad : 0;
    dirPitch = 0;
  }
  const fpJ = camaraJuegoActiva() && !!camJuego?.primeraPersona;
  {
    const enPrimera = !R.xr.isPresenting && (vista === "primera" || fpJ) && !ducto.activo && !!juego && modo === "escenarios" && !vuelo;
    const ojoY = (fpJ ? cabezaSnake() : null) ?? rig.position.y + (reptando ? .35 : agachado ? .75 : ALTURA_OJOS);
    const a = asomarse.update(dt, {
      activo: enPrimera,
      ojo: new THREE.Vector3(rig.position.x, ojoY, rig.position.z),
      rumbo: fpJ ? rumbo : yaw,
      pared: (o, d, lejos) => golpe(o, d, lejos, colParedes)?.distance ?? null
    });
    if (a.bloquea) {
      f = 0;
      s = 0;
    }
  }
  if (fpJ) {
    rumbo -= Math.sign(s) * 32 * ANG * 30 * dt;
    s = 0;
    dirYaw = rumbo;
    const enDucto = camJuego.enDucto;
    mirarJ += ((enDucto ? 0 : f > 0 ? -320 : f < 0 ? 400 : 0) - mirarJ) * Math.min(1, dt * 30 / 4);
    if (!enDucto) f = 0;
  } else mirarJ = 0;
  const mag = Math.hypot(f, s);
  if (mag > .001 && mag < 1) {
    const k = (R.xr.isPresenting ? Math.min(1, mag / .6) : 1) / mag;
    f *= k;
    s *= k;
  }
  if (agachado && !reptando && !vuelo && !pared && juego && modo === "escenarios" && !R.xr.isPresenting && Math.hypot(f, s) > .2) {
    reptando = true;
    tTransPostura = 12 / 30;
    aviso("Cuerpo a tierra");
  }
  if (tTransPostura > 0) {
    tTransPostura -= dt;
    f = 0;
    s = 0;
  }
  const vAgarre = juego?.velAgarre?.() ?? null;
  if (vAgarre === 0) return;
  const wId = armas ? inventario.arma : 0, quiereMover = Math.hypot(f, s) > .001;
  arranqueCarrera = quiereMover && !agachado && !reptando && !pared && !correr && !R.xr.isPresenting ? arranqueCarrera + dt : 0;
  let vel = vuelo ? vrCamara ? 2.5 : 7 : vAgarre ? vAgarre : reptando ? velSnake(wId, "reptar") : pared ? velSnake(wId, pared.lado < 0 ? "paredI" : "paredD") : agachado ? velSnake(wId, "agachado") : correr ? 1.5 : arranqueCarrera > 0 && arranqueCarrera <= 6 / 30 ? velSnake(wId, "arrancar") : velSnake(wId, "correr");
  if (!vuelo && juego?.sn?.enAgua) vel = Math.min(vel, 1.5);
  const fw = new THREE.Vector3(-Math.sin(dirYaw), 0, -Math.cos(dirYaw));
  const rt = new THREE.Vector3(Math.cos(dirYaw), 0, -Math.sin(dirYaw));
  const mov = (new THREE.Vector3).addScaledVector(fw, f).addScaledVector(rt, s);
  if (mov.lengthSq() > 1) mov.normalize();
  mov.multiplyScalar(vel * dt);
  const pos = rig.position;
  if (vuelo || modo === "catalogo") {
    if (vuelo) mov.y += Math.sin(dirPitch) * f * vel * dt;
    mov.y += up * vel * dt;
    pos.add(mov);
    return;
  }
  const quiero = mov.clone();
  choquePared = null;
  if (camaraJuegoActiva() && !fpJ && !pared && !vAgarre) {
    const L = Math.hypot(mov.x, mov.z), G = giroSnake;
    if (L > 1e-6) {
      let d = Math.atan2(-mov.x, -mov.z) + (reptando && G.atras ? Math.PI : 0) - rumbo;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (reptando) {
        if (Math.abs(d) > 1280 * ANG) {
          G.atras = !G.atras;
          d = Math.atan2(Math.sin(d + Math.PI), Math.cos(d + Math.PI));
        }
      } else {
        G.atras = false;
        if (!G.movia && G.espera <= 0 && Math.abs(d) > 256 * ANG) G.espera = (Math.floor(Math.abs(d) / (1024 * ANG)) + 1) / 30;
      }
      rumbo += d * (1 - Math.pow(.75, dt * 30));
      if (!reptando && (G.espera > 0 || Math.abs(d) > 1048 * ANG)) {
        G.espera -= dt;
        mov.set(0, 0, 0);
        arranqueCarrera = 0;
        G.movia = false;
      } else {
        const sg = reptando && G.atras ? -1 : 1;
        mov.set(-Math.sin(rumbo) * L * sg, 0, -Math.cos(rumbo) * L * sg);
        G.movia = true;
      }
    } else {
      G.movia = false;
      G.espera = 0;
      G.atras = false;
    }
  } else {
    giroSnake.movia = false;
    giroSnake.espera = 0;
  }
  const giroJuego = camaraJuegoActiva() && !fpJ && !pared && !vAgarre;
  deslizar(pos, mov);
  if (modo === "escenarios" && juego && !reptando && enSuelo && !R.xr.isPresenting) {
    const q = Math.hypot(quiero.x, quiero.z);
    if (pared) {
      _pp.copy(pos);
      _pp.y += agachado ? .25 : .75;
      const atras = golpe(_pp, pared.n.clone().negate(), RADIO + .25, colParedes);
      if (!atras || q > 1e-6 && (quiero.x * pared.n.x + quiero.z * pared.n.z) / q > .5) {
        pared = null;
        contactoPared = 0;
      } else {
        const der = new THREE.Vector3(pared.n.z, 0, -pared.n.x);
        pared.lado = q > 1e-6 ? -Math.sign(quiero.dot(der)) : 0;
      }
    } else if (choquePared && q > 1e-6 && (quiero.x * choquePared.n.x + quiero.z * choquePared.n.z) / q < -.7) {
      if (++contactoPared >= 3) {
        pared = {
          n: choquePared.n.clone(),
          lado: 0,
          rumbo: Math.atan2(-choquePared.n.x, -choquePared.n.z)
        };
        if (juego?.sn?.enAgua) seEn(183, null); else sonido(SE_PEGAR);
      }
    } else contactoPared = 0;
  } else {
    pared = null;
    contactoPared = 0;
  }
  if (enSuelo && !reptando && !pared) {
    const avance = Math.hypot(mov.x, mov.z);
    if (avance > 1e-5 && dt > 0) {
      const f0 = pasos.fase;
      pasos.fase = (pasos.fase + avance / dt / velSnake(wId, agachado ? "agachado" : "correr") * 30 * dt) % 17;
      const cruza = k => f0 <= pasos.fase ? k > f0 && k <= pasos.fase : k > f0 || k <= pasos.fase;
      if (cruza(8)) pasoSnake(0); else if (cruza(16)) pasoSnake(1);
    }
  } else if (ducto.activo && reptando) {
    const avance = Math.hypot(mov.x, mov.z);
    if (avance > 1e-5 && dt > 0) {
      const f0 = pasos.faseD;
      pasos.faseD = (pasos.faseD + avance / dt / velSnake(wId, "reptar") * 30 * dt) % 27;
      const cruza = k => f0 <= pasos.faseD ? k > f0 && k <= pasos.faseD : k > f0 || k <= pasos.faseD;
      const id = cruza(12) ? 0 : cruza(24) ? 1 : -1;
      if (id >= 0 && asioto) {
        const se = (asioto.ducto[atrPiso & 3] || [ 0, 0 ])[id];
        if (se) seEn(se, null);
      }
    }
  }
  if (pared && terceraPersona()) rumbo = pared.rumbo; else if (terceraPersona() && !fpJ && !giroJuego && Math.hypot(mov.x, mov.z) > 1e-4) {
    const objetivo = Math.atan2(-mov.x, -mov.z);
    let d = objetivo - rumbo;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    rumbo += d * (1 - Math.pow(.75, dt * 30));
  } else if (!terceraPersona()) rumbo = yaw;
  if (vista === "hombro" && !R.xr.isPresenting && (tApunta > 0 || apuntaHombro())) rumbo = yaw;
  pos.x += mov.x;
  pos.z += mov.z;
  vy -= (enJuegoReal() ? 28.8 : 9.8) * dt;
  const subir = agachado ? .2 : PASO;
  const usaHzm = modo === "escenarios" && !!colPisos;
  const subirH = usaHzm && !agachado ? 1 : subir;
  const extra = Math.max(0, -vy * dt) + .05 + (enSuelo && !vuelo ? .45 : 0);
  const o = pos.clone();
  o.y += subirH + .1;
  let g = golpe(o, ABAJO, subirH + .1 + extra, usaHzm ? colPisos : colisiones);
  if (!g && usaHzm) {
    const o2 = pos.clone();
    o2.y += subir + .1;
    g = primerGolpe(o2, ABAJO, subir + .1 + extra, colisiones);
  }
  if (g && vy <= 0) {
    pos.y = g.point.y;
    vy = 0;
    enSuelo = true;
    atrPiso = g.object.userData.atr ? g.object.userData.atr[Math.floor(g.faceIndex / 2)] ?? 0 : 0;
    pisoSeguro.copy(pos);
    hayPisoSeguro = true;
    tAire = 0;
  } else {
    pos.y += vy * dt;
    enSuelo = false;
    tAire += dt;
  }
  if (hayPisoSeguro && tAire > 3) {
    pos.copy(pisoSeguro);
    vy = 0;
    tAire = 0;
    debug.log("aviso", "Snake se cayó del mapa: vuelve a " + pos.toArray().map(v => v.toFixed(2)).join(", "));
  }
  if (pos.y < inicio.y - 80) {
    pos.copy(inicio);
    vy = 0;
  }
}

const VEL_GUARDIA = 1.1, GESTOS = [ "estirarse", "frotarse el cuello", "estornudar", "mirar a la derecha", "mirar a la izquierda" ];

function patrullar(p, dt) {
  if (p.gesto > 0) {
    p.gesto -= dt;
    if (p.gesto <= 0) p.an.tocar("parado");
    return;
  }
  if (p.pts.length < 2) {
    if ((p.tic -= dt) <= 0) {
      const g = GESTOS[Math.floor(Math.random() * GESTOS.length)];
      const a = p.an.tocar(g, {
        loop: false
      });
      p.gesto = a ? a.getClip().duration : 0;
      p.tic = 10 + Math.random() * 15;
    }
    return;
  }
  if (p.espera > 0) {
    p.espera -= dt;
    p.an.tocar("parado");
    return;
  }
  const dest = p.pts[(p.i + 1) % p.pts.length];
  const d = dest.clone().sub(p.o.position);
  const dist = Math.hypot(d.x, d.z);
  if (dist < .05) {
    p.i = (p.i + 1) % p.pts.length;
    p.o.position.copy(dest);
    p.espera = Math.random() < .3 ? 1 + Math.random() * 2 : 0;
    return;
  }
  const ang = Math.atan2(d.x, d.z);
  let dif = ang - p.o.rotation.y;
  dif = Math.atan2(Math.sin(dif), Math.cos(dif));
  p.o.rotation.y += Math.sign(dif) * Math.min(Math.abs(dif), dt * 4);
  p.an.tocar("caminar");
  if (Math.abs(dif) < .6) {
    const paso = Math.min(dist, VEL_GUARDIA * dt);
    p.o.position.x += d.x / dist * paso;
    p.o.position.z += d.z / dist * paso;
    p.o.position.y += (dest.y - p.o.position.y) * Math.min(1, paso / dist);
  }
}

const pasos = {
  d: 0,
  lado: false,
  fase: 0,
  faseD: 0
};

let asioto = null, atrPiso = 0, trampasHzm = [];

function armarAsioto(aA) {
  const o = aA.opts || {}, pares = v => {
    const r = [];
    for (let i = 0; i + 1 < (v || []).length; i += 2) r.push([ v[i], v[i + 1] ]);
    return r;
  };
  const t = (o.t || []).map(x => typeof x === "object" ? x : {
    id: x,
    n: null
  });
  asioto = {
    se: pares(o.s),
    se2: o.f ? pares(o.f) : [ [ 169, 168 ] ],
    ruido: o.n || [],
    ducto: o.i ? pares(o.i) : [ [ 5, 6 ] ],
    zonas: t.map(x => trampasHzm.filter(z => x.n && z.nombre === x.n || strcode(z.nombre) === x.id).map(z => z.caja))
  };
}

const strcode = t => {
  let id = 0;
  for (const c of (new TextEncoder).encode(t || "")) id = (id << 5 | id >> 11) + c & 65535;
  return id;
};

const _pp = new THREE.Vector3;

function pasoSnake(i) {
  const A = asioto;
  if (!A) return;
  const p = rig.position;
  _pp.set(p.x, p.y + .3, p.z);
  for (let k = 0; k < A.zonas.length; k++) {
    if (!A.zonas[k].some(b => b.containsPoint(_pp))) continue;
    const id = A.se[k]?.[i];
    if (id) seEn(id, null);
    if (A.ruido[k] && juego) juego.setRuido(100, 4, p.clone());
    return;
  }
  const id = (A.se2[atrPiso & 3] || [ 0, 0 ])[i];
  if (id) seEn(id, null);
}

let pared = null, contactoPared = 0, choquePared = null, tGolpePared = 0, ladoGolpe = "d";

function sePostura() {
  if (juego && modo === "escenarios") audioMGS.se(juego.sn?.enAgua ? 183 : 8);
}

function alternarAgachado() {
  if (!agachado) {
    agachado = true;
    reptando = false;
    sePostura();
    aviso("Agachado");
    return;
  }
  if (!reptando) {
    const o = rig.position.clone();
    o.y += .5;
    if (juego && modo === "escenarios" && golpe(o, new THREE.Vector3(0, 1, 0), .6, colParedes || colisiones)) {
      aviso("Agachado (no hay lugar para pararse)");
      return;
    }
    if (juego && modo === "escenarios" && !R.xr.isPresenting) {
      agachado = false;
      sePostura();
      aviso("De pie");
      return;
    }
    reptando = true;
    sePostura();
    aviso("Cuerpo a tierra (B: pararse)");
    return;
  }
  const o = rig.position.clone();
  o.y += .5;
  if (golpe(o, new THREE.Vector3(0, 1, 0), 1.2, colParedes || colisiones) || golpe(o, new THREE.Vector3(0, 1, 0), 1.2, colisiones)) {
    reptando = false;
    aviso("Agachado (no hay lugar para pararse)");
    return;
  }
  agachado = false;
  reptando = false;
  sePostura();
  aviso("De pie");
  if (!R.xr.isPresenting && juego) tTransPostura = 14 / 30;
}

function pararseVR() {
  const o = rig.position.clone();
  o.y += .5;
  const arriba = new THREE.Vector3(0, 1, 0), alto = reptando ? 1.2 : .6;
  if (golpe(o, arriba, alto, colParedes || colisiones) || golpe(o, arriba, alto, colisiones)) return false;
  agachado = false;
  reptando = false;
  sePostura();
  aviso("De pie");
  return true;
}

function pedirMouse() {
  try {
    const p = R.domElement.requestPointerLock?.({
      unadjustedMovement: false
    });
    p?.catch?.(() => {});
  } catch {}
}

function golpearPared() {
  botonesGuion |= 32;
  armas?.detonar();
  if (ducto.activo || snakeScript.motion) return;
  if (R.xr.isPresenting && (agachado || reptando) && juego && modo === "escenarios" && guion.trampaDePie?.(snakeGuion(false)) && pararseVR()) return;
  if (pared) {
    ladoGolpe = ladoGolpe === "d" ? "i" : "d";
    tGolpePared = (armas ? inventario.arma >= 0 : true) ? 18 / 30 : 24 / 30;
    const pt = rig.position.clone();
    pt.y += agachado ? .5 : 1;
    pt.addScaledVector(pared.n, -(RADIO + .05));
    sonido("toc");
    juego?.ruidoPared(pt);
    return;
  }
  tGolpe = 34 / 30;
  tApunta = 0;
  const fr = terceraPersona() ? new THREE.Vector3(-Math.sin(rumbo), 0, -Math.cos(rumbo)) : new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  if (juego && juego.golpear(rig.position.clone(), fr)) return;
  const o = rig.position.clone();
  o.y += 1;
  const g = golpe(o, fr, 1.2, colParedes || colisiones);
  if (!g) {
    aviso("No hay pared cerca");
    return;
  }
  sonido("toc");
  juego.ruidoPared(g.point);
}

const _P = new THREE.Vector3, _C = new THREE.Vector3, _dirC = new THREE.Vector3;

let muerteSnake = null;

const camaraEnMisil = () => !!armas?.misil && !R.xr.isPresenting && (vista !== "arriba" || !!teclas.KeyE);

function actualizarCamara(dt) {
  if (R.xr.isPresenting && vrModo() !== "pantalla") {
    rig.rotation.y = yaw;
    return;
  }
  const e10 = camaraEscena(escena10A, despertar);
  if (e10) {
    rig.rotation.y = 0;
    rig.updateMatrixWorld();
    cam.position.copy(rig.worldToLocal(e10.pos.clone()));
    cam.lookAt(e10.mira);
    if (Math.abs(cam.fov - e10.fov) > .01) {
      cam.fov = e10.fov;
      cam.updateProjectionMatrix();
    }
    return;
  }
  const vm = camaraEnMisil() ? armas.vistaMisil() : null;
  if (vm) {
    rig.updateMatrixWorld();
    cam.position.copy(rig.worldToLocal(vm.pos.clone()));
    cam.lookAt(vm.pos.clone().add(vm.dir));
    return;
  }
  if (vista !== "arriba") {
    const zf = armas ? armas.fovFactor() : 1, fz = FOV_NORMAL / zf * (vista === "hombro" ? 1 - .2 * hombroK : 1);
    if (Math.abs(cam.fov - fz) > .01) {
      cam.fov = fz;
      cam.updateProjectionMatrix();
    }
  }
  const vj = juego?.__jefes?.camaraEspecial?.();
  if (vj) {
    rig.rotation.y = 0;
    rig.updateMatrixWorld();
    cam.position.copy(rig.worldToLocal(vj.pos.clone()));
    cam.lookAt(vj.mira);
    return;
  }
  const vc = misionesVR.camaraEspecial();
  if (vc) {
    rig.rotation.y = 0;
    rig.updateMatrixWorld();
    cam.position.copy(rig.worldToLocal(vc.pos.clone()));
    cam.lookAt(vc.mira);
    return;
  }
  if (muerteSnake && vista === "primera") {
    muerteSnake.t += dt;
    const k = Math.min(1, muerteSnake.t / 1.1);
    cam.position.y += (.25 - cam.position.y) * Math.min(1, dt * 6);
    cam.rotation.set(pitch * (1 - k) + .5 * k, 0, .6 * k * k, "YXZ");
    return;
  }
  const k = Math.min(1, dt * 10);
  if (vista === "primera") {
    const bal = armas ? armas.balanceo() : {
      yaw: 0,
      pitch: 0
    };
    rig.rotation.y = yaw + bal.yaw;
    cam.rotation.set(pitch + bal.pitch, 0, 0, "YXZ");
    cam.position.x += (0 - cam.position.x) * k;
    cam.position.z += (0 - cam.position.z) * k;
    const caido = [ "derribo", "piso" ].includes(juego?.sn?.reac?.tipo);
    cam.position.y += ((reptando || caido ? .35 : agachado ? .75 : ALTURA_OJOS) - cam.position.y) * k;
    if (asomarse.desp.lengthSq() > 0) {
      _P.copy(asomarse.desp).applyAxisAngle(new THREE.Vector3(0, 1, 0), -rig.rotation.y);
      cam.position.x = _P.x;
      cam.position.z = _P.z;
    }
    const oj = ducto.ojo(dt);
    if (oj) {
      rig.updateMatrixWorld();
      cam.position.lerp(rig.worldToLocal(_P.set(oj.p.x, oj.p.y, oj.p.z)), oj.k);
    }
    return;
  }
  if (vista === "hombro") {
    rig.rotation.y = yaw;
    pitch = Math.max(-1.05, Math.min(.75, pitch));
    hombroK += ((apuntaHombro() || tApunta > 0 ? 1 : 0) - hombroK) * Math.min(1, dt * 10);
    const cp = Math.cos(pitch), dist = 3.1 - 1.85 * hombroK, lado = .35 + .25 * hombroK;
    _P.copy(rig.position);
    _P.y += reptando ? .6 : agachado ? 1 : 1.5 + .08 * hombroK;
    const f = new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp), der = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    _C.copy(_P).addScaledVector(f, -dist).addScaledVector(der, lado);
    _C.y += .3 * (1 - hombroK) * cp;
    const kc = distanciaCamara(_P, _C, der, .25, .3);
    _C.sub(_P).multiplyScalar(kc).add(_P);
    rig.updateMatrixWorld();
    const local = rig.worldToLocal(_C.clone());
    cam.getWorldPosition(_vC);
    if (kc < 1 && _C.distanceTo(_P) < _vC.distanceTo(_P)) cam.position.copy(local); else cam.position.lerp(local, Math.min(1, dt * 14));
    cam.rotation.set(pitch, 0, 0, "YXZ");
    cam.getWorldPosition(_vC);
    alfaCuerpo(_vC.distanceTo(_P));
    return;
  }
  alfaCuerpo(null);
  rig.rotation.y = 0;
  rig.updateMatrixWorld();
  if (camJuego) {
    const c = camJuego.update(dt, {
      pos: rig.position,
      postura: reptando ? 2 : agachado ? 1 : 0,
      rumbo: rumbo,
      pared: !!pared,
      cabezaY: cabezaSnake(),
      primeraPersona: !!teclas.KeyE && !vuelo && !!juego && !muerteSnake,
      mirar: Math.round(mirarJ),
      asomar: asomarse.desp
    });
    cam.position.copy(rig.worldToLocal(c.pos.clone()));
    cam.lookAt(c.objetivo);
    if (Math.abs(cam.fov - c.fov) > .01) {
      cam.fov = c.fov;
      cam.updateProjectionMatrix();
    }
    return;
  }
  if (cam.fov !== FOV_NORMAL) {
    cam.fov = FOV_NORMAL;
    cam.updateProjectionMatrix();
  }
  _P.copy(rig.position);
  _P.y += 1;
  _C.copy(rig.position).add(new THREE.Vector3(0, 3.4, 3));
  const kc = distanciaCamara(_P, _C, _X, .3, .6);
  _C.sub(_P).multiplyScalar(kc).add(_P);
  rig.updateMatrixWorld();
  const local = rig.worldToLocal(_C.clone());
  cam.getWorldPosition(_vC);
  if (kc < 1 && _C.distanceTo(_P) < _vC.distanceTo(_P)) cam.position.copy(local); else cam.position.lerp(local, Math.min(1, dt * 8));
  _P.y += .2;
  cam.lookAt(_P);
}

const _cabS = new THREE.Vector3;

function cabezaSnake() {
  if (!cuerpo?.obj?.parent) return null;
  const h = cuerpo.hueso6 ||= cuerpo.obj.getObjectByName("hueso_6");
  if (!h) return null;
  return h.getWorldPosition(_cabS).y;
}

let pdMov = {
  f: 0,
  s: 0
}, pdVista = null;

function actualizarPadDemo(dt) {
  if (!padDemo.activo) {
    if (inventario.padExterno != null) inventario.padExterno = null;
    return;
  }
  if (!juego || modo !== "escenarios" || $("#esc-sel").value !== padDemo.st) {
    padDemo.cortar();
    finPadDemo(null);
    return;
  }
  if (teclas.KeyC && padDemo.cancelable) {
    teclas.KeyC = false;
    padDemo.cancelar();
    return;
  }
  if (pdVista == null) {
    pdVista = vista;
    pdRumbo = null;
  }
  const n = cargaNivel || cambiando ? 0 : padDemo.avanzar(dt), B = BOTON, b = padDemo.bits;
  inventario.padExterno = b & (B.L1 | B.L2 | B.R1 | B.R2 | B.ARRIBA | B.ABAJO | B.IZQ | B.DER | B.CIR | B.CRU);
  const mira = inventario.item === IT.SCOPE, primera = mira || !!(b & B.TRI);
  if (!R.xr.isPresenting) {
    const v = primera ? "primera" : "arriba";
    if (v !== vista) {
      if (v === "primera") {
        yaw = rumbo;
        pitch = 0;
      } else rumbo = yaw;
      vista = v;
    }
  }
  pdMov.f = pdMov.s = 0;
  if (inventario.abierto) return;
  const df = (b & B.ARRIBA ? 1 : 0) - (b & B.ABAJO ? 1 : 0), ds = (b & B.DER ? 1 : 0) - (b & B.IZQ ? 1 : 0);
  if (mira) {
    pdRumbo = null;
    if (!n || !miraScope.aceptaPad) return;
    const z = armas?.zoomItem ?? 320, paso = (z < 1024 ? 16 : z < 2048 ? 4 : 1) * ANG * n;
    yaw -= ds * paso;
    pitch = Math.max(-512 * ANG, Math.min(512 * ANG, pitch + df * paso));
    if (armas) armas.zoomPedido = b & B.CIR ? 3200 : b & B.CRU ? 320 : armas.zoomItem;
  } else if (primera) {
    pdRumbo = null;
    if (n) {
      yaw -= ds * 32 * ANG * n;
      pitch = Math.max(-400 * ANG, Math.min(320 * ANG, pitch + df * 16 * ANG * n));
    }
  } else {
    pdMov.f = df;
    pdMov.s = ds;
    if (df || ds) pdRumbo = (camJuego ? camJuego.resultado().rumboPad : 0) + Math.atan2(-ds, df); else if (pdRumbo != null && vista === "arriba" && dt > 0) {
      const d = Math.atan2(Math.sin(pdRumbo - rumbo), Math.cos(pdRumbo - rumbo));
      rumbo += d * (1 - Math.pow(.75, dt * 30));
    }
  }
}

let pdRumbo = null;

let cineVista = null, cineSuelto = 0;

function actualizarVistaCine() {
  if (efectosGuion.hayCine()) {
    const T = window.__mgs?.trabas, trabado = padDemo.activo || codec.abierto || enPausa() || demo?.estado === "reproduciendo" || cargaNivel || cambiando || T && (T.padSuelto || T.sinPad || T.frenado || T.motion || T.destino || T.ascensor || T.misiones || T.jefe || T.snakeBloq || T.muerte);
    cineSuelto = trabado ? 0 : cineSuelto + 1;
    if (cineSuelto > 120) {
      cineSuelto = 0;
      efectosGuion.quitarCine();
      debug.log("guion", "CINEMA sin escena: se sacan las barras");
    }
  } else cineSuelto = 0;
  const hay = !!juego && modo === "escenarios" && !R.xr.isPresenting && !padDemo.activo && efectosGuion.hayCine();
  if (hay && vista !== "arriba") {
    if (cineVista == null) cineVista = vista;
    rumbo = yaw;
    vista = "arriba";
    if (armaVista) armaVista.visible = false;
  } else if (!hay && cineVista != null) {
    const v = cineVista;
    cineVista = null;
    if (v !== vista && !padDemo.activo) {
      if (v === "primera") {
        yaw = rumbo;
        pitch = 0;
      }
      vista = v;
      if (armaVista) armaVista.visible = v === "primera";
    }
  }
}

function finPadDemo(a, arg) {
  inventario.padExterno = null;
  pdMov.f = pdMov.s = 0;
  if (pdVista && !R.xr.isPresenting && pdVista !== vista) {
    if (pdVista !== "primera") rumbo = yaw;
    vista = pdVista;
  }
  pdVista = null;
  if (armas) armas.zoomPedido = 320;
  if (arg === 1) codec.pararVozJuego();
  if (a && arg != null) guion.eventoActor(a, "f", [ arg ]);
}

function actualizarDucto() {
  const c = ducto.actualizar(rig.position, reptando ? 2 : agachado ? 1 : 0, !!juego && modo === "escenarios" && !vuelo && !muerteSnake && !snakeScript.motion);
  if (c === "entra") {
    if (ducto.vistaAntes == null) ducto.vistaAntes = vista;
    agachado = true;
    reptando = true;
    pared = null;
    contactoPared = 0;
    if (vista === "hombro" && !R.xr.isPresenting) {
      yaw = rumbo;
      pitch = 0;
      vista = "primera";
    }
    inventario.ducto = true;
    audioMGS.codigo(33554208);
    debug.log("juego", "entra al ducto");
  } else if (c === "sale") {
    const v = ducto.vistaAntes;
    ducto.vistaAntes = null;
    if (v && v !== vista && !R.xr.isPresenting) {
      if (v !== "primera") rumbo = yaw;
      vista = v;
    }
    if (armaVista) armaVista.visible = vista === "primera" && !R.xr.isPresenting;
    inventario.ducto = false;
    audioMGS.codigo(33554209);
    debug.log("juego", "sale del ducto");
    if (R.xr.isPresenting && vista === "primera") pararseDucto = performance.now();
  } else if (ducto.activo && vista === "hombro" && !R.xr.isPresenting) {
    ducto.vistaAntes = vista;
    yaw = rumbo;
    vista = "primera";
  }
  if (ducto.activo && armaVista?.visible) armaVista.visible = false;
  if (pararseDucto) {
    if (ducto.activo || !reptando && !agachado || !R.xr.isPresenting || performance.now() - pararseDucto > 4e3) pararseDucto = 0; else if (!snakeScript.motion && pararseVR()) pararseDucto = 0;
  }
}

let pararseDucto = 0;

function cambiarVista(v = VISTAS[(VISTAS.indexOf(vista) + 1) % VISTAS.length]) {
  const antes = vista;
  vista = v;
  try {
    localStorage.setItem("sm_vista", v);
  } catch {}
  if (v === "arriba") rumbo = yaw; else if (antes === "arriba" && v !== antes) {
    yaw = rumbo;
    pitch = v === "hombro" ? -.15 : 0;
  }
  terceraVR.saltar = true;
  $("#opt-vista").textContent = "Vista: " + NOMBRE_VISTA[v];
  rotuloTriangulo();
  if (armaVista) armaVista.visible = !terceraPersona();
  aviso("Vista: " + NOMBRE_VISTA[v]);
}

function rotuloTriangulo() {
  const t = document.querySelector('[data-b="triangulo"] small');
  if (t) t.textContent = vista === "hombro" ? "APUNTAR" : "VISTA";
}

rotuloTriangulo();

function girarRig(a) {
  if (vrModo() === "pantalla") return;
  if (vrModo() === "tercera") {
    yaw += a;
    rig.rotation.y = yaw;
    terceraVR.saltar = true;
    return;
  }
  const antes = new THREE.Vector3;
  cam.getWorldPosition(antes);
  yaw += a;
  rig.rotation.y = yaw;
  rig.updateMatrixWorld(true);
  const despues = new THREE.Vector3;
  cam.getWorldPosition(despues);
  rig.position.x += antes.x - despues.x;
  rig.position.z += antes.z - despues.z;
}

R.xr.addEventListener("sessionstart", () => {
  if (modo === "catalogo") ubicar(0, 0, 2.5, 0);
  setTimeout(ponerArmaEnMano, 300);
  aplicar3D();
  espacioBase = R.xr.getReferenceSpace();
  setTimeout(calibrarAltura, 1500);
});

R.xr.addEventListener("sessionend", () => {
  bajaVR.y = 0;
  terceraVR.activo = false;
  terceraVR.aplicado = null;
  terceraVR.saltar = true;
  soporteVR.position.set(0, 0, 0);
  if (vrCamara) alternarCamaraVR();
  cam.position.set(0, ALTURA_OJOS, 0);
  cam.rotation.set(0, 0, 0);
  ponerArmaEnMano();
  aplicar3D();
});

const tac = {
  x: 0,
  y: 0,
  correr: false,
  joy: null,
  mira: null
};

const tactil = TACTIL ? new Tactil({
  tac: tac,
  teclas: teclas,
  inventario: inventario,
  jugando: () => !!juego && modo === "escenarios" && !misionesVR.bloqueaControl && !camLibre.activa,
  postura: () => reptando ? 2 : agachado ? 1 : 0,
  golpe: () => golpearPared(),
  agachar: () => alternarAgachado(),
  disparar: () => dispararDesdeCamara(),
  soltar: () => {
    if (armas && modo === "escenarios") {
      const m = miraSnake();
      armas.soltar(m.o, m.d);
    }
  },
  saltar: () => {
    if (enSuelo && !vuelo && saltoPermitido()) vy = velSalto();
  },
  vuelo: () => {
    alternarVuelo();
    return vuelo;
  }
}) : null;

if (TACTIL) {
  R.domElement.addEventListener("pointerdown", e => {
    if (modo !== "catalogo" && e.pointerType !== "mouse") tac.mira = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    };
  });
  addEventListener("pointermove", e => {
    if (!tac.mira || e.pointerId !== tac.mira.id || camLibre.activa) return;
    const k = .006 * (ctl.tactil.sensMirar || 1), kx = ctl.tactil.invertirX ? -k : k, ky = ctl.tactil.invertirY ? -k : k;
    if (!asomarse.bandera) {
      yaw -= (e.clientX - tac.mira.x) * kx;
      pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - tac.mira.y) * ky));
    }
    tac.mira.x = e.clientX;
    tac.mira.y = e.clientY;
  });
  const finMira = e => {
    if (tac.mira && e.pointerId === tac.mira.id) tac.mira = null;
  };
  addEventListener("pointerup", finMira);
  addEventListener("pointercancel", finMira);
  $("#panel").classList.add("oculto");
  $("#mostrar").hidden = false;
  $("#mostrar").textContent = "☰ MENÚ";
  for (const el of [ "#esc-sel", "#museo-entrar", "#esc-caminar" ]) $(el).addEventListener("change", () => {
    $("#panel").classList.add("oculto");
    $("#mostrar").hidden = false;
  });
  $("#museo-entrar").addEventListener("click", () => {
    $("#panel").classList.add("oculto");
    $("#mostrar").hidden = false;
  });
  $("#esc-caminar").addEventListener("click", () => {
    $("#panel").classList.add("oculto");
    $("#mostrar").hidden = false;
  });
}

setTimeout(() => {
  const v = document.getElementById("VRButton");
  if (v && /NOT SUPPORTED|NO SOPORTADO/i.test(v.textContent)) v.hidden = true;
}, 2500);

const reloj = new THREE.Clock;

const camLibre = new CamaraLibre;

let camPrevia = null, arrastreCam = null;

function alternarModoCamara() {
  if (camLibre.activa) {
    salirModoCamara();
    return;
  }
  if (titulo.visible || R.xr.isPresenting || codec.abierto || pantallaGameOver.activo) return;
  if (cargaNivel || cambiando) return;
  const cine = enDemo || demo.ocupada;
  if (cine) {
    if (!demo.activa) return;
    const c = demo.camara;
    camPrevia = {
      cine: true,
      p: c.position.clone(),
      q: c.quaternion.clone(),
      fov: c.fov,
      pausada: demo.pausada
    };
    demo.pausar(true);
    camLibre.entrar(c);
    if (demo._ui) {
      camPrevia.ui = [ demo._ui.raiz.style.visibility, demo._ui.raiz.style.pointerEvents ];
      demo._ui.raiz.style.visibility = "hidden";
      demo._ui.raiz.style.pointerEvents = "none";
    }
  } else {
    if (modo !== "escenarios") return;
    camPrevia = {
      cine: false,
      oculto: cuerpo?.oculto,
      arma: armaVista?.visible,
      pausaba: enPausa() || inventario.abierto
    };
    camLibre.entrar(cam);
    if (cuerpo) ocultarCuerpo(cuerpo, false);
    if (armaVista) armaVista.visible = false;
    if (juego && !camPrevia.pausaba) audioMGS.codigo(33554177);
    $("#panel").classList.add("oculto");
  }
  if (inventario.cv) inventario.cv.style.visibility = "hidden";
  $("#cam-aviso").textContent = TACTIL ? "MODO CÁMARA · palanca = mover · arrastrar = mirar · FOTO / 360 = guardar" : "MODO CÁMARA · O = salir · WASD + mouse · Q/E bajar/subir · Shift/Ctrl rápido/lento · rueda = zoom · F = foto 4K · P = foto 360";
  document.body.classList.add("modo-camara");
  document.body.classList.toggle("cam-tactil", TACTIL);
}

function salirModoCamara() {
  camLibre.salir();
  arrastreCam = null;
  document.body.classList.remove("modo-camara");
  if (inventario.cv) inventario.cv.style.visibility = "";
  const p = camPrevia;
  camPrevia = null;
  if (!p) return;
  if (p.cine) {
    const c = demo.camara;
    c.position.copy(p.p);
    c.quaternion.copy(p.q);
    c.fov = p.fov;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    if (demo._ui && p.ui) {
      demo._ui.raiz.style.visibility = p.ui[0];
      demo._ui.raiz.style.pointerEvents = p.ui[1];
    }
    if (!p.pausada) demo.pausar(false);
  } else {
    if (cuerpo) ocultarCuerpo(cuerpo, p.oculto ?? !terceraPersona());
    if (armaVista && p.arma != null) armaVista.visible = p.arma;
    if (juego && !p.pausaba) audioMGS.codigo(33554178);
    $("#mostrar").hidden = !$("#panel").classList.contains("oculto");
  }
}

function dibujarModoCamara(dtReal) {
  let f = 0, s = 0, up = 0;
  if (teclas.KeyW || teclas.ArrowUp) f += 1;
  if (teclas.KeyS || teclas.ArrowDown) f -= 1;
  if (teclas.KeyD || teclas.ArrowRight) s += 1;
  if (teclas.KeyA || teclas.ArrowLeft) s -= 1;
  if (teclas.KeyE) up += 1;
  if (teclas.KeyQ) up -= 1;
  f += tac.y;
  s += tac.x;
  camLibre.update(Math.min(dtReal, .1), {
    f: f,
    s: s,
    up: up,
    rapido: teclas.ShiftLeft || teclas.ShiftRight,
    lento: teclas.ControlLeft || teclas.ControlRight
  });
  const dt = Math.min(dtReal, .1);
  if (enDemo || demo.ocupada) {
    camLibre.copiarA(demo.camara);
    const z = zonasDemo.zonas?.length ? vistaAgua.zonaEn(camLibre.cam.position, zonasDemo.zonas) : null;
    if (z) {
      demo._destino = vistaAgua.preparar(R);
      demo.render(R);
      demo._destino = null;
      vistaAgua.mostrar(R, dt, z);
    } else demo.render(R);
  } else {
    const z = zonasAgua.length ? vistaAgua.zonaEn(camLibre.cam.position, zonasAgua) : null;
    if (z) {
      R.setRenderTarget(vistaAgua.preparar(R));
      R.render(scene, camLibre.cam);
      vistaAgua.mostrar(R, dt, z);
    } else R.render(scene, camLibre.cam);
  }
}

let fotoEnCurso = false;

async function fotoModoCamara(tipo) {
  if (!camLibre.activa || fotoEnCurso) return;
  fotoEnCurso = true;
  const aviso = $("#cam-aviso"), ayuda = aviso.textContent, volver = ms => setTimeout(() => {
    if (camLibre.activa && !fotoEnCurso) aviso.textContent = ayuda;
  }, ms);
  aviso.textContent = tipo === "360" ? "Sacando la foto 360 (4096×2048)…" : "Sacando la foto (3840×2160)…";
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const cine = enDemo || demo.ocupada, zonas = cine ? zonasDemo.zonas : zonasAgua;
    const blob = await sacarFoto(R, {
      escena: cine ? demo.escena : scene,
      camara: camLibre.cam,
      tipo: tipo,
      vistaAgua: vistaAgua,
      agua: zonas?.length ? vistaAgua.zonaEn(camLibre.cam.position, zonas) : null,
      filtro: R.domElement.style.filter || ""
    });
    const f = new Date, dd = n => String(n).padStart(2, "0");
    const nombre = `mgs_${tipo === "360" ? "360_" : ""}${(cine ? "cinematica" : $("#esc-sel").value) || "mgs"}_${f.getFullYear()}${dd(f.getMonth() + 1)}${dd(f.getDate())}_${dd(f.getHours())}${dd(f.getMinutes())}${dd(f.getSeconds())}.jpg`;
    descargar(blob, nombre);
    aviso.textContent = `Guardada: ${nombre} (${(blob.size / 1e6).toFixed(1)} MB)`;
  } catch (e) {
    aviso.textContent = "No se pudo sacar la foto: " + e.message;
    debug.log("error", "foto modo cámara: " + (e.stack || e.message));
  } finally {
    fotoEnCurso = false;
    volver(4e3);
  }
}

addEventListener("pointerdown", e => {
  if (!camLibre.activa || document.pointerLockElement === R.domElement || e.target.closest?.("button, #joy, #panel")) return;
  arrastreCam = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY
  };
}, true);

addEventListener("pointermove", e => {
  if (!arrastreCam || e.pointerId !== arrastreCam.id) return;
  const k = e.pointerType === "mouse" ? .004 : .006;
  camLibre.mirar((e.clientX - arrastreCam.x) * k, (e.clientY - arrastreCam.y) * k);
  arrastreCam.x = e.clientX;
  arrastreCam.y = e.clientY;
}, true);

for (const ev of [ "pointerup", "pointercancel" ]) addEventListener(ev, e => {
  if (arrastreCam && e.pointerId === arrastreCam.id) arrastreCam = null;
}, true);

addEventListener("wheel", e => {
  if (camLibre.activa) {
    e.preventDefault();
    camLibre.zoom(Math.sign(e.deltaY));
  }
}, {
  passive: false
});

$("#btn-cam").addEventListener("pointerdown", e => {
  e.preventDefault();
  e.stopPropagation();
  alternarModoCamara();
});

$("#esc-camara").onclick = () => alternarModoCamara();

for (const b of document.querySelectorAll("#cam-botones button")) b.addEventListener("pointerdown", e => {
  e.preventDefault();
  e.stopPropagation();
  if (b.dataset.c === "salir") alternarModoCamara(); else fotoModoCamara(b.dataset.c);
});

let todoArmas = (() => {
  try {
    return localStorage.getItem("sm_todo") === "1";
  } catch {
    return false;
  }
})();

function aplicarTodo() {
  try {
    todoArmas = localStorage.getItem("sm_todo") === "1";
  } catch {}
  if (todoArmas && inventario) {
    inventario.darTodo();
    aviso("Todas las armas e ítems");
  }
}

function alternarTodo() {
  todoArmas = !todoArmas;
  try {
    localStorage.setItem("sm_todo", todoArmas ? "1" : "0");
  } catch {}
  const b = document.getElementById("opt-todo");
  if (b) b.textContent = "Todas las armas e ítems: " + (todoArmas ? "sí" : "no");
  aplicarTodo();
}

const CONTROLES_QUEST = () => ctl.ayudaQuest();

{
  const b = document.getElementById("opt-todo");
  if (b) {
    b.textContent = "Todas las armas e ítems: " + (todoArmas ? "sí" : "no");
    b.onclick = () => alternarTodo();
  }
}

const leerLS = (k, d) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};

let vrSentado = leerLS("sm_vrsentado", "0") === "1", vrCineInmersivo = leerLS("sm_vrcine", "1") === "1";

function ponerVrCine(si) {
  vrCineInmersivo = !!si;
  guardarVR();
  const b = document.getElementById("opt-vrcine");
  if (b) b.textContent = "Cinemáticas VR: " + (vrCineInmersivo ? "adentro" : "pantalla");
}

{
  const b = document.getElementById("opt-vrcine");
  if (b) {
    b.textContent = "Cinemáticas VR: " + (vrCineInmersivo ? "adentro" : "pantalla");
    b.onclick = () => ponerVrCine(!vrCineInmersivo);
  }
}

addEventListener("mgs:opcion", e => {
  const {clave: clave, valor: valor} = e.detail || {};
  if (clave === "pixel") texturasPixel.poner(valor); else if (clave === "vrcine") ponerVrCine(valor); else if (clave === "filtro") filtroPantalla.poner(valor);
});

let vrManosSnake = leerLS("sm_vrmanos", "0") === "1", vrCuerpoVisible = leerLS("sm_vrcuerpo", "0") === "1", vrGolpeMano = leerLS("sm_vrgolpe", "0") === "1";

const guardarExtraVR = (k, v) => {
  try {
    localStorage.setItem(k, v ? "1" : "0");
  } catch {}
};

const manosSnake = new ManosSnake(() => cargar("modelos/snake.glb"));

function actualizarManosVR() {
  const on = R.xr.isPresenting && vrManosSnake;
  if (on && !manosSnake.mallas) {
    manosSnake.preparar();
    return;
  }
  const M = manosSnake.mallas;
  if (!M) return;
  if (!R.xr.isPresenting) {
    M.right.visible = M.left.visible = false;
    return;
  }
  for (let i = 0; i < 2; i++) {
    const g = R.xr.getControllerGrip(i), lado = g.userData.lado;
    if (lado !== "left" && lado !== "right") continue;
    const m = M[lado], enMontura = lado === manoArma() && armaVista?.parent === monturaVR;
    const padre = enMontura ? monturaVR : g;
    if (m.parent !== padre) padre.add(m);
    if (enMontura) m.position.copy(armaVista.userData.base?.p || armaVista.position); else m.position.set(0, 0, 0);
    m.visible = on && g.visible;
  }
}

const HUESOS_SIN_VER = [ "hueso_1" ];

function ajustarCuerpoVR() {
  if (!cuerpo?.obj) return;
  const on = R.xr.isPresenting && vrCuerpoVisible && !terceraPersona() && !vrCamara && !camLibre.activa;
  if (on || cuerpo.sinBrazos) {
    for (const n of HUESOS_SIN_VER) {
      const h = (cuerpo.hVR ||= {})[n] ||= cuerpo.obj.getObjectByName(n);
      if (h) h.scale.setScalar(on ? .001 : 1);
    }
    cuerpo.sinBrazos = on;
  }
  if (!on) return;
  const p = new THREE.Vector3, d = new THREE.Vector3;
  cam.updateWorldMatrix(true, false);
  cam.getWorldPosition(p);
  cam.getWorldDirection(d);
  const y = Math.atan2(-d.x, -d.z);
  cuerpo.obj.position.x = p.x + Math.sin(y) * .12;
  cuerpo.obj.position.z = p.z + Math.cos(y) * .12;
  cuerpo.obj.rotation.y = y + Math.PI;
}

const _manoAnt = [ new THREE.Vector3, new THREE.Vector3 ];

let _manoLista = [ false, false ], cdGolpeMano = 0;

const VEL_GOLPE = 2.4;

function golpeManoVR(dt) {
  cdGolpeMano = Math.max(0, cdGolpeMano - dt);
  if (!R.xr.isPresenting || !vrGolpeMano || !juego || modo !== "escenarios" || dt <= 0) {
    _manoLista = [ false, false ];
    return;
  }
  if (enPausa() || codec.abierto || inventario.abierto || paneles.menuAbierto || muerteSnake || enDemo || demo.ocupada || ducto.activo) {
    _manoLista = [ false, false ];
    return;
  }
  rig.updateMatrixWorld();
  for (let i = 0; i < 2; i++) {
    const c = R.xr.getController(i);
    if (!c.visible) {
      _manoLista[i] = false;
      continue;
    }
    const w = c.getWorldPosition(new THREE.Vector3), l = rig.worldToLocal(w.clone()), v = l.clone().sub(_manoAnt[i]).divideScalar(dt);
    const lista = _manoLista[i];
    _manoAnt[i].copy(l);
    _manoLista[i] = true;
    if (!lista || v.length() < VEL_GOLPE || cdGolpeMano > 0) continue;
    const dir = v.clone().normalize().transformDirection(rig.matrixWorld);
    const h = primerGolpe(w, dir, .3, colParedes ? colParedes.concat(colisiones) : colisiones);
    if (h?.point) {
      cdGolpeMano = .35;
      sonido("toc");
      juego.ruidoPared(h.point);
      ctl.vibrar("leve");
      continue;
    }
    if ((armas?.guardias?.() || []).some(g => g.o.position.clone().setY(w.y).distanceTo(w) < 1.3)) {
      cdGolpeMano = .16;
      ctl.vibrar("leve");
      golpearPared();
    }
  }
}

const peleaMantis = () => (juego?.__jefes?.lista || []).some(j => j.actor?.tipo === "PSYCHOMANTIS" && j.vivo !== false);

const puerto2Activo = () => leerLS("sm_puerto2", "0") === "1";

function ponerPuerto2(si) {
  try {
    localStorage.setItem("sm_puerto2", si ? "1" : "0");
  } catch {}
  const b = document.getElementById("opt-puerto2");
  if (b) b.textContent = "Mando: puerto " + (si ? 2 : 1);
}

function retrucoMantis() {
  if (!peleaMantis()) return;
  const si = !puerto2Activo();
  ponerPuerto2(si);
  aviso("MANDO EN EL PUERTO " + (si ? 2 : 1));
}

let vrRadarGira = leerLS("sm_vrradar", "1") === "1";

const manoMov = () => ctl.quest.zurdo ? "right" : "left", manoArma = () => ctl.quest.zurdo ? "left" : "right";

let zurdoAplicado = null;

function aplicarZurdo() {
  paneles.mapa = ctl.mapaQuest();
  paneles.intensidadVibra = ctl.vibraQuest();
  if (zurdoAplicado !== null && zurdoAplicado !== ctl.quest.zurdo && R.xr.isPresenting) {
    ponerArmaEnMano();
    retrucoMantis();
  }
  zurdoAplicado = ctl.quest.zurdo;
}

ctl.alCambiar(() => {
  try {
    aplicarZurdo();
  } catch {}
});

function guardarVR() {
  try {
    localStorage.setItem("sm_vrradar", vrRadarGira ? "1" : "0");
    localStorage.setItem("sm_vrsentado", vrSentado ? "1" : "0");
    localStorage.setItem("sm_vrcine", vrCineInmersivo ? "1" : "0");
  } catch {}
}

let espacioBase = null;

function calibrarAltura() {
  if (!R.xr.isPresenting) return;
  const base = espacioBase || (espacioBase = R.xr.getReferenceSpace());
  if (!base) return;
  let dy = 0;
  if (vrSentado) {
    const o = new THREE.Vector3;
    R.xr.getCamera().getWorldPosition(o);
    const ojos = o.y - rig.position.y - (terceraVR.aplicado?.y || 0) + (R.xr._dySentado || 0);
    dy = ALTURA_OJOS - ojos;
  }
  try {
    R.xr.setReferenceSpace(dy ? base.getOffsetReferenceSpace(new XRRigidTransform({
      x: 0,
      y: -dy,
      z: 0
    })) : base);
    R.xr._dySentado = dy;
  } catch (e) {
    debug.log("aviso", "altura VR: " + e.message);
  }
  aviso(vrSentado ? "Modo sentado: altura ajustada" : "Modo parado");
}

const bajaVR = {
  y: 0
};

const _tvO = new THREE.Vector3, _tvP = new THREE.Vector3, _tvL = new THREE.Vector3, _tvD = new THREE.Vector3;

function seguirTerceraVR(dt) {
  if (!R.xr.isPresenting) return;
  const on = vrModo() === "tercera" && !titulo.visible && !enDemo && !demo.ocupada && !paneles.conPartida && !rango.activo && !camLibre.activa;
  let V = null;
  if (on) {
    rig.updateMatrixWorld();
    _tvD.set(Math.cos(yaw), 0, -Math.sin(yaw));
    _tvO.set(Math.sin(yaw) * 2.3, .8, Math.cos(yaw) * 2.3).add(rig.position);
    _tvP.copy(rig.position);
    _tvP.y += reptando ? .4 : agachado ? .8 : 1.2;
    _tvL.copy(_tvO);
    _tvL.y += ALTURA_OJOS;
    const k = distanciaCamara(_tvP, _tvL, _tvD, .3, .4);
    if (k < 1) {
      _tvL.sub(_tvP).multiplyScalar(k).add(_tvP);
      _tvO.copy(_tvL);
      _tvO.y -= ALTURA_OJOS;
    }
    const S = terceraVR.S;
    if (!terceraVR.activo || terceraVR.saltar || S.distanceTo(_tvO) > 6) S.copy(_tvO); else S.lerp(_tvO, 1 - Math.exp(-Math.min(dt, .1) * (k < 1 ? 8 : 3)));
    terceraVR.activo = true;
    terceraVR.saltar = false;
    alfaCuerpo(_tvL.copy(S).setY(S.y + ALTURA_OJOS).distanceTo(_tvP));
    V = rig.worldToLocal(_tvL.copy(S));
  } else {
    terceraVR.activo = false;
    if (alfaCuerpoAct < 1) alfaCuerpo(null);
  }
  const bajar = !V && vrModo() === "primera" && modo === "escenarios" && !!juego && !titulo.visible && !enDemo && !demo.ocupada && !vrCamara ? reptando || ducto.activo ? -1.15 : agachado ? -.6 : 0 : 0;
  bajaVR.y += (bajar - bajaVR.y) * (1 - Math.exp(-Math.min(dt, .1) * 8));
  if (Math.abs(bajaVR.y) < .002) bajaVR.y = 0;
  if (V) soporteVR.position.copy(V); else {
    soporteVR.position.copy(cabezaVR.off);
    soporteVR.position.y += bajaVR.y;
  }
  terceraVR.aplicado = V ? soporteVR.position : null;
}

const cabezaVR = {
  off: new THREE.Vector3,
  activo: false
};

const _cvH = new THREE.Vector3, _cvM = new THREE.Vector3, _cvQ = new THREE.Quaternion;

function seguirCabezaVR() {
  const on = R.xr.isPresenting && vrModo() === "primera" && !vrCamara && !vuelo && modo === "escenarios" && !!juego && !muerteSnake && !cargaNivel && !cambiando && !snakeScript.motion && !snakeScript.destino && !snakeScript.frenado && !snakeScript.sinPad && !padDemo.activo && !esperaSalida && !din?.bloqueaControl;
  if (!R.xr.isPresenting) {
    cabezaVR.off.set(0, 0, 0);
    cabezaVR.activo = false;
    return;
  }
  if (!on) {
    cabezaVR.activo = false;
    return;
  }
  rig.updateMatrixWorld(true);
  cam.getWorldPosition(_cvH);
  _cvM.set(_cvH.x - rig.position.x, 0, _cvH.z - rig.position.z);
  const L = _cvM.length(), recentrar = !cabezaVR.activo || L > 1;
  cabezaVR.activo = true;
  if (L < .005) return;
  if (!recentrar) {
    deslizar(rig.position, _cvM);
    rig.position.x += _cvM.x;
    rig.position.z += _cvM.z;
  }
  cabezaVR.off.sub(_cvM.applyQuaternion(_cvQ.copy(rig.quaternion).invert()));
  cabezaVR.off.y = 0;
  soporteVR.position.copy(cabezaVR.off);
  soporteVR.position.y += bajaVR.y;
}

const _ciP = new THREE.Vector3, _ciQ = new THREE.Quaternion, _ciO = new THREE.Vector3, _ciE = new THREE.Euler, _ciY = new THREE.Quaternion, _ciEJE = new THREE.Vector3(0, 1, 0);

function dibujarCineInmersivo(dt = 1 / 30) {
  const c = demo.camara;
  if (!c) return false;
  c.updateMatrixWorld();
  c.getWorldPosition(_ciP);
  c.getWorldQuaternion(_ciQ);
  const u = rig.userData, s = cineVR, nueva = u.cineInfo !== demo.info;
  const corte = nueva || !s.pAnt || s.pAnt.distanceTo(_ciP) > .8 || s.qAnt.angleTo(_ciQ) > 12 * Math.PI / 180;
  const deriva = !corte && s.qPlano.angleTo(_ciQ) > 45 * Math.PI / 180;
  if (corte || deriva) {
    u.cineInfo = demo.info;
    _ciE.setFromQuaternion(_ciQ, "YXZ");
    const cabYaw = (new THREE.Euler).setFromQuaternion(cam.quaternion, "YXZ").y;
    rig.quaternion.setFromEuler(_ciE.set(_ciE.x, _ciE.y, 0, "YXZ")).multiply(_ciY.setFromAxisAngle(_ciEJE, -cabYaw));
    rig.updateMatrixWorld(true);
    cam.getWorldPosition(_ciO);
    rig.position.add(_ciO.subVectors(_ciP, _ciO));
    s.qPlano.copy(_ciQ);
    s.corte = deriva ? .22 : .3;
    if (nueva) s.cortes = 0; else s.cortes = (s.cortes || 0) + 1;
  } else rig.position.add(_ciO.subVectors(_ciP, s.pAnt));
  rig.updateMatrixWorld(true);
  (s.pAnt ||= new THREE.Vector3).copy(_ciP);
  s.qAnt.copy(_ciQ);
  paneles.marcarCine(demo);
  demo._dibujarEscena(R, cam);
  capaCineVR(dt);
  return true;
}

const cineVR = {
  escena: new THREE.Scene,
  ancla: new THREE.Group,
  pAnt: null,
  qAnt: new THREE.Quaternion,
  qPlano: new THREE.Quaternion,
  corte: 0,
  cortes: 0,
  texto: null
};

{
  cineVR.ancla.matrixAutoUpdate = false;
  cineVR.escena.add(cineVR.ancla);
  cineVR.velo = new THREE.Mesh(new THREE.SphereGeometry(.25, 16, 8), new THREE.MeshBasicMaterial({
    color: 0,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false
  }));
  cineVR.velo.renderOrder = 1;
  cineVR.velo.visible = false;
  cineVR.ancla.add(cineVR.velo);
  cineVR.cv = document.createElement("canvas");
  cineVR.cv.width = 1024;
  cineVR.cv.height = 128;
  cineVR.tex = new THREE.CanvasTexture(cineVR.cv);
  cineVR.tex.colorSpace = THREE.SRGBColorSpace;
  cineVR.subs = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .15), new THREE.MeshBasicMaterial({
    map: cineVR.tex,
    transparent: true,
    depthTest: false,
    depthWrite: false
  }));
  cineVR.subs.position.set(0, -.32, -1.3);
  cineVR.subs.renderOrder = 2;
  cineVR.subs.visible = false;
  cineVR.ancla.add(cineVR.subs);
}

function capaCineVR(dt) {
  let negro = Math.min(1, cineVR.corte / .22), blanco = 0;
  cineVR.corte = Math.max(0, cineVR.corte - dt);
  for (const a of demo._fundidos || []) {
    let f = Math.min(Math.max(a.k, 1), a.total) / a.total;
    if (a.entra) f = 1 - f;
    if (a.blanco) blanco = Math.max(blanco, f); else negro = Math.max(negro, f);
  }
  if (demo._salida) negro = Math.max(negro, Math.min(1, demo._salida.t / demo._salida.dur));
  const m = cineVR.velo.material;
  m.color.setScalar(blanco > negro ? 1 : 0);
  m.opacity = Math.max(negro, blanco);
  cineVR.velo.visible = m.opacity > .01;
  const t = demo.tiempo || 0, l = demo._salida ? null : (demo.subtitulos || []).find(x => t >= x.t && t < x.t + x.d), texto = l ? String(l.texto) : "";
  if (texto !== cineVR.texto) {
    const x = cineVR.cv.getContext("2d");
    x.clearRect(0, 0, 1024, 128);
    if (texto) {
      const filas = texto.split(/\r?\n/);
      x.font = '38px "Trebuchet MS", Verdana, Arial, sans-serif';
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.lineWidth = 6;
      x.strokeStyle = "#000";
      x.fillStyle = "#e8e8e8";
      filas.forEach((f, i) => {
        const y = 64 + (i - (filas.length - 1) / 2) * 44;
        x.strokeText(f, 512, y);
        x.fillText(f, 512, y);
      });
    }
    cineVR.tex.needsUpdate = true;
    cineVR.subs.visible = !!texto;
    cineVR.texto = texto;
  }
  if (!cineVR.velo.visible && !cineVR.subs.visible) return;
  cam.updateMatrixWorld();
  cineVR.ancla.matrix.copy(cam.matrixWorld);
  cineVR.ancla.matrixWorldNeedsUpdate = true;
  const auto = R.autoClear;
  R.autoClear = false;
  R.render(cineVR.escena, cam);
  R.autoClear = auto;
}

const aguaVR = {
  activa: false,
  z: null,
  niebla: null,
  malla: null
};

function aguaEnVR(z) {
  if (z === aguaVR.z) return;
  if (!aguaVR.malla) {
    aguaVR.malla = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 8), new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false
    }));
    aguaVR.malla.renderOrder = 9999;
    aguaVR.malla.visible = false;
    aguaVR.malla.userData.propio = aguaVR.malla.userData.sinColision = true;
    cam.add(aguaVR.malla);
  }
  if (!aguaVR.z) aguaVR.niebla = scene.fog;
  if (z) {
    const col = new THREE.Color(Math.min(1, z.color.x), Math.min(1, z.color.y), Math.min(1, z.color.z));
    aguaVR.malla.material.color.copy(col);
    aguaVR.malla.visible = true;
    scene.fog = z.tipo === "FURNACE" ? aguaVR.niebla : new THREE.FogExp2(col.clone().multiplyScalar(.25), .09);
  } else {
    aguaVR.malla.visible = false;
    scene.fog = aguaVR.niebla;
    aguaVR.niebla = null;
  }
  aguaVR.z = z;
}

function techoCerca(x, z, radio = 4, yMax = 100) {
  let mejor = null;
  for (let dx = -radio; dx <= radio; dx += .5) for (let dz = -radio; dz <= radio; dz += .5) {
    if (dx * dx + dz * dz > radio * radio) continue;
    ray.set(new THREE.Vector3(x + dx, yMax + .5, z + dz), ABAJO);
    ray.far = yMax + 1;
    const h = ray.intersectObjects(colisiones, false)[0];
    if (h && (!mejor || h.point.y > mejor.y)) mejor = h.point.clone();
  }
  return mejor;
}

let vrCamara = null;

function alternarCamaraVR() {
  if (vrCamara) {
    rig.position.copy(vrCamara.p);
    yaw = vrCamara.yaw;
    rig.rotation.set(0, yaw, 0);
    vuelo = vrCamara.vuelo;
    vy = 0;
    vrCamara = null;
    aviso("Modo Cámara: fin");
    return;
  }
  if (!R.xr.isPresenting || !juego || modo !== "escenarios" || enDemo || demo.ocupada || codec.abierto) return;
  vrCamara = {
    p: rig.position.clone(),
    yaw: yaw,
    vuelo: vuelo
  };
  vuelo = true;
  vy = 0;
  aviso(`Modo Cámara: el juego está quieto. Volá con la palanca (${ctl.botonQuestDe("start") || "START"}: salir)`);
}

let cuadroPausa = 0;

let enPausaPrev = false;

const enPausa = () => modo === "escenarios" && juego && (R.xr.isPresenting ? paneles.menuAbierto || !!vrCamara : !$("#panel").classList.contains("oculto"));

const filtroPantalla = new FiltroPantalla(R, {
  tactil: TACTIL
});

{
  const b = document.getElementById("opt-filtro");
  const rot = () => {
    if (b) b.textContent = "Filtro: " + NOMBRES_FILTRO[filtroPantalla.modo];
  };
  rot();
  filtroPantalla.alCambiar(m => {
    rot();
    aviso("Filtro: " + NOMBRES_FILTRO[m] + (R.xr.isPresenting && m !== "ninguno" ? " (en el casco no se usa)" : ""));
  });
  if (b) b.onclick = () => filtroPantalla.siguiente();
}

{
  const poner = R.setAnimationLoop.bind(R), vistos = new Set;
  R.setAnimationLoop = f => poner(f && ((t, fr) => {
    try {
      filtroPantalla.empezar();
      f(t, fr);
    } catch (e) {
      const m = String(e?.stack || e).split("\n").slice(0, 2).join(" ");
      if (!vistos.has(m)) {
        vistos.add(m);
        console.error("cuadro:", e);
        debug.log("error", "cuadro: " + m);
      }
    } finally {
      filtroPantalla.terminar();
    }
  }));
}

R.setAnimationLoop(() => {
  const dtReal = reloj.getDelta();
  interfaz.cuadro({
    cine: enDemo || demo.ocupada || !!radioCadena,
    titulo: titulo.visible,
    codec: codec.abierto,
    gameOver: pantallaGameOver.activo
  });
  mandoCuadro(Math.min(dtReal, .1));
  tactil?.cuadro({
    cine: enDemo || demo.ocupada || !!radioCadena,
    radio: !!radioCadena,
    titulo: titulo.visible,
    codec: codec.abierto,
    gameOver: pantallaGameOver.activo,
    xr: R.xr.isPresenting,
    partida: partidaUI.abierta,
    menu: !$("#panel").classList.contains("oculto"),
    camara: camLibre.activa,
    catalogo: modo === "catalogo",
    juego: !!juego && modo === "escenarios",
    museo: modo === "museo"
  });
  if (inventario.cv) {
    const v = titulo.visible || enDemo || demo.ocupada || !(juego && modo === "escenarios") || misionesVR.activo ? "none" : "";
    if (inventario.cv.style.display !== v) inventario.cv.style.display = v;
  }
  {
    const ok = !!juego && modo === "escenarios" && !titulo.visible && !enDemo && !demo.ocupada && !camLibre.activa && !misionesVR.activo && !muerteSnake && inventario.item === IT.SCOPE && !terceraPersona();
    miraScope.actualizar(enPausa() || codec.abierto || inventario.abierto ? 0 : dtReal, {
      activo: ok,
      zoom: armas?.zoomItem ?? 320,
      camara: R.xr.isPresenting ? R.xr.getCamera() : cam,
      escena: scene,
      vr: R.xr.isPresenting
    });
    miraScope.dibujar();
  }
  {
    const ok = !!juego && modo === "escenarios" && !titulo.visible && !enDemo && !demo.ocupada && !camLibre.activa && !misionesVR.activo && !muerteSnake;
    const xrPrimera = R.xr.isPresenting && vrModo() === "primera";
    const tipo = !ok ? null : camaraEnMisil() || xrPrimera && armas?.misil ? "nikita" : inventario.arma === WP.STINGER && (!terceraPersona() || camaraJuegoActiva() && !!teclas.KeyE || apuntaHombro()) ? "stinger" : null;
    miraArma.actualizar(enPausa() || codec.abierto || inventario.abierto ? 0 : dtReal, {
      tipo: tipo,
      camara: tipo === "nikita" && R.xr.isPresenting ? ventanaMira.cam : camApuntar(),
      armas: armas,
      vr: R.xr.isPresenting
    });
    let vm = null;
    if (ok && xrPrimera && armas && !inventario.abierto && !codec.abierto && !enPausa()) {
      if (armas.misil) {
        const v = armas.vistaMisil();
        vm = {
          tipo: "nikita",
          pos: v.pos,
          dir: v.dir,
          zoom: 320
        };
      } else if (inventario.arma === WP.PSG1 && armas.zoom > 330) {
        const m = miraSnake();
        vm = {
          tipo: "psg1",
          pos: m.o,
          dir: m.d,
          zoom: armas.zoom
        };
      } else if (inventario.item === IT.SCOPE || inventario.item === IT.CAMERA) {
        const p = new THREE.Vector3, d = new THREE.Vector3;
        cam.updateWorldMatrix(true, false);
        cam.getWorldPosition(p);
        cam.getWorldDirection(d);
        vm = {
          tipo: "scope",
          pos: p,
          dir: d,
          zoom: armas.zoomItem
        };
      }
    }
    ventanaMira.poner(vm);
    miraArma.dibujar();
    antiparrasVR(R, ok ? inventario.filtro : null);
  }
  paneles.update(dtReal);
  seguirTerceraVR(dtReal);
  if (titulo.visible) {
    paneles.dibujarSolo(R, cam);
    return;
  }
  if (rango.activo) {
    rango.actualizar(dtReal);
    paneles.dibujarSolo(R, cam);
    return;
  }
  if (R.xr.isPresenting && paneles.conPartida) {
    paneles.dibujarSolo(R, cam);
    return;
  }
  if (camLibre.activa) {
    dibujarModoCamara(dtReal);
    return;
  }
  debug.cuadro(dtReal);
  if (!enDemo && !demo.ocupada) adaptarResolucion(dtReal);
  if (demo.grupo && !demo.grupo.userData.luzHecha && demo.estado !== "cargando") {
    demo.grupo.userData.luzHecha = true;
    if (luzOriginal) aplicarLuz(demo.grupo);
  }
  if (enDemo || demo.ocupada) {
    {
      const el = $("#cargando");
      if (demo.estado === "cargando") {
        el.textContent = `Cargando cinemática… ${Math.round((demo.progreso || 0) * 100)} %`;
        el.style.display = "block";
        el.dataset.cine = "1";
      } else if (el.dataset.cine) {
        delete el.dataset.cine;
        el.textContent = "Cargando…";
        el.style.display = pendientes > 0 && !cargaNivel ? "block" : "none";
      }
    }
    if (radioCadena) {
      dibujarRadioCadena(dtReal);
      return;
    }
    demo.update(Math.min(dtReal, .1));
    actualizarTintes();
    if (R.xr.isPresenting && vrCineInmersivo && demo.activa && demo.escena && dibujarCineInmersivo(Math.min(dtReal, .1))) return;
    if (!paneles.dibujarCine(R, cam, demo)) {
      if (zonasDemo.de !== demo.aguaNivel) zonasDemo = {
        de: demo.aguaNivel,
        zonas: demo.aguaNivel ? zonasAguaDe(demo.aguaNivel) : zonasAgua
      };
      const z = demo.activa && demo.camara ? vistaAgua.zonaEn(demo.camara.getWorldPosition(_ojo), zonasDemo.zonas) : null;
      if (z) {
        demo._destino = vistaAgua.preparar(R);
        demo.render(R);
        demo._destino = null;
        vistaAgua.mostrar(R, Math.min(dtReal, .1), z);
      } else demo.render(R);
    }
    return;
  }
  let dt = Math.min(dtReal, .1);
  pantallaGameOver.dibujar(Math.min(dtReal, .2));
  const pausa = enPausa() || pantallaGameOver.activo;
  if (partida && juego && modo === "escenarios") partida.tick(enPausa() ? 0 : dtReal);
  $("#pausa").hidden = !pausa || TACTIL;
  if (pausa) dt = 0;
  if (juego && modo === "escenarios" && !titulo.visible && !misionesVR.activo) inventario.update(dtReal, pausa);
  if (inventario.abierto) dt = 0;
  misionesVR.actualizar(dt);
  if (misionesVR.congelado) dt = 0;
  if (movie.congela) dt = 0;
  if (pausa !== enPausaPrev) {
    enPausaPrev = pausa;
    if (juego && !pantallaGameOver.activo) audioMGS.codigo(pausa ? 33554177 : 33554178);
  }
  codec.update(dtReal);
  if (codec.abierto) {
    dt = 0;
    if (R.xr.isPresenting) codec.leerXR(fuentesCodecXR());
  } else if (juego && modo === "escenarios" && !pausa) guion.actualizar(dt, snakeGuion(), otrosGuion());
  if (pausa && !R.xr.isPresenting && modo === "escenarios" && (++cuadroPausa & 3) !== 0) return;
  actualizarSnakeGuion(dt);
  demoCancel.actualizar(pausa || codec.abierto ? 0 : dtReal, (teclas.KeyC ? 64 : 0) | (teclas.KeyG ? 32 : 0) | (teclas.Enter ? 2048 : 0));
  lifeUp.actualizar(pausa || codec.abierto ? 0 : dtReal);
  movie.actualizar(pausa ? 0 : dtReal);
  escenaPendiente.actualizar(pausa || codec.abierto ? 0 : dtReal);
  actualizarVistaCine();
  actualizarPadDemo(pausa || codec.abierto ? 0 : dtReal);
  escena10A.actualizar(pausa || codec.abierto ? 0 : dtReal);
  despertar.actualizar(pausa || codec.abierto ? 0 : dtReal);
  seguirCabezaVR();
  actualizarDucto();
  mover(vrCamara ? Math.min(dtReal, .1) : codec.padTrabado || din?.bloqueaControl ? 0 : dt);
  actualizarCamara(dt);
  if (audioMGS.espacial) {
    const c = R.xr.isPresenting ? R.xr.getCamera() : cam, q = new THREE.Quaternion;
    c.getWorldPosition(_oido);
    c.getWorldDirection(_mira);
    c.getWorldQuaternion(q);
    audioMGS.oyente(_oido, _mira, new THREE.Vector3(0, 1, 0).applyQuaternion(q));
  }
  if ($("#museo-girar").checked) for (const g of giran) g.rotation.y += dt * .4;
  if (modo === "museo") museoVR.actualizar(dtReal, R);
  if (din && modo === "escenarios") {
    tNivel += dt;
    actualizarTintes();
    luzMod.actualizar(dtReal, rig.position, luzOriginal ? null : luzNivel);
    actualizarCuerpoYSombras(dt);
    din.update(dt, {
      jugador: rig.position,
      guardias: patrullas,
      vivo: g => !g.inactivo && ![ "muerto", "desmayado" ].includes(g.estado)
    });
    revisarSalidas();
    revisarHorno();
  }
  if ($("#guardias-mover")?.checked !== false) {
    if (juego && modo === "escenarios") juego.update(dt); else for (const p of patrullas) patrullar(p, dt);
    if (armas && modo === "escenarios") {
      armas.holguraFijado = R.xr.isPresenting ? 3 : 1;
      armas.update(dt);
      armas.actualizarFijado(camApuntar());
      actualizarStealth();
      if (armas.misil?.obj) armas.misil.obj.visible = !camaraEnMisil();
      if (!R.xr.isPresenting) inventario.aplicarFiltro(R.domElement); else if (R.domElement.style.filter) R.domElement.style.filter = "";
    }
    if (sensores && modo === "escenarios") {
      const eq = armas ? inventario.item : -1;
      sensores.detectorMinas = eq === IT.MINED;
      sensores.termicos = eq === IT.THERMG;
      sensores.cigarrillos = eq === IT.CIGS;
      if (armas?.chaff > 0) sensores.chaff(armas.chaff);
      sensores.update(dt);
    }
  }
  if (juego && modo === "escenarios") {
    let ry = yaw;
    if (R.xr.isPresenting) {
      const d = new THREE.Vector3;
      R.xr.getCamera().getWorldDirection(d);
      ry = Math.atan2(-d.x, -d.z);
    }
    if (misionesVR.ocultaHud) hud.ctx?.clearRect(0, 0, hud.cv.width, hud.cv.height); else hud.dibujar({
      modo: juego.modo,
      tiempo: juego.tiempo,
      vida: juego.vida,
      segs: juego.segs,
      yo: rig.position,
      yaw: camaraJuegoActiva() ? 0 : vista === "hombro" ? yaw : ry,
      pitch: pitch,
      tactil: TACTIL,
      giroRadar: R.xr.isPresenting && vrRadarGira ? ry : 0,
      guardias: (juego.conosRadar ? juego.conosRadar() : juego.ctx.guardias.filter(g => !g.inactivo && ![ "muerto", "desmayado" ].includes(g.estado)).map(g => ({
        p: g.o.position,
        r: g.o.rotation.y,
        alerta: g.estado === "alerta" || g.estado === "sospecha"
      }))).concat(sensores ? sensores.conosRadar() : []),
      arma: armas || misionesVR.activo && !misionesVR.vr?.municion ? null : {
        icono: "socom",
        balas: juego.arma.balas,
        reserva: juego.arma.reserva,
        recargando: juego.arma.recargando > 0
      },
      minas: [ ...armas ? inventario.minasRadar(armas.minas) : [], ...din?.extras?.puntosRadar() || [] ],
      vidaMax: inventario.vidaMax,
      menuAbierto: inventario.abierto,
      primeraPersona: !terceraPersona(),
      nivelAlerta: juego.com ? juego.modo === 2 ? Math.min(256, juego.com.evasion) : juego.modo === 1 ? juego.com.alerta : 0 : undefined,
      sonar: id => seEn(id)
    }, dt);
    radarTex.needsUpdate = true;
    $("#mira").style.display = (TACTIL || document.pointerLockElement === R.domElement) && vista !== "arriba" && !miraScope.visible ? "block" : "none";
  }
  {}
  animarArma(dt);
  actualizarLaser();
  actualizarManosVR();
  golpeManoVR(dt);
  if (R.xr.isPresenting) for (let i = 0; i < 2; i++) {
    const g = R.xr.getControllerGrip(i);
    if (g.userData.modelo) g.userData.modelo.visible = !vrManosSnake && !(armaVista?.visible && armaVista.userData.equipada && armaVista.parent === monturaVR && monturaVR.parent === g);
  }
  if (R.xr.isPresenting) alinearArmaVR();
  for (const mx of mezcladores) mx.update(dt);
  if (modo === "catalogo" && !R.xr.isPresenting) {
    orbita.update();
    R.render(scene, camOrb);
  } else {
    const z = modo === "escenarios" && zonasAgua.length ? vistaAgua.zonaEn(cam.getWorldPosition(_ojo), zonasAgua) : null;
    if (!!z !== !!zonaAguaAnt) {
      if (z) audioMGS.se(178); else audioMGS.codigo(4278190334);
    }
    zonaAguaAnt = z;
    if (R.xr.isPresenting) ventanaMira.dibujar(R, scene, [ soporteVR, armaVista, armas?.misil?.obj, cuerpo?.obj ]);
    const pantallaVR = vrModo() === "pantalla";
    aguaEnVR(R.xr.isPresenting && !pantallaVR ? z : null);
    if (z && !R.xr.isPresenting) {
      R.setRenderTarget(vistaAgua.preparar(R));
      R.render(scene, cam);
      vistaAgua.mostrar(R, dt || Math.min(dtReal, .1), z);
    } else if (!(pantallaVR && paneles.dibujarPantalla(R, cam, scene, {
      radar: juego && !misionesVR.ocultaHud ? radarTex : null
    }))) R.render(scene, cam);
    if (R.xr.isPresenting && !pantallaVR) {
      camCasco.matrixWorld.copy(cam.matrixWorld);
      camCasco.matrixWorldInverse.copy(cam.matrixWorldInverse);
      camCasco.projectionMatrix.copy(cam.projectionMatrix);
    }
  }
  paneles.dibujar(R, cam);
});

addEventListener("resize", () => {
  for (const c of [ cam, camOrb ]) {
    c.aspect = innerWidth / innerHeight;
    c.updateProjectionMatrix();
  }
  R.setSize(innerWidth, innerHeight);
});

const misionesVR = new VRMisiones({
  escena: scene,
  camara: cam,
  jugador: rig,
  renderer: R,
  sonido: audioMGS,
  cargarNivel: async nv => {
    modo = "escenarios";
    limpiar();
    liberarCache();
    luzOriginal = true;
    aplicarLuz();
    $("#capas").innerHTML = "";
    $("#partes").innerHTML = "";
    await cargarNivel(nv);
  },
  juego: () => juego,
  cargarGlb: u => cargar(u),
  cuerpo: () => terceraPersona() || misionesVR.camaraEspecial()?.verSnake ? cuerpo?.obj : null,
  camJuego: () => camJuego,
  hud: hud,
  mostrarArma: si => {
    if (armaVista) armaVista.visible = si && !terceraPersona();
  },
  gameOver: ({alSeguir: alSeguir, alSalir: alSalir}) => {
    document.exitPointerLock?.();
    audioMGS.gameOver();
    pantallaGameOver.iniciar({
      alSeguir: alSeguir,
      alSalir: alSalir
    });
  }
});

let vistaAntesVR = null;

misionesVR.on("sala", () => {
  if (vista !== "arriba" && !R.xr.isPresenting) {
    vistaAntesVR ??= vista;
    cambiarVista("arriba");
  }
});

misionesVR.on("salir", () => {
  if (vistaAntesVR) {
    cambiarVista(vistaAntesVR);
    vistaAntesVR = null;
  }
  mostrarTitulo("menu");
});

misionesVR.on("inicio", () => {
  if (!TACTIL && !R.xr.isPresenting) pedirMouse();
});

misionesVR.on("girar", g => {
  rumbo = Math.atan2(-g.dx, -g.dz);
  yaw = rumbo;
});

const paneles = new VRPaneles({
  renderer: R,
  camara: cam
});

aplicarZurdo();

paneles.conectar({
  titulo: titulo,
  inventario: inventario,
  misionesVR: misionesVR,
  gameOver: pantallaGameOver,
  hud: hud,
  codec: codec,
  demo: demo,
  partida: partidaUI,
  nivel: () => din
});

paneles.conectarFinal({
  movie: movie,
  rango: rango,
  codec: codec
});

ventanaMira.conectar(paneles);

miraArma.conectarVR(paneles);

miraScope.conectarVR(paneles);

function dispararVR() {
  if (modo !== "escenarios") return;
  if (!(juego && $("#modo-sigilo").checked)) {
    ponerPersonaje();
    return;
  }
  if (vrModo() === "pantalla") {
    dispararDesdeCamara();
    return;
  }
  const m = miraSnake();
  if (vrModo() === "tercera") {
    tApunta = .8;
    tDisparo = 7 / 30;
    rumbo = Math.atan2(-m.d.x, -m.d.z);
  }
  disparo(m.o, m.d);
}

function soltarVR() {
  if (modo === "escenarios" && armas) {
    const m = miraSnake();
    armas.soltar(m.o, m.d);
  }
}

paneles.on("boton", (b, abajo) => {
  botonMandoVR(b, abajo);
  if (R.xr.isPresenting && armas && (inventario.item === IT.SCOPE || inventario.item === IT.CAMERA) && (b === "circulo" || b === "cruz")) {
    armas.zoomPedido = abajo ? b === "circulo" ? 3200 : 320 : armas.zoomItem;
    return;
  }
  if (b === "cuadrado") {
    cuadradoVR = abajo;
    if (abajo) dispararVR(); else soltarVR();
    return;
  }
  if (b === "triangulo") {
    teclas.KeyE = abajo && vrModo() === "pantalla";
    return;
  }
  if (!abajo || modo !== "escenarios" || !juego || misionesVR.bloqueaControl || muerteSnake) return;
  if (b === "circulo") golpearPared(); else if (b === "cruz") alternarAgachado(); else if (b === "select") {
    if (!codec.abierto) codec.abrir();
  }
});

{
  let escVR = null, objVR = null, tituloVR = "MENU", desdeTitulo = false;
  const Q = ctl.quest, sinTildes = t => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  const pct = v => Math.round(v * 100) + "%";
  const ACC_VR = {
    cuadrado: "DISPARAR",
    circulo: "GOLPE / ACCION",
    cruz: "AGACHARSE / VOLVER",
    triangulo: "TRIANGULO",
    L2: "ITEMS (MANTENER)",
    R2: "ARMAS (MANTENER)",
    L1: "SACAR / GUARDAR ITEM",
    R1: "SACAR / GUARDAR ARMA",
    start: "MENU / PAUSA",
    select: "CODEC"
  };
  const opcion = (texto, cambiar) => ({
    texto: texto,
    izq: () => cambiar(-1),
    der: () => cambiar(1),
    accion: () => cambiar(1),
    cierra: false
  });
  const volverControles = {
    texto: "< VOLVER",
    accion: () => paneles.submenu(menuControlesVR()),
    cierra: false
  };
  function menuBotonesVR() {
    tituloVR = "BOTONES DEL TOUCH";
    return [ ...ctl.BOTONES_QUEST.map(b => opcion(() => `${sinTildes(b.nombre).replace(/\.$/, "")}: ${ACC_VR[ctl.accionQuest(b.lado, b.i)] ?? "NADA"}`, d => {
      tituloVR = ctl.rotarQuest(b.lado, b.i, d) ? "BOTONES DEL TOUCH" : "START TIENE QUE QUEDAR EN UN BOTON";
    })), {
      texto: "RESTAURAR BOTONES",
      accion: () => ctl.restaurarBotonesQuest(),
      cierra: false
    }, volverControles ];
  }
  function menuControlesVR() {
    tituloVR = "CONTROLES";
    return [ {
      texto: "VER LOS CONTROLES",
      accion: () => {
        tituloVR = "CONTROLES ACTUALES";
        paneles.submenu([ ...CONTROLES_QUEST().map(t => ({
          texto: t,
          cierra: false
        })), volverControles ]);
      },
      cierra: false
    }, {
      texto: "BOTONES DEL TOUCH",
      accion: () => paneles.submenu(menuBotonesVR()),
      cierra: false
    }, opcion(() => "GIRO: " + (Q.giro === "suave" ? "SUAVE" : "POR SALTOS"), () => ctl.ponerQuest("giro", Q.giro === "suave" ? "saltos" : "suave")), opcion(() => Q.giro === "suave" ? `VELOCIDAD DEL GIRO: ${Q.velGiro} GRADOS/S` : `ANGULO DEL GIRO: ${Q.angulo} GRADOS`, d => Q.giro === "suave" ? ctl.ponerQuest("velGiro", ctl.pasoLista(ctl.VELOCIDADES_GIRO, Q.velGiro, d)) : ctl.ponerQuest("angulo", ctl.pasoLista(ctl.ANGULOS_GIRO, Q.angulo, d))), opcion(() => "ZONA MUERTA: " + pct(Q.zonaMuerta), d => ctl.ponerQuest("zonaMuerta", ctl.pasoLista(ctl.ZONAS_MUERTAS, Q.zonaMuerta, d))), opcion(() => "MANO HABIL: " + (Q.zurdo ? "ZURDO" : "DIESTRO"), () => ctl.ponerQuest("zurdo", !Q.zurdo)), opcion(() => "MANOS: " + (vrManosSnake ? "DE SNAKE" : "CONTROL"), () => {
      vrManosSnake = !vrManosSnake;
      guardarExtraVR("sm_vrmanos", vrManosSnake);
    }), opcion(() => "CUERPO VISIBLE: " + (vrCuerpoVisible ? "SI" : "NO"), () => {
      vrCuerpoVisible = !vrCuerpoVisible;
      guardarExtraVR("sm_vrcuerpo", vrCuerpoVisible);
    }), opcion(() => "GOLPE CON LA MANO: " + (vrGolpeMano ? "SI" : "NO"), () => {
      vrGolpeMano = !vrGolpeMano;
      guardarExtraVR("sm_vrgolpe", vrGolpeMano);
    }), opcion(() => "MANDO: PUERTO " + (puerto2Activo() ? 2 : 1), () => ponerPuerto2(!puerto2Activo())), opcion(() => "MOVERSE HACIA: " + (Q.dir === "control" ? "EL CONTROL" : "LA MIRADA"), () => ctl.ponerQuest("dir", Q.dir === "control" ? "mirada" : "control")), opcion(() => "VIBRACION: " + (Q.vibra > 0 ? pct(Q.vibra) : "NO"), d => {
      ctl.ponerQuest("vibra", ctl.pasoLista(ctl.VIBRAS_QUEST, Q.vibra, d));
      ctl.vibrar("leve");
    }), {
      texto: "RESTAURAR POR DEFECTO",
      accion: () => ctl.restaurarQuest(),
      cierra: false
    }, {
      texto: "< VOLVER",
      accion: () => {
        if (desdeTitulo) paneles.cerrarMenu(); else {
          paneles.cerrarMenu();
          paneles.abrirMenu();
        }
      },
      cierra: false
    } ];
  }
  pantallaControles.enVR = () => R.xr.isPresenting;
  pantallaControles.alAbrirVR = () => {
    if (!paneles.menuAbierto && !paneles.abrirMenu()) return;
    desdeTitulo = titulo.visible;
    if (desdeTitulo) {
      const p = paneles.panel("menu");
      p.prio = 101;
      p.mesh.renderOrder = 10 + p.prio;
    }
    paneles.submenu(menuControlesVR());
  };
  paneles.menu({
    get titulo() {
      return tituloVR;
    },
    se: id => audioMGS.se(id),
    pie: () => `${sinTildes(ctl.botonQuestDe("circulo") || "O").replace(/\.$/, "")} ELEGIR   < > CAMBIAR   ${sinTildes(ctl.botonQuestDe("cruz") || "X").replace(/\.$/, "")} VOLVER`,
    alCerrar: () => {
      tituloVR = "MENU";
      desdeTitulo = false;
      const p = paneles.panel("menu");
      if (p && p.prio !== 75) {
        p.prio = 75;
        p.mesh.renderOrder = 10 + p.prio;
      }
    },
    entradas: () => {
      tituloVR = "MENU";
      const S = $("#esc-sel"), ops = [ ...S.options ].map(o => o.value), lista = personajes.length ? personajes : catalogo;
      escVR = S.value;
      objVR = selCat || lista[0];
      const moverEsc = k => {
        const i = Math.max(0, ops.indexOf(escVR));
        escVR = ops[(i + k + ops.length) % ops.length];
      };
      const moverObj = k => {
        const i = Math.max(0, lista.indexOf(objVR));
        objVR = lista[(i + k + lista.length) % lista.length];
      };
      return [ {
        texto: "CONTINUAR"
      }, {
        texto: () => "CAMARA: " + {
          primera: "PRIMERA PERSONA",
          hombro: "TERCERA PERSONA",
          arriba: "ORIGINAL (PANTALLA)"
        }[vista],
        izq: () => cambiarVista(VISTAS[(VISTAS.indexOf(vista) + 2) % 3]),
        der: () => cambiarVista(),
        accion: () => cambiarVista(),
        cierra: false
      }, modo === "escenarios" && !partida && ops.length ? {
        texto: () => "ESCENARIO " + nombreEsc(escVR),
        izq: () => moverEsc(-1),
        der: () => moverEsc(1),
        accion: () => {
          S.value = escVR;
          S.dispatchEvent(new Event("change"));
        }
      } : null, modo === "catalogo" && objVR ? {
        texto: () => "OBJETO " + nombreLindo(objVR.nombre),
        izq: () => moverObj(-1),
        der: () => moverObj(1),
        accion: () => {
          selCat = objVR;
          verModelo(objVR);
        }
      } : null, modo === "museo" ? {
        texto: () => "TODOS LOS PERSONAJES: " + ($("#museo-todos").checked ? "SI" : "NO"),
        accion: () => {
          $("#museo-todos").checked = !$("#museo-todos").checked;
          construirMuseo();
        }
      } : null, {
        texto: () => "LUZ: " + (luzOriginal ? "ORIGINAL" : "MODERNA"),
        accion: () => {
          luzOriginal = !luzOriginal;
          aplicarLuz();
        },
        cierra: false
      }, {
        texto: () => "TEXTURAS: " + (texturasPixel.pixel ? "PIXELADAS (ORIGINAL)" : "SUAVIZADAS"),
        accion: () => texturasPixel.alternar(),
        cierra: false
      }, {
        texto: () => "TODAS LAS ARMAS E ITEMS: " + (todoArmas ? "SI" : "NO"),
        accion: () => alternarTodo(),
        cierra: false
      }, {
        texto: () => "RADAR: " + (vrRadarGira ? "GIRA CONMIGO" : "NORTE ARRIBA"),
        accion: () => {
          vrRadarGira = !vrRadarGira;
          guardarVR();
        },
        cierra: false
      }, {
        texto: () => "POSICION: " + (vrSentado ? "SENTADO" : "PARADO"),
        accion: () => {
          vrSentado = !vrSentado;
          guardarVR();
          calibrarAltura();
        },
        cierra: false
      }, {
        texto: "RECENTRAR ALTURA",
        accion: () => calibrarAltura(),
        cierra: false
      }, {
        texto: () => vrCamara ? "SALIR DEL MODO CAMARA" : "MODO CAMARA (VOLAR LIBRE)",
        accion: () => alternarCamaraVR()
      }, {
        texto: () => "CINEMATICAS VR: " + (vrCineInmersivo ? "ADENTRO" : "PANTALLA"),
        accion: () => ponerVrCine(!vrCineInmersivo),
        cierra: false
      }, {
        texto: "CONTROLES (BOTONES, GIRO, MANO...)",
        accion: () => paneles.submenu(menuControlesVR()),
        cierra: false
      }, {
        texto: "VOLVER AL TITULO",
        accion: () => mostrarTitulo("menu")
      }, {
        texto: "SALIR DE VR",
        accion: () => R.xr.getSession()?.end()
      } ];
    }
  });
}

let avisarDatos;

const datosListos = new Promise(r => avisarDatos = r);

if (!new URLSearchParams(location.search).get("modo")) mostrarTitulo("logos");

catalogo = await (await fetch("assets/catalogo.json")).json();

escenarios = await (await fetch("assets/escenarios.json")).json();

personajes = catalogo.filter(c => c.categoria === "personaje").sort((a, b) => b.con_nombre - a.con_nombre || !!NOMBRES[b.nombre] - !!NOMBRES[a.nombre] || a.nombre.localeCompare(b.nombre));

llenarEscenarios();

avisarDatos();

const q = new URLSearchParams(location.search);

if (q.get("esc")) $("#esc-sel").value = q.get("esc");

async function mostrarTitulo(desde = "titulo", cursor = null) {
  document.exitPointerLock?.();
  $("#panel").classList.add("oculto");
  $("#mostrar").hidden = true;
  const el = await titulo.mostrar({
    desde: desde,
    cursor: cursor
  });
  if (!el) return;
  await datosListos;
  aplicarOpciones(el.opciones);
  if (el.opciones.vr && !$("#opt-vr").hidden && !R.xr.isPresenting) $("#opt-vr").click();
  if (el.entrada === "jugar") {
    const r = await partidaUI.inicio({
      dificultad: el.dificultad
    });
    if (!r) return mostrarTitulo("menu", "jugar");
    usarPartida(r.accion === "nueva" ? await Partida.nueva(r.dificultad) : Partida.cargar(r.datos));
    const clear = r.accion !== "nueva" && !!partida?.visor?.nuevaPartida;
    if (clear) delete partida.visor.nuevaPartida;
    if (r.accion === "nueva" || clear) await correrDemos((await cargarCadenas())?.partida_nueva?.pasos);
    return cambiarModo("jugar", partida.st);
  }
  if (el.entrada === "vr") return cambiarModo("vr");
  cambiarModo({
    museo: "museo",
    objetos: "catalogo",
    escenarios: "escenarios"
  }[el.entrada] || "museo");
  if (TACTIL) $("#mostrar").hidden = false; else $("#panel").classList.remove("oculto");
}

if (q.get("modo")) {
  cambiarModo(q.get("modo"));
  if (q.get("modo") !== "jugar" && q.get("modo") !== "vr") {
    if (TACTIL) $("#mostrar").hidden = false; else $("#panel").classList.remove("oculto");
  }
}

window.__mgs = {
  get trabas() {
    return {
      misiones: !!misionesVR.bloqueaControl,
      carga: !!cargaNivel,
      cambiando: cambiando,
      esperaSalida: esperaSalida,
      muerte: !!muerteSnake,
      frenado: !!snakeScript.frenado,
      sinPad: !!snakeScript.sinPad,
      destino: !!snakeScript.destino,
      motion: !!snakeScript.motion,
      jefe: !!congeladoJefe,
      snakeBloq: !!juego?.snakeBloqueado?.(),
      padSuelto: !!padGuion.suelto,
      codecPad: !!codec.padTrabado,
      ascensor: !!din?.bloqueaControl,
      pausa: !!enPausa(),
      vuelo: vuelo,
      enSuelo: enSuelo,
      pared: !!pared,
      choque: choquePared ? choquePared.punto.toArray().map(v => +v.toFixed(2)) : null,
      agachado: agachado,
      reptando: reptando
    };
  },
  get colParedes() {
    return colParedes;
  },
  get vistaActual() {
    return vista;
  },
  ponerVista: v => cambiarVista(v),
  get cineVR() {
    return cineVR;
  },
  camaraVR: () => alternarCamaraVR(),
  get vrCamara() {
    return vrCamara;
  },
  get cuerpo() {
    return cuerpo;
  },
  get colPisos() {
    return colPisos;
  },
  get pared() {
    return pared;
  },
  titulo: titulo,
  mostrarTitulo: mostrarTitulo,
  codec: codec,
  guion: guion,
  inventario: inventario,
  demo: demo,
  get armas() {
    return armas;
  },
  get sensores() {
    return sensores;
  },
  get camJuego() {
    return camJuego;
  },
  audio: audioMGS,
  tecla: (c, abajo = true) => dispatchEvent(new KeyboardEvent(abajo ? "keydown" : "keyup", {
    code: c
  })),
  get juego() {
    return juego;
  },
  cache: cache,
  scene: scene,
  rig: rig,
  cam: cam,
  catalogo: catalogo,
  escenarios: escenarios,
  cambiarModo: cambiarModo,
  cargarEscenario: cargarEscenario,
  verModelo: verModelo,
  ubicar: ubicar,
  ponerPersonaje: ponerPersonaje,
  set yaw(v) {
    yaw = v;
  },
  set pitch(v) {
    pitch = v;
  },
  get colisiones() {
    return colisiones;
  },
  get din() {
    return din;
  },
  get colParedes() {
    return colParedes;
  },
  sol: sol,
  sombraU: sombraU,
  R: R,
  get reptando() {
    return reptando;
  },
  golpe: golpe,
  disparar: () => dispararDesdeCamara(),
  get arma() {
    return armaVista;
  },
  get patrullas() {
    return patrullas;
  }
};

window.__mgs.vr = misionesVR;

Object.defineProperty(window.__mgs, "partida", {
  get: () => partida
});

Object.assign(window.__mgs, {
  partidaUI: partidaUI,
  usarPartida: usarPartida,
  Partida: Partida
});

Object.defineProperty(window.__mgs, "enVR", {
  get: () => R.xr.isPresenting
});

window.__mgs.paneles = paneles;

window.__mgs.extrasVR = {
  retrucoMantis: retrucoMantis,
  peleaMantis: peleaMantis,
  puerto2Activo: puerto2Activo,
  golpeManoVR: () => cdGolpeMano,
  manosSnake: manosSnake
};

Object.assign(window.__mgs, {
  terceraVR: terceraVR,
  vrModo: vrModo,
  get hombroK() {
    return hombroK;
  }
});
