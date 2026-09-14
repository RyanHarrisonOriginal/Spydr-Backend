import { randomBytes, randomUUID } from "node:crypto";
import {
  OrganizationInvite,
  type OrganizationInviteStatus,
} from "../models/organization-invite.js";
import type { OrganizationMemberRole } from "../models/index.js";

export interface ICreateOrganizationInviteInput {
  organizationId: string;
  organizationName: string;
  email: string;
  role: OrganizationMemberRole;
  invitedByUserId: string;
  expiresAt?: Date;
}

const DEFAULT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class OrganizationInviteMapper {
  toModel(input: ICreateOrganizationInviteInput, now = new Date()): OrganizationInvite {
    const email = normalizeInviteEmail(input.email);
    if (!email || !email.includes("@")) {
      throw new Error("A valid email is required");
    }

    return new OrganizationInvite({
      id: randomUUID(),
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      email,
      role: input.role,
      invitedByUserId: input.invitedByUserId,
      token: randomBytes(32).toString("hex"),
      status: "pending",
      expiresAt: input.expiresAt ?? new Date(now.getTime() + DEFAULT_TTL_MS),
      acceptedAt: null,
      acceptedByUserId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  toDomain(row: {
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
  }): OrganizationInvite {
    return new OrganizationInvite(row);
  }
}
