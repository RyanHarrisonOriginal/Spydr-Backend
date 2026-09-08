import type { IProjectRepository } from "../../projects/repository.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { TaskMapper } from "../../tasks/mappers/index.js";
import type { TaskNode } from "../../tasks/models/index.js";
import {
  type TaskStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IAddTaskToProjectInput {
  title: string;
  body?: string;
  status?: TaskStatus;
  priority?: SpydrPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
}

export class AddTaskToProjectCommand implements ICommand<TaskNode | null> {
  static readonly commandType = "projects.tasks.add";
  readonly commandType = AddTaskToProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly input: IAddTaskToProjectInput
  ) {}
}

export class AddTaskToProjectCommandHandler
  implements ICommandHandler<AddTaskToProjectCommand, TaskNode | null>
{
  readonly commandType = AddTaskToProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly people: IPersonRepository,
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new TaskMapper()
  ) {}

  async execute(command: AddTaskToProjectCommand): Promise<TaskNode | null> {
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project) return null;

    let assignee = null;
    if (command.input.assigneePersonNodeId) {
      assignee = await this.people.get({
        id: command.input.assigneePersonNodeId,
        orgId: command.orgId,
      });
      if (!assignee) {
        throw new Error("Person not found");
      }
    }

    const sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "task"
    );
    const task = this.mapper.toModel(command.input, {
      userId: command.userId,
      orgId: command.orgId,
      area: project.area,
      sortOrder,
    });
    project.addTask(task);

    await this.projects.save(project);
    return assignee ? task.withAssignee(assignee) : task;
  }
}
