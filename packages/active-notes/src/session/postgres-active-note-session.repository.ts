import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createRetrievalContentHash } from "@spydr/shared";
import type {
  ActiveNoteAnalysisRecord,
  ActiveNoteAnalysisSession,
  BeginActiveNoteAnalysisInput,
  CompleteActiveNoteAnalysisInput,
  CompleteActiveNoteApplyInput,
  FailActiveNoteAnalysisInput,
  IActiveNoteSessionRepository,
  ListActiveNoteHistoryInput,
  RecordActiveNoteAnalysisStepInput,
} from "./active-note-session-repository.js";
import { stripPipelinePayload } from "./strip-pipeline-payload.js";
import { mapSessionToHistoryItem, parseReviewSnapshot } from "./active-note-session.mapper.js";
import {
  ACTIVE_NOTE_PIPELINE_STEPS,
  type ActiveNoteAIOutput,
  type ActiveNoteHistoryItem,
  type ActiveNotePipelineStepName,
} from "../domain/index.js";

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;
const HISTORY_LIMIT = 50;
const HISTORY_STATUSES = ["review", "applying", "completed", "failed"] as const;

function toJson(value: unknown): Prisma.InputJsonValue {
  return stripPipelinePayload(value) as Prisma.InputJsonValue;
}

function sessionExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export class PostgresActiveNoteSessionRepository
  implements IActiveNoteSessionRepository
{
  constructor(private readonly db: PrismaClient) {}

  async beginAnalysis(
    input: BeginActiveNoteAnalysisInput
  ): Promise<ActiveNoteAnalysisSession> {
    const now = new Date();
    const resetData = {
      projectId: input.projectId ?? null,
      status: "analyzing" as const,
      content: input.content,
      contentHash: createRetrievalContentHash(input.content),
      schemaVersion: SCHEMA_VERSION,
      promptVersion: input.promptVersion ?? null,
      analyzeResponse: Prisma.DbNull,
      reviewSnapshot: Prisma.DbNull,
      stepPayloads: {},
      errorMessage: null,
      failedStep: null,
      completedAt: null,
      expiresAt: sessionExpiresAt(now),
    };

    // Partial unique index uq_active_note_sessions_inflight allows only one
    // draft|analyzing|review|applying session per org+user. Re-analyze reuses it.
    const existing = await this.db.spydrActiveNoteSession.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: { in: ["draft", "analyzing", "review", "applying"] },
      },
      select: { id: true },
    });

    if (existing) {
      await this.db.$transaction(async (tx) => {
        await tx.spydrActiveNoteSessionStep.deleteMany({
          where: { sessionId: existing.id },
        });
        await tx.spydrActiveNoteSession.update({
          where: { id: existing.id },
          data: resetData,
        });
      });

      return {
        id: existing.id,
        organizationId: input.organizationId,
        userId: input.userId,
        status: "analyzing",
      };
    }

    try {
      const session = await this.db.spydrActiveNoteSession.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          ...resetData,
        },
      });

      return {
        id: session.id,
        organizationId: session.organizationId,
        userId: session.userId,
        status: session.status,
      };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

      // Concurrent begin raced the partial unique index — take over the in-flight row.
      const raced = await this.db.spydrActiveNoteSession.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
          status: { in: ["draft", "analyzing", "review", "applying"] },
        },
        select: { id: true },
      });

      if (!raced) {
        throw error;
      }

      await this.db.$transaction(async (tx) => {
        await tx.spydrActiveNoteSessionStep.deleteMany({
          where: { sessionId: raced.id },
        });
        await tx.spydrActiveNoteSession.update({
          where: { id: raced.id },
          data: resetData,
        });
      });

      return {
        id: raced.id,
        organizationId: input.organizationId,
        userId: input.userId,
        status: "analyzing",
      };
    }
  }

  async getById(sessionId: string): Promise<ActiveNoteAnalysisRecord | null> {
    const session = await this.db.spydrActiveNoteSession.findUnique({
      where: { id: sessionId },
      select: analysisRecordSelect,
    });
    return session ? toAnalysisRecord(session) : null;
  }

  async getForUser(input: {
    sessionId: string;
    organizationId: string;
    userId: string;
  }): Promise<ActiveNoteAnalysisRecord | null> {
    const session = await this.db.spydrActiveNoteSession.findFirst({
      where: {
        id: input.sessionId,
        organizationId: input.organizationId,
        userId: input.userId,
      },
      select: analysisRecordSelect,
    });
    return session ? toAnalysisRecord(session) : null;
  }

  async recordStep(input: RecordActiveNoteAnalysisStepInput): Promise<void> {
    const payload = toJson(input.payload);
    const now = new Date();

    await this.db.$transaction(async (tx) => {
      const existing = await tx.spydrActiveNoteSessionStep.findUnique({
        where: {
          sessionId_step: {
            sessionId: input.sessionId,
            step: input.step,
          },
        },
        select: { attempt: true },
      });

      await tx.spydrActiveNoteSessionStep.upsert({
        where: {
          sessionId_step: {
            sessionId: input.sessionId,
            step: input.step,
          },
        },
        create: {
          sessionId: input.sessionId,
          step: input.step,
          status: "succeeded",
          attempt: 1,
          payload,
          errorMessage: null,
          startedAt: now,
          completedAt: now,
        },
        update: {
          status: "succeeded",
          attempt: (existing?.attempt ?? 0) + 1,
          payload,
          errorMessage: null,
          completedAt: now,
        },
      });

      const session = await tx.spydrActiveNoteSession.findUniqueOrThrow({
        where: { id: input.sessionId },
        select: { stepPayloads: true },
      });

      const stepPayloads = asJsonObject(session.stepPayloads);

      await tx.spydrActiveNoteSession.update({
        where: { id: input.sessionId },
        data: {
          stepPayloads: {
            ...stepPayloads,
            [input.step]: payload,
          } as Prisma.InputJsonValue,
        },
      });
    });
  }

  async completeAnalysis(
    input: CompleteActiveNoteAnalysisInput
  ): Promise<void> {
    await this.db.spydrActiveNoteSession.update({
      where: { id: input.sessionId },
      data: {
        status: "review",
        analyzeResponse: toJson(input.analyzeResponse),
        errorMessage: null,
        failedStep: null,
      },
    });
  }

  async failAnalysis(input: FailActiveNoteAnalysisInput): Promise<void> {
    await this.db.spydrActiveNoteSession.update({
      where: { id: input.sessionId },
      data: {
        status: "failed",
        errorMessage: input.errorMessage,
        failedStep: input.failedStep,
      },
    });
  }

  async completeApply(input: CompleteActiveNoteApplyInput): Promise<void> {
    const now = new Date();
    await this.db.spydrActiveNoteSession.updateMany({
      where: {
        id: input.sessionId,
        organizationId: input.organizationId,
        userId: input.userId,
      },
      data: {
        status: input.status,
        reviewSnapshot: toJson(input.reviewSnapshot),
        completedAt: now,
        errorMessage: null,
        failedStep: null,
      },
    });
  }

  async listHistory(
    input: ListActiveNoteHistoryInput
  ): Promise<ActiveNoteHistoryItem[]> {
    const sessions = await this.db.spydrActiveNoteSession.findMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: { in: [...HISTORY_STATUSES] },
      },
      orderBy: { updatedAt: "desc" },
      take: input.limit ?? HISTORY_LIMIT,
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        analyzeResponse: true,
        reviewSnapshot: true,
      },
    });

    return sessions
      .map(mapSessionToHistoryItem)
      .filter((item): item is ActiveNoteHistoryItem => item != null);
  }
}

const analysisRecordSelect = {
  id: true,
  organizationId: true,
  userId: true,
  status: true,
  content: true,
  projectId: true,
  analyzeResponse: true,
  reviewSnapshot: true,
  stepPayloads: true,
  errorMessage: true,
  failedStep: true,
} as const;

function toAnalysisRecord(session: {
  id: string;
  organizationId: string;
  userId: string;
  status: ActiveNoteAnalysisRecord["status"];
  content: string;
  projectId: string | null;
  analyzeResponse: Prisma.JsonValue;
  reviewSnapshot: Prisma.JsonValue;
  stepPayloads: Prisma.JsonValue;
  errorMessage: string | null;
  failedStep: string | null;
}): ActiveNoteAnalysisRecord {
  return {
    id: session.id,
    organizationId: session.organizationId,
    userId: session.userId,
    status: session.status,
    content: session.content,
    projectId: session.projectId,
    analyzeResponse: asAnalyzeResponse(session.analyzeResponse),
    reviewSnapshot: parseReviewSnapshot(session.reviewSnapshot),
    completedSteps: completedStepsFromPayloads(session.stepPayloads),
    errorMessage: session.errorMessage,
    failedStep: session.failedStep,
  };
}

function asAnalyzeResponse(value: Prisma.JsonValue): ActiveNoteAIOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.segments) || !Array.isArray(record.actionPlans)) {
    return null;
  }
  return record as unknown as ActiveNoteAIOutput;
}

function completedStepsFromPayloads(
  value: Prisma.JsonValue
): ActiveNotePipelineStepName[] {
  const payloads = asJsonObject(value);
  return ACTIVE_NOTE_PIPELINE_STEPS.filter((step) => step in payloads);
}

function asJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
