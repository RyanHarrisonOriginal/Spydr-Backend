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
import { UpdateTaskCommandHandler, DeleteTaskCommandHandler } from "./tasks/index.js";
import { UpdateNoteCommandHandler, DeleteNoteCommandHandler } from "./notes/index.js";
import { DeleteIdeaCommandHandler } from "./ideas/index.js";
import { DeleteDecisionCommandHandler } from "./decisions/index.js";
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
    new CreatePersonCommandHandler(repositories.people, repositories.spydrNodes),
    new UpdatePersonCommandHandler(repositories.people),
    new DeletePersonCommandHandler(repositories.people),
    new CreateProjectCommandHandler(
      repositories.projects,
      repositories.projectAreas,
      repositories.spydrNodes
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
      repositories.people,
      repositories.spydrNodes
    ),
    new AddNoteToProjectCommandHandler(
      repositories.projects,
      repositories.spydrNodes
    ),
    new AddDecisionToProjectCommandHandler(
      repositories.projects,
      repositories.spydrNodes
    ),
    new AddIdeaToProjectCommandHandler(
      repositories.projects,
      repositories.spydrNodes
    ),
    new UpdateProjectChildCommandHandler(repositories.projects),
    new DeleteProjectChildCommandHandler(repositories.projects),
    new RestoreProjectChildCommandHandler(repositories.projects),
    new UpdateTaskCommandHandler(repositories.tasks, repositories.people),
    new DeleteTaskCommandHandler(repositories.tasks),
    new UpdateNoteCommandHandler(repositories.notes),
    new DeleteNoteCommandHandler(repositories.notes),
    new DeleteIdeaCommandHandler(repositories.ideas),
    new DeleteDecisionCommandHandler(repositories.decisions),
    new ReorderNodesCommandHandler(repositories.spydrNodes),
  ]);
}
