# Aura - AI Influencer Automation Dashboard

## Overview
Full-stack multi-platform AI influencer automation dashboard for a female AI persona. Dark creator aesthetic with purple/pink neon glass panels and Framer Motion animations. Supports X (Twitter) and Threads, with Instagram/TikTok planned.

## Architecture
- **Frontend**: React 19 + Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion, TanStack Query, wouter routing
- **Backend**: Express on port 5000, Drizzle ORM with PostgreSQL (pg driver, NOT neon-serverless)
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for text generation, `meta-llama/llama-4-scout-17b-16e-instruct` for vision/image analysis
- **Twitter**: `twitter-api-v2` package for real Twitter/X API integration (OAuth 1.0a)
- **Threads**: Meta Threads API via REST (long-lived access token)
- **File Uploads**: Multer with disk storage to `uploads/` directory, served statically
- **Fonts**: Outfit (display) + Inter (UI)

## Key Design Rules
- Persona is a **woman influencer** who never reveals she's AI. All UI copy reflects a "natural human creator" workflow.
- Dark theme with CSS variables, `glass-panel` utility class for frosted glass cards.

## Multi-Platform Architecture
- **PlatformContext**: Global React context tracks selected platform (all/x/threads/instagram/tiktok)
- **PlatformSwitcher**: Custom dropdown in TopNav (replaced Radix DropdownMenu due to React 19 crash)
- **Platform field**: `comment_threads` and `live_follower_interactions` tables have a `platform` column (default 'x')
- **API filtering**: `/api/engagement/live-comments?platform=x` and `/api/engagement/live-interactions?platform=x` support platform query param
- **Hooks**: `useLiveCommentThreads(platform)` and `useLiveFollowerInteractions(platform)` accept optional platform filter

## Database Schema (shared/schema.ts)
Tables: tweets, media_items, engagements, follower_interactions, live_follower_interactions (with platform column), comment_threads (with platform column), trends, activity_logs, analytics_data, peak_times, settings

## Project Structure
```
client/src/
  pages/          - Dashboard, Composer, MediaVault, UnifiedInbox, ViralEngine, Analytics, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar, TopNav, PlatformSwitcher), platform (PlatformBadge)
  contexts/       - PlatformContext, AccountContext
  types/          - platform.ts (platform types and config)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + viral analysis + Twitter/Threads status + home timeline + seed
  twitter.ts      - Twitter API client module (getTwitterClient, testTwitterConnection)
  threads.ts      - Threads API client (getThreadsClient, testThreadsConnection, fetchUserProfile, fetchUserPosts, fetchPostReplies)
  engagementPoller.ts - Polls X mentions + Threads replies, delta-tracks likes/retweets/followers
  storage.ts      - DatabaseStorage with IStorage interface (platform-filtered queries)
  db.ts           - Drizzle + pg pool
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
uploads/          - User-uploaded media files (served statically)
```

## Twitter/X Integration
- **Credentials**: OAuth 1.0a via environment secrets: TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
- **server/twitter.ts**: `getTwitterClient()` returns TwitterApi instance or null; `testTwitterConnection()` verifies connection
- **Follower tracking**: Delta-based — compares current follower count with previous snapshot via `v2.me()` with `public_metrics`
- **Like/Retweet tracking**: Delta-based — compares tweet `public_metrics` via `v2.userTimeline()` against stored snapshots
- **Home timeline**: `v2.homeTimeline()` for browsing feed in Viral Engine (requires Basic tier)

## Threads Integration
- **Credentials**: THREADS_ACCESS_TOKEN environment secret (long-lived Meta access token)
- **server/threads.ts**: REST API client for Threads API v1.0
- **Polling**: Engagement poller fetches replies to user's threads posts, tracks follower delta
- **Status**: `/api/threads/status` endpoint checks connection

## Viral Comment Engine
- **4-mode workflow**: Browse Feed (X home timeline) | Screenshot Scan | Manual Entry → AI generates viral comments
- **Browse Feed (new)**: Fetches X home timeline via `/api/twitter/home-timeline`, displays posts with author/text/images/metrics, "Scan & Generate" button per post sends structured data to `/api/analyze-feed-post` for AI analysis
- **Feed post analysis**: `/api/analyze-feed-post` accepts structured post data, optionally downloads and analyzes images via vision model, generates 5 viral comments
- **Trend discovery**: Real Google Trends RSS feed as primary source, with Groq AI fallback
- **Screenshot Scan**: Upload/paste/drag a screenshot → Groq vision extracts text/metrics → generates comments
- **Manual Entry**: Paste post text and fill in metrics manually
- **Comment generation**: 5 comments per analysis with strategy labels, safest pick, high-visibility pick

## Engagement Poller
- Polls every 60 seconds when running
- X: fetches mentions via `v2.userMentionTimeline()`, delta-tracks likes/retweets/followers
- Threads: fetches replies to user's posts, delta-tracks followers
- SSE endpoint `/api/engagement/events` for real-time frontend updates
- All interactions tagged with `platform` field

## API Endpoints
- GET/POST: /api/tweets, /api/media, /api/engagements, /api/follower-interactions, /api/trends, /api/activity-logs, /api/analytics, /api/peak-times
- PATCH: /api/tweets/:id, /api/engagements/:id
- DELETE: /api/tweets/:id, /api/media/:id
- GET/PUT: /api/settings, /api/settings/:key
- POST: /api/media/upload (multipart form: file + mood + outfit)
- POST: /api/generate (AI tweet generation via Groq)
- POST: /api/seed (idempotent)
- GET: /api/twitter/status, /api/threads/status
- GET: /api/twitter/metrics, /api/twitter/peak-times
- GET: /api/twitter/home-timeline (X For You / Following feed)
- GET: /api/trending-topics?geo=US&category=all&timeWindow=24h&sortBy=volume
- POST: /api/analyze-post (AI post analysis + viral comment generation)
- POST: /api/analyze-feed-post (structured feed post → AI viral comments)
- POST: /api/scan-screenshot (screenshot → vision extraction + comments)
- GET: /api/engagement/live-comments?platform=x (platform-filtered)
- GET: /api/engagement/live-interactions?platform=x (platform-filtered)
- GET: /api/engagement/status
- POST: /api/engagement/pause, /api/engagement/resume
- POST: /api/engagement/generate-reply, /api/engagement/send-reply

## Environment Secrets
- GROQ_API_KEY — for AI content generation via Groq
- DATABASE_URL — PostgreSQL connection (auto-managed by Replit)
- TWITTER_APP_KEY — Twitter OAuth 1.0a App Key (optional, enables X features)
- TWITTER_APP_SECRET — Twitter OAuth 1.0a App Secret (optional)
- TWITTER_ACCESS_TOKEN — Twitter OAuth 1.0a Access Token (optional)
- TWITTER_ACCESS_SECRET — Twitter OAuth 1.0a Access Secret (optional)
- THREADS_ACCESS_TOKEN — Meta Threads API long-lived access token (optional, enables Threads features)

## Content Generation
- `/api/generate` reads persona settings (seductiveness, playfulness, dominance) from settings table
- 4-tier seductiveness system: wholesome (0-30), flirty (31-60), bold (61-80), max spice (81-100)
- Vision analysis via `llama-4-scout-17b-16e-instruct` when imageUrl is provided
- Temperature bumps to 1.0 at >80% seductiveness
