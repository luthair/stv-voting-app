"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function PhaseBar() {
  const cycle = useQuery(api.cycles.getCurrent);

  if (!cycle) {
    return null;
  }

  const phaseLabels: Record<string, string> = {
    start: "Start Phase",
    nomination: "Nomination + Question Phase",
    confirmation: "Confirmation Phase",
    finalization: "Finalization Phase",
    voting: "Voting Phase",
    announcement: "Announcement Phase",
  };

  const phaseOrder = [
    "start",
    "nomination",
    "confirmation",
    "finalization",
    "voting",
    "announcement",
  ];

  const currentPhaseIndex = phaseOrder.indexOf(cycle.phase);
  const nextPhase =
    currentPhaseIndex < phaseOrder.length - 1
      ? phaseOrder[currentPhaseIndex + 1]
      : null;

  const nextDeadline = nextPhase
    ? cycle.deadlinesUtc[nextPhase as keyof typeof cycle.deadlinesUtc]
    : null;

  const formatDeadline = (timestamp: number | undefined) => {
    if (!timestamp) return "Not set";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeUntilDeadline = (timestamp: number | undefined) => {
    if (!timestamp) return null;
    const now = Date.now();
    const diff = timestamp - now;
    if (diff <= 0) return "Deadline passed";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Phase</p>
              <Badge variant="default" className="mt-1">
                {phaseLabels[cycle.phase] || cycle.phase}
              </Badge>
            </div>
            {nextDeadline && (
              <div>
                <p className="text-sm text-muted-foreground">Next Deadline</p>
                <p className="text-sm font-medium">
                  {formatDeadline(nextDeadline)} ({getTimeUntilDeadline(nextDeadline)})
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Cycle</p>
            <p className="text-sm font-medium">{cycle.title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

