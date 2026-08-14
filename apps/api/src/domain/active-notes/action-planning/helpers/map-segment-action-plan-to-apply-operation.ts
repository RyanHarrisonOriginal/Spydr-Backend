import { ActiveNoteApplyError } from "../../types/shared.js";
import type {
  ActiveNoteApplyOperationInput,
  ActiveNoteApplyPayload,
} from "../../types/shared.js";
import type { SegmentActionPlan } from "../types/index.js";
import {
  isExistingProjectSegmentActionPlan,
  isNewProjectCandidateActionPlan,
  isUnassignedActionPlan,
} from "../types/index.js";

export function mapSegmentActionPlanToApplyOperation(
  plan: SegmentActionPlan,
  operationId: string,
  options: { selected?: boolean } = {}
): ActiveNoteApplyOperationInput {
  const selected = options.selected ?? true;

  if (isUnassignedActionPlan(plan)) {
    return {
      operationId,
      selected: false,
      payload: {
        kind: "no_action",
        message: plan.reason,
      },
    };
  }

  if (isNewProjectCandidateActionPlan(plan)) {
    return {
      operationId,
      selected,
      objectType: "project",
      payload: {
        kind: "project",
        title: plan.projectName,
        description: plan.contextualText ?? plan.originalText,
      },
    };
  }

  if (!isExistingProjectSegmentActionPlan(plan)) {
    throw new ActiveNoteApplyError("Unsupported action plan destination");
  }

  const projectId = plan.projectId;
  const action = plan.action;

  switch (action.type) {
    case "create_task":
      return {
        operationId,
        selected,
        objectType: "task",
        selectedProjectId: projectId,
        payload: {
          kind: "task",
          projectId,
          title: action.payload.title,
          description: action.payload.description ?? undefined,
        },
      };
    case "create_note":
      return {
        operationId,
        selected,
        objectType: "note",
        selectedProjectId: projectId,
        payload: {
          kind: "note",
          projectId,
          title: action.payload.subject,
          content: action.payload.content,
        },
      };
    case "attach_note_to_task":
      return {
        operationId,
        selected,
        objectType: "note",
        selectedProjectId: projectId,
        payload: {
          kind: "note",
          projectId,
          title: action.payload.subject,
          content: action.payload.content,
        },
        attachment: {
          type: "task",
          id: action.targetTaskId,
        },
      };
    case "create_decision":
      return {
        operationId,
        selected,
        objectType: "decision",
        selectedProjectId: projectId,
        payload: {
          kind: "decision",
          projectId,
          title: action.payload.title,
          rationale: action.payload.rationale ?? undefined,
        },
      };
    case "create_idea":
      return {
        operationId,
        selected,
        objectType: "idea",
        selectedProjectId: projectId,
        payload: {
          kind: "idea",
          projectId,
          title: action.payload.title,
          description: action.payload.description ?? undefined,
        },
      };
    case "use_existing_task":
      return {
        operationId,
        selected,
        objectType: "task",
        selectedProjectId: projectId,
        targetObjectId: action.targetTaskId,
        duplicateResolution: "attach_existing",
        payload: {
          kind: "task",
          projectId,
          title: action.targetTaskTitle,
        },
      };
    default: {
      const exhaustiveCheck: never = action;
      throw new ActiveNoteApplyError(
        `Unsupported action type: ${(exhaustiveCheck as { type: string }).type}`
      );
    }
  }
}

export function assertApplyPayloadMatchesKind(
  payload: ActiveNoteApplyPayload
): void {
  switch (payload.kind) {
    case "task":
      if (!payload.title?.trim()) {
        throw new ActiveNoteApplyError("Task title is required", 400);
      }
      return;
    case "note":
      if (
        !payload.title?.trim() &&
        !payload.subject?.trim() &&
        !payload.content?.trim()
      ) {
        throw new ActiveNoteApplyError(
          "Note title or content is required",
          400
        );
      }
      return;
    case "decision":
      if (!payload.title?.trim()) {
        throw new ActiveNoteApplyError("Decision title is required", 400);
      }
      return;
    case "idea":
      if (!payload.title?.trim()) {
        throw new ActiveNoteApplyError("Idea title is required", 400);
      }
      return;
    case "project":
      if (!payload.title?.trim()) {
        throw new ActiveNoteApplyError("Project title is required", 400);
      }
      return;
    case "person":
      if (!payload.name?.trim() && !payload.title?.trim()) {
        throw new ActiveNoteApplyError("Person name is required", 400);
      }
      return;
    case "no_action":
    case "link":
    case "goal":
      return;
    default: {
      const exhaustiveCheck: never = payload.kind;
      throw new ActiveNoteApplyError(
        `Unsupported apply payload kind: ${exhaustiveCheck}`,
        400
      );
    }
  }
}
