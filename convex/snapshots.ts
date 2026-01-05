import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getSnapshotsForProduct = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    // Use index to efficiently get snapshots ordered by time
    // Take last 100 snapshots for performance
    const snapshots = await ctx.db
      .query("priceSnapshots")
      .withIndex('by_drink_and_time', (q) => q.eq('drinkId', args.id))
      .order('desc')
      .take(100);
    
    // Return in chronological order (oldest first)
    return snapshots.reverse();
  },
});
