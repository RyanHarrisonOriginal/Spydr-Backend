import type { IProjectRepository } from "../repository.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { DecisionMapper } from "../../decisions/mappers/decision.mapper.js";
import type { DecisionNode } from "../../decisions/models/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IAddDecisionToProjectInput {
  title: string;
  body?: string;
  rationale?: string;
  impact?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class AddDecisionToProjectCommand implements ICommand<DecisionNode | null> {
  static readonly commandType = "projects.decisions.add";
  readonly commandType = AddDecisionToProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly input: IAddDecisionToProjectInput
  ) {}
}

export class AddDecisionToProjectCommandHandler
  implements ICommandHandler<AddDecisionToProjectCommand, DecisionNode | null>
{
  readonly commandType = AddDecisionToProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new DecisionMapper()
  ) {}

  async execute(
    command: AddDecisionToProjectCommand
  ): Promise<DecisionNode | null> {
    const project = await this.projects.get({ id: command.projectId, orgId: command.orgId });
    if (!project) return null;

    const sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "decision"
    );
    const decision = this.mapper.toModel(command.input, {
      userId: command.userId,
      orgId: command.orgId,
      area: project.area,
      sortOrder,
    });
    project.addDecision(decision);

    await this.projects.save(project);
    return decision;
  }
}
