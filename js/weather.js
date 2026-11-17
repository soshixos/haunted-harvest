// weather.js — the ONLY file allowed to touch the network.
// Open-Meteo only (free, no API key): forecast + geocoding.
// All functions fail soft: on any error they resolve { offline: true } so the UI
// can show the bundled sample forecast with a clear notice.
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

export const DEFAULT_LOCATION = { name: "Purwokerto, Central Java", latitude: -7.42, longitude: 109.23 };

export const SAMPLE_FORECAST = {
  offline: true,
  locationName: DEFAULT_LOCATION.name,
  daily: {
    time: ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"],
    temperature_2m_max: [29.7, 29.2, 27.3, 28.5, 30.1, 29.0, 28.2],
    temperature_2m_min: [24.1, 23.6, 23.5, 23.8, 24.0, 23.9, 23.7],
    precipitation_probability_max: [100, 100, 100, 80, 60, 40, 30],
  },
};

export async function fetchForecast(latitude, longitude, days = 7) {
  const url = `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=${days}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { offline: false, daily: data.daily };
  } catch {
    return { ...SAMPLE_FORECAST };
  }
}

export async function geocode(name) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
      name: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}${r.country ? ", " + r.country : ""}`,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  } catch {
    return [];
  }
}
