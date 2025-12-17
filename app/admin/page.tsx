"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { PhaseBar } from "@/components/phase-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Nav } from "@/components/nav";
import type { Phase, QuestionWithVotes, User } from "@/lib/types";

export default function AdminPage() {
  const { data: session } = useSession();
  const cycle = useQuery(api.cycles.getCurrent);
  const user = useQuery(
    api.users.getByDiscordId,
    session?.user ? { discordId: (session.user as { id?: string }).id || "" } : "skip"
  );
  const allMembers = useQuery(api.users.getAllMembers) as User[] | undefined;
  const createCycle = useMutation(api.cycles.create);
  const updatePhase = useMutation(api.cycles.updatePhase);
  const updateDeadlines = useMutation(api.cycles.updateDeadlines);
  const approveQuestions = useMutation(api.questions.approveQuestions);
  const computeSTV = useAction(api.results.computeSTV);
  const questionVotes = useQuery(
    api.questions.getQuestionVotes,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as QuestionWithVotes[] | undefined;

  const [title, setTitle] = useState("");
  const [seats, setSeats] = useState(1);
  const [deadlines, setDeadlines] = useState({
    start: "",
    nomination: "",
    confirmation: "",
    finalization: "",
    voting: "",
    announcement: "",
  });

  useEffect(() => {
    if (cycle) {
      setTitle(cycle.title);
      setSeats(cycle.seats);
      const dls: Record<string, string> = {};
      for (const [key, value] of Object.entries(cycle.deadlinesUtc)) {
        if (value) {
          dls[key] = new Date(value as number).toISOString().slice(0, 16);
        }
      }
      setDeadlines((prev) => ({ ...prev, ...dls }));
    }
  }, [cycle]);

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Access denied. Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateCycle = async () => {
    if (!user) return;
    const deadlinesUtc: Record<string, number | undefined> = {};
    for (const [key, value] of Object.entries(deadlines)) {
      if (value) {
        deadlinesUtc[key] = new Date(value).getTime();
      }
    }
    await createCycle({
      title,
      seats,
      deadlinesUtc: deadlinesUtc as {
        start?: number;
        nomination?: number;
        confirmation?: number;
        finalization?: number;
        voting?: number;
        announcement?: number;
      },
      createdBy: user._id,
    });
    alert("Cycle created!");
  };

  const handleUpdateDeadlines = async () => {
    if (!cycle) return;
    const deadlinesUtc: Record<string, number | undefined> = {};
    for (const [key, value] of Object.entries(deadlines)) {
      if (value) {
        deadlinesUtc[key] = new Date(value).getTime();
      }
    }
    await updateDeadlines({
      cycleId: cycle._id,
      deadlinesUtc: deadlinesUtc as {
        start?: number;
        nomination?: number;
        confirmation?: number;
        finalization?: number;
        voting?: number;
        announcement?: number;
      },
    });
    alert("Deadlines updated!");
  };

  const handleAdvancePhase = async (phase: Phase) => {
    if (!cycle) return;
    await updatePhase({
      cycleId: cycle._id,
      phase: phase,
    });
    alert(`Phase advanced to ${phase}`);
  };

  const handleFinalizeQuestions = async () => {
    if (!cycle || !questionVotes || questionVotes.length === 0) {
      alert("No questions to approve");
      return;
    }
    const topQuestions = [...questionVotes]
      .sort((a: QuestionWithVotes, b: QuestionWithVotes) => b.voteCount - a.voteCount)
      .slice(0, 5)
      .map((q: QuestionWithVotes) => q._id);
    await approveQuestions({ questionIds: topQuestions });
    alert("Top 5 questions approved!");
  };

  const handleComputeResults = async () => {
    if (!cycle) return;
    try {
      await computeSTV({ cycleId: cycle._id });
      alert("Results computed!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to compute results";
      alert(errorMessage);
    }
  };

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <PhaseBar />

      {!cycle ? (
        <Card>
          <CardHeader>
            <CardTitle>Create New Voting Cycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Cycle title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Number of Seats</label>
              <Input
                type="number"
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deadlines (UTC)</label>
              {Object.entries(deadlines).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="w-32 text-sm capitalize">{key}:</label>
                  <Input
                    type="datetime-local"
                    value={value}
                    onChange={(e) =>
                      setDeadlines({ ...deadlines, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <Button onClick={handleCreateCycle} disabled={!title || seats < 1}>
              Create Cycle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Manage Cycle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Deadlines</label>
                {Object.entries(deadlines).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="w-32 text-sm capitalize">{key}:</label>
                    <Input
                      type="datetime-local"
                      value={value}
                      onChange={(e) =>
                        setDeadlines({ ...deadlines, [key]: e.target.value })
                      }
                    />
                  </div>
                ))}
                <Button onClick={handleUpdateDeadlines}>Update Deadlines</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Phase Management</CardTitle>
              <CardDescription>
                Current phase: <span className="font-bold text-primary">{cycle.phase}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleAdvancePhase("nomination")}
                  disabled={cycle.phase !== "start"}
                  variant={cycle.phase === "start" ? "default" : "outline"}
                >
                  Start Nomination Phase
                </Button>
                <Button
                  onClick={() => handleAdvancePhase("confirmation")}
                  disabled={cycle.phase !== "nomination"}
                  variant={cycle.phase === "nomination" ? "default" : "outline"}
                >
                  Start Confirmation Phase
                </Button>
                <Button
                  onClick={() => handleAdvancePhase("finalization")}
                  disabled={cycle.phase !== "confirmation"}
                  variant={cycle.phase === "confirmation" ? "default" : "outline"}
                >
                  Start Finalization Phase
                </Button>
                <Button
                  onClick={() => handleAdvancePhase("voting")}
                  disabled={cycle.phase !== "finalization"}
                  variant={cycle.phase === "finalization" ? "default" : "outline"}
                >
                  Start Voting Phase
                </Button>
                <Button
                  onClick={() => handleAdvancePhase("announcement")}
                  disabled={cycle.phase !== "voting"}
                  variant={cycle.phase === "voting" ? "default" : "outline"}
                  className="col-span-2"
                >
                  Start Announcement Phase
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Admin Override (skip to any phase for testing):
                </p>
                <div className="flex flex-wrap gap-2">
                  {["start", "nomination", "confirmation", "finalization", "voting", "announcement"].map((phase) => (
                    <Button
                      key={phase}
                      size="sm"
                      variant={cycle.phase === phase ? "default" : "secondary"}
                      onClick={() => handleAdvancePhase(phase as Phase)}
                      disabled={cycle.phase === phase}
                    >
                      {phase}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {cycle.phase === "confirmation" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Finalize Questions</CardTitle>
                <CardDescription>
                  Approve the top 5 voted questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleFinalizeQuestions}>
                  Approve Top 5 Questions
                </Button>
              </CardContent>
            </Card>
          )}

          {cycle.phase === "voting" && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Compute Results</CardTitle>
                <CardDescription>
                  Calculate STV results after voting phase ends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleComputeResults}>
                  Compute STV Results
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Member List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Synced Members ({allMembers?.length || 0})</CardTitle>
          <CardDescription>
            Discord members synced to the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allMembers && allMembers.length > 0 ? (
            <>
              {/* Find the most recent sync time */}
              {(() => {
                const latestSync = allMembers.reduce((latest, m) => 
                  (m.lastSyncedAt || 0) > (latest || 0) ? m.lastSyncedAt : latest, 
                  0 as number | undefined
                );
                return latestSync ? (
                  <p className="text-sm text-muted-foreground mb-4">
                    Last sync: {new Date(latestSync).toLocaleString()}
                  </p>
                ) : null;
              })()}
              
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Member</th>
                      <th className="text-left p-3 font-medium">Discord ID</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Last Synced</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMembers
                      .filter((m) => !m.discordId.startsWith("dummy_"))
                      .sort((a, b) => (b.lastSyncedAt || 0) - (a.lastSyncedAt || 0))
                      .map((member) => (
                        <tr key={member._id} className="border-t">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {member.avatarUrl ? (
                                <img 
                                  src={member.avatarUrl} 
                                  alt="" 
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                  {member.displayName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium">{member.displayName}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">
                            {member.discordId}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {member.isAdmin && (
                                <Badge variant="default" className="text-xs">Admin</Badge>
                              )}
                              {member.isMember && (
                                <Badge variant="outline" className="text-xs">Member</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {member.lastSyncedAt 
                              ? new Date(member.lastSyncedAt).toLocaleString()
                              : "Never"
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              {/* Show dummy user count separately */}
              {(() => {
                const dummyCount = allMembers.filter((m) => m.discordId.startsWith("dummy_")).length;
                return dummyCount > 0 ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    + {dummyCount} dummy test users (hidden)
                  </p>
                ) : null;
              })()}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No members synced yet. Members will be synced automatically daily, or when users sign in.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
