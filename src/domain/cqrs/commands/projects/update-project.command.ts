import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import type { IProjectRepository } from "../../../interfaces/index.js";
import { ProjectMapper } from "../../../mappers/projects/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";
import type { IProjectUpdateModelInput } from "../../../mappers/projects/index.js";

export interface IUpdateProjectInput {
  body?: string;
  status?: SpydrNodeStatus;
  areaNodeId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  riskLevel?: SpydrPriority;
}

export class UpdateProjectCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.update";
  readonly commandType = UpdateProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly projectId: string,
    readonly input: IUpdateProjectInput
  ) {}
}

export class UpdateProjectCommandHandler
  implements ICommandHandler<UpdateProjectCommand, ProjectNode | null>
{
  readonly commandType = UpdateProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly projectAreas: IProjectAreaRepository,
    private readonly mapper = new ProjectMapper()
  ) {}

  async execute(command: UpdateProjectCommand): Promise<ProjectNode | null> {
    const existing = await this.projects.findByIdForUser(
      command.projectId,
      command.userId
    );
    if (!existing) return null;

    const patch = await this.resolvePatch(command.userId, command.input);
    const project = this.mapper.toModel(existing, patch);

    await this.projects.updateProject(project);

    if (command.input.areaNodeId !== undefined) {
      await this.projects.setAreaAssignment(
        command.projectId,
        command.userId,
        command.input.areaNodeId
      );
    }

    return this.projects.findByIdForUser(command.projectId, command.userId);
  }

  private async resolvePatch(
    userId: string,
    input: IUpdateProjectInput
  ): Promise<IProjectUpdateModelInput> {
    const patch: IProjectUpdateModelInput = {
      body: input.body,
      status: input.status,
      startDate: input.startDate,
      targetDate: input.targetDate,
      riskLevel: input.riskLevel,
    };

    if (input.areaNodeId !== undefined) {
      if (input.areaNodeId === null) {
        patch.area = null;
      } else {
        const area = await this.projectAreas.findByIdForUser(
          input.areaNodeId,
          userId
        );
        if (!area) {
          throw new Error("Project area not found");
        }
        patch.area = area.title;
      }
    }

    return patch;
  }
}
