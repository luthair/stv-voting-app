"use client";

import { Sankey, Tooltip, Layer, Rectangle } from "recharts";
import type { RoundData, CandidateWithUser } from "@/lib/types";

interface VoteFlowSankeyProps {
  rounds: RoundData[];
  candidates: CandidateWithUser[];
  totalSeats: number;
}

interface SankeyNode {
  name: string;
  isTopVote?: boolean;
  isElected?: boolean;
  isEliminated?: boolean;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

// Custom node component for better styling
function CustomNode({ x, y, width, height, payload }: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: { name: string; isTopVote?: boolean; isElected?: boolean; isEliminated?: boolean };
}) {
  const { isTopVote, isElected, isEliminated } = payload;

  let fill = "#1f2937"; // darker grey for better distinction
  if (isElected) fill = "#22c55e"; // brighter green for elected
  else if (isTopVote) fill = "#15803d"; // darker green for top votes
  else if (isEliminated) fill = "#dc2626"; // red for eliminated

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.95}
        rx={4}
        ry={4}
        stroke={isElected ? "#16a34a" : isTopVote ? "#166534" : isEliminated ? "#b91c1c" : "#374151"}
        strokeWidth={1}
      />
      <text
        x={x + width + 6}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="middle"
        className="text-xs fill-foreground"
        style={{ fontSize: "11px" }}
      >
        {payload.name.replace(" (eliminated)", "").replace(" (elected)", "").replace(" (top vote)", "")}
      </text>
    </Layer>
  );
}

export function VoteFlowSankey({ rounds, candidates, totalSeats }: VoteFlowSankeyProps) {
  if (!rounds || rounds.length < 2) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Not enough rounds to show vote flow diagram
      </p>
    );
  }

  // Build nodes and links for Sankey diagram
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const nodeIndexMap = new Map<string, number>();

  // Helper to get candidate name
  const getCandidateName = (id: string) => {
    const candidate = candidates.find((c) => c._id === id);
    return candidate?.user?.displayName || "Unknown";
  };

  // Track all candidates ever elected across all rounds
  const allElectedCandidates = new Set<string>();

  // Create nodes for each candidate in each round (keep elected candidates visible)
  rounds.forEach((round, roundIndex) => {
    // Calculate remaining seats at start of this round
    const electedBeforeThisRound = new Set<string>();
    for (let i = 0; i < roundIndex; i++) {
      if (rounds[i].elected) {
        rounds[i].elected!.forEach(id => electedBeforeThisRound.add(id));
      }
    }

    const seatsFilledBefore = electedBeforeThisRound.size;
    const electedThisRound = round.elected?.length || 0;
    const remainingSeatsAfterThisRound = totalSeats - seatsFilledBefore - electedThisRound;

    // Get candidates for this round and calculate top votes
    const roundCandidates = Object.entries(round.candidateVotes)
      .filter(([candidateId]) => !electedBeforeThisRound.has(candidateId))
      .sort(([, votesA], [, votesB]) => votesB - votesA);

    const topVoteCandidates = new Set<string>();
    let topVoteCount = 0;
    for (const [candidateId] of roundCandidates) {
      const wasElectedThisRound = round.elected?.includes(candidateId);
      const isEliminated = round.eliminated === candidateId;
      const isAlreadyElected = allElectedCandidates.has(candidateId);

      // Skip elected and eliminated when counting top votes
      if (!wasElectedThisRound && !isAlreadyElected && !isEliminated) {
        if (topVoteCount < remainingSeatsAfterThisRound) {
          topVoteCandidates.add(candidateId);
          topVoteCount++;
        }
      }
    }

    Object.keys(round.candidateVotes).forEach((candidateId) => {
      const wasEliminated = round.eliminated === candidateId;
      const wasElectedThisRound = round.elected?.includes(candidateId);
      const isAlreadyElected = allElectedCandidates.has(candidateId);
      const isTopVote = topVoteCandidates.has(candidateId);

      let nodeName = `R${round.round}: ${getCandidateName(candidateId)}`;
      if (wasEliminated) nodeName += " (eliminated)";
      if (wasElectedThisRound || isAlreadyElected) nodeName += " (elected)";
      if (isTopVote && !wasElectedThisRound && !isAlreadyElected && !wasEliminated) nodeName += " (top vote)";

      const nodeKey = `${roundIndex}-${candidateId}`;
      nodeIndexMap.set(nodeKey, nodes.length);
      nodes.push({
        name: nodeName,
        isTopVote,
        isElected: wasElectedThisRound || isAlreadyElected,
        isEliminated: wasEliminated
      });
    });

    // Add this round's elected candidates to the all-time elected set
    if (round.elected) {
      round.elected.forEach(id => allElectedCandidates.add(id));
    }
  });

  // Create links between rounds (vote transfers)
  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];

    // For each candidate in the next round, link from the current round
    // Now includes elected candidates for visibility
    Object.entries(nextRound.candidateVotes).forEach(([candidateId]) => {
      const sourceKey = `${i}-${candidateId}`;
      const targetKey = `${i + 1}-${candidateId}`;

      const sourceIndex = nodeIndexMap.get(sourceKey);
      const targetIndex = nodeIndexMap.get(targetKey);

      if (sourceIndex !== undefined && targetIndex !== undefined) {
        // Base votes carried over
        const prevVotes = currentRound.candidateVotes[candidateId] || 0;
        const baseVotes = Math.max(0.1, prevVotes); // Minimum value for visibility

        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: baseVotes,
        });
      }
    });

    // Show transfers from eliminated candidate
    if (currentRound.eliminated && currentRound.transfers) {
      const eliminatedKey = `${i}-${currentRound.eliminated}`;
      const eliminatedIndex = nodeIndexMap.get(eliminatedKey);

      if (eliminatedIndex !== undefined) {
        Object.entries(currentRound.transfers).forEach(([targetId, transferValue]) => {
          const targetKey = `${i + 1}-${targetId}`;
          const targetIndex = nodeIndexMap.get(targetKey);

          if (targetIndex !== undefined && transferValue > 0) {
            links.push({
              source: eliminatedIndex,
              target: targetIndex,
              value: transferValue,
            });
          }
        });
      }
    }
  }

  // Filter out any invalid links
  const validLinks = links.filter(
    (link) => link.source < nodes.length && link.target < nodes.length && link.value > 0
  );

  if (validLinks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No vote transfers to display
      </p>
    );
  }

  const data = { nodes, links: validLinks };
  const height = Math.max(400, nodes.length * 25);

  return (
    <div className="w-full overflow-x-auto">
      <Sankey
        width={1200}
        height={height}
        data={data}
        node={<CustomNode x={0} y={0} width={0} height={0} payload={{ name: "", isTopVote: false, isElected: false, isEliminated: false }} />}
        nodePadding={25}
        nodeWidth={15}
        linkCurvature={0.5}
        margin={{ top: 20, right: 220, bottom: 20, left: 20 }}
        link={{ stroke: "#71717a", strokeOpacity: 0.5 }}
      >
        <Tooltip
          content={({ payload }) => {
            if (payload && payload[0]) {
              const data = payload[0].payload;
              if (data.source && data.target) {
                return (
                  <div className="bg-card border rounded p-2 text-sm shadow-lg">
                    <p>{data.source.name} → {data.target.name}</p>
                    <p className="font-medium">{data.value.toFixed(2)} votes</p>
                  </div>
                );
              }
            }
            return null;
          }}
        />
      </Sankey>
    </div>
  );
}

