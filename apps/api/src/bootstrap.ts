import type { Server } from "node:http";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@spydr/db";
import { ACTIVE_NOTE_PROMPT_VERSION } from "@spydr/active-notes";
import {
  EmbeddingAwareCommandBus,
  registerCommandHandlers,
  type ICommandBus,
} from "./domains/shared/application/index.js";
import {
  QueryBus,
  registerQueryHandlers,
  type IQueryBus,
} from "./domains/shared/application/index.js";
import {
  createPersistenceRepositories,
  type IPersistenceRepositories,
} from "./infra/persistence/index.js";
import { createHttpApp } from "./infra/http/index.js";
import { enqueueActiveNoteAnalyze as defaultEnqueueActiveNoteAnalyze } from "./infra/jobs/active-note-analyze.producer.js";

export interface IBackendConfig {
  apiPrefix: string;
  port: string | number;
}

export interface IBackendServices {
  commandBus: ICommandBus;
  queryBus: IQueryBus;
  repositories: IPersistenceRepositories;
  prisma: PrismaClient;
}

export interface IBackend {
  app: Express;
  config: IBackendConfig;
  services: IBackendServices;
  start(): Promise<Server>;
  stop(): Promise<void>;
}

export interface IBackendOverrides {
  app?: Express;
  commandBus?: ICommandBus;
  queryBus?: IQueryBus;
  config?: Partial<IBackendConfig>;
  prisma?: PrismaClient;
  repositories?: IPersistenceRepositories;
  enqueueActiveNoteAnalyze?: (sessionId: string) => Promise<void>;
  activeNotePromptVersion?: string | null;
}

export function resolveBackendConfig(
  overrides: Partial<IBackendConfig> = {}
): IBackendConfig {
  return {
    apiPrefix: overrides.apiPrefix ?? "/api",
    port: overrides.port ?? process.env.PORT ?? 3001,
  };
}

export function createBackend(overrides: IBackendOverrides = {}): IBackend {
  const config = resolveBackendConfig(overrides.config);
  const prisma = overrides.prisma ?? defaultPrisma;
  const repositories =
    overrides.repositories ?? createPersistenceRepositories(prisma);
  const services: IBackendServices = {
    commandBus:
      overrides.commandBus ??
      new EmbeddingAwareCommandBus({ repositories, prisma }),
    queryBus: overrides.queryBus ?? new QueryBus(),
    repositories,
    prisma,
  };
  registerQueryHandlers(services.queryBus, services.repositories, {
    enqueueActiveNoteAnalyze:
      overrides.enqueueActiveNoteAnalyze ?? defaultEnqueueActiveNoteAnalyze,
    activeNotePromptVersion:
      overrides.activeNotePromptVersion ?? ACTIVE_NOTE_PROMPT_VERSION,
  });
  registerCommandHandlers(services.commandBus, services.repositories);

  const app =
    overrides.app ??
    createHttpApp({
      apiPrefix: config.apiPrefix,
      commandBus: services.commandBus,
      queryBus: services.queryBus,
      organizationViews: services.repositories.organizationViews,
    });
  let server: Server | undefined;

  return {
    app,
    config,
    services,
    start: () =>
      new Promise<Server>((resolve, reject) => {
        server = app
          .listen(config.port, () => {
            console.log(`Server listening on http://localhost:${config.port}`);
            resolve(server as Server);
          })
          .once("error", reject);
      }),
    stop: async () => {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => (error ? reject(error) : resolve()));
        });
      }

      await prisma.$disconnect();
    },
  };
}
