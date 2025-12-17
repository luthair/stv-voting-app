import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getByDiscordId = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_discord_id", (q) => q.eq("discordId", args.discordId))
      .first();
  },
});

export const createOrUpdate = mutation({
  args: {
    discordId: v.string(),
    username: v.optional(v.string()),
    displayName: v.string(),
    avatarUrl: v.union(v.string(), v.null()),
    isMember: v.boolean(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_discord_id", (q) => q.eq("discordId", args.discordId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        avatarUrl: args.avatarUrl ?? undefined,
        isMember: args.isMember,
        isAdmin: args.isAdmin,
        lastSyncedAt: Date.now(),
      });
    }

    return await ctx.db.insert("users", {
      discordId: args.discordId,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl ?? undefined,
      isMember: args.isMember,
      isAdmin: args.isAdmin,
      lastSyncedAt: Date.now(),
    });
  },
});

// Get dummy test users (users with discord IDs starting with "dummy_")
export const getDummyUsers = query({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    return allUsers.filter((u) => u.discordId.startsWith("dummy_"));
  },
});

export const getCurrentUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getAllMembers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isMember"), true))
      .collect();
  },
});

export const createOrUpdateInternal = internalMutation({
  args: {
    discordId: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    isMember: v.boolean(),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_discord_id", (q) => q.eq("discordId", args.discordId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
        isMember: args.isMember,
        isAdmin: args.isAdmin,
        lastSyncedAt: Date.now(),
      });
    }

    return await ctx.db.insert("users", {
      discordId: args.discordId,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      isMember: args.isMember,
      isAdmin: args.isAdmin,
      lastSyncedAt: Date.now(),
    });
  },
});

