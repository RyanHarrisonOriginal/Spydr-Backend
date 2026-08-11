import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export class DeleteProjectCommand implements ICommand<boolean> {
  static readonly commandType = "projects.delete";
  readonly commandType = DeleteProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string
  ) {}
}

export class DeleteProjectCommandHandler
  implements ICommandHandler<DeleteProjectCommand, boolean>
{
  readonly commandType = DeleteProjectCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(command: DeleteProjectCommand): Promise<boolean> {
    const project = await this.projects.findByIdForOrg(
      command.projectId,
      command.orgId
    );
    if (!project) return false;

    await this.projects.delete(project.id);
    return true;
  }
}
