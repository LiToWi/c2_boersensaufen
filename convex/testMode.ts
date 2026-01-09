import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get test mode status
 */
export const getTestMode = query({
  handler: async (ctx) => {
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();
    
    return marketState?.testMode ?? false;
  },
});

/**
 * Enable test mode (skip all Ready2Order API calls)
 */
export const enableTestMode = mutation({
  handler: async (ctx) => {
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    if (!marketState) {
      throw new Error('Market state not initialized');
    }

    await ctx.db.patch(marketState._id, { testMode: true });
    console.log('[Test Mode] ENABLED - All R2O API calls will be skipped');
    
    return { success: true, testMode: true };
  },
});

/**
 * Disable test mode (enable Ready2Order API calls)
 */
export const disableTestMode = mutation({
  handler: async (ctx) => {
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    if (!marketState) {
      throw new Error('Market state not initialized');
    }

    await ctx.db.patch(marketState._id, { testMode: false });
    console.log('[Test Mode] DISABLED - R2O API calls will be executed normally');
    
    return { success: true, testMode: false };
  },
});

/**
 * Toggle test mode
 */
export const toggleTestMode = mutation({
  handler: async (ctx) => {
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    if (!marketState) {
      throw new Error('Market state not initialized');
    }

    const newTestMode = !marketState.testMode;
    await ctx.db.patch(marketState._id, { testMode: newTestMode });
    
    console.log(`[Test Mode] ${newTestMode ? 'ENABLED' : 'DISABLED'}`);
    
    return { success: true, testMode: newTestMode };
  },
});
