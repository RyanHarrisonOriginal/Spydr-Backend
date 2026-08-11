import type { PrismaClient } from "@prisma/client";
import type {
  IWorkspaceDashboard,
  IWorkspaceDashboardAreaSummary,
  IWorkspaceDashboardPersonLoad,
  IWorkspaceDashboardPersonRef,
  IWorkspaceDashboardPersonRoleCounts,
  IWorkspaceDashboardRepository,
  IWorkspaceDashboardStatusCounts,
} from "../../../../domain/interfaces/workspace-dashboard-repository.js";

const UNASSIGNED_KEY = "__unassigned__";
const UNASSIGNED_AREA_COLOR = "0 0% 45%";
const DEFAULT_AREA_COLOR = "18 94% 50%";

const personaFields = [
  "assigneePersonNodeId",
  "requesterPersonNodeId",
  "sponsorPersonNodeId",
  "reviewerPersonNodeId",
] as const;

const roleByField: Record<(typeof personaFields)[number], keyof IWorkspaceDashboardPersonRoleCounts> = {
  assigneePersonNodeId: "assignee",
  requesterPersonNodeId: "requester",
  sponsorPersonNodeId: "sponsor",
  reviewerPersonNodeId: "reviewer",
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isOpenTaskStatus(status: string): boolean {
  return status !== "completed" && status !== "archived";
}

function isOpenProjectStatus(status: string): boolean {
  return status === "active" || status === "waiting" || status === "blocked";
}

function isBlockedTask(status: string, isBlocked: boolean): boolean {
  return status === "blocked" || isBlocked;
}

function isOverdueTask(
  status: string,
  dueDate: Date | null | undefined,
  today: Date
): boolean {
  if (!dueDate || !isOpenTaskStatus(status)) return false;
  return dueDate.getTime() < today.getTime();
}

function incrementStatusCount(
  counts: IWorkspaceDashboardStatusCounts,
  status: string
): void {
  counts[status] = (counts[status] ?? 0) + 1;
}

function emptyRoleCounts(): IWorkspaceDashboardPersonRoleCounts {
  return { assignee: 0, requester: 0, sponsor: 0, reviewer: 0 };
}

function personKey(personId: string | null | undefined): string {
  return personId ?? UNASSIGNED_KEY;
}

export class PostgresWorkspaceDashboardRepository
  implements IWorkspaceDashboardRepository
{
  constructor(private readonly db: PrismaClient) {}

  async getForOrg(orgId: string): Promise<IWorkspaceDashboard> {
    const today = startOfUtcDay(new Date());

    const [projects, tasks, relationships, areaRows] = await Promise.all([
      this.db.spydrNode.findMany({
        where: { orgId, nodeType: "project", isDeleted: false },
        include: { projectDetails: true },
      }),
      this.db.spydrNode.findMany({
        where: { orgId, nodeType: "task", isDeleted: false },
        include: { taskDetails: true },
      }),
      this.db.spydrNodeRelationship.findMany({
        where: { orgId, relationshipType: "related_to" },
        select: { sourceNodeId: true, targetNodeId: true },
      }),
      this.db.spydrNode.findMany({
        where: { orgId, nodeType: "project_area", isDeleted: false },
        include: { projectAreaDetails: true },
        orderBy: { title: "asc" },
      }),
    ]);

    const projectIds = new Set(projects.map((project) => project.id));
    const taskIds = new Set(tasks.map((task) => task.id));
    const taskById = new Map(tasks.map((task) => [task.id, task]));

    const tasksByProject = new Map<string, string[]>();
    const projectByTask = new Map<string, string>();

    for (const relationship of relationships) {
      if (!projectIds.has(relationship.sourceNodeId)) continue;
      if (!taskIds.has(relationship.targetNodeId)) continue;

      const projectTaskIds = tasksByProject.get(relationship.sourceNodeId) ?? [];
      projectTaskIds.push(relationship.targetNodeId);
      tasksByProject.set(relationship.sourceNodeId, projectTaskIds);

      if (!projectByTask.has(relationship.targetNodeId)) {
        projectByTask.set(relationship.targetNodeId, relationship.sourceNodeId);
      }
    }

    const personIds = new Set<string>();
    for (const project of projects) {
      const details = project.projectDetails;
      if (!details) continue;
      for (const field of personaFields) {
        const id = details[field];
        if (id) personIds.add(id);
      }
    }

    const peopleRows =
      personIds.size === 0
        ? []
        : await this.db.spydrNode.findMany({
            where: {
              orgId,
              id: { in: Array.from(personIds) },
              nodeType: "person",
              isDeleted: false,
            },
            include: { personDetails: true },
          });

    const personRefById = new Map<string, IWorkspaceDashboardPersonRef>(
      peopleRows.map((person) => [
        person.id,
        {
          id: person.id,
          name: person.personDetails?.fullName ?? person.title,
        },
      ])
    );

    const personLoads = new Map<string, IWorkspaceDashboardPersonLoad>();
    const ensurePersonLoad = (key: string, personId: string | null) => {
      if (!personLoads.has(key)) {
        personLoads.set(key, {
          person: personId ? personRefById.get(personId) ?? { id: personId, name: "Unknown" } : null,
          projects: 0,
          openProjects: 0,
          tasks: 0,
          openTasks: 0,
          blockedTasks: 0,
          overdueTasks: 0,
          roleCounts: emptyRoleCounts(),
        });
      }
      return personLoads.get(key)!;
    };

    const projectStatusCounts: IWorkspaceDashboardStatusCounts = {};
    const taskStatusCounts: IWorkspaceDashboardStatusCounts = {};

    type AreaBucket = {
      id: string | null;
      name: string;
      color: string;
      projects: number;
      activeProjects: number;
      tasks: number;
      openTasks: number;
    };

    const areaByTitle = new Map(
      areaRows.map((area) => [
        area.title.trim().toLowerCase(),
        {
          id: area.id,
          name: area.title,
          color: area.projectAreaDetails?.color ?? DEFAULT_AREA_COLOR,
        },
      ])
    );

    const areaBuckets = new Map<string, AreaBucket>();
    const ensureAreaBucket = (key: string, meta: { id: string | null; name: string; color: string }) => {
      if (!areaBuckets.has(key)) {
        areaBuckets.set(key, {
          id: meta.id,
          name: meta.name,
          color: meta.color,
          projects: 0,
          activeProjects: 0,
          tasks: 0,
          openTasks: 0,
        });
      }
      return areaBuckets.get(key)!;
    };

    for (const area of areaRows) {
      ensureAreaBucket(area.id, {
        id: area.id,
        name: area.title,
        color: area.projectAreaDetails?.color ?? DEFAULT_AREA_COLOR,
      });
    }

    const resolveProjectAreaKey = (areaTitle: string | null | undefined): string => {
      if (!areaTitle?.trim()) return UNASSIGNED_KEY;
      const match = areaByTitle.get(areaTitle.trim().toLowerCase());
      return match?.id ?? `title:${areaTitle.trim().toLowerCase()}`;
    };

    const resolveProjectAreaMeta = (areaTitle: string | null | undefined) => {
      if (!areaTitle?.trim()) {
        return { id: null, name: "Unassigned", color: UNASSIGNED_AREA_COLOR };
      }
      const match = areaByTitle.get(areaTitle.trim().toLowerCase());
      if (match) return match;
      return {
        id: null,
        name: areaTitle.trim(),
        color: DEFAULT_AREA_COLOR,
      };
    };

    let unassignedProjects = 0;
    let unassignedProjectTasks = 0;
    let unlinkedTasks = 0;
    let openTasks = 0;
    let blockedTasks = 0;
    let overdueTasks = 0;

    for (const task of tasks) {
      incrementStatusCount(taskStatusCounts, task.status);
      const details = task.taskDetails;
      const open = isOpenTaskStatus(task.status);
      const blocked = isBlockedTask(task.status, details?.isBlocked ?? false);
      const overdue = isOverdueTask(task.status, details?.dueDate, today);

      if (open) openTasks += 1;
      if (blocked) blockedTasks += 1;
      if (overdue) overdueTasks += 1;

      if (!projectByTask.has(task.id)) {
        unlinkedTasks += 1;
      }
    }

    for (const project of projects) {
      incrementStatusCount(projectStatusCounts, project.status);

      const areaKey = resolveProjectAreaKey(project.area);
      const areaMeta = resolveProjectAreaMeta(project.area);
      const areaBucket = ensureAreaBucket(areaKey, areaMeta);
      areaBucket.projects += 1;
      if (isOpenProjectStatus(project.status)) {
        areaBucket.activeProjects += 1;
      }

      const details = project.projectDetails;
      const assigneeId = details?.assigneePersonNodeId ?? null;
      const assigneeKey = personKey(assigneeId);
      const assigneeLoad = ensurePersonLoad(assigneeKey, assigneeId);

      if (!assigneeId) unassignedProjects += 1;

      if (details) {
        for (const field of personaFields) {
          const personId = details[field];
          if (!personId) continue;
          const role = roleByField[field];
          const load = ensurePersonLoad(personKey(personId), personId);
          load.roleCounts[role] += 1;
        }
      }

      assigneeLoad.projects += 1;
      if (isOpenProjectStatus(project.status)) {
        assigneeLoad.openProjects += 1;
      }

      for (const taskId of tasksByProject.get(project.id) ?? []) {
        const task = taskById.get(taskId);
        if (!task) continue;

        areaBucket.tasks += 1;
        if (isOpenTaskStatus(task.status)) {
          areaBucket.openTasks += 1;
        }

        assigneeLoad.tasks += 1;
        if (!assigneeId) unassignedProjectTasks += 1;

        const details = task.taskDetails;
        const open = isOpenTaskStatus(task.status);
        const blocked = isBlockedTask(task.status, details?.isBlocked ?? false);
        const overdue = isOverdueTask(task.status, details?.dueDate, today);

        if (open) {
          assigneeLoad.openTasks += 1;
        }
        if (blocked) {
          assigneeLoad.blockedTasks += 1;
        }
        if (overdue) assigneeLoad.overdueTasks += 1;
      }
    }

    const sortedPersonLoads = Array.from(personLoads.values()).sort((left, right) => {
      if (right.openTasks !== left.openTasks) return right.openTasks - left.openTasks;
      if (right.projects !== left.projects) return right.projects - left.projects;
      const leftName = left.person?.name ?? "Unassigned";
      const rightName = right.person?.name ?? "Unassigned";
      return leftName.localeCompare(rightName);
    });

    const activeProjects = projects.filter((project) =>
      isOpenProjectStatus(project.status)
    ).length;

    const areaSummaries: IWorkspaceDashboardAreaSummary[] = Array.from(areaBuckets.values())
      .filter((bucket) => bucket.projects > 0 || bucket.id !== null)
      .sort((left, right) => {
        if (right.projects !== left.projects) return right.projects - left.projects;
        return left.name.localeCompare(right.name);
      });

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalProjects: projects.length,
        activeProjects,
        totalTasks: tasks.length,
        openTasks,
        blockedTasks,
        overdueTasks,
        unassignedProjects,
        unassignedProjectTasks,
        unlinkedTasks,
      },
      projectStatusCounts,
      taskStatusCounts,
      areaSummaries,
      personLoads: sortedPersonLoads,
    };
  }
}
