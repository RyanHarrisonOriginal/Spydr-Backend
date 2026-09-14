import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IPersonViews } from "../../people/views.js";
import type { IClerkProfileReader } from "../clerk-profile.js";
import type { PersonNode } from "../models/index.js";

export class SyncPersonFromClerkCommand implements ICommand<PersonNode | null> {
  static readonly commandType = "people.syncFromClerk";
  readonly commandType = SyncPersonFromClerkCommand.commandType;

  constructor(readonly userId: string) {}
}

export class SyncPersonFromClerkCommandHandler
  implements ICommandHandler<SyncPersonFromClerkCommand, PersonNode | null>
{
  readonly commandType = SyncPersonFromClerkCommand.commandType;

  constructor(
    private readonly people: IPersonRepository,
    private readonly personViews: IPersonViews,
    private readonly clerkProfiles: IClerkProfileReader
  ) {}

  async execute(command: SyncPersonFromClerkCommand): Promise<PersonNode | null> {
    const person = await this.personViews.getByClerkUserId(command.userId);
    if (!person || person.isDeleted) {
      return null;
    }

    const profile = await this.clerkProfiles.getByUserId(command.userId);
    if (!profile) {
      return person;
    }

    const changed = person.syncFromClerk({
      email: profile.primaryEmail,
      fullName: profile.fullName,
    });
    if (!changed) {
      return person;
    }

    return this.people.save(person);
  }
}
