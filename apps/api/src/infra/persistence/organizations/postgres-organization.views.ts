import type { PrismaClient } from "@prisma/client";
import type {
  IOrganizationMemberView,
  IOrganizationViews,
} from "../../../domains/organizations/views.js";
import {
  Organization,
  type OrganizationMemberRole,
} from "../../../domains/organizations/models/index.js";

const memberPersonInclude = {
  person: true,
} as const;

export class PostgresOrganizationViews implements IOrganizationViews {
  constructor(private readonly db: PrismaClient) {}

  async listForUser(userId: string): Promise<Organization[]> {
    const rows = await this.db.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { organization: { name: "asc" } },
    });

    return rows.map((row) => this.toDomain(row.organization, row.role));
  }

  async isMember(userId: string, orgId: string): Promise<boolean> {
    const row = await this.db.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getMemberRole(
    userId: string,
    orgId: string
  ): Promise<OrganizationMemberRole | null> {
    const row = await this.db.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
      select: { role: true },
    });
    return row ? (row.role as OrganizationMemberRole) : null;
  }

  async listMembers(orgId: string): Promise<IOrganizationMemberView[]> {
    const rows = await this.db.organizationMember.findMany({
      where: { organizationId: orgId },
      include: memberPersonInclude,
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => this.toMemberView(row));
  }

  async getMemberById(
    orgId: string,
    memberId: string
  ): Promise<IOrganizationMemberView | null> {
    const row = await this.db.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: memberPersonInclude,
    });
    return row ? this.toMemberView(row) : null;
  }

  async getMemberByUserId(
    orgId: string,
    userId: string
  ): Promise<IOrganizationMemberView | null> {
    const row = await this.db.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
      include: memberPersonInclude,
    });
    return row ? this.toMemberView(row) : null;
  }

  private toMemberView(row: {
    id: string;
    organizationId: string;
    userId: string;
    personId: string;
    role: OrganizationMemberRole;
    createdAt: Date;
    person: {
      id: string;
      fullName: string;
      email: string | null;
      clerkUserId: string | null;
    } | null;
  }): IOrganizationMemberView {
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      personId: row.personId,
      role: row.role,
      createdAt: row.createdAt,
      person: row.person
        ? {
            id: row.person.id,
            fullName: row.person.fullName,
            email: row.person.email,
            clerkUserId: row.person.clerkUserId,
          }
        : null,
    };
  }

  private toDomain(
    row: {
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
    },
    role: OrganizationMemberRole
  ): Organization {
    return new Organization({
      id: row.id,
      name: row.name,
      slug: row.slug,
      role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
