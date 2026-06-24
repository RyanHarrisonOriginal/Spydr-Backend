import type { PrismaClient } from "@prisma/client";
import type {
  IDecisionRepository,
  IIdeaRepository,
  INoteRepository,
  IProjectAreaRepository,
  IProjectRepository,
  IResourceRepository,
  ISpydrNodeRepository,
  ITaskRepository,
} from "../../domain/interfaces/index.js";
import { PrismaSpydrNodeRepository } from "./prisma/repositories/prisma-spydr-node.repository.js";
import { PostgresDecisionRepository } from "./prisma/repositories/postgres-decision.repository.js";
import { PostgresIdeaRepository } from "./prisma/repositories/postgres-idea.repository.js";
import { PostgresNoteRepository } from "./prisma/repositories/postgres-note.repository.js";
import { PostgresProjectAreaRepository } from "./prisma/repositories/postgres-project-area.repository.js";
import { PostgresProjectRepository } from "./prisma/repositories/postgres-project.repository.js";
import { PostgresResourceRepository } from "./prisma/repositories/postgres-resource.repository.js";
import { PostgresTaskRepository } from "./prisma/repositories/postgres-task.repository.js";

export interface IPersistenceRepositories {
  decisions: IDecisionRepository;
  ideas: IIdeaRepository;
  notes: INoteRepository;
  projectAreas: IProjectAreaRepository;
  projects: IProjectRepository;
  resources: IResourceRepository;
  spydrNodes: ISpydrNodeRepository;
  tasks: ITaskRepository;
}

export function createPersistenceRepositories(
  prisma: PrismaClient
): IPersistenceRepositories {
  return {
    decisions: new PostgresDecisionRepository(prisma),
    ideas: new PostgresIdeaRepository(prisma),
    notes: new PostgresNoteRepository(prisma),
    projectAreas: new PostgresProjectAreaRepository(prisma),
    projects: new PostgresProjectRepository(prisma),
    resources: new PostgresResourceRepository(prisma),
    spydrNodes: new PrismaSpydrNodeRepository(prisma),
    tasks: new PostgresTaskRepository(prisma),
  };
}
