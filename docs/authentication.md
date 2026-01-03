# Authentication

## Overview

The application uses Discord OAuth for authentication via NextAuth.js (Auth.js). Users must be members of a specific Discord server to access the application.

## Implementation

### NextAuth Configuration

- **Provider**: Discord OAuth2
- **Location**: `app/api/auth/[...nextauth]/route.ts`
- **Session Strategy**: JWT

### Authentication Flow

1. User clicks "Sign in with Discord" on the start page
2. NextAuth redirects to Discord OAuth
3. After successful OAuth, Discord membership is checked using the Bot Token API
4. User record is created/updated in Convex with membership and admin status
5. Session is created with user information

### Membership Check

Membership is verified server-side using the Discord Bot Token:
- Endpoint: `GET /guilds/{guildId}/members/{userId}`
- Checks if user is a member of the Discord server specified in `DISCORD_SERVER_ID`
- Admin status is determined by checking if user has any role in `DISCORD_ADMIN_ROLE_IDS`

### Route Protection

Middleware (`middleware.ts`) protects all routes except:
- `/` - Login page
- `/401` - Unauthorized page
- API routes and static assets

Protected routes require:
1. Valid authentication session
2. User must be a member (`isMember: true`)

### Session Data

The session includes:
- `user.id` - Discord user ID
- `user.convexUserId` - Convex user document ID
- `user.isMember` - Membership status
- `user.isAdmin` - Admin status

## Environment Variables

- `DISCORD_CLIENT_ID` - Discord OAuth application client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth application client secret
- `DISCORD_BOT_TOKEN` - Discord bot token for membership checks
- `DISCORD_SERVER_ID` - Discord server/guild ID
- `DISCORD_ADMIN_ROLE_IDS` - Comma-separated list of admin role IDs
- `NEXTAUTH_SECRET` - Secret for encrypting JWT tokens
- `NEXTAUTH_URL` - Base URL of the application

