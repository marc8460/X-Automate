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
  connectedAccounts, type ConnectedAccount, type InsertConnectedAccount,
} from "@shared/schema";

export interface IStorage {
  getTweets(userId: string): Promise<Tweet[]>;
  createTweet(tweet: InsertTweet): Promise<Tweet>;
  updateTweet(id: number, data: Partial<InsertTweet>, userId: string): Promise<Tweet | undefined>;
  deleteTweet(id: number, userId: string): Promise<void>;

  getMediaItems(userId: string): Promise<MediaItem[]>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  updateMediaItem(id: number, data: Partial<InsertMediaItem>, userId: string): Promise<MediaItem | undefined>;
  deleteMediaItem(id: number, userId: string): Promise<void>;

  getEngagements(userId: string): Promise<Engagement[]>;
  createEngagement(engagement: InsertEngagement): Promise<Engagement>;
  updateEngagement(id: number, data: Partial<InsertEngagement>, userId: string): Promise<Engagement | undefined>;

  getFollowerInteractions(userId: string): Promise<FollowerInteraction[]>;
  createFollowerInteraction(interaction: InsertFollowerInteraction): Promise<FollowerInteraction>;

  getLiveFollowerInteractions(userId: string, hoursAgo?: number, platform?: string): Promise<LiveFollowerInteraction[]>;
  upsertLiveFollowerInteraction(data: InsertLiveFollowerInteraction): Promise<LiveFollowerInteraction>;
  markLiveInteractionSeen(id: number): Promise<void>;

  getActiveCommentThreads(userId: string, platform?: string): Promise<CommentThread[]>;
  upsertCommentThread(data: InsertCommentThread): Promise<CommentThread>;
  markThreadReplied(id: string): Promise<void>;
  setThreadNeedsAttention(id: string, lastCommentId: string, lastCommentText: string, lastCommentAuthor: string, lastCommentAuthorName: string, lastCommentAt: Date): Promise<void>;

  getTrends(): Promise<Trend[]>;
  createTrend(trend: InsertTrend): Promise<Trend>;
  deleteAllTrends(): Promise<void>;

  getActivityLogs(userId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getAnalyticsData(userId: string): Promise<AnalyticsData[]>;
  createAnalyticsData(data: InsertAnalyticsData): Promise<AnalyticsData>;

  getPeakTimes(): Promise<PeakTime[]>;
  createPeakTime(time: InsertPeakTime): Promise<PeakTime>;

  getNicheProfiles(userId: string): Promise<NicheProfile[]>;
  createNicheProfile(profile: InsertNicheProfile): Promise<NicheProfile>;
  deleteNicheProfile(id: number, userId: string): Promise<void>;

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

  getSettings(userId: string): Promise<Setting[]>;
  getSetting(key: string, userId?: string): Promise<Setting | undefined>;
  upsertSetting(key: string, value: string, userId?: string): Promise<Setting>;

  getConnectedAccount(userId: string, platform: string): Promise<ConnectedAccount | undefined>;
  getConnectedAccounts(userId: string): Promise<ConnectedAccount[]>;
  upsertConnectedAccount(data: InsertConnectedAccount): Promise<ConnectedAccount>;
  deleteConnectedAccount(userId: string, platform: string): Promise<void>;
  getAllConnectedAccountsForPlatform(platform: string): Promise<ConnectedAccount[]>;
}

export class DatabaseStorage implements IStorage {
  async getTweets(userId: string): Promise<Tweet[]> {
    return db.select().from(tweets).where(eq(tweets.userId, userId));
  }

  async createTweet(tweet: InsertTweet): Promise<Tweet> {
    const [result] = await db.insert(tweets).values(tweet).returning();
    return result;
  }

  async updateTweet(id: number, data: Partial<InsertTweet>, userId: string): Promise<Tweet | undefined> {
    const [result] = await db.update(tweets).set(data).where(and(eq(tweets.id, id), eq(tweets.userId, userId))).returning();
    return result;
  }

  async deleteTweet(id: number, userId: string): Promise<void> {
    await db.delete(tweets).where(and(eq(tweets.id, id), eq(tweets.userId, userId)));
  }

  async getMediaItems(userId: string): Promise<MediaItem[]> {
    return db.select().from(mediaItems).where(eq(mediaItems.userId, userId));
  }

  async createMediaItem(item: InsertMediaItem): Promise<MediaItem> {
    const [result] = await db.insert(mediaItems).values(item).returning();
    return result;
  }

  async updateMediaItem(id: number, data: Partial<InsertMediaItem>, userId: string): Promise<MediaItem | undefined> {
    const [result] = await db.update(mediaItems).set(data).where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId))).returning();
    return result;
  }

  async deleteMediaItem(id: number, userId: string): Promise<void> {
    await db.delete(mediaItems).where(and(eq(mediaItems.id, id), eq(mediaItems.userId, userId)));
  }

  async getEngagements(userId: string): Promise<Engagement[]> {
    return db.select().from(engagements).where(eq(engagements.userId, userId));
  }

  async createEngagement(engagement: InsertEngagement): Promise<Engagement> {
    const [result] = await db.insert(engagements).values(engagement).returning();
    return result;
  }

  async updateEngagement(id: number, data: Partial<InsertEngagement>, userId: string): Promise<Engagement | undefined> {
    const [result] = await db.update(engagements).set(data).where(and(eq(engagements.id, id), eq(engagements.userId, userId))).returning();
    return result;
  }

  async getFollowerInteractions(userId: string): Promise<FollowerInteraction[]> {
    return db.select().from(followerInteractions).where(eq(followerInteractions.userId, userId));
  }

  async createFollowerInteraction(interaction: InsertFollowerInteraction): Promise<FollowerInteraction> {
    const [result] = await db.insert(followerInteractions).values(interaction).returning();
    return result;
  }

  async getLiveFollowerInteractions(userId: string, hoursAgo = 168, platform?: string): Promise<LiveFollowerInteraction[]> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const conditions = [gte(liveFollowerInteractions.createdAt, cutoff), eq(liveFollowerInteractions.userId, userId)];
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

  async getActiveCommentThreads(userId: string, platform?: string): Promise<CommentThread[]> {
    const conditions = [eq(commentThreads.needsAttention, true), eq(commentThreads.userId, userId)];
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

  async getActivityLogs(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.userId, userId));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values(log).returning();
    return result;
  }

  async getAnalyticsData(userId: string): Promise<AnalyticsData[]> {
    return db.select().from(analyticsData).where(eq(analyticsData.userId, userId));
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

  async getNicheProfiles(userId: string): Promise<NicheProfile[]> {
    return db.select().from(nicheProfiles).where(eq(nicheProfiles.userId, userId));
  }

  async createNicheProfile(profile: InsertNicheProfile): Promise<NicheProfile> {
    const [result] = await db.insert(nicheProfiles).values(profile).returning();
    return result;
  }

  async deleteNicheProfile(id: number, userId: string): Promise<void> {
    await db.delete(nicheProfiles).where(and(eq(nicheProfiles.id, id), eq(nicheProfiles.userId, userId)));
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

  async getSettings(userId: string): Promise<Setting[]> {
    return db.select().from(settings).where(eq(settings.userId, userId));
  }

  async getSetting(key: string, userId?: string): Promise<Setting | undefined> {
    const conditions = [eq(settings.key, key)];
    if (userId) conditions.push(eq(settings.userId, userId));
    const [result] = await db.select().from(settings).where(and(...conditions));
    return result;
  }

  async upsertSetting(key: string, value: string, userId?: string): Promise<Setting> {
    const existing = await this.getSetting(key, userId);
    if (existing) {
      const [result] = await db.update(settings).set({ value }).where(eq(settings.id, existing.id)).returning();
      return result;
    }
    const [result] = await db.insert(settings).values({ key, value, userId }).returning();
    return result;
  }

  async getConnectedAccount(userId: string, platform: string): Promise<ConnectedAccount | undefined> {
    const [result] = await db.select().from(connectedAccounts)
      .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.platform, platform)));
    return result;
  }

  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return db.select().from(connectedAccounts).where(eq(connectedAccounts.userId, userId));
  }

  async upsertConnectedAccount(data: InsertConnectedAccount): Promise<ConnectedAccount> {
    const existing = await this.getConnectedAccount(data.userId, data.platform);
    if (existing) {
      const [result] = await db.update(connectedAccounts)
        .set({
          platformUserId: data.platformUserId,
          platformUsername: data.platformUsername,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
        })
        .where(eq(connectedAccounts.id, existing.id))
        .returning();
      return result;
    }
    const [result] = await db.insert(connectedAccounts).values(data).returning();
    return result;
  }

  async deleteConnectedAccount(userId: string, platform: string): Promise<void> {
    await db.delete(connectedAccounts)
      .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.platform, platform)));
  }

  async getAllConnectedAccountsForPlatform(platform: string): Promise<ConnectedAccount[]> {
    return db.select().from(connectedAccounts).where(eq(connectedAccounts.platform, platform));
  }
}

export const storage = new DatabaseStorage();
