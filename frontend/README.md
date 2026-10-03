# Bev Maps frontend

Everything you see and touch: the Find Bev screen, the camera view with its guide arrow, the fog-of-war minimap, sensors, and the Home Screen shell. Read `../VISION.md` and `INSTRUCTIONS.md` before changing anything.

## Run it

From the repo root (one lockfile, so never `npm install` in here):

```bash
npm install
npm run dev               # http://localhost:3000
npm test -w frontend      # unit tests (vitest)
npm run lint -w frontend
npm run typecheck -w frontend
```

A computer gets "Bev Maps lives on your phone." Add a flag to work at a desk (`sim` and `fixture` arrive with the find-bev and sensors PRs):

| URL | What it does |
|---|---|
| `/?debug=1` | Allows a computer; debug panel |
| `/?sim=1` | Simulated walk along the fixture route |
| `/?fixture=found\|none\|error\|slow` | Force a canned `/api/find-bev` answer |

Camera, location, and compass need HTTPS and a real phone: use the Vercel preview URL in Safari, then Add to Home Screen and test again.

## Environment

`.env.local` lives in this folder (Next only loads env files from the app directory), never in git:

| Variable | Exposure |
|---|---|
| `GOOGLE_MAPS_SERVER_KEY` | Server only. Read by `backend-server` inside `app/api/**` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Browser. Maps JavaScript API only, referrer-restricted |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Browser. Vector Map ID with light and dark styles |

## Layout

| Path | What |
|---|---|
| `app/page.tsx` | The screen state machine (one URL, no route changes) |
| `app/lib/app-state.ts` | Its reducer: states, events, transitions |
| `app/lib/tuning.ts` | Every number we tune on a real sidewalk |
| `app/components/` | `find-bev/`, `navigate/`, `minimap/`, `shell/` |
| `app/lib/sensors/` | GPS, compass, camera, permissions |
| `app/api/**` | Thin wrappers around `backend-server`, the only place it may be imported |
