import type { JobWithMetadata } from "pg-boss";
import { projectLoaderService, type LoadedProjectState } from "@spydr/shared";
import type { ProjectEmbeddingJobPayload } from "@spydr/shared";
import { embeddingService } from "../services/embedding.service.js";

export async function handleRefreshProjectEmbedding(
  job: JobWithMetadata<ProjectEmbeddingJobPayload>
): Promise<LoadedProjectState> {
  const { projectId } = job.data;
  const attempt = job.retryCount + 1;

  console.info(
    `[job] refresh-project-embedding started (jobId=${job.id}, projectId=${projectId}, attempt=${attempt})`
  );

  const project = await projectLoaderService.loadLatestProjectState(projectId);
  if (!project) {
    const message = `Project not found or deleted: ${projectId}`;
    console.error(`[job] refresh-project-embedding failed: ${message}`);
    throw new Error(message);
  }

  try {
    await embeddingService.refreshProjectEmbedding(projectId);

    console.info(
      `[job] refresh-project-embedding succeeded (jobId=${job.id}, projectId=${projectId}, attempt=${attempt})`
    );

    return project;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown embedding refresh error";

    console.error(
      `[job] refresh-project-embedding failed (jobId=${job.id}, projectId=${projectId}, attempt=${attempt}): ${message}`,
      error
    );

    throw error instanceof Error ? error : new Error(message);
  }
}
