import type { ProjectNode } from "../../../domain/models/projects/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";
import {
  DecisionResponseMapper,
  type IDecisionResponse,
} from "./decision-response.mapper.js";
import { NoteResponseMapper, type INoteResponse } from "./note-response.mapper.js";
import {
  ResourceResponseMapper,
  type IResourceResponse,
} from "./resource-response.mapper.js";
import { TaskResponseMapper, type ITaskResponse } from "./task-response.mapper.js";

export interface IProjectResponse {
  id: string;
  userId: string;
  nodeType: "project";
  title: string;
  body: string;
  status: string;
  priority: string;
  area: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  details: {
    outcome: string | null;
    startDate: string | null;
    targetDate: string | null;
    riskLevel: string;
    lastActivityAt: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  tasks: ITaskResponse[];
  decisions: IDecisionResponse[];
  ideas: IIdeaResponse[];
  notes: INoteResponse[];
  resources: IResourceResponse[];
}

export interface IIdeaResponse {
  id: string;
  userId: string;
  nodeType: "idea";
  title: string;
  body: string;
  status: string;
  priority: string;
  area: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  details: {
    confidence: number | null;
    potentialValue: string;
    promotedToProjectNodeId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export class ProjectResponseMapper
  implements IRepresentationMapper<ProjectNode, IProjectResponse>
{
  constructor(
    private readonly taskMapper = new TaskResponseMapper(),
    private readonly decisionMapper = new DecisionResponseMapper(),
    private readonly noteMapper = new NoteResponseMapper(),
    private readonly resourceMapper = new ResourceResponseMapper()
  ) {}

  toRepresentation(domain: ProjectNode): IProjectResponse {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: domain.nodeType,
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      archivedAt: domain.archivedAt?.toISOString() ?? null,
      details: domain.details
        ? {
            outcome: domain.details.outcome,
            startDate: this.toDateOnly(domain.details.startDate),
            targetDate: this.toDateOnly(domain.details.targetDate),
            riskLevel: domain.details.riskLevel,
            lastActivityAt: domain.details.lastActivityAt?.toISOString() ?? null,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
      tasks: domain.tasks.map((task) => this.taskMapper.toRepresentation(task)),
      decisions: domain.decisions.map((decision) =>
        this.decisionMapper.toRepresentation(decision)
      ),
      ideas: domain.ideas.map((idea) => ({
        id: idea.id,
        userId: idea.userId,
        nodeType: idea.nodeType,
        title: idea.title,
        body: idea.body,
        status: idea.status,
        priority: idea.priority,
        area: idea.area,
        tags: idea.tags,
        createdAt: idea.createdAt.toISOString(),
        updatedAt: idea.updatedAt.toISOString(),
        archivedAt: idea.archivedAt?.toISOString() ?? null,
        details: idea.details
          ? {
              confidence: idea.details.confidence,
              potentialValue: idea.details.potentialValue,
              promotedToProjectNodeId: idea.details.promotedToProjectNodeId,
              createdAt: idea.details.createdAt.toISOString(),
              updatedAt: idea.details.updatedAt.toISOString(),
            }
          : null,
      })),
      notes: domain.notes.map((note) => this.noteMapper.toRepresentation(note)),
      resources: domain.resources.map((resource) =>
        this.resourceMapper.toRepresentation(resource)
      ),
    };
  }

  private toDateOnly(date: Date | null): string | null {
    return date?.toISOString().slice(0, 10) ?? null;
  }
}
