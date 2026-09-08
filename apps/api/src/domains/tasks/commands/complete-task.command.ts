import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ITaskRepository } from "../repository.js";
import type { ITaskListItem, ITaskViews } from "../views.js";

export class CompleteTaskCommand implements ICommand<ITaskListItem | null> {
  static readonly commandType = "tasks.complete";
  readonly commandType = CompleteTaskCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly taskId: string
  ) {}
}

export class CompleteTaskCommandHandler
  implements ICommandHandler<CompleteTaskCommand, ITaskListItem | null>
{
  readonly commandType = CompleteTaskCommand.commandType;

  constructor(
    private readonly tasks: ITaskRepository,
    private readonly taskViews: ITaskViews
  ) {}

  async execute(command: CompleteTaskCommand): Promise<ITaskListItem | null> {
    const existing = await this.tasks.get({
      id: command.taskId,
      orgId: command.orgId,
    });
    if (!existing || existing.isDeleted) return null;

    existing.complete();
    await this.tasks.save(existing, { strategy: "complete" });

    return this.taskViews.getListItem(command.orgId, command.taskId);
  }
}
