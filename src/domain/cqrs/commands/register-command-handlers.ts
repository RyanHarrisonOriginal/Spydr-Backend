import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { ICommandBus } from "./command-bus.js";
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
    new CreateProjectCommandHandler(repositories.projects),
    new UpdateProjectCommandHandler(repositories.projects),
    new AddTaskToProjectCommandHandler(repositories.projects),
    new AddNoteToProjectCommandHandler(repositories.projects),
    new AddDecisionToProjectCommandHandler(repositories.projects),
    new AddIdeaToProjectCommandHandler(repositories.projects),
    new UpdateProjectChildCommandHandler(repositories.projects),
    new DeleteProjectChildCommandHandler(repositories.projects),
    new RestoreProjectChildCommandHandler(repositories.projects),
  ]);
}
