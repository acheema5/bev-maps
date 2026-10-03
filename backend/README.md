# backend/

Owner: Arjun (@acheema5)

- `core/`: pure logic that runs on the phone (`guide()`, fog of war). No UI, no network, no keys. Implements the `GuideFn`, `RecordPositionFn`, and `RevealedPointsFn` types from `shared/contract.ts`.
- `server/`: server-only store search, open-now filtering, walking-time ranking, and routing. Holds Google Maps Platform keys. The frontend's `/api/find-bev` and `/api/route` routes are thin wrappers around this code.

Responses must match `FindBevResponse` and `RouteResponse` in `shared/contract.ts` exactly. A simulated walk (fake GPS and heading along a route, e.g. `?sim=1`) is part of this side's v1 work. See VISION.md → How we build it.

When scaffolding, add `"backend"` to the root `package.json` workspaces.
