# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-01

First hardened release of the interface prototype, plus an installable Android build.

### Added

- **Android WebView shell** (`android/`) — plain `Activity` + `WebView`, no AndroidX, no native
  libraries. Assets are served from a synthetic `https://app.local` origin so ES modules and
  `localStorage` behave correctly (Chromium blocks modules over `file://`).
- **Signed universal APK** — `release/LiquidObsidian-1.0.0-universal.apk`
  (`arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`; API 24+), APK Signature Scheme v2 + v3, RSA-4096.
- Launcher icons generated from `public/favicon.svg` at five densities.
- `scripts/build-apk.mjs` (`npm run apk`) and `android/README.md` with signing instructions.
- CI workflows: `ci.yml` (typecheck, tests, build), `deploy-pages.yml`, `android-apk.yml`
  (builds a signed APK from secrets on `v*` tags and attaches it to a GitHub Release).
- Deployment configs for Vercel, Netlify, Docker + nginx, and a dependency-free production server
  (`scripts/serve.mjs`, `npm start`).
- `README.md`, `LICENSE` (MIT), `.nvmrc`, `.env.example`, favicon, web manifest, `robots.txt`,
  Open Graph image (`og-image.png`) and repository screenshots.
- `useDialog` hook: focus trap, Escape-to-close, scroll lock and focus restoration for modals.
- `ErrorBoundary` around the app shell.
- Session persistence in `localStorage` (settings, favourites, imported nodes, locale, active tab).
- URL deep links: `?autostart=1`, `?tab=nodes`, `#matrix`, plus hash sync for back/forward.
- Reduced-motion support, visible `:focus-visible` rings, skip link, `aria-live` status and
  `aria-pressed` node cards.

### Fixed

- `npm install` failed with `ERESOLVE` because `esbuild@^0.25` conflicted with Vite 8's peer range.
- **Routing engine never matched any seeded rule** — comma-separated pattern lists, CIDR blocks,
  `geosite:`/`geoip:` tags and `FINAL` were unsupported, so the Traffic Matrix always returned
  `default-proxy`. The evaluator now parses all of them and applies label-boundary domain matching.
- Share-link parser accepted any scheme (e.g. `https://`) and mangled `vmess://` (base64 JSON) and
  `ss://` (SIP002) links. Added a scheme allow-list, base64 decoding, bracketed IPv6 and query
  cipher parsing.
- "Download APK" fabricated a corrupt `.apk` text file; it now links to the real signed APK and
  offers a build manifest for other ABIs.
- Stale `activeNode` snapshot (HUD ignored ping/favourite updates) — the node is now derived by id.
- Leaked `setTimeout`/`setInterval` callbacks and an unbounded log array.
- Telemetry was inconsistent: fabricated traffic on the idle graph, a 60 Hz label on a 1 Hz feed,
  and `peakSpeed` above the sampled history.
- RTL was applied to a single `div`; `lang`/`dir` now live on `<html>`, and technical strings
  (`host:port`, rule patterns, ciphers, numeric readouts) are bidi-isolated.
- Header overflowed horizontally at 390 px; telemetry cards no longer collapse.
- `glassBlurQuality` was a dead setting; it now drives the `--glass-blur` CSS variable.
- Two sources of truth for the locale (`language` state vs `settings.language`) collapsed into one.
- Removed unused dependencies (`express`, `dotenv`, `@google/genai`, `motion`, `autoprefixer`,
  `esbuild`, `@types/express`) and non-portable scripts.
- Strict TypeScript enabled (`strict`, `noFallthroughCasesInSwitch`), tests wired into `npm test`.
- Vite config warned about `__dirname` under the native config loader; now uses `import.meta.dirname`.

### Security

- Modals now trap focus and close on Escape; `user-scalable=no` removed.
- `usesCleartextTraffic` disabled; WebView file/content access disabled.
- Release signing material kept outside the repository and git-ignored.

### Known limitations

- All telemetry is simulated; there is no `VpnService`, no `tun2socks`/`sing-box` and no real tunnel.
- No backend, authentication or subscription service.
- Persian translation covers navigation and primary controls; deeper screens remain English.
