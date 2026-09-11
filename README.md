# 🚀 Startpage

> A fast, privacy-focused, zero-dependency developer startpage and dashboard designed for productivity. Fully responsive, offline-ready (PWA), and packed with built-in developer tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green.svg)](manifest.webmanifest)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow.svg)](index.html)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success.svg)](index.html)

🌐 **Live Demo:** [adityach1.github.io](https://adityach1.github.io)

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
- [Installation & Deployment](#-installation--deployment)
- [Privacy & Security](#-privacy--security)
- [License](#-license)

---

## ✨ Features

- ⚡ **Zero External Dependencies** — Single-file architecture powered by standard Web APIs and Web Crypto.
- 📱 **Fully Responsive Layout** — Optimized to comfortably utilize 90%–95% of your screen width across ultra-wide monitors, laptops, tablets, and phones.
- 🔍 **Power Omnibar** — Instant search, engine switching, 20+ bang shortcuts, live math evaluation, unit converter, and developer quick-commands.
- 🎛️ **Modular Widget Dashboard** — Real-time weather, clock, speed dial, browser diagnostics, crypto tickers, RSS, countdowns, and Pomodoro timers.
- 🔐 **Encrypted Secrets Vault** — Client-side AES-256-GCM + PBKDF2 encrypted `.env` and API token manager with session caching and auto-lock.
- 🛠️ **Full Developer Toolbox** — DNS over HTTPS (DoH), cURL builder, Cron calculator, Keygen, Base64, Hashes, JWT decoder, JSON formatter, QR code generator, and regex tester.
- 📝 **Scratchpad & Notes** — Multi-buffer editor with live split Markdown preview and interactive task checklists.
- 🌐 **REST API Tester** — In-browser HTTP client with header management, status code badges, response timing, and history.
- 🎨 **Deep Customization** — 10 accent themes, light/dark mode, and Unsplash/custom wallpaper support with brightness and blur sliders.
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

Jump directly to external developer platforms:

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

### Inline Utilities & Math

Type formulas and quick commands directly into the Omnibar:

- **Math & Conversions:**
  - `42 * 1024` → Calculates result with 1-click copy
  - `sqrt(256) + 10` → Math evaluation
  - `100 USD in EUR` or `50 kg in lbs` → Unit & currency conversions
- **Developer Quick Commands:**
  - `dns google.com` → Instant DoH DNS lookup
  - `b64 hello world` → Base64 encoder/decoder
  - `hash mypassword` → Generates SHA-256 hash
  - `keygen 32` → Generates secure random key/token
  - `uuid` → Generates standard UUID v4
  - `ts` or `ts 1700000000` → Epoch timestamp converter
  - `cron 0 12 * * *` → Cron expression parser
  - `curl https://api.github.com` → cURL test launcher
  - `v <key>` or `vault <query>` → Search & copy decrypted vault secret (when unlocked)

---

## 🎛️ Widgets System

The widget dashboard automatically organizes your view with zero setup.

### Default Widgets

| Widget | Description | Configuration |
| :--- | :--- | :--- |
| **🕐 Clock** | Current local time, date, and timezone. | Configurable timezone & seconds toggle |
| **☀️ Weather** | Real-time weather and wind speed via Open-Meteo. | **New Delhi** (`28.6896, 77.2947`), metric units |
| **⭐ Speed Dial** | Visual bookmark tiles with auto-retrieved favicons. | GitHub, Hacker News, YouTube, Reddit, StackOverflow, ChatGPT |
| **💻 Browser Info** | System diagnostics: Screen resolution, viewport, memory, cores, and network. | Live hardware and connection monitor |

### Available Widget Gallery

Click the **`＋` Add Widget** button in the dashboard header to add any of these modular widgets:

- **🌍 World Clock** — Multi-timezone live display.
- **🐙 GitHub Activity** — Recent pushes, repositories, and follower stats (supports personal access tokens).
- **₿ Crypto Prices** — Live CoinGecko price tickers (BTC, ETH, SOL, etc.) in USD, EUR, INR, GBP, or JPY.
- **📰 Hacker News** — Live top stories with score and comment counts.
- **📡 RSS Feed** — Custom feed reader (TechCrunch, GitHub releases, blogs).
- **⏳ Countdown** — Milestone & release countdown timer.
- **🍅 Pomodoro Focus** — 25/5 interval timer with audio chimes and cycle counters.
- **📝 Quick Notes** — Instant scratch area auto-saved independently.
- **🔌 JSON Endpoint** — Periodic polling and display of custom JSON APIs.
- **🧩 Custom JS Plugins** — Run arbitrary sandbox functions to render custom content.

---

## 🛠️ Developer Tool Suite

Access the comprehensive developer suite from the top navigation bar or keyboard shortcuts:

1. **DNS over HTTPS (DoH) Lookup (`Alt+T` → DNS)**
   - Query `A`, `AAAA`, `MX`, `TXT`, `CNAME`, `NS`, `SOA`, and `PTR` records via Cloudflare (`1.1.1.1`) or Google (`8.8.8.8`).
2. **cURL Command Builder (`Alt+T` → cURL)**
   - Interactive UI to construct cURL requests with custom headers, HTTP methods, authorization tokens, and request bodies.
3. **Cron Expression Explainer (`Alt+T` → Cron)**
   - Human-readable cron schedule descriptions and upcoming 5 execution timestamps.
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

---

## 🔐 Encrypted Secrets Vault

The Secrets Vault allows you to safely store sensitive API keys, tokens, and credentials right inside your startpage.

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
- **Accent Colors:** Choose from Cyber Blue, Emerald, Amber, Purple, Rose, Cyan, Orange, Pink, Teal, or Indigo.
- **Custom Wallpapers:**
  - Dynamic Unsplash curated backgrounds (Minimal, Technology, Architecture, Dark, Nature, Space).
  - Custom image URLs.
  - Local image file uploads (stored locally via `IndexedDB`/`Blob`).
  - Wallpaper Blur (`0px` to `20px`) and Brightness (`20%` to `100%`) adjustment sliders.
- **Profiles:** Create separate profiles for `Work`, `Personal`, or `Dev` with isolated bookmarks, widgets, and scratchpads.
- **Backup & Restore:** Full JSON export and import of all startpage preferences and configs.

---

## 💻 Installation & Deployment

### Run Locally
Since Startpage is completely client-side and requires zero build steps, you can run it immediately:

```bash
# Clone the repository
git clone https://github.com/adityach1/adityach1.github.io.git
cd adityach1.github.io

# Serve using any static server (or open index.html directly)
python3 -m http.server 8080
# or with Node.js:
npx serve .
```

Open your browser at `http://localhost:8080`.

### Deploy to GitHub Pages
1. Fork or push this repository to GitHub as `<username>.github.io`.
2. Go to **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: `main` / `root`.
3. Your startpage will be live at `https://<username>.github.io`.

### Set as Browser New Tab
- **Firefox:** Use an extension like [New Tab Override](https://addons.mozilla.org/firefox/addon/new-tab-override/) and set URL to your deployed startpage or local server.
- **Chrome / Edge / Brave:** Use [Custom New Tab URL](https://chromewebstore.google.com/) or install as a PWA and set as homepage.

---

## 🛡️ Privacy & Security

- **No Tracking or Telemetry:** No analytics scripts, tracking pixels, or third-party user monitoring.
- **Local Storage:** All configuration, scratchpad buffers, and history are stored directly in your browser's `localStorage` and `IndexedDB`.
- **Client-Side Cryptography:** Vault encryption and decryption occur entirely within your local browser engine via the standard `window.crypto.subtle` API.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Feel free to use, modify, and distribute as you like!