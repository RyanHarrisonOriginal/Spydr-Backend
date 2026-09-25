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
  ListOrganizationsQuery,
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
import type { Organization } from "../../domains/organizations/models/index.js";
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

  listOrganizations = (
    _input: Record<string, never> = {}
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const organizations = await this.memberships();
      return organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        role: organization.role,
      }));
    });

  createProject = (
    input: ICreateProjectInput & { orgId?: string }
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const { orgId: requestedOrgId, ...projectInput } = input;
      const orgId = await this.resolveOrgId(requestedOrgId);
      const project = await this.deps.commandBus.execute<
        CreateProjectCommand,
        ProjectNode
      >(new CreateProjectCommand(this.userId, orgId, projectInput));
      return this.projectMapper.toRepresentation(project);
    });

  createTask = (
    input: IAddTaskToProjectInput & { projectId: string; orgId?: string }
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const { projectId, orgId: requestedOrgId, ...taskInput } = input;
      const orgId = await this.resolveOrgId(requestedOrgId);
      const task = await this.deps.commandBus.execute<
        AddTaskToProjectCommand,
        TaskNode | null
      >(
        new AddTaskToProjectCommand(this.userId, orgId, projectId, taskInput)
      );
      if (!task) return null;
      return this.taskMapper.toRepresentation(task, { id: projectId, title: "" });
    });

  addNoteToProject = (
    input: IAddNoteToProjectInput & { projectId: string; orgId?: string }
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const { projectId, orgId: requestedOrgId, ...noteInput } = input;
      const orgId = await this.resolveOrgId(requestedOrgId);
      const note = await this.deps.commandBus.execute<
        AddNoteToProjectCommand,
        NoteNode | null
      >(
        new AddNoteToProjectCommand(this.userId, orgId, projectId, noteInput)
      );
      if (!note) return null;
      return this.noteMapper.toRepresentation(note, { id: projectId, title: "" });
    });

  addNoteToTask = (input: {
    taskId: string;
    title?: string;
    body?: string;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const item = await this.deps.queryBus.execute<
        GetTaskQuery,
        ITaskListItem | null
      >(new GetTaskQuery(this.userId, orgId, input.taskId));

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
        new AddNoteToProjectCommand(this.userId, orgId, item.project.id, {
          title: input.title,
          body: input.body,
          linkToTaskId: input.taskId,
        })
      );
      if (!note) return null;
      return this.noteMapper.toRepresentation(note, item.project);
    });

  createPerson = (
    input: ICreatePersonInput & { orgId?: string }
  ): Promise<IMcpToolResult> =>
    this.run(async () => {
      const { orgId: requestedOrgId, ...personInput } = input;
      const orgId = await this.resolveOrgId(requestedOrgId);
      const person = await this.deps.commandBus.execute<
        CreatePersonCommand,
        PersonNode
      >(
        new CreatePersonCommand(this.userId, orgId, {
          ...personInput,
          clerkUserId: null,
        })
      );
      return this.personMapper.toRepresentation(person);
    });

  modifyProjectRequester = (input: {
    projectId: string;
    personNodeId: string | null;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateProject(
      input.projectId,
      { requesterPersonNodeId: input.personNodeId },
      input.orgId
    );

  modifyProjectAssignee = (input: {
    projectId: string;
    personNodeId: string | null;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateProject(
      input.projectId,
      { assigneePersonNodeId: input.personNodeId },
      input.orgId
    );

  modifyProjectTarget = (input: {
    projectId: string;
    targetDate: string | null;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, { targetDate: input.targetDate }, input.orgId);

  modifyProjectStatus = (input: {
    projectId: string;
    status: SpydrNodeStatus;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, { status: input.status }, input.orgId);

  modifyProjectPriority = (input: {
    projectId: string;
    priority: SpydrPriority;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateProject(input.projectId, { priority: input.priority }, input.orgId);

  modifyTaskAssignee = (input: {
    taskId: string;
    personNodeId: string | null;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateTask(input.taskId, { assigneePersonNodeId: input.personNodeId }, input.orgId);

  modifyTaskStatus = (input: {
    taskId: string;
    status: TaskStatus;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.updateTask(input.taskId, { status: input.status }, input.orgId);

  markTaskComplete = (input: {
    taskId: string;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const item = await this.deps.commandBus.execute<
        CompleteTaskCommand,
        ITaskListItem | null
      >(new CompleteTaskCommand(this.userId, orgId, input.taskId));
      if (!item) return null;
      return this.taskMapper.toListRepresentation(item);
    });

  transformProjectToTask = (input: {
    projectId: string;
    targetProjectId: string;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.transformNode({
      nodeId: input.projectId,
      targetType: "task",
      projectId: input.targetProjectId,
      orgId: input.orgId,
    });

  promoteTaskToProject = (input: {
    taskId: string;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.transformNode({
      nodeId: input.taskId,
      targetType: "project",
      orgId: input.orgId,
    });

  markProjectCompleted = (input: {
    projectId: string;
    orgId?: string;
  }): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const project = await this.deps.commandBus.execute<
        UpdateProjectCommand,
        ProjectNode | null
      >(
        new UpdateProjectCommand(this.userId, orgId, input.projectId, {
          status: "completed",
        })
      );
      if (!project) return null;
      return this.projectSummary(project);
    });

  getProjects = (input: { id?: string; orgId?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      if (input.id) {
        const project = await this.deps.queryBus.execute<
          GetProjectQuery,
          ProjectNode | null
        >(new GetProjectQuery(this.userId, orgId, input.id));
        if (!project) return null;
        return this.projectMapper.toRepresentation(project);
      }

      const projects = await this.deps.queryBus.execute<
        ListProjectsQuery,
        ProjectNode[]
      >(new ListProjectsQuery(this.userId, orgId));
      return projects.map((project) => this.projectSummary(project));
    });

  getTasks = (input: { id?: string; orgId?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      if (input.id) {
        const item = await this.deps.queryBus.execute<
          GetTaskQuery,
          ITaskListItem | null
        >(new GetTaskQuery(this.userId, orgId, input.id));
        if (!item) return null;
        return this.taskMapper.toListRepresentation(item);
      }

      const items = await this.deps.queryBus.execute<
        ListTasksQuery,
        ITaskListItem[]
      >(new ListTasksQuery(this.userId, orgId));
      return items.map((item) => this.taskMapper.toListRepresentation(item));
    });

  getNotes = (input: { id?: string; orgId?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      if (input.id) {
        const item = await this.deps.queryBus.execute<
          GetNoteQuery,
          INoteListItem | null
        >(new GetNoteQuery(this.userId, orgId, input.id));
        if (!item) return null;
        return this.noteMapper.toListRepresentation(item);
      }

      const items = await this.deps.queryBus.execute<
        ListNotesQuery,
        INoteListItem[]
      >(new ListNotesQuery(this.userId, orgId));
      return items.map((item) => this.noteMapper.toListRepresentation(item));
    });

  listPeople = (input: { orgId?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const people = await this.deps.queryBus.execute<
        ListPeopleQuery,
        PersonNode[]
      >(new ListPeopleQuery(this.userId, orgId));
      return people.map((person) => this.personMapper.toRepresentation(person));
    });

  getMe = (input: { orgId?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const me = await this.deps.queryBus.execute<GetMeQuery, IMeView | null>(
        new GetMeQuery(this.userId, orgId)
      );
      if (!me) return null;
      return {
        userId: me.userId,
        orgId: me.orgId,
        role: me.role,
        person: this.personMapper.toRepresentation(me.person),
      };
    });

  listProjectAreas = (input: { orgId?: string } = {}): Promise<IMcpToolResult> =>
    this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const areas = await this.deps.queryBus.execute<
        ListProjectAreasQuery,
        ProjectAreaNode[]
      >(new ListProjectAreasQuery(this.userId, orgId));
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

  private async memberships(): Promise<Organization[]> {
    return this.deps.queryBus.execute<ListOrganizationsQuery, Organization[]>(
      new ListOrganizationsQuery(this.userId)
    );
  }

  private async resolveOrgId(requested?: string): Promise<string> {
    if (!requested) return this.deps.context.orgId;
    const organizations = await this.memberships();
    if (!organizations.some((organization) => organization.id === requested)) {
      throw new Error("Not a member of this organization");
    }
    return requested;
  }

  private run(fn: () => Promise<unknown>): Promise<IMcpToolResult> {
    return runTool(fn);
  }

  private async transformNode(input: {
    nodeId: string;
    targetType: "project" | "task";
    projectId?: string;
    orgId?: string;
  }): Promise<IMcpToolResult> {
    return this.run(async () => {
      const orgId = await this.resolveOrgId(input.orgId);
      const result = await this.deps.commandBus.execute<
        TransformNodeTypeCommand,
        INodeTypeTransformResult
      >(
        new TransformNodeTypeCommand(this.userId, orgId, {
          nodeId: input.nodeId,
          targetType: input.targetType,
          ...(input.projectId ? { projectId: input.projectId } : {}),
        })
      );
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
    input: IUpdateProjectInput,
    requestedOrgId?: string
  ): Promise<IMcpToolResult> {
    return this.run(async () => {
      const orgId = await this.resolveOrgId(requestedOrgId);
      const project = await this.deps.commandBus.execute<
        UpdateProjectCommand,
        ProjectNode | null
      >(new UpdateProjectCommand(this.userId, orgId, projectId, input));
      if (!project) return null;
      return this.projectSummary(project);
    });
  }

  private async updateTask(
    taskId: string,
    input: IUpdateTaskInput,
    requestedOrgId?: string
  ): Promise<IMcpToolResult> {
    return this.run(async () => {
      const orgId = await this.resolveOrgId(requestedOrgId);
      const item = await this.deps.commandBus.execute<
        UpdateTaskCommand,
        ITaskListItem | null
      >(new UpdateTaskCommand(this.userId, orgId, taskId, input));
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
