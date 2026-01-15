import { query } from "./_generated/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
                creatorId: p.creatorId,
            }));
    },
});

export const getAllParties = query({
    handler: async (ctx) => {
        const allParties = await ctx.db
            .query("parties")
            .collect();
        
        return allParties
            .map((p) => ({
                _id: p._id,
                name: p.name,
                tableId: p.tableId,
                closed: p.closed,
            }))
    }
})

export const getPartyById = query({
    args: { id: v.id("parties") },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.id);
        if (!party) return null;
        
        return {
            _id: party._id,
            name: party.name,
            tableId: party.tableId,
            closed: party.closed,
            createdAt: party.createdAt,
            closedAt: party.closedAt,
            hasPassword: !!party.passwordHash,
            creatorId: party.creatorId,
            r2oTableId: party.r2oTableId,
            r2oTableCreationStatus: party.r2oTableCreationStatus,
            r2oTableCreationError: party.r2oTableCreationError,
            r2oTableCreatedAt: party.r2oTableCreatedAt,
        };
    },
});

export const getPartyR2OStatus = query({
    args: { id: v.id("parties") },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.id);
        if (!party) return null;
        
        console.log('[Query] Party R2O Status:', {
            partyId: party._id,
            r2oTableId: party.r2oTableId,
            r2oTableCreationStatus: party.r2oTableCreationStatus,
            r2oTableCreationError: party.r2oTableCreationError,
        });
        
        return {
            partyId: party._id,
            partyName: party.name,
            r2oTableId: party.r2oTableId,
            r2oTableCreationStatus: party.r2oTableCreationStatus,
            r2oTableCreationError: party.r2oTableCreationError,
            r2oTableCreatedAt: party.r2oTableCreatedAt,
        };
    },
});

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
    args: { name: v.string(), tableId: v.id("tables"), partyCreationPassword: v.string(), creatorId: v.string() },
    handler: async (ctx, args) => {
        // Validate party creation password
        const passwords = await ctx.db
            .query("partyPasswords")
            .filter((q) => q.eq(q.field("code"), args.partyCreationPassword))
            .collect();

        if (passwords.length === 0) {
            throw new Error("Invalid party creation password");
        }

        const passwordRecord = passwords[0];

        if (passwordRecord.used) {
            throw new Error("This party creation password has already been used");
        }

        // Allow multiple active parties for the same table
        // Membership constraint: users can only join one party at a time (enforced in handleJoinParty)

        const party = {
            name: args.name,
            tableId: args.tableId,
            creatorId: args.creatorId,
            closed: false,
            createdAt: Date.now(),
        };
        const id = await ctx.db.insert("parties", party);

        // Mark the password as used
        await ctx.db.patch(passwordRecord._id, {
            used: true,
            usedAt: Date.now(),
            usedByPartyId: id,
        });
        
        // R2O table creation is now handled by frontend via API route
        // (see src/app/api/ready2order/create-table/route.ts)
        // This ensures environment variables are accessible
        
        return { ...party, _id: id, hasPassword: false };
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
    args: { partyId: v.id("parties"), creatorId: v.string() },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.partyId);
        if (!party) {
            throw new Error("Party not found");
        }

        if (party.creatorId && party.creatorId !== args.creatorId) {
            throw new Error("Only the party creator can close this party.");
        }
        
        // Check if there are any order items at all
        const orderItems = await ctx.db
            .query('orderItems')
            .filter((q) => q.eq(q.field('partyId'), args.partyId))
            .collect();
        
        const pendingOrders = orderItems.filter(item => !item.finalized);
        const finalizedOrders = orderItems.filter(item => item.finalized);
        
        if (pendingOrders.length > 0) {
            throw new Error("Cannot close party with pending orders. Please complete or clear all orders first.");
        }

        if (finalizedOrders.length > 0) {
            throw new Error("Cannot close party with finalized orders. All payments must be settled at the register before closing.");
        }
        
        await ctx.db.patch(args.partyId, { closed: true, closedAt: Date.now() });
        return { ...party, closed: true, closedAt: Date.now() };
    },
});

/**
 * Force close a party from admin panel (no validation, just close it)
 */
export const adminCloseParty = mutation({
    args: { partyId: v.id('parties') },
    handler: async (ctx, args) => {
        const party = await ctx.db.get(args.partyId);
        if (!party) {
            throw new Error("Party not found");
        }
        
        await ctx.db.patch(args.partyId, { closed: true, closedAt: Date.now() });
        return { success: true };
    },
});

/**
 * Update party with R2O table ID (called from frontend after API creates table)
 */
export const updatePartyR2OTableId = mutation({
    args: {
        partyId: v.id('parties'),
        r2oTableId: v.string(),
    },
    handler: async (ctx, args) => {
        console.log('[Convex] updatePartyR2OTableId called with:', { partyId: args.partyId, r2oTableId: args.r2oTableId });
        const party = await ctx.db.get(args.partyId);
        if (!party) {
            console.log('[Convex] Party not found:', args.partyId);
            throw new Error('Party not found');
        }

        console.log('[Convex] Updating party with R2O table ID...');
        await ctx.db.patch(args.partyId, {
            r2oTableId: args.r2oTableId,
            r2oTableCreationStatus: 'created',
            r2oTableCreatedAt: Date.now(),
            r2oTableCreationError: undefined,
        });

        console.log('[Convex] Party updated successfully');
        return { success: true };
    },
});