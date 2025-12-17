"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PhaseBar } from "@/components/phase-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Nav } from "@/components/nav";
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
              <h3 className="text-lg font-semibold mb-2">Winners ({cycle.seats} seats)</h3>
              <div className="space-y-2">
                {winnerCandidates.map((winner: CandidateWithUser, index: number) => (
                  <div
                    key={winner._id}
                    className="flex items-center justify-between border p-3 rounded bg-green-50 dark:bg-green-950"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="default">{index + 1}</Badge>
                      <span className="font-medium">{winner.user?.displayName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vote Breakdown by Round</CardTitle>
          <CardDescription>
            Detailed STV calculation showing vote transfers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(results.rounds as RoundData[]).map((round: RoundData, index: number) => (
            <div key={index} className="border p-4 rounded">
              <h4 className="font-semibold mb-3">Round {round.round}</h4>
              <div className="space-y-2 mb-3">
                {Object.entries(round.candidateVotes).map(([candidateId, votes]: [string, number]) => {
                  const candidate = candidates?.find((c: CandidateWithUser) => c._id === candidateId);
                  const isWinner = results.winners.some(w => w === candidateId);
                  const isEliminated = round.eliminated === candidateId;

                  return (
                    <div
                      key={candidateId}
                      className={`flex items-center justify-between p-2 rounded ${
                        isWinner
                          ? "bg-green-100 dark:bg-green-900"
                          : isEliminated
                          ? "bg-red-100 dark:bg-red-900"
                          : "bg-muted"
                      }`}
                    >
                      <span>{candidate?.user?.displayName || candidateId}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{votes.toFixed(2)} votes</span>
                        {isWinner && <Badge variant="default">Winner</Badge>}
                        {isEliminated && <Badge variant="destructive">Eliminated</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {round.elected && round.elected.length > 0 && (
                <div className="mt-2 text-sm text-green-700">
                  Elected: {round.elected.map((id: string) => {
                    const c = candidates?.find((c: CandidateWithUser) => c._id === id);
                    return c?.user?.displayName;
                  }).join(", ")}
                </div>
              )}
              {round.eliminated && (
                <div className="mt-2 text-sm text-red-700">
                  Eliminated: {candidates?.find((c: CandidateWithUser) => c._id === round.eliminated)?.user?.displayName}
                </div>
              )}
              {round.transfers && Object.keys(round.transfers).length > 0 && (
                <div className="mt-2 text-sm text-blue-700">
                  Transfers: {Object.entries(round.transfers)
                    .map(([id, transferVotes]: [string, number]) => {
                      const c = candidates?.find((c: CandidateWithUser) => c._id === id);
                      return `${c?.user?.displayName}: +${transferVotes.toFixed(2)}`;
                    })
                    .join(", ")}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
