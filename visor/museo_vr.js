// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

import { FondoVR } from "./fondo_vr.js";

const ALTO_PARED = 1;

function textura(url, repetir = true) {
  const t = (new THREE.TextureLoader).load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function uvMetros(geo, escala = new THREE.Vector3(1, 1, 1)) {
  const P = geo.attributes.position, N = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) * escala.x, y = P.getY(i) * escala.y, z = P.getZ(i) * escala.z, nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i));
    if (ny > .5) uv.setXY(i, x + .5, z + .5); else if (nx > .5) uv.setXY(i, z + .5, y); else uv.setXY(i, x + .5, y);
  }
  uv.needsUpdate = true;
}

export class MuseoVR {
  constructor({base: base = "assets/"} = {}) {
    this.base = base;
    this.tex = {
      piso: textura(base + "vr/comun/ca94.png"),
      caja: textura(base + "vr/comun/d517.png"),
      meta: textura(base + "vr/comun/fe1c.png", false)
    };
    this.mat = {
      piso: new THREE.MeshBasicMaterial({
        map: this.tex.piso,
        color: new THREE.Color(.85, 1, .9)
      }),
      caja: new THREE.MeshBasicMaterial({
        map: this.tex.caja
      }),
      aro: new THREE.MeshBasicMaterial({
        map: this.tex.meta,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    };
    this.escena = null;
    this.fondo = null;
  }
  poner(escena) {
    this.escena = escena;
    if (!this.fondo) {
      this.fondo = new FondoVR({
        tipo: 1,
        tipo2: 1,
        vR: 22,
        base: this.base
      });
      this.fondo.listo.catch(e => console.warn("museo VR: sin fondo", e));
    }
    if (this.fondo.grupo.parent !== escena) escena.add(this.fondo.grupo);
  }
  quitar() {
    this.fondo?.grupo.removeFromParent();
    this.escena = null;
  }
  actualizar(dt, renderer) {
    if (this.fondo?.grupo.parent) this.fondo.actualizar(dt, {
      casco: !!renderer?.xr?.isPresenting
    });
  }
  estilizar(mundo) {
    mundo.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || !o.userData.propio || o.userData.estiloVR) return;
      const g = o.geometry, m = o.material;
      if (g?.type === "BoxGeometry") {
        const {width: w, height: h, depth: d} = g.parameters;
        if (h <= .25 && m?.map) {
          o.material = this.mat.piso;
          uvMetros(g);
        } else if (o.userData.sinColision && o.position.y > 2) {
          o.visible = false;
        } else {
          const ng = new THREE.BoxGeometry(w, ALTO_PARED, d);
          g.dispose();
          o.geometry = ng;
          uvMetros(ng);
          o.position.y = ALTO_PARED / 2;
          o.material = this.mat.caja;
        }
        o.userData.estiloVR = true;
      } else if (g?.type === "CylinderGeometry") {
        const ng = new THREE.BoxGeometry(1.4, .3, 1.4);
        g.dispose();
        o.geometry = ng;
        uvMetros(ng);
        o.material = this.mat.caja;
        o.userData.estiloVR = true;
      } else if (g?.type === "TorusGeometry") {
        const ng = new THREE.CircleGeometry(.8, 8);
        g.dispose();
        o.geometry = ng;
        o.material = this.mat.aro;
        o.rotation.set(-Math.PI / 2, 0, 0);
        o.position.y += .005;
        o.userData.estiloVR = true;
      }
    });
  }
  cartel(texto, sub, ancho = 1.6) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 160;
    const x = c.getContext("2d");
    x.fillStyle = "rgba(0,0,0,0.55)";
    x.fillRect(0, 0, 512, 160);
    x.strokeStyle = "rgb(64,64,64)";
    x.lineWidth = 4;
    x.strokeRect(2, 2, 508, 156);
    x.imageSmoothingEnabled = false;
    x.fillStyle = "rgb(206,206,206)";
    x.font = "40px MGS, Consolas, monospace";
    x.textAlign = "left";
    x.textBaseline = "top";
    x.fillText(String(texto).toUpperCase().slice(0, 20), 32, 34);
    x.fillStyle = "rgb(150,170,160)";
    x.font = "24px MGS, Consolas, monospace";
    x.fillText(String(sub || "").toUpperCase().slice(0, 32), 32, 98);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho * 160 / 512), new THREE.MeshBasicMaterial({
      map: t,
      transparent: true,
      depthWrite: false
    }));
    m.userData.propio = true;
    m.userData.sinColision = true;
    m.userData.estiloVR = true;
    if (document.fonts && !document.fonts.check("40px MGS")) document.fonts.load("40px MGS").then(() => {
      const n = this.cartel(texto, sub, ancho);
      m.material.map = n.material.map;
      m.material.needsUpdate = true;
    }).catch(() => {});
    return m;
  }
}
