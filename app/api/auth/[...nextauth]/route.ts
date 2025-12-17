import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkDiscordMembership(discordId: string): Promise<{
  isMember: boolean;
  isAdmin: boolean;
}> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const serverId = process.env.DISCORD_SERVER_ID;
  const adminRoleIds = process.env.DISCORD_ADMIN_ROLE_IDS?.split(",") || [];

  if (!botToken || !serverId) {
    return { isMember: false, isAdmin: false };
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${serverId}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      return { isMember: false, isAdmin: false };
    }

    const member = await response.json();
    const memberRoles = member.roles || [];
    const isAdmin = adminRoleIds.some((roleId) =>
      memberRoles.includes(roleId.trim())
    );

    return { isMember: true, isAdmin };
  } catch (error) {
    console.error("Error checking Discord membership:", error);
    return { isMember: false, isAdmin: false };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.id) {
        return false;
      }

      const discordId = account.providerAccountId || user.id;
      const { isMember, isAdmin } = await checkDiscordMembership(discordId);

      // Update or create user in Convex
      try {
        await convex.mutation(api.users.createOrUpdate, {
          discordId,
          displayName: user.name || "Unknown",
          avatarUrl: user.image || null,
          isMember,
          isAdmin,
        });
      } catch (error) {
        console.error("Error updating user in Convex:", error);
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub; // Store discordId as id
        try {
          const user = await convex.query(api.users.getByDiscordId, {
            discordId: token.sub,
          });

          if (user) {
            (session.user as any).convexUserId = user._id;
            (session.user as any).isMember = user.isMember;
            (session.user as any).isAdmin = user.isAdmin;
          }
        } catch (error) {
          console.error("Error fetching user session:", error);
        }
      }

      return session;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.sub = account.providerAccountId || user?.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
});

export const { GET, POST } = handlers;

