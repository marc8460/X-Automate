import { eq, gte, desc, and, sql, lte, inArray, like } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "./db";
import {
  tweets, type Tweet, type InsertTweet,
  mediaFolders, type MediaFolder, type InsertMediaFolder,
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
  followerSnapshots, type FollowerSnapshot, type InsertFollowerSnapshot,
  dailyActivityEvents, type DailyActivityEvent, type InsertDailyActivityEvent,
  watchedCreators, type WatchedCreator, type InsertWatchedCreator,
  pushSubscriptions, type PushSubscription, type InsertPushSubscription,
  creatorAlerts, type CreatorAlert, type InsertCreatorAlert,
  mobileApiTokens, type MobileApiToken, type InsertMobileApiToken,
  contentItems, type ContentItem, type InsertContentItem,
} from "@shared/schema";

export interface IStorage {
  getTweets(userId: string): Promise<Tweet[]>;
  createTweet(tweet: InsertTweet): Promise<Tweet>;
  updateTweet(id: number, data: Partial<InsertTweet>, userId: string): Promise<Tweet | undefined>;
  deleteTweet(id: number, userId: string): Promise<void>;

  getMediaFolders(userId: string): Promise<MediaFolder[]>;
  createMediaFolder(folder: InsertMediaFolder): Promise<MediaFolder>;
  updateMediaFolder(id: number, name: string, userId: string): Promise<MediaFolder | undefined>;
  deleteMediaFolder(id: number, userId: string): Promise<void>;

  getMediaItems(userId: string): Promise<MediaItem[]>;
  getAllMediaItems(): Promise<MediaItem[]>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  updateMediaItem(id: number, data: Partial<InsertMediaItem>, userId: string): Promise<MediaItem | undefined>;
  deleteMediaItem(id: number, userId: string): Promise<void>;
  bulkMoveMediaItems(ids: number[], folderId: number | null, userId: string): Promise<void>;
  deleteStockMediaItems(userId: string): Promise<void>;

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

  createFollowerSnapshot(data: InsertFollowerSnapshot): Promise<FollowerSnapshot>;
  getFollowerSnapshots(userId: string, limit?: number): Promise<FollowerSnapshot[]>;

  logActivityEvent(data: InsertDailyActivityEvent): Promise<DailyActivityEvent>;
  getActivityProgress(userId: string, platform: string, localDate: string): Promise<Record<string, number>>;

  getWatchedCreators(userId: string): Promise<WatchedCreator[]>;
  getWatchedCreatorById(id: number): Promise<WatchedCreator | undefined>;
  addWatchedCreator(userId: string, username: string, platform: string): Promise<{ error?: string; creator?: WatchedCreator }>;
  syncWatchedCreators(userId: string, creators: { username: string; avatarUrl?: string | null }[], platform: string): Promise<void>;
  removeWatchedCreator(userId: string, username: string, platform: string): Promise<void>;
  getCreatorsToCheck(staleSecs?: number): Promise<WatchedCreator[]>;
  updateCreatorLastPost(id: number, postId: string): Promise<void>;
  getAllWatchedCreatorsByPlatform(platform: string): Promise<WatchedCreator[]>;

  savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  removePushSubscription(endpoint: string): Promise<void>;

  createCreatorAlert(data: InsertCreatorAlert): Promise<CreatorAlert>;
  getActiveAlerts(userId: string): Promise<CreatorAlert[]>;
  dismissAlert(id: number, userId: string): Promise<void>;
  dismissAllAlerts(userId: string): Promise<void>;

  createMobileApiToken(userId: string, token: string, label?: string): Promise<MobileApiToken>;
  getMobileApiTokens(userId: string): Promise<MobileApiToken[]>;
  validateMobileApiToken(token: string): Promise<MobileApiToken | undefined>;
  deleteMobileApiToken(id: number, userId: string): Promise<void>;
  touchMobileApiToken(id: number): Promise<void>;

  createContentItem(item: InsertContentItem): Promise<ContentItem>;
  getContentItems(userId: string, filters?: { status?: string; platform?: string; startDate?: string; endDate?: string }): Promise<ContentItem[]>;
  getContentItemById(id: number, userId: string): Promise<ContentItem | undefined>;
  updateContentItem(id: number, data: Partial<InsertContentItem>, userId: string): Promise<ContentItem | undefined>;
  deleteContentItem(id: number, userId: string): Promise<void>;
  deleteReviewableContentItems(userId: string): Promise<number>;
  batchUpdateContentStatus(ids: number[], status: string, userId: string, extra?: Partial<InsertContentItem>): Promise<ContentItem[]>;
  claimScheduledContentDue(): Promise<ContentItem[]>;
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

  async getMediaFolders(userId: string): Promise<MediaFolder[]> {
    return db.select().from(mediaFolders).where(eq(mediaFolders.userId, userId));
  }

  async createMediaFolder(folder: InsertMediaFolder): Promise<MediaFolder> {
    const [result] = await db.insert(mediaFolders).values(folder).returning();
    return result;
  }

  async updateMediaFolder(id: number, name: string, userId: string): Promise<MediaFolder | undefined> {
    const [result] = await db.update(mediaFolders).set({ name }).where(and(eq(mediaFolders.id, id), eq(mediaFolders.userId, userId))).returning();
    return result;
  }

  async deleteMediaFolder(id: number, userId: string): Promise<void> {
    await db.update(mediaItems).set({ folderId: null }).where(and(eq(mediaItems.folderId, id), eq(mediaItems.userId, userId)));
    await db.delete(mediaFolders).where(and(eq(mediaFolders.id, id), eq(mediaFolders.userId, userId)));
  }

  async getMediaItems(userId: string): Promise<MediaItem[]> {
    return db.select().from(mediaItems).where(eq(mediaItems.userId, userId));
  }

  async getAllMediaItems(): Promise<MediaItem[]> {
    return db.select().from(mediaItems);
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

  async bulkMoveMediaItems(ids: number[], folderId: number | null, userId: string): Promise<void> {
    if (ids.length === 0) return;
    await db.update(mediaItems).set({ folderId }).where(and(inArray(mediaItems.id, ids), eq(mediaItems.userId, userId)));
  }

  async deleteStockMediaItems(userId: string): Promise<void> {
    await db.delete(mediaItems).where(and(eq(mediaItems.userId, userId), like(mediaItems.url, 'https://images.unsplash.com/%')));
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

  async createFollowerSnapshot(data: InsertFollowerSnapshot): Promise<FollowerSnapshot> {
    const [result] = await db.insert(followerSnapshots).values(data).returning();
    return result;
  }

  async getFollowerSnapshots(userId: string, limit = 30): Promise<FollowerSnapshot[]> {
    return db.select().from(followerSnapshots)
      .where(eq(followerSnapshots.userId, userId))
      .orderBy(desc(followerSnapshots.recordedAt))
      .limit(limit);
  }

  async logActivityEvent(data: InsertDailyActivityEvent): Promise<DailyActivityEvent> {
    const [result] = await db.insert(dailyActivityEvents).values(data).returning();
    return result;
  }

  async getActivityProgress(userId: string, platform: string, localDate: string): Promise<Record<string, number>> {
    const rows = await db
      .select({
        action: dailyActivityEvents.action,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(dailyActivityEvents)
      .where(
        and(
          eq(dailyActivityEvents.userId, userId),
          eq(dailyActivityEvents.platform, platform),
          eq(dailyActivityEvents.localDate, localDate),
        ),
      )
      .groupBy(dailyActivityEvents.action);

    const progress: Record<string, number> = {};
    for (const row of rows) {
      progress[row.action] = row.count;
    }
    return progress;
  }

  async getWatchedCreators(userId: string): Promise<WatchedCreator[]> {
    return db.select().from(watchedCreators).where(eq(watchedCreators.userId, userId));
  }

  async getWatchedCreatorById(id: number): Promise<WatchedCreator | undefined> {
    const [result] = await db.select().from(watchedCreators).where(eq(watchedCreators.id, id));
    return result;
  }

  async addWatchedCreator(userId: string, username: string, platform: string): Promise<{ error?: string; creator?: WatchedCreator }> {
    const clean = username.replace(/^@/, '').trim().toLowerCase();
    if (!clean) return { error: "Invalid username" };
    const existing = await db.select().from(watchedCreators)
      .where(and(eq(watchedCreators.userId, userId), eq(watchedCreators.username, clean), eq(watchedCreators.platform, platform)));
    if (existing.length > 0) return { error: "Already tracking this creator" };
    const total = await db.select().from(watchedCreators).where(eq(watchedCreators.userId, userId));
    if (total.length >= 200) return { error: "Maximum 200 creators allowed" };
    const [creator] = await db.insert(watchedCreators).values({ userId, username: clean, platform }).returning();
    return { creator };
  }

  private syncLocks = new Map<string, Promise<void>>();

  async syncWatchedCreators(userId: string, creators: { username: string; avatarUrl?: string | null }[], platform: string): Promise<void> {
    const lockKey = `${userId}:${platform}`;
    const prev = this.syncLocks.get(lockKey) || Promise.resolve();
    const current = prev.then(() => this._doSyncWatchedCreators(userId, creators, platform)).catch(() => {});
    this.syncLocks.set(lockKey, current);
    await current;
  }

  private async _doSyncWatchedCreators(userId: string, creators: { username: string; avatarUrl?: string | null }[], platform: string): Promise<void> {
    const seen = new Set<string>();
    const normalized = creators
      .map(c => ({ username: c.username.replace(/^@/, '').trim().toLowerCase(), avatarUrl: c.avatarUrl || null }))
      .filter(c => {
        if (c.username.length === 0 || seen.has(c.username)) return false;
        seen.add(c.username);
        return true;
      });

    const existing = await db.select().from(watchedCreators)
      .where(and(eq(watchedCreators.userId, userId), eq(watchedCreators.platform, platform)));

    const existingMap = new Map(existing.map(c => [c.username, c]));
    const newSet = new Set(normalized.map(c => c.username));

    const toAdd = normalized.filter(c => !existingMap.has(c.username));
    const toRemove = existing.filter(c => !newSet.has(c.username));

    if (toRemove.length > 0) {
      const removeIds = toRemove.map(c => c.id);
      await db.delete(watchedCreators).where(inArray(watchedCreators.id, removeIds));
    }

    for (const creator of toAdd) {
      await db.insert(watchedCreators).values({ userId, username: creator.username, platform, avatarUrl: creator.avatarUrl }).onConflictDoNothing();
    }

    for (const creator of normalized) {
      const ex = existingMap.get(creator.username);
      if (ex && creator.avatarUrl && !ex.avatarUrl) {
        await db.update(watchedCreators).set({ avatarUrl: creator.avatarUrl }).where(eq(watchedCreators.id, ex.id));
      }
    }
  }

  async removeWatchedCreator(userId: string, username: string, platform: string): Promise<void> {
    await db.delete(watchedCreators).where(
      and(eq(watchedCreators.userId, userId), eq(watchedCreators.username, username), eq(watchedCreators.platform, platform))
    );
  }

  async getCreatorsToCheck(staleSecs = 45): Promise<WatchedCreator[]> {
    const threshold = new Date(Date.now() - staleSecs * 1000);
    return db.select().from(watchedCreators).where(
      sql`${watchedCreators.lastCheckedAt} IS NULL OR ${watchedCreators.lastCheckedAt} < ${threshold}`
    ).orderBy(sql`${watchedCreators.lastCheckedAt} ASC NULLS FIRST`);
  }

  async updateCreatorLastPost(id: number, postId: string): Promise<void> {
    await db.update(watchedCreators)
      .set({ lastPostId: postId, lastCheckedAt: new Date() })
      .where(eq(watchedCreators.id, id));
  }

  async getAllWatchedCreatorsByPlatform(platform: string): Promise<WatchedCreator[]> {
    return db.select().from(watchedCreators).where(eq(watchedCreators.platform, platform));
  }

  async savePushSubscription(userId: string, endpoint: string, p256dh: string, auth: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    await db.insert(pushSubscriptions).values({ userId, endpoint, p256dh, auth });
  }

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async createCreatorAlert(data: InsertCreatorAlert): Promise<CreatorAlert> {
    const [result] = await db.insert(creatorAlerts).values(data).returning();
    return result;
  }

  async getActiveAlerts(userId: string): Promise<CreatorAlert[]> {
    return db.select().from(creatorAlerts)
      .where(and(eq(creatorAlerts.userId, userId), eq(creatorAlerts.dismissed, false)))
      .orderBy(desc(creatorAlerts.createdAt));
  }

  async dismissAlert(id: number, userId: string): Promise<void> {
    await db.update(creatorAlerts)
      .set({ dismissed: true })
      .where(and(eq(creatorAlerts.id, id), eq(creatorAlerts.userId, userId)));
  }

  async dismissAllAlerts(userId: string): Promise<void> {
    await db.update(creatorAlerts)
      .set({ dismissed: true })
      .where(and(eq(creatorAlerts.userId, userId), eq(creatorAlerts.dismissed, false)));
  }

  async createMobileApiToken(userId: string, token: string, label?: string): Promise<MobileApiToken> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [result] = await db.insert(mobileApiTokens).values({
      userId,
      token: tokenHash,
      label: label || "Aura Keyboard",
    }).returning();
    return result;
  }

  async getMobileApiTokens(userId: string): Promise<MobileApiToken[]> {
    return db.select().from(mobileApiTokens)
      .where(eq(mobileApiTokens.userId, userId))
      .orderBy(desc(mobileApiTokens.createdAt));
  }

  async validateMobileApiToken(token: string): Promise<MobileApiToken | undefined> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [result] = await db.select().from(mobileApiTokens)
      .where(eq(mobileApiTokens.token, tokenHash));
    return result;
  }

  async deleteMobileApiToken(id: number, userId: string): Promise<void> {
    await db.delete(mobileApiTokens)
      .where(and(eq(mobileApiTokens.id, id), eq(mobileApiTokens.userId, userId)));
  }

  async touchMobileApiToken(id: number): Promise<void> {
    await db.update(mobileApiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(mobileApiTokens.id, id));
  }

  async createContentItem(item: InsertContentItem): Promise<ContentItem> {
    const [result] = await db.insert(contentItems).values(item).returning();
    return result;
  }

  async getContentItems(userId: string, filters?: { status?: string; platform?: string; startDate?: string; endDate?: string }): Promise<ContentItem[]> {
    const conditions = [eq(contentItems.userId, userId)];
    if (filters?.status) conditions.push(eq(contentItems.status, filters.status));
    if (filters?.platform) conditions.push(eq(contentItems.platform, filters.platform));
    if (filters?.startDate) {
      conditions.push(sql`(${contentItems.scheduledAt} >= ${filters.startDate} OR (${contentItems.scheduledAt} IS NULL AND ${contentItems.postedAt} >= ${filters.startDate}))`);
    }
    if (filters?.endDate) {
      const endOfDay = `${filters.endDate}T23:59:59`;
      conditions.push(sql`(${contentItems.scheduledAt} <= ${endOfDay} OR (${contentItems.scheduledAt} IS NULL AND ${contentItems.postedAt} <= ${endOfDay}))`);
    }
    return db.select().from(contentItems).where(and(...conditions)).orderBy(desc(contentItems.generatedAt));
  }

  async getContentItemById(id: number, userId: string): Promise<ContentItem | undefined> {
    const [result] = await db.select().from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
    return result;
  }

  async updateContentItem(id: number, data: Partial<InsertContentItem>, userId: string): Promise<ContentItem | undefined> {
    const [result] = await db.update(contentItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)))
      .returning();
    return result;
  }

  async deleteContentItem(id: number, userId: string): Promise<void> {
    await db.delete(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
  }

  async deleteReviewableContentItems(userId: string): Promise<number> {
    const result = await db.delete(contentItems).where(
      and(
        eq(contentItems.userId, userId),
        sql`${contentItems.status} IN ('needs_review', 'generated', 'idea')`
      )
    ).returning({ id: contentItems.id });
    return result.length;
  }

  async batchUpdateContentStatus(ids: number[], status: string, userId: string, extra?: Partial<InsertContentItem>): Promise<ContentItem[]> {
    if (ids.length === 0) return [];
    return db.update(contentItems)
      .set({ status, ...extra, updatedAt: new Date() })
      .where(and(inArray(contentItems.id, ids), eq(contentItems.userId, userId)))
      .returning();
  }

  async claimScheduledContentDue(): Promise<ContentItem[]> {
    const now = new Date().toISOString();
    return db.update(contentItems)
      .set({ status: "posting", updatedAt: new Date() })
      .where(and(eq(contentItems.status, "scheduled"), lte(contentItems.scheduledAt, now)))
      .returning();
  }
}

export const storage = new DatabaseStorage();
