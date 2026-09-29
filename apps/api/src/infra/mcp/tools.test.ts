import { describe, expect, it, vi } from "vitest";
import {
  AddIdeaToProjectCommand,
  AddNoteToProjectCommand,
  AddTaskToProjectCommand,
  AddTasksToProjectCommand,
  CompleteTaskCommand,
  CreatePersonCommand,
  CreateProjectCommand,
  CreateProjectTemplateCommand,
  InvokeProjectTemplateCommand,
  GetMeQuery,
  GetTaskQuery,
  ListOrganizationsQuery,
  ListPeopleQuery,
  ListProjectAreasQuery,
  ListProjectsQuery,
  TransformNodeTypeCommand,
  UpdateNodeCommand,
  UpdateProjectChildCommand,
  UpdateProjectCommand,
  UpdateTaskCommand,
} from "../../domains/shared/application/index.js";
import type { ICommandBus } from "../../domains/shared/application/index.js";
import type { IQueryBus } from "../../domains/shared/application/index.js";
import { ProjectNode } from "../../domains/projects/models/index.js";
import { TaskNode } from "../../domains/tasks/models/index.js";
import { NoteNode } from "../../domains/notes/models/index.js";
import { IdeaNode } from "../../domains/ideas/models/index.js";
import { DomainNode } from "../../domains/shared/models/shared.js";
import { PersonNode } from "../../domains/people/models/index.js";
import { ProjectAreaNode } from "../../domains/project-areas/models/index.js";
import { Organization } from "../../domains/organizations/models/index.js";
import { ProjectTemplate } from "../../domains/project-templates/models/index.js";
import type { SpydrNodeStatus } from "../../domains/shared/models/shared.js";
import { SpydrMcpTools } from "./tools.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function mockBuses() {
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
  return { commandBus, queryBus };
}

function project(status: SpydrNodeStatus = "active") {
  return new ProjectNode({
    id: "project-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Launch",
    body: "",
    status,
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: null,
  });
}

function template() {
  return new ProjectTemplate({
    id: "template-1",
    orgId: "org-1",
    createdByUserId: "user-1",
    name: "Launch",
    description: null,
    titleTemplate: "Launch {{CLIENT}}",
    bodyTemplate: "",
    outcomeTemplate: null,
    status: "active",
    priority: "medium",
    riskLevel: "medium",
    area: null,
    tags: [],
    sourceProjectNodeId: null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  });
}

function task(status: SpydrNodeStatus = "active") {
  return new TaskNode({
    id: "task-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Write brief",
    body: "",
    status,
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: null,
  });
}

function note() {
  return new NoteNode({
    id: "note-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Kickoff notes",
    body: "Talked through scope",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: null,
  });
}

function idea() {
  return new IdeaNode({
    id: "idea-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Ship a beta",
    body: "Invite ten users",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: {
      confidence: null,
      potentialValue: "medium",
      promotedToProjectNodeId: null,
      createdAt: now,
      updatedAt: now,
    },
  });
}

function domainNode() {
  return new DomainNode({
    id: "note-1",
    orgId: "org-1",
    userId: "user-1",
    nodeType: "note",
    title: "Kickoff",
    body: "Notes",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
}

function area() {
  return new ProjectAreaNode({
    id: "area-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Growth",
    body: "",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: null,
  });
}

function person() {
  return new PersonNode({
    id: "person-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Ada Lovelace",
    body: "",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: {
      fullName: "Ada Lovelace",
      email: null,
      title: null,
      organization: null,
      relationshipContext: null,
      clerkUserId: null,
      createdAt: now,
      updatedAt: now,
    },
  });
}

function parse(result: { content: Array<{ type: string; text: string }>; isError?: boolean }) {
  expect(result.isError).toBeFalsy();
  return JSON.parse(result.content[0].text) as unknown;
}

describe("SpydrMcpTools", () => {
  const context = { userId: "user-1", orgId: "org-1" };

  it("creates a project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(project());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(await tools.createProject({ title: "Launch" }));

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateProjectCommand)
    );
    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as CreateProjectCommand;
    expect(command.userId).toBe("user-1");
    expect(command.orgId).toBe("org-1");
    expect(command.input.title).toBe("Launch");
    expect(result).toMatchObject({ id: "project-1", title: "Launch" });
  });

  it("creates a project template", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(template());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.createProjectTemplate({
        name: "Launch",
        titleTemplate: "Launch {{CLIENT}}",
        parameters: [{ key: "CLIENT" }],
        tasks: [{ titleTemplate: "Kickoff with {{CLIENT}}" }],
      })
    );

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as CreateProjectTemplateCommand;
    expect(command).toBeInstanceOf(CreateProjectTemplateCommand);
    expect(command.userId).toBe("user-1");
    expect(command.orgId).toBe("org-1");
    expect(command.input).toEqual({
      name: "Launch",
      titleTemplate: "Launch {{CLIENT}}",
      parameters: [{ key: "CLIENT" }],
      tasks: [{ titleTemplate: "Kickoff with {{CLIENT}}" }],
    });
    expect(result).toMatchObject({
      id: "template-1",
      name: "Launch",
      titleTemplate: "Launch {{CLIENT}}",
    });
  });

  it("creates a project from a template", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(project());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.createProjectFromTemplate({
        templateId: "template-1",
        parameters: { CLIENT: "Acme" },
        areaNodeId: "area-1",
      })
    );

    const command = vi.mocked(commandBus.execute).mock
      .calls[0][0] as InvokeProjectTemplateCommand;
    expect(command).toBeInstanceOf(InvokeProjectTemplateCommand);
    expect(command.userId).toBe("user-1");
    expect(command.orgId).toBe("org-1");
    expect(command.templateId).toBe("template-1");
    expect(command.input).toEqual({
      parameters: { CLIENT: "Acme" },
      areaNodeId: "area-1",
    });
    expect(result).toMatchObject({ id: "project-1", title: "Launch" });
  });

  it("creates a task on a project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(task());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.createTask({ projectId: "project-1", title: "Write brief" })
    );

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as AddTaskToProjectCommand;
    expect(command).toBeInstanceOf(AddTaskToProjectCommand);
    expect(command.projectId).toBe("project-1");
    expect(command.input.title).toBe("Write brief");
    expect(result).toMatchObject({ id: "task-1", title: "Write brief" });
  });

  it("creates multiple tasks on a project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue([
      task(),
      task(),
    ]);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.createTasks({
        projectId: "project-1",
        tasks: [{ title: "Write brief" }, { title: "Review brief", dueDate: "2026-10-01" }],
      })
    );

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as AddTasksToProjectCommand;
    expect(command).toBeInstanceOf(AddTasksToProjectCommand);
    expect(command.projectId).toBe("project-1");
    expect(command.orgId).toBe("org-1");
    expect(command.tasks).toEqual([
      { title: "Write brief" },
      { title: "Review brief", dueDate: "2026-10-01" },
    ]);
    expect(result).toEqual([
      expect.objectContaining({ id: "task-1", title: "Write brief" }),
      expect.objectContaining({ id: "task-1", title: "Write brief" }),
    ]);
  });

  it("adds a note linked to a task via the parent project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue({
      task: task(),
      project: { id: "project-1", title: "Launch" },
    });
    vi.mocked(commandBus.execute).mockResolvedValue(note());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    await tools.addNoteToTask({ taskId: "task-1", body: "Talked through scope" });

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetTaskQuery));
    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as AddNoteToProjectCommand;
    expect(command).toBeInstanceOf(AddNoteToProjectCommand);
    expect(command.projectId).toBe("project-1");
    expect(command.input.linkToTaskId).toBe("task-1");
    expect(command.input.body).toBe("Talked through scope");
  });

  it("returns an error when adding a note to a task with no project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue({
      task: task(),
      project: null,
    });
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = await tools.addNoteToTask({ taskId: "task-1" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Task is not linked to a project");
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it("creates a person", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(person());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    parse(await tools.createPerson({ fullName: "Ada Lovelace" }));

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as CreatePersonCommand;
    expect(command).toBeInstanceOf(CreatePersonCommand);
    expect(command.input.fullName).toBe("Ada Lovelace");
    expect(command.input.clerkUserId).toBeNull();
  });

  it("modifies project requester and assignee", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(project());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    await tools.modifyProjectRequester({
      projectId: "project-1",
      personNodeId: "person-1",
    });
    await tools.modifyProjectAssignee({
      projectId: "project-1",
      personNodeId: null,
    });

    const requester = vi.mocked(commandBus.execute).mock
      .calls[0][0] as UpdateProjectCommand;
    const assignee = vi.mocked(commandBus.execute).mock
      .calls[1][0] as UpdateProjectCommand;
    expect(requester.input.requesterPersonNodeId).toBe("person-1");
    expect(assignee.input.assigneePersonNodeId).toBeNull();
  });

  it("marks a task complete and a project completed", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute)
      .mockResolvedValueOnce({ task: task("completed"), project: null })
      .mockResolvedValueOnce(project("completed"));
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    parse(await tools.markTaskComplete({ taskId: "task-1" }));
    parse(await tools.markProjectCompleted({ projectId: "project-1" }));

    expect(vi.mocked(commandBus.execute).mock.calls[0][0]).toBeInstanceOf(
      CompleteTaskCommand
    );
    const update = vi.mocked(commandBus.execute).mock.calls[1][0] as UpdateProjectCommand;
    expect(update.input.status).toBe("completed");
  });

  it("lists projects", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue([project()]);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(await tools.getProjects());

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListProjectsQuery));
    expect(result).toEqual([
      expect.objectContaining({ id: "project-1", title: "Launch" }),
    ]);
    expect(Array.isArray(result) ? result[0] : result).not.toHaveProperty("tasks");
  });

  it("returns not found when a get-by-id lookup misses", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue(null);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = await tools.getProjects({ id: "missing" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not found");
  });

  it("lists people", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue([person()]);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(await tools.listPeople());

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListPeopleQuery));
    expect(result).toEqual([
      expect.objectContaining({ id: "person-1", title: "Ada Lovelace" }),
    ]);
  });

  it("returns the logged-in user", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      person: person(),
    });
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(await tools.getMe());

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetMeQuery));
    expect(result).toEqual(
      expect.objectContaining({
        userId: "user-1",
        orgId: "org-1",
        role: "owner",
        person: expect.objectContaining({ id: "person-1", title: "Ada Lovelace" }),
      })
    );
  });

  it("modifies task assignee, status, emoji, name, and due date", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue({
      task: task(),
      project: { id: "project-1", title: "Launch" },
    });
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    await tools.modifyTaskAssignee({ taskId: "task-1", personNodeId: "person-1" });
    await tools.modifyTaskStatus({ taskId: "task-1", status: "waiting" });
    await tools.modifyTaskEmoji({ taskId: "task-1", emoji: "🚀" });
    await tools.modifyTaskName({ taskId: "task-1", title: "Write launch brief" });
    await tools.modifyTaskDueDate({ taskId: "task-1", dueDate: "2026-10-01" });

    const assignee = vi.mocked(commandBus.execute).mock
      .calls[0][0] as UpdateTaskCommand;
    const status = vi.mocked(commandBus.execute).mock.calls[1][0] as UpdateTaskCommand;
    const emoji = vi.mocked(commandBus.execute).mock.calls[2][0] as UpdateTaskCommand;
    const name = vi.mocked(commandBus.execute).mock.calls[3][0] as UpdateTaskCommand;
    const dueDate = vi.mocked(commandBus.execute).mock.calls[4][0] as UpdateTaskCommand;
    expect(assignee).toBeInstanceOf(UpdateTaskCommand);
    expect(assignee.input.assigneePersonNodeId).toBe("person-1");
    expect(status.input.status).toBe("waiting");
    expect(emoji.input.emoji).toBe("🚀");
    expect(name.input.title).toBe("Write launch brief");
    expect(dueDate.input.dueDate).toBe("2026-10-01");
  });

  it("modifies project body and outcome", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(project());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    await tools.modifyProjectBody({
      projectId: "project-1",
      body: "What done looks like",
    });
    await tools.modifyProjectOutcome({
      projectId: "project-1",
      outcome: null,
    });

    const body = vi.mocked(commandBus.execute).mock.calls[0][0] as UpdateProjectCommand;
    const outcome = vi.mocked(commandBus.execute).mock.calls[1][0] as UpdateProjectCommand;
    expect(body.input.body).toBe("What done looks like");
    expect(outcome.input.outcome).toBeNull();
  });

  it("creates an idea on a project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(idea());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.createIdea({ projectId: "project-1", title: "Ship a beta" })
    );

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as AddIdeaToProjectCommand;
    expect(command).toBeInstanceOf(AddIdeaToProjectCommand);
    expect(command.projectId).toBe("project-1");
    expect(command.input.title).toBe("Ship a beta");
    expect(result).toMatchObject({ id: "idea-1", title: "Ship a beta" });
  });

  it("modifies an idea title and body", async () => {
    const { commandBus, queryBus } = mockBuses();
    const launch = project();
    launch.addIdea(idea());
    vi.mocked(commandBus.execute).mockResolvedValue(launch);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.modifyIdea({
        projectId: "project-1",
        ideaId: "idea-1",
        title: "Ship a private beta",
        body: "Invite ten design partners",
      })
    );

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as UpdateProjectChildCommand;
    expect(command).toBeInstanceOf(UpdateProjectChildCommand);
    expect(command.kind).toBe("idea");
    expect(command.childId).toBe("idea-1");
    expect(command.input).toEqual({
      title: "Ship a private beta",
      body: "Invite ten design partners",
    });
    expect(result).toMatchObject({ id: "idea-1", title: "Ship a beta" });
  });

  it("requires a title or body when modifying an idea", async () => {
    const { commandBus, queryBus } = mockBuses();
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = await tools.modifyIdea({
      projectId: "project-1",
      ideaId: "idea-1",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Provide a title or body");
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it("modifies a node's title and body", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(domainNode());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.modifyNode({ nodeId: "note-1", title: "Kickoff", body: "Notes" })
    );

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as UpdateNodeCommand;
    expect(command).toBeInstanceOf(UpdateNodeCommand);
    expect(command.nodeId).toBe("note-1");
    expect(command.input).toEqual({ title: "Kickoff", body: "Notes" });
    expect(result).toMatchObject({
      id: "note-1",
      nodeType: "note",
      title: "Kickoff",
      body: "Notes",
    });
  });

  it("requires a field when modifying a node", async () => {
    const { commandBus, queryBus } = mockBuses();
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = await tools.modifyNode({ nodeId: "note-1" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Provide a title, body, status, or priority");
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it("modifies project target, status, priority, emoji, and name", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue(project());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    await tools.modifyProjectTarget({
      projectId: "project-1",
      targetDate: "2026-10-01",
    });
    await tools.modifyProjectStatus({
      projectId: "project-1",
      status: "waiting",
    });
    await tools.modifyProjectPriority({
      projectId: "project-1",
      priority: "high",
    });
    await tools.modifyProjectEmoji({
      projectId: "project-1",
      emoji: "🎯",
    });
    await tools.modifyProjectName({
      projectId: "project-1",
      title: "Launch week",
    });

    const target = vi.mocked(commandBus.execute).mock
      .calls[0][0] as UpdateProjectCommand;
    const status = vi.mocked(commandBus.execute).mock
      .calls[1][0] as UpdateProjectCommand;
    const priority = vi.mocked(commandBus.execute).mock
      .calls[2][0] as UpdateProjectCommand;
    const emoji = vi.mocked(commandBus.execute).mock
      .calls[3][0] as UpdateProjectCommand;
    const name = vi.mocked(commandBus.execute).mock
      .calls[4][0] as UpdateProjectCommand;
    expect(target.input.targetDate).toBe("2026-10-01");
    expect(status.input.status).toBe("waiting");
    expect(priority.input.priority).toBe("high");
    expect(emoji.input.emoji).toBe("🎯");
    expect(name.input.title).toBe("Launch week");
  });

  it("demotes a project into a task under another project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue({
      nodeId: "project-1",
      previousType: "project",
      currentType: "task",
      projectId: "project-2",
      transformedAt: now,
    });
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(
      await tools.transformProjectToTask({
        projectId: "project-1",
        targetProjectId: "project-2",
      })
    );

    const command = vi.mocked(commandBus.execute).mock
      .calls[0][0] as TransformNodeTypeCommand;
    expect(command).toBeInstanceOf(TransformNodeTypeCommand);
    expect(command.userId).toBe("user-1");
    expect(command.orgId).toBe("org-1");
    expect(command.input).toEqual({
      nodeId: "project-1",
      targetType: "task",
      projectId: "project-2",
    });
    expect(result).toMatchObject({
      nodeId: "project-1",
      previousType: "project",
      currentType: "task",
      projectId: "project-2",
    });
  });

  it("promotes a task into an independent project", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(commandBus.execute).mockResolvedValue({
      nodeId: "task-1",
      previousType: "task",
      currentType: "project",
      projectId: null,
      transformedAt: now,
    });
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(await tools.promoteTaskToProject({ taskId: "task-1" }));

    const command = vi.mocked(commandBus.execute).mock
      .calls[0][0] as TransformNodeTypeCommand;
    expect(command).toBeInstanceOf(TransformNodeTypeCommand);
    expect(command.input).toEqual({
      nodeId: "task-1",
      targetType: "project",
    });
    expect(result).toMatchObject({
      nodeId: "task-1",
      previousType: "task",
      currentType: "project",
      projectId: null,
    });
  });

  it("lists project areas and statuses", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue([area()]);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const areas = parse(await tools.listProjectAreas());
    const statuses = parse(await tools.listStatuses());

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(ListProjectAreasQuery)
    );
    expect(areas).toEqual([
      expect.objectContaining({ id: "area-1", title: "Growth" }),
    ]);
    expect(statuses).toEqual(
      expect.objectContaining({
        project: expect.arrayContaining(["active", "completed"]),
        task: expect.arrayContaining(["active", "waiting", "blocked", "completed"]),
        priority: expect.arrayContaining(["low", "medium", "high", "critical"]),
      })
    );
  });

  it("lists organizations the user belongs to", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue([
      new Organization({
        id: "org-2",
        name: "Second",
        slug: "second",
        role: "member",
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = parse(await tools.listOrganizations());

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ListOrganizationsQuery));
    expect(result).toEqual([
      { id: "org-2", name: "Second", slug: "second", role: "member" },
    ]);
  });

  it("uses a requested org after checking membership", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue([
      new Organization({
        id: "org-2",
        name: "Second",
        slug: "second",
        role: "owner",
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    vi.mocked(commandBus.execute).mockResolvedValue(project());
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    await tools.createProject({ title: "Launch", orgId: "org-2" });

    const command = vi.mocked(commandBus.execute).mock.calls[0][0] as CreateProjectCommand;
    expect(command.orgId).toBe("org-2");
  });

  it("rejects an org the user does not belong to", async () => {
    const { commandBus, queryBus } = mockBuses();
    vi.mocked(queryBus.execute).mockResolvedValue([]);
    const tools = new SpydrMcpTools({ commandBus, queryBus, context });

    const result = await tools.getProjects({ orgId: "org-unknown" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Not a member of this organization");
  });
});
