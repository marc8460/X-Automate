# Aura - AI Influencer Automation Dashboard

## Overview
Full-stack Twitter/X AI influencer automation dashboard for a female AI persona. Dark creator aesthetic with purple/pink neon glass panels and Framer Motion animations.

## Architecture
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion, TanStack Query, wouter routing
- **Backend**: Express on port 5000, Drizzle ORM with PostgreSQL (pg driver, NOT neon-serverless)
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for text generation, `meta-llama/llama-4-scout-17b-16e-instruct` for vision/image analysis
- **Twitter**: `twitter-api-v2` package for real Twitter/X API integration (OAuth 1.0a)
- **File Uploads**: Multer with disk storage to `uploads/` directory, served statically
- **Fonts**: Outfit (display) + Inter (UI)

## Key Design Rules
- Persona is a **woman influencer** who never reveals she's AI. All UI copy reflects a "natural human creator" workflow.
- Dark theme with CSS variables, `glass-panel` utility class for frosted glass cards.

## Database Schema (shared/schema.ts)
Tables: tweets, media_items, engagements, follower_interactions, trends, activity_logs, analytics_data, peak_times, niche_profiles, trending_posts (with tweetId for real tweets), comment_suggestions, behavior_limits, settings

## Project Structure
```
client/src/
  pages/          - Dashboard, ContentEngine, MediaVault, EngagementEngine, TrendScanner, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + trending system + Twitter API + seed
  twitter.ts      - Twitter API client module (getTwitterClient, testTwitterConnection)
  storage.ts      - DatabaseStorage with IStorage interface
  db.ts           - Drizzle + pg pool
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
uploads/          - User-uploaded media files (served statically)
```

## Twitter/X Integration
- **Dual mode**: Live Mode (real Twitter API) or Demo Mode (AI-simulated posts)
- **Credentials**: OAuth 1.0a via environment secrets: TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
- **server/twitter.ts**: `getTwitterClient()` returns TwitterApi instance or null if credentials missing; `testTwitterConnection()` verifies connection and returns handle
- **Discovery**: When connected, uses `client.v2.search()` with niche keywords; when disconnected, falls back to Groq AI simulation
- **Posting**: When connected, uses `client.v2.reply()` to post approved comments as real replies; when disconnected, marks as posted in DB only
- **Rate limiting**: Behavior limits (daily cap, hourly limit, cooldown) enforced before every post attempt
- **Status endpoint**: `GET /api/twitter/status` returns connection state + handle
- **UI indicators**: TrendScanner shows Live/Demo mode badge; Discover button says "Search Twitter" vs "Simulate Posts"; Post button says "Post to Twitter" vs "Post (Demo)"

## API Endpoints
- GET/POST: /api/tweets, /api/media, /api/engagements, /api/follower-interactions, /api/trends, /api/activity-logs, /api/analytics, /api/peak-times
- PATCH: /api/tweets/:id, /api/engagements/:id
- DELETE: /api/tweets/:id, /api/media/:id (also removes file from disk)
- GET/PUT: /api/settings, /api/settings/:key
- POST: /api/media/upload (multipart form: file + mood + outfit)
- POST: /api/generate (AI tweet generation via Groq: { style, topic?, seductiveness?, imageUrl? })
- POST: /api/seed (idempotent - checks if data exists first)
- **Twitter:**
  - GET: /api/twitter/status (connection check + handle)
- **Trending System:**
  - GET/POST/DELETE: /api/niches (niche profiles)
  - GET: /api/trending-posts (with optional ?nicheId filter, includes comments)
  - POST: /api/trending-posts/discover (real Twitter search OR AI simulation, based on connection)
  - POST: /api/trending-posts/:id/generate-comments (AI comment suggestions with vision analysis)
  - DELETE: /api/trending-posts/:id
  - PATCH: /api/comments/:id (approve/reject/edit)
  - POST: /api/comments/:id/post (real Twitter reply OR DB-only, with rate limit enforcement)
  - GET/POST: /api/behavior-limits (anti-bot settings)

## Environment Secrets
- GROQ_API_KEY — for AI content generation via Groq
- DATABASE_URL — PostgreSQL connection (auto-managed by Replit)
- TWITTER_APP_KEY — Twitter OAuth 1.0a App Key (optional, enables Live Mode)
- TWITTER_APP_SECRET — Twitter OAuth 1.0a App Secret (optional)
- TWITTER_ACCESS_TOKEN — Twitter OAuth 1.0a Access Token (optional)
- TWITTER_ACCESS_SECRET — Twitter OAuth 1.0a Access Secret (optional)

## Auto-Seed
App.tsx includes a `SeedOnMount` component that calls POST /api/seed on first load. The endpoint is idempotent.

## Content Generation
- `/api/generate` reads persona settings (seductiveness, playfulness, dominance) from settings table
- 4-tier seductiveness system: wholesome (0-30), flirty (31-60), bold (61-80), max spice (81-100)
- Vision analysis via `llama-4-scout-17b-16e-instruct` when imageUrl is provided
- Temperature bumps to 1.0 at >80% seductiveness

## Trending Opportunities
- Dual-mode: real Twitter search (live) or AI-simulated posts (demo)
- AI comment generation with 5 types: witty, flirty, insightful, disagreement, question
- Vision-aware: if trending post has image, analyzes it before generating comments
- Human approval workflow — comments must be approved before posting
- Real Twitter replies when connected, DB-only when in demo
- Anti-bot behavior limits: daily cap, hourly limit, cooldown, enforced on every post attempt
