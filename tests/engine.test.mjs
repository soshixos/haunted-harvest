// Unit tests for js/engine.js — run with `npm test` (node --test).
import test from "node:test";
import assert from "node:assert/strict";
import knowledge from "../data/knowledge.json" with { type: "json" };
import {
  diagnose, confidenceFor, moonPhase, nextFullMoon, nextNewMoon, nextPhaseCrossing,
  moonGuidance, plantingWindows, sprayVerdict, dangerLabel, SYNODIC_DAYS, REF_NEW_MOON_MS,
} from "../js/engine.js";

test("diagnose: full symptom match ranks its condition first", () => {
  const blast = knowledge.conditions.find((c) => c.id === "rice-blast");
  const ids = blast.symptoms.map((s) => s.id);
  const results = diagnose("rice", ids, knowledge);
  assert.equal(results[0].id, "rice-blast");
  assert.equal(results[0].score, 1);
  assert.equal(results[0].confidence, "High");
});

test("diagnose: partial match scores proportionally and excludes zero matches", () => {
  const results = diagnose("tomato", ["eb-bullseye"], knowledge);
  const eb = results.find((r) => r.id === "tomato-early-blight");
  assert.equal(eb.matched, 1);
  assert.equal(eb.score, 0.25);
  assert.ok(results.every((r) => r.matched > 0));
  assert.ok(!results.some((r) => r.crop !== "tomato"));
});

test("diagnose: no symptoms means no results", () => {
  assert.deepEqual(diagnose("rice", [], knowledge), []);
});

test("diagnose: unknown symptom ids are ignored", () => {
  assert.deepEqual(diagnose("rice", ["not-a-symptom"], knowledge), []);
});

test("diagnose: ties break by severity, then name", () => {
  // One symptom each from two rice conditions with equal score 0.25:
  // rice-blb (severity 4) vs rice-stem-borer (severity 4) — tie on severity too,
  // so name order decides. Use blast (sev 5) vs blb (sev 4) instead.
  const results = diagnose("rice", ["blast-leaf-spots", "blb-water-soak"], knowledge);
  assert.equal(results[0].id, "rice-blast"); // severity 5 wins the 0.25 tie
  assert.equal(results[1].id, "rice-blb");
});

test("confidenceFor bands", () => {
  assert.equal(confidenceFor(0.6), "High");
  assert.equal(confidenceFor(0.59), "Medium");
  assert.equal(confidenceFor(0.35), "Medium");
  assert.equal(confidenceFor(0.34), "Low");
});

test("moonPhase: reference new moon is fraction ~0", () => {
  const p = moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)));
  assert.ok(p.fraction < 0.001 || p.fraction > 0.999);
  assert.equal(p.name, "New Moon");
  assert.ok(p.illumination < 0.01);
});

test("moonPhase: 2000-01-21 is just before full moon (mean synodic model)", () => {
  const p = moonPhase(new Date(Date.UTC(2000, 0, 21, 4, 40)));
  assert.equal(p.name, "Waxing Gibbous");
  assert.ok(p.fraction > 0.48 && p.fraction < 0.5, `fraction ${p.fraction}`);
  assert.ok(p.illumination > 0.99);
});

test("moonPhase: 2026-11-17 is first quarter (mean synodic model)", () => {
  const p = moonPhase(new Date(Date.UTC(2026, 10, 17, 12, 0)));
  assert.ok(p.fraction >= 0.25 && p.fraction < 0.375, `fraction ${p.fraction}`);
  assert.equal(p.name, "First Quarter");
});

test("nextFullMoon / nextNewMoon land within one cycle and near target phase", () => {
  const from = new Date(Date.UTC(2026, 10, 17, 12, 0));
  const full = nextFullMoon(from);
  const nm = nextNewMoon(from);
  assert.ok(full > from && full.getTime() - from.getTime() < SYNODIC_DAYS * 86400000);
  assert.ok(nm > from && nm.getTime() - from.getTime() < SYNODIC_DAYS * 86400000);
  assert.ok(Math.abs(moonPhase(full).fraction - 0.5) < 0.01);
  const nf = moonPhase(nm).fraction;
  assert.ok(nf < 0.01 || nf > 0.99);
});

test("nextPhaseCrossing: already exactly at the target fraction waits a full cycle", () => {
  // from is constructed so its phase fraction equals the target exactly:
  // delta = 0 must nudge to one full synodic cycle, not return `from` itself.
  const from = new Date(REF_NEW_MOON_MS + 0.5 * SYNODIC_DAYS * 86400000);
  const target = moonPhase(from).fraction;
  const next = nextPhaseCrossing(from, target);
  const diffDays = (next.getTime() - from.getTime()) / 86400000;
  assert.ok(Math.abs(diffDays - SYNODIC_DAYS) < 1e-6, `diff ${diffDays} days`);
  assert.ok(Math.abs(moonPhase(next).fraction - target) < 1e-9);
});

test("moonGuidance returns lore for every phase", () => {
  for (const name of ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"]) {
    assert.match(moonGuidance(name), /Tradition/);
  }
  assert.equal(moonGuidance("Purple Moon"), "No guidance for this phase.");
});

test("plantingWindows: rice in November has a window; harvest is daysToHarvest later", () => {
  const from = new Date(Date.UTC(2026, 10, 1));
  const days = 60;
  const windows = plantingWindows("rice", from, days, knowledge);
  assert.ok(windows.length > 0);
  const w = windows[0];
  assert.equal(w.start, "2026-11-01");
  assert.equal(w.harvestFrom, "2027-02-19"); // 110 days after Nov 1
  // Bound is derived from fromDate + days, never hardcoded: a range ending on
  // 31 Dec legitimately produces an end of 2027-01-01 (see the Dec test below).
  const rangeEnd = new Date(from.getTime() + days * 86400000).toISOString().slice(0, 10);
  for (const win of windows) {
    assert.ok(win.start < win.end);
    assert.ok(win.start >= "2026-11-01" && win.end <= rangeEnd);
  }
});

test("plantingWindows: range ending on 31 Dec may end the window on 2027-01-01", () => {
  const windows = plantingWindows("rice", new Date(Date.UTC(2026, 11, 2)), 30, knowledge);
  assert.equal(windows.length, 1);
  assert.equal(windows[0].start, "2026-12-02");
  assert.equal(windows[0].end, "2027-01-01");
});

test("plantingWindows: rice sowing season wraps the year boundary (Oct–Mar)", () => {
  // March is still in season; April–June is not.
  const mar = plantingWindows("rice", new Date(Date.UTC(2026, 2, 1)), 60, knowledge);
  assert.equal(mar.length, 1);
  assert.equal(mar[0].start, "2026-03-01");
  assert.equal(mar[0].end, "2026-04-01");
  assert.equal(mar[0].harvestFrom, "2026-06-19"); // 110 days after Mar 1
  assert.deepEqual(plantingWindows("rice", new Date(Date.UTC(2026, 3, 1)), 90, knowledge), []);
});

test("plantingWindows: unknown crop returns []", () => {
  assert.deepEqual(plantingWindows("durian", new Date(), 30, knowledge), []);
});

test("sprayVerdict thresholds", () => {
  assert.equal(sprayVerdict(70).spray, false);
  assert.equal(sprayVerdict(69).label, "Spray with care");
  assert.equal(sprayVerdict(40).label, "Spray with care");
  assert.equal(sprayVerdict(39).label, "Safe to spray");
  assert.equal(sprayVerdict(0).spray, true);
});

test("dangerLabel bands", () => {
  assert.equal(dangerLabel(5), "Deadly");
  assert.equal(dangerLabel(4), "Dangerous");
  assert.equal(dangerLabel(3), "Tricky");
  assert.equal(dangerLabel(2), "Mild");
  assert.equal(dangerLabel(1), "Mild");
});
