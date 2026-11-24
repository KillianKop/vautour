# Testing on phones

The app targets **Safari on iOS 16.4+** and **Chrome on Android**. Automated tests cover a lot, but not
everything a phone does: speech, sound, the screen staying awake and touch gestures need a real device.

## What the automated tests cover

`npm run e2e` runs `e2e/app.spec.ts` on two Playwright profiles:

| Profile   | Engine   | Screen                      | Stands for        |
| --------- | -------- | --------------------------- | ----------------- |
| `android` | Chromium | Pixel 7, 412 × 839, touch   | Chrome on Android |
| `iphone`  | WebKit   | iPhone 14, 390 × 664, touch | Safari on iOS     |

They check the main flows by tapping (start, take off, glide banner, crash report, language switch and memory,
end screen), that the layout fits the screen without horizontal scrolling, and that the page logs no error.

Limits to keep in mind:

- Playwright's WebKit is the Safari **engine** built for Linux / macOS, not iOS Safari itself. It catches most
  CSS and JavaScript incompatibilities, not iOS-specific behaviour (audio policy, home-screen mode, notch).
- Headless browsers have no speakers, no speech voices, no wake lock and no real GPS.
- CI runs both profiles on every pull request (`.github/workflows/ci.yml`).

## Checklist on real phones

Before a release, on at least one iPhone (Safari) and one Android phone (Chrome). Serve the app with
`npm run dev:phone` and open the "Network" URL on the phone (same Wi-Fi), or use the GitHub Pages deployment.

Note the phone model, OS version and browser version in the release PR.

**Start**

- [ ] The start screen shows the routes, the weather chips and the Copernicus credits.
- [ ] Route cards scroll sideways with a finger; tapping one selects it.
- [ ] Nothing is hidden by the notch, the Dynamic Island or the home indicator.

**Flight**

- [ ] "Décoller" starts the flight; the banner says "Enroule jusqu'à …".
- [ ] **Sound**: vario beeps while climbing, chime at turnpoints (iOS: check the ring/silent switch is on ring).
- [ ] **Voice**: announcements are spoken, in French, then in English after switching language.
- [ ] The sound button mutes and unmutes both.
- [ ] **Screen stays on** for more than the auto-lock delay of the phone during a flight.
- [ ] Map gestures: one-finger pan, two-finger pinch zoom; the page itself does not zoom or bounce;
      "Recentrer" brings the glider back.
- [ ] Overview button shows the whole route, tapping again returns to navigation.
- [ ] Portrait only: rotating the phone does not break the layout.

**Reports**

- [ ] The yellow button opens the 9 report tiles; "Crash" shows the 112 line; "Envoyer" drops a pin.
- [ ] A report ahead raises an alert with "Toujours là" / "Plus là"; both buttons respond.

**Menu and end**

- [ ] The flight menu changes route, simulation speed, layers and language; the language is kept after closing
      and reopening the app.
- [ ] The end screen shows consistent numbers; "Rejouer" and "Autre parcours" work.

**Home screen app**

- [ ] "Add to Home Screen" (iOS share menu) / "Install app" (Chrome menu) shows the Vautour icon.
- [ ] Opened from the home screen, the app is full screen with the right status bar colour.

## Known platform constraints

- iOS only allows sound and speech after a user gesture: the app unlocks both on the first tap anywhere.
- iOS stops JavaScript when the screen is locked or Safari is in the background: a real-GPS version will need a
  native wrapper (see the roadmap) to keep tracking in the pocket.
- Screen Wake Lock needs iOS 16.4+ and a secure context (HTTPS or `localhost`). Over plain HTTP on the local
  network the screen may still lock during development; GitHub Pages is HTTPS.
- Speech voices depend on the phone's installed languages.
