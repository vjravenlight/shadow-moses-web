// MGS web — FeniXVOID · Project Ravenlight
const BASE = "assets/telops/";

const FUENTE = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", "Nimbus Sans", Roboto, sans-serif';

const REF = 100;

let datos = null;

export const telopsListos = (typeof fetch === "function" ? fetch(BASE + "textos.json").then(r => r.ok ? r.json() : {}).catch(() => ({})) : Promise.resolve({})).then(d => datos = d || {});

const medidas = new Map;

let ctxMedir = null;

function medir(pal) {
  let m = medidas.get(pal);
  if (m) return m;
  ctxMedir ||= document.createElement("canvas").getContext("2d");
  ctxMedir.font = `400 ${REF}px ${FUENTE}`;
  const t = ctxMedir.measureText(pal);
  m = {
    asc: t.actualBoundingBoxAscent || REF * .72,
    izq: t.actualBoundingBoxLeft || 0,
    der: t.actualBoundingBoxRight || t.width
  };
  medidas.set(pal, m);
  return m;
}

const armados = new Map;

function armar(png, e) {
  let a = armados.get(png);
  if (a) return a;
  a = e.L.map(ren => {
    const pedidos = ren.p.map(([pal, , , top]) => REF * (ren.b - top) / medir(pal).asc);
    const ord = [ ...pedidos ].sort((p, q) => p - q), med = ord[ord.length >> 1];
    return {
      b: ren.b,
      p: ren.p.map(([pal, x0, x1], i) => {
        const fs = Math.abs(pedidos[i] / med - 1) < .2 ? med : pedidos[i], m = medir(pal), k = fs / REF;
        const sx = Math.max(.7, Math.min(1.45, (x1 - x0) / Math.max(.5, (m.izq + m.der) * k)));
        return {
          pal: pal,
          x0: x0,
          fs: fs,
          sx: sx,
          izq: m.izq * k
        };
      })
    };
  });
  armados.set(png, a);
  return a;
}

const x4 = new Map;

function imagenX4(png) {
  if (!x4.has(png)) {
    const i = new Image;
    i.onerror = () => x4.set(png, null);
    i.src = BASE + "x4/" + png;
    x4.set(png, i);
  }
  const i = x4.get(png);
  return i && i.complete && i.naturalWidth ? i : null;
}

const negras = new WeakMap;

function enNegro(img) {
  let c = negras.get(img);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#000";
    x.fillRect(0, 0, c.width, c.height);
    negras.set(img, c);
  }
  return c;
}

export function esTexto(png) {
  return !!datos?.[png]?.L;
}

export function dibujarTelop(ctx, png, o) {
  const a = Math.max(0, Math.min(1, o.alfa ?? 1));
  if (a <= 0) return false;
  const e = datos?.[png];
  ctx.save();
  if (e?.L) {
    const filas = armar(png, e), col = `rgb(${e.c.join(",")})`;
    ctx.globalAlpha = a;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";
    const pasada = fn => {
      for (const ren of filas) for (const p of ren.p) {
        ctx.save();
        ctx.translate(o.x + p.x0 * o.kx, o.y + ren.b * o.ky);
        ctx.scale(o.kx * p.sx, o.ky);
        ctx.font = `400 ${p.fs}px ${FUENTE}`;
        fn(p);
        ctx.restore();
      }
    };
    if (o.sombra) {
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.lineWidth = 2.6;
      pasada(p => ctx.strokeText(p.pal, p.izq, 0));
    }
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = .32;
    pasada(p => {
      ctx.fillText(p.pal, p.izq, 0);
      ctx.strokeText(p.pal, p.izq, 0);
    });
    ctx.restore();
    return true;
  }
  const w = o.w || o.img?.naturalWidth || 0, h = o.h || o.img?.naturalHeight || 0;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (typeof o.sombra === "string") {
    const s = imagenX4(o.sombra) || (o.imgSombra?.naturalWidth ? o.imgSombra : null);
    if (s) {
      ctx.globalAlpha = a * .7;
      ctx.drawImage(enNegro(s), o.x, o.y, (o.w2 || w) * o.kx, (o.h2 || h) * o.ky);
    }
  }
  const im = imagenX4(png) || (o.img?.complete && o.img.naturalWidth ? o.img : null);
  if (im && w && h) {
    ctx.globalAlpha = a;
    ctx.drawImage(im, o.x, o.y, w * o.kx, h * o.ky);
  }
  ctx.restore();
  return !!im;
}

export function dibujarCreditos(lienzo, lineas) {
  let c = lienzo;
  if (!c) {
    c = document.createElement("canvas");
    c.id = "telop";
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4;mix-blend-mode:lighten";
    document.body.appendChild(c);
  }
  const dpr = Math.min(3, window.devicePixelRatio || 1), iw = innerWidth, ih = innerHeight;
  const W = Math.round(iw * dpr), H = Math.round(ih * dpr);
  if (c.width !== W || c.height !== H) {
    c.width = W;
    c.height = H;
  }
  const x = c.getContext("2d");
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, W, H);
  if (!lineas.length) return c;
  const s = Math.max(1, Math.min(iw / 320, ih / 240)) * dpr, ox = (W - 320 * s) / 2, oy = (H - 240 * s) / 2;
  for (const l of lineas) {
    if (!(l.a > 0)) continue;
    dibujarTelop(x, l.src, {
      x: ox + l.x * s,
      y: oy + l.y * s,
      kx: s,
      ky: s,
      alfa: l.a,
      img: l.img
    });
  }
  return c;
}
