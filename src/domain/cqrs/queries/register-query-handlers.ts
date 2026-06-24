import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { IQueryBus } from "./query-bus.js";
import { ListDecisionsQueryHandler } from "./decisions/index.js";
import { ListIdeasQueryHandler } from "./ideas/index.js";
import { ListNotesQueryHandler } from "./notes/index.js";
import { ListProjectAreasQueryHandler } from "./project-areas/index.js";
import {
  GetProjectQueryHandler,
  ListProjectsQueryHandler,
} from "./projects/index.js";
import { ListResourcesQueryHandler } from "./resources/index.js";
import { ListTasksQueryHandler } from "./tasks/index.js";

export function registerQueryHandlers(
  queryBus: IQueryBus,
  repositories: IPersistenceRepositories
): void {
  queryBus.registerMany([
    new ListDecisionsQueryHandler(repositories.decisions),
    new ListIdeasQueryHandler(repositories.ideas),
    new ListNotesQueryHandler(repositories.notes),
    new ListProjectAreasQueryHandler(repositories.projectAreas),
    new GetProjectQueryHandler(repositories.projects),
    new ListProjectsQueryHandler(repositories.projects),
    new ListResourcesQueryHandler(repositories.resources),
    new ListTasksQueryHandler(repositories.tasks),
  ]);
}
