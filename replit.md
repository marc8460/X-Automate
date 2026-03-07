# Aura - AI Influencer Automation Dashboard

## Overview
Multi-user SaaS AI influencer automation dashboard. Users sign in via Replit Auth, then connect their own X and Threads accounts via OAuth. Dark creator aesthetic with purple/pink neon glass panels and Framer Motion animations. Supports X (Twitter) and Threads, with Instagram/TikTok planned.

## Architecture
- **Frontend**: React 19 + Vite, TailwindCSS, shadcn/ui, Recharts, Framer Motion, TanStack Query, wouter routing
- **Backend**: Express on port 5000, Drizzle ORM with PostgreSQL (pg driver, NOT neon-serverless)
- **Auth**: Replit Auth (OIDC via passport + openid-client + connect-pg-simple sessions)
- **AI**: Groq SDK — `llama-3.3-70b-versatile` for text generation, `meta-llama/llama-4-scout-17b-16e-instruct` for vision/image analysis
- **Twitter**: `twitter-api-v2` — OAuth 2.0 PKCE for user connections, OAuth 1.0a legacy for dev account
- **Threads**: Meta Threads API via REST — OAuth for user connections
- **File Uploads**: Multer with disk storage to `uploads/` directory, served statically
- **Fonts**: Outfit (display) + Inter (UI)

## Authentication & Multi-User
- **Replit Auth**: Users sign in via Google/X/Apple/email. Session stored in `sessions` table via connect-pg-simple.
- **Auth middleware**: `isAuthenticated` from `server/replit_integrations/auth/` protects all `/api/*` routes (returns 401 if not logged in)
- **User ID**: `getUserId(req)` extracts `req.user.claims.sub` for data scoping
- **Connected Accounts**: Users connect X/Threads via OAuth buttons in Settings (no API keys needed from users)
- **Data isolation**: All data tables have `userId` column; all storage queries are user-scoped
- **Landing page**: Unauthenticated users see `Landing.tsx`; authenticated users see the dashboard

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
Tables: tweets, media_items, engagements, follower_interactions, live_follower_interactions (with platform column), comment_threads (with platform column), trends, activity_logs, analytics_data, peak_times, follower_snapshots (userId, followerCount, followingCount, tweetCount, recordedAt), settings

## Project Structure
```
client/src/
  pages/          - Dashboard, Composer, MediaVault, UnifiedInbox, ViralEngine, Analytics, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar, TopNav, PlatformSwitcher), platform (PlatformBadge)
  contexts/       - PlatformContext, AccountContext
  types/          - platform.ts (platform types and config)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts, extensionBridge.ts (Chrome extension communication)
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + viral analysis + Twitter/Threads status + home timeline + extension API + seed
  twitter.ts      - Twitter API client module (getTwitterClient, testTwitterConnection)
  threads.ts      - Threads API client (getThreadsClient, testThreadsConnection, fetchUserProfile, fetchUserPosts, fetchPostReplies)
  engagementPoller.ts - Polls X mentions + Threads replies, delta-tracks likes/retweets/followers, saves follower snapshots
  storage.ts      - DatabaseStorage with IStorage interface (platform-filtered queries)
  db.ts           - Drizzle + pg pool
  ranking.ts      - Comment Opportunity Score (0-100) for Viral Engine feed
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
extension/        - Chrome extension (Manifest V3)
  manifest.json   - Extension config: permissions, content scripts, background worker
  background.js   - Service worker: handles post/reply/image/generate-replies actions
  content_x.js    - X.com content script: tweet detection, opportunity scores, analysis panel, reply insertion
  content_aura.js - Aura dashboard bridge: postMessage relay between web app and extension
  popup.html/js   - Extension popup UI with status and stats
  icons/          - Extension icons (16/48/128px)
uploads/          - User-uploaded media files (served statically)
```

## Twitter/X Integration
- **OAuth 2.0 (per-user)**: `TWITTER_CLIENT_ID` + `TWITTER_CLIENT_SECRET` for user OAuth connect flow. Users click "Connect X" → redirected to Twitter → tokens stored in `connected_accounts` table
- **OAuth 1.0a (legacy)**: `TWITTER_APP_KEY` + `TWITTER_APP_SECRET` + `TWITTER_ACCESS_TOKEN` + `TWITTER_ACCESS_SECRET` for dev account fallback
- **server/twitter.ts**: `getTwitterClientForUser(userId)` loads per-user tokens; `getTwitterClient()` is legacy fallback; `generateTwitterOAuthUrl()` + `handleTwitterOAuthCallback()` handle OAuth 2.0 PKCE flow
- **Token refresh**: Automatic via `refreshUserTwitterToken()` when tokens expire (2-hour TTL)

## Threads Integration
- **OAuth (per-user)**: `THREADS_APP_ID` + `THREADS_APP_SECRET` for Meta OAuth flow. Short-lived token auto-exchanged for long-lived token.
- **server/threads.ts**: `getThreadsAccessTokenForUser(userId)` loads per-user tokens; `generateThreadsOAuthUrl()` + `handleThreadsOAuthCallback()` handle OAuth flow

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
- GET: /api/dashboard/stats (Free tier metrics + internal activity stats, cached 2 min)
- POST: /api/analyze-post (AI post analysis + viral comment generation)
- POST: /api/analyze-feed-post (structured feed post → AI viral comments)
- POST: /api/scan-screenshot (screenshot → vision extraction + comments)
- POST: /api/extension/generate-replies (Chrome extension viral reply generation + opportunity scoring)
- GET: /api/engagement/live-comments?platform=x (platform-filtered)
- GET: /api/engagement/live-interactions?platform=x (platform-filtered)
- GET: /api/engagement/status
- POST: /api/engagement/pause, /api/engagement/resume
- POST: /api/engagement/generate-reply, /api/engagement/send-reply

## Environment Secrets
- GROQ_API_KEY — for AI content generation via Groq
- DATABASE_URL — PostgreSQL connection (auto-managed by Replit)
- SESSION_SECRET — Express session secret (for Replit Auth sessions)
- TWITTER_CLIENT_ID — Twitter OAuth 2.0 Client ID (for "Connect X" user flow)
- TWITTER_CLIENT_SECRET — Twitter OAuth 2.0 Client Secret (for "Connect X" user flow)
- TWITTER_APP_KEY — Twitter OAuth 1.0a App Key (legacy dev account fallback)
- TWITTER_APP_SECRET — Twitter OAuth 1.0a App Secret (legacy dev account fallback)
- TWITTER_ACCESS_TOKEN — Twitter OAuth 1.0a Access Token (legacy dev account fallback)
- TWITTER_ACCESS_SECRET — Twitter OAuth 1.0a Access Secret (legacy dev account fallback)
- THREADS_APP_ID — Meta Threads App ID (for "Connect Threads" user flow, optional)
- THREADS_APP_SECRET — Meta Threads App Secret (for "Connect Threads" user flow, optional)

## Chrome Extension (extension/)
- **Manifest V3**: Permissions for `activeTab`, `storage`, `scripting`; host permissions for x.com, twitter.com, and Replit domains
- **Communication flow**: Aura web app → `window.postMessage` → content_aura.js → `chrome.runtime.sendMessage` → background.js → content_x.js
- **In-feed features**: MutationObserver detects tweets, extracts metrics from DOM, calculates Opportunity Score, shows Analyze button on hover
- **Analysis panel**: Floating glass-panel UI on X.com with tweet metrics, score, AI reply generation (5 suggestions), custom instruction input, screenshot upload
- **Human-in-the-loop**: Extension inserts text into composer but never clicks Post — user makes final decision
- **Extension bridge** (`client/src/lib/extensionBridge.ts`): `isExtensionConnected()`, `PostViaExtension()`, `ReplyViaExtension()`, `useExtensionStatus()` hook
- **Composer/UnifiedInbox**: "Post with Aura" and "Reply with Extension" buttons appear when extension is detected

## Content Generation
- `/api/generate` reads persona settings (seductiveness, playfulness, dominance) from settings table
- 4-tier seductiveness system: wholesome (0-30), flirty (31-60), bold (61-80), max spice (81-100)
- Vision analysis via `llama-4-scout-17b-16e-instruct` when imageUrl is provided
- Temperature bumps to 1.0 at >80% seductiveness
