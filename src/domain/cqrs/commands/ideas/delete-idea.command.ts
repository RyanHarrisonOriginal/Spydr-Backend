import type { IIdeaRepository } from "../../../interfaces/idea-repository.js";
import type { ICommand, ICommandHandler } from "../command.js";

export class DeleteIdeaCommand implements ICommand<boolean> {
  static readonly commandType = "ideas.delete";
  readonly commandType = DeleteIdeaCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly ideaId: string
  ) {}
}

export class DeleteIdeaCommandHandler
  implements ICommandHandler<DeleteIdeaCommand, boolean>
{
  readonly commandType = DeleteIdeaCommand.commandType;

  constructor(private readonly ideas: IIdeaRepository) {}

  async execute(command: DeleteIdeaCommand): Promise<boolean> {
    const idea = await this.ideas.findByIdForOrg(command.ideaId, command.orgId);
    if (!idea || idea.isDeleted) return false;

    await this.ideas.delete(idea.id);
    return true;
  }
}
