// app.js — DOM wiring only. All logic lives in engine.js / weather.js;
// all copy lives in strings.js.
import { diagnose, moonPhase, nextFullMoon, nextNewMoon, moonGuidance, plantingWindows, sprayVerdict, dangerLabel } from "./engine.js";
import { fetchForecast, geocode, DEFAULT_LOCATION, SAMPLE_FORECAST } from "./weather.js";
import { loadKnowledge } from "./data.js";
import { STRINGS } from "./strings.js";

const LOG_KEY = "haunted-harvest-log-v1";
let knowledge = null;
let currentLocation = { ...DEFAULT_LOCATION };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function initKnowledge() {
  knowledge = await loadKnowledge();
}

function fillCropSelects() {
  const options = knowledge.crops.map((c) => `<option value="${c.id}">${c.name} (${c.local})</option>`).join("");
  $("doctor-crop").innerHTML = options;
  $("moon-crop").innerHTML = options;
  $("log-crop").innerHTML = options;
  $("bestiary-crop").innerHTML = `<option value="">All crops</option>` + options;
}

// ---- Tabs ----
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    $("tab-" + tab.dataset.tab).classList.add("active");
  });
});

// ---- Weather ----
function renderForecast(data, locationName) {
  $("weather-location").textContent = `📍 ${locationName}`;
  const offlineEl = $("weather-offline");
  if (data.offline) {
    offlineEl.textContent = STRINGS.offlineNotice;
    offlineEl.classList.remove("hidden");
  } else {
    offlineEl.classList.add("hidden");
  }
  const d = data.daily;
  $("forecast").innerHTML = d.time.map((date, i) => {
    const v = sprayVerdict(d.precipitation_probability_max[i]);
    const cls = v.spray ? (v.label === "Safe to spray" ? "ok" : "care") : "no";
    const day = new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    return `<div class="day"><div class="date">${day}</div>
      <div class="temp">${d.temperature_2m_max[i]}° / ${d.temperature_2m_min[i]}°C</div>
      <div class="rain">🌧️ Rain chance: ${d.precipitation_probability_max[i]}%</div>
      <span class="verdict ${cls}">${v.spray ? "✅" : "🚫"} ${v.label}</span>
      <div class="rain">${v.reason}</div></div>`;
  }).join("");
}

async function loadWeather() {
  renderForecast(SAMPLE_FORECAST, currentLocation.name + " (loading…)");
  const data = await fetchForecast(currentLocation.latitude, currentLocation.longitude);
  renderForecast(data, currentLocation.name);
}

$("place-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("place-input").value.trim();
  if (!q) return;
  const results = await geocode(q);
  $("place-results").innerHTML = results.length
    ? results.map((r, i) => `<button type="button" data-i="${i}">${esc(r.name)}</button>`).join("")
    : `<p class="notice">No place found (or offline). Try a bigger nearby town.</p>`;
  $("place-results").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", async () => {
      const r = results[Number(b.dataset.i)];
      currentLocation = { name: r.name, latitude: r.latitude, longitude: r.longitude };
      $("place-results").innerHTML = "";
      await loadWeather();
    });
  });
});

// ---- Moon ----
function renderMoon(date = new Date()) {
  const now = date;
  const phase = moonPhase(now);
  const fmt = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("moon-now").innerHTML = `
    <div class="phase">${phase.name} ${phase.name === "Full Moon" ? "🌕" : phase.name === "New Moon" ? "🌑" : "🌙"}</div>
    <p>Illumination: <strong>${Math.round(phase.illumination * 100)}%</strong> · Moon age: <strong>${phase.ageDays.toFixed(1)} days</strong></p>
    <p>Next full moon: <strong>${fmt(nextFullMoon(now))}</strong><br>Next new moon: <strong>${fmt(nextNewMoon(now))}</strong></p>`;
  $("moon-guidance").textContent = moonGuidance(phase.name) + " (Traditional lore — always check the live forecast too.)";
  renderWindows();
}

function renderWindows() {
  const windows = plantingWindows($("moon-crop").value, new Date(), 60, knowledge);
  $("moon-windows").innerHTML = windows.length
    ? windows.map((w) => `<div class="window">🌱 Sow <strong>${w.start}</strong> → <strong>${w.end}</strong><br>🌾 Harvest from <strong>${w.harvestFrom}</strong></div>`).join("")
    : `<p class="notice">No sowing window for this crop in the next 60 days — check again next month.</p>`;
}

$("moon-crop").addEventListener("change", renderWindows);

// ---- Crop Doctor ----
function renderSymptoms() {
  const cropId = $("doctor-crop").value;
  const conditions = knowledge.conditions.filter((c) => c.crop === cropId);
  // Grouped by condition so symptoms from different culprits can't be confused.
  $("symptom-list").innerHTML = conditions.map((c) => `
    <fieldset class="symptom-group">
      <legend>${esc(c.name)} <span class="latin">“${esc(c.monster)}”</span></legend>
      ${c.symptoms.map((s) => `<label class="symptom"><input type="checkbox" value="${s.id}" data-condition="${c.id}">
      <span>${esc(s.text)}</span></label>`).join("")}
    </fieldset>`).join("");
  $("diagnosis").innerHTML = "";
  $("doctor-empty").classList.add("hidden");
}

$("doctor-crop").addEventListener("change", renderSymptoms);

$("diagnose-btn").addEventListener("click", () => {
  const checked = [...document.querySelectorAll("#symptom-list input:checked")].map((i) => i.value);
  if (!checked.length) {
    $("doctor-empty").classList.remove("hidden");
    $("diagnosis").innerHTML = "";
    return;
  }
  $("doctor-empty").classList.add("hidden");
  const results = diagnose($("doctor-crop").value, checked, knowledge);
  $("diagnosis").innerHTML = results.length ? results.map((r, i) => `
    <article class="result ${i === 0 ? "top" : ""}">
      <h3>${i === 0 ? "👻 Most likely: " : ""}${esc(r.name)} <span class="monster">“${esc(r.monster)}”</span></h3>
      <p class="latin">${esc(r.latin)} · ${esc(r.type)} · ${esc(r.crop)}</p>
      <p><span class="badge ${r.confidence === "High" ? "high" : r.confidence === "Medium" ? "med" : "low"}">${r.confidence} confidence</span>
      <span class="badge sev${r.severity}">Danger: ${dangerLabel(r.severity)} (${r.severity}/5)</span>
      <span class="badge low">${r.matched}/${r.symptoms.length} symptoms match (${Math.round(r.score * 100)}%)</span></p>
      <p><strong>Why:</strong> ${esc(r.cause)}</p>
      <p><strong>🌿 Organic fight:</strong> ${esc(r.organic)}</p>
      <p><strong>🧪 Chemical fight:</strong> ${esc(r.chemical)}</p>
      <p><strong>🛡️ Prevention:</strong> ${esc(r.prevention)}</p>
      <p><strong>Favourable to it:</strong> ${esc(r.favorable)}</p>
    </article>`).join("")
    : `<p class="notice">No condition matches those symptoms for this crop — try another crop or fewer symptoms.</p>`;
});

// ---- Bestiary ----
function renderBestiary() {
  const crop = $("bestiary-crop").value;
  const type = $("bestiary-type").value;
  const list = knowledge.conditions.filter((c) => (!crop || c.crop === crop) && (!type || c.type === type));
  $("bestiary-grid").innerHTML = list.map((c) => `
    <article class="card">
      <h3>👻 ${esc(c.monster)}</h3>
      <p><strong>${esc(c.name)}</strong> · <span class="latin">${esc(c.latin)}</span></p>
      <p><span class="badge sev${c.severity}">Danger: ${dangerLabel(c.severity)} (${c.severity}/5)</span>
      <span class="badge low">${esc(c.type)}</span>
      <span class="badge low">${esc(c.crop)}</span></p>
      <p><strong>Weakness:</strong> ${esc(c.organic)}</p>
      <details><summary>Full haunting file</summary>
        <p><strong>Signs:</strong> ${c.symptoms.map((s) => esc(s.text)).join("; ")}.</p>
        <p><strong>Why:</strong> ${esc(c.cause)}</p>
        <p><strong>Chemical fight:</strong> ${esc(c.chemical)}</p>
        <p><strong>Prevention:</strong> ${esc(c.prevention)}</p>
        <p><strong>Favourable to it:</strong> ${esc(c.favorable)}</p>
      </details>
    </article>`).join("") || `<p class="notice">No monsters match that filter.</p>`;
}

$("bestiary-crop").addEventListener("change", renderBestiary);
$("bestiary-type").addEventListener("change", renderBestiary);

// ---- Harvest log ----
function readLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
}
function writeLog(entries) {
  localStorage.setItem(LOG_KEY, JSON.stringify(entries));
}
function renderLog() {
  const entries = readLog().sort((a, b) => b.date.localeCompare(a.date));
  const byCrop = {};
  for (const e of entries) byCrop[e.crop] = (byCrop[e.crop] || 0) + 1;
  $("log-stats").textContent = entries.length
    ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"} — ` + Object.entries(byCrop).map(([c, n]) => `${c}: ${n}`).join(" · ")
    : "No entries yet — log your first sowing above.";
  $("log-list").innerHTML = entries.map((e, i) => `<li>
    <span><strong>${esc(e.date)}</strong> — ${esc(e.action)} ${esc(e.crop)}${e.note ? ` — ${esc(e.note)}` : ""}</span>
    <button type="button" data-i="${i}" aria-label="Delete entry">✕</button></li>`).join("");
  $("log-list").querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      const all = readLog().sort((a, b) => b.date.localeCompare(a.date));
      all.splice(Number(b.dataset.i), 1);
      writeLog(all);
      renderLog();
    });
  });
}

// The date field is pre-filled at load, but a tab left open past midnight would
// log a stale date. Only use the pre-filled value if the user hasn't touched it;
// otherwise the date they picked wins.
let logDateTouched = false;
$("log-date").addEventListener("change", () => { logDateTouched = true; });

$("log-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const entries = readLog();
  const date = logDateTouched ? $("log-date").value : new Date().toISOString().slice(0, 10);
  entries.push({ crop: $("log-crop").value, action: $("log-action").value, date, note: $("log-note").value.trim() });
  writeLog(entries);
  $("log-note").value = "";
  renderLog();
});

// ---- Init ----
$("doctor-disclaimer").textContent = STRINGS.disclaimer;
$("footer-text").textContent = STRINGS.footer;
$("log-date").value = new Date().toISOString().slice(0, 10);
await initKnowledge();
fillCropSelects();
renderSymptoms();
renderMoon();
renderBestiary();
renderLog();
await loadWeather();
