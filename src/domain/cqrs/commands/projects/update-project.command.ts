import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import type { IProjectRepository } from "../../../interfaces/index.js";
import { ProjectMapper } from "../../../mappers/projects/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";
import type { IProjectUpdateModelInput } from "../../../mappers/projects/index.js";

export interface IUpdateProjectInput {
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  areaNodeId?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  riskLevel?: SpydrPriority;
  requesterPersonNodeId?: string | null;
  assigneePersonNodeId?: string | null;
  sponsorPersonNodeId?: string | null;
  reviewerPersonNodeId?: string | null;
}

export class UpdateProjectCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.update";
  readonly commandType = UpdateProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
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
    private readonly people: IPersonRepository,
    private readonly mapper = new ProjectMapper()
  ) {}

  async execute(command: UpdateProjectCommand): Promise<ProjectNode | null> {
    const existing = await this.projects.findByIdForOrg(
      command.projectId,
      command.orgId
    );
    if (!existing) return null;

    const patch = await this.resolvePatch(
      command.orgId,
      command.input,
      existing
    );
    const project = this.mapper.toModel(existing, patch);

    await this.projects.updateProject(project);

    if (command.input.areaNodeId !== undefined) {
      await this.projects.setAreaAssignment(
        command.projectId,
        command.orgId,
        command.input.areaNodeId
      );
    }

    return this.projects.findByIdForOrg(command.projectId, command.orgId);
  }

  private async resolvePatch(
    orgId: string,
    input: IUpdateProjectInput,
    existing: ProjectNode
  ): Promise<IProjectUpdateModelInput> {
    const patch: IProjectUpdateModelInput = {
      body: input.body,
      status: input.status,
      priority: input.priority,
      startDate: input.startDate,
      targetDate: input.targetDate,
      riskLevel: input.riskLevel,
    };

    if (input.requesterPersonNodeId !== undefined) {
      patch.requesterPersonNodeId = await this.resolvePersonId(
        orgId,
        input.requesterPersonNodeId
      );
    }
    if (input.assigneePersonNodeId !== undefined) {
      patch.assigneePersonNodeId = await this.resolvePersonId(
        orgId,
        input.assigneePersonNodeId
      );
    }
    if (input.sponsorPersonNodeId !== undefined) {
      patch.sponsorPersonNodeId = await this.resolvePersonId(
        orgId,
        input.sponsorPersonNodeId
      );
    }
    if (input.reviewerPersonNodeId !== undefined) {
      patch.reviewerPersonNodeId = await this.resolvePersonId(
        orgId,
        input.reviewerPersonNodeId
      );
    }

    if (input.areaNodeId !== undefined) {
      if (input.areaNodeId === null) {
        patch.area = null;
      } else {
        const area = await this.projectAreas.findByIdForOrg(
          input.areaNodeId,
          orgId
        );
        if (!area) {
          throw new Error("Project area not found");
        }
        patch.area = area.title;
      }
    }

    return patch;
  }

  private async resolvePersonId(
    orgId: string,
    personNodeId: string | null
  ): Promise<string | null> {
    if (!personNodeId) return null;

    const person = await this.people.findByIdForOrg(personNodeId, orgId);
    if (!person) {
      throw new Error("Person not found");
    }

    return person.id;
  }
}
