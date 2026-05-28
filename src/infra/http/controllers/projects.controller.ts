import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  AddTaskToProjectCommand,
  CreateProjectCommand,
  type IAddTaskToProjectInput,
  type ICreateProjectInput,
  type IUpdateProjectInput,
  UpdateProjectCommand,
} from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import {
  GetProjectQuery,
  ListProjectsQuery,
} from "../../../domain/cqrs/queries/index.js";
import type { ProjectNode } from "../../../domain/models/projects/index.js";
import type { TaskNode } from "../../../domain/models/tasks/index.js";
import { ProjectResponseMapper } from "../mappers/project-response.mapper.js";
import { TaskResponseMapper } from "../mappers/task-response.mapper.js";

export class ProjectsController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new ProjectResponseMapper(),
    private readonly taskMapper = new TaskResponseMapper()
  ) {}

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const project = await this.queryBus.execute<
        GetProjectQuery,
        ProjectNode | null
      >(new GetProjectQuery(userId, req.params.projectId));

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
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const projects = await this.queryBus.execute<ListProjectsQuery, ProjectNode[]>(
        new ListProjectsQuery(userId)
      );
      res.json(projects.map((project) => this.mapper.toRepresentation(project)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list projects" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const project = await this.commandBus.execute<
        CreateProjectCommand,
        ProjectNode
      >(new CreateProjectCommand(userId, req.body as ICreateProjectInput));

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

      console.error(error);
      res.status(500).json({ message: "Failed to create project" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const project = await this.commandBus.execute<
        UpdateProjectCommand,
        ProjectNode | null
      >(
        new UpdateProjectCommand(
          userId,
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

      console.error(error);
      res.status(500).json({ message: "Failed to update project" });
    }
  };

  createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const task = await this.commandBus.execute<
        AddTaskToProjectCommand,
        TaskNode | null
      >(
        new AddTaskToProjectCommand(
          userId,
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

      console.error(error);
      res.status(500).json({ message: "Failed to create task" });
    }
  };
}
