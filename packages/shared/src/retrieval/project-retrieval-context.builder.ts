import { isOpenTaskStatus } from "../spydr-query.constants.js";
import type {
  ProjectRetrievalContext,
  ProjectRetrievalContextRows,
  ProjectRetrievalNote,
  ProjectRetrievalProjectRow,
  ProjectRetrievalTask,
  ProjectRetrievalTitledItem,
} from "./project-retrieval.types.js";

export { isOpenTaskStatus };

export function createProjectRetrievalContextRows(
  project: ProjectRetrievalProjectRow,
  children: Partial<Omit<ProjectRetrievalContextRows, "project">> = {}
): ProjectRetrievalContextRows {
  return {
    project,
    tasks: children.tasks ?? [],
    decisions: children.decisions ?? [],
    ideas: children.ideas ?? [],
    notes: children.notes ?? [],
  };
}

export function compareByRecency<T extends { updatedAt: Date; id: string }>(
  left: T,
  right: T
): number {
  const updatedAtDiff = right.updatedAt.getTime() - left.updatedAt.getTime();
  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return left.id.localeCompare(right.id);
}

export function compareOpenTasks(
  left: ProjectRetrievalTask,
  right: ProjectRetrievalTask
): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  const updatedAtDiff = right.updatedAt.getTime() - left.updatedAt.getTime();
  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return left.id.localeCompare(right.id);
}

export function takeMostRecent<T extends { updatedAt: Date; id: string }>(
  items: T[],
  limit: number
): T[] {
  return [...items].sort(compareByRecency).slice(0, limit);
}

export function buildProjectRetrievalContextFromRows(
  input: ProjectRetrievalContextRows
): ProjectRetrievalContext {
  const openTasks = input.tasks
    .filter((task) => isOpenTaskStatus(task.status))
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.body,
      sortOrder: task.sortOrder,
      updatedAt: task.updatedAt,
    }))
    .sort(compareOpenTasks);

  const recentDecisions: ProjectRetrievalTitledItem[] = takeMostRecent(
    input.decisions.map((decision) => ({
      id: decision.id,
      title: decision.title,
      updatedAt: decision.decidedAt ?? decision.updatedAt,
    })),
    5
  );

  const recentIdeas: ProjectRetrievalTitledItem[] = takeMostRecent(
    input.ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      updatedAt: idea.updatedAt,
    })),
    5
  );

  const recentNotes: ProjectRetrievalNote[] = takeMostRecent(
    input.notes.map((note) => ({
      id: note.id,
      subject: note.title,
      content: note.body,
      updatedAt: note.updatedAt,
    })),
    10
  );

  return {
    project: {
      title: input.project.title,
      description: input.project.body,
    },
    openTasks,
    recentDecisions,
    recentIdeas,
    recentNotes,
  };
}
