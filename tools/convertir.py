# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, time, shutil, argparse, subprocess
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..'))
sys.path.insert(0, AQUI)
import disco as D
P = sys.executable
PASOS = [('extraer1', 'Leyendo el disco 1 / Reading disc 1', None, '1', 8), ('extraer2', 'Leyendo el disco 2 / Reading disc 2', None, '2', 27), ('stages1', 'Separando los escenarios del disco 1 / Splitting disc 1 stages', ['stage_extract.py', 'disco1'], '1', 34), ('stages2', 'Separando los escenarios del disco 2 / Splitting disc 2 stages', ['stage_extract.py', 'disco2'], '2', 46), ('categorizar', 'Ordenando archivos / Sorting files', ['categorizar.py'], '12', 62), ('categorizar2', 'Ordenando archivos del disco 2 / Sorting disc 2 files', ['categorizar.py', '--solo', 'disco2', '--salida', '_02_por_tipo_solo_disco2'], '2', 62), ('modelos', 'Modelos 3D y escenarios / 3D models and maps', ['exportar_todo.py'], '12', 122), ('niveles', 'Niveles / Levels', ['niveles.py'], '1', 92), ('pisos', 'Pisos / Floors', ['pisos_atr.py'], '1', 2), ('paredes', 'Paredes que se rompen / Breakable walls', ['paredes_rompibles.py'], '1', 2), ('camaras', 'Cámaras del juego / Game cameras', ['camaras_export.py'], '1', 6), ('caras', 'Caras de los modelos / Model faces', ['caras_ps1.py'], '1', 3), ('puertas', 'Puertas y tarjetas / Doors and cards', ['puertas_tarjeta.py'], '1', 2), ('zako', 'Soldados / Soldiers', ['zako_export.py'], '1', 6), ('sonido', 'Música y efectos / Music and sound effects', ['sonido.py'], '1', 2), ('anims', 'Animaciones / Animations', ['anims.py'], '1', 2), ('titulo', 'Pantalla de título / Title screen', ['titulo_export.py'], '1', 2), ('hud', 'Pantalla de juego (HUD) / HUD', ['hud_indices.py'], '1', 2), ('inventario', 'Inventario / Inventory', ['iconos_inventario.py'], '1', 2), ('hud_extra', 'Pantalla de juego: letras y radar / HUD: fonts and radar', ['hud_extra.py'], '1', 2), ('fuente', 'Letras del juego / Game fonts', ['fuente_web.py'], '1', 2), ('mira', 'Mira / Scope', ['sgt_export.py'], '1', 2), ('rango', 'Rango final / Final rank', ['rango_export.py'], '1', 2), ('radio', 'Códec: llamadas / Codec: calls', ['radio_dat.py'], '12', 6), ('caras_codec', 'Códec: caras / Codec: faces', ['face_dat.py'], '1', 4), ('codec', 'Códec: pantalla / Codec: screen', ['codec_web.py'], '1', 6), ('vox_refs', 'Voces: lista / Voices: list', ['vox.py', 'refs'], '1', 10), ('voces', 'Voces del códec (es lo que más tarda) / Codec voices (the longest step)', ['codec_voces.py'], '1', 219), ('codec_niveles', 'Códec por escenario / Codec per stage', ['codec_niveles.py'], '1', 4), ('guion', 'Guion de cada escenario / Stage scripts', ['guion_vivo.py'], '1', 6), ('guion_extra', 'Guion del título y la intro / Title and intro scripts', ['guion_vivo.py', 'init', 'init_tux', 'opening'], '1', 10), ('guion2', 'Guion del disco 2 / Disc 2 scripts', ['guion_disco2.py', '--en-el-lugar'], '2', 6), ('voces2', 'Voces del disco 2 / Disc 2 voices', ['voces_disco2.py'], '2', 158), ('paddemo', 'Demos de mando / Pad demos', ['paddemo_export.py'], '1', 14), ('partida', 'Partida e ítems / Game state and items', ['partida_items.py'], '1', 3), ('presets', 'Puntos de la historia / Story checkpoints', ['presets_historia.py'], '1', 2), ('trampas', 'Zonas del guion / Script zones', ['trampas_13.py', '--aplicar'], '12', 2), ('anims_st', 'Animaciones de Snake por escenario / Snake animations per stage', ['anims.py', 'escenarios'], '1', 4), ('actores', 'Objetos y actores / Props and actors', ['actores_export.py'], '1', 3), ('personajes', 'Personajes / Characters', ['personajes_export.py'], '1', 15), ('jefes', 'Jefes / Bosses', ['jefes_export.py'], '1', 12), ('liquid', 'Jefe: Liquid / Boss: Liquid', ['liquid_export.py'], '1', 4), ('ninja', 'Jefe: Ninja / Boss: Ninja', ['ninja_export.py'], '1', 2), ('rex', 'Jefe: REX / Boss: REX', ['rex_export.py'], '1', 3), ('wolf', 'Jefe: Wolf / Boss: Wolf', ['wolf_export.py'], '1', 2), ('jeep', 'La persecución en jeep / Jeep chase', ['jeep_export.py', '--voces'], '1', 4), ('jeep19a', 'Jeep (s19a) / Jeep (s19a)', ['jeep19a_export.py'], '1', 2), ('voces_extra', 'Voces sueltas (título, s19a) / Extra voices', ['codec_voces.py', '--solo', '80445,80464,80475,80490,80505,80521,80546,80562,80574,80585,80597,94672'], '1', 15), ('demos_lista', 'Cinemáticas: lista / Cutscenes: list', ['demo_dat.py', 'scripts'], '12', 3), ('demos', 'Cinemáticas del disco 1 / Disc 1 cutscenes', ['demos_export.py', '--todas'], '1', 346), ('demos2', 'Cinemáticas del disco 2 / Disc 2 cutscenes', ['demos_export.py', '--disco', '2', '--todas'], '2', 231), ('cadenas', 'Orden de las cinemáticas / Cutscene order', ['demos_cadenas.py'], '1', 3), ('creditos', 'Créditos / Credits', ['creditos_export.py'], '2', 3), ('videos', 'Videos / Videos', ['videos_export.py'], '12', 90), ('telops', 'Textos de las cinemáticas / Cutscene captions', ['telops_nitidos.py'], '1', 3), ('vr', 'VR Training', ['vr_export.py'], '1', 9), ('vr_fondo', 'VR Training: fondo / background', ['vr_fondo.py'], '1', 2), ('vr_menu', 'VR Training: menú / menu', ['vr_menu.py'], '1', 2), ('vr_camaras', 'VR Training: cámaras / cameras', ['vr_camaras.py'], '1', 3), ('sueltos', 'Armas e íconos / Weapons and icons', ['sueltos_export.py'], '1', 2), ('propios', 'Archivos propios del visor / Viewer files', None, '1', 2)]

def hms(s):
    s = int(max(0, s))
    if s >= 3600:
        return '%d h %02d min' % (s // 3600, s % 3600 // 60)
    if s >= 60:
        return '%d min' % (s // 60)
    return '%d s' % s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--disco1')
    ap.add_argument('--disco2')
    ap.add_argument('--trabajo', default=os.path.join(RAIZ, 'trabajo'))
    ap.add_argument('--assets', default=os.path.join(RAIZ, 'datos'))
    ap.add_argument('--base')
    ap.add_argument('--procesos', type=int, default=0)
    ap.add_argument('--lista', action='store_true')
    ap.add_argument('--validar', action='store_true')
    ap.add_argument('--solo')
    ap.add_argument('--desde')
    ap.add_argument('--rehacer', action='store_true')
    a = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass
    if a.lista:
        for i, (pid, txt, cmd, dk, seg) in enumerate(PASOS, 1):
            print('%2d %-14s %-3s %6s  %s' % (i, pid, dk, hms(seg), txt))
        return 0
    trabajo, assets = (os.path.abspath(a.trabajo), os.path.abspath(a.assets))
    if os.path.normcase(assets) == os.path.normcase(os.path.join(RAIZ, 'visor', 'assets')) and (not os.environ.get('MGS_PISAR_ASSETS')):
        print('No escribo en visor/assets/ de esta carpeta (usá otra salida). / Refusing to write into visor/assets/.')
        return 2
    extraido = os.path.join(trabajo, 'extraido')
    for d in (trabajo, extraido, assets, os.path.join(trabajo, 'registro'), os.path.join(trabajo, 'docs', 'codec'), os.path.join(trabajo, 'docs', 'demo')):
        os.makedirs(d, exist_ok=True)
    pe = os.path.join(trabajo, 'estado.json')
    estado = json.load(open(pe, encoding='utf-8')) if os.path.exists(pe) else {'pasos': {}, 'discos': {}}

    def guardar():
        json.dump(estado, open(pe, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    imagenes = {}
    for n, ruta in ((1, a.disco1), (2, a.disco2)):
        if not ruta:
            continue
        try:
            im = D.Imagen(ruta)
            cual, avisos = im.cual()
        except D.ErrorDisco as e:
            print('\n  Disco %d: %s\n  (%s)' % (n, e, ruta))
            return 3
        if cual != n:
            print('\n  Ese archivo es el DISCO %d, no el %d. / That file is DISC %d, not %d.\n  (%s)' % (cual, n, cual, n, ruta))
            return 3
        for x in avisos:
            print('  ' + x)
        imagenes[n] = im
    if 1 not in imagenes and (not estado['discos'].get('1')):
        print('  Falta el disco 1. / Disc 1 is missing.')
        return 3
    if a.validar:
        print('  Discos OK: %s / Discs OK' % ', '.join((str(k) for k in sorted(imagenes))))
        return 0
    huellas = {str(n): D.huella(im.ruta) for n, im in imagenes.items()}
    for n, h in huellas.items():
        if estado['discos'].get(n) and estado['discos'][n] != h:
            estado['pasos'] = {}
        estado['discos'][n] = h
    hay2 = bool(estado['discos'].get('2'))
    if hay2 and (not estado.get('con_disco2')) and any((v.get('ok') for k, v in estado['pasos'].items() if k not in ('extraer1', 'stages1'))):
        print('  Se agregó el disco 2: se rehace la conversión (lo leído del disco 1 queda). / Disc 2 added: converting again.')
        estado['pasos'] = {k: v for k, v in estado['pasos'].items() if k in ('extraer1', 'stages1')}
    estado['con_disco2'] = hay2
    guardar()
    env = dict(os.environ)
    env.update(MGS_EXTRAIDO=extraido, MGS_ASSETS=assets, MGS_DOCS=os.path.join(trabajo, 'docs'), MGS_PRUEBAS=os.path.join(trabajo, 'copias'), MGS_EXE=os.path.join(extraido, 'disco1', '00_disco', 'SLUS_005.94'), PYTHONUTF8='1', PYTHONIOENCODING='utf-8', PYTHONNOUSERSITE='1', PYTHONDONTWRITEBYTECODE='1')
    env.pop('PYTHONPATH', None)
    env.pop('PYTHONHOME', None)
    elegidos = [p for p in PASOS]
    if a.solo:
        elegidos = [p for p in PASOS if p[0] in a.solo.split(',')]
    if a.desde:
        elegidos = PASOS[[p[0] for p in PASOS].index(a.desde):]
    hacer = []
    for p in elegidos:
        pid, dk = (p[0], p[3])
        if dk == '2' and (not hay2):
            continue
        if estado['pasos'].get(pid, {}).get('ok') and (not a.rehacer) and (not a.solo):
            continue
        hacer.append(p)
    total_est = sum((p[4] for p in hacer))
    print('\n  %d pasos, unos %s en total (según una PC de 4 núcleos; se ajusta solo). / %d steps, about %s.' % (len(hacer), hms(total_est), len(hacer), hms(total_est)))
    if not hay2:
        print('  Sin el disco 2: se juega hasta el cambio de disco. / Without disc 2: playable up to the disc change.')
    t_ini = time.time()
    est_hecho = 0
    for k, (pid, txt, cmd, dk, seg) in enumerate(hacer, 1):
        resto = sum((p[4] for p in hacer[k - 1:]))
        factor = min(3.0, max(0.5, (time.time() - t_ini) / est_hecho)) if est_hecho >= 120 else 1.0
        print('\n  [%d/%d] %s   (faltan ~%s / ~%s left)' % (k, len(hacer), txt, hms(resto * factor), hms(resto * factor)), flush=True)
        t0 = time.time()
        log = os.path.join(trabajo, 'registro', pid + '.txt')
        try:
            if pid in ('extraer1', 'extraer2'):
                n = int(pid[-1])
                im = imagenes.get(n)
                if im is None:
                    if estado['pasos'].get(pid, {}).get('ok'):
                        continue
                    print('  Falta el archivo del disco %d. / Disc %d file missing.' % (n, n))
                    return 3
                ultimo = [0]

                def avance(h, t):
                    if time.time() - ultimo[0] > 5:
                        ultimo[0] = time.time()
                        print('      %3d %%' % (100 * h // max(1, t)), flush=True)
                im.extraer(os.path.join(extraido, 'disco%d' % n, '00_disco'), avance)
                rc = 0
            elif pid == 'propios':
                rc = copiar_propios(a.base, assets, hay2)
            else:
                c = list(cmd)
                if pid == 'voces' and a.procesos:
                    c += ['--procesos', str(a.procesos)]
                if pid == 'videos' and (not hay2):
                    c += ['--disco', '1']
                with open(log, 'w', encoding='utf-8') as fl:
                    pr = subprocess.Popen([P, os.path.join(AQUI, c[0])] + c[1:], cwd=RAIZ, env=env, stdout=fl, stderr=subprocess.STDOUT)
                    ultimo = time.time()
                    while pr.poll() is None:
                        time.sleep(1)
                        if time.time() - ultimo >= 60:
                            ultimo = time.time()
                            print('      ... %s (estimado %s / estimated)' % (hms(time.time() - t0), hms(seg * factor)), flush=True)
                    rc = pr.returncode
        except KeyboardInterrupt:
            print('\n  Cortado. Volvé a correr INSTALAR.cmd para seguir desde acá. / Stopped. Run INSTALAR.cmd again to resume.')
            return 130
        dur = time.time() - t0
        if rc != 0:
            print('\n  ERROR en el paso "%s" (código %s). Detalle en / details in:\n  %s' % (pid, rc, log))
            try:
                for l in open(log, encoding='utf-8', errors='replace').read().splitlines()[-15:]:
                    print('    ' + l)
            except OSError:
                pass
            print('  Volvé a correr INSTALAR.cmd para reintentar desde este paso. / Run INSTALAR.cmd again to retry from this step.')
            estado['pasos'][pid] = {'ok': False, 'seg': round(dur)}
            guardar()
            return 4
        estado['pasos'][pid] = {'ok': True, 'seg': round(dur)}
        guardar()
        est_hecho += seg
        print('      listo en %s / done' % hms(dur), flush=True)
    json.dump({'disco1': True, 'disco2': hay2, 'generado': time.strftime('%Y-%m-%d %H:%M')}, open(os.path.join(assets, 'discos.json'), 'w', encoding='utf-8'))
    print('\n  Conversión terminada en %s. / Conversion finished.' % hms(time.time() - t_ini))
    return 0

def copiar_propios(base, assets, hay2):
    if not base or not os.path.isdir(base):
        return 0
    for r, _, fs in os.walk(base):
        for f in fs:
            o = os.path.join(r, f)
            d = os.path.join(assets, os.path.relpath(o, base))
            os.makedirs(os.path.dirname(d), exist_ok=True)
            shutil.copy2(o, d)
    return 0
if __name__ == '__main__':
    sys.exit(main())
