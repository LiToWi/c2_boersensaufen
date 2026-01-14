import { query } from './_generated/server';

/**
 * Get comprehensive system statistics for admin dashboard
 */
export const getSystemStats = query({
  handler: async (ctx) => {
    // Parties stats
    const allParties = await ctx.db.query('parties').collect();
    const openParties = allParties.filter(p => !p.closed);
    const closedParties = allParties.filter(p => p.closed);

    // Orders stats
    const allOrders = await ctx.db.query('orderItems').collect();
    const finalizedOrders = allOrders.filter(o => o.finalized);
    const pendingOrders = allOrders.filter(o => !o.finalized);
    
    const totalRevenue = finalizedOrders.reduce((sum, order) => 
      sum + (order.priceAtOrder * order.quantity), 0
    );

    const regularRevenue = finalizedOrders.reduce((sum, order) => {
      const regular = order.regularPriceAtOrder ?? order.priceAtOrder;
      return sum + (regular * order.quantity);
    }, 0);
    
    const totalFees = finalizedOrders.reduce((sum, order) => 
      sum + (order.feePaid ?? 0), 0
    );

    const houseGainValue = totalRevenue - regularRevenue + totalFees;

    const houseGainPercent = regularRevenue > 0
      ? (houseGainValue / regularRevenue) * 100
      : 0;

    const avgOrderValue = finalizedOrders.length > 0
      ? totalRevenue / finalizedOrders.length
      : 0;

    const avgOrdersPerParty = allParties.length > 0
      ? allOrders.length / allParties.length
      : 0;

    // Drinks stats
    const drinks = await ctx.db.query('drinks').collect();
    const activeDrinks = drinks.filter(d => d.active);

    // R2O stats
    const r2oOrders = await ctx.db.query('r2oOrders').collect();
    const r2oProducts = await ctx.db.query('r2oProducts').collect();
    const submittedOrders = r2oOrders.filter(o => o.status === 'submitted');
    const failedOrders = r2oOrders.filter(o => o.status === 'failed');

    // Market state
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    // Party members
    const allMembers = await ctx.db.query('partyMembers').collect();
    const activeMembers = allMembers.filter(m => !m.leftAt);

    return {
      parties: {
        total: allParties.length,
        open: openParties.length,
        closed: closedParties.length,
      },
      orders: {
        total: allOrders.length,
        finalized: finalizedOrders.length,
        pending: pendingOrders.length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalFees: Number(totalFees.toFixed(2)),
        regularRevenue: Number(regularRevenue.toFixed(2)),
        houseGain: {
          value: Number(houseGainValue.toFixed(2)),
          percent: Number(houseGainPercent.toFixed(2)),
        },
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        avgOrdersPerParty: Number(avgOrdersPerParty.toFixed(2)),
      },
      drinks: {
        total: drinks.length,
        active: activeDrinks.length,
        inactive: drinks.length - activeDrinks.length,
      },
      r2o: {
        totalOrders: r2oOrders.length,
        submitted: submittedOrders.length,
        failed: failedOrders.length,
        totalProducts: r2oProducts.length,
      },
      market: {
        active: !!marketState, // Market is "active" if state exists
        regime: marketState?.regime || 'Unknown',
        tickCount: marketState?.tickCount ?? 0,
        lastTickAt: marketState?.lastTickAt ?? null,
      },
      members: {
        total: allMembers.length,
        active: activeMembers.length,
      },
    };
  },
});

/**
 * Get recent activity for admin dashboard
 */
export const getRecentActivity = query({
  handler: async (ctx) => {
    // Get recent orders (last 50)
    const recentOrders = await ctx.db
      .query('orderItems')
      .order('desc')
      .take(50);

    // Get recent parties (last 20)
    const recentParties = await ctx.db
      .query('parties')
      .order('desc')
      .take(20);

    // Enrich with party names
    const enrichedOrders = await Promise.all(
      recentOrders.map(async (order) => {
        const party = await ctx.db.get(order.partyId);
        return {
          ...order,
          partyName: party?.name || 'Unknown',
        };
      })
    );

    return {
      recentOrders: enrichedOrders,
      recentParties,
    };
  },
});

/**
 * Get top selling drinks
 */
export const getTopDrinks = query({
  handler: async (ctx) => {
    const allOrders = await ctx.db.query('orderItems').collect();
    
    // Group by drink
    const drinkSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    for (const order of allOrders) {
      const existing = drinkSales.get(order.drinkName) || { name: order.drinkName, quantity: 0, revenue: 0 };
      existing.quantity += order.quantity;
      existing.revenue += order.priceAtOrder * order.quantity;
      drinkSales.set(order.drinkName, existing);
    }

    // Convert to array and sort by quantity
    const sorted = Array.from(drinkSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return sorted;
  },
});

/**
 * Get system status for danger zone monitoring
 */
export const getSystemStatus = query({
  handler: async (ctx) => {
    // Check market state
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first();

    // Count records to determine if system is reset
    const orderItemsCount = (await ctx.db.query('orderItems').take(1)).length;
    const partiesCount = (await ctx.db.query('parties').take(1)).length;
    const ordersCount = (await ctx.db.query('orders').take(1)).length;

    const hasData = orderItemsCount > 0 || partiesCount > 0 || ordersCount > 0;

    let status: 'running' | 'stopped' | 'reset' | 'partially_reset';
    
    if (!marketState) {
      status = 'reset';
    } else if (!hasData && !marketState.currentSessionStartedAt && !marketState.totalRunningTimeMs) {
      status = 'reset';
    } else if (marketState.active === false) {
      status = 'stopped';
    } else {
      status = 'running';
    }

    // Calculate running time
    const now = Date.now();
    let runningTimeMs = 0;
    
    if (marketState) {
      const totalTime = marketState.totalRunningTimeMs || 0;
      
      if (marketState.active !== false && marketState.currentSessionStartedAt) {
        // Market is running - add current session time to total
        const currentSessionTime = now - marketState.currentSessionStartedAt;
        runningTimeMs = totalTime + currentSessionTime;
      } else {
        // Market is stopped - use accumulated time only
        runningTimeMs = totalTime;
      }
    }

    return {
      status,
      marketState: marketState ? {
        regime: marketState.regime,
        regimeStartedAt: marketState.regimeStartedAt,
        lastTickAt: marketState.lastTickAt,
        tickCount: marketState.tickCount,
        currentSessionStartedAt: marketState.currentSessionStartedAt,
        totalRunningTimeMs: marketState.totalRunningTimeMs,
        active: marketState.active,
      } : null,
      runningTimeMs,
      hasData,
    };
  },
});

/**
 * Live order feed for admin drink list tab
 */
export const getLiveOrders = query({
  handler: async (ctx) => {
    const orders = await ctx.db
      .query('orderItems')
      .order('desc')
      .take(200);

    const enriched = await Promise.all(orders.map(async (order) => {
      const party = await ctx.db.get(order.partyId);
      const table = party ? await ctx.db.get(party.tableId) : null;
      const orderDoc = await ctx.db.get(order.orderId);

      return {
        ...order,
        partyName: party?.name ?? 'Unknown',
        tableName: table?.name ?? 'Unknown',
        orderCreatedAt: orderDoc?.createdAt ?? order.createdAt,
      };
    }));

    return enriched;
  },
});
