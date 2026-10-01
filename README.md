# Swept

Reminds you to move your car before Montreal street cleaning, for the side of the street you parked on.

| Package | What |
| --- | --- |
| `core/` (`@swept/core`) | Sign-text parser, schedule maths, Home state + reminder planning. Shared by app and pipeline. |
| `pipeline/` | Builds per-block-side schedules from the city's open data. |
| `app/` | Expo (SDK 57) iPhone app. Screens follow `design/` (Claude Design handoff). |
| `design/` | Handoff: `README.md` (specs, tokens), `Swept.dc.html` (open in a browser). |
| `docs/spec.md` | Product spec. |

### App

The street database the app bundles (`app/assets/data/sides.db`, 16 MB) is not in git. Generate it once, and again whenever you want fresher city data:

```bash
pnpm --filter @mtl-parking/pipeline download      # ~120 MB of city data into pipeline/.cache
pnpm --filter @mtl-parking/pipeline build         # → pipeline/out/sides.db
pnpm --filter @mtl-parking/pipeline publish:app   # → app/assets/data/
```

After changing anything in `core/` that the Shortcuts actions use, rebuild the embedded bundle: `pnpm --filter @swept/core bundle:native`.

```bash
cd app && npx expo run:ios            # dev build (needs LANG=en_US.UTF-8 for CocoaPods)
npx expo start --dev-client
```

Preview any Home state without waiting for it (dev builds only):
`swept:///?now=2026-10-02T15:42&lang=en&spot=clean` — `now` freezes the clock, `lang` forces fr/en, `spot=clean` drops the disagreeing sign.

## Pipeline (`pipeline/`)

Turns the city's open data into a cleaning schedule per block side. Parsing and schedule maths live in `core/`.

```bash
pnpm install
pnpm --filter @mtl-parking/pipeline download   # ~120 MB into pipeline/.cache
pnpm --filter @mtl-parking/pipeline build      # → pipeline/out/sides.json + stats
pnpm --filter @mtl-parking/pipeline lookup 45.5310,-73.5790
pnpm --filter @mtl-parking/pipeline test
```

### How it works

1. **Signs** — [Signalisation (stationnement sur rue)](https://donnees.montreal.ca/dataset/stationnement-sur-rue-signalisation-courant): every parking sign panel as a point. Montreal publishes no cleaning *schedule*; the schedule only exists as sign text (`DESCRIPTION_RPA`), e.g. `\P 8h30-11h30 MERCREDI 1 AVRIL AU 1 DEC`.
2. **Parse** — `core/src/rules/parseRule.ts` turns that text into `{ days, windows, season }`. Cleaning = a no-parking/no-stopping window whose season starts Mar–May and ends Oct–Dec. School zones (`SEPT A JUIN`), `P 15 MIN` permits and inverted `\P EXCEPTE …` signs are rejected.
3. **Street sides** — [Géobase double](https://donnees.montreal.ca/dataset/geobase-double): one line per side of each block, ~8 m apart. A pole is attached to its nearest side line; a cleaning sign governs the whole block side. Panels with an arrow are ignored — real cleaning signs have none, and arrowed ones near corners are other restrictions.
4. **Aggregate** — one schedule per side, most-posted rule first. Corner poles only count if the side has no mid-block pole. When poles disagree the side is `disputed` and reminders use the earliest window.

### Gotchas

- The portal returns `RBAC: access denied` without a browser-like `User-Agent`.
- Verdun, LaSalle, Pierrefonds-Roxboro, L'Île-Bizard and Saint-Léonard have almost no cleaning signs in the data, and the independent cities (Westmount, Mont-Royal, …) are not in it at all. The app needs a manual-entry fallback.
- Times are local; tests run with `TZ=America/Montreal`.
