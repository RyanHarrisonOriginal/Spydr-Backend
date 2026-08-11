import type { ActiveNoteProjectAssignment } from "../../project-routing/types/index.js";
import type { ProjectActionContext } from "./project-action-context.types.js";

export type SegmentIntent =
  | "progress_update"
  | "task_action"
  | "decision"
  | "idea"
  | "project_context"
  | "mixed";

export type PlannedActionType =
  | "create_task"
  | "create_note"
  | "attach_note_to_task"
  | "create_decision"
  | "create_idea"
  | "use_existing_task";

export type ExistingProjectRoutedSegment = ActiveNoteProjectAssignment & {
  destination: "existing_project";
  projectId: string;
  projectName: string;
};

export type NewProjectCandidateRoutedSegment = ActiveNoteProjectAssignment & {
  destination: "new_project_candidate";
  projectId: null;
  projectName: string;
};

export type UnassignedRoutedSegment = ActiveNoteProjectAssignment & {
  destination: "unassigned";
  projectId: null;
  projectName: null;
};

export type ExistingProjectSegmentActionPlan = {
  originalText: string;
  contextualText?: string;
  topic?: string;
  projectId: string;
  projectName: string;
  taskId?: string;
  intent: SegmentIntent;
  action:
    | {
        type: "create_task";
        confidence: number;
        reason: string;
        payload: {
          title: string;
          description?: string | null;
        };
      }
    | {
        type: "create_note";
        confidence: number;
        reason: string;
        payload: {
          subject: string;
          content: string;
        };
      }
    | {
        type: "attach_note_to_task";
        confidence: number;
        reason: string;
        targetTaskId: string;
        targetTaskTitle: string;
        payload: {
          subject: string;
          content: string;
        };
      }
    | {
        type: "create_decision";
        confidence: number;
        reason: string;
        payload: {
          title: string;
          rationale?: string | null;
        };
      }
    | {
        type: "create_idea";
        confidence: number;
        reason: string;
        payload: {
          title: string;
          description?: string | null;
        };
      }
    | {
        type: "use_existing_task";
        confidence: number;
        reason: string;
        targetTaskId: string;
        targetTaskTitle: string;
      };
};

export type NewProjectCandidateActionPlan = {
  destination: "new_project_candidate";
  originalText: string;
  contextualText?: string;
  topic?: string;
  projectId: null;
  projectName: string;
  confidence: number;
  reason: string;
};

export type UnassignedActionPlan = {
  destination: "unassigned";
  originalText: string;
  contextualText?: string;
  topic?: string;
  projectId: null;
  projectName: null;
  confidence: number;
  reason: string;
};

export type SegmentActionPlan =
  | ExistingProjectSegmentActionPlan
  | NewProjectCandidateActionPlan
  | UnassignedActionPlan;

export function isExistingProjectSegmentActionPlan(
  plan: SegmentActionPlan
): plan is ExistingProjectSegmentActionPlan {
  return !("destination" in plan);
}

export function isNewProjectCandidateActionPlan(
  plan: SegmentActionPlan
): plan is NewProjectCandidateActionPlan {
  return "destination" in plan && plan.destination === "new_project_candidate";
}

export function isUnassignedActionPlan(
  plan: SegmentActionPlan
): plan is UnassignedActionPlan {
  return "destination" in plan && plan.destination === "unassigned";
}

export type SegmentWithActionPlan =
  import("../../project-routing/types/index.js").SegmentWithProjectAssignment & {
  actionPlan: SegmentActionPlan;
};

export type SegmentWithOptionalActionPlan =
  import("../../project-routing/types/index.js").SegmentWithProjectAssignment & {
    actionPlan?: SegmentActionPlan;
  };

export interface ActiveNoteActionPlanResult {
  embeddedSegments: SegmentWithOptionalActionPlan[];
}

export type PlanSegmentActionInput = {
  routedSegment: ExistingProjectRoutedSegment;
  projectContext: ProjectActionContext;
};
