// Los .mgs del jugador (tools/archivo_celular.py): zips SIN comprimir, así se salta directo a cualquier archivo. Es lo mismo
// que leerIndice() de android/celular/.../MainActivity.java y mgsIndice() de android/casco/web/mgs_zip.js.
// Viven en Documentos de la app (se ven en Archivos > En mi iPhone > Shadow Moses): el entero (MGSweb_datos.mgs) o las
// partes (MGS_disco1.mgs, MGS_disco2.mgs, MGS_vr_missions.mgs, MGS_integral.mgs, MGS_idioma_xx.mgs; 2.12). Se abren todos
// juntos; si hay un entero, gana el entero.
// FeniXVOID · Project Ravenlight
import Foundation

/// Un .mgs abierto (sólo lectura, con pread: se puede leer desde varios hilos a la vez).
final class ArchivoMGS {
    let url: URL
    let parte: String
    let tamano: UInt64
    let indice: [String: (local: UInt64, tam: UInt64)]
    private let fd: Int32

    init?(url: URL) {
        let fd = open(url.path, O_RDONLY)
        if fd < 0 { return nil }
        var st = stat()
        guard fstat(fd, &st) == 0, st.st_size > 22,
              let ind = ArchivoMGS.leerIndice(fd: fd, tam: UInt64(st.st_size)),
              let parte = ArchivoMGS.parteDe(fd: fd, indice: ind) else { close(fd); return nil }
        self.url = url; self.fd = fd; self.tamano = UInt64(st.st_size); self.indice = ind; self.parte = parte
    }

    deinit { close(fd) }

    /// Lee n bytes desde pos (menos si se termina el archivo).
    func leer(_ pos: UInt64, _ n: Int) -> Data? { ArchivoMGS.leer(fd: fd, pos, n) }

    /// Dónde empiezan los datos de una entrada: el encabezado local tiene su propio largo de nombre y de extra.
    func inicioDatos(local: UInt64) -> UInt64? {
        guard let h = leer(local, 30), h.count == 30, ArchivoMGS.u32(h, 0) == 0x04034b50 else { return nil }
        return local + 30 + UInt64(ArchivoMGS.u16(h, 26)) + UInt64(ArchivoMGS.u16(h, 28))
    }

    static func leer(fd: Int32, _ pos: UInt64, _ n: Int) -> Data? {
        var d = Data(count: n)
        var hecho = 0
        let ok = d.withUnsafeMutableBytes { (b: UnsafeMutableRawBufferPointer) -> Bool in
            guard let base = b.baseAddress else { return false }
            while hecho < n {
                let r = pread(fd, base + hecho, n - hecho, off_t(pos) + off_t(hecho))
                if r < 0 { return false }
                if r == 0 { break }
                hecho += r
            }
            return true
        }
        if !ok { return nil }
        if hecho < n { d.count = hecho }
        return d
    }

    static func u16(_ d: Data, _ i: Int) -> Int { Int(d[d.startIndex + i]) | Int(d[d.startIndex + i + 1]) << 8 }
    static func u32(_ d: Data, _ i: Int) -> UInt32 {
        UInt32(d[d.startIndex + i]) | UInt32(d[d.startIndex + i + 1]) << 8 | UInt32(d[d.startIndex + i + 2]) << 16 | UInt32(d[d.startIndex + i + 3]) << 24
    }

    /// El directorio central del zip. Sólo entradas sin comprimir.
    static func leerIndice(fd: Int32, tam: UInt64) -> [String: (local: UInt64, tam: UInt64)]? {
        let cola = Int(min(tam, 65557))
        guard let fin = leer(fd: fd, tam - UInt64(cola), cola), fin.count == cola else { return nil }
        var p = -1
        var i = cola - 22
        while i >= 0 { if u32(fin, i) == 0x06054b50 { p = i; break }; i -= 1 }
        if p < 0 { return nil }
        let total = u16(fin, p + 10)
        let tamDir = UInt64(u32(fin, p + 12)), iniDir = UInt64(u32(fin, p + 16))
        guard iniDir + tamDir <= tam, let d = leer(fd: fd, iniDir, Int(tamDir)), d.count == Int(tamDir) else { return nil }
        var ind: [String: (local: UInt64, tam: UInt64)] = [:]
        ind.reserveCapacity(total)
        var q = 0
        for _ in 0..<total {
            if q + 46 > d.count || u32(d, q) != 0x02014b50 { return nil }
            if u16(d, q + 10) != 0 { return nil }
            let tamano = UInt64(u32(d, q + 24)), local = UInt64(u32(d, q + 42))
            let n = u16(d, q + 28), x = u16(d, q + 30), k = u16(d, q + 32)
            if q + 46 + n > d.count { return nil }
            guard let nombre = String(data: d.subdata(in: (d.startIndex + q + 46)..<(d.startIndex + q + 46 + n)), encoding: .utf8) else { return nil }
            ind[nombre] = (local, tamano)
            q += 46 + n + x + k
        }
        return ind
    }

    /// Qué parte es: la de mgs_parte.json, o "entero" si no lo trae pero tiene discos.json (los .mgs viejos). nil si no sirve.
    static func parteDe(fd: Int32, indice: [String: (local: UInt64, tam: UInt64)]) -> String? {
        var parte: String?
        if let e = indice["mgs_parte.json"], e.tam < 65536,
           let h = leer(fd: fd, e.local, 30), h.count == 30, u32(h, 0) == 0x04034b50 {
            let ini = e.local + 30 + UInt64(u16(h, 26)) + UInt64(u16(h, 28))
            if let b = leer(fd: fd, ini, Int(e.tam)),
               let o = try? JSONSerialization.jsonObject(with: b) as? [String: Any] { parte = o["parte"] as? String }
        }
        if parte == nil && indice["discos.json"] != nil { parte = "entero" }
        guard let p = parte, !p.isEmpty, p.allSatisfy({ ("a"..."z").contains($0) || ("0"..."9").contains($0) || $0 == "_" }) else { return nil }
        if (p == "entero" || p == "disco1") && indice["discos.json"] == nil { return nil }
        return p
    }
}

/// Todos los .mgs de la app, juntos.
final class Datos {
    static let carpeta: URL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    private static let orden = ["entero", "disco1", "disco2", "vr_missions", "integral"]

    private let cerrojo = NSLock()
    private var mapa: [String: (ArchivoMGS, UInt64, UInt64)] = [:]
    private var archivos: [ArchivoMGS] = []
    private(set) var cargadasJSON = Data("{\"formato\":1,\"cargadas\":[]}".utf8)

    static func nombre(parte: String) -> String { parte == "entero" ? "MGSweb_datos.mgs" : "MGS_\(parte).mgs" }

    /// Los .mgs que hay en Documentos.
    static func listar() -> [URL] {
        let l = (try? FileManager.default.contentsOfDirectory(at: carpeta, includingPropertiesForKeys: nil)) ?? []
        return l.filter { $0.pathExtension.lowercased() == "mgs" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
    }

    var hayArchivos: Bool { !Datos.listar().isEmpty }

    /// Vuelve a abrir todo. nil si está bien; si no, el código de error de la pantalla de inicio ("formato", "disco1").
    @discardableResult
    func recargar() -> String? {
        var abiertos: [ArchivoMGS] = []
        var vistas = Set<String>()
        for u in Datos.listar() {
            guard let a = ArchivoMGS(url: u), !vistas.contains(a.parte) else { continue }
            vistas.insert(a.parte); abiertos.append(a)
        }
        if vistas.contains("entero") { abiertos = abiertos.filter { $0.parte == "entero" } }
        let pos: (String) -> Int = { Datos.orden.firstIndex(of: $0) ?? Datos.orden.count }
        abiertos.sort { pos($0.parte) != pos($1.parte) ? pos($0.parte) < pos($1.parte) : $0.parte < $1.parte }
        var m: [String: (ArchivoMGS, UInt64, UInt64)] = [:]
        var cargadas: [[String: Any]] = []
        for a in abiertos {
            for (k, e) in a.indice where m[k] == nil { m[k] = (a, e.local, e.tam) }
            cargadas.append(["parte": a.parte, "archivo": a.url.lastPathComponent, "bytes": a.tamano])
        }
        let o: [String: Any] = ["formato": 1, "cargadas": cargadas]
        let json = (try? JSONSerialization.data(withJSONObject: o)) ?? Data()
        cerrojo.lock(); mapa = m; archivos = abiertos; cargadasJSON = json; cerrojo.unlock()
        if m["discos.json"] == nil { return abiertos.isEmpty ? (Datos.listar().isEmpty ? nil : "formato") : "disco1" }
        return nil
    }

    var listo: Bool { cerrojo.lock(); defer { cerrojo.unlock() }; return mapa["discos.json"] != nil }

    func buscar(_ rel: String) -> (ArchivoMGS, UInt64, UInt64)? { cerrojo.lock(); defer { cerrojo.unlock() }; return mapa[rel] }

    func cargadas() -> Data { cerrojo.lock(); defer { cerrojo.unlock() }; return cargadasJSON }

    /// Mira un archivo elegido sin quedárselo: la parte, o nil si no sirve.
    static func probar(_ url: URL) -> String? { ArchivoMGS(url: url)?.parte }

    /// Pasa un archivo elegido (la copia que deja el selector) a Documentos con su nombre. El entero reemplaza a las partes y
    /// una parte reemplaza al entero (no van juntos). Devuelve la parte.
    static func sumar(_ url: URL) throws -> String {
        guard let parte = probar(url) else { throw NSError(domain: "mgs", code: 1, userInfo: [NSLocalizedDescriptionKey: "formato"]) }
        let fm = FileManager.default
        var destino = carpeta.appendingPathComponent(nombre(parte: parte))
        for u in listar() where u.standardizedFileURL != url.standardizedFileURL {
            let p = probar(u)
            if u.lastPathComponent == destino.lastPathComponent || (parte == "entero") != (p == "entero") || p == parte { try? fm.removeItem(at: u) }
        }
        if url.deletingLastPathComponent().standardizedFileURL == carpeta.standardizedFileURL {
            if url.lastPathComponent != destino.lastPathComponent { try fm.moveItem(at: url, to: destino) } else { destino = url }
        } else {
            do { try fm.moveItem(at: url, to: destino) } catch { try fm.copyItem(at: url, to: destino) }
        }
        var v = URLResourceValues(); v.isExcludedFromBackup = true   // 400 MB a 1 GB: no a la copia de iCloud
        try? destino.setResourceValues(v)
        return parte
    }
}
