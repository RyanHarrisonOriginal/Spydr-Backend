export type ActiveNotePipelineStepName =
  | "segment"
  | "project_context"
  | "project_assignment"
  | "action_plan";

export interface ActiveNotePipelineRecorder {
  recordStep(step: ActiveNotePipelineStepName, payload: unknown): Promise<void>;
  recordFailure(step: string, error: Error): Promise<void>;
}
