"use client";

import { useEffect, useRef, useState } from "react";
import { sankey, sankeyLinkHorizontal, sankeyLeft, sankeyRight } from "d3-sankey";
import * as d3 from "d3";
import type { RoundData, CandidateWithUser } from "@/lib/types";

interface VoteFlowSankeyProps {
  rounds: RoundData[];
  candidates: CandidateWithUser[];
  totalSeats: number;
}

interface SankeyNode {
  id: string;
  name: string;
  layer: number; // Round number (0-indexed)
  round: number; // Round number (1-indexed)
  candidateId?: string;
  isExhausted?: boolean;
  isTopVote?: boolean;
  isElected?: boolean;
  isEliminated?: boolean;
  votes?: number;
}

interface SankeyLink {
  source: string | SankeyNode;
  target: string | SankeyNode;
  value: number;
}

export function VoteFlowSankey({ rounds, candidates, totalSeats }: VoteFlowSankeyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });

  // Helper to get candidate name
  const getCandidateName = (id: string) => {
    const candidate = candidates.find((c) => c._id === id);
    return candidate?.user?.displayName || "Unknown";
  };

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.max(800, containerWidth - 40); // Min 800px, account for padding
        const height = Math.max(400, rounds.length * 150);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [rounds.length]);

  useEffect(() => {
    if (!svgRef.current || !rounds || rounds.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 200, bottom: 20, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Track all candidates ever elected across all rounds
    const allElectedCandidates = new Set<string>();

    // Build nodes and links
    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap = new Map<string, SankeyNode>();

    // Create nodes for each round
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

      // Create nodes for each candidate in this round
      Object.entries(round.candidateVotes).forEach(([candidateId, votes]) => {
        const wasEliminated = round.eliminated === candidateId;
        const wasElectedThisRound = round.elected?.includes(candidateId);
        const isAlreadyElected = allElectedCandidates.has(candidateId);
        const isTopVote = topVoteCandidates.has(candidateId);

        const nodeId = `${roundIndex}-${candidateId}`;
        const node: SankeyNode = {
          id: nodeId,
          name: getCandidateName(candidateId),
          layer: roundIndex,
          round: round.round,
          candidateId,
          isTopVote,
          isElected: wasElectedThisRound || isAlreadyElected,
          isEliminated: wasEliminated,
          votes
        };

        nodes.push(node);
        nodeMap.set(nodeId, node);
      });

      // Add this round's elected candidates to the all-time elected set
      if (round.elected) {
        round.elected.forEach(id => allElectedCandidates.add(id));
      }
    });

    // Create links between rounds
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];

      // Track total votes transferred from eliminated candidate
      let eliminatedVotesTransferred = 0;

      // Show transfers from eliminated candidate
      if (currentRound.eliminated && currentRound.transfers) {
        const eliminatedNodeId = `${i}-${currentRound.eliminated}`;
        const eliminatedNode = nodeMap.get(eliminatedNodeId);

        if (eliminatedNode) {
          Object.entries(currentRound.transfers).forEach(([targetId, transferValue]) => {
            const targetNodeId = `${i + 1}-${targetId}`;
            const targetNode = nodeMap.get(targetNodeId);

            if (targetNode && transferValue > 0) {
              links.push({
                source: eliminatedNodeId,
                target: targetNodeId,
                value: transferValue
              });
              eliminatedVotesTransferred += transferValue;
            }
          });

          // If eliminated candidate had votes but not all were transferred, create exhausted link
          const eliminatedVotes = currentRound.candidateVotes[currentRound.eliminated] || 0;
          const exhaustedVotes = eliminatedVotes - eliminatedVotesTransferred;

          if (exhaustedVotes > 0.01) {
            // Create exhausted node for this round if it doesn't exist
            const exhaustedNodeId = `exhausted-${i}`;
            if (!nodeMap.has(exhaustedNodeId)) {
              const exhaustedNode: SankeyNode = {
                id: exhaustedNodeId,
                name: "Exhausted",
                layer: i + 1,
                round: i + 2,
                isExhausted: true
              };
              nodes.push(exhaustedNode);
              nodeMap.set(exhaustedNodeId, exhaustedNode);
            }

            links.push({
              source: eliminatedNodeId,
              target: exhaustedNodeId,
              value: exhaustedVotes
            });
          }
        }
      }

      // For each candidate continuing to next round, create base vote link
      // Note: We only create links for candidates that existed in the previous round
      // Transfers and surplus are handled separately
      Object.entries(nextRound.candidateVotes).forEach(([candidateId]) => {
        const sourceNodeId = `${i}-${candidateId}`;
        const targetNodeId = `${i + 1}-${candidateId}`;
        const sourceNode = nodeMap.get(sourceNodeId);
        const targetNode = nodeMap.get(targetNodeId);

        if (sourceNode && targetNode) {
          // Base votes from previous round (before transfers/surplus)
          const prevVotes = currentRound.candidateVotes[candidateId] || 0;
          
          // Only create link if candidate had votes in previous round
          // (transfers and surplus are handled separately)
          if (prevVotes > 0.01) {
            // Check if this candidate was elected (surplus handled separately)
            const wasElected = currentRound.elected?.includes(candidateId);
            
            if (!wasElected) {
              // For non-elected candidates, base votes flow through
              // But we need to account for what portion is base vs transfers
              const receivedTransfers = currentRound.transfers?.[candidateId] || 0;
              const nextRoundVotes = nextRound.candidateVotes[candidateId] || 0;
              
              // Base votes = min of previous votes or next round votes (after accounting for transfers)
              // This ensures we don't double-count transfers
              const baseVotes = Math.min(prevVotes, nextRoundVotes - receivedTransfers);
              
              if (baseVotes > 0.01) {
                links.push({
                  source: sourceNodeId,
                  target: targetNodeId,
                  value: baseVotes
                });
              }
            } else {
              // For elected candidates, calculate quota and show base votes up to quota
              const totalVotes = Object.values(currentRound.candidateVotes).reduce((a, b) => a + b, 0);
              const quota = Math.floor(totalVotes / (totalSeats + 1)) + 1;
              const baseVotes = Math.min(prevVotes, quota);
              
              if (baseVotes > 0.01) {
                links.push({
                  source: sourceNodeId,
                  target: targetNodeId,
                  value: baseVotes
                });
              }
            }
          }
        }
      });

      // Handle surplus votes from elected candidates
      // Surplus is already accounted for in the transfers object, but we need to show
      // the flow from elected candidates. The transfers object shows where votes went,
      // so we can use that to create surplus links.
      if (currentRound.elected && currentRound.transfers) {
        currentRound.elected.forEach(electedId => {
          const electedNodeId = `${i}-${electedId}`;
          const electedNode = nodeMap.get(electedNodeId);
          
          if (electedNode) {
            const electedVotes = currentRound.candidateVotes[electedId] || 0;
            // Calculate quota (Droop quota)
            const totalVotes = Object.values(currentRound.candidateVotes).reduce((a, b) => a + b, 0);
            const quota = Math.floor(totalVotes / (totalSeats + 1)) + 1;
            
            if (electedVotes > quota) {
              const surplus = electedVotes - quota;
              
              // Check transfers object for surplus distribution
              // If transfers exist for this elected candidate's surplus, use those
              // Otherwise, distribute proportionally to continuing candidates
              const continuingCandidates = Object.keys(nextRound.candidateVotes).filter(id => id !== electedId);
              
              if (continuingCandidates.length > 0) {
                // Distribute surplus proportionally based on next round votes
                const totalNextRoundVotes = continuingCandidates.reduce(
                  (sum, id) => sum + (nextRound.candidateVotes[id] || 0), 
                  0
                );
                
                if (totalNextRoundVotes > 0) {
                  continuingCandidates.forEach(targetId => {
                    const targetVotes = nextRound.candidateVotes[targetId] || 0;
                    const proportion = targetVotes / totalNextRoundVotes;
                    const surplusPortion = surplus * proportion;
                    
                    if (surplusPortion > 0.01) {
                      const targetNodeId = `${i + 1}-${targetId}`;
                      links.push({
                        source: electedNodeId,
                        target: targetNodeId,
                        value: surplusPortion
                      });
                    }
                  });
                }
              }
            }
          }
        });
      }
    }

    if (links.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "fill-muted-foreground")
        .text("No vote transfers to display");
      return;
    }

    // Create Sankey layout with custom node alignment by round
    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeId((d) => d.id)
      .nodeAlign((node) => node.layer) // Align nodes by round (layer)
      .nodeWidth(15)
      .nodePadding(25)
      .extent([[margin.left, margin.top], [chartWidth + margin.left, chartHeight + margin.top]]);

    // Sort nodes within each layer
    sankeyGenerator.nodeSort((a, b) => {
      // Within same layer: elected first, then top votes, then others, eliminated last
      if (a.isElected && !b.isElected) return -1;
      if (!a.isElected && b.isElected) return 1;
      if (a.isTopVote && !b.isTopVote) return -1;
      if (!a.isTopVote && b.isTopVote) return 1;
      if (a.isEliminated && !b.isEliminated) return 1;
      if (!a.isEliminated && b.isEliminated) return -1;
      if (a.isExhausted && !b.isExhausted) return 1;
      if (!a.isExhausted && b.isExhausted) return -1;
      
      // Then sort by votes descending
      return (b.votes || 0) - (a.votes || 0);
    });

    const { nodes: layoutNodes, links: layoutLinks } = sankeyGenerator({
      nodes: nodes.map(n => ({ ...n })),
      links: links.map(l => ({
        source: typeof l.source === "string" ? l.source : l.source.id,
        target: typeof l.target === "string" ? l.target : l.target.id,
        value: l.value
      }))
    });

    // Draw links
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(layoutLinks)
      .enter()
      .append("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", "#71717a")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", (d: any) => Math.max(1, d.width));

    // Add tooltips to links
    link.append("title")
      .text((d: any) => `${d.source.name} → ${d.target.name}: ${d.value.toFixed(2)} votes`);

    // Draw nodes
    const node = svg.append("g")
      .attr("class", "nodes")
      .selectAll("rect")
      .data(layoutNodes)
      .enter()
      .append("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("height", (d: any) => d.y1 - d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("fill", (d: SankeyNode) => {
        if (d.isExhausted) return "#6b7280"; // grey for exhausted
        if (d.isElected) return "#22c55e"; // bright green for elected
        if (d.isTopVote) return "#15803d"; // darker green for top votes
        if (d.isEliminated) return "#dc2626"; // red for eliminated
        return "#1f2937"; // darker grey for others
      })
      .attr("fill-opacity", 0.95)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("stroke", (d: SankeyNode) => {
        if (d.isExhausted) return "#4b5563";
        if (d.isElected) return "#16a34a";
        if (d.isTopVote) return "#166534";
        if (d.isEliminated) return "#b91c1c";
        return "#374151";
      })
      .attr("stroke-width", 1);

    // Add labels (only for final round or exhausted nodes)
    const label = svg.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(layoutNodes.filter((d: any) => d.layer === rounds.length - 1 || d.isExhausted))
      .enter()
      .append("text")
      .attr("x", (d: any) => d.x1 + 6)
      .attr("y", (d: any) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .attr("class", "text-xs fill-foreground")
      .style("font-size", "11px")
      .text((d: SankeyNode) => {
        if (d.isExhausted) return "Exhausted";
        return d.name;
      });

    // Add tooltips to nodes
    node.append("title")
      .text((d: SankeyNode) => {
        let text = `${d.name} (Round ${d.round})`;
        if (d.isElected) text += " - Elected";
        if (d.isTopVote) text += " - Top Vote";
        if (d.isEliminated) text += " - Eliminated";
        if (d.isExhausted) text += " - Exhausted";
        if (d.votes !== undefined) text += `\n${d.votes.toFixed(2)} votes`;
        return text;
      });

  }, [rounds, candidates, totalSeats, dimensions]);

  if (!rounds || rounds.length < 2) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Not enough rounds to show vote flow diagram
      </p>
    );
  }

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
