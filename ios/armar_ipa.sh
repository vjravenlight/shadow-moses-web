#!/bin/sh
# Arma ShadowMoses_iphone.ipa SIN FIRMAR en una Mac (o en GitHub Actions, macOS: ios/github/ios_ipa.yml).
# Necesita Xcode (xcodebuild) y XcodeGen (brew install xcodegen). No lleva ningún archivo del juego: el visor va adentro y
# los datos los pone cada jugador (sus .mgs). La firma la hace cada jugador con AltStore, SideStore o Sideloadly
# (ios/FIRMAR_E_INSTALAR.md).
# Uso: sh ios/armar_ipa.sh        (desde la raíz del repo; deja ios/build/ShadowMoses_iphone.ipa)
# FeniXVOID · Project Ravenlight
set -eu
AQUI=$(cd "$(dirname "$0")" && pwd)
RAIZ=$(dirname "$AQUI")
SAL="$AQUI/build"
VISOR="$RAIZ/visor"
[ -f "$VISOR/index.html" ] || { echo "Falta $VISOR/index.html"; exit 1; }
ICONO="$RAIZ/app_base/icono_512.png"                       # repo público
[ -f "$ICONO" ] || ICONO="$VISOR/assets/icono_512.png"     # carpeta de trabajo
[ -f "$ICONO" ] || { echo "Falta icono_512.png (app_base/ o visor/assets/)"; exit 1; }

rm -rf "$SAL"   # carpeta generada por este script
mkdir -p "$SAL/web/visor" "$SAL/web/app" "$SAL/iconos"
# el visor sin assets/ ni lo de pruebas: lo mismo que deja afuera tools/armar_release.py (VISOR_FUERA)
rsync -a --exclude '/assets' --exclude '/_*' --exclude '/prueba_*' --exclude '/log.php' --exclude '/.htaccess' \
  --exclude '/LEEME.md' --exclude '/juego_v1.js' "$VISOR/" "$SAL/web/visor/"
cp -R "$AQUI/app/." "$SAL/web/app/"
# íconos (sips viene con macOS)
sips -z 120 120 "$ICONO" --out "$SAL/iconos/AppIcon60x60@2x.png" >/dev/null
sips -z 180 180 "$ICONO" --out "$SAL/iconos/AppIcon60x60@3x.png" >/dev/null
sips -z 76 76 "$ICONO" --out "$SAL/iconos/AppIcon76x76~ipad.png" >/dev/null
sips -z 152 152 "$ICONO" --out "$SAL/iconos/AppIcon76x76@2x~ipad.png" >/dev/null

cd "$AQUI"
xcodegen generate --spec project.yml --quiet
xcodebuild -project ShadowMoses.xcodeproj -scheme ShadowMoses -configuration Release -sdk iphoneos \
  -derivedDataPath "$SAL/dd" -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build
APP="$SAL/dd/Build/Products/Release-iphoneos/ShadowMoses.app"
[ -d "$APP" ] || { echo "No salió $APP"; exit 1; }
mkdir -p "$SAL/Payload"
cp -R "$APP" "$SAL/Payload/"
(cd "$SAL" && rm -f ShadowMoses_iphone.ipa && zip -qry ShadowMoses_iphone.ipa Payload)
echo "Listo: $SAL/ShadowMoses_iphone.ipa ($(du -h "$SAL/ShadowMoses_iphone.ipa" | cut -f1))"
