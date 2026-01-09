import { query, internalQuery } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get all R2O orders for a party
 */
export const getPartyR2OOrders = query({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query('r2oOrders')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();

    return orders.sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

/**
 * Get all R2O orders (for admin dashboard)
 */
export const getAllR2OOrders = query({
  handler: async (ctx) => {
    const orders = await ctx.db.query('r2oOrders').collect();
    
    // Enrich with party information
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const party = await ctx.db.get(order.partyId);
        return {
          ...order,
          partyName: party?.name || 'Unknown',
        };
      })
    );

    return enrichedOrders.sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

/**
 * Get R2O orders by status
 */
export const getR2OOrdersByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query('r2oOrders')
      .filter((q) => q.eq(q.field('status'), args.status))
      .collect();

    // Enrich with party information
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const party = await ctx.db.get(order.partyId);
        return {
          ...order,
          partyName: party?.name || 'Unknown',
        };
      })
    );

    return enrichedOrders.sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

/**
 * Get parties with R2O table status (for admin monitoring)
 */
export const getPartiesWithR2OStatus = query({
  handler: async (ctx) => {
    const parties = await ctx.db.query('parties').collect();

    return parties
      .filter((p) => !p.closed) // Only open parties
      .map((p) => ({
        _id: p._id,
        name: p.name,
        createdAt: p.createdAt,
        r2oTableId: p.r2oTableId,
        r2oTableCreationStatus: p.r2oTableCreationStatus,
        r2oTableCreationError: p.r2oTableCreationError,
        r2oTableCreatedAt: p.r2oTableCreatedAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get R2O products created for a party
 */
export const getPartyR2OProducts = query({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query('r2oProducts')
      .filter((q) => q.eq(q.field('partyId'), args.partyId))
      .collect();

    return products.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Internal query to get party for R2O operations
 */
export const getPartyForR2O = internalQuery({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.partyId);
  },
});

/**
 * Internal query to get table for R2O operations
 */
export const getTableForR2O = internalQuery({
  args: { tableId: v.id('tables') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tableId);
  },
});
