import type { Job } from "bullmq";
import { projectLoaderService, type LoadedProjectState } from "@spydr/shared";
import type { ProjectEmbeddingJobPayload } from "@spydr/shared";
import { embeddingService } from "../services/embedding.service.js";

export async function handleRefreshProjectEmbedding(
  job: Job<ProjectEmbeddingJobPayload>
): Promise<LoadedProjectState> {
  const { projectId } = job.data;

  console.info(
    `
    [job] refresh-project-embedding started 
    (
      jobId=${job.id}, 
      projectId=${projectId}, 
      attempt=${job.attemptsMade + 1}
    )
  `
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
      `
      [job] refresh-project-embedding succeeded 
      (
        jobId=${job.id}, 
        projectId=${projectId}, 
        attempt=${job.attemptsMade + 1}
      )
    `
    );

    return project;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown embedding refresh error";

    console.error(
      `[job] refresh-project-embedding failed 
      (
        jobId=${job.id}, 
        projectId=${projectId}, 
        attempt=${job.attemptsMade + 1}
      ): ${message}`,
      error
    );

    throw error instanceof Error ? error : new Error(message);
  }
}
