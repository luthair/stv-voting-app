import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("eligibility")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
  },
});

export const getByUserAndCycle = query({
  args: {
    userId: v.id("users"),
    cycleId: v.id("cycles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("eligibility")
      .withIndex("by_user_cycle", (q) =>
        q.eq("userId", args.userId).eq("cycleId", args.cycleId)
      )
      .first();
  },
});

export const setEligibility = mutation({
  args: {
    cycleId: v.id("cycles"),
    userId: v.id("users"),
    isEligible: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eligibility")
      .withIndex("by_user_cycle", (q) =>
        q.eq("userId", args.userId).eq("cycleId", args.cycleId)
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        isEligible: args.isEligible,
        setAt: Date.now(),
      });
    }

    return await ctx.db.insert("eligibility", {
      cycleId: args.cycleId,
      userId: args.userId,
      isEligible: args.isEligible,
      setAt: Date.now(),
    });
  },
});

export const getEligibleUsers = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const eligibilities = await ctx.db
      .query("eligibility")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("isEligible"), true))
      .collect();

    const userIds = eligibilities.map((e) => e.userId);
    const users = await Promise.all(
      userIds.map((id) => ctx.db.get(id))
    );
    return users.filter((u) => u !== null);
  },
});

