import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { ICommandBus } from "./command-bus.js";
import {
  CreateProjectAreaCommandHandler,
  DeleteProjectAreaCommandHandler,
  UpdateProjectAreaCommandHandler,
} from "./project-areas/index.js";
import {
  AddDecisionToProjectCommandHandler,
  AddIdeaToProjectCommandHandler,
  AddNoteToProjectCommandHandler,
  AddTaskToProjectCommandHandler,
  CreateProjectCommandHandler,
  DeleteProjectChildCommandHandler,
  RestoreProjectChildCommandHandler,
  UpdateProjectChildCommandHandler,
  UpdateProjectCommandHandler,
} from "./projects/index.js";

export function registerCommandHandlers(
  commandBus: ICommandBus,
  repositories: IPersistenceRepositories
): void {
  commandBus.registerMany([
    new CreateProjectAreaCommandHandler(repositories.projectAreas),
    new UpdateProjectAreaCommandHandler(repositories.projectAreas),
    new DeleteProjectAreaCommandHandler(repositories.projectAreas),
    new CreateProjectCommandHandler(
      repositories.projects,
      repositories.projectAreas
    ),
    new UpdateProjectCommandHandler(
      repositories.projects,
      repositories.projectAreas
    ),
    new AddTaskToProjectCommandHandler(repositories.projects),
    new AddNoteToProjectCommandHandler(repositories.projects),
    new AddDecisionToProjectCommandHandler(repositories.projects),
    new AddIdeaToProjectCommandHandler(repositories.projects),
    new UpdateProjectChildCommandHandler(repositories.projects),
    new DeleteProjectChildCommandHandler(repositories.projects),
    new RestoreProjectChildCommandHandler(repositories.projects),
  ]);
}
