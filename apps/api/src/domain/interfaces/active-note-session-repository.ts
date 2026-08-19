import type {
  ActiveNoteAIOutput,
  ActiveNoteHistoryItem,
  ActiveNotePipelineStepName,
  ActiveNoteReviewSnapshot,
} from "../active-notes/types/index.js";

export type { ActiveNotePipelineStepName };

export type ActiveNoteSessionStatus =
  | "draft"
  | "analyzing"
  | "review"
  | "applying"
  | "completed"
  | "failed";

export interface ActiveNoteAnalysisSession {
  id: string;
  organizationId: string;
  userId: string;
  status: ActiveNoteSessionStatus;
}

export interface BeginActiveNoteAnalysisInput {
  organizationId: string;
  userId: string;
  content: string;
  projectId?: string | null;
  promptVersion?: string | null;
}

export interface RecordActiveNoteAnalysisStepInput {
  sessionId: string;
  step: ActiveNotePipelineStepName;
  payload: unknown;
}

export interface FailActiveNoteAnalysisInput {
  sessionId: string;
  failedStep: string;
  errorMessage: string;
}

export interface CompleteActiveNoteAnalysisInput {
  sessionId: string;
  analyzeResponse: ActiveNoteAIOutput;
}

export interface CompleteActiveNoteApplyInput {
  sessionId: string;
  organizationId: string;
  userId: string;
  reviewSnapshot: ActiveNoteReviewSnapshot;
  status: "completed" | "failed";
}

export interface ListActiveNoteHistoryInput {
  organizationId: string;
  userId: string;
  limit?: number;
}

export interface IActiveNoteSessionRepository {
  beginAnalysis(
    input: BeginActiveNoteAnalysisInput
  ): Promise<ActiveNoteAnalysisSession>;
  recordStep(input: RecordActiveNoteAnalysisStepInput): Promise<void>;
  completeAnalysis(input: CompleteActiveNoteAnalysisInput): Promise<void>;
  failAnalysis(input: FailActiveNoteAnalysisInput): Promise<void>;
  completeApply(input: CompleteActiveNoteApplyInput): Promise<void>;
  listHistory(input: ListActiveNoteHistoryInput): Promise<ActiveNoteHistoryItem[]>;
}
