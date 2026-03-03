import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  tweets, type Tweet, type InsertTweet,
  mediaItems, type MediaItem, type InsertMediaItem,
  engagements, type Engagement, type InsertEngagement,
  followerInteractions, type FollowerInteraction, type InsertFollowerInteraction,
  trends, type Trend, type InsertTrend,
  activityLogs, type ActivityLog, type InsertActivityLog,
  analyticsData, type AnalyticsData, type InsertAnalyticsData,
  peakTimes, type PeakTime, type InsertPeakTime,
  nicheProfiles, type NicheProfile, type InsertNicheProfile,
  trendingPosts, type TrendingPost, type InsertTrendingPost,
  commentSuggestions, type CommentSuggestion, type InsertCommentSuggestion,
  behaviorLimits, type BehaviorLimit,
  settings, type Setting, type InsertSetting,
} from "@shared/schema";

export interface IStorage {
  getTweets(): Promise<Tweet[]>;
  createTweet(tweet: InsertTweet): Promise<Tweet>;
  updateTweet(id: number, data: Partial<InsertTweet>): Promise<Tweet | undefined>;
  deleteTweet(id: number): Promise<void>;

  getMediaItems(): Promise<MediaItem[]>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  updateMediaItem(id: number, data: Partial<InsertMediaItem>): Promise<MediaItem | undefined>;
  deleteMediaItem(id: number): Promise<void>;

  getEngagements(): Promise<Engagement[]>;
  createEngagement(engagement: InsertEngagement): Promise<Engagement>;
  updateEngagement(id: number, data: Partial<InsertEngagement>): Promise<Engagement | undefined>;

  getFollowerInteractions(): Promise<FollowerInteraction[]>;
  createFollowerInteraction(interaction: InsertFollowerInteraction): Promise<FollowerInteraction>;

  getTrends(): Promise<Trend[]>;
  createTrend(trend: InsertTrend): Promise<Trend>;
  deleteAllTrends(): Promise<void>;

  getActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getAnalyticsData(): Promise<AnalyticsData[]>;
  createAnalyticsData(data: InsertAnalyticsData): Promise<AnalyticsData>;

  getPeakTimes(): Promise<PeakTime[]>;
  createPeakTime(time: InsertPeakTime): Promise<PeakTime>;

  getNicheProfiles(): Promise<NicheProfile[]>;
  createNicheProfile(profile: InsertNicheProfile): Promise<NicheProfile>;
  deleteNicheProfile(id: number): Promise<void>;

  getTrendingPosts(): Promise<TrendingPost[]>;
  getTrendingPostsByNiche(nicheId: number): Promise<TrendingPost[]>;
  getTrendingPost(id: number): Promise<TrendingPost | undefined>;
  createTrendingPost(post: InsertTrendingPost): Promise<TrendingPost>;
  deleteTrendingPost(id: number): Promise<void>;

  getCommentSuggestions(): Promise<CommentSuggestion[]>;
  getCommentsByPost(postId: number): Promise<CommentSuggestion[]>;
  createCommentSuggestion(comment: InsertCommentSuggestion): Promise<CommentSuggestion>;
  updateCommentSuggestion(id: number, data: Partial<InsertCommentSuggestion>): Promise<CommentSuggestion | undefined>;
  deleteCommentsByPost(postId: number): Promise<void>;

  getBehaviorLimits(): Promise<BehaviorLimit[]>;
  upsertBehaviorLimit(key: string, value: string): Promise<BehaviorLimit>;

  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: string): Promise<Setting>;
}

export class DatabaseStorage implements IStorage {
  async getTweets(): Promise<Tweet[]> {
    return db.select().from(tweets);
  }

  async createTweet(tweet: InsertTweet): Promise<Tweet> {
    const [result] = await db.insert(tweets).values(tweet).returning();
    return result;
  }

  async updateTweet(id: number, data: Partial<InsertTweet>): Promise<Tweet | undefined> {
    const [result] = await db.update(tweets).set(data).where(eq(tweets.id, id)).returning();
    return result;
  }

  async deleteTweet(id: number): Promise<void> {
    await db.delete(tweets).where(eq(tweets.id, id));
  }

  async getMediaItems(): Promise<MediaItem[]> {
    return db.select().from(mediaItems);
  }

  async createMediaItem(item: InsertMediaItem): Promise<MediaItem> {
    const [result] = await db.insert(mediaItems).values(item).returning();
    return result;
  }

  async updateMediaItem(id: number, data: Partial<InsertMediaItem>): Promise<MediaItem | undefined> {
    const [result] = await db.update(mediaItems).set(data).where(eq(mediaItems.id, id)).returning();
    return result;
  }

  async deleteMediaItem(id: number): Promise<void> {
    await db.delete(mediaItems).where(eq(mediaItems.id, id));
  }

  async getEngagements(): Promise<Engagement[]> {
    return db.select().from(engagements);
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    const [result] = await db.insert(engagements).values(engagement).returning();
    return result;
  }

  async updateEngagement(id: number, data: Partial<InsertEngagement>): Promise<Engagement | undefined> {
    const [result] = await db.update(engagements).set(data).where(eq(engagements.id, id)).returning();
    return result;
  }

  async getFollowerInteractions(): Promise<FollowerInteraction[]> {
    return db.select().from(followerInteractions);
  }

  async createFollowerInteraction(interaction: InsertFollowerInteraction): Promise<FollowerInteraction> {
    const [result] = await db.insert(followerInteractions).values(interaction).returning();
    return result;
  }

  async getTrends(): Promise<Trend[]> {
    return db.select().from(trends);
  }

  async createTrend(trend: InsertTrend): Promise<Trend> {
    const [result] = await db.insert(trends).values(trend).returning();
    return result;
  }

  async deleteAllTrends(): Promise<void> {
    await db.delete(trends);
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }

  async getAnalyticsData(): Promise<AnalyticsData[]> {
    return db.select().from(analyticsData);
  }

  async createAnalyticsData(data: InsertAnalyticsData): Promise<AnalyticsData> {
    const [result] = await db.insert(analyticsData).values(data).returning();
    return result;
  }

  async getPeakTimes(): Promise<PeakTime[]> {
    return db.select().from(peakTimes);
  }

  async createPeakTime(time: InsertPeakTime): Promise<PeakTime> {
    const [result] = await db.insert(peakTimes).values(time).returning();
    return result;
  }

  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [result] = await db.select().from(settings).where(eq(settings.key, key));
    return result;
  }

  async upsertSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [result] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
      return result;
    }
    const [result] = await db.insert(settings).values({ key, value }).returning();
    return result;
  }

  async getNicheProfiles(): Promise<NicheProfile[]> {
    return db.select().from(nicheProfiles);
  }

  async createNicheProfile(profile: InsertNicheProfile): Promise<NicheProfile> {
    const [result] = await db.insert(nicheProfiles).values(profile).returning();
    return result;
  }

  async deleteNicheProfile(id: number): Promise<void> {
    await db.delete(nicheProfiles).where(eq(nicheProfiles.id, id));
  }

  async getTrendingPosts(): Promise<TrendingPost[]> {
    return db.select().from(trendingPosts);
  }

  async getTrendingPostsByNiche(nicheId: number): Promise<TrendingPost[]> {
    return db.select().from(trendingPosts).where(eq(trendingPosts.nicheId, nicheId));
  }

  async getTrendingPost(id: number): Promise<TrendingPost | undefined> {
    const [result] = await db.select().from(trendingPosts).where(eq(trendingPosts.id, id));
    return result;
  }

  async createTrendingPost(post: InsertTrendingPost): Promise<TrendingPost> {
    const [result] = await db.insert(trendingPosts).values(post).returning();
    return result;
  }

  async deleteTrendingPost(id: number): Promise<void> {
    await db.delete(commentSuggestions).where(eq(commentSuggestions.trendingPostId, id));
    await db.delete(trendingPosts).where(eq(trendingPosts.id, id));
  }

  async getCommentSuggestions(): Promise<CommentSuggestion[]> {
    return db.select().from(commentSuggestions);
  }

  async getCommentsByPost(postId: number): Promise<CommentSuggestion[]> {
    return db.select().from(commentSuggestions).where(eq(commentSuggestions.trendingPostId, postId));
  }

  async createCommentSuggestion(comment: InsertCommentSuggestion): Promise<CommentSuggestion> {
    const [result] = await db.insert(commentSuggestions).values(comment).returning();
    return result;
  }

  async updateCommentSuggestion(id: number, data: Partial<InsertCommentSuggestion>): Promise<CommentSuggestion | undefined> {
    const [result] = await db.update(commentSuggestions).set(data).where(eq(commentSuggestions.id, id)).returning();
    return result;
  }

  async deleteCommentsByPost(postId: number): Promise<void> {
    await db.delete(commentSuggestions).where(eq(commentSuggestions.trendingPostId, postId));
  }

  async getBehaviorLimits(): Promise<BehaviorLimit[]> {
    return db.select().from(behaviorLimits);
  }

  async upsertBehaviorLimit(key: string, value: string): Promise<BehaviorLimit> {
    const existing = await db.select().from(behaviorLimits).where(eq(behaviorLimits.key, key));
    if (existing.length > 0) {
      const [result] = await db.update(behaviorLimits).set({ value }).where(eq(behaviorLimits.key, key)).returning();
      return result;
    }
    const [result] = await db.insert(behaviorLimits).values({ key, value }).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
