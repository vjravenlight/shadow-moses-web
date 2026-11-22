// La app de celular: el visor va adentro de la APK y los datos del juego salen del archivo que elige el jugador
// (MGSweb_datos.mgs, un zip sin comprimir que arma ARMAR_ARCHIVO_CELULAR.cmd en la PC). Sirve las dos cosas a una WebView en
// una dirección https propia, porque el juego necesita conexión segura (AudioWorklet). No sale nada a internet.
// 2.12: el archivo puede venir EN PARTES (MGS_disco1.mgs, MGS_disco2.mgs, MGS_vr_missions.mgs, MGS_integral.mgs,
// MGS_idioma_xx.mgs; cada una trae mgs_parte.json): se abren todas juntas, assets/_partes_cargadas.json dice cuáles hay y
// el juego (visor/partes.js) pide las que faltan con MGSApp.elegirParte(), como el cambio de disco. El .mgs entero (también
// los viejos) sigue igual. Detalle: docs/iphone_y_partes.md.
// FeniXVOID · Project Ravenlight
package net.ravenlight.shadowmoses;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String TAG = "ShadowMoses";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + HOST + "/";
    private static final String INICIO = BASE + "_app/inicio.html";
    private static final String JUEGO = BASE + "index.html?tactil";   // siempre con los controles táctiles
    private static final int PEDIDO_ARCHIVO = 1, PEDIDO_PARTIDA = 2, PEDIDO_GUARDAR = 3, PEDIDO_PARTE = 4;
    // el orden en que se buscan los archivos cuando dos partes traen el mismo (no debería pasar)
    private static final String[] ORDEN = { "entero", "disco1", "disco2", "vr_missions", "integral" };

    /** Un .mgs abierto: su canal, su índice y qué parte es ('entero' para el de siempre). */
    private static final class Abierto {
        final ParcelFileDescriptor descriptor; final FileChannel canal; final Map<String, long[]> indice; final String parte; final long tam;
        Abierto(ParcelFileDescriptor d, FileChannel c, Map<String, long[]> i, String p, long t) { descriptor = d; canal = c; indice = i; parte = p; tam = t; }
        void cerrar() { try { descriptor.close(); } catch (IOException ignorado) { } }
    }
    /** Dónde está cada archivo de assets/: en qué canal y en qué lugar del zip. */
    private static final class Entrada {
        final FileChannel canal; final long local, tam;
        Entrada(FileChannel c, long l, long t) { canal = c; local = l; tam = t; }
    }

    private WebView web;
    // uri -> archivo abierto (sólo desde el hilo de la pantalla)
    private final Map<String, Abierto> abiertos = new HashMap<>();
    // nombre -> dónde está; lo leen los hilos de la WebView
    private volatile Map<String, Entrada> indice;
    // assets/_partes_cargadas.json
    private volatile String cargadas = "{\"formato\":1,\"cargadas\":[]}";
    // elegirParte() en curso
    private String parteEsperada;
    private ValueCallback<Uri[]> esperaPartida;
    private byte[] porGuardar;   // lo que exporta el juego, hasta que el jugador elige dónde dejarlo

    private static final Map<String, String> TIPOS = new HashMap<>();
    static {
        TIPOS.put("html", "text/html"); TIPOS.put("js", "text/javascript"); TIPOS.put("mjs", "text/javascript");
        TIPOS.put("css", "text/css"); TIPOS.put("json", "application/json"); TIPOS.put("svg", "image/svg+xml");
        TIPOS.put("png", "image/png"); TIPOS.put("jpg", "image/jpeg"); TIPOS.put("ico", "image/x-icon");
        TIPOS.put("mp4", "video/mp4"); TIPOS.put("m4a", "audio/mp4"); TIPOS.put("woff", "font/woff"); TIPOS.put("woff2", "font/woff2");
        TIPOS.put("glb", "model/gltf-binary"); TIPOS.put("webmanifest", "application/manifest+json");
    }

    @Override
    protected void onCreate(Bundle guardado) {
        super.onCreate(guardado);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (android.os.Build.VERSION.SDK_INT >= 28) {   // toda la pantalla, también al lado de la cámara del celular
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        setContentView(web);
        pantallaCompleta();

        WebSettings w = web.getSettings();
        w.setJavaScriptEnabled(true);
        w.setDomStorageEnabled(true);   // las partidas y las opciones van en localStorage
        w.setMediaPlaybackRequiresUserGesture(false);
        w.setAllowFileAccess(false);
        w.setAllowContentAccess(false);
        w.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        web.addJavascriptInterface(new Puente(), "MGSApp");
        web.setWebViewClient(new Cliente());
        web.setWebChromeClient(new Cromo());

        Map<String, String> guardadas = guardadas();
        if (!guardadas.isEmpty() && usar(guardadas) == null) web.loadUrl(JUEGO);
        else web.loadUrl(INICIO + (!guardadas.isEmpty() ? "?error=mover" : ""));
    }

    private SharedPreferences prefs() { return getSharedPreferences("mgs", MODE_PRIVATE); }

    /** Los archivos elegidos: parte -> uri. La 1.16 guardaba uno solo en "archivo": se toma como el entero. */
    private Map<String, String> guardadas() {
        Map<String, String> m = new LinkedHashMap<>();
        String j = prefs().getString("archivos", null);
        if (j != null) {
            try { JSONObject o = new JSONObject(j); for (Iterator<String> k = o.keys(); k.hasNext(); ) { String p = k.next(); m.put(p, o.getString(p)); } }
            catch (JSONException e) { Log.w(TAG, "archivos guardados ilegibles", e); }
        } else {
            String viejo = prefs().getString("archivo", null);
            if (viejo != null) m.put("entero", viejo);
        }
        return m;
    }

    private void guardar(Map<String, String> m) {
        prefs().edit().putString("archivos", new JSONObject(m).toString()).remove("archivo").apply();
    }

    private void pantallaCompleta() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public void onWindowFocusChanged(boolean foco) { super.onWindowFocusChanged(foco); if (foco) pantallaCompleta(); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }

    @Override public void onBackPressed() {
        new AlertDialog.Builder(this).setMessage("¿Salir del juego? / Quit the game?")
                .setPositiveButton("Salir / Quit", (d, i) -> finish()).setNegativeButton("Seguir / Stay", null).show();
    }

    @Override protected void onDestroy() {
        cerrar();
        try { web.destroy(); } catch (RuntimeException ignorado) { }   // ya destruida si se cayó la página
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int pedido, int resultado, Intent datos) {
        super.onActivityResult(pedido, resultado, datos);
        Uri uri = resultado == RESULT_OK && datos != null ? datos.getData() : null;
        if (pedido == PEDIDO_PARTIDA) {
            if (esperaPartida != null) esperaPartida.onReceiveValue(uri != null ? new Uri[] { uri } : null);
            esperaPartida = null;
        } else if (pedido == PEDIDO_GUARDAR) {
            byte[] datosGuardar = porGuardar;
            porGuardar = null;
            if (uri != null && datosGuardar != null) escribir(uri, datosGuardar);
        } else if (pedido == PEDIDO_ARCHIVO) {
            // la primera pantalla: uno o varios .mgs
            List<Uri> uris = new ArrayList<>();
            if (resultado == RESULT_OK && datos != null) {
                ClipData clip = datos.getClipData();
                if (clip != null) for (int i = 0; i < clip.getItemCount(); i++) uris.add(clip.getItemAt(i).getUri());
                else if (datos.getData() != null) uris.add(datos.getData());
            }
            if (uris.isEmpty()) return;
            Map<String, String> nuevas = new LinkedHashMap<>(guardadas());
            for (Uri u : uris) {
                String[] r = probar(u);
                if (r[1] != null) { web.loadUrl(INICIO + "?error=" + r[1]); return; }
                sumar(nuevas, r[0], u);
            }
            String error = usar(nuevas);
            if (error != null) { web.loadUrl(INICIO + "?error=" + error); return; }
            guardar(nuevas);
            web.loadUrl(JUEGO);
        } else if (pedido == PEDIDO_PARTE) {
            // el juego pidió una parte (visor/partes.js)
            String quiero = parteEsperada;
            parteEsperada = null;
            if (uri == null) { avisarParte(false, null, "cancelado"); return; }
            String[] r = probar(uri);
            if (r[1] != null) { avisarParte(false, null, r[1]); return; }
            if ("entero".equals(r[0])) { avisarParte(false, r[0], "otra"); return; }
            Map<String, String> nuevas = new LinkedHashMap<>(guardadas());
            sumar(nuevas, r[0], uri);
            String error = usar(nuevas);
            if (error != null) { usar(guardadas()); avisarParte(false, r[0], error); return; }
            guardar(nuevas);
            avisarParte(true, r[0], quiero != null && !quiero.equals(r[0]) ? "otra" : null);
        }
    }

    /** Suma una parte elegida: el entero reemplaza a las partes y una parte reemplaza al entero (no van juntos). */
    private void sumar(Map<String, String> m, String parte, Uri uri) {
        try { getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); }
        catch (SecurityException e) { Log.w(TAG, "sin permiso permanente", e); }
        if ("entero".equals(parte)) m.clear(); else m.remove("entero");
        m.put(parte, uri.toString());
    }

    private void avisarParte(boolean ok, String parte, String error) {
        try {
            JSONObject o = new JSONObject().put("ok", ok);
            if (parte != null) o.put("parte", parte);
            if (error != null) o.put("error", error);
            web.evaluateJavascript("window.mgsPartes&&window.mgsPartes.alElegir(" + o + ")", null);
        } catch (JSONException e) { Log.w(TAG, "aviso de parte", e); }
    }

    /** Escribe lo exportado donde eligió el jugador, fuera del hilo de la pantalla (una foto 360 pesa varios MB). */
    private void escribir(Uri uri, byte[] datos) {
        new Thread(() -> {
            boolean bien = false;
            try (OutputStream o = getContentResolver().openOutputStream(uri, "wt")) {
                if (o != null) { o.write(datos); bien = true; }
            } catch (IOException | SecurityException e) {
                Log.w(TAG, "no se pudo guardar", e);
            }
            String aviso = bien ? "Guardado / Saved" : "No se pudo guardar / Could not save";
            runOnUiThread(() -> Toast.makeText(this, aviso, Toast.LENGTH_SHORT).show());
        }).start();
    }

    /** Abre un .mgs: null si no se puede o no sirve. */
    private Abierto abrirUno(Uri uri) {
        ParcelFileDescriptor d = null;
        try {
            d = getContentResolver().openFileDescriptor(uri, "r");
            if (d == null) return null;
            FileChannel c = new FileInputStream(d.getFileDescriptor()).getChannel();
            Map<String, long[]> ind = leerIndice(c);
            String parte = ind == null ? null : parteDe(c, ind);
            if (parte == null) { d.close(); return null; }
            return new Abierto(d, c, ind, parte, c.size());
        } catch (IOException | SecurityException | IllegalArgumentException e) {
            Log.w(TAG, "no se pudo abrir " + uri, e);
            if (d != null) try { d.close(); } catch (IOException ignorado) { }
            return null;
        }
    }

    /** Qué parte es un .mgs abierto (su mgs_parte.json; 'entero' si no lo trae pero tiene discos.json), o null si no sirve. */
    private static String parteDe(FileChannel c, Map<String, long[]> ind) throws IOException {
        String parte = null;
        long[] e = ind.get("mgs_parte.json");
        if (e != null && e[1] < 65536) {
            ByteBuffer h = leer(c, e[0], 30);
            if (h.limit() == 30 && h.getInt(0) == 0x04034b50) {
                ByteBuffer b = leer(c, e[0] + 30 + (h.getShort(26) & 0xffff) + (h.getShort(28) & 0xffff), (int) e[1]);
                try { parte = new JSONObject(new String(b.array(), 0, b.limit(), StandardCharsets.UTF_8)).optString("parte", null); }
                catch (JSONException x) { parte = null; }
            }
        }
        if (parte == null && ind.containsKey("discos.json")) parte = "entero";
        if (parte == null || !parte.matches("[a-z0-9_]+")) return null;
        if (("entero".equals(parte) || "disco1".equals(parte)) && !ind.containsKey("discos.json")) return null;
        return parte;
    }

    /** Mira un archivo elegido sin quedárselo: { parte, error }. */
    private String[] probar(Uri uri) {
        Abierto a = abrirUno(uri);
        if (a == null) {
            try (ParcelFileDescriptor d = getContentResolver().openFileDescriptor(uri, "r")) { return new String[] { null, d == null ? "abrir" : "formato" }; }
            catch (IOException | SecurityException | IllegalArgumentException e) { return new String[] { null, "abrir" }; }
        }
        String p = a.parte;
        a.cerrar();
        return new String[] { p, null };
    }

    private static int orden(String parte) {
        for (int i = 0; i < ORDEN.length; i++) if (ORDEN[i].equals(parte)) return i;
        return ORDEN.length;
    }

    /**
     * Abre los archivos elegidos (parte -> uri; los que ya estaban abiertos quedan como están) y arma el índice junto.
     * Devuelve null si está bien, o el código del error para la pantalla de inicio. Un archivo opcional que ya no se puede
     * abrir (se movió o se borró) se saca de la lista y el juego lo vuelve a pedir cuando haga falta.
     */
    private String usar(Map<String, String> elegidas) {
        Map<String, Abierto> nuevos = new HashMap<>();
        List<Abierto> lista = new ArrayList<>();
        boolean cambio = false;
        for (Iterator<Map.Entry<String, String>> it = elegidas.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<String, String> k = it.next();
            Abierto a = abiertos.get(k.getValue());
            if (a == null) a = abrirUno(Uri.parse(k.getValue()));
            if (a == null) {
                if ("entero".equals(k.getKey()) || "disco1".equals(k.getKey())) { cerrarNuevos(nuevos); return "mover"; }
                it.remove(); cambio = true; continue;
            }
            nuevos.put(k.getValue(), a);
            lista.add(a);
        }
        Collections.sort(lista, (x, y) -> orden(x.parte) != orden(y.parte) ? orden(x.parte) - orden(y.parte) : x.parte.compareTo(y.parte));
        Map<String, Entrada> ind = new HashMap<>();
        JSONArray car = new JSONArray();
        for (Abierto a : lista) {
            for (Map.Entry<String, long[]> e : a.indice.entrySet())
                if (!ind.containsKey(e.getKey())) ind.put(e.getKey(), new Entrada(a.canal, e.getValue()[0], e.getValue()[1]));
            try { car.put(new JSONObject().put("parte", a.parte).put("bytes", a.tam)); } catch (JSONException ignorado) { }
        }
        if (!ind.containsKey("discos.json")) { cerrarNuevos(nuevos); return lista.isEmpty() ? "formato" : "disco1"; }
        indice = ind;
        try { cargadas = new JSONObject().put("formato", 1).put("cargadas", car).toString(); } catch (JSONException ignorado) { }
        for (Map.Entry<String, Abierto> e : abiertos.entrySet()) if (!nuevos.containsKey(e.getKey())) e.getValue().cerrar();
        abiertos.clear();
        abiertos.putAll(nuevos);
        if (cambio) guardar(elegidas);
        return null;
    }

    /** Cierra lo que se abrió en un usar() que no salió (lo que ya estaba abierto queda). */
    private void cerrarNuevos(Map<String, Abierto> nuevos) {
        for (Map.Entry<String, Abierto> e : nuevos.entrySet()) if (!abiertos.containsKey(e.getKey())) e.getValue().cerrar();
    }

    private void cerrar() {
        indice = null;
        for (Abierto a : abiertos.values()) a.cerrar();
        abiertos.clear();
    }

    private static ByteBuffer leer(FileChannel c, long pos, int n) throws IOException {
        ByteBuffer b = ByteBuffer.allocate(n).order(ByteOrder.LITTLE_ENDIAN);
        while (b.hasRemaining()) { if (c.read(b, pos + b.position()) < 0) break; }
        b.flip();
        return b;
    }

    /** Lee el directorio central del zip. Solo acepta entradas sin comprimir: así se puede saltar a cualquier archivo. */
    private static Map<String, long[]> leerIndice(FileChannel c) throws IOException {
        long tam = c.size();
        if (tam < 22) return null;
        int cola = (int) Math.min(tam, 65557);
        ByteBuffer fin = leer(c, tam - cola, cola);
        int p = -1;
        for (int i = fin.limit() - 22; i >= 0; i--) if (fin.getInt(i) == 0x06054b50) { p = i; break; }
        if (p < 0) return null;
        int total = fin.getShort(p + 10) & 0xffff;
        long tamDir = fin.getInt(p + 12) & 0xffffffffL, iniDir = fin.getInt(p + 16) & 0xffffffffL;
        if (iniDir + tamDir > tam || tamDir > Integer.MAX_VALUE) return null;
        ByteBuffer d = leer(c, iniDir, (int) tamDir);
        Map<String, long[]> ind = new HashMap<>(total * 2);
        int q = 0;
        for (int i = 0; i < total; i++) {
            if (q + 46 > d.limit() || d.getInt(q) != 0x02014b50) return null;
            int metodo = d.getShort(q + 10) & 0xffff;
            long tamano = d.getInt(q + 24) & 0xffffffffL, local = d.getInt(q + 42) & 0xffffffffL;
            int n = d.getShort(q + 28) & 0xffff, x = d.getShort(q + 30) & 0xffff, k = d.getShort(q + 32) & 0xffff;
            if (metodo != 0) return null;
            ind.put(new String(d.array(), q + 46, n, StandardCharsets.UTF_8), new long[] { local, tamano });
            q += 46 + n + x + k;
        }
        return ind;
    }

    private static WebResourceResponse vacia(int codigo, String razon) {
        return new WebResourceResponse("text/plain", "utf-8", codigo, razon, new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    private static String tipo(String ruta) {
        int i = ruta.lastIndexOf('.');
        String t = i < 0 ? null : TIPOS.get(ruta.substring(i + 1).toLowerCase(Locale.ROOT));
        return t != null ? t : "application/octet-stream";
    }

    private WebResourceResponse responder(WebResourceRequest r) {
        Uri u = r.getUrl();
        if (!HOST.equals(u.getHost())) return vacia(403, "Forbidden");   // nada sale de la app
        String p = u.getPath();
        if (p == null || p.contains("..")) return vacia(403, "Forbidden");
        if (p.endsWith("/")) p += "index.html";
        try {
            if (p.startsWith("/assets/")) return delArchivo(p.substring(8), r);
            String enApk = p.startsWith("/_app/") ? "app/" + p.substring(6) : "visor" + p;
            return new WebResourceResponse(tipo(p), tipo(p).startsWith("text/") ? "utf-8" : null, getAssets().open(enApk));
        } catch (IOException e) {
            return vacia(404, "Not Found");
        }
    }

    private WebResourceResponse delArchivo(String nombre, WebResourceRequest r) throws IOException {
        if ("_partes_cargadas.json".equals(nombre)) {
            // qué partes hay en el aparato (visor/partes.js)
            Map<String, String> enc = new HashMap<>();
            enc.put("Cache-Control", "no-store");
            return new WebResourceResponse("application/json", "utf-8", 200, "OK", enc, new ByteArrayInputStream(cargadas.getBytes(StandardCharsets.UTF_8)));
        }
        Map<String, Entrada> ind = indice;
        Entrada e = ind == null ? null : ind.get(nombre);
        if (e == null) return vacia(404, "Not Found");
        FileChannel c = e.canal;
        ByteBuffer h = leer(c, e.local, 30);
        if (h.limit() < 30 || h.getInt(0) != 0x04034b50) return vacia(500, "Bad Entry");
        long ini = e.local + 30 + (h.getShort(26) & 0xffff) + (h.getShort(28) & 0xffff), tam = e.tam;
        long desde = 0, hasta = tam - 1;
        Map<String, String> enc = new HashMap<>();
        enc.put("Accept-Ranges", "bytes");
        String rango = r.getRequestHeaders().get("Range");
        if (rango == null) rango = r.getRequestHeaders().get("range");
        boolean parcial = false;
        if (rango != null && rango.startsWith("bytes=") && !rango.contains(",")) {   // los videos piden de a pedazos
            String[] a = rango.substring(6).trim().split("-", 2);
            try {
                if (a[0].isEmpty()) desde = Math.max(0, tam - Long.parseLong(a[1]));
                else { desde = Long.parseLong(a[0]); if (a.length > 1 && !a[1].isEmpty()) hasta = Math.min(hasta, Long.parseLong(a[1])); }
                parcial = true;
            } catch (NumberFormatException ignorado) { desde = 0; hasta = tam - 1; }
            if (desde > hasta) { enc.put("Content-Range", "bytes */" + tam); return new WebResourceResponse("text/plain", null, 416, "Range Not Satisfiable", enc, new ByteArrayInputStream(new byte[0])); }
        }
        enc.put("Content-Length", String.valueOf(hasta - desde + 1));
        if (parcial) enc.put("Content-Range", "bytes " + desde + "-" + hasta + "/" + tam);
        String mime = tipo(nombre);
        return new WebResourceResponse(mime, mime.startsWith("text/") ? "utf-8" : null, parcial ? 206 : 200, parcial ? "Partial Content" : "OK",
                enc, new Trozo(c, ini + desde, hasta - desde + 1));
    }

    private final class Cliente extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return responder(r); }
        @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            return !HOST.equals(r.getUrl().getHost());   // la app no navega afuera
        }
        // se quedó sin memoria el motor de la página: en vez de cerrar la app, vuelve a abrirla (las partidas están guardadas)
        @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
            Log.w(TAG, "se cayó la página; se abre de nuevo");
            setContentView(new View(MainActivity.this));
            v.destroy();
            recreate();
            return true;
        }
    }

    private final class Cromo extends WebChromeClient {
        @Override public boolean onConsoleMessage(ConsoleMessage m) {
            Log.d(TAG, m.messageLevel() + " " + m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")");
            return true;
        }
        @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {   // importar partidas
            if (esperaPartida != null) esperaPartida.onReceiveValue(null);
            esperaPartida = cb;
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
            startActivityForResult(i, PEDIDO_PARTIDA);
            return true;
        }
    }

    /** Un pedazo del archivo. Las lecturas por posición del canal se pueden hacer desde varios hilos a la vez. */
    private static final class Trozo extends InputStream {
        private final FileChannel c; private long pos, resta;
        Trozo(FileChannel c, long pos, long largo) { this.c = c; this.pos = pos; this.resta = largo; }
        @Override public int read() throws IOException { byte[] b = new byte[1]; return read(b, 0, 1) < 0 ? -1 : b[0] & 255; }
        @Override public int read(byte[] b, int o, int n) throws IOException {
            if (resta <= 0) return -1;
            int r = c.read(ByteBuffer.wrap(b, o, (int) Math.min(n, resta)), pos);
            if (r > 0) { pos += r; resta -= r; }
            return r;
        }
        @Override public int available() { return (int) Math.min(resta, Integer.MAX_VALUE); }
    }

    /** El selector de archivos del sistema, empezando en Descargas. */
    private static Intent elegir(boolean varios) {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        i.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload"));
        if (varios) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        return i;
    }

    /** Lo que ven las páginas como window.MGSApp. El visor lo usa para saber que corre adentro de la app. */
    private final class Puente {
        @JavascriptInterface public void elegirArchivo() {
            runOnUiThread(() -> startActivityForResult(elegir(true), PEDIDO_ARCHIVO));
        }
        /** 2.12: el juego pide una parte que no está (el disco 2 al cambiar de disco, un idioma…). Contesta con mgsPartes.alElegir. */
        @JavascriptInterface public void elegirParte(String parte) {
            runOnUiThread(() -> {
                parteEsperada = parte;
                try { startActivityForResult(elegir(false), PEDIDO_PARTE); }
                catch (RuntimeException e) { parteEsperada = null; avisarParte(false, null, "abrir"); }
            });
        }
        /** Exportar una partida o una foto: en una WebView no funciona la descarga de un blob, así que pregunta dónde guardarlo. */
        @JavascriptInterface public void guardarArchivo(String nombre, String tipo, String base64) {
            byte[] datos;
            try { datos = Base64.decode(base64, Base64.DEFAULT); }
            catch (IllegalArgumentException e) { Log.w(TAG, "datos inválidos al guardar", e); return; }
            runOnUiThread(() -> {
                porGuardar = datos;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType(tipo == null || tipo.isEmpty() ? "application/octet-stream" : tipo).putExtra(Intent.EXTRA_TITLE, nombre);
                startActivityForResult(i, PEDIDO_GUARDAR);
            });
        }
        @JavascriptInterface public String version() { return "1.17"; }
    }
}
