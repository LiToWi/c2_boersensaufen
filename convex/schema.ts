import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  tables: defineTable({
    name: v.string(),
    password: v.string(),
    // optional token for auto-login; legacy rows may not have this set
    token: v.optional(v.string()),
  }),

  parties: defineTable({
    tableId: v.id('tables'),
    name: v.string(),
    closed: v.boolean(),
    // creator identifier (e.g., memberKey); optional for legacy rows
    creatorId: v.optional(v.string()),
    // optional password hash to secure a party; clients should not receive the raw hash
    passwordHash: v.optional(v.string()),
    createdAt: v.number(), // store as Date.now()
    closedAt: v.optional(v.number()), // store as Date.now() when closed
    // Ready2Order integration
    r2oTableId: v.optional(v.string()), // R2O table ID for this party
    r2oTableCreationStatus: v.optional(v.string()), // 'pending' | 'created' | 'failed'
    r2oTableCreationError: v.optional(v.string()), // Error message if creation failed
    r2oTableCreatedAt: v.optional(v.number()), // When R2O table was created
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
    regularPriceAtOrder: v.optional(v.number()), // original/regular price for savings calculation
    feePaid: v.number(), // 1.5% trading fee on order value
    createdAt: v.number(),
    finalized: v.optional(v.boolean()), // whether order was finalized/submitted
    finalizedAt: v.optional(v.number()), // when it was finalized
  }),

  // price snapshots table to keep historic prices
  priceSnapshots: defineTable({
    drinkId: v.id('drinks'),
    price: v.number(),
    ts: v.number(), // Date.now() in ms
    capacity: v.optional(v.number()), // available capacity at this time
    source: v.optional(v.string()),
    reason: v.optional(v.string()),
    meta: v.optional(v.any()),
  })
    .index('by_drink_and_time', ['drinkId', 'ts']),

  drinks: defineTable({
    // external id from Ready2Order, keep as string for flexibility
    r2oId: v.string(),
    // human-visible name
    name: v.string(),
    // current price shown in the app (e.g. 2.5 for €2.50)
    currentPrice: v.number(),
    // optional remaining capacity for the product (used by pricing engine)
    // optional historical / regular price
    regularPrice: v.optional(v.number()),
    // optional low bound price
    lowBoundPrice: v.optional(v.number()),
    // capacity/stock for supply-demand modeling (required; backfilled to 50 for legacy docs)
    capacity: v.optional(v.number()),
    // optional priority for ordering in the UI (higher = show first). Default behavior treats missing as 0.
    priority: v.optional(v.number()),
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
    active: v.optional(v.boolean()), // whether market is running (pricing ticks enabled), defaults to true
    testMode: v.optional(v.boolean()), // when true, skip Ready2Order API calls
    regime: v.string(), // "Calm" | "Normal" | "Hype"
    regimeStartedAt: v.number(), // timestamp when current regime started
    lastTickAt: v.number(), // timestamp of last tick execution
    tickCount: v.number(), // total number of ticks executed
    currentSessionStartedAt: v.optional(v.number()), // when the current running session started
    totalRunningTimeMs: v.optional(v.number()), // cumulative running time across all sessions
    // Legacy fields for migration
    startedAt: v.optional(v.number()), // deprecated
    stoppedAt: v.optional(v.number()), // deprecated
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

  // Ready2Order payment tracking
  r2oOrders: defineTable({
    partyId: v.id('parties'),
    orderItems: v.array(v.object({
      productName: v.string(),
      quantity: v.number(),
      pricePerUnit: v.number(),
    })),
    r2oTableId: v.string(), // Reference to the R2O table
    r2oProductIds: v.array(v.string()), // Created product IDs in R2O
    totalAmount: v.number(), // Total order value
    submittedAt: v.number(), // When submitted to R2O
    status: v.string(), // 'pending' | 'submitted' | 'failed' | 'retry'
    r2oResponse: v.optional(v.any()), // Raw R2O response/status
    errorMessage: v.optional(v.string()), // Error details if failed
    retryCount: v.optional(v.number()), // Number of retry attempts
    lastRetryAt: v.optional(v.number()), // Last retry timestamp
  }),

  // Map locally created products to R2O
  r2oProducts: defineTable({
    partyId: v.id('parties'),
    productName: v.string(),
    pricePerUnit: v.number(),
    r2oProductId: v.string(), // R2O product ID
    r2oTableId: v.string(), // Which party's table
    createdAt: v.number(),
    active: v.boolean(),
  }),
})
