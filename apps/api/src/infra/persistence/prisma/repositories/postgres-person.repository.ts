import type { PrismaClient } from "@prisma/client";
import type { IPersonRepository } from "../../../../domains/people/repository.js";
import type { PersonNode } from "../../../../domains/people/models/index.js";
import {
  personVisibleInOrgWhere,
  PrismaPersonMapper,
} from "../mappers/prisma-person.mapper.js";

export class PostgresPersonRepository implements IPersonRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaPersonMapper()
  ) {}

  async findById(id: string): Promise<PersonNode | null> {
    const row = await this.db.spydrPersonDetails.findUnique({
      where: { id },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async findByIdForOrg(id: string, orgId: string): Promise<PersonNode | null> {
    const row = await this.db.spydrPersonDetails.findFirst({
      where: {
        id,
        ...personVisibleInOrgWhere(orgId),
      },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async listByOrg(orgId: string): Promise<PersonNode[]> {
    const rows = await this.db.spydrPersonDetails.findMany({
      where: personVisibleInOrgWhere(orgId),
      orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }],
    });
    return rows.map((row) => this.mapper.toDomain(row));
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

  async reorderForOrg(orgId: string, orderedIds: readonly string[]): Promise<void> {
    if (orderedIds.length === 0) return;

    const rows = await this.db.spydrPersonDetails.findMany({
      where: personVisibleInOrgWhere(orgId),
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      select: { id: true },
    });

    if (rows.length === 0) return;

    const allIds = rows.map((row) => row.id);
    const allowedIds = new Set(allIds);
    const normalizedOrderedIds = orderedIds.filter((id) => allowedIds.has(id));
    const orderedSet = new Set(normalizedOrderedIds);
    const trailingIds = allIds.filter((id) => !orderedSet.has(id));
    const finalOrder = [...normalizedOrderedIds, ...trailingIds];

    if (finalOrder.length === 0) return;

    await this.db.$transaction(
      finalOrder.map((id, index) =>
        this.db.spydrPersonDetails.update({
          where: { id },
          data: { sortOrder: index * 1000 },
        })
      )
    );
  }

  async save(
    entity: PersonNode,
    options?: {
      strategy?: string;
      context?: { orgId?: string; orderedIds?: readonly string[] };
    }
  ): Promise<PersonNode> {
    const strategy = options?.strategy ?? "standard";
    if (strategy === "clearReferences") {
      const orgId = options?.context?.orgId ?? entity.orgId;
      await this.clearPersonReferences(orgId, entity.id);
      return entity;
    }
    if (strategy === "reorder") {
      const orgId = options?.context?.orgId ?? entity.orgId;
      const orderedIds = options?.context?.orderedIds;
      if (!orderedIds) {
        throw new Error("reorder strategy requires orderedIds");
      }
      await this.reorderForOrg(orgId, orderedIds);
      return entity;
    }

    const data = this.mapper.toPersistence(entity);
    const { id, ...updateData } = data;

    await this.db.spydrPersonDetails.upsert({
      where: { id },
      create: data,
      update: updateData,
    });

    const saved = await this.findByIdForOrg(entity.id, entity.orgId);
    if (!saved) {
      throw new Error("Failed to load saved person");
    }
    return saved;
  }

  async clearPersonReferences(orgId: string, personId: string): Promise<void> {
    const now = new Date();
    const projectNodeScope = { orgId, nodeType: "project" as const };

    await this.db.$transaction([
      this.db.spydrProjectDetails.updateMany({
        where: {
          requesterPersonId: personId,
          node: projectNodeScope,
        },
        data: { requesterPersonId: null, updatedAt: now },
      }),
      this.db.spydrProjectDetails.updateMany({
        where: {
          assigneePersonId: personId,
          node: projectNodeScope,
        },
        data: { assigneePersonId: null, updatedAt: now },
      }),
      this.db.spydrProjectDetails.updateMany({
        where: {
          sponsorPersonId: personId,
          node: projectNodeScope,
        },
        data: { sponsorPersonId: null, updatedAt: now },
      }),
      this.db.spydrProjectDetails.updateMany({
        where: {
          reviewerPersonId: personId,
          node: projectNodeScope,
        },
        data: { reviewerPersonId: null, updatedAt: now },
      }),
      this.db.spydrTaskDetails.updateMany({
        where: {
          assigneePersonId: personId,
          node: { orgId, nodeType: "task" },
        },
        data: { assigneePersonId: null, updatedAt: now },
      }),
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrPersonDetails.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
