# MGS web — FeniXVOID · Project Ravenlight
import os, sys, shutil, zipfile, fnmatch
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def arg(k, d=None):
    return sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
VERSION = arg('--version', '1.9')
NODE = arg('--node', 'C:\\Program Files\\nodejs\\node.exe')
PYTHON = arg('--python', 'C:\\Python313')
SITE = arg('--site', os.path.join(os.environ.get('APPDATA', ''), 'Python', 'Python313', 'site-packages'))
FFMPEG = arg('--ffmpeg', os.path.join(os.environ.get('LOCALAPPDATA', ''), 'JDownloader 2', 'tools', 'Windows', 'ffmpeg', 'x64', 'ffmpeg.exe'))
SALIDA = os.path.abspath(arg('--salida', os.path.join(RAIZ, '_release', 'MGSweb')))
PUERTO = 8123
TOOLS = ['archivo_celular', 'actores_export', 'anims', 'camaras_export', 'caras_ps1', 'categorizar', 'cielo', 'codec_niveles', 'codec_voces', 'codec_web', 'convertir', 'creditos_export', 'demo_dat', 'demos_cadenas', 'demos_export', 'disco', 'export_glb', 'exportar_todo', 'face_dat', 'fuente_web', 'gcl_vm', 'gcx', 'guion_disco2', 'guion_vivo', 'hud_extra', 'hud_indices', 'hzm', 'iconos_inventario', 'jeep19a_export', 'jeep_export', 'jefes_export', 'kmd2obj', 'liquid_export', 'ninja_export', 'niveles', 'oar', 'paddemo_export', 'paredes_rompibles', 'partida_items', 'pcx_mgs', 'personajes_export', 'pisos_atr', 'presets_historia', 'preshade', 'puertas_tarjeta', 'radio_dat', 'rango_export', 'rex_export', 'rpk', 'rutas', 'sgt_export', 'sonido', 'stage_extract', 'sueltos_export', 'tablas_ref', 'telops_nitidos', 'titulo_export', 'trampas_13', 'videos_export', 'voces_disco2', 'vox', 'vr_camaras', 'vr_export', 'vr_fondo', 'vr_menu', 'wolf_export', 'zako_export']
TOOLS_DATOS = ['names.txt', 'tablas_ref.json', 'telops_textos.json', 'sueltos.json', 'servidor.mjs']
VISOR_FUERA = ['assets', '_*', 'prueba_*', 'log.php', '.htaccess', 'LEEME.md', 'juego_v1.js']
ASSETS_PROPIOS = ['icono_192.png', 'icono_512.png', 'xr', 'hud/icono_socom.png', 'hud/icono_socom_sil.png', 'hud/icono_famas.png', 'hud/icono_caja.png']
PY_FUERA = ['test', 'tests', 'idlelib', 'tkinter', 'turtledemo', 'ensurepip', 'site-packages', '__pycache__', 'lib2to3', 'pydoc_data', 'venv', 'unittest', 'turtle.py', '_test*', '_tkinter*', 'tcl*', 'tk*', 'sqlite3*', '_sqlite3*', '*.pdb', '*.lib', '*.ico', 'python_lib.cat', 'pythonw.exe']
PY_PAQUETES = ['numpy', 'numpy.libs', 'PIL', 'fontTools', 'numpy-*.dist-info', 'pillow-*.dist-info', 'fonttools-*.dist-info']

def fuera(nombre, patrones):
    return any((fnmatch.fnmatch(nombre, p) for p in patrones))

def copiar_arbol(origen, destino, patrones=()):
    for raiz, dirs, archivos in os.walk(origen):
        dirs[:] = [d for d in dirs if not fuera(d, patrones)]
        rel = os.path.relpath(raiz, origen)
        os.makedirs(os.path.join(destino, rel), exist_ok=True)
        for a in archivos:
            if not fuera(a, patrones):
                shutil.copy2(os.path.join(raiz, a), os.path.join(destino, rel, a))

def real(ruta):
    return os.path.realpath(ruta)

def escribir(nombre, texto, crlf=True):
    p = os.path.join(SALIDA, nombre)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='\r\n' if crlf else '\n') as f:
        f.write(texto)

def tam(p):
    if os.path.isfile(p):
        return os.path.getsize(p)
    return sum((os.path.getsize(os.path.join(r, a)) for r, _, fs in os.walk(p) for a in fs))
INSTALAR = '@echo off\nchcp 65001 >nul\nsetlocal EnableExtensions DisableDelayedExpansion\ntitle MGS web - instalar / install\ncolor 0A\ncd /d "%~dp0"\nset "PY=%~dp0runtime\\python\\python.exe"\nset "PATH=%~dp0runtime\\ffmpeg;%PATH%"\nset "PYTHONHOME="\nset "PYTHONPATH="\nset "PYTHONNOUSERSITE=1"\nset "PYTHONUTF8=1"\nif not exist "%~dp0config" mkdir "%~dp0config"\necho.\necho   ==================================================================\necho    [ CODEC ]   FREQ 140.85                     PTT  ##############\necho   ==================================================================\necho.\necho        S  H  A  D  O  W     M  O  S  E  S     ::     W  E  B\necho.\necho   ------------------------------------------------------------------\necho   HQ: Snake, me escuchas? / Snake, do you read me?\necho   Necesitas TUS discos de Metal Gear Solid para PlayStation, version USA (.bin/.cue).\necho   You need YOUR OWN Metal Gear Solid PlayStation discs, USA version (.bin/.cue).\necho   Este paquete no trae nada del juego: convierte tus archivos aca, en tu PC.\necho   This package has no game files: it converts yours, here on your PC.\necho.\nset "D1="\nset "D2="\nif exist "%~dp0config\\disco1.txt" set /p D1=<"%~dp0config\\disco1.txt"\nif exist "%~dp0config\\disco2.txt" set /p D2=<"%~dp0config\\disco2.txt"\nrem sin ventanas (pruebas o uso avanzado): set MGS_DISCO1=... y MGS_DISCO2=... antes de correrlo\nif defined MGS_DISCO1 set "D1=%MGS_DISCO1%"\nif defined MGS_DISCO1 set "D2=%MGS_DISCO2%"\nif defined MGS_DISCO1 goto validar_env\nif not defined D1 goto elegir1\nif not exist "%D1%" goto elegir1\nrem con for: un "&" en la ruta, expandido con %D1% en un echo suelto, corta la linea\nfor /f "delims=" %%a in ("%D1%") do echo   Disco 1 / Disc 1:  %%a\nif defined D2 for /f "delims=" %%a in ("%D2%") do echo   Disco 2 / Disc 2:  %%a\nchoice /c SN /m "  Seguir con esos? / Continue with those? (S = si/yes, N = elegir de nuevo/choose again)"\nif errorlevel 2 goto elegir1\ngoto convertir\n\n:elegir1\nset "D1="\nset "D2="\necho   HQ: Pone el DISCO 1 (.cue o .bin) en la ventana que se abre...\necho   HQ: Insert DISC 1 (.cue or .bin) in the window that opens...\ncall :elegir "MGS - DISCO 1 / DISC 1 (.cue / .bin)" D1\nif not defined D1 goto nada\n"%PY%" "%~dp0app\\tools\\convertir.py" --validar --disco1 "%D1%" --trabajo "%~dp0trabajo" --assets "%~dp0datos"\nif errorlevel 1 goto mal1\necho.\necho   HQ: Ahora el DISCO 2. Si no lo tenes, toca Cancelar: se juega hasta el cambio de disco.\necho   HQ: Now DISC 2. If you don\'t have it, press Cancel: you can play up to the disc change.\ncall :elegir "MGS - DISCO 2 / DISC 2 (.cue / .bin) - Cancelar si no lo tenes / Cancel if you don\'t have it" D2\nif not defined D2 goto convertir\n"%PY%" "%~dp0app\\tools\\convertir.py" --validar --disco2 "%D2%" --trabajo "%~dp0trabajo" --assets "%~dp0datos"\nif errorlevel 1 goto mal2\n\n:validar_env\n"%PY%" "%~dp0app\\tools\\convertir.py" --validar --disco1 "%D1%" --trabajo "%~dp0trabajo" --assets "%~dp0datos"\nif errorlevel 1 goto mal1\nif not defined D2 goto convertir\n"%PY%" "%~dp0app\\tools\\convertir.py" --validar --disco2 "%D2%" --trabajo "%~dp0trabajo" --assets "%~dp0datos"\nif errorlevel 1 goto mal2\n\n:convertir\nrem con for y sin bloques ( ): los nombres de los discos suelen traer parentesis, "(Disc 2) (v1.0)", y a veces "&"\nfor /f "delims=" %%a in ("%D1%") do > "%~dp0config\\disco1.txt" echo %%a\nif defined D2 for /f "delims=" %%a in ("%D2%") do > "%~dp0config\\disco2.txt" echo %%a\nif not defined D2 if exist "%~dp0config\\disco2.txt" del "%~dp0config\\disco2.txt"\necho.\necho   HQ: Convirtiendo (de 5 a 8 minutos): se puede cortar y retomar abriendo INSTALAR.cmd de nuevo.\necho   HQ: Converting (5 to 8 minutes): you can stop and resume by opening INSTALAR.cmd again.\nif defined D2 "%PY%" "%~dp0app\\tools\\convertir.py" --disco1 "%D1%" --disco2 "%D2%" --trabajo "%~dp0trabajo" --assets "%~dp0datos" --base "%~dp0app\\base"\nif not defined D2 "%PY%" "%~dp0app\\tools\\convertir.py" --disco1 "%D1%" --trabajo "%~dp0trabajo" --assets "%~dp0datos" --base "%~dp0app\\base"\nif errorlevel 1 goto fallo\nif defined MGS_SIN_ACCESO goto jugar\nrem la carpeta va por variable: un apostrofe en la ruta (C:\\Users\\O\'Neil) rompia el comando y no se creaba el acceso directo\nset "MGS_DIR=%~dp0"\npowershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath(\'Desktop\') + \'\\Metal Gear Solid web.lnk\'); $s.TargetPath = $env:MGS_DIR + \'JUGAR.cmd\'; $s.WorkingDirectory = $env:MGS_DIR; $s.IconLocation = $env:MGS_DIR + \'app\\visor\\assets_icono.ico,0\'; $s.Save()" >nul 2>&1\necho.\necho   ==================================================================\necho    MISION CUMPLIDA / MISSION COMPLETE\necho   ==================================================================\necho   Deje un acceso directo "Metal Gear Solid web" en el Escritorio. / Shortcut "Metal Gear Solid web" left on the Desktop.\n:jugar\necho   La carpeta "trabajo" (archivos intermedios, ~1,5 GB) se puede borrar; sin ella, sumar el disco 2 despues tarda mas.\necho   The "trabajo" folder (intermediate files, ~1.5 GB) can be deleted; without it, adding disc 2 later takes longer.\necho.\nif defined MGS_SIN_JUGAR exit /b 0\ncall "%~dp0JUGAR.cmd"\nexit /b 0\n\n:nada\necho   No elegiste ningun archivo. / No file chosen.\npause\nexit /b 1\n:mal1\ncolor 0E\necho.\necho   [ ! ]  HQ: Ese no es el disco correcto. / That\'s not the right disc.\necho   Elegi el .cue (o el .bin) de Metal Gear Solid USA, DISCO 1 (SLUS-00594).\necho   Choose the .cue (or .bin) of Metal Gear Solid USA, DISC 1 (SLUS-00594).\npause\nexit /b 1\n:mal2\ncolor 0E\necho.\necho   [ ! ]  HQ: Ese no es el disco correcto. / That\'s not the right disc.\necho   Elegi el .cue (o el .bin) de Metal Gear Solid USA, DISCO 2 (SLUS-00776), o Cancelar si no lo tenes.\necho   Choose the .cue (or .bin) of Metal Gear Solid USA, DISC 2 (SLUS-00776), or Cancel if you don\'t have it.\npause\nexit /b 1\n:fallo\ncolor 0C\necho.\necho   ==================================================================\necho    [ ! ]  ALERT\necho   ==================================================================\necho   No se completo la conversion. Abri INSTALAR.cmd de nuevo para seguir desde donde quedo.\necho   Conversion not completed. Open INSTALAR.cmd again to resume.\npause\nexit /b 1\n\n:elegir\nset "%~2="\nrem el titulo va por variable: un apostrofe adentro del comando ("don\'t") rompia PowerShell y la ventana no abria\nset "MGS_TITULO=%~1"\nrem solo se acepta un archivo que exista: cualquier otra salida de PowerShell no cuenta como disco\nfor /f "usebackq delims=" %%i in (`powershell -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.Title = $env:MGS_TITULO; $f.Filter = \'Imagen de CD / CD image (*.cue;*.bin;*.img)|*.cue;*.bin;*.img|Todos / All (*.*)|*.*\'; if ($f.ShowDialog() -eq \'OK\') { $f.FileName }"`) do if exist "%%i" set "%~2=%%i"\nexit /b 0\n'
JUGAR = '@echo off\nchcp 65001 >nul\ntitle MGS web - servidor (cerra esta ventana para apagarlo / close this window to stop it)\ncolor 0A\ncd /d "%~dp0"\nrem MGS_PUERTO cambia el puerto (pruebas); MGS_SIN_NAVEGADOR=1 no abre el navegador\nif not defined MGS_PUERTO set "MGS_PUERTO=__PUERTO__"\nif not exist "datos\\discos.json" ( call "%~dp0INSTALAR.cmd" & exit /b )\necho.\necho   ==================================================================\necho    [ CODEC ]   FREQ 140.85                     PTT  ##############\necho   ==================================================================\necho.\necho        S  H  A  D  O  W     M  O  S  E  S     ::     W  E  B\necho.\necho   ------------------------------------------------------------------\necho   SERVIDOR EN LINEA - SOLO EN ESTA PC / SERVER ONLINE - THIS PC ONLY\necho   En esta PC / On this PC:   http://127.0.0.1:%MGS_PUERTO%/   (se abre solo / opens by itself)\necho.\necho   Casco VR con Link, Air Link o Virtual Desktop: la misma direccion en Chrome o Edge de esta PC.\necho   VR headset with Link, Air Link or Virtual Desktop: the same address in Chrome or Edge on this PC.\necho   Casco por cable USB / Headset over USB:  CASCO_USB.cmd\necho.\necho   Dejala abierta mientras jugas. / Keep this window open while playing.\necho.\nif not defined MGS_SIN_NAVEGADOR start "" "http://127.0.0.1:%MGS_PUERTO%/"\n"%~dp0node\\node.exe" "%~dp0app\\tools\\servidor.mjs" %MGS_PUERTO% "%~dp0app\\visor" --assets "%~dp0datos"\npause\n'.replace('__PUERTO__', str(PUERTO))
ARCHIVO_CELULAR = '@echo off\nchcp 65001 >nul\ntitle MGS web - archivo para el celular / file for the phone\ncolor 0A\ncd /d "%~dp0"\nset "PYTHONHOME="\nset "PYTHONPATH="\nset "PYTHONNOUSERSITE=1"\nset "PYTHONUTF8=1"\necho.\necho   HQ: Juntando tus datos en un solo archivo para la app de celular (1 o 2 minutos).\necho   HQ: Packing your data into a single file for the phone app (1 or 2 minutes).\necho.\n"%~dp0runtime\\python\\python.exe" "%~dp0app\\tools\\archivo_celular.py" "%~dp0datos" "%~dp0MGSweb_datos.mgs"\nif errorlevel 1 goto fin\necho.\necho   Copia MGSweb_datos.mgs al celular (por ejemplo, a Descargas) y elegilo en la app.\necho   Copy MGSweb_datos.mgs to your phone (for example, to Downloads) and choose it in the app.\necho   Son tus datos, salen de tus discos: no los subas ni los compartas.\necho   This is your own data, made from your discs: please do not upload or share it.\n:fin\necho.\npause\n'
JUGAR_RED = '@echo off\nchcp 65001 >nul\ntitle MGS web - ABIERTO A LA RED / OPEN TO THE NETWORK (cerra esta ventana para apagarlo / close this window to stop it)\ncolor 0E\ncd /d "%~dp0"\nif not defined MGS_PUERTO set "MGS_PUERTO=__PUERTO__"\nif not exist "datos\\discos.json" ( call "%~dp0INSTALAR.cmd" & exit /b )\necho.\necho   ==================================================================\necho    [ CODEC ]   FREQ 140.85                     PTT  ##############\necho   ==================================================================\necho.\necho   [ ! ]  ABIERTO A TU RED / OPEN TO YOUR NETWORK\necho   Mientras esta ventana este abierta, cualquiera en esta misma red puede entrar al juego.\necho   While this window is open, anyone on this same network can open the game.\necho   Usalo en la red de tu casa, no en un wifi publico. / Use it on your home network, not on public wifi.\necho.\necho   Si Windows pregunta por el firewall, permiti solo "Redes privadas".\necho   If Windows asks about the firewall, allow "Private networks" only.\necho.\necho   La primera vez el navegador avisa que la conexion no es privada: el certificado lo crea tu propia PC.\necho   Toca "Avanzado" y "Continuar". / The first time, the browser warns that the connection is not private:\necho   the certificate is made by your own PC. Tap "Advanced" and "Proceed".\necho.\necho   ------------------------------------------------------------------\n"%~dp0node\\node.exe" "%~dp0app\\tools\\servidor.mjs" %MGS_PUERTO% "%~dp0app\\visor" --assets "%~dp0datos" --red --cert "%~dp0config"\npause\n'.replace('__PUERTO__', str(PUERTO))
CASCO = '@echo off\nchcp 65001 >nul\ntitle MGS web - casco por USB (Meta Quest / Pico)\ncolor 0A\ncd /d "%~dp0"\necho.\necho   Jugar en el casco (Meta Quest o Pico) con el cable USB / Play on the headset over USB\necho   -------------------------------------------------------------------------------------\necho   1. El casco en modo desarrollador y conectado por USB (acepta el permiso en el casco).\necho      Headset in developer mode, connected over USB (accept the prompt in the headset).\necho   2. JUGAR.cmd abierto en esta PC. / JUGAR.cmd running on this PC.\necho   3. En el navegador del casco / In the headset browser:  http://127.0.0.1:__PUERTO__/\necho.\nset "ADB="\nif exist "%~dp0adb\\adb.exe" set "ADB=%~dp0adb\\adb.exe"\nif not defined ADB for %%a in (adb.exe) do if not "%%~$PATH:a"=="" set "ADB=%%~$PATH:a"\nif not defined ADB (\n  echo   Falta adb ^(Android Platform Tools^): no viene en este paquete. Es gratis, de Google:\n  echo   adb ^(Android Platform Tools^) is missing: it is not included. It is free, from Google:\n  echo   https://developer.android.com/tools/releases/platform-tools\n  echo   Copia adb.exe, AdbWinApi.dll y AdbWinUsbApi.dll en la carpeta "adb" al lado de este archivo.\n  echo   Copy adb.exe, AdbWinApi.dll and AdbWinUsbApi.dll into the "adb" folder next to this file.\n  echo   ^(Meta Quest Developer Hub ya trae adb. / Meta Quest Developer Hub already includes adb.^)\n  pause & exit /b 1\n)\n"%ADB%" devices\n"%ADB%" reverse tcp:__PUERTO__ tcp:__PUERTO__ && (\n  echo.\n  echo   Listo: en el casco abri http://127.0.0.1:__PUERTO__/\n  echo   Done: open http://127.0.0.1:__PUERTO__/ in the headset browser\n) || echo   No encontre el casco: revisa el cable y el permiso de depuracion USB. / Headset not found: check the cable and USB debugging.\npause\n'.replace('__PUERTO__', str(PUERTO))
LEEME = '==================================================================\n [ CODEC ]   FREQ 140.85                     PTT  ##############\n==================================================================\n\n      S  H  A  D  O  W     M  O  S  E  S     ::     W  E  B\n\n Shadow Moses en el navegador / in your browser\n https://mgs.ravenlight.net/\n------------------------------------------------------------------\nProyecto de fans, sin fines de lucro. Metal Gear Solid es una marca de Konami; este proyecto no tiene relación con Konami.\nEste paquete NO trae ningún archivo del juego: usa TUS discos de Metal Gear Solid (PlayStation, versión USA).\n\n[TX-01] OPERACIÓN: INSTALAR (3 pasos)\n1. Descomprimí esta carpeta donde quieras (hacen falta unos 3 GB libres).\n2. Doble clic en INSTALAR.cmd y elegí tus discos: el .cue (o el .bin) del disco 1 y del disco 2.\n   Convierte todo en tu PC (de 5 a 8 minutos). Si se corta, abrí INSTALAR.cmd de nuevo y sigue.\n   Sin el disco 2 se juega hasta el cambio de disco.\n3. Se abre el navegador y listo. Las próximas veces: el acceso directo "Metal Gear Solid web" del Escritorio (o JUGAR.cmd).\n   La ventana negra es el servidor: dejala abierta mientras jugás. Solo atiende a esta PC.\n\n[TX-02] CASCO VR (Meta Quest / Pico)\n- Desde la PC: con Quest Link, Air Link o Virtual Desktop, abrí http://127.0.0.1:8123/ en Chrome o Edge.\n- Con el navegador del casco y el cable USB: corré CASCO_USB.cmd (necesita adb, ahí te dice cómo conseguirlo).\n\n[TX-03] CELULAR U OTRA PC, POR WIFI\nAbrí JUGAR_EN_RED.cmd en la PC y entrá desde el otro aparato a la dirección que te muestra (la PC tiene que quedar prendida\ny en la misma red). La primera vez el navegador avisa que la conexión no es privada, porque el certificado lo crea tu propia\nPC: tocá "Avanzado" y "Continuar". Mientras esa ventana esté abierta, cualquiera en esa red puede entrar: usalo en tu casa,\nno en un wifi público.\n\n[TX-04] APP DE CELULAR (ANDROID)\n1. Instalá el juego en la PC con INSTALAR.cmd y hacé doble clic en ARMAR_ARCHIVO_CELULAR.cmd: arma MGSweb_datos.mgs (cerca de 1 GB).\n2. Bajá ShadowMoses_celular.apk de https://github.com/vjravenlight/shadow-moses-web/releases/latest e instalala en el celular\n   (Android te va a pedir permiso para instalar apps de fuera de la tienda).\n3. Copiá MGSweb_datos.mgs al celular (por ejemplo, a Descargas), abrí la app y elegilo. Después no hace falta la PC ni internet.\n\n[TX-01] OPERATION: INSTALL (3 steps)\n1. Unzip this folder anywhere (about 3 GB free space needed).\n2. Double-click INSTALAR.cmd and choose your discs: the .cue (or .bin) of disc 1 and disc 2 (USA version).\n   Everything is converted on your PC (5 to 8 minutes). If it stops, open INSTALAR.cmd again to resume.\n   Without disc 2 you can play up to the disc change.\n3. Your browser opens. Next times: the "Metal Gear Solid web" shortcut on the Desktop (or JUGAR.cmd).\n   Keep the black server window open while playing. It only serves this PC.\nVR: Quest Link / Air Link / Virtual Desktop with Chrome or Edge on the PC, or CASCO_USB.cmd for the headset browser over USB.\nPhone or another PC over wifi: open JUGAR_EN_RED.cmd on the PC and go to the address it shows, from the same network. The\nfirst time, the browser warns that the connection is not private, because your own PC makes the certificate: tap "Advanced"\nand "Proceed". While that window is open, anyone on that network can get in: use it at home, not on public wifi.\n\nAndroid phone app: run ARMAR_ARCHIVO_CELULAR.cmd on the PC, install ShadowMoses_celular.apk from the Releases page, copy\nMGSweb_datos.mgs to the phone and choose it in the app. After that it needs neither the PC nor the internet.\n\nIncluye / Includes: Node.js, Python (con numpy y Pillow) y FFmpeg, con sus licencias en runtime/ y node/.\nFFmpeg es software libre (GPL v3). Su código fuente / Source code: https://ffmpeg.org/download.html#get-sources\n(compilación "essentials" de https://www.gyan.dev/ffmpeg/builds/ ; detalle en runtime/ffmpeg/CODIGO_FUENTE.txt).\nLos nombres de funciones y tablas del conversor (tools/names.txt, tools/tablas_ref.json) salen del proyecto de la\ncomunidad FoxdieTeam/mgs_reversing: https://github.com/FoxdieTeam/mgs_reversing\n\nFeniXVOID · Project Ravenlight\n'
FFMPEG_FUENTE = 'FFmpeg — licencia y código fuente / license and source code\n==========================================================\nffmpeg.exe es la compilación "essentials" de gyan.dev (https://www.gyan.dev/ffmpeg/builds/), con licencia GPL v3\n(ver LICENSE.txt). No se modificó.\nffmpeg.exe is the gyan.dev "essentials" build, licensed GPL v3 (see LICENSE.txt). It was not modified.\n\nCódigo fuente / Source code:\n- FFmpeg: https://ffmpeg.org/download.html#get-sources  (git: https://git.ffmpeg.org/ffmpeg.git)\n- La compilación y sus bibliotecas / The build and its libraries: https://www.gyan.dev/ffmpeg/builds/\nVersión / Version: ver README.txt o correr / see README.txt or run: ffmpeg -version\n'

def armar():
    if os.path.exists(SALIDA):
        shutil.rmtree(SALIDA)
    app = os.path.join(SALIDA, 'app')
    copiar_arbol(os.path.join(RAIZ, 'visor'), os.path.join(app, 'visor'), VISOR_FUERA)
    for x in ASSETS_PROPIOS:
        o = os.path.join(RAIZ, 'visor', 'assets', x)
        d = os.path.join(app, 'base', x)
        if not os.path.exists(o):
            o = os.path.join(RAIZ, 'app_base', x)
        if os.path.isdir(o):
            copiar_arbol(o, d)
        else:
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copy2(o, d)
    os.makedirs(os.path.join(app, 'tools'))
    for t in TOOLS:
        if os.path.exists(os.path.join(RAIZ, 'tools', t + '.py')):
            shutil.copy2(os.path.join(RAIZ, 'tools', t + '.py'), os.path.join(app, 'tools', t + '.py'))
        else:
            print('  ! falta tools/%s.py' % t)
    for t in TOOLS_DATOS:
        if os.path.exists(os.path.join(RAIZ, 'tools', t)):
            shutil.copy2(os.path.join(RAIZ, 'tools', t), os.path.join(app, 'tools', t))
    py = os.path.join(SALIDA, 'runtime', 'python')
    copiar_arbol(PYTHON, py, PY_FUERA + ['Doc', 'Scripts', 'include', 'libs', 'NEWS.txt'])
    sp = os.path.join(py, 'Lib', 'site-packages')
    os.makedirs(sp, exist_ok=True)
    for pat in PY_PAQUETES:
        for n in fnmatch.filter(os.listdir(SITE), pat):
            o = os.path.join(SITE, n)
            if os.path.isdir(o):
                copiar_arbol(o, os.path.join(sp, n), ['tests', '__pycache__', '*.pyi'])
            else:
                shutil.copy2(o, os.path.join(sp, n))
    ff = os.path.join(SALIDA, 'runtime', 'ffmpeg')
    os.makedirs(ff)
    exe = real(FFMPEG)
    shutil.copy2(exe, os.path.join(ff, 'ffmpeg.exe'))
    for lic in ('LICENSE', 'LICENSE.txt', 'README.txt'):
        for d in (os.path.dirname(exe), os.path.dirname(os.path.dirname(exe))):
            p = os.path.join(d, lic)
            if os.path.exists(p):
                shutil.copy2(p, os.path.join(ff, lic + ('.txt' if '.' not in lic else '')))
                break
    escribir(os.path.join('runtime', 'ffmpeg', 'CODIGO_FUENTE.txt'), FFMPEG_FUENTE)
    os.makedirs(os.path.join(SALIDA, 'node'))
    shutil.copy2(NODE, os.path.join(SALIDA, 'node', 'node.exe'))
    for lic in ('LICENSE',):
        p = os.path.join(os.path.dirname(NODE), lic)
        if os.path.exists(p):
            shutil.copy2(p, os.path.join(SALIDA, 'node', 'LICENSE.txt'))
    os.makedirs(os.path.join(SALIDA, 'adb'))
    escribir('INSTALAR.cmd', INSTALAR)
    escribir('JUGAR.cmd', JUGAR)
    escribir('JUGAR_EN_RED.cmd', JUGAR_RED)
    escribir('ARMAR_ARCHIVO_CELULAR.cmd', ARCHIVO_CELULAR)
    escribir('CASCO_USB.cmd', CASCO)
    escribir('LEEME.txt', LEEME)
    escribir(os.path.join('adb', 'PONER_ADB_ACA.txt'), 'adb.exe, AdbWinApi.dll, AdbWinUsbApi.dll (Android Platform Tools)\n')
    partes = {'app/visor': tam(os.path.join(app, 'visor')), 'app/tools': tam(os.path.join(app, 'tools')), 'app/base': tam(os.path.join(app, 'base')), 'runtime/python': tam(py), 'runtime/ffmpeg': tam(ff), 'node': tam(os.path.join(SALIDA, 'node'))}
    total = tam(SALIDA)
    print('Listo: %s (%.0f MB)' % (SALIDA, total / 1048576))
    for k, v in partes.items():
        print('  %-15s %6.1f MB' % (k, v / 1048576))
    if '--sin-zip' not in sys.argv:
        zipruta = os.path.join(os.path.dirname(SALIDA), 'MGSweb_v%s.zip' % VERSION)
        with zipfile.ZipFile(zipruta, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for raiz, _, archivos in os.walk(SALIDA):
                for a in archivos:
                    p = os.path.join(raiz, a)
                    z.write(p, os.path.join('MGSweb', os.path.relpath(p, SALIDA)))
        print('Zip: %s (%.0f MB)' % (zipruta, os.path.getsize(zipruta) / 1048576))

def solo_cmd():
    escribir('INSTALAR.cmd', INSTALAR)
    escribir('JUGAR.cmd', JUGAR)
    escribir('JUGAR_EN_RED.cmd', JUGAR_RED)
    escribir('ARMAR_ARCHIVO_CELULAR.cmd', ARCHIVO_CELULAR)
    escribir('CASCO_USB.cmd', CASCO)
    escribir('LEEME.txt', LEEME)
    print('cmd reescritos en', SALIDA)
if __name__ == '__main__':
    solo_cmd() if '--solo-cmd' in sys.argv else armar()
