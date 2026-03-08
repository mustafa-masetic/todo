# Todo App (React + TypeScript + SQLite)

Modern full-stack todo app using:
- React + TypeScript + Vite
- Mantine UI (modern component library)
- Express API
- SQLite (via `better-sqlite3`)
- JWT auth with user accounts
- Collaborative spaces, members, and invites
- User profile fields: first name, last name, gender, email
- App navigation: Home, Spaces, Tasks

## Quick start

1. Install dependencies:

```bash
pnpm install
```

2. Run both frontend and backend:

```bash
pnpm dev
```

Optional: set a JWT secret before starting the server:

```bash
export JWT_SECRET="replace-with-a-strong-secret"
```

3. Open:
- Frontend: http://localhost:5173
- API: http://localhost:4000/api/spaces

## Collaboration features

- Create spaces
- Invite users to spaces by email (owner only)
- Accept invites from invited account
- View members in each space
- Manage todos per space
- Edit profile from profile dropdown menu
- Theme chooser in top navigation
- Account pages:
  - `/account/profile`
  - `/account/settings`
- Tasks page:
  - `/tasks` loads all tasks by default
  - Space dropdown filter
  - Search activates at 3+ characters
  - 10 items per page with pagination
- Space management page:
  - `/spaces` shows all spaces
  - `/spaces/:spaceSlug/:spaceId` for members, invites, and tasks

## Scripts

- `pnpm dev` - run client and server together
- `pnpm build` - build both apps
- `pnpm start` - run compiled server
- `pnpm test:e2e` - run Playwright tests
- `pnpm test:e2e:headed` - run Playwright in headed mode
- `pnpm test:e2e:ui` - run Playwright UI mode
- `pnpm test:e2e:install` - install Playwright browsers

## E2E tests

- Playwright config: `playwright.config.ts`
- Tests directory: `Test/`
- Test id attribute: `data-test-id`

Run locally (starts app via `pnpm dev` automatically):

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm test:e2e
```

Run against deployed environment (no local dev server):

```bash
PLAYWRIGHT_BASE_URL=http://217.160.34.25:8081 pnpm test:e2e
```

Optional env vars for login-based tests:

- `E2E_EMAIL`
- `E2E_PASSWORD`

## CI/CD staging -> production

This repo includes a GitHub Actions pipeline at `.github/workflows/deploy.yml`:

1. Build and push images to GHCR (`todo-server`, `todo-client`) tagged by commit SHA.
2. Deploy the same tag to staging (`todo-staging`) on port `8081`.
3. Seed staging data by running `pnpm run seed:data` against staging API.
4. Run smoke tests against staging (`/` and `/api/spaces`).
5. Run Playwright E2E tests against staging.
6. Deploy the same validated tag to production (`todo-prod`) on port `8080`.

Deploy compose template: `infra/deploy/docker-compose.deploy.yml`.

Required GitHub repository secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `GHCR_READ_TOKEN`
- `STAGING_JWT_SECRET`
- `PROD_JWT_SECRET`

Optional secrets for login-based Playwright tests:

- `E2E_EMAIL`
- `E2E_PASSWORD`
