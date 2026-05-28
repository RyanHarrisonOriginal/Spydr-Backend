export interface IQuery<TResult = unknown> {
  readonly queryType: string;
}

export interface IQueryHandler<TQuery extends IQuery<TResult>, TResult = unknown> {
  readonly queryType: TQuery["queryType"] | string;
  execute(query: TQuery): Promise<TResult> | TResult;
}

export class QueryHandlerNotFoundError extends Error {
  constructor(queryType: string) {
    super(`No query handler registered for "${queryType}"`);
    this.name = "QueryHandlerNotFoundError";
  }
}
