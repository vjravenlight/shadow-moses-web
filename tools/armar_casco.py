# MGS web — FeniXVOID · Project Ravenlight
import hashlib, json, os, re, shutil, sys

def arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IPHONE = '--iphone' in sys.argv
VISOR = os.path.abspath(arg('--visor', os.path.join(RAIZ, '_release', 'MGSweb', 'app', 'visor')))
BASE = os.path.abspath(arg('--base', os.path.join(RAIZ, '_release', 'MGSweb', 'app', 'base')))
WEB = os.path.join(RAIZ, 'android', 'casco', 'web')
SALIDA = os.path.abspath(arg('--salida', os.path.join(RAIZ, '_release', 'MGSweb_iPhone' if IPHONE else 'MGSweb_Casco')))
FUERA = shutil.ignore_patterns('assets', '_*', 'prueba_*', 'log.php', '.htaccess', 'LEEME.md', 'juego_v1.js')
HTACCESS = 'Options -Indexes\nDirectoryIndex index.html\nAddType application/manifest+json .webmanifest\nAddType text/javascript .js .mjs\nAddType application/json .json\n<IfModule mod_headers.c>\n  Header set X-Robots-Tag "noindex, nofollow"\n  # Como visor/.htaccess: la CSP de la portada se hereda y frena los scripts de la página, las texturas y WebXR\n  Header always unset Content-Security-Policy\n  Header unset Content-Security-Policy\n  Header always set Content-Security-Policy "default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; media-src \'self\' blob: data:; connect-src \'self\' blob: data:; worker-src \'self\' blob:; object-src \'none\'; base-uri \'self\'; frame-ancestors \'self\'"\n  Header always unset Permissions-Policy\n  Header unset Permissions-Policy\n  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), xr-spatial-tracking=(self)"\n  <FilesMatch "\\.(js|html|json|webmanifest)$">\n    Header set Cache-Control "no-cache"\n  </FilesMatch>\n  <Files "sw.js">\n    Header set Cache-Control "no-cache, no-store, must-revalidate"\n  </Files>\n</IfModule>\n'

def main():
    if not os.path.isfile(os.path.join(VISOR, 'index.html')):
        raise SystemExit('Falta el visor: correr antes tools/armar_release.py (o pasar --visor visor)')
    if not os.path.isfile(os.path.join(BASE, 'icono_192.png')):
        raise SystemExit('Faltan los íconos: pasar --base visor/assets (o app_base en el repo público)')
    if os.path.exists(SALIDA):
        shutil.rmtree(SALIDA)
    shutil.copytree(VISOR, SALIDA, ignore=FUERA)
    os.rename(os.path.join(SALIDA, 'index.html'), os.path.join(SALIDA, 'juego.html'))
    marca = 'window.MGSCasco = true;' + (' window.MGSIphone = true;' if IPHONE else '')
    p = os.path.join(SALIDA, 'juego.html')
    s = open(p, encoding='utf-8', newline='').read()
    a = re.search('<head[^>]*>', s)
    s = s[:a.end()] + '\n<script>' + marca + '</script>\n<script src="mgs_zip.js"></script>' + s[a.end():]
    open(p, 'w', encoding='utf-8', newline='').write(s)
    if os.path.exists(os.path.join(SALIDA, 'sw.js')):
        os.remove(os.path.join(SALIDA, 'sw.js'))
    for n in os.listdir(WEB):
        shutil.copy2(os.path.join(WEB, n), os.path.join(SALIDA, n))
    if IPHONE:
        p = os.path.join(SALIDA, 'index.html')
        s = open(p, encoding='utf-8', newline='').read()
        a = re.search('<head[^>]*>', s)
        open(p, 'w', encoding='utf-8', newline='').write(s[:a.end()] + '\n<script>window.MGSIphone = true;</script>' + s[a.end():])
    os.makedirs(os.path.join(SALIDA, 'assets'), exist_ok=True)
    for n in ('icono_192.png', 'icono_512.png'):
        shutil.copy2(os.path.join(BASE, n), os.path.join(SALIDA, 'assets', n))
    m = json.load(open(os.path.join(SALIDA, 'manifest.webmanifest'), encoding='utf-8'))
    m.update(start_url='./', scope='./', display='fullscreen')
    if IPHONE:
        m.update(name='Shadow Moses', short_name='Shadow Moses', id='./')
    json.dump(m, open(os.path.join(SALIDA, 'manifest.webmanifest'), 'w', encoding='utf-8'), indent=1)
    with open(os.path.join(SALIDA, '.htaccess'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(HTACCESS)
    lista = sorted((os.path.relpath(os.path.join(r, n), SALIDA).replace(os.sep, '/') for r, _, l in os.walk(SALIDA) for n in l))
    lista = [r for r in lista if r not in ('sw.js', '.htaccess', 'lista.json') and (not r.startswith('assets/'))]
    lista = [r for r in lista if not r.startswith('lib/') or r.startswith('lib/three/build/')]
    h = hashlib.sha256()
    for r in lista:
        h.update(r.encode())
        h.update(open(os.path.join(SALIDA, r), 'rb').read())
    json.dump(lista + ['./'], open(os.path.join(SALIDA, 'lista.json'), 'w', encoding='utf-8'))
    p = os.path.join(SALIDA, 'sw.js')
    s = open(p, encoding='utf-8').read()
    assert '__VERSION__' in s
    open(p, 'w', encoding='utf-8', newline='\n').write(s.replace('__VERSION__', h.hexdigest()[:12]))
    tam = sum((os.path.getsize(os.path.join(r, n)) for r, _, l in os.walk(SALIDA) for n in l))
    print('Listo: %s (%d archivos, %.0f MB)' % (SALIDA, len(lista), tam / 1048576))
if __name__ == '__main__':
    main()
