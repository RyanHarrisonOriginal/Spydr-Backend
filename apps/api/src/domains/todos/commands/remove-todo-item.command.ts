import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ITodoItemRepository } from "../repository.js";

export class RemoveTodoItemCommand implements ICommand<boolean> {
  static readonly commandType = "todos.remove";
  readonly commandType = RemoveTodoItemCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly todoId: string
  ) {}
}

export class RemoveTodoItemCommandHandler
  implements ICommandHandler<RemoveTodoItemCommand, boolean>
{
  readonly commandType = RemoveTodoItemCommand.commandType;

  constructor(private readonly todos: ITodoItemRepository) {}

  async execute(command: RemoveTodoItemCommand): Promise<boolean> {
    const existing = await this.todos.get({
      id: command.todoId,
      orgId: command.orgId,
    });
    if (!existing || existing.userId !== command.userId) return false;
    if (!existing.isActive) return true;

    existing.remove();
    await this.todos.save(existing);
    return true;
  }
}
