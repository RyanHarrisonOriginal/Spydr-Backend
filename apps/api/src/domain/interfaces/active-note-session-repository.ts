import type { ActiveNoteAIOutput } from "../active-notes/types/shared.js";
import type { ActiveNotePipelineStepName } from "../active-notes/pipeline/types/recorder.js";

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

export interface IActiveNoteSessionRepository {
  beginAnalysis(
    input: BeginActiveNoteAnalysisInput
  ): Promise<ActiveNoteAnalysisSession>;
  recordStep(input: RecordActiveNoteAnalysisStepInput): Promise<void>;
  completeAnalysis(input: CompleteActiveNoteAnalysisInput): Promise<void>;
  failAnalysis(input: FailActiveNoteAnalysisInput): Promise<void>;
}
