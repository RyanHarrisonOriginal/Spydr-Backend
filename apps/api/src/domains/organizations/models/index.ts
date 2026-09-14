export type OrganizationMemberRole = "owner" | "admin" | "member";

export {
  OrganizationInvite,
  type OrganizationInviteStatus,
  type IOrganizationInviteProps,
} from "./organization-invite.js";

export interface IOrganizationProps {
  id: string;
  name: string;
  slug: string;
  role: OrganizationMemberRole;
  createdAt: Date;
  updatedAt: Date;
}

export class Organization {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly role: OrganizationMemberRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: IOrganizationProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.role = props.role;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  canInvite(targetRole: OrganizationMemberRole): boolean {
    if (this.role === "owner") return true;
    if (this.role === "admin") return targetRole === "admin" || targetRole === "member";
    return false;
  }

  canManageMembers(): boolean {
    return this.role === "owner" || this.role === "admin";
  }

  assertCanAddMember(targetRole: OrganizationMemberRole): void {
    if (!this.canManageMembers()) {
      throw new Error("You do not have permission to add members");
    }
    if (!this.canInvite(targetRole)) {
      throw new Error("You do not have permission to assign this role");
    }
  }

  assertCanRemoveMember(input: {
    targetRole: OrganizationMemberRole;
    ownerCount: number;
  }): void {
    if (!this.canManageMembers()) {
      throw new Error("You do not have permission to remove members");
    }
    if (this.role !== "owner" && input.targetRole === "owner") {
      throw new Error("You do not have permission to remove an owner");
    }
    if (input.targetRole === "owner" && input.ownerCount <= 1) {
      throw new Error("Cannot remove the last owner");
    }
  }
}
