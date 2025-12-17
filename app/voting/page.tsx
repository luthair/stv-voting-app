"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PhaseBar } from "@/components/phase-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import type { 
  User, 
  CandidateWithUser, 
  QuestionWithVotes, 
  QuestionWithAuthor,
  NominationWithUsers,
  Id 
} from "@/lib/types";

export default function VotingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const cycle = useQuery(api.cycles.getCurrent);
  const user = useQuery(
    api.users.getByDiscordId,
    session?.user ? { discordId: (session.user as { id?: string }).id || "" } : "skip"
  );
  const eligibility = useQuery(
    api.eligibility.getByUserAndCycle,
    cycle && user
      ? { cycleId: cycle._id, userId: user._id }
      : "skip"
  );
  const eligibleUsers = useQuery(
    api.eligibility.getEligibleUsers,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as User[] | undefined;
  
  const nomination = useQuery(
    api.nominations.getByNominator,
    cycle && user
      ? { cycleId: cycle._id, nominatorUserId: user._id }
      : "skip"
  ) as NominationWithUsers | null | undefined;
  
  const questions = useQuery(
    api.questions.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as QuestionWithAuthor[] | undefined;
  
  const questionVotes = useQuery(
    api.questions.getQuestionVotes,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as QuestionWithVotes[] | undefined;
  
  // Get questions the user has already voted on
  const userQuestionVotes = useQuery(
    api.questions.getUserVotes,
    cycle && user
      ? { cycleId: cycle._id, userId: user._id }
      : "skip"
  ) as string[] | undefined;
  
  const candidates = useQuery(
    api.candidates.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as CandidateWithUser[] | undefined;
  
  const ballot = useQuery(
    api.ballots.getByVoter,
    cycle && user
      ? { cycleId: cycle._id, voterUserId: user._id }
      : "skip"
  );

  const setEligibility = useMutation(api.eligibility.setEligibility);
  const createNomination = useMutation(api.nominations.create);
  const createQuestion = useMutation(api.questions.create);
  const voteOnQuestion = useMutation(api.questions.voteOnQuestion);
  const dropOut = useMutation(api.candidates.dropOut);
  const submitAnswer = useMutation(api.candidates.submitAnswer);
  const submitBallot = useMutation(api.ballots.submit);

  const [isEligible, setIsEligible] = useState(eligibility?.isEligible ?? false);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [questionText, setQuestionText] = useState("");
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [rankedCandidates, setRankedCandidates] = useState<string[]>([]);

  useEffect(() => {
    if (eligibility) {
      setIsEligible(eligibility.isEligible);
    }
  }, [eligibility]);

  useEffect(() => {
    if (ballot) {
      setRankedCandidates(ballot.rankedCandidateIds as string[]);
    }
  }, [ballot]);

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

  const handleSetEligibility = async () => {
    if (!user || !cycle) return;
    await setEligibility({
      cycleId: cycle._id,
      userId: user._id,
      isEligible: !isEligible,
    });
    setIsEligible(!isEligible);
  };

  const handleNominate = async () => {
    if (!user || !cycle || !selectedCandidate) return;
    try {
      await createNomination({
        cycleId: cycle._id,
        nominatorUserId: user._id,
        candidateUserId: selectedCandidate as Id<"users">,
      });
      setSelectedCandidate("");
      alert("Nomination submitted successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit nomination";
      alert(errorMessage);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!user || !cycle || !questionText.trim()) return;
    await createQuestion({
      cycleId: cycle._id,
      authorUserId: user._id,
      text: questionText,
    });
    setQuestionText("");
  };

  const handleVoteQuestion = async (questionId: Id<"questions">) => {
    if (!user || !cycle) return;
    
    // Check if already voted (client-side check for better UX)
    if (userQuestionVotes?.includes(questionId)) {
      return; // Silently ignore - button should be disabled anyway
    }
    
    try {
      await voteOnQuestion({
        cycleId: cycle._id,
        questionId: questionId,
        voterUserId: user._id,
      });
    } catch {
      // Error is expected if already voted - UI should prevent this
    }
  };

  const handleSubmitBallot = async () => {
    if (!user || !cycle || rankedCandidates.length === 0) return;
    try {
      await submitBallot({
        cycleId: cycle._id,
        voterUserId: user._id,
        rankedCandidateIds: rankedCandidates as Id<"candidates">[],
      });
      alert("Ballot submitted successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit ballot";
      alert(errorMessage);
    }
  };

  // Use questionVotes if available (has vote counts), otherwise fall back to questions
  const displayQuestions = questionVotes || questions || [];

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <PhaseBar />

      {cycle.phase === "start" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Set Your Eligibility</CardTitle>
              <CardDescription>
                Mark yourself as eligible for nomination in this voting cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                isEligible 
                  ? "border-green-500 bg-green-50 dark:bg-green-950" 
                  : "border-muted bg-muted/50"
              }`}>
                <div>
                  <p className="font-medium">I am available to be nominated</p>
                  <p className="text-sm text-muted-foreground">
                    {isEligible 
                      ? "✓ You are currently eligible for nomination" 
                      : "You have not opted in for nomination"}
                  </p>
                </div>
                <Button
                  onClick={handleSetEligibility}
                  variant={isEligible ? "destructive" : "default"}
                  size="lg"
                >
                  {isEligible ? "Opt Out" : "Opt In"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {eligibleUsers && eligibleUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Eligible Members ({eligibleUsers.length})</CardTitle>
                <CardDescription>
                  Members who have opted in for nomination
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {eligibleUsers.map((u: User) => (
                    <div
                      key={u._id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        u._id === user?._id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.displayName}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {cycle.phase === "nomination" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nominate Candidate</CardTitle>
              <CardDescription>
                Nominate one eligible member as a candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {nomination ? (
                <p className="text-sm text-muted-foreground">
                  You have already nominated: {nomination.candidate?.displayName}
                </p>
              ) : (
                <>
                  <Select value={selectedCandidate} onValueChange={(val) => setSelectedCandidate(val || "")}>
                    <SelectTrigger>
                      <SelectValue>{selectedCandidate ? eligibleUsers?.find(u => u._id === selectedCandidate)?.displayName : "Select a candidate"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleUsers?.map((u: User) => (
                        <SelectItem key={u._id} value={u._id}>
                          {u.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleNominate} disabled={!selectedCandidate}>
                    Submit Nomination
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submit Question</CardTitle>
              <CardDescription>
                Propose a question to be asked to candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question..."
              />
              <Button onClick={handleSubmitQuestion} disabled={!questionText.trim()}>
                Submit Question
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {cycle.phase === "confirmation" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vote on Questions</CardTitle>
              <CardDescription>
                Vote on which questions should be asked to candidates. You can vote for multiple questions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayQuestions.map((q) => {
                const hasVoted = userQuestionVotes?.includes(q._id);
                return (
                  <div 
                    key={q._id} 
                    className={`flex items-center justify-between border p-4 rounded transition-colors ${
                      hasVoted ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <p className="flex-1">{q.text}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {("voteCount" in q ? q.voteCount : 0)} votes
                      </span>
                      {hasVoted ? (
                        <span className="text-sm text-primary font-medium px-3 py-1 rounded bg-primary/10">
                          ✓ Voted
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleVoteQuestion(q._id)}
                        >
                          Vote
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {candidates?.some((c: CandidateWithUser) => c.user?._id === user?._id) && (
            <Card>
              <CardHeader>
                <CardTitle>Drop Out</CardTitle>
                <CardDescription>
                  If you no longer wish to be a candidate, you can drop out
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!user || !cycle) return;
                    await dropOut({
                      cycleId: cycle._id,
                      candidateUserId: user._id,
                    });
                  }}
                >
                  Drop Out
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {cycle.phase === "finalization" && (
        <>
          {candidates?.some((c: CandidateWithUser) => c.user?._id === user?._id) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Answer Questions</CardTitle>
                <CardDescription>
                  Provide answers to the selected questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions
                  ?.filter((q: QuestionWithAuthor) => q.status === "approved")
                  .map((q: QuestionWithAuthor) => (
                    <div key={q._id} className="space-y-2">
                      <p className="font-medium">{q.text}</p>
                      <Textarea
                        value={answerTexts[q._id] || ""}
                        onChange={(e) =>
                          setAnswerTexts({ ...answerTexts, [q._id]: e.target.value })
                        }
                        placeholder="Your answer..."
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!user || !cycle) return;
                          await submitAnswer({
                            cycleId: cycle._id,
                            candidateUserId: user._id,
                            questionId: q._id,
                            answer: answerTexts[q._id],
                          });
                        }}
                      >
                        Save Answer
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>View Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/candidates")}>
                View All Candidates and Answers
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {cycle.phase === "voting" && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Your Ballot</CardTitle>
            <CardDescription>
              Rank candidates in order of preference. Click to add to your ranking, use arrows to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {ballot ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">You have already submitted your ballot.</p>
                <p className="text-xs text-muted-foreground">Your votes are recorded and cannot be changed.</p>
              </div>
            ) : (
              <>
                {/* Your Ranking Section */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="text-primary">Your Ranking</span>
                    {rankedCandidates.length > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        {rankedCandidates.length} ranked
                      </span>
                    )}
                  </h4>
                  {rankedCandidates.length === 0 ? (
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <p className="text-muted-foreground text-sm">
                        Click on candidates below to add them to your ranking
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rankedCandidates.map((candidateId, index) => {
                        const candidate = candidates?.find((c: CandidateWithUser) => c._id === candidateId);
                        if (!candidate) return null;
                        
                        return (
                          <div
                            key={candidateId}
                            className="flex items-center gap-3 border border-primary/50 bg-primary/5 p-3 rounded-lg transition-all"
                          >
                            {/* Rank Number */}
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                              {index + 1}
                            </div>
                            
                            {/* Candidate Name */}
                            <span className="font-medium flex-1">{candidate.user?.displayName}</span>
                            
                            {/* Control Buttons */}
                            <div className="flex items-center gap-1">
                              {/* Move Up */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={index === 0}
                                onClick={() => {
                                  const newRanked = [...rankedCandidates];
                                  [newRanked[index - 1], newRanked[index]] = [newRanked[index], newRanked[index - 1]];
                                  setRankedCandidates(newRanked);
                                }}
                              >
                                ↑
                              </Button>
                              
                              {/* Move Down */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={index === rankedCandidates.length - 1}
                                onClick={() => {
                                  const newRanked = [...rankedCandidates];
                                  [newRanked[index], newRanked[index + 1]] = [newRanked[index + 1], newRanked[index]];
                                  setRankedCandidates(newRanked);
                                }}
                              >
                                ↓
                              </Button>
                              
                              {/* Remove */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setRankedCandidates(rankedCandidates.filter((id) => id !== candidateId));
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Available Candidates Section */}
                {(() => {
                  const unrankedCandidates = candidates?.filter(
                    (c: CandidateWithUser) => c.status === "confirmed" && !rankedCandidates.includes(c._id)
                  ) || [];
                  
                  if (unrankedCandidates.length === 0) return null;
                  
                  return (
                    <div>
                      <h4 className="font-medium mb-3 text-muted-foreground">
                        Available Candidates ({unrankedCandidates.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {unrankedCandidates.map((candidate: CandidateWithUser) => (
                          <button
                            key={candidate._id}
                            className="flex items-center gap-3 border border-muted hover:border-primary hover:bg-primary/5 p-3 rounded-lg transition-all text-left"
                            onClick={() => {
                              setRankedCandidates([...rankedCandidates, candidate._id]);
                            }}
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm shrink-0">
                              +
                            </div>
                            <span className="font-medium">{candidate.user?.displayName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const confirmed = candidates?.filter((c: CandidateWithUser) => c.status === "confirmed") || [];
                      setRankedCandidates(confirmed.map((c: CandidateWithUser) => c._id));
                    }}
                  >
                    Rank All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRankedCandidates([])}
                    disabled={rankedCandidates.length === 0}
                  >
                    Clear All
                  </Button>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitBallot}
                  disabled={rankedCandidates.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Submit Ballot ({rankedCandidates.length} candidate{rankedCandidates.length !== 1 ? "s" : ""} ranked)
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {cycle.phase === "announcement" && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/results")}>
              View Results
            </Button>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
