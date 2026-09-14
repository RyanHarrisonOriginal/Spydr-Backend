import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { ICommandBus } from "./command-bus.js";
import { ApplyActiveNoteCommandHandler } from "../../active-notes/commands/index.js";
import {
  AcceptOrganizationInviteCommandHandler,
  AddOrganizationMemberCommandHandler,
  CreateOrganizationCommandHandler,
  InviteOrganizationMemberCommandHandler,
  RemoveOrganizationMemberCommandHandler,
  RevokeOrganizationInviteCommandHandler,
} from "../../organizations/commands/index.js";
import {
  CreateProjectAreaCommandHandler,
  DeleteProjectAreaCommandHandler,
  UpdateProjectAreaCommandHandler,
} from "../../project-areas/commands/index.js";
import {
  CreatePersonCommandHandler,
  DeletePersonCommandHandler,
  ReorderPersonCollectionCommandHandler,
  SyncPersonFromClerkCommandHandler,
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
  AddTaskToTodoCommandHandler,
  RemoveTodoItemCommandHandler,
  RemoveTodoItemByTaskCommandHandler,
} from "../../todos/commands/index.js";
import {
  CreateProjectTemplateCommandHandler,
  CreateProjectTemplateFromProjectCommandHandler,
  DeleteProjectTemplateCommandHandler,
  InvokeProjectTemplateCommandHandler,
  UpdateProjectTemplateCommandHandler,
} from "../../project-templates/commands/index.js";
import {
  UpdateNoteCommandHandler,
  DeleteNoteCommandHandler,
} from "../../notes/commands/index.js";
import { DeleteIdeaCommandHandler } from "../../ideas/commands/index.js";
import { DeleteDecisionCommandHandler } from "../../decisions/commands/index.js";
import { ReorderNodesCommandHandler } from "../../nodes/commands/index.js";
import { TransformNodeTypeCommandHandler } from "../../node-type-transform/commands/index.js";
import {
  ClerkInvitationSender,
  ClerkUserDirectory,
} from "../../../infra/clerk/clerk-users.js";

export function registerCommandHandlers(
  commandBus: ICommandBus,
  repositories: IPersistenceRepositories
): void {
  const clerkUsers = new ClerkUserDirectory();

  commandBus.registerMany([
    new CreateProjectAreaCommandHandler(
      repositories.projectAreas,
      repositories.projectAreaViews
    ),
    new UpdateProjectAreaCommandHandler(repositories.projectAreas),
    new DeleteProjectAreaCommandHandler(repositories.projectAreas),
    new CreatePersonCommandHandler(
      repositories.people,
      repositories.personViews
    ),
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
      repositories.people,
      repositories.tasks
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
      repositories.taskViews,
      repositories.projects
    ),
    new CompleteTaskCommandHandler(repositories.tasks, repositories.taskViews),
    new DeleteTaskCommandHandler(repositories.tasks),
    new AddTaskToTodoCommandHandler(
      repositories.todos,
      repositories.todoViews,
      repositories.tasks
    ),
    new RemoveTodoItemCommandHandler(repositories.todos),
    new RemoveTodoItemByTaskCommandHandler(
      repositories.todos,
      repositories.todoViews
    ),
    new CreateProjectTemplateCommandHandler(repositories.projectTemplates),
    new CreateProjectTemplateFromProjectCommandHandler(
      repositories.projectTemplates,
      repositories.projects
    ),
    new UpdateProjectTemplateCommandHandler(
      repositories.projectTemplates,
      repositories.projects,
      repositories.projectViews,
      repositories.projectAreaViews
    ),
    new DeleteProjectTemplateCommandHandler(repositories.projectTemplates),
    new InvokeProjectTemplateCommandHandler(
      repositories.projectTemplateViews,
      repositories.projects,
      repositories.projectAreas,
      repositories.projectAreaViews,
      repositories.spydrNodeViews
    ),
    new UpdateNoteCommandHandler(repositories.notes, repositories.noteViews),
    new DeleteNoteCommandHandler(repositories.notes),
    new DeleteIdeaCommandHandler(repositories.ideas),
    new DeleteDecisionCommandHandler(repositories.decisions),
    new ReorderNodesCommandHandler(repositories.spydrNodes, repositories.people),
    new ReorderPersonCollectionCommandHandler(
      repositories.people,
      repositories.personWork,
      repositories.personCollectionSort
    ),
    new SyncPersonFromClerkCommandHandler(
      repositories.people,
      repositories.personViews,
      clerkUsers
    ),
  ]);

  commandBus.register(
    new CreateOrganizationCommandHandler(
      repositories.organizations,
      repositories.personViews,
      commandBus
    )
  );
  commandBus.register(
    new InviteOrganizationMemberCommandHandler(
      repositories.organizations,
      repositories.organizationViews,
      repositories.organizationInvites,
      repositories.organizationInviteViews,
      new ClerkInvitationSender()
    )
  );
  commandBus.register(
    new AcceptOrganizationInviteCommandHandler(
      repositories.organizationInvites,
      repositories.organizationInviteViews,
      repositories.organizations,
      repositories.people,
      repositories.personViews,
      commandBus
    )
  );
  commandBus.register(
    new RevokeOrganizationInviteCommandHandler(
      repositories.organizations,
      repositories.organizationInvites
    )
  );
  commandBus.register(
    new AddOrganizationMemberCommandHandler(
      repositories.organizations,
      repositories.organizationViews,
      repositories.people,
      repositories.personViews,
      clerkUsers,
      commandBus
    )
  );
  commandBus.register(
    new RemoveOrganizationMemberCommandHandler(
      repositories.organizations,
      repositories.organizationViews
    )
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
