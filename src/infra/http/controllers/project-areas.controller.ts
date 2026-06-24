import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  CreateProjectAreaCommand,
  DeleteProjectAreaCommand,
  UpdateProjectAreaCommand,
  type ICreateProjectAreaInput,
  type IUpdateProjectAreaInput,
} from "../../../domain/cqrs/commands/project-areas/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListProjectAreasQuery } from "../../../domain/cqrs/queries/project-areas/index.js";
import type { ProjectAreaNode } from "../../../domain/models/project-areas/index.js";
import { ProjectAreaResponseMapper } from "../mappers/project-area-response.mapper.js";

export class ProjectAreasController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new ProjectAreaResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const areas = await this.queryBus.execute<
        ListProjectAreasQuery,
        ProjectAreaNode[]
      >(new ListProjectAreasQuery(userId));

      res.json(areas.map((area) => this.mapper.toRepresentation(area)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list project areas" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const area = await this.commandBus.execute<
        CreateProjectAreaCommand,
        ProjectAreaNode
      >(
        new CreateProjectAreaCommand(
          userId,
          req.body as ICreateProjectAreaInput
        )
      );

      res.status(201).json(this.mapper.toRepresentation(area));
    } catch (error) {
      if (error instanceof Error && error.message === "Project area title is required") {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Project area already exists") {
        res.status(409).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create project area" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const area = await this.commandBus.execute<
        UpdateProjectAreaCommand,
        ProjectAreaNode
      >(
        new UpdateProjectAreaCommand(
          userId,
          req.params.areaId,
          req.body as IUpdateProjectAreaInput
        )
      );

      res.json(this.mapper.toRepresentation(area));
    } catch (error) {
      if (error instanceof Error && error.message === "Project area not found") {
        res.status(404).json({ message: error.message });
        return;
      }
      if (
        error instanceof Error &&
        (error.message === "Nothing to update" ||
          error.message === "Invalid project area color")
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof Error && error.message === "Project area already exists") {
        res.status(409).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to update project area" });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const deleted = await this.commandBus.execute<DeleteProjectAreaCommand, boolean>(
        new DeleteProjectAreaCommand(userId, req.params.areaId)
      );

      if (!deleted) {
        res.status(404).json({ message: "Project area not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete project area" });
    }
  };
}
