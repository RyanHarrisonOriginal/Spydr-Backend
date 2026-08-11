import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export class RestoreProjectCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.restore";
  readonly commandType = RestoreProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string
  ) {}
}

export class RestoreProjectCommandHandler
  implements ICommandHandler<RestoreProjectCommand, ProjectNode | null>
{
  readonly commandType = RestoreProjectCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(command: RestoreProjectCommand): Promise<ProjectNode | null> {
    return this.projects.restoreProject(command.orgId, command.projectId);
  }
}
