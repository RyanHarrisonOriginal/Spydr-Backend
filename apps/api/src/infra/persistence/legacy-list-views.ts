import type { IDecisionViews } from "../../domains/decisions/views.js";
import type { IIdeaViews } from "../../domains/ideas/views.js";
import type { INoteViews } from "../../domains/notes/views.js";
import type { IOrganizationViews } from "../../domains/organizations/views.js";
import type { IPersonViews } from "../../domains/people/views.js";
import type { IProjectAreaViews } from "../../domains/project-areas/views.js";
import type { IProjectViews } from "../../domains/projects/views.js";
import type { IResourceViews } from "../../domains/resources/views.js";
import type { ISpydrNodeViews } from "../../domains/nodes/views.js";
import type { PostgresDecisionRepository } from "./prisma/repositories/postgres-decision.repository.js";
import type { PostgresIdeaRepository } from "./prisma/repositories/postgres-idea.repository.js";
import type { PostgresNoteRepository } from "./prisma/repositories/postgres-note.repository.js";
import type { PostgresOrganizationRepository } from "./prisma/repositories/postgres-organization.repository.js";
import type { PostgresPersonRepository } from "./prisma/repositories/postgres-person.repository.js";
import type { PostgresProjectAreaRepository } from "./prisma/repositories/postgres-project-area.repository.js";
import type { PostgresProjectRepository } from "./prisma/repositories/postgres-project.repository.js";
import type { PostgresResourceRepository } from "./prisma/repositories/postgres-resource.repository.js";
import type { PrismaSpydrNodeRepository } from "./prisma/repositories/prisma-spydr-node.repository.js";

/**
 * Temporary adapters: expose list/projection methods as view ports
 * while write repos are slimmed to get/save/delete.
 */
export class LegacyListViews {
  readonly decisions: IDecisionViews;
  readonly ideas: IIdeaViews;
  readonly notes: INoteViews;
  readonly organizations: IOrganizationViews;
  readonly people: IPersonViews;
  readonly projectAreas: IProjectAreaViews;
  readonly projects: IProjectViews;
  readonly resources: IResourceViews;
  readonly spydrNodes: ISpydrNodeViews;

  constructor(deps: {
    people: PostgresPersonRepository;
    projects: PostgresProjectRepository;
    notes: PostgresNoteRepository;
    ideas: PostgresIdeaRepository;
    decisions: PostgresDecisionRepository;
    projectAreas: PostgresProjectAreaRepository;
    resources: PostgresResourceRepository;
    spydrNodes: PrismaSpydrNodeRepository;
    organizations: PostgresOrganizationRepository;
  }) {
    this.decisions = {
      listByOrg: (orgId) => deps.decisions.listByOrgWithProjects(orgId),
    };
    this.ideas = {
      listByOrg: (orgId) => deps.ideas.listByOrg(orgId),
    };
    this.notes = {
      listByOrg: (orgId) => deps.notes.listByOrgWithProjects(orgId),
      getListItem: (orgId, noteId) => deps.notes.getListItemForOrg(orgId, noteId),
    };
    this.organizations = {
      listForUser: (userId) => deps.organizations.listForUser(userId),
      isMember: (userId, orgId) => deps.organizations.isMember(userId, orgId),
      getMemberRole: (userId, orgId) =>
        deps.organizations.getMemberRole(userId, orgId),
    };
    this.people = {
      listByOrg: (orgId) => deps.people.listByOrg(orgId),
      getById: (orgId, personId) => deps.people.findByIdForOrg(personId, orgId),
    };
    this.projectAreas = {
      listByOrg: (orgId) => deps.projectAreas.listByOrg(orgId),
      getByTitle: (orgId, title) =>
        deps.projectAreas.findByTitleForOrg(title, orgId),
    };
    this.projects = {
      listByOrg: (orgId) => deps.projects.listByOrg(orgId),
      listDeletedByOrg: (orgId) => deps.projects.listDeletedByOrg(orgId),
      getById: (orgId, projectId) =>
        deps.projects.findByIdForOrg(projectId, orgId),
    };
    this.resources = {
      listByOrg: (orgId) => deps.resources.listByOrg(orgId),
    };
    this.spydrNodes = {
      list: (criteria) => deps.spydrNodes.list(criteria),
      nextSortOrderForOrg: (orgId, nodeType) =>
        deps.spydrNodes.nextSortOrderForOrg(orgId, nodeType),
    };
  }
}
