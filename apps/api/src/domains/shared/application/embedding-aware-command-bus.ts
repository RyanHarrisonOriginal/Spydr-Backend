import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";
import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import {
  tryEnqueueProjectEmbeddings,
  type ProjectEmbeddingEnqueueFn,
} from "../../../infra/jobs/project-embedding-enqueue.js";
import type { ICommand, ICommandHandler } from "./command.js";
import { CommandBus, type ICommandBus } from "./command-bus.js";
import {
  collectPreMutationProjectIds,
  isProjectEmbeddingTrackedCommand,
  resolveProjectEmbeddingRefreshIds,
} from "../../projects/embedding/resolve-project-embedding-refresh-ids.js";

const projectEmbeddingRefreshScope = new AsyncLocalStorage<{
  suppress: boolean;
}>();

/** Run work without enqueueing project embedding refreshes (e.g. active-note apply). */
export function withoutProjectEmbeddingRefresh<T>(
  fn: () => Promise<T>
): Promise<T> {
  return projectEmbeddingRefreshScope.run({ suppress: true }, fn);
}

function isProjectEmbeddingRefreshSuppressed(): boolean {
  return projectEmbeddingRefreshScope.getStore()?.suppress === true;
}

export interface EmbeddingAwareCommandBusOptions {
  inner?: ICommandBus;
  repositories: IPersistenceRepositories;
  prisma: PrismaClient;
  enqueue?: ProjectEmbeddingEnqueueFn;
}

export class EmbeddingAwareCommandBus implements ICommandBus {
  private readonly inner: ICommandBus;

  constructor(private readonly options: EmbeddingAwareCommandBusOptions) {
    this.inner = options.inner ?? new CommandBus();
  }

  register<TCommand extends ICommand<TResult>, TResult>(
    handler: ICommandHandler<TCommand, TResult>
  ): void {
    this.inner.register(handler);
  }

  registerMany(handlers: ICommandHandler<ICommand<unknown>, unknown>[]): void {
    this.inner.registerMany(handlers);
  }

  async execute<TCommand extends ICommand<TResult>, TResult>(
    command: TCommand
  ): Promise<TResult> {
    if (isProjectEmbeddingRefreshSuppressed()) {
      return this.inner.execute<TCommand, TResult>(command);
    }

    const preMutationProjectIds = isProjectEmbeddingTrackedCommand(command)
      ? await collectPreMutationProjectIds(
          command,
          this.options.repositories,
          this.options.prisma
        )
      : [];

    const result = await this.inner.execute<TCommand, TResult>(command);

    if (isProjectEmbeddingTrackedCommand(command)) {
      const projectIds = await resolveProjectEmbeddingRefreshIds({
        command,
        result,
        repositories: this.options.repositories,
        prisma: this.options.prisma,
        preMutationProjectIds,
      });

      if (projectIds.length > 0) {
        // Do not block the HTTP mutation on pg-boss. A hung queue
        // connection was stalling Active Note apply after the first write.
        void tryEnqueueProjectEmbeddings(
          projectIds,
          this.options.enqueue
        );
      }
    }

    return result;
  }
}
