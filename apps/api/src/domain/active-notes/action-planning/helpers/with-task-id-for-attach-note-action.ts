import type { SegmentActionPlan } from "../types/index.js";
import { isExistingProjectSegmentActionPlan } from "../types/index.js";

export function withTaskIdForAttachNoteAction(
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
