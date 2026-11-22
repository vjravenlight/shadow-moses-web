// Le sirve a la WebView el visor (adentro de la app, en web/visor) y los datos del juego (de los .mgs) en una dirección
// propia: shadowmoses://juego/. Como shouldInterceptRequest de la app de Android: assets/ sale de los .mgs (con rangos,
// para voces y videos), _app/ es la pantalla de inicio, y nada sale a internet.
// FeniXVOID · Project Ravenlight
import Foundation
import WebKit

final class Servidor: NSObject, WKURLSchemeHandler {
    static let esquema = "shadowmoses"
    static let host = "juego"
    private let datos: Datos
    private let web: URL
    // los pedidos que la WebView no canceló (sólo desde el hilo principal): después de stop no se puede tocar la tarea
    private var vivas = Set<ObjectIdentifier>()
    private static let tipos: [String: String] = [
        "html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json",
        "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg", "ico": "image/x-icon", "mp4": "video/mp4", "m4a": "audio/mp4",
        "woff": "font/woff", "woff2": "font/woff2", "glb": "model/gltf-binary", "webmanifest": "application/manifest+json",
        "wasm": "application/wasm",
    ]

    init(datos: Datos) {
        self.datos = datos
        self.web = Bundle.main.url(forResource: "web", withExtension: nil) ?? Bundle.main.bundleURL.appendingPathComponent("web")
    }

    static func tipo(_ ruta: String) -> String {
        let ext = (ruta as NSString).pathExtension.lowercased()
        return tipos[ext] ?? "application/octet-stream"
    }

    func webView(_ webView: WKWebView, start tarea: WKURLSchemeTask) {
        let id = ObjectIdentifier(tarea)
        vivas.insert(id)
        let pedido = tarea.request
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.atender(tarea, id, pedido) }
    }

    func webView(_ webView: WKWebView, stop tarea: WKURLSchemeTask) { vivas.remove(ObjectIdentifier(tarea)) }

    /// Corre f en el hilo principal si el pedido sigue vivo. false = la WebView lo canceló.
    private func enPrincipal(_ id: ObjectIdentifier, fin: Bool = false, _ f: () -> Void) -> Bool {
        DispatchQueue.main.sync { () -> Bool in
            guard vivas.contains(id) else { return false }
            f()
            if fin { vivas.remove(id) }
            return true
        }
    }

    private func responder(_ t: WKURLSchemeTask, _ id: ObjectIdentifier, _ url: URL, _ codigo: Int, _ enc: [String: String], _ cuerpo: Data) {
        var e = enc
        e["Content-Length"] = String(cuerpo.count)
        let r = HTTPURLResponse(url: url, statusCode: codigo, httpVersion: "HTTP/1.1", headerFields: e)!
        _ = enPrincipal(id, fin: true) { t.didReceive(r); if !cuerpo.isEmpty { t.didReceive(cuerpo) }; t.didFinish() }
    }

    private func atender(_ t: WKURLSchemeTask, _ id: ObjectIdentifier, _ pedido: URLRequest) {
        guard let url = pedido.url, url.host == Servidor.host else {
            let u = pedido.url ?? URL(string: "\(Servidor.esquema)://\(Servidor.host)/")!
            responder(t, id, u, 403, ["Content-Type": "text/plain"], Data()); return
        }
        var ruta = url.path
        if ruta.isEmpty || ruta.hasSuffix("/") { ruta += "index.html" }
        if ruta.contains("..") { responder(t, id, url, 403, ["Content-Type": "text/plain"], Data()); return }
        if ruta.hasPrefix("/assets/") { delArchivo(t, id, url, String(ruta.dropFirst(8)), pedido); return }
        let enApp = ruta.hasPrefix("/_app/") ? "app/" + ruta.dropFirst(6) : "visor" + ruta
        let archivo = web.appendingPathComponent(String(enApp))
        guard let d = try? Data(contentsOf: archivo, options: .mappedIfSafe) else {
            responder(t, id, url, 404, ["Content-Type": "text/plain"], Data()); return
        }
        responder(t, id, url, 200, ["Content-Type": Servidor.tipo(ruta), "Cache-Control": "no-cache"], d)
    }

    private func delArchivo(_ t: WKURLSchemeTask, _ id: ObjectIdentifier, _ url: URL, _ nombre: String, _ pedido: URLRequest) {
        if nombre == "_partes_cargadas.json" {   // qué partes hay en el aparato (visor/partes.js)
            responder(t, id, url, 200, ["Content-Type": "application/json", "Cache-Control": "no-store"], datos.cargadas()); return
        }
        guard let x = datos.buscar(nombre), let ini = x.0.inicioDatos(local: x.1) else {
            responder(t, id, url, 404, ["Content-Type": "text/plain"], Data()); return
        }
        let archivo = x.0, tam = x.2
        var desde: UInt64 = 0, hasta: UInt64 = tam == 0 ? 0 : tam - 1, parcial = false
        if let r = pedido.value(forHTTPHeaderField: "Range"), r.hasPrefix("bytes="), !r.contains(",") {
            let a = r.dropFirst(6).split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false).map { String($0).trimmingCharacters(in: .whitespaces) }
            if a.count == 2 {
                if a[0].isEmpty, let n = UInt64(a[1]) { desde = tam > n ? tam - n : 0; parcial = true }
                else if let x = UInt64(a[0]) { desde = x; if let y = UInt64(a[1]) { hasta = min(hasta, y) }; parcial = true }
            }
            if parcial && (desde > hasta || desde >= tam) {
                responder(t, id, url, 416, ["Content-Range": "bytes */\(tam)"], Data()); return
            }
        }
        let largo = tam == 0 ? 0 : hasta - desde + 1
        var enc = ["Content-Type": Servidor.tipo(nombre), "Accept-Ranges": "bytes", "Cache-Control": "no-store", "Content-Length": String(largo)]
        if parcial { enc["Content-Range"] = "bytes \(desde)-\(hasta)/\(tam)" }
        let r = HTTPURLResponse(url: url, statusCode: parcial ? 206 : 200, httpVersion: "HTTP/1.1", headerFields: enc)!
        guard enPrincipal(id, { t.didReceive(r) }) else { return }
        // de a pedazos: una voz pesa poco, un video varios MB
        let trozo = 512 * 1024
        var pos = ini + desde, resta = largo
        while resta > 0 {
            let n = Int(min(UInt64(trozo), resta))
            guard let d = archivo.leer(pos, n), !d.isEmpty else {
                _ = enPrincipal(id, fin: true) { t.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorCannotDecodeContentData)) }
                return
            }
            guard enPrincipal(id, { t.didReceive(d) }) else { return }
            pos += UInt64(d.count); resta -= UInt64(d.count)
        }
        _ = enPrincipal(id, fin: true) { t.didFinish() }
    }
}
