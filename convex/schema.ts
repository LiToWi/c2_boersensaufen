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

  orderItems: defineTable({
    orderId: v.id('orders'),
    drinkId: v.id('drinks'),
    quantity: v.number(),
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
})
