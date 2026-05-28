import type { Server } from "node:http";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  CommandBus,
  registerCommandHandlers,
  type ICommandBus,
} from "./domain/cqrs/commands/index.js";
import {
  QueryBus,
  registerQueryHandlers,
  type IQueryBus,
} from "./domain/cqrs/queries/index.js";
import { prisma as defaultPrisma } from "./lib/prisma.js";
import {
  createPersistenceRepositories,
  type IPersistenceRepositories,
} from "./infra/persistence/index.js";
import { createHttpApp } from "./infra/http/index.js";

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
  const services: IBackendServices = {
    commandBus: overrides.commandBus ?? new CommandBus(),
    queryBus: overrides.queryBus ?? new QueryBus(),
    repositories:
      overrides.repositories ?? createPersistenceRepositories(prisma),
    prisma,
  };
  registerQueryHandlers(services.queryBus, services.repositories);
  registerCommandHandlers(services.commandBus, services.repositories);

  const app =
    overrides.app ??
    createHttpApp({
      apiPrefix: config.apiPrefix,
      commandBus: services.commandBus,
      queryBus: services.queryBus,
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
