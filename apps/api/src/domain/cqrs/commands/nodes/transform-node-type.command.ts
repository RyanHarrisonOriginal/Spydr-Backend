import type { INodeTypeTransformRepository } from "../../../interfaces/node-type-transform-repository.js";
import type {
  INodeTypeTransformRequest,
  INodeTypeTransformResult,
} from "../../../node-type-transform/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface ITransformNodeTypeInput {
  nodeId: string;
  targetType: "project" | "task" | "note";
  projectId?: string | null;
}

export class TransformNodeTypeCommand implements ICommand<INodeTypeTransformResult> {
  static readonly commandType = "nodes.transformType";
  readonly commandType = TransformNodeTypeCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ITransformNodeTypeInput
  ) {}
}

export class TransformNodeTypeCommandHandler
  implements ICommandHandler<TransformNodeTypeCommand, INodeTypeTransformResult>
{
  readonly commandType = TransformNodeTypeCommand.commandType;

  constructor(private readonly transforms: INodeTypeTransformRepository) {}

  async execute(
    command: TransformNodeTypeCommand
  ): Promise<INodeTypeTransformResult> {
    return this.transforms.transform({
      orgId: command.orgId,
      userId: command.userId,
      nodeId: command.input.nodeId,
      targetType: command.input.targetType,
      projectId: command.input.projectId,
    });
  }
}
