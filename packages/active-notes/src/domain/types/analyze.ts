export interface ActiveNoteSegment {
  topic: string;
  sourceText: string;
  contextualText: string;
}

export interface ActiveNoteSegmentationResult {
  segments: ActiveNoteSegment[];
}

export type ActiveNotePipelineStepName =
  | "segment"
  | "project_context"
  | "project_assignment"
  | "action_plan";

export interface ActiveNotePipelineRecorder {
  recordStep(step: ActiveNotePipelineStepName, payload: unknown): Promise<void>;
  recordFailure(step: string, error: Error): Promise<void>;
}

export interface EmbeddedSegment extends ActiveNoteSegment {
  embedding: number[];
}

export interface ActiveNoteEmbeddedSegmentationResult {
  embeddedSegments: EmbeddedSegment[];
}

export interface ActiveNoteAnalyzeRequest {
  content: string;
}

export interface ActiveNoteRequestContext {
  orgId: string;
  userId: string;
}

export interface ActiveNoteAIInput {
  content: string;
  orgId: string;
  userId: string;
  recorder?: ActiveNotePipelineRecorder;
}

export const ACTIVE_NOTE_PIPELINE_STEPS: readonly ActiveNotePipelineStepName[] =
  ["segment", "project_context", "project_assignment", "action_plan"];

export interface ActiveNoteAnalyzeAccepted {
  sessionId: string;
  status: "analyzing";
}
