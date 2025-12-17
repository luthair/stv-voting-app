import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const nominations = await ctx.db
      .query("nominations")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    const candidates = await Promise.all(
      nominations.map(async (n) => {
        const candidate = await ctx.db.get(n.candidateUserId);
        const nominator = await ctx.db.get(n.nominatorUserId);
        return {
          ...n,
          candidate,
          nominator,
        };
      })
    );

    return candidates;
  },
});

export const getByNominator = query({
  args: {
    cycleId: v.id("cycles"),
    nominatorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nominations")
      .withIndex("by_nominator_cycle", (q) =>
        q.eq("nominatorUserId", args.nominatorUserId).eq("cycleId", args.cycleId)
      )
      .first();
  },
});

export const create = mutation({
  args: {
    cycleId: v.id("cycles"),
    nominatorUserId: v.id("users"),
    candidateUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if nominator already nominated someone
    const existing = await ctx.db
      .query("nominations")
      .withIndex("by_nominator_cycle", (q) =>
        q.eq("nominatorUserId", args.nominatorUserId).eq("cycleId", args.cycleId)
      )
      .first();

    if (existing) {
      throw new Error("You have already nominated a candidate for this cycle");
    }

    // Check if candidate is eligible
    const eligibility = await ctx.db
      .query("eligibility")
      .withIndex("by_user_cycle", (q) =>
        q.eq("userId", args.candidateUserId).eq("cycleId", args.cycleId)
      )
      .first();

    if (!eligibility || !eligibility.isEligible) {
      throw new Error("Candidate is not eligible for this cycle");
    }

    const nominationId = await ctx.db.insert("nominations", {
      cycleId: args.cycleId,
      nominatorUserId: args.nominatorUserId,
      candidateUserId: args.candidateUserId,
      createdAt: Date.now(),
    });

    // Create candidate entry
    await ctx.db.insert("candidates", {
      cycleId: args.cycleId,
      userId: args.candidateUserId,
      status: "confirmed",
      updatedAt: Date.now(),
    });

    return nominationId;
  },
});

