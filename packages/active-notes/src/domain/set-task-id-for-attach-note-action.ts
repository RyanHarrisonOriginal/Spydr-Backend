import {
  isExistingProjectSegmentActionPlan,
  type SegmentActionPlan,
} from "./types/index.js";

export function setTaskIdForAttachNoteAction(
  plan: SegmentActionPlan
): SegmentActionPlan {
  if (!isExistingProjectSegmentActionPlan(plan)) {
    return plan;
  }

  if (plan.action.type !== "attach_note_to_task") {
    return plan;
  }

  return {
    ...plan,
    taskId: plan.action.targetTaskId,
  };
}
