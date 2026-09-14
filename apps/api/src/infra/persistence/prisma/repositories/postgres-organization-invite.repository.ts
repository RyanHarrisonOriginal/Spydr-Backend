import type { PrismaClient } from "@prisma/client";
import type { IOrganizationInviteRepository } from "../../../../domains/organizations/invite-repository.js";
import type { IOrganizationInviteViews } from "../../../../domains/organizations/invite-views.js";
import type { OrganizationInvite } from "../../../../domains/organizations/models/organization-invite.js";
import type { OrganizationMemberRole } from "../../../../domains/organizations/models/index.js";
import {
  OrganizationInviteMapper,
  normalizeInviteEmail,
} from "../../../../domains/organizations/mappers/organization-invite.mapper.js";

const inviteInclude = { organization: true } as const;

export class PostgresOrganizationInviteRepository
  implements IOrganizationInviteRepository, IOrganizationInviteViews
{
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new OrganizationInviteMapper()
  ) {}

  async get(criteria: { id: string }): Promise<OrganizationInvite | null> {
    const row = await this.db.organizationInvite.findUnique({
      where: { id: criteria.id },
      include: inviteInclude,
    });
    return row ? this.toDomain(row) : null;
  }

  async getByToken(token: string): Promise<OrganizationInvite | null> {
    const row = await this.db.organizationInvite.findUnique({
      where: { token },
      include: inviteInclude,
    });
    return row ? this.toDomain(row) : null;
  }

  async listPendingByOrg(orgId: string): Promise<OrganizationInvite[]> {
    const rows = await this.db.organizationInvite.findMany({
      where: {
        organizationId: orgId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: inviteInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async listPendingByEmails(emails: string[]): Promise<OrganizationInvite[]> {
    const normalized = emails.map(normalizeInviteEmail).filter(Boolean);
    if (normalized.length === 0) return [];

    const rows = await this.db.organizationInvite.findMany({
      where: {
        email: { in: normalized },
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: inviteInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findPendingByOrgEmail(
    orgId: string,
    email: string
  ): Promise<OrganizationInvite | null> {
    const row = await this.db.organizationInvite.findFirst({
      where: {
        organizationId: orgId,
        email: normalizeInviteEmail(email),
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      include: inviteInclude,
    });
    return row ? this.toDomain(row) : null;
  }

  async save(entity: OrganizationInvite): Promise<OrganizationInvite> {
    await this.db.organizationInvite.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        organizationId: entity.organizationId,
        email: entity.email,
        role: entity.role,
        invitedByUserId: entity.invitedByUserId,
        token: entity.token,
        status: entity.status,
        expiresAt: entity.expiresAt,
        acceptedAt: entity.acceptedAt,
        acceptedByUserId: entity.acceptedByUserId,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
      update: {
        status: entity.status,
        expiresAt: entity.expiresAt,
        acceptedAt: entity.acceptedAt,
        acceptedByUserId: entity.acceptedByUserId,
        updatedAt: entity.updatedAt,
      },
    });

    const saved = await this.get({ id: entity.id });
    if (!saved) {
      throw new Error("Failed to load saved invite");
    }
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.organizationInvite.delete({ where: { id } });
  }

  private toDomain(row: {
    id: string;
    organizationId: string;
    email: string;
    role: OrganizationMemberRole;
    invitedByUserId: string;
    token: string;
    status: OrganizationInvite["status"];
    expiresAt: Date;
    acceptedAt: Date | null;
    acceptedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    organization: { name: string };
  }): OrganizationInvite {
    return this.mapper.toDomain({
      id: row.id,
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      email: row.email,
      role: row.role,
      invitedByUserId: row.invitedByUserId,
      token: row.token,
      status: row.status,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt,
      acceptedByUserId: row.acceptedByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
