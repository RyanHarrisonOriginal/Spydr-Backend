import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IOrganizationRepository } from "../repository.js";
import type { IOrganizationViews } from "../views.js";
import type { IOrganizationInviteRepository } from "../invite-repository.js";
import type { IOrganizationInviteViews } from "../invite-views.js";
import type { OrganizationInvite } from "../models/organization-invite.js";
import type { OrganizationMemberRole } from "../models/index.js";
import {
  OrganizationInviteMapper,
  normalizeInviteEmail,
} from "../mappers/organization-invite.mapper.js";
import type { IClerkInvitationSender } from "../invitation-sender.js";

const INVITE_ROLES: OrganizationMemberRole[] = ["owner", "admin", "member"];

export interface IInviteOrganizationMemberInput {
  email: string;
  role?: OrganizationMemberRole;
}

export class InviteOrganizationMemberCommand implements ICommand<OrganizationInvite> {
  static readonly commandType = "organizations.inviteMember";
  readonly commandType = InviteOrganizationMemberCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: IInviteOrganizationMemberInput
  ) {}
}

export class InviteOrganizationMemberCommandHandler
  implements ICommandHandler<InviteOrganizationMemberCommand, OrganizationInvite>
{
  readonly commandType = InviteOrganizationMemberCommand.commandType;

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly organizationViews: IOrganizationViews,
    private readonly invites: IOrganizationInviteRepository,
    private readonly inviteViews: IOrganizationInviteViews,
    private readonly invitationSender: IClerkInvitationSender,
    private readonly mapper = new OrganizationInviteMapper()
  ) {}

  async execute(
    command: InviteOrganizationMemberCommand
  ): Promise<OrganizationInvite> {
    const org = await this.organizations.get({
      id: command.orgId,
      userId: command.userId,
    });
    if (!org) {
      throw new Error("Not a member of this organization");
    }

    const role = command.input.role ?? "member";
    if (!INVITE_ROLES.includes(role)) {
      throw new Error("Invalid member role");
    }
    if (!org.canInvite(role)) {
      throw new Error("You do not have permission to invite this role");
    }

    const email = normalizeInviteEmail(command.input.email);
    const existingInvite = await this.inviteViews.findPendingByOrgEmail(
      command.orgId,
      email
    );
    if (existingInvite) {
      throw new Error("A pending invite already exists for this email");
    }

    const members = await this.organizationViews.listMembers(command.orgId);
    const alreadyMember = members.some(
      (member) => member.person?.email?.trim().toLowerCase() === email
    );
    if (alreadyMember) {
      throw new Error("A member with this email already belongs to the organization");
    }

    const invite = this.mapper.toModel({
      organizationId: org.id,
      organizationName: org.name,
      email,
      role,
      invitedByUserId: command.userId,
    });

    const saved = await this.invites.save(invite);
    await this.invitationSender.send({
      email: saved.email,
      token: saved.token,
      organizationName: saved.organizationName,
    });
    return saved;
  }
}
