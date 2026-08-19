import type {
  ExistingProjectRoutedSegment,
  NewProjectCandidateRoutedSegment,
  PlanSegmentActionInput,
  UnassignedRoutedSegment,
} from "../types/index.js";
import type { ProjectActionContext } from "../types/project-action-context.types.js";

export function buildSegmentActionPlannerUserInput(
  input: PlanSegmentActionInput
): string {
  return JSON.stringify({
    segment: {
      originalText: input.routedSegment.originalText,
      contextualText: input.contextualText,
      topic: input.topic,
      projectId: input.routedSegment.projectId,
      projectName: input.routedSegment.projectName,
    },
    projectContext: input.projectContext,
  });
}

export function toExistingProjectRoutedSegment(
  assignment: ExistingProjectRoutedSegment | import("../../project-routing/types/index.js").ActiveNoteProjectAssignment
): ExistingProjectRoutedSegment | null {
  if (
    assignment.destination !== "existing_project" ||
    !assignment.projectId ||
    !assignment.projectName
  ) {
    return null;
  }

  return {
    ...assignment,
    destination: "existing_project",
    projectId: assignment.projectId,
    projectName: assignment.projectName,
  };
}

export function collectProjectTaskIds(
  projectContext: ProjectActionContext
): Set<string> {
  const taskIds = new Set<string>();

  for (const task of projectContext.openTasks) {
    taskIds.add(task.id);
  }
  for (const task of projectContext.recentTasks) {
    taskIds.add(task.id);
  }

  return taskIds;
}

export function findProjectTaskTitle(
  projectContext: ProjectActionContext,
  taskId: string
): string | null {
  const task =
    projectContext.openTasks.find((entry) => entry.id === taskId) ??
    projectContext.recentTasks.find((entry) => entry.id === taskId);

  return task?.title ?? null;
}

export function isExistingProjectRoutedSegment(
  assignment: import("../../project-routing/types/index.js").ActiveNoteProjectAssignment
): assignment is ExistingProjectRoutedSegment {
  return (
    assignment.destination === "existing_project" &&
    assignment.projectId != null &&
    assignment.projectName != null
  );
}

export function isNewProjectCandidateRoutedSegment(
  assignment: import("../../project-routing/types/index.js").ActiveNoteProjectAssignment
): assignment is NewProjectCandidateRoutedSegment {
  return (
    assignment.destination === "new_project_candidate" &&
    assignment.projectId == null &&
    assignment.projectName != null
  );
}

export function isUnassignedRoutedSegment(
  assignment: import("../../project-routing/types/index.js").ActiveNoteProjectAssignment
): assignment is UnassignedRoutedSegment {
  return (
    assignment.destination === "unassigned" &&
    assignment.projectId == null &&
    assignment.projectName == null
  );
}
