import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type {
  IUpdateProjectChildInput,
  ProjectChildKind,
} from "../../../interfaces/project-repository.js";
import { DecisionMapper } from "../../../mappers/decisions/decision.mapper.js";
import { IdeaMapper } from "../../../mappers/ideas/idea.mapper.js";
import { NoteMapper } from "../../../mappers/notes/note.mapper.js";
import { TaskMapper } from "../../../mappers/tasks/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export type { IUpdateProjectChildInput, ProjectChildKind };

export class UpdateProjectChildCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.children.update";
  readonly commandType = UpdateProjectChildCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly childId: string,
    readonly kind: ProjectChildKind,
    readonly input: IUpdateProjectChildInput
  ) {}
}

export class UpdateProjectChildCommandHandler
  implements ICommandHandler<UpdateProjectChildCommand, ProjectNode | null>
{
  readonly commandType = UpdateProjectChildCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(command: UpdateProjectChildCommand): Promise<ProjectNode | null> {
    return this.projects.updateRelatedNode(
      command.orgId,
      command.projectId,
      command.childId,
      command.kind,
      command.input
    );
  }
}

export class DeleteProjectChildCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.children.delete";
  readonly commandType = DeleteProjectChildCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly childId: string,
    readonly kind: ProjectChildKind
  ) {}
}

export class DeleteProjectChildCommandHandler
  implements ICommandHandler<DeleteProjectChildCommand, ProjectNode | null>
{
  readonly commandType = DeleteProjectChildCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(command: DeleteProjectChildCommand): Promise<ProjectNode | null> {
    return this.projects.softDeleteRelatedNode(
      command.orgId,
      command.projectId,
      command.childId,
      command.kind
    );
  }
}

export class RestoreProjectChildCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.children.restore";
  readonly commandType = RestoreProjectChildCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly childId: string,
    readonly kind: ProjectChildKind
  ) {}
}

export class RestoreProjectChildCommandHandler
  implements ICommandHandler<RestoreProjectChildCommand, ProjectNode | null>
{
  readonly commandType = RestoreProjectChildCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(command: RestoreProjectChildCommand): Promise<ProjectNode | null> {
    return this.projects.restoreRelatedNode(
      command.orgId,
      command.projectId,
      command.childId,
      command.kind
    );
  }
}

export const projectChildMappers = {
  task: new TaskMapper(),
  note: new NoteMapper(),
  decision: new DecisionMapper(),
  idea: new IdeaMapper(),
};
