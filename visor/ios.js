// MGS web — FeniXVOID · Project Ravenlight
(function() {
  "use strict";
  var q;
  try {
    q = new URLSearchParams(location.search);
  } catch (e) {
    q = {
      get: function() {
        return null;
      }
    };
  }
  var forzado = q.get("ios");
  var ua = navigator.userAgent || "";
  var IOS = forzado === "1" || forzado !== "0" && (/iP(hone|ad|od)/.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!IOS) return;
  var guion = document.currentScript;
  var JUEGO = !!(guion && guion.hasAttribute("data-juego"));
  var mm = function(m) {
    try {
      return matchMedia(m).matches;
    } catch (e) {
      return false;
    }
  };
  var SOLO = navigator.standalone === true || mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)");
  var APP = !!(window.MGSApp || window.MGSCasco || window.MGSIphone);
  var leer = function(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  };
  var escribir = function(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  };
  var ES = /^es/i.test(leer("mgs_idioma") || navigator.language || "es");
  var html = document.documentElement;
  html.classList.add("ios");
  if (SOLO) html.classList.add("ios-solo");
  var estado = {
    solo: SOLO,
    juego: JUEGO,
    app: APP,
    audios: 0,
    audioDespierto: 0,
    sesionAudio: null,
    contextoPerdido: 0
  };
  window.MGS_IOS = estado;
  var cabeza = document.head || document.getElementsByTagName("head")[0];
  function meta(nombre, valor) {
    if (!cabeza || document.querySelector('meta[name="' + nombre + '"]')) return;
    var m = document.createElement("meta");
    m.name = nombre;
    m.content = valor;
    cabeza.appendChild(m);
  }
  function enlace(rel, href) {
    var l = document.querySelector('link[rel="' + rel + '"]');
    if (!l && cabeza) {
      l = document.createElement("link");
      l.rel = rel;
      l.href = href;
      cabeza.appendChild(l);
    }
    return l;
  }
  meta("apple-mobile-web-app-capable", "yes");
  meta("mobile-web-app-capable", "yes");
  meta("apple-mobile-web-app-status-bar-style", "black-translucent");
  meta("apple-mobile-web-app-title", "Shadow Moses");
  enlace("apple-touch-icon", "assets/icono_192.png");
  var man = enlace("manifest", "manifest.webmanifest");
  if (man) man.crossOrigin = "use-credentials";
  var vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/viewport-fit/.test(vp.content)) vp.content += ", viewport-fit=cover";
  var css = document.createElement("style");
  css.id = "mgs-ios-css";
  css.textContent = JUEGO ? "html.ios{-webkit-text-size-adjust:100%;text-size-adjust:100%;touch-action:manipulation;overscroll-behavior:none}" + "html.ios body{overscroll-behavior:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}" + "html.ios canvas{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}" + "#mgs-ios-memoria{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.92);color:#b4f4ac;display:flex;flex-direction:column;" + "align-items:center;justify-content:center;gap:14px;text-align:center;font:15px/1.45 Consolas,monospace;text-transform:none;" + "padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}" + "#mgs-ios-memoria b{color:#ff5a4a;font-size:18px;letter-spacing:1px}" + "#mgs-ios-memoria button{font:16px Consolas,monospace;padding:12px 20px;background:#000;color:#b4f4ac;border:1px solid #b4f4ac;min-height:44px}" : "html.ios{-webkit-text-size-adjust:100%;text-size-adjust:100%}" + "html.ios body{padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom)}" + "html.ios .barra{padding-top:calc(8px + env(safe-area-inset-top))}" + "#mgs-ios-inicio{position:relative;margin:14px auto 0;max-width:760px;width:calc(100% - 32px);border:1px solid #5ef08a;background:rgba(4,18,10,.94);" + 'color:#dff5e5;padding:10px 42px 10px 12px;font:13px/1.45 Consolas,"Lucida Console",monospace}' + "#mgs-ios-inicio b{color:#5ef08a}" + "#mgs-ios-inicio p{margin:3px 0}" + "#mgs-ios-inicio .en{color:#7fa98c;font-size:12px}" + "#mgs-ios-inicio button{position:absolute;top:4px;right:4px;width:40px;height:40px;background:none;border:0;color:#5ef08a;font:22px/1 Consolas,monospace;cursor:pointer}";
  if (cabeza) cabeza.appendChild(css);
  function avisoInicio() {
    if (SOLO || APP || leer("mgs_ios_inicio_visto") === "1" || document.getElementById("mgs-ios-inicio")) return;
    var caja = document.createElement("section");
    caja.id = "mgs-ios-inicio";
    caja.setAttribute("role", "note");
    var t = [ "<b>IPHONE / IPAD:</b> tocá <b>Compartir</b> y <b>Agregar a inicio</b> para jugarlo a pantalla completa desde ese ícono. " + "La primera vez el ícono te pide el código otra vez: guarda todo aparte de Safari (también las partidas).", "<b>IPHONE / IPAD:</b> tap <b>Share</b> and <b>Add to Home Screen</b> to play full screen from that icon. " + "The first time, the icon asks for the code again: it keeps everything apart from Safari (saves too)." ];
    var orden = ES ? [ 0, 1 ] : [ 1, 0 ];
    caja.innerHTML = "<p>" + t[orden[0]] + '</p><p class="en">' + t[orden[1]] + "</p>" + '<button type="button" aria-label="Cerrar / Close">×</button>';
    caja.querySelector("button").onclick = function() {
      escribir("mgs_ios_inicio_visto", "1");
      caja.remove();
    };
    var donde = document.querySelector("main");
    if (donde) donde.insertBefore(caja, donde.firstChild); else document.body.insertBefore(caja, document.body.firstChild);
  }
  if (!JUEGO) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avisoInicio); else avisoInicio();
    return;
  }
  var frenar = function(e) {
    if (e.cancelable) e.preventDefault();
  };
  [ "gesturestart", "gesturechange", "gestureend" ].forEach(function(n) {
    document.addEventListener(n, frenar, {
      passive: false
    });
  });
  var arriba = function() {
    var a = document.activeElement;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return;
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  };
  document.addEventListener("focusout", function() {
    setTimeout(arriba, 80);
  }, true);
  window.addEventListener("orientationchange", function() {
    setTimeout(arriba, 350);
  });
  window.addEventListener("resize", function() {
    setTimeout(arriba, 100);
  });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function() {
    setTimeout(arriba, 100);
  });
  var AC = window.AudioContext || window.webkitAudioContext;
  var contextos = [];
  if (AC) {
    try {
      var Anotado = class extends AC {
        constructor(op) {
          super(op);
          contextos.push(this);
          estado.audios++;
        }
        resume() {
          var c = this;
          return super.resume().catch(function() {
            estado.resumeRechazado = (estado.resumeRechazado || 0) + 1;
            return new Promise(function(ok) {
              var t = 0;
              var fin = function() {
                clearTimeout(t);
                c.removeEventListener("statechange", mira);
                ok();
              };
              var mira = function() {
                if (c.state === "running") fin();
              };
              t = setTimeout(fin, 600);
              c.addEventListener("statechange", mira);
            });
          });
        }
      };
      window.AudioContext = Anotado;
      if (window.webkitAudioContext) window.webkitAudioContext = Anotado;
    } catch (e) {}
  }
  function sesionAudio() {
    var s = navigator.audioSession;
    if (!s || leer("sm_sonido") === "0") return;
    try {
      if (s.type !== "playback") s.type = "playback";
      estado.sesionAudio = s.type;
    } catch (e) {}
  }
  function despertar() {
    sesionAudio();
    for (var i = contextos.length - 1; i >= 0; i--) {
      var c = contextos[i];
      if (c.state === "closed") {
        contextos.splice(i, 1);
        continue;
      }
      if (c.state !== "running") {
        try {
          c.resume().then(function() {
            estado.audioDespierto++;
          }, function() {});
        } catch (e) {}
      }
    }
  }
  [ "touchend", "click", "keydown" ].forEach(function(n) {
    window.addEventListener(n, despertar, {
      capture: true,
      passive: true
    });
  });
  document.addEventListener("visibilitychange", function() {
    if (document.visibilityState === "visible") despertar();
  });
  var perdido = false;
  window.addEventListener("webglcontextlost", function(e) {
    var R = window.__mgs && window.__mgs.R;
    if (R && e.target !== R.domElement) return;
    perdido = true;
    estado.contextoPerdido++;
    setTimeout(function() {
      if (perdido) avisoMemoria();
    }, 2500);
  }, true);
  window.addEventListener("webglcontextrestored", function() {
    perdido = false;
  }, true);
  function avisoMemoria() {
    if (document.getElementById("mgs-ios-memoria")) return;
    var d = document.createElement("div");
    d.id = "mgs-ios-memoria";
    d.innerHTML = "<b>" + (ES ? "SAFARI SE QUEDÓ SIN MEMORIA DE VIDEO" : "SAFARI RAN OUT OF VIDEO MEMORY") + "</b>" + "<div>" + (ES ? "Cerrá otras pestañas o apps y volvé a cargar. Se pierde lo que no guardaste." : "Close other tabs or apps and reload. Anything not saved is lost.") + "</div>" + '<div style="color:#7fa98c">' + (ES ? "Safari ran out of video memory: close other tabs or apps and reload." : "Safari se quedó sin memoria de video: cerrá otras pestañas o apps y volvé a cargar.") + "</div>" + '<button type="button">' + (ES ? "VOLVER A CARGAR / RELOAD" : "RELOAD / VOLVER A CARGAR") + "</button>";
    d.querySelector("button").onclick = function() {
      location.reload();
    };
    (document.body || html).appendChild(d);
  }
})();
