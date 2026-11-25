# 📜 DevDeck — Project History & Conversion Log

> A comprehensive record of the architectural evolutions, feature conversions, design iterations, security hardening audits, and chronological change history of the **DevDeck** project.

---

## 📌 Table of Contents

1. [Project Overview & Philosophy](#1-project-overview--philosophy)
2. [Major Architectural & Platform Conversions](#2-major-architectural--platform-conversions)
   - [Conversion 1: Monolithic Single-File to Structured Multi-Tier Architecture](#conversion-1-monolithic-single-file-to-structured-multi-tier-architecture)
   - [Conversion 2: Web Dashboard to Offline PWA & Manifest V3 Chrome Extension](#conversion-2-web-dashboard-to-offline-pwa--manifest-v3-chrome-extension)
   - [Conversion 3: Generic "Startpage" to "DevDeck" Identity & Branding](#conversion-3-generic-startpage-to-devdeck-identity--branding)
   - [Conversion 4: Google Home Integration (OAuth 2.0, SDM API & Bulk Tools)](#conversion-4-google-home-integration-oauth-20-sdm-api--bulk-tools)
   - [Conversion 5: Search Engine Typography to High-DPI Visual SVG Icons](#conversion-5-search-engine-typography-to-high-dpi-visual-svg-icons)
   - [Conversion 6: Clock & Weather Widgets Overhaul (Enriched Telemetry & Tri-Mode Clock)](#conversion-6-clock--weather-widgets-overhaul)
   - [Conversion 7: Entertainment Speed Dial Integration](#conversion-7-entertainment-speed-dial-integration)
   - [Conversion 8: Security, Cryptography & Accessibility Hardening Audit](#conversion-8-security-cryptography--accessibility-hardening-audit)
   - [Conversion 9: Documentation Conversion to Interactive In-App User Guide](#conversion-9-documentation-conversion-to-interactive-in-app-user-guide)
   - [Conversion 10: Dynamic Real-Time State & Tab Layout Refinements](#conversion-10-dynamic-real-time-state--tab-layout-refinements)
3. [Chronological Commit & Conversion Ledger](#3-chronological-commit--conversion-ledger)
4. [Technical Specification & Security Baseline](#4-technical-specification--security-baseline)

---

## 1. Project Overview & Philosophy

DevDeck was created to solve a fundamental problem for software engineers: **dashboard fatigue and privacy invasion in browser new-tab pages**. Most commercial startpages rely on heavy third-party bundles, require user accounts, track user analytics, and break when offline.

DevDeck was engineered under strict core principles:
- **Zero External Runtime Dependencies:** Pure vanilla ES6+ JavaScript, CSS3 custom properties, and native Web APIs (`crypto.subtle`, `Intl`, `Canvas`, `IndexedDB`).
- **100% Local-First & Zero Telemetry:** No remote database, no user accounts, no tracking pixels, and no analytics. All configurations, secrets, and buffers live in the user's browser.
- **Offline PWA & Chrome Extension Dual-Target:** Instant cold loads via Service Worker caching (`sw.js`) and direct Manifest V3 Chrome Extension support.
- **Developer-Centric Velocity:** Keyboard-first navigation (<kbd>⌘P</kbd>, <kbd>⌘K</kbd>, <kbd>⌘⇧S</kbd>, <kbd>/</kbd>), instant dev utilities, multi-engine bangs, and client-side encryption.

---

## 2. Major Architectural & Platform Conversions

### Conversion 1: Monolithic Single-File to Structured Multi-Tier Architecture
- **Before:** The repository started as a massive monolithic `index.html` file (exceeding 4,600 lines) containing inlined HTML, CSS stylesheets, and thousands of lines of JavaScript.
- **Conversion:**
  - Extracted CSS styling into modular [`css/style.css`](file:///Users/aditya/Projects/devdeck/css/style.css).
  - Modularized JavaScript logic into [`js/app.js`](file:///Users/aditya/Projects/devdeck/js/app.js).
  - Created dedicated asset folders: `icons/` for SVG and high-resolution PNG tiles (`icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`).
  - Minimized `index.html` into a semantic, clean HTML5 document shell under 250 lines.

### Conversion 2: Web Dashboard to Offline PWA & Manifest V3 Chrome Extension
- **Before:** A standard web page requiring an active server or local static hosting.
- **Conversion:**
  - Configured Progressive Web App (PWA) manifest [`manifest.webmanifest`](file:///Users/aditya/Projects/devdeck/manifest.webmanifest) with standalone display mode.
  - Implemented progressive network-first caching for HTML navigation and cache-first for static assets in [`sw.js`](file:///Users/aditya/Projects/devdeck/sw.js).
  - Added Manifest V3 [`manifest.json`](file:///Users/aditya/Projects/devdeck/manifest.json) with `chrome_url_overrides.newtab = "index.html"` and `background.js` service worker, turning DevDeck into a portable Chrome/Brave/Edge extension.

### Conversion 3: Generic "Startpage" to "DevDeck" Identity & Branding
- **Before:** The repository and UI were titled "Startpage" with basic bookmarks.
- **Conversion:**
  - Rebranded to **DevDeck** (Developer Flight Deck).
  - Redesigned visual branding with an SVG terminal icon, custom monospace typography, and 10 dynamic accent palettes.
  - Introduced profile workspaces (`Work`, `Personal`, `Dev`) for isolated environments.

### Conversion 4: Google Home Integration (OAuth 2.0, SDM API & Bulk Tools)
- **Before:** Mock smart device lists with static webhooks.
- **Conversion:**
  - Integrated Google Identity Services (GIS) / OAuth 2.0 flow for Google Accounts.
  - Added support for Google Smart Device Management (SDM) API for Nest hardware.
  - Resolved `Error 400: invalid_scope` by making sensitive scopes (`home.platform.v2`) optional and dynamically filtering unconfigured SDM scopes.
  - Added "Add Device", "Bulk Add", and "Clear Samples" tools with validated JSON/key-value formats.

### Conversion 5: Search Engine Typography to High-DPI Visual SVG Icons
- **Before:** Search engine selectors were rendered as text labels (`ddg`, `google`, `bing`, `brave`, `kagi`, `chatgpt`, `claude`, `gemini`, `perplexity`) which cluttered the header on smaller screens.
- **Conversion:**
  - Converted all 9 engine selectors to crisp SVG vector brand logos.
  - Maintained keyboard accelerator hints and active visual highlights.

### Conversion 6: Clock & Weather Widgets Overhaul
- **Clock Widget Conversion:**
  - Converted simple digital display into a tri-mode precision instrument (**Digital**, **Hybrid analog+digital**, **Full Analog SVG dial**).
  - Added day-of-year, ISO week number, real-time % elapsed progress bar, and clickable developer chips (Time, Date, Unix Epoch, ISO 8601).
- **Weather Widget Conversion:**
  - Migrated to Open-Meteo API requiring zero API keys.
  - Added daytime/nighttime icon awareness (`is_day`), apparent "feels like" temperature, humidity (💧), wind speed (💨), UV index & risk tiers, barometric pressure (⏲️), sunrise/sunset cycle (🌅/🌇), and a 3-day forecast strip.
  - Added 1-click `°C`/`°F` unit toggle, geocoding city search, and browser geolocation auto-detection.

### Conversion 7: Entertainment Speed Dial Integration
- **Conversion:**
  - Added dedicated streaming and media speed dial widget preconfigured for Netflix, Amazon Prime Video, JioHotstar, YouTube, Bilibili, and Dailymotion.
  - Added custom bang shortcuts (`!nflx`, `!prime`, `!bili`, `!dm`).

### Conversion 8: Security, Cryptography & Accessibility Hardening Audit
- **Audit Findings & Hardening:**
  - **CSP Header:** Added strict Content-Security-Policy meta tag restricting scripts to `'self'` and limiting outbound network fetches strictly to known API domains.
  - **Race Condition Prevention:** Threaded `AbortController` signals through widget render cycles so rapid re-renders abort stale in-flight fetches.
  - **Secrets Vault Hardening:** Upgraded PBKDF2 key derivation iterations from 200,000 to **600,000 iterations** (OWASP 2023 & NIST compliant) with AES-256-GCM.
  - **Accessibility (A11y):** Added `aria-live="polite"` and `aria-atomic="true"` to async widget containers so screen readers announce dynamic data loads.
  - **Clipboard Reliability:** Implemented graceful clipboard fallback with auto-selected input for environments blocking `navigator.clipboard`.
  - **Null Island Fix:** Replaced `parseFloat(...) || 0` with `isNaN()` checks to support coordinates at equator/meridian (`0, 0`).
  - **Credential Security:** Added warnings in widget configuration for unencrypted plaintext token storage.

### Conversion 9: Documentation Conversion to Interactive In-App User Guide
- **Before:** Documentation was only stored in an external `README.md` file.
- **Conversion:**
  - Built an interactive, searchable in-app **User Guide & Manual** modal right into DevDeck.
  - Added 9 navigable tabs: Overview, Omnibar & Bangs, 14 Widgets, 16 Quick Tools, Scratchpad & Snippets, Ports & Infra, Vault, Themes & Backup, Shortcuts.
  - Added real-time instant search filtering across all cards, tables, and topics.
  - Bound access to header button (`📖`), Quick Tools button (`data-tool="guide"`), footer button (`guide`), command palette, and <kbd>?</kbd> / <kbd>F1</kbd> shortcuts.

### Conversion 10: Dynamic Real-Time State & Tab Layout Refinements
- **UI Refinement:**
  - Fixed tab vertical text truncation by replacing single-line overflow with responsive flex wrapping, dedicated line-heights, and scrollbar clearance.
  - Ensured guide navigation and search filter remain docked at the top while only body content scrolls.
- **Live Clock State Fix:**
  - Fixed click-to-copy handlers in the Clock widget that were capturing static timestamps on initial page load. Handlers now dynamically re-evaluate `getClockData()` at the exact moment of user click.

---

## 3. Chronological Commit & Conversion Ledger

| Commit | Date (IST) | Author | Description / Scope |
| :--- | :--- | :--- | :--- |
| `c9c54c1` | 2026-09-11 21:12 | Aditya Kumar | **Initial commit**: MIT License & repository initialization. |
| `85242f0` | 2026-09-11 21:13 | Aditya Kumar | **Create `index.html`**: Initial 2,756-line monolithic dashboard. |
| `5df58f2` | 2026-09-11 21:14 | Aditya Kumar | **Create `sw.js`**: Service Worker caching implementation. |
| `57118c6` | 2026-09-11 21:14 | Aditya Kumar | **Create `manifest.webmanifest`**: Progressive Web App metadata. |
| `c367a07` | 2026-09-11 21:22 | Aditya Kumar | **Update `index.html`**: Expanded developer tools and omnibar logic. |
| `d1a3f3f` | 2026-09-12 00:12 | Aditya Kumar | **Startpage fixes & enhancements**: Extended README and widget grid. |
| `c360c32` | 2026-09-12 00:21 | Aditya Kumar | **Project Rebranding**: Renamed project from "Startpage" to "DevDeck". |
| `b2a9c20` | 2026-09-12 00:33 | Aditya Kumar | **Responsive Viewport**: Fully responsive grid across mobile and ultrawide. |
| `0f58880` | 2026-09-12 00:43 | Aditya Kumar | **Mobile Layout Fixes**: Polished viewport scaling; bumped cache to `v7`. |
| `f4da5c3` | 2026-09-12 00:57 | Aditya Kumar | **Infrastructure & Snippet Layout**: Enhanced mobile card wrapping. |
| `c7952f6` | 2026-09-12 11:18 | adityach1 | **Chrome Extension Conversion**: Created Manifest V3 extension bundle. |
| `3e96afb` | 2026-09-12 11:20 | adityach1 | **Docs Update**: Updated git remote clone URLs to `devdeck`. |
| `25364c4` | 2026-09-12 11:35 | adityach1 | **IndexedDB Wallpapers**: Drag-and-drop local image storage & presets. |
| `ee8e5a1` | 2026-09-12 11:36 | adityach1 | **Directory Restructuring**: Extracted `css/style.css`, `js/app.js`, `icons/`. |
| `a5a3a03` | 2026-09-12 11:47 | adityach1 | **Google Home Manager**: Smart device controller widget and webhooks. |
| `1b6a7c5` | 2026-09-12 12:00 | adityach1 | **Google Account Integration**: OAuth 2.0 GIS setup for Google Home. |
| `1fafdfc` | 2026-09-12 12:35 | adityach1 | **Auth Clarification**: Made Nest Project ID optional for standard devices. |
| `e8c776d` | 2026-09-12 12:40 | adityach1 | **Nest Project ID Removal**: Completely optional for standard smart plugs. |
| `7753f48` | 2026-09-12 12:48 | adityach1 | **Bulk Tools**: Added Bulk Add and Clear Samples to Google Home tool. |
| `0f7088d` | 2026-09-12 12:56 | adityach1 | **OAuth Scope Expansion**: Added `home.platform.v2` scope support. |
| `c76e73b` | 2026-09-12 13:01 | adityach1 | **Scope Fix**: Fixed Error 400 `invalid_scope` by isolating optional scopes. |
| `10db13d` | 2026-09-12 13:18 | adityach1 | **UI Enhancement**: Elevated design for Add Device and Bulk Add modals. |
| `a640f1c` | 2026-09-12 13:25 | adityach1 | **Search Icons**: Converted search engine text links to brand SVG icons. |
| `f27d61d` | 2026-09-12 20:26 | adityach1 | **Entertainment Widget**: Streaming speed dial (Netflix, Prime, Hotstar, etc.). |
| `5f371ff` | 2026-09-12 20:36 | adityach1 | **Clock Widget Overhaul**: Tri-mode clock (Digital/Hybrid/Analog) + chips. |
| `0cc5b6f` | 2026-09-12 20:47 | adityach1 | **Enriched Weather**: Open-Meteo telemetry, 3-day forecast, city search. |
| `f54ff59` | 2026-09-13 12:18 | adityach1 | **Audit Security Fixes**: CSP, AbortController, PBKDF2 600k, a11y live regions. |
| `70a09ba` | 2026-09-13 12:37 | adityach1 | **In-App User Guide**: 9-tab interactive feature manual with live search. |
| `ef33c11` | 2026-09-13 12:44 | adityach1 | **Guide UI Polishing**: Fixed tab text truncation and scrollbar clearance. |
| `247b5f0` | 2026-09-13 12:47 | adityach1 | **Live Clock Time Fix**: Dynamically compute live timestamp on click-to-copy. |

---

## 4. Technical Specification & Security Baseline

```
┌────────────────────────────────────────────────────────┐
│                        DEVDECK                         │
│       Developer Flight Deck & Startpage Architecture   │
├────────────────────────────────────────────────────────┤
│ Runtime Target    │ Vanilla ES6+ (No npm / No bundler) │
│ Extension Target  │ Chrome Manifest V3 New Tab Override│
│ PWA Architecture  │ Service Worker Cache (sw.js v27)   │
│ Cryptography      │ AES-256-GCM + PBKDF2 (600k iters)  │
│ Security Policy   │ Content-Security-Policy (CSP) meta │
│ External APIs     │ Open-Meteo, CoinGecko, HackerNews  │
│ Storage Layers    │ localStorage + IndexedDB           │
│ Accessibility     │ WCAG AA 4.5:1, ARIA live regions   │
└────────────────────────────────────────────────────────┘
```

- **Zero Data Leakage:** All secrets, scratchpad buffers, search histories, and custom webhooks remain on the client machine.
- **Deterministic Offline Capability:** Assets are pre-cached on service worker install. DevDeck operates with zero connectivity.
- **Maintainability:** Fully documented codebase with clear separation of DOM bindings, widget definitions, and modal utilities.
