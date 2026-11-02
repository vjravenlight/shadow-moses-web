// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const MM = .001, ANG = Math.PI * 2 / 4096, FPS = 30;

const num = (a, k, d, i = 0) => typeof a.opts?.[k]?.[i] === "number" ? a.opts[k][i] : d;

const lista = (a, k) => Array.isArray(a.opts?.[k]) ? a.opts[k].filter(v => typeof v === "number") : [];

const idDe = (a, k, i = 0) => {
  const v = a.opts?.[k]?.[i];
  return v && typeof v === "object" ? v.id ?? v.proc ?? null : typeof v === "number" ? v : null;
};

const procDe = (a, k) => a.opts?.[k]?.find?.(v => v && typeof v === "object" && "proc" in v)?.proc ?? null;

const v3 = (p, i = 0) => new THREE.Vector3(p[i] * MM, p[i + 1] * MM, p[i + 2] * MM);

const eulerYXZ = d => new THREE.Euler((d?.[0] || 0) * ANG, (d?.[1] || 0) * ANG, (d?.[2] || 0) * ANG, "YXZ");

const rsin = a => Math.round(Math.sin(a * ANG) * 4096);

const rcos = a => Math.round(Math.cos(a * ANG) * 4096);

const nearSpeed = (de, a, vel) => Math.abs(a - de) <= vel ? a : de + Math.sign(a - de) * vel;

const hex4 = n => (n & 65535).toString(16).padStart(4, "0");

const rutaModelo = (E, a, id) => {
  const st = /niveles\/([^/]+)\//.exec(a.modelo || "")?.[1] || E.ctx.st?.();
  return id == null || !st ? null : `niveles/${st}/${hex4(id)}.glb`;
};

const H = {
  ON2: 53634,
  OFF2: 107,
  KILL: 12835,
  ENTRAR: 3538,
  SALIR: 54732,
  ON: 3662,
  OFF: 51495,
  SOUND_ON: 10081,
  SOUND_OFF: 60799,
  ABRE: 16779,
  CIERRA: 14850,
  OPEN: 19783,
  CLOSE: 53548,
  SE_ON: 4530,
  SE_OFF: 13736,
  SHAKE: 54120,
  SHAKE_PARA: 39027,
  SUBIR: 44252,
  BAJAR: 2139
};

const NIEVE = 6371, NIKITA = 5545;

const FIJOS = new Set([ 8650, 50006, NIKITA, 12506, 21430, 52947, NIEVE, 44037 ]);

function luzSRGB(c, k = 1) {
  return (new THREE.Color).setRGB(Math.max(0, Math.min(255, c[0] * k)) / 255, Math.max(0, Math.min(255, c[1] * k)) / 255, Math.max(0, Math.min(255, c[2] * k)) / 255, THREE.SRGBColorSpace);
}

function mallaInvisible(pos, idx) {
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (idx) g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  }));
  m.userData.propio = true;
  m.userData.extra = true;
  return m;
}

class EfectoGas {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    const c = lista(a, "c");
    this.c0 = c.length >= 3 ? c.slice(0, 3) : [ 0, 0, 0 ];
    this.c1 = c.length >= 6 ? c.slice(3, 6) : [ 0, 0, 0 ];
    this.f48 = num(a, "s", 4096);
    this.f50 = num(a, "w", 410);
    this.f54 = num(a, "f", 128);
    this.f58 = num(a, "b", 1) & 3;
    this.f5C = num(a, "r", 0);
    this.f64 = num(a, "a", 3205);
    this.f3C = 0;
    this.f40 = 0;
    this.f44 = 0;
    this.f4C = 0;
    this.msg = null;
  }
  iniciar() {
    const cam = this.E.din.cam;
    if (!cam) {
      this.muerto = true;
      return;
    }
    const pos = new Float32Array(16 * 4 * 3), idx = [];
    const x1 = this.f5C, y1 = 230, x2 = Math.trunc(x1 * this.f64 / 4096), y2 = Math.trunc(y1 * this.f64 / 4096);
    let s1 = rsin(0), c1 = rcos(0);
    for (let i = 0; i < 16; i++) {
      const s2 = rsin((i + 1) * 256), c2 = rcos((i + 1) * 256), b = i * 4;
      const q = [ [ c1 * x1 / 4096, s1 * x2 / 4096 ], [ c2 * x1 / 4096, s2 * x2 / 4096 ], [ c1 * y1 / 4096, s1 * y2 / 4096 ], [ c2 * y1 / 4096, s2 * y2 / 4096 ] ];
      q.forEach(([x, y], k) => pos.set([ x, -y, 0 ], (b + k) * 3));
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      s1 = s2;
      c1 = c2;
    }
    const g = new THREE.BufferGeometry;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(16 * 4 * 3), 3));
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });
    if (this.f58 === 1 || this.f58 === 3) mat.blending = THREE.AdditiveBlending; else if (this.f58 === 2) mat.blending = THREE.SubtractiveBlending; else mat.opacity = .5;
    this.q = new THREE.Mesh(g, mat);
    this.q.position.z = -.12;
    this.q.renderOrder = 998;
    this.q.frustumCulled = false;
    this.q.visible = false;
    this.q.userData.propio = this.q.userData.sinColision = true;
    cam.add(this.q);
    this.objs = [ this.q ];
  }
  mensaje(h, v) {
    if (h === H.ON2) this.msg = [ 0, v?.[1] ]; else if (h === H.OFF2) this.msg = [ 1, v?.[1] ];
  }
  cuadro() {
    const m = this.msg;
    this.msg = null;
    let st;
    if (m) {
      st = m[0] === 0 ? 1 : 3;
      if (typeof m[1] === "number") this.f48 = m[1];
    } else st = this.f3C;
    switch (st) {
     case 1:
      if (this.f3C === 0) {
        if (this.f40 === 0) this.f40 = 1;
        this.f4C = 0;
      }
      this.f4C = nearSpeed(this.f4C, 4096, this.f48);
      if (this.f4C === 4096) st = 2;
      this.f3C = st;
      break;

     case 3:
      this.f4C = nearSpeed(this.f4C, 0, this.f48);
      if (this.f4C === 0) {
        st = 0;
        this.f40 = 0;
      }
      this.f3C = st;
      break;

     case 0:
      this.f40 = 0;
      this.f3C = st;
      break;

     default:
      this.f3C = st;
    }
    if (this.f40) {
      const k = this.f4C + (rsin(this.f44 * this.f54 & 4095) * (this.f4C * this.f50 >> 12) >> 12);
      const q = this.f58 === 3 ? .25 : 1, a = luzSRGB(this.c0.map(x => x * k >> 12), q), b = luzSRGB(this.c1.map(x => x * k >> 12), q);
      const C = this.q.geometry.attributes.color;
      for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
        const c = j < 2 ? a : b;
        C.setXYZ(i * 4 + j, c.r, c.g, c.b);
      }
      C.needsUpdate = true;
    }
    this.q.visible = !!this.f40 && !this.E.ctx.termica?.();
    this.f44++;
  }
  dibujar() {
    const cam = this.E.din.cam;
    if (!cam || !this.q.visible) return;
    const h = 2 * .12 * Math.tan(cam.fov * Math.PI / 360), w = h * (cam.aspect || 1);
    this.q.scale.set(w / 320, h / 224, 1);
  }
}

class PisoDinamico {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
  }
  iniciar() {
    const p = lista(this.a, "p");
    if (p.length < 12) {
      this.muerto = true;
      return;
    }
    const g = new THREE.Group;
    g.userData.actor = {
      tipo: "DYNFLOOR",
      nombre: this.a.nombre
    };
    g.add(mallaInvisible(p.map(x => x * MM), [ 0, 1, 2, 0, 2, 3 ]));
    this.E.agregar(g);
    this.objs = [ g ];
    this.E.ctx.alCambiar?.();
  }
  mensaje(h) {
    if (h === H.OFF2) this.E.matar(this);
  }
  morir() {
    queueMicrotask(() => this.E.ctx.alCambiar?.());
  }
}

class Panel2 {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.roto = !!num(a, "b", 0);
  }
  async iniciar() {
    const E = this.E, a = this.a;
    this.rutaRoto = rutaModelo(E, a, idDe(a, "m", 1));
    this.proc = procDe(a, "e");
    this.raiz = new THREE.Group;
    this.raiz.position.copy(v3(a.p || lista(a, "p")));
    this.raiz.rotation.copy(eulerYXZ(a.d || lista(a, "d")));
    this.raiz.userData.actor = a;
    E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    const r0 = this.roto ? this.rutaRoto : a.modelo || rutaModelo(E, a, idDe(a, "m", 0));
    if (r0) {
      try {
        this.raiz.add(await E.ctx.cargar(r0));
      } catch (e) {
        console.warn("actores: PANEL2", r0, e);
      }
    }
    if (num(a, "h", 1) === 1 && !this.roto) {
      this.raiz.updateMatrixWorld(true);
      const c = (new THREE.Box3).setFromObject(this.raiz);
      if (c.isEmpty()) return;
      this.centro = c.getCenter(new THREE.Vector3);
      const medio = c.getSize(new THREE.Vector3).multiplyScalar(.5).addScalar(MM);
      this.b = E.blanco(this, this.centro, medio, () => this.romper());
    }
  }
  async romper() {
    if (this.roto) return;
    this.roto = true;
    const E = this.E;
    if (this.b) E.matarBlanco(this.b);
    const c = this.centro || this.raiz.position;
    for (let i = 0; i < 3; i++) E.humo(c.clone(), [ 0, 10 + i * 5, 0 ]);
    E.chispas(c.clone(), 1);
    E.sonido(184, c.clone());
    if (this.proc) E.proc(this.proc);
    if (!this.rutaRoto) return;
    try {
      const o = await E.ctx.cargar(this.rutaRoto);
      this.raiz.clear();
      this.raiz.add(o);
      E.ctx.alCambiar?.();
    } catch (e) {
      console.warn("actores: PANEL2 roto", e);
    }
  }
}

class Trampilla {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.t = num(a, "t", 30);
    this.proc = procDe(a, "e");
    this.piso = true;
    this.cuenta = 0;
    this.fase = -1;
    this.cierre = 0;
    this.armada = 0;
    this.encima = 0;
    this.tapas = 0;
    this.vel = 0;
    this.giro = 0;
  }
  async iniciar() {
    const E = this.E, a = this.a, p = a.p || lista(a, "p"), d = a.d || lista(a, "d");
    this.y0 = (p[1] || 0) * MM;
    this.y = this.y0;
    this.raiz = new THREE.Group;
    this.raiz.position.copy(v3(p));
    this.raiz.rotation.copy(eulerYXZ(d));
    this.raiz.userData.actor = {
      tipo: "DMYFLOOR_TAPAS",
      nombre: a.nombre
    };
    E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    const cargar = async id => {
      const r = id === 0 ? a.modelo || rutaModelo(E, a, idDe(a, "m", 0)) : rutaModelo(E, a, idDe(a, "m", 1));
      if (!r) return null;
      try {
        return await E.ctx.cargar(r);
      } catch (e) {
        console.warn("actores: DMYFLOOR", r, e);
        return null;
      }
    };
    const [m0, m1] = await Promise.all([ cargar(0), cargar(1) ]);
    const caja = o => o ? (new THREE.Box3).setFromObject(o) : new THREE.Box3(new THREE.Vector3, new THREE.Vector3);
    const b0 = caja(m0), b1 = caja(m1);
    this.ancho = b0.max.x - b0.min.x;
    this.fondo = b0.max.z - b0.min.z;
    this.tapa = [ new THREE.Group, new THREE.Group ];
    this.tapa[1].position.x = this.ancho + (b1.max.x - b1.min.x);
    if (m0) this.tapa[0].add(m0);
    if (m1) this.tapa[1].add(m1);
    for (const t of this.tapa) {
      t.traverse(o => {
        o.userData.sinColision = true;
      });
      this.raiz.add(t);
    }
    this.pisos = new THREE.Group;
    this.pisos.userData.actor = {
      tipo: "DMYFLOOR",
      nombre: a.nombre
    };
    this.pisos.position.copy(this.raiz.position);
    this.pisos.rotation.copy(this.raiz.rotation);
    [ [ b0, 0 ], [ b1, this.tapa[1].position.x ] ].forEach(([b, dx]) => {
      if (b.isEmpty()) return;
      this.pisos.add(mallaInvisible([ b.min.x + dx, 0, b.min.z, b.max.x + dx, 0, b.min.z, b.max.x + dx, 0, b.max.z, b.min.x + dx, 0, b.max.z ], [ 0, 1, 2, 0, 2, 3 ]));
    });
    E.agregar(this.pisos);
    this.objs.push(this.pisos);
    this.centroLocal = new THREE.Vector3(this.ancho, 0, b0.min.z + this.fondo / 2);
    this.raiz.updateMatrixWorld(true);
    this.inv = this.raiz.matrixWorld.clone().invert();
    this.centro = this.centroLocal.clone().applyMatrix4(this.raiz.matrixWorld);
    E.ctx.alCambiar?.();
  }
  mensaje() {}
  ponerPiso(si) {
    if (this.piso === si) return;
    this.piso = si;
    this.pisos.visible = si;
    this.E.ctx.alCambiar?.();
  }
  cuadro() {
    const E = this.E, j = E.jugador();
    if (!this.tapa || !j) return;
    const l = j.clone().applyMatrix4(this.inv).sub(this.centroLocal);
    const adentro = Math.abs(l.x) < this.ancho - .1 && Math.abs(l.z) < this.fondo / 2;
    if (adentro) {
      if (this.piso && !this.armada) {
        this.fase = 0;
        this.vel = 0;
        this.armada = 1;
        this.cuenta = this.t;
        E.sonido(187, this.centro.clone());
      }
      this.encima = 1;
    } else {
      if (this.cierre > 0) this.cierre--; else if (!this.piso && !this.armada) {
        this.fase = 1;
        this.cuenta = 0;
        this.tapas = 2;
        this.ponerPiso(true);
      }
      this.encima = 0;
    }
    if (this.armada) this.cuenta--;
    switch (this.fase) {
     case 0:
      if (this.cuenta < 0 && !E.ctx.enGameOver?.()) {
        E.sonido(186, this.centro.clone());
        if (this.encima) E.ctx.gameOver?.(this.proc);
        this.fase = 2;
        this.tapas = 1;
        this.cierre = 40;
        this.ponerPiso(false);
        this.armada = 0;
      }
      this.y = this.y0 - .1;
      break;

     case 1:
      this.y = nearSpeed(Math.round(this.y * 1e3), Math.round(this.y0 * 1e3), 32) * MM;
      break;

     case 2:
      if (!E.ctx.enGameOver?.() && this.encima) {
        this.tapas = 1;
        E.ctx.gameOver?.(this.proc);
      }
      break;
    }
    if (this.tapas === 1) {
      this.vel += Math.trunc(rcos(this.giro) * 40 / 4096);
      this.giro += this.vel;
      if (this.giro > 1024) {
        this.giro = 2048 - this.giro;
        this.vel = -Math.trunc(this.vel / 4);
      }
    } else if (this.tapas === 2) {
      this.giro -= this.giro >> 3;
      if (this.giro < 8) {
        this.giro = 0;
        this.tapas = 0;
        E.sonido(188, this.centro.clone());
      }
    }
    this.tapa[0].rotation.z = -this.giro * ANG;
    this.tapa[1].rotation.z = this.giro * ANG;
    this.raiz.position.y = this.y;
  }
}

class Montacargas {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    this.msg = -1;
  }
  async iniciar() {
    const E = this.E, a = this.a, p = a.p || lista(a, "p");
    this.x = p[0] || 0;
    this.z = p[2] || 0;
    this.abajo = p[1] || 0;
    this.arriba = num(a, "h", 6e3) + this.abajo;
    this.vel = num(a, "v", 30);
    const s = lista(a, "s");
    this.tam = s.length >= 3 ? s.slice(0, 3) : [ 875, 100, 750 ];
    this.pArriba = idDe(a, "o");
    this.pAbajo = idDe(a, "u");
    this.proc = procDe(a, "e");
    if (!num(a, "i", 0)) {
      this.estado = 3;
      this.paso = -this.vel;
      this.y = this.abajo;
    } else {
      this.estado = 1;
      this.paso = this.vel;
      this.y = this.arriba;
    }
    this.t20C = 15;
    this.t20E = 30;
    this.raiz = new THREE.Group;
    this.raiz.position.set(this.x * MM, this.y * MM, this.z * MM);
    this.raiz.userData.actor = a;
    const modelo = a.modelo || rutaModelo(E, a, idDe(a, "m"));
    if (modelo) {
      try {
        const o = await E.ctx.cargar(modelo);
        E.ctx.teñir?.(o);
        o.traverse(m => {
          m.userData.sinColision = true;
        });
        this.raiz.add(o);
      } catch (e) {
        console.warn("actores: LIFT", modelo, e);
      }
    }
    const piso = new THREE.Group;
    piso.userData.actor = {
      tipo: "LIFT",
      nombre: a.nombre
    };
    const [mx, my, mz] = this.tam.map(v => v * MM), yp = my + MM;
    piso.add(mallaInvisible([ -mx, yp, -mz, mx, yp, -mz, mx, yp, mz, -mx, yp, mz ], [ 0, 1, 2, 0, 2, 3 ]));
    this.raiz.add(piso);
    E.agregar(this.raiz);
    this.objs = [ this.raiz ];
    E.ctx.alCambiar?.();
  }
  mensaje(h) {
    if (h === H.SUBIR) this.msg = 0; else if (h === H.BAJAR) this.msg = 1;
  }
  puerta(n, h) {
    if (n != null) this.E.ctx.mensaje?.(n, [ h ]);
  }
  cuadro() {
    const m = this.msg;
    this.msg = -1;
    switch (this.estado) {
     case 0:
      if (this.t20C > 0) {
        if (--this.t20C === 0) this.puerta(this.pAbajo, H.ABRE);
      } else if (m === 0) {
        this.estado = 1;
        this.puerta(this.pAbajo, H.CIERRA);
        this.t20C = 15;
        this.t20E = 30;
      }
      break;

     case 1:
      if (this.t20E > 0) {
        if (--this.t20E === 0) {
          this.E.proc(this.proc, [ 13854 ]);
          this.paso = this.vel;
        }
      } else if (this.y >= this.arriba) {
        this.estado = 2;
        this.y = this.arriba;
        this.paso = 0;
        this.E.proc(this.proc, [ 44479 ]);
      }
      break;

     case 2:
      if (this.t20C > 0) {
        if (--this.t20C === 0) this.puerta(this.pArriba, H.ABRE);
      } else if (m === 1) {
        this.estado = 3;
        this.puerta(this.pArriba, H.CIERRA);
        this.t20C = 15;
        this.t20E = 30;
      }
      break;

     case 3:
      if (this.t20E > 0) {
        if (--this.t20E === 0) {
          this.E.proc(this.proc, [ 63012 ]);
          this.paso = -this.vel;
        }
      } else if (this.abajo >= this.y) {
        this.estado = 0;
        this.y = this.abajo;
        this.paso = 0;
        this.E.proc(this.proc, [ 60856 ]);
      }
      break;
    }
    this.y += this.paso;
    this.raiz.position.y = this.y * MM;
  }
}

class FindTrap {
  constructor(E, a) {
    this.E = E;
    this.a = a;
    this.objs = [];
    const p = lista(a, "p");
    this.pos = new THREE.Vector3((p[0] || 0) * MM, (p[1] || 0) * MM, (p[2] || 0) * MM);
    const s = lista(a, "s");
    this.sx = s[0] ?? 160;
    this.sy = s[1] ?? 112;
    this.espera = num(a, "w", 0);
    this.proc = procDe(a, "e");
    this.flag = 0;
    this.cuenta = -1;
    this.modo = null;
    this.girado = false;
    this._v = new THREE.Vector3;
  }
  mensaje(h) {
    if (h === H.ENTRAR) {
      if (this.flag === 0) this.flag = 1;
    } else if (h === H.SALIR) this.flag = 0; else if (h === 17116) {
      this.flag = 8;
      this.modo = "vuelta";
      this.cuenta = this.espera;
    }
  }
  girar(destino, k) {
    const C = this.E.ctx, m = C.mirada?.();
    if (!m) return;
    const d = (destino.rumbo - m.rumbo + Math.PI * 3) % (Math.PI * 2) - Math.PI, n = Math.max(1, k);
    C.ponerMirada?.(m.rumbo + d / n, m.pitch + (destino.pitch - m.pitch) / n);
  }
  cuadro() {
    const E = this.E, C = E.ctx;
    if (this.modo === "ida" && this.cuenta >= 0) {
      if (this.cuenta < 16) {
        const k = this.cuenta--;
        this.girar(this.destino, k);
      }
      if (--this.cuenta < 0) {
        this.girado = true;
        if (this.destino) C.ponerMirada?.(this.destino.rumbo, this.destino.pitch);
      }
    } else if (this.modo === "vuelta" && this.cuenta >= 0) {
      if (this.cuenta < 16) {
        const k = this.cuenta--;
        if (this.antes) this.girar(this.antes, k);
      }
      if (--this.cuenta < 0) {
        this.girado = false;
        this.modo = null;
        if (this.antes) C.ponerMirada?.(this.antes.rumbo, this.antes.pitch);
        C.padDemo?.(false);
      }
    }
    if (!(this.flag & 1)) return;
    if (this.flag === 1 && C.primeraPersona?.() && !C.enGameOver?.()) {
      const cam = E.din.cam;
      if (!cam) return;
      cam.updateMatrixWorld();
      const q = this._v.copy(this.pos).project(cam);
      if (q.z < 1 && Math.abs(q.x * 160) < this.sx && Math.abs(q.y * 112) < this.sy) {
        this.flag |= 2;
        C.padDemo?.(true);
        const o = cam.getWorldPosition(new THREE.Vector3), d = this.pos.clone().sub(o);
        this.antes = C.mirada?.() || null;
        this.destino = {
          rumbo: Math.atan2(-d.x, -d.z),
          pitch: Math.atan2(d.y, Math.hypot(d.x, d.z))
        };
        this.modo = "ida";
        this.cuenta = this.espera;
        this.girado = false;
      }
    }
    if (this.flag & 2 && this.girado) {
      if (this.proc) E.proc(this.proc, []);
      this.flag = this.flag & ~2 | 4;
    }
  }
  morir() {
    if (this.modo) this.E.ctx.padDemo?.(false);
  }
}

export const CLASES_GUION = {
  GASEFFECT: EfectoGas,
  DYNFLOOR: PisoDinamico,
  PANEL2: Panel2,
  DMYFLOOR: Trampilla,
  LIFT: Montacargas,
  FINDTRAP: FindTrap
};

export const TIPOS_GUION = Object.keys(CLASES_GUION);

const AUSENTE_OK = new Set([ "DYNWALL", "WALL", "DOOR", "PUT_OBJECT", "ITEM", "WATCHER", "ELEVATOR", "CAMERA", "CAMERA2", "CAMERAGUN", "CLAYMORE", "CENSOR", "SEARCHLIGHT", "KIKENKUN", "FADEIO", "CINEMA", "CAT_IN", "FEWDAMAGE", "WT_AREA", "WT_AREA2", "SNEBREATH", "TRUCKTRAP", ...Object.keys(CLASES_GUION) ]);

function existe(ctx, dest) {
  let si = false;
  ctx.mundo?.()?.traverse(o => {
    if (!si && o.userData?.actor?.nombre === dest) si = true;
  });
  const din = ctx.din?.(), J = ctx.juego?.();
  return si || !!din?.extras?.porNombre?.get(dest)?.length || !!din?.puertas?.some(p => p.o.userData.actor?.nombre === dest) || !!J?.o2s?.some(x => x.nombre === dest) || !!J?.aguas?.some(x => x.nombre === dest) || !!J?.alientos?.some(x => x.nombre === dest) || !!(ctx.sensores?.()?.lista || []).some(s => s.nombre === dest) || !!(ctx.guardias?.() || []).some(g => g.nombre === dest && !g.borrado);
}

export function manejadorMensajesExtra(ctx) {
  let nombresSt = null, nombres = null, tipos = null;
  const avisados = new Set;
  const avisar = txt => {
    const k = nombresSt + txt;
    if (avisados.has(k)) return;
    avisados.add(k);
    ctx.guion?.op?.registro?.(txt);
  };
  const nombresDe = () => {
    const g = ctx.guion, st = g?.st;
    if (!st) return null;
    if (nombresSt === st && nombres) return nombres;
    nombresSt = st;
    nombres = new Set(FIJOS);
    tipos = new Map;
    const ver = (x, prof = 0) => {
      if (!x || typeof x !== "object" || prof > 80) return;
      if (Array.isArray(x)) {
        for (const y of x) ver(y, prof + 1);
        return;
      }
      if (x.cmd === "chara" && Array.isArray(x.args)) {
        const n = x.args[1], v = n && typeof n === "object" ? n.id : n;
        if (typeof v === "number") {
          nombres.add(v & 65535);
          if (!tipos.has(v & 65535) && x.tipo) tipos.set(v & 65535, x.tipo);
        }
      }
      for (const y of Object.values(x)) if (y && typeof y === "object") ver(y, prof + 1);
    };
    ver(g.script?.main);
    ver(g.script?.procs);
    for (const a of g.nivel?.actores || []) if (typeof a.nombre === "number") {
      nombres.add(a.nombre & 65535);
      if (!tipos.has(a.nombre & 65535)) tipos.set(a.nombre & 65535, a.tipo);
    }
    return nombres;
  };
  const tipoDe = dest => nombresDe() ? tipos.get(dest) || null : null;
  return (dest, v, info = {}) => {
    if (!Array.isArray(v) || !v.length) return false;
    const m = v[0] & 65535, din = ctx.din?.();
    let ok = false;
    if (m === H.ENTRAR || m === H.SALIR) {
      ctx.mundo?.()?.traverse(o => {
        const a = o.userData?.actor;
        if (a?.tipo === "WALL" && a.nombre === dest && o.parent?.userData?.actor !== a) {
          o.visible = m === H.ENTRAR;
          ok = true;
        }
      });
      if (ok) {
        ctx.recalcular?.();
        return true;
      }
    }
    for (const B of din?.balizas || []) {
      if (B.nombre !== dest) continue;
      if (m === H.ABRE || m === H.OPEN) {
        B.msg = true;
        B.se = true;
      } else if (m === H.CIERRA || m === H.CLOSE) B.msg = false; else if (m === H.SE_ON) B.se = true; else if (m === H.SE_OFF) B.se = false; else continue;
      ok = true;
    }
    if (ok) return true;
    for (const T of din?.temblores || []) {
      if (T.nombre !== dest) continue;
      if (m === H.SHAKE) {
        T.objetivo = (v[1] | 0) * MM;
        T.paso = Math.abs(v[2] | 0) * MM;
        T.quieto = false;
      } else if (m === H.SHAKE_PARA) T.quieto = true; else if (m === H.KILL) {
        T.escala = 0;
        T.objetivo = 0;
        T.paso = 1;
        T.quieto = false;
      } else continue;
      ok = true;
    }
    if (ok) return true;
    if (dest === NIEVE) {
      if (din?.nieve?.pts && (m === H.ON || m === H.OFF)) din.nieve.pts.visible = m === H.ON;
      return true;
    }
    if (dest === NIKITA) {
      if (m === H.KILL) {
        const A = ctx.armas?.();
        if (A?.misil) A.terminarNikita(true);
      }
      return true;
    }
    const pend = ctx.guion?.creados?.find(a => a.nombre === dest && a.creado === undefined && a.listo && !a.muerto);
    if (pend && !info.reenviado) {
      const g = ctx.guion, st = g.st, vv = v.slice();
      pend.listo.then(ok => {
        if (ok && g.st === st && !pend.muerto) g.op.mensaje(dest, vv, {
          ...info,
          entrada: false,
          reenviado: true
        });
      });
      return true;
    }
    const tipo = tipoDe(dest);
    if (tipo === "COMMANDER" && (m === H.SOUND_ON || m === H.SOUND_OFF)) {
      const J = ctx.juego?.();
      if (J?.com) J.com.pasosOff = m === H.SOUND_OFF;
      return true;
    }
    if (tipo === "MOSAIC") return true;
    const N = nombresDe();
    if (N && !N.has(dest)) {
      avisar(`vivo mesg #${hex4(dest)} sin destinatario en ${ctx.guion.st} (en el original tampoco lo recibe nadie)`);
      return true;
    }
    if (tipo && AUSENTE_OK.has(tipo) && !existe(ctx, dest)) {
      avisar(`vivo mesg #${hex4(dest)} a un ${tipo} que no existe ahora (se pierde, como en el original)`);
      return true;
    }
    return false;
  };
}
