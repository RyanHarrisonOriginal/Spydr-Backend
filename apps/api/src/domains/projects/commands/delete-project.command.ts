import type { IProjectRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

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
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project || project.isDeleted) return false;

    project.softDelete();
    await this.projects.delete(project.id);
    return true;
  }
}
