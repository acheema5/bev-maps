# Bev Maps: rules for every agent

Read `VISION.md` before starting any task. It is the source of truth for what we build. If code and VISION.md disagree, flag it rather than silently picking one.

## Who owns what

| Path | Owner | Contents |
|---|---|---|
| `frontend/` | Matt (@mbwiller) | Next.js app: screens, camera, guide, minimap, Home Screen shell |
| `backend/core/` | Arjun (@acheema5) | Pure on-phone logic: guidance, fog of war. No UI, no network, no keys |
| `backend/server/` | Arjun (@acheema5) | Server-only: store search, ranking, routing. Holds API keys |
| `shared/` | Both | `contract.ts` (types both sides build against) and `fixtures.ts` |

## Rules

1. **Stay in your folder.** A frontend session edits `frontend/` only; a backend session edits `backend/` only. If you need something from the other side, write it up in your PR description and don't edit their code.
2. **Build against `shared/contract.ts`, not the other side's internals.** The frontend may import `@bev-maps/shared` and `backend/core` but **never** `backend/server` (that would leak API keys into the phone bundle). Until the real API is live, the frontend uses `shared/fixtures.ts`.
3. **Contract changes are their own PR.** Any edit to `shared/` goes in a small, separate PR labeled `contract-change`, and it needs approval from the *other* owner before merge. Update `fixtures.ts` in the same PR so it keeps compiling.
4. **v1 only.** v1 is the five pieces in VISION.md → Scope. Anything else goes under Later or Open decisions in VISION.md; don't build it.
5. **When unsure, pick the simpler option** and record the choice in VISION.md → Decision log.
6. **Never commit keys.** Server keys live in Vercel environment variables. `.env*` is gitignored.
7. **Real-device testing.** Camera, location, and compass need HTTPS and a real iPhone, so test on the Vercel preview URL.

## Git workflow

- Never push to `main`. Branch, open a PR, merge after CI and the integrator agent pass.
- Branch names: `ui/<thing>` (frontend), `be/<thing>` (backend), `contract/<thing>`, `chore/<thing>`.
- Keep PRs small: one feature or fix each. Draft PRs are fine for work in progress.
- Rebase on `main` before asking for review: `git fetch && git rebase origin/main`.
- Prefer squash merge, then delete the branch.

## Commands

```bash
npm install          # once, at the repo root
npm run typecheck    # all workspaces
npm test             # all workspaces
```

## The integrator agent

`.github/workflows/integrator.yml` runs on every PR and checks it against the contract, VISION.md, these rules, and the other open PRs. It posts one review comment and keeps it updated. Comment `@claude <request>` on a PR to ask it something or have it push a fix. Before opening a PR, you can run the same checks locally by asking Claude Code to "use the integrator agent on this branch" (`.claude/agents/integrator.md`).
