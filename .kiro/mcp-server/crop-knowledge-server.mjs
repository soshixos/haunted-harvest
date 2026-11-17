// Crop Knowledge MCP server — zero-dependency stdio JSON-RPC server.
// Exposes data/knowledge.json to Kiro as three tools: diagnose, moon_phase, crop_info.
// Protocol: newline-delimited JSON-RPC 2.0 (MCP over stdio).
// Run: node .kiro/mcp-server/crop-knowledge-server.mjs
// Diagnosis and moon math are imported from js/engine.js (single source of truth)
// so the server can never silently diverge from the app.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { diagnose as engineDiagnose, moonPhase as engineMoonPhase, confidenceFor } from "../../js/engine.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const KNOWLEDGE = JSON.parse(readFileSync(join(ROOT, "data", "knowledge.json"), "utf8"));

function moonPhase(date) {
  const p = engineMoonPhase(date);
  return { fraction: p.fraction, illumination: p.illumination, name: p.name };
}

function diagnose(crop, symptomIds) {
  return engineDiagnose(crop, symptomIds, KNOWLEDGE)
    .map(({ id, name, latin, type, monster, severity, matched, score, cause, organic, chemical, prevention }) => ({
      id, name, latin, type, monster, severity, matched, score: +score.toFixed(3),
      confidence: confidenceFor(score),
      cause, organic, chemical, prevention,
    }));
}

const TOOLS = [
  { name: "diagnose", description: "Rank likely crop diseases/pests for a crop given observed symptom ids. Input: { crop, symptoms: string[] }. Uses the same rule-based scoring as js/engine.js.", inputSchema: { type: "object", properties: { crop: { type: "string" }, symptoms: { type: "array", items: { type: "string" } } }, required: ["crop", "symptoms"] } },
  { name: "moon_phase", description: "Compute the moon phase for an ISO date. Input: { date }. Returns fraction, illumination and phase name.", inputSchema: { type: "object", properties: { date: { type: "string" } }, required: ["date"] } },
  { name: "crop_info", description: "Return the knowledge-base entry for a crop and its conditions. Input: { crop }.", inputSchema: { type: "object", properties: { crop: { type: "string" } }, required: ["crop"] } },
];

function result(id, payload) {
  return JSON.stringify({ jsonrpc: "2.0", id, result: payload });
}
function textResult(id, obj) {
  return result(id, { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === "initialize") {
      process.stdout.write(result(msg.id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "crop-knowledge", version: "1.0.0" } }) + "\n");
    } else if (msg.method === "notifications/initialized") {
      // no-op
    } else if (msg.method === "tools/list") {
      process.stdout.write(result(msg.id, { tools: TOOLS }) + "\n");
    } else if (msg.method === "tools/call") {
      const { name, arguments: args = {} } = msg.params || {};
      try {
        if (name === "diagnose") process.stdout.write(textResult(msg.id, diagnose(args.crop, args.symptoms || [])) + "\n");
        else if (name === "moon_phase") process.stdout.write(textResult(msg.id, moonPhase(new Date(args.date))) + "\n");
        else if (name === "crop_info") {
          const crop = KNOWLEDGE.crops.find((c) => c.id === args.crop);
          if (!crop) throw new Error(`unknown crop: ${args.crop}`);
          process.stdout.write(textResult(msg.id, { crop, conditions: KNOWLEDGE.conditions.filter((c) => c.crop === args.crop) }) + "\n");
        } else throw new Error(`unknown tool: ${name}`);
      } catch (err) {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32602, message: String(err.message || err) } }) + "\n");
      }
    } else if (msg.method === "ping") {
      process.stdout.write(result(msg.id, {}) + "\n");
    }
  }
});
