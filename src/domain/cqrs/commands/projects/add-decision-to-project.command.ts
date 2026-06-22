import type { IProjectRepository } from "../../../interfaces/index.js";
import { DecisionMapper } from "../../../mappers/decisions/index.js";
import type { DecisionNode } from "../../../models/decisions/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";

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
    private readonly mapper = new DecisionMapper()
  ) {}

  async execute(
    command: AddDecisionToProjectCommand
  ): Promise<DecisionNode | null> {
    const project = await this.projects.findByIdForUser(
      command.projectId,
      command.userId
    );
    if (!project) return null;

    const decision = this.mapper.toModel(command.input, {
      userId: command.userId,
      area: project.area,
    });
    project.addDecision(decision);

    await this.projects.save(project);
    return decision;
  }
}
