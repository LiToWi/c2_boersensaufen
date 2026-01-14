import { query, mutation, internalMutation } from './_generated/server';
import { v } from "convex/values";

const DEFAULT_CAPACITY = 50;

export const listDrinks = query({
  handler: async (ctx) => {
    return await ctx.db.query('drinks').collect();
  },
});

export const updateDrink = mutation({
  args: {
    drinkId: v.id('drinks'),
    currentPrice: v.optional(v.number()),
    regularPrice: v.optional(v.number()),
    capacity: v.optional(v.number()),
    priority: v.optional(v.number()),
    active: v.optional(v.boolean()),
    lowBoundPrice: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { drinkId, ...rest } = args
    const updates: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) updates[k] = v
    }
    if (Object.keys(updates).length === 0) return { updated: false }
    await ctx.db.patch(drinkId, updates)
    return { updated: true }
  }
})

/**
 * Get a single drink by ID
 */
export const getDrinkById = query({
  args: { drinkId: v.id('drinks') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.drinkId);
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
    
    // Count current pending items, excluding expired ones
    // The cron job handles deletion; we just filter them out
    const now = Date.now();
    const orderItems = await ctx.db
      .query('orderItems')
      .withIndex('by_party', (q) => q.eq('partyId', args.partyId))
      .collect();
    
    // Count only non-finalized, non-expired items
    const currentPendingTotal = orderItems
      .filter(item => {
        if (item.finalized) return false;
        const expiresAt = item.expiresAt || (item.createdAt + 60000);
        return expiresAt > now; // Only count items that haven't expired yet
      })
      .reduce((sum, item) => sum + item.quantity, 0);
    
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
    
    // Calculate trading fee on order value from settings (default 1%)
    const orderValue = quantity * drink.currentPrice;
    const feeSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', q => q.eq('key', 'tradingFeeRate'))
      .first()
    const feeRate = typeof feeSetting?.value === 'number' ? feeSetting.value : 0.01
    const feePaid = orderValue * feeRate
    
    // Round prices to 2 decimal places (ceiling)
    const roundedPrice = Math.ceil(drink.currentPrice * 100) / 100;
    const roundedFee = Math.round(feePaid * 100) / 100;
    
    // Create order item with expiry timestamp
    const itemCreatedAt = Date.now();
    await ctx.db.insert('orderItems', {
      orderId,
      partyId: args.partyId,
      drinkId: args.drinkId,
      drinkName: drink.name,
      quantity,
      priceAtOrder: roundedPrice,
      regularPriceAtOrder: drink.regularPrice,
      feePaid: roundedFee,
      createdAt: itemCreatedAt,
      expiresAt: itemCreatedAt + 60000, // Expires 60 seconds after creation
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
  args: { partyId: v.optional(v.union(v.id('parties'), v.string())), includeFinalized: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    if (!args.partyId) return { totalItems: 0, totalPrice: 0, totalFees: 0, totalSavings: 0, itemCount: 0 };

    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();
    
    // If includeFinalized is true, include both finalized and non-finalized items
    // Otherwise, only count non-finalized items (default for basket view)
    const items = args.includeFinalized === true 
      ? orderItems 
      : orderItems.filter(item => !item.finalized);
    
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.quantity * item.priceAtOrder), 0);
    const totalFees = items.reduce((sum, item) => sum + item.feePaid, 0);
    const totalSavings = items.reduce((sum, item) => {
      const regularPrice = item.regularPriceAtOrder ?? item.priceAtOrder;
      return sum + (item.quantity * (regularPrice - item.priceAtOrder));
    }, 0);
    
    return { totalItems, totalPrice, totalFees, totalSavings, itemCount: items.length };
  },
});

/**
 * Delete a specific order item
 */
export const deleteOrderItem = mutation({
  args: { orderItemId: v.id('orderItems') },
  handler: async (ctx, args) => {
    const orderItem = await ctx.db.get(args.orderItemId);
    
    // If the order item doesn't exist, return early (idempotent)
    if (!orderItem) {
      return { success: true };
    }
    
    if (!orderItem.finalized) {
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

/**
 * Internal mutation to clean up expired basket items
 * Called by cron job every 30 seconds
 * Uses index for efficient querying
 */
export const cleanupExpiredItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Query only expired items using index (much faster than scanning all items)
    // Note: We can't directly filter expiresAt <= now in the index query,
    // so we get all items and filter. This is still faster than no index.
    const allItems = await ctx.db.query('orderItems').collect();
    
    let deletedCount = 0;
    for (const item of allItems) {
      // Skip finalized items
      if (item.finalized) continue;
      
      // Check if expired using expiresAt field or fallback to age calculation
      const expiresAt = item.expiresAt || (item.createdAt + 60000);
      
      if (expiresAt <= now) {
        // Restore capacity
        const drink = await ctx.db.get(item.drinkId);
        if (drink) {
          const currentCapacity = typeof drink.capacity === 'number' ? drink.capacity : DEFAULT_CAPACITY;
          await ctx.db.patch(item.drinkId, { capacity: currentCapacity + item.quantity });
        }
        
        // Delete expired item
        await ctx.db.delete(item._id);
      }
    }
  },
});

/**
 * Get top 5 ordered drinks (by quantity)
 */
export const topOrderedDrinks = query({
  args: {},
  handler: async (ctx) => {
    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('finalized'), true))
      .collect();
    
    const drinkMap = new Map<string, { drinkId: string; drinkName: string; quantity: number }>();
    
    for (const item of orderItems) {
      const key = String(item.drinkId);
      if (drinkMap.has(key)) {
        const existing = drinkMap.get(key)!;
        existing.quantity += item.quantity;
      } else {
        drinkMap.set(key, {
          drinkId: String(item.drinkId),
          drinkName: item.drinkName,
          quantity: item.quantity,
        });
      }
    }
    
    return Array.from(drinkMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  },
});

/**
 * Get top 5 most expensive drinks (highest markup relative to regular price)
 */
export const topExpensiveDrinks = query({
  args: {},
  handler: async (ctx) => {
    const drinks = await ctx.db.query('drinks').collect();
    
    return drinks
      .filter((d) => d.active !== false && d.regularPrice && d.currentPrice)
      .map((d) => ({
        _id: d._id,
        name: d.name,
        currentPrice: d.currentPrice,
        regularPrice: d.regularPrice!,
        markup: d.currentPrice - d.regularPrice!,
        markupPercent: ((d.currentPrice - d.regularPrice!) / d.regularPrice!) * 100,
      }))
      .sort((a, b) => b.markup - a.markup)
      .slice(0, 5);
  },
});

/**
 * Get top 5 cheapest drinks (highest discount relative to regular price)
 */
export const topCheapestDrinks = query({
  args: {},
  handler: async (ctx) => {
    const drinks = await ctx.db.query('drinks').collect();
    
    return drinks
      .filter((d) => d.active !== false && d.regularPrice && d.currentPrice)
      .map((d) => ({
        _id: d._id,
        name: d.name,
        currentPrice: d.currentPrice,
        regularPrice: d.regularPrice!,
        discount: d.regularPrice! - d.currentPrice,
        discountPercent: ((d.regularPrice! - d.currentPrice) / d.regularPrice!) * 100,
      }))
      .sort((a, b) => b.discount - a.discount)
      .slice(0, 5);
  },
});

/**
 * Get top 10 parties by cumulative savings
 */
export const topPartiesBySavings = query({
  args: {},
  handler: async (ctx) => {
    const orderItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('finalized'), true))
      .collect();
    
    const parties = await ctx.db.query('parties').collect();
    
    const partyMap = new Map<string, {
      partyId: string;
      partyName: string;
      totalSavings: number;
      orderCount: number;
    }>();
    
    for (const item of orderItems) {
      const partyId = String(item.partyId);
      const savings = item.quantity * ((item.regularPriceAtOrder ?? item.priceAtOrder) - item.priceAtOrder);
      
      if (partyMap.has(partyId)) {
        const existing = partyMap.get(partyId)!;
        existing.totalSavings += savings;
        existing.orderCount += 1;
      } else {
        const party = parties.find((p) => String(p._id) === partyId);
        partyMap.set(partyId, {
          partyId,
          partyName: party?.name || 'Unknown Party',
          totalSavings: savings,
          orderCount: 1,
        });
      }
    }
    
    return Array.from(partyMap.values())
      .sort((a, b) => b.totalSavings - a.totalSavings)
      .slice(0, 10);
  },
});