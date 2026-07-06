import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { ICommandBus } from "./command-bus.js";
import {
  CreateOrganizationCommandHandler,
} from "./organizations/index.js";
import {
  CreateProjectAreaCommandHandler,
  DeleteProjectAreaCommandHandler,
  UpdateProjectAreaCommandHandler,
} from "./project-areas/index.js";
import {
  CreatePersonCommandHandler,
  DeletePersonCommandHandler,
  UpdatePersonCommandHandler,
} from "./people/index.js";
import {
  AddDecisionToProjectCommandHandler,
  AddIdeaToProjectCommandHandler,
  AddNoteToProjectCommandHandler,
  AddTaskToProjectCommandHandler,
  CreateProjectCommandHandler,
  DeleteProjectChildCommandHandler,
  DeleteProjectCommandHandler,
  RestoreProjectCommandHandler,
  RestoreProjectChildCommandHandler,
  UpdateProjectChildCommandHandler,
  UpdateProjectCommandHandler,
} from "./projects/index.js";
import { UpdateTaskCommandHandler } from "./tasks/index.js";
import { UpdateNoteCommandHandler } from "./notes/index.js";
import { ReorderNodesCommandHandler } from "./nodes/index.js";

export function registerCommandHandlers(
  commandBus: ICommandBus,
  repositories: IPersistenceRepositories
): void {
  commandBus.registerMany([
    new CreateOrganizationCommandHandler(repositories.organizations),
    new CreateProjectAreaCommandHandler(repositories.projectAreas),
    new UpdateProjectAreaCommandHandler(repositories.projectAreas),
    new DeleteProjectAreaCommandHandler(repositories.projectAreas),
    new CreatePersonCommandHandler(repositories.people),
    new UpdatePersonCommandHandler(repositories.people),
    new DeletePersonCommandHandler(repositories.people),
    new CreateProjectCommandHandler(
      repositories.projects,
      repositories.projectAreas
    ),
    new UpdateProjectCommandHandler(
      repositories.projects,
      repositories.projectAreas,
      repositories.people
    ),
    new DeleteProjectCommandHandler(repositories.projects),
    new RestoreProjectCommandHandler(repositories.projects),
    new AddTaskToProjectCommandHandler(
      repositories.projects,
      repositories.people
    ),
    new AddNoteToProjectCommandHandler(repositories.projects),
    new AddDecisionToProjectCommandHandler(repositories.projects),
    new AddIdeaToProjectCommandHandler(repositories.projects),
    new UpdateProjectChildCommandHandler(repositories.projects),
    new DeleteProjectChildCommandHandler(repositories.projects),
    new RestoreProjectChildCommandHandler(repositories.projects),
    new UpdateTaskCommandHandler(repositories.tasks, repositories.people),
    new UpdateNoteCommandHandler(repositories.notes),
    new ReorderNodesCommandHandler(repositories.spydrNodes),
  ]);
}
