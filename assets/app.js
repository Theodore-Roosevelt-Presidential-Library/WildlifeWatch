/* Wildlife Watch — Theodore Roosevelt Presidential Library
   Static app: all data lives in /data and is refreshed by a GitHub Action. */
(function () {
  "use strict";

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const UNIT_LABEL = { south: "South Unit", north: "North Unit", elkhorn: "Elkhorn Ranch" };
  const STATUS_LABEL = { native: "Native", reintroduced: "Brought back", historic: "Historic herd" };
  const PLACES = {
    south: { lat: 46.9165, lng: -103.5262, tz: "America/Denver", tzName: "Mountain Time", name: "South Unit (Medora)" },
    north: { lat: 47.6000, lng: -103.2601, tz: "America/Chicago", tzName: "Central Time", name: "North Unit" },
  };
  const params = new URLSearchParams(location.search);
  const EMBED = params.get("embed") === "1";
  const SINGLE = EMBED && params.get("view");

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const photo = (k) => `assets/photos/${k}.jpg`;

  let D = {}; // data
  const state = { group: "All", unit: "all", mapSpecies: "all", planMonth: new Date().getMonth() };

  // ---------- Load ----------
  async function load() {
    const get = (p) => fetch(p, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const [species, spots, zones, horses, inat, credits] = await Promise.all([
      get("data/species.json"), get("data/spots.json"), get("data/zones.json"),
      get("data/horses.json"), get("data/inat.json"), get("assets/photos/credits.json"),
    ]);
    D = { species, spots, zones, horses, inat: inat || { species: {}, effort: [] }, credits: credits || {} };
    D.byKey = Object.fromEntries(species.map((s) => [s.key, s]));
    D.zoneById = Object.fromEntries(zones.map((z) => [z.id, z]));
    D.spotById = Object.fromEntries(spots.map((s) => [s.id, s]));
  }

  // ---------- Helpers ----------
  // Effort-adjusted monthly report rate. Months when few people are in the park
  // (roughly November–March) return null — too little data to say.
  const MIN_EFFORT = 250;
  function relMonths(key) {
    const s = D.inat.species[key];
    const eff = D.inat.effort || [];
    if (!s || !eff.length || s.total < 15) return null;
    const r = s.month.map((n, i) => (eff[i] >= MIN_EFFORT ? n / eff[i] : null));
    const max = Math.max(...r.filter((v) => v != null)) || 1;
    return r.map((v) => (v == null ? null : v / max));
  }
  function credit(k) {
    const c = D.credits[k];
    if (!c) return "";
    return `${esc(c.artist)}${c.license && !/^Public domain \(National/.test(c.license) ? ` · ${esc(c.license)}` : ""}`;
  }
  function monthsDots(best) {
    return `<div class="months" aria-label="Best months: ${best.map((m) => MONTHS[m - 1]).join(", ")}">${MONTHS.map((_, i) => `<i class="${best.includes(i + 1) ? "on" : ""}" title="${MONTHS[i]}"></i>`).join("")}</div>`;
  }
  function daysAgo(iso) {
    const d = Math.round((Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5);
    return d <= 1 ? "yesterday" : `${d} days ago`;
  }
  function fmtTime(d, tz) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  }
  function minutesOfDay(d, tz) {
    const p = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric", hour12: false, timeZone: tz }).formatToParts(d);
    const h = +p.find((x) => x.type === "hour").value % 24, m = +p.find((x) => x.type === "minute").value;
    return h * 60 + m;
  }

  // ---------- Tabs / routing ----------
  const VIEWS = ["species", "horses", "map", "planner", "reports", "safety"];
  const rendered = {};
  function show(view, push = true) {
    if (!VIEWS.includes(view)) view = "species";
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== view));
    $$(".tabs [data-view]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === view)));
    if (!rendered[view]) { rendered[view] = true; RENDER[view]?.(); }
    if (view === "map" && MAP.map) setTimeout(() => MAP.map.invalidateSize(), 50);
    if (push && !EMBED) history.replaceState(null, "", `#${view}`);
    if (push && !EMBED && window.scrollY > $("#hero").offsetHeight) window.scrollTo({ top: $("#hero").offsetHeight + $(".masthead").offsetHeight, behavior: "smooth" });
    postHeight();
  }

  // ---------- Species ----------
  function renderSpecies() {
    const groups = ["All", "Mammals", "Birds", "Reptiles"];
    const units = [["all", "Both units"], ["south", "South Unit"], ["north", "North Unit"]];
    $("#species-filters").innerHTML =
      groups.map((g) => `<button class="chip" data-group="${g}" aria-pressed="${g === state.group}">${g}</button>`).join("") +
      `<span style="width:12px"></span>` +
      units.map(([u, l]) => `<button class="chip" data-unit="${u}" aria-pressed="${u === state.unit}">${l}</button>`).join("");
    $("#species-filters").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.group) state.group = b.dataset.group;
      if (b.dataset.unit) state.unit = b.dataset.unit;
      renderSpecies();
    };
    const list = D.species.filter((s) => (state.group === "All" || s.group === state.group) && (state.unit === "all" || s.units.includes(state.unit)));
    $("#species-grid").innerHTML = list.map((s) => `
      <button class="card${s.featured && state.group === "All" ? " feature" : ""}" data-species="${s.key}">
        <div class="ph" style="background-image:url('${photo(s.photo)}')" role="img" aria-label="${esc(s.name)}">
          <span class="badge ${s.status}">${STATUS_LABEL[s.status]}</span>
        </div>
        <div class="body">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.tagline)}</p>
          <div class="meta"><span class="units">${s.units.map((u) => UNIT_LABEL[u]).join(" · ")}</span>${monthsDots(s.best)}</div>
        </div>
      </button>`).join("");
    postHeight();
  }

  function barChart(values, labels, opts = {}) {
    const cols = values.length;
    return `<div class="chart"><div class="bars" style="grid-template-columns:repeat(${cols},1fr)">${values.map((v, i) =>
      (v == null ? `<div class="na ${opts.current === i ? "cur" : ""}" style="height:100%" title="${labels[i]}: too few reports"></div>` : `<div class="${v >= 0.66 ? "hi" : ""} ${opts.current === i ? "cur" : ""}" style="height:${Math.max(3, v * 100)}%" title="${labels[i]}"></div>`)).join("")}</div>
      <div class="labels" style="grid-template-columns:repeat(${cols},1fr)">${labels.map((l, i) => `<span>${opts.every && i % opts.every ? "" : l}</span>`).join("")}</div></div>`;
  }

  function openSpecies(key) {
    const s = D.byKey[key];
    if (!s) return;
    const pics = [s.photo, ...(s.gallery || [])];
    const now = new Date().getMonth() + 1;
    const rel = relMonths(key);
    const ins = D.inat.species[key];
    let hourHtml = "";
    if (ins && ins.total >= 40) {
      const max = Math.max(...ins.hour) || 1;
      hourHtml = `<h3 style="font-size:24px">When people photograph it</h3><p class="small">Reports by hour of day. Daytime reports reflect when people are out — dawn and dusk sightings are often underreported.</p>${barChart(ins.hour.map((v) => v / max), ins.hour.map((_, i) => (i === 0 ? "12a" : i === 12 ? "12p" : i < 12 ? i + "a" : i - 12 + "p")), { every: 3 })}`;
    }
    const spots = (s.spots || []).map((z) => D.zoneById[z]?.name).filter(Boolean);
    $("#drawer-body").innerHTML = `
      <div class="big" id="dr-big" style="background-image:url('${photo(pics[0])}')" role="img" aria-label="${esc(s.name)}"></div>
      ${pics.length > 1 ? `<div class="thumbs">${pics.map((p, i) => `<button data-pic="${p}" aria-current="${i === 0}" style="background-image:url('${photo(p)}')" aria-label="Photo ${i + 1}"></button>`).join("")}</div>` : ""}
      <div class="credit" id="dr-credit">Photo: ${credit(pics[0])}</div>
      <div class="content">
        <span class="badge ${s.status}">${STATUS_LABEL[s.status]}${s.statusNote ? " · " + esc(s.statusNote) : ""}</span>
        <h2 id="drawer-title" style="margin-top:10px">${esc(s.name)}</h2>
        <div class="sci">${esc(s.sci)}</div>
        <p class="lede" style="font-size:19px">${esc(s.story)}</p>
        <div class="facts">
          <div class="fact"><b>Look for</b><span>${esc(s.lookFor)}</span></div>
          <div class="fact"><b>Where</b><span>${esc(s.where)}</span></div>
          <div class="fact"><b>Best time</b><span>${esc(s.bestTime)}</span></div>
          <div class="fact"><b>Size</b><span>${esc(s.size)}</span></div>
        </div>
        ${s.tr ? `<div class="tr-note"><b>The Roosevelt connection</b>${esc(s.tr)}</div>` : ""}
        ${s.events && s.events.length ? `<h3 style="font-size:24px">Through the seasons</h3><ul class="events">${s.events.map((e) =>
          `<li class="${e.months.includes(now) ? "now" : ""}"><span class="when">${e.months.length > 2 ? MONTHS[e.months[0] - 1] + "–" + MONTHS[e.months[e.months.length - 1] - 1] : e.months.map((m) => MONTHS[m - 1]).join("–")}</span>${esc(e.label)}</li>`).join("")}</ul>` : ""}
        ${rel ? `<h3 style="font-size:24px;margin-top:18px">When it's reported</h3><p class="small">How often people report this animal each month, adjusted for how many people are in the park. Based on ${ins.total.toLocaleString()} iNaturalist observations. Hatched months have too few reports to judge.</p>${barChart(rel, MONTHS.map((m) => m[0]), { current: now - 1 })}` : ""}
        ${hourHtml}
        ${s.safety ? `<div class="safety"><b class="ui">Safety:</b> ${esc(s.safety)}</div>` : ""}
        ${spots.length ? `<p style="margin-top:18px"><button class="btn" data-mapfor="${s.key}">Show on the map</button></p>` : ""}
      </div>`;
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
    $(".drawer .sheet").scrollTop = 0;
    $(".drawer .close").focus();
    if (EMBED && window.parent !== window) window.parent.postMessage({ type: "wildlife-watch:scrolltop", id: params.get("id") }, "*");
  }
  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
  }

  // ---------- Horses ----------
  function renderHorses() {
    const H = D.horses;
    const tl = H.timeline.map((t) => `
      <div class="tl${t.flag ? " flag" : ""}">
        <div class="when">${esc(t.when)}</div>
        <h4>${esc(t.title)}</h4>
        <p>${esc(t.text)}</p>
      </div>`).join("");
    $("#horses-root").innerHTML = `
      <div class="horse-hero">
        <div>
          <div class="eyebrow">The wild horses of the South Unit</div>
          <h2>Running Wild Since the Open Range</h2>
          <p class="lede">${esc(H.intro)}</p>
          <div class="stat"><strong>${esc(H.count.value)}</strong><span class="small">${esc(H.count.note)}</span></div>
          <p><button class="btn" data-mapfor="horse">Where to see them</button> <button class="btn alt" data-species="horse">Field guide</button></p>
        </div>
        <div class="collage">
          <div style="background-image:url('${photo("horse")}')" role="img" aria-label="Gray wild horses"></div>
          <div style="background-image:url('${photo("horse-2")}')" role="img" aria-label="A band with a young foal"></div>
          <div style="background-image:url('${photo("horse-8")}')" role="img" aria-label="A band grazing on a hillside"></div>
        </div>
      </div>
      <div class="two">
        <div>
          <h3>How they got here</h3>
          <div class="timeline">${tl}</div>
        </div>
        <div>
          <div class="box">
            <h3>${esc(H.bands.title)}</h3>
            <div class="band-pts">${H.bands.points.map((p) => `<div><b>${esc(p.h)}</b>${esc(p.t)}</div>`).join("")}</div>
            <p style="font-size:16px;margin-bottom:0">${esc(H.bands.names)} <span class="small">(${esc(H.bands.namesSource)})</span></p>
          </div>
          <div class="box" style="margin-top:20px">
            <h3>Read the coats</h3>
            <p style="font-size:16px;margin:8px 0 0">The park's horses come in a wide range of colors. See how many you can spot.</p>
            <div class="coats">${H.coats.map((c) => `<div class="coat"><i style="background:${c.hex}"></i><div><b>${esc(c.name)}</b>${esc(c.note)}</div></div>`).join("")}</div>
          </div>
          <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${["horse-3", "horse-4", "horse-5", "horse-7"].map((p) => `<div style="aspect-ratio:4/3;border-radius:8px;background:url('${photo(p)}') center/cover" title="${esc(D.credits[p]?.caption || "")}"></div>`).join("")}
          </div>
          <p class="small">Photos: National Park Service.</p>
        </div>
      </div>
      <h3 style="margin-top:30px">Groups that champion the horses</h3>
      <div class="partners">${H.partners.map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noopener"><b>${esc(p.name)}</b><span>${esc(p.note)}</span></a>`).join("")}</div>`;
    postHeight();
  }

  // ---------- Map ----------
  const MAP = { map: null, layers: {} };
  const UNITS_VIEW = {
    south: { b: [[46.875, -103.60], [47.00, -103.36]], label: "South Unit" },
    north: { b: [[47.56, -103.47], [47.635, -103.24]], label: "North Unit" },
    elkhorn: { c: [47.2528, -103.6241], z: 13, label: "Elkhorn Ranch" },
    library: { c: [46.9173, -103.5494], z: 14, label: "The Library" },
  };
  function renderMap() {
    const sel = $("#map-species");
    sel.innerHTML = `<option value="all">All animals</option>` + D.species.map((s) => `<option value="${s.key}">${esc(s.name)}</option>`).join("");
    sel.value = state.mapSpecies;
    sel.onchange = () => { state.mapSpecies = sel.value; drawMapLayers(); };
    $("#map-units").innerHTML = Object.entries(UNITS_VIEW).map(([k, v]) => `<button class="chip" data-jump="${k}">${v.label}</button>`).join("");
    $("#map-units").onclick = (e) => { const b = e.target.closest("[data-jump]"); if (b) jump(b.dataset.jump); };

    const map = (MAP.map = L.map("map", { scrollWheelZoom: false, zoomControl: true }));
    const topo = L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, attribution: 'Tiles: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
    }).addTo(map);
    const img = L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, attribution: 'Tiles: <a href="https://www.usgs.gov/programs/national-geospatial-program/national-map">USGS The National Map</a>',
    });
    L.control.layers({ "Topo": topo, "Imagery": img }, null, { position: "topright" }).addTo(map);
    map.on("click", () => map.scrollWheelZoom.enable());
    jump("south");
    ["lyr-spots", "lyr-heat", "lyr-bison"].forEach((id) => ($("#" + id).onchange = drawMapLayers));
    drawMapLayers();
  }
  function jump(k) {
    const v = UNITS_VIEW[k];
    if (v.b) MAP.map.fitBounds(v.b); else MAP.map.setView(v.c, v.z);
  }
  async function drawMapLayers() {
    const map = MAP.map;
    Object.values(MAP.layers).forEach((l) => map.removeLayer(l));
    MAP.layers = {};
    const sp = state.mapSpecies;

    // Hotspot cells
    if ($("#lyr-heat").checked) {
      const agg = {};
      const keys = sp === "all" ? Object.keys(D.inat.species) : [sp];
      keys.forEach((k) => (D.inat.species[k]?.cells || []).forEach(([la, ln, n]) => {
        const id = la + "," + ln; agg[id] = (agg[id] || 0) + n;
      }));
      const entries = Object.entries(agg);
      const max = Math.max(1, ...entries.map((e) => e[1]));
      const g = L.layerGroup();
      entries.forEach(([id, n]) => {
        const [la, ln] = id.split(",").map(Number);
        const t = Math.log(n + 1) / Math.log(max + 1);
        L.rectangle([[la, ln], [la + 0.01, ln + 0.01]], { stroke: false, fillColor: "#E7805D", fillOpacity: 0.15 + 0.55 * t, interactive: true })
          .bindTooltip(`${n} report${n === 1 ? "" : "s"} in this square`).addTo(g);
      });
      MAP.layers.heat = g.addTo(map);
    }

    // USGS bison range
    if ($("#lyr-bison").checked) {
      if (!MAP.bison) MAP.bison = await fetch("data/bison_north_unit_range.geojson").then((r) => r.json());
      const fills = { 1: 0.65, 2: 0.45, 3: 0.3, 4: 0.16, 5: 0.06 };
      MAP.layers.bison = L.geoJSON(MAP.bison, {
        style: (f) => ({ color: "#5a3a22", weight: f.properties.band === 1 ? 1.5 : 0.6, fillColor: "#7a4a2b", fillOpacity: fills[f.properties.band] }),
        onEachFeature: (f, l) => l.bindTooltip(f.properties.label),
      }).addTo(map);
      if (sp === "all" || sp === "bison") { /* keep view */ }
    }

    // Spots
    const list = [];
    if ($("#lyr-spots").checked) {
      const g = L.layerGroup();
      D.spots.forEach((s) => {
        const hit = sp !== "all" && s.species.includes(sp);
        if (sp !== "all" && !hit && s.kind !== "start") return;
        const icon = L.divIcon({ className: "", html: `<div class="pin ${s.kind === "start" ? "start" : ""} ${hit ? "hit" : ""}"></div>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
        const names = s.species.map((k) => D.byKey[k]?.name).filter(Boolean);
        const m = L.marker([s.lat, s.lng], { icon, title: s.name }).bindPopup(
          `<b>${esc(s.name)}</b>${esc(s.note)}${names.length ? `<br><span style="color:#5d625f">Watch for: ${esc(names.join(", "))}</span>` : ""}<br><a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" rel="noopener">Directions</a>`);
        m.addTo(g);
        s._marker = m;
        if (sp === "all" ? s.kind !== "start" : hit) list.push(s);
      });
      MAP.layers.spots = g.addTo(map);
    }
    $("#spot-head").textContent = sp === "all" ? "Viewing spots" : `Where to look for ${D.byKey[sp].name.toLowerCase()}`;
    $("#spot-list").innerHTML = list.length
      ? list.map((s) => `<li><button data-spot="${s.id}">${esc(s.name)}<small>${UNIT_LABEL[s.unit]}</small></button></li>`).join("")
      : `<li class="small">${sp !== "all" ? esc(D.byKey[sp].where) : ""}</li>`;
    $("#spot-list").onclick = (e) => {
      const b = e.target.closest("[data-spot]");
      if (!b) return;
      const s = D.spotById[b.dataset.spot];
      map.setView([s.lat, s.lng], 14);
      s._marker?.openPopup();
    };
    if (sp !== "all") {
      const s = D.byKey[sp];
      if (s.units.length === 1 && s.units[0] === "north") jump("north");
      else if (s.units.length === 1 && s.units[0] === "south") jump("south");
    }
  }
  function mapFor(key) {
    state.mapSpecies = key;
    closeDrawer();
    if (rendered.map) { $("#map-species").value = key; drawMapLayers(); }
    if (key === "bison" && $("#lyr-bison")) $("#lyr-bison").checked = true;
    show("map");
  }

  // ---------- Planner ----------
  function renderPlanner() {
    const d = $("#plan-date");
    const today = new Date();
    d.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    d.onchange = updatePlanner;
    $("#plan-unit").onchange = updatePlanner;
    updatePlanner();
  }
  function updatePlanner() {
    const [y, m, dd] = $("#plan-date").value.split("-").map(Number);
    const unit = $("#plan-unit").value;
    const P = PLACES[unit];
    const t = WWSun.times(new Date(Date.UTC(y, m - 1, dd, 19)), P.lat, P.lng);
    const mins = (x) => minutesOfDay(x, P.tz) / 1440 * 100;
    $("#sunbar").innerHTML = `
      <div class="day" style="left:${mins(t.dawn)}%;width:${mins(t.dusk) - mins(t.dawn)}%"></div>
      <div class="gold" style="left:${mins(t.dawn)}%;width:${mins(t.goldenEnd) - mins(t.dawn)}%" title="Best wildlife window"></div>
      <div class="gold" style="left:${mins(t.goldenStart)}%;width:${mins(t.dusk) - mins(t.goldenStart)}%" title="Best wildlife window"></div>`;
    $("#plan-times").innerHTML = [
      ["First light", t.dawn], ["Sunrise", t.sunrise], ["Sunset", t.sunset], ["Last light", t.dusk],
    ].map(([l, v]) => `<div><b>${l}</b><span>${fmtTime(v, P.tz)}</span></div>`).join("");
    $("#plan-tz").textContent = `Times for the ${P.name}, in ${P.tzName}. Striped bands mark the best wildlife windows — first light to mid-morning, and late afternoon to dark. Note: the South Unit and Medora use Mountain Time; the North Unit uses Central Time.`;

    // month events
    const mo = m;
    $("#plan-month-title").textContent = `In ${MONTHS_LONG[mo - 1]}`;
    const evs = [];
    D.species.forEach((s) => (s.events || []).forEach((e) => {
      if (e.months.includes(mo) && s.units.includes(unit)) evs.push({ s, e });
    }));
    $("#plan-events").innerHTML = evs.length
      ? evs.map(({ s, e }) => `<li class="now"><span class="when">${esc(s.name)}</span>${esc(e.label)}</li>`).join("")
      : `<li>A quieter month — a good time for solitude and tracks in the snow.</li>`;

    // best bets
    const bets = D.species.filter((s) => s.units.includes(unit)).map((s) => {
      const rel = relMonths(s.key);
      const curated = s.best.includes(mo) ? 1 : 0;
      const score = rel && rel[mo - 1] != null ? 0.55 * rel[mo - 1] + 0.45 * curated : 0.6 * curated;
      return { s, score };
    }).filter((b) => b.score > 0.2).sort((a, b) => b.score - a.score).slice(0, 8);
    $("#plan-bets").innerHTML = bets.map(({ s, score }) => `
      <button class="bet" data-species="${s.key}">
        <div class="t" style="background-image:url('${photo(s.photo)}')"></div>
        <div><b>${esc(s.name)}</b><small>${esc(s.bestTime)}</small></div>
        <div class="meter" title="Relative odds"><i style="width:${Math.round(score * 100)}%"></i></div>
      </button>`).join("");

    // route
    const routes = {
      south: [
        ["library", "Start at the Library", "Get oriented to Roosevelt's Badlands years before you head into the park."],
        ["s-visitor", "South Unit Visitor Center", "Ask a ranger what's been seen today."],
        ["s-skyline", "Skyline Vista", "Prairie dogs and the first big view."],
        ["s-cottonwood", "Cottonwood bottoms", "Deer, turkeys and bison along the river."],
        ["s-windcanyon", "Wind Canyon", "Scan the floodplain for bison and eagles."],
        ["s-boicourt", "Boicourt Overlook to Buck Hill", "The heart of wild horse country. Go slow."],
        ["s-scoria", "Scoria Point", "Glass the slopes for horses and mule deer on the way back."],
        ["s-painted", "Painted Canyon (off I-94)", "Horses and bison are often visible in the canyon below."],
      ],
      north: [
        ["n-visitor", "North Unit Visitor Center", "Ask a ranger what's been seen today."],
        ["n-visitor", "Longhorn pasture (near mile 2)", "The demonstration herd of longhorn steers."],
        ["n-juniper", "Juniper Campground", "Bison, turkeys and deer in the river bottom."],
        ["n-caprock", "Caprock Coulee", "A one-mile hike to the North Unit's nearest prairie dog town."],
        ["n-oxbow", "Oxbow Overlook", "Scan the cliffs for bighorn sheep and eagles."],
      ],
    };
    $("#plan-route").innerHTML = routes[unit].map(([, h, t]) => `<li><b>${esc(h)}</b> — ${esc(t)}</li>`).join("") +
      `<li><b>Check conditions first.</b> Park roads can close for weather or construction — <a href="https://www.nps.gov/thro/planyourvisit/conditions.htm" target="_blank" rel="noopener">see current NPS conditions</a>.</li>`;

    // calendar file
    const start = new Date(t.dawn.getTime() - 15 * 60000);
    const end = new Date(t.sunrise.getTime() + 120 * 60000);
    const f = (x) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TRPL//Wildlife Watch//EN", "BEGIN:VEVENT",
      `UID:ww-${f(start)}-${unit}@wildlife.labs.trlibrary.com`, `DTSTAMP:${f(new Date())}`,
      `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
      `SUMMARY:Dawn wildlife drive — Theodore Roosevelt National Park`,
      `LOCATION:${unit === "south" ? "South Unit Visitor Center\\, Medora\\, ND" : "North Unit Visitor Center\\, Watford City\\, ND"}`,
      `DESCRIPTION:First light ${fmtTime(t.dawn, P.tz)}\\, sunrise ${fmtTime(t.sunrise, P.tz)}. Stay 25 yards from all wildlife. Plan at https://wildlife.labs.trlibrary.com`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    $("#plan-ics").href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    postHeight();
  }

  // ---------- Reports ----------
  function renderReports() {
    const w = D.inat.window;
    $("#reports-note").innerHTML = w
      ? `Reports from <b>${new Date(w.from + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</b> to <b>${new Date(w.to + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</b>, shared by people in the park on <a href="https://www.inaturalist.org/places/theodore-roosevelt" target="_blank" rel="noopener">iNaturalist</a>. To protect the animals, the newest ${w.delayDays} days are held back and no exact locations are shown. Animals move constantly — treat this as a hint, not a promise. Spotted something? <a href="https://www.inaturalist.org/observations/upload" target="_blank" rel="noopener">Share your photo</a> to help the park track its wildlife.`
      : "Recent reports are not available right now.";
    const items = D.species.map((s) => ({ s, r: D.inat.species[s.key]?.recent })).filter((x) => x.r && x.r.count > 0).sort((a, b) => b.r.count - a.r.count);
    $("#reports-grid").innerHTML = items.length ? items.map(({ s, r }) => `
      <div class="report">
        <button class="t" data-species="${s.key}" style="background-image:url('${photo(s.photo)}');border:0" aria-label="${esc(s.name)}"></button>
        <div>
          <b>${esc(s.name)}</b><span class="small">${r.count} report${r.count === 1 ? "" : "s"}</span>
          <ul>${r.zones.slice(0, 4).map((z) => `<li><span>${esc(D.zoneById[z.zone]?.name || z.zone)}</span><span>${daysAgo(z.last)}</span></li>`).join("")}</ul>
        </div>
      </div>`).join("") : `<p>No recent reports in the window. Ask at a visitor center for the latest.</p>`;

    const rows = D.species.map((s) => ({ s, rel: relMonths(s.key) })).filter((x) => x.rel);
    $("#heat").innerHTML = `<table><thead><tr><th></th>${MONTHS.map((m) => `<th>${m}</th>`).join("")}</tr></thead><tbody>${rows.map(({ s, rel }) =>
      `<tr><th class="sp">${esc(s.name)}</th>${rel.map((v, i) => v == null ? `<td class="na" title="${s.name}, ${MONTHS_LONG[i]}: too few reports"></td>` : `<td title="${s.name}, ${MONTHS_LONG[i]}" style="background:rgba(27,70,51,${(0.06 + 0.94 * v).toFixed(2)})"></td>`).join("")}</tr>`).join("")}</tbody></table>`;
    postHeight();
  }

  const RENDER = { species: renderSpecies, horses: renderHorses, map: renderMap, planner: renderPlanner, reports: renderReports, safety: () => {} };

  // ---------- Credits ----------
  function renderCredits() {
    $("#photo-credits").innerHTML = Object.entries(D.credits).map(([k, c]) =>
      `${esc(k)}: <a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.file)}</a> — ${esc(c.artist)} (${esc(c.license)})`).join("<br>");
    $("#photo-credits-link").onclick = (e) => { e.preventDefault(); $("#photo-credits").hidden = !$("#photo-credits").hidden; postHeight(); };
  }

  // ---------- Embed sizing ----------
  function postHeight() {
    if (!EMBED || window.parent === window) return;
    requestAnimationFrame(() => window.parent.postMessage({ type: "wildlife-watch:height", height: document.documentElement.scrollHeight, id: params.get("id") }, "*"));
  }

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const sp = e.target.closest("[data-species]");
    if (sp) { e.preventDefault(); openSpecies(sp.dataset.species); return; }
    const mf = e.target.closest("[data-mapfor]");
    if (mf) { e.preventDefault(); mapFor(mf.dataset.mapfor); return; }
    if (e.target.closest("[data-close]")) closeDrawer();
    const pic = e.target.closest("[data-pic]");
    if (pic) {
      $("#dr-big").style.backgroundImage = `url('${photo(pic.dataset.pic)}')`;
      $("#dr-credit").innerHTML = "Photo: " + credit(pic.dataset.pic);
      $$(".thumbs [data-pic]").forEach((b) => b.setAttribute("aria-current", String(b === pic)));
    }
    const tab = e.target.closest(".tabs [data-view]");
    if (tab) show(tab.dataset.view);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) show(v, false); });

  // ---------- Boot ----------
  (async function boot() {
    if (EMBED) { document.body.classList.add("embed"); if (SINGLE) document.body.classList.add("single"); }
    await load();
    renderCredits();
    const view = SINGLE || params.get("view") || (location.hash || "").slice(1) || "species";
    show(VIEWS.includes(view) ? view : "species", false);
    if (params.get("species")) openSpecies(params.get("species"));
    if (EMBED && "ResizeObserver" in window) new ResizeObserver(postHeight).observe(document.body);
  })();
})();
