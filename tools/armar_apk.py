# MGS web — FeniXVOID · Project Ravenlight
import os, secrets, shutil, subprocess, sys, tempfile, zipfile

def arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SDK = arg('--sdk', os.path.join(os.path.dirname(os.path.dirname(RAIZ)), '_herramientas', 'android-sdk'))
TOOLS = os.path.join(SDK, 'build-tools', '34.0.0')
ANDROID_JAR = os.path.join(SDK, 'platforms', 'android-34', 'android.jar')
FUENTE = os.path.join(RAIZ, 'android', 'celular')
VISOR = os.path.join(RAIZ, '_release', 'MGSweb', 'app', 'visor')
SALIDA = os.path.join(RAIZ, '_release')
VERSION, CODIGO = (arg('--version', '1.4'), arg('--codigo', '5'))
PRUEBA = '--prueba' in sys.argv
PRIVADO = os.path.join(RAIZ, '_privado')
ALMACEN, CLAVE = (os.path.join(PRIVADO, 'mgsweb_firma.keystore'), os.path.join(PRIVADO, 'mgsweb_firma_clave.txt'))

def correr(*c):
    subprocess.run(list(c), check=True, shell=str(c[0]).endswith('.bat'))

def firma():
    if not os.path.exists(ALMACEN):
        os.makedirs(PRIVADO, exist_ok=True)
        with open(CLAVE, 'w', encoding='ascii') as f:
            f.write(secrets.token_urlsafe(24))
        correr('keytool', '-genkeypair', '-keystore', ALMACEN, '-storepass:file', CLAVE, '-keypass:file', CLAVE, '-alias', 'mgsweb', '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000', '-dname', 'CN=FeniXVOID, O=Project Ravenlight')
        print('Firma nueva en', ALMACEN)

def main():
    if not os.path.isfile(os.path.join(VISOR, 'index.html')):
        sys.exit('Falta el visor: correr antes tools/armar_release.py')
    firma()
    with tempfile.TemporaryDirectory(prefix='mgs-apk-') as t:
        compilados = os.path.join(t, 'res.zip')
        correr(os.path.join(TOOLS, 'aapt2.exe'), 'compile', '--dir', os.path.join(FUENTE, 'res'), '-o', compilados)
        assets = os.path.join(t, 'assets')
        shutil.copytree(VISOR, os.path.join(assets, 'visor'))
        shutil.copytree(os.path.join(FUENTE, 'app'), os.path.join(assets, 'app'))
        base = os.path.join(t, 'base.apk')
        correr(os.path.join(TOOLS, 'aapt2.exe'), 'link', '-o', base, '-I', ANDROID_JAR, '--manifest', os.path.join(FUENTE, 'AndroidManifest.xml'), '-A', assets, '--min-sdk-version', '24', '--target-sdk-version', '34', '--version-code', CODIGO, '--version-name', VERSION, *(['--debug-mode'] if PRUEBA else []), compilados)
        clases = os.path.join(t, 'clases')
        os.makedirs(clases)
        java = [os.path.join(r, a) for r, _, l in os.walk(os.path.join(FUENTE, 'src')) for a in l if a.endswith('.java')]
        correr('javac', '-parameters', '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-nowarn', '-Xlint:-options', '-bootclasspath', ANDROID_JAR + os.pathsep + os.path.join(TOOLS, 'core-lambda-stubs.jar'), '-d', clases, *java)
        dex = os.path.join(t, 'dex')
        os.makedirs(dex)
        correr(os.path.join(TOOLS, 'd8.bat'), '--lib', ANDROID_JAR, '--min-api', '24', '--release', '--output', dex, *[os.path.join(r, a) for r, _, l in os.walk(clases) for a in l if a.endswith('.class')])
        with zipfile.ZipFile(base, 'a', zipfile.ZIP_DEFLATED) as z:
            z.write(os.path.join(dex, 'classes.dex'), 'classes.dex')
        alineada = os.path.join(t, 'alineada.apk')
        correr(os.path.join(TOOLS, 'zipalign.exe'), '-f', '-p', '4', base, alineada)
        final = os.path.join(SALIDA, 'ShadowMoses_celular_v%s%s.apk' % (VERSION, '_prueba' if PRUEBA else ''))
        correr(os.path.join(TOOLS, 'apksigner.bat'), 'sign', '--ks', ALMACEN, '--ks-pass', 'file:' + CLAVE, '--ks-key-alias', 'mgsweb', '--out', final, alineada)
        correr(os.path.join(TOOLS, 'apksigner.bat'), 'verify', final)
    if os.path.exists(final + '.idsig'):
        os.remove(final + '.idsig')
    print('APK: %s (%.1f MB)' % (final, os.path.getsize(final) / 1048576))
if __name__ == '__main__':
    main()
