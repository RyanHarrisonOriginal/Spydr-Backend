import type { PrismaClient } from "@prisma/client";
import type { IPersistenceRepositories } from "../../../../infra/persistence/index.js";
import { findProjectIdForChildNode } from "../../../../infra/persistence/prisma/find-project-for-child-node.js";
import type { ICommand } from "../command.js";
import { CreateProjectCommand } from "../projects/create-project.command.js";
import {
  UpdateProjectCommand,
  type IUpdateProjectInput,
} from "../projects/update-project.command.js";
import {
  AddDecisionToProjectCommand,
  AddIdeaToProjectCommand,
  AddNoteToProjectCommand,
  AddTaskToProjectCommand,
} from "../projects/index.js";
import {
  DeleteProjectChildCommand,
  UpdateProjectChildCommand,
  type ProjectChildKind,
} from "../projects/project-child.commands.js";
import { UpdateTaskCommand } from "../tasks/update-task.command.js";
import { DeleteTaskCommand } from "../tasks/delete-task.command.js";
import { UpdateNoteCommand } from "../notes/update-note.command.js";
import { DeleteNoteCommand } from "../notes/delete-note.command.js";
import { DeleteIdeaCommand } from "../ideas/delete-idea.command.js";
import { DeleteDecisionCommand } from "../decisions/delete-decision.command.js";
import type { ITaskListItem } from "../../../interfaces/task-repository.js";
import type { INoteListItem } from "../../../interfaces/note-repository.js";
import type { ProjectNode } from "../../../models/projects/index.js";

const RETRIEVAL_CHILD_KINDS = new Set<ProjectChildKind>([
  "task",
  "note",
  "decision",
  "idea",
]);

export interface ProjectEmbeddingRefreshContext {
  command: ICommand<unknown>;
  result: unknown;
  repositories: IPersistenceRepositories;
  prisma: PrismaClient;
  preMutationProjectIds?: readonly string[];
}

function uniqueProjectIds(projectIds: Iterable<string | null | undefined>): string[] {
  return [...new Set([...projectIds].filter((id): id is string => Boolean(id)))];
}

export function projectUpdateAffectsRetrievalContext(
  input: IUpdateProjectInput
): boolean {
  return input.title !== undefined || input.body !== undefined;
}

export async function collectPreMutationProjectIds(
  command: ICommand<unknown>,
  repositories: IPersistenceRepositories,
  prisma: PrismaClient
): Promise<string[]> {
  if (command instanceof UpdateTaskCommand) {
    if (command.input.projectNodeId === undefined) {
      return [];
    }

    const item = await repositories.tasks.getListItemForOrg(
      command.orgId,
      command.taskId
    );
    return uniqueProjectIds([item?.project?.id]);
  }

  if (command instanceof DeleteTaskCommand) {
    const item = await repositories.tasks.getListItemForOrg(
      command.orgId,
      command.taskId
    );
    return uniqueProjectIds([item?.project?.id]);
  }

  if (command instanceof DeleteNoteCommand) {
    const item = await repositories.notes.getListItemForOrg(
      command.orgId,
      command.noteId
    );
    return uniqueProjectIds([item?.project?.id]);
  }

  if (command instanceof DeleteIdeaCommand) {
    const projectId = await findProjectIdForChildNode(
      prisma,
      command.orgId,
      command.ideaId
    );
    return uniqueProjectIds([projectId]);
  }

  if (command instanceof DeleteDecisionCommand) {
    const projectId = await findProjectIdForChildNode(
      prisma,
      command.orgId,
      command.decisionId
    );
    return uniqueProjectIds([projectId]);
  }

  return [];
}

export async function resolveProjectEmbeddingRefreshIds(
  context: ProjectEmbeddingRefreshContext
): Promise<string[]> {
  const { command, result, repositories, prisma } = context;
  const preMutationProjectIds =
    context.preMutationProjectIds ??
    (await collectPreMutationProjectIds(command, repositories, prisma));

  if (command instanceof CreateProjectCommand) {
    const project = result as ProjectNode;
    return uniqueProjectIds([project?.id]);
  }

  if (command instanceof UpdateProjectCommand) {
    if (result === null || !projectUpdateAffectsRetrievalContext(command.input)) {
      return [];
    }

    return uniqueProjectIds([command.projectId]);
  }

  if (
    command instanceof AddTaskToProjectCommand ||
    command instanceof AddNoteToProjectCommand ||
    command instanceof AddDecisionToProjectCommand ||
    command instanceof AddIdeaToProjectCommand
  ) {
    if (result === null) {
      return [];
    }

    return uniqueProjectIds([command.projectId]);
  }

  if (command instanceof UpdateProjectChildCommand) {
    if (result === null || !RETRIEVAL_CHILD_KINDS.has(command.kind)) {
      return [];
    }

    return uniqueProjectIds([command.projectId]);
  }

  if (command instanceof DeleteProjectChildCommand) {
    if (result === null || !RETRIEVAL_CHILD_KINDS.has(command.kind)) {
      return [];
    }

    return uniqueProjectIds([command.projectId]);
  }

  if (command instanceof UpdateTaskCommand) {
    if (result === null) {
      return [];
    }

    const item = result as ITaskListItem;
    return uniqueProjectIds([...preMutationProjectIds, item.project?.id]);
  }

  if (command instanceof UpdateNoteCommand) {
    if (result === null) {
      return [];
    }

    const item = result as INoteListItem;
    return uniqueProjectIds([item.project?.id]);
  }

  if (
    command instanceof DeleteTaskCommand ||
    command instanceof DeleteNoteCommand ||
    command instanceof DeleteIdeaCommand ||
    command instanceof DeleteDecisionCommand
  ) {
    if (result !== true) {
      return [];
    }

    return uniqueProjectIds(preMutationProjectIds);
  }

  return [];
}

export function isProjectEmbeddingTrackedCommand(
  command: ICommand<unknown>
): boolean {
  return (
    command instanceof CreateProjectCommand ||
    command instanceof UpdateProjectCommand ||
    command instanceof AddTaskToProjectCommand ||
    command instanceof AddNoteToProjectCommand ||
    command instanceof AddDecisionToProjectCommand ||
    command instanceof AddIdeaToProjectCommand ||
    command instanceof UpdateProjectChildCommand ||
    command instanceof DeleteProjectChildCommand ||
    command instanceof UpdateTaskCommand ||
    command instanceof DeleteTaskCommand ||
    command instanceof UpdateNoteCommand ||
    command instanceof DeleteNoteCommand ||
    command instanceof DeleteIdeaCommand ||
    command instanceof DeleteDecisionCommand
  );
}
