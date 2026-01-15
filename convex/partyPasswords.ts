import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random 8-digit password
function generateRandomPassword(): string {
  return Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0");
}

// Initialize 100 random party creation passwords
export const initializePartyPasswords = mutation({
  handler: async (ctx) => {
    // Check if passwords already exist
    const existing = await ctx.db.query("partyPasswords").collect();
    if (existing.length > 0) {
      return { success: false, message: "Passwords already initialized" };
    }

    const passwords = [];
    const usedCodes = new Set<string>();

    // Generate 100 unique 8-digit passwords
    while (passwords.length < 100) {
      const code = generateRandomPassword();
      if (!usedCodes.has(code)) {
        usedCodes.add(code);
        passwords.push({
          code,
          used: false,
        });
      }
    }

    // Insert all passwords
    for (const password of passwords) {
      await ctx.db.insert("partyPasswords", password);
    }

    return { success: true, count: 100, message: "Initialized 100 party passwords" };
  },
});

// Get available passwords count
export const getAvailablePasswordCount = query({
  handler: async (ctx) => {
    const available = await ctx.db
      .query("partyPasswords")
      .filter((q) => q.eq(q.field("used"), false))
      .collect();
    return available.length;
  },
});

// Validate and use a password
export const validateAndUsePassword = mutation({
  args: { code: v.string(), partyId: v.id("parties") },
  handler: async (ctx, args) => {
    // Find the password
    const passwords = await ctx.db
      .query("partyPasswords")
      .filter((q) => q.eq(q.field("code"), args.code))
      .collect();

    if (passwords.length === 0) {
      throw new Error("Invalid password");
    }

    const password = passwords[0];

    if (password.used) {
      throw new Error("This password has already been used");
    }

    // Mark password as used
    await ctx.db.patch(password._id, {
      used: true,
      usedAt: Date.now(),
      usedByPartyId: args.partyId,
    });

    return { success: true, code: password.code };
  },
});

// Get the next available password (for bar distribution)
export const getNextAvailablePassword = query({
  handler: async (ctx) => {
    const available = await ctx.db
      .query("partyPasswords")
      .filter((q) => q.eq(q.field("used"), false))
      .collect();
    
    if (available.length === 0) {
      return null;
    }

    // Return the first available password (and how many remain)
    return {
      code: available[0].code,
      passwordId: available[0]._id,
      remaining: available.length,
    };
  },
});

// Mark a password as given out (for bar staff)
export const markPasswordAsGivenOut = mutation({
  args: { passwordId: v.id("partyPasswords") },
  handler: async (ctx, args) => {
    const password = await ctx.db.get(args.passwordId);
    
    if (!password) {
      throw new Error("Password not found");
    }

    if (password.used) {
      throw new Error("This password has already been marked as given out");
    }

    // Mark as used with timestamp but no party ID (since it's just given out, not yet used for party creation)
    await ctx.db.patch(args.passwordId, {
      used: true,
      usedAt: Date.now(),
    });

    return { success: true, code: password.code };
  },
});

// Get all unused passwords (admin only)
export const getAllUnusedPasswords = query({
  handler: async (ctx) => {
    const available = await ctx.db
      .query("partyPasswords")
      .filter((q) => q.eq(q.field("used"), false))
      .collect();
    return available.map((p) => p.code);
  },
});

// Get all passwords with their usage info (admin only)
export const getAllPasswords = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("partyPasswords").collect();
    return all.map((p) => ({
      code: p.code,
      used: p.used,
      usedAt: p.usedAt,
      usedByPartyId: p.usedByPartyId,
    }));
  },
});
