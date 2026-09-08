import type { Prisma, PrismaClient } from "@prisma/client";
import type { INodeTypeTransformRepository } from "../../../../domains/node-type-transform/repository.js";
import {
  assertTransformAllowed,
  defaultProjectDetailsFromSource,
  defaultTaskDetailsFromSource,
  isTransformableNodeType,
  toProjectStatus,
  toTaskStatus,
  type INodeTypeSnapshot,
  type INodeTypeTransformRequest,
  type INodeTypeTransformResult,
  type TransformableNodeType,
} from "../../../../domains/node-type-transform/index.js";
import { findProjectIdForChildNode } from "../find-project-for-child-node.js";

const PROJECT_CHILD_NODE_TYPES = [
  "task",
  "decision",
  "idea",
  "note",
  "resource",
] as const;

const IGNORABLE_PROJECT_RELATION_NODE_TYPES = ["person", "project_area"] as const;

type ProjectChildNodeType = (typeof PROJECT_CHILD_NODE_TYPES)[number];

type MovableProjectChild = {
  id: string;
  nodeType: ProjectChildNodeType;
  tags: string[];
  userId: string;
};

type NodeWithDetails = Prisma.SpydrNodeGetPayload<{
  include: {
    taskDetails: true;
    projectDetails: true;
    ideaDetails: true;
  };
}>;

export class PostgresNodeTypeTransformRepository
  implements INodeTypeTransformRepository
{
  constructor(private readonly db: PrismaClient) {}

  async transform(
    request: INodeTypeTransformRequest
  ): Promise<INodeTypeTransformResult> {
    const row = await this.db.spydrNode.findFirst({
      where: {
        id: request.nodeId,
        orgId: request.orgId,
        isDeleted: false,
      },
      include: {
        taskDetails: true,
        projectDetails: true,
        ideaDetails: true,
      },
    });

    if (!row) {
      throw new Error("Node not found");
    }

    if (!isTransformableNodeType(row.nodeType)) {
      throw new Error(`Node type ${row.nodeType} cannot be transformed`);
    }

    const fromType = row.nodeType;
    assertTransformAllowed(fromType, request.targetType);

    const now = new Date();
    const snapshot = this.buildSnapshot(row);
    const nextSortOrder = await this.nextSortOrder(request.orgId, request.targetType);

    if (fromType === "project" && request.targetType === "task") {
      return this.transformProjectToTask(request, row, snapshot, now, nextSortOrder);
    }
    if (fromType === "project" && request.targetType === "note") {
      return this.transformProjectToNote(request, row, snapshot, now, nextSortOrder);
    }
    if (fromType === "task" && request.targetType === "project") {
      return this.transformTaskToProject(request, row, snapshot, now, nextSortOrder);
    }
    if (fromType === "note") {
      return request.targetType === "task"
        ? this.transformNoteToTask(request, row, snapshot, now, nextSortOrder)
        : this.transformNoteToProject(request, row, snapshot, now, nextSortOrder);
    }

    return request.targetType === "task"
      ? this.transformIdeaToTask(request, row, snapshot, now, nextSortOrder)
      : this.transformIdeaToProject(request, row, snapshot, now, nextSortOrder);
  }

  private async transformProjectToTask(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const targetProjectId = await this.resolveNestedTransformTargetProject(
      request,
      row.id,
      "task"
    );

    const linkedChildren = await this.loadMovableProjectChildren(
      request.orgId,
      row.id
    );

    const projectAreaTag = await this.loadLinkedProjectAreaTitle(
      request.orgId,
      row.id,
      row.area
    );

    const taskDetails = {
      ...defaultTaskDetailsFromSource({
        now,
        status: row.status,
        projectDetails: row.projectDetails,
      }),
      tags: projectAreaTag ? this.appendTag([], projectAreaTag) : [],
    };

    const transformedTaskTags = projectAreaTag
      ? this.appendTag([...row.tags], projectAreaTag)
      : [...row.tags];

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "task",
        snapshot,
        now
      );

      if (linkedChildren.length > 0) {
        await this.migrateProjectChildrenToTarget(tx, {
          orgId: request.orgId,
          userId: request.userId,
          fromProjectId: row.id,
          targetProjectId,
          provenanceTag: row.title,
          children: linkedChildren,
          now,
        });
      }

      await this.finalizeProjectRemoval(tx, request.orgId, row.id);

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "task",
          status: toTaskStatus(row.status),
          sortOrder,
          tags: transformedTaskTags,
          updatedAt: now,
        },
      });

      await tx.spydrTaskDetails.create({
        data: {
          nodeId: row.id,
          ...taskDetails,
        },
      });

      await tx.spydrNodeRelationship.create({
        data: {
          orgId: request.orgId,
          userId: request.userId,
          sourceNodeId: targetProjectId,
          targetNodeId: row.id,
          relationshipType: "related_to",
          reason: "Project task",
        },
      });

      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "task", now);
    });

    return {
      nodeId: row.id,
      previousType: "project",
      currentType: "task",
      projectId: targetProjectId,
      transformedAt: now,
    };
  }

  private async transformProjectToNote(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const targetProjectId = await this.resolveNestedTransformTargetProject(
      request,
      row.id,
      "note"
    );

    const linkedChildren = await this.loadMovableProjectChildren(
      request.orgId,
      row.id
    );

    const projectAreaTag = await this.loadLinkedProjectAreaTitle(
      request.orgId,
      row.id,
      row.area
    );

    const transformedNoteTags = projectAreaTag
      ? this.appendTag([...row.tags], projectAreaTag)
      : [...row.tags];

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "note",
        snapshot,
        now
      );

      if (linkedChildren.length > 0) {
        await this.migrateProjectChildrenToTarget(tx, {
          orgId: request.orgId,
          userId: request.userId,
          fromProjectId: row.id,
          targetProjectId,
          provenanceTag: row.title,
          children: linkedChildren,
          now,
        });
      }

      await this.finalizeProjectRemoval(tx, request.orgId, row.id);

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "note",
          sortOrder,
          tags: transformedNoteTags,
          updatedAt: now,
        },
      });

      await tx.spydrNodeRelationship.create({
        data: {
          orgId: request.orgId,
          userId: request.userId,
          sourceNodeId: targetProjectId,
          targetNodeId: row.id,
          relationshipType: "related_to",
          reason: "Project note",
        },
      });

      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "note", now);
    });

    return {
      nodeId: row.id,
      previousType: "project",
      currentType: "note",
      projectId: targetProjectId,
      transformedAt: now,
    };
  }

  private async resolveNestedTransformTargetProject(
    request: INodeTypeTransformRequest,
    sourceProjectId: string,
    nestedType: "task" | "note"
  ): Promise<string> {
    const targetProjectId = request.projectId?.trim();
    if (!targetProjectId) {
      throw new Error(
        `Target project is required when transforming a project into a ${nestedType}`
      );
    }
    if (targetProjectId === sourceProjectId) {
      throw new Error(`Choose a different project to nest the ${nestedType} under`);
    }

    const targetProject = await this.db.spydrNode.findFirst({
      where: {
        id: targetProjectId,
        orgId: request.orgId,
        nodeType: "project",
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!targetProject) {
      throw new Error("Target project not found");
    }

    return targetProjectId;
  }

  private async finalizeProjectRemoval(
    tx: Prisma.TransactionClient,
    orgId: string,
    projectId: string
  ): Promise<void> {
    await tx.spydrProjectDetails.deleteMany({ where: { nodeId: projectId } });
    await tx.spydrActiveNoteProjectRetrievalContext.deleteMany({
      where: { projectId },
    });
    await tx.spydrNodeRelationship.deleteMany({
      where: {
        orgId,
        OR: [{ sourceNodeId: projectId }, { targetNodeId: projectId }],
      },
    });
  }

  private async transformTaskToProject(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const projectDetails = defaultProjectDetailsFromSource({
      now,
      priority: row.priority,
      taskDetails: row.taskDetails,
    });

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "project",
        snapshot,
        now
      );
      await tx.spydrTaskDetails.deleteMany({ where: { nodeId: row.id } });
      await this.removeProjectParentRelationships(tx, request.orgId, row.id);

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "project",
          status: toProjectStatus(row.status),
          sortOrder,
          updatedAt: now,
        },
      });

      await tx.spydrProjectDetails.create({
        data: {
          nodeId: row.id,
          ...projectDetails,
        },
      });

      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "project", now);
    });

    return {
      nodeId: row.id,
      previousType: "task",
      currentType: "project",
      projectId: row.id,
      transformedAt: now,
    };
  }

  private async transformNoteToTask(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const projectId =
      request.projectId?.trim() ??
      (await findProjectIdForChildNode(this.db, request.orgId, row.id));
    if (!projectId) {
      throw new Error("Project is required when transforming a note into a task");
    }

    await this.assertProjectExists(request.orgId, projectId);

    const taskDetails = defaultTaskDetailsFromSource({
      now,
      status: row.status,
    });

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "task",
        snapshot,
        now
      );

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "task",
          status: toTaskStatus(row.status),
          sortOrder,
          updatedAt: now,
        },
      });

      await tx.spydrTaskDetails.create({
        data: {
          nodeId: row.id,
          ...taskDetails,
        },
      });

      await this.ensureProjectLink(
        tx,
        request.orgId,
        request.userId,
        projectId,
        row.id,
        "Project task"
      );
      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "task", now);
    });

    return {
      nodeId: row.id,
      previousType: "note",
      currentType: "task",
      projectId,
      transformedAt: now,
    };
  }

  private async transformNoteToProject(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const projectDetails = defaultProjectDetailsFromSource({
      now,
      priority: row.priority,
    });

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "project",
        snapshot,
        now
      );
      await this.removeProjectParentRelationships(tx, request.orgId, row.id);

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "project",
          status: toProjectStatus(row.status),
          sortOrder,
          updatedAt: now,
        },
      });

      await tx.spydrProjectDetails.create({
        data: {
          nodeId: row.id,
          ...projectDetails,
        },
      });

      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "project", now);
    });

    return {
      nodeId: row.id,
      previousType: "note",
      currentType: "project",
      projectId: row.id,
      transformedAt: now,
    };
  }

  private async transformIdeaToTask(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const projectId =
      request.projectId?.trim() ??
      (await findProjectIdForChildNode(this.db, request.orgId, row.id));
    if (!projectId) {
      throw new Error("Project is required when transforming an idea into a task");
    }

    await this.assertProjectExists(request.orgId, projectId);

    const taskDetails = defaultTaskDetailsFromSource({
      now,
      status: row.status,
    });

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "task",
        snapshot,
        now
      );
      await tx.spydrIdeaDetails.deleteMany({ where: { nodeId: row.id } });

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "task",
          status: toTaskStatus(row.status),
          sortOrder,
          updatedAt: now,
        },
      });

      await tx.spydrTaskDetails.create({
        data: {
          nodeId: row.id,
          ...taskDetails,
        },
      });

      await this.ensureProjectLink(
        tx,
        request.orgId,
        request.userId,
        projectId,
        row.id,
        "Project task"
      );
      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "task", now);
    });

    return {
      nodeId: row.id,
      previousType: "idea",
      currentType: "task",
      projectId,
      transformedAt: now,
    };
  }

  private async transformIdeaToProject(
    request: INodeTypeTransformRequest,
    row: NodeWithDetails,
    snapshot: INodeTypeSnapshot,
    now: Date,
    sortOrder: number
  ): Promise<INodeTypeTransformResult> {
    const projectDetails = defaultProjectDetailsFromSource({
      now,
      priority: row.priority,
      ideaDetails: row.ideaDetails,
    });

    await this.db.$transaction(async (tx) => {
      await this.recordHistory(
        tx,
        request,
        row.nodeType as TransformableNodeType,
        "project",
        snapshot,
        now
      );
      await tx.spydrIdeaDetails.deleteMany({ where: { nodeId: row.id } });
      await this.removeProjectParentRelationships(tx, request.orgId, row.id);

      await tx.spydrNode.update({
        where: { id: row.id },
        data: {
          nodeType: "project",
          status: toProjectStatus(row.status),
          sortOrder,
          updatedAt: now,
        },
      });

      await tx.spydrProjectDetails.create({
        data: {
          nodeId: row.id,
          ...projectDetails,
        },
      });

      await this.syncPersonCollectionSort(tx, request.orgId, row.id, "project", now);
    });

    return {
      nodeId: row.id,
      previousType: "idea",
      currentType: "project",
      projectId: row.id,
      transformedAt: now,
    };
  }

  private buildSnapshot(row: NodeWithDetails): INodeTypeSnapshot {
    let details: Record<string, unknown> | null = null;

    if (row.taskDetails) {
      details = {
        dueDate: row.taskDetails.dueDate?.toISOString() ?? null,
        assigneePersonNodeId: row.taskDetails.assigneePersonNodeId,
      };
    } else if (row.projectDetails) {
      details = {
        targetDate: row.projectDetails.targetDate?.toISOString() ?? null,
        assigneePersonNodeId: row.projectDetails.assigneePersonNodeId,
        riskLevel: row.projectDetails.riskLevel,
      };
    } else if (row.ideaDetails) {
      details = {
        confidence: row.ideaDetails.confidence?.toString() ?? null,
        potentialValue: row.ideaDetails.potentialValue,
      };
    }

    return {
      title: row.title,
      body: row.body,
      status: row.status,
      priority: row.priority,
      area: row.area,
      tags: row.tags,
      details,
    };
  }

  private async nextSortOrder(
    orgId: string,
    nodeType: "project" | "task" | "note"
  ): Promise<number> {
    const result = await this.db.spydrNode.aggregate({
      where: { orgId, nodeType, isDeleted: false },
      _max: { sortOrder: true },
    });
    return (result._max.sortOrder ?? -1000) + 1000;
  }

  private appendTag(tags: string[], tag: string): string[] {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      return tags;
    }
    return [...tags, trimmed];
  }

  private async loadLinkedProjectAreaTitle(
    orgId: string,
    projectId: string,
    fallbackArea: string | null
  ): Promise<string | null> {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        relationshipType: "related_to",
        OR: [{ sourceNodeId: projectId }, { targetNodeId: projectId }],
      },
      select: { sourceNodeId: true, targetNodeId: true },
    });

    if (relationships.length > 0) {
      const relatedIds = relationships.map((relationship) =>
        relationship.sourceNodeId === projectId
          ? relationship.targetNodeId
          : relationship.sourceNodeId
      );

      const areaNode = await this.db.spydrNode.findFirst({
        where: {
          orgId,
          id: { in: relatedIds },
          nodeType: "project_area",
          isDeleted: false,
        },
        select: { title: true },
        orderBy: { updatedAt: "desc" },
      });

      const areaTitle = areaNode?.title?.trim();
      if (areaTitle) {
        return areaTitle;
      }
    }

    const fallback = fallbackArea?.trim();
    return fallback || null;
  }

  private isProjectChildNodeType(
    nodeType: string
  ): nodeType is ProjectChildNodeType {
    return PROJECT_CHILD_NODE_TYPES.includes(nodeType as ProjectChildNodeType);
  }

  private async loadMovableProjectChildren(
    orgId: string,
    projectId: string
  ): Promise<MovableProjectChild[]> {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        relationshipType: "related_to",
        OR: [{ sourceNodeId: projectId }, { targetNodeId: projectId }],
      },
      select: { sourceNodeId: true, targetNodeId: true },
    });

    if (relationships.length === 0) {
      return [];
    }

    const relatedIds = relationships.map((relationship) =>
      relationship.sourceNodeId === projectId
        ? relationship.targetNodeId
        : relationship.sourceNodeId
    );

    const children = await this.db.spydrNode.findMany({
      where: {
        orgId,
        id: { in: relatedIds },
        isDeleted: false,
      },
      select: {
        id: true,
        nodeType: true,
        tags: true,
        userId: true,
      },
    });

    const unsupported = children.filter(
      (child) =>
        !this.isProjectChildNodeType(child.nodeType) &&
        !IGNORABLE_PROJECT_RELATION_NODE_TYPES.includes(
          child.nodeType as (typeof IGNORABLE_PROJECT_RELATION_NODE_TYPES)[number]
        )
    );
    if (unsupported.length > 0) {
      throw new Error(
        "Project has linked items that cannot be moved automatically; remove or reassign them before transforming to a task"
      );
    }

    return children.filter((child): child is MovableProjectChild =>
      this.isProjectChildNodeType(child.nodeType)
    );
  }

  private async migrateProjectChildrenToTarget(
    tx: Prisma.TransactionClient,
    input: {
      orgId: string;
      userId: string;
      fromProjectId: string;
      targetProjectId: string;
      provenanceTag: string;
      children: MovableProjectChild[];
      now: Date;
    }
  ): Promise<void> {
    const {
      orgId,
      fromProjectId,
      targetProjectId,
      provenanceTag,
      children,
      now,
    } = input;

    for (const child of children) {
      await tx.spydrNodeRelationship.deleteMany({
        where: {
          orgId,
          relationshipType: "related_to",
          OR: [
            { sourceNodeId: fromProjectId, targetNodeId: child.id },
            { sourceNodeId: child.id, targetNodeId: fromProjectId },
          ],
        },
      });

      await tx.spydrNodeRelationship.deleteMany({
        where: {
          orgId,
          sourceNodeId: targetProjectId,
          targetNodeId: child.id,
          relationshipType: "related_to",
        },
      });

      await tx.spydrNodeRelationship.create({
        data: {
          orgId,
          userId: child.userId,
          sourceNodeId: targetProjectId,
          targetNodeId: child.id,
          relationshipType: "related_to",
          reason: "Moved from transformed project",
        },
      });

      const nextNodeTags = this.appendTag(child.tags, provenanceTag);
      await tx.spydrNode.update({
        where: { id: child.id },
        data: { tags: nextNodeTags, updatedAt: now },
      });

      if (child.nodeType !== "task") {
        continue;
      }

      const taskDetails = await tx.spydrTaskDetails.findUnique({
        where: { nodeId: child.id },
        select: { tags: true },
      });
      if (!taskDetails) {
        continue;
      }

      await tx.spydrTaskDetails.update({
        where: { nodeId: child.id },
        data: {
          tags: this.appendTag(taskDetails.tags, provenanceTag),
          updatedAt: now,
        },
      });
    }
  }

  private async assertProjectExists(orgId: string, projectId: string): Promise<void> {
    const project = await this.db.spydrNode.findFirst({
      where: { id: projectId, orgId, nodeType: "project", isDeleted: false },
      select: { id: true },
    });
    if (!project) {
      throw new Error("Project not found");
    }
  }

  private async recordHistory(
    tx: Prisma.TransactionClient,
    request: INodeTypeTransformRequest,
    fromType: TransformableNodeType,
    toType: "project" | "task" | "note",
    snapshot: INodeTypeSnapshot,
    now: Date
  ): Promise<void> {
    await tx.spydrNodeTypeHistory.create({
      data: {
        orgId: request.orgId,
        nodeId: request.nodeId,
        userId: request.userId,
        fromType,
        toType,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        transformedAt: now,
      },
    });
  }

  private async removeProjectParentRelationships(
    tx: Prisma.TransactionClient,
    orgId: string,
    nodeId: string
  ): Promise<void> {
    const relationships = await tx.spydrNodeRelationship.findMany({
      where: {
        orgId,
        targetNodeId: nodeId,
        relationshipType: "related_to",
      },
      select: { sourceNodeId: true },
    });

    if (relationships.length === 0) return;

    const projectSources = await tx.spydrNode.findMany({
      where: {
        orgId,
        id: { in: relationships.map((relationship) => relationship.sourceNodeId) },
        nodeType: "project",
      },
      select: { id: true },
    });
    const projectSourceIds = new Set(projectSources.map((node) => node.id));

    for (const relationship of relationships) {
      if (!projectSourceIds.has(relationship.sourceNodeId)) continue;
      await tx.spydrNodeRelationship.deleteMany({
        where: {
          orgId,
          sourceNodeId: relationship.sourceNodeId,
          targetNodeId: nodeId,
          relationshipType: "related_to",
        },
      });
    }
  }

  private async ensureProjectLink(
    tx: Prisma.TransactionClient,
    orgId: string,
    userId: string,
    projectId: string,
    taskId: string,
    reason: string
  ): Promise<void> {
    await this.removeProjectParentRelationships(tx, orgId, taskId);

    const existing = await tx.spydrNodeRelationship.findFirst({
      where: {
        orgId,
        sourceNodeId: projectId,
        targetNodeId: taskId,
        relationshipType: "related_to",
      },
      select: { id: true },
    });

    if (existing) return;

    await tx.spydrNodeRelationship.create({
      data: {
        orgId,
        userId,
        sourceNodeId: projectId,
        targetNodeId: taskId,
        relationshipType: "related_to",
        reason,
      },
    });
  }

  private async syncPersonCollectionSort(
    tx: Prisma.TransactionClient,
    orgId: string,
    nodeId: string,
    nodeType: "project" | "task" | "note",
    now: Date
  ): Promise<void> {
    await tx.spydrPersonCollectionSort.updateMany({
      where: { orgId, nodeId },
      data: { nodeType, updatedAt: now },
    });
  }
}
