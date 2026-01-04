import { query } from "./_generated/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Helper: compute SHA-256 hex. Prefer Web Crypto if available, otherwise fall
// back to a simple (non-cryptographic) hash as a last resort.
// sha256Hex: compute hex SHA-256 using WebCrypto (works in Convex runtime).
async function sha256Hex(input: string): Promise<string> {
  // Use Web Crypto API if available in the runtime
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto?.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(input);
    const digest = await (globalThis as any).crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback deterministic hashing (not cryptographically secure) for dev-only environments.
  // Prefer migrating to a bcrypt/argon2 Node action for production.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return hex.repeat(8).slice(0, 64);
}

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
            .filter((party) => party.closed !== true) // Only show open parties
            .map((p) => ({ // don't leak passwordHash to clients, expose hasPassword instead
                _id: p._id,
                name: p.name,
                tableId: p.tableId,
                closed: p.closed,
                createdAt: p.createdAt,
                closedAt: p.closedAt,
                hasPassword: !!p.passwordHash,
            }));
    },
});

export const getAllParties = query({
    handler: async (ctx, args) => {
        const allParties = await ctx.db
            .query("parties")
            .collect();
        
        return allParties
            .map((p) => ({
                _id: p._id,
                name: p.name,
                tableId: p.tableId,
                closed: p.closed,
                createdAt: p.createdAt,
                closedAt: p.closedAt,
                hasPassword: !!p.passwordHash,
            }))
    }
})

export const getAllPartiesByTableName = query({
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
            .map((p) => ({
                _id: p._id,
                name: p.name,
                tableId: p.tableId,
                closed: p.closed,
                createdAt: p.createdAt,
                closedAt: p.closedAt,
                hasPassword: !!p.passwordHash,
            }))
    },
});

export const createParty = mutation({
    args: { name: v.string(), tableId: v.id("tables"), password: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let passwordHash: string | undefined = undefined;
        if (args.password && args.password.trim() !== '') {
            passwordHash = await sha256Hex(args.password);
        }

        const party = {
            name: args.name,
            tableId: args.tableId,
            closed: false,
            createdAt: Date.now(),
            passwordHash,
        };
        const id = await ctx.db.insert("parties", party);
        return { ...party, _id: id, hasPassword: !!passwordHash };
    },
});

export const validatePartyPassword = mutation({
    args: { partyId: v.id('parties'), password: v.string() },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.partyId);
        if (!party) throw new Error('Party not found');
        if (!party.passwordHash) return true; // no password set
        const hash = await sha256Hex(args.password);
        return hash === party.passwordHash;
    }
});

export const closeParty = mutation({
    args: { partyId: v.id("parties") },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.partyId);
        if (!party) {
            throw new Error("Party not found");
        }
        
        // Check if there are any non-finalized order items
        const orderItems = await ctx.db
            .query('orderItems')
            .filter((q) => q.eq(q.field('partyId'), args.partyId))
            .collect();
        
        const pendingOrders = orderItems.filter(item => !item.finalized);
        
        if (pendingOrders.length > 0) {
            throw new Error("Cannot close party with pending orders. Please complete or clear all orders first.");
        }
        
        await ctx.db.patch(args.partyId, { closed: true, closedAt: Date.now() });
        return { ...party, closed: true, closedAt: Date.now() };
    },
});