// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { Jefe, MM, ANG, randU } from "./base.js";

import { MJ, trunc, V3, copiar, sumar, restar, largo3, dir2, ratan2, rsin, randRango, aVisor, rotar, nearSpeed, nearExp, fase, Blanco, T, LADO, P, powerTarget, Cuerpo, sprite, efecto, fogonazo, chispa, sangre, explosion, humo, fuego, BalaJeep } from "./jeep_base.js";

export const MODELOS_ENEMIGOS = [ "armas/famas", "liquid", "ippanhei", "low_109p", "19b_o1", "19b_o2", "19b_o3a", "19b_o3b", "19b_o3c", "19b_o4a", "19b_o4b" ];

export const ANIMS_ENEMIGOS = [ "lqd_19b", "enemy_19b" ];

const nearExp4 = (a, b) => nearExp(a, b, 4), nearExp2 = (a, b) => nearExp(a, b, 2), nearExp8 = (a, b) => nearExp(a, b, 8);

const nearExp4P = (a, b) => nearExp(fase(a, b), b, 4);

const nivelJuego = sc => sc.dificultad ? sc.dificultad() : 1;

const STATE_PADRELEASE = 273293312;

export class Jeep2 {
  constructor(scroll) {
    const S = this.sis = scroll.sis;
    this.scroll = scroll;
    this.rec = scroll.rec;
    this.vivo = true;
    this.mov = V3();
    this.rot390 = V3(0, 2048, 0);
    this.rot398 = V3(0, 2048, 0);
    this.abs = {
      x: S.f28,
      y: 0,
      z: S.f30 + 2e4
    };
    this.prev = {
      x: this.abs.x,
      y: 0,
      z: this.abs.z + 400
    };
    this.vel = V3(0, 0, -400);
    this.vel380 = V3();
    this.velAnt = V3(0, 0, -2048);
    this.f3B0 = 425;
    this.f3A8 = 425;
    this.f3AC = 425;
    this.f3A0 = 0;
    this.f3A4 = 0;
    this.f3B4 = 0;
    this.f3B8 = 0;
    this.f3BC = 0;
    this.f3C0 = 0;
    this.f3C4 = 0;
    this.f3C8 = 0;
    this.f3CC = 0;
    this.f3D4 = 0;
    this.f3D8 = 0;
    this.f3E0 = 0;
    this.f3E4 = 0;
    this.f3EC = 0;
    this.f3F0 = 0;
    this.mov.z = this.abs.z - S.f30;
    const c = scroll.centro800CEC24(this.mov.z);
    this.mov.x = c.x;
    this.abs.x = c.x + S.f28;
    this.mov.y = c.y;
    this.despacho = this.inicio800D76B0;
    this.velFn = this.v800D7ACC;
    this.lateral = this.l800D7BB0;
    this.conducta = this.intro800D81A8;
    this.ruedas = Array.from({
      length: 5
    }, () => [ 0, 0, 0 ]);
    this.blanco = new Blanco(S, T.PUSH, LADO.NINGUNO, {
      x: 365,
      y: 440,
      z: 677
    }, this);
    this.raiz = new THREE.Group;
    this.raiz.name = "jeep_liquid";
    scroll.raiz.add(this.raiz);
    for (const n of [ "jeep_b", "jeep_fhl", "jeep_hl" ]) {
      const o = this.rec.nuevo(n);
      if (o) this.raiz.add(o);
    }
    this.t = new Cuerpo(this.rec, "jeep_t", null, this.raiz);
    const g = this.rec.nuevo("jeep_gun");
    if (g) {
      g.position.set(0, 1.435, -.925);
      this.raiz.add(g);
    }
    S.liquid = new LiquidJeep(this);
    S.f54 = 65536;
  }
  act() {
    const S = this.sis, sc = this.scroll;
    this.prev = copiar(this.abs);
    this.abs.x += this.vel.x;
    this.abs.z += this.vel.z;
    this.mov.x = this.abs.x - S.f28;
    this.mov.z = this.abs.z - S.f30;
    if (this.f3C4) {
      if (this.f3C0 === 0) this.f3B0 -= trunc(this.f3B0 / 4);
      this.f3B4 |= 1;
      if (this.f3B8 === 0) this.f3B8 = 20;
    } else this.f3B4 &= ~1;
    this.f3C4 = 0;
    if (this.f3B8) this.f3B8--;
    this.despacho();
    if (sc.evento800CEDFC(this.mov.z, -8e3) === 31) {
      this.destruir();
      return;
    }
    this.f3B4 &= ~12;
    const b = this.blanco;
    if (b.damaged & T.PUSH) {
      const o = b.offset;
      this.mov.x += o.x;
      this.mov.z += o.z;
      this.abs.x += o.x;
      this.abs.y += o.y;
      let se = false;
      if (this.lateral === this.l800D7D68) {
        this.f3B4 |= 4;
        if (this.f3C0 === 0) this.rot390.y = nearExp2(this.rot390.y, 2048);
        if (this.f3BC === 0 && o.x >= 41) se = true;
      } else {
        this.f3B4 |= 8;
        if (this.f3BC === 0) se = true;
      }
      if (se) {
        this.f3BC = 15;
        sc.se(176, this.mov);
      }
    }
    b.damaged &= ~T.PUSH;
    b.offset = V3();
    if (this.f3BC) this.f3BC--;
    const pw = sc.paredes800D9C90?.(this.mov);
    if (pw) this.abs.x -= 3 * pw.delta.x;
    S.jeep.fisica800D9EC0.call({
      scroll: sc
    }, this.mov, this.rot390, this.vel, this.velAnt);
    const a0 = trunc(this.f3AC * 4096 / 1178);
    for (const i of [ 1, 2, 3, 4 ]) this.ruedas[i][0] = this.ruedas[i][0] + a0 & 4095;
    let v1 = this.rot390.y - this.rot398.y;
    if (this.f3AC < 0) v1 = -v1;
    this.ruedas[3][1] = this.ruedas[4][1] = nearExp4P(this.ruedas[3][1], v1 * 4);
    this.rot398 = copiar(this.rot390);
    b.mover(this.mov);
    S.liquid?.act();
  }
  inicio800D76B0() {
    this.velFn();
    this.f3A0 = 0;
    this.conducta();
    this.manejo800D6FB8();
  }
  normal800D7114() {
    const S = this.sis;
    this.velFn();
    this.lateral();
    this.conducta();
    this.manejo800D6FB8();
    const e = S.estado;
    if (e === 6) this.despacho = this.maniobra800D7200; else if (e === 7) this.despacho = this.maniobra800D7330; else if (e === 8) this.despacho = this.final800D7468;
    if (this.despacho !== this.normal800D7114) {
      this.f3EC = 0;
      this.ponerVel(this.v800D77F0);
      this.ponerLateral(this.l800D7BB0);
      this.ponerConducta(this.esquiva800D8044);
      this.f3CC = 0;
      this.scroll.log("Liquid: " + (e === 8 ? "final" : "maniobra " + (e - 5)));
    }
  }
  manejo800D6FB8() {
    const v = rotar(this.rot390, {
      x: 0,
      y: 0,
      z: this.f3A8
    });
    this.vel.x = Math.round(v.x);
    this.vel.z = Math.round(v.z);
    const c = this.scroll.centro800CEC24(this.mov.z - 1600), d = restar(c, this.mov);
    d.x += this.f3A0 + (rsin(this.f3C8 << 5) * 50 >> 12) + (rsin(this.f3C8 << 7) * 2 * this.f3B8 >> 12);
    this.rot390.y = dir2(d);
    this.f3C8++;
    this.f3AC = this.f3A8;
  }
  ponerVel(f) {
    if (this.velFn !== f) {
      this.velFn = f;
      this.f3D8 = 0;
      this.f3D4 = 0;
    }
  }
  ponerLateral(f) {
    if (this.lateral !== f) {
      this.lateral = f;
      this.f3E4 = 0;
      this.f3E0 = 0;
    }
  }
  ponerConducta(f) {
    if (this.conducta !== f) {
      this.conducta = f;
      this.f3E4 = 0;
      this.f3E0 = 0;
      this.f3B4 &= ~2;
    }
  }
  dist() {
    const S = this.sis;
    return this.abs.z - (S.f30 - S.f20.z);
  }
  velSnake() {
    return this.sis.jeep.f3D0;
  }
  vel800D771C(cur, desde, real) {
    const d = real - desde, b = this.velSnake();
    if (d >= 0) {
      if (d >= 3001) return nearSpeed(cur, b + 100, 15);
      if (d >= 751) return nearSpeed(cur, b + 50, 8);
      if (d >= 94) return nearSpeed(cur, b + 15, 3);
      return cur;
    }
    if (d < -3e3) return nearSpeed(cur, b - 100, 15);
    if (d < -750) return nearSpeed(cur, b - 50, 8);
    if (d < -93) return nearSpeed(cur, b - 15, 3);
    return cur;
  }
  vDist(desde) {
    this.f3B0 = this.vel800D771C(this.f3B0, desde, this.dist());
    this.f3A8 = nearSpeed(this.f3A8, this.f3B0, 5);
  }
  v800D77F0() {
    this.vDist(1875);
  }
  v800D797C() {
    this.vDist(0);
  }
  v800D79EC() {
    this.vDist(-375);
  }
  v800D7A5C() {
    this.vDist(3e3);
  }
  v800D7ACC() {
    this.vDist(4500);
  }
  v800D7860() {
    const S = this.sis, s1 = this.dist(), a1 = this.velSnake();
    if (this.f3D4 === 0) {
      if (this.f3B4 & 8) {
        let v = this.f3A8 - 50;
        v -= trunc(v / 16);
        this.f3A8 = v;
        this.f3B0 = v;
        this.f3D4 = 60;
        S.f54 |= 2;
      } else if (s1 >= 1501) {
        this.f3B0 = nearSpeed(this.f3B0, a1 + 50, 7);
        S.f54 |= 4096;
      }
    } else {
      this.f3B0 = this.vel800D771C(this.f3B0, 3e3, s1);
      this.f3D4--;
    }
    this.f3A8 = nearSpeed(this.f3A8, this.f3B0, 5);
  }
  azar(c, r) {
    return randRango(r) - trunc(r / 2) + c;
  }
  l800D7BB0() {
    if (++this.f3E0 === 30) {
      this.f3A4 = this.azar(0, 1200);
      this.f3E0 = 0;
    }
    this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 30);
  }
  l800D7C0C() {
    const n = ++this.f3E0;
    if (this.f3E4 === 0) {
      this.f3A4 = 1350;
      this.f3A0 = nearSpeed(this.f3A0, 1350, 50);
      if (this.f3E0 === 40) {
        this.f3E4 = 1;
        this.f3E0 = 19;
      }
    } else {
      if (n === 20) {
        this.f3A4 = this.azar(1250, 250);
        this.f3E0 = 0;
      }
      this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 30);
    }
  }
  l800D7CBC() {
    const n = ++this.f3E0;
    if (this.f3E4 === 0) {
      this.f3A4 = 1500;
      if (this.f3E0 === 40) {
        this.f3E4 = 1;
        this.f3E0 = 19;
      }
      this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 50);
    } else {
      if (n === 20) {
        this.f3A4 = this.azar(1500, 250);
        this.f3E0 = 0;
      }
      this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 30);
    }
  }
  l800D7D68() {
    const n = ++this.f3E0;
    if (this.f3E4 === 0) {
      if (n === 1) this.f3A4 = this.azar(750, 400); else if (n === 30) {
        this.f3E4 = 1;
        this.f3E0 = 0;
      }
      this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 50);
    } else {
      if (n === 1) this.f3A4 = -550; else if (n === 60) {
        this.f3E4 = 0;
        this.f3E0 = 0;
      }
      this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 100);
    }
  }
  lEsquiva(c) {
    const S = this.sis, n = ++this.f3E0;
    if (this.f3E4 === 0) {
      if (n === 1) {
        this.f3A4 = this.azar(c, 150);
        if (c > 0) this.f3E0 = 0;
      } else if (n === 60) {
        this.f3E4 = 1;
        this.f3E0 = 0;
      }
      const r = nearSpeed(this.f3A0, this.f3A4, 75);
      this.f3A0 = r;
      if (r === this.f3A4) S.f54 |= 8192;
    } else {
      if (n === 1) this.f3A4 = this.azar(c, 250); else if (n === 30) {
        this.f3E4 = 1;
        this.f3E0 = 0;
      }
      this.f3A0 = nearSpeed(this.f3A0, this.f3A4, 25);
    }
  }
  l800D7E2C() {
    this.lEsquiva(-750);
  }
  l800D7F20() {
    this.lEsquiva(750);
  }
  intro800D81A8() {
    const S = this.sis, n = this.f3F0++;
    if (n === 0) {
      S.gameStatus |= STATE_PADRELEASE;
      this.scroll.camara.escena800D0A20(0);
    } else if (n >= 336) {
      S.gameStatus &= ~STATE_PADRELEASE;
      this.ponerConducta(this.esquiva800D8044);
      this.ponerVel(this.v800D77F0);
      this.despacho = this.normal800D7114;
    }
  }
  esquiva800D8044() {
    const S = this.sis;
    if (S.f5C !== 0 && this.f3F0 >= 21) {
      this.f3F0 = 0;
      this.ponerLateral(this.f3A0 > 0 ? this.l800D7E2C : this.l800D7F20);
      S.f54 |= 4096;
      this.scroll.se([ 185, 189, 190, 191 ][randU(4)], this.mov);
    } else this.f3F0++;
  }
  embiste800D8118() {
    const d = this.mov.z - this.sis.jeep.mov.z;
    if (d < 0) {
      this.f3EC = 5;
      this.ponerVel(this.v800D79EC);
      this.ponerLateral(this.l800D7D68);
    } else {
      this.f3EC = 2;
      this.ponerVel(this.v800D79EC);
      this.ponerLateral(this.l800D7F20);
    }
  }
  maniobra800D7200() {
    const sc = this.scroll;
    if (this.f3CC === 0) {
      this.v800D7A5C();
      this.manejo800D6FB8();
      this.f3A0 = nearSpeed(this.f3A0, 750, 50);
      if (sc.evento800CEDFC(this.mov.z, 2e3) === 10) this.f3CC = 1;
    } else if (this.f3CC === 1) {
      this.v800D7860();
      this.manejo800D6FB8();
      this.l800D7CBC();
      if (sc.evento800CEDFC(this.mov.z, 3e3) === 12) this.f3CC = 2;
    } else if (this.f3CC === 2) {
      this.v800D77F0();
      this.manejo800D6FB8();
      this.f3A0 = nearSpeed(this.f3A0, 650, 50);
      if (this.f3A0 === 650) {
        this.despacho = this.normal800D7114;
        this.f3A4 = 650;
        this.f3CC = 0;
      }
    }
  }
  maniobra800D7330() {
    const sc = this.scroll;
    if (this.f3CC === 0) {
      this.v800D7A5C();
      this.manejo800D6FB8();
      this.f3A0 = nearSpeed(this.f3A0, 750, 50);
      if (sc.evento800CEDFC(this.mov.z, 2e3) === 11) this.f3CC = 1;
    } else if (this.f3CC === 1) {
      this.v800D797C();
      this.manejo800D6FB8();
      this.l800D7C0C();
      if (sc.evento800CEDFC(this.mov.z, 3e3) === 13) this.f3CC = 2;
    } else if (this.f3CC === 2) {
      this.v800D797C();
      this.manejo800D6FB8();
      this.f3A0 = nearSpeed(this.f3A0, 750, 50);
      if (this.f3A0 === 750) {
        this.despacho = this.normal800D7114;
        this.ponerConducta(this.embiste800D8118);
        this.f3CC = 0;
      }
    }
  }
  final800D7468() {
    const S = this.sis, sc = this.scroll;
    switch (this.f3CC) {
     case 0:
      this.f3C8 = 0;
      this.f3CC = 1;
      this.f3C0 = 1;
      S.f54 |= 131072;
      S.gameStatus |= STATE_PADRELEASE;
      sc.camara.escena800D0A20(1);

     case 1:
      this.v800D797C();
      this.manejo800D6FB8();
      this.f3A0 = nearSpeed(this.f3A0, 500, 30);
      if (sc.evento800CEDFC(this.mov.z, 22e3) === 14) this.f3CC = 2;
      break;

     case 2:
      this.manejo800D6FB8();
      this.f3A0 = nearSpeed(this.f3A0, 250, 30);
      this.f3A8 = nearSpeed(this.f3A8, 500, 3);
      if (sc.evento800CEDFC(this.mov.z, 6e3) === 14) {
        this.f3CC = 3;
        this.vel380 = copiar(this.vel);
      }
      break;

     case 3:
      {
        const v = rotar(this.rot390, {
          x: 0,
          y: 0,
          z: this.f3A8
        });
        this.vel380.x = nearExp8(this.vel380.x, 0);
        this.vel380.z = nearExp8(this.vel380.z, 0);
        this.vel.x = Math.round(v.x) + this.vel380.x;
        this.vel.z = Math.round(v.z) + this.vel380.z;
        this.rot390.y = nearExp8(this.rot390.y, 3072);
        this.f3A8 = nearExp4(this.f3A8, 0);
        this.f3AC = 0;
        if (this.vel.x === 0 && this.vel.z === 0) this.f3CC = 4;
        break;
      }
    }
    this.f3C8++;
  }
  dibujar() {
    aVisor(this.mov, this.raiz.position);
    this.raiz.rotation.set(this.rot390.x * ANG, this.rot390.y * ANG, this.rot390.z * ANG, "XYZ");
    for (let i = 1; i <= 4; i++) {
      const h = this.t.huesos?.[i];
      if (h) h.rotation.set(this.ruedas[i][0] * ANG, this.ruedas[i][1] * ANG, 0, "ZYX");
    }
    this.raiz.updateMatrixWorld(true);
    this.sis.liquid?.dibujar();
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.sis.liquid?.destruir();
    this.sis.liquid = null;
    this.raiz.removeFromParent();
    this.blanco.liberar();
    const a = this.sis.actores, i = a.indexOf(this);
    if (i >= 0) a.splice(i, 1);
    if (this.sis.jeep2 === this) this.sis.jeep2 = null;
  }
}

const LIQ_POS = {
  x: 350,
  y: 975,
  z: -350
};

const LIQ_BOCA = {
  x: 5,
  y: -500,
  z: 80
};

const LIQ_ESPERA = [ 20, 20, 16, 12, 5 ];

export class LiquidJeep {
  constructor(jeep2) {
    const S = this.sis = jeep2.sis;
    this.jeep2 = jeep2;
    this.scroll = jeep2.scroll;
    this.rec = jeep2.rec;
    this.cuerpo = new Cuerpo(this.rec, "liquid", "lqd_19b", jeep2.raiz);
    const f = this.rec.nuevo("armas/famas");
    this.famas = null;
    if (f && this.cuerpo.huesos?.[4]) {
      this.cuerpo.huesos[4].add(f);
      this.famas = f;
    }
    this.blanco = new Blanco(S, T.AVAIL, LADO.ENEMIGO, {
      x: 175,
      y: 500,
      z: 175
    }, this);
    this.estado = null;
    this.t = 0;
    this.f8FC = -1;
    this.f900 = 0;
    this.f904 = -1;
    this.f90C = 0;
    this.f910 = 0;
    this.f914 = 0;
    this.f918 = 0;
    this.f920 = 0;
    this.f930 = 0;
    this.f934 = 0;
    this.f93C = 0;
    this.f940 = 0;
    this.homingOn = true;
    this.adj7A0 = 0;
    this.adj7A8 = 0;
    this.mov = V3();
    this.vivo = true;
    this.cuerpo.config(0, 0);
    this.tiros = 0;
    this.golpes = 0;
  }
  act() {
    const S = this.sis;
    this.cuerpo.tick();
    this.cuerpo.raiz.position.set(LIQ_POS.x * MM, (LIQ_POS.y - this.cuerpo.altura) * MM, LIQ_POS.z * MM);
    this.cuerpo.pose();
    this.jeep2.raiz.updateMatrixWorld(true);
    const w = this.cuerpo.puntoMundo(0);
    this.mov = w;
    S.cabezaLiquid = this.cuerpo.puntoMundo(6);
    this.blanco.mover(this.mov);
    this.cerebro800D964C();
    this.cuerpo.visible((this.f940 & 3) !== 1);
  }
  homing() {
    return this.homingOn && this.vivo ? this.cuerpo.puntoMundo(5) : null;
  }
  cerebro800D964C() {
    const S = this.sis, sn = S.snake?.mov || V3();
    const d = restar(sn, this.mov);
    d.y = 0;
    this.f930 = dir2(d);
    this.f934 = largo3(d);
    this.f904 = -1;
    this.f900 = 0;
    this.espera = LIQ_ESPERA[Math.max(0, Math.min(4, nivelJuego(this.scroll) + 1))];
    if (this.f90C === 0) {
      if (this.f910 === 0) this.cerebro800D9AA8(); else this.espera800D9B38();
      this.f910 = S.f54 & 268435456 ? 1 : 0;
    }
    S.f54 &= 4294901760;
    this.f920++;
    this.estados800D9558();
  }
  interrumpe800D9680() {
    const js = this.sis.f54;
    if (js & 4096) {
      this.f914 = 4;
      this.f918 = 0;
      this.f900 |= 16;
      return 1;
    }
    if (js & 2) {
      this.f900 |= 33554432;
      return 0;
    }
    if (js & 32768) {
      this.f900 = 67108864;
      return 1;
    }
    if (this.f8FC === 20) {
      this.f914 = 4;
      this.f918 = 0;
      this.f900 |= 16;
      return 1;
    }
    return 0;
  }
  cerebro800D9AA8() {
    switch (this.f914) {
     case 0:
      this.decidir800D9704();
      break;

     case 1:
      this.apuntar(1, 1);
      break;

     case 2:
      this.apuntar(3, 2);
      break;

     case 3:
      this.apuntar(2, 4);
      break;

     case 4:
      this.agachado800D99C4();
      break;
    }
  }
  espera800D9B38() {
    const js = this.sis.f54;
    if (this.f914 === 0) {
      if (js & 4096) {
        this.f914 = 4;
        this.f918 = 0;
        this.f900 |= 16;
      } else this.f918++;
    } else if (this.f914 === 4) {
      this.f900 |= 16;
      if (js & 8192) this.f914 = 0;
      this.f918++;
    }
  }
  decidir800D9704() {
    if (this.interrumpe800D9680()) return;
    if (this.f934 < 4e3 || this.f93C !== 0) {
      const a = this.f930;
      let n = 0;
      if (a - 1537 >>> 0 < 1023) n = 1; else if (a - 513 >>> 0 < 1023) n = 3; else if (a - 2561 >>> 0 < 1023) n = 2;
      if (n) {
        this.f914 = n;
        this.f918 = 0;
        return;
      }
    }
    this.f918++;
  }
  apuntar(accion, bit) {
    if (this.interrumpe800D9680()) return;
    if (this.f8FC !== accion) this.f918 = 0;
    if (this.f918 >= 76) {
      this.f914 = 0;
      this.f918 = 0;
      return;
    }
    const v = this.espera;
    if (this.f918 === v + 6 || this.f918 === v + 9 || this.f918 === v + 12) this.f900 |= 8;
    this.f900 |= bit;
    this.f904 = this.f930;
    this.f918++;
  }
  agachado800D99C4() {
    const js = this.sis.f54;
    this.f900 |= 16;
    if (this.f918 >= 61 || js & 8192) {
      this.f93C = 1;
      this.f914 = 0;
    }
    if (js & 2) {
      this.f914 = 1;
      this.f900 |= 33554432;
    }
    this.f918++;
  }
  estados800D9558() {
    this.blanco.clase = T.AVAIL;
    const old = this.t++;
    if (!this.estado) {
      this.objetivo800D8918();
      this.estado = this.parado800D8B54;
    }
    this.estado(old);
    const A = this.cuerpo.adjust;
    if (A) {
      A[2][1] = nearExp4P(A[2][1], this.adj7A0);
      A[6][1] = nearExp4P(A[6][1], this.adj7A8);
    }
    if (this.f940 !== 0) {
      this.blanco.clase = T.AVAIL;
      this.f940--;
    }
  }
  objetivo800D8918() {
    const n = nivelJuego(this.scroll);
    this.blanco.set(T.POWER | T.SEEK, LADO.ENEMIGO, {
      x: 175,
      y: 500,
      z: 175
    }).power(P.DECREASE, -1, n > 0 ? (n << 6) + 191 : 191, 7);
  }
  cambiar(fn) {
    this.estado = fn;
    this.t = 0;
  }
  config(a, interp = 4) {
    this.f8FC = a;
    this.cuerpo.config(a, interp);
  }
  blancoOn() {
    this.blanco.clase |= 20;
  }
  "daño800D88D8"() {
    const S = this.sis, b = this.blanco;
    if (b.damaged & T.POWER) {
      b.force = V3();
      this.scroll.se(129, this.mov);
      this.cambiar(S.f54 & 131072 ? this.golpeFinal800D9434 : this.golpe800D9390);
      b.damage = 0;
      b.damaged = 0;
      this.golpes++;
      if (b.vital <= 0) {
        S.f44++;
        const n = nivelJuego(this.scroll);
        b.vital += 191 + (n > 0 ? n << 6 : 0);
        this.scroll.log("Liquid: vida a 0 (permiso)", {
          permisos: S.f44,
          vida: b.vital
        });
      } else this.scroll.log("Liquid: tiro", {
        vida: b.vital
      });
      b.clase = T.AVAIL;
      return 1;
    }
    if (this.f900 & 33554432) this.cambiar(this.sacudon800D94C8);
    return 0;
  }
  postura800D899C() {
    const v = this.f900;
    if (v & 1) {
      this.cambiar(this.p1_800D8BC8);
      return 1;
    }
    if (v & 2) {
      this.cambiar(this.p3_800D8CEC);
      return 1;
    }
    if (v & 4) {
      this.cambiar(this.p2_800D8E10);
      return 1;
    }
    if (v & 16) {
      this.cambiar(this.agacha800D90A8);
      return 1;
    }
    if (v & 67108864) {
      this.cambiar(this.final800D92C8);
      return 1;
    }
    return 0;
  }
  parado800D8B54(t) {
    if (t === 0) this.config(0);
    if (this.daño800D88D8()) return;
    if (this.postura800D899C()) return;
    this.blancoOn();
  }
  postura(t, accion, bit, extra, tirar) {
    const f900 = this.f900;
    if (t === 0) this.config(accion);
    this.adj7A0 = this.adj7A8 = this.f930 + extra - this.jeep2.rot390.y;
    if (!(f900 & bit)) {
      this.cambiar(this.parado800D8B54);
      this.adj7A0 = this.adj7A8 = 0;
      return;
    }
    if (f900 & 8) {
      this.cambiar(tirar);
      return;
    }
    if (this.daño800D88D8()) return;
    if (this.postura800D899C()) return;
    this.blancoOn();
  }
  p1_800D8BC8(t) {
    this.postura(t, 1, 1, 0, this.tira1_800D8F34);
  }
  p3_800D8CEC(t) {
    this.postura(t, 3, 2, 3264, this.tira3_800D8FB0);
  }
  p2_800D8E10(t) {
    this.postura(t, 2, 4, 832, this.tira2_800D902C);
  }
  tiro(t, volver) {
    if (t === 0) this.tirar800D8AEC();
    if (this.daño800D88D8()) return;
    if (t === 1) this.cambiar(volver);
    this.blancoOn();
  }
  tira1_800D8F34(t) {
    this.tiro(t, this.p1_800D8BC8);
  }
  tira3_800D8FB0(t) {
    this.tiro(t, this.p3_800D8CEC);
  }
  tira2_800D902C(t) {
    this.tiro(t, this.p2_800D8E10);
  }
  tirar800D8AEC() {
    const S = this.sis, sc = this.scroll, c = this.cuerpo;
    const boca = c.puntoMundo(4, LIQ_BOCA);
    const h = c.huesos?.[4];
    let dir = {
      x: 0,
      y: 0,
      z: 1
    };
    if (h) {
      const q = new THREE.Quaternion;
      h.getWorldQuaternion(q);
      const v = new THREE.Vector3(0, -1, 0).applyQuaternion(q).normalize();
      dir = {
        x: v.x,
        y: v.y,
        z: v.z
      };
    }
    new BalaJeep(S, this.rec, sc.raiz, boca, dir, LADO.ENEMIGO, {
      conPared: true,
      pared: (o, d, l) => sc.paredBala(o, d, l)
    });
    sc.se(46, boca);
    fogonazo(S, this.rec, sc.raiz, boca, 220);
    this.tiros++;
  }
  agacha800D90A8(t) {
    if (t < 8) this.blancoOn();
    if (this.daño800D88D8()) return;
    if (t === 0) this.config(16);
    if (this.cuerpo.isEnd) this.cambiar(this.agachado800D9148);
  }
  agachado800D9148(t) {
    if (this.f900 & 16) {
      if (this.daño800D88D8()) return;
      if (t === 0) this.config(17);
      if (t < 91) return;
    }
    this.cambiar(this.levanta800D91DC);
  }
  levanta800D91DC(t) {
    if (t < 8 && this.f900 & 16) {
      this.cambiar(this.agachado800D9148);
      return;
    }
    if (t >= 8) this.blancoOn();
    if (this.daño800D88D8()) return;
    if (this.f93C !== 0 && t >= 11) {
      this.cambiar(this.parado800D8B54);
      this.f93C = 0;
    }
    if (t === 0) this.config(18);
    if (this.cuerpo.isEnd) this.cambiar(this.parado800D8B54);
  }
  final800D92C8(t) {
    if (t === 0) this.config(10);
  }
  golpe800D9390(t) {
    if (t === 0) {
      this.config(20);
      sangre(this.sis, this.rec, this.scroll.raiz, this.cuerpo.puntoMundo(5), 4);
      this.jeep2.f3C4 |= 1;
    }
    if (this.cuerpo.isEnd) {
      this.cambiar(this.parado800D8B54);
      this.f940 = 45;
      this.f93C = 0;
    }
  }
  golpeFinal800D9434(t) {
    if (this.postura800D899C()) return;
    if (t === 0) {
      sangre(this.sis, this.rec, this.scroll.raiz, this.cuerpo.puntoMundo(5), 4);
      this.jeep2.f3C4 |= 1;
    }
    if (t >= 17) this.cambiar(this.parado800D8B54);
  }
  sacudon800D94C8(t) {
    this.blancoOn();
    if (this.daño800D88D8()) return;
    if (t === 0) this.config(19);
    if (this.cuerpo.isEnd) this.cambiar(this.parado800D8B54);
  }
  dibujar() {}
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.cuerpo.destruir();
    this.blanco.liberar();
  }
}

const ACC_EMY = [ 19, 10, 22, 9, 8, 27, 3, 7, 38, 24, 23, 17, 18, 43, 22 ];

const EMY_BOCA = {
  x: 5,
  y: -500,
  z: 80
};

export class SoldadoJeep extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.esJeep = true;
    this.blanco = false;
    const S = this.sis = mgr.__jeepSis;
    this.scroll = S?.scroll;
    if (!S) return;
    const gp = S.gate, mitad = v => ({
      x: trunc(v[0] / 2) + gp.x,
      y: trunc(v[1] / 2) + gp.y,
      z: trunc(v[2] / 2) + gp.z
    });
    const p = actor.p || actor.opts?.p || [ 0, 0, 0 ], d = actor.d || actor.opts?.d || [ 0, 0, 0 ];
    this.mov = mitad(p);
    this.rot = d[1] & 4095;
    this.turn = this.rot;
    const n = this.opt("n", 0), a = (this.opts.a || []).filter(x => typeof x === "number");
    this.puntos = [];
    for (let i = 0; i < n && i * 3 + 2 < a.length; i++) this.puntos.push(mitad(a.slice(i * 3, i * 3 + 3)));
    this.f8EC = copiar(this.mov);
    this.f8F4 = copiar(this.puntos[0] || this.mov);
    this.f8D4 = 0;
    this.f8E0 = 0;
    this.f8E4 = V3();
    this.f930 = 0;
    this.f934 = 0;
    this.f938 = 0;
    this.f93C = 0;
    this.f940 = -1;
    this.f944 = 0;
    this.f948 = 0;
    this.f94C = 0;
    this.f950 = 0;
    this.f954 = 0;
    this.f964 = 0;
    this.f968 = 0;
    this.estado = null;
    this.t = 0;
    this.radar = true;
    this.homOn = true;
    this.step = V3();
    this.rSphere = -1;
    this.enPiso = false;
    this.t1 = new Blanco(S, T.AVAIL, LADO.ENEMIGO, {
      x: 200,
      y: 500,
      z: 200
    }, this);
    this.t2 = new Blanco(S, T.AVAIL, LADO.ENEMIGO, {
      x: 200,
      y: 500,
      z: 200
    }, this);
    this.cuerpo = new Cuerpo(this.scroll.rec, "ippanhei", "enemy_19b", this.scroll.raiz);
    const f = this.scroll.rec.nuevo("armas/famas");
    if (f && this.cuerpo.huesos?.[4]) {
      this.cuerpo.huesos[4].add(f);
      this.famas = f;
    }
    this.ctx.teñir?.(this.cuerpo.o);
    this.piso = this.scroll.pisoEn(this.mov.x, this.mov.z, this.mov.y + 500);
    this.listo = true;
    this.scroll.log("soldado", {
      nombre: "#" + (actor.nombre || 0).toString(16),
      p: this.mov,
      puntos: this.puntos.length
    });
  }
  async iniciar() {}
  cuadro() {}
  enRadar() {
    return this.radar;
  }
  homing() {
    return this.homOn && this.vivo ? sumar(this.mov, V3(0, 0, 0)) : null;
  }
  act() {
    const S = this.sis, sc = this.scroll;
    if (!S) return;
    this.mov = sumar(this.mov, S.pos);
    this.f8EC = sumar(this.f8EC, S.pos);
    this.f8F4 = sumar(this.f8F4, S.pos);
    this.puntos = this.puntos.map(q => sumar(q, S.pos));
    if (this.mov.z > 16e3) {
      this.destruir();
      return;
    }
    this.cuerpo.tick();
    const paso = this.cuerpo.motor?.paso || [ 0, 0 ];
    if (this.f8E0 !== 0) {
      this.step.x = this.f8E4.x;
      this.step.z = this.f8E4.z;
    } else {
      const r = rotar({
        x: 0,
        y: this.rot,
        z: 0
      }, {
        x: paso[0],
        y: 0,
        z: paso[1]
      });
      this.step.x = r.x;
      this.step.z = r.z;
    }
    this.mov.x += trunc(this.step.x / 2);
    this.mov.z += trunc(this.step.z / 2);
    this.mov.y += trunc(this.step.y / 2);
    const piso = sc.pisoEn(this.mov.x, this.mov.z, this.mov.y + 300), alto = trunc(this.cuerpo.altura / 2);
    if (this.mov.y <= piso + alto) {
      this.mov.y = piso + alto;
      this.enPiso = true;
    } else this.enPiso = false;
    this.piso = piso;
    this.rot = nearExp4P(this.rot, this.turn) & 4095;
    this.t1.mover(this.mov);
    this.t2.mover(this.mov);
    this.f5F7C();
  }
  f5F7C() {
    const S = this.sis, sn = S.snake?.mov || V3(), d = restar(sn, this.mov);
    d.y = 0;
    this.f964 = dir2(d);
    this.f968 = largo3(d);
    this.f940 = -1;
    this.f93C = 0;
    if (this.f944 === 0) {
      if (this.f948 === 0) this.desprevenido800C6524(); else this.alerta800C65A8();
    }
    this.f954++;
    this.t1.clase = T.AVAIL;
    const old = this.t++;
    if (!this.estado) {
      this.blancos800C5278();
      this.estado = this.parado800C54D0;
    }
    this.estado(old);
    if (this.f8D4 < 0 && this.enPiso) this.f8D4 = 0;
    this.f8D4 -= 16;
    this.step.y = this.f8D4;
  }
  blancos800C5278() {
    const n = nivelJuego(this.scroll);
    this.t1.set(T.POWER | T.SEEK, LADO.ENEMIGO, {
      x: 200,
      y: 500,
      z: 200
    }).power(P.DECREASE, -1, n > 0 ? 255 + n * 64 : 255, 7);
    this.t2.set(T.POWER | T.SEEK, LADO.ENEMIGO, {
      x: 200,
      y: 500,
      z: 200
    }).power(P.DECREASE, -1, 100, 0);
  }
  desprevenido800C6524() {
    if (this.f94C === 0) {
      if (this.f968 < 6e3) this.f94C = 1; else this.f940 = this.rot;
    } else if (this.f94C === 1) {
      this.f93C = 256;
      this.f94C = 2;
      this.f948 = 1;
      this.f940 = this.f964;
    }
    if (this.sis.alerta !== 0) {
      this.f948 = 1;
      this.f94C = 2;
    }
    this.f950 = randU(32);
  }
  alerta800C65A8() {
    if (this.f94C === 0) {
      this.f94C = 3;
      this.f950 = randU(32);
    } else if (this.f94C === 2) {
      this.f93C |= 1;
      if (this.f950 > 15) {
        this.f94C = 3;
        this.f950 = 0;
      } else {
        this.f940 = this.f964;
        this.f950++;
      }
    } else if (this.f94C === 3) {
      if (this.f950 > 30 && randU(8) === 0) this.f950 = 0;
      if (this.f950 === 6) this.f93C |= 2;
      this.f93C |= 1;
      this.f940 = this.f964;
      this.f950++;
    }
    const d = restar(this.f8F4, this.mov);
    d.y = 0;
    if (largo3(d) > 250) {
      this.f93C = 4;
      this.f940 = dir2(d);
    }
  }
  cambiar(fn) {
    this.estado = fn;
    this.t = 0;
  }
  config(i, interp = 4) {
    this.f930 = i;
    this.cuerpo.config(ACC_EMY[i], interp);
  }
  on() {
    this.t1.clase |= T.POWER | T.SEEK;
  }
  girar(v) {
    if (v >= 0) this.turn = v & 4095;
  }
  "daño800C5010"() {
    const S = this.sis;
    let t = this.t1;
    if (t.damaged & T.POWER) {
      if (t.a_mode === 1) {
        t.force = V3();
        if (t.vital <= 0) {
          this.f934 = 0;
          this.cambiar(this.caida800C598C);
        } else this.cambiar(this.golpe800C58CC);
        t.damage = 0;
        t.damaged = 0;
        if (this.puntos.length) this.f8F4 = copiar(this.puntos[randRango(this.puntos.length)]);
        S.alerta = 1;
        this.scroll.log("soldado: tiro", {
          vida: t.vital
        });
        return 1;
      }
      t.force = V3();
      t.damage = 0;
      t.damaged = 0;
    }
    t = this.t2;
    if (t.damaged & T.POWER) {
      if (t.a_mode === 2) {
        const f = {
          x: t.force.x,
          y: 0,
          z: t.force.z
        }, len = Math.abs(t.force.x) + Math.abs(t.force.y) + Math.abs(t.force.z);
        const l = Math.hypot(f.x, f.z) || 1;
        this.f8E4 = {
          x: Math.round(f.x * trunc(len / 4) / l),
          y: 0,
          z: Math.round(f.z * trunc(len / 4) / l)
        };
        this.f8E0 = 1;
        this.f934 = len < 100 ? 2 : 1;
        this.cambiar(this.caida800C598C);
        this.t1.vital = 0;
        t.damage = 0;
        t.damaged = 0;
        this.scroll.log("soldado: explosión", {
          fuerza: len
        });
        return 1;
      }
      t.vital = 100;
      t.force = V3();
      return 0;
    }
    return 0;
  }
  cambio800C5348() {
    if (this.f93C & 4) {
      this.cambiar(this.camina800C5654);
      return 1;
    }
    if (this.f93C & 1) {
      this.cambiar(this.apunta800C5714);
      return 1;
    }
    if (this.f93C & 256) {
      this.cambiar(this.alarma800C5560);
      return 1;
    }
    return 0;
  }
  altura800C53C0() {
    const sn = this.sis.snake;
    if (!sn || !this.cuerpo.adjust) return;
    const h = sn.cabeza.y - this.cuerpo.puntoMundo(6).y, a = (ratan2(this.f968, h) & 4095) - 1024, A = this.cuerpo.adjust;
    A[2][0] = a;
    A[6][0] = a;
    A[7][0] = a < 0 ? a * 3 : trunc(a * 3 / 2);
  }
  parado800C54D0(t) {
    if (t === 0) this.config(0);
    if (!this.daño800C5010() && !this.cambio800C5348()) {
      this.girar(this.f940);
      this.on();
    }
  }
  alarma800C5560(t) {
    const S = this.sis;
    if (t === 0) {
      this.config(4);
      this.marca();
      this.scroll.mgr.se(42, null, null);
      if (S.alerta === 0) this.scroll.mgr.voicesys?.CE2D0();
      S.alerta = 1;
      this.scroll.log("soldado: alarma");
    }
    this.on();
    if (!this.daño800C5010()) {
      this.girar(this.f940);
      if (this.cuerpo.isEnd) this.cambiar(this.parado800C54D0);
    }
  }
  camina800C5654(t) {
    if (t === 0) this.config(1);
    this.on();
    if (!this.daño800C5010()) {
      if (!(this.f93C & 4)) {
        if (!this.cambio800C5348()) this.cambiar(this.parado800C54D0);
      } else this.girar(this.f940);
    }
  }
  apunta800C5714(t) {
    const f = this.f93C;
    if (t === 0) this.config(2);
    this.altura800C53C0();
    this.on();
    if (!this.daño800C5010()) {
      if (!(f & 1)) this.cambiar(this.parado800C54D0); else if (f & 2) this.cambiar(this.tira800C57E8); else this.girar(this.f964);
    }
  }
  tira800C57E8(t) {
    if (t === 0) this.config(2);
    if (t === 5 || t === 8 || t === 11) this.tirar800C543C();
    this.on();
    if (!this.daño800C5010()) {
      this.altura800C53C0();
      this.girar(this.f964);
      if (t > 18) this.cambiar(this.apunta800C5714);
    }
  }
  tirar800C543C() {
    const S = this.sis, sc = this.scroll, c = this.cuerpo;
    const boca = c.puntoMundo(4, EMY_BOCA);
    const h = c.huesos?.[4];
    let v = new THREE.Vector3(0, 0, 1);
    if (h) {
      const q = new THREE.Quaternion;
      h.getWorldQuaternion(q);
      v = new THREE.Vector3(0, -1, 0).applyQuaternion(q).normalize();
    }
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), randU(16) * ANG);
    new BalaJeep(S, sc.rec, sc.raiz, boca, {
      x: v.x,
      y: v.y,
      z: v.z
    }, LADO.ENEMIGO, {
      conPared: false
    });
    this.scroll.mgr.se(46, aVisor(this.mov), null);
    fogonazo(S, sc.rec, sc.raiz, boca, 200);
    this.tiros = (this.tiros || 0) + 1;
  }
  golpe800C58CC(t) {
    if (t > 8) this.on();
    if (!this.daño800C5010()) {
      if (t === 0) {
        this.config(5);
        this.scroll.mgr.se(38, aVisor(this.mov), null);
        sangre(this.sis, this.scroll.rec, this.scroll.raiz, this.cuerpo.puntoMundo(5), 3);
      }
      if (this.cuerpo.isEnd) this.cambiar(this.parado800C54D0);
    }
  }
  caida800C598C(t) {
    this.rSphere = 500;
    if (t === 0) {
      if (this.f934 === 0) {
        this.config(6);
        this.f938 = 46;
      } else if (this.f934 === 2) {
        this.config(7);
        this.f938 = 14;
      } else {
        this.config(8);
        this.f938 = 22;
      }
      sangre(this.sis, this.scroll.rec, this.scroll.raiz, this.cuerpo.puntoMundo(this.t1.vital <= 0 && this.f934 === 0 ? 6 : 5), 4);
      this.scroll.mgr.se(38, aVisor(this.mov), null);
      this.mgr.J.ctx.alMorir?.(this.proxy);
    }
    if (this.f934 === 0 && t === 24) this.scroll.mgr.se(81, aVisor(this.mov), null);
    if (this.f934 === 2 && t === 17) this.f8E0 = 0;
    if (this.f934 === 1 && t === 37) this.f8E0 = 0;
    if (t > 16 && this.enPiso) {
      this.f8E0 = 0;
      this.f8E4 = V3();
    }
    if (t === this.f938) this.scroll.mgr.se(51, aVisor(this.mov), null);
    if (this.cuerpo.isEnd) {
      this.rSphere = -1;
      this.t1.force = V3();
      this.cambiar(this.t1.vital <= 0 ? this.muere800C5D18 : this.levanta800C5C50);
    }
  }
  levanta800C5C50(t) {
    this.on();
    if (!this.daño800C5010()) {
      if (t === 0) this.config(this.f934 === 2 ? 9 : 10);
      if (this.cuerpo.isEnd) this.cambiar(this.parado800C54D0);
    }
  }
  muere800C5D18(t) {
    this.homOn = false;
    if (t === 0) {
      this.config(this.f934 < 2 ? this.f934 === 0 ? 13 : 11 : 12);
      if (this.famas) this.famas.visible = false;
      this.radar = false;
      this.t1.clase = T.AVAIL;
      this.scroll.log("soldado muerto");
    }
    this.cuerpo.visible(!(t & 2));
    if (t > 32) this.destruir();
  }
  marca() {
    const s = sprite(this.scroll.rec, null, 16726570, false);
    s.material.map = (new THREE.TextureLoader).load("assets/hud/b_mark.png");
    s.material.depthTest = false;
    s.renderOrder = 999;
    s.scale.setScalar(.5);
    const p = this.cuerpo.puntoMundo(6);
    p.y += 400;
    efecto(this.sis, this.scroll.raiz, s, 30, null, {
      p: p,
      mundo: true
    });
  }
  dibujar() {
    if (!this.sis || !this.cuerpo) return;
    this.cuerpo.raiz.position.set(this.mov.x * MJ, (this.mov.y - trunc(this.cuerpo.altura / 2)) * MJ, this.mov.z * MJ);
    this.cuerpo.raiz.rotation.y = this.rot * ANG;
    this.cuerpo.pose();
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    this.cuerpo?.destruir();
    this.t1?.liberar();
    this.t2?.liberar();
    this.radar = false;
  }
}

export class TamborJeep extends Jefe {
  constructor(actor, mgr) {
    super(actor, mgr);
    this.esJeep = true;
    this.blanco = false;
    const S = this.sis = mgr.__jeepSis;
    this.scroll = S?.scroll;
    if (!S) return;
    const p = actor.p || actor.opts?.p || [ 0, 0, 0 ], d = actor.d || actor.opts?.d || [ 0, 0, 0 ];
    this.mov = {
      x: trunc(p[0] / 2) + S.gate.x,
      y: S.gate.y,
      z: trunc(p[2] / 2) + S.gate.z
    };
    this.rot = d[1] & 4095;
    this.depth = this.mov.z;
    if (this.depth > 0) this.depth -= 65536;
    this.o = this.scroll.rec.nuevo("19b_o4a") || new THREE.Group;
    this.scroll.raiz.add(this.o);
    this.alto = 312;
    this.mov.y = this.scroll.pisoEn(this.mov.x, this.mov.z, this.mov.y + 1e3) + this.alto;
    this.f1EC = 0;
    this.f1F0 = 0;
    this.homOn = true;
    this.b = new Blanco(S, T.POWER | T.SEEK, LADO.ENEMIGO, {
      x: 435,
      y: 375,
      z: 185
    }, this).power(P.DECREASE, -1, 150, 0);
    this.b.mover(this.mov);
    this.listo = true;
  }
  async iniciar() {}
  cuadro() {}
  homing() {
    return this.homOn && this.vivo ? copiar(this.mov) : null;
  }
  act() {
    const S = this.sis, sc = this.scroll;
    if (!S) return;
    let cambio = false;
    const b = this.b;
    if (b.damaged & T.POWER) {
      b.damaged &= ~T.POWER;
      if (b.vital < 0 && this.f1F0 === 0) {
        this.f1EC = 1;
        this.f1F0 = 1;
        b.vital = 255;
        this.homOn = false;
        b.lado = LADO.AMBOS;
        b.clase = T.AVAIL;
        sc.log("tambor: revienta", {
          p: this.mov
        });
      }
    }
    if (this.f1F0 !== 0) {
      if (this.f1F0 < 10) this.f1F0++;
      if (this.f1F0 === 7) {
        const rot = this.o;
        this.o = sc.rec.nuevo("19b_o4b") || new THREE.Group;
        sc.raiz.add(this.o);
        rot.removeFromParent();
        cambio = true;
      }
    }
    this.mov = sumar(this.mov, S.pos);
    this.depth += S.pos.z;
    if (this.depth > 32e3) {
      this.destruir();
      return;
    }
    if (cambio) {
      this.blast();
      humo(S, sc.rec, sc.raiz, this.mov, 150);
      fuego(S, sc.rec, sc.raiz, {
        x: this.mov.x,
        y: this.mov.y - this.alto,
        z: this.mov.z
      }, 30);
    }
    b.mover(this.mov);
  }
  blast() {
    const S = this.sis, sc = this.scroll;
    const t = new Blanco(S, T.POWER, LADO.NINGUNO, {
      x: 500,
      y: 500,
      z: 500
    });
    t.power(P.CONST | P.EXPLODE, 2, 256, 2, {
      x: 100,
      y: 0,
      z: 0
    });
    t.mover(this.mov);
    powerTarget(S, t);
    t.set(T.POWER, LADO.NINGUNO, {
      x: 2e3,
      y: 2e3,
      z: 2e3
    });
    t.power(P.CONST | P.EXPLODE, 2, 1, 3, {
      x: 50,
      y: 0,
      z: 0
    });
    t.mover(this.mov);
    powerTarget(S, t);
    t.liberar();
    explosion(S, sc.rec, sc.raiz, this.mov);
    sc.mgr.se(41, aVisor(this.mov), "bomba");
    sc.vibrar(10);
    this.explotó = true;
  }
  dibujar() {
    if (!this.o) return;
    aVisor(this.mov, this.o.position);
    this.o.rotation.y = this.rot * ANG;
  }
  destruir() {
    if (!this.vivo) return;
    super.destruir();
    this.o?.removeFromParent();
    this.b?.liberar();
  }
}

export class PuertaJeep {
  constructor(scroll, pos, lado) {
    const S = this.sis = scroll.sis;
    this.scroll = scroll;
    this.vivo = true;
    this.lado = lado;
    const off = lado === 0 ? {
      x: -1250,
      y: 562,
      z: 1375
    } : {
      x: 1250,
      y: 562,
      z: 625
    };
    this.mov = sumar(pos, off);
    this.dist = this.mov.z;
    if (this.dist > 0) this.dist -= 65536;
    this.o = scroll.rec.nuevo(lado === 0 ? "19b_o2" : "19b_o3a") || new THREE.Group;
    scroll.raiz.add(this.o);
    const ancho = lado === 0 ? 2749 : 2749, hondo = 125;
    this.b = new Blanco(S, T.POWER, LADO.NINGUNO, {
      x: trunc(ancho / 4),
      y: 1e3,
      z: trunc(hondo / 4)
    }, this).power(P.DECREASE, -1, 3, 0);
    this.b.mover(this.mov);
    this.hit = 0;
    this.piezas = null;
  }
  act() {
    const S = this.sis, sc = this.scroll, b = this.b;
    if (b.damaged & T.POWER && this.hit === 0) {
      b.damaged &= ~T.POWER;
      if (b.a_mode === 2) {
        b.vital = 255;
        this.o.visible = false;
        this.hit = 1;
        b.clase = T.AVAIL;
        const mk = (n, x, step, turn, rotz) => {
          const o = sc.rec.nuevo(n) || new THREE.Group;
          sc.raiz.add(o);
          return {
            o: o,
            pos: {
              x: x,
              y: this.mov.y,
              z: this.mov.z
            },
            step: step,
            rot: {
              x: 0,
              y: 0,
              z: rotz
            },
            turn: turn
          };
        };
        this.piezas = [ mk("19b_o3b", this.mov.x + trunc(b.size.x / 2), {
          x: 50,
          y: -10,
          z: -170
        }, {
          x: 300,
          y: -160,
          z: 0
        }, 500), mk("19b_o3c", this.mov.x - trunc(b.size.x / 2), {
          x: 80,
          y: 50,
          z: -50
        }, {
          x: 200,
          y: 20,
          z: 0
        }, -200) ];
        sc.se(186, this.mov);
        sc.log("barrera rota", {
          lado: this.lado
        });
      }
    }
    this.mov = sumar(this.mov, S.pos);
    this.dist += S.pos.z;
    if (this.dist > 32e3) {
      this.destruir();
      return;
    }
    if (this.piezas) for (const g of this.piezas) {
      g.step.y -= 27;
      g.pos = sumar(sumar(g.pos, S.pos), g.step);
      g.rot = sumar(g.rot, g.turn);
      const c = sc.centro800CEC24(g.pos.z);
      if (g.pos.y < c.y) {
        g.pos.y = c.y;
        g.step.x = trunc(g.step.x / 2);
        g.step.y = -trunc(g.step.y / 2);
        g.step.z = trunc(g.step.z / 2);
        g.turn.x = trunc(g.turn.x / 2);
        g.turn.y = -trunc(g.turn.y / 2);
        g.rot.z = -trunc(g.rot.z / 2);
      }
    }
    b.mover(this.mov);
  }
  dibujar() {
    aVisor(this.mov, this.o.position);
    if (this.piezas) for (const g of this.piezas) {
      aVisor(g.pos, g.o.position);
      g.o.rotation.set(g.rot.x * ANG, g.rot.y * ANG, g.rot.z * ANG, "YXZ");
    }
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.o.removeFromParent();
    for (const g of this.piezas || []) g.o.removeFromParent();
    this.b.liberar();
    const a = this.sis.actores, i = a.indexOf(this);
    if (i >= 0) a.splice(i, 1);
  }
}

export class VidrioJeep {
  constructor(scroll, pos, lado) {
    const S = this.sis = scroll.sis;
    this.scroll = scroll;
    this.vivo = true;
    const off = lado === 0 ? {
      x: 0,
      y: 1062,
      z: 1625
    } : {
      x: 0,
      y: 1062,
      z: 375
    };
    this.mov = sumar(pos, off);
    this.dist = this.mov.z;
    if (this.dist > 0) this.dist -= 65536;
    this.rot = lado === 1 ? 2048 : 0;
    this.o = scroll.rec.nuevo("19b_o1") || new THREE.Group;
    scroll.raiz.add(this.o);
    this.b = new Blanco(S, T.POWER | T.SEEK, LADO.ENEMIGO, {
      x: trunc(1374 / 4),
      y: trunc(1375 / 4) + 100,
      z: trunc(1125 / 4)
    }, this).power(P.DECREASE, -1, 3, 0);
    this.b.mover(this.mov);
  }
  act() {
    const S = this.sis, sc = this.scroll, b = this.b;
    let roto = false;
    if (b.damaged & T.POWER) {
      b.damaged &= ~T.POWER;
      if (b.vital < 0) {
        b.vital = 255;
        this.o.visible = false;
        b.clase = T.AVAIL;
        roto = true;
        sc.se(179, this.mov);
        sc.log("vidrio roto");
      }
    }
    this.mov = sumar(this.mov, S.pos);
    this.dist += S.pos.z;
    if (this.dist > 32e3) {
      this.destruir();
      return;
    }
    if (roto) for (const a of [ 0, 1024, 3072 ]) this.salpicar(a);
    b.mover(this.mov);
  }
  salpicar(ang) {
    const S = this.sis, sc = this.scroll;
    for (let i = 0; i < 4; i++) {
      const s = sprite(sc.rec, "m19_c2_glass1hlf", 12636415, false);
      s.scale.setScalar(120 * MJ);
      const d = rotar({
        x: 0,
        y: ang + this.rot,
        z: 0
      }, {
        x: (Math.random() - .5) * 40,
        y: 0,
        z: 20 + Math.random() * 30
      });
      const v = {
        x: d.x,
        y: 30 + Math.random() * 30,
        z: d.z
      };
      efecto(S, sc.raiz, s, 30, (t, f) => {
        f.p.x += v.x;
        f.p.y += v.y;
        f.p.z += v.z;
        v.y -= 6;
        aVisor(f.p, s.position);
        s.material.rotation += .3;
        s.material.opacity = 1 - t / 30;
      }, {
        p: this.mov,
        mundo: true
      });
    }
  }
  dibujar() {
    aVisor(this.mov, this.o.position);
    this.o.rotation.y = this.rot * ANG;
  }
  destruir() {
    if (!this.vivo) return;
    this.vivo = false;
    this.o.removeFromParent();
    this.b.liberar();
    const a = this.sis.actores, i = a.indexOf(this);
    if (i >= 0) a.splice(i, 1);
  }
}
