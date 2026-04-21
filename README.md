# WhatTheTxxk

Full-stack project management app built with Next.js 16 (App Router), JavaScript, Tailwind CSS v4, Prisma 6, Postgres (Neon), and NextAuth v4.

> Tagline: *Stop planning. Start doing.*

## Stack

- **Framework:** Next.js 16 App Router — pure JavaScript, no TypeScript
- **Styling:** Tailwind v4 with CSS-first theme config (`src/app/globals.css`)
- **Database:** Postgres (Neon) via Prisma ORM v6
- **Auth:** NextAuth v4 with the Credentials provider + bcrypt
- **Deploy target:** Vercel

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env with your values (see "Environment" below)
cp .env.example .env   # or hand-edit

# 3. Apply Prisma migrations to your database
npx prisma migrate deploy

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 — the landing page. Create an account at `/login` (the form toggles between sign-in and register).

## Environment

Required variables in `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
NEXTAUTH_SECRET="random-32-plus-char-string"
NEXTAUTH_URL="http://localhost:3000"     # on Vercel, set to your deployed URL
```

Generate a `NEXTAUTH_SECRET` locally with `openssl rand -base64 32`.

`DATABASE_URL` must include `?sslmode=require` for Neon.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npx prisma migrate dev --name <name>` | Create + apply a new migration in development |
| `npx prisma migrate deploy` | Apply migrations in production (Vercel build step) |
| `npx prisma studio` | Browse the database in a GUI |

## Project structure

```
src/
  app/
    (auth)/login/              — login + register screen
    (main)/                    — app shell (sidebar + topbar + timer widget)
      dashboard/
      project/[id]/
        planner/               — Manager + Member views
        calendar/              — weekly grid
        timer/                 — Pomodoro dial
    (print)/project/[id]/export/   — chromeless print-ready report
    api/
      auth/                    — NextAuth + register
      projects/, tasks/        — CRUD + sub-resources
      notifications/           — list + mark read
      timer/                   — active session + end
  components/
    ui/                        — Avatar, StatusPill, Checkbox, Icon, …
    Sidebar.jsx, Topbar.jsx
    TaskDetailModal.jsx, NewTaskModal.jsx, MembersModal.jsx
    NotificationsBell.jsx
    TimerProvider.jsx, TimerWidget.jsx
    Toaster.jsx                — global toast context
  lib/
    prisma.js                  — singleton Prisma client
    auth.js, session.js        — NextAuth config + getCurrentUser()
    project-access.js          — role/membership checks
    project-queries.js         — dashboard project shaping
    task-queries.js            — planner tree + flat
    task-transitions.js        — status cascade + dependency unlock
    notifications.js           — notify() helpers
  hooks/useEscape.js
prisma/
  schema.prisma
  migrations/
```

## Role permissions

| Action | Owner | Member |
|---|---|---|
| Create project | ✓ | ✓ (creator auto-becomes OWNER) |
| Edit / delete project | ✓ | — |
| Invite members + set job | ✓ | — |
| Create tasks / subtasks / dependencies | ✓ | — |
| Assign tasks | ✓ | — |
| Bin / restore / permanent delete | ✓ | — |
| Approve / Reject review | ✓ | — |
| Request review (IN_PROGRESS → PENDING_REVIEW) | — | ✓ (assignee only) |
| Start focus session | ✓ | ✓ (assignee only) |
| Export PDF | ✓ | ✓ |

Enforced both in API routes (`src/lib/project-access.js`) and reflected in the UI.

## PDF Export

Clicking **Export** on a project card:
1. `POST /api/projects/:id/export` — creates an `ExportLog` row, returns a URL.
2. Browser opens `/project/:id/export` in a new tab.
3. The chromeless print page queries the current project state, renders the report, and auto-triggers `window.print()` after 400ms. Use the browser's "Save as PDF" destination.

The Dots menu on each project card opens the **Recent exports** history (up to 10 entries from `GET /api/projects/:id/exports`).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Import Project** → select the repo → keep the default build settings (Next.js is auto-detected).
3. Add environment variables in **Project Settings → Environment Variables**:
   - `DATABASE_URL` — your Neon connection string with `?sslmode=require`
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://<your-deployment>.vercel.app`
4. Add the Prisma migration step to **Build & Development Settings → Build Command**:
   ```
   prisma migrate deploy && next build
   ```
   (or leave the build command as `next build` and add `prisma migrate deploy` as a separate step in your workflow.)
5. Deploy.

### Test the production build locally first

```bash
npm run build
npm start
```

Hit http://localhost:3000 and walk through:
- Register → dashboard
- Create project → open planner
- Invite someone, assign a task, request review, approve
- Start a focus session from the task detail modal → timer page → floating pill on planner
- Export a project PDF

If all of that works locally in production mode, Vercel deploy should be clean.

## Notes

- The app is desktop-first. Mobile responsiveness (below `md`) is partial — the sidebar does not yet collapse to icons on small screens.
- The command palette triggered by ⌘/Ctrl+K is a placeholder toast until the search service is built.
- Activity logs on the task detail modal show only `createdAt` + current status. A full event history model is future work.
- Notifications poll every 30s while the panel is open. There's no push / WebSocket layer yet.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Esc` | Close any open modal |
| `⌘/Ctrl + K` | Search (placeholder) |
| `Enter / Space` | Activate a focused task card to open its detail |

## Generated with

This project uses Claude Code. The full build spec lives in `../CLAUDE.md`.
