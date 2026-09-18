import type { PrismaClient } from "@prisma/client";
import type { DecisionNode } from "../../../domains/decisions/models/index.js";
import type { IdeaNode } from "../../../domains/ideas/models/index.js";
import type { NoteNode } from "../../../domains/notes/models/index.js";
import type { PersonNode } from "../../../domains/people/models/index.js";
import type { ResourceNode } from "../../../domains/resources/models/index.js";
import type { TaskNode } from "../../../domains/tasks/models/index.js";
import { ProjectNode } from "../../../domains/projects/models/index.js";
import {
  emptyProjectPersonas,
  type IProjectPersonas,
} from "../../../domains/projects/models/personas.js";
import {
  personVisibleInOrgWhere,
  PrismaPersonMapper,
} from "../prisma/mappers/prisma-person.mapper.js";
import { PrismaProjectMapper } from "../prisma/mappers/prisma-project.mapper.js";
import { PrismaDecisionMapper } from "../prisma/mappers/prisma-decision.mapper.js";
import { PrismaIdeaMapper } from "../prisma/mappers/prisma-idea.mapper.js";
import { PrismaNoteMapper } from "../prisma/mappers/prisma-note.mapper.js";
import { PrismaResourceMapper } from "../prisma/mappers/prisma-resource.mapper.js";
import { PrismaTaskMapper } from "../prisma/mappers/prisma-task.mapper.js";

export interface IProjectRelatedNodes {
  tasks: TaskNode[];
  decisions: DecisionNode[];
  ideas: IdeaNode[];
  notes: NoteNode[];
  resources: ResourceNode[];
  deletedTasks: TaskNode[];
  deletedDecisions: DecisionNode[];
  deletedIdeas: IdeaNode[];
  deletedNotes: NoteNode[];
  deletedResources: ResourceNode[];
}

function emptyRelatedNodes(): IProjectRelatedNodes {
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

export class ProjectGraphLoaders {
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

  async getProject(orgId: string, projectId: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: projectId, orgId, nodeType: "project", isDeleted: false },
      include: { projectDetails: true },
    });

    if (!row) return null;

    const project = this.mapper.toDomain(row);
    const related = await this.loadRelatedNodes(projectId, orgId);
    const personas = await this.loadPersonas(orgId, project.details);

    return new ProjectNode({
      id: project.id,
      orgId: project.orgId,
      userId: project.userId,
      personId: project.personId,
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

  async loadPeopleByIds(
    orgId: string,
    ids: string[]
  ): Promise<Map<string, PersonNode>> {
    if (ids.length === 0) return new Map();

    const rows = await this.db.spydrPersonDetails.findMany({
      where: {
        id: { in: ids },
        ...personVisibleInOrgWhere(orgId),
      },
    });

    return new Map(rows.map((row) => [row.id, this.personMapper.toDomain(row)]));
  }

  async attachPersonasToProjects(
    orgId: string,
    projects: ProjectNode[]
  ): Promise<ProjectNode[]> {
    const personaIds = [
      ...new Set(
        projects.flatMap((project) => [
          project.details?.requesterPersonNodeId,
          project.details?.assigneePersonNodeId,
          project.details?.sponsorPersonNodeId,
          project.details?.reviewerPersonNodeId,
        ]).filter((id): id is string => Boolean(id))
      ),
    ];

    const byId = await this.loadPeopleByIds(orgId, personaIds);

    return projects.map((project) => {
      const details = project.details;
      const pick = (id: string | null | undefined) =>
        id ? byId.get(id) ?? null : null;

      return new ProjectNode({
        id: project.id,
        orgId: project.orgId,
        userId: project.userId,
        personId: project.personId,
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
          requester: pick(details?.requesterPersonNodeId),
          assignee: pick(details?.assigneePersonNodeId),
          sponsor: pick(details?.sponsorPersonNodeId),
          reviewer: pick(details?.reviewerPersonNodeId),
        },
      });
    });
  }

  async attachAssigneesToTasks(
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

    const assigneeById = await this.loadPeopleByIds(orgId, assigneeIds);
    if (assigneeById.size === 0) return tasks;

    return tasks.map((task) => {
      const assigneeId = task.details?.assigneePersonNodeId ?? null;
      if (!assigneeId) return task;
      return task.withAssignee(assigneeById.get(assigneeId) ?? null);
    });
  }

  async loadPersonas(
    orgId: string,
    details: ProjectNode["details"]
  ): Promise<IProjectPersonas> {
    const personas = emptyProjectPersonas();
    if (!details) return personas;

    const ids = [
      details.requesterPersonNodeId,
      details.assigneePersonNodeId,
      details.sponsorPersonNodeId,
      details.reviewerPersonNodeId,
    ].filter((id): id is string => Boolean(id));

    const byId = await this.loadPeopleByIds(orgId, ids);
    if (byId.size === 0) return personas;

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

  async loadRelatedNodes(
    projectId: string,
    orgId: string
  ): Promise<IProjectRelatedNodes> {
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
      return emptyRelatedNodes();
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
}
