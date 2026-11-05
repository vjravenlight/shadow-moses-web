// MGS web — FeniXVOID · Project Ravenlight
import http from "http";

import https from "https";

import crypto from "crypto";

import fs from "fs";

import os from "os";

import path from "path";

const iA = process.argv.indexOf("--assets");

const ASSETS = iA > 0 ? path.resolve(process.argv[iA + 1]) : null;

const RED = process.argv.includes("--red");

const iC = process.argv.indexOf("--cert");

const CERT = iC > 0 ? path.resolve(process.argv[iC + 1]) : os.tmpdir();

const SALIR_SOLA = process.argv.includes("--salir-sola");

const SIN_VENTANA = 3e4, SIN_NOTICIAS = 2e5, AL_EMPEZAR = 3e5;

let ultimaNoticia = 0, ultimoChau = 0;

const t0Servidor = Date.now();

if (SALIR_SOLA) setInterval(() => {
  const ahora = Date.now();
  if (!ultimaNoticia) {
    if (ahora - t0Servidor > AL_EMPEZAR) process.exit(0);
    return;
  }
  if (ahora - ultimaNoticia > (ultimoChau > ultimaNoticia ? SIN_VENTANA : SIN_NOTICIAS)) process.exit(0);
}, 2e3).unref();

const args = process.argv.slice(2).filter((x, i, l) => ![ "--assets", "--red", "--cert", "--salir-sola" ].includes(x) && ![ "--assets", "--cert" ].includes(l[i - 1]));

function certificado() {
  const fClave = path.join(CERT, "red_clave.pem"), fCert = path.join(CERT, "red_certificado.pem");
  if (fs.existsSync(fClave) && fs.existsSync(fCert)) return {
    key: fs.readFileSync(fClave),
    cert: fs.readFileSync(fCert)
  };
  const tl = (tag, ...c) => {
    const b = Buffer.concat(c), n = b.length;
    const largo = n < 128 ? [ n ] : n < 256 ? [ 129, n ] : n < 65536 ? [ 130, n >> 8, n & 255 ] : [ 131, n >> 16, n >> 8 & 255, n & 255 ];
    return Buffer.concat([ Buffer.from([ tag, ...largo ]), b ]);
  };
  const seq = (...c) => tl(48, ...c);
  const oid = (...n) => tl(6, Buffer.from(n));
  const fecha = d => tl(24, Buffer.from(d.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "Z"));
  const firma = seq(oid(42, 134, 72, 134, 247, 13, 1, 1, 11), Buffer.from([ 5, 0 ]));
  const nombre = seq(tl(49, seq(oid(85, 4, 3), tl(12, Buffer.from("Shadow Moses web (esta red)")))));
  const {publicKey: publicKey, privateKey: privateKey} = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048
  });
  const serie = crypto.randomBytes(16);
  serie[0] &= 127;
  serie[0] |= 64;
  const hoy = new Date, hasta = new Date(hoy.getTime() + 10 * 365 * 864e5);
  const tbs = seq(tl(160, Buffer.from([ 2, 1, 2 ])), tl(2, serie), firma, nombre, seq(fecha(hoy), fecha(hasta)), nombre, publicKey.export({
    type: "spki",
    format: "der"
  }));
  const der = seq(tbs, firma, tl(3, Buffer.from([ 0 ]), crypto.sign("sha256", tbs, privateKey)));
  const key = privateKey.export({
    type: "pkcs8",
    format: "pem"
  });
  const cert = `-----BEGIN CERTIFICATE-----\n${der.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----\n`;
  fs.mkdirSync(CERT, {
    recursive: true
  });
  fs.writeFileSync(fClave, key, {
    mode: 384
  });
  fs.writeFileSync(fCert, cert);
  return {
    key: key,
    cert: cert
  };
}

const PUERTO = +(args[0] || 8800);

const RAIZ = path.resolve(args[1] || path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..", "visor"));

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon"
};

const atender = (req, res) => {
  let p;
  try {
    p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (p === "/__vivo") {
    if (req.headers["x-mgs-sonda"] === undefined) ultimaNoticia = Date.now();
    res.writeHead(204, {
      "Cache-Control": "no-store"
    });
    return res.end();
  }
  if (p === "/__chau") {
    ultimoChau = Date.now();
    res.writeHead(204);
    return res.end();
  }
  if (p.endsWith("/")) p += "index.html";
  const base = ASSETS && p.startsWith("/assets/") ? ASSETS : RAIZ;
  const f = path.join(base, path.normalize(base === RAIZ ? p : p.slice("/assets".length)));
  if (!f.startsWith(base)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404);
      return res.end("no encontrado");
    }
    res.writeHead(200, {
      "Content-Type": TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream",
      "Content-Length": st.size,
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(f).pipe(res);
  });
};

const srv = RED ? https.createServer(certificado(), atender) : http.createServer(atender);

srv.keepAliveTimeout = 5e3;

srv.on("error", e => {
  if (e.code !== "EADDRINUSE") throw e;
  console.log(`\n  El puerto ${PUERTO} ya está en uso: cerrá la otra ventana del juego y volvé a abrir esta.\n  Port ${PUERTO} is already in use: close the other game window and open this one again.`);
  process.exit(1);
});

srv.listen(PUERTO, RED ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(`Visor en ${RED ? "https" : "http"}://127.0.0.1:${PUERTO}/  (carpeta ${RAIZ}${ASSETS ? ", assets: " + ASSETS : ""})  — cerrá esta ventana para apagarlo`);
  if (!RED) return;
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log("\n  Desde el celular u otra PC, en la misma red / From a phone or another PC, on the same network:");
  for (const ip of ips) console.log(`    https://${ip}:${PUERTO}/`);
  if (!ips.length) console.log("    (no encontré ninguna red / no network found)");
  console.log("");
});
