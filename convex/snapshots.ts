import { mutation, query, internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get snapshots for a drink with smart sampling based on time frame
 * - Recent data: full resolution
 * - Older data: sampled/aggregated
 */
export const getSnapshotsForProduct = query({
  args: { 
    id: v.id("drinks"),
    timeFrameMinutes: v.optional(v.number()), // 10, 30, 60, 120, or null for all
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeFrame = args.timeFrameMinutes || null;
    
    // Calculate cutoff time
    const cutoffTime = timeFrame ? now - (timeFrame * 60 * 1000) : 0;
    
    // Fetch snapshots within time frame
    const snapshots = await ctx.db
      .query("priceSnapshots")
      .withIndex('by_drink_and_time', (q) => q.eq('drinkId', args.id))
      .filter((q) => q.gte(q.field('ts'), cutoffTime))
      .order('desc')
      .take(500); // Increased limit but will be sampled
    
    // Sort chronologically
    const sorted = snapshots.reverse();
    
    // Smart sampling based on time frame
    return sampleSnapshots(sorted, timeFrame);
  },
});

/**
 * Sample snapshots intelligently:
 * - Keep all points in recent period (last 10 min)
 * - Sample older points based on density
 */
function sampleSnapshots(snapshots: any[], timeFrameMinutes: number | null): any[] {
  if (snapshots.length <= 50) return snapshots; // No sampling needed
  
  const now = Date.now();
  const recentCutoff = now - (10 * 60 * 1000); // Last 10 minutes
  
  const recentPoints = snapshots.filter(s => s.ts >= recentCutoff);
  const olderPoints = snapshots.filter(s => s.ts < recentCutoff);
  
  // Keep all recent points
  // Sample older points: keep every Nth point based on density
  const targetOlderPoints = 50 - recentPoints.length;
  const sampledOlder = sampleArray(olderPoints, Math.max(targetOlderPoints, 20));
  
  return [...sampledOlder, ...recentPoints];
}

/**
 * Sample array to target length, keeping first, last, and evenly spaced points
 */
function sampleArray<T>(arr: T[], targetLength: number): T[] {
  if (arr.length <= targetLength) return arr;
  
  const result: T[] = [];
  const step = (arr.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const index = Math.round(i * step);
    result.push(arr[index]);
  }
  
  return result;
}

/**
 * Downsample old price snapshots to save storage
 * Runs as a cron job every hour
 * - Keep all snapshots from last hour at full resolution
 * - Downsample snapshots older than 1 hour but younger than 24 hours (keep 1 per 5 minutes)
 * - Downsample snapshots older than 24 hours (keep 1 per hour)
 * - Delete snapshots older than 7 days
 */
export const downsampleOldSnapshots = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    // Delete very old snapshots (>7 days)
    const veryOld = await ctx.db
      .query('priceSnapshots')
      .withIndex('by_timestamp')
      .filter((q) => q.lt(q.field('ts'), sevenDaysAgo))
      .take(100);
    
    for (const snapshot of veryOld) {
      await ctx.db.delete(snapshot._id);
    }
    
    // Get all drinks to process each separately
    const drinks = await ctx.db.query('drinks').collect();
    
    for (const drink of drinks) {
      // Process medium-old snapshots (1h - 24h): keep 1 per 5 minutes
      await downsampleDrinkRange(
        ctx,
        drink._id,
        oneDayAgo,
        oneHourAgo,
        5 * 60 * 1000 // 5 minute intervals
      );
      
      // Process old snapshots (>24h): keep 1 per hour
      await downsampleDrinkRange(
        ctx,
        drink._id,
        sevenDaysAgo,
        oneDayAgo,
        60 * 60 * 1000 // 1 hour intervals
      );
    }
    
    return { success: true };
  },
});

/**
 * Downsample snapshots for a specific drink in a time range
 * Keep one snapshot per interval, delete the rest
 */
async function downsampleDrinkRange(
  ctx: any,
  drinkId: any,
  startTime: number,
  endTime: number,
  intervalMs: number
) {
  const snapshots = await ctx.db
    .query('priceSnapshots')
    .withIndex('by_drink_and_time', (q) => q.eq('drinkId', drinkId))
    .filter((q) => 
      q.and(
        q.gte(q.field('ts'), startTime),
        q.lt(q.field('ts'), endTime)
      )
    )
    .collect();
  
  if (snapshots.length === 0) return;
  
  // Group by interval
  const buckets = new Map<number, any[]>();
  
  for (const snapshot of snapshots) {
    const bucketKey = Math.floor(snapshot.ts / intervalMs);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(snapshot);
  }
  
  // For each bucket, keep the one closest to the middle timestamp, delete the rest
  for (const [bucketKey, snapshotsInBucket] of buckets) {
    if (snapshotsInBucket.length <= 1) continue;
    
    // Sort by timestamp
    snapshotsInBucket.sort((a, b) => a.ts - b.ts);
    
    // Keep the middle one
    const middleIndex = Math.floor(snapshotsInBucket.length / 2);
    const toKeep = snapshotsInBucket[middleIndex];
    
    // Delete the rest
    for (const snapshot of snapshotsInBucket) {
      if (snapshot._id !== toKeep._id) {
        await ctx.db.delete(snapshot._id);
      }
    }
  }
}
