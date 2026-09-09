import type { IPersistenceRepositories } from "../../../infra/persistence/index.js";
import type { IQueryBus } from "./query-bus.js";
import {
  AnalyzeActiveNoteQueryHandler,
  GetActiveNoteAnalysisQueryHandler,
  ListActiveNotesQueryHandler,
} from "../../active-notes/queries/index.js";
import { ListOrganizationsQueryHandler } from "../../organizations/queries/index.js";
import { ListDecisionsQueryHandler } from "../../decisions/queries/index.js";
import { ListIdeasQueryHandler } from "../../ideas/queries/index.js";
import {
  ListNotesQueryHandler,
  GetNoteQueryHandler,
} from "../../notes/queries/index.js";
import { ListProjectAreasQueryHandler } from "../../project-areas/queries/index.js";
import {
  GetPersonQueryHandler,
  GetPersonWorkQueryHandler,
  ListPeopleQueryHandler,
} from "../../people/queries/index.js";
import {
  GetProjectQueryHandler,
  ListDeletedProjectsQueryHandler,
  ListProjectsQueryHandler,
} from "../../projects/queries/index.js";
import { ListResourcesQueryHandler } from "../../resources/queries/index.js";
import {
  ListTasksQueryHandler,
  GetTaskQueryHandler,
} from "../../tasks/queries/index.js";
import { ListTodoItemsQueryHandler } from "../../todos/queries/index.js";
import { GetWorkspaceDashboardQueryHandler } from "../../dashboard/queries/index.js";
import { ACTIVE_NOTE_PROMPT_VERSION } from "@spydr/active-notes";

export interface IRegisterQueryHandlersOptions {
  enqueueActiveNoteAnalyze: (sessionId: string) => Promise<void>;
  activeNotePromptVersion?: string | null;
}

export function registerQueryHandlers(
  queryBus: IQueryBus,
  repositories: IPersistenceRepositories,
  options: IRegisterQueryHandlersOptions
): void {
  queryBus.registerMany([
    new ListOrganizationsQueryHandler(repositories.organizationViews),
    new ListDecisionsQueryHandler(repositories.decisionViews),
    new ListIdeasQueryHandler(repositories.ideaViews),
    new ListNotesQueryHandler(repositories.noteViews),
    new GetNoteQueryHandler(repositories.noteViews),
    new ListProjectAreasQueryHandler(repositories.projectAreaViews),
    new ListPeopleQueryHandler(repositories.personViews),
    new GetPersonQueryHandler(repositories.personViews),
    new GetPersonWorkQueryHandler(repositories.personWork),
    new GetProjectQueryHandler(repositories.projectViews),
    new ListProjectsQueryHandler(repositories.projectViews),
    new ListDeletedProjectsQueryHandler(repositories.projectViews),
    new ListResourcesQueryHandler(repositories.resourceViews),
    new ListTasksQueryHandler(repositories.taskViews),
    new GetTaskQueryHandler(repositories.taskViews),
    new ListTodoItemsQueryHandler(repositories.todoViews),
    new GetWorkspaceDashboardQueryHandler(repositories.workspaceDashboard),
    new ListActiveNotesQueryHandler(repositories.activeNoteSessions),
    new GetActiveNoteAnalysisQueryHandler(repositories.activeNoteSessions),
    new AnalyzeActiveNoteQueryHandler(
      repositories.activeNoteSessions,
      options.enqueueActiveNoteAnalyze,
      options.activeNotePromptVersion ?? ACTIVE_NOTE_PROMPT_VERSION
    ),
  ]);
}
