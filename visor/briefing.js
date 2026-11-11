// MGS web — FeniXVOID · Project Ravenlight
import { limpiar, cargarImg } from "./titulo.js";

import { Maquina } from "./brf_mips.js";

import { urlVoz } from "./audio_ps1.js";

import { todoDesbloqueado } from "./desbloqueo.js";

const BASE = new URL("./assets/", import.meta.url).href;

const DIR = BASE + "extras/brf/";

const GUARDADO = "mgs_brf";

const NUEVO = 2148324616;

const PROC = {
  g: 4504,
  h: 4505,
  e: 7484
};

const BOT = {
  arriba: 4096,
  der: 8192,
  abajo: 16384,
  izq: 32768,
  o: 32,
  x: 64,
  start: 2048
};

const SUB = {
  ancho: 256,
  alto: 38,
  lskip: 6,
  corte: 240,
  renglones: 2,
  y: 204,
  gris: [ 0, 8 << 3, 16 << 3, 25 << 3 ]
};

const partidaViva = () => {
  const p = globalThis.__mgs?.partida;
  return p && typeof p.ponerBriefing === "function" ? p : null;
};

function leerGuardado() {
  let g = null;
  try {
    const x = JSON.parse(localStorage.getItem(GUARDADO) || "null");
    if (x && Array.isArray(x.f)) g = x;
  } catch {}
  g = {
    l: g?.l ? 1 : 0,
    z: g?.z ? 1 : 0,
    f: Array.from({
      length: 16
    }, (_, i) => g?.f?.[i] ? 1 : 0)
  };
  const p = partidaViva()?.briefing;
  if (p) {
    g.l |= p.l;
    g.z |= p.z;
    g.f = g.f.map((x, i) => x | p.f[i]);
  }
  return g;
}

const GUARDADO_TODO = "mgs_brf_todo";

function leerTodo() {
  try {
    const x = JSON.parse(localStorage.getItem(GUARDADO_TODO) || "null");
    return {
      l: x?.l ? 1 : 0,
      z: x?.z ? 1 : 0
    };
  } catch {
    return {
      l: 0,
      z: 0
    };
  }
}

function escribirTodo(t) {
  try {
    localStorage.setItem(GUARDADO_TODO, JSON.stringify(t));
  } catch {}
}

function escribirGuardado(g) {
  try {
    localStorage.setItem(GUARDADO, JSON.stringify(g));
  } catch {}
  try {
    partidaViva()?.ponerBriefing(g);
  } catch (e) {
    console.warn("briefing: partida: " + e.message);
  }
}

export class Pantalla {
  constructor(t) {
    this.t = t;
    this.fin = false;
    this.f = 0;
    this.voz = null;
    this.lineas = new Map;
  }
  async cargar() {
    const bin = n => fetch(DIR + n).then(r => {
      if (!r.ok) throw new Error("falta " + n);
      return r.arrayBuffer();
    });
    const js = u => fetch(u).then(r => {
      if (!r.ok) throw new Error("falta " + u);
      return r.json();
    });
    const [info, overlay, brf, vram, texturas, fp, fj] = await Promise.all([ js(DIR + "brf.json"), bin("overlay.bin"), bin("brf.dat"), bin("vram.bin"), js(DIR + "texturas.json"), cargarImg(BASE + "codec/ui/fuente.png"), js(BASE + "codec/ui/fuente.json") ]);
    this.info = info;
    this.guardado = leerGuardado();
    this.desbloqueado = todoDesbloqueado();
    const g = this.desbloqueado ? {
      ...leerTodo(),
      f: Array(16).fill(1)
    } : this.guardado;
    const opciones = {
      v: info.vox,
      l: [ g.l ],
      z: [ g.z ],
      f: g.f.slice(0, 16),
      g: [ PROC.g ],
      h: [ PROC.h ],
      e: [ PROC.e ]
    };
    this.m = new Maquina({
      overlay: overlay,
      brf: brf,
      vram: vram,
      texturas: texturas,
      opciones: opciones,
      llamadas: {
        se: (id, vol) => this.t.sonido?.se?.(id, 0, vol & 63),
        sonido: c => this.t.sonido?.codigo?.(c),
        vox: (id, modo) => this._vox(id, modo),
        voxArranca: () => this._voxArranca(),
        voxPara: () => this._voxPara(),
        boca: h => this._boca(h),
        proc: (p, args) => this._proc(p, args),
        area: () => {
          this._voxPara();
          this.fin = true;
        }
      }
    });
    const c = document.createElement("canvas");
    c.width = fp.width;
    c.height = fp.height;
    const x = c.getContext("2d");
    x.drawImage(fp, 0, 0);
    const d = x.getImageData(0, 0, fp.width, fp.height).data, niv = new Uint8Array(fp.width * fp.height);
    for (let k = 0; k < niv.length; k++) niv[k] = d[k * 4 + 3] ? Math.round(d[k * 4] / 85) : 0;
    this.fuente = {
      ascii: fj.ascii,
      niv: niv,
      aw: fp.width
    };
    try {
      await (this.t.sonido?.cargarEscenario?.("brf"));
    } catch {}
    this.m.llamar(NUEVO, 37814, 0);
  }
  cuadro() {
    if (this.fin) return;
    this.f++;
    const t = this.t;
    let ap = 0, so = 0;
    for (const [b, bit] of Object.entries(BOT)) {
      if (t.pulsado(b)) ap |= bit;
      if (t.sostenido?.(b)) so |= bit;
    }
    const toque = t.tomarToque?.();
    if (toque) {
      const dx = toque.x - 160, dy = toque.y - 112;
      ap |= Math.abs(dx) < 50 && Math.abs(dy) < 40 ? BOT.o : Math.abs(dx) > Math.abs(dy) ? dx < 0 ? BOT.izq : BOT.der : dy < 0 ? BOT.arriba : BOT.abajo;
    }
    try {
      this.m.cuadro(ap, so | ap);
    } catch (e) {
      console.warn("briefing: " + e.message, this.m.registro.slice(-5));
      this._voxPara();
      this.fin = true;
    }
  }
  dibujar(fb) {
    limpiar(fb);
    if (!this.m) return;
    this.m.dibujar(fb);
    this._subtitulos(fb);
  }
  _proc(p, args) {
    if (this.desbloqueado) {
      if (p === PROC.e) {
        const z = args[1] ? 1 : 0;
        escribirTodo(z ? {
          l: 0,
          z: 0
        } : {
          l: args[0] ? 1 : 0,
          z: 0
        });
      }
      return;
    }
    const g = this.guardado;
    if (p === PROC.g) for (let i = 0; i < 8; i++) g.f[i] = args[i] ? 1 : 0; else if (p === PROC.h) for (let i = 0; i < 8; i++) g.f[8 + i] = args[i] ? 1 : 0; else if (p === PROC.e) {
      g.l = args[0] ? 1 : 0;
      g.z = args[1] ? 1 : 0;
    }
    escribirGuardado(g);
  }
  _vox(id, modo) {
    this._voxPara();
    const v = this.voz = {
      id: id,
      a: null,
      dj: null,
      listo: false,
      arrancar: !(modo & 1073741824),
      lip: 0,
      boca: 0,
      ojo: 0
    };
    fetch(DIR + "vox/" + id + ".json").then(r => r.json()).then(async dj => {
      v.dj = dj;
      const {url: url} = await urlVoz(DIR + "vox/", id, dj);
      if (this.voz !== v) return;
      const a = v.a = new Audio(url);
      a.preload = "auto";
      a.volume = this.t.opc?.sonido === false ? 0 : 1;
      v.listo = true;
      if (v.arrancar) a.play()?.catch?.(() => {});
      v.vigia = setInterval(() => {
        if (this.voz !== v || !this.t.visible || this.t.sub !== this && this.t.estado !== "extra_carga") {
          if (this.voz === v) this._voxPara(); else clearInterval(v.vigia);
        }
      }, 500);
    }).catch(e => console.warn("briefing: voz " + id + ": " + e.message));
  }
  _voxArranca() {
    const v = this.voz;
    if (!v) return;
    v.arrancar = true;
    if (v.a) v.a.play()?.catch?.(() => {});
  }
  _voxPara() {
    const v = this.voz;
    this.voz = null;
    if (v) clearInterval(v.vigia);
    if (v?.a) {
      try {
        v.a.pause();
        v.a.src = "";
      } catch {}
    }
  }
  _tiempo() {
    const v = this.voz;
    return v?.a && v.arrancar ? v.a.currentTime : -1;
  }
  _boca(h) {
    const v = this.voz, t = this._tiempo();
    if (!v?.dj || t < 0) return 0;
    const L = v.dj.lip || [], hex = h.toString(16).padStart(4, "0");
    while (v.lip < L.length && L[v.lip][0] <= t) {
      const [, quien, val] = L[v.lip++];
      if (quien !== hex) continue;
      if (val === 4) v.ojo = 1; else v.boca = val;
    }
    const r = v.ojo << 8 | v.boca;
    v.ojo = 0;
    return r;
  }
  textoSub(txt) {
    let r = this.lineas.get(txt);
    if (r) return r;
    const F = this.fuente, A = SUB.ancho, buf = new Uint8Array(A * SUB.alto);
    const glifo = c => c === undefined ? null : F.ascii[c.charCodeAt(0) - 32] || null;
    const anchoDe = c => {
      if (c === undefined || c.charCodeAt(0) < 32) return 0;
      const g = glifo(c);
      return g ? g[2] : 12;
    };
    const poner = (c, x, y) => {
      const g = glifo(c);
      if (!g) return 0;
      for (let f = 0; f < 12; f++) {
        const yy = y + g[1] + f;
        if (yy >= SUB.alto) break;
        for (let i = 0; i < g[2]; i++) {
          const v = F.niv[f * F.aw + g[0] + i], xx = x + i;
          if (v && xx < A) buf[yy * A + xx] |= v;
        }
      }
      return g[2];
    };
    const s = txt.replace(/\|/g, "\n");
    let x = 0, y = SUB.lskip, maxW = 0, maxH = SUB.lskip + 14, n = 0, cr = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\n") {
        if (!cr) {
          maxW = Math.max(maxW, x);
          x = 0;
          y += SUB.lskip + 12;
          n++;
          maxH = y + 14;
          if (SUB.alto <= y + 11 || n >= SUB.renglones) break;
        }
        cr = false;
        continue;
      }
      if (c.charCodeAt(0) < 32) continue;
      let dx = poner(c, x, y);
      if (c === "!" || c === "?") {
        const sig = s[i + 1];
        if (sig !== "!" && sig !== "?") dx += sig === "(" || sig === ")" ? 2 : 8;
      }
      const nw = anchoDe(s[i + 1]);
      if (nw > 0 && x + dx + nw - 1 >= SUB.corte) {
        maxW = Math.max(maxW, x + dx);
        x = 0;
        y += SUB.lskip + 12;
        n++;
        maxH = y + 14;
        cr = true;
        if (y + 11 >= SUB.alto || n >= SUB.renglones) break;
      } else {
        x += dx;
        cr = false;
      }
      maxW = Math.max(maxW, x);
    }
    r = {
      buf: buf,
      maxW: maxW,
      maxH: maxH
    };
    this.lineas.set(txt, r);
    return r;
  }
  _subtitulos(fb) {
    const v = this.voz, t = this._tiempo();
    if (!v?.dj || t < 0 || this.t.opc?.subtitulos === false) return;
    const s = (v.dj.sub || []).find(q => t >= q[0] && t < q[1]);
    if (!s) return;
    const {buf: buf, maxW: maxW, maxH: maxH} = this.textoSub(s[2]);
    const x0 = fb.w - maxW >> 1, y0 = SUB.y - (maxH >> 1), A = SUB.ancho;
    const pintar = (dx, dy, color) => {
      for (let y = 0; y < Math.min(maxH, SUB.alto); y++) {
        const yy = y0 + y + dy;
        if (yy < 0 || yy >= fb.h) continue;
        for (let x = 0; x < A; x++) {
          const n = buf[y * A + x];
          if (!n) continue;
          const xx = x0 + x + dx;
          if (xx < 0 || xx >= fb.w) continue;
          const o = (yy * fb.w + xx) * 4, g = color ?? SUB.gris[n & 3];
          fb.d[o] = g;
          fb.d[o + 1] = g;
          fb.d[o + 2] = g;
        }
      }
    };
    for (const [dx, dy] of [ [ -1, 0 ], [ 1, 0 ], [ 0, 1 ], [ 0, -1 ] ]) pintar(dx, dy, 0);
    pintar(0, 0);
  }
}
