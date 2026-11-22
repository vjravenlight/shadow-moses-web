// Shadow Moses para iPhone (.ipa sin firmar; la firma la hace cada jugador: ios/FIRMAR_E_INSTALAR.md).
// Lo mismo que la app de Android (android/celular): el visor va adentro de la app y los datos salen de los .mgs del jugador.
// FeniXVOID · Project Ravenlight
import AVFoundation
import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // que se oiga aunque el iPhone esté en silencio (como un juego), sin cortar la música de otra app
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        application.isIdleTimerDisabled = true
        let w = UIWindow(frame: UIScreen.main.bounds)
        w.backgroundColor = .black
        w.rootViewController = JuegoViewController()
        w.makeKeyAndVisible()
        window = w
        return true
    }
}
