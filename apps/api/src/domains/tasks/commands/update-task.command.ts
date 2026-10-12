import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IProjectRepository } from "../../projects/repository.js";
import type { ITaskUpdateModelInput } from "../mappers/index.js";
import { parseTaskFollowUpAt, type ITaskUpdateInput } from "../models/index.js";
import type { TaskNode } from "../models/index.js";
import type { ITaskRepository } from "../repository.js";
import type { ITaskListItem, ITaskViews } from "../views.js";

export interface IUpdateTaskInput extends ITaskUpdateModelInput {
  projectNodeId?: string | null;
}

function hasTaskFieldUpdates(input: ITaskUpdateModelInput): boolean {
  return (
    input.title !== undefined ||
    input.body !== undefined ||
    input.status !== undefined ||
    input.priority !== undefined ||
    input.dueDate !== undefined ||
    input.estimatedMinutes !== undefined ||
    input.assigneePersonNodeId !== undefined ||
    input.emoji !== undefined ||
    input.blockedByNodeId !== undefined ||
    input.followUpAt !== undefined ||
    input.waitingNote !== undefined
  );
}

export async function assertBlockingTask(
  tasks: ITaskRepository,
  orgId: string,
  taskId: string | null,
  blockedByNodeId: string | null | undefined
): Promise<TaskNode | null> {
  if (!blockedByNodeId) return null;
  if (taskId && blockedByNodeId === taskId) {
    throw new Error("Invalid task status: a task cannot block itself");
  }
  const blocker = await tasks.get({ id: blockedByNodeId, orgId });
  if (!blocker || blocker.isDeleted) {
    throw new Error("Invalid blocking task");
  }
  return blocker;
}

function parseTaskDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid task date");
  }

  return date;
}

function toDomainUpdateInput(input: ITaskUpdateModelInput): ITaskUpdateInput {
  return {
    title: input.title,
    body: input.body,
    status: input.status,
    priority: input.priority,
    estimatedMinutes: input.estimatedMinutes,
    assigneePersonNodeId: input.assigneePersonNodeId,
    emoji: input.emoji,
    blockedByNodeId: input.blockedByNodeId,
    waitingNote: input.waitingNote,
    dueDate:
      input.dueDate !== undefined ? parseTaskDueDate(input.dueDate) : undefined,
    followUpAt:
      input.followUpAt !== undefined
        ? parseTaskFollowUpAt(input.followUpAt)
        : undefined,
  };
}

export class UpdateTaskCommand implements ICommand<ITaskListItem | null> {
  static readonly commandType = "tasks.update";
  readonly commandType = UpdateTaskCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly taskId: string,
    readonly input: IUpdateTaskInput
  ) {}
}

export class UpdateTaskCommandHandler
  implements ICommandHandler<UpdateTaskCommand, ITaskListItem | null>
{
  readonly commandType = UpdateTaskCommand.commandType;

  constructor(
    private readonly tasks: ITaskRepository,
    private readonly people: IPersonRepository,
    private readonly taskViews: ITaskViews,
    private readonly projects: IProjectRepository
  ) {}

  async execute(command: UpdateTaskCommand): Promise<ITaskListItem | null> {
    const { projectNodeId, ...taskInput } = command.input;

    const existing = await this.tasks.get({
      id: command.taskId,
      orgId: command.orgId,
    });
    if (!existing || existing.isDeleted) return null;

    if (taskInput.assigneePersonNodeId) {
      const person = await this.people.get({
        id: taskInput.assigneePersonNodeId,
        orgId: command.orgId,
      });
      if (!person) {
        throw new Error("Person not found");
      }
    }

    await assertBlockingTask(
      this.tasks,
      command.orgId,
      command.taskId,
      taskInput.blockedByNodeId
    );

    const dueDateChanging = taskInput.dueDate !== undefined;
    const projectChanging = projectNodeId !== undefined;
    if (dueDateChanging || projectChanging) {
      const nextDueDate = dueDateChanging
        ? parseTaskDueDate(taskInput.dueDate)
        : existing.details?.dueDate ?? null;
      const project = await this.resolveConstraintProject(
        command.orgId,
        command.taskId,
        projectNodeId
      );
      project?.assertTaskDueDateAllowed(nextDueDate);
    }

    if (hasTaskFieldUpdates(taskInput)) {
      existing.applyUpdate(toDomainUpdateInput(taskInput));
      await this.tasks.save(existing);
    }

    if (projectNodeId !== undefined) {
      await this.tasks.save(existing, {
        strategy: "assignProject",
        context: { orgId: command.orgId, projectId: projectNodeId },
      });
    }

    return this.taskViews.getListItem(command.orgId, command.taskId);
  }

  private async resolveConstraintProject(
    orgId: string,
    taskId: string,
    projectNodeId: string | null | undefined
  ) {
    const projectId =
      projectNodeId === undefined
        ? (await this.taskViews.getListItem(orgId, taskId))?.project?.id ?? null
        : projectNodeId;
    if (!projectId) return null;

    return this.projects.get({ id: projectId, orgId });
  }
}
