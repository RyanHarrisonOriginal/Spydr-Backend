import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { IQueryBus } from "./query-bus.js";
import { ListDecisionsQueryHandler } from "./decisions/index.js";
import { ListIdeasQueryHandler } from "./ideas/index.js";
import { ListNotesQueryHandler } from "./notes/index.js";
import { ListProjectAreasQueryHandler } from "./project-areas/index.js";
import {
  GetPersonQueryHandler,
  ListPeopleQueryHandler,
} from "./people/index.js";
import {
  GetProjectQueryHandler,
  ListDeletedProjectsQueryHandler,
  ListProjectsQueryHandler,
} from "./projects/index.js";
import { ListResourcesQueryHandler } from "./resources/index.js";
import { ListTasksQueryHandler, GetTaskQueryHandler } from "./tasks/index.js";
import { GetWorkspaceDashboardQueryHandler } from "./dashboard/index.js";

export function registerQueryHandlers(
  queryBus: IQueryBus,
  repositories: IPersistenceRepositories
): void {
  queryBus.registerMany([
    new ListDecisionsQueryHandler(repositories.decisions),
    new ListIdeasQueryHandler(repositories.ideas),
    new ListNotesQueryHandler(repositories.notes),
    new ListProjectAreasQueryHandler(repositories.projectAreas),
    new ListPeopleQueryHandler(repositories.people),
    new GetPersonQueryHandler(repositories.people),
    new GetProjectQueryHandler(repositories.projects),
    new ListProjectsQueryHandler(repositories.projects),
    new ListDeletedProjectsQueryHandler(repositories.projects),
    new ListResourcesQueryHandler(repositories.resources),
    new ListTasksQueryHandler(repositories.tasks),
    new GetTaskQueryHandler(repositories.tasks),
    new GetWorkspaceDashboardQueryHandler(repositories.workspaceDashboard),
  ]);
}
