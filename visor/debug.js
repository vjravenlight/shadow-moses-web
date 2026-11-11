// MGS web — FeniXVOID · Project Ravenlight
import * as tele from "./telemetria.js";

const ENDPOINT = "log.php", CLAVE = "sm-vr";

const sid = Math.random().toString(36).slice(2, 10);

const t0 = performance.now();

const logs = [], cola = [];

let activo = true, estadoFn = () => ({}), R = null, ultimoEnvio = "—";

const seg = () => +((performance.now() - t0) / 1e3).toFixed(1);

export function log(tipo, msg, extra) {
  const e = {
    t: seg(),
    tipo: tipo,
    msg: String(msg).slice(0, 500)
  };
  if (extra !== undefined) e.x = extra;
  try {
    tele.evento(tipo, msg, extra);
  } catch {}
  logs.push(e);
  if (logs.length > 400) logs.shift();
  if (tipo !== "info") encolar(e);
  if (tipo === "error" || tipo === "trabon" || tipo === "congelado") enviar();
  if (panel && !panel.hidden) pintarLog();
}

window.debugLog = log;

const cErr = console.error.bind(console), cWarn = console.warn.bind(console);

const pila = a => a.find(v => v instanceof Error)?.stack?.slice(0, 800);

console.error = (...a) => {
  cErr(...a);
  log("error", a.map(fmt).join(" "), pila(a));
};

console.warn = (...a) => {
  cWarn(...a);
  log("aviso", a.map(fmt).join(" "), pila(a));
};

addEventListener("error", e => log("error", `${e.message} @ ${(e.filename || "").split("/").pop()}:${e.lineno}:${e.colno}`, e.error?.stack?.slice(0, 600)));

addEventListener("unhandledrejection", e => log("error", "promesa: " + fmt(e.reason), e.reason?.stack?.slice(0, 600)));

function fmt(v) {
  try {
    return v instanceof Error ? `${v.name}: ${v.message}` : typeof v === "object" ? JSON.stringify(v).slice(0, 300) : String(v);
  } catch {
    return String(v);
  }
}

const fr = {
  ema: 60,
  peor: 0,
  tirones: 0,
  trabones: 0,
  n: 0,
  suma: 0
};

let ticksTimer = 0, ticksUlt = 0;

setInterval(() => {
  ticksTimer++;
}, 250);

export function cuadro(dt) {
  tele.cuadro(dt);
  const ms = dt * 1e3;
  fr.n++;
  fr.suma += ms;
  fr.peor = Math.max(fr.peor, ms);
  if (dt > 0) fr.ema += (1 / dt - fr.ema) * .05;
  const ticks = ticksTimer - ticksUlt;
  ticksUlt = ticksTimer;
  if (ms > 1e3 && !document.hidden && performance.now() - ultVisible > 1500) {
    if (ticks >= ms / 250 * .5) log("info", `dibujo en pausa ${(ms / 1e3).toFixed(1)} s (ventana tapada o minimizada)`); else {
      fr.trabones++;
      log("trabon", `cuadro de ${(ms / 1e3).toFixed(1)} s`, estado());
    }
  } else if (ms > 100) fr.tirones++;
}

setInterval(() => {
  if (worker) {
    ultPing = performance.now();
    try {
      worker.postMessage({
        tipo: "ping",
        estado: estado()
      });
    } catch {}
  }
}, 1e3);

function estado() {
  let e = {};
  try {
    e = estadoFn() || {};
  } catch (err) {
    e = {
      err: String(err)
    };
  }
  const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : undefined;
  const info = R?.info;
  return {
    ...e,
    mem: mem,
    draw: info?.render.calls,
    tris: info?.render.triangles,
    geos: info?.memory.geometries,
    texs: info?.memory.textures
  };
}

function dispositivo() {
  let gpu = "";
  try {
    const gl = R.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
  } catch {}
  return {
    ua: navigator.userAgent,
    pantalla: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    ventana: `${innerWidth}x${innerHeight}`,
    tactil: matchMedia("(pointer: coarse)").matches,
    nucleos: navigator.hardwareConcurrency,
    ram: navigator.deviceMemory,
    gpu: gpu
  };
}

async function enviar(final = false) {
  if (tele.local) {
    cola.length = 0;
    return;
  }
  if (!activo || !cola.length && !final) return;
  const lote = cola.splice(0, 200);
  const cuerpo = JSON.stringify({
    k: CLAVE,
    sid: sid,
    t: seg(),
    eventos: lote,
    foto: estado(),
    fr: {
      fps: Math.round(fr.ema),
      peor: Math.round(fr.peor),
      tirones: fr.tirones,
      trabones: fr.trabones
    }
  });
  fr.peor = 0;
  try {
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([ cuerpo ], {
        type: "application/json"
      }));
      return;
    }
    const r = await fetch(ENDPOINT, {
      method: "POST",
      body: cuerpo,
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: cuerpo.length < 6e4
    });
    ultimoEnvio = r.ok ? `ok ${(new Date).toLocaleTimeString()}` : `error ${r.status}`;
  } catch (e) {
    ultimoEnvio = "sin conexión";
    cola.unshift(...lote.slice(-50));
  }
}

function encolar(e) {
  cola.push(e);
  if (cola.length > 600) cola.splice(0, cola.length - 600);
}

setInterval(() => encolar({
  t: seg(),
  tipo: "foto",
  msg: "",
  x: {
    ...estado(),
    fps: Math.round(fr.ema)
  }
}), 15e3);

setInterval(() => enviar(), 3e4);

addEventListener("pagehide", () => {
  log("info", "salida de la página");
  cola.push({
    t: seg(),
    tipo: "fin",
    msg: "pagehide"
  });
  enviar(true);
});

let ultVisible = 0;

document.addEventListener("visibilitychange", () => {
  try {
    worker?.postMessage({
      tipo: "visible",
      v: !document.hidden
    });
  } catch {}
  if (document.hidden) {
    cola.push({
      t: seg(),
      tipo: "oculta",
      msg: ""
    });
    enviar(true);
  } else ultVisible = performance.now();
});

let worker = null, ultPing = 0;

try {
  const src = `let ult = Date.now(), est = null, avisado = false, sid = null;\n    let oculta = false;\n    onmessage = (e) => { if (e.data.sid) sid = e.data.sid; if (e.data.tipo === 'visible') { oculta = !e.data.v; if (e.data.v) ult = Date.now(); } if (e.data.tipo === 'ping') { if (avisado) { postMessage({ tipo: 'volvio', s: (Date.now() - ult) / 1000 }); avisado = false; } ult = Date.now(); est = e.data.estado; } };\n    setInterval(() => {\n      const s = (Date.now() - ult) / 1000;\n      if (s > 5 && !avisado && sid && !oculta) {\n        avisado = true;\n        fetch('${ENDPOINT}', { method: 'POST', headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ k: '${CLAVE}', sid, eventos: [{ tipo: 'congelado', msg: 'la página no responde hace ' + s.toFixed(0) + ' s', x: est }] }) }).catch(() => {});\n      }\n    }, 1000);`;
  worker = new Worker(URL.createObjectURL(new Blob([ src ], {
    type: "text/javascript"
  })));
  worker.postMessage({
    sid: sid
  });
  worker.onmessage = e => {
    if (e.data.tipo === "volvio" && !document.hidden && performance.now() - ultVisible > 2e3) log("trabon", `la página volvió tras ${e.data.s.toFixed(1)} s congelada`, estado());
  };
} catch (e) {
  log("aviso", "sin vigilante: " + e.message);
}

let panel = null, cajaLog = null, cajaEst = null;

function crearPanel() {
  panel = document.createElement("div");
  panel.id = "debug";
  panel.hidden = true;
  panel.innerHTML = `<div class="dbg-cab">DEBUG · sesión ${sid}<span><button data-a="enviar">ENVIAR</button><button data-a="copiar">COPIAR</button><button data-a="limpiar">LIMPIAR</button><button data-a="cerrar">X</button></span></div>\n    <pre class="dbg-est"></pre><label class="dbg-tel"><input type="checkbox" checked> Telemetría al servidor</label><pre class="dbg-log"></pre>`;
  const css = document.createElement("style");
  css.textContent = `#debug{position:fixed;right:8px;top:8px;width:min(560px,calc(100% - 16px));max-height:min(70vh,640px);display:flex;flex-direction:column;z-index:50;\n    background:rgba(0,8,3,.94);border:1px solid #5f8c6c;color:#9fd8a8;font:12px/1.35 Consolas,monospace;text-transform:none}\n    #debug[hidden]{display:none} #debug .dbg-cab{display:flex;justify-content:space-between;gap:6px;padding:6px 8px;border-bottom:1px solid #2f4a39;color:#c8ffd0}\n    #debug button{background:#031208;border:1px solid #2f4a39;color:#9fd8a8;font:11px Consolas,monospace;margin-left:4px;padding:2px 6px;cursor:pointer}\n    #debug pre{margin:0;padding:6px 8px;white-space:pre-wrap;word-break:break-word} #debug .dbg-est{border-bottom:1px solid #2f4a39;color:#c8ffd0}\n    #debug .dbg-log{overflow:auto;flex:1;min-height:80px} #debug .dbg-tel{padding:4px 8px;border-bottom:1px solid #2f4a39}\n    #debug .e{color:#ff8a7a} #debug .w{color:#ffd27a} #debug .t{color:#ff5cf0}`;
  document.head.appendChild(css);
  document.body.appendChild(panel);
  cajaLog = panel.querySelector(".dbg-log");
  cajaEst = panel.querySelector(".dbg-est");
  panel.querySelector(".dbg-tel input").onchange = e => {
    activo = e.target.checked;
    log("info", "telemetría " + (activo ? "activada" : "apagada"));
  };
  panel.addEventListener("click", e => {
    const a = e.target.dataset?.a;
    if (!a) return;
    if (a === "cerrar") panel.hidden = true;
    if (a === "enviar") {
      cola.push({
        t: seg(),
        tipo: "manual",
        msg: "envío manual",
        x: estado()
      });
      enviar();
    }
    if (a === "copiar") navigator.clipboard?.writeText(logs.map(l => `[${l.t}] ${l.tipo} ${l.msg}${l.x ? " " + JSON.stringify(l.x) : ""}`).join("\n"));
    if (a === "limpiar") {
      logs.length = 0;
      pintarLog();
    }
  });
  setInterval(() => {
    if (!panel.hidden) pintarEstado();
  }, 250);
}

function pintarEstado() {
  const e = estado();
  const p = e.pos ? `${e.pos.x.toFixed(2)}, ${e.pos.y.toFixed(2)}, ${e.pos.z.toFixed(2)}` : "—";
  cajaEst.textContent = `FPS ${Math.round(fr.ema)} · peor cuadro ${Math.round(fr.peor)} ms · tirones ${fr.tirones} · trabones ${fr.trabones}\nmemoria ${e.mem ?? "?"} MB · dibujado ${e.draw ?? "?"} llamadas, ${e.tris ?? "?"} triángulos · ${e.geos ?? "?"} geometrías, ${e.texs ?? "?"} texturas\nmodo ${e.modo ?? "?"} · escenario ${e.esc ?? "?"} (${e.nivelT ?? 0} s) · pos ${p}\njuego: alerta ${e.alerta ?? "-"} · vida ${e.vida ?? "-"} · guardias ${e.guardias ?? "-"} · audio ${e.audio ?? "-"} · VR ${e.xr ? "sí" : "no"}\nenvío: ${activo ? ultimoEnvio : "apagado"} · cola ${cola.length}`;
}

function pintarLog() {
  if (!cajaLog) return;
  const esc = s => s.replace(/[&<]/g, c => c === "&" ? "&amp;" : "&lt;");
  cajaLog.innerHTML = logs.slice(-120).reverse().map(l => `<span class="${l.tipo === "error" ? "e" : l.tipo === "aviso" ? "w" : l.tipo === "trabon" || l.tipo === "congelado" ? "t" : ""}">[${l.t}] ${l.tipo} ${esc(l.msg)}</span>`).join("\n");
}

export function alternar() {
  if (!panel) crearPanel();
  panel.hidden = !panel.hidden;
  if (!panel.hidden) {
    pintarEstado();
    pintarLog();
  }
}

export function iniciar(opc) {
  R = opc.renderer;
  estadoFn = opc.estado || estadoFn;
  tele.iniciar({
    renderer: R,
    estado: () => estado()
  });
  log("info", "inicio", dispositivo());
  cola.push({
    t: seg(),
    tipo: "inicio",
    msg: "sesión nueva",
    x: dispositivo()
  });
  enviar();
  addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyD") {
      e.preventDefault();
      alternar();
    }
  });
  let toques = [];
  addEventListener("pointerdown", e => {
    if (e.clientX > 90 || e.clientY > 90) return;
    const ahora = performance.now();
    toques = toques.filter(t => ahora - t < 1500);
    toques.push(ahora);
    if (toques.length >= 5) {
      toques = [];
      alternar();
    }
  }, {
    capture: true
  });
  if (new URLSearchParams(location.search).has("debug")) alternar();
  R.domElement.addEventListener("webglcontextlost", () => log("error", "se perdió el contexto WebGL (memoria de video)", estado()));
  R.domElement.addEventListener("webglcontextrestored", () => log("aviso", "contexto WebGL recuperado"));
}
