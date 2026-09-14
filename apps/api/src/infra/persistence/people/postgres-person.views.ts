import type { PrismaClient } from "@prisma/client";
import type { IPersonViews } from "../../../domains/people/views.js";
import type { PersonNode } from "../../../domains/people/models/index.js";
import {
  personVisibleInOrgWhere,
  PrismaPersonMapper,
} from "../prisma/mappers/prisma-person.mapper.js";

export class PostgresPersonViews implements IPersonViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaPersonMapper()
  ) {}

  async listByOrg(orgId: string): Promise<PersonNode[]> {
    const rows = await this.db.spydrPersonDetails.findMany({
      where: personVisibleInOrgWhere(orgId),
      orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }],
    });
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async getById(orgId: string, personId: string): Promise<PersonNode | null> {
    const row = await this.db.spydrPersonDetails.findFirst({
      where: {
        id: personId,
        ...personVisibleInOrgWhere(orgId),
      },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async getByClerkUserId(clerkUserId: string): Promise<PersonNode | null> {
    const row = await this.db.spydrPersonDetails.findFirst({
      where: {
        clerkUserId,
        isDeleted: false,
      },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async getByEmailInOrg(orgId: string, email: string): Promise<PersonNode | null> {
    const normalized = email.trim();
    if (!normalized) return null;

    const row = await this.db.spydrPersonDetails.findFirst({
      where: {
        orgId,
        isDeleted: false,
        email: { equals: normalized, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async nextSortOrderForOrg(orgId: string): Promise<number> {
    const result = await this.db.spydrPersonDetails.aggregate({
      where: { orgId, isDeleted: false },
      _max: { sortOrder: true },
    });

    const currentMax = result._max.sortOrder;
    return (currentMax ?? -1000) + 1000;
  }
}
