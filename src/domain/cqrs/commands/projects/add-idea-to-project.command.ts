import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ISpydrNodeRepository } from "../../../interfaces/spydr-node-repository.js";
import { IdeaMapper } from "../../../mappers/ideas/index.js";
import type { IdeaNode } from "../../../models/ideas/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../../models/shared.js";
import { nextCollectionSortOrder } from "../../../utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../command.js";

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
    private readonly nodes: ISpydrNodeRepository,
    private readonly mapper = new IdeaMapper()
  ) {}

  async execute(command: AddIdeaToProjectCommand): Promise<IdeaNode | null> {
    const project = await this.projects.findByIdForOrg(
      command.projectId,
      command.orgId
    );
    if (!project) return null;

    const sortOrder = await nextCollectionSortOrder(
      this.nodes,
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
