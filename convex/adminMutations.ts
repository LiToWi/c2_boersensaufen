import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Internal mutation to set market active/inactive
 */
export const setMarketActive = internalMutation({
  args: { active: v.boolean() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    if (marketState) {
      const update: any = { active: args.active };
      
      if (args.active && marketState.active === false) {
        // Starting the market after it was stopped
        update.currentSessionStartedAt = now;
      } else if (args.active && marketState.active === undefined) {
        // Migrating from old state - market was running but active field didn't exist
        // Initialize tracking fields
        update.currentSessionStartedAt = now;
        update.totalRunningTimeMs = 0;
      } else if (args.active && !marketState.currentSessionStartedAt) {
        // Already active but currentSessionStartedAt not set (migration case)
        update.currentSessionStartedAt = now;
        if (!marketState.totalRunningTimeMs) {
          update.totalRunningTimeMs = 0;
        }
      } else if (!args.active && marketState.active !== false) {
        // Stopping the market
        const sessionTime = marketState.currentSessionStartedAt 
          ? now - marketState.currentSessionStartedAt 
          : 0;
        update.totalRunningTimeMs = (marketState.totalRunningTimeMs || 0) + sessionTime;
        update.currentSessionStartedAt = undefined;
      }
      
      await ctx.db.patch(marketState._id, update);
      console.log(`Market ${args.active ? 'started' : 'stopped'}`);
    } else {
      // Create new market state if it doesn't exist
      await ctx.db.insert('marketState', {
        stateKey: 'global',
        active: args.active,
        regime: 'Normal',
        regimeStartedAt: now,
        lastTickAt: now,
        tickCount: 0,
        currentSessionStartedAt: args.active ? now : undefined,
        totalRunningTimeMs: 0,
      });
    }
  },
});

/**
 * Delete order items in batches - deletes ALL records
 */
export const clearOrderItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    let items = await ctx.db.query('orderItems').take(100);
    while (items.length > 0) {
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      items = await ctx.db.query('orderItems').take(100);
    }
  },
});

/**
 * Delete orders in batches - deletes ALL records
 */
export const clearOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    let items = await ctx.db.query('orders').take(100);
    while (items.length > 0) {
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      items = await ctx.db.query('orders').take(100);
    }
  },
});

/**
 * Delete party members in batches - deletes ALL records
 */
export const clearPartyMembers = internalMutation({
  args: {},
  handler: async (ctx) => {
    let items = await ctx.db.query('partyMembers').take(100);
    while (items.length > 0) {
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      items = await ctx.db.query('partyMembers').take(100);
    }
  },
});

/**
 * Clear R2O orders and set all drinks to inactive (don't delete to preserve priorities)
 * The sync action will then repull from Ready2Order and reactivate drinks
 */
export const clearR2OData = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Delete all R2O orders
    let orders = await ctx.db.query('r2oOrders').take(100);
    while (orders.length > 0) {
      for (const order of orders) {
        await ctx.db.delete(order._id);
      }
      orders = await ctx.db.query('r2oOrders').take(100);
    }
    
    // Set all drinks to inactive (preserve priorities and data)
    let drinks = await ctx.db.query('drinks').take(100);
    while (drinks.length > 0) {
      for (const drink of drinks) {
        await ctx.db.patch(drink._id, { active: false });
      }
      drinks = await ctx.db.query('drinks').take(100);
    }
  },
});

/**
 * Delete parties - deletes ALL records
 */
export const clearParties = internalMutation({
  args: {},
  handler: async (ctx) => {
    let items = await ctx.db.query('parties').take(100);
    while (items.length > 0) {
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      items = await ctx.db.query('parties').take(100);
    }
  },
});

/**
 * Delete drink market state - deletes ALL records
 */
export const clearDrinkMarketState = internalMutation({
  args: {},
  handler: async (ctx) => {
    let states = await ctx.db.query('drinkMarketState').take(100);
    while (states.length > 0) {
      for (const state of states) {
        await ctx.db.delete(state._id);
      }
      states = await ctx.db.query('drinkMarketState').take(100);
    }
  },
});

/**
 * Delete price snapshots and tick orders - deletes ALL records
 */
export const clearPriceData = internalMutation({
  args: {},
  handler: async (ctx) => {
    let snapshots = await ctx.db.query('priceSnapshots').take(100);
    while (snapshots.length > 0) {
      for (const snapshot of snapshots) {
        await ctx.db.delete(snapshot._id);
      }
      snapshots = await ctx.db.query('priceSnapshots').take(100);
    }
    
    let tickOrders = await ctx.db.query('tickOrders').take(100);
    while (tickOrders.length > 0) {
      for (const order of tickOrders) {
        await ctx.db.delete(order._id);
      }
      tickOrders = await ctx.db.query('tickOrders').take(100);
    }
  },
});

/**
 * Internal mutation to initialize market state
 */
export const initializeMarketState = internalMutation({
  args: { active: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // Delete existing market state
    const existing = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .collect();
    
    for (const state of existing) {
      await ctx.db.delete(state._id);
    }

    // Create fresh market state with required fields
    const now = Date.now();
    const isActive = args.active !== undefined ? args.active : false; // Default to stopped for reset
    
    await ctx.db.insert('marketState', {
      stateKey: 'global',
      active: isActive,
      regime: 'Normal', // Start with Normal regime
      regimeStartedAt: now,
      lastTickAt: now,
      tickCount: 0,
      currentSessionStartedAt: isActive ? now : undefined,
      totalRunningTimeMs: 0,
    });

    // Reset all drink market states
    const drinkStates = await ctx.db.query('drinkMarketState').collect();
    for (const state of drinkStates) {
      await ctx.db.delete(state._id);
    }

    // Reset all drinks to default capacity and regular price
    const drinks = await ctx.db.query('drinks').collect();
    for (const drink of drinks) {
      await ctx.db.patch(drink._id, {
        currentPrice: drink.regularPrice || drink.currentPrice,
        capacity: 50, // Default capacity
      });
    }
  },
});
