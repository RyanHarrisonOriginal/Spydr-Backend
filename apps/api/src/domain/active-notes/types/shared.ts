import type { ActiveNoteSegment } from "../segmentation/types/index.js";
import type { SegmentWithProjectAssignment } from "../project-routing/types/index.js";
import type {
  ActiveNoteActionPlanResult,
  SegmentActionPlan,
} from "../action-planning/types/index.js";
import { assertSegmentContextualTextMatches } from "../action-planning/helpers/attach-segment-lineage-to-action-plan.js";
import type { ActiveNoteEmbeddedSegmentationResult } from "../pipeline/types/index.js";
import type {
  ActiveNoteProjectAssignmentResult,
  ActiveNoteProjectContextResult,
} from "../project-routing/types/index.js";
import type { ActiveNoteSegmentationResult } from "../segmentation/types/index.js";

export type SegmentWithActionPlan = SegmentWithProjectAssignment & {
  actionPlan: SegmentActionPlan;
};

export interface ActiveNoteAIOutput {
  segments: ActiveNoteSegment[];
  actionPlans: SegmentActionPlan[];
}

export function toActiveNoteAIOutput(
  result: ActiveNoteActionPlanResult
): ActiveNoteAIOutput {
  return {
    segments: result.embeddedSegments.map(
      ({ topic, sourceText, contextualText }) => ({
        topic,
        sourceText,
        contextualText,
      })
    ),
    actionPlans: result.embeddedSegments.flatMap((segment) => {
      if (!segment.actionPlan) {
        throw new ActiveNoteAnalysisError(
          `Missing action plan for segment: ${segment.sourceText}`
        );
      }

      assertSegmentContextualTextMatches(segment, segment.actionPlan);

      return [
        {
          ...segment.actionPlan,
          topic: segment.topic,
          contextualText: segment.contextualText,
        },
      ];
    }),
  };
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
}

export interface ActiveNoteAIProvider {
  analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput>;
  segment(input: ActiveNoteAIInput): Promise<ActiveNoteSegmentationResult>;
  getProjectContext(
    result: ActiveNoteEmbeddedSegmentationResult,
    context: ActiveNoteRequestContext
  ): Promise<ActiveNoteProjectContextResult>;
  inferProjectAssignment(
    result: ActiveNoteProjectContextResult
  ): Promise<ActiveNoteProjectAssignmentResult>;
  inferAction(
    result: ActiveNoteProjectAssignmentResult
  ): Promise<ActiveNoteAIOutput>;
  planSegmentAction(
    input: import("../action-planning/types/index.js").PlanSegmentActionInput
  ): Promise<SegmentActionPlan>;
}

export class ActiveNoteAnalysisError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "ActiveNoteAnalysisError";
    this.statusCode = statusCode;
  }
}

export class ActiveNoteApplyError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ActiveNoteApplyError";
    this.statusCode = statusCode;
  }
}

export type ActiveNotePriority = "low" | "medium" | "high";

export type ActiveNoteApplyObjectType =
  | "project"
  | "task"
  | "note"
  | "decision"
  | "idea"
  | "person"
  | "goal"
  | "relationship";

export type ActiveNoteApplyPayloadKind =
  | "project"
  | "task"
  | "note"
  | "goal"
  | "decision"
  | "idea"
  | "person"
  | "link"
  | "no_action";

export interface ActiveNoteApplyPayload {
  kind: ActiveNoteApplyPayloadKind;
  title?: string;
  description?: string;
  content?: string;
  rationale?: string;
  name?: string;
  priority?: ActiveNotePriority | string;
  dueDate?: string | null;
  status?: string;
  projectId?: string | null;
  subtype?: string | null;
  sourceObjectId?: string | null;
  sourceLabel?: string;
  targetObjectId?: string;
  targetLabel?: string;
  targetObjectType?: ActiveNoteApplyObjectType;
  relationshipType?: string;
  message?: string;
}

export interface ActiveNoteApplyOperationInput {
  operationId: string;
  selected: boolean;
  objectType?: ActiveNoteApplyObjectType | null;
  payload: ActiveNoteApplyPayload;
  selectedProjectId?: string | null;
  projectRef?: string | null;
  duplicateResolution?: "attach_existing" | "create_new" | "ignore" | null;
  targetObjectId?: string | null;
  attachment?: {
    type: "project" | "task";
    id?: string | null;
    ref?: string | null;
  } | null;
}

export interface ActiveNoteApplyRequest {
  activeNoteId?: string;
  content?: string;
  projectId?: string | null;
  operations: ActiveNoteApplyOperationInput[];
}

export interface AppliedActiveNoteObject {
  id: string;
  type: ActiveNoteApplyObjectType;
  title: string;
  action: "created" | "updated" | "linked";
  href: string;
}

export interface ActiveNoteApplyResult {
  activeNote: {
    id: string;
    content: string;
    projectId: string | null;
    status: "completed" | "failed";
    createdAt: string;
    updatedAt: string;
  };
  applied: AppliedActiveNoteObject[];
  failed: Array<{
    operationId: string;
    message: string;
  }>;
  partial: boolean;
}

export type {
  ActiveNoteActionPlanResult,
  SegmentActionPlan,
} from "../action-planning/types/index.js";

export type { ActiveNoteSegmentationResult } from "../segmentation/types/index.js";
export type {
  ActiveNoteEmbeddedSegmentationResult,
  EmbeddedSegment,
} from "../pipeline/types/index.js";
export type {
  ActiveNoteProjectAssignment,
  ActiveNoteProjectAssignmentDestination,
  ActiveNoteProjectAssignmentResult,
  ActiveNoteProjectContextResult,
  ProjectAssignmentCandidate,
  ProjectFitEvaluation,
  ProjectFitInput,
  ProjectFitVerdict,
  ProjectMatchBasis,
  ProjectResolutionResult,
  ProjectResolverCandidate,
  ProjectResolverInput,
  ProjectSemanticMatch,
  SegmentWithProjectAssignment,
  SegmentWithProjectMatches,
} from "../project-routing/types/index.js";
export type { ActiveNoteSegment } from "../segmentation/types/index.js";
export { ACTIVE_NOTE_PROMPT_VERSION } from "../segmentation/segmentation-prompt.js";
