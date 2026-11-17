# Design — Haunted Harvest

## Overview
Single-page static app. Three layers: pure logic (`js/engine.js`), one network module
(`js/weather.js`), and DOM wiring (`js/app.js`). Knowledge lives in `data/knowledge.json`
and is the single source of truth for the app, the tests, and the MCP server.

## Architecture
- **No framework, no build.** `index.html` loads `css/style.css` and `js/app.js` as a module.
- **Engine (pure).** `diagnose(cropId, symptomIds, knowledge)` returns ranked conditions
  with `score`, `matched`, `confidence`. `moonPhase(date)` returns `{ fraction,
  illumination, name, ageDays }`. `plantingWindows(cropId, fromDate, days, knowledge)`
  returns non-overlapping sowing windows from the crop's season data. `nextFullMoon(date)`,
  `nextNewMoon(date)`. All functions are deterministic and take explicit inputs so tests
  can drive them without DOM, network, or clock.
- **Weather.** `fetchForecast(lat, lon)` calls Open-Meteo daily forecast; `geocode(name)`
  calls the Open-Meteo geocoding API. `sprayVerdict(day)` is pure: rain probability
  >= 70% means "don't spray". Failures return `{ offline: true }` and the UI shows the
  bundled sample forecast with a notice.
- **State.** Tab selection + selected crop + checked symptoms live in memory; the harvest
  log persists in `localStorage` under key `haunted-harvest-log-v1`.
- **MCP server.** `.kiro/mcp-server/crop-knowledge-server.mjs` is a zero-dependency stdio
  JSON-RPC server implementing the MCP `initialize`, `tools/list`, `tools/call` methods
  with three tools: `diagnose`, `moon_phase`, `crop_info`. It reads `data/knowledge.json`
  and reuses the same scoring rules as the engine (documented, not shared code — the
  browser bundle must stay dependency-free and the server runs under Node).

## Data model (data/knowledge.json)
```json
{
  "crops": [{ "id": "rice", "name": "Rice", "local": "Padi",
              "season": "wet", "daysToHarvest": 110,
              "sowingMonths": [10, 11, 12, 1, 2, 3] }],
  "conditions": [{
    "id": "rice-blast", "crop": "rice", "name": "Rice blast",
    "latin": "Pyricularia oryzae", "type": "fungus",
    "monster": "The Grey Reaper", "severity": 5,
    "symptoms": [{ "id": "blast-leaf-spots", "text": "Diamond-shaped grey spots on leaves" }],
    "cause": "...", "organic": "...", "chemical": "...", "prevention": "...",
    "favorable": "Cool nights, long leaf wetness"
  }]
}
```
Severity is 1-5. Every condition has >= 3 symptoms. Symptom ids are globally unique.

## Diagnosis scoring
`score = matchedSymptoms / totalSymptoms`. Ties break by severity desc, then name asc.
Confidence: score >= 0.6 High, >= 0.35 Medium, else Low. A condition with zero matched
symptoms is excluded. An exact full-symptom match always ranks first for its crop
(verified by a property-based test).

## Moon phase math
Synodic month 29.530588853 days. Reference new moon: 2000-01-06 18:14 UTC (JD 2451550.1).
`fraction = ((date - ref) / synodicDays) mod 1`. Phase names split the cycle into 8
equal slices. Illumination = (1 - cos(2*pi*fraction)) / 2.

## UI
Five tabs: Weather Oracle, Moon Almanac, Crop Doctor, Pest Bestiary, Harvest Log.
Dark theme: near-black purple background (#14091f), pumpkin orange (#ff7a1a) accents,
ghost green (#9dff6e) for healthy/safe states, bone white text. Cards with 1px borders,
no heavy images (fast on cheap phones). All copy in `js/strings.js`.

## Testing
- `tests/engine.test.mjs`: unit tests for diagnose/moon/planting/spray verdict.
- `tests/pbt.mjs`: seeded PRNG, 200 cases per property (determinism, score bounds,
  full-match-first, moon bounds, window validity).
- `scripts/validate-knowledge.mjs`: structural validation of knowledge.json
  (unique ids, every condition references a known crop, >= 3 symptoms, severity 1-5).
