// MGS web — FeniXVOID · Project Ravenlight
const TIPOS = [ "video/mp4;codecs=avc1.640028,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm" ];

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
  cuadro(R) {
    if (!this.activo) return;
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
