# Cosine Bus Tracker

An Express/EJS bus tracker with real driver GPS, a Leaflet map, private driver keys, live student updates, bus search, routes, pickup stops and approximate arrivals. The gold/black Phase 1 design is preserved. No buses or GPS positions are seeded into the application.

## Run locally

From this directory:

```powershell
npm install
npm run build:css
npm test
npm start
```

Open http://localhost:3000 for the welcome page, http://localhost:3000/student for students, and http://localhost:3000/driver for drivers.

## Register your real fleet

Create a private JSON file using this shape, replacing every value with real fleet information. `lat` and `lng` must be numbers, IDs must contain only letters, digits, underscores or hyphens. Stops must be listed in travel order. An empty stops array is allowed while you collect coordinates.

```json
{
  "id": "YOUR-BUS-ID",
  "name": "Your bus name",
  "route": {
    "name": "Your route name",
    "stops": []
  }
}
```

Each stop has `id`, `name`, `lat` and `lng`. Optionally add `route.path`: an array of `{ "lat": number, "lng": number }` points following the actual road in travel order. A separate route should describe each direction. Without this path, the map draws dashed connections between stops and distances are explicitly labeled straight-line estimates.

Stop the server, then run:

```powershell
npm run register:bus -- C:/path/to/your-private-bus.json
npm start
```

The command prints a private driver key once. Give that key and the bus ID to the assigned driver. Only its SHA-256 hash is saved. Registering the same ID replaces its configuration and rotates its key. Restart the server after registration. Keep source JSON files outside a public directory. Keys are entered on the driver page and kept in page memory, not browser storage or URLs.

## Driver and student flow

1. Driver opens `/driver`, enters their assigned ID and key, and clicks **Connect bus**.
2. **Start trip** creates a trip; it does not request or share GPS.
3. **Start sharing** requests browser permission, displays coordinates/accuracy, and sends each fresh fix when available, with periodic retry checks.
4. Students search for the bus, select it, then select a pickup stop. Updates arrive over Server-Sent Events, with polling as a fallback.
5. **Stop sharing** immediately stops local GPS and hides the public location once the server acknowledges the pause. **End trip** also closes the trip.

If disconnected, stop/end requests retry while the page remains open. A position older than 45 seconds is hidden automatically on both server and student page. Closing the driver page attempts to pause, but this is best effort; expiry still applies. Reloading the driver page clears its credentials and trip session. A replacement trip can start after two minutes without a heartbeat or accepted GPS update. Server restarts end all live trips and retain registered buses/routes.

## Arrival estimates

GPS speed must be available and at least 1 m/s, accuracy must be within 100 m, and a fresh position must exist. The estimate divides distance by current speed; it does not include traffic, stops, or a routing service. With a supplied road path it projects GPS positions and stops onto the ordered road segments, including sparse segments. Without one it is explicitly a rough straight-line estimate. If the bus is off the configured path or the selected stop is behind it, an ETA is withheld. These estimates need field validation before relying on them operationally.

## Phone access and hosting

Phones need an **HTTPS** URL for browser GPS. `http://localhost` works on the computer itself; a phone opening an HTTP LAN IP normally cannot use GPS. Deploy this app behind HTTPS before testing real cross-phone tracking. Keep the driver page open and the phone awake: browser tracking is not reliable with the screen locked. The app requests a screen wake lock while sharing when supported, and displays its actual availability.

Run a single Node process with a persistent writable `data/` directory. The app stores registrations in `data/fleet.json` using atomic file replacement and holds current trips in memory. `DATA_FILE` can point to another persistent location. This implementation is intended for a small single-server pilot; multiple instances require a shared database and shared event transport. Back up the fleet file privately. Live positions are public to anyone who can open the student dashboard, as required for this initial student view.

Leaflet and the fonts are served locally from npm packages, so third-party scripts and font stylesheets do not block startup. OpenStreetMap tiles still need internet access; tile failures show a separate warning while trip controls and journey details continue working. Live streams are capped at 200 simultaneous connections. Configure an HTTPS reverse proxy to allow long-lived `/api/events` responses and disable buffering for that endpoint.

Settings: `PORT` (default 3000), `NODE_ENV` (`production` on hosting), `DATA_FILE` (optional absolute file path).

## Verification

`npm test` runs isolated tests with temporary fleet data. Tests exercise credentials and persistence, duplicate/stale trip rejection, GPS validation, stop/end behavior, restart recovery, HTTP pages and live streams. Test buses never populate the real fleet file. `npm run build:css` rebuilds Tailwind after template changes.

The remaining setup requires your real bus IDs/names, route/stop coordinates, and an HTTPS host. No production deployment or real phone GPS test has been performed automatically.

Browser verification was also performed against an isolated temporary fleet with simulated GPS: driver connect/start/share, student live counts and marker, stop selection and approximate ETA, pause propagating across pages, and end-trip controls. Real phone permission and background behavior still require field testing. For a repeatable isolated browser fixture, run `node scripts/browser-preview.cjs` (port 3001); it prints a temporary driver key, never changes your real fleet, and cleans up its temporary data when stopped with Ctrl+C.


## Appearance and interaction

The original **Cosine Bus Tracker** name is retained. A compact switch toggles Light and Dark themes. It follows the device setting until a preference is saved locally. Typography uses locally hosted Jost with Cormorant Garamond for editorial headings. Motion respects reduced-motion preferences. Live bus/stop lists preserve keyboard focus, and the selected pickup is remembered for the current browser tab without storing driver credentials. Recenter fits the selected route or current bus markers.

## API contract

| Endpoint | Purpose |
| --- | --- |
| `GET /api/buses` | Registered fleet and current public journey state, plus `serverTime` |
| `GET /api/events` | SSE snapshots of the same fleet state |
| `GET /api/buses/:id/arrival?stopId=:stopId` | Current distance, estimate in seconds, and a reason when no estimate is available |
| `POST /api/driver/connect` | Authenticate an assigned bus and private driver key |
| `POST /api/driver/start` | Create a trip; optional stable `requestId` makes retries idempotent |
| `POST /api/driver/location` | Publish a recent GPS fix for the authenticated active trip |
| `POST /api/driver/pause` | Stop public sharing |
| `POST /api/driver/heartbeat` | Keep ownership of a trip while connected |
| `POST /api/driver/end` | End a trip; retrying a completed end cannot terminate a newer trip |

Driver POST requests carry `Authorization: Bearer <driver key>` and JSON containing `busId`. Trip actions after start also carry `tripId` and an increasing integer `sequence`. Location requests include `location: { lat, lng, accuracy, timestamp, speed }`, with metres for accuracy and metres/second for speed. Errors include a readable `error` and, for trip conflicts, a machine-readable `code`. Frontends use server time to account for device clock differences. No paid routing or traffic API has been configured: road geometry must come from your real route records, and arrival times remain estimates.

Real deployment still needs your fleet records, an HTTPS host, a persistent storage volume, and real phone field testing. The current JSON/in-memory architecture is a single-server pilot, not a distributed production service.

## Welcome and demo access

`/` is the welcome page. Once someone visits a workspace, returning to `/` takes them to their last student or driver view using a local browser preference. `/?welcome=1` always opens the welcome page. The student dashboard now lives at `/student`; the driver page remains `/driver`.

`/signin` and `/signup` are deliberately **demo** access forms. Any syntactically valid email and non-empty demo password work. Passwords are never sent or saved, and no real user account is created. Only the demo name, email and selected role are stored in sessionStorage. Demo access does not grant driver API permissions; sharing a real bus still requires its private key. Sign out clears the demo session and returning-user preference. `/help` explains tracking, privacy, and cross-phone HTTPS requirements.

The theme control is now a two-state light/dark switch. Without a saved choice it follows the device's theme. The map base layer loads even when the fleet is empty; bus markers still require real recent GPS fixes. Set `MAP_CENTER_LAT`, `MAP_CENTER_LNG`, and `MAP_ZOOM` for the actual campus (defaults show Nigeria, not a claimed bus location). The standard OpenStreetMap tile service is used with visible attribution, browser caching, and an origin referrer. See [its usage policy](https://operations.osmfoundation.org/policies/tiles/) before deploying at scale.


## Vercel preview deployment

Import the GitHub repository into Vercel with this project as the root directory. Use the Express framework detection and `npm run build` as the build command. The build generates Tailwind CSS and copies locally licensed map/font files into `public/vendor` for Vercel's static CDN. The generated vendor directory is excluded from Git. Node 22 is specified in the package configuration, and EJS templates are included through `vercel.json`.

Use the preview to test UI, map tiles and demo access on phones. Do not upload `.env`, private fleet data, or driver keys. Optional public map settings are `MAP_CENTER_LAT`, `MAP_CENTER_LNG`, and `MAP_ZOOM`.

The live backend is still a single-process pilot: in-memory trips and private file-based registrations are not shared across serverless instances. A persistent backend/shared datastore is needed before depending on live tracking on Vercel. No production deployment is performed by committing or pushing this repository.

[Express on Vercel](https://vercel.com/docs/frameworks/backend/express) documents static file handling and Express support. The next implementation sequence is in [the settings and tour plan](docs/next-steps.md).

## Profile, settings and Nigeria map

`/profile` edits the current tab's demo name, optional email and default role. It does not create a verified identity or grant driver API access. `/settings` controls light/dark/device appearance, reduced motion, and whether returning users skip the welcome page. These preferences are stored on the device, while the demo profile stays in sessionStorage. Settings also clears the saved bus/pickup selection or resets device preferences without signing out.

Sign-out is available in the header/mobile menu and account pages. It clears the demo profile, saved pickup and returning-workspace preference while retaining appearance settings. Leaving a driver page still invokes the existing GPS-stop/pause behavior.

The default map now opens on Nigeria, centered at 9.0820 N, 8.6753 E and fitted to a broad country view on narrow screens. Explicit map-center/zoom environment settings continue to override the default. Recenter returns to Nigeria when no bus/route is selected; actual GPS and route geometry take priority when selected.
