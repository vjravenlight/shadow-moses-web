// MGS web — FeniXVOID · Project Ravenlight
import fs from "fs";

import path from "path";

import vm from "vm";

import { fileURLToPath } from "url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ASSETS = process.env.MGS_ASSETS || path.join(raiz, "visor", "assets");

const VR = path.join(ASSETS, "vr", "disco");

const SALA = path.join(VR, "vcd_n01_7_111.json");

const EFECTOS = [ 197, 198, 199, 205, 208, 209, 210, 211, 212, 168, 169 ];

if (!fs.existsSync(SALA)) {
  console.log("ninja_sonidos_vr: sin la sala NINJA 01 del disco de VR; nada que hacer");
  process.exit(0);
}

const S = JSON.parse(fs.readFileSync(SALA, "utf8")).vr?.disco?.sonido;

if (!S?.efx) {
  console.log("ninja_sonidos_vr: la sala no trae su sonido");
  process.exit(0);
}

let Clase;

const ctx = {
  AudioWorkletProcessor: class {
    constructor() {
      this.port = {
        onmessage: null
      };
    }
  },
  registerProcessor: (n, c) => {
    Clase = c;
  },
  console: console,
  Math: Math,
  Uint8Array: Uint8Array,
  Int16Array: Int16Array,
  Array: Array,
  Object: Object
};

vm.runInNewContext(fs.readFileSync(path.join(raiz, "visor", "spu-worklet.js"), "utf8"), ctx);

const A = f => {
  const b = fs.readFileSync(f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
};

const SND = path.join(ASSETS, "sonido"), sal = path.join(VR, "sonido", "ninja");

fs.mkdirSync(sal, {
  recursive: true
});

for (const id of EFECTOS) {
  const spu = new Clase, m = x => spu.port.onmessage({
    data: x
  });
  m({
    tipo: "banco",
    buf: A(path.join(SND, "bancos", "ae34.wvx"))
  });
  m({
    tipo: "residente",
    datos: JSON.parse(fs.readFileSync(path.join(SND, "residente.json"), "utf8"))
  });
  m({
    tipo: "callar"
  });
  for (const b of S.bancos) m({
    tipo: "banco",
    buf: A(path.join(VR, "sonido", b + ".wvx"))
  });
  m({
    tipo: "efx",
    buf: A(path.join(VR, "sonido", S.efx + ".efx"))
  });
  const N = 44100 * 3, L = new Float32Array(N);
  m({
    tipo: "se",
    codigo: id | 63 << 8
  });
  for (let i = 0; i < N; i += 128) {
    const l = new Float32Array(128), r = new Float32Array(128);
    spu.process([], [ [ l, r ] ]);
    for (let k = 0; k < 128 && i + k < N; k++) L[i + k] = (l[k] + r[k]) / 2;
  }
  let ini = 0, fin = N - 1;
  while (ini < N && Math.abs(L[ini]) < .002) ini++;
  while (fin > ini && Math.abs(L[fin]) < .002) fin--;
  if (fin <= ini) {
    console.log("  0x" + id.toString(16), "sin sonido");
    continue;
  }
  const n = Math.min(N - ini, fin - ini + 2205), out = Buffer.alloc(44 + n * 2);
  out.write("RIFF", 0);
  out.writeUInt32LE(36 + n * 2, 4);
  out.write("WAVEfmt ", 8);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(44100, 24);
  out.writeUInt32LE(88200, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[ini + i] * 32767))), 44 + i * 2);
  fs.writeFileSync(path.join(sal, id.toString(16) + ".wav"), out);
  console.log("  0x" + id.toString(16), (n / 44100).toFixed(2) + " s");
}
