import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IPersonViews } from "../../people/views.js";
import { PersonMapper } from "../mappers/index.js";
import type { PersonNode } from "../models/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../shared/models/shared.js";

export interface ICreatePersonInput {
  fullName: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  clerkUserId?: string | null;
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
    private readonly personViews: IPersonViews,
    private readonly mapper = new PersonMapper()
  ) {}

  async execute(command: CreatePersonCommand): Promise<PersonNode> {
    const clerkUserId = command.input.clerkUserId?.trim() || null;
    if (clerkUserId) {
      const existing = await this.personViews.getByClerkUserId(clerkUserId);
      if (existing) {
        throw new Error("A person already exists for this Clerk user");
      }
    }

    const sortOrder = await this.personViews.nextSortOrderForOrg(command.orgId);
    const person = this.mapper.toModel(
      command.userId,
      command.orgId,
      { ...command.input, clerkUserId },
      new Date(),
      sortOrder
    );
    return this.people.save(person);
  }
}
