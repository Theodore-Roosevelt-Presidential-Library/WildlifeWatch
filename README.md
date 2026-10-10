# WildlifeWatch

Guide to watching wildlife in Theodore Roosevelt National Park — a Theodore Roosevelt Presidential Library Labs tool.

**Live:** https://wildlife.labs.trlibrary.com (GitHub Pages)

## What's in it

| Section | What it does | Data |
|---|---|---|
| Meet the Wildlife | Field guide to 22 animals: story, what to look for, where, when, seasonal events, the T.R. connection, and charts of when each is reported | `data/species.json`, `data/inat.json` |
| The Wild Horses | How the horses got here (timeline), how bands work, a coat-color guide, and partner groups | `data/horses.json` |
| Where to Look | Map of viewing spots, ~1 km "where visitors report it" squares, and the USGS bison range from GPS collars (North Unit) | `data/spots.json`, `data/inat.json`, `data/bison_north_unit_range.geojson` |
| Plan Your Outing | Sunrise/sunset and best wildlife windows for any date (Mountain Time for the South Unit, Central for the North Unit), what's happening that month, best bets, a suggested route, and a calendar file for a dawn drive | computed in the browser |
| Recent Reports | iNaturalist reports from the last ~45 days, rolled up to named areas, newest 2 days held back, no coordinates | `data/inat.json` |
| Watch Safely | NPS 25-yard rule and viewing etiquette, plus a printable family checklist (`checklist.html`) | — |

## Embedding on trlibrary.com

Drop this into a Drupal Full HTML block. Each `div` becomes a self-sizing widget.

```html
<div data-wildlife-watch="horses"></div>
<script src="https://wildlife.labs.trlibrary.com/embed.js" async></script>
```

Views: `species`, `horses`, `map`, `planner`, `reports`, `safety`, or `all` (tabs included).
Optional: `data-species="bison"` opens one animal's card; `data-min-height="700"`.

Direct links work too: `https://wildlife.labs.trlibrary.com/#map`, `?species=horse`.

## Data refresh

`.github/workflows/refresh-data.yml` runs `node scripts/build-inat.mjs` daily and commits `data/inat.json` if it changed. No API keys needed. Run it by hand from the Actions tab ("Run workflow").

Guardrails in the build script:
- No exact locations are published. Recent reports roll up to the zones in `data/zones.json`; the map uses ~1 km squares with at least 2 reports.
- Reports from the last 2 days are held back (`DELAY_DAYS`).
- Obscured or private iNaturalist locations are skipped.
- Month charts are adjusted for how many people report anything in the park that month, so summer crowds don't make every animal look like a summer animal. Low-visitation months (roughly November–March) are shown as "too few reports".

## Editing content

- Animal text, seasons, best months: `data/species.json`
- Horse timeline, coat colors, partners: `data/horses.json`
- Map pins and notes: `data/spots.json`
- Photos: `assets/photos/` with credits in `assets/photos/credits.json`. Most are National Park Service photos of the park (public domain); a few come from Wikimedia Commons under the license listed. To swap in Acquia DAM photos, replace the file with the same name and update its credit.

Fonts load from trlibrary.com (Clearface, Dharma Gothic E, Frutiger). Maps use USGS The National Map tiles.

## Setup checklist

1. Settings → Pages: deploy from `main`, root folder. Custom domain `wildlife.labs.trlibrary.com` (the `CNAME` file is included); enforce HTTPS.
2. DNS: CNAME `wildlife.labs` → `theodore-roosevelt-presidential-library.github.io`.
3. Add the daily refresh workflow (remote tools can't write into `.github/`), from the repo folder in Terminal:
   `mkdir -p .github/workflows && cp docs/refresh-data.yml .github/workflows/`
4. Settings → Actions → General → Workflow permissions: "Read and write" so the daily refresh can commit.

See `docs/fact-check.md` for sources and items to verify before the trlibrary.com page goes live, and `docs/trlibrary-page-draft.md` for draft page copy.
