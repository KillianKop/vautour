# Contributing to vautour

Thanks for helping! Open an issue to discuss an idea, or a draft pull request early if you prefer to show code.

## Setup

```bash
npm install
npm run dev
npx playwright install --with-deps chromium webkit   # for the end-to-end tests
```

Node.js 20 or later. Any editor works; with VS Code, the Biome extension formats on save.

## Before opening a pull request

```bash
npm run check        # typecheck + lint + unit tests
npm run e2e          # end-to-end tests on the Android and iPhone profiles
npm run build
```

CI runs all of them. A PR is merged when CI is green and one other contributor has approved it.

- One topic per PR; small PRs get reviewed faster.
- Branch names: `feature/...`, `fix/...`, `docs/...`.
- Commit messages: imperative mood, short first line ("Add a cloud base chip to the start screen").
- Tests with the change: unit tests for logic, an e2e step for a new screen or flow.
- Visual change: run `npm run screenshots`, check the images, and add before / after screenshots to the PR.
- Touches sound, speech, gestures, wake lock or layout on small screens: go through the relevant part of
  [docs/device-testing.md](docs/device-testing.md) on a real phone and say which one in the PR.
- Add a line under "Unreleased" in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.

## Code style

- English for code, comments and docs. Every string shown to the user goes into `src/i18n/fr.ts` **and**
  `src/i18n/en.ts`; French is the default and the reference wording.
- TypeScript strict, no `any`. Biome decides formatting (`npm run format`).
- Logic in pure, tested modules; DOM code kept thin. See [docs/architecture.md](docs/architecture.md).
- No new runtime dependency without discussing it in an issue first: the app has none today and loads fast on a
  mountain 4G connection.

## The flight package

`public/flight.json` and `schema/` come from the **cheminee** repository. Do not edit them by hand. If you need a
new field, propose it in cheminee first, then follow [docs/flight-package.md](docs/flight-package.md).

## Wording

The tone of reports and messages is light and funny, but never at the expense of safety: no joke on the crash
report, and nothing that suggests a route or a margin is guaranteed.

## Licence

By contributing you agree that your contributions are released under the [MIT licence](LICENSE).
