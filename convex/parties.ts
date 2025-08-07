import { query } from "./_generated/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const getOpenPartiesByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const tables = await ctx.db
            .query("tables")
            .filter((q) => q.eq(q.field("name"), args.name))
            .collect();
        const tableIds = tables.map((table) => table._id);

        if (tableIds.length === 0) {
            return [];
        }

        const allParties = await ctx.db
            .query("parties")
            .collect();
        
        return allParties
            .filter((party) => tableIds.includes(party.tableId))
            .filter((party) => party.closed !== true); // Only show open parties
    },
});

export const getAllPartiesByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const tables = await ctx.db
            .query("tables")
            .filter((q) => q.eq(q.field("name"), args.name))
            .collect();
        const tableIds = tables.map((table) => table._id);

        if (tableIds.length === 0) {
            return [];
        }

        const allParties = await ctx.db
            .query("parties")
            .collect();
        
        return allParties
            .filter((party) => tableIds.includes(party.tableId))
    },
});

export const createParty = mutation({
    args: { name: v.string(), tableId: v.id("tables") },
    handler: async (ctx, args) => {
        const party = {
            name: args.name,
            tableId: args.tableId,
            closed: false,
            createdAt: Date.now(),
        };
        const id = await ctx.db.insert("parties", party);
        return { ...party, _id: id };
    },
});

export const closeParty = mutation({
    args: { partyId: v.id("parties") },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.partyId);
        if (!party) {
            throw new Error("Party not found");
        }
        await ctx.db.patch(args.partyId, { closed: true, closedAt: Date.now() });
        return { ...party, closed: true, closedAt: Date.now() };
    },
});