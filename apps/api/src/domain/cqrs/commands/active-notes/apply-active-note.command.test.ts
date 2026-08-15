import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ApplyActiveNoteCommand,
  ApplyActiveNoteCommandHandler,
} from "./apply-active-note.command.js";
import type { ICommandBus } from "../command-bus.js";
import type {
  ActiveNoteApplyOperationInput,
  ActiveNoteApplyRequest,
} from "../../../active-notes/index.js";

function createMockCommandBus(): ICommandBus {
  return {
    execute: vi.fn().mockResolvedValue({
      id: "created-id",
      title: "Created Item",
      orgId: "org-1",
      userId: "user-1",
    }),
    register: vi.fn(),
    registerMany: vi.fn(),
  };
}

function createTaskOperation(
  operationId: string,
  options: Partial<ActiveNoteApplyOperationInput> = {}
): ActiveNoteApplyOperationInput {
  return {
    operationId,
    selected: true,
    objectType: "task",
    selectedProjectId: "project-123",
    payload: {
      kind: "task",
      title: "Test Task",
      description: "Test description",
      projectId: "project-123",
    },
    ...options,
  };
}

function createNoteOperation(
  operationId: string,
  options: Partial<ActiveNoteApplyOperationInput> = {}
): ActiveNoteApplyOperationInput {
  return {
    operationId,
    selected: true,
    objectType: "note",
    selectedProjectId: "project-123",
    payload: {
      kind: "note",
      title: "Test Note",
      content: "Test content",
      projectId: "project-123",
    },
    ...options,
  };
}

describe("ApplyActiveNoteCommandHandler", () => {
  let commandBus: ICommandBus;
  let handler: ApplyActiveNoteCommandHandler;

  beforeEach(() => {
    commandBus = createMockCommandBus();
    handler = new ApplyActiveNoteCommandHandler(commandBus);
  });

  describe("filtering operations", () => {
    it("throws error when no operations have selected=true", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", { selected: false }),
          createTaskOperation("op-2", { selected: false }),
        ],
      });

      await expect(handler.execute(command)).rejects.toThrow(
        "Select at least one proposal to apply"
      );
    });

    it("filters out operations with selected=false", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", { selected: true }),
          createTaskOperation("op-2", { selected: false }),
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(1);
    });

    it("filters out operations with duplicateResolution=ignore", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", { selected: true }),
          createTaskOperation("op-2", {
            selected: true,
            duplicateResolution: "ignore",
          }),
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(1);
    });
  });

  describe("creating tasks", () => {
    it("creates a task with valid operation", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [createTaskOperation("op-1")],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0]).toMatchObject({
        type: "task",
        action: "created",
      });
      expect(result.failed).toHaveLength(0);
    });

    it("fails when task has no title", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", {
            payload: {
              kind: "task",
              title: "",
              projectId: "project-123",
            },
          }),
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].message).toContain("title is required");
    });

    it("fails when task has no project", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", {
            selectedProjectId: null,
            payload: {
              kind: "task",
              title: "Test Task",
              projectId: null,
            },
          }),
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].message).toContain("project is required");
    });
  });

  describe("handling no_action operations", () => {
    it("returns null for no_action operations (excluded from applied)", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", { selected: true }),
          {
            operationId: "op-2",
            selected: true,
            payload: {
              kind: "no_action",
              message: "No action needed",
            },
          },
        ],
      });

      const result = await handler.execute(command);

      // Only the task operation should be in applied
      // The no_action operation returns null and is not added to applied
      expect(result.applied).toHaveLength(1);
      expect(result.applied[0]).toMatchObject({
        type: "task",
      });
      expect(result.failed).toHaveLength(0);
    });

    it("throws error when only no_action operations are selected", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          {
            operationId: "op-1",
            selected: true,
            payload: {
              kind: "no_action",
              message: "No action needed",
            },
          },
        ],
      });

      await expect(handler.execute(command)).rejects.toThrow(
        "No actionable operations to apply"
      );
    });
  });

  describe("handling attach_existing operations", () => {
    it("returns synthetic updated result for attach_existing", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          {
            operationId: "op-1",
            selected: true,
            objectType: "task",
            duplicateResolution: "attach_existing",
            targetObjectId: "existing-task-123",
            payload: {
              kind: "task",
              title: "Existing Task",
            },
          },
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0]).toMatchObject({
        id: "existing-task-123",
        type: "task",
        title: "Existing Task",
        action: "updated",
      });
    });

    it("fails attach_existing when targetObjectId is missing", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          {
            operationId: "op-1",
            selected: true,
            objectType: "task",
            duplicateResolution: "attach_existing",
            // Missing targetObjectId
            payload: {
              kind: "task",
              title: "Existing Task",
            },
          },
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].message).toContain("target");
    });
  });

  describe("result status", () => {
    it("returns completed status when all operations succeed", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [createTaskOperation("op-1")],
      });

      const result = await handler.execute(command);

      expect(result.activeNote.status).toBe("completed");
      expect(result.partial).toBe(false);
    });

    it("returns failed status when all operations fail", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1", {
            selectedProjectId: null,
            payload: {
              kind: "task",
              title: "Test",
              projectId: null,
            },
          }),
        ],
      });

      const result = await handler.execute(command);

      expect(result.activeNote.status).toBe("failed");
      expect(result.partial).toBe(false);
    });

    it("returns partial=true when some operations succeed and some fail", async () => {
      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          createTaskOperation("op-1"), // Will succeed
          createTaskOperation("op-2", {
            selectedProjectId: null,
            payload: {
              kind: "task",
              title: "Test",
              projectId: null,
            },
          }), // Will fail
        ],
      });

      const result = await handler.execute(command);

      expect(result.partial).toBe(true);
      expect(result.applied.length).toBeGreaterThan(0);
      expect(result.failed.length).toBeGreaterThan(0);
    });
  });

  describe("project creation order", () => {
    it("creates projects before tasks that reference them via projectRef", async () => {
      const mockExecute = vi.fn();
      
      // Track the order of executions
      const executionOrder: string[] = [];
      
      mockExecute.mockImplementation(async (cmd) => {
        const cmdType = cmd.commandType;
        executionOrder.push(cmdType);
        
        if (cmdType === "projects.create") {
          return {
            id: "new-project-id",
            title: "New Project",
            orgId: "org-1",
            userId: "user-1",
          };
        }
        
        return {
          id: "created-task-id",
          title: "Task Title",
          orgId: "org-1",
          userId: "user-1",
        };
      });
      
      commandBus.execute = mockExecute;

      const command = new ApplyActiveNoteCommand("user-1", "org-1", {
        operations: [
          // Task that references the new project
          {
            operationId: "op-task",
            selected: true,
            objectType: "task",
            projectRef: "op-project", // References the project operation
            payload: {
              kind: "task",
              title: "Task for new project",
            },
          },
          // Project operation
          {
            operationId: "op-project",
            selected: true,
            objectType: "project",
            payload: {
              kind: "project",
              title: "New Project",
            },
          },
        ],
      });

      const result = await handler.execute(command);

      expect(result.applied).toHaveLength(2);
      
      // Verify project was created first
      expect(executionOrder[0]).toBe("projects.create");
      expect(executionOrder[1]).toBe("projects.tasks.add");
    });
  });
});
