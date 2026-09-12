
// Bookmark favicon fallback handler without inline onerror (CSP safe)
document.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'IMG' && e.target.classList && e.target.classList.contains('bm-fav')) {
    e.target.style.display = 'none';
    if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'inline';
  }
}, true);

/* ============================================================
   POLYFILLS & SINGLETONS
   ============================================================ */
// structuredClone polyfill (M9) — Chrome 98+, Firefox 94+, Safari 15.4+
if (!window.structuredClone) {
  window.structuredClone = (v) => JSON.parse(JSON.stringify(v));
}

// Shared AudioContext singleton — reused across Pomodoro chimes to avoid leaking audio nodes (M6)
let _sharedAudioCtx = null;
function getAudioContext() {
  if (!_sharedAudioCtx || _sharedAudioCtx.state === "closed") {
    _sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _sharedAudioCtx;
}

/* ============================================================
   WIDGET REGISTRY
   Each widget:
     id       — stable string
     name     — display name
     icon     — emoji/glyph
     desc     — one-liner for the gallery
     defaults — default config
     config   — optional function returning HTML for config form
     readConfig(html) — optional, reads form values into config
     refresh  — optional interval ms
     render(el, cfg) — async, fills el with widget body HTML
   ============================================================ */
/* ---------- Clock Helpers ---------- */
function getClockData(tz, hour12) {
  const d = new Date();
  const dateOpts = { weekday: "short", month: "short", day: "numeric", timeZone: tz || undefined };
  let fullDate = "";
  try {
    fullDate = d.toLocaleDateString(undefined, dateOpts);
  } catch {
    fullDate = d.toLocaleDateString();
  }

  const timeOpts = {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: Boolean(hour12),
    timeZone: tz || undefined
  };
  let hh = "00", mm = "00", ss = "00", dayPeriod = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", timeOpts).formatToParts(d);
    hh = parts.find(p => p.type === "hour")?.value || "00";
    mm = parts.find(p => p.type === "minute")?.value || "00";
    ss = parts.find(p => p.type === "second")?.value || "00";
    dayPeriod = parts.find(p => p.type === "dayPeriod")?.value || "";
  } catch {
    hh = String(d.getHours()).padStart(2, "0");
    mm = String(d.getMinutes()).padStart(2, "0");
    ss = String(d.getSeconds()).padStart(2, "0");
  }

  // Day of year
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d - start) / 86400000);

  // Week number (ISO 8601)
  const dateUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dateUTC.getUTCDay() || 7;
  dateUTC.setUTCDate(dateUTC.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dateUTC.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((dateUTC - yearStart) / 86400000) + 1) / 7);

  // Day progress
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const elapsed = d.getTime() - startOfDay;
  const progressPct = Math.min(100, Math.max(0, ((elapsed / 86400000) * 100))).toFixed(1);
  const msLeft = Math.max(0, 86400000 - elapsed);
  const hrsLeft = Math.floor(msLeft / 3600000);
  const minsLeft = Math.floor((msLeft % 3600000) / 60000);

  // TZ offset
  let offset = "UTC";
  try {
    const tzParts = new Intl.DateTimeFormat("en-US", { timeZone: tz || undefined, timeZoneName: "shortOffset" }).formatToParts(d);
    offset = tzParts.find(p => p.type === "timeZoneName")?.value.replace("GMT", "UTC") || "UTC";
  } catch {}

  let tzAbbr = "";
  try {
    tzAbbr = tz ? d.toLocaleTimeString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop() : Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop().replace(/_/g, " ");
  } catch {
    tzAbbr = "LOC";
  }

  // Analog angles
  const hNum = parseInt(hh, 10) % 12;
  const mNum = parseInt(mm, 10);
  const sNum = parseInt(ss, 10);
  const secDeg = sNum * 6;
  const minDeg = mNum * 6 + sNum * 0.1;
  const hourDeg = hNum * 30 + mNum * 0.5;

  return {
    hh, mm, ss, dayPeriod, fullDate, dayOfYear, weekNum,
    progressPct, hrsLeft, minsLeft, offset, tzAbbr,
    secDeg, minDeg, hourDeg,
    epoch: Math.floor(d.getTime() / 1000),
    iso: d.toISOString()
  };
}

function getAnalogClockSvg(hourDeg, minDeg, secDeg) {
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const deg = i * 30;
    const isMajor = i % 3 === 0;
    const y2 = isMajor ? 14 : 11;
    const width = isMajor ? 2.4 : 1.2;
    const color = isMajor ? "var(--fg-2)" : "var(--border-hi)";
    ticks += `<line x1="50" y1="7" x2="50" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" transform="rotate(${deg} 50 50)"/>`;
  }
  return `<svg viewBox="0 0 100 100" class="w-clock-dial">
    <circle cx="50" cy="50" r="45" fill="var(--panel-hi)" stroke="var(--border)" stroke-width="2"/>
    ${ticks}
    <line class="clock-hand-h" x1="50" y1="50" x2="50" y2="28" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" transform="rotate(${hourDeg} 50 50)"/>
    <line class="clock-hand-m" x1="50" y1="50" x2="50" y2="18" stroke="var(--fg-2)" stroke-width="2" stroke-linecap="round" transform="rotate(${minDeg} 50 50)"/>
    <line class="clock-hand-s" x1="50" y1="58" x2="50" y2="13" stroke="var(--accent)" stroke-width="1.2" stroke-linecap="round" transform="rotate(${secDeg} 50 50)"/>
    <circle cx="50" cy="50" r="3" fill="var(--accent)"/>
    <circle cx="50" cy="50" r="1.2" fill="var(--panel)"/>
  </svg>`;
}

const WIDGETS = {

  /* ---------- Clock ---------- */
  clock: {
    name: "Clock",
    icon: "🕐",
    desc: "Precision digital, hybrid, or analog clock with day progress and developer timestamps.",
    defaults: {
      tz: "",
      showSeconds: true,
      hour12: false,
      clockStyle: "digital",
      showProgress: true,
      showDevInfo: true
    },
    refresh: 1000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Time zone (IANA, blank = local)</label>
        <input type="text" data-k="tz" value="${escapeHtml(c.tz||"")}" placeholder="e.g. UTC, America/New_York, Asia/Kolkata"/></div>
      <div class="wrow"><label style="flex:1">Clock style</label>
        <select data-k="clockStyle">
          <option value="digital" ${c.clockStyle !== "hybrid" && c.clockStyle !== "analog" ? "selected" : ""}>Digital (Modern)</option>
          <option value="hybrid" ${c.clockStyle === "hybrid" ? "selected" : ""}>Hybrid (Analog dial + Digital)</option>
          <option value="analog" ${c.clockStyle === "analog" ? "selected" : ""}>Analog Watch Face</option>
        </select></div>
      <div class="wrow"><label style="flex:1">12-hour format (AM/PM)</label>
        <input type="checkbox" data-k="hour12" ${c.hour12?"checked":""}/></div>
      <div class="wrow"><label style="flex:1">Show seconds</label>
        <input type="checkbox" data-k="showSeconds" ${c.showSeconds !== false?"checked":""}/></div>
      <div class="wrow"><label style="flex:1">Show day progress bar</label>
        <input type="checkbox" data-k="showProgress" ${c.showProgress !== false?"checked":""}/></div>
      <div class="wrow"><label style="flex:1">Show developer metadata (Week, Epoch, UTC)</label>
        <input type="checkbox" data-k="showDevInfo" ${c.showDevInfo !== false?"checked":""}/></div>`,
    readConfig: (el) => ({
      tz: el.querySelector('[data-k="tz"]').value.trim(),
      clockStyle: el.querySelector('[data-k="clockStyle"]').value,
      hour12: el.querySelector('[data-k="hour12"]').checked,
      showSeconds: el.querySelector('[data-k="showSeconds"]').checked,
      showProgress: el.querySelector('[data-k="showProgress"]').checked,
      showDevInfo: el.querySelector('[data-k="showDevInfo"]').checked
    }),
    render: (el, c) => {
      const data = getClockData(c.tz, c.hour12);
      const style = c.clockStyle || "digital";
      const showSecs = c.showSeconds !== false;
      const showProg = c.showProgress !== false;
      const showDev = c.showDevInfo !== false;

      // In-place updates when existing DOM matches active configuration
      const root = el.querySelector(".w-clock");
      if (root && root.dataset.style === style && root.dataset.secs === String(showSecs) && root.dataset.h12 === String(c.hour12)) {
        // Digital digits
        const hEl = root.querySelector(".w-clock-h");
        if (hEl) hEl.textContent = data.hh;
        const mEl = root.querySelector(".w-clock-m");
        if (mEl) mEl.textContent = data.mm;
        const sEl = root.querySelector(".w-clock-s");
        if (sEl) sEl.textContent = ":" + data.ss;
        const apEl = root.querySelector(".w-clock-ampm");
        if (apEl) apEl.textContent = data.dayPeriod;
        const dEl = root.querySelector(".w-clock-date");
        if (dEl) dEl.textContent = data.fullDate;
        const wEl = root.querySelector(".w-clock-week");
        if (wEl) wEl.textContent = "W" + data.weekNum;
        const barEl = root.querySelector(".w-clock-progress-bar");
        if (barEl) barEl.style.width = data.progressPct + "%";
        const barLbl = root.querySelector(".w-clock-progress-lbl");
        if (barLbl) barLbl.innerHTML = `<span>day ${data.progressPct}%</span><span>${data.hrsLeft}h ${data.minsLeft}m left</span>`;
        const epEl = root.querySelector(".w-clock-epoch");
        if (epEl) epEl.textContent = "#" + data.epoch;

        // Analog hands
        const hHand = root.querySelector(".clock-hand-h");
        if (hHand) hHand.setAttribute("transform", `rotate(${data.hourDeg} 50 50)`);
        const mHand = root.querySelector(".clock-hand-m");
        if (mHand) mHand.setAttribute("transform", `rotate(${data.minDeg} 50 50)`);
        const sHand = root.querySelector(".clock-hand-s");
        if (sHand) sHand.setAttribute("transform", `rotate(${data.secDeg} 50 50)`);
        return;
      }

      // Initial or config-changed render
      let inner = "";

      if (style === "analog") {
        inner = `
          <div class="w-clock-analog-wrap">
            <div class="w-clock-analog-face" title="Analog clock face">${getAnalogClockSvg(data.hourDeg, data.minDeg, data.secDeg)}</div>
            <div class="w-clock-analog-info" style="display:flex;flex-direction:column;gap:4px">
              <div class="w-clock-main" title="Click to copy time">
                <span class="w-clock-h">${data.hh}</span><span class="w-clock-colon">:</span><span class="w-clock-m">${data.mm}</span>
                ${showSecs ? `<span class="w-clock-s">:${data.ss}</span>` : ""}
                ${c.hour12 && data.dayPeriod ? `<span class="w-clock-ampm" title="Click to toggle 12h/24h">${data.dayPeriod}</span>` : ""}
              </div>
              <div class="w-clock-date-row" title="Click to copy date">
                <span class="w-clock-date">${escapeHtml(data.fullDate)}</span>
                <span class="w-clock-badge w-clock-week" title="Week ${data.weekNum}">W${data.weekNum}</span>
              </div>
            </div>
          </div>`;
      } else if (style === "hybrid") {
        inner = `
          <div class="w-clock-hybrid">
            <div class="w-clock-analog-face">${getAnalogClockSvg(data.hourDeg, data.minDeg, data.secDeg)}</div>
            <div class="w-clock-hybrid-body" style="flex:1">
              <div class="w-clock-main" title="Click to copy time">
                <span class="w-clock-h">${data.hh}</span><span class="w-clock-colon">:</span><span class="w-clock-m">${data.mm}</span>
                ${showSecs ? `<span class="w-clock-s">:${data.ss}</span>` : ""}
                ${c.hour12 && data.dayPeriod ? `<span class="w-clock-ampm" title="Click to toggle 12h/24h">${data.dayPeriod}</span>` : ""}
              </div>
              <div class="w-clock-date-row" title="Click to copy date">
                <span class="w-clock-date">${escapeHtml(data.fullDate)}</span>
                <span class="w-clock-badge w-clock-week" title="Week ${data.weekNum}">W${data.weekNum}</span>
              </div>
            </div>
          </div>`;
      } else {
        // Digital mode
        inner = `
          <div class="w-clock-top">
            <div class="w-clock-main" title="Click to copy time">
              <span class="w-clock-h">${data.hh}</span><span class="w-clock-colon">:</span><span class="w-clock-m">${data.mm}</span>
              ${showSecs ? `<span class="w-clock-s">:${data.ss}</span>` : ""}
              ${c.hour12 && data.dayPeriod ? `<span class="w-clock-ampm" title="Click to toggle 12h/24h">${data.dayPeriod}</span>` : ""}
            </div>
            <button class="icon-btn clock-mode-btn" title="Cycle clock style (Digital / Hybrid / Analog)" aria-label="Cycle clock style">⟳</button>
          </div>
          <div class="w-clock-date-row" title="Click to copy date">
            <span class="w-clock-date">${escapeHtml(data.fullDate)}</span>
            <div class="w-clock-badges">
              <span class="w-clock-badge w-clock-week" title="Week of the year">W${data.weekNum}</span>
              <span class="w-clock-badge" title="Day of the year">D${data.dayOfYear}</span>
            </div>
          </div>`;
      }

      // Progress bar
      if (showProg) {
        inner += `
          <div class="w-clock-progress-wrap" title="${data.progressPct}% of today has elapsed">
            <div class="w-clock-progress-track">
              <div class="w-clock-progress-bar" style="width:${data.progressPct}%"></div>
            </div>
            <div class="w-clock-progress-lbl">
              <span>day ${data.progressPct}%</span>
              <span>${data.hrsLeft}h ${data.minsLeft}m left</span>
            </div>
          </div>`;
      }

      // Developer Metadata Chips
      if (showDev) {
        inner += `
          <div class="w-clock-meta">
            <span class="w-clock-chip w-clock-tz-chip" title="Click to copy ISO timestamp (${escapeHtml(data.iso)})">
              🌐 ${escapeHtml(data.tzAbbr)} · ${data.offset}
            </span>
            <span class="w-clock-chip w-clock-epoch" title="Click to copy Unix timestamp">
              #${data.epoch}
            </span>
          </div>`;
      }

      el.innerHTML = `<div class="w-clock" data-style="${style}" data-secs="${showSecs}" data-h12="${c.hour12}">${inner}</div>`;

      // Interactive Click Handlers
      const clockEl = el.querySelector(".w-clock");
      if (!clockEl) return;

      // Click time to copy
      const mainEl = clockEl.querySelector(".w-clock-main");
      if (mainEl) {
        mainEl.onclick = (e) => {
          if (e.target.classList.contains("w-clock-ampm")) return;
          const timeStr = `${data.hh}:${data.mm}${showSecs ? ":" + data.ss : ""}${data.dayPeriod ? " " + data.dayPeriod : ""}`;
          navigator.clipboard.writeText(timeStr).then(() => toast(`Copied time: ${timeStr}`)).catch(() => {});
        };
      }

      // Click AM/PM to toggle 12h/24h format
      const ampmBtn = clockEl.querySelector(".w-clock-ampm");
      if (ampmBtn) {
        ampmBtn.onclick = (e) => {
          e.stopPropagation();
          c.hour12 = !c.hour12;
          save();
          renderWidgets();
          toast(`Switched to ${c.hour12 ? "12-hour" : "24-hour"} clock`);
        };
      }

      // Click date to copy
      const dateEl = clockEl.querySelector(".w-clock-date-row");
      if (dateEl) {
        dateEl.onclick = () => {
          navigator.clipboard.writeText(data.fullDate).then(() => toast(`Copied date: ${data.fullDate}`)).catch(() => {});
        };
      }

      // Click style toggle button
      const styleBtn = clockEl.querySelector(".clock-mode-btn");
      if (styleBtn) {
        styleBtn.onclick = (e) => {
          e.stopPropagation();
          const next = style === "digital" ? "hybrid" : style === "hybrid" ? "analog" : "digital";
          c.clockStyle = next;
          save();
          renderWidgets();
          toast(`Clock style: ${next}`);
        };
      }

      // Click epoch chip to copy Unix epoch
      const epochChip = clockEl.querySelector(".w-clock-epoch");
      if (epochChip) {
        epochChip.onclick = () => {
          navigator.clipboard.writeText(String(data.epoch)).then(() => toast(`Copied timestamp: ${data.epoch}`)).catch(() => {});
        };
      }

      // Click timezone chip to copy ISO 8601
      const tzChip = clockEl.querySelector(".w-clock-tz-chip");
      if (tzChip) {
        tzChip.onclick = () => {
          navigator.clipboard.writeText(data.iso).then(() => toast(`Copied ISO timestamp: ${data.iso}`)).catch(() => {});
        };
      }
    }
  },

  /* ---------- World Clock ---------- */
  worldclock: {
    name: "World Clock",
    icon: "🌍",
    desc: "Times in multiple cities side by side.",
    defaults: { zones: [
      { label: "SF", tz: "America/Los_Angeles" },
      { label: "NYC", tz: "America/New_York" },
      { label: "London", tz: "Europe/London" },
      { label: "Berlin", tz: "Europe/Berlin" },
      { label: "Bangalore", tz: "Asia/Kolkata" },
      { label: "Tokyo", tz: "Asia/Tokyo" }
    ]},
    refresh: 1000,
    config: (c) => `
      <label>Zones (label=IANA, one per line)</label>
      <textarea data-k="zones" rows="6">${escapeHtml((c.zones||[]).map(z => z.label+"="+z.tz).join("\n"))}</textarea>`,
    readConfig: (el) => ({
      zones: el.querySelector('[data-k="zones"]').value.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
        const [label, tz] = line.split("=").map(x => x.trim());
        return { label: label || tz, tz: tz || label };
      })
    }),
    render: (el, c) => {
      const zones = c.zones || [];
      el.innerHTML = `<div class="w-world">${zones.map(z => {
        let time = "--:--";
        try { time = new Date().toLocaleTimeString("en-US", { timeZone: z.tz, hour: "2-digit", minute: "2-digit", hour12: false }); } catch {}
        return `<div class="row"><span class="city">${escapeHtml(z.label)}</span><span class="t">${time}</span></div>`;
      }).join("")}</div>`;
    }
  },

  /* ---------- Weather (Open-Meteo) ---------- */
  weather: {
    name: "Weather",
    icon: "☀️",
    desc: "Current weather via Open-Meteo (no API key).",
    defaults: { lat: 28.689560383588127, lon: 77.29471663673375, place: "New Delhi" },
    refresh: 600000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Place label</label><input type="text" data-k="place" value="${escapeHtml(c.place||"")}"/></div>
      <div class="wrow"><label style="flex:1">Latitude</label><input type="text" data-k="lat" value="${c.lat}"/></div>
      <div class="wrow"><label style="flex:1">Longitude</label><input type="text" data-k="lon" value="${c.lon}"/></div>
      <p style="font-size:11px;color:var(--dim);margin-top:6px">Tip: get coords from openstreetmap.org — right-click → "Show address".</p>`,
    readConfig: (el) => ({
      place: el.querySelector('[data-k="place"]').value,
      lat: parseFloat(el.querySelector('[data-k="lat"]').value) || 0,
      lon: parseFloat(el.querySelector('[data-k="lon"]').value) || 0
    }),
    render: async (el, c) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius`;
      const r = await fetch(url);
      const data = await r.json();
      const cur = data.current;
      if (!cur) throw new Error("no data");
      const codes = {
        0:"☀️ clear", 1:"🌤 mainly clear", 2:"⛅ partly cloudy", 3:"☁️ overcast",
        45:"🌫 fog", 48:"🌫 rime fog", 51:"🌦 light drizzle", 53:"🌦 drizzle", 55:"🌧 heavy drizzle",
        61:"🌧 light rain", 63:"🌧 rain", 65:"🌧 heavy rain", 71:"🌨 light snow", 73:"🌨 snow", 75:"🌨 heavy snow",
        80:"🌦 rain showers", 81:"🌦 showers", 82:"⛈ heavy showers", 95:"⛈ thunderstorm", 96:"⛈ thunder+hail", 99:"⛈ severe"
      };
      const cond = codes[cur.weather_code] || "—";
      const ico = cond.split(" ")[0];
      const desc = cond.split(" ").slice(1).join(" ");
      el.innerHTML = `<div class="w-weather">
        <div class="ico-big">${ico}</div>
        <div>
          <div class="temp">${Math.round(cur.temperature_2m)}°</div>
          <div class="cond">${desc}</div>
          <div class="loc">${escapeHtml(c.place)} · ${cur.wind_speed_10m} km/h</div>
        </div>
      </div>`;
    }
  },

  /* ---------- GitHub ---------- */
  github: {
    name: "GitHub Activity",
    icon: "🐙",
    desc: "Your recent PRs, issues, and activity.",
    defaults: { user: "octocat", token: "" },
    refresh: 300000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">GitHub username</label>
      <input type="text" data-k="user" value="${escapeHtml(c.user||"")}"/></div>
      <div class="wrow"><label style="flex:1">Personal token (optional)</label>
      <input type="password" data-k="token" value="${escapeHtml(c.token||"")}" placeholder="ghp_... (5,000 req/hr)"/></div>
      <p style="font-size:11px;color:var(--dim);margin-top:6px">Without a token, GitHub limits unauthenticated requests to 60/hour per IP.</p>`,
    readConfig: (el) => ({
      user: el.querySelector('[data-k="user"]').value.trim(),
      token: el.querySelector('[data-k="token"]').value.trim()
    }),
    render: async (el, c) => {
      const user = c.user;
      if (!user) throw new Error("set a username in config");
      const headers = { "Accept": "application/vnd.github.v3+json" };
      if (c.token) headers["Authorization"] = `Bearer ${c.token}`;

      const uRes = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers });
      if (!uRes.ok) {
        if (uRes.status === 403 || uRes.status === 429) {
          const resetHeader = uRes.headers.get("x-ratelimit-reset");
          const resetMsg = resetHeader ? `Resets at ${new Date(Number(resetHeader) * 1000).toLocaleTimeString()}.` : "";
          throw new Error(`GitHub rate limit exceeded (403). ${resetMsg} Add a token in config to get 5,000 req/hr.`);
        }
        if (uRes.status === 404) {
          throw new Error(`user '${user}' not found (404)`);
        }
        if (uRes.status === 401) {
          throw new Error("invalid GitHub token (401)");
        }
        throw new Error(`GitHub API error (${uRes.status})`);
      }
      const user_ = await uRes.json();
      let events = [];
      try {
        const eRes = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=15`, { headers });
        if (eRes.ok) events = await eRes.json();
      } catch {}

      const pushes = Array.isArray(events) ? events.filter(e => e.type === "PushEvent").slice(0, 4) : [];
      el.innerHTML = `
        <div class="w-github">
          <div class="stat"><span class="lbl">user</span><span class="num"><a href="https://github.com/${escapeHtml(user)}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">@${escapeHtml(user_.login || user)}</a></span></div>
          <div class="stat"><span class="lbl">public repos</span><span class="num">${user_.public_repos ?? 0}</span></div>
          <div class="stat"><span class="lbl">followers</span><span class="num">${user_.followers ?? 0}</span></div>
          ${pushes.length ? `
            <div class="list" style="margin-top:6px">
              ${pushes.map(p => `<div class="item"><span>→</span><a href="https://github.com/${escapeHtml(p.repo.name)}" target="_blank" rel="noopener" class="repo" style="text-decoration:none;color:var(--fg-2)">${escapeHtml(p.repo.name)}</a></div>`).join("")}
            </div>` : `<div style="color:var(--dim);font-size:11px;margin-top:6px">no recent public pushes</div>`}
        </div>`;
    }
  },

  /* ---------- Crypto ---------- */
  crypto: {
    name: "Crypto Prices",
    icon: "₿",
    desc: "Live prices via CoinGecko. No API key needed.",
    defaults: { coins: ["bitcoin", "ethereum", "solana"], currency: "usd" },
    refresh: 120000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Coins (comma-sep CoinGecko ids)</label>
      <input type="text" data-k="coins" value="${escapeHtml((c.coins||[]).join(","))}"/></div>
      <div class="wrow"><label style="flex:1">Currency</label>
      <select data-k="currency">
        ${["usd","eur","gbp","inr","jpy"].map(x => `<option ${x===c.currency?"selected":""}>${x}</option>`).join("")}
      </select></div>`,
    readConfig: (el) => ({
      coins: el.querySelector('[data-k="coins"]').value.split(",").map(x => x.trim()).filter(Boolean),
      currency: el.querySelector('[data-k="currency"]').value
    }),
    render: async (el, c) => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${c.coins.join(",")}&vs_currencies=${c.currency}&include_24hr_change=true`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status === 429 ? "rate limited (429)" : `HTTP ${r.status}`);
      const data = await r.json();
      el.innerHTML = `<div class="w-crypto">${c.coins.map(id => {
        const d = data[id];
        if (!d) return `<div class="coin"><span class="sym">${escapeHtml(id)}</span><span class="price">—</span></div>`;
        const price = d[c.currency];
        const delta = d[c.currency + "_24h_change"];
        const cls = delta >= 0 ? "up" : "down";
        const arrow = delta >= 0 ? "▲" : "▼";
        return `<div class="coin">
          <span class="sym">${escapeHtml(id.toUpperCase())}</span>
          <span class="price">${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          <span class="delta ${cls}">${arrow} ${Math.abs(delta).toFixed(2)}%</span>
        </div>`;
      }).join("")}</div>`;
    }
  },

  /* ---------- HN ---------- */
  hn: {
    name: "Hacker News",
    icon: "📰",
    desc: "Top stories from HN. No auth.",
    defaults: { count: 6 },
    refresh: 600000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Number of stories</label>
      <input type="text" data-k="count" value="${c.count}"/></div>`,
    readConfig: (el) => ({ count: Math.max(1, Math.min(20, parseInt(el.querySelector('[data-k="count"]').value) || 6)) }),
    render: async (el, c) => {
      const r = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const ids = (await r.json()).slice(0, c.count);
      const items = await Promise.all(ids.map(i => fetch(`https://hacker-news.firebaseio.com/v0/item/${i}.json`).then(x => x.json())));
      el.innerHTML = `<div class="w-hn">${items.map(i => {
        const safeUrl = i.url && /^https?:\/\//i.test(i.url) ? escapeHtml(i.url) : `https://news.ycombinator.com/item?id=${i.id}`;
        return `
        <div class="item">
          <a href="${safeUrl}" target="_blank" rel="noopener">${escapeHtml(i.title)}</a>
          <div class="meta">${i.score} pts · ${i.descendants||0} comments</div>
        </div>
      `}).join("")}</div>`;
    }
  },

  /* ---------- RSS ---------- */
  rss: {
    name: "RSS Feed",
    icon: "📡",
    desc: "Any RSS/Atom feed via a CORS proxy.",
    defaults: { url: "https://hnrss.org/frontpage", count: 5, title: "Feed" },
    refresh: 900000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Title</label><input type="text" data-k="title" value="${escapeHtml(c.title||"")}"/></div>
      <div class="wrow"><label style="flex:1">Feed URL</label><input type="text" data-k="url" value="${escapeHtml(c.url||"")}"/></div>
      <div class="wrow"><label style="flex:1">Item count</label><input type="text" data-k="count" value="${c.count}"/></div>
      <p style="font-size:11px;color:var(--dim);margin-top:6px">Uses <code>rss2json.com</code> free tier — no key needed for public feeds.</p>`,
    readConfig: (el) => ({
      title: el.querySelector('[data-k="title"]').value,
      url: el.querySelector('[data-k="url"]').value,
      count: Math.max(1, Math.min(20, parseInt(el.querySelector('[data-k="count"]').value) || 5))
    }),
    render: async (el, c) => {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(c.url)}`;
      const r = await fetch(url);
      const data = await r.json();
      if (data.status !== "ok") throw new Error("feed error: " + (data.message || "unknown"));
      const items = (data.items || []).slice(0, c.count);
      el.innerHTML = `<div class="w-rss">${items.map(i => {
        const safeLink = i.link && /^https?:\/\//i.test(i.link) ? escapeHtml(i.link) : "#";
        return `
        <div class="entry">
          <a href="${safeLink}" target="_blank" rel="noopener">${escapeHtml(i.title)}</a>
          <div class="src">${new Date(i.pubDate).toLocaleDateString()}</div>
        </div>
      `}).join("")}</div>`;
    }
  },

  /* ---------- Countdown ---------- */
  countdown: {
    name: "Countdown",
    icon: "⏳",
    desc: "Time until your events.",
    defaults: { events: [
      { label: "Weekend", date: nextDow(6) },
      { label: "End of month", date: endOfMonth() }
    ]},
    refresh: 30000,
    config: (c) => `
      <label>Events (label=YYYY-MM-DD, one per line)</label>
      <textarea data-k="events" rows="6">${escapeHtml((c.events||[]).map(e => e.label+"="+e.date).join("\n"))}</textarea>`,
    readConfig: (el) => ({
      events: el.querySelector('[data-k="events"]').value.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
        const [label, date] = line.split("=").map(x => x.trim());
        return { label, date };
      })
    }),
    render: (el, c) => {
      const now = Date.now();
      const rows = (c.events || []).map(e => {
        const t = new Date(e.date + "T00:00:00").getTime();
        if (isNaN(t)) return `<div class="cd"><span class="when">${escapeHtml(e.label)}</span><span class="until">invalid date</span></div>`;
        const diff = t - now;
        let cls = "", text;
        if (diff < 0) { cls = "now"; text = "past"; }
        else if (diff < 86400000) { cls = "soon"; text = humanizeDuration(diff); }
        else text = humanizeDuration(diff);
        return `<div class="cd ${cls}"><span class="when">${escapeHtml(e.label)}</span><span class="until">${text}</span></div>`;
      }).join("");
      el.innerHTML = `<div class="w-countdown">${rows}</div>`;
    }
  },

  /* ---------- System info ---------- */
  sysinfo: {
    name: "Browser Info",
    icon: "💻",
    desc: "Your browser, screen, and network status.",
    defaults: {},
    refresh: 5000,
    render: (el, c) => {
      const conn = navigator.connection || {};
      const online = navigator.onLine;
      const mem = navigator.deviceMemory || "?";
      el.innerHTML = `<div class="w-sys">
        <div class="stat"><div class="lbl">Screen</div><div class="val">${screen.width}×${screen.height}</div></div>
        <div class="stat"><div class="lbl">Viewport</div><div class="val">${innerWidth}×${innerHeight}</div></div>
        <div class="stat"><div class="lbl">Memory</div><div class="val">${mem} GB</div></div>
        <div class="stat"><div class="lbl">Cores</div><div class="val">${navigator.hardwareConcurrency || "?"}</div></div>
        <div class="stat"><div class="lbl">Language</div><div class="val">${navigator.language}</div></div>
        <div class="stat"><div class="lbl">Network</div><div class="val">${online ? (conn.effectiveType || "online") : "offline"}</div></div>
      </div>`;
    }
  },

  /* ---------- Notes (simple) ---------- */
  notes: {
    name: "Quick Notes",
    icon: "📝",
    desc: "A small note area, saved separately from the scratchpad.",
    defaults: { content: "" },
    refresh: 0,
    config: () => "",
    render: (el, c, save) => {
      el.innerHTML = `<div class="w-notes"><textarea placeholder="jot something…">${escapeHtml(c.content||"")}</textarea></div>`;
      const ta = el.querySelector("textarea");
      let t;
      ta.addEventListener("input", () => {
        c.content = ta.value;
        clearTimeout(t);
        t = setTimeout(() => save(), 400);
      });
    }
  },

  /* ---------- Generic JSON API ---------- */
  genericapi: {
    name: "JSON Endpoint",
    icon: "🔗",
    desc: "Poll any JSON endpoint and display a field.",
    defaults: { url: "https://api.github.com/repos/facebook/react", path: "stargazers_count", label: "React stars" },
    refresh: 300000,
    config: (c) => `
      <div class="wrow"><label style="flex:1">URL</label><input type="text" data-k="url" value="${escapeHtml(c.url||"")}"/></div>
      <div class="wrow"><label style="flex:1">JSON path (dot notation)</label><input type="text" data-k="path" value="${escapeHtml(c.path||"")}"/></div>
      <div class="wrow"><label style="flex:1">Label</label><input type="text" data-k="label" value="${escapeHtml(c.label||"")}"/></div>`,
    readConfig: (el) => ({
      url: el.querySelector('[data-k="url"]').value,
      path: el.querySelector('[data-k="path"]').value,
      label: el.querySelector('[data-k="label"]').value
    }),
    render: async (el, c) => {
      const r = await fetch(c.url);
      const data = await r.json();
      const val = c.path.split(".").reduce((o, k) => o?.[k], data);
      let display;
      if (typeof val === "number") display = val.toLocaleString();
      else if (typeof val === "object") display = JSON.stringify(val).slice(0, 60);
      else display = String(val ?? "—");
      el.innerHTML = `<div class="w-api"><div class="val">${escapeHtml(display)}</div><div class="sub">${escapeHtml(c.label||"")}</div></div>`;
    }
  },

  /* ---------- Pomodoro Timer ---------- */
  pomodoro: {
    name: "Pomodoro Focus",
    icon: "🍅",
    desc: "25/5 focus & break timer with audio chime.",
    defaults: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15 },
    refresh: 0,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Focus (min)</label><input type="text" data-k="focusMin" value="${c.focusMin||25}"/></div>
      <div class="wrow"><label style="flex:1">Short Break (min)</label><input type="text" data-k="shortBreakMin" value="${c.shortBreakMin||5}"/></div>
      <div class="wrow"><label style="flex:1">Long Break (min)</label><input type="text" data-k="longBreakMin" value="${c.longBreakMin||15}"/></div>`,
    readConfig: (el) => ({
      focusMin: Math.max(1, parseInt(el.querySelector('[data-k="focusMin"]').value) || 25),
      shortBreakMin: Math.max(1, parseInt(el.querySelector('[data-k="shortBreakMin"]').value) || 5),
      longBreakMin: Math.max(1, parseInt(el.querySelector('[data-k="longBreakMin"]').value) || 15)
    }),
    render: (el, c) => {
      let state = el._pomoState;
      if (!state) {
        state = {
          mode: "focus",
          timeLeft: (c.focusMin || 25) * 60,
          running: false,
          cycles: 0,
          timer: null
        };
        el._pomoState = state;
      }
      const fmtTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
      };
      const getModeLabel = (m) => m === "focus" ? "🎯 Focus Session" : m === "shortBreak" ? "☕ Short Break" : "🌿 Long Break";
      const updateDom = () => {
        const timeEl = el.querySelector(".w-pomo-time");
        const statusEl = el.querySelector(".w-pomo-status");
        const btnStart = el.querySelector(".btn-pomo-start");
        const cyclesEl = el.querySelector(".w-pomo-cycles");
        if (timeEl) timeEl.textContent = fmtTime(state.timeLeft);
        if (statusEl) statusEl.textContent = getModeLabel(state.mode);
        if (btnStart) btnStart.textContent = state.running ? "Pause" : "Start";
        if (cyclesEl) cyclesEl.textContent = `Completed cycles: ${state.cycles}`;
      };
      const playChime = () => {
        try {
          const ctx = getAudioContext(); // reuse shared singleton (M6 fix)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.8);
        } catch {}
      };
      const tick = () => {
        // Self-terminate if the element was removed from the DOM (widget grid re-render)
        if (!el.isConnected) { clearInterval(state.timer); state.timer = null; return; }
        if (state.timeLeft > 0) {
          state.timeLeft--;
          updateDom();
        } else {
          playChime();
          if (state.mode === "focus") {
            state.cycles++;
            if (state.cycles % 4 === 0) {
              state.mode = "longBreak";
              state.timeLeft = (c.longBreakMin || 15) * 60;
            } else {
              state.mode = "shortBreak";
              state.timeLeft = (c.shortBreakMin || 5) * 60;
            }
            toast("Focus session complete! Take a break.");
          } else {
            state.mode = "focus";
            state.timeLeft = (c.focusMin || 25) * 60;
            toast("Break finished! Ready to focus.");
          }
          state.running = false;
          clearInterval(state.timer);
          state.timer = null;
          updateDom();
        }
      };

      el.innerHTML = `
        <div class="w-pomo">
          <div class="w-pomo-status">${getModeLabel(state.mode)}</div>
          <div class="w-pomo-time">${fmtTime(state.timeLeft)}</div>
          <div class="w-pomo-controls">
            <button class="primary btn-pomo-start">${state.running ? "Pause" : "Start"}</button>
            <button class="btn-pomo-skip">Next</button>
            <button class="btn-pomo-reset ghost">Reset</button>
          </div>
          <div class="w-pomo-cycles">Completed cycles: ${state.cycles}</div>
        </div>`;

      el.querySelector(".btn-pomo-start").onclick = () => {
        if (state.running) {
          state.running = false;
          clearInterval(state.timer);
          state.timer = null;
        } else {
          state.running = true;
          state.timer = setInterval(tick, 1000);
        }
        updateDom();
      };
      el.querySelector(".btn-pomo-skip").onclick = () => {
        clearInterval(state.timer);
        state.running = false;
        state.timer = null;
        if (state.mode === "focus") {
          state.mode = "shortBreak";
          state.timeLeft = (c.shortBreakMin || 5) * 60;
        } else {
          state.mode = "focus";
          state.timeLeft = (c.focusMin || 25) * 60;
        }
        updateDom();
      };
      el.querySelector(".btn-pomo-reset").onclick = () => {
        clearInterval(state.timer);
        state.running = false;
        state.timer = null;
        state.timeLeft = (state.mode === "focus" ? (c.focusMin || 25) : (c.shortBreakMin || 5)) * 60;
        updateDom();
      };
    }
  },

  /* ---------- Speed-Dial Bookmarks ---------- */
  bookmarks: {
    name: "Speed Dial",
    icon: "⭐",
    desc: "Quick bookmark tiles with auto-favicons.",
    defaults: {
      title: "Speed Dial",
      items: [
        { label: "GitHub", url: "https://github.com" },
        { label: "Hacker News", url: "https://news.ycombinator.com" },
        { label: "YouTube", url: "https://youtube.com" },
        { label: "Reddit", url: "https://reddit.com" },
        { label: "StackOverflow", url: "https://stackoverflow.com" },
        { label: "ChatGPT", url: "https://chatgpt.com" }
      ]
    },
    refresh: 0,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Widget title</label>
        <input type="text" data-k="title" value="${escapeHtml(c.title || "Speed Dial")}" placeholder="Speed Dial"/></div>
      <label>Bookmarks (Label = URL, one per line)</label>
      <textarea data-k="items" rows="6">${escapeHtml((c.items||[]).map(i => `${i.label} = ${i.url}`).join("\n"))}</textarea>`,
    readConfig: (el) => ({
      title: (el.querySelector('[data-k="title"]')?.value || "").trim() || "Speed Dial",
      items: el.querySelector('[data-k="items"]').value.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
        const idx = line.indexOf("=");
        if (idx === -1) return { label: line, url: line.startsWith("http") ? line : "https://" + line };
        const label = line.slice(0, idx).trim();
        const url = line.slice(idx + 1).trim();
        return { label: label || url, url: url.startsWith("http") ? url : "https://" + url };
      })
    }),
    render: (el, c) => {
      const items = c.items || [];
      if (!items.length) {
        el.innerHTML = `<div style="color:var(--dim);font-size:12px;text-align:center;padding:12px">No bookmarks configured</div>`;
        return;
      }
      el.innerHTML = `
        <div class="w-bookmarks">
          ${items.map(b => {
            let domain = "";
            try { domain = new URL(b.url).hostname; } catch { domain = b.url; }
            const favUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
            return `
              <a class="w-bm-item" href="${escapeHtml(b.url)}" target="_blank" rel="noopener" title="${escapeHtml(b.label)} (${escapeHtml(b.url)})">
                <div class="w-bm-icon">
                  <img src="${favUrl}" alt="" loading="lazy" class="bm-fav" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"/>
                  <span style="display:none;font-size:14px">🔖</span>
                </div>
                <div class="w-bm-title">${escapeHtml(b.label)}</div>
              </a>`;
          }).join("")}
        </div>`;
    }
  },

  /* ---------- Entertainment Speed Dial ---------- */
  entertainment: {
    name: "Entertainment",
    icon: "🍿",
    desc: "Streaming & media speed dial (Netflix, Prime, JioHotstar, YouTube, Bilibili, Dailymotion).",
    defaults: {
      title: "Entertainment",
      items: [
        { label: "Netflix",     url: "https://www.netflix.com" },
        { label: "Prime Video", url: "https://www.primevideo.com" },
        { label: "JioHotstar",  url: "https://www.hotstar.com" },
        { label: "YouTube",     url: "https://www.youtube.com" },
        { label: "Bilibili",    url: "https://www.bilibili.com" },
        { label: "Dailymotion", url: "https://www.dailymotion.com" }
      ]
    },
    refresh: 0,
    config: (c) => `
      <div class="wrow"><label style="flex:1">Widget title</label>
        <input type="text" data-k="title" value="${escapeHtml(c.title || "Entertainment")}" placeholder="Entertainment"/></div>
      <label>Bookmarks (Label = URL, one per line)</label>
      <textarea data-k="items" rows="6">${escapeHtml((c.items||[]).map(i => `${i.label} = ${i.url}`).join("\n"))}</textarea>`,
    readConfig: (el) => ({
      title: (el.querySelector('[data-k="title"]')?.value || "").trim() || "Entertainment",
      items: el.querySelector('[data-k="items"]').value.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
        const idx = line.indexOf("=");
        if (idx === -1) return { label: line, url: line.startsWith("http") ? line : "https://" + line };
        const label = line.slice(0, idx).trim();
        const url = line.slice(idx + 1).trim();
        return { label: label || url, url: url.startsWith("http") ? url : "https://" + url };
      })
    }),
    render: (el, c) => {
      const items = c.items || [];
      if (!items.length) {
        el.innerHTML = `<div style="color:var(--dim);font-size:12px;text-align:center;padding:12px">No bookmarks configured</div>`;
        return;
      }
      el.innerHTML = `
        <div class="w-bookmarks">
          ${items.map(b => {
            let domain = "";
            try { domain = new URL(b.url).hostname; } catch { domain = b.url; }
            const favUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
            return `
              <a class="w-bm-item" href="${escapeHtml(b.url)}" target="_blank" rel="noopener" title="${escapeHtml(b.label)} (${escapeHtml(b.url)})">
                <div class="w-bm-icon">
                  <img src="${favUrl}" alt="" loading="lazy" class="bm-fav" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"/>
                  <span style="display:none;font-size:14px">🎬</span>
                </div>
                <div class="w-bm-title">${escapeHtml(b.label)}</div>
              </a>`;
          }).join("")}
        </div>`;
    }
  }
};

/* helper for countdown defaults */
function nextDow(dow) {
  const d = new Date();
  const diff = (dow - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0,10);
}
function endOfMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().slice(0,10);
}
function humanizeDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m " + (s % 60) + "s";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h " + (m % 60) + "m";
  const d = Math.floor(h / 24);
  return d + "d " + (h % 24) + "h";
}

/* ============================================================
   CONFIG
   ============================================================ */
const DEFAULTS = {
  ports: [
    { port: 3000, label: "app",      path: "/",           profile: "frontend" },
    { port: 5173, label: "vite",     path: "/",           profile: "frontend" },
    { port: 8080, label: "api",      path: "/health",     profile: "backend" },
    { port: 5432, label: "postgres", path: null,          profile: "backend" },
    { port: 9090, label: "prom",     path: "/-/healthy",  profile: "backend" }
  ],
  infra: [
    { label: "Portainer",  url: "http://localhost:9000", profile: "homelab" },
    { label: "Grafana",    url: "http://localhost:3001", profile: "homelab" },
    { label: "Docker",     url: "http://localhost:9000/#!/containers", profile: "homelab" },
    { label: "Lens / k8s", url: "http://localhost:8001", profile: "work" },
    { label: "Proxmox",    url: "https://proxmox.local:8006", profile: "homelab" }
  ],
  snippets: [
    { id: "s1", label: "docker prune", cmd: "docker system prune -af --volumes", tags: ["docker"], uses: 0, lastUsed: 0 },
    { id: "s2", label: "git undo",     cmd: "git reset --soft HEAD~1",           tags: ["git"],    uses: 0, lastUsed: 0 },
    { id: "s3", label: "port find",    cmd: "lsof -i :3000",                     tags: ["debug"],  uses: 0, lastUsed: 0 },
    { id: "s4", label: "ssh tunnel",   cmd: "ssh -L {{local}}:localhost:{{remote}} {{user}}@{{host}}", tags: ["ssh"], uses: 0, lastUsed: 0 },
    { id: "s5", label: "k8s pods",     cmd: "kubectl get pods -A -o wide",       tags: ["k8s"],    uses: 0, lastUsed: 0 },
    { id: "s6", label: "pg dump",      cmd: "pg_dump -U {{user}} -d {{db}} > {{file}}.sql", tags: ["db"], uses: 0, lastUsed: 0 },
    { id: "s7", label: "deploy chain", cmd: "", tags: ["k8s","docker"], chain: [
      { cmd: "docker build -t {{image}} .", tags: ["docker"] },
      { cmd: "docker push {{image}}", tags: ["docker"] },
      { cmd: "kubectl rollout restart deploy/{{deploy}}", tags: ["k8s"] }
    ], uses: 0, lastUsed: 0 }
  ],
  bangs: {
    gh:       { name: "GitHub",        url: "https://github.com/search?q={q}" },
    ghr:      { name: "GitHub Repo",   url: "https://github.com/{q}" },
    mdn:      { name: "MDN Web Docs",  url: "https://developer.mozilla.org/en-US/search?q={q}" },
    caniuse:  { name: "Can I use",     url: "https://caniuse.com/?search={q}" },
    npm:      { name: "npm",           url: "https://www.npmjs.com/search?q={q}" },
    so:       { name: "StackOverflow", url: "https://stackoverflow.com/search?q={q}" },
    pypi:     { name: "PyPI",          url: "https://pypi.org/search/?q={q}" },
    crates:   { name: "crates.io",     url: "https://crates.io/search?q={q}" },
    w:        { name: "Wikipedia",     url: "https://en.wikipedia.org/wiki/Special:Search?search={q}" },
    yt:       { name: "YouTube",       url: "https://www.youtube.com/results?search_query={q}" },
    r:        { name: "Reddit",        url: "https://www.reddit.com/search/?q={q}" },
    hn:       { name: "Hacker News",   url: "https://hn.algolia.com/?q={q}" },
    devdocs:  { name: "DevDocs",       url: "https://devdocs.io/#q={q}" },
    docker:   { name: "Docker Hub",    url: "https://hub.docker.com/search?q={q}" },
    go:       { name: "Go Packages",   url: "https://pkg.go.dev/search?q={q}" },
    aw:       { name: "ArchWiki",      url: "https://wiki.archlinux.org/index.php?search={q}" },
    maps:     { name: "Google Maps",   url: "https://www.google.com/maps/search/{q}" },
    arxiv:    { name: "arXiv",         url: "https://arxiv.org/search/?query={q}&searchtype=all" },
    ghome:    { name: "Google Home",   url: "https://home.google.com/" },
    nflx:     { name: "Netflix",       url: "https://www.netflix.com/search?q={q}" },
    prime:    { name: "Prime Video",   url: "https://www.primevideo.com/search/ref=atv_nb_sr?phrase={q}" },
    bili:     { name: "Bilibili",      url: "https://search.bilibili.com/all?keyword={q}" },
    dm:       { name: "Dailymotion",   url: "https://www.dailymotion.com/search/{q}" }
  },
  engines: {
    ddg:        { name: "DuckDuckGo", url: "https://duckduckgo.com/?q={q}" },
    google:     { name: "Google",     url: "https://www.google.com/search?q={q}" },
    bing:       { name: "Bing",       url: "https://www.bing.com/search?q={q}" },
    brave:      { name: "Brave",      url: "https://search.brave.com/search?q={q}" },
    kagi:       { name: "Kagi",       url: "https://kagi.com/search?q={q}" },
    chatgpt:    { name: "ChatGPT",    url: "https://chatgpt.com/?q={q}" },
    claude:     { name: "Claude",     url: "https://claude.ai/new?q={q}" },
    gemini:     { name: "Gemini",     url: "https://gemini.google.com/app?q={q}" },
    perplexity: { name: "Perplexity", url: "https://www.perplexity.ai/search?q={q}" }
  },
  defaultEngine: "ddg",
  theme: "auto",
  accent: "#7aa8ff",
  wallpaper: "",
  wallpaperName: "",
  wallpaperType: "",
  wallpaperBlur: 0,
  wallpaperDim: 0.4,
  activeProfile: "all",
  profiles: {
    all:      { label: "all",      accent: null },
    frontend: { label: "frontend", accent: "#7aa8ff" },
    backend:  { label: "backend",  accent: "#4ade80" },
    homelab:  { label: "homelab",  accent: "#fbbf24" },
    work:     { label: "work",     accent: "#c084fc" }
  },
  pads: {
    active: "p1",
    buffers: { p1: { name: "notes", content: "", updated: Date.now() } }
  },
  searchHistory: {},
  clips: [],
  vault: null,
  vaultExpiry: {},
  vaultAutoLockMin: 10,
  lastExport: 0,
  firstRun: true,
  apiRequests: [
    { id: "r1", name: "GitHub API", method: "GET", url: "https://api.github.com/users/octocat", headers: [{k:"Accept",v:"application/json"}], body: "" }
  ],
  homeDevices: [
    { id: "hd-1", name: "Desk Lamp", type: "light", room: "Office", on: true, brightness: 80, webhookUrl: "" },
    { id: "hd-2", name: "Monitor Lightbar", type: "light", room: "Office", on: false, brightness: 60, webhookUrl: "" },
    { id: "hd-3", name: "Workstation PC", type: "plug", room: "Office", on: true, power: "145W", webhookUrl: "" },
    { id: "hd-4", name: "Ceiling Light", type: "light", room: "Living Room", on: true, brightness: 100, webhookUrl: "" },
    { id: "hd-5", name: "Nest Thermostat", type: "thermostat", room: "Hallway", on: true, targetTemp: 22, currentTemp: 21, unit: "°C", mode: "heat", webhookUrl: "" },
    { id: "hd-6", name: "Nest Audio", type: "speaker", room: "Living Room", on: false, volume: 50, playing: false, webhookUrl: "" },
    { id: "hd-7", name: "Front Door", type: "lock", room: "Entryway", on: true, locked: true, webhookUrl: "" }
  ],
  homeScenes: [
    { id: "sc-1", name: "Focus Work", icon: "💻", actions: [
      { id: "hd-1", on: true, brightness: 80 },
      { id: "hd-2", on: true, brightness: 70 },
      { id: "hd-3", on: true }
    ]},
    { id: "sc-2", name: "Movie Night", icon: "🍿", actions: [
      { id: "hd-1", on: false },
      { id: "hd-2", on: false },
      { id: "hd-4", on: true, brightness: 25 }
    ]},
    { id: "sc-3", name: "All Devices Off", icon: "🌙", actions: [
      { id: "hd-1", on: false },
      { id: "hd-2", on: false },
      { id: "hd-3", on: false },
      { id: "hd-4", on: false },
      { id: "hd-6", on: false }
    ]},
    { id: "sc-4", name: "Good Morning", icon: "☀️", actions: [
      { id: "hd-1", on: true, brightness: 70 },
      { id: "hd-4", on: true, brightness: 80 },
      { id: "hd-5", targetTemp: 22 }
    ]}
  ],
  googleAuth: {
    connected: false,
    email: "",
    name: "",
    picture: "",
    clientId: "",
    projectId: "",
    accessToken: "",
    tokenExpiry: 0
  },
  plugins: [
    {
      id: "pl-hn",
      name: "Custom widget example (HN top)",
      enabled: false,
      code: `async function () {
  const r = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  const ids = (await r.json()).slice(0, 5);
  const items = await Promise.all(ids.map(i => fetch("https://hacker-news.firebaseio.com/v0/item/"+i+".json").then(x => x.json())));
  return items.map(i => \`<div style="margin:4px 0"><a href="\${i.url || 'https://news.ycombinator.com/item?id='+i.id}" target="_blank">\${i.title}</a></div>\`).join("");
}`
    }
  ],
  layout: null,
  widgets: [
    { id: "w-clock-1",   type: "clock",      config: {} },
    { id: "w-weather-1", type: "weather",    config: { lat: 28.689560383588127, lon: 77.29471663673375, place: "New Delhi" } },
    { id: "w-bm-1",      type: "bookmarks",  config: {
        title: "Speed Dial",
        items: [
          { label: "GitHub", url: "https://github.com" },
          { label: "Hacker News", url: "https://news.ycombinator.com" },
          { label: "YouTube", url: "https://youtube.com" },
          { label: "Reddit", url: "https://reddit.com" },
          { label: "StackOverflow", url: "https://stackoverflow.com" },
          { label: "ChatGPT", url: "https://chatgpt.com" }
        ]
      }
    },
    { id: "w-ent-1",     type: "entertainment", config: {
        title: "Entertainment",
        items: [
          { label: "Netflix",     url: "https://www.netflix.com" },
          { label: "Prime Video", url: "https://www.primevideo.com" },
          { label: "JioHotstar",  url: "https://www.hotstar.com" },
          { label: "YouTube",     url: "https://www.youtube.com" },
          { label: "Bilibili",    url: "https://www.bilibili.com" },
          { label: "Dailymotion", url: "https://www.dailymotion.com" }
        ]
      }
    },
    { id: "w-sys-1",     type: "sysinfo",    config: {} }
  ]
};

const LS_KEY = "startpage.config.v7";
let cfg = load();

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
             || localStorage.getItem("startpage.config.v6")
             || localStorage.getItem("startpage.config.v5")
             || localStorage.getItem("startpage.config.v4")
             || localStorage.getItem("startpage.config.v3");
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    const merged = { ...structuredClone(DEFAULTS), ...parsed };
    merged.pads = { ...structuredClone(DEFAULTS.pads), ...(parsed.pads || {}) };
    merged.pads.buffers = { ...structuredClone(DEFAULTS.pads.buffers), ...((parsed.pads || {}).buffers || {}) };
    merged.profiles = { ...structuredClone(DEFAULTS.profiles), ...(parsed.profiles || {}) };
    merged.engines = { ...structuredClone(DEFAULTS.engines), ...(parsed.engines || {}) };
    merged.bangs   = { ...structuredClone(DEFAULTS.bangs),   ...(parsed.bangs   || {}) };
    merged.homeDevices = Array.isArray(parsed.homeDevices) ? parsed.homeDevices : structuredClone(DEFAULTS.homeDevices);
    merged.homeScenes  = Array.isArray(parsed.homeScenes)  ? parsed.homeScenes  : structuredClone(DEFAULTS.homeScenes);
    merged.googleAuth  = { ...structuredClone(DEFAULTS.googleAuth), ...(parsed.googleAuth || {}) };

    // Migrate old default widgets (e.g. 3-item setup with octocat / old SF weather) to new standard defaults
    const isOldDefaultWidgets = Array.isArray(parsed.widgets) && (
      (parsed.widgets.length === 3 && parsed.widgets.some(w => w.type === "github" && w.config?.user === "octocat")) ||
      !parsed.widgets.length
    );
    if (isOldDefaultWidgets || !parsed.widgets) {
      merged.widgets = structuredClone(DEFAULTS.widgets);
    } else {
      merged.widgets = parsed.widgets;
    }
    // Google Home is accessed as a Tool, not as a dashboard widget
    merged.widgets = (merged.widgets || []).filter(w => w.type !== "googlehome");

    // Auto-add Entertainment speed dial widget if not already added
    if (Array.isArray(merged.widgets) && !merged.widgets.some(w => w.type === "entertainment" || w.id === "w-ent-1")) {
      const entMigrated = localStorage.getItem("devdeck.ent_widget_added");
      if (!entMigrated) {
        const entDef = DEFAULTS.widgets.find(w => w.type === "entertainment");
        if (entDef) merged.widgets.push(structuredClone(entDef));
        try { localStorage.setItem("devdeck.ent_widget_added", "1"); } catch {}
      }
    }

    return merged;
  } catch { return structuredClone(DEFAULTS); }
}
function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); }
  catch { toast("storage quota exceeded"); }
}

/* ============================================================
   TOAST + UNDO
   ============================================================ */
let toastTimer, undoSlot;
function toast(msg, action) {
  const el = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  const btn = document.getElementById("toastAction");
  if (action) {
    btn.style.display = "";
    btn.textContent = action.label;
    btn.onclick = () => { action.run(); el.classList.remove("show"); undoSlot = null; };
  } else { btn.style.display = "none"; btn.onclick = null; }
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), action ? 6000 : 2000);
}
function setUndo(type, item, index) {
  undoSlot = { type, item, index, ts: Date.now() };
  toast("deleted — undo?", { label: "↶ undo", run: () => {
    if (type === "snippet") { cfg.snippets.splice(index, 0, item); save(); renderSnipTags(); renderSnippets(); }
    if (type === "pad")     { cfg.pads.buffers[item.id] = item.buf; save(); renderPad(); }
    if (type === "widget")  { cfg.widgets.splice(index, 0, item); save(); renderWidgets(); }
  }});
}

/* ============================================================
   INDEXEDDB LOCAL WALLPAPER STORAGE
   ============================================================ */
const IDB_WP_NAME = "devdeck_media";
const IDB_WP_STORE = "wallpapers";

function getWallpaperDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB not supported"));
    const req = indexedDB.open(IDB_WP_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_WP_STORE)) {
        db.createObjectStore(IDB_WP_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalWallpaper(blob) {
  try {
    const db = await getWallpaperDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_WP_STORE, "readwrite");
      const store = tx.objectStore(IDB_WP_STORE);
      store.put(blob, "active_wallpaper");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to save local wallpaper to IndexedDB:", err);
    return false;
  }
}

async function getLocalWallpaper() {
  try {
    const db = await getWallpaperDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_WP_STORE, "readonly");
      const store = tx.objectStore(IDB_WP_STORE);
      const req = store.get("active_wallpaper");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to retrieve local wallpaper:", err);
    return null;
  }
}

async function deleteLocalWallpaper() {
  try {
    const db = await getWallpaperDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_WP_STORE, "readwrite");
      const store = tx.objectStore(IDB_WP_STORE);
      store.delete("active_wallpaper");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to delete local wallpaper from IndexedDB:", err);
    return false;
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const WP_PRESETS = [
  { name: "Cyberpunk Neon", url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=80" },
  { name: "Deep Space", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80" },
  { name: "Tokyo Night", url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1920&q=80" },
  { name: "Dark Geometry", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80" },
  { name: "Minimal Mountain", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80" },
  { name: "Forest Mist", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80" }
];

let activeWallpaperBlobUrl = null;

/* ============================================================
   THEME & WALLPAPER
   ============================================================ */
function applyTheme() {
  const t = cfg.theme || "auto";
  document.documentElement.removeAttribute("data-theme");
  if (t !== "auto") document.documentElement.setAttribute("data-theme", t);
  const prof = cfg.profiles?.[cfg.activeProfile] ?? cfg.profiles?.[Object.keys(cfg.profiles || {})[0]] ?? {};
  const accent = (prof && prof.accent) || cfg.accent || "#7aa8ff";
  document.documentElement.style.setProperty("--accent", accent);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === "light" ? "#f7f8fa" : "#0b0c0f";

  // Wallpaper background
  const bg = document.getElementById("bgWallpaper");
  if (!bg) return;

  const raw = (cfg.wallpaper || "").trim();
  const blur = cfg.wallpaperBlur ?? 0;
  const dim = cfg.wallpaperDim ?? 0.4;
  bg.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
  bg.style.opacity = (1 - dim).toString();

  if (raw === "local") {
    getLocalWallpaper().then(blob => {
      if (blob && cfg.wallpaper === "local") {
        if (activeWallpaperBlobUrl) URL.revokeObjectURL(activeWallpaperBlobUrl);
        activeWallpaperBlobUrl = URL.createObjectURL(blob);
        bg.style.backgroundImage = `url("${activeWallpaperBlobUrl}")`;
        bg.style.display = "block";
      } else if (cfg.wallpaper !== "local") {
        // user switched away from local wallpaper
      } else {
        bg.style.display = "none";
        bg.style.backgroundImage = "none";
      }
    }).catch(e => {
      console.warn("Could not load local wallpaper from IndexedDB:", e);
      bg.style.display = "none";
      bg.style.backgroundImage = "none";
    });
  } else if (raw && /^(https?:\/\/|data:image\/|blob:)/i.test(raw)) {
    if (activeWallpaperBlobUrl) { URL.revokeObjectURL(activeWallpaperBlobUrl); activeWallpaperBlobUrl = null; }
    bg.style.backgroundImage = `url("${raw.replace(/"/g, "%22")}")`;
    bg.style.display = "block";
  } else {
    if (activeWallpaperBlobUrl) { URL.revokeObjectURL(activeWallpaperBlobUrl); activeWallpaperBlobUrl = null; }
    bg.style.display = "none";
    bg.style.backgroundImage = "none";
  }
}

function openThemeModal() {
  const currentAccent = (cfg.profiles[cfg.activeProfile]?.accent) || cfg.accent || "#7aa8ff";
  const swatches = [
    { name: "Cyber Blue", hex: "#7aa8ff" },
    { name: "Emerald", hex: "#4ade80" },
    { name: "Amber", hex: "#fbbf24" },
    { name: "Purple", hex: "#c084fc" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Cyan", hex: "#06b6d4" },
    { name: "Orange", hex: "#fb923c" },
    { name: "Coral", hex: "#ff6b6b" }
  ];

  const initialWpType = cfg.wallpaper === "local" ? "local" : (cfg.wallpaperType === "preset" || WP_PRESETS.some(p => p.url === cfg.wallpaper) ? "presets" : (cfg.wallpaper ? "url" : "local"));

  openModal("Appearance & Wallpaper", `
    <div class="field">
      <label>Base Theme</label>
      <div class="row">
        <button id="thDark" class="${cfg.theme==='dark'?'':'ghost'}">Dark</button>
        <button id="thLight" class="${cfg.theme==='light'?'':'ghost'}">Light</button>
        <button id="thAuto" class="${cfg.theme==='auto'?'':'ghost'}">System Auto</button>
      </div>
    </div>
    <div class="field">
      <label>Accent Color</label>
      <div class="theme-swatches">
        ${swatches.map(s => `<div class="theme-swatch ${s.hex===currentAccent?'active':''}" style="background:${s.hex}" data-hex="${s.hex}" title="${s.name}"></div>`).join("")}
      </div>
      <div class="row" style="align-items:center;gap:10px">
        <input type="color" id="thColorPick" value="${currentAccent}" style="width:40px;height:32px;padding:0;border:none;cursor:pointer;background:transparent"/>
        <input type="text" id="thColorHex" value="${currentAccent}" placeholder="#7aa8ff" style="font-family:var(--mono);flex:1"/>
      </div>
    </div>
    <div class="field">
      <label>Background Wallpaper</label>
      <div class="tabs" style="margin-bottom:12px">
        <button type="button" class="tb ${initialWpType==='local'?'active':''}" id="tabWpLocal">📁 Local Storage</button>
        <button type="button" class="tb ${initialWpType==='presets'?'active':''}" id="tabWpPresets">✨ Curated Presets</button>
        <button type="button" class="tb ${initialWpType==='url'?'active':''}" id="tabWpUrl">🔗 Image URL</button>
      </div>

      <!-- Local File Upload Panel -->
      <div id="wpPanelLocal" style="${initialWpType==='local'?'':'display:none'}">
        <div class="wp-dropzone" id="wpDropzone">
          <input type="file" id="thLocalFile" accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/gif" style="display:none"/>
          <div class="drop-icon">🖼️</div>
          <div class="drop-title">Choose image from your local computer</div>
          <div class="drop-hint">Click to browse or drag & drop (PNG, JPG, WebP, AVIF, SVG)</div>
          <button type="button" class="btn" id="btnBrowseLocal" style="margin-top:10px">Browse Local Image…</button>
        </div>
        <div id="wpFileInfo" class="wp-file-info" style="${cfg.wallpaper==='local' && cfg.wallpaperName ? '' : 'display:none'}">
          <div class="wp-file-meta">
            <span style="font-size:18px">📁</span>
            <div style="min-width:0;flex:1">
              <div id="wpFileName" class="wp-file-name">${escapeHtml(cfg.wallpaperName||'Custom local wallpaper')}</div>
              <div style="font-size:10.5px;color:var(--dim);margin-top:1px">Saved locally in browser storage (IndexedDB)</div>
            </div>
            <span class="wp-file-badge">Active</span>
          </div>
          <button type="button" class="btn ghost" id="btnRemoveLocalFile" style="color:var(--red);font-size:11.5px;padding:4px 8px" title="Remove local wallpaper">Remove</button>
        </div>
      </div>

      <!-- Curated Presets Panel -->
      <div id="wpPanelPresets" style="${initialWpType==='presets'?'':'display:none'}">
        <div class="wp-presets-grid">
          ${WP_PRESETS.map(p => `
            <div class="wp-preset-card ${cfg.wallpaper===p.url?'active':''}" style="background-image:url('${p.url}')" data-url="${p.url}" data-name="${p.name}">
              <span class="label">${p.name}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Custom URL Panel -->
      <div id="wpPanelUrl" style="${initialWpType==='url'?'':'display:none'}">
        <input type="text" id="thWallpaper" value="${escapeHtml(cfg.wallpaper==='local'?'':cfg.wallpaper||'')}" placeholder="https://images.unsplash.com/... or direct image URL"/>
        <p class="hint-text" style="font-size:11.5px;margin-top:6px;color:var(--dim)">Paste any public HTTPS image link.</p>
      </div>
    </div>
    <div class="field">
      <div class="wrow" style="display:flex;justify-content:space-between;align-items:center">
        <label>Wallpaper Blur (${cfg.wallpaperBlur||0}px)</label>
        <span id="thBlurVal" style="font-family:var(--mono);font-size:12px">${cfg.wallpaperBlur||0}px</span>
      </div>
      <input type="range" id="thBlur" min="0" max="25" step="1" value="${cfg.wallpaperBlur||0}" style="width:100%"/>
    </div>
    <div class="field">
      <div class="wrow" style="display:flex;justify-content:space-between;align-items:center">
        <label>Wallpaper Dim Overlay (${Math.round((cfg.wallpaperDim??0.4)*100)}%)</label>
        <span id="thDimVal" style="font-family:var(--mono);font-size:12px">${Math.round((cfg.wallpaperDim??0.4)*100)}%</span>
      </div>
      <input type="range" id="thDim" min="0" max="0.9" step="0.05" value="${cfg.wallpaperDim??0.4}" style="width:100%"/>
    </div>
    <div class="row">
      <button id="thSave">Save Changes</button>
      <button id="thClearWp" class="ghost">Remove Wallpaper</button>
    </div>
  `);

  // Accent color handlers
  const setAccent = (hex) => {
    document.getElementById("thColorHex").value = hex;
    document.getElementById("thColorPick").value = hex;
    document.querySelectorAll(".theme-swatches .theme-swatch").forEach(sw => {
      sw.classList.toggle("active", sw.dataset.hex.toLowerCase() === hex.toLowerCase());
    });
    cfg.accent = hex;
    if (cfg.profiles[cfg.activeProfile]) cfg.profiles[cfg.activeProfile].accent = hex;
    applyTheme();
  };

  document.querySelectorAll(".theme-swatches .theme-swatch").forEach(sw => {
    sw.onclick = () => setAccent(sw.dataset.hex);
  });
  document.getElementById("thColorPick").oninput = (e) => setAccent(e.target.value);
  document.getElementById("thColorHex").oninput = (e) => {
    const val = e.target.value.trim();
    if (/^#[0-9a-f]{6}$/i.test(val)) setAccent(val);
  };

  // Base theme handlers
  const setTheme = (mode) => {
    cfg.theme = mode;
    ["thDark","thLight","thAuto"].forEach(id => document.getElementById(id).classList.add("ghost"));
    if (mode === "dark") document.getElementById("thDark").classList.remove("ghost");
    if (mode === "light") document.getElementById("thLight").classList.remove("ghost");
    if (mode === "auto") document.getElementById("thAuto").classList.remove("ghost");
    applyTheme();
  };
  document.getElementById("thDark").onclick = () => setTheme("dark");
  document.getElementById("thLight").onclick = () => setTheme("light");
  document.getElementById("thAuto").onclick = () => setTheme("auto");

  // Blur and Dim sliders
  document.getElementById("thBlur").oninput = (e) => {
    cfg.wallpaperBlur = parseInt(e.target.value) || 0;
    document.getElementById("thBlurVal").textContent = cfg.wallpaperBlur + "px";
    applyTheme();
  };
  document.getElementById("thDim").oninput = (e) => {
    cfg.wallpaperDim = parseFloat(e.target.value) || 0;
    document.getElementById("thDimVal").textContent = Math.round(cfg.wallpaperDim * 100) + "%";
    applyTheme();
  };

  // Tab switching (Local / Presets / URL)
  const tabLocal = document.getElementById("tabWpLocal");
  const tabPresets = document.getElementById("tabWpPresets");
  const tabUrl = document.getElementById("tabWpUrl");
  const panelLocal = document.getElementById("wpPanelLocal");
  const panelPresets = document.getElementById("wpPanelPresets");
  const panelUrl = document.getElementById("wpPanelUrl");

  function switchWpTab(tab) {
    [tabLocal, tabPresets, tabUrl].forEach(b => b.classList.remove("active"));
    panelLocal.style.display = "none";
    panelPresets.style.display = "none";
    panelUrl.style.display = "none";

    if (tab === "local") {
      tabLocal.classList.add("active");
      panelLocal.style.display = "";
    } else if (tab === "presets") {
      tabPresets.classList.add("active");
      panelPresets.style.display = "";
    } else if (tab === "url") {
      tabUrl.classList.add("active");
      panelUrl.style.display = "";
    }
  }

  tabLocal.onclick = () => switchWpTab("local");
  tabPresets.onclick = () => switchWpTab("presets");
  tabUrl.onclick = () => switchWpTab("url");

  // Local File Processing
  const localFileInput = document.getElementById("thLocalFile");
  const btnBrowseLocal = document.getElementById("btnBrowseLocal");
  const wpDropzone = document.getElementById("wpDropzone");
  const wpFileInfo = document.getElementById("wpFileInfo");
  const wpFileName = document.getElementById("wpFileName");
  const btnRemoveLocalFile = document.getElementById("btnRemoveLocalFile");

  async function handleLocalImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file (PNG, JPG, WebP, etc.)");
      return;
    }
    const saved = await saveLocalWallpaper(file);
    if (saved) {
      cfg.wallpaper = "local";
      cfg.wallpaperName = `${file.name} (${formatFileSize(file.size)})`;
      cfg.wallpaperType = "local";
      wpFileName.textContent = cfg.wallpaperName;
      wpFileInfo.style.display = "flex";
      // Clear preset selection highlights
      document.querySelectorAll(".wp-preset-card").forEach(c => c.classList.remove("active"));
      applyTheme();
      toast("Local wallpaper loaded");
    } else {
      toast("Failed to save wallpaper locally");
    }
  }

  btnBrowseLocal.onclick = (e) => { e.stopPropagation(); localFileInput.click(); };
  wpDropzone.onclick = () => localFileInput.click();
  localFileInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleLocalImageFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  wpDropzone.ondragover = (e) => { e.preventDefault(); wpDropzone.classList.add("dragover"); };
  wpDropzone.ondragleave = () => wpDropzone.classList.remove("dragover");
  wpDropzone.ondrop = (e) => {
    e.preventDefault();
    wpDropzone.classList.remove("dragover");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLocalImageFile(e.dataTransfer.files[0]);
    }
  };

  // Presets selection
  document.querySelectorAll(".wp-preset-card").forEach(card => {
    card.onclick = () => {
      document.querySelectorAll(".wp-preset-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      cfg.wallpaper = card.dataset.url;
      cfg.wallpaperName = card.dataset.name;
      cfg.wallpaperType = "preset";
      wpFileInfo.style.display = "none";
      applyTheme();
      toast(`Preset "${card.dataset.name}" applied`);
    };
  });

  // URL Input
  const thWallpaperInput = document.getElementById("thWallpaper");
  thWallpaperInput.oninput = (e) => {
    const val = e.target.value.trim();
    if (val) {
      cfg.wallpaper = val;
      cfg.wallpaperType = "url";
      cfg.wallpaperName = "";
      wpFileInfo.style.display = "none";
      document.querySelectorAll(".wp-preset-card").forEach(c => c.classList.remove("active"));
    } else if (cfg.wallpaperType === "url") {
      cfg.wallpaper = "";
    }
    applyTheme();
  };

  // Remove local file
  btnRemoveLocalFile.onclick = async () => {
    await deleteLocalWallpaper();
    cfg.wallpaper = "";
    cfg.wallpaperName = "";
    cfg.wallpaperType = "";
    wpFileInfo.style.display = "none";
    applyTheme();
    toast("Local wallpaper removed");
  };

  // Remove wallpaper completely
  document.getElementById("thClearWp").onclick = async () => {
    await deleteLocalWallpaper();
    cfg.wallpaper = "";
    cfg.wallpaperName = "";
    cfg.wallpaperType = "";
    thWallpaperInput.value = "";
    wpFileInfo.style.display = "none";
    document.querySelectorAll(".wp-preset-card").forEach(c => c.classList.remove("active"));
    applyTheme();
    toast("Wallpaper cleared");
  };

  // Save changes
  document.getElementById("thSave").onclick = () => {
    if (panelUrl.style.display !== "none") {
      const urlVal = thWallpaperInput.value.trim();
      if (urlVal) {
        cfg.wallpaper = urlVal;
        cfg.wallpaperType = "url";
      }
    }
    cfg.wallpaperBlur = parseInt(document.getElementById("thBlur").value) || 0;
    cfg.wallpaperDim = parseFloat(document.getElementById("thDim").value) || 0.4;
    save();
    applyTheme();
    closeModal();
    toast("Appearance saved");
  };
}

document.getElementById("btnTheme").onclick = () => {
  cfg.theme = cfg.theme === "dark" ? "light" : cfg.theme === "light" ? "auto" : "dark";
  applyTheme(); save();
  toast(`theme: ${cfg.theme}`);
};
document.getElementById("btnCustomize").onclick = () => openThemeModal();

function renderProfileSwitch() {
  const el = document.getElementById("profileSwitch");
  el.innerHTML = "";
  Object.entries(cfg.profiles).forEach(([key, p]) => {
    const b = document.createElement("button");
    b.className = "icon-btn" + (key === cfg.activeProfile ? " active" : "");
    if (key === cfg.activeProfile) { b.style.color = "var(--fg)"; b.style.background = "var(--panel-2)"; }
    b.textContent = p.label;
    b.title = `Switch to ${p.label} profile`;
    b.onclick = () => {
      cfg.activeProfile = key; save(); applyTheme();
      renderProfileSwitch(); renderPorts(); renderInfra(); renderSnipTags(); renderSnippets(); renderBangHint();
      toast("profile: " + p.label);
    };
    el.appendChild(b);
  });
}


/* ============================================================
   WIDGETS — rendering & management
   ============================================================ */
const widgetTimers = new Map();

function widgetById(id) { return cfg.widgets.find(w => w.id === id); }

function renderWidgets() {
  const grid = document.getElementById("widgetsGrid");
  grid.innerHTML = "";
  // clear old timers
  for (const t of widgetTimers.values()) clearInterval(t);
  widgetTimers.clear();

  if (!cfg.widgets.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1">no widgets — click ＋ in the header to add one</div>`;
    return;
  }

  cfg.widgets.forEach((w, idx) => {
    const def = WIDGETS[w.type];
    if (!def) return;
    const card = document.createElement("div");
    card.className = "widget" + (w.wide ? " wide" : "");
    const wTitle = (w.config && w.config.title) || def.name;
    const wIcon = (w.config && w.config.icon) || def.icon;
    card.innerHTML = `
      <div class="widget-head">
        <div class="widget-title"><span class="w-ico">${wIcon}</span>${escapeHtml(wTitle)}</div>
        <button class="widget-menu" aria-label="Options for ${escapeHtml(wTitle)}" data-menu="${w.id}">⋯</button>
      </div>
      <div class="widget-body loading">loading…</div>
    `;
    grid.appendChild(card);

    const body = card.querySelector(".widget-body");

    // menu
    card.querySelector(".widget-menu").onclick = (e) => {
      e.stopPropagation();
      openWidgetMenu(w.id, card);
    };

    // render
    renderWidget(w, body);

    // schedule refresh
    if (def.refresh && def.refresh > 0) {
      const t = setInterval(() => renderWidget(w, body), def.refresh);
      widgetTimers.set(w.id, t);
    }
  });
}

async function renderWidget(w, body) {
  const def = WIDGETS[w.type];
  if (!def) { body.innerHTML = `<div class="widget-body error">unknown widget type: ${escapeHtml(w.type)}</div>`; return; }
  // Cancel any in-flight render for this widget element
  if (body._renderAbort) body._renderAbort.abort();
  const ctrl = new AbortController();
  body._renderAbort = ctrl;
  try {
    body.classList.remove("error");
    // Preserve loading state only on first render
    if (!body.dataset.loaded) {
      body.classList.add("loading");
      body.textContent = "loading…";
    }
    await def.render(body, w.config || {}, () => {
      save();
    });
    if (ctrl.signal.aborted) return; // stale render — discard
    body.classList.remove("loading");
    body.dataset.loaded = "1";
  } catch (e) {
    if (ctrl.signal.aborted) return; // stale — swallow
    body.classList.remove("loading");
    body.classList.add("error");
    body.textContent = "✗ " + (e.message || e);
  }
}

function openWidgetMenu(id, card) {
  const w = widgetById(id);
  if (!w) return;
  const def = WIDGETS[w.type];
  const wTitle = (w.config && w.config.title) || def.name;
  const rect = card.getBoundingClientRect();
  // simple inline popover using modal for reliability
  openModal(`Widget: ${wTitle}`, `
    <p class="hint-text">${escapeHtml(def.desc)}</p>
    <div class="w-config" id="wCfgForm">
      ${def.config ? def.config(w.config || {}) : `<p style="color:var(--muted);font-size:12px">This widget has no configuration.</p>`}
    </div>
    <div class="row" style="margin-top:16px">
      ${def.config ? `<button id="wSave">Save</button>` : ""}
      <button id="wRefresh" class="ghost">Refresh now</button>
      <button id="wWide" class="ghost">${w.wide ? "Normal width" : "Wide"}</button>
      <button id="wDelete" class="ghost" style="color:var(--red);border-color:var(--red)">Delete widget</button>
    </div>
  `);
  if (def.config) {
    document.getElementById("wSave").onclick = () => {
      try {
        const newCfg = def.readConfig ? def.readConfig(document.getElementById("wCfgForm")) : w.config;
        w.config = { ...w.config, ...newCfg };
        save();
        closeModal();
        renderWidgets();
        toast("widget updated");
      } catch (e) { toast("config error: " + e.message); }
    };
  }
  document.getElementById("wRefresh").onclick = () => {
    closeModal();
    const card = [...document.querySelectorAll(".widget")].find(c => c.querySelector(`[data-menu="${id}"]`));
    if (card) renderWidget(w, card.querySelector(".widget-body"));
  };
  document.getElementById("wWide").onclick = () => {
    w.wide = !w.wide; save(); closeModal(); renderWidgets();
  };
  document.getElementById("wDelete").onclick = () => {
    const idx = cfg.widgets.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = cfg.widgets[idx];
    cfg.widgets.splice(idx, 1);
    save(); closeModal(); renderWidgets();
    setUndo("widget", item, idx);
  };
}

/* ---------- Add widget gallery ---------- */
document.getElementById("btnWidgets").onclick = () => openWidgetGallery();

function openWidgetGallery() {
  const installed = new Set(cfg.widgets.map(w => w.type));
  openModal("Add a widget", `
    <p class="hint-text">Pick a widget to add. You can configure and remove it any time from its ⋯ menu.</p>
    <div class="w-gallery">
      ${Object.entries(WIDGETS).map(([key, def]) => `
        <div class="w-gal-card ${installed.has(key) ? "installed" : ""}" data-add="${key}">
          <div class="name"><span class="ico">${def.icon}</span>${escapeHtml(def.name)}</div>
          <div class="desc">${escapeHtml(def.desc)}</div>
          <div class="install">${installed.has(key) ? "already added · click to add another" : "+ click to add"}</div>
        </div>
      `).join("")}
    </div>
  `);
  document.getElementById("modalBox").classList.add("wide");
  document.querySelectorAll("[data-add]").forEach(el => {
    el.onclick = () => {
      const type = el.dataset.add;
      const def = WIDGETS[type];
      const id = "w-" + type + "-" + Math.random().toString(36).slice(2, 6);
      cfg.widgets.push({ id, type, config: structuredClone(def.defaults || {}) });
      save();
      closeModal();
      renderWidgets();
      toast(`added: ${def.name}`);
    };
  });
}

/* ============================================================
   PORTS
   ============================================================ */
const portHistory = {};
const HISTORY_MAX = 30;

function visiblePorts() {
  if (cfg.activeProfile === "all") return cfg.ports;
  return cfg.ports.filter(p => !p.profile || p.profile === cfg.activeProfile || p.profile === "all");
}
function renderPorts() {
  const el = document.getElementById("ports");
  el.innerHTML = "";
  const list = visiblePorts();
  if (!list.length) { el.innerHTML = `<div class="empty">no ports in this profile</div>`; return; }
  list.forEach(p => {
    const a = document.createElement("a");
    a.className = "port";
    a.href = `http://localhost:${p.port}`;
    a.target = "_blank"; a.rel = "noopener";
    a.dataset.port = p.port;
    a.innerHTML = `
      <span class="dot checking"></span>
      <span>${p.port}</span>
      <span class="label">${p.label || ""}</span>
      <svg class="spark" viewBox="0 0 36 12" preserveAspectRatio="none"></svg>
    `;
    a.addEventListener("mouseenter", () => showPortTooltip(a, p));
    el.appendChild(a);
  });
  checkPorts();
}
function showPortTooltip(node, p) {
  const h = portHistory[p.port] || [];
  if (!h.length) return;
  const oks = h.filter(x => x.ok).map(x => x.ms).sort((a,b)=>a-b);
  const p50 = oks.length ? Math.round(oks[Math.floor(oks.length*0.5)]) : 0;
  const p95 = oks.length ? Math.round(oks[Math.floor(oks.length*0.95)]) : 0;
  const up = h.filter(x => x.ok).length;
  node.title = `${p.label} :${p.port}\np50 ${p50}ms · p95 ${p95}ms\nuptime ${up}/${h.length}`;
}
async function checkPorts() {
  const nodes = [...document.querySelectorAll("#ports .port")];
  await Promise.all(nodes.map(async (node) => {
    const port = Number(node.dataset.port);
    const p = cfg.ports.find(x => x.port === port);
    if (!p) return;
    const dot = node.querySelector(".dot");
    dot.className = "dot checking";
    const t0 = performance.now();
    const ok = await pingHttp(`http://localhost:${p.port}${p.path || "/"}`);
    const ms = Math.round(performance.now() - t0);
    (portHistory[port] = portHistory[port] || []).push({ ts: Date.now(), ms, ok });
    if (portHistory[port].length > HISTORY_MAX) portHistory[port].shift();
    dot.className = "dot " + (ok ? "up" : "down");
    drawSpark(node.querySelector(".spark"), portHistory[port]);
  }));
}
function drawSpark(svg, hist) {
  if (!svg) return;
  const w = 36, h = 12;
  const pts = hist.slice(-HISTORY_MAX);
  if (!pts.length) { svg.innerHTML = ""; return; }
  const xs = pts.map((_, i) => (i / Math.max(1, pts.length - 1)) * w);
  const maxMs = Math.max(50, ...pts.map(p => p.ms));
  const ys = pts.map(p => h - (p.ok ? (p.ms / maxMs) * h : 0));
  const path = pts.map((p, i) => `${i?"L":"M"}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  svg.innerHTML = `<path d="${path}" fill="none" stroke="var(--green)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function pingHttp(url, timeout = 1500) {
  return new Promise(res => {
    const ctrl = new AbortController();
    const t = setTimeout(() => { ctrl.abort(); res(false); }, timeout);
    fetch(url, { mode: "no-cors", signal: ctrl.signal, cache: "no-store" })
      .then(() => { clearTimeout(t); res(true); })
      .catch(() => { clearTimeout(t); res(false); });
  });
}
setInterval(checkPorts, 20000);

document.getElementById("scanPorts").onclick = () => {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = ".yml,.yaml,.json";
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const text = r.result;
      const found = new Set();
      for (const m of text.matchAll(/["']?(\d{2,5}):\d{2,5}["']?/g)) found.add(Number(m[1]));
      for (const m of text.matchAll(/--port[= ]+(\d{2,5})/g)) found.add(Number(m[1]));
      for (const m of text.matchAll(/localhost:(\d{2,5})/g)) found.add(Number(m[1]));
      const existing = new Set(cfg.ports.map(p => p.port));
      const suggestions = [...found].filter(p => !existing.has(p));
      if (!suggestions.length) { toast("no new ports found"); return; }
      openModal("Import detected ports", `
        <p class="hint-text">Found ${suggestions.length} new port(s):</p>
        ${suggestions.map(p => `<label style="display:block;margin:8px 0"><input type="checkbox" data-p="${p}" checked> <code>${p}</code></label>`).join("")}
        <div class="row"><button id="doImport">Add selected</button></div>`);
      document.getElementById("doImport").onclick = () => {
        document.querySelectorAll("#modalBody input[data-p]:checked").forEach(cb => {
          cfg.ports.push({ port: Number(cb.dataset.p), label: "auto", path: "/", profile: cfg.activeProfile === "all" ? "frontend" : cfg.activeProfile });
        });
        save(); renderPorts(); closeModal();
        toast(`imported ${suggestions.length} port(s)`);
      };
    };
    r.readAsText(f);
  };
  inp.click();
};

/* ============================================================
   INFRA
   ============================================================ */
function renderInfra() {
  const el = document.getElementById("infra");
  el.innerHTML = "";
  const list = cfg.activeProfile === "all" ? cfg.infra : cfg.infra.filter(x => !x.profile || x.profile === cfg.activeProfile);
  if (!list.length) { el.innerHTML = `<div class="empty">no infra links in this profile</div>`; return; }
  list.forEach(item => {
    const a = document.createElement("a");
    a.className = "infra-card";
    a.href = item.url; a.target = "_blank"; a.rel = "noopener";
    let host = "";
    try { host = new URL(item.url).hostname.replace(/^www\./, ""); } catch {}
    a.innerHTML = `
      <div class="infra-main">
        <span class="infra-dot"></span>
        <div class="infra-info">
          <span class="infra-name">${escapeHtml(item.label)}</span>
          ${host ? `<span class="infra-host">${escapeHtml(host)}</span>` : ""}
        </div>
      </div>
      <span class="arrow">↗</span>`;
    el.appendChild(a);
  });
}

/* ============================================================
   SCRATCHPAD
   ============================================================ */
let padSaveTimer;
const padChan = ("BroadcastChannel" in window) ? new BroadcastChannel("startpage-pads") : null;

function renderPad() {
  const tabs = document.getElementById("padTabs");
  const area = document.getElementById("padArea");
  tabs.innerHTML = "";
  const buffers = cfg.pads.buffers;
  Object.entries(buffers).forEach(([id, buf]) => {
    const t = document.createElement("div");
    t.className = "pad-tab" + (id === cfg.pads.active ? " active" : "");
    t.innerHTML = `${escapeHtml(buf.name)} <span class="x" data-x="${id}">✕</span>`;
    t.addEventListener("click", (e) => {
      if (e.target.dataset.x) {
        const delId = e.target.dataset.x;
        if (Object.keys(buffers).length === 1) { toast("can't delete last buffer"); return; }
        const item = { id: delId, buf: structuredClone(buffers[delId]) };
        delete buffers[delId];
        if (cfg.pads.active === delId) cfg.pads.active = Object.keys(buffers)[0];
        save(); renderPad(); setUndo("pad", item, 0);
        return;
      }
      cfg.pads.active = id; save(); renderPad();
    });
    tabs.appendChild(t);
  });
  const add = document.createElement("div");
  add.className = "pad-tab add"; add.textContent = "+";
  add.title = "New buffer";
  add.addEventListener("click", () => newPad());
  tabs.appendChild(add);

  const cur = buffers[cfg.pads.active];
  area.value = cur ? cur.content : "";
  area.placeholder = cur ? cur.name : "";
  area.oninput = () => {
    const b = buffers[cfg.pads.active];
    if (!b) return;
    b.content = area.value; b.updated = Date.now();
    updatePadInfo(); highlightPad(area.value, area.scrollTop);
    clearTimeout(padSaveTimer);
    padSaveTimer = setTimeout(() => {
      save(); flashSaved();
      if (padChan) padChan.postMessage({ type: "pad", id: cfg.pads.active, content: b.content, ts: Date.now() });
    }, 400);
  };
  area.onscroll = () => { document.getElementById("padHl").scrollTop = area.scrollTop; };
  area.onblur = () => save();
  updatePadInfo();
  highlightPad(area.value, 0);
  updatePadPreview();
}
function updatePadInfo() {
  const b = cfg.pads.buffers[cfg.pads.active];
  if (!b) return;
  const bytes = new Blob([b.content || ""]).size;
  const lines = (b.content || "").split("\n").length;
  document.getElementById("padInfo").textContent = `${lines} lines · ${bytes} B · ${b.name}`;
}
function flashSaved() {
  const el = document.getElementById("padSaved");
  el.textContent = "saved ✓";
  el.classList.add("flash");
  setTimeout(() => { el.textContent = "saved"; el.classList.remove("flash"); }, 800);
}
function newPad() {
  const id = "p" + Math.random().toString(36).slice(2, 8);
  const name = prompt("Buffer name:", "buffer-" + Object.keys(cfg.pads.buffers).length);
  if (name === null) return;
  cfg.pads.buffers[id] = { name: name || "untitled", content: "", updated: Date.now() };
  cfg.pads.active = id;
  save(); renderPad();
}
if (padChan) {
  padChan.onmessage = (ev) => {
    if (ev.data && ev.data.type === "pad") {
      const b = cfg.pads.buffers[ev.data.id];
      if (b && b.content !== ev.data.content) {
        b.content = ev.data.content;
        b.updated = ev.data.ts;
        save();
        if (ev.data.id === cfg.pads.active) {
          const area = document.getElementById("padArea");
          if (document.activeElement !== area) {
            area.value = b.content;
            updatePadInfo();
            highlightPad(area.value, area.scrollTop);
            updatePadPreview();
          }
        } else {
          renderPad();
        }
      }
    }
  };
}
function highlightPad(text, scrollTop) {
  const hl = document.getElementById("padHl");
  const trimmed = text.slice(0, 8000);
  const esc = escapeHtml(trimmed);
  const html = esc
    .replace(/("(?:\\.|[^"\\])*")(\s*:)?/g, (m, s, colon) =>
      colon ? `<span class="k">${s}</span>${colon}` : `<span class="s">${s}</span>`)
    .replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, `<span class="n">$1</span>`)
    .replace(/\b(true|false|null|undefined)\b/g, `<span class="b">$1</span>`)
    .replace(/(\/\/[^\n]*)/g, `<span class="p">$1</span>`);
  hl.innerHTML = html + "\n";
  hl.scrollTop = scrollTop;
}

let padPreviewMode = false;

function renderMarkdown(text) {
  if (!text) return `<p style="color:var(--dim);font-style:italic">empty buffer</p>`;
  const lines = text.split("\n");
  let html = "";
  let inCode = false;
  let codeBuf = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.startsWith("```")) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(rawLine);
      continue;
    }

    const trimmed = rawLine.trim();
    if (!trimmed) {
      html += "<br/>";
      continue;
    }

    // Task list items: - [ ] or - [x]
    const taskMatch = rawLine.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const checked = taskMatch[2].toLowerCase() === "x";
      const taskText = formatInlineMarkdown(taskMatch[3]);
      html += `<div class="pad-task-item ${checked ? "done" : ""}">
        <input type="checkbox" ${checked ? "checked" : ""} data-line="${i}" />
        <span>${taskText}</span>
      </div>`;
      continue;
    }

    // Headers
    if (rawLine.startsWith("### ")) {
      html += `<h3>${formatInlineMarkdown(rawLine.slice(4))}</h3>`;
      continue;
    }
    if (rawLine.startsWith("## ")) {
      html += `<h2>${formatInlineMarkdown(rawLine.slice(3))}</h2>`;
      continue;
    }
    if (rawLine.startsWith("# ")) {
      html += `<h1>${formatInlineMarkdown(rawLine.slice(2))}</h1>`;
      continue;
    }

    // Blockquote
    if (rawLine.startsWith("> ")) {
      html += `<blockquote>${formatInlineMarkdown(rawLine.slice(2))}</blockquote>`;
      continue;
    }

    // Regular paragraph
    html += `<p>${formatInlineMarkdown(rawLine)}</p>`;
  }

  if (inCode && codeBuf.length) {
    html += `<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`;
  }

  return html;
}

function formatInlineMarkdown(str) {
  let s = escapeHtml(str);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline">$1</a>');
  return s;
}

function updatePadPreview() {
  const preview = document.getElementById("padPreviewArea");
  const area = document.getElementById("padArea");
  const hl = document.getElementById("padHl");
  const btn = document.getElementById("padPreview");
  if (!preview || !area || !btn) return;

  if (padPreviewMode) {
    btn.classList.remove("ghost");
    btn.textContent = "edit";
    area.style.display = "none";
    if (hl) hl.style.display = "none";
    preview.classList.add("active");
    preview.innerHTML = renderMarkdown(area.value);

    preview.querySelectorAll('input[type="checkbox"][data-line]').forEach(cb => {
      cb.onchange = () => {
        const lineIdx = parseInt(cb.dataset.line);
        const curBuf = cfg.pads.buffers[cfg.pads.active];
        if (!curBuf) return;
        const lines = curBuf.content.split("\n");
        if (lines[lineIdx] !== undefined) {
          if (cb.checked) {
            lines[lineIdx] = lines[lineIdx].replace(/^(\s*-\s+\[)[ ](\])/, "$1x$2");
          } else {
            lines[lineIdx] = lines[lineIdx].replace(/^(\s*-\s+\[)[xX](\])/, "$1 $2");
          }
          curBuf.content = lines.join("\n");
          curBuf.updated = Date.now();
          area.value = curBuf.content;
          save();
          updatePadInfo();
          updatePadPreview();
          if (padChan) padChan.postMessage({ type: "pad", id: cfg.pads.active, content: curBuf.content, ts: Date.now() });
        }
      };
    });
  } else {
    btn.classList.add("ghost");
    btn.textContent = "preview";
    area.style.display = "";
    if (hl) hl.style.display = "";
    preview.classList.remove("active");
  }
}

document.getElementById("padPreview").onclick = () => {
  padPreviewMode = !padPreviewMode;
  updatePadPreview();
};
document.getElementById("padAdd").onclick = newPad;
document.getElementById("padSnapshot").onclick = () => {
  const b = cfg.pads.buffers[cfg.pads.active];
  if (!b) return;
  const id = "p" + Math.random().toString(36).slice(2, 8);
  cfg.pads.buffers[id] = { name: b.name + " (snap " + new Date().toLocaleTimeString() + ")", content: b.content, updated: Date.now() };
  save(); renderPad();
  toast("snapshot created");
};
document.getElementById("padExport").onclick = () => {
  downloadBlob(new Blob([JSON.stringify(cfg.pads, null, 2)], { type: "application/json" }), "scratchpads.json");
};
document.getElementById("padImport").onclick = () => {
  pickFile(text => {
    try {
      const data = JSON.parse(text);
      if (!data.buffers) throw new Error("invalid format");
      cfg.pads = data; save(); renderPad(); toast("scratchpads imported");
    } catch (e) { toast("import failed: " + e.message); }
  });
};
document.getElementById("padDiff").onclick = () => {
  const buffers = cfg.pads.buffers;
  const ids = Object.keys(buffers);
  if (ids.length < 2) { toast("need at least 2 buffers"); return; }
  openModal("Diff buffers", `
    <div class="diff-grid">
      <div>
        <label>Left</label>
        <select id="diffLeft">${ids.map(id => `<option value="${id}" ${id===cfg.pads.active?"selected":""}>${escapeHtml(buffers[id].name)}</option>`).join("")}</select>
      </div>
      <div>
        <label>Right</label>
        <select id="diffRight">${ids.map(id => `<option value="${id}">${escapeHtml(buffers[id].name)}</option>`).join("")}</select>
      </div>
    </div>
    <div class="row" style="margin-top:14px"><button id="diffGo">Compute diff</button></div>
    <div class="diff-out" id="diffOut" style="margin-top:14px"></div>
  `);
  document.getElementById("modalBox").classList.add("wide");
  const go = () => {
    const l = buffers[document.getElementById("diffLeft").value]?.content || "";
    const r = buffers[document.getElementById("diffRight").value]?.content || "";
    const out = diffLines(l, r);
    document.getElementById("diffOut").innerHTML = out.map(l =>
      l.type === "add" ? `<span class="add">+ ${escapeHtml(l.text)}</span>` :
      l.type === "del" ? `<span class="del">- ${escapeHtml(l.text)}</span>` :
      `<span class="ctx">  ${escapeHtml(l.text)}</span>`
    ).join("\n");
  };
  document.getElementById("diffGo").onclick = go;
  go();
};
function diffLines(a, b) {
  const A = a.split("\n"), B = b.split("\n");
  const n = A.length, m = B.length;
  if (n * m > 250000) return [{ type: "ctx", text: "(files too large for diff — > 250k cells)" }];
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ type: "ctx", text: A[i] }); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { out.push({ type: "del", text: A[i] }); i++; }
    else { out.push({ type: "add", text: B[j] }); j++; }
  }
  while (i < n) out.push({ type: "del", text: A[i++] });
  while (j < m) out.push({ type: "add", text: B[j++] });
  return out;
}

/* ============================================================
   SNIPPETS
   ============================================================ */
let snipFilter = "", snipTag = "", snipIndex = 0;

function visibleSnippets() {
  if (cfg.activeProfile === "all") return cfg.snippets;
  return cfg.snippets.filter(s => !s.tags || !s.tags.length || s.tags.includes(cfg.activeProfile));
}
function frecency(s) {
  if (!s.uses) return 0;
  const ageDays = (Date.now() - (s.lastUsed || 0)) / 86400000;
  return s.uses * Math.pow(0.5, ageDays / 7);
}
function renderSnipTags() {
  const el = document.getElementById("snipTags");
  el.innerHTML = "";
  const tags = new Set();
  visibleSnippets().forEach(s => (s.tags || []).forEach(t => tags.add(t)));
  const all = document.createElement("div");
  all.className = "tag" + (snipTag === "" ? " active" : "");
  all.textContent = "all";
  all.onclick = () => { snipTag = ""; snipIndex = 0; renderSnipTags(); renderSnippets(); };
  el.appendChild(all);
  [...tags].sort().forEach(t => {
    const d = document.createElement("div");
    d.className = "tag" + (snipTag === t ? " active" : "");
    d.textContent = t;
    d.onclick = () => { snipTag = snipTag === t ? "" : t; snipIndex = 0; renderSnipTags(); renderSnippets(); };
    el.appendChild(d);
  });
}
function fuzzyScore(needle, hay) {
  if (!needle) return 1;
  needle = needle.toLowerCase(); hay = hay.toLowerCase();
  let i = 0, score = 0, last = -1;
  for (const c of needle) {
    const idx = hay.indexOf(c, i);
    if (idx === -1) return 0;
    score += 1; if (idx === last + 1) score += 0.5;
    last = idx; i = idx + 1;
  }
  return score / needle.length;
}
function filteredSnippets() {
  let list = visibleSnippets().slice();
  if (snipTag) list = list.filter(s => (s.tags || []).includes(snipTag));
  if (snipFilter) {
    list = list.map(s => ({ s, sc: Math.max(
      fuzzyScore(snipFilter, s.label),
      fuzzyScore(snipFilter, s.cmd || ""),
      fuzzyScore(snipFilter, (s.tags || []).join(" "))
    )})).filter(x => x.sc > 0).sort((a,b) => b.sc - a.sc).map(x => x.s);
  } else list.sort((a, b) => frecency(b) - frecency(a));
  return list;
}
function renderSnippets() {
  const el = document.getElementById("snippets");
  el.innerHTML = "";
  const list = filteredSnippets();
  if (!list.length) { el.innerHTML = `<div class="empty">no snippets match</div>`; return; }
  if (snipIndex >= list.length) snipIndex = Math.max(0, list.length - 1);
  list.forEach((s, i) => {
    const d = document.createElement("div");
    d.className = "snip" + (i === snipIndex ? " active" : "");
    const isChain = Array.isArray(s.chain) && s.chain.length;
    const cmdText = s.cmd || (isChain ? s.chain.map(x=>x.cmd).join(" && ") : "");
    d.innerHTML = `
      <div class="snip-top">
        <div class="snip-meta">
          <span class="snip-lbl">${escapeHtml(s.label)}${isChain ? " ⛓" : ""}</span>
          <span class="snip-tags">${(s.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</span>
        </div>
        <button class="snip-cp" aria-label="Copy ${escapeHtml(s.label)}">
          <span class="cp-text">copy</span>
        </button>
      </div>
      <div class="snip-code"><code>${escapeHtml(cmdText)}</code></div>`;
    d.addEventListener("click", () => copySnippet(s, d));
    el.appendChild(d);
  });
}
async function copySnippet(s, node) {
  const steps = (Array.isArray(s.chain) && s.chain.length) ? s.chain : [{ cmd: s.cmd, tags: s.tags }];
  const allText = steps.map(x => x.cmd).join("\n");
  const vars = [...allText.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
  const unique = [...new Set(vars)];
  const values = {};
  for (const v of unique) {
    const val = prompt(`${s.label} → ${v}:`, "");
    if (val === null) return;
    values[v] = val;
  }
  const resolved = steps.map(x => x.cmd.replace(/\{\{(\w+)\}\}/g, (_, k) => values[k] ?? `{{${k}}}`));
  try {
    await navigator.clipboard.writeText(resolved.join("\n"));
    s.uses = (s.uses || 0) + 1; s.lastUsed = Date.now(); save();
    pushClip(resolved.join("\n"), s.label);
    if (node) {
      node.classList.add("copied");
      const cp = node.querySelector(".cp-text") || node.querySelector(".cp");
      if (cp) cp.textContent = "✓ copied";
      setTimeout(() => { node.classList.remove("copied"); if (cp) cp.textContent = "copy"; }, 1000);
    }
    toast(steps.length > 1 ? `copied chain (${steps.length} steps)` : "copied");
  } catch { toast("copy failed"); }
}
const snipFilterEl = document.getElementById("snipFilter");
if (window.innerWidth <= 640) snipFilterEl.placeholder = "Search snippets…";
snipFilterEl.addEventListener("input", () => { snipFilter = snipFilterEl.value.trim(); snipIndex = 0; renderSnippets(); });
snipFilterEl.addEventListener("keydown", (e) => {
  const list = filteredSnippets();
  if (e.key === "ArrowDown") { e.preventDefault(); snipIndex = Math.min(snipIndex + 1, list.length - 1); renderSnippets(); }
  if (e.key === "ArrowUp")   { e.preventDefault(); snipIndex = Math.max(snipIndex - 1, 0); renderSnippets(); }
  if (e.key === "Enter" && list[snipIndex]) { e.preventDefault(); copySnippet(list[snipIndex]); }
  if (e.key === "Escape") snipFilterEl.blur();
});

/* ============================================================
   CLIPBOARD HISTORY
   ============================================================ */
function pushClip(text, label) {
  cfg.clips = cfg.clips || [];
  cfg.clips.unshift({ text: String(text).slice(0, 2000), label: label || "", ts: Date.now() });
  cfg.clips = cfg.clips.slice(0, 30);
}
function openClips() {
  const clips = cfg.clips || [];
  openModal("Clipboard history", `
    <p class="hint-text">In-memory only. Items copied from this page.</p>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${clips.length ? clips.map((c, i) => `
        <div style="background:var(--panel-hi);border:1px solid var(--border);padding:10px 12px;border-radius:var(--radius);cursor:pointer;transition:border-color .15s" data-ci="${i}">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${escapeHtml(c.label||"")} · ${new Date(c.ts).toLocaleTimeString()}</div>
          <div style="font-family:var(--mono);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.text)}</div>
        </div>`).join("") : `<div class="empty">(empty)</div>`}
    </div>
    <div class="row"><button id="clearClips" class="ghost">clear</button></div>`);
  document.querySelectorAll("[data-ci]").forEach(el => {
    el.onmouseenter = () => el.style.borderColor = "var(--accent)";
    el.onmouseleave = () => el.style.borderColor = "var(--border)";
    el.onclick = () => {
      const c = clips[Number(el.dataset.ci)];
      navigator.clipboard.writeText(c.text);
      toast("copied from history");
      closeModal();
    };
  });
  document.getElementById("clearClips").onclick = () => { cfg.clips = []; save(); openClips(); };
}

/* ============================================================
   OMNIBAR & SEARCH ENGINE
   ============================================================ */
const omni = document.getElementById("omni");
const omniDropdown = document.getElementById("omniDropdown");
const bangHint = document.getElementById("bangHint");
let omniSuggestions = [];
let omniActiveIndex = -1;

function renderBangHint() {
  bangHint.innerHTML = "";
  const engineMap = { google: "?g", ddg: "?d", bing: "?b", brave: "?br" };
  const addLabel = (text) => {
    const l = document.createElement("span");
    l.className = "hint-label";
    l.textContent = text;
    bangHint.appendChild(l);
  };
  addLabel("engines");
  Object.entries(cfg.engines).forEach(([key, eng]) => {
    const s = document.createElement("span");
    s.className = "chip";
    s.textContent = engineMap[key] || ("?" + key);
    s.title = `Search with ${eng.name}`;
    s.addEventListener("click", () => { omni.value = (engineMap[key] || "?" + key) + " "; omni.focus(); updateOmniDropdown(); });
    bangHint.appendChild(s);
  });
  addLabel("bangs");
  const topBangs = Object.entries(cfg.bangs).slice(0, 10);
  topBangs.forEach(([k, v]) => {
    const s = document.createElement("span");
    s.className = "chip";
    s.textContent = k; s.title = v.name;
    s.addEventListener("click", () => { omni.value = k + " "; omni.focus(); updateOmniDropdown(); });
    bangHint.appendChild(s);
  });
  const editChip = document.createElement("span");
  editChip.className = "chip";
  editChip.textContent = "⚙ edit";
  editChip.title = "Configure custom search bangs";
  editChip.style.color = "var(--accent)";
  editChip.addEventListener("click", editBangs);
  bangHint.appendChild(editChip);

  const defaultName = cfg.engines[cfg.defaultEngine]?.name || "DuckDuckGo";
  document.getElementById("bangCount").textContent =
    `${Object.keys(cfg.bangs).length} bangs · ${cfg.ports.length} ports · ${cfg.snippets.length} snippets · ${cfg.widgets.length} widgets · ${defaultName}`;
}

function matchEngine(token) {
  if (!token) return null;
  const t = token.toLowerCase();
  const aliasMap = {
    "?d": "ddg", "?g": "google", "?b": "bing", "?br": "brave", "?k": "kagi",
    "?ai": "chatgpt", "?gpt": "chatgpt", "?cl": "claude", "?gem": "gemini", "?ppx": "perplexity",
    "!d": "ddg", "!g": "google", "!b": "bing", "!br": "brave", "!k": "kagi",
    "!ai": "chatgpt", "!gpt": "chatgpt", "!cl": "claude", "!gem": "gemini", "!ppx": "perplexity"
  };
  if (aliasMap[t] && cfg.engines[aliasMap[t]]) return { key: aliasMap[t], eng: cfg.engines[aliasMap[t]] };
  for (const key of Object.keys(cfg.engines)) {
    if (t === "?" + key || t === "!" + key) return { key, eng: cfg.engines[key] };
  }
  return null;
}

function resolveBang(token) {
  if (!token) return null;
  let clean = token.toLowerCase();
  if (clean.startsWith("!") || clean.startsWith("/")) clean = clean.slice(1);
  if (clean.endsWith("!")) clean = clean.slice(0, -1);
  if (cfg.bangs[clean]) return { key: clean, bang: cfg.bangs[clean] };
  const hits = Object.keys(cfg.bangs).filter(k => k.startsWith(clean));
  if (hits.length === 1) return { key: hits[0], bang: cfg.bangs[hits[0]] };
  return null;
}

function isDirectUrl(str) {
  const trimmed = str.trim();
  if (/^(https?|file):\/\/\S+/i.test(trimmed)) return trimmed;
  if (/^localhost(:\d+)?(\/\S*)?$/i.test(trimmed)) return "http://" + trimmed;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/\S*)?$/.test(trimmed)) return "http://" + trimmed;
  if (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/\S*)?$/.test(trimmed)) return "https://" + trimmed;
  return null;
}

function safeEvaluateMath(expr) {
  const clean = expr.trim();
  if (!clean || clean.length < 2) return null;
  if (!/[+\-*/%^]|\b(sqrt|sin|cos|tan|log|abs|floor|ceil|round|pi|e)\b/i.test(clean)) return null;
  // Safe recursive-descent parser — no eval/Function used
  function parseExpr(s) {
    s = s.trim()
      .replace(/\bpi\b/gi, String(Math.PI))
      .replace(/(?<![a-zA-Z])e(?![a-zA-Z])/gi, String(Math.E))
      .replace(/\bsqrt\b/gi, "sqrt")
      .replace(/\babs\b/gi,  "abs")
      .replace(/\bfloor\b/gi,"floor")
      .replace(/\bceil\b/gi, "ceil")
      .replace(/\bround\b/gi,"round")
      .replace(/\bsin\b/gi,  "sin")
      .replace(/\bcos\b/gi,  "cos")
      .replace(/\btan\b/gi,  "tan")
      .replace(/\blog\b/gi,  "log")
      .replace(/\^/g, "**");
    // Only allow digits, operators, parens, dots, spaces, and known function names
    if (!/^[\d\s+\-*/%().sqrtabsflorceindog]+$/.test(s) && !/^[\d\s+\-*/%().*]+$/.test(s)) {
      // stricter: permit known function names
      if (/[^0-9\s+\-*/%().sqrtabsfloorceilroundsincostandlog]/.test(s.replace(/\*\*/g,""))) return NaN;
    }
    let pos = 0;
    const peek = () => s[pos];
    const consume = () => s[pos++];
    const skipWs = () => { while (s[pos] === " ") pos++; };

    function parseAddSub() {
      let left = parseMulDiv();
      skipWs();
      while (peek() === "+" || peek() === "-") {
        const op = consume(); skipWs();
        const right = parseMulDiv();
        left = op === "+" ? left + right : left - right;
        skipWs();
      }
      return left;
    }
    function parseMulDiv() {
      let left = parsePow();
      skipWs();
      while (peek() === "*" || peek() === "/" || peek() === "%") {
        if (s[pos] === "*" && s[pos+1] === "*") break; // handled in parsePow
        const op = consume(); skipWs();
        const right = parsePow();
        if (op === "*") left *= right;
        else if (op === "/") left /= right;
        else left %= right;
        skipWs();
      }
      return left;
    }
    function parsePow() {
      let base = parseUnary();
      skipWs();
      if (s[pos] === "*" && s[pos+1] === "*") { pos += 2; skipWs(); return Math.pow(base, parseUnary()); }
      return base;
    }
    function parseUnary() {
      skipWs();
      if (peek() === "-") { consume(); return -parseCall(); }
      if (peek() === "+") { consume(); return parseCall(); }
      return parseCall();
    }
    const FUNS = { sqrt: Math.sqrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil,
                   round: Math.round, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log };
    function parseCall() {
      skipWs();
      // Check for known function name
      for (const [name, fn] of Object.entries(FUNS)) {
        if (s.slice(pos, pos + name.length) === name && s[pos + name.length] === "(") {
          pos += name.length;
          skipWs();
          if (peek() !== "(") return NaN;
          consume(); // (
          const arg = parseAddSub();
          skipWs();
          if (peek() === ")") consume();
          return fn(arg);
        }
      }
      return parsePrimary();
    }
    function parsePrimary() {
      skipWs();
      if (peek() === "(") {
        consume();
        const v = parseAddSub();
        skipWs();
        if (peek() === ")") consume();
        return v;
      }
      // Parse number
      let num = "";
      while (pos < s.length && /[\d.]/.test(s[pos])) num += consume();
      if (num === "") return NaN;
      return parseFloat(num);
    }
    try {
      const result = parseAddSub();
      skipWs();
      if (pos < s.length) return NaN; // leftover chars = invalid
      return result;
    } catch { return NaN; }
  }
  try {
    const res = parseExpr(clean);
    if (typeof res === "number" && !isNaN(res) && isFinite(res)) {
      const formatted = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(6)).toString();
      return { expr: clean, result: formatted };
    }
  } catch {}
  return null;
}

const HTTP_STATUS_CODES = {
  100: { name: "Continue", desc: "Client should continue request" },
  101: { name: "Switching Protocols", desc: "Server is switching protocols" },
  200: { name: "OK", desc: "Request succeeded" },
  201: { name: "Created", desc: "Request succeeded and resource created" },
  202: { name: "Accepted", desc: "Request accepted for processing" },
  204: { name: "No Content", desc: "Request succeeded, no content returned" },
  206: { name: "Partial Content", desc: "Partial content delivered (range)" },
  301: { name: "Moved Permanently", desc: "Resource permanently moved to new URL" },
  302: { name: "Found", desc: "Resource temporarily moved to another URI" },
  304: { name: "Not Modified", desc: "Cached version is still valid" },
  307: { name: "Temporary Redirect", desc: "Temporary redirect with same method" },
  308: { name: "Permanent Redirect", desc: "Permanent redirect with same method" },
  400: { name: "Bad Request", desc: "Server cannot process invalid syntax" },
  401: { name: "Unauthorized", desc: "Authentication credentials required" },
  403: { name: "Forbidden", desc: "Server understands but refuses authorization" },
  404: { name: "Not Found", desc: "Server cannot find requested resource" },
  405: { name: "Method Not Allowed", desc: "HTTP method not supported for resource" },
  408: { name: "Request Timeout", desc: "Server timed out waiting for request" },
  409: { name: "Conflict", desc: "Request conflicts with current state" },
  410: { name: "Gone", desc: "Resource permanently deleted" },
  418: { name: "I'm a teapot", desc: "RFC 2324 Hyper Text Coffee Pot Control" },
  422: { name: "Unprocessable Entity", desc: "Semantic errors in request body" },
  429: { name: "Too Many Requests", desc: "Rate limit exceeded" },
  500: { name: "Internal Server Error", desc: "Generic server unexpected error" },
  501: { name: "Not Implemented", desc: "Server cannot fulfill request method" },
  502: { name: "Bad Gateway", desc: "Invalid response from upstream server" },
  503: { name: "Service Unavailable", desc: "Server overloaded or in maintenance" },
  504: { name: "Gateway Timeout", desc: "Upstream server failed to respond in time" }
};

function recordSearch(q, bang) {
  const key = (bang || "default") + "|" + q;
  const h = cfg.searchHistory[key] || { q, bang: bang || null, count: 0, last: 0 };
  h.count++; h.last = Date.now();
  cfg.searchHistory[key] = h;
  const entries = Object.entries(cfg.searchHistory).sort((a,b) => b[1].last - a[1].last).slice(0, 200);
  cfg.searchHistory = Object.fromEntries(entries);
  save();
}

function parseSearchQuery(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 1. Math computation
  const math = safeEvaluateMath(trimmed);
  if (math) {
    return {
      type: "calc",
      title: `${math.expr} = ${math.result}`,
      sub: "Press Enter to copy result",
      tag: "math",
      icon: "🔢",
      run: async () => {
        try {
          await navigator.clipboard.writeText(math.result);
          pushClip(math.result, `calc: ${math.expr}`);
          toast(`copied: ${math.result}`);
        } catch { toast(`result: ${math.result}`); }
      }
    };
  }

  // 2. Add Search Bang command: !add <alias> <url> or ?add <alias> <url>
  const addMatch = trimmed.match(/^(!|\?)add\s+([a-zA-Z0-9_-]+)\s+(\S+)$/i);
  if (addMatch) {
    const alias = addMatch[2].toLowerCase();
    let targetUrl = addMatch[3];
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;
    if (!targetUrl.includes("{q}")) {
      targetUrl += targetUrl.includes("?") ? "&q={q}" : "?q={q}";
    }
    return {
      type: "addbang",
      title: `Add Search Bang: !${alias} → ${targetUrl}`,
      sub: `Press Enter to save !${alias} to your custom bangs`,
      tag: "!add",
      icon: "➕",
      run: () => {
        cfg.bangs[alias] = { name: alias.toUpperCase(), url: targetUrl };
        save();
        renderBangHint();
        toast(`Added bang: !${alias}`);
        omni.value = "";
        updateOmniDropdown();
      }
    };
  }

  // 3. HTTP Status Code Inspector
  const httpMatch = trimmed.match(/^(?:http|status)\s+(\d{3})$/i) || trimmed.match(/^(\d{3})$/);
  if (httpMatch) {
    const code = Number(httpMatch[1]);
    const info = HTTP_STATUS_CODES[code];
    if (info) {
      return {
        type: "http",
        title: `HTTP ${code} ${info.name}`,
        sub: `${info.desc} — Press Enter to copy`,
        tag: "http",
        icon: "🌐",
        run: async () => {
          const res = `HTTP ${code} ${info.name}: ${info.desc}`;
          try {
            await navigator.clipboard.writeText(res);
            pushClip(res, `http ${code}`);
            toast(`copied: HTTP ${code} ${info.name}`);
          } catch { toast(res); }
        }
      };
    }
  }

  // 4. DNS DoH Lookup command: dns <domain> [type] or dig <domain> [type]
  const dnsMatch = trimmed.match(/^(?:dns|dig)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\s+([a-zA-Z]+))?$/i);
  if (dnsMatch) {
    const domain = dnsMatch[1];
    const type = (dnsMatch[2] || "A").toUpperCase();
    return {
      type: "dns",
      title: `DNS Lookup: ${domain} (${type})`,
      sub: "Query Cloudflare DoH & view DNS records in tool",
      tag: "dns",
      icon: "🌐",
      run: () => {
        openTool("dns");
        setTimeout(() => {
          const inp = document.getElementById("dnsDomain");
          const sel = document.getElementById("dnsType");
          if (inp) inp.value = domain;
          if (sel) sel.value = type;
          document.getElementById("dnsQueryBtn")?.click();
        }, 50);
      }
    };
  }

  // 5. Vault Secret Search (when unlocked)
  if (vaultUnlocked) {
    const vMatch = trimmed.match(/^(?:v|vault)\s+(\S.*)$/i);
    if (vMatch) {
      const vq = vMatch[1].trim().toLowerCase();
      const items = Array.isArray(vaultUnlocked) ? vaultUnlocked : [];
      const match = items.find(i => i.key.toLowerCase().includes(vq) || (i.category || "").toLowerCase().includes(vq) || (i.notes || "").toLowerCase().includes(vq));
      if (match) {
        return {
          type: "vault",
          title: `Secret: ${match.key}`,
          sub: `[${match.category || "Secret"}] Press Enter to copy secret value`,
          tag: "vault",
          icon: "🔒",
          run: async () => {
            try {
              await navigator.clipboard.writeText(match.value);
              pushClip("••••••••", `vault: ${match.key}`);
              toast(`copied: ${match.key}`);
            } catch { toast(`vault: ${match.key}`); }
          }
        };
      }
    }
  }

  // 6. Direct URL navigation
  const directUrl = isDirectUrl(trimmed);
  if (directUrl) {
    return {
      type: "url",
      title: directUrl,
      sub: "Open directly in browser",
      tag: "url",
      icon: "↗",
      run: () => {
        recordSearch(directUrl, null);
        window.location.href = directUrl;
      }
    };
  }

  // 3. Bang & Search Engine Checks
  const tokens = trimmed.split(/\s+/);
  const first = tokens[0];
  const last = tokens[tokens.length - 1];

  // A. Prefix engine (?g ... or !g ...)
  const emFirst = matchEngine(first);
  if (emFirst) {
    const q = tokens.slice(1).join(" ");
    const homeUrl = emFirst.eng.url.split("?")[0];
    const url = q ? emFirst.eng.url.replace("{q}", encodeURIComponent(q)) : homeUrl;
    return {
      type: "engine",
      title: q ? `Search ${emFirst.eng.name}: "${q}"` : `Open ${emFirst.eng.name}`,
      sub: url,
      tag: first,
      icon: "🔍",
      run: () => {
        recordSearch(q, emFirst.key);
        window.location.href = url;
      }
    };
  }

  // B. Suffix engine (query ?g or query ?d)
  if (tokens.length > 1) {
    const emLast = matchEngine(last);
    if (emLast) {
      const q = tokens.slice(0, -1).join(" ");
      const url = emLast.eng.url.replace("{q}", encodeURIComponent(q));
      return {
        type: "engine",
        title: `Search ${emLast.eng.name}: "${q}"`,
        sub: url,
        tag: last,
        icon: "🔍",
        run: () => {
          recordSearch(q, emLast.key);
          window.location.href = url;
        }
      };
    }
  }

  // C. Prefix bang (gh query or !gh query)
  const bangFirst = resolveBang(first);
  if (bangFirst && (tokens.length > 1 || first.startsWith("!") || first.startsWith("/"))) {
    const q = tokens.slice(1).join(" ");
    const url = bangFirst.bang.url.replace("{q}", encodeURIComponent(q));
    return {
      type: "bang",
      title: q ? `Search ${bangFirst.bang.name}: "${q}"` : `Open ${bangFirst.bang.name}`,
      sub: url,
      tag: bangFirst.key,
      icon: "⚡",
      run: () => {
        recordSearch(q, bangFirst.key);
        window.location.href = url;
      }
    };
  }

  // D. Suffix bang (query !gh or query gh!)
  if (tokens.length > 1 && (last.startsWith("!") || last.endsWith("!"))) {
    const bangLast = resolveBang(last);
    if (bangLast) {
      const q = tokens.slice(0, -1).join(" ");
      const url = bangLast.bang.url.replace("{q}", encodeURIComponent(q));
      return {
        type: "bang",
        title: `Search ${bangLast.bang.name}: "${q}"`,
        sub: url,
        tag: bangLast.key,
        icon: "⚡",
        run: () => {
          recordSearch(q, bangLast.key);
          window.location.href = url;
        }
      };
    }
  }

  // E. Single token exact bang match
  if (tokens.length === 1) {
    const singleBang = resolveBang(first);
    if (singleBang) {
      const url = singleBang.bang.url.replace("{q}", "");
      return {
        type: "bang",
        title: `Open ${singleBang.bang.name}`,
        sub: url,
        tag: singleBang.key,
        icon: "⚡",
        run: () => {
          recordSearch("", singleBang.key);
          window.location.href = url;
        }
      };
    }
  }

  // F. Default search engine
  const defaultEng = cfg.engines[cfg.defaultEngine] || cfg.engines.ddg;
  const defaultUrl = defaultEng.url.replace("{q}", encodeURIComponent(trimmed));
  return {
    type: "default",
    title: `Search ${defaultEng.name}: "${trimmed}"`,
    sub: defaultUrl,
    tag: cfg.defaultEngine,
    icon: "🔍",
    run: () => {
      recordSearch(trimmed, null);
      window.location.href = defaultUrl;
    }
  };
}

function buildOmniSuggestions(raw) {
  const trimmed = raw.trim();
  const list = [];
  const primary = parseSearchQuery(raw);

  if (!trimmed) {
    const historyEntries = Object.entries(cfg.searchHistory || {})
      .sort((a, b) => (b[1].last || 0) - (a[1].last || 0))
      .slice(0, 6);
    historyEntries.forEach(([key, h]) => {
      list.push({
        type: "history",
        title: h.q || h.bang || key,
        sub: h.bang ? `Bang: ${h.bang} · ${new Date(h.last).toLocaleDateString()}` : `Search query · ${new Date(h.last).toLocaleDateString()}`,
        tag: "history",
        icon: "🕒",
        delKey: key,
        run: () => {
          omni.value = h.q || "";
          if (h.bang) omni.value = (h.bang.startsWith("?") ? h.bang : "!" + h.bang) + " " + (h.q || "");
          omni.focus();
          updateOmniDropdown();
        }
      });
    });
    return list;
  }

  if (primary) list.push(primary);

  // Match Vault secrets when unlocked
  if (vaultUnlocked && Array.isArray(vaultUnlocked)) {
    const vMatch = trimmed.match(/^(?:v|vault)(?:\s+(.*))?$/i);
    if (vMatch) {
      const q = (vMatch[1] || "").trim().toLowerCase();
      const hits = vaultUnlocked.filter(item => !q || item.key.toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q) || (item.notes || "").toLowerCase().includes(q)).slice(0, 6);
      hits.forEach(item => {
        list.push({
          type: "vault",
          title: item.key,
          sub: `${item.category || "Secret"}${item.notes ? " · " + item.notes.slice(0, 35) : ""} · Press Enter to copy`,
          tag: "vault",
          icon: "🔑",
          run: async () => {
            try {
              await navigator.clipboard.writeText(item.value);
              pushClip("••••••••", `vault: ${item.key}`);
              toast(`copied: ${item.key}`);
            } catch { toast(`vault: ${item.key}`); }
          }
        });
      });
      if (list.length) return list;
    }
  }

  // Match Search Engines if starting with ?
  if (trimmed.startsWith("?")) {
    const engineMap = { ddg: "?d", google: "?g", bing: "?b", brave: "?br", kagi: "?k", chatgpt: "?ai", claude: "?cl", gemini: "?gem", perplexity: "?ppx" };
    const needle = trimmed.toLowerCase();
    Object.entries(cfg.engines).forEach(([key, eng]) => {
      const sc = engineMap[key] || ("?" + key);
      if (sc.startsWith(needle) || ("?" + key).startsWith(needle) || needle === "?") {
        list.push({
          type: "engine-match",
          title: `${sc} — Search ${eng.name}`,
          sub: eng.url,
          tag: sc,
          icon: "🔍",
          run: () => {
            omni.value = `${sc} `;
            omni.focus();
            updateOmniDropdown();
          }
        });
      }
    });
  }

  // Match Quick Tools
  const toolDefs = [
    { key: "json", name: "JSON Formatter & Validator", action: () => openTool("json") },
    { key: "b64", name: "Base64 Encoder & Decoder", action: () => openTool("b64") },
    { key: "jwt", name: "JWT Token Decoder", action: () => openTool("jwt") },
    { key: "ts", name: "Unix Timestamp Parser", action: () => openTool("ts") },
    { key: "regex", name: "Regex Pattern Tester", action: () => openTool("regex") },
    { key: "uuid", name: "UUID Generator (v4/v7)", action: () => openTool("uuid") },
    { key: "hash", name: "Hash Generator (SHA-256)", action: () => openTool("hash") },
    { key: "url", name: "URL Encoder & Decoder", action: () => openTool("url") },
    { key: "color", name: "Color Converter", action: () => openTool("color") },
    { key: "curl", name: "cURL Converter (Fetch / Python)", action: () => openTool("curl") },
    { key: "cron", name: "Cron Expression Visualizer", action: () => openTool("cron") },
    { key: "dns", name: "DNS DoH Lookup", action: () => openTool("dns") },
    { key: "keygen", name: "Key & Token Generator", action: () => openTool("keygen") },
    { key: "api", name: "API Tester", action: () => openTool("api") },
    { key: "ghome", name: "Google Home & Smart Devices", action: () => openTool("ghome") },
    { key: "vault", name: "Secrets Vault", action: () => openVault() },
    { key: "diff", name: "Scratchpad Diff", action: () => document.getElementById("padDiff").click() }
  ];
  toolDefs.forEach(t => {
    if (t.key.includes(trimmed.toLowerCase()) || t.name.toLowerCase().includes(trimmed.toLowerCase())) {
      list.push({
        type: "tool",
        title: t.name,
        sub: "Quick Tool",
        tag: "tool",
        icon: "🛠",
        run: t.action
      });
    }
  });

  // Match Local Ports
  (cfg.ports || []).forEach(p => {
    const portStr = String(p.port);
    const lbl = (p.label || "").toLowerCase();
    if (portStr.startsWith(trimmed) || lbl.includes(trimmed.toLowerCase())) {
      list.push({
        type: "port",
        title: `localhost:${p.port} (${p.label || "app"})`,
        sub: `Open local port :${p.port}`,
        tag: "port",
        icon: "⚡",
        run: () => window.open(`http://localhost:${p.port}`, "_blank")
      });
    }
  });

  // Match Bangs for Autocomplete
  if (trimmed.length >= 1 && trimmed.length <= 8 && !trimmed.includes(" ") && !trimmed.startsWith("?")) {
    const needle = trimmed.replace(/^[!/]/, "").toLowerCase();
    Object.entries(cfg.bangs).forEach(([k, b]) => {
      if (k.startsWith(needle) && (!primary || primary.tag !== k)) {
        list.push({
          type: "bang-match",
          title: `!${k} (${b.name})`,
          sub: b.url,
          tag: "bang",
          icon: "⚡",
          run: () => {
            omni.value = `${k} `;
            omni.focus();
            updateOmniDropdown();
          }
        });
      }
    });
  }

  // Match Search History
  Object.entries(cfg.searchHistory || {}).forEach(([key, h]) => {
    if (h.q && h.q.toLowerCase().includes(trimmed.toLowerCase()) && h.q.toLowerCase() !== trimmed.toLowerCase()) {
      list.push({
        type: "history",
        title: h.q,
        sub: h.bang ? `Bang: ${h.bang}` : "Search history",
        tag: "history",
        icon: "🕒",
        delKey: key,
        run: () => {
          omni.value = h.q;
          if (h.bang) omni.value = (h.bang.startsWith("?") ? h.bang : "!" + h.bang) + " " + h.q;
          omni.focus();
          updateOmniDropdown();
        }
      });
    }
  });

  return list.slice(0, 8);
}

function updateOmniDropdown() {
  const suggestions = buildOmniSuggestions(omni.value);
  omniSuggestions = suggestions;
  if (!suggestions.length) {
    omniDropdown.classList.remove("open");
    omniDropdown.innerHTML = "";
    omniActiveIndex = -1;
    return;
  }
  omniDropdown.innerHTML = "";
  if (omniActiveIndex >= suggestions.length) omniActiveIndex = 0;
  suggestions.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "omni-item" + (idx === omniActiveIndex ? " active" : "");
    row.innerHTML = `
      <div class="omni-item-main">
        <span class="omni-item-icon">${escapeHtml(item.icon || "🔍")}</span>
        <div class="omni-item-text">
          <span class="title">${escapeHtml(item.title)}</span>
          ${item.sub ? `<span class="sub">${escapeHtml(item.sub)}</span>` : ""}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        ${item.tag ? `<span class="omni-item-tag">${escapeHtml(item.tag)}</span>` : ""}
        ${item.delKey ? `<button class="omni-item-del" data-delhist="${escapeHtml(item.delKey)}" title="Remove from history">✕</button>` : ""}
      </div>
    `;
    row.addEventListener("mousedown", (e) => {
      if (e.target.dataset.delhist) {
        e.stopPropagation();
        e.preventDefault();
        delete cfg.searchHistory[e.target.dataset.delhist];
        save();
        updateOmniDropdown();
        return;
      }
      e.preventDefault();
      executeOmniSuggestion(item);
    });
    row.addEventListener("mouseenter", () => {
      omniActiveIndex = idx;
      [...omniDropdown.children].forEach((c, i) => c.classList.toggle("active", i === idx));
    });
    omniDropdown.appendChild(row);
  });
  omniDropdown.classList.add("open");
}

function executeOmniSuggestion(item) {
  omniDropdown.classList.remove("open");
  if (item && item.run) {
    item.run();
  } else {
    const primary = parseSearchQuery(omni.value);
    if (primary && primary.run) primary.run();
  }
  omni.value = "";
}

function closeOmniDropdown() {
  omniDropdown.classList.remove("open");
  omniActiveIndex = -1;
}

omni.addEventListener("input", () => {
  omniActiveIndex = 0;
  updateOmniDropdown();
});

omni.addEventListener("focus", () => {
  omniActiveIndex = -1;
  updateOmniDropdown();
});

omni.addEventListener("blur", () => {
  setTimeout(() => closeOmniDropdown(), 200);
});

omni.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    if (!omniDropdown.classList.contains("open")) { updateOmniDropdown(); }
    if (omniSuggestions.length) {
      e.preventDefault();
      omniActiveIndex = (omniActiveIndex + 1) % omniSuggestions.length;
      [...omniDropdown.children].forEach((c, i) => c.classList.toggle("active", i === omniActiveIndex));
      omniDropdown.children[omniActiveIndex]?.scrollIntoView({ block: "nearest" });
    }
    return;
  }
  if (e.key === "ArrowUp") {
    if (omniSuggestions.length) {
      e.preventDefault();
      omniActiveIndex = (omniActiveIndex - 1 + omniSuggestions.length) % omniSuggestions.length;
      [...omniDropdown.children].forEach((c, i) => c.classList.toggle("active", i === omniActiveIndex));
      omniDropdown.children[omniActiveIndex]?.scrollIntoView({ block: "nearest" });
    }
    return;
  }
  if (e.key === "Tab") {
    if (omniSuggestions.length && omniActiveIndex >= 0) {
      const active = omniSuggestions[omniActiveIndex];
      if (active.type === "bang-match" || active.tag === "bang") {
        e.preventDefault();
        omni.value = active.title.replace(/^!/, "").split(" ")[0] + " ";
        updateOmniDropdown();
        return;
      }
    }
  }
  if (e.key === "Enter") {
    e.preventDefault();
    if (omniSuggestions.length && omniActiveIndex >= 0 && omniSuggestions[omniActiveIndex]) {
      executeOmniSuggestion(omniSuggestions[omniActiveIndex]);
    } else {
      const primary = parseSearchQuery(omni.value);
      if (primary && primary.run) executeOmniSuggestion(primary);
    }
    return;
  }
  if (e.key === "Escape") {
    closeOmniDropdown();
    omni.blur();
  }
});

function getEngineIconSvg(key) {
  const icons = {
    ddg: `<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="11" fill="#DE5833"/><path fill="#FFF" d="M12 5.2c-2.4 0-4.3 1.8-4.3 4.1 0 1.9 1.2 3.5 2.8 4v.7c-.8.3-1.6.8-2.2 1.5-.6.7-.9 1.4-.9 2.2 0 .9.8 1.5 2.2 1.5h4.8c1.4 0 2.2-.6 2.2-1.5 0-.8-.3-1.5-.9-2.2-.6-.7-1.4-1.2-2.2-1.5v-.7c1.6-.5 2.8-2.1 2.8-4 0-2.3-1.9-4.1-4.3-4.1z"/><ellipse cx="14" cy="8.2" rx="1.2" ry="1" fill="#DE5833"/><circle cx="14.3" cy="8.1" r=".45" fill="#222"/><path fill="#F9A825" d="M12 9.2c.6 0 2 .3 2.6 1 .2.2.1.6-.2.7-.8.3-2.2.3-2.8 0-.3-.2-.2-.5 0-.7.1-.4.2-.7.4-1z"/><path fill="#43A047" d="M10.8 14.6c.7.4 1.7.4 2.4 0 .3-.2.6-.1.8.1.1.2.1.5-.1.7-1 .7-2.6.7-3.6 0-.2-.2-.3-.5-.1-.7.2-.2.5-.3.8-.1z"/></svg>`,
    google: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>`,
    bing: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#00839B" d="M5 2.5v16.2l4.8 2.8 8.7-5.1V12.1l-7.3-2.5V5.5L5 2.5zm4.8 6.4l5.3 1.9-5.3 3.1V8.9z"/></svg>`,
    brave: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#FB542B" d="M12 1.6l-6.9 3.8.4 6.1c.2 2.6 1.7 5 3.9 6.2l2.6 1.4 2.6-1.4c2.2-1.2 3.7-3.6 3.9-6.2l.4-6.1L12 1.6zm0 2.3l4.9 2.7-.3 4.5c-.1 1.9-1.3 3.7-2.9 4.6L12 16.7l-1.6-.9c-1.6-.9-2.8-2.7-2.9-4.6l-.3-4.5L12 3.9z"/></svg>`,
    kagi: `<svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="11" fill="#FFC933"/><path fill="#1A1A1A" d="M8.5 6.5h2.3v4.6l3.8-4.6h2.8l-4.4 5.1 4.7 6.9h-2.9l-3.3-5-1 1.1v3.9H8.5V6.5z"/></svg>`,
    chatgpt: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#10A37F" d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.51 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.5zm-9.66-5a4.47 4.47 0 0 1-.53-3.01l.14.08 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-2.52zM2.34 7.9a4.49 4.49 0 0 1 2.37-1.97v5.67a.77.77 0 0 0 .38.68l5.82 3.35-2.02 1.17a.08.08 0 0 1-.07 0l-4.83-2.79A4.5 4.5 0 0 1 2.34 7.9zm16.6 3.85L13.1 8.36l2.02-1.16a.08.08 0 0 1 .08 0l4.83 2.79a4.49 4.49 0 0 1-.67 8.1V12.42a.79.79 0 0 0-.41-.67zm2.01-3.02l-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.41 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.31 12.86l-2.02-1.16a.08.08 0 0 1-.04-.06V6.07a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.79.79 0 0 0-.39.68zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z"/></svg>`,
    claude: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#D97757" d="M12 2a1.2 1.2 0 0 1 1.2 1.2v2.9a1.2 1.2 0 0 1-2.4 0V3.2A1.2 1.2 0 0 1 12 2zm6.36 3.64a1.2 1.2 0 0 1 0 1.7l-2.05 2.05a1.2 1.2 0 1 1-1.7-1.7l2.05-2.05a1.2 1.2 0 0 1 1.7 0zM22 12a1.2 1.2 0 0 1-1.2 1.2h-2.9a1.2 1.2 0 1 1 0-2.4h2.9A1.2 1.2 0 0 1 22 12zm-3.64 6.36a1.2 1.2 0 0 1-1.7 0l-2.05-2.05a1.2 1.2 0 0 1 1.7-1.7l2.05 2.05a1.2 1.2 0 0 1 0 1.7zM12 22a1.2 1.2 0 0 1-1.2-1.2v-2.9a1.2 1.2 0 1 1 2.4 0v2.9A1.2 1.2 0 0 1 12 22zm-6.36-3.64a1.2 1.2 0 0 1 0-1.7l2.05-2.05a1.2 1.2 0 0 1 1.7 1.7l-2.05 2.05a1.2 1.2 0 0 1-1.7 0zM2 12a1.2 1.2 0 0 1 1.2-1.2h2.9a1.2 1.2 0 1 1 0 2.4H3.2A1.2 1.2 0 0 1 2 12zm3.64-6.36a1.2 1.2 0 0 1 1.7 0l2.05 2.05a1.2 1.2 0 1 1-1.7 1.7L5.64 7.34a1.2 1.2 0 0 1 0-1.7z"/></svg>`,
    gemini: `<svg viewBox="0 0 24 24" width="15" height="15"><defs><linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1BA1E3"/><stop offset="50%" stop-color="#5479F7"/><stop offset="100%" stop-color="#9B72CB"/></linearGradient></defs><path fill="url(#geminiGrad)" d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z"/></svg>`,
    perplexity: `<svg viewBox="0 0 24 24" width="15" height="15"><path fill="#20B2AA" d="M12 1.5a.75.75 0 0 0-.75.75v3.44L8.3 3.25a.75.75 0 0 0-1.06 1.06l2.44 2.44H6.25a.75.75 0 0 0 0 1.5h3.44L7.25 10.7a.75.75 0 1 0 1.06 1.06l2.44-2.44v3.43a.75.75 0 0 0 1.5 0v-3.43l2.44 2.44a.75.75 0 0 0 1.06-1.06L13.3 8.25h3.45a.75.75 0 0 0 0-1.5h-3.44l2.44-2.44a.75.75 0 0 0-1.06-1.06l-2.44 2.44V2.25A.75.75 0 0 0 12 1.5zm0 5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5z"/></svg>`
  };
  return icons[key] || `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
}

function renderEngineSwitch() {
  const el = document.getElementById("engineSwitch");
  if (!el) return;
  el.innerHTML = "";
  Object.entries(cfg.engines).forEach(([key, eng]) => {
    const b = document.createElement("button");
    const isActive = key === cfg.defaultEngine;
    b.className = "icon-btn engine-switch-btn" + (isActive ? " active" : "");
    b.innerHTML = getEngineIconSvg(key);
    b.title = `Default: ${eng.name}`;
    b.setAttribute("aria-label", `Default search engine: ${eng.name}`);
    b.onclick = () => {
      cfg.defaultEngine = key;
      save();
      renderEngineSwitch();
      renderBangHint();
      toast("default: " + eng.name);
    };
    el.appendChild(b);
  });
}

function editBangs() {
  const current = JSON.stringify(cfg.bangs, null, 2);
  openModal("Edit Search Bangs", `
    <p class="hint-text">Configure custom search bangs. Use <code>{q}</code> as the placeholder for query parameters.</p>
    <div class="field"><label>JSON Object (key: { name, url })</label>
    <textarea id="bangsEdit" rows="16" spellcheck="false">${escapeHtml(current)}</textarea></div>
    <div class="row"><button id="bangsSave">Save</button><button id="bangsCancel" class="ghost">Cancel</button></div>
    <div class="out" id="bangsOut"></div>`);
  const $t = document.getElementById("bangsEdit"), $out = document.getElementById("bangsOut");
  document.getElementById("bangsSave").onclick = () => {
    try {
      const parsed = JSON.parse($t.value);
      if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) throw new Error("must be a JSON object");
      cfg.bangs = parsed; save();
      renderBangHint();
      closeModal();
      toast("bangs updated");
    } catch (e) { $out.classList.add("err"); $out.textContent = "✗ " + e.message; }
  };
  document.getElementById("bangsCancel").onclick = closeModal;
  $t.focus();
}

/* ============================================================
   MODAL + TOOLS
   ============================================================ */
const modal = document.getElementById("modal");
const modalBox = document.getElementById("modalBox");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
let _modalTrigger = null;
const FOCUSABLE_SEL = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function openModal(title, html, wide) {
  _modalTrigger = document.activeElement;
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modalBox.classList.toggle("wide", !!wide);
  modal.classList.add("open");
  // Focus first focusable element inside modal
  requestAnimationFrame(() => {
    const first = modalBox.querySelector(FOCUSABLE_SEL);
    if (first) first.focus();
    else modalBox.focus();
  });
}
function closeModal() {
  modal.classList.remove("open");
  modalBox.classList.remove("wide");
  // Restore focus to the element that opened the modal
  if (_modalTrigger && typeof _modalTrigger.focus === "function") {
    try { _modalTrigger.focus(); } catch {}
  }
  _modalTrigger = null;
}
// Focus trap: keep Tab/Shift-Tab inside open modal
modal.addEventListener("keydown", (e) => {
  if (!modal.classList.contains("open") || e.key !== "Tab") return;
  const focusable = [...modalBox.querySelectorAll(FOCUSABLE_SEL)].filter(el => !el.disabled);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
document.getElementById("modalClose").onclick = closeModal;
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

document.querySelectorAll(".tool-btn").forEach(btn => {
  btn.addEventListener("click", () => openTool(btn.dataset.tool));
});
function openTool(name) {
  ({ json: toolJson, b64: toolB64, jwt: toolJwt, ts: toolTs, regex: toolRegex,
     uuid: toolUuid, hash: toolHash, url: toolUrl, color: toolColor,
     curl: toolCurl, cron: toolCron, dns: toolDns, keygen: toolKeygen,
     api: toolApi, ghome: toolGoogleHome, more: toolMore })[name]?.();
}
function toolJson() {
  openModal("JSON Format / Validate", `
    <div class="field"><label>Input</label><textarea id="jsonIn" rows="8"></textarea></div>
    <div class="row">
      <button id="jsonFmt">Format</button>
      <button id="jsonMin" class="ghost">Minify</button>
      <button id="jsonVal" class="ghost">Validate</button>
      <button id="jsonCopy" class="ghost">Copy</button>
    </div>
    <div class="out" id="jsonOut"></div>`);
  const $in = document.getElementById("jsonIn"), $out = document.getElementById("jsonOut");
  const run = (mode) => {
    const raw = $in.value.trim();
    if (!raw) { $out.textContent = ""; return; }
    try { const o = JSON.parse(raw);
      $out.classList.remove("err"); $out.textContent = mode === "min" ? JSON.stringify(o) : JSON.stringify(o, null, 2);
    } catch (e) { $out.classList.add("err"); $out.textContent = "✗ " + e.message; }
  };
  document.getElementById("jsonFmt").onclick = () => run("fmt");
  document.getElementById("jsonMin").onclick = () => run("min");
  document.getElementById("jsonVal").onclick = () => run("val");
  document.getElementById("jsonCopy").onclick = () => { const t = $out.textContent || ""; navigator.clipboard.writeText(t); pushClip(t, "json"); toast("copied"); };
  $in.focus();
}
function toolB64() {
  openModal("Base64 Encode / Decode", `
    <div class="field"><label>Input</label><textarea id="b64In" rows="6"></textarea></div>
    <div class="row"><button id="b64Enc">Encode</button><button id="b64Dec" class="ghost">Decode</button><button id="b64Copy" class="ghost">Copy</button></div>
    <div class="out" id="b64Out"></div>`);
  const $in = document.getElementById("b64In"), $out = document.getElementById("b64Out");
  const enc = s => {
    const bytes = new TextEncoder().encode(s);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
  };
  const dec = s => {
    const bin = atob(s.trim());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };
  document.getElementById("b64Enc").onclick = () => { try { $out.classList.remove("err"); $out.textContent = enc($in.value); } catch(e){$out.classList.add("err");$out.textContent="✗ "+e.message;} };
  document.getElementById("b64Dec").onclick = () => { try { $out.classList.remove("err"); $out.textContent = dec($in.value); } catch{$out.classList.add("err");$out.textContent="✗ invalid base64";} };
  document.getElementById("b64Copy").onclick = () => { navigator.clipboard.writeText($out.textContent || ""); pushClip($out.textContent, "b64"); toast("copied"); };
  $in.focus();
}
function toolJwt() {
  openModal("JWT Decode (no verify)", `
    <div class="field"><label>Token</label><textarea id="jwtIn" rows="5"></textarea></div>
    <div class="row"><button id="jwtGo">Decode</button><button id="jwtCopy" class="ghost">Copy payload</button></div>
    <div class="out" id="jwtOut"></div>`);
  const $in = document.getElementById("jwtIn"), $out = document.getElementById("jwtOut");
  const b64u = s => {
    s = s.replace(/-/g,"+").replace(/_/g,"/");
    while (s.length%4) s+="=";
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };
  document.getElementById("jwtGo").onclick = () => {
    const parts = $in.value.trim().split(".");
    if (parts.length < 2) { $out.classList.add("err"); $out.textContent = "✗ not a JWT"; return; }
    try {
      const h = JSON.parse(b64u(parts[0])), p = JSON.parse(b64u(parts[1]));
      $out.classList.remove("err");
      let extra = "";
      if (p.exp) { const exp = new Date(p.exp*1000), delta = Math.round((exp-Date.now())/1000);
        extra = `\n\nExpiry: ${exp.toISOString()} (${delta>0?"in "+humanSec(delta):"expired "+humanSec(-delta)+" ago"})`; }
      $out.textContent = "HEADER\n"+JSON.stringify(h,null,2)+"\n\nPAYLOAD\n"+JSON.stringify(p,null,2)+extra;
    } catch (e) { $out.classList.add("err"); $out.textContent = "✗ " + e.message; }
  };
  document.getElementById("jwtCopy").onclick = () => {
    const t = $out.textContent || ""; const m = t.match(/PAYLOAD\n([\s\S]*?)(\n\nExpiry|$)/);
    navigator.clipboard.writeText(m ? m[1] : t); pushClip(m?m[1]:t, "jwt"); toast("copied");
  };
  $in.focus();
}
function humanSec(s) { if (s<60) return s+"s"; if (s<3600) return Math.round(s/60)+"m"; if (s<86400) return Math.round(s/3600)+"h"; return Math.round(s/86400)+"d"; }
function toolTs() {
  openModal("Unix Timestamp", `
    <div class="field"><label>Timestamp (s or ms) — blank = now</label><input type="text" id="tsIn" /></div>
    <div class="row"><button id="tsParse">Parse</button><button id="tsNow" class="ghost">Now</button></div>
    <div class="out" id="tsOut"></div>`);
  const $in = document.getElementById("tsIn"), $out = document.getElementById("tsOut");
  const parse = (v) => {
    let n = Number(v); if (!v) n = Date.now()/1000;
    if (isNaN(n)) { $out.classList.add("err"); $out.textContent = "✗ not a number"; return; }
    let ms = n; if (Math.abs(n) < 1e12) ms = n*1000;
    const d = new Date(ms), delta = Math.round((d-Date.now())/1000);
    $out.classList.remove("err");
    $out.textContent = `Unix (s):  ${Math.floor(d.getTime()/1000)}\nUnix (ms): ${d.getTime()}\nISO:       ${d.toISOString()}\nLocal:     ${d.toString()}\nRelative:  ${delta>0?"in "+humanSec(delta):humanSec(-delta)+" ago"}`;
  };
  document.getElementById("tsParse").onclick = () => parse($in.value.trim());
  document.getElementById("tsNow").onclick = () => { $in.value = ""; parse(""); };
  $in.focus(); parse("");
}
function toolRegex() {
  openModal("Regex Tester", `
    <div class="field"><label>Pattern</label><input type="text" id="rePat" /></div>
    <div class="field"><label>Flags</label><input type="text" id="reFlags" value="g" /></div>
    <div class="field"><label>Test string</label><textarea id="reIn" rows="5"></textarea></div>
    <div class="out" id="reOut"></div>`);
  const $pat = document.getElementById("rePat"), $fl = document.getElementById("reFlags"), $in = document.getElementById("reIn"), $out = document.getElementById("reOut");
  const run = () => {
    const p = $pat.value; if (!p) { $out.textContent = ""; return; }
    let re; try { re = new RegExp(p, $fl.value); } catch (e) { $out.classList.add("err"); $out.textContent = "✗ " + e.message; return; }
    const txt = $in.value; let m, count = 0, lines = [];
    if (re.global) { while ((m = re.exec(txt)) !== null) {
      count++; lines.push(`#${count} @${m.index}: ${JSON.stringify(m[0])}`+(m.length>1?"\n    groups: "+JSON.stringify(m.slice(1)):""));
      if (m.index === re.lastIndex) re.lastIndex++; if (count > 200) { lines.push("… (truncated)"); break; }
    } } else { m = re.exec(txt); if (m) lines.push(`@${m.index}: ${JSON.stringify(m[0])}`+(m.length>1?"\n    groups: "+JSON.stringify(m.slice(1)):"")); }
    $out.classList.remove("err"); $out.textContent = lines.length ? lines.join("\n") : "(no matches)";
  };
  [$pat, $fl, $in].forEach(el => el.addEventListener("input", run));
  $pat.focus();
}
function toolUuid() {
  openModal("UUID Generator", `
    <div class="field"><label>Count</label><input type="text" id="uuidN" value="5" /></div>
    <div class="row">
      <button id="uuidV4">v4</button>
      <button id="uuidV7" class="ghost">v7 (time-sortable)</button>
      <button id="uuidCopy" class="ghost">Copy all</button>
    </div>
    <div class="out" id="uuidOut"></div>`);
  const $out = document.getElementById("uuidOut");
  const genV4 = () => crypto.randomUUID();
  const genV7 = () => {
    const ms = Date.now();
    const bytes = new Uint8Array(16);
    bytes[0] = (ms / 2**40) & 0xff; bytes[1] = (ms / 2**32) & 0xff;
    bytes[2] = (ms / 2**24) & 0xff; bytes[3] = (ms / 2**16) & 0xff;
    bytes[4] = (ms / 2**8) & 0xff;  bytes[5] = ms & 0xff;
    crypto.getRandomValues(bytes.subarray(6));
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  };
  const run = (fn) => {
    const n = Math.max(1, Math.min(1000, Number(document.getElementById("uuidN").value) || 1));
    $out.textContent = Array.from({ length: n }, fn).join("\n");
  };
  document.getElementById("uuidV4").onclick = () => run(genV4);
  document.getElementById("uuidV7").onclick = () => run(genV7);
  document.getElementById("uuidCopy").onclick = () => { navigator.clipboard.writeText($out.textContent); pushClip($out.textContent, "uuid"); toast("copied"); };
  run(genV4);
}
function toolHash() {
  openModal("Hash", `
    <div class="field"><label>Input</label><textarea id="hashIn" rows="5"></textarea></div>
    <div class="row"><button id="hashSha256">SHA-256</button><button id="hashSha1" class="ghost">SHA-1</button></div>
    <div class="out" id="hashOut"></div>`);
  const $in = document.getElementById("hashIn"), $out = document.getElementById("hashOut");
  const run = async (alg) => {
    const buf = new TextEncoder().encode($in.value);
    const digest = await crypto.subtle.digest(alg, buf);
    const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    $out.textContent = hex;
  };
  document.getElementById("hashSha256").onclick = () => run("SHA-256");
  document.getElementById("hashSha1").onclick = () => run("SHA-1");
  $in.addEventListener("input", () => run("SHA-256"));
  $in.focus();
}
function toolUrl() {
  openModal("URL Encode / Decode", `
    <div class="field"><label>Input</label><textarea id="urlIn" rows="5"></textarea></div>
    <div class="row"><button id="urlEnc">Encode</button><button id="urlDec" class="ghost">Decode</button><button id="urlCopy" class="ghost">Copy</button></div>
    <div class="out" id="urlOut"></div>`);
  const $in = document.getElementById("urlIn"), $out = document.getElementById("urlOut");
  document.getElementById("urlEnc").onclick = () => { try { $out.classList.remove("err"); $out.textContent = encodeURIComponent($in.value); } catch(e){$out.classList.add("err");$out.textContent="✗ "+e.message;} };
  document.getElementById("urlDec").onclick = () => { try { $out.classList.remove("err"); $out.textContent = decodeURIComponent($in.value); } catch{$out.classList.add("err");$out.textContent="✗ invalid";} };
  document.getElementById("urlCopy").onclick = () => { navigator.clipboard.writeText($out.textContent || ""); pushClip($out.textContent, "url"); toast("copied"); };
  $in.focus();
}
function toolColor() {
  openModal("Color Converter", `
    <div class="field"><label>Hex / rgb() / hsl()</label><input type="text" id="colorIn" value="#7aa8ff" /></div>
    <div style="height:48px;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:14px" id="colorSwatch"></div>
    <div class="out" id="colorOut"></div>`);
  const $in = document.getElementById("colorIn"), $out = document.getElementById("colorOut"), $sw = document.getElementById("colorSwatch");
  const hexToRgb = h => {
    h = h.replace("#",""); if (h.length === 3) h = h.split("").map(c => c+c).join("");
    const n = parseInt(h, 16); return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
  };
  const rgbToHex = ({r,g,b}) => "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");
  const rgbToHsl = ({r,g,b}) => {
    r/=255; g/=255; b/=255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; } else {
      const d = max-min; s = l > .5 ? d/(2-max-min) : d/(max+min);
      switch (max) { case r: h = (g-b)/d + (g<b?6:0); break; case g: h = (b-r)/d + 2; break; case b: h = (r-g)/d + 4; break; }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
  };
  const run = () => {
    const v = $in.value.trim(); let rgb;
    try {
      if (v.startsWith("#") || /^[0-9a-f]{3,6}$/i.test(v)) rgb = hexToRgb(v.startsWith("#")?v:"#"+v);
      else if (v.startsWith("rgb")) { const m = v.match(/(\d+)\D+(\d+)\D+(\d+)/); rgb = {r:+m[1],g:+m[2],b:+m[3]}; }
      else { $out.classList.add("err"); $out.textContent = "✗ unsupported format"; return; }
    } catch { $out.classList.add("err"); $out.textContent = "✗ parse error"; return; }
    const hex = rgbToHex(rgb), hsl = rgbToHsl(rgb);
    $sw.style.background = hex;
    $out.classList.remove("err");
    $out.textContent = `HEX: ${hex}\nRGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  };
  $in.addEventListener("input", run); run(); $in.focus();
}
function toolCurl() {
  openModal("cURL Converter", `
    <div class="field">
      <label>cURL Command</label>
      <textarea id="curlIn" rows="6" placeholder="curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{\\"key\\":\\"value\\"}'"></textarea>
    </div>
    <div class="tabs">
      <button class="tb active" id="tabCurlFetch" data-tab="fetch">JavaScript fetch()</button>
      <button class="tb" id="tabCurlPy" data-tab="python">Python requests</button>
      <button class="tb" id="tabCurlJson" data-tab="json">JSON Summary</button>
    </div>
    <div class="row" style="margin-top:10px">
      <button id="curlConvert">Convert</button>
      <button id="curlCopy" class="ghost">Copy Output</button>
    </div>
    <div class="out" id="curlOut"></div>
  `);
  document.getElementById("modalBox").classList.add("wide");

  let currentTab = "fetch";
  const $in = document.getElementById("curlIn");
  const $out = document.getElementById("curlOut");

  function parseCurl(str) {
    let clean = str.replace(/\\\r?\n/g, " ").trim();
    if (!clean.startsWith("curl")) {
      clean = clean.replace(/^[a-zA-Z0-9_$]+\s+curl/, "curl");
    }
    let method = "GET";
    let url = "";
    const headers = {};
    let data = null;

    const methodMatch = clean.match(/(?:-X|--request)\s+([A-Z]+)/i);
    if (methodMatch) method = methodMatch[1].toUpperCase();

    const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)"|(\S+))/g;
    let hm;
    while ((hm = headerRegex.exec(clean)) !== null) {
      const hStr = hm[1] || hm[2] || hm[3];
      const colonIdx = hStr.indexOf(":");
      if (colonIdx !== -1) {
        const k = hStr.slice(0, colonIdx).trim();
        const v = hStr.slice(colonIdx + 1).trim();
        headers[k] = v;
      }
    }

    const dataRegex = /(?:-d|--data|--data-raw|--data-binary)\s+(?:'([\s\S]*?)'|"([\s\S]*?)"|(\S+))/g;
    let dm;
    const dataParts = [];
    while ((dm = dataRegex.exec(clean)) !== null) {
      dataParts.push(dm[1] ?? dm[2] ?? dm[3]);
    }
    if (dataParts.length) {
      data = dataParts.join("&");
      if (!methodMatch) method = "POST";
    }

    const tokens = clean.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    for (let i = 1; i < tokens.length; i++) {
      let t = tokens[i].replace(/^['"]|['"]$/g, "");
      if (tokens[i - 1] && /^(-X|--request|-H|--header|-d|--data|--data-raw|--data-binary|-u|--user|-o|--output)$/.test(tokens[i - 1])) {
        continue;
      }
      if (/^https?:\/\//i.test(t)) {
        url = t;
        break;
      }
    }
    if (!url) {
      for (let i = 1; i < tokens.length; i++) {
        let t = tokens[i].replace(/^['"]|['"]$/g, "");
        if (!t.startsWith("-") && tokens[i - 1] && !/^(-X|--request|-H|--header|-d|--data|--data-raw|--data-binary|-u|--user|-o|--output)$/.test(tokens[i - 1])) {
          url = t.startsWith("http") ? t : "https://" + t;
          break;
        }
      }
    }

    return { method, url: url || "https://example.com/api", headers, data };
  }

  function renderOutput() {
    const raw = $in.value.trim();
    if (!raw) { $out.textContent = ""; return; }
    try {
      const parsed = parseCurl(raw);
      if (currentTab === "fetch") {
        let code = `fetch("${parsed.url}", {\n`;
        code += `  method: "${parsed.method}",\n`;
        if (Object.keys(parsed.headers).length) {
          code += `  headers: ${JSON.stringify(parsed.headers, null, 4).replace(/\n/g, "\n  ")},\n`;
        }
        if (parsed.data) {
          try {
            const j = JSON.parse(parsed.data);
            code += `  body: JSON.stringify(${JSON.stringify(j, null, 4).replace(/\n/g, "\n  ")})\n`;
          } catch {
            code += `  body: ${JSON.stringify(parsed.data)}\n`;
          }
        }
        code += `})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error("Error:", error));`;
        $out.classList.remove("err");
        $out.textContent = code;
      } else if (currentTab === "python") {
        let py = `import requests\n\n`;
        py += `url = "${parsed.url}"\n`;
        if (Object.keys(parsed.headers).length) {
          py += `headers = ${JSON.stringify(parsed.headers, null, 4)}\n`;
        }
        if (parsed.data) {
          try {
            const j = JSON.parse(parsed.data);
            py += `payload = ${JSON.stringify(j, null, 4)}\n`;
            py += `response = requests.${parsed.method.toLowerCase()}(url${Object.keys(parsed.headers).length ? ", headers=headers" : ""}, json=payload)\n`;
          } catch {
            py += `data = ${JSON.stringify(parsed.data)}\n`;
            py += `response = requests.${parsed.method.toLowerCase()}(url${Object.keys(parsed.headers).length ? ", headers=headers" : ""}, data=data)\n`;
          }
        } else {
          py += `response = requests.${parsed.method.toLowerCase()}(url${Object.keys(parsed.headers).length ? ", headers=headers" : ""})\n`;
        }
        py += `print(response.status_code)\nprint(response.json())`;
        $out.classList.remove("err");
        $out.textContent = py;
      } else {
        $out.classList.remove("err");
        $out.textContent = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      $out.classList.add("err");
      $out.textContent = "✗ " + e.message;
    }
  }

  document.querySelectorAll("#tabCurlFetch, #tabCurlPy, #tabCurlJson").forEach(tb => {
    tb.onclick = () => {
      document.querySelectorAll("#tabCurlFetch, #tabCurlPy, #tabCurlJson").forEach(x => x.classList.remove("active"));
      tb.classList.add("active");
      currentTab = tb.dataset.tab;
      renderOutput();
    };
  });

  document.getElementById("curlConvert").onclick = renderOutput;
  $in.addEventListener("input", renderOutput);
  document.getElementById("curlCopy").onclick = () => {
    const txt = $out.textContent || "";
    navigator.clipboard.writeText(txt);
    pushClip(txt, "curl conversion");
    toast("copied");
  };
  $in.focus();
}

function toolCron() {
  openModal("Cron Expression Visualizer", `
    <div class="field">
      <label>Cron Expression (min hour dom month dow)</label>
      <input type="text" id="cronIn" value="*/15 9-17 * * 1-5" style="font-family:var(--mono);font-size:15px"/>
    </div>
    <div class="cron-presets">
      <button class="cron-preset-btn" data-exp="* * * * *">Every min (* * * * *)</button>
      <button class="cron-preset-btn" data-exp="*/5 * * * *">Every 5m (*/5 * * * *)</button>
      <button class="cron-preset-btn" data-exp="0 * * * *">Hourly (0 * * * *)</button>
      <button class="cron-preset-btn" data-exp="0 0 * * *">Daily @ 00:00 (0 0 * * *)</button>
      <button class="cron-preset-btn" data-exp="0 9 * * 1-5">Mon-Fri @ 9am (0 9 * * 1-5)</button>
      <button class="cron-preset-btn" data-exp="0 0 1 * *">1st of Month (0 0 1 * *)</button>
    </div>
    <div class="field" style="margin-top:14px">
      <label>Plain English Schedule</label>
      <div id="cronHuman" style="font-size:13.5px;font-weight:500;color:var(--accent);padding:10px 12px;background:var(--panel-hi);border-radius:var(--radius);border:1px solid var(--border)"></div>
    </div>
    <div class="field">
      <label>Next 5 Scheduled Runs</label>
      <div class="out" id="cronNext" style="font-family:var(--mono);line-height:1.8"></div>
    </div>
  `);

  const $in = document.getElementById("cronIn");
  const $human = document.getElementById("cronHuman");
  const $next = document.getElementById("cronNext");

  function explainCron(expr) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) return "Invalid expression: requires 5 parts (minute, hour, day of month, month, day of week)";
    const [min, hr, dom, mon, dow] = parts;
    const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const monNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let desc = "Runs ";
    if (min === "*" && hr === "*") desc += "every minute";
    else if (min.startsWith("*/")) desc += `every ${min.slice(2)} minutes`;
    else if (min !== "*" && hr === "*") desc += `at minute ${min} of every hour`;
    else if (min !== "*" && hr !== "*") desc += `at ${hr.padStart(2, "0")}:${min.padStart(2, "0")}`;

    if (dom !== "*") desc += `, on day ${dom} of the month`;
    if (mon !== "*") desc += `, in ${monNames[parseInt(mon)] || ("month " + mon)}`;
    if (dow !== "*") {
      if (dow === "1-5") desc += ", Monday through Friday";
      else if (dow === "0,6" || dow === "6,0") desc += ", on weekends";
      else desc += `, on ${dow.split(",").map(d => dowNames[parseInt(d)] || d).join(", ")}`;
    }
    return desc + ".";
  }

  function getNextRuns(expr, count = 5) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) return ["(Invalid cron syntax)"];
    const [minExp, hrExp, domExp, monExp, dowExp] = parts;

    const matches = (val, exp) => {
      if (exp === "*") return true;
      if (exp.startsWith("*/")) {
        const step = parseInt(exp.slice(2));
        return val % step === 0;
      }
      if (exp.includes(",")) return exp.split(",").some(x => matches(val, x));
      if (exp.includes("-")) {
        const [start, end] = exp.split("-").map(Number);
        return val >= start && val <= end;
      }
      return val === Number(exp);
    };

    const runs = [];
    let d = new Date(Date.now() + 60000);
    d.setSeconds(0, 0);
    let attempts = 0;
    const deadline = Date.now() + 50; // max 50ms on main thread

    while (runs.length < count && attempts < 50000 && Date.now() < deadline) {
      attempts++;
      const min = d.getMinutes();
      const hr = d.getHours();
      const dom = d.getDate();
      const mon = d.getMonth() + 1;
      const dow = d.getDay();

      if (matches(mon, monExp) && matches(dom, domExp) && matches(dow, dowExp) && matches(hr, hrExp) && matches(min, minExp)) {
        runs.push(new Date(d));
      }
      d = new Date(d.getTime() + 60000);
    }

    if (!runs.length) return ["(No runs found in near future — schedule may be very rare)"];
    return runs.map((r, i) => `#${i + 1}  ${r.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })} ${r.toLocaleTimeString()} (${r.toISOString()})`);
  }

  function update() {
    const exp = $in.value.trim();
    $human.textContent = explainCron(exp);
    $next.textContent = getNextRuns(exp).join("\n");
  }

  document.querySelectorAll(".cron-preset-btn").forEach(btn => {
    btn.onclick = () => {
      $in.value = btn.dataset.exp;
      update();
    };
  });

  $in.addEventListener("input", update);
  update();
  $in.focus();
}

function toolDns() {
  openModal("DNS Lookup (DoH)", `
    <div class="row" style="gap:8px;align-items:flex-end">
      <div class="field" style="flex:2;margin-bottom:0">
        <label>Domain Name</label>
        <input type="text" id="dnsDomain" placeholder="google.com" value="github.com"/>
      </div>
      <div class="field" style="flex:1;margin-bottom:0">
        <label>Record Type</label>
        <select id="dnsType">
          <option>A</option>
          <option>AAAA</option>
          <option>CNAME</option>
          <option>MX</option>
          <option>TXT</option>
          <option>NS</option>
          <option>SOA</option>
          <option>CAA</option>
          <option>PTR</option>
        </select>
      </div>
      <button id="dnsQueryBtn" style="height:38px">Query</button>
    </div>
    <div class="field" style="margin-top:14px">
      <label>Results (Cloudflare / Google DoH)</label>
      <div id="dnsMeta" style="font-size:11px;color:var(--dim);margin-bottom:6px"></div>
      <div id="dnsResult" style="min-height:80px;background:var(--panel-hi);border:1px solid var(--border);border-radius:var(--radius);padding:10px"></div>
    </div>
  `);
  document.getElementById("modalBox").classList.add("wide");

  const $domain = document.getElementById("dnsDomain");
  const $type = document.getElementById("dnsType");
  const $meta = document.getElementById("dnsMeta");
  const $res = document.getElementById("dnsResult");

  async function query() {
    const domain = $domain.value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return;
    const type = $type.value;
    $meta.textContent = `Querying ${domain} (${type})…`;
    $res.innerHTML = `<span style="color:var(--dim)">resolving…</span>`;

    const typeCodes = { 1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 16: "TXT", 2: "NS", 6: "SOA", 257: "CAA", 12: "PTR" };

    try {
      const t0 = performance.now();
      let r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { "Accept": "application/dns-json" }
      });
      if (!r.ok) {
        r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
      }
      const ms = Math.round(performance.now() - t0);
      const data = await r.json();

      $meta.textContent = `Status: ${data.Status === 0 ? "NOERROR (0)" : "Code " + data.Status} · ${ms}ms · DoH`;

      if (!data.Answer || !data.Answer.length) {
        $res.innerHTML = `<div class="empty">No ${type} records found for ${escapeHtml(domain)}</div>`;
        return;
      }

      let html = `<table class="dns-table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>TTL</th><th>Data (Click to copy)</th></tr>
        </thead>
        <tbody>`;

      data.Answer.forEach(ans => {
        const typeStr = typeCodes[ans.type] || ans.type;
        const ttlStr = humanSec(ans.TTL);
        html += `
          <tr data-val="${escapeHtml(ans.data)}">
            <td>${escapeHtml(ans.name)}</td>
            <td><span class="tag">${typeStr}</span></td>
            <td>${ttlStr}</td>
            <td class="data">${escapeHtml(ans.data)}</td>
          </tr>`;
      });
      html += `</tbody></table>`;
      $res.innerHTML = html;

      $res.querySelectorAll("tbody tr").forEach(tr => {
        tr.onclick = () => {
          const val = tr.dataset.val;
          navigator.clipboard.writeText(val);
          pushClip(val, "dns record");
          toast(`copied: ${val}`);
        };
      });
    } catch (e) {
      $meta.textContent = "Error";
      $res.innerHTML = `<span class="err" style="color:var(--red)">✗ ${escapeHtml(e.message)}</span>`;
    }
  }

  document.getElementById("dnsQueryBtn").onclick = query;
  $domain.addEventListener("keydown", (e) => { if (e.key === "Enter") query(); });
  $type.addEventListener("change", query);
  $domain.focus();
}

function toolKeygen() {
  openModal("Key & Token Generator", `
    <div class="field">
      <label>Type</label>
      <div class="row">
        <button id="kgPass" class="">Password</button>
        <button id="kgHex" class="ghost">Hex Token</button>
        <button id="kgBase64" class="ghost">Base64 Token</button>
        <button id="kgNano" class="ghost">NanoID / URL Safe</button>
        <button id="kgDiceware" class="ghost">Passphrase</button>
      </div>
    </div>
    <div class="field">
      <div class="wrow" style="display:flex;justify-content:space-between;align-items:center">
        <label id="kgLenLabel">Length: 32</label>
        <span id="kgEntropy" style="font-family:var(--mono);font-size:11px;color:var(--green)">~190 bits entropy</span>
      </div>
      <input type="range" id="kgLen" min="8" max="128" value="32" style="width:100%"/>
    </div>
    <div class="field" id="kgOptions">
      <label>Options</label>
      <div class="row" style="flex-wrap:wrap;gap:12px;font-size:12.5px">
        <label><input type="checkbox" id="kgOptUpper" checked/> A-Z</label>
        <label><input type="checkbox" id="kgOptLower" checked/> a-z</label>
        <label><input type="checkbox" id="kgOptNum" checked/> 0-9</label>
        <label><input type="checkbox" id="kgOptSym" checked/> !@#$%^&*</label>
        <label><input type="checkbox" id="kgOptAvoid"/> Avoid similar (0/O, 1/l/I)</label>
      </div>
    </div>
    <div class="row" style="margin-top:14px">
      <button id="kgGenerate">Regenerate</button>
      <button id="kgCopy" class="ghost">Copy Token</button>
    </div>
    <div class="out" id="kgOut" style="font-size:14px;word-break:break-all;font-family:var(--mono)"></div>
  `);

  let currentType = "pass";
  const $len = document.getElementById("kgLen");
  const $lenLabel = document.getElementById("kgLenLabel");
  const $entropy = document.getElementById("kgEntropy");
  const $out = document.getElementById("kgOut");

  const WORDS = ["correct","horse","battery","staple","galaxy","cyber","rocket","matrix","plasma",
    "vector","orbit","falcon","phoenix","shadow","silver","quantum","signal","beacon","stellar",
    "crimson","zenith","aurora","echo","nebula","pulsar","vortex","crypto","delta","shield","glacier"];

  function generate() {
    const len = parseInt($len.value);
    $lenLabel.textContent = currentType === "diceware" ? `Word Count: ${len}` : `Length: ${len}`;

    if (currentType === "hex") {
      const bytes = new Uint8Array(Math.ceil(len / 2));
      crypto.getRandomValues(bytes);
      const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, len);
      $entropy.textContent = `~${Math.round(len * 4)} bits entropy`;
      $out.textContent = hex;
    } else if (currentType === "base64") {
      const bytes = new Uint8Array(Math.ceil((len * 3) / 4));
      crypto.getRandomValues(bytes);
      let bin = "";
      bytes.forEach(b => bin += String.fromCharCode(b));
      const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "").slice(0, len);
      $entropy.textContent = `~${Math.round(len * 5.95)} bits entropy`;
      $out.textContent = b64;
    } else if (currentType === "nano") {
      const alphabet = "useandom-26T1983_40XYZabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const bytes = new Uint8Array(len);
      crypto.getRandomValues(bytes);
      let str = "";
      for (let i = 0; i < len; i++) str += alphabet[bytes[i] % alphabet.length];
      $entropy.textContent = `~${Math.round(len * 6)} bits entropy`;
      $out.textContent = str;
    } else if (currentType === "diceware") {
      const words = [];
      const randomIndices = new Uint32Array(len);
      crypto.getRandomValues(randomIndices);
      for (let i = 0; i < len; i++) {
        words.push(WORDS[randomIndices[i] % WORDS.length]);
      }
      $entropy.textContent = `~${Math.round(len * 12.9)} bits entropy`;
      $out.textContent = words.join("-");
    } else {
      let chars = "";
      if (document.getElementById("kgOptUpper").checked) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (document.getElementById("kgOptLower").checked) chars += "abcdefghijklmnopqrstuvwxyz";
      if (document.getElementById("kgOptNum").checked) chars += "0123456789";
      if (document.getElementById("kgOptSym").checked) chars += "!@#$%^&*()_+~|}{[]:;?><,./-=";
      if (document.getElementById("kgOptAvoid").checked) chars = chars.replace(/[0O1lI|`'"]/g, "");
      if (!chars) chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

      const bytes = new Uint32Array(len);
      crypto.getRandomValues(bytes);
      let pass = "";
      for (let i = 0; i < len; i++) pass += chars[bytes[i] % chars.length];
      const poolSize = chars.length;
      const bits = Math.round(len * Math.log2(poolSize));
      $entropy.textContent = `~${bits} bits entropy (${poolSize} charset)`;
      $out.textContent = pass;
    }
  }

  function setType(type) {
    currentType = type;
    ["kgPass","kgHex","kgBase64","kgNano","kgDiceware"].forEach(id => document.getElementById(id).classList.add("ghost"));
    const optBox = document.getElementById("kgOptions");
    if (type === "pass") {
      document.getElementById("kgPass").classList.remove("ghost");
      optBox.style.display = "";
      $len.min = 8; $len.max = 128; $len.value = 32;
    } else if (type === "hex") {
      document.getElementById("kgHex").classList.remove("ghost");
      optBox.style.display = "none";
      $len.min = 16; $len.max = 128; $len.value = 64;
    } else if (type === "base64") {
      document.getElementById("kgBase64").classList.remove("ghost");
      optBox.style.display = "none";
      $len.min = 16; $len.max = 128; $len.value = 48;
    } else if (type === "nano") {
      document.getElementById("kgNano").classList.remove("ghost");
      optBox.style.display = "none";
      $len.min = 10; $len.max = 64; $len.value = 21;
    } else if (type === "diceware") {
      document.getElementById("kgDiceware").classList.remove("ghost");
      optBox.style.display = "none";
      $len.min = 3; $len.max = 10; $len.value = 5;
    }
    generate();
  }

  document.getElementById("kgPass").onclick = () => setType("pass");
  document.getElementById("kgHex").onclick = () => setType("hex");
  document.getElementById("kgBase64").onclick = () => setType("base64");
  document.getElementById("kgNano").onclick = () => setType("nano");
  document.getElementById("kgDiceware").onclick = () => setType("diceware");

  $len.oninput = generate;
  document.querySelectorAll("#kgOptions input").forEach(inp => inp.onchange = generate);
  document.getElementById("kgGenerate").onclick = generate;
  document.getElementById("kgCopy").onclick = () => {
    const val = $out.textContent || "";
    navigator.clipboard.writeText(val);
    pushClip(val, "keygen token");
    toast("copied");
  };

  generate();
}

function toolApi() {
  openModal("API Tester", `
    <div class="api-saved" id="apiSaved"></div>
    <div class="api-req">
      <select id="apiMethod">
        <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option><option>HEAD</option><option>OPTIONS</option>
      </select>
      <input type="text" id="apiUrl" placeholder="https://api.example.com/users" />
    </div>
    <div class="field">
      <label>Headers</label>
      <div class="api-headers" id="apiHeaders"></div>
      <button class="btn ghost" id="apiAddHeader" style="margin-top:6px">+ header</button>
    </div>
    <div class="field">
      <label>Body</label>
      <textarea id="apiBody" rows="6" placeholder="{ }" spellcheck="false"></textarea>
    </div>
    <div class="row">
      <button id="apiSend">Send</button>
      <button id="apiSave" class="ghost">Save request</button>
      <button id="apiClear" class="ghost">Clear</button>
    </div>
    <div class="api-meta" id="apiMeta"></div>
    <div class="api-resp" id="apiResp"></div>
  `);
  document.getElementById("modalBox").classList.add("wide");
  const headersEl = document.getElementById("apiHeaders");
  function addHeaderRow(k = "", v = "") {
    const row = document.createElement("div");
    row.className = "hrow";
    row.innerHTML = `<input type="text" placeholder="Header" value="${escapeHtml(k)}"><input type="text" placeholder="Value" value="${escapeHtml(v)}"><button title="remove">✕</button>`;
    row.querySelector("button").onclick = () => row.remove();
    headersEl.appendChild(row);
  }
  addHeaderRow("Accept", "application/json");
  document.getElementById("apiAddHeader").onclick = () => addHeaderRow();
  function renderSaved() {
    const el = document.getElementById("apiSaved");
    el.innerHTML = "";
    (cfg.apiRequests || []).forEach((r) => {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `<span>${escapeHtml(r.name)}</span><span class="x" data-del="${r.id}">✕</span>`;
      chip.onclick = (e) => {
        if (e.target.dataset.del) {
          cfg.apiRequests = cfg.apiRequests.filter(x => x.id !== e.target.dataset.del);
          save(); renderSaved(); return;
        }
        document.getElementById("apiMethod").value = r.method;
        document.getElementById("apiUrl").value = r.url;
        headersEl.innerHTML = "";
        (r.headers || []).forEach(h => addHeaderRow(h.k, h.v));
        if (!r.headers?.length) addHeaderRow();
        document.getElementById("apiBody").value = r.body || "";
      };
      el.appendChild(chip);
    });
  }
  renderSaved();
  document.getElementById("apiSend").onclick = async () => {
    const method = document.getElementById("apiMethod").value;
    const url = document.getElementById("apiUrl").value.trim();
    if (!url) return;
    const headers = {};
    [...headersEl.querySelectorAll(".hrow")].forEach(r => {
      const [k, v] = r.querySelectorAll("input");
      if (k.value.trim()) headers[k.value.trim()] = v.value;
    });
    const body = document.getElementById("apiBody").value;
    const opts = { method, headers };
    if (!["GET","HEAD"].includes(method) && body.trim()) opts.body = body;
    const meta = document.getElementById("apiMeta");
    const resp = document.getElementById("apiResp");
    meta.innerHTML = "sending…"; resp.textContent = "";
    const t0 = performance.now();
    try {
      const r = await fetch(url, opts);
      const ms = Math.round(performance.now() - t0);
      const text = await r.text();
      const ct = r.headers.get("content-type") || "";
      let pretty = text;
      if (ct.includes("json")) { try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
      meta.innerHTML = `<span class="${r.ok ? "ok" : "err"}">${r.status} ${r.statusText}</span><span>${ms}ms</span><span>${text.length}B</span><span>${escapeHtml(ct)}</span>`;
      resp.textContent = pretty;
      pushClip(pretty.slice(0, 2000), "api response");
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      meta.innerHTML = `<span class="err">network error</span><span>${ms}ms</span>`;
      resp.textContent = "✗ " + e.message + "\n\n(Note: CORS blocks cross-origin reads unless the server opts in.)";
    }
  };
  document.getElementById("apiSave").onclick = () => {
    const name = prompt("Name this request:", "request-" + ((cfg.apiRequests || []).length + 1));
    if (!name) return;
    const headers = [...headersEl.querySelectorAll(".hrow")].map(r => {
      const [k, v] = r.querySelectorAll("input"); return { k: k.value, v: v.value };
    }).filter(h => h.k.trim());
    const req = {
      id: "r" + Math.random().toString(36).slice(2, 8),
      name, method: document.getElementById("apiMethod").value,
      url: document.getElementById("apiUrl").value,
      headers, body: document.getElementById("apiBody").value
    };
    cfg.apiRequests = cfg.apiRequests || [];
    cfg.apiRequests.push(req); save(); renderSaved();
    toast("saved");
  };
  document.getElementById("apiClear").onclick = () => {
    headersEl.innerHTML = ""; addHeaderRow();
    document.getElementById("apiUrl").value = "";
    document.getElementById("apiBody").value = "";
    document.getElementById("apiResp").textContent = "";
    document.getElementById("apiMeta").innerHTML = "";
  };
  document.getElementById("apiUrl").focus();
}
function toolMore() {
  openModal("More tools", `
    <div class="tabs">
      <button class="tb active" data-tab="jy">JSON → YAML</button>
      <button class="tb" data-tab="yj">YAML → JSON (basic)</button>
    </div>
    <div id="moreBody"></div>`);
  const render = (tab) => {
    const body = document.getElementById("moreBody");
    if (tab === "jy") {
      body.innerHTML = `
        <div class="field"><label>JSON</label><textarea id="jyIn" rows="6"></textarea></div>
        <div class="row"><button id="jyGo">Convert</button><button id="jyCopy" class="ghost">Copy</button></div>
        <div class="out" id="jyOut"></div>`;
      document.getElementById("jyGo").onclick = () => {
        try { const obj = JSON.parse(document.getElementById("jyIn").value); document.getElementById("jyOut").textContent = jsonToYaml(obj); }
        catch(e){ const o=document.getElementById("jyOut"); o.classList.add("err"); o.textContent = "✗ " + e.message; }
      };
      document.getElementById("jyCopy").onclick = () => { navigator.clipboard.writeText(document.getElementById("jyOut").textContent); pushClip(document.getElementById("jyOut").textContent, "yaml"); toast("copied"); };
    } else {
      body.innerHTML = `
        <div class="field"><label>YAML (simple key: value, lists with -)</label><textarea id="yjIn" rows="6"></textarea></div>
        <div class="row"><button id="yjGo">Convert</button><button id="yjCopy" class="ghost">Copy</button></div>
        <div class="out" id="yjOut"></div>`;
      document.getElementById("yjGo").onclick = () => {
        try { document.getElementById("yjOut").textContent = JSON.stringify(yamlToJson(document.getElementById("yjIn").value), null, 2); }
        catch(e){ const o=document.getElementById("yjOut"); o.classList.add("err"); o.textContent = "✗ " + e.message; }
      };
      document.getElementById("yjCopy").onclick = () => { navigator.clipboard.writeText(document.getElementById("yjOut").textContent); pushClip(document.getElementById("yjOut").textContent, "json"); toast("copied"); };
    }
  };
  document.querySelectorAll(".tabs .tb").forEach(b => b.onclick = () => {
    document.querySelectorAll(".tabs .tb").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); render(b.dataset.tab);
  });
  render("jy");
}
function jsonToYaml(o, indent = 0) {
  const pad = "  ".repeat(indent);
  if (Array.isArray(o)) return o.map(v => pad + "- " + jsonToYaml(v, indent+1).trimStart()).join("\n");
  if (o && typeof o === "object") return Object.entries(o).map(([k,v]) => {
    if (v && typeof v === "object") return `${pad}${k}:\n${jsonToYaml(v, indent+1)}`;
    return `${pad}${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`;
  }).join("\n");
  return String(o);
}
function yamlToJson(text) {
  const lines = text.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  const root = {}; const stack = [{ indent: -1, obj: root }];
  for (const raw of lines) {
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    while (stack.length > 1 && indent <= stack[stack.length-1].indent) stack.pop();
    const parent = stack[stack.length-1].obj;
    if (line.startsWith("- ")) {
      const v = line.slice(2);
      if (!Array.isArray(parent)) throw new Error("list without key");
      parent.push(parseScalar(v));
    } else {
      const m = line.match(/^([^:]+):\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim(), val = m[2];
      if (val === "") { const child = {}; parent[key] = child; stack.push({ indent, obj: child }); }
      else parent[key] = parseScalar(val);
    }
  }
  return root;
}
function parseScalar(v) {
  if (v === "true" || v === "false") return v === "true";
  if (v === "null" || v === "~") return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  return v.replace(/^["']|["']$/g, "");
}

/* ============================================================
   GOOGLE HOME & SMART DEVICES TOOL (GOOGLE ACCOUNT INTEGRATED)
   ============================================================ */
function getHomeDevices() {
  if (!Array.isArray(cfg.homeDevices)) cfg.homeDevices = structuredClone(DEFAULTS.homeDevices);
  return cfg.homeDevices;
}

function getHomeScenes() {
  if (!Array.isArray(cfg.homeScenes)) cfg.homeScenes = structuredClone(DEFAULTS.homeScenes);
  return cfg.homeScenes;
}

async function dispatchDeviceAction(device) {
  save();

  // 1. Google Smart Device Management API dispatch (for Google Nest synced devices)
  if (device.sdmName && cfg.googleAuth?.accessToken) {
    try {
      const cleanName = device.sdmName.startsWith("enterprises/") ? device.sdmName : `enterprises/${device.sdmName}`;
      const cmdUrl = `https://smartdevicemanagement.googleapis.com/v1/${cleanName}:executeCommand`;
      let command = null;
      let params = {};

      if (device.type === "thermostat" && device.targetTemp !== undefined) {
        command = "sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat";
        params = { heatCelsius: Number(device.targetTemp) };
      }

      if (command) {
        fetch(cmdUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cfg.googleAuth.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ command, params })
        }).catch(() => {});
      }
    } catch {}
  }

  // 2. Optional Webhook integration (Home Assistant / Maker / IoT endpoint)
  if (device.webhookUrl && typeof device.webhookUrl === "string" && device.webhookUrl.trim().startsWith("http")) {
    try {
      fetch(device.webhookUrl.trim(), {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: device.id,
          name: device.name,
          type: device.type,
          room: device.room,
          on: device.on,
          brightness: device.brightness,
          targetTemp: device.targetTemp,
          locked: device.locked,
          volume: device.volume,
          timestamp: Date.now()
        })
      }).catch(() => {});
    } catch {}
  }
}

function triggerHomeScene(sceneId) {
  const scenes = getHomeScenes();
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  const devices = getHomeDevices();

  (scene.actions || []).forEach(act => {
    const dev = devices.find(d => d.id === act.id);
    if (dev) {
      if (act.on !== undefined) dev.on = act.on;
      if (act.brightness !== undefined) dev.brightness = act.brightness;
      if (act.targetTemp !== undefined) dev.targetTemp = act.targetTemp;
      if (act.locked !== undefined) dev.locked = act.locked;
      if (act.volume !== undefined) dev.volume = act.volume;
      dispatchDeviceAction(dev);
    }
  });

  save();
  toast(`Routine: ${scene.name}`);
}

async function checkGoogleAuthRedirect() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token=")) return;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("access_token");
  const expiresIn = parseInt(params.get("expires_in") || "3600");
  if (!token) return;

  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const info = await res.json();
      cfg.googleAuth = cfg.googleAuth || {};
      cfg.googleAuth.connected = true;
      cfg.googleAuth.accessToken = token;
      cfg.googleAuth.tokenExpiry = Date.now() + expiresIn * 1000;
      cfg.googleAuth.email = info.email || "";
      cfg.googleAuth.name = info.name || "";
      cfg.googleAuth.picture = info.picture || "";

      try {
        const tinfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
        if (tinfoRes.ok) {
          const tinfo = await tinfoRes.json();
          cfg.googleAuth.scopes = tinfo.scope || "";
          cfg.googleAuth.hasHomePlatform = (tinfo.scope || "").includes("home.platform.v2");
        }
      } catch {}

      save();
      const scopeTag = cfg.googleAuth.hasHomePlatform ? " (Home Platform v2 Authorized)" : "";
      toast(`Google Account Connected: ${info.email}${scopeTag}`);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      if (sessionStorage.getItem("ghome_oauth_pending")) {
        sessionStorage.removeItem("ghome_oauth_pending");
        setTimeout(() => openTool("ghome"), 200);
      }
    }
  } catch (err) {
    console.error("Google Auth check error", err);
  }
}

async function syncGoogleDevices(onDone) {
  const auth = cfg.googleAuth || {};
  const rawPid = (auth.projectId || "").trim();
  const token = auth.accessToken;

  if (!token) {
    toast("Google Account not connected");
    if (onDone) onDone();
    return;
  }

  // 1. If Nest enterprise project ID provided, query SDM API
  if (rawPid) {
    const cleanPid = rawPid.startsWith("enterprises/") ? rawPid.replace("enterprises/", "") : rawPid;
    const url = `https://smartdevicemanagement.googleapis.com/v1/enterprises/${encodeURIComponent(cleanPid)}/devices`;

  try {
    toast("Syncing devices from Google…");
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${cfg.googleAuth.accessToken}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      toast("Google Home devices refreshed");
      if (onDone) onDone();
      return;
    }
    const data = await res.json();
    const gDevices = data.devices || [];
    if (!gDevices.length) {
      toast("Google Home devices up to date");
      if (onDone) onDone();
      return;
    }

    const devices = getHomeDevices();
    let syncedCount = 0;
    gDevices.forEach(gd => {
      const sdmName = gd.name;
      const traits = gd.traits || {};
      const info = traits["sdm.devices.traits.Info"] || {};
      const customName = info.customName || gd.type.split(".").pop();
      const existing = devices.find(d => d.sdmName === sdmName);

      if (existing) {
        existing.name = customName;
        if (traits["sdm.devices.traits.ThermostatTemperatureSetpoint"]) {
          existing.targetTemp = Math.round(traits["sdm.devices.traits.ThermostatTemperatureSetpoint"].heatCelsius || 22);
        }
        if (traits["sdm.devices.traits.Temperature"]) {
          existing.currentTemp = Math.round(traits["sdm.devices.traits.Temperature"].ambientTemperatureCelsius || 21);
        }
        syncedCount++;
      } else {
        const isThermostat = gd.type.includes("THERMOSTAT");
        const isCam = gd.type.includes("DOORBELL") || gd.type.includes("CAMERA");
        const isDisplay = gd.type.includes("DISPLAY");
        devices.push({
          id: "gd-" + Math.random().toString(36).slice(2, 7),
          sdmName,
          name: customName,
          type: isThermostat ? "thermostat" : (isCam ? "camera" : (isDisplay ? "speaker" : "plug")),
          room: "Google Home",
          on: true,
          targetTemp: isThermostat ? Math.round(traits["sdm.devices.traits.ThermostatTemperatureSetpoint"]?.heatCelsius || 22) : undefined,
          currentTemp: isThermostat ? Math.round(traits["sdm.devices.traits.Temperature"]?.ambientTemperatureCelsius || 21) : undefined,
          unit: isThermostat ? "°C" : undefined,
          isGoogle: true
        });
        syncedCount++;
      }
    });

      save();
      toast(`Refreshed ${syncedCount} Google devices`);
      if (onDone) onDone();
      return;
    } catch (e) {
      console.warn("Nest SDM error", e);
    }
  }

  // Home Platform v2 feedback
  if (auth.hasHomePlatform) {
    toast("Google Home Platform v2 authorized! (Manage devices live via Google Home Web or Bulk Add)", 5000);
  } else {
    toast("Google Account connected. (Click Disconnect & re-sign in to authorize Home Platform v2 scope)", 5000);
  }
  if (onDone) onDone();
}

function parseBulkDeviceLine(line) {
  line = line.trim();
  if (!line || line.startsWith("#") || line.startsWith("//")) return null;
  const delimiter = line.includes(",") ? "," : (line.includes("|") ? "|" : "\t");
  const parts = line.split(delimiter).map(p => p.trim());
  let name = parts[0];
  if (!name) return null;
  let type = "light";
  let room = "General";

  if (parts.length >= 3) {
    type = parts[1].toLowerCase();
    room = parts[2] || "General";
  } else if (parts.length === 2) {
    const p2 = parts[1].toLowerCase();
    if (["light", "plug", "thermostat", "speaker", "lock", "camera"].includes(p2)) {
      type = p2;
    } else {
      room = parts[1];
    }
  }

  const validTypes = ["light", "plug", "thermostat", "speaker", "lock", "camera"];
  if (!validTypes.includes(type)) {
    const lower = name.toLowerCase();
    if (lower.includes("plug") || lower.includes("socket") || lower.includes("switch") || lower.includes("pc") || lower.includes("fan") || lower.includes("tv") || lower.includes("ac") || lower.includes("geyser") || lower.includes("heater")) {
      type = "plug";
    } else if (lower.includes("temp") || lower.includes("thermostat") || lower.includes("climate")) {
      type = "thermostat";
    } else if (lower.includes("speaker") || lower.includes("audio") || lower.includes("soundbar") || lower.includes("alexa") || lower.includes("nest mini") || lower.includes("nest audio")) {
      type = "speaker";
    } else if (lower.includes("lock") || lower.includes("door")) {
      type = "lock";
    } else if (lower.includes("cam") || lower.includes("camera") || lower.includes("doorbell")) {
      type = "camera";
    } else {
      type = "light";
    }
  }

  return {
    id: "hd-" + Math.random().toString(36).slice(2, 7),
    name,
    type,
    room: room || "General",
    on: false,
    brightness: type === "light" ? 100 : undefined,
    targetTemp: type === "thermostat" ? 22 : undefined,
    currentTemp: type === "thermostat" ? 21 : undefined,
    unit: type === "thermostat" ? "°C" : undefined,
    volume: type === "speaker" ? 50 : undefined,
    locked: type === "lock" ? true : undefined,
    webhookUrl: ""
  };
}

function toolGoogleHome() {
  const allDevices = getHomeDevices();
  const scenes = getHomeScenes();
  const SAMPLE_IDS = new Set(["hd-1", "hd-2", "hd-3", "hd-4", "hd-5", "hd-6", "hd-7"]);
  let filterRoom = "all";
  let showAuthForm = false;
  let showGuide = false;

  openModal("Google Home & Smart Devices", `
    <!-- Google Account Integration Section -->
    <div class="ghome-auth-card" id="ghomeAuthCard">
      <!-- Dynamic Google Account State -->
    </div>

    <!-- Quick Tool Actions Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <a href="https://home.google.com/" target="_blank" rel="noopener" class="ghome-web-btn" style="margin-left:0">
          <span>🏠</span> Google Home Web ↗
        </a>
        <a href="https://myaccount.google.com/device-activity" target="_blank" rel="noopener" class="ghome-web-btn" style="margin-left:0;color:var(--fg-2);border-color:var(--border)">
          <span>👤</span> Account Devices ↗
        </a>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap" id="ghomeBarActions"></div>
    </div>

    <!-- Add/Edit Device Form -->
    <div id="ghomeDevForm" class="ghome-panel-form" style="display:none">
      <div class="ghome-form-header">
        <div class="ghome-form-title">
          <span id="ghomeFormIcon">✨</span>
          <span id="ghomeFormHeading">Add Smart Device</span>
        </div>
        <button id="ghomeFormCloseBtn" class="ghome-form-close" title="Close">✕</button>
      </div>
      <input type="hidden" id="ghomeFormId">
      <div class="field" style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:600;color:var(--fg);display:block;margin-bottom:4px">Device Name</label>
        <input type="text" id="ghomeFormName" placeholder="e.g. Studio Light, AC, Workstation Plug" style="padding:7px 10px;font-size:12px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--fg);width:100%">
      </div>
      <div class="row" style="margin-bottom:10px;gap:10px">
        <div style="flex:1">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--fg);margin-bottom:4px">Device Type</label>
          <select id="ghomeFormType" style="width:100%;padding:7px 8px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-size:12px">
            <option value="light">💡 Light</option>
            <option value="plug">🔌 Smart Plug / Outlet</option>
            <option value="thermostat">🌡️ Thermostat / AC</option>
            <option value="speaker">🔊 Speaker / Audio</option>
            <option value="lock">🔒 Smart Lock</option>
          </select>
        </div>
        <div style="flex:1">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--fg);margin-bottom:4px">Room</label>
          <input type="text" id="ghomeFormRoom" placeholder="e.g. Living Room, Office" style="width:100%;padding:7px 10px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-size:12px">
          <div class="ghome-room-chips">
            <span class="ghome-room-chip" data-chip="Office">Office</span>
            <span class="ghome-room-chip" data-chip="Living Room">Living Room</span>
            <span class="ghome-room-chip" data-chip="Bedroom">Bedroom</span>
            <span class="ghome-room-chip" data-chip="Kitchen">Kitchen</span>
            <span class="ghome-room-chip" data-chip="Balcony">Balcony</span>
          </div>
        </div>
      </div>
      <div class="field" style="margin-bottom:12px">
        <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px">Webhook URL (Optional — triggers IoT or Home Assistant endpoint)</label>
        <input type="url" id="ghomeFormWebhook" placeholder="https://homeassistant.local/api/webhook/..." style="padding:6px 10px;font-size:11px;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--fg);width:100%">
      </div>
      <div class="row" style="gap:8px;justify-content:flex-end">
        <button id="ghomeFormCancel" class="ghost" style="font-size:12px;padding:6px 14px">Cancel</button>
        <button id="ghomeFormSave" class="ghome-action-btn ghome-btn-add" style="font-size:12px;padding:6px 16px">Save Device</button>
      </div>
    </div>

    <!-- Bulk Add Form -->
    <div id="ghomeBulkForm" class="ghome-panel-form" style="display:none">
      <div class="ghome-form-header">
        <div class="ghome-form-title">
          <span>📋</span>
          <span>Quick Bulk Add Devices</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <button id="ghomeBulkExampleBtn" class="ghome-action-btn" style="font-size:10.5px;padding:3px 8px;background:var(--panel);border:1px solid var(--border);color:var(--accent);cursor:pointer">
            🪄 Insert Example
          </button>
          <button id="ghomeBulkCloseBtn" class="ghome-form-close" title="Close">✕</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px;line-height:1.5">
        Paste your devices below (one per line). Format: <span class="ghome-syntax-pill">Name, Type, Room</span>
        <div style="font-size:10px;color:var(--dim);margin-top:2px">Types: <code>light</code>, <code>plug</code>, <code>thermostat</code>, <code>speaker</code>, <code>lock</code>. <em>Device type is automatically inferred if omitted!</em></div>
      </div>
      <textarea id="ghomeBulkText" rows="6" placeholder="Living Room Light, light, Living Room&#10;Bedroom AC, plug, Bedroom&#10;Study Lamp, light, Office&#10;Desk Fan, plug, Office" style="width:100%;padding:10px;font-size:11.5px;font-family:var(--mono);line-height:1.5;background:var(--panel);border:1px solid var(--border);border-radius:6px;color:var(--fg);resize:vertical;margin-bottom:10px"></textarea>
      <div class="row" style="gap:8px;justify-content:space-between;align-items:center">
        <span id="ghomeBulkCounter" style="font-size:11px;color:var(--dim);font-family:var(--mono)"></span>
        <div style="display:flex;gap:8px">
          <button id="ghomeBulkClose" class="ghost" style="font-size:12px;padding:6px 14px">Cancel</button>
          <button id="ghomeBulkSubmit" class="ghome-action-btn ghome-btn-add" style="font-size:12px;padding:6px 18px">Add All Devices</button>
        </div>
      </div>
    </div>

    <!-- Quick Routines -->
    <div style="margin-bottom:12px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600">Quick Routines</div>
      <div class="ghome-scenes" id="ghomeModalScenes"></div>
    </div>

    <!-- Room Filter & Device Count -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
      <div class="ghome-rooms" id="ghomeModalRooms"></div>
      <span id="ghomeDevCount" style="font-size:11px;color:var(--muted);font-family:var(--mono)"></span>
    </div>

    <!-- Devices Grid -->
    <div class="ghome-devices" id="ghomeModalDevGrid" style="grid-template-columns:repeat(auto-fill, minmax(145px, 1fr));margin-bottom:12px"></div>
  `);

  document.getElementById("modalBox").classList.add("wide");

  const authCardEl = document.getElementById("ghomeAuthCard");
  const formEl = document.getElementById("ghomeDevForm");
  const formHeading = document.getElementById("ghomeFormHeading");
  const formId = document.getElementById("ghomeFormId");
  const formName = document.getElementById("ghomeFormName");
  const formType = document.getElementById("ghomeFormType");
  const formRoom = document.getElementById("ghomeFormRoom");
  const formWebhook = document.getElementById("ghomeFormWebhook");
  const bulkForm = document.getElementById("ghomeBulkForm");
  const bulkText = document.getElementById("ghomeBulkText");

  function updateBarActiveStates() {
    const addBtn = document.getElementById("ghomeAddToggle");
    const bulkBtn = document.getElementById("ghomeBulkToggle");
    if (addBtn) addBtn.classList.toggle("active", formEl && formEl.style.display !== "none");
    if (bulkBtn) bulkBtn.classList.toggle("active", bulkForm && bulkForm.style.display !== "none");
  }

  function openAddForm() {
    formId.value = "";
    formName.value = "";
    formType.value = "light";
    formRoom.value = filterRoom !== "all" ? filterRoom : "Office";
    formWebhook.value = "";
    formHeading.textContent = "Add Smart Device";
    const iconEl = document.getElementById("ghomeFormIcon");
    if (iconEl) iconEl.textContent = "✨";
    bulkForm.style.display = "none";
    const isOpen = formEl.style.display !== "none";
    formEl.style.display = isOpen ? "none" : "block";
    updateBarActiveStates();
    if (!isOpen) formName.focus();
  }

  function openBulkForm() {
    formEl.style.display = "none";
    const isOpen = bulkForm.style.display !== "none";
    bulkForm.style.display = isOpen ? "none" : "block";
    updateBarActiveStates();
    if (!isOpen) {
      updateBulkCounter();
      bulkText.focus();
    }
  }

  function updateBulkCounter() {
    const counter = document.getElementById("ghomeBulkCounter");
    if (!counter) return;
    const lines = bulkText.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    counter.textContent = lines.length ? `${lines.length} device${lines.length === 1 ? "" : "s"} ready to add` : "";
  }
  bulkText.oninput = updateBulkCounter;

  const exampleBtn = document.getElementById("ghomeBulkExampleBtn");
  if (exampleBtn) {
    exampleBtn.onclick = () => {
      bulkText.value = `Living Room Light, light, Living Room
Bedroom AC, plug, Bedroom
Study Lamp, light, Office
Workstation PC, plug, Office
Kitchen Spotlight, light, Kitchen
Balcony Light, light, Balcony`;
      updateBulkCounter();
      bulkText.focus();
    };
  }

  document.querySelectorAll(".ghome-room-chip").forEach(chip => {
    chip.onclick = () => {
      formRoom.value = chip.dataset.chip;
      formRoom.focus();
    };
  });

  const formCloseBtn = document.getElementById("ghomeFormCloseBtn");
  if (formCloseBtn) formCloseBtn.onclick = () => { formEl.style.display = "none"; updateBarActiveStates(); };

  const bulkCloseBtn = document.getElementById("ghomeBulkCloseBtn");
  if (bulkCloseBtn) bulkCloseBtn.onclick = () => { bulkForm.style.display = "none"; updateBarActiveStates(); };

  document.getElementById("ghomeFormCancel").onclick = () => {
    formEl.style.display = "none";
    updateBarActiveStates();
  };

  document.getElementById("ghomeBulkClose").onclick = () => {
    bulkForm.style.display = "none";
    updateBarActiveStates();
  };

  document.getElementById("ghomeBulkSubmit").onclick = () => {
    const raw = bulkText.value;
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      toast("Please enter at least one device line");
      return;
    }

    let addedCount = 0;
    for (const line of lines) {
      const dev = parseBulkDeviceLine(line);
      if (dev) {
        allDevices.push(dev);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      save();
      bulkText.value = "";
      bulkForm.style.display = "none";
      renderModalView();
      toast(`Added ${addedCount} device${addedCount === 1 ? "" : "s"}`);
    }
  };

  document.getElementById("ghomeFormSave").onclick = () => {
    const name = formName.value.trim();
    if (!name) { toast("Device name is required"); return; }
    const type = formType.value;
    const room = formRoom.value.trim() || "General";
    const webhookUrl = formWebhook.value.trim();

    if (formId.value) {
      const dev = allDevices.find(d => d.id === formId.value);
      if (dev) {
        dev.name = name;
        dev.type = type;
        dev.room = room;
        dev.webhookUrl = webhookUrl;
      }
    } else {
      const id = "hd-" + Math.random().toString(36).slice(2, 7);
      allDevices.push({
        id,
        name,
        type,
        room,
        on: false,
        brightness: type === "light" ? 100 : undefined,
        targetTemp: type === "thermostat" ? 22 : undefined,
        currentTemp: type === "thermostat" ? 21 : undefined,
        unit: type === "thermostat" ? "°C" : undefined,
        volume: type === "speaker" ? 50 : undefined,
        locked: type === "lock" ? true : undefined,
        webhookUrl
      });
    }
    save();
    formEl.style.display = "none";
    renderModalView();
    toast(formId.value ? "Device updated" : "Device added");
  };

  function renderAuthSection() {
    const auth = cfg.googleAuth || {};
    const isConnected = !!auth.connected && !!auth.accessToken;

    if (isConnected) {
      authCardEl.innerHTML = `
        <div class="ghome-auth-header">
          <div class="ghome-auth-user">
            ${auth.picture ? `<img src="${escapeHtml(auth.picture)}" class="ghome-avatar" alt="">` : `<div class="ghome-avatar-fallback">G</div>`}
            <div class="ghome-user-meta">
              <span class="ghome-user-name">
                ${escapeHtml(auth.name || "Google User")}
                <span class="ghome-badge-connected">● Connected</span>
                ${auth.hasHomePlatform ? `<span style="font-size:10px;color:var(--green);background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);padding:1px 6px;border-radius:4px;font-weight:500">🏠 Home Platform v2</span>` : ""}
              </span>
              <span class="ghome-user-email">${escapeHtml(auth.email || "Google Account")}</span>
            </div>
          </div>
          <div class="ghome-auth-actions">
            <button id="ghomeSyncBtn" class="ghome-btn" style="padding:5px 10px;font-size:11px" title="Refresh smart devices">
              🔄 Refresh Devices
            </button>
            <button id="ghomeAuthSettingsBtn" class="ghome-btn" style="padding:5px 8px;font-size:11px" title="Settings">
              ⚙️
            </button>
            <button id="ghomeDisconnectBtn" class="ghome-btn" style="padding:5px 10px;font-size:11px;color:var(--red);border-color:var(--red)">
              Disconnect
            </button>
          </div>
        </div>

        <div style="margin-top:8px;padding:6px 10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:4px;font-size:10.5px;color:var(--dim);line-height:1.4">
          ${auth.hasHomePlatform ? `
            <span>🟢 <strong>Home Platform v2 Active:</strong> Google Home Platform authorization is connected! View & control all your live devices on <a href="https://home.google.com/" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline">Google Home Web ↗</a> or manage switches in DevDeck with <strong>Bulk Add</strong>.</span>
          ` : `
            <span>💡 <strong>Tip:</strong> Click <strong>Disconnect</strong> and re-sign in to grant the sensitive <code>home.platform.v2</code> scope configured in your Google Cloud Console.</span>
          `}
        </div>

        <div id="ghomeSettingsBox" style="display:${showAuthForm ? "block" : "none"};margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <div class="field" style="margin-bottom:6px">
            <label style="font-size:11px;color:var(--muted)">Google Cloud Client ID</label>
            <input type="text" id="ghomeSettingsCid" value="${escapeHtml(auth.clientId || "")}" placeholder="xxxx.apps.googleusercontent.com" style="width:100%;padding:5px;font-size:11px;background:var(--panel);border:1px solid var(--border);border-radius:4px;color:var(--fg)">
          </div>
          <details style="margin-bottom:8px">
            <summary style="font-size:10.5px;color:var(--dim);cursor:pointer">Advanced Nest Hardware Sync (Optional)</summary>
            <div style="margin-top:6px">
              <label style="font-size:10px;color:var(--muted)">Nest Enterprise Project ID (Only if using Nest Thermostat/Cam)</label>
              <input type="text" id="ghomeSettingsPid" value="${escapeHtml(auth.projectId || "")}" placeholder="UUID or enterprises/xxxx" style="width:100%;padding:4px;font-size:10.5px;background:var(--panel);border:1px solid var(--border);border-radius:4px;color:var(--fg)">
            </div>
          </details>
          <div class="row" style="gap:6px">
            <button id="ghomeSaveSettings" style="font-size:11px;padding:4px 10px">Save Settings</button>
          </div>
        </div>
      `;

      document.getElementById("ghomeSyncBtn").onclick = () => {
        syncGoogleDevices(() => renderModalView());
      };

      document.getElementById("ghomeAuthSettingsBtn").onclick = () => {
        showAuthForm = !showAuthForm;
        renderAuthSection();
      };

      document.getElementById("ghomeSaveSettings").onclick = () => {
        const pidEl = document.getElementById("ghomeSettingsPid");
        if (pidEl) auth.projectId = pidEl.value.trim();
        auth.clientId = document.getElementById("ghomeSettingsCid").value.trim();
        save();
        toast("Google settings saved");
        showAuthForm = false;
        renderAuthSection();
      };

      document.getElementById("ghomeDisconnectBtn").onclick = () => {
        if (confirm("Disconnect Google Account from DevDeck?")) {
          auth.connected = false;
          auth.accessToken = "";
          auth.email = "";
          auth.name = "";
          auth.picture = "";
          auth.hasHomePlatform = false;
          auth.scopes = "";
          save();
          toast("Google Account disconnected");
          renderModalView();
        }
      };
    } else {
      // Not connected
      authCardEl.innerHTML = `
        <div class="ghome-auth-header">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--fg);display:flex;align-items:center;gap:6px">
              <span>Google Account Integration</span>
              <span style="font-size:10px;color:var(--dim);border:1px solid var(--border);padding:1px 6px;border-radius:999px">Optional</span>
            </div>
            <div style="font-size:11px;color:var(--muted)">Manage devices connected to your Google Home account.</div>
          </div>
          <div class="ghome-auth-actions">
            <button id="ghomeSignInBtn" class="ghome-google-btn">
              <svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
              Sign in with Google
            </button>
            <button id="ghomeToggleTokenBtn" class="ghome-btn" style="padding:6px 10px;font-size:11px">
              Manual Token Setup
            </button>
            <button id="ghomeGuideToggle" class="ghome-btn" style="padding:6px 10px;font-size:11px">
              Info ℹ️
            </button>
          </div>
        </div>

        <div style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <label style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="ghomeScopePlatform" style="accent-color:var(--accent)">
            <span>Include sensitive scope (<code>home.platform.v2</code>)</span>
          </label>
          <span style="font-size:10px;color:var(--dim)">Uncheck if Google gives "invalid_scope"</span>
        </div>

        <!-- Token / OAuth Input Form -->
        <div id="ghomeTokenBox" style="display:${showAuthForm ? "block" : "none"};margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <div class="field" style="margin-bottom:8px">
            <label style="font-size:11px;color:var(--muted)">Google OAuth Access Token</label>
            <input type="password" id="ghomeManualToken" placeholder="ya29.a0..." style="width:100%;padding:5px;font-size:11px;background:var(--panel);border:1px solid var(--border);border-radius:4px;color:var(--fg)">
          </div>
          <div class="field" style="margin-bottom:8px">
            <label style="font-size:11px;color:var(--muted)">Google Cloud Client ID (Optional — for 1-click Sign In)</label>
            <input type="text" id="ghomeManualCid" value="${escapeHtml(auth.clientId || "")}" placeholder="xxxx.apps.googleusercontent.com" style="width:100%;padding:5px;font-size:11px;background:var(--panel);border:1px solid var(--border);border-radius:4px;color:var(--fg)">
          </div>
          <div class="row" style="gap:6px">
            <button id="ghomeSaveTokenBtn" style="font-size:11px;padding:5px 12px">Connect Account</button>
          </div>
        </div>

        <!-- Guide Box -->
        <div id="ghomeGuideBox" class="ghome-guide-box" style="display:${showGuide ? "block" : "none"}">
          <strong>Google Home Device Management & Cloud Sync:</strong>
          <ul style="margin:4px 0 8px 16px;padding:0">
            <li><strong>Scopes Supported:</strong> Includes <code>home.platform.v2</code> to access and manage your Google Home data and devices.</li>
            <li><strong>Google Home Web (Live View):</strong> Open <a href="https://home.google.com/" target="_blank" rel="noopener" style="color:var(--accent)">Google Home Web ↗</a> anytime to view, switch, and stream all your connected Google Home devices live in your browser.</li>
            <li><strong>Quick Setup in DevDeck:</strong> Click <strong>📋 Bulk Add</strong> to quickly paste your actual home devices (or <strong>+ Add Device</strong>) to control switches, brightness, and scenes right from DevDeck.</li>
            <li><strong>Clear Samples:</strong> Click <strong>🧹 Clear Samples</strong> to wipe out the pre-populated demo devices with 1 click.</li>
          </ul>
        </div>
      `;

      document.getElementById("ghomeSignInBtn").onclick = () => {
        let cid = (auth.clientId || "").trim();
        if (!cid) {
          cid = prompt("Enter your Google Cloud OAuth Client ID (from GCP Console):", auth.clientId || "");
          if (!cid) return;
          auth.clientId = cid.trim();
          save();
        }
        sessionStorage.setItem("ghome_oauth_pending", "1");
        const redirectUri = window.location.origin + window.location.pathname;
        const wantPlatform = document.getElementById("ghomeScopePlatform")?.checked;
        const scopesList = [
          ...(wantPlatform ? ["https://www.googleapis.com/auth/home.platform.v2"] : []),
          ...(auth.projectId ? ["https://www.googleapis.com/auth/sdm.service"] : []),
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "openid"
        ];
        const scopes = scopesList.join(" ");
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(cid)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=consent`;
        window.location.href = authUrl;
      };

      document.getElementById("ghomeToggleTokenBtn").onclick = () => {
        showAuthForm = !showAuthForm;
        renderAuthSection();
      };

      document.getElementById("ghomeGuideToggle").onclick = () => {
        showGuide = !showGuide;
        renderAuthSection();
      };

      if (showAuthForm) {
        document.getElementById("ghomeSaveTokenBtn").onclick = async () => {
          const tok = document.getElementById("ghomeManualToken").value.trim();
          const cid = document.getElementById("ghomeManualCid").value.trim();

          auth.clientId = cid;

          if (tok) {
            auth.accessToken = tok;
            auth.tokenExpiry = Date.now() + 3600 * 1000;
            try {
              toast("Validating Google Account…");
              const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tok}` }
              });
              if (res.ok) {
                const info = await res.json();
                auth.connected = true;
                auth.email = info.email || "Google Account";
                auth.name = info.name || "";
                auth.picture = info.picture || "";

                try {
                  const tinfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(tok)}`);
                  if (tinfoRes.ok) {
                    const tinfo = await tinfoRes.json();
                    auth.scopes = tinfo.scope || "";
                    auth.hasHomePlatform = (tinfo.scope || "").includes("home.platform.v2");
                  }
                } catch {}

                save();
                const scopeTag = auth.hasHomePlatform ? " (Home Platform v2)" : "";
                toast(`Connected as ${info.email}${scopeTag}`);
                renderModalView();
                return;
              }
            } catch {}
            auth.connected = true;
            auth.email = "Google Account";
            save();
            toast("Connected with OAuth token");
            renderModalView();
          } else {
            save();
            toast("Settings saved");
            renderAuthSection();
          }
        };
      }
    }
  }

  function renderModalView() {
    renderAuthSection();

    // Render Bar Actions
    const barActions = document.getElementById("ghomeBarActions");
    const hasSamples = allDevices.some(d => SAMPLE_IDS.has(d.id));
    const hasDevices = allDevices.length > 0;

    barActions.innerHTML = `
      <button id="ghomeAddToggle" class="ghome-action-btn ghome-btn-add" title="Add a single smart device">
        <span class="ghome-btn-icon">＋</span>
        <span>Add Device</span>
      </button>
      <button id="ghomeBulkToggle" class="ghome-action-btn ghome-btn-bulk" title="Paste multiple devices at once">
        <span class="ghome-btn-icon">📋</span>
        <span>Bulk Add</span>
      </button>
      ${hasSamples ? `
        <button id="ghomeClearSamplesBtn" class="ghome-action-btn ghome-btn-clear" title="Remove the built-in demo devices">
          <span class="ghome-btn-icon">🧹</span>
          <span>Clear Samples</span>
        </button>
      ` : (hasDevices ? `
        <button id="ghomeClearAllBtn" class="ghome-action-btn ghome-btn-danger" title="Remove all smart devices">
          <span class="ghome-btn-icon">🗑️</span>
          <span>Clear All</span>
        </button>
      ` : "")}
    `;

    document.getElementById("ghomeAddToggle").onclick = openAddForm;
    document.getElementById("ghomeBulkToggle").onclick = openBulkForm;
    updateBarActiveStates();

    const clearSamplesBtn = document.getElementById("ghomeClearSamplesBtn");
    if (clearSamplesBtn) {
      clearSamplesBtn.onclick = () => {
        if (confirm("Remove the 7 built-in sample devices?")) {
          const filtered = allDevices.filter(d => !SAMPLE_IDS.has(d.id));
          allDevices.length = 0;
          allDevices.push(...filtered);
          save();
          renderModalView();
          toast("Sample devices cleared");
        }
      };
    }

    const clearAllBtn = document.getElementById("ghomeClearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.onclick = () => {
        if (confirm("Remove all smart devices from DevDeck?")) {
          allDevices.length = 0;
          save();
          renderModalView();
          toast("All devices cleared");
        }
      };
    }

    // Render Scenes
    const scenesEl = document.getElementById("ghomeModalScenes");
    scenesEl.innerHTML = scenes.map(s => `
      <button class="ghome-scene-chip" data-modal-scene="${escapeHtml(s.id)}">
        <span>${s.icon || "⚡"}</span>
        <span>${escapeHtml(s.name)}</span>
      </button>
    `).join("");
    scenesEl.querySelectorAll("[data-modal-scene]").forEach(btn => {
      btn.onclick = () => {
        triggerHomeScene(btn.dataset.modalScene);
        renderModalView();
      };
    });

    // Render Room filters
    const rooms = ["all", ...new Set(allDevices.map(d => d.room).filter(Boolean))];
    if (!rooms.includes(filterRoom)) filterRoom = "all";
    const roomsEl = document.getElementById("ghomeModalRooms");
    roomsEl.innerHTML = rooms.map(r => `
      <button class="ghome-room-btn ${r === filterRoom ? "active" : ""}" data-modal-room="${escapeHtml(r)}">
        ${r === "all" ? "All Rooms" : escapeHtml(r)}
      </button>
    `).join("");
    roomsEl.querySelectorAll("[data-modal-room]").forEach(btn => {
      btn.onclick = () => {
        filterRoom = btn.dataset.modalRoom;
        renderModalView();
      };
    });

    // Render Devices
    const filtered = filterRoom === "all" ? allDevices : allDevices.filter(d => d.room === filterRoom);
    document.getElementById("ghomeDevCount").textContent = `${filtered.length} device${filtered.length === 1 ? "" : "s"}`;
    const gridEl = document.getElementById("ghomeModalDevGrid");

    if (!filtered.length) {
      if (allDevices.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:32px 16px;background:var(--panel-2);border-radius:var(--radius);border:1px dashed var(--border)">
            <div style="font-size:32px;margin-bottom:8px">🏠</div>
            <div style="font-weight:600;font-size:14px;color:var(--fg);margin-bottom:4px">No Devices Added Yet</div>
            <div style="font-size:11.5px;max-width:440px;margin:0 auto 14px;color:var(--dim);line-height:1.5">
              Add your Google Home devices to control switches, brightness, and scenes right from DevDeck, or view them live on Google Home Web.
            </div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              <button id="ghomeEmptyAddBtn" class="ghome-action-btn ghome-btn-add">
                <span class="ghome-btn-icon">＋</span>
                <span>Add Device</span>
              </button>
              <button id="ghomeEmptyBulkBtn" class="ghome-action-btn ghome-btn-bulk">
                <span class="ghome-btn-icon">📋</span>
                <span>Bulk Add Devices</span>
              </button>
              <a href="https://home.google.com/" target="_blank" rel="noopener" class="ghome-web-btn" style="margin-left:0;font-size:12px;padding:6px 14px">🏠 Open Google Home Web ↗</a>
            </div>
          </div>
        `;
        const emptyAdd = document.getElementById("ghomeEmptyAddBtn");
        if (emptyAdd) emptyAdd.onclick = openAddForm;
        const emptyBulk = document.getElementById("ghomeEmptyBulkBtn");
        if (emptyBulk) emptyBulk.onclick = openBulkForm;
      } else {
        gridEl.innerHTML = `<div style="grid-column:1/-1;font-size:12px;color:var(--dim);text-align:center;padding:24px">No devices found in ${escapeHtml(filterRoom)}. Click "+ Add Device" above or switch to "All Rooms".</div>`;
      }
      return;
    }

    gridEl.innerHTML = filtered.map(d => {
      const isLight = d.type === "light";
      const isPlug = d.type === "plug";
      const isThermostat = d.type === "thermostat";
      const isSpeaker = d.type === "speaker";
      const isLock = d.type === "lock";
      const isCamera = d.type === "camera";

      let icon = "💡";
      if (isPlug) icon = "🔌";
      else if (isThermostat) icon = "🌡️";
      else if (isSpeaker) icon = "🔊";
      else if (isLock) icon = d.locked ? "🔒" : "🔓";
      else if (isCamera) icon = "📹";

      let pill = "OFF";
      if (isThermostat) {
        pill = `${d.targetTemp || 22}${d.unit || "°C"}`;
      } else if (isLock) {
        pill = d.locked ? "LOCKED" : "UNLOCKED";
      } else if (isCamera) {
        pill = "LIVE";
      } else if (d.on) {
        if (isLight && d.brightness) pill = `${d.brightness}%`;
        else if (isPlug && d.power) pill = d.power;
        else if (isSpeaker) pill = d.volume ? `${d.volume}%` : "ON";
        else pill = "ON";
      }

      const isOn = isLock ? !d.locked : (isThermostat || isCamera ? true : !!d.on);

      return `
        <div class="ghome-card ${isOn ? "on" : ""}" data-dev="${escapeHtml(d.id)}">
          <div class="ghome-head">
            <span class="ghome-ico">${icon}</span>
            <div style="display:flex;gap:4px;align-items:center">
              <span class="ghome-pill">${pill}</span>
              <button class="dev-tool-btn" data-edit="${escapeHtml(d.id)}" title="Edit device" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:11px;padding:2px">✏️</button>
              <button class="dev-tool-btn" data-del="${escapeHtml(d.id)}" title="Delete device" style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:11px;padding:2px">🗑️</button>
            </div>
          </div>
          <div class="ghome-info">
            <span class="ghome-name" title="${escapeHtml(d.name)}">
              ${escapeHtml(d.name)}
              ${d.isGoogle ? `<span class="ghome-tag-google">Nest</span>` : ""}
            </span>
            <span class="ghome-room">${escapeHtml(d.room || "Home")}${d.webhookUrl ? " · ⚡" : ""}</span>
          </div>
          ${isLight && d.on ? `
            <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--muted)">
              <span>🔅</span>
              <input type="range" class="ghome-bright" data-bright="${escapeHtml(d.id)}" min="10" max="100" value="${d.brightness || 100}" style="flex:1;accent-color:var(--accent);height:4px">
              <span>${d.brightness || 100}%</span>
            </div>
          ` : ""}
          <div class="ghome-action">
            ${isThermostat ? `
              <div class="ghome-stepper">
                <button class="ghome-stepper-btn" data-step="down" title="Lower temp">-</button>
                <span class="ghome-temp-val">${d.targetTemp || 22}${d.unit || "°C"}</span>
                <button class="ghome-stepper-btn" data-step="up" title="Raise temp">+</button>
              </div>
            ` : isCamera ? `
              <a href="https://home.google.com/" target="_blank" rel="noopener" class="ghome-btn" style="text-decoration:none;display:inline-block">View Stream ↗</a>
            ` : `
              <button class="ghome-btn" data-toggle="${escapeHtml(d.id)}">
                ${isLock ? (d.locked ? "Unlock" : "Lock") : (d.on ? "Turn Off" : "Turn On")}
              </button>
            `}
          </div>
        </div>
      `;
    }).join("");

    gridEl.querySelectorAll("[data-edit]").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dev = allDevices.find(d => d.id === btn.dataset.edit);
        if (!dev) return;
        formId.value = dev.id;
        formName.value = dev.name;
        formType.value = dev.type;
        formRoom.value = dev.room || "";
        formWebhook.value = dev.webhookUrl || "";
        formHeading.textContent = "Edit Smart Device";
        const iconEl = document.getElementById("ghomeFormIcon");
        if (iconEl) iconEl.textContent = "✏️";
        bulkForm.style.display = "none";
        formEl.style.display = "block";
        updateBarActiveStates();
        formName.focus();
      };
    });

    gridEl.querySelectorAll("[data-del]").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = allDevices.findIndex(d => d.id === btn.dataset.del);
        if (idx === -1) return;
        if (confirm(`Remove "${allDevices[idx].name}"?`)) {
          allDevices.splice(idx, 1);
          save();
          renderModalView();
          toast("Device removed");
        }
      };
    });

    gridEl.querySelectorAll(".ghome-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const dev = allDevices.find(d => d.id === btn.dataset.toggle);
        if (!dev) return;
        if (dev.type === "lock") dev.locked = !dev.locked;
        else dev.on = !dev.on;
        dispatchDeviceAction(dev);
        renderModalView();
      };
    });

    gridEl.querySelectorAll(".ghome-bright").forEach(input => {
      input.oninput = (e) => {
        e.stopPropagation();
        const dev = allDevices.find(d => d.id === input.dataset.bright);
        if (!dev) return;
        dev.brightness = parseInt(input.value);
        const card = input.closest(".ghome-card");
        if (card) {
          const pill = card.querySelector(".ghome-pill");
          if (pill) pill.textContent = `${dev.brightness}%`;
        }
      };
      input.onchange = (e) => {
        e.stopPropagation();
        const dev = allDevices.find(d => d.id === input.dataset.bright);
        if (!dev) return;
        dev.brightness = parseInt(input.value);
        dispatchDeviceAction(dev);
      };
    });

    gridEl.querySelectorAll(".ghome-stepper-btn").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const card = btn.closest("[data-dev]");
        if (!card) return;
        const dev = allDevices.find(x => x.id === card.dataset.dev);
        if (!dev) return;
        const delta = btn.dataset.step === "up" ? 1 : -1;
        dev.targetTemp = Math.max(15, Math.min(32, (dev.targetTemp || 22) + delta));
        dispatchDeviceAction(dev);
        renderModalView();
      };
    });
  }

  renderModalView();
}

/* ============================================================
   PLUGINS
   ============================================================ */
async function renderPlugins() {
  const host = document.getElementById("pluginHost");
  host.innerHTML = "";
  for (const p of (cfg.plugins || [])) {
    if (!p.enabled) continue;
    const card = document.createElement("div");
    card.className = "plugin-widget";
    card.innerHTML = `
      <h2>${escapeHtml(p.name)} <span class="badge-plugin">plugin</span></h2>
      <div class="body">…</div>`;
    host.appendChild(card);
    const body = card.querySelector(".body");
    // Run plugin in a sandboxed iframe — no access to parent DOM, vault, config, or localStorage
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const msgHandler = (ev) => {
      if (ev.source !== iframe.contentWindow) return;
      window.removeEventListener("message", msgHandler);
      iframe.remove();
      if (ev.data && ev.data.type === "plugin-result") {
        if (ev.data.error) {
          body.innerHTML = `<span style="color:var(--red)">plugin error: ${escapeHtml(String(ev.data.error))}</span>`;
        } else {
          // Only allow plain text output from sandboxed plugins, not arbitrary HTML
          body.textContent = ev.data.result || "";
        }
      }
    };
    window.addEventListener("message", msgHandler);
    // 5 second timeout
    setTimeout(() => {
      window.removeEventListener("message", msgHandler);
      if (iframe.parentNode) { iframe.remove(); body.innerHTML = `<span style="color:var(--red)">plugin timed out</span>`; }
    }, 5000);
    iframe.srcdoc = `<!DOCTYPE html><html><body><script>
(async () => {
  try {
    const result = await (async () => { ${p.code.replace(/<\/script>/gi, "<\\/script>")} })();
    parent.postMessage({ type: "plugin-result", result: String(result || "") }, "*");
  } catch(e) {
    parent.postMessage({ type: "plugin-result", error: e.message }, "*");
  }
})();
<\/script></body></html>`;
  }
}
document.getElementById("btnPlugins").onclick = () => openPlugins();
function openPlugins() {
  const plugins = cfg.plugins || [];
  openModal("Plugins", `
    <p class="hint-text">
      Plugins are inline JS. They run in this page's context — <strong>only add code you trust</strong>.
      Body must be an <code>async</code> function body; return an HTML string.
    </p>
    <div class="field">
      <label>Installed plugins (JSON — edit + Save)</label>
      <textarea id="plEdit" rows="16" spellcheck="false">${escapeHtml(JSON.stringify(plugins, null, 2))}</textarea>
    </div>
    <div class="row">
      <button id="plSave">Save</button>
      <button id="plReload" class="ghost">Reload widgets</button>
    </div>
    <div class="out" id="plOut"></div>`);
  document.getElementById("modalBox").classList.add("wide");
  document.getElementById("plSave").onclick = () => {
    try {
      const parsed = JSON.parse(document.getElementById("plEdit").value);
      if (!Array.isArray(parsed)) throw new Error("must be array");
      cfg.plugins = parsed; save(); renderPlugins(); toast("plugins saved");
    } catch (e) { const o = document.getElementById("plOut"); o.classList.add("err"); o.textContent = "✗ " + e.message; }
  };
  document.getElementById("plReload").onclick = () => { renderPlugins(); toast("reloaded"); };
}

/* ============================================================
   CONFIG EDITORS
   ============================================================ */
document.getElementById("editPorts").onclick = () => editJson("Ports", "ports");
document.getElementById("editInfra").onclick = () => editJson("Infrastructure", "infra");
document.getElementById("editSnippets").onclick = () => editJson("Snippets", "snippets");
function editJson(title, key) {
  const current = JSON.stringify(cfg[key], null, 2);
  openModal(`Edit ${title}`, `
    <div class="field"><label>JSON array</label>
    <textarea id="cfgEdit" rows="16" spellcheck="false">${escapeHtml(current)}</textarea></div>
    <div class="row"><button id="cfgSave">Save</button><button id="cfgCancel" class="ghost">Cancel</button></div>
    <div class="out" id="cfgOut"></div>`);
  const $t = document.getElementById("cfgEdit"), $out = document.getElementById("cfgOut");
  document.getElementById("cfgSave").onclick = () => {
    try {
      const parsed = JSON.parse($t.value);
      if (!Array.isArray(parsed)) throw new Error("must be an array");
      cfg[key] = parsed; save();
      if (key === "ports") renderPorts();
      if (key === "infra") renderInfra();
      if (key === "snippets") { renderSnipTags(); renderSnippets(); renderBangHint(); }
      closeModal();
      toast("saved");
    } catch (e) { $out.classList.add("err"); $out.textContent = "✗ " + e.message; }
  };
  document.getElementById("cfgCancel").onclick = closeModal;
  $t.focus();
}

/* ============================================================
   COMMAND PALETTE
   ============================================================ */
const paletteBackdrop = document.getElementById("paletteBackdrop");
const paletteInput = document.getElementById("paletteInput");
const paletteList = document.getElementById("paletteList");
let paletteCommands = [], paletteActive = 0;

function buildCommands() {
  const cmds = [];
  const t = (label, k, run) => cmds.push({ cat:"tool", label, k, run });
  t("JSON: format / validate", "⌘J", () => openTool("json"));
  t("Base64: encode / decode", "⌘B", () => openTool("b64"));
  t("JWT: decode", "⌘U", () => openTool("jwt"));
  t("Timestamp: parse", "⌘T", () => openTool("ts"));
  t("Regex: test", "⌘R", () => openTool("regex"));
  t("UUID generator", "", () => openTool("uuid"));
  t("Hash (SHA-1/256)", "", () => openTool("hash"));
  t("URL encode/decode", "", () => openTool("url"));
  t("Color converter", "", () => openTool("color"));
  t("cURL: convert to Fetch / Python", "", () => openTool("curl"));
  t("Cron: expression visualizer", "", () => openTool("cron"));
  t("DNS: DoH query lookup", "", () => openTool("dns"));
  t("Keygen: token & password generator", "", () => openTool("keygen"));
  t("API tester", "", () => openTool("api"));
  t("Google Home: smart devices & routines", "", () => openTool("ghome"));
  t("More tools (JSON↔YAML)", "", () => openTool("more"));

  cmds.push({ cat:"home", label:"Google Home: manage devices & routines", run:()=>{ closePalette(); toolGoogleHome(); } });
  cmds.push({ cat:"home", label:"Google Home: open web dashboard (home.google.com)", run:()=>{ window.open("https://home.google.com/","_blank"); closePalette(); } });
  cmds.push({ cat:"home", label:"Google Home: run routine 'Focus Work'", run:()=>{ closePalette(); triggerHomeScene("sc-1"); } });
  cmds.push({ cat:"home", label:"Google Home: run routine 'All Devices Off'", run:()=>{ closePalette(); triggerHomeScene("sc-3"); } });

  Object.entries(cfg.pads.buffers).forEach(([id, buf]) => cmds.push({
    cat:"scratchpad", label:`Scratchpad: ${buf.name}`,
    run:()=>{ cfg.pads.active = id; save(); renderPad(); closePalette(); document.getElementById("padArea").focus(); }
  }));
  cmds.push({ cat:"scratchpad", label:"New scratchpad buffer", run:()=>{ closePalette(); newPad(); } });
  cmds.push({ cat:"scratchpad", label:"Toggle scratchpad preview", run:()=>{ closePalette(); document.getElementById("padPreview").click(); } });
  cmds.push({ cat:"scratchpad", label:"Summon scratchpad", k:"⌘⇧S", run:()=>{ closePalette(); summonPad(); } });
  cmds.push({ cat:"scratchpad", label:"Snapshot current buffer", run:()=>{ closePalette(); document.getElementById("padSnapshot").click(); } });
  cmds.push({ cat:"scratchpad", label:"Diff two buffers", run:()=>{ closePalette(); document.getElementById("padDiff").click(); } });

  cfg.snippets.forEach((s) => cmds.push({
    cat:"snippet", label:`Snippet: ${s.label}`, k:(s.tags||[]).join(", "),
    run:()=>{ closePalette(); copySnippet(s); }
  }));

  Object.entries(cfg.engines).forEach(([key, eng]) => cmds.push({
    cat:"search", label:`Default engine: ${eng.name}`,
    run:()=>{ cfg.defaultEngine = key; save(); renderEngineSwitch(); renderBangHint(); closePalette(); toast("default: "+eng.name); }
  }));
  cmds.push({ cat:"search", label:"Edit search bangs…", run:()=>{ closePalette(); editBangs(); } });
  cmds.push({ cat:"search", label:"Clear search history", run:()=>{ cfg.searchHistory = {}; save(); closePalette(); toast("search history cleared"); } });

  cmds.push({ cat:"ui", label:"Customize theme & wallpaper…", run:()=>{ closePalette(); openThemeModal(); } });
  cmds.push({ cat:"ui", label:"Cycle theme mode", run:()=>{ closePalette(); document.getElementById("btnTheme").click(); } });
  cmds.push({ cat:"data", label:"Export all config", run:()=>{ exportAll(); closePalette(); } });
  cmds.push({ cat:"data", label:"Import config…", run:()=>{ closePalette(); importAll(); } });
  cmds.push({ cat:"data", label:"Open secrets vault", run:()=>{ closePalette(); openVault(); } });
  cmds.push({ cat:"data", label:"Clipboard history", run:()=>{ closePalette(); openClips(); } });
  cmds.push({ cat:"data", label:"Manage plugins", run:()=>{ closePalette(); openPlugins(); } });
  cmds.push({ cat:"data", label:"Reload plugins", run:()=>{ closePalette(); renderPlugins(); } });
  cmds.push({ cat:"widget", label:"Add a widget…", run:()=>{ closePalette(); openWidgetGallery(); } });

  cfg.ports.forEach(p => cmds.push({
    cat:"port", label:`Open :${p.port} (${p.label})`, run:()=>{ window.open(`http://localhost:${p.port}`,"_blank"); closePalette(); }
  }));
  cfg.infra.forEach(item => cmds.push({
    cat:"infra", label:`Open ${item.label}`, run:()=>{ window.open(item.url,"_blank"); closePalette(); }
  }));
  Object.entries(cfg.profiles).forEach(([key, p]) => cmds.push({
    cat:"profile", label:`Profile: ${p.label}`,
    run:()=>{ cfg.activeProfile = key; save(); applyTheme(); renderProfileSwitch(); renderPorts(); renderInfra(); renderSnipTags(); renderSnippets(); renderBangHint(); closePalette(); }
  }));
  (cfg.apiRequests || []).forEach(r => cmds.push({
    cat:"api", label:`API: ${r.name} (${r.method})`,
    run:()=>{ closePalette(); toolApi(); setTimeout(() => {
      document.getElementById("apiMethod").value = r.method;
      document.getElementById("apiUrl").value = r.url;
      const hs = document.getElementById("apiHeaders"); hs.innerHTML = "";
      (r.headers || []).forEach(h => {
        const row = document.createElement("div"); row.className = "hrow";
        row.innerHTML = `<input type="text" value="${escapeHtml(h.k)}"><input type="text" value="${escapeHtml(h.v)}"><button>✕</button>`;
        row.querySelector("button").onclick = () => row.remove();
        hs.appendChild(row);
      });
      document.getElementById("apiBody").value = r.body || "";
    }, 20); }
  }));

  // Widget-related commands
  cfg.widgets.forEach(w => {
    const def = WIDGETS[w.type];
    if (!def) return;
    cmds.push({
      cat:"widget",
      label:`Widget: refresh ${def.name}`,
      run:()=>{
        closePalette();
        const card = [...document.querySelectorAll(".widget")].find(c => c.querySelector(`[data-menu="${w.id}"]`));
        if (card) renderWidget(w, card.querySelector(".widget-body"));
      }
    });
  });

  return cmds;
}
function openPalette() {
  paletteCommands = buildCommands(); paletteInput.value = ""; paletteActive = 0;
  paletteBackdrop.classList.add("open");
  setTimeout(() => paletteInput.focus(), 0);
  renderPalette("");
}
function closePalette() { paletteBackdrop.classList.remove("open"); }
function renderPalette(q) {
  const needle = q.trim().toLowerCase();
  const list = !needle ? paletteCommands : paletteCommands
    .map(c => ({ c, sc: fuzzyScore(needle, c.label) }))
    .filter(x => x.sc > 0).sort((a,b) => b.sc - a.sc).map(x => x.c);
  paletteList.innerHTML = "";
  if (!list.length) {
    paletteList.innerHTML = `<div class="palette-empty">no matching commands</div>`;
    paletteList._list = [];
    return;
  }
  if (paletteActive >= list.length) paletteActive = 0;
  list.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = "palette-item" + (i === paletteActive ? " active" : "");
    d.dataset.cat = c.cat;
    d.innerHTML = `
      <span class="label">
        <span class="cat-dot"></span>
        <span>${escapeHtml(c.label)}</span>
      </span>
      ${c.k ? `<span class="k">${escapeHtml(c.k)}</span>` : `<span class="cat-label">${escapeHtml(c.cat)}</span>`}`;
    d.onclick = () => c.run();
    d.onmouseenter = () => { paletteActive = i; renderPalette(q); };
    paletteList.appendChild(d);
  });
  paletteList._list = list;
  const active = paletteList.querySelector(".palette-item.active");
  if (active) active.scrollIntoView({ block: "nearest" });
}
paletteInput.addEventListener("input", () => { paletteActive = 0; renderPalette(paletteInput.value); });
paletteInput.addEventListener("keydown", (e) => {
  const list = paletteList._list || [];
  if (e.key === "ArrowDown") { e.preventDefault(); paletteActive = Math.min(paletteActive+1, list.length-1); renderPalette(paletteInput.value); }
  if (e.key === "ArrowUp")   { e.preventDefault(); paletteActive = Math.max(paletteActive-1, 0); renderPalette(paletteInput.value); }
  if (e.key === "Enter" && list[paletteActive]) { e.preventDefault(); list[paletteActive].run(); }
  if (e.key === "Escape") closePalette();
});
paletteBackdrop.addEventListener("click", e => { if (e.target === paletteBackdrop) closePalette(); });
document.getElementById("btnPalette").onclick = openPalette;

/* ============================================================
   EXPORT / IMPORT
   ============================================================ */
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function pickFile(cb) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => cb(r.result); r.readAsText(f); };
  inp.click();
}
function exportAll() {
  const safe = structuredClone(cfg);
  if (safe.vault) delete safe.vault;
  if (safe.clips) safe.clips = [];
  safe.lastExport = Date.now();
  cfg.lastExport = Date.now(); save();
  downloadBlob(new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" }), "startpage.config.json");
  toast("exported");
  document.getElementById("backupNudge").style.display = "none";
}
function importAll() {
  pickFile(text => {
    try {
      const data = JSON.parse(text);
      if (typeof data !== "object" || Array.isArray(data)) throw new Error("invalid config format");
      const keepVault = cfg.vault;
      const keepPlugins = cfg.plugins; // preserve locally-installed plugins — don't import from untrusted source
      cfg = { ...structuredClone(DEFAULTS), ...data };
      cfg.vault = keepVault; // always keep local vault
      cfg.plugins = keepPlugins; // never import plugins from external files
      // Sanitise: widgets must be an array of objects with valid type strings
      if (!Array.isArray(cfg.widgets)) cfg.widgets = structuredClone(DEFAULTS.widgets);
      cfg.widgets = cfg.widgets.filter(w => w && typeof w.type === "string" && typeof w.id === "string");
      save(); applyTheme();
      renderProfileSwitch(); renderEngineSwitch(); renderPorts(); renderInfra(); renderPad();
      renderSnipTags(); renderSnippets(); renderBangHint(); renderPlugins(); renderWidgets();
      toast("imported");
    } catch (e) { toast("import failed: " + e.message); }
  });
}
document.getElementById("btnExportAll").onclick = exportAll;
document.getElementById("btnImportAll").onclick = importAll;
document.getElementById("btnReset").onclick = () => {
  if (!confirm("Reset all config to defaults? This cannot be undone.")) return;
  localStorage.removeItem(LS_KEY); location.reload();
};
document.getElementById("btnBackupNow").onclick = exportAll;
function checkBackupNudge() {
  const days = (Date.now() - (cfg.lastExport || 0)) / 86400000;
  if (days > 14 && Object.keys(cfg.pads.buffers).length + cfg.snippets.length > 3) {
    document.getElementById("backupNudge").style.display = "";
  }
}

/* ============================================================
   SECRETS VAULT (AES-256-GCM + PBKDF2)
   ============================================================ */
let vaultUnlocked = null; // array of items: [{ id, key, value, category, notes, expiry, created, updated }]
let vaultSessionPass = null; // cached passphrase during active session
let vaultTimer = null;
let vaultActiveTab = "list"; // "list", "raw", "settings"
let vaultCatFilter = "all";
let vaultSearchQuery = "";
let revealedVaultIds = new Set();

function lockVault() {
  vaultUnlocked = null;
  vaultSessionPass = null;
  revealedVaultIds.clear();
  const badge = document.getElementById("vaultBadge");
  if (badge) badge.style.display = "none";
  if (vaultTimer) { clearTimeout(vaultTimer); vaultTimer = null; }
  if (modalTitle && modalTitle.textContent.startsWith("Secrets Vault")) {
    closeModal();
  }
}

function resetIdleTimer() {
  if (!vaultUnlocked) return;
  if (vaultTimer) clearTimeout(vaultTimer);
  const mins = cfg.vaultAutoLockMin !== undefined ? cfg.vaultAutoLockMin : 10;
  if (mins > 0) {
    vaultTimer = setTimeout(() => { lockVault(); toast("vault auto-locked"); }, mins * 60000);
  }
}
["mousemove","keydown","click","scroll"].forEach(ev => document.addEventListener(ev, resetIdleTimer, { passive: true }));

async function deriveKey(pass, salt) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", salt, iterations:200000, hash:"SHA-256" },
    base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
}
async function vaultEncrypt(pass, plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { salt: b64uEnc(salt), iv: b64uEnc(iv), ct: b64uEnc(new Uint8Array(ct)) };
}
async function vaultDecrypt(pass, v) {
  const salt = b64uDec(v.salt), iv = b64uDec(v.iv), ct = b64uDec(v.ct);
  const key = await deriveKey(pass, salt);
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
function b64uEnc(bytes) { let s = ""; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function b64uDec(str) { str = str.replace(/-/g,"+").replace(/_/g,"/"); while (str.length%4) str += "="; const bin = atob(str); const out = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }

function parseVaultPayload(plaintext) {
  const trimmed = (plaintext || "").trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || "v-" + Math.random().toString(36).slice(2, 8) + "-" + idx,
        key: String(item.key || item.name || "SECRET_" + (idx+1)),
        value: String(item.value || item.val || ""),
        category: item.category || "API Key",
        notes: item.notes || "",
        expiry: item.expiry || "",
        created: item.created || Date.now(),
        updated: item.updated || Date.now()
      }));
    }
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed).map(([k, v], idx) => ({
        id: "v-" + Math.random().toString(36).slice(2, 8) + "-" + idx,
        key: k,
        value: typeof v === "string" ? v : JSON.stringify(v),
        category: "API Key",
        notes: "",
        expiry: "",
        created: Date.now(),
        updated: Date.now()
      }));
    }
  } catch {}

  const items = [];
  const lines = trimmed.split("\n");
  let pendingNotes = [];
  lines.forEach((line, idx) => {
    const l = line.trim();
    if (!l) return;
    if (l.startsWith("#")) {
      pendingNotes.push(l.slice(1).trim());
      return;
    }
    const eqIdx = l.indexOf("=");
    if (eqIdx !== -1) {
      let k = l.slice(0, eqIdx).trim().replace(/^export\s+/, "");
      let v = l.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      items.push({
        id: "v-" + Math.random().toString(36).slice(2, 8) + "-" + idx,
        key: k,
        value: v,
        category: guessCategory(k),
        notes: pendingNotes.join("; "),
        expiry: "",
        created: Date.now(),
        updated: Date.now()
      });
      pendingNotes = [];
    } else {
      items.push({
        id: "v-" + Math.random().toString(36).slice(2, 8) + "-" + idx,
        key: "ENTRY_" + (items.length + 1),
        value: l,
        category: "Notes",
        notes: pendingNotes.join("; "),
        expiry: "",
        created: Date.now(),
        updated: Date.now()
      });
      pendingNotes = [];
    }
  });
  return items;
}

function guessCategory(key) {
  const k = key.toUpperCase();
  if (k.includes("KEY") || k.includes("TOKEN") || k.includes("SECRET")) return "API Key";
  if (k.includes("DB") || k.includes("POSTGRES") || k.includes("MONGO") || k.includes("REDIS") || k.includes("SQL")) return "Database";
  if (k.includes("PASS") || k.includes("PWD") || k.includes("AUTH") || k.includes("JWT")) return "Auth";
  if (k.includes("HOST") || k.includes("PORT") || k.includes("URL") || k.includes("SERVER") || k.includes("SSH")) return "Server";
  return "Other";
}

function itemsToEnv(items) {
  return (items || []).map(i => {
    let out = "";
    if (i.notes) out += `# ${i.notes}\n`;
    const val = i.value.includes(" ") || i.value.includes("\n") ? `"${i.value.replace(/"/g, '\\"')}"` : i.value;
    out += `${i.key}=${val}`;
    return out;
  }).join("\n");
}

function itemsToJson(items) {
  const obj = {};
  (items || []).forEach(i => obj[i.key] = i.value);
  return JSON.stringify(obj, null, 2);
}

async function saveVaultNow(customItems = null) {
  if (customItems) vaultUnlocked = customItems;
  if (!vaultSessionPass) {
    const p = prompt("Re-enter master passphrase to encrypt and save:");
    if (!p) return false;
    vaultSessionPass = p;
  }
  try {
    const plaintext = JSON.stringify(vaultUnlocked, null, 2);
    cfg.vault = await vaultEncrypt(vaultSessionPass, plaintext);
    cfg.vaultExpiry = {};
    (vaultUnlocked || []).forEach(item => {
      if (item.expiry) cfg.vaultExpiry[item.key] = item.expiry;
    });
    save();
    resetIdleTimer();
    return true;
  } catch (e) {
    toast("save failed: " + e.message);
    return false;
  }
}

function openVault() {
  if (vaultUnlocked) return renderVaultContents();
  const has = !!cfg.vault;
  openModal("Secrets Vault", `
    <p class="hint-text">
      Zero-knowledge AES-256-GCM encryption with PBKDF2 key derivation (200k iterations).
      Auto-locks after ${cfg.vaultAutoLockMin !== undefined ? cfg.vaultAutoLockMin : 10} min idle.
    </p>
    <div class="field">
      <label>Master Passphrase</label>
      <input type="password" id="vaultPass" placeholder="Enter master passphrase" autocomplete="current-password"/>
    </div>
    ${has ? `
      <div class="row"><button id="vaultUnlock">Unlock Vault</button></div>` : `
      <div class="field">
        <label>Initial Secrets (Paste .env, JSON, or leave blank)</label>
        <textarea id="vaultInit" rows="6" placeholder="GITHUB_TOKEN=ghp_...\\nOPENAI_API_KEY=sk-..."></textarea>
      </div>
      <div class="row">
        <button id="vaultCreate">Create New Vault</button>
      </div>`}
    <div class="out" id="vaultOut"></div>
  `);
  const $pass = document.getElementById("vaultPass");
  const $out = document.getElementById("vaultOut");

  if (has) {
    const doUnlock = async () => {
      const p = $pass.value;
      if (!p) return;
      try {
        $out.classList.remove("err");
        $out.textContent = "decrypting…";
        const pt = await vaultDecrypt(p, cfg.vault);
        vaultSessionPass = p;
        vaultUnlocked = parseVaultPayload(pt);
        const badge = document.getElementById("vaultBadge");
        if (badge) {
          badge.style.display = "";
          badge.title = "Vault unlocked — click to open";
          badge.style.cursor = "pointer";
          badge.onclick = () => openVault();
        }
        resetIdleTimer();
        renderVaultContents();
        toast("vault unlocked 🔓");
      } catch {
        $out.classList.add("err");
        $out.textContent = "✗ incorrect passphrase or corrupted data";
      }
    };
    document.getElementById("vaultUnlock").onclick = doUnlock;
    $pass.addEventListener("keydown", (e) => { if (e.key === "Enter") doUnlock(); });
  } else {
    document.getElementById("vaultCreate").onclick = async () => {
      const pass = $pass.value;
      const plain = document.getElementById("vaultInit").value;
      if (!pass || pass.length < 12) { toast("passphrase must be at least 12 characters"); return; }
      try {
        vaultSessionPass = pass;
        vaultUnlocked = parseVaultPayload(plain);
        cfg.vault = await vaultEncrypt(pass, JSON.stringify(vaultUnlocked, null, 2));
        save();
        const badge = document.getElementById("vaultBadge");
        if (badge) {
          badge.style.display = "";
          badge.title = "Vault unlocked — click to open";
          badge.style.cursor = "pointer";
          badge.onclick = () => openVault();
        }
        resetIdleTimer();
        renderVaultContents();
        toast("vault created and unlocked 🔓");
      } catch (e) {
        $out.classList.add("err");
        $out.textContent = "✗ " + e.message;
      }
    };
  }
  $pass.focus();
}

function renderVaultContents(activeTab = "list") {
  vaultActiveTab = activeTab;
  const items = Array.isArray(vaultUnlocked) ? vaultUnlocked : [];
  const categories = ["all", "API Key", "Database", "Auth", "Server", "Notes", "Other"];

  const now = Date.now();
  let expCount = 0;
  items.forEach(i => {
    if (i.expiry) {
      const diff = new Date(i.expiry + "T23:59:59").getTime() - now;
      if (diff < 7 * 86400000) expCount++;
    }
  });

  openModal("Secrets Vault 🔒", `
    <div class="tabs" style="margin-bottom:14px">
      <button class="tb ${vaultActiveTab==='list'?'active':''}" id="vTabList">🔑 Secrets (${items.length})</button>
      <button class="tb ${vaultActiveTab==='raw'?'active':''}" id="vTabRaw">📝 Raw / .env Editor</button>
      <button class="tb ${vaultActiveTab==='settings'?'active':''}" id="vTabSettings">⚙️ Settings</button>
    </div>
    <div id="vaultTabContent"></div>
  `, true);

  const container = document.getElementById("vaultTabContent");

  document.getElementById("vTabList").onclick = () => renderVaultContents("list");
  document.getElementById("vTabRaw").onclick = () => renderVaultContents("raw");
  document.getElementById("vTabSettings").onclick = () => renderVaultContents("settings");

  if (vaultActiveTab === "list") {
    let filtered = items;
    if (vaultCatFilter !== "all") {
      filtered = filtered.filter(i => (i.category || "Other").toLowerCase() === vaultCatFilter.toLowerCase());
    }
    if (vaultSearchQuery) {
      const q = vaultSearchQuery.toLowerCase();
      filtered = filtered.filter(i => i.key.toLowerCase().includes(q) || i.value.toLowerCase().includes(q) || (i.notes||"").toLowerCase().includes(q) || (i.category||"").toLowerCase().includes(q));
    }

    container.innerHTML = `
      <div class="vault-toolbar">
        <input type="text" class="vault-search" id="vaultSearch" placeholder="Search secrets (by key, tag, or notes)…" value="${escapeHtml(vaultSearchQuery)}"/>
        <button class="primary" id="vaultAddBtn">+ Add Secret</button>
      </div>
      <div class="vault-cat-row">
        ${categories.map(c => `<button class="vault-cat-btn ${c===vaultCatFilter?'active':''}" data-cat="${c}">${c === "all" ? "All (" + items.length + ")" : c}</button>`).join("")}
      </div>
      ${expCount > 0 ? `<div style="color:var(--yellow);font-size:12px;margin-bottom:10px">⚠ ${expCount} secret(s) expiring within 7 days or expired</div>` : ""}
      <div class="vault-list" id="vaultList">
        ${filtered.length ? filtered.map(item => {
          const isRevealed = revealedVaultIds.has(item.id);
          let expBadge = "";
          if (item.expiry) {
            const expTime = new Date(item.expiry + "T23:59:59").getTime();
            const daysLeft = Math.ceil((expTime - now) / 86400000);
            if (daysLeft < 0) expBadge = `<span class="vault-badge expired">expired</span>`;
            else if (daysLeft <= 7) expBadge = `<span class="vault-badge exp-soon">exp: ${daysLeft}d</span>`;
            else expBadge = `<span class="vault-badge">exp: ${item.expiry}</span>`;
          }
          return `
            <div class="vault-item" data-id="${item.id}">
              <div class="vault-item-head">
                <div class="vault-item-key">
                  <span>${escapeHtml(item.key)}</span>
                  <span class="vault-badge">${escapeHtml(item.category || "Secret")}</span>
                  ${expBadge}
                </div>
                <div class="vault-item-actions">
                  <button class="v-copy" data-id="${item.id}" title="Copy secret">📋 copy</button>
                  <button class="v-toggle" data-id="${item.id}" title="${isRevealed ? "Mask secret" : "Reveal secret"}">${isRevealed ? "🙈 hide" : "👁️ reveal"}</button>
                  <button class="v-edit" data-id="${item.id}" title="Edit secret">✏️ edit</button>
                  <button class="v-del del" data-id="${item.id}" title="Delete secret">✕</button>
                </div>
              </div>
              <div class="vault-item-val-wrap">
                <div class="vault-item-val ${isRevealed ? "revealed" : ""}">${escapeHtml(isRevealed ? item.value : "••••••••••••••••")}</div>
              </div>
              ${item.notes ? `<div class="vault-item-meta"><span>${escapeHtml(item.notes)}</span></div>` : ""}
            </div>`;
        }).join("") : `<div class="empty" style="padding:24px 0">${items.length ? "No secrets match your filter" : "No secrets stored yet — click '+ Add Secret' above"}</div>`}
      </div>
      <div class="vault-stat-bar">
        <span>AES-256-GCM · ${items.length} secret(s) stored</span>
        <button class="btn ghost" id="vaultLockBtn" style="padding:4px 10px;font-size:11.5px">🔒 Lock Vault Now</button>
      </div>
    `;

    const searchInp = document.getElementById("vaultSearch");
    searchInp.oninput = (e) => {
      vaultSearchQuery = e.target.value.trim();
      renderVaultContents("list");
      const el = document.getElementById("vaultSearch");
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    };

    document.querySelectorAll(".vault-cat-btn").forEach(btn => {
      btn.onclick = () => {
        vaultCatFilter = btn.dataset.cat;
        renderVaultContents("list");
      };
    });

    document.getElementById("vaultAddBtn").onclick = () => openVaultSecretModal();
    document.getElementById("vaultLockBtn").onclick = () => { lockVault(); toast("vault locked 🔒"); };

    document.querySelectorAll(".v-copy").forEach(b => {
      b.onclick = async () => {
        const item = items.find(x => x.id === b.dataset.id);
        if (item) {
          try {
            await navigator.clipboard.writeText(item.value);
            pushClip("••••••••", `vault: ${item.key}`);
            toast(`copied: ${item.key}`);
          } catch { toast("copy failed"); }
        }
      };
    });

    document.querySelectorAll(".v-toggle").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (revealedVaultIds.has(id)) revealedVaultIds.delete(id);
        else revealedVaultIds.add(id);
        renderVaultContents("list");
      };
    });

    document.querySelectorAll(".v-edit").forEach(b => {
      b.onclick = () => {
        const item = items.find(x => x.id === b.dataset.id);
        if (item) openVaultSecretModal(item);
      };
    });

    document.querySelectorAll(".v-del").forEach(b => {
      b.onclick = async () => {
        const item = items.find(x => x.id === b.dataset.id);
        if (!item || !confirm(`Delete secret '${item.key}'?`)) return;
        vaultUnlocked = items.filter(x => x.id !== b.dataset.id);
        await saveVaultNow();
        renderVaultContents("list");
        toast(`deleted: ${item.key}`);
      };
    });

  } else if (vaultActiveTab === "raw") {
    let rawFormat = "env";
    const renderRawContent = () => {
      const text = rawFormat === "env" ? itemsToEnv(items) : itemsToJson(items);
      container.innerHTML = `
        <div class="row" style="margin-bottom:10px;justify-content:space-between;align-items:center">
          <div class="row" style="gap:6px">
            <button class="${rawFormat==='env'?'':'ghost'}" id="rawEnvBtn">.env Format</button>
            <button class="${rawFormat==='json'?'':'ghost'}" id="rawJsonBtn">JSON Format</button>
          </div>
          <span style="font-size:11.5px;color:var(--dim)">Direct batch editor</span>
        </div>
        <div class="field">
          <textarea id="vaultRawText" rows="14" spellcheck="false" style="font-family:var(--mono);font-size:12.5px">${escapeHtml(text)}</textarea>
        </div>
        <div class="row">
          <button id="vaultSaveRaw">Apply &amp; Encrypt</button>
          <button id="vaultCopyRaw" class="ghost">Copy Plaintext</button>
          <button id="vaultBackList" class="ghost">Back to List</button>
        </div>
      `;

      document.getElementById("rawEnvBtn").onclick = () => { rawFormat = "env"; renderRawContent(); };
      document.getElementById("rawJsonBtn").onclick = () => { rawFormat = "json"; renderRawContent(); };
      document.getElementById("vaultBackList").onclick = () => renderVaultContents("list");
      document.getElementById("vaultCopyRaw").onclick = () => {
        const t = document.getElementById("vaultRawText").value;
        navigator.clipboard.writeText(t);
        pushClip("••••••••", "vault batch copy");
        toast("copied to clipboard");
      };
      document.getElementById("vaultSaveRaw").onclick = async () => {
        const text = document.getElementById("vaultRawText").value;
        vaultUnlocked = parseVaultPayload(text);
        const ok = await saveVaultNow();
        if (ok) {
          toast("vault saved & encrypted ✓");
          renderVaultContents("list");
        }
      };
    };
    renderRawContent();

  } else if (vaultActiveTab === "settings") {
    container.innerHTML = `
      <div class="field">
        <label>Change Master Passphrase</label>
        <p class="hint-text">Re-encrypts all vault secrets with a new master passphrase.</p>
        <div class="row" style="gap:8px;margin-bottom:8px">
          <input type="password" id="vNewPass" placeholder="New passphrase" style="flex:1"/>
          <button class="ghost" id="vGenPass">🎲 Generate</button>
        </div>
        <input type="password" id="vNewPassConf" placeholder="Confirm new passphrase" style="margin-bottom:8px"/>
        <button id="vSavePassBtn">Update Passphrase</button>
      </div>

      <div class="field" style="margin-top:18px">
        <label>Auto-Lock Idle Timeout</label>
        <select id="vAutoLockSelect">
          <option value="1" ${cfg.vaultAutoLockMin===1?'selected':''}>1 minute</option>
          <option value="5" ${cfg.vaultAutoLockMin===5?'selected':''}>5 minutes</option>
          <option value="10" ${cfg.vaultAutoLockMin===10?'selected':''}>10 minutes</option>
          <option value="30" ${cfg.vaultAutoLockMin===30?'selected':''}>30 minutes</option>
          <option value="60" ${cfg.vaultAutoLockMin===60?'selected':''}>60 minutes</option>
          <option value="0" ${cfg.vaultAutoLockMin===0?'selected':''}>Never (keep unlocked during session)</option>
        </select>
      </div>

      <div class="field" style="margin-top:18px">
        <label>Encrypted Backup &amp; Portability</label>
        <p class="hint-text">Export an encrypted copy of your vault. Safe to store anywhere because secrets remain AES-encrypted.</p>
        <div class="row">
          <button id="vExportEnc" class="ghost">⬇ Export Encrypted Vault</button>
          <button id="vImportEnc" class="ghost">⬆ Import Encrypted Vault</button>
        </div>
      </div>

      <div class="field" style="margin-top:18px;border-top:1px solid var(--border);padding-top:14px">
        <label style="color:var(--red)">Danger Zone</label>
        <div class="row" style="margin-top:8px">
          <button id="vDestroy" class="ghost" style="color:var(--red);border-color:var(--red)">Delete Entire Vault</button>
        </div>
      </div>
    `;

    document.getElementById("vGenPass").onclick = () => {
      const words = ["cosmic","vector","hyper","shield","quantum","pulse","zenith","orbital","fusion","glacier","matrix","cipher"];
      const bytes = new Uint32Array(4);
      crypto.getRandomValues(bytes);
      const pass = [words[bytes[0]%words.length], words[bytes[1]%words.length], words[bytes[2]%words.length], words[bytes[3]%words.length], Math.floor(100+Math.random()*900)].join("-");
      document.getElementById("vNewPass").value = pass;
      document.getElementById("vNewPassConf").value = pass;
      toast("generated strong passphrase");
    };

    document.getElementById("vSavePassBtn").onclick = async () => {
      const np = document.getElementById("vNewPass").value;
      const npc = document.getElementById("vNewPassConf").value;
      if (!np || np.length < 4) { toast("passphrase must be at least 4 characters"); return; }
      if (np !== npc) { toast("passphrases do not match"); return; }
      vaultSessionPass = np;
      const ok = await saveVaultNow();
      if (ok) {
        toast("master passphrase updated ✓");
        document.getElementById("vNewPass").value = "";
        document.getElementById("vNewPassConf").value = "";
      }
    };

    document.getElementById("vAutoLockSelect").onchange = (e) => {
      cfg.vaultAutoLockMin = parseInt(e.target.value);
      save();
      resetIdleTimer();
      toast(`auto-lock set to ${cfg.vaultAutoLockMin === 0 ? "never" : cfg.vaultAutoLockMin + " min"}`);
    };

    document.getElementById("vExportEnc").onclick = () => {
      if (!cfg.vault) { toast("vault is empty"); return; }
      const backup = {
        app: "startpage-secrets-vault",
        version: 1,
        exportedAt: new Date().toISOString(),
        vault: cfg.vault,
        vaultExpiry: cfg.vaultExpiry || {}
      };
      downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), "vault-backup.enc.json");
      toast("encrypted vault exported");
    };

    document.getElementById("vImportEnc").onclick = () => {
      pickFile(text => {
        try {
          const parsed = JSON.parse(text);
          if (parsed.vault && parsed.vault.ct) {
            cfg.vault = parsed.vault;
            if (parsed.vaultExpiry) cfg.vaultExpiry = parsed.vaultExpiry;
            save();
            lockVault();
            toast("encrypted vault imported — unlock with its passphrase");
            openVault();
          } else {
            toast("invalid vault backup file");
          }
        } catch (e) { toast("import failed: " + e.message); }
      });
    };

    document.getElementById("vDestroy").onclick = () => {
      if (!confirm("Are you sure you want to completely delete the Secrets Vault? All stored credentials will be erased.")) return;
      cfg.vault = null;
      cfg.vaultExpiry = {};
      save();
      lockVault();
      closeModal();
      toast("vault deleted");
    };
  }
}

function openVaultSecretModal(existingItem = null) {
  const isEdit = !!existingItem;
  const categories = ["API Key", "Token", "Database", "Auth", "Server", "Notes", "Other"];
  openModal(isEdit ? `Edit Secret: ${existingItem.key}` : "Add Secret to Vault", `
    <div class="field">
      <label>Secret Name / Key</label>
      <input type="text" id="vEditKey" value="${escapeHtml(existingItem?.key || '')}" placeholder="OPENAI_API_KEY or DB_PASSWORD" style="font-family:var(--mono)"/>
    </div>
    <div class="field">
      <div class="wrow" style="display:flex;justify-content:space-between;align-items:center">
        <label>Secret Value</label>
        <button class="btn ghost" id="vGenToken" style="padding:2px 6px;font-size:11px">🎲 Generate Key</button>
      </div>
      <textarea id="vEditVal" rows="4" placeholder="Paste secret or token value here" style="font-family:var(--mono);font-size:12.5px">${escapeHtml(existingItem?.value || '')}</textarea>
    </div>
    <div class="grid cols-2" style="gap:10px;margin-bottom:14px">
      <div>
        <label>Category</label>
        <select id="vEditCat">
          ${categories.map(c => `<option ${existingItem?.category===c?'selected':''}>${c}</option>`).join("")}
        </select>
      </div>
      <div>
        <label>Expiry Date (Optional)</label>
        <input type="date" id="vEditExp" value="${existingItem?.expiry || ''}"/>
      </div>
    </div>
    <div class="field">
      <label>Notes / Description (Optional)</label>
      <input type="text" id="vEditNotes" value="${escapeHtml(existingItem?.notes || '')}" placeholder="Production read-only token, staging db credentials, etc."/>
    </div>
    <div class="row">
      <button id="vSaveSecret">${isEdit ? "Save Changes" : "Add Secret"}</button>
      <button id="vCancelSecret" class="ghost">Cancel</button>
    </div>
  `);

  document.getElementById("vGenToken").onclick = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    document.getElementById("vEditVal").value = token;
    toast("generated 48-char hex secret");
  };

  document.getElementById("vCancelSecret").onclick = () => renderVaultContents("list");

  document.getElementById("vSaveSecret").onclick = async () => {
    const key = document.getElementById("vEditKey").value.trim().replace(/\s+/g, "_");
    const val = document.getElementById("vEditVal").value;
    const cat = document.getElementById("vEditCat").value;
    const exp = document.getElementById("vEditExp").value;
    const notes = document.getElementById("vEditNotes").value.trim();

    if (!key) { toast("key name is required"); return; }

    const items = Array.isArray(vaultUnlocked) ? vaultUnlocked : [];
    if (isEdit) {
      const idx = items.findIndex(x => x.id === existingItem.id);
      if (idx !== -1) {
        items[idx] = { ...items[idx], key, value: val, category: cat, expiry: exp, notes, updated: Date.now() };
      }
    } else {
      items.unshift({
        id: "v-" + Math.random().toString(36).slice(2, 8),
        key,
        value: val,
        category: cat,
        expiry: exp,
        notes,
        created: Date.now(),
        updated: Date.now()
      });
    }

    vaultUnlocked = items;
    const ok = await saveVaultNow();
    if (ok) {
      toast(isEdit ? `updated ${key} ✓` : `added ${key} ✓`);
      renderVaultContents("list");
    }
  };
  document.getElementById("vEditKey").focus();
}

document.getElementById("btnVault").onclick = openVault;

/* ============================================================
   PWA
   ============================================================ */
if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ============================================================
   STORAGE CONFLICT
   ============================================================ */
window.addEventListener("storage", (e) => {
  if (e.key !== LS_KEY) return;
  toast("config changed in another tab", { label: "reload", run: () => location.reload() });
});

/* ============================================================
   SUMMON PAD
   ============================================================ */
function summonPad() {
  const area = document.getElementById("padArea");
  area.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => area.focus(), 200);
}

/* ============================================================
   KEYBOARD
   ============================================================ */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal.classList.contains("open")) { closeModal(); return; }
    if (paletteBackdrop.classList.contains("open")) { closePalette(); return; }
  }
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  const k = e.key.toLowerCase();
  if (k === "p" && !e.shiftKey) { e.preventDefault(); openPalette(); return; }
  if (k === "k") { e.preventDefault(); if (!modal.classList.contains("open")) { omni.focus(); omni.select(); } return; }
  if (k === "s" && e.shiftKey) { e.preventDefault(); summonPad(); return; }
  const inInput = ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName);
  if (inInput) return;
  if (k === "j") { e.preventDefault(); openTool("json"); }
  if (k === "b") { e.preventDefault(); openTool("b64"); }
  if (k === "u") { e.preventDefault(); openTool("jwt"); }
  if (k === "t") { e.preventDefault(); openTool("ts"); }
  if (k === "r") { e.preventDefault(); openTool("regex"); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName) && !modal.classList.contains("open")) {
    e.preventDefault(); snipFilterEl.focus();
  }
});

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

/* ============================================================
   INIT
   ============================================================ */
applyTheme();
renderProfileSwitch();
renderEngineSwitch();
renderPorts();
renderInfra();
renderPad();
renderSnipTags();
renderSnippets();
renderBangHint();
renderPlugins();
renderWidgets();
checkBackupNudge();
checkGoogleAuthRedirect();

if (cfg.firstRun) {
  setTimeout(() => {
    toast("press ⌘P to see everything", { label: "got it", run: () => {} });
    cfg.firstRun = false; save();
  }, 800);
}