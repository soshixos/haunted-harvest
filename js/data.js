// data.js — the ONLY file (besides weather.js, which handles external Open-Meteo
// hosts) that touches the network, and only for same-origin local data.
// Loads the curated knowledge base. No external hosts, no keys, no tracking.
export async function loadKnowledge() {
  const res = await fetch("data/knowledge.json");
  return res.json();
}
