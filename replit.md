# Aura - AI Influencer Automation Dashboard

## Overview
Full-stack Twitter/X AI influencer automation dashboard for a female AI persona. Dark creator aesthetic with purple/pink neon glass panels and Framer Motion animations.

## Architecture
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion, TanStack Query, wouter routing
- **Backend**: Express on port 5000, Drizzle ORM with PostgreSQL (pg driver, NOT neon-serverless)
- **Fonts**: Outfit (display) + Inter (UI)

## Key Design Rules
- Persona is a **woman influencer** who never reveals she's AI. All UI copy reflects a "natural human creator" workflow.
- Dark theme with CSS variables, `glass-panel` utility class for frosted glass cards.

## Database Schema (shared/schema.ts)
Tables: tweets, media_items, engagements, follower_interactions, trends, activity_logs, analytics_data, peak_times, settings

## Project Structure
```
client/src/
  pages/          - Dashboard, ContentEngine, MediaVault, EngagementEngine, TrendScanner, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts
server/
  index.ts        - Express entry
  routes.ts       - REST API endpoints + seed endpoint
  storage.ts      - DatabaseStorage with IStorage interface
  db.ts           - Drizzle + pg pool
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
```

## API Endpoints
- GET/POST: /api/tweets, /api/media, /api/engagements, /api/follower-interactions, /api/trends, /api/activity-logs, /api/analytics, /api/peak-times
- PATCH: /api/tweets/:id, /api/engagements/:id
- GET/PUT: /api/settings, /api/settings/:key
- POST: /api/seed (idempotent - checks if data exists first)

## Auto-Seed
App.tsx includes a `SeedOnMount` component that calls POST /api/seed on first load. The endpoint is idempotent.
