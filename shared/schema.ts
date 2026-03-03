import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tweets = pgTable("tweets", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  style: text("style").notNull(),
  status: text("status").notNull().default("queued"),
  imageUrl: text("image_url"),
  scheduledAt: text("scheduled_at"),
});

export const insertTweetSchema = createInsertSchema(tweets).omit({ id: true });
export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type Tweet = typeof tweets.$inferSelect;

export const mediaItems = pgTable("media_items", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  mood: text("mood").notNull(),
  outfit: text("outfit").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsed: text("last_used").notNull().default("Never"),
  risk: text("risk").notNull().default("safe"),
});

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({ id: true });
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type MediaItem = typeof mediaItems.$inferSelect;

export const engagements = pgTable("engagements", {
  id: serial("id").primaryKey(),
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
  user: text("user").notNull(),
  action: text("action").notNull(),
  time: text("time").notNull(),
});

export const insertFollowerInteractionSchema = createInsertSchema(followerInteractions).omit({ id: true });
export type InsertFollowerInteraction = z.infer<typeof insertFollowerInteractionSchema>;
export type FollowerInteraction = typeof followerInteractions.$inferSelect;

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
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  active: boolean("active").notNull().default(true),
});

export const insertNicheProfileSchema = createInsertSchema(nicheProfiles).omit({ id: true });
export type InsertNicheProfile = z.infer<typeof insertNicheProfileSchema>;
export type NicheProfile = typeof nicheProfiles.$inferSelect;

export const trendingPosts = pgTable("trending_posts", {
  id: serial("id").primaryKey(),
  nicheId: integer("niche_id").notNull(),
  authorHandle: text("author_handle").notNull(),
  authorFollowers: integer("author_followers").notNull(),
  postText: text("post_text").notNull(),
  postUrl: text("post_url").notNull(),
  postImageUrl: text("post_image_url"),
  likes: integer("likes").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  retweets: integer("retweets").notNull().default(0),
  trendScore: integer("trend_score").notNull().default(0),
  status: text("status").notNull().default("rising"),
  discoveredAt: text("discovered_at").notNull(),
  engagementVelocity: integer("engagement_velocity").notNull().default(0),
});

export const insertTrendingPostSchema = createInsertSchema(trendingPosts).omit({ id: true });
export type InsertTrendingPost = z.infer<typeof insertTrendingPostSchema>;
export type TrendingPost = typeof trendingPosts.$inferSelect;

export const commentSuggestions = pgTable("comment_suggestions", {
  id: serial("id").primaryKey(),
  trendingPostId: integer("trending_post_id").notNull(),
  commentText: text("comment_text").notNull(),
  commentType: text("comment_type").notNull(),
  riskLevel: text("risk_level").notNull().default("low"),
  status: text("status").notNull().default("pending"),
  approvedAt: text("approved_at"),
  postedAt: text("posted_at"),
});

export const insertCommentSuggestionSchema = createInsertSchema(commentSuggestions).omit({ id: true });
export type InsertCommentSuggestion = z.infer<typeof insertCommentSuggestionSchema>;
export type CommentSuggestion = typeof commentSuggestions.$inferSelect;

export const behaviorLimits = pgTable("behavior_limits", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertBehaviorLimitSchema = createInsertSchema(behaviorLimits).omit({ id: true });
export type InsertBehaviorLimit = z.infer<typeof insertBehaviorLimitSchema>;
export type BehaviorLimit = typeof behaviorLimits.$inferSelect;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
