// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const U = {
  uLuzHorno: {
    value: .85
  },
  uLuzDirecta: {
    value: .45
  }
};

function parchear(m) {
  if (m.userData.luzModerna) return;
  m.userData.luzModerna = true;
  m.vertexColors = true;
  const previo = m.onBeforeCompile, clave = m.customProgramCacheKey;
  m.onBeforeCompile = (sh, r) => {
    if (previo) previo.call(m, sh, r);
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = "uniform float uLuzHorno;\nuniform float uLuzDirecta;\n" + sh.fragmentShader.replace("#include <color_fragment>", "").replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n  totalEmissiveRadiance += diffuseColor.rgb * vColor.rgb * 2.0 * uLuzHorno;\n#endif").replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n  reflectedLight.indirectDiffuse *= 0.0; reflectedLight.directDiffuse *= uLuzDirecta; reflectedLight.directSpecular *= uLuzDirecta;");
  };
  m.customProgramCacheKey = () => (clave ? clave.call(m) : "") + "|luz-moderna1";
  m.needsUpdate = true;
}

export class LuzModerna {
  constructor({escena: escena, sol: sol, tactil: tactil = false, n: n} = {}) {
    this.escena = escena;
    this.sol = sol;
    this.hemi = escena.children.find(o => o.isHemisphereLight) || null;
    this.base = {
      hemi: this.hemi ? {
        i: this.hemi.intensity,
        c: this.hemi.color.clone(),
        g: this.hemi.groundColor.clone()
      } : null,
      sol: {
        i: sol.intensity,
        c: sol.color.clone(),
        p: sol.position.clone()
      }
    };
    this.amb = new THREE.AmbientLight(16777215, 0);
    this.amb.name = "luz_moderna_ambiente";
    escena.add(this.amb);
    this.n = n ?? (tactil ? 2 : 4);
    this.puntos = [];
    for (let i = 0; i < this.n; i++) {
      const p = new THREE.PointLight(16777215, 0, 1, 0);
      p.name = "luz_moderna_" + i;
      p.userData.propio = p.userData.sinColision = true;
      p.userData.objetivo = 0;
      p.userData.l = null;
      escena.add(p);
      this.puntos.push(p);
    }
    this.luz = null;
    this.t = 0;
    this.activa = false;
  }
  malla(o) {
    if (!o.isMesh || !o.geometry?.attributes?.color || o.isSkinnedMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [ o.material ];
    for (const m of ms) if (m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) parchear(m);
  }
  activar(luz) {
    this.activa = !!luz;
    this.luz = luz || null;
    this.t = 1e9;
    const B = this.base, sol = this.sol, h = this.hemi;
    if (!luz) {
      if (h && B.hemi) {
        h.intensity = B.hemi.i;
        h.color.copy(B.hemi.c);
        h.groundColor.copy(B.hemi.g);
      }
      sol.intensity = B.sol.i;
      sol.color.copy(B.sol.c);
      sol.position.copy(B.sol.p);
      this.amb.intensity = 0;
      for (const p of this.puntos) {
        p.intensity = 0;
        p.userData.objetivo = 0;
        p.userData.l = null;
      }
      return;
    }
    const c255 = a => new THREE.Color(a[0] / 255, a[1] / 255, a[2] / 255);
    const amb = c255(luz.amb || [ 40, 40, 40 ]), lumA = Math.max(amb.r, amb.g, amb.b, .02);
    this.amb.color.copy(amb).multiplyScalar(1 / lumA);
    this.amb.intensity = Math.PI * Math.min(.75, .22 + lumA * 1.6);
    const main = luz.main, d = new THREE.Vector3(...main?.[0] || [ 0, -1, 0 ]);
    if (d.lengthSq() < 1e-6) d.set(0, -1, 0);
    d.normalize();
    if (d.y > -.25) {
      d.y = -.25;
      d.normalize();
    }
    const cs = main ? c255(main[1]) : amb.clone(), lumS = Math.max(cs.r, cs.g, cs.b, .02);
    sol.color.copy(cs).multiplyScalar(1 / lumS);
    sol.intensity = Math.PI * Math.min(.55, .15 + lumS * 1.3);
    sol.position.copy(d).multiplyScalar(-10);
    sol.target.position.set(0, 0, 0);
    if (h) {
      h.color.copy(cs);
      h.groundColor.copy(amb).multiplyScalar(.5);
      h.intensity = .35;
    }
  }
  actualizar(dt, centro, luz) {
    if (luz !== undefined && (luz || null) !== (this.activa ? this.luz : null)) this.activar(luz);
    if (!this.activa || !this.luz) return;
    this.t += dt;
    if (this.t >= .25) {
      this.t = 0;
      const x = centro.x * 1e3, y = centro.y * 1e3, z = centro.z * 1e3, cand = [];
      for (const l of this.luz.luces || []) {
        const dx = x - l[0], dy = y - l[1], dz = z - l[2], alcance = 2 * l[3] + 6e3;
        const dd = Math.hypot(dx, dy, dz);
        if (dd > alcance) continue;
        cand.push([ Math.max(l[5], l[6], l[7]) / 255 * l[3] / (dd + l[3]), l ]);
      }
      cand.sort((a, b) => b[0] - a[0]);
      const elegidas = cand.slice(0, this.n).map(c => c[1]);
      const libres = this.puntos.filter(p => !elegidas.includes(p.userData.l));
      for (const p of this.puntos) if (!elegidas.includes(p.userData.l)) p.userData.objetivo = 0;
      for (const l of elegidas) {
        if (this.puntos.some(p => p.userData.l === l)) {
          const p = this.puntos.find(q => q.userData.l === l);
          p.userData.objetivo = 1;
          continue;
        }
        const p = libres.shift();
        if (!p) break;
        p.userData.l = l;
        p.userData.objetivo = 1;
        p.intensity = 0;
        p.position.set(l[0] / 1e3, l[1] / 1e3, l[2] / 1e3);
        const c = new THREE.Color(l[5] / 255, l[6] / 255, l[7] / 255), lum = Math.max(c.r, c.g, c.b, .02);
        p.color.copy(c).multiplyScalar(1 / lum);
        p.userData.fuerza = Math.PI * Math.min(1.6, lum * 2);
        p.distance = Math.max(.5, 2 * l[3] / 1e3);
      }
    }
    const k = Math.min(1, dt * 4);
    for (const p of this.puntos) p.intensity += ((p.userData.objetivo ? p.userData.fuerza : 0) - p.intensity) * k;
  }
}
