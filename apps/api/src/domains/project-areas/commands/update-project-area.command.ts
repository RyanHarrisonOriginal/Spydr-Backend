import type { IProjectAreaRepository } from "../../project-areas/repository.js";
import type { IProjectAreaViews } from "../../project-areas/views.js";
import type { ProjectAreaNode } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IUpdateProjectAreaInput {
  title?: string;
  color?: string;
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

  constructor(
    private readonly projectAreas: IProjectAreaRepository,
    private readonly projectAreaViews: IProjectAreaViews
  ) {}

  async execute(command: UpdateProjectAreaCommand): Promise<ProjectAreaNode> {
    const area = await this.projectAreas.get({
      id: command.areaId,
      orgId: command.orgId,
    });
    if (!area) {
      throw new Error("Project area not found");
    }

    if (command.input.title === undefined && command.input.color === undefined) {
      throw new Error("Nothing to update");
    }

    const nextTitle =
      command.input.title !== undefined ? command.input.title.trim() : undefined;
    if (command.input.title !== undefined && !nextTitle) {
      throw new Error("Project area title is required");
    }

    if (nextTitle) {
      const existing = await this.projectAreaViews.getByTitle(
        command.orgId,
        nextTitle
      );
      if (existing && existing.id !== area.id) {
        throw new Error("Project area already exists");
      }
    }

    const previousTitle = area.title;
    area.applyUpdate(command.input);

    const renamed =
      nextTitle !== undefined && previousTitle !== area.title;
    if (renamed) {
      return this.projectAreas.save(area, {
        strategy: "renameProjectLinks",
        context: { previousTitle },
      });
    }

    return this.projectAreas.save(area);
  }
}
