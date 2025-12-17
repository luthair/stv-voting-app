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

  console.log("[Discord] Checking membership for:", discordId);
  console.log("[Discord] Server ID:", serverId);
  console.log("[Discord] Bot token present:", !!botToken);
  console.log("[Discord] Admin role IDs:", adminRoleIds);

  if (!botToken || !serverId) {
    console.error("[Discord] Missing botToken or serverId");
    return { isMember: false, isAdmin: false };
  }

  try {
    const url = `https://discord.com/api/v10/guilds/${serverId}/members/${discordId}`;
    console.log("[Discord] Fetching:", url);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    console.log("[Discord] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Discord] API error:", response.status, errorText);
      return { isMember: false, isAdmin: false };
    }

    const member = await response.json();
    console.log("[Discord] Member data:", JSON.stringify(member, null, 2));
    
    const memberRoles = member.roles || [];
    const isAdmin = adminRoleIds.some((roleId) =>
      memberRoles.includes(roleId.trim())
    );

    console.log("[Discord] Member roles:", memberRoles);
    console.log("[Discord] Is admin:", isAdmin);

    return { isMember: true, isAdmin };
  } catch (error) {
    console.error("[Discord] Error checking membership:", error);
    return { isMember: false, isAdmin: false };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify", // Only request identity, not email
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[Auth] signIn callback triggered");
      console.log("[Auth] account:", JSON.stringify(account, null, 2));
      console.log("[Auth] profile:", JSON.stringify(profile, null, 2));
      
      if (!account) {
        console.error("[Auth] No account provided");
        return false;
      }

      const discordId = account.providerAccountId;
      console.log("[Auth] Discord ID:", discordId);
      
      if (!discordId) {
        console.error("[Auth] No Discord ID found in account.providerAccountId");
        return false;
      }

      const { isMember, isAdmin } = await checkDiscordMembership(discordId);
      console.log("[Auth] Membership check result:", { isMember, isAdmin });

      // Update or create user in Convex
      try {
        await convex.mutation(api.users.createOrUpdate, {
          discordId,
          displayName: user.name || profile?.username || "Unknown",
          avatarUrl: user.image || null,
          isMember,
          isAdmin,
        });
        console.log("[Auth] User saved to Convex");
      } catch (error) {
        console.error("[Auth] Error updating user in Convex:", error);
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

