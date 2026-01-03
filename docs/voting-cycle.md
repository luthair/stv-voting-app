# Voting Cycle

## Overview

The voting system operates in distinct phases, each with specific rules and deadlines set by administrators.

## Phase Flow

### 1. Start Phase

**Purpose**: Allow users to declare eligibility for nomination

**User Actions**:
- Toggle eligibility status
- View cycle information

**Admin Actions**:
- Create new voting cycle
- Set number of seats
- Configure deadlines for all phases

### 2. Nomination + Question Phase

**Purpose**: Collect nominations and question proposals

**User Actions**:
- Nominate one eligible member as a candidate
- Submit questions to be asked to candidates
- View submitted nominations and questions

**Rules**:
- One nomination per user per cycle
- Only eligible members can be nominated
- Questions are anonymous during submission

### 3. Confirmation Phase

**Purpose**: Finalize candidates and select questions

**User Actions**:
- Vote on which questions should be asked (anonymous display)
- Candidates can drop out

**Admin Actions**:
- Approve top voted questions (typically top 5)

**Rules**:
- Questions displayed anonymously
- One vote per question per user

### 4. Finalization Phase

**Purpose**: Candidates provide answers to selected questions

**User Actions**:
- Candidates answer approved questions
- All users can view candidates and their answers

**Admin Actions**:
- Review candidate answers
- Advance to voting phase when ready

### 5. Voting Phase

**Purpose**: Collect ranked preference ballots

**User Actions**:
- Submit ranked ballot (drag to reorder candidates)
- View submitted ballot

**Rules**:
- One ballot per user per cycle
- Must rank at least one candidate
- Rankings determine preference order

**Admin Actions**:
- Compute STV results after voting ends

### 6. Announcement Phase

**Purpose**: Display election results

**User Actions**:
- View winners
- View detailed vote breakdown by round
- See STV calculation details

## Phase Transitions

Phases can transition:
1. **Automatic**: Based on deadline timestamps (checked hourly)
2. **Manual**: Admin can manually advance phases

Deadlines are stored as UTC unix timestamps and displayed in user's local time.

## Deadline Management

- Deadlines set during cycle creation
- Can be updated by admins
- Displayed in top bar with countdown
- Automatic reminders sent to Discord:
  - 24 hours before deadline
  - 1 hour before deadline

## Cycle Configuration

Each cycle has:
- **Title**: Descriptive name
- **Seats**: Number of positions to fill
- **Phase**: Current phase
- **Deadlines**: UTC timestamps for each phase

## Admin Phase Override

Administrators can manually advance to any phase using the override buttons in the Admin panel. This is useful for:
- Testing phase transitions
- Recovering from issues
- Demonstrating the system

## Test Mode

Access `/test` (admin only) to test the full cycle with dummy users:
- Create 7 dummy users
- Simulate eligibility, nominations, questions
- Vote on questions as any dummy user
- Submit answers for candidates
- Generate random ballots
- Test STV computation

This allows testing the complete cycle without real user participation.

