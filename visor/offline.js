// MGS web — FeniXVOID · Project Ravenlight
const BASE = new URL("./", location.href).href;

const abs = p => new URL(p, BASE).href;

const C_ASSETS = "mgs-assets";

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || !!window.MGSApp;

const TACTIL = matchMedia?.("(pointer: coarse)").matches;

const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

const hayCaches = typeof caches !== "undefined" && !!window.isSecureContext;

const haySW = "serviceWorker" in navigator && !!window.isSecureContext;

const mb = b => (b / 1e6).toLocaleString("es-AR", {
  maximumFractionDigits: b < 1e7 ? 1 : 0
});

const dormir = ms => new Promise(r => setTimeout(r, ms));

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

try {
  performance.setResourceTimingBufferSize?.(2e4);
} catch {}

const q = new URLSearchParams(location.search);

if (q.get("sw") === "1" || q.get("sw") === "0") escribirLS("mgs_sw", q.get("sw"));

const preferido = leerLS("mgs_sw");

const swPedido = haySW && (preferido === "1" || preferido !== "0" && !LOCAL);

let versionSW = null, controlado = haySW && !!navigator.serviceWorker.controller;

if (haySW) {
  if (swPedido) {
    navigator.serviceWorker.register("sw.js", {
      updateViaCache: "none"
    }).then(reg => {
      setInterval(() => reg.update().catch(() => {}), 30 * 6e4);
    }).catch(e => console.warn("[offline] no se pudo registrar el service worker:", e?.message || e));
    const sinControlAlEmpezar = !controlado;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      controlado = true;
      pintar();
      if (sinControlAlEmpezar) setTimeout(guardarYaBajado, 1500);
    });
    navigator.serviceWorker.addEventListener("message", e => {
      const d = e.data || {};
      if (d.tipo === "mgs-falta") falta(d.archivo);
      if (d.tipo === "mgs-version") {
        versionSW = d.version;
        pintar();
      }
    });
    navigator.serviceWorker.ready.then(reg => reg.active?.postMessage({
      tipo: "mgs-version"
    })).catch(() => {});
  } else {
    navigator.serviceWorker.getRegistrations().then(rs => rs.filter(r => r.scope === BASE).forEach(r => r.unregister())).catch(() => {});
  }
}

const puedeOffline = () => hayCaches && swPedido;

let manifiestoP = null, manifiestoFallo = 0;

function manifiesto(nuevo = false) {
  if (!nuevo && !manifiestoP && Date.now() - manifiestoFallo < 1e4) return Promise.resolve(null);
  if (!manifiestoP || nuevo) manifiestoP = fetch(abs("assets/offline.json"), {
    cache: "no-cache"
  }).then(r => r.ok ? r.json() : null).catch(() => null).then(m => {
    if (!m) {
      manifiestoP = null;
      manifiestoFallo = Date.now();
    }
    return m;
  });
  return manifiestoP;
}

async function clavesGuardadas() {
  const c = await caches.open(C_ASSETS);
  return new Set((await c.keys()).map(r => r.url));
}

const estado = {
  revisado: false,
  total: 0,
  totalBytes: 0,
  faltan: 0,
  faltanBytes: 0,
  listo: false,
  codigo: false,
  version: null
};

try {
  Object.assign(estado, JSON.parse(leerLS("mgs_offline") || "{}"), {
    revisado: false
  });
} catch {}

async function revisar() {
  if (!puedeOffline()) return estado;
  const m = await manifiesto();
  if (!m) return estado;
  const ya = await clavesGuardadas();
  let faltan = 0, faltanBytes = 0;
  for (const [p, t] of m.assets) if (!ya.has(abs(p))) {
    faltan++;
    faltanBytes += t;
  }
  const codigo = (await caches.keys()).some(k => k.startsWith("mgs-codigo-"));
  Object.assign(estado, {
    revisado: true,
    version: m.version,
    total: m.assets.length,
    totalBytes: m.total,
    faltan: faltan,
    faltanBytes: faltanBytes,
    codigo: codigo,
    listo: faltan === 0 && codigo && controlado
  });
  escribirLS("mgs_offline", JSON.stringify({
    version: estado.version,
    total: estado.total,
    totalBytes: estado.totalBytes,
    faltan: faltan,
    faltanBytes: faltanBytes,
    listo: estado.listo
  }));
  pintar();
  return estado;
}

async function guardarYaBajado() {
  if (!puedeOffline()) return;
  try {
    const c = await caches.open(C_ASSETS), ya = await clavesGuardadas();
    const urls = [ ...new Set(performance.getEntriesByType("resource").map(e => e.name.split("#")[0].split("?")[0])) ].filter(u => u.startsWith(BASE + "assets/") && !u.endsWith("/offline.json") && !ya.has(u));
    let n = 0;
    for (const u of urls) {
      try {
        const r = await fetch(u, {
          headers: {
            "X-MGS-Descarga": "1"
          }
        });
        if (r.ok && r.status === 200) {
          await c.put(u, r);
          n++;
        }
      } catch {
        break;
      }
    }
    if (n) console.log(`[offline] ${n} archivos ya bajados quedaron guardados para jugar sin señal`);
  } catch {}
}

const D = {
  activa: false,
  pausada: false,
  cancelada: false,
  hechos: 0,
  total: 0,
  bytes: 0,
  totalBytes: 0,
  errores: 0,
  sinSenal: false,
  lleno: false,
  fin: ""
};

let abortar = null, cerrojo = null;

const enPausa = [];

async function descargar({limite: limite = Infinity} = {}) {
  if (D.activa || !puedeOffline()) return;
  const m = await manifiesto(true);
  if (!m) {
    D.fin = "NO SE PUDO LEER LA LISTA DE ARCHIVOS: HACE FALTA SEÑAL PARA EMPEZAR";
    pintar();
    return;
  }
  try {
    estado.persistente = await Promise.race([ navigator.storage?.persist?.(), dormir(3e3).then(() => estado.persistente) ]);
  } catch {}
  const c = await caches.open(C_ASSETS), ya = await clavesGuardadas();
  const faltan = m.assets.filter(([p]) => !ya.has(abs(p))).slice(0, limite > 0 ? limite : Infinity);
  Object.assign(D, {
    activa: true,
    pausada: false,
    cancelada: false,
    hechos: 0,
    total: faltan.length,
    bytes: 0,
    totalBytes: faltan.reduce((s, x) => s + x[1], 0),
    errores: 0,
    sinSenal: false,
    lleno: false,
    fin: ""
  });
  abortar = new AbortController;
  try {
    cerrojo = await Promise.race([ navigator.wakeLock?.request?.("screen"), dormir(2e3).then(() => null) ]);
  } catch {
    cerrojo = null;
  }
  let i = 0;
  const uno = async ([p, t]) => {
    for (let intento = 0; ;intento++) {
      if (D.cancelada) return;
      try {
        const r = await fetch(abs(p), {
          cache: "no-cache",
          headers: {
            "X-MGS-Descarga": "1"
          },
          signal: abortar.signal
        });
        if (r.ok && r.status === 200) await c.put(abs(p), r); else D.errores++;
        D.hechos++;
        D.bytes += t;
        return;
      } catch (e) {
        if (e?.name === "AbortError" || D.cancelada) return;
        if (e?.name === "QuotaExceededError") {
          D.lleno = true;
          D.cancelada = true;
          abortar.abort();
          return;
        }
        D.sinSenal = true;
        pintar();
        await Promise.race([ new Promise(r => addEventListener("online", r, {
          once: true
        })), dormir(Math.min(15e3, 3e3 * (intento + 1))) ]);
        D.sinSenal = false;
      }
    }
  };
  const trabajador = async () => {
    while (i < faltan.length && !D.cancelada) {
      if (D.pausada) {
        await new Promise(r => enPausa.push(r));
        continue;
      }
      await uno(faltan[i++]);
      pintar();
    }
  };
  await Promise.all(Array.from({
    length: TACTIL ? 4 : 6
  }, trabajador));
  try {
    await (cerrojo?.release?.());
  } catch {}
  cerrojo = null;
  D.activa = false;
  D.fin = D.lleno ? "NO HAY MAS ESPACIO EN ESTE EQUIPO: LIBERA LUGAR Y SEGUI (LO BAJADO QUEDA)" : D.cancelada ? "DESCARGA CANCELADA (LO QUE YA BAJO QUEDA GUARDADO; SE PUEDE SEGUIR DESPUES)" : D.errores ? `TERMINO CON ${D.errores} ARCHIVOS QUE NO SE PUDIERON BAJAR (VOLVE A DESCARGAR CON SEÑAL)` : "";
  await revisar();
  if (!D.fin && estado.listo) D.fin = "LISTO: SE PUEDE JUGAR TODO SIN SEÑAL";
  pintar();
}

function pausar() {
  if (D.activa) {
    D.pausada = true;
    pintar();
  }
}

function reanudar() {
  if (D.activa) {
    D.pausada = false;
    enPausa.splice(0).forEach(r => r());
    pintar();
  }
}

function cancelar() {
  if (D.activa) {
    D.cancelada = true;
    D.pausada = false;
    abortar?.abort();
    enPausa.splice(0).forEach(r => r());
    pintar();
  }
}

const CSS = `\n#mgs-red{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(4px + env(safe-area-inset-bottom));z-index:46;pointer-events:none;\n  font:10px/1.2 'MGS',Consolas,monospace;letter-spacing:1px;color:#7fb08c;background:rgba(0,0,0,.55);border:1px solid #2f4a39;padding:2px 6px;white-space:nowrap;text-transform:uppercase}\n#mgs-red[hidden]{display:none}\n#mgs-red.sin{color:#ffb0a0;border-color:#7a3a30}\n#mgs-red.ok{color:#b4f4ac}\n#mgs-off{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,4,2,.94);color:#7fb08c;\n  font:14px/1.35 'MGS',Consolas,monospace;text-transform:uppercase;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));box-sizing:border-box}\n#mgs-off[hidden]{display:none}\n#mgs-off *{box-sizing:border-box}\n#mgs-off .caja{width:min(100%,520px);max-height:100%;overflow:auto;display:flex;flex-direction:column;gap:10px;border:1px solid #5f8c6c;outline:1px solid #000;background:rgba(0,6,2,.96);padding:14px 16px}\n#mgs-off h2{margin:0;font:400 20px/1.15 'MGS8',Consolas,monospace;color:#b4f4ac;letter-spacing:1px;text-align:center}\n#mgs-off .txt{color:#b4f4ac}\n#mgs-off .chico{font-size:12px;color:#5f8c6c}\n#mgs-off .barra{height:12px;border:1px solid #2f4a39;background:#020a05}\n#mgs-off .barra i{display:block;height:100%;width:0;background:linear-gradient(#5fd06a,#2f8a3c)}\n#mgs-off .grupos{display:grid;grid-template-columns:1fr auto;gap:0 12px;font-size:12px;color:#7fb08c}\n#mgs-off .grupos b{font-weight:normal;color:#5f8c6c;text-align:right}\n#mgs-off .botones{display:flex;flex-wrap:wrap;gap:8px}\n#mgs-off button{flex:1 1 120px;min-height:44px;padding:8px;border:1px solid #2f4a39;background:rgba(4,14,8,.8);color:#7fb08c;font:inherit;text-transform:inherit;cursor:pointer;outline:1px solid #000}\n#mgs-off button.sel,#mgs-off button:hover{border-color:#b4f4ac;color:#b4f4ac;background:rgba(0,110,60,.38)}\n#mgs-off button[disabled]{opacity:.4;cursor:default}\n#mgs-falta{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(24px + env(safe-area-inset-bottom));z-index:46;pointer-events:none;max-width:94vw;\n  font:11px/1.3 'MGS',Consolas,monospace;color:#ffb0a0;background:rgba(0,0,0,.7);border:1px solid #7a3a30;padding:3px 8px;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n#mgs-falta[hidden]{display:none}\n`;

let ind = null, toast = null, dlg = null;

function armar() {
  if (ind || !document.body) return;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
  ind = document.createElement("div");
  ind.id = "mgs-red";
  ind.hidden = true;
  document.body.appendChild(ind);
  toast = document.createElement("div");
  toast.id = "mgs-falta";
  toast.hidden = true;
  document.body.appendChild(toast);
}

function rotulo() {
  if (!puedeOffline()) return "NO DISPONIBLE";
  if (D.activa) return D.pausada ? "EN PAUSA" : "BAJANDO";
  return estado.listo ? "LISTO" : "DESCARGAR";
}

let ultPintado = 0, pintarPend = false;

function pintar() {
  const t = performance.now();
  if (t - ultPintado < 120) {
    if (!pintarPend) {
      pintarPend = true;
      setTimeout(() => {
        pintarPend = false;
        pintar();
      }, 130);
    }
    return;
  }
  ultPintado = t;
  armar();
  if (!ind) return;
  const online = navigator.onLine !== false;
  let txt = "", cls = "";
  if (D.activa) {
    txt = D.sinSenal ? "SIN SEÑAL · DESCARGA EN ESPERA" : `${D.pausada ? "DESCARGA EN PAUSA" : "BAJANDO PARA JUGAR SIN SEÑAL"} ${pct()} %`;
    cls = D.sinSenal ? "sin" : "";
  } else if (!online) {
    txt = estado.listo ? "SIN SEÑAL · TODO GUARDADO" : "SIN SEÑAL · SOLO LO YA JUGADO";
    cls = estado.listo ? "ok" : "sin";
  } else if (estado.listo && controlado) {
    txt = "LISTO PARA JUGAR SIN SEÑAL";
    cls = "ok";
  }
  ind.textContent = txt;
  ind.className = cls;
  ind.hidden = !txt || enVR();
  const b = document.getElementById("opt-offline");
  if (b) b.textContent = !puedeOffline() ? "Jugar sin señal: no disponible acá" : D.activa ? `Jugar sin señal: bajando ${pct()} %` : estado.listo ? "Jugar sin señal: listo" : "Jugar sin señal: descargar";
  if (dlg && !dlg.hidden) pintarDialogo();
}

const pct = () => D.totalBytes ? Math.floor(D.bytes / D.totalBytes * 100) : 0;

const enVR = () => !!window.__mgs?.enVR;

addEventListener("online", () => pintar());

addEventListener("offline", () => pintar());

let tFalta = 0, ultimaFalta = 0;

function falta(archivo) {
  ultimaFalta = Date.now();
  armar();
  if (!toast) return;
  toast.textContent = `SIN SEÑAL: FALTA ${String(archivo || "").replace(/^assets\//, "")}`;
  toast.hidden = enVR();
  clearTimeout(tFalta);
  tFalta = setTimeout(() => {
    toast.hidden = true;
  }, 4e3);
}

let modoDlg = null, aviso = null, botonesDlg = [], selDlg = 0, mandoRaf = 0, ctlMod = null, espacio = null;

function abrirCaja() {
  armar();
  if (!dlg) {
    dlg = document.createElement("div");
    dlg.id = "mgs-off";
    dlg.hidden = true;
    dlg.setAttribute("role", "dialog");
    dlg.innerHTML = '<div class="caja"><h2></h2><div class="txt"></div><div class="barra"><i></i></div><div class="det chico"></div><div class="grupos"></div><div class="botones"></div><div class="nota chico"></div></div>';
    dlg.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (b && !b.disabled) b._accion?.();
    });
    document.body.appendChild(dlg);
  }
  dlg.hidden = false;
  import("./controles.js").then(m => {
    ctlMod = m;
    if (dlg && !dlg.hidden) m.bloquearMando(true);
  }).catch(() => {});
  cancelAnimationFrame(mandoRaf);
  mandoAnt = null;
  mandoRaf = requestAnimationFrame(leerMando);
}

function cerrarCaja() {
  if (!dlg) return;
  dlg.hidden = true;
  modoDlg = null;
  aviso = null;
  cancelAnimationFrame(mandoRaf);
  mandoRaf = 0;
  try {
    ctlMod?.bloquearMando(false);
  } catch {}
}

const abierta = () => !!dlg && !dlg.hidden;

function ponerBotones(lista) {
  const cont = dlg.querySelector(".botones");
  const firma = lista.map(b => b.texto + (b.desactivado ? "0" : "1")).join("|");
  if (cont.dataset.firma !== firma) {
    cont.dataset.firma = firma;
    cont.innerHTML = "";
    botonesDlg = lista.map(b => {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = b.texto;
      el.disabled = !!b.desactivado;
      cont.appendChild(el);
      return el;
    });
    selDlg = Math.max(0, lista.findIndex(x => !x.desactivado));
  }
  lista.forEach((b, i) => {
    botonesDlg[i]._accion = b.accion;
    botonesDlg[i]._atras = !!b.atras;
    botonesDlg[i].classList.toggle("sel", i === selDlg);
  });
}

async function abrir() {
  if (enVR()) return false;
  modoDlg = "descarga";
  selDlg = 0;
  abrirCaja();
  pintarDialogo();
  try {
    const e = await (navigator.storage?.estimate?.());
    if (e) espacio = {
      libre: Math.max(0, (e.quota || 0) - (e.usage || 0)),
      usado: e.usage || 0
    };
  } catch {}
  try {
    estado.persistente = await (navigator.storage?.persisted?.());
  } catch {}
  await revisar();
  manifiesto().then(() => pintarDialogo());
  pintarDialogo();
  return true;
}

function pintarDialogo() {
  if (!dlg || dlg.hidden) return;
  const $ = s => dlg.querySelector(s);
  if (modoDlg === "aviso" && aviso) {
    $("h2").textContent = aviso.titulo;
    $(".txt").textContent = aviso.texto;
    $(".barra").hidden = true;
    $(".det").textContent = aviso.detalle || "";
    $(".grupos").innerHTML = "";
    $(".nota").textContent = aviso.nota || "";
    ponerBotones(aviso.botones);
    return;
  }
  $("h2").textContent = "JUGAR SIN SEÑAL";
  $(".barra").hidden = false;
  const m = manifiestoP && estado.revisado;
  let txt = "", det = "";
  if (!hayCaches || !haySW) txt = "ESTE NAVEGADOR NO PUEDE GUARDAR EL JUEGO PARA JUGAR SIN SEÑAL (NO TIENE SERVICE WORKER). CON SEÑAL SE JUEGA IGUAL."; else if (!swPedido) txt = LOCAL ? "EN LOCALHOST VA APAGADO PARA NO TAPAR LOS CAMBIOS: ABRI LA PAGINA CON ?SW=1 PARA PROBARLO." : "APAGADO EN ESTE NAVEGADOR (?SW=0). ABRI LA PAGINA CON ?SW=1 PARA PRENDERLO."; else if (D.activa) {
    txt = D.sinSenal ? "SIN SEÑAL: LA DESCARGA SIGUE SOLA CUANDO VUELVA." : D.pausada ? "EN PAUSA." : "BAJANDO… SE PUEDE CERRAR ESTA PANTALLA Y SEGUIR JUGANDO.";
    det = `${mb(D.bytes)} DE ${mb(D.totalBytes)} MB (${pct()} %) · ${D.hechos.toLocaleString("es-AR")} DE ${D.total.toLocaleString("es-AR")} ARCHIVOS`;
  } else if (!m) txt = "REVISANDO LO QUE YA ESTA GUARDADO…"; else if (estado.listo) txt = "LISTO: EL JUEGO ENTERO ESTA GUARDADO EN ESTE EQUIPO. SE PUEDE JUGAR SIN SEÑAL."; else txt = `PESA ${mb(estado.totalBytes)} MB EN TOTAL. ${estado.faltan === estado.total ? "NO HAY NADA GUARDADO TODAVIA" : `YA ESTA GUARDADO ${mb(estado.totalBytes - estado.faltanBytes)} MB`}: FALTAN ${mb(estado.faltanBytes)} MB (${estado.faltan.toLocaleString("es-AR")} ARCHIVOS).`;
  if (D.fin && !D.activa) txt = D.fin + (estado.listo || D.cancelada ? "" : " " + txt);
  $(".txt").textContent = txt;
  const f = D.activa ? D.bytes / (D.totalBytes || 1) : m ? 1 - estado.faltanBytes / (estado.totalBytes || 1) : 0;
  $(".barra i").style.width = (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + "%";
  const lineas = [];
  if (det) lineas.push(det);
  if (espacio) lineas.push(`ESPACIO DISPONIBLE PARA EL SITIO: ${mb(espacio.libre)} MB${m && !estado.listo && espacio.libre < estado.faltanBytes * 1.1 ? " (PUEDE NO ALCANZAR)" : ""}`);
  if (estado.persistente != null) lineas.push(estado.persistente ? "GUARDADO PERMANENTE: SI" : "GUARDADO PERMANENTE: NO (SI AL EQUIPO LE FALTA LUGAR, EL NAVEGADOR LO PUEDE BORRAR)");
  $(".det").textContent = lineas.join("\n");
  $(".det").style.whiteSpace = "pre-line";
  const g = $(".grupos");
  manifiesto().then(mm => {
    if (!mm || g.dataset.v === mm.version) return;
    g.dataset.v = mm.version;
    const NOM = {
      escenarios: "ESCENARIOS",
      niveles: "NIVELES",
      codec: "CODEC (VOCES)",
      demos: "CINEMATICAS",
      modelos: "MODELOS",
      anim: "ANIMACIONES",
      sonido: "SONIDO",
      hud: "HUD",
      jefes: "JEFES",
      vr: "VR MISSIONS",
      xr: "VR (CASCO)"
    };
    const filas = Object.entries(mm.grupos).sort((a, b) => b[1].bytes - a[1].bytes);
    const grandes = filas.filter(([, x]) => x.bytes >= 3e6), resto = filas.filter(([, x]) => x.bytes < 3e6).reduce((s, [, x]) => s + x.bytes, 0);
    g.innerHTML = grandes.map(([k, x]) => `<span>${NOM[k] || k.toUpperCase()}</span><b>${mb(x.bytes)} MB</b>`).join("") + (resto ? `<span>RESTO</span><b>${mb(resto)} MB</b>` : "") + `<span>CODIGO</span><b>${mb(mm.totalCodigo || 0)} MB</b>`;
  });
  const bs = [];
  if (D.activa) {
    bs.push(D.pausada ? {
      texto: "SEGUIR",
      accion: () => reanudar()
    } : {
      texto: "PAUSAR",
      accion: () => pausar()
    });
    bs.push({
      texto: "CANCELAR",
      accion: () => cancelar()
    });
  } else if (puedeOffline() && !(m && estado.listo)) bs.push({
    texto: m && estado.totalBytes - estado.faltanBytes > 2e7 ? "SEGUIR DESCARGA" : "DESCARGAR",
    accion: () => {
      descargar();
      pintar();
    },
    desactivado: !m
  });
  bs.push({
    texto: "CERRAR",
    accion: () => cerrarCaja(),
    atras: true
  });
  ponerBotones(bs);
  $(".nota").textContent = IOS ? "EN IPHONE/IPAD: AGREGALO A LA PANTALLA DE INICIO (COMPARTIR > AGREGAR A INICIO) Y DESCARGALO DESDE AHI: SAFARI BORRA LO GUARDADO DE LAS PAGINAS QUE NO SE ABREN EN 7 DIAS. CON LA PANTALLA BLOQUEADA LA DESCARGA SE FRENA Y SIGUE AL VOLVER." : "LA DESCARGA SIGUE MIENTRAS LA PAGINA ESTE ABIERTA. SI SE CORTA, DESPUES SIGUE DESDE DONDE QUEDO. LAS PARTIDAS GUARDADAS NO OCUPAN SEÑAL: QUEDAN EN EL EQUIPO.";
}

function avisar({titulo: titulo, texto: texto, detalle: detalle = "", nota: nota = "", botones: botones}) {
  return new Promise(ok => {
    const prev = aviso?.ok;
    prev?.(-1);
    aviso = {
      titulo: titulo,
      texto: texto,
      detalle: detalle,
      nota: nota,
      ok: ok,
      botones: botones.map((b, i) => ({
        texto: b.texto || b,
        atras: !!b.atras,
        accion: () => {
          const f = aviso?.ok;
          cerrarCaja();
          f?.(i);
        }
      }))
    };
    modoDlg = "aviso";
    selDlg = 0;
    abrirCaja();
    pintarDialogo();
  });
}

addEventListener("keydown", e => {
  if (!abierta()) return;
  const c = e.code;
  const mover = d => {
    const n = botonesDlg.length;
    for (let k = 0; k < n; k++) {
      selDlg = (selDlg + d + n) % n;
      if (!botonesDlg[selDlg].disabled) break;
    }
    pintarDialogo();
  };
  if (c === "ArrowLeft" || c === "ArrowUp" || c === "KeyA" || c === "KeyW") mover(-1); else if (c === "ArrowRight" || c === "ArrowDown" || c === "KeyD" || c === "KeyS" || c === "Tab") mover(1); else if (c === "Enter" || c === "NumpadEnter" || c === "Space" || c === "KeyE" || c === "KeyZ") botonesDlg[selDlg]?._accion?.(); else if (c === "Escape" || c === "Backspace" || c === "KeyX" || c === "KeyQ") (botonesDlg.find(b => b._atras) || botonesDlg[botonesDlg.length - 1])?._accion?.(); else {
    e.stopImmediatePropagation();
    return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);

addEventListener("keyup", e => {
  if (abierta()) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

let mandoAnt = null;

function leerMando() {
  if (!abierta()) return;
  mandoRaf = requestAnimationFrame(leerMando);
  const g = (ctlMod?.mandosCrudos?.() || [ ...navigator.getGamepads?.() || [] ]).find(x => x && x.connected);
  if (!g) return;
  const B = ctlMod?.B || {
    ARRIBA: 12,
    ABAJO: 13,
    IZQ: 14,
    DER: 15,
    CRUZ: 0,
    CIRCULO: 1,
    START: 9
  };
  const ap = i => ctlMod?.apretadoCrudo ? ctlMod.apretadoCrudo(g, i) : !!g.buttons[i]?.pressed;
  const ahora = [ B.ARRIBA, B.ABAJO, B.IZQ, B.DER, B.CRUZ, B.CIRCULO, B.START ].map(ap);
  const eje = Math.abs(g.axes[0] || 0) > .6 ? Math.sign(g.axes[0]) : Math.abs(g.axes[1] || 0) > .6 ? Math.sign(g.axes[1]) : 0;
  const ant = mandoAnt;
  mandoAnt = [ ...ahora, eje ];
  if (!ant) return;
  const flanco = k => ahora[k] && !ant[k];
  const tecla = code => dispatchEvent(new KeyboardEvent("keydown", {
    code: code,
    bubbles: true
  }));
  if (flanco(0) || flanco(2) || eje < 0 && ant[7] >= 0) tecla("ArrowLeft"); else if (flanco(1) || flanco(3) || eje > 0 && ant[7] <= 0) tecla("ArrowRight"); else if (flanco(5) || flanco(6)) tecla("Enter"); else if (flanco(4)) tecla("Escape");
}

const nombreDe = id => String(id || "").toUpperCase();

async function conTiempo(p, ms) {
  let t;
  try {
    return await Promise.race([ p, new Promise((_, mal) => {
      t = setTimeout(() => mal(new Error("tiempo")), ms);
    }) ]);
  } finally {
    clearTimeout(t);
  }
}

async function probarNivel(id) {
  const u = abs(`assets/niveles/${id}/nivel.json`);
  try {
    const r = await conTiempo(fetch(u), 6e3);
    return !(r.status === 504 && r.headers.get("X-MGS-Sin-Senal"));
  } catch {
    return false;
  }
}

async function antesDeCargar(id) {
  if (!id || !puedeOffline() || !controlado) return true;
  try {
    if (await caches.match(abs(`assets/niveles/${id}/nivel.json`), {
      ignoreSearch: true
    })) return true;
  } catch {
    return true;
  }
  if (await probarNivel(id)) return true;
  let listo = false, cancelado = false;
  const reintento = (async () => {
    while (!listo && !cancelado) {
      await Promise.race([ new Promise(r => addEventListener("online", r, {
        once: true
      })), dormir(5e3) ]);
      if (!listo && !cancelado && await probarNivel(id)) {
        listo = true;
        cerrarCaja();
        aviso?.ok?.(0);
        return true;
      }
    }
    return false;
  })();
  const r = await Promise.race([ avisar({
    titulo: "SIN SEÑAL",
    texto: `${nombreDe(id)} TODAVIA NO ESTA GUARDADO EN ESTE EQUIPO Y NO HAY SEÑAL.`,
    detalle: "SE CARGA SOLO APENAS VUELVA LA SEÑAL. PARA QUE NO PASE: OPCIONES > JUGAR SIN SEÑAL > DESCARGAR.",
    botones: [ {
      texto: "REINTENTAR"
    }, {
      texto: "QUEDARME ACA",
      atras: true
    } ]
  }).then(i => i === 0 ? "reintentar" : "cancelar"), reintento.then(ok => ok ? "ok" : "cancelar") ]);
  if (r === "ok") return true;
  if (r === "reintentar") {
    if (await probarNivel(id)) {
      listo = true;
      return true;
    }
    cancelado = true;
    return antesDeCargar(id);
  }
  cancelado = true;
  return false;
}

function fallo(id, err, reintentar) {
  const msg = String(err?.message || err || "");
  const porRed = navigator.onLine === false || Date.now() - ultimaFalta < 6e4 || /fetch|network|504|Failed|sin se/i.test(msg);
  if (!porRed || !puedeOffline() && navigator.onLine !== false) return false;
  let hecho = false;
  const volver = () => {
    if (hecho) return;
    hecho = true;
    removeEventListener("online", alVolver);
  };
  const alVolver = () => {
    if (abierta() && aviso?.titulo === "NO SE PUDO CARGAR") {
      volver();
      cerrarCaja();
      reintentar?.();
    }
  };
  addEventListener("online", alVolver);
  avisar({
    titulo: "NO SE PUDO CARGAR",
    texto: `FALTAN ARCHIVOS DE ${nombreDe(id)} Y NO HAY SEÑAL.`,
    detalle: "CUANDO VUELVA LA SEÑAL SE REINTENTA SOLO. LA PARTIDA NO SE PIERDE: CONTINUE DESDE EL TITULO VUELVE AL ULTIMO PUNTO.",
    botones: [ {
      texto: "REINTENTAR"
    }, {
      texto: "IR AL TITULO",
      atras: true
    } ]
  }).then(i => {
    volver();
    if (i === 0) reintentar?.(); else if (i === 1) window.__mgs?.mostrarTitulo?.("titulo");
  });
  return true;
}

addEventListener("mgs:offline", () => {
  abrir();
});

function enganchar() {
  armar();
  document.getElementById("opt-offline")?.addEventListener("click", () => abrir());
  pintar();
  if (puedeOffline()) setTimeout(() => (window.requestIdleCallback || setTimeout)(() => revisar().catch(() => {})), 6e3);
}

if (document.readyState === "loading") addEventListener("DOMContentLoaded", enganchar, {
  once: true
}); else enganchar();

window.mgsOffline = {
  get disponible() {
    return puedeOffline();
  },
  get controlado() {
    return controlado;
  },
  get version() {
    return versionSW;
  },
  estado: estado,
  descarga: D,
  rotulo: rotulo,
  abrir: abrir,
  cerrar: cerrarCaja,
  get abierta() {
    return abierta();
  },
  descargar: descargar,
  pausar: pausar,
  reanudar: reanudar,
  cancelar: cancelar,
  revisar: revisar,
  manifiesto: manifiesto,
  antesDeCargar: antesDeCargar,
  fallo: fallo,
  guardarYaBajado: guardarYaBajado
};
