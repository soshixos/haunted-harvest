// engine.js — pure, deterministic logic for Haunted Harvest.
// No DOM, no fetch, no Date.now(), no randomness. Dates and data are parameters
// so every function is unit-testable and property-testable.
export const SYNODIC_DAYS = 29.530588853;
// NOTE: Date.UTC is a pure mathematical conversion here (no clock read, no
// randomness, deterministic) — the constant is fixed at module load, so the
// engine stays pure: every exported function depends only on its arguments.
export const REF_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC

export const PHASE_NAMES = [
  "New Moon",
  "Waxing Crescent",
  "First Quarter",
  "Waxing Gibbous",
  "Full Moon",
  "Waning Gibbous",
  "Last Quarter",
  "Waning Crescent",
];

/** Rank conditions of a crop by how many of their symptoms were observed.
 *  Returns matches sorted by score desc, severity desc, name asc.
 *  Score = matched / total symptoms. Conditions with zero matches are excluded. */
export function diagnose(cropId, symptomIds, knowledge) {
  const wanted = new Set(symptomIds);
  return knowledge.conditions
    .filter((c) => c.crop === cropId)
    .map((c) => {
      const matched = c.symptoms.filter((s) => wanted.has(s.id)).length;
      const score = c.symptoms.length ? matched / c.symptoms.length : 0;
      return { ...c, matched, score, confidence: confidenceFor(score) };
    })
    .filter((c) => c.matched > 0)
    .sort((a, b) => b.score - a.score || b.severity - a.severity || a.name.localeCompare(b.name));
}

export function confidenceFor(score) {
  if (score >= 0.6) return "High";
  if (score >= 0.35) return "Medium";
  return "Low";
}

/** Moon phase for a Date. fraction in [0, 1); illumination in [0, 1]. */
export function moonPhase(date) {
  const days = (date.getTime() - REF_NEW_MOON_MS) / 86400000;
  const fraction = (((days / SYNODIC_DAYS) % 1) + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  return {
    fraction,
    illumination,
    ageDays: fraction * SYNODIC_DAYS,
    name: PHASE_NAMES[Math.floor(fraction * 8) % 8],
  };
}

/** Next date (after `from`) whose phase fraction crosses the given target fraction. */
export function nextPhaseCrossing(from, targetFraction) {
  const current = moonPhase(from).fraction;
  let delta = targetFraction - current;
  if (delta <= 0) delta += 1;
  return new Date(from.getTime() + delta * SYNODIC_DAYS * 86400000);
}

export function nextFullMoon(from) {
  return nextPhaseCrossing(from, 0.5);
}

export function nextNewMoon(from) {
  return nextPhaseCrossing(from, 0);
}

/** Traditional planting guidance for a moon phase. Labelled as lore, not science. */
export function moonGuidance(phaseName) {
  const guide = {
    "New Moon": "Tradition: sow seeds of crops that bear above ground — the moon's pull is said to draw moisture up. Good days to start seedbeds.",
    "Waxing Crescent": "Tradition: keep sowing leafy crops and transplant seedlings — growth energy is rising.",
    "First Quarter": "Tradition: plant fruiting crops (chili, tomato) now; strong root growth is expected.",
    "Waxing Gibbous": "Tradition: last good sowing days before the full moon; prepare beds and fertilise.",
    "Full Moon": "Tradition: harvest root crops and rest the soil — sap is said to rise to the leaves, so pests are more active. Avoid spraying tonight.",
    "Waning Gibbous": "Tradition: plant root crops (shallot sets) and prune; energy moves downward.",
    "Last Quarter": "Tradition: weed, compost, and maintain — a poor time to sow, a good time to clean the field.",
    "Waning Crescent": "Tradition: rest the field, plan the next season, and prepare seed.",
  };
  return guide[phaseName] || "No guidance for this phase.";
}

/** Sowing windows for a crop in the next `days` days from `fromDate`.
 *  A window opens on a day whose month is in the crop's sowingMonths.
 *  Windows are non-overlapping, within range, and carry the expected harvest date. */
export function plantingWindows(cropId, fromDate, days, knowledge) {
  const crop = knowledge.crops.find((c) => c.id === cropId);
  if (!crop) return [];
  const start = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const windows = [];
  let open = null;
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const inSeason = crop.sowingMonths.includes(d.getUTCMonth() + 1);
    if (inSeason && !open) open = new Date(d);
    if ((!inSeason || i === days - 1) && open) {
      const end = new Date(d.getTime() + (inSeason && i === days - 1 ? 86400000 : 0));
      windows.push({
        start: iso(open),
        end: iso(end),
        harvestFrom: iso(new Date(open.getTime() + crop.daysToHarvest * 86400000)),
      });
      open = null;
    }
  }
  return windows;
}

/** Spray verdict for one forecast day. Rain probability >= 70% means don't spray. */
export function sprayVerdict(precipitationProbabilityMax) {
  if (precipitationProbabilityMax >= 70) return { spray: false, label: "Don't spray", reason: "Rain likely — spray would wash off." };
  if (precipitationProbabilityMax >= 40) return { spray: true, label: "Spray with care", reason: "Some rain risk — spray early in the morning." };
  return { spray: true, label: "Safe to spray", reason: "Low rain risk." };
}

/** Danger label for a condition's severity (1-5). */
export function dangerLabel(severity) {
  if (severity >= 5) return "Deadly";
  if (severity === 4) return "Dangerous";
  if (severity === 3) return "Tricky";
  return "Mild";
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}
