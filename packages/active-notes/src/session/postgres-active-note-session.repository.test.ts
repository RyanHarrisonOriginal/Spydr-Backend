import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { PostgresActiveNoteSessionRepository } from "./postgres-active-note-session.repository.js";

function createDb() {
  return {
    spydrActiveNoteSession: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({
        id: "session-1",
        organizationId: "org-1",
        userId: "user-1",
        status: "analyzing",
      }),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
  it("creates a new analyzing session for each analysis", async () => {
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
    expect(db.spydrActiveNoteSession.findFirst).not.toHaveBeenCalled();
  });

  it("lists history for the current user", async () => {
    const db = createDb();
    db.spydrActiveNoteSession.findMany.mockResolvedValue([
      {
        id: "session-1",
        content: "Throw more teeps",
        status: "review",
        createdAt: new Date("2026-08-18T12:00:00.000Z"),
        updatedAt: new Date("2026-08-18T12:05:00.000Z"),
        completedAt: null,
        analyzeResponse: {
          actionPlans: [
            {
              originalText: "Throw more teeps",
              topic: "Teeps",
              action: {
                type: "create_task",
                payload: { title: "Drill teeps" },
              },
            },
          ],
        },
        reviewSnapshot: null,
      },
    ]);
    const repository = new PostgresActiveNoteSessionRepository(db as never);

    const history = await repository.listHistory({
      organizationId: "org-1",
      userId: "user-1",
    });

    expect(db.spydrActiveNoteSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          userId: "user-1",
        }),
      })
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.suggestions[0]).toMatchObject({
      title: "Drill teeps",
      decision: "pending",
    });
  });
});
