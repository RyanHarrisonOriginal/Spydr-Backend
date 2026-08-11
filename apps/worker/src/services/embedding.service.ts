import { UnrecoverableError } from "bullmq";
import {
  findExistingProjectRetrievalContext,
  findProjectForEmbedding,
  upsertProjectRetrievalContext,
} from "@spydr/db";
import {
  generateEmbedding,
  PROJECT_EMBEDDING_MODEL,
  EmbeddingGenerationError,
  type GenerateEmbeddingOptions,
} from "@spydr/ai";
import {
  buildProjectRetrievalDocument,
  createRetrievalContentHash,
} from "@spydr/shared";

export interface EmbeddingServiceDependencies {
  buildProjectRetrievalDocument?: (projectId: string) => Promise<string>;
  generateEmbedding?: (
    text: string,
    options?: GenerateEmbeddingOptions
  ) => Promise<number[]>;
  findProjectForEmbedding?: (
    projectId: string
  ) => Promise<{
    id: string;
    orgId: string;
    userId: string;
  } | null>;
  findExistingProjectRetrievalContext?: (
    projectId: string
  ) => Promise<{ contentHash: string; embeddedAt: Date | null } | null>;
  upsertProjectRetrievalContext?: (input: {
    projectId: string;
    organizationId: string;
    userId: string;
    contextText: string;
    embedding: number[];
    contentHash: string;
  }) => Promise<void>;
  createRetrievalContentHash?: (contextText: string) => string;
  model?: string;
}

export class EmbeddingService {
  private readonly buildDocument: typeof buildProjectRetrievalDocument;
  private readonly generateEmbeddingFn: (
    text: string,
    options?: GenerateEmbeddingOptions
  ) => Promise<number[]>;
  private readonly findProjectForEmbeddingFn: typeof findProjectForEmbedding;
  private readonly findExistingContextFn: typeof findExistingProjectRetrievalContext;
  private readonly upsertContextFn: typeof upsertProjectRetrievalContext;
  private readonly createContentHashFn: typeof createRetrievalContentHash;
  private readonly model: string;

  constructor(dependencies: EmbeddingServiceDependencies = {}) {
    this.buildDocument =
      dependencies.buildProjectRetrievalDocument ?? buildProjectRetrievalDocument;
    this.generateEmbeddingFn =
      dependencies.generateEmbedding ?? generateEmbedding;
    this.findProjectForEmbeddingFn =
      dependencies.findProjectForEmbedding ?? findProjectForEmbedding;
    this.findExistingContextFn =
      dependencies.findExistingProjectRetrievalContext ??
      findExistingProjectRetrievalContext;
    this.upsertContextFn =
      dependencies.upsertProjectRetrievalContext ?? upsertProjectRetrievalContext;
    this.createContentHashFn =
      dependencies.createRetrievalContentHash ?? createRetrievalContentHash;
    this.model = dependencies.model ?? PROJECT_EMBEDDING_MODEL;
  }

  async refreshProjectEmbedding(projectId: string): Promise<void> {
    let contextChanged = true;
    let embeddingSkipped = false;

    try {
      const project = await this.findProjectForEmbeddingFn(projectId);
      if (!project) {
        throw new UnrecoverableError(
          `Project not found or deleted: ${projectId}`
        );
      }

      const contextText = await this.buildDocument(projectId);

      if (!contextText.trim()) {
        throw new EmbeddingGenerationError(
          `Retrieval document is empty for project ${projectId}`
        );
      }

      const contentHash = this.createContentHashFn(contextText);
      const existingContext = await this.findExistingContextFn(projectId);

      if (existingContext?.contentHash === contentHash) {
        contextChanged = false;
        embeddingSkipped = true;

        console.info(
          `[embedding] refreshProjectEmbedding skipped (projectId=${projectId}, contextChanged=false, embeddingSkipped=true, reason=content-hash-unchanged)`
        );
        return;
      }

      const embedding = await this.generateEmbeddingFn(contextText, {
        model: this.model,
      });

      await this.upsertContextFn({
        projectId: project.id,
        organizationId: project.orgId,
        userId: project.userId,
        contextText,
        embedding,
        contentHash,
      });

      console.info(
        `[embedding] refreshProjectEmbedding succeeded (projectId=${projectId}, contextChanged=${contextChanged}, embeddingSkipped=${embeddingSkipped}, model=${this.model}, dimensions=${embedding.length})`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown embedding error";

      console.error(
        `[embedding] refreshProjectEmbedding failed (projectId=${projectId}, contextChanged=${contextChanged}, embeddingSkipped=${embeddingSkipped}, model=${this.model}): ${message}`
      );

      throw error instanceof Error ? error : new EmbeddingGenerationError(message);
    }
  }
}

export const embeddingService = new EmbeddingService();
