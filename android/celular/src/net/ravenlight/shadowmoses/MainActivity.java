// La app de celular: el visor va adentro de la APK y los datos del juego salen del archivo único que elige el jugador
// (MGSweb_datos.mgs, un zip sin comprimir que arma ARMAR_ARCHIVO_CELULAR.cmd en la PC). Sirve las dos cosas a una WebView en
// una dirección https propia, porque el juego necesita conexión segura (AudioWorklet). No sale nada a internet.
// FeniXVOID · Project Ravenlight
package net.ravenlight.shadowmoses;

import android.app.Activity;
import android.app.AlertDialog;
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
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String TAG = "ShadowMoses";
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + HOST + "/";
    private static final String INICIO = BASE + "_app/inicio.html";
    private static final String JUEGO = BASE + "index.html?tactil";   // siempre con los controles táctiles
    private static final int PEDIDO_ARCHIVO = 1, PEDIDO_PARTIDA = 2, PEDIDO_GUARDAR = 3;

    private WebView web;
    private ParcelFileDescriptor descriptor;
    private volatile FileChannel canal;
    private volatile Map<String, long[]> indice;   // nombre -> { offset del encabezado local, tamaño }
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

        String guardada = prefs().getString("archivo", null);
        if (guardada != null && abrir(Uri.parse(guardada)) == null) web.loadUrl(JUEGO);
        else web.loadUrl(INICIO + (guardada != null ? "?error=mover" : ""));
    }

    private SharedPreferences prefs() { return getSharedPreferences("mgs", MODE_PRIVATE); }

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
        } else if (pedido == PEDIDO_ARCHIVO && uri != null) {
            String error = abrir(uri);
            if (error != null) { web.loadUrl(INICIO + "?error=" + error); return; }
            try { getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); }
            catch (SecurityException e) { Log.w(TAG, "sin permiso permanente", e); }
            prefs().edit().putString("archivo", uri.toString()).apply();
            web.loadUrl(JUEGO);
        }
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

    /** Abre el archivo y arma el índice. Devuelve null si está bien, o el código del error para la pantalla de inicio. */
    private String abrir(Uri uri) {
        cerrar();
        try {
            ParcelFileDescriptor d = getContentResolver().openFileDescriptor(uri, "r");
            if (d == null) return "abrir";
            FileChannel c = new FileInputStream(d.getFileDescriptor()).getChannel();
            Map<String, long[]> ind = leerIndice(c);
            if (ind == null) { d.close(); return "formato"; }
            if (!ind.containsKey("discos.json")) { d.close(); return "formato"; }
            descriptor = d; canal = c; indice = ind;
            return null;
        } catch (IOException | SecurityException | IllegalArgumentException e) {
            Log.w(TAG, "no se pudo abrir el archivo", e);
            return "abrir";
        }
    }

    private void cerrar() {
        indice = null; canal = null;
        try { if (descriptor != null) descriptor.close(); } catch (IOException ignorado) { }
        descriptor = null;
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
        Map<String, long[]> ind = indice;
        FileChannel c = canal;
        long[] e = ind == null ? null : ind.get(nombre);
        if (e == null || c == null) return vacia(404, "Not Found");
        ByteBuffer h = leer(c, e[0], 30);
        if (h.limit() < 30 || h.getInt(0) != 0x04034b50) return vacia(500, "Bad Entry");
        long ini = e[0] + 30 + (h.getShort(26) & 0xffff) + (h.getShort(28) & 0xffff), tam = e[1];
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

    /** Lo que ven las páginas como window.MGSApp. El visor lo usa para saber que corre adentro de la app. */
    private final class Puente {
        @JavascriptInterface public void elegirArchivo() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                i.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload"));
                startActivityForResult(i, PEDIDO_ARCHIVO);
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
        @JavascriptInterface public String version() { return "1.9"; }
    }
}
