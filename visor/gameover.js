// MGS web — FeniXVOID · Project Ravenlight
const LOGO = [ 37, 88, 25, 104, 25, 104, 31, 121, 31, 121, 40, 121, 40, 121, 32, 135, 32, 135, 42, 135, 69, 88, 37, 88, 64, 96, 41, 96, 41, 96, 35, 104, 35, 104, 38, 113, 38, 113, 45, 113, 62, 100, 45, 100, 45, 100, 40, 108, 40, 108, 48, 108, 48, 108, 45, 113, 69, 88, 64, 96, 55, 121, 65, 121, 74, 88, 84, 88, 67, 100, 85, 100, 69, 96, 85, 96, 67, 100, 55, 121, 69, 96, 74, 88, 84, 88, 85, 96, 85, 100, 87, 121, 87, 121, 78, 121, 73, 108, 77, 108, 78, 121, 77, 108, 73, 108, 65, 121, 62, 100, 42, 135, 89, 121, 98, 121, 97, 88, 108, 88, 118, 88, 130, 88, 122, 121, 113, 121, 113, 121, 117, 104, 117, 104, 108, 121, 108, 121, 103, 121, 103, 121, 102, 104, 102, 104, 98, 121, 95, 96, 108, 96, 114, 96, 128, 96, 94, 100, 108, 100, 112, 100, 127, 100, 97, 88, 95, 96, 94, 100, 89, 121, 108, 88, 108, 96, 108, 100, 108, 108, 112, 100, 108, 108, 114, 96, 118, 88, 127, 100, 122, 121, 128, 96, 130, 88, 134, 88, 156, 88, 126, 121, 148, 121, 132, 96, 154, 96, 131, 100, 153, 100, 138, 107, 151, 107, 138, 107, 137, 113, 150, 113, 137, 113, 134, 88, 132, 96, 131, 100, 126, 121, 150, 113, 148, 121, 151, 107, 153, 100, 154, 96, 156, 88, 173, 121, 199, 121, 181, 88, 207, 88, 179, 96, 205, 96, 187, 100, 184, 113, 184, 113, 192, 113, 195, 100, 192, 113, 207, 88, 205, 96, 204, 100, 199, 121, 181, 88, 179, 96, 178, 100, 173, 121, 178, 100, 187, 100, 195, 100, 204, 100, 213, 121, 224, 121, 241, 88, 231, 88, 210, 88, 219, 88, 211, 96, 220, 96, 211, 100, 220, 100, 225, 100, 235, 100, 227, 96, 237, 96, 225, 100, 221, 108, 231, 88, 227, 96, 235, 100, 224, 121, 237, 96, 241, 88, 211, 100, 213, 121, 210, 88, 211, 96, 219, 88, 220, 96, 220, 100, 221, 108, 244, 88, 266, 88, 236, 121, 258, 121, 242, 96, 264, 96, 241, 100, 263, 100, 247, 113, 260, 113, 248, 108, 261, 108, 248, 108, 247, 113, 244, 88, 242, 96, 241, 100, 236, 121, 263, 100, 261, 108, 260, 113, 258, 121, 266, 88, 264, 96, 270, 88, 292, 88, 268, 96, 286, 96, 292, 88, 295, 97, 267, 100, 282, 100, 275, 107, 277, 107, 262, 121, 272, 121, 275, 107, 272, 121, 277, 107, 285, 135, 285, 135, 295, 135, 286, 106, 295, 135, 286, 106, 288, 106, 288, 106, 295, 97, 282, 100, 286, 96, 267, 100, 262, 121, 268, 96, 270, 88, 67, 100, 55, 121, 53, 125, 47, 135, 53, 125, 279, 125, 282, 135, 47, 135, 282, 135, 279, 125 ];

const N = LOGO.length / 4;

const TICK = 1 / 20;

function cargarImg(src) {
  return new Promise(ok => {
    const i = new Image;
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}

function modular(img, r, g, b) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    p[i] = Math.min(255, p[i] * r / 128);
    p[i + 1] = Math.min(255, p[i + 1] * g / 128);
    p[i + 2] = Math.min(255, p[i + 2] * b / 128);
  }
  x.putImageData(d, 0, 0);
  return c;
}

function colorLinea(shade, step) {
  if (step < 8) return [ 128, 255, 255 ];
  step = Math.min(step - 8, 8);
  return [ 128 - step * 16, 255 - (255 - shade) * step / 8, 255 - (255 - shade) * step / 8 ];
}

export class GameOver {
  constructor() {
    this.cv = document.createElement("canvas");
    Object.assign(this.cv.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: 9,
      display: "none",
      imageRendering: "pixelated"
    });
    document.body.appendChild(this.cv);
    this.dirs = [];
    for (let i = 0; i < N; i++) {
      const dx = LOGO[i * 4] - LOGO[i * 4 + 2], dy = LOGO[i * 4 + 1] - LOGO[i * 4 + 3], L = Math.hypot(dx, dy) || 1;
      this.dirs.push([ Math.trunc(-dx / L * 4096 / 8), Math.trunc(-dy / L * 4096 / 8) ]);
    }
    this.activo = false;
    Promise.all([ cargarImg("assets/hud/go_continue.png"), cargarImg("assets/hud/go_exit.png") ]).then(([c, e]) => {
      this.tex = {
        c: c,
        e: e
      };
    });
    addEventListener("keydown", ev => this.tecla(ev), true);
    this.cv.addEventListener("pointerdown", ev => this.toque(ev));
  }
  iniciar({puedeSeguir: puedeSeguir = true, alSeguir: alSeguir, alSalir: alSalir}) {
    Object.assign(this, {
      step: 1,
      count: 0,
      option: 0,
      gradient: 0,
      puedeSeguir: puedeSeguir,
      alSeguir: alSeguir,
      alSalir: alSalir,
      acum: 0,
      activo: true
    });
    this.cv.style.display = "block";
  }
  cerrar() {
    this.activo = false;
    this.cv.style.display = "none";
  }
  tecla(ev) {
    if (!this.activo || this.count !== 256) return;
    if ([ "ArrowRight", "KeyD" ].includes(ev.code) && this.option === 0 && this.puedeSeguir) {
      this.option = 1;
      this.gradient = 0;
      this.se?.(31);
    } else if ([ "ArrowLeft", "KeyA" ].includes(ev.code) && this.option === 1) {
      this.option = 0;
      this.gradient = 0;
      this.se?.(31);
    } else if ([ "Enter", "Space" ].includes(ev.code)) this.elegir(); else return;
    ev.preventDefault();
    ev.stopPropagation();
  }
  toque(ev) {
    if (!this.activo || this.count !== 256) return;
    const r = this.cv.getBoundingClientRect(), {s: s, ox: ox, oy: oy} = this.escala();
    const x = (ev.clientX - r.left - ox) / s, y = (ev.clientY - r.top - oy) / s;
    if (y > 110 && y < 150) {
      const op = this.puedeSeguir && x < 160 ? 0 : 1;
      if (op === this.option) this.elegir(); else {
        this.option = op;
        this.gradient = 0;
        this.se?.(31);
      }
    }
  }
  elegir() {
    this.count = 257;
    this.gradient = 32;
    this.se?.(this.option === 0 ? 102 : 33);
  }
  escala() {
    const W = this.cv.width, H = this.cv.height, s = Math.min(W / 320, H / 240);
    return {
      s: s,
      ox: (W - 320 * s) / 2,
      oy: (H - 240 * s) / 2
    };
  }
  tick() {
    if (this.count < 256) {
      this.anim = true;
      this.fondo = this.count * 2;
      this.count += 3;
      if (this.count >= 256) {
        if (this.step > 0) {
          this.count = 255;
        } else this.count = 256;
      }
    } else if (this.count === 256) {
      this.fondo = 255;
      this.gradient = (this.gradient + 1) % 64;
    } else {
      this.fondo = 255;
      this.count += 4;
      if (this.count > 542) {
        const op = this.option;
        this.cerrar();
        (op === 0 ? this.alSeguir : this.alSalir)?.();
      }
    }
    if (this.step > 0) this.step = this.step < N + 16 ? this.step + 2 : 0;
  }
  dibujar(dt) {
    if (!this.activo) return;
    this.acum += dt;
    while (this.acum >= TICK && this.activo) {
      this.acum -= TICK;
      this.tick();
    }
    if (!this.activo) return;
    const cv = this.cv;
    if (cv.width !== innerWidth || cv.height !== innerHeight) {
      cv.width = innerWidth;
      cv.height = innerHeight;
    }
    const x = cv.getContext("2d"), {s: s, ox: ox, oy: oy} = this.escala();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = `rgba(0,0,0,${Math.min(1, (this.fondo || 0) / 255)})`;
    x.fillRect(0, 0, cv.width, cv.height);
    x.setTransform(s, 0, 0, s, ox, oy);
    let step = this.step, mueve = true;
    if (step === 0) {
      mueve = false;
      step = 16;
    }
    x.lineWidth = 1 / s * Math.max(1, Math.round(s * .9));
    for (let i = 0; i < N; i++) {
      const cuenta = N - i;
      let w = 0, h = 0;
      if (mueve) {
        if (step < 8) {
          w = this.dirs[i][0] >> step;
          h = this.dirs[i][1] >> step;
          if (cuenta % 4 === 2) {
            w = -w;
            h = -h;
          }
        }
        if (--step < 0) break;
      }
      const L = i * 4;
      const x0 = LOGO[L] + w, y0 = LOGO[L + 1] + h, x1 = LOGO[L + 2] + w * 2, y1 = LOGO[L + 3] + h * 2;
      const c1 = colorLinea(Math.min(255, 255 - Math.abs(x0 - 160)), step), c2 = colorLinea(Math.min(255, 255 - Math.abs(x1 - 160)), step);
      if (step >= 8 && step <= 13) {
        const ww = -(this.dirs[i][1] >> step - 6), hh = this.dirs[i][0] >> step - 6, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const g = x.createRadialGradient(mx, my, 0, mx, my, Math.max(1, Math.hypot(ww, hh)));
        g.addColorStop(0, "rgba(0,64,128,0.9)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        x.globalCompositeOperation = "lighter";
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(x1 - ww, y1 - hh);
        x.lineTo(x0 - ww, y0 - hh);
        x.lineTo(x0 + ww, y0 + hh);
        x.lineTo(x1 + ww, y1 + hh);
        x.closePath();
        x.fill();
        x.globalCompositeOperation = "source-over";
      }
      const gr = x.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, `rgb(${c1.map(Math.round)})`);
      gr.addColorStop(1, `rgb(${c2.map(Math.round)})`);
      x.strokeStyle = gr;
      x.beginPath();
      x.moveTo(x0 + .5, y0 + .5);
      x.lineTo(x1 + .5, y1 + .5);
      x.stroke();
    }
    if (this.step === 0 && this.tex?.c) {
      const c3 = this.gradient > 32 ? 48 + (64 - this.gradient) * 4 : 48 + this.gradient * 4;
      const on = [ 0, c3, c3 ], off = [ 0, 48, 48 ];
      x.imageSmoothingEnabled = false;
      if (this.puedeSeguir) {
        x.drawImage(modular(this.tex.c, ...this.option === 0 ? on : off), 70, 126);
        x.drawImage(modular(this.tex.e, ...this.option === 1 ? on : off), 199, 126);
      } else x.drawImage(modular(this.tex.e, ...on), 128, 126);
    }
  }
}
