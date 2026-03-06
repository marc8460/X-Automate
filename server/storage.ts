import { eq, gte, desc, and, sql, lte } from "drizzle-orm";
import { db } from "./db";
import {
  tweets, type Tweet, type InsertTweet,
  mediaItems, type MediaItem, type InsertMediaItem,
  engagements, type Engagement, type InsertEngagement,
  followerInteractions, type FollowerInteraction, type InsertFollowerInteraction,
  liveFollowerInteractions, type LiveFollowerInteraction, type InsertLiveFollowerInteraction,
  commentThreads, type CommentThread, type InsertCommentThread,
  trends, type Trend, type InsertTrend,
  activityLogs, type ActivityLog, type InsertActivityLog,
  analyticsData, type AnalyticsData, type InsertAnalyticsData,
  peakTimes, type PeakTime, type InsertPeakTime,
  nicheProfiles, type NicheProfile, type InsertNicheProfile,
  trendingPosts, type TrendingPost, type InsertTrendingPost,
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

  getLiveFollowerInteractions(hoursAgo?: number, platform?: string): Promise<LiveFollowerInteraction[]>;
  upsertLiveFollowerInteraction(data: InsertLiveFollowerInteraction): Promise<LiveFollowerInteraction>;
  markLiveInteractionSeen(id: number): Promise<void>;

  getActiveCommentThreads(platform?: string): Promise<CommentThread[]>;
  upsertCommentThread(data: InsertCommentThread): Promise<CommentThread>;
  markThreadReplied(id: string): Promise<void>;
  setThreadNeedsAttention(id: string, lastCommentId: string, lastCommentText: string, lastCommentAuthor: string, lastCommentAuthorName: string, lastCommentAt: Date): Promise<void>;

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
  createTrendingPost(post: InsertTrendingPost): Promise<TrendingPost>;
  updateTrendingPost(id: number, data: Partial<InsertTrendingPost>): Promise<TrendingPost | undefined>;
  getTrendingPostsFiltered(filters: {
    nicheId?: number;
    minLikes?: number;
    minTrendScore?: number;
    language?: string;
    hoursAgo?: number;
    sortBy?: string;
  }): Promise<TrendingPost[]>;

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

  // --- Live Follower Interactions ---

  async getLiveFollowerInteractions(hoursAgo = 168, platform?: string): Promise<LiveFollowerInteraction[]> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const conditions = [gte(liveFollowerInteractions.createdAt, cutoff)];
    if (platform && platform !== "all") {
      conditions.push(eq(liveFollowerInteractions.platform, platform));
    }
    return db
      .select()
      .from(liveFollowerInteractions)
      .where(and(...conditions))
      .orderBy(desc(liveFollowerInteractions.createdAt))
      .limit(50);
  }

  async upsertLiveFollowerInteraction(data: InsertLiveFollowerInteraction): Promise<LiveFollowerInteraction> {
    const [result] = await db
      .insert(liveFollowerInteractions)
      .values(data)
      .onConflictDoUpdate({
        target: liveFollowerInteractions.xEventKey,
        set: { seen: data.seen ?? false },
      })
      .returning();
    return result;
  }

  async markLiveInteractionSeen(id: number): Promise<void> {
    await db
      .update(liveFollowerInteractions)
      .set({ seen: true })
      .where(eq(liveFollowerInteractions.id, id));
  }

  // --- Comment Threads ---

  async getActiveCommentThreads(platform?: string): Promise<CommentThread[]> {
    const conditions = [eq(commentThreads.needsAttention, true)];
    if (platform && platform !== "all") {
      conditions.push(eq(commentThreads.platform, platform));
    }
    return db
      .select()
      .from(commentThreads)
      .where(and(...conditions))
      .orderBy(desc(commentThreads.lastCommentAt));
  }

  async upsertCommentThread(data: InsertCommentThread): Promise<CommentThread> {
    const [result] = await db
      .insert(commentThreads)
      .values(data)
      .onConflictDoUpdate({
        target: commentThreads.id,
        set: {
          lastCommentId: data.lastCommentId,
          lastCommentText: data.lastCommentText,
          lastCommentAuthor: data.lastCommentAuthor,
          lastCommentAuthorName: data.lastCommentAuthorName,
          lastCommentAt: data.lastCommentAt,
          needsAttention: data.needsAttention,
          replied: data.replied,
          parentTweetText: data.parentTweetText,
        },
      })
      .returning();
    return result;
  }

  async markThreadReplied(id: string): Promise<void> {
    await db
      .update(commentThreads)
      .set({ replied: true, needsAttention: false })
      .where(eq(commentThreads.id, id));
  }

  async setThreadNeedsAttention(
    id: string,
    lastCommentId: string,
    lastCommentText: string,
    lastCommentAuthor: string,
    lastCommentAuthorName: string,
    lastCommentAt: Date,
  ): Promise<void> {
    await db
      .update(commentThreads)
      .set({
        lastCommentId,
        lastCommentText,
        lastCommentAuthor,
        lastCommentAuthorName,
        lastCommentAt,
        replied: false,
        needsAttention: true,
      })
      .where(eq(commentThreads.id, id));
  }

  // --- Trends ---

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
    return db.select().from(trendingPosts).orderBy(desc(trendingPosts.trendScore));
  }

  async createTrendingPost(post: InsertTrendingPost): Promise<TrendingPost> {
    const [result] = await db.insert(trendingPosts).values(post).returning();
    return result;
  }

  async updateTrendingPost(id: number, data: Partial<InsertTrendingPost>): Promise<TrendingPost | undefined> {
    const [result] = await db.update(trendingPosts).set(data).where(eq(trendingPosts.id, id)).returning();
    return result;
  }

  async getTrendingPostsFiltered(filters: {
    nicheId?: number;
    minLikes?: number;
    minTrendScore?: number;
    language?: string;
    hoursAgo?: number;
    sortBy?: string;
  }): Promise<TrendingPost[]> {
    const conditions = [];
    if (filters.nicheId) conditions.push(eq(trendingPosts.nicheId, filters.nicheId));
    if (filters.minLikes) conditions.push(gte(trendingPosts.likes, filters.minLikes));
    if (filters.minTrendScore) conditions.push(gte(trendingPosts.trendScore, filters.minTrendScore));
    if (filters.language) conditions.push(eq(trendingPosts.language, filters.language));
    if (filters.hoursAgo) {
      const cutoff = new Date(Date.now() - filters.hoursAgo * 60 * 60 * 1000).toISOString();
      conditions.push(gte(trendingPosts.discoveredAt, cutoff));
    }

    let orderCol: any = desc(trendingPosts.trendScore);
    if (filters.sortBy === "recent") orderCol = desc(trendingPosts.discoveredAt);
    else if (filters.sortBy === "velocity") orderCol = desc(trendingPosts.velocityScore);

    const query = conditions.length > 0
      ? db.select().from(trendingPosts).where(and(...conditions)).orderBy(orderCol)
      : db.select().from(trendingPosts).orderBy(orderCol);

    return query;
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
}

export const storage = new DatabaseStorage();
