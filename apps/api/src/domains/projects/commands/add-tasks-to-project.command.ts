import type { IProjectRepository } from "../../projects/repository.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { PersonNode } from "../../people/models/index.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { TaskMapper } from "../../tasks/mappers/index.js";
import type { TaskNode } from "../../tasks/models/index.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IAddTaskToProjectInput } from "./add-task-to-project.command.js";

export class AddTasksToProjectCommand implements ICommand<TaskNode[] | null> {
  static readonly commandType = "projects.tasks.addMany";
  readonly commandType = AddTasksToProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly tasks: readonly IAddTaskToProjectInput[]
  ) {}
}

export class AddTasksToProjectCommandHandler
  implements ICommandHandler<AddTasksToProjectCommand, TaskNode[] | null>
{
  readonly commandType = AddTasksToProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly people: IPersonRepository,
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new TaskMapper()
  ) {}

  async execute(command: AddTasksToProjectCommand): Promise<TaskNode[] | null> {
    if (command.tasks.length === 0) {
      throw new Error("At least one task is required");
    }

    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project) return null;

    const assignees = new Map<string, PersonNode>();
    let sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "task"
    );
    const created: TaskNode[] = [];

    for (const input of command.tasks) {
      const assignee = await this.resolveAssignee(
        command.orgId,
        input.assigneePersonNodeId,
        assignees
      );
      const task = this.mapper.toModel(input, {
        userId: command.userId,
        orgId: command.orgId,
        area: project.area,
        sortOrder,
      });
      project.addTask(task);
      created.push(assignee ? task.withAssignee(assignee) : task);
      sortOrder += 1000;
    }

    await this.projects.save(project);
    return created;
  }

  private async resolveAssignee(
    orgId: string,
    personNodeId: string | null | undefined,
    assignees: Map<string, PersonNode>
  ): Promise<PersonNode | null> {
    if (!personNodeId) return null;

    const cached = assignees.get(personNodeId);
    if (cached) return cached;

    const person = await this.people.get({ id: personNodeId, orgId });
    if (!person) {
      throw new Error("Person not found");
    }

    assignees.set(personNodeId, person);
    return person;
  }
}
