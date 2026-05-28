import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { requireAuthApi } from "../../middleware/auth.js";
import { nodeTypesRouter } from "../../routes/node-types.js";
import { nodeRouter } from "../../routes/nodes.js";
import { ontologyRouter } from "../../routes/ontology.js";
import type { ICommandBus } from "../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../domain/cqrs/queries/index.js";
import { createDecisionsRouter } from "./routes/decisions.router.js";
import { createNotesRouter } from "./routes/notes.router.js";
import { createProjectsRouter } from "./routes/projects.router.js";
import { createResourcesRouter } from "./routes/resources.router.js";
import { createTasksRouter } from "./routes/tasks.router.js";

export interface IHttpAppOptions {
  apiPrefix?: string;
  commandBus: ICommandBus;
  queryBus: IQueryBus;
}

export function createHttpApp(options: IHttpAppOptions): Express {
  const apiPrefix = options.apiPrefix ?? "/api";
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(clerkMiddleware());

  app.use(apiPrefix, requireAuthApi);
  app.use(`${apiPrefix}/ontologies`, nodeRouter);
  app.use(`${apiPrefix}/ontologies`, ontologyRouter);
  app.use(`${apiPrefix}/node-types`, nodeTypesRouter);
  app.use(`${apiPrefix}/decisions`, createDecisionsRouter(options.queryBus));
  app.use(`${apiPrefix}/notes`, createNotesRouter(options.queryBus));
  app.use(
    `${apiPrefix}/projects`,
    createProjectsRouter(options.queryBus, options.commandBus)
  );
  app.use(`${apiPrefix}/resources`, createResourcesRouter(options.queryBus));
  app.use(`${apiPrefix}/tasks`, createTasksRouter(options.queryBus));

  return app;
}
