# MGS web — FeniXVOID · Project Ravenlight
import os, sys, json, time, shutil, argparse, subprocess
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..'))
sys.path.insert(0, AQUI)
import disco as D
UNIX = os.path.isdir(os.path.join(AQUI, 'unix'))
INSTALADOR = 'sh instalar.sh' if UNIX else 'INSTALAR.cmd'
P = sys.executable
PASOS = [('extraer1', 'Leyendo el disco 1 / Reading disc 1', None, '1', 12), ('extraer2', 'Leyendo el disco 2 / Reading disc 2', None, '2', 12), ('stages1', 'Separando los escenarios del disco 1 / Splitting disc 1 stages', ['stage_extract.py', 'disco1'], '1', 74), ('stages2', 'Separando los escenarios del disco 2 / Splitting disc 2 stages', ['stage_extract.py', 'disco2'], '2', 74), ('categorizar', 'Ordenando archivos / Sorting files', ['categorizar.py'], '12', 75), ('categorizar2', 'Ordenando archivos del disco 2 / Sorting disc 2 files', ['categorizar.py', '--solo', 'disco2', '--salida', '_02_por_tipo_solo_disco2'], '2', 86), ('modelos', 'Modelos 3D y escenarios / 3D models and maps', ['exportar_todo.py'], '12', 102), ('niveles', 'Niveles / Levels', ['niveles.py'], '1', 90), ('pisos', 'Pisos / Floors', ['pisos_atr.py'], '1', 3), ('paredes', 'Paredes que se rompen / Breakable walls', ['paredes_rompibles.py'], '1', 3), ('camaras', 'Cámaras del juego / Game cameras', ['camaras_export.py'], '1', 9), ('caras', 'Caras de los modelos / Model faces', ['caras_ps1.py'], '1', 4), ('puertas', 'Puertas y tarjetas / Doors and cards', ['puertas_tarjeta.py'], '1', 4), ('zako', 'Soldados / Soldiers', ['zako_export.py'], '1', 21), ('sonido', 'Música y efectos / Music and sound effects', ['sonido.py'], '1', 2), ('anims', 'Animaciones / Animations', ['anims.py'], '1', 2), ('titulo', 'Pantalla de título / Title screen', ['titulo_export.py'], '1', 2), ('hud', 'Pantalla de juego (HUD) / HUD', ['hud_indices.py'], '1', 2), ('inventario', 'Inventario / Inventory', ['iconos_inventario.py'], '1', 2), ('hud_extra', 'Pantalla de juego: letras y radar / HUD: fonts and radar', ['hud_extra.py'], '1', 2), ('fuente', 'Letras del juego / Game fonts', ['fuente_web.py'], '1', 2), ('mira', 'Mira / Scope', ['sgt_export.py'], '1', 2), ('rango', 'Rango final / Final rank', ['rango_export.py'], '1', 2), ('radio', 'Códec: llamadas / Codec: calls', ['radio_dat.py'], '12', 9), ('caras_codec', 'Códec: caras / Codec: faces', ['face_dat.py'], '1', 8), ('codec', 'Códec: pantalla / Codec: screen', ['codec_web.py'], '1', 9), ('vox_refs', 'Voces: lista / Voices: list', ['vox.py', 'refs'], '1', 12), ('voces', 'Voces del códec / Codec voices', ['codec_voces.py'], '1', 20), ('codec_niveles', 'Códec por escenario / Codec per stage', ['codec_niveles.py'], '1', 8), ('guion', 'Guion de cada escenario / Stage scripts', ['guion_vivo.py'], '1', 26), ('guion_extra', 'Guion del título y la intro / Title and intro scripts', ['guion_vivo.py', 'init', 'init_tux', 'opening'], '1', 3), ('guion2', 'Guion del disco 2 / Disc 2 scripts', ['guion_disco2.py', '--en-el-lugar'], '2', 10), ('voces2', 'Voces del disco 2 / Disc 2 voices', ['voces_disco2.py'], '2', 15), ('paddemo', 'Demos de mando / Pad demos', ['paddemo_export.py'], '1', 16), ('partida', 'Partida e ítems / Game state and items', ['partida_items.py'], '1', 2), ('presets', 'Puntos de la historia / Story checkpoints', ['presets_historia.py'], '1', 2), ('trampas', 'Zonas del guion / Script zones', ['trampas_13.py', '--aplicar'], '12', 2), ('anims_st', 'Animaciones de Snake por escenario / Snake animations per stage', ['anims.py', 'escenarios'], '1', 4), ('actores', 'Objetos y actores / Props and actors', ['actores_export.py'], '1', 3), ('personajes', 'Personajes / Characters', ['personajes_export.py'], '1', 18), ('jefes', 'Jefes / Bosses', ['jefes_export.py'], '1', 10), ('liquid', 'Jefe: Liquid / Boss: Liquid', ['liquid_export.py'], '1', 4), ('ninja', 'Jefe: Ninja / Boss: Ninja', ['ninja_export.py'], '1', 3), ('rex', 'Jefe: REX / Boss: REX', ['rex_export.py'], '1', 6), ('wolf', 'Jefe: Wolf / Boss: Wolf', ['wolf_export.py'], '1', 4), ('jeep', 'La persecución en jeep / Jeep chase', ['jeep_export.py', '--voces'], '1', 12), ('jeep19a', 'Jeep (s19a) / Jeep (s19a)', ['jeep19a_export.py'], '1', 2), ('voces_extra', 'Voces sueltas (título, s19a) / Extra voices', ['codec_voces.py', '--solo', '80445,80464,80475,80490,80505,80521,80546,80562,80574,80585,80597,94672'], '1', 2), ('demos_lista', 'Cinemáticas: lista / Cutscenes: list', ['demo_dat.py', 'scripts'], '12', 6), ('demos', 'Cinemáticas del disco 1 / Disc 1 cutscenes', ['demos_export.py', '--todas'], '1', 96), ('demos2', 'Cinemáticas del disco 2 / Disc 2 cutscenes', ['demos_export.py', '--disco', '2', '--todas'], '2', 58), ('cadenas', 'Orden de las cinemáticas / Cutscene order', ['demos_cadenas.py'], '1', 10), ('creditos', 'Créditos / Credits', ['creditos_export.py'], '2', 3), ('videos', 'Videos / Videos', ['videos_export.py'], '12', 148), ('telops', 'Textos de las cinemáticas / Cutscene captions', ['telops_nitidos.py'], '1', 10), ('vr', 'VR Training', ['vr_export.py'], '1', 21), ('vr_fondo', 'VR Training: fondo / background', ['vr_fondo.py'], '1', 2), ('vr_menu', 'VR Training: menú / menu', ['vr_menu.py'], '1', 2), ('vr_camaras', 'VR Training: cámaras / cameras', ['vr_camaras.py'], '1', 2), ('sueltos', 'Armas e íconos / Weapons and icons', ['sueltos_export.py'], '1', 2), ('propios', 'Archivos propios del visor / Viewer files', None, '1', 2)]
DEPENDE = {'extraer1': [], 'extraer2': [], 'stages1': ['extraer1'], 'stages2': ['extraer2'], 'categorizar': ['stages1', 'stages2'], 'categorizar2': ['stages2'], 'modelos': ['categorizar'], 'niveles': ['stages1'], 'pisos': ['niveles'], 'paredes': ['pisos'], 'camaras': ['paredes'], 'caras': ['camaras'], 'puertas': ['caras'], 'zako': ['puertas'], 'sonido': ['stages1'], 'anims': ['zako'], 'titulo': ['stages1'], 'hud': ['stages1'], 'inventario': ['hud'], 'hud_extra': ['inventario'], 'fuente': ['hud_extra'], 'mira': ['categorizar'], 'rango': ['stages1'], 'radio': ['stages1', 'stages2'], 'caras_codec': ['extraer1'], 'codec': ['radio', 'caras_codec'], 'vox_refs': ['radio'], 'voces': ['vox_refs'], 'codec_niveles': ['zako', 'codec'], 'guion': ['codec_niveles'], 'guion_extra': ['guion'], 'guion2': ['guion_extra', 'stages2'], 'voces2': ['guion2', 'codec', 'voces'], 'paddemo': ['stages1'], 'partida': ['voces2'], 'presets': ['partida'], 'trampas': ['presets', 'categorizar', 'categorizar2'], 'anims_st': ['trampas', 'anims'], 'actores': ['zako'], 'personajes': ['voces'], 'jefes': ['personajes'], 'liquid': ['jefes'], 'ninja': ['liquid'], 'rex': ['ninja'], 'wolf': ['rex'], 'jeep': ['wolf'], 'jeep19a': ['jeep'], 'voces_extra': ['jeep19a'], 'demos_lista': ['stages1', 'stages2'], 'demos': ['demos_lista', 'modelos', 'zako', 'categorizar'], 'demos2': ['demos'], 'cadenas': ['demos2', 'zako'], 'creditos': ['stages2'], 'videos': ['extraer1', 'extraer2'], 'telops': ['demos2', 'zako'], 'vr': ['stages1'], 'vr_fondo': ['vr'], 'vr_menu': ['vr_fondo'], 'vr_camaras': ['vr_menu'], 'sueltos': ['vr_camaras', 'fuente', 'categorizar'], 'propios': ['sueltos']}
RAM_MINIMA = 500

def hms(s):
    s = int(max(0, s))
    if s >= 3600:
        return '%d h %02d min' % (s // 3600, s % 3600 // 60)
    if s >= 60:
        return '%d min' % (s // 60)
    return '%d s' % s

def revisar_dependencias():
    ids = [p[0] for p in PASOS]
    for pid, ds in DEPENDE.items():
        assert pid in ids, pid
        for d in ds:
            assert d in ids and ids.index(d) < ids.index(pid), (pid, d)

def dependencias(hacer):
    ids = [p[0] for p in PASOS]
    en = {p[0] for p in hacer}

    def directas(pid):
        k = ids.index(pid)
        return DEPENDE.get(pid, [ids[k - 1]] if k else [])

    def resolver(d, vistos):
        if d in en:
            return {d}
        out = set()
        for x in directas(d):
            if x not in vistos:
                vistos.add(x)
                out |= resolver(x, vistos)
        return out
    out = {}
    for p in hacer:
        r = set()
        for d in directas(p[0]):
            r |= resolver(d, {d})
        out[p[0]] = sorted(r, key=ids.index)
    return out

def prioridades(hacer, deps, est):
    hijos = {p[0]: [] for p in hacer}
    for q, ds in deps.items():
        for d in ds:
            hijos[d].append(q)
    memo = {}

    def r(pid):
        if pid not in memo:
            memo[pid] = est[pid] + max([r(h) for h in hijos[pid]] or [0])
        return memo[pid]
    return {p[0]: r(p[0]) for p in hacer}

def simular(pendientes, corriendo, deps, est, prio, maxpar):
    pend, fin, t = (list(pendientes), dict(corriendo), 0.0)
    while pend or fin:
        while len(fin) < maxpar:
            listos = [p for p in pend if all((d not in fin and d not in pend for d in deps[p]))]
            if not listos:
                break
            p = max(listos, key=lambda x: prio[x])
            pend.remove(p)
            fin[p] = t + est[p]
        if not fin:
            break
        q = min(fin, key=fin.get)
        t = fin.pop(q)
    return t

def ram_libre():
    try:
        import ctypes

        class Mem(ctypes.Structure):
            _fields_ = [('largo', ctypes.c_ulong), ('carga', ctypes.c_ulong)] + [(n, ctypes.c_ulonglong) for n in ('fis', 'fis_libre', 'pag', 'pag_libre', 'virt', 'virt_libre', 'ext')]
        m = Mem()
        m.largo = ctypes.sizeof(Mem)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)):
            return m.fis_libre // (1 << 20)
    except Exception:
        pass
    return None

class Tarea:

    def __init__(self, paso, t0):
        self.paso, self.t0, self.rc, self.pr, self.fl = (paso, t0, None, None, None)

    def lanzar_proceso(self, args, log, env):
        self.fl = open(log, 'w', encoding='utf-8')
        self.pr = subprocess.Popen(args, cwd=RAIZ, env=env, stdout=self.fl, stderr=subprocess.STDOUT)

    def lanzar_hilo(self, funcion):
        import threading

        def correr():
            try:
                self.rc = funcion()
            except Exception as e:
                print('  %s: %s' % (self.paso[0], e), flush=True)
                self.rc = 1
        self.hilo = threading.Thread(target=correr, daemon=True)
        self.hilo.start()

    def poll(self):
        if self.pr is not None:
            r = self.pr.poll()
            if r is not None and self.fl:
                self.fl.close()
                self.fl = None
            return r
        return None if self.hilo.is_alive() else self.rc if self.rc is not None else 1

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--disco1')
    ap.add_argument('--disco2')
    ap.add_argument('--trabajo', default=os.path.join(RAIZ, 'trabajo'))
    ap.add_argument('--assets', default=os.path.join(RAIZ, 'datos'))
    ap.add_argument('--base')
    ap.add_argument('--procesos', type=int, default=0, help='pasos a la vez (por defecto núcleos - 1, hasta 3; 1 = en fila)')
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
    maxpar = a.procesos if a.procesos > 0 else max(1, min(3, (os.cpu_count() or 2) - 1))
    revisar_dependencias()
    if a.lista:
        deps = dependencias(PASOS)
        for i, (pid, txt, cmd, dk, seg) in enumerate(PASOS, 1):
            print('%2d %-14s %-3s %6s  %s   <- %s' % (i, pid, dk, hms(seg), txt, ', '.join(deps[pid]) or '-'))
        est = {p[0]: p[4] for p in PASOS}
        print('\n  en fila: %s; con %d a la vez: ~%s' % (hms(sum(est.values())), maxpar, hms(simular([p[0] for p in PASOS], {}, deps, est, prioridades(PASOS, deps, est), maxpar))))
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
    if 1 not in imagenes and (not estado['discos'].get('1')) and (not a.validar):
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
    env.update(MGS_EXTRAIDO=extraido, MGS_ASSETS=assets, MGS_DOCS=os.path.join(trabajo, 'docs'), MGS_PRUEBAS=os.path.join(trabajo, 'copias'), MGS_EXE=os.path.join(extraido, 'disco1', '00_disco', 'SLUS_005.94'), PYTHONUTF8='1', PYTHONIOENCODING='utf-8', PYTHONNOUSERSITE='1', PYTHONDONTWRITEBYTECODE='1', MGS_PROCESOS=str(maxpar))
    env.pop('PYTHONPATH', None)
    env.pop('PYTHONHOME', None)
    if UNIX:
        env['PYTHONPATH'] = os.path.join(AQUI, 'unix')
        env.pop('PYTHONNOUSERSITE', None)
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
    deps = dependencias(hacer)
    est = {p[0]: p[4] for p in hacer}
    prio = prioridades(hacer, deps, est)
    total_est = simular([p[0] for p in hacer], {}, deps, est, prio, maxpar)
    print('\n  %d pasos, unos %s en total (según una PC de 4 núcleos; se ajusta solo). / %d steps, about %s.' % (len(hacer), hms(total_est), len(hacer), hms(total_est)))
    if maxpar > 1:
        print('  Hasta %d pasos a la vez. / Up to %d steps at a time.' % (maxpar, maxpar))
    if not hay2:
        print('  Sin el disco 2: se juega hasta el cambio de disco. / Without disc 2: playable up to the disc change.')

    def leer_disco(n):
        im = imagenes.get(n)
        if im is None:
            if estado['pasos'].get('extraer%d' % n, {}).get('ok'):
                return 0
            print('  Falta el archivo del disco %d. / Disc %d file missing.' % (n, n))
            return 3
        ultimo = [0]

        def avance(h, t):
            if time.time() - ultimo[0] > 5:
                ultimo[0] = time.time()
                print('      disco %d: %3d %%' % (n, 100 * h // max(1, t)), flush=True)
        im.extraer(os.path.join(extraido, 'disco%d' % n, '00_disco'), avance)
        return 0
    t_ini = time.time()
    pendientes = [p[0] for p in hacer]
    por_id = {p[0]: p for p in hacer}
    corriendo, hechos_real, hechos_est = ({}, 0.0, 0.0)
    error, k_arranque, ultimo_aviso = (None, 0, time.time())

    def factor():
        return min(3.0, max(0.5, hechos_real / hechos_est)) if hechos_est >= 120 else 1.0

    def faltan():
        f, ahora = (factor(), time.time())
        resto = {pid: max(1.0, est[pid] * f - (ahora - t.t0)) for pid, t in corriendo.items()}
        return simular(pendientes, resto, deps, {k: v * f for k, v in est.items()}, prio, maxpar)
    try:
        while pendientes or corriendo:
            if error is None:
                listos = sorted([p for p in pendientes if all((d not in pendientes and d not in corriendo for d in deps[p]))], key=lambda x: -prio[x])
                for pid in listos:
                    if len(corriendo) >= maxpar:
                        break
                    if corriendo:
                        libre = ram_libre()
                        if libre is not None and libre < RAM_MINIMA:
                            break
                    paso = por_id[pid]
                    txt, cmd = (paso[1], paso[2])
                    k_arranque += 1
                    f = hms(faltan())
                    print('\n  [%d/%d] %s   (faltan ~%s / ~%s left)' % (k_arranque, len(hacer), txt, f, f), flush=True)
                    pendientes.remove(pid)
                    t = Tarea(paso, time.time())
                    corriendo[pid] = t
                    if pid in ('extraer1', 'extraer2'):
                        t.lanzar_hilo(lambda n=int(pid[-1]): leer_disco(n))
                    elif pid == 'propios':
                        t.lanzar_hilo(lambda: copiar_propios(a.base, assets, hay2))
                    else:
                        c = list(cmd)
                        if pid == 'voces' and a.procesos:
                            c += ['--procesos', str(a.procesos)]
                        if pid == 'videos' and (not hay2):
                            c += ['--disco', '1']
                        t.lanzar_proceso([P, os.path.join(AQUI, c[0])] + c[1:], os.path.join(trabajo, 'registro', pid + '.txt'), env)
            if not corriendo:
                if pendientes and error is None:
                    error = (pendientes[0], 'dependencias')
                break
            time.sleep(0.25)
            for pid, t in list(corriendo.items()):
                rc = t.poll()
                if rc is None:
                    continue
                del corriendo[pid]
                dur = time.time() - t.t0
                if rc != 0:
                    estado['pasos'][pid] = {'ok': False, 'seg': round(dur)}
                    guardar()
                    if error is None:
                        error = (pid, rc)
                    continue
                estado['pasos'][pid] = {'ok': True, 'seg': round(dur)}
                guardar()
                hechos_real += dur
                hechos_est += est[pid]
                print('      listo: %s, %s / done' % (t.paso[1].split(' / ')[0], hms(dur)), flush=True)
            if corriendo and time.time() - ultimo_aviso >= 60:
                ultimo_aviso = time.time()
                f = hms(faltan())
                print('      ... %s: %s (faltan ~%s / ~%s left)' % (hms(time.time() - t_ini), ', '.join((corriendo[x].paso[1].split(' / ')[0] for x in corriendo)), f, f), flush=True)
            if error and corriendo and (time.time() - ultimo_aviso >= 5):
                ultimo_aviso = time.time()
                print('      (esperando que terminen los otros pasos / waiting for the other steps)', flush=True)
    except KeyboardInterrupt:
        for pid, t in corriendo.items():
            estado['pasos'][pid] = {'ok': False}
        guardar()
        print('\n  Cortado. Volvé a correr %s para seguir desde acá. / Stopped. Run %s again to resume.' % (INSTALADOR, INSTALADOR))
        return 130
    if error:
        pid, rc = error
        log = os.path.join(trabajo, 'registro', pid + '.txt')
        print('\n  ERROR en el paso "%s" (código %s). Detalle en / details in:\n  %s' % (pid, rc, log))
        try:
            for l in open(log, encoding='utf-8', errors='replace').read().splitlines()[-15:]:
                print('    ' + l)
        except OSError:
            pass
        print('  Volvé a correr %s para reintentar desde este paso. / Run %s again to retry from this step.' % (INSTALADOR, INSTALADOR))
        return 4
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
