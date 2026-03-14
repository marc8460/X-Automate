# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Rules

**File edits only — no shell commands.**

- Only modify source files using the Edit or Write tools.
- Never run shell commands (Bash tool), including `npm`, `node`, `fuser`, `pkill`, or any other CLI commands.
- Never start, stop, or restart the development server or any background process.
- Never run database commands (`db:push`, `psql`, etc.).
- Never run builds, type checks, or linters.
- If a task requires running a command, describe what the user should run instead of running it yourself.

## Commands

```bash
# Development
npm run dev          # Start Express backend (port 5000, serves frontend in dev)
npm run dev:client   # Start Vite dev server only (port 5000)

# Build & Production
npm run build        # Build frontend (Vite) + backend (esbuild) → dist/
npm run start        # Run production server (dist/index.cjs)

# Type checking
npm run check        # Run tsc type checking (no emit)

# Database
npm run db:push      # Push schema changes to PostgreSQL (no migrations needed)
```

There are no test commands — this project has no automated test suite.

## Architecture

This is a full-stack Twitter/X AI influencer automation dashboard. A single Express server handles both API routes and static file serving.

**Monorepo layout:**
- `client/` — React 19 SPA (Vite, TailwindCSS v4, shadcn/ui, Framer Motion)
- `server/` — Express 5 REST API
- `shared/schema.ts` — Single source of truth: Drizzle ORM table definitions + Zod validation schemas shared by both sides

**Request flow:**
1. Frontend (`client/src/lib/hooks.ts`) calls API via TanStack Query hooks wrapping `apiRequest()` from `queryClient.ts`
2. `server/routes.ts` (~1000 lines) handles all endpoints; validates input with Zod schemas from `shared/schema.ts`
3. `server/storage.ts` provides a typed `IStorage` interface; all DB access goes through the singleton `storage` instance
4. `server/db.ts` — Drizzle ORM + PostgreSQL connection via `DATABASE_URL`

**Key integrations:**
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for text, `llama-4-scout-17b-16e-instruct` for vision (base64 image analysis)
- **Twitter**: `twitter-api-v2` with OAuth 1.0a credentials from env vars
- **Threads**: Meta Threads Graph API (`graph.threads.net/v1.0`) via `server/threads.ts`; token from `THREADS_ACCESS_TOKEN` env var or `settings` table
- **Trending topics**: Google Trends RSS feed (3-min cache) with Groq AI fallback if RSS fails
- **File uploads**: Multer with disk storage to `uploads/` directory; served at `/uploads/*`
- **Push notifications**: Web Push via `web-push` package (`server/pushNotifications.ts`); requires VAPID keys

**Background services (started at boot in `server/index.ts`):**
- `engagementPoller` — polls Twitter/Threads engagement metrics every 60s; broadcasts updates to SSE clients
- `creatorMonitor` — checks followed creators for new posts every 45s (in batches of 10, 2s delay); sends push notifications on new content

**Real-time updates:** SSE (Server-Sent Events) pattern via `addSseClient`/`removeSseClient`/`broadcastUpdate` in `server/engagementPoller.ts`. Frontend connects to an SSE endpoint to receive live metric updates.

**Path aliases (tsconfig + vite):**
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

## Key Patterns

**Adding a new API endpoint:** Define Zod schema in `shared/schema.ts`, add storage method to `IStorage` interface and `DatabaseStorage` class in `server/storage.ts`, add route in `server/routes.ts`, add TanStack Query hook in `client/src/lib/hooks.ts`.

**UI components:** Use shadcn/ui primitives from `client/src/components/ui/`. Compose with `cn()` (clsx + tailwind-merge) for conditional classes. All cards use the `glass-panel` CSS utility class for the frosted-glass aesthetic.

**Dark theme:** Purple/pink gradient aesthetic defined via CSS variables in `client/src/index.css`. Primary: purple (288°), Accent: pink (320°), Background: deep purple-tinted dark. Avoid hardcoding colors — use CSS variable tokens.

**Data seeding:** `POST /api/seed` is idempotent and called automatically on app load via `SeedOnMount` in `App.tsx`. It checks for existing data before inserting.

**Groq AI calls:** Always set `temperature` based on the `seductiveness` setting from the settings table (fetched via `GET /api/settings/persona`). Vision requests encode images as base64 and pass them as `image_url` content blocks.

## Development Server

The Express server always runs on port 5000. Port conflicts occur frequently in this development environment.

Before starting the development server, always clear port 5000:

```bash
fuser -k 5000/tcp
```

Then start the dev server:

```bash
npm run dev
```

Never use `pkill node` — it will kill the Claude Code process and restart the shell session.

## Threads Comment Structure

Threads comments returned from the Threads API include these fields:

```
id
text
username
timestamp
replied_to.id
```

The frontend converts this into:

```
id
authorUsername
createdAt
parentCommentId
```

Comment nesting must rely **only** on `parentCommentId`. Never attempt to guess parent comments based on order, timestamps, or previous commenters.

## Comment Tree Rendering

Build the comment tree as follows:

1. Build a `commentMap` keyed by `comment.id`
2. Build a `childrenMap` keyed by `parentCommentId`
3. If `parentCommentId` exists in `commentMap` → attach as child
4. Otherwise treat as a top-level comment

Never use heuristics such as previous comment position, chronological guessing, or author comparison. Rendering must support unlimited nesting depth.

## Threads Avatar Rules

The Threads API does **not** provide profile pictures for commenters. Avatar rendering must follow this fallback chain:

1. `ownProfilePicUrl` (for the connected account)
2. `https://unavatar.io/threads/{username}`
3. `https://unavatar.io/instagram/{username}`
4. `https://unavatar.io/{username}`
5. Fallback initial avatar

Avatar logic must be implemented in `client/src/components/ThreadsAvatar.tsx`.

## Component Structure

Large UI files such as `UnifiedInbox.tsx` should avoid inline logic. Prefer separate components:

- `ThreadsAvatar`
- `ThreadsComment`
- `ThreadsReply`
- `ThreadsReplyComposer`

This makes AI-assisted code edits safer and reduces regression bugs.

## Environment Variables Required

```
DATABASE_URL          # PostgreSQL connection string
GROQ_API_KEY          # Groq LLM API key
TWITTER_API_KEY       # Twitter OAuth 1.0a consumer key
TWITTER_API_SECRET    # Twitter OAuth 1.0a consumer secret
TWITTER_ACCESS_TOKEN  # Twitter access token
TWITTER_ACCESS_SECRET # Twitter access token secret
THREADS_ACCESS_TOKEN  # Meta Threads long-lived access token (optional; can also be stored in settings table)
VAPID_PUBLIC_KEY      # Web Push VAPID public key (optional; enables push notifications)
VAPID_PRIVATE_KEY     # Web Push VAPID private key (optional)
```
