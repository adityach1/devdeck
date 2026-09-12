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

The widget dashboard automatically organizes your view with zero configuration.

### Default Widgets

| Widget | Description | Configuration |
| :--- | :--- | :--- |
| **🕐 Clock** | Current local time, date, and timezone. | Configurable timezone & seconds toggle |
| **☀️ Weather** | Real-time weather and wind speed via Open-Meteo. | **New Delhi** (`28.6896, 77.2947`), metric units |
| **⭐ Speed Dial** | Visual bookmark tiles with auto-retrieved favicons. | GitHub, Hacker News, YouTube, Reddit, StackOverflow, ChatGPT |
| **💻 Browser Info** | System diagnostics: Screen resolution, viewport, memory, cores, and network. | Live hardware and connection monitor |

### Available Widget Gallery

Click the **`＋` Add Widget** button in the dashboard header to add any of these modular widgets:

- **🏠 Google Home & Smart Devices** — Control smart lights, plugs, thermostats, speakers, and locks with room filters and one-click quick routines.
- **🌍 World Clock** — Multi-timezone live display.
- **🐙 GitHub Activity** — Recent pushes, repositories, and follower stats (supports personal access tokens).
- **₿ Crypto Prices** — Live CoinGecko price tickers (BTC, ETH, SOL, etc.) in USD, EUR, INR, GBP, or JPY.
- **📰 Hacker News** — Live top stories with score and comment counts.
- **📡 RSS Feed** — Custom feed reader (TechCrunch, GitHub releases, engineering blogs).
- **⏳ Countdown** — Milestone & release countdown timer.
- **🍅 Pomodoro Focus** — 25/5 interval timer with audio chimes and cycle counters.
- **📝 Quick Notes** — Instant scratchpad auto-saved independently.
- **🔌 JSON Endpoint** — Periodic polling and display of custom JSON APIs.
- **🧩 Custom JS Plugins** — Run sandboxed functions in an isolated iframe.

---

## 🛠️ Developer Tool Suite

Access the comprehensive developer suite from the top navigation bar or keyboard shortcuts:

1. **DNS over HTTPS (DoH) Lookup (`Alt+T` → DNS)**
   - Query `A`, `AAAA`, `MX`, `TXT`, `CNAME`, `NS`, `SOA`, and `PTR` records via Cloudflare (`1.1.1.1`) or Google (`8.8.8.8`).
2. **cURL Command Builder (`Alt+T` → cURL)**
   - Construct cURL requests with custom headers, HTTP methods, authorization tokens, and request bodies.
3. **Cron Expression Explainer (`Alt+T` → Cron)**
   - Human-readable cron schedule descriptions and upcoming execution timestamps.
4. **Cryptographic Key & Token Generator (`Alt+T` → Keygen)**
   - Cryptographically strong random keys, API tokens, hex strings, Base64 tokens, and passwords with custom lengths and character sets.
5. **JSON Formatter & Validator**
   - Format, minify, repair, and validate JSON payloads with color-coded syntax.
6. **JWT Token Inspector**
   - Decode headers and payload claims without sending data across the network.
7. **Hash & HMAC Generator**
   - Compute SHA-256, SHA-512, and MD5 digests instantly.
8. **Regex Tester & Visualizer**
   - Real-time regular expression match testing with flags and capture group highlighting.
9. **Diff Viewer**
   - Side-by-side and unified text differences.
10. **Color Palette & Unit Converter**
    - Convert HEX, RGB, HSL, and CMYK color spaces.
11. **REST API Client (`Alt+A`)**
    - Full HTTP request runner with custom headers, query params, body editors, response headers, and performance metrics.
12. **Markdown Scratchpad (`Alt+N`)**
    - Multi-buffer notes manager with live split Markdown preview and interactive task checklist toggles.
13. **Google Home & Smart Devices Manager (Quick Tools → `Home`)**
    - Manage smart lights, plugs, thermostats, audio, and locks; adjust brightness and temperature; trigger scenes; dispatch webhooks; and launch Google Home Web (`home.google.com`).

---

## 🔐 Encrypted Secrets Vault

DevDeck includes a built-in developer secrets vault:

- **Encryption Standard:** `AES-256-GCM` with key derivation using `PBKDF2-SHA256` (100,000 iterations and cryptographically random salt/IV).
- **Memory-Only Session:** Passphrase is kept in runtime memory only while unlocked. Plaintext secrets are never stored to `localStorage` unencrypted.
- **Structured Manager & Raw Editor:** Manage items with category tags (`API Key`, `Database`, `Auth`, `Server`, `Notes`), expiry dates, and notes, or switch to the raw `.env` / JSON editor.
- **Auto-Lock Timer:** Configurable inactivity lock (`1m`, `5m`, `10m`, `30m`, `60m`, `Never`).
- **Encrypted Backup:** Export and import encrypted `.enc.json` backups between devices.
- **Omnibar Integration:** When unlocked, search and copy secrets directly from the Omnibar using `v <query>`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `/` or `Space` | Focus Power Omnibar |
| `Esc` | Close open modal, panel, or clear Omnibar |
| `Alt + N` | Open Scratchpad & Notes |
| `Alt + T` | Open Developer Tools Suite |
| `Alt + V` | Open Encrypted Secrets Vault |
| `Alt + A` | Open REST API Client |
| `Alt + S` | Open Snippets Manager |
| `Alt + P` | Open Profile Switcher |
| `Alt + C` | Open Configuration & Settings |
| `?` | Open Keyboard Cheatsheet |

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