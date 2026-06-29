import type { ICommand, ICommandHandler } from "../command.js";
import type {
  ITaskListItem,
  ITaskRepository,
} from "../../../interfaces/task-repository.js";
import type { ITaskUpdateModelInput } from "../../../mappers/tasks/index.js";

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
    input.estimatedMinutes !== undefined
  );
}

export class UpdateTaskCommand implements ICommand<ITaskListItem | null> {
  static readonly commandType = "tasks.update";
  readonly commandType = UpdateTaskCommand.commandType;

  constructor(
    readonly userId: string,
    readonly taskId: string,
    readonly input: IUpdateTaskInput
  ) {}
}

export class UpdateTaskCommandHandler
  implements ICommandHandler<UpdateTaskCommand, ITaskListItem | null>
{
  readonly commandType = UpdateTaskCommand.commandType;

  constructor(private readonly tasks: ITaskRepository) {}

  async execute(command: UpdateTaskCommand): Promise<ITaskListItem | null> {
    const { projectNodeId, ...taskInput } = command.input;

    if (hasTaskFieldUpdates(taskInput)) {
      const updated = await this.tasks.updateForUser(
        command.userId,
        command.taskId,
        taskInput
      );
      if (!updated) return null;
    } else {
      const existing = await this.tasks.findByIdForUser(
        command.taskId,
        command.userId
      );
      if (!existing || existing.isDeleted) return null;
    }

    if (projectNodeId !== undefined) {
      return this.tasks.assignToProject(
        command.userId,
        command.taskId,
        projectNodeId
      );
    }

    return this.tasks.getListItemForUser(command.userId, command.taskId);
  }
}
