import type { ProjectNode } from "../../../domain/models/projects/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";
import {
  DecisionResponseMapper,
  type IDecisionResponse,
} from "./decision-response.mapper.js";
import { IdeaResponseMapper } from "./idea-response.mapper.js";
import { nodeLifecycleResponse } from "./node-lifecycle-response.js";
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
  isDeleted: boolean;
  deletedAt: string | null;
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
  deleted: {
    tasks: ITaskResponse[];
    decisions: IDecisionResponse[];
    ideas: IIdeaResponse[];
    notes: INoteResponse[];
    resources: IResourceResponse[];
  };
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
  isDeleted: boolean;
  deletedAt: string | null;
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
    private readonly resourceMapper = new ResourceResponseMapper(),
    private readonly ideaMapper = new IdeaResponseMapper()
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
      ...nodeLifecycleResponse(domain),
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
      ideas: domain.ideas.map((idea) => this.ideaMapper.toRepresentation(idea)),
      notes: domain.notes.map((note) => this.noteMapper.toRepresentation(note)),
      resources: domain.resources.map((resource) =>
        this.resourceMapper.toRepresentation(resource)
      ),
      deleted: {
        tasks: domain.deletedTasks.map((task) =>
          this.taskMapper.toRepresentation(task)
        ),
        decisions: domain.deletedDecisions.map((decision) =>
          this.decisionMapper.toRepresentation(decision)
        ),
        ideas: domain.deletedIdeas.map((idea) =>
          this.ideaMapper.toRepresentation(idea)
        ),
        notes: domain.deletedNotes.map((note) =>
          this.noteMapper.toRepresentation(note)
        ),
        resources: domain.deletedResources.map((resource) =>
          this.resourceMapper.toRepresentation(resource)
        ),
      },
    };
  }

  private toDateOnly(date: Date | null): string | null {
    return date?.toISOString().slice(0, 10) ?? null;
  }
}
