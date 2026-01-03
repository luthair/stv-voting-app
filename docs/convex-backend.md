# Convex Backend

## Overview

The application uses Convex as the backend-as-a-service platform for data storage, serverless functions, and real-time synchronization.

## Architecture

### What Convex Provides

- **Hosted Database**: Document-relational database storing JSON-like documents
- **Server Functions**: TypeScript functions for backend logic
- **Real-time Queries**: Automatic client synchronization
- **Scheduled Jobs**: Cron jobs for automated tasks

### Project Structure

```
convex/
├── schema.ts          # Database schema definitions
├── users.ts           # User queries and mutations
├── cycles.ts          # Voting cycle management
├── eligibility.ts     # Eligibility tracking
├── nominations.ts     # Nomination management
├── questions.ts       # Question submission and voting
├── candidates.ts      # Candidate management
├── ballots.ts         # Ballot submission
├── results.ts         # STV result computation
├── discord.ts         # Discord integration actions
└── crons.ts           # Scheduled job definitions
```

## Data Model

### Tables

- **users**: Discord user information and membership status
- **cycles**: Voting cycle configuration and phase tracking
- **eligibility**: User eligibility declarations per cycle
- **nominations**: Candidate nominations
- **questions**: Questions submitted for candidates
- **questionVotes**: Votes on questions during confirmation phase
- **candidates**: Candidate status (confirmed/dropped)
- **candidateAnswers**: Candidate answers to questions
- **ballots**: Ranked preference ballots
- **results**: Computed STV results with round-by-round breakdown

See `convex/schema.ts` for detailed schema definitions.

### TypeScript Types

Types are derived from the Convex schema in `lib/types.ts`:

```typescript
import type { Doc, Id } from "@/convex/_generated/dataModel";

// Use Doc<"tableName"> for document types
type User = Doc<"users">;
type Cycle = Doc<"cycles">;

// Use Id<"tableName"> for ID types
type UserId = Id<"users">;

// Extend for joined data
interface CandidateWithUser extends Doc<"candidates"> {
  user: Doc<"users"> | null;
}
```

Always derive types from the schema rather than defining them manually.

## Function Types

### Queries

Read-only functions that fetch data:
- Example: `users.getByDiscordId`
- Can be called from client components
- Automatically reactive (updates when data changes)

### Mutations

Functions that modify data:
- Example: `cycles.create`
- Can be called from client components
- Transactional

### Actions

Functions that can call external APIs:
- Example: `discord.syncMembers`
- Used for Discord API calls, HTTP requests
- Can call queries and mutations

### Internal Functions

Functions only callable from other Convex functions:
- Example: `users.createOrUpdateInternal`
- Used for cron jobs and internal operations

## Real-time Features

Convex queries automatically update when data changes:
- No manual polling needed
- Components using `useQuery` automatically re-render
- Efficient and performant

## Scheduled Jobs

Defined in `convex/crons.ts`:
- Daily member sync at 2 AM UTC
- Hourly phase transition checks

## Environment Variables

- `CONVEX_DEPLOYMENT` - Convex deployment name
- `NEXT_PUBLIC_CONVEX_URL` - Public Convex URL (exposed to client)

## Development

Run `bun run convex:dev` to:
- Start Convex development server
- Sync schema and functions
- View logs and data in Convex dashboard

