import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { ICommandBus } from "./command-bus.js";
import { ApplyActiveNoteCommandHandler } from "../../active-notes/commands/index.js";
import { CreateOrganizationCommandHandler } from "../../organizations/commands/index.js";
import {
  CreateProjectAreaCommandHandler,
  DeleteProjectAreaCommandHandler,
  UpdateProjectAreaCommandHandler,
} from "../../project-areas/commands/index.js";
import {
  CreatePersonCommandHandler,
  DeletePersonCommandHandler,
  ReorderPersonCollectionCommandHandler,
  UpdatePersonCommandHandler,
} from "../../people/commands/index.js";
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
} from "../../projects/commands/index.js";
import {
  UpdateTaskCommandHandler,
  CompleteTaskCommandHandler,
  DeleteTaskCommandHandler,
} from "../../tasks/commands/index.js";
import {
  UpdateNoteCommandHandler,
  DeleteNoteCommandHandler,
} from "../../notes/commands/index.js";
import { DeleteIdeaCommandHandler } from "../../ideas/commands/index.js";
import { DeleteDecisionCommandHandler } from "../../decisions/commands/index.js";
import { ReorderNodesCommandHandler } from "../../nodes/commands/index.js";
import { TransformNodeTypeCommandHandler } from "../../node-type-transform/commands/index.js";

export function registerCommandHandlers(
  commandBus: ICommandBus,
  repositories: IPersistenceRepositories
): void {
  commandBus.registerMany([
    new CreateProjectAreaCommandHandler(
      repositories.projectAreas,
      repositories.projectAreaViews
    ),
    new UpdateProjectAreaCommandHandler(repositories.projectAreas),
    new DeleteProjectAreaCommandHandler(repositories.projectAreas),
    new CreatePersonCommandHandler(repositories.people, repositories.spydrNodeViews),
    new UpdatePersonCommandHandler(repositories.people),
    new DeletePersonCommandHandler(
      repositories.people,
      repositories.personCollectionSort
    ),
    new CreateProjectCommandHandler(
      repositories.projects,
      repositories.projectAreas,
      repositories.spydrNodeViews
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
      repositories.spydrNodeViews
    ),
    new AddNoteToProjectCommandHandler(
      repositories.projects,
      repositories.spydrNodeViews
    ),
    new AddDecisionToProjectCommandHandler(
      repositories.projects,
      repositories.spydrNodeViews
    ),
    new AddIdeaToProjectCommandHandler(
      repositories.projects,
      repositories.spydrNodeViews
    ),
    new UpdateProjectChildCommandHandler(repositories.projects),
    new DeleteProjectChildCommandHandler(repositories.projects),
    new RestoreProjectChildCommandHandler(repositories.projects),
    new UpdateTaskCommandHandler(
      repositories.tasks,
      repositories.people,
      repositories.taskViews
    ),
    new CompleteTaskCommandHandler(repositories.tasks, repositories.taskViews),
    new DeleteTaskCommandHandler(repositories.tasks),
    new UpdateNoteCommandHandler(repositories.notes, repositories.noteViews),
    new DeleteNoteCommandHandler(repositories.notes),
    new DeleteIdeaCommandHandler(repositories.ideas),
    new DeleteDecisionCommandHandler(repositories.decisions),
    new ReorderNodesCommandHandler(repositories.spydrNodes),
    new ReorderPersonCollectionCommandHandler(
      repositories.people,
      repositories.personWork,
      repositories.personCollectionSort
    ),
  ]);

  commandBus.register(
    new CreateOrganizationCommandHandler(repositories.organizations, commandBus)
  );

  commandBus.register(
    new ApplyActiveNoteCommandHandler(
      commandBus,
      repositories.activeNoteSessions
    )
  );
  commandBus.register(
    new TransformNodeTypeCommandHandler(repositories.nodeTypeTransforms)
  );
}
