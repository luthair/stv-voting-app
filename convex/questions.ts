import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    const questionsWithAuthors = await Promise.all(
      questions.map(async (q) => {
        const author = await ctx.db.get(q.authorUserId);
        return {
          ...q,
          author,
        };
      })
    );

    return questionsWithAuthors;
  },
});

export const create = mutation({
  args: {
    cycleId: v.id("cycles"),
    authorUserId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("questions", {
      cycleId: args.cycleId,
      authorUserId: args.authorUserId,
      text: args.text,
      createdAt: Date.now(),
      status: "pending",
    });
  },
});

export const getForVoting = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    // Return questions anonymously (without author info)
    return await ctx.db
      .query("questions")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const voteOnQuestion = mutation({
  args: {
    cycleId: v.id("cycles"),
    questionId: v.id("questions"),
    voterUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already voted
    const existing = await ctx.db
      .query("questionVotes")
      .withIndex("by_voter_question", (q) =>
        q.eq("voterUserId", args.voterUserId).eq("questionId", args.questionId)
      )
      .first();

    if (existing) {
      throw new Error("You have already voted on this question");
    }

    return await ctx.db.insert("questionVotes", {
      cycleId: args.cycleId,
      questionId: args.questionId,
      voterUserId: args.voterUserId,
      createdAt: Date.now(),
    });
  },
});

export const getQuestionVotes = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("questionVotes")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    // Count votes per question
    const voteCounts: Record<string, number> = {};
    for (const vote of votes) {
      const questionId = vote.questionId;
      voteCounts[questionId] = (voteCounts[questionId] || 0) + 1;
    }

    // Get top questions
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    return questions
      .map((q) => ({
        ...q,
        voteCount: voteCounts[q._id] || 0,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);
  },
});

export const approveQuestions = mutation({
  args: {
    questionIds: v.array(v.id("questions")),
  },
  handler: async (ctx, args) => {
    for (const questionId of args.questionIds) {
      await ctx.db.patch(questionId, {
        status: "approved",
      });
    }
  },
});

// Get questions a user has voted on
export const getUserVotes = query({
  args: {
    cycleId: v.id("cycles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("questionVotes")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("voterUserId"), args.userId))
      .collect();
    
    return votes.map((v) => v.questionId);
  },
});

