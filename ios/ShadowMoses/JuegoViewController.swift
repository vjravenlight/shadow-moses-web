// La pantalla de la app: una WebView con el visor. Hace lo mismo que MainActivity.java de la app de Android:
//  - window.MGSApp (el visor lo usa para saber que corre adentro de una app): elegirArchivo() en la pantalla de inicio,
//    elegirParte(parte) cuando el juego pide una parte que falta (contesta con mgsPartes.alElegir), guardarArchivo() para
//    exportar partidas y fotos, version().
//  - los .mgs elegidos se pasan a Documentos de la app (también se pueden dejar ahí desde Archivos > En mi iPhone >
//    Shadow Moses) y se leen desde ahí; el juego no sale a internet.
// FeniXVOID · Project Ravenlight
import UIKit
import UniformTypeIdentifiers
import WebKit

/// Para no retener la pantalla desde el WKUserContentController (si no, no se libera nunca).
private final class PuenteDebil: NSObject, WKScriptMessageHandler {
    weak var destino: WKScriptMessageHandler?
    init(_ d: WKScriptMessageHandler) { destino = d }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) { destino?.userContentController(c, didReceive: m) }
}

final class JuegoViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
    private enum Pedido { case inicio, parte(String), exportar }

    private let datos = Datos()
    private var web: WKWebView!
    private var pedido: Pedido?
    private static let base = "\(Servidor.esquema)://\(Servidor.host)/"
    private static let juego = URL(string: base + "index.html?tactil")!   // siempre con los controles táctiles
    private static var version: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0" }

    override func loadView() {
        let conf = WKWebViewConfiguration()
        conf.setURLSchemeHandler(Servidor(datos: datos), forURLScheme: Servidor.esquema)
        conf.allowsInlineMediaPlayback = true
        conf.mediaTypesRequiringUserActionForPlayback = []
        conf.websiteDataStore = .default()   // partidas y opciones en localStorage, como en la web
        let puente = """
        (function () {
          if (window.MGSApp) return;
          var m = function (o) { window.webkit.messageHandlers.mgs.postMessage(o); };
          window.MGSApp = {
            ios: true,
            elegirArchivo: function () { m({ accion: 'elegirArchivo' }); },
            elegirParte: function (parte) { m({ accion: 'elegirParte', parte: String(parte) }); },
            guardarArchivo: function (nombre, tipo, base64) { m({ accion: 'guardarArchivo', nombre: String(nombre), tipo: String(tipo || ''), datos: String(base64) }); },
            version: function () { return '\(JuegoViewController.version)'; }
          };
        })();
        """
        conf.userContentController.addUserScript(WKUserScript(source: puente, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        conf.userContentController.add(PuenteDebil(self), name: "mgs")
        let w = WKWebView(frame: .zero, configuration: conf)
        w.isOpaque = false
        w.backgroundColor = .black
        w.scrollView.backgroundColor = .black
        w.scrollView.isScrollEnabled = false
        w.scrollView.bounces = false
        w.scrollView.contentInsetAdjustmentBehavior = .never
        w.allowsBackForwardNavigationGestures = false
        w.navigationDelegate = self
        w.uiDelegate = self
        if #available(iOS 16.4, *) { w.isInspectable = true }   // para ver la consola desde Safari de una Mac (Desarrollo)
        web = w
        view = w
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        arrancar()
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    /// Abre los .mgs y va al juego, o a la pantalla de inicio si falta algo.
    private func arrancar(error forzado: String? = nil) {
        let recarga = datos.recargar()
        let error = forzado ?? recarga
        if error == nil && datos.listo { web.load(URLRequest(url: JuegoViewController.juego)); return }
        var u = JuegoViewController.base + "_app/inicio.html"
        if let e = error ?? (datos.hayArchivos ? "disco1" : nil) { u += "?error=" + e }
        web.load(URLRequest(url: URL(string: u)!))
    }

    // MARK: - window.MGSApp

    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let d = m.body as? [String: Any], let accion = d["accion"] as? String else { return }
        switch accion {
        case "elegirArchivo": elegir(.inicio, varios: true)
        case "elegirParte": elegir(.parte(d["parte"] as? String ?? ""), varios: false)
        case "guardarArchivo": exportar(nombre: d["nombre"] as? String ?? "archivo", base64: d["datos"] as? String ?? "")
        default: break
        }
    }

    private func elegir(_ p: Pedido, varios: Bool) {
        if presentedViewController != nil { if case .parte = p { avisarParte(ok: false, parte: nil, error: "cancelado") }; return }
        // asCopy: el sistema copia el archivo adentro de la app (después se pasa a Documentos sin copiarlo de nuevo)
        let selector = UIDocumentPickerViewController(forOpeningContentTypes: [.item], asCopy: true)
        selector.allowsMultipleSelection = varios
        selector.delegate = self
        pedido = p
        present(selector, animated: true)
    }

    private func exportar(nombre: String, base64: String) {
        guard let d = Data(base64Encoded: base64, options: .ignoreUnknownCharacters), presentedViewController == nil else { return }
        let limpio = nombre.replacingOccurrences(of: "/", with: "_")
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(limpio.isEmpty ? "archivo" : limpio)
        do { try d.write(to: tmp, options: .atomic) } catch { return }
        let selector = UIDocumentPickerViewController(forExporting: [tmp], asCopy: true)
        selector.delegate = self
        pedido = .exportar
        present(selector, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let p = pedido else { return }
        pedido = nil
        if case .exportar = p { return }
        // mover cientos de MB puede tardar: fuera del hilo principal
        DispatchQueue.global(qos: .userInitiated).async {
            var partes: [String] = [], fallo: String?
            for u in urls {
                let acceso = u.startAccessingSecurityScopedResource()
                defer { if acceso { u.stopAccessingSecurityScopedResource() } }
                do { partes.append(try Datos.sumar(u)) } catch { fallo = (error as NSError).domain == "mgs" ? "formato" : "abrir" }
            }
            DispatchQueue.main.async {
                switch p {
                case .inicio:
                    self.arrancar(error: fallo)
                case .parte(let quiero):
                    let recarga = self.datos.recargar()
                    if let e = fallo { self.avisarParte(ok: false, parte: nil, error: e) }
                    else if let f = recarga { self.avisarParte(ok: false, parte: partes.first, error: f) }
                    else { self.avisarParte(ok: true, parte: partes.first, error: partes.first == quiero ? nil : "otra") }
                case .exportar: break
                }
            }
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        if case .parte? = pedido { avisarParte(ok: false, parte: nil, error: "cancelado") }
        pedido = nil
    }

    private func avisarParte(ok: Bool, parte: String?, error: String?) {
        var o: [String: Any] = ["ok": ok]
        if let p = parte { o["parte"] = p }
        if let e = error { o["error"] = e }
        guard let j = try? JSONSerialization.data(withJSONObject: o), let s = String(data: j, encoding: .utf8) else { return }
        web.evaluateJavaScript("window.mgsPartes&&window.mgsPartes.alElegir(\(s))", completionHandler: nil)
    }

    // MARK: - WebView

    /// La app no navega afuera: sólo su propia dirección.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let u = action.request.url
        decisionHandler(u?.scheme == Servidor.esquema || u?.scheme == "about" || u?.scheme == "blob" || u?.scheme == "data" ? .allow : .cancel)
    }

    /// Se quedó sin memoria el motor de la página: en vez de quedar en blanco, vuelve a abrirla (las partidas están guardadas).
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { arrancar() }

    // los confirm()/alert() del visor (borrar partida, etc.)
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        if presentedViewController == nil { present(a, animated: true) } else { completionHandler() }
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancelar / Cancel", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        if presentedViewController == nil { present(a, animated: true) } else { completionHandler(false) }
    }
}
