import type { IQuery, IQueryHandler } from "./query.js";
import { QueryHandlerNotFoundError } from "./query.js";

type AnyQuery = IQuery<unknown>;
type AnyQueryHandler = IQueryHandler<AnyQuery, unknown>;

export interface IQueryBus {
  register<TQuery extends IQuery<TResult>, TResult>(
    handler: IQueryHandler<TQuery, TResult>
  ): void;
  registerMany(handlers: AnyQueryHandler[]): void;
  execute<TQuery extends IQuery<TResult>, TResult>(query: TQuery): Promise<TResult>;
}

export class QueryBus implements IQueryBus {
  private readonly handlers = new Map<string, AnyQueryHandler>();

  register<TQuery extends IQuery<TResult>, TResult>(
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(handler.queryType, handler as AnyQueryHandler);
  }

  registerMany(handlers: AnyQueryHandler[]): void {
    for (const handler of handlers) {
      this.register(handler);
    }
  }

  async execute<TQuery extends IQuery<TResult>, TResult>(query: TQuery): Promise<TResult> {
    const handler = this.handlers.get(query.queryType);
    if (!handler) {
      throw new QueryHandlerNotFoundError(query.queryType);
    }

    return handler.execute(query as AnyQuery) as Promise<TResult>;
  }
}
