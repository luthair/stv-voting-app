# Discord Integration

## Overview

The application integrates with Discord for authentication, membership verification, user synchronization, and announcements.

## Components

### 1. Authentication

Discord OAuth is used for user login. See `docs/authentication.md` for details.

### 2. Membership Verification

Server-side verification using Discord Bot Token API:
- Checks if user is a member of the specified Discord server
- Determines admin status based on role membership
- Performed during sign-in and stored in Convex

### 3. User Synchronization

**Daily Sync Cron** (`convex/crons.ts`):
- Runs daily at 2 AM UTC
- Fetches all guild members (paginated)
- Updates user records in Convex with:
  - Display name
  - Avatar URL
  - Membership status
  - Admin status

**Implementation**: `convex/discord.ts` - `syncMembers` action

### 4. Announcements

**Phase Announcements**:
- Automatically posted when voting cycle phases change
- Deadline reminders (24 hours and 1 hour before)
- Posted to channel specified in `DISCORD_ANNOUNCEMENTS_CHANNEL_ID`

**Implementation**: `convex/discord.ts` - `announcePhase` action

## Discord Bot Setup

### Required Permissions

- **Server Members Intent**: Required to fetch guild members
- **Send Messages**: Required to post announcements
- **View Channels**: Required to access announcement channel

### Bot Token

The bot token is stored in `DISCORD_BOT_TOKEN` environment variable and used for:
- Membership verification
- User synchronization
- Posting announcements

### Discord Application Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and copy the bot token
3. Enable "Server Members Intent" in the Bot settings
4. Invite bot to your server with required permissions
5. Get the server/guild ID and role IDs for admin roles

## Environment Variables

- `DISCORD_BOT_TOKEN` - Bot token for API access
- `DISCORD_SERVER_ID` - Server/guild ID
- `DISCORD_ADMIN_ROLE_IDS` - Comma-separated admin role IDs
- `DISCORD_ANNOUNCEMENTS_CHANNEL_ID` - Channel ID for announcements
- `DISCORD_CLIENT_ID` - OAuth client ID
- `DISCORD_CLIENT_SECRET` - OAuth client secret

## API Endpoints Used

- `GET /guilds/{guildId}/members/{userId}` - Check membership
- `GET /guilds/{guildId}/members` - List all members (paginated)
- `POST /channels/{channelId}/messages` - Send announcement

