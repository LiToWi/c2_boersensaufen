import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  tables: defineTable({
    name: v.string(),
    password: v.string(),
    token: v.string(),
  }),

  parties: defineTable({
    tableId: v.id('tables'),
    name: v.string(),
    closed: v.boolean(),
    // optional password hash to secure a party; clients should not receive the raw hash
    passwordHash: v.optional(v.string()),
    createdAt: v.number(), // store as Date.now()
    closedAt: v.optional(v.number()), // store as Date.now() when closed
  }),

  // track members that joined a party (one record per unique client/browser)
  partyMembers: defineTable({
    partyId: v.id('parties'),
    memberKey: v.string(), // client-generated unique key stored in localStorage
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
  }),

  orders: defineTable({
    partyId: v.id('parties'),
    createdAt: v.number(), // store as Date.now()
  }),

  // Individual items in an order
  orderItems: defineTable({
    orderId: v.id('orders'),
    partyId: v.id('parties'),
    drinkId: v.id('drinks'),
    drinkName: v.string(), // denormalized for display
    quantity: v.number(),
    priceAtOrder: v.number(), // price when ordered
    createdAt: v.number(),
  }),

  // price snapshots table to keep historic prices
  priceSnapshots: defineTable({
    drinkId: v.id('drinks'),
    price: v.number(),
    ts: v.number(), // Date.now() in ms
    source: v.optional(v.string()),
    reason: v.optional(v.string()),
    meta: v.optional(v.any()),
  }),

  drinks: defineTable({
    // external id from Ready2Order, keep as string for flexibility
    r2oId: v.string(),
    // human-visible name
    name: v.string(),
    // current price shown in the app (e.g. 2.5 for €2.50)
    currentPrice: v.number(),
    // optional historical / regular price
    regularPrice: v.optional(v.number()),
    // optional low bound price
    lowBoundPrice: v.optional(v.number()),
  // optional priority for ordering in the UI (higher = show first). Default behavior treats missing as 0.
  priority: v.optional(v.number()),
  // number of ordered items (moved from a separate orderItems table).
  // Treated as 0 when absent.
  orderItems: v.optional(v.number()),
    // reference to categories table (optional)
    categoryId: v.optional(v.id('categories')),
    // whether the product is active/available
    active: v.boolean(),
  }),

  categories: defineTable({
    name: v.string(),
    // external Ready2Order productgroup id (optional) to uniquely identify groups
    r2oGroupId: v.optional(v.string()),
  }),

  // Market state for pricing engine
  marketState: defineTable({
    // singleton record, always use id "global"
    stateKey: v.string(), // "global"
    regime: v.string(), // "Calm" | "Normal" | "Hype"
    regimeStartedAt: v.number(), // timestamp when current regime started
    lastTickAt: v.number(), // timestamp of last tick execution
    tickCount: v.number(), // total number of ticks executed
    // Markov chain transition probabilities stored as JSON
    regimeTransitionMatrix: v.optional(v.any()),
  }),

  // Per-drink market state
  drinkMarketState: defineTable({
    drinkId: v.id('drinks'),
    fundamentalPrice: v.number(), // F_i - base/fundamental price
    logPrice: v.number(), // ln(P_i) - current log price for calculations
    ticksSinceLastUpdate: v.number(), // counter for volatility tracking
    recentVolatility: v.number(), // rolling measure of recent price changes
    // Circuit breaker state
    consecutiveLargeJumps: v.number(), // count of large jumps in recent ticks
    volatilityReducedUntil: v.optional(v.number()), // timestamp
  }),

  // Track orders per tick for aggregation
  tickOrders: defineTable({
    tickId: v.number(), // identifies the tick (e.g., tickCount)
    drinkId: v.id('drinks'),
    userId: v.string(), // table name or member key
    quantity: v.number(), // number of units ordered
    impactQuantity: v.number(), // quantity counted for price impact (capped)
    createdAt: v.number(),
  }),
})
