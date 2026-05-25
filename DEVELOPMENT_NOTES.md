# Development Notes

This file is a quick recovery guide for future development sessions.

## Project summary

This is a full-stack todo/collaboration app.

- Frontend: React, TypeScript, Vite, Mantine UI
- Backend: Express, TypeScript
- Database: SQLite with `better-sqlite3`
- Auth: JWT user login/register
- Tests: Playwright E2E
- Deployment: GitHub Actions, Docker, staging, production

Core app areas:

- User auth and profile/settings
- Collaborative spaces
- Space invites and members
- Tasks with status and assignee support
- Admin user/space/task management
- Playwright E2E coverage

## Before deleting forgotten work

If the working tree has old changes and the original task is forgotten, do not delete immediately.

First inspect:

```bash
git status --short
git diff --stat
git diff --name-only
```

If unsure, stash instead of deleting:

```bash
git stash push -u -m "forgotten WIP before cleanup"
```

Then the repo can be cleaned safely if needed:

```bash
git reset --hard HEAD
git clean -fd
```

To recover the stash later:

```bash
git stash list
git stash show --stat stash@{0}
git stash apply stash@{0}
```

## Running the app locally

Install dependencies:

```bash
corepack enable
corepack prepare pnpm@10.6.2 --activate
pnpm install
```

Run frontend and backend:

```bash
pnpm dev
```

Local URLs:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000`

## Running Playwright tests

The Playwright config requires `PLAYWRIGHT_BASE_URL`.

Run all E2E tests against local app:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e
```

Run all E2E tests against staging:

```bash
PLAYWRIGHT_BASE_URL=http://217.160.34.25:8081 pnpm test:e2e
```

Run one test file:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e tests/invites.spec.ts
```

Run headed:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e:headed tests/invites.spec.ts
```

## Admin-gated tests

Some tests are skipped unless admin credentials are provided.

Required variables:

- `E2E_EMAIL`
- `E2E_PASSWORD`

Example:

```bash
E2E_EMAIL=mustafa.masetic@example.com E2E_PASSWORD='TestPass123!' PLAYWRIGHT_BASE_URL=http://217.160.34.25:8081 pnpm test:e2e
```

Quote passwords that contain `!` because shells such as zsh can treat it specially.

Admin-gated suites include:

- `tests/admin.spec.ts`
- the authenticated section of `tests/navigation.spec.ts`

Other suites may still run without admin credentials, but cleanup of temporary users may be skipped.

## Dependency recovery

If tests fail with a missing Playwright module, for example:

```text
Cannot find module ... @playwright/test/cli.js
```

then dependencies are likely incomplete or installed with the wrong pnpm version.

Fix:

```bash
corepack enable
corepack prepare pnpm@10.6.2 --activate
pnpm install
```

Then rerun tests.

## Current likely WIP area

Recent uncommitted work may involve Playwright stability and cleanup:

- E2E test cleanup using admin credentials
- Invite accept/decline flows
- Spaces/tasks/search reliability
- Generated screenshots from manual/debug Playwright runs
- `scripts/openai-playwright.mjs` automation helper

Screenshots in the repo root are usually debug artifacts and can often be removed after confirming they are not needed.

## Useful debugging commands

Inspect test report:

```bash
pnpm exec playwright show-report
```

Run a single project:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm exec playwright test --project=chromium
```

Run one test by title:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm exec playwright test -g "accepts an invitation"
```
