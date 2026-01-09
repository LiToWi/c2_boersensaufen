"use node";
import { action } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Start the market (enable pricing tick)
 */
export const startMarket = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.adminMutations.setMarketActive, { active: true });
    return { success: true, message: 'Market started successfully' };
  },
});

/**
 * Stop the market (disable pricing tick)
 */
export const stopMarket = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.adminMutations.setMarketActive, { active: false });
    return { success: true, message: 'Market stopped successfully' };
  },
});

/**
 * Reset everything: parties, orders, orderItems, drink pricing state, reset market state
 * Runs cleanup in background via scheduler to avoid timeouts
 */
export const resetSystem = action({
  args: {},
  handler: async (ctx) => {
    // Schedule all cleanup tasks to run in background
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearOrderItems, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearOrders, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearPartyMembers, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearR2OData, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearParties, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearPriceData, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearDrinkMarketState, {});
    
    // Schedule market to be reset to stopped state after cleanup
    await ctx.scheduler.runAfter(5000, internal.adminMutations.initializeMarketState, { active: false });
    
    return { 
      success: true, 
      message: 'System reset started - cleanup running in background (may take 30-60 seconds). Market will be in stopped state.' 
    };
  },
});
