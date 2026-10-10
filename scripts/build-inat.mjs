// Builds data/inat.json from iNaturalist community observations inside
// Theodore Roosevelt National Park (iNaturalist place 72793).
//
// Run: node scripts/build-inat.mjs   (Node 18+; no dependencies)
//
// Guardrails for the "recent reports" feed:
//  - No coordinates are published. Each report is rolled up to a named
//    viewing zone (data/zones.json).
//  - Reports newer than DELAY_DAYS are held back.
//  - Obscured / private iNaturalist locations are skipped.

import { readFile, writeFile } from "node:fs/promises";

const PLACE_ID = 72793;
const DELAY_DAYS = 2;      // hold back the most recent reports
const WINDOW_DAYS = 45;    // how far back "recent" looks
const GRID = 0.01;         // hotspot cell size in degrees (~1 km)
const MIN_CELL = 2;        // drop cells with a single report
const API = "https://api.inaturalist.org/v1";
const UA = "TRPL-WildlifeWatch/1.0 (wildlife.labs.trlibrary.com)";

const root = new URL("..", import.meta.url);
const species = JSON.parse(await readFile(new URL("data/species.json", root)));
const zones = JSON.parse(await readFile(new URL("data/zones.json", root)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path, params) {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (res.ok) { await sleep(1100); return res.json(); }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error(`Failed: ${url}`);
}

const iso = (d) => d.toISOString().slice(0, 10);
const now = new Date();
const d2 = new Date(now.getTime() - DELAY_DAYS * 864e5);
const d1 = new Date(now.getTime() - WINDOW_DAYS * 864e5);

function unitOf(lat) {
  if (lat >= 47.45) return "north";
  if (lat >= 47.15) return "elkhorn";
  return "south";
}
function zoneOf(lat, lng) {
  const unit = unitOf(lat);
  let best = null, bestD = Infinity;
  for (const z of zones) {
    if (z.unit !== unit) continue;
    const d = (z.lat - lat) ** 2 + ((z.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = z; }
  }
  return best;
}

const out = {
  generated: now.toISOString(),
  source: "iNaturalist community observations, Theodore Roosevelt National Park (place 72793)",
  window: { from: iso(d1), to: iso(d2), delayDays: DELAY_DAYS },
  species: {},
};

// Effort baseline: all reports of any living thing in the park, by month.
// Dividing a species' monthly reports by this corrects for the summer crowd —
// a species that "shows up" in July only because more people are visiting
// will not look like a July specialty.
{
  const all = await get("/observations/histogram", {
    place_id: PLACE_ID, verifiable: "true", date_field: "observed", interval: "month_of_year",
  });
  const mo = all.results.month_of_year || {};
  out.effort = Array.from({ length: 12 }, (_, i) => mo[i + 1] || 0);
}

for (const s of species) {
  if (!s.inat) continue;
  const base = { place_id: PLACE_ID, taxon_id: s.inat, verifiable: "true" };
  process.stdout.write(`${s.key} `);

  const month = await get("/observations/histogram", { ...base, date_field: "observed", interval: "month_of_year" });
  const hour = await get("/observations/histogram", { ...base, date_field: "observed", interval: "hour" });
  const mo = month.results.month_of_year || {};
  const hr = hour.results.hour || {};

  const unitCounts = {};
  for (const [unit, bbox] of Object.entries({
    south: { swlat: 46.85, swlng: -103.66, nelat: 47.06, nelng: -103.24 },
    north: { swlat: 47.50, swlng: -103.56, nelat: 47.66, nelng: -103.22 },
  })) {
    const r = await get("/observations", { ...base, ...bbox, per_page: 0 });
    unitCounts[unit] = r.total_results;
  }

  const recent = await get("/observations", {
    ...base, d1: iso(d1), d2: iso(d2), per_page: 200, order_by: "observed_on",
  });
  const byZone = {};
  let used = 0;
  for (const o of recent.results) {
    if (o.obscured || !o.geojson || o.geoprivacy === "private" || o.taxon_geoprivacy === "obscured") continue;
    const [lng, lat] = o.geojson.coordinates;
    const z = zoneOf(lat, lng);
    if (!z) continue;
    used++;
    const day = o.observed_on || (o.time_observed_at || "").slice(0, 10);
    const e = (byZone[z.id] ||= { zone: z.id, count: 0, last: day });
    e.count++;
    if (day > e.last) e.last = day;
  }

  // All-time "where people have seen them" grid (~1 km cells, no exact points)
  const grid = {};
  let idAbove = 0;
  for (let page = 0; page < 15; page++) {
    const r = await get("/observations", { ...base, per_page: 200, order_by: "id", order: "asc", id_above: idAbove });
    if (!r.results.length) break;
    for (const o of r.results) {
      idAbove = o.id;
      if (o.obscured || !o.geojson) continue;
      const [lng, lat] = o.geojson.coordinates;
      const k = `${(Math.floor(lat / GRID) * GRID).toFixed(2)},${(Math.floor(lng / GRID) * GRID).toFixed(2)}`;
      grid[k] = (grid[k] || 0) + 1;
    }
    if (r.results.length < 200) break;
  }
  const cells = Object.entries(grid)
    .filter(([, n]) => n >= MIN_CELL)
    .map(([k, n]) => { const [la, ln] = k.split(",").map(Number); return [la, ln, n]; });

  out.species[s.key] = {
    cells,
    total: Object.values(mo).reduce((a, b) => a + b, 0),
    month: Array.from({ length: 12 }, (_, i) => mo[i + 1] || 0),
    hour: Array.from({ length: 24 }, (_, i) => hr[i] || 0),
    units: unitCounts,
    recent: { count: used, zones: Object.values(byZone).sort((a, b) => (a.last < b.last ? 1 : -1)) },
  };
}

await writeFile(new URL("data/inat.json", root), JSON.stringify(out, null, 1));
console.log(`\nWrote data/inat.json (${Object.keys(out.species).length} species)`);
