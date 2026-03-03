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

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
