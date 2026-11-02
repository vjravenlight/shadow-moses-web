// MGS web — FeniXVOID · Project Ravenlight
const FILT = [ [ 0, 0 ], [ 60, 0 ], [ 115, -52 ], [ 98, -55 ], [ 122, -60 ] ];

function tramo(u8, ini, fin, sal, pos, est) {
  let s1 = est[0], s2 = est[1];
  for (let a = ini; a + 16 <= fin; a += 16) {
    const h = u8[a], sh = h & 15, [k1, k2] = FILT[Math.min(4, h >> 4)];
    for (let i = 0; i < 28; i++) {
      const b = u8[a + 2 + (i >> 1)];
      let n = i & 1 ? b >> 4 : b & 15;
      if (n & 8) n -= 16;
      let s = (n << 12 >> sh) + (s1 * k1 + s2 * k2 + 32 >> 6);
      s = s < -32768 ? -32768 : s > 32767 ? 32767 : s;
      sal[pos++] = s;
      s2 = s1;
      s1 = s;
    }
  }
  est[0] = s1;
  est[1] = s2;
  return pos;
}

export function decodificarADPCM(datos, canales = 1, bloque = 4096) {
  const u8 = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  if (canales !== 2) {
    const sal = new Int16Array(Math.floor(u8.length / 16) * 28);
    tramo(u8, 0, u8.length, sal, 0, [ 0, 0 ]);
    return [ sal ];
  }
  const paso = bloque * 2;
  let bd = 0, bi = 0;
  for (let p = 0; p < u8.length; p += paso) {
    const t = Math.min(paso, u8.length - p);
    bd += Math.floor(Math.min(t, bloque) / 16);
    bi += Math.floor(Math.max(0, t - bloque) / 16);
  }
  const der = new Int16Array(bd * 28), izq = new Int16Array(bi * 28), ed = [ 0, 0 ], ei = [ 0, 0 ];
  let pd = 0, pi = 0;
  for (let p = 0; p < u8.length; p += paso) {
    const fin = Math.min(p + paso, u8.length);
    pd = tramo(u8, p, Math.min(p + bloque, fin), der, pd, ed);
    pi = tramo(u8, p + bloque, fin, izq, pi, ei);
  }
  const n = Math.min(izq.length, der.length);
  return [ izq.subarray(0, n), der.subarray(0, n) ];
}

export function bufferADPCM(ctx, datos, info) {
  const ch = decodificarADPCM(datos, info.canales, info.bloque || 4096);
  const buf = ctx.createBuffer(ch.length, Math.max(1, ch[0].length), info.hz);
  ch.forEach((c, k) => {
    const f = buf.getChannelData(k);
    for (let i = 0; i < c.length; i++) f[i] = c[i] / 32768;
  });
  return buf;
}

export function wavADPCM(datos, info) {
  const ch = decodificarADPCM(datos, info.canales, info.bloque || 4096), nc = ch.length, n = ch[0].length;
  const ab = new ArrayBuffer(44 + n * nc * 2), v = new DataView(ab), txt = (o, s) => {
    for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  txt(0, "RIFF");
  v.setUint32(4, 36 + n * nc * 2, true);
  txt(8, "WAVE");
  txt(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, nc, true);
  v.setUint32(24, info.hz, true);
  v.setUint32(28, info.hz * nc * 2, true);
  v.setUint16(32, nc * 2, true);
  v.setUint16(34, 16, true);
  txt(36, "data");
  v.setUint32(40, n * nc * 2, true);
  const pcm = new Int16Array(ab, 44);
  if (nc === 1) pcm.set(ch[0]); else for (let i = 0, o = 0; i < n; i++) {
    pcm[o++] = ch[0][i];
    pcm[o++] = ch[1][i];
  }
  return new Blob([ ab ], {
    type: "audio/wav"
  });
}

export async function urlAudio(dir, info) {
  if (info?.formato !== "adpcm") return {
    url: dir + (info?.archivo || ""),
    esBlob: false
  };
  const r = await fetch(dir + info.archivo);
  if (!r.ok) throw new Error(`audio ${info.archivo}: ${r.status}`);
  return {
    url: URL.createObjectURL(wavADPCM(await r.arrayBuffer(), info)),
    esBlob: true
  };
}

let formatoVox = null;

const extVox = f => f === "adpcm" ? ".adpcm" : ".m4a";

const bajar = u => fetch(u).then(r => r.ok ? r.arrayBuffer() : null, () => null);

export async function cargarVoz(base, id, ctx) {
  const url = base + id, adivina = formatoVox;
  const pAudio = adivina ? bajar(url + extVox(adivina)) : null;
  const dj = await fetch(url + ".json").then(r => r.ok ? r.json() : null, () => null);
  if (!dj) return null;
  const formato = dj.formato === "adpcm" ? "adpcm" : "m4a";
  formatoVox = formato;
  const ab = await (formato === adivina && (!dj.archivo || dj.archivo === id + extVox(formato)) ? pAudio : bajar(base + (dj.archivo || id + ".m4a")));
  if (!ab) return null;
  if (formato === "adpcm") return {
    datos: dj,
    buffer: bufferADPCM(ctx, ab, dj),
    offset: 0
  };
  const buf = await new Promise((ok, mal) => {
    const r = ctx.decodeAudioData(ab, ok, mal);
    if (r && r.then) r.then(ok, mal);
  });
  const esperado = dj.muestras * buf.sampleRate / dj.hz_m4a, sobra = buf.length - esperado, priming = 1024 * buf.sampleRate / dj.hz_m4a;
  return {
    datos: dj,
    buffer: buf,
    offset: sobra >= priming * .9 ? 1024 / dj.hz_m4a : 0
  };
}

export async function urlVoz(base, id, dj = null) {
  dj = dj || await fetch(base + id + ".json").then(r => r.ok ? r.json() : null, () => null);
  if (dj?.formato !== "adpcm") return {
    url: base + id + ".m4a",
    esBlob: false
  };
  return urlAudio(base, dj);
}
