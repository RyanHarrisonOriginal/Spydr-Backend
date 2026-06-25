import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  CreatePersonCommand,
  UpdatePersonCommand,
  type ICreatePersonInput,
  type IUpdatePersonInput,
} from "../../../domain/cqrs/commands/people/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import {
  GetPersonQuery,
  ListPeopleQuery,
} from "../../../domain/cqrs/queries/people/index.js";
import type { PersonNode } from "../../../domain/models/people/index.js";
import { PersonResponseMapper } from "../mappers/person-response.mapper.js";

export class PeopleController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new PersonResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const people = await this.queryBus.execute<ListPeopleQuery, PersonNode[]>(
        new ListPeopleQuery(userId)
      );

      res.json(people.map((person) => this.mapper.toRepresentation(person)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list people" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const person = await this.queryBus.execute<GetPersonQuery, PersonNode | null>(
        new GetPersonQuery(userId, req.params.personId)
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
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const person = await this.commandBus.execute<CreatePersonCommand, PersonNode>(
        new CreatePersonCommand(userId, req.body as ICreatePersonInput)
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
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const person = await this.commandBus.execute<
        UpdatePersonCommand,
        PersonNode | null
      >(
        new UpdatePersonCommand(
          userId,
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
}
