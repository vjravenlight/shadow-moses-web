<p align="center"><img src="img/banner.jpg" alt="Shadow Moses web: el códec en 140.85"></p>

# Shadow Moses web

El clásico de sigilo de 1998 de PlayStation, rehecho para el navegador: en la PC, con joystick o con casco de realidad
virtual. Se juega con **tus propios discos** (versión USA): el instalador los convierte en tu PC.

<p align="center"><b>◀ 140.85 ▶</b> · <a href="https://mgs.ravenlight.net/">mgs.ravenlight.net</a> · <a href="README.en.md">English version</a></p>

> **Proyecto de fans, sin fines de lucro.** No trae ningún archivo del juego ni baja nada de internet: usa solo los
> archivos de los discos que elegís vos. Metal Gear Solid es una marca de Konami. Este proyecto no tiene relación con Konami.

<table>
<tr>
<td width="50%"><img src="img/cap_muelle.png" alt="El muelle, con el radar y los créditos del juego"><br><sub>El muelle, con el radar y los créditos del juego</sub></td>
<td width="50%"><img src="img/cap_codec_vr.png" alt="El códec en el casco"><br><sub>El códec, en el casco de realidad virtual</sub></td>
</tr>
</table>

## `TX-01` OPERACIÓN: INSTALAR

1. **Bajá el Release** (`MGSweb_v1.6.zip`, en [Releases](../../releases/latest)) y descomprimilo donde quieras.
2. **Doble clic en `INSTALAR.cmd`.**
3. **Elegí tus discos**: el `.cue` (o el `.bin`) del disco 1 y del disco 2. Los convierte en tu PC y se abre el juego
   en el navegador (`http://127.0.0.1:8123`). Tarda de 5 a 8 minutos; si se corta, abrí `INSTALAR.cmd` de nuevo y
   sigue desde donde quedó.

Las próximas veces: el acceso directo **Metal Gear Solid web** del Escritorio (o `JUGAR.cmd`). La ventana negra es el
servidor: dejala abierta mientras jugás. Solo atiende a tu PC.

## `TX-02` EQUIPO NECESARIO

- Windows 10 u 11 de 64 bits, unos 3 GB libres. No hay que instalar nada: Node, Python y FFmpeg vienen adentro.
- Tus discos de Metal Gear Solid para PlayStation, **versión USA** (SLUS-00594 y SLUS-00776), en `.bin/.cue`
  (o `.img` de 2352 bytes por sector). Un `.iso` de 2048 bytes no sirve: le faltan las voces y los videos.
- Sin el disco 2 se juega hasta el cambio de disco.
- Chrome o Edge. Para VR: Meta Quest o Pico.

## `TX-03` CASCO DE REALIDAD VIRTUAL

- **Desde la PC:** Quest Link, Air Link o Virtual Desktop, con `http://127.0.0.1:8123` en Chrome o Edge.
- **Con el navegador del casco y cable USB:** `CASCO_USB.cmd` (necesita `adb`, de las Android Platform Tools de Google;
  ahí te dice cómo).

### Celular u otra PC, por wifi

Abrí `JUGAR_EN_RED.cmd` en la PC y entrá desde el otro aparato a la dirección que muestra. La PC tiene que quedar prendida
y en la misma red. La primera vez el navegador avisa que la conexión no es privada, porque el certificado lo crea tu propia
PC: tocá "Avanzado" y "Continuar". Mientras esa ventana esté abierta, **cualquiera en esa red puede entrar**: usalo en tu
casa, no en un wifi público.

### App de celular (Android)

1. Instalá el juego en la PC y hacé doble clic en `ARMAR_ARCHIVO_CELULAR.cmd`: arma `MGSweb_datos.mgs`, cerca de 1 GB.
2. Bajá `ShadowMoses_celular.apk` de [Releases](../../releases/latest) e instalala. Android te va a pedir permiso para
   instalar apps de fuera de la tienda.
3. Copiá `MGSweb_datos.mgs` al celular, abrí la app y elegilo. Después no hace falta la PC ni internet: la app no tiene
   permiso de internet.

La app no trae ningún archivo del juego. El archivo `.mgs` son tus datos: no lo subas ni lo compartas.

## `TX-04` CÓDEC: PROBLEMAS COMUNES

- **"No es la versión USA"**: hace falta la USA. La japonesa, la europea y la Integral todavía no.
- **"Está comprimido"**: descomprimí el `.7z`/`.zip` primero y elegí el `.cue`.
- **La conversión se cortó**: abrí `INSTALAR.cmd` de nuevo; retoma desde el paso que faltaba.
- **Después quiero sumar el disco 2**: abrí `INSTALAR.cmd`, elegí "N" (elegir de nuevo) y los dos discos.

## `TX-05` CRÉDITOS

FeniXVOID · Project Ravenlight.
Usa [three.js](https://threejs.org) (MIT), [Node.js](https://nodejs.org), [Python](https://python.org) con
[NumPy](https://numpy.org) y [Pillow](https://python-pillow.org), y [FFmpeg](https://ffmpeg.org) (GPL v3,
[código fuente](https://ffmpeg.org/download.html#get-sources)).
Los nombres de funciones y tablas del conversor (`tools/names.txt`, `tools/tablas_ref.json`) salen del trabajo de la
comunidad [FoxdieTeam/mgs_reversing](https://github.com/FoxdieTeam/mgs_reversing).
