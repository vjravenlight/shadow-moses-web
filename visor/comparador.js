// MGS web — FeniXVOID · Project Ravenlight
const CSS = `\n.cmp-capa{position:fixed;inset:0;z-index:12;pointer-events:none;font-family:'MGS8',Consolas,monospace;color:#b4f4ac}\n.cmp-linea{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#b4f4ac;box-shadow:0 0 6px #000}\n.cmp-asa{position:absolute;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border:2px solid #b4f4ac;border-radius:50%;background:rgba(0,20,8,.7);\n  pointer-events:auto;cursor:ew-resize;touch-action:none;display:flex;align-items:center;justify-content:center;font-size:14px}\n.cmp-rot{position:absolute;top:52px;padding:4px 8px;background:rgba(0,10,4,.7);border:1px solid #2f4a39;font-size:12px}\n.cmp-barra{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto}\n.cmp-barra button{background:rgba(4,16,8,.85);color:#9fd8a0;border:1px solid #2f4a39;font:inherit;font-size:12px;padding:6px 10px;cursor:pointer}\n.cmp-barra button:hover{border-color:#b4f4ac;color:#b4f4ac}\n`;

export class Comparador {
  constructor({alCambiar: alCambiar = null} = {}) {
    this.activo = false;
    this.modo = "cortina";
    this.x = .5;
    this.alCambiar = alCambiar;
    this.alterna = false;
    this.tAlt = 0;
    this.ladoAlt = "original";
  }
  poner(si = !this.activo) {
    this.activo = !!si;
    if (this.activo) this._armar(); else {
      this.capa?.remove();
      this.capa = null;
    }
    this.alCambiar?.(this.activo);
    return this.activo;
  }
  cambiarModo() {
    this.modo = this.modo === "cortina" ? "lado" : "cortina";
    this._pintar();
  }
  _armar() {
    if (this.capa) return;
    if (!document.getElementById("cmp-css")) {
      const s = document.createElement("style");
      s.id = "cmp-css";
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    const c = this.capa = document.createElement("div");
    c.className = "cmp-capa";
    c.innerHTML = '<div class="cmp-linea"></div><div class="cmp-asa">&#9664;&#9654;</div><div class="cmp-rot cmp-izq">ORIGINAL</div><div class="cmp-rot cmp-der">MEJORADO</div>' + '<div class="cmp-barra"><button data-a="modo"></button><button data-a="salir">SALIR</button></div>';
    document.body.appendChild(c);
    const asa = c.querySelector(".cmp-asa");
    asa.addEventListener("pointerdown", e => {
      e.preventDefault();
      e.stopPropagation();
      asa.setPointerCapture(e.pointerId);
      this._arrastre = e.pointerId;
    });
    asa.addEventListener("pointermove", e => {
      if (this._arrastre !== e.pointerId) return;
      this.x = Math.max(.02, Math.min(.98, e.clientX / innerWidth));
      this._pintar();
    });
    const soltar = e => {
      if (this._arrastre === e.pointerId) this._arrastre = null;
    };
    asa.addEventListener("pointerup", soltar);
    asa.addEventListener("pointercancel", soltar);
    asa.addEventListener("keydown", e => {
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        this.x = Math.max(.02, Math.min(.98, this.x + (e.code === "ArrowLeft" ? -.05 : .05)));
        this._pintar();
        e.preventDefault();
      }
    });
    asa.tabIndex = 0;
    c.querySelector('[data-a="modo"]').onclick = e => {
      e.stopPropagation();
      this.cambiarModo();
    };
    c.querySelector('[data-a="salir"]').onclick = e => {
      e.stopPropagation();
      this.poner(false);
    };
    this._pintar();
  }
  _pintar() {
    const c = this.capa;
    if (!c) return;
    const lado = this.modo === "lado", x = lado ? .5 : this.x;
    c.querySelector(".cmp-linea").style.left = x * 100 + "%";
    const asa = c.querySelector(".cmp-asa");
    asa.style.left = x * 100 + "%";
    asa.style.display = lado ? "none" : "";
    c.querySelector(".cmp-izq").style.left = "10px";
    c.querySelector(".cmp-der").style.right = "10px";
    c.querySelector('[data-a="modo"]').textContent = lado ? "VER: LADO A LADO" : "VER: CORTINA";
  }
  dibujar(R, escena, cam, lado) {
    const v = R.getSize(this._v || (this._v = {
      x: 0,
      y: 0,
      set(a, b) {
        this.x = a;
        this.y = b;
        return this;
      }
    })), w = v.x, h = v.y;
    const autoAntes = R.autoClear;
    R.setScissorTest(true);
    if (this.modo === "lado") {
      const a = cam.aspect, mw = Math.floor(w / 2);
      cam.aspect = mw / h;
      cam.updateProjectionMatrix();
      lado("original");
      R.setViewport(0, 0, mw, h);
      R.setScissor(0, 0, mw, h);
      R.render(escena, cam);
      lado("mejorado");
      R.setViewport(mw, 0, w - mw, h);
      R.setScissor(mw, 0, w - mw, h);
      R.render(escena, cam);
      cam.aspect = a;
      cam.updateProjectionMatrix();
    } else {
      const cx = Math.round(w * this.x);
      lado("original");
      R.setScissor(0, 0, cx, h);
      R.render(escena, cam);
      lado("mejorado");
      R.setScissor(cx, 0, w - cx, h);
      R.render(escena, cam);
    }
    R.setScissorTest(false);
    R.setViewport(0, 0, w, h);
    R.autoClear = autoAntes;
    lado(null);
  }
  alternar(dt, cada = 2) {
    if (!this.alterna) return null;
    this.tAlt += dt;
    if (this.tAlt >= cada) {
      this.tAlt = 0;
      this.ladoAlt = this.ladoAlt === "original" ? "mejorado" : "original";
      this.alCambiarLado?.(this.ladoAlt);
    }
    return this.ladoAlt;
  }
  ponerAlterna(si = !this.alterna) {
    this.alterna = !!si;
    this.tAlt = 0;
    this.ladoAlt = "original";
    if (this.alterna) this.alCambiarLado?.(this.ladoAlt);
    return this.alterna;
  }
}
