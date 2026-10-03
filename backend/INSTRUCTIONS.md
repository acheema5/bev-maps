# Backend instructions: Arjun and Arjun's agents

Read this before every backend task. You build everything that finds, routes, and computes. Matt and his agents build `frontend/` in parallel. These rules keep the two sides from colliding.

Also read `VISION.md`, especially "How a bev gets found" and "Technical shape".

## Your lane

**You own:** everything in `backend/` (`backend/core/` and `backend/server/`).

**You never edit:** `frontend/**`, including `frontend/app/api/**`. Matt's side writes those route files as thin wrappers that call your functions. If you need something there, describe it in your PR under "Heads-up for the other side".

**Shared, so edit only through a dedicated PR:** `shared/**`, root `package.json`, root `package-lock.json`, root `.gitignore`, `.github/**`, `CLAUDE.md`, `VISION.md`. See "Shared files" below.

## What you build (VISION.md → Scope)

| Piece | Where | Runs on | Notes |
|---|---|---|---|
| `findBev()` | `server/find-bev.ts` | Server | Places search → open now and on arrival → nearest ~5 → walking-time matrix → shortest walk → route |
| `getRoute()` | `server/route.ts` | Server | Reroute from the current position to the chosen destination |
| `guide()` | `core/guidance.ts` | Phone | Snap to route, aim ~25 m ahead, arrow state with 30°/135° thresholds and ~10° hysteresis, off-route, arrived |
| Fog of war data | `core/fog.ts` | Phone | `recordPosition()` / `revealedPoints()`, 15 m reveal radius, saved on the phone |
| Simulated walk | `core/sim.ts` | Phone | Fake GPS and heading samples along a route, so the frontend can demo `?sim=1` at a desk |
| Google Maps setup | n/a | n/a | Server key, field masks, budget alert |

Running several agents on the backend at once? Give each one its own file or folder from the table, its own branch, and its own git worktree (see "Parallel agents").

## Your public surface is the contract

The frontend uses only these, and you must keep them stable:

```ts
// backend-server: imported only by frontend/app/api/**/route.ts
findBev(request: FindBevRequest): Promise<FindBevResponse>
getRoute(request: RouteRequest): Promise<RouteResponse>

// backend-core: imported by frontend client components
guide(input: { position, accuracyM, headingDeg, route, previous? }): Guidance
recordPosition(position: LatLng, accuracyM: number): void
revealedPoints(): LatLng[]
```

- All request and response types come from `shared/contract`. Return exactly those shapes: same field names and units, and only the listed `status` values.
- **Never throw out of `findBev` or `getRoute` once implemented.** Catch failures and return `{ status: "ERROR", message }`. Return `NONE_NEARBY` with `searchedRadiusM` when nothing is open within walking range. The frontend shows a screen for each variant.
- Units: meters, seconds, degrees. Heading is 0 = north, clockwise, measured where the back camera faces. `relativeAngleDeg` is -180..180, positive = route is to the right.
- Renaming or removing an export, or changing its signature, breaks the frontend. That's a contract change (below), not a refactor.
- `backend-core` ships to the phone: no secrets, no Node-only APIs, no network calls. `localStorage` is fine, but guard it (`typeof window !== "undefined"`, try/catch).
- `backend-server` must never reach the phone: add `import "server-only"` at the top of `server/index.ts` so a stray client import fails the build.
- The comment in `server/find-bev.ts` saying it's "wired into frontend/app/api/find-bev by the integration agent" is now out of date. Matt's side writes that wrapper. Update the comment the next time you touch the file.

## Environment variables

| Variable | Owner | Exposure |
|---|---|---|
| `GOOGLE_MAPS_SERVER_KEY` | Backend | Server only. Read it only in `backend/server/`. Never prefix it with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID` | Frontend | Browser. Not yours to change |

Values live in Vercel and in your local `.env.local`, never in git. Set a Google Cloud budget alert on day one.

## Shared files

These are where collisions happen. Rules:

1. **Dependencies:** always install from the repo root, targeting your workspace: `npm install <pkg> -w backend-server` (or `-w backend-core`). There is one lockfile, the root `package-lock.json`. Keep `backend-core` dependencies close to zero, since they ship to every phone.
2. **Lockfile conflict:** don't hand-merge it. Take main's version, then rerun install:
   ```bash
   git checkout origin/main -- package-lock.json && npm install
   ```
3. **Contract change** (`shared/**`): open a separate small PR on a `contract/<thing>` branch, containing only the contract change. Make it additive when possible (new optional fields, new types). Matt approves before merge. The `sim.ts` sample type is the first expected one: add a `SimSample` type to the contract before building the simulator.
4. **Other root files:** one small `chore/<thing>` PR, with the reason in the description.

## Git workflow

- Branch from fresh main: `git fetch && git switch -c be/<thing> origin/main`.
- One feature per branch, small PRs. Open a draft early so Matt's side can see what's coming.
- **Don't commit straight to `main`**, not even scaffolding. Every change goes through a PR so the integrator agent and the other owner see it.
- Rebase daily: `git fetch && git rebase origin/main`.
- Before opening a PR: run the integrator agent locally ("use the integrator agent on this branch") and your tests.
- Squash merge, then delete the branch.
- Never force-push `main`, and never push someone else's branch.

## Parallel agents

To run two or more Claude sessions on the backend at the same time:

```bash
git worktree add ../bev-maps-guidance -b be/guidance origin/main
cd ../bev-maps-guidance && npm install && claude
```

- One agent, one branch, one worktree, one file or folder from the table above.
- `core/index.ts` and `server/index.ts` are the public entry points. Only one agent at a time edits them.
- Remove finished worktrees: `git worktree remove ../bev-maps-guidance`.

## Testing

- `guide()` and the fog logic are pure, so unit-test them heavily: each arrow threshold, hysteresis at the boundaries, off-route timing, arrival radius, and heading wraparound (359° → 1°).
- Server: test ranking and filtering against recorded Places/Routes responses (fixtures), not live API calls, so tests are free and repeatable.
- Real-world: tune the guidance constants on a real sidewalk using the Vercel preview URL on an iPhone.

## When in doubt

Choose the simpler option, stay inside `backend/`, and write the question in your PR description. Never edit `frontend/` to unblock yourself.
