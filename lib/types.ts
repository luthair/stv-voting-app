import type { Doc, Id } from "@/convex/_generated/dataModel";

// Re-export Convex types for convenience
export type { Doc, Id };

// User types
export type User = Doc<"users">;
export type UserId = Id<"users">;

// Cycle types
export type Cycle = Doc<"cycles">;
export type CycleId = Id<"cycles">;
export type Phase = Cycle["phase"];

// Candidate types
export type Candidate = Doc<"candidates">;
export type CandidateId = Id<"candidates">;

// Extended candidate with user info (returned from getByCycle)
export interface CandidateWithUser extends Candidate {
  user: User | null;
}

// Question types
export type Question = Doc<"questions">;
export type QuestionId = Id<"questions">;

// Question with vote count (returned from getQuestionVotes)
export interface QuestionWithVotes extends Question {
  voteCount: number;
}

// Question with author (returned from getByCycle)
export interface QuestionWithAuthor extends Question {
  author: User | null;
}

// Nomination types
export type Nomination = Doc<"nominations">;

// Extended nomination with user info
export interface NominationWithUsers extends Nomination {
  candidate: User | null;
  nominator: User | null;
}

// Ballot types
export type Ballot = Doc<"ballots">;

// Results types
export type Results = Doc<"results">;

export interface RoundData {
  round: number;
  candidateVotes: Record<string, number>;
  eliminated?: string;
  elected?: string[];
  transfers?: Record<string, number>;
}

// Candidate answer types
export type CandidateAnswer = Doc<"candidateAnswers">;

export interface CandidateAnswerWithDetails extends CandidateAnswer {
  candidate: User | null;
  question: Question | null;
}

// Eligibility types
export type Eligibility = Doc<"eligibility">;

