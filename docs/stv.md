# Single Transferable Vote (STV)

## Overview

The application uses Single Transferable Vote (STV) to determine election winners when multiple seats are available.

## Algorithm

### Droop Quota

The quota is calculated using the Droop formula:
```
Quota = floor(Total Votes / (Seats + 1)) + 1
```

This ensures that only candidates with sufficient support are elected.

### Process

1. **Initial Count**: Count first preference votes for each candidate

2. **Election**: Candidates at or above quota are elected
   - If multiple candidates exceed quota, all are elected
   - Surplus votes are transferred proportionally

3. **Surplus Transfer**: 
   - Calculate surplus: `surplus = votes - quota`
   - Transfer value: `transferValue = surplus / votes`
   - Distribute surplus to next preferences on ballots that contributed to the winner

4. **Elimination**: If no candidates reach quota:
   - Eliminate candidate with fewest votes
   - Transfer all votes to next preferences

5. **Repeat**: Continue until all seats are filled

6. **Final Allocation**: If seats remain after elimination rounds:
   - Fill remaining seats with candidates with most votes

## Implementation

**Location**: `convex/results.ts` - `computeSTV` action

### Round-by-Round Tracking

Each round records:
- Vote counts for all candidates
- Elected candidates (if any)
- Eliminated candidate (if any)
- Vote transfers (if any)

This data is stored in the `results` table for transparency and visualization.

## Result Display

Results show:
- **Winners**: Final elected candidates
- **Round Breakdown**: 
  - Vote counts per candidate per round
  - Elected candidates highlighted
  - Eliminated candidates marked
  - Transfer amounts shown

## Advantages of STV

- **Proportional Representation**: Ensures diverse representation
- **No Wasted Votes**: Votes transfer to next preferences
- **Fairness**: Candidates need genuine support to win
- **Transparency**: Full calculation visible to all voters

## Example

**Scenario**: 3 seats, 100 votes, 5 candidates

**Quota**: floor(100 / 4) + 1 = 26

**Process**:
1. Count first preferences
2. If Candidate A has 30 votes → Elected, transfer 4 surplus votes
3. If no one else reaches quota → Eliminate lowest, transfer votes
4. Continue until 3 candidates elected

## References

- [STV Wikipedia](https://en.wikipedia.org/wiki/Single_transferable_vote)
- [Droop Quota](https://en.wikipedia.org/wiki/Droop_quota)

