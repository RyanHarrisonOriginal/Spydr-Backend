import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createRetrievalContentHash } from "@spydr/shared";
import type {
  ActiveNoteAnalysisSession,
  BeginActiveNoteAnalysisInput,
  CompleteActiveNoteAnalysisInput,
  FailActiveNoteAnalysisInput,
  IActiveNoteSessionRepository,
  RecordActiveNoteAnalysisStepInput,
} from "../../../../domain/interfaces/active-note-session-repository.js";
import { stripPipelinePayload } from "../../../../domain/active-notes/pipeline/helpers/strip-pipeline-payload.js";

const IN_FLIGHT_STATUSES = [
  "draft",
  "analyzing",
  "review",
  "applying",
] as const;

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SCHEMA_VERSION = 1;

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
    const data: Prisma.SpydrActiveNoteSessionUncheckedCreateInput = {
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
    };

    const existing = await this.findInFlight(
      input.organizationId,
      input.userId
    );

    const session = existing
      ? await this.db.spydrActiveNoteSession.update({
          where: { id: existing.id },
          data,
        })
      : await this.createInFlightSession(data);

    await this.db.spydrActiveNoteSessionStep.deleteMany({
      where: { sessionId: session.id },
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

  private findInFlight(organizationId: string, userId: string) {
    return this.db.spydrActiveNoteSession.findFirst({
      where: {
        organizationId,
        userId,
        status: { in: [...IN_FLIGHT_STATUSES] },
      },
      select: { id: true },
    });
  }

  private async createInFlightSession(
    data: Prisma.SpydrActiveNoteSessionUncheckedCreateInput
  ) {
    try {
      return await this.db.spydrActiveNoteSession.create({ data });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
      ) {
        throw error;
      }

      const existing = await this.findInFlight(
        data.organizationId,
        data.userId
      );
      if (!existing) {
        throw error;
      }

      return this.db.spydrActiveNoteSession.update({
        where: { id: existing.id },
        data,
      });
    }
  }
}

function asJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
