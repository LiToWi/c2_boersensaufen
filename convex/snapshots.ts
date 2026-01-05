import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getSnapshotsForProduct = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("priceSnapshots")
      .filter((q) => q.eq(q.field("drinkId"), args.id)).take(20)
  },
});
