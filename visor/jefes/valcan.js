// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, ratan2, randU, randS, nearExp2, cargarModelo } from "./base.js";

import { apoyo, HASH, isqrt, idiv } from "./apoyo3.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

const DAÑO_BALA = [ 90, 90, 135, 180, 225 ];

const VIDA_DIF = [ 600, 720, 780, 840 ];

const INICIO_DIF = [ [ 0, 1, 0, 2 ], [ 3, 2, 3, 3 ], [ 2, 2, 1, 2 ], [ 0, 0, 0, 1 ] ];

const RUTA_FIJA = [ [ 0, 3 ], [ 1, 1 ], [ 2, 2 ], [ 3, 3 ], [ 1, 1 ], [ 0, 0 ], [ 2, 2 ], [ 3, 0 ], [ 2, 2 ], [ 3, 3 ], [ 1, 1 ], [ 2, 0 ], [ 0, 3 ], [ 3, 0 ], [ 0, 1 ], [ 2, 2 ], [ 1, 1 ], [ 0, 3 ], [ 3, 2 ], [ 1, 3 ], [ 3, 0 ] ];

const BOCA = V(10, -2500, -70);

const SE_HIT = 37, SE_EXCLAMATION = 83;

const envolver = a => {
  a &= 4095;
  return a > 2048 ? a - 4096 : a;
};

const difDir = (a, b) => Math.abs(envolver(a - b));

export class Valcan extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "VULCAN RAVEN";
    this.registro = [];
    this.A = apoyo(mgr);
    this.radio = .5;
    this.alto = 2.2;
  }
  log(t, extra = {}) {
    this.registro.push({
      f: this.mgr.frame,
      t: t,
      ...extra
    });
    if (this.registro.length > 800) this.registro.shift();
  }
  num(v, d = 0, k = null) {
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && v.var) {
      const x = this.A.guion?.vars?.get?.(v.var);
      if (typeof x === "number" && (x !== 0 || k !== "h")) return x;
      const lv = Math.max(0, Math.min(3, this.dificultad()));
      if (/G0428/i.test(v.var)) return VIDA_DIF[lv];
      const m = /G042([a-d])/i.exec(v.var);
      if (m) return INICIO_DIF[lv]["abcd".indexOf(m[1].toLowerCase())];
    }
    return d;
  }
  ints(k) {
    return (this.opts[k] || []).map(x => this.num(x, 0, k));
  }
  async iniciar() {
    await this.cargarCuerpo("jefes/raven.glb", "val_15a");
    const barril = await cargarModelo(this.ctx, "jefes/raven_barril.glb");
    this.barril = barril;
    this.huesos[4]?.add(barril);
    this.ctx.teñir?.(barril);
    this.huesoBarril = barril.getObjectByName("hueso_1");
    this.f7D4 = this.ints("s")[0] ?? 1;
    const h = this.ints("h")[0];
    this.f6A8 = h ? idiv(h, 8) * 8 : 1024;
    this.grilla = [];
    for (let i = 0; i < 4; i++) {
      this.grilla[i] = [];
      for (let j = 0; j < 4; j++) this.grilla[i][j] = [ i * 7e3 - 10500, j * 6e3 - 7500 ];
    }
    const p = this.ints("p"), q = this.ints("q");
    this.f738 = p[0] ?? 0;
    this.f73A = p[1] ?? 0;
    this.f73C = q[0] ?? 0;
    this.f73E = q[1] ?? 0;
    this.mov.set(this.grilla[this.f738][this.f73A][0], 0, this.grilla[this.f738][this.f73A][1]);
    this.f6C4 = this.mov.clone();
    this.f8D0 = this.procId("n") || -1;
    this.f8D4 = this.procId("i") || -1;
    this.f900 = this.f6A8;
    this.vital = this.f900;
    this.f904 = 0;
    this.blanco = true;
    this.f51C = V();
    this.f7A4 = V();
    this.f7AC = V();
    this.f910 = V();
    this.adjust = Array.from({
      length: 16
    }, () => [ 0, 0, 0 ]);
    this.f69C = this.f6A0 = this.f690 = this.f698 = this.f6A4 = this.f694 = this.f6B8 = this.f6B0 = 0;
    this.f670 = 9;
    this.accionTabla(0);
    this.f758 = 0;
    this.f75C = 0;
    this.f764 = 0;
    this.f744 = [ 3072, 1024, 2048, 0 ];
    this.f770 = 0;
    this.f774 = 0;
    this.f76C = 2800;
    this.DB868();
    this.f768 = this.f740;
    this.rot = this.turn = this.f744[this.f740];
    this.interpCtrl = 4;
    this.f76C = 2800;
    this.f774 = 0;
    this.f778 = 0;
    this.f77C = 0;
    this.f770 = 0;
    this.f788 = 0;
    this.f78C = 0;
    this.f790 = 0;
    this.f794 = 0;
    this.f798 = 0;
    this.f81C = 0;
    this.f828 = 0;
    this.f82C = 0;
    this.f830 = 0;
    this.f834 = 0;
    this.f838 = 0;
    this.f83C = 0;
    this.f840 = 0;
    this.f8F0 = 0;
    this.f90C = 0;
    this.f918 = 0;
    this.f91C = 0;
    this.f920 = 0;
    this.f924 = -1;
    this.f6B4 = 0;
    this.f6C0 = 1e3;
    this.f93C = 0;
    this.f940 = 0;
    this.f8DC = 0;
    this.f8E4 = 0;
    this.f8E8 = 0;
    this.f8E0 = randU(16) + 40;
    this.f8EC = 0;
    this.f94C = 0;
    this.f950 = 0;
    this.f684 = 0;
    this.f688 = 0;
    this.f944 = 15e3;
    this.f948 = 1024;
    this.f780 = 0;
    this.f784 = 0;
    this.f7B4 = 0;
    this.f68C = 0;
    this.tick = 0;
    this.tiros = 0;
    this.derribos = 0;
    this.barras = [ {
      y: 28,
      rest: 0,
      now: 0,
      max: 1024,
      conf: {
        nombre: "RAVEN",
        izq: [ 16, 111, 159 ],
        der: [ 31, 223, 127 ]
      }
    } ];
    const c = this.motor.clip(0);
    for (let j = 0; j < this.motor.n; j++) this.motor.rots[j] = c.rot.slice(j * 3, j * 3 + 3);
    this.motor.altura = c.altura[0];
    this.apoyar();
    this.dibujar();
    this.mgr.hud.negro = 1;
    this.fundidoEntrada = 20;
    this.log("inicio", {
      vida: this.f900,
      nodo: [ this.f738, this.f73A ],
      sig: [ this.f73C, this.f73E ]
    });
  }
  vitalBlanco() {
    return Math.max(1, this.f900);
  }
  accionTabla(a) {
    this.f670 = a;
    this.motor.accion(a, 4);
  }
  DC290(a, sig) {
    if (this.f670 !== a) {
      this.f920 = 0;
      this.f670 = a;
      this.motor.accion(a, 4);
    } else if (this.motor.isEnd === 1) this.f688 = sig;
  }
  D9F3C() {
    this.f690 = 0;
    for (const a of this.adjust) {
      a[0] = 0;
      a[1] = 0;
      a[2] = 0;
    }
  }
  puntoHuesoMM(i, off = V()) {
    return this.puntoHueso(i, off).multiplyScalar(1e3);
  }
  D9DC0(aSnake) {
    const g = this.puntoHuesoMM(4), p = aSnake ? this.A.snake() : this.f51C;
    const d = g.sub(p);
    return isqrt((d.x >> 4) ** 2 + (d.y >> 4) ** 2 + (d.z >> 4) ** 2) * 16;
  }
  angulos(from, to) {
    const d = to.clone().sub(from);
    return {
      y: ratan2(d.x, d.z) & 4095,
      x: (ratan2(isqrt(d.x * d.x + d.z * d.z), d.y) & 4095) - 1024
    };
  }
  D9F8C() {
    const n = this.A.nikita();
    if (n) {
      this.f51C.copy(n.p);
      return;
    }
    this.f82C = 0;
    const s = this.A.stinger();
    if (s) {
      this.f51C.copy(s.p);
      return;
    }
    this.f838 = 0;
    this.f51C.copy(this.A.snake());
  }
  DA044() {
    const hx = (this.grilla[1][0][0] - this.grilla[0][0][0]) / 2, hz = (this.grilla[0][1][1] - this.grilla[0][0][1]) / 2;
    let i = 0;
    while (i < 4 && this.mov.x >= this.grilla[i][0][0] + hx) i++;
    if (i > 3) i = 4;
    let j = 0;
    while (j < 4 && this.mov.z >= this.grilla[0][j][1] + hz) j++;
    if (j > 3) j = 4;
    this.f7A0 = Math.min(i, 3);
    this.f7A2 = Math.min(j, 3);
  }
  DA140() {
    if (this.f690 >= 48) {
      if (this.f690 < 144) this.adjust[6][1] -= 8; else if (this.f690 < 192) this.adjust[6][1] += 8;
    } else this.adjust[6][1] += 8;
    if (++this.f690 >= 192) this.f690 = 0;
  }
  static DA1AC(a0, a1) {
    if (a0 < 2) a0 = 1 - a0;
    a0 = 1 - a0 % 2 * 2;
    a1 = 1 - (a1 - Math.trunc(a1 / 2) * 2) * 2;
    return Math.trunc((a0 * a1 + 1) / 2) + 2;
  }
  DA21C() {
    this.A.dañarSnake(90, "blast");
    this.log("golpe de cerca");
  }
  bloqueo(i) {
    return this.mgr.bloqueosRaven?.[i] || 0;
  }
  DA2A8() {
    if (this.f93C !== 1 && randU(4) > 0) return -1;
    const n = this.f770 >= 2 && this.f770 <= 3 ? [ this.f738, this.f73A ] : [ this.f73C, this.f73E ];
    const g = this.grilla[n[0]][n[1]], t = this.f51C, d = this.f740;
    if (d < 0 || d > 3) return -1;
    if (d < 2) {
      if (this.bloqueo(0) && (n[1] & 65535) < 2 && n[0] === 1) return -1;
      if (this.bloqueo(3) && n[1] - 2 >= 0 && n[1] - 2 < 2 && n[0] === 2) return -1;
      if (g[1] < t.z && g[1] < 9e3) return Valcan.DA1AC(d, 3);
      if (t.z < g[1] && !(g[1] < -5999)) return Valcan.DA1AC(d, 2);
      return -1;
    }
    if (this.bloqueo(1) && n[0] - 2 >= 0 && n[0] - 2 < 2 && n[1] === 1) return -1;
    if (this.bloqueo(2) && (n[0] & 65535) < 2 && n[1] === 2) return -1;
    if (g[0] < t.x && g[0] < 9e3) return Valcan.DA1AC(d, 1);
    if (t.x < g[0] && !(g[0] < -8999)) return Valcan.DA1AC(d, 0);
    return -1;
  }
  DAE7C() {
    this.f828 = 0;
    const r = this.DA2A8();
    this.f79C = r;
    if (r !== -1) return r;
    const n = (x, z) => this.f738 === x && this.f73A === z;
    switch (this.f740) {
     case 0:
      if (this.f738 === 1) {
        this.f828 = 1;
        return 1;
      }
      if (!this.bloqueo(2)) return 0;
      return n(2, 2) ? randU(4096) % 3 + 1 : 0;

     case 1:
      if (this.f738 === 2) {
        this.f828 = 1;
        return 1;
      }
      if (!this.bloqueo(1)) return 0;
      return n(1, 1) ? randU(4096) % 3 + 1 : 0;

     case 2:
      if (this.f73A === 1) {
        this.f828 = 1;
        return 1;
      }
      if (!this.bloqueo(0)) return 0;
      return n(1, 2) ? randU(4096) % 3 + 1 : 0;

     case 3:
      if (this.f73A === 2) {
        this.f828 = 1;
        return 1;
      }
      if (!this.bloqueo(3)) return 0;
      return n(2, 1) ? randU(4096) % 3 + 1 : 0;
    }
    return 0;
  }
  DAFCC() {
    this.f828 = 1;
    const d = this.f740, n = (x, z) => this.f738 === x && this.f73A === z;
    if (this.f73A === 0) {
      if (this.f738 === 0 && this.f73C === 0) {
        if (this.f73E === 1) {
          this.f76C = 0;
          this.f774 = this.f770;
          this.f770 = this.bloqueo(0) && this.bloqueo(2) ? 3 : 2;
          this.f6A4 = 0;
          this.f69C = 0;
          this.log("fase", {
            f770: this.f770
          });
        }
        if (d < 2) return Valcan.DA1AC(d, 3);
        if (d === 2) return 1;
        this.f828 = 0;
        return 0;
      }
      if (d >= 2 && d <= 3) return Valcan.DA1AC(d, 0);
      if (d === 1) return 1;
      if (this.f738 === 1) return 3;
      this.f828 = 0;
      return 0;
    }
    if (d < 2) {
      if (this.bloqueo(3)) {
        if (n(1, 3) && d === 1) {
          return 0;
        }
        if (n(3, 3) && d === 0) return 0;
      }
      if (this.bloqueo(0)) {
        if (n(1, 2)) return Valcan.DA1AC(d, 0);
        if (n(0, 1) && d === 1) return 0;
        if (n(2, 1) && d === 0) return 0;
      }
      return Valcan.DA1AC(d, 2);
    }
    if (d === 3) return 1;
    if (this.f73A === 1) return this.f738 === 0 ? 1 : 3;
    if (this.bloqueo(0) && n(1, 2)) return Valcan.DA1AC(d, 0);
    this.f828 = 0;
    return 0;
  }
  DB200() {
    this.f69C++;
    this.f828 = 0;
    switch (this.f740) {
     case 0:
      if (this.f738 !== 1 || !this.bloqueo(0) || !this.bloqueo(2)) return 0;
      this.f770 = 3;
      this.f6A4 = 0;
      this.f69C = 0;
      this.log("fase", {
        f770: 3
      });
      return 3;

     case 1:
      return this.f738 === 2 ? 1 : 0;

     case 2:
      return this.f73A === 1 ? 2 : 0;

     case 3:
      return this.f73A === 2 ? 1 : 0;
    }
    return 0;
  }
  DB2E4() {
    this.DA044();
    if (RUTA_FIJA[this.f6A0][0] === this.f7A0 && RUTA_FIJA[this.f6A0][1] === this.f7A2) {
      if (++this.f6A0 >= 21) this.f6A0 = 0;
    }
    const dx = RUTA_FIJA[this.f6A0][0] - this.f7A0, dz = RUTA_FIJA[this.f6A0][1] - this.f7A2, d = this.f740;
    let flag = 0;
    if (dx > 0) {
      if (d >= 2 && d <= 3) flag = Valcan.DA1AC(d, 1); else if (d === 0) flag = 1;
    } else if (dx < 0) {
      if (d < 2 || d > 3) {
        if (d === 1) flag = 1;
      } else flag = Valcan.DA1AC(d, 0);
    } else if (dz > 0) {
      if (d < 0 || d > 1) {
        if (d === 2) flag = 1;
      } else flag = Valcan.DA1AC(d, 3);
    } else if (dz < 0) {
      if (d >= 0 && d <= 1) flag = Valcan.DA1AC(d, 2); else if (d === 3) flag = 1;
    }
    if (flag) this.D9F3C();
    return flag;
  }
  DB470() {
    switch (this.f770) {
     case 0:
      return this.DAE7C();

     case 1:
      return this.DAFCC();

     case 2:
      return this.DB200();

     case 3:
      return this.DB2E4();
    }
    return 0;
  }
  DB500() {
    this.f738 = this.f73C;
    this.f73A = this.f73E;
    const d = this.f768;
    if (this.f770 === 3 || this.f770 === 0) {
      if (d === 0) {
        if (--this.f73C < 0) this.f73C = 1;
      } else if (d === 1) {
        if (++this.f73C >= 4) this.f73C = 2;
      } else if (d === 2) {
        if (--this.f73E < 0) this.f73E = 1;
      } else if (d === 3) {
        if (++this.f73E >= 4) this.f73E = 2;
      }
    } else if (this.f770 === 1) {
      if (d === 0) {
        if (--this.f73C < 0) {
          this.f73C = 0;
          if (--this.f73E < 0) this.f73E = 1;
        }
      } else if (d === 1) {
        if (++this.f73C >= 4) {
          this.f73C = 3;
          if (--this.f73E < 0) {
            this.f73C = 2;
            this.f73E = 0;
          }
        }
      } else if (d === 2) {
        if (--this.f73E < 0) {
          this.f73C--;
          this.f73E = 0;
          if (this.f73C < 0) {
            this.f73C = 0;
            this.f73E = 1;
          }
        }
      } else if (d === 3) {
        if (++this.f73E >= 4) {
          this.f73C--;
          this.f73E = 3;
          if (this.f73C < 0) {
            this.f73C = 0;
            this.f73E = 2;
          }
        }
      }
    } else if (this.f770 === 2) {
      if (d === 0) {
        if (--this.f73C < 0) {
          this.f768 = 3;
          this.f73C = 0;
          this.f73E = 1;
        }
      } else if (d === 1) {
        if (++this.f73C >= 4) this.f73C = 2;
      } else if (d === 2) {
        if (--this.f73E < 0) {
          this.f768 = 1;
          this.f73C = 1;
          this.f73E = 0;
        }
      } else if (d === 3) {
        if (++this.f73E >= 4) this.f73E = 2;
      }
    }
  }
  DB868() {
    if (this.f770 === 2) this.f76C = 0; else if (this.f770 === 3 || this.f770 === 1 && this.f774 !== 0) this.f76C = 500; else if (this.f770 === 0 && this.f774 === 2 || this.f770 === 1 && this.f774 === 0) this.f76C = 0; else this.f76C = 2800;
    const d1 = this.f73C - this.f738, d2 = this.f73E - this.f73A, g = this.grilla[this.f73C][this.f73E];
    if (d1 < 0) {
      this.f740 = 0;
      this.f754 = g[0] + this.f76C;
    } else if (d1 > 0) {
      this.f740 = 1;
      this.f754 = g[0] - this.f76C;
    } else if (d2 < 0) {
      this.f740 = 2;
      this.f756 = g[1] + this.f76C;
    } else if (d2 > 0) {
      this.f740 = 3;
      this.f756 = g[1] - this.f76C;
    }
  }
  DACCC() {
    if (this.f758 !== 0) return;
    this.DA044();
    const g = this.grilla[this.f7A0][this.f7A2], x = this.f6C4.x, z = this.f6C4.z;
    switch (this.f740) {
     case 0:
      this.mov.z = g[1];
      if (x < this.f754) this.f758 = -1;
      break;

     case 1:
      this.mov.z = g[1];
      if (x > this.f754) this.f758 = -1;
      break;

     case 2:
      this.mov.x = g[0];
      if (z < this.f756) this.f758 = -1;
      break;

     case 3:
      this.mov.x = g[0];
      if (z > this.f756) this.f758 = -1;
      break;
    }
  }
  DB9F0() {
    const a0 = this.f764;
    let cond;
    if (this.f770 === 1 && this.f774 !== 0) cond = this.f774; else if (this.f770 === 2 || this.f770 === 3 || this.f76C === 0 || this.f774 === 2 || this.f774 === 3) cond = this.f774; else cond = null;
    if (cond !== null) {
      if (cond - 2 >= 0 && cond - 2 < 2) this.f774 = this.f770;
      switch (this.f740) {
       case 0:
        this.f768 = a0 > 0 ? 2 : 3;
        break;

       case 1:
        this.f768 = a0 <= 0 ? 2 : 3;
        break;

       case 2:
        this.f768 = a0 > 0 ? 1 : 0;
        break;

       case 3:
        this.f768 = a0 <= 0 ? 1 : 0;
        break;
      }
      this.turn = this.f744[this.f768];
      this.DB500();
      this.DB868();
      this.f758 = 0;
      this.f75C = 0;
      return;
    }
    const v1 = --this.f75C;
    if (v1 >= 8) {
      this.turn = this.turn - a0 * 14 & 4095;
      return;
    }
    if (v1 < 0) {
      this.DB500();
      this.DB868();
      this.f758 = 0;
      this.f75C = 0;
      return;
    }
    const gn = this.grilla[this.f73C][this.f73E];
    switch (this.f740) {
     case 0:
      this.f768 = a0 > 0 ? 2 : 3;
      this.mov.x = idiv(this.mov.x + gn[0], 2);
      break;

     case 1:
      this.f768 = a0 <= 0 ? 2 : 3;
      this.mov.x = idiv(this.mov.x + gn[0], 2);
      break;

     case 2:
      this.f768 = a0 > 0 ? 1 : 0;
      this.mov.z = idiv(this.mov.z + gn[1], 2);
      break;

     case 3:
      this.f768 = a0 <= 0 ? 1 : 0;
      this.mov.z = idiv(this.mov.z + gn[1], 2);
      break;
    }
    this.turn = this.f744[this.f768];
  }
  DBCB4() {
    let cond;
    if (this.f770 === 1 && this.f774 !== 0) cond = this.f774; else if (this.f770 === 2 || this.f770 === 3 || this.f76C === 0 || this.f774 === 2 || this.f774 === 3) cond = this.f774; else cond = null;
    if (cond !== null) {
      if (cond - 2 >= 0 && cond - 2 < 2) this.f774 = this.f770;
      const vuelta = {
        0: [ 1, 1 ],
        1: [ 0, 0 ],
        2: [ 3, 3 ],
        3: [ 2, 2 ]
      }[this.f740];
      if (vuelta) {
        this.turn = this.f744[vuelta[0]];
        this.f768 = vuelta[1];
      }
      this.rot = this.turn;
      this.DB500();
      this.DB868();
      this.f758 = 0;
      this.f75C = 0;
      return;
    }
    const v1 = --this.f75C;
    if (v1 >= 40) {
      this.turn = this.turn + 16 & 4095;
      return;
    }
    if (v1 >= 8) {
      this.turn = this.turn - 64 & 4095;
      return;
    }
    if (v1 < 0) {
      this.DB500();
      this.DB868();
      this.f758 = 0;
      this.f75C = 0;
      return;
    }
    const g = this.grilla[this.f738][this.f73A];
    switch (this.f740) {
     case 0:
      this.turn = this.f744[1];
      this.f768 = 1;
      this.mov.z = idiv(this.mov.z + g[1], 2);
      break;

     case 1:
      this.turn = this.f744[0];
      this.f768 = 0;
      this.mov.z = idiv(this.mov.z + g[1], 2);
      break;

     case 2:
      this.turn = this.f744[3];
      this.f768 = 3;
      this.mov.x = idiv(this.mov.x + g[0], 2);
      break;

     case 3:
      this.turn = this.f744[2];
      this.f768 = 2;
      this.mov.x = idiv(this.mov.x + g[0], 2);
      break;
    }
  }
  DA558(arg1) {
    const s1 = this.puntoHuesoMM(4), ang = this.angulos(s1, this.f51C);
    const diffdir = difDir(ang.y, this.rot + this.adjust[1][1] + this.adjust[6][1]);
    if (arg1) s1.add(V(-800, 0, 0).applyEuler(new THREE.Euler(ang.x * ANG, ang.y * ANG, 0, "YXZ")));
    const snake = this.A.snake(), libre = (a, b) => !this.A.paredEntre(a, b);
    let flag = 0, d = 0;
    const misil = !!this.A.nikita() || !!this.A.stinger();
    if (misil) {
      if (libre(s1, this.f51C)) {
        if (libre(s1, snake)) {
          d = this.D9DC0(1);
          if (d < this.f68C) {
            this.f51C.copy(snake);
            flag = 1;
          }
        }
        if (this.f93C !== 0 && this.A.stinger()) {
          this.f838 = 1;
          return 1;
        }
      } else if (libre(s1, snake)) {
        d = this.D9DC0(1);
        flag = 1;
        this.f51C.copy(snake);
      } else {
        this.f788 = 0;
        return 0;
      }
    } else if (!libre(s1, snake)) {
      this.f788 = 0;
      return 0;
    } else {
      d = this.D9DC0(1);
      flag = 1;
    }
    if (!flag) {
      if (diffdir > 512) return this.f68C < 3500 ? 1 : 0;
      this.f7A4.set(ang.x, ang.y, 0);
      if (this.A.nikita() && this.f950 < 0) this.f82C = 1; else if (this.A.stinger()) this.f838 = 1; else this.f93C = 0;
      return 1;
    }
    if (d < 3e3) {
      if (diffdir < 256 && !this.A.snakeInvencible() && this.A.snakeVivo()) {
        this.mgr.se(SE_HIT, null);
        this.DA21C();
      }
      return 1;
    }
    if (diffdir > 512) return this.f68C < 4e3 || this.f924 > 0 ? 1 : 0;
    this.f7A4.set(ang.x, ang.y, 0);
    this.f93C = 0;
    return 1;
  }
  DBF74() {
    this.mov.x = this.f7AC.x;
    this.mov.z = this.f7AC.z;
    this.D9F3C();
    const dx = this.f51C.x - this.f6C4.x, dz = this.f51C.z - this.f6C4.z;
    const vy = ratan2(dx, dz) + randS(64) & 4095;
    const len = isqrt(dz * dz + dx * dx), t2 = ratan2(len, this.f51C.y - this.f6C4.y);
    const vx = randS(8) + t2 - 1008 & 4095;
    this.adjust[4][0] = vx - 32;
    this.adjust[7][0] = vx - 64;
    this.adjust[6][0] = vx - 32;
    this.adjust[9][0] = -512;
    this.turn = vy;
  }
  DC06C(i, n = 2) {
    const p = this.puntoHueso(Math.min(i, this.huesos.length - 1), {
      x: 0,
      y: 0,
      z: 100
    });
    for (let k = 0; k < n; k++) this.sangre(p);
  }
  DC124() {
    if (this.f94C >= 30 && this.DA558(1) && (this.f940 >= 30 || this.f68C < 8001)) {
      this.f7AC.copy(this.mov);
      this.f698 = 0;
      this.f7B4 = this.turn;
      this.f778 = this.f684;
      this.f77C = this.f688;
      if (this.f6C0 > 150) {
        this.f6C0 = 0;
        this.f940 = 0;
        this.mgr.se(SE_EXCLAMATION, null);
        this.marca("!");
        if (this.f8E4++ >= 2) {
          this.f8E4 = 0;
          const se = {
            1: 128,
            2: 129,
            3: 137
          }[this.f770];
          if (se) this.se(se, this.f910);
        }
        this.log("lo ve", {
          objetivo: this.f51C.toArray().map(Math.round)
        });
      }
      this.f684 = 1;
      this.f688 = 12;
    }
  }
  DCC84() {
    if (this.f794 === 1) this.DBF74(); else if (this.f698 === 0) this.f698 = randU(4) + 26;
    if (this.f698 > 0) {
      this.f698--;
      this.turn = this.turn + randS(8) & 4095;
      if (this.f794 === 1) this.f698 = 0;
    }
    if (this.f940 > 120) {
      const t = (this.turn & 4095) + 4096, o = ((this.f770 >= 2 && this.f770 <= 3 ? this.f744[this.f768] : this.f7B4) & 4095) + 4096;
      if (Math.abs(t - o) < 256 || this.f940 > 600) {
        this.f940 = 0;
        this.f6C0 = 0;
        this.f698 = 1;
      }
    }
    if (this.f698 === 1) {
      this.D9F3C();
      this.f788 = 0;
      this.f6B0 = 0;
      this.f684 = this.f778;
      this.f688 = this.f77C;
      if (this.f770 >= 2 && this.f770 <= 3) {
        this.turn = this.f744[this.f768];
        if (this.f770 === 2) this.f774 = this.f770;
      } else this.turn = this.f7B4;
      this.f6A4 = 0;
      this.log("vuelve a patrullar");
    }
  }
  DCE60() {
    if (this.f698 === 0) {
      this.f7AC.copy(this.mov);
      this.f698 = 35;
      this.mgr.se(138, null);
      this.f688 = randU(2) === 0 ? 27 : 29;
    }
    if (this.f698 > 0) {
      this.f698--;
      if (this.f698 >= 16 && !(this.f698 & 1)) this.DC06C(randU(8), 2);
      if (this.f698 === 1) {
        this.f684 = this.f780;
        this.f688 = this.f784;
        this.D9F3C();
        this.f6B0 = 0;
        this.f6A4 = 0;
        this.f788 = 0;
        if (this.f770 >= 2 && this.f770 <= 3) {
          this.turn = this.f744[this.f768];
          if (this.f770 === 2) this.f774 = 2;
        }
      }
    }
  }
  DC7A0() {
    if (this.f94C < 300) this.f94C++;
    if (!(this.f950 < -9)) this.f950--;
    if (this.f6B0 === 0) {
      if (this.f770 === 2) this.f688 = 4; else if (this.f770 === 1) this.f688 = this.f774 !== 0 ? 4 : 8; else if (this.f770 === 3) {
        this.f688 = 4;
        this.DA990();
      } else this.f688 = 8;
    }
    if (this.f688 !== 17) this.DACCC();
    if (this.f758 === -1) {
      if (this.f770 === 1 && this.f774 === 0) this.f774 = 1;
      if (this.f770 === 0) {
        const lv = this.dificultad(), h = this.f6A8;
        const umbral = lv <= 0 ? idiv(h, 2) + 1 : lv === 1 ? Math.trunc(h * .8) + 1 : lv === 2 ? idiv(h * 5, 6) + 1 : Infinity;
        if (umbral >= this.f900) {
          this.f774 = this.f770;
          this.f770 = lv >= 3 ? 3 : 1;
          this.f6A4 = 0;
          this.log("fase", {
            f770: this.f770,
            vida: this.f900
          });
        }
      }
      this.f758 = this.DB470();
      if (!this.f758) {
        this.DB500();
        this.DB868();
      }
      this.f75C = 72;
      this.f788 = 1;
    }
    if (this.f6B0 === 0 || this.f770 === 3) {
      if (this.f758 === 1) this.DBCB4(); else if (this.f758 === 2) {
        this.f764 = 1;
        this.DB9F0();
      } else if (this.f758 === 3) {
        this.f764 = -1;
        this.DB9F0();
      }
    }
    if (this.f788 && this.f794 === 1) this.f788 = 2;
    if (this.f770 === 3) this.f788 = 0;
    if (this.mgr.stun) this.mgr.se(136, null);
    if (this.f788 === 1) {
      if (this.f770 === 1 && this.f69C > 0) {
        if (this.f740 >= 0 && this.f740 < 2) {
          if (this.bloqueo(0) >= 2 && this.f738 === 1) this.f828 = 1; else this.turn = this.f744[3];
        } else if (this.f740 >= 2 && this.f740 < 4) {
          if (this.bloqueo(2) >= 2 && this.f738 === 0 && this.f73A === 2) this.f828 = 1; else this.turn = this.f744[1];
        }
        const g = this.grilla[this.f738][this.f73A];
        this.mov.z = g[1];
        this.mov.x = g[0];
      }
      if (this.f828 === 0) {
        if (this.f8E8++ >= 3) {
          this.f8E8 = 0;
          this.se(randU(2) ? 134 : 130, this.f910);
        }
        this.f688 = 17;
      }
      this.f788 = 0;
    } else if (this.f788 === 2 || this.f794 === 1) this.DC124();
  }
  DCF8C() {
    this.f798 = this.f794;
    this.f794 = this.DA558(0);
    if (this.f684 === 0) {
      this.f8F0 = 0;
      this.DC7A0();
      this.DA140();
    } else if (this.f684 === 1) {
      this.f8F0 = 1;
      this.DCC84();
    } else if (this.f684 === 3) {
      this.f8F0 = 0;
      this.DCE60();
    }
    this.DC318();
  }
  DC318() {
    const pasos = (cada, dos) => {
      const r = this.f920 % cada;
      if (r === 0) this.se(190, this.f910); else if (dos && r === 15) this.se(191, this.f910);
      this.f920++;
    };
    switch (this.f688) {
     case 0:
      this.f91C = 0;
      this.f688 = this.f900 > 0 ? 1 : 0;
      this.accionTabla(0);
      break;

     case 1:
      this.accionTabla(0);
      break;

     case 2:
      this.f91C = 0;
      this.f688 = 3;
      this.f694 = randU(128) + 64;
      this.accionTabla(0);

     case 3:
      this.accionTabla(0);
      if (this.f694-- <= 0) this.f688 = 4;
      break;

     case 4:
      if (this.dificultad() === 3 && this.mgr.frame % 256 < 240) this.DA990(); else this.f91C = 0;
      this.f688 = 5;
      this.DC290(1, 4);
      pasos(11, false);
      break;

     case 5:
      this.DC290(1, 4);
      break;

     case 6:
      this.DC290(1, 0);
      break;

     case 8:
      this.f91C = 0;
      this.f688 = 9;
      this.DC290(2, 8);
      pasos(30, true);
      break;

     case 9:
      this.DC290(2, 8);
      break;

     case 12:
      this.f6B0 = 1;
      this.f694 = 8;
      this.f688 = 13;
      this.accionTabla(3);

     case 13:
      this.accionTabla(3);
      if (this.f694-- <= 0) {
        this.f688 = 14;
        this.f6B0 = 2;
      }
      break;

     case 14:
      this.DA990();
      this.DC290(4, 14);
      break;

     case 17:
      this.f6B0 = 1;
      this.f694 = 8;
      this.f688 = 18;
      this.accionTabla(3);

     case 18:
      this.accionTabla(3);
      if (this.f694-- <= 0) {
        this.f688 = 19;
        this.f6B0 = 2;
      }
      break;

     case 19:
      this.DA990();
      this.DC290(5, 20);
      break;

     case 20:
      this.f694 = 8;
      this.f6B0 = 3;
      this.DA990();
      this.f688 = 21;
      break;

     case 21:
     case 26:
      this.DA990();
      this.accionTabla(2);
      if (this.f694-- <= 0) {
        this.f91C = 0;
        this.f6B0 = 0;
        this.turn = this.f744[this.f740];
      }
      break;

     case 22:
      this.f6B0 = 1;
      this.f694 = 8;
      this.f688 = 23;
      this.accionTabla(3);

     case 23:
      this.accionTabla(3);
      if (this.f694-- <= 0) {
        this.f688 = 24;
        this.f6B0 = 2;
      }
      break;

     case 24:
      this.DA990();
      this.DC290(6, 25);
      break;

     case 25:
      this.f694 = 8;
      this.f6B0 = 3;
      this.DA990();
      this.f688 = 26;
      break;

     case 27:
      this.DC290(7, 28);
      this.f91C = 0;
      this.f694 = 8;
      this.f6B0 = 1;
      break;

     case 29:
      this.DC290(8, 30);
      this.f91C = 0;
      this.f694 = 8;
      this.f6B0 = 1;
      break;

     case 28:
     case 30:
      this.accionTabla(2);
      if (this.f694-- <= 0) this.f6B0 = 0;
      break;
    }
  }
  DA990() {
    if (this.f830 === 0 && this.f82C === 1) {
      this.f830 = 1;
      this.f834 = randU(this.f770 === 3 ? 32 : 2) + 3;
    }
    if (this.f830 === 1 && --this.f834 === 0) {
      this.A.derribarNikita();
      this.derribos++;
      this.log("derriba un Nikita");
      this.f950 = 3;
      this.f82C = 0;
      this.f830 = 0;
    }
    if (this.f83C === 0 && this.f838 === 1) {
      this.f83C = 1;
      this.f840 = randU(2) + 12;
    }
    if (this.f83C === 1 && --this.f840 === 0) {
      this.A.derribarStinger();
      this.derribos++;
      this.log("derriba un Stinger");
      this.f838 = 0;
      this.f83C = 0;
    }
    if (this.f6A4 % 5 !== 0) return;
    if (this.f8DC++ >= 2 && this.f8F0 !== 0) {
      this.f8DC = 0;
      if (this.f6A4 % 100 === 0) {
        const r = randU(4);
        this.se(r === 0 ? 131 : r === 1 ? 136 : 133, this.f910);
      } else if (this.f6A4 % 100 === 50 && randU(2) === 0) this.se(132, this.f910);
    }
    const daño = DAÑO_BALA[Math.max(0, Math.min(4, this.dificultad() + 1))];
    if (this.f91C === 0) {
      this.f91C = 1;
      return;
    }
    if (this.dificultad() === 3) this.adjust[1][1] += randS(32);
    this.o.updateMatrixWorld(true);
    const h4 = this.huesos[4], boca = BOCA.clone().multiplyScalar(MM).applyMatrix4(h4.matrixWorld).multiplyScalar(1e3);
    const q = new THREE.Quaternion;
    h4.getWorldQuaternion(q);
    const dir = V(0, -1, 0).applyQuaternion(q);
    this.A.bala({
      origen: boca,
      dir: dir,
      "daño": daño,
      largo: 3e4,
      vel: 1e3,
      tam: 30
    });
    this.mgr.chispa(boca.clone().multiplyScalar(MM), .5, 2, 16769184);
    this.luz();
    this.tiros++;
  }
  luz() {
    if (!this.fogonazo) {
      this.fogonazo = new THREE.PointLight(16760944, 0, 6);
      this.mgr.mundo.add(this.fogonazo);
    }
    this.fogonazo.position.copy(this.puntoHueso(4, {
      x: 0,
      y: -1200,
      z: 0
    }));
    this.fogonazo.intensity = 3;
    this.tLuz = 2;
  }
  se(id, posMM = null) {
    this.mgr.se(id, posMM ? posMM.clone().multiplyScalar(MM) : null, posMM ? "bomba" : null);
  }
  DD03C() {
    this.tick++;
    if (this.tick - this.f8EC > this.f8E0) {
      this.f8E0 = randU(64) + 120;
      this.f8EC = this.tick;
      if (this.f770 >= 2 && this.f770 <= 3 && this.f924 === -1) this.se(135, this.f910);
    }
    this.f6C0++;
    this.f68C = this.D9DC0(0);
    this.f6C4.copy(this.mov);
    this.D9F8C();
    const n = this.A.nikita(), s = this.A.snake();
    if (n) this.f910.set(n.p.x + idiv(this.mov.x - n.p.x, 3), n.p.y, n.p.z + idiv(this.mov.z - n.p.z, 3)); else this.f910.set(s.x + idiv(this.mov.x - s.x, 4), s.y, s.z + idiv(this.mov.z - s.z, 4));
    this.DCF8C();
    this.f6A4++;
    if (this.f68C > 9e3) this.f940++;
    const d = this.tomarDaño();
    if (d && (d.a_mode === 1 || d.a_mode === 2) && this.f6B8 === 0) {
      this.f944 = 0;
      this.f948 = 0;
      this.f698 = 0;
      const dañoT = Math.min(256, d.daño);
      if (d.a_mode === 1) this.f900 -= 8; else this.f900 -= Math.trunc(dañoT / 3);
      this.vital = this.f900;
      this.f780 = this.f684;
      this.f784 = this.f688;
      this.D9F3C();
      this.f6B8 = 1;
      if (this.dificultad() === 3) this.mgr.se(138, null); else this.f684 = 3;
      this.f924 = 90;
      this.f6A4 = 0;
      this.f69C = 0;
      this.f93C = 1;
      this.log("daño", {
        a_mode: d.a_mode,
        recibido: d.a_mode === 1 ? 8 : Math.trunc(dañoT / 3),
        vida: this.f900
      });
    }
    if (this.f924 > 0) {
      const s1 = 90 - --this.f924;
      if (this.dificultad() === 3 && s1 < 30) this.DC06C(randU(8), 2);
      this.f944 = Math.trunc(s1 * 15e3 / 90);
      this.f948 = Math.trunc(s1 * 1024 / 90);
    }
    if (this.f924 === 0) {
      this.f924 = -1;
      this.f944 = 15e3;
      this.f6B8 = 0;
      this.f948 = 1024;
    }
    if (this.f900 <= 0 && this.f81C === 0) {
      this.DC06C(randU(8), 2);
      this.f81C = 1;
      this.blanco = false;
      this.log("muere");
    }
  }
  barra() {
    let now = idiv(idiv(this.f900 << 10, this.f6A8), 8) * 8;
    if (now < 0) {
      now = 0;
      this.f900 = 0;
    }
    let rest = this.f904;
    if (rest < now) rest = now;
    if (now < rest) this.f904 -= 8;
    if (rest < 8 || now < 8) {
      rest = 8;
      now = 8;
    }
    this.barras[0].rest = rest;
    this.barras[0].now = now;
  }
  cuadro() {
    if (this.J.vida <= 0 && !this.procSnakeMuerto && this.f8D4 !== -1) {
      this.procSnakeMuerto = true;
      this.A.proc(this.actor, "i");
    }
    if (this.fundidoEntrada > 0) {
      this.fundidoEntrada--;
      this.mgr.hud.negro = this.fundidoEntrada / 20;
    }
    if ((this.mgr.frame & 3) === 0) this.aliento();
    if (this.tLuz > 0 && --this.tLuz === 0 && this.fogonazo) this.fogonazo.intensity = 0;
    if (this.f7D4 !== 2) {
      this.DD03C();
      if (this.f90C === 0) this.f90C = 1; else if (this.f90C === 1) {
        this.f90C = 2;
        this.f904 = idiv(idiv(this.f900 << 10, this.f6A8), 8) * 8;
      }
      if (this.f90C === 2) this.barra();
      this.cuadroBarril();
      if (this.f81C === 0) {
        this.motor.tick();
        const pasoV = V(this.motor.paso[0], 0, this.motor.paso[1]).applyAxisAngle(V(0, 1, 0), this.rot * ANG);
        this.control({
          x: Math.round(pasoV.x),
          z: Math.round(pasoV.z)
        });
        this.empujar();
      }
    }
    if (this.f81C === 1) this.f81C = 2;
    if (this.f81C === 2) {
      this.f81C = 3;
      this.f8D8 = 30;
      this.fundido = 0;
    }
    if (this.f81C === 3) {
      this.fundido = Math.min(20, this.fundido + 1);
      this.mgr.hud.negro = this.fundido / 20;
      if (this.f8D8-- < 0) this.morir();
    }
  }
  cuadroBarril() {
    switch (this.f91C) {
     case 1:
      this.f6B4 = 0;
      this.f91C = 2;
      this.f918 = 0;
      this.se(180, this.f910);

     case 2:
      this.f918++;
      this.f6B4 += 20;
      if (this.f918 >= 16) {
        this.f91C = 3;
        this.f918 = 0;
      }
      break;

     case 3:
      if ((this.tick & 1) === 0) this.se(179, this.f910);
      break;

     default:
      this.f6B4 -= 6;
      if (this.f6B4 < 0) this.f6B4 = 0;
      break;
    }
    if (this.huesoBarril) this.huesoBarril.rotation.y += this.f6B4 * ANG;
  }
  empujar() {
    const r = this.J.ctx.rig.position, dx = r.x * 1e3 - this.mov.x, dz = r.z * 1e3 - this.mov.z, L = 800 + 300;
    if (Math.abs(dx) >= L || Math.abs(dz) >= L || Math.abs(r.y * 1e3 - this.piso) > 2e3) return;
    const px = L - Math.abs(dx), pz = L - Math.abs(dz);
    if (px < pz) r.x += (Math.sign(dx) || 1) * px * MM; else r.z += (Math.sign(dz) || 1) * pz * MM;
  }
  aliento() {
    if (!this.o) return;
    const p = this.puntoHueso(6, {
      x: 0,
      y: 0,
      z: 150
    });
    this.mgr.chispa(p, .18, 10, 11583688);
  }
  dibujar() {
    if (!this.o) return;
    super.dibujar();
  }
  morir() {
    if (!this.vivo) return;
    this.log("fin", {
      proc: this.f8D0
    });
    const info = {
      jefe: "VULCAN RAVEN",
      proc: this.f8D0,
      demos: [],
      siguiente: null
    };
    this.victoria = info;
    this.vivo = false;
    this.blanco = false;
    this.o?.removeFromParent();
    this.barras = [];
    this.fogonazo?.removeFromParent();
    if (this.f8D0 !== -1) this.A.proc(this.actor, "n");
    setTimeout(() => {
      if (this.mgr.hud) this.mgr.hud.negro = 0;
    }, 600);
  }
  destruir() {
    super.destruir();
    this.fogonazo?.removeFromParent();
  }
  estadoPrueba() {
    return {
      vida: this.f900,
      max: this.f6A8,
      fase: this.f770,
      modo: this.f684,
      accion: this.f688,
      anim: this.f670,
      pos: [ Math.round(this.mov.x), Math.round(this.mov.z) ],
      nodo: [ this.f738, this.f73A ],
      sig: [ this.f73C, this.f73E ],
      dir: this.f740,
      ve: this.f794,
      "sinDaño": this.f924,
      tiros: this.tiros,
      derribos: this.derribos,
      muere: this.f81C
    };
  }
}

export class Cuervos extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.nombre = "CROW";
    this.A = apoyo(mgr);
    this.registro = [];
    this.blanco = false;
  }
  async iniciar() {
    const n = Math.min(24, this.opt("n", 1)), s = this.opts.s || [ -9e3, 4e3, -6e3, 9e3, 7e3, 9e3 ];
    this.f54 = this.procId("i") || -1;
    this.f34 = V(Math.min(s[0], s[3]), Math.min(s[1], s[4]), Math.min(s[2], s[5]));
    this.f3C = V(Math.max(s[0], s[3]), Math.max(s[1], s[4]), Math.max(s[2], s[5]));
    this.f44 = this.f34.clone();
    this.f4C = this.f3C.clone();
    this.f4C.y = this.f34.y;
    this.f2C = this.f34.clone().add(this.f3C).multiplyScalar(.5).round();
    this.f28 = n;
    this.f58 = 0;
    this.f5C = randU(4);
    this.f60 = randU(64) + 20;
    this.f64 = randU(64) + 20;
    const [base, datos] = await Promise.all([ cargarModelo(this.ctx, "jefes/cuervo.glb"), fetch("assets/anim/crow.json").then(r => r.json()) ]);
    const {Motor: Motor} = await (import("./base.js"));
    this.o = new THREE.Group;
    this.o.name = "jefe_CROW";
    this.mgr.mundo.add(this.o);
    this.aves = [];
    for (let i = 0; i < n; i++) {
      const m = base.clone(true);
      this.o.add(m);
      this.ctx.teñir?.(m);
      const huesos = [];
      for (let k = 0; k < datos.huesos; k++) huesos.push(m.getObjectByName("hueso_" + k));
      const padres = huesos.map(h => {
        const r = /^hueso_(\d+)$/.exec(h?.parent?.name || "");
        return r ? +r[1] : -1;
      });
      const motor = new Motor(datos, datos.huesos);
      motor.accion(0, 0);
      const c = {
        o: m,
        huesos: huesos,
        padres: padres,
        motor: motor,
        mov: V(),
        turn: V(),
        rot: V(),
        f384: V(),
        f38C: V(),
        f394: V(),
        f39C: V(),
        f3A4: V(),
        f3AC: randU(2),
        f3B0: 0,
        f3B4: randU(4096),
        accion: 0,
        f3BC: 5,
        f3C0: 0,
        f3C4: 0,
        f3C8: 0,
        vivo: true,
        golpes: [],
        piso: null
      };
      const r = () => randU(64);
      c.mov.set(this.f34.x + ((this.f3C.x - this.f34.x) * r() >> 6), this.f34.y + ((this.f3C.y - this.f34.y) * r() >> 6), this.f34.z + ((this.f3C.z - this.f34.z) * r() >> 6));
      c.rot.y = randU(4096);
      c.turn.copy(c.rot);
      c.proxy = {
        __cuervo: c,
        think: {
          t1: 1
        },
        combo: 0,
        tCombo: 0,
        faint: 1,
        faintMax: 1,
        get o() {
          return c.o;
        },
        get accion() {
          return c.f3C0 ? "muerto" : "jefe";
        },
        vital: 1
      };
      this.aves.push(c);
    }
    const J = this.J, yo = this;
    if (!J.__cuervos3) {
      J.__cuervos3 = true;
      const activos = J.activos.bind(J), dañar = J.dañar.bind(J);
      J.activos = () => {
        const l = activos();
        return yo.mgr.enCuadro || !yo.vivo ? l : l.concat(yo.aves.filter(c => !c.f3C0 && c.o.visible).map(c => c.proxy));
      };
      J.dañar = (g, cuanto, modo = 1) => g && g.__cuervo ? yo.mgr.aturdiendo ? 0 : g.__cuervo.golpes.push(modo) : dañar(g, cuanto, modo);
    }
    this.dibujar();
  }
  ruido() {
    if (randU(4096) % this.aves.length >= this.f28) return;
    if (this.f60-- < 0) {
      this.f60 = randU(32) + 20;
      const r = randU(4096) % 3;
      this.f58 = this.f58 !== r ? r : this.f58 + 1 >= 3 ? 0 : this.f58 + 1;
      this.mgr.se(this.f58 + 181, null);
    }
    if (this.f64-- < 0) {
      this.f64 = randU(16) + 15;
      const r = randU(4);
      this.f5C = this.f5C !== r ? r : this.f5C + 1 >= 4 ? 0 : this.f5C + 1;
      this.mgr.se(this.f5C + 185, null);
    }
  }
  angulos(from, to, out) {
    const d = to.clone().sub(from);
    out.y = ratan2(d.x, d.z) & 4095;
    out.x = (ratan2(isqrt(d.x * d.x + d.z * d.z), d.y) & 4095) - 1024;
  }
  fuera(p) {
    return p.x < this.f44.x || this.f4C.x < p.x || p.z < this.f44.z || this.f4C.z < p.z;
  }
  delante(c, desde, rot, dist) {
    return V(0, 0, dist).applyEuler(new THREE.Euler(rot.x * ANG, rot.y * ANG, rot.z * ANG, "YXZ")).add(desde).round();
  }
  accionC(c, a, sig) {
    if (c.accion !== a) {
      c.accion = a;
      c.motor.accion(a, 4);
    } else if (c.motor.isEnd === 1) c.f3C4 = sig;
  }
  cuadro() {
    this.ruido();
    const n = this.aves.length, t1 = this.mgr.frame % n, t2 = (this.mgr.frame + (n >> 1)) % n;
    this.aves.forEach((c, i) => {
      c.f3B0--;
      c.f3B4++;
      if (c.f3C8 === 0) {
        if (c.f3C0 === 0 && c.golpes.length) {
          c.golpes = [];
          this.f28--;
          c.f39C.set(randS(64), randU(32) + 32, randU(64));
          c.f3C0 = 1;
          c.f3C4 = 3;
          this.registro.push({
            f: this.mgr.frame,
            t: "cuervo derribado",
            i: i
          });
        }
      } else c.golpes = [];
      if (this.mgr.stun && c.f3C8 !== 1 && c.f3C4 < 3) {
        c.f3C8 = 1;
        c.f3C4 = 10;
      }
      switch (c.f3C4) {
       case 0:
        c.f3B0 = randU(256) + 30;
        this.angulos(c.mov, this.f2C, c.turn);

       case 1:
        {
          c.f3C4 = 2;
          const r = randU(8);
          c.f3BC = r === 0 ? 7 : r >= 4 ? 6 : 5;
          c.f394 = this.delante(c, c.mov, c.turn, randU(4096) + 2e3);
          if (this.fuera(c.f394)) c.f394 = this.delante(c, c.mov, c.turn, 1e3);
          c.f394.y = c.mov.y + randS(2048);
          if (c.f394.y < this.f34.y || this.f3C.y < c.f394.y) c.f394.y = this.f2C.y;
          const s1 = V(0, c.turn.y + (c.f3AC === 0 ? 1024 : -1024), 0);
          c.f38C = this.delante(c, c.f394, s1, randU(2048) + 1e3);
          if (this.fuera(c.f38C)) c.f38C = this.delante(c, c.f394, s1, 1e3); else if (c.mov.distanceTo(this.f2C) < 3500) c.f3AC = 1 - c.f3AC;
          c.f39C.z = randU(64) + 100;
        }

       case 2:
        if (c.mov.distanceTo(c.f38C) < 1e3) c.f3C4 = 1;
        c.f384.set(c.f394.x * 7 + c.f38C.x >> 3, c.f394.y * 7 + c.f38C.y >> 3, c.f394.z * 7 + c.f38C.z >> 3);
        c.f394.copy(c.f384);
        this.angulos(c.mov, c.f384, c.turn);
        c.mov.add(V(0, 0, c.f39C.z).applyEuler(new THREE.Euler(c.turn.x * ANG, c.turn.y * ANG, 0, "YXZ")).round());
        this.accionC(c, c.f3BC, 2);
        break;

       case 3:
        c.f3C4 = 4;
        this.mgr.se(184, null);
        this.f60 = 0;
        this.f64 = 0;
        break;

       case 4:
       case 11:
        c.mov.add(c.f39C);
        c.turn.x += 164;
        c.turn.y += 284;
        c.turn.z += 394;
        c.f39C.x = Math.trunc(c.f39C.x * 15 / 16);
        c.f39C.y -= 3;
        c.f39C.z = Math.trunc(c.f39C.z * 15 / 16);
        this.accionC(c, 4, c.f3C4);
        if (this.alPiso(c) || c.mov.y < -2e4) {
          if (c.f3C4 === 4) c.f3C4 = 5; else {
            c.f3C4 = 12;
            c.f3B0 = randU(128) + 60;
            c.turn.x = 0;
            c.turn.z = 0;
          }
        }
        break;

       case 5:
        c.f3B0 = 60;
        c.f3C4 = 6;
        if (this.f54 !== -1) this.A.proc(this.actor, "i");

       case 6:
        c.o.visible = c.f3B0 % 4 >= 2;
        if (c.f3B0 < 0) c.f3C4 = 7;
        break;

       case 7:
        c.o.visible = false;
        c.f3C4 = 8;
        break;

       case 8:
        c.f3C4 = 9;
        break;

       case 10:
        c.f3C4 = 11;
        c.f39C.y = randU(64) + 4;
        this.f60 = 0;
        this.f64 = 0;
        break;

       case 12:
        this.accionC(c, 9, 12);
        if (c.f3B0 < 0 && !this.mgr.stun) {
          c.f3C8 = 0;
          c.f3C4 = 0;
          c.f39C.set(0, 0, 0);
        }
        break;
      }
      if (c.f3C4 !== 9) {
        c.rot.x = nearExp2(c.rot.x, c.turn.x);
        c.rot.y = c.rot.y + Math.trunc(envolver(c.turn.y - c.rot.y) / 4);
        c.rot.z = nearExp2(c.rot.z, c.turn.z);
        c.motor.tick();
      }
    });
  }
  alPiso(c) {
    const h = this.J.alturaPiso?.(c.mov.x * MM, c.mov.z * MM, c.mov.y * MM + .5);
    if (h == null) return false;
    const p = Math.round(h * 1e3);
    if (c.mov.y <= p) {
      c.mov.y = p;
      return true;
    }
    return false;
  }
  dibujar() {
    for (const c of this.aves || []) {
      c.o.position.set(c.mov.x * MM, c.mov.y * MM, c.mov.z * MM);
      c.o.rotation.set(c.rot.x * ANG, c.rot.y * ANG, c.rot.z * ANG, "YXZ");
      const raiz = c.motor.altura;
      for (let j = 0; j < c.huesos.length; j++) {
        const h = c.huesos[j];
        if (!h) continue;
        const r = c.motor.rots[j];
        h.rotation.set(r[0] * ANG, r[1] * ANG, r[2] * ANG, "ZYX");
      }
      void raiz;
    }
  }
  destruir() {
    this.vivo = false;
    this.o?.removeFromParent();
  }
}
