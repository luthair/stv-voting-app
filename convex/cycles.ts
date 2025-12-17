import { query, mutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const getCurrent = query({
  handler: async (ctx) => {
    const cycles = await ctx.db
      .query("cycles")
      .filter((q) =>
        q.neq(
          q.field("phase"),
          "announcement" as const
        )
      )
      .order("desc")
      .take(1);
    return cycles[0] ?? null;
  },
});

export const getById = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.cycleId);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    seats: v.number(),
    deadlinesUtc: v.object({
      start: v.optional(v.number()),
      nomination: v.optional(v.number()),
      confirmation: v.optional(v.number()),
      finalization: v.optional(v.number()),
      voting: v.optional(v.number()),
      announcement: v.optional(v.number()),
    }),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("cycles", {
      title: args.title,
      seats: args.seats,
      phase: "start",
      deadlinesUtc: args.deadlinesUtc,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});

export const updatePhase = mutation({
  args: {
    cycleId: v.id("cycles"),
    phase: v.union(
      v.literal("start"),
      v.literal("nomination"),
      v.literal("confirmation"),
      v.literal("finalization"),
      v.literal("voting"),
      v.literal("announcement")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.cycleId, {
      phase: args.phase,
    });
  },
});

export const updateDeadlines = mutation({
  args: {
    cycleId: v.id("cycles"),
    deadlinesUtc: v.object({
      start: v.optional(v.number()),
      nomination: v.optional(v.number()),
      confirmation: v.optional(v.number()),
      finalization: v.optional(v.number()),
      voting: v.optional(v.number()),
      announcement: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle) {
      throw new Error("Cycle not found");
    }
    return await ctx.db.patch(args.cycleId, {
      deadlinesUtc: { ...cycle.deadlinesUtc, ...args.deadlinesUtc },
    });
  },
});

// Internal query for use by actions
export const getCurrentInternal = internalQuery({
  handler: async (ctx) => {
    const cycles = await ctx.db
      .query("cycles")
      .filter((q) =>
        q.neq(
          q.field("phase"),
          "announcement" as const
        )
      )
      .order("desc")
      .take(1);
    return cycles[0] ?? null;
  },
});

export const checkAndAdvancePhases = internalAction({
  handler: async (ctx) => {
    const cycle = await ctx.runQuery(internal.cycles.getCurrentInternal);
    if (!cycle) return;

    const now = Date.now();
    const deadlines = cycle.deadlinesUtc;
    const currentPhase = cycle.phase;

    // Check if we need to advance phase based on deadlines
    const phaseOrder: Array<typeof currentPhase> = [
      "start",
      "nomination",
      "confirmation",
      "finalization",
      "voting",
      "announcement",
    ];

    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    if (currentPhaseIndex === -1 || currentPhaseIndex === phaseOrder.length - 1) {
      return;
    }

    const nextPhase = phaseOrder[currentPhaseIndex + 1];
    const nextDeadline = deadlines[nextPhase as keyof typeof deadlines];

    if (nextDeadline && now >= nextDeadline) {
      await ctx.runMutation(internal.cycles.updatePhaseInternal, {
        cycleId: cycle._id,
        phase: nextPhase,
      });

      // Announce phase change
      await ctx.runAction(internal.discord.announcePhase, {
        message: `📢 Voting cycle "${cycle.title}" has moved to the **${nextPhase}** phase!`,
      });
    }

    // Check for deadline reminders (24 hours, 1 hour before)
    for (const [phase, deadline] of Object.entries(deadlines)) {
      if (!deadline) continue;
      const timeUntil = (deadline as number) - now;
      const hoursUntil = timeUntil / (1000 * 60 * 60);

      if (hoursUntil <= 1 && hoursUntil > 0.9) {
        // 1 hour reminder
        await ctx.runAction(internal.discord.announcePhase, {
          message: `⏰ Reminder: The **${phase}** phase deadline for "${cycle.title}" is in 1 hour!`,
        });
      } else if (hoursUntil <= 24 && hoursUntil > 23.9) {
        // 24 hour reminder
        await ctx.runAction(internal.discord.announcePhase, {
          message: `⏰ Reminder: The **${phase}** phase deadline for "${cycle.title}" is in 24 hours!`,
        });
      }
    }
  },
});

// Internal mutation for use by actions
import { internalMutation } from "./_generated/server";

export const updatePhaseInternal = internalMutation({
  args: {
    cycleId: v.id("cycles"),
    phase: v.union(
      v.literal("start"),
      v.literal("nomination"),
      v.literal("confirmation"),
      v.literal("finalization"),
      v.literal("voting"),
      v.literal("announcement")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.cycleId, {
      phase: args.phase,
    });
  },
});
