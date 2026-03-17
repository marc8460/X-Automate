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
- **File Uploads**: Multer with disk storage to `uploads/` directory, served statically. Optional metadata stripping via `sharp` (EXIF/GPS/XMP removal)
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
Tables: tweets, media_items, engagements, follower_interactions, live_follower_interactions (with platform column), comment_threads (with platform column), trends, activity_logs, analytics_data, peak_times, follower_snapshots (userId, followerCount, followingCount, tweetCount, recordedAt), settings, watched_creators (userId, username, platform, lastPostId, lastCheckedAt), push_subscriptions (userId, endpoint, p256dh, auth), mobile_api_tokens (userId, token, label, createdAt, lastUsedAt), content_items (userId, platform, format, ratio, status, hook, caption, cta, mediaItemId, imageUrl, scheduledAt, confidence, strategy, failReason, generatedAt, postedAt, updatedAt)

## Project Structure
```
client/src/
  pages/          - Dashboard, ContentStudio (AI Factory + Composer + Stories + Calendar tabs), Composer, MediaVault, UnifiedInbox, ViralEngine, Analytics, Settings
  components/     - UI (shadcn), layout (Layout, Sidebar, TopNav, PlatformSwitcher), platform (PlatformBadge)
  contexts/       - PlatformContext, AccountContext
  types/          - platform.ts (platform types and config)
  lib/            - hooks.ts (TanStack Query hooks), queryClient.ts, extensionBridge.ts (Chrome extension communication)
server/
  index.ts        - Express entry + static serving for /uploads
  routes.ts       - REST API endpoints + file upload + AI generation + viral analysis + Twitter/Threads status + home timeline + extension API + seed
  twitter.ts      - Twitter API client module (getTwitterClient, testTwitterConnection)
  threads.ts      - Threads API client (getThreadsClient, testThreadsConnection, fetchUserProfile, fetchUserPosts, fetchPostReplies, getThreadsPostInsights, getThreadsConversation, getThreadsPostMetrics)
  engagementPoller.ts - Polls X mentions + Threads replies, delta-tracks likes/retweets/followers, saves follower snapshots
  creatorMonitor.ts - Server-side creator monitoring worker, polls watched creators every 45s, sends push notifications on new posts
  contentScheduler.ts - Background scheduler, polls every 30s for due content_items and auto-posts to X/Threads
  pushNotifications.ts - Web Push notification sender using VAPID keys
  storage.ts      - DatabaseStorage with IStorage interface (platform-filtered queries)
  db.ts           - Drizzle + pg pool
  ranking.ts      - Comment Opportunity Score (0-100) for Viral Engine feed
shared/
  schema.ts       - Drizzle schema + Zod insert schemas + types
extension/        - Chrome extension (Manifest V3) — supports X.com AND Threads
  manifest.json   - Extension config: permissions for x.com, twitter.com, threads.net, and Replit domains
  background.js   - Service worker: handles post/reply/image/generate-replies/log-activity actions, syncs creator watchlists to server
  content_x.js    - X.com content script: tweet detection, opportunity scores, analysis panel, reply insertion, activity logging
  content_threads.js - Threads content script: post detection, viral scores, analysis panel, reply insertion, activity logging
  content_aura.js - Aura dashboard bridge: postMessage relay between web app and extension
  popup.html/js   - Extension popup UI with status and stats
  icons/          - Extension icons (16/48/128px)
uploads/          - User-uploaded media files (served statically)
aura-keyboard/    - React Native/Expo mobile companion app
  src/App.tsx     - Main app entry: auth check, mode routing, settings
  src/screens/    - ReplyScreen, CommentScreen, ImageScreen, SettingsScreen
  src/components/ - Header, ModeTabBar
  src/lib/api.ts  - SecureStore token management + all API calls
  src/lib/theme.ts- Dark theme colors and spacing constants
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
- GET: /api/threads/metrics (real Threads analytics: engagement, views, daily trends, top posts)
- GET: /api/threads/inbox (Threads posts with engagement metrics, profile info, date grouping)
- GET: /api/threads/posts/:postId/comments (conversation/replies for a Threads post)
- POST: /api/threads/posts/:postId/generate-reply (AI reply generation for Threads comments)
- POST: /api/threads/posts/:postId/reply (send reply to Threads comment)
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

## Content Studio API
- **Data model**: `content_items` table with full status flow: idea → generated → needs_review → approved → scheduled → posting → posted | failed | rejected
- **Transition rules**: Enforced allowed transitions per status (e.g. needs_review can only go to approved/rejected; posted is terminal)
- **CRUD**: GET/POST `/api/content-studio/items`, GET/PATCH/DELETE `/api/content-studio/items/:id`
- **Transition endpoints**:
  - POST `/api/content-studio/items/:id/approve` — transitions to approved
  - POST `/api/content-studio/items/:id/reject` — transitions to rejected
  - POST `/api/content-studio/items/:id/schedule` — transitions to scheduled (requires scheduledAt ISO datetime)
  - POST `/api/content-studio/items/:id/reschedule` — updates scheduledAt for already-scheduled items
  - POST `/api/content-studio/items/:id/send-back-to-draft` — transitions back to needs_review
  - POST `/api/content-studio/items/:id/post-now` — immediately publishes to X/Threads (supports cross-posting)
- **Batch actions**: POST `/api/content-studio/batch-action` — {ids, action, scheduledAt?} where action is approve/reject/schedule/send-back-to-draft
- **AI batch generation**: POST `/api/content-studio/generate-batch` — generates N (default 10) content pieces using persona settings, auto-selects vault assets by ratio (4:5 / 9:16)
- **Calendar**: GET `/api/content-studio/calendar?startDate=&endDate=&platform=` — returns items grouped by date with platform filtering
- **Background scheduler**: `server/contentScheduler.ts` atomically claims due items (UPDATE...WHERE status='scheduled' RETURNING) and auto-posts them every 30s
- **Security**: SSRF protection on imageUrl (private IP/host blocklist), safe path resolution for uploads, no `as any` casts in critical flows

## Content Studio Frontend
- **AI Factory tab** (default): Batch AI content generation → review cards in responsive grid → approve/reject/edit/schedule/post
- **Generation panel**: Platform selector (X/Threads/Both), count slider (1-20), ratio picker (4:5/9:16/1:1), style input, topic hint
- **Review cards**: Platform badge, format tag, image preview at correct ratio, hook/caption/CTA, confidence score (color-coded), status badge, quick actions
- **Inline editor**: Expand card to edit hook/caption/CTA, change media from vault picker
- **Batch actions toolbar**: Approve All, Reject All, Approve Selected, Reject Selected, Score Threshold approval (approve all above N%)
- **Filters**: Platform filter tabs (All/X/Threads/Both), Status filter tabs (All/Needs Review/Approved/Scheduled/Posted/Rejected/Failed)
- **Sorting**: By newest, confidence score, scheduled date, platform
- **Scheduling flow**: Approve → Schedule opens DateTimeWheelModal → picks date/time → saves to backend
- **Post Now**: Immediate posting via /post-now endpoint
- **Other tabs**: Manual Composer (existing Composer component), Story Ideas (AI story sequences), Calendar (links to standalone Calendar page)

## Calendar View (`/studio/calendar`)
- **Standalone page**: `client/src/pages/CalendarView.tsx`, accessible via sidebar and Content Studio tab link
- **Week view** (primary): 7-day column grid with hourly time slots (6 AM–11 PM), day headers with date/day name, "Today" highlight
- **Month view**: Standard month grid with day cells showing up to 3 content cards per day
- **Navigation**: Previous/Next week buttons, "Today" button, Week/Month toggle
- **Content cards**: Compact cards in time slots with platform color coding (purple=Instagram, blue=Threads, black=X, pink=TikTok), thumbnail, status indicator dot, truncated hook/caption
- **Status colors**: Draft (gray), Approved (yellow), Scheduled (blue), Posting (orange pulse), Posted (green), Failed (red)
- **Platform filters**: All/X/Threads/Instagram/TikTok filter tabs above the grid
- **Summary bar**: Live counts of scheduled/posted/failed items for current week
- **Detail panel**: Clicking a card opens a slide-over panel with full content preview (image at correct ratio, hook, caption, CTA, confidence score), status, and action buttons
- **Quick actions**: Post Now, Reschedule (opens DateTimeWheelModal), Edit in Studio, Send Back to Draft, Delete
- **Drag-and-drop**: Cards draggable between time slots/days to reschedule; uses native HTML5 drag events
- **Unscheduled sidebar**: Collapsible right sidebar showing approved but unscheduled items; items draggable onto calendar grid; per-item Schedule button
- **Empty slots**: "+" button on hover to pull from approved drafts
- **Auto-refresh**: 15-second polling for both calendar data and unscheduled items
- **Backend endpoint**: GET `/api/content-studio/calendar?startDate=&endDate=&platform=` returns items grouped by date

## Mobile API (Aura AI Keyboard)
- **Auth**: Bearer token in `Authorization` header. Tokens stored in `mobile_api_tokens` table. Token format: `aura_mob_<48 hex chars>`. Middleware `isMobileAuthenticated` validates + touches `lastUsedAt`.
- **Token management**: Users generate tokens in Settings → Mobile API Tokens card. Tokens can be labeled (e.g. "iPhone 15") and revoked.
- **Endpoints**:
  - POST `/api/mobile/auth/generate-token` — webapp-authenticated, creates new mobile token
  - GET `/api/mobile/auth/tokens` — webapp-authenticated, lists user's tokens (preview only, not full token)
  - DELETE `/api/mobile/auth/tokens/:id` — webapp-authenticated, revokes a token
  - GET `/api/mobile/persona` — mobile-authenticated, returns persona settings
  - POST `/api/mobile/generate-reply` — mobile-authenticated, generates DM reply with persona + context
  - POST `/api/mobile/generate-comments` — mobile-authenticated, generates viral comments with scores
  - GET `/api/mobile/media` — mobile-authenticated, fetches media vault images
  - POST `/api/mobile/analyze-screenshot` — mobile-authenticated, uploads screenshot for vision analysis
- **Mobile app stack**: Expo ~52, React Native 0.76, expo-secure-store for token persistence, expo-clipboard for copy, expo-image-picker for screenshots
- **Three modes**: Reply (DM reply generation), Comment (viral comment generation with scores), Image (media vault grid picker)
- **Dark theme**: bg `#0a0a0f`, primary `#a855f7`, secondary `#ec4899`

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
- VAPID_PUBLIC_KEY — Web Push VAPID public key (for push notifications)
- VAPID_PRIVATE_KEY — Web Push VAPID private key (for push notifications)

## Chrome Extension (extension/)
- **Manifest V3**: Permissions for `activeTab`, `storage`, `scripting`, `notifications`; host permissions for x.com, twitter.com, threads.net, and Replit domains
- **Dual-platform**: content_x.js runs on X.com, content_threads.js runs on threads.net — both provide identical viral analysis workflow
- **Communication flow**: Aura web app → `window.postMessage` → content_aura.js → `chrome.runtime.sendMessage` → background.js → content scripts
- **Server-side creator monitoring**: Extension syncs watchlists to server via `/api/creators/sync`. Server polls creators every 45s via `creatorMonitor.ts`. New post detected → Web Push notification → user clicks → post opens → extension activates
- **Push notifications**: VAPID keys in env vars, `web-push` package, service worker `sw-push.js` handles push events and notification clicks
- **In-feed features**: MutationObserver detects posts, extracts metrics from DOM, calculates Opportunity Score, shows Analyze button on hover
- **Analysis panel**: Floating glass-panel UI with post metrics, score, AI reply generation (8 suggestions), custom instruction input
- **Auto-post**: Extension can insert text into composer and click Post button automatically on both platforms
- **Activity logging**: Both extensions log `reply_posted` events to Daily Goals via background.js → aura dashboard → `/api/extension/activity`
- **Extension bridge** (`client/src/lib/extensionBridge.ts`): `isExtensionConnected()`, `PostViaExtension()`, `ReplyViaExtension()`, `useExtensionStatus()` hook
- **Composer**: "Post with Aura" button only appears for X platform (hidden for Threads since Threads posts go directly via API)

## Content Generation
- `/api/generate` reads persona settings (seductiveness, playfulness, dominance) from settings table
- 4-tier seductiveness system: wholesome (0-30), flirty (31-60), bold (61-80), max spice (81-100)
- Vision analysis via `llama-4-scout-17b-16e-instruct` when imageUrl is provided
- Temperature bumps to 1.0 at >80% seductiveness
