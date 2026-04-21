# WhatTheTxxk

Full-stack project management app built with Next.js 16 (App Router), JavaScript, Tailwind CSS v4, Prisma 6, Postgres (Neon), and NextAuth v4.

> Tagline: *Stop planning. Start doing.*

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

