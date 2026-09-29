import type { ITaskRepository } from "../../tasks/repository.js";
import type { TaskNode } from "../../tasks/models/index.js";
import type { TaskStatus } from "../../shared/models/shared.js";
import {
  type DomainNode,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import type { ISpydrNodeRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IUpdateNodeInput {
  title?: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class UpdateNodeCommand implements ICommand<DomainNode | null> {
  static readonly commandType = "nodes.update";
  readonly commandType = UpdateNodeCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly nodeId: string,
    readonly input: IUpdateNodeInput
  ) {}
}

export class UpdateNodeCommandHandler
  implements ICommandHandler<UpdateNodeCommand, DomainNode | null>
{
  readonly commandType = UpdateNodeCommand.commandType;

  constructor(
    private readonly nodes: ISpydrNodeRepository,
    private readonly tasks: ITaskRepository
  ) {}

  async execute(command: UpdateNodeCommand): Promise<DomainNode | null> {
    const existing = await this.nodes.get({
      id: command.nodeId,
      orgId: command.orgId,
    });
    if (!existing || existing.isDeleted) return null;

    if (existing.nodeType === "task") {
      return this.updateTask(command);
    }

    existing.applyCoreUpdate(command.input);
    return this.nodes.save(existing);
  }

  private async updateTask(command: UpdateNodeCommand): Promise<TaskNode | null> {
    const task = await this.tasks.get({
      id: command.nodeId,
      orgId: command.orgId,
    });
    if (!task || task.isDeleted) return null;

    task.applyUpdate({
      title: command.input.title,
      body: command.input.body,
      status: command.input.status as TaskStatus | undefined,
      priority: command.input.priority,
    });
    return this.tasks.save(task);
  }
}
