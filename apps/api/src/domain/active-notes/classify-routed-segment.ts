import type {
  ActiveNoteProjectAssignment,
  ExistingProjectRoutedSegment,
  NewProjectCandidateRoutedSegment,
  ProjectActionContext,
  UnassignedRoutedSegment,
} from "./types/index.js";

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
  assignment: ActiveNoteProjectAssignment
): assignment is ExistingProjectRoutedSegment {
  return (
    assignment.destination === "existing_project" &&
    assignment.projectId != null &&
    assignment.projectName != null
  );
}

export function isNewProjectCandidateRoutedSegment(
  assignment: ActiveNoteProjectAssignment
): assignment is NewProjectCandidateRoutedSegment {
  return (
    assignment.destination === "new_project_candidate" &&
    assignment.projectId == null &&
    assignment.projectName != null
  );
}

export function isUnassignedRoutedSegment(
  assignment: ActiveNoteProjectAssignment
): assignment is UnassignedRoutedSegment {
  return (
    assignment.destination === "unassigned" &&
    assignment.projectId == null &&
    assignment.projectName == null
  );
}
