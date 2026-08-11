import type {
  ExistingProjectRoutedSegment,
  ExistingProjectSegmentActionPlan,
} from "../types/index.js";

export function inferStubSegmentActionPlan(
  routedSegment: ExistingProjectRoutedSegment,
  projectContext: import("../types/project-action-context.types.js").ProjectActionContext
): ExistingProjectSegmentActionPlan {
  const normalizedText = routedSegment.originalText.trim().toLowerCase();
  const matchedTask = projectContext.openTasks.find((task) => {
    const normalizedTitle = task.title.trim().toLowerCase();
    return (
      normalizedText.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedText)
    );
  });

  if (matchedTask) {
    return {
      originalText: routedSegment.originalText,
      projectId: routedSegment.projectId,
      projectName: routedSegment.projectName,
      intent: "progress_update",
      action: {
        type: "attach_note_to_task",
        confidence: 0.75,
        reason: "Stub provider matched an open Task in the Project.",
        targetTaskId: matchedTask.id,
        targetTaskTitle: matchedTask.title,
        payload: {
          subject: "Progress Update",
          content: routedSegment.originalText,
        },
      },
    };
  }

  if (
    /\b(decided|decision|will use|should remain|going with)\b/i.test(
      routedSegment.originalText
    )
  ) {
    return {
      originalText: routedSegment.originalText,
      projectId: routedSegment.projectId,
      projectName: routedSegment.projectName,
      intent: "decision",
      action: {
        type: "create_decision",
        confidence: 0.7,
        reason: "Stub provider detected decision language.",
        payload: {
          title: "Project Decision",
          rationale: routedSegment.originalText,
        },
      },
    };
  }

  if (/\b(maybe|could|should eventually|idea)\b/i.test(routedSegment.originalText)) {
    return {
      originalText: routedSegment.originalText,
      projectId: routedSegment.projectId,
      projectName: routedSegment.projectName,
      intent: "idea",
      action: {
        type: "create_idea",
        confidence: 0.68,
        reason: "Stub provider detected idea language.",
        payload: {
          title: "Project Idea",
          description: routedSegment.originalText,
        },
      },
    };
  }

  if (/\b(need to|must|should|add|validate|align|implement)\b/i.test(
    routedSegment.originalText
  )) {
    return {
      originalText: routedSegment.originalText,
      projectId: routedSegment.projectId,
      projectName: routedSegment.projectName,
      intent: "task_action",
      action: {
        type: "create_task",
        confidence: 0.72,
        reason: "Stub provider detected explicit work language.",
        payload: {
          title: "Follow-up Task",
          description: routedSegment.originalText,
        },
      },
    };
  }

  return {
    originalText: routedSegment.originalText,
    projectId: routedSegment.projectId,
    projectName: routedSegment.projectName,
    intent: "project_context",
    action: {
      type: "create_note",
      confidence: 0.65,
      reason: "Stub provider preserved the segment as Project context.",
      payload: {
        subject: "Project Update",
        content: routedSegment.originalText,
      },
    },
  };
}
