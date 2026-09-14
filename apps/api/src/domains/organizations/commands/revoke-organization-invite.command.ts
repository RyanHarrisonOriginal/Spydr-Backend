import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IOrganizationRepository } from "../repository.js";
import type { IOrganizationInviteRepository } from "../invite-repository.js";
import type { OrganizationInvite } from "../models/organization-invite.js";

export class RevokeOrganizationInviteCommand implements ICommand<OrganizationInvite> {
  static readonly commandType = "organizations.revokeInvite";
  readonly commandType = RevokeOrganizationInviteCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly inviteId: string
  ) {}
}

export class RevokeOrganizationInviteCommandHandler
  implements ICommandHandler<RevokeOrganizationInviteCommand, OrganizationInvite>
{
  readonly commandType = RevokeOrganizationInviteCommand.commandType;

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly invites: IOrganizationInviteRepository
  ) {}

  async execute(
    command: RevokeOrganizationInviteCommand
  ): Promise<OrganizationInvite> {
    const org = await this.organizations.get({
      id: command.orgId,
      userId: command.userId,
    });
    if (!org) {
      throw new Error("Not a member of this organization");
    }
    if (!org.canManageMembers()) {
      throw new Error("You do not have permission to revoke invites");
    }

    const invite = await this.invites.get({ id: command.inviteId });
    if (!invite || invite.organizationId !== command.orgId) {
      throw new Error("Invite not found");
    }

    invite.revoke();
    return this.invites.save(invite);
  }
}
