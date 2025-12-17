import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ballots")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
  },
});

export const getByVoter = query({
  args: {
    cycleId: v.id("cycles"),
    voterUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ballots")
      .withIndex("by_voter_cycle", (q) =>
        q.eq("voterUserId", args.voterUserId).eq("cycleId", args.cycleId)
      )
      .first();
  },
});

export const submit = mutation({
  args: {
    cycleId: v.id("cycles"),
    voterUserId: v.id("users"),
    rankedCandidateIds: v.array(v.id("candidates")),
  },
  handler: async (ctx, args) => {
    // Check if already voted
    const existing = await ctx.db
      .query("ballots")
      .withIndex("by_voter_cycle", (q) =>
        q.eq("voterUserId", args.voterUserId).eq("cycleId", args.cycleId)
      )
      .first();

    if (existing) {
      throw new Error("You have already submitted a ballot for this cycle");
    }

    // Validate candidates exist and are confirmed
    for (const candidateId of args.rankedCandidateIds) {
      const candidate = await ctx.db.get(candidateId);
      if (!candidate || candidate.status !== "confirmed" || candidate.cycleId !== args.cycleId) {
        throw new Error("Invalid candidate in ballot");
      }
    }

    return await ctx.db.insert("ballots", {
      cycleId: args.cycleId,
      voterUserId: args.voterUserId,
      rankedCandidateIds: args.rankedCandidateIds,
      createdAt: Date.now(),
    });
  },
});

