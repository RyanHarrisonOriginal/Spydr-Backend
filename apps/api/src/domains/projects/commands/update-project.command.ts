import type { IProjectAreaRepository } from "../../project-areas/repository.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IProjectRepository } from "../repository.js";
import type { IProjectUpdateInput, ProjectNode } from "../models/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../shared/models/shared.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IUpdateProjectInput {
  title?: string;
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

function parseProjectDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid project date");
  }

  return date;
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
    private readonly people: IPersonRepository
  ) {}

  async execute(command: UpdateProjectCommand): Promise<ProjectNode | null> {
    const existing = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!existing || existing.isDeleted) return null;

    const patch = await this.resolvePatch(command.orgId, command.input);
    existing.applyUpdate(patch);

    if (command.input.areaNodeId !== undefined) {
      return this.projects.save(existing, {
        strategy: "withAreaAssignment",
        context: { areaNodeId: command.input.areaNodeId },
      });
    }

    return this.projects.save(existing, { strategy: "metadata" });
  }

  private async resolvePatch(
    orgId: string,
    input: IUpdateProjectInput
  ): Promise<IProjectUpdateInput> {
    const patch: IProjectUpdateInput = {
      title: input.title,
      body: input.body,
      status: input.status,
      priority: input.priority,
      riskLevel: input.riskLevel,
    };

    if (input.startDate !== undefined) {
      patch.startDate = parseProjectDate(input.startDate);
    }
    if (input.targetDate !== undefined) {
      patch.targetDate = parseProjectDate(input.targetDate);
    }

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
        const area = await this.projectAreas.get({
          id: input.areaNodeId,
          orgId,
        });
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

    const person = await this.people.get({ id: personNodeId, orgId });
    if (!person) {
      throw new Error("Person not found");
    }

    return person.id;
  }
}
