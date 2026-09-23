import type { ICommandBus } from "../../domains/shared/application/index.js";
import type { IQueryBus } from "../../domains/shared/application/index.js";
import {
  AddNoteToProjectCommand,
  AddTaskToProjectCommand,
  CreatePersonCommand,
  CreateProjectCommand,
  CompleteTaskCommand,
  GetNoteQuery,
  GetMeQuery,
  GetProjectQuery,
  GetTaskQuery,
  ListNotesQuery,
  ListPeopleQuery,
  ListProjectAreasQuery,
  ListProjectsQuery,
  ListTasksQuery,
  TransformNodeTypeCommand,
  UpdateProjectCommand,
  UpdateTaskCommand,
  type IAddNoteToProjectInput,
  type IAddTaskToProjectInput,
  type ICreatePersonInput,
  type ICreateProjectInput,
  type IMeView,
  type IUpdateProjectInput,
  type IUpdateTaskInput,
} from "../../domains/shared/application/index.js";
import type { ProjectNode } from "../../domains/projects/models/index.js";
import type { NoteNode } from "../../domains/notes/models/index.js";
import type { TaskNode } from "../../domains/tasks/models/index.js";
import type { PersonNode } from "../../domains/people/models/index.js";
import type { ProjectAreaNode } from "../../domains/project-areas/models/index.js";
import type { INoteListItem } from "../../domains/notes/views.js";
import type { INodeTypeTransformResult } from "../../domains/node-type-transform/index.js";
import type { ITaskListItem } from "../../domains/tasks/views.js";
import type {
  SpydrNodeStatus,
  SpydrPriority,
  TaskStatus,
} from "../../domains/shared/models/shared.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  taskStatuses,
} from "../../domains/shared/models/shared.js";
import { NoteResponseMapper } from "../http/mappers/note-response.mapper.js";
import { PersonResponseMapper } from "../http/mappers/person-response.mapper.js";
import { ProjectAreaResponseMapper } from "../http/mappers/project-area-response.mapper.js";
import { ProjectResponseMapper } from "../http/mappers/project-response.mapper.js";
import { TaskResponseMapper } from "../http/mappers/task-response.mapper.js";
import type { IMcpActorContext } from "./context.js";
import { runTool, type IMcpToolResult } from "./result.js";

export interface ISpydrMcpToolsDeps {
  commandBus: ICommandBus;
  queryBus: IQueryBus;
  context: IMcpActorContext;
}

export class SpydrMcpTools {
  constructor(
    private readonly deps: ISpydrMcpToolsDeps,
    private readonly projectMapper = new ProjectResponseMapper(),
    private readonly taskMapper = new TaskResponseMapper(),
    private readonly noteMapper = new NoteResponseMapper(),
    private readonly personMapper = new PersonResponseMapper(),
    private readonly projectAreaMapper = new ProjectAreaResponseMapper()
  ) {}

  createProject = (input: ICreateProjectInput): Promise<IMcpToolResult> =>
    this.run(async () => {
      const project = await this.deps.commandBus.execute<
        CreateProjectCommand,
        ProjectNode
      >(new CreateProjectCommand(this.userId, this.orgId, input));
      return this.projectMapper.toRepresentation(project);
    });

  createTask = (
    input: IAddTaskToProjectInput & { projectId: string }
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const { projectId, ...taskInput } = input;
      const task = await this.deps.commandBus.execute<
        AddTaskToProjectCommand,
        TaskNode | null
      >(
        new AddTaskToProjectCommand(this.userId, this.orgId, projectId, taskInput)
      );
      if (!task) return null;
      return this.taskMapper.toRepresentation(task, { id: projectId, title: "" });
    });

  addNoteToProject = (
    input: IAddNoteToProjectInput & { projectId: string }
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const { projectId, ...noteInput } = input;
      const note = await this.deps.commandBus.execute<
        AddNoteToProjectCommand,
        NoteNode | null
      >(
        new AddNoteToProjectCommand(this.userId, this.orgId, projectId, noteInput)
      );
      if (!note) return null;
      return this.noteMapper.toRepresentation(note, { id: projectId, title: "" });
    });

  addNoteToTask = (input: {
    taskId: string;
    title?: string;
    body?: string;
  }): Promise<IMcpToolResult> =>
    this.run(async () => {
      const item = await this.deps.queryBus.execute<
        GetTaskQuery,
        ITaskListItem | null
      >(new GetTaskQuery(this.userId, this.orgId, input.taskId));

      if (!item) {
        throw new Error("Task not found");
      }
      if (!item.project) {
        throw new Error("Task is not linked to a project");
      }

      const note = await this.deps.commandBus.execute<
        AddNoteToProjectCommand,
        NoteNode | null
      >(
        new AddNoteToProjectCommand(this.userId, this.orgId, item.project.id, {
          title: input.title,
          body: input.body,
          linkToTaskId: input.taskId,
        })
      );
      if (!note) return null;
      return this.noteMapper.toRepresentation(note, item.project);
    });

  createPerson = (input: ICreatePersonInput): Promise<IMcpToolResult> =>
    this.run(async () => {
      const person = await this.deps.commandBus.execute<
        CreatePersonCommand,
        PersonNode
      >(
        new CreatePersonCommand(this.userId, this.orgId, {
          ...input,
          clerkUserId: null,
        })
      );
      return this.personMapper.toRepresentation(person);
    });

  modifyProjectRequester = (input: {
    projectId: string;
    personNodeId: string | null;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, {
      requesterPersonNodeId: input.personNodeId,
    });

  modifyProjectAssignee = (input: {
    projectId: string;
    personNodeId: string | null;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, {
      assigneePersonNodeId: input.personNodeId,
    });

  modifyProjectTarget = (input: {
    projectId: string;
    targetDate: string | null;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, { targetDate: input.targetDate });

  modifyProjectStatus = (input: {
    projectId: string;
    status: SpydrNodeStatus;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, { status: input.status });

  modifyProjectPriority = (input: {
    projectId: string;
    priority: SpydrPriority;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, { priority: input.priority });

  modifyTaskAssignee = (input: {
    taskId: string;
    personNodeId: string | null;
  }): Promise<IMcpToolResult> =>
    this.updateTask(input.taskId, { assigneePersonNodeId: input.personNodeId });

  modifyTaskStatus = (input: {
    taskId: string;
    status: TaskStatus;
  }): Promise<IMcpToolResult> =>
    this.updateTask(input.taskId, { status: input.status });

  markTaskComplete = (input: { taskId: string }): Promise<IMcpToolResult> =>
    this.run(async () => {
      const item = await this.deps.commandBus.execute<
        CompleteTaskCommand,
        ITaskListItem | null
      >(new CompleteTaskCommand(this.userId, this.orgId, input.taskId));
      if (!item) return null;
      return this.taskMapper.toListRepresentation(item);
    });

  transformProjectToTask = (input: {
    projectId: string;
    targetProjectId: string;
  }): Promise<IMcpToolResult> =>
    this.transformNode({
      nodeId: input.projectId,
      targetType: "task",
      projectId: input.targetProjectId,
    });

  promoteTaskToProject = (input: {
    taskId: string;
  }): Promise<IMcpToolResult> =>
    this.transformNode({
      nodeId: input.taskId,
      targetType: "project",
    });

  markProjectCompleted = (input: {
    projectId: string;
  }): Promise<IMcpToolResult> =>
    this.run(async () => {
      const project = await this.deps.commandBus.execute<
        UpdateProjectCommand,
        ProjectNode | null
      >(
        new UpdateProjectCommand(this.userId, this.orgId, input.projectId, {
          status: "completed",
        })
      );
      if (!project) return null;
      return this.projectSummary(project);
    });

  getProjects = (input: { id?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      if (input.id) {
        const project = await this.deps.queryBus.execute<
          GetProjectQuery,
          ProjectNode | null
        >(new GetProjectQuery(this.userId, this.orgId, input.id));
        if (!project) return null;
        return this.projectMapper.toRepresentation(project);
      }

      const projects = await this.deps.queryBus.execute<
        ListProjectsQuery,
        ProjectNode[]
      >(new ListProjectsQuery(this.userId, this.orgId));
      return projects.map((project) => this.projectSummary(project));
    });

  getTasks = (input: { id?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      if (input.id) {
        const item = await this.deps.queryBus.execute<
          GetTaskQuery,
          ITaskListItem | null
        >(new GetTaskQuery(this.userId, this.orgId, input.id));
        if (!item) return null;
        return this.taskMapper.toListRepresentation(item);
      }

      const items = await this.deps.queryBus.execute<
        ListTasksQuery,
        ITaskListItem[]
      >(new ListTasksQuery(this.userId, this.orgId));
      return items.map((item) => this.taskMapper.toListRepresentation(item));
    });

  getNotes = (input: { id?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      if (input.id) {
        const item = await this.deps.queryBus.execute<
          GetNoteQuery,
          INoteListItem | null
        >(new GetNoteQuery(this.userId, this.orgId, input.id));
        if (!item) return null;
        return this.noteMapper.toListRepresentation(item);
      }

      const items = await this.deps.queryBus.execute<
        ListNotesQuery,
        INoteListItem[]
      >(new ListNotesQuery(this.userId, this.orgId));
      return items.map((item) => this.noteMapper.toListRepresentation(item));
    });

  listPeople = (_input: Record<string, never> = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const people = await this.deps.queryBus.execute<
        ListPeopleQuery,
        PersonNode[]
      >(new ListPeopleQuery(this.userId, this.orgId));
      return people.map((person) => this.personMapper.toRepresentation(person));
    });

  getMe = (_input: Record<string, never> = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const me = await this.deps.queryBus.execute<GetMeQuery, IMeView | null>(
        new GetMeQuery(this.userId, this.orgId)
      );
      if (!me) return null;
      return {
        userId: me.userId,
        orgId: me.orgId,
        role: me.role,
        person: this.personMapper.toRepresentation(me.person),
      };
    });

  listProjectAreas = (
    _input: Record<string, never> = {}
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const areas = await this.deps.queryBus.execute<
        ListProjectAreasQuery,
        ProjectAreaNode[]
      >(new ListProjectAreasQuery(this.userId, this.orgId));
      return areas.map((area) => this.projectAreaMapper.toRepresentation(area));
    });

  listStatuses = (
    _input: Record<string, never> = {}
  ): Promise<IMcpToolResult> =>
    this.run(async () => ({
      project: [...spydrNodeStatuses],
      task: [...taskStatuses],
      priority: [...spydrPriorities],
    }));

  private get userId(): string {
    return this.deps.context.userId;
  }

  private get orgId(): string {
    return this.deps.context.orgId;
  }

  private run(fn: () => Promise<unknown>): Promise<IMcpToolResult> {
    return runTool(fn);
  }

  private async transformNode(input: {
    nodeId: string;
    targetType: "project" | "task";
    projectId?: string;
  }): Promise<IMcpToolResult> {
    return this.run(async () => {
      const result = await this.deps.commandBus.execute<
        TransformNodeTypeCommand,
        INodeTypeTransformResult
      >(new TransformNodeTypeCommand(this.userId, this.orgId, input));
      return {
        nodeId: result.nodeId,
        previousType: result.previousType,
        currentType: result.currentType,
        projectId: result.projectId,
        transformedAt: result.transformedAt,
      };
    });
  }

  private async updateProject(
    projectId: string,
    input: IUpdateProjectInput
  ): Promise<IMcpToolResult> {
    return this.run(async () => {
      const project = await this.deps.commandBus.execute<
        UpdateProjectCommand,
        ProjectNode | null
      >(new UpdateProjectCommand(this.userId, this.orgId, projectId, input));
      if (!project) return null;
      return this.projectSummary(project);
    });
  }

  private async updateTask(
    taskId: string,
    input: IUpdateTaskInput
  ): Promise<IMcpToolResult> {
    return this.run(async () => {
      const item = await this.deps.commandBus.execute<
        UpdateTaskCommand,
        ITaskListItem | null
      >(new UpdateTaskCommand(this.userId, this.orgId, taskId, input));
      if (!item) return null;
      return this.taskMapper.toListRepresentation(item);
    });
  }

  private projectSummary(project: ProjectNode) {
    const full = this.projectMapper.toRepresentation(project);
    const {
      tasks: _tasks,
      decisions: _decisions,
      ideas: _ideas,
      notes: _notes,
      resources: _resources,
      deleted: _deleted,
      ...summary
    } = full;
    return summary;
  }
}
