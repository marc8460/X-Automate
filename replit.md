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
Tables: tweets, media_items, engagements, follower_interactions, trends, activity_logs, analytics_data, peak_times, niche_profiles (with `source` column: "auto"|"manual"), trending_posts (with tweetId, language, postAge, nicheMatchScore), comment_suggestions, behavior_limits, settings

## Project Structure
```
client/src/
  pages/          - Dashboard, ContentEngine, MediaVault, EngagementEngine, TrendScanner, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + trending system + Twitter API + seed
  twitter.ts      - Twitter API client module (getTwitterClient, testTwitterConnection, analyzeUserFeed, apiCache)
  storage.ts      - DatabaseStorage with IStorage interface + TrendingPostFilters
  db.ts           - Drizzle + pg pool
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
uploads/          - User-uploaded media files (served statically)
```

## Twitter/X Integration
- **Dual mode**: Live Mode (real Twitter API) or Demo Mode (AI-simulated posts)
- **Graceful fallback**: When Twitter API credits are depleted (Free tier), both search and feed analysis automatically fall back to Groq AI simulation
- **Credentials**: OAuth 1.0a via environment secrets: TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
- **server/twitter.ts**: `getTwitterClient()` returns TwitterApi instance or null; `testTwitterConnection()` verifies connection; `analyzeUserFeed()` does feed-based niche detection with fallback; `getCached()`/`setCache()` for in-memory API caching (10 min TTL)
- **Discovery**: Tries `client.v2.search()` first, falls back to Groq AI simulation on any Twitter API error
- **Posting**: When connected, uses `client.v2.reply()` to post approved comments as real replies; when disconnected, marks as posted in DB only
- **Rate limiting**: Behavior limits (daily cap, hourly limit, cooldown) enforced before every post attempt
- **API caching**: In-memory Map with TTL for search results (10 min) and niche detection (10 min) to avoid redundant API calls

## Trend Scanner V2 Features
- **Auto-niche detection**: `POST /api/niches/auto-detect` — analyzes user's X feed for hashtag/keyword clusters, maps to niche patterns (Tech, Crypto, Fitness, Fashion, etc). Falls back to AI-generated niche suggestions when Twitter credits depleted.
- **Weighted velocity scoring**: `trend_score = (likes/min * 3) + (replies/min * 5) + (retweets/min * 4) + (engagement_ratio * 100)`, normalized 0-100 per batch. Status: <30 rising, 30-70 trending, >70 viral.
- **Dashboard filters**: Time range (1h-24h), language (10 options), min engagement slider (0-1000), sort by (score/velocity/recent). Filters stored in frontend state and passed as query params.
- **Storage filtering**: `getTrendingPostsFiltered(filters)` builds dynamic Drizzle queries with `and`, `gte`, `eq`, `desc`.
- **Post metadata**: Each post stores `language`, `postAge` (minutes), `nicheMatchScore`. Cards display age badge, language tag, velocity/hr.

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
  - POST: /api/niches/auto-detect (feed analysis + AI fallback for niche detection)
  - GET: /api/trending-posts (with filters: ?nicheId, ?minLikes, ?minScore, ?lang, ?hours, ?sort)
  - POST: /api/trending-posts/discover (accepts { nicheId, language?, minFaves? }; real Twitter search with fallback to AI)
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
- Dual-mode with graceful degradation: real Twitter search → AI simulation fallback on credits/errors
- Auto-niche detection from X feed with AI fallback
- Weighted engagement velocity scoring (replies weighted 5x, retweets 4x, likes 3x, plus follower ratio)
- Dashboard filters: time range, language, min engagement, sort order
- AI comment generation with 5 types: witty, flirty, insightful, disagreement, question
- Vision-aware: if trending post has image, analyzes it before generating comments
- Human approval workflow — comments must be approved before posting
- Real Twitter replies when connected, DB-only when in demo
- Anti-bot behavior limits: daily cap, hourly limit, cooldown, enforced on every post attempt
- In-memory API cache (Map with TTL) to reduce redundant Twitter API calls
