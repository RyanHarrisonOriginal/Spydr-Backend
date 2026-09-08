import type { PrismaClient } from "@prisma/client";
import type { IDecisionRepository } from "../../domains/decisions/repository.js";
import type { IDecisionViews } from "../../domains/decisions/views.js";
import type { IIdeaRepository } from "../../domains/ideas/repository.js";
import type { IIdeaViews } from "../../domains/ideas/views.js";
import type { INoteRepository } from "../../domains/notes/repository.js";
import type { INoteViews } from "../../domains/notes/views.js";
import type {
  IOrganizationRepository,
} from "../../domains/organizations/repository.js";
import type { IOrganizationViews } from "../../domains/organizations/views.js";
import type { IPersonCollectionSortRepository } from "../../domains/people/collection-sort-repository.js";
import type { IPersonRepository } from "../../domains/people/repository.js";
import type { IPersonViews } from "../../domains/people/views.js";
import type { IPersonWorkRepository } from "../../domains/people/work-views.js";
import type { IProjectAreaRepository } from "../../domains/project-areas/repository.js";
import type { IProjectAreaViews } from "../../domains/project-areas/views.js";
import type { IProjectRepository } from "../../domains/projects/repository.js";
import type { IProjectViews } from "../../domains/projects/views.js";
import type { IResourceRepository } from "../../domains/resources/repository.js";
import type { IResourceViews } from "../../domains/resources/views.js";
import type { ISpydrNodeRepository } from "../../domains/nodes/repository.js";
import type { ISpydrNodeViews } from "../../domains/nodes/views.js";
import type { ITaskRepository } from "../../domains/tasks/repository.js";
import type { ITaskViews } from "../../domains/tasks/views.js";
import type { INodeTypeTransformRepository } from "../../domains/node-type-transform/repository.js";
import type { IWorkspaceDashboardRepository } from "../../domains/dashboard/views.js";
import {
  PostgresActiveNoteSessionRepository,
  type IActiveNoteSessionRepository,
} from "@spydr/active-notes";

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
import { PostgresTaskRepository } from "./tasks/postgres-task.repository.js";
import { PostgresTaskViews } from "./tasks/postgres-task.views.js";
import { PostgresNodeTypeTransformRepository } from "./prisma/repositories/postgres-node-type-transform.repository.js";
import { PostgresWorkspaceDashboardRepository } from "./prisma/repositories/postgres-workspace-dashboard.repository.js";
import { LegacyListViews } from "./legacy-list-views.js";

export interface IPersistenceRepositories {
  decisions: IDecisionRepository;
  decisionViews: IDecisionViews;
  ideas: IIdeaRepository;
  ideaViews: IIdeaViews;
  notes: INoteRepository;
  noteViews: INoteViews;
  organizations: IOrganizationRepository;
  organizationViews: IOrganizationViews;
  people: IPersonRepository;
  personViews: IPersonViews;
  personCollectionSort: IPersonCollectionSortRepository;
  personWork: IPersonWorkRepository;
  projectAreas: IProjectAreaRepository;
  projectAreaViews: IProjectAreaViews;
  projects: IProjectRepository;
  projectViews: IProjectViews;
  resources: IResourceRepository;
  resourceViews: IResourceViews;
  spydrNodes: ISpydrNodeRepository;
  spydrNodeViews: ISpydrNodeViews;
  tasks: ITaskRepository;
  taskViews: ITaskViews;
  nodeTypeTransforms: INodeTypeTransformRepository;
  workspaceDashboard: IWorkspaceDashboardRepository;
  activeNoteSessions: IActiveNoteSessionRepository;
}

export function createPersistenceRepositories(
  prisma: PrismaClient
): IPersistenceRepositories {
  const people = new PostgresPersonRepository(prisma);
  const projects = new PostgresProjectRepository(prisma);
  const tasks = new PostgresTaskRepository(prisma);
  const taskViews = new PostgresTaskViews(prisma);
  const personCollectionSort = new PostgresPersonCollectionSortRepository(prisma);
  const notes = new PostgresNoteRepository(prisma);
  const ideas = new PostgresIdeaRepository(prisma);
  const decisions = new PostgresDecisionRepository(prisma);
  const projectAreas = new PostgresProjectAreaRepository(prisma);
  const resources = new PostgresResourceRepository(prisma);
  const spydrNodes = new PrismaSpydrNodeRepository(prisma);
  const organizations = new PostgresOrganizationRepository(prisma);

  const legacyViews = new LegacyListViews({
    people,
    projects,
    notes,
    ideas,
    decisions,
    projectAreas,
    resources,
    spydrNodes,
    organizations,
  });

  return {
    decisions,
    decisionViews: legacyViews.decisions,
    ideas,
    ideaViews: legacyViews.ideas,
    notes,
    noteViews: legacyViews.notes,
    organizations,
    organizationViews: legacyViews.organizations,
    people,
    personViews: legacyViews.people,
    personCollectionSort,
    personWork: new PostgresPersonWorkRepository(
      people,
      legacyViews.projects,
      taskViews,
      personCollectionSort
    ),
    projectAreas,
    projectAreaViews: legacyViews.projectAreas,
    projects,
    projectViews: legacyViews.projects,
    resources,
    resourceViews: legacyViews.resources,
    spydrNodes,
    spydrNodeViews: legacyViews.spydrNodes,
    tasks,
    taskViews,
    nodeTypeTransforms: new PostgresNodeTypeTransformRepository(prisma),
    workspaceDashboard: new PostgresWorkspaceDashboardRepository(prisma),
    activeNoteSessions: new PostgresActiveNoteSessionRepository(prisma),
  };
}
