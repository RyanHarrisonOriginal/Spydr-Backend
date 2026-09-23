import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  spydrNodeStatuses,
  spydrPriorities,
  taskStatuses,
} from "../../domains/shared/models/shared.js";
import type { ICommandBus } from "../../domains/shared/application/index.js";
import type { IQueryBus } from "../../domains/shared/application/index.js";
import type { IMcpActorContext } from "./context.js";
import type { IMcpToolResult } from "./result.js";
import { SpydrMcpTools } from "./tools.js";

function bindTool<T>(fn: (input: T) => Promise<IMcpToolResult>) {
  return async (input: T): Promise<CallToolResult> => {
    const result = await fn(input);
    return {
      content: result.content.map((block) => ({
        type: "text" as const,
        text: block.text,
      })),
      isError: result.isError,
    };
  };
}

const nodeStatus = z.enum(spydrNodeStatuses);
const taskStatus = z.enum(taskStatuses);
const priority = z.enum(spydrPriorities);
const optionalId = z.string().min(1).optional();
const nullablePersonId = z.string().min(1).nullable();

export interface ICreateSpydrMcpServerOptions {
  commandBus: ICommandBus;
  queryBus: IQueryBus;
  context: IMcpActorContext;
}

export function createSpydrMcpServer(
  options: ICreateSpydrMcpServerOptions
): McpServer {
  const tools = new SpydrMcpTools(options);
  const server = new McpServer({ name: "spydr", version: "0.1.0" });

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description: "Create a new project in the current organization.",
      inputSchema: z.object({
        title: z.string().min(1).describe("Project title"),
        body: z.string().optional().describe("Project description"),
        status: nodeStatus.optional(),
        priority: priority.optional(),
        area: z.string().nullable().optional(),
        areaNodeId: z.string().min(1).nullable().optional(),
        tags: z.array(z.string()).optional(),
        outcome: z.string().nullable().optional(),
        startDate: z.string().nullable().optional().describe("ISO date YYYY-MM-DD"),
        targetDate: z.string().nullable().optional().describe("ISO date YYYY-MM-DD"),
        riskLevel: priority.optional(),
        emoji: z.string().nullable().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.createProject)
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create a task on a project.",
      inputSchema: z.object({
        projectId: z.string().min(1).describe("Project to add the task to"),
        title: z.string().min(1).describe("Task title"),
        body: z.string().optional(),
        status: taskStatus.optional(),
        priority: priority.optional(),
        dueDate: z.string().nullable().optional().describe("ISO date YYYY-MM-DD"),
        estimatedMinutes: z.number().int().nullable().optional(),
        assigneePersonNodeId: z.string().min(1).nullable().optional(),
        emoji: z.string().nullable().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.createTask)
  );

  server.registerTool(
    "add_note_to_project",
    {
      title: "Add note to project",
      description: "Add a note to a project. Optionally link it to a task.",
      inputSchema: z.object({
        projectId: z.string().min(1),
        title: z.string().optional(),
        body: z.string().optional(),
        linkToTaskId: z.string().min(1).optional(),
        status: nodeStatus.optional(),
        priority: priority.optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.addNoteToProject)
  );

  server.registerTool(
    "add_note_to_task",
    {
      title: "Add note to task",
      description: "Add a note linked to a task (and its parent project).",
      inputSchema: z.object({
        taskId: z.string().min(1),
        title: z.string().optional(),
        body: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.addNoteToTask)
  );

  server.registerTool(
    "create_person",
    {
      title: "Create person",
      description: "Create a person record in the current organization.",
      inputSchema: z.object({
        fullName: z.string().min(1).describe("Person full name"),
        body: z.string().optional(),
        email: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        relationshipContext: z.string().nullable().optional(),
        status: nodeStatus.optional(),
        priority: priority.optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.createPerson)
  );

  server.registerTool(
    "modify_project_requester",
    {
      title: "Modify project requester",
      description:
        "Set or clear the requester on a project. Pass null to unassign.",
      inputSchema: z.object({
        projectId: z.string().min(1),
        personNodeId: nullablePersonId.describe(
          "Person node id, or null to clear the requester"
        ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyProjectRequester)
  );

  server.registerTool(
    "modify_project_assignee",
    {
      title: "Modify project assignee",
      description:
        "Set or clear the assignee on a project. Pass null to unassign.",
      inputSchema: z.object({
        projectId: z.string().min(1),
        personNodeId: nullablePersonId.describe(
          "Person node id, or null to clear the assignee"
        ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyProjectAssignee)
  );

  server.registerTool(
    "modify_project_target",
    {
      title: "Modify project target date",
      description:
        "Set or clear a project's target (due) date. Pass null to clear. Use YYYY-MM-DD.",
      inputSchema: z.object({
        projectId: z.string().min(1),
        targetDate: z
          .string()
          .nullable()
          .describe("ISO date YYYY-MM-DD, or null to clear"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyProjectTarget)
  );

  server.registerTool(
    "modify_project_status",
    {
      title: "Modify project status",
      description:
        "Set a project's status. Use list_statuses for valid project values.",
      inputSchema: z.object({
        projectId: z.string().min(1),
        status: nodeStatus,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyProjectStatus)
  );

  server.registerTool(
    "modify_project_priority",
    {
      title: "Modify project priority",
      description: "Set a project's priority.",
      inputSchema: z.object({
        projectId: z.string().min(1),
        priority,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyProjectPriority)
  );

  server.registerTool(
    "modify_task_assignee",
    {
      title: "Modify task assignee",
      description:
        "Set or clear the assignee on a task. Pass null to unassign.",
      inputSchema: z.object({
        taskId: z.string().min(1),
        personNodeId: nullablePersonId.describe(
          "Person node id, or null to clear the assignee"
        ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyTaskAssignee)
  );

  server.registerTool(
    "modify_task_status",
    {
      title: "Modify task status",
      description:
        "Set a task's status. Use list_statuses for valid task values.",
      inputSchema: z.object({
        taskId: z.string().min(1),
        status: taskStatus,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    bindTool(tools.modifyTaskStatus)
  );

  server.registerTool(
    "mark_task_complete",
    {
      title: "Mark task complete",
      description: "Mark a task as completed.",
      inputSchema: z.object({
        taskId: z.string().min(1),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    bindTool(tools.markTaskComplete)
  );

  server.registerTool(
    "transform_project_to_task",
    {
      title: "Transform project to task",
      description:
        "Demote a project into a task nested under a different project. The source project becomes a task; its movable children move with it.",
      inputSchema: z.object({
        projectId: z
          .string()
          .min(1)
          .describe("Project to demote into a task"),
        targetProjectId: z
          .string()
          .min(1)
          .describe("Existing project the new task should live under"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    bindTool(tools.transformProjectToTask)
  );

  server.registerTool(
    "promote_task_to_project",
    {
      title: "Promote task to project",
      description:
        "Promote a task into an independent project. The task is detached from its parent project.",
      inputSchema: z.object({
        taskId: z.string().min(1).describe("Task to promote into a project"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    bindTool(tools.promoteTaskToProject)
  );

  server.registerTool(
    "mark_project_completed",
    {
      title: "Mark project completed",
      description: "Mark a project as completed.",
      inputSchema: z.object({
        projectId: z.string().min(1),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    bindTool(tools.markProjectCompleted)
  );

  server.registerTool(
    "get_projects",
    {
      title: "Get projects",
      description:
        "List projects in the organization, or fetch one project by id.",
      inputSchema: z.object({
        id: optionalId.describe("When set, return this project with its children"),
      }),
      annotations: { readOnlyHint: true },
    },
    bindTool(tools.getProjects)
  );

  server.registerTool(
    "get_tasks",
    {
      title: "Get tasks",
      description: "List tasks in the organization, or fetch one task by id.",
      inputSchema: z.object({
        id: optionalId.describe("When set, return this task"),
      }),
      annotations: { readOnlyHint: true },
    },
    bindTool(tools.getTasks)
  );

  server.registerTool(
    "get_notes",
    {
      title: "Get notes",
      description: "List notes in the organization, or fetch one note by id.",
      inputSchema: z.object({
        id: optionalId.describe("When set, return this note"),
      }),
      annotations: { readOnlyHint: true },
    },
    bindTool(tools.getNotes)
  );

  server.registerTool(
    "list_people",
    {
      title: "List people",
      description: "List people in the current organization.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    bindTool(tools.listPeople)
  );

  server.registerTool(
    "get_me",
    {
      title: "Get me",
      description:
        "Get the logged-in user's membership and person record in the current organization.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    bindTool(tools.getMe)
  );

  server.registerTool(
    "list_project_areas",
    {
      title: "List project areas",
      description: "List project areas in the current organization.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    bindTool(tools.listProjectAreas)
  );

  server.registerTool(
    "list_statuses",
    {
      title: "List statuses",
      description:
        "List possible project statuses, task statuses, and priorities.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    bindTool(tools.listStatuses)
  );

  return server;
}
