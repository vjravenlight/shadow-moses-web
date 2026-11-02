// MGS web — FeniXVOID · Project Ravenlight
import http from "http";

import fs from "fs";

import path from "path";

const iA = process.argv.indexOf("--assets");

const ASSETS = iA > 0 ? path.resolve(process.argv[iA + 1]) : null;

const args = process.argv.slice(2).filter((x, i, l) => x !== "--assets" && l[i - 1] !== "--assets");

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

const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
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
});

srv.keepAliveTimeout = 5e3;

srv.listen(PUERTO, "127.0.0.1", () => console.log(`Visor en http://127.0.0.1:${PUERTO}/  (carpeta ${RAIZ}${ASSETS ? ", assets: " + ASSETS : ""})  — cerrá esta ventana para apagarlo`));
