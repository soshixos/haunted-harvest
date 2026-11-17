// Validates data/knowledge.json structure. Exit 0 = valid, 1 = problems found.
// Used by npm run validate and the .kiro/hooks/knowledge-guard.json hook.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "data", "knowledge.json"), "utf8"));
const errors = [];
const seenSymptomIds = new Set();
const cropIds = new Set((data.crops || []).map((c) => c.id));

if (!Array.isArray(data.crops) || data.crops.length === 0) errors.push("crops must be a non-empty array");
for (const crop of data.crops || []) {
  if (!crop.id || !crop.name) errors.push(`crop missing id/name: ${JSON.stringify(crop)}`);
  if (!Array.isArray(crop.sowingMonths) || crop.sowingMonths.some((m) => m < 1 || m > 12)) errors.push(`crop ${crop.id}: sowingMonths must be months 1-12`);
  if (!Number.isInteger(crop.daysToHarvest) || crop.daysToHarvest <= 0) errors.push(`crop ${crop.id}: daysToHarvest must be a positive integer`);
}
if (!Array.isArray(data.conditions) || data.conditions.length === 0) errors.push("conditions must be a non-empty array");
for (const c of data.conditions || []) {
  if (!c.id) errors.push("condition missing id");
  if (!cropIds.has(c.crop)) errors.push(`condition ${c.id}: unknown crop ${c.crop}`);
  if (!["fungus", "bacteria", "virus", "pest"].includes(c.type)) errors.push(`condition ${c.id}: bad type ${c.type}`);
  if (!Number.isInteger(c.severity) || c.severity < 1 || c.severity > 5) errors.push(`condition ${c.id}: severity must be 1-5`);
  if (!Array.isArray(c.symptoms) || c.symptoms.length < 3) errors.push(`condition ${c.id}: needs >= 3 symptoms`);
  for (const s of c.symptoms || []) {
    if (!s.id || !s.text) errors.push(`condition ${c.id}: symptom missing id/text`);
    if (seenSymptomIds.has(s.id)) errors.push(`duplicate symptom id: ${s.id}`);
    seenSymptomIds.add(s.id);
  }
  for (const f of ["name", "latin", "monster", "cause", "organic", "chemical", "prevention", "favorable"]) {
    if (!c[f] || typeof c[f] !== "string") errors.push(`condition ${c.id}: missing ${f}`);
  }
  if (/mg\/L|ml\/L|g\/L|ppm|dose:/i.test(c.chemical)) errors.push(`condition ${c.id}: chemical advice must not state a dose — name the product class only`);
}

if (errors.length) {
  console.error(`knowledge.json INVALID (${errors.length} problem${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`knowledge.json valid: ${data.crops.length} crops, ${data.conditions.length} conditions, ${seenSymptomIds.size} symptoms.`);
