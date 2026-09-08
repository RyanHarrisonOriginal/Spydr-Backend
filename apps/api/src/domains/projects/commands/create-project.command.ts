import type { IProjectAreaRepository } from "../../project-areas/repository.js";
import type { IProjectRepository } from "../repository.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { ProjectMapper } from "../mappers/index.js";
import type { ProjectNode } from "../models/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

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
    readonly orgId: string,
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
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new ProjectMapper()
  ) {}

  async execute(command: CreateProjectCommand): Promise<ProjectNode> {
    const input = { ...command.input };

    if (command.input.areaNodeId) {
      const area = await this.projectAreas.get({
        id: command.input.areaNodeId,
        orgId: command.orgId,
      });
      if (!area) {
        throw new Error("Project area not found");
      }
      input.area = area.title;
    }

    const sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "project"
    );
    const project = this.mapper.toModel(
      command.userId,
      command.orgId,
      input,
      new Date(),
      sortOrder
    );
    const saved = await this.projects.save(project);

    if (command.input.areaNodeId) {
      await this.projects.save(saved, {
        strategy: "withAreaAssignment",
        context: { areaNodeId: command.input.areaNodeId },
      });
    }

    return (await this.projects.get({ id: saved.id, orgId: command.orgId })) ?? saved;
  }
}
