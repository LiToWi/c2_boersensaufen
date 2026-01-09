import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create / join a party member record. If a record for the (partyId, memberKey)
// already exists and has no leftAt, return it (idempotent join).
export const createMember = mutation({
  args: { partyId: v.id("parties"), memberKey: v.string() },
  handler: async (ctx, args) => {
    // check for existing active member by scanning stored records
    const all = await ctx.db.query("partyMembers").collect();
    const existing = all.find(
      (r) => String(r.partyId) === String(args.partyId) && r.memberKey === args.memberKey && (r.leftAt === undefined || r.leftAt === null)
    );

    if (existing) {
      return existing;
    }

    const rec = {
      partyId: args.partyId,
      memberKey: args.memberKey,
      joinedAt: Date.now(),
    } as any;

    const id = await ctx.db.insert("partyMembers", rec);
    return { ...rec, _id: id };
  },
});

// Mark a member record as left (set leftAt) for a given (partyId, memberKey).
export const leaveMember = mutation({
  args: { partyId: v.id("parties"), memberKey: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("partyMembers").collect();
    const record = all.find(
      (r) => String(r.partyId) === String(args.partyId) && r.memberKey === args.memberKey && (r.leftAt === undefined || r.leftAt === null)
    );

    if (!record) {
      return null;
    }

    await ctx.db.patch(record._id, { leftAt: Date.now() });
    return { ...record, leftAt: Date.now() };
  },
});

// Kick a member by ID (for admin panel)
export const kickMember = mutation({
  args: { memberId: v.id("partyMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    
    if (member.leftAt !== undefined && member.leftAt !== null) {
      throw new Error("Member already left the party");
    }

    await ctx.db.patch(args.memberId, { leftAt: Date.now() });
    return { success: true };
  },
});

// Given an array of party ids, return counts per party
export const countMembersForParties = query({
  args: { partyIds: v.array(v.id("parties")) },
  handler: async (ctx, args) => {
    if (!args.partyIds || args.partyIds.length === 0) return [];

    // collect all members and keep only active (leftAt not set)
    const all = await ctx.db.query("partyMembers").collect();
    const active = all.filter((r) => r.leftAt === undefined || r.leftAt === null);

    const counts: { partyId: string; count: number }[] = args.partyIds.map((id) => ({
      partyId: String(id),
      count: 0,
    }));

    const map = new Map<string, number>();
    for (const c of counts) map.set(c.partyId, 0);

    for (const a of active) {
      const pid = String(a.partyId);
      if (map.has(pid)) map.set(pid, (map.get(pid) || 0) + 1);
    }

    return args.partyIds.map((id) => ({ partyId: String(id), count: map.get(String(id)) || 0 }));
  },
});

// Get active member count for a single party
export const getPartyMemberCount = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("partyMembers").collect();
    const activeMembers = all.filter(
      (r) => String(r.partyId) === String(args.partyId) && (r.leftAt === undefined || r.leftAt === null)
    );
    return activeMembers.length;
  },
});

// Get all members for a party (admin query)
export const getPartyMembers = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("partyMembers").collect();
    const members = all.filter(
      (r) => String(r.partyId) === String(args.partyId) && (r.leftAt === undefined || r.leftAt === null)
    );
    return members.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

// Get all-time members for a party (including left members - for admin stats)
export const getAllTimePartyMembers = query({
  args: { partyId: v.id("parties") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("partyMembers").collect();
    return all.filter((r) => String(r.partyId) === String(args.partyId)).sort((a, b) => b.joinedAt - a.joinedAt);
  },
});
