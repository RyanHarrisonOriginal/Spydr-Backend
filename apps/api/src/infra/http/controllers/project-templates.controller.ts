import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import {
  CreateProjectTemplateCommand,
  CreateProjectTemplateFromProjectCommand,
  DeleteProjectTemplateCommand,
  InvokeProjectTemplateCommand,
  UpdateProjectTemplateCommand,
  type IInvokeProjectTemplateInput,
} from "../../../domains/project-templates/commands/index.js";
import type {
  ICreateProjectTemplateFromProjectInput,
  ICreateProjectTemplateInput,
} from "../../../domains/project-templates/mappers/index.js";
import type { IProjectTemplateUpdateInput } from "../../../domains/project-templates/models/index.js";
import {
  GetProjectTemplateQuery,
  ListProjectTemplatesQuery,
} from "../../../domains/project-templates/queries/index.js";
import type { ProjectTemplate } from "../../../domains/project-templates/models/index.js";
import type { IProjectTemplateListItem } from "../../../domains/project-templates/views.js";
import type { ProjectNode } from "../../../domains/projects/models/index.js";
import { ProjectTemplateResponseMapper } from "../mappers/project-template-response.mapper.js";
import { ProjectResponseMapper } from "../mappers/project-response.mapper.js";

const CLIENT_ERRORS = new Set([
  "Template name is required",
  "Template title is required",
  "Template task title is required",
  "Nothing to update",
  "Invalid parameter key",
  "Duplicate parameter key",
  "Invalid template status",
  "Invalid template priority",
  "Project area not found",
]);

function isClientError(message: string): boolean {
  if (CLIENT_ERRORS.has(message)) return true;
  if (message.startsWith("Missing required parameter:")) return true;
  if (message.startsWith("Unknown template parameter:")) return true;
  if (message.startsWith("Unresolved template tokens")) return true;
  if (message.startsWith("Invalid parameter key:")) return true;
  if (message.startsWith("Duplicate parameter key:")) return true;
  return false;
}

export class ProjectTemplatesController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new ProjectTemplateResponseMapper(),
    private readonly projectMapper = new ProjectResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const includeArchived =
        req.query.includeArchived === "true" ||
        req.query.includeArchived === "1";

      const items = await this.queryBus.execute<
        ListProjectTemplatesQuery,
        IProjectTemplateListItem[]
      >(
        new ListProjectTemplatesQuery(
          ctx.userId,
          ctx.orgId,
          includeArchived
        )
      );

      res.json(items.map((item) => this.mapper.toListItem(item)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list project templates" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const template = await this.queryBus.execute<
        GetProjectTemplateQuery,
        ProjectTemplate | null
      >(
        new GetProjectTemplateQuery(
          ctx.userId,
          ctx.orgId,
          req.params.templateId
        )
      );

      if (!template) {
        res.status(404).json({ message: "Project template not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(template));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get project template" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const template = await this.commandBus.execute<
        CreateProjectTemplateCommand,
        ProjectTemplate
      >(
        new CreateProjectTemplateCommand(
          ctx.userId,
          ctx.orgId,
          req.body as ICreateProjectTemplateInput
        )
      );

      res.status(201).json(this.mapper.toRepresentation(template));
    } catch (error) {
      if (error instanceof Error && isClientError(error.message)) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ message: "Failed to create project template" });
    }
  };

  createFromProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const body = req.body as ICreateProjectTemplateFromProjectInput & {
        projectId?: string;
      };
      const projectId = body.projectId;
      if (!projectId) {
        res.status(400).json({ message: "projectId is required" });
        return;
      }

      const template = await this.commandBus.execute<
        CreateProjectTemplateFromProjectCommand,
        ProjectTemplate
      >(
        new CreateProjectTemplateFromProjectCommand(
          ctx.userId,
          ctx.orgId,
          projectId,
          {
            name: body.name,
            description: body.description,
            taskIds: body.taskIds,
          }
        )
      );

      res.status(201).json(this.mapper.toRepresentation(template));
    } catch (error) {
      if (error instanceof Error && error.message === "Project not found") {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof Error && isClientError(error.message)) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ message: "Failed to create project template" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const template = await this.commandBus.execute<
        UpdateProjectTemplateCommand,
        ProjectTemplate
      >(
        new UpdateProjectTemplateCommand(
          ctx.userId,
          ctx.orgId,
          req.params.templateId,
          req.body as IProjectTemplateUpdateInput
        )
      );

      res.json(this.mapper.toRepresentation(template));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Project template not found"
      ) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof Error && isClientError(error.message)) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ message: "Failed to update project template" });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const deleted = await this.commandBus.execute<
        DeleteProjectTemplateCommand,
        boolean
      >(
        new DeleteProjectTemplateCommand(
          ctx.userId,
          ctx.orgId,
          req.params.templateId
        )
      );

      if (!deleted) {
        res.status(404).json({ message: "Project template not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete project template" });
    }
  };

  invoke = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const project = await this.commandBus.execute<
        InvokeProjectTemplateCommand,
        ProjectNode
      >(
        new InvokeProjectTemplateCommand(
          ctx.userId,
          ctx.orgId,
          req.params.templateId,
          req.body as IInvokeProjectTemplateInput
        )
      );

      res.status(201).json(this.projectMapper.toRepresentation(project));
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Project template not found"
      ) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (error instanceof Error && isClientError(error.message)) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ message: "Failed to invoke project template" });
    }
  };
}
