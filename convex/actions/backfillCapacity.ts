"use node";
import { action } from '../_generated/server';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

const DEFAULT_CAPACITY = 50;

// One-off helper to backfill capacity for existing drinks after making it required.
// Run with: npx convex run backfillCapacity
export const backfillCapacity = action({
  handler: async (ctx): Promise<{ updated: number; total: number; defaultApplied: number }> => {
    const drinks = await ctx.runQuery(api.drinks.listDrinks);
    let updated = 0;

    for (const d of drinks as Array<{ _id: Id<'drinks'>; capacity?: number }>) {
      if (typeof d.capacity !== 'number') {
        await ctx.runMutation(internal.internal.syncMutations.setDrinkCapacity, {
          drinkId: d._id,
          capacity: DEFAULT_CAPACITY,
        });
        updated += 1;
      }
    }

    return { updated, total: drinks.length, defaultApplied: DEFAULT_CAPACITY };
  },
});
