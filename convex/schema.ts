import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    discordId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    isMember: v.boolean(),
    isAdmin: v.boolean(),
    lastSyncedAt: v.optional(v.number()),
  }).index("by_discord_id", ["discordId"]),

  cycles: defineTable({
    title: v.string(),
    seats: v.number(),
    phase: v.union(
      v.literal("start"),
      v.literal("nomination"),
      v.literal("confirmation"),
      v.literal("finalization"),
      v.literal("voting"),
      v.literal("announcement")
    ),
    deadlinesUtc: v.object({
      start: v.optional(v.number()),
      nomination: v.optional(v.number()),
      confirmation: v.optional(v.number()),
      finalization: v.optional(v.number()),
      voting: v.optional(v.number()),
      announcement: v.optional(v.number()),
    }),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_phase", ["phase"]),

  eligibility: defineTable({
    cycleId: v.id("cycles"),
    userId: v.id("users"),
    isEligible: v.boolean(),
    setAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_user_cycle", ["userId", "cycleId"]),

  nominations: defineTable({
    cycleId: v.id("cycles"),
    nominatorUserId: v.id("users"),
    candidateUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_nominator_cycle", ["nominatorUserId", "cycleId"])
    .index("by_candidate_cycle", ["candidateUserId", "cycleId"]),

  questions: defineTable({
    cycleId: v.id("cycles"),
    authorUserId: v.id("users"),
    text: v.string(),
    createdAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_status", ["status"]),

  questionVotes: defineTable({
    cycleId: v.id("cycles"),
    questionId: v.id("questions"),
    voterUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_question", ["questionId"])
    .index("by_voter_question", ["voterUserId", "questionId"]),

  candidates: defineTable({
    cycleId: v.id("cycles"),
    userId: v.id("users"),
    status: v.union(v.literal("confirmed"), v.literal("dropped")),
    updatedAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_user_cycle", ["userId", "cycleId"]),

  candidateAnswers: defineTable({
    cycleId: v.id("cycles"),
    candidateUserId: v.id("users"),
    questionId: v.id("questions"),
    answer: v.string(),
    updatedAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_candidate_cycle", ["candidateUserId", "cycleId"])
    .index("by_question", ["questionId"]),

  ballots: defineTable({
    cycleId: v.id("cycles"),
    voterUserId: v.id("users"),
    rankedCandidateIds: v.array(v.id("candidates")),
    createdAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_voter_cycle", ["voterUserId", "cycleId"]),

  results: defineTable({
    cycleId: v.id("cycles"),
    computedAt: v.number(),
    winners: v.array(v.id("candidates")),
    rounds: v.array(
      v.object({
        round: v.number(),
        candidateVotes: v.record(v.id("candidates"), v.number()),
        eliminated: v.optional(v.id("candidates")),
        elected: v.optional(v.array(v.id("candidates"))),
        transfers: v.optional(
          v.record(v.id("candidates"), v.number())
        ),
      })
    ),
  }).index("by_cycle", ["cycleId"]),
});

