import React, { useEffect, useState } from "react";

// ponytail: WMO weather codes -> label + emoji. Open-Meteo standard set.
const WEATHER = {
  0: ["Clear", "☀️"],
  1: ["Mainly Clear", "🌤️"],
  2: ["Partly Cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy Drizzle", "🌦️"],
  61: ["Light Rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy Rain", "🌧️"],
  66: ["Freezing Rain", "🌧️"],
  67: ["Freezing Rain", "🌧️"],
  71: ["Light Snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy Snow", "❄️"],
  77: ["Snow Grains", "🌨️"],
  80: ["Rain Showers", "🌧️"],
  81: ["Rain Showers", "🌧️"],
  82: ["Violent Showers", "⛈️"],
  85: ["Snow Showers", "🌨️"],
  86: ["Snow Showers", "🌨️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"],
  99: ["Thunderstorm", "⛈️"]
};
const wx = code => WEATHER[code] || ["Unknown", "❓"];

const DIRS = [
  "North", "Northeast", "East", "Southeast",
  "South", "Southwest", "West", "Northwest"
];
const windDir = deg => DIRS[Math.round(deg / 45) % 8];

const aqiLabel = aqi => {
  if (aqi == null) return "—";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Standard";
  if (aqi <= 150) return "Sensitive";
  return "Hazardous";
};
const uvLabel = uv => {
  if (uv == null) return "—";
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  return "Very High";
};

const dayName = iso =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" });

const timeOnly = iso =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  });

// ponytail: fallback to Banten/Jakarta if geolocation is denied, so the
// dashboard still renders something useful instead of an error wall.
const FALLBACK = { lat: -6.12, lon: 106.15, denied: true };

function Dashboard() {
  const [coords, setCoords] = useState(null);
  const [place, setPlace] = useState(null);
  const [data, setData] = useState(null);
  const [air, setAir] = useState(null);
  const [now, setNow] = useState(new Date());
  const [days5, setDays5] = useState(false);
  const [err, setErr] = useState(null);

  // live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // location
  useEffect(() => {
    if (!navigator.geolocation) return setCoords(FALLBACK);
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setCoords(FALLBACK),
      { timeout: 8000 }
    );
  }, []);

  // fetch weather + air + place name
  useEffect(() => {
    if (!coords) return;
    const { lat, lon } = coords;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility` +
        `&hourly=temperature_2m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max` +
        `&timezone=auto`
    )
      .then(r => r.json())
      .then(setData)
      .catch(() => setErr("Failed to load weather"));

    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`
    )
      .then(r => r.json())
      .then(setAir)
      .catch(() => {});

    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    )
      .then(r => r.json())
      .then(j =>
        setPlace(
          [j.city || j.locality, j.countryName].filter(Boolean).join(", ")
        )
      )
      .catch(() => setPlace("Your location"));
  }, [coords]);

  if (err) return <div className="state">{err}</div>;
  if (!data || !data.current)
    return <div className="state">Loading weather…</div>;

  const c = data.current;
  const d = data.daily;
  const [label, emoji] = wx(c.weather_code);
  const aqi = air && air.current ? air.current.us_aqi : null;

  // hourly buckets for "How's the temperature today?"
  const buckets = ["Morning", "Afternoon", "Evening", "Night"];
  const hours = [9, 15, 18, 21];
  const today = now.toISOString().slice(0, 10);
  const timeline = hours.map((h, i) => {
    const stamp = `${today}T${String(h).padStart(2, "0")}:00`;
    const idx = data.hourly.time.indexOf(stamp);
    const t = idx >= 0 ? Math.round(data.hourly.temperature_2m[idx]) : null;
    const code = idx >= 0 ? data.hourly.weather_code[idx] : 0;
    return { name: buckets[i], temp: t, emoji: wx(code)[1], active: h === 15 };
  });

  // sun arc progress
  const sr = new Date(d.sunrise[0]).getTime();
  const ss = new Date(d.sunset[0]).getTime();
  const prog = Math.max(0, Math.min(1, (now.getTime() - sr) / (ss - sr)));
  const sunX = 100 - 80 * Math.cos(Math.PI * prog);
  const sunY = 100 - 80 * Math.sin(Math.PI * prog);

  const tomorrow = {
    label: wx(d.weather_code[1])[0],
    emoji: wx(d.weather_code[1])[1],
    max: Math.round(d.temperature_2m_max[1]),
    rain: d.precipitation_probability_max[1]
  };

  const predictionDays = days5 ? 5 : 2;

  return (
    <div className="dash">
      {/* left rail */}
      <nav className="rail">
        <div className="logo">⛅</div>
        <button className="rail-btn active">🏠</button>
        <button className="rail-btn">📊</button>
        <button className="rail-btn">📍</button>
        <button className="rail-btn">☔</button>
        <button className="rail-btn">⚙️</button>
      </nav>

      {/* main */}
      <main className="main">
        <header className="topbar">
          <div className="hello">
            <div className="avatar">🧑</div>
            <div>
              <div className="muted">Hello,</div>
              <div className="name">Jack Grealish</div>
            </div>
          </div>
          <input className="search" placeholder="Search anything …" />
          <button className="bell">🔔</button>
        </header>

        <section className="cards2">
          <div className="card weather-card">
            <div className="card-head">
              <span>☁️ Weather</span>
              <span className="muted">What's the weather.</span>
            </div>
            <div className="big-temp">
              {Math.round(c.temperature_2m)}°C
              <span className="feels">
                {Math.round(c.apparent_temperature)}°C
              </span>
            </div>
            <div className="cond">
              {emoji} {label}
            </div>
            <div className="stat-row">
              <div className="stat dark">
                <div className="stat-label">Pressure</div>
                <div className="stat-val">
                  {Math.round(c.surface_pressure)}mb
                </div>
              </div>
              <div className="stat green">
                <div className="stat-label">Visibility</div>
                <div className="stat-val">
                  {(c.visibility / 1000).toFixed(1)} km
                </div>
              </div>
              <div className="stat light">
                <div className="stat-label">Humidity</div>
                <div className="stat-val">{c.relative_humidity_2m}%</div>
              </div>
            </div>
          </div>

          <div className="card air-card">
            <div className="card-head">
              <span>🌬️ Air Quality</span>
              <span className="muted">Main pollutant: PM 2.5</span>
            </div>
            <div className="big-temp">{aqi == null ? "—" : aqi}</div>
            <div className="cond">
              🪁 {windDir(c.wind_direction_10m)} Wind ·{" "}
              {Math.round(c.wind_speed_10m)} km/h
            </div>
            <div className="aqi-bar">
              <div className="aqi-scale">
                <span>Good</span>
                <span className="chip">{aqiLabel(aqi)}</span>
                <span>Hazardous</span>
              </div>
              <div className="aqi-track">
                <div
                  className="aqi-dot"
                  style={{ left: `${Math.min(100, (aqi || 0) / 3)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="cards2">
          <div className="card temp-today">
            <h3>How's the temperature today?</h3>
            <div className="timeline">
              {timeline.map(t => (
                <div
                  key={t.name}
                  className={`tl-item ${t.active ? "active" : ""}`}
                >
                  <div className="tl-icon">{t.emoji}</div>
                  <div className="tl-temp">{t.temp == null ? "—" : `${t.temp}°`}</div>
                  <div className="muted">{t.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card tomorrow">
            <div className="muted">Tomorrow</div>
            <div className="tm-label">{tomorrow.label}</div>
            <div className="tm-emoji">{tomorrow.emoji}</div>
            <div className="tm-temp">{tomorrow.max}°C</div>
            <div className="muted">
              {tomorrow.rain != null ? `${tomorrow.rain}% rain chance` : ""}
            </div>
          </div>
        </section>
      </main>

      {/* right sidebar */}
      <aside className="side">
        <div className="side-top">
          <div>
            <div className="cond">
              {emoji} {label}
            </div>
            <div className="muted place">📍 {place || "…"}</div>
            <div className="clock">{now.toLocaleTimeString()}</div>
          </div>
          <div className="side-temp">{Math.round(c.temperature_2m)}°C</div>
        </div>

        <div className="sun-arc">
          <svg viewBox="0 0 200 120" width="100%" height="120">
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#f0a84a"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <circle cx={sunX} cy={sunY} r="9" fill="#f7a937" />
          </svg>
          <div className="sun-times">
            <div>
              <div className="muted">Sunrise</div>
              <div>{timeOnly(d.sunrise[0])}</div>
            </div>
            <div>
              <div className="muted">Sunset</div>
              <div>{timeOnly(d.sunset[0])}</div>
            </div>
          </div>
        </div>

        <div className="card uv-card">
          <div className="uv-num">☀️ {Math.round(d.uv_index_max[0])} UVI</div>
          <div>
            <span className="chip light-chip">{uvLabel(d.uv_index_max[0])}</span>
            <div className="muted">UV exposure level today</div>
          </div>
        </div>

        <h3 className="pred-title">Weather Prediction</h3>
        {d.time.slice(1, 1 + predictionDays).map((iso, i) => {
          const k = i + 1;
          const [pl, pe] = wx(d.weather_code[k]);
          return (
            <div className="pred-row" key={iso}>
              <span className="pred-emoji">{pe}</span>
              <div className="pred-info">
                <div className="muted">{dayName(iso)}</div>
                <div className="pred-label">{pl}</div>
              </div>
              <div className="pred-temp">
                {Math.round(d.temperature_2m_max[k])}° /{" "}
                {Math.round(d.temperature_2m_min[k])}°
              </div>
            </div>
          );
        })}
        <button className="next5" onClick={() => setDays5(v => !v)}>
          {days5 ? "Show Less" : "Next 5 Days"}
        </button>

        <div className="map">
          <iframe
            title="map"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              coords.lon - 0.06
            }%2C${coords.lat - 0.04}%2C${coords.lon + 0.06}%2C${
              coords.lat + 0.04
            }&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`}
          />
        </div>
      </aside>
    </div>
  );
}

export default Dashboard;
