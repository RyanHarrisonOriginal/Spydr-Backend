import { describe, expect, it, vi } from "vitest";
import {
  ApplyActiveNoteCommand,
  ApplyActiveNoteCommandHandler,
} from "./apply-active-note.command.js";
import type { ICommandBus } from "../command-bus.js";
import { AddTaskToProjectCommand } from "../projects/index.js";
import { CreatePersonCommand } from "../people/index.js";
import { CreateProjectCommand } from "../projects/index.js";

function makeBus(execute: ICommandBus["execute"]): ICommandBus {
  return {
    register: vi.fn(),
    registerMany: vi.fn(),
    execute,
  };
}

describe("ApplyActiveNoteCommandHandler", () => {
  it("creates selected project, person, and project-scoped task", async () => {
    const execute = vi.fn(async (command: { commandType: string }) => {
      if (command.commandType === CreateProjectCommand.commandType) {
        return { id: "proj-1", title: "Muay Thai" };
      }
      if (command.commandType === CreatePersonCommand.commandType) {
        return { id: "person-1", fullName: "Coach Marcus" };
      }
      if (command.commandType === AddTaskToProjectCommand.commandType) {
        return { id: "task-1", title: "Practice teep setups" };
      }
      throw new Error(`Unexpected command ${command.commandType}`);
    });

    const handler = new ApplyActiveNoteCommandHandler(makeBus(execute));
    const result = await handler.execute(
      new ApplyActiveNoteCommand("user-1", "org-1", {
        activeNoteId: "note-1",
        content: "Ask Coach Marcus. Practice teeps in Muay Thai.",
        projectId: "proj-existing",
        operations: [
          {
            operationId: "op-project",
            selected: true,
            payload: {
              kind: "project",
              title: "Muay Thai",
              description: "Training focus",
            },
          },
          {
            operationId: "op-person",
            selected: true,
            payload: {
              kind: "person",
              title: "Coach Marcus",
            },
          },
          {
            operationId: "op-task",
            selected: true,
            selectedProjectId: "proj-existing",
            payload: {
              kind: "task",
              title: "Practice teep setups",
              priority: "high",
            },
          },
          {
            operationId: "op-skip",
            selected: false,
            payload: {
              kind: "task",
              title: "Ignored",
            },
          },
        ],
      })
    );

    expect(result.applied).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    expect(result.partial).toBe(false);
    expect(result.activeNote.status).toBe("completed");
    expect(result.applied.map((item) => item.type)).toEqual([
      "project",
      "person",
      "task",
    ]);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("records per-operation failures without aborting the batch", async () => {
    const execute = vi.fn(async (command: { commandType: string }) => {
      if (command.commandType === AddTaskToProjectCommand.commandType) {
        throw new Error("Project not found");
      }
      if (command.commandType === CreatePersonCommand.commandType) {
        return { id: "person-1", fullName: "Coach Marcus" };
      }
      throw new Error(`Unexpected command ${command.commandType}`);
    });

    const handler = new ApplyActiveNoteCommandHandler(makeBus(execute));
    const result = await handler.execute(
      new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          {
            operationId: "op-task",
            selected: true,
            selectedProjectId: "missing",
            payload: { kind: "task", title: "Broken task" },
          },
          {
            operationId: "op-person",
            selected: true,
            payload: { kind: "person", title: "Coach Marcus" },
          },
        ],
      })
    );

    expect(result.applied).toHaveLength(1);
    expect(result.failed).toEqual([
      { operationId: "op-task", message: "Project not found" },
    ]);
    expect(result.partial).toBe(true);
  });

  it("resolves projectRef after creating a project in the same batch", async () => {
    const execute = vi.fn(async (command: { commandType: string }) => {
      if (command.commandType === CreateProjectCommand.commandType) {
        return { id: "proj-new", title: "Eight-Week Lead Teep" };
      }
      if (command.commandType === AddTaskToProjectCommand.commandType) {
        return { id: "task-1", title: "Drill jab-to-teep entries" };
      }
      throw new Error(`Unexpected command ${command.commandType}`);
    });

    const handler = new ApplyActiveNoteCommandHandler(makeBus(execute));
    const result = await handler.execute(
      new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          {
            operationId: "task_1",
            selected: true,
            projectRef: "project_1",
            payload: { kind: "task", title: "Drill jab-to-teep entries" },
          },
          {
            operationId: "project_1",
            selected: true,
            objectType: "project",
            payload: {
              kind: "project",
              title: "Eight-Week Lead Teep",
            },
          },
        ],
      })
    );

    expect(result.failed).toHaveLength(0);
    expect(result.applied.map((item) => item.type)).toEqual([
      "project",
      "task",
    ]);
  });

  it("requires a project for project-scoped objects", async () => {
    const handler = new ApplyActiveNoteCommandHandler(
      makeBus(vi.fn(async () => null))
    );

    const result = await handler.execute(
      new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          {
            operationId: "op-task",
            selected: true,
            payload: { kind: "task", title: "No project" },
          },
        ],
      })
    );

    expect(result.applied).toHaveLength(0);
    expect(result.failed[0]?.message).toMatch(/project is required/i);
    expect(result.activeNote.status).toBe("failed");
  });
});
