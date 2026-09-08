import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ITaskRepository } from "../repository.js";

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
    const task = await this.tasks.get({
      id: command.taskId,
      orgId: command.orgId,
    });
    if (!task || task.isDeleted) return false;

    task.softDelete();
    await this.tasks.delete(task.id);
    return true;
  }
}
