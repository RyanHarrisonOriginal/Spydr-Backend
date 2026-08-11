import {
  segmentActionPlanSchema,
  type ParsedSegmentActionPlanAction,
} from "../schemas/index.js";
import {
  collectProjectTaskIds,
  findProjectTaskTitle,
} from "./build-segment-action-plan-prompt-input.js";
import type { ProjectActionContext } from "../types/project-action-context.types.js";
import type {
  ExistingProjectRoutedSegment,
  ExistingProjectSegmentActionPlan,
} from "../types/index.js";
import { ActiveNoteAnalysisError } from "../../types/shared.js";

function downgradeTaskActionToProjectNote(
  action: Extract<
    ParsedSegmentActionPlanAction,
    { type: "attach_note_to_task" | "use_existing_task" }
  >,
  originalText: string
): Extract<ExistingProjectSegmentActionPlan["action"], { type: "create_note" }> {
  const payload =
    action.type === "attach_note_to_task" ? action.payload : undefined;

  return {
    type: "create_note",
    confidence: action.confidence,
    reason: action.reason,
    payload: {
      subject: payload?.subject ?? "Project Update",
      content: payload?.content ?? originalText,
    },
  };
}

function resolveTaskAction(
  action: ParsedSegmentActionPlanAction,
  projectContext: ProjectActionContext,
  originalText: string
): ExistingProjectSegmentActionPlan["action"] {
  if (
    action.type !== "attach_note_to_task" &&
    action.type !== "use_existing_task"
  ) {
    return action as ExistingProjectSegmentActionPlan["action"];
  }

  const taskIds = collectProjectTaskIds(projectContext);
  if (!action.targetTaskId || !taskIds.has(action.targetTaskId)) {
    return downgradeTaskActionToProjectNote(action, originalText);
  }

  const expectedTaskTitle = findProjectTaskTitle(
    projectContext,
    action.targetTaskId
  );
  const targetTaskTitle = expectedTaskTitle ?? action.targetTaskTitle;

  if (action.type === "use_existing_task") {
    return {
      type: "use_existing_task",
      confidence: action.confidence,
      reason: action.reason,
      targetTaskId: action.targetTaskId,
      targetTaskTitle,
    };
  }

  return {
    type: "attach_note_to_task",
    confidence: action.confidence,
    reason: action.reason,
    targetTaskId: action.targetTaskId,
    targetTaskTitle,
    payload: action.payload!,
  };
}

export function parseSegmentActionPlanOutput(
  raw: unknown,
  routedSegment: ExistingProjectRoutedSegment,
  projectContext: ProjectActionContext
): ExistingProjectSegmentActionPlan {
  const parsed = segmentActionPlanSchema.parse(raw);

  if (parsed.originalText !== routedSegment.originalText) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned mismatched originalText"
    );
  }

  if (parsed.projectId !== routedSegment.projectId) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned a mismatched projectId"
    );
  }

  if (parsed.projectName !== routedSegment.projectName) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned a mismatched projectName"
    );
  }

  return {
    originalText: parsed.originalText,
    projectId: parsed.projectId,
    projectName: parsed.projectName,
    intent: parsed.intent,
    action: resolveTaskAction(
      parsed.action,
      projectContext,
      parsed.originalText
    ),
  };
}
