import type { IProjectRepository } from "../../../interfaces/index.js";
import { ProjectMapper } from "../../../mappers/projects/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { SpydrPriority } from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface IUpdateProjectInput {
  body?: string;
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
    private readonly mapper = new ProjectMapper()
  ) {}

  async execute(command: UpdateProjectCommand): Promise<ProjectNode | null> {
    const existing = await this.projects.findByIdForUser(
      command.projectId,
      command.userId
    );
    if (!existing) return null;

    await this.projects.save(this.mapper.toModel(existing, command.input));

    return this.projects.findByIdForUser(command.projectId, command.userId);
  }
}
