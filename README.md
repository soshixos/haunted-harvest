# 🎃 Haunted Harvest — Panen Hantu

**A haunted farmer's companion, built with Kiro for Kiroween 2026 (Frankenstein category).**

Smallholder farmers lose 20–40% of their yield to pests and disease, often because
advice arrives too late or not at all. Haunted Harvest stitches four incompatible things
into one free tool that works on a cheap phone:

1. **🌦️ Weather Oracle** — live 7-day forecast from Open-Meteo (free, no API key) with a
   spray / don't-spray verdict per day, plus place search via Open-Meteo geocoding.
   Offline? It shows a clearly-labelled sample forecast instead of failing.
2. **🌙 Moon Almanac** — astronomically computed moon phase, illumination, next full/new
   moon, traditional planting lore (labelled as tradition), and sowing windows with
   expected harvest dates for each crop.
3. **🩺 Crop Doctor** — a rule-based expert system over a curated knowledge base of
   24 diseases/pests across 6 crops (rice, chili, tomato, maize, shallot, soybean).
   Tick the symptoms you see; get ranked diagnoses with confidence, cause, organic
   and chemical treatment, and prevention.
4. **👻 Pest Bestiary** — every disease/pest as a monster card with its weakness.
5. **🌾 Harvest Log** — a planting/harvest journal stored only on the farmer's device.

**Free forever:** no accounts, no API keys, no backend, no tracking, no build step.
Serve the folder as static files and it runs.

## Run it

```bash
python3 -m http.server 8123
# open http://localhost:8123
```

Or open `index.html` directly (the weather panel needs http(s) for fetch; file:// works
for everything else except live weather).

## Test it

```bash
npm test        # 18 unit tests + 6 property-based properties x 200 seeded cases
npm run validate  # validates data/knowledge.json
```

## Honesty note

The Crop Doctor is a **rule-based** expert system, not AI image diagnosis and not a
laboratory test. Treatment advice names product **classes** only (never doses) and the
app tells farmers to consult their local agricultural extension officer (penyuluh) for
severe outbreaks.

## How Kiro was used

This project was built spec-first with **Kiro CLI** (see `.kiro/` — committed, never
gitignored):

- **Spec-driven development** — `.kiro/specs/haunted-harvest/` holds requirements
  (EARS format), design, and a task list that the build followed step by step.
- **Steering** — `.kiro/steering/` (product, tech, structure) keeps every Kiro session
  aligned on the free-only, static-only, honesty-first rules.
- **Agent hooks** — `.kiro/hooks/` runs the test suite on every JS/data save and
  validates `data/knowledge.json` whenever it changes.
- **Custom agents** — `.kiro/agents/crop-doctor.md` (agronomy accuracy reviewer) and
  `harvest-reviewer.md` (code reviewer: pure-engine boundary, free-only constraints).
- **MCP** — `.kiro/mcp-server/crop-knowledge-server.mjs` is a zero-dependency stdio MCP
  server exposing the knowledge base as `diagnose`, `moon_phase`, and `crop_info`
  tools, registered in `.kiro/settings/mcp.json`.
- **Property-based testing** — the spec asked for it, Kiro's workflow delivered it:
  `tests/pbt.mjs` proves diagnosis determinism, score bounds, full-match-first
  ranking, moon-phase validity, and planting-window validity across random cases.

## Structure

```
index.html  css/style.css
js/engine.js    pure logic: diagnose(), moonPhase(), plantingWindows(), sprayVerdict()
js/weather.js   the ONLY network code (Open-Meteo forecast + geocoding)
js/strings.js   all user-visible copy
js/app.js       DOM wiring only
data/knowledge.json   6 crops, 24 conditions, 96 symptoms — single source of truth
tests/          engine.test.mjs (node:test) + pbt.mjs (seeded property tests)
scripts/validate-knowledge.mjs
.kiro/          steering, specs, hooks, agents, MCP server + settings
```

## Credits

Built by Yuni Agung Saputra (B.Sc. Agrotechnology, Universitas Muhammadiyah Purwokerto).
Weather: [Open-Meteo](https://open-meteo.com/) (free, no key). Moon math: mean synodic
month, 29.530588853 days. License: MIT.
