import type { SpydrNodeType } from "../../shared/models/shared.js";
import type { ISpydrNodeRepository } from "../repository.js";
import type { DomainNode } from "../../shared/models/shared.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

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

  async execute(command: ReorderNodesCommand): Promise<void> {
    const { nodeType, orderedIds } = command.input;
    // Placeholder entity — reorder strategy uses context only.
    const placeholder = { id: orderedIds[0] ?? "" } as DomainNode;
    await this.nodes.save(placeholder, {
      strategy: "reorder",
      context: {
        orgId: command.orgId,
        nodeType,
        orderedIds,
      },
    });
  }
}
