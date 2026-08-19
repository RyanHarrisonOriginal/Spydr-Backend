import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createRetrievalContentHash } from "@spydr/shared";
import type {
  ActiveNoteAnalysisSession,
  BeginActiveNoteAnalysisInput,
  CompleteActiveNoteAnalysisInput,
  CompleteActiveNoteApplyInput,
  FailActiveNoteAnalysisInput,
  IActiveNoteSessionRepository,
  ListActiveNoteHistoryInput,
  RecordActiveNoteAnalysisStepInput,
} from "../../../../domain/interfaces/active-note-session-repository.js";
import { stripPipelinePayload } from "../../../../domain/active-notes/pipeline/helpers/strip-pipeline-payload.js";
import { mapSessionToHistoryItem } from "../../../../domain/active-notes/history/map-session-to-history-item.js";
import type { ActiveNoteHistoryItem } from "../../../../domain/active-notes/types/shared.js";

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
    const session = await this.db.spydrActiveNoteSession.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        projectId: input.projectId ?? null,
        status: "analyzing",
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
      },
    });

    return {
      id: session.id,
      organizationId: session.organizationId,
      userId: session.userId,
      status: session.status,
    };
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

function asJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
