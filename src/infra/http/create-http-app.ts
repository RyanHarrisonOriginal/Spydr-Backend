import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { requireAuthApi } from "../../middleware/auth.js";
import { createRequireOrgContext } from "../../middleware/org-context.js";
import type { IOrganizationRepository } from "../../domain/interfaces/organization-repository.js";
import type { ICommandBus } from "../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../domain/cqrs/queries/index.js";
import { createDecisionsRouter } from "./routes/decisions.router.js";
import { createIdeasRouter } from "./routes/ideas.router.js";
import { createNotesRouter } from "./routes/notes.router.js";
import { createOrganizationsRouter } from "./routes/organizations.router.js";
import { createPeopleRouter } from "./routes/people.router.js";
import { createProjectAreasRouter } from "./routes/project-areas.router.js";
import { createProjectsRouter } from "./routes/projects.router.js";
import { createResourcesRouter } from "./routes/resources.router.js";
import { createDashboardRouter } from "./routes/dashboard.router.js";
import { createTasksRouter } from "./routes/tasks.router.js";
import { createCollectionsRouter } from "./routes/collections.router.js";

export interface IHttpAppOptions {
  apiPrefix?: string;
  commandBus: ICommandBus;
  queryBus: IQueryBus;
  organizations: IOrganizationRepository;
}

export function createHttpApp(options: IHttpAppOptions): Express {
  const apiPrefix = options.apiPrefix ?? "/api";
  const requireOrgContext = createRequireOrgContext(options.organizations);
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(clerkMiddleware());

  app.use(apiPrefix, requireAuthApi);
  app.use(
    `${apiPrefix}/organizations`,
    createOrganizationsRouter(options.queryBus, options.commandBus)
  );

  app.use(apiPrefix, requireOrgContext);
  app.use(`${apiPrefix}/decisions`, createDecisionsRouter(options.queryBus, options.commandBus));
  app.use(`${apiPrefix}/ideas`, createIdeasRouter(options.queryBus, options.commandBus));
  app.use(`${apiPrefix}/notes`, createNotesRouter(options.queryBus, options.commandBus));
  app.use(
    `${apiPrefix}/people`,
    createPeopleRouter(options.queryBus, options.commandBus)
  );
  app.use(
    `${apiPrefix}/project-areas`,
    createProjectAreasRouter(options.queryBus, options.commandBus)
  );
  app.use(
    `${apiPrefix}/projects`,
    createProjectsRouter(options.queryBus, options.commandBus)
  );
  app.use(`${apiPrefix}/resources`, createResourcesRouter(options.queryBus));
  app.use(`${apiPrefix}/dashboard`, createDashboardRouter(options.queryBus));
  app.use(`${apiPrefix}/tasks`, createTasksRouter(options.queryBus, options.commandBus));
  app.use(`${apiPrefix}/collections`, createCollectionsRouter(options.commandBus));

  return app;
}
