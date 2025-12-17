import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

interface DiscordMember {
  user?: {
    id: string;
    username?: string;
    global_name?: string;
    avatar?: string;
  };
  roles?: string[];
}

export const syncMembers = internalAction({
  handler: async (ctx) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const serverId = process.env.DISCORD_SERVER_ID;
    const adminRoleIds = process.env.DISCORD_ADMIN_ROLE_IDS?.split(",") || [];

    if (!botToken || !serverId) {
      console.error("Missing Discord configuration");
      return;
    }

    // Fetch guild members (paginated)
    const members: DiscordMember[] = [];
    let after: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const fetchUrl: string = `https://discord.com/api/v10/guilds/${serverId}/members?limit=1000${
        after ? `&after=${after}` : ""
      }`;
      const fetchResponse: Response = await fetch(fetchUrl, {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      });

      if (!fetchResponse.ok) {
        console.error(`Failed to fetch members: ${fetchResponse.statusText}`);
        break;
      }

      const fetchData: DiscordMember[] = await fetchResponse.json();
      members.push(...fetchData);
      hasMore = fetchData.length === 1000;
      if (hasMore && fetchData.length > 0) {
        after = fetchData[fetchData.length - 1].user?.id;
      } else {
        hasMore = false;
      }
    }

    // Update users in Convex
    for (const member of members) {
      const user = member.user;
      if (!user) continue;

      const memberRoles = member.roles || [];
      const isAdmin = adminRoleIds.some((roleId) =>
        memberRoles.includes(roleId.trim())
      );

      await ctx.runMutation(internal.users.createOrUpdateInternal, {
        discordId: user.id,
        displayName: user.username || user.global_name || "Unknown",
        avatarUrl: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : undefined,
        isMember: true,
        isAdmin,
      });
    }

    console.log(`Synced ${members.length} Discord members`);
  },
});

export const announcePhase = internalAction({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;

    if (!botToken || !channelId) {
      console.error("Missing Discord configuration for announcements");
      return;
    }

    const postUrl: string = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const postResponse: Response = await fetch(postUrl, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: args.message,
      }),
    });

    if (!postResponse.ok) {
      console.error(`Failed to send announcement: ${postResponse.statusText}`);
    }
  },
});
