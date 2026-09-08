import {
  segmentActionPlanSchema,
  type ParsedSegmentActionPlanAction,
} from "./zod-schema.js";
import {
  collectProjectTaskIds,
  findProjectTaskTitle,
} from "../../domain/index.js";
import type { ProjectActionContext } from "../../domain/index.js";
import type {
  ExistingProjectRoutedSegment,
  ExistingProjectSegmentActionPlan,
} from "../../domain/index.js";
import { ActiveNoteAnalysisError } from "../../domain/index.js";

type TaskRelatedParsedAction = ParsedSegmentActionPlanAction & {
  type: "attach_note_to_task" | "use_existing_task";
};

type AttachNotePayload = {
  subject: string;
  content: string;
};

function isAttachNotePayload(
  payload: ParsedSegmentActionPlanAction["payload"]
): payload is AttachNotePayload {
  return (
    payload != null &&
    typeof payload === "object" &&
    "subject" in payload &&
    typeof payload.subject === "string" &&
    "content" in payload &&
    typeof payload.content === "string"
  );
}

function downgradeTaskActionToProjectNote(
  action: TaskRelatedParsedAction,
  originalText: string
): Extract<ExistingProjectSegmentActionPlan["action"], { type: "create_note" }> {
  const payload =
    action.type === "attach_note_to_task" && isAttachNotePayload(action.payload)
      ? action.payload
      : undefined;

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

  const taskAction = action as TaskRelatedParsedAction;
  const taskIds = collectProjectTaskIds(projectContext);
  if (!taskAction.targetTaskId || !taskIds.has(taskAction.targetTaskId)) {
    return downgradeTaskActionToProjectNote(taskAction, originalText);
  }

  const expectedTaskTitle = findProjectTaskTitle(
    projectContext,
    taskAction.targetTaskId
  );
  const targetTaskTitle =
    expectedTaskTitle ?? taskAction.targetTaskTitle ?? "Linked task";

  if (taskAction.type === "use_existing_task") {
    if (!taskAction.targetTaskId) {
      return downgradeTaskActionToProjectNote(taskAction, originalText);
    }

    return {
      type: "use_existing_task",
      confidence: taskAction.confidence,
      reason: taskAction.reason,
      targetTaskId: taskAction.targetTaskId,
      targetTaskTitle,
    };
  }

  if (!isAttachNotePayload(taskAction.payload)) {
    return downgradeTaskActionToProjectNote(taskAction, originalText);
  }

  if (!taskAction.targetTaskId) {
    return downgradeTaskActionToProjectNote(taskAction, originalText);
  }

  return {
    type: "attach_note_to_task",
    confidence: taskAction.confidence,
    reason: taskAction.reason,
    targetTaskId: taskAction.targetTaskId,
    targetTaskTitle,
    payload: taskAction.payload,
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
