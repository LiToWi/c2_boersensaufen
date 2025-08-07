import { query, mutation } from './_generated/server';

export const listDrinks = query({
  handler: async (ctx) => {
    return await ctx.db.query('drinks').collect();
  },
});

import { v } from "convex/values";

export const orderDrink = mutation({
  args: { sessionId: v.id("parties"), drinkId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert('orders', {
      partyId: args.sessionId,
      createdAt: Date.now(),
    });
  },
});