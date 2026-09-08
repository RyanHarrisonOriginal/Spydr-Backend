import type { PrismaClient } from "@prisma/client";

/**
 * Persistence strategy for repository.save.
 * Use only when the standard upsert of entity + details is insufficient.
 */
export interface ISaveStrategy<TEntity, TContext = unknown> {
  readonly key: string;
  save(
    entity: TEntity,
    context: TContext | undefined,
    db: PrismaClient
  ): Promise<TEntity>;
}

export class SaveStrategyNotFoundError extends Error {
  constructor(strategyKey: string) {
    super(`No save strategy registered for "${strategyKey}"`);
    this.name = "SaveStrategyNotFoundError";
  }
}

export function resolveSaveStrategy<TEntity, TContext = unknown>(
  strategies: ReadonlyMap<string, ISaveStrategy<TEntity, TContext>>,
  key = "standard"
): ISaveStrategy<TEntity, TContext> {
  const strategy = strategies.get(key);
  if (!strategy) {
    throw new SaveStrategyNotFoundError(key);
  }
  return strategy;
}
