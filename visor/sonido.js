// MGS web — FeniXVOID · Project Ravenlight
export const SE = {
  SOCOM: 1,
  PASO_I: 2,
  PASO_D: 3,
  SIN_BALAS: 4,
  "DAÑO1": 24,
  "DAÑO2": 25,
  RIFLE: 27,
  GAMEOVER: 15,
  RADAR_OK: 14,
  RECUPERA: 12,
  ITEM: 22,
  PLAYEROUT: 26,
  BALA_PEGA: 37,
  "ENEMIGO_DAÑO": 38,
  SIRENA: 42,
  DISPARO_E: 46,
  DISPARO_E2: 45,
  RECARGA: 47,
  FAMAS: 48,
  CAE: 51,
  "PIÑA": 52,
  PATADA: 53,
  PARED: 55,
  SWING: 56,
  CHISPA: 59,
  CARGADOR: 72,
  SORPRESA: 83
};

class Sonido {
  constructor() {
    this.listo = false;
    this.canciones = [ 0, 0 ];
    this.escenario = null;
    this.cola = [];
    this.volumen = .9;
    this.espacial = false;
    this.fuentes = new Map;
    this.sigFuente = 1;
    this.panners = [];
    this.canalFuente = new Array(8).fill(0);
  }
  async iniciar() {
    if (this.ctx) {
      if (this.ctx.state !== "running") await this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext({
        sampleRate: 44100,
        latencyHint: "interactive"
      });
      await this.ctx.audioWorklet.addModule("spu-worklet.js");
      this.nodo = new AudioWorkletNode(this.ctx, "mgs-spu", {
        numberOfOutputs: 9,
        outputChannelCount: [ 2, 1, 1, 1, 1, 1, 1, 1, 1 ]
      });
      this.nodo.connect(this.ctx.destination, 0);
      for (let i = 0; i < 8; i++) {
        const p = new PannerNode(this.ctx, {
          panningModel: "HRTF",
          distanceModel: "inverse",
          refDistance: 1,
          rolloffFactor: 0
        });
        this.nodo.connect(p, i + 1);
        p.connect(this.ctx.destination);
        this.panners.push(p);
      }
      this.nodo.port.onmessage = e => {
        const m = e.data;
        if (m.tipo === "canal") {
          this.canalFuente[m.i] = m.fuente;
          const f = this.fuentes.get(m.fuente);
          if (f) this.ubicar(m.i, f);
        } else this.alMensaje?.(m);
      };
      const [banco, res, esc] = await Promise.all([ fetch("assets/sonido/bancos/ae34.wvx").then(r => r.arrayBuffer()), fetch("assets/sonido/residente.json").then(r => r.json()), fetch("assets/sonido/escenarios.json").then(r => r.json()) ]);
      this.tabla = esc;
      this.nodo.port.postMessage({
        tipo: "banco",
        buf: banco
      }, [ banco ]);
      this.nodo.port.postMessage({
        tipo: "residente",
        datos: res
      });
      this.nodo.port.postMessage({
        tipo: "volumen",
        v: this.volumen
      });
      this.listo = true;
      this.enviar({
        tipo: "espacial",
        on: this.espacial
      });
      if (this.ctx.state !== "running") await this.ctx.resume();
      const pend = this.escenario;
      this.escenario = null;
      if (pend) this.cargarEscenario(pend);
      for (const c of this.cola.splice(0)) this.nodo.port.postMessage(c);
    } catch (e) {
      console.warn("sonido no disponible", e);
    }
  }
  enviar(m) {
    if (this.listo) this.nodo.port.postMessage(m);
  }
  async cargarEscenario(st) {
    if (!this.listo) {
      this.escenario = st;
      return;
    }
    this.enviar({
      tipo: "callar"
    });
    const info = this.tabla?.[st];
    this.escenario = st;
    if (!info) return;
    const traer = u => fetch(u).then(r => r.ok ? r.arrayBuffer() : null);
    const bufs = await Promise.all(info.bancos.map(b => traer(`assets/sonido/bancos/${b}.wvx`)));
    if (this.escenario !== st) return;
    bufs.forEach(b => b && this.nodo.port.postMessage({
      tipo: "banco",
      buf: b
    }, [ b ]));
    if (info.mdx) {
      const b = await traer(`assets/sonido/mdx/${info.mdx}.mdx`);
      if (b) this.nodo.port.postMessage({
        tipo: "sng",
        buf: b
      }, [ b ]);
    }
    if (info.efx) {
      const b = await traer(`assets/sonido/efx/${info.efx}.efx`);
      if (b) this.nodo.port.postMessage({
        tipo: "efx",
        buf: b
      }, [ b ]);
    }
    this.canciones = info.canciones || [ 1, 2 ];
    this.modo = 0;
    this.cancion(this.canciones[0]);
  }
  codigo(c) {
    this.enviar({
      tipo: "codigo",
      codigo: c >>> 0
    });
  }
  cancion(n) {
    if (n) this.codigo(16777216 | n); else this.codigo(33554431);
  }
  se(id, pan = 0, vol = 63) {
    this.enviar({
      tipo: "se",
      codigo: id & 255 | (vol & 63) << 8 | (pan & 255) << 16
    });
  }
  setEspacial(on) {
    this.espacial = !!on;
    this.enviar({
      tipo: "espacial",
      on: this.espacial
    });
  }
  seEspacial(id, pos, vol = 63) {
    const f = this.sigFuente++;
    if (this.sigFuente > 2147483647) this.sigFuente = 1;
    this.fuentes.set(f, {
      x: pos.x,
      y: pos.y,
      z: pos.z
    });
    if (this.fuentes.size > 64) this.fuentes.delete(this.fuentes.keys().next().value);
    this.enviar({
      tipo: "se",
      codigo: id & 255 | (vol & 63) << 8,
      fuente: f
    });
  }
  ubicar(i, f) {
    const p = this.panners[i];
    if (!p) return;
    const t = this.ctx.currentTime;
    p.positionX.setValueAtTime(f.x, t);
    p.positionY.setValueAtTime(f.y, t);
    p.positionZ.setValueAtTime(f.z, t);
  }
  oyente(pos, adelante, arriba) {
    if (!this.ctx || !this.espacial) return;
    const L = this.ctx.listener, t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setValueAtTime(pos.x, t);
      L.positionY.setValueAtTime(pos.y, t);
      L.positionZ.setValueAtTime(pos.z, t);
      L.forwardX.setValueAtTime(adelante.x, t);
      L.forwardY.setValueAtTime(adelante.y, t);
      L.forwardZ.setValueAtTime(adelante.z, t);
      L.upX.setValueAtTime(arriba.x, t);
      L.upY.setValueAtTime(arriba.y, t);
      L.upZ.setValueAtTime(arriba.z, t);
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(adelante.x, adelante.y, adelante.z, arriba.x, arriba.y, arriba.z);
    }
  }
  alerta(modo) {
    if (modo === this.modo) return;
    if (modo === 1) {
      if (this.modo === 0) {
        this.se(SE.SIRENA);
        this.codigo(33554187);
        this.cancion(this.canciones[1]);
      } else if (this.modo === 2) this.codigo(33554179);
    } else if (modo === 2) this.codigo(33554192); else if (modo === 0) {
      this.se(SE.RADAR_OK);
      this.cancion(this.canciones[0]);
    }
    this.modo = modo;
  }
  finEvasion() {
    this.codigo(33554184);
  }
  gameOver() {
    this.codigo(4278190334);
    this.codigo(33554187);
    this.se(SE.GAMEOVER);
  }
  callar() {
    this.enviar({
      tipo: "callar"
    });
  }
  setVolumen(v) {
    this.volumen = v;
    this.enviar({
      tipo: "volumen",
      v: v
    });
  }
}

export const sonido = new Sonido;
