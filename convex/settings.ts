import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { DEFAULT_PRICING_CONFIG, type PricingConfig } from './pricing/types'

async function getByKey(ctx: any, key: string) {
  return await ctx.db.query('settings').withIndex('by_key', (q: any) => q.eq('key', key)).first()
}

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const tradingFee = await getByKey(ctx, 'tradingFeeRate')
    const pricing = await getByKey(ctx, 'pricingConfig')
    return {
      tradingFeeRate: typeof tradingFee?.value === 'number' ? tradingFee.value : 0.01,
      pricingConfig: pricing?.value ? { ...DEFAULT_PRICING_CONFIG, ...pricing.value } : DEFAULT_PRICING_CONFIG,
    }
  }
})

export const setTradingFeeRate = mutation({
  args: { rate: v.number() },
  handler: async (ctx, args) => {
    const existing = await getByKey(ctx, 'tradingFeeRate')
    const payload = { key: 'tradingFeeRate', value: args.rate, updatedAt: Date.now() }
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return { updated: true }
    }
    await ctx.db.insert('settings', payload)
    return { created: true }
  }
})

export const setPricingConfig = mutation({
  args: { partial: v.object({

    beta: v.optional(v.number()),
    lambda: v.optional(v.number()),
    k: v.optional(v.number()),
    N0: v.optional(v.number()),
    lowerBoundMultiplier: v.optional(v.number()),
    upperBoundMultiplier: v.optional(v.number()),
    maxJumpPercent: v.optional(v.number()),
    maxImpactPerUserPerTick: v.optional(v.number()),
    largeJumpThreshold: v.optional(v.number()),
    consecutiveJumpsForBreaker: v.optional(v.number()),
    volatilityReductionDuration: v.optional(v.number()),
    volatilityReductionFactor: v.optional(v.number()),
  }) },
  handler: async (ctx, args) => {
    const existing = await getByKey(ctx, 'pricingConfig')
    const current = existing?.value || {}
    const next = { ...current, ...args.partial }
    const payload = { key: 'pricingConfig', value: next, updatedAt: Date.now() }
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return { updated: true }
    }
    await ctx.db.insert('settings', payload)
    return { created: true }
  }
})
