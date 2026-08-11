import type { EmbeddedSegment } from "../../pipeline/types/index.js";

export type ProjectSemanticMatch = {
  projectId: string;
  similarity: number;
  retrievalDocument: string;
};

export type SegmentWithProjectMatches = EmbeddedSegment & {
  projectMatches: ProjectSemanticMatch[];
};

export type ActiveNoteProjectAssignmentDestination =
  | "existing_project"
  | "new_project_candidate"
  | "unassigned";

export type ProjectMatchBasis =
  | "direct_project_reference"
  | "existing_task"
  | "existing_decision"
  | "existing_idea"
  | "existing_context"
  | "project_scope"
  | "none";

export type ProjectAssignmentCandidate = {
  projectId: string;
  projectName: string;
  retrievalContext: string;
};

export type ProjectFitInput = {
  topic: string;
  sourceText: string;
  contextualText: string;
  candidate: ProjectAssignmentCandidate;
};

export type ProjectFitVerdict =
  | "match"
  | "no_match"
  | "insufficient_evidence";

export type ProjectFitEvaluation = {
  projectId: string;
  projectName: string;
  verdict: ProjectFitVerdict;
  matchBasis: ProjectMatchBasis;
  confidence: number;
  segmentEvidence: string | null;
  projectEvidence: string | null;
  targetObjectId?: string | null;
  targetObjectTitle?: string | null;
  reason: string;
};

export type ProjectResolverCandidate = {
  projectId: string;
  projectName: string;
  matchBasis: ProjectMatchBasis;
  segmentEvidence: string;
  projectEvidence: string;
  targetObjectId?: string | null;
  targetObjectTitle?: string | null;
  reason: string;
};

export type ProjectResolverInput = {
  topic: string;
  sourceText: string;
  contextualText: string;
  candidates: ProjectResolverCandidate[];
};

export type ProjectResolutionResult = {
  projectId: string;
  projectName: string;
  matchBasis: ProjectMatchBasis;
  confidence: number;
  reason: string;
};

export interface ActiveNoteProjectAssignment {
  originalText: string;
  destination: ActiveNoteProjectAssignmentDestination;
  projectId: string | null;
  projectName: string | null;
  matchBasis: ProjectMatchBasis;
  confidence: number;
  reason: string;
}

export type SegmentWithProjectAssignment = SegmentWithProjectMatches & {
  projectAssignment: ActiveNoteProjectAssignment;
};

export interface ActiveNoteProjectContextResult {
  embeddedSegments: SegmentWithProjectMatches[];
}

export interface ActiveNoteProjectAssignmentResult {
  embeddedSegments: SegmentWithProjectAssignment[];
}
