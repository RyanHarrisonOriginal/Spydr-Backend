import {
  countProjectChildNodesByType,
  findActiveProjectSummary,
  findProjectRelatedNodeIds,
  findProjectRetrievalChildNodes,
  findProjectRetrievalHeader,
  type ActiveProjectSummary,
  type ProjectChildNodeCounts,
} from "@spydr/db";
import type { SpydrNodeStatus } from "@prisma/client";
import type { ProjectRetrievalContext } from "./project-retrieval.types.js";
import {
  buildProjectRetrievalContextFromRows,
  createProjectRetrievalContextRows,
} from "./project-retrieval-context.builder.js";
import { mapRelatedNodesToRetrievalRows } from "./project-retrieval-context.mapper.js";

export interface LoadedProjectState extends ProjectChildNodeCounts {
  id: string;
  orgId: string;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  updatedAt: Date;
}

export class ProjectLoaderService {
  async loadLatestProjectState(projectId: string): Promise<LoadedProjectState | null> {
    const project = await findActiveProjectSummary(projectId);

    if (!project) {
      return null;
    }

    const relatedNodeIds = await findProjectRelatedNodeIds(projectId, project.orgId);
    const counts = await countProjectChildNodesByType(project.orgId, relatedNodeIds);

    return {
      id: project.id,
      orgId: project.orgId,
      title: project.title,
      body: project.body,
      status: project.status,
      updatedAt: project.updatedAt,
      ...counts,
    };
  }

  async loadProjectRetrievalContext(
    projectId: string
  ): Promise<ProjectRetrievalContext | null> {
    const project = await findProjectRetrievalHeader(projectId);

    if (!project) {
      return null;
    }

    const projectRow = {
      title: project.title,
      body: project.body,
    };

    const relatedNodeIds = await findProjectRelatedNodeIds(projectId, project.orgId);

    if (relatedNodeIds.length === 0) {
      return buildProjectRetrievalContextFromRows(
        createProjectRetrievalContextRows(projectRow)
      );
    }

    const relatedNodes = await findProjectRetrievalChildNodes(
      project.orgId,
      relatedNodeIds
    );
    const childRows = mapRelatedNodesToRetrievalRows(relatedNodes);

    return buildProjectRetrievalContextFromRows(
      createProjectRetrievalContextRows(projectRow, childRows)
    );
  }
}

export const projectLoaderService = new ProjectLoaderService();

export type { ActiveProjectSummary };
