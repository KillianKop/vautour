# CLAUDE.md

Working notes for AI coding assistants (Claude Code and others) on this repository. Humans are welcome to read
them: they are the short version of [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/architecture.md](docs/architecture.md).

## What this is

vautour is a phone web app that guides a paraglider pilot along a cross-country route, like Waze for roads. It
reads a **flight package** (`public/flight.json`) computed by the sister Python repository **cheminee**. Today
the position comes from a simulator replaying the route; a GPS source is the next big step (see
[ROADMAP.md](ROADMAP.md)).

Stack: TypeScript 7 (strict), Vite 8, Vitest, Playwright, Biome. No UI framework, on purpose: Canvas 2D for the
map, a thin DOM layer for the rest. Keep it that way unless the team decides otherwise in an issue.

## Commands

```bash
npm install
npm run dev                 # http://localhost:5173 (phone frame on desktop)
npm run dev:phone           # reachable from a phone on the same network
npm run check               # typecheck + lint + unit tests: run before every commit
npm run format              # Biome fixes (format, imports, safe lint fixes)
npm test                    # unit tests only
npm run build               # dist/
npm run e2e                 # Playwright, Android (Chromium) + iPhone (WebKit) profiles
npm run e2e:android         # Chromium only
npm run screenshots         # rebuild docs/img/*.png after a visual change (needs a build)
```

Playwright browsers: `npx playwright install --with-deps chromium webkit` (once). With an installed Google Chrome,
`PW_CHROME_CHANNEL=chrome npm run e2e:android` works without downloading Chromium.

Open a given state directly with URL parameters (`src/dev.ts`), e.g.
`/?autostart=1&dt=0.8&paused=1&alert=sink` or `/?autostart=1&sheet=crash&lang=en`. The full list is in the README.

## Layout

- `src/package/` flight package types (mirror of the JSON schema), loading, elevation, lookups
- `src/nav/` route preparation, `PositionSource` + `Simulator`, guidance (banner + voice text)
- `src/map/` camera, canvas renderer, DOM pins, lift colours
- `src/reports/` report catalogue, store (alerts, votes), demo data
- `src/ui/` DOM refs, banner, sheets and screens, toasts, gestures, icons
- `src/audio/` tones, vario, speech
- `src/i18n/` `fr.ts` (default) and `en.ts`
- `src/app.ts` the `App` class: modes, frame loop, wiring; `src/main.ts` entry; `src/dev.ts` URL switches
- `tests/` Vitest (Node, no DOM); `e2e/` Playwright; `schema/` copy of cheminee's schema; `public/` static files

## Rules

- **Language**: all code, comments, logs and docs in English. **All user-visible text goes through i18n**
  (`t().…`), never hard-coded in TS or HTML. French is the default locale and the reference wording; add every
  new key to both `fr.ts` and `en.ts` (the `Messages` type makes the build fail otherwise).
- **Pure first**: put logic in pure modules (`nav/`, `package/`, `reports/store`, `util/`, `map/camera`) and unit
  test it. DOM modules only render. `app.ts` wires things together; do not let it grow logic that could be tested
  elsewhere.
- **Units**: metres, seconds, decimal local hours, m/s for vertical speeds, km/h for horizontal speeds shown to
  the pilot. Positions are in the package frame (x east, y north, origin south-west).
- **Never edit `public/flight.json` or `schema/` by hand**: they come from cheminee (procedure in
  [docs/flight-package.md](docs/flight-package.md)). Types in `src/package/types.ts` must match the schema.
- **Keep the credits**: the start screen shows `meta.attribution` (Copernicus DEM, Open-Meteo). Data licences
  require it.
- **Formatting of numbers** goes through `util/format.ts` (locale-aware decimal comma in French). Use the
  minus sign `−` for negative vario values, as the existing helpers do.

## Mobile constraints (iOS Safari is the strict one)

- Sound and speech only start after a user gesture: use `app.sound` (it is unlocked on the first `pointerdown`);
  never create another `AudioContext`.
- Never use `alert()`, `confirm()`, `prompt()`: they block the app and the test runner. Use `toast()` or a sheet.
- Use pointer events; there is no hover on phones. Tap targets at least 44 × 44 px.
- Respect safe areas (`--safe-top` etc. in CSS) and `100dvh`; test at 390 × 844 and 360 × 780.
- Avoid APIs newer than Safari 16.4 without a fallback (see `drawSun` and its `roundRect` fallback).
- Keep the frame loop cheap: no allocation-heavy work per frame, no layout reads in loops, `setHTML` for DOM text.
- Wrap `localStorage` and other storage in `try/catch` (private mode, sandboxed frames).

## Tests

- New logic → a unit test in `tests/`. New screen or flow → a step in `e2e/app.spec.ts` (tap, do not click,
  and assert no console error, like the existing tests).
- Unit tests read the real sample package through `tests/fixtures.ts`: assert invariants (continuity, ranges,
  ordering) rather than exact numbers that change when cheminee changes.
- After a visual change, run `npm run screenshots` and look at the images; commit them if the README shows them.

## Safety

This is a prototype, not a flight instrument. Do not remove the status warning from the README or the demo
caption from the app. Wording shown to pilots must never suggest that a route, a margin or a report is
guaranteed. The crash report keeps its "call 112 first" line.
