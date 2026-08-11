import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import {
  DEFAULT_PROJECT_AREA_COLOR,
  normalizeProjectAreaColor,
  ProjectAreaDetails,
} from "../../../models/project-areas/index.js";
import type { ProjectAreaNode } from "../../../models/project-areas/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

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
    const area = await this.projectAreas.findByIdForOrg(
      command.areaId,
      command.orgId
    );
    if (!area) {
      throw new Error("Project area not found");
    }

    if (command.input.color === undefined) {
      throw new Error("Nothing to update");
    }

    ensureAreaDetails(area);
    area.setColor(normalizeProjectAreaColor(command.input.color));
    bumpNodeUpdatedAt(area);

    return this.projectAreas.save(area);
  }
}

function ensureAreaDetails(area: ProjectAreaNode): void {
  if (area.details) return;

  const now = new Date();
  (area as ProjectAreaNode & { details: ProjectAreaDetails }).details =
    new ProjectAreaDetails({
      color: DEFAULT_PROJECT_AREA_COLOR,
      createdAt: now,
      updatedAt: now,
    });
}

function bumpNodeUpdatedAt(area: ProjectAreaNode): void {
  (area as ProjectAreaNode & { updatedAt: Date }).updatedAt = new Date();
}
