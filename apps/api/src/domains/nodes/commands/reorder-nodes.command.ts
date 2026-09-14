import type { SpydrNodeType } from "../../shared/models/shared.js";
import type { ISpydrNodeRepository } from "../repository.js";
import type { DomainNode } from "../../shared/models/shared.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { PersonNode } from "../../people/models/index.js";
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

  constructor(
    private readonly nodes: ISpydrNodeRepository,
    private readonly people: IPersonRepository
  ) {}

  async execute(command: ReorderNodesCommand): Promise<void> {
    const { nodeType, orderedIds } = command.input;
    if (nodeType === "person") {
      const placeholder = { id: orderedIds[0] ?? "" } as PersonNode;
      await this.people.save(placeholder, {
        strategy: "reorder",
        context: {
          orgId: command.orgId,
          orderedIds,
        },
      });
      return;
    }

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
