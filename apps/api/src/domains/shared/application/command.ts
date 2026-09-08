export interface ICommand<TResult = unknown> {
  readonly commandType: string;
}

export interface ICommandHandler<TCommand extends ICommand<TResult>, TResult = unknown> {
  readonly commandType: TCommand["commandType"] | string;
  execute(command: TCommand): Promise<TResult> | TResult;
}

export class CommandHandlerNotFoundError extends Error {
  constructor(commandType: string) {
    super(`No command handler registered for "${commandType}"`);
    this.name = "CommandHandlerNotFoundError";
  }
}
