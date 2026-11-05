<p align="center"><img src="img/banner.jpg" alt="Shadow Moses web: the codec on 140.85"></p>

# Shadow Moses web

The 1998 PlayStation stealth classic, rebuilt for the browser: on PC, with a gamepad or with a VR headset. There's an Android app too.
You play it with **your own discs** (USA version): the installer converts them on your PC.

<p align="center"><b>◀ 140.85 ▶</b> · <a href="https://mgs.ravenlight.net/">mgs.ravenlight.net</a> · <a href="README.md">Versión en castellano</a></p>

> **Fan project, non-profit.** It includes no game files and downloads nothing: it only uses the disc files you choose.
> Metal Gear Solid is a trademark of Konami. This project is not affiliated with Konami.

<table>
<tr>
<td width="50%"><img src="img/cap_muelle.png" alt="The dock, with the radar and the game credits"><br><sub>The dock, with the radar and the game credits</sub></td>
<td width="50%"><img src="img/cap_codec_vr.png" alt="The codec in VR"><br><sub>The codec, in a VR headset</sub></td>
</tr>
</table>

## What's new

- **v1.9:** on the headset you can now endure the torture with the controllers: the buttons used to do nothing and the story stopped there. In body mode, the legs run with Snake's animation.
- **v1.8:** new headset options: Snake's hands, visible body and punching with your hand. The stick now steers the Nikita. Against Psycho Mantis with no second gamepad: a port 2 option, or switch your main hand mid-fight.
- **v1.7:** stealth suit with visible camouflage, red laser from the SOCOM, sight and target boxes on the Stinger and the Nikita. On the headset: night vision and thermal goggles, and items no longer show up twice.
- **v1.6:** the phone app now exports saves and photos: it asks where to store them.
- **v1.5:** the Android app arrives: play with no browser, no PC and no internet.
- **v1.3 and v1.4:** play over wifi from another device at home, on a secure connection with music and sound effects.
- **v1.2:** installer fix: with a double-click, the disc 2 window did not open.

## `TX-01` OPERATION: INSTALL

1. **Download the Release** (`MGSweb_v1.9.zip`, in [Releases](../../releases/latest)) and unzip it anywhere.
2. **Double-click `INSTALAR.cmd`.**
3. **Choose your discs**: the `.cue` (or `.bin`) of disc 1 and disc 2. They are converted on your PC and the game opens
   in your browser (`http://127.0.0.1:8123`). It takes 5 to 8 minutes; if it stops, open `INSTALAR.cmd` again and
   it resumes.

Next times: the **Metal Gear Solid web** shortcut on the Desktop (or `JUGAR.cmd`). The black window is the server: keep
it open while playing. It only serves your PC.

## `TX-02` REQUIRED EQUIPMENT

- Windows 10 or 11, 64-bit, about 3 GB free. Nothing to install: Node, Python and FFmpeg are included.
- Your Metal Gear Solid PlayStation discs, **USA version** (SLUS-00594 and SLUS-00776), as `.bin/.cue`
  (or a 2352-byte-per-sector `.img`). A 2048-byte `.iso` won't work: it lacks the voices and videos.
- Without disc 2 you can play up to the disc change.
- Chrome or Edge. For VR: Meta Quest or Pico.

## `TX-03` VR HEADSET

- **From the PC:** Quest Link, Air Link or Virtual Desktop, with `http://127.0.0.1:8123` in Chrome or Edge.
- **With the headset browser over USB:** `CASCO_USB.cmd` (needs `adb` from Google's Android Platform Tools; it tells you how).

### Phone or another PC, over wifi

Open `JUGAR_EN_RED.cmd` on the PC and go to the address it shows from the other device. The PC has to stay on and on the same
network. The first time, the browser warns that the connection is not private, because your own PC makes the certificate: tap
"Advanced" and "Proceed". While that window is open, **anyone on that network can get in**: use it at home, not on public wifi.
It also works from the headset browser, though it has not been tested on a real headset yet.

### Phone app (Android)

1. Install the game on the PC and double-click `ARMAR_ARCHIVO_CELULAR.cmd`: it makes `MGSweb_datos.mgs`, about 1 GB.
2. Download `ShadowMoses_celular.apk` from [Releases](../../releases/latest) and install it. Android will ask for permission
   to install apps from outside the store.
3. Copy `MGSweb_datos.mgs` to the phone, open the app and choose it. After that it needs neither the PC nor the internet: the
   app has no internet permission.

The app has no game files. The `.mgs` file is your own data: please do not upload or share it. To export a save or a photo, the
app asks where to store it. It has no VR. It was tested on a virtual phone with Android 14, not on a real one yet: if you try it,
please tell us in an issue which phone you used and how it went.

## `TX-04` CODEC: COMMON PROBLEMS

- **"Not the USA version"**: the USA version is required. Japanese, European and Integral are not supported yet.
- **"It is compressed"**: extract the `.7z`/`.zip` first and choose the `.cue`.
- **The conversion stopped**: open `INSTALAR.cmd` again; it resumes from the missing step.
- **Adding disc 2 later**: open `INSTALAR.cmd`, answer "N" (choose again) and pick both discs.

## `TX-05` CREDITS

FeniXVOID · Project Ravenlight.
Uses [three.js](https://threejs.org) (MIT), [Node.js](https://nodejs.org), [Python](https://python.org) with
[NumPy](https://numpy.org) and [Pillow](https://python-pillow.org), and [FFmpeg](https://ffmpeg.org) (GPL v3,
[source code](https://ffmpeg.org/download.html#get-sources)).
The converter's function and table names (`tools/names.txt`, `tools/tablas_ref.json`) come from the community work of
[FoxdieTeam/mgs_reversing](https://github.com/FoxdieTeam/mgs_reversing).
