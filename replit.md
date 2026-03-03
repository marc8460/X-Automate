# Aura - AI Influencer Automation Dashboard

## Overview
Full-stack Twitter/X AI influencer automation dashboard for a female AI persona. Dark creator aesthetic with purple/pink neon glass panels and Framer Motion animations.

## Architecture
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion, TanStack Query, wouter routing
- **Backend**: Express on port 5000, Drizzle ORM with PostgreSQL (pg driver, NOT neon-serverless)
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for text generation, `meta-llama/llama-4-scout-17b-16e-instruct` for vision/image analysis
- **File Uploads**: Multer with disk storage to `uploads/` directory, served statically
- **Fonts**: Outfit (display) + Inter (UI)

## Key Design Rules
- Persona is a **woman influencer** who never reveals she's AI. All UI copy reflects a "natural human creator" workflow.
- Dark theme with CSS variables, `glass-panel` utility class for frosted glass cards.

## Database Schema (shared/schema.ts)
Tables: tweets, media_items, engagements, follower_interactions, trends, activity_logs, analytics_data, peak_times, niche_profiles, trending_posts, comment_suggestions, behavior_limits, settings

## Project Structure
```
client/src/
  pages/          - Dashboard, ContentEngine, MediaVault, EngagementEngine, TrendScanner, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + trending system + seed
  storage.ts      - DatabaseStorage with IStorage interface
  db.ts           - Drizzle + pg pool
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
uploads/          - User-uploaded media files (served statically)
```

## API Endpoints
- GET/POST: /api/tweets, /api/media, /api/engagements, /api/follower-interactions, /api/trends, /api/activity-logs, /api/analytics, /api/peak-times
- PATCH: /api/tweets/:id, /api/engagements/:id
- DELETE: /api/tweets/:id, /api/media/:id (also removes file from disk)
- GET/PUT: /api/settings, /api/settings/:key
- POST: /api/media/upload (multipart form: file + mood + outfit)
- POST: /api/generate (AI tweet generation via Groq: { style, topic?, seductiveness?, imageUrl? })
- POST: /api/seed (idempotent - checks if data exists first)
- **Trending System:**
  - GET/POST/DELETE: /api/niches (niche profiles)
  - GET: /api/trending-posts (with optional ?nicheId filter, includes comments)
  - POST: /api/trending-posts/discover (AI-generated trending posts for a niche)
  - POST: /api/trending-posts/:id/generate-comments (AI comment suggestions)
  - DELETE: /api/trending-posts/:id
  - PATCH: /api/comments/:id (approve/reject/edit)
  - POST: /api/comments/:id/post (mark as posted, requires approved status)
  - GET/POST: /api/behavior-limits (anti-bot settings)

## Environment Secrets
- GROQ_API_KEY — for AI content generation via Groq
- DATABASE_URL — PostgreSQL connection (auto-managed by Replit)

## Auto-Seed
App.tsx includes a `SeedOnMount` component that calls POST /api/seed on first load. The endpoint is idempotent.

## Content Generation
- `/api/generate` reads persona settings (seductiveness, playfulness, dominance) from settings table
- 4-tier seductiveness system: wholesome (0-30), flirty (31-60), bold (61-80), max spice (81-100)
- Vision analysis via `llama-4-scout-17b-16e-instruct` when imageUrl is provided — reads file from disk, converts to base64, sends to Groq vision model for description, then injects description into caption generation prompt
- Temperature bumps to 1.0 at >80% seductiveness

## Trending Opportunities
- Niche-based trend discovery with AI-simulated trending posts
- AI comment generation with 5 types: witty, flirty, insightful, disagreement, question
- Human approval workflow — comments must be approved before posting
- Anti-bot behavior limits: daily cap, hourly limit, cooldown, safe mode
