// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, VoiceSys, Flujo, MM, ANG, randS, ratan2, nearExp, nearExp4, nearExp8, nearExp4P, nearSpeed, rotY, difS } from "./base.js";

import { trunc, Recursos, Cuerpo } from "./jeep_base.js";

import { Mando, PAD } from "./jeep.js";

import * as ctl from "../controles.js";

import { golpeBalaExtras, golpeCajaExtras, homingExtras } from "../actores_extra.js";

const H = {
  JEEP: 25534,
  VOICESYS: 3529,
  SNAKE: 8650,
  KILL: 12835,
  VOZ_SIG: 33432,
  VOZ_FUERA: 19213,
  VOZ_CORTA: 63465
};

const MSG_JEEP = [ 59924, 56882, 46252, 35278 ];

const DOLLS = [ 38386, 15660 ];

const SE = {
  ARRANCA: 188,
  ATRAS: 183,
  SALE: 180,
  EMBISTE: 37,
  LLAVE: 178,
  MOTOR: 177,
  TIRO: 46,
  AY: 136,
  MUERE: 51
};

const PIVOTE = {
  x: 0,
  y: 1435,
  z: -925
};

const SNAKE_OFF = {
  x: 180,
  y: -932,
  z: -340
};

const BOCA = {
  x: 0,
  y: 286,
  z: 574
};

const MERYL_POS = {
  x: 345,
  y: 915,
  z: -440
};

const FAROS = [ {
  x: 330,
  y: 890,
  z: 1436
}, {
  x: -330,
  y: 890,
  z: 1436
} ];

const EJE = 2250;

const ESQUINAS = [ [ 750, 1500 ], [ -750, 1500 ], [ -750, -1500 ], [ 750, -1500 ] ];

const EMBESTIDA = {
  medio: {
    x: 730,
    y: 880,
    z: 730
  },
  adelante: {
    x: 0,
    y: 900,
    z: 600
  },
  atras: {
    x: 0,
    y: 900,
    z: -600
  }
};

const receptores = new Set;

function engancharMensajes(g) {
  if (!g?.op || g.op.__jeep19a) return;
  const m0 = g.op.mensaje;
  g.op.mensaje = (d, v, i) => {
    for (const r of receptores) if (r.vivo && r.recibir(d, v, i)) return true;
    return m0 ? m0(d, v, i) : false;
  };
  g.op.__jeep19a = true;
}

export class PkJeep extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    const p = actor.p || this.opts.p || [ -4500, 0, 3e3 ], d = actor.d || this.opts.d || [ 0, 1024, 0 ];
    this.pos = {
      x: p[0],
      y: p[1],
      z: p[2]
    };
    this.rotJ = {
      x: d[0] | 0,
      y: d[1] & 4095,
      z: 0
    };
    this.c = this.opt("c", 0) ? 1 : 0;
    this.procE = this.procId("e");
    this.t = 0;
    this.estado = 0;
    this.vel = 0;
    this.acel = 0;
    this.giro = this.rotJ.y;
    this.tambor = 0;
    this.espera = 0;
    this.nVoz = 0;
    this.ruedas = [ 0, 0, 0, 0, 0 ];
    this.dobla = 0;
    this.G = {
      listo: 0,
      luz: 0,
      banderas: 0
    };
    this.luz368 = 0;
    this.hlVisible = false;
    this.msgs = [];
    this.balas = [];
    this.efx = [];
    this.registro = [];
    this.frame = 0;
    this.meryl = null;
    this.snake = null;
    receptores.add(this);
    engancharMensajes(this.ctx.guion || (typeof window !== "undefined" ? window.__mgs?.guion : null));
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 1e3) this.registro.shift();
  }
  async iniciar() {
    this.rec = new Recursos(this.ctx);
    await this.rec.cargar([ "jeep_b", "jeep_t", "jeep_hl", "jeep_7607", "jeep_gun", "snake", this.c ? "otacom" : "meryl" ], [ "sne_19b", "mel_19a" ]);
    if (!this.vivo) return;
    this.raiz = new THREE.Group;
    this.raiz.name = "pk_jeep";
    this.raiz.userData.actor = this.actor;
    this.mgr.mundo.add(this.raiz);
    this.o = this.raiz;
    this.ponerRaiz();
    const teñir = o => {
      if (o) {
        this.raiz.add(o);
        this.ctx.teñir?.(o);
        o.traverse(m => {
          if (m.isMesh) m.castShadow = true;
        });
      }
      return o;
    };
    this.cuerpoJ = teñir(this.rec.nuevo("jeep_b"));
    this.tJ = new Cuerpo(this.rec, "jeep_t", null, this.raiz);
    this.ctx.teñir?.(this.tJ.o);
    const luzMat = o => {
      o?.traverse(m => {
        if (m.isMesh) {
          m.material = m.material.clone();
          m.castShadow = false;
          m.userData.luz = true;
        }
      });
      return o;
    };
    this.cono = luzMat(this.rec.nuevo("jeep_7607"));
    if (this.cono) this.raiz.add(this.cono);
    this.hl = luzMat(this.rec.nuevo("jeep_hl"));
    if (this.hl) {
      this.raiz.add(this.hl);
      this.hl.visible = false;
    }
    this.arma = new THREE.Group;
    this.arma.name = "jeep_gun";
    this.raiz.add(this.arma);
    const g = this.rec.nuevo("jeep_gun");
    if (g) {
      this.arma.add(g);
      this.ctx.teñir?.(g);
    }
    this.arma.position.set(PIVOTE.x * MM, PIVOTE.y * MM, PIVOTE.z * MM);
    this.pitchArma = 0;
    this.yawArma = 0;
    this.voces();
    this.pared(true);
    this.mando = new Mando(this.mgr);
    this.log("inicio", {
      c: this.c,
      e: this.procE
    });
  }
  async voces() {
    const mgr = this.mgr;
    if (!this.listaVoces) {
      let lista = null;
      try {
        const st = await fetch("assets/guion/st/s19a.json").then(r => r.json()), vs = [];
        const ver = (x, n = 0) => {
          if (!x || typeof x !== "object" || n > 60) return;
          if (Array.isArray(x)) {
            for (const y of x) ver(y, n + 1);
            return;
          }
          if (x.cmd === "chara" && x.tipo === "VOICESYS") vs.push(x);
          for (const v of Object.values(x)) if (v && typeof v === "object") ver(v, n + 1);
        };
        ver(st);
        lista = vs[this.c]?.args?.find(a => a?.opt === "v")?.v || null;
      } catch {}
      if (!lista) {
        const nv = await fetch("assets/niveles/s19a/nivel.json").then(r => r.json()).catch(() => null);
        lista = (nv?.actores || []).filter(a => a.tipo === "VOICESYS")[this.c]?.opts?.v || [];
      }
      this.listaVoces = lista.filter(x => typeof x === "number");
    }
    if (!this.vivo) return;
    const lista = this.listaVoces;
    if (mgr.voicesys) {
      const vc = mgr.voicesys.g.voxCodes, nuevas = [];
      for (let i = 0; i < lista.length && i < vc.length; i++) if (vc[i] === 0 && lista[i] > 0) {
        vc[i] = lista[i];
        nuevas.push(lista[i]);
      }
      if (mgr.voicesys.g.voxCode2 === 0 && vc[mgr.voicesys.g.index1] > 0) mgr.voicesys.g.voxCode2 = vc[mgr.voicesys.g.index1];
      if (nuevas.length) {
        mgr.flujo?.precargar(nuevas);
        this.log("voces completadas", {
          n: nuevas.length
        });
      }
      return;
    }
    mgr.flujo?.parar();
    mgr.flujo = new Flujo({
      voces: this.ctx.voces,
      simulado: !!this.ctx.vocesSimuladas
    });
    mgr.voicesys = new VoiceSys(lista, mgr.flujo);
    mgr.voicesys.cargando = mgr.flujo.precargar(lista.filter(x => x > 0));
    this.log("voicesys", {
      n: lista.length
    });
  }
  get vs() {
    return this.mgr.voicesys;
  }
  recibir(d, v) {
    if (!Array.isArray(v)) return false;
    if (d === H.JEEP) {
      this.msgs.push(v[0] & 65535);
      this.log("mensaje", {
        m: (v[0] & 65535).toString(16)
      });
      return true;
    }
    if (d === H.VOICESYS && this.vs) {
      if (this.gameOverTimer() > 0) return true;
      const m = v[0] & 65535, vs = this.vs;
      if (m === H.VOZ_FUERA) vs.CE5F8(v[1] | 0, 1); else if (m === H.KILL) {
        vs.f.parar();
        this.mgr.voicesys = null;
      } else if (m === H.VOZ_SIG) vs.CE2D0(); else if (m === H.VOZ_CORTA) vs.CE300(); else return false;
      return true;
    }
    return false;
  }
  mensaje800DB954() {
    let r = -1;
    for (const m of this.msgs.splice(0)) {
      const i = MSG_JEEP.indexOf(m);
      if (i >= 0) r = i;
    }
    return r;
  }
  hayMuneco() {
    return this.mgr.lista.some(j => j.vivo !== false && j !== this && DOLLS.includes(j.nombre ?? j.actor?.nombre) && (j.actor?.tipo === "DEMODOLL" || j.actor?.tipo === "DOLL"));
  }
  cuadro() {
    if (!this.raiz) return;
    this.frame++;
    this.act800DC0C4();
    this.meryl?.act800DE874();
    this.snake?.act800DD2A4();
    for (const b of this.balas.slice()) b.act();
    for (const f of this.efx.slice()) {
      f.t++;
      f.fn?.(f.t);
      if (f.t >= f.dur) {
        f.fin();
        this.efx.splice(this.efx.indexOf(f), 1);
      }
    }
    this.alVisor();
  }
  act800DC0C4() {
    const G = this.G, vs = this.vs, J = this.J;
    if (this.estado < 3 && this.gameOverTimer() !== 0 && (J.vida ?? 1) <= 0) vs?.CE734();
    const m = this.mensaje800DB954();
    const t = ++this.t;
    switch (this.estado) {
     case 0:
      if (!this.hayMuneco()) {
        this.estado = 1;
        this.t = 0;
        G.banderas = 4096;
        this.meryl = new MerylPk(this);
        this.log("Meryl en el asiento");
        this.voces();
      }
      break;

     case 1:
      if (m === 1) G.banderas |= 65536;
      if (G.listo === 1) {
        this.estado = 2;
        this.t = 0;
        vs?.CE2D0();
        G.luz = 255;
        this.hlVisible = true;
        this.luz368 = 128;
        this.log("arrancó");
        this.correrE(7310);
      } else {
        G.luz = trunc(G.luz / 2);
        this.luz368 = G.luz;
      }
      break;

     case 2:
      {
        G.banderas |= 8192;
        if (m !== 2) {
          if (++this.espera < 451) break;
          const n = this.nVoz;
          this.espera = 0;
          this.nVoz = n + 1;
          let s = 3;
          if (n === 1) s = 8; else if (n > 1) {
            if (n === 2) {
              vs?.CE5F8(9, 1);
              this.nVoz = 0;
            }
            break;
          } else {
            s = 7;
            if (n !== 0) break;
          }
          vs?.CE5F8(s, 1);
          break;
        }
        this.estado = 3;
        this.t = 0;
        this.log("sube Snake");
        break;
      }

     case 3:
      if (m === 3) this.tambor = 1;
      if (t === 1) {
        this.vel = 0;
        this.matarSnake();
        this.snake = new SnakePk(this);
      } else if (t < 15) {
        this.vel = nearSpeed(this.vel, 400, 30);
        this.giro = nearSpeed(this.giro, 1536, 60);
        this.mover800DCE44(this.giro, this.vel);
        G.banderas |= 32;
        this.embestir800DD12C(this.vel);
        if (t === 2) {
          this.se(SE.ARRANCA, this.p3());
          this.vibrar(2);
        }
      } else if (t < 20) {
        this.giro = nearExp4(this.giro, 1536);
        this.mover800DCE44(this.giro, this.vel);
        this.embestir800DD12C(this.vel);
      } else if (t < 90) {
        this.vel = nearExp4(this.vel, 0);
        this.giro = nearExp4(this.giro, 1536);
        this.mover800DCE44(this.giro, this.vel);
        this.embestir800DD12C(this.vel);
        if (t === 89) vs?.CE5F8(11, 1);
      } else if (this.tambor) {
        this.estado = 4;
        this.t = 0;
        this.log("tambor: sale");
      }
      this.invencible = false;
      break;

     case 4:
      this.estado4(t);
      break;

     default:
      break;
    }
    if (this.pos.z < -25e3) {
      this.vel = 0;
      this.pos.z = -25e3;
    }
    const s = trunc(this.vel * 4096 / 2199);
    for (let i = 1; i <= 4; i++) this.ruedas[i] = this.ruedas[i] + s & 4095;
    this.dobla = this.giro - this.rotJ.y;
  }
  estado4(t) {
    const G = this.G, vs = this.vs;
    if (t === 4) {
      voicesysCE6AC(vs, 1);
      vs?.CE2D0();
    }
    if (t < 30) {
      this.acel = 0;
      if (t === 20) G.banderas = 131584;
      return;
    }
    if (t < 40) {
      this.giro = nearExp4(this.giro, this.rotJ.y);
      this.vel = nearSpeed(this.vel, -300, this.acel);
      this.acel = nearSpeed(this.acel, 30, 4);
      this.mover800DCE44(this.giro, this.vel);
      this.embestir800DD12C(this.vel);
      if (t === 30) {
        this.se(SE.ATRAS, this.p3());
        this.vibrar(2);
      }
      return;
    }
    if (t < 50) {
      this.giro = nearExp4(this.giro, this.rotJ.y - 200);
      this.vel = nearSpeed(this.vel, -300, this.acel);
      this.acel = nearSpeed(this.acel, 30, 4);
      this.mover800DCE44(this.giro, this.vel);
      if (t === 49) this.acel = 0;
      this.embestir800DD12C(this.vel);
    } else {
      if (t < 60) {
        this.giro = nearExp4(this.giro, this.rotJ.y);
        this.vel = nearExp8(this.vel, 0);
        this.mover800DCE44(this.giro, this.vel);
        if (this.vel === 0) this.t = 60;
        this.embestir800DD12C(this.vel);
        return;
      }
      if (t < 80) {
        this.acel = 0;
        this.vel = 2;
        if (this.gameOverTimer() !== 0) this.t = 70;
        this.invencible = true;
        if (this.t === 70) G.banderas = 32;
        return;
      }
      if (t > 209) {
        this.estado = 5;
        this.t = 0;
        this.log("fin");
        return;
      }
      this.giro = nearSpeed(this.giro, 2048, 40);
      this.vel = nearSpeed(this.vel, 700, this.acel);
      this.acel = nearSpeed(this.acel, 30, 4);
      this.mover800DCE44(this.giro, this.vel);
      this.embestir800DD12C(this.vel);
      if (t === 80) {
        this.se(SE.SALE, this.p3());
        this.vibrar(2);
        this.log("sale");
      }
      if (t !== 120) return;
    }
    G.banderas &= ~131584;
  }
  mover800DCE44(giro, vel) {
    const ry = this.rotJ.y;
    const F = rotY(ry, {
      x: 0,
      y: 0,
      z: EJE
    }), V = rotY(ry, {
      x: 0,
      y: 0,
      z: vel
    }), W = rotY(giro, {
      x: 0,
      y: 0,
      z: vel
    });
    this.pos.x += Math.trunc(V.x);
    this.pos.z += Math.trunc(V.z);
    const nf = {
      x: F.x + W.x - V.x,
      z: F.z + W.z - V.z
    };
    this.rotJ.y = ratan2(nf.x, nf.z);
    this.pared(false);
  }
  embestir800DD12C(vel) {
    const off = vel < 1 ? EMBESTIDA.atras : EMBESTIDA.adelante, c = this.punto(off), h = EMBESTIDA.medio;
    let pego = false;
    for (const g of this.J.activos?.() || []) {
      if ([ "muerto", "cuelloRoto" ].includes(g.accion) || g.__jefe) continue;
      const q = g.o.position;
      if (Math.abs(q.x * 1e3 - c.x) <= h.x + 150 && Math.abs(q.z * 1e3 - c.z) <= h.z + 150 && q.y * 1e3 + 900 >= c.y - h.y - 750 && q.y * 1e3 + 900 <= c.y + h.y + 750) {
        this.J.dañar(g, 256, 1);
        pego = true;
      }
    }
    if (golpeCajaExtras(new THREE.Vector3(c.x * MM, c.y * MM, c.z * MM), new THREE.Vector3(h.x * MM, h.y * MM, h.z * MM), 2, 256)) pego = true;
    if (pego) {
      this.se(SE.EMBISTE, new THREE.Vector3(c.x, c.y, c.z), "bomba");
      this.vibrar(2);
    }
  }
  punto(off) {
    const r = rotY(this.rotJ.y, off);
    return {
      x: Math.round(this.pos.x + r.x),
      y: Math.round(this.pos.y + off.y),
      z: Math.round(this.pos.z + r.z)
    };
  }
  p3() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 900, this.pos.z);
  }
  correrE(arg) {
    if (!this.procE) return;
    const ok = this.mgr.correrProc(this.procE, [ arg ]);
    this.log("-e", {
      proc: this.procE,
      arg: arg.toString(16),
      guion: ok
    });
  }
  vibrar(n) {
    try {
      ctl.vibrarCuadros(n);
    } catch {}
  }
  pared(si) {
    const P = this.ctx.paredes;
    if (!P) return;
    if (si && !this.paredM) {
      const pos = [];
      for (let i = 0; i < 4; i++) {
        const a = ESQUINAS[i], b = ESQUINAS[i + 1 & 3];
        const A = rotY(this.rotJ.y, {
          x: a[0],
          y: 0,
          z: a[1]
        }), B = rotY(this.rotJ.y, {
          x: b[0],
          y: 0,
          z: b[1]
        });
        const ax = (this.pos.x + A.x) * MM, az = (this.pos.z + A.z) * MM, bx = (this.pos.x + B.x) * MM, bz = (this.pos.z + B.z) * MM, y0 = this.pos.y * MM, y1 = y0 + 2;
        pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
      }
      const geo = new THREE.BufferGeometry;
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
      }));
      m.userData.propio = m.userData.sinColision = true;
      this.mgr.mundo.add(m);
      P.push(m);
      this.paredM = m;
    } else if (!si && this.paredM) {
      const i = P.indexOf(this.paredM);
      if (i >= 0) P.splice(i, 1);
      this.paredM.removeFromParent();
      this.paredM.geometry.dispose();
      this.paredM = null;
    }
  }
  matarSnake() {
    const w = typeof window !== "undefined" ? window : {};
    if (this.ctx.congelar) this.ctx.congelar(true); else this.mgr.congelar(true);
    this.ocultos = [];
    const ocultar = o => {
      if (!o || this.ocultos.some(x => x.o === o)) return;
      const d = Object.getOwnPropertyDescriptor(o, "visible"), r = {
        o: o,
        d: d,
        v: o.visible
      };
      Object.defineProperty(o, "visible", {
        configurable: true,
        get: () => false,
        set: v => {
          r.v = v;
        }
      });
      this.ocultos.push(r);
    };
    this.ocultar = () => {
      ocultar(w.__mgs?.cuerpo?.obj);
      ocultar(w.__mgs?.arma);
    };
    this.ocultar();
    const A = this.ctx.armas || this.mgr.ctx.armas;
    if (A && !A.__jeep19a) {
      A.__jeep19a = {
        disparar: A.disparar,
        soltar: A.soltar
      };
      A.disparar = (...a) => {
        if (this.vivo && this.snake) {
          this.mando.tactil = true;
          return null;
        }
        return A.__jeep19a.disparar.apply(A, a);
      };
      A.soltar = (...a) => {
        this.mando.tactil = false;
        if (!(this.vivo && this.snake)) return A.__jeep19a.soltar?.apply(A, a);
      };
      this.armas = A;
    }
    if (typeof document !== "undefined" && !this.estilo) {
      this.estilo = document.createElement("style");
      this.estilo.textContent = "#mira{visibility:hidden!important}";
      document.head.appendChild(this.estilo);
    }
    this.mgr.camaraEspecial = () => this.vivo && this.snake ? this.snake.camara() : null;
    this.log("kill a Snake");
  }
  alVisor() {
    const sn = this.snake;
    if (!sn?.pies) return;
    const rig = this.J.ctx.rig;
    if (rig) rig.position.copy(sn.pies);
    this.ocultar?.();
  }
  ponerRaiz() {
    this.raiz.position.set(this.pos.x * MM, this.pos.y * MM, this.pos.z * MM);
    this.raiz.rotation.set(this.rotJ.x * ANG, this.rotJ.y * ANG, 0, "YXZ");
    this.raiz.updateMatrixWorld(true);
  }
  dibujar() {
    if (!this.raiz) return;
    this.ponerRaiz();
    const hs = this.tJ?.huesos;
    if (hs?.length) for (let i = 1; i <= 4; i++) {
      const h = hs[i];
      if (h) h.rotation.set(this.ruedas[i] * ANG, i >= 3 ? this.dobla * ANG : 0, 0, "ZYX");
    }
    const k = Math.max(0, Math.min(2, this.luz368 / 128));
    this.cono?.traverse(m => {
      if (m.userData.luz) m.material.color.setScalar(k);
    });
    this.cono && (this.cono.visible = k > .01);
    if (this.hl) this.hl.visible = this.hlVisible;
    this.arma.rotation.set(this.pitchArma * ANG, this.yawArma * ANG, 0, "YXZ");
    this.meryl?.dibujar();
    this.snake?.dibujar();
    this.raiz.updateMatrixWorld(true);
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    receptores.delete(this);
    this.pared(false);
    this.raiz?.removeFromParent();
    for (const b of this.balas.slice()) b.destruir();
    for (const f of this.efx) f.fin();
    this.efx = [];
    this.mando?.destruir();
    for (const r of this.ocultos || []) {
      delete r.o.visible;
      if (r.d) Object.defineProperty(r.o, "visible", r.d); else r.o.visible = r.v;
    }
    if (this.armas?.__jeep19a) {
      this.armas.disparar = this.armas.__jeep19a.disparar;
      this.armas.soltar = this.armas.__jeep19a.soltar;
      delete this.armas.__jeep19a;
    }
    this.estilo?.remove();
    if (this.snake) {
      this.mgr.camaraEspecial = null;
      if (this.ctx.congelar) this.ctx.congelar(false); else this.mgr.congelar(false);
    }
  }
}

function voicesysCE6AC(vs, arg) {
  if (!vs) return;
  const g = vs.g;
  if (g.field_28 === 0 && g.flags & 2) {
    g.field_18 = 0;
    if (vs.f.estado !== 2) {
      vs.f.parar();
      g.field_8 = 5;
      return;
    }
    if (arg === 1) vs.CE300();
  }
}

class MerylPk {
  constructor(jeep) {
    this.jeep = jeep;
    this.G = jeep.G;
    const ota = !!jeep.c;
    this.cuerpo = new Cuerpo(jeep.rec, ota ? "otacom" : "meryl", "mel_19a", jeep.raiz);
    jeep.ctx.teñir?.(this.cuerpo.o);
    this.se818 = ota ? 133 : 130;
    this.se81A = ota ? 134 : 131;
    this.se81C = ota ? 135 : 132;
    this.f7E4 = 0;
    this.cabeza = 0;
    this.f800 = 0;
    this.estado = null;
    this.t = 0;
    this.cuerpo.config(14, 0);
    this.cuerpo.tick();
  }
  config(a, interp = 4) {
    this.accion = a;
    this.cuerpo.config(a, interp);
  }
  cambiar(fn) {
    this.estado = fn;
    this.t = 0;
  }
  act800DE874() {
    this.f800 = this.G.banderas;
    this.G.banderas &= 4294901760;
    const old = this.t++;
    if (!this.estado) {
      this.estado = this.llave800DEDCC;
      this.config(14, 0);
    }
    this.estado(old);
    this.cuerpo.tick();
    this.cabeza = nearSpeed(this.cabeza, this.f7E4, 200);
    if (this.cuerpo.adjust?.[6]) this.cuerpo.adjust[6][1] = this.cabeza;
  }
  decidir800DECBC() {
    const f = this.f800;
    if (f & 2) this.cambiar(this.golpe800DF374); else if (f & 1) this.cambiar(this.quieta800DED84); else if (f & 32) this.cambiar(this.agarra800DF084); else if (f & 512) this.cambiar(this.agarra800DF1FC); else if (f & 4096) this.cambiar(this.llave800DEDCC); else if (f & 8192) this.cambiar(this.mira800DEFB0); else return 0;
    return 1;
  }
  quieta800DED84(t) {
    if (t === 0) this.config(0);
    this.decidir800DECBC();
  }
  llave800DEDCC(t) {
    if (t === 0) this.config(14);
    if (t === 1) this.jeep.se(178, this.cuerpo.punto(0).multiplyScalar(1e3));
    if ((t & 3) === 2) this.G.luz = 255;
    if (this.cuerpo.isEnd) {
      if (this.f800 & 65536) this.cambiar(this.arranca800DEEC4); else this.t = 0;
    }
  }
  arranca800DEEC4(t) {
    if (t === 0) this.config(14);
    if (t === 1) this.jeep.se(177, this.cuerpo.punto(0).multiplyScalar(1e3));
    if ((t & 3) === 2) this.G.luz = 255;
    if (this.cuerpo.isEnd) {
      this.G.listo = 1;
      this.cambiar(this.quieta800DED84);
      this.jeep.log("Meryl: motor en marcha");
    }
  }
  mira800DEFB0(t) {
    if (t === 0) this.config(0);
    const s = this.jeep.J.ctx.rig?.position, h = this.cuerpo.punto(0);
    if (s) {
      const dx = (s.x - h.x) * 1e3, dz = (s.z - h.z) * 1e3;
      let u = -ratan2(dz, dx) & 4095;
      if (u & 2048) u -= 4096;
      this.f7E4 = Math.max(-1024, Math.min(1024, u));
    }
    if (!(this.f800 & 8192)) {
      this.cambiar(this.quieta800DED84);
      this.f7E4 = 0;
    }
  }
  agarra800DF084(t) {
    if (t === 0) this.config(7);
    if (!this.decidir800DECBC() && this.cuerpo.isEnd) this.cambiar(this.agarra800DF100);
  }
  agarra800DF100(t) {
    if (t === 0) this.config(8, 0);
    if (!this.decidir800DECBC() && !(this.f800 & 131072)) this.cambiar(this.agarra800DF180);
  }
  agarra800DF180(t) {
    if (t === 0) this.config(9);
    if (!this.decidir800DECBC() && this.cuerpo.isEnd) this.cambiar(this.quieta800DED84);
  }
  agarra800DF1FC(t) {
    if (t === 0) this.config(1);
    if (!this.decidir800DECBC() && this.cuerpo.isEnd) this.cambiar(this.agarra800DF278);
  }
  agarra800DF278(t) {
    if (t === 0) this.config(2, 0);
    if (!this.decidir800DECBC() && !(this.f800 & 131072)) this.cambiar(this.agarra800DF2F8);
  }
  agarra800DF2F8(t) {
    if (t === 0) this.config(3);
    if (!this.decidir800DECBC() && this.cuerpo.isEnd) this.cambiar(this.quieta800DED84);
  }
  golpe800DF374(t) {
    if (t === 0) {
      this.config(13);
      this.jeep.se(this.se818, this.cuerpo.punto(0).multiplyScalar(1e3));
    }
    if (this.cuerpo.isEnd) this.cambiar(this.quieta800DED84);
  }
  dibujar() {
    const alt = this.cuerpo.altura;
    this.cuerpo.raiz.position.set(MERYL_POS.x * MM, (MERYL_POS.y - alt) * MM, MERYL_POS.z * MM);
    this.cuerpo.pose();
  }
}

const ACC = {
  NORMAL: 0,
  GOLPE: 1,
  IZQ: 2,
  DER: 3,
  MUERE: 4,
  MUERTO: 5
};

class SnakePk {
  constructor(jeep) {
    this.jeep = jeep;
    this.J = jeep.J;
    this.cuerpo = new Cuerpo(jeep.rec, "snake", "sne_19b", jeep.raiz);
    jeep.ctx.teñir?.(this.cuerpo.o);
    this.f8D4 = 0;
    this.f8D6 = 0;
    this.f8CE = jeep.rotJ.y;
    this.f908 = 0;
    this.f90C = 0;
    this.f904 = 0;
    this.f92C = 0;
    this.f940 = 0;
    this.f944 = 0;
    this.f948 = 0;
    this.f950 = 0;
    this.c6048 = 0;
    this.fp = 0;
    this.f7E0 = {
      x: 0,
      y: 0,
      z: 0
    };
    this.estado = null;
    this.t = 0;
    this.accion = -1;
    this.vidaAnt = this.J.vida;
    this.pies = null;
    this.config(ACC.NORMAL);
    this.ubicar();
  }
  config(a) {
    if (this.accion !== a) {
      this.accion = a;
      this.cuerpo.config(a, 4);
      this.f7E0 = {
        x: 0,
        y: 0,
        z: 0
      };
    }
  }
  cambiar(fn) {
    this.estado = fn;
    this.t = 0;
  }
  act800DD2A4() {
    const J = this.J, jeep = this.jeep;
    this.cuerpo.tick();
    const paso = this.cuerpo.motor?.paso || [ 0, 0 ];
    this.f7E0.x += paso[0];
    this.f7E0.z += paso[1];
    this.f7E0.y = this.cuerpo.altura - 503;
    if (J.muerto && !this.f950) {
      this.f950 = 1;
      jeep.log("Snake muerto");
    }
    this.input800DE154();
    this.estados800DE074();
    this.ubicar();
    if (jeep.gameOverTimer() === 0 && !J.muerto) {
      if (J.vida < this.vidaAnt) {
        if (jeep.invencible || this.f944 > 0) J.vida = this.vidaAnt; else this.golpeado = true;
      }
    }
    this.vidaAnt = J.vida;
    if (this.f944 === 0) this.cuerpo.visible(true); else {
      this.cuerpo.visible((this.f944 & 2) === 0);
      this.f944--;
    }
    if (this.f948) this.cuerpo.visible(false);
  }
  input800DE154() {
    const jeep = this.jeep;
    let x = 0, y = 0, st = 0, raton = 0;
    this.f92C = 0;
    if (this.f950 === 0) {
      const m = jeep.mando.leer();
      st = m.status;
      raton = m.raton || 0;
      if (m.analog) {
        const z = v => (v < 0 ? Math.min(0, v + 64) : Math.max(0, v - 64)) * 2;
        x = z(m.analog[0]);
        y = z(m.analog[1]);
      }
      if (x === 0 && y === 0) {
        if (st & PAD.IZQ) x = -128;
        if (st & PAD.DER) x = 127;
        if (st & PAD.ARR) y = -128;
        if (st & PAD.ABA) y = 127;
      }
    }
    if (this.fp) {
      if (this.c6048 < 15) this.c6048++;
    } else if (this.c6048 > 0) this.c6048--;
    this.f948 = this.c6048 >= (this.fp ? 13 : 18) ? 1 : 0;
    let botones = st;
    if (this.f940 !== 0 && this.f950 === 0) {
      x = 0;
      y = 0;
      raton = 0;
      botones = this.fp ? st & 4095 | PAD.TRIANGULO : 0;
    }
    this.f908 -= trunc(x / 4);
    this.f908 -= Math.round(raton * 1.5);
    if (x < 0 || raton < 0) this.f92C |= 2; else if (x > 0 || raton > 0) this.f92C |= 4;
    this.f8D6 = nearExp4P(this.f8D6, this.f908);
    const vuelta = Math.round(this.f908 / 4096) * 4096;
    if (vuelta) {
      this.f908 -= vuelta;
      this.f8D6 -= vuelta;
    }
    this.f90C = nearExp4P(this.f90C, this.fp ? trunc(y * 300 / 128) : 0);
    if (this.f904 !== 0) this.f904--;
    if (st & PAD.CUADRADO && this.f904 === 0) {
      this.f904 = 3;
      this.f92C |= 1;
    }
    this.fp = botones & PAD.TRIANGULO ? 1 : 0;
    this.f8CE = this.f8D6 + jeep.rotJ.y & 4095;
    const piv = jeep.punto(PIVOTE);
    let mejor = null, min = 6100;
    for (const h of this.homing()) {
      const d = {
        x: h.x - piv.x,
        y: h.y - piv.y,
        z: h.z - piv.z
      }, l = Math.round(Math.hypot(d.x, d.y, d.z));
      if (l >= min) continue;
      const dir = ratan2(d.x, d.z) & 4095;
      if (Math.abs(difS(this.f8CE, dir)) < 128) {
        min = l;
        mejor = (ratan2(l, d.y) & 4095) - 1024;
      }
    }
    this.f8D4 = nearExp4(this.f8D4, mejor === null ? 0 : mejor);
    jeep.pitchArma = this.f8D4;
    jeep.yawArma = this.f8D6;
  }
  homing() {
    const out = [];
    for (const g of this.J.activos?.() || []) if (![ "muerto", "cuelloRoto" ].includes(g.accion) && !g.__jefe && g.o) out.push({
      x: g.o.position.x * 1e3,
      y: g.o.position.y * 1e3 + 900,
      z: g.o.position.z * 1e3
    });
    for (const p of homingExtras()) out.push({
      x: p.x * 1e3,
      y: p.y * 1e3,
      z: p.z * 1e3
    });
    return out;
  }
  estados800DE074() {
    const old = this.t++;
    if (!this.estado) {
      this.estado = this.normal800DDC34;
      this.config(ACC.NORMAL);
    }
    this.estado(old);
  }
  golpe800DDB2C() {
    if (!this.golpeado) return false;
    this.golpeado = false;
    this.cambiar(this.golpe800DDD94);
    this.jeep.vibrar(3);
    this.f944 = 4;
    this.f908 += randS(512);
    return true;
  }
  normal800DDC34(t) {
    const fl = this.f92C;
    if (this.golpe800DDB2C()) return;
    if (fl & 1) this.tirar800DDB90();
    if (t === 0 && this.accion !== ACC.NORMAL) this.config(ACC.NORMAL);
    if (fl & 2) this.config(ACC.IZQ); else if (fl & 4) this.config(ACC.DER); else if (this.accion !== ACC.NORMAL) this.config(ACC.NORMAL);
  }
  golpe800DDD94(t) {
    this.f944 = 4;
    if (t === 0) {
      this.f940 = 1;
      this.config(ACC.GOLPE);
      this.jeep.sangre(this.cuerpo.punto(5));
      if (!this.J.muerto && (this.J.vida ?? 1) > 0) this.jeep.se(SE.AY, this.cuerpo.punto(0).multiplyScalar(1e3));
    }
    if (this.cuerpo.isEnd) {
      if (this.f950 === 0) {
        this.cambiar(this.normal800DDC34);
        this.config(ACC.NORMAL);
        this.f940 = 0;
        this.f944 = 45;
      } else this.cambiar(this.muere800DDEF0);
    }
  }
  muere800DDEF0(t) {
    const vs = this.jeep.vs;
    if (t === 0) {
      this.config(ACC.MUERE);
      if (vs) {
        vs.CE310();
        vs.CE5F8(12, 1);
        vs.CE734();
      }
    }
    if (t === 61) {
      this.jeep.vibrar(10);
      this.jeep.se(SE.MUERE, this.cuerpo.punto(0).multiplyScalar(1e3), "bomba");
    }
    if (this.cuerpo.isEnd) this.cambiar(this.muerto800DDFFC);
  }
  muerto800DDFFC(t) {
    if (t === 0) this.config(ACC.MUERTO);
  }
  tirar800DDB90() {
    const a = this.jeep.arma;
    a.updateMatrixWorld(true);
    const boca = new THREE.Vector3(BOCA.x * MM, BOCA.y * MM, BOCA.z * MM).applyMatrix4(a.matrixWorld);
    const q = new THREE.Quaternion;
    a.getWorldQuaternion(q);
    const d = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();
    this.jeep.balas.push(new BalaPk(this.jeep, boca, d));
    this.jeep.se(SE.TIRO, boca.clone().multiplyScalar(1e3));
    this.jeep.fogonazo(boca);
    this.tiros = (this.tiros || 0) + 1;
  }
  ubicar() {
    const yaw = this.f8D6, off = rotY(yaw, {
      x: SNAKE_OFF.x + this.f7E0.x,
      y: 0,
      z: SNAKE_OFF.z + this.f7E0.z
    });
    this.cuerpo.raiz.position.set((PIVOTE.x + off.x) * MM, (PIVOTE.y + SNAKE_OFF.y - 503) * MM, (PIVOTE.z + off.z) * MM);
    this.cuerpo.raiz.rotation.set(0, yaw * ANG, 0);
    this.jeep.ponerRaiz();
    this.pies = this.cuerpo.raiz.getWorldPosition(this.pies || new THREE.Vector3);
  }
  camara() {
    const v = typeof window !== "undefined" ? window.__mgs?.vistaActual : "primera";
    if (!this.fp && v === "arriba") return null;
    const dir = new THREE.Vector3(Math.sin(this.f8CE * ANG) * Math.cos(this.f90C * ANG), -Math.sin(this.f90C * ANG), Math.cos(this.f8CE * ANG) * Math.cos(this.f90C * ANG));
    if (!this.fp && v === "hombro") {
      const piv = new THREE.Vector3(PIVOTE.x * MM, PIVOTE.y * MM, PIVOTE.z * MM).applyMatrix4(this.jeep.raiz.matrixWorld);
      return {
        pos: piv.clone().addScaledVector(dir, -2.6).add(new THREE.Vector3(0, .9, 0)),
        mira: piv.clone().addScaledVector(dir, 6),
        verSnake: true
      };
    }
    const ojo = this.cuerpo.punto(6, {
      x: 0,
      y: 60,
      z: 80
    });
    return {
      pos: ojo,
      mira: ojo.clone().add(dir)
    };
  }
  dibujar() {
    this.cuerpo.pose();
  }
}

class BalaPk {
  constructor(jeep, boca, dir) {
    this.jeep = jeep;
    this.p = boca.clone();
    this.d = dir.clone();
    this.rec = 0;
    this.vivo = true;
    this.mesh = jeep.J.ctx.balaVisual?.(boca, dir) || null;
  }
  act() {
    const J = this.jeep.J, paso = .75, A = this.jeep.ctx.armas || this.jeep.mgr.ctx.armas;
    let lejos = paso, pared = false;
    const h = A?.pared?.(this.p, this.d, paso);
    if (h) {
      lejos = h.distance;
      pared = true;
    }
    const gg = A?.guardiaEn?.(this.p, this.d, lejos);
    if (gg) {
      J.dañar(gg.g, 64, 1);
      this.fin(this.p.clone().addScaledVector(this.d, gg.dist));
      return;
    }
    const gx = golpeBalaExtras(this.p, this.d, this.p.clone().addScaledVector(this.d, lejos), 64);
    if (gx) {
      this.fin(gx.punto);
      return;
    }
    if (pared) {
      this.jeep.mgr.chispa(this.p.clone().addScaledVector(this.d, lejos), .3, 3, 16769184);
      this.fin();
      return;
    }
    this.p.addScaledVector(this.d, paso);
    this.rec += paso;
    if (this.mesh) this.mesh.position.copy(this.p);
    if (this.rec >= 10) this.fin();
  }
  fin() {
    this.destruir();
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.mesh?.removeFromParent();
    const l = this.jeep.balas, i = l.indexOf(this);
    if (i >= 0) l.splice(i, 1);
  }
}

PkJeep.prototype.efecto = function(o, dur, fn) {
  this.mgr.mundo.add(o);
  const f = {
    o: o,
    t: 0,
    dur: dur,
    fn: fn,
    fin: () => {
      o.removeFromParent();
      o.material?.dispose?.();
    }
  };
  this.efx.push(f);
  return f;
};

PkJeep.prototype.fogonazo = function(p) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: this.rec.textura("m60_flash"),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  s.position.copy(p);
  s.scale.setScalar(.3 + Math.random() * .1);
  s.material.rotation = Math.random() * 6.28;
  s.userData.sinColision = true;
  this.efecto(s, 2, null);
};

PkJeep.prototype.sangre = function(p) {
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.rec.textura("blood_1"),
      color: 11145232,
      transparent: true,
      depthWrite: false
    }));
    s.position.copy(p);
    s.scale.setScalar(.08);
    s.userData.sinColision = true;
    const v = new THREE.Vector3((Math.random() - .5) * .03, Math.random() * .025, (Math.random() - .5) * .03);
    this.efecto(s, 16, t => {
      s.position.add(v);
      v.y -= .004;
      s.material.opacity = 1 - t / 16;
    });
  }
};
