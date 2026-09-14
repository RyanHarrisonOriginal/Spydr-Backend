import type { PrismaClient } from "@prisma/client";
import type {
  IAddOrganizationMemberContext,
  ICreateOrganizationInput,
  ILinkMemberPersonContext,
  IOrganizationRepository,
  IRemoveOrganizationMemberContext,
  OrganizationSaveContext,
} from "../../../../domains/organizations/repository.js";
import type {
  IOrganizationMemberView,
} from "../../../../domains/organizations/views.js";
import {
  Organization,
  type OrganizationMemberRole,
} from "../../../../domains/organizations/models/index.js";
import { slugifyOrganizationName } from "../../../../domains/shared/utils/slugify.js";

const memberPersonInclude = {
  person: true,
} as const;

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
    options?: {
      strategy?: string;
      context?: OrganizationSaveContext;
    }
  ): Promise<Organization> {
    const strategy = options?.strategy ?? "standard";
    if (strategy === "createForUser") {
      const context = options?.context as IAddOrganizationMemberContext | undefined;
      if (!context?.userId) {
        throw new Error("createForUser strategy requires userId context");
      }
      return this.createForUser(context.userId, entity as ICreateOrganizationInput, context);
    }
    if (strategy === "addMember") {
      const context = options?.context as IAddOrganizationMemberContext | undefined;
      if (!context?.userId) {
        throw new Error("addMember strategy requires userId context");
      }
      if (!("id" in entity)) {
        throw new Error("addMember strategy requires an organization");
      }
      return this.addMember(entity, context);
    }
    if (strategy === "linkMemberPerson") {
      const context = options?.context as ILinkMemberPersonContext | undefined;
      if (!context?.userId || !context.personId) {
        throw new Error("linkMemberPerson strategy requires userId and personId");
      }
      if (!("id" in entity)) {
        throw new Error("linkMemberPerson strategy requires an organization");
      }
      return this.linkMemberPerson(entity, context);
    }
    if (strategy === "removeMember") {
      const context = options?.context as IRemoveOrganizationMemberContext | undefined;
      if (!context?.memberId) {
        throw new Error("removeMember strategy requires memberId context");
      }
      if (!("id" in entity)) {
        throw new Error("removeMember strategy requires an organization");
      }
      return this.removeMember(entity, context);
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

  private async createForUser(
    userId: string,
    input: ICreateOrganizationInput,
    context: IAddOrganizationMemberContext
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
          personId: context.personId ?? null,
          role: context.role ?? "owner",
        },
      });

      return organization;
    });

    return this.toDomain(created, context.role ?? "owner");
  }

  private async addMember(
    org: Organization,
    context: IAddOrganizationMemberContext
  ): Promise<Organization> {
    if (!context.personId) {
      throw new Error("addMember strategy requires personId");
    }

    await this.db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: context.userId,
        },
      },
      create: {
        organizationId: org.id,
        userId: context.userId,
        personId: context.personId,
        role: context.role ?? "member",
      },
      update: {
        personId: context.personId,
      },
    });

    return (await this.findByIdForUser(org.id, context.userId)) ?? org;
  }

  private async removeMember(
    org: Organization,
    context: IRemoveOrganizationMemberContext
  ): Promise<Organization> {
    const result = await this.db.organizationMember.deleteMany({
      where: {
        id: context.memberId,
        organizationId: org.id,
      },
    });
    if (result.count === 0) {
      throw new Error("Member not found");
    }
    return org;
  }

  private async linkMemberPerson(
    org: Organization,
    context: ILinkMemberPersonContext
  ): Promise<Organization> {
    await this.db.organizationMember.updateMany({
      where: {
        organizationId: org.id,
        userId: context.userId,
        personId: null,
      },
      data: { personId: context.personId },
    });

    return this.findByIdForUser(org.id, context.userId) ?? org;
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
