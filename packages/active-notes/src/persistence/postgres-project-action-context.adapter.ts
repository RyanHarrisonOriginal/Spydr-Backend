import {
  findActiveProjectSummary,
  findProjectActionContextChildNodes,
  findProjectRelatedNodeIds,
  findTaskIdsByNoteIds,
} from "@spydr/db";
import {
  buildProjectActionContext,
  ProjectActionContextError,
  type IProjectActionContextPort,
  type ProjectActionContext,
} from "../domain/index.js";

export type FindActiveProjectSummaryFn = typeof findActiveProjectSummary;
export type FindProjectRelatedNodeIdsFn = typeof findProjectRelatedNodeIds;
export type FindProjectActionContextChildNodesFn =
  typeof findProjectActionContextChildNodes;
export type FindTaskIdsByNoteIdsFn = typeof findTaskIdsByNoteIds;

export interface PostgresProjectActionContextAdapterOptions {
  findActiveProjectSummary?: FindActiveProjectSummaryFn;
  findProjectRelatedNodeIds?: FindProjectRelatedNodeIdsFn;
  findProjectActionContextChildNodes?: FindProjectActionContextChildNodesFn;
  findTaskIdsByNoteIds?: FindTaskIdsByNoteIdsFn;
}

export class PostgresProjectActionContextAdapter
  implements IProjectActionContextPort
{
  private readonly findActiveProjectSummary: FindActiveProjectSummaryFn;
  private readonly findProjectRelatedNodeIds: FindProjectRelatedNodeIdsFn;
  private readonly findProjectActionContextChildNodes: FindProjectActionContextChildNodesFn;
  private readonly findTaskIdsByNoteIds: FindTaskIdsByNoteIdsFn;

  constructor(options: PostgresProjectActionContextAdapterOptions = {}) {
    this.findActiveProjectSummary =
      options.findActiveProjectSummary ?? findActiveProjectSummary;
    this.findProjectRelatedNodeIds =
      options.findProjectRelatedNodeIds ?? findProjectRelatedNodeIds;
    this.findProjectActionContextChildNodes =
      options.findProjectActionContextChildNodes ??
      findProjectActionContextChildNodes;
    this.findTaskIdsByNoteIds =
      options.findTaskIdsByNoteIds ?? findTaskIdsByNoteIds;
  }

  async get(projectId: string): Promise<ProjectActionContext> {
    if (!projectId.trim()) {
      throw new ProjectActionContextError("Project id is required");
    }

    const project = await this.findActiveProjectSummary(projectId);
    if (!project) {
      throw new ProjectActionContextError("Project not found");
    }

    const relatedNodeIds = await this.findProjectRelatedNodeIds(
      projectId,
      project.orgId
    );
    const childNodes = await this.findProjectActionContextChildNodes(
      project.orgId,
      relatedNodeIds
    );
    const noteIds = childNodes
      .filter((node) => node.nodeType === "note")
      .map((node) => node.id);
    const noteTaskRelationships = await this.findTaskIdsByNoteIds(
      project.orgId,
      noteIds
    );
    const noteTaskIdsByNoteId = new Map(
      noteTaskRelationships.map((relationship) => [
        relationship.noteId,
        relationship.taskId,
      ])
    );

    return buildProjectActionContext({
      project: {
        id: project.id,
        title: project.title,
        body: project.body,
      },
      childNodes,
      noteTaskIdsByNoteId,
    });
  }
}
