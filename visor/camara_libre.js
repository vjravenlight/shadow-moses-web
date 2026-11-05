// MGS web — FeniXVOID · Project Ravenlight
import * as THREE from "three";

const VEL = 3, RAPIDO = 4, LENTO = .25;

const PITCH_MAX = 1.55, FOV_MIN = 15, FOV_MAX = 110;

const _q = new THREE.Quaternion, _e = new THREE.Euler(0, 0, 0, "YXZ"), _f = new THREE.Vector3, _r = new THREE.Vector3;

export class CamaraLibre {
  constructor() {
    this.cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .03, 3e3);
    this.cam.name = "camara_libre";
    this.activa = false;
    this.yaw = 0;
    this.pitch = 0;
  }
  entrar(desde) {
    desde.updateMatrixWorld();
    desde.getWorldPosition(this.cam.position);
    desde.getWorldQuaternion(_q);
    _e.setFromQuaternion(_q, "YXZ");
    this.yaw = _e.y;
    this.pitch = THREE.MathUtils.clamp(_e.x, -PITCH_MAX, PITCH_MAX);
    this.cam.fov = THREE.MathUtils.clamp(desde.fov || 60, FOV_MIN, FOV_MAX);
    this.cam.updateProjectionMatrix();
    this.aplicar();
    this.activa = true;
  }
  salir() {
    this.activa = false;
  }
  mirar(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -PITCH_MAX, PITCH_MAX);
  }
  zoom(pasos) {
    this.cam.fov = THREE.MathUtils.clamp(this.cam.fov * Math.pow(1.1, pasos), FOV_MIN, FOV_MAX);
    this.cam.updateProjectionMatrix();
  }
  update(dt, {f: f = 0, s: s = 0, up: up = 0, rapido: rapido = false, lento: lento = false} = {}) {
    const asp = innerWidth / innerHeight;
    if (Math.abs(this.cam.aspect - asp) > 1e-4) {
      this.cam.aspect = asp;
      this.cam.updateProjectionMatrix();
    }
    this.aplicar();
    const v = VEL * (rapido ? RAPIDO : 1) * (lento ? LENTO : 1) * dt;
    this.cam.getWorldDirection(_f);
    _r.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.cam.position.addScaledVector(_f, f * v).addScaledVector(_r, s * v);
    this.cam.position.y += up * v;
    this.cam.updateMatrixWorld();
  }
  aplicar() {
    this.cam.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.cam.updateMatrixWorld();
  }
  copiarA(c) {
    c.position.copy(this.cam.position);
    c.quaternion.copy(this.cam.quaternion);
    if (c.fov !== this.cam.fov) {
      c.fov = this.cam.fov;
      c.updateProjectionMatrix();
    }
    c.updateMatrixWorld();
  }
}

const VS_PANTALLA = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const FS_EQUI = `uniform samplerCube cubo; uniform float rumbo; varying vec2 vUv;\n  void main(){\n    float lon = (vUv.x - 0.5) * 6.28318530718 - rumbo, lat = (vUv.y - 0.5) * 3.14159265359;\n    vec3 d = vec3(sin(lon) * cos(lat), sin(lat), -cos(lon) * cos(lat));\n    gl_FragColor = vec4(textureCube(cubo, d).rgb, 1.0);\n    #include <colorspace_fragment>\n  }`;

export async function sacarFoto(R, {escena: escena, camara: camara, tipo: tipo = "360", ancho: ancho = 0, agua: agua = null, vistaAgua: vistaAgua = null, filtro: filtro = ""}) {
  const max = R.capabilities.maxTextureSize, basura = [];
  const nuevaRT = (w, h, prof) => {
    const r = new THREE.WebGLRenderTarget(w, h, {
      depthBuffer: prof
    });
    r.texture.colorSpace = THREE.SRGBColorSpace;
    basura.push(r);
    return r;
  };
  const prev = {
    rt: R.getRenderTarget(),
    auto: R.autoClear,
    tijera: R.getScissorTest()
  };
  let w, h, rt;
  const px = {
    datos: null
  };
  try {
    R.setScissorTest(false);
    R.autoClear = true;
    camara.updateMatrixWorld();
    if (tipo === "360") {
      w = Math.min(ancho || 4096, max);
      w -= w % 2;
      h = w / 2;
      const cara = Math.min(R.capabilities.maxCubemapSize || max, w / 2);
      const rc = new THREE.WebGLCubeRenderTarget(cara, {
        generateMipmaps: false
      });
      rc.texture.colorSpace = THREE.SRGBColorSpace;
      basura.push(rc);
      const cc = new THREE.CubeCamera(camara.near ?? .03, camara.far ?? 3e3, rc);
      camara.getWorldPosition(cc.position);
      cc.updateMatrixWorld(true);
      cc.update(R, escena);
      const yaw = (new THREE.Euler).setFromQuaternion(camara.getWorldQuaternion(new THREE.Quaternion), "YXZ").y;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          cubo: {
            value: rc.texture
          },
          rumbo: {
            value: yaw
          }
        },
        vertexShader: VS_PANTALLA,
        fragmentShader: FS_EQUI,
        depthTest: false,
        depthWrite: false
      });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      q.frustumCulled = false;
      const e = new THREE.Scene;
      e.add(q);
      rt = nuevaRT(w, h, false);
      R.setRenderTarget(rt);
      R.render(e, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
      mat.dispose();
      q.geometry.dispose();
    } else {
      w = Math.min(ancho || 3840, max);
      h = Math.round(w * 9 / 16);
      const c = camara.clone();
      c.aspect = w / h;
      c.clearViewOffset();
      c.updateProjectionMatrix();
      rt = nuevaRT(w, h, true);
      R.setRenderTarget(rt);
      R.clear();
      R.render(escena, c);
    }
    if (agua && vistaAgua) {
      const rt2 = nuevaRT(w, h, false);
      vistaAgua.aplicar(R, rt.texture, rt2, agua);
      rt = rt2;
    }
    px.datos = new Uint8Array(w * h * 4);
    R.readRenderTargetPixels(rt, 0, 0, w, h, px.datos);
  } finally {
    R.setRenderTarget(prev.rt);
    R.autoClear = prev.auto;
    R.setScissorTest(prev.tijera);
    for (const b of basura) b.dispose();
  }
  const img = new ImageData(w, h), fila = w * 4;
  for (let y = 0; y < h; y++) img.data.set(px.datos.subarray((h - 1 - y) * fila, (h - y) * fila), y * fila);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const x = cv.getContext("2d");
  if (filtro) {
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    tmp.getContext("2d").putImageData(img, 0, 0);
    x.filter = filtro;
    x.drawImage(tmp, 0, 0);
  } else x.putImageData(img, 0, 0);
  const blob = await new Promise((r, no) => cv.toBlob(b => b ? r(b) : no(new Error("el navegador no generó el JPEG")), "image/jpeg", .92));
  if (tipo !== "360") return blob;
  return new Blob([ conXMP360(new Uint8Array(await blob.arrayBuffer()), w, h) ], {
    type: "image/jpeg"
  });
}

function conXMP360(jpeg, w, h) {
  const xmp = '<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' + '<rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/" GPano:ProjectionType="equirectangular" GPano:UsePanoramaViewer="True"' + ` GPano:CroppedAreaImageWidthPixels="${w}" GPano:CroppedAreaImageHeightPixels="${h}" GPano:FullPanoWidthPixels="${w}" GPano:FullPanoHeightPixels="${h}"` + ' GPano:CroppedAreaLeftPixels="0" GPano:CroppedAreaTopPixels="0" GPano:PoseHeadingDegrees="0" GPano:InitialViewHeadingDegrees="0" GPano:InitialViewPitchDegrees="0"/>' + '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
  const enc = new TextEncoder, ns = enc.encode("http://ns.adobe.com/xap/1.0/\0"), cuerpo = enc.encode(xmp);
  const largo = 2 + ns.length + cuerpo.length;
  const seg = new Uint8Array(2 + largo);
  seg[0] = 255;
  seg[1] = 225;
  seg[2] = largo >> 8;
  seg[3] = largo & 255;
  seg.set(ns, 4);
  seg.set(cuerpo, 4 + ns.length);
  let pos = 2;
  if (jpeg[2] === 255 && jpeg[3] === 224) pos = 4 + (jpeg[4] << 8 | jpeg[5]);
  const out = new Uint8Array(jpeg.length + seg.length);
  out.set(jpeg.subarray(0, pos), 0);
  out.set(seg, pos);
  out.set(jpeg.subarray(pos), pos + seg.length);
  return out;
}

export function descargar(blob, nombre) {
  if (window.MGSApp?.guardarArchivo) {
    const r = new FileReader;
    r.onload = () => window.MGSApp.guardarArchivo(nombre, blob.type, String(r.result).split(",")[1]);
    r.readAsDataURL(blob);
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 6e4);
}
