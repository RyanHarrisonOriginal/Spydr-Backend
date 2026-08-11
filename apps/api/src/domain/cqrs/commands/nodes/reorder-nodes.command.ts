import type { SpydrNodeType } from "../../../models/index.js";
import type { ISpydrNodeRepository } from "../../../interfaces/spydr-node-repository.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface IReorderNodesInput {
  nodeType: SpydrNodeType;
  orderedIds: readonly string[];
}

export class ReorderNodesCommand implements ICommand<void> {
  static readonly commandType = "nodes.reorder";
  readonly commandType = ReorderNodesCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: IReorderNodesInput
  ) {}
}

export class ReorderNodesCommandHandler
  implements ICommandHandler<ReorderNodesCommand, void>
{
  readonly commandType = ReorderNodesCommand.commandType;

  constructor(private readonly nodes: ISpydrNodeRepository) {}

  execute(command: ReorderNodesCommand): Promise<void> {
    const { nodeType, orderedIds } = command.input;
    return this.nodes.reorderForOrg(command.orgId, nodeType, orderedIds);
  }
}
