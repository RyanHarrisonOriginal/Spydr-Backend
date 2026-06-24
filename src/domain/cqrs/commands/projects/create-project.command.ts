import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import type { IProjectRepository } from "../../../interfaces/index.js";
import { ProjectMapper } from "../../../mappers/projects/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface ICreateProjectInput {
  title: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  area?: string | null;
  areaNodeId?: string | null;
  tags?: string[];
  outcome?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  riskLevel?: SpydrPriority;
}

export class CreateProjectCommand implements ICommand<ProjectNode> {
  static readonly commandType = "projects.create";
  readonly commandType = CreateProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly input: ICreateProjectInput
  ) {}
}

export class CreateProjectCommandHandler
  implements ICommandHandler<CreateProjectCommand, ProjectNode>
{
  readonly commandType = CreateProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly projectAreas: IProjectAreaRepository,
    private readonly mapper = new ProjectMapper()
  ) {}

  async execute(command: CreateProjectCommand): Promise<ProjectNode> {
    const input = { ...command.input };

    if (command.input.areaNodeId) {
      const area = await this.projectAreas.findByIdForUser(
        command.input.areaNodeId,
        command.userId
      );
      if (!area) {
        throw new Error("Project area not found");
      }
      input.area = area.title;
    }

    const project = this.mapper.toModel(command.userId, input);
    const saved = await this.projects.save(project);

    if (command.input.areaNodeId) {
      await this.projects.setAreaAssignment(
        saved.id,
        command.userId,
        command.input.areaNodeId
      );
    }

    return (await this.projects.findByIdForUser(saved.id, command.userId)) ?? saved;
  }
}
