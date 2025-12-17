"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PhaseBar } from "@/components/phase-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Nav } from "@/components/nav";
import { VoteFlowSankey } from "@/components/vote-flow-sankey";
import type { CandidateWithUser, Results, RoundData } from "@/lib/types";

export default function ResultsPage() {
  const cycle = useQuery(api.cycles.getCurrent);
  const results = useQuery(
    api.results.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as Results | null | undefined;
  
  const candidates = useQuery(
    api.candidates.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as CandidateWithUser[] | undefined;

  if (!cycle) {
    return (
      <>
        <Nav />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No active voting cycle</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!results) {
    return (
      <>
        <Nav />
        <div className="container mx-auto p-6">
          <PhaseBar />
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Results not yet computed</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const winnerCandidates = candidates?.filter((c: CandidateWithUser) =>
    results.winners.includes(c._id as typeof results.winners[number])
  ) || [];

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <PhaseBar />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Election Results</CardTitle>
          <CardDescription>
            Winners of the {cycle.title} voting cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
                Winners ({cycle.seats} seats)
              </h3>
              <div className="space-y-2">
                {winnerCandidates.map((winner: CandidateWithUser, index: number) => (
                  <div
                    key={winner._id}
                    className="flex items-center justify-between border border-green-300 dark:border-green-700 p-3 rounded bg-green-100 dark:bg-green-900"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-600 hover:bg-green-700 text-white">{index + 1}</Badge>
                      <span className="font-medium">{winner.user?.displayName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sankey Diagram for Vote Flow */}
      {candidates && (results.rounds as RoundData[]).length >= 2 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vote Flow Diagram</CardTitle>
            <CardDescription>
              Visual representation of how votes transferred between rounds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoteFlowSankey
              rounds={results.rounds as RoundData[]}
              candidates={candidates}
              totalSeats={cycle.seats}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vote Breakdown by Round</CardTitle>
          <CardDescription>
            Detailed STV calculation showing vote transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(() => {
            // Track candidates elected in previous rounds
            const previouslyElected = new Set<string>();
            
            return (results.rounds as RoundData[]).map((round: RoundData, index: number) => {
              // Get candidates elected before this round
              const electedBefore = new Set(previouslyElected);
              
              // Calculate remaining seats at start of this round
              const seatsFilledBefore = electedBefore.size;
              const electedThisRound = round.elected?.length || 0;
              const remainingSeatsAfterThisRound = cycle.seats - seatsFilledBefore - electedThisRound;
              
              // Get sorted candidates for this round (excluding previously elected)
              // Sort: elected first, then by votes descending, eliminated last
              const roundCandidates = Object.entries(round.candidateVotes)
                .filter(([candidateId]) => !electedBefore.has(candidateId))
                .sort(([idA, votesA], [idB, votesB]) => {
                  const aElected = round.elected?.includes(idA);
                  const bElected = round.elected?.includes(idB);
                  const aEliminated = round.eliminated === idA;
                  const bEliminated = round.eliminated === idB;
                  
                  // Elected candidates come first
                  if (aElected && !bElected) return -1;
                  if (bElected && !aElected) return 1;
                  
                  // Eliminated candidates go last
                  if (aEliminated && !bEliminated) return 1;
                  if (bEliminated && !aEliminated) return -1;
                  
                  // Otherwise sort by votes descending
                  return votesB - votesA;
                });
              
              // Determine which candidates should get "Top Vote" badge
              // Only non-elected, non-eliminated candidates in top N positions (where N = remaining seats)
              const topVoteCandidates = new Set<string>();
              let topVoteCount = 0;
              for (const [candidateId] of roundCandidates) {
                const wasElectedThisRound = round.elected?.includes(candidateId);
                const isEliminated = round.eliminated === candidateId;
                
                // Skip elected and eliminated candidates when counting top votes
                if (!wasElectedThisRound && !isEliminated) {
                  if (topVoteCount < remainingSeatsAfterThisRound) {
                    topVoteCandidates.add(candidateId);
                    topVoteCount++;
                  }
                }
              }
              
              // Add this round's elected candidates for next iterations
              if (round.elected) {
                round.elected.forEach(id => previouslyElected.add(id));
              }
              
              return (
                <div key={index} className="border p-4 rounded">
                  <h4 className="font-semibold mb-3">
                    Round {round.round}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({cycle.seats - seatsFilledBefore} seat{cycle.seats - seatsFilledBefore !== 1 ? 's' : ''} remaining)
                    </span>
                  </h4>
                  <div className="space-y-2 mb-3">
                    {roundCandidates
                      .map(([candidateId, votes]: [string, number]) => {
                        const candidate = candidates?.find((c: CandidateWithUser) => c._id === candidateId);
                        const wasElectedThisRound = round.elected?.includes(candidateId);
                        const isEliminated = round.eliminated === candidateId;
                        const isTopVote = topVoteCandidates.has(candidateId);

                        return (
                          <div
                            key={candidateId}
                            className={`flex items-center justify-between p-2 rounded ${
                              wasElectedThisRound
                                ? "bg-green-100 dark:bg-green-900"
                                : isTopVote
                                ? "bg-green-50 dark:bg-green-950"
                                : isEliminated
                                ? "bg-red-100 dark:bg-red-900"
                                : "bg-muted"
                            }`}
                          >
                            <span>{candidate?.user?.displayName || candidateId}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{votes.toFixed(2)} votes</span>
                              {wasElectedThisRound && (
                                <Badge className="bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700">
                                  Elected
                                </Badge>
                              )}
                              {isTopVote && (
                                <Badge className="bg-white dark:bg-white text-black hover:bg-gray-100 dark:hover:bg-gray-100 border border-gray-300">
                                  Top Vote
                                </Badge>
                              )}
                              {isEliminated && (
                                <Badge className="bg-neutral-800 dark:bg-neutral-800 text-white hover:bg-neutral-700 dark:hover:bg-neutral-700">
                                  Eliminated
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {round.elected && round.elected.length > 0 && (
                    <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                      <span className="font-medium">Elected:</span> {round.elected.map((id: string) => {
                        const c = candidates?.find((c: CandidateWithUser) => c._id === id);
                        return c?.user?.displayName;
                      }).join(", ")}
                    </div>
                  )}
                  {round.eliminated && (
                    <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                      <span className="font-medium">Eliminated:</span> {candidates?.find((c: CandidateWithUser) => c._id === round.eliminated)?.user?.displayName}
                    </div>
                  )}
                  {round.transfers && Object.keys(round.transfers).length > 0 && (
                    <div className="mt-2 text-sm text-foreground">
                      <span className="font-medium">Transfers:</span> {Object.entries(round.transfers)
                        .map(([id, transferVotes]: [string, number]) => {
                          const c = candidates?.find((c: CandidateWithUser) => c._id === id);
                          return `${c?.user?.displayName}: +${transferVotes.toFixed(2)}`;
                        })
                        .join(", ")}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
