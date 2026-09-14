import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ICommandBus } from "../../shared/application/command-bus.js";
import type { IOrganizationRepository } from "../repository.js";
import type { IOrganizationInviteRepository } from "../invite-repository.js";
import type { IOrganizationInviteViews } from "../invite-views.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IPersonViews } from "../../people/views.js";
import { CreatePersonCommand } from "../../people/commands/create-person.command.js";
import type { OrganizationInvite } from "../models/organization-invite.js";
import type { PersonNode } from "../../people/models/index.js";

export class AcceptOrganizationInviteCommand implements ICommand<OrganizationInvite> {
  static readonly commandType = "organizations.acceptInvite";
  readonly commandType = AcceptOrganizationInviteCommand.commandType;

  constructor(
    readonly userId: string,
    readonly token: string,
    readonly emails: string[],
    readonly fullName?: string | null
  ) {}
}

export class AcceptOrganizationInviteCommandHandler
  implements ICommandHandler<AcceptOrganizationInviteCommand, OrganizationInvite>
{
  readonly commandType = AcceptOrganizationInviteCommand.commandType;

  constructor(
    private readonly invites: IOrganizationInviteRepository,
    private readonly inviteViews: IOrganizationInviteViews,
    private readonly organizations: IOrganizationRepository,
    private readonly people: IPersonRepository,
    private readonly personViews: IPersonViews,
    private readonly commandBus: ICommandBus
  ) {}

  async execute(
    command: AcceptOrganizationInviteCommand
  ): Promise<OrganizationInvite> {
    const loaded = await this.inviteViews.getByToken(command.token);
    if (!loaded) {
      throw new Error("Invite not found");
    }

    const invite = await this.invites.get({ id: loaded.id });
    if (!invite) {
      throw new Error("Invite not found");
    }

    invite.accept(command.userId, command.emails);

    const person = await this.resolvePerson(command, invite);
    const org = await this.organizations.get({ id: invite.organizationId });
    if (!org) {
      throw new Error("Organization not found");
    }

    await this.organizations.save(org, {
      strategy: "addMember",
      context: {
        userId: command.userId,
        personId: person.id,
        role: invite.role,
      },
    });

    return this.invites.save(invite);
  }

  private async resolvePerson(
    command: AcceptOrganizationInviteCommand,
    invite: OrganizationInvite
  ): Promise<PersonNode> {
    const byClerk = await this.personViews.getByClerkUserId(command.userId);
    if (byClerk) {
      return byClerk;
    }

    const byEmail = await this.personViews.getByEmailInOrg(
      invite.organizationId,
      invite.email
    );
    if (byEmail && !byEmail.details?.clerkUserId) {
      byEmail.linkClerkUser(command.userId);
      if (!byEmail.details?.email) {
        byEmail.setEmail(invite.email);
      }
      return this.people.save(byEmail);
    }

    const fullName =
      command.fullName?.trim() ||
      invite.email.split("@")[0] ||
      "Member";

    return this.commandBus.execute(
      new CreatePersonCommand(command.userId, invite.organizationId, {
        fullName,
        email: invite.email,
        organization: invite.organizationName,
        clerkUserId: command.userId,
      })
    );
  }
}
