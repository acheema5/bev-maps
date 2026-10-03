# Bev Maps: rules for every agent

Read `VISION.md` before starting any task. It is the source of truth for what we build. If code and VISION.md disagree, flag it rather than silently picking one.

**Then read your side's instructions. They're required, not optional:**

- Working on the UI → `frontend/INSTRUCTIONS.md`
- Working on store search, routing, guidance, or fog of war → `backend/INSTRUCTIONS.md`

If you can't tell which side a task belongs to, ask before editing anything.

## Who owns what

| Path | Owner | Package name |
|---|---|---|
| `frontend/` (including `app/api/**`) | Matt (@mbwiller) | `frontend` |
| `backend/core/` | Arjun (@acheema5) | `backend-core` |
| `backend/server/` | Arjun (@acheema5) | `backend-server` |
| `shared/` | Both, via `contract/*` PRs | `shared` |
| Root files, `.github/`, `CLAUDE.md`, `VISION.md` | Both, via `chore/*` PRs | n/a |

## Rules that apply to both sides

1. **Stay in your lane.** Never edit the other side's folder. Ask in your PR description instead.
2. **The contract is the only meeting point.** Build against `shared/contract.ts`, never against the other side's internals. `backend-server` is imported only from `frontend/app/api/**`.
3. **Contract changes are their own PR**, on a `contract/<thing>` branch, approved by the other owner.
4. **v1 only.** Scope is the five pieces in VISION.md → Scope.
5. **One lockfile.** Install from the root with `-w <workspace>`. On a lockfile conflict, take main's version and rerun `npm install`.
6. **Never commit keys.** They live in Vercel environment variables and `.env.local`.
7. **Never push to `main`.** Branch (`ui/*`, `be/*`, `contract/*`, `chore/*`), open a PR, and merge after CI and the integrator agent pass.

## Commands

```bash
npm install                 # once, at the repo root
npm run typecheck           # shared, backend-core, backend-server
npm test                    # every workspace with a test script
npm run build               # frontend (Next.js)
npm run dev                 # frontend dev server
```

## The integrator agent

`.github/workflows/integrator.yml` runs on every PR. It checks the PR against the contract, VISION.md, these rules, and the other side's open PRs, then posts one review comment and keeps it updated. Comment `@claude <request>` on a PR to ask it something or have it push a fix. To run the same checks locally before opening a PR, ask Claude Code to "use the integrator agent on this branch" (`.claude/agents/integrator.md`).
