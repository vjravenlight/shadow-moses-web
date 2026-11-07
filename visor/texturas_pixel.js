// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const CLAVE = "sm_pixel";

let pixel = (() => {
  try {
    return localStorage.getItem(CLAVE) !== "0";
  } catch {
    return true;
  }
})();

const vistas = new Set, marcadas = new WeakSet, oyentes = new Set;

const afecta = t => t.colorSpace === THREE.SRGBColorSpace && !t.isCanvasTexture && !t.isVideoTexture && !t.isFramebufferTexture && !t.isDepthTexture && !t.isRenderTargetTexture && !t.isCompressedTexture && !t.userData?.filtroFijo;

const anotar = t => {
  if (!marcadas.has(t)) {
    marcadas.add(t);
    vistas.add(new WeakRef(t));
  }
};

for (const [prop, propio] of [ [ "magFilter", "_magPropio" ], [ "minFilter", "_minPropio" ] ]) {
  const d = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, prop);
  if (d && d.get) continue;
  Object.defineProperty(THREE.Texture.prototype, prop, {
    configurable: true,
    get() {
      if (afecta(this)) {
        anotar(this);
        return pixel ? THREE.NearestFilter : THREE.LinearFilter;
      }
      return this[propio];
    },
    set(v) {
      this[propio] = v;
    }
  });
}

function resubir() {
  for (const r of vistas) {
    const t = r.deref();
    if (!t) {
      vistas.delete(r);
      continue;
    }
    const im = t.image;
    if (im && (im.width || im.data || im.videoWidth) && im.complete !== false) t.needsUpdate = true;
  }
}

export const texturasPixel = {
  get pixel() {
    return pixel;
  },
  poner(si, guardar = true) {
    si = !!si;
    if (si === pixel) return;
    pixel = si;
    if (guardar) try {
      localStorage.setItem(CLAVE, si ? "1" : "0");
    } catch {}
    resubir();
    for (const f of oyentes) {
      try {
        f(si);
      } catch (e) {
        console.error(e);
      }
    }
  },
  alternar() {
    this.poner(!pixel);
  },
  releer() {
    try {
      const v = localStorage.getItem(CLAVE);
      if (v !== null) this.poner(v !== "0");
    } catch {}
  },
  alCambiar(f) {
    oyentes.add(f);
    return () => oyentes.delete(f);
  },
  get cuantas() {
    return vistas.size;
  }
};
