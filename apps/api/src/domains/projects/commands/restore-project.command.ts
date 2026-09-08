import type { IProjectRepository } from "../repository.js";
import type { ProjectNode } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

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
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
      includeDeleted: true,
    });
    if (!project) return null;

    project.restore();
    return this.projects.save(project, { strategy: "restore" });
  }
}
