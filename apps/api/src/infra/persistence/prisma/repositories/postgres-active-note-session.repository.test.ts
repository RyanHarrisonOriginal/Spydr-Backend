import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { PostgresActiveNoteSessionRepository } from "./postgres-active-note-session.repository.js";

function createDb() {
  return {
    spydrActiveNoteSession: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "session-1",
        organizationId: "org-1",
        userId: "user-1",
        status: "analyzing",
      }),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    spydrActiveNoteSessionStep: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

describe("PostgresActiveNoteSessionRepository", () => {
  it("creates an analyzing session and clears previous steps", async () => {
    const db = createDb();
    const repository = new PostgresActiveNoteSessionRepository(db as never);

    const session = await repository.beginAnalysis({
      organizationId: "org-1",
      userId: "user-1",
      content: "Throw more teeps",
      promptVersion: "active-note-segmentation-v1",
    });

    expect(session.id).toBe("session-1");
    expect(db.spydrActiveNoteSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        status: "analyzing",
        content: "Throw more teeps",
        analyzeResponse: Prisma.DbNull,
        stepPayloads: {},
      }),
    });
    expect(db.spydrActiveNoteSessionStep.deleteMany).toHaveBeenCalledWith({
      where: { sessionId: "session-1" },
    });
  });

  it("reuses an in-flight session instead of inserting a second row", async () => {
    const db = createDb();
    db.spydrActiveNoteSession.findFirst.mockResolvedValue({ id: "session-existing" });
    db.spydrActiveNoteSession.update.mockResolvedValue({
      id: "session-existing",
      organizationId: "org-1",
      userId: "user-1",
      status: "analyzing",
    });
    const repository = new PostgresActiveNoteSessionRepository(db as never);

    const session = await repository.beginAnalysis({
      organizationId: "org-1",
      userId: "user-1",
      content: "Updated note",
    });

    expect(session.id).toBe("session-existing");
    expect(db.spydrActiveNoteSession.create).not.toHaveBeenCalled();
    expect(db.spydrActiveNoteSession.update).toHaveBeenCalledWith({
      where: { id: "session-existing" },
      data: expect.objectContaining({
        content: "Updated note",
        status: "analyzing",
      }),
    });
  });
});
