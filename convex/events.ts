/**
 * Market Events System
 * 
 * Events are stored in a queue and triggered sequentially.
 * Queue can be reordered by admin at any time.
 * Repeatable events are added back to queue after being played.
 */

import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * Create a new market event (added to pool)
 */
export const createEvent = mutation({
  args: {
    title: v.string(),
    textDe: v.string(),
    textEn: v.string(),
    effectType: v.union(v.literal('global'), v.literal('category'), v.literal('excluded_drinks'), v.literal('specific_drinks'), v.literal('market_parameters')),
    effects: v.any(),
    repeatable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert('events', {
      title: args.title,
      textDe: args.textDe,
      textEn: args.textEn,
      effectType: args.effectType,
      effects: args.effects,
      repeatable: args.repeatable,
      createdAt: Date.now(),
      has_occurred: false,
    });

    return { id: eventId };
  },
});

/**
 * Update an existing event
 */
export const updateEvent = mutation({
  args: {
    eventId: v.id('events'),
    title: v.optional(v.string()),
    textDe: v.optional(v.string()),
    textEn: v.optional(v.string()),
    effectType: v.optional(v.union(v.literal('global'), v.literal('category'), v.literal('excluded_drinks'), v.literal('specific_drinks'), v.literal('market_parameters'))),
    effects: v.optional(v.any()),
    repeatable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;
    await ctx.db.patch(eventId, updates);
    return { success: true };
  },
});

/**
 * Delete an event
 */
export const deleteEvent = mutation({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    // Remove from queue if present
    const queueItems = await ctx.db
      .query('event_queue')
      .filter((q) => q.eq(q.field('eventId'), args.eventId))
      .collect();

    for (const item of queueItems) {
      await ctx.db.delete(item._id);
    }

    // Delete event
    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});

/**
 * Get all events in the pool
 */
export const getAllEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('events').collect();
  },
});

/**
 * Get current queue in order
 */
export const getEventQueue = query({
  args: {},
  handler: async (ctx) => {
    const queueItems = await ctx.db
      .query('event_queue')
      .withIndex('by_position')
      .order('asc')
      .collect();

    const result = [];
    for (const item of queueItems) {
      const event = await ctx.db.get(item.eventId);
      if (event) {
        result.push({
          queueId: item._id,
          position: item.position,
          event,
        });
      }
    }
    return result;
  },
});

/**
 * Get the currently active event (first in queue)
 */
export const getCurrentEvent = query({
  args: {},
  handler: async (ctx) => {
    const firstInQueue = await ctx.db
      .query('event_queue')
      .withIndex('by_position')
      .order('asc')
      .first();

    if (!firstInQueue) return null;

    return await ctx.db.get(firstInQueue.eventId);
  },
});

/**
 * Initialize queue randomly from all available events
 */
export const initializeQueue = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing queue
    const existingQueue = await ctx.db.query('event_queue').collect();
    for (const item of existingQueue) {
      await ctx.db.delete(item._id);
    }

    // Get all events
    const events = await ctx.db.query('events').collect();

    if (events.length === 0) {
      return { success: true, queueSize: 0 };
    }

    // Shuffle events randomly
    const shuffled = [...events].sort(() => Math.random() - 0.5);

    // Add to queue with positions
    for (let i = 0; i < shuffled.length; i++) {
      await ctx.db.insert('event_queue', {
        eventId: shuffled[i]._id,
        position: i,
        createdAt: Date.now(),
      });
    }

    return { success: true, queueSize: shuffled.length };
  },
});

/**
 * Reorder queue (admin drag-and-drop)
 */
export const reorderQueue = mutation({
  args: {
    orderedQueueIds: v.array(v.id('event_queue')),
  },
  handler: async (ctx, args) => {
    for (let i = 0; i < args.orderedQueueIds.length; i++) {
      const queueId = args.orderedQueueIds[i];
      await ctx.db.patch(queueId, { position: i });
    }
    return { success: true };
  },
});

/**
 * Internal mutation to trigger next event in queue
 * Called by cron job every 10 minutes when market is active
 */
export const triggerNextEvent = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Check if market is active - event queue only processes when market has started
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    if (!marketState || marketState.active === false) {
      console.log('[Events] Skipping event trigger - market not active');
      return { skipped: true, reason: 'Market not active', timestamp: now };
    }

    console.log('[Events] Market active - processing next event in queue');

    // First, restore previous event's market parameters if any
    const previousEvent = await ctx.db
      .query('events')
      .filter((q) => q.eq(q.field('has_occurred'), true))
      .collect()
      .then(events => {
        // Find the most recently occurred event that was market_parameters type
        return events
          .filter(e => e.effectType === 'market_parameters')
          .sort((a, b) => (b.occurred_at || 0) - (a.occurred_at || 0))[0];
      });

    if (previousEvent && previousEvent.effectType === 'market_parameters') {
      const effects = previousEvent.effects as any;
      if (effects.savedConfig) {
        // Restore the saved config
        const settingsRow = await ctx.db.query('settings').filter(q => q.eq(q.field('key'), 'pricingConfig')).first();
        if (settingsRow) {
          await ctx.db.patch(
            settingsRow._id,
            { value: effects.savedConfig, updatedAt: now }
          );
        }
      }
    }

    // Get first event in queue
    const firstInQueue = await ctx.db
      .query('event_queue')
      .withIndex('by_position')
      .order('asc')
      .first();

    if (!firstInQueue) {
      return { skipped: true, reason: 'Queue is empty' };
    }

    const event = await ctx.db.get(firstInQueue.eventId);
    if (!event) {
      await ctx.db.delete(firstInQueue._id);
      return { skipped: true, reason: 'Event not found' };
    }

    // If this is a market_parameters event, save current config and apply new one
    if (event.effectType === 'market_parameters') {
      const effects = event.effects as any;
      const currentSettings = await ctx.db
        .query('settings')
        .filter(q => q.eq(q.field('key'), 'pricingConfig'))
        .first();

      const savedConfig = currentSettings?.value || {};

      // Apply new parameters
      if (currentSettings && effects.parameters) {
        const newConfig = { ...savedConfig, ...effects.parameters };
        await ctx.db.patch(currentSettings._id, {
          value: newConfig,
          updatedAt: now,
        });
      }

      // Store saved config in event for restoration later
      await ctx.db.patch(event._id, {
        effects: {
          ...effects,
          savedConfig,
        },
      } as any);
    } else {
      // For price-affecting events (not market_parameters), apply effects NOW to all affected drinks
      const effects = event.effects as any;
      const multiplier = effects.multiplier ?? null;
      const override = effects.override ?? null;
      const fixedAddition = effects.fixedAddition ?? null;

      // Get all drinks
      const allDrinks = await ctx.db.query('drinks').filter(q => q.eq(q.field('active'), true)).collect();
      
      for (const drink of allDrinks) {
        let shouldAffect = false;

        // Determine if this drink is affected by the event
        switch (event.effectType) {
          case 'global':
            shouldAffect = true;
            break;

          case 'specific_drinks':
            if (effects.drinkIds && effects.drinkIds.includes(drink._id)) {
              shouldAffect = true;
            }
            break;

          case 'excluded_drinks':
            if (effects.excludedDrinkIds && !effects.excludedDrinkIds.includes(drink._id)) {
              shouldAffect = true;
            }
            break;

          case 'category':
            if (effects.categoryIds && drink.categoryId && effects.categoryIds.includes(drink.categoryId)) {
              shouldAffect = true;
            }
            break;
        }

        // Apply the effect to this drink's current price
        if (shouldAffect) {
          let newPrice = drink.currentPrice;

          // Apply multiplier
          if (multiplier !== null && multiplier !== 1) {
            newPrice = newPrice * multiplier;
          }

          // Override completely replaces
          if (override !== null) {
            newPrice = override;
          }

          // Fixed addition adds/subtracts
          if (fixedAddition !== null) {
            newPrice += fixedAddition;
          }

          // Enforce bounds
          const lowerBound = drink.regularPrice ? drink.regularPrice * 0.4 : 0;
          const upperBound = drink.regularPrice ? drink.regularPrice * 2.5 : newPrice;
          
          if (newPrice < lowerBound) {
            newPrice = lowerBound;
          } else if (newPrice > upperBound) {
            newPrice = upperBound;
          }

          // Round and update
          const roundedPrice = Math.ceil(newPrice * 100) / 100;
          await ctx.db.patch(drink._id, {
            currentPrice: roundedPrice,
          });
        }
      }
    }

    // Mark event as occurred (this prevents it from being applied again)
    await ctx.db.patch(event._id, {
      has_occurred: true,
      occurred_at: now,
    });

    // Remove from queue
    await ctx.db.delete(firstInQueue._id);

    // If repeatable, add back to end of queue
    if (event.repeatable) {
      const maxPosition = await ctx.db
        .query('event_queue')
        .collect()
        .then((items) => Math.max(...items.map((i) => i.position), -1));

      await ctx.db.insert('event_queue', {
        eventId: event._id,
        position: maxPosition + 1,
        createdAt: now,
      });
    }

    // Renumber positions to be sequential (0, 1, 2, ...)
    const allQueue = await ctx.db
      .query('event_queue')
      .withIndex('by_position')
      .order('asc')
      .collect();

    for (let i = 0; i < allQueue.length; i++) {
      await ctx.db.patch(allQueue[i]._id, { position: i });
    }

    return {
      activated: event._id,
      eventText: event.textEn,
      willRepeat: event.repeatable,
      effectType: event.effectType,
    };
  },
});

/**
 * Clear all has_occurred flags (called on system reset)
 */
export const resetOccurrenceFlags = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query('events').collect();
    for (const event of events) {
      await ctx.db.patch(event._id, {
        has_occurred: false,
        occurred_at: undefined,
      });
    }
    return { success: true, resetCount: events.length };
  },
});

/**
 * Get price multiplier for a specific drink based on active event
 * Returns the multiplier, override, and fixedAddition that should be applied
 */
export const getPriceMultiplierForDrink = query({
  args: {
    drinkId: v.id('drinks'),
    categoryId: v.optional(v.id('categories')),
  },
  handler: async (ctx, args) => {
    const currentEvent = await ctx.db
      .query('event_queue')
      .withIndex('by_position')
      .order('asc')
      .first();

    if (!currentEvent) {
      return { multiplier: 1.0, override: null, fixedAddition: null }; // No active event
    }

    const event = await ctx.db.get(currentEvent.eventId);
    if (!event) {
      return { multiplier: 1.0, override: null, fixedAddition: null };
    }

    // Market parameters events don't affect individual drink prices
    if (event.effectType === 'market_parameters') {
      return { multiplier: 1.0, override: null, fixedAddition: null };
    }

    const effects = event.effects as any;
    const multiplier = effects.multiplier ?? 1.0;
    const override = effects.override ?? null;
    const fixedAddition = effects.fixedAddition ?? null;

    // Check if this drink is affected by the event
    switch (event.effectType) {
      case 'global':
        return { multiplier, override, fixedAddition };

      case 'specific_drinks':
        if (effects.type === 'specific_drinks' && effects.drinkIds && effects.drinkIds.includes(args.drinkId)) {
          return { multiplier, override, fixedAddition };
        }
        return { multiplier: 1.0, override: null, fixedAddition: null };

      case 'excluded_drinks':
        if (effects.type === 'excluded_drinks' && effects.excludedDrinkIds && !effects.excludedDrinkIds.includes(args.drinkId)) {
          return { multiplier, override, fixedAddition };
        }
        return { multiplier: 1.0, override: null, fixedAddition: null };

      case 'category':
        // Check if this drink's category is in the event's target categories
        if (effects.type === 'category' && effects.categoryIds && args.categoryId && effects.categoryIds.includes(args.categoryId)) {
          return { multiplier, override, fixedAddition };
        }
        return { multiplier: 1.0, override: null, fixedAddition: null };

      default:
        return { multiplier: 1.0, override: null, fixedAddition: null };
    }
  },
});
