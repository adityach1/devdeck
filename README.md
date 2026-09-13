# 🚀 DevDeck

> A fast, privacy-focused, zero-dependency developer startpage and flight deck designed for daily productivity. Fully responsive, offline-ready (PWA), and packed with built-in developer tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension%20MV3-4285F4?logo=googlechrome&logoColor=white)](manifest.json)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](manifest.webmanifest)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow.svg)](index.html)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success.svg)](index.html)

---

## 📑 Table of Contents

- [Features](#-features)
- [Power Omnibar & Search](#-power-omnibar--search)
  - [Search Engine Selectors](#search-engine-selectors)
  - [Bangs (!bang)](#bangs-bang)
  - [Inline Utilities & Math](#inline-utilities--math)
- [Widgets System](#-widgets-system)
  - [Default Widgets](#default-widgets)
  - [Available Widget Gallery](#available-widget-gallery)
- [Developer Tool Suite](#-developer-tool-suite)
- [Encrypted Secrets Vault](#-encrypted-secrets-vault)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Customization](#-customization)
- [Project Structure](#-project-structure)
- [Chrome Extension Installation](#-chrome-extension-installation)
- [Cloudflare Pages Deployment](#-cloudflare-pages-deployment)
- [Local Development](#-local-development)
- [Browser New Tab Setup](#-browser-new-tab-setup)
- [Privacy & Security](#-privacy--security)
- [License](#-license)

---

## ✨ Features

- ⚡ **Zero External Dependencies** — Single-file architecture powered exclusively by native Web APIs and Web Crypto.
- 📱 **Fully Responsive Viewport** — Fills 90%–95% of screen width comfortably across ultrawide displays, laptops, tablets, and smartphones.
- 🔍 **Power Omnibar** — Multi-engine search switching, 20+ direct bang shortcuts, safe math evaluation, unit/currency conversions, and quick dev commands.
- 🎛️ **Modular Widget Dashboard** — Live weather (New Delhi), clock, speed dial bookmarks, browser & system diagnostics, crypto tickers, RSS, countdowns, and Pomodoro focus timers.
- 🏠 **Google Home & Smart Device Manager** — Interactive smart lights, plugs, thermostats, locks, and speakers control with one-click routines, webhook dispatch, and direct Google Home Web integration.
- 🔐 **Encrypted Secrets Vault** — Client-side AES-256-GCM + PBKDF2 encrypted secret store & `.env` manager with memory session caching and auto-lock.
- 🛠️ **Developer Toolbox** — DNS over HTTPS (DoH), cURL builder, Cron parser & upcoming runs calculator, Cryptographic Keygen, Base64, Hashes, JWT inspector, JSON formatter, and regex tester.
- 📝 **Scratchpad & Notes** — Multi-buffer notes manager with live split Markdown preview and interactive checklists.
- 🌐 **REST API Tester** — In-browser HTTP client with header management, status code badges, response timing, and history.
- 🎨 **Deep Customization** — 10 accent themes, light/dark mode, and Unsplash or custom wallpapers with brightness and blur sliders.
- 📴 **Offline PWA Support** — Service Worker caching allows instant loading even without an active internet connection.

---

## 🔍 Power Omnibar & Search

Press `/` or `Space` from anywhere to focus the Omnibar.

### Search Engine Selectors

Prefix your query with `?<engine>` to search with a specific engine:

| Prefix | Engine | Query Example |
| :--- | :--- | :--- |
| `?d` | **DuckDuckGo** | `?d rust async book` |
| `?g` | **Google** | `?g web components standard` |
| `?b` | **Bing** | `?b typescript 5 features` |
| `?br` | **Brave Search** | `?br tailwindcss documentation` |
| `?k` | **Kagi** | `?k fast api python` |
| `?c` | **ChatGPT** | `?c explain closures in js` |
| `?cl` | **Claude** | `?cl refactor this python function` |
| `?gem` | **Gemini** | `?gem compare sql vs nosql` |
| `?p` | **Perplexity** | `?p latest nodejs release notes` |

### Bangs (`!bang`)

Jump directly to developer hubs and documentation:

| Bang | Destination | Bang | Destination |
| :--- | :--- | :--- | :--- |
| `!gh <q>` | GitHub Search | `!npm <q>` | npm package registry |
| `!ghr <user/repo>` | Direct GitHub Repo | `!pypi <q>` | PyPI Python Packages |
| `!mdn <q>` | MDN Web Docs | `!crates <q>` | Rust Crates.io |
| `!so <q>` | StackOverflow | `!devdocs <q>` | DevDocs API Reference |
| `!caniuse <q>` | Can I Use Browser Support | `!docker <q>` | Docker Hub Images |
| `!w <q>` | Wikipedia | `!yt <q>` | YouTube |
| `!hn <q>` | Hacker News (Algolia) | `!r <q>` | Reddit Search |
| `!arxiv <q>` | arXiv Scientific Papers | `!maps <q>` | Google Maps |
| `!ghome` | Google Home Web (`home.google.com`) | | |

### Inline Utilities & Math

Type formulas and quick commands directly into the Omnibar:

- **Safe Math & Conversions:**
  - `42 * 1024` → Calculates result with 1-click copy
  - `sqrt(256) + 10` → Math evaluation via safe recursive-descent parser (zero `eval`)
  - `100 USD in EUR` or `50 kg in lbs` → Instant unit & currency conversions
- **Developer Quick Commands:**
  - `dns google.com` → Instant DoH DNS lookup (Cloudflare / Google)
  - `b64 hello world` → Base64 encoder/decoder
  - `hash mypassword` → Generates SHA-256 digest
  - `keygen 32` → Generates cryptographically secure token/key
  - `uuid` → Generates RFC-compliant UUID v4
  - `ts` or `ts 1700000000` → Epoch timestamp converter
  - `cron 0 12 * * *` → Cron expression parser & next runs
  - `curl https://api.github.com` → cURL test runner
  - `v <key>` or `vault <query>` → Search & copy decrypted vault secret (when unlocked)

---

## 🎛️ Widgets System

The widget dashboard automatically organizes your view with zero configuration. Click the **`＋` Add Widget** button in the dashboard header to add any of the **14 modular widgets**:

| Widget | Description | Capabilities |
| :--- | :--- | :--- |
| **🕐 Clock** | Precision digital, hybrid, or analog clock. | HH:MM:SS, full date, day of year, ISO week, day progress % bar, timezone chip, epoch chip, ISO 8601 chip. Click any element to copy. |
| **☀️ Weather** | Enriched telemetry via Open-Meteo (zero API keys). | Current temp with 1-click `°C`/`°F` toggle, daytime/nighttime icon awareness (`is_day`), feels-like temp, rain %, humidity, wind (km/h vs mph), UV index & risk tier, pressure, sunrise/sunset, 3-day forecast strip, city geocoding search & 📍 auto-detect. |
| **🌍 World Clock** | Multi-timezone live display. | Side-by-side time comparison via `City=IANA_Zone` configuration. |
| **🐙 GitHub Activity** | Recent pushes, repositories, and follower stats. | Displays public repos, followers, and 4 most recent commits with repo links. Optional PAT support for 5,000 req/hr. |
| **₿ Crypto Prices** | Live CoinGecko price tickers. | Live crypto prices (BTC, ETH, SOL, etc.) in USD, EUR, INR, GBP, or JPY with 24h change indicators. |
| **📰 Hacker News** | Real-time feed of top stories. | Top articles with score, comment count, and direct outbound links. |
| **📡 RSS Feed** | Custom RSS & Atom feed reader. | Follow any public feed (blogs, GitHub releases, news) via CORS proxy. |
| **⏳ Countdown** | Milestone & release countdown timer. | Days and hours until upcoming deadlines (`Label=YYYY-MM-DD`). |
| **💻 Browser Info** | System diagnostics. | OS, browser version, screen dimensions, inner viewport, DPR, and connection status. |
| **🍅 Pomodoro Focus** | Focus & break interval timer. | 25/5 interval timer with audio notification chime powered by shared AudioContext. |
| **⭐ Speed Dial** | Visual bookmark tiles. | Bookmarks grid with automatic high-resolution favicon resolution and fallback initials. |
| **🍿 Entertainment** | Media & streaming speed dial. | Direct one-click access to Netflix, Amazon Prime Video, JioHotstar, YouTube, Bilibili, and Dailymotion. |
| **📝 Quick Notes** | Persistent sticky note. | Mini note area saved independently from the main scratchpad. |
| **🔌 JSON Endpoint** | REST API field extraction. | Periodic polling of any JSON API with dot-notation field display. |

---

## 🛠️ Developer Tool Suite

Access the comprehensive developer suite from the Quick Tools card, Command Palette (`⌘P`), or direct hotkeys:

1. **JSON Formatter & Validator (`⌘J`)** — Format, minify, repair, and validate JSON payloads with syntax error detection.
2. **Base64 Encoder / Decoder (`⌘B`)** — Two-way UTF-8 text encoding and decoding with automatic direction detection.
3. **JWT Token Inspector (`⌘U`)** — Decode headers, payload claims, and expiration dates without network transmission.
4. **Unix Timestamp Converter (`⌘T`)** — Convert timestamps (seconds / ms) to human date-time across all IANA timezones and vice-versa.
5. **Regex Pattern Tester (`⌘R`)** — Real-time regular expression matching with capture group highlighting and flag toggles.
6. **UUID Generator** — Generate single or bulk RFC 4122 v4 UUIDs with 1-click clipboard copying.
7. **Hash & Checksum Generator** — Compute MD5, SHA-1, SHA-256, SHA-384, and SHA-512 digests via Web Crypto.
8. **URL Encoder & Decoder** — Percent-encode and decode URI strings and query parameters.
9. **Color Palette & Unit Converter** — Convert HEX, RGB, and HSL color spaces with live swatch and picker.
10. **cURL Converter** — Construct cURL requests and convert them to JavaScript Fetch or Python Requests snippets.
11. **Cron Expression Explainer** — Human-readable cron schedule descriptions and upcoming execution timestamps.
12. **DNS over HTTPS (DoH) Lookup** — Query `A`, `AAAA`, `MX`, `TXT`, `CNAME`, `NS` records via Cloudflare (`1.1.1.1`) or Google (`8.8.8.8`).
13. **Cryptographic Keygen** — Generate RSA 2048/4096-bit key pairs (PEM), ECDSA keys, AES-256 keys, and high-entropy random tokens.
14. **REST API Client** — Full HTTP request runner with custom headers, query params, body editors, response headers, and timing.
15. **Google Home & Smart Devices** — Control smart lights, plugs, thermostats, and locks; adjust brightness; trigger routines; and dispatch webhooks.
16. **More Tools (JSON ↔ YAML)** — Bi-directional conversion between JSON and YAML data structures.

---

## 📖 In-App User Guide & Manual

DevDeck includes a rich, searchable **User Guide & Manual** right inside the app:
- Click the **📖** icon in the header actions
- Click **guide** in the footer
- Click **Guide** in the Quick Tools grid
- Press <kbd>?</kbd> or <kbd>F1</kbd> from anywhere on the page
- Open Command Palette (<kbd>⌘P</kbd>) → select **DevDeck Documentation & Feature Manual**

Features 9 interactive tabs covering the Omnibar, all 14 widgets, 16 quick tools, scratchpad & snippets, ports & infra, vault security, themes & profiles, and a complete keyboard shortcuts cheatsheet.

---

## 🔐 Encrypted Secrets Vault

DevDeck includes a zero-knowledge developer secrets vault:

- **Encryption Standard:** `AES-256-GCM` with key derivation using `PBKDF2-SHA256` (**600,000 iterations**, complying with OWASP & NIST 2023 guidelines) and cryptographically random salt/IV.
- **Memory-Only Session:** Passphrase is kept in runtime memory only while unlocked. Plaintext secrets are never stored to `localStorage` unencrypted.
- **Structured Manager & Raw Editor:** Manage items with category tags (`API Key`, `Database`, `Auth`, `Server`, `Notes`), expiry dates, and notes, or switch to the raw `.env` / JSON editor.
- **Auto-Lock Timer:** Configurable inactivity lock (`1m`, `5m`, `10m`, `30m`, `60m`, `Never`).
- **Encrypted Backup:** Export and import encrypted `.enc.json` backups between devices.
- **Omnibar Integration:** When unlocked, search and copy secrets directly from the Omnibar using `v <query>`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
| :--- | :--- | :--- |
| `⌘P` / `Ctrl+P` | Global | Open Command Palette |
| `⌘K` / `Ctrl+K` | Global | Focus Power Omnibar search box |
| `?` or `F1` | Global | Open In-App User Guide & Manual |
| `⌘⇧S` / `Ctrl+Shift+S` | Global | Summon & focus Scratchpad buffer |
| `/` | Global (not in input) | Focus Snippets fuzzy search filter |
| `Esc` | Global | Close open modal, dialog, or palette |
| `⌘J` | Global | Open JSON Formatter & Validator |
| `⌘B` | Global | Open Base64 Encoder / Decoder |
| `⌘U` | Global | Open JWT Token Inspector |
| `⌘T` | Global | Open Unix Timestamp Parser |
| `⌘R` | Global | Open Regex Pattern Tester |
| Click Time | Clock Widget | Copy current time to clipboard |
| Click Date | Clock Widget | Copy full calendar date to clipboard |
| Click Epoch | Clock Widget | Copy Unix epoch timestamp to clipboard |
| Click Unit | Weather Widget | Toggle temperature between °C and °F |

---

## 🎨 Customization

Click the **⚙️ Settings** icon in the header or press `Alt + C`:

- **Theme Mode:** Dark mode, Light mode, or follow System OS preference.
- **Accent Colors:** Cyber Blue, Emerald, Amber, Purple, Rose, Cyan, Orange, Pink, Teal, or Indigo.
- **Custom Wallpapers:**
  - Dynamic Unsplash curated backgrounds (Minimal, Technology, Architecture, Dark, Nature, Space).
  - Custom image URLs.
  - Local image file uploads (stored locally via `IndexedDB`/`Blob`).
  - Wallpaper Blur (`0px` to `20px`) and Brightness (`20%` to `100%`) adjustment sliders.
- **Profiles:** Create separate profiles for `Work`, `Personal`, or `Dev` with isolated bookmarks, widgets, and scratchpads.
- **Backup & Restore:** Full JSON export and import of all startpage preferences and configs.

---

## 📁 Project Structure

```text
devdeck/
├── css/
│   └── style.css            # Responsive layout, animations, and theme styles
├── js/
│   ├── app.js               # Application core, widgets, tools, and vault logic
│   └── background.js        # Extension background service worker
├── icons/
│   ├── icon.svg             # Master vector brand logo
│   ├── icon-16.png          # 16x16 icon (favicon & toolbar)
│   ├── icon-32.png          # 32x32 icon (Retina & taskbar)
│   ├── icon-48.png          # 48x48 icon (Chrome extensions manager)
│   └── icon-128.png         # 128x128 icon (Chrome Web Store & PWA install)
├── index.html               # Clean semantic HTML entry point
├── manifest.json            # Chrome Extension (Manifest V3) definition
├── manifest.webmanifest     # Progressive Web App (PWA) manifest
├── sw.js                    # Offline caching service worker (root scope)
├── README.md                # Project documentation & guides
└── LICENSE                  # MIT License
```

---

## 🧩 Chrome Extension Installation

DevDeck can be installed directly into Google Chrome, Brave, Arc, Edge, or any Chromium-based browser as a native Manifest V3 New Tab extension:

### Quick Install (Load Unpacked)

1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the repository root folder (`devdeck`).
5. Open a new tab (`Cmd+T` or `Ctrl+T`) — DevDeck is now your official new tab dashboard!

> [!TIP]
> You can also click the DevDeck icon in your browser's toolbar at any time to instantly open a new DevDeck dashboard tab.

---

## ☁️ Cloudflare Pages Deployment

DevDeck is designed to be hosted for free on Cloudflare Pages with zero build configuration.

### Option A: Automatic Deployment via Git (Recommended)

1. **Commit and push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy DevDeck"
   git push origin main
   ```
2. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. Navigate to **Compute (Workers & Pages)** → **Create application** → **Pages** → **Connect to Git**.
4. Select your repository (`devdeck`).
5. Set the build configuration:
   * **Framework preset:** `None`
   * **Build command:** *(leave blank)*
   * **Build output directory:** `.`
6. Click **Save and Deploy**. Your site will be live at `https://<project-name>.pages.dev` with automatic edge deployments on every git push.

### Option B: Direct CLI Deployment with Wrangler

1. **Authenticate Wrangler:**
   ```bash
   npx wrangler login
   ```
2. **Deploy directly from the project directory:**
   ```bash
   npx wrangler pages deploy . --project-name=devdeck
   ```
3. Cloudflare will upload the assets and output your live deployment URL immediately.

---

## 💻 Local Development

Because DevDeck requires zero build steps or bundlers, you can run it locally with any static HTTP server:

```bash
# Clone the repository
git clone https://github.com/adityach1/devdeck.git
cd devdeck

# Using Python:
python3 -m http.server 8080

# Or using Node.js:
npx serve .
```

Open `http://localhost:8080` in your browser.

---

## 🌐 Browser New Tab Setup

To use DevDeck as your default browser new tab:

- **Firefox:** Install [New Tab Override](https://addons.mozilla.org/firefox/addon/new-tab-override/) and set the URL to your deployed Cloudflare Pages address (or `http://localhost:8080`).
- **Chrome / Brave / Edge:** Use an extension like [Custom New Tab URL](https://chromewebstore.google.com/) pointing to your URL, or install DevDeck as a desktop PWA (click the Install icon in the address bar) and set it as your browser startup page.

---

## 🛡️ Privacy & Security

- **No Tracking or Analytics:** No third-party telemetry, analytics scripts, or cookies.
- **Client-Side Data Storage:** All preferences, notes, and local caches are stored on your device via `localStorage` and `IndexedDB`.
- **Client-Side Cryptography:** Vault encryption and decryption occur entirely within your local browser engine via the standard `window.crypto.subtle` API.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Feel free to use, modify, and distribute!