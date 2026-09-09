import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ITodoItemRepository } from "../repository.js";
import type { ITodoViews } from "../views.js";

export class RemoveTodoItemByTaskCommand implements ICommand<boolean> {
  static readonly commandType = "todos.removeByTask";
  readonly commandType = RemoveTodoItemByTaskCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly taskNodeId: string
  ) {}
}

export class RemoveTodoItemByTaskCommandHandler
  implements ICommandHandler<RemoveTodoItemByTaskCommand, boolean>
{
  readonly commandType = RemoveTodoItemByTaskCommand.commandType;

  constructor(
    private readonly todos: ITodoItemRepository,
    private readonly todoViews: ITodoViews
  ) {}

  async execute(command: RemoveTodoItemByTaskCommand): Promise<boolean> {
    const existing = await this.todoViews.getByTask(
      command.orgId,
      command.userId,
      command.taskNodeId
    );
    if (!existing || !existing.isActive) return false;

    const entity = await this.todos.get({
      id: existing.id,
      orgId: command.orgId,
    });
    if (!entity) return false;

    entity.remove();
    await this.todos.save(entity);
    return true;
  }
}
