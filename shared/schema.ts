import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, serial, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const connectedAccounts = pgTable("connected_accounts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  platformUserId: text("platform_user_id"),
  platformUsername: text("platform_username"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({ id: true, createdAt: true });
export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;

export const tweets = pgTable("tweets", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  text: text("text").notNull(),
  style: text("style").notNull(),
  status: text("status").notNull().default("queued"),
  imageUrl: text("image_url"),
  scheduledAt: text("scheduled_at"),
});

export const insertTweetSchema = createInsertSchema(tweets).omit({ id: true });
export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type Tweet = typeof tweets.$inferSelect;

export const mediaFolders = pgTable("media_folders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

export const insertMediaFolderSchema = createInsertSchema(mediaFolders).omit({ id: true });
export type InsertMediaFolder = z.infer<typeof insertMediaFolderSchema>;
export type MediaFolder = typeof mediaFolders.$inferSelect;

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  url: text("url").notNull(),
  mood: text("mood").notNull(),
  outfit: text("outfit").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: text("last_used").notNull().default("Never"),
  risk: text("risk").notNull().default("safe"),
  folderId: integer("folder_id"),
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({ id: true });
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type MediaItem = typeof mediaItems.$inferSelect;

export const engagements = pgTable("engagements", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  user: text("user").notNull(),
  text: text("text").notNull(),
  sentiment: text("sentiment").notNull(),
  suggestedReply: text("suggested_reply").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("pending"),
});

export const insertEngagementSchema = createInsertSchema(engagements).omit({ id: true });
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;
export type Engagement = typeof engagements.$inferSelect;

export const followerInteractions = pgTable("follower_interactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  user: text("user").notNull(),
  action: text("action").notNull(),
  time: text("time").notNull(),
});

export const insertFollowerInteractionSchema = createInsertSchema(followerInteractions).omit({ id: true });
export type InsertFollowerInteraction = z.infer<typeof insertFollowerInteractionSchema>;
export type FollowerInteraction = typeof followerInteractions.$inferSelect;

export const liveFollowerInteractions = pgTable("live_follower_interactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  username: text("username").notNull(),
  tweetId: text("tweet_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  seen: boolean("seen").notNull().default(false),
  xEventKey: text("x_event_key").notNull().unique(),
  platform: text("platform").notNull().default("x"),
});

export const insertLiveFollowerInteractionSchema = createInsertSchema(liveFollowerInteractions).omit({ id: true });
export type InsertLiveFollowerInteraction = z.infer<typeof insertLiveFollowerInteractionSchema>;
export type LiveFollowerInteraction = typeof liveFollowerInteractions.$inferSelect;

export const commentThreads = pgTable("comment_threads", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  rootTweetId: text("root_tweet_id").notNull(),
  lastCommentId: text("last_comment_id").notNull(),
  lastCommentText: text("last_comment_text").notNull(),
  lastCommentAuthor: text("last_comment_author").notNull(),
  lastCommentAuthorName: text("last_comment_author_name").notNull().default(""),
  lastCommentAt: timestamp("last_comment_at", { withTimezone: true }).notNull(),
  replied: boolean("replied").notNull().default(false),
  needsAttention: boolean("needs_attention").notNull().default(true),
  parentTweetText: text("parent_tweet_text").notNull().default(""),
  platform: text("platform").notNull().default("x"),
});

export const insertCommentThreadSchema = createInsertSchema(commentThreads);
export type InsertCommentThread = z.infer<typeof insertCommentThreadSchema>;
export type CommentThread = typeof commentThreads.$inferSelect;

export const trends = pgTable("trends", {
  id: serial("id").primaryKey(),
  tag: text("tag").notNull(),
  volume: text("volume").notNull(),
  fitScore: integer("fit_score").notNull(),
  trending: text("trending").notNull().default("up"),
});

export const insertTrendSchema = createInsertSchema(trends).omit({ id: true });
export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type Trend = typeof trends.$inferSelect;

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("success"),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const analyticsData = pgTable("analytics_data", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  engagement: integer("engagement").notNull().default(0),
  followers: integer("followers").notNull().default(0),
});

export const insertAnalyticsDataSchema = createInsertSchema(analyticsData).omit({ id: true });
export type InsertAnalyticsData = z.infer<typeof insertAnalyticsDataSchema>;
export type AnalyticsData = typeof analyticsData.$inferSelect;

export const peakTimes = pgTable("peak_times", {
  id: serial("id").primaryKey(),
  day: text("day").notNull(),
  time: text("time").notNull(),
  score: integer("score").notNull(),
});

export const insertPeakTimeSchema = createInsertSchema(peakTimes).omit({ id: true });
export type InsertPeakTime = z.infer<typeof insertPeakTimeSchema>;
export type PeakTime = typeof peakTimes.$inferSelect;

export const nicheProfiles = pgTable("niche_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  source: text("source").notNull().default("manual"),
  confidence: integer("confidence"),
});

export const insertNicheProfileSchema = createInsertSchema(nicheProfiles).omit({ id: true });
export type InsertNicheProfile = z.infer<typeof insertNicheProfileSchema>;
export type NicheProfile = typeof nicheProfiles.$inferSelect;

export const trendingPosts = pgTable("trending_posts", {
  id: serial("id").primaryKey(),
  nicheId: integer("niche_id"),
  postUrl: text("post_url").notNull(),
  authorUsername: text("author_username").notNull(),
  authorFollowers: text("author_followers"),
  postText: text("post_text").notNull(),
  likes: integer("likes").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  retweets: integer("retweets").notNull().default(0),
  views: integer("views").notNull().default(0),
  trendScore: integer("trend_score").notNull().default(0),
  velocityScore: text("velocity_score"),
  status: text("status").notNull().default("discovered"),
  language: text("language"),
  postAge: integer("post_age"),
  nicheMatchScore: integer("niche_match_score"),
  discoveredAt: text("discovered_at").notNull(),
});

export const insertTrendingPostSchema = createInsertSchema(trendingPosts).omit({ id: true });
export type InsertTrendingPost = z.infer<typeof insertTrendingPostSchema>;
export type TrendingPost = typeof trendingPosts.$inferSelect;

export const followerSnapshots = pgTable("follower_snapshots", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  followerCount: integer("follower_count").notNull(),
  followingCount: integer("following_count").notNull().default(0),
  tweetCount: integer("tweet_count").notNull().default(0),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const insertFollowerSnapshotSchema = createInsertSchema(followerSnapshots).omit({ id: true });
export type InsertFollowerSnapshot = z.infer<typeof insertFollowerSnapshotSchema>;
export type FollowerSnapshot = typeof followerSnapshots.$inferSelect;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export const dailyActivityEvents = pgTable("daily_activity_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  action: text("action").notNull(),
  localDate: text("local_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyActivityEventSchema = createInsertSchema(dailyActivityEvents).omit({ id: true, createdAt: true });
export type InsertDailyActivityEvent = z.infer<typeof insertDailyActivityEventSchema>;
export type DailyActivityEvent = typeof dailyActivityEvents.$inferSelect;

export const watchedCreators = pgTable("watched_creators", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  platform: text("platform").notNull(),
  avatarUrl: text("avatar_url"),
  lastPostId: text("last_post_id"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("watched_creators_user_platform_username").on(table.userId, table.username, table.platform),
]);

export const insertWatchedCreatorSchema = createInsertSchema(watchedCreators).omit({ id: true, createdAt: true });
export type InsertWatchedCreator = z.infer<typeof insertWatchedCreatorSchema>;
export type WatchedCreator = typeof watchedCreators.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const creatorAlerts = pgTable("creator_alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  creatorUsername: text("creator_username").notNull(),
  platform: text("platform").notNull(),
  postId: text("post_id").notNull(),
  postUrl: text("post_url").notNull(),
  dismissed: boolean("dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreatorAlertSchema = createInsertSchema(creatorAlerts).omit({ id: true, createdAt: true, dismissed: true });
export type InsertCreatorAlert = z.infer<typeof insertCreatorAlertSchema>;
export type CreatorAlert = typeof creatorAlerts.$inferSelect;

export const avatarCacheTable = pgTable("avatar_cache", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  avatarUrl: text("avatar_url"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mobileApiTokens = pgTable("mobile_api_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  label: text("label").notNull().default("Aura Keyboard"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMobileApiTokenSchema = createInsertSchema(mobileApiTokens).omit({ id: true, createdAt: true, lastUsedAt: true });
export type InsertMobileApiToken = z.infer<typeof insertMobileApiTokenSchema>;
export type MobileApiToken = typeof mobileApiTokens.$inferSelect;

export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  format: text("format").notNull(),
  ratio: text("ratio").notNull(),
  status: text("status").notNull().default("needs_review"),
  hook: text("hook").notNull().default(""),
  caption: text("caption").notNull().default(""),
  cta: text("cta").notNull().default(""),
  mediaItemId: integer("media_item_id"),
  imageUrl: text("image_url"),
  scheduledAt: text("scheduled_at"),
  confidence: integer("confidence").notNull().default(0),
  strategy: text("strategy"),
  failReason: text("fail_reason"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, generatedAt: true, postedAt: true, updatedAt: true });
export type InsertContentItem = z.infer<typeof insertContentItemSchema>;
export type ContentItem = typeof contentItems.$inferSelect;
