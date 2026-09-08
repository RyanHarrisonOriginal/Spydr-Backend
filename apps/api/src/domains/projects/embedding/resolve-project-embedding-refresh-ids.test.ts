import { describe, expect, it, vi } from "vitest";
import { CreateProjectCommand } from "../commands/create-project.command.js";
import { UpdateProjectCommand } from "../commands/update-project.command.js";
import { AddTaskToProjectCommand } from "../commands/add-task-to-project.command.js";
import { UpdateProjectChildCommand } from "../commands/project-child.commands.js";
import { DeleteProjectChildCommand } from "../commands/project-child.commands.js";
import { UpdateTaskCommand } from "../../tasks/commands/update-task.command.js";
import { DeleteTaskCommand } from "../../tasks/commands/delete-task.command.js";
import { UpdateNoteCommand } from "../../notes/commands/update-note.command.js";
import { DeleteNoteCommand } from "../../notes/commands/delete-note.command.js";
import { DeleteIdeaCommand } from "../../ideas/commands/delete-idea.command.js";
import { ProjectNode } from "../models/index.js";
import {
  collectPreMutationProjectIds,
  projectUpdateAffectsRetrievalContext,
  resolveProjectEmbeddingRefreshIds,
} from "./resolve-project-embedding-refresh-ids.js";

const ORG_ID = "org-1";
const USER_ID = "user-1";
const PROJECT_ID = "project-1";

function createRepositories(overrides: Partial<{
  taskViews: { getListItem: ReturnType<typeof vi.fn> };
  noteViews: { getListItem: ReturnType<typeof vi.fn> };
}> = {}) {
  return {
    taskViews: {
      getListItem: vi.fn(),
      ...overrides.taskViews,
    },
    noteViews: {
      getListItem: vi.fn(),
      ...overrides.noteViews,
    },
  } as never;
}

describe("projectUpdateAffectsRetrievalContext", () => {
  it("returns true when the project description changes", () => {
    expect(projectUpdateAffectsRetrievalContext({ body: "Updated" })).toBe(true);
  });

  it("returns false when unrelated project fields change", () => {
    expect(projectUpdateAffectsRetrievalContext({ status: "archived" })).toBe(false);
  });
});

describe("resolveProjectEmbeddingRefreshIds", () => {
  it("returns the new project id after project creation", async () => {
    const command = new CreateProjectCommand(USER_ID, ORG_ID, { title: "Launch" });
    const result = { id: PROJECT_ID } as ProjectNode;

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command,
        result,
        repositories: createRepositories(),
        prisma: {} as never,
      })
    ).resolves.toEqual([PROJECT_ID]);
  });

  it("returns the project id when the description changes", async () => {
    const command = new UpdateProjectCommand(USER_ID, ORG_ID, PROJECT_ID, {
      body: "Updated description",
    });

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command,
        result: {} as ProjectNode,
        repositories: createRepositories(),
        prisma: {} as never,
      })
    ).resolves.toEqual([PROJECT_ID]);
  });

  it("skips project updates that do not affect retrieval context", async () => {
    const command = new UpdateProjectCommand(USER_ID, ORG_ID, PROJECT_ID, {
      status: "archived",
    });

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command,
        result: {} as ProjectNode,
        repositories: createRepositories(),
        prisma: {} as never,
      })
    ).resolves.toEqual([]);
  });

  it("returns the project id for child create/update/delete commands", async () => {
    const createTask = new AddTaskToProjectCommand(USER_ID, ORG_ID, PROJECT_ID, {
      title: "Task",
    });
    const updateTask = new UpdateProjectChildCommand(
      USER_ID,
      ORG_ID,
      PROJECT_ID,
      "task-1",
      "task",
      { title: "Updated" }
    );
    const deleteTask = new DeleteProjectChildCommand(
      USER_ID,
      ORG_ID,
      PROJECT_ID,
      "task-1",
      "task"
    );

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command: createTask,
        result: {},
        repositories: createRepositories(),
        prisma: {} as never,
      })
    ).resolves.toEqual([PROJECT_ID]);

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command: updateTask,
        result: {},
        repositories: createRepositories(),
        prisma: {} as never,
      })
    ).resolves.toEqual([PROJECT_ID]);

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command: deleteTask,
        result: {},
        repositories: createRepositories(),
        prisma: {} as never,
      })
    ).resolves.toEqual([PROJECT_ID]);
  });

  it("returns both previous and next project ids when a task is reassigned", async () => {
    const command = new UpdateTaskCommand(USER_ID, ORG_ID, "task-1", {
      projectNodeId: "project-2",
    });

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command,
        result: {
          task: {},
          project: { id: "project-2", title: "Next" },
        },
        repositories: createRepositories(),
        prisma: {} as never,
        preMutationProjectIds: ["project-1"],
      })
    ).resolves.toEqual(["project-1", "project-2"]);
  });

  it("uses pre-mutation project ids for global delete commands", async () => {
    const command = new DeleteTaskCommand(USER_ID, ORG_ID, "task-1");

    await expect(
      resolveProjectEmbeddingRefreshIds({
        command,
        result: true,
        repositories: createRepositories(),
        prisma: {} as never,
        preMutationProjectIds: [PROJECT_ID],
      })
    ).resolves.toEqual([PROJECT_ID]);
  });
});

describe("collectPreMutationProjectIds", () => {
  it("loads the persisted project id before deleting a note", async () => {
    const repositories = createRepositories({
      noteViews: {
        getListItem: vi.fn().mockResolvedValue({
          note: {},
          project: { id: PROJECT_ID, title: "Project" },
        }),
      },
    });

    await expect(
      collectPreMutationProjectIds(
        new DeleteNoteCommand(USER_ID, ORG_ID, "note-1"),
        repositories,
        {} as never
      )
    ).resolves.toEqual([PROJECT_ID]);
  });

  it("loads the persisted project id before deleting an idea", async () => {
    const prisma = {
      spydrNodeRelationship: {
        findMany: vi.fn().mockResolvedValue([
          { sourceNodeId: PROJECT_ID, targetNodeId: "idea-1" },
        ]),
      },
      spydrNode: {
        findFirst: vi.fn().mockResolvedValue({ id: PROJECT_ID }),
      },
    };

    await expect(
      collectPreMutationProjectIds(
        new DeleteIdeaCommand(USER_ID, ORG_ID, "idea-1"),
        createRepositories(),
        prisma as never
      )
    ).resolves.toEqual([PROJECT_ID]);
  });
});
