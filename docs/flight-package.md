# Flight package

The app reads a single JSON file, the **flight package**, produced by the planning engine **cheminee**
(`cheminee export`). It is the only link between the two repositories.

- Formal definition: `schema/flight-package.v1.schema.json`, a copy of the schema owned by cheminee.
- Full description of every field: `docs/flight-package.md` in the cheminee repository.
- TypeScript mirror: `src/package/types.ts`.

`loadPackage()` refuses a file whose `format` is not `cheminee.flight-package` or whose `version` is not the one
the app knows (`PACKAGE_VERSION`), with a clear message instead of a broken map. The unit tests validate
`public/flight.json` against the schema with Ajv.

## What the app uses

| Field                                 | Used for                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `meta.attribution`                    | credits on the start screen (required by the data licences)                             |
| `extent`, `terrain`                   | map image and its placement                                                             |
| `dem`                                 | ground altitude under the glider ("sol +N")                                             |
| `lift`, `climb_times`                 | lift overlay by hour                                                                    |
| `nodes`                               | thermal pins, names ("Thermal, SW face"), expected climb rate                           |
| `routes[].segments`                   | everything the banner says: climb targets, glide distance, airspeed, arrival margin     |
| `routes[].turnpoints`, `scoring`      | B1/B2/B3 flags, triangle drawing                                                        |
| `weather`                             | wind arrow, ceiling and cloud base on the start screen                                  |
| `polar`                               | speed-to-fly wording ("Bras hauts", "Accélère")                                         |
| `graph`                               | not used yet: reserved for in-flight re-routing (see [ROADMAP.md](../ROADMAP.md))       |
| `meta.utc_offset`, `meta.day_of_year` | not used yet: package times are already local; needed once the GPS clock drives the app |

## Updating the sample package

With cheminee cloned next to this repository and installed (`pip install -e .`):

```bash
cd ../cheminee
tar -xzf data/rasters_COP30_sample.tar.gz -C data/          # once
cp schema/flight-package.v1.schema.json ../vautour/schema/
cheminee export data/output_hh.asc --out ../vautour/public/flight.json
cd ../vautour && npm test
```

With the default options this reproduces the current sample exactly (only `meta.created` changes). Never edit
`public/flight.json` by hand: regenerate it.

## When the format changes

1. The change lands in cheminee first (schema, export, docs, tests).
2. In vautour, in a PR that links the cheminee one: copy the schema, update `src/package/types.ts` (and
   `PACKAGE_VERSION` for a breaking change), regenerate the sample, adapt the code, run `npm run check` and
   `npm run e2e`.
3. A new optional field must stay optional in the app too: older packages remain valid.
