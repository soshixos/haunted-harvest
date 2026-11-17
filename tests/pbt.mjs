// pbt.mjs — tiny seeded property-based test harness (zero dependencies).
// Every property runs 200 random cases. Run with `npm test` or `node tests/pbt.mjs`.
import knowledge from "../data/knowledge.json" with { type: "json" };
import {
  diagnose, moonPhase, plantingWindows, sprayVerdict, PHASE_NAMES, SYNODIC_DAYS,
} from "../js/engine.js";

const SEED = 20261117;
let state = SEED >>> 0;
function rnd() {
  // mulberry32
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));

const failures = [];
function check(name, fn) {
  for (let i = 0; i < 200; i++) {
    try {
      const ok = fn(i);
      if (ok === false) throw new Error("property returned false");
    } catch (err) {
      failures.push(`${name} (case ${i}): ${err.message}`);
      break;
    }
  }
}

const allSymptoms = knowledge.conditions.flatMap((c) => c.symptoms.map((s) => s.id));

// 1. Diagnosis is deterministic.
check("diagnose is deterministic", () => {
  const crop = pick(knowledge.crops).id;
  const symptoms = allSymptoms.filter(() => rnd() < 0.3);
  const a = JSON.stringify(diagnose(crop, symptoms, knowledge));
  const b = JSON.stringify(diagnose(crop, symptoms, knowledge));
  return a === b;
});

// 2. Scores are always in [0, 1] and matched counts are consistent.
check("diagnose scores in [0,1] with consistent matched counts", () => {
  const crop = pick(knowledge.crops).id;
  const symptoms = allSymptoms.filter(() => rnd() < 0.3);
  for (const r of diagnose(crop, symptoms, knowledge)) {
    if (r.score < 0 || r.score > 1) return false;
    if (r.matched !== r.symptoms.filter((s) => symptoms.includes(s.id)).length) return false;
    if (Math.abs(r.score - r.matched / r.symptoms.length) > 1e-9) return false;
  }
  return true;
});

// 3. A full symptom match always ranks its condition first for its crop.
check("full symptom match ranks first", () => {
  const cond = pick(knowledge.conditions);
  const results = diagnose(cond.crop, cond.symptoms.map((s) => s.id), knowledge);
  return results.length > 0 && results[0].id === cond.id && results[0].score === 1;
});

// 4. Moon phase is always well-formed for any date 2000-2030.
check("moonPhase well-formed", () => {
  const d = new Date(Date.UTC(int(2000, 2030), int(0, 11), int(1, 28), int(0, 23), int(0, 59)));
  const p = moonPhase(d);
  return p.fraction >= 0 && p.fraction < 1 &&
    p.illumination >= 0 && p.illumination <= 1 &&
    PHASE_NAMES.includes(p.name) &&
    p.ageDays >= 0 && p.ageDays < SYNODIC_DAYS;
});

// 5. Planting windows stay in range, never overlap, harvest after sowing.
check("plantingWindows valid", () => {
  const crop = pick(knowledge.crops);
  const from = new Date(Date.UTC(int(2026, 2027), int(0, 11), 1));
  const days = int(30, 90);
  const end = new Date(from.getTime() + days * 86400000);
  const windows = plantingWindows(crop.id, from, days, knowledge);
  let prevEnd = "0000-00-00";
  for (const w of windows) {
    if (w.start < from.toISOString().slice(0, 10)) return false;
    if (w.end > end.toISOString().slice(0, 10)) return false;
    if (w.start <= prevEnd) return false; // overlap (incl. same-start duplicates)
    if (!(w.start < w.end)) return false;
    const harvest = new Date(w.start + "T00:00:00Z").getTime() + crop.daysToHarvest * 86400000;
    if (new Date(w.harvestFrom + "T00:00:00Z").getTime() !== harvest) return false;
    prevEnd = w.end;
  }
  return true;
});

// 6. Spray verdict only returns allowed labels and matches the 70% rule.
check("sprayVerdict consistent", () => {
  const p = int(0, 100);
  const v = sprayVerdict(p);
  const allowed = ["Don't spray", "Spray with care", "Safe to spray"];
  return allowed.includes(v.label) && v.spray === (p < 70);
});

if (failures.length) {
  console.error(`PBT FAILED (${failures.length}):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("PBT passed: 6 properties x 200 cases (seed 20261117).");
