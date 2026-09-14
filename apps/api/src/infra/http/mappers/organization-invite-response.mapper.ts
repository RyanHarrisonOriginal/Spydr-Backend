import type { OrganizationInvite } from "../../../domains/organizations/models/organization-invite.js";
import type { IOrganizationMemberView } from "../../../domains/organizations/views.js";

export class OrganizationInviteResponseMapper {
  toRepresentation(invite: OrganizationInvite, options?: { includeToken?: boolean }) {
    return {
      id: invite.id,
      organizationId: invite.organizationId,
      organizationName: invite.organizationName,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      ...(options?.includeToken ? { token: invite.token } : {}),
    };
  }
}

export class OrganizationMemberResponseMapper {
  toRepresentation(member: IOrganizationMemberView) {
    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      personId: member.personId,
      role: member.role,
      createdAt: member.createdAt.toISOString(),
      person: member.person
        ? {
            id: member.person.id,
            fullName: member.person.fullName,
            email: member.person.email,
            clerkUserId: member.person.clerkUserId,
          }
        : null,
    };
  }
}
