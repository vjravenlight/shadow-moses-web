// MGS web — FeniXVOID · Project Ravenlight
const PERIODO = 5e3, MAX_COLA = 600, MAX_POR_TIPO = 60;

const pareceLocal = (() => {
  try {
    if (location.protocol !== "http:" && location.protocol !== "https:") return false;
    const h = location.hostname;
    return !!location.port || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(h);
  } catch {
    return false;
  }
})();

export const sid = Math.random().toString(36).slice(2, 10);

const t0 = performance.now();

const seg = () => +((performance.now() - t0) / 1e3).toFixed(1);

const r2 = v => typeof v === "number" && isFinite(v) ? +v.toFixed(2) : v;

const posDe = p => p && typeof p.x === "number" ? [ r2(p.x), r2(p.y), r2(p.z) ] : undefined;

let estado = pareceLocal ? "preguntando" : "apagada";

const cola = [];

let porTipo = new Map, omitidos = new Map;

const vecesErr = new Map, repErr = new Map;

let R = null, estadoFn = () => ({});

export const prendida = () => estado === "prendida";

export const local = pareceLocal;

function poner(e) {
  if (estado === "apagada") return;
  const n = (porTipo.get(e.tipo) || 0) + 1;
  porTipo.set(e.tipo, n);
  if (n > MAX_POR_TIPO && e.tipo !== "error") {
    omitidos.set(e.tipo, (omitidos.get(e.tipo) || 0) + 1);
    return;
  }
  cola.push({
    t: seg(),
    ...e
  });
  if (cola.length > MAX_COLA) cola.splice(0, cola.length - MAX_COLA);
}

export function evento(tipo, msg, x) {
  if (estado === "apagada") return;
  msg = String(msg ?? "").slice(0, 400);
  if (tipo === "error" || tipo === "aviso") {
    const k = tipo + "|" + msg, v = (vecesErr.get(k) || 0) + 1;
    vecesErr.set(k, v);
    if (v > 5) {
      repErr.set(k, (repErr.get(k) || 0) + 1);
      return;
    }
    const e = {
      tipo: tipo,
      msg: msg
    };
    if (typeof x === "string") e.pila = x.slice(0, 900); else if (x !== undefined) e.x = recortar(x);
    e.esc = escActual();
    poner(e);
    if (tipo === "error") {
      ultimoError = {
        t: seg(),
        msg: msg
      };
      if (!yaMarcado.has("err|" + msg) && erroresMarcados < 5) {
        yaMarcado.add("err|" + msg);
        erroresMarcados++;
        setTimeout(() => marcar("error", {
          error: msg.slice(0, 200)
        }), 0);
      }
    }
    return;
  }
  const e = {
    tipo: tipo,
    msg: msg
  };
  if (x !== undefined) e.x = recortar(x);
  poner(e);
  try {
    mirarLog(tipo, msg);
  } catch {}
}

function recortar(x) {
  try {
    const s = JSON.stringify(x);
    return s.length > 1500 ? s.slice(0, 1500) : JSON.parse(s);
  } catch {
    return String(x).slice(0, 300);
  }
}

let ultimoError = null, erroresMarcados = 0;

async function enviar(final = false) {
  if (estado !== "prendida") return;
  for (const [k, n] of repErr) {
    const [tipo, msg] = [ k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1) ];
    cola.push({
      t: seg(),
      tipo: tipo,
      msg: msg,
      n: n,
      repetido: true
    });
  }
  repErr.clear();
  if (omitidos.size) {
    cola.push({
      t: seg(),
      tipo: "omitidos",
      por: Object.fromEntries(omitidos)
    });
    omitidos.clear();
  }
  porTipo = new Map;
  if (!cola.length) return;
  const lote = cola.splice(0, cola.length);
  const cuerpo = JSON.stringify({
    sid: sid,
    tl: seg(),
    ev: lote
  });
  try {
    if (final && navigator.sendBeacon) {
      navigator.sendBeacon("/__tele", new Blob([ cuerpo ], {
        type: "application/json"
      }));
      return;
    }
    await fetch("/__tele", {
      method: "POST",
      body: cuerpo,
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: cuerpo.length < 6e4
    });
  } catch {
    if (!final) cola.unshift(...lote.slice(-100));
  }
}

const V = {
  n: 0,
  suma: 0,
  peor: 0,
  lentos: 0,
  muyLentos: 0
};

let cuadroTrasOculta = false;

if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
  if (document.hidden) cuadroTrasOculta = true;
});

let hzXR = 0;

const pulsados = new Map, conteo = new Map, palancas = new Map, teclas = new Map;

let clics = 0, hayPadPC = false;

export function cuadro(dt) {
  if (estado !== "prendida" || !(dt > 0)) return;
  ultCuadro = performance.now();
  if (cuadroTrasOculta) {
    cuadroTrasOculta = false;
    leerMandos();
    return;
  }
  V.n++;
  V.suma += dt;
  const ms = dt * 1e3;
  if (ms > V.peor) V.peor = ms;
  const ideal = 1e3 / (hzXR || 60);
  if (ms > ideal * 1.5) V.lentos++;
  if (ms > 100) V.muyLentos++;
  leerMandos();
}

let ultCuadro = 0;

function leerMandos() {
  try {
    const s = R?.xr?.isPresenting ? R.xr.getSession() : null;
    if (s) {
      for (const src of s.inputSources) if (src.gamepad) leerPad(src.handedness === "left" ? "izq" : src.handedness === "right" ? "der" : "x", src.gamepad);
    } else if (hayPadPC) {
      for (const g of navigator.getGamepads?.() || []) if (g) leerPad("pad" + g.index, g);
    }
  } catch {}
}

function leerPad(lado, g) {
  const b = g.buttons;
  for (let i = 0; i < b.length; i++) {
    const k = lado + "." + i, ap = b[i].pressed;
    if (ap && !pulsados.get(k)) conteo.set(k, (conteo.get(k) || 0) + 1);
    pulsados.set(k, ap);
  }
  const a = g.axes;
  for (let i = 0; i < a.length; i++) {
    const v = Math.abs(a[i]);
    if (v > .2) {
      const k = lado + "." + i;
      if (v > (palancas.get(k) || 0)) palancas.set(k, v);
    }
  }
  if ((lado === "izq" || lado === "der") && pulsados.get("izq.3") && pulsados.get("der.3")) {
    if (!dosPalos) {
      dosPalos = true;
      marcar("Charles");
    }
  } else if (lado === "der") dosPalos = false;
}

let dosPalos = false;

const M = () => window.__mgs;

function escActual() {
  try {
    return M()?.guion?.st || estadoFn()?.esc;
  } catch {
    return undefined;
  }
}

const NOMBRES = {
  arma: null,
  item: null
};

const nombreArma = i => i < 0 ? "-" : NOMBRES.arma?.[i] || "arma" + i;

const nombreItem = i => i < 0 ? "-" : NOMBRES.item?.[i] || "item" + i;

const hex = n => typeof n === "number" ? "#" + (n & 65535).toString(16) : n;

const A_MODO = {
  1: "bala",
  2: "derribo/explosión",
  3: "golpe",
  4: "aturdidora",
  8: "sacudón"
};

let juegoVisto = null, ultimoDañoFuente = null, vistoPor = null, vidaAnt = null;

const daño = {
  total: 0,
  fuentes: {}
};

function envolverJuego(J) {
  if (!J || J.__tele) return;
  J.__tele = true;
  if (typeof J.dañoSnake === "function") {
    const orig = J.dañoSnake;
    J.dañoSnake = function(d, aMode = 1, ...resto) {
      const r = orig.call(this, d, aMode, ...resto);
      if (r) ultimoDañoFuente = {
        t: performance.now(),
        fuente: (A_MODO[aMode] || "a_mode " + aMode) + (jefeActivo() ? " (" + jefeActivo() + ")" : "")
      };
      return r;
    };
  }
  if (typeof J.ponerMarca === "function") {
    const orig = J.ponerMarca;
    J.ponerMarca = function(g, k) {
      if (k === 0 && g) {
        let d;
        try {
          d = r2(g.o.position.distanceTo(M().rig.position));
        } catch {}
        vistoPor = {
          t: performance.now(),
          quien: "guardia " + (g.num ?? "?") + (g.o?.userData?.actor?.nombre != null ? " " + hex(g.o.userData.actor.nombre) : ""),
          dist: d
        };
      }
      return orig.call(this, g, k);
    };
  }
  if (typeof J.ponerModo === "function") {
    const orig = J.ponerModo;
    J.ponerModo = function(m) {
      if (m === 1 && this.com?.modo === 0 && !(vistoPor && performance.now() - vistoPor.t < 3e3)) {
        let quien = "otro";
        try {
          const l = (new Error).stack.split("\n").slice(2).map(x => x.trim()).filter(x => !/telemetria\.js/.test(x));
          quien = (l[0] || "").replace(/^at /, "").replace(/\(?https?:\/\/[^/]+\//, "(").slice(0, 120);
        } catch {}
        vistoPor = {
          t: performance.now(),
          quien: quien
        };
      }
      return orig.call(this, m);
    };
  }
}

function jefeActivo() {
  try {
    const l = M()?.juego?.__jefes?.lista;
    const j = l && l.find(x => x.vivo !== false && x.listo !== false);
    return j ? j.actor?.tipo : null;
  } catch {
    return null;
  }
}

let invVisto = null;

const puertas = new Map;

function envolverInventario(inv) {
  if (!inv || inv.__tele || typeof inv.puedeAbrir !== "function") return;
  inv.__tele = true;
  const orig = inv.puedeAbrir;
  inv.puedeAbrir = function(p, esSnake = true) {
    const r = orig.call(this, p, esSnake);
    if (esSnake && r && !r.abre) {
      try {
        const id = typeof p === "object" ? p?.nombre ?? p?.id : p, k = escActual() + ":" + id, ahora = performance.now();
        let q = puertas.get(k);
        if (!q || ahora - q.ult > 3e3) {
          q = {
            ini: ahora,
            ult: ahora,
            avisada: false
          };
          puertas.set(k, q);
        }
        q.ult = ahora;
        if (!q.avisada && ahora - q.ini > 1500) {
          q.avisada = true;
          const pd = typeof p === "object" ? p : this.puertas?.get(p);
          poner({
            tipo: "puerta",
            esc: escActual(),
            puerta: hex(id),
            nivel: pd?.nivel ?? null,
            evento: !!r.evento,
            tarjeta: this.tarjeta,
            item: nombreItem(this.item),
            pos: posDe(M()?.rig?.position)
          });
        }
      } catch {}
    }
    return r;
  };
}

let invAnt = null;

const items = {
  equipa: [],
  recoge: {},
  usa: {}
};

function mirarInventario(inv, quieto) {
  const ahora = {
    arma: inv.arma,
    item: inv.item,
    armas: inv.armas.slice(),
    items: inv.items.slice()
  };
  const a = invAnt;
  invAnt = ahora;
  if (!a || quieto) return;
  let n = 0;
  for (let i = 0; i < ahora.armas.length; i++) if (ahora.armas[i] !== a.armas[i]) n++;
  for (let i = 0; i < ahora.items.length; i++) if (ahora.items[i] !== a.items[i]) n++;
  if (n > 3) return;
  if (a.arma !== ahora.arma) {
    items.equipa.push("arma " + nombreArma(ahora.arma));
    if (ahora.arma >= 0) marcarUnaVez("arma|" + ahora.arma, "cambio de arma", 1500);
  }
  if (a.item !== ahora.item) items.equipa.push("item " + nombreItem(ahora.item));
  const dif = (ant, nue, nombre, esArma) => {
    for (let i = 0; i < nue.length; i++) {
      const x = ant[i] ?? -1, y = nue[i] ?? -1;
      if (x === y) continue;
      const n = nombre(i);
      if (x < 0 && y >= 0) items.recoge[n] = (items.recoge[n] || 0) + Math.max(1, y); else if (y > x) items.recoge[n] = (items.recoge[n] || 0) + (y - x); else if (y >= 0 || x > 0) items.usa[n] = (items.usa[n] || 0) + (x - Math.max(0, y));
    }
  };
  dif(a.armas, ahora.armas, nombreArma, true);
  dif(a.items, ahora.items, nombreItem, false);
}

const procsFaltan = new Set;

let sinSopAnt = new Map;

function envolverGuion(g) {
  if (!g || g.__tele || typeof g.proc !== "function") return;
  g.__tele = true;
  const orig = g.proc;
  g.proc = function(pid, args, ctx) {
    try {
      if (this.script?.procs && !this.script.procs[(pid & 65535).toString(16).padStart(4, "0")]) {
        const k = this.st + ":" + hex(pid);
        if (!procsFaltan.has(k)) {
          procsFaltan.add(k);
          poner({
            tipo: "guion",
            falla: "proc inexistente",
            esc: this.st,
            proc: hex(pid),
            desde: String(ctx || "")
          });
        }
      }
    } catch {}
    return orig.call(this, pid, args, ctx);
  };
}

function mirarSinSoporte(g) {
  const m = g?.sinSoporte;
  if (!(m instanceof Map)) return;
  for (const [k, n] of m) {
    const a = sinSopAnt.get(k) || 0;
    if (n > a && a === 0) poner({
      tipo: "guion",
      falla: "sin soporte",
      esc: g.st,
      que: k
    });
  }
  sinSopAnt = new Map(m);
}

let ultimoLogJuego = "", muerteT = -1e9, enMuerte = false;

function muerte(origen) {
  if (enMuerte) return;
  enMuerte = true;
  const ahora = performance.now();
  muerteT = ahora;
  let causa = "sin daño reciente (guion)";
  if (/acero fundido/.test(ultimoLogJuego)) causa = "acero fundido"; else if (ultimoDañoFuente && ahora - ultimoDañoFuente.t < 5e3) causa = ultimoDañoFuente.fuente; else if (daño.ultFuente && ahora - daño.ultT < 5e3) causa = daño.ultFuente;
  poner({
    tipo: "muerte",
    esc: escActual(),
    causa: causa,
    origen: origen,
    pos: posDe(M()?.rig?.position),
    alerta: M()?.juego?.modo,
    jefe: jefeActivo() || undefined,
    vr: !!R?.xr?.isPresenting
  });
}

function mirarLog(tipo, msg) {
  if (tipo === "juego") {
    ultimoLogJuego = msg;
    if (/Snake muere|acero fundido/.test(msg)) muerte("juego");
    if (msg === "GAME OVER") poner({
      tipo: "gameover",
      esc: escActual()
    });
  }
  if (tipo === "carga") {
    let m = /^escenario (\w+)(?: \(desde (\w+)\))?/.exec(msg);
    if (m) {
      cargaIni = {
        esc: m[1],
        desde: m[2],
        t: performance.now()
      };
      return;
    }
    m = /^(\w+) listo en ([\d.]+) s/.exec(msg);
    if (m) {
      let prog, dif;
      try {
        prog = M()?.guion?.vars?.get("$w:G000a");
        dif = M()?.inventario?.dificultad;
      } catch {}
      const desde = cargaIni?.esc === m[1] ? cargaIni.desde : undefined;
      poner({
        tipo: "escenario",
        esc: m[1],
        desde: desde,
        s: +m[2],
        progreso: prog,
        dificultad: dif,
        vr: !!R?.xr?.isPresenting
      });
      if (desde && progresoAnt != null && prog != null && prog !== progresoAnt) poner({
        tipo: "rareza",
        que: "el progreso cambió al cargar",
        esc: m[1],
        desde: desde,
        de: progresoAnt,
        a: prog,
        modo: estadoFn()?.modo
      });
      marcarUnaVez("esc|" + m[1] + "|" + prog, "escenario cargado", 3e3);
      vigilar();
      progresoAnt = prog;
    }
  }
}

let cargaIni = null, progresoAnt;

let tick = 0, alerta = null, cine = null, codecA = null, vrmA = null, trabaA = null, opcionesAnt = null;

const jefes = new Map;

function sondear() {
  if (performance.now() - ultCuadro > 200) leerMandos();
  const m = M();
  if (!m) return;
  tick++;
  const J = m.juego, inv = m.inventario, esc = escActual();
  if (J !== juegoVisto) {
    juegoVisto = J;
    envolverJuego(J);
    vidaAnt = null;
    invAnt = null;
    enMuerte = false;
    cerrarAlerta("cambio de escenario");
  }
  if (inv !== invVisto) {
    invVisto = inv;
    envolverInventario(inv);
  }
  envolverGuion(m.guion);
  try {
    if (J && inv) {
      const v = inv.getVida();
      if (vidaAnt != null && v < vidaAnt - .01) {
        const d = vidaAnt - v, ahora = performance.now();
        let f = ultimoDañoFuente && ahora - ultimoDañoFuente.t < 600 ? ultimoDañoFuente.fuente : jefeActivo() ? "jefe " + jefeActivo() : inv.item === 0 ? "cigarrillos" : J.o2 != null && J.o2 < 1024 || J.o2s?.some?.(a => a.dañoOn) ? "gas/oxígeno" : "otro";
        daño.total += d;
        daño.fuentes[f] = (daño.fuentes[f] || 0) + d;
        daño.vida = v;
        daño.max = inv.vidaMax;
        daño.ultFuente = f;
        daño.ultT = ahora;
      }
      vidaAnt = v;
      if (J.muerto && v <= 0) muerte("vida"); else if (!J.muerto && v > 0 && enMuerte && performance.now() - muerteT > 2e3) enMuerte = false;
    }
  } catch {}
  try {
    const modo = J?.modo ?? 0;
    if (modo !== 0 && !alerta) alerta = {
      ini: performance.now(),
      esc: esc,
      quien: vistoPor && performance.now() - vistoPor.t < 4e3 ? vistoPor.quien : "?",
      dist: vistoPor?.dist,
      pos: posDe(m.rig?.position),
      evIni: null,
      vr: !!R?.xr?.isPresenting
    };
    if (alerta) {
      if (modo === 2 && !alerta.evIni) alerta.evIni = performance.now();
      if (modo === 1 && alerta.evIni) {
        alerta.vueltas = (alerta.vueltas || 0) + 1;
        alerta.evAcum = (alerta.evAcum || 0) + performance.now() - alerta.evIni;
        alerta.evIni = null;
      }
      if (modo === 0) cerrarAlerta("terminó");
    }
  } catch {}
  try {
    const d = m.demo, rep = d?.estado === "reproduciendo";
    if (rep && !cine) {
      cine = {
        id: d.sector,
        ini: performance.now()
      };
      poner({
        tipo: "cine",
        fase: "inicio",
        id: d.sector,
        esc: esc,
        vr: !!R?.xr?.isPresenting
      });
      marcarUnaVez("cine|" + d.sector, "cinemática", 3e3);
      vigilar();
    } else if (!rep && cine) {
      vigilar();
      poner({
        tipo: "cine",
        fase: "fin",
        id: cine.id,
        dur: r2((performance.now() - cine.ini) / 1e3)
      });
      cine = null;
    }
    const c = m.codec, ab = !!c?.abierto;
    if (ab && !codecA) {
      codecA = {
        ini: performance.now(),
        freq: c.freq
      };
      poner({
        tipo: "codec",
        fase: "inicio",
        freq: c.freq,
        esc: esc
      });
      marcarUnaVez("codec|" + esc + "|" + c.freq + "|" + (m.guion?.vars?.get("$w:G000a") ?? ""), "códec", 2500);
      vigilar();
    } else if (!ab && codecA) {
      vigilar();
      poner({
        tipo: "codec",
        fase: "fin",
        freq: codecA.freq,
        dur: r2((performance.now() - codecA.ini) / 1e3)
      });
      codecA = null;
    }
  } catch {}
  try {
    const v = m.vr, e = v?.estado;
    if (v && e !== vrmA?.estado) {
      const ant = vrmA?.estado;
      const base = {
        tipo: "vrm",
        mision: v.mision ?? undefined,
        st: v.st,
        modo: v.modo
      };
      if (e === "juego" && ant !== "pausa") poner({
        ...base,
        fase: "inicio"
      }); else if (e === "clear") poner({
        ...base,
        fase: "clear",
        tiempo_s: r2((v.tiempo || 0) / 30),
        resultado: v.resultado ? {
          puesto: v.resultado.puesto,
          final: v.resultado.final
        } : undefined
      }); else if (e === "derrota") poner({
        ...base,
        fase: "derrota",
        causa: v.causa,
        tiempo_s: r2((v.tiempo || 0) / 30)
      }); else if (e === "fin") poner({
        ...base,
        fase: "fin",
        causa: v.causaFoto
      }); else if ((e === "menu" || e === "off") && (ant === "juego" || ant === "pausa")) poner({
        ...base,
        fase: "abandona",
        tiempo_s: r2((v.tiempo || 0) / 30)
      });
      vrmA = {
        estado: e
      };
    }
  } catch {}
  if (tick % 2 === 0) {
    try {
      if (inv) mirarInventario(inv, !!m.trabas?.carga || m.vr?.estado === "cargando");
    } catch {}
  }
  if (tick % 4 === 0) {
    mirarJefes(m);
    mirarTrabas(m);
    mirarProgreso(m);
  }
  if (tick % 20 === 0) {
    mirarOpciones();
    try {
      mirarSinSoporte(m.guion);
    } catch {}
  }
}

function cerrarAlerta(fin) {
  if (!alerta) return;
  const ahora = performance.now(), ev = (alerta.evAcum || 0) + (alerta.evIni ? ahora - alerta.evIni : 0);
  poner({
    tipo: "alerta",
    esc: alerta.esc,
    quien: alerta.quien,
    dist: alerta.dist,
    pos: alerta.pos,
    total_s: r2((ahora - alerta.ini) / 1e3),
    evasion_s: r2(ev / 1e3),
    vueltas: alerta.vueltas,
    fin: fin,
    vr: alerta.vr
  });
  alerta = null;
}

function mirarJefes(m) {
  try {
    const lista = m.juego?.__jefes?.lista || [], vistos = new Set, ahora = performance.now();
    for (const j of lista) {
      if (!j?.actor) continue;
      vistos.add(j);
      const barras = (j.barras || []).map(b => ({
        n: b.conf?.nombre,
        v: b.now,
        max: b.max
      }));
      let s = jefes.get(j);
      const fase = [ "fase", "estado", "etapa" ].map(k => j[k]).find(x => typeof x === "string" || typeof x === "number");
      if (!s) {
        s = {
          ini: ahora,
          fase: fase,
          cambios: 0,
          tUlt: 0,
          esc: escActual()
        };
        jefes.set(j, s);
        poner({
          tipo: "jefe",
          fase: "inicio",
          jefe: j.actor.tipo,
          esc: s.esc,
          barras: barras
        });
        continue;
      }
      if (fase !== s.fase && s.cambios < 40 && ahora - s.tUlt > 2e3) {
        s.cambios++;
        s.tUlt = ahora;
        poner({
          tipo: "jefe",
          fase: "cambio",
          jefe: j.actor.tipo,
          de: s.fase,
          a: fase,
          s: r2((ahora - s.ini) / 1e3),
          barras: barras
        });
      }
      if (fase !== s.fase) s.fase = fase;
      s.barras = barras;
      if (j.vivo === false && !s.fin) {
        s.fin = true;
        poner({
          tipo: "jefe",
          fase: "fin",
          jefe: j.actor.tipo,
          motivo: "vencido",
          dur: r2((ahora - s.ini) / 1e3),
          esc: s.esc
        });
      }
    }
    for (const [j, s] of jefes) if (!vistos.has(j)) {
      if (!s.fin) poner({
        tipo: "jefe",
        fase: "fin",
        jefe: j.actor.tipo,
        motivo: m.juego?.__jefes?.ganado ? "vencido" : muerteT > s.ini ? "Snake murió" : "salió del escenario",
        dur: r2((ahora - s.ini) / 1e3),
        esc: s.esc,
        barras: s.barras
      });
      jefes.delete(j);
    }
  } catch {}
}

const NO_TRABA = new Set([ "pared", "choque", "agachado", "reptando", "enSuelo", "vuelo", "pausa", "esperaSalida" ]);

function trabasActivas(m) {
  const T = m.trabas;
  if (!T) return [];
  return Object.keys(T).filter(k => T[k] && !NO_TRABA.has(k));
}

function mirarTrabas(m) {
  try {
    const libre = !m.titulo?.visible && !m.codec?.abierto && m.demo?.estado !== "reproduciendo" && !!m.juego && !m.juego.muerto && !enMuerte && !m.trabas?.pausa;
    const act = libre ? trabasActivas(m) : [], k = act.join(",");
    const ahora = performance.now();
    if (!k) {
      trabaA = null;
      return;
    }
    if (!trabaA || trabaA.k !== k) {
      trabaA = {
        k: k,
        ini: ahora,
        avisada: false
      };
      return;
    }
    if (!trabaA.avisada && ahora - trabaA.ini > 8e3) {
      trabaA.avisada = true;
      poner({
        tipo: "traba",
        esc: escActual(),
        motivos: act,
        s: r2((ahora - trabaA.ini) / 1e3),
        pos: posDe(m.rig?.position),
        vr: !!R?.xr?.isPresenting,
        ultimoError: ultimoError?.msg
      });
      ultMarcaAuto = -1e9;
      marcar("traba", {
        motivos: act
      });
    }
  } catch {}
}

function mirarProgreso(m) {
  try {
    const p = m.guion?.vars?.get("$w:G000a");
    if (progresoAnt !== undefined && p !== progresoAnt && p != null) poner({
      tipo: "progreso",
      esc: escActual(),
      de: progresoAnt,
      a: p
    });
    if (p != null) progresoAnt = p;
  } catch {}
}

function mirarOpciones() {
  const o = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/^sm_/.test(k) || /^sm_go_/.test(k)) continue;
      const v = localStorage.getItem(k);
      if (v != null && v.length <= 80) o[k] = v;
    }
  } catch {
    return;
  }
  if (!opcionesAnt) {
    opcionesAnt = o;
    poner({
      tipo: "opcion",
      todas: o
    });
    return;
  }
  for (const k of new Set([ ...Object.keys(o), ...Object.keys(opcionesAnt) ])) if (o[k] !== opcionesAnt[k]) poner({
    tipo: "opcion",
    k: k,
    v: o[k] ?? null,
    antes: opcionesAnt[k] ?? null
  });
  opcionesAnt = o;
}

function cadaPeriodo() {
  if (estado !== "prendida") return;
  try {
    const m = M(), e = (() => {
      try {
        return estadoFn() || {};
      } catch {
        return {};
      }
    })();
    if (V.n) {
      const f = {
        tipo: "fps",
        fps: r2(V.n / V.suma),
        peor: Math.round(V.peor),
        lentos: V.lentos,
        muyLentos: V.muyLentos,
        cuadros: V.n,
        esc: escActual(),
        modo: e.modo,
        xr: !!R?.xr?.isPresenting,
        hz: hzXR || undefined
      };
      try {
        if (performance.memory) f.mem = Math.round(performance.memory.usedJSHeapSize / 1048576);
      } catch {}
      try {
        const i = R?.info;
        if (i) {
          f.geos = i.memory.geometries;
          f.texs = i.memory.textures;
        }
      } catch {}
      try {
        const t = m ? trabasActivas(m) : [];
        if (t.length) f.trabas = t;
      } catch {}
      try {
        if (m?.titulo?.visible) f.titulo = true;
        if (m?.demo?.estado === "reproduciendo") f.cine = m.demo.sector;
        if (m?.codec?.abierto) f.codec = true;
      } catch {}
      if (f.xr) try {
        const o = m?.ojosVR?.();
        if (o) Object.assign(f, {
          ojos: r2(o.ojos),
          camY: r2(o.camY),
          vista: r2(o.vista),
          sentado: !!o.sentado,
          alturaReal: r2(o.alturaReal),
          postura: o.ducto ? "ducto" : o.reptando ? "cuerpo a tierra" : o.agachado ? "agachado" : "parado"
        });
      } catch {} else try {
        const T = m?.trabas;
        if (T) f.postura = T.reptando ? "cuerpo a tierra" : T.agachado ? "agachado" : "parado";
      } catch {}
      poner(f);
    }
    V.n = 0;
    V.suma = 0;
    V.peor = 0;
    V.lentos = 0;
    V.muyLentos = 0;
    if (conteo.size || palancas.size || teclas.size || clics) {
      poner({
        tipo: "mandos",
        xr: !!R?.xr?.isPresenting,
        botones: Object.fromEntries(conteo),
        palancas: Object.fromEntries([ ...palancas ].map(([k, v]) => [ k, r2(v) ])),
        teclas: Object.fromEntries(teclas),
        clics: clics || undefined
      });
      conteo.clear();
      palancas.clear();
      teclas.clear();
      clics = 0;
    }
    if (daño.total > 0) {
      poner({
        tipo: "daño",
        esc: escActual(),
        total: r2(daño.total),
        fuentes: Object.fromEntries(Object.entries(daño.fuentes).map(([k, v]) => [ k, r2(v) ])),
        vida: r2(daño.vida),
        max: daño.max
      });
      daño.total = 0;
      daño.fuentes = {};
    }
    if (items.equipa.length || Object.keys(items.recoge).length || Object.keys(items.usa).length) {
      poner({
        tipo: "items",
        esc: escActual(),
        equipa: items.equipa.slice(0, 20),
        recoge: items.recoge,
        usa: items.usa
      });
      items.equipa = [];
      items.recoge = {};
      items.usa = {};
    }
  } catch {}
  enviar();
}

let THREE_ = null, reproduciendo = false, idPC = 0, claveAnt = null, pasadas = [], pasadasAnt = [];

const MAX_AUTO = 80;

let marcasAuto = 0, ultMarcaAuto = -1e9, ultManual = -1e9, nMarca = 0;

const yaMarcado = new Set;

function envolverRender() {
  if (R.__tele) return;
  R.__tele = true;
  const orig = R.render;
  const tic = () => {
    idPC++;
    requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
  R.render = function(escena, camara) {
    if (!reproduciendo) {
      try {
        const pres = !!this.xr?.isPresenting, k = pres ? this.xr.getFrame?.() || "xr" : idPC;
        if (k !== claveAnt || pasadas.length >= 12) {
          claveAnt = k;
          if (pasadas.length) pasadasAnt = pasadas;
          pasadas = [];
        }
        const rt = this.getRenderTarget();
        if ((rt === null || rt.isXRRenderTarget) && (!pres || this.xr.enabled)) pasadas.push({
          escena: escena,
          camara: camara,
          auto: this.autoClear,
          xr: pres
        });
      } catch {}
    }
    return orig.call(this, escena, camara);
  };
}

function dibujarVista(ancho) {
  const T = THREE_, lista = pasadasAnt.length ? pasadasAnt : pasadas;
  if (!T || !R || !lista.length) return null;
  const pres = !!R.xr?.isPresenting;
  let ojo = null, asp;
  if (pres) {
    const ac = R.xr.getCamera(), c0 = ac?.cameras?.[0] || ac;
    if (!c0) return null;
    ojo = c0.clone();
    ojo.matrixAutoUpdate = true;
    ojo.matrixWorldAutoUpdate = true;
    c0.matrixWorld.decompose(ojo.position, ojo.quaternion, ojo.scale);
    ojo.projectionMatrix.copy(c0.projectionMatrix);
    ojo.projectionMatrixInverse.copy(c0.projectionMatrixInverse);
    const vp = c0.viewport;
    asp = vp && vp.w > 0 ? vp.z / vp.w : 1;
  } else {
    const s = R.getDrawingBufferSize(new T.Vector2);
    asp = s.y > 0 ? s.x / s.y : 16 / 9;
  }
  const w = Math.max(16, Math.round(ancho)), h = Math.max(16, Math.round(w / asp));
  const rt = new T.WebGLRenderTarget(w, h, {
    depthBuffer: true
  });
  rt.isXRRenderTarget = true;
  rt.texture.colorSpace = R.outputColorSpace;
  rt.texture.internalFormat = "RGBA8";
  const antRT = R.getRenderTarget(), antXR = R.xr.enabled, antAuto = R.autoClear, px = new Uint8Array(w * h * 4);
  reproduciendo = true;
  try {
    R.xr.enabled = false;
    R.setRenderTarget(rt);
    R.clear();
    for (const p of lista) {
      R.autoClear = p.auto;
      R.render(p.escena, pres && p.xr ? ojo : p.camara);
    }
    R.readRenderTargetPixels(rt, 0, 0, w, h, px);
  } catch {
    return null;
  } finally {
    R.autoClear = antAuto;
    R.xr.enabled = antXR;
    R.setRenderTarget(antRT);
    reproduciendo = false;
    rt.dispose();
  }
  const fila = w * 4, out = new Uint8ClampedArray(px.length);
  let suma = 0, max = 0;
  for (let y = 0; y < h; y++) {
    out.set(px.subarray((h - 1 - y) * fila, (h - y) * fila), y * fila);
    for (let i = y * fila; i < (y + 1) * fila; i += 4) {
      const l = out[i] * 54 + out[i + 1] * 183 + out[i + 2] * 19 >> 8;
      suma += l;
      if (l > max) max = l;
      out[i + 3] = 255;
    }
  }
  return {
    w: w,
    h: h,
    px: out,
    luz: r2(suma / (w * h)),
    max: max
  };
}

function aJpeg(v, calidad = .72) {
  try {
    const c = document.createElement("canvas");
    c.width = v.w;
    c.height = v.h;
    c.getContext("2d").putImageData(new ImageData(v.px, v.w, v.h), 0, 0);
    return c.toDataURL("image/jpeg", calidad);
  } catch {
    return null;
  }
}

function estadoParaMarca() {
  const m = M(), e = {};
  if (!m) return e;
  const p = (k, f) => {
    try {
      const v = f();
      if (v !== undefined) e[k] = v;
    } catch {}
  };
  p("esc", () => escActual());
  p("modo", () => estadoFn()?.modo);
  p("progreso", () => m.guion?.vars?.get("$w:G000a"));
  p("xr", () => !!R?.xr?.isPresenting);
  p("titulo", () => !!m.titulo?.visible || undefined);
  p("cine", () => m.demo?.estado && ![ "parado", "vacia" ].includes(m.demo.estado) ? {
    estado: m.demo.estado,
    id: m.demo.sector
  } : undefined);
  p("codec", () => m.codec?.abierto ? {
    freq: m.codec.freq
  } : undefined);
  p("trabas", () => {
    const T = m.trabas;
    return T ? Object.keys(T).filter(k => T[k]) : undefined;
  });
  p("arma", () => nombreArma(m.inventario?.arma));
  p("item", () => nombreItem(m.inventario?.item));
  p("vida", () => m.inventario?.getVida?.());
  p("alerta", () => m.juego?.modo || undefined);
  p("muerto", () => !!m.juego?.muerto || undefined);
  p("pos", () => posDe(m.rig?.position));
  p("vrm", () => m.vr?.estado && m.vr.estado !== "off" ? m.vr.estado : undefined);
  p("ojos", () => {
    if (!R?.xr?.isPresenting) return undefined;
    const o = m.ojosVR?.();
    return o ? {
      ojos: r2(o.ojos),
      camY: r2(o.camY),
      vista: r2(o.vista),
      sentado: !!o.sentado
    } : undefined;
  });
  p("pasadas", () => (pasadasAnt.length ? pasadasAnt : pasadas).map(x => (x.escena?.name || x.escena?.type || "?") + (x.auto ? "" : "+")));
  p("ultimoError", () => ultimoError?.msg);
  return e;
}

function marcar(motivo, extra) {
  if (estado !== "prendida" || !R) return;
  const ahora = performance.now(), manual = motivo === "Charles";
  if (!manual && autoApagada) return;
  if (manual) {
    if (ahora - ultManual < 2e3) return;
    ultManual = ahora;
  } else {
    if (marcasAuto >= MAX_AUTO || ahora - ultMarcaAuto < 15e3) return;
    marcasAuto++;
    ultMarcaAuto = ahora;
  }
  const t0 = performance.now(), v = dibujarVista(manual ? 960 : 640), foto = v ? aJpeg(v) : null;
  medirCosto(performance.now() - t0, "marca");
  const ev = {
    t: seg(),
    tipo: "marca",
    motivo: motivo,
    n: ++nMarca,
    ...estadoParaMarca(),
    luz: v?.luz,
    luzMax: v?.max,
    sinFoto: v ? undefined : true,
    ...extra || {}
  };
  const cuerpo = JSON.stringify({
    sid: sid,
    tl: seg(),
    ev: [ ev ],
    foto: foto || undefined
  });
  fetch("/__tele", {
    method: "POST",
    body: cuerpo,
    headers: {
      "Content-Type": "application/json"
    }
  }).catch(() => {});
  if (manual) avisarMarca();
}

function avisarMarca() {
  try {
    const s = R?.xr?.isPresenting ? R.xr.getSession() : null;
    if (s) {
      for (const src of s.inputSources) {
        const h = src.gamepad?.hapticActuators?.[0];
        if (h?.pulse) h.pulse(.9, 120); else src.gamepad?.vibrationActuator?.playEffect?.("dual-rumble", {
          duration: 120,
          strongMagnitude: .9
        });
      }
      return;
    }
    const d = document.createElement("div");
    d.textContent = "MARCA GUARDADA";
    d.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;background:#0b2;color:#000;font:bold 14px monospace;padding:6px 12px;pointer-events:none";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  } catch {}
}

function marcarUnaVez(clave, motivo, demora, extra) {
  if (!R?.xr?.isPresenting || yaMarcado.has(clave)) return;
  yaMarcado.add(clave);
  setTimeout(() => {
    if (R?.xr?.isPresenting) marcar(motivo, extra);
  }, demora);
}

let oscuras = 0, ultOscura = -1e9, vigilarHasta = 0;

let autoApagada = false;

function medirCosto(ms, que) {
  if (ms > 120 && !autoApagada) {
    autoApagada = true;
    poner({
      tipo: "info",
      msg: `marcas automáticas apagadas: volver a dibujar (${que}) tardó ${Math.round(ms)} ms`,
      ms: Math.round(ms),
      pasadas: pasadasAnt.length || pasadas.length
    });
  }
}

const vigilar = () => {
  vigilarHasta = performance.now() + 2e4;
};

function mirarOscuridad(m) {
  if (autoApagada || !R?.xr?.isPresenting || !m || m.titulo?.visible || !m.juego || m.trabas?.misiones || m.vr?.estado && m.vr.estado !== "off") {
    oscuras = 0;
    return;
  }
  if (performance.now() > vigilarHasta && !trabasActivas(m).filter(k => k !== "misiones").length) {
    oscuras = 0;
    return;
  }
  const sinPasadas = !pasadasAnt.length && !pasadas.length;
  const t0 = performance.now(), v = sinPasadas ? null : dibujarVista(40);
  medirCosto(performance.now() - t0, "control de negro");
  const negra = sinPasadas || v && v.luz < 3;
  oscuras = negra ? oscuras + 1 : 0;
  if (oscuras >= 2 && performance.now() - ultOscura > 6e4) {
    ultOscura = performance.now();
    ultMarcaAuto = -1e9;
    marcar("pantalla negra", {
      sinPasadas: sinPasadas || undefined,
      muestras: oscuras
    });
  }
}

function alEmpezarXR() {
  const s = R.xr.getSession();
  const ini = performance.now();
  hzXR = s?.frameRate || 72;
  setTimeout(() => {
    let o = {};
    try {
      o = M()?.ojosVR?.() || {};
    } catch {}
    poner({
      tipo: "xr",
      fase: "inicio",
      sentado: !!o.sentado,
      alturaReal: r2(o.alturaReal),
      ojos: r2(o.ojos),
      hz: s?.frameRate,
      hzs: s?.supportedFrameRates ? [ ...s.supportedFrameRates ] : undefined,
      mezcla: s?.environmentBlendMode,
      mandos: s ? [ ...s.inputSources ].map(i => `${i.handedness}:${(i.profiles || [])[0] || "?"}`) : [],
      esc: escActual(),
      modo: estadoFn()?.modo
    });
  }, 2500);
  s?.addEventListener?.("frameratechange", () => {
    hzXR = s.frameRate || hzXR;
    poner({
      tipo: "xr",
      fase: "hz",
      hz: s.frameRate
    });
  });
  R.xr.addEventListener("sessionend", function fin() {
    R.xr.removeEventListener("sessionend", fin);
    poner({
      tipo: "xr",
      fase: "fin",
      dur: r2((performance.now() - ini) / 1e3),
      esc: escActual()
    });
    hzXR = 0;
    enviar();
  });
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
    gpu: gpu,
    pantalla: `${screen.width}x${screen.height}@${devicePixelRatio}`,
    ventana: `${innerWidth}x${innerHeight}`,
    tactil: matchMedia("(pointer: coarse)").matches,
    nucleos: navigator.hardwareConcurrency,
    ram: navigator.deviceMemory,
    casco: /OculusBrowser|Quest|Pico|Wolvic|VR/i.test(navigator.userAgent),
    ruta: location.pathname,
    https: location.protocol === "https:"
  };
}

export function iniciar(opc) {
  R = opc.renderer;
  if (opc.estado) estadoFn = opc.estado;
  if (estado === "apagada") return;
  if (estado === "prendida") arrancar();
}

let arrancado = false;

function arrancar() {
  if (arrancado || !R) return;
  arrancado = true;
  import("./inventario.js").then(m => {
    NOMBRES.arma = m.NOMBRE_ARMA;
    NOMBRES.item = m.NOMBRE_ITEM;
  }).catch(() => {});
  poner({
    tipo: "inicio",
    aparato: dispositivo()
  });
  import("three").then(T => {
    THREE_ = T;
  }).catch(() => {});
  try {
    envolverRender();
  } catch {}
  setInterval(() => {
    try {
      mirarOscuridad(M());
    } catch {}
  }, 3e3);
  R.xr?.addEventListener?.("sessionstart", vigilar);
  addEventListener("keydown", e => {
    if (e.code === "F8" && !e.repeat) {
      e.preventDefault();
      marcar("Charles");
    }
  }, {
    capture: true
  });
  navigator.xr?.isSessionSupported?.("immersive-vr").then(vr => poner({
    tipo: "xr",
    fase: "soporte",
    vr: vr
  }), () => {});
  R.xr?.addEventListener?.("sessionstart", alEmpezarXR);
  setInterval(sondear, 250);
  setInterval(cadaPeriodo, PERIODO);
  addEventListener("keydown", e => {
    if (!e.repeat && e.code) teclas.set(e.code, (teclas.get(e.code) || 0) + 1);
  }, {
    capture: true,
    passive: true
  });
  addEventListener("pointerdown", () => {
    clics++;
  }, {
    capture: true,
    passive: true
  });
  addEventListener("gamepadconnected", e => {
    hayPadPC = true;
    poner({
      tipo: "mandos",
      conectado: String(e.gamepad?.id || "").slice(0, 80)
    });
  });
  addEventListener("pagehide", () => {
    cerrarAlerta("salida de la página");
    poner({
      tipo: "fin",
      motivo: "pagehide"
    });
    enviar(true);
  });
  document.addEventListener("visibilitychange", () => {
    poner({
      tipo: "visible",
      v: !document.hidden
    });
    if (document.hidden) enviar(true);
  });
  enviar();
}

if (estado === "preguntando") {
  fetch("/__tele", {
    cache: "no-store"
  }).then(r => {
    if (r.status === 204 && r.headers.get("X-MGS-Tele") === "1") {
      estado = "prendida";
      arrancar();
    } else {
      estado = "apagada";
      cola.length = 0;
    }
  }).catch(() => {
    estado = "apagada";
    cola.length = 0;
  });
}

window.__tele = {
  estado: () => ({
    estado: estado,
    sid: sid,
    cola: cola.length,
    marcas: nMarca,
    pasadas: pasadasAnt.length
  }),
  enviar: () => enviar(),
  cadaPeriodo: cadaPeriodo,
  marcar: marcar,
  vista: (a = 64) => {
    const v = dibujarVista(a);
    return v && {
      w: v.w,
      h: v.h,
      luz: v.luz,
      max: v.max
    };
  }
};
