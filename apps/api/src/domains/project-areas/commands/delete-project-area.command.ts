import type { IProjectAreaRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

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
    const area = await this.projectAreas.get({
      id: command.areaId,
      orgId: command.orgId,
    });
    if (!area || area.isDeleted) return false;

    area.softDelete();
    await this.projectAreas.save(area, {
      strategy: "clearProjectLinks",
      context: { orgId: command.orgId, title: area.title },
    });
    await this.projectAreas.delete(area.id);
    return true;
  }
}
