import type { IProjectAreaRepository } from "../../project-areas/repository.js";
import type { ProjectAreaNode } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IUpdateProjectAreaInput {
  color: string;
}

export class UpdateProjectAreaCommand implements ICommand<ProjectAreaNode> {
  static readonly commandType = "project-areas.update";
  readonly commandType = UpdateProjectAreaCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly areaId: string,
    readonly input: IUpdateProjectAreaInput
  ) {}
}

export class UpdateProjectAreaCommandHandler
  implements ICommandHandler<UpdateProjectAreaCommand, ProjectAreaNode>
{
  readonly commandType = UpdateProjectAreaCommand.commandType;

  constructor(private readonly projectAreas: IProjectAreaRepository) {}

  async execute(command: UpdateProjectAreaCommand): Promise<ProjectAreaNode> {
    const area = await this.projectAreas.get({
      id: command.areaId,
      orgId: command.orgId,
    });
    if (!area) {
      throw new Error("Project area not found");
    }

    if (command.input.color === undefined) {
      throw new Error("Nothing to update");
    }

    area.applyColorUpdate(command.input.color);
    return this.projectAreas.save(area);
  }
}
