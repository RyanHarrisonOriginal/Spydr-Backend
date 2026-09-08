import type { PrismaClient } from "@prisma/client";
import type {
  ICreateOrganizationInput,
  IOrganizationRepository,
} from "../../../../domains/organizations/repository.js";
import {
  Organization,
  type OrganizationMemberRole,
} from "../../../../domains/organizations/models/index.js";
import { slugifyOrganizationName } from "../../../../domains/shared/utils/slugify.js";

export class PostgresOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly db: PrismaClient) {}

  async get(criteria: {
    id: string;
    userId?: string;
  }): Promise<Organization | null> {
    if (criteria.userId) {
      return this.findByIdForUser(criteria.id, criteria.userId);
    }

    const row = await this.db.organization.findUnique({
      where: { id: criteria.id },
    });
    return row ? this.toDomain(row, "member") : null;
  }

  async save(
    entity: Organization | ICreateOrganizationInput,
    options?: { strategy?: string; context?: { userId: string } }
  ): Promise<Organization> {
    const strategy = options?.strategy ?? "standard";
    if (strategy === "createForUser") {
      const userId = options?.context?.userId;
      if (!userId) {
        throw new Error("createForUser strategy requires userId context");
      }
      return this.createForUser(userId, entity as ICreateOrganizationInput);
    }

    throw new Error(`Unsupported organization save strategy: ${strategy}`);
  }

  async delete(id: string): Promise<void> {
    await this.db.organization.delete({ where: { id } });
  }

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

  private async createForUser(
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
