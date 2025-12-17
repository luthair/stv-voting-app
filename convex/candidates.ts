import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    const candidatesWithUsers = await Promise.all(
      candidates.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return {
          ...c,
          user,
        };
      })
    );

    return candidatesWithUsers.filter((c) => c.user !== null);
  },
});

export const dropOut = mutation({
  args: {
    cycleId: v.id("cycles"),
    candidateUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const candidate = await ctx.db
      .query("candidates")
      .withIndex("by_user_cycle", (q) =>
        q.eq("userId", args.candidateUserId).eq("cycleId", args.cycleId)
      )
      .first();

    if (!candidate) {
      throw new Error("Candidate not found");
    }

    return await ctx.db.patch(candidate._id, {
      status: "dropped",
      updatedAt: Date.now(),
    });
  },
});

export const getAnswers = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("candidateAnswers")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    const answersWithDetails = await Promise.all(
      answers.map(async (a) => {
        // candidateUserId is a user ID, not a candidate ID
        const candidateUser = await ctx.db.get(a.candidateUserId);
        const question = await ctx.db.get(a.questionId);
        return {
          ...a,
          candidate: candidateUser,
          question,
        };
      })
    );

    return answersWithDetails.filter((a) => a.candidate && a.question);
  },
});

export const submitAnswer = mutation({
  args: {
    cycleId: v.id("cycles"),
    candidateUserId: v.id("users"),
    questionId: v.id("questions"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("candidateAnswers")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .filter((q) => q.eq(q.field("candidateUserId"), args.candidateUserId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        answer: args.answer,
        updatedAt: Date.now(),
      });
    }

    return await ctx.db.insert("candidateAnswers", {
      cycleId: args.cycleId,
      candidateUserId: args.candidateUserId,
      questionId: args.questionId,
      answer: args.answer,
      updatedAt: Date.now(),
    });
  },
});
