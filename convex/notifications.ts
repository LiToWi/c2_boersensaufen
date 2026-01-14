import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const sendNotification = mutation({
  args: {
    message: v.object({
      de: v.string(),
      en: v.string(),
    }),
    title: v.optional(v.object({
      de: v.string(),
      en: v.string(),
    })),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const notificationId = await ctx.db.insert('notifications', {
      message: args.message,
      title: args.title,
      severity: args.severity ?? 'info',
      createdAt: now,
    });

    return { id: notificationId, createdAt: now };
  },
});

export const getRecentNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const records = await ctx.db
      .query('notifications')
      .withIndex('by_created_at')
      .order('desc')
      .take(limit);

    return records;
  },
});
