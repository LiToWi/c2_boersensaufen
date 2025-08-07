import { query } from './_generated/server';

export const listCategories = query({
  handler: async (ctx) => {
    return await ctx.db.query('categories').collect();
  },
});
