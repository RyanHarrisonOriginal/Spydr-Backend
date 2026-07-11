import type { PrismaClient } from "@prisma/client";
import type {
  IDecisionRepository,
  IIdeaRepository,
  INoteRepository,
  IOrganizationRepository,
  IPersonCollectionSortRepository,
  IPersonRepository,
  IPersonWorkRepository,
  IProjectAreaRepository,
  IProjectRepository,
  IResourceRepository,
  ISpydrNodeRepository,
  ITaskRepository,
  IWorkspaceDashboardRepository,
} from "../../domain/interfaces/index.js";
import { PostgresOrganizationRepository } from "./prisma/repositories/postgres-organization.repository.js";
import { PostgresPersonRepository } from "./prisma/repositories/postgres-person.repository.js";
import { PostgresPersonCollectionSortRepository } from "./prisma/repositories/postgres-person-collection-sort.repository.js";
import { PostgresPersonWorkRepository } from "./prisma/repositories/postgres-person-work.repository.js";
import { PrismaSpydrNodeRepository } from "./prisma/repositories/prisma-spydr-node.repository.js";
import { PostgresDecisionRepository } from "./prisma/repositories/postgres-decision.repository.js";
import { PostgresIdeaRepository } from "./prisma/repositories/postgres-idea.repository.js";
import { PostgresNoteRepository } from "./prisma/repositories/postgres-note.repository.js";
import { PostgresProjectAreaRepository } from "./prisma/repositories/postgres-project-area.repository.js";
import { PostgresProjectRepository } from "./prisma/repositories/postgres-project.repository.js";
import { PostgresResourceRepository } from "./prisma/repositories/postgres-resource.repository.js";
import { PostgresTaskRepository } from "./prisma/repositories/postgres-task.repository.js";
import { PostgresWorkspaceDashboardRepository } from "./prisma/repositories/postgres-workspace-dashboard.repository.js";

export interface IPersistenceRepositories {
  decisions: IDecisionRepository;
  ideas: IIdeaRepository;
  notes: INoteRepository;
  organizations: IOrganizationRepository;
  people: IPersonRepository;
  personCollectionSort: IPersonCollectionSortRepository;
  personWork: IPersonWorkRepository;
  projectAreas: IProjectAreaRepository;
  projects: IProjectRepository;
  resources: IResourceRepository;
  spydrNodes: ISpydrNodeRepository;
  tasks: ITaskRepository;
  workspaceDashboard: IWorkspaceDashboardRepository;
}

export function createPersistenceRepositories(
  prisma: PrismaClient
): IPersistenceRepositories {
  const people = new PostgresPersonRepository(prisma);
  const projects = new PostgresProjectRepository(prisma);
  const tasks = new PostgresTaskRepository(prisma);
  const personCollectionSort = new PostgresPersonCollectionSortRepository(prisma);

  return {
    decisions: new PostgresDecisionRepository(prisma),
    ideas: new PostgresIdeaRepository(prisma),
    notes: new PostgresNoteRepository(prisma),
    organizations: new PostgresOrganizationRepository(prisma),
    people,
    personCollectionSort,
    personWork: new PostgresPersonWorkRepository(
      people,
      projects,
      tasks,
      personCollectionSort
    ),
    projectAreas: new PostgresProjectAreaRepository(prisma),
    projects,
    resources: new PostgresResourceRepository(prisma),
    spydrNodes: new PrismaSpydrNodeRepository(prisma),
    tasks,
    workspaceDashboard: new PostgresWorkspaceDashboardRepository(prisma),
  };
}
