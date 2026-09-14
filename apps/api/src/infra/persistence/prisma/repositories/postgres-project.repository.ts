import type { Prisma, PrismaClient } from "@prisma/client";
import type { IProjectRepository, IUpdateProjectChildInput, ProjectChildKind } from "../../../../domains/projects/repository.js";
import type { DecisionNode } from "../../../../domains/decisions/models/index.js";
import type { IdeaNode } from "../../../../domains/ideas/models/index.js";
import type { NoteNode } from "../../../../domains/notes/models/index.js";
import type { ResourceNode } from "../../../../domains/resources/models/index.js";
import type { TaskStatus } from "../../../../domains/shared/models/shared.js";
import type { TaskNode } from "../../../../domains/tasks/models/index.js";
import { ProjectNode } from "../../../../domains/projects/models/index.js";
import { withNodePersonId } from "../mappers/spydr-node-write.js";
import { personVisibleInOrgWhere } from "../mappers/prisma-person.mapper.js";
import { PrismaProjectMapper } from "../mappers/prisma-project.mapper.js";
import { PrismaDecisionMapper } from "../mappers/prisma-decision.mapper.js";
import { PrismaNoteMapper } from "../mappers/prisma-note.mapper.js";
import { PrismaResourceMapper } from "../mappers/prisma-resource.mapper.js";
import { PrismaTaskMapper } from "../mappers/prisma-task.mapper.js";
import { PrismaIdeaMapper } from "../mappers/prisma-idea.mapper.js";
import { ProjectGraphLoaders } from "../../projects/project-graph-loaders.js";

export class PostgresProjectRepository implements IProjectRepository {
  private readonly graph: ProjectGraphLoaders;

  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectMapper(),
    private readonly taskMapper = new PrismaTaskMapper(),
    private readonly decisionMapper = new PrismaDecisionMapper(),
    private readonly noteMapper = new PrismaNoteMapper(),
    private readonly resourceMapper = new PrismaResourceMapper(),
    private readonly ideaMapper = new PrismaIdeaMapper()
  ) {
    this.graph = new ProjectGraphLoaders(db);
  }

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  private async findById(id: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { projectDetails: true },
    });

    return row && row.nodeType === "project" ? this.mapper.toDomain(row) : null;
  }

  private async findByIdForOrg(id: string, orgId: string): Promise<ProjectNode | null> {
    return this.graph.getProject(orgId, id);
  }

  async restoreProject(orgId: string, projectId: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: projectId, orgId, nodeType: "project", isDeleted: true },
      include: { projectDetails: true },
    });

    if (!row) return null;

    await this.db.spydrNode.update({
      where: { id: projectId },
      data: {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      },
    });

    const restored = await this.db.spydrNode.findFirst({
      where: { id: projectId, orgId, nodeType: "project", isDeleted: false },
      include: { projectDetails: true },
    });

    return restored ? this.mapper.toDomain(restored) : null;
  }

  async save(
    entity: ProjectNode,
    options?: {
      strategy?: string;
      context?: {
        areaNodeId?: string | null;
        orgId?: string;
        projectId?: string;
        childId?: string;
        kind?: ProjectChildKind;
        input?: IUpdateProjectChildInput;
      };
    }
  ): Promise<ProjectNode> {
    const strategy = options?.strategy ?? "standard";
    const ctx = options?.context;

    if (strategy === "metadata") {
      return this.updateProject(entity);
    }

    if (strategy === "withAreaAssignment") {
      await this.updateProject(entity);
      await this.setAreaAssignment(
        entity.id,
        entity.orgId,
        ctx?.areaNodeId ?? null
      );
      const saved = await this.findByIdForOrg(entity.id, entity.orgId);
      if (!saved) throw new Error("Failed to save project with area");
      return saved;
    }

    if (strategy === "restore") {
      const restored = await this.restoreProject(entity.orgId, entity.id);
      if (!restored) throw new Error("Failed to restore project");
      return restored;
    }

    if (strategy === "updateChild") {
      const result = await this.updateRelatedNode(
        ctx?.orgId ?? entity.orgId,
        ctx?.projectId ?? entity.id,
        ctx?.childId!,
        ctx?.kind!,
        ctx?.input ?? {}
      );
      if (!result) throw new Error("Failed to update project child");
      return result;
    }

    if (strategy === "softDeleteChild") {
      const result = await this.softDeleteRelatedNode(
        ctx?.orgId ?? entity.orgId,
        ctx?.projectId ?? entity.id,
        ctx?.childId!,
        ctx?.kind!
      );
      if (!result) throw new Error("Failed to delete project child");
      return result;
    }

    if (strategy === "restoreChild") {
      const result = await this.restoreRelatedNode(
        ctx?.orgId ?? entity.orgId,
        ctx?.projectId ?? entity.id,
        ctx?.childId!,
        ctx?.kind!
      );
      if (!result) throw new Error("Failed to restore project child");
      return result;
    }

    const nodeData = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (entity.details) {
        const detailsData = this.mapper.toProjectDetailsPersistence(
          entity.id,
          entity.details
        );
        const { nodeId, ...detailsUpdateData } = detailsData;

        await tx.spydrProjectDetails.upsert({
          where: { nodeId },
          create: detailsData,
          update: detailsUpdateData,
        });
      }

      for (const task of entity.tasks) {
        await this.persistTask(tx, entity, task);
      }
      for (const task of entity.deletedTasks) {
        await this.persistTask(tx, entity, task);
      }

      for (const decision of entity.decisions) {
        await this.persistDecision(tx, entity, decision);
      }

      for (const idea of entity.ideas) {
        await this.persistIdea(tx, entity, idea);
      }

      for (const note of entity.notes) {
        await this.persistNote(tx, entity, note);
      }
    });
    const saved = await this.findByIdForOrg(entity.id, entity.orgId);
    if (!saved) {
      throw new Error("Failed to save project");
    }

    return saved;
  }

  async updateProject(entity: ProjectNode): Promise<ProjectNode> {
    const nodeData = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
    const { id, userId, createdAt, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      const result = await tx.spydrNode.updateMany({
        where: {
          id,
          orgId: entity.orgId,
          nodeType: "project",
          isDeleted: false,
        },
        data: nodeUpdateData,
      });

      if (result.count === 0) {
        throw new Error("Project not found");
      }

      if (entity.details) {
        const detailsData = this.mapper.toProjectDetailsPersistence(
          entity.id,
          entity.details
        );
        const { nodeId, ...detailsUpdateData } = detailsData;

        await tx.spydrProjectDetails.upsert({
          where: { nodeId },
          create: detailsData,
          update: detailsUpdateData,
        });
      }
    });

    const saved = await this.findByIdForOrg(entity.id, entity.orgId);
    if (!saved) {
      throw new Error("Failed to update project");
    }

    return saved;
  }

  async setAreaAssignment(
    projectId: string,
    orgId: string,
    areaNodeId: string | null
  ): Promise<void> {
    const project = await this.db.spydrNode.findFirst({
      where: { id: projectId, orgId, nodeType: "project" },
      select: { userId: true },
    });
    if (!project) return;

    const areaNodes = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "project_area" },
      select: { id: true },
    });
    const areaIds = areaNodes.map((node) => node.id);

    if (areaIds.length > 0) {
      await this.db.spydrNodeRelationship.deleteMany({
        where: {
          orgId,
          sourceNodeId: projectId,
          targetNodeId: { in: areaIds },
          relationshipType: "related_to",
        },
      });
    }

    if (!areaNodeId) return;

    await this.db.spydrNodeRelationship.create({
      data: {
        orgId,
        userId: project.userId,
        sourceNodeId: projectId,
        targetNodeId: areaNodeId,
        relationshipType: "related_to",
        reason: "Project area",
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateRelatedNode(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind,
    input: IUpdateProjectChildInput
  ): Promise<ProjectNode | null> {
    if (!(await this.ensureRelatedChild(orgId, projectId, childId, kind))) {
      return null;
    }

    const now = new Date();

    if (kind === "task") {
      const existing = await this.loadTask(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      if (input.assigneePersonNodeId) {
        const person = await this.db.spydrPersonDetails.findFirst({
          where: {
            id: input.assigneePersonNodeId,
            ...personVisibleInOrgWhere(orgId),
          },
          select: { id: true },
        });
        if (!person) {
          throw new Error("Person not found");
        }
      }
      existing.applyUpdate(
        {
          title: input.title,
          body: input.body,
          status: input.status as TaskStatus | undefined,
          priority: input.priority as TaskNode["priority"] | undefined,
          dueDate:
            input.dueDate !== undefined
              ? parseOptionalDate(input.dueDate, "Invalid task date")
              : undefined,
          estimatedMinutes: input.estimatedMinutes,
          assigneePersonNodeId: input.assigneePersonNodeId,
        },
        now
      );
      await this.persistTask(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, existing);
    } else if (kind === "note") {
      const existing = await this.loadNote(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      existing.applyUpdate({ title: input.title, body: input.body }, now);
      await this.persistNote(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, existing);
    } else if (kind === "decision") {
      const existing = await this.loadDecision(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      existing.applyUpdate(
        {
          title: input.title,
          body: input.body,
          rationale: input.rationale,
          impact: input.impact,
        },
        now
      );
      await this.persistDecision(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, existing);
    } else if (kind === "idea") {
      const existing = await this.loadIdea(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      existing.applyUpdate({ title: input.title, body: input.body }, now);
      await this.persistIdea(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, existing);
    } else if (kind === "resource") {
      const existing = await this.loadResource(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      await this.db.spydrNode.update({
        where: { id: childId },
        data: {
          title: input.title?.trim() ?? existing.title,
          body: input.body !== undefined ? input.body.trim() : existing.body,
          updatedAt: now,
        },
      });
    }

    return this.findByIdForOrg(projectId, orgId);
  }

  async softDeleteRelatedNode(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<ProjectNode | null> {
    if (!(await this.ensureRelatedChild(orgId, projectId, childId, kind))) {
      return null;
    }

    await this.db.spydrNode.update({
      where: { id: childId, orgId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.findByIdForOrg(projectId, orgId);
  }

  async restoreRelatedNode(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<ProjectNode | null> {
    if (!(await this.ensureRelatedChild(orgId, projectId, childId, kind))) {
      return null;
    }

    await this.db.spydrNode.update({
      where: { id: childId, orgId },
      data: {
        isDeleted: false,
        deletedAt: null,
        updatedAt: new Date(),
      },
    });

    return this.findByIdForOrg(projectId, orgId);
  }

  private async ensureRelatedChild(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<boolean> {
    const project = await this.db.spydrNode.findFirst({
      where: { id: projectId, orgId, nodeType: "project", isDeleted: false },
    });
    if (!project) return false;

    const relationship = await this.db.spydrNodeRelationship.findFirst({
      where: {
        orgId,
        OR: [
          { sourceNodeId: projectId, targetNodeId: childId },
          { sourceNodeId: childId, targetNodeId: projectId },
        ],
      },
    });
    if (!relationship) return false;

    const child = await this.db.spydrNode.findFirst({
      where: { id: childId, orgId, nodeType: kind },
    });
    return Boolean(child);
  }

  private async loadTask(childId: string, orgId: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: childId, orgId, nodeType: "task" },
      include: { taskDetails: true },
    });
    return row ? this.taskMapper.toDomain(row) : null;
  }

  private async loadNote(childId: string, orgId: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: childId, orgId, nodeType: "note" },
    });
    return row ? this.noteMapper.toDomain(row) : null;
  }

  private async loadDecision(
    childId: string,
    orgId: string
  ): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: childId, orgId, nodeType: "decision" },
      include: { decisionDetails: true },
    });
    return row ? this.decisionMapper.toDomain(row) : null;
  }

  private async loadIdea(childId: string, orgId: string): Promise<IdeaNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: childId, orgId, nodeType: "idea" },
      include: { ideaDetails: true },
    });
    return row ? this.ideaMapper.toDomain(row) : null;
  }

  private async loadResource(
    childId: string,
    orgId: string
  ): Promise<ResourceNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: childId, orgId, nodeType: "resource" },
      include: { resourceDetails: true },
    });
    return row ? this.resourceMapper.toDomain(row) : null;
  }

  private async persistTask(
    tx: Prisma.TransactionClient,
    project: ProjectNode,
    task: (typeof project.tasks)[number]
  ) {
    const taskData = await withNodePersonId(tx, this.taskMapper.toPersistence(task));
    const { id: taskId, ...taskUpdateData } = taskData;

    await tx.spydrNode.upsert({
      where: { id: taskId },
      create: taskData,
      update: taskUpdateData,
    });

    if (task.details) {
      const taskDetailsData = this.taskMapper.toTaskDetailsPersistence(
        task.id,
        task.details
      );
      const { nodeId, ...taskDetailsUpdateData } = taskDetailsData;

      await tx.spydrTaskDetails.upsert({
        where: { nodeId },
        create: taskDetailsData,
        update: taskDetailsUpdateData,
      });
    }

    await this.linkToProject(tx, project, task.id, "Project task");
  }

  private async persistDecision(
    tx: Prisma.TransactionClient,
    project: ProjectNode,
    decision: (typeof project.decisions)[number]
  ) {
    const nodeData = await withNodePersonId(tx, this.decisionMapper.toPersistence(decision));
    const { id: nodeId, ...nodeUpdateData } = nodeData;

    await tx.spydrNode.upsert({
      where: { id: nodeId },
      create: nodeData,
      update: nodeUpdateData,
    });

    if (decision.details) {
      const detailsData = this.decisionMapper.toDecisionDetailsPersistence(
        decision.id,
        decision.details
      );
      const { nodeId: detailsNodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrDecisionDetails.upsert({
        where: { nodeId: detailsNodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    }

    await this.linkToProject(tx, project, decision.id, "Project decision");
  }

  private async persistIdea(
    tx: Prisma.TransactionClient,
    project: ProjectNode,
    idea: (typeof project.ideas)[number]
  ) {
    const nodeData = await withNodePersonId(tx, this.ideaMapper.toPersistence(idea));
    const { id: nodeId, ...nodeUpdateData } = nodeData;

    await tx.spydrNode.upsert({
      where: { id: nodeId },
      create: nodeData,
      update: nodeUpdateData,
    });

    if (idea.details) {
      const detailsData = this.ideaMapper.toIdeaDetailsPersistence(
        idea.id,
        idea.details
      );
      const { nodeId: detailsNodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrIdeaDetails.upsert({
        where: { nodeId: detailsNodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    }

    await this.linkToProject(tx, project, idea.id, "Project idea");
  }

  private async persistNote(
    tx: Prisma.TransactionClient,
    project: ProjectNode,
    note: (typeof project.notes)[number]
  ) {
    const nodeData = await withNodePersonId(tx, this.noteMapper.toPersistence(note));
    const { id: nodeId, ...nodeUpdateData } = nodeData;

    await tx.spydrNode.upsert({
      where: { id: nodeId },
      create: nodeData,
      update: nodeUpdateData,
    });

    await this.linkToProject(tx, project, note.id, "Project note");
  }

  private async linkToProject(
    tx: Prisma.TransactionClient,
    project: ProjectNode,
    targetNodeId: string,
    reason: string
  ) {
    // Unique key is (source, target, type) — not userId. Upsert so a link
    // created under a different user does not trip P2002.
    await tx.spydrNodeRelationship.upsert({
      where: {
        sourceNodeId_targetNodeId_relationshipType: {
          sourceNodeId: project.id,
          targetNodeId,
          relationshipType: "related_to",
        },
      },
      create: {
        orgId: project.orgId,
        userId: project.userId,
        sourceNodeId: project.id,
        targetNodeId,
        relationshipType: "related_to",
        reason,
      },
      update: {
        orgId: project.orgId,
        userId: project.userId,
        reason,
      },
    });
  }
}

function parseOptionalDate(
  value: string | null | undefined,
  invalidMessage: string
): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(invalidMessage);
  }

  return date;
}
