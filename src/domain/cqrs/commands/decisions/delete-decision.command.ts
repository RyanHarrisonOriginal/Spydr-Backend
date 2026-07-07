import type { IDecisionRepository } from "../../../interfaces/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export class DeleteDecisionCommand implements ICommand<boolean> {
  static readonly commandType = "decisions.delete";
  readonly commandType = DeleteDecisionCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly decisionId: string
  ) {}
}

export class DeleteDecisionCommandHandler
  implements ICommandHandler<DeleteDecisionCommand, boolean>
{
  readonly commandType = DeleteDecisionCommand.commandType;

  constructor(private readonly decisions: IDecisionRepository) {}

  async execute(command: DeleteDecisionCommand): Promise<boolean> {
    const decision = await this.decisions.findByIdForOrg(
      command.decisionId,
      command.orgId
    );
    if (!decision || decision.isDeleted) return false;

    await this.decisions.delete(decision.id);
    return true;
  }
}
