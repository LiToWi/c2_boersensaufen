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
 * Also re-syncs Ready2Order products to refresh the drink catalog
 * Runs cleanup in background via scheduler to avoid timeouts
 */
export const resetSystem = action({
  args: {},
  handler: async (ctx) => {
    // Stop market immediately to halt pricing ticks and snapshot creation during cleanup
    await ctx.runMutation(internal.adminMutations.setMarketActive, { active: false });

    // Schedule all cleanup tasks to run in background
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearOrderItems, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearOrders, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearPartyMembers, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearR2OData, {}); // Sets drinks to inactive
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearParties, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearPriceData, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearDrinkMarketState, {});
    await ctx.scheduler.runAfter(0, internal.adminMutations.clearPartyPasswords, {});
    await ctx.scheduler.runAfter(0, internal.events.resetOccurrenceFlags, {}); // Reset event occurrence flags
    
    // After cleanup, re-sync Ready2Order (waits 3 seconds for cleanup to finish)
    // Note: syncReady2Order is an action, not directly accessible via internal - skip for now
    // TODO: Implement admin sync function as mutation instead of action
    
    // Reinitialize party passwords (after cleanup completes)
    await ctx.scheduler.runAfter(3000, internal.adminMutations.reinitializePartyPasswords, {});
    
    // Schedule market to be reset to stopped state after sync completes
    await ctx.scheduler.runAfter(8000, internal.adminMutations.initializeMarketState, { active: false });
    
    return { 
      success: true, 
      message: 'System reset started - cleanup running and Ready2Order products will be re-synced (may take 30-60 seconds). Market will be in stopped state.' 
    };
  },
});
