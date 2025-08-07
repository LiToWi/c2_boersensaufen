import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// This should be a query, not a mutation
export const getTableByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query('tables')
            .filter(q => q.eq(q.field('name'), args.name))
            .unique();
    },
});

// Keep this as a mutation since it modifies/validates data
export const validateTablePassword = mutation({
    args: { 
        tableId: v.id('tables'), 
        password: v.string() 
    },
    handler: async (ctx, args) => {
        const table = await ctx.db.get(args.tableId);
        if (!table) {
            throw new Error('Table not found');
        }
        
        // Add your password validation logic here
        // For example, using bcrypt:
        // const isValid = await bcrypt.compare(args.password, table.password);
        if (table.password !== args.password) {
            throw new Error('Invalid password');
        }
        
        return true;
    },
});