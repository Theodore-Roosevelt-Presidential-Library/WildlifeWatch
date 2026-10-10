/*!
 * Wildlife Watch embed — Theodore Roosevelt Presidential Library
 * https://wildlife.labs.trlibrary.com
 *
 * Usage (one script tag per page, any number of widgets):
 *
 *   <div data-wildlife-watch="species"></div>
 *   <script src="https://wildlife.labs.trlibrary.com/embed.js" async></script>
 *
 * Views: species | horses | map | planner | reports | safety | all
 * Optional attributes:
 *   data-species="bison"   open one animal's field-guide card on load
 *   data-min-height="600"  starting height in px before the widget reports its size
 */
(function () {
  "use strict";
  var ORIGIN = "https://wildlife.labs.trlibrary.com";
  try {
    var me = document.currentScript && document.currentScript.src;
    if (me) ORIGIN = new URL(me).origin;
  } catch (e) {}

  var frames = {};
  var n = 0;

  function mount(el) {
    if (el.getAttribute("data-ww-mounted")) return;
    el.setAttribute("data-ww-mounted", "1");
    var view = el.getAttribute("data-wildlife-watch") || "species";
    var id = "ww" + ++n;
    var q = "?embed=1&id=" + id + (view !== "all" ? "&view=" + encodeURIComponent(view) : "");
    var sp = el.getAttribute("data-species");
    if (sp) q += "&species=" + encodeURIComponent(sp);
    var f = document.createElement("iframe");
    f.src = ORIGIN + "/" + q;
    f.title = "Wildlife Watch — Theodore Roosevelt National Park";
    f.loading = "lazy";
    f.setAttribute("allow", "fullscreen");
    f.style.cssText = "width:100%;border:0;display:block;overflow:hidden;height:" + (parseInt(el.getAttribute("data-min-height"), 10) || 700) + "px";
    f.addEventListener("load", function () { report(f); });
    el.appendChild(f);
    frames[id] = f;
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data || !e.data.type) return;
    var f = frames[e.data.id];
    if (!f) return;
    if (e.data.type === "wildlife-watch:height" && e.data.height) f.style.height = Math.ceil(e.data.height) + "px";
    if (e.data.type === "wildlife-watch:modal") { f.__wwOpen = !!e.data.open; if (e.data.open) report(f); }
  });

  // Tell each widget which slice of it is on screen, so its pop-up opens where
  // the reader is looking instead of at the top of the widget.
  function report(f) {
    var r = f.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var header = 0;
    try { // keep clear of fixed/sticky bars stacked at the top of the window
      // (e.g. an admin toolbar plus the site header): probe downward until clear.
      var x = Math.min(Math.max(1, r.left + r.width / 2), (window.innerWidth || 1000) - 2);
      for (var pass = 0; pass < 6; pass++) {
        var el = document.elementFromPoint(x, header + 2), hit = null;
        while (el && el !== document.body && el !== document.documentElement) {
          if (el === f) break;
          var cs = getComputedStyle(el);
          if ((cs.position === "fixed" || cs.position === "sticky") && cs.visibility !== "hidden") { hit = el; break; }
          el = el.parentElement;
        }
        if (!hit) break;
        var b = hit.getBoundingClientRect().bottom;
        if (b <= header + 1) break;
        header = b;
      }
    } catch (x2) {}
    header = Math.min(header, vh / 3);
    var top = Math.max(0, header - r.top);
    var bottom = Math.min(r.height, vh - r.top);
    if (f.contentWindow) f.contentWindow.postMessage({ type: "wildlife-watch:viewport", top: top, height: Math.max(0, bottom - top) }, ORIGIN);
  }
  var ticking = false;
  function reportAll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; for (var k in frames) report(frames[k]); });
  }
  window.addEventListener("scroll", reportAll, { passive: true });
  window.addEventListener("resize", reportAll);

  function scan() {
    var els = document.querySelectorAll("[data-wildlife-watch]");
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
