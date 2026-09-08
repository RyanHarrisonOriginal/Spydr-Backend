import type { IProjectRepository } from "../repository.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { IdeaMapper } from "../../ideas/mappers/idea.mapper.js";
import type { IdeaNode } from "../../ideas/models/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IAddIdeaToProjectInput {
  title: string;
  body?: string;
  confidence?: number | null;
  potentialValue?: SpydrPriority;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class AddIdeaToProjectCommand implements ICommand<IdeaNode | null> {
  static readonly commandType = "projects.ideas.add";
  readonly commandType = AddIdeaToProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly input: IAddIdeaToProjectInput
  ) {}
}

export class AddIdeaToProjectCommandHandler
  implements ICommandHandler<AddIdeaToProjectCommand, IdeaNode | null>
{
  readonly commandType = AddIdeaToProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new IdeaMapper()
  ) {}

  async execute(command: AddIdeaToProjectCommand): Promise<IdeaNode | null> {
    const project = await this.projects.get({ id: command.projectId, orgId: command.orgId });
    if (!project) return null;

    const sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "idea"
    );
    const idea = this.mapper.toModel(command.input, {
      userId: command.userId,
      orgId: command.orgId,
      area: project.area,
      sortOrder,
    });
    project.addIdea(idea);

    await this.projects.save(project);
    return idea;
  }
}
