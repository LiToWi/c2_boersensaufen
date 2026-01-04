import { query, mutation } from './_generated/server';
import { api } from './_generated/api';

export const listDrinks = query({
  handler: async (ctx) => {
    return await ctx.db.query('drinks').collect();
  },
});

import { v } from "convex/values";

/**
 * Order a drink - creates order item and records for pricing engine
 */
export const orderDrink = mutation({
  args: { 
    partyId: v.id("parties"), 
    drinkId: v.id("drinks"),
    userId: v.string(), // table name or member key
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const quantity = args.quantity || 1;
    
    // Get drink details
    const drink = await ctx.db.get(args.drinkId);
    if (!drink) {
      throw new Error('Drink not found');
    }
    
    // Create order record
    const orderId = await ctx.db.insert('orders', {
      partyId: args.partyId,
      createdAt: Date.now(),
    });
    
    // Create order item
    await ctx.db.insert('orderItems', {
      orderId,
      partyId: args.partyId,
      drinkId: args.drinkId,
      drinkName: drink.name,
      quantity,
      priceAtOrder: drink.currentPrice,
      createdAt: Date.now(),
    });
    
    // Record for pricing engine tick
    await ctx.db.insert('tickOrders', {
      tickId: 0, // will be set by pricing engine
      drinkId: args.drinkId,
      userId: args.userId,
      quantity,
      impactQuantity: Math.min(quantity, 2), // cap at 2
      createdAt: Date.now(),
    });
    
    return { success: true, orderId };
  },
});

/**
 * Get all order items for a party
 */
export const getPartyOrders = query({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    
    return orderItems.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get order summary for a party (total count and total price)
 */
export const getPartyOrderSummary = query({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = orderItems.reduce((sum, item) => sum + (item.quantity * item.priceAtOrder), 0);
    
    return { totalItems, totalPrice, itemCount: orderItems.length };
  },
});

/**
 * Delete a specific order item
 */
export const deleteOrderItem = mutation({
  args: { orderItemId: v.id('orderItems') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.orderItemId);
    return { success: true };
  },
});