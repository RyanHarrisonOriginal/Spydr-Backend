import type { ActiveNoteSegment } from "./analyze.js";
import type { ActiveNoteProjectAssignment, SegmentWithProjectAssignment } from "./assignment.js";

export type ProjectActionContextChildNode = {
  id: string;
  nodeType: string;
  title: string;
  body: string;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  decisionDetails: {
    decidedAt: Date;
    rationale: string;
  } | null;
};

export const MAX_OPEN_TASKS = 25;
export const MAX_RECENT_TASKS = 10;
export const MAX_RECENT_NOTES = 10;
export const MAX_RECENT_DECISIONS = 10;
export const MAX_RECENT_IDEAS = 10;

export type ProjectActionContext = {
  project: {
    id: string;
    title: string;
    description?: string | null;
  };
  openTasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    updatedAt: string;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    updatedAt: string;
  }>;
  recentNotes: Array<{
    id: string;
    subject: string;
    content?: string | null;
    taskId?: string | null;
    createdAt: string;
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    rationale?: string | null;
    createdAt: string;
  }>;
  recentIdeas: Array<{
    id: string;
    title: string;
    description?: string | null;
    createdAt: string;
  }>;
};

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

export type SegmentWithActionPlan = SegmentWithProjectAssignment & {
  actionPlan: SegmentActionPlan;
};

export type SegmentWithOptionalActionPlan = SegmentWithProjectAssignment & {
  actionPlan?: SegmentActionPlan;
};

export interface ActiveNoteActionPlanResult {
  embeddedSegments: SegmentWithOptionalActionPlan[];
}

export interface ActiveNoteAIOutput {
  segments: ActiveNoteSegment[];
  actionPlans: SegmentActionPlan[];
}

export interface ActiveNoteAnalyzeResult extends ActiveNoteAIOutput {
  sessionId: string | null;
}

export type PlanSegmentActionInput = {
  routedSegment: ExistingProjectRoutedSegment;
  projectContext: ProjectActionContext;
  topic: string;
  contextualText: string;
};
