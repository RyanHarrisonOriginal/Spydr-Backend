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
import {
  PersonResponseMapper,
  type IPersonResponse,
} from "./person-response.mapper.js";

export interface IProjectPersonasResponse {
  requester: IPersonResponse | null;
  assignee: IPersonResponse | null;
  sponsor: IPersonResponse | null;
  reviewer: IPersonResponse | null;
}

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
  sortOrder: number;
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
    requesterPersonNodeId: string | null;
    assigneePersonNodeId: string | null;
    sponsorPersonNodeId: string | null;
    reviewerPersonNodeId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  personas: IProjectPersonasResponse;
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
  sortOrder: number;
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
    private readonly ideaMapper = new IdeaResponseMapper(),
    private readonly personMapper = new PersonResponseMapper()
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
      sortOrder: domain.sortOrder,
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
            requesterPersonNodeId: domain.details.requesterPersonNodeId,
            assigneePersonNodeId: domain.details.assigneePersonNodeId,
            sponsorPersonNodeId: domain.details.sponsorPersonNodeId,
            reviewerPersonNodeId: domain.details.reviewerPersonNodeId,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
      personas: {
        requester: domain.personas?.requester
          ? this.personMapper.toRepresentation(domain.personas.requester)
          : null,
        assignee: domain.personas?.assignee
          ? this.personMapper.toRepresentation(domain.personas.assignee)
          : null,
        sponsor: domain.personas?.sponsor
          ? this.personMapper.toRepresentation(domain.personas.sponsor)
          : null,
        reviewer: domain.personas?.reviewer
          ? this.personMapper.toRepresentation(domain.personas.reviewer)
          : null,
      },
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
