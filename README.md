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
