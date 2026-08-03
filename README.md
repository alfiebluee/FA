# FINAL APPROACH

A high-end local aviation display for a home under the Heathrow arrival flight path. FINAL APPROACH identifies aircraft approaching London Heathrow near a **North London observation point**, ranks likely arrivals with an explainable heuristic, and presents a cinematic live board suitable for a laptop, television, or Raspberry Pi kiosk.

> Live aviation data is approximate and must not be used for navigation or operational decision-making.

## Screenshots

_Add screenshots after first run:_

- `docs/screenshots/live-board.png` — main display at 1920×1080
- `docs/screenshots/demo-mode.png` — demonstration data mode
- `docs/screenshots/map-follow.png` — follow-aircraft map mode

## Technology stack

- **Next.js** (App Router) + **TypeScript** + **React**
- **Tailwind CSS**
- **MapLibre GL JS** (dark vector map via OpenFreeMap)
- **Framer Motion**, **Lucide React**
- **Zod** validation, **date-fns** (time formatting via `Intl` / Europe/London)
- Server-side route handlers for external aviation APIs
- **Vitest**, **ESLint**, **Prettier**

No database, auth, or paid API key is required for the default live mode.

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example`:

| Variable                           | Purpose                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| `AIRCRAFT_PROVIDER`                | `adsblol` (default), `mock`, or `fr24` (placeholder)         |
| `ADSB_LOL_BASE_URL`                | Default `https://api.adsb.lol`                               |
| `NEXT_PUBLIC_OBSERVER_LAT` / `LON` | Observation point (not shown precisely in the UI by default) |
| `NEXT_PUBLIC_TARGET_AIRPORT`       | `EGLL`                                                       |
| `NEXT_PUBLIC_SEARCH_RADIUS_NM`     | Search radius in nautical miles                              |
| `NEXT_PUBLIC_REFRESH_INTERVAL_MS`  | Client poll interval (default 8000)                          |
| `NEXT_PUBLIC_MAP_STYLE_URL`        | MapLibre style URL                                           |
| `FLIGHT_DETAILS_PROVIDER`          | `none` (default) or `fr24` (placeholder)                     |
| `FR24_API_KEY` / `FR24_BASE_URL`   | Reserved for licensed Flightradar24 integration              |

## Live mode

```bash
npm run dev
```

With `AIRCRAFT_PROVIDER=adsblol`, the server calls the public ADSB.lol geographic endpoint:

`GET /v2/lat/{lat}/lon/{lon}/dist/{radius}`

Aircraft are validated with Zod, normalised, scored for Heathrow-arrival likelihood, and returned via `/api/aircraft/nearby`.

If the live API fails or is rate-limited, the app **automatically falls back** to labelled **DEMO DATA**.

## Demo mode

Force demonstration aircraft:

```text
http://localhost:3000/?demo=true
```

Or set `AIRCRAFT_PROVIDER=mock` / enable “Force demo mode” in Settings.

Kiosk / display mode (reduced chrome):

```text
http://localhost:3000/?display=true
```

Combine: `?demo=true&display=true`

## What the display shows

The screen is deliberately narrow in scope: **Heathrow arrivals that will pass over the observation point.** A typical scan sees 120–140 aircraft in range and shows fewer than ten. Everything else is filtered out before it reaches the UI.

### The eligibility gate

Applied first, in `lib/aviation/eligibility.ts`. An aircraft is rejected outright when it is:

- Not airline traffic — rotorcraft, gliders, drones and surface vehicles by ADS-B emitter category
- General aviation or a business jet by ICAO type code (`P28A`, `C172`, `GLF5`, `CL35`, …)
- Flying a registration-style callsign (`GENLI`, `N1350J`) rather than a commercial one (`BAW462`)
- Operated by an airline that does not serve Heathrow — Ryanair, easyJet, Wizz, Jet2, TUI, Vueling and other Gatwick/Luton/Stansted carriers
- Above 16,000 ft (an overflight, not a local arrival)
- Below 700 ft, meaning it has landed — the card leaves the display at this point
- Climbing at more than 900 ft/min, meaning it is departing

### Destination disambiguation

Gatwick, Luton, Stansted and City arrivals cross north London on tracks that look much like Heathrow's. `lib/aviation/destination-inference.ts` scores the trajectory against every London-area airport using heading alignment, whether the aircraft is closing, proximity, and whether its altitude is plausible for the remaining distance. If another field fits clearly better, the aircraft is rejected. Minor fields (Biggin Hill, Northolt, Oxford) carry a handicap so they rarely out-compete Heathrow on geometry alone.

### The overhead requirement

The projected track must pass within 14 km of the observation point — and it must get there **before** it reaches Heathrow. That second condition matters: an aircraft already on final west of the airport tracks due east, and extrapolating that line far enough eventually brings it near north London, long after it has actually landed. Comparing time-to-observer against time-to-Heathrow removes those.

### Scoring and focus

Surviving aircraft are scored 0–100 (`lib/config/scoring.ts`) on destination evidence, heading alignment, descent profile, altitude band, proximity, callsign and data freshness, with every contribution recorded as a human-readable reason. Focus selection then adds projected closest approach and **hysteresis** (score margin plus minimum dwell time) so the hero panel does not flicker between refreshes.

All of this is a heuristic built from ADS-B kinematics. It is not air traffic control data.

### Traffic view

The switch in the header (also in the settings drawer) toggles between the two ways of reading the same scan:

- **Arrivals** — the default. Only Heathrow arrivals routed over the observation point, everything above applied.
- **All traffic** — every aircraft the provider reports inside the search radius, including departures, non-Heathrow carriers, general aviation and helicopters. Arrivals stay bright and keep driving the hero panel; everything else is dimmed on the map and listed in the bottom rail by distance, annotated with why it was excluded.

The counts beside each label are live: arrivals matching the corridor, and total aircraft in range.

### Desktop alerts for special flights

Settings → **Desktop alerts for special flights** asks the browser for notification permission, then watches every poll for notable traffic that will pass near the observation point:

- Always: Airbus A380 and Boeing 747 family
- Also: A340s, Beluga / Dreamlifter, An-124 / An-225, rare historic types, VIP / state callsigns, and military transports

Each alert includes type and airline, altitude, time to overhead, estimated time to Heathrow, and ground speed. The same aircraft is not re-alerted for two hours. Alerts keep working in Arrivals-only view — the scan still includes context traffic for this purpose.

### Aircraft artwork

Silhouettes are original geometry generated from per-family proportions in `lib/aviation/airframe-profiles.ts`, resolved by ICAO type code. An A380 is drawn double-decked with four engines, a 747 carries its forward upper deck, a 777 is long with oversized nacelles, and a CRJ gets rear-mounted engines and a T-tail. Unknown types fall back to the family prefix, then to the broad visual category. The same proportions drive both the side profile in the hero panel and the plan-view map markers.

## Data limitations

- **ADS-B positions** and **airline schedules** are different datasets.
- Origin, destination, terminal, and scheduled arrival often require a **licensed** schedule API.
- Missing fields show honest placeholders (`Route unavailable`, etc.) — never invented values in live mode.
- Callsign → airline mapping is a display enhancement and does **not** confirm destination.

## Optional licensed flight-details provider

1. Obtain official API credentials from a licensed provider (e.g. Flightradar24 commercial API).
2. Set `FLIGHT_DETAILS_PROVIDER=fr24`, `FR24_API_KEY`, and `FR24_BASE_URL`.
3. Implement the client inside `lib/providers/flight-details/flightradar24-placeholder.ts`.

Do **not** scrape the Flightradar24 website or use unofficial endpoints. When FR24 live position mode is enabled (`AIRCRAFT_PROVIDER=fr24`), treat it as a complete selectable provider — do not merge conflicting near-real-time sources in ways that breach provider terms.

## Deploy to Vercel

```bash
npm run build
# or connect the repo in the Vercel dashboard
```

Set the same environment variables in the Vercel project settings. Server routes keep credentials off the client.

## Fullscreen Chrome kiosk

```bash
# macOS example
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk "http://localhost:3000/?display=true" \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000
```

Use Settings → Fullscreen, or the header fullscreen control, for a quick kiosk-like layout.

## Raspberry Pi

1. Install Node 20+ on Raspberry Pi OS (Bookworm recommended; Pi 5 preferred).
2. Clone the project, `npm install`, `cp .env.example .env.local`.
3. `npm run build && npm run start` (or `npm run dev` while iterating).
4. Autostart Chromium in kiosk mode pointing at `http://localhost:3000/?display=true`.
5. Disable screen blanking for wall displays.

Map animation and trail length are capped for lighter GPUs; turn off radar animation in Settings if needed.

## Privacy

- The UI labels the site **NORTH LONDON OBSERVATION POINT** — no street address.
- Precise coordinates are hidden behind an explicit settings unlock + confirmation.
- Do not commit `.env.local`.
- API keys stay server-side and are never logged intentionally.

## Provider terms and attribution

- **Aircraft data:** [adsb.lol](https://adsb.lol) — Open Data Commons ODbL 1.0. Attribution appears on the map and should be retained.
- **Map tiles / style:** [OpenFreeMap](https://openfreemap.org) / OpenStreetMap contributors.
- This project is an unofficial personal display and is not affiliated with NATS, Heathrow Airport, or Flightradar24.

## Troubleshooting

| Symptom                       | Check                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Always DEMO DATA              | Network access to `api.adsb.lol`; `/api/health`; rate limits                              |
| Map is black but the UI works | `public/maplibre/` is missing — run `node scripts/copy-maplibre-worker.mjs` (see below)   |
| Empty map                     | Map style URL; browser console; WebGL support                                             |
| Focus flickers                | Increase hysteresis / dwell in `lib/config/scoring.ts`                                    |
| No arrivals                   | Normal — Heathrow arrivals only cross the observation point in some runway configurations |
| Build fails                   | `npm run lint`, `npx tsc --noEmit`, Node version                                          |

### The MapLibre worker

MapLibre GL JS v6 loads its tile-parsing worker as a separate ES module and resolves the URL from `import.meta.url`. Once Next.js bundles the library that no longer points at `node_modules`, so the worker starts with an empty URL, no tile is ever requested, and the map renders as a black rectangle with no error.

`scripts/copy-maplibre-worker.mjs` copies `maplibre-gl-worker.mjs` and its shared chunk into `public/maplibre/`, and `lib/map/worker.ts` hands MapLibre the absolute URL via `setWorkerUrl()`. The copy runs automatically on `postinstall`, `predev` and `prebuild`, and the copied files are gitignored.

## Scripts

```bash
npm install
cp .env.example .env.local
npm run dev
npm run test
npm run lint
npm run build
```

## Project structure (high level)

```text
app/                    # App Router pages + API routes
components/brand/       # Wordmark and glyph
components/flight/      # Hero, approach timeline, arrival sequence rail
components/aircraft/    # Aircraft artwork and selection panel
components/map/         # MapLibre integration and controls
components/system/      # Header, status, settings drawer
lib/aviation/           # Eligibility, destination inference, scoring, focus
lib/geo/                # Distance, bearing, angles
lib/providers/          # ADSB.lol, mock, FR24 placeholders
lib/map/                # MapLibre worker configuration
lib/config/             # Env, scoring weights, arrival filter
data/                   # Airport and airline reference data
scripts/                # Build-time asset copying
tests/                  # Vitest unit tests
```

## License

Prototype for private home use. Respect ODbL and map attribution requirements when redistributing data-derived works.
