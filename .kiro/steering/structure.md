---
inclusion: always
---
# Structure Steering — Haunted Harvest

```
haunted-harvest/
  index.html                 Entry point. Loads css/style.css + js/app.js (type=module).
  css/style.css              All styles. Dark haunted-harvest theme, mobile-first.
  js/
    engine.js                Pure logic: diagnose(), moonPhase(), plantingWindows(), bestiary helpers.
    weather.js               Open-Meteo fetch + geocoding + rain-risk verdict.
    strings.js               All user-visible copy.
    app.js                   DOM wiring, tab switching, renders. Imports engine + weather.
  data/knowledge.json        Crops, conditions (diseases/pests), symptoms, treatments.
  tests/
    engine.test.mjs          Unit tests (node:test).
    pbt.mjs                  Seeded property-based tests.
  scripts/validate-knowledge.mjs   JSON schema validation for data/knowledge.json.
  .kiro/
    steering/                This directory. Always-loaded product/tech/structure docs.
    specs/haunted-harvest/   requirements.md, design.md, tasks.md (spec-driven development).
    hooks/                   test-on-save + knowledge-guard (v1 JSON schema).
    agents/                  crop-doctor (agronomy review), harvest-reviewer (code review).
    settings/mcp.json        Registers the local crop-knowledge MCP server.
    mcp-server/              Zero-dependency stdio MCP server over data/knowledge.json.
  README.md  LICENSE (MIT)  package.json  .gitignore
```

## Rules
- `.kiro/` is committed. Never add it to `.gitignore` (Devpost disqualification risk).
- New features start as spec tasks in `.kiro/specs/haunted-harvest/tasks.md`, not as
  drive-by code edits. Update the task checkbox when the work lands with passing tests.
- Data changes go through `data/knowledge.json` + validation, never hardcoded in JS.
