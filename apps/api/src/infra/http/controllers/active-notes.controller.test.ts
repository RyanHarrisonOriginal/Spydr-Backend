import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { ActiveNotesController } from "./active-notes.controller.js";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";

function mockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function mockRequest(body: unknown, params: Record<string, string> = {}): Request {
  return {
    body,
    params,
    orgContext: { userId: "user-1", orgId: "org-1", role: "owner" },
  } as unknown as Request;
}

describe("ActiveNotesController.analyze", () => {
  it("returns 202 when analysis is queued", async () => {
    const accepted = { sessionId: "session-1", status: "analyzing" };
    const commandBus: ICommandBus = {
      execute: vi.fn(),
      register: vi.fn(),
      registerMany: vi.fn(),
    };
    const queryBus: IQueryBus = {
      execute: vi.fn().mockResolvedValue(accepted),
      register: vi.fn(),
      registerMany: vi.fn(),
    };
    const controller = new ActiveNotesController(queryBus, commandBus);
    const res = mockResponse();

    await controller.analyze(
      mockRequest({ content: "Throw more teeps" }),
      res
    );

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(accepted);
  });
});

describe("ActiveNotesController.apply", () => {
  it("dispatches ApplyActiveNoteCommand for a frontend-shaped body", async () => {
    const applyResult = {
      activeNote: {
        id: "draft-1",
        content: "Met with Amy.",
        projectId: null,
        status: "completed",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      applied: [
        {
          id: "note-1",
          type: "note",
          title: "Meeting update",
          action: "created",
          href: "/notes/note-1",
        },
      ],
      failed: [],
      partial: false,
    };
    const commandBus: ICommandBus = {
      execute: vi.fn().mockResolvedValue(applyResult),
      register: vi.fn(),
      registerMany: vi.fn(),
    };
    const queryBus: IQueryBus = {
      execute: vi.fn(),
      register: vi.fn(),
      registerMany: vi.fn(),
    };
    const controller = new ActiveNotesController(queryBus, commandBus);
    const res = mockResponse();

    await controller.apply(
      mockRequest({
        activeNoteId: "draft-1",
        content: "Met with Amy.",
        projectId: null,
        operations: [
          {
            operationId: "op-0",
            selected: true,
            objectType: "note",
            payload: {
              kind: "note",
              title: "Meeting update",
              content: "Met with Amy.",
              projectId: "proj-1",
            },
            selectedProjectId: "proj-1",
            projectRef: null,
            duplicateResolution: null,
            targetObjectId: null,
            attachment: null,
          },
        ],
      }),
      res
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
    const command = (commandBus.execute as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(command.commandType).toBe("active-notes.apply");
    expect(command.input.operations[0]).toMatchObject({
      operationId: "op-0",
      selected: true,
      objectType: "note",
      payload: { kind: "note", title: "Meeting update" },
      selectedProjectId: "proj-1",
    });
    expect(res.json).toHaveBeenCalledWith(applyResult);
  });

  it("returns 400 with a field path when the body is invalid", async () => {
    const commandBus: ICommandBus = {
      execute: vi.fn(),
      register: vi.fn(),
      registerMany: vi.fn(),
    };
    const queryBus: IQueryBus = {
      execute: vi.fn(),
      register: vi.fn(),
      registerMany: vi.fn(),
    };
    const controller = new ActiveNotesController(queryBus, commandBus);
    const res = mockResponse();

    await controller.apply(
      mockRequest({
        content: "Note",
        operations: [
          {
            operationId: "op-0",
            selected: true,
            payload: { kind: "not-a-real-kind", title: "Nope" },
          },
        ],
      }),
      res
    );

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/payload\.kind/i),
      })
    );
  });
});
