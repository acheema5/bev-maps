# Frontend instructions: Matt and Matt's agents

Read this before every frontend task. You build everything the user sees and touches. Arjun and his agents build `backend/` in parallel. These rules keep the two sides from colliding.

Also read `VISION.md` (what we build) and `frontend/AGENTS.md` (this is Next.js 16: read the docs in `node_modules/next/dist/docs/` before writing Next.js code).

## Your lane

**You own:** everything in `frontend/`, including `frontend/app/api/**`.

**You never edit:** `backend/**`. If you need a change there, describe it in your PR under "Heads-up for the other side" and let Arjun's side make it.

**Shared, so edit only through a dedicated PR:** `shared/**`, root `package.json`, root `package-lock.json`, root `.gitignore`, `.github/**`, `CLAUDE.md`, `VISION.md`. See "Shared files" below.

## What you build (VISION.md → Scope)

| Piece | Where | Notes |
|---|---|---|
| Screen state machine | `app/page.tsx` | One screen: Home → Finding → Found → Navigate → Arrived, plus edge states. No route changes between steps (keeps camera permission alive) |
| Find Bev button and Finding Bev shimmer | `app/components/find-bev/` | Apple glass, system font stack (SF Pro), shimmer as the loading indicator |
| Camera view and four-state guide | `app/components/navigate/` | Full-screen rear camera; dashed-line arrow: STRAIGHT, LEFT, RIGHT, U_TURN |
| Minimap and fog of war rendering | `app/components/minimap/` | Top-left, accuracy circle, heading triangle, dark layer over color layer, revealed circles masked out |
| Sensors and permissions | `app/lib/sensors/` | GPS, compass (`webkitCompassHeading`), camera. Location on the Find Bev tap; camera and motion on the Enable camera tap |
| API route wrappers | `app/api/find-bev/route.ts`, `app/api/route/route.ts` | Thin: parse JSON → call Arjun's function → return JSON. No logic |
| Home Screen shell | `app/manifest.ts`, icons, `layout.tsx` | Standalone mode, safe areas, portrait, install hint |

Running several agents on the frontend at once? Give each one its own folder from the table, its own branch, and its own git worktree (see "Parallel agents").

## How you use the backend

You consume exactly three things from Arjun, and only through these imports:

```ts
// Types: the contract. Build against these, never against backend internals.
import type { FindBevResponse, WalkingRoute, Guidance } from "shared/contract";

// On-phone logic, safe in client components.
import { guide, recordPosition, revealedPoints } from "backend-core";

// Server-only. Import ONLY inside app/api/**/route.ts. Never in a component.
import { findBev, getRoute } from "backend-server";
```

- `backend-server` holds the Google Maps server key. Importing it from client code would ship the key to every phone. Treat a `backend-server` import outside `app/api/` as a bug.
- Until Arjun's functions are implemented (they currently throw "not implemented"), build against fixture data typed as `FindBevResponse`, so the compiler tells you the moment the contract drifts. Keep the fixture switch in one place (e.g. `app/lib/api.ts`) so going live is a one-line change.
- Handle every variant of each response union: `FOUND`, `NONE_NEARBY`, `ERROR`, and `OK`/`ERROR` for reroutes. Each one maps to a screen or an edge state.
- Units: meters, seconds, degrees. Heading is 0 = north, clockwise, measured where the back camera faces.
- `next.config.ts` needs `transpilePackages: ["shared", "backend-core", "backend-server"]` so Next compiles the workspace TypeScript.
- If you need something the contract doesn't have, don't work around it. Propose a contract change (below).

## Environment variables

| Variable | Owner | Exposure |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Frontend | Browser. Restrict it to our domain in Google Cloud |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Frontend | Browser. Vector map ID, needed for heading-up rotation |
| `GOOGLE_MAPS_SERVER_KEY` | Backend | Server only. Never reference it in frontend code |

Values live in Vercel and in your local `.env.local`, never in git.

## Shared files

These are where collisions happen. Rules:

1. **Dependencies:** always install from the repo root, targeting the workspace: `npm install <pkg> -w frontend`. Never run `npm install` inside `frontend/`. There is one lockfile, the root `package-lock.json`.
2. **Lockfile conflict:** don't hand-merge it. Take main's version, then rerun install:
   ```bash
   git checkout origin/main -- package-lock.json && npm install
   ```
3. **Contract change** (`shared/**`): open a separate small PR on a `contract/<thing>` branch, containing only the contract change. Make it additive when possible (new optional fields, new types). Arjun approves before merge. Your UI PR waits for it or uses a local stopgap.
4. **Other root files:** one small `chore/<thing>` PR, with the reason in the description.

## Git workflow

- Branch from fresh main: `git fetch && git switch -c ui/<thing> origin/main`.
- One feature per branch, small PRs. Open a draft early so Arjun's side can see what's coming.
- Rebase daily: `git fetch && git rebase origin/main`.
- Before opening a PR: run the integrator agent locally ("use the integrator agent on this branch"), plus `npm run build -w frontend`.
- Squash merge, then delete the branch.
- Never force-push `main`, and never push someone else's branch.

## Parallel agents

To run two or more Claude sessions on the frontend at the same time:

```bash
git worktree add ../bev-maps-minimap -b ui/minimap origin/main
cd ../bev-maps-minimap && npm install && claude
```

- One agent, one branch, one worktree, one folder from the table above.
- Only one agent at a time touches `app/page.tsx` (the state machine) or `layout.tsx`. Others expose components with clear props and let that agent wire them in.
- Remove finished worktrees: `git worktree remove ../bev-maps-minimap`.

## Testing

- Desk: a simulated walk at `?sim=1`. Arjun's side provides the fake GPS and heading samples; you play them back through the same code path as real sensors.
- Real device: camera, location, and compass need HTTPS on a real iPhone. Test on the Vercel preview URL from Safari, then Add to Home Screen and test again (standalone mode behaves differently).

## When in doubt

Choose the simpler option, stay inside `frontend/`, and write the question in your PR description. Never edit `backend/` to unblock yourself.
