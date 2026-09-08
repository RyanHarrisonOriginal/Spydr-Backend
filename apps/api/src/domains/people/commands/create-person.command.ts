import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { PersonMapper } from "../mappers/index.js";
import type { PersonNode } from "../models/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../shared/models/shared.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";

export interface ICreatePersonInput {
  fullName: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class CreatePersonCommand implements ICommand<PersonNode> {
  static readonly commandType = "people.create";
  readonly commandType = CreatePersonCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ICreatePersonInput
  ) {}
}

export class CreatePersonCommandHandler
  implements ICommandHandler<CreatePersonCommand, PersonNode>
{
  readonly commandType = CreatePersonCommand.commandType;

  constructor(
    private readonly people: IPersonRepository,
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new PersonMapper()
  ) {}

  async execute(command: CreatePersonCommand): Promise<PersonNode> {
    const sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "person"
    );
    const person = this.mapper.toModel(
      command.userId,
      command.orgId,
      command.input,
      new Date(),
      sortOrder
    );
    return this.people.save(person);
  }
}
