import type { ICommand, ICommandHandler } from "./command.js";
import { CommandHandlerNotFoundError } from "./command.js";

type AnyCommand = ICommand<unknown>;
type AnyCommandHandler = ICommandHandler<AnyCommand, unknown>;

export interface ICommandBus {
  register<TCommand extends ICommand<TResult>, TResult>(
    handler: ICommandHandler<TCommand, TResult>
  ): void;
  registerMany(handlers: AnyCommandHandler[]): void;
  execute<TCommand extends ICommand<TResult>, TResult>(command: TCommand): Promise<TResult>;
}

export class CommandBus implements ICommandBus {
  private readonly handlers = new Map<string, AnyCommandHandler>();

  register<TCommand extends ICommand<TResult>, TResult>(
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(handler.commandType, handler as AnyCommandHandler);
  }

  registerMany(handlers: AnyCommandHandler[]): void {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  async execute<TCommand extends ICommand<TResult>, TResult>(
    command: TCommand
  ): Promise<TResult> {
    const handler = this.handlers.get(command.commandType);
    if (!handler) {
      throw new CommandHandlerNotFoundError(command.commandType);
    }

    return handler.execute(command as AnyCommand) as Promise<TResult>;
  }
}
