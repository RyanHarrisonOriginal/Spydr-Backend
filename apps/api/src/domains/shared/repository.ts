export interface IGetCriteria {
  id: string;
  orgId?: string;
  includeDeleted?: boolean;
}

export interface ISaveOptions<TContext = unknown> {
  /** Defaults to `"standard"`. */
  strategy?: string;
  context?: TContext;
}

/**
 * Write repository contract. Only get / save / delete are allowed.
 * List and projection reads belong on domain view ports.
 * Specialized persistence belongs in save strategies.
 */
export interface IRepository<TEntity> {
  get(criteria: IGetCriteria): Promise<TEntity | null>;
  save(entity: TEntity, options?: ISaveOptions): Promise<TEntity>;
  delete(id: string): Promise<void>;
}
