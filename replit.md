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
Tables: tweets, media_items, engagements, follower_interactions, trends, activity_logs, analytics_data, peak_times, settings
(Trend Scanner tables were scrapped — no niche_profiles, trending_posts, etc.)

## Project Structure
```
client/src/
  pages/          - Dashboard, ContentEngine, MediaVault, EngagementEngine, ViralEngine, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + viral analysis + Twitter status + seed
  twitter.ts      - Twitter API client module (getTwitterClient, testTwitterConnection)
  storage.ts      - DatabaseStorage with IStorage interface
  db.ts           - Drizzle + pg pool
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
uploads/          - User-uploaded media files (served statically)
```

## Twitter/X Integration
- **Credentials**: OAuth 1.0a via environment secrets: TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
- **server/twitter.ts**: `getTwitterClient()` returns TwitterApi instance or null; `testTwitterConnection()` verifies connection

## Viral Comment Engine
- **3-step workflow**: Discover trending topics → Find post on X → Screenshot scan or manual entry → AI generates viral comments
- **Trend discovery**: Real Google Trends RSS feed (https://trends.google.com/trending/rss) as primary source, with Groq AI fallback. Results cached 5 minutes server-side.
- **No X API scraping**: User searches X manually — zero X API cost
- **Screenshot Scan (primary)**: Upload/paste/drag a screenshot of an X post → Groq vision (llama-4-scout) extracts post text, author, metrics, image descriptions automatically → then generates viral comments in one shot
- **Manual Entry (fallback)**: Paste post text and fill in metrics manually
- **Clipboard paste**: Ctrl+V pastes screenshot directly from clipboard
- **Post analysis**: AI analyzes post text + image + metrics + trend context using elite social engagement strategist prompt
- **Comment generation**: 5 comments per analysis with strategy labels (Authority/Curious/Contrarian/Relatable/Insightful), safest pick, high-visibility pick, and skip recommendations
- **Comment styles**: Safe, Balanced, Bold, Contrarian
- **Region support**: 10 geo regions for trend discovery
- **Frontend page**: `/viral` route, 3-step animated UI (trends → analyze → results)

## API Endpoints
- GET/POST: /api/tweets, /api/media, /api/engagements, /api/follower-interactions, /api/trends, /api/activity-logs, /api/analytics, /api/peak-times
- PATCH: /api/tweets/:id, /api/engagements/:id
- DELETE: /api/tweets/:id, /api/media/:id (also removes file from disk)
- GET/PUT: /api/settings, /api/settings/:key
- POST: /api/media/upload (multipart form: file + mood + outfit)
- POST: /api/generate (AI tweet generation via Groq: { style, topic?, seductiveness?, imageUrl? })
- POST: /api/seed (idempotent - checks if data exists first)
- GET: /api/twitter/status (connection check + handle)
- GET: /api/trending-topics?geo=US (Google Trends + AI fallback)
- POST: /api/analyze-post (AI post analysis + viral comment generation with vision support)
- POST: /api/scan-screenshot (multipart: screenshot file → vision extraction + comment generation)

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
