import type { PrismaClient } from "@prisma/client";
import type {
  IWorkspaceDashboard,
  IWorkspaceDashboardPersonLoad,
  IWorkspaceDashboardPersonRef,
  IWorkspaceDashboardPersonRoleCounts,
  IWorkspaceDashboardRepository,
  IWorkspaceDashboardStatusCounts,
} from "../../../../domain/interfaces/workspace-dashboard-repository.js";

const UNASSIGNED_KEY = "__unassigned__";

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

    const [projects, tasks, relationships] = await Promise.all([
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
      personLoads: sortedPersonLoads,
    };
  }
}
