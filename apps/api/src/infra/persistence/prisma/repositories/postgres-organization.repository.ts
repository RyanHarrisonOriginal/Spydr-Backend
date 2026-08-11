import type { PrismaClient } from "@prisma/client";
import type {
  ICreateOrganizationInput,
  IOrganizationRepository,
} from "../../../../domain/interfaces/organization-repository.js";
import {
  Organization,
  type OrganizationMemberRole,
} from "../../../../domain/models/organizations/index.js";
import { slugifyOrganizationName } from "../../../../domain/utils/slugify.js";

export class PostgresOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: PrismaClient) {}

  async listForUser(userId: string): Promise<Organization[]> {
    const rows = await this.db.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { organization: { name: "asc" } },
    });

    return rows.map((row) => this.toDomain(row.organization, row.role));
  }

  async findByIdForUser(id: string, userId: string): Promise<Organization | null> {
    const row = await this.db.organizationMember.findFirst({
      where: { organizationId: id, userId },
      include: { organization: true },
    });

    return row ? this.toDomain(row.organization, row.role) : null;
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

  async createForUser(
    userId: string,
    input: ICreateOrganizationInput
  ): Promise<Organization> {
    const name = input.name.trim();
    if (!name) {
      throw new Error("Organization name is required");
    }

    const slug = slugifyOrganizationName(name);

    const created = await this.db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name, slug },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: "owner",
        },
      });

      return organization;
    });

    return this.toDomain(created, "owner");
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
