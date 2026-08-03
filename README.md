# Clark County Digital Equity Assistant (`cc-chatbot-v2`)

A Next.js chatbot that helps Clark County residents find internet plans and digital-equity resources available at their address, plus an `/admin` dashboard for reviewing usage analytics.

For a full breakdown of how the pieces fit together (routes, data stores, external services, known gaps), see [ARCHITECTURE.md](ARCHITECTURE.md).

## What it does

1. A resident types their address and a question into the chatbot ([components/chat/Chatbot.tsx](components/chat/Chatbot.tsx)).
2. The app geocodes the address (OpenStreetMap Nominatim), checks broadband availability (Neon Postgres `points` table), matches ISP plans from a bundled CSV, and finds nearby digital-equity resources — all via `POST /api/lookup`.
3. That result is folded into a context block sent to Claude (`claude-sonnet-4-6`, via `POST /api/chat`), which streams back a conversational answer alongside plan/service cards.
4. Every exchange is logged to Postgres (`chat_logs`) for the `/admin` analytics dashboard.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) → Anthropic Claude
- **Neon** serverless Postgres (`@neondatabase/serverless`)
- **Papaparse** for the bundled plans CSV
- **Recharts** for the admin dashboard

## Getting started

Requires the env vars below in `.env.local`, then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). (Note: the Claude Code preview config in `.claude/launch.json` runs dev on port **3001** instead — `npm run dev -- -p 3001`.)

### Environment variables

Create `.env.local` (git-ignored, no `.env.example` is checked in yet) with:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API auth, used by `/api/chat` |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `ADMIN_SECRET` | Yes | Password checked by `/api/admin/login` |
| `REACT_APP_API_URL`, `MAPBOX_API_KEY`, `S3_BUCKET`, `S3_POINTS_KEY`, `AWS_REGION` | No | Not currently read by any code — leftovers from an earlier iteration; safe to omit |

The `points` and `chat_logs` tables must already exist on the Neon instance — there are no migration files in this repo (see [ARCHITECTURE.md §3](ARCHITECTURE.md#3-data-stores--static-data)).

## Scripts

```bash
npm run dev     # start dev server (next dev)
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

There is no `deploy` script and no CI/CD or infra-as-code committed to this repo — see [ARCHITECTURE.md §6](ARCHITECTURE.md#6-hosting--infrastructure--current-state) for what's missing to make deployment reproducible.

## Known gaps

- **`/admin` is effectively unauthenticated in practice.** The login flow sets an `admin_auth` cookie, but [middleware.ts](middleware.ts) is currently a no-op and nothing validates that cookie before serving `/admin` pages or `GET /api/admin/analytics`. Fix before any real deployment — see [ARCHITECTURE.md §2](ARCHITECTURE.md#2-logical-services-all-inside-one-app).
- No schema migrations for the Postgres tables the app depends on.
- No hosting config checked in (Vercel-shaped stack, but no `vercel.json`).

## Project structure

See [ARCHITECTURE.md §8](ARCHITECTURE.md#8-directory-reference) for the full directory reference.
