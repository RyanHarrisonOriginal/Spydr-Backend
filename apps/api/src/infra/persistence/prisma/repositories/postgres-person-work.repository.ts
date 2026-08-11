import type { IProjectRepository } from "../../../../domain/interfaces/project-repository.js";
import type { IPersonCollectionSortRepository } from "../../../../domain/interfaces/person-collection-sort-repository.js";
import type { IPersonRepository } from "../../../../domain/interfaces/person-repository.js";
import type {
  IPersonWork,
  IPersonWorkProjectEntry,
  IPersonWorkRepository,
  IPersonWorkTaskEntry,
} from "../../../../domain/interfaces/person-work-repository.js";
import type { ITaskListItem, ITaskRepository } from "../../../../domain/interfaces/task-repository.js";
import type { ProjectNode } from "../../../../domain/models/projects/index.js";
import {
  getPersonProjectRoles,
  projectInvolvesPerson,
} from "../../../../domain/utils/person-project-roles.js";

function isOpenTaskStatus(status: string): boolean {
  return status !== "completed" && status !== "archived";
}

function buildGlobalRankLookup<T extends { id: string; sortOrder: number }>(
  items: readonly T[]
): Map<string, number> {
  const sorted = [...items].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
  );
  return new Map(sorted.map((item, index) => [item.id, index + 1]));
}

function comparePersonListOrder(
  left: { id: string; sortOrder: number; personSortOrder: number | null },
  right: { id: string; sortOrder: number; personSortOrder: number | null }
): number {
  const leftOrder = left.personSortOrder ?? left.sortOrder;
  const rightOrder = right.personSortOrder ?? right.sortOrder;
  return leftOrder - rightOrder || left.id.localeCompare(right.id);
}

export class PostgresPersonWorkRepository implements IPersonWorkRepository {
  constructor(
    private readonly people: IPersonRepository,
    private readonly projects: IProjectRepository,
    private readonly tasks: ITaskRepository,
    private readonly personCollectionSort: IPersonCollectionSortRepository
  ) {}

  async getWork(orgId: string, personNodeId: string): Promise<IPersonWork | null> {
    const person = await this.people.findByIdForOrg(personNodeId, orgId);
    if (!person) return null;

    const [allProjects, allTaskItems] = await Promise.all([
      this.projects.listByOrg(orgId),
      this.tasks.listByOrgWithProjects(orgId),
    ]);

    const linkedTaskItems = allTaskItems.filter(
      (item) => item.task.details?.assigneePersonNodeId === personNodeId
    );

    const openTaskCountByProject = new Map<string, number>();
    const taskProjectIds = new Set<string>();
    for (const item of linkedTaskItems) {
      const projectId = item.project?.id;
      if (!projectId) continue;
      taskProjectIds.add(projectId);
      if (isOpenTaskStatus(item.task.status)) {
        openTaskCountByProject.set(
          projectId,
          (openTaskCountByProject.get(projectId) ?? 0) + 1
        );
      }
    }

    const projectById = new Map(allProjects.map((project) => [project.id, project]));
    const linkedProjectIds = new Set<string>();

    for (const project of allProjects) {
      if (projectInvolvesPerson(project, personNodeId)) {
        linkedProjectIds.add(project.id);
      }
    }
    for (const projectId of taskProjectIds) {
      linkedProjectIds.add(projectId);
    }

    const linkedProjects = [...linkedProjectIds]
      .map((id) => projectById.get(id))
      .filter((project): project is ProjectNode => Boolean(project));

    const projectSortMap = await this.personCollectionSort.getSortOrderMap(
      orgId,
      personNodeId,
      linkedProjects.map((project) => project.id)
    );
    const taskSortMap = await this.personCollectionSort.getSortOrderMap(
      orgId,
      personNodeId,
      linkedTaskItems.map((item) => item.task.id)
    );

    const projectGlobalRanks = buildGlobalRankLookup(allProjects);
    const taskGlobalRanks = buildGlobalRankLookup(
      allTaskItems.map((item) => item.task)
    );

    const projectEntries = this.buildProjectEntries(
      linkedProjects,
      personNodeId,
      projectSortMap,
      projectGlobalRanks,
      openTaskCountByProject
    );
    const taskEntries = this.buildTaskEntries(
      linkedTaskItems,
      taskSortMap,
      taskGlobalRanks
    );

    return {
      projects: projectEntries,
      tasks: taskEntries,
    };
  }

  async getEligibleNodeIds(
    orgId: string,
    personNodeId: string,
    nodeType: "project" | "task"
  ): Promise<string[]> {
    const work = await this.getWork(orgId, personNodeId);
    if (!work) return [];

    if (nodeType === "project") {
      return work.projects.map((entry) => entry.project.id);
    }

    return work.tasks.map((entry) => entry.task.id);
  }

  private buildProjectEntries(
    projects: ProjectNode[],
    personNodeId: string,
    personSortMap: Map<string, number>,
    globalRanks: Map<string, number>,
    openTaskCountByProject: Map<string, number>
  ): IPersonWorkProjectEntry[] {
    const withOrder = projects.map((project) => ({
      project,
      roles: getPersonProjectRoles(project, personNodeId),
      openTaskCount: openTaskCountByProject.get(project.id) ?? 0,
      sortOrder: project.sortOrder,
      personSortOrder: personSortMap.get(project.id) ?? null,
      id: project.id,
    }));

    withOrder.sort(comparePersonListOrder);

    return withOrder.map((entry, index) => ({
      project: entry.project,
      roles: entry.roles,
      openTaskCount: entry.openTaskCount,
      sortOrder: entry.sortOrder,
      personSortOrder: entry.personSortOrder,
      globalRank: globalRanks.get(entry.project.id) ?? index + 1,
      personRank: index + 1,
    }));
  }

  private buildTaskEntries(
    taskItems: ITaskListItem[],
    personSortMap: Map<string, number>,
    globalRanks: Map<string, number>
  ): IPersonWorkTaskEntry[] {
    const withOrder = taskItems.map((item) => ({
      task: item.task,
      project: item.project,
      sortOrder: item.task.sortOrder,
      personSortOrder: personSortMap.get(item.task.id) ?? null,
      id: item.task.id,
    }));

    withOrder.sort(comparePersonListOrder);

    return withOrder.map((entry, index) => ({
      task: entry.task,
      project: entry.project,
      sortOrder: entry.sortOrder,
      personSortOrder: entry.personSortOrder,
      globalRank: globalRanks.get(entry.task.id) ?? index + 1,
      personRank: index + 1,
    }));
  }
}
