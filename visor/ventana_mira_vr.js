// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const ANCHO = 512, ALTO = 384, FOV_BASE = 60, FOV_MIN = 4;

export class VentanaMiraVR {
  constructor() {
    this.cam = new THREE.PerspectiveCamera(FOV_BASE, ANCHO / ALTO, .03, 3e3);
    this.e = null;
    this.rt = null;
    this._c = new THREE.Color;
    this.mat = new THREE.MeshBasicMaterial({
      color: 16777215,
      depthTest: false,
      depthWrite: false,
      toneMapped: true
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), this.mat);
    this.mesh.geometry.scale(1.2, 1.2, 1);
    const cruz = new THREE.MeshBasicMaterial({
      color: 8257440,
      transparent: true,
      opacity: .75,
      depthTest: false,
      depthWrite: false,
      toneMapped: false
    });
    this.cruz = new THREE.Group;
    for (const [x, y, w, h] of [ [ -.62, 0, .8, .018 ], [ .62, 0, .8, .018 ], [ 0, -.62, .018, .8 ], [ 0, .62, .018, .8 ] ]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cruz);
      r.position.set(x, y, .001);
      r.renderOrder = 12;
      this.cruz.add(r);
    }
    this.mesh.add(this.cruz);
  }
  conectar(paneles) {
    if (!paneles?.agregar || paneles.panel?.("ventana_mira")) return null;
    const p = paneles.agregar({
      id: "ventana_mira",
      tipo: "visera",
      prio: 1,
      malla: this.mesh,
      logico: {
        w: 320,
        h: 240
      },
      escala: () => this.escala || 1,
      visible: () => !!this.e
    });
    this.mat.toneMapped = true;
    this.mat.needsUpdate = true;
    return p;
  }
  poner(e) {
    this.e = e;
    if (!e) return;
    const fov = Math.max(FOV_MIN, FOV_BASE / Math.max(1, (e.zoom || 320) / 320));
    if (Math.abs(this.cam.fov - fov) > .01) {
      this.cam.fov = fov;
      this.cam.updateProjectionMatrix();
    }
    this.cam.position.copy(e.pos);
    this.cam.lookAt(e.pos.clone().add(e.dir));
    this.cam.updateMatrixWorld(true);
    this.cruz.visible = e.tipo === "psg1";
  }
  dibujar(R, escena, ocultar = []) {
    if (!this.e) return false;
    if (!this.rt) {
      const flotante = R.extensions?.has?.("EXT_color_buffer_float") || R.extensions?.has?.("EXT_color_buffer_half_float");
      this.rt = new THREE.WebGLRenderTarget(ANCHO, ALTO, {
        type: flotante ? THREE.HalfFloatType : THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: true
      });
      this.mat.map = this.rt.texture;
      this.mat.needsUpdate = true;
    }
    const vis = ocultar.filter(Boolean).map(o => [ o, o.visible ]);
    for (const [o] of vis) o.visible = false;
    const prev = {
      target: R.getRenderTarget(),
      xr: R.xr.enabled,
      color: R.getClearColor(this._c).getHex(),
      alfa: R.getClearAlpha(),
      auto: R.autoClear
    };
    R.xr.enabled = false;
    try {
      R.setRenderTarget(this.rt);
      R.setClearColor(0, 1);
      R.autoClear = true;
      R.clear();
      R.render(escena, this.cam);
    } finally {
      R.setRenderTarget(prev.target);
      R.xr.enabled = prev.xr;
      R.setClearColor(prev.color, prev.alfa);
      R.autoClear = prev.auto;
      for (const [o, v] of vis) o.visible = v;
    }
    return true;
  }
}
