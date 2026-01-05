import { query, mutation } from './_generated/server';
import { v } from "convex/values";

const DEFAULT_CAPACITY = 50;

export const listDrinks = query({
  handler: async (ctx) => {
    return await ctx.db.query('drinks').collect();
  },
});

/**
 * Order a drink - creates order item and records for pricing engine
 * Enforces purchase limit: 3x party member count
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
    
    // Capacity check and reserve stock
    const availableCapacity = typeof drink.capacity === 'number' ? drink.capacity : DEFAULT_CAPACITY;
    if (availableCapacity < quantity) {
      throw new Error(`Out of stock. Only ${availableCapacity} left for ${drink.name}.`);
    }

    // Check purchase limit: 3x party member count
    // Count active party members
    const allMembers = await ctx.db.query("partyMembers").collect();
    const activeMembers = allMembers.filter(
      (r) => String(r.partyId) === String(args.partyId) && (r.leftAt === undefined || r.leftAt === null)
    );
    const memberCount = Math.max(1, activeMembers.length); // minimum 1
    const purchaseLimit = memberCount * 3;
    
    // Count current pending (non-finalized) order items for this party
    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    const pendingItems = orderItems.filter(item => !item.finalized);
    const currentPendingTotal = pendingItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Check if adding this order would exceed limit
    if (currentPendingTotal + quantity > purchaseLimit) {
      throw new Error(`Purchase limit exceeded!\n Your party (${memberCount} members) can have max ${purchaseLimit} pending items in basket.\n Currently you have: ${currentPendingTotal}`);
    }
    
    // Reserve capacity immediately so stock cannot be oversold
    await ctx.db.patch(drink._id, { capacity: availableCapacity - quantity });

    // Create order record
    const orderId = await ctx.db.insert('orders', {
      partyId: args.partyId,
      createdAt: Date.now(),
    });
    
    // Calculate 1% trading fee on order value
    const orderValue = quantity * drink.currentPrice;
    const feePaid = orderValue * 0.01; // 1% fee
    
    // Round prices to 2 decimal places (ceiling)
    const roundedPrice = Math.ceil(drink.currentPrice * 100) / 100;
    const roundedFee = Math.round(feePaid * 100) / 100;
    
    // Create order item
    await ctx.db.insert('orderItems', {
      orderId,
      partyId: args.partyId,
      drinkId: args.drinkId,
      drinkName: drink.name,
      quantity,
      priceAtOrder: roundedPrice,
      regularPriceAtOrder: drink.regularPrice,
      feePaid: roundedFee,
      createdAt: Date.now(),
    });
    
    // NOTE: tickOrders are created when order is finalized, not when added to basket
    // This prevents pending/unconfirmed orders from affecting prices
    
    return { success: true, orderId };
  },
});

/**
 * Get all order items for a party
 */
export const getPartyOrders = query({
  args: { partyId: v.optional(v.union(v.id('parties'), v.string())) },
  handler: async (ctx, args) => {
    if (!args.partyId) return [];

    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    
    return orderItems.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get order summary for a party (total count and total price)
 * Only counts non-finalized (pending) orders
 */
export const getPartyOrderSummary = query({
  args: { partyId: v.optional(v.union(v.id('parties'), v.string())) },
  handler: async (ctx, args) => {
    if (!args.partyId) return { totalItems: 0, totalPrice: 0, totalFees: 0, itemCount: 0 };

    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    
    // Only count non-finalized items
    const pendingItems = orderItems.filter(item => !item.finalized);
    
    const totalItems = pendingItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = pendingItems.reduce((sum, item) => sum + (item.quantity * item.priceAtOrder), 0);
    const totalFees = pendingItems.reduce((sum, item) => sum + item.feePaid, 0);
    
    return { totalItems, totalPrice, totalFees, itemCount: pendingItems.length };
  },
});

/**
 * Delete a specific order item
 */
export const deleteOrderItem = mutation({
  args: { orderItemId: v.id('orderItems') },
  handler: async (ctx, args) => {
    const orderItem = await ctx.db.get(args.orderItemId);
    if (orderItem && !orderItem.finalized) {
      // restore capacity for pending items that are removed/expired
      const drink = await ctx.db.get(orderItem.drinkId);
      const currentCapacity = typeof drink?.capacity === 'number' ? drink.capacity : DEFAULT_CAPACITY;
      await ctx.db.patch(orderItem.drinkId, { capacity: currentCapacity + orderItem.quantity });
    }

    await ctx.db.delete(args.orderItemId);
    return { success: true };
  },
});

/**
 * Finalize all pending orders for a party (move to history)
 * This creates tickOrders entries for the pricing engine
 */
export const finalizePartyOrders = mutation({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    
    // Update all non-finalized items and create tickOrders
    const now = Date.now();
    let finalizedCount = 0;
    
    for (const item of orderItems) {
      if (!item.finalized) {
        // Mark as finalized
        await ctx.db.patch(item._id, {
          finalized: true,
          finalizedAt: now,
        });
        
        // Create tickOrders entry for pricing engine
        await ctx.db.insert('tickOrders', {
          tickId: 0, // will be set by pricing engine
          drinkId: item.drinkId,
          userId: String(args.partyId), // use partyId as userId for finalized orders
          quantity: item.quantity,
          impactQuantity: Math.min(item.quantity, 2), // cap at 2 per order
          createdAt: now,
        });
        
        finalizedCount++;
      }
    }
    
    return { success: true, finalizedCount };
  },
});