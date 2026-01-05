import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Update party with R2O table ID after successful creation
 */
export const updatePartyR2OTableId = internalMutation({
  args: {
    partyId: v.id('parties'),
    r2oTableId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.partyId, {
      r2oTableId: args.r2oTableId,
      r2oTableCreationStatus: 'created',
      r2oTableCreatedAt: Date.now(),
      r2oTableCreationError: undefined, // Clear any previous errors
    });
  },
});

/**
 * Mark party R2O table creation as failed
 */
export const markPartyR2OTableCreationFailed = internalMutation({
  args: {
    partyId: v.id('parties'),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.partyId, {
      r2oTableCreationStatus: 'failed',
      r2oTableCreationError: args.errorMessage,
    });
  },
});

/**
 * Mark party R2O table creation as pending
 */
export const markPartyR2OTableCreationPending = internalMutation({
  args: {
    partyId: v.id('parties'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.partyId, {
      r2oTableCreationStatus: 'pending',
      r2oTableCreationError: undefined,
    });
  },
});

/**
 * Record a submitted R2O order
 */
export const recordR2OOrder = internalMutation({
  args: {
    partyId: v.id('parties'),
    orderItems: v.array(v.object({
      productName: v.string(),
      quantity: v.number(),
      pricePerUnit: v.number(),
    })),
    r2oTableId: v.string(),
    r2oProductIds: v.array(v.string()),
    totalAmount: v.number(),
    status: v.string(),
    r2oResponse: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('r2oOrders', {
      partyId: args.partyId,
      orderItems: args.orderItems,
      r2oTableId: args.r2oTableId,
      r2oProductIds: args.r2oProductIds,
      totalAmount: args.totalAmount,
      submittedAt: Date.now(),
      status: args.status,
      r2oResponse: args.r2oResponse,
      errorMessage: args.errorMessage,
      retryCount: 0,
    });
  },
});

/**
 * Record a created R2O product
 */
export const recordR2OProduct = internalMutation({
  args: {
    partyId: v.id('parties'),
    productName: v.string(),
    pricePerUnit: v.number(),
    r2oProductId: v.string(),
    r2oTableId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('r2oProducts', {
      partyId: args.partyId,
      productName: args.productName,
      pricePerUnit: args.pricePerUnit,
      r2oProductId: args.r2oProductId,
      r2oTableId: args.r2oTableId,
      createdAt: Date.now(),
      active: true,
    });
  },
});

/**
 * Update R2O order status (for retries)
 */
export const updateR2OOrderStatus = internalMutation({
  args: {
    orderId: v.id('r2oOrders'),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    r2oResponse: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error('Order not found');

    await ctx.db.patch(args.orderId, {
      status: args.status,
      errorMessage: args.errorMessage,
      r2oResponse: args.r2oResponse,
      retryCount: (order.retryCount ?? 0) + 1,
      lastRetryAt: Date.now(),
    });
  },
});
