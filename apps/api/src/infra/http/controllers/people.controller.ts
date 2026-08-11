import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  CreatePersonCommand,
  DeletePersonCommand,
  ReorderPersonCollectionCommand,
  UpdatePersonCommand,
  type ICreatePersonInput,
  type IUpdatePersonInput,
} from "../../../domain/cqrs/commands/people/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import {
  GetPersonQuery,
  GetPersonWorkQuery,
  ListPeopleQuery,
} from "../../../domain/cqrs/queries/people/index.js";
import type { IPersonWork } from "../../../domain/interfaces/person-work-repository.js";
import type { PersonNode } from "../../../domain/models/people/index.js";
import { PersonResponseMapper } from "../mappers/person-response.mapper.js";
import { PersonWorkResponseMapper } from "../mappers/person-work-response.mapper.js";

const PERSON_COLLECTION_NODE_TYPES = new Set(["project", "task"]);

export class PeopleController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new PersonResponseMapper(),
    private readonly workMapper = new PersonWorkResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const people = await this.queryBus.execute<ListPeopleQuery, PersonNode[]>(
        new ListPeopleQuery(ctx.userId, ctx.orgId)
      );

      res.json(people.map((person) => this.mapper.toRepresentation(person)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list people" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const person = await this.queryBus.execute<GetPersonQuery, PersonNode | null>(
        new GetPersonQuery(ctx.userId, ctx.orgId, req.params.personId)
      );

      if (!person) {
        res.status(404).json({ message: "Person not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(person));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get person" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const person = await this.commandBus.execute<CreatePersonCommand, PersonNode>(
        new CreatePersonCommand(ctx.userId, ctx.orgId, req.body as ICreatePersonInput)
      );

      res.status(201).json(this.mapper.toRepresentation(person));
    } catch (error) {
      if (error instanceof Error && error.message === "Person full name is required") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to create person" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const person = await this.commandBus.execute<
        UpdatePersonCommand,
        PersonNode | null
      >(
        new UpdatePersonCommand(
          ctx.userId,
          ctx.orgId,
          req.params.personId,
          req.body as IUpdatePersonInput
        )
      );

      if (!person) {
        res.status(404).json({ message: "Person not found" });
        return;
      }

      res.json(this.mapper.toRepresentation(person));
    } catch (error) {
      if (error instanceof Error && error.message === "Person full name is required") {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to update person" });
    }
  };

  getWork = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const work = await this.queryBus.execute<GetPersonWorkQuery, IPersonWork | null>(
        new GetPersonWorkQuery(ctx.userId, ctx.orgId, req.params.personId)
      );

      if (!work) {
        res.status(404).json({ message: "Person not found" });
        return;
      }

      res.json(this.workMapper.toRepresentation(work));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get person work" });
    }
  };

  reorderCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const body = req.body as { nodeType?: string; orderedIds?: unknown };
      const nodeType = body.nodeType;
      const orderedIds = body.orderedIds;

      if (
        typeof nodeType !== "string" ||
        !PERSON_COLLECTION_NODE_TYPES.has(nodeType)
      ) {
        res.status(400).json({ error: "Invalid nodeType" });
        return;
      }

      if (
        !Array.isArray(orderedIds) ||
        orderedIds.some((id) => typeof id !== "string")
      ) {
        res.status(400).json({ error: "orderedIds must be a string array" });
        return;
      }

      await this.commandBus.execute(
        new ReorderPersonCollectionCommand(
          ctx.userId,
          ctx.orgId,
          req.params.personId,
          {
            nodeType: nodeType as "project" | "task",
            orderedIds,
          }
        )
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === "Person not found") {
        res.status(404).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to reorder person collection" });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const deleted = await this.commandBus.execute<DeletePersonCommand, boolean>(
        new DeletePersonCommand(ctx.userId, ctx.orgId, req.params.personId)
      );

      if (!deleted) {
        res.status(404).json({ message: "Person not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete person" });
    }
  };
}
