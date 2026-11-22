// MGS web — FeniXVOID · Project Ravenlight
const ACTIVO = !!(window.MGSApp || window.MGSCasco || window.MGSIphone);

const BASE = new URL("assets/", location.href).href;

const dormir = ms => new Promise(r => setTimeout(r, ms));

const mb = b => Math.max(1, Math.round((b || 0) / 1048576)) + " MB";

const est = {
  activo: false,
  info: null,
  cargadas: new Set,
  exactas: new Map,
  prefijos: [],
  disco2: new Set,
  anclas: new Set,
  sinPedir: new Set
};

const pedidos = new Map, rechazadas = new Set;

const fetchOriginal = window.fetch.bind(window);

async function leerJSON(rel) {
  const r = await fetchOriginal(BASE + rel, {
    cache: "no-store"
  });
  return r.ok ? r.json() : null;
}

async function leerCargadas() {
  const c = await leerJSON("_partes_cargadas.json").catch(() => null);
  if (c) est.cargadas = new Set((c.cargadas || []).map(x => x.parte));
  return c;
}

async function iniciar() {
  try {
    if (!await leerCargadas()) return false;
    const info = await leerJSON("partes.json").catch(() => null);
    if (!info?.partes || est.cargadas.has("entero")) return false;
    est.info = info;
    for (const [p, lista] of Object.entries(info.rutas || {})) for (const r of lista) {
      if (r.endsWith("/")) est.prefijos.push([ r, p ]); else est.exactas.set(r, p);
    }
    est.prefijos.sort((a, b) => b[0].length - a[0].length);
    est.disco2 = new Set(info.escenarios?.disco2 || []);
    est.anclas = new Set(info.en_disco1 || []);
    est.sinPedir = new Set(info.sin_pedir || []);
    est.activo = true;
    return true;
  } catch (e) {
    console.warn("[partes]", e);
    return false;
  }
}

const listo = ACTIVO ? iniciar() : Promise.resolve(false);

const esperarListo = () => Promise.race([ listo, dormir(4e3) ]);

function parteDe(rel) {
  const x = est.exactas.get(rel);
  if (x) return x;
  for (const [pre, p] of est.prefijos) if (rel.startsWith(pre)) return p;
  return null;
}

function falta(rel) {
  if (!est.activo || est.anclas.has(rel)) return null;
  const p = parteDe(rel);
  return p && est.info.partes[p] && !est.cargadas.has(p) ? p : null;
}

const ES = /^es/i.test(navigator.language || "");

function textos(p) {
  const i = est.info?.partes?.[p] || {}, archivo = i.archivo || `MGS_${p}.mgs`, tam = mb(i.bytes);
  const titulo = p === "disco2" ? "PLEASE INSERT DISC 2" : ES ? `FALTA: ${i.titulo?.es || p.toUpperCase()}` : `MISSING: ${i.titulo?.en || p.toUpperCase()}`;
  return {
    titulo: titulo,
    es: `Para seguir hace falta ${archivo} (${tam}). Elegilo: se guarda en este aparato y no se vuelve a pedir.`,
    en: `To continue you need ${archivo} (${tam}). Choose it: it is saved on this device and not asked again.`,
    sinModo: "Este aparato no puede guardar más archivos desde acá. / This device cannot save more files from here.",
    archivo: archivo
  };
}

const ERRORES = {
  otra: (n, a) => `Ese es ${n}; hace falta ${a}. / That is ${n}; ${a} is needed.`,
  formato: () => "Ese no es un archivo .mgs válido. / That is not a valid .mgs file.",
  abrir: () => "No se pudo abrir. Copialo a la memoria del aparato, no a la nube. / Could not open it. Copy it to the device storage, not the cloud.",
  espacio: n => `No hay espacio: hacen falta ${n} libres. / Not enough space: ${n} free needed.`,
  fallo: () => "No se pudo guardar. Probá de nuevo. / It could not be saved. Please try again."
};

let caja = null, esperaNativa = null;

function estilo() {
  if (document.getElementById("mgs-partes-css")) return;
  const s = document.createElement("style");
  s.id = "mgs-partes-css";
  s.textContent = "#mgs-partes{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.9);" + "padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));" + "color:#b4f4ac;font:16px/1.5 'MGS',Consolas,Menlo,monospace;text-transform:none;text-align:center}" + "#mgs-partes .caja{max-width:560px;width:100%;border:1px solid #5f8c6c;outline:1px solid #000;background:rgba(4,14,8,.92);padding:18px 16px}" + "#mgs-partes b{display:block;font:400 22px/1.2 'MGS8','MGS',Consolas,monospace;letter-spacing:2px;color:#e8ffe0;margin-bottom:10px}" + "#mgs-partes p,#mgs-partes button{font-family:Consolas,Menlo,monospace} #mgs-partes p{margin:8px 0} #mgs-partes .en{color:#7fb08c;font-size:14px} #mgs-partes .error{color:#ff8a80}" + "#mgs-partes button{display:block;width:100%;margin:10px 0 0;padding:14px;font:inherit;letter-spacing:1px;border:1px solid #5f8c6c;background:#5ef08a;color:#021006;cursor:pointer;text-transform:uppercase}" + "#mgs-partes button.chico{background:none;color:#7fb08c} #mgs-partes progress{width:100%;height:16px;accent-color:#5ef08a}" + "#mgs-partes input{position:absolute;opacity:0;width:1px;height:1px} #mgs-partes [hidden]{display:none!important}";
  document.head.appendChild(s);
}

function modoCarga() {
  if (window.MGSApp?.elegirParte) return "nativo";
  if (self.mgsGuardar && self.mgsParte && navigator.storage?.getDirectory) return "navegador";
  return null;
}

function ventana(p, ctx) {
  estilo();
  const t = textos(p), modo = modoCarga();
  try {
    const R = window.__mgs?.R;
    if (R?.xr?.isPresenting) R.xr.getSession()?.end();
  } catch {}
  const d = document.createElement("div");
  d.id = "mgs-partes";
  d.setAttribute("role", "dialog");
  d.setAttribute("aria-modal", "true");
  const idioma = p.startsWith("idioma_");
  d.innerHTML = `<div class="caja"><b></b><p class="es"></p><p class="en"></p><progress max="1" value="0" hidden></progress><p class="error" role="alert"></p>` + `<button class="elegir">ELEGIR ${t.archivo} / CHOOSE FILE</button><input type="file" accept=".mgs">` + (idioma ? '<button class="ingles chico">SEGUIR EN INGLÉS / CONTINUE IN ENGLISH</button>' : "") + `<button class="no chico">${ctx.escenario ? "QUEDARME ACÁ / STAY HERE" : "AHORA NO / NOT NOW"}</button></div>`;
  d.querySelector("b").textContent = t.titulo;
  d.querySelector(".es").textContent = modo ? t.es : t.sinModo;
  d.querySelector(".en").textContent = modo ? t.en : "";
  if (!modo) d.querySelector(".elegir").hidden = true;
  document.body.appendChild(d);
  caja = d;
  const error = m => {
    d.querySelector(".error").textContent = m || "";
  };
  const barra = d.querySelector("progress"), botones = [ ...d.querySelectorAll("button") ];
  const ocupado = si => {
    botones.forEach(b => b.disabled = si);
    barra.hidden = !si;
  };
  return new Promise(resolver => {
    const cerrar = v => {
      d.remove();
      if (caja === d) caja = null;
      esperaNativa = null;
      resolver(v);
    };
    const despues = async parteElegida => {
      for (let k = 0; k < 6; k++) {
        await leerCargadas();
        if (est.cargadas.has(p)) break;
        await dormir(300);
      }
      if (est.cargadas.has(p)) {
        cerrar(true);
        return;
      }
      error(parteElegida && parteElegida !== p ? ERRORES.otra(est.info?.partes?.[parteElegida]?.archivo || parteElegida, t.archivo) : ERRORES.fallo());
    };
    d.querySelector(".no").onclick = () => cerrar(false);
    d.querySelector(".ingles")?.addEventListener("click", () => {
      try {
        globalThis.mgsIdioma?.poner("texto", "en");
        globalThis.mgsIdioma?.poner("voz", "en");
      } catch {}
      cerrar(false);
    });
    const entrada = d.querySelector("input");
    d.querySelector(".elegir").onclick = () => {
      error("");
      if (modo === "nativo") {
        esperaNativa = r => {
          ocupado(false);
          if (r?.ok) despues(r.parte); else if (r?.error && r.error !== "cancelado") error((ERRORES[r.error] || ERRORES.fallo)(r.parte || "", t.archivo));
        };
        ocupado(true);
        barra.removeAttribute("value");
        try {
          window.MGSApp.elegirParte(p);
        } catch (e) {
          ocupado(false);
          error(ERRORES.fallo());
        }
      } else entrada.click();
    };
    entrada.onchange = async () => {
      const f = entrada.files?.[0];
      entrada.value = "";
      if (!f) return;
      ocupado(true);
      barra.value = 0;
      try {
        const info = await self.mgsParte(f);
        if (!info || info.parte === "entero") {
          ocupado(false);
          error(ERRORES.formato());
          return;
        }
        if (info.parte !== p) {
          ocupado(false);
          error(ERRORES.otra(f.name, t.archivo));
          return;
        }
        const e = await (navigator.storage.estimate?.().catch(() => null));
        if (e?.quota && e.quota - e.usage < f.size) {
          ocupado(false);
          error(ERRORES.espacio(mb(f.size)));
          return;
        }
        await (navigator.storage.persist?.().catch(() => {}));
        await self.mgsGuardar(f, self.mgsNombre(info.parte), k => {
          barra.value = k;
        });
        navigator.serviceWorker?.controller?.postMessage("casco-datos-cambiaron");
        ocupado(false);
        await despues(info.parte);
      } catch (x) {
        console.warn("[partes]", x);
        ocupado(false);
        error(x?.name === "QuotaExceededError" ? ERRORES.espacio(mb(f.size)) : ERRORES.fallo());
      }
    };
  });
}

let fila = Promise.resolve();

function pedir(p, ctx = {}) {
  if (est.cargadas.has(p)) return Promise.resolve(true);
  if (!ctx.escenario && rechazadas.has(p)) return Promise.resolve(false);
  if (!pedidos.has(p)) {
    const turno = fila.then(() => est.cargadas.has(p) ? true : ventana(p, ctx));
    fila = turno.catch(() => {});
    pedidos.set(p, turno.then(ok => {
      pedidos.delete(p);
      if (!ok) rechazadas.add(p); else rechazadas.delete(p);
      return ok;
    }));
  }
  return pedidos.get(p);
}

async function antesDeCargar(id) {
  if (!ACTIVO) return true;
  await esperarListo();
  if (!est.activo || !est.disco2.has(id) || !est.info.partes.disco2 || est.cargadas.has("disco2")) return true;
  return pedir("disco2", {
    escenario: id
  });
}

if (ACTIVO) {
  window.fetch = function(entrada, opciones) {
    let url;
    try {
      url = new URL(typeof entrada === "string" || entrada instanceof URL ? String(entrada) : entrada.url, location.href).href;
    } catch {
      return fetchOriginal(entrada, opciones);
    }
    if (!url.startsWith(BASE)) return fetchOriginal(entrada, opciones);
    return (async () => {
      await esperarListo();
      let rel = url.slice(BASE.length).split(/[?#]/)[0];
      try {
        rel = decodeURIComponent(rel);
      } catch {}
      const p = falta(rel);
      if (p && (est.sinPedir.has(rel) || !await pedir(p, {
        archivo: rel
      }))) return new Response("", {
        status: 404,
        statusText: "Not Found"
      });
      return fetchOriginal(entrada, opciones);
    })();
  };
  addEventListener("error", e => {
    const t = e.target, src = t && t !== window && (t.currentSrc || t.src);
    if (typeof src !== "string" || !src.startsWith(BASE)) return;
    let rel = src.slice(BASE.length).split(/[?#]/)[0];
    try {
      rel = decodeURIComponent(rel);
    } catch {}
    const p = falta(rel);
    if (p && !est.sinPedir.has(rel)) pedir(p, {
      archivo: rel
    });
  }, true);
}

window.mgsPartes = {
  get activo() {
    return est.activo;
  },
  listo: listo,
  estado: est,
  parteDe: parteDe,
  falta: falta,
  pedir: pedir,
  antesDeCargar: antesDeCargar,
  alElegir(r) {
    if (typeof r === "string") {
      try {
        r = JSON.parse(r);
      } catch {
        r = null;
      }
    }
    esperaNativa?.(r);
  },
  async actualizar() {
    await leerCargadas();
    return [ ...est.cargadas ];
  }
};
