---
inclusion: always
---
# Tech Steering — Haunted Harvest

## Stack
- Vanilla HTML + CSS + vanilla JS modules. Zero dependencies, zero build step.
- `js/engine.js` — pure, deterministic logic (diagnosis, moon phase, planting calendar).
  No DOM, no fetch, no Date.now() inside pure functions (dates are parameters).
  This is the unit under test.
- `js/weather.js` — Open-Meteo client only (free, no API key). All network code lives here.
- `js/app.js` — DOM wiring only. No business logic.
- `data/knowledge.json` — the crop disease/pest knowledge base. Single source of truth,
  loaded by the app and by the MCP server. Validate with `node scripts/validate-knowledge.mjs`.

## Testing
- `node --test tests/` — Node built-in test runner. `tests/pbt.mjs` is a small seeded
  property-based harness (no dependency): every property runs 200 random cases.
- Properties that must always hold: diagnosis is deterministic; scores are in [0,1];
  a full symptom match ranks its condition first for its crop; moon phase fraction is
  in [0,1); planting windows stay inside the requested range and never overlap.
- Run `npm test` before every commit. The `.kiro/hooks/test-on-save.json` hook does this
  automatically on save in Kiro.

## Style
- Small functions, early returns, no cleverness. Comments explain WHY, not WHAT.
- All user-visible strings in `js/strings.js` so copy can be reviewed in one place.
- Never commit secrets. There are none by design — if a key ever appears, it is a bug.
