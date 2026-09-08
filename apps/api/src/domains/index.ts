/** Compatibility barrel — prefer importing from specific domains. */
export * from "./shared/application/index.js";
export * from "./tasks/index.js";
export * from "./notes/commands/index.js";
export * from "./notes/queries/index.js";
export * from "./ideas/commands/index.js";
export * from "./ideas/queries/index.js";
export * from "./decisions/commands/index.js";
export * from "./decisions/queries/index.js";
export * from "./people/commands/index.js";
export * from "./people/queries/index.js";
export * from "./projects/commands/index.js";
export * from "./projects/queries/index.js";
export * from "./project-areas/commands/index.js";
export * from "./project-areas/queries/index.js";
export * from "./organizations/commands/index.js";
export * from "./organizations/queries/index.js";
export * from "./resources/queries/index.js";
export * from "./dashboard/queries/index.js";
export * from "./active-notes/commands/index.js";
export * from "./active-notes/queries/index.js";
export * from "./nodes/commands/index.js";
export * from "./node-type-transform/commands/transform-node-type.command.js";

export type { ITaskRepository } from "./tasks/repository.js";
export type { ITaskViews, ITaskListItem, ITaskProjectRef } from "./tasks/views.js";
export type { INoteRepository } from "./notes/repository.js";
export type { INoteViews, INoteListItem } from "./notes/views.js";
export type { IIdeaRepository } from "./ideas/repository.js";
export type { IIdeaViews } from "./ideas/views.js";
export type { IDecisionRepository } from "./decisions/repository.js";
export type { IDecisionViews, IDecisionListItem } from "./decisions/views.js";
export type { IPersonRepository } from "./people/repository.js";
export type { IPersonViews } from "./people/views.js";
export type {
  IPersonWork,
  IPersonWorkProjectEntry,
  IPersonWorkRepository,
  IPersonWorkTaskEntry,
} from "./people/work-views.js";
export type { IPersonCollectionSortRepository } from "./people/collection-sort-repository.js";
export type {
  IProjectRepository,
  ProjectChildKind,
  IUpdateProjectChildInput,
} from "./projects/repository.js";
export type { IProjectViews } from "./projects/views.js";
export type { IProjectAreaRepository } from "./project-areas/repository.js";
export type { IProjectAreaViews } from "./project-areas/views.js";
export type {
  IOrganizationRepository,
  ICreateOrganizationInput,
} from "./organizations/repository.js";
export type { IOrganizationViews } from "./organizations/views.js";
export type { IResourceRepository } from "./resources/repository.js";
export type { IResourceViews } from "./resources/views.js";
export type { ISpydrNodeRepository } from "./nodes/repository.js";
export type {
  ISpydrNodeViews,
  ISpydrNodeListCriteria,
} from "./nodes/views.js";
export type {
  IWorkspaceDashboard,
  IWorkspaceDashboardRepository,
} from "./dashboard/views.js";
export type { INodeTypeTransformRepository } from "./node-type-transform/repository.js";
export type { IInboxItemRepository } from "./inbox-items/repository.js";
export type {
  IGetCriteria,
  IRepository,
  ISaveOptions,
} from "./shared/repository.js";
