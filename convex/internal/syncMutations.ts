import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

const DEFAULT_CAPACITY = 50;

function normalizeGroupName(raw: any) {
  const name = (raw ?? '').toString().trim();
  if (!name) return 'Ungrouped';
  if (/saft|säfte|schorle|schorlen/i.test(name)) return 'Säfte & Schorlen';
  if (/bier|biere|biermisch|biermischgetränk/i.test(name)) return 'Bier & Biermischgetränke';
  return name;
}

// Internal mutation to upsert a category by name and return its id
export const upsertCategory = internalMutation({
  args: { name: v.string(), r2oGroupId: v.optional(v.string()), priority: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const name = args.name;
    const groupId = args.r2oGroupId;
    const incomingPriority = args.priority;

    // Centralized normalization: if the normalized name should be merged
    // (e.g. Säfte & Schorlen), prefer name-based upsert so multiple
    // external group ids map to the same category.
    const normalized = normalizeGroupName(name);
    const mergeByName = normalized === 'Säfte & Schorlen';

    if (groupId && !mergeByName) {
      // Prefer upserting by external group id when available (unless rule says merge)
      const existingById = await ctx.db.query('categories')
        .filter((q) => q.eq(q.field('r2oGroupId'), groupId))
        .unique();
      if (existingById) {
        // Preserve existing priority; only set if missing and incoming provided
        if (existingById.priority === undefined && incomingPriority !== undefined) {
          await ctx.db.patch(existingById._id, { priority: incomingPriority });
        }
        return existingById._id;
      }
      const id = await ctx.db.insert('categories', { name, r2oGroupId: groupId, priority: incomingPriority });
      return id;
    }

    // Name-based lookup (either because groupId wasn't provided or mergeByName)
    const existing = await ctx.db.query('categories')
      .filter((q) => q.eq(q.field('name'), normalized))
      .unique();
    if (existing) {
      if (existing.priority === undefined && incomingPriority !== undefined) {
        await ctx.db.patch(existing._id, { priority: incomingPriority });
      }
      return existing._id;
    }
    const id = await ctx.db.insert('categories', { name: normalized, r2oGroupId: mergeByName ? undefined : groupId, priority: incomingPriority });
    return id;
  },
});

// Internal mutation to upsert a drink document by r2oId
export const upsertDrink = internalMutation({
  args: {
    doc: v.any(),
  },
  handler: async (ctx, args) => {
    const doc = args.doc as any;
    if (!doc || !doc.r2oId) throw new Error('Invalid doc for upsertDrink');

    const existing = await ctx.db.query('drinks')
      .filter((q) => q.eq(q.field('r2oId'), doc.r2oId))
      .unique();

    const capacity = typeof doc.capacity === 'number'
      ? doc.capacity
      : (existing?.capacity ?? DEFAULT_CAPACITY);

    // Preserve priority from existing drink (keep user's manual ordering)
    const priority = existing?.priority;

    const docWithCapacityAndPriority = { ...doc, capacity };
    if (priority !== undefined) {
      (docWithCapacityAndPriority as any).priority = priority;
    }

    if (existing) {
      await ctx.db.patch(existing._id, docWithCapacityAndPriority);
      return existing._id;
    } else {
      const id = await ctx.db.insert('drinks', docWithCapacityAndPriority);
      return id;
    }
  },
});

// Internal helper to set capacity on an existing drink
export const setDrinkCapacity = internalMutation({
  args: { drinkId: v.id('drinks'), capacity: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.drinkId, { capacity: args.capacity });
    return { drinkId: args.drinkId, capacity: args.capacity };
  },
});
