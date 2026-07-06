import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import { ProjectAreaMapper } from "../../../mappers/project-areas/index.js";
import type { ProjectAreaNode } from "../../../models/project-areas/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface ICreateProjectAreaInput {
  title: string;
  body?: string;
  color?: string;
}

export class CreateProjectAreaCommand implements ICommand<ProjectAreaNode> {
  static readonly commandType = "project-areas.create";
  readonly commandType = CreateProjectAreaCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ICreateProjectAreaInput
  ) {}
}

export class CreateProjectAreaCommandHandler
  implements ICommandHandler<CreateProjectAreaCommand, ProjectAreaNode>
{
  readonly commandType = CreateProjectAreaCommand.commandType;

  constructor(
    private readonly projectAreas: IProjectAreaRepository,
    private readonly mapper = new ProjectAreaMapper()
  ) {}

  async execute(command: CreateProjectAreaCommand): Promise<ProjectAreaNode> {
    const title = command.input.title.trim();
    if (!title) {
      throw new Error("Project area title is required");
    }

    const existing = await this.projectAreas.findByTitleForOrg(
      command.orgId,
      title
    );
    if (existing) {
      throw new Error("Project area already exists");
    }

    const area = this.mapper.toModel(command.userId, command.orgId, command.input);
    return this.projectAreas.save(area);
  }
}
