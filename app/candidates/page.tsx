"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PhaseBar } from "@/components/phase-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Nav } from "@/components/nav";
import type { 
  User,
  CandidateWithUser, 
  QuestionWithAuthor, 
  CandidateAnswerWithDetails 
} from "@/lib/types";

export default function CandidatesPage() {
  const cycle = useQuery(api.cycles.getCurrent);
  
  // Get eligible users for start/nomination phases
  const eligibleUsers = useQuery(
    api.eligibility.getEligibleUsers,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as User[] | undefined;
  
  const candidates = useQuery(
    api.candidates.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as CandidateWithUser[] | undefined;
  
  const answers = useQuery(
    api.candidates.getAnswers,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as CandidateAnswerWithDetails[] | undefined;
  
  const questions = useQuery(
    api.questions.getByCycle,
    cycle ? { cycleId: cycle._id } : "skip"
  ) as QuestionWithAuthor[] | undefined;

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

  const approvedQuestions = questions?.filter(
    (q: QuestionWithAuthor) => q.status === "approved"
  ) || [];

  // Show eligible users during start/nomination phase
  const showEligibleUsers = ["start", "nomination"].includes(cycle.phase);
  // Show candidates during later phases
  const showCandidates = ["confirmation", "finalization", "voting", "announcement"].includes(cycle.phase);

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <PhaseBar />

      {showEligibleUsers && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Eligible Members ({eligibleUsers?.length || 0})</CardTitle>
            <CardDescription>
              {cycle.phase === "start" 
                ? "Members who have opted in for nomination" 
                : "Members available to be nominated as candidates"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibleUsers && eligibleUsers.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {eligibleUsers.map((u: User) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {u.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium truncate">{u.displayName}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No members have opted in yet
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {showCandidates && (
        <Card>
          <CardHeader>
            <CardTitle>Candidates ({candidates?.length || 0})</CardTitle>
            <CardDescription>
              {cycle.phase === "confirmation" 
                ? "Nominated candidates - voting on questions in progress"
                : cycle.phase === "finalization"
                ? "Final candidates - answering questions"
                : "View all candidates and their answers to questions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidates && candidates.length > 0 ? (
              candidates.map((candidate: CandidateWithUser) => {
                const candidateAnswers = answers?.filter(
                  (a: CandidateAnswerWithDetails) => a.candidateUserId === candidate.userId
                ) || [];

                return (
                  <Card key={candidate._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{candidate.user?.displayName}</CardTitle>
                        <Badge variant={candidate.status === "confirmed" ? "default" : "destructive"}>
                          {candidate.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {approvedQuestions.length > 0 ? (
                        approvedQuestions.map((question: QuestionWithAuthor) => {
                          const answer = candidateAnswers.find(
                            (a: CandidateAnswerWithDetails) => a.questionId === question._id
                          );

                          return (
                            <div key={question._id} className="border-l-4 border-primary pl-4">
                              <p className="font-medium mb-2">{question.text}</p>
                              <p className="text-foreground">
                                {answer?.answer || <span className="text-muted-foreground italic">No answer provided yet</span>}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-muted-foreground">Questions not yet finalized</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No candidates yet
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!showEligibleUsers && !showCandidates && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Candidates will be shown once the nomination phase begins
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}
