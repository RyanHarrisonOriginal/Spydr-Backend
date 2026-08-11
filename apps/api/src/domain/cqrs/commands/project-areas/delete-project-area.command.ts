import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import type { ICommand, ICommandHandler } from "../command.js";

export class DeleteProjectAreaCommand implements ICommand<boolean> {
  static readonly commandType = "project-areas.delete";
  readonly commandType = DeleteProjectAreaCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly areaId: string
  ) {}
}

export class DeleteProjectAreaCommandHandler
  implements ICommandHandler<DeleteProjectAreaCommand, boolean>
{
  readonly commandType = DeleteProjectAreaCommand.commandType;

  constructor(private readonly projectAreas: IProjectAreaRepository) {}

  async execute(command: DeleteProjectAreaCommand): Promise<boolean> {
    const area = await this.projectAreas.findByIdForOrg(
      command.areaId,
      command.orgId
    );
    if (!area) return false;

    await this.projectAreas.clearProjectsUsingArea(command.orgId, area.title);
    await this.projectAreas.delete(area.id);
    return true;
  }
}
