import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  tables: defineTable({
    name: v.string(),
    password: v.string(),
  }),

  parties: defineTable({
    tableId: v.id('tables'),
    name: v.string(),
    closed: v.boolean(),
    createdAt: v.number(), // store as Date.now()
    closedAt: v.optional(v.number()), // store as Date.now() when closed
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

  drinks: defineTable({
    name: v.string(),
    currentPrice: v.number(),
    regularPrice: v.number(),
    lowBoundPrice: v.number(),
    categoryId: v.id('categories'),
    description: v.optional(v.string()),
  }),

  categories: defineTable({
    name: v.string(),
  }),
})
