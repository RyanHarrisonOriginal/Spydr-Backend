import {
  MAX_OPEN_TASKS,
  MAX_RECENT_DECISIONS,
  MAX_RECENT_IDEAS,
  MAX_RECENT_NOTES,
  MAX_RECENT_TASKS,
  type ProjectActionContext,
  type ProjectActionContextChildNode,
} from "./types/index.js";

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoString(value: Date): string {
  return value.toISOString();
}

function compareByUpdatedAtDesc<T extends { updatedAt: Date; id: string }>(
  left: T,
  right: T
): number {
  const updatedAtDiff = right.updatedAt.getTime() - left.updatedAt.getTime();
  if (updatedAtDiff !== 0) {
    return updatedAtDiff;
  }

  return left.id.localeCompare(right.id);
}

function compareOpenTasks(
  left: ProjectActionContextChildNode,
  right: ProjectActionContextChildNode
): number {
  if (left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }

  return compareByUpdatedAtDesc(left, right);
}

function compareByCreatedAtDesc<T extends { createdAt: Date; id: string }>(
  left: T,
  right: T
): number {
  const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime();
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  return left.id.localeCompare(right.id);
}

export function buildProjectActionContext(input: {
  project: {
    id: string;
    title: string;
    body: string;
  };
  childNodes: readonly ProjectActionContextChildNode[];
  noteTaskIdsByNoteId: ReadonlyMap<string, string>;
}): ProjectActionContext {
  const tasks = input.childNodes.filter((node) => node.nodeType === "task");
  const notes = input.childNodes.filter((node) => node.nodeType === "note");
  const decisions = input.childNodes.filter(
    (node) => node.nodeType === "decision"
  );
  const ideas = input.childNodes.filter((node) => node.nodeType === "idea");

  const openTasks = tasks
    .filter((task) => task.status !== "completed" && task.status !== "archived")
    .sort(compareOpenTasks)
    .slice(0, MAX_OPEN_TASKS)
    .map((task) => ({
      id: task.id,
      title: task.title.trim(),
      description: normalizeOptionalText(task.body),
      status: task.status,
      updatedAt: toIsoString(task.updatedAt),
    }));

  const recentTasks = [...tasks]
    .sort(compareByUpdatedAtDesc)
    .slice(0, MAX_RECENT_TASKS)
    .map((task) => ({
      id: task.id,
      title: task.title.trim(),
      description: normalizeOptionalText(task.body),
      status: task.status,
      updatedAt: toIsoString(task.updatedAt),
    }));

  const recentNotes = [...notes]
    .sort(compareByCreatedAtDesc)
    .slice(0, MAX_RECENT_NOTES)
    .map((note) => ({
      id: note.id,
      subject: note.title.trim(),
      content: normalizeOptionalText(note.body),
      taskId: input.noteTaskIdsByNoteId.get(note.id) ?? null,
      createdAt: toIsoString(note.createdAt),
    }));

  const recentDecisions = [...decisions]
    .sort((left, right) =>
      compareByCreatedAtDesc(
        {
          id: left.id,
          createdAt: left.decisionDetails?.decidedAt ?? left.createdAt,
        },
        {
          id: right.id,
          createdAt: right.decisionDetails?.decidedAt ?? right.createdAt,
        }
      )
    )
    .slice(0, MAX_RECENT_DECISIONS)
    .map((decision) => ({
      id: decision.id,
      title: decision.title.trim(),
      rationale: normalizeOptionalText(decision.decisionDetails?.rationale),
      createdAt: toIsoString(decision.decisionDetails?.decidedAt ?? decision.createdAt),
    }));

  const recentIdeas = [...ideas]
    .sort(compareByCreatedAtDesc)
    .slice(0, MAX_RECENT_IDEAS)
    .map((idea) => ({
      id: idea.id,
      title: idea.title.trim(),
      description: normalizeOptionalText(idea.body),
      createdAt: toIsoString(idea.createdAt),
    }));

  return {
    project: {
      id: input.project.id,
      title: input.project.title.trim(),
      description: normalizeOptionalText(input.project.body),
    },
    openTasks,
    recentTasks,
    recentNotes,
    recentDecisions,
    recentIdeas,
  };
}
