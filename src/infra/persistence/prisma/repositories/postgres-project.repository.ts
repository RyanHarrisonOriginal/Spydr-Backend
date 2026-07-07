import type { Prisma, PrismaClient } from "@prisma/client";
import type { IProjectRepository, IUpdateProjectChildInput, ProjectChildKind } from "../../../../domain/interfaces/project-repository.js";
import { DecisionMapper } from "../../../../domain/mappers/decisions/decision.mapper.js";
import { IdeaMapper } from "../../../../domain/mappers/ideas/idea.mapper.js";
import { NoteMapper } from "../../../../domain/mappers/notes/note.mapper.js";
import { TaskMapper } from "../../../../domain/mappers/tasks/index.js";
import type { DecisionNode } from "../../../../domain/models/decisions/index.js";
import type { IdeaNode } from "../../../../domain/models/ideas/index.js";
import type { NoteNode } from "../../../../domain/models/notes/index.js";
import type { ResourceNode } from "../../../../domain/models/resources/index.js";
import type { TaskStatus } from "../../../../domain/models/shared.js";
import type { TaskNode } from "../../../../domain/models/tasks/index.js";
import { ProjectNode } from "../../../../domain/models/projects/index.js";
import { emptyProjectPersonas } from "../../../../domain/models/projects/personas.js";
import type { PersonNode } from "../../../../domain/models/people/index.js";
import { PrismaPersonMapper } from "../mappers/prisma-person.mapper.js";
import { PrismaProjectMapper } from "../mappers/prisma-project.mapper.js";
import { PrismaDecisionMapper } from "../mappers/prisma-decision.mapper.js";
import { PrismaNoteMapper } from "../mappers/prisma-note.mapper.js";
import { PrismaResourceMapper } from "../mappers/prisma-resource.mapper.js";
import { PrismaTaskMapper } from "../mappers/prisma-task.mapper.js";
import { PrismaIdeaMapper } from "../mappers/prisma-idea.mapper.js";

export class PostgresProjectRepository implements IProjectRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectMapper(),
    private readonly personMapper = new PrismaPersonMapper(),
    private readonly taskMapper = new PrismaTaskMapper(),
    private readonly decisionMapper = new PrismaDecisionMapper(),
    private readonly noteMapper = new PrismaNoteMapper(),
    private readonly resourceMapper = new PrismaResourceMapper(),
    private readonly ideaMapper = new PrismaIdeaMapper()
  ) {}

  private readonly taskDomainMapper = new TaskMapper();
  private readonly noteDomainMapper = new NoteMapper();
  private readonly decisionDomainMapper = new DecisionMapper();
  private readonly ideaDomainMapper = new IdeaMapper();
  async findById(id: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { projectDetails: true },
    });

    return row && row.nodeType === "project" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForOrg(id: string, orgId: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "project", isDeleted: false },
      include: { projectDetails: true },
    });

    if (!row) return null;

    const project = this.mapper.toDomain(row);
    const related = await this.loadRelatedNodes(id, orgId);
    const personas = await this.loadPersonas(orgId, project.details);

    return new ProjectNode({
      id: project.id,
      orgId: project.orgId,
      userId: project.userId,
      title: project.title,
      body: project.body,
      status: project.status,
      priority: project.priority,
      area: project.area,
      tags: project.tags,
      sortOrder: project.sortOrder,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
      isDeleted: project.isDeleted,
      deletedAt: project.deletedAt,
      details: project.details,
      personas,
      ...related,
    });
  }

  async listByOrg(orgId: string): Promise<ProjectNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "project", isDeleted: false },
      include: { projectDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    const projects = rows.map((row) => this.mapper.toDomain(row));
    return this.attachAssigneesToProjects(orgId, projects);
  }

  private async attachAssigneesToProjects(
    orgId: string,
    projects: ProjectNode[]
  ): Promise<ProjectNode[]> {
    const assigneeIds = [
      ...new Set(
        projects
          .map((project) => project.details?.assigneePersonNodeId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const assigneeById = new Map<string, PersonNode>();
    if (assigneeIds.length > 0) {
      const rows = await this.db.spydrNode.findMany({
        where: {
          id: { in: assigneeIds },
          orgId,
          nodeType: "person",
          isDeleted: false,
        },
        include: { personDetails: true },
      });
      for (const row of rows) {
        assigneeById.set(row.id, this.personMapper.toDomain(row));
      }
    }

    return projects.map((project) => {
      const assigneeId = project.details?.assigneePersonNodeId ?? null;
      const assignee = assigneeId ? assigneeById.get(assigneeId) ?? null : null;

      return new ProjectNode({
        id: project.id,
        orgId: project.orgId,
        userId: project.userId,
        title: project.title,
        body: project.body,
        status: project.status,
        priority: project.priority,
        area: project.area,
        tags: project.tags,
        sortOrder: project.sortOrder,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        archivedAt: project.archivedAt,
        isDeleted: project.isDeleted,
        deletedAt: project.deletedAt,
        details: project.details,
        personas: {
          ...emptyProjectPersonas(),
          assignee,
        },
      });
    });
  }

  private async attachAssigneesToTasks(
    orgId: string,
    tasks: TaskNode[]
  ): Promise<TaskNode[]> {
    const assigneeIds = [
      ...new Set(
        tasks
          .map((task) => task.details?.assigneePersonNodeId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (assigneeIds.length === 0) return tasks;

    const rows = await this.db.spydrNode.findMany({
      where: {
        id: { in: assigneeIds },
        orgId,
        nodeType: "person",
        isDeleted: false,
      },
      include: { personDetails: true },
    });

    const assigneeById = new Map<string, PersonNode>(
      rows.map((row) => [row.id, this.personMapper.toDomain(row)])
    );

    return tasks.map((task) => {
      const assigneeId = task.details?.assigneePersonNodeId ?? null;
      if (!assigneeId) return task;
      return task.withAssignee(assigneeById.get(assigneeId) ?? null);
    });
  }

  async listDeletedByOrg(orgId: string): Promise<ProjectNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "project", isDeleted: true },
      include: { projectDetails: true },
      orderBy: { deletedAt: "desc" },
    });

    return rows.map((row) => this.mapper.toDomain(row));
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

  async save(entity: ProjectNode): Promise<ProjectNode> {
    const nodeData = this.mapper.toPersistence(entity);
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
    const nodeData = this.mapper.toPersistence(entity);
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
        const person = await this.db.spydrNode.findFirst({
          where: {
            id: input.assigneePersonNodeId,
            orgId,
            nodeType: "person",
            isDeleted: false,
          },
          select: { id: true },
        });
        if (!person) {
          throw new Error("Person not found");
        }
      }
      const updated = this.taskDomainMapper.updateToModel(existing, {
        title: input.title,
        body: input.body,
        status: input.status as TaskStatus | undefined,
        priority: input.priority as TaskNode["priority"] | undefined,
        dueDate: input.dueDate,
        estimatedMinutes: input.estimatedMinutes,
        assigneePersonNodeId: input.assigneePersonNodeId,
      }, now);
      await this.persistTask(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, updated);
    } else if (kind === "note") {
      const existing = await this.loadNote(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      const updated = this.noteDomainMapper.updateToModel(existing, input, now);
      await this.persistNote(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, updated);
    } else if (kind === "decision") {
      const existing = await this.loadDecision(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      const updated = this.decisionDomainMapper.updateToModel(existing, input, now);
      await this.persistDecision(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, updated);
    } else if (kind === "idea") {
      const existing = await this.loadIdea(childId, orgId);
      if (!existing || existing.isDeleted) return null;
      const updated = this.ideaDomainMapper.updateToModel(existing, input, now);
      await this.persistIdea(this.db, { id: projectId, orgId, userId: existing.userId } as ProjectNode, updated);
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

  private async loadPersonas(
    orgId: string,
    details: ProjectNode["details"]
  ) {
    const personas = emptyProjectPersonas();
    if (!details) return personas;

    const ids = [
      details.requesterPersonNodeId,
      details.assigneePersonNodeId,
      details.sponsorPersonNodeId,
      details.reviewerPersonNodeId,
    ].filter((id): id is string => Boolean(id));

    if (ids.length === 0) return personas;

    const rows = await this.db.spydrNode.findMany({
      where: {
        id: { in: ids },
        orgId,
        nodeType: "person",
        isDeleted: false,
      },
      include: { personDetails: true },
    });

    const byId = new Map<string, PersonNode>(
      rows.map((row) => [row.id, this.personMapper.toDomain(row)])
    );

    personas.requester = details.requesterPersonNodeId
      ? byId.get(details.requesterPersonNodeId) ?? null
      : null;
    personas.assignee = details.assigneePersonNodeId
      ? byId.get(details.assigneePersonNodeId) ?? null
      : null;
    personas.sponsor = details.sponsorPersonNodeId
      ? byId.get(details.sponsorPersonNodeId) ?? null
      : null;
    personas.reviewer = details.reviewerPersonNodeId
      ? byId.get(details.reviewerPersonNodeId) ?? null
      : null;

    return personas;
  }

  private async loadRelatedNodes(projectId: string, orgId: string) {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        OR: [{ sourceNodeId: projectId }, { targetNodeId: projectId }],
      },
    });

    const relatedIds = relationships.map((relationship) =>
      relationship.sourceNodeId === projectId
        ? relationship.targetNodeId
        : relationship.sourceNodeId
    );

    if (relatedIds.length === 0) {
      return {
        tasks: [],
        decisions: [],
        ideas: [],
        notes: [],
        resources: [],
        deletedTasks: [],
        deletedDecisions: [],
        deletedIdeas: [],
        deletedNotes: [],
        deletedResources: [],
      };
    }

    const rows = await this.db.spydrNode.findMany({
      where: {
        orgId,
        id: { in: relatedIds },
        nodeType: { in: ["task", "decision", "idea", "note", "resource"] },
      },
      include: {
        taskDetails: true,
        decisionDetails: true,
        ideaDetails: true,
        resourceDetails: true,
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    const taskRows = rows.filter((row) => row.nodeType === "task");
    const decisionRows = rows.filter((row) => row.nodeType === "decision");
    const ideaRows = rows.filter((row) => row.nodeType === "idea");
    const noteRows = rows.filter((row) => row.nodeType === "note");
    const resourceRows = rows.filter((row) => row.nodeType === "resource");

    const taskNodes = await this.attachAssigneesToTasks(
      orgId,
      taskRows.map((row) => this.taskMapper.toDomain(row))
    );
    const decisionNodes = decisionRows.map((row) => this.decisionMapper.toDomain(row));
    const ideaNodes = ideaRows.map((row) => this.ideaMapper.toDomain(row));
    const noteNodes = noteRows.map((row) => this.noteMapper.toDomain(row));
    const resourceNodes = resourceRows.map((row) => this.resourceMapper.toDomain(row));

    return {
      tasks: taskNodes.filter((node) => !node.isDeleted),
      decisions: decisionNodes.filter((node) => !node.isDeleted),
      ideas: ideaNodes.filter((node) => !node.isDeleted),
      notes: noteNodes.filter((node) => !node.isDeleted),
      resources: resourceNodes.filter((node) => !node.isDeleted),
      deletedTasks: taskNodes.filter((node) => node.isDeleted),
      deletedDecisions: decisionNodes.filter((node) => node.isDeleted),
      deletedIdeas: ideaNodes.filter((node) => node.isDeleted),
      deletedNotes: noteNodes.filter((node) => node.isDeleted),
      deletedResources: resourceNodes.filter((node) => node.isDeleted),
    };
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
    const taskData = this.taskMapper.toPersistence(task);
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
    const nodeData = this.decisionMapper.toPersistence(decision);
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
    const nodeData = this.ideaMapper.toPersistence(idea);
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
    const nodeData = this.noteMapper.toPersistence(note);
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
    await tx.spydrNodeRelationship.deleteMany({
      where: {
        orgId: project.orgId,
        userId: project.userId,
        sourceNodeId: project.id,
        targetNodeId,
        relationshipType: "related_to",
      },
    });
    await tx.spydrNodeRelationship.create({
      data: {
        orgId: project.orgId,
        userId: project.userId,
        sourceNodeId: project.id,
        targetNodeId,
        relationshipType: "related_to",
        reason,
      },
    });
  }
}
