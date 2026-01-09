/**
 * Market Pricing Tick Executor
 * 
 * Convex mutation that runs every tick to update all drink prices.
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { api } from './_generated/api'
import {
  updateDrinkPrice,
  aggregateTickOrders,
  transitionRegime,
  boxMuller,
} from './pricing/engine'
import {
  DEFAULT_PRICING_CONFIG,
  REGIME_PARAMS,
  REGIME_TRANSITIONS,
  type MarketRegime,
  type PriceUpdateResult,
} from './pricing/types'

/**
 * Initialize market state (run once at setup)
 */
export const initializeMarketState = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already initialized
    const existing = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first()
    
    if (existing) {
      return { message: 'Market state already initialized', id: existing._id }
    }
    
    const now = Date.now()
    const marketStateId = await ctx.db.insert('marketState', {
      stateKey: 'global',
      regime: 'Normal',
      regimeStartedAt: now,
      lastTickAt: now,
      tickCount: 0,
      regimeTransitionMatrix: REGIME_TRANSITIONS,
    })
    
    // Initialize drink market states
    const drinks = await ctx.db.query('drinks').collect()
    
    for (const drink of drinks) {
      const fundamentalPrice = drink.regularPrice || drink.currentPrice
      
      await ctx.db.insert('drinkMarketState', {
        drinkId: drink._id,
        fundamentalPrice,
        logPrice: Math.log(drink.currentPrice),
        ticksSinceLastUpdate: 0,
        recentVolatility: 0,
        consecutiveLargeJumps: 0,
      })
    }
    
    return { message: 'Market state initialized', id: marketStateId, drinksInitialized: drinks.length }
  },
})

/**
 * Get current market state (for debugging/monitoring)
 */
export const getMarketState = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first()
    
    return state
  },
})

/**
 * Main tick execution - runs every 15 seconds via Convex cron
 */
export const executePricingTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const config = DEFAULT_PRICING_CONFIG
    
    // Get market state
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first()
    
    if (!marketState) {
      throw new Error('Market state not initialized. Run initializeMarketState first.')
    }
    
    // Skip tick execution if market is not active
    if (marketState.active === false) {
      return { skipped: true, message: 'Market is stopped' }
    }
    
    const currentTickId = marketState.tickCount + 1
    
    // Check if regime should transition
    let currentRegime = marketState.regime as MarketRegime
    const regimeDuration = (now - marketState.regimeStartedAt) / 1000 // seconds
    const regimeParams = REGIME_PARAMS[currentRegime]
    
    // Probabilistic regime transition after minimum duration
    if (regimeDuration > regimeParams.minDuration) {
      const shouldTransition = Math.random() < 0.1 // ~10% chance per tick after min duration
      if (shouldTransition) {
        const newRegime = transitionRegime(currentRegime, REGIME_TRANSITIONS)
        if (newRegime !== currentRegime) {
          currentRegime = newRegime
          await ctx.db.patch(marketState._id, {
            regime: currentRegime,
            regimeStartedAt: now,
          })
        }
      }
    }
    
    // Get all tick orders for current tick window
    // In practice, you'd query orders created since lastTickAt
    const recentOrders = await ctx.db
      .query('tickOrders')
      .filter((q) => q.eq(q.field('tickId'), currentTickId))
      .collect()
    
    // Aggregate orders with user impact caps
    const aggregatedDemand = aggregateTickOrders(
      recentOrders.map((o) => ({
        drinkId: o.drinkId,
        userId: o.userId,
        quantity: o.quantity,
      })),
      config.maxImpactPerUserPerTick
    )
    
    // Calculate total demand for activity scaling
    let totalImpactQuantity = 0
    for (const demand of aggregatedDemand.values()) {
      totalImpactQuantity += demand.impactQuantity
    }
    
    // Get all drinks and their market states
    const drinks = await ctx.db.query('drinks').filter((q) => q.eq(q.field('active'), true)).collect()
    const priceUpdates: PriceUpdateResult[] = []
    
    for (const drink of drinks) {
      const drinkState = await ctx.db
        .query('drinkMarketState')
        .filter((q) => q.eq(q.field('drinkId'), drink._id))
        .first()
      
      if (!drinkState) {
        // Initialize if missing
        const fundamentalPrice = drink.regularPrice || drink.currentPrice
        await ctx.db.insert('drinkMarketState', {
          drinkId: drink._id,
          fundamentalPrice,
          logPrice: Math.log(drink.currentPrice),
          ticksSinceLastUpdate: 0,
          recentVolatility: 0,
          consecutiveLargeJumps: 0,
        })
        continue
      }
      
      // Get demand for this drink (0 if no orders)
      const demand = aggregatedDemand.get(drink._id) || {
        drinkId: drink._id,
        totalQuantity: 0,
        impactQuantity: 0,
        uniqueUsers: 0,
      }
      
      // Check circuit breaker status
      const circuitBreakerActive =
        drinkState.volatilityReducedUntil !== undefined &&
        drinkState.volatilityReducedUntil > now
      
      // Update price
      const result = updateDrinkPrice({
        drinkId: drink._id,
        currentLogPrice: drinkState.logPrice,
        fundamentalPrice: drinkState.fundamentalPrice,
        demandQuantity: demand.impactQuantity,
        totalDemand: totalImpactQuantity,
        numDrinks: drinks.length,
        regime: currentRegime,
        regimeParams: REGIME_PARAMS,
        config,
        circuitBreakerActive,
        oldPrice: drink.currentPrice,
      })
      
      priceUpdates.push(result)
      
      // Round price to 2 decimal places (ceiling)
      const roundedPrice = Math.ceil(result.newPrice * 100) / 100
      
      // Update drink price in database
      await ctx.db.patch(drink._id, {
        currentPrice: roundedPrice,
      })
      
      // Update drink market state
      const isLarge = Math.abs(result.logPriceChange) >= config.largeJumpThreshold
      const newConsecutiveJumps = isLarge ? drinkState.consecutiveLargeJumps + 1 : 0
      
      // Activate circuit breaker if needed
      let volatilityReducedUntil = drinkState.volatilityReducedUntil
      if (newConsecutiveJumps >= config.consecutiveJumpsForBreaker) {
        volatilityReducedUntil = now + config.volatilityReductionDuration * 1000
      }
      
      await ctx.db.patch(drinkState._id, {
        logPrice: Math.log(result.newPrice),
        ticksSinceLastUpdate: 0,
        recentVolatility: Math.abs(result.logPriceChange),
        consecutiveLargeJumps: newConsecutiveJumps,
        volatilityReducedUntil,
      })
      
      // Store price snapshot for history (using rounded price)
      await ctx.db.insert('priceSnapshots', {
        drinkId: drink._id,
        price: roundedPrice,
        ts: now,
        source: 'pricing-engine',
        reason: `tick-${currentTickId}`,
        meta: {
          regime: currentRegime,
          demandSignal: result.demandSignal,
          alphaEff: result.alphaEff,
          circuitBreakerActive: result.wasCircuitBreakerActive,
        },
      })
    }
    
    // Update market state
    await ctx.db.patch(marketState._id, {
      lastTickAt: now,
      tickCount: currentTickId,
    })
    
    // Clean up old tick orders (optional, for performance)
    const oldTickOrders = await ctx.db
      .query('tickOrders')
      .filter((q) => q.lt(q.field('tickId'), currentTickId - 10))
      .collect()
    
    for (const order of oldTickOrders) {
      await ctx.db.delete(order._id)
    }
    
    return {
      tickId: currentTickId,
      regime: currentRegime,
      pricesUpdated: priceUpdates.length,
      totalOrders: recentOrders.length,
      totalDemand: totalImpactQuantity,
    }
  },
})

/**
 * Record an order for the current tick
 * Called when a user places an order
 */
export const recordOrderForTick = mutation({
  args: {
    drinkId: v.id('drinks'),
    userId: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Get current tick ID
    const marketState = await ctx.db
      .query('marketState')
      .filter((q) => q.eq(q.field('stateKey'), 'global'))
      .first()
    
    if (!marketState) {
      throw new Error('Market state not initialized')
    }
    
    // Cap quantity for impact calculation
    const config = DEFAULT_PRICING_CONFIG
    const impactQuantity = Math.min(args.quantity, config.maxImpactPerUserPerTick)
    
    await ctx.db.insert('tickOrders', {
      tickId: marketState.tickCount + 1, // orders count toward next tick
      drinkId: args.drinkId,
      userId: args.userId,
      quantity: args.quantity,
      impactQuantity,
      createdAt: Date.now(),
    })
    
    return { success: true }
  },
})

/**
 * Get recent price history for a drink
 */
export const getDrinkPriceHistory = query({
  args: {
    drinkId: v.id('drinks'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    
    const snapshots = await ctx.db
      .query('priceSnapshots')
      .filter((q) => q.eq(q.field('drinkId'), args.drinkId))
      .order('desc')
      .take(limit)
    
    return snapshots.reverse()
  },
})
