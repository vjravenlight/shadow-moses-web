# MGS web — FeniXVOID · Project Ravenlight
import json, os, re, shutil, subprocess, sys, tempfile, urllib.request, xml.etree.ElementTree as ET, zipfile

def arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERRAMIENTAS = os.path.join(os.path.dirname(os.path.dirname(RAIZ)), '_herramientas')
SDK = arg('--sdk', os.path.join(HERRAMIENTAS, 'android-sdk'))
LIBS = os.path.join(HERRAMIENTAS, 'quest-libs')
TOOLS = os.path.join(SDK, 'build-tools', '34.0.0')
ANDROID_JAR = os.path.join(SDK, 'platforms', 'android-34', 'android.jar')
FUENTE = os.path.join(RAIZ, 'android', 'casco')
ICONOS = os.path.join(RAIZ, 'android', 'celular', 'res')
SALIDA = os.path.join(RAIZ, '_release')
VERSION, CODIGO = (arg('--version', '1.0'), arg('--codigo', '1'))
ALMACEN, CLAVE = (os.path.join(RAIZ, '_privado', 'mgsweb_firma.keystore'), os.path.join(RAIZ, '_privado', 'mgsweb_firma_clave.txt'))
PAQUETE = 'net.ravenlight.shadowmoses.quest'
RAICES = ['com.meta.androidbrowserhelper:androidbrowserhelper:2.5.0']
REPOS = ['https://dl.google.com/dl/android/maven2/', 'https://repo1.maven.org/maven2/']
NS = '{http://maven.apache.org/POM/4.0.0}'

def correr(*c):
    subprocess.run(list(c), check=True, shell=str(c[0]).endswith('.bat'))

def bajar(ruta, destino):
    if os.path.exists(destino):
        return True
    for r in REPOS:
        try:
            with urllib.request.urlopen(urllib.request.Request(r + ruta, headers={'User-Agent': 'armar_apk_quest'}), timeout=60) as u:
                b = u.read()
        except Exception:
            continue
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        with open(destino, 'wb') as f:
            f.write(b)
        return True
    return False

def clave_version(v):
    return [int(x) if x.isdigit() else 0 for x in re.split('[.-]', v)]

def resolver():
    elegidas, pendientes = ({}, list(RAICES))
    while pendientes:
        g, a, v = pendientes.pop().split(':')
        if (g, a) in elegidas and clave_version(elegidas[g, a]) >= clave_version(v):
            continue
        elegidas[g, a] = v
        base = '%s/%s/%s/%s-%s' % (g.replace('.', '/'), a, v, a, v)
        pom = os.path.join(LIBS, 'pom', '%s-%s-%s.pom' % (g, a, v))
        if not bajar(base + '.pom', pom):
            sys.exit('No se pudo bajar ' + base)
        for d in ET.parse(pom).getroot().iterfind('%sdependencies/%sdependency' % (NS, NS)):
            t = lambda k: (d.findtext(NS + k) or '').strip()
            if t('scope') in ('test', 'provided') or t('optional') == 'true':
                continue
            ver = t('version').strip('[]')
            if ver and (not ver.startswith('$')):
                pendientes.append('%s:%s:%s' % (t('groupId'), t('artifactId'), ver))
    archivos = []
    for (g, a), v in sorted(elegidas.items()):
        base = '%s/%s/%s/%s-%s' % (g.replace('.', '/'), a, v, a, v)
        for ext in ('aar', 'jar'):
            p = os.path.join(LIBS, '%s-%s-%s.%s' % (g, a, v, ext))
            if bajar(base + '.' + ext, p):
                archivos.append(p)
                break
        else:
            sys.exit('No se pudo bajar ' + base)
    return archivos

def huella():
    r = subprocess.run(['keytool', '-list', '-v', '-keystore', ALMACEN, '-storepass:file', CLAVE, '-alias', 'mgsweb'], capture_output=True, text=True, check=True)
    return re.search('SHA256:\\s*([0-9A-F:]+)', r.stdout).group(1)

def main():
    if not os.path.exists(ALMACEN):
        sys.exit('Falta la firma en _privado/: correr antes tools/armar_apk.py')
    libs = resolver()
    print('Librerías: %d (%.1f MB)' % (len(libs), sum((os.path.getsize(p) for p in libs)) / 1048576))
    with tempfile.TemporaryDirectory(prefix='mgs-apk-quest-') as t:
        compilados, jars, paquetes = ([], [], [])
        res = os.path.join(t, 'res')
        shutil.copytree(os.path.join(FUENTE, 'res'), res)
        shutil.copytree(ICONOS, res, dirs_exist_ok=True)
        z0 = os.path.join(t, 'app.zip')
        correr(os.path.join(TOOLS, 'aapt2.exe'), 'compile', '--dir', res, '-o', z0)
        for i, p in enumerate(libs):
            if p.endswith('.jar'):
                jars.append(p)
                continue
            d = os.path.join(t, 'aar%d' % i)
            with zipfile.ZipFile(p) as z:
                z.extractall(d)
            if os.path.exists(os.path.join(d, 'classes.jar')):
                jars.append(os.path.join(d, 'classes.jar'))
            otros = os.path.join(d, 'libs')
            if os.path.isdir(otros):
                jars += [os.path.join(otros, n) for n in os.listdir(otros) if n.endswith('.jar')]
            m = re.search('package="([^"]+)"', open(os.path.join(d, 'AndroidManifest.xml'), encoding='utf-8').read())
            if m:
                paquetes.append(m.group(1))
            if os.path.isdir(os.path.join(d, 'res')) and os.listdir(os.path.join(d, 'res')):
                zz = os.path.join(t, 'aar%d.zip' % i)
                correr(os.path.join(TOOLS, 'aapt2.exe'), 'compile', '--dir', os.path.join(d, 'res'), '-o', zz)
                compilados.append(zz)
        base, gen = (os.path.join(t, 'base.apk'), os.path.join(t, 'gen'))
        os.makedirs(gen)
        enlace = [os.path.join(TOOLS, 'aapt2.exe'), 'link', '-o', base, '-I', ANDROID_JAR, '--manifest', os.path.join(FUENTE, 'AndroidManifest.xml'), '--min-sdk-version', '24', '--target-sdk-version', '32', '--version-code', CODIGO, '--version-name', VERSION, '--auto-add-overlay', '--java', gen, '--extra-packages', ':'.join(sorted(set(paquetes)))]
        for c in compilados:
            enlace += ['-R', c]
        enlace += ['-R', z0]
        correr(*enlace)
        clases = os.path.join(t, 'clases')
        os.makedirs(clases)
        java = [os.path.join(r, a) for r, _, l in os.walk(gen) for a in l if a.endswith('.java')]
        correr('javac', '-parameters', '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-nowarn', '-Xlint:-options', '-bootclasspath', ANDROID_JAR, '-d', clases, *java)
        dex = os.path.join(t, 'dex')
        os.makedirs(dex)
        rjar = os.path.join(t, 'r.jar')
        with zipfile.ZipFile(rjar, 'w', zipfile.ZIP_STORED) as z:
            for r, _, l in os.walk(clases):
                for a in l:
                    z.write(os.path.join(r, a), os.path.relpath(os.path.join(r, a), clases).replace(os.sep, '/'))
        correr(os.path.join(TOOLS, 'd8.bat'), '--lib', ANDROID_JAR, '--min-api', '24', '--release', '--output', dex, *jars, rjar)
        with zipfile.ZipFile(base, 'a', zipfile.ZIP_DEFLATED) as z:
            for n in sorted(os.listdir(dex)):
                z.write(os.path.join(dex, n), n)
        alineada = os.path.join(t, 'alineada.apk')
        correr(os.path.join(TOOLS, 'zipalign.exe'), '-f', '-p', '4', base, alineada)
        final = os.path.join(SALIDA, 'ShadowMoses_quest_v%s.apk' % VERSION)
        correr(os.path.join(TOOLS, 'apksigner.bat'), 'sign', '--ks', ALMACEN, '--ks-pass', 'file:' + CLAVE, '--ks-key-alias', 'mgsweb', '--out', final, alineada)
        correr(os.path.join(TOOLS, 'apksigner.bat'), 'verify', final)
    if os.path.exists(final + '.idsig'):
        os.remove(final + '.idsig')
    enlaces = [{'relation': ['delegate_permission/common.handle_all_urls'], 'target': {'namespace': 'android_app', 'package_name': PAQUETE, 'sha256_cert_fingerprints': [huella()]}}]
    wk = os.path.join(RAIZ, 'portada', '.well-known')
    os.makedirs(wk, exist_ok=True)
    with open(os.path.join(wk, 'assetlinks.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(enlaces, f, indent=2)
    print('APK: %s (%.1f MB)' % (final, os.path.getsize(final) / 1048576))
if __name__ == '__main__':
    main()
