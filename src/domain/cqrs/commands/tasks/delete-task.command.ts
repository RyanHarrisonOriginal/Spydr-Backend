import type { ITaskRepository } from "../../../interfaces/task-repository.js";
import type { ICommand, ICommandHandler } from "../command.js";

export class DeleteTaskCommand implements ICommand<boolean> {
  static readonly commandType = "tasks.delete";
  readonly commandType = DeleteTaskCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly taskId: string
  ) {}
}

export class DeleteTaskCommandHandler
  implements ICommandHandler<DeleteTaskCommand, boolean>
{
  readonly commandType = DeleteTaskCommand.commandType;

  constructor(private readonly tasks: ITaskRepository) {}

  async execute(command: DeleteTaskCommand): Promise<boolean> {
    const task = await this.tasks.findByIdForOrg(command.taskId, command.orgId);
    if (!task || task.isDeleted) return false;

    await this.tasks.delete(task.id);
    return true;
  }
}
