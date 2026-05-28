import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { ICommandBus } from "./command-bus.js";
import {
  AddTaskToProjectCommandHandler,
  CreateProjectCommandHandler,
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
  ]);
}
