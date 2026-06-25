import type { ICommand, ICommandHandler } from "../command.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import { PersonMapper } from "../../../mappers/people/index.js";
import type { PersonNode } from "../../../models/people/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../../models/shared.js";

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
    readonly input: ICreatePersonInput
  ) {}
}

export class CreatePersonCommandHandler
  implements ICommandHandler<CreatePersonCommand, PersonNode>
{
  readonly commandType = CreatePersonCommand.commandType;

  constructor(
    private readonly people: IPersonRepository,
    private readonly mapper = new PersonMapper()
  ) {}

  async execute(command: CreatePersonCommand): Promise<PersonNode> {
    const person = this.mapper.toModel(command.userId, command.input);
    return this.people.save(person);
  }
}
