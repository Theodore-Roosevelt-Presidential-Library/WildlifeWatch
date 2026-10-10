# Fact check and sources

Status of every factual claim in Wildlife Watch. **Verified** = matches a primary or official source listed. **Flag** = needs a decision or a second source before the trlibrary.com page launches.

## Needs review before launch

| # | Item | Where | Why | Route to |
|---|---|---|---|---|
| 1 | Sitting Bull / Fort Buford origin story for some Badlands horses | Horses timeline ("A disputed origin story") | Popular tradition; documentation is thin and contested (Wikipedia/Nokota sources; the Nokota Horse Association disputed it). Copy presents it as contested. Also touches Native history. | Annalisa Robinson-Melton + Bridget (Indigenous content); Susan Sarna |
| 2 | "Spread north across the Great Plains and transform life on the grasslands" | Horses timeline, 1500s | General statement about the horse's arrival on the Plains; keeps tribal specifics out on purpose. | Annalisa Robinson-Melton + Bridget |
| 3 | Wild Horses Protection Act (S. 1377): introduced April 9, 2025; requires ≥150 genetically diverse horses in the South Unit; passed Senate June 11, 2026 | Horses timeline, last entry | House action not confirmed. Update the entry when the bill moves or becomes law. Politically adjacent. | Robbie → Bridget (Javelin) |
| 4 | Herd count "~200" | Horses section | NPS figure; advocates (CHWHA) reported 196 in March 2026. Confirm with the park before launch. | — |
| 5 | Partner links: Chasing Horses Wild Horse Advocates, ND Badlands Horse Registry, Nokota Horse Conservancy | Horses section | Listing outside advocacy groups implies endorsement. The Registry link points to an American Wild Horse Conservation story because the Registry's own site could not be confirmed. | Matt / Robbie |
| 6 | NPS photo credits: a few NPS gallery photos carry no named photographer and are credited "NPS Photo" | `assets/photos/credits.json` | NPS-credited photos without a © are public domain; spot-check the blank-credit ones on nps.gov. | — |
| 7 | Viewing-spot notes (e.g., "east side from Boicourt to Buck Hill is classic wild horse country") | `data/spots.json` | Drawn from the NPS wildlife-viewing page, the park guide in the project files and iNaturalist report density. A quick read by park staff would strengthen it. | TRNP interpretation staff |
| 8 | Recent-reports feed | Recent Reports tab | Uses public iNaturalist data with a 2-day delay and area-level rollups. Recommend telling TRNP before launch so the park isn't surprised. | Matt → TRNP |

No T.R. quotations are used anywhere in the tool. A candidate line about elk appears in an NPS photo caption ("stately and splendid deer…") — do not use unless verified at trlibrary.com/gpt.

## Verified

**Horses**
- Horses vanished from North America ~10,000 years ago; Spanish reintroduced them in the 1500s; mustangs ranged the plains 1600s–1800s; ranchers turned horses out on the open range — [NPS Horse History](https://www.nps.gov/thro/learn/nature/horse-history.htm)
- 1954 roundup removed ~200 branded animals after fencing; a few bands evaded capture; NPS then tried to remove all horses — NPS Horse History
- 1970 policy: horses managed as a historic demonstration herd — NPS Horse History; [1970 Horse Management Plan](https://www.nps.gov/thro/learn/nature/upload/1970-Horse-Management-Plan-508.pdf)
- 1971 Wild Free-Roaming Horses and Burros Act does not cover the park — NPS Horse History
- Bands of 5–15; 11-month gestation, spring foals; young leave at 2–3 years — NPS Horse History
- 2022 livestock management planning (comment period March 16–April 15, 2022) — [NPS news release](https://www.nps.gov/thro/learn/news/thro-proposed-livestock-management-plan.htm)
- April 25, 2024: NPS terminated the removal proposal — [Sen. Hoeven release](https://www.hoeven.senate.gov/newsroom/press-releases/hoeven-kaine-introduce-bipartisan-legislation-requiring-interior-department-to-maintain-wild-horses-at-theodore-roosevelt-national-park)
- Senate passage of S. 1377, June 11, 2026 — [E&E News](https://www.eenews.net/articles/senate-approves-wild-horse-wildfire-bills/)
- Kuntz brothers, Nokota Horse Conservancy, ND Badlands Horse Registry (2009), 1930s–50s removals, coat colors — [Wikipedia: Nokota horse](https://en.wikipedia.org/wiki/Nokota_horse) (secondary; good enough for general copy)
- Bald faces and dappling — NPS photo caption "Color Characteristics"
- T.R.'s favorite horse Manitou — NPS gallery caption (Theodore Roosevelt Center photo). Confirm with Susan Sarna if featured prominently.

**Bison**
- South Unit 1956: 29 bison from Fort Niobrara NWR; North Unit 1962: 20 from the South Unit; targets 200–500 (South) and 100–300 (North); surplus mostly to tribes — [NPS Bison Management](https://home.nps.gov/thro/learn/nature/bison-management.htm)
- T.R. arrived September 1883 to hunt bison — NPS; project files (`medora-knowledge-base.md`)
- USGS range data — Sargeant, McCann & Hodge, 2025, [doi:10.5066/P13M5MHT](https://doi.org/10.5066/P13M5MHT)

**Other species**
- Elk reintroduced 1985 from Wind Cave NP, South Unit only — [NPS Elk Management](https://www.nps.gov/thro/learn/nature/elk-management.htm); [NPS Wildlife Viewing](https://www.nps.gov/thro/planyourvisit/wildlife-viewing.htm)
- Bighorn: last native killed 1905; 1956 release by ND Game and Fish of BC bighorns; park transplants 1959–62 — [Prairie Public, Dakota Datebook](https://news.prairiepublic.org/podcast/dakota-datebook/2023-01-19/january-19-bighorn-sheep-in-theodore-roosevelt-national-park)
- Longhorn demonstration herd since 1967; Long X Trail — [NPS Longhorn History](https://www.nps.gov/thro/learn/nature/longhorn-cattle-history.htm)
- Where/when for each species, three large prairie dog towns in the South Unit, Caprock Coulee town, longhorns near mile 2, golden eagles at River Bend, bobcats rare, beavers on North Unit creeks and the Little Missouri — NPS Wildlife Viewing
- Prairie rattlesnake is the only venomous snake — NPS Wildlife Viewing
- Western meadowlark is North Dakota's state bird — NPS photo caption; widely documented

**Safety**
- "Maintain at least 25 yards distance from all wildlife"; no wildlife calls or spotlights; pets stay in vehicles — NPS Wildlife Viewing. (Note: `theodore_roosevelt_national_park_guide.md` in the project files says 100 yards for bison and elk; the tool follows NPS.)

**Time zones**
- South Unit/Medora on Mountain Time; North Unit on Central — project files (`medora-knowledge-base.md`)

## Photo sources

29 National Park Service photos of the park (public domain) via the NPS gallery and npsphotos.labs.trlibrary.com, plus 7 Wikimedia Commons images (white-tailed deer, bobcat, beaver, sharp-tailed grouse, burrowing owl, golden eagle, prairie dog town). Full list with licenses: `assets/photos/credits.json`, shown on the site under "Photo credits".
