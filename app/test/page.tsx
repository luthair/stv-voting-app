"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { PhaseBar } from "@/components/phase-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Nav } from "@/components/nav";
import type { User, CandidateWithUser, QuestionWithVotes, Id } from "@/lib/types";

const DUMMY_USERS = [
  { name: "Alice Test", discordId: "dummy_alice_001" },
  { name: "Bob Test", discordId: "dummy_bob_002" },
  { name: "Charlie Test", discordId: "dummy_charlie_003" },
  { name: "Diana Test", discordId: "dummy_diana_004" },
  { name: "Eve Test", discordId: "dummy_eve_005" },
  { name: "Frank Test", discordId: "dummy_frank_006" },
  { name: "Grace Test", discordId: "dummy_grace_007" },
  { name: "Henry Test", discordId: "dummy_henry_008" },
  { name: "Ivy Test", discordId: "dummy_ivy_009" },
  { name: "Jack Test", discordId: "dummy_jack_010" },
  { name: "Kate Test", discordId: "dummy_kate_011" },
  { name: "Leo Test", discordId: "dummy_leo_012" },
  { name: "Mia Test", discordId: "dummy_mia_013" },
  { name: "Noah Test", discordId: "dummy_noah_014" },
  { name: "Olivia Test", discordId: "dummy_olivia_015" },
  { name: "Paul Test", discordId: "dummy_paul_016" },
  { name: "Quinn Test", discordId: "dummy_quinn_017" },
  { name: "Ruby Test", discordId: "dummy_ruby_018" },
  { name: "Sam Test", discordId: "dummy_sam_019" },
  { name: "Tina Test", discordId: "dummy_tina_020" },
  { name: "Uma Test", discordId: "dummy_uma_021" },
  { name: "Victor Test", discordId: "dummy_victor_022" },
  { name: "Wendy Test", discordId: "dummy_wendy_023" },
  { name: "Xavier Test", discordId: "dummy_xavier_024" },
  { name: "Yara Test", discordId: "dummy_yara_025" },
  { name: "Zane Test", discordId: "dummy_zane_026" },
  { name: "Amber Test", discordId: "dummy_amber_027" },
  { name: "Blake Test", discordId: "dummy_blake_028" },
  { name: "Cora Test", discordId: "dummy_cora_029" },
  { name: "Derek Test", discordId: "dummy_derek_030" },
  { name: "Elena Test", discordId: "dummy_elena_031" },
  { name: "Felix Test", discordId: "dummy_felix_032" },
  { name: "Gwen Test", discordId: "dummy_gwen_033" },
  { name: "Hugo Test", discordId: "dummy_hugo_034" },
  { name: "Iris Test", discordId: "dummy_iris_035" },
  { name: "Jules Test", discordId: "dummy_jules_036" },
  { name: "Kira Test", discordId: "dummy_kira_037" },
  { name: "Luna Test", discordId: "dummy_luna_038" },
  { name: "Max Test", discordId: "dummy_max_039" },
  { name: "Nina Test", discordId: "dummy_nina_040" },
];

export default function TestPage() {
  const { data: session } = useSession();
  const cycle = useQuery(api.cycles.getCurrent);
  const currentUser = useQuery(
    api.users.getByDiscordId,
    session?.user ? { discordId: (session.user as { id?: string }).id || "" } : "skip"
  );
  
  // Get all dummy users
  const dummyUsers = useQuery(api.users.getDummyUsers) as User[] | undefined;
  
  // Get eligibility for dummy users
  const eligibleUsers = useQuery(
    api.eligibility.getEligibleUsers,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as User[] | undefined;
  
  // Get candidates
  const candidates = useQuery(
    api.candidates.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as CandidateWithUser[] | undefined;
  
  // Get questions with votes
  const questionVotes = useQuery(
    api.questions.getQuestionVotes,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as QuestionWithVotes[] | undefined;

  // Mutations
  const createOrUpdateUser = useMutation(api.users.createOrUpdate);
  const setEligibility = useMutation(api.eligibility.setEligibility);
  const createNomination = useMutation(api.nominations.create);
  const createQuestion = useMutation(api.questions.create);
  const voteOnQuestion = useMutation(api.questions.voteOnQuestion);
  const submitAnswer = useMutation(api.candidates.submitAnswer);
  const submitBallot = useMutation(api.ballots.submit);

  const [questionTexts, setQuestionTexts] = useState<Record<string, string>>({});
  const [answerTexts, setAnswerTexts] = useState<Record<string, Record<string, string>>>({});

  // Check if user is admin
  if (!currentUser?.isAdmin) {
    return (
      <>
        <Nav />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive">Access denied. Admin only.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const handleCreateDummyUsers = async () => {
    for (const dummy of DUMMY_USERS) {
      await createOrUpdateUser({
        discordId: dummy.discordId,
        username: dummy.name.toLowerCase().replace(" ", "_"),
        displayName: dummy.name,
        avatarUrl: null,
        isMember: true,
        isAdmin: false,
      });
    }
    alert("Dummy users created!");
  };

  const handleToggleEligibility = async (userId: Id<"users">) => {
    if (!cycle) return;
    const isEligible = eligibleUsers?.some((u) => u._id === userId);
    await setEligibility({
      cycleId: cycle._id,
      userId: userId,
      isEligible: !isEligible,
    });
  };

  const handleNominate = async (nominatorId: Id<"users">, candidateId: Id<"users">) => {
    if (!cycle) return;
    try {
      await createNomination({
        cycleId: cycle._id,
        nominatorUserId: nominatorId,
        candidateUserId: candidateId,
      });
    } catch (error) {
      console.log("Nomination may already exist");
    }
  };

  const handleSubmitQuestion = async (authorId: Id<"users">, text: string) => {
    if (!cycle || !text.trim()) return;
    await createQuestion({
      cycleId: cycle._id,
      authorUserId: authorId,
      text: text,
    });
    setQuestionTexts({ ...questionTexts, [authorId]: "" });
  };

  const handleVoteQuestion = async (voterId: Id<"users">, questionId: Id<"questions">) => {
    if (!cycle) return;
    try {
      await voteOnQuestion({
        cycleId: cycle._id,
        questionId: questionId,
        voterUserId: voterId,
      });
    } catch {
      // Already voted
    }
  };

  const handleSubmitAnswer = async (
    candidateUserId: Id<"users">,
    questionId: Id<"questions">,
    answer: string
  ) => {
    if (!cycle || !answer.trim()) return;
    await submitAnswer({
      cycleId: cycle._id,
      candidateUserId: candidateUserId,
      questionId: questionId,
      answer: answer,
    });
  };

  const handleSubmitBallot = async (voterId: Id<"users">, rankedCandidates: Id<"candidates">[]) => {
    if (!cycle || rankedCandidates.length === 0) return;
    try {
      await submitBallot({
        cycleId: cycle._id,
        voterUserId: voterId,
        rankedCandidateIds: rankedCandidates,
      });
      alert(`Ballot submitted for voter`);
    } catch (error) {
      console.log("Ballot may already exist");
    }
  };

  const approvedQuestions = questionVotes?.filter((q) => q.status === "approved") || [];

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <PhaseBar />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Mode - Dummy Users</CardTitle>
            <CardDescription>
              Manage dummy users to test voting cycles without real user input.
              Current phase: <span className="font-bold text-primary">{cycle?.phase || "No cycle"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateDummyUsers} className="mb-4">
              Create/Reset Dummy Users
            </Button>
            
            {!dummyUsers || dummyUsers.length === 0 ? (
              <p className="text-muted-foreground">
                Click the button above to create dummy users first.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dummyUsers.map((user) => {
                      const isEligible = eligibleUsers?.some((u) => u._id === user._id);
                      const isCandidate = candidates?.some((c) => c.userId === user._id);
                      
                      return (
                        <tr key={user._id} className="border-t">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {user.displayName?.charAt(0)}
                              </div>
                              <span className="font-medium">{user.displayName}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              {isEligible && <Badge variant="outline">Eligible</Badge>}
                              {isCandidate && <Badge>Candidate</Badge>}
                            </div>
                          </td>
                          <td className="p-3">
                            {/* Phase-specific actions */}
                            {cycle?.phase === "start" && (
                              <Button
                                size="sm"
                                variant={isEligible ? "destructive" : "default"}
                                onClick={() => handleToggleEligibility(user._id)}
                              >
                                {isEligible ? "Remove Eligibility" : "Set Eligible"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nomination Phase Actions */}
        {cycle?.phase === "nomination" && dummyUsers && dummyUsers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nomination Actions</CardTitle>
              <CardDescription>Create nominations and submit questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Nominate */}
              <div>
                <h4 className="font-medium mb-2">Quick Nominate</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={async () => {
                      const eligible = eligibleUsers || [];
                      for (let i = 0; i < Math.min(5, eligible.length); i++) {
                        const nominator = eligible[i];
                        const candidate = eligible[(i + 1) % eligible.length];
                        if (nominator && candidate && nominator._id !== candidate._id) {
                          await handleNominate(nominator._id, candidate._id);
                        }
                      }
                      alert("Nominations created!");
                    }}
                  >
                    Auto-Nominate (5)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const eligible = eligibleUsers || [];
                      // Each eligible user nominates another
                      for (let i = 0; i < eligible.length; i++) {
                        const nominator = eligible[i];
                        const candidate = eligible[(i + 1) % eligible.length];
                        if (nominator && candidate && nominator._id !== candidate._id) {
                          await handleNominate(nominator._id, candidate._id);
                        }
                      }
                      alert(`${eligible.length} nominations created!`);
                    }}
                  >
                    Auto-Nominate All Eligible
                  </Button>
                </div>
              </div>

              {/* Submit Questions */}
              <div>
                <h4 className="font-medium mb-2">Submit Questions (as first dummy user)</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a test question..."
                    value={questionTexts[dummyUsers[0]?._id] || ""}
                    onChange={(e) =>
                      setQuestionTexts({ ...questionTexts, [dummyUsers[0]?._id]: e.target.value })
                    }
                  />
                  <Button
                    onClick={() =>
                      handleSubmitQuestion(
                        dummyUsers[0]._id,
                        questionTexts[dummyUsers[0]._id] || ""
                      )
                    }
                  >
                    Submit
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const testQuestions = [
                        "What is your vision for this community?",
                        "How would you handle conflicts between members?",
                        "What experience do you bring to this role?",
                        "What changes would you implement first?",
                        "How will you ensure transparency?",
                      ];
                      for (const q of testQuestions) {
                        const randomUser = dummyUsers[Math.floor(Math.random() * dummyUsers.length)];
                        await createQuestion({
                          cycleId: cycle._id,
                          authorUserId: randomUser._id,
                          text: q,
                        });
                      }
                      alert("Test questions added!");
                    }}
                  >
                    Add 5 Sample Questions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Phase Actions */}
        {cycle?.phase === "confirmation" && dummyUsers && dummyUsers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Confirmation Actions</CardTitle>
              <CardDescription>Vote on questions as dummy users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  className="mb-4"
                  onClick={async () => {
                    const questions = questionVotes || [];
                    // Have each dummy user vote on random questions
                    for (const user of dummyUsers) {
                      // Vote on 2-4 random questions per user
                      const numVotes = Math.floor(Math.random() * 3) + 2;
                      const shuffled = [...questions].sort(() => Math.random() - 0.5);
                      for (let i = 0; i < Math.min(numVotes, shuffled.length); i++) {
                        try {
                          await voteOnQuestion({
                            cycleId: cycle._id,
                            questionId: shuffled[i]._id,
                            voterUserId: user._id,
                          });
                        } catch {
                          // Already voted
                        }
                      }
                    }
                    alert("All dummy users have voted on questions!");
                  }}
                >
                  All Dummy Users Vote Randomly
                </Button>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {questionVotes?.map((q) => (
                    <div key={q._id} className="border p-3 rounded">
                      <p className="mb-2">{q.text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground font-medium">{q.voteCount} votes</span>
                        {dummyUsers.slice(0, 6).map((user) => (
                          <Button
                            key={user._id}
                            size="sm"
                            variant="outline"
                            onClick={() => handleVoteQuestion(user._id, q._id)}
                          >
                            +{user.displayName?.split(" ")[0]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finalization Phase Actions */}
        {cycle?.phase === "finalization" && candidates && candidates.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Finalization Actions</CardTitle>
              <CardDescription>Submit answers for candidates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {candidates
                  .filter((c) => c.status === "confirmed")
                  .map((candidate) => (
                    <div key={candidate._id} className="border p-4 rounded">
                      <h4 className="font-medium mb-3">{candidate.user?.displayName}</h4>
                      <div className="space-y-3">
                        {approvedQuestions.map((q) => (
                          <div key={q._id} className="space-y-1">
                            <p className="text-sm text-muted-foreground">{q.text}</p>
                            <div className="flex gap-2">
                              <Textarea
                                placeholder="Enter answer..."
                                value={answerTexts[candidate.userId]?.[q._id] || ""}
                                onChange={(e) =>
                                  setAnswerTexts({
                                    ...answerTexts,
                                    [candidate.userId]: {
                                      ...answerTexts[candidate.userId],
                                      [q._id]: e.target.value,
                                    },
                                  })
                                }
                                className="min-h-[60px]"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSubmitAnswer(
                                  candidate.userId,
                                  q._id,
                                  answerTexts[candidate.userId]?.[q._id] || ""
                                )
                              }
                            >
                              Save Answer
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            for (const q of approvedQuestions) {
                              await handleSubmitAnswer(
                                candidate.userId,
                                q._id,
                                `This is ${candidate.user?.displayName}'s thoughtful answer to the question about ${q.text.slice(0, 30)}...`
                              );
                            }
                            alert("Auto-filled answers!");
                          }}
                        >
                          Auto-fill Answers
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voting Phase Actions */}
        {cycle?.phase === "voting" && dummyUsers && candidates && candidates.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Voting Actions</CardTitle>
              <CardDescription>Submit ballots for dummy users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Candidates: {candidates.filter((c) => c.status === "confirmed").map((c) => c.user?.displayName).join(", ")}
                </p>
                <Button
                  onClick={async () => {
                    const confirmedCandidates = candidates.filter((c) => c.status === "confirmed");
                    for (const voter of dummyUsers) {
                      // Skip if voter is a candidate
                      if (confirmedCandidates.some((c) => c.userId === voter._id)) continue;
                      
                      // Shuffle candidates for random ranking
                      const shuffled = [...confirmedCandidates].sort(() => Math.random() - 0.5);
                      const rankedIds = shuffled.map((c) => c._id);
                      
                      try {
                        await submitBallot({
                          cycleId: cycle._id,
                          voterUserId: voter._id,
                          rankedCandidateIds: rankedIds,
                        });
                      } catch {
                        // Already voted
                      }
                    }
                    alert("Ballots submitted for all non-candidate dummy users!");
                  }}
                >
                  Submit Random Ballots for All Dummy Users
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!cycle && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No active cycle. Create one from the Admin page first.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

