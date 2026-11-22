// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { caption } from "./caption.js";

import { ASPECTO as ASPECTO_CINE } from "./demo.js";

const TIPOS = [ "video/mp4;codecs=avc1.640028,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm" ];

const VERT_COPIA = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";

const FRAG_COPIA = "uniform sampler2D map; uniform float lineal, hay; varying vec2 vUv; void main(){ vec3 c = clamp(texture2D(map, vUv).rgb, 0.0, 1.0) * hay;" + " vec3 s = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); gl_FragColor = vec4(mix(c, s, lineal), 1.0); }";

export class Grabador {
  constructor(op = {}) {
    this.op = op;
    this.activo = false;
    this.rec = null;
    this.cv = null;
    this._els = null;
  }
  get soportado() {
    return typeof MediaRecorder !== "undefined" && !!HTMLCanvasElement.prototype.captureStream;
  }
  empezar() {
    if (this.activo || !this.soportado) return false;
    if (this.op.enXR?.()) return this.empezarXR();
    const L = this.op.lienzo, altoMax = this.op.alto || 1080;
    const k = Math.min(1, altoMax / Math.max(1, L.height));
    const cv = this.cv = document.createElement("canvas");
    cv.width = Math.max(2, Math.round(L.width * k) & ~1);
    cv.height = Math.max(2, Math.round(L.height * k) & ~1);
    this.x = cv.getContext("2d");
    this.x.fillStyle = "#000";
    this.x.fillRect(0, 0, cv.width, cv.height);
    const pistas = [ ...cv.captureStream(30).getVideoTracks() ];
    const s = this.op.sonido;
    if (s?.ctx && s.nodo) {
      this.dest = s.ctx.createMediaStreamDestination();
      try {
        s.nodo.connect(this.dest, 0);
      } catch {}
      for (const p of s.panners || []) try {
        p.connect(this.dest);
      } catch {}
      pistas.push(...this.dest.stream.getAudioTracks());
    }
    const tipo = TIPOS.find(t => MediaRecorder.isTypeSupported(t)) || "";
    this.tipo = tipo;
    this.trozos = [];
    this.rec = new MediaRecorder(new MediaStream(pistas), {
      mimeType: tipo || undefined,
      videoBitsPerSecond: 12e6,
      audioBitsPerSecond: 192e3
    });
    this.rec.ondataavailable = e => {
      if (e.data?.size) this.trozos.push(e.data);
    };
    this.rec.start(1e3);
    this.activo = true;
    this.t0 = performance.now();
    return true;
  }
  _sumarElemento(el) {
    if (!el || !this.dest) return;
    const els = this._els || (this._els = new Map);
    let e = els.get(el);
    if (!e) {
      let st = null;
      try {
        st = el.captureStream ? el.captureStream() : el.mozCaptureStream?.();
      } catch {}
      if (!st) return;
      e = {
        st: st,
        id: null,
        n: null
      };
      els.set(el, e);
    }
    const tr = e.st.getAudioTracks().filter(t => t.readyState === "live").pop();
    if (tr && tr.id !== e.id) {
      try {
        e.n?.disconnect();
      } catch {}
      e.id = tr.id;
      e.n = this.op.sonido.ctx.createMediaStreamSource(new MediaStream([ tr ]));
      e.n.connect(this.dest);
    }
  }
  empezarXR() {
    const ancho = Math.max(160, Math.round(this.op.xrAncho || 800) & ~1), alto = Math.max(120, Math.round(ancho / ASPECTO_CINE) & ~1);
    this.ancho = ancho;
    this.alto = alto;
    this.xr = true;
    this.fps = Math.max(10, Math.min(30, this.op.xrFps || 30));
    this.buf = new Uint8Array(ancho * alto * 4);
    this._leyendo = false;
    this._tUlt = 0;
    this.cuadros = 0;
    this.saltados = 0;
    this.msCuadro = 0;
    this.msSinc = 0;
    this.msPost = 0;
    this.cvSub = document.createElement("canvas");
    this.cvSub.width = ancho;
    this.cvSub.height = Math.round(alto * .2);
    this._lineaSub = undefined;
    let video;
    if (typeof MediaStreamTrackGenerator === "function" && typeof VideoFrame === "function") {
      video = new MediaStreamTrackGenerator({
        kind: "video"
      });
      this._writer = video.writable.getWriter();
      this.modoXR = "generador";
    } else {
      this.cv = document.createElement("canvas");
      this.cv.width = ancho;
      this.cv.height = alto;
      this.x = this.cv.getContext("2d");
      this.img = new ImageData(new Uint8ClampedArray(this.buf.buffer), ancho, alto);
      video = this.cv.captureStream(30).getVideoTracks()[0];
      this.modoXR = "lienzo";
    }
    const pistas = [ video ];
    const s = this.op.sonido;
    if (s?.ctx && s.nodo) {
      this.dest = s.ctx.createMediaStreamDestination();
      try {
        s.nodo.connect(this.dest, 0);
      } catch {}
      for (const p of s.panners || []) try {
        p.connect(this.dest);
      } catch {}
      pistas.push(...this.dest.stream.getAudioTracks());
    }
    const tipo = TIPOS.find(t => MediaRecorder.isTypeSupported(t)) || "";
    this.tipo = tipo;
    this.trozos = [];
    this.rec = new MediaRecorder(new MediaStream(pistas), {
      mimeType: tipo || undefined,
      videoBitsPerSecond: 6e6,
      audioBitsPerSecond: 16e4
    });
    this.rec.ondataavailable = e => {
      if (e.data?.size) this.trozos.push(e.data);
    };
    this.rec.start(1e3);
    this.activo = true;
    this.t0 = performance.now();
    return true;
  }
  _enviar() {
    if (this._writer) {
      try {
        this._writer.write(new VideoFrame(this.buf, {
          format: "RGBX",
          codedWidth: this.ancho,
          codedHeight: this.alto,
          timestamp: Math.round((performance.now() - this.t0) * 1e3)
        }));
      } catch (e) {
        this._error ||= String(e);
      }
    } else this.x.putImageData(this.img, 0, 0);
    this.cuadros++;
  }
  _armarCopia() {
    this.rt = new THREE.WebGLRenderTarget(this.ancho, this.alto, {
      depthBuffer: false
    });
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: {
          value: null
        },
        lineal: {
          value: 1
        },
        hay: {
          value: 0
        }
      },
      vertexShader: VERT_COPIA,
      fragmentShader: FRAG_COPIA,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const malla = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    malla.frustumCulled = false;
    this.texSub = new THREE.CanvasTexture(this.cvSub);
    this.texSub.minFilter = THREE.LinearFilter;
    this.texSub.generateMipmaps = false;
    const hs = this.cvSub.height / this.alto * 2;
    const sub = new THREE.Mesh(new THREE.PlaneGeometry(2, hs), new THREE.MeshBasicMaterial({
      map: this.texSub,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    sub.position.y = -1 + hs / 2;
    sub.renderOrder = 1;
    sub.frustumCulled = false;
    sub.visible = false;
    this._q = {
      escena: (new THREE.Scene).add(malla, sub),
      cam: new THREE.OrthographicCamera(-1, 1, -1, 1, -1, 1),
      mat: mat,
      sub: sub
    };
  }
  _copiar(R, tex, lineal) {
    if (!this._q) this._armarCopia();
    const u = this._q.mat.uniforms;
    u.map.value = tex;
    u.hay.value = tex ? 1 : 0;
    u.lineal.value = lineal ? 1 : 0;
    const prev = {
      t: R.getRenderTarget(),
      xr: R.xr.enabled,
      auto: R.autoClear
    };
    R.xr.enabled = false;
    try {
      R.setRenderTarget(this.rt);
      R.autoClear = true;
      R.render(this._q.escena, this._q.cam);
    } finally {
      R.autoClear = prev.auto;
      R.xr.enabled = prev.xr;
      R.setRenderTarget(prev.t);
    }
  }
  _subtituloXR() {
    const d = this.op.demo, x = this.cvSub.getContext("2d"), W = this.cvSub.width, H = this.cvSub.height;
    const t = d?.tiempo || 0, l = !d?.activa || d._salida || !caption.on ? null : (d.subtitulos || []).find(q => t >= q.t && t < q.t + q.d) || null;
    const cvJ = l?.tj != null ? d.lienzoSubtitulo?.(l) : null;
    const clave = l ? l.tj != null ? cvJ ? l : null : l.texto : null;
    if (clave === this._lineaSub) return;
    this._lineaSub = clave;
    x.clearRect(0, 0, W, H);
    if (cvJ?.width) {
      const k = Math.max(1, Math.floor(Math.min(W * .9 / cvJ.width, H * .8 / cvJ.height)));
      x.imageSmoothingEnabled = false;
      x.drawImage(cvJ, (W - cvJ.width * k) / 2, (H - cvJ.height * k) / 2, cvJ.width * k, cvJ.height * k);
    } else if (l && l.tj == null) {
      const filas = String(l.texto).split(/\r?\n/), tam = Math.round(this.alto / 20);
      x.font = `${tam}px "Trebuchet MS", Verdana, Arial, sans-serif`;
      x.textAlign = "center";
      x.textBaseline = "bottom";
      x.lineJoin = "round";
      x.lineWidth = Math.max(2, tam / 6);
      x.strokeStyle = "#000";
      x.fillStyle = "#e8e8e8";
      filas.forEach((f, i) => {
        const y = H * .85 - (filas.length - 1 - i) * tam * 1.2;
        x.strokeText(f, W / 2, y);
        x.fillText(f, W / 2, y);
      });
    }
    if (this.texSub) {
      this.texSub.needsUpdate = true;
      this._q.sub.visible = !!clave;
    }
  }
  cuadroXR(R) {
    const ahora = performance.now(), periodo = 1e3 / this.fps;
    if (ahora < this._tUlt) return;
    if (this._leyendo) {
      this.saltados++;
      return;
    }
    this._tUlt = Math.max(this._tUlt + periodo, ahora - periodo);
    const m = this.op.movie, d = this.op.demo, t0 = performance.now();
    let tex = null, lineal = true;
    if (m?.activo) {
      this._sumarElemento(m.media);
      const fv = m.lienzoVR?.(2);
      if (fv) {
        if (!this._texFmv || this._texFmv.image !== fv) {
          this._texFmv?.dispose();
          this._texFmv = new THREE.CanvasTexture(fv);
          this._texFmv.minFilter = THREE.LinearFilter;
          this._texFmv.generateMipmaps = false;
        }
        this._texFmv.needsUpdate = true;
        tex = this._texFmv;
        lineal = false;
      }
      if (!this._q) this._armarCopia();
      this._q.sub.visible = false;
      this._lineaSub = undefined;
    } else {
      this._sumarElemento(d?._audio);
      const P = this.op.paneles?.();
      if (P && d?.activa && d.escena && d.grupo) {
        if (!(this.op.pantallaCine?.() && P._frameCine === P.frame && P._rtCine)) P._renderDemo(R, d);
        tex = P._matCine?.uniforms?.map?.value || P._rtCine?.texture || null;
      }
      if (!this._q) this._armarCopia();
      this._subtituloXR();
    }
    this._copiar(R, tex, lineal);
    this._leyendo = true;
    const media = (v, n) => v ? v * .9 + n * .1 : n;
    const listo = () => {
      const tp = performance.now();
      this._enviar();
      this.msPost = media(this.msPost, performance.now() - tp);
      this.msCuadro = media(this.msCuadro, performance.now() - t0);
    };
    const p = R.readRenderTargetPixelsAsync ? R.readRenderTargetPixelsAsync(this.rt, 0, 0, this.ancho, this.alto, this.buf) : (R.readRenderTargetPixels(this.rt, 0, 0, this.ancho, this.alto, this.buf), 
    Promise.resolve());
    this.msSinc = media(this.msSinc, performance.now() - t0);
    Promise.resolve(p).then(() => {
      if (this.activo) listo();
    }).catch(e => console.warn("grabador (casco)", e)).finally(() => {
      this._leyendo = false;
    });
  }
  cuadro(R) {
    if (!this.activo) return;
    if (this.xr) return this.cuadroXR(R);
    const x = this.x, W = this.cv.width, H = this.cv.height, L = this.op.lienzo, m = this.op.movie, d = this.op.demo;
    if (m?.activo) {
      this._sumarElemento(m.media);
      const fv = m.lienzoVR?.(2);
      x.fillStyle = "#000";
      x.fillRect(0, 0, W, H);
      if (fv) {
        const k = Math.min(W / fv.width, H / fv.height), w = fv.width * k, h = fv.height * k;
        x.imageSmoothingEnabled = true;
        x.drawImage(fv, (W - w) / 2, (H - h) / 2, w, h);
      }
      return;
    }
    x.drawImage(L, 0, 0, W, H);
    this._sumarElemento(d?._audio);
    const ui = d?._ui;
    if (!ui?.raiz || ui.raiz.style.visibility === "hidden") return;
    const kx = W / innerWidth, ky = H / innerHeight;
    const rect = el => {
      const r = el.getBoundingClientRect();
      return [ r.left * kx, r.top * ky, r.width * kx, r.height * ky ];
    };
    const visible = el => el && el.isConnected && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden";
    for (const b of [ ui.arriba, ui.abajo ]) if (visible(b)) {
      const [bx, by, bw, bh] = rect(b);
      const c = getComputedStyle(b).backgroundColor;
      if (bh > .5) {
        x.fillStyle = c && c !== "rgba(0, 0, 0, 0)" ? c : "#000";
        x.fillRect(bx, by, bw, bh);
      }
    }
    for (const c of [ ui.lienzoM, ui.lienzoT ]) if (visible(c) && c.width) {
      const [cx, cy, cw, ch] = rect(c);
      x.drawImage(c, cx, cy, cw, ch);
    }
    const sub = ui.sub;
    if (visible(sub)) {
      const cvJ = sub.querySelector("canvas");
      if (cvJ?.width) {
        const [sx, sy, sw, sh] = rect(cvJ);
        x.imageSmoothingEnabled = false;
        x.drawImage(cvJ, sx, sy, sw, sh);
      } else if (sub.textContent) {
        const cs = getComputedStyle(sub), [sx, sy, sw] = rect(sub), tam = parseFloat(cs.fontSize) * ky, alto = (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2) * ky;
        x.font = `${tam}px ${cs.fontFamily}`;
        x.textAlign = "center";
        x.textBaseline = "top";
        x.lineJoin = "round";
        x.lineWidth = Math.max(2, tam / 7);
        x.strokeStyle = "#000";
        x.fillStyle = cs.color || "#e8e8e8";
        sub.innerText.split("\n").forEach((f, i) => {
          x.strokeText(f, sx + sw / 2, sy + i * alto);
          x.fillText(f, sx + sw / 2, sy + i * alto);
        });
      }
    }
  }
  terminar() {
    if (!this.activo) return Promise.resolve(null);
    this.activo = false;
    const rec = this.rec;
    this.rec = null;
    return new Promise(fin => {
      rec.onstop = () => {
        try {
          this.op.sonido?.nodo?.disconnect(this.dest);
        } catch {}
        for (const p of this.op.sonido?.panners || []) try {
          p.disconnect(this.dest);
        } catch {}
        for (const e of this._els?.values() || []) try {
          e.n?.disconnect();
        } catch {}
        this._els = null;
        this.dest = null;
        this.cv = null;
        if (this.xr) {
          try {
            this._writer?.close();
          } catch {}
          this.ultimoXR = {
            modo: this.modoXR,
            cuadros: this.cuadros,
            saltados: this.saltados,
            msCuadro: +this.msCuadro.toFixed(2),
            msSinc: +this.msSinc.toFixed(2),
            msPost: +this.msPost.toFixed(2),
            ancho: this.ancho,
            alto: this.alto,
            error: this._error || null,
            seg: +((performance.now() - this.t0) / 1e3).toFixed(1)
          };
          this._writer = null;
          this.rt?.dispose();
          this.rt = null;
          this.texSub?.dispose();
          this.texSub = null;
          this._texFmv?.dispose();
          this._texFmv = null;
          this._q = null;
          this.buf = null;
          this.img = null;
          this.cvSub = null;
          this.xr = false;
        }
        const b = this.trozos.length ? new Blob(this.trozos, {
          type: (this.tipo || "video/webm").split(";")[0]
        }) : null;
        this.trozos = [];
        fin(b);
      };
      try {
        rec.stop();
      } catch {
        fin(null);
      }
    });
  }
  get extension() {
    return /mp4/.test(this.tipo || "") ? "mp4" : "webm";
  }
}
