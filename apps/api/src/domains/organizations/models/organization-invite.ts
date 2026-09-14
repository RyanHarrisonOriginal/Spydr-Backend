import type { OrganizationMemberRole } from "./index.js";

export type OrganizationInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface IOrganizationInviteProps {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: OrganizationMemberRole;
  invitedByUserId: string;
  token: string;
  status: OrganizationInviteStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationInvite {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly email: string;
  readonly role: OrganizationMemberRole;
  readonly invitedByUserId: string;
  readonly token: string;
  status: OrganizationInviteStatus;
  readonly expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: IOrganizationInviteProps) {
    this.id = props.id;
    this.organizationId = props.organizationId;
    this.organizationName = props.organizationName;
    this.email = props.email;
    this.role = props.role;
    this.invitedByUserId = props.invitedByUserId;
    this.token = props.token;
    this.status = props.status;
    this.expiresAt = props.expiresAt;
    this.acceptedAt = props.acceptedAt;
    this.acceptedByUserId = props.acceptedByUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isExpired(now = new Date()): boolean {
    return this.expiresAt <= now;
  }

  assertAcceptable(emails: string[], now = new Date()): void {
    if (this.status === "expired" || this.isExpired(now)) {
      this.status = "expired";
      throw new Error("Invite has expired");
    }
    if (this.status === "revoked") {
      throw new Error("Invite has been revoked");
    }
    if (this.status === "accepted") {
      throw new Error("Invite has already been accepted");
    }
    if (this.status !== "pending") {
      throw new Error("Invite is no longer pending");
    }

    const allowed = new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean));
    if (!allowed.has(this.email)) {
      throw new Error("This invite was sent to a different email address");
    }
  }

  accept(userId: string, emails: string[], now = new Date()): void {
    this.assertAcceptable(emails, now);
    this.status = "accepted";
    this.acceptedAt = now;
    this.acceptedByUserId = userId;
    this.touch(now);
  }

  revoke(now = new Date()): void {
    if (this.status !== "pending") {
      throw new Error("Invite is no longer pending");
    }
    this.status = "revoked";
    this.touch(now);
  }

  private touch(now = new Date()): void {
    this.updatedAt = now;
  }
}
