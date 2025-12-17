import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const getByCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("results")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();
  },
});

// Internal queries for use by the action
export const getCycleInternal = internalQuery({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.cycleId);
  },
});

export const getCandidatesInternal = internalQuery({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();
    return candidates;
  },
});

export const getBallotsInternal = internalQuery({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ballots")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
  },
});

/**
 * Breaks ties between candidates by examining historical preference rankings.
 * Eliminates the candidate who received the fewest votes at the earliest preference level.
 */
function breakTieByHistoricalPreferences(
  tiedCandidates: Id<"candidates">[],
  ballots: any[],
  winners: Id<"candidates">[],
  eliminated: Id<"candidates">[]
): Id<"candidates"> {
  // For each preference level (0 = 1st choice, 1 = 2nd choice, etc.)
  for (let prefLevel = 0; prefLevel < tiedCandidates.length; prefLevel++) {
    const preferenceCounts: Record<string, number> = {};

    // Count how many ballots have each tied candidate at this preference level
    for (const ballot of ballots) {
      if (prefLevel < ballot.rankedCandidateIds.length) {
        const candidateAtLevel = ballot.rankedCandidateIds[prefLevel];
        // Only count if this candidate is still in the tied group
        if (tiedCandidates.includes(candidateAtLevel)) {
          preferenceCounts[candidateAtLevel] = (preferenceCounts[candidateAtLevel] || 0) + 1;
        }
      }
    }

    // Find candidates with the minimum count at this level
    const minCount = Math.min(...tiedCandidates.map(id => preferenceCounts[id] || 0));
    const candidatesWithMinCount = tiedCandidates.filter(id => (preferenceCounts[id] || 0) === minCount);

    // If only one candidate has the minimum count, eliminate them
    if (candidatesWithMinCount.length === 1) {
      return candidatesWithMinCount[0];
    }

    // If still tied, continue to next preference level
    // (candidatesWithMinCount becomes the new tied group for the next iteration)
    tiedCandidates = candidatesWithMinCount;
  }

  // If we get here, all candidates are still tied through all preference levels
  // Fall back to alphabetical order by candidate ID (deterministic but arbitrary)
  return tiedCandidates.sort()[0];
}

export const computeSTV = action({
  args: {
    cycleId: v.id("cycles"),
  },
  handler: async (ctx, args): Promise<Id<"results">> => {
    // Get cycle and candidates using internal queries
    const cycle = await ctx.runQuery(internal.results.getCycleInternal, {
      cycleId: args.cycleId,
    });
    if (!cycle) {
      throw new Error("Cycle not found");
    }

    const candidates = await ctx.runQuery(internal.results.getCandidatesInternal, {
      cycleId: args.cycleId,
    });
    // Keep as Id<"candidates"> type
    const candidateIds = candidates.map((c) => c._id);

    // Get all ballots
    const ballots = await ctx.runQuery(internal.results.getBallotsInternal, {
      cycleId: args.cycleId,
    });

    if (ballots.length === 0) {
      throw new Error("No ballots found");
    }

    const seats = cycle.seats;
    const totalVotes = ballots.length;
    const quota = Math.floor(totalVotes / (seats + 1)) + 1; // Droop quota

    // Initialize vote counts
    const votes: Record<string, number> = {};
    for (const candidateId of candidateIds) {
      votes[candidateId] = 0;
    }

    // First preference votes
    for (const ballot of ballots) {
      if (ballot.rankedCandidateIds.length > 0) {
        const firstChoice = ballot.rankedCandidateIds[0];
        votes[firstChoice] = (votes[firstChoice] || 0) + 1;
      }
    }

    const rounds: Array<{
      round: number;
      candidateVotes: Record<string, number>;
      eliminated?: string;
      elected?: string[];
      transfers?: Record<string, number>;
    }> = [];

    const winners: Id<"candidates">[] = [];
    const eliminated: Id<"candidates">[] = [];
    let round = 1;

    // STV algorithm
    while (winners.length < seats && eliminated.length < candidateIds.length - seats) {
      const currentVotes = { ...votes };
      rounds.push({
        round,
        candidateVotes: { ...currentVotes },
      });

      // Check for winners (candidates at or above quota)
      // Sort by votes descending to elect highest vote-getters first if multiple reach quota
      const potentialWinners = candidateIds
        .filter(
          (id) =>
            !winners.includes(id) &&
            !eliminated.includes(id) &&
            (currentVotes[id] || 0) >= quota
        )
        .sort((a, b) => (currentVotes[b] || 0) - (currentVotes[a] || 0));
      
      // Only elect enough to fill remaining seats
      const seatsRemaining = seats - winners.length;
      const newWinners = potentialWinners.slice(0, seatsRemaining);

      if (newWinners.length > 0) {
        winners.push(...newWinners);
        rounds[rounds.length - 1].elected = [...newWinners];

        // If we've filled all seats, stop here
        if (winners.length >= seats) {
          break;
        }

        // Transfer surplus votes
        for (const winnerId of newWinners) {
          const surplus = currentVotes[winnerId] - quota;
          if (surplus > 0) {
            const transferValue = surplus / currentVotes[winnerId];
            const transferVotes: Record<string, number> = {};

            // Find ballots that contributed to this winner
            for (const ballot of ballots) {
              const winnerIndex = ballot.rankedCandidateIds.indexOf(winnerId);
              if (winnerIndex === 0) {
                // This ballot's first choice was the winner
                // Find next preference
                for (let i = 1; i < ballot.rankedCandidateIds.length; i++) {
                  const nextChoice = ballot.rankedCandidateIds[i];
                  if (
                    !winners.includes(nextChoice) &&
                    !eliminated.includes(nextChoice)
                  ) {
                    transferVotes[nextChoice] =
                      (transferVotes[nextChoice] || 0) + transferValue;
                    break;
                  }
                }
              }
            }

            // Apply transfers
            for (const [candidateId, transferAmount] of Object.entries(
              transferVotes
            )) {
              votes[candidateId] = (votes[candidateId] || 0) + transferAmount;
            }

            rounds[rounds.length - 1].transfers = transferVotes;
          }
        }
      } else {
        // No winners, eliminate lowest candidate
        const remaining = candidateIds.filter(
          (id) => !winners.includes(id) && !eliminated.includes(id)
        );
        if (remaining.length === 0) break;

        // Find all candidates with the lowest vote count
        const minVotes = Math.min(...remaining.map(id => currentVotes[id] || 0));
        const tiedCandidates = remaining.filter(id => (currentVotes[id] || 0) === minVotes);

        let lowest: Id<"candidates">;
        if (tiedCandidates.length === 1) {
          // No tie, eliminate the only lowest candidate
          lowest = tiedCandidates[0];
        } else {
          // Tie-breaking: use historical preference rankings
          lowest = breakTieByHistoricalPreferences(tiedCandidates, ballots, winners, eliminated);
        }

        eliminated.push(lowest);
        rounds[rounds.length - 1].eliminated = lowest;

        // Transfer votes from eliminated candidate
        const transferVotes: Record<string, number> = {};
        for (const ballot of ballots) {
          const eliminatedIndex = ballot.rankedCandidateIds.indexOf(lowest);
          if (eliminatedIndex >= 0) {
            // Find next preference
            for (
              let i = eliminatedIndex + 1;
              i < ballot.rankedCandidateIds.length;
              i++
            ) {
              const nextChoice = ballot.rankedCandidateIds[i];
              if (
                !winners.includes(nextChoice) &&
                !eliminated.includes(nextChoice)
              ) {
                transferVotes[nextChoice] = (transferVotes[nextChoice] || 0) + 1;
                break;
              }
            }
          }
        }

        // Apply transfers
        for (const [candidateId, transferAmount] of Object.entries(
          transferVotes
        )) {
          votes[candidateId] = (votes[candidateId] || 0) + transferAmount;
        }

        votes[lowest] = 0;
        rounds[rounds.length - 1].transfers = transferVotes;
      }

      round++;
    }

    // Fill remaining seats if needed
    while (winners.length < seats) {
      const remaining = candidateIds.filter(
        (id) => !winners.includes(id) && !eliminated.includes(id)
      );
      if (remaining.length === 0) break;

      const currentVotes = { ...votes };
      const topRemaining = remaining
        .sort((a, b) => (currentVotes[b] || 0) - (currentVotes[a] || 0))
        .slice(0, seats - winners.length);

      winners.push(...topRemaining);
    }

    // Save results using internal mutation
    const resultId = await ctx.runMutation(internal.results.createInternal, {
      cycleId: args.cycleId,
      winners: winners,
      rounds: rounds,
    });

    return resultId;
  },
});

export const createInternal = internalMutation({
  args: {
    cycleId: v.id("cycles"),
    winners: v.array(v.id("candidates")),
    rounds: v.array(
      v.object({
        round: v.number(),
        candidateVotes: v.record(v.string(), v.number()),
        eliminated: v.optional(v.string()),
        elected: v.optional(v.array(v.string())),
        transfers: v.optional(v.record(v.string(), v.number())),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing results if any
    const existing = await ctx.db
      .query("results")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("results", {
      cycleId: args.cycleId,
      computedAt: Date.now(),
      winners: args.winners,
      rounds: args.rounds as any,
    });
  },
});

export const create = mutation({
  args: {
    cycleId: v.id("cycles"),
    winners: v.array(v.id("candidates")),
    rounds: v.array(
      v.object({
        round: v.number(),
        candidateVotes: v.record(v.id("candidates"), v.number()),
        eliminated: v.optional(v.id("candidates")),
        elected: v.optional(v.array(v.id("candidates"))),
        transfers: v.optional(v.record(v.id("candidates"), v.number())),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Delete existing results if any
    const existing = await ctx.db
      .query("results")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("results", {
      cycleId: args.cycleId,
      computedAt: Date.now(),
      winners: args.winners,
      rounds: args.rounds,
    });
  },
});
