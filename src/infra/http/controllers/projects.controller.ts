import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  AddDecisionToProjectCommand,
  AddIdeaToProjectCommand,
  AddNoteToProjectCommand,
  AddTaskToProjectCommand,
  CreateProjectCommand,
  DeleteProjectCommand,
  DeleteProjectChildCommand,
  RestoreProjectCommand,
  RestoreProjectChildCommand,
  UpdateProjectChildCommand,
  type IAddDecisionToProjectInput,
  type IAddIdeaToProjectInput,
  type IAddNoteToProjectInput,
  type IAddTaskToProjectInput,
  type ICreateProjectInput,
  type IUpdateProjectChildInput,
  type IUpdateProjectInput,
  type ProjectChildKind,
  UpdateProjectCommand,
} from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import {
  GetProjectQuery,
  ListDeletedProjectsQuery,
  ListProjectsQuery,
} from "../../../domain/cqrs/queries/index.js";
import type { ProjectNode } from "../../../domain/models/projects/index.js";
import type { DecisionNode } from "../../../domain/models/decisions/index.js";
import type { IdeaNode } from "../../../domain/models/ideas/index.js";
import type { NoteNode } from "../../../domain/models/notes/index.js";
import type { TaskNode } from "../../../domain/models/tasks/index.js";
import { IdeaResponseMapper } from "../mappers/idea-response.mapper.js";
import { DecisionResponseMapper } from "../mappers/decision-response.mapper.js";
import { NoteResponseMapper } from "../mappers/note-response.mapper.js";
import { ProjectResponseMapper } from "../mappers/project-response.mapper.js";
import { TaskResponseMapper } from "../mappers/task-response.mapper.js";

export class ProjectsController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new ProjectResponseMapper(),
    private readonly taskMapper = new TaskResponseMapper(),
    private readonly decisionMapper = new DecisionResponseMapper(),
    private readonly noteMapper = new NoteResponseMapper(),
    private readonly ideaMapper = new IdeaResponseMapper()
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const project = await this.queryBus.execute<
        GetProjectQuery,
        ProjectNode | null
      >(new GetProjectQuery(userId, orgId, req.params.projectId));

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(project));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get project" });
    }
  };

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const projects = await this.queryBus.execute<ListProjectsQuery, ProjectNode[]>(
        new ListProjectsQuery(userId, orgId)
      );
      res.json(projects.map((project) => this.mapper.toRepresentation(project)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list projects" });
    }
  };

  listTrash = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const projects = await this.queryBus.execute<
        ListDeletedProjectsQuery,
        ProjectNode[]
      >(new ListDeletedProjectsQuery(userId, orgId));

      res.json(projects.map((project) => this.mapper.toRepresentation(project)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list deleted projects" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const project = await this.commandBus.execute<
        CreateProjectCommand,
        ProjectNode
      >(new CreateProjectCommand(userId, orgId, req.body as ICreateProjectInput));

      res.status(201).json(this.mapper.toRepresentation(project));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Project title is required") {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Project area not found") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create project" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const project = await this.commandBus.execute<
        UpdateProjectCommand,
        ProjectNode | null
      >(
        new UpdateProjectCommand(
          userId,
          orgId,
          req.params.projectId,
          req.body as IUpdateProjectInput
        )
      );

      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(project));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Project area not found") {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Person not found") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to update project" });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const deleted = await this.commandBus.execute<DeleteProjectCommand, boolean>(
        new DeleteProjectCommand(userId, orgId, req.params.projectId)
      );

      if (!deleted) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  };

  restore = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const project = await this.commandBus.execute<
        RestoreProjectCommand,
        ProjectNode | null
      >(new RestoreProjectCommand(userId, orgId, req.params.projectId));

      if (!project) {
        res.status(404).json({ message: "Deleted project not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(project));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to restore project" });
    }
  };

  createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const task = await this.commandBus.execute<
        AddTaskToProjectCommand,
        TaskNode | null
      >(
        new AddTaskToProjectCommand(
          userId,
          orgId,
          req.params.projectId,
          req.body as IAddTaskToProjectInput
        )
      );

      if (!task) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(201).json(this.taskMapper.toRepresentation(task));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Task title is required") {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Person not found") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create task" });
    }
  };

  createNote = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const note = await this.commandBus.execute<
        AddNoteToProjectCommand,
        NoteNode | null
      >(
        new AddNoteToProjectCommand(
          userId,
          orgId,
          req.params.projectId,
          req.body as IAddNoteToProjectInput
        )
      );

      if (!note) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(201).json(this.noteMapper.toRepresentation(note));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create note" });
    }
  };

  createDecision = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const decision = await this.commandBus.execute<
        AddDecisionToProjectCommand,
        DecisionNode | null
      >(
        new AddDecisionToProjectCommand(
          userId,
          orgId,
          req.params.projectId,
          req.body as IAddDecisionToProjectInput
        )
      );

      if (!decision) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(201).json(this.decisionMapper.toRepresentation(decision));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (
        error instanceof Error &&
        error.message === "Decision title is required"
      ) {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create decision" });
    }
  };

  createIdea = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const idea = await this.commandBus.execute<
        AddIdeaToProjectCommand,
        IdeaNode | null
      >(
        new AddIdeaToProjectCommand(
          userId,
          orgId,
          req.params.projectId,
          req.body as IAddIdeaToProjectInput
        )
      );

      if (!idea) {
        res.status(404).json({ message: "Project not found" });
        return;
      }

      res.status(201).json(this.ideaMapper.toRepresentation(idea));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Idea title is required") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create idea" });
    }
  };

  updateTask = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "task", "update");

  deleteTask = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "task", "delete");

  restoreTask = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "task", "restore");

  updateNote = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "note", "update");

  deleteNote = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "note", "delete");

  restoreNote = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "note", "restore");

  updateDecision = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "decision", "update");

  deleteDecision = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "decision", "delete");

  restoreDecision = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "decision", "restore");

  updateIdea = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "idea", "update");

  deleteIdea = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "idea", "delete");

  restoreIdea = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "idea", "restore");

  updateResource = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "resource", "update");

  deleteResource = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "resource", "delete");

  restoreResource = (req: Request, res: Response) =>
    this.mutateProjectChild(req, res, "resource", "restore");

  private async mutateProjectChild(
    req: Request,
    res: Response,
    kind: ProjectChildKind,
    action: "update" | "delete" | "restore"
  ): Promise<void> {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;
      const { userId, orgId } = ctx;

      const { projectId, childId } = req.params;

      let project: ProjectNode | null;

      if (action === "update") {
        project = await this.commandBus.execute<
          UpdateProjectChildCommand,
          ProjectNode | null
        >(
          new UpdateProjectChildCommand(
            userId,
            orgId,
            projectId,
            childId,
            kind,
            req.body as IUpdateProjectChildInput
          )
        );
      } else if (action === "delete") {
        project = await this.commandBus.execute<
          DeleteProjectChildCommand,
          ProjectNode | null
        >(
          new DeleteProjectChildCommand(userId, orgId, projectId, childId, kind)
        );
      } else {
        project = await this.commandBus.execute<
          RestoreProjectChildCommand,
          ProjectNode | null
        >(
          new RestoreProjectChildCommand(userId, orgId, projectId, childId, kind)
        );
      }

      if (!project) {
        res.status(404).json({ message: "Project or item not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(project));
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith("Invalid") ||
          error.message === "Person not found")
      ) {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: `Failed to ${action} ${kind}` });
    }
  }
}
