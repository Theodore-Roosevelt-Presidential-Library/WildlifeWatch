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
    el.appendChild(f);
    frames[id] = f;
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data || !e.data.type) return;
    var f = frames[e.data.id];
    if (!f) return;
    if (e.data.type === "wildlife-watch:height" && e.data.height) f.style.height = Math.ceil(e.data.height) + "px";
    if (e.data.type === "wildlife-watch:scrolltop") f.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function scan() {
    var els = document.querySelectorAll("[data-wildlife-watch]");
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
