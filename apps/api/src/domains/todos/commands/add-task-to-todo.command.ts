import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ITaskRepository } from "../../tasks/repository.js";
import type { ITodoItemRepository } from "../repository.js";
import type { ITodoListItem, ITodoViews } from "../views.js";
import { TodoItemMapper, type ITodoItemCreateInput } from "../mappers/index.js";

export class AddTaskToTodoCommand implements ICommand<ITodoListItem | null> {
  static readonly commandType = "todos.addTask";
  readonly commandType = AddTaskToTodoCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ITodoItemCreateInput
  ) {}
}

export class AddTaskToTodoCommandHandler
  implements ICommandHandler<AddTaskToTodoCommand, ITodoListItem | null>
{
  readonly commandType = AddTaskToTodoCommand.commandType;

  constructor(
    private readonly todos: ITodoItemRepository,
    private readonly todoViews: ITodoViews,
    private readonly tasks: ITaskRepository,
    private readonly mapper = new TodoItemMapper()
  ) {}

  async execute(command: AddTaskToTodoCommand): Promise<ITodoListItem | null> {
    const task = await this.tasks.get({
      id: command.input.taskNodeId,
      orgId: command.orgId,
    });
    if (!task || task.isDeleted) return null;

    const source = this.mapper.normalizeSource(command.input.source);
    const existing = await this.todoViews.getByTask(
      command.orgId,
      command.userId,
      command.input.taskNodeId
    );

    if (existing) {
      if (existing.isActive) {
        return this.todoViews.getListItem(
          command.orgId,
          command.userId,
          existing.id
        );
      }

      const entity = await this.todos.get({
        id: existing.id,
        orgId: command.orgId,
      });
      if (!entity) return null;

      entity.reactivate(source);
      await this.todos.save(entity);
      return this.todoViews.getListItem(command.orgId, command.userId, entity.id);
    }

    const created = this.mapper.toModel(
      { ...command.input, source },
      { orgId: command.orgId, userId: command.userId }
    );
    await this.todos.save(created);
    return this.todoViews.getListItem(command.orgId, command.userId, created.id);
  }
}
