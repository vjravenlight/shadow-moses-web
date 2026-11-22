# Shadow Moses en el iPhone: firmar e instalar la app (.ipa)

*English below.*

> **Todavía sin probar en un iPhone real.** Si la probás, contanos en un issue de GitHub qué iPhone y qué iOS usaste.

La app `ShadowMoses_iphone_sin_firmar.ipa` sale **sin firmar**: Apple no deja instalar nada sin firma, así que cada uno la firma con
su propia cuenta de Apple (Apple ID). No trae ningún archivo del juego: usa los tuyos (los `.mgs` que arma tu PC).

¿No querés firmar nada? Usá la versión web: abrí la página del juego en Safari, tocá **Compartir > Agregar a inicio** y
cargá tus `.mgs` desde ese ícono. No vence nunca y no necesita cuenta de Apple (sin VR, con los controles táctiles).

## Antes de empezar

1. En la PC, instalá el juego con tus discos (`INSTALAR.cmd`) y corré `ARMAR_ARCHIVO_CELULAR.cmd`.
   Elegí **P (en partes)**: `MGS_disco1.mgs` (unos 400 MB) alcanza para empezar; el disco 2 (unos 70 MB) lo pide el juego
   al llegar al cambio de disco. VR Missions, Integral e idiomas van aparte y son opcionales.
2. Bajá `ShadowMoses_iphone_sin_firmar.ipa` de la página de Releases del proyecto en GitHub.
3. Fijate que el iPhone tenga lugar: lo que pesen tus `.mgs` y un poco más.

## Lo que tenés que saber de las cuentas de Apple

| | Cuenta gratis (cualquier Apple ID) | Cuenta de desarrollador (99 USD por año) |
|---|---|---|
| Cuánto dura la firma | **7 días**: después la app no abre hasta que la renueves (tus datos y partidas no se pierden) | 1 año |
| Cuántas apps firmadas a la vez | **3** (AltStore y SideStore ocupan una de esas 3) | sin ese límite |
| Otros límites | hasta 10 apps nuevas por semana | — |

Nadie del proyecto te va a pedir tu contraseña. Las tres herramientas de abajo son de terceros: la contraseña se la das
a ellas, que hablan con Apple. Si preferís, usá un Apple ID aparte sólo para esto.

En iOS 16 o más nuevo, la primera vez hay que prender el **Modo desarrollador**: Ajustes > Privacidad y seguridad >
Modo desarrollador > activar, y reiniciar. Y si al abrir la app dice "desarrollador no confiable": Ajustes > General >
VPN y gestión de dispositivos > tu Apple ID > Confiar.

## Opción A: AltStore (con PC Windows o Mac)

1. En la PC, instalá **AltServer** desde https://altstore.io (en Windows también pide iTunes e iCloud bajados de la web
   de Apple, no los de la Microsoft Store).
2. Conectá el iPhone por cable, abrí AltServer (queda al lado del reloj) y elegí **Install AltStore** > tu iPhone.
   Poné tu Apple ID.
3. Pasá `ShadowMoses_iphone_sin_firmar.ipa` al iPhone (AirDrop, iCloud Drive o el cable) y dejalo en la app Archivos.
4. Abrí **AltStore** en el iPhone > pestaña My Apps > **+** > elegí el `.ipa`. Esperá a que termine.
5. Renovar: con cuenta gratis, cada 7 días. AltStore lo hace solo si la PC con AltServer está prendida y en la misma
   red Wi-Fi; si no, abrí AltStore y tocá **Refresh All** con la PC cerca.

## Opción B: SideStore (renueva sin PC)

1. Seguí la guía de https://sidestore.io: la instalación inicial necesita una PC **una sola vez** (para crear el archivo
   de emparejamiento del iPhone).
2. Pasá el `.ipa` al iPhone, abrí SideStore > My Apps > **+** > elegí el `.ipa`.
3. Renovar: cada 7 días desde el mismo iPhone (SideStore usa una VPN local para hablar con el propio iPhone; seguí lo
   que dice su guía, porque cambia entre versiones).

## Opción C: Sideloadly (con PC Windows o Mac, por cable)

1. Instalá **Sideloadly** desde https://sideloadly.io (en Windows también pide iTunes e iCloud de la web de Apple).
2. Conectá el iPhone por cable y arrastrá `ShadowMoses_iphone_sin_firmar.ipa` a la ventana de Sideloadly.
3. Poné tu Apple ID y tocá **Start**. Cuando termine, la app aparece en el iPhone.
4. Renovar: cada 7 días, repetí lo mismo con el mismo Apple ID (o activá su renovación automática por Wi-Fi). Reinstalar
   con el mismo Apple ID no borra tus datos.

## Con la cuenta de desarrollador (99 USD por año)

Con cualquiera de las tres herramientas, entrá con el Apple ID que tiene la cuenta paga: la firma dura un año y no hay
límite de 3 apps. (Quien sepa usar Xcode también puede firmarla desde ahí.)

## Cargar tus datos

- **La forma que menos lugar ocupa:** abrí la app una vez, después en la app **Archivos** andá a **En mi iPhone >
  Shadow Moses** y **mové** (no copies) ahí tus `.mgs`. Volvé a abrir la app.
- **O** tocá **ELEGIR ARCHIVOS** en la app y elegí los `.mgs` desde donde estén: se copian adentro de la app. Después
  borrá los originales para no ocupar el doble.
- Si cargaste sólo el disco 1, al llegar al cambio de disco el juego dice **PLEASE INSERT DISC 2**: elegí `MGS_disco2.mgs`.
  Lo mismo con un idioma o con VR Missions cuando los uses.
- La app no se conecta a internet. Son tus datos, salen de tus discos: no los subas ni los compartas.

---

# Shadow Moses on iPhone: sign and install the app (.ipa)

> **Not yet tested on a real iPhone.** If you try it, please tell us in a GitHub issue which iPhone and iOS you used.

`ShadowMoses_iphone_sin_firmar.ipa` is **unsigned**: Apple does not allow installing anything unsigned, so each player signs it with
their own Apple ID. It has no game files: it uses yours (the `.mgs` files your PC builds).

Don't want to sign anything? Use the web version: open the game page in Safari, tap **Share > Add to Home Screen** and load
your `.mgs` files from that icon. It never expires and needs no Apple account (no VR, touch controls).

**Before you start:** install the game on the PC (`INSTALAR.cmd`), run `ARMAR_ARCHIVO_CELULAR.cmd` and choose **P (in
parts)**: `MGS_disco1.mgs` (about 400 MB) is enough to start; the game asks for disc 2 (about 70 MB) at the disc change.
Download `ShadowMoses_iphone_sin_firmar.ipa` from the project's GitHub Releases page.

**Apple accounts:** with a **free** Apple ID the signature lasts **7 days** (then the app won't open until you refresh it;
your data and saves are kept) and you can have **3** self-signed apps at a time (AltStore/SideStore take one of them), up
to 10 new apps per week. With the **paid developer account (USD 99 per year)** it lasts 1 year with no 3-app limit.
Nobody from this project will ever ask for your password: you give it to the third-party tool, which talks to Apple.
On iOS 16+, turn on **Developer Mode** the first time (Settings > Privacy & Security > Developer Mode, then restart), and if
it says "Untrusted Developer": Settings > General > VPN & Device Management > your Apple ID > Trust.

- **AltStore** (Windows or Mac PC): install AltServer from https://altstore.io (on Windows it needs iTunes and iCloud from
  Apple's website, not the Microsoft Store), connect the iPhone, AltServer > Install AltStore. Copy the `.ipa` to the
  iPhone, open AltStore > My Apps > **+** > choose it. It refreshes by itself every 7 days while AltServer is on the same
  Wi-Fi; otherwise tap **Refresh All** with the PC nearby.
- **SideStore** (refreshes without a PC): follow https://sidestore.io (the first setup needs a PC once, for the pairing
  file). Then My Apps > **+** > choose the `.ipa`. Refresh every 7 days from the iPhone itself, as its guide says.
- **Sideloadly** (Windows or Mac, cable): install from https://sideloadly.io, connect the iPhone, drag the `.ipa` into
  Sideloadly, enter your Apple ID, **Start**. Repeat every 7 days with the same Apple ID (your data is kept), or enable its
  Wi-Fi auto refresh.

**Loading your data:** open the app once, then in the **Files** app go to **On My iPhone > Shadow Moses** and **move** your
`.mgs` files there (uses the least space), and open the app again. Or tap **CHOOSE FILES** in the app: they are copied
into the app (then delete the originals). If you only loaded disc 1, the game says **PLEASE INSERT DISC 2** at the disc
change: choose `MGS_disco2.mgs`. The app does not connect to the internet. This is your own data, made from your discs:
please do not upload or share it.

FeniXVOID · Project Ravenlight
