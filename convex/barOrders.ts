import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get all finalized orders for the bar, grouped by status
 * Ordered by FIFO (First Come, First Serve)
 */
export const getBarOrders = query({
  args: {
    status: v.optional(v.string()), // filter by status: 'pending' | 'in_progress' | 'completed' | null for all
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('finalized'), true))
      .collect();

    // Filter by status if provided
    if (args.status) {
      items = items.filter((item) => {
        const itemStatus = item.barStatus || 'pending';
        return itemStatus === args.status;
      });
    }

    // Sort by creation time (FIFO)
    items.sort((a, b) => a.createdAt - b.createdAt);

    // Enrich with party and table information
    const enriched = await Promise.all(
      items.map(async (item) => {
        const party = await ctx.db.get(item.partyId);
        let tableName = 'Unknown';
        if (party?.tableId) {
          const table = await ctx.db.get(party.tableId);
          tableName = table?.name || 'Unknown';
        }

        return {
          ...item,
          partyName: party?.name || 'Unknown',
          tableName,
          barStatus: item.barStatus || 'pending',
        };
      })
    );

    return enriched;
  },
});

/**
 * Update the bar status of an order item
 */
export const updateOrderStatus = mutation({
  args: {
    orderItemId: v.id('orderItems'),
    status: v.string(), // 'pending' | 'in_progress' | 'completed' | 'archived'
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.orderItemId);
    if (!item) {
      throw new Error('Order item not found');
    }

    await ctx.db.patch(args.orderItemId, {
      barStatus: args.status,
      barStatusUpdatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Auto-archive completed orders older than 10 minutes
 */
export const autoArchiveOldOrders = mutation({
  handler: async (ctx) => {
    const archiveTimeAgo = Date.now() - 3 * 60 * 1000;
    
    const completedItems = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('barStatus'), 'completed'))
      .collect();

    let archivedCount = 0;
    for (const item of completedItems) {
      if (item.barStatusUpdatedAt && item.barStatusUpdatedAt < archiveTimeAgo) {
        await ctx.db.patch(item._id, {
          barStatus: 'archived',
          barStatusUpdatedAt: Date.now(),
        });
        archivedCount++;
      }
    }

    return { archivedCount };
  },
});

/**
 * Get order statistics for the bar dashboard
 */
export const getBarStats = query({
  handler: async (ctx) => {
    const items = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('finalized'), true))
      .collect();

    const pending = items.filter((i) => !i.barStatus || i.barStatus === 'pending').length;
    const inProgress = items.filter((i) => i.barStatus === 'in_progress').length;
    const completed = items.filter((i) => i.barStatus === 'completed').length;
    const archived = items.filter((i) => i.barStatus === 'archived').length;
    const total = items.length;

    return {
      pending,
      inProgress,
      completed,
      archived,
      total,
    };
  },
});

/**
 * Get timing statistics for bar operations
 */
export const getBarTimingStats = query({
  handler: async (ctx) => {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const items = await ctx.db
      .query('orderItems')
      .filter((q) => q.eq(q.field('finalized'), true))
      .collect();

    // Calculate average time from order to completion (for completed/archived orders)
    const completedOrders = items.filter(o => 
      (o.barStatus === 'completed' || o.barStatus === 'archived') && 
      o.barStatusUpdatedAt && 
      o.finalizedAt
    );
    
    const totalCompletionTime = completedOrders.reduce((sum, order) => {
      const timeTaken = (order.barStatusUpdatedAt || 0) - (order.finalizedAt || order.createdAt);
      return sum + timeTaken;
    }, 0);
    
    const avgCompletionTime = completedOrders.length > 0 
      ? totalCompletionTime / completedOrders.length 
      : 0;

    // Calculate average wait time for pending orders
    const pendingOrders = items.filter(o => !o.barStatus || o.barStatus === 'pending');
    const totalPendingTime = pendingOrders.reduce((sum, order) => {
      return sum + (now - (order.finalizedAt || order.createdAt));
    }, 0);
    const avgPendingTime = pendingOrders.length > 0 
      ? totalPendingTime / pendingOrders.length 
      : 0;

    // Calculate average in-progress time
    const inProgressOrders = items.filter(o => o.barStatus === 'in_progress');
    const totalInProgressTime = inProgressOrders.reduce((sum, order) => {
      return sum + (now - (order.barStatusUpdatedAt || order.finalizedAt || order.createdAt));
    }, 0);
    const avgInProgressTime = inProgressOrders.length > 0 
      ? totalInProgressTime / inProgressOrders.length 
      : 0;

    // Finished per hour: number of items moved to completed/archived in last 60 minutes
    // Fallback to createdAt if barStatusUpdatedAt is not set (legacy data)
    const finishedPerHour = items.filter(o => {
      if (o.barStatus !== 'completed' && o.barStatus !== 'archived') return false;
      const timestamp = o.barStatusUpdatedAt || o.finalizedAt || o.createdAt;
      return timestamp >= hourAgo;
    }).length;

    return {
      avgCompletionTimeMs: Math.round(avgCompletionTime),
      // Deprecated in UI: avgPendingTimeMs, avgInProgressTimeMs
      avgPendingTimeMs: Math.round(avgPendingTime),
      avgInProgressTimeMs: Math.round(avgInProgressTime),
      finishedPerHour,
      completedCount: completedOrders.length,
    };
  },
});
