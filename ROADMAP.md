# Roadmap

Ideas in rough order of priority. Each item should become an issue before work starts; comment there to take it.

## 1. Real GPS position

- `GpsSource implements PositionSource` from the Geolocation API (`watchPosition`, high accuracy).
- Conversion of latitude / longitude to the package frame using `extent`.
- Vario and ground speed from successive fixes, smoothed; altitude from GPS (barometer later, see 6).
- Matching the fix to the route: current segment, progress, "off route" detection.
- Simulator kept for the demo mode and the tests; a menu switch between "Simulation" and "GPS".
- Clock from the device, with `meta.utc_offset` and `meta.day_of_year` to check the package matches today.

## 2. In-flight re-routing

- Use `graph` from the flight package (feasible glides per hourly slot, three speeds) to recompute the fastest
  way back to the route or to the next turnpoint when the pilot leaves the plan, without network.
- Same cost model as cheminee: `glide_s + loss_m / climb_rate(j, t)`. Port and unit-test it against cheminee's
  results on the sample.
- "Reachable now" display: thermals within glide from the current altitude, with arrival margins.

## 3. Offline use

- Service worker caching the app and the current flight package (the mountain has no network).
- Self-host the Rubik font instead of loading it from Google Fonts.
- Choose and download a package before leaving (several areas / days).

## 4. Shared reports

- A small backend (or a hosted database) to share reports and votes between pilots in real time, with expiry
  (a "Bouchon au déco" lasts minutes, "Vaches" a season).
- Moderation and abuse limits; no personal data beyond a nickname.
- Live positions of friends (opt-in), like the demo pilots.

## 5. Better guidance

- Wind at altitude on the map, drift-corrected heading for glides.
- Final glide calculator to the landing field; landing fields in the package (needs cheminee).
- Airspace warnings (needs data and a cheminee export).
- Audio vario tuned for flight (configurable thresholds), and a "silent" mode keeping only critical prompts.

## 6. Native wrapper

- Capacitor (or similar) to keep tracking with the screen off, read the barometer, and publish to the stores.
- Bluetooth link to external varios (e.g. the LXNAV / FLARM NMEA sentences used by XCTrack).

## 7. Polish

- Landscape layout for tablets.
- More languages (German, Italian for the Alps).
- Accessibility pass: contrast, screen-reader labels, larger text setting.
